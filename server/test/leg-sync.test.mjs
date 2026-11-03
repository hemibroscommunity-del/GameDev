/* v2.3.4077: the legs keep pace with the feet (src/game/legSync.js; spec
 * docs/specs/leg-sync.md), run in node.
 *
 *   1. THE STRIDES: the measured table (tools/measure_jog_stride.py), north
 *      and south without one, a mirrored facing's from its sheet.
 *   2. THE LOOP: stride x scale / speed, at the walk the stride over 150;
 *      north and south their tuned loop by speed / walk.
 *   3. THE CLAMP: a stick barely pushed, a board at a sprint.
 *   4. QUANTISED: a wobbling speed holds its loop; a real change moves it.
 *   5. THE SPRINT: exactly SPRINT_MULT quicker than the walk under it, local
 *      (199.5 px/s) and a peer's rounded wire velocity (3.33 a frame).
 *   6. ?legsync=0: the old arithmetic, line for line.
 */
import {
  JOG_STRIDE_PX, LEG_WALK_SPEED, LEG_SPEED_STEP, LEG_CYCLE_MIN_MS, LEG_CYCLE_MAX_MS,
  legSyncOn, quantiseLegSpeed, jogStridePx, strideCycleMs, jogPace,
} from '../../src/game/legSync.js';
import { SPRINT_MULT } from '../../src/game/sprint.js';
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, detail === undefined ? '' : JSON.stringify(detail)); }
};
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

/* the tuned loops, as playerSprites.js has them (it imports pixi, so read) */
const PS = readFileSync(new URL('../../src/rendering/playerSprites.js', import.meta.url), 'utf8');
const FIXED = {};
{
  const m = PS.match(/JOG_DURATION_BY_DIR = \{([\s\S]*?)\};/);
  const body = m[1].replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, k, v] of body.matchAll(/(\w+):\s*(\d+)/g)) FIXED[k] = +v;
}

/* ── 1. the strides ── */
check('1a: the measured strides (east 168, north-east 179, south-west 242), frozen',
  JOG_STRIDE_PX.east === 168 && JOG_STRIDE_PX.northeast === 179 && JOG_STRIDE_PX.southwest === 242 && Object.isFrozen(JOG_STRIDE_PX), JOG_STRIDE_PX);
check('1b: north and south have none (their boots step in place)', JOG_STRIDE_PX.north === 0 && JOG_STRIDE_PX.south === 0);
check('1c: the sheets\' five facings, no more (a mirror reads its sheet\'s)',
  Object.keys(JOG_STRIDE_PX).sort().join() === 'east,north,northeast,south,southwest');
check('1d: north and south read the walk over their tuned loop as their stride (the townsfolk\'s one number)',
  near(jogStridePx('north', 808), 121.2) && near(jogStridePx('south', 823), 123.45) && jogStridePx('east', 900) === 168, [jogStridePx('north', 808), jogStridePx('south', 823)]);
check('1e: playerSprites still holds the five tuned loops (the fixed cadence, legsync off, Lane T\'s climb)',
  FIXED.north === 808 && FIXED.south === 823 && FIXED.northeast === 877 && FIXED.east === 900 && FIXED.southwest === 1656 && /export const JOG_DURATION_BY_DIR/.test(PS), FIXED);
check('1f: the walk is 150 px a second, the quantum a 24th of it', LEG_WALK_SPEED === 150 && LEG_SPEED_STEP === 6.25);

/* ── 2. the loop ── */
check('2a: east at the walk: 168 / 150 = 1120 ms (was 900: the legs 1.25x the ground)', near(strideCycleMs('east', 150, 900, 1), 1120));
check('2b: north-east 1193 ms, south-west 1613 ms at the walk',
  near(strideCycleMs('northeast', 150, 877, 1), 179 / 150 * 1000) && near(strideCycleMs('southwest', 150, 1656, 1), 242 / 150 * 1000));
check('2c: north and south at the walk: exactly their tuned loop', strideCycleMs('north', 150, 808, 1) === 808 && strideCycleMs('south', 150, 823, 1) === 823);
check('2d: half the speed, twice the loop (east 2240; north 1616)', near(strideCycleMs('east', 75, 900, 1), 2240) && near(strideCycleMs('north', 75, 808, 1), 1616));
check('2e: a smaller figure takes shorter strides (scale 0.5: east 560 ms at the walk)', near(strideCycleMs('east', 150, 900, 0.5), 560));
check('2f: north and south ignore the scale (speed only, as tuned)', strideCycleMs('north', 150, 808, 0.5) === 808);
check('2g: no speed: the tuned loop', strideCycleMs('east', 0, 900, 1) === 900 && strideCycleMs('east', NaN, 900, 1) === 900);
check('2h: an unknown facing walks like north (the tuned loop by speed)', near(strideCycleMs('west', 75, 900, 1), 1800));

/* ── 3. the clamp ── */
check(`3a: a stick barely pushed (6 px/s): the loop stops at ${LEG_CYCLE_MAX_MS} ms, not 28 s`, strideCycleMs('east', 6, 900, 1) === LEG_CYCLE_MAX_MS);
check(`3b: a board at a sprint (400 px/s) stays above ${LEG_CYCLE_MIN_MS} ms (east 420)`, near(strideCycleMs('east', 400, 900, 1), 420) && strideCycleMs('east', 2000, 900, 1) === LEG_CYCLE_MIN_MS);
check('3c: the shield held (75 px/s) is inside the range everywhere',
  ['east', 'northeast', 'southwest', 'north', 'south'].every((d) => { const c = strideCycleMs(d, 75, FIXED[d], 1); return c > LEG_CYCLE_MIN_MS && c < LEG_CYCLE_MAX_MS; }));

/* ── 4. quantised ── */
check('4a: 150 stays 150; 0, negative and nonsense are 0',
  quantiseLegSpeed(150, 0) === 150 && quantiseLegSpeed(0, 150) === 0 && quantiseLegSpeed(-5, 0) === 0 && quantiseLegSpeed('x', 0) === 0 && quantiseLegSpeed(Infinity, 0) === 0);
check('4b: anything moving is at least one step', quantiseLegSpeed(0.5, 0) === LEG_SPEED_STEP);
check('4c: rounded to a 24th of the walk', quantiseLegSpeed(152, 0) === 150 && quantiseLegSpeed(154, 0) === 156.25 && quantiseLegSpeed(100, 0) === 100);
{
  const st = { q: 0 };
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const r = jogPace(st, { dir: 'east', fixedMs: 900, speed: 150 + 4 * Math.sin(i * 1.7), mult: 1, scale: 1, sync: true });
    seen.add(r.cyc);
  }
  check('4d: a speed wobbling 146-154 holds one loop (hysteresis)', seen.size === 1 && seen.has(1120), [...seen]);
  const r2 = jogPace(st, { dir: 'east', fixedMs: 900, speed: 120, mult: 1, scale: 1, sync: true });
  check('4e: a real change moves it (120 px/s: the step 118.75, 1415 ms)', near(r2.cyc, 168 / 118.75 * 1000) && st.q === 118.75, { r2, q: st.q });
}
{
  const st = { q: 0 };
  const a = jogPace(st, { dir: 'east', fixedMs: 900, speed: 150, mult: 1, scale: 1.003, sync: true });
  check('4f: the figure\'s scale is quantised too (a vista\'s curve does not wobble it)', near(a.cyc, 1120), a);
}

/* ── 5. the sprint ── */
{
  const st = { q: 0 };
  const w = jogPace(st, { dir: 'east', fixedMs: 900, speed: 150, mult: 1, scale: 1, sync: true });
  const r = jogPace(st, { dir: 'east', fixedMs: 900, speed: 2.5 * SPRINT_MULT * 60, mult: SPRINT_MULT, scale: 1, sync: true });
  check(`5a: sprinting (199.5 px/s) the loop is exactly ${SPRINT_MULT}x quicker than the walk (${w.cyc} / ${r.cyc.toFixed(1)})`,
    near(w.cyc / r.cyc, SPRINT_MULT, 1e-9) && near(r.base / r.cyc, SPRINT_MULT, 1e-9) && r.base === w.cyc, { w, r });
  const p = jogPace({ q: 0 }, { dir: 'east', fixedMs: 900, speed: 3.33 * 60, mult: SPRINT_MULT, scale: 1, sync: true });
  check('5b: a peer\'s wire velocity (3.33 a frame, rounded) gives the same ratio (mp-sprintpeer\'s 0.01)',
    Math.abs(p.base / p.cyc - SPRINT_MULT) < 0.01 && near(p.cyc, r.cyc), p);
  const lag = jogPace({ q: 0 }, { dir: 'east', fixedMs: 900, speed: 150, mult: SPRINT_MULT, scale: 1, sync: true });
  check('5c: a peer still marked sprinting while it walks (the 600 ms flag) still has walking legs',
    Math.abs(lag.cyc - 1120) < 1120 * 0.03, lag);
  const pw = jogPace({ q: 0 }, { dir: 'east', fixedMs: 900, speed: 2.5 * 60, mult: 1, scale: 1, sync: true });
  check('5d: walking, the loop is its base (mp-sprintpeer\'s "walks again")', pw.cyc === pw.base, pw);
  const n = jogPace({ q: 0 }, { dir: 'north', fixedMs: 808, speed: 199.5, mult: SPRINT_MULT, scale: 1, sync: true });
  check('5e: north sprinting: its tuned loop / SPRINT_MULT (as before)', near(n.cyc, 808 / SPRINT_MULT, 1e-6) && n.base === 808, n);
}

/* ── 6. ?legsync=0 ── */
check('6a: on by default; ?legsync=0 turns it off, nothing else does',
  legSyncOn('') && legSyncOn('?x=1') && legSyncOn('?legsync=1') && legSyncOn('?legsync=01') && !legSyncOn('?legsync=0') && !legSyncOn('?a=1&legsync=0') && !legSyncOn('?legsync=0&b=2') && legSyncOn(undefined));
{
  const st = { q: 150 };
  const off = jogPace(st, { dir: 'east', fixedMs: 900, speed: 150, mult: SPRINT_MULT, scale: 1, sync: false });
  const aim = jogPace(st, { dir: 'east', fixedMs: 900, speed: 75, mult: 1, scale: 1, sync: false, aimSlow: true });
  check('6b: off: the tuned loop / the sprint, base the tuned loop (v2.3.3006)', near(off.cyc, 900 / SPRINT_MULT) && off.base === 900, off);
  check('6c: off: aiming doubles it (the old half-speed rule)', aim.cyc === 1800 && aim.base === 900, aim);
  check('6d: off forgets the held speed (turning it back on starts clean)', st.q === 0);
  const on = jogPace({ q: 0 }, { dir: 'east', fixedMs: 900, speed: 75, mult: 1, scale: 1, sync: true, aimSlow: true });
  check('6e: on: aiming is in the speed already, not doubled again (75 px/s: 2240)', near(on.cyc, 2240), on);
  const still = jogPace({ q: 0 }, { dir: 'east', fixedMs: 900, speed: 0, mult: 1, scale: 1, sync: true });
  check('6f: on, no speed (held at a door): the tuned loop', still.cyc === 900 && still.base === 900, still);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
