/* ═══ v2.3.1126: GLADIATOR ARENA on the duel backbone (Wave 2 PR10;
 * spec in docs/specs/arena.md) ═══
 *
 * The old Arena DO tracked brackets but nothing else: POST /result
 * trusted a client-claimed {winnerId} with zero verification (two
 * colluding clients could trade fake wins for the Gladiator title),
 * the 100g entry fee was debited client-side only, and every reward /
 * bet payout was client-minted.  The arena now lives in the GameRoom
 * (this mixin) -- the old arena.js keeps its behavior-frozen DO class
 * for the wrangler binding but is retired from routing, exactly like
 * the Marketplace DO.
 *
 * Core idea: ARENA MATCHES ARE DUELS.  The duel machine already gives
 * us server-resolved outcomes (kill / forfeit / disconnect grace),
 * consent-gated damage in town, no-drop deaths, and a double-resolution
 * guard.  The bracket manager activates a wager-0 duel per match,
 * tagged duel.arenaMatch, and _resolveDuel notifies
 * _arenaOnMatchResolved -- results are SERVER-OBSERVED, never claimed.
 * A 3-minute shot-clock (duel.expiresAt, resolved in _tickDuels) breaks
 * passive stalls: tiebreak = higher hp/maxHp fraction, coin flip on an
 * exact tie.
 *
 * Money: entry fees escrow at join via _escrowDebitGold into
 * arena_entry:<tid>:<pid> records; the champion is paid via
 * _creditPlayer (offline-safe).  A deploy wipes the in-memory bracket
 * -- that VOIDS the tournament by design, and the join-path sweep
 * refunds orphaned entries (checking the champion-pot oplog stamp
 * first, per ARCHITECTURE-HANDOFF rule 6).  ECONOMICS NOTE, flagged
 * deliberately: champion 2000g (GDD §43) vs <= 800g of entries mints up
 * to 1,200g of house gold per tournament -- an intentional prototype
 * faucet the owner can tune by changing CHAMPION_REWARD.
 *
 * Healing is disabled for players in an active arena match
 * (ps._arenaMatch): town HP regen, eat_request, shop healFish, and the
 * cook heal buff are gated in index.js -- WITHOUT the town-regen gate
 * (10% maxHp per ~670ms) town fights literally could not end.
 *
 * The client's existing HTTP surface is preserved (POST /join, /leave,
 * GET /status, /tournament) so PartyPanel's polling + rendering work
 * unchanged; mutating responses carry settled:true so capable clients
 * skip their legacy self-credit.  POST /result is answered but IGNORED
 * (results are server-observed) -- old clients that still send it lose
 * nothing, because the bracket advances off the duels regardless. */

export const ARENA = {
  ENTRY_FEE: 100,          // GDD §43
  CHAMPION_REWARD: 2000,   // GDD §43 (see economics note above)
  MAX_BRACKET: 8,          // design review: 16 never fills at prototype population
  GATHER_MS: 60000,        // start timer from the first join
  MATCH_MS: 180000,        // per-match shot-clock (duel.expiresAt)
  STALE_ENTRY_MS: 600000,  // orphaned entry age before the sweep refunds
};

export const arenaMethods = {
  /* HTTP surface -- the worker routes /api/arena/* here (old DO
   * retired from routing).  Response shapes mirror arena.js so the
   * polling client renders unchanged. */
  async _arenaFetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/arena', '');
    const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    try {
      this._arenaLazyTick(Date.now());
      if (request.method === 'POST' && path.startsWith('/join')) {
        const body = await request.json();
        const result = await this._arenaJoin(body && body.playerId, body && (body.playerName || body.name));
        return new Response(JSON.stringify(result), { headers: H });
      }
      if (request.method === 'POST' && path.startsWith('/leave')) {
        const body = await request.json();
        const result = await this._arenaLeave(body && body.playerId);
        return new Response(JSON.stringify(result), { headers: H });
      }
      if (request.method === 'POST' && path.startsWith('/result')) {
        // v2.3.1126: results are SERVER-OBSERVED (duel outcomes).  The
        // old client-claimed winner was the forgery hole this PR kills.
        return new Response(JSON.stringify({ ok: false, settled: true, error: 'Results are server-observed now' }), { headers: H });
      }
      if (request.method === 'GET' && path.startsWith('/status')) {
        const q = this._arena && this._arena.status === 'gathering' ? this._arena.queue : [];
        return new Response(JSON.stringify({ ok: true, settled: true, queueSize: q.length, queue: q.map((p) => ({ playerId: p.playerId, playerName: p.playerName })), tournament: this._arenaWire() }), { headers: H });
      }
      if (request.method === 'GET' && path.startsWith('/tournament')) {
        return new Response(JSON.stringify({ ok: true, settled: true, tournament: this._arenaWire() }), { headers: H });
      }
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: H });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: H });
    }
  },

  // Old arena.js sanitizeTournament shape (what PartyPanel renders).
  _arenaWire() {
    const t = this._arena;
    if (!t || t.status === 'gathering') return null;
    return {
      id: t.id, status: t.status, round: t.round,
      players: t.players.map((p) => ({ playerId: p.playerId, playerName: p.playerName, eliminated: !!p.eliminated })),
      matches: t.matches.map((m) => ({ id: m.id, round: m.round, p1: m.a, p2: m.b, p1Name: m.aName, p2Name: m.bName, winner: m.winner || null, status: m.winner ? 'complete' : (m.active ? 'active' : 'pending') })),
      champion: t.champion || null,
    };
  },

  async _arenaJoin(playerId, playerName) {
    if (!playerId || typeof playerId !== 'string') return { ok: false, settled: true, error: 'Missing playerId' };
    const ps = this.playerState[playerId];
    if (!ps || ps.dying || ps.dead) return { ok: false, settled: true, error: 'Not in game' };
    if (this._arena && this._arena.status === 'running') return { ok: false, settled: true, error: 'Tournament in progress' };
    if (!this._arena) {
      this._arena = { id: crypto.randomUUID(), status: 'gathering', queue: [], gatherDeadline: Date.now() + ARENA.GATHER_MS, round: 0, players: [], matches: [], champion: null };
    }
    const t = this._arena;
    if (t.queue.some((p) => p.playerId === playerId)) return { ok: false, settled: true, error: 'Already queued' };
    const debit = await this._escrowDebitGold(playerId, ARENA.ENTRY_FEE, 'arena:' + t.id + ':entry:' + playerId);
    if (!debit.ok) return { ok: false, settled: true, error: 'Need ' + ARENA.ENTRY_FEE + 'g' };
    await this.state.storage.put('arena_entry:' + t.id + ':' + playerId, { wager: ARENA.ENTRY_FEE, paidAt: Date.now() });
    t.queue.push({ playerId, playerName: (typeof playerName === 'string' && playerName.slice(0, 24)) || 'Gladiator' });
    if (t.queue.length >= ARENA.MAX_BRACKET) this._arenaStart();
    return { ok: true, settled: true, queueSize: t.queue.length };
  },

  async _arenaLeave(playerId) {
    const t = this._arena;
    if (!t || t.status !== 'gathering') return { ok: false, settled: true, error: 'No open queue' };
    const idx = t.queue.findIndex((p) => p.playerId === playerId);
    if (idx < 0) return { ok: false, settled: true, error: 'Not queued' };
    t.queue.splice(idx, 1);
    await this._arenaRefundEntry(t.id, playerId, 'left the arena queue');
    if (t.queue.length === 0) this._arena = null;
    return { ok: true, settled: true };
  },

  async _arenaRefundEntry(tid, playerId, why) {
    await this._creditPlayer(playerId, { opId: 'arenarefund:' + tid + ':' + playerId, source: 'arena', kind: 'gold', payload: { amount: ARENA.ENTRY_FEE }, note: why });
    await this.state.storage.delete('arena_entry:' + tid + ':' + playerId);
  },

  // Gathering timer + deferred match activation.  Called from the tick
  // loop and lazily from the HTTP surface (rule 12).
  _arenaLazyTick(now) {
    const t = this._arena;
    if (!t) return;
    if (t.status === 'gathering' && now >= t.gatherDeadline) {
      if (t.queue.length >= 2) this._arenaStart();
      else {
        // Undersubscribed: cancel + refund (fire-and-forget, idempotent).
        const tid = t.id, queued = [...t.queue];
        this._arena = null;
        (async () => { try { for (const p of queued) await this._arenaRefundEntry(tid, p.playerId, 'arena cancelled (not enough gladiators)'); } catch (e) {} })();
      }
      return;
    }
    if (t.status === 'running') {
      // Activate any pending matches whose players are now duel-free.
      for (const m of t.matches) {
        if (!m.winner && !m.active && m.round === t.round) this._arenaTryActivate(m);
      }
    }
  },

  _arenaStart() {
    const t = this._arena;
    if (!t || t.status !== 'gathering') return;
    // Largest power of two <= queue size; the overflow is refunded.
    let size = 2;
    while (size * 2 <= Math.min(t.queue.length, ARENA.MAX_BRACKET)) size *= 2;
    const fighters = t.queue.slice(0, size);
    const overflow = t.queue.slice(size);
    (async () => { try { for (const p of overflow) await this._arenaRefundEntry(t.id, p.playerId, 'arena bracket was full'); } catch (e) {} })();
    t.status = 'running';
    t.queue = [];
    t.round = 1;
    t.players = fighters.map((p) => ({ ...p, eliminated: false }));
    t.matches = [];
    for (let i = 0; i < fighters.length; i += 2) {
      t.matches.push(this._arenaMakeMatch(t, 1, fighters[i], fighters[i + 1]));
    }
    for (const m of t.matches) this._arenaTryActivate(m);
  },

  _arenaMakeMatch(t, round, pa, pb) {
    return { id: crypto.randomUUID(), round, a: pa.playerId, b: pb.playerId, aName: pa.playerName, bName: pb.playerName, winner: null, active: false, deadline: 0 };
  },

  /* Activate a match as a wager-0 duel.  Offline player = walkover.
   * A player still in another duel defers activation (the lazy tick
   * retries); the match deadline runs regardless, so a stall can't
   * deadlock the bracket. */
  _arenaTryActivate(m) {
    const t = this._arena;
    if (!t || m.winner || m.active) return;
    if (!m.deadline) m.deadline = Date.now() + ARENA.MATCH_MS;
    const psA = this.playerState[m.a], psB = this.playerState[m.b];
    if (!psA && !psB) { this._arenaOnMatchResolved({ tid: t.id, matchId: m.id }, m.a, 'double-forfeit'); return; }
    if (!psA) { this._arenaOnMatchResolved({ tid: t.id, matchId: m.id }, m.b, 'walkover'); return; }
    if (!psB) { this._arenaOnMatchResolved({ tid: t.id, matchId: m.id }, m.a, 'walkover'); return; }
    if (Date.now() > m.deadline) {
      this._arenaOnMatchResolved({ tid: t.id, matchId: m.id }, this._arenaTiebreak(m), 'timeout');
      return;
    }
    if ((this._duelFor && (this._duelFor(m.a) || this._duelFor(m.b)))) return; // busy: lazy tick retries
    if (!this._duels) this._duels = new Map();
    const duelId = crypto.randomUUID();
    this._duels.set(duelId, {
      id: duelId, a: m.a, b: m.b, wager: 0, startedAt: Date.now(), status: 'active',
      graceUntil: 0, awayId: null,
      expiresAt: m.deadline, arenaMatch: { tid: t.id, matchId: m.id },
    });
    if (!this._pvpConsent) this._pvpConsent = new Map();
    this._pvpConsent.set(this._pvpPairKey(m.a, m.b), m.deadline + 30000);
    psA._arenaMatch = m.id; psB._arenaMatch = m.id; // healing gates key off this
    m.active = true;
    for (const pid of [m.a, m.b]) {
      const ws = this._wsBySessionId(pid);
      if (ws) {
        try {
          ws.send(JSON.stringify({ type: 'arena_match_start', payload: { matchId: m.id, tid: t.id, round: m.round, opponentId: pid === m.a ? m.b : m.a, opponentName: pid === m.a ? m.bName : m.aName, deadline: m.deadline } }));
        } catch (e) {}
      }
    }
  },

  // Shot-clock tiebreak: the server owns hp, so no new state is needed.
  _arenaTiebreak(m) {
    const psA = this.playerState[m.a], psB = this.playerState[m.b];
    const fA = psA ? (psA.hp || 0) / (psA.maxHp || 100) : -1;
    const fB = psB ? (psB.hp || 0) / (psB.maxHp || 100) : -1;
    if (fA > fB) return m.a;
    if (fB > fA) return m.b;
    return Math.random() < 0.5 ? m.a : m.b;
  },

  /* Called from _resolveDuel when the duel carries an arenaMatch tag --
   * kill, forfeit, disconnect-grace expiry, and shot-clock timeout all
   * funnel here.  Never called with a client-supplied winner. */
  _arenaOnMatchResolved(arenaMatch, winnerId, how) {
    const t = this._arena;
    if (!t || t.id !== arenaMatch.tid) return; // stale (deploy voided the tournament)
    const m = t.matches.find((x) => x.id === arenaMatch.matchId);
    if (!m || m.winner) return;
    m.winner = winnerId;
    m.active = false;
    for (const pid of [m.a, m.b]) {
      const ps = this.playerState[pid];
      if (ps && ps._arenaMatch === m.id) delete ps._arenaMatch;
      const loser = pid !== winnerId;
      if (loser) {
        const rec = t.players.find((p) => p.playerId === pid);
        if (rec) rec.eliminated = true;
      }
    }
    this.eventBuffer.push({ type: 'arena_match_result', payload: { tid: t.id, matchId: m.id, round: m.round, winner: winnerId, loser: m.a === winnerId ? m.b : m.a, how } });
    const roundMatches = t.matches.filter((x) => x.round === t.round);
    if (!roundMatches.every((x) => x.winner)) return;
    const advancing = roundMatches.map((x) => {
      const p = t.players.find((pp) => pp.playerId === x.winner);
      return p || { playerId: x.winner, playerName: '?' };
    });
    if (advancing.length === 1) {
      this._arenaCrown(advancing[0]);
      return;
    }
    t.round += 1;
    for (let i = 0; i < advancing.length; i += 2) {
      const nm = this._arenaMakeMatch(t, t.round, advancing[i], advancing[i + 1]);
      t.matches.push(nm);
      this._arenaTryActivate(nm);
    }
  },

  _arenaCrown(champion) {
    const t = this._arena;
    if (!t || t.champion) return;
    t.champion = { playerId: champion.playerId, playerName: champion.playerName };
    t.status = 'complete';
    this.eventBuffer.push({ type: 'arena_tournament_complete', payload: { tid: t.id, champion: t.champion } });
    const tid = t.id;
    const entrants = t.players.map((p) => p.playerId);
    // Fire-and-forget settle: champion pot (stamped) then entry-record
    // cleanup; the sweep converges a crash between the two (rule 6).
    (async () => {
      try {
        await this._creditPlayer(champion.playerId, { opId: 'arenapot:' + tid, source: 'arena', kind: 'gold', payload: { amount: ARENA.CHAMPION_REWARD }, note: 'Gladiator Arena champion' });
        for (const pid of entrants) await this.state.storage.delete('arena_entry:' + tid + ':' + pid);
      } catch (e) { /* sweep repairs */ }
    })();
    // Clear the tournament after a grace period for the client's
    // completion poll (it reads /tournament until it sees champion).
    this._arenaClearAt = Date.now() + 60000;
  },

  _tickArena(now) {
    this._arenaLazyTick(now);
    if (this._arena && this._arena.status === 'complete' && this._arenaClearAt && now > this._arenaClearAt) {
      this._arena = null;
      this._arenaClearAt = 0;
    }
  },

  /* Orphaned entry-fee refund: a deploy wipes the in-memory bracket
   * while the escrow debits persist.  Rate-limited; kicked from the
   * join path.  Never refunds a tournament whose champion pot was paid
   * -- entries fund the pot (rule 6). */
  async _arenaEntrySweep() {
    const now = Date.now();
    if (this._lastArenaSweep && now - this._lastArenaSweep < 300000) return;
    this._lastArenaSweep = now;
    try {
      const entries = await this.state.storage.list({ prefix: 'arena_entry:' });
      for (const [k, rec] of entries) {
        const rest = k.slice('arena_entry:'.length);
        const cut = rest.indexOf(':');
        const tid = rest.slice(0, cut), pid = rest.slice(cut + 1);
        if (this._arena && this._arena.id === tid) continue; // live tournament
        if (now - (rec.paidAt || 0) < ARENA.STALE_ENTRY_MS) continue;
        if (await this._opSeen('arenapot:' + tid)) { await this.state.storage.delete(k); continue; }
        await this._creditPlayer(pid, { opId: 'arenarefund:' + tid + ':' + pid, source: 'arena', kind: 'gold', payload: { amount: rec.wager || ARENA.ENTRY_FEE }, note: 'arena voided (server restart)' });
        await this.state.storage.delete(k);
      }
    } catch (e) { /* best-effort */ }
  },
};
