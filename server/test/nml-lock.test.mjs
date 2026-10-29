/* BEATEN BY THEM, NOT AGAIN FOR HALF AN HOUR (v2.3.3770, nomansland.js
 * _nmlLockSet; docs/specs/no-mans-land.md "The lock").
 *
 * The owner, 2026-10-28: "...a player attacks you (and gets red skulled) but
 * you kill him, he can't attack you for at least 30 minutes unless you approve
 * of letting him have another attack. A red skull disappears after dying ..."
 * and "...they can only pop up with a sword clash icon and question mark above
 * their head (once per minute)".  What this pins:
 *   1. the lock: A attacks V (red), V kills A under the rule -- A's red skull
 *      goes, and A may not attack V: refused at 29 minutes, allowed at 31
 *      (wall clock); V may still attack A; per pair (V's party mate is fair);
 *   2. no lock when A never attacked V, or V's kill was not under the rule;
 *   3. V attacking A lifts it;
 *   4. the ask: the "?" goes to V ALONE, once a minute a pair (a second at
 *      30 s refused, at 61 s it goes), never while not locked; and never
 *      rebroadcast;
 *   5. V's allow lifts it; anyone else's does nothing; both are told
 *      (`nml_lock` out / in);
 *   6. it survives a restart and A's rejoin (nml_state:<A> `lock`), and the
 *      join tells A and V;
 *   7. test mode never exempts it (it protects another player);
 *   8. the kill switch `nmllock: false`: no lock set or enforced, the red
 *      skull stays at the death, caps.nmllock false; and an old phone without
 *      the cap is refused all the same (the worker's rule). */
import { GameRoom } from '../src/index.js';
import { NML, NML_KEY } from '../src/nomansland.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE, WHEEL_LONG } from '../src/wheelspawns.js';

function makeState(store) {
  store = store || new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, structuredClone(v)); },
      list: async (opts) => { const out = new Map(); for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v); return out; },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const msgs = (ws, type) => ws.sent.filter((m) => m.type === type);
const lastOf = (ws, type) => { const a = msgs(ws, type); return a[a.length - 1] || null; };
const settle = () => new Promise((r) => setTimeout(r, 20));

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* the clock, ours */
const realNow = Date.now;
let NOW = realNow();
Date.now = () => NOW;
const MIN = 60000;

const TIER = NML.TIER * WHEEL_LONG;
const spot = (dy = 0) => ({ x: WHEEL_CENTRE[0] + NML.HUB + 2.5 * TIER, y: WHEEL_CENTRE[1] + dy });   /* deep in the Lv 11-15 ring */

async function makeRoom(store, flags) {
  const st = makeState(store);
  if (flags) st._store.set('liveflags', flags);
  const room = new GameRoom(st, mockEnv);
  const ws = {};
  const join = async (id, name) => {
    const w = fakeWs(id);
    room.sessions.set(w, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: NOW });
    await room.webSocketMessage(w, JSON.stringify({ type: 'join', id, name, phrase: 'p-' + id, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } }));
    room.sessions.get(w).name = name;
    ws[id] = w;
    return w;
  };
  const place = (id, dy, level) => {
    const ps = room.playerState[id];
    const p = spot(dy);
    ps.z = WHEEL_ZONE; ps.x = p.x; ps.y = p.y; ps.dead = false; ps.dying = false; ps.disconnected = false;
    ps.hp = ps.maxHp = 1000; ps._zoneEntryGraceUntil = 0; ps.level = level || 10;
  };
  return { room, st, ws, join, place };
}
const send = (R, id, type, payload) => R.room.webSocketMessage(R.ws[id], JSON.stringify({ type, payload }));
/* A attacks V (the window's choice: both skulls), then V kills A by a blow */
function attackThenKilled(R, A, V) {
  R.room._nmlOnHit(A, V, NOW);
  const a = R.room.playerState[A];
  a._nmlLastHitBy = V; a._nmlLastHitAt = NOW;
  a.hp = 0;
  R.room._handlePlayerDeath(a, A, 'pvp:' + V);
}
const revive = (R, id, dy) => R.place(id, dy);

const A = 'bp_lk_a', V = 'bp_lk_v', P = 'bp_lk_p', X = 'bp_lk_x';

// ── 1. the lock ──
{
  const R = await makeRoom();
  for (const [id, n] of [[A, 'Grief'], [V, 'Victim'], [P, 'Pal'], [X, 'Other']]) await R.join(id, n);
  R.place(A, 0); R.place(V, 60); R.place(P, 120); R.place(X, 180);
  const caps = (lastOf(R.ws[A], 'state_sync') || {}).caps || {};
  check('1. the join advertises caps.nmllock', caps.nmllock === true);
  check('1. (setup) A may attack V', R.room._pvpAllowed(A, V, WHEEL_ZONE) === true);
  attackThenKilled(R, A, V);
  const s = R.room.playerState[A]._nml;
  check('1. A attacked V (red) and V killed A: A\'s red skull goes at the death', s && s.red === 0, s && s.red);
  check('1. ...and A is locked out from V', s && s.lock instanceof Map && s.lock.get(V) === NOW + NML.LOCK_MS, s && s.lock && [...s.lock]);
  revive(R, A, 0);
  check('1. back on their feet, A may not attack V', R.room._pvpAllowed(A, V, WHEEL_ZONE) === false);
  check('1. ...a choice at V is refused too (no skull)', R.room._handleNmlAttack({ id: A }, { target: V }) === false);
  check('1. V may still attack A', R.room._pvpAllowed(V, A, WHEEL_ZONE) === true);
  check('1. per pair: A may still attack V\'s friend P', R.room._pvpAllowed(A, P, WHEEL_ZONE) === true);
  const lk = lastOf(R.ws[A], 'nml_lock'), lv = lastOf(R.ws[V], 'nml_lock');
  check('1. A is told (out: V, ~30 min)', !!lk && lk.payload.out.length === 1 && lk.payload.out[0][0] === V && lk.payload.out[0][1] === NML.LOCK_MS, lk);
  check('1. V is told (in: A)', !!lv && lv.payload.in.length === 1 && lv.payload.in[0][0] === A, lv);
  check('1. no one else is told', !msgs(R.ws[X], 'nml_lock').length && !msgs(R.ws[P], 'nml_lock').length);
  check('1. it is stored in A\'s own record', JSON.stringify((R.st._store.get(NML_KEY(A)) || {}).lock) === JSON.stringify([[V, NOW + NML.LOCK_MS]]), R.st._store.get(NML_KEY(A)));
  const t0 = NOW;
  NOW = t0 + 29 * MIN;
  check('1. at 29 minutes: still refused', R.room._pvpAllowed(A, V, WHEEL_ZONE) === false);
  NOW = t0 + 31 * MIN;
  check('1. at 31 minutes: allowed again (wall clock)', R.room._pvpAllowed(A, V, WHEEL_ZONE) === true);
}

// ── 2. no lock where the owner's rule does not make one ──
{
  const R = await makeRoom();
  for (const [id, n] of [[A, 'Grief'], [V, 'Victim'], [X, 'Other']]) await R.join(id, n);
  R.place(A, 0); R.place(V, 60); R.place(X, 120);
  /* A red from attacking X, then V (never attacked) kills A */
  R.room._nmlOnHit(A, X, NOW);
  const a = R.room.playerState[A];
  a._nmlLastHitBy = V; a._nmlLastHitAt = NOW; a.hp = 0;
  R.room._handlePlayerDeath(a, A, 'pvp:' + V);
  revive(R, A, 0);
  check('2. A never attacked V: no lock (A may attack V)', !(a._nml.lock instanceof Map && a._nml.lock.size) && R.room._pvpAllowed(A, V, WHEEL_ZONE) === true);
  /* a death not under the rule (the blow too old) makes none */
  R.room._nmlOnHit(A, V, NOW);
  a._nmlLastHitBy = V; a._nmlLastHitAt = NOW - NML.KILL_BLOW_MS - 1000; a.hp = 0;
  R.room._handlePlayerDeath(a, A, 'pvp:' + V);
  revive(R, A, 0);
  check('2. a kill not under the rule (the blow too old): no lock', R.room._pvpAllowed(A, V, WHEEL_ZONE) === true);
}

// ── 3. V attacking A lifts it ──
{
  const R = await makeRoom();
  for (const [id, n] of [[A, 'Grief'], [V, 'Victim']]) await R.join(id, n);
  R.place(A, 0); R.place(V, 60);
  attackThenKilled(R, A, V);
  revive(R, A, 0);
  check('3. (setup) locked', R.room._pvpAllowed(A, V, WHEEL_ZONE) === false);
  R.room._nmlOnHit(V, A, NOW);
  check('3. V attacks A: the lock lifts, and A may fight back', R.room._pvpAllowed(A, V, WHEEL_ZONE) === true && !R.room.playerState[A]._nml.lock.size);
  check('3. ...both are told', lastOf(R.ws[A], 'nml_lock').payload.out.length === 0 && lastOf(R.ws[V], 'nml_lock').payload.in.length === 0);
}

// ── 4. the ask: the "?" to V alone, once a minute ──
{
  const R = await makeRoom();
  for (const [id, n] of [[A, 'Grief'], [V, 'Victim'], [X, 'Other']]) await R.join(id, n);
  R.place(A, 0); R.place(V, 60); R.place(X, 120);
  await send(R, A, 'nml_lock_ask', { target: V });
  check('4. not locked: the ask goes nowhere', !msgs(R.ws[V], 'nml_lock_ask').length);
  attackThenKilled(R, A, V);
  revive(R, A, 0);
  const n0 = R.ws[X].sent.length;
  await send(R, A, 'nml_lock_ask', { target: V });
  const got = msgs(R.ws[V], 'nml_lock_ask');
  check('4. locked: V gets the "?" from A', got.length === 1 && got[0].payload.from === A, got);
  check('4. ...and V alone: nobody else hears of it (never rebroadcast)', R.ws[X].sent.slice(n0).every((m) => m.type !== 'nml_lock_ask' && !(m.payload && m.payload.type === 'nml_lock_ask'))
    && !msgs(R.ws[A], 'nml_lock_ask').length);
  NOW += 30000;
  await send(R, A, 'nml_lock_ask', { target: V });
  check('4. a second ask 30 s later: refused', msgs(R.ws[V], 'nml_lock_ask').length === 1);
  NOW += 31000;
  await send(R, A, 'nml_lock_ask', { target: V });
  check('4. at 61 s: it goes', msgs(R.ws[V], 'nml_lock_ask').length === 2);
  for (const bad of [null, '', A, '__proto__', 'x'.repeat(80), 7]) await send(R, A, 'nml_lock_ask', { target: bad });
  check('4. malformed targets do nothing', msgs(R.ws[V], 'nml_lock_ask').length === 2);
}

// ── 5. the allow ──
{
  const R = await makeRoom();
  for (const [id, n] of [[A, 'Grief'], [V, 'Victim'], [X, 'Other']]) await R.join(id, n);
  R.place(A, 0); R.place(V, 60); R.place(X, 120);
  attackThenKilled(R, A, V);
  revive(R, A, 0);
  await send(R, X, 'nml_lock_allow', { target: A });
  check('5. someone else\'s allow does nothing', R.room._pvpAllowed(A, V, WHEEL_ZONE) === false);
  await send(R, A, 'nml_lock_allow', { target: V });
  check('5. A cannot lift its own lock', R.room._pvpAllowed(A, V, WHEEL_ZONE) === false);
  NOW += 1000;
  await send(R, V, 'nml_lock_allow', { target: A });
  check('5. V lets A at them again: the lock lifts', R.room._pvpAllowed(A, V, WHEEL_ZONE) === true);
  check('5. ...both are told', lastOf(R.ws[A], 'nml_lock').payload.out.length === 0 && lastOf(R.ws[V], 'nml_lock').payload.in.length === 0);
  check('5. ...and the stored record drops it', !(R.st._store.get(NML_KEY(A)) || {}).lock);
  R.room._nmlOnHit(A, V, NOW);
  check('5. A\'s next attack red-skulls A again', R.room.playerState[A]._nml.red === NML.SKULL_MS);
}

// ── 6. a restart and a rejoin keep it ──
{
  const store = new Map();
  const R = await makeRoom(store);
  for (const [id, n] of [[A, 'Grief'], [V, 'Victim']]) await R.join(id, n);
  R.place(A, 0); R.place(V, 60);
  attackThenKilled(R, A, V);
  await settle();
  NOW += 5 * MIN;
  const R2 = await makeRoom(store);   /* a deploy: a fresh room on the same storage */
  await R2.join(V, 'Victim');
  await R2.join(A, 'Grief');
  R2.place(A, 0); R2.place(V, 60);
  check('6. after a restart, A rejoins still locked out from V', R2.room._pvpAllowed(A, V, WHEEL_ZONE) === false);
  const lk = lastOf(R2.ws[A], 'nml_lock');
  check('6. ...A\'s join tells A (25 minutes left)', !!lk && lk.payload.out[0][0] === V && lk.payload.out[0][1] === NML.LOCK_MS - 5 * MIN, lk);
  const lv = lastOf(R2.ws[V], 'nml_lock');
  check('6. ...and V, online, hears A is back and locked out', !!lv && lv.payload.in.some((e) => e[0] === A), lv);
  const keep = store.get(NML_KEY(A));
  store.set(NML_KEY(A), { ...keep, lock: [[V, NOW + 999 * MIN], ['bad'], [7, 1], [V + 'x', NOW - 1]] });
  const R3 = await makeRoom(store);
  await R3.join(A, 'Grief');
  const l3 = R3.room.playerState[A]._nml.lock;
  check('6. a stored lock is held to its half hour, and broken or ended rows are dropped', l3.size === 1 && l3.get(V) <= NOW + NML.LOCK_MS, l3 && [...l3]);
}

// ── 7. test mode does not exempt it ──
{
  const R = await makeRoom();
  for (const [id, n] of [[A, 'Grief'], [V, 'Victim']]) await R.join(id, n);
  R.place(A, 0); R.place(V, 60);
  attackThenKilled(R, A, V);
  revive(R, A, 0);
  R.room.playerState[A]._testMode = true;
  check('7. A in test mode is still locked out (the lock protects another player)', R.room._pvpAllowed(A, V, WHEEL_ZONE) === false);
}

// ── 8. the kill switch, and an old phone ──
{
  const R = await makeRoom(null, { nmllock: false });
  for (const [id, n] of [[A, 'Grief'], [V, 'Victim']]) await R.join(id, n);
  R.place(A, 0); R.place(V, 60);
  check('8. `nmllock: false`: caps.nmllock false', ((lastOf(R.ws[A], 'state_sync') || {}).caps || {}).nmllock === false);
  attackThenKilled(R, A, V);
  revive(R, A, 0);
  check('8. ...no lock, and the red skull stays at the death as before', R.room._pvpAllowed(A, V, WHEEL_ZONE) === true
    && !(R.room.playerState[A]._nml.lock instanceof Map && R.room.playerState[A]._nml.lock.size) && R.room.playerState[A]._nml.red > 0);
  await send(R, A, 'nml_lock_ask', { target: V });
  check('8. ...and no ask is passed on', !msgs(R.ws[V], 'nml_lock_ask').length && !msgs(R.ws[A], 'nml_lock').length);
  /* the switch thrown on a lock already set: not enforced while thrown, back when cleared */
  const R2 = await makeRoom();
  for (const [id, n] of [[A, 'Grief'], [V, 'Victim']]) await R2.join(id, n);
  R2.place(A, 0); R2.place(V, 60);
  attackThenKilled(R2, A, V);
  revive(R2, A, 0);
  R2.room._liveFlags = { ...(R2.room._liveFlags || {}), nmllock: false };
  const off = R2.room._pvpAllowed(A, V, WHEEL_ZONE);
  delete R2.room._liveFlags.nmllock;
  check('8. thrown over a running lock: not enforced; cleared: back', off === true && R2.room._pvpAllowed(A, V, WHEEL_ZONE) === false);
  /* an old phone sends player_attack with no lock message of its own: refused by the worker all the same */
  const before = R2.room.playerState[V].hp;
  const a = R2.room.playerState[A], v = R2.room.playerState[V];
  await send(R2, A, 'player_attack', { kind: 'melee', range: 200, arc: 2.5, angle: Math.atan2(v.y - a.y, v.x - a.x), dmgBase: 10, critChance: 0, target: V, special: false });
  check('8. an old phone\'s swing at V is refused by the worker (no damage, no skull)', R2.room.playerState[V].hp === before && !(a._nml.red > 0), { hp: R2.room.playerState[V].hp, before, red: a._nml.red });
}

Date.now = realNow;
if (failures) { console.log(`\n${failures} FAILURE(S)`); process.exit(1); }
console.log('\nnml-lock: all passed');
