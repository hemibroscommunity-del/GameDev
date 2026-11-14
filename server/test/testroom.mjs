/* ═══ v2.3.5086: THE SHARED TEST ROOM (grand plan step 4.5's harness, card E PR 7) ═══
 *
 * Every suite that plays the room has carried its own storage mock, its own
 * join and its own clock (ARCHITECTURE-HANDOFF rule 24), and they drifted: a
 * `list` that ignored `limit`, a `get` that could not take a list, a clock
 * that was the machine's.  This is one room for tests, shared:
 *
 *   makeStorage(seed)  a Durable Object's storage as the money suites need
 *                      it: a copy of what is put; `list` in key order with
 *                      prefix / start / startAfter / end / limit / reverse;
 *                      and BATCHES: every write of one synchronous run
 *                      commits as one batch (the runtime's output gate), so a
 *                      restart lands BETWEEN batches -- `crashAt(n)` kills
 *                      the room before batch n, and that one and every later
 *                      one are lost (chaos-restart's model, moved here);
 *   openRoom(storage)  a GameRoom on it, its live flags loaded;
 *   roomQueue(room)    the input gate: messages delivered one at a time, each
 *                      to its handler's end and its writes' commit before the
 *                      next (a bundle's parts each finish before the next:
 *                      CLAUDE.md §5);
 *   seededClock(...)   Date.now and Math.random from a seed, moved only by
 *                      the test (`advance`): a run is the same every time;
 *   join(...)          a player in, the world's way (`ws: [1, 5]`);
 *   DISTURBANCES       THE ONE CLOSED LIST of what changes how an honest
 *                      player looks without any cheating (docs/SHAPES.md
 *                      part 7: the storm of 4.5, each signal's honest
 *                      troubles 10.6, the league's replays 10.7, the slow
 *                      profiles 1.5 -- four steps, one list);
 *   schedule(...)      a script of messages as one disturbance delivers it.
 *
 * Suites move onto it one at a time (card E PR 7 moves chaos-restart, the
 * restart test step 4.5 finishes).  Its own suite: testroom.test.mjs.
 * Not a `*.test.mjs` file: `npm test` never runs it by itself. */
import { GameRoom } from '../src/index.js';

export const mockEnv = Object.freeze({ LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } });
export function fakeWs(label) {
  return { label, sent: [], closed: null, send(s) { this.sent.push(JSON.parse(s)); }, close(code, why) { this.closed = { code, why }; } };
}
export const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
/** Long enough for every write issued so far to commit and every timer of 0 to run. */
export const settle = () => new Promise((r) => setTimeout(r, 5));

/* ══════════ STORAGE: a copy of what is put, committed a batch at a time ══════════ */
const clone = (v) => (v === undefined ? v : structuredClone(v));
export function makeStorage(seed) {
  const store = new Map(seed ? [...seed].map(([k, v]) => [k, clone(v)]) : []);
  let pending = null, batches = 0, crashAt = Infinity, dead = false;
  const commit = () => {
    const w = pending; pending = null;
    const n = batches++;
    if (dead || n >= crashAt) { dead = true; return; }
    for (const [op, k, v] of w) { if (op === 'put') store.set(k, v); else store.delete(k); }
  };
  const write = (op, k, v) => {
    if (!pending) { pending = []; queueMicrotask(commit); }
    pending.push([op, k, clone(v)]);
  };
  /* a read sees this run's own writes (the runtime's cache), never another's lost one */
  const view = (k) => {
    if (pending) for (let i = pending.length - 1; i >= 0; i--) if (pending[i][1] === k) return pending[i][0] === 'put' ? clone(pending[i][2]) : undefined;
    return clone(store.get(k));
  };
  return {
    _store: store,
    /** batches issued so far (each one synchronous run's writes) */
    batches: () => batches,
    /** the room dies before batch `n`: that one and every later one are lost */
    crashAt(n) { crashAt = n; },
    /** dead: a batch was lost, so nothing after it commits either */
    dead: () => dead,
    storage: {
      async get(k) {
        if (Array.isArray(k)) { const r = new Map(); for (const x of k) { const v = view(x); if (v !== undefined) r.set(x, v); } return r; }
        return view(k);
      },
      async put(k, v) {
        if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) write('put', kk, vv); return; }
        write('put', k, v);
      },
      async delete(k) {
        const keys = Array.isArray(k) ? k : [k];
        let n = 0;
        for (const x of keys) { if (store.has(x)) n++; write('del', x); }
        return Array.isArray(k) ? n : n > 0;
      },
      async list(o) {
        let keys = [...store.keys()].filter((k) => !o?.prefix || k.startsWith(o.prefix)).sort();
        if (o?.start !== undefined) keys = keys.filter((k) => k >= o.start);
        if (o?.startAfter !== undefined) keys = keys.filter((k) => k > o.startAfter);
        if (o?.end !== undefined) keys = keys.filter((k) => k < o.end);
        if (o?.reverse) keys.reverse();
        if (o?.limit) keys = keys.slice(0, o.limit);
        const out = new Map();
        for (const k of keys) out.set(k, clone(store.get(k)));
        return out;
      },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}

/** A GameRoom on `storage` (a makeStorage), its live flags loaded as a
 *  request would load them (GameRoom.fetch warms them first). */
export async function openRoom(storage, flags) {
  const room = new GameRoom(storage, mockEnv);
  await room._liveFlagsEnsure();
  if (flags) { Object.assign(room._liveFlags, flags); room._syncBagCaps(); }
  return room;
}

/* ══════════ THE INPUT GATE ══════════ */
/** Messages to `room` one at a time, in the order sent: each runs to its
 *  handler's end, and its writes commit, before the next begins -- what the
 *  runtime's input gate and the router's awaits give the room. */
export function roomQueue(room) {
  let tail = Promise.resolve();
  let delivered = 0;
  const q = {
    get delivered() { return delivered; },
    send(ws, type, payload) {
      const msg = typeof type === 'string' ? { type, payload: payload || {} } : type;
      const run = tail.then(async () => {
        await room.webSocketMessage(ws, JSON.stringify(msg));
        await settle();
        delivered++;
      });
      tail = run.catch(() => {});
      return run;
    },
    /** every message sent so far, delivered */
    drain: () => tail,
  };
  return q;
}

/* ══════════ THE CLOCK ══════════ */
/** Date.now and Math.random from `seed`, moved only by `advance`.  `install`
 *  puts them in place, `restore` gives the machine's back. */
export function seededClock({ start = Date.UTC(2026, 10, 14, 12, 0, 0), seed = 1 } = {}) {
  let now = start, s = seed >>> 0 || 1;
  const real = { now: Date.now, random: Math.random };
  const c = {
    now: () => now,
    advance(ms) { now += Math.max(0, Number(ms) || 0); return now; },
    random() { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; },
    install() { Date.now = c.now; Math.random = c.random; return c; },
    restore() { Date.now = real.now; Math.random = real.random; },
  };
  return c;
}

/** A player in, the world's way (CLAUDE.md §5: a test joining the world sends
 *  `ws: [1, 5]`).  `opts.data` is the join's data, `opts.loginTaken` takes
 *  today's login reward first so the join moves no gold. */
export async function join(room, ws, pid, opts = {}) {
  room.sessions.set(ws, baseSession());
  if (opts.loginTaken) await room.state.storage.put('cadence:login:' + pid, { period: room._cadencePeriodDaily(), streak: 1, ts: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name: opts.name || pid.slice(3, 12), phrase: 'p-' + pid,
    protocolVersion: opts.protocolVersion || 2, ws: [1, 5], data: opts.data || { x: 100, y: 100, z: 'town' } }));
  await settle();
  return ws;
}

/* ══════════ THE DISTURBANCES: ONE CLOSED LIST ══════════
 * What changes how an honest player looks without any cheating.  Each says
 * what it does to a script of messages (`schedule` below); `what` is why it
 * is on the list.  A step that needs another names it here first. */
const D = (id, kind, params, what) => Object.freeze({ id, kind, ...params, what });
export const DISTURBANCES = Object.freeze([
  D('deploy', 'deploy', {}, 'a worker deploy restarts the room at a message: what is written stays, memory is wiped, every player joins again (TRAPS §277)'),
  D('hidden', 'hidden', { holdMs: 60000 }, 'a hidden tab (iPhone Safari): the phone sends nothing for a while, then what it held at once'),
  D('fps60', 'fps', { fps: 60 }, 'a phone drawing 60 frames a second sends its moves 60 times a second'),
  D('fps30', 'fps', { fps: 30 }, '30 a second: a Low Power iPhone, a hot one (the ladder\'s steady lower rate)'),
  D('fps20', 'fps', { fps: 20 }, '20 a second: an old phone in a busy fight'),
  D('fps4', 'fps', { fps: 4 }, '4 a second: a phone that can barely draw (this box\'s own browser)'),
  D('delay', 'delay', { ms: 300 }, 'the line\'s delay: every message late by the same, in order'),
  D('loss', 'loss', { rate: 0.05 }, 'the line\'s loss: the socket drops at a message, what was sent until the rejoin is lost, and the player joins again'),
  D('lane_full', 'lane', { drawLane: 'full' }, 'each drawLane (card O): today the one, `full`, which changes nothing the room sees'),
]);
export const disturbance = (id) => DISTURBANCES.find((d) => d.id === id) || null;

/** A script of messages as `d` delivers it: each step `{ at, i, drop,
 *  deploy, rejoin }` -- `at` ms after the start (the clock to advance to),
 *  `i` the script's index.  Seeded, so a run is the same every time.
 *  `opts.at` for `deploy`: the message the restart lands before (default the
 *  middle); `opts.gapMs`: the script's own spacing (default 100). */
export function schedule(script, d, opts = {}) {
  const n = script.length;
  const gap = opts.gapMs || 100;
  const clock = seededClock({ seed: opts.seed || 7 });
  const out = [];
  let t = 0;
  const lossAt = d.kind === 'loss' ? Math.min(n - 1, Math.floor(clock.random() / d.rate) % Math.max(1, n)) : -1;
  const hideFrom = Math.floor(n / 3), hideTo = Math.floor((2 * n) / 3);
  for (let i = 0; i < n; i++) {
    const step = { i, at: 0, drop: false, deploy: false, rejoin: false };
    if (d.kind === 'fps') t += 1000 / d.fps;
    else t += gap;
    step.at = d.kind === 'delay' ? t + d.ms : t;
    if (d.kind === 'deploy' && i === (opts.at === undefined ? Math.floor(n / 2) : opts.at)) step.deploy = true;
    if (d.kind === 'hidden') {
      const back = hideFrom * gap + d.holdMs;                 /* the tab is seen again */
      if (i >= hideFrom && i < hideTo) step.at = back;          /* held, then all at once */
      else if (i >= hideTo) step.at = back + (i - hideTo + 1) * gap;   /* and the rest after them */
    }
    if (d.kind === 'loss' && i === lossAt) step.drop = true;
    if (d.kind === 'loss' && i === lossAt + 1) step.rejoin = true;
    out.push(step);
  }
  /* what is held arrives together: delivery is in time order, the script's order kept for the same time */
  return out.sort((a, b) => a.at - b.at || a.i - b.i);
}
