/* ═══ v2.3.3252: THE LAB SELF-TEST'S FAKES (tools/lab/selftest.mjs preloads this) ═══
   A fake lab worker at https://brotown-lab.test.workers.dev and a fake
   Cloudflare API, and quick timers, so run.mjs runs whole with no Cloudflare.
   FAKE_DAY=busy makes the account's day 89% used. */
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms, ...a) => realSetTimeout(fn, ms > 200 ? 1 : ms, ...a);
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
globalThis.fetch = async (url, init) => {
  const u = new URL(String(url));
  const json = (j, status = 200) => ({ ok: status < 400, status, json: async () => j, text: async () => JSON.stringify(j) });
  if (u.hostname === 'brotown-lab.test.workers.dev') {
    if (u.pathname === '/') return { ok: true, status: 200, text: async () => 'brotown-lab' };
    if (u.pathname === '/whoami') return json({ isolate: 'w1', colo: 'TST' });
    if (u.pathname === '/burn') return json({ isolate: 'i-' + u.searchParams.get('name'), colo: 'TST', iters: +u.searchParams.get('iters'), x: 1, entry: 'TST', workerIsolate: 'w1' });
    if (u.pathname === '/door') {
      const n = +u.searchParams.get('n'), mode = u.searchParams.get('mode');
      if (mode === 'flood-rpc' && n + 3 > 1000) return { ok: false, status: 500, text: async () => '<!DOCTYPE html><html>error 1101</html>' };
      if (mode.startsWith('rtt')) return json({ mode, n, rttMs: { n, p50: 1, p95: 2, p99: 2, max: 3 }, where: { door: 'A', world: 'B' } });
      const worldId = 'obj-' + (u.searchParams.get('world') || 'w').replace(/[^a-z0-9]/gi, '');
      globalThis.__worlds.add(worldId);
      return json({ mode, n, worldGot: n, wallMs: 10, usPerMsg: 1, where: { door: 'A', world: 'B' }, worldId });
    }
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
process.on('exit', (c) => { if (process.env.FAKE_TRACE) console.error('[fake] graphql data queries:', globalThis.__q.length, 'exit', c); });
