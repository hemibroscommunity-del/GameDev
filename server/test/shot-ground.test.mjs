/* ═══ v2.3.3501: AN AIMED SHOT IS JUDGED FROM YOUR FEET TO ITS TARGET'S (src/game/shotGround.js) ═══
 *
 * A shot asks the ground under it about props.  Until now that ground line ran
 * parallel to the drawn shot, from your boots; a shot fired at a target now
 * asks from your boots to the target's feet.  Checked here:
 *   1. no target: the parallel offset at every distance, as before;
 *   2. aimed: the ground point starts at your boots, reaches the target's feet
 *      as the drawn point reaches its nearest approach to the target, and runs
 *      on parallel past them -- one straight line, boots to feet;
 *   3. not aimed after all: the drawn line passing outside the target's
 *      circle (a staff bolt steered away), or the target behind the start:
 *      the parallel line;
 *   4. mp-hitreal's frost magic case, in its own numbers: the parallel line
 *      met the end of the rock ridge, the boots-to-feet line passes over it;
 *   5. `gf` on the wire and back, and a peer's nonsense refused.
 */
import { shotAim, shotGroundOffset, shotAimWire, shotAimFromWire } from '../../src/game/shotGround.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

/* a shooter whose boots are at B; the drawn shot leaves from O = B + G (G the
   grip's offset over the boots: the parallel offset) toward a target */
const B = { x: 500, y: 600 }, G = { x: 30, y: -70 };
const O = { x: B.x + G.x, y: B.y + G.y };
const F = { x: 760, y: 420 }, LIFT = 23;   /* the target's feet, its body centre LIFT over them */
const C = { x: F.x, y: F.y - LIFT };
const ang = Math.atan2(C.y - O.y, C.x - O.x);   /* aimed at its body */
const aim = shotAim(C.x, C.y, 38, F.x, F.y);
const T = Math.hypot(C.x - O.x, C.y - O.y);     /* aimed straight at the centre: the nearest approach is the centre */
const groundAt = (d, a) => {
  const off = shotGroundOffset(O.x, O.y, ang, G.x, G.y, a, d);
  return { x: O.x + Math.cos(ang) * d - off[0], y: O.y + Math.sin(ang) * d - off[1] };
};

/* ── 1. no target ──────────────────────────────────────────────────────── */
{
  const offs = [0, 50, 200, 900].map((d) => shotGroundOffset(O.x, O.y, ang, G.x, G.y, null, d));
  check('1a. no target: the parallel offset at every distance', offs.every((o) => o[0] === G.x && o[1] === G.y), offs);
  const g = groundAt(150, null);
  check('1b. ...so the ground point is your boots plus the flight, as before',
    near(g.x, B.x + Math.cos(ang) * 150) && near(g.y, B.y + Math.sin(ang) * 150), g);
  check('1c. shotAim refuses a missing number or a radius of 0', shotAim(1, 2, 0, 3, 4) === null && shotAim(1, NaN, 5, 3, 4) === null && shotAim(1, 2, 5, 3) === null);
}

/* ── 2. aimed ──────────────────────────────────────────────────────────── */
{
  const g0 = groundAt(0, aim), gT = groundAt(T, aim);
  check('2a. at the start the ground point is your boots', near(g0.x, B.x) && near(g0.y, B.y), g0);
  check('2b. as the drawn point reaches the target, the ground point reaches its FEET', near(gT.x, F.x, 1e-6) && near(gT.y, F.y, 1e-6), gT);
  /* collinear: every point between lies on the segment boots -> feet */
  let worst = 0;
  for (let i = 1; i < 20; i++) {
    const d = T * i / 20, g = groundAt(d, aim);
    const ex = B.x + (F.x - B.x) * i / 20, ey = B.y + (F.y - B.y) * i / 20;
    worst = Math.max(worst, Math.hypot(g.x - ex, g.y - ey));
  }
  check('2c. in between it runs along the one straight line from your boots to the feet, in step', worst < 1e-6, worst);
  const gPast = groundAt(T + 100, aim);
  check('2d. past the target it runs on from the feet, parallel to the flight',
    near(gPast.x, F.x + Math.cos(ang) * 100, 1e-6) && near(gPast.y, F.y + Math.sin(ang) * 100, 1e-6), gPast);
  /* the parallel line, for comparison: where it is when the shot reaches the target */
  const pT = groundAt(T, null);
  check('2e. (the parallel line was short of the feet and to the side there: ' + Math.round(Math.hypot(pT.x - F.x, pT.y - F.y)) + ' px off them)',
    Math.hypot(pT.x - F.x, pT.y - F.y) > 30, pT);
}

/* ── 3. not aimed after all ────────────────────────────────────────────── */
{
  const steered = ang + 0.5;   /* the thumb turned the bolt well off the target */
  const off = shotGroundOffset(O.x, O.y, steered, G.x, G.y, aim, 120);
  check('3a. steered off the target (its circle no longer on the line): the parallel offset', off[0] === G.x && off[1] === G.y, off);
  const behind = shotAim(O.x - 200, O.y + 5, 38, O.x - 200, O.y + 28);
  const off2 = shotGroundOffset(O.x, O.y, 0, G.x, G.y, behind, 120);
  check('3b. a target behind where the shot starts: the parallel offset', off2[0] === G.x && off2[1] === G.y, off2);
  const graze = shotGroundOffset(O.x, O.y, ang, G.x, G.y, shotAim(C.x + 30, C.y - 20, 38, F.x + 30, F.y - 20), T);
  check('3c. a line through the edge of the circle still counts as aimed (the gate counts it)', !(graze[0] === G.x && graze[1] === G.y), graze);
}

/* ── 4. the frost ridge (mp-hitreal's magic row, 2026-10-19) ───────────── */
{
  /* frost-rock-ridge's footprint, the caster's boots, the snowman's feet, a
     staff bolt cast from the caster's centre (52 px over the boots) at the
     snowman's body (19 px over its feet) */
  const ridge = { x0: 329, y0: 528, x1: 531, y1: 570 };
  const boots = { x: 586, y: 528 }, feet = { x: 469, y: 506 };
  const o = { x: boots.x, y: boots.y - 52 }, c = { x: feet.x, y: feet.y - 19 };
  const a = Math.atan2(c.y - o.y, c.x - o.x), t = Math.hypot(c.x - o.x, c.y - o.y);
  const gof = (d, s) => { const off = shotGroundOffset(o.x, o.y, a, 0, -52, s, d); return { x: o.x + Math.cos(a) * d - off[0], y: o.y + Math.sin(a) * d - off[1] }; };
  const inBox = (p) => p.x >= ridge.x0 && p.x <= ridge.x1 && p.y >= ridge.y0 && p.y <= ridge.y1;
  const enters = (s) => { for (let i = 0; i <= 200; i++) { if (inBox(gof(t * i / 200, s))) return true; } return false; };
  const sAim = shotAim(c.x, c.y, 45, feet.x, feet.y);
  check('4a. the parallel line goes into the ridge before the bolt reaches the snowman (the burst on its end)', enters(null) === true);
  check('4b. boots to feet passes over the ridge\'s end: the bolt reaches it', enters(sAim) === false);
}

/* ── 5. on the wire ────────────────────────────────────────────────────── */
{
  const w = shotAimWire(aim);
  check('5a. five whole numbers', Array.isArray(w) && w.length === 5 && w.every(Number.isInteger), w);
  const back = shotAimFromWire(w);
  check('5b. ...and back, to within a rounding', !!back && near(back.cx, C.x, 0.5) && near(back.cy, C.y, 0.5) && near(back.fx, F.x, 0.5) && near(back.fy, F.y, 0.5) && back.r === 38, back);
  check('5c. no target: nothing on the wire', shotAimWire(null) === undefined);
  check('5d. a peer\'s nonsense is refused: wrong length, not numbers, a huge radius, a huge coordinate',
    shotAimFromWire([1, 2, 3]) === null && shotAimFromWire(['a', 2, 3, 4, 5]) === null
    && shotAimFromWire([1, 2, 999, 4, 5]) === null && shotAimFromWire([1e9, 2, 3, 4, 5]) === null
    && shotAimFromWire(null) === null && shotAimFromWire({ length: 5 }) === null);
}

console.log(`\nshot-ground: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
