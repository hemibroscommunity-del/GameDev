/* ═══ v2.3.3247: THE CLOUDFLARE LAB WORKER ("brotown-lab") ═══
 *
 * docs/specs/cloudflare-lab.md.  The server split plan's lab
 * (docs/SERVER-SPLIT-PLAN.md, "Decided" 2 and "Risks and unknowns" 1-3): what
 * only Cloudflare can tell, measured on Cloudflare by tools/lab/run.mjs from a
 * GitHub runner, before anything is built on it.
 *
 *   - Burner: a fixed amount of work.  Do 8 Durable Objects of one script
 *     run it side by side, or does one wait for another (one machine, one
 *     isolate, one thread)?  The runner times K of them at once against one;
 *     each says which isolate it ran in (`isolate`, made once per isolate) and
 *     where (`colo`, from Cloudflare's own trace page).  Workers freeze the
 *     clock between I/O, so the work is a fixed loop and the timing is the
 *     runner's.
 *   - World and Door: two objects talking, as the plan's doors would to the
 *     world.  A Door opens a socket to the World (the World takes it with the
 *     hibernation API, `hib=1`, or the plain one) or calls it (JS RPC), and
 *     times round trips one at a time (`rtt-*`) and a flood of messages one way
 *     (`flood-*`).  How Cloudflare BILLS the socket's messages is read off the
 *     account's own figures afterwards (run.mjs, GraphQL).
 *
 * It stores nothing.  Every path but "/" needs this run's key (LAB_KEY, made
 * by the workflow and passed with --var), so nobody else can make it work in
 * the ten minutes it exists.  Never the game: a worker of its own name,
 * deployed and deleted by .github/workflows/lab.yml only.
 */
import { DurableObject } from 'cloudflare:workers';

/* made on first use, not at load (Workers refuse random numbers in global
   scope); every object in one isolate sees the same one */
let ISOLATE = null;
const isolateId = () => ISOLATE || (ISOLATE = Math.random().toString(36).slice(2, 10));

const clamp = (v, lo, hi, d) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.floor(v))) : d);

/* the work: an xorshift loop the optimiser cannot skip (its result is sent back) */
function burn(iters) {
  let x = 0x9e3779b9 | 0;
  for (let i = 0; i < iters; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; }
  return x;
}

/* where this object runs: Cloudflare's trace page names the data centre */
async function coloOf(self) {
  if (self._colo !== undefined) return self._colo;
  self._colo = null;
  try {
    const t = await (await fetch('https://www.cloudflare.com/cdn-cgi/trace')).text();
    const m = t.match(/^colo=(\w+)$/m);
    self._colo = m ? m[1] : null;
  } catch { /* unknown */ }
  return self._colo;
}

function pct(arr, p) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}
const summary = (arr) => ({ n: arr.length, p50: pct(arr, 50), p95: pct(arr, 95), p99: pct(arr, 99), max: arr.length ? Math.max(...arr) : null, mean: arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null });

export class Burner extends DurableObject {
  async fetch(req) {
    const url = new URL(req.url);
    const iters = clamp(+url.searchParams.get('iters'), 0, 3e9, 0);
    const colo = await coloOf(this);
    const x = burn(iters);
    return Response.json({ isolate: isolateId(), id: this.ctx.id.toString().slice(0, 12), colo, iters, x });
  }
}

export class World extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.n = 0; this.bytes = 0; this.echo = false;
  }
  reset(echo) { this.n = 0; this.bytes = 0; this.echo = !!echo; return true; }
  stats() { return { n: this.n, bytes: this.bytes }; }
  /* RPC: one call, one answer */
  ping(i) { return i; }
  /* RPC: one call carrying one message */
  batch(payload) { this.n++; this.bytes += payload && payload.s ? payload.s.length : 0; return this.n; }
  _msg(ws, msg) {
    this.n++;
    this.bytes += typeof msg === 'string' ? msg.length : msg.byteLength;
    if (this.echo) ws.send(msg);
  }
  async fetch(req) {
    const url = new URL(req.url);
    if (req.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      if (url.searchParams.get('hib') === '1') {
        this.ctx.acceptWebSocket(pair[1]);   /* the game's own way (index.js) */
      } else {
        const s = pair[1];
        s.accept();
        s.addEventListener('message', (ev) => this._msg(s, ev.data));
      }
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    return Response.json({ isolate: isolateId(), colo: await coloOf(this) });
  }
  webSocketMessage(ws, msg) { this._msg(ws, msg); }
  webSocketClose(ws) { try { ws.close(); } catch { /* gone */ } }
}

export class Door extends DurableObject {
  async _open(world, hib) {
    const resp = await world.fetch('http://w/ws?hib=' + (hib ? 1 : 0), { headers: { Upgrade: 'websocket' } });
    const ws = resp.webSocket;
    if (!ws) throw new Error('no socket: ' + resp.status);
    ws.accept();
    return ws;
  }

  async fetch(req) {
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') || 'rtt-rpc';
    const n = clamp(+url.searchParams.get('n'), 1, 200000, 100);
    const size = clamp(+url.searchParams.get('size'), 2, 65536, 100);
    const hib = url.searchParams.get('hib') === '1';
    const world = this.env.WORLD.get(this.env.WORLD.idFromName(url.searchParams.get('world') || 'w'));
    const where = { door: await coloOf(this), world: (await (await world.fetch('http://w/where')).json()).colo };
    const out = { mode, n, hib, where, isolate: isolateId() };

    if (mode === 'rtt-rpc') {
      await world.reset(false);
      const rtt = [];
      for (let i = 0; i < n; i++) { const t = Date.now(); await world.ping(i); rtt.push(Date.now() - t); }
      out.rttMs = summary(rtt);
    } else if (mode === 'rtt-ws') {
      await world.reset(true);
      const ws = await this._open(world, hib);
      let wake = null;
      ws.addEventListener('message', () => { if (wake) { const w = wake; wake = null; w(); } });
      const rtt = [];
      for (let i = 0; i < n; i++) {
        const t = Date.now();
        const got = new Promise((res) => { wake = res; });
        ws.send(String(i));
        await got;
        rtt.push(Date.now() - t);
      }
      try { ws.close(); } catch { /* gone */ }
      out.rttMs = summary(rtt);
    } else if (mode === 'flood-ws' || mode === 'flood-rpc') {
      const s = JSON.stringify({ t: 'b', d: 'x'.repeat(Math.max(0, size - 18)) });
      await world.reset(false);
      const t0 = Date.now();
      if (mode === 'flood-ws') {
        const ws = await this._open(world, hib);
        for (let i = 0; i < n; i++) ws.send(s);
        let st = { n: 0 };
        for (let k = 0; k < 6000 && st.n < n; k++) {
          st = await world.stats();
          if (st.n < n) await new Promise((r) => setTimeout(r, 5));
        }
        try { ws.close(); } catch { /* gone */ }
        out.worldGot = st.n;
      } else {
        let inflight = [];
        for (let i = 0; i < n; i++) {
          inflight.push(world.batch({ s }));
          if (inflight.length >= 64) { await Promise.all(inflight); inflight = []; }
        }
        await Promise.all(inflight);
        out.worldGot = (await world.stats()).n;
      }
      out.size = s.length;
      out.wallMs = Date.now() - t0;
      out.usPerMsg = +((1000 * out.wallMs) / n).toFixed(2);
    } else {
      return new Response('unknown mode', { status: 400 });
    }
    return Response.json(out);
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/') return new Response('brotown-lab');
    if (!env.LAB_KEY || req.headers.get('x-lab-key') !== env.LAB_KEY) return new Response('forbidden', { status: 403 });
    const colo = (req.cf && req.cf.colo) || null;
    if (url.pathname === '/whoami') return Response.json({ isolate: isolateId(), colo });
    if (url.pathname === '/burn') {
      const name = (url.searchParams.get('name') || 'b0').slice(0, 64);
      const stub = env.BURNER.get(env.BURNER.idFromName(name));
      const j = await (await stub.fetch('http://b/burn' + url.search)).json();
      return Response.json(Object.assign(j, { entry: colo, workerIsolate: isolateId() }));
    }
    if (url.pathname === '/door') {
      const name = (url.searchParams.get('door') || 'd0').slice(0, 64);
      const stub = env.DOOR.get(env.DOOR.idFromName(name));
      return stub.fetch('http://d/door' + url.search);
    }
    return new Response('not found', { status: 404 });
  },
};
