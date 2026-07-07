/* ═══ v2.3.1118: MARKETPLACE folded into the GameRoom (PR3 of the
 * heavy-systems plan; spec in docs/specs/marketplace.md) ═══
 *
 * The old global Marketplace DO (marketplace.js) had ZERO settlement:
 * placeOrder trusted the request body, a match just deleted the resting
 * order, and the CLIENT paid itself (ExchangePanel self-credit) -- free
 * item duplication for anyone with devtools.  With the owner-directed
 * single shared room (brotown-1), a separate DO also buys nothing and
 * only adds cross-DO failure windows.  So the order book now lives in
 * the GameRoom itself: escrow and settlement are synchronous mutations
 * of the same playerState / rpg blobs the room already owns, under one
 * DO's input gates -- no opId journal needed on the placement path.
 * Settlement CREDITS go through the PR2 primitives (_creditPlayer),
 * which handle online/offline delivery and idempotency uniformly.
 * v2.3.1178: settlement/refund order is credit-first, delete-last
 * with maker-keyed settle stamps -- the original delete-first order
 * left a deploy-shaped window that destroyed escrow unrecoverably
 * (see the comments at the match/cancel/sweep sites).
 *
 * Mixed into GameRoom via Object.assign(GameRoom.prototype, marketMethods)
 * in index.js -- kept in this module so a future room re-shard can
 * re-extract it mechanically.
 *
 * Storage keys (GameRoom storage, separate from the rpg blob):
 *   mkt_order:<orderId>   resting order (escrow held server-side)
 *   mkt_hist:<indexKey>   rolling [{p, ts}] of executed prices, cap 50
 *
 * Owner decisions (2026-07-02): 24h listings (GDD §39 contradicted
 * itself: 1h in one place, 48h in another) with refund-to-inbox on
 * expiry; bounty boards deferred; direct self-trades never enter the
 * price history (the matcher already skips same-player orders). */

export const MARKET = {
  ORDER_EXPIRY: 86400000,       // 24h
  MAX_ORDERS_PER_PLAYER: 10,
  SWEEP_INTERVAL: 60000,
  PRICE_HIST_CAP: 50,
};

export const marketMethods = {
  _mktIndexKey(o) {
    return `${o.category}:${o.subtype}:${o.tierKey}:${o.element1 || 'none'}:${o.element2 || 'none'}`;
  },

  // In-memory index, lazy-loaded once per DO wake (same §39.4 shape the
  // old Marketplace used: buys sorted descending, sells ascending, O(1)
  // match against the bucket head).
  async _mktEnsureIndex() {
    if (this._mktIndex) return;
    this._mktIndex = new Map();
    this._mktOrderCounts = new Map();
    const entries = await this.state.storage.list({ prefix: 'mkt_order:' });
    for (const [k, o] of entries) {
      if (!o || !o.id) continue;
      // v2.3.1178: converge crash leftovers instead of re-listing them.
      // Settlement and refund now credit BEFORE deleting the record
      // (rule 6 ordering, _duelEscrowSweep shape) -- so a crash between
      // the credit and the delete leaves a record whose payout is
      // already stamped.  Re-listing it would let it match or refund a
      // second time; the stamp check turns it into a delete instead.
      if ((await this._opSeen('settle:' + o.id + ':item')) ||
          (await this._opSeen('settle:' + o.id + ':gold')) ||
          (await this._opSeen('refund:' + o.id))) {
        await this.state.storage.delete(k);
        continue;
      }
      this._mktAddToIndex(o);
    }
  },

  _mktAddToIndex(o) {
    const key = this._mktIndexKey(o);
    if (!this._mktIndex.has(key)) this._mktIndex.set(key, { buys: [], sells: [] });
    const bucket = this._mktIndex.get(key);
    if (o.type === 'buy') {
      bucket.buys.push(o);
      bucket.buys.sort((a, b) => b.price - a.price);
    } else {
      bucket.sells.push(o);
      bucket.sells.sort((a, b) => a.price - b.price);
    }
    this._mktOrderCounts.set(o.playerId, (this._mktOrderCounts.get(o.playerId) || 0) + 1);
  },

  _mktRemoveFromIndex(o) {
    const key = this._mktIndexKey(o);
    const bucket = this._mktIndex.get(key);
    if (!bucket) return;
    if (o.type === 'buy') bucket.buys = bucket.buys.filter((x) => x.id !== o.id);
    else bucket.sells = bucket.sells.filter((x) => x.id !== o.id);
    if (bucket.buys.length === 0 && bucket.sells.length === 0) this._mktIndex.delete(key);
    const count = (this._mktOrderCounts.get(o.playerId) || 1) - 1;
    if (count <= 0) this._mktOrderCounts.delete(o.playerId);
    else this._mktOrderCounts.set(o.playerId, count);
  },

  // HTTP surface -- the outer worker routes /api/market/* here (same
  // room resolution as /ws, default brotown-1).  Endpoint paths and
  // response shapes match the old Marketplace DO so the client keeps
  // working; the additions are `settled: true` on mutating responses
  // (the client uses it to skip its legacy self-credit path -- old
  // workers without the flag still get the legacy behavior, keeping
  // both deploy orders safe) and GET /history.
  async _marketFetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/market', '');
    const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    try {
      await this._mktEnsureIndex();
      await this._mktSweep();

      if (request.method === 'GET' && path.startsWith('/orders')) {
        const orders = this._mktQueryOrders(url.searchParams.get('category'), url.searchParams.get('subtype'), url.searchParams.get('tier'), null, 100);
        return new Response(JSON.stringify({ ok: true, orders }), { headers: H });
      }
      if (request.method === 'GET' && path.startsWith('/my')) {
        const orders = this._mktQueryOrders(null, null, null, url.searchParams.get('playerId'), 100);
        return new Response(JSON.stringify({ ok: true, orders }), { headers: H });
      }
      if (request.method === 'GET' && path.startsWith('/history')) {
        const key = `${url.searchParams.get('category')}:${url.searchParams.get('subtype')}:${url.searchParams.get('tier')}:${url.searchParams.get('element1') || 'none'}:${url.searchParams.get('element2') || 'none'}`;
        const hist = (await this.state.storage.get('mkt_hist:' + key)) || [];
        const avg = hist.length ? Math.round(hist.reduce((s, h) => s + h.p, 0) / hist.length) : null;
        return new Response(JSON.stringify({ ok: true, history: hist, avg, last: hist.length ? hist[hist.length - 1].p : null }), { headers: H });
      }
      if (request.method === 'POST' && path.startsWith('/place')) {
        const body = await request.json();
        // v2.3.1178: playerId is public (broadcast in player_join /
        // track), so "is that player online" was never authentication
        // -- a forged place could escrow a VICTIM's stash weapon out
        // at 1g (live item theft).  The request must now carry the
        // claimed player's own session token (httpauth.js; legacy
        // clients ride the enforcement grace window there).
        if (!this._httpAuthCheck(body && body.playerId, request)) {
          return new Response(JSON.stringify({ ok: false, settled: true, error: 'Not authorized' }), { status: 403, headers: H });
        }
        const result = await this._mktPlaceOrder(body);
        return new Response(JSON.stringify(result), { headers: H });
      }
      if (request.method === 'DELETE' && path.startsWith('/cancel')) {
        // v2.3.1178: same token gate -- a forged cancel could delist a
        // victim's orders (refund lands with the victim, but the
        // delisting itself is griefing).
        if (!this._httpAuthCheck(url.searchParams.get('playerId'), request)) {
          return new Response(JSON.stringify({ ok: false, settled: true, error: 'Not authorized' }), { status: 403, headers: H });
        }
        const result = await this._mktCancelOrder(url.searchParams.get('id'), url.searchParams.get('playerId'));
        return new Response(JSON.stringify(result), { headers: H });
      }
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: H });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: H });
    }
  },

  _mktQueryOrders(category, subtype, tier, playerId, limit) {
    const results = [];
    for (const [, bucket] of this._mktIndex) {
      for (const o of [...bucket.buys, ...bucket.sells]) {
        if (category && o.category !== category) continue;
        if (subtype && o.subtype !== subtype) continue;
        if (tier && o.tierKey !== tier) continue;
        if (playerId && o.playerId !== playerId) continue;
        // Never leak the escrowed item blob shape beyond what the old
        // API exposed -- the wire shape is unchanged.
        results.push(o);
        if (results.length >= limit) return results;
      }
    }
    return results;
  },

  /* Place an order.  ESCROW AT PLACEMENT is the whole point:
   *   sell -> the weapon leaves the seller's stash NOW (taken from the
   *           server's own copy by stash index -- body.item is ignored,
   *           a forged blob buys nothing);
   *   buy  -> the gold leaves the buyer's coins NOW.
   * Placement requires the player to be ONLINE in this room (the UI is
   * in-game; it also means escrow always mutates live playerState, never
   * the lagging blob).  Settlement credits go through _creditPlayer so
   * the counterparty can be offline.  No cross-DO awaits anywhere. */
  async _mktPlaceOrder(body) {
    const { type, category, subtype, tierKey, element1, element2, price, tierLabel, playerName, playerId } = body || {};
    if (!type || !category || !subtype || !tierKey || !price || !playerId) return { ok: false, error: 'Missing fields' };
    const p = Math.floor(price);
    if (!(p >= 1 && p <= 999999)) return { ok: false, error: 'Invalid price' };
    if (type !== 'buy' && type !== 'sell') return { ok: false, error: 'Invalid type' };

    const ps = this.playerState[playerId];
    if (!ps) return { ok: false, error: 'Not in game' };

    if ((this._mktOrderCounts.get(playerId) || 0) >= MARKET.MAX_ORDERS_PER_PLAYER) {
      return { ok: false, error: 'Max 10 orders' };
    }

    // Escrow.
    let item = null;
    if (type === 'sell') {
      const idx = Math.floor(body.stashIndex);
      if (!Number.isFinite(idx) || idx < 0 || !Array.isArray(ps.weaponStash) || idx >= ps.weaponStash.length) {
        return { ok: false, error: 'Item not in stash' };
      }
      item = this._sanitizeWeapon(ps.weaponStash[idx]);
      if (!item) return { ok: false, error: 'Item not in stash' };
      ps.weaponStash.splice(idx, 1);
    } else {
      if ((ps.coins || 0) < p) return { ok: false, error: 'Not enough gold' };
      ps.coins -= p;
    }
    this._saveRpg(playerId, ps);
    this._queuePlayerStateFlush(playerId);

    const order = {
      id: crypto.randomUUID(), type, category, subtype, tierKey,
      element1: element1 || null, element2: element2 || null,
      price: p, item,
      tierLabel: tierLabel || tierKey, playerName: playerName || 'Unknown', playerId,
      ts: Date.now(), expires: Date.now() + MARKET.ORDER_EXPIRY,
    };

    // Match against the opposite bucket head (skip own orders -- direct
    // self-trades can neither dupe nor paint the price history).
    const bucket = this._mktIndex.get(this._mktIndexKey(order));
    let maker = null;
    if (bucket) {
      const oppList = type === 'buy' ? bucket.sells : bucket.buys;
      for (const o of oppList) {
        if (o.playerId === playerId) continue;
        if (type === 'buy' && o.price <= p) { maker = o; break; }
        if (type === 'sell' && o.price >= p) { maker = o; break; }
      }
    }

    if (maker) {
      this._mktRemoveFromIndex(maker);
      const execPrice = maker.price; // resting order sets the price
      const buyerId = type === 'buy' ? playerId : maker.playerId;
      const sellerId = type === 'buy' ? maker.playerId : playerId;
      const weapon = type === 'buy' ? maker.item : order.item;
      const label = order.tierLabel + ' ' + order.subtype;
      // Seller is paid the execution price; buyer receives the weapon.
      // Taker-buy price improvement (bid > resting ask) refunds the
      // difference -- the buyer escrowed their own bid above.
      //
      // v2.3.1178: credit FIRST, delete the escrow record LAST (rule 6
      // ordering; _resolveDuel/_duelEscrowSweep are the reference).
      // This used to delete 'mkt_order:<maker.id>' before any credit
      // was stamped, so a deploy landing in between destroyed BOTH
      // sides' escrow with nothing left for any sweep to repair.  The
      // stamps are also keyed on maker.id now (the PERSISTED record)
      // instead of the taker's never-stored UUID, so a crash between
      // credit and delete converges on the next index rebuild
      // (stamp seen -> delete, never re-list / never refund on top).
      // The weapon leg settles first: it's the unique, irreplaceable
      // half of the trade.
      await this._creditPlayer(buyerId, { opId: 'settle:' + maker.id + ':item', source: 'market', kind: 'weapon', payload: { weapon }, note: label + ' bought' });
      await this._creditPlayer(sellerId, { opId: 'settle:' + maker.id + ':gold', source: 'market', kind: 'gold', payload: { amount: execPrice }, note: label + ' sold' });
      if (type === 'buy' && p > execPrice) {
        await this._creditPlayer(buyerId, { opId: 'settle:' + maker.id + ':diff', source: 'market', kind: 'gold', payload: { amount: p - execPrice }, note: 'price improvement' });
      }
      await this.state.storage.delete('mkt_order:' + maker.id);
      await this._mktRecordPrice(this._mktIndexKey(order), execPrice);
      return { ok: true, settled: true, matched: true, execPrice, matchedOrder: maker, newOrder: order };
    }

    this._mktAddToIndex(order);
    await this.state.storage.put('mkt_order:' + order.id, order);
    return { ok: true, settled: true, matched: false, order };
  },

  async _mktCancelOrder(orderId, playerId) {
    if (!orderId || !playerId) return { ok: false, error: 'Missing params' };
    const order = await this.state.storage.get('mkt_order:' + orderId);
    if (!order) return { ok: false, error: 'Not found' };
    if (order.playerId !== playerId) return { ok: false, error: 'Not yours' };
    this._mktRemoveFromIndex(order);
    // v2.3.1178: refund BEFORE delete (rule 6 ordering) -- the old
    // delete-first order meant a deploy between the two destroyed the
    // escrow with no surviving record for anything to retry against.
    // The refund opId makes the credit idempotent; the converse crash
    // (refund stamped, record survives) is converged by the stamp
    // check in _mktEnsureIndex.
    await this._mktRefund(order, 'order cancelled');
    await this.state.storage.delete('mkt_order:' + orderId);
    return { ok: true, settled: true, cancelled: order };
  },

  // Return the escrow.  opId 'refund:<orderId>' makes cancel racing
  // expiry (or a crash between credit and delete being retried) pay
  // exactly once.  The OLD sweep deleted sell orders WITHOUT refunding
  // -- under escrow that would be item destruction, so expiry and
  // cancel both land here.
  async _mktRefund(order, why) {
    // v2.3.1178: rule 6 -- never refund over a stamped payout.  A
    // record that survived a crash after its match settled (credit
    // stamped, delete lost) must not ALSO refund its escrow.
    if ((await this._opSeen('settle:' + order.id + ':item')) ||
        (await this._opSeen('settle:' + order.id + ':gold'))) return;
    if (order.type === 'buy') {
      await this._creditPlayer(order.playerId, { opId: 'refund:' + order.id, source: 'market', kind: 'gold', payload: { amount: order.price }, note: why });
    } else if (order.item) {
      await this._creditPlayer(order.playerId, { opId: 'refund:' + order.id, source: 'market', kind: 'weapon', payload: { weapon: order.item }, note: why });
    }
  },

  async _mktSweep() {
    const now = Date.now();
    if (this._mktLastSweep && now - this._mktLastSweep < MARKET.SWEEP_INTERVAL) return;
    this._mktLastSweep = now;
    const expired = [];
    for (const [, bucket] of this._mktIndex) {
      for (const o of [...bucket.buys, ...bucket.sells]) {
        if (o.expires <= now) expired.push(o);
      }
    }
    for (const o of expired) {
      this._mktRemoveFromIndex(o);
      // v2.3.1178: refund before delete, same as cancel.
      await this._mktRefund(o, 'listing expired');
      await this.state.storage.delete('mkt_order:' + o.id);
    }
  },

  async _mktRecordPrice(indexKey, price) {
    const key = 'mkt_hist:' + indexKey;
    const hist = (await this.state.storage.get(key)) || [];
    hist.push({ p: price, ts: Date.now() });
    if (hist.length > MARKET.PRICE_HIST_CAP) hist.splice(0, hist.length - MARKET.PRICE_HIST_CAP);
    await this.state.storage.put(key, hist);
  },
};
