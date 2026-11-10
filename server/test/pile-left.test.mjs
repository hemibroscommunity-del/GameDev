/* ═══ v2.3.4383: A DEATH PILE'S WINDOWS GO AS TIME LEFT ═══
 *
 * The state-machine sweep (2026-11-03, V22; review R3 item 8: "the time-left
 * wire is the real cure").  v2.3.4364 put a pile's worker times on the
 * phone's clock from the pings, but a phone that had not had its first ping
 * (the first 3 s after joining) read them on its own clock: 2 minutes fast,
 * its own bag was cut on its first frame.  The worker now sends a death
 * pile's minute and end as time left (`openLeft`, `left`), the dropped item's
 * own shape (v2.3.3473, `_dropWire`).
 *   1. every road a death pile is sent by carries them: loot_drop, a join's
 *      state_sync (protocol 2 and 1), a zone list (zone_state / zone_loot /
 *      the dungeon's); a monster's pile carries none;
 *   2. no extra message and no storage write;
 *   3. `pileleft: false` (lower case) stops them; the old fields still go;
 *   4. the phone, wsClient's own _buildServerPile run here BEFORE any ping:
 *      a clock 3 minutes fast and one 3 minutes slow build the worker's
 *      windows; the first ping's rebase leaves them alone;
 *   5. loot_pickup_rejected echoes viaPet, and the phone leaves the hand's
 *      ask alone on the pet's out-of-range.
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { GameRoom } from '../src/index.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { makeWorkerClock, rebasePiles } from '../../src/game/workerClock.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}

function mockState() {
  const store = new Map();
  const st = {
    puts: 0,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { st.puts++; store.set(k, v); },
      list: async () => new Map(),
      delete: async (k) => { st.puts++; store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
  return st;
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(s); }, close() {} }; }
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' }; }
async function join(room, id, pv) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, ws: [1, 5], protocolVersion: pv, data: { x: 1000, y: 1000, z: WHEEL_ZONE } }));
  return { ws, id };
}
const msgs = (p) => p.ws.sent.map((s) => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
const near = (a, b, tol = 200) => typeof a === 'number' && Math.abs(a - b) <= tol;

const state = mockState();
const room = new GameRoom(state, mockEnv);
const A = await join(room, 'bp_left_a', 2);
const psA = room.playerState[A.id];
psA.z = WHEEL_ZONE; psA.x = 1000; psA.y = 1000;
psA.inventory = Object.assign(psA.inventory || {}, { wood_pine: 2 });

/* ── 1. every road ── */
const putsBefore = state.puts;
const bufBefore = room.eventBuffer.length;
const sentBefore = A.ws.sent.length;
const pile = room._spawnDeathPile(psA, A.id);
check('0 a death pile in the Wheel', !!pile && pile.isDeathDrop, pile);
const drop = room.eventBuffer.slice(bufBefore).filter((e) => e.type === 'loot_drop');
const dw = drop[0] && drop[0].payload.pile;
check('1a loot_drop: the minute and the end as time left',
  !!dw && near(dw.openLeft, room.DEATH_PILE_OWNER_MS) && near(dw.left, room.DEATH_PILE_TOTAL_MS), dw && { openLeft: dw.openLeft, left: dw.left });
check('1b ...the worker\'s own times still go (an old phone reads them)', !!dw && dw.ownerOnlyUntil === pile.ownerOnlyUntil && dw.expiry === pile.expiry);
check('1c ...and it is no dropped item', !!dw && !('dropped' in dw) && !('flashLeft' in dw) && !('dropBy' in dw), dw && Object.keys(dw));
/* ── 2. no extra message, no storage write ── */
check('2a one loot_drop, as before', drop.length === 1 && room.eventBuffer.length - bufBefore === 1, room.eventBuffer.slice(bufBefore).map((e) => e.type));
check('2b no message sent straight to a socket by the pile', A.ws.sent.length === sentBefore);
check('2c no storage write', state.puts === putsBefore, state.puts - putsBefore);
{
  const p0 = state.puts;
  room._serializePile(pile); room._zoneLootForWire(WHEEL_ZONE); room._zoneSnapshotWire(WHEEL_ZONE);
  check('2d sending the pile writes nothing', state.puts === p0);
}
/* time passes on the worker: the time left counts down */
pile.ownerOnlyUntil -= 20000; pile.expiry -= 20000; pile.ts -= 20000;
for (const [label, pv] of [['protocol 2', 2], ['protocol 1', 1]]) {
  const B = await join(room, 'bp_left_' + pv, pv);
  const sync = msgs(B).find((m) => m.type === 'state_sync');
  const w = sync && Array.isArray(sync.loot) && sync.loot.find((x) => x.lootId === pile.lootId);
  check('1d a join\'s state_sync, ' + label + ': time left, counted down',
    !!w && near(w.openLeft, room.DEATH_PILE_OWNER_MS - 20000) && near(w.left, room.DEATH_PILE_TOTAL_MS - 20000), w ? { openLeft: w.openLeft, left: w.left } : sync && sync.loot);
}
{
  const snap = room._zoneSnapshotWire(WHEEL_ZONE);
  const w = snap && snap.loot.find((x) => x.lootId === pile.lootId);
  check('1e a zone list (zone_state, zone_loot, the roster push): time left', !!w && near(w.left, room.DEATH_PILE_TOTAL_MS - 20000) && near(w.openLeft, room.DEATH_PILE_OWNER_MS - 20000), w);
  const w2 = room._zoneLootForWire(WHEEL_ZONE, A.id).find((x) => x.lootId === pile.lootId);
  check('1f a zone list for one viewer (a join, the dungeon\'s): time left', !!w2 && typeof w2.left === 'number' && typeof w2.openLeft === 'number', w2);
  pile.ownerOnlyUntil = Date.now() - 5000;
  check('1g a window past is 0, never negative', room._serializePile(pile).openLeft === 0);
  pile.ownerOnlyUntil = Date.now() + 40000;
}
{
  const kill = { lootId: 'mk-x-1', zone: WHEEL_ZONE, x: 1, y: 2, coins: 5, skull: null, shard: null, recipients: ['a'], shares: { a: 1 }, killerName: 'a', ts: 1, inventoryClaimed: false, claimedBy: {} };
  const w = room._serializePile(kill);
  check('1h a monster\'s pile carries neither (its wire as before)', !('left' in w) && !('openLeft' in w), Object.keys(w));
}
/* ── 3. the switch ── */
{
  const was = room._liveFlags;
  room._liveFlags = Object.assign(Object.create(null), was || {}, { pileleft: false });
  const off = room._serializePile(pile);
  room._liveFlags = Object.assign(Object.create(null), was || {}, { pileleft: true });
  const on = room._serializePile(pile);
  room._liveFlags = was;
  check('3a `pileleft: false` stops the time left; the worker\'s times still go',
    !('left' in off) && !('openLeft' in off) && off.expiry === pile.expiry && off.ownerOnlyUntil === pile.ownerOnlyUntil, Object.keys(off));
  check('3b `pileleft: true` and nothing set: on', typeof on.left === 'number' && typeof room._serializePile(pile).left === 'number');
  check('3c the switch is a lower-case name', /^[a-z0-9_]+$/.test('pileleft'));
}

/* ── 4. the phone, before any ping ── */
const ws = readFileSync(new URL('../../src/networking/wsClient.js', import.meta.url), 'utf8');
function cut(text, from, to) {
  const i = text.indexOf(from);
  if (i < 0) return null;
  const j = text.indexOf(to, i + from.length);
  return j < 0 ? null : text.slice(i, j);
}
const buildSrc = cut(ws, '      function _dropAt(p, field) {', '      /* Server-issued loot_credit handler.');
check('4a _dropAt and _buildServerPile cut from wsClient.js', !!buildSrc);
function runBuild(wire, clock, phoneNow) {
  try {
    const ctx = { RARITY_TIERS: {}, workerClock: clock, isFinite, Number, Math, Array, Date: { now: () => phoneNow } };
    return vm.runInNewContext(buildSrc + '; _buildServerPile', ctx)(wire, 'bp_me');
  } catch (e) { return { error: String(e).slice(0, 200) }; }
}
if (buildSrc) {
  const W0 = 1_800_000_000_000;   /* the worker's clock as it sends */
  /* the wire as the worker sends it now: a pile 1 s old */
  const wire = { lootId: 'D1', zone: WHEEL_ZONE, x: 1, y: 2, isDeathDrop: true, recipients: ['bp_me'], deathItems: [],
    ts: W0 - 1000, ownerOnlyUntil: W0 + 59000, expiry: W0 + 119000, openLeft: 59000, left: 119000 };
  for (const [label, skew] of [['3 min fast', 180000], ['3 min slow', -180000]]) {
    const k = makeWorkerClock();           /* no ping yet */
    const phoneNow = W0 + skew;
    const b = runBuild(wire, k, phoneNow);
    check('4b a phone ' + label + ', before any ping: its bag ends in 119 s on this phone',
      !!b && !b.error && b.expiry === phoneNow + 119000, b && (b.error || { left: b.expiry - phoneNow }));
    check('4c ...and its minute ends in 59 s', !!b && b.ownerOnlyUntil === phoneNow + 59000, b && b.ownerOnlyUntil - phoneNow);
    /* the first ping: the offset is learned and the piles rebased */
    k.sample(W0 + 500, phoneNow + 540);
    const before = { e: b.expiry, o: b.ownerOnlyUntil };
    rebasePiles([b], k);
    check('4d ...the first ping leaves its windows where they are (they were already this phone\'s)',
      b.expiry === before.e && b.ownerOnlyUntil === before.o, { e: b.expiry - before.e, o: b.ownerOnlyUntil - before.o });
    check('4e ...and moves its ts onto the worker\'s clock (its age is about 1 s)', near(phoneNow - b.ts, 1000, 100), phoneNow - b.ts);
  }
  /* an old worker: no time left, the v2.3.4364 road as it was */
  const k = makeWorkerClock();
  k.sample(W0, W0 + 180000 + 40);
  const old = runBuild({ ...wire, openLeft: undefined, left: undefined }, k, W0 + 180000);
  check('4f an older worker\'s death pile (no time left): the learned clock, as before',
    !!old && near(old.expiry - (W0 + 180000), 119000, 100) && !old._leftWire, old && (old.error || old.expiry - (W0 + 180000)));
  const d = runBuild({ ...wire, dropped: true, flashLeft: 40000 }, k, W0 + 180000);
  check('4g a dropped item: unchanged (time left, its flash too)', !!d && d.expiry === W0 + 180000 + 119000 && d.flashAt === W0 + 180000 + 40000, d);
}

/* ── 5. viaPet ── */
{
  const B = msgs(A).length;
  room._handleLootPickup(room._sessionById(A.id), { lootId: 'nope', zone: WHEEL_ZONE, viaPet: true });
  room._handleLootPickup(room._sessionById(A.id), { lootId: 'nope', zone: WHEEL_ZONE });
  const rj = msgs(A).slice(B).filter((m) => m.type === 'loot_pickup_rejected').map((m) => m.payload);
  check('5a the pet\'s refusal says it was the pet\'s', rj.length === 2 && rj[0].viaPet === true && rj[0].reason === 'no-pile', rj);
  check('5b the hand\'s carries no viaPet', rj.length === 2 && !('viaPet' in rj[1]), rj);
  const rjSrc = cut(ws, "          case 'loot_pickup_rejected':", "          case 'player_state':");
  if (rjSrc) {
    const p = { lootId: 'K', _serverLoot: true, recipients: ['bp_me'], _pickupPending: true, _petPickupPending: true };
    const body = rjSrc.replace("case 'loot_pickup_rejected':", '').replace(/\bbreak;/g, 'return;');
    const run = (payload) => vm.runInNewContext('(function () {' + body + '})', {
      msg: { payload }, S: { player: {}, groundLoot: [p] }, console: { log() {} },
      notRecipientRetry: () => false, Date: { now: () => 1000 },
    })();
    run({ lootId: 'K', reason: 'out-of-range', viaPet: true });
    check('5c the pet\'s out-of-range leaves the hand\'s ask and its tries alone', p._pickupPending === true && !p._pickupTries, p);
    run({ lootId: 'K', reason: 'out-of-range' });
    check('5d the hand\'s out-of-range re-arms the hand, as before', p._pickupPending === false && p._pickupTries === 1 && p._pickupRetryAt === 1300, p);
  } else check('5c the refusal handler cut from wsClient.js', false);
}

console.log(`\npile-left: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
