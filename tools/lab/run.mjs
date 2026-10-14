/* ═══ v2.3.3247: DRIVE THE CLOUDFLARE LAB (tools/lab/src/index.js) ═══
 *
 * docs/specs/cloudflare-lab.md.  Run by .github/workflows/lab.yml on a GitHub
 * runner against the lab worker it just deployed, or locally for a dry run:
 *
 *   node tools/lab/run.mjs --base https://brotown-lab.<sub>.workers.dev --key KEY [--rounds 5] [--out dir]
 *   node tools/lab/run.mjs --local [--rounds 3]      # the same tests on `wrangler dev --local`
 *
 * The three questions (docs/SERVER-SPLIT-PLAN.md, "Risks and unknowns"):
 *   1. SIDE BY SIDE.  K Burner objects (K = 1, 2, 4, 8, 16) each do the same
 *      fixed work at once.  If they run side by side, K take about as long as
 *      one; if one waits for another, K take K times as long.  Each says which
 *      isolate ran it (one isolate is one thread) and where.
 *   2. THE DELAY BETWEEN SERVERS.  A Door times round trips to the World one at
 *      a time: a call (JS RPC), and a message on a socket the World took with
 *      the hibernation API and without it.
 *   3. THE BILL.  Floods of a known number of messages, each way; then, with a
 *      Cloudflare token (CLOUDFLARE_API_TOKEN, optional CLOUDFLARE_ACCOUNT_ID),
 *      the account's own figures for the lab's objects (GraphQL), to see what
 *      a message between two servers is counted as.  Best effort: if the token
 *      may not read them, the run says so and the rest still stands.
 * Writes <out>/lab-<time>.json and .md, and prints the .md.
 *
 * ═══ v2.3.3252: THE FREE PLAN ═══
 * The first run (2026-10-14) never started: Cloudflare refused the deploy, "In
 * order to use Durable Objects with a free plan, you must create a namespace
 * using a `new_sqlite_classes` migration" (code 10097).  This account is on the
 * Workers FREE plan -- the game's brotown-server too (server/wrangler.toml) --
 * and there Durable Objects have DAILY limits for the whole account, reset at
 * 00:00 UTC: 100,000 requests (a web request, a call, an alarm, or 20 incoming
 * socket messages) and 13,000 GB-s of time awake.  Past either, Cloudflare
 * refuses that kind of work until midnight, the GAME'S as well.  So:
 *   - the lab's objects are SQLite ones (wrangler.toml), the only kind the free
 *     plan takes;
 *   - a run is sized for the free plan: about 2,700 billed requests (BUDGET),
 *     was about 25,000 (its call flood alone was 20,000), and the Door waits
 *     for a flood with a call every 50 ms, not every 5.  `--big` (the
 *     workflow's "big" input) runs the old sizes: the paid plan only;
 *   0. THE DAY SO FAR: before anything, the account's billed requests today; a
 *      run that could take them past 90% of the day's 100,000 stops there;
 *   4. THE GAME'S OWN DAYS: the last 7 days of brotown-server's Durable Objects
 *      from the account's own figures, against the free plan's daily limits.
 *      Read only, and best effort like the bill.
 */
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (name, d) => { const i = process.argv.indexOf('--' + name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const LOCAL = process.argv.includes('--local');
const ROUNDS = (() => { const v = Math.floor(+arg('rounds', LOCAL ? 3 : 5)); return Number.isFinite(v) ? Math.min(20, Math.max(2, v)) : 5; })();
const OUT = arg('out', join(here, '..', 'qa', 'out', 'lab'));
/* v2.3.3252: the free plan (header) */
const BIG = process.argv.includes('--big');
/* rpc: Cloudflare allows one request at most 1,000 calls out (its
   "subrequests"), and the Door's call flood makes n + 3 in one: the third run's
   flood of 1,000 failed (a 500), so 900, on either plan (20,000 never could) */
const N = BIG
  ? { warm: 20, rtt: 400, ws: 20000, rpc: 900, ws2k: 4000 }
  : { warm: 10, rtt: 200, ws: 10000, rpc: 900, ws2k: 2000 };
const POLL_MS = 50;   /* the Door's wait for a flood to land: one call a poll */
const FREE_DAY = Object.freeze({ requests: 100000, gbs: 13000 });
/* a run's billed Durable Object requests, about: every call and web request to
   an object is one, 20 incoming socket messages are one */
const BUDGET = Math.ceil(
  8 + 31 * (ROUNDS + 1)                                     /* 1: the burns */
  + 3 * 2 * 4 + (N.warm + N.rtt) * (1 + 2 / 20)              /* 2: the round trips */
  + 4 * 4 + (2 * N.ws + N.ws2k) / 20 + N.rpc + 3 * 40);      /* 3: the floods, ~40 polls each */
/* the account and the GraphQL schema, read once (the helpers at the bottom
   run before any line down there would declare them) */
const CACHE = { account: undefined, accountErr: null, acctType: null, ds: Object.create(null) };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; };
const r1 = (v) => (v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 10) / 10);

let BASE = arg('base', null), KEY = arg('key', process.env.LAB_KEY || null);
let worker = null;
if (LOCAL) {
  KEY = 'local-' + Math.random().toString(36).slice(2);
  const port = 8890 + Math.floor(Math.random() * 100);
  const state = await mkdtemp(join(tmpdir(), 'lab-'));
  /* wrangler's local tracing off: TRAPS §168 */
  const env = Object.assign({}, process.env, { X_LOCAL_OBSERVABILITY: 'false', X_LOCAL_EXPLORER: 'false' });
  worker = spawn('npx', ['wrangler', 'dev', '--port', String(port), '--local', '--ip', '127.0.0.1', '--persist-to', state, '--var', 'LAB_KEY:' + KEY, '--var', 'LAB_LOCAL:1'],
    { cwd: here, env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  let log = '';
  worker.stdout.on('data', (d) => { log += d; });
  worker.stderr.on('data', (d) => { log += d; });
  BASE = `http://127.0.0.1:${port}`;
  process.on('exit', () => { try { process.kill(-worker.pid, 'SIGKILL'); } catch { /* gone */ } });
  worker._log = () => log;
}
if (!BASE || !KEY) { console.error('lab: --base and --key (or --local) are needed'); process.exit(2); }
if (!LOCAL && !/^https:\/\/brotown-lab\.[a-z0-9-]+\.workers\.dev\/?$/.test(BASE)) {
  /* only ever the lab worker: never the game's own address */
  console.error('lab: --base must be https://brotown-lab.<subdomain>.workers.dev'); process.exit(2);
}
BASE = BASE.replace(/\/$/, '');
const H = { 'x-lab-key': KEY };
/* v2.3.3252: a brand-new workers.dev address is not on every Cloudflare
   machine at once -- the second run died on Cloudflare's own "not found" page
   (HTML, a 404) seconds after the address had answered.  Such a request never
   reached the lab, so it is tried again, up to 5 times 2 s apart; so is a lost
   connection, but only for the cheap requests (a Door's may have run its test).
   An answer from the lab itself is never tried again. */
async function get(path) {
  const cheap = !path.startsWith('/door');
  for (let attempt = 0; ; attempt++) {
    const t0 = performance.now();
    let res, text;
    try {
      res = await fetch(BASE + path, { headers: H });
      text = await res.text();
    } catch (e) {
      if (cheap && attempt < 4) { out.retries = (out.retries || 0) + 1; await sleep(2000); continue; }
      throw e;
    }
    const ms = performance.now() - t0;
    /* only Cloudflare's own 404 page: a 5xx page means the lab threw, so the
       test ran (the third run tried a call flood's 500 four more times) */
    if (res.status === 404 && attempt < 4 && /^\s*<(!doctype|html)/i.test(text)) { out.retries = (out.retries || 0) + 1; await sleep(2000); continue; }
    let body = null;
    try { body = JSON.parse(text); } catch { body = { text: text.slice(0, 200) }; }
    if (!res.ok) throw new Error(`${path}: ${res.status} ${text.slice(0, 200)}`);
    return { ms, body };
  }
}

const started = new Date();
const out = { started: started.toISOString(), base: LOCAL ? 'local' : BASE, rounds: ROUNDS, runner: process.env.RUNNER_NAME || null };

/* ── 0. the day so far (v2.3.3252) ────────────────────────────────────────── */
out.plan = { big: BIG, budget: BUDGET, sizes: N, freePerDay: FREE_DAY };
if (!LOCAL && process.env.CLOUDFLARE_API_TOKEN) {
  out.plan.today = await accountToday().catch((e) => ({ error: String(e && e.message || e) }));
  const used = out.plan.today && out.plan.today.billed;
  if (!BIG && Number.isFinite(used) && used + BUDGET > 0.9 * FREE_DAY.requests) {
    out.plan.refused = `the account has used about ${Math.round(used).toLocaleString('en-US')} of the free plan's ${FREE_DAY.requests.toLocaleString('en-US')} Durable Object requests today; this run's ~${BUDGET.toLocaleString('en-US')} could take it past 90%, and the game shares that limit. Run it after 00:00 UTC.`;
    await writeOut(out);
    process.exit(3);
  }
}

/* v2.3.3252: whatever goes wrong from here, what was measured is written
   (the second run lost everything to one failed request) */
try {
/* ── up? ──────────────────────────────────────────────────────────────────── */
{
  /* a brand-new worker's workers.dev address can take a minute or more to
     answer after its first deploy: wait up to 5 minutes (locally, wrangler's
     start-up) before calling it a failure -- and, v2.3.3252, until it has
     answered 20 times running, half a second apart: one answer did not mean
     every Cloudflare machine had it (get above) */
  let run = 0;
  const need = LOCAL ? 1 : 20;
  for (let i = 0; i < 600 && run < need; i++) {
    let ok = false;
    try { const r = await fetch(BASE + '/'); ok = r.ok && (await r.text()).startsWith('brotown-lab'); } catch { /* not yet */ }
    run = ok ? run + 1 : 0;
    if (run < need) await sleep(500);
  }
  if (run < need) throw new Error('the worker never answered' + (worker ? '\n' + worker._log().slice(-2000) : ''));
  const who = [];
  for (let i = 0; i < 12; i++) who.push((await get('/whoami')).ms);
  out.httpRttMs = { p50: r1(pct(who.slice(2), 50)), max: r1(Math.max(...who.slice(2))) };
}

/* ── 1. side by side ──────────────────────────────────────────────────────── */
{
  const rtt = out.httpRttMs.p50 || 0;
  /* the work: calibrated so one object takes about 300 ms of it */
  let iters = 50e6;
  for (let i = 0; i < 3; i++) {
    const t = (await get(`/burn?name=cal&iters=${iters}`)).ms - rtt;
    if (t > 20) iters = Math.min(3e9, Math.round(iters * (300 / t)));
  }
  const one = [];
  for (let i = 0; i < ROUNDS; i++) one.push((await get(`/burn?name=cal&iters=${iters}`)).ms - rtt);
  const work = pct(one, 50);
  out.burn = { iters, workMs: r1(work), rows: [] };
  /* v2.3.3252: on `wrangler dev --local` 8 at once never all came back (the
     third waited out the runner's 300 s): the local runtime's own limit, so a
     local dry run stops at 4 */
  for (const K of LOCAL ? [1, 2, 4] : [1, 2, 4, 8, 16]) {
    const walls = [], isolates = new Set(), colos = new Set(), workerIsolates = new Set();
    for (let round = 0; round <= ROUNDS; round++) {
      const t0 = performance.now();
      const rs = await Promise.all(Array.from({ length: K }, (_, i) => get(`/burn?name=k${K}-${i}&iters=${iters}`)));
      const wall = performance.now() - t0;
      if (round === 0) continue;   /* the first round makes the objects */
      walls.push(wall - rtt);
      for (const r of rs) { isolates.add(r.body.isolate); if (r.body.colo) colos.add(r.body.colo); workerIsolates.add(r.body.workerIsolate); }
    }
    const wall = pct(walls, 50);
    out.burn.rows.push({
      K, wallMs: r1(wall),
      /* K objects' work done in `wall`: K means side by side, 1 one at a time */
      sideBySide: r1((K * work) / Math.max(1, wall)),
      isolates: isolates.size, colos: [...colos], workerIsolates: workerIsolates.size,
    });
  }
}

/* ── 2. the delay between servers ─────────────────────────────────────────── */
out.rtt = {};
for (const [name, q] of [['call (JS RPC)', 'mode=rtt-rpc'], ['socket, plain', 'mode=rtt-ws&hib=0'], ['socket, hibernation', 'mode=rtt-ws&hib=1']]) {
  await get(`/door?${q}&n=${N.warm}&door=warm`);
  const r = (await get(`/door?${q}&n=${N.rtt}&door=rtt`)).body;   /* v2.3.3252: N, the free plan's sizes */
  out.rtt[name] = { ...r.rttMs, where: r.where };
}

/* ── 3. floods, for the speed and the bill ───────────────────────────────── */
out.flood = [];
/* v2.3.3252: sized for the free plan (N); a call is a billed request each, 20
   socket messages one, and the Door's wait polls every POLL_MS */
const floods = [
  ['socket, plain, 100 B', `mode=flood-ws&hib=0&size=100&poll=${POLL_MS}`, N.ws],
  ['socket, hibernation, 100 B', `mode=flood-ws&hib=1&size=100&poll=${POLL_MS}`, N.ws],
  ['call (JS RPC), 100 B', 'mode=flood-rpc&size=100', N.rpc],
  ['socket, hibernation, 2 KB', `mode=flood-ws&hib=1&size=2000&poll=${POLL_MS}`, N.ws2k],
];
const floodFrom = new Date();
for (const [name, q, n] of floods) {
  const t = new Date();
  const r = (await get(`/door?${q}&n=${n}&door=flood&world=${encodeURIComponent(name)}`)).body;
  out.flood.push({ name, n, got: r.worldGot, wallMs: r.wallMs, usPerMsg: r.usPerMsg, from: t.toISOString(), to: new Date().toISOString(), where: r.where, worldId: r.worldId || null });
}
const floodTo = new Date();

/* ── the bill (best effort) ───────────────────────────────────────────────── */
out.billing = await billing(floodFrom, floodTo).catch((e) => ({ error: String(e && e.message || e) }));

/* ── 4. the game's own days (v2.3.3252; read only) ────────────────────────── */
out.game = (LOCAL || !process.env.CLOUDFLARE_API_TOKEN)
  ? { skipped: LOCAL ? 'local run' : 'no CLOUDFLARE_API_TOKEN' }
  : await gameDays(7).catch((e) => ({ error: String(e && e.message || e) }));

} catch (e) {
  out.error = String((e && e.stack) || e).slice(0, 2000);
}

/* ── write it ─────────────────────────────────────────────────────────────── */
await writeOut(out);
if (worker) { try { process.kill(-worker.pid, 'SIGKILL'); } catch { /* gone */ } }
process.exit(out.error ? 1 : 0);

/* ── helpers ──────────────────────────────────────────────────────────────── */
async function writeOut(o) {
  await mkdir(OUT, { recursive: true });
  const stamp = started.toISOString().replace(/[:.]/g, '-');
  /* the figures first: a report that cannot be drawn must not lose them */
  await writeFile(join(OUT, `lab-${stamp}.json`), JSON.stringify(o, null, 2));
  let md;
  try { md = render(o); } catch (e) { md = `# Cloudflare lab, ${o.started}\n\nThe report could not be drawn (${String(e && e.message || e)}); every figure is in lab-${stamp}.json.`; }
  await writeFile(join(OUT, `lab-${stamp}.md`), md);
  console.log(md);
}
async function cf(path, init) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const res = await fetch('https://api.cloudflare.com/client/v4' + path, Object.assign({}, init, { headers: Object.assign({ Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, (init && init.headers) || {}) }));
  return res.json();
}
async function gql(query, variables) {
  return cf('/graphql', { method: 'POST', body: JSON.stringify({ query, variables }) });
}
/* the fields of a GraphQL type, by name (Cloudflare's schema says which
   exist; the docs only name the datasets) */
async function fieldsOf(typeName) {
  const r = await gql('query($n: String!) { __type(name: $n) { name inputFields { name } fields { name type { name kind ofType { name kind ofType { name kind ofType { name } } } } } } }', { n: typeName });
  return (r && r.data && r.data.__type) || null;
}
/* function declarations, not consts: the preflight calls these before the
   line down here runs (the third run's "Cannot access 'baseType' before
   initialization") */
function baseType(t) { while (t && !t.name && t.ofType) t = t.ofType; return t ? t.name : null; }
function num(v) { return v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v); }

/* v2.3.3252: the account, read once (CACHE is made at the top: these run
   before the line that would declare it here) */
async function accountId() {
  if (CACHE.account !== undefined) return CACHE.account;
  CACHE.account = process.env.CLOUDFLARE_ACCOUNT_ID || null;
  if (!CACHE.account) {
    const a = await cf('/accounts');
    CACHE.account = (a && a.result && a.result[0] && a.result[0].id) || null;
    if (!CACHE.account) CACHE.accountErr = a && a.errors;
  }
  return CACHE.account;
}
/* a dataset's sums, dimensions and filters, as the schema has them */
async function discover(ds) {
  if (CACHE.ds[ds]) return CACHE.ds[ds];
  if (!CACHE.acctType) CACHE.acctType = await fieldsOf('account');
  const acct = CACHE.acctType;
  const f = acct && acct.fields && acct.fields.find((x) => x.name === ds);
  if (!f) return (CACHE.ds[ds] = { error: 'not in this schema (or not readable with this token)' });
  const groupType = await fieldsOf(baseType(f.type));
  const gf = (n) => groupType && groupType.fields && groupType.fields.find((x) => x.name === n);
  const sumT = gf('sum') ? await fieldsOf(baseType(gf('sum').type)) : null;
  const dimT = gf('dimensions') ? await fieldsOf(baseType(gf('dimensions').type)) : null;
  const NUMT = ['Int', 'Float', 'uint64', 'float64', 'int64', 'uint32'];
  const sums = ((sumT && sumT.fields) || []).filter((x) => NUMT.includes(baseType(x.type))).map((x) => x.name);
  const dims = ((dimT && dimT.fields) || []).map((x) => x.name);
  const ft = await fieldsOf('Account' + ds[0].toUpperCase() + ds.slice(1) + 'Filter_InputObject');
  const filters = ((ft && ft.inputFields) || []).map((x) => x.name);
  const timeKey = ['datetime', 'datetimeMinute', 'datetimeHour', 'date'].find((k) => filters.includes(k + '_geq')) || null;
  return (CACHE.ds[ds] = { sums, dims, filters, timeKey, count: !!gf('count') });
}
/* one dataset's sums between two times -- for some namespaces (`ids`), or the
   whole account -- added up over its rows */
async function dsSums(ds, { from, to, ids = null, by = null }) {
  const d = await discover(ds);
  if (d.error) return d;
  if (!d.sums.length) return { error: 'no sum fields found', dims: d.dims };
  if (!d.timeKey) return { error: 'no time filter found', filters: d.filters.slice(0, 30) };
  if (ids && !d.filters.includes('namespaceId_in')) return { error: 'no namespace filter', filters: d.filters.slice(0, 30) };
  const acct = await accountId();
  if (!acct) return { error: 'no account readable with this token', detail: CACHE.accountErr };
  const lit = (t) => JSON.stringify(d.timeKey === 'date' ? t.toISOString().slice(0, 10) : t.toISOString().replace(/\.\d{3}Z$/, 'Z'));
  const parts = [`${d.timeKey}_geq: ${lit(from)}`, `${d.timeKey}_leq: ${lit(to)}`];
  if (ids) parts.push(`namespaceId_in: ${JSON.stringify(ids)}`);
  /* v2.3.3252: `by` a dimension (objectId): one row each, kept in `groups` */
  const dim = by && d.dims.includes(by) ? by : null;
  if (by && !dim) return { error: `no ${by} dimension`, dims: d.dims };
  const q = `query { viewer { accounts(filter: {accountTag: ${JSON.stringify(acct)}}) { g: ${ds}(limit: 10000, filter: {${parts.join(', ')}}) { ${dim ? `dimensions { ${dim} } ` : ''}${d.count ? 'count ' : ''}sum { ${d.sums.join(' ')} } } } } }`;
  const r = await gql(q);
  if (r && r.errors && r.errors.length) return { error: r.errors.map((e) => e.message).slice(0, 3).join('; '), query: q.slice(0, 500) };
  const rows = r && r.data && r.data.viewer && r.data.viewer.accounts && r.data.viewer.accounts[0] && r.data.viewer.accounts[0].g;
  if (!rows) return { error: 'no rows', raw: JSON.stringify(r).slice(0, 300) };
  const total = Object.create(null);
  for (const row of rows) {
    if (d.count) total.count = (total.count || 0) + (Number(row.count) || 0);
    for (const [k, v] of Object.entries(row.sum || {})) total[k] = (total[k] || 0) + (Number(v) || 0);
  }
  return dim ? { total, rows: rows.length, groups: rows.map((x) => Object.assign({ [dim]: x.dimensions && x.dimensions[dim] }, x.sum || {})) } : { total, rows: rows.length };
}
/* what the free plan counts, from the two datasets: a request is a call, a web
   request or an alarm (the invocations), or 20 incoming socket messages; time
   awake is billed at 128 MB.  `billed` is the higher reading -- the socket
   messages NOT already among the invocations -- the lab's own floods (3, the
   bill) say which is right */
function usageOf(inv, per) {
  const it = (inv && inv.total) || {}, pt = (per && per.total) || {};
  const pick = (o, re) => { const k = Object.keys(o).find((x) => re.test(x)); return k ? num(o[k]) : null; };
  const u = {
    invocations: num(it.requests) ?? num(it.count),
    wsIn: num(pt.inboundWebsocketMsgCount),
    wsOut: num(pt.outboundWebsocketMsgCount),
    activeS: num(pt.activeTime) === null ? null : pt.activeTime / 1e6,   /* microseconds */
    cpuS: num(pt.cpuTime) === null ? null : pt.cpuTime / 1e6,
    rowsRead: pick(pt, /^rowsRead$/i) ?? pick(pt, /read/i),
    rowsWritten: pick(pt, /^rowsWritten$/i) ?? pick(pt, /write/i),
  };
  u.gbs = u.activeS === null ? null : u.activeS * 0.125;
  u.billed = (u.invocations === null && u.wsIn === null) ? null : (u.invocations || 0) + (u.wsIn || 0) / 20;
  if (inv && inv.error) u.invocationsError = inv.error;
  if (per && per.error) u.periodicError = per.error;
  u.raw = { invocations: it, periodic: pt };
  return u;
}
/* 0: the whole account's use so far today (UTC), for the preflight */
async function accountToday() {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const inv = await dsSums('durableObjectsInvocationsAdaptiveGroups', { from, to: now });
  const per = await dsSums('durableObjectsPeriodicGroups', { from, to: now });
  return usageOf(inv, per);
}
/* 4: the game's own objects (brotown-server), day by day, read only */
async function gameDays(days) {
  const acct = await accountId();
  if (!acct) return { error: 'no account readable with this token', detail: CACHE.accountErr };
  const ns = await cf(`/accounts/${acct}/workers/durable_objects/namespaces?per_page=100`);
  const game = ((ns && ns.result) || []).filter((x) => x.script === 'brotown-server');
  if (!game.length) return { error: 'the game\'s object namespaces were not listed', detail: ns && ns.errors };
  const ids = game.map((x) => x.id);
  const res = { classes: game.map((x) => x.class), days: [] };
  const now = new Date();
  const d0 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (let i = days - 1; i >= 0; i--) {
    const from = new Date(d0 - i * 86400000);
    const to = i === 0 ? now : new Date(d0 - (i - 1) * 86400000 - 1000);
    const inv = await dsSums('durableObjectsInvocationsAdaptiveGroups', { from, to, ids });
    const per = await dsSums('durableObjectsPeriodicGroups', { from, to, ids });
    res.days.push({ date: from.toISOString().slice(0, 10), partial: i === 0, ...usageOf(inv, per) });
  }
  return res;
}

async function billing(from, to) {
  if (LOCAL) return { skipped: 'local run' };
  if (!process.env.CLOUDFLARE_API_TOKEN) return { skipped: 'no CLOUDFLARE_API_TOKEN' };
  const account = await accountId();
  if (!account) return { error: 'no account readable with this token', detail: CACHE.accountErr };
  const ns = await cf(`/accounts/${account}/workers/durable_objects/namespaces?per_page=100`);
  const mine = ((ns && ns.result) || []).filter((x) => x.script === 'brotown-lab');
  if (!mine.length) return { error: 'the lab\'s object namespaces were not listed', detail: ns && ns.errors };
  const ids = mine.map((x) => x.id);
  const byId = Object.fromEntries(mine.map((x) => [x.id, x.class]));
  const res = { account: account.slice(0, 6) + '...', namespaces: byId, datasets: {} };
  /* the figures arrive a few minutes late: wait for them, up to six */
  const fromT = new Date(from.getTime() - 60000), toT = new Date(to.getTime() + 120000);
  for (const ds of ['durableObjectsPeriodicGroups', 'durableObjectsInvocationsAdaptiveGroups']) {
    let got = null;
    for (let i = 0; i < 12; i++) {
      const r = await dsSums(ds, { from: fromT, to: toT, ids });
      if (r.error && r.error !== 'no rows') { got = r; break; }
      if (r.total && r.rows) { got = r; if (i >= 4) break; }
      await sleep(30000);
    }
    res.datasets[ds] = got || { error: 'no figures after six minutes' };
  }
  res.usage = usageOf(res.datasets.durableObjectsInvocationsAdaptiveGroups, res.datasets.durableObjectsPeriodicGroups);
  /* v2.3.3252: each flood's World by its own id -- its CPU over the messages
     it took is the cost of one message on that kind of socket, in CPU */
  const worlds = (out.flood || []).filter((f) => f.worldId);
  if (worlds.length) {
    const per = await dsSums('durableObjectsPeriodicGroups', { from: fromT, to: toT, ids, by: 'objectId' });
    if (per.error) res.perFlood = { error: per.error };
    else {
      res.perFlood = worlds.map((f) => {
        const g = (per.groups || []).find((x) => x.objectId === f.worldId) || null;
        const cpuUs = g && num(g.cpuTime);
        return { name: f.name, n: f.n, cpuMs: cpuUs === null ? null : +(cpuUs / 1000).toFixed(1), cpuUsPerMsg: cpuUs === null ? null : +(cpuUs / f.n).toFixed(1), wsIn: g ? num(g.inboundWebsocketMsgCount) : null, found: !!g };
      });
    }
  }
  return res;
}

function render(o) {
  const L = [];
  const fmt = (v) => (v === null || v === undefined ? '-' : Math.round(v).toLocaleString('en-US'));
  const pc = (v, of) => (v === null || v === undefined ? '-' : (100 * v / of).toFixed(1) + '%');
  L.push(`# Cloudflare lab, ${o.started}`, '');
  /* v2.3.3252: the plan and the day so far */
  if (o.plan) {
    L.push('## 0. The free plan', '');
    L.push(`This run's size: ${o.plan.big ? 'BIG (the paid plan\'s sizes)' : 'sized for the free plan'}, about ${fmt(o.plan.budget)} billed Durable Object requests of the free plan's ${fmt(o.plan.freePerDay.requests)} a day, which the game shares.`, '');
    const t = o.plan.today;
    if (t && !t.error) L.push(`The whole account so far today (UTC): about ${fmt(t.billed)} billed requests (${pc(t.billed, o.plan.freePerDay.requests)} of the day's limit; ${fmt(t.invocations)} calls and web requests, ${fmt(t.wsIn)} socket messages in), ${fmt(t.gbs)} GB-s awake (${pc(t.gbs, o.plan.freePerDay.gbs)}).`, '');
    else if (t) L.push(`The account's use today could not be read: ${t.error || t.invocationsError || t.periodicError}.`, '');
    if (o.plan.refused) { L.push(`**Stopped before starting:** ${o.plan.refused}`, ''); return L.join('\n'); }
  }
  if (o.error) L.push('**The run stopped part way:**', '', '```', o.error, '```', '', 'Everything measured before that is below.', '');
  if (o.retries) L.push(`Requests tried again after meeting Cloudflare's own page (the address not yet everywhere) or a lost connection: ${o.retries}.`, '');
  if (o.httpRttMs) L.push(`Worker: ${o.base}.  A request from this runner and back: ${o.httpRttMs.p50} ms (max ${o.httpRttMs.max}).`, '');
  if (o.burn) {
    L.push('## 1. Side by side', '');
    L.push(`Each object does the same fixed work, ${o.burn.workMs} ms alone (${o.burn.iters} loop steps).  "Side by side" is how many objects' work was done in the time one takes: K means they all ran at once, 1 means one after another.`, '');
    L.push('| objects at once | time | side by side | isolates they ran in | where |', '|---|---|---|---|---|');
    for (const r of o.burn.rows) L.push(`| ${r.K} | ${r.wallMs} ms | ${r.sideBySide} | ${r.isolates} | ${r.colos.join(', ') || '-'} |`);
  }
  if (o.rtt) {
    L.push('', '## 2. The delay between two servers', '');
    L.push('| way | p50 | p95 | p99 | max | where (door / world) |', '|---|---|---|---|---|---|');
    for (const [k, v] of Object.entries(o.rtt)) L.push(`| ${k} | ${v.p50} ms | ${v.p95} ms | ${v.p99} ms | ${v.max} ms | ${(v.where && v.where.door) || '-'} / ${(v.where && v.where.world) || '-'} |`);
  }
  if (o.flood) {
    L.push('', '## 3. Floods, one way', '');
    L.push('| what | messages | arrived | time | per message |', '|---|---|---|---|---|');
    for (const f of o.flood) L.push(`| ${f.name} | ${f.n} | ${f.got} | ${f.wallMs} ms | ${f.usPerMsg} µs |`);
  }
  if (o.billing) {
    L.push('', '## The bill (the account\'s own figures for the lab\'s objects)', '');
    const u = o.billing.usage;
    if (u && u.billed !== null && o.flood) {
      const ws = o.flood.filter((f) => f.name.startsWith('socket')).reduce((a, f) => a + f.n, 0);
      const rpc = o.flood.filter((f) => f.name.startsWith('call')).reduce((a, f) => a + f.n, 0);
      L.push(`The lab's objects: ${fmt(u.invocations)} invocations and ${fmt(u.wsIn)} socket messages in, for floods of ${fmt(ws)} socket messages and ${fmt(rpc)} calls (and the other tests' few hundred). If the invocations are near ${fmt(rpc)} plus a few hundred, a socket message is not an invocation, and 20 of them are one billed request; if they are near ${fmt(rpc + ws)}, every message is one.`, '');
    }
    if (Array.isArray(o.billing.perFlood)) {
      L.push('Each flood\'s World, its own CPU (the account\'s figures; it also answered the stats calls that watched for the flood\'s end):', '');
      L.push('| flood | messages | the World\'s CPU | CPU a message | socket messages it counted |', '|---|---|---|---|---|');
      for (const f of o.billing.perFlood) L.push(`| ${f.name} | ${fmt(f.n)} | ${f.cpuMs === null ? '-' : f.cpuMs + ' ms'} | ${f.cpuUsPerMsg === null ? '-' : f.cpuUsPerMsg + ' µs'} | ${fmt(f.wsIn)} |`);
      L.push('');
    } else if (o.billing.perFlood && o.billing.perFlood.error) L.push(`Each flood's World's own CPU: not read (${o.billing.perFlood.error}).`, '');
    L.push('```', JSON.stringify(o.billing, (k, v) => (k === 'raw' ? undefined : v), 2).slice(0, 6000), '```');   /* raw: in the .json */
  }
  if (o.game) {
    L.push('', '## 4. The game\'s own days (brotown-server, read only)', '');
    if (o.game.days) {
      L.push(`Its objects: ${o.game.classes.join(', ')}.  The free plan's daily limits, for the whole account: ${fmt(FREE_DAY.requests)} requests and ${fmt(FREE_DAY.gbs)} GB-s.  "Billed" counts every call and web request, plus each socket message in at 20 to a request (the higher reading: section 3 says whether socket messages are already among the calls).`, '');
      L.push('| day (UTC) | billed requests | of 100,000 | calls + web requests | socket msgs in | socket msgs out | awake GB-s | of 13,000 | CPU s | rows read | rows written |', '|---|---|---|---|---|---|---|---|---|---|---|');
      for (const d of o.game.days) L.push(`| ${d.date}${d.partial ? ' (so far)' : ''} | ${fmt(d.billed)} | ${pc(d.billed, FREE_DAY.requests)} | ${fmt(d.invocations)} | ${fmt(d.wsIn)} | ${fmt(d.wsOut)} | ${fmt(d.gbs)} | ${pc(d.gbs, FREE_DAY.gbs)} | ${fmt(d.cpuS)} | ${fmt(d.rowsRead)} | ${fmt(d.rowsWritten)} |`);
      const errs = o.game.days.map((d) => d.invocationsError || d.periodicError).filter(Boolean);
      if (errs.length) L.push('', `Not read: ${[...new Set(errs)].join('; ')}`);
    } else {
      L.push(`Not read: ${o.game.error || o.game.skipped}${o.game.detail ? ' (' + JSON.stringify(o.game.detail).slice(0, 300) + ')' : ''}.  The same figures are in the Cloudflare dashboard: Workers & Pages -> brotown-server -> Durable Objects (metrics), and Manage Account -> Billing (usage).`);
    }
  }
  return L.join('\n');
}
