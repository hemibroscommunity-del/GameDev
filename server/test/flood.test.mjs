/* ═══ v2.3.3274: ONE SOCKET CANNOT STOP THE GAME (server/src/flood.js) ═══
 *
 * The owner, after the anti-bot review: "start on the urgent five".  Each of
 * these let one script stop the game for everyone on the free plan's daily
 * limits (docs/specs/antibot-review.md, Part 2; docs/specs/one-socket.md).
 *
 *   1. junk frames: `null`, a number, a string -- taken as nothing, no throw;
 *   2. rooms: the worker makes only the main room and the names ROOMS lists,
 *      anything on a local host; `?room=<other>` is a 404 on every route and
 *      never reaches a Durable Object;
 *   3. the budget per socket: a burst, a sustained rate, drops past it, the
 *      socket closed when it keeps flooding; a bundle's parts count one each;
 *      an honest phone's rate is never touched;
 *   4. the door: nothing before the join is taken; a socket that never joins
 *      is closed after its window (and only one that came through fetch);
 *      a second join on a socket closes it, leaving no ghost;
 *   5. addresses: so many sockets, so many opens a minute, each a live flag,
 *      none locally;
 *   6. writes: a mute that changes nothing writes nothing; toggles are paced
 *      and the held change is written at the flush; a stat flood writes the
 *      burst and then rides the regen window; the same slot again writes
 *      nothing; a build point that changed nothing writes nothing; a DM
 *      spends the chat lane;
 *   7. the close codes are the room's own, none the client reads as idle,
 *      frozen, full, reset or a linger.
 */
import worker, { GameRoom } from '../src/index.js';
import { FLOOD, PACE, ROOMS, roomNameFor, requestIp } from '../src/flood.js';
import { CHAT_LANES } from '../src/chatlanes.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

let NOW = 1_800_000_000_000;
Date.now = () => NOW;

/* ── storage that counts every row written ── */
function makeState() {
  const store = new Map();
  const st = {
    writes: 0,
    storage: {
      get: async (k) => (Array.isArray(k) ? new Map(k.filter((x) => store.has(x)).map((x) => [x, store.get(x)])) : store.get(k)),
      put: async (k, v) => { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) { st.writes++; store.set(kk, vv); } return; } st.writes++; store.set(k, v); },
      list: async (opts) => { const out = new Map(); for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v); return out; },
      delete: async (k) => { st.writes++; return store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
  return st;
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };

/* ── workerd stand-ins (the roomfull.test.mjs set) ── */
function fakeWs(label) {
  return {
    label, sent: [], closed: null, accepted: false,
    accept() { this.accepted = true; },
    send(s) { this.sent.push(JSON.parse(s)); },
    close(code, reason) { this.closed = { code, reason }; },
  };
}
let lastPair = null;
globalThis.WebSocketPair = function WebSocketPair() {
  lastPair = { 0: fakeWs('client'), 1: fakeWs('server') };
  return lastPair;
};
const NativeResponse = globalThis.Response;
globalThis.Response = class {
  constructor(body, init) {
    this.body = body;
    this.status = (init && init.status) || 200;
    this.webSocket = (init && init.webSocket) || null;
    this.headers = (init && init.headers) || {};
  }
};
const wsRequest = (query, headers) => ({
  url: 'https://worker.example/ws' + (query || ''),
  headers: { get: (k) => (k === 'Upgrade' ? 'websocket' : (headers && headers[k]) || null) },
  method: 'GET',
});

function makeRoom() {
  const state = makeState();
  const room = new GameRoom(state, mockEnv);
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => { if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; } return 0; };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  room._eventLive = false;
  return { room, state, tick: () => tickFn && tickFn() };
}
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' }; }
async function join(room, id, ws) {
  ws = ws || fakeWs(id);
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, protocolVersion: 2, data: { x: 1000, y: 1000, z: 'town' } }));
  return ws;
}
const msg = (ws, room, m) => room.webSocketMessage(ws, JSON.stringify(m));
const sessionOf = (room, ws) => room.sessions.get(ws);

/* ═══ 1. junk frames ═══ */
{
  const { room } = makeRoom();
  const ws = await join(room, 'bp_junk');
  let threw = null;
  for (const frame of ['null', '42', '"hello"', 'true', '[null, 1, "x"]']) {
    try { await room.webSocketMessage(ws, frame); } catch (e) { threw = frame + ': ' + e.message; }
  }
  check('1. null, a number, a string and a bundle of them are taken as nothing', threw === null && room.sessions.has(ws) && !!room.playerState.bp_junk, threw);
}

/* ═══ 2. rooms ═══ */
{
  const u = (s) => new URL(s);
  check('2. no ?room= is the main room', roomNameFor(u('https://api.brotown.net/ws'), {}) === ROOMS.MAIN);
  check('2. the main room by name', roomNameFor(u('https://api.brotown.net/ws?room=brotown-1'), {}) === 'brotown-1');
  check('2. any other name is refused on a real host', roomNameFor(u('https://api.brotown.net/ws?room=evil7'), {}) === null);
  check('2. ...unless ROOMS lists it', roomNameFor(u('https://api.brotown.net/ws?room=private-x'), { ROOMS: 'brotown-1, private-x' }) === 'private-x');
  check('2. ...and ROOMS does not open the rest', roomNameFor(u('https://api.brotown.net/ws?room=evil7'), { ROOMS: 'brotown-1, private-x' }) === null);
  check('2. a local host makes any room (the QA tools\' ?room=qa1)',
    roomNameFor(u('http://localhost:8787/ws?room=qa1'), {}) === 'qa1' && roomNameFor(u('http://127.0.0.1:8787/api/market?room=load-3'), {}) === 'load-3');
  check('2. a spaced name is trimmed, an empty one is the main room', roomNameFor(u('https://api.brotown.net/ws?room=%20'), {}) === ROOMS.MAIN);
  /* the worker's routes: a refused name never reaches a Durable Object */
  const got = [];
  const env = {
    ...mockEnv,
    GAME_ROOM: { idFromName: (n) => 'id:' + n, get: (id) => ({ fetch: async () => { got.push(id); return new Response('ok'); } }) },
    FEEDBACK: { idFromName: () => 'fb', get: () => ({ fetch: async () => new Response('ok') }) },
  };
  const req = (path, host) => ({ url: 'https://' + (host || 'api.brotown.net') + path, method: 'GET', headers: { get: (k) => (k === 'Upgrade' ? 'websocket' : null) } });
  const refused = [];
  for (const p of ['/ws?room=evil', '/api/market/book?room=evil', '/api/store/browse?room=evil', '/api/botstat?room=evil', '/api/arena/status?room=evil', '/api/account/check?room=evil', '/api/admin/overview?room=evil']) {
    const r = await worker.fetch(req(p), env);
    refused.push(r.status);
  }
  check('2. every route answers 404 for a room the worker does not make', refused.every((s) => s === 404) && got.length === 0, { refused, got });
  await worker.fetch(req('/ws?room=brotown-1'), env);
  await worker.fetch(req('/ws'), env);
  await worker.fetch(req('/api/market/book'), env);
  check('2. the main room is reached by name and by default, on every route', got.length === 3 && got.every((g) => g === 'id:brotown-1'), got);
  got.length = 0;
  await worker.fetch(req('/ws?room=qa1', 'localhost:8787'), env);
  check('2. a local host reaches qa1', got[0] === 'id:qa1', got);
  check('2. requestIp: none locally, loopback never, an edge address as given',
    requestIp({ headers: { get: () => null } }) === null && requestIp({ headers: { get: () => '127.0.0.1' } }) === null
    && requestIp({ headers: { get: () => ' 203.0.113.9 ' } }) === '203.0.113.9' && requestIp(null) === null);
}

/* ═══ 3. the budget per socket ═══ */
{
  const { room } = makeRoom();
  const ws = await join(room, 'bp_flood');
  const s = sessionOf(room, ws);
  const spent0 = FLOOD.MSG_BURST - s.msgTokens;   /* the join itself */
  for (let i = 0; i < FLOOD.MSG_BURST + 100; i++) await msg(ws, room, { type: 'pong', ts: 1 });
  check('3. a burst past MSG_BURST at one instant: the rest are dropped, the socket kept',
    s.msgDropped === 100 + spent0 && room.sessions.has(ws), { dropped: s.msgDropped, spent0 });
  NOW += 1000;
  for (let i = 0; i < FLOOD.MSG_PER_S; i++) await msg(ws, room, { type: 'pong', ts: 1 });
  const droppedBefore = s.msgDropped;
  await msg(ws, room, { type: 'pong', ts: 1 });
  check('3. a second later MSG_PER_S more are taken, the next dropped', s.msgDropped === droppedBefore + 1 && s.msgTokens < 1, { dropped: s.msgDropped, tokens: s.msgTokens });
  /* a bundle's parts count one each */
  NOW += 10000;
  await msg(ws, room, { type: 'pong', ts: 1 });
  const tokensBefore = s.msgTokens;
  const bundle = []; for (let i = 0; i < 24; i++) bundle.push({ type: 'pong', ts: 1 });
  await room.webSocketMessage(ws, JSON.stringify(bundle));
  check('3. a bundle of 24 spends 24', Math.round(tokensBefore - s.msgTokens) === 24, { tokensBefore, after: s.msgTokens });
  /* keep flooding: closed */
  NOW += 10000;
  let closedAt = null;
  for (let i = 0; i < FLOOD.MSG_BURST + FLOOD.MSG_CLOSE_AFTER + 5; i++) {
    await msg(ws, room, { type: 'pong', ts: 1 });
    if (!room.sessions.has(ws)) { closedAt = i; break; }
  }
  check('3. a socket that keeps flooding is closed with CLOSE_FLOOD, its player gone',
    closedAt !== null && ws.closed && ws.closed.code === FLOOD.CLOSE_FLOOD && !room.playerState.bp_flood, { closedAt, closed: ws.closed });
  /* an honest phone: 100 messages a second for 30 s, never a drop */
  const ws2 = await join(room, 'bp_honest');
  const s2 = sessionOf(room, ws2);
  for (let i = 0; i < 3000; i++) { NOW += 10; await msg(ws2, room, { type: 'pong', ts: 1 }); }
  check('3. 100 messages a second for 30 s: nothing dropped', !s2.msgDropped && room.sessions.has(ws2), { dropped: s2.msgDropped });
  /* the busiest honest frame: 30 bundles a second of 3 parts, for 30 s */
  for (let i = 0; i < 900; i++) { NOW += 33; await room.webSocketMessage(ws2, JSON.stringify([{ type: 'pong', ts: 1 }, { type: 'pong', ts: 1 }, { type: 'pong', ts: 1 }])); }
  check('3. 30 bundles a second of three parts for 30 s: nothing dropped', !s2.msgDropped, { dropped: s2.msgDropped });
}

/* ═══ 4. the door ═══ */
{
  const { room } = makeRoom();
  const ws = fakeWs('pre');
  room.sessions.set(ws, { ...baseSession(), openedAt: NOW });
  const s = sessionOf(room, ws);
  const recv0 = s.lastRecv;
  NOW += 5000;
  await msg(ws, room, { type: 'chat', payload: { text: 'hello' } });
  await msg(ws, room, { type: 'move', x: 5, y: 5, z: 'town' });
  await msg(ws, room, { type: 'hi' });
  check('4. before the join nothing is taken: no relay, no player, the AFK clock untouched',
    room.eventBuffer.length === 0 && Object.keys(room.playerState).length === 0 && s.lastRecv === recv0, { events: room.eventBuffer.length, recv: s.lastRecv - recv0 });
  room._tickPingAndAfk(NOW);
  check('4. inside the window the socket is kept and pinged', room.sessions.has(ws) && ws.sent.some((m) => m.type === 'ping'));
  NOW += FLOOD.JOIN_WINDOW_MS;
  room._tickPingAndAfk(NOW);
  check('4. a socket that never joined is closed after JOIN_WINDOW_MS with CLOSE_JOIN', !room.sessions.has(ws) && ws.closed && ws.closed.code === FLOOD.CLOSE_JOIN, ws.closed);
  /* one that joined in time, and one a test made by hand, are kept */
  const ws2 = fakeWs('joined');
  room.sessions.set(ws2, { ...baseSession(), openedAt: NOW });
  await msg(ws2, room, { type: 'join', id: 'bp_door', name: 'D', protocolVersion: 2, data: { x: 1000, y: 1000, z: 'town' } });
  const ws3 = fakeWs('hand');
  room.sessions.set(ws3, baseSession());
  NOW += FLOOD.JOIN_WINDOW_MS + 1;
  sessionOf(room, ws2).lastRecv = NOW; sessionOf(room, ws3).lastRecv = NOW;
  room._tickPingAndAfk(NOW);
  check('4. a joined socket and a hand-made session are kept', room.sessions.has(ws2) && room.sessions.has(ws3));
  /* a second join on the socket */
  await msg(ws2, room, { type: 'join', id: 'bp_ghost', name: 'G', protocolVersion: 2, data: { x: 1000, y: 1000, z: 'town' } });
  check('4. a second join on a socket closes it with CLOSE_JOIN, and leaves no ghost',
    !room.sessions.has(ws2) && ws2.closed && ws2.closed.code === FLOOD.CLOSE_JOIN && !room.playerState.bp_ghost && !room.playerState.bp_door,
    { closed: ws2.closed, players: Object.keys(room.playerState) });
  /* a pong before the join is still answered as a pong, not dropped as junk */
  const ws4 = fakeWs('pong');
  room.sessions.set(ws4, { ...baseSession(), openedAt: NOW, lastPing: NOW - 50 });
  await msg(ws4, room, { type: 'pong', ts: NOW - 50 });
  check('4. a pong before the join is measured as one', sessionOf(room, ws4).rtt !== 80, sessionOf(room, ws4).rtt);
}

/* ═══ 5. addresses ═══ */
{
  const { room, state } = makeRoom();
  const IP = '203.0.113.5';
  const opened = [];
  const open = async (ip, rf) => {
    lastPair = null;
    const res = await room.fetch(wsRequest(rf === false ? '' : '?rf=1', ip ? { 'CF-Connecting-IP': ip } : null));
    if (res.status === 101 && lastPair && !lastPair[1].closed) opened.push(lastPair[1]);
    return { res, srv: lastPair && lastPair[1] };
  };
  for (let i = 0; i < FLOOD.IP_SOCKETS; i++) await open(IP);
  check('5. IP_SOCKETS sockets from one address are let in', opened.length === FLOOD.IP_SOCKETS && room.sessions.size === FLOOD.IP_SOCKETS, { opened: opened.length, sessions: room.sessions.size });
  {
    const { srv } = await open(IP);
    const m = srv && srv.sent[0];
    check('5. the next is refused the way a full room is, with reason "ip"', m && m.type === 'room_full' && m.reason === 'ip' && srv.closed && room.sessions.size === FLOOD.IP_SOCKETS, { m, closed: srv && srv.closed });
  }
  {
    const { res } = await open('198.51.100.7');
    check('5. another address is let in', res.status === 101 && room.sessions.size === FLOOD.IP_SOCKETS + 1, res.status);
  }
  {
    const { res } = await open(null);
    check('5. a request with no address (a local test) is never counted', res.status === 101, res.status);
  }
  room.sessions.delete(opened[0]);
  {
    const { res } = await open(IP);
    check('5. a place freed by that address is its to take again', res.status === 101, res.status);
  }
  /* the live flag: 0 switches the socket limit off */
  room._liveFlags = { ip_sockets: 0 };
  {
    const { res } = await open(IP);
    check('5. ip_sockets 0 lifts the limit', res.status === 101, res.status);
  }
  /* opens a minute: with the socket limit off, open and drop until refused */
  room._liveFlags = { ip_sockets: 0 };
  const IP2 = '203.0.113.77';
  let letIn = 0;
  for (let i = 0; i < FLOOD.IP_JOINS_PER_MIN + 5; i++) {
    lastPair = null;
    const r = await room.fetch(wsRequest('?rf=1', { 'CF-Connecting-IP': IP2 }));
    if (r.status === 101 && lastPair && !lastPair[1].closed) { letIn++; room.sessions.delete(lastPair[1]); }
  }
  check('5. IP_JOINS_PER_MIN opens a minute from one address, the rest refused', letIn === FLOOD.IP_JOINS_PER_MIN, letIn);
  NOW += 60001;
  {
    const { res } = await open(IP2);
    check('5. a minute later the address may open again', res.status === 101, res.status);
  }
  room._liveFlags = { ip_sockets: 0, ip_joins_min: 0 };
  let letIn2 = 0;
  for (let i = 0; i < FLOOD.IP_JOINS_PER_MIN + 5; i++) {
    lastPair = null;
    const r = await room.fetch(wsRequest('?rf=1', { 'CF-Connecting-IP': '203.0.113.78' }));
    if (r.status === 101 && lastPair && !lastPair[1].closed) { letIn2++; room.sessions.delete(lastPair[1]); }
  }
  check('5. ip_joins_min 0 lifts that limit too', letIn2 === FLOOD.IP_JOINS_PER_MIN + 5, letIn2);
  check('5. an accepted session carries its address and its opening time',
    [...room.sessions.values()].some((s) => s.ip === IP && typeof s.openedAt === 'number'));
  void state;
}

/* ═══ 6. writes ═══ */
/* 100 messages a second here (NOW += 10): within the socket's budget, so
   what is measured is the writes, not §3 */
{
  const { room, state, tick } = makeRoom();
  const ws = await join(room, 'bp_writer');
  const ws2 = await join(room, 'bp_other');
  await new Promise((r) => setImmediate(r));
  const rows = () => state.writes;
  /* a mute that changes nothing */
  let w0 = rows();
  ws.sent.length = 0;
  for (let i = 0; i < 200; i++) { NOW += 10; await msg(ws, room, { type: 'chat_mute', payload: { target: 'bp_nobody', on: false } }); }
  check('6. un-muting someone never muted, 200 times: no row written, the list still answered',
    rows() === w0 && ws.sent.filter((m) => m.type === 'chat_mute_list').length === 200, { rows: rows() - w0, lists: ws.sent.filter((m) => m.type === 'chat_mute_list').length });
  /* toggles are paced */
  w0 = rows();
  /* 101 toggles: on, off, on ... on.  The burst writes the first ten (the
     tenth an "off"); the in-memory list ends ON, and the flush writes that. */
  for (let i = 0; i < 101; i++) { NOW += 10; await msg(ws, room, { type: 'chat_mute', payload: { target: 'bp_other', on: i % 2 === 0, name: 'O' } }); }
  const toggled = rows() - w0;
  check('6. 101 mute toggles write the lane\'s burst, no more', toggled === PACE.MUTE.BURST, toggled);
  check('6. ...the in-memory list is the truth (on, after an odd number of toggles)', room._chatModMuted('bp_writer', 'bp_other'));
  const storedMid = await state.storage.get('chat_mute:bp_writer');
  check('6. ...and the last written copy is behind it (off)', !!storedMid && !(storedMid.list && storedMid.list.bp_other), storedMid);
  room._paceFlush('bp_writer');
  await new Promise((r) => setImmediate(r));
  const storedEnd = await state.storage.get('chat_mute:bp_writer');
  check('6. the flush writes the held change once, and storage matches the list', rows() - w0 === PACE.MUTE.BURST + 1 && !!(storedEnd && storedEnd.list && storedEnd.list.bp_other), { rows: rows() - w0, storedEnd });
  /* a stat flood */
  w0 = rows();
  for (let i = 0; i < 200; i++) { NOW += 10; await msg(ws, room, { type: 'stats_update', payload: { def: 10 + (i % 2) } }); }
  const statRows = rows() - w0;
  const ps = room.playerState.bp_writer;
  check('6. 200 defence flips write the record burst, then mark the record dirty', statRows === PACE.RPG.BURST && ps._regenDirty === true, { statRows, dirty: ps._regenDirty });
  NOW += room.REGEN_SAVE_MS + 1000;
  room._tickPlayerRegen();
  await new Promise((r) => setImmediate(r));
  check('6. ...which the regen tick writes once, within REGEN_SAVE_MS', rows() - w0 === PACE.RPG.BURST + 1 && ps._regenDirty === false, { rows: rows() - w0, dirty: ps._regenDirty });
  /* the same slot again */
  w0 = rows();
  NOW += 10 * 60000;   /* a fresh burst */
  await msg(ws, room, { type: 'set_active_slot', payload: { slot: 'ranged' } });
  const oneRow = rows() - w0;
  for (let i = 0; i < 100; i++) { NOW += 10; await msg(ws, room, { type: 'set_active_slot', payload: { slot: 'ranged' } }); }
  check('6. the active slot: a change writes once, the same slot again writes nothing', oneRow === 1 && rows() - w0 === 1 && ps.activeSlot === 'ranged', { oneRow, total: rows() - w0 });
  /* a build point that changed nothing */
  w0 = rows();
  for (let i = 0; i < 100; i++) { NOW += 10; await msg(ws, room, { type: 'build_point_earned' }); }
  check('6. 100 build points that changed no level or pool write nothing', rows() - w0 === 0, rows() - w0);
  /* a DM spends the chat lane */
  ws.sent.length = 0;
  for (let i = 0; i < 20; i++) { NOW += 10; await msg(ws, room, { type: 'friend_dm', payload: { to: 'bp_other', text: 'hi ' + i } }); }
  const errs = ws.sent.filter((m) => m.type === 'friend_error').length;
  check('6. 20 DMs at once: the chat lane\'s burst get through (here to a not-friend error), the rest are dropped', errs === CHAT_LANES.BURST, errs);
  void ws2; void tick;
}

/* ═══ 7. the close codes ═══ */
{
  const known = [4003, 4004, 4005, 4006, 4009, 4010];
  check('7. CLOSE_JOIN and CLOSE_FLOOD are the room\'s own, not a code the client reads as something else',
    !known.includes(FLOOD.CLOSE_JOIN) && !known.includes(FLOOD.CLOSE_FLOOD) && FLOOD.CLOSE_JOIN !== FLOOD.CLOSE_FLOOD);
  check('7. the budget sits well above a phone: MSG_PER_S >= 4 x 30 frames, MSG_BURST >= 2 s of it', FLOOD.MSG_PER_S >= 120 && FLOOD.MSG_BURST >= 2 * FLOOD.MSG_PER_S);
}

globalThis.Response = NativeResponse;
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
