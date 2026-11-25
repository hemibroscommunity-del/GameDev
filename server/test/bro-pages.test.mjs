/* v2.3.6600 (card BRO, part 1): THE BRO TAB IN PAGES -- its rules (src/game/broPages.js).
 * The owner, 2026-11-25: "I want it so that it shows "pages" where all the information needs to be
 * displayed together (instead of scrolling little by little)".  What the rules DO:
 *
 *   1. a visit opens the Overview, the picker on the weapon in hand (anything else: the sword)
 *   2. THE ONE TRANSITION: a mark, Details, a tile, the picker, the progress row; an action naming
 *      no page or weapon of ours changes nothing and gives back the SAME state; a page or a weapon
 *      left out stays; a state that is junk starts over from the weapon it holds
 *   3. the shape from the box: wide from 600 px, dense under 150 px tall, 0 (unmeasured) roomy
 *   4. the pages drawn and the marks: one page and three marks upright, the Overview's mark the
 *      back chip under it; all three and no marks when wide
 *   5. every one of today's thirteen stats in exactly one group, in the mockups' order; a row no
 *      group names is `rest` (nothing lost), a key no row has is skipped
 *   6. the Overview's four numbers: DPS, Damage, Defense from the rows, then "worn/slots"
 *   7. the achievements bar's fill, held to 0..1
 *   8. the doors: today's eight in the mockup's order, two without achievements; what each opens,
 *      and every `opens` word the card acts on is one broOpen reads
 * MUTATION PASS (2026-11-25, by hand: every comparison, constant, filter and branch of broPages.js
 * changed one at a time, this suite run against each): every mutant killed but the ones listed in
 * the PR body with why.
 */
import {
  BRO_PAGES, BRO_PAGE_WEAPONS, BRO_WIDE_PX, BRO_DENSE_PX, broPagesStart, broPageTo, broPagesLayout,
  broShownPages, broMarks, BRO_STAT_GROUPS, broStatGroups, BRO_OVERVIEW_STATS, broOverviewNumbers,
  broAchvFill, BRO_DOORS, broDoors, BRO_TAPS, broTitleOpens, broOpen,
} from '../../src/game/broPages.js';
import { BRO_STAT_ROWS, BRO_WEAPONS } from '../../src/ui/mobile/sheet/broStats.js';
import { readFileSync } from 'node:fs';
/* the card's three-column line (BroCard.jsx is JSX: read as text) */
const BRO_COLS_3 = Number((/export const BRO_COLS_3 = (\d+);/.exec(readFileSync(new URL('../../src/ui/mobile/sheet/BroCard.jsx', import.meta.url), 'utf8')) || [])[1]);

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok   ' + name);
  else { failures++; console.log('  FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail))); }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log('1. where a visit starts');
check('1a the pages, in their marks\' order', eq(BRO_PAGES, ['overview', 'combat', 'progress']));
check('1b the weapons are broStats\' own, in its order', eq(BRO_PAGE_WEAPONS, BRO_WEAPONS.map((w) => w.cat)));
check('1c the Overview, on the bow in hand', eq(broPagesStart('bow'), { page: 'overview', weapon: 'bow' }));
check('1d the staff in hand', eq(broPagesStart('staff'), { page: 'overview', weapon: 'staff' }));
check('1e nothing or junk in hand: the sword', eq(broPagesStart(undefined), { page: 'overview', weapon: 'sword' }) && eq(broPagesStart('__proto__'), { page: 'overview', weapon: 'sword' }));

console.log('2. the one transition');
const o = broPagesStart('sword');
check('2a a mark: the page, the weapon kept', eq(broPageTo(o, { to: 'progress' }), { page: 'progress', weapon: 'sword' }));
check('2b Details / a tile: Combat on that weapon', eq(broPageTo(o, { to: 'combat', weapon: 'staff' }), { page: 'combat', weapon: 'staff' }));
const c = broPageTo(o, { to: 'combat', weapon: 'bow' });
check('2c the picker: the weapon, the page kept', eq(broPageTo(c, { weapon: 'staff' }), { page: 'combat', weapon: 'staff' }));
check('2d the back chip', eq(broPageTo(c, { to: 'overview' }), { page: 'overview', weapon: 'bow' }));
check('2e no action: the same state', broPageTo(c, null) === c && broPageTo(c, undefined) === c);
check('2f a page not ours: the same state', broPageTo(c, { to: 'map' }) === c && broPageTo(c, { to: 'constructor' }) === c);
check('2g a weapon not ours: the same state', broPageTo(c, { weapon: 'axe' }) === c && broPageTo(c, { to: 'progress', weapon: 'axe' }) === c);
check('2h nothing changes: the same state', broPageTo(c, { to: 'combat', weapon: 'bow' }) === c && broPageTo(c, {}) === c);
check('2i a new state is a new object, the old untouched', broPageTo(c, { to: 'progress' }) !== c && eq(c, { page: 'combat', weapon: 'bow' }));
check('2j junk state: starts over on its weapon', eq(broPageTo({ page: 'nope', weapon: 'staff' }, null), { page: 'overview', weapon: 'staff' })
  && eq(broPageTo(null, { to: 'combat' }), { page: 'combat', weapon: 'sword' }));
check('2k junk state, a junk weapon in it: the sword', eq(broPageTo({ page: 'x', weapon: 'y' }, null), { page: 'overview', weapon: 'sword' }));
check('2m an empty page or weapon is not ours: the same state', broPageTo(c, { to: '', weapon: 'staff' }) === c && broPageTo(c, { to: 'progress', weapon: '' }) === c);
check('2l a weapon-only action on the Overview stays there', eq(broPageTo(o, { weapon: 'bow' }), { page: 'overview', weapon: 'bow' }));

console.log('3. the shape from the box');
check('3a wide from 600 px, the card\'s own three-column line', BRO_WIDE_PX === 600 && BRO_WIDE_PX === BRO_COLS_3);
check('3b 599 upright, 600 wide', !broPagesLayout(599, 190).wide && broPagesLayout(600, 190).wide && broPagesLayout(844, 78).wide);
check('3c dense under 150 tall', BRO_DENSE_PX === 150 && broPagesLayout(844, 149).dense && !broPagesLayout(844, 150).dense && broPagesLayout(844, 78).dense);
check('3d unmeasured (0): upright and roomy', eq(broPagesLayout(0, 0), { wide: false, dense: false }));
check('3e the upright phone (390 x 184): one page, roomy', eq(broPagesLayout(390, 184), { wide: false, dense: false }));

console.log('4. the pages drawn and the marks');
check('4a upright: the open page alone', eq(broShownPages(c, false), ['combat']) && eq(broShownPages(o, false), ['overview']));
check('4b wide: all three in order', eq(broShownPages(c, true), ['overview', 'combat', 'progress']));
check('4c wide: no marks', eq(broMarks(c, true), []));
check('4d the Overview open: its mark lit, no back chip', eq(broMarks(o, false), [
  { page: 'overview', on: true, back: false }, { page: 'combat', on: false, back: false }, { page: 'progress', on: false, back: false }]));
check('4e under it: the Overview\'s mark the back chip', eq(broMarks(broPageTo(o, { to: 'progress' }), false), [
  { page: 'overview', on: false, back: true }, { page: 'combat', on: false, back: false }, { page: 'progress', on: true, back: false }]));
check('4f junk state: the Overview drawn', eq(broShownPages({ page: 'x' }, false), ['overview']) && broMarks({ page: 'x' }, false)[0].on);

console.log('5. which stat stands where');
const keys = BRO_STAT_ROWS.map((r) => r[0]);
const placed = BRO_STAT_GROUPS.flatMap((g) => g.keys);
check('5a the groups, the mockups\' three', eq(BRO_STAT_GROUPS.map((g) => g.id), ['offense', 'survive', 'move']));
check('5b every one of today\'s thirteen in exactly one', placed.length === keys.length && keys.every((k) => placed.filter((x) => x === k).length === 1), { keys, placed });
check('5c Offense, as mockup 03', eq(BRO_STAT_GROUPS[0].keys, ['damage', 'dps', 'aspd', 'range', 'crit', 'critDmg', 'special', 'elem']));
check('5d Survivability (with Armor) and Mobility, as mockup 04', eq(BRO_STAT_GROUPS[1].keys, ['def', 'armor', 'dodge', 'eres']) && eq(BRO_STAT_GROUPS[2].keys, ['move']));
const rows = BRO_STAT_ROWS.map(([key]) => ({ key, value: 'v-' + key })).reverse();
const sg = broStatGroups(rows);
check('5e today\'s rows into their groups, the group\'s order, not the rows\'', eq(sg.groups.map((g) => g.rows.map((r) => r.key)), BRO_STAT_GROUPS.map((g) => g.keys.slice())) && sg.rest.length === 0);
check('5f the row objects themselves', sg.groups[0].rows[0] === rows.find((r) => r.key === 'damage'));
const extra = broStatGroups([{ key: 'luck', value: 1 }, { key: 'dps', value: 2 }, null, { key: 7 }]);
check('5g a row no group names: rest (nothing lost); a key no row has: skipped', eq(extra.rest.map((r) => r.key), ['luck', 7])
  && eq(extra.groups.map((g) => g.rows.length), [1, 0, 0]) && extra.groups[0].rows[0].key === 'dps');
check('5h no rows: empty groups, no throw', eq(broStatGroups(undefined).groups.map((g) => g.rows.length), [0, 0, 0]) && broStatGroups(undefined).rest.length === 0);
check('5i a __proto__ key is a row like any other', broStatGroups([{ key: '__proto__', value: 1 }]).rest.length === 1);

console.log('6. the Overview\'s four numbers');
check('6a DPS, Damage, Defense', eq(BRO_OVERVIEW_STATS, ['dps', 'damage', 'def']));
const ovr = [{ key: 'damage', value: '2 – 3' }, { key: 'dps', value: '4.6' }, { key: 'def', value: '0%' }, { key: 'move', value: '+0%' }];
check('6b from the rows, then the gear', eq(broOverviewNumbers(ovr, 3, 6), [{ key: 'dps', value: '4.6' }, { key: 'damage', value: '2 – 3' }, { key: 'def', value: '0%' }, { key: 'gear', value: '3/6' }]));
check('6c a missing row: the dash', eq(broOverviewNumbers([], 0, 6).map((x) => x.value), ['—', '—', '—', '0/6']));
check('6d junk counts: whole, never negative', broOverviewNumbers(null, 2.7, '6')[3].value === '2/6' && broOverviewNumbers(null, -1, null)[3].value === '0/0');
check('6f a junk row: skipped, no throw', (() => { try { return broOverviewNumbers([null, { key: 'dps', value: '1.0' }], 0, 0)[0].value === '1.0'; } catch (e) { return false; } })());
check('6e a number value is a string', broOverviewNumbers([{ key: 'dps', value: 0 }], 0, 0)[0].value === '0');

console.log('7. the achievements bar');
check('7a earned over total', broAchvFill(1, 4) === 0.25 && broAchvFill(33, 33) === 1);
check('7b held to 0..1', broAchvFill(40, 33) === 1 && broAchvFill(-2, 33) === 0);
check('7c no total: none', broAchvFill(3, 0) === 0 && broAchvFill(3, undefined) === 0 && broAchvFill(undefined, 33) === 0);

console.log('8. the doors');
check('8a today\'s eight, the mockup\'s order first', eq(BRO_DOORS.map((d) => d.id), ['skills', 'titles', 'homestead', 'pet', 'clan', 'points', 'achievements', 'equipment']));
check('8b with achievements: all eight', eq(broDoors(true), BRO_DOORS.slice()));
check('8c without: Titles and Achievements gone (today\'s apOn)', eq(broDoors(false).map((d) => d.id), ['skills', 'homestead', 'pet', 'clan', 'points', 'equipment']));
const opens = Object.fromEntries(BRO_DOORS.map((d) => [d.id, d.opens]));
check('8d what each opens (today\'s own)', eq(opens, { skills: 'page:skills', titles: 'titles', homestead: 'farm', pet: 'page:pets', clan: 'page:clan',
  points: 'points', achievements: 'page:achievements', equipment: 'gear' }));
check('8e every opens word read', BRO_DOORS.every((d) => broOpen(d.opens)) && Object.values(BRO_TAPS).every((w) => broOpen(w)));
check('8f the reads', eq(broOpen('page:skills'), { kind: 'page', page: 'skills' }) && eq(broOpen('titles'), { kind: 'titles' })
  && eq(broOpen('points'), { kind: 'points' }) && eq(broOpen('gear'), { kind: 'gear' }) && eq(broOpen('farm'), { kind: 'farm' }));
check('8g a word not ours: none', broOpen('page:') === null && broOpen('shop') === null && broOpen(undefined) === null && broOpen('xpage:a') === null);
check('8h the counters and the chip', BRO_TAPS.counters === 'page:achievements' && BRO_TAPS.pointsChip === 'points');
check('8i the title line: the picker, or Achievements without them', broTitleOpens(true) === 'titles' && broTitleOpens(false) === 'page:achievements');

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
