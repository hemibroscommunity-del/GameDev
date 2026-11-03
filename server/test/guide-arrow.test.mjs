/* A BIG ARROW SHOWS WHERE TO GO, THE FIRST TIME -- v2.3.3925 (src/ui/guideArrow.js).
 *
 * The owner, 2026-11-02: "The first time you get handed a weapon put an arrow
 * pointing to either the bag dashboard button or the weapon if the dashboard
 * is already open ... Also the first time you level up and have enough points
 * to allocate ... that same big arrow."  Its rules, run here in node:
 *   1. the weapon lesson: wanted while the first quest's sword or shield
 *      waits in the bag; done once worn or after WEAPON_MS shown;
 *   2. its targets are the glow's (gearFlash): the fold handle while folded,
 *      the Gear button while the bag is off the screen, else the tiles;
 *   3. the points lesson: wanted at the first points (pointsTipWanted); its
 *      targets the Points tab, then Character, then the fold handles; done
 *      once a point is placed or after POINTS_MS shown;
 *   4. the words: "Tap ..." on a phone, "Click ..." on a computer;
 *   5. a character that started again is owed each lesson once more;
 *   6. only the stable hooks are aimed at, and QuestCoach mounts it. */
import * as G from '../../src/ui/guideArrow.js';
import { readFileSync } from 'fs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const handed = { _quests: { tut_1: 'active' }, weaponStash: [{ type: 'sword' }], shieldStash: [{ name: 'Buckler' }], weapon: null, shield: null };
const worn = { _quests: { tut_1: 'active' }, weaponStash: [], shieldStash: [], weapon: { type: 'sword' }, shield: { name: 'Buckler' } };
const fresh = { _quests: {}, weaponStash: [], shieldStash: [] };

/* 1 */
check('1a no weapon handed over: not wanted', G.guideState('weapon', fresh, null, 0, 0).want === false);
check('1b the sword and shield in the bag: wanted, not done', G.guideState('weapon', handed, null, 0, 0).want === true && G.guideState('weapon', handed, null, 0, 0).done === false);
check('1c worn after it showed: done', G.guideState('weapon', worn, null, 500, 0).done === true);
check('1d still unworn after WEAPON_MS shown: done', G.WEAPON_MS === 60000 && G.guideState('weapon', handed, null, G.WEAPON_MS, 0).done === true);
check('1e the bow and the staff later are not its business', G.weaponWants({ _quests: { tut_1: 'turnedIn' }, weaponStash: [{ type: 'bow' }], weapon: { type: 'sword' }, shield: {} }).bow === false);

/* 2 */
const shownSet = (list) => (sel) => list.includes(sel);
check('2a folded: the fold handles', G.guideTargets('weapon', handed, shownSet(['[data-dash-fold="min"]'])).join() === '[data-dash-fold="min"],[data-land-fold="min"]');
check('2b open, bag off screen: the Gear (dashboard) button', G.guideTargets('weapon', handed, shownSet([])).join() === '[data-nav="dashboard"]');
check('2c open, tiles showing: the weapon\'s tiles', G.guideTargets('weapon', handed, shownSet(['[data-gear="sword"]'])).includes('[data-gear="sword"]'));

/* 3 */
const p3 = (pool, shared, alloc) => ({ _quests: { tut_1: 'active' }, prog3: { pool, shared, alloc: alloc || {} } });
check('3a points waiting, none placed, calm: wanted', G.guideState('points', p3(2, 1), { lastDamageTaken: 0, _dealtAt: 0 }, 0, Date.now()).want === true);
check('3b a point placed: done', G.guideState('points', p3(1, 1, { hp: 1 }), {}, 300, Date.now()).done === true);
check('3c the targets, the Points tab first', G.guideTargets('points', p3(1, 1), () => false)[0] === '[data-section="Build"]' && G.guideTargets('points', p3(1, 1), () => false)[1] === '[data-nav="hero"]');
check('3d kept for later: done after POINTS_MS shown', G.guideState('points', p3(2, 1), {}, G.POINTS_MS, Date.now()).done === true);

/* 4 */
check('4a a phone reads Tap, a computer Click', /^Tap/.test(G.guideWords('weapon', '[data-dash-fold="min"]', false)) && /^Click/.test(G.guideWords('weapon', '[data-dash-fold="min"]', true)));
check('4b the Points tab and Character have their own words', G.guideWords('points', '[data-section="Build"]', false) === 'Tap Points' && /Bro/.test(G.guideWords('points', '[data-nav="hero"]', false)));

/* 5 */
check('5a a character that never took the first quest is owed the weapon lesson again', G.guideOwedAgain(fresh).includes('weapon'));
check('5b ...and one with no points ever, the points lesson', G.guideOwedAgain({ _quests: { tut_1: 'active' }, prog3: { pool: 0, shared: 0, alloc: {} } }).join() === 'points');
check('5c a character with points waiting or placed is owed nothing', G.guideOwedAgain(p3(2, 1)).length === 0 && G.guideOwedAgain(p3(0, 0, { hp: 1 })).length === 0);

/* 6 */
const src = readFileSync(new URL('../../src/ui/guideArrow.js', import.meta.url), 'utf8');
const coach = readFileSync(new URL('../../src/ui/mobile/QuestCoach.jsx', import.meta.url), 'utf8');
check('6a body-level, no pointer events, no CSS filter, ?guidearrow=0, the per-character key in try/catch',
  /document\.body\.appendChild\(el\)/.test(src) && /pointerEvents = 'none'/.test(src) && !/\.filter\s*=/.test(src)
    && /get\('guidearrow'\) === '0'/.test(src) && /'bt_guideArrow:'/.test(src) && /try \{ const v = JSON\.parse\(localStorage\.getItem/.test(src));
check('6b QuestCoach mounts it', /return startGuideArrow\(/.test(coach));

if (failures) { console.log(failures + ' FAILED'); process.exit(1); }
console.log('all passed');
