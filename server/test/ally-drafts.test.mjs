/* ═══ v2.3.5524: WHAT THE SALOON'S LEADER TYPED OUTLIVES A REJOIN (card L) ═══
 * (src/game/allyDrafts.js; src/ui/panels/buildings/AlliancePart.jsx)
 *
 * A rejoin clears the party at state_sync until the worker re-sends it, so
 * the Saloon's alliance forms are made again (card J2's find).  This suite:
 *   1. a draft comes back to a form made again: the same field, the same
 *      party, over the same worker value;
 *   2. the worker's value shows instead when it changed (a rename went
 *      through), or the party is another; a send forgets the draft;
 *   3. `?allydrafts=0` keeps nothing (the forms come back empty, as before);
 *   4. the form reads and writes every field through the drafts, and drops
 *      them on its send.
 *
 * Break proof, tried by hand: AlliancePart's foe back to
 * `React.useState('')` -> FAIL 4.
 */
import { readFileSync } from 'node:fs';
import { draftGet, draftSet, draftDrop, draftCount } from '../../src/game/allyDrafts.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const setSearch = (s) => { globalThis.location = { search: s }; };
setSearch('');

/* 1 */
check('1. nothing typed: the worker\'s value', draftGet('name', 'p1', 'Iron') === 'Iron' && draftGet('foe', 'p1', '') === '');
draftSet('name', 'p1', '', 'Iron Br');
draftSet('foe', 'p1', '', 'GL');
check('1. a form made again shows what was typed', draftGet('name', 'p1', '') === 'Iron Br' && draftGet('foe', 'p1', '') === 'GL');

/* 2 */
check('2. the worker\'s value changed (a rename went through): it shows instead', draftGet('name', 'p1', 'Iron Bros') === 'Iron Bros');
check('2. another party: nothing of this one\'s', draftGet('foe', 'p2', '') === '');
draftDrop('foe', 'p1');
check('2. a send forgets the draft', draftGet('foe', 'p1', '') === '');
for (let i = 0; i < 20; i++) draftSet('foe', 'q' + i, '', 'X' + i);
check('2. what is kept is capped', draftCount() <= 8, draftCount());
check('2. ...the newest kept', draftGet('foe', 'q19', '') === 'X19');
check('2. a party id off the prototype is only a key', (draftSet('foe', '__proto__', '', 'A'), draftGet('foe', '__proto__', '') === 'A') && draftGet('foe', 'constructor', '') === '');

/* 3 */
setSearch('?allydrafts=0');
draftSet('tag', 'p1', '', 'IRN');
check('3. ?allydrafts=0: nothing kept, the worker\'s value shown', draftGet('tag', 'p1', '') === '' && draftGet('foe', 'q19', '') === '');
setSearch('');
check('3. ...and nothing typed while thrown comes back after', draftGet('tag', 'p1', '') === '');

/* 4 */
{
  const src = readFileSync(new URL('../../src/ui/panels/buildings/AlliancePart.jsx', import.meta.url), 'utf8');
  for (const f of ['name', 'tag', 'foe']) {
    check(`4. the form's ${f} starts from its draft and writes it`,
      new RegExp(`React\\.useState\\(function \\(\\) \\{ return draftGet\\('${f}', pid,`).test(src) && new RegExp(`draftSet\\('${f}', pid,`).test(src));
    check(`4. ...and drops it on its send`, new RegExp(`draftDrop\\('${f}', pid\\)`).test(src));
  }
  check('4. no form field starts empty on its own', !/React\.useState\(''\)/.test(src));
  check('4. both forms are given the party\'s id', (src.match(/pid=\{party\.id\}/g) || []).length === 2);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
