/* ═══ v2.3.5294: THE WEAPON READER, BEFORE THE WEAPON'S OWN ID (card R PR 14) ═══
 * (the code: server/src/gear.js _isGearNotWeapon, _sanitizeWeapon;
 *  gearprov.js GID_RE; the why: docs/specs/stash-door.md, "A weapon's own
 *  id", the reader first)
 *
 * Card R PR 3 (tag 5282, #1873) gives every weapon its own `gid`.  The
 * gatekeeper's sitting 23 held it: a worker rolled back past it read a gid
 * as gear (`'gid' in w`), so `_sanitizeWeapon` gave null and every road that
 * reads a weapon through it lost the weapon -- the mail consumed it
 * (inbox.js `if (!w) return true`), a market sell order's or an auction
 * listing's weapon, a trade window's, and with `newersave: false` the join's
 * load emptied hand and bag.  This worker ships first and reads such a
 * weapon whole, so a roll-back to it loses nothing.
 *
 *   1. THE RULE: a weapon with a well-formed gid is a weapon; a piece of gear
 *      (`prov`, the minted mark) is gear; a gid the minter did not write
 *      (malformed) is not a weapon's, as before.
 *   2. THE SANITIZER: the worker's own copy keeps a well-formed gid; a
 *      phone's claim (strict) never names one, its weapon kept.
 *   3. THE MAIL: a weapon carrying an id lands in the bag with it (it was
 *      consumed: the credit answered true and gave nothing).
 *   4. THE MARKET: a sell order's weapon carrying an id comes back with it.
 *   5. THE JOIN: a record whose weapons carry ids loads every one of them,
 *      in hand and bag, ids kept -- a v21 record, and a NEWER (v22) record
 *      let through by `newersave: false`.  (v2.3.5282: and one without an
 *      id is given its own there.)
 *   6. GEAR STAYS GEAR: an armour piece in the weapon bag is still dropped.
 *
 * BREAK PROOFS (rule 8), tried by hand: `_isGearNotWeapon` put back to
 * `'gid' in w || 'prov' in w` -> FAIL 1, 2, 3, 5 (every weapon with an id
 * lost); the sanitizer's `delete out.gid` made unconditional -> FAIL 2, 3,
 * 5 (the ids lost).  (4 holds either way: the market's unwind gives the
 * weapon back without the sanitizer; its loss was the mail's, 3.)
 */
import { GID_RE } from '../src/gearprov.js';
import { makeStorage, openRoom, join, fakeWs, settle } from './testroom.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 700) : ''); }
}
/* ids as the newer worker mints them (gearprov.js _gearProvMintId's form) */
let n = 0;
const gid = () => 'gmk' + (++n).toString(36) + 'x.' + n.toString(36) + '.a1b2';
const blade = (name, extra) => ({ type: 'sword', tierMult: 1, name, ...(extra || {}) });

const st0 = makeStorage();
const room = await openRoom(st0);

/* ══════════ 1. THE RULE ══════════ */
{
  const id = gid();
  check('1. the ids under test are as the minter writes them', GID_RE.test(id) && GID_RE.test(room._gearProvMintId({ seq: 3 })), id);
  check('1. a weapon carrying a well-formed gid is a weapon', room._isGearNotWeapon(blade('A', { gid: id })) === false);
  check('1. ...a weapon with none is a weapon, as before', room._isGearNotWeapon(blade('B')) === false);
  check('1. a piece of gear the worker minted (`prov`, beside its gid) is gear', room._isGearNotWeapon({ name: 'Plate', slot: 'armor', gid: gid(), prov: 'minted' }) === true
    && room._isGearNotWeapon({ name: 'Old', prov: 'legacy' }) === true);
  check('1. a gid the minter did not write is not a weapon\'s (gear, as before)', room._isGearNotWeapon(blade('C', { gid: 'g.1' })) === true
    && room._isGearNotWeapon(blade('D', { gid: 42 })) === true && room._isGearNotWeapon(blade('E', { gid: id + ' ' })) === true);
}

/* ══════════ 2. THE SANITIZER ══════════ */
{
  const w = blade('S', { gid: gid(), quality: 'fine' });
  const own = room._sanitizeWeapon(w);
  const claim = room._sanitizeWeapon(w, true);
  check('2. the worker\'s own copy keeps a well-formed gid', !!own && own.gid === w.gid && own.name === 'S', own);
  check('2. a phone\'s claim (strict) never names one; its weapon is kept', !!claim && !('gid' in claim) && claim.name === 'S', claim);
  const list = room._sanitizeWeaponList([blade('L1', { gid: gid() }), blade('L2'), { name: 'Plate', gid: gid(), prov: 'minted' }]);
  check('2. a bag read through the list: both weapons kept (one with its id), the gear dropped', list.length === 2 && GID_RE.test(list[0].gid) && !('gid' in list[1]), list);
}

/* ══════════ 3. THE MAIL ══════════ */
{
  const ps = { weaponStash: [] };
  const w = blade('M', { gid: gid() });
  const done = room._applyCreditToPs(ps, { kind: 'weapon', payload: { weapon: { ...w } } }, 'bp_wr_m');
  check('3. a weapon by the mail, carrying an id, lands in the bag with it (it was consumed, nothing given)',
    done === true && ps.weaponStash.length === 1 && ps.weaponStash[0].gid === w.gid && ps.weaponStash[0].name === 'M', ps.weaponStash);
}

/* ══════════ 4. THE MARKET ══════════ */
{
  room.playerState.bp_wr_k = { weaponStash: [] };
  const w = blade('K', { gid: gid() });
  await room._mktUnwind({ type: 'sell', playerId: 'bp_wr_k', item: { ...w }, price: 10, id: 'wr-o1' });
  await settle();
  const back = room.playerState.bp_wr_k.weaponStash;
  check('4. a sell order\'s weapon, carrying an id, comes back with it', back.length === 1 && back[0].gid === w.gid, back);
}

/* ══════════ 5. THE JOIN ══════════ */
for (const [v, flags] of [[21, null], [22, { newersave: false }]]) {
  const pid = 'bp_wr_j' + v;
  const hand = blade('hand', { gid: gid() });
  const bag = [blade('b1', { gid: gid() }), blade('b2', { gid: gid() }), blade('b3')];
  const st = makeStorage([['rpg:' + pid, { _v: v, coins: 0, level: 3, hp: 50, maxHp: 50, inventory: {}, weapon: { ...hand },
    weaponStash: bag.map((w) => ({ ...w })), _econ: { v: 1, g: { m: 0, b: 0 }, i: {} } }]]);
  const r = await openRoom(st, flags);
  await join(r, fakeWs('j' + v), pid, { loginTaken: true });
  const ps = r.playerState[pid];
  const got = ps ? [ps.weapon, ...(ps.weaponStash || [])].filter(Boolean) : [];
  check(`5. a v${v} record${flags ? ' (let through by `newersave: false`)' : ''} loads every weapon, in hand and bag, ids kept`,
    /* v2.3.5282 (card R PR 3): the join gives the weapon that had none its
       own (stash.js weaponIdsAll); the three that had one keep theirs */
    got.length === 4 && got[0].gid === hand.gid && got[1].gid === bag[0].gid && got[2].gid === bag[1].gid && GID_RE.test(got[3].gid), got.map((w) => [w.name, w.gid]));
}

/* ══════════ 6. GEAR STAYS GEAR ══════════ */
{
  const ps = { weaponStash: [] };
  const done = room._applyCreditToPs(ps, { kind: 'weapon', payload: { weapon: { name: 'Plate', slot: 'armor', gid: gid(), prov: 'minted' } } }, 'bp_wr_g');
  check('6. an armour piece by the weapon post is still not a weapon (dropped, as before)', done === true && ps.weaponStash.length === 0, ps.weaponStash);
}

await settle();
console.log('\n' + passes + ' passed, ' + failures + ' failed');
if (failures) { console.log('weapon-reader: FAILED'); process.exit(1); }
console.log('all weapon-reader checks passed');
