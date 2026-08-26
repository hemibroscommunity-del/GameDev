/* ═══ v2.3.1117: INBOX + ESCROW PRIMITIVES (PR2 of the heavy-systems
 * plan; spec in docs/specs/inbox-escrow.md) ═══
 *
 * v2.3.1165 (P4 decomposition): extracted verbatim from index.js into
 * this mixin (same pattern as market.js).  These are the most-shared
 * primitives in the room -- market, trade, trade2, duel, clans,
 * cadence, and sponsorship all settle through _creditPlayer /
 * _escrowDebitGold / _escrowTakeItem via `this` (prototype dispatch),
 * so the move changes no call site.
 *
 * The settlement plumbing every economy system builds on: the
 * marketplace (PR3), trade sessions (PR4), and duel wagers (PR6) all
 * credit and debit players through these methods instead of trusting
 * the client to pay itself (the self-credit hole this plan retires).
 *
 * Storage layout -- all SEPARATE keys, never inside the rpg blob
 * (_saveRpg rewrites the blob from a fixed field list and would drop
 * foreign fields on the next save):
 *   inbox:<playerId>  array of pending credit entries (offline mail)
 *   oplog:<opId>      idempotency journal, ts value, pruned after 48h
 *
 * Concurrency: every method runs inside one DO event and only awaits
 * STORAGE ops, so input gates make each call a critical section.
 * Callers must keep the discipline rule: no cross-DO await between a
 * validation and the commit that depends on it. */

export const inboxMethods = {
  /* ═══ v2.3.1971: HOW MANY OF `k` DOES THIS PLAYER ACTUALLY HOLD ═══
   *
   * Every ownership gate in the economy was spelled `(inv[k] || 0) < n`,
   * which is wrong twice for a client-supplied key:
   *   - `constructor` (and the other ten Object.prototype members) is
   *     INHERITED and truthy, so `||` never fires and `Object < 7` is a
   *     NaN comparison -- false -- so the gate passes on goods nobody
   *     owns and the debit below writes NaN into a persisted blob.
   *   - a count that is already junk (a string or NaN left by an older
   *     build, or by a hand-edited blob) sails through the same way.
   * Own property, coerced to a number, or zero.  Read it INSTEAD of
   * indexing `ps.inventory` anywhere a client chose the key; the
   * sanitizer (trade.js `_sanitizeTradeOffer`) is the first gate and
   * this is the second, because the first is one edit away from being
   * widened by someone who does not know why it is there. */
  _invCount(ps, k) {
    const inv = ps && ps.inventory;
    if (!inv || typeof k !== 'string') return 0;
    if (!Object.prototype.hasOwnProperty.call(inv, k)) return 0;
    return Number(inv[k]) || 0;
  },

  // Idempotency journal.  Settlement callers pass a deterministic opId
  // (e.g. 'refund:<orderId>'); a retry after a crash or double-fire
  // finds the stamp and reports already-applied instead of paying twice.
  async _opSeen(opId) {
    if (!opId) return false;
    return (await this.state.storage.get('oplog:' + opId)) !== undefined;
  },

  async _opStamp(opId) {
    if (opId) await this.state.storage.put('oplog:' + opId, Date.now());
  },

  // Lazy prune, piggybacked on inbox drains and rate-limited to one
  // sweep per hour per DO lifetime -- there is no storage TTL, and 48h
  // is far beyond any legitimate retry window.
  async _opPruneMaybe() {
    const now = Date.now();
    if (this._lastOpPrune && now - this._lastOpPrune < 3600000) return;
    this._lastOpPrune = now;
    try {
      const entries = await this.state.storage.list({ prefix: 'oplog:' });
      for (const [k, ts] of entries) {
        if (typeof ts !== 'number' || now - ts > 172800000) await this.state.storage.delete(k);
      }
    } catch (e) { /* prune is best-effort */ }
  },

  /* Credit a player.  entry = { opId, source, kind, payload, note }:
   *   kind 'gold'   payload { amount }
   *   kind 'item'   payload { invKey, count }
   *   kind 'weapon' payload { weapon }   (opaque blob, sanitized on apply)
   * Online -> applied to live playerState immediately (+ inbox_delivered
   * notification).  Offline, or online with a full weapon stash -> parked
   * in inbox:<id> and drained at the next join.  Returns 'delivered' |
   * 'inboxed' | 'dup'. */
  async _creditPlayer(playerId, entry) {
    if (await this._opSeen(entry.opId)) return 'dup';
    await this._opStamp(entry.opId);
    const ps = this.playerState[playerId];
    if (ps && this._applyCreditToPs(ps, entry)) {
      this._saveRpg(playerId, ps);
      this._queuePlayerStateFlush(playerId);
      this._sendInboxDelivered(playerId, [entry], 0);
      return 'delivered';
    }
    await this._inboxAppend(playerId, entry);
    return 'inboxed';
  },

  // Apply one credit entry to a live playerState.  Returns false ONLY
  // when the entry must stay queued (weapon + full stash -- _saveRpg
  // truncates the stash at cap, so pushing past it would silently
  // DESTROY the weapon).  Malformed entries return true so a bad
  // payload can never wedge the inbox forever.
  _applyCreditToPs(ps, entry) {
    const p = entry.payload || {};
    if (entry.kind === 'gold') {
      ps.coins = Math.max(0, (ps.coins || 0) + Math.max(0, Math.floor(p.amount || 0)));
      return true;
    }
    if (entry.kind === 'item') {
      const k = typeof p.invKey === 'string' ? p.invKey : '';
      if (!k) return true;
      /* v2.3.1971: never credit onto an Object.prototype name.  Producers
         all pass server-chosen keys today, but this is the one funnel every
         payout in the game goes through -- if a future producer ever forwards
         a client key, the corruption lands in a stranger's saved blob, not in
         the caller.  `_invCount` also heals an already-junk count to 0 rather
         than concatenating onto it. */
      if (Object.prototype.hasOwnProperty.call(Object.prototype, k)) return true;
      if (!ps.inventory) ps.inventory = {};
      ps.inventory[k] = this._invCount(ps, k) + Math.max(1, Math.floor(p.count || 1));
      return true;
    }
    if (entry.kind === 'weapon') {
      const w = this._sanitizeWeapon(p.weapon);
      if (!w) return true;
      if (!Array.isArray(ps.weaponStash)) ps.weaponStash = [];
      if (ps.weaponStash.length >= this.WEAPON_STASH_CAP) return false;
      ps.weaponStash.push(w);
      return true;
    }
    return true;
  },

  // Append to the offline inbox.  At the soft cap, gold and item
  // entries merge losslessly into an existing same-kind entry (gold:
  // amounts sum; items: counts sum per invKey) so bulk payouts can't
  // grow the box unboundedly.  Weapons can't merge; they still append
  // (dropping value is worse than storage growth, and the producers --
  // market listings, trades -- are themselves capped per player).
  async _inboxAppend(playerId, entry) {
    const key = 'inbox:' + playerId;
    const box = (await this.state.storage.get(key)) || [];
    if (box.length >= 200) {
      const p = entry.payload || {};
      if (entry.kind === 'gold') {
        const g = box.find((e) => e.kind === 'gold');
        if (g) {
          g.payload.amount = (g.payload.amount || 0) + Math.max(0, Math.floor(p.amount || 0));
          g.note = 'merged payouts';
          await this.state.storage.put(key, box);
          return;
        }
      }
      if (entry.kind === 'item' && typeof p.invKey === 'string') {
        const it = box.find((e) => e.kind === 'item' && e.payload && e.payload.invKey === p.invKey);
        if (it) {
          it.payload.count = (it.payload.count || 1) + Math.max(1, Math.floor(p.count || 1));
          it.note = 'merged payouts';
          await this.state.storage.put(key, box);
          return;
        }
      }
    }
    box.push({ opId: entry.opId, ts: Date.now(), source: entry.source || '', kind: entry.kind, payload: entry.payload, note: entry.note || '' });
    await this.state.storage.put(key, box);
  },

  // Drain the offline inbox into a freshly joined player.  Called from
  // the join handler AFTER the rpg load/bootstrap and BEFORE state_sync,
  // so the first snapshot the client renders already includes the mail.
  // Weapons that don't fit the stash stay queued for a later join.
  async _drainInbox(playerId, ws) {
    try {
      await this._opPruneMaybe();
      const key = 'inbox:' + playerId;
      const box = await this.state.storage.get(key);
      if (!box || !box.length) return;
      const ps = this.playerState[playerId];
      if (!ps) return;
      const delivered = [];
      const remainder = [];
      for (const entry of box) {
        if (this._applyCreditToPs(ps, entry)) delivered.push(entry);
        else remainder.push(entry);
      }
      if (remainder.length) await this.state.storage.put(key, remainder);
      else await this.state.storage.delete(key);
      if (delivered.length) {
        this._saveRpg(playerId, ps);
        this._sendInboxDelivered(playerId, delivered, remainder.length, ws);
      }
    } catch (e) { /* mail must never block a join */ }
  },

  _sendInboxDelivered(playerId, entries, queued, wsOverride) {
    const ws = wsOverride || this._wsBySessionId(playerId);
    if (!ws) return;
    try {
      ws.send(JSON.stringify({
        type: 'inbox_delivered',
        payload: {
          entries: entries.map((e) => ({ kind: e.kind, payload: e.payload, note: e.note || '', source: e.source || '' })),
          queued: queued || 0,
        },
      }));
    } catch (e) { /* dead socket: the credits are already persisted */ }
  },

  /* Escrow debits.  Validate-and-take in one gated event; online players
   * are debited on the LIVE playerState (storage lags it -- mutating the
   * blob for an online player would diverge memory and disk), offline
   * players on the stored blob directly.  A duplicate opId reports
   * { ok: true, dup: true } so settlement retries converge. */
  async _escrowDebitGold(playerId, amount, opId) {
    const amt = Math.floor(amount || 0);
    if (amt <= 0) return { ok: false, reason: 'bad_amount' };
    if (await this._opSeen(opId)) return { ok: true, dup: true };
    const ps = this.playerState[playerId];
    if (ps) {
      if ((ps.coins || 0) < amt) return { ok: false, reason: 'insufficient_gold' };
      await this._opStamp(opId);
      ps.coins -= amt;
      this._saveRpg(playerId, ps);
      this._queuePlayerStateFlush(playerId);
      return { ok: true };
    }
    const stored = await this._loadRpg(playerId);
    if (!stored || (stored.coins || 0) < amt) return { ok: false, reason: 'insufficient_gold' };
    await this._opStamp(opId);
    stored.coins -= amt;
    await this.state.storage.put('rpg:' + playerId, stored);
    return { ok: true };
  },

  async _escrowTakeItem(playerId, invKey, count, opId) {
    const k = typeof invKey === 'string' ? invKey : '';
    const c = Math.floor(count || 0);
    if (!k || c <= 0) return { ok: false, reason: 'bad_item' };
    if (await this._opSeen(opId)) return { ok: true, dup: true };
    const ps = this.playerState[playerId];
    // v2.3.1971: own-property counts on both branches (see _invCount) --
    // `(inv.constructor || 0) < c` was false, so this debited NaN.
    if (ps) {
      if (this._invCount(ps, k) < c) return { ok: false, reason: 'insufficient_items' };
      await this._opStamp(opId);
      ps.inventory[k] = this._invCount(ps, k) - c;
      if (ps.inventory[k] <= 0) delete ps.inventory[k];
      this._saveRpg(playerId, ps);
      this._queuePlayerStateFlush(playerId);
      return { ok: true };
    }
    const stored = await this._loadRpg(playerId);
    if (this._invCount(stored, k) < c) return { ok: false, reason: 'insufficient_items' };
    await this._opStamp(opId);
    stored.inventory[k] = this._invCount(stored, k) - c;
    if (stored.inventory[k] <= 0) delete stored.inventory[k];
    await this.state.storage.put('rpg:' + playerId, stored);
    return { ok: true };
  },
};
