/* "YOUR MAP" IS NEVER TOO BIG -- v2.3.4155.
 *
 * The 2026-11-03 state-machine sweep (V15, M1-1): the coach refuses a mark
 * taller than 0.35 of the window (v2.3.2495's guard against the owner's
 * "screen-sized oval"), and the minimap's box is 264 px on a computer's side
 * column (wheelMiniSize.js) and 132 px everywhere else.  So on a window 754 px
 * tall or less (a 1366 x 768 laptop's, less the browser's bars), and on a
 * phone on its side 377 px tall or less, "Your map" was refused on every tick;
 * "Your quest" waits for it, and the Login Key card waits for both, so neither
 * ever came, and after tut_4 they never could.  A 1366 x 768 test window passes
 * (264 < 268.8), which is why no test saw it.  The rule is a pure answer
 * (src/game/coachMarkSize.js); the coach is a React file node does not run, so
 * its wiring is read from its source:
 *   1. the rule alone, as it stood: the arithmetic of the stall;
 *   2. the minimap lesson is allowed on a short laptop window and a short
 *      sideways phone;
 *   3. the guard still stands for every other lesson: a screen-sized mark is
 *      refused, the Mayor's world rect included, and the fractions are pinned;
 *   4. controls still pass;
 *   5. the wiring: the flag is on the minimap lesson alone, the coach asks this
 *      rule and keeps no copy of it, and the retire branch tells the pacing
 *      referee its card is gone (V15: a card up at that instant held the
 *      iPhone's PLAY FULL SCREEN card for the rest of the session). */
import { readFileSync } from 'fs';
import * as C from '../../src/game/coachMarkSize.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const read = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const coach = read('src/ui/mobile/QuestCoach.jsx');

const too = (L, side, vw, vh) => C.coachMarkTooBig(L, { width: side, height: side }, vw, vh);
const DESK_BOX = 264, PHONE_BOX = 132;   /* wheelMiniSize.js: 132 x 2 on a computer's side column */
/* the lessons as QuestCoach.jsx defines them (5 reads the source for these) */
const MAP = { id: 'minimap', shape: 'rect', noSizeRule: true };
const MAYOR = { id: 'mayor', shape: 'rect' };
const PLAIN_MAP = { id: 'minimap', shape: 'rect' };   /* the lesson without its flag: the rule as it stood */

/* 1 */
check('1a the rule alone passes the doubled box at 1366 x 768 (264 < 268.8): why the tests missed it', too(PLAIN_MAP, DESK_BOX, 1366, 768) === false);
check('1b ...and refuses it at 1366 x 657 and 1280 x 720: the laptop stall', too(PLAIN_MAP, DESK_BOX, 1366, 657) === true && too(PLAIN_MAP, DESK_BOX, 1280, 720) === true);
check('1c the rule alone passes the 132 px box sideways at 844 x 390 (by 4 px), and refuses it at 844 x 370', too(PLAIN_MAP, PHONE_BOX, 844, 390) === false && too(PLAIN_MAP, PHONE_BOX, 844, 370) === true);

/* 2 */
check('2a the map lesson is allowed at 1366 x 657 with the 264 px box', too(MAP, DESK_BOX, 1366, 657) === false);
check('2b ...and at 1280 x 720', too(MAP, DESK_BOX, 1280, 720) === false);
check('2c ...and on a phone on its side, 844 x 370, with the 132 px box', too(MAP, PHONE_BOX, 844, 370) === false);
check('2d ...and still at the sizes that passed before (1366 x 768, 844 x 390, an upright phone)', too(MAP, DESK_BOX, 1366, 768) === false && too(MAP, PHONE_BOX, 844, 390) === false && too(MAP, PHONE_BOX, 390, 844) === false);

/* 3 */
check('3a a screen-sized mark is still refused for the Mayor lesson, whose world rect is measured (1366 x 657)',
  C.coachMarkTooBig(MAYOR, { width: 400, height: 640 }, 1366, 657) === true);
check('3b ...and so is a box the minimap\'s size for any lesson without the flag: the exemption is the lesson\'s, not the size\'s',
  too(MAYOR, DESK_BOX, 1366, 657) === true && too({ id: 'questPill', shape: 'rect' }, DESK_BOX, 1280, 720) === true);
check('3c the v2.3.2495 oval (the joyzone, a circle, 195 x 600 on a 390 x 844 phone) is still refused',
  C.coachMarkTooBig({ id: 'blockRanged', shape: 'circle' }, { width: 195, height: 600 }, 390, 844) === true);
check('3d a full-width layer is still refused for a rect lesson (1300 of 1366)',
  C.coachMarkTooBig({ id: 'passkey', shape: 'rect' }, { width: 1300, height: 60 }, 1366, 657) === true);
check('3e the fractions are as v2.3.2495 set them (0.92 wide, 0.35 tall; a circle 160 or 0.42 of the short side): never loosened',
  C.MARK_RECT_W_FRAC === 0.92 && C.MARK_RECT_H_FRAC === 0.35 && C.MARK_CIRCLE_MIN_CAP === 160 && C.MARK_CIRCLE_VP_FRAC === 0.42);
check('3f only `noSizeRule: true` exempts a lesson (a truthy stand-in does not)',
  too({ id: 'minimap', shape: 'rect', noSizeRule: 1 }, DESK_BOX, 1366, 657) === true && too({ id: 'minimap', shape: 'rect', noSizeRule: 'yes' }, DESK_BOX, 1366, 657) === true);

/* 4 */
check('4a the right disc (a 108 px circle) passes upright and on a short sideways phone',
  too({ id: 'attack', shape: 'circle' }, 108, 390, 844) === false && too({ id: 'attack', shape: 'circle' }, 108, 844, 370) === false);
check('4b the quest card (220 x 52) passes on a short sideways phone and a short laptop window',
  C.coachMarkTooBig({ id: 'questPill', shape: 'rect' }, { width: 220, height: 52 }, 844, 370) === false
  && C.coachMarkTooBig({ id: 'questPill', shape: 'rect' }, { width: 220, height: 52 }, 1366, 657) === false);

/* 5 */
/* each lesson's own text: from its `id:` line to the next lesson's */
const blocks = Object.create(null);
{
  const at = [...coach.matchAll(/^    id: '(\w+)',/gm)];
  at.forEach((m, i) => { blocks[m[1]] = coach.slice(m.index, i + 1 < at.length ? at[i + 1].index : coach.indexOf('\n];', m.index)); });
}
const flagged = Object.keys(blocks).filter((id) => /^\s+noSizeRule: true,/m.test(blocks[id]));
check('5a the flag is on the minimap lesson alone (not the Mayor\'s, which also brings a world rect)',
  flagged.length === 1 && flagged[0] === 'minimap' && (coach.match(/^\s+noSizeRule:/gm) || []).length === 1, flagged);
check('5b ...which rings the renderer\'s own published box, as a rect',
  !!blocks.minimap && /worldRect: function \(\) \{ return minimapScreenRect\(\); \}/.test(blocks.minimap) && /shape: 'rect',/.test(blocks.minimap)
  && /window\.__btWheelMini/.test(coach.slice(coach.indexOf('function minimapScreenRect'), coach.indexOf('function minimapScreenRect') + 300)));
const mtb = coach.slice(coach.indexOf('function _markTooBig('), coach.indexOf('function _markTooBig(') + 900);
check('5c the coach asks this rule with the window\'s size, and keeps no copy of its numbers',
  /import \{ coachMarkTooBig \} from '@\/game\/coachMarkSize\.js';/.test(coach)
  && /const bad = coachMarkTooBig\(L, r, vw, vh\);/.test(mtb) && !/MARK_RECT_H_FRAC\s*=/.test(coach) && !/MARK_CIRCLE_MIN_CAP\s*=/.test(coach));
check('5d every mark still goes through it: the world rect and the selector paths',
  /if \(_markTooBig\(L, wr\)\) return null;/.test(coach) && /if \(_markTooBig\(L, r\)\) continue;/.test(coach));
const retire = coach.slice(coach.indexOf('if (!rpg || tutorialSkipped() || (!tut && !anyTimeWanted)) {'));
const retireBody = retire.slice(0, retire.indexOf('return;'));
check('5e the retire branch tells the referee the card is gone (noteCoach(false)), before it returns',
  retire.length > 0 && /noteCoach\(false, now\);/.test(retireBody), retireBody.slice(0, 400));

if (failures) { console.log(failures + ' FAILED'); process.exit(1); }
console.log('coach-mark-size: all passed');
