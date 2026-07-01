/* v2.3.1106: extracted VERBATIM from index.js (P4 decomposition, slice 1).
   Behavior-frozen move -- do not edit logic in the same commit as a move.
   The class stays re-exported from index.js so the wrangler Durable
   Object bindings (class_name in wrangler.toml) keep resolving. */

// ═══════════════════════════════════════
//  MARKETPLACE — Global persistent order book (§39.4 indexed)
//  Composite index: category:subtype:tierKey:element1:element2
//  Buy orders sorted descending by price, sell orders ascending.
//  Matching is O(1) against bucket head.
// ═══════════════════════════════════════

export class Marketplace {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.index = null; // In-memory index, lazy-loaded
    this.playerOrderCounts = null; // playerId -> count
    this.SWEEP_INTERVAL = 60000;
    this.ORDER_EXPIRY = 3600000;
    this.MAX_ORDERS_PER_PLAYER = 10;
  }

  // §39.4 — Composite index key
  _indexKey(o) {
    return `${o.category}:${o.subtype}:${o.tierKey}:${o.element1 || 'none'}:${o.element2 || 'none'}`;
  }

  // Load full index from storage into memory (once per DO wake)
  async _ensureIndex() {
    if (this.index) return;
    this.index = new Map();
    this.playerOrderCounts = new Map();
    const now = Date.now();
    const entries = await this.state.storage.list({ prefix: 'order:' });
    const expired = [];
    for (const [key, raw] of entries) {
      let o;
      try { o = JSON.parse(raw); } catch { expired.push(key); continue; }
      if (o.expires <= now) { expired.push(key); continue; }
      this._addToIndex(o);
    }
    if (expired.length) await this.state.storage.delete(expired);
  }

  _addToIndex(o) {
    const key = this._indexKey(o);
    if (!this.index.has(key)) this.index.set(key, { buys: [], sells: [] });
    const bucket = this.index.get(key);
    if (o.type === 'buy') {
      bucket.buys.push(o);
      bucket.buys.sort((a, b) => b.price - a.price); // highest bid first
    } else {
      bucket.sells.push(o);
      bucket.sells.sort((a, b) => a.price - b.price); // lowest ask first
    }
    this.playerOrderCounts.set(o.playerId, (this.playerOrderCounts.get(o.playerId) || 0) + 1);
  }

  _removeFromIndex(o) {
    const key = this._indexKey(o);
    const bucket = this.index.get(key);
    if (!bucket) return;
    if (o.type === 'buy') {
      bucket.buys = bucket.buys.filter(x => x.id !== o.id);
    } else {
      bucket.sells = bucket.sells.filter(x => x.id !== o.id);
    }
    if (bucket.buys.length === 0 && bucket.sells.length === 0) this.index.delete(key);
    const count = (this.playerOrderCounts.get(o.playerId) || 1) - 1;
    if (count <= 0) this.playerOrderCounts.delete(o.playerId);
    else this.playerOrderCounts.set(o.playerId, count);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/market', '');
    const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

    try {
      await this._ensureIndex();
      await this._lazySweep();

      // GET /orders?category=weapon&subtype=greatsword&tier=iron
      if (request.method === 'GET' && path.startsWith('/orders')) {
        const category = url.searchParams.get('category');
        const subtype = url.searchParams.get('subtype');
        const tier = url.searchParams.get('tier');
        const orders = this._queryOrders(category, subtype, tier, null, 100);
        return new Response(JSON.stringify({ ok: true, orders }), { headers: H });
      }

      // POST /place — place buy or sell order
      if (request.method === 'POST' && path.startsWith('/place')) {
        const body = await request.json();
        const result = await this.placeOrder(body);
        return new Response(JSON.stringify(result), { headers: H });
      }

      // DELETE /cancel?id=X&playerId=Y
      if (request.method === 'DELETE' && path.startsWith('/cancel')) {
        const orderId = url.searchParams.get('id');
        const playerId = url.searchParams.get('playerId');
        const result = await this.cancelOrder(orderId, playerId);
        return new Response(JSON.stringify(result), { headers: H });
      }

      // GET /my?playerId=X
      if (request.method === 'GET' && path.startsWith('/my')) {
        const playerId = url.searchParams.get('playerId');
        const orders = this._queryOrders(null, null, null, playerId, 100);
        return new Response(JSON.stringify({ ok: true, orders }), { headers: H });
      }

      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: H });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: H });
    }
  }

  // §39.4 — Query using index. If category+subtype+tier all specified, direct bucket lookup.
  // Otherwise scan relevant buckets with filtering.
  _queryOrders(category, subtype, tier, playerId, limit) {
    const results = [];
    for (const [, bucket] of this.index) {
      const all = [...bucket.buys, ...bucket.sells];
      for (const o of all) {
        if (category && o.category !== category) continue;
        if (subtype && o.subtype !== subtype) continue;
        if (tier && o.tierKey !== tier) continue;
        if (playerId && o.playerId !== playerId) continue;
        results.push(o);
        if (results.length >= limit) return results;
      }
    }
    return results;
  }

  async placeOrder(body) {
    const { type, category, subtype, tierKey, element1, element2, price, item, tierLabel, playerName, playerId } = body;
    if (!type || !category || !subtype || !tierKey || !price || !playerId) return { ok: false, error: 'Missing fields' };
    if (price < 1 || price > 999999) return { ok: false, error: 'Invalid price' };
    if (type !== 'buy' && type !== 'sell') return { ok: false, error: 'Invalid type' };
    if (type === 'sell' && !item) return { ok: false, error: 'Sell needs item' };

    // Rate limit — O(1) lookup from in-memory count
    const currentCount = this.playerOrderCounts.get(playerId) || 0;
    if (currentCount >= this.MAX_ORDERS_PER_PLAYER) return { ok: false, error: 'Max 10 orders' };

    const order = {
      id: crypto.randomUUID(), type, category, subtype, tierKey,
      element1: element1 || null, element2: element2 || null,
      price: Math.floor(price), item: type === 'sell' ? item : null,
      tierLabel: tierLabel || tierKey, playerName: playerName || 'Unknown', playerId,
      ts: Date.now(), expires: Date.now() + this.ORDER_EXPIRY,
    };

    // §39.4 — O(1) match against bucket head
    const key = this._indexKey(order);
    const bucket = this.index.get(key);
    let best = null;

    if (bucket) {
      const oppList = type === 'buy' ? bucket.sells : bucket.buys;
      // Check head of opposite sorted array
      for (let i = 0; i < oppList.length; i++) {
        const o = oppList[i];
        if (o.playerId === playerId) continue; // can't self-trade
        if (type === 'buy' && o.price <= price) { best = o; break; }
        if (type === 'sell' && o.price >= price) { best = o; break; }
      }
    }

    if (best) {
      // Match found — execute trade
      this._removeFromIndex(best);
      await this.state.storage.delete('order:' + best.id);
      return { ok: true, matched: true, execPrice: best.price, matchedOrder: best, newOrder: order };
    }

    // No match — add to book
    this._addToIndex(order);
    await this.state.storage.put('order:' + order.id, JSON.stringify(order));
    return { ok: true, matched: false, order };
  }

  async cancelOrder(orderId, playerId) {
    if (!orderId || !playerId) return { ok: false, error: 'Missing params' };
    const raw = await this.state.storage.get('order:' + orderId);
    if (!raw) return { ok: false, error: 'Not found' };
    const order = JSON.parse(raw);
    if (order.playerId !== playerId) return { ok: false, error: 'Not yours' };
    this._removeFromIndex(order);
    await this.state.storage.delete('order:' + orderId);
    return { ok: true, cancelled: order };
  }

  // §39.4 — Lazy expiry sweep (once per minute)
  async _lazySweep() {
    const lp = await this.state.storage.get('_lastPurge') || 0;
    if (Date.now() - lp < this.SWEEP_INTERVAL) return;
    const now = Date.now();
    const toDelete = [];
    for (const [, bucket] of this.index) {
      for (const o of [...bucket.buys, ...bucket.sells]) {
        if (o.expires <= now) toDelete.push(o);
      }
    }
    for (const o of toDelete) {
      this._removeFromIndex(o);
      await this.state.storage.delete('order:' + o.id);
    }
    await this.state.storage.put('_lastPurge', Date.now());
  }
}
