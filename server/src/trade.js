/* ═══ v2.3.1119: SERVER-SETTLED TRADES (PR4 of the heavy-systems plan;
 * spec in docs/specs/trading.md) ═══
 *
 * The old trade flow was a duplication engine: trade_offer/trade_accept
 * were blind relays, the RECIPIENT minted the offer into their own
 * inventory on accept (IncomingTradePanel), the SENDER'S handler minted
 * the offer items AGAIN on the accept echo (gameEvents), and nobody was
 * ever debited.  Every trade duplicated the goods on both sides.
 *
 * The wire handshake stays exactly the same (trade_offer -> trade_accept
 * / trade_reject, still client-initiated), but the GameRoom now
 * INTERCEPTS the relay and becomes the counterparty of record:
 *   - trade_offer: the offer is sanitized and snapshotted server-side
 *     (2 min TTL).  Nothing is escrowed -- validate-at-commit is enough
 *     because the commit runs as one gated DO event (design review C).
 *   - trade_accept: valid only against a live offer from the OTHER
 *     side's own session (same forge-proofing as the PvP consent pairs).
 *     The sender's goods are validated AT COMMIT (they may have spent
 *     them since offering), debited synchronously, and credited to the
 *     accepter through the PR2 _creditPlayer primitives.  The relayed
 *     accept gains `settled: true`, which tells modern clients to skip
 *     their legacy mint paths.
 *   - An accept with no matching live offer is DROPPED, not relayed --
 *     relaying it would trigger the legacy mint on the other side,
 *     which is precisely the forgery this PR kills.
 *   - Validation failure -> trade_reject to the accepter ("Trade
 *     declined" in the existing UI), no transfer.
 *
 * Deploy-order safety: state_sync now advertises `caps.trade`; clients
 * only skip their legacy self-credit paths when the server has claimed
 * settlement.  Old client + new worker double-applies locally, but the
 * authoritative player_state echo overwrites it (coins + inventory are
 * echoed and adopted), so the server's answer wins either way.
 *
 * In-memory pending offers on purpose: a deploy wipe just voids
 * un-accepted offers -- nothing is escrowed, no value at risk. */

export const TRADE_OFFER_TTL = 120000; // 2 min to accept

export const tradeMethods = {
  /* ═══ v2.3.1971: AN INVENTORY KEY OFF Object.prototype IS NOT AN ITEM ═══
   *
   * The offer key is client-supplied and both lanes settle it with the
   * same shape: `(ps.inventory[k] || 0) < v` to prove ownership, then
   * `ps.inventory[k] -= v` to debit.  For k = 'constructor' (or any of
   * the other ten Object.prototype members) the lookup returns an
   * inherited FUNCTION, `Object < 7` is false because the comparison is
   * NaN, and the ownership gate passes on goods nobody holds.  Measured
   * on the live path (trade2_set {constructor:7,toString:3}, both
   * confirm):
   *   giver's blob    inventory.constructor = NaN  -> saved as null
   *   taker's blob    inventory.constructor = "function Object() { …}7"
   *                   -- a STRING in a count field, on both sides,
   *                   persisted by _saveRpg and echoed to the client.
   * Nothing of VALUE duplicates (no real item is named `toString`), but
   * it writes junk into a stranger's saved character every time they
   * accept, and `hasOwnProperty`/`toString` shadowed by a string is the
   * kind of thing that turns a bag render into a crash.
   *
   * Closed at the sanitizer because it is the ONE choke point both lanes
   * share (gift `trade_offer` and `trade2_set` alike), so neither can
   * grow the hole back independently.  `Object.create(null)` on top is
   * the standing repo law for a map keyed by client ids -- three
   * incidents in one day (duel.away v2.3.1175, party meta v2.3.1185,
   * amulet tiers v2.3.1192) -- and the two together mean a crafted key
   * cannot reach a settlement site at all.  Belt-and-braces own-property
   * gates at the settlement sites themselves: trade.js/_interceptTrade,
   * trade2.js/_handleTrade2Confirm, inbox.js/_invCount.
   *
   * ALSO v2.3.1971: the key cap was a `break`, so an offer whose 21st
   * key came before `_gold` in insertion order silently dropped the GOLD
   * -- the loop stopped scanning before it ever saw it.  `continue`
   * keeps the same 20-item ceiling while letting the gold leg through;
   * the payload is bounded by the 16 KB inbound frame cap, so the extra
   * iterations are free. */
  _sanitizeTradeOffer(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const out = Object.create(null);
    let keys = 0;
    for (const [k, v] of Object.entries(raw)) {
      if (k === '_gold') {
        const g = Math.floor(Number(v) || 0);
        if (g > 0) out._gold = Math.min(999999, g);
        continue;
      }
      if (keys >= 20) continue; // inventory keys are a small closed set; 20 is generous
      if (typeof k !== 'string' || k.length > 32) continue;
      // The gate above: an Object.prototype member is never an item.
      if (Object.prototype.hasOwnProperty.call(Object.prototype, k)) continue;
      const n = Math.floor(Number(v) || 0);
      if (n <= 0) continue;
      out[k] = Math.min(9999, n);
      keys++;
    }
    return Object.keys(out).length ? out : null;
  },

  /* Intercept a relayed trade message.  Returns the (possibly annotated)
   * message to rebroadcast, or null to drop it.  Runs inside the single
   * webSocketMessage event; the only awaits are the PR2 credit calls,
   * which themselves only await storage -- input gates hold throughout,
   * so validate -> debit -> credit is one critical section. */
  async _interceptTrade(fromId, msg) {
    const payload = msg.payload || {};
    const target = payload.target;
    if (!target || typeof target !== 'string' || target === fromId) return null;
    /* v2.3.1622: bound the KEY.  `target` is client-supplied and lands
       verbatim in the map key below, and nothing checked its length --
       a single client could mint 16 KB keys (the inbound frame cap) as
       fast as the relay bucket allows and walk the room's 128 MB DO
       into the ground.  64 chars matches the existing precedent at
       friends.js:116; real ids are 'bp_<base36>_<words>', far shorter. */
    if (target.length > 64) return null;
    if (!this._pendingTradeOffers) this._pendingTradeOffers = new Map(); // 'sender>recipient' -> {offer, fromName, ts, id}

    if (msg.type === 'trade_offer') {
      const offer = this._sanitizeTradeOffer(payload.offer);
      if (!offer) return null;
      this._pendingTradeOffers.set(fromId + '>' + target, {
        offer, fromName: typeof payload.fromName === 'string' ? payload.fromName.slice(0, 24) : 'Someone',
        ts: Date.now(), id: crypto.randomUUID(),
      });
      payload.offer = offer; // relay the sanitized shape, not the raw one
      return msg;
    }

    // trade_accept: fromId is the accepter, target is the original sender.
    const key = target + '>' + fromId;
    const pending = this._pendingTradeOffers.get(key);
    this._pendingTradeOffers.delete(key); // single-shot: a replayed accept finds nothing
    const rejectAccepter = () => {
      this.eventBuffer.push({ type: 'trade_reject', from: target, payload: { from: target, target: fromId } });
      return null;
    };
    if (!pending || Date.now() - pending.ts > TRADE_OFFER_TTL) return null; // forged/replayed/expired: drop silently
    const senderPs = this.playerState[target];
    if (!senderPs) return rejectAccepter(); // sender left before the accept
    const offer = pending.offer;
    // Validate-at-commit: the sender may have spent the goods since
    // offering (the classic trade-window scam, plus honest races).
    if ((offer._gold || 0) > (senderPs.coins || 0)) return rejectAccepter();
    // v2.3.1971: own-property counts (inbox.js `_invCount`).  The old
    // `(inv[k] || 0) < v` passed on any Object.prototype name and then
    // debited NaN into the sender's saved blob -- see the sanitizer header.
    for (const [k, v] of Object.entries(offer)) {
      if (k === '_gold') continue;
      if (this._invCount(senderPs, k) < v) return rejectAccepter();
    }
    // Debit the sender synchronously (no awaits yet).
    if (offer._gold) senderPs.coins -= offer._gold;
    for (const [k, v] of Object.entries(offer)) {
      if (k === '_gold') continue;
      senderPs.inventory[k] = this._invCount(senderPs, k) - v;
      if (senderPs.inventory[k] <= 0) delete senderPs.inventory[k];
    }
    this._saveRpg(target, senderPs);
    this._queuePlayerStateFlush(target);
    // Credit the accepter through the PR2 primitives (they're online --
    // they just clicked accept -- so this applies live and notifies).
    const note = 'trade from ' + pending.fromName;
    if (offer._gold) {
      await this._creditPlayer(fromId, { opId: 'trade:' + pending.id + ':gold', source: 'trade', kind: 'gold', payload: { amount: offer._gold }, note });
    }
    for (const [k, v] of Object.entries(offer)) {
      if (k === '_gold') continue;
      await this._creditPlayer(fromId, { opId: 'trade:' + pending.id + ':' + k, source: 'trade', kind: 'item', payload: { invKey: k, count: v }, note });
    }
    payload.settled = true; // modern clients skip their legacy mint paths
    return msg;
  },

  /* v2.3.1622: expire pending offers.  TRADE_OFFER_TTL existed but was
     only ever read to REJECT a late accept -- nothing deleted the entry,
     so the only way out of this map was a matching trade_accept.  An
     offer to someone who never answers (the common case: the target
     declines, closes the tab, or was never online) stayed resident for
     the life of the DO.
     Every sibling map already sweeps -- _t2Invites (trade2.js:249),
     _partyInvites (party.js:289), _duelChallenges, _threats -- this one
     and _clanInvites were the two that were missed.
     ADDITIVE ONLY: the single-shot delete in _interceptTrade stays.  It
     is what makes a replayed accept find nothing, and this sweep must
     not be mistaken for a replacement for it.  Removing an entry the
     server had already decided to reject changes no behaviour. */
  _tickTradeOffers(now) {
    if (!this._pendingTradeOffers) return;
    for (const [k, p] of this._pendingTradeOffers) {
      if (now - p.ts > TRADE_OFFER_TTL) this._pendingTradeOffers.delete(k);
    }
  },
};
