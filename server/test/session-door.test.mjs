/* ═══ v2.3.4830: THE SESSION DOOR (spec docs/specs/session-door.md; src/leave.js) ═══
 *
 * Every way a player's socket leaves goes through _playerLeaves(ws, why),
 * whose row in LEAVE_WAYS says which duties that way runs.  Step 1 changes
 * nothing a player sees:
 *   1. each way of leaving, played through its REAL entry point (the
 *      runtime's close and error, the AFK sweep, the flood close, the kick,
 *      the device refusal, the reset, a takeover, a takeover mid-fight),
 *      runs exactly the duties it ran before the door, in the same order.
 *      The lists below were recorded by this same play against the code
 *      before v2.3.4830 (the PR says how) -- they are the "before";
 *   2. the session's phase: 'open', then 'joined', then 'gone'; a second
 *      leave of the same socket runs no duty twice;
 *   3. ONE DOOR: a scan of server/src fails a new caller of webSocketClose, a
 *      `sessions.delete` outside leave.js, a leave duty called from anywhere
 *      else, a player_leave sent from anywhere but the door and the linger's
 *      end, and a way named by a caller that the table has not got (or a row
 *      nobody uses).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { LEAVE_WAYS } from '../src/leave.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE } from '../src/wheelspawns.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

let T = 1_950_000_000_000;
Date.now = () => T;
Math.random = () => 0.5;

function makeState() {
  const store = new Map();
  const copy = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  return {
    _store: store,
    storage: {
      get: async (k) => copy(store.get(k)),
      put: async (k, v) => { store.set(k, copy(v)); },
      list: async () => new Map(),
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], closed: null, send(s) { this.sent.push(JSON.parse(s)); }, close(c, r) { this.closed = { code: c, reason: r }; } }; }
const settle = () => new Promise((r) => setTimeout(r, 5));
const NML = { x: WHEEL_CENTRE[0] + 9000, y: WHEEL_CENTRE[1], z: WHEEL_ZONE };   /* No man's land */
const TOWN = { x: 50, y: 50, z: 'town' };

async function join(room, id, data) {
  const ws = fakeWs();
  room.sessions.set(ws, { phase: 'open', id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, phrase: 'p-' + id, protocolVersion: 2, ws: [1, 5],
    device: { id: 'sdphone', env: 'e1' }, data: Object.assign({}, NML, data || {}) }));
  await settle();
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  return ws;
}

/* The duties, spied on the room itself (an own property shadows the
   prototype's), each calling through.  The `save` is the leaver's own. */
const SPIES = {
  _lingerOnClose: 'linger', _sparOnLeave: 'spar', _drOnClose: 'daily', _placeRemember: 'body',
  _duelOnDisconnect: 'duel', _trade2OnDisconnect: 'trade', _partyOnDisconnect: 'party',
  _botfpFlush: 'botfp', _clearPvpConsent: 'consent', _chatModOnClose: 'mute',
};
function spy(room, who) {
  const log = [];
  for (const [m, tag] of Object.entries(SPIES)) {
    const orig = room[m];
    if (typeof orig !== 'function') continue;
    room[m] = function (...a) { const id = a[0] && typeof a[0] === 'object' ? a[0].id : a[0]; if (id === who) log.push(tag); return orig.apply(this, a); };
  }
  const save = room._saveRpg;
  room._saveRpg = function (id, ...a) { if (id === who) log.push('save'); return save.call(this, id, ...a); };
  const bc = room.broadcastAll;
  room.broadcastAll = function (msg, ...a) {
    if (msg && msg.type === 'player_leave' && msg.id === who) log.push('leave');
    if (msg && msg.type === 'player_count') log.push('count');
    return bc.call(this, msg, ...a);
  };
  return log;
}

const ID = 'bp_sd_x', WIT = 'bp_sd_w';
/* a fresh room: the leaver and a witness (so the room never empties) */
async function setup(fight) {
  const room = new GameRoom(makeState(), mockEnv);
  await join(room, WIT, { x: NML.x + 60 });
  const ws = await join(room, ID, fight ? null : TOWN);
  const ps = room.playerState[ID];
  ps._regenDirty = true;   /* something unsaved: the close's flush runs */
  if (fight) {
    ps.z = WHEEL_ZONE; ps.x = NML.x + 40; ps.y = NML.y; ps.dead = false; ps.dying = false; ps._zoneEntryGraceUntil = 0;
    room._notePvpExchange(WIT, ID, T);
  }
  return { room, ws };
}

/* What each way ran before the door (recorded by this play against the
   code before v2.3.4830): every close-like way the same list, the takeover
   two duties, the fight takeover the close with the body kept. */
const CLOSE = ['linger', 'spar', 'save', 'daily', 'body', 'duel', 'trade', 'party', 'botfp', 'consent', 'mute', 'leave', 'count'];
const PLAYS = {
  close: async ({ room, ws }) => { await room.webSocketClose(ws); },
  error: async ({ room, ws }) => { room.webSocketError(ws); await settle(); },
  afk: async ({ room }) => { room.IDLE_TIMEOUT_MS = 1; for (const [, s] of room.sessions) if (s.id === ID) s.lastRecv = T - 10; else s.lastRecv = T + 1e9; room._tickPingAndAfk(T); await settle(); },
  flood: async ({ room, ws }) => { room._floodClose(ws, 4008, 'flood'); await settle(); },
  kick: async ({ room, ws }) => { await room._adminPutOut(ws, 4003, 'kick'); },
  device: async ({ room, ws }) => { await room._authPutOut(ws, 'device'); },
  reset: async ({ room }) => { await room._resetCharacterData(ID); await settle(); },
};
const EXPECT = {
  close: CLOSE, error: CLOSE, afk: CLOSE, flood: CLOSE, kick: CLOSE, device: CLOSE,
  /* the reset deletes the record first, so the close finds nothing dirty to save */
  reset: CLOSE.filter((t) => t !== 'save'),
};

/* ── 1. each way of leaving runs what it ran before ── */
for (const [why, play] of Object.entries(PLAYS)) {
  const env = await setup(false);
  const log = spy(env.room, ID);
  await play(env);
  await settle();
  check('1. ' + why + ': the duties, in order, as before the door', JSON.stringify(log) === JSON.stringify(EXPECT[why]), log);
  check('1. ' + why + ': the session is out of the map and the body out of the world',
    ![...env.room.sessions.values()].some((s) => s.id === ID) && !env.room.playerState[ID]);
}
/* the takeover: a second login outside a fight -- the bot summary and the
   save, nothing else (the trade lives on: TRAPS §162) */
{
  const env = await setup(false);
  const log = spy(env.room, ID);
  const ws2 = await join(env.room, ID, TOWN);
  const before = log.slice(0, log.indexOf('save') + 1);
  check('1. takeover: the bot summary, then the save, first', JSON.stringify(before) === '["botfp","save"]', log);
  for (const skipped of ['duel', 'trade', 'party', 'consent', 'mute', 'leave', 'daily', 'linger', 'spar'])
    check('1. takeover: skips ' + skipped + ' (as before the door)', !log.includes(skipped), log);
  check('1. takeover: the old socket is superseded, the new one holds the character',
    env.ws.closed && env.ws.closed.code === 1000 && env.room.sessions.get(ws2) && env.room.sessions.get(ws2).id === ID && !env.room.sessions.has(env.ws), env.ws.closed);
}
/* the fight takeover: a second login while the body is in a fight with
   another player -- the old session's real close, the body lingers */
{
  const env = await setup(true);
  const log = spy(env.room, ID);
  await join(env.room, ID, TOWN);
  const lingering = !!(env.room.playerState[ID] && env.room.playerState[ID].lingering);
  check('1. takeoverFight: the close ran, the body kept (no player_leave, no body out)',
    lingering && ['linger', 'duel', 'trade', 'party', 'botfp', 'consent', 'mute', 'count'].every((t) => log.includes(t)) && !log.includes('leave') && !log.includes('body'), { log, lingering });
  check('1. takeoverFight: the new login waits (linger_wait)', !env.room.sessions.has(env.ws));
}

/* ── 2. the phase ── */
{
  const room = new GameRoom(makeState(), mockEnv);
  await join(room, WIT);
  const ws = fakeWs();
  const s = { phase: 'open', id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T };
  room.sessions.set(ws, s);
  check('2. a new socket is open', s.phase === 'open');
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: ID, name: ID, phrase: 'p-' + ID, protocolVersion: 2, ws: [1, 5], device: { id: 'sdphone', env: 'e1' }, data: TOWN }));
  await settle();
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  check('2. ...joined once the join names the character', s.phase === 'joined' && s.id === ID, s.phase);
  room.playerState[ID]._regenDirty = true;
  const log = spy(room, ID);
  /* two leaves at once (a kick while the runtime's close lands): the first
     is still awaiting its save when the second arrives */
  const a = room._adminPutOut(ws, 4003, 'kick');
  const b = room.webSocketClose(ws);
  await Promise.all([a, b]); await settle();
  check('2. ...gone, and two leaves at once run each duty once', s.phase === 'gone'
    && log.filter((t) => t === 'duel').length === 1 && log.filter((t) => t === 'leave').length === 1, log);
  /* a refusal before a character: the session dropped, nothing else */
  const ws3 = fakeWs();
  room.sessions.set(ws3, { phase: 'open', id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  room._playerLeaves(ws3, 'refused');
  check('2. a refusal drops the session at once', !room.sessions.has(ws3));
  /* v2.3.4921: a refusal reaching a session that HAS joined (two joins on one
     socket, the second refused by the account check after the first was in)
     runs the full leave: the body goes and everyone is told */
  {
    const ID4 = 'bp_sd_refj';
    const ws4 = fakeWs();
    room.sessions.set(ws4, { phase: 'open', id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
    await room.webSocketMessage(ws4, JSON.stringify({ type: 'join', id: ID4, name: 'R', phrase: 'p-' + ID4, ws: [1, 5], data: { x: 0, y: 0, z: 'wheel' } }));
    await settle();
    if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
    const joined = room.sessions.get(ws4) && room.sessions.get(ws4).phase === 'joined' && !!room.playerState[ID4];
    room._verifyRefuse(ws4);
    await settle();
    check('2. a refusal of a session that has joined takes its body out of the world',
      joined && !room.sessions.has(ws4) && !room.playerState[ID4], { joined, body: !!room.playerState[ID4] });
    /* the switch: the session dropped only, the old way (the body stands) */
    const ID5 = 'bp_sd_refk';
    const ws5 = fakeWs();
    room.sessions.set(ws5, { phase: 'open', id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
    await room.webSocketMessage(ws5, JSON.stringify({ type: 'join', id: ID5, name: 'K', phrase: 'p-' + ID5, ws: [1, 5], data: { x: 0, y: 0, z: 'wheel' } }));
    await settle();
    if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
    const keep = room._liveFlags;
    room._liveFlags = Object.assign({}, keep || {}, { refusejoined: false });
    room._verifyRefuse(ws5);
    await settle();
    room._liveFlags = keep;
    check('2. `refusejoined: false`: the session dropped only, the body left standing (the old way)',
      !room.sessions.has(ws5) && !!room.playerState[ID5]);
    delete room.playerState[ID5];
  }
  let threw = false;
  try { room._playerLeaves(fakeWs(), 'nosuchway'); } catch (e) { threw = true; }
  check('2. a way the table has not got throws', threw);
}

/* ── 3. ONE DOOR: the scan ── */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
const dir = new URL('../src/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
const code = Object.create(null);
for (const f of files) code[f] = strip(readFileSync(new URL(f, dir), 'utf8'));
function where(re, allow) {
  const out = [];
  for (const f of files) {
    const lines = code[f].split('\n');
    lines.forEach((ln, i) => { if (re.test(ln) && !allow(f, ln)) out.push(f + ':' + (i + 1)); });
  }
  return out;
}
const isDef = (ln) => /^\s*(async\s+)?\w+\([^)]*\)\s*\{/.test(ln);
{
  const bad = where(/webSocketClose\(/, (f, ln) => f === 'index.js' && /async webSocketClose\(ws\)/.test(ln));
  check('3. nothing calls webSocketClose: every way of leaving names its row (leave.js)', bad.length === 0, bad);
  const del = where(/sessions\.delete\(/, (f) => f === 'leave.js');
  check('3. a session leaves the map only through the door', del.length === 0, del);
  for (const m of ['_duelOnDisconnect', '_trade2OnDisconnect', '_partyOnDisconnect', '_chatModOnClose', '_drOnClose', '_lingerOnClose', '_sparOnLeave']) {
    const bad2 = where(new RegExp('\\b' + m + '\\('), (f, ln) => f === 'leave.js' || isDef(ln));
    check('3. ' + m + ' is the door\'s alone', bad2.length === 0, bad2);
  }
  /* spar.js: a sparring CLONE leaving (never a session) */
  const pl = where(/type:\s*'player_leave'/, (f) => f === 'leave.js' || f === 'linger.js' || f === 'spar.js');
  check('3. player_leave comes from the door (and the end of a lingering body) only', pl.length === 0, pl);
  /* every way named is a row; every row is named */
  const named = new Set();
  for (const f of files) for (const m of code[f].matchAll(/_playerLeaves\(\s*\w+\s*,\s*'(\w+)'/g)) named.add(m[1]);
  const unknown = [...named].filter((w) => !Object.prototype.hasOwnProperty.call(LEAVE_WAYS, w));
  const unused = Object.keys(LEAVE_WAYS).filter((w) => !named.has(w));
  check('3. every way a caller names is a row of LEAVE_WAYS', unknown.length === 0, unknown);
  check('3. every row has a caller (deleting a way deletes its row)', unused.length === 0, unused);
}

if (failures) { console.log(failures + ' FAILED'); process.exit(1); }
console.log('session-door: all passed');
process.exit(0);
