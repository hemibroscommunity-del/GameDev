/* A NEW CHARACTER'S FIRST STEPS: FIVE, AND NOTHING MORE -- v2.3.4106.
 *
 * The owner, 2026-11-03: "First sequence of events when first creating
 * character should be welcome to Brotown, talk to mayor bro, equip weapons,
 * see minimap with star marker and quest progress in top left pill. Don't
 * include the non-essential stuff anymore like tap to talk etc".
 * The page's rules, read from its source (the coach is a React file node does
 * not run; mp-firststeps plays them on a phone and a computer):
 *   1. the coach's first steps, in order: mayor, equip, minimap, questPill;
 *      each a lesson, each `firstStep`, the walk holding a step until the one
 *      before it is done;
 *   2. every other lesson of the first minutes RETIRED and skipped by the
 *      walk (and the first-join fold with it); `points` (a level-up's) stays;
 *   3. the Login Key after the first steps and the first hand-in;
 *   4. the five follow each other with a short breath, not the 20 s;
 *   5. the welcome is one short line, with no instruction;
 *   6. the install card waits while a first step is still to come;
 *   7. the big arrow points at Mayor Bro until he is talked to. */
import { readFileSync } from 'fs';
import * as G from '../../src/ui/guideArrow.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const read = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const coach = read('src/ui/mobile/QuestCoach.jsx');
const pace = read('src/ui/onboardingPace.js');
const welcome = read('src/game/welcomeBanner.js');

/* 1 */
const ids = [...coach.matchAll(/^    id: '(\w+)',/gm)].map((m) => m[1]);
const order = ['mayor', 'equip', 'minimap', 'questPill'].map((id) => ids.indexOf(id));
check('1a the four coach steps exist, in order (after the welcome plate)', order.every((i) => i >= 0) && order.every((v, i) => i === 0 || v > order[i - 1]), { ids, order });
check('1b FIRST_STEPS names them in that order', /const FIRST_STEPS = \['mayor', 'equip', 'minimap', 'questPill'\];/.test(coach));
check('1c the walk holds a step until the steps before it are done', /if \(L\.firstStep && FIRST_STEPS\.slice\(0, FIRST_STEPS\.indexOf\(L\.id\)\)\.some\(function \(id\) \{ return !done\[id\]; \}\)\) continue;/.test(coach));
check('1d the Mayor step rings him and ends when his dialogue opens', /worldRect: function \(S\) \{ return mayorScreenRect\(S\); \}/.test(coach) && /if \(nm && \/Mayor Bro\/\.test\(nm\.textContent \|\| ''\)\) \{ done\.mayor = true; saveDone\(done\); \}/.test(coach));

/* 2 */
const retired = ['openDash', 'move', 'dashAfterTurnIn', 'equipAll', 'cycle', 'blockRanged', 'attack', 'special', 'chatTap'];
const m = /const RETIRED = new Set\(\[([^\]]*)\]\);/.exec(coach);
const listed = m ? m[1].split(',').map((x) => x.trim().replace(/'/g, '')) : [];
check('2a every other lesson of the first minutes is retired', retired.every((id) => listed.includes(id)) && listed.length === retired.length, listed);
check('2b ...and the walk skips them; the first-join fold is gone with openDash', /if \(RETIRED\.has\(L\.id\)\) continue;/.test(coach) && /if \(!RETIRED\.has\('openDash'\) && rpg && !done\.openDash/.test(coach));
check('2c the first points (a level-up\'s) are not retired', !listed.includes('points') && !listed.includes('passkey'));

/* 3 */
check('3 the Login Key waits for the first steps and the first hand-in', /if \(L\.id === 'passkey' && \(FIRST_STEPS\.some\(function \(id\) \{ return !done\[id\]; \}\) \|\| \(\(rpg\._quests \|\| \{\}\)\.tut_1 !== 'turnedIn'\)\)\) continue;/.test(coach));

/* 4 */
check('4 a first step waits FIRST_STEP_GAP_MS (1.5 s), the others the 20 s', /const FIRST_STEP_GAP_MS = 1500;/.test(coach) && /L\.firstStep \? \(!viewRef\.current && !coachMayShow\(now, FIRST_STEP_GAP_MS\)\) : holdNew/.test(coach)
  && /export function coachMayShow\(now = Date\.now\(\), gapMs\)/.test(pace) && /const COACH_GAP_MS = 20000;/.test(pace));

/* 5 */
check('5 the welcome is one short line, no instruction in it', /sub: 'Your adventure starts here\.',/.test(welcome) && !/then tap him/.test(welcome));

/* 6 */
check('6 the install card waits while a first step is still to come', /if \(_firstStepsOpen\) return false;/.test(pace) && /noteFirstSteps\(tut && !tutorialSkipped\(\) && FIRST_STEPS\.some/.test(coach));

/* 7 */
const fresh = { _quests: {} };
check('7a the arrow wants Mayor Bro before the first quest', G.guideState('mayor', fresh, null, 0, 0).want === true);
check('7b ...and is done once the first quest has a record', G.guideState('mayor', { _quests: { tut_1: 'active' } }, null, 500, 0).done === true);
check('7c a character that started again is owed it again', G.guideOwedAgain(fresh).includes('mayor'));
check('7d ...given up after MAYOR_MS (3 min) of showing, and last in the order (a wanted lesson beats it)',
  G.MAYOR_MS === 180000 && G.guideState('mayor', fresh, null, G.MAYOR_MS, 0).done === true && /for \(const id of \['weapon', (?:'swap', )?(?:'forge', )?'points', 'mayor'\]\)/.test(read('src/ui/guideArrow.js')));   /* v2.3.4130: the swap lesson (weapon pill) sits between weapon and points */

if (failures) { console.log(failures + ' FAILED'); process.exit(1); }
console.log('first-steps: all passed');
