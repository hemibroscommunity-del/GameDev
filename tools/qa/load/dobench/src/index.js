/* ═══ v2.3.3208: WHAT A MESSAGE BETWEEN TWO SERVERS COSTS (local only) ═══
 *
 * docs/SERVER-SPLIT-PLAN.md plans front doors (Durable Objects holding the
 * phones' sockets) talking to one world (another Durable Object).  This
 * worker times the three ways a message can reach the world, run by
 * drive.mjs under `wrangler dev --local` with wrangler's tracing off:
 *   - a JS RPC call from a Door to the World (`world.batch(payload)`), one at
 *     a time (rpc-seq) or 64 in flight (rpc);
 *   - a message on a socket the Door opened to the World (ws);
 *   - a phone's message on its own socket (drive.mjs, compressed or plain).
 * Locally both objects share one thread, so read the numbers as relative.
 * Cloudflare BILLS a call as one request, a socket message in at 20 to a
 * request (docs/SERVER-SPLIT-PLAN.md, "Cloudflare's facts").
 */
import { DurableObject } from 'cloudflare:workers';

export class World extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.n = 0; this.bytes = 0; this.parse = false; this.t0 = 0; this.tLast = 0; }
  reset(parse) { this.n = 0; this.bytes = 0; this.parse = !!parse; this.t0 = 0; this.tLast = 0; return true; }
  stats() { return { n: this.n, bytes: this.bytes, ms: this.tLast - this.t0 }; }
  _got(msg) {
    if (!this.n) this.t0 = Date.now();
    this.n++; this.bytes += typeof msg === 'string' ? msg.length : msg.byteLength;
    if (this.parse && typeof msg === 'string') JSON.parse(msg);
    this.tLast = Date.now();
  }
  // RPC: one call carries one payload (already structured-cloned)
  batch(payload) {
    if (!this.n) this.t0 = Date.now();
    this.n++; this.bytes += payload.s ? payload.s.length : 0;
    if (this.parse && payload.s) JSON.parse(payload.s);
    this.tLast = Date.now();
    return this.n;
  }
  async fetch(req) {
    const url = new URL(req.url);
    if (req.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1]);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    if (url.pathname === '/reset') { this.reset(url.searchParams.get('parse') === '1'); return new Response('ok'); }
    if (url.pathname === '/stats') return Response.json(this.stats());
    return new Response('world');
  }
  webSocketMessage(ws, msg) { this._got(msg); }
  webSocketClose() {}
}

export class Door extends DurableObject {
  async fetch(req) {
    const url = new URL(req.url);
    const n = +(url.searchParams.get('n') || 1000);
    const size = +(url.searchParams.get('size') || 100);
    const mode = url.searchParams.get('mode') || 'rpc';
    const parse = url.searchParams.get('parse') === '1';
    const s = JSON.stringify({ t: 'b', d: 'x'.repeat(Math.max(0, size - 20)) });
    const world = this.env.WORLD.get(this.env.WORLD.idFromName('w'));
    await world.reset(parse);
    const t0 = Date.now();
    if (mode === 'rpc-seq') {
      for (let i = 0; i < n; i++) await world.batch({ s });
    } else if (mode === 'rpc') {
      // pipelined: up to 64 in flight
      let inflight = [];
      for (let i = 0; i < n; i++) {
        inflight.push(world.batch({ s }));
        if (inflight.length >= 64) { await Promise.all(inflight); inflight = []; }
      }
      await Promise.all(inflight);
    } else if (mode === 'ws') {
      const resp = await world.fetch('http://w/ws', { headers: { Upgrade: 'websocket' } });
      const ws = resp.webSocket; ws.accept();
      for (let i = 0; i < n; i++) ws.send(s);
      // wait until the world has them all
      for (let k = 0; k < 2000; k++) {
        const st = await world.stats();
        if (st.n >= n) break;
        await new Promise((r) => setTimeout(r, 5));
      }
      ws.close();
    }
    const st = await world.stats();
    const ms = Date.now() - t0;
    return Response.json({ mode, n, size: s.length, parse, wallMs: ms, perMsgUs: (1000 * ms) / n, worldGot: st.n, worldSpanMs: st.ms });
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/world')) {
      const stub = env.WORLD.get(env.WORLD.idFromName('w'));
      return stub.fetch(new Request('http://w' + url.pathname.slice(6) + url.search, req));
    }
    if (url.pathname.startsWith('/door')) {
      const stub = env.DOOR.get(env.DOOR.idFromName('d' + (url.searchParams.get('door') || '0')));
      return stub.fetch(req);
    }
    return new Response('dobench');
  },
};
