/* ═══ v2.3.3257: THE LAB SELF-TEST'S FAKES (tools/lab/selftest.mjs preloads this) ═══
   A fake lab worker at https://brotown-lab.test.workers.dev and a fake
   Cloudflare API, and quick timers, so run.mjs runs whole with no Cloudflare.
   FAKE_DAY=busy makes the account's day 89% used.

   For the limit test (run.mjs --limit):
     - a CLOCK that time flies on: FAKE_CLOCK=HH:MM:SS starts Date.now() at
       that time of today (UTC), and every wait of more than 200 ms passes at
       once and moves the clock on by all of it;
     - a DAILY LIMIT: FAKE_COUNT=raw refuses every object request (the lab's
       and the game's listing) once the day's calls and socket messages reach
       100,000; FAKE_COUNT=billed only once they reach 2,000,000 (20 to 1);
       FAKE_COUNT=late refuses as raw does, but only 30 s after the line was
       crossed (Cloudflare counting late).  The count starts from the fake
       day's figure and goes back to 0 at midnight, as the free plan's does.

   v2.3.5288, for the restore try (run.mjs --restore): a fake Vault whose
   storage keeps every write as a moment to go back to, running the GAME's
   own rewind (server/src/restore.js), gold door and world's sum, as the
   lab's Vault does on Cloudflare.  FAKE_PITR=none: a storage with no
   earlier times (as `wrangler dev --local`); FAKE_PITR=wrong: one that
   always goes back to now (the try must call that not balanced). */
import { rewindPlan, rewindDo } from '../../server/src/restore.js';
import { worldCtx, worldAdd } from '../../server/src/worldsum.js';
import { goldMethods } from '../../server/src/gold.js';
const realSetTimeout = globalThis.setTimeout;
const realNow = Date.now.bind(Date);
let skew = 0;
if (process.env.FAKE_CLOCK) {
  const [h, m, s] = process.env.FAKE_CLOCK.split(':').map(Number);
  const d = new Date(realNow());
  skew = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, m, s || 0) - realNow();
}
Date.now = () => realNow() + skew;
globalThis.setTimeout = (fn, ms, ...a) => {
  if (ms > 200) { skew += ms; return realSetTimeout(fn, 1, ...a); }
  return realSetTimeout(fn, ms, ...a);
};
const T = (name, kind = 'OBJECT') => ({ name, kind });
const L = (name) => ({ name: null, kind: 'LIST', ofType: { name: null, kind: 'NON_NULL', ofType: { name, kind: 'OBJECT' } } });
const U = (n) => ({ name: n, type: { name: null, kind: 'NON_NULL', ofType: { name: 'uint64', kind: 'SCALAR' } } });
const types = {
  account: { fields: [{ name: 'durableObjectsPeriodicGroups', type: L('PG') }, { name: 'durableObjectsInvocationsAdaptiveGroups', type: L('IG') }] },
  PG: { fields: [{ name: 'sum', type: T('PGS') }, { name: 'dimensions', type: T('PGD') }] },
  PGS: { fields: ['activeTime', 'cpuTime', 'inboundWebsocketMsgCount', 'outboundWebsocketMsgCount', 'rowsRead', 'rowsWritten'].map(U) },
  PGD: { fields: [{ name: 'date', type: T('Date', 'SCALAR') }, { name: 'objectId', type: T('string', 'SCALAR') }] },
  AccountDurableObjectsPeriodicGroupsFilter_InputObject: { inputFields: ['datetimeMinute_geq', 'datetimeMinute_leq', 'namespaceId_in'].map((name) => ({ name })) },
  IG: { fields: [{ name: 'count', type: T('uint64', 'SCALAR') }, { name: 'sum', type: T('IGS') }] },
  IGS: { fields: ['requests', 'wallTime'].map(U) },
  AccountDurableObjectsInvocationsAdaptiveGroupsFilter_InputObject: { inputFields: ['datetime_geq', 'datetime_leq', 'namespaceId_in'].map((name) => ({ name })) },
};
globalThis.__q = [];
globalThis.__worlds = new Set();
const MODE = process.env.FAKE_DAY || 'quiet';
const DAY_START = MODE === 'busy' ? 88000 : 500;
/* the fake account's daily limit (header) */
const COUNT = process.env.FAKE_COUNT || 'raw';
const quota = { day: null, raw: 0, crossedAt: null };
globalThis.__quota = quota;
function today() { return new Date(Date.now()).toISOString().slice(0, 10); }
function count(n) {
  const d = today();
  if (quota.day === null) { quota.day = d; quota.raw = DAY_START; }
  else if (quota.day !== d) { quota.day = d; quota.raw = 0; quota.crossedAt = null; }
  quota.raw += n;
  const line = COUNT === 'billed' ? 2000000 : 100000;
  if (quota.raw >= line && quota.crossedAt === null) quota.crossedAt = Date.now();
}
function refused() {
  count(0);
  if (quota.crossedAt === null) return false;
  return COUNT === 'late' ? Date.now() - quota.crossedAt >= 30000 : true;
}
const WORDS = 'Exceeded allowed volume of requests in Durable Objects free tier.';

/* v2.3.5288: the fake Vault (header) */
const PITR = process.env.FAKE_PITR || 'ok';
const vaults = new Map();
function fakeVault(name) {
  if (vaults.has(name)) return vaults.get(name);
  const V = { store: new Map(), moments: [], pending: null, restart: false, n: 0 };
  const clone = (m) => new Map([...m].map(([k, x]) => [k, structuredClone(x)]));
  const note = () => { const m = { bm: (++V.n).toString(16).padStart(8, '0') + '-0000-0000', t: Date.now(), store: clone(V.store) }; V.moments.push(m); return m; };
  note();
  const storage = {
    getCurrentBookmark: async () => note().bm,
    onNextSessionRestoreBookmark: async (bm) => { const m = V.moments.find((x) => x.bm === bm); if (!m) throw new Error('no such bookmark'); V.pending = m; return note().bm; },
  };
  if (PITR !== 'none') storage.getBookmarkForTime = async (t) => (PITR === 'wrong' ? note() : V.moments.filter((m) => m.t <= t).pop() || V.moments[0]).bm;
  else storage.getBookmarkForTime = async () => { throw new Error('This Durable Object\'s storage back-end does not implement point-in-time recovery.'); };
  V.room = { state: { storage, abort: () => { V.restart = true; }, getWebSockets: () => [] }, _liveFlags: { roomrewind: true } };
  V.note = note;
  V.wake = () => { if (V.restart) { V.restart = false; if (V.pending) { V.store = clone(V.pending.store); V.pending = null; note(); } } };
  vaults.set(name, V);
  return V;
}
const vaultDoor = Object.assign({ _liveFlags: {}, _daybookOff: () => true }, goldMethods);
function vaultCount(V) {
  const c = worldCtx();
  const purses = {};
  for (const [k, x] of [...V.store].sort()) { worldAdd(c, k, x); purses[k.slice('rpg:bp_lab_'.length)] = x.coins; }
  return { gold: c.gold, goods: c.goods, net: c.net, purses, records: V.store.size, now: Date.now() };
}
async function vaultOp(u) {
  const V = fakeVault(u.searchParams.get('vault') || 'v0');
  V.wake();
  const op = u.searchParams.get('op');
  if (op === 'seed') { for (let i = 0; i < 8; i++) V.store.set('rpg:bp_lab_' + i, { coins: 1000, inventory: {}, _econ: { v: 1, g: { m: 0, b: 0 }, i: {} } }); V.note(); return vaultCount(V); }
  if (op === 'play') {
    const step = +u.searchParams.get('step'), keys = [...V.store.keys()].sort();
    const A = V.store.get(keys[step % keys.length]), B = V.store.get(keys[(step + 1) % keys.length]);
    vaultDoor._goldGive(A, 100 + step, 'quest_reward'); vaultDoor._goldTake(B, 20, 'farm_buy');
    vaultDoor._goldTake(A, 50, 'trade_window'); vaultDoor._goldGive(B, 50, 'mail_gold');
    V.note();
    return vaultCount(V);
  }
  if (op === 'count') return vaultCount(V);
  if (op === 'plan') return rewindPlan(V.room, u.searchParams.get('bookmark') ? { bookmark: u.searchParams.get('bookmark') } : { at: Number(u.searchParams.get('at')) });
  if (op === 'do') {
    const r = await rewindDo(V.room, { token: u.searchParams.get('token'), confirm: u.searchParams.get('confirm') });
    /* the restart a moment after the answer (restore.js ABORT_MS): the
       runner's own wait for it is fast-forwarded here, so wait it out */
    await new Promise((res) => realSetTimeout(res, 120));
    return r;
  }
  return { error: 'unknown op' };
}
globalThis.fetch = async (url, init) => {
  const u = new URL(String(url));
  const json = (j, status = 200) => ({ ok: status < 400, status, json: async () => j, text: async () => JSON.stringify(j) });
  if (u.hostname === 'brotown-lab.test.workers.dev') {
    if (u.pathname === '/') return { ok: true, status: 200, text: async () => 'brotown-lab' };
    if (u.pathname === '/whoami') return json({ isolate: 'w1', colo: 'TST' });
    if (u.pathname === '/burn') {
      if (refused()) return json({ refused: WORDS, name: 'Error' }, 503);
      count(1);
      return json({ isolate: 'i-' + u.searchParams.get('name'), colo: 'TST', iters: +u.searchParams.get('iters'), x: 1, entry: 'TST', workerIsolate: 'w1' });
    }
    if (u.pathname === '/vault') return json(await vaultOp(u));   /* v2.3.5288 */
    if (u.pathname === '/door') {
      const n = +u.searchParams.get('n'), mode = u.searchParams.get('mode');
      if (refused()) return json({ refused: WORDS, name: 'Error' }, 503);
      if (mode === 'flood-rpc' && n + 3 > 1000) return { ok: false, status: 500, text: async () => '<!DOCTYPE html><html>error 1101</html>' };
      if (mode.startsWith('rtt')) return json({ mode, n, rttMs: { n, p50: 1, p95: 2, p99: 2, max: 3 }, where: { door: 'A', world: 'B' } });
      const worldId = 'obj-' + (u.searchParams.get('world') || 'w').replace(/[^a-z0-9]/gi, '');
      globalThis.__worlds.add(worldId);
      /* the Door, the World's "where", its socket, the messages, ~2 polls */
      count(3 + n + 2);
      return json({ mode, n, worldGot: n, wallMs: 10, usPerMsg: 1, where: { door: 'A', world: 'B' }, worldId });
    }
  }
  /* the game's auction listing (the limit test's --game-probe), read only */
  if (u.hostname === 'api.brotown.net') {
    if (u.pathname !== '/api/store/browse') throw new Error('the fake game has only its auction listing: ' + url);
    if (refused()) return { ok: false, status: 500, text: async () => WORDS };
    count(1);
    return json({ ok: true, listings: [] });
  }
  if (u.hostname === 'api.cloudflare.com') {
    if (u.pathname.endsWith('/accounts')) return json({ result: [{ id: 'acct1234567890' }] });
    if (u.pathname.includes('/durable_objects/namespaces')) return json({ result: [{ id: 'nsG', script: 'brotown-server', class: 'GameRoom' }, { id: 'nsW', script: 'brotown-lab', class: 'World' }] });
    if (u.pathname.endsWith('/graphql')) {
      const body = JSON.parse(init.body);
      if (body.query.includes('__type')) { const t = types[body.variables.n]; return json({ data: { __type: t ? { name: body.variables.n, ...t } : null } }); }
      globalThis.__q.push(body.query);
      const inv = body.query.includes('Invocations');
      const busy = MODE === 'busy';
      const row = inv ? { count: busy ? 88000 : 500, sum: { requests: busy ? 88000 : 500, wallTime: 1 } } : { sum: { activeTime: 3600e6, cpuTime: 10e6, inboundWebsocketMsgCount: 20000, outboundWebsocketMsgCount: 90000, rowsRead: 10, rowsWritten: 5 } };
      if (body.query.includes('dimensions { objectId }')) {
        const rows = [...globalThis.__worlds].map((objectId, i) => ({ dimensions: { objectId }, sum: { activeTime: 1e6, cpuTime: 1000 * (i + 1), inboundWebsocketMsgCount: 100, outboundWebsocketMsgCount: 0, rowsRead: 0, rowsWritten: 0 } }));
        return json({ data: { viewer: { accounts: [{ g: rows }] } } });
      }
      return json({ data: { viewer: { accounts: [{ g: [row] }] } } });
    }
  }
  throw new Error('unexpected fetch ' + url);
};
process.on('exit', (c) => { if (process.env.FAKE_TRACE) console.error('[fake] graphql data queries:', globalThis.__q.length, 'quota', JSON.stringify(quota), 'exit', c); });
