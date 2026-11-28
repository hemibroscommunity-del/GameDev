/* ═══ v2.3.6660: THE VIEW FOLLOWS THE BRO, NOT HIS SPEED, HELD (card GR part 2) ═══
 *
 * src/game/cameraFollow.js: the camera moves by the bro's step each frame,
 * THEN closes what gap is left, so the bro sits at one place on the screen
 * whatever his speed (the census: docs/plan/census/GR-grit.md on the branch
 * claude/plan-gr-grit, M5).  Here, not server/test: a merge of it deploys no
 * worker (TRAPS §277).  What it plays, with the board's own rule
 * (src/game/ride.js rideFeel: the pushes from a stand, the roll-off):
 *
 *   1. cameraFollow.js imports nothing (node tests it; any file may ask it);
 *   2. THE PURPOSE: a ride from a stand -- stood, a push to top speed, held,
 *      let go, rolled to a stop, stood -- east, north-east and north: the
 *      bro's offset from the screen's middle within 2 of the owner's device
 *      px (430 x 775 at 3x: 1.663 a game px) of its held value EVERY frame;
 *      the old chase (`?camfollow=0`) fails the same ride (the push's slide);
 *   3. the jog and the ride hold the same place;
 *   4. the phone's wobble (each frame's length 10 to 23 ms): still flat;
 *   5. what is not a walk's step is chased, not followed: a step past
 *      BIG_STEP a 60th (a lunge, a teleport), at the dt's scale; the first
 *      frame, with no last place, follows nothing;
 *   6. the chase's rates, as before: 8% stood, 14% moving, 18% swinging or
 *      rolling, a power of the frame's length; the view's middle is W/2, H/2;
 *   7. the camera punch: its kick eased out over 300 ms, then cleared;
 *   8. `?camfollow=0`: the old lead, 30 game px x a stick past 0.1;
 *   9. the call: the game's loop (the ui system) makes ONE call of followCamera, its switch
 *      `!sw('camfollow')`, the old lead and chase gone from it; the switch's
 *      row in the table and the page's reader.
 *
 * Mutants: `CAMFOLLOW_MODULE=<a file>` plays a changed copy of the module
 * (the PR's mutation run; the survivors, if any, are named in the PR).
 *
 *   node tools/guards/camera-follow.test.mjs
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findIn } from './lib/filesOf.mjs';   /* the game's loop read by its system, never by a big file's path */

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const MOD = process.env.CAMFOLLOW_MODULE ? resolve(process.env.CAMFOLLOW_MODULE) : join(ROOT, 'src/game/cameraFollow.js');
const { followCamera, camPunch, FOLLOW } = await import(pathToFileURL(MOD).href);
const ride = await import(pathToFileURL(join(ROOT, 'src/game/ride.js')).href);

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail)));
}

const DEV = 0.554 * 3;   /* the owner's device px a game px (the census: 430 x 737 canvas, scale 0.554, 3x) */
const TOL = 2 / DEV;     /* 2 device px, in game px */
const W = 776, H = 1330; /* the view in game px (430 / 0.554, 737 / 0.554) */
const JOG = 2.5;         /* game px a 60th on foot (the census) */

/* 1. no imports */
{
  const src = readFileSync(MOD, 'utf8');
  check('1: cameraFollow.js imports nothing', !/^\s*import\b/m.test(src) && !/\brequire\s*\(/.test(src) && !/\bimport\s*\(/.test(src));
}

/* A ride: frames of [held stick dx, dy]; the board's rule decides the speed.
   Returns each frame's offset of the bro from the view's middle (game px). */
function play({ on, dir, frames, board = true, lens = null, x0 = 5000, y0 = 5000 }) {
  const S = { camera: { x: x0 - W / 2, y: y0 - H / 2 }, _ride: board ? { on: true } : null, _dtScale: 1 };
  let px = x0, py = y0;
  const off = [];
  for (let f = 0; f < frames.length; f++) {
    const len = lens ? lens[f % lens.length] : 1000 / 60;
    S._dtScale = len / (1000 / 60);
    let [dx, dy] = frames[f] ? dir : [0, 0];
    let k = 1;
    if (board) { const r = ride.rideFeel(S, dx, dy, len, false, px, py); k = r[0] * ride.RIDE_MULT; dx = r[1]; dy = r[2]; }
    else if (!frames[f]) k = 0;
    px += dx * JOG * k * S._dtScale;
    py += dy * JOG * k * S._dtScale;
    followCamera(S, px, py, W, H, dx, dy, 0, on);
    off.push([px - S.camera.x - W / 2, py - S.camera.y - H / 2]);
  }
  return { off, S, px, py };
}
const script = (stood, held, rolled, after) => [...Array(stood).fill(false), ...Array(held).fill(true), ...Array(rolled + after).fill(false)];
const RIDE = script(20, 100, 150, 20);
function spread(off, from = 0, to = off.length) {
  const held = off[Math.floor((from + to) / 2)];
  let worst = 0;
  for (let i = from; i < to; i++) worst = Math.max(worst, Math.hypot(off[i][0] - held[0], off[i][1] - held[1]));
  return { held, worst };
}

/* 2. THE PURPOSE */
const DIRS = { east: [1, 0], 'north-east': [Math.SQRT1_2, -Math.SQRT1_2], north: [0, -1] };
for (const [name, dir] of Object.entries(DIRS)) {
  const now = play({ on: true, dir, frames: RIDE });
  const a = spread(now.off);
  const moved = Math.hypot(now.px - 5000, now.py - 5000);
  check(`2: a ride ${name} from a stand (push, held, roll-off, stood; ${moved.toFixed(0)} game px): the bro within 2 device px of his held place every frame (worst ${(a.worst * DEV).toFixed(3)})`, a.worst <= TOL && moved > 400, { worst: a.worst * DEV, moved });
  check(`2: ...and that place is the screen's middle (${(Math.hypot(...a.held) * DEV).toFixed(3)} device px)`, Math.hypot(...a.held) <= TOL);
  const old = play({ on: false, dir, frames: RIDE });
  const b = spread(old.off);
  check(`2: the old chase (?camfollow=0) fails the same ride: the bro slides ${(b.worst * DEV).toFixed(1)} device px (at least 20)`, b.worst * DEV >= 20, { worst: b.worst * DEV });
}

/* 3. the jog and the ride: one place */
{
  const jog = play({ on: true, dir: [1, 0], frames: script(20, 100, 0, 20), board: false });
  const rd = play({ on: true, dir: [1, 0], frames: RIDE });
  const j = jog.off[110], r = rd.off[110];
  check(`3: the jog and the ride hold the same place (${(Math.abs(j[0] - r[0]) * DEV).toFixed(3)} device px apart; today 24)`, Math.hypot(j[0] - r[0], j[1] - r[1]) * DEV <= 0.01 && jog.px - 5000 > 200, { j, r });
  const jo = play({ on: false, dir: [1, 0], frames: script(20, 100, 0, 20), board: false }).off[110];
  const ro = play({ on: false, dir: [1, 0], frames: RIDE }).off[110];
  check(`3: ...where the old chase held them ${(Math.abs(jo[0] - ro[0]) * DEV).toFixed(1)} device px apart (at least 15)`, Math.abs(jo[0] - ro[0]) * DEV >= 15, { jo, ro });
}

/* 4. the phone's wobble */
{
  let s = 20261125 >>> 0;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const lens = Array.from({ length: 97 }, () => 10 + rnd() * 13);
  const w = play({ on: true, dir: [1, 0], frames: RIDE, lens });
  const a = spread(w.off);
  check(`4: frames 10 to 23 ms long: still within 2 device px every frame (worst ${(a.worst * DEV).toFixed(3)})`, a.worst <= TOL, a);
}

/* 5. not a walk's step */
{
  const one = (step, dt = 1) => {
    const S = { camera: { x: 0, y: 0 }, _dtScale: dt, _camFollow: { x: W / 2, y: H / 2 } };
    followCamera(S, W / 2 + step, H / 2, W, H, 0, 0, 0, true);
    return S;
  };
  /* stood (rate 8%): a followed step leaves no gap; a chased one closes 8% of it */
  const k1 = one(FOLLOW.BIG_STEP), k2 = one(FOLLOW.BIG_STEP + 0.01), k3 = one(200);
  check('5: a step of BIG_STEP (10 game px a 60th) is followed whole', Math.abs(k1.camera.x - 10) < 1e-9, k1.camera);
  check('5: ...a step past it is chased: 8% of it (stood)', Math.abs(k2.camera.x - 10.01 * 0.08) < 1e-9, k2.camera);
  check('5: ...a teleport of 200 is chased, not glued (16 of 200)', Math.abs(k3.camera.x - 16) < 1e-9, k3.camera);
  const d2 = one(19.5, 2);
  check('5: at twice the frame\'s length a step of 19.5 is followed (BIG_STEP a 60th)', Math.abs(d2.camera.x - 19.5) < 1e-9, d2.camera);
  check('5: the last place is kept for the next frame', k3._camFollow.x === W / 2 + 200 && k3._camFollow.y === H / 2, k3._camFollow);
  const sy = { camera: { x: 0, y: 0 }, _dtScale: 1, _camFollow: { x: W / 2, y: H / 2 } };
  followCamera(sy, W / 2 + 6, H / 2 + 8, W, H, 0, 0, 0, true);
  check('5: a step is followed on both axes (6, 8: 10 long)', Math.abs(sy.camera.x - 6) < 1e-9 && Math.abs(sy.camera.y - 8) < 1e-9, sy.camera);
  const sz = { camera: { x: 0, y: 0 }, _dtScale: 1, _camFollow: { x: W / 2, y: H / 2 } };
  followCamera(sz, W / 2 + 6, H / 2 + 8.01, W, H, 0, 0, 0, true);
  check('5: ...and a step just past 10 on both axes is chased', Math.abs(sz.camera.x - 6 * 0.08) < 1e-9 && Math.abs(sz.camera.y - 8.01 * 0.08) < 1e-9, sz.camera);
  const f0 = { camera: { x: 0, y: 0 } };
  followCamera(f0, W / 2 + 5, H / 2, W, H, 0, 0, 0, true);
  check('5: the first frame (no last place) follows nothing and keeps the place', Math.abs(f0.camera.x - 0.4) < 1e-9 && f0._camFollow && f0._camFollow.x === W / 2 + 5 && f0._camFollow.y === H / 2, f0);
  const f1 = { camera: { x: 0, y: 0 } };
  followCamera(f1, W / 2, H / 2, W, H, 0, 0, 0, false);
  check('5: the old chase keeps no last place', f1._camFollow === undefined, f1);
}

/* 6. the chase's rates and the middle */
{
  const gap = (S, dx = 0, dy = 0) => { S.camera = { x: 0, y: 0 }; followCamera(S, W / 2 + 100, H / 2 + 50, W, H, dx, dy, 0, true); return [S.camera.x, S.camera.y]; };
  const eq = (a, x, y) => Math.abs(a[0] - x) < 1e-9 && Math.abs(a[1] - y) < 1e-9;
  check('6: stood: 8% of the gap a 60th, to W/2, H/2 short of the bro', eq(gap({ _dtScale: 1 }), 8, 4));
  check('6: no frame length read as a 60th', eq(gap({}), 8, 4));
  check('6: moving (the stick past 0.5 across): 14%', eq(gap({ _dtScale: 1 }, 0.51, 0), 14, 7));
  check('6: moving (the stick past 0.5 down): 14%', eq(gap({ _dtScale: 1 }, 0, -0.51), 14, 7));
  check('6: moving (the stick past 0.5 to the left): 14%', eq(gap({ _dtScale: 1 }, -0.51, 0), 14, 7));
  check('6: the stick at 0.5 is stood: 8%', eq(gap({ _dtScale: 1 }, 0.5, 0.5), 8, 4));
  check('6: swinging: 18%', eq(gap({ _dtScale: 1, isSwinging: true }, 1, 0), 18, 9));
  check('6: a dodge roll: 18%', eq(gap({ _dtScale: 1, _dodgeRoll: {} }), 18, 9));
  const two = gap({ _dtScale: 2 });
  check('6: two 60ths close 1 - 0.92^2 of it (a power, not twice)', eq(two, 100 * (1 - 0.92 * 0.92), 50 * (1 - 0.92 * 0.92)), two);
}

/* 7. the punch */
{
  check('7: no punch: no kick', JSON.stringify(camPunch({}, 1000)) === '[0,0]');
  const at = (ms) => { const S = { _camPunch: { ts: 1000, dx: 40, dy: -20 } }; return [camPunch(S, 1000 + ms), S._camPunch]; };
  const [p0] = at(0), [p150, k150] = at(150), [p300, k300] = at(300);
  check('7: the kick whole at once', p0[0] === 40 && p0[1] === -20, p0);
  check('7: eased out: three quarters at 150 ms', Math.abs(p150[0] - 30) < 1e-9 && Math.abs(p150[1] + 15) < 1e-9 && k150 !== null, p150);
  check('7: spent at 300 ms: no kick, cleared', p300[0] === 0 && p300[1] === 0 && k300 === null, { p300, k300 });
  const S = { camera: { x: 0, y: 0 }, _dtScale: 1, _camPunch: { ts: 0, dx: 100, dy: 50 } };
  followCamera(S, W / 2, H / 2, W, H, 0, 0, 0, true);
  check('7: the kick is in the chase\'s aim (8% of it, stood)', Math.abs(S.camera.x - 8) < 1e-9 && Math.abs(S.camera.y - 4) < 1e-9, S.camera);
}

/* 8. the old lead */
{
  const lead = (dx, dy, on = false) => { const S = { camera: { x: 0, y: 0 }, _dtScale: 1 }; followCamera(S, W / 2, H / 2, W, H, dx, dy, 0, on); return [S.camera.x, S.camera.y]; };
  const a = lead(1, -1);
  check('8: ?camfollow=0: 30 game px ahead x the stick (14% of it)', Math.abs(a[0] - 4.2) < 1e-9 && Math.abs(a[1] + 4.2) < 1e-9, a);
  const b = lead(0.1, 0.1);
  check('8: ...no lead at a stick of 0.1', b[0] === 0 && b[1] === 0, b);
  const c = lead(0.2, -0.2);
  check('8: ...a lead at 0.2 (6 game px, 8% of it)', Math.abs(c[0] - 0.48) < 1e-9 && Math.abs(c[1] + 0.48) < 1e-9, c);
  const e = lead(0.105, 0);
  check('8: ...a lead just past 0.1 (3.15 game px, 8% of it)', Math.abs(e[0] - 0.252) < 1e-9 && e[1] === 0, e);
  const g = lead(-1, 0.05);
  check('8: ...each axis by its own stick: left 30, none down at 0.05', Math.abs(g[0] + 4.2) < 1e-9 && g[1] === 0, g);
  const h = lead(0.05, 1);
  check('8: ...none across at 0.05, down 30', h[0] === 0 && Math.abs(h[1] - 4.2) < 1e-9, h);
  const d = lead(1, -1, true);
  check('8: the follow: no lead along the way you go', d[0] === 0 && d[1] === 0, d);
}

/* 9. the call */
{
  const calls = findIn('ui', /\bfollowCamera\s*\(/);
  check('9: the game\'s loop calls followCamera once', calls.length === 1, calls.map((c) => c.file + ':' + c.line));
  check('9: ...with the switch `!sw(\'camfollow\')`', calls.length === 1 && /followCamera\(S, P\.x, P\.y, W, H, dx, dy, Date\.now\(\), !sw\('camfollow'\)(, menus3CamShift\(H\))?\)/.test(calls[0].text));   /* v2.3.6861: + the new panel's shift upright (card MN step 4; menus3-bag.test 6) */
  const left = findIn('ui', /\bvar (?:_camLead|_camSpeed|_camK|camTargetX|camTargetY|_camPunchX)\b/);
  check('9: the old lead and chase are gone from the loop', left.length === 0, left.map((c) => c.file + ':' + c.line));
  check('9: the switch has its row in the table', /name: '\?camfollow', side: 'page'[^\n]*born: 6660, thrown: '=0'/.test(read('tools/guards/lib/switches.mjs')));
  check('9: ...and its form in the page\'s reader', /'camfollow': '0',/.test(read('src/game/switches.js')));
}

console.log(failed ? `\n${failed} failed` : '\nall green');
process.exit(failed ? 1 : 0);
