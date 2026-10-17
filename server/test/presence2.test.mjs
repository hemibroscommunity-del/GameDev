/* ═══ v2.3.3250: FAR PLAYERS ONLY WHILE YOUR WORLD MAP IS OPEN (presence2.js) ═══
 *
 * A phone that joins with `pres: 2` is told, in the Wheel, the players near it
 * whole, its party whole wherever they are, and far players only while its
 * world map is open (map_watch); its roster is marked `nr` (every player near
 * it is in it) while the map is shut, so the phone parks the rest out of
 * sight; every ONLINE_EVERY_MS it gets `on`, everyone in the room and their
 * zone, in place of the 10 s silence its ghost sweep used.
 * Checked on a room with a fake clock, against a phone that did not opt in
 * standing on the same spot (the v2.3.3246 roster, unchanged):
 *
 *   1. map shut: near whole, a far mover and a far player standing both left
 *      out, the party member far away whole, the roster marked `nr`; the
 *      control phone gets the far ones slim and no mark;
 *   2. map shut: the far send (four times a second) carries no far player to
 *      it, only this tick's near movers; the control phone gets them;
 *   3. map_watch {on: true}: the next roster carries EVERY far player slim, the
 *      one standing still included; then the v2.3.3246 rule; the far send too;
 *      no `nr` while it watches (the far players not due are missing then);
 *   4. a watch with no repeat ends MAP_WATCH_MS later; {on: false} ends it at
 *      once; anything but a boolean changes nothing; `nr` again;
 *   5. `on`: on its first tick, then every ONLINE_EVERY_MS, everyone in the
 *      room with their zone; never to the control phone;
 *   6. `presence2: false` in the live flags: the v2.3.3246 roster for it again,
 *      no `on`, no `nr`, and caps.presence2 false for the next join;
 *   7. `pres: 2` from a v1 join counts for nothing; map_watch is never
 *      rebroadcast to the room;
 *   8. the two message builders agree byte for byte while it all happens;
 *   9. the phone's half: the online list (ids or id -> zone, a missed join
 *      added parked), a roster's `nr` parking whoever is missing, a parked copy
 *      kept PARK_R away, map_watch only to a worker that knows it, and the
 *      game's own files calling all of it.
 */
import { GameRoom } from '../src/index.js';
import { WHEEL_CENTRE } from '../src/wheelspawns.js';
import { ROSTER, FAR_PLAYERS } from '../src/tick.js';
import { PRESENCE2 } from '../src/presence2.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}

let NOW = 1_800_000_000_000;
Date.now = () => NOW;

function mockState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async () => new Map(),
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(s); }, close() {} }; }
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' }; }

async function makeRoom() {
  const room = new GameRoom(mockState(), mockEnv);
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => {
    if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; }
    return realSetInterval(fn, ms);
  };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  return { room, tickFn };
}
async function join(room, id, { pv = 2, pres = undefined } = {}) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  const msg = { type: 'join', id, name: id, data: { x: 1000, y: 1000, z: 'town' } };
  if (pv === 2) msg.protocolVersion = 2;
  if (pres !== undefined) msg.pres = pres;
  await room.webSocketMessage(ws, JSON.stringify(msg));
  return { ws, id, pv };
}
const sessionOf = (room, p) => room.sessions.get(p.ws);
async function move(room, p, x, y, z = 'wheel', vx = 1, vy = 0) {
  p.x = x; p.y = y; p.z = z;
  await room.webSocketMessage(p.ws, JSON.stringify({ type: 'move', x, y, d: 'south', f: 'south', z, vx, vy, dodging: false, blocking: false, ba: null, dead: false, ex: null }));
}
function place(room, p, x, y, z = 'wheel') {
  p.x = x; p.y = y; p.z = z;
  const ps = room.playerState[p.id];
  ps.x = x; ps.y = y; ps.z = z; ps.vx = 0; ps.vy = 0;
}
/* a far player walking: their state moved and marked as moved, as a move does */
function walk(room, p, dx) {
  const ps = room.playerState[p.id];
  ps.x += dx; ps.vx = 1; ps.lastMoveAt = NOW;
  p.x = ps.x;
  room.dirtyPlayers.add(p.id);
}
const STEP_MS = 22;
function step(room, tickFn, everyone) {
  NOW += STEP_MS;
  for (const p of everyone) {
    const s = room.playerState[p.id];
    if (s) { s.hp = Math.max(s.hp || 0, 1e6); s.maxHp = Math.max(s.maxHp || 0, 1e6); s.dead = false; s.dying = false; }
  }
  tickFn();
}
const ticksOf = (p) => p.ws.sent.map((s) => JSON.parse(s)).filter((m) => m.type === 'tick');
const lastTick = (p) => { const t = ticksOf(p); return t.length ? t[t.length - 1] : null; };
const isPresence = (room) => (room.tickSeq - 1) % room.PRESENCE_REFRESH_TICKS === 0;
function toRoster(room, tickFn, everyone, phones) {
  do step(room, tickFn, everyone); while (!isPresence(room));
  return phones.map((p) => (lastTick(p) && lastTick(p).players) || {});
}
/* was the last roster this phone got marked `nr`? */
const markedNr = (p) => { const t = lastTick(p); return !!(t && t.nr === 1); };
const SLIM_KEYS = 'x,y,d,z,vx,vy';
const keysOf = (o) => (o ? Object.keys(o).join(',') : null);
const clearSent = (...ps) => { for (const p of ps) p.ws.sent.length = 0; };

const ARRIVAL = { x: WHEEL_CENTRE[0], y: WHEEL_CENTRE[1] + 288 };   /* v2.3.3311: the live Wheel's arrival (its centre + 288) */

const { room, tickFn } = await makeRoom();
room._tickShareVerify = { checked: 0, mismatched: 0, first: null };
const A = await join(room, 'pa', { pres: 2 });   /* the phone under test */
const C = await join(room, 'pc');                /* the control: same spot, no pres */
const N = await join(room, 'pn');                 /* near, standing */
const M = await join(room, 'pm');                 /* far, walking */
const S = await join(room, 'ps');                 /* far, standing */
const F = await join(room, 'pf');                 /* far, in A's party */
const everyone = [A, C, N, M, S, F];
for (const p of everyone) await move(room, p, ARRIVAL.x, ARRIVAL.y);
place(room, A, ARRIVAL.x, ARRIVAL.y);
place(room, C, ARRIVAL.x + 10, ARRIVAL.y);
place(room, N, ARRIVAL.x + 900, ARRIVAL.y + 300);
place(room, M, ARRIVAL.x + 6000, ARRIVAL.y);
place(room, S, ARRIVAL.x - 7000, ARRIVAL.y + 500);
place(room, F, ARRIVAL.x, ARRIVAL.y + 8000);
/* A and F in a party, as party.js keeps one */
const party = { id: 'pty1', leader: A.id, members: [A.id, F.id], meta: {} };
room._parties = new Map([[party.id, party]]);
room._partyByPlayer = new Map([[A.id, party], [F.id, party]]);
room._liveFlags = { steadymovers: false };
step(room, tickFn, everyone);

const capsOf = (p) => {
  const ss = p.ws.sent.map((s) => JSON.parse(s)).find((m) => m.type === 'state_sync');
  return ss && ss.caps ? ss.caps : null;
};
check('0a the worker advertises presence2 to a joining phone', !!capsOf(A) && capsOf(A).presence2 === true, capsOf(A) && Object.keys(capsOf(A)).length);
check('0b the session took pres: 2 from its join (v2)', sessionOf(room, A).pres2 === true && sessionOf(room, C).pres2 === false);

/* ── 1. map shut: the roster ─────────────────────────────────────────── */
{
  toRoster(room, tickFn, everyone, [A, C]);
  for (let i = 0; i < 20; i++) step(room, tickFn, everyone);
  walk(room, M, 30);
  const [ra, rc] = toRoster(room, tickFn, everyone, [A, C]);
  check('1a map shut: the near player whole, as the control phone gets them', ra.pn && JSON.stringify(ra.pn) === JSON.stringify(rc.pn), { a: ra.pn, c: rc.pn });
  check('1b ...the far player who moved is left out (the control gets them slim)', !('pm' in ra) && keysOf(rc.pm) === SLIM_KEYS, { a: Object.keys(ra), c: rc.pm });
  check('1c ...and the far player standing still', !('ps' in ra), Object.keys(ra));
  check('1d ...its party member 8,000 px away is whole, as when near', !!ra.pf && keysOf(ra.pf) !== SLIM_KEYS && ra.pf.x === room.playerState[F.id].x, ra.pf);
  check('1e ...and the phone itself is in its own roster', !!ra.pa, Object.keys(ra));
  check('1f ...and the roster is marked `nr` (every player near it is in it); the control phone\'s is not', markedNr(A) && !markedNr(C), { a: lastTick(A) && lastTick(A).nr, c: lastTick(C) && lastTick(C).nr });
  clearSent(A);
  /* the near player and a far one both walking: this phone's own message
     every tick (its near movers), never the shared one -- a mark there would
     park every near player who did not move that tick */
  for (let i = 0; i < 10; i++) { walk(room, N, 5); walk(room, M, 20); step(room, tickFn, everyone); }
  const between = ticksOf(A).filter((t) => t.players && 'pn' in t.players);
  check('1g ...and only the roster: no tick between two rosters carries the mark', between.length > 0 && !ticksOf(A).some((t) => 'nr' in t), between.length);
}

/* ── 2. map shut: the far send ───────────────────────────────────────── */
{
  clearSent(A, C);
  for (let i = 0; i < 40; i++) {
    if (i % 3 === 0) walk(room, M, 20);
    if (i % 4 === 0) walk(room, N, 5);
    step(room, tickFn, everyone);
  }
  const nonRoster = (p) => ticksOf(p).filter((t) => t.players && !('pa' in t.players && 'pc' in t.players && 'pn' in t.players && Object.keys(t.players).length >= 4));
  const aFar = ticksOf(A).filter((t) => t.players && 'pm' in t.players);
  const cFar = ticksOf(C).filter((t) => t.players && 'pm' in t.players);
  const aNear = ticksOf(A).filter((t) => t.players && 'pn' in t.players);
  check('2a map shut: in 40 ticks of the far player walking, none of its ticks carries them', aFar.length === 0, aFar.slice(0, 2));
  check('2b ...while the control phone is sent them (the far send)', cFar.length > 0, cFar.length);
  check('2c ...and the near walker still reaches it', aNear.length > 0, aNear.length);
  void nonRoster;
}

/* ── 3. map open: everyone far at once, then the slim roster's rule ─── */
{
  for (let i = 0; i < 3; i++) toRoster(room, tickFn, everyone, [A]);   /* S long since last sent to anyone */
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'map_watch', on: true }));
  check('3a map_watch {on: true} opens a watch MAP_WATCH_MS long', sessionOf(room, A)._mapWatchUntil === NOW + PRESENCE2.MAP_WATCH_MS && sessionOf(room, A)._mapWatchFresh === true);
  const [ra] = toRoster(room, tickFn, everyone, [A]);
  check('3b the first roster of a watch carries EVERY far player slim, the one standing still included', keysOf(ra.pm) === SLIM_KEYS && keysOf(ra.ps) === SLIM_KEYS, Object.keys(ra));
  check('3c ...the party member still whole', !!ra.pf && keysOf(ra.pf) !== SLIM_KEYS, ra.pf);
  check('3c2 ...and a watching phone\'s roster is not marked `nr` (the far players not due are missing from it)', !markedNr(A), lastTick(A) && lastTick(A).nr);
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'map_watch', on: true }));   /* the heartbeat */
  walk(room, M, 25);
  const [rb, rcb] = toRoster(room, tickFn, everyone, [A, C]);
  check('3d ...then the v2.3.3246 rule: the mover slim, the one standing left out until due, as the control gets them',
    keysOf(rb.pm) === SLIM_KEYS && ('ps' in rb) === ('ps' in rcb), { a: Object.keys(rb), c: Object.keys(rcb) });
  clearSent(A);
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'map_watch', on: true }));
  /* a roster's length and more: the far mover reaches it by the far send
     (FAR_PLAYERS.EVERY_MS), or with the roster where that is 0 (#898) */
  for (let i = 0; i < room.PRESENCE_REFRESH_TICKS + 5; i++) { if (i % 3 === 0) walk(room, M, 20); step(room, tickFn, everyone); }
  const aFar = ticksOf(A).filter((t) => t.players && 'pm' in t.players);
  check('3e ...and the far mover reaches it again while it watches', aFar.length > 0, aFar.length);
}

/* ── 4. the watch ends ───────────────────────────────────────────────── */
{
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'map_watch', on: true }));
  const until = sessionOf(room, A)._mapWatchUntil;
  /* bounded by the rule, not by the room's word: a watch that never ends
     must fail 4a, not run this loop for ever */
  const stopAt = NOW + PRESENCE2.MAP_WATCH_MS + 500;
  while (NOW <= Math.min(until + 50, stopAt)) step(room, tickFn, everyone);
  walk(room, M, 25);
  const [ra] = toRoster(room, tickFn, everyone, [A]);
  check('4a a watch nobody repeats ends MAP_WATCH_MS after its last map_watch', !('pm' in ra) && !('ps' in ra), Object.keys(ra));
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'map_watch', on: true }));
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'map_watch', on: false }));
  walk(room, M, 25);
  const [rb] = toRoster(room, tickFn, everyone, [A]);
  check('4b {on: false} ends it at once', sessionOf(room, A)._mapWatchUntil === 0 && !('pm' in rb), Object.keys(rb));
  check('4b2 ...and its roster is marked `nr` again', markedNr(A), lastTick(A) && lastTick(A).nr);
  for (const bad of ['yes', 1, null, { on: 'true' }]) {
    const payload = bad && typeof bad === 'object' ? bad : { on: bad };
    await room.webSocketMessage(A.ws, JSON.stringify(Object.assign({ type: 'map_watch' }, payload)));
  }
  check('4c anything but a boolean changes nothing', sessionOf(room, A)._mapWatchUntil === 0);
}

/* ── 5. the online list ──────────────────────────────────────────────── */
{
  const L = await join(room, 'pl', { pres: 2 });
  everyone.push(L);
  await move(room, L, ARRIVAL.x, ARRIVAL.y);
  place(room, L, ARRIVAL.x + 50, ARRIVAL.y);
  clearSent(L, C);
  step(room, tickFn, everyone);
  const isOn = (t) => !!(t && t.on && typeof t.on === 'object' && !Array.isArray(t.on));
  const first = ticksOf(L).find(isOn);
  const ids = Object.keys(room.playerState).sort();
  check('5a a pres-2 phone is sent `on` on its first tick: everyone in the room', !!first && JSON.stringify(Object.keys(first.on).sort()) === JSON.stringify(ids), { on: first && first.on, ids });
  check('5a2 ...each with their zone, as the worker has it', !!first && ids.every((id) => first.on[id] === room.playerState[id].z), first && first.on);
  clearSent(L);
  const t0 = NOW;
  const ons = [];
  while (NOW < t0 + PRESENCE2.ONLINE_EVERY_MS * 2 + 100) {
    step(room, tickFn, everyone);
    const t = lastTick(L);
    if (isOn(t) && !ons.includes(t)) ons.push(t);
    L.ws.sent.length = 0;
  }
  check('5b ...then once every ONLINE_EVERY_MS', ons.length === 2, ons.length);
  check('5c the control phone is never sent one', !ticksOf(C).some((t) => 'on' in t));
}

/* ── 6. the kill switch ──────────────────────────────────────────────── */
{
  room._liveFlags = { steadymovers: false, presence2: false };
  walk(room, M, 25);
  const [ra, rc] = toRoster(room, tickFn, everyone, [A, C]);
  check('6a presence2: false -- the v2.3.3246 roster again: the far mover slim', keysOf(ra.pm) === SLIM_KEYS && ('ps' in ra) === ('ps' in rc), { a: Object.keys(ra), c: Object.keys(rc) });
  clearSent(A);
  NOW += PRESENCE2.ONLINE_EVERY_MS + 1000;
  step(room, tickFn, everyone);
  check('6b ...and no online list', !ticksOf(A).some((t) => 'on' in t));
  toRoster(room, tickFn, everyone, [A]);
  check('6b2 ...and no `nr` on its roster', !markedNr(A), lastTick(A) && lastTick(A).nr);
  const K = await join(room, 'pk', { pres: 2 });
  check('6c ...and a new join is not told presence2', !!capsOf(K) && capsOf(K).presence2 === false, capsOf(K) && capsOf(K).presence2);
  room.sessions.delete(K.ws); delete room.playerState[K.id];
  room._liveFlags = { steadymovers: false };
}

/* ── 7. v1, and never rebroadcast ────────────────────────────────────── */
{
  const V = await join(room, 'pv', { pv: 1, pres: 2 });
  check('7a pres: 2 from a v1 join counts for nothing', sessionOf(room, V).pres2 === false);
  room.sessions.delete(V.ws); delete room.playerState[V.id];
  const before = room.eventBuffer.length;
  await room.webSocketMessage(A.ws, JSON.stringify({ type: 'map_watch', on: true }));
  check('7b map_watch is not rebroadcast to the room', room.eventBuffer.length === before && !room.eventBuffer.some((e) => e && e.type === 'map_watch'));
}

/* ── 8. the two builders agree ───────────────────────────────────────── */
{
  const v = room._tickShareVerify;
  check('8a the shared and the per-phone builders agreed on every message', v.checked > 50 && v.mismatched === 0, { checked: v.checked, mismatched: v.mismatched, first: v.first && { zone: v.first.zone } });
}

/* ── 9. the phone's half (src/game/presence2.js, wsClient.js, the map) ── */
{
  const C2 = await import('../../src/game/presence2.js');
  const fakeS = (caps) => ({ _serverCaps: caps, others: { a: {}, b: {}, c: {} }, sent: [], channel: { send(m) { this.owner.sent.push(m); } } });
  const S1 = fakeS({ presence2: true }); S1.channel.owner = S1;
  const gone = C2.applyOnlineList(S1, ['a', 'c', 'me'], 1000);
  check('9a the online list forgets exactly the players missing from it (the first cut\'s bare ids too)', gone === 1 && Object.keys(S1.others).join(',') === 'a,c' && S1._onlineAt === 1000, S1.others);
  check('9b the ghost sweep stands down while the list is fresh, and comes back ONLINE_STALE_MS after the last one',
    C2.onlineListFresh(S1, 1000 + C2.PRESENCE2_CLIENT.ONLINE_STALE_MS - 1) && !C2.onlineListFresh(S1, 1000 + C2.PRESENCE2_CLIENT.ONLINE_STALE_MS));
  const S0 = fakeS({}); S0.channel.owner = S0; S0._onlineAt = 1000;
  check('9c ...and never stands down against a worker without presence2', !C2.onlineListFresh(S0, 1001));
  C2.sendMapWatch(S1, true); C2.sendMapWatch(S0, true);
  check('9d map_watch goes only to a worker that advertises presence2 (an old one would rebroadcast it)',
    S1.sent.length === 1 && S1.sent[0].type === 'map_watch' && S1.sent[0].on === true && S0.sent.length === 0, { s1: S1.sent, s0: S0.sent });
  check('9e the open map repeats it inside the worker\'s watch', C2.PRESENCE2_CLIENT.MAP_HEARTBEAT_MS * 2 <= PRESENCE2.MAP_WATCH_MS && C2.PRESENCE2_CLIENT.MAP_HEARTBEAT_MS === PRESENCE2.MAP_HEARTBEAT_MS);
  check('9f the phone gives up on the list only after missing two of them', C2.PRESENCE2_CLIENT.ONLINE_STALE_MS >= 2 * PRESENCE2.ONLINE_EVERY_MS);

  /* parking: a roster marked `nr` parks whoever is missing from it */
  const R = C2.PRESENCE2_CLIENT.PARK_R;
  check('9g a parked copy is kept as far as the worker\'s near circle (PARK_R = FAR_PLAYERS.NEAR_R)', R === FAR_PLAYERS.NEAR_R, { R, near: FAR_PLAYERS.NEAR_R });
  const P = { x: 10000, y: 10000 };
  const mk = (x, y, extra) => Object.assign({ x, y, renderX: x, renderY: y, _serverX: x, _serverY: y, _vx: 2, _vy: 1, _smoothVx: 2, _smoothVy: 1, zone: 'wheel' }, extra || {});
  const S2 = { _serverCaps: { presence2: true }, player: P, myId: 'me',
    others: { near: mk(10300, 10000), ghost: mk(10500, 10400), far: mk(16000, 10000), party: mk(18000, 10000) } };
  const parked = C2.parkMissing(S2, { near: {}, party: {} });
  const g = S2.others.ghost, f = S2.others.far, n = S2.others.near;
  check('9h a roster\'s missing players are parked and stopped; the ones in it are left alone',
    parked === 2 && g._away === true && f._away === true && !n._away && !S2.others.party._away && g._vx === 0 && g._smoothVy === 0 && n._vx === 2,
    { parked, g, n });
  const dg = Math.hypot(g.x - P.x, g.y - P.y), dgr = Math.hypot(g.renderX - P.x, g.renderY - P.y);
  check('9i ...one parked inside the circle is moved out to PARK_R along its own bearing, its drawn place too',
    Math.abs(dg - R) < 1e-6 && Math.abs(dgr - R) < 1e-6 && g._serverX === g.x && Math.abs(Math.atan2(g.y - P.y, g.x - P.x) - Math.atan2(400, 500)) < 1e-9, { g, dg });
  check('9j ...one already past it stays where it was', f.x === 16000 && f.y === 10000);
  P.x += 5000;   /* walk east, toward where `far` was last seen */
  const moved = C2.parkAway(S2, f);
  check('9k walk toward a parked copy and it stays PARK_R ahead (no ghost where they were last seen)',
    moved && Math.abs(Math.hypot(f.x - P.x, f.y - P.y) - R) < 1e-6 && f.x > P.x, { f: [f.x, f.y], P });
  const S3 = { player: { x: 0, y: 0 }, others: {} };
  const o3 = mk(0, 0, { _away: true });
  C2.parkAway(S3, o3);
  check('9l ...one on your very spot goes east, PARK_R off', o3.x === R && o3.y === 0, [o3.x, o3.y]);
  check('9m ...and a copy that is not parked is never moved', C2.parkAway(S2, n) === false && n.x === 10300);

  /* the online list: zones for parked copies, a join this phone missed added parked */
  const S4 = { _serverCaps: { presence2: true }, player: { x: 0, y: 0 }, myId: 'me',
    others: { near: mk(100, 0), away: mk(5000, 0, { _away: true }), gone: mk(9000, 0) } };
  const made = [];
  const makePeer = (id, zone) => { made.push(id); return { name: 'Anon', zone, x: 0, y: 0 }; };
  /* `near` listed in town: a list a moment older than its ticks -- the ticks win */
  const on = JSON.parse('{"me":"wheel","near":"town","away":"wd_hollows_1","new1":"town","__proto__":"wheel"}');
  const ch = C2.applyOnlineList(S4, on, 2000, makePeer);
  const o4 = S4.others;
  check('9n `on` as id -> zone: the one gone is forgotten, a parked one takes its zone, a near one keeps the zone its ticks gave',
    !('gone' in o4) && o4.away.zone === 'wd_hollows_1' && o4.near.zone === 'wheel', o4);
  check('9o ...a player this phone never heard join is added, parked, in their zone; never itself, never __proto__',
    ch === 2 && made.join(',') === 'new1' && !!o4.new1 && o4.new1._away === true && o4.new1.zone === 'town' && Math.hypot(o4.new1.x, o4.new1.y) >= R - 1e-6
      && Object.getPrototypeOf(o4) === Object.prototype && !Object.prototype.hasOwnProperty.call(o4, 'me'),
    { ch, made, keys: Object.keys(o4) });

  /* the game's own files call it */
  const { readFileSync } = await import('node:fs');
  const ws = readFileSync(new URL('../../src/networking/wsClient.js', import.meta.url), 'utf8');
  const joinAt = ws.indexOf("type: 'join'");
  check('9p wsClient.js joins with pres: 2', joinAt > 0 && /pres: 2,/.test(ws.slice(joinAt, joinAt + 4000)));
  check('9q ...applies a tick\'s `on`, and sweeps by silence only while the list is not fresh',
    /if \(msg\.on && typeof msg\.on === 'object'\)[\s\S]{0,900}applyOnlineList\(S, msg\.on, Date\.now\(\), _p2Make\)/.test(ws) && /if \(!onlineListFresh\(S, Date\.now\(\)\)\) \{\s*var _gsNow/.test(ws));
  check('9q2 ...and its channel lets map_watch out (TRAPS #18: the allowlist drops a type it does not name)',
    /* v2.3.3254: through wsOut, the quiet phone's way out (one frame a moment) */
    /if \(msg\.type === 'map_watch'\) \{\s*(ws\.send\(JSON\.stringify\(msg\)\)|wsOut\(msg\));\s*return;/.test(ws));
  check('9r ...parks whoever an `nr` roster leaves out, and un-parks anyone a tick updates',
    /if \(msg\.nr && presence2On\(S\)\) parkMissing\(S, msg\.players \|\| \{\}\)/.test(ws) && /_lastUpdate = Date\.now\(\);[\s\S]{0,200}S\.others\[pid\]\._away = false;/.test(ws));
  const vs = readFileSync(new URL('../../src/game/visualSystems.js', import.meta.url), 'utf8');
  check('9s every frame keeps a parked copy PARK_R away, before it is moved or drawn',
    /Object\.values\(S\.others\)\.forEach\(function \(o\) \{[\s\S]{0,600}if \(o\._away\) parkAway\(S, o\);\s*if \(o\.renderX === undefined\)/.test(vs));
  const wm = readFileSync(new URL('../../src/ui/WorldMapOverlay.jsx', import.meta.url), 'utf8');
  check('9t the open world map says so on opening, every heartbeat, and on closing, and draws no parked copy',
    /sendMapWatch\(S0, true\)/.test(wm) && /setInterval\(\(\) => sendMapWatch\(stateRef && stateRef\.current, true\), PRESENCE2_CLIENT\.MAP_HEARTBEAT_MS\)/.test(wm) && /sendMapWatch\(stateRef && stateRef\.current, false\)/.test(wm)
      && /if \(o\._away\) continue;/.test(wm));
  const mm = readFileSync(new URL('../../src/rendering/systems/wheelMinimap.js', import.meta.url), 'utf8');
  check('9u ...nor does the minimap', /if \(o && !o\._away && \(o\.zone \|\| o\.z\) === S\.currentZone\)/.test(mm));
}

void ROSTER;
console.log(`\npresence2: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
