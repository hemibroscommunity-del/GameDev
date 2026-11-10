/* ═══ v2.3.4370: THE WHEEL'S GROUND WORKER, A FAILED START TRIED AGAIN ═══
 *
 * The state-machine sweep (2026-11-03, V11 G3-4 and T1-12; docs/specs/
 * ground-start-retry.md): a ground worker that failed to start was kept, its
 * rejected start handed to every later ask, so a Wi-Fi blip as the world
 * opened left flat sea -- no ground, buildings or doors -- until a reload;
 * and the worker's start lists (the bake, the objects list, the ground list)
 * had no time limit and no retry.  Two small download fixes ride along (T1-9).
 *
 * Here, with a stand-in fetch and a stand-in Worker:
 *   1. startFetch: a fetch that fails once is tried again; a hang is cut and
 *      tried again; a 5xx is tried again; a 404 is handed to `read` (no
 *      retry); every try failing throws, after `tries` fetches;
 *   2. the worker's start lists all go through startFetch (only the ground
 *      pictures' own fetchFile still calls fetch, with its own time limit);
 *   3. want(): a queued prefetch made urgent starts at once when a line is
 *      free (the worker's own want/pump, run with stand-ins);
 *   4. prefetchRound skips a picture this browser could not unpack;
 *   5. wheelStart: a worker whose script fails is let go, the failure handed
 *      back until the wait is over (no worker a frame), then a fresh worker
 *      is started and its 'ready' resolves;
 *   6. the same for the plan build's 'error'; the wait doubles while it keeps
 *      failing, and a 'ready' or wheelStop starts it again;
 *   7. an error AFTER 'ready' does not stop that worker (as before);
 *   8. the wiring: preloadWheel asks again behind its loading screen, for a
 *      bounded time, and gives up at once with no saved failure to wait out.
 */
import fs from 'node:fs';

let passed = 0, failed = 0;
function check(name, ok, info) {
  if (ok) { passed++; console.log('  PASS ' + name); }
  else { failed++; console.log('  FAIL ' + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); }
}
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const src = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const WORKER = 'public/tools/world/core/ground-worker.js';

/* ── 1. startFetch ── */
console.log('1. startFetch: a time limit and a retry');
{
  const { startFetch } = await import('../../public/tools/world/core/startFetch.js');
  const fast = { pauses: [1, 1], ms: 50 };
  const ok = (body, status = 200) => ({ ok: status < 400, status, text: async () => body });
  /* fails once (a dropped connection), then answers */
  {
    let n = 0;
    const got = await startFetch('/a', (r) => r.text(), { ...fast, fetch: async () => { n++; if (n === 1) throw new TypeError('network'); return ok('A'); } });
    check('1a. a fetch that fails once is tried again', got === 'A' && n === 2, { got, n });
  }
  /* hangs once: cut at `ms`, and the try after answers */
  {
    let n = 0, aborted = false;
    const t0 = Date.now();
    const got = await startFetch('/b', (r) => r.text(), { ...fast, fetch: (u, init) => { n++; if (n === 1) { init.signal.addEventListener('abort', () => { aborted = true; }); return new Promise(() => {}); } return Promise.resolve(ok('B')); } });
    check('1b. a fetch that hangs is cut (aborted) and tried again', got === 'B' && n === 2 && aborted && Date.now() - t0 < 2000, { got, n, aborted });
  }
  /* a body that hangs is cut too (the time limit covers the download AND its body) */
  {
    let n = 0;
    const got = await startFetch('/b2', (r) => r.text(), { ...fast, fetch: async () => { n++; return n === 1 ? { ok: true, status: 200, text: () => new Promise(() => {}) } : ok('B2'); } });
    check('1c. a body that hangs is cut and tried again', got === 'B2' && n === 2, { got, n });
  }
  /* 503 then 200 */
  {
    let n = 0;
    const got = await startFetch('/c', (r) => (r.ok ? r.text() : null), { ...fast, fetch: async () => { n++; return n === 1 ? ok('', 503) : ok('C'); } });
    check('1d. a 5xx is tried again', got === 'C' && n === 2, { got, n });
  }
  /* 404: handed to read, not tried again */
  {
    let n = 0;
    const got = await startFetch('/d', (r) => (r.ok ? r.text() : 'none'), { ...fast, fetch: async () => { n++; return ok('', 404); } });
    check('1e. a 404 is handed to read, once', got === 'none' && n === 1, { got, n });
  }
  /* every try fails: thrown, after `tries` fetches; a fresh address each try */
  {
    let n = 0, threw = null; const urls = [];
    try { await startFetch(() => '/e?t=' + (++n), (r) => r.text(), { ...fast, tries: 3, fetch: async (u) => { urls.push(u); throw new TypeError('down'); } }); } catch (e) { threw = e; }
    check('1f. every try failing throws after 3 fetches, each at its own address', threw && urls.length === 3 && new Set(urls).size === 3, { urls, threw: threw && threw.message });
  }
  /* the defaults: generous (a slow phone's 0.7 MB objects.bin is never cut) */
  const { START_FETCH } = await import('../../public/tools/world/core/startFetch.js');
  check('1g. defaults: 3 tries, 20 s a try', START_FETCH.tries === 3 && START_FETCH.ms >= 20000, START_FETCH);
}

/* ── 2. the worker's start lists ── */
console.log('2. the worker fetches its start lists through startFetch');
{
  const w = src(WORKER);
  const bare = (w.match(/\bawait fetch\(/g) || []).length;
  check('2a. one bare fetch left: the ground pictures\' fetchFile (its own time limit)', bare === 1, { bare });
  check('2b. readPlaced, objectsManifest and findSwatches use startFetch',
    /async function readPlaced[\s\S]*?startFetch\(at\(f\)/.test(w) && /async function objectsManifest\(\)[\s\S]*?startFetch\(/.test(w) && /GAME_BASE \+ 'manifest\.json\?t=' \+ Date\.now\(\)[\s\S]{0,80}jsonOrNull/.test(w));
  check('2c. the bakes\' numbers are where test-world-core reads them', /^const CHUNK = 128;/m.test(w) && /^const UNDER = 2;/m.test(w) && /^const APRON = 3;/m.test(w));
}

/* the worker's own want/pump and prefetchRound, run with stand-ins */
function slice(w, from, to) {
  const a = w.indexOf(from), b = w.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error('not found: ' + from);
  return w.slice(a, b);
}
/* ── 3. a promoted prefetch starts at once ── */
console.log('3. want(): a prefetch made urgent starts while a line is free');
{
  const w = src(WORKER);
  const code = slice(w, 'function want(k, urgent)', '/* A picture some piece went without');
  const started = [];
  const make = new Function('DL_PARALLEL', 'started', `
    const files = new Map(), dlJobs = new Map(), dlLine = [], dlRetry = new Map(), owed = new Set(), everFetched = new Set();
    const diet = { refetches: 0 }; const FILES_KEEP = 32, DL_RETRY_MS = 3000, DL_RETRY_MAX_MS = 30000;
    let dlActive = 0, dlFails = 0;
    const post = () => {}; const chase = () => {};
    const fetchFile = (k) => { started.push(k); return new Promise(() => {}); };   /* downloads that never end */
    ${code}
    return { want, line: () => dlLine.map((j) => j.k), active: () => dlActive };
  `);
  const q = make(4, started);
  /* three prefetches: two start (one line kept free for the wanted-now ones), one waits */
  q.want('p1|A', false); q.want('p2|A', false); q.want('p3|A', false); q.want('p4|A', false);
  const before = started.slice(), waiting = q.line();
  /* a piece now needs p4: moved to the front -- and started, a line being free */
  q.want('p4|A', true);
  check('3a. the setup: three prefetches started, one waiting', before.length === 3 && waiting.length === 1 && waiting[0] === 'p4|A', { before, waiting });
  check('3b. the promoted prefetch started at once (a line was free)', started.includes('p4|A') && q.active() === 4, { started, active: q.active(), line: q.line() });
}

/* ── 4. prefetchRound skips the unreadable ── */
console.log('4. prefetchRound: not a picture this browser could not unpack');
{
  const w = src(WORKER);
  const code = slice(w, 'function prefetchRound(i, j)', 'const post = ');
  const asked = [];
  const run = new Function('asked', `
    const PREFETCH = 2, CHUNK = 128, W = { F: { x0: 0, y0: 0 } };
    const windowFor = () => ({ bp: null, mm: null });
    const swatchesUnder = () => ['grass', 'sand'];
    const swatches = { grass: { vers: { A: {}, B: {} } }, sand: { vers: { A: {} } } };
    const decoded = new Set(['sand|A']), failed = new Set(['grass|B']);
    const isCold = () => false;
    const want = (k) => asked.push(k);
    ${code}
    prefetchRound(0, 0);
  `);
  run(asked);
  check('4a. prefetches the wanted one, not the unpacked or the unreadable', asked.length === 1 && asked[0] === 'grass|A', asked);
}

/* ── 5-7. wheelStart ── */
class FakeWorker {
  constructor(url) {
    this.url = url; this.posts = []; this.dead = false;
    FakeWorker.made.push(this);
    if (FakeWorker.throwNext) { FakeWorker.throwNext = false; throw new Error('no module workers'); }
  }
  postMessage(m) {
    this.posts.push(m);
    if (m && m.type === 'init' && FakeWorker.onInit) { const f = FakeWorker.onInit; setTimeout(() => f(this), 0); }
  }
  terminate() { this.dead = true; }
}
FakeWorker.made = [];
globalThis.Worker = FakeWorker;
const READY = { type: 'ready', walk: { cols: 4, rows: 4, block: 4 }, chunk: { px: 8, apronPx: 0 }, overview: null, catalog: [], made: {}, worldW: 100, worldH: 100 };
const fail = (w) => w.onerror({ message: 'script did not load' });
const ready = (w) => w.onmessage({ data: { ...READY } });
const planError = (w) => w.onmessage({ data: { type: 'error', message: 'plan build failed' } });

const T = await import('../../src/game/wheelTrial.js');
/* (the old code had no wheelRetryIn: NaN, so its checks fail rather than throw) */
const retryIn = () => (typeof T.wheelRetryIn === 'function' ? T.wheelRetryIn() : NaN);
let now = Date.now();
const realNow = Date.now;
Date.now = () => now;

console.log('5. a worker that fails to start is let go and started again');
{
  FakeWorker.made.length = 0;
  FakeWorker.onInit = fail;
  let e1 = null;
  try { await T.wheelStart(); } catch (e) { e1 = e; }
  const w1 = FakeWorker.made[0];
  check('5a. the start rejects', !!e1 && FakeWorker.made.length === 1, { e1: e1 && e1.message });
  check('5b. the failed worker is stopped and let go', w1.dead === true && T.wheelRunning() === false, { dead: w1.dead, running: T.wheelRunning() });
  /* the ground asks every frame: inside the wait, the same failure, no new worker */
  let e2 = null;
  for (let i = 0; i < 10; i++) { try { await T.wheelStart(); } catch (e) { e2 = e; } }
  check('5c. asks inside the wait get the failure back, no worker a frame', !!e2 && FakeWorker.made.length === 1 && retryIn() > 0, { made: FakeWorker.made.length, wait: retryIn() });
  /* the wait over (a blip passed): a fresh worker, and its 'ready' */
  now += retryIn();
  FakeWorker.onInit = ready;
  let info = null, e3 = null;
  try { info = await T.wheelStart(); } catch (e) { e3 = e; }
  check('5d. after the wait a fresh worker starts, and is ready', !!info && FakeWorker.made.length === 2 && !FakeWorker.made[1].dead && T.wheelRunning(), { e3: e3 && e3.message, made: FakeWorker.made.length });
  check('5e. ready: nothing left to wait out', retryIn() === 0);
  T.wheelStop();
}

console.log('6. the plan build\'s error, a constructor that throws, the wait doubling, and stop');
{
  FakeWorker.made.length = 0;
  FakeWorker.onInit = planError;
  let e1 = null;
  try { await T.wheelStart(); } catch (e) { e1 = e; }
  const w1 = FakeWorker.made[0];
  const wait1 = retryIn();
  check('6a. a plan-build error: rejected, the worker let go', !!e1 && w1.dead && !T.wheelRunning() && wait1 > 0, { wait1 });
  now += wait1;
  try { await T.wheelStart(); } catch (e) { /* fails again */ }
  const wait2 = retryIn();
  check('6b. failing again: a fresh worker, and the wait doubles', FakeWorker.made.length === 2 && FakeWorker.made[1].dead && wait2 === 2 * wait1, { wait1, wait2, made: FakeWorker.made.length });
  /* a constructor that throws (no module workers): the same */
  now += wait2;
  FakeWorker.throwNext = true;
  let e3 = null;
  try { await T.wheelStart(); } catch (e) { e3 = e; }
  check('6c. a Worker that throws on making: rejected, waited out like the rest', !!e3 && retryIn() > 0 && !T.wheelRunning(), { e3: e3 && e3.message });
  T.wheelStop();
  check('6d. wheelStop starts the count again', retryIn() === 0);
  FakeWorker.onInit = ready;
  let info = null;
  try { info = await T.wheelStart(); } catch (e) { /* */ }
  check('6e. after a stop, the next ask starts at once', !!info && T.wheelRunning());
  T.wheelStop();
}

console.log('7. an error after ready keeps that worker (as before)');
{
  FakeWorker.made.length = 0;
  FakeWorker.onInit = ready;
  const info = await T.wheelStart();
  const w = FakeWorker.made[0];
  fail(w);
  await tick();
  const again = await T.wheelStart();
  check('7a. the ready worker is kept, and the same start answers', !!info && !w.dead && T.wheelRunning() && again === info && FakeWorker.made.length === 1, { dead: w.dead, made: FakeWorker.made.length });
  T.wheelStop();
}
Date.now = realNow;

console.log('8. the wiring: preloadWheel asks again behind its loading screen');
{
  const wt = src('src/game/worldTrial.js');
  const body = slice(wt, 'async function preloadWheel()', 'EACH GROUND ITS OWN FOOTSTEP');
  check('8a. preloadWheel retries a failed start while START_TRIES_MS allows',
    /for \(;;\)[\s\S]*?await wheelStart\(\)[\s\S]*?wheelRetryIn\(\)[\s\S]*?START_TRIES_MS/.test(body));
  check('8b. ...and gives up at once with no saved failure to wait out (no workers here)', /wait <= 0 \|\|/.test(body));
  const cap = Number((/const START_TRIES_MS = (\d+);/.exec(wt) || [])[1]);
  check('8c. its budget sits inside the loading screen\'s 15 s cap', cap > 0 && cap < 15000, { cap });
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
