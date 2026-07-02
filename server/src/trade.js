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
  // Sanitize a client offer shape: { itemKey: qty, ..., _gold: n }.
  // Returns null when nothing survives (empty gift = drop the message).
  _sanitizeTradeOffer(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const out = {};
    let keys = 0;
    for (const [k, v] of Object.entries(raw)) {
      if (k === '_gold') {
        const g = Math.floor(Number(v) || 0);
        if (g > 0) out._gold = Math.min(999999, g);
        continue;
      }
      if (keys >= 20) break; // inventory keys are a small closed set; 20 is generous
      if (typeof k !== 'string' || k.length > 32) continue;
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
    for (const [k, v] of Object.entries(offer)) {
      if (k === '_gold') continue;
      if (((senderPs.inventory && senderPs.inventory[k]) || 0) < v) return rejectAccepter();
    }
    // Debit the sender synchronously (no awaits yet).
    if (offer._gold) senderPs.coins -= offer._gold;
    for (const [k, v] of Object.entries(offer)) {
      if (k === '_gold') continue;
      senderPs.inventory[k] -= v;
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
};
