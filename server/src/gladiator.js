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
 * faucet.  v2.3.3178: the prize now follows the bracket (PRIZE_PER_ENTRANT,
 * 2,000 for a full 8) and the house adds at most HOUSE_GOLD_PER_HOUR to
 * prizes in a clock hour, game-wide (_arenaPrize).
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
  /* v2.3.3178: the champion's prize FOLLOWS THE BRACKET.  It was 2,000 for
     any bracket, so a 2-player tournament paid 2,000 for 200 of entries and
     two accounts could run one every 2-3 minutes (~43,000 gold an hour).
     Now the prize is PRIZE_PER_ENTRANT a gladiator -- a full bracket of 8
     still 2,000 (GDD §43), 4 pay 1,000, 2 pay 500 -- of which the entries
     are the first ENTRY_FEE each and the HOUSE adds the rest, at most
     HOUSE_GOLD_PER_HOUR in any clock hour across the whole game (three full
     brackets).  Past that the champion takes the entries and whatever the
     hour has left.  Free accounts can't be told apart, so only a game-wide
     bound bounds what they can make. */
  PRIZE_PER_ENTRANT: 250,
  HOUSE_GOLD_PER_HOUR: 3600,
  /* v2.3.3481: the champion's ACHIEVEMENT POINTS.  The arena's window has
     always promised "the Gladiator title and 500 AP", and nothing on the
     worker paid them (the page's own grant was the old path caps.arena turns
     off).  The owner: "Achievement points are something I'd like in the game
     ... an arena winner should be included" (2026-10-19).  Paid with the
     champion's gold, in the same credit (one write: inbox.js adds a gold
     credit's `ap`), whatever the bracket's size; `arenaap: false` in
     liveflags pays none and un-advertises caps.arenaap (_arenaApOff).
     v2.3.3488: a character's FIRST win only (_arenaCrown, inbox.js AP_ONCE):
     a later win pays the gold alone. */
  CHAMPION_AP: 500,
  MAX_BRACKET: 8,          // design review: 16 never fills at prototype population
  GATHER_MS: 60000,        // start timer from the first join
  MATCH_MS: 180000,        // per-match shot-clock (duel.expiresAt)
  STALE_ENTRY_MS: 600000,  // orphaned entry age before the sweep refunds
  // v2.3.1128 (PR11): sponsorship -- stakes on matches (GDD §44).
  /* v2.3.3177: a POOL, not the house's money.  A won stake paid 3x from
     the house and a lost one went to the winning fighter, so backing both
     sides of any match minted +stake for the backers and +stake for the
     winner whoever won (~+10,000 a match with four accounts), and backing
     the winner of a match your own two accounts fought minted 2x per
     backer.  Now a match's winning backers share its LOSING stakes, pro rata
     to what they staked, on top of their own stakes back; the winning
     fighter keeps FIGHTER_CUT of the losing stakes (and every losing stake
     when nobody backed the winner, as before).  Gold only moves between
     the people who staked: nothing is minted.  The game's own bet panel
     already said "Payout: pot split among winners". */
  STAKE_MIN: 10,           // mirrors client ARENA_BET_MIN
  STAKE_MAX: 5000,         // mirrors client ARENA_BET_MAX
  FIGHTER_CUT: 0.10,       // the winning fighter's share of the losing stakes
  STALE_STAKE_MS: 600000,  // orphaned stake age before the sweep refunds
};

export const arenaMethods = {
  /* v2.3.3481: `arenaap: false` in liveflags -- the champion is paid gold
     alone, as before (ARENA.CHAMPION_AP). */
  _arenaApOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'arenaap') && !f.arenaap);
  },

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
        // v2.3.1178: playerId is public, so a forged join could debit
        // any online player's 100g entry fee.  The request must carry
        // the claimed player's own session token (httpauth.js; legacy
        // clients ride the enforcement grace window there).
        if (!this._httpAuthCheck(body && body.playerId, request)) {
          return new Response(JSON.stringify({ ok: false, settled: true, error: 'Not authorized' }), { status: 403, headers: H });
        }
        const result = await this._arenaJoin(body && body.playerId, body && (body.playerName || body.name));
        return new Response(JSON.stringify(result), { headers: H });
      }
      if (request.method === 'POST' && path.startsWith('/leave')) {
        const body = await request.json();
        // v2.3.1178: same gate -- a forged leave dequeues a victim
        // (refund lands with the victim; the dequeue is griefing).
        if (!this._httpAuthCheck(body && body.playerId, request)) {
          return new Response(JSON.stringify({ ok: false, settled: true, error: 'Not authorized' }), { status: 403, headers: H });
        }
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
  // v2.3.1128: PR10 shipped a shape that only PARTIALLY matched it --
  // status said 'running' where the client gates on 'active', players
  // carried playerId/playerName where the betting UI reads id/name/
  // level/color, and recentMatches/champion.id didn't exist, so the
  // whole spectator-betting surface silently rendered nothing against
  // the new worker.  Emit a SUPERSET of both shapes: the old
  // sanitizeTournament fields (id/name/level/color/wins, status
  // 'active'|'complete', recentMatches with winnerId, champion.id) AND
  // the PR10 fields (playerId/playerName, matches[] with ids -- which
  // sponsorship targets).
  _arenaWire() {
    const t = this._arena;
    if (!t || t.status === 'gathering') return null;
    const wireP = (p) => {
      const ps = this.playerState[p.playerId];
      return {
        playerId: p.playerId, playerName: p.playerName,
        id: p.playerId, name: p.playerName,
        level: (ps && ps.level) || 1,
        color: (ps && ps.color) || '#f5c542',
        eliminated: !!p.eliminated,
        wins: t.matches.filter((m) => m.winner === p.playerId).length,
      };
    };
    return {
      id: t.id,
      status: t.status === 'running' ? 'active' : t.status,
      round: t.round,
      maxRounds: Math.ceil(Math.log2(Math.max(2, t.players.length))),
      playerCount: t.players.length,
      remaining: t.players.filter((p) => !p.eliminated).length,
      players: t.players.map(wireP),
      matches: t.matches.map((m) => ({ id: m.id, round: m.round, p1: m.a, p2: m.b, p1Name: m.aName, p2Name: m.bName, winner: m.winner || null, status: m.winner ? 'complete' : (m.active ? 'active' : 'pending') })),
      currentMatches: t.matches.filter((m) => !m.winner && m.round === t.round).map((m) => ({ id: m.id, round: m.round, p1: m.a, p2: m.b })),
      recentMatches: t.matches.filter((m) => m.winner).slice(-10).map((m) => ({ id: m.id, round: m.round, p1: m.a, p2: m.b, winnerId: m.winner, loserId: m.a === m.winner ? m.b : m.a, ts: 0 })),
      champion: t.champion ? { ...t.champion, id: t.champion.playerId, name: t.champion.playerName } : null,
    };
  },

  async _arenaJoin(playerId, playerName) {
    if (!playerId || typeof playerId !== 'string') return { ok: false, settled: true, error: 'Missing playerId' };
    /* v2.3.3178: the house's prize money this hour, read before the first
       tournament can exist (a crown is synchronous; _arenaPrize). */
    await this._arenaHouseLoad();
    const ps = this.playerState[playerId];
    if (!ps || ps.dying || ps.dead) return { ok: false, settled: true, error: 'Not in game' };
    /* v2.3.3171: only a GATHERING tournament takes an entry.  This refused
       only 'running', so in the 60 s a finished tournament is kept for the
       game's completion poll (_arenaCrown) a press took the 100 g, wrote its
       entry record and queued the player on a bracket nothing would ever
       start (_arenaStart wants 'gathering').  The tournament was then
       dropped with no refund, and the entry sweep, seeing the champion's pot
       paid, deleted the record as "entries fund the pot" -- this one did
       not.  The game showed "Enter" (a settled /status carries no status
       field) and answered "Entered arena queue!". */
    if (this._arena && this._arena.status !== 'gathering') {
      return { ok: false, settled: true, error: this._arena.status === 'running' ? 'Tournament in progress' : 'Tournament just ended' };
    }
    if (!this._arena) {
      this._arena = { id: crypto.randomUUID(), status: 'gathering', queue: [], gatherDeadline: Date.now() + ARENA.GATHER_MS, round: 0, players: [], matches: [], champion: null };
    }
    const t = this._arena;
    if (t.queue.some((p) => p.playerId === playerId)) return { ok: false, settled: true, error: 'Already queued' };
    /* v2.3.3171: one id per ENTRY, not per (tournament, player).  A leave
       refunds under its own id but the entry's debit stamp stays, so a
       second join of the same tournament (it keeps its id while anyone else
       is queued) found that stamp, was answered "already paid" by
       _escrowDebitGold, and was queued for free.  The n-th entry's debit and
       refund carry ':n' (the first keeps the old ids, so an entry made
       before this deploy refunds exactly as it would have); the record
       carries n for the sweep. */
    /* v2.3.3185: the fee, its stamp, the entry record and the place in the
       queue in ONE synchronous run.  _escrowDebitGold took the fee and the
       record was written after, in a write of its own: a restart between
       them (every server merge restarts the room) took the 100 g with no
       record for the entry sweep to refund.  And with nothing awaited between
       the purse and the queue, two presses can no longer both pass
       "Already queued". */
    if ((ps.coins || 0) < ARENA.ENTRY_FEE) return { ok: false, settled: true, error: 'Need ' + ARENA.ENTRY_FEE + 'g' };
    if (!t.entryN) t.entryN = Object.create(null);   // player-keyed (rule 4)
    const n = (t.entryN[playerId] || 0) + 1;
    t.entryN[playerId] = n;
    ps.coins -= ARENA.ENTRY_FEE;
    const writes = [
      this._saveRpg(playerId, ps),
      this._opStamp('arena:' + t.id + ':entry:' + playerId + this._arenaEntrySfx(n)),
      this.state.storage.put('arena_entry:' + t.id + ':' + playerId, { wager: ARENA.ENTRY_FEE, paidAt: Date.now(), n }),
    ];
    this._queuePlayerStateFlush(playerId);
    t.queue.push({ playerId, playerName: (typeof playerName === 'string' && playerName.slice(0, 24)) || 'Gladiator', n });
    if (t.queue.length >= ARENA.MAX_BRACKET) this._arenaStart();
    await Promise.all(writes);
    return { ok: true, settled: true, queueSize: t.queue.length };
  },

  async _arenaLeave(playerId) {
    const t = this._arena;
    if (!t || t.status !== 'gathering') return { ok: false, settled: true, error: 'No open queue' };
    const idx = t.queue.findIndex((p) => p.playerId === playerId);
    if (idx < 0) return { ok: false, settled: true, error: 'Not queued' };
    const [entry] = t.queue.splice(idx, 1);
    await this._arenaRefundEntry(t.id, playerId, 'left the arena queue', entry && entry.n);
    if (t.queue.length === 0) this._arena = null;
    return { ok: true, settled: true };
  },

  async _arenaRefundEntry(tid, playerId, why, n) {
    await this._creditPlayer(playerId, { opId: 'arenarefund:' + tid + ':' + playerId + this._arenaEntrySfx(n), source: 'arena', kind: 'gold', payload: { amount: ARENA.ENTRY_FEE }, note: why });
    await this.state.storage.delete('arena_entry:' + tid + ':' + playerId);
  },

  /* v2.3.3171: the n-th entry's op-id suffix (see _arenaJoin).  The first
     entry -- and every record written before n existed -- has none, so it
     keeps the old ids. */
  _arenaEntrySfx(n) {
    const k = Math.floor(Number(n) || 1);
    return k > 1 ? ':' + k : '';
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
        (async () => { try { for (const p of queued) await this._arenaRefundEntry(tid, p.playerId, 'arena cancelled (not enough gladiators)', p.n); } catch (e) {} })();
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
    (async () => { try { for (const p of overflow) await this._arenaRefundEntry(t.id, p.playerId, 'arena bracket was full', p.n); } catch (e) {} })();
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
    // v2.3.1175: _makeDuel (duel.js) owns the duel-record shape --
    // this literal used to hand-copy the field list and drift.
    this._duels.set(duelId, this._makeDuel({
      id: duelId, a: m.a, b: m.b, wager: 0, startedAt: Date.now(),
      expiresAt: m.deadline, arenaMatch: { tid: t.id, matchId: m.id },
    }));
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

  /* v2.3.1128 (PR11): sponsorship.  Spectators stake gold on a
   * competitor in an unresolved match; the stake escrows immediately
   * and settles ONLY off the server-observed result in
   * _arenaOnMatchResolved -- never off the legacy arena_bet relay,
   * which remains cosmetic display (handoff item A's danger note).
   * One stake per sponsor per match; competitors can't sponsor their
   * own match.  Runs inside one webSocketMessage event awaiting only
   * storage, so the winner-check at the top can't go stale mid-way
   * (input gates). */
  async _handleArenaSponsor(session, payload) {
    const err = (code, message) => {
      const ws = this._wsBySessionId(session.id);
      if (ws) { try { ws.send(JSON.stringify({ type: 'arena_stake_error', payload: { code, message } })); } catch (e) {} }
    };
    const t = this._arena;
    if (!t || t.status !== 'running') return err('no-tournament', 'No tournament running');
    const targetId = payload && payload.targetId;
    // matchId optional: the round-bet UI picks a PLAYER, so resolve
    // the open current-round match containing them when it's omitted.
    let m;
    if (payload && payload.matchId) {
      m = t.matches.find((x) => x.id === payload.matchId);
    } else {
      m = t.matches.find((x) => !x.winner && x.round === t.round && (x.a === targetId || x.b === targetId));
    }
    if (!m || m.winner) return err('no-match', 'That match is not open for stakes');
    if (targetId !== m.a && targetId !== m.b) return err('bad-target', 'That gladiator is not in this match');
    if (session.id === m.a || session.id === m.b) return err('own-match', 'Competitors cannot sponsor their own match');
    const amount = Math.floor(Number(payload && payload.amount));
    if (!Number.isFinite(amount) || amount < ARENA.STAKE_MIN || amount > ARENA.STAKE_MAX) {
      return err('bad-amount', 'Stake ' + ARENA.STAKE_MIN + '-' + ARENA.STAKE_MAX + 'g');
    }
    const key = 'arena_stake:' + t.id + ':' + m.id + ':' + session.id;
    if (await this.state.storage.get(key)) return err('already-staked', 'One stake per match');
    const debit = await this._escrowDebitGold(session.id, amount, 'arenastake:' + t.id + ':' + m.id + ':' + session.id);
    if (!debit.ok) return err('no-gold', 'Need ' + amount + 'g');
    await this.state.storage.put(key, { tid: t.id, matchId: m.id, sponsorId: session.id, targetId, amount, ts: Date.now() });
    const ws = this._wsBySessionId(session.id);
    if (ws) {
      try {
        ws.send(JSON.stringify({ type: 'arena_stake_placed', payload: { matchId: m.id, targetId, targetName: targetId === m.a ? m.aName : m.bName, amount } }));
      } catch (e) {}
    }
    // v2.3.1210: refresh the spectator board now this stake landed.
    await this._arenaBroadcastStakeBoard();
  },

  /* Stake settlement for one resolved match.  Fire-and-forget from
   * _arenaOnMatchResolved; converges via opId idempotency + the
   * stamp-checking sweep (a crash between credit and delete cannot
   * double-pay).
   * v2.3.3177: a pool (ARENA's note).  Backed the winner -> the stake back
   * plus a pro-rata share of the losing stakes after the fighter's cut.
   * Backed the loser -> the stake is the pool; when nobody backed the
   * winner it goes to the winning competitor whole, as it always did.
   * Every losing stake is STAMPED settled before any winner is paid, so
   * the sweep can never refund one that a winner was paid from (a crash
   * part-way costs a payout, never makes one twice). */
  async _arenaSettleStakes(tid, matchId, winnerId) {
    try {
      const stakes = await this.state.storage.list({ prefix: 'arena_stake:' + tid + ':' + matchId + ':' });
      const all = [];
      for (const [k, rec] of stakes) if (rec && typeof rec.sponsorId === 'string') all.push({ k, rec });
      const amt = (rec) => Math.max(0, Math.floor(Number(rec.amount) || 0));
      const winners = all.filter((x) => x.rec.targetId === winnerId);
      const losers = all.filter((x) => x.rec.targetId !== winnerId);
      const totalW = winners.reduce((n, x) => n + amt(x.rec), 0);
      const totalL = losers.reduce((n, x) => n + amt(x.rec), 0);
      const payout = new Map();   // sponsorId -> what this settlement returns them
      if (totalW > 0) {
        const cut = Math.floor(totalL * ARENA.FIGHTER_CUT);
        const pool = totalL - cut;
        let shared = 0;
        for (const x of winners) {
          const share = Math.floor(pool * amt(x.rec) / totalW);
          shared += share;
          payout.set(x.rec.sponsorId, amt(x.rec) + share);
        }
        /* the rounding's leftover coins go to the fighter with the cut, so
           what is paid out is exactly what was staked */
        const toFighter = cut + (pool - shared);
        for (const x of losers) await this._opStamp('arenastakeloss:' + tid + ':' + matchId + ':' + x.rec.sponsorId);
        if (toFighter > 0) {
          await this._creditPlayer(winnerId, { opId: 'arenastakecut:' + tid + ':' + matchId, source: 'arena', kind: 'gold', payload: { amount: toFighter }, note: 'your cut of a sponsorship pool' });
        }
        for (const x of winners) {
          await this._creditPlayer(x.rec.sponsorId, { opId: 'arenastakewin:' + tid + ':' + matchId + ':' + x.rec.sponsorId, source: 'arena', kind: 'gold', payload: { amount: payout.get(x.rec.sponsorId) }, note: 'sponsorship paid off' });
        }
      } else {
        for (const x of losers) {
          await this._creditPlayer(winnerId, { opId: 'arenastakeloss:' + tid + ':' + matchId + ':' + x.rec.sponsorId, source: 'arena', kind: 'gold', payload: { amount: amt(x.rec) }, note: 'claimed a failed sponsorship' });
        }
      }
      for (const x of all) {
        await this.state.storage.delete(x.k);
        const won = x.rec.targetId === winnerId;
        const ws = this._wsBySessionId(x.rec.sponsorId);
        if (ws) {
          try {
            ws.send(JSON.stringify({ type: 'arena_stake_result', payload: { matchId, targetId: x.rec.targetId, won, amount: x.rec.amount, payout: won ? (payout.get(x.rec.sponsorId) || 0) : 0 } }));
          } catch (e) {}
        }
      }
      // v2.3.1210: this match's stakes are settled + deleted and its
      // winner is set, so the recomputed board drops it -- refresh it.
      await this._arenaBroadcastStakeBoard();
    } catch (e) { /* sweep repairs */ }
  },

  /* v2.3.1210: spectator stake board (sponsorship.md "Attach points").
   * Stakes were private -- only the sponsor saw their own placement +
   * result.  This broadcasts a SERVER-SUMMED, display-only board so
   * spectators see where the money is: per OPEN match, the total staked
   * on each competitor and the backer count.  Individual sponsor ids
   * and amounts are never leaked -- only the per-competitor sum + a
   * head count.  Computed fresh from the arena_stake: records on each
   * placement/settlement (a storage list only on those rare mutations,
   * NEVER per-poll), so the board can't drift from the escrow ledger.
   * Broadcast through the event buffer like arena_match_result and
   * registered in PRIVILEGED_EVENTS (index.js) so a client can't forge
   * it.  This is a BRAND-NEW privileged type keyed only off
   * server-observed stakes -- it does NOT revive the unsafe legacy
   * arena_bet relay (docs/TRAPS.md #1). */
  async _arenaBroadcastStakeBoard() {
    const t = this._arena;
    if (!t || t.status !== 'running') return;
    let recs;
    try {
      recs = await this.state.storage.list({ prefix: 'arena_stake:' + t.id + ':' });
    } catch (e) { return; }
    // Sum per match -> per competitor.  targetId is a client-supplied
    // player id, so the inner tally is a null-proto map (rule 4).
    const sums = Object.create(null); // matchId -> { targetId -> {total, backers} }
    for (const rec of recs.values()) {
      if (!rec || rec.tid !== t.id || !rec.matchId) continue;
      let mm = sums[rec.matchId];
      if (!mm) { mm = Object.create(null); sums[rec.matchId] = mm; }
      let cell = mm[rec.targetId];
      if (!cell) { cell = { total: 0, backers: 0 }; mm[rec.targetId] = cell; }
      cell.total += (Number(rec.amount) || 0);
      cell.backers += 1;
    }
    // Board over OPEN matches only (a resolved match has a winner set
    // and its stake records are already deleted -- it drops off).
    const board = [];
    for (const m of t.matches) {
      if (m.winner) continue;
      const mm = sums[m.id];
      if (!mm) continue;
      const a = mm[m.a] || { total: 0, backers: 0 };
      const b = mm[m.b] || { total: 0, backers: 0 };
      if (a.total <= 0 && b.total <= 0) continue;
      board.push({
        matchId: m.id, round: m.round,
        aId: m.a, aName: m.aName, aTotal: a.total, aBackers: a.backers,
        bId: m.b, bName: m.bName, bTotal: b.total, bBackers: b.backers,
      });
    }
    this.eventBuffer.push({ type: 'arena_stake_board', payload: { tid: t.id, board } });
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
    // v2.3.1128: settle this match's sponsorship stakes off the
    // server-observed winner (fire-and-forget; opId-idempotent).
    this._arenaSettleStakes(t.id, m.id, winnerId).catch(() => {});
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
    /* v2.3.3171: build the WHOLE round, then activate it -- the shape
       _arenaStart already uses for round 1.  Activating each match as it was
       pushed let a walkover (an opponent offline) resolve synchronously,
       right back into this function, which read "the round" as the matches
       pushed SO FAR -- one, decided -- and crowned its winner (2,000 g,
       status 'complete') before the round's other match existed.  An
       8-player bracket could be won in round 2 with two semifinalists who
       never fought. */
    const nextRound = [];
    for (let i = 0; i < advancing.length; i += 2) {
      nextRound.push(this._arenaMakeMatch(t, t.round, advancing[i], advancing[i + 1]));
    }
    for (const nm of nextRound) t.matches.push(nm);
    for (const nm of nextRound) this._arenaTryActivate(nm);
  },

  /* v2.3.3178: the house's share of this hour's prizes, read once from
     storage (`arena_house` {hour, used}).  Left undefined when the read
     fails, and _arenaPrize then adds nothing (the champion still takes the
     entries); the next join tries again. */
  async _arenaHouseLoad() {
    if (this._arenaHouse) return;
    try {
      const rec = await this.state.storage.get('arena_house');
      if (this._arenaHouse) return;
      const hour = Math.floor(Number(rec && rec.hour) || 0);
      const used = Math.max(0, Math.floor(Number(rec && rec.used) || 0));
      this._arenaHouse = { hour, used };
    } catch (e) { /* unknown: no top-up until a join reads it */ }
  },

  /* v2.3.3178: the champion's prize (ARENA's note).  The entries are the
     prize's first ENTRY_FEE a gladiator; the house tops it up to
     PRIZE_PER_ENTRANT a gladiator out of what this clock hour has left of
     HOUSE_GOLD_PER_HOUR.  Synchronous, so the crown's event and the poll
     carry the real number at once; the caller saves the hour's total
     before it pays. */
  _arenaPrize(entrants, now) {
    const n = Math.max(0, Math.floor(Number(entrants) || 0));
    const pot = ARENA.ENTRY_FEE * n;
    const want = Math.max(0, (ARENA.PRIZE_PER_ENTRANT - ARENA.ENTRY_FEE) * n);
    const h = this._arenaHouse;
    let topUp = 0;
    if (h) {
      const hour = Math.floor(now / 3600000);
      if (h.hour !== hour) { h.hour = hour; h.used = 0; }
      topUp = Math.min(want, Math.max(0, ARENA.HOUSE_GOLD_PER_HOUR - h.used));
      h.used += topUp;
    }
    return { prize: pot + topUp, topUp };
  },

  _arenaCrown(champion) {
    const t = this._arena;
    if (!t || t.champion) return;
    const { prize, topUp } = this._arenaPrize(t.players.length, Date.now());
    /* v2.3.3481: the champion's 500 AP.  v2.3.3488 (#1026): on a character's
       FIRST win only, under a mark of its own (`aponce:<pid>`, inbox.js
       AP_ONCE) -- the owner: "I don't want anyone exploiting the achievement
       points from it" (two accounts could take turns crowning each other).
       v2.3.3491: ONCE A CHARACTER as the GLADIATOR ACHIEVEMENT (achievements.js
       decision 2), sent by the mail below; a later crown pays its gold and
       counts on the row.  The achievement honours v2.3.3488's mark and sets
       it when it pays (achievements.js AP_ONCE_OF), so a champion the mark's
       road paid is never paid again.  The champion box says the points only
       when this crown pays them (`_achvWouldPay`: 0 if earned or marked
       before; null -- not known yet, the champion away -- says nothing). */
    const apOn = !this._arenaApOff();
    const ap = apOn && this._achvWouldPay ? (this._achvWouldPay(champion.playerId, 'gladiator') || 0) : 0;
    t.champion = { playerId: champion.playerId, playerName: champion.playerName, prize };
    if (ap) t.champion.ap = ap;
    t.status = 'complete';
    this.eventBuffer.push({ type: 'arena_tournament_complete', payload: { tid: t.id, champion: t.champion } });
    const tid = t.id;
    const entrants = t.players.map((p) => p.playerId);
    const house = topUp > 0 && this._arenaHouse ? { hour: this._arenaHouse.hour, used: this._arenaHouse.used } : null;
    // Fire-and-forget settle: champion pot (stamped) then entry-record
    // cleanup; the sweep converges a crash between the two (rule 6).
    // v2.3.3178: the hour's house total is saved BEFORE the pot is paid,
    // so a restart between them costs the hour some budget, never adds any.
    (async () => {
      try {
        if (house) await this.state.storage.put('arena_house', house);
        await this._creditPlayer(champion.playerId, { opId: 'arenapot:' + tid, source: 'arena', kind: 'gold', payload: { amount: prize }, note: 'Gladiator Arena champion' });
        /* v2.3.3491: and the Gladiator achievement, its own credit (inbox.js
           `achv`): it stays queued until the champion's achievements record is
           loaded, while the gold above never waits on it */
        if (apOn && !this._achvOff()) await this._creditPlayer(champion.playerId, { opId: 'arenaachv:' + tid, source: 'arena', kind: 'achv', payload: { id: 'gladiator' }, note: 'Gladiator Arena champion' });
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
        await this._creditPlayer(pid, { opId: 'arenarefund:' + tid + ':' + pid + this._arenaEntrySfx(rec.n), source: 'arena', kind: 'gold', payload: { amount: rec.wager || ARENA.ENTRY_FEE }, note: 'arena voided (server restart)' });
        await this.state.storage.delete(k);
      }
    } catch (e) { /* best-effort */ }
  },

  /* v2.3.1128 (PR11): orphaned-stake refund, the entry-sweep pattern.
   * A deploy wipes the in-memory bracket while stake escrows persist.
   * If the match DID settle (either win/loss opId stamped), only the
   * record is deleted -- never refund on top of a payout (rule 6). */
  async _arenaStakeSweep() {
    const now = Date.now();
    if (this._lastStakeSweep && now - this._lastStakeSweep < 300000) return;
    this._lastStakeSweep = now;
    try {
      const stakes = await this.state.storage.list({ prefix: 'arena_stake:' });
      for (const [k, rec] of stakes) {
        if (this._arena && this._arena.id === rec.tid) continue; // live tournament
        if (now - (rec.ts || 0) < ARENA.STALE_STAKE_MS) continue;
        const settled = (await this._opSeen('arenastakewin:' + rec.tid + ':' + rec.matchId + ':' + rec.sponsorId))
          || (await this._opSeen('arenastakeloss:' + rec.tid + ':' + rec.matchId + ':' + rec.sponsorId));
        if (!settled) {
          await this._creditPlayer(rec.sponsorId, { opId: 'arenastakerefund:' + rec.tid + ':' + rec.matchId + ':' + rec.sponsorId, source: 'arena', kind: 'gold', payload: { amount: rec.amount }, note: 'sponsorship voided (server restart)' });
        }
        await this.state.storage.delete(k);
      }
    } catch (e) { /* best-effort */ }
  },
};
