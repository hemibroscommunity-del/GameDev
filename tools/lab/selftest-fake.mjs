/* ═══ v2.3.3252: THE LAB SELF-TEST'S FAKES (tools/lab/selftest.mjs preloads this) ═══
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
       day's figure and goes back to 0 at midnight, as the free plan's does. */
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
