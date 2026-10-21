/* The fight simulator still fights -- v2.3.3532 (tools/pvp-sim/sim.mjs).
 *
 * From v2.3.3315 until v2.3.3532 every fight the simulator ran ended
 * unfought.  Its two players joined without `ws`, the Wheel sizes a phone
 * says it draws, so the worker held them out of step with its Wheel
 * (wheeltables.js _wheelInStep) and No man's land refused every hit
 * (TRAPS §196).  Nothing failed: every table it printed simply read 0%.
 * Its fights also stood 9,000 px from the centre: the short Wheel's No man's
 * land 5, but the long Wheel's ring 1, where a kiting archer walks out of No
 * man's land and the fight stalls (115 of 300 top-skill sword v bow fights).
 *
 *   1. both players join in step with the room's Wheel;
 *   2. a fight starts in No man's land 5 of the room's own Wheel;
 *   3. fights are fought: every one deals damage, nearly every one ends with
 *      a winner, and no fighter leaves No man's land (`checkNml`), for the
 *      three pairings of different weapons.
 */
import { fight, seed, setTune, room } from '../../tools/pvp-sim/sim.mjs';
import { nmlLevelAt } from '../src/nomansland.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

// ── 1. in step with the room's Wheel ──
for (const id of ['bp_a', 'bp_b']) {
  const ps = room.playerState[id];
  check('1. ' + id + ' joined in step with the room\'s Wheel', !!ps && room._wheelInStep(ps), ps && ps._wheelSizes);
}

room._liveFlags = {};
setTune({});
const spec = (style) => ({ style, L: 10, tm: 1.25, chest: 1, legs: 1 });

// ── 2. the fight stands in No man's land 5 ──
{
  seed(3532);
  let ring = null;
  fight(spec('melee'), 'moderate', spec('bow'), 'moderate', {
    maxMs: 2000,
    onFrame(A) { if (ring === null) ring = nmlLevelAt(WHEEL_ZONE, A.x, A.y, room._wheelLongNow()); },
  });
  check('2. a fight starts in No man\'s land 5 of the room\'s Wheel', ring === 5, { ring, wheel: room._wheelLongNow() });
}

// ── 3. fights are fought ──
for (const [a, b] of [['melee', 'bow'], ['melee', 'staff'], ['bow', 'staff']]) {
  seed(353200 + a.length * 7 + b.length);
  const N = 8;
  let dealt = 0, won = 0, left = 0, quiet = 0;
  for (let i = 0; i < N; i++) {
    let r;
    try { r = fight(spec(a), 'moderate', spec(b), 'moderate', { checkNml: true }); } catch (e) { left++; continue; }
    if (r.A.dealt + r.B.dealt > 0) dealt++; else quiet++;
    if (r.winner === 'A' || r.winner === 'B') won++;
  }
  check(`3. ${a} v ${b}: every fight deals damage`, dealt === N, { dealt, quiet, left, N });
  check(`3. ${a} v ${b}: no fighter leaves No man's land`, left === 0, { left, N });
  check(`3. ${a} v ${b}: nearly every fight has a winner`, won >= N - 1, { won, N });
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
