/* Drop an item -- v2.3.3473 (server/src/itemdrop.js, docs/specs/item-drop.md).
 *
 * The owner: "add an option to "drop" items in game. After about a minute
 * they become visible to other players. After 2 minutes it begins flashing
 * and disappears".
 *
 *   1. the ask: a short key that is no Object.prototype member, a whole count;
 *   2. a drop: out of the bag, onto the ground at your feet, one row saved,
 *      the pile on your socket alone, your bag sent, an answer;
 *   3. YOURS ALONE for a minute: in nobody else's pile list (a join's, a zone
 *      change's, a roster's), nobody else's tick, and nobody else may take it;
 *      you may take it back;
 *   4. then EVERYONE'S: the room is told once, anyone near takes it whole;
 *   5. it flashes at two minutes and is gone ten seconds after, to nobody;
 *   6. the refusals: not held, a bad ask, too soon, too many, today's town
 *      and the farm, dead, in a fight with a player, `itemdrop: false`;
 *   7. the wire: a monster's pile byte for byte as before; caps.itemdrop;
 *      item_drop_result PRIVILEGED;
 *   8. a death after a drop drops only what is still in the bag.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { ITEM_DROP, dropAsk } from '../src/itemdrop.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}

function mockState() {
  const store = new Map();
  const st = {
    puts: 0,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { st.puts++; store.set(k, v); },
      list: async () => new Map(),
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
  return st;
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(s); }, close() {} }; }
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' }; }

async function makeRoom() {
  const state = mockState();
  const room = new GameRoom(state, mockEnv);
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => {
    if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; }
    return realSetInterval(fn, ms);
  };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  return { room, tickFn, state };
}
async function join(room, id) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, protocolVersion: 2, data: { x: 1000, y: 1000, z: 'town' } }));
  return { ws, id };
}
async function move(room, p, x, y, z) {
  await room.webSocketMessage(p.ws, JSON.stringify({ type: 'move', x, y, d: 'south', f: 'south', z, vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false, ex: null }));
}
function place(room, p, x, y, z) {
  const ps = room.playerState[p.id];
  ps.x = x; ps.y = y; ps.z = z;
}
const sentOf = (p, from = 0) => p.ws.sent.slice(from).map((s) => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
const answers = (p, from) => sentOf(p, from).filter((m) => m.type === 'item_drop_result').map((m) => m.payload);
async function drop(room, p, key, qty) {
  const from = p.ws.sent.length;
  const ps = room.playerState[p.id];
  if (ps) ps._dropAt = 0;
  await room.webSocketMessage(p.ws, JSON.stringify(qty === undefined ? { type: 'item_drop', key } : { type: 'item_drop', key, qty }));
  const a = answers(p, from);
  return { from, answer: a[a.length - 1] || null };
}
const pilesIn = (room, zone) => (room.loot[zone] || []);
const myDrops = (room, id) => Object.values(room.loot).flat().filter((x) => x && x.dropped && x.dropBy === id);
const tickLoot = (msgs) => msgs.filter((m) => m.type === 'tick').flatMap((m) => (Array.isArray(m.events) ? m.events : []))
  .filter((e) => e && e.type === 'loot_drop').map((e) => e.payload.pile);

/* ── 1. the ask ─────────────────────────────────────────────────────────── */
check('1a a key alone drops one', JSON.stringify(dropAsk({ key: 'wood_pine' })) === JSON.stringify({ key: 'wood_pine', qty: 1 }));
check('1b a count', dropAsk({ key: 'wood_pine', qty: 7 }).qty === 7);
check('1c a count over the trade window\'s cap is that cap', dropAsk({ key: 'wood_pine', qty: 1e6 }).qty === ITEM_DROP.MAX_QTY);
for (const bad of [{ key: '__proto__' }, { key: 'toString' }, { key: 'constructor' }, { key: '' }, { key: 'x'.repeat(33) }, { key: 5 },
  { key: 'wood_pine', qty: 0 }, { key: 'wood_pine', qty: -2 }, { key: 'wood_pine', qty: 1.5 }, { key: 'wood_pine', qty: '3' },
  { key: 'wood_pine', qty: Infinity }, { key: 'wood_pine', qty: NaN }, {}, null, 'wood_pine', [1]]) {
  check('1d not an ask (' + JSON.stringify(bad) + ')', dropAsk(bad) === null, dropAsk(bad));
}

/* ── 2-5. a drop, private, then everyone's, then gone ─────────────────── */
{
  const { room, tickFn, state } = await makeRoom();
  const T0 = room._wheelT();
  const AT = { x: T0.WHEEL_CENTRE[0], y: T0.WHEEL_CENTRE[1] + 288 };
  const A = await join(room, 'bp_drop_a');   /* the dropper */
  const B = await join(room, 'bp_drop_b');   /* a player beside them */
  for (const p of [A, B]) await move(room, p, AT.x, AT.y, WHEEL_ZONE);
  place(room, A, AT.x, AT.y, WHEEL_ZONE);
  place(room, B, AT.x + 60, AT.y, WHEEL_ZONE);
  const psA = room.playerState[A.id], psB = room.playerState[B.id];
  psA.inventory = Object.assign({}, psA.inventory || {}, { wood_pine: 5, ore_copper: 2 });
  tickFn();

  /* 2. the drop */
  const puts0 = state.puts;
  const markB = B.ws.sent.length;
  room.eventBuffer.length = 0;
  const { from, answer } = await drop(room, A, 'wood_pine', 2);
  const pile = myDrops(room, A.id)[0];
  check('2a the answer: ok, the key, the count, the pile', !!answer && answer.ok === true && answer.key === 'wood_pine' && answer.qty === 2 && !!pile && answer.lootId === pile.lootId, answer);
  check('2b out of the bag: 5 -> 3', psA.inventory.wood_pine === 3, psA.inventory);
  check('2c onto the ground just in front of your feet, in your zone, the two logs', !!pile && pile.zone === WHEEL_ZONE && pile.x === psA.x && pile.y === psA.y + ITEM_DROP.AHEAD_PX
    && JSON.stringify(pile.deathItems) === JSON.stringify([{ key: 'wood_pine', qty: 2 }]) && pile.isDeathDrop === true && pile.dropped === true, pile);
  check('2d its clocks: yours a minute, flashing at two, gone ten seconds after', !!pile && pile.privateUntil - pile.ts === ITEM_DROP.PRIVATE_MS
    && pile.ownerOnlyUntil === pile.privateUntil && pile.flashAt - pile.ts === ITEM_DROP.FLASH_MS && pile.expiry - pile.ts === ITEM_DROP.GONE_MS
    && ITEM_DROP.PRIVATE_MS === 60000 && ITEM_DROP.FLASH_MS === 120000 && ITEM_DROP.GONE_MS === 130000, pile);
  check('2e ONE row written for it (the bag\'s save)', state.puts - puts0 === 1, state.puts - puts0);
  const toA = sentOf(A, from);
  const dropMsg = toA.find((m) => m.type === 'loot_drop');
  check('2f the pile on the dropper\'s socket, as a drop, its clocks as time left', !!dropMsg && dropMsg.payload.pile.lootId === pile.lootId && dropMsg.payload.pile.dropped === true
    && dropMsg.payload.pile.dropBy === A.id && dropMsg.payload.pile.openLeft > 59000 && dropMsg.payload.pile.flashLeft > 119000 && dropMsg.payload.pile.left > 129000, dropMsg);
  check('2g ...and the dropper\'s bag (player_state)', toA.some((m) => m.type === 'player_state'), toA.map((m) => m.type));
  check('2h nothing in the room\'s events for it', room.eventBuffer.filter((e) => e && e.type === 'loot_drop').length === 0, room.eventBuffer.map((e) => e.type));

  /* 3. yours alone */
  tickFn();
  check('3a a player beside you is not sent it in a tick', tickLoot(sentOf(B, markB)).length === 0 && !sentOf(B, markB).some((m) => m.type === 'loot_drop'));
  check('3b ...nor in a pile list for them (a join\'s, a zone change\'s)', !room._zoneLootForWire(WHEEL_ZONE, B.id).some((x) => x.lootId === pile.lootId)
    && !room._zoneSnapshotWire(WHEEL_ZONE, undefined, B.id).loot.some((x) => x.lootId === pile.lootId));
  check('3c ...nor in a list for nobody in particular', !room._zoneLootForWire(WHEEL_ZONE).some((x) => x.lootId === pile.lootId));
  check('3d the dropper\'s own list has it', room._zoneLootForWire(WHEEL_ZONE, A.id).some((x) => x.lootId === pile.lootId)
    && room._zoneSnapshotWire(WHEEL_ZONE, undefined, A.id).loot.some((x) => x.lootId === pile.lootId));
  {
    const mA = A.ws.sent.length, mB = B.ws.sent.length;
    room._pushZoneRoster(WHEEL_ZONE);
    const zA = sentOf(A, mA).filter((m) => m.type === 'zone_state').pop();
    const zB = sentOf(B, mB).filter((m) => m.type === 'zone_state').pop();
    check('3e a roster\'s re-send: the dropper\'s list keeps it, the other\'s leaves it out', !!zA && !!zB
      && zA.loot.some((x) => x.lootId === pile.lootId) && !zB.loot.some((x) => x.lootId === pile.lootId), { a: zA && zA.loot.length, b: zB && zB.loot.length });
  }
  {
    const mB = B.ws.sent.length;
    await room.webSocketMessage(B.ws, JSON.stringify({ type: 'loot_pickup', payload: { lootId: pile.lootId, zone: WHEEL_ZONE } }));
    const rej = sentOf(B, mB).find((m) => m.type === 'loot_pickup_rejected');
    check('3f the other player may not take it in the minute', !!rej && rej.payload.reason === 'not-recipient' && !(psB.inventory && psB.inventory.wood_pine) && myDrops(room, A.id).length === 1, rej);
  }

  /* 4. then everyone's */
  {
    const mA = A.ws.sent.length, mB = B.ws.sent.length;
    room.eventBuffer.length = 0;
    room._dropDevAge(A.id, { ms: ITEM_DROP.PRIVATE_MS + 5 });
    const toA = sentOf(A, mA).filter((m) => m.type === 'loot_drop');
    check('4-dev /dev/dropage tells the dropper its new clocks, a private drop to them alone (nothing to the room, nothing to B)',
      toA.length === 1 && toA[0].payload.pile.lootId === pile.lootId && toA[0].payload.pile.openLeft === 0
        && room.eventBuffer.length === 0 && sentOf(B, mB).filter((m) => m.type === 'loot_drop').length === 0, { toA: toA.length, room: room.eventBuffer.length });
  }
  room.eventBuffer.length = 0;
  room._tickLoot();
  const told = room.eventBuffer.filter((e) => e && e.type === 'loot_drop');
  check('4a its minute up, the room is told -- once', told.length === 1 && told[0].payload.pile.lootId === pile.lootId && pile.revealed === true, told.length);
  room.eventBuffer.length = 0;
  room._tickLoot();
  check('4b ...and not again', room.eventBuffer.filter((e) => e && e.type === 'loot_drop').length === 0);
  check('4c every list has it now', room._zoneLootForWire(WHEEL_ZONE, B.id).some((x) => x.lootId === pile.lootId) && room._zoneLootForWire(WHEEL_ZONE).some((x) => x.lootId === pile.lootId));
  {
    const mB = B.ws.sent.length;
    await room.webSocketMessage(B.ws, JSON.stringify({ type: 'loot_pickup', payload: { lootId: pile.lootId, zone: WHEEL_ZONE } }));
    const credit = sentOf(B, mB).find((m) => m.type === 'loot_credit');
    check('4d anyone near takes it whole: B\'s bag +2 logs, the pile gone', !!credit && JSON.stringify(credit.payload.items) === JSON.stringify([{ key: 'wood_pine', qty: 2 }])
      && psB.inventory.wood_pine === 2 && myDrops(room, A.id).length === 0 && psA.inventory.wood_pine === 3, { credit, inv: psB.inventory });
  }

  /* 3g. the dropper takes one back in their minute */
  {
    const r = await drop(room, A, 'ore_copper');
    const p2 = myDrops(room, A.id)[0];
    check('3g a second drop (one ore of two)', r.answer && r.answer.ok && psA.inventory.ore_copper === 1 && !!p2, r.answer);
    const mA = A.ws.sent.length;
    await room.webSocketMessage(A.ws, JSON.stringify({ type: 'loot_pickup', payload: { lootId: p2.lootId, zone: WHEEL_ZONE } }));
    check('3h ...and the dropper takes it back inside the minute', psA.inventory.ore_copper === 2 && myDrops(room, A.id).length === 0
      && sentOf(A, mA).some((m) => m.type === 'loot_credit'), psA.inventory);
  }

  /* 5. flashing, then gone, to nobody */
  {
    const r = await drop(room, A, 'wood_pine', 3);
    const p3 = myDrops(room, A.id)[0];
    check('5a a drop of every log you have (3), the key leaves the bag', r.answer && r.answer.ok && r.answer.qty === 3 && !('wood_pine' in psA.inventory) && !!p3, { a: r.answer, inv: psA.inventory });
    room._dropDevAge(A.id, { ms: ITEM_DROP.FLASH_MS + 1000 });
    const w = room._serializePile(p3);
    check('5b at two minutes the wire says flash now (flashLeft 0), with ~9 s left', w.flashLeft === 0 && w.left > 8000 && w.left <= 9000, w);
    room.eventBuffer.length = 0;
    room._tickLoot();
    check('5c still on the ground until its end', myDrops(room, A.id).length === 1);
    room._dropDevAge(A.id, { ms: ITEM_DROP.GONE_MS - ITEM_DROP.FLASH_MS });
    room.eventBuffer.length = 0;
    room._tickLoot();
    const gone = room.eventBuffer.filter((e) => e && e.type === 'loot_despawn' && e.payload.lootId === p3.lootId);
    check('5d at its end it is gone, to nobody (loot_despawn; nobody\'s bag)', gone.length === 1 && myDrops(room, A.id).length === 0
      && !('wood_pine' in psA.inventory) && psB.inventory.wood_pine === 2, gone);
  }

  /* 6. refusals */
  const refuse = async (label, key, qty, want, before) => {
    if (before) before();
    const r = await drop(room, A, key, qty);
    check('6 ' + label + ' -> ' + want, !!r.answer && r.answer.ok === false && r.answer.reason === want, r.answer);
  };
  psA.inventory.fish_minnow = 4;
  await refuse('not in the bag', 'wood_maple', 1, 'none');
  await refuse('a bad count', 'fish_minnow', 0, 'bad');
  await refuse('a prototype key', '__proto__', 1, 'bad');
  {
    const r1 = await drop(room, A, 'fish_minnow', 1);
    room.playerState[A.id]._dropAt = Date.now();
    const from = A.ws.sent.length;
    await room.webSocketMessage(A.ws, JSON.stringify({ type: 'item_drop', key: 'fish_minnow', qty: 1 }));
    const a = answers(A, from).pop();
    check('6 a second drop inside ' + ITEM_DROP.GAP_MS + ' ms -> slow', r1.answer && r1.answer.ok && a && a.reason === 'slow' && psA.inventory.fish_minnow === 3, a);
  }
  {
    psA.inventory.trap_box = 40;
    let ok = myDrops(room, A.id).length;
    while (ok < ITEM_DROP.MAX_LIVE) { const r = await drop(room, A, 'trap_box', 1); if (!(r.answer && r.answer.ok)) break; ok++; }
    check('6 ' + ITEM_DROP.MAX_LIVE + ' of your drops on the ground (guard)', myDrops(room, A.id).length === ITEM_DROP.MAX_LIVE, myDrops(room, A.id).length);
    await refuse('one more', 'trap_box', 1, 'too-many');
    check('6 ...and the bag keeps it', psA.inventory.trap_box === 40 - (ITEM_DROP.MAX_LIVE - 1), psA.inventory.trap_box);
    for (const p of myDrops(room, A.id)) room._despawnLoot(p.zone, p.lootId);
  }
  await refuse('in today\'s town', 'fish_minnow', 1, 'not-here', () => { psA.z = 'town'; });
  await refuse('on the farm', 'fish_minnow', 1, 'not-here', () => { psA.z = 'farm_home'; });
  await refuse('in the old World View', 'fish_minnow', 1, 'not-here', () => { psA.z = 'worldview'; });
  psA.z = WHEEL_ZONE;
  await refuse('dead', 'fish_minnow', 1, 'dead', () => { psA.dead = true; });
  psA.dead = false;
  {
    const real = room._bagLockedByFight;
    room._bagLockedByFight = () => true;
    await refuse('in a fight with a player', 'fish_minnow', 1, 'fight');
    room._bagLockedByFight = real;
  }
  {
    room._liveFlags = Object.assign(Object.create(null), room._liveFlags || {}, { itemdrop: false });
    await refuse('itemdrop: false', 'fish_minnow', 1, 'off');
    room._liveFlags = Object.assign(Object.create(null), room._liveFlags, { itemdrop: true });
    const r = await drop(room, A, 'fish_minnow', 1);
    check('6 back on: it drops', !!r.answer && r.answer.ok === true, r.answer);
  }
  check('6 nothing refused left the bag (3 minnows -> 2 after the one drop that went)', psA.inventory.fish_minnow === 2, psA.inventory.fish_minnow);
  {
    const r = await drop(room, A, 'fish_minnow', 50);
    check('6 asking for more than you hold drops what you hold', !!r.answer && r.answer.ok && r.answer.qty === 2 && !('fish_minnow' in psA.inventory), r.answer);
  }

  /* 8. a death after a drop */
  {
    psA.inventory = { ore_iron: 3, wood_pine: 1 };
    await drop(room, A, 'ore_iron', 3);
    const d = room._spawnDeathPile(psA, A.id);
    const keys = d ? d.deathItems.map((it) => it.key) : [];
    check('8 a death after a drop: the death pile holds only what is still in the bag', !keys.includes('ore_iron'), keys);
    if (d) room._despawnLoot(d.zone, d.lootId);
  }
}

/* ── 7. the wire, the cap, the forge ───────────────────────────────────── */
{
  const { room } = await makeRoom();
  const A = await join(room, 'bp_drop_w');
  const p = { lootId: 'mk-x-1', zone: WHEEL_ZONE, x: 1, y: 2, coins: 5, skull: null, shard: null, recipients: ['a'], shares: { a: 1 }, killerName: 'a', ts: 1, inventoryClaimed: false, claimedBy: {} };
  const w = room._serializePile(p);
  check('7a a monster\'s pile carries no drop field', !('dropped' in w) && !('left' in w) && !('openLeft' in w) && !('flashLeft' in w) && !('dropBy' in w), Object.keys(w));
  const sync = A.ws.sent.map((x) => JSON.parse(x)).find((m) => m.type === 'state_sync');
  check('7b state_sync advertises caps.itemdrop', !!(sync && sync.caps && sync.caps.itemdrop === true), sync && sync.caps && sync.caps.itemdrop);
  check('7c item_drop_result is PRIVILEGED (no phone can forge one)', PRIVILEGED_EVENTS.has ? PRIVILEGED_EVENTS.has('item_drop_result') : PRIVILEGED_EVENTS.includes('item_drop_result'));
  room._liveFlags = Object.assign(Object.create(null), room._liveFlags || {}, { itemdrop: false });
  const B = await join(room, 'bp_drop_w2');
  const sync2 = B.ws.sent.map((x) => JSON.parse(x)).find((m) => m.type === 'state_sync');
  check('7d `itemdrop: false` un-advertises it at the next join', !!(sync2 && sync2.caps && sync2.caps.itemdrop === false), sync2 && sync2.caps && sync2.caps.itemdrop);
}

console.log(`\nitemdrop: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
