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
 *   - Vault (v2.3.5288, card R PR 9): THE ROOM'S WAY BACK, TRIED.  A few
 *     characters' records of its own (`rpg:bp_lab_<n>`), changed by the
 *     GAME's own gold door (server/src/gold.js) and counted by the game's own
 *     world's sum (server/src/worldsum.js), put back to an earlier time by the
 *     game's own lever (server/src/restore.js rewindPlan, rewindDo) through
 *     Cloudflare's point-in-time recovery -- which `wrangler dev --local`
 *     does not have.  run.mjs --restore drives it (docs/specs/cloudflare-
 *     lab.md, "The restore try").
 *
 * It stores nothing but the Vault's few records, deleted with the worker.
 * Every path but "/" needs this run's key (LAB_KEY, made by the workflow and
 * passed with --var), so nobody else can make it work in the minutes it
 * exists.  Never the game: a worker of its own name, deployed and deleted by
 * .github/workflows/lab.yml only.
 */
import { DurableObject } from 'cloudflare:workers';
/* v2.3.5288: the game's own code, for the Vault (wrangler bundles it; none
   of it reaches the game's object or storage) */
import { rewindPlan, rewindDo } from '../../../server/src/restore.js';
import { worldCtx, worldAdd } from '../../../server/src/worldsum.js';
import { goldMethods } from '../../../server/src/gold.js';

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
  /* v2.3.3257: never more than 3 s, and not at all on `wrangler dev --local`
     (run.mjs --local passes LAB_LOCAL): with no way out to the internet the
     lookup hung there until the runner gave up on the request (300 s) */
  if (self.env && self.env.LAB_LOCAL) return self._colo;
  try {
    const t = await (await fetch('https://www.cloudflare.com/cdn-cgi/trace', { signal: AbortSignal.timeout(3000) })).text();
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
      /* v2.3.3257: the limit test (run.mjs --limit) floods one World in
         steps: `keep` leaves its count as it was, so it counts them all */
      const keep = url.searchParams.get('keep') === '1';
      const base = keep ? (await world.stats()).n : 0;
      if (!keep) await world.reset(false);
      const t0 = Date.now();
      if (mode === 'flood-ws') {
        const ws = await this._open(world, hib);
        for (let i = 0; i < n; i++) ws.send(s);
        let st = { n: base };
        /* v2.3.3257: every look is a call, and every call a billed request --
           on the free plan from a daily 100,000 the game shares -- so look
           every `poll` ms (50 from run.mjs; it was 5, hundreds of calls a
           flood), and give up after 30 s */
        const poll = clamp(+url.searchParams.get('poll'), 5, 1000, 50);
        for (let k = 0, most = Math.ceil(30000 / poll); k < most && st.n - base < n; k++) {
          st = await world.stats();
          if (st.n - base < n) await new Promise((r) => setTimeout(r, poll));
        }
        try { ws.close(); } catch { /* gone */ }
        out.worldGot = st.n - base;
        out.worldTotal = st.n;
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
      /* v2.3.3257: which World took it, so run.mjs can read that object's own
         CPU from the account's figures (a hibernation message cost 4x a plain
         one's time on Cloudflare: the World's CPU says whether it is CPU) */
      out.worldId = world.id.toString();
    } else {
      return new Response('unknown mode', { status: 400 });
    }
    return Response.json(out);
  }
}

/* ═══ v2.3.5288: THE VAULT -- the room's way back, tried on Cloudflare ═══
   A room of its own for the game's rewind: `this.state` is its own state, as
   a GameRoom's is, so restore.js runs on it unchanged (no sockets, no
   players: it closes nothing).  One request an op:
     seed   N characters, 1000 gold each, in one put
     play   a step of the game's roads on them, each step ONE put of every
            record it changed (the plan's rule 5): a mint (quest_reward), a
            burn (farm_buy), a move between two (trade_window, mail_gold)
     count  the world's sum of its records, and each purse
     plan   rewindPlan: {at} or {bookmark} (the dry run)
     do     rewindDo: {token, confirm} (the object restarts a moment after) */
const VAULT = Object.freeze({ N_MAX: 32, PREFIX: 'rpg:bp_lab_' });
const vaultRec = () => ({ coins: 1000, inventory: {}, _econ: { v: 1, g: { m: 0, b: 0 }, i: {} } });
export class Vault extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.state = ctx;            /* what restore.js reads: state.storage, state.abort */
    this._liveFlags = { roomrewind: true };   /* the lab's own room: its way back switched on (the game's is OFF until the owner says) */
    /* the game's gold door on these records: no day's book (a lab has none) */
    this.door = Object.assign({ _liveFlags: {}, _daybookOff: () => true }, goldMethods);
  }
  async _all() {
    const m = await this.ctx.storage.list({ prefix: VAULT.PREFIX });
    return m;
  }
  async _count() {
    const recs = await this._all();
    const c = worldCtx();
    const purses = {};
    for (const [k, v] of recs) { worldAdd(c, k, v); purses[k.slice(VAULT.PREFIX.length)] = v && v.coins; }
    return { gold: c.gold, goods: c.goods, net: c.net, purses, records: recs.size, now: Date.now() };
  }
  async fetch(req) {
    const url = new URL(req.url);
    const q = (k) => url.searchParams.get(k);
    const op = q('op');
    if (op === 'seed') {
      const n = clamp(+q('n'), 2, VAULT.N_MAX, 8);
      const all = {};
      for (let i = 0; i < n; i++) all[VAULT.PREFIX + i] = vaultRec();
      await this.ctx.storage.put(all);
      return Response.json(await this._count());
    }
    if (op === 'play') {
      const step = clamp(+q('step'), 0, 1e6, 0);
      const recs = await this._all();
      const keys = [...recs.keys()].sort();
      if (keys.length < 2) return Response.json({ error: 'seed first' }, { status: 400 });
      const a = keys[step % keys.length], b = keys[(step + 1) % keys.length];
      const A = recs.get(a), B = recs.get(b);
      this.door._goldGive(A, 100 + step, 'quest_reward');     /* a mint */
      this.door._goldTake(B, 20, 'farm_buy');                 /* a burn */
      this.door._goldTake(A, 50, 'trade_window');             /* a move: A's side... */
      this.door._goldGive(B, 50, 'mail_gold');                /* ...and B's, by the mail */
      await this.ctx.storage.put({ [a]: A, [b]: B });         /* both in one put */
      return Response.json(await this._count());
    }
    if (op === 'count') return Response.json(await this._count());
    if (op === 'plan') {
      const body = q('bookmark') ? { bookmark: q('bookmark') } : { at: Number(q('at')) };
      return Response.json(await rewindPlan(this, body));
    }
    if (op === 'do') return Response.json(await rewindDo(this, { token: q('token'), confirm: q('confirm') }));
    return new Response('unknown op', { status: 400 });
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/') return new Response('brotown-lab');
    if (!env.LAB_KEY || req.headers.get('x-lab-key') !== env.LAB_KEY) return new Response('forbidden', { status: 403 });
    const colo = (req.cf && req.cf.colo) || null;
    if (url.pathname === '/whoami') return Response.json({ isolate: isolateId(), colo });
    /* v2.3.3257: an object that refuses (the free plan's daily limit: the
       limit test, run.mjs --limit) answers in Cloudflare's own words rather
       than the worker's crash page, so the run can say what was refused */
    try {
      if (url.pathname === '/burn') {
        const name = (url.searchParams.get('name') || 'b0').slice(0, 64);
        const stub = env.BURNER.get(env.BURNER.idFromName(name));
        const j = await (await stub.fetch('http://b/burn' + url.search)).json();
        return Response.json(Object.assign(j, { entry: colo, workerIsolate: isolateId() }));
      }
      if (url.pathname === '/door') {
        const name = (url.searchParams.get('door') || 'd0').slice(0, 64);
        const stub = env.DOOR.get(env.DOOR.idFromName(name));
        return await stub.fetch('http://d/door' + url.search);
      }
      /* v2.3.5288: the restore try (run.mjs --restore) */
      if (url.pathname === '/vault') {
        const name = (url.searchParams.get('vault') || 'v0').slice(0, 64);
        const stub = env.VAULT.get(env.VAULT.idFromName(name));
        return await stub.fetch('http://v/vault' + url.search);
      }
    } catch (e) {
      return Response.json({ refused: String((e && e.message) || e).slice(0, 500), name: (e && e.name) || null }, { status: 503 });
    }
    return new Response('not found', { status: 404 });
  },
};
