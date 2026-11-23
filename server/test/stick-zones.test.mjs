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
 *   8. v2.3.6541 THE FRAME'S STEP `input`, stickFrame (moved whole out of
 *      gameLoop): the stick read, the gates, the keys, the idle clock (a thumb
 *      held turning is a player), the name tag's facing; one object a page.
 *
 * Break proof, tried by hand: `S._stickPhase = 'walk';` added to
 * stickZones.js stickRead -> FAIL 5 (and the guard's §2); TURN: 0.30 -> 0.10
 * -> FAIL 1.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { STICK_ZONES, STICK_PHASES, stickRead, stickTravel, facing8, stickSwipe, stickTap, stickRelease, turnShare, stickPhase, stickTo, stickDrive, stickFrame } from '../../src/game/stickZones.js';
import { findIn } from '../../tools/guards/lib/filesOf.mjs';
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
  const bt = readFileSync(new URL('../../src/ui/BroTown.jsx', import.meta.url), 'utf8');
  const mv = bt.slice(bt.indexOf('var handleJoystickMove = useCallback'), bt.indexOf('var handleJoystickEnd = useCallback'));
  const en = bt.slice(bt.indexOf('var handleJoystickEnd = useCallback'), bt.indexOf('}, []);', bt.indexOf('var handleJoystickEnd = useCallback')));
  check('7. BroTown\'s stick handler makes the one call, behind twoButtonsOn, and returns', (mv.match(/stickDrive\(/g) || []).length === 1 && /if \(twoButtonsOn\(\)\) \{ stickDrive\([^;]*\); return; \}/.test(mv));
  check('7. ...and its release writes rest', /stickTo\(S, 'rest'\)/.test(en));
}

/* ── 8. the frame's step `input` (stickFrame) ── */
{
  const mk = (sx, sy) => ({ stickX: sx, stickY: sy, player: { dir: 'down' } });
  let S = mk(0.5, 0);
  let o = stickFrame(S, {}, false, false, 1000);
  check('8. the stick walks, the idle clock stamped, the name tag faces the walk', o.dx === 0.5 && o.dy === 0 && S._lastInputAt === 1000 && S.player.dir === 'right');
  S = mk(0.5, 0);
  o = stickFrame(S, { w: true }, true, false, 1000);
  check('8. a real stun (or death) stops it, the keys too', o.dx === 0 && o.dy === 0 && S.player.dir === 'down');
  S = mk(0, 0);
  o = stickFrame(S, { ArrowUp: true, d: true }, false, false, 1000);
  check('8. no stick: the keys move, a diagonal normalized, the idle clock left to the keys', near(o.dx, Math.SQRT1_2) && near(o.dy, -Math.SQRT1_2) && S._lastInputAt === undefined && S.player.dir === 'up');
  S = mk(0.9, 0);
  o = stickFrame(S, {}, true, true, 1000);
  check('8. the loot freeze: the name tag faces the camera', o.dx === 0 && S.player.dir === 'down');
  S = mk(0, 0); S._stickPhase = 'turn';
  stickFrame(S, {}, false, false, 2000);
  check('8. a thumb held TURNING in mode 5 is a player (the idle clock)', S._lastInputAt === 2000);
  check('8. one object a page (a frame makes no garbage)', stickFrame(mk(0, 0), {}, false, false, 0) === stickFrame(mk(0, 0), {}, false, false, 0));
  const bt = readFileSync(new URL('../../src/ui/BroTown.jsx', import.meta.url), 'utf8');
  check('8. gameLoop reads the input through the step `input` (no second read of S.stickX there)',
    /_steps\.to\(0, 2\); var _in = stickFrame\(/.test(bt) && !/var dx = \([^;]*\) \? 0 : S\.stickX/.test(bt));
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
