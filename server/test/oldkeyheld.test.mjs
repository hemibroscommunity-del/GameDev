/* ═══ v2.3.5716: AN OLD KEY NEVER WORKS FROM A DEVICE NOT ON THE LIST (card SEC PR 17) ═══
 * (server/src/devicelock.js "AN OLD KEY NEVER WORKS FROM A DEVICE NOT ON THE
 * CHARACTER'S LIST"; docs/specs/device-lock.md; docs/OPERATIONS.md)
 *
 * The device lock held an old Login Key to its character's devices, but not
 * with `devicelock: false` thrown, nor while the owner's pass was open.
 *   1. An old key from a listed device: in, with the lock on and with it off
 *      (no honest device is shut out).
 *   2. An old key from a device NOT on the list, `devicelock: false`:
 *      refused, reason 'device'; the account check answers 'refuse' too.
 *   3. Inside the owner's pass: an old key from a new device is refused, and
 *      the pass is not spent.
 *   4. A new key passes as today: from a device not on the list, lock on or
 *      off.
 *   5. `oldkeyheld: false`: the lock off and the pass let the old key in, as
 *      before.
 *
 * BREAK PROOF (rule 8), tried by hand: main's devicelock.js -> FAIL 2, 3.
 * Not a phone test: node, a GameRoom (device-lock.test's harness). */
import { GameRoom } from '../src/index.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
let T = 1_975_000_000_000;
Date.now = () => T;
function makeState() {
  const store = new Map();
  return { _store: store, storage: {
    get: async (k) => (Array.isArray(k) ? new Map(k.filter((x) => store.has(x)).map((x) => [x, store.get(x)])) : store.get(k)),
    put: async (k, v) => { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); },
    list: async (o) => { const out = new Map(); for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) out.set(k, v); return out; },
    delete: async (k) => { store.delete(k); },
  }, getWebSockets: () => [], acceptWebSocket: () => {} };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) }, ADMIN_KEY: 'test-secret-key' };
const fakeWs = (label) => ({ label, sent: [], closed: null, send(s) { this.sent.push(JSON.parse(s)); }, close(code, reason) { this.closed = { code, reason }; } });
function newRoom(flags) { const room = new GameRoom(makeState(), mockEnv); room._liveFlags = { ...(flags || {}) }; return room; }
async function join(room, id, phrase, device, extra) {
  const ws = fakeWs(id);
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  const msg = { type: 'join', id, name: 'P', phrase, protocolVersion: 2, ws: [1, 5], data: { x: 0, y: 0, z: 'town' }, ...(extra || {}) };
  if (device !== undefined) msg.device = device;
  await room.webSocketMessage(ws, JSON.stringify(msg));
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  return ws;
}
const rejected = (ws) => ws.sent.find((m) => m.type === 'join_rejected');
const joined = (ws) => !rejected(ws) && ws.sent.some((m) => m.type === 'state_sync');
const keyOf = (ws) => { const m = ws.sent.find((x) => x.type === 'key_new'); return m ? m.key : null; };
const admin = (room, path, body) => room.fetch(new Request('https://x/api/admin' + path, { method: 'POST', headers: { Authorization: 'Bearer test-secret-key' }, body: JSON.stringify(body || {}) }));
const OLD = 'ember-coral-drift-blaze-9';
const D1 = { id: 'phone1abc', env: 'e1' }, D2 = { id: 'stranger9', env: 'e2' };
const ID = 'bp_okh_a';
const authOf = (room) => room.state._store.get('auth:' + ID);

/* a character made on D1 with its old key */
async function made(flags) {
  const room = newRoom({});
  const w = await join(room, ID, OLD, D1);
  room._liveFlags = { ...(flags || {}) };
  return { room, made: joined(w) };
}

/* 1 + 2 */
{
  const { room, made: ok } = await made({ devicelock: false });
  check('1. (a character made on its phone, guard)', ok && (authOf(room).devs || []).some((e) => e.d === 'phone1abc'), authOf(room));
  const own = await join(room, ID, OLD, D1);
  check('1. devicelock: false: its old key from its listed phone, in', joined(own), rejected(own));
  const far = await join(room, ID, OLD, D2);
  check('2. devicelock: false: its old key from a device not on the list is refused (\'device\')', rejected(far) && rejected(far).reason === 'device' && far.closed && far.closed.code === 4016, { r: rejected(far), c: far.closed });
  check('2. ...and the device is not written down', !(authOf(room).devs || []).some((e) => e.d === 'stranger9'), authOf(room).devs);
  const how = await room._deviceLockCheck(ID, authOf(room), 'stranger9', T);
  check('2. ...and the account check (the login door, the restart) answers refuse', how === 'refuse', how);
  room._liveFlags = {};
  const onOwn = await join(room, ID, OLD, D1);
  check('1. the lock on: its listed phone, in, as before', joined(onOwn), rejected(onOwn));
}

/* 3. the pass */
{
  const { room } = await made({});
  const pr = await admin(room, '/device-pass', { playerId: ID });
  check('3. (the owner opens a pass, guard)', pr.status === 200 && authOf(room).pass && authOf(room).pass.until > T, authOf(room));
  const far = await join(room, ID, OLD, D2);
  check('3. inside the pass, the old key from a new device is refused', rejected(far) && rejected(far).reason === 'device', rejected(far));
  check('3. ...and the pass is not spent, the device not listed', !!authOf(room).pass && !(authOf(room).devs || []).some((e) => e.d === 'stranger9'), authOf(room));
}

/* 4. a new key, as today */
{
  const { room } = await made({});
  const w = await join(room, ID, OLD, D1, { kv: 2 });
  const key = keyOf(w);
  check('4. (its phone, a new client, is handed a new key, guard)', !!key, w.sent.map((m) => m.type));
  const far = await join(room, ID, key, D2);
  check('4. the new key from a device not on the list: in, as today', joined(far), rejected(far));
  room._liveFlags = { devicelock: false };
  const far2 = await join(room, ID, key, { id: 'laptop7', env: 'e3' });
  check('4. ...and with the lock off', joined(far2), rejected(far2));
}

/* 5. the switch */
{
  const { room } = await made({ devicelock: false, oldkeyheld: false });
  const far = await join(room, ID, OLD, D2);
  check('5. oldkeyheld: false: devicelock: false lets the old key in from anywhere, as before', joined(far), rejected(far));
  const r2 = (await made({ oldkeyheld: false })).room;
  await admin(r2, '/device-pass', { playerId: ID });
  r2._liveFlags = { oldkeyheld: false };
  const inPass = await join(r2, ID, OLD, D2);
  check('5. ...and the pass lets it in on a new device, as before', joined(inPass), rejected(inPass));
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
