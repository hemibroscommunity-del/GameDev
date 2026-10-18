/* A character's login key works on the devices it is played on (v2.3.3343;
 * docs/specs/device-lock.md, server/src/devicelock.js).  Through the REAL
 * join, the REAL account requests and the REAL admin routes:
 *   1. the numbers, and a device id cleaned as the bot checks clean it;
 *   2. a new character keeps the device it was made on;
 *   3. its own device: in, nothing written; another device, or none: refused
 *      with reason 'device' and close 4016, never 'auth', the live session
 *      untouched, and never counted as a failed key;
 *   4. a character with no device yet: its next device is taken;
 *   5. the owner's pass: one new device within 30 min, spent; forget: the
 *      list cleared and sealed, whoever plays it put out, nobody in until a
 *      pass; the routes need the admin key;
 *   6. the login check says whether this device could play it (and still
 *      says the character exists); the restart refuses an unknown device;
 *   7. the one-time fill from the device records and the bot statistics;
 *   8. a fill that fails lets the join through and is tried again later;
 *   9. the kill switch; the overview;
 *  10. every place a key is checked asks the device (a scan). */
import { readFileSync, readdirSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { DEVICE_LOCK, cleanDevice } from '../src/devicelock.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

let T = 1_970_000_000_000;
Date.now = () => T;

function makeState(opts) {
  const store = new Map();
  const st = {
    puts: [],
    failList: false,
    storage: {
      get: async (k) => (Array.isArray(k) ? new Map(k.filter((x) => store.has(x)).map((x) => [x, store.get(x)])) : store.get(k)),
      put: async (k, v) => {
        if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) { store.set(kk, vv); st.puts.push(kk); } }
        else { store.set(k, v); st.puts.push(k); }
      },
      list: async (o) => {
        /* the fill's own scan fails (the join's other lists go on) */
        if (st.failList && o && (o.prefix === 'device:' || o.prefix === 'botstat:')) throw new Error('list failed');
        const out = new Map();
        for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
  if (opts && opts.seed) for (const [k, v] of opts.seed) store.set(k, v);
  return st;
}
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
  ADMIN_KEY: 'test-secret-key',
};
function fakeWs(label) {
  return { label, sent: [], closed: null, send(s) { this.sent.push(JSON.parse(s)); }, close(code, reason) { this.closed = { code, reason }; } };
}
function newRoom(state, flags) {
  const room = new GameRoom(state || makeState(), mockEnv);
  room._liveFlags = flags || {};
  return room;
}
async function join(room, id, phrase, device, extra) {
  const ws = fakeWs(id);
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  const msg = { type: 'join', id, name: 'P', phrase, protocolVersion: 2, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } };
  if (device !== undefined) msg.device = device;
  Object.assign(msg, extra || {});
  await room.webSocketMessage(ws, JSON.stringify(msg));
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  return ws;
}
const rejected = (ws) => ws.sent.find((m) => m.type === 'join_rejected');
const joined = (ws) => !rejected(ws) && ws.sent.some((m) => m.type === 'state_sync');
const admin = (room, path, body, key) => room.fetch(new Request('https://x/api/admin' + path, {
  method: 'POST',
  headers: key === null ? {} : { Authorization: 'Bearer ' + (key || 'test-secret-key') },
  body: JSON.stringify(body || {}),
}));
const PH = 'alpha-blaze-coral-drift-7';
const ID = 'bp_devlock_a';
const D1 = { id: 'phone1abc', env: 'e1' };
const D2 = { id: 'phone2xyz', env: 'e2' };
const authOf = (room, id) => room.state._store.get('auth:' + id);

// ── 1. the numbers ──
{
  check('1. DEVICE_LOCK: 12 devices a character, a pass of 30 min, close 4016',
    DEVICE_LOCK.MAX === 12 && DEVICE_LOCK.PASS_MS === 30 * 60000 && DEVICE_LOCK.CLOSE === 4016);
  check('1. a device id is cleaned as the bot checks clean it ({id} or the id; lower case, [a-z0-9_-], 32 at most)',
    cleanDevice({ id: 'AbC-1_x!' }) === 'abc-1_x' && cleanDevice('Q9') === 'q9' && cleanDevice({ id: 'x'.repeat(40) }).length === 32);
  check('1. ...and nothing usable is no device', cleanDevice(null) === null && cleanDevice({}) === null && cleanDevice({ id: '!!!' }) === null && cleanDevice(5) === null);
  check('1. close 4016 is no other close\'s (the origin lock is 4015)',
    !/close\(\s*4016/.test(readFileSync(new URL('../src/origin.js', import.meta.url), 'utf8')));
}

// ── 2-3. a new character's device; its own device in, another refused ──
{
  const room = newRoom();
  const w1 = await join(room, ID, PH, D1);
  check('2. a new character joins', joined(w1), w1.sent.map((m) => m.type).slice(0, 6));
  const a = authOf(room, ID);
  check('2. ...and keeps the device it was made on', a && Array.isArray(a.devs) && a.devs.length === 1 && a.devs[0].d === 'phone1abc', a);

  /* its own device again (a reconnect): in, and nothing written for it */
  room.state.puts.length = 0;
  const w2 = await join(room, ID, PH, D1);
  check('3. its own device again: in', joined(w2));
  check('3. ...and its record is not written for it (no write a join: cost-guard)', !room.state.puts.includes('auth:' + ID), room.state.puts.filter((k) => k.startsWith('auth:')));

  /* the right key from another device */
  const live = w2;
  const psBefore = JSON.stringify({ x: room.playerState[ID] && room.playerState[ID].x, z: room.playerState[ID] && room.playerState[ID].z });
  const w3 = await join(room, ID, PH, D2);
  const r3 = rejected(w3);
  check('3. the right key from another device is refused, reason \'device\'', r3 && r3.reason === 'device', w3.sent.map((m) => m.type));
  check('3. ...with close 4016, and the socket let go', w3.closed && w3.closed.code === 4016 && !room.sessions.has(w3), w3.closed);
  check('3. ...and the character\'s live session is untouched (the gate runs before the eviction)',
    room.sessions.has(live) && room.sessions.get(live).id === ID
      && JSON.stringify({ x: room.playerState[ID].x, z: room.playerState[ID].z }) === psBefore);
  check('3. ...and no state reached the refused socket', !w3.sent.some((m) => m.type === 'state_sync'));
  /* no device at all */
  const w4 = await join(room, ID, PH, undefined);
  check('3. ...and so is a join that names no device', rejected(w4) && rejected(w4).reason === 'device');
  /* a refusal is not a failed key: five of them do not lock the right device out */
  for (let i = 0; i < 6; i++) await join(room, ID, PH, { id: 'other' + i });
  const w5 = await join(room, ID, PH, D1);
  check('3. six refused devices do not lock the character\'s own device out (never counted as a wrong key)', joined(w5), rejected(w5));
  /* a wrong key is still 'auth' */
  const w6 = await join(room, ID, 'wrong-key-1', D1);
  check('3. a wrong key from its own device is \'auth\', as before (close 4003)', rejected(w6) && rejected(w6).reason === 'auth' && w6.closed && w6.closed.code === 4003);
}

// ── 4. no device known yet: the next one is taken ──
{
  const room = newRoom();
  const w1 = await join(room, 'bp_devlock_b', 'b-key-1', undefined);
  check('4. a character made by a join with no device', joined(w1));
  check('4. ...has an empty list (so the one-time fill never looks it up)', Array.isArray(authOf(room, 'bp_devlock_b').devs) && authOf(room, 'bp_devlock_b').devs.length === 0);
  const w2 = await join(room, 'bp_devlock_b', 'b-key-1', undefined);
  check('4. ...and joins again with no device', joined(w2));
  const w3 = await join(room, 'bp_devlock_b', 'b-key-1', D2);
  check('4. its first device is taken', joined(w3));
  check('4. ...and remembered', (authOf(room, 'bp_devlock_b').devs || []).map((e) => e.d).join() === 'phone2xyz');
  const w4 = await join(room, 'bp_devlock_b', 'b-key-1', D1);
  check('4. ...after which another device is refused', rejected(w4) && rejected(w4).reason === 'device');
}

// ── 5. the owner's tools ──
{
  const room = newRoom();
  await join(room, 'bp_devlock_c', 'c-key-1', D1);
  let r = await admin(room, '/device-pass', { playerId: 'bp_devlock_c' }, null);
  check('5. the pass needs the admin key (401 without)', r.status === 401);
  r = await admin(room, '/device-pass', { playerId: 'bp_nobody' });
  const nb = await r.json();
  check('5. a code with no character is refused in words (the Test panel shows them)', r.status === 200 && nb.ok === false && /No character has that code/.test(nb.error), nb);
  r = await admin(room, '/device-pass', {});
  check('5. no code is 400', r.status === 400);
  r = await admin(room, '/device-pass', { playerId: 'bp_devlock_c' });
  const pb = await r.json();
  check('5. the owner lets one new device in for 30 minutes', r.status === 200 && pb.ok && pb.until === T + DEVICE_LOCK.PASS_MS, pb);
  T += 60000;
  const w1 = await join(room, 'bp_devlock_c', 'c-key-1', D2);
  check('5. a new device within the pass: in', joined(w1), rejected(w1));
  const a = authOf(room, 'bp_devlock_c');
  check('5. ...remembered, and the pass spent', (a.devs || []).map((e) => e.d).join() === 'phone1abc,phone2xyz' && !a.pass, a);
  const w2 = await join(room, 'bp_devlock_c', 'c-key-1', { id: 'thirddev' });
  check('5. a second new device is refused (the pass let in one)', rejected(w2) && rejected(w2).reason === 'device');
  /* an expired pass */
  await admin(room, '/device-pass', { playerId: 'bp_devlock_c' });
  T += DEVICE_LOCK.PASS_MS + 1;
  const w3 = await join(room, 'bp_devlock_c', 'c-key-1', { id: 'fourthdev' });
  check('5. a pass past its 30 minutes lets nothing in', rejected(w3) && rejected(w3).reason === 'device');
  /* the cap: 12 devices, the oldest added goes */
  for (let i = 0; i < 12; i++) {
    await admin(room, '/device-pass', { playerId: 'bp_devlock_c' });
    await join(room, 'bp_devlock_c', 'c-key-1', { id: 'cap' + i });
    T += 1000;
  }
  const cap = (authOf(room, 'bp_devlock_c').devs || []).map((e) => e.d);
  check('5. at most 12 devices, the oldest added dropped first', cap.length === 12 && !cap.includes('phone1abc') && !cap.includes('phone2xyz') && cap[11] === 'cap11', cap);

  /* forget: cleared, sealed, the player put out, nobody in until a pass */
  const room2 = newRoom();
  await join(room2, 'bp_devlock_d', 'd-key-1', D1);
  const live = await join(room2, 'bp_devlock_d', 'd-key-1', D1);
  const onlooker = await join(room2, 'bp_devlock_o', 'o-key-1', D2);
  check('5. (the player and an onlooker are in the room)', joined(live) && joined(onlooker) && !!room2.playerState.bp_devlock_d);
  r = await admin(room2, '/device-forget', { playerId: 'bp_devlock_d' });
  const fb = await r.json();
  check('5. forget: its devices cleared and sealed, no pass of its own', fb.ok && fb.forgot === 1 && fb.sealed && fb.until === null && fb.wasOnline, fb);
  check('5. ...whoever is playing it put out (reason \'device\', close 4016)',
    live.closed && live.closed.code === 4016 && live.sent.some((m) => m.type === 'join_rejected' && m.reason === 'device') && !room2.sessions.has(live));
  /* ...and LEAVES the world, as an idle player does: a kick's way (the
     session deleted first) skips webSocketClose and leaves the body standing */
  check('5. ...and leaves the world: no body left standing, the others told',
    !room2.playerState.bp_devlock_d && onlooker.sent.some((m) => m.type === 'player_leave' && m.id === 'bp_devlock_d'),
    { body: !!room2.playerState.bp_devlock_d, told: onlooker.sent.filter((m) => m.type === 'player_leave').map((m) => m.id) });
  const w4 = await join(room2, 'bp_devlock_d', 'd-key-1', D1);
  check('5. ...its old device is refused now', rejected(w4) && rejected(w4).reason === 'device');
  const w5 = await join(room2, 'bp_devlock_d', 'd-key-1', D2);
  check('5. ...and a sealed character takes no first device', rejected(w5) && rejected(w5).reason === 'device');
  await admin(room2, '/device-pass', { playerId: 'bp_devlock_d' });
  const w6 = await join(room2, 'bp_devlock_d', 'd-key-1', D2);
  const a2 = authOf(room2, 'bp_devlock_d');
  check('5. a pass then lets its player in, and breaks the seal', joined(w6) && (a2.devs || []).map((e) => e.d).join() === 'phone2xyz' && !a2.sealed && !a2.pass, a2);
  const log = room2.state._store.get('admin_log') || [];
  check('5. both tools are in the admin log', log.some((e) => e.op === 'device-forget') && log.some((e) => e.op === 'device-pass'));
}

// ── 6. the login check and the restart ──
{
  const room = newRoom();
  await join(room, 'bp_devlock_e', 'blaze-frost-x-y-1', D1);
  room._accountLogin = room._accountLogin.bind(room);
  /* _accountLogin finds the character by its key: register it under that id */
  const { accountPassphraseToId } = await import('../src/account.js');
  const key = 'solar-raven-ember-jade-42';
  const kid = accountPassphraseToId(key);
  await join(room, kid, key, D1);
  let r = await room._accountLogin(key, '9.9.9.1', 'phone1abc');
  check('6. the login check from its own device: exists, device ok', r.ok && r.exists && r.device === 'ok', r);
  r = await room._accountLogin(key, '9.9.9.2', 'phone2xyz');
  check('6. ...from another device: still exists (an older phone keeps its start-up), device unknown', r.ok && r.exists && r.device === 'unknown', r);
  r = await room._accountLogin(key, '9.9.9.3');
  check('6. ...and with no device named: unknown', r.ok && r.exists && r.device === 'unknown', r);
  /* through the fetch wrapper: the body's `device` reaches it */
  const fr = await room.fetch(new Request('https://x/api/account/login', { method: 'POST', body: JSON.stringify({ phrase: key, device: 'phone2xyz' }), headers: { 'CF-Connecting-IP': '9.9.9.4' } }));
  const fj = await fr.json();
  check('6. the request\'s `device` reaches the check', fj.device === 'unknown' && fj.exists === true, fj);
  /* the restart */
  const rpgBefore = room.state._store.get('rpg:' + kid);
  r = await room._accountReset(key, true, '9.9.9.5', 'phone2xyz');
  check('6. a restart from another device is refused (reason \'device\')', !r.ok && r.reason === 'device', r);
  check('6. ...and nothing was wiped', room.state._store.get('rpg:' + kid) === rpgBefore && rpgBefore !== undefined);
  r = await room._accountReset(key, true, '9.9.9.6', 'phone1abc');
  check('6. a restart from its own device goes through', r.ok && r.reset, r);
}

// ── 7. the one-time fill ──
{
  /* a world from before this change: characters with no `devs`, the bot
     checks' device records, a gatherer's last device */
  const seed = [
    ['auth:bp_old_a', { pfHash: 'x', createdAt: 1 }],
    ['auth:bp_old_b', { pfHash: 'x', createdAt: 1 }],
    ['auth:bp_old_c', { pfHash: 'x', createdAt: 1 }],
    ['auth:bp_new', { pfHash: 'x', createdAt: 1, devs: [{ d: 'mine', at: 5 }] }],
    ['device:tabletone', { v: 1, ids: [{ id: 'bp_old_a', lastSeen: 10 }, { id: 'bp_old_b', lastSeen: 20 }, { id: 'bp_guest_z', lastSeen: 30 }, { id: 'bp_new', lastSeen: 40 }] }],
    ['device:phonetwo', { v: 1, ids: [{ id: 'bp_old_a', lastSeen: 50 }] }],
    ['botstat:bp_old_b', { v: 1, deviceId: 'gatherdev', updatedAt: 60 }],
  ];
  const state = makeState({ seed });
  const room = newRoom(state);
  await room._deviceFillReady(T);
  const s = state._store;
  check('7. the fill gives each character the devices the worker already knew', JSON.stringify((s.get('auth:bp_old_a').devs || []).map((e) => e.d)) === '["tabletone","phonetwo"]', s.get('auth:bp_old_a'));
  check('7. ...a gatherer\'s last device too', (s.get('auth:bp_old_b').devs || []).map((e) => e.d).sort().join() === 'gatherdev,tabletone', s.get('auth:bp_old_b'));
  check('7. ...a character in no record keeps no list (its next device is taken)', s.get('auth:bp_old_c').devs === undefined);
  check('7. ...a list a join already wrote is left alone', JSON.stringify(s.get('auth:bp_new').devs) === '[{"d":"mine","at":5}]');
  check('7. ...and an id with no character is skipped', !s.has('auth:bp_guest_z'));
  const mark = s.get(DEVICE_LOCK.FILLED_KEY);
  check('7. the fill is marked done, with its counts', mark && mark.chars === 2 && mark.devices === 4, mark);
  /* once: a second room (a deploy) reads the marker and lists nothing */
  let lists = 0;
  const realList = state.storage.list;
  state.storage.list = async (o) => { lists++; return realList(o); };
  const room2 = newRoom(state);
  await room2._deviceFillReady(T);
  check('7. ...once: the next worker reads the marker and scans nothing', lists === 0 && room2._devFilled === true, lists);
  state.storage.list = realList;
  /* a big world: 300 characters, read and written FILL_BATCH at a time */
  {
    const big = [];
    for (let i = 0; i < 300; i++) {
      big.push(['auth:bp_many_' + i, { pfHash: 'x', createdAt: 1 }]);
      big.push(['device:dev' + i, { v: 1, ids: [{ id: 'bp_many_' + i, lastSeen: i }] }]);
    }
    const sb = makeState({ seed: big });
    let reads = 0, oneByOne = 0;
    const realGet = sb.storage.get;
    sb.storage.get = async (k) => { if (Array.isArray(k)) { reads++; if (k.length > DEVICE_LOCK.FILL_BATCH) oneByOne = -1; } else if (String(k).startsWith('auth:')) oneByOne++; return realGet(k); };
    const rb = newRoom(sb);
    await rb._deviceFillReady(T);
    let all = true;
    for (let i = 0; i < 300; i++) { const a = sb._store.get('auth:bp_many_' + i); if (!a || !a.devs || a.devs[0].d !== 'dev' + i) { all = false; break; } }
    const bm = sb._store.get(DEVICE_LOCK.FILLED_KEY);
    check('7. a big world: all 300 characters filled, the marker counting them',
      all && bm && bm.chars === 300 && bm.devices === 300, bm);
    check('7. ...their records read 128 at a time, never one by one',
      reads === Math.ceil(300 / DEVICE_LOCK.FILL_BATCH) && oneByOne === 0, { reads, oneByOne });
  }
  /* the join of a character from before, on a device it was seen on, and not */
  const st3 = makeState({ seed });
  const room3 = newRoom(st3);
  const okA = await join(room3, 'bp_old_a', 'k', { id: 'phonetwo' });
  /* bp_old_a's pfHash is 'x' (not a real hash): the key check fails first --
     so stamp a real one, as the join's own registration would */
  st3._store.set('auth:bp_old_a', { pfHash: await room3._phraseHash('old-a-key'), createdAt: 1 });
  const wA = await join(room3, 'bp_old_a', 'old-a-key', { id: 'phonetwo' });
  check('7. a character from before, on a device the records knew: in (the fill ran at its join)', joined(wA), rejected(wA));
  st3._store.set('auth:bp_old_b', { ...st3._store.get('auth:bp_old_b'), pfHash: await room3._phraseHash('old-b-key') });
  const wB = await join(room3, 'bp_old_b', 'old-b-key', { id: 'strangerdev' });
  check('7. ...one from before on a device no record knew: refused', rejected(wB) && rejected(wB).reason === 'device');
  st3._store.set('auth:bp_old_c', { ...st3._store.get('auth:bp_old_c'), pfHash: await room3._phraseHash('old-c-key') });
  const wC = await join(room3, 'bp_old_c', 'old-c-key', { id: 'anydev' });
  check('7. ...one no record knew at all: its device taken', joined(wC) && (st3._store.get('auth:bp_old_c').devs || []).map((e) => e.d).join() === 'anydev');
  check('7. (the first join with a stamped-wrong hash was refused as a wrong key, not a device)', rejected(okA) && rejected(okA).reason === 'auth');
}

// ── 8. a fill that fails ──
{
  const state = makeState({ seed: [['auth:bp_f', { pfHash: '' }]] });
  const room = newRoom(state);
  state._store.set('auth:bp_f', { pfHash: await room._phraseHash('f-key'), createdAt: 1 });
  state.failList = true;
  const w1 = await join(room, 'bp_f', 'f-key', D1);
  check('8. a fill that fails lets the join through (its device taken, as before this change)', joined(w1) && (state._store.get('auth:bp_f').devs || []).map((e) => e.d).join() === 'phone1abc');
  check('8. ...and is not marked done', !state._store.has(DEVICE_LOCK.FILLED_KEY) && !room._devFilled);
  state.failList = false;
  await room._deviceFillReady(T + 1000);
  check('8. ...and is not tried again within the minute', !room._devFilled);
  await room._deviceFillReady(T + DEVICE_LOCK.FILL_RETRY_MS + 1);
  check('8. ...then is', room._devFilled === true && state._store.has(DEVICE_LOCK.FILLED_KEY));
}

// ── 9. the kill switch and the overview ──
{
  const room = newRoom(null, { devicelock: false });
  await join(room, 'bp_devlock_k', 'k-key-1', D1);
  check('9. `devicelock: false`: a new character keeps no list (as before)', authOf(room, 'bp_devlock_k').devs === undefined);
  const w = await join(room, 'bp_devlock_k', 'k-key-1', D2);
  check('9. ...and another device plays it', joined(w));
  const { accountPassphraseToId } = await import('../src/account.js');
  const key = 'nova-orbit-prism-quest-3';
  await join(room, accountPassphraseToId(key), key, D1);
  const r = await room._accountLogin(key, '8.8.8.8', 'phone2xyz');
  check('9. ...and the login check says ok', r.exists && r.device === 'ok', r);

  const on = newRoom();
  await join(on, 'bp_devlock_o', 'o-key-1', D1);
  await join(on, 'bp_devlock_o', 'o-key-1', D1);
  await join(on, 'bp_devlock_o', 'o-key-1', D2);
  const res = await on.fetch(new Request('https://x/api/admin/overview', { headers: { Authorization: 'Bearer test-secret-key' } }));
  const ov = await res.json();
  const dl = ov.deviceLock || (ov.overview && ov.overview.deviceLock);
  check('9. the overview counts known devices and refusals', dl && dl.on === true && dl.known >= 1 && dl.refused >= 1, dl);
}

// ── 10. every key check asks the device ──
{
  const src = new URL('../src/', import.meta.url);
  const files = readdirSync(src).filter((f) => f.endsWith('.js'));
  const offenders = [];
  for (const f of files) {
    const text = readFileSync(new URL(f, src), 'utf8');
    if (!/=== auth\.pfHash/.test(text)) continue;
    if (!/_deviceLockJoin|_deviceLockCheck/.test(text)) offenders.push(f);
  }
  check('10. every file that checks a key against its character asks the device too', offenders.length === 0, offenders);
}

if (failures) { console.log(`\ndevice-lock: ${failures} FAILED`); process.exit(1); }
console.log('\ndevice-lock: all checks passed');
