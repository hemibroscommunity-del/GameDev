/* v2.3.3896: THE DEFENSE NUMBER IS THE REAL DAMAGE CUT
 * (src/ui/mobile/sheet/heroStatPills.js combinedDamageCut, the Defense
 * family's head).  The owner: "64% redux from armor, 42% reduced from def
 * points. It says '42%' as the aggregate defense ... How are these percentages
 * calculating things?"  The worker's _applyDamage MULTIPLIES the two cuts
 * (combat.js: Defense, held by the combined floor, then armour), so the head
 * is 1 - (1 - def)(1 - armour).
 *
 *   1. the owner's numbers: Defense .42 and armour .64 read "-79% damage"
 *   2. the floor the worker holds (PROG3.FLOOR, the same on both sides)
 *   3. nothing worn, nothing spent: 0; junk in: no throw, no NaN
 *   4. the family: its head, its rows and its plain line
 */
import { PROG3 as SERVER_PROG3 } from '../src/prog3.js';
import { PROG3 as CLIENT_PROG3 } from '../../src/data/prog3.js';
import { combinedDamageCut, heroStatFamilies } from '../../src/ui/mobile/sheet/heroStatPills.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('  ok  ' + name); return; }
  failures++; console.log('  FAIL ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : ''));
}

console.log('1. the owner\'s numbers');
const c = combinedDamageCut(0.42, 0.64, 0.08);
check('Defense .42 and armour .64: 0.58 x 0.36 = 0.2088 gets through, 79% less', Math.abs(c - (1 - 0.58 * 0.36)) < 1e-9 && Math.round(c * 100) === 79, c);
check('the order does not matter: the cuts multiply', Math.abs(combinedDamageCut(0.64, 0.42, 0) - c) < 1e-9);

console.log('2. the floor');
check('the client\'s FLOOR is the worker\'s', CLIENT_PROG3.FLOOR === SERVER_PROG3.FLOOR, [CLIENT_PROG3.FLOOR, SERVER_PROG3.FLOOR]);
const F = SERVER_PROG3.FLOOR;
check('Defense .95 is held at the floor, then armour cuts what is left', Math.abs(combinedDamageCut(0.95, 0.5, 0) - (1 - F * 0.5)) < 1e-9, combinedDamageCut(0.95, 0.5, 0));
check('...and Dodge raises the floor exactly as _applyDamage does: max(1 - def, FLOOR / (1 - dodge))',
  Math.abs(combinedDamageCut(0.88, 0, 0.5) - (1 - Math.max(0.12, F / 0.5))) < 1e-9, combinedDamageCut(0.88, 0, 0.5));

console.log('3. the edges');
check('nothing worn, no points: 0', combinedDamageCut(0, 0, 0) === 0);
const junk = combinedDamageCut(undefined, 'x', null);
check('junk in: a number, 0', junk === 0, junk);
check('armour alone is armour', Math.abs(combinedDamageCut(0, 0.64, 0) - 0.64) < 1e-9);

console.log('4. the family');
const fam = heroStatFamilies({}, { defPct: 0.42, armorDr: 0.64, dodge: 0.08 }).find((f) => f.key === 'defense');
check('the head reads the combined cut (a blob without prog3: armour alone)', fam && /damage$/.test(fam.head), fam && fam.head);
check('its rows: Defense points, Armour, Dodge, Resist', fam && fam.rows.map((r) => r.label).join() === 'Defense points,Armour,Dodge,Resist', fam && fam.rows.map((r) => r.label));
check('the plain line says how they stack', fam && /block .*% of a hit, then your armour blocks 64% of what/.test(fam.note), fam && fam.note);

if (failures) { console.log(`\n${failures} FAILED`); process.exit(1); }
console.log('\nall passed');
