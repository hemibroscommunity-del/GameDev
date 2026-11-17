/* ═══ v2.3.5703: THE BAG-SIZE SWITCH NEVER DESTROYS WHAT IS STORED (card SEC PR 4) ═══
 * (docs/ARCHITECTURE-HANDOFF.md rule 3; server/src/gearstash.js "THE CUTS")
 *
 * `disable_bigbags` lowered the caps to 8 weapons and 32 of each gear list
 * (liveops.js _syncBagCaps), and the cuts rule 3 calls "the cuts that
 * remain" ran at those lowered caps: the join's weapon bag
 * (gear.js _sanitizeWeaponList), the gear lists' at the save
 * (persistence.js capStash) and at the join (gearstash.js).  A player's 140
 * weapons became 8 on file at their next login.  Now those cuts run at the
 * NORMAL caps (140 and 48) whatever the switch says; the switch lowers only
 * what a give may fill (the stashes' door, stash.js stashGive).
 *
 *   1. disable_bigbags thrown: a stored character with 140 weapons and 48 of
 *      each gear list joins and is saved: all of it on file, in order.
 *   2. ...and a give into a bag over the lowered cap is refused (the door):
 *      a weapon, an armour piece.
 *   3. The switch off: the same character joins and saves as today (140
 *      and 48 kept; a give into a full 140 bag refused).
 *   4. The cuts still run at the normal caps: a stored bag OVER 140 / 48 (a
 *      hand-restored record) is cut there, switch thrown or not.
 *
 * No kill switch, for rule 3's own reason: one would only bring back a cut
 * that destroys weapons.
 *
 * BREAK PROOF (rule 8), tried by hand: the cuts back on the lowered caps
 * (main's way) -> FAIL 1 (8 weapons and 32 pieces on file).
 * Not a phone test: node, the shared test room (testroom.mjs). */
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';
import { GEAR_STASH_FIELDS, GEAR_STASH_CAP, WEAPON_STASH_CAP_NEW, gearStashCap } from '../src/gearstash.js';
import { stashGive } from '../src/stash.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}
const PID = 'bp_bagkeep';
const weapon = (i) => ({ type: 'sword', gearBase: 'iron', tier: 'common', tierMult: 1, name: 'Blade ' + i, quality: 'common', hardness: 0, temper: 0 });
const piece = (slot, i) => ({ name: 'Piece ' + i, gearBase: 'ww_copper', tierMult: 1, tier: 't1', def: 2, slot, mat: 'copper', quality: 'common', hardness: 0, temper: 0 });
const cosmetic = (i) => ({ slot: 'head', gearId: 'hat_' + i, name: 'Hat ' + i });
const SLOT = { armorStash: 'armor', legsStash: 'legs', shieldStash: 'shield' };
function record(nW, nG) {
  const r = { _v: 21, coins: 100, inventory: {}, level: 5, hp: 100, maxHp: 100, gearStashCaptured: true, _econ: { v: 1, g: { m: 0, b: 0 }, i: {} } };
  r.weaponStash = Array.from({ length: nW }, (_, i) => weapon(i));
  for (const f of GEAR_STASH_FIELDS) {
    if (f === 'gearStash') r[f] = Array.from({ length: nG }, (_, i) => cosmetic(i));
    else if (SLOT[f]) r[f] = Array.from({ length: nG }, (_, i) => piece(SLOT[f], i));
    else r[f] = [];
  }
  return r;
}
async function played(flags, nW, nG) {
  const st = makeStorage(new Map([['rpg:' + PID, record(nW, nG)]]));
  const room = await openRoom(st, flags);
  const back = [console.warn, console.error]; console.warn = () => {}; console.error = () => {};
  try {
    await join(room, fakeWs('p'), PID, { loginTaken: true });
    const ps = room.playerState[PID];
    await room._saveRpg(PID, ps);
    await settle();
  } finally { [console.warn, console.error] = back; }
  const f = st._store.get('rpg:' + PID) || {};
  const ps = room.playerState[PID];
  const lens = (o) => Object.fromEntries(['weaponStash', ...GEAR_STASH_FIELDS.filter((x) => x !== 'amuletStash')].map((k) => [k, Array.isArray(o[k]) ? o[k].length : -1]));
  return { room, ps, file: lens(f), mem: lens(ps), firstLast: [f.weaponStash && f.weaponStash[0] && f.weaponStash[0].name, f.weaponStash && f.weaponStash[nW - 1] && f.weaponStash[nW - 1].name] };
}
const full = (o, w, g) => o.weaponStash === w && o.armorStash === g && o.legsStash === g && o.shieldStash === g && o.gearStash === g;

/* 1. the switch thrown: nothing stored is cut */
{
  const r = await played({ disable_bigbags: true }, 140, 48);
  check('1. disable_bigbags: the lowered caps are 8 and 32 (the switch still lowers what a give may fill)', r.room.WEAPON_STASH_CAP === 8 && gearStashCap() === 32, { w: r.room.WEAPON_STASH_CAP, g: gearStashCap() });
  check('1. ...a join keeps 140 weapons and 48 of each gear list in the room', full(r.mem, 140, 48), r.mem);
  check('1. ...and the save keeps them all on file', full(r.file, 140, 48), r.file);
  check('1. ...in order (the first and the last weapon where they were)', r.firstLast[0] === 'Blade 0' && r.firstLast[1] === 'Blade 139', r.firstLast);

  /* 2. a give into a bag over the lowered cap is refused at the door */
  const ps = r.ps;
  const w0 = ps.weaponStash.length;
  check('2. a weapon given into a bag of 140 under the lowered cap 8: refused, nothing added', stashGive(ps, 'weaponStash', weapon(999), 'loot_weapon', r.room) === false && ps.weaponStash.length === w0);
  const a0 = ps.armorStash.length;
  check('2. an armour piece given into a list of 48 under the lowered cap 32: refused', stashGive(ps, 'armorStash', piece('armor', 999), 'gear_mail', r.room) === false && ps.armorStash.length === a0);
}
/* a small bag under the lowered cap still takes a give */
{
  const r = await played({ disable_bigbags: true }, 3, 3);
  check('2. a bag of 3 under the lowered cap 8 still takes a weapon', stashGive(r.ps, 'weaponStash', weapon(7), 'loot_weapon', r.room) === true && r.ps.weaponStash.length === 4);
}

/* 3. the switch off: as today */
{
  const r = await played({}, 140, 48);
  check('3. the switch off: the caps are 140 and 48', r.room.WEAPON_STASH_CAP === WEAPON_STASH_CAP_NEW && gearStashCap() === GEAR_STASH_CAP);
  check('3. ...a join and a save keep 140 and 48', full(r.mem, 140, 48) && full(r.file, 140, 48), { mem: r.mem, file: r.file });
  check('3. ...and a give into the full bag is refused', stashGive(r.ps, 'weaponStash', weapon(999), 'loot_weapon', r.room) === false && r.ps.weaponStash.length === 140);
}

/* 4. the cuts still run, at the normal caps */
for (const flags of [{}, { disable_bigbags: true }]) {
  const r = await played(flags, 150, 55);
  const on = flags.disable_bigbags ? 'thrown' : 'off';
  check(`4. the switch ${on}: a stored bag over the normal caps is cut there (140 weapons, 48 of each list)`, full(r.mem, 140, 48) && full(r.file, 140, 48), { mem: r.mem, file: r.file });
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
