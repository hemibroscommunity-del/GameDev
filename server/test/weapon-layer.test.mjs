/* v2.3.4995: a weapon drawn out of its figure's run only where nothing it
   changes places with overlaps it (src/game/weaponHoist.js) */
import { boxesHit, clearOf, hoistOf } from '../../src/game/weaponHoist.js';

let pass = 0, fail = 0;
const check = (name, ok, info) => { if (ok) { pass++; console.log('PASS ' + name); } else { fail++; console.log('FAIL ' + name, info === undefined ? '' : JSON.stringify(info)); } };

check('1a. overlapping boxes hit', boxesHit([0, 0, 10, 10], [5, 5, 15, 15]));
check('1b. touching edges do not', !boxesHit([0, 0, 10, 10], [10, 0, 20, 10]) && !boxesHit([0, 0, 10, 10], [0, 10, 10, 20]));
check('1c. apart do not', !boxesHit([0, 0, 10, 10], [30, 30, 40, 40]));
check('2a. clear of nothing', clearOf([0, 0, 1, 1], [], 0, 0));
check('2b. null entries are nothing drawn', clearOf([0, 0, 10, 10], [null, [20, 20, 30, 30], null], 0, 3));
check('2c. one hit is enough', !clearOf([0, 0, 10, 10], [[20, 20, 30, 30], [9, 9, 12, 12]], 0, 2));

/* a layer: figure A at 0, B at 1 (A's weapon at x 0-10), C at 2 */
const W = [0, 0, 10, 10];
const far = [100, 100, 120, 140], near = [5, 0, 30, 40];
check('3a. in front, nothing after it overlaps: to the end', hoistOf(W, false, [], [[0, 0, 20, 40], far, far], 0) === 'front');
check('3b. in front, a figure after it overlaps: in place', hoistOf(W, false, [], [[0, 0, 20, 40], near, far], 0) === null);
check('3c. in front, a figure BEFORE it overlaps: still to the end (it is drawn over that one either way)', hoistOf(W, false, [], [near, [0, 0, 20, 40], far], 1) === 'front');
check('3d. in front, its own hair after it overlaps: in place', hoistOf(W, false, [[2, 2, 8, 8]], [[0, 0, 20, 40], far, far], 0) === null);
check('4a. behind, nothing before it overlaps: to the start', hoistOf(W, true, [], [far, far, [0, 0, 20, 40]], 2) === 'back');
check('4b. behind, a figure before it overlaps: in place', hoistOf(W, true, [], [far, near, [0, 0, 20, 40]], 2) === null);
check('4c. behind, a figure AFTER it overlaps: still to the start', hoistOf(W, true, [], [[0, 0, 20, 40], near], 0) === 'back');
check('4d. behind, its own cape before it overlaps: in place', hoistOf(W, true, [[0, 0, 4, 4]], [far, [0, 0, 20, 40]], 1) === null);
check('5. no weapon box: in place', hoistOf(null, false, [], [far], 0) === null);

console.log(`\nweapon-layer: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
