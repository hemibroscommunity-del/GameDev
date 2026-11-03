/* v2.3.3973: the skateboard's bumps (src/game/boardBumps.js), run in node: their
 * height, how smooth, how often and how irregular. */
import { boardBumpAt, bumpHash, BUMP_EVERY, BUMP_WIDTH, BUMP_MIN, BUMP_MAX } from '../../src/game/boardBumps.js';

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, detail === undefined ? '' : JSON.stringify(detail)); }
};

check('1a: the owner\'s "subtly": 1-1.5 game px, every ~70 px, 24 px long', BUMP_MIN === 1 && BUMP_MAX === 1.5 && BUMP_EVERY === 70 && BUMP_WIDTH === 24);
check('1b: nothing before the ride, nothing from a bad number', boardBumpAt(0) === 0 && boardBumpAt(-5) === 0 && boardBumpAt(NaN) === 0 && boardBumpAt('x') === 0);

/* over 70 stretches, a px at a time */
const N = 70 * 70;
let peaks = [], max = 0, min = 0, jump = 0, prev = 0, starts = [];
for (let d = 0; d <= N; d += 0.5) {
  const v = boardBumpAt(d);
  max = Math.max(max, v); min = Math.min(min, v);
  jump = Math.max(jump, Math.abs(v - prev));
  if (prev === 0 && v > 0) starts.push(d);
  prev = v;
}
for (let c = 0; c < 70; c++) {
  let best = 0;
  for (let d = c * 70; d < (c + 1) * 70; d += 0.25) best = Math.max(best, boardBumpAt(d));
  peaks.push(best);
}
check('2a: never below the ground, never over 1.5', min === 0 && max <= BUMP_MAX + 1e-9, { min, max });
check('2b: every stretch has its bump, 1-1.5 px high', peaks.every((p) => p >= BUMP_MIN - 0.01 && p <= BUMP_MAX + 1e-9), peaks.slice(0, 8));
check('2c: smooth: half a px of travel never moves it more than 0.1 px (no step)', jump < 0.1, jump);
check('2d: one bump a stretch', starts.length === 70, starts.length);
const gaps = starts.slice(1).map((s, i) => s - starts[i]);
const gmin = Math.min(...gaps), gmax = Math.max(...gaps), gmean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
check(`2e: irregular gaps (${gmin}-${gmax} px, mean ${gmean.toFixed(1)}), about every 70`, gmax - gmin >= 30 && Math.abs(gmean - 70) < 3 && gmin >= BUMP_WIDTH, { gmin, gmax, gmean });
check('2f: the heights vary too', Math.max(...peaks) - Math.min(...peaks) > 0.25, peaks.slice(0, 8));
check('2g: the same ride, the same bumps', boardBumpAt(1234.5) === boardBumpAt(1234.5) && bumpHash(7, 1) === bumpHash(7, 1) && bumpHash(7, 1) !== bumpHash(8, 1));
check('2h: bumpHash stays in [0, 1)', Array.from({ length: 1000 }, (_, i) => bumpHash(i * 31 - 500, 3)).every((h) => h >= 0 && h < 1));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
