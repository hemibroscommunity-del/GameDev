/* ═══ v2.3.5282: A WEAPON'S OWN ID (grand plan step 4.3, card R PR 3; SHAPES part 2) ═══
 * (the code: server/src/stash.js weaponIdGive / weaponIdsAll, gearprov.js
 *  gearMintId, migrations.js v22 'weapon-gid', gear.js _sanitizeWeapon and
 *  _isGearNotWeapon, join.js's load; the spec: docs/specs/stash-door.md)
 *
 *   1. THE MINTER: the one gear has (gearprov.js gearMintId), its ids
 *      well-formed and never two the same; `_gearProvMintId` is it;
 *   2. THE DOOR: a weapon given into the bag, or set in its place, without a
 *      well-formed id is given one; one with its own keeps it;
 *   3. HANDS AND BAG TOGETHER (weaponIdsAll): a weapon without one gets one;
 *      the second of two that share one gets a new one, the first keeps it;
 *      a second run gives nothing;
 *   4. THE SAVE'S MIGRATION (v22): a v21 record's weapons get ids, it is
 *      stamped 22, and a re-run changes nothing; the schema is 22;
 *   5. THE SANITIZER: a phone's claim never names an id (strict); a
 *      well-formed one is kept, a malformed one dropped; a weapon with its
 *      id is still a weapon, a piece of gear (`prov`) still gear;
 *   6. THE JOIN: a stored record from before ids loads with every weapon
 *      its own; a new character's claim with a forged id gets the worker's;
 *   7. KEPT ON THE ROAD: a weapon by the mail, back from the market, keeps
 *      its id; the world's sum counts a weapon by its id in the bag, a
 *      listing, a sell order, a trade window and the mail.
 *
 * BREAK PROOF (rule 8), tried by hand, 2026-11-15:
 *   - `if (field === 'weaponStash') weaponIdGive(piece);` deleted from stashGive -> FAIL 2
 *   - `|| seen.has(w.gid)` deleted from weaponIdsAll                 -> FAIL 3 (two share one)
 *   - `('gid' in w && !weaponIdOk(w))` made `'gid' in w`              -> FAIL 5, FAIL 6 (every weapon dropped as gear)
 */
import { gearMintId, GID_RE } from '../src/gearprov.js';
import { stashGive, stashSet, weaponIdOk, weaponIdGive, weaponIdsAll, WEAPON_HANDS } from '../src/stash.js';
import { RPG_SCHEMA_VERSION, MIGRATIONS, runRpgMigrations } from '../src/migrations.js';
import { READERS, worldCtx } from '../src/worldsum.js';
import { makeStorage, openRoom, join, fakeWs, settle } from './testroom.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 700) : ''); }
}
const ROOM = { WEAPON_STASH_CAP: 8 };
const blade = (n, extra) => ({ type: 'sword', tierMult: 1, name: 'Blade ' + n, ...(extra || {}) });

/* ══════════ 1. THE MINTER ══════════ */
{
  const l = {};
  const ids = Array.from({ length: 2000 }, () => gearMintId(l));
  check('1. the minter\'s ids are well-formed and never two the same (2000)', ids.every((g) => GID_RE.test(g)) && new Set(ids).size === ids.length);
  const st = makeStorage();
  const room = await openRoom(st);
  const g = room._gearProvMintId({ seq: 4 });
  check('1. ...and `_gearProvMintId` (gear\'s) is the same minter', GID_RE.test(g) && /\.5\./.test(g), g);
}

/* ══════════ 2. THE DOOR ══════════ */
{
  const ps = {};
  const fresh = blade(1);
  stashGive(ps, 'weaponStash', fresh, 'loot_weapon', ROOM);
  check('2. a weapon given into the bag without an id is given one', weaponIdOk(ps.weaponStash[0]) && ps.weaponStash[0] === fresh);
  const own = blade(2, { gid: gearMintId({}) });
  const was = own.gid;
  stashGive(ps, 'weaponStash', own, 'mail_weapon', ROOM);
  check('2. ...one with its own keeps it', ps.weaponStash[1].gid === was);
  const junk = blade(3, { gid: 'not-an-id' });
  stashGive(ps, 'weaponStash', junk, 'reveal_dev', ROOM);
  check('2. ...one with a malformed id is given a well-formed one', weaponIdOk(ps.weaponStash[2]) && ps.weaponStash[2].gid !== 'not-an-id');
  stashSet(ps, 'weaponStash', blade(4), 'equip_swap', 0);
  check('2. a weapon set in a place is given one', weaponIdOk(ps.weaponStash[0]) && ps.weaponStash[0].name === 'Blade 4');
  stashSet(ps, 'weaponStash', [blade(5), blade(6, { gid: was })], 'join_stored');
  check('2. a whole bag set: each without one given one, each with its own kept', weaponIdOk(ps.weaponStash[0]) && ps.weaponStash[1].gid === was);
  const armor = { name: 'Plate' };
  stashGive(ps, 'armorStash', armor, 'gear_quest', ROOM);
  check('2. a gear list is not the weapon bag: no id given there', !('gid' in armor));
}

/* ══════════ 3. HANDS AND BAG TOGETHER ══════════ */
{
  const shared = gearMintId({});
  const rec = { weapon: blade('h', { gid: shared }), rangedWeapon: { type: 'bow', tierMult: 1 }, staffWeapon: null,
    weaponStash: [blade('a', { gid: shared }), blade('b'), blade('c', { gid: 'junk' }), blade('d', { gid: shared })] };
  const n = weaponIdsAll(rec);
  const all = [...WEAPON_HANDS.map((h) => rec[h]).filter(Boolean), ...rec.weaponStash];
  check('3. hands and bag: every weapon its own id, none shared', all.every(weaponIdOk) && new Set(all.map((w) => w.gid)).size === all.length, all.map((w) => w.gid));
  check('3. ...the first of two that shared one keeps it (the hand\'s); the others are given new', rec.weapon.gid === shared && rec.weaponStash[0].gid !== shared && rec.weaponStash[3].gid !== shared && n === 5, { n });
  const before = JSON.stringify(rec);
  check('3. ...a second run gives nothing', weaponIdsAll(rec) === 0 && JSON.stringify(rec) === before);
}

/* ══════════ 4. THE SAVE'S MIGRATION ══════════ */
{
  check('4. the schema is 22, its last migration weapon-gid', RPG_SCHEMA_VERSION === 22 && MIGRATIONS[MIGRATIONS.length - 1].v === 22 && MIGRATIONS[MIGRATIONS.length - 1].name === 'weapon-gid');
  const old = { _v: 21, coins: 5, weapon: blade('w'), staffWeapon: { type: 'staff', tierMult: 2 }, weaponStash: [blade(1), blade(2)], _econ: { v: 1, g: { m: 0, b: 0 }, i: {} } };
  const r = runRpgMigrations(old);
  check('4. a v21 record\'s weapons, in hand and bag, each get an id; stamped 22', r.changed && !r.failed && old._v === 22 && [old.weapon, old.staffWeapon, ...old.weaponStash].every(weaponIdOk), old);
  const ids = JSON.stringify([old.weapon.gid, old.weaponStash.map((w) => w.gid)]);
  const r2 = runRpgMigrations(old);
  check('4. ...and never again: a re-run changes nothing', !r2.changed && JSON.stringify([old.weapon.gid, old.weaponStash.map((w) => w.gid)]) === ids);
  const none = { _v: 21, coins: 1 };
  check('4. a record with no weapons migrates, nothing given', !runRpgMigrations(none).failed && none._v === 22);
}

/* ══════════ 5. THE SANITIZER ══════════ */
const st5 = makeStorage();
const room5 = await openRoom(st5);
{
  const good = blade('g', { gid: gearMintId({}) });
  const strictCopy = room5._sanitizeWeapon(good, true);
  const ownCopy = room5._sanitizeWeapon(good);
  const junkCopy = room5._sanitizeWeapon(blade('x', { gid: 'g.1' }));
  check('5. a phone\'s claim never names an id (strict), the weapon kept', !!strictCopy && !('gid' in strictCopy), strictCopy);
  check('5. ...the worker\'s own copy keeps a well-formed one', !!ownCopy && ownCopy.gid === good.gid, ownCopy);
  check('5. ...a malformed one is not a weapon\'s id (dropped as gear, as before)', junkCopy === null || !('gid' in junkCopy), junkCopy);
  check('5. a weapon with its own id is still a weapon', room5._isGearNotWeapon(good) === false);
  check('5. ...a piece of gear the worker minted (`prov`) is still gear', room5._isGearNotWeapon({ name: 'Plate', slot: 'armor', gid: gearMintId({}), prov: 'minted' }) === true && room5._isGearNotWeapon({ name: 'Old', prov: 'legacy' }) === true);
}

/* ══════════ 6. THE JOIN ══════════ */
{
  const st = makeStorage([['rpg:bp_wid_a', { _v: 21, coins: 0, level: 3, hp: 50, maxHp: 50, inventory: {}, weapon: blade('hand'),
    weaponStash: [blade(1), blade(2), blade(3)], _econ: { v: 1, g: { m: 0, b: 0 }, i: {} } }]]);
  const room = await openRoom(st);
  await join(room, fakeWs('a'), 'bp_wid_a', { loginTaken: true });
  const ps = room.playerState.bp_wid_a;
  const all = [ps.weapon, ...ps.weaponStash].filter(Boolean);
  check('6. a stored record from before ids loads with every weapon its own, none shared', all.length === 4 && all.every(weaponIdOk) && new Set(all.map((w) => w.gid)).size === 4, all.map((w) => w && w.gid));
  /* a new character's claim: the join takes it only on its bootstrap path
     (a join with no record reads no claim), so its two steps are run here as
     join.js runs them: the strict sanitizer, then the bag's give and the
     hands-and-bag pass */
  const forged = 'g' + 'zzzz' + '.1.aaaa';
  const claimed = { weapon: room._sanitizeWeapon(blade('cw', { gid: forged }), true) };
  stashSet(claimed, 'weaponStash', room._sanitizeWeaponList([blade('c', { gid: forged }), blade('d', { gid: forged })], true), 'join_new');
  weaponIdsAll(claimed);
  const mine = [claimed.weapon, ...claimed.weaponStash];
  check('6. a new character\'s claim with a forged id gets the worker\'s own, never the phone\'s, none shared', mine.length === 3 && mine.every((w) => weaponIdOk(w) && w.gid !== forged) && new Set(mine.map((w) => w.gid)).size === 3, mine.map((w) => w.gid));
}

/* ══════════ 7. KEPT ON THE ROAD, AND COUNTED ══════════ */
{
  const ps = { weaponStash: [] };
  const w = blade('m', { gid: gearMintId({}) });
  const id = w.gid;
  const landed = room5._applyCreditToPs(ps, { kind: 'weapon', payload: { weapon: { ...w } } }, 'bp_wid_m');
  check('7. a weapon by the mail keeps its own id', landed === true && ps.weaponStash.length === 1 && ps.weaponStash[0].gid === id, ps.weaponStash);
  room5.playerState.bp_wid_k = { weaponStash: [] };
  await room5._mktUnwind({ type: 'sell', playerId: 'bp_wid_k', item: { ...w, gid: id }, price: 10, id: 'o1' });
  check('7. ...back from the market, too', room5.playerState.bp_wid_k.weaponStash.some((x) => x.gid === id), room5.playerState.bp_wid_k.weaponStash);
  /* the world's sum: a weapon by its id wherever it waits */
  const ctx = worldCtx();
  const g = () => gearMintId({});
  const where = [['rpg:bp_x', { weaponStash: [blade(1, { gid: g() })] }], ['store_listing:L1', { kind: 'weapon', weapon: blade(2, { gid: g() }) }],
    ['mkt_order:o1', { type: 'sell', item: blade(3, { gid: g() }), price: 1 }], ['trade2wpn:bp_x:1', { weapon: blade(4, { gid: g() }) }],
    ['inbox:bp_x', [{ kind: 'weapon', payload: { weapon: blade(5, { gid: g() }) } }]]];
  for (const [k, v] of where) { const p = Object.keys(READERS).find((x) => k.startsWith(x)); READERS[p](ctx, k, v); }
  check('7. the world\'s sum counts a weapon by its id in the bag, a listing, a sell order, a trade window and the mail', ctx.ids.filter((x) => x[0] === 'gear').length === 5, ctx.ids);
}

await settle();
console.log('\n' + passes + ' passed, ' + failures + ' failed');
if (failures) { console.log('weapon-id: FAILED'); process.exit(1); }
console.log('all weapon-id checks passed');
