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
 *   8. v2.3.6541 THE FRAME'S STEP `input`, stickFrame (moved whole out of
 *      gameLoop): the stick read, the gates, the keys, the idle clock (a thumb
 *      held turning is a player), the name tag's facing; one object a page.
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
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { STICK_ZONES, STICK_PHASES, stickRead, stickTravel, facing8, stickSwipe, stickTap, stickRelease, turnShare, stickPhase, stickTo, stickDrive, stickFrame, turnRingRadius } from '../../src/game/stickZones.js';
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
  check('7. the stick handler makes the one call, behind twoButtonsOn, and returns', findIn('ui', /stickDrive\(/).length === 1
    && findIn('ui', /if \(twoButtonsOn\(\)\) \{ stickDrive\(stateRef\.current, rawDx, rawDy, [^;]*\); return; \}/).length === 1);
  check('7. ...and its release writes rest', findIn('ui', /S\.stickY = 0; stickTo\(S, 'rest'\);/).length === 1);
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
        const gate = !!cond && cond.test.type === 'CallExpression' && cond.test.callee.type === 'Identifier' && cond.test.callee.name === 'twoButtonsOn' && cond.test.arguments.length === 0;
        let sized = 0;
        call.traverse({ CallExpression(q) { if (q.node.callee.type === 'Identifier' && q.node.callee.name === 'turnRingRadius') sized++; } });
        rings.push({ file, gate, sized });
      },
    });
  }
  check('7b. the stick handler hands stickDrive the thumb\'s raw offset (clientX - bcx, clientY - bcy, never written again)', drives.length === 1 && drives[0].raw === true, drives);
  check('7b. the disc draws the turn ring only when twoButtonsOn() (never in mode 4), sized by turnRingRadius', rings.length === 1 && rings[0].gate === true && rings[0].sized === 2, rings);
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
          calls.push({ file, path, frozen: names(n.arguments[2]), loot: names(n.arguments[3]), args: n.arguments.length });
        },
      });
    }
    check('8. BroTown calls stickFrame once, frozen by a real stun OR death OR the loot freeze, four arguments (no clock handed in; read off the syntax tree)', calls.length === 1
      && JSON.stringify(calls[0].frozen) === JSON.stringify(['_playerDead', '_playerLootFrozen', '_realStunned']) && JSON.stringify(calls[0].loot) === '["_playerLootFrozen"]' && calls[0].args === 4, calls.map((c) => ({ ...c, path: undefined })));
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
    /* the step `input`: the declaration between _steps.to(0, 2) and _steps.to(2, 0) in one block */
    let step = false;
    if (call) {
      const st = call.parentPath.parentPath;   /* the VariableDeclaration */
      const sib = (off) => { const c = st.container; const i = st.key + off; return Array.isArray(c) && c[i] ? c[i] : null; };
      const toCall = (n, a, b) => !!n && n.type === 'IfStatement' && n.consequent.type === 'ExpressionStatement' && n.consequent.expression.type === 'CallExpression'
        && n.consequent.expression.callee.type === 'MemberExpression' && n.consequent.expression.callee.object.name === '_steps' && KEY(n.consequent.expression.callee) === 'to'
        && n.consequent.expression.arguments.map((x) => x.value).join() === a + ',' + b;
      step = st.isVariableDeclaration() && st.node.declarations.length === 1 && toCall(sib(-1), 0, 2) && toCall(sib(1), 2, 0);
    }
    check('8. the call is the step `input`: between `_steps.to(0, 2)` and `_steps.to(2, 0)` (off the syntax tree)', step);
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

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
