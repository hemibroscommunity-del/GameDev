/* ═══ v2.3.1132: TWO-SIDED TRADE WINDOW (handoff backlog item H; spec
 * in docs/specs/trading.md addendum + this header) ═══
 *
 * The v2.3.1119 trade is a one-directional GIFT: sender stages, target
 * accepts, server settles.  This module adds the real trade window --
 * both players stage items + gold, both confirm, the server swaps both
 * sides ATOMICALLY -- built on the same validate-at-commit core and
 * deliberately NOT extending the gift handshake (handoff item H: the
 * gift wire stays as-is for old clients; this is a parallel, explicit
 * command surface).
 *
 * Session machine (in-memory, deploy voids it -- nothing escrowed):
 *   trade2_open {target}   Mutual-open handshake: A opens toward B
 *                          (B gets a trade2_invite); when B opens back
 *                          toward A the session goes live.  Symmetric,
 *                          so "click Trade on the incoming popup" is
 *                          the whole accept flow.
 *   trade2_set {offer}     Replace YOUR staged side wholesale
 *                          ({itemKey: qty, _gold: n}, the gift
 *                          sanitizer's shape).  ANY change resets BOTH
 *                          confirmations -- the classic anti-switch
 *                          rule: you can never confirm against a side
 *                          you haven't seen.
 *   trade2_confirm         Sets your flag.  When both are set the
 *                          commit runs inside the same webSocketMessage
 *                          event: validate BOTH sides (they may have
 *                          spent the goods since staging), debit both
 *                          synchronously, credit both via the PR2
 *                          _creditPlayer primitives (opId-idempotent).
 *                          Any shortfall cancels the session -- no
 *                          partial application is possible because
 *                          both debits happen before any credit and
 *                          the whole section is input-gated.
 *   trade2_cancel          Either side, any time before commit.
 *                          Disconnect cancels too (webSocketClose
 *                          hook), and a tick sweep expires idle
 *                          sessions.
 *
 * Every state change re-echoes the full session snapshot privately to
 * both parties as trade2_state (PRIVILEGED) -- the client window is a
 * pure renderer of server truth; there is nothing client-trusted to
 * forge.  Scope v1: inventory items + gold only (weapons trade through
 * the marketplace's escrowed listings -- deliberate; see spec). */

export const TRADE2 = {
  INVITE_TTL: 60000,    // open-toward-you offer lifetime
  SESSION_TTL: 300000,  // idle session lifetime (any action refreshes)
  MAX_GOLD: 999999,
  WEAPON_MAX: 4,        // v2.3.1213: max weapons staged per side
  /* v2.3.1754 (owner, quoting the RuneScape/WoW lineage): "any modification
     resets all acceptances, plus a 2-3 second delay before accepting is
     re-enabled — kills last-second swap scams."  Enforced on the SERVER, not
     just drawn on the client: a cooldown a client can skip is decoration, and
     the scam it exists to stop is run by a modified client. */
  ACCEPT_COOLDOWN_MS: 2500,
};

export const trade2Methods = {
  _t2Send(playerId, type, payload) {
    const ws = this._wsBySessionId(playerId);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type, payload })); } catch (e) {}
  },

  _t2SessionFor(playerId) {
    if (!this._trades2) return null;
    for (const s of this._trades2.values()) {
      if (s.state === 'open' && (s.a === playerId || s.b === playerId)) return s;
    }
    return null;
  },

  _t2Wire(s) {
    // v2.3.1213: staged weapons ride a parallel `weapons` snapshot (per
    // side, [{seq, weapon}]) -- the escrow-at-stage lane, distinct from
    // the wholesale `offers` (items/gold).  The client renders both.
    const wpn = (pid) => (s.weapons && s.weapons[pid]) ? s.weapons[pid].map((w) => ({ seq: w.seq, weapon: w.weapon })) : [];
    return {
      id: s.id, a: s.a, b: s.b,
      aName: s.aName, bName: s.bName,
      offers: s.offers, confirmed: s.confirmed,
      /* v2.3.1754 */
      ready: s.ready || {}, changedAt: s.changedAt || 0, changedBy: s.changedBy || null,
      stage: (s.ready && s.ready[s.a] && s.ready[s.b]) ? 'review' : 'offer',
      weapons: { [s.a]: wpn(s.a), [s.b]: wpn(s.b) },
      state: s.state,
    };
  },

  _t2Broadcast(s, extra) {
    const wire = Object.assign(this._t2Wire(s), extra || {});
    this._t2Send(s.a, 'trade2_state', wire);
    this._t2Send(s.b, 'trade2_state', wire);
  },

  _t2Cancel(s, why) {
    if (!s || s.state !== 'open') return;
    s.state = 'cancelled';
    this._trades2.delete(s.id);
    // v2.3.1213: return any escrowed weapons to their owners (fire-and-
    // forget; opId-idempotent + swept as a backstop).  The state guard
    // above makes _t2Cancel single-shot, so this can't double-refund.
    this._t2RefundWeapons(s).catch(() => {});
    this._t2Broadcast(s, { reason: why || 'cancelled' });
  },

  _handleTrade2Open(session, payload) {
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead) return;
    const target = payload && payload.target;
    if (!target || typeof target !== 'string' || target === session.id) return;
    const targetPs = this.playerState[target];
    if (!targetPs || targetPs.dying || targetPs.disconnected) {
      return this._t2Send(session.id, 'trade2_state', { state: 'cancelled', reason: 'target-gone' });
    }
    if (!this._trades2) this._trades2 = new Map();
    if (!this._t2Invites) this._t2Invites = new Map(); // 'from>to' -> ts
    // One live session per player.
    if (this._t2SessionFor(session.id) || this._t2SessionFor(target)) {
      return this._t2Send(session.id, 'trade2_state', { state: 'cancelled', reason: 'busy' });
    }
    const now = Date.now();
    // Mutual open: if the TARGET already opened toward US, that's the
    // accept -- the session goes live.  (Same per-sender-session
    // validation posture as every handshake since PR1: each half is
    // recorded against the socket that sent it.)
    const inv = this._t2Invites.get(target + '>' + session.id);
    if (inv && now - inv < TRADE2.INVITE_TTL) {
      this._t2Invites.delete(target + '>' + session.id);
      this._t2Invites.delete(session.id + '>' + target);
      const s = {
        id: crypto.randomUUID(), a: target, b: session.id,
        aName: (targetPs.name || 'Trader'), bName: (ps.name || 'Trader'),
        offers: { [target]: {}, [session.id]: {} }, // proto-ok: player-keyed (target validated live); join gate v2.3.1202
        confirmed: { [target]: false, [session.id]: false },
        /* v2.3.1754: the two-stage handshake.  `ready` is the OFFER stage
           ("I am done editing"); `confirmed` is the REVIEW stage ("I accept
           what I was just shown").  They are separate flags because the whole
           anti-scam value of the second screen is that you accept a summary
           you have already seen — one flag cannot express that.
           `changedAt` stamps the last edit so the accept cooldown is enforced
           HERE and not merely drawn on the client. */
        ready: { [target]: false, [session.id]: false },
        changedAt: now, changedBy: null,
        state: 'open', ts: now,
      };
      this._trades2.set(s.id, s);
      this._t2Broadcast(s);
      return;
    }
    // First half: record + invite the target (their popup renders it;
    // clicking Trade back completes the mutual open above).
    this._t2Invites.set(session.id + '>' + target, now);
    this._t2Send(target, 'trade2_invite', { from: session.id, fromName: (ps.name || 'Someone') });
    this._t2Send(session.id, 'trade2_state', { state: 'invited', target });
  },

  _handleTrade2Set(session, payload) {
    const s = this._t2SessionFor(session.id);
    if (!s) return;
    // Reuse the gift sanitizer's shape ({itemKey: qty, _gold: n}); an
    // empty stage is legal here (gold-for-items trades stage one empty
    // side deliberately) -- null just means {}.
    const offer = this._sanitizeTradeOffer(payload && payload.offer) || {};
    s.offers[session.id] = offer;
    // The anti-switch rule: any change unconfirms BOTH sides.
    // v2.3.1754: ...and un-READIES both, dropping the pair back to the offer
    // stage.  Resetting only `confirmed` would leave two players sitting on a
    // review screen describing a trade that no longer exists — which is the
    // exact misread the second screen exists to prevent.
    s.confirmed[s.a] = false;
    s.confirmed[s.b] = false;
    if (s.ready) { s.ready[s.a] = false; s.ready[s.b] = false; }
    s.changedAt = Date.now();
    s.changedBy = session.id;
    s.ts = Date.now();
    this._t2Broadcast(s);
  },

  /* ═══ v2.3.1754: STAGE ONE — "I am done editing" ═══
     Owner: "once both ready up, show a second, stripped-down screen ... Both
     must accept again.  This second screen is arguably the single best
     anti-scam feature ever added to a trade system."
     Ready is deliberately NOT confirm: it commits nothing, it only says the
     offer is final so the pair can be shown a summary of it. */
  _handleTrade2Ready(session, payload) {
    const s = this._t2SessionFor(session.id);
    if (!s) return;
    if (!s.ready) s.ready = { [s.a]: false, [s.b]: false };
    /* payload.ready === false backs you out of the review screen without
       editing anything — the "Back" button on the summary. */
    s.ready[session.id] = !(payload && payload.ready === false);
    s.ts = Date.now();
    this._t2Broadcast(s);
  },

  async _handleTrade2Confirm(session) {
    const s = this._t2SessionFor(session.id);
    if (!s) return;
    /* ═══ v2.3.1754: A CONFIRM IS ONLY VALID ON THE REVIEW SCREEN ═══
       Gated here rather than in the UI because the UI is not the thing an
       attacker runs.  Both halves matter:
       - both sides must be READY, so a confirm can only ever apply to an
         offer that has been frozen and shown as a summary;
       - and it must be at least ACCEPT_COOLDOWN_MS since the last edit, which
         is the "2-3 second delay" that kills the last-second swap — a
         modified client that skips its own timer still gets refused. */
    if (!s.ready || !(s.ready[s.a] && s.ready[s.b])) return this._t2Broadcast(s, { reason: 'not-ready' });
    if (Date.now() - (s.changedAt || 0) < TRADE2.ACCEPT_COOLDOWN_MS) {
      return this._t2Broadcast(s, { reason: 'cooling' });
    }
    s.confirmed[session.id] = true;
    s.ts = Date.now();
    if (!(s.confirmed[s.a] && s.confirmed[s.b])) {
      return this._t2Broadcast(s);
    }
    // Both confirmed -> COMMIT.  One input-gated critical section:
    // validate both sides, debit both, then credit both (the credits
    // await storage but input gates hold peers off the whole time).
    const psA = this.playerState[s.a], psB = this.playerState[s.b];
    if (!psA || !psB || psA.disconnected || psB.disconnected) return this._t2Cancel(s, 'party-gone');
    const sides = [
      { id: s.a, ps: psA, gives: s.offers[s.a] || {}, getsFrom: s.b },
      { id: s.b, ps: psB, gives: s.offers[s.b] || {}, getsFrom: s.a },
    ];
    /* v2.3.1971: own-property counts (inbox.js `_invCount`).  This gate
       was `(inv[k] || 0) < v`, which is a NaN comparison -- and therefore
       false, and therefore a PASS -- for every Object.prototype member.
       Staging {constructor: 7} debited NaN out of the giver's saved blob
       and credited the taker a string where a count belongs.  The
       sanitizer now drops the key before it gets here; this is the second
       gate, deliberately. */
    for (const side of sides) {
      if ((side.gives._gold || 0) > (side.ps.coins || 0)) return this._t2Cancel(s, 'insufficient:' + side.id);
      for (const [k, v] of Object.entries(side.gives)) {
        if (k === '_gold') continue;
        if (this._invCount(side.ps, k) < v) return this._t2Cancel(s, 'insufficient:' + side.id);
      }
    }
    // Debit BOTH synchronously before any credit -- atomicity.
    for (const side of sides) {
      if (side.gives._gold) side.ps.coins -= side.gives._gold;
      for (const [k, v] of Object.entries(side.gives)) {
        if (k === '_gold') continue;
        side.ps.inventory[k] = this._invCount(side.ps, k) - v;
        if (side.ps.inventory[k] <= 0) delete side.ps.inventory[k];
      }
    }
    s.state = 'done';
    this._trades2.delete(s.id);
    this._saveRpg(s.a, psA);
    this._saveRpg(s.b, psB);
    this._queuePlayerStateFlush(s.a);
    this._queuePlayerStateFlush(s.b);
    // Credit each side what the OTHER staged (opId-idempotent; both
    // parties are online -- they just confirmed -- so these apply live).
    for (const side of sides) {
      const gets = s.offers[side.getsFrom] || {};
      const note = 'trade with ' + (side.getsFrom === s.a ? s.aName : s.bName);
      if (gets._gold) {
        await this._creditPlayer(side.id, { opId: 'trade2:' + s.id + ':' + side.id + ':gold', source: 'trade', kind: 'gold', payload: { amount: gets._gold }, note });
      }
      for (const [k, v] of Object.entries(gets)) {
        if (k === '_gold') continue;
        await this._creditPlayer(side.id, { opId: 'trade2:' + s.id + ':' + side.id + ':' + k, source: 'trade', kind: 'item', payload: { invKey: k, count: v }, note });
      }
    }
    // v2.3.1213: deliver each weapon the OTHER side escrowed at stage.
    // The weapon already LEFT its owner's stash at stage-time, so commit
    // only credits the recipient (cap-safe: _creditPlayer parks it in
    // the recipient's inbox if their stash is full, rule 3).  Delete the
    // escrow record AFTER the credit (rule 6, credit-before-delete); the
    // deliver opId is keyed by OWNER+seq so the sweep can tell a
    // delivered weapon from a refundable one.
    if (s.weapons) {
      for (const side of sides) {
        const note = 'trade with ' + (side.getsFrom === s.a ? s.aName : s.bName);
        for (const entry of (s.weapons[side.getsFrom] || [])) {
          await this._creditPlayer(side.id, {
            opId: 'trade2:' + s.id + ':wpndeliver:' + side.getsFrom + ':' + entry.seq,
            source: 'trade', kind: 'weapon', payload: { weapon: entry.weapon }, note,
          });
          await this.state.storage.delete('trade2wpn:' + side.getsFrom + ':' + entry.seq);
        }
      }
    }
    this._t2Broadcast(s, { settled: true });
  },

  _handleTrade2Cancel(session) {
    const s = this._t2SessionFor(session.id);
    if (s) this._t2Cancel(s, 'declined');
    // Also clear any outbound invite so a decline really declines.
    if (this._t2Invites) {
      for (const k of [...this._t2Invites.keys()]) {
        if (k.startsWith(session.id + '>') || k.endsWith('>' + session.id)) this._t2Invites.delete(k);
      }
    }
  },

  // Disconnect hook (webSocketClose) + tick sweep.
  _trade2OnDisconnect(playerId) {
    const s = this._t2SessionFor(playerId);
    if (s) this._t2Cancel(s, 'disconnected');
  },

  _tickTrades2(now) {
    if (this._t2Invites) {
      for (const [k, ts] of this._t2Invites) {
        if (now - ts > TRADE2.INVITE_TTL) this._t2Invites.delete(k);
      }
    }
    if (this._trades2) {
      for (const s of [...this._trades2.values()]) {
        if (now - s.ts > TRADE2.SESSION_TTL) this._t2Cancel(s, 'expired');
      }
    }
  },

  /* ═══ v2.3.1213: weapon lane (handoff item E) ═══
   *
   * v1 traded items + gold via validate-at-commit -- nothing escrowed, a
   * deploy voids the window harmlessly.  Weapons are opaque blobs at
   * REST in the stage, so they use escrow-at-stage (rule 7): staging
   * removes the weapon from the owner's server-held weaponStash into a
   * storage-backed record (trade2wpn:<pid>:<seq>, rule 11 -- must
   * survive a deploy/disconnect), commit delivers it to the other side,
   * and cancel/disconnect/idle-expiry/deploy all refund it.  Custody +
   * cap-safe delivery + refund mirror the marketplace listing lane
   * (market.js): _creditPlayer(kind:'weapon') pushes to the stash or
   * parks it in the inbox when full (rule 3 -- never destroy).  Every
   * leg is opId-idempotent and the deploy sweep checks the deliver stamp
   * before refunding (rule 6) so a committed weapon can't also refund. */

  // Escrow a stash weapon into MY side of the live session.
  async _handleTrade2StageWeapon(session, payload) {
    const s = this._t2SessionFor(session.id);
    if (!s) return;
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead) return;
    if (!Array.isArray(ps.weaponStash)) ps.weaponStash = [];
    const idx = payload && payload.stashIdx;
    if (!Number.isInteger(idx) || idx < 0 || idx >= ps.weaponStash.length) return;
    // Stale-index guard: the client's stash view can lag a just-staged
    // weapon's removal, so an optional name check turns a stale tap into
    // a no-op instead of escrowing the wrong weapon (still take-by-index
    // from the SERVER's stash, rule 16 -- the name is only a tiebreak).
    if (typeof (payload && payload.expectName) === 'string'
      && ps.weaponStash[idx] && ps.weaponStash[idx].name !== payload.expectName) return;
    if (!s.weapons) s.weapons = { [s.a]: [], [s.b]: [] };
    const mine = s.weapons[session.id] || (s.weapons[session.id] = []);
    if (mine.length >= TRADE2.WEAPON_MAX) return; // staged-weapon cap
    // Take the weapon by INDEX from the SERVER's own stash (rule 16 --
    // never trust a client-supplied blob), sanitized (quality/hardness/
    // temper preserved, clamped -- the credit path re-sanitizes the same
    // way on delivery/refund).
    const weapon = this._sanitizeWeapon(ps.weaponStash[idx]);
    if (!weapon) return;
    ps.weaponStash.splice(idx, 1);
    const seq = (this._t2WpnSeq = (this._t2WpnSeq || 0) + 1);
    await this.state.storage.put('trade2wpn:' + session.id + ':' + seq, {
      pid: session.id, sid: s.id, seq, weapon, ts: Date.now(),
    });
    mine.push({ seq, weapon });
    this._saveRpg(session.id, ps);
    this._queuePlayerStateFlush(session.id);
    // Anti-switch: staging is a change -> reset BOTH confirms.
    // v2.3.1754: and both readies, plus the change stamp (see _handleTrade2Set).
    s.confirmed[s.a] = false;
    s.confirmed[s.b] = false;
    if (s.ready) { s.ready[s.a] = false; s.ready[s.b] = false; }
    s.changedAt = Date.now();
    s.changedBy = session.id;
    s.ts = Date.now();
    this._t2Broadcast(s);
  },

  // Pull one of MY escrowed weapons back out (before commit).
  async _handleTrade2UnstageWeapon(session, payload) {
    const s = this._t2SessionFor(session.id);
    if (!s || !s.weapons) return;
    const seq = payload && payload.seq;
    const mine = s.weapons[session.id] || [];
    const at = mine.findIndex((w) => w.seq === seq);
    if (at < 0) return;
    const [entry] = mine.splice(at, 1);
    await this._creditPlayer(session.id, {
      opId: 'trade2:' + s.id + ':wpnrefund:' + session.id + ':' + entry.seq,
      source: 'trade', kind: 'weapon', payload: { weapon: entry.weapon }, note: 'unstaged from trade',
    });
    await this.state.storage.delete('trade2wpn:' + session.id + ':' + entry.seq);
    s.confirmed[s.a] = false;
    s.confirmed[s.b] = false;
    /* v2.3.1754: unstaging is a change like any other (see _handleTrade2Set). */
    if (s.ready) { s.ready[s.a] = false; s.ready[s.b] = false; }
    s.changedAt = Date.now();
    s.changedBy = session.id;
    s.ts = Date.now();
    this._t2Broadcast(s);
  },

  // Refund all escrowed weapons in a (cancelled) session to their owners.
  async _t2RefundWeapons(s) {
    if (!s || !s.weapons) return;
    for (const pid of [s.a, s.b]) {
      const list = s.weapons[pid] || [];
      for (const entry of list) {
        // rule 6: a crash between commit-deliver and record-delete could
        // leave this entry -- never refund a weapon already delivered.
        if (await this._opSeen('trade2:' + s.id + ':wpndeliver:' + pid + ':' + entry.seq)) {
          await this.state.storage.delete('trade2wpn:' + pid + ':' + entry.seq);
          continue;
        }
        await this._creditPlayer(pid, {
          opId: 'trade2:' + s.id + ':wpnrefund:' + pid + ':' + entry.seq,
          source: 'trade', kind: 'weapon', payload: { weapon: entry.weapon }, note: 'trade cancelled',
        });
        await this.state.storage.delete('trade2wpn:' + pid + ':' + entry.seq);
      }
      s.weapons[pid] = [];
    }
  },

  // Deploy orphan sweep (join-path, rate-limited -- the _duelEscrowSweep
  // pattern).  A deploy wipes the in-memory session while escrowed
  // weapons persist in storage; refund any record with no live session,
  // skipping ones already delivered (rule 6).
  async _trade2WpnSweep() {
    const now = Date.now();
    if (this._lastT2WpnSweep && now - this._lastT2WpnSweep < 300000) return;
    this._lastT2WpnSweep = now;
    try {
      const recs = await this.state.storage.list({ prefix: 'trade2wpn:' });
      for (const [k, rec] of recs) {
        if (!rec || !rec.pid) { await this.state.storage.delete(k); continue; }
        const live = this._t2SessionFor(rec.pid);
        if (live && live.id === rec.sid) continue; // still escrowed in a live window
        if (await this._opSeen('trade2:' + rec.sid + ':wpndeliver:' + rec.pid + ':' + rec.seq)) {
          await this.state.storage.delete(k); // delivered, crash before delete
          continue;
        }
        await this._creditPlayer(rec.pid, {
          opId: 'trade2:' + rec.sid + ':wpnrefund:' + rec.pid + ':' + rec.seq,
          source: 'trade', kind: 'weapon', payload: { weapon: rec.weapon }, note: 'trade voided (server restart)',
        });
        await this.state.storage.delete(k);
      }
    } catch (e) { /* best-effort */ }
  },
};
