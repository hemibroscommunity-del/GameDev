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
  worker = spawn('npx', ['wrangler', 'dev', '--port', String(port), '--local', '--ip', '127.0.0.1', '--persist-to', state, '--var', 'LAB_KEY:' + KEY],
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
async function get(path) {
  const t0 = performance.now();
  const res = await fetch(BASE + path, { headers: H });
  const ms = performance.now() - t0;
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = { text: text.slice(0, 200) }; }
  if (!res.ok) throw new Error(`${path}: ${res.status} ${text.slice(0, 200)}`);
  return { ms, body };
}

const started = new Date();
const out = { started: started.toISOString(), base: LOCAL ? 'local' : BASE, rounds: ROUNDS, runner: process.env.RUNNER_NAME || null };

/* ── up? ──────────────────────────────────────────────────────────────────── */
{
  /* a brand-new worker's workers.dev address can take a minute or more to
     answer after its first deploy: wait up to 5 minutes (locally, wrangler's
     start-up) before calling it a failure */
  let up = false;
  for (let i = 0; i < 300 && !up; i++) {
    try { const r = await fetch(BASE + '/'); up = r.ok && (await r.text()).startsWith('brotown-lab'); } catch { /* not yet */ }
    if (!up) await sleep(1000);
  }
  if (!up) { console.error('lab: the worker never answered' + (worker ? '\n' + worker._log().slice(-2000) : '')); process.exit(1); }
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
  for (const K of [1, 2, 4, 8, 16]) {
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
  await get(`/door?${q}&n=20&door=warm`);
  const r = (await get(`/door?${q}&n=${LOCAL ? 200 : 400}&door=rtt`)).body;
  out.rtt[name] = { ...r.rttMs, where: r.where };
}

/* ── 3. floods, for the speed and the bill ───────────────────────────────── */
out.flood = [];
const floods = [
  ['socket, plain, 100 B', 'mode=flood-ws&hib=0&size=100', 20000],
  ['socket, hibernation, 100 B', 'mode=flood-ws&hib=1&size=100', 20000],
  ['call (JS RPC), 100 B', 'mode=flood-rpc&size=100', 20000],
  ['socket, hibernation, 2 KB', 'mode=flood-ws&hib=1&size=2000', 4000],
];
const floodFrom = new Date();
for (const [name, q, n] of floods) {
  const t = new Date();
  const r = (await get(`/door?${q}&n=${n}&door=flood&world=${encodeURIComponent(name)}`)).body;
  out.flood.push({ name, n, got: r.worldGot, wallMs: r.wallMs, usPerMsg: r.usPerMsg, from: t.toISOString(), to: new Date().toISOString(), where: r.where });
}
const floodTo = new Date();

/* ── the bill (best effort) ───────────────────────────────────────────────── */
out.billing = await billing(floodFrom, floodTo).catch((e) => ({ error: String(e && e.message || e) }));

/* ── write it ─────────────────────────────────────────────────────────────── */
const md = render(out);
await mkdir(OUT, { recursive: true });
const stamp = started.toISOString().replace(/[:.]/g, '-');
await writeFile(join(OUT, `lab-${stamp}.json`), JSON.stringify(out, null, 2));
await writeFile(join(OUT, `lab-${stamp}.md`), md);
console.log(md);
if (worker) { try { process.kill(-worker.pid, 'SIGKILL'); } catch { /* gone */ } }
process.exit(0);

/* ── helpers ──────────────────────────────────────────────────────────────── */
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
const baseType = (t) => { while (t && !t.name && t.ofType) t = t.ofType; return t ? t.name : null; };

async function billing(from, to) {
  if (LOCAL) return { skipped: 'local run' };
  if (!process.env.CLOUDFLARE_API_TOKEN) return { skipped: 'no CLOUDFLARE_API_TOKEN' };
  let account = process.env.CLOUDFLARE_ACCOUNT_ID || null;
  if (!account) {
    const a = await cf('/accounts');
    account = a && a.result && a.result[0] && a.result[0].id;
    if (!account) return { error: 'no account readable with this token', detail: a && a.errors };
  }
  const ns = await cf(`/accounts/${account}/workers/durable_objects/namespaces?per_page=100`);
  const mine = ((ns && ns.result) || []).filter((x) => x.script === 'brotown-lab');
  if (!mine.length) return { error: 'the lab\'s object namespaces were not listed', detail: ns && ns.errors };
  const ids = mine.map((x) => x.id);
  const byId = Object.fromEntries(mine.map((x) => [x.id, x.class]));
  /* the two datasets the docs name, and their fields as the schema has them */
  const acct = await fieldsOf('account');
  const datasets = ['durableObjectsPeriodicGroups', 'durableObjectsInvocationsAdaptiveGroups'];
  const res = { account: account.slice(0, 6) + '...', namespaces: byId, datasets: {} };
  for (const ds of datasets) {
    const f = acct && acct.fields && acct.fields.find((x) => x.name === ds);
    if (!f) { res.datasets[ds] = { error: 'not in this schema' }; continue; }
    const groupType = await fieldsOf(baseType(f.type));
    const sumF = groupType && groupType.fields && groupType.fields.find((x) => x.name === 'sum');
    const dimF = groupType && groupType.fields && groupType.fields.find((x) => x.name === 'dimensions');
    const sumT = sumF ? await fieldsOf(baseType(sumF.type)) : null;
    const dimT = dimF ? await fieldsOf(baseType(dimF.type)) : null;
    const sums = ((sumT && sumT.fields) || []).filter((x) => ['Int', 'Float', 'uint64', 'float64', 'int64', 'uint32'].includes(baseType(x.type))).map((x) => x.name);
    const dims = ((dimT && dimT.fields) || []).map((x) => x.name);
    const filterName = ['AccountDurableObjectsPeriodicGroupsFilter_InputObject', 'AccountDurableObjectsInvocationsAdaptiveGroupsFilter_InputObject'];
    let filterFields = [];
    for (const fn of filterName) { const t = await fieldsOf(fn); if (t && t.inputFields) filterFields = filterFields.concat(t.inputFields.map((x) => x.name)); }
    const timeKey = ['datetimeMinute', 'datetime', 'datetimeFiveMinutes', 'date'].find((k) => filterFields.includes(k + '_geq')) || 'datetimeMinute';
    const dimSel = ['namespaceId', 'scriptName'].filter((d) => dims.includes(d));
    if (!sums.length) { res.datasets[ds] = { error: 'no sum fields found', dims }; continue; }
    const q = `query($tag: string!, $from: Time!, $to: Time!, $ids: [string!]) { viewer { accounts(filter: {accountTag: $tag}) { g: ${ds}(limit: 50, filter: {${timeKey}_geq: $from, ${timeKey}_leq: $to, namespaceId_in: $ids}) { ${dimSel.length ? 'dimensions { ' + dimSel.join(' ') + ' }' : ''} sum { ${sums.join(' ')} } } } } }`;
    /* the figures arrive a few minutes late: wait for them, up to six */
    const fromIso = new Date(from.getTime() - 60000).toISOString(), toIso = new Date(to.getTime() + 120000).toISOString();
    let got = null;
    for (let i = 0; i < 12; i++) {
      const r = await gql(q, { tag: account, from: fromIso, to: toIso, ids });
      if (r && r.errors && r.errors.length) { got = { errors: r.errors.map((e) => e.message).slice(0, 3), query: q }; break; }
      const rows = r && r.data && r.data.viewer && r.data.viewer.accounts && r.data.viewer.accounts[0] && r.data.viewer.accounts[0].g;
      if (rows && rows.length) { got = { rows: rows.map((x) => ({ class: x.dimensions && byId[x.dimensions.namespaceId], ...x.sum })) }; if (i >= 4) break; }
      await sleep(30000);
    }
    res.datasets[ds] = got || { error: 'no figures after six minutes' };
  }
  return res;
}

function render(o) {
  const L = [];
  L.push(`# Cloudflare lab, ${o.started}`, '');
  L.push(`Worker: ${o.base}.  A request from this runner and back: ${o.httpRttMs.p50} ms (max ${o.httpRttMs.max}).`, '');
  L.push('## 1. Side by side', '');
  L.push(`Each object does the same fixed work, ${o.burn.workMs} ms alone (${o.burn.iters} loop steps).  "Side by side" is how many objects' work was done in the time one takes: K means they all ran at once, 1 means one after another.`, '');
  L.push('| objects at once | time | side by side | isolates they ran in | where |', '|---|---|---|---|---|');
  for (const r of o.burn.rows) L.push(`| ${r.K} | ${r.wallMs} ms | ${r.sideBySide} | ${r.isolates} | ${r.colos.join(', ') || '-'} |`);
  L.push('', '## 2. The delay between two servers', '');
  L.push('| way | p50 | p95 | p99 | max | where (door / world) |', '|---|---|---|---|---|---|');
  for (const [k, v] of Object.entries(o.rtt)) L.push(`| ${k} | ${v.p50} ms | ${v.p95} ms | ${v.p99} ms | ${v.max} ms | ${(v.where && v.where.door) || '-'} / ${(v.where && v.where.world) || '-'} |`);
  L.push('', '## 3. Floods, one way', '');
  L.push('| what | messages | arrived | time | per message |', '|---|---|---|---|---|');
  for (const f of o.flood) L.push(`| ${f.name} | ${f.n} | ${f.got} | ${f.wallMs} ms | ${f.usPerMsg} µs |`);
  L.push('', '## The bill (the account\'s own figures for the lab\'s objects)', '');
  L.push('```', JSON.stringify(o.billing, null, 2).slice(0, 6000), '```');
  return L.join('\n');
}
