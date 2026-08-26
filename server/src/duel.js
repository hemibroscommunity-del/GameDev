/* ═══ v2.3.1121: DUEL MACHINE (PR6 of the heavy-systems plan; spec in
 * docs/specs/duels.md) ═══
 *
 * Replaces the PR1 interim consent-pair handling for duels with a real
 * state machine: challenge -> accept -> active -> resolved, with wager
 * escrow that survives worker deploys.  What this fixes:
 *   - The live duel UI sends duel_wager_request (InspectPlayerPanel),
 *     which the interim observer never handled -- UI-initiated town
 *     duels never actually earned consent.  Both request types work now.
 *   - Wagers were pure UI before: the accept popup said "winner takes
 *     all" but no gold ever moved.  Both wagers are now debited at
 *     accept (idempotent PR2 escrow), the pot is persisted in
 *     'duelEscrow:<id>' storage (a deploy wiping in-memory duel state
 *     can no longer evaporate a debited pot), and the winner is paid
 *     via _creditPlayer -- online or not.
 *   - Duel deaths were full deaths: death pile + inventory wipe, in
 *     TOWN, from a consensual no-stakes duel.  A clean duel kill
 *     (cause 'pvp:<opponent>') now skips the pile and the wipe, per
 *     the promise the duel popup already makes ("No item loss").
 *   - Disconnect mid-duel gets a 15s reconnect grace (iOS tab suspends
 *     and deploy bounces are routine) before it counts as forfeit.
 *
 * Dying to a MONSTER mid-duel still resolves the duel (opponent takes
 * the pot -- no suiciding out of a losing wager) but is a normal death:
 * pile + wipe apply, only the clean duel kill is protected.
 *
 * Concurrency: accept validation + both escrow debits run inside one
 * webSocketMessage event awaiting only storage (input-gated).  The pot
 * settle on death is fire-and-forget but converges: duel.status flips
 * synchronously (double-resolution guard), the pot credit is
 * opId-idempotent, and the stale-escrow sweep checks the pot's oplog
 * stamp before refunding (a crash between pot-credit and escrow-delete
 * cannot double-pay). */

export const DUEL = {
  CHALLENGE_TTL: 120000,   // 2 min to accept a challenge
  GRACE_MS: 15000,         // reconnect window before forfeit
  CONSENT_MS: 600000,      // damage-gate pair lifetime (10 min duel cap)
  STALE_ESCROW_MS: 600000, // orphaned escrow age before the sweep refunds
};

export const duelMethods = {
  /* v2.3.1175: single owner of the duel-record shape.  Arena matches
   * (gladiator.js _arenaTryActivate) build duel records too; before
   * this factory the field list was hand-copied there, and copies
   * drifting is exactly how shape bugs survive.  `away` is the
   * per-player forfeit-clock map {pid: deadline} and is deliberately
   * NULL-PROTOTYPE: player ids are client-supplied strings, and on a
   * plain {} an id of '__proto__' makes the clock assignment a silent
   * no-op (inherited accessor) -- that player would never forfeit and
   * the duel would stick forever, the very bug this map fixes. */
  /* ═══ v2.3.1973: EVERY DUEL GETS A DEADLINE ═══
   * The shot clock below (`_tickDuels`, v2.3.1126) was written for arena
   * matches and only ever fired when `expiresAt` was set — and the ONLY
   * caller that set it was `_arenaTryActivate`.  A social duel therefore
   * had no clock at all, and its own comment named the consequence
   * exactly: "a duel where nobody died stayed 'active' FOREVER -- the
   * consent pair silently expired while _duelFor kept blocking both
   * players from any new duel (latent deadlock)".  That deadlock was
   * fixed for the arena and left standing for the duel it was written
   * about.  Measured against the real GameRoom: challenge, accept, then
   * an hour of ticks — duel still active, consent long gone, both players
   * refused every later duel, and the wagers still parked in
   * `duelEscrow:` (the sweep skips a "live" duel, rule 6).
   *
   * It is reachable by ACCIDENT, not only by trying: two players duel,
   * neither dies, they wander off.  Since v2.3.1917 turned open PvP off,
   * a duel is the only PvP in the game, so the state this leaves is "PvP
   * is permanently broken for those two accounts" — for the life of the
   * DO, which is until the next deploy.
   *
   * CONSENT_MS is the right constant and not a new one: it is already
   * commented "10 min duel cap", and it is when `_pvpAllowed`'s consent
   * pair lapses — after that neither player can damage the other, so a
   * duel outliving it is unfinishable by construction.  Defaulted HERE
   * rather than at the one call site because this factory is the single
   * owner of the record shape (v2.3.1175, same reasoning); `fields` wins,
   * so the arena's shorter MATCH_MS clock is untouched. */
  _makeDuel(fields) {
    const d = Object.assign({ status: 'active', away: Object.create(null) }, fields);
    if (!d.expiresAt) d.expiresAt = (d.startedAt || Date.now()) + DUEL.CONSENT_MS;
    return d;
  },

  _duelFor(playerId) {
    if (!this._duels) return null;
    for (const d of this._duels.values()) {
      if (d.status === 'active' && (d.a === playerId || d.b === playerId)) return d;
    }
    return null;
  },

  /* Intercept the relayed duel handshake (default-branch hook, same
   * pattern as trades).  Returns the message to rebroadcast or null. */
  async _interceptDuel(fromId, msg) {
    const payload = msg.payload || {};
    const target = payload.target;
    if (!target || typeof target !== 'string' || target === fromId) return null;
    /* v2.3.1973: bound the MAP KEY.  `target` is client-supplied and goes
       straight into a `challenger>target` key that lives for CHALLENGE_TTL
       (2 min), and nothing capped its length — so one socket sending
       duel_request with a ~16 KB target (the MAX_INBOUND_BYTES ceiling)
       parks 16 KB of key per message.  At the relay bucket's sustained
       4/s that is ~7 MB of DO memory per attacker in rolling residence,
       and the DO has 128 MB.  Every other handshake in this room already
       had exactly this guard -- trade.js:78, clans.js:161 (v2.3.1622),
       friends.js:116 -- and party.js gets it for free by requiring a live
       playerState first; the duel handshake was the one that was missed.
       64 is the same number they use, and a real id is `bp_<hash>`, well
       under it, so no legitimate challenge changes. */
    if (target.length > 64) return null;
    if (!this._duelChallenges) this._duelChallenges = new Map(); // 'challenger>target' -> {wager, ts}
    if (!this._duels) this._duels = new Map();
    const now = Date.now();

    if (msg.type === 'duel_request' || msg.type === 'duel_wager_request') {
      const wager = Math.max(0, Math.min(999999, Math.floor(Number(payload.wager) || 0)));
      this._duelChallenges.set(fromId + '>' + target, { wager, ts: now });
      payload.wager = wager; // relay the sanitized number
      return msg;
    }
    if (msg.type === 'duel_decline') {
      this._duelChallenges.delete(target + '>' + fromId);
      return msg;
    }

    // duel_accept: fromId = accepter, target = challenger.
    const chal = this._duelChallenges.get(target + '>' + fromId);
    this._duelChallenges.delete(target + '>' + fromId);
    if (!chal || now - chal.ts > DUEL.CHALLENGE_TTL) return null; // forged/replayed/expired
    if (this._duelFor(fromId) || this._duelFor(target)) return null; // one duel at a time
    const a = target, b = fromId;
    const psA = this.playerState[a], psB = this.playerState[b];
    const declineBoth = () => {
      // Existing client UX: duel_decline shows "Duel declined" to its
      // target.  Send one to each side.
      this.eventBuffer.push({ type: 'duel_decline', from: b, payload: { from: b, target: a } });
      this.eventBuffer.push({ type: 'duel_decline', from: a, payload: { from: a, target: b } });
      return null;
    };
    if (!psA || !psB || psA.dying || psB.dying) return declineBoth();
    /* ═══ v2.3.1973: A DUEL NEEDS BOTH OF YOU IN THE SAME PLACE ═══
     * Nothing checked the zone, and the handshake relay is not zone-scoped
     * (the tick's interest management deliberately leaves `events`
     * room-wide -- see the v2.3.1575 note in tick.js), so a challenge
     * crosses zones and an accept from another map was honoured: escrow
     * debited, consent pair registered, duel active.  Neither player can
     * then land a hit -- combat.js gates every PvP swing on the ATTACKER's
     * zone and walks only the players in it -- so the fight is unwinnable
     * by construction and can only end on the clock above.
     * Checked BEFORE any escrow moves, so nothing has to be unwound, and
     * answered with declineBoth() rather than a silent null: both players
     * pressed a button and are owed an outcome they can see.  A no-op in
     * normal play -- the only way to open the challenge is the inspect card
     * on a peer you are standing next to -- so what this catches is a
     * player who walked through a portal between the challenge and the
     * accept, and a forged cross-zone challenge.  Note it gates only the
     * START: a duel already under way survives one side zoning out, which
     * is what the disconnect/forfeit clocks are for. */
    if (psA.z !== psB.z) return declineBoth();
    // The accepter's client echoes back the wager it was shown; the
    // CHALLENGE's number is authoritative (an edited accept can't
    // inflate the opponent's stake).
    const wager = chal.wager;
    const duelId = crypto.randomUUID();
    if (wager > 0) {
      const dA = await this._escrowDebitGold(a, wager, 'duel:' + duelId + ':a');
      if (!dA.ok) return declineBoth();
      const dB = await this._escrowDebitGold(b, wager, 'duel:' + duelId + ':b');
      if (!dB.ok) {
        await this._creditPlayer(a, { opId: 'duelrefund:' + duelId + ':a', source: 'duel', kind: 'gold', payload: { amount: wager }, note: 'duel wager returned' });
        return declineBoth();
      }
      await this.state.storage.put('duelEscrow:' + duelId, { a, b, wager, startedAt: now });
    }
    // v2.3.1175: away is a per-player map {pid: forfeitDeadline}.  The
    // old single-slot graceUntil/awayId pair meant a second disconnect
    // overwrote the first: if both players dropped and only the second
    // rejoined, the first player's away state was forgotten and the
    // duel sat 'active' forever, blocking both from any new duel
    // (handoff item L; social duels have no shot-clock to self-heal).
    this._duels.set(duelId, this._makeDuel({ id: duelId, a, b, wager, startedAt: now }));
    // Register the damage-gate pair (the PR1 _pvpAllowed mechanism).
    if (!this._pvpConsent) this._pvpConsent = new Map();
    this._pvpConsent.set(this._pvpPairKey(a, b), now + DUEL.CONSENT_MS);
    payload.wager = wager;
    payload.settled = true;
    return msg;
  },

  /* Called from _handlePlayerDeath BEFORE the pile spawn.  Resolves any
   * active duel this player is in; returns true only for a clean duel
   * kill (skip the death pile + inventory wipe). */
  _duelOnDeath(playerId, cause) {
    const duel = this._duelFor(playerId);
    if (!duel) return false;
    const opponent = duel.a === playerId ? duel.b : duel.a;
    const cleanKill = cause === 'pvp:' + opponent;
    this._resolveDuel(duel, opponent, playerId, cleanKill ? 'kill' : 'death');
    return cleanKill;
  },

  _resolveDuel(duel, winnerId, loserId, how) {
    if (duel.status !== 'active') return; // sync double-resolution guard
    duel.status = 'resolved';
    this._duels.delete(duel.id);
    if (this._pvpConsent) this._pvpConsent.delete(this._pvpPairKey(duel.a, duel.b));
    this.eventBuffer.push({ type: 'duel_end', payload: { winner: winnerId, loser: loserId, wager: duel.wager, how } });
    // v2.3.1126: arena matches ride the duel machine -- notify the
    // bracket so kills, forfeits, and shot-clock timeouts all advance
    // it through the same server-observed path.
    if (duel.arenaMatch && this._arenaOnMatchResolved) {
      this._arenaOnMatchResolved(duel.arenaMatch, winnerId, how);
    }
    if (duel.wager > 0) {
      // Fire-and-forget settle; converges via opId idempotency + the
      // pot-stamp check in the stale-escrow sweep.
      (async () => {
        try {
          await this._creditPlayer(winnerId, { opId: 'duelpot:' + duel.id, source: 'duel', kind: 'gold', payload: { amount: duel.wager * 2 }, note: 'duel won' });
          await this.state.storage.delete('duelEscrow:' + duel.id);
        } catch (e) { /* sweep repairs */ }
      })();
    }
  },

  _duelOnDisconnect(playerId) {
    const duel = this._duelFor(playerId);
    if (!duel) return;
    // v2.3.1175: per-player slot -- the opponent dropping too no longer
    // erases this player's forfeit clock.  (Lazy init tolerates
    // hand-built records; _makeDuel owns the shape for real ones.)
    if (!duel.away) duel.away = Object.create(null);
    duel.away[playerId] = Date.now() + DUEL.GRACE_MS;
  },

  _duelOnRejoin(playerId) {
    const duel = this._duelFor(playerId);
    if (duel && duel.away && duel.away[playerId] !== undefined) {
      delete duel.away[playerId];
      // Re-register the damage-gate pair: webSocketClose's consent
      // clear removed it when this player dropped, and without it the
      // resumed duel's hits would all be gated off in safe zones.
      if (!this._pvpConsent) this._pvpConsent = new Map();
      this._pvpConsent.set(this._pvpPairKey(duel.a, duel.b), Date.now() + DUEL.CONSENT_MS);
    }
  },

  // Piggybacks on the tick loop: expire stale challenges, enforce the
  // reconnect-grace forfeit.
  _tickDuels(now) {
    if (this._duelChallenges) {
      for (const [k, c] of this._duelChallenges) {
        if (now - c.ts > DUEL.CHALLENGE_TTL) this._duelChallenges.delete(k);
      }
    }
    if (this._duels) {
      for (const d of [...this._duels.values()]) {
        // v2.3.1175: away is per-player; a forfeit fires as soon as a
        // clock expires.  With both players away, the tick normally
        // catches the first clock well before the second matures --
        // but if several HAVE expired by the same tick, the earliest
        // deadline loses (deadlines order by disconnect order while
        // GRACE_MS is one shared constant: first leaver forfeits).
        // for...in, not Object.keys: this runs per duel per 22ms tick
        // and the common case is an empty map -- no throwaway array.
        // (Safe against inherited keys: `away` is null-prototype.)
        if (d.status === 'active' && d.away) {
          let loser = null;
          for (const pid in d.away) {
            if (now > d.away[pid] && (loser === null || d.away[pid] < d.away[loser])) loser = pid;
          }
          if (loser) {
            const winner = d.a === loser ? d.b : d.a;
            this._resolveDuel(d, winner, loser, 'forfeit');
            continue;
          }
        }
        // v2.3.1126: optional shot-clock.  Before this, a duel where
        // nobody died stayed 'active' FOREVER -- the consent pair
        // silently expired while _duelFor kept blocking both players
        // from any new duel (latent deadlock; fatal for arena
        // brackets, which set expiresAt ~3 min).  Tiebreak needs no
        // new state: the server owns hp -- higher hp/maxHp fraction
        // wins, coin flip on an exact tie.
        /* v2.3.1973: no longer OPTIONAL -- _makeDuel defaults expiresAt, and
           this fallback covers any record that did not come through it (the
           `away` lazy-init above tolerates hand-built records for the same
           reason).  A duel with no deadline at all is the deadlock the
           paragraph above describes, so there must be no way to build one.
           Stamped onto the record rather than computed inline, and falling
           back to NOW (not to 0) when startedAt is missing too -- an
           un-stamped record must get a fresh ten minutes, never an instant
           timeout that would end a fight the moment it is noticed. */
        if (d.status === 'active' && !d.expiresAt) d.expiresAt = (d.startedAt || now) + DUEL.CONSENT_MS;
        if (d.status === 'active' && now > d.expiresAt) {
          const psA = this.playerState[d.a], psB = this.playerState[d.b];
          const fA = psA ? (psA.hp || 0) / (psA.maxHp || 100) : -1;
          const fB = psB ? (psB.hp || 0) / (psB.maxHp || 100) : -1;
          const winner = fA === fB ? (Math.random() < 0.5 ? d.a : d.b) : (fA > fB ? d.a : d.b);
          this._resolveDuel(d, winner, winner === d.a ? d.b : d.a, 'timeout');
        }
      }
    }
  },

  /* Orphaned-escrow refund.  A deploy restarts the DO and wipes the
   * in-memory duel map while the wager debits persist -- without this,
   * the pot evaporates.  Rate-limited; kicked from the join path.
   * If the pot was already paid (oplog stamp), the record is just
   * deleted -- never refund on top of a payout. */
  async _duelEscrowSweep() {
    const now = Date.now();
    if (this._lastDuelSweep && now - this._lastDuelSweep < 300000) return;
    this._lastDuelSweep = now;
    try {
      const entries = await this.state.storage.list({ prefix: 'duelEscrow:' });
      for (const [k, rec] of entries) {
        const id = k.slice('duelEscrow:'.length);
        if (this._duels && this._duels.has(id)) continue; // live duel
        if (now - (rec.startedAt || 0) < DUEL.STALE_ESCROW_MS) continue;
        if (await this._opSeen('duelpot:' + id)) {
          await this.state.storage.delete(k); // settled; crash hit between credit and delete
          continue;
        }
        await this._creditPlayer(rec.a, { opId: 'duelrefund:' + id + ':a', source: 'duel', kind: 'gold', payload: { amount: rec.wager }, note: 'duel voided (server restart)' });
        await this._creditPlayer(rec.b, { opId: 'duelrefund:' + id + ':b', source: 'duel', kind: 'gold', payload: { amount: rec.wager }, note: 'duel voided (server restart)' });
        await this.state.storage.delete(k);
      }
    } catch (e) { /* best-effort */ }
  },
};
