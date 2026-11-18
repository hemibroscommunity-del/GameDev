/* ═══ v2.3.5715: GEAR IS WORN ONLY IF THE WORKER HOLDS IT (card SEC PR 16) ═══
 * (server/src/gearstash.js "GEAR IS WORN ONLY IF THE WORKER HOLDS IT";
 * grids.js, the armour and legs describe branches)
 *
 *   1. A character with an empty bag that DESCRIBES an elite chest and legs
 *      wears neither: no reduction in a blow (_armorDrMult as before), no
 *      piece put in its stash, and its worn slots sent back.
 *   2. A character re-equipping a piece the worker holds (in its stash, by
 *      the describe path) still can: worn, and taken from the stash.
 *   3. A record's join takes no armour or legs claims, captured or not
 *      (the worker keeps those two live); since v2.3.5812 (`shieldclaim`) an
 *      unbacked shield claim is not merged either.
 *      Gatekeeper Z40's probe: an UNCAPTURED record (the honest usual, since
 *      the worker adds every piece itself) joining with a forged elite chest
 *      and then describing it wears nothing, and is not stamped captured.
 *   4. What is already worn or stashed on file is untouched by the join.
 *   5. `gearheld: false`: the old way (the described piece worn, the claim
 *      merged).
 *   6. A piece with no tierMult (Z40's review): the stash's copy has 1
 *      (sanitizeGearPiece); described as it was, it is still the worker's,
 *      so it goes on and leaves the stash.
 *
 * BREAK PROOF (rule 8), tried by hand: main's grids.js and gearstash.js ->
 * FAIL 1 (worn, 15% of a blow), 2 and 3 (the claim merged).  The first
 * build (claims closed only once captured, the raw signature) -> FAIL 3's
 * probe and 6.
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
  /* v2.3.5812 (card RV PR 12, `shieldclaim`): the worker does keep the
     shield live (shieldwear.js, v2.3.3091), so a shield claim the ledger
     does not back is not merged either (shield-claim.test is that gate's) */
  check('3. ...a shield claim the ledger does not back is not merged either (shieldclaim)', ps.shieldStash.length === 0, ps.shieldStash);
  check('4. what is already worn and stashed on file is untouched', ps.armor && ps.armor.name === 'Iron Plate' && ps.armorStash[0].name === 'Copper Plate', { armor: ps.armor });
  const fresh = await world('bp_gh_fresh', record({ gearStashCaptured: false }), null, { rpgArmorStash: [copper()], rpgShieldStash: [{ name: 'Pine Shield', gearBase: 'wood', tierMult: 1, tier: 't1' }] });
  check('3. a record not yet captured takes no armour claim either', fresh.ps.armorStash.length === 0, fresh.ps.armorStash);
  check('3. ...nor its unbacked shield claim (shieldclaim)', fresh.ps.shieldStash.length === 0, fresh.ps.shieldStash);
}

/* 3. Z40's probe: an uncaptured record, a forged chest at the join, then the describe */
{
  const { room, ws, ps } = await world('bp_gh_probe', record({ gearStashCaptured: false }), null, { rpgArmorStash: [eliteChest()] });
  const dr0 = room._armorDrMult(ps);
  check('3. an uncaptured record\'s forged elite chest is not merged', ps.armorStash.length === 0, ps.armorStash);
  check('3. ...and the record is not stamped captured by it', !ps.gearStashCaptured, ps.gearStashCaptured);
  await describe(room, ws, { armor: eliteChest() });
  check('3. ...so describing it wears nothing and takes no reduction', !ps.armor && room._armorDrMult(ps) === dr0, { armor: ps.armor, dr0, now: room._armorDrMult(ps) });
}

/* 5. the switch */
{
  const { ps, room, ws } = await world('bp_gh_off', record(), { gearheld: false }, { rpgArmorStash: [eliteChest()] });
  check('5. gearheld: false: a captured record\'s claim merged, as before', ps.armorStash.length === 1, ps.armorStash);
  await describe(room, ws, { legsArmor: eliteLegs() });
  check('5. ...and a described piece worn, as before', ps.legsArmor && ps.legsArmor.name === 'Mithril Greaves', ps.legsArmor);
}

/* 6. a piece with no tierMult */
{
  const plain = () => ({ name: 'Bronze Plate', gearBase: 'bronze', tier: 't2' });   /* no tierMult */
  const { room, ws, ps } = await world('bp_gh_plain', record({ armorStash: [plain()] }));
  check('6. (the stash\'s copy has tierMult 1, as sanitizeGearPiece makes it, guard)', ps.armorStash.length === 1 && ps.armorStash[0].tierMult === 1, ps.armorStash);
  await describe(room, ws, { armor: plain() });
  check('6. described with no tierMult, the piece the worker holds goes on', ps.armor && ps.armor.name === 'Bronze Plate', ps.armor);
  check('6. ...and leaves the stash (no copy left behind)', ps.armorStash.length === 0, ps.armorStash);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
