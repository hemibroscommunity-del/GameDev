/* ═══ v2.3.6540: THE LEFT STICK'S THREE ZONES (card CT PR 1; src/game/stickZones.js) ═══
 *
 * The two buttons (`?manual=5`, a trial).  The owner, 2026-11-23: "The left
 * joystick rotates the character directionally if pressed at or below about
 * 30% from center and begin walking in the pointed direction if moved
 * further."  What it does, played on the module itself:
 *
 *   1. THE ZONES: a thumb at 20% of the disc's drawn radius turns and does
 *      not walk; at 40% walks; inside the dead zone nothing; at the rim full
 *      speed; the same shares upright (37.5 px) and sideways (45 px);
 *   2. A TURN FACES ONE OF THE EIGHT FACINGS drawn today;
 *   3. THE SWIPE IS JUDGED FIRST: a swipe is a roll in both zones and both
 *      orientations; a turn never starts a roll; a tap stays a tap;
 *   4. `?turnzone=<percent>` moves the border, held to 15..70;
 *   5. THE DOOR: stickTo writes the phase, refuses a word not of its list,
 *      and no write of S._stickPhase in src/ is outside it (the phase
 *      table's guard reads the same off the syntax tree, DOOR_SUITES);
 *   6. MODE 5: `?manual=5` chooses it and is remembered; it is not manual
 *      combat and keeps no tap lock; 4 stays the answer when nothing is chosen.
 *   7. v2.3.6541 (PR 2) THE STICK IN MODE 5, stickDrive: a thumb at 20% of
 *      the drawn radius turns the body to its facing and walks nothing; at
 *      40% walks, the knob drawn out to the drawn radius (never past it);
 *      a lifted thumb is rest; BroTown's handler makes the one call behind
 *      twoButtonsOn, and its release writes rest;
 *   7b. v2.3.6541 (sitting 57) the thumb's OWN angle sixteen ways round (the
 *      turn's facing, the walk's way, the knob and the rod), `?turnzone`
 *      read by stickDrive and the ring (a fresh copy of the module on a
 *      page with the switch), the handler's raw offset and the ring's gate
 *      (twoButtonsOn(), never in mode 4) off the syntax tree;
 *   9. v2.3.6542 (PR 3) THE STICK'S ONE WRITER: every mode's analog read and
 *      lift are stickZones.js's (moved whole from BroTown: the same values
 *      to the last bit), and nothing else in src/ writes S.stickX / stickY;
 *   8. v2.3.6541 THE FRAME'S STEP `input`, stickFrame (moved whole out of
 *      gameLoop): the stick read, the gates, the keys, the idle clock (a thumb
 *      held turning is a player), the name tag's facing; one object a page.
 *  10. v2.3.6545 (card CT item 6) SPRINT FROM THE RIM, played through
 *      stickDrive and sprint.js's own frame (updateSprint): at the rim (share
 *      1.0) full walking speed, no sprint, stamina still; past SPRINT_AT 1.25
 *      the sprint (the move's `sp`, stamina falling); between the two lines it
 *      holds (no flutter); back inside SPRINT_OFF 1.05, or the thumb lifted,
 *      it ends; at 0 stamina it ends and starts again only once the thumb
 *      came back; refused for stamina once a push (the button's words);
 *      never started with the shield up, dead, in the water or attacking;
 *      it stops only its own sprint (Shift's stays); `?rimsprint=0` and mode
 *      4 as today; BroTown hands the button's words to the one call.
 *      Plants, each red by what the code does (tried by hand, 2026-11-24):
 *      SPRINT_OFF = SPRINT_AT -> FAIL 10c (flutter); the rule fed the clamped
 *      share (Math.min(share, 1)) -> FAIL 10b, 10j; `rim.ready = false`
 *      dropped (a restart with the thumb still out) -> FAIL 10d, 10e; rimHeld
 *      dropped -> FAIL 10f; toggleSprint in place of startSprint -> FAIL 10c
 *      (the return inside leaves a 'tap' sprint running), 10g.
 *      Survivor, listed: stickLift's `if (S._rimSprint)` taken away -- the
 *      call runs on every lift and does nothing without a push (rimSprint
 *      makes no state below SPRINT_AT): the same behaviour, the guard only
 *      saves a call.
 *  12. v2.3.6647 (card PAD part 12, the owner's bug) A FULL PUSH SPRINTS,
 *      REACHABLE FROM ANYWHERE: the reach on the glass from every landing
 *      point of three phones every way, the card's landing points, a still
 *      thumb, a part push, a tremble at the edge, the walk and the knob at
 *      a short reach, out of energy with no flicker, the words once an
 *      emptying, the landing box, the two buttons, `?fullpush=0`.  10 and 11
 *      are now played under `?fullpush=0` (yesterday's rule, kept whole).
 *
 * Break proof, tried by hand: `S._stickPhase = 'walk';` added to
 * stickZones.js stickRead -> FAIL 5 (and the guard's §2); TURN: 0.30 -> 0.10
 * -> FAIL 1.
 * v2.3.6541, the gatekeeper's sitting 57 (each was green; each now red, tried
 * by hand): stickFrame stamping `_lastInputAt` on S.stickX only -> FAIL 8 (a
 * thumb walking straight up); `dy = S.stickY` unfrozen -> FAIL 8 twice;
 * `_playerDead` dropped from BroTown's call -> FAIL 8 (the call read off the
 * syntax tree); K['a'] walking right -> FAIL 8; the loot facing taken out ->
 * FAIL 8.  And the three it named that no check yet covered (each red, tried
 * by hand): the turn facing south whatever the thumb's angle, the walk on one
 * axis -> FAIL 7b; the knob drawn on x only -> FAIL 7 and 7b; BroTown
 * clamping rawDy before the call -> FAIL 7b (off the syntax tree);
 * stickDrive's border `STICK_ZONES.TURN` in place of turnShare() -> FAIL 7b
 * (`?turnzone=50`), the ring's the same -> FAIL 7b; the ring's gate `true`
 * or `manualMode() >= 4` (the ring in mode 4) -> FAIL 7b.
 * v2.3.6541, the gatekeeper's sitting 58 (each was green; each now red, tried
 * by hand): BroTown's `dx = _in.dx || S.stickX` (or dy's, or S.stickX/Y read
 * whole after the call, through a helper, S under another name, `S['stick' +
 * 'X']`, `{ stickY } = S`), `_in` written again or handed on, the call moved
 * out of the step -> FAIL 8 (the binding followed off the syntax tree, deny
 * by default, and every reader of the stick in src/ on a closed list); a
 * clock handed to stickFrame (`_perfNow`, `0`, even `Date.now()`) -> FAIL 8
 * (the clock is the module's own now); stickFrame stamping
 * `performance.now()` or 0 -> FAIL 8 (three minutes of walking played on the
 * idle judge's clock).
 * v2.3.6542, the gatekeeper's sitting 59 (both were green; both now red,
 * tried by hand): a later write after the start, `if (!dx && !dy) { var _h =
 * heldDirection(S); ... dx = _h[0]; ... }` and `if (!dy && K['w']) dy = -1;`
 * -> FAIL 8 (the walk's writes an ALLOW list, WALK_WRITES, followed by the
 * binding).  And eight not designed for, each red: `dx++` in a nested block,
 * a for-of head, a closure's write, `[dx, dy] = ...`, a second `var dx`, a
 * row spelled again, `dy *= 1.5`, `eval('dx = 1')`.  WALK_WRITES_PRINT=1
 * prints the writes as the guard reads them (to take a row out).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { STICK_ZONES, STICK_PHASES, stickRead, stickTravel, facing8, stickSwipe, stickTap, stickRelease, turnShare, stickPhase, stickTo, stickDrive, stickFrame, turnRingRadius, stickAnalog, stickLift, STICK_DEAD_PX } from '../../src/game/stickZones.js';
import { rimPast, rimSprintOn, rimSprintLive, rimSprinting, rimSprint } from '../../src/game/stickZones.js';   /* v2.3.6545: the rim's sprint (card CT item 6) */
import { fullPushOn, stickFrom, stickRoom, stickReach, bandPx } from '../../src/game/stickZones.js';   /* v2.3.6647: the full push, reachable from anywhere (card PAD part 12) */
import { updateSprint, isSprinting, sprintStepFlag, stopSprint, startSprint } from '../../src/game/sprint.js';   /* v2.3.6542: + the stick's one writer in every mode */
import { findIn, readSystem, systemNames } from '../../tools/guards/lib/filesOf.mjs';
import { babel } from '../../tools/guards/lib/renderTables.mjs';   /* v2.3.6541 (sitting 57's mend): the call read off the syntax tree */
import { manualMode, manualOn, tapLockOn, twoButtonsOn, setManualCombat, MANUAL } from '../../src/game/manualCombat.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const near = (a, b) => Math.abs(a - b) < 1e-9;

/* ── 1. the zones ── */
for (const [label, sideways] of [['upright', false], ['sideways', true]]) {
  const R = stickTravel(sideways);
  check('1. ' + label + ': the travel is the disc\'s drawn radius (' + R + ' px)', R === (sideways ? 45 : 37.5));
  const at = (share, ang = 0) => stickRead(Math.cos(ang) * share * R, Math.sin(ang) * share * R, R);
  const t20 = at(0.20);
  check('1. ' + label + ': a thumb at 20% turns and does not walk', t20.phase === 'turn' && t20.sx === 0 && t20.sy === 0, t20);
  const w40 = at(0.40);
  check('1. ' + label + ': a thumb at 40% walks that way', w40.phase === 'walk' && w40.sx > 0 && near(w40.sy, 0), w40);
  check('1. ' + label + ': at 5% nothing (the dead zone: a tap stays a tap)', at(0.05).phase === 'rest');
  check('1. ' + label + ': at 30% still a turn (the owner: "at or below about 30%")', at(0.30).phase === 'turn');
  const rim = at(1), past = at(1.6);
  check('1. ' + label + ': full speed at the rim, and no more past it', near(Math.hypot(rim.sx, rim.sy), 1) && near(Math.hypot(past.sx, past.sy), 1), [rim, past]);
  const w60 = at(0.60), w80 = at(0.80);
  check('1. ' + label + ': the speed rises toward the rim', w40.sx < w60.sx && w60.sx < w80.sx && w80.sx < rim.sx);
}
check('1. the table: a dead zone inside the turn, the turn inside the rim', STICK_ZONES.DEAD < STICK_ZONES.TURN && STICK_ZONES.TURN < 1 && STICK_ZONES.TURN === 0.30);

/* ── 2. the eight facings ── */
{
  const R = stickTravel(false);
  const deg = (d) => (d * Math.PI) / 180;
  const faceAt = (d) => stickRead(Math.cos(deg(d)) * 0.2 * R, Math.sin(deg(d)) * 0.2 * R, R).face;
  check('2. 10 degrees faces east (0)', near(faceAt(10), 0));
  check('2. 30 degrees faces south-east (PI/4)', near(faceAt(30), Math.PI / 4));
  check('2. 100 degrees faces south (PI/2)', near(faceAt(100), Math.PI / 2));
  check('2. -170 degrees faces west (-PI)', near(Math.abs(faceAt(-170)), Math.PI));
  const faces = new Set();
  for (let d = -180; d < 180; d += 5) faces.add(Math.round((faceAt(d) / (Math.PI / 4)) + 8) % 8);
  check('2. a thumb all the way round meets exactly eight facings', faces.size === STICK_ZONES.FACINGS, [...faces]);
  check('2. a walk faces as a turn does', near(stickRead(0.8 * R * Math.cos(deg(30)), 0.8 * R * Math.sin(deg(30)), R).face, facing8(deg(30))));
}

/* v2.3.6540 (the gatekeeper's sitting 56, B3, B5): the exact edges, on a travel of 1 */
check('1. exactly at the dead zone: rest; just past it: a turn', stickRead(STICK_ZONES.DEAD, 0, 1).phase === 'rest' && stickRead(STICK_ZONES.DEAD + 1e-6, 0, 1).phase === 'turn');
check('1. exactly at the border: a turn; just past it: a walk', stickRead(STICK_ZONES.TURN, 0, 1).phase === 'turn' && stickRead(STICK_ZONES.TURN + 1e-6, 0, 1).phase === 'walk');
check('2. west is one facing, +PI, from either side', facing8(Math.PI) === Math.PI && facing8(-Math.PI) === Math.PI && facing8(-Math.PI + 0.1) === Math.PI);
check('3. the swipe\'s edges, as handleCanvasSwipe\'s: 30 px is one, 29.9 is not',
  stickSwipe(30, 0, 30) != null && stickSwipe(29.9, 0, 30) == null);
check('3. ...300 ms is one, 301 is not; 0.8 px a ms is one, less is not',
  stickSwipe(240, 0, 300) != null && stickSwipe(241, 0, 301) == null && stickSwipe(239, 0, 300) == null);

/* ── 3. the swipe first ── */
{
  for (const sideways of [false, true]) {
    const R = stickTravel(sideways);
    /* a quick flick out from the centre: its path crosses the turn zone and ends walking */
    check('3. ' + (sideways ? 'sideways' : 'upright') + ': a quick 40 px flick is a roll (it crossed the turn zone)', stickRelease(40, 0, 40) === 'swipe' && stickRead(0.2 * R, 0, R).phase === 'turn');
    check('3. ' + (sideways ? 'sideways' : 'upright') + ': the same flick the other way rolls the other way', near(stickSwipe(-40, 0, 40), Math.PI));
  }
  /* today's rule times the gesture from the landing (BroTown lE: endT - lts.startAt), so a
     thumb that rested in the turn zone first is judged on the whole of it, as a resting thumb is today */
  check('3. judged by the gesture, from the landing: 60 px in 70 ms rolls; after 250 ms resting it does not', stickRelease(60, 0, 70) === 'swipe' && stickRelease(60, 0, 320) === 'none');
  check('3. a turn never starts a roll: 9 px held a second is no swipe', stickRelease(9, 0, 1000) === 'none' && stickSwipe(9, 0, 1000) === null);
  check('3. a turn never starts a roll: 9 px, quick, is a tap, not a swipe', stickRelease(9, 0, 120) === 'tap');
  check('3. a slow 40 px drag is a walk, not a roll', stickRelease(40, 0, 900) === 'none');
  check('3. a tap stays a tap: 3 px in 80 ms', stickTap(3, 0, 80) && stickRelease(3, 0, 80) === 'tap');
  check('3. today\'s numbers (BroTown handleCanvasSwipe 30 px, 0.8 px/ms, 300 ms; tap 10 px, 200 ms)',
    STICK_ZONES.SWIPE_PX === 30 && STICK_ZONES.SWIPE_SPEED === 0.8 && STICK_ZONES.SWIPE_MS === 300 && STICK_ZONES.TAP_PX === 10 && STICK_ZONES.TAP_MS === 200);
  check('3. ...and the screens\' code still says them (a change there is a change here)',
    findIn('ui', /if \(speed < 0\.8 \|\| dist < 30 \|\| duration > 300\) return;/).length === 1 && findIn('ui', /TAP_MAX_DURATION_MS = 200\b/).length === 1 && findIn('ui', /TAP_MAX_MOVE_SQ_PX = 100\b/).length === 1);
}

/* ── 4. ?turnzone ── */
{
  check('4. none: 30%', turnShare('') === 0.30 && turnShare('?x=1') === 0.30);
  check('4. ?turnzone=40: 40%', near(turnShare('?turnzone=40'), 0.40));
  check('4. held to 15..70', turnShare('?turnzone=5') === 0.15 && turnShare('?a=1&turnzone=99') === 0.70);
  const R = stickTravel(false);
  check('4. the border moves the zones: 35% turns at 40, walks at 30', stickRead(0.35 * R, 0, R, turnShare('?turnzone=40')).phase === 'turn' && stickRead(0.35 * R, 0, R, turnShare('')).phase === 'walk');
}

/* ── 5. the door ── */
/* ── the writers: every write of S.<prop> in src/ is in the door ── */
function writesOutside(prop, doorFile, doorFn) {
  const ROOT = new URL('../../', import.meta.url);
  const files = [];
  (function walk(rel) {
    for (const n of readdirSync(new URL(rel, ROOT))) {
      const r = rel + n;
      if (statSync(new URL(r, ROOT)).isDirectory()) { if (n !== 'vendor' && n !== 'node_modules') walk(r + '/'); }
      else if (/\.(js|mjs|jsx)$/.test(n)) files.push(r);
    }
  })('src/');
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
  const WRITE = new RegExp('(?:\\.' + prop + '|\\[\\s*[\'"`]' + prop + '[\'"`]\\s*\\])\\s*(?:\\?\\?|\\|\\||&&|\\*\\*|[-+*/%])?=(?!=)|delete\\s+[\\w$.]+\\.' + prop + '\\b|Object\\.assign\\(\\s*[\\w$.]+\\s*,[^)]*\\{[^}]*\\b' + prop + '\\s*:');
  const outside = [];
  let inDoorWrites = 0;
  for (const f of files) {
    const raw = readFileSync(new URL(f, ROOT), 'utf8');
    if (!raw.includes(prop)) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === doorFile) {
        if (new RegExp('^export function ' + doorFn + '\\(').test(l)) inDoor = true;
        else if (inDoor && /^\}\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { inDoorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  return { outside, inDoorWrites };
}
{
  const S = {};
  check('5. nothing written: rest', stickPhase(S) === 'rest' && STICK_PHASES.join() === 'rest,turn,walk');
  check('5. stickTo writes a phase of its list, once', stickTo(S, 'turn') === true && S._stickPhase === 'turn' && stickTo(S, 'turn') === false);
  check('5. ...and refuses another word', stickTo(S, 'run') === false && S._stickPhase === 'turn');
  check('5. stickRead writes nothing', (stickRead(10, 0, 37.5), S._stickPhase === 'turn') && !('_stickPhase' in (() => { const T = {}; stickRead(10, 0, 37.5); return T; })()));
  const w = writesOutside('_stickPhase', 'src/game/stickZones.js', 'stickTo');
  check('5. stickTo writes the phase', w.inDoorWrites === 1, w.inDoorWrites);
  check('5. no write of S._stickPhase in src/ outside stickTo', w.outside.length === 0, w.outside);
}

/* ── 6. mode 5 ── */
{
  const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m }; };
  const ls = mem();
  check('6. ?manual=5 chooses the two buttons, and is remembered', manualMode('?manual=5', ls) === 5 && ls.getItem(MANUAL.KEY) === '5' && manualMode('', ls) === 5);
  check('6. ?manual=4 comes back to the held combat and forgets', manualMode('?manual=4', ls) === 4 && ls.getItem(MANUAL.KEY) === null && manualMode('', ls) === 4);
  check('6. nothing chosen: 4 (the game\'s own, untouched)', manualMode('', mem()) === 4);
  setManualCombat(5);
  check('6. mode 5: the two buttons on, not manual, no tap lock', twoButtonsOn() === true && manualOn() === false && tapLockOn() === false);
  setManualCombat(4);
  check('6. mode 4: the two buttons off', twoButtonsOn() === false && manualOn() === false && tapLockOn() === false);
  setManualCombat(0);
  check('6. mode 0: off, with its tap lock', twoButtonsOn() === false && tapLockOn() === true);
}

/* ── 7. the stick in mode 5 (stickDrive) ── */
{
  const el = () => ({ style: {} });
  for (const [label, R] of [['upright', 37.5], ['sideways', 45]]) {
    const S = { _facingAngle: 0 }, knob = el(), rod = el();
    let r = stickDrive(S, 0, 0.2 * R, R, knob, rod, '0.92');   /* 20% straight down */
    check('7. ' + label + ': 20% turns the body to its facing (south) and walks nothing',
      r.phase === 'turn' && S._stickPhase === 'turn' && S.stickX === 0 && S.stickY === 0 && near(S._targetFacingAngle, Math.PI / 2), { r, S });
    check('7. ' + label + ': the knob and the rod drawn to the thumb', /calc\(-50% \+ [0-9.e-]+px\), calc\(-50% \+ 7\.5|calc\(-50% \+ 9px/.test(knob.style.transform) && rod.style.opacity === '0.92', knob.style.transform);
    const S2 = {};
    r = stickDrive(S2, -0.4 * R, 0, R, knob, rod, '0.92');   /* 40% left */
    check('7. ' + label + ': 40% walks that way, slowly near the border, and leaves the facing to the walk',
      r.phase === 'walk' && S2._stickPhase === 'walk' && S2.stickX < 0 && S2.stickX > -0.3 && S2.stickY === 0 && S2._targetFacingAngle === undefined, S2);
    r = stickDrive(S2, 3 * R, 0, R, knob, rod, '0.92');
    check('7. ' + label + ': past the rim, full speed, the knob held at the drawn radius', near(S2.stickX, 1) && knob.style.transform.indexOf('calc(-50% + ' + R + 'px)') >= 0 && rod.style.width === R + 'px', knob.style.transform);
    r = stickDrive(S2, 0.05 * R, 0, R, knob, rod, '0.92');
    check('7. ' + label + ': back in the dead zone, rest: no walk, the rod hidden', r.phase === 'rest' && S2._stickPhase === 'rest' && S2.stickX === 0 && rod.style.opacity === '0');
  }
  const S = {};
  stickDrive(S, 30, 0, 37.5, null, null);
  check('7. no disc (node): the walk and the phase all the same', S._stickPhase === 'walk' && S.stickX > 0);
  /* read by system (tools/guards/lib/filesOf.mjs), never a big file by its path */
  check('7. the stick handler makes the one call, behind the one gate (twoButtonsLive, v2.3.6542), and returns', findIn('ui', /stickDrive\(/).length === 1
    && findIn('ui', /if \(twoButtonsLive\(\)\) \{ stickDrive\(stateRef\.current, rawDx, rawDy, [^;]*\); return; \}/).length === 1);
  check('7. ...and its release writes rest (v2.3.6542: through stickLift, 9 below)', findIn('ui', /\bstickLift\(S\);/).length === 1);
}

/* ── 7b. v2.3.6541, the gatekeeper's sitting 57 (three plants that stayed
   green): the thumb's own angle, `?turnzone`, and the ring only in mode 5 ── */
{
  const el = () => ({ style: {} });
  const STEP = Math.PI / 4;
  const snap = (a) => { let f = Math.round(a / STEP) * STEP; if (f <= -Math.PI + 1e-9) f = Math.PI; return f; };
  /* the thumb's own angle: sixteen ways round, a turn faces the nearest of the
     eight facings, a walk goes the thumb's way, the knob is drawn where the
     thumb is (a facing, a walk or a knob that ignores the angle is red) */
  const bad = [];
  for (const R of [37.5, 45]) {
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI + (i + 0.5) * (Math.PI / 8);
      const S = {}, knob = el(), rod = el();
      stickDrive(S, Math.cos(a) * 0.2 * R, Math.sin(a) * 0.2 * R, R, knob, rod, '0.9');
      if (S._stickPhase !== 'turn' || !near(S._targetFacingAngle, snap(a)) || S.stickX !== 0 || S.stickY !== 0) bad.push(['turn', R, i, S._targetFacingAngle]);
      const m = /translate\(calc\(-50% \+ (-?[0-9.e-]+)px\), calc\(-50% \+ (-?[0-9.e-]+)px\)\)/.exec(knob.style.transform || '');
      if (!m || Math.abs(+m[1] - Math.cos(a) * 0.2 * R) > 1e-6 || Math.abs(+m[2] - Math.sin(a) * 0.2 * R) > 1e-6) bad.push(['knob', R, i, knob.style.transform]);
      if (!near(parseFloat(rod.style.transform.slice(7)), a)) bad.push(['rod', R, i, rod.style.transform]);
      const W = {};
      stickDrive(W, Math.cos(a) * 0.7 * R, Math.sin(a) * 0.7 * R, R, null, null);
      if (W._stickPhase !== 'walk' || !near(Math.atan2(W.stickY, W.stickX), a) || W._targetFacingAngle !== undefined) bad.push(['walk', R, i, W.stickX, W.stickY]);
    }
  }
  check('7b. sixteen ways round: a turn faces the thumb\'s nearest facing, a walk goes the thumb\'s way, the knob and the rod drawn at its angle', bad.length === 0, bad.slice(0, 4));
  /* `?turnzone=50`: the page's border, read by stickDrive and by the ring (a
     fresh copy of the module, so its once-read border is this page's) */
  const hadLoc = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', { value: { search: '?turnzone=50' }, configurable: true, writable: true });
  try {
    const Z = await import('../../src/game/stickZones.js?turnzone=50');
    const at = (share) => { const T = {}; Z.stickDrive(T, share * 37.5, 0, 37.5, null, null); return T; };
    const t40 = at(0.40), t45 = at(0.45), w55 = at(0.55);
    check('7b. ?turnzone=50: a thumb at 40% and 45% TURNS (the border moved out), at 55% walks', t40._stickPhase === 'turn' && t40.stickX === 0 && t45._stickPhase === 'turn' && w55._stickPhase === 'walk' && w55.stickX > 0, [t40, t45, w55]);
    check('7b. ?turnzone=50: the ring drawn at half the drawn radius (18.8 px upright, 22.5 sideways)', Z.turnRingRadius(false) === 18.8 && Z.turnRingRadius(true) === 22.5, [Z.turnRingRadius(false), Z.turnRingRadius(true)]);
  } finally {
    if (hadLoc) Object.defineProperty(globalThis, 'location', hadLoc); else delete globalThis.location;
  }
  check('7b. no address: the ring at 30% (11.3 px upright, 13.5 sideways)', turnRingRadius(false) === 11.3 && turnRingRadius(true) === 13.5, [turnRingRadius(false), turnRingRadius(true)]);
  /* v2.3.6641 (card PAD part 4): the controller's base is drawn at its well's size; the ring follows the drawn radius it is handed */
  check('7b. a drawn radius handed (the controller, 41.5 px): the ring at 30% of it both ways up (12.5 px); 0 or none: today\'s radius',
    turnRingRadius(false, 41.5) === 12.5 && turnRingRadius(true, 41.5) === 12.5 && turnRingRadius(true, 0) === 13.5 && turnRingRadius(false, -3) === 11.3,
    [turnRingRadius(false, 41.5), turnRingRadius(true, 41.5), turnRingRadius(true, 0), turnRingRadius(false, -3)]);
  /* read off the syntax tree: the handler hands stickDrive the thumb's RAW
     offset from where it landed (never a clamped or a one-way copy), and the
     disc draws the ring only when twoButtonsOn() (never in mode 4), at
     turnRingRadius */
  const { parse, traverse } = babel();
  const drives = [], rings = [];
  const isSub = (e, l, r) => e && e.type === 'BinaryExpression' && e.operator === '-' && e.left.type === 'Identifier' && e.left.name === l && e.right.type === 'Identifier' && e.right.name === r;
  for (const [file, src] of readSystem('ui', { only: /\.jsx?$/ })) {
    if (!src.includes('stickDrive(') && !src.includes('data-turnring')) continue;
    const ast = parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
    traverse(ast, {
      CallExpression(path) {
        const n = path.node;
        if (n.callee.type !== 'Identifier' || n.callee.name !== 'stickDrive') return;
        const arg = (k, l, r) => {
          const a = n.arguments[k];
          if (!a || a.type !== 'Identifier') return false;
          const b = path.scope.getBinding(a.name);
          return !!b && b.constantViolations.length === 0 && b.path.node.type === 'VariableDeclarator' && isSub(b.path.node.init, l, r);
        };
        drives.push({ file, raw: arg(1, 'clientX', 'bcx') && arg(2, 'clientY', 'bcy') });
      },
      ObjectProperty(path) {
        const k = path.node.key;
        if (!((k.type === 'StringLiteral' && k.value === 'data-turnring'))) return;
        const call = path.findParent((p) => p.isCallExpression());
        const cond = call && call.parentPath && call.parentPath.isConditionalExpression() && call.parentPath.node.consequent === call.node ? call.parentPath.node : null;
        const gate = !!cond && cond.test.type === 'CallExpression' && cond.test.callee.type === 'Identifier' && cond.test.callee.name === 'twoButtonsLive' && cond.test.arguments.length === 0;
        let sized = 0;
        call.traverse({ CallExpression(q) { if (q.node.callee.type === 'Identifier' && q.node.callee.name === 'turnRingRadius') sized++; } });
        rings.push({ file, gate, sized });
      },
    });
  }
  check('7b. the stick handler hands stickDrive the thumb\'s raw offset (clientX - bcx, clientY - bcy, never written again)', drives.length === 1 && drives[0].raw === true, drives);
  check('7b. the disc draws the turn ring only when twoButtonsLive() (the one gate, v2.3.6542; never in mode 4), sized by turnRingRadius', rings.length === 1 && rings[0].gate === true && rings[0].sized === 2, rings);
  setManualCombat(4);
  check('7b. ...and twoButtonsOn() is false in mode 4', twoButtonsOn() === false);
  setManualCombat(5);
  check('7b. ...true in mode 5', twoButtonsOn() === true);
  setManualCombat(4);
}

/* ── 8. the frame's step `input` (stickFrame) ── */
{
  const mk = (sx, sy) => ({ stickX: sx, stickY: sy, player: { dir: 'down' } });
  /* v2.3.6541 (sitting 58): stickFrame reads the idle judge's own clock
     (Date.now()); a frame here is played at a stated time on that clock */
  const frame = (T, K, frozen, loot, now) => { const d = Date.now; Date.now = () => now; try { return stickFrame(T, K, frozen, loot); } finally { Date.now = d; } };
  let S = mk(0.5, 0);
  let o = frame(S, {}, false, false, 1000);
  check('8. the stick walks, the idle clock stamped, the name tag faces the walk', o.dx === 0.5 && o.dy === 0 && S._lastInputAt === 1000 && S.player.dir === 'right');
  S = mk(0.5, 0);
  o = frame(S, { w: true }, true, false, 1000);
  check('8. a real stun (or death) stops it, the keys too', o.dx === 0 && o.dy === 0 && S.player.dir === 'down');
  S = mk(0, 0);
  o = frame(S, { ArrowUp: true, d: true }, false, false, 1000);
  check('8. no stick: the keys move, a diagonal normalized, the idle clock left to the keys', near(o.dx, Math.SQRT1_2) && near(o.dy, -Math.SQRT1_2) && S._lastInputAt === undefined && S.player.dir === 'up');
  S = mk(0.9, 0);
  o = frame(S, {}, true, true, 1000);
  check('8. the loot freeze: the name tag faces the camera', o.dx === 0 && S.player.dir === 'down');
  S = mk(0, 0); S._stickPhase = 'turn';
  frame(S, {}, false, false, 2000);
  check('8. a thumb held TURNING in mode 5 is a player (the idle clock)', S._lastInputAt === 2000);
  check('8. one object a page (a frame makes no garbage)', frame(mk(0, 0), {}, false, false, 0) === frame(mk(0, 0), {}, false, false, 0));
  /* v2.3.6541, the gatekeeper's sitting 57 (each of its plants went green
     here): the stick's Y the same as its X, the freeze on both, the keys
     each their way, and BroTown's call read off the syntax tree */
  S = mk(0, -0.8);
  o = frame(S, {}, false, false, 3000);
  check('8. a thumb walking straight up: the walk, the idle clock stamped (the 3034 incident: never idled out), the tag faces up', o.dx === 0 && o.dy === -0.8 && S._lastInputAt === 3000 && S.player.dir === 'up');
  S = mk(0.3, 0.7);
  o = frame(S, {}, true, false, 1000);
  check('8. a real stun (or death) freezes BOTH ways of the stick (a stunned body never walks on Y)', o.dx === 0 && o.dy === 0);
  S = mk(0, 0.9); S.player.dir = 'up';
  o = frame(S, {}, true, true, 1000);
  check('8. the loot freeze holds the Y walk too, and the tag faces the camera', o.dx === 0 && o.dy === 0 && S.player.dir === 'down');
  const keyWay = (k) => { const T = mk(0, 0); const r = frame(T, { [k]: true }, false, false, 1); return [r.dx, r.dy, T.player.dir]; };
  check('8. each key its own way: a/A/ArrowLeft west, d/D/ArrowRight east, w/W/ArrowUp north, s/S/ArrowDown south',
    ['a', 'A', 'ArrowLeft'].every((k) => JSON.stringify(keyWay(k)) === '[-1,0,"left"]') && ['d', 'D', 'ArrowRight'].every((k) => JSON.stringify(keyWay(k)) === '[1,0,"right"]')
    && ['w', 'W', 'ArrowUp'].every((k) => JSON.stringify(keyWay(k)) === '[0,-1,"up"]') && ['s', 'S', 'ArrowDown'].every((k) => JSON.stringify(keyWay(k)) === '[0,1,"down"]'));
  /* v2.3.6541 (the gatekeeper's sitting 58): the 3034 incident played, not
     spelled: a thumb held walking for three minutes, judged each second the
     way the page judges idleness (`Date.now() - (S._lastInputAt ||
     Date.now()) > IDLE_LOGOUT_MS`, 120000), is never idled out, and each
     frame's stamp is the judge's own clock */
  {
    const T = mk(0, -0.8);
    let idled = 0, offClock = 0;
    for (let now = 1e12; now <= 1e12 + 180000; now += 1000) {
      frame(T, {}, false, false, now);
      if (T._lastInputAt !== now) offClock++;
      if (now - (T._lastInputAt || now) > 120000) idled++;
    }
    check('8. three minutes of a walking thumb on the idle judge\'s clock: never idled out, every stamp on that clock', idled === 0 && offClock === 0, { idled, offClock });
  }
  {
    /* The call and the walk, read off the syntax tree by what binds to what
       (v2.3.6541, sitting 58: §8 was a text pattern, and `dx = _in.dx ||
       S.stickX` walked a corpse past it).  Deny by default: a form the guard
       cannot follow fails.
         - one stickFrame call in the UI, its freeze a real stun OR death OR
           the loot freeze, its loot argument the loot freeze, and exactly
           four arguments (the clock is the module's own: a fifth is a clock
           handed in);
         - its result bound once (`var _in = stickFrame(...)`, never written
           again), and read only as `_in.dx` and `_in.dy`, each once, each
           the WHOLE start of its own walk variable (`dx`, `dy`);
         - between `_steps.to(0, 2)` and `_steps.to(2, 0)`, the step `input`;
         - in the function that calls it (gameLoop) nothing reads S.stickX or
           S.stickY in any spelling, and nothing hides S from the guard (a
           computed key on S, S under another name, S spread, destructured
           with a rest, or handed to Object.*);
         - and every reader of stickX / stickY in src/ is one of a closed list
           (file, owner): a helper that reads the stick for gameLoop is a new
           row, and fails. */
    const { parse, traverse } = babel();
    const calls = [];
    const KEY = (m) => (m.computed ? (m.property.type === 'StringLiteral' ? m.property.value : m.property.type === 'TemplateLiteral' && !m.property.expressions.length ? m.property.quasis[0].value.cooked : null) : m.property.name);
    const isS = (n) => n && n.type === 'Identifier' && n.name === 'S';
    const ownerOf = (p) => {
      const names = [];
      for (let f = p.getFunctionParent(); f && names.length < 2; f = f.parentPath && f.parentPath.getFunctionParent()) {
        const n = f.node, up = f.parentPath && f.parentPath.node;
        const nm = (n.id && n.id.name) || (up && up.type === 'VariableDeclarator' && up.id.name) || (up && (up.type === 'ObjectProperty' || up.type === 'ObjectMethod' || up.type === 'ClassMethod') && up.key && up.key.name)
          || (n.key && n.key.name) || (up && up.type === 'JSXExpressionContainer' && f.parentPath.parentPath.node.name && f.parentPath.parentPath.node.name.name)
          || (up && up.type === 'AssignmentExpression' && up.left.type === 'MemberExpression' && KEY(up.left));
        if (nm) names.unshift(nm);
      }
      return names.join('>') || '<top>';
    };
    const readers = new Map();
    const files = [];
    const _seen = new Set();   /* every system's files under src/ (tests-by-system: no path named) */
    for (const sys of systemNames()) {
      for (const [file, src] of readSystem(sys, { only: /\.jsx?$/ })) {
        if (_seen.has(file) || !/^src\//.test(file.replace(/^\.\//, ''))) continue;
        _seen.add(file);
        if (/stick[XY]/.test(src) || src.includes('stickFrame(')) files.push([file, src]);
      }
    }
    const bad = [];
    for (const [file, src] of files) {
      const ast = parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
      const base = file.split('/').pop();
      traverse(ast, {
        MemberExpression(path) {
          const k = KEY(path.node);
          if (k !== 'stickX' && k !== 'stickY') return;
          const p = path.parentPath;
          if (p.isAssignmentExpression() && p.node.left === path.node && p.node.operator === '=') return;   /* a write: the stick's owner, not a read */
          const id = base + ' ' + ownerOf(path);
          readers.set(id, (readers.get(id) || 0) + 1);
        },
        ObjectProperty(path) {
          if (!path.parentPath.isObjectPattern()) return;
          const k = path.node.computed ? null : path.node.key.name || path.node.key.value;
          if (k === 'stickX' || k === 'stickY') { const id = base + ' ' + ownerOf(path); readers.set(id, (readers.get(id) || 0) + 1); }
        },
        CallExpression(path) {
          const n = path.node;
          if (n.callee.type !== 'Identifier' || n.callee.name !== 'stickFrame') return;
          const names = (e) => { const out = []; (function walk(x) { if (!x) return; if (x.type === 'Identifier') out.push(x.name); else if (x.type === 'LogicalExpression' && x.operator === '||') { walk(x.left); walk(x.right); } else out.push('?' + x.type); })(e); return out.sort(); };
          calls.push({ file, src, path, frozen: names(n.arguments[2]), loot: names(n.arguments[3]), args: n.arguments.length });
        },
      });
    }
    check('8. BroTown calls stickFrame once, frozen by a real stun OR death OR the loot freeze, four arguments (no clock handed in; read off the syntax tree)', calls.length === 1
      && JSON.stringify(calls[0].frozen) === JSON.stringify(['_playerDead', '_playerLootFrozen', '_realStunned']) && JSON.stringify(calls[0].loot) === '["_playerLootFrozen"]' && calls[0].args === 4, calls.map((c) => ({ ...c, path: undefined, src: undefined })));
    const call = calls[0] && calls[0].path;
    /* the binding: `var _in = stickFrame(...)`, read only as _in.dx / _in.dy, each the whole start of dx / dy */
    let bind = 'no call';
    let fnPath = null;
    if (call) {
      fnPath = call.getFunctionParent();
      const decl = call.parentPath;
      if (!decl.isVariableDeclarator() || decl.node.init !== call.node || decl.node.id.type !== 'Identifier') bind = 'the call is not the whole start of one name';
      else {
        const b = decl.scope.getBinding(decl.node.id.name);
        const seen = { dx: 0, dy: 0 };
        bind = '';
        if (!b || b.constantViolations.length) bind = 'its name is written again';
        else for (const r of b.referencePaths) {
          const m = r.parentPath;
          const k = m.isMemberExpression() && m.node.object === r.node ? KEY(m.node) : null;
          const d = m.parentPath;
          if ((k === 'dx' || k === 'dy') && d.isVariableDeclarator() && d.node.init === m.node && d.node.id.type === 'Identifier' && d.node.id.name === k) seen[k]++;
          else { bind = 'read as ' + (r.parentPath.getSource() || r.parentPath.type).slice(0, 60) + ' (line ' + (r.node.loc && r.node.loc.start.line) + ')'; break; }
        }
        if (!bind && (seen.dx !== 1 || seen.dy !== 1)) bind = 'dx/dy started ' + JSON.stringify(seen);
      }
    }
    check('8. the walk is read only through the call: `_in` bound once, read only as `_in.dx` and `_in.dy`, each the whole start of dx and dy (off the syntax tree)', bind === '', bind);
    /* the step `input`: the declaration right after _steps.to(0, 2), before its _steps.to(2, 0), in one block */
    let step = false;
    if (call) {
      const st = call.parentPath.parentPath;   /* the VariableDeclaration */
      const sib = (off) => { const c = st.container; const i = st.key + off; return Array.isArray(c) && c[i] ? c[i] : null; };
      const toCall = (n, a, b) => !!n && n.type === 'IfStatement' && n.consequent.type === 'ExpressionStatement' && n.consequent.expression.type === 'CallExpression'
        && n.consequent.expression.callee.type === 'MemberExpression' && n.consequent.expression.callee.object.name === '_steps' && KEY(n.consequent.expression.callee) === 'to'
        && n.consequent.expression.arguments.map((x) => x.value).join() === a + ',' + b;
      /* v2.3.6542 (PR 3): the step holds the latch's read too, so the close is
         the first `_steps.to` after the call, and it must be (2, 0) */
      let close = null;
      for (let i = 1; sib(i); i++) { const n = sib(i); if (n.type === 'IfStatement' && n.consequent.type === 'ExpressionStatement' && n.consequent.expression.type === 'CallExpression' && n.consequent.expression.callee.type === 'MemberExpression' && n.consequent.expression.callee.object.name === '_steps') { close = n; break; } }
      step = st.isVariableDeclaration() && st.node.declarations.length === 1 && toCall(sib(-1), 0, 2) && toCall(close, 2, 0);
    }
    check('8. the call is the step `input`: between `_steps.to(0, 2)` and `_steps.to(2, 0)` (off the syntax tree)', step);
    /* v2.3.6542 (the gatekeeper's sitting 59): an ALLOW list of the walk's
       writes.  The binding check above sees only how dx and dy START; a later
       write (`if (!dy && K['w']) dy = -1;`, a held way from a helper) walked
       past it.  So every write of the walk's two names in the calling
       function, followed off the syntax tree by their BINDING (babel's scope:
       a plain or compound assignment, ++/--, a destructure, a for-of/in head,
       a write inside a nested block or a closure, a second `var`), must be a
       row of WALK_WRITES: its statement's words, under the `if` that holds it,
       counted.  The start is the one declaration; each row comes after it.  A
       new form, a row spelled again, a row moved under another `if`, or a
       form the guard cannot follow (`eval`, `with`, `new Function`) is RED.
       The rows are the loop's later steps that own the walk today (the
       river's feel, the wobble, the glide, the jump's carry, the climb's
       slope); the list only falls (a row a step stops writing comes out). */
    const WALK_WRITES = {   /* 'the write @ the test of the if that holds it' : how many */
      'dx = _rFeel[1] @ _rFeel': 1, 'dy = _rFeel[2] @ _rFeel': 1,   /* the river's feel */
      'dx = _wbX @ _wbA': 1, 'dy = dx * _wbS + dy * _wbC @ _wbA': 1,   /* the wobble */
      'dx = _gl[0] @ S._wheelSwim && S._wheelSwim.on': 1, 'dy = _gl[1] @ S._wheelSwim && S._wheelSwim.on': 1,   /* the swim's glide */
      'dx = S._jump.dx || 0 @ _inAir && S._jump && !_realStunned && !_playerLootFrozen && Math.abs(dx) < 0.1 &': 1,   /* the jump's carry */
      'dy = S._jump.dy || 0 @ _inAir && S._jump && !_realStunned && !_playerLootFrozen && Math.abs(dx) < 0.1 &': 1,
      "dx = _clS[0] @ S.currentZone === 'wheel'": 1, "dy = _clS[1] @ S.currentZone === 'wheel'": 1,   /* the climb's slope */
    };
    const writes = {}, outOfOrder = [], unfollowed = [];
    let starts = 0;
    if (fnPath && call) {
      const text = calls[0].src;   /* babel's getSource() needs the file on the hub: read the words off the source */
      const words = (p) => text.slice(p.node.start, p.node.end).replace(/\s+/g, ' ').slice(0, 80);
      const underIf = (p) => { const i = p.findParent((q) => q.isIfStatement() || q === fnPath); return i && i !== fnPath ? words(i.get('test')) : ''; };
      const startAt = call.parentPath.node.start;
      for (const nm of ['dx', 'dy']) {
        const b = call.scope.getBinding(nm);
        if (!b || b.scope !== fnPath.scope) { unfollowed.push(nm + ' is not the calling function\'s own name'); continue; }
        if (b.path.isVariableDeclarator() && b.path.node.init && words(b.path.get('init')) === '_in.' + nm) starts++;
        for (const v of b.constantViolations) {
          if (v.isVariableDeclarator()) { unfollowed.push('a second `var ' + nm + '` (line ' + v.node.loc.start.line + ')'); continue; }
          const st = v.isAssignmentExpression() && v.node.operator === '=' && v.get('left').isIdentifier() ? v : null;
          const key = st ? words(st) + ' @ ' + underIf(st) : '~' + words(v);
          writes[key] = (writes[key] || 0) + 1;
          if (v.node.start < startAt) outOfOrder.push(key);
          if (!st) unfollowed.push(nm + ': ' + words(v) + ' (line ' + v.node.loc.start.line + ')');
        }
      }
      fnPath.traverse({
        WithStatement(p) { unfollowed.push('with (line ' + p.node.loc.start.line + ')'); },
        CallExpression(p) { if (p.get('callee').isIdentifier({ name: 'eval' })) unfollowed.push('eval (line ' + p.node.loc.start.line + ')'); },
        NewExpression(p) { if (p.get('callee').isIdentifier({ name: 'Function' })) unfollowed.push('new Function (line ' + p.node.loc.start.line + ')'); },
      });
    }
    const extra = Object.keys(writes).filter((k) => writes[k] > (WALK_WRITES[k] || 0)).map((k) => k + ' x' + writes[k]);
    if (process.env.WALK_WRITES_PRINT) console.log(JSON.stringify(writes, null, 1));
    check('8. every write of dx and dy in the calling function is a row of the allow list, after the one start, counted (deny by default; off the syntax tree)', !!fnPath && starts === 2 && extra.length === 0 && outOfOrder.length === 0 && unfollowed.length === 0, { starts, extra, outOfOrder, unfollowed });
    const gone = Object.keys(WALK_WRITES).filter((k) => (writes[k] || 0) < WALK_WRITES[k]);
    check('8. the allow list only falls: a row the loop no longer writes comes out of WALK_WRITES', gone.length === 0, gone);
    /* in the calling function: no read of the stick, and nothing the guard cannot follow */
    const hidden = [];
    if (fnPath) fnPath.traverse({
      MemberExpression(m) {
        const k = KEY(m.node);
        if (k === 'stickX' || k === 'stickY') hidden.push('reads .' + k + ' (line ' + m.node.loc.start.line + ')');
        else if (isS(m.node.object) && m.node.computed && k === null && m.node.property.type !== 'NumericLiteral') hidden.push('S[' + m.get('property').getSource().slice(0, 30) + '] (line ' + m.node.loc.start.line + ')');
      },
      VariableDeclarator(d) {
        if (isS(d.node.init)) hidden.push((d.node.id.type === 'ObjectPattern' ? 'S destructured' : 'S named again') + ' (line ' + d.node.loc.start.line + ')');
      },
      AssignmentExpression(a) { if (isS(a.node.right)) hidden.push('S named again (line ' + a.node.loc.start.line + ')'); },
      SpreadElement(s) { if (isS(s.node.argument)) hidden.push('S spread (line ' + s.node.loc.start.line + ')'); },
      CallExpression(c) { const cl = c.node.callee; if (cl.type === 'MemberExpression' && cl.object.type === 'Identifier' && (cl.object.name === 'Object' || cl.object.name === 'Reflect') && c.node.arguments.some(isS)) hidden.push(cl.object.name + '.' + KEY(cl) + '(S) (line ' + c.node.loc.start.line + ')'); },
    });
    check('8. the function that calls it (gameLoop) reads no S.stickX / S.stickY in any spelling, and hides S from nothing (deny by default)', !!fnPath && hidden.length === 0, hidden.slice(0, 8));
    /* every reader of the stick in src/, by file and owner: a closed list */
    const WANT = [
      'BroTown.jsx BroTown>onClick',       /* the Test panel's read-out */
      'climbActions.js climbTick',         /* the climb's held way */
      'entityRenderer.js ' + 'READER_ER',  /* filled below */
      'jumpActions.js heldDirection',      /* the jump's held way */
      'perfHud.js sampleStick',            /* the speed HUD */
      'stickZones.js stickFrame',          /* the walk (this step) */
    ];
    const got = [...readers.keys()].sort();
    const er = got.find((g) => g.startsWith('entityRenderer.js '));
    const want = WANT.map((w) => (w.endsWith('READER_ER') ? (er || 'entityRenderer.js ?') : w)).sort();
    check('8. every reader of S.stickX / S.stickY in src/ is on the closed list (a helper that reads the stick for the loop fails)', JSON.stringify(got) === JSON.stringify(want), { got, want });
  }
}

/* ── 9. v2.3.6542: the stick's ONE writer in every mode (the orchestrator: card WL's owned state) ──
   BroTown's analog read and lift moved whole into stickZones.js: the
   DEFAULT controls (every mode but 5) write the same values.  The old lines,
   copied here verbatim, against the call, across the thumb's reach, upright
   (travel 17.5) and sideways (25): equal to the last bit. */
{
  const old = (S, dist, angle, maxR) => {   /* BroTown.jsx handleJoystickMove before v2.3.6542 */
    var deadzone = 12;
    if (dist < deadzone) {
      S.stickX = 0;
      S.stickY = 0;
    } else {
      var strength = Math.min((dist - deadzone) / (maxR - deadzone), 1);
      S.stickX = Math.cos(angle) * strength;
      S.stickY = Math.sin(angle) * strength;
    }
  };
  let n = 0; const diff = [];
  for (const maxR of [17.5, 25, 37.5 / 2 - 20 + 20]) {
    for (let dist = 0; dist <= 80; dist += 0.25) {
      for (let k = -16; k <= 16; k++) {
        const angle = (k * Math.PI) / 16 + 0.013;
        const A = {}, B = {};
        old(A, dist, angle, maxR); stickAnalog(B, dist, angle, maxR); n++;
        if (!Object.is(A.stickX, B.stickX) || !Object.is(A.stickY, B.stickY)) diff.push({ maxR, dist, angle, A, B });
      }
    }
  }
  check(`9. the analog read moved whole: ${n} thumbs, the same values to the last bit`, diff.length === 0, diff.slice(0, 3));
  check('9. its dead zone is the old 12 px: 11.99 nothing, 12 a start', STICK_DEAD_PX === 12
    && (() => { const S = {}; stickAnalog(S, 11.99, 0, 17.5); return S.stickX === 0 && S.stickY === 0; })()
    && (() => { const S = {}; stickAnalog(S, 12, 0, 17.5); return S.stickX === 0 && S.stickY === 0 && Object.keys(S).length === 2; })());
  const L = { stickX: 0.7, stickY: -0.2 };
  stickLift(L);
  check('9. the lift: no walk, the stick at rest (no phase written when mode 5 never moved it)', L.stickX === 0 && L.stickY === 0 && !('_stickPhase' in L));
  const T = { stickX: 1, stickY: 0, _stickPhase: 'walk' };
  stickLift(T);
  check('9. ...and from mode 5\'s walk, at rest', T._stickPhase === 'rest');
  for (const prop of ['stickX', 'stickY']) {
    const w = writesOutside(prop, 'src/game/stickZones.js', 'stickAnalog');
    const far = w.outside.filter((x) => !x.startsWith('src/game/stickZones.js:'));
    check(`9. no write of S.${prop} in src/ outside stickZones.js (its one owner, system input)`, far.length === 0, far);
  }
}

const MQ = { matches: false };   /* v2.3.6644: the one `(pointer:fine)` list handed to deviceProfile (it keeps the first): 10i and 11f */
/* ── 10. v2.3.6545: sprint from the rim (card CT item 6) ──
 * v2.3.6647 (card PAD part 12): 10 and 11 are YESTERDAY'S RULE, played
 * under `?fullpush=0` (the switch gives it back whole: 1.25 and 1.05 of the
 * drawn radius, no reach, the words at every push); the full push is 12's. */
const _fpLoc = Object.getOwnPropertyDescriptor(globalThis, 'location');
Object.defineProperty(globalThis, 'location', { value: { search: '?fullpush=0' }, configurable: true, writable: true });
{
  const R = 37.5;
  const mk = (st) => ({ _serverCaps: { sprint: true }, rpg: { stamina: st == null ? 100 : st, maxStamina: 100, hp: 50 }, player: { x: 0, y: 0 } });
  const says = [];
  const say = (S, now) => says.push(now);
  const push = (S, share) => stickDrive(S, share * R, 0, R, null, null, null, say);
  /* a frame of sprint.js's own, the walk pushed (the game loop's call) */
  const frame = (S, f) => updateSprint(S, Date.now(), Object.assign({ moving: true, dtMs: 100 }, f || {}));
  check('10. the lines: on at 1.25, off below 1.05 (trial numbers)', STICK_ZONES.SPRINT_AT === 1.25 && STICK_ZONES.SPRINT_OFF === 1.05);
  check('10. rimPast: the band, both edges exact (yesterday\'s lines, named and read off ?fullpush=0)', rimPast(1.25, false, false) === true && rimPast(1.2499, false, false) === false && rimPast(1.05, true, false) === true && rimPast(1.0499, true, false) === false && rimPast(1.1, false, false) === false && rimPast(1.1, true, false) === true
    && fullPushOn() === false && rimPast(1.2499, false) === false && rimPast(1.0499, true) === false);
  /* 10a. at the rim: full walking speed, no sprint, stamina still */
  let S = mk();
  let r = push(S, 1.0);
  frame(S); frame(S);
  check('10a. at the rim (share 1.0): full walking speed, no sprint, stamina still, no state made', r.rim === null && near(S.stickX, 1) && !isSprinting(S) && sprintStepFlag(S) === 0 && S.rpg.stamina === 100 && !('_rimSprint' in S), { r, S });
  r = push(S, 1.2499);
  check('10a. ...and just short of 1.25, still none', r.rim === null && !(S._sprint && S._sprint.on));
  /* 10b. past 1.25: the sprint, the move's sp, stamina falling */
  r = push(S, 1.25);
  frame(S);
  check('10b. past the rim (1.25): the sprint starts, how "rim", the move marked sp, stamina falling', r.rim === 'start' && S._sprint.how === 'rim' && isSprinting(S) && sprintStepFlag(S) === 1 && S.rpg.stamina < 100 && rimSprinting(S) && near(S.stickX, 1), { r, sp: S._sprint, st: S.rpg.stamina });
  /* 10c. between the lines it holds; inside 1.05 it ends */
  r = push(S, 1.15);
  check('10c. back to 1.15 (between the lines): it holds, no flutter', r.rim === null && rimSprinting(S) && isSprinting(S));
  r = push(S, 1.05);
  check('10c. ...at 1.05 still', r.rim === null && rimSprinting(S));
  r = push(S, 1.0499);
  frame(S);
  check('10c. inside 1.05: it ends ("rim"), the walk on at full speed, sp 0', r.rim === 'stop' && !S._sprint.on && S._sprint.why === 'rim' && !isSprinting(S) && sprintStepFlag(S) === 0 && near(S.stickX, 1), S._sprint);
  r = push(S, 1.3);
  check('10c. out again: a new sprint', r.rim === 'start' && rimSprinting(S));
  /* 10d. stamina 0 ends it; no restart until the thumb came back */
  S.rpg.stamina = 0.5;
  const ev = frame(S);
  r = push(S, 1.4);
  const r2 = push(S, 1.6);
  check('10d. at 0 stamina it ends, and the thumb still out starts nothing', ev === 'stop' && S._sprint.why === 'empty' && r.rim === null && r2.rim === null && !S._sprint.on, { ev, sp: S._sprint });
  S.rpg.stamina = 60;
  r = push(S, 1.1);
  check('10d. ...nor between the lines', r.rim === null && !S._sprint.on);
  push(S, 0.9);
  r = push(S, 1.3);
  check('10d. back inside, then out: it starts again', r.rim === 'start' && rimSprinting(S));
  /* the other ends of today's sprint end it too, and none restarts while out */
  for (const [why, f] of [['shield', { shield: true }], ['attack', { attacking: true }], ['swim', { swimming: true }], ['dead', { dead: true }]]) {
    const T = mk(); push(T, 1.3); frame(T, f);
    const again = push(T, 1.5);
    check('10d. the ' + why + ' ends it (today\'s end), and the thumb still out does not restart it', T._sprint.why === why && !T._sprint.on && again.rim === null, T._sprint);
  }
  /* 10e. refused for stamina: the words and the tick, once a push */
  says.length = 0;
  S = mk(2);
  r = push(S, 1.3);
  const r3 = push(S, 1.5); push(S, 1.2);
  check('10e. too tired: refused ("tired"), the button\'s words said once a push', r.rim === 'tired' && r3.rim === null && says.length === 1 && !(S._sprint && S._sprint.on), { r, says });
  push(S, 0.5); r = push(S, 1.3);
  check('10e. ...back inside and out again: said again', r.rim === 'tired' && says.length === 2);
  S.rpg.stamina = 100; push(S, 0.5); r = push(S, 1.3);
  check('10e. rested: the next push sprints', r.rim === 'start' && rimSprinting(S));
  says.length = 0;
  const N = mk(2); r = stickDrive(N, 1.3 * R, 0, R, null, null, null);
  check('10e. no words handed in (a test): refused all the same, nothing thrown', r.rim === 'tired' && says.length === 0);
  /* 10f. never started with the shield up, dead, in the water or attacking; the push kept */
  for (const [what, set] of [['the shield up', (T) => { T._shieldUp = true; }], ['dying', (T) => { T._dying = true; }], ['at 0 hp', (T) => { T.rpg.hp = 0; }],
    ['in the water', (T) => { T._wheelSwim = { on: true }; }], ['the latch attacking', (T) => { T.autoAttack = true; }], ['mid-swing', (T) => { T.isSwinging = true; }], ['in a bash', (T) => { T._bashDash = true; }]]) {
    const T = mk(); set(T);
    const a = push(T, 1.3);
    check('10f. ' + what + ': no sprint starts', a.rim === null && !(T._sprint && T._sprint.on), T._sprint);
    const U = mk(); set(U); push(U, 1.3);
    delete U._shieldUp; delete U._dying; delete U._wheelSwim; delete U.autoAttack; delete U.isSwinging; delete U._bashDash; U.rpg.hp = 50;
    const b = push(U, 1.35);
    check('10f. ' + what + ', then clear with the thumb still out: the push was kept, it sprints', b.rim === 'start' && rimSprinting(U));
  }
  const H1 = mk(); H1.rpg.hp = 1;
  check('10f. at 1 hp it sprints', push(H1, 1.3).rim === 'start');
  /* 10g. the lift ends it; it stops only its own sprint */
  S = mk(); push(S, 1.3);
  stickLift(S);
  check('10g. the thumb lifted: the rim\'s sprint ends, the stick at rest', !S._sprint.on && S._sprint.why === 'rim' && S.stickX === 0 && S._stickPhase === 'rest');
  r = push(S, 1.3);
  check('10g. ...a new touch out past the rim sprints again', r.rim === 'start');
  const K = mk();
  frame(K, { key: true });
  r = push(K, 1.3);
  check('10g. Shift held: the rim starts nothing over it (still Shift\'s)', r.rim === null && K._sprint.how === 'key' && !rimSprinting(K));
  r = push(K, 0.5); stickLift(K);
  check('10g. ...and the thumb coming back in or lifting leaves Shift\'s sprint running', r.rim === null && K._sprint.on && K._sprint.how === 'key');
  const B = mk(); startSprint(B, Date.now(), 'tap'); push(B, 1.3); r = push(B, 0.5);
  check('10g. a button\'s sprint (a tap) is not the rim\'s to stop', r.rim === null && B._sprint.on && B._sprint.how === 'tap');
  /* 10h. no worker sprint: nothing, no state */
  const O = { rpg: { stamina: 100 } };
  r = push(O, 1.5);
  check('10h. a worker without caps.sprint: nothing, no state made, no words', r.rim === null && !('_rimSprint' in O) && !(O._sprint && O._sprint.on) && says.length === 0);
  check('10h. no state: null', rimSprint(null, 2, 1) === null);
  /* 10i. ?rimsprint=0: the edge does nothing; the button's place (rimSprintLive) */
  const hadLoc = Object.getOwnPropertyDescriptor(globalThis, 'location');
  const hadWin = globalThis.window;
  try {
    Object.defineProperty(globalThis, 'location', { value: { search: '?fullpush=0&rimsprint=0' }, configurable: true, writable: true });
    const Z = mk(); const z = push(Z, 2);
    check('10i. ?rimsprint=0: past the rim full walking speed and no sprint, no state', z.rim === null && near(Z.stickX, 1) && !(Z._sprint && Z._sprint.on) && !('_rimSprint' in Z) && rimSprintOn() === false);
    setManualCombat(5);
    check('10i. ?rimsprint=0 in mode 5 on a touch screen: the button is back (rimSprintLive false)', rimSprintLive() === false);
    globalThis.location.search = '';
    check('10i. no address: on, and live in mode 5 on a touch screen', rimSprintOn() === true && rimSprintLive() === true);
    if (typeof globalThis.window === 'undefined') globalThis.window = {};
    const mq = MQ; mq.matches = true;   /* deviceProfile keeps the list it is given (live): latch.test H1's way; v2.3.6644: one list for 10i and 11f (the first one handed is kept) */
    globalThis.window.matchMedia = () => mq;
    check('10i. mode 5 with a mouse: not live (a touch screen\'s main pointer only)', rimSprintLive() === false);
    mq.matches = false;
    check('10i. ...the touch pointer again: live', rimSprintLive() === true);
    delete globalThis.window.matchMedia;
    setManualCombat(4);
    check('10i. mode 4 on a touch screen: live (v2.3.6644, card PAD part 9: the usual controls sprint by the rim, the button gone)', rimSprintLive() === true);
    globalThis.location.search = '?rimsprint=0';
    check('10i. mode 4 with ?rimsprint=0: not live (the button back)', rimSprintLive() === false);
    globalThis.location.search = '';
    check('10i. the switch read off an address', rimSprintOn('?rimsprint=0') === false && rimSprintOn('?rimsprint=1') === true && rimSprintOn('') === true);
  } finally {
    if (hadLoc) Object.defineProperty(globalThis, 'location', hadLoc); else delete globalThis.location;
    if (hadWin === undefined) delete globalThis.window; else globalThis.window = hadWin;
    setManualCombat(4);
  }
  /* 10j. the share is the thumb's own, unclamped: three radii out sprints */
  const J = mk(); r = stickDrive(J, 0, -3 * R, R, null, null, null, say);
  check('10j. a thumb three radii out (the walk clamped to 1): the share is unclamped, it sprints', r.rim === 'start' && near(r.share, 3) && near(Math.hypot(J.stickX, J.stickY), 1));
  /* 10k. the analog read handed no drawn radius (its old call): no rim state */
  const M = mk(); stickAnalog(M, 200, 0, 17.5); stickLift(M);
  check('10k. the analog read with no radius far past its travel, then the lift: no sprint, no state', !('_rimSprint' in M) && !(M._sprint && M._sprint.on));
  const M0 = mk(); stickAnalog(M0, 200, 0, 17.5, 0, say);
  check('10k. ...nor a radius of 0', !('_rimSprint' in M0) && !(M0._sprint && M0._sprint.on));
  /* 10l. BroTown hands the button's words to the one call (off the source:
     the handler's only stickDrive call, the 8th argument sprintTiredSay) */
  check('10l. BroTown\'s one stickDrive call hands it sprintTiredSay', findIn('ui', /stickDrive\(stateRef\.current, rawDx, rawDy, rect\.width \/ 2, knobRef\.current, lStickRef\.current, base\.style\.opacity, sprintTiredSay, _lts && _lts\.from\); return; \}/).length === 1);
}

/* ── 11. v2.3.6644: the USUAL controls sprint by the rim (card PAD part 9) ──
 * The owner, 2026-11-26, told "no button; push the stick to its edge": "Yeah
 * do that and remove sprint button".  Mode 4 on a touch screen: BroTown's
 * analog read (stickAnalog) hands the disc's drawn radius and the button's
 * words, and the thumb past the rim sprints by rimSprint's own rules (10's);
 * `?rimsprint=0` and a mouse do nothing; no radius (10k) nothing. */
{
  const R = 37.5, maxR = R - 20;   /* the usual stick upright: its travel 20 px inside the drawn rim */
  const mk = (st) => ({ _serverCaps: { sprint: true }, rpg: { stamina: st == null ? 100 : st, maxStamina: 100, hp: 50 }, player: { x: 0, y: 0 } });
  const says = [];
  const say = (S, now) => says.push(now);
  const thumb = (S, share) => stickAnalog(S, share * R, 0, maxR, R, say);
  const on = (S) => !!(S._sprint && S._sprint.on && S._sprint.how === 'rim');
  setManualCombat(4);
  check('11. mode 4 (the usual controls), no address, a touch screen: live', manualMode() === 4 && rimSprintLive() === true);
  /* 11a. at the rim: full walk, nothing; past SPRINT_AT: the sprint, a hold */
  let U = mk();
  thumb(U, 1.0);
  check('11a. the thumb at the drawn rim: full walking speed, no sprint, no state', near(U.stickX, 1) && !on(U) && !('_rimSprint' in U));
  const t0 = Date.now();
  thumb(U, 1.3);
  check('11a. past the rim (1.3): the sprint starts, how \'rim\', on the sprint\'s own clock; the walk still full', on(U) && U._sprint.at >= t0 && U._sprint.at <= Date.now() && near(U.stickX, 1) && says.length === 0);
  thumb(U, 1.1);
  check('11a. eased back inside SPRINT_AT but not SPRINT_OFF (1.1): still sprinting (the band)', on(U));
  thumb(U, 1.0);
  check('11a. back inside SPRINT_OFF (1.0): stopped', !on(U) && U._rimSprint.out === false && U._rimSprint.ready === true);
  /* 11b. the share is the thumb over the DRAWN radius, not the travel */
  const B = mk(); thumb(B, 1.2);
  check('11b. 1.2 of the drawn radius (far past the 17.5 px travel): no sprint', !on(B));
  /* 11c. the lift and the dead zone end it (the rim is read in the dead zone too) */
  const L = mk(); thumb(L, 1.5); const wasL = on(L); stickLift(L);
  check('11c. a lifted thumb lets go of the usual stick\'s sprint', wasL && !on(L) && L.stickX === 0);
  const D = mk(); thumb(D, 1.5); const wasD = on(D); stickAnalog(D, 0, 0, maxR, R, say);
  check('11c. the thumb back on its landing (inside the dead zone): the sprint stops, the walk 0', wasD && !on(D) && D.stickX === 0 && D.stickY === 0);
  /* 11d. refused for stamina: the words once a push */
  says.length = 0;
  const T = mk(0); thumb(T, 1.5); thumb(T, 1.6); thumb(T, 1.4);
  check('11d. tired: one push past the rim held three frames says the words once, no sprint', says.length === 1 && !on(T) && T._sprint.why === 'tired');
  thumb(T, 0.5); thumb(T, 1.5);
  check('11d. ...eased back in and out again: a second push says them once more', says.length === 2 && !on(T));
  /* 11e. Shift's sprint stays Shift's */
  const K = mk(); startSprint(K, Date.now(), 'key'); thumb(K, 1.5); thumb(K, 0.5);
  check('11e. a Shift sprint: the usual stick past and back neither ends nor takes it', K._sprint.on && K._sprint.how === 'key');
  /* 11f. off: ?rimsprint=0, and a touch screen whose main pointer is a mouse */
  const hadLoc = Object.getOwnPropertyDescriptor(globalThis, 'location');
  const hadWin = globalThis.window;
  try {
    Object.defineProperty(globalThis, 'location', { value: { search: '?fullpush=0&rimsprint=0' }, configurable: true, writable: true });
    const Z = mk(); thumb(Z, 2);
    check('11f. ?rimsprint=0: past the rim full walking speed, no sprint, no state', near(Z.stickX, 1) && !on(Z) && !('_rimSprint' in Z) && rimSprintLive() === false);
    globalThis.location.search = '?fullpush=0';
    if (typeof globalThis.window === 'undefined') globalThis.window = {};
    const mq = MQ; mq.matches = true;
    globalThis.window.matchMedia = () => mq;
    const F = mk(); thumb(F, 2);
    check('11f. a mouse the main pointer (a computer with a touch screen): no sprint, no state (the button and Shift as today)', !on(F) && !('_rimSprint' in F) && rimSprintLive() === false);
    mq.matches = false;
    const G = mk(); thumb(G, 2);
    check('11f. ...the touch pointer again: it sprints', on(G));
    delete globalThis.window.matchMedia;
  } finally {
    if (hadLoc) Object.defineProperty(globalThis, 'location', hadLoc); else delete globalThis.location;
    if (hadWin === undefined) delete globalThis.window; else globalThis.window = hadWin;
    setManualCombat(4);
  }
  /* 11g. BroTown's one analog call hands the drawn radius and the words */
  check('11g. BroTown\'s one stickAnalog call hands it the drawn radius, sprintTiredSay and where the thumb landed (v2.3.6647), and draws the knob its read\'s length', findIn('ui', /var clampDist = stickAnalog\(S, dist, angle, maxR, rect\.width \/ 2, sprintTiredSay, _lts && _lts\.from\);/).length === 1);
}

/* ── 12. v2.3.6647: A FULL PUSH SPRINTS, REACHABLE FROM ANYWHERE (card PAD part 12) ──
 * The owner, 2026-11-27, upright on an iPhone: "the sprint action isn't
 * working correctly because you can't move a big enough distance off screen
 * (in the southwest corner where the joystick is) when moving west or area
 * too close to the edge of the screen".  By default (no address): the thumb
 * AT the reach sprints (1.0, off below 0.8), a part push walks; the reach in
 * the thumb's direction is the drawn radius or the room to the play area's
 * edge less 16 px (the band's top going south), the smaller, never under 18;
 * a still thumb moves nothing; out of energy the bro walks on, no flicker;
 * the refusal's words once each time the bar empties; the two buttons the
 * same.  Plants, each red (tried by hand, 2026-11-27): FULL_AT 1.25 (or the
 * reach ignored: dist over the drawn radius) -> FAIL 12a, 12b; the margin
 * left out of stickRoom -> FAIL 12a, 12b (west from 40 px); the floor 4 ->
 * FAIL 12c; the floor taken away (Math.max dropped) -> FAIL 12c; the band's
 * height left out of stickFrom -> FAIL 12b (south), 12g; the walk's top
 * left at maxR -> FAIL 12d (a short reach sprinting on a part walk); the
 * knob drawn min(dist, maxR) -> FAIL 12d; `hush` dropped -> FAIL 12f;
 * `rim.hush = false` on a start dropped -> FAIL 12f; `rim.ready = false`
 * dropped -> FAIL 12e (a restart at every move while held, out of energy);
 * stickDrive left on yesterday's share -> FAIL 12h; BroTown's touchstart
 * without the landing box -> FAIL 12g. */
if (_fpLoc) Object.defineProperty(globalThis, 'location', _fpLoc); else delete globalThis.location;
{
  setManualCombat(4);
  const Z = STICK_ZONES, E = Z.EDGE_PX, FL = Z.REACH_FLOOR;
  const mk = (st) => ({ _serverCaps: { sprint: true }, rpg: { stamina: st == null ? 100 : st, maxStamina: 100, hp: 50 }, player: { x: 0, y: 0 } });
  const on = (S) => !!(S._sprint && S._sprint.on && S._sprint.how === 'rim');
  const says = [];
  const say = (S, now) => says.push(now);
  const frame = (S, f) => updateSprint(S, Date.now(), Object.assign({ moving: true, dtMs: 100 }, f || {}));
  check('12. the lines: on at 1.0 of the reach, off below 0.8; the margin 16 px, the floor 18; on by default, `?fullpush=0` off',
    Z.FULL_AT === 1 && Z.FULL_OFF === 0.8 && E === 16 && FL === 18 && fullPushOn() === true && fullPushOn('?fullpush=0') === false && fullPushOn('?fullpush=1') === true && fullPushOn('') === true);
  check('12. rimPast by default: the full push\'s band, both edges', rimPast(1, false) && !rimPast(0.999, false) && rimPast(0.8, true) && !rimPast(0.799, true) && !rimPast(0.9, false) && rimPast(0.9, true) && rimPast(3, true));

  /* 12a. THE REACH IS ON THE GLASS from every landing point, every way: three
     phones (upright 375 x 667 and 390 x 844, sideways 844 x 390, the band's
     height each), the controller's drawn radius each, the whole left zone
     every 3 px, sixteen ways and the four straight ones */
  const PHONES = [
    { name: '375 x 667 upright', vw: 375, vh: 667, band: 150, R: 36.3 },
    { name: '390 x 844 upright', vw: 390, vh: 844, band: 170, R: 37.7 },
    { name: '844 x 390 sideways', vw: 844, vh: 390, band: 96, R: 41.6 },
  ];
  const ANGS = [];
  for (let k = 0; k < 16; k++) ANGS.push((k * Math.PI) / 8 - Math.PI + 1e-3 * (k % 3));
  ANGS.push(0, Math.PI / 2, Math.PI, -Math.PI / 2);
  for (const ph of PHONES) {
    const bad = [], floorCases = [], acted = [];
    let n = 0;
    for (let x = 0.5; x <= ph.vw / 2; x += 3) {
      for (let y = 0.5; y <= ph.vh - ph.band; y += 3) {
        const from = stickFrom(x, y, ph.vw, ph.vh, ph.band);
        for (const a of ANGS) {
          const reach = stickReach(from, a, ph.R, STICK_DEAD_PX);
          const px = x + Math.cos(a) * reach, py = y + Math.sin(a) * reach;
          /* never nearer an edge than the margin, or than where it landed (a thumb landing inside the margin, moving along it) */
          const keep = (end, start) => end >= Math.min(start, E) - 1e-6;
          const inside = keep(px, x) && keep(ph.vw - px, ph.vw - x) && keep(py, y) && keep(ph.vh - ph.band - py, ph.vh - ph.band - y);
          n++;
          if (!(reach <= ph.R + 1e-9 && reach >= FL - 1e-9)) bad.push({ x, y, a, reach, why: 'not between the floor and the drawn radius' });
          else if (!inside && !(reach === FL && stickRoom(from, a) < FL)) bad.push({ x, y, a, reach, px, py, why: 'past the margin, not the floor' });
          else if (!inside) floorCases.push({ x, y, a });
          /* the stick itself, one in about 89: a thumb walked straight out sprints AT the reach, not a hair before, the walk full */
          if (n % 89 === 0) {
            const S = mk(), maxR = ph.R - 20;
            stickAnalog(S, reach - 0.25, a, maxR, ph.R, null, from);
            const early = on(S);
            const knob = stickAnalog(S, reach, a, maxR, ph.R, null, from);
            if (early || !on(S) || !near(Math.hypot(S.stickX, S.stickY), 1) || !near(knob, maxR)) acted.push({ x, y, a, reach, early, on: on(S), walk: Math.hypot(S.stickX, S.stickY), knob });
          }
        }
      }
    }
    check(`12a. ${ph.name}: from every landing point (${n} thumbs), the full push between the floor and the drawn radius, never nearer an edge than 16 px or than where it landed (or the floor's own case, within ${E + FL} px of an edge: ${floorCases.length})`, bad.length === 0, bad.slice(0, 3));
    check(`12a. ${ph.name}: walked straight out, the stick sprints AT the reach and not a quarter px before, the walk full and the knob at its stop`, acted.length === 0, acted.slice(0, 3));
  }

  /* 12b. the card's own landing points (the controller on a 430 px phone: R 41.6, maxR 21.6; the band 170 px of 932) */
  const R = 41.6, maxR = R - 20, VW = 430, VH = 932, BAND = 170, B = VH - BAND;
  const push = (x0, y0, ang, dist) => { const S = mk(); stickAnalog(S, dist, ang, maxR, R, say, stickFrom(x0, y0, VW, VH, BAND)); return S; };
  const firstSprint = (x0, y0, ang) => { for (let d = 0; d <= 3 * R; d += 0.25) { if (on(push(x0, y0, ang, d))) return d; } return null; };
  const W = Math.PI, S_ = Math.PI / 2, SW = (3 * Math.PI) / 4, EA = 0;
  const cases = [
    ['on the drawn disc (55, 57 over the band) going west', 55, B - 57, W, 55 - E],
    ['on the drawn disc going south', 55, B - 57, S_, 57 - E],
    ['on the drawn disc going south-west', 55, B - 57, SW, R],
    ['on the drawn disc going east', 55, B - 57, EA, R],
    ['60 px from the left edge going west', 60, B - 120, W, R],
    ['40 px from the left edge going west', 40, B - 120, W, 40 - E],
    ['40 px from the left edge going east', 40, B - 120, EA, R],
    ['20 px from the left edge going west (the floor\'s case: 2 px of glass left)', 20, B - 120, W, FL],
    ['30 px over the band going south (the floor)', 200, B - 30, S_, FL],
    ['50 px over the band going south', 200, B - 50, S_, 50 - E],
    ['30 px from the left edge and the band going south-west', 30, B - 30, SW, (30 - E) * Math.SQRT2],
    ['30 px from the top going north', 120, 30, -Math.PI / 2, FL],
  ];
  for (const [what, x0, y0, a, want] of cases) {
    const d = firstSprint(x0, y0, a);
    const at = d == null ? null : { x: x0 + Math.cos(a) * d, y: y0 + Math.sin(a) * d };
    check(`12b. ${what}: the full push at ${want.toFixed(2)} px (first sprint at ${d}; the thumb at ${at && at.x.toFixed(1)}, ${at && at.y.toFixed(1)})`,
      d != null && d >= want - 1e-9 && d <= want + 0.25 + 1e-9 && at.x >= 0 && at.y <= B && at.y >= 0, { d, want, at });
  }
  check('12b. the share is the thumb\'s own over the reach, unclamped: three reaches out it sprints', on(push(40, B - 120, W, 3 * 24)));

  /* 12c. a still thumb moves nothing; a part push walks; a tremble at the edge is no sprint */
  says.length = 0;
  const T0 = push(1, B - 1, SW, 0);
  check('12c. a thumb landing in the corner (1 px from the edge and the band), still: no walk, no sprint, no state', T0.stickX === 0 && T0.stickY === 0 && !on(T0) && !('_rimSprint' in T0));
  const T1 = push(17, B - 120, W, 6);
  check('12c. 17 px from the left edge, trembling 6 px west: no walk, no sprint (the floor)', T1.stickX === 0 && !on(T1) && !('_rimSprint' in T1));
  const T2 = push(17, B - 120, W, FL - 0.25);
  check('12c. ...17.75 px: a walk, still no sprint', T2.stickX < 0 && !on(T2));
  const T3 = push(55, B - 57, EA, 0.99 * R);
  check('12c. a part push (0.99 of the reach) on the disc going east: full walking speed, no sprint, no state', near(T3.stickX, 1) && !on(T3) && !('_rimSprint' in T3));

  /* 12d. at a short reach (the floor's 18 px, under the travel's 21.6) the walk is full and the knob at its stop at the full push */
  const D = mk(); const from20 = stickFrom(20, B - 120, VW, VH, BAND);
  const kPart = stickAnalog(D, 15, W, maxR, R, say, from20);
  const wPart = Math.hypot(D.stickX, D.stickY);
  const kFull = stickAnalog(D, FL, W, maxR, R, say, from20);
  check(`12d. a short reach: a part push walks part speed with the knob part way (${wPart.toFixed(2)}, ${kPart.toFixed(1)} px), the full push full speed with the knob at its stop (${kFull} of ${maxR})`,
    wPart > 0 && wPart < 1 && kPart < maxR && near(Math.hypot(D.stickX, D.stickY), 1) && near(kFull, maxR) && on(D));
  const D2 = mk(); const kOld = stickAnalog(D2, 15, W, maxR, R, say, stickFrom(200, B - 120, VW, VH, BAND));
  check('12d. with room, the walk and the knob are yesterday\'s (full at the travel)', near(kOld, 15) && near(Math.hypot(D2.stickX, D2.stickY), Math.min((15 - 12) / (maxR - 12), 1)));

  /* 12e. out of energy: the run ends, the bro walks on, no flicker; ease back and push again once the minimum is back */
  const from = stickFrom(55, B - 57, VW, VH, BAND);
  const hold = (S, share) => stickAnalog(S, share * (55 - E), W, maxR, R, say, from);
  const O = mk(); hold(O, 1);
  check('12e. a full push west from the disc: it sprints', on(O));
  O.rpg.stamina = 0.5;
  const ev = frame(O);
  let flick = 0;
  for (const sh of [1, 1.2, 0.9, 1.05, 1, 0.85, 1.3]) { hold(O, sh); frame(O); if (O._sprint.on) flick++; }
  O.rpg.stamina = 60;
  for (const sh of [1, 1.1, 0.95]) { hold(O, sh); if (O._sprint.on) flick++; }
  check('12e. the bar empties: the run ends ("empty"), the stick held over walks on at full speed and never sprints again (no flicker), even refilled', ev === 'stop' && O._sprint.why === 'empty' && flick === 0 && near(O.stickX, -1), { ev, flick, sp: O._sprint });
  hold(O, 0.79); hold(O, 1);
  check('12e. ...eased back under 0.8 and pushed again, the minimum back: it sprints', on(O));

  /* 12f. the refusal's words: once each time the bar empties, never at every push */
  says.length = 0;
  const Q = mk(2);
  const pushes = (S, k) => { for (let i = 0; i < k; i++) { hold(S, 1); hold(S, 0.5); } };
  pushes(Q, 4);
  check(`12f. tired: four full pushes, the words once (${says.length}), no sprint`, says.length === 1 && !on(Q) && Q._sprint.why === 'tired');
  Q.rpg.stamina = 100; hold(Q, 1);
  const ran = on(Q);
  Q.rpg.stamina = 0.5; frame(Q); hold(Q, 0.5);
  Q.rpg.stamina = 2; pushes(Q, 3);
  check(`12f. rested, a sprint, the bar empty again: three more pushes say them once more (${says.length})`, ran && says.length === 2 && !on(Q));

  /* 12g. the landing box: the band read off the page's own stamp, BroTown's touchstart makes it */
  const hadDoc = globalThis.document;
  try {
    globalThis.document = { documentElement: { style: { getPropertyValue: (k) => (k === '--sheet-h' ? '212px' : k === '--dash-h' ? '180px' : '') } } };
    const f = stickFrom(10, 20, 390, 844);
    check('12g. the band\'s height off --sheet-h (212): the box down to the band\'s top', bandPx() === 212 && f && f.b === 632 && f.r === 390 && f.l === 0 && f.t === 0 && f.x === 10 && f.y === 20, f);
    globalThis.document = { documentElement: { style: { getPropertyValue: (k) => (k === '--dash-h' ? '180px' : '') } } };
    check('12g. ...no --sheet-h: --dash-h (180)', bandPx() === 180);
  } finally {
    if (hadDoc === undefined) delete globalThis.document; else globalThis.document = hadDoc;
  }
  check('12g. off a page: no band; no box without a landing point or a width', bandPx() === 0 && stickFrom(NaN, 1, 390, 844, 0) === null && stickFrom(1, 1, 0, 844, 0) === null);
  check('12g. BroTown\'s touchstart keeps where the thumb landed on the glass (stickFrom, the window\'s kept size: sideways the column is centred in it)', findIn('ui', /lts\.from = stickFrom\(t\.clientX, t\.clientY, winVw\(\), winVh\(\)\);/).length === 1);

  /* 12h. the two buttons (`?manual=5`, stickDrive): the same rule */
  const R5 = 41.6, from5 = stickFrom(40, B - 120, VW, VH, BAND);
  const knob = { style: {} };
  const H5 = mk(); const h1 = stickDrive(H5, -(40 - E) + 0.25, 0, R5, null, null, null, say, from5);
  const H6 = mk(); const h2 = stickDrive(H6, -(40 - E), 0, R5, knob, null, null, say, from5);
  check('12h. the two buttons: 40 px from the left edge, west: no sprint a quarter px short, a sprint at the margin, the walk full and the knob at the rim',
    h1.rim === null && !on(H5) && h2.rim === 'start' && on(H6) && near(H6.stickX, -1) && /translate\(calc\(-50% \+ -41\.6px\)/.test(knob.style.transform || ''), { h1, h2, k: knob.style.transform });
  const H7 = mk(); const h3 = stickDrive(H7, 0.99 * R5, 0, R5, null, null, null, say, from5);
  check('12h. ...a part push east: walks, no sprint', h3.phase === 'walk' && h3.rim === null && !on(H7));
  const H8 = mk(); const h4 = stickDrive(H8, 3, 0, R5, null, null, null, say, stickFrom(1, B - 1, VW, VH, BAND));
  check('12h. ...a still thumb in the corner: rest, nothing', h4.phase === 'rest' && H8.stickX === 0 && !on(H8));
  Object.defineProperty(globalThis, 'location', { value: { search: '?fullpush=0' }, configurable: true, writable: true });
  try {
    const O5 = mk(); const o5 = stickDrive(O5, -(40 - E), 0, R5, null, null, null, say, from5);
    const OA = mk(); stickAnalog(OA, 40 - E, W, maxR, R, say, stickFrom(40, B - 120, VW, VH, BAND));
    const OB = mk(); stickAnalog(OB, 1.25 * R, W, maxR, R, say, stickFrom(40, B - 120, VW, VH, BAND));
    check('12i. `?fullpush=0`: the landing box read by neither stick, yesterday\'s 1.25 of the drawn radius (a sprint at the margin in neither; at 1.25, the usual one)', o5.rim === null && !on(O5) && !on(OA) && on(OB));
  } finally {
    if (_fpLoc) Object.defineProperty(globalThis, 'location', _fpLoc); else delete globalThis.location;
  }
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
