/* ═══ v2.3.5726: THE OWNER'S ROUTES WITH NO KEY, ANSWERED AT THE EDGE (card K2 PR 7) ═══
 *
 * The planning session's addendum to card K2 (2026-11-17), item 7:
 * `/api/admin*` and `/api/botstat*` requests with no key woke the room for
 * every one, and the room refused them (admin.js _adminAuth, botfp.js
 * _botfpAdminFetch).  The outer router (index.js routeHttp, wire/door.js
 * edgeKeyRefusal) now answers them itself.  This holds:
 *
 *   1. an admin request with no `Authorization: Bearer`: the room's own 401
 *      (the worker has a key) or 404 (it has none), byte for byte, and the
 *      room is never asked;
 *   2. a botstat request with neither `Authorization: Bearer` nor
 *      `x-admin-key`: the room's plain 404, the room never asked;
 *   3. a request WITH a header goes to the room, as before (a wrong key is
 *      the room's to judge and count); a room the worker does not make is
 *      still 'no such room' first; every other route is untouched;
 *   4. `EDGE_GUARD = "off"` (the worker's setting): every one goes on.
 *
 * Red on main (v2.3.5719): 1 and 2 (the room is asked). */
import worker, { GameRoom } from '../src/index.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const memState = () => {
  const store = new Map();
  return { storage: { get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); }, list: async () => new Map(), delete: async (k) => store.delete(k) }, getWebSockets: () => [], acceptWebSocket: () => {} };
};
/* the outer worker over a real room, counting what reaches it */
function envOf(extra = {}) {
  const roomEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) }, ...extra };
  const room = new GameRoom(memState(), roomEnv);
  const seen = { n: 0 };
  return {
    room, seen,
    env: { ...roomEnv, GAME_ROOM: { idFromName: () => 'brotown-1', get: () => ({ fetch: async (req) => { seen.n++; return room.fetch(req); } }) } },
  };
}
const req = (path, headers = {}, method = 'GET') => new Request('https://api.brotown.net' + path, { method, headers });
const same = async (a, b) => a.status === b.status && (await a.text()) === (await b.text());

/* ── 1. admin with no key ── */
{
  const { env, seen, room } = envOf({ ADMIN_KEY: 'k-owner' });
  for (const [path, method] of [['/api/admin/overview', 'GET'], ['/api/admin/flags', 'POST'], ['/api/admin/dev/state?id=bp_x', 'GET']]) {
    const before = seen.n;
    const r = await worker.fetch(req(path, {}, method), env);
    const own = await room.fetch(req(path, {}, method));
    check('1. ' + method + ' ' + path + ' with no key: the room\'s own 401, byte for byte', r.status === 401 && await same(r, own), r.status);
    check('1. ...and the room is never asked', seen.n === before, seen.n - before);
  }
  const r2 = await worker.fetch(req('/api/admin/overview', { Authorization: 'Basic abc' }), env);
  check('1. a header that is not `Bearer <key>` is no key: 401 at the edge', r2.status === 401 && seen.n === 0, { status: r2.status, n: seen.n });
  const r3 = await worker.fetch(req('/api/admin/overview', { Authorization: 'Bearer ' }), env);
  check('1. ...nor is an empty Bearer', r3.status === 401 && seen.n === 0, { status: r3.status, n: seen.n });
  const none = envOf({});
  const r4 = await worker.fetch(req('/api/admin/overview'), none.env);
  const own4 = await none.room.fetch(req('/api/admin/overview'));
  check('1. a worker with no ADMIN_KEY: the room\'s own 404 (the surface does not exist), never asked', r4.status === 404 && await same(r4, own4) && none.seen.n === 0, { status: r4.status, n: none.seen.n });
}

/* ── 2. botstat with no key ── */
{
  const { env, seen, room } = envOf({ ADMIN_KEY: 'k-owner' });
  for (const path of ['/api/botstat', '/api/botstat?id=bp_x', '/api/botstat?flagged=1']) {
    const before = seen.n;
    const r = await worker.fetch(req(path), env);
    const own = await room.fetch(req(path));
    check('2. ' + path + ' with no key: the room\'s plain 404, byte for byte, never asked', r.status === 404 && await same(r, own) && seen.n === before, { status: r.status, n: seen.n - before });
  }
}

/* ── 3. with a header: to the room, as before ── */
{
  const { env, seen } = envOf({ ADMIN_KEY: 'k-owner' });
  const r1 = await worker.fetch(req('/api/admin/overview', { Authorization: 'Bearer k-owner' }), env);
  check('3. the owner\'s key goes to the room and is answered (200)', r1.status === 200 && seen.n === 1, { status: r1.status, n: seen.n });
  const r2 = await worker.fetch(req('/api/admin/overview', { Authorization: 'Bearer wrong' }), env);
  check('3. a wrong key goes to the room, which judges it (401)', r2.status === 401 && seen.n === 2, { status: r2.status, n: seen.n });
  const r3 = await worker.fetch(req('/api/botstat?flagged=1', { 'x-admin-key': 'k-owner' }), env);
  check('3. botstat\'s own header (x-admin-key) goes to the room', r3.status === 200 && seen.n === 3, { status: r3.status, n: seen.n });
  const r4 = await worker.fetch(req('/api/admin/overview?room=nowhere'), env);
  check('3. a room the worker does not make is still \'no such room\' first', r4.status === 404 && /no such room/.test(await r4.text()), r4.status);
  const r5 = await worker.fetch(req('/api/market/orders?category=wood'), env);
  check('3. every other route is untouched (a market read reaches the room)', r5.status === 200 && seen.n === 4, { status: r5.status, n: seen.n });
  const r6 = await worker.fetch(new Request('https://api.brotown.net/api/admin/overview', { method: 'OPTIONS' }), env);
  check('3. a preflight (OPTIONS) is answered as before', r6.status === 200, r6.status);
}

/* ── 4. the lever ── */
{
  const { env, seen } = envOf({ ADMIN_KEY: 'k-owner', EDGE_GUARD: 'off' });
  const r1 = await worker.fetch(req('/api/admin/overview'), env);
  const r2 = await worker.fetch(req('/api/botstat'), env);
  check('4. `EDGE_GUARD = "off"`: both go to the room, as before (the room\'s own 401 and 404)', r1.status === 401 && r2.status === 404 && seen.n === 2, { a: r1.status, b: r2.status, n: seen.n });
}

console.log(failed === 0 ? '\nALL PASS (' + passed + ')' : '\n' + failed + ' FAILURE(S)');
process.exit(failed === 0 ? 0 : 1);
