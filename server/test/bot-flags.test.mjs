/* BOT FLAGS WHERE THE OWNER CAN SEE THEM (v2.3.3323).
 *
 * The anti-bot review's fix 9 (docs/specs/antibot-review.md §3: "Nobody sees
 * the flags, and a flag changes nothing"; the owner: "Yes" to the bot farming
 * holes).  botfp.js has written flags to `botstat:` since v2.3.1146, readable
 * only by a curl command with the key in `x-admin-key`, the one admin header
 * no other command used.  What this suite pins:
 *   1. the list (_botfpFlaggedList): only flagged players, stored and in
 *      memory merged with the live record winning, a name and "online" for a
 *      player who is here, newest flag first, every kind once, capped at 50;
 *   2. the route the Test panel calls (GET /dev/botflags): behind the admin
 *      key like every dev route -- 404 with no key configured, 401 with a
 *      wrong one -- and read-only (nothing written);
 *   3. the test flag (POST /dev/botflag): kind 'test', past the hour's gap,
 *      only for a player who is here (a fresh record would be written over a
 *      stored one), and it lists;
 *   4. /api/botstat takes the key in either header now, the Bearer one
 *      OPERATIONS.md teaches; still a 404 to anyone without it;
 *   5. no websocket message reaches any of it. */
import { GameRoom } from '../src/index.js';
import { BOTFP } from '../src/botfp.js';

const KEY = 'test-admin-key-bot-flags';
function makeState() {
  const store = new Map();
  let puts = 0;
  return {
    store, puts: () => puts,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { puts++; if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { if (Array.isArray(k)) { for (const kk of k) store.delete(kk); } else store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const envWith = (k) => ({ LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) }, ...(k ? { ADMIN_KEY: k } : {}) });
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const adminReq = (path, key, body) => new Request('https://w/api/admin' + path, {
  method: body ? 'POST' : 'GET',
  headers: Object.assign(key ? { Authorization: 'Bearer ' + key } : {}, body ? { 'Content-Type': 'application/json' } : {}),
  body: body ? JSON.stringify(body) : undefined,
});
async function join(room, id, name) {
  const ws = fakeWs(id);
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name, phrase: 'p-' + id, protocolVersion: 2, data: { x: 500, y: 500, z: 'meadow' } }));
  return ws;
}
const flagRec = (at, kind, extra) => Object.assign({
  v: 1, counters: { strikes: 40, noFpStrikes: 3 }, score: 12.34, updatedAt: at,
  flags: [{ at, kind, detail: { score: 12.3 }, counters: {} }],
}, extra || {});

// ── 1. the list ──
{
  const state = makeState();
  const room = new GameRoom(state, envWith(KEY));
  check('1. nobody flagged: an empty list', (await room._botfpFlaggedList()).length === 0);
  const T = Date.now();
  state.store.set('botstat:bp_old', flagRec(T - 3600000, 'variance-collapse'));
  state.store.set('botstat:bp_new', flagRec(T - 60000, 'device-fleet', { flags: [
    { at: T - 7200000, kind: 'suspicion-threshold', detail: { score: 11 } },
    { at: T - 60000, kind: 'device-fleet', detail: { activeIds: ['a', 'b', 'c', 'd'] } },
  ] }));
  state.store.set('botstat:bp_clean', { v: 1, counters: { strikes: 900 }, score: 0, flags: [], updatedAt: T });
  state.store.set('botstat:bp_noflags', { v: 1, counters: {}, score: 0, updatedAt: T });
  await join(room, 'bp_live', 'Livebro');
  const rec = room._botfpRecord('bp_live', T);
  rec.counters.strikes = 77; rec.score = 15.55;
  rec.flags.push({ at: T - 1000, kind: 'suspicion-threshold', detail: { score: 15.5 } });
  state.store.set('botstat:bp_live', flagRec(T - 50000, 'suspicion-threshold', { counters: { strikes: 10 } }));   /* an older write */
  const list = await room._botfpFlaggedList();
  const ids = list.map((x) => x.id);
  check('1. only the flagged are listed (never a clean or flagless record)', ids.length === 3 && !ids.includes('bp_clean') && !ids.includes('bp_noflags'), ids);
  check('1. newest flag first', ids.join(',') === 'bp_live,bp_new,bp_old', ids);
  const live = list[0];
  check('1. a player who is here: named and online', live.name === 'Livebro' && live.online === true, live);
  check('1. ...and the live record wins over its older write (counters and score)', live.counters.strikes === 77 && live.score === 15.6, { c: live.counters, s: live.score });
  const nw = list[1];
  check('1. a player who is not here: no name, offline', nw.name === null && nw.online === false, nw);
  check('1. ...every kind once, the count and the last flag', nw.flags === 2 && nw.kinds.join(',') === 'suspicion-threshold,device-fleet'
    && nw.last.kind === 'device-fleet' && Array.isArray(nw.last.detail.activeIds), nw);
  check('1. the score is rounded for reading', list[2].score === 12.3, list[2].score);
  for (let i = 0; i < 60; i++) state.store.set('botstat:bp_many' + i, flagRec(T - 10 * i - 5000000, 'variance-collapse'));
  check('1. at most 50 are listed', (await room._botfpFlaggedList()).length === 50);
}

// ── 2. the route ──
{
  const state = makeState();
  const room = new GameRoom(state, envWith(KEY));
  state.store.set('botstat:bp_x', flagRec(Date.now() - 1000, 'suspicion-threshold'));
  const putsBefore = state.puts();
  const r = await room._adminFetch(adminReq('/dev/botflags', KEY));
  const j = await r.json();
  check('2. GET /dev/botflags answers the list', r.status === 200 && j.ok === true && j.flagged.length === 1 && j.flagged[0].id === 'bp_x', j);
  check('2. ...with the score a flag is raised at', j.flagAt === BOTFP.FLAG_AT, j.flagAt);
  check('2. ...and writes nothing (read-only)', state.puts() === putsBefore, { before: putsBefore, after: state.puts() });
  const wrong = await room._adminFetch(adminReq('/dev/botflags', 'nope'));
  check('2. a wrong key is 401', wrong.status === 401, wrong.status);
  const none = await room._adminFetch(adminReq('/dev/botflags', null));
  check('2. no key at all is 401', none.status === 401, none.status);
  const bare = new GameRoom(makeState(), envWith(null));
  const off = await bare._adminFetch(adminReq('/dev/botflags', KEY));
  check('2. with no ADMIN_KEY configured the route is a 404, like every admin route', off.status === 404, off.status);
}

// ── 3. the test flag ──
{
  const state = makeState();
  const room = new GameRoom(state, envWith(KEY));
  await join(room, 'bp_me', 'Ownerbro');
  const r = await room._adminFetch(adminReq('/dev/botflag', KEY, { playerId: 'bp_me' }));
  const j = await r.json();
  check('3. POST /dev/botflag plants a test flag on a player who is here', r.status === 200 && j.ok === true && j.flags === 1, j);
  const list = await room._botfpFlaggedList();
  check('3. ...it lists, kind test, its detail saying it is not evidence', list.length === 1 && list[0].id === 'bp_me' && list[0].last.kind === 'test'
    && /not evidence/.test(list[0].last.detail.note), list);
  check('3. ...and it reached storage (a flag is written at once)', !!(state.store.get('botstat:bp_me') && state.store.get('botstat:bp_me').flags.length === 1));
  const r2 = await room._adminFetch(adminReq('/dev/botflag', KEY, { playerId: 'bp_me' }));
  check('3. a second test flag is not held to the hour\'s gap', (await r2.json()).flags === 2);
  const rec = room._botfpRecord('bp_me', Date.now());
  rec.lastFlagAt = Date.now() - 1000;
  const real = rec.lastFlagAt;
  await room._adminFetch(adminReq('/dev/botflag', KEY, { playerId: 'bp_me' }));
  check('3. ...and leaves a REAL flag\'s hour gap exactly where it was', rec.lastFlagAt === real, { real, now: rec.lastFlagAt });
  const fresh = room._botfpRecord('bp_me', Date.now());
  fresh.lastFlagAt = 0;
  await room._adminFetch(adminReq('/dev/botflag', KEY, { playerId: 'bp_me' }));
  check('3. ...so the next real flag is not held back by a test one', fresh.lastFlagAt === 0, fresh.lastFlagAt);
  state.store.set('botstat:bp_gone', flagRec(Date.now() - 5000, 'variance-collapse', { flags: [{ at: 1, kind: 'variance-collapse' }, { at: 2, kind: 'device-fleet' }] }));
  const g = await room._adminFetch(adminReq('/dev/botflag', KEY, { playerId: 'bp_gone' }));
  check('3. a player who is not here gets none (404), and their stored flags stay as they were',
    g.status === 404 && state.store.get('botstat:bp_gone').flags.length === 2, { status: g.status, flags: state.store.get('botstat:bp_gone').flags.length });
}

// ── 4. /api/botstat, either header ──
{
  const state = makeState();
  const room = new GameRoom(state, envWith(KEY));
  state.store.set('botstat:bp_y', flagRec(Date.now() - 1000, 'suspicion-threshold'));
  const get = (headers) => room._botfpAdminFetch(new Request('https://w/api/botstat?flagged=1', { headers }));
  const viaBearer = await get({ Authorization: 'Bearer ' + KEY });
  const jb = viaBearer.status === 200 ? await viaBearer.json() : null;
  check('4. /api/botstat?flagged=1 takes the Bearer key now', !!jb && jb.flagged.length === 1 && jb.flagged[0].id === 'bp_y', { status: viaBearer.status, jb });
  const viaHeader = await get({ 'x-admin-key': KEY });
  check('4. ...and still the x-admin-key header', viaHeader.status === 200);
  check('4. a wrong Bearer key is a 404 (nothing to probe)', (await get({ Authorization: 'Bearer nope' })).status === 404);
  check('4. no key is a 404', (await get({})).status === 404);
  const bare = new GameRoom(makeState(), envWith(null));
  check('4. no ADMIN_KEY configured: a 404 whatever is presented', (await bare._botfpAdminFetch(new Request('https://w/api/botstat?flagged=1', { headers: { Authorization: 'Bearer ' + KEY } }))).status === 404);
}

// ── 5. no websocket reaches it ──
{
  const state = makeState();
  const room = new GameRoom(state, envWith(KEY));
  const ws = await join(room, 'bp_ws', 'Socketbro');
  const putsBefore = state.puts();
  for (const type of ['dev_botflag', 'botflag', 'dev/botflag', 'botflags']) {
    await room.webSocketMessage(ws, JSON.stringify({ type, payload: { playerId: 'bp_ws' } }));
  }
  const rec = room._botfp && room._botfp.get('bp_ws');
  check('5. no message on the socket plants a flag', !rec || rec.flags.length === 0, rec && rec.flags);
  check('5. ...nor answers with the list', !ws.sent.some((m) => m && m.payload && Array.isArray(m.payload.flagged)));
  void putsBefore;
}

console.log(failures === 0 ? '\nbot-flags: all checks passed' : `\nbot-flags: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
