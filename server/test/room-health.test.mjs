/* ═══ v2.3.5601: THE ROOM'S OWN HEALTH (server/src/health.js; card OPS PR 2) ═══
 *
 * Red team RT-2, F3 and F4 (docs/security/rt2-findings.md): `/health` never
 * asked the room, so a stuck room read "ok"; and a rollback that shuts out
 * the players a newer worker saved said so nowhere.  This holds:
 *
 *   1. an idle room (no socket, no tick loop) is healthy, and the answer is
 *      numbers only: exactly the known keys, no id, no name;
 *   2. a socket with no tick loop is 'no tick'; a tick loop whose last tick
 *      is older than TICK_LATE_MS is 'tick late'; a fresh one is healthy;
 *   3. a put the storage refused is 'save refused' for PUT_WINDOW_MS, then
 *      healthy again, its count kept; a character refused as newer (the
 *      rollback's lockout) is 'newer saves refused', counted the same way;
 *   4. the room's internal answer (`/_room_health`, after the switches load):
 *      200 or 503 by the numbers; `roomhealth: false` answers 404;
 *   5. the outer worker's `GET /health/room` asks the room and passes its
 *      answer on (200, 503, 404); a room that throws or does not answer in
 *      TIMEOUT_MS is 503 `room: 'no answer'`; `/health` is unchanged;
 *   6. the paths the router tests are HEALTH's (the wire table's lister reads
 *      the literals in index.js).
 */
import { readFileSync } from 'node:fs';
import worker from '../src/index.js';
import { HEALTH, roomHealth, roomHealthOff, routeRoomHealth } from '../src/health.js';
import { makeStorage, openRoom, fakeWs, baseSession } from './testroom.mjs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const KEYS = ['ok', 'problems', 'players', 'sockets', 'ticking', 'tickAgeMs', 'savesRefused'].sort();
const T0 = Date.UTC(2026, 10, 15, 12, 0, 0);

/* ── 1. idle and healthy, numbers only ── */
{
  const room = await openRoom(makeStorage());
  const h = roomHealth(room, T0);
  check('1. an idle room (no socket, no tick loop) is healthy', h.ok === true && h.problems.length === 0 && h.sockets === 0 && h.ticking === false, h);
  check('1. the answer is exactly the known keys (numbers only: no id, no name, no address)', JSON.stringify(Object.keys(h).sort()) === JSON.stringify(KEYS), Object.keys(h));
  check('1. savesRefused is two counts', h.savesRefused && h.savesRefused.put === 0 && h.savesRefused.newer === 0, h.savesRefused);
}

/* ── 2. the tick ── */
{
  const room = await openRoom(makeStorage());
  room.sessions.set(fakeWs('a'), Object.assign(baseSession(), { id: 'bp_health_a' }));
  let h = roomHealth(room, T0);
  check('2. a socket with no tick loop is a problem: "no tick"', !h.ok && h.problems.includes('no tick') && h.players === 1 && h.sockets === 1, h);
  room.tickInterval = 1;   /* the loop runs (a stand-in for its interval id) */
  room._roomRowTick(T0 - 100);
  h = roomHealth(room, T0);
  check('2. a tick loop with a fresh tick is healthy (its age in ms)', h.ok && h.ticking && h.tickAgeMs === 100, h);
  h = roomHealth(room, T0 - 100 + HEALTH.TICK_LATE_MS + 1);
  check('2. its last tick older than TICK_LATE_MS is "tick late"', !h.ok && h.problems.includes('tick late'), h);
  const r2 = await openRoom(makeStorage());
  r2.tickInterval = 1;
  check('2. a loop that has never ticked is "tick late" (no age)', roomHealth(r2, T0).problems.includes('tick late') && roomHealth(r2, T0).tickAgeMs === null);
}

/* ── 3. saves refused ── */
{
  const room = await openRoom(makeStorage());
  room._roomRowRefused('put', T0);
  let h = roomHealth(room, T0 + 1000);
  check('3. a put the storage refused is "save refused" now', !h.ok && h.problems.includes('save refused') && h.savesRefused.put === 1, h);
  h = roomHealth(room, T0 + HEALTH.PUT_WINDOW_MS + 1);
  check('3. ...and healthy again past PUT_WINDOW_MS, its count kept', h.ok && h.savesRefused.put === 1, h);
  room._roomRowRefused('newer', T0 + 2 * HEALTH.PUT_WINDOW_MS);
  h = roomHealth(room, T0 + 2 * HEALTH.PUT_WINDOW_MS + 10);
  check('3. a character refused as newer (a rollback\'s lockout) is "newer saves refused", counted', !h.ok && h.problems.includes('newer saves refused') && !h.problems.includes('save refused') && h.savesRefused.newer === 1, h);
  check('3. roomrow\'s own read is unchanged (put, newer, lastAt)', JSON.stringify(Object.keys(room._savesRefused()).sort()) === JSON.stringify(['lastAt', 'newer', 'put']));
}

/* ── 4. the room's internal answer ── */
const realNow = Date.now;
/* v2.3.5601 (mend, sitting 19b): up or down for anyone; the numbers with the owner's key */
const OWNER = 'room-health-key';
const keyed = (k) => ({ headers: { Authorization: 'Bearer ' + k } });
const withKey = (room) => { room.env = Object.assign({}, room.env, { ADMIN_KEY: OWNER }); return room; };
{
  const room = withKey(await openRoom(makeStorage()));
  let res = await room.fetch(new Request('https://room' + HEALTH.ROOM_PATH));
  let body = await res.json();
  check('4. /_room_health: 200 and up or down only, to anyone', res.status === 200 && JSON.stringify(body) === '{"ok":true}' && res.headers.get('Cache-Control') === 'no-store', { status: res.status, body });
  res = await room.fetch(new Request('https://room' + HEALTH.ROOM_PATH, keyed(OWNER)));
  body = await res.json();
  check('4. ...and the numbers with the owner\'s key', res.status === 200 && body.ok === true && JSON.stringify(Object.keys(body).sort()) === JSON.stringify(KEYS), { status: res.status, body });
  res = await room.fetch(new Request('https://room' + HEALTH.ROOM_PATH, keyed('a-wrong-key')));
  body = await res.json();
  check('4. ...a wrong key: up or down only', JSON.stringify(body) === '{"ok":true}', body);
  room.sessions.set(fakeWs('b'), Object.assign(baseSession(), { id: 'bp_health_b' }));
  res = await room.fetch(new Request('https://room' + HEALTH.ROOM_PATH));
  body = await res.json();
  check('4. ...and 503 when not (a socket, no tick), still up or down only', res.status === 503 && JSON.stringify(body) === '{"ok":false}', { status: res.status, body });
  res = await room.fetch(new Request('https://room' + HEALTH.ROOM_PATH, keyed(OWNER)));
  body = await res.json();
  check('4. ...and 503 with the same numbers when not (a socket, no tick), with the key', res.status === 503 && body.ok === false && body.problems.includes('no tick'), { status: res.status, body });
  const off = await openRoom(makeStorage(), { roomhealth: false });
  check('4. `roomhealth: false` is read as off; unset or true is on', roomHealthOff(off) && !roomHealthOff(room) && !roomHealthOff({ _liveFlags: { roomhealth: true } }));
  res = await off.fetch(new Request('https://room' + HEALTH.ROOM_PATH));
  check('4. `roomhealth: false`: the room answers 404', res.status === 404);
}

/* ── 5. the outer worker's route ── */
{
  const room = withKey(await openRoom(makeStorage()));
  const envOf = (fetcher) => ({ GAME_ROOM: { idFromName: (n) => n, get: () => ({ fetch: fetcher }) }, ROOMS: 'brotown-1' });
  const asked = [];
  const sent = [];
  const env = envOf(async (u) => {
    const r = typeof u === 'string' ? new Request(u) : u;
    asked.push(r.url); sent.push([...r.headers.keys()].sort());
    return room.fetch(new Request(r));
  });
  let res = await worker.fetch(new Request('https://api.brotown.net' + HEALTH.PATH, { headers: { Cookie: 'x=1', 'X-Other': 'y' } }), env);
  let body = await res.json();
  check('5. GET /health/room asks the room\'s /_room_health and answers 200, up or down only', res.status === 200 && JSON.stringify(body) === '{"ok":true}' && asked.length === 1 && asked[0].endsWith(HEALTH.ROOM_PATH), { status: res.status, body, asked });
  check('5. ...passing the room nothing of the request but the key and the address', sent[0].every((h) => h === 'authorization' || h === 'cf-connecting-ip'), sent);
  res = await worker.fetch(new Request('https://api.brotown.net' + HEALTH.PATH, keyed(OWNER)), env);
  body = await res.json();
  check('5. ...the numbers with the owner\'s key', res.status === 200 && body.ok === true && typeof body.players === 'number', body);
  room.tickInterval = 1;
  room._roomRowTick(Date.now() - HEALTH.TICK_LATE_MS - 50);
  res = await worker.fetch(new Request('https://api.brotown.net' + HEALTH.PATH, keyed(OWNER)), env);
  body = await res.json();
  check('5. ...503 with the numbers when the room is not well (the key)', res.status === 503 && body.problems.includes('tick late'), { status: res.status, body });
  res = await worker.fetch(new Request('https://api.brotown.net' + HEALTH.PATH), env);
  body = await res.json();
  check('5. ...and 503, up or down only, without it', res.status === 503 && JSON.stringify(body) === '{"ok":false}', body);
  const off = await openRoom(makeStorage(), { roomhealth: false });
  res = await worker.fetch(new Request('https://api.brotown.net' + HEALTH.PATH), envOf(async (u) => off.fetch(new Request(u))));
  check('5. ...404 passed on with the switch thrown', res.status === 404);
  res = await routeRoomHealth(envOf(async () => { throw new Error('the object reset'); }), 'brotown-1', {});
  body = await res.json();
  check('5. a room that throws is 503 "no answer"', res.status === 503 && body.room === 'no answer', body);
  const t = realNow();
  res = await routeRoomHealth(envOf(() => new Promise(() => {})), 'brotown-1', {});
  body = await res.json();
  const waited = realNow() - t;
  check(`5. a room that does not answer is 503 "no answer" after TIMEOUT_MS (${waited} ms)`, res.status === 503 && body.room === 'no answer' && waited >= HEALTH.TIMEOUT_MS - 50 && waited < HEALTH.TIMEOUT_MS + 1500, { waited, body });
  res = await worker.fetch(new Request('https://api.brotown.net/health'), envOf(async () => { throw new Error('never asked'); }));
  body = await res.json();
  check('5. /health is unchanged: the worker alone, never the room', res.status === 200 && body.status === 'ok');
  res = await worker.fetch(new Request('https://api.brotown.net' + HEALTH.PATH + '?room=nowhere'), env);
  check('5. a room the worker does not make is 404, never asked', res.status === 404 && asked.length === 4);
}

/* ── 6. the paths ── */
{
  const src = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  check('6. HEALTH.PATH is the literal the outer router tests', HEALTH.PATH === '/health/room' && src.includes("url.pathname === '/health/room'"));
  check('6. HEALTH.ROOM_PATH is the literal the room tests', HEALTH.ROOM_PATH === '/_room_health' && src.includes("url.pathname === '/_room_health'"));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
