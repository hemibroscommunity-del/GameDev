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
    return {
      id: s.id, a: s.a, b: s.b,
      aName: s.aName, bName: s.bName,
      offers: s.offers, confirmed: s.confirmed,
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
        offers: { [target]: {}, [session.id]: {} },
        confirmed: { [target]: false, [session.id]: false },
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
    s.confirmed[s.a] = false;
    s.confirmed[s.b] = false;
    s.ts = Date.now();
    this._t2Broadcast(s);
  },

  async _handleTrade2Confirm(session) {
    const s = this._t2SessionFor(session.id);
    if (!s) return;
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
    for (const side of sides) {
      if ((side.gives._gold || 0) > (side.ps.coins || 0)) return this._t2Cancel(s, 'insufficient:' + side.id);
      for (const [k, v] of Object.entries(side.gives)) {
        if (k === '_gold') continue;
        if (((side.ps.inventory && side.ps.inventory[k]) || 0) < v) return this._t2Cancel(s, 'insufficient:' + side.id);
      }
    }
    // Debit BOTH synchronously before any credit -- atomicity.
    for (const side of sides) {
      if (side.gives._gold) side.ps.coins -= side.gives._gold;
      for (const [k, v] of Object.entries(side.gives)) {
        if (k === '_gold') continue;
        side.ps.inventory[k] -= v;
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
};
