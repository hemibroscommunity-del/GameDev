/* ═══ v2.3.5609: THE ROOM'S PUBLIC READS, KEPT AND PACED (card OPS PR 10; red team RT-1 N8) ═══
 *
 * Three reads anyone may make wake the room's one thread and walk a whole
 * book every time: the market's orders (`/api/market/orders`, market.js
 * _mktQueryOrders over every bucket, after its sweep), the store's browse
 * (`/api/store/browse`, store.js _stBrowse, after its sweep) and the arena's
 * status (`/api/arena/status`, gladiator.js).  No key, no session: a script
 * asking 400 times a second took 400 walks a second off the 120 playing.
 *
 * With `publicreads` on (the default):
 *   - KEPT: each answer (its path and query, whole) is kept KEEP_MS and
 *     served again, never walked; at most MAX_KEPT answers, the oldest out;
 *   - FRESH WHERE IT MATTERS: any request to the same surface that is not a
 *     read (a place, a buy, a cancel, a list, a bid, a join, a leave) drops
 *     every answer kept for it, before and after it runs, so the player who
 *     just acted reads their own act at once (and a read begun before the
 *     write is not kept after it); a change the room makes by
 *     itself (an order expiring, an arena round moving on, a store offer
 *     taken over the socket) shows within KEEP_MS;
 *   - PACED: a read that would wake the room (not kept) counts against its
 *     address (flood.js requestIp: Cloudflare's stamp; absent locally and
 *     loopback never counted); past PER_S in one second, 429 with
 *     `Retry-After: 1`.  A kept answer is never refused: a phone polling the
 *     same read is served the kept one, however often it asks.
 * Reads only: nothing a player owns changes because of it, and every
 * answer's shape is the room's own.  Nothing is written.
 *
 * KILL SWITCH `publicreads: false` in the live flags: every read walks its
 * book, as before; nothing kept, nothing counted.
 */
import { requestIp } from './flood.js';

export const PUBLIC_READS = Object.freeze({
  FLAG: 'publicreads',
  KEEP_MS: 3000,
  PER_S: 10,
  MAX_KEPT: 256,
  MAX_ADDRS: 4096,   /* addresses counted in one second at most (a new second starts empty) */
  /* the surfaces, and the reads on them that are kept (the handlers match by prefix) */
  SURFACES: Object.freeze({
    '/api/market': '/api/market/orders',
    '/api/store': '/api/store/browse',
    '/api/arena': '/api/arena/status',
  }),
});

/** `publicreads: false` in the live flags: off.  Unset or anything else: on. */
export function publicReadsOff(room) {
  const f = room && room._liveFlags;
  return !!(f && typeof f === 'object' && f[PUBLIC_READS.FLAG] === false);
}

/** The surface a path is on ('/api/market', ...), or null. */
export function surfaceOf(pathname) {
  for (const s of Object.keys(PUBLIC_READS.SURFACES)) if (pathname === s || pathname.startsWith(s + '/')) return s;
  return null;
}

const H = Object.freeze({ 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });

export const publicReadMethods = {
  _prMem() {
    if (!this._pr) this._pr = { kept: new Map(), sec: 0, addrs: new Map(), gen: Object.create(null) };
    return this._pr;
  },

  /** Every answer kept for a surface, dropped (a write on it). */
  _prDrop(surface) {
    const m = this._prMem();
    m.gen[surface] = (m.gen[surface] || 0) + 1;   /* a read begun before it is not kept after it */
    for (const k of [...m.kept.keys()]) if (k.startsWith(surface + '/')) m.kept.delete(k);
  },

  /** true when this address has woken the room PER_S times this second. */
  _prOver(request, now) {
    const ip = requestIp(request);
    if (!ip) return false;
    const m = this._prMem();
    const sec = Math.floor(now / 1000);
    if (sec !== m.sec) { m.sec = sec; m.addrs.clear(); }
    const n = (m.addrs.get(ip) || 0) + 1;
    if (n > PUBLIC_READS.PER_S) return true;
    if (m.addrs.size < PUBLIC_READS.MAX_ADDRS || m.addrs.has(ip)) m.addrs.set(ip, n);
    return false;
  },

  /** index.js, for the three surfaces: `serve` is the surface's own fetch.
   *  Kept, paced, or passed through. */
  async _publicReadDo(request, url, serve) {
    if (publicReadsOff(this)) return serve();
    const surface = surfaceOf(url.pathname);
    if (!surface) return serve();
    if (request.method !== 'GET') {
      /* a write on the surface: nothing kept for it survives it */
      this._prDrop(surface);
      try { return await serve(); } finally { this._prDrop(surface); }
    }
    const read = PUBLIC_READS.SURFACES[surface];
    if (!url.pathname.startsWith(read)) return serve();
    const now = Date.now();
    const m = this._prMem();
    const key = url.pathname + url.search;
    const kept = m.kept.get(key);
    if (kept && now - kept.at < PUBLIC_READS.KEEP_MS) {
      return new Response(kept.body, { status: kept.status, headers: H });
    }
    if (this._prOver(request, now)) {
      return new Response(JSON.stringify({ ok: false, error: 'Too many requests' }), {
        status: 429, headers: { ...H, 'Retry-After': '1' },
      });
    }
    const gen = m.gen[surface] || 0;
    const res = await serve();
    if (!res || res.status !== 200) return res;
    const body = await res.text();
    if ((m.gen[surface] || 0) === gen) {   /* no write on the surface while it was read */
      m.kept.delete(key);
      m.kept.set(key, { at: now, status: res.status, body });
    }
    while (m.kept.size > PUBLIC_READS.MAX_KEPT) m.kept.delete(m.kept.keys().next().value);
    return new Response(body, { status: res.status, headers: H });
  },
};
