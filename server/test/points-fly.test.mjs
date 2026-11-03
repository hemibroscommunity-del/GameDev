/* v2.3.4055: a weapon level-up's bubbles to your points: the rules
 * (src/game/pointsBubbles.js) and where they land (src/game/questFly.js
 * QUEST_FLY_TARGETS.points), run in node. */
import { POINTS_FLY_SKILLS, pointsFlyOn, pointsBubbleCount } from '../../src/game/pointsBubbles.js';
import { QUEST_FLY_TARGETS } from '../../src/game/questFly.js';

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, detail === undefined ? '' : JSON.stringify(detail)); }
};

check('1a: the three combat skills, prog3\'s keys', POINTS_FLY_SKILLS.join() === 'sword,bow,staff');
check('1b: on by default, off with ?pointsfly=0 only', pointsFlyOn('') && pointsFlyOn('?a=1') && !pointsFlyOn('?pointsfly=0') && !pointsFlyOn('?a=1&pointsfly=0')
  && pointsFlyOn('?pointsfly=1') && pointsFlyOn('?pointsfly=01'));
const counts = [1, 2, 3, 4, 5, 10, 50, 0, -3, 'x'].map(pointsBubbleCount);
check('2a: 5-7 bubbles a level-up', counts.every((n) => n >= 5 && n <= 7), counts);
check('2b: the same level, the same number', pointsBubbleCount(7) === pointsBubbleCount(7) && pointsBubbleCount(2) !== pointsBubbleCount(3));
const T = QUEST_FLY_TARGETS.points;
/* v2.3.4082: the Bro card's Spend points, or the Points window's title over it */
check('3a: Spend points first, the Points window\'s title, then the Bro button, then the fold handle',
  T[0] === '[data-section="Build"]' && T[1] === '[data-bro-popup-head="Build"]' && T[2] === '[data-nav="hero"]' && T[3] === '[data-dash-fold]' && T.length === 4, T);
check('3b: the rewards\' own targets unchanged', QUEST_FLY_TARGETS.gold.join() === '[data-purse="1"]'
  && QUEST_FLY_TARGETS.item.join() === '[data-tut="coach-gear"],[data-dash-fold],[data-nav="dashboard"]');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
