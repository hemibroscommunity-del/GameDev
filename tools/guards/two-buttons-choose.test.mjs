/* ═══ v2.3.6544: THE TEST PANEL'S ROW FOR THE TWO BUTTONS, PLAYED (card CT PR 5) ═══
 *
 * The row "Controls: two sticks / two buttons" (src/ui/panels/DevPanel.jsx)
 * calls manualCombat.js twoButtonsChoose with the page's search (switches.js
 * pageAddress, v2.3.6544) and loads the `?...` it returns.
 * This plays that rule in node: what it remembers, what address it makes,
 * and what manualMode then reads.  It lives here, not in server/test/, because
 * it tests the page's code: a new file in server/test/ deploys the worker
 * (TRAPS §277).  The row on a phone (the panel, the tap, the reload, the
 * words in each mode) is mp-twobuttons part 4.
 *
 *   1. on: the device remembers '5'; the `?...` made has manual 5, every
 *      other part kept, no second `manual`, and starts with `?` (a load
 *      that keeps the page's path); manualMode reads 5 from the address and
 *      from the store alone;
 *   2. off: the key forgotten (from 5, and from a device that had chosen 3);
 *      the address's manual is 4; manualMode reads 4 from both;
 *   3. a store that throws (a private window): the address is still made;
 *      no store at all: the same;
 *   4. the words: every two-buttons row the tour and the coach read is in its
 *      table and is not the row it stands in for.
 *
 * BREAK PROOF (rule 8), tried by hand on scratch edits, 2026-11-24:
 *   - twoButtonsChoose: `on ? '5' : '4'` -> `on ? '4' : '5'`          -> FAIL 1, 2
 *   - twoButtonsChoose: setItem(MANUAL.KEY, '5') -> setItem(MANUAL.KEY, '4') -> FAIL 1
 *   - twoButtonsChoose: removeItem dropped (`else {}`)                 -> FAIL 2
 *   - twoButtonsChoose: the try round the store removed                -> FAIL 3
 *   - twoButtonsChoose: searchParams.append for .set                   -> FAIL 1
 *   v2.3.6544 (handed the search, returns `?...`), on scratch edits, 2026-11-24:
 *   - `'?' + q` -> `'' + q` (a load of a bare string: a path)  -> FAIL 1b, 1c, 1e, 2b, 3a, 3b
 * SURVIVORS, and why: `if (ls)` -> `if (true)` (a null store's write throws
 * inside the same try: the same address, nothing written, so no test can
 * tell); the line that finds localStorage when no store is handed in (node
 * has none: the phone plays it, mp-twobuttons 4b's key '5' and 4c's null).
 *
 * Run from the repository's root: node tools/guards/two-buttons-choose.test.mjs
 */
import { twoButtonsChoose, manualMode, MANUAL } from '../../src/game/manualCombat.js';
import { SAY as TOUR } from '../../src/data/say/controlsTutorial.js';
import { SAY as COACH } from '../../src/data/say/questCoach.js';

let failed = 0;
const check = (name, ok, detail) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail)));
  if (!ok) failed++;
};
const store = (init) => {
  const m = new Map(Object.entries(init || {}));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, m };
};
const HREF = '?qa=1&manual=4&wheelwhole';   /* v2.3.6544: the page's search, as pageAddress gives it */
const at = (q) => new URL(q, 'https://brotown.example/play/');   /* where the browser loads the `?...` (the path kept) */

/* 1 */
{
  const s = store();
  const out = twoButtonsChoose(true, HREF, s);
  const u = at(out);
  check('1a on: the device remembers 5', s.m.get(MANUAL.KEY) === '5', [...s.m]);
  check('1b on: the address\'s manual is 5, one of it, the rest kept', u.searchParams.getAll('manual').join() === '5' && u.searchParams.get('qa') === '1'
    && u.searchParams.has('wheelwhole') && u.pathname === '/play/' && out.charAt(0) === '?', out);
  check('1c on: manualMode reads 5 from the address made', manualMode(u.search, store()) === 5);
  check('1d on: manualMode reads 5 from the store alone (the installed app, no address)', manualMode('', s) === 5);
  const bareQ = twoButtonsChoose(true, '', store());
  const bare = at(bareQ);
  check('1e on: an address with no search gains ?manual=5, nothing else', bareQ === '?manual=5' && bare.pathname === '/play/', bareQ);
}
/* 2 */
for (const had of ['5', '3']) {
  const s = store({ [MANUAL.KEY]: had, other: 'kept' });
  const u = at(twoButtonsChoose(false, HREF.replace('manual=4', 'manual=' + had), s));
  check(`2a off (the device had ${had}): the key forgotten, nothing else`, !s.m.has(MANUAL.KEY) && s.m.get('other') === 'kept', [...s.m]);
  check(`2b off (the device had ${had}): the address's manual is 4`, u.searchParams.getAll('manual').join() === '4', u.toString());
  check(`2c off (the device had ${had}): manualMode reads 4 from the address and from the store`, manualMode(u.search, store()) === 4 && manualMode('', s) === 4);
}
/* 3 */
{
  const bad = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); }, removeItem: () => { throw new Error('no'); } };
  let on = null, off = null;
  try { on = twoButtonsChoose(true, HREF, bad); off = twoButtonsChoose(false, HREF, bad); } catch (e) { on = 'threw: ' + e.message; }
  check('3a a store that throws: the address is still made', typeof on === 'string' && at(on).searchParams.get('manual') === '5' && at(off).searchParams.get('manual') === '4', { on, off });
  let none = null;
  try { none = twoButtonsChoose(true, HREF, null); } catch (e) { none = 'threw: ' + e.message; }
  check('3b no store: the address is still made', at(none).searchParams.get('manual') === '5', none);
}
/* 4 */
{
  const pairs = [['controlsTutorial.moveBodyTwo', 'controlsTutorial.moveBody'], ['controlsTutorial.attackBodyTwo', 'controlsTutorial.attackBody'],
    ['controlsTutorial.targetLabelTwo', 'controlsTutorial.targetLabel'], ['controlsTutorial.targetBodyTwo', 'controlsTutorial.targetBodyNoLock'],
    ['controlsTutorial.shieldBodyTwo', 'controlsTutorial.shieldBody'],
    ['controlsTutorial.attackBodyHold', 'controlsTutorial.attackBodyTwo'], ['controlsTutorial.targetBodyHold', 'controlsTutorial.targetBodyTwo']];   /* v2.3.6548: tap and hold's words (card CT part 15) */
  const bad = pairs.filter(([two, old]) => typeof TOUR[two] !== 'string' || !TOUR[two] || TOUR[two] === TOUR[old]);
  check('4a the tour\'s two-buttons rows are in its table, each its own words', bad.length === 0, bad);
  const coach = ['questCoach.moveTwo', 'questCoach.attackTwo', 'questCoach.attackHold', 'questCoach.specialTwo'].filter((k) => typeof COACH[k] !== 'string' || !COACH[k]);
  check('4b the coach\'s two-buttons rows are in its table', coach.length === 0, coach);
}

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILURE(S)`);
process.exit(failed === 0 ? 0 : 1);
