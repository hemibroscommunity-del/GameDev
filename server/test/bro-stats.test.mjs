/* v2.3.4162: THE BRO PAGE'S COMBAT STATS, ONE WEAPON AT A TIME
 * (src/ui/mobile/sheet/broStats.js, the middle panel of the owner's drawing:
 * Sword | Bow | Staff over "Combat Stats"), and the Titles row's ask
 * (src/game/achievements.js askTitlePicker / takeTitlePicker).
 *
 *   1. thirteen rows in the drawing's order, each with a picture and an explainer
 *   2. the weapon out reads what the Equipment window's pills read (one reader)
 *   3. another weapon reads ITS lane: crit points on the bow move the Bow
 *      column only; the shared stats are the same under every weapon
 *   4. an empty slot says so: no sword's numbers under "Bow"
 *   5. the selector starts on the weapon out
 *   6. junk in: thirteen dashes, no throw
 *   7. the Titles row's ask: one-shot, the worn title, else the newest earned
 */
import { setProg3Enabled, setProg3XEnabled, setProg3SharedEnabled, setProg3RelEnabled } from '../../src/data/prog3.js';
import { BRO_STAT_ROWS, BRO_WEAPONS, broWeaponStats, broStartWeapon } from '../../src/ui/mobile/sheet/broStats.js';
import { heroStatPills } from '../../src/ui/mobile/sheet/heroStatPills.js';
import { deriveHeroStats } from '../../src/ui/mobile/sheet/heroModel.js';
import { askTitlePicker, takeTitlePicker } from '../../src/game/achievements.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('  ok  ' + name); return; }
  failures++; console.log('  FAIL ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : ''));
}

/* the live worker's readers (its caps: prog3, prog3x, the shared stats, the curve) */
setProg3Enabled(true); setProg3XEnabled(true); setProg3SharedEnabled(true); setProg3RelEnabled(true);
const sk = { sword: { level: 8, xp: 0 }, bow: { level: 5, xp: 0 }, staff: { level: 1, xp: 0 } };
const base = () => ({
  activeSlot: 'melee', maxHp: 300, maxStamina: 110, maxMana: 100,
  weapon: { type: 'sword', gearBase: 'copper', tierMult: 1 },
  rangedWeapon: { type: 'bow', gearBase: 'wood', tierMult: 1, element1: 'flame' },
  prog3: { sk, pool: 0, shared: 0, atk: { sword: {}, bow: {}, staff: {} }, alloc: {} },
});
const val = (r, k) => (r.rows.find((x) => x.key === k) || {}).value;

console.log('1. the rows');
const s1 = broWeaponStats(base(), 'sword');
check('thirteen rows, the drawing\'s order', s1.rows.map((r) => r.label).join('|')
  === 'DAMAGE|DPS|ATTACK SPEED|RANGE|CRIT CHANCE|CRIT DAMAGE|SPECIAL DAMAGE|ELEMENT POWER|DEFENSE|ARMOR|DODGE|RESIST|MOVE SPEED', s1.rows.map((r) => r.label));
check('each has a picture and an explainer key', s1.rows.every((r) => r.icon && r.info), s1.rows.filter((r) => !r.icon || !r.info));
check('three weapons: Sword, Bow, Staff', BRO_WEAPONS.map((w) => w.label).join(',') === 'Sword,Bow,Staff');
check('BRO_STAT_ROWS is the list', BRO_STAT_ROWS.length === 13);

console.log('2. one reader');
{
  const R = base();
  const pills = heroStatPills(R, deriveHeroStats(R));
  const by = {};
  for (const p of [pills.dps].concat(pills.offense, pills.player)) by[p.key] = p.value;
  check('crit, crit damage, special, defense, armor, dodge, resist, move: the Equipment window\'s pills',
    ['crit', 'critDmg', 'special', 'def', 'armor', 'dodge', 'eres', 'move'].every((k) => val(s1, k) === by[k]),
    ['crit', 'critDmg', 'special', 'def', 'armor', 'dodge', 'eres', 'move'].map((k) => [k, val(s1, k), by[k]]));
  check('damage is a range, DPS a number, speed "/s", range in tiles',
    /^\d+( – \d+)?$/.test(val(s1, 'damage')) && /^\d+\.\d$/.test(val(s1, 'dps')) && /^\d+\.\d\d \/s$/.test(val(s1, 'aspd')) && /^\d+\.\d$/.test(val(s1, 'range')),
    [val(s1, 'damage'), val(s1, 'dps'), val(s1, 'aspd'), val(s1, 'range')]);
}

console.log('3. a lane\'s own points');
{
  const R = base();
  R.prog3.atk.bow.luck = 40;
  const sw = broWeaponStats(R, 'sword'), bw = broWeaponStats(R, 'bow');
  const plain = broWeaponStats(base(), 'bow');
  check('Luck on the bow raises the Bow column\'s crit', parseFloat(val(bw, 'crit')) > parseFloat(val(plain, 'crit')), [val(bw, 'crit'), val(plain, 'crit')]);
  check('...and not the Sword column\'s', val(sw, 'crit') === val(broWeaponStats(base(), 'sword'), 'crit'), [val(sw, 'crit')]);
  check('the shared stats are the same under every weapon', ['def', 'armor', 'dodge', 'eres', 'move'].every((k) => val(sw, k) === val(bw, k)));
  check('the bow\'s element before its power', /^Flame \+/.test(val(bw, 'elem')), val(bw, 'elem'));
  check('the sword has none: the power alone', /^\+/.test(val(sw, 'elem')), val(sw, 'elem'));
  check('the bow reaches farther than the sword', parseFloat(val(bw, 'range')) > parseFloat(val(sw, 'range')), [val(bw, 'range'), val(sw, 'range')]);
  check('the bow\'s numbers are its own, not the sword\'s', val(bw, 'aspd') !== val(sw, 'aspd'), [val(bw, 'aspd'), val(sw, 'aspd')]);
  check('the rpg is not changed (activeSlot)', R.activeSlot === 'melee');
}

console.log('4. an empty slot');
{
  const st = broWeaponStats(base(), 'staff');
  check('no staff: has false, and Damage, DPS, Attack Speed, Range are dashes', st.has === false && ['damage', 'dps', 'aspd', 'range'].every((k) => val(st, k) === '—'), st.rows.slice(0, 4));
  check('...the rest still read', val(st, 'crit') !== '—' && val(st, 'move') !== '—');
}

console.log('5. the start');
check('on the weapon out', broStartWeapon(Object.assign(base(), { activeSlot: 'ranged' })) === 'bow' && broStartWeapon(base()) === 'sword' && broStartWeapon(null) === 'sword');

console.log('6. junk');
{
  let st = null, threw = false;
  try { st = broWeaponStats(null, 'nope'); } catch (e) { threw = true; }
  check('no throw, sword, thirteen rows, nothing NaN', !threw && st.cat === 'sword' && st.rows.length === 13 && st.rows.every((r) => !/NaN|undefined/.test(r.value)), st && st.rows);
}

console.log('7. the Titles row\'s ask');
{
  const S = { _achv: { got: { first_blood: 100, first_order: 300 }, t: 'first_blood' } };
  check('nothing asked: null', takeTitlePicker(S) === null);
  askTitlePicker();
  check('asked: the title you wear', takeTitlePicker(S) === 'first_blood');
  check('one-shot', takeTitlePicker(S) === null);
  askTitlePicker();
  const S3 = { _achv: { got: { first_blood: 300, first_order: 100 }, t: null } };
  check('no title worn: the newest you earned', takeTitlePicker(S3) === 'first_blood');
  askTitlePicker();
  check('nothing earned: null', takeTitlePicker({ _achv: { got: {} } }) === null);
}

if (failures) { console.log(`\n${failures} FAILED`); process.exit(1); }
console.log('\nall ok');
