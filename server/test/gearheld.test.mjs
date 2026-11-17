/* ═══ v2.3.5715: GEAR IS WORN ONLY IF THE WORKER HOLDS IT (card SEC PR 16) ═══
 * (server/src/gearstash.js "GEAR IS WORN ONLY IF THE WORKER HOLDS IT";
 * grids.js, the armour and legs describe branches)
 *
 *   1. A character with an empty bag that DESCRIBES an elite chest and legs
 *      wears neither: no reduction in a blow (_armorDrMult as before), no
 *      piece put in its stash, and its worn slots sent back.
 *   2. A character re-equipping a piece the worker holds (in its stash, by
 *      the describe path) still can: worn, and taken from the stash.
 *   3. A captured record's join takes no more armour or legs claims (the
 *      worker keeps those two live); a shield claim is still merged; a
 *      record not yet captured takes its armour claim as before.
 *   4. What is already worn or stashed on file is untouched by the join.
 *   5. `gearheld: false`: the old way (the described piece worn, the claim
 *      merged).
 *
 * BREAK PROOF (rule 8), tried by hand: main's grids.js and gearstash.js ->
 * FAIL 1 (worn, 15% of a blow), 2 and 3 (the claim merged).
 * Not a phone test: node, the shared test room (testroom.mjs). */
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';
import { RPG_SCHEMA_VERSION } from '../src/migrations.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}
const ECON = { v: 1, g: { m: 0, b: 0 }, i: {} };
const record = (extra) => ({ _v: RPG_SCHEMA_VERSION, coins: 10, inventory: {}, level: 20, hp: 100, maxHp: 100, _econ: ECON,
  armorStash: [], legsStash: [], shieldStash: [], gearStash: [], amuletStash: [], gearStashCaptured: true, ...(extra || {}) });
const eliteChest = () => ({ name: 'Mithril Torso', gearBase: 'mithril', tierMult: 6, tier: 't6', quality: 'elite' });
const eliteLegs = () => ({ name: 'Mithril Greaves', gearBase: 'mithril', tierMult: 6, tier: 't6', quality: 'elite' });
const copper = () => ({ name: 'Copper Plate', gearBase: 'copper', tierMult: 2, tier: 't2' });

async function world(pid, rec, flags, data) {
  const st = makeStorage(new Map([['rpg:' + pid, rec]]));
  const room = await openRoom(st, flags);
  room._prog3EquipOk = () => true;   /* the defence-point gate is its own suite's */
  const ws = fakeWs(pid);
  const back = [console.warn, console.error]; console.warn = () => {}; console.error = () => {};
  try { await join(room, ws, pid, { loginTaken: true, data: { x: 100, y: 100, z: 'town', ...(data || {}) } }); } finally { [console.warn, console.error] = back; }
  return { st, room, ws, ps: room.playerState[pid] };
}
const describe = async (room, ws, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type: 'stats_update', payload })); await settle(); };

/* 1. the empty bag */
{
  const { room, ws, ps } = await world('bp_gh_empty', record());
  const dr0 = room._armorDrMult(ps);
  ws.sent.length = 0;
  await describe(room, ws, { armor: eliteChest() });
  await describe(room, ws, { legsArmor: eliteLegs() });
  check('1. an empty bag that describes an elite chest and legs wears neither', !ps.armor && !ps.legsArmor, { armor: ps.armor, legs: ps.legsArmor });
  check('1. ...takes no reduction in a blow', room._armorDrMult(ps) === dr0, { dr0, now: room._armorDrMult(ps) });
  check('1. ...and no piece is put in its stash', ps.armorStash.length === 0 && ps.legsStash.length === 0, { a: ps.armorStash, l: ps.legsStash });
  check('1. ...and its worn slots are sent back', ws.sent.some((m) => m.type === 'player_state' && m.payload && 'armor' in m.payload), ws.sent.map((m) => m.type));
}

/* 2. a piece the worker holds */
{
  const { room, ws, ps } = await world('bp_gh_held', record({ armorStash: [copper()] }));
  await describe(room, ws, { armor: copper() });
  check('2. re-equipping a piece the worker holds still works', ps.armor && ps.armor.name === 'Copper Plate', ps.armor);
  check('2. ...and it leaves the stash', ps.armorStash.length === 0, ps.armorStash);
  check('2. ...and counts in a blow', room._armorDrMult(ps) < 1, room._armorDrMult(ps));
  await describe(room, ws, { armor: eliteChest() });
  check('2. a piece it does not hold, described next, does not replace it', ps.armor && ps.armor.name === 'Copper Plate', ps.armor);
}

/* 3 + 4. the join */
{
  const claims = { rpgArmorStash: [copper(), eliteChest()], rpgLegsStash: [eliteLegs()], rpgShieldStash: [{ name: 'Pine Shield', gearBase: 'wood', tierMult: 1, tier: 't1' }] };
  const { ps } = await world('bp_gh_join', record({ armorStash: [copper()], armor: { name: 'Iron Plate', gearBase: 'iron', tierMult: 3, tier: 't3' } }), null, claims);
  check('3. a captured record\'s join takes no more armour or legs claims', ps.armorStash.length === 1 && ps.armorStash[0].name === 'Copper Plate' && ps.legsStash.length === 0, { a: ps.armorStash.map((g) => g.name), l: ps.legsStash.map((g) => g.name) });
  check('3. ...a shield claim is still merged (the worker keeps no live shield stash)', ps.shieldStash.length === 1, ps.shieldStash);
  check('4. what is already worn and stashed on file is untouched', ps.armor && ps.armor.name === 'Iron Plate' && ps.armorStash[0].name === 'Copper Plate', { armor: ps.armor });
  const fresh = await world('bp_gh_fresh', record({ gearStashCaptured: false }), null, { rpgArmorStash: [copper()] });
  check('3. a record not yet captured takes its armour claim, as before', fresh.ps.armorStash.length === 1, fresh.ps.armorStash);
}

/* 5. the switch */
{
  const { ps, room, ws } = await world('bp_gh_off', record(), { gearheld: false }, { rpgArmorStash: [eliteChest()] });
  check('5. gearheld: false: a captured record\'s claim merged, as before', ps.armorStash.length === 1, ps.armorStash);
  await describe(room, ws, { legsArmor: eliteLegs() });
  check('5. ...and a described piece worn, as before', ps.legsArmor && ps.legsArmor.name === 'Mithril Greaves', ps.legsArmor);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
