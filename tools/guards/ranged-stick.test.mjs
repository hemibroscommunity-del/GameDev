/* ═══ v2.3.6648: THE RANGED STICK (card PAD part 13; src/game/rangedStick.js) ═══
 *
 * The two buttons (`?manual=5`).  The owner, 2026-11-27: "for melee to stay
 * as it is (attacking and locking towards nearest enemy) but [BOW] and magic
 * need to use the right button that turns into the right joystick again
 * where attacks must be used in that directional rotation with no lock on
 * mechanism."  Played on the module itself and the real functions it feeds
 * (latch.js, sight.js, freeAttack.js twoButtonPress, tapJump.js
 * requestTapAttack, aimMarks.js, bowSpecialNow.js, combatHelpers.js
 * rangedAimAngle through loadSrc), and BroTown's calls read off the syntax
 * tree (finish.md part 5, rules 1 and 2: never a pattern of text):
 *
 *   1. THE RULE (discKindFor): a sword 'latch', a bow or a staff 'stick',
 *      `?rangedstick=0` 'latch', off the two buttons null; a stand-in that
 *      is only truthy is no;
 *   2. A BOW AND A STAFF, a monster dead ahead in reach: frames, a press, a
 *      hold past the latch's fill -- nothing sighted, nothing latched, no
 *      held attack, no frame drawn round it, no special flown at it   (dodge a)
 *   3. THE HELD STICK dragged AWAY from the monster: the shot's angle
 *      (rangedAimAngle) is the thumb's, 'aiming', never 'lock'; toward it,
 *      the thumb's again                                              (dodge b)
 *   4. A TAP (inside the dead zone, lifted): one shot the way the bro faces,
 *      never toward the monster; a cancel shoots nothing                (dodge c)
 *   5. A SWORD: the press locks the monster in sight, the hold turns
 *      auto-attack on, the frame keeps it                             (dodge d)
 *   6. `?rangedstick=0`: the bow's press locks again, today's         (dodge e)
 *   7. MODES 0 to 4 AND A COMPUTER: nothing is written, nothing answers (dodge f)
 *   8. A LIFT after an aimed hold: the aim and the held attack let go,
 *      and no tap's shot                                              (dodge g)
 *   9. A SWAP in mid-hold, either way: the hold ends (aim, auto-attack, the
 *      lock), the press is spent, the next press is the new kind      (dodge h)
 *  10. THE ONE FIELD: every write of S._discKind in src/ is discKindTo's
 *      (the syntax tree), and the module's functions write no field but
 *      the kind's, the aim's, the held attack's and the latch's, sight's
 *      and tap's own (a recording state over every road)             (dodge i)
 *  12. THE BOW'S HELD STICK looses with nothing on its line (the owner,
 *      16:35): the gate (freeArrowGo) says yes while it is held and aimed,
 *      no once lifted, no for a staff, no in mode 4               (dodge j)
 *  11. THE WIRING in BroTown.jsx, off the syntax tree: the frame's one call
 *      behind the two buttons' gate, the press before today's pinned press,
 *      the drag's aim is rJoyAim, the lift after handleRBtnRelease, the
 *      look in latchLook's place.
 *
 * BREAK PROOF (rule 8), each planted and seen RED, 2026-11-27 (a script
 * swapped each line in, ran this suite, put it back):
 *   a. discKindFor's stick for the bow only, or the staff only  -> FAIL 1, 2
 *      (2 the bow's, 2s the staff's);
 *   b. discFrame's stick branch running latchFrame and latching the sight's
 *      pick (latchTo(S, 'auto', sightNow(S).id))                -> FAIL 2, 2s;
 *   c. discLift's tap turned to the monster (S._facingAngle set toward the
 *      sighted monster before tap)                              -> FAIL 4;
 *   d. discKindFor returning 'stick' for every slot             -> FAIL 1, 5;
 *   e. rangedStickOn ignoring its switch (always true)          -> FAIL 1, 6;
 *   f. discKindFor's `live !== true` line taken out             -> FAIL 1, 7;
 *   g. discLift's two clears taken out                          -> FAIL 8;
 *   h. discKindTo's hold's end taken out                        -> FAIL 9;
 *   i. `S._stickOn = true;` beside the kind in discKindTo       -> FAIL 10;
 *   j. stickLoose returning false (the held bow waits for its line
 *      again)                                                    -> FAIL 12.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createRequire } from 'node:module';
import { DISC_KINDS, RANGED_STICK, rangedStickOn, stickLoose, discKindFor, discKind, discKindTo, discSync, discFrame, discPress, discMove, discLift, discLook, discPressNow } from '../../src/game/rangedStick.js';
import { latchPhase, latchLocked, twoButtonsLive, autoHoldMs } from '../../src/game/latch.js';
import { sightPhase } from '../../src/game/sight.js';
import { twoButtonPress, twoButtonRelease, freeArrowGo } from '../../src/game/freeAttack.js';
import { requestTapAttack, tapFacingAngle } from '../../src/game/tapJump.js';
import { aimMarks } from '../../src/game/aimMarks.js';
import { bowSpecialMon } from '../../src/game/bowSpecialNow.js';
import { setManualCombat } from '../../src/game/manualCombat.js';
import { loadSrc } from './lib/loadSrc.mjs';
import { readSystem } from './lib/filesOf.mjs';
import { ROOT } from './lib/fourLines.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* the page: no window (no mouse: a touch screen), the address settable */
const mq = { matches: false };
globalThis.window = globalThis.window || {};
globalThis.window.matchMedia = () => mq;
globalThis.location = { search: '' };
const address = (q) => { globalThis.location.search = q; };
setManualCombat(5);

const { rangedAimAngle } = await loadSrc('src/game/combatHelpers.js');

const VW = 800, VH = 600;
/* a bro at the origin facing WEST, a monster 150 px EAST of him: whatever
   turns a shot toward the monster turns it the wrong way */
function page(slot, face) {
  return {
    player: { x: 0, y: 0 }, _renderFacing: face || 'east', _facingAngle: face === 'west' ? Math.PI : 0, _facing: face === 'west' ? 'left' : 'right',
    monsters: [{ id: 'm1', x: 150, y: 0, alive: true, curHp: 50 }], currentZone: 'wheel',
    rpg: { activeSlot: slot, hp: 100 }, camera: { x: -VW / 2, y: -VH / 2 },
  };
}
/* the step `input`, as BroTown runs it: S.autoAttack takes a non-null answer */
function frames(S, t0, ms, step) {
  let t = t0;
  for (; t <= t0 + ms; t += step || 50) {
    const lw = twoButtonsLive() ? discFrame(S, t, false, S.rpg.activeSlot, 1, VW, VH) : null;
    if (lw !== null) S.autoAttack = lw;
  }
  return t;
}
/* Attack's press, as BroTown's bS runs it (the stick first, then today's) */
function press(S, now) {
  if (discPress(S) === 'stick') return 'stick';
  if (twoButtonsLive()) return twoButtonPress(S, now, requestTapAttack, null);
  return null;
}
/* the drag's `aim`: what BroTown's rJoyAim writes past its dead zone (the
   part the shot reads: S._aimAngle, S._lastAimAngle, S._aiming, S._aimSrc,
   S.autoAttack); the knob's look is the page's.  BroTown's own call is held
   to rJoyAim in 11 */
const aimer = (S, dx, dy) => (still) => {
  if (still) return;
  const a = Math.atan2(dy, dx);
  S._aimAngle = a; S._lastAimAngle = a; S._aiming = true; S._aimSrc = 'stick'; S.autoAttack = true;
};
const near = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 1e-6;
const toMon = 0;   /* the monster is due east */

/* ── 1. the rule ── */
{
  check('1. the kinds are two, named', DISC_KINDS.join() === 'latch,stick' && RANGED_STICK.DEAD_PX === 10);
  check('1. a sword (any slot not ranged or staff) is a latch', discKindFor(true, 'melee', true) === 'latch' && discKindFor(true, undefined, true) === 'latch');
  check('1. a bow and a staff are a stick', discKindFor(true, 'ranged', true) === 'stick' && discKindFor(true, 'staff', true) === 'stick');
  check('1. `?rangedstick=0`: a latch for all three', discKindFor(true, 'ranged', false) === 'latch' && discKindFor(true, 'staff', false) === 'latch' && discKindFor(true, 'melee', false) === 'latch');
  check('1. off the two buttons: null', discKindFor(false, 'ranged', true) === null && discKindFor(false, 'melee', true) === null);
  check('1. a truthy stand-in is no', discKindFor(1, 'ranged', true) === null && discKindFor(true, 'ranged', 1) === 'latch');
  check('1. the switch: `=0` throws it; absent, `=1`, a longer name do not', rangedStickOn('?rangedstick=0') === false && rangedStickOn('') === true && rangedStickOn('?rangedstick=1') === true && rangedStickOn('?xrangedstick=0') === true);
}

/* ── 2. a bow and a staff: nothing picked, nothing locked ── */
for (const slot of ['ranged', 'staff']) {
  const s = slot === 'ranged' ? '' : 's';
  const S = page(slot);
  let t = frames(S, 1000, 1000);
  check('2' + s + '. ' + slot + ', frames with a monster dead ahead: the disc is a stick, nothing sighted', discKind(S) === 'stick' && sightPhase(S) === 'none' && S._sightId == null, { k: S._discKind, sight: S._sightPhase });
  check('2' + s + '. ...the press is the stick\'s', press(S, t) === 'stick');
  t = frames(S, t, autoHoldMs() + 400);
  check('2' + s + '. ...held past the latch\'s fill: nothing latched, no held attack', latchPhase(S) === 'idle' && !latchLocked(S) && S._latchId == null && S.autoAttack !== true, { latch: S._latchPhase, id: S._latchId, auto: S.autoAttack });
  const am = aimMarks(S, { live: true, frame: true, caret: true });
  check('2' + s + '. ...no frame round the monster (no yellow pick, no red lock); the caret stays', am.frame === null && am.tone === null && typeof am.caret === 'number');
  if (slot === 'ranged') check('2. ...and the bow\'s special flies at nothing picked (bowSpecialMon null: the aim\'s queue)', bowSpecialMon(S, { type: 'bow' }) === null);
  discLift(S, t, null, true);
}

/* ── 3. the held stick: the shot goes where the thumb points ── */
for (const slot of ['ranged', 'staff']) {
  const s = slot === 'ranged' ? '' : 's';
  for (const [dx, dy, want, what] of [[-60, 0, Math.PI, 'AWAY from the monster'], [60, 0, toMon, 'toward the monster'], [0, -60, -Math.PI / 2, 'up, across it']]) {
    const S = page(slot);
    let t = frames(S, 1000, 300);
    press(S, t);
    const r = discMove(S, dx, dy, aimer(S, dx, dy));
    t = frames(S, t, 1200);
    const ra = rangedAimAngle(S, S.player.x, S.player.y);
    check('3' + s + '. ' + slot + ' dragged ' + what + ': the shot along the thumb, held, never a lock', r === 'aim' && ra.src === 'aiming' && near(ra.ang, want) && S.autoAttack === true && latchPhase(S) === 'idle' && S._sightId == null, { r, ra, auto: S.autoAttack, latch: S._latchPhase });
    discLift(S, t, requestTapAttack, false);
  }
  const S = page(slot);
  press(S, 1000);
  check('3' + s + '. inside the dead zone the knob follows and nothing aims', discMove(S, 6, 6, aimer(S, 6, 6)) === 'still' && S._aiming !== true && S.autoAttack !== true);
  check('3' + s + '. past it, it aims; back inside it still aims (mode 4\'s stick)', discMove(S, 30, 0, aimer(S, 30, 0)) === 'aim' && discMove(S, 2, 0, aimer(S, 2, 0)) === 'aim');
  discLift(S, 1100, null, true);
}

/* ── 4. a tap: one shot the way the bro faces ── */
for (const slot of ['ranged', 'staff']) {
  const s = slot === 'ranged' ? '' : 's';
  const S = page(slot, 'west');
  let t = frames(S, 1000, 300);
  press(S, t);
  discMove(S, 4, 3, aimer(S, 4, 3));
  const n0 = S._tapAttacks || 0;
  const r = discLift(S, t + 120, requestTapAttack, false);
  check('4' + s + '. ' + slot + ', a tap facing away from the monster: one shot, the way the bro faces', r === 'tap' && (S._tapAttacks || 0) === n0 + 1 && S._tapAtk && near(S._tapAtk.ang, Math.PI) && near(S._tapAtk.ang, tapFacingAngle(S)) && !near(S._tapAtk.ang, toMon), { r, ang: S._tapAtk && S._tapAtk.ang });
  const ra = rangedAimAngle(S, 0, 0);
  check('4' + s + '. ...the shot\'s angle is the facing, never a lock', ra.src !== 'lock' && near(ra.ang, Math.PI) && latchPhase(S) === 'idle', ra);
  press(S, t + 500);
  const n1 = S._tapAttacks;
  check('4' + s + '. a cancelled tap shoots nothing', discLift(S, t + 600, requestTapAttack, true) === null && S._tapAttacks === n1);
}

/* ── 5. the sword keeps its latch whole ── */
{
  const S = page('melee');
  let t = frames(S, 1000, 300);
  check('5. a sword: the disc is a latch, the monster ahead sighted', discKind(S) === 'latch' && sightPhase(S) === 'sighted' && S._sightId === 'm1');
  const p = press(S, t);
  check('5. ...the press locks it (and strikes once)', p === 'lock' && latchPhase(S) === 'active' && S._latchId === 'm1' && (S._tapAttacks || 0) === 1, { p, latch: S._latchPhase });
  t = frames(S, t, autoHoldMs() + 100);
  check('5. ...the hold past the fill: auto-attack on, kept by the frame', latchPhase(S) === 'auto' && S.autoAttack === true, { latch: S._latchPhase, auto: S.autoAttack });
  twoButtonRelease(S, null); discLift(S, t, requestTapAttack, false);
  t = frames(S, t, 300);
  check('5. ...the lift: the fight goes on (auto kept), as today', latchPhase(S) === 'auto' && S.autoAttack === true);
  check('5. ...and its frame is the latch\'s own (red on the lock)', aimMarks(S, { live: true, frame: true, caret: true }).tone === 'lock');
  check('5. ...a drag on a sword\'s press aims nothing here (today\'s slide follows in BroTown)', press(S, t) === 'unlock' && discMove(S, 60, 0, () => { throw new Error('aimed'); }) === null);
}

/* ── 6. `?rangedstick=0` gives today's bow and staff back ── */
for (const slot of ['ranged', 'staff']) {
  address('?rangedstick=0');
  const S = page(slot);
  let t = frames(S, 1000, 300);
  const p = press(S, t);
  check('6. `?rangedstick=0`, ' + slot + ': a latch, and the press locks the monster in sight, as before', discKind(S) === 'latch' && p === 'lock' && latchPhase(S) === 'active' && S._latchId === 'm1', { k: S._discKind, p });
  if (slot === 'ranged') check('6. ...its special flies at the lock, as before', !!bowSpecialMon(S, { type: 'bow' }));
  twoButtonRelease(S, null); discLift(S, t, null, false);
  address('');
}

/* ── 7. modes 0 to 4, and a computer: nothing ── */
{
  const quiet = [];
  for (const m of [0, 1, 2, 3, 4]) {
    setManualCombat(m);
    for (const slot of ['ranged', 'staff', 'melee']) {
      const S = page(slot);
      const before = JSON.stringify(S);
      const f = discFrame(S, 1000, false, slot, 1, VW, VH);
      const p = discPress(S);
      let acted = false;
      const mv = discMove(S, 60, 0, () => { acted = true; });
      const l = discLift(S, 1100, () => { acted = true; }, false);
      if (!(f === null && p === null && mv === null && l === null && !acted && JSON.stringify(S) === before)) quiet.push({ m, slot, f, p, mv, l, acted });
    }
  }
  check('7. modes 0 to 4, all three weapons: nothing written, nothing answered', quiet.length === 0, quiet);
  setManualCombat(5);
  mq.matches = true;   /* a mouse: the two buttons' gate is shut (a computer's keys and mouse do not change) */
  const S = page('ranged');
  const before = JSON.stringify(S);
  let acted = false;
  const ok = !twoButtonsLive() && discPress(S) === null && discFrame(S, 1000, false, 'ranged', 1, VW, VH) === null && discMove(S, 60, 0, () => { acted = true; }) === null && !acted && JSON.stringify(S) === before;
  check('7. a computer (mode 5 with a mouse): nothing written, nothing answered', ok);
  mq.matches = false;
}

/* ── 8. the lift after an aimed hold ── */
for (const slot of ['ranged', 'staff']) {
  const S = page(slot);
  let t = frames(S, 1000, 300);
  press(S, t);
  discMove(S, -40, 20, aimer(S, -40, 20));
  t = frames(S, t, 500);
  const n0 = S._tapAttacks || 0;
  const r = discLift(S, t, requestTapAttack, false);
  t = frames(S, t, 400);
  check('8. ' + slot + ', lifted after aiming: the aim and the held attack let go, no tap\'s shot', r === 'aimed' && S._aiming === false && S.autoAttack === false && (S._tapAttacks || 0) === n0, { r, aiming: S._aiming, auto: S.autoAttack });
  check('8. ...the press is done', discPressNow().kind === null && discMove(S, -40, 20, () => { throw new Error('aimed'); }) === null);
}

/* ── 9. a swap in mid-hold ── */
{
  const S = page('ranged');
  let t = frames(S, 1000, 300);
  press(S, t);
  discMove(S, -50, 0, aimer(S, -50, 0));
  t = frames(S, t, 300);
  S.rpg.activeSlot = 'melee';
  t = frames(S, t, 100);
  check('9. a bow aimed and held, swapped to a sword: the hold ends (aim off, auto-attack off, nothing locked)', discKind(S) === 'latch' && S._aiming === false && S.autoAttack === false && latchPhase(S) === 'idle', { k: S._discKind, aiming: S._aiming, auto: S.autoAttack });
  check('9. ...the press is spent: its drag aims nothing, its lift shoots nothing', discMove(S, -50, 0, () => { throw new Error('aimed'); }) === null && discLift(S, t, () => { throw new Error('tapped'); }, false) === null);
  check('9. ...the next press is the sword\'s (it locks)', press(S, t + 50) === 'lock' && latchPhase(S) === 'active');
  t = frames(S, t + 50, autoHoldMs() + 100);
  check('9. a sword latched and holding (auto)', latchPhase(S) === 'auto' && S.autoAttack === true);
  S.rpg.activeSlot = 'staff';
  t = frames(S, t, 400);
  check('9. ...swapped to a staff: the lock let go, auto-attack off and kept off, nothing sighted', discKind(S) === 'stick' && latchPhase(S) === 'idle' && S._latchId == null && S.autoAttack === false && sightPhase(S) === 'none' && S._latchHoldAt === 0, { latch: S._latchPhase, auto: S.autoAttack, sight: S._sightPhase });
  twoButtonRelease(S, null);
  check('9. ...that press is spent too (no stick drag from a sword\'s press)', discMove(S, 60, 0, () => { throw new Error('aimed'); }) === null && discLift(S, t, () => { throw new Error('tapped'); }, false) === null);
  check('9. ...and the next press is the staff\'s stick', press(S, t + 50) === 'stick');
  discLift(S, t + 60, null, true);
}

/* ── 12. the owner, 16:35: "Make it so bow keeps shooting as long as held
   down, no matter if there's a monster in front or not": the bow's sight
   gate (monsterCombat.js, through freeArrowGo) lets a held stick's arrow go
   with nothing on its line ── */
{
  const S = page('ranged');
  S.monsters = [];   /* nothing anywhere: the line is on nothing */
  let t = frames(S, 1000, 200);
  press(S, t);
  discMove(S, 0, 50, aimer(S, 0, 50));
  t = frames(S, t, 300);
  const n0 = S._freeShots || 0;
  check('12. a bow\'s stick held and aimed at empty ground: the gate lets its arrow go (a free arrow, counted), frame after frame', stickLoose(S) && freeArrowGo(S, false) === true && freeArrowGo(S, false) === true && S._freeShots === n0 + 2, { aiming: S._aiming, auto: S.autoAttack, k: S._discKind });
  discLift(S, t, null, false);
  check('12. ...lifted: the gate holds again (no tap waiting)', !stickLoose(S) && freeArrowGo(S, false) === false);
  press(S, t + 10); discMove(S, 3, 0, aimer(S, 3, 0));
  check('12. ...a thumb inside the dead zone looses nothing by itself', freeArrowGo(S, false) === false);
  discLift(S, t + 20, null, true);
  const St = page('staff'); press(St, 2000); discMove(St, 0, 50, aimer(St, 0, 50)); frames(St, 2000, 100);
  check('12. ...a staff\'s stick is not the bow\'s gate (its bolts have none)', stickLoose(St) === false);
  discLift(St, 2200, null, true);
  setManualCombat(4);
  const M = page('ranged'); M._aiming = true; M.autoAttack = true; M._aimAngle = 1;
  check('12. ...mode 4\'s held bow keeps its gate (no stick there)', freeArrowGo(M, false) === false && stickLoose(M) === false);
  setManualCombat(5);
}

/* ── 10. the one field ── */
{
  /* the module's writes, recorded over every road above (a state that keeps
     the names written) */
  const ALLOW = new Set(['_discKind', '_aiming', 'autoAttack',
    '_latchPhase', '_latchId', '_latchEnd', '_latchAwayAt', '_latchHoldAt', '_sightId', '_sightAt', '_sightPhase',
    '_tapAtk', '_tapAtkWhy', '_aimAngle', '_lastAimAngle', '_aimSrc', '_tapAttacks']);
  const wrote = new Set();
  const rec = (slot, face) => new Proxy(page(slot, face), { set(o, k, v) { wrote.add(String(k)); o[k] = v; return true; } });
  for (const slot of ['ranged', 'staff', 'melee']) {
    const S = rec(slot);
    let t = frames(S, 1000, 300);
    if (discPress(S) !== 'stick') { /* the sword's press is freeAttack's own, not this module's */ }
    discMove(S, 40, 0, () => {}); t = frames(S, t, 700);
    discLift(S, t, requestTapAttack, false);
    discPress(S); discLift(S, t + 50, requestTapAttack, false);
    S.rpg.activeSlot = slot === 'melee' ? 'ranged' : 'melee'; frames(S, t, 200);
    discLook({ getAttribute: () => null, setAttribute() {}, removeAttribute() {} }, S);
  }
  const extra = [...wrote].filter((k) => !ALLOW.has(k));
  check('10. the module writes no field but the kind, the aim, the held attack and the latch\'s, sight\'s and tap\'s own', extra.length === 0, extra);

  /* every write of `_discKind` in src/, off the syntax tree: discKindTo's alone */
  let B = null;
  for (const pkg of ['package.json', 'server/package.json']) {
    try { const req = createRequire(join(ROOT, pkg)); const tr = req('@babel/traverse'); B = { parse: req('@babel/parser').parse, traverse: tr.default || tr, gen: req('@babel/generator') }; break; } catch (e) { /* the next */ }
  }
  check('10. @babel/parser, traverse and generator load (npm install in the root or server/)', !!B);
  if (B) {
    const files = [];
    const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (/\.(js|jsx|mjs)$/.test(n)) files.push(p); } };
    walk(join(ROOT, 'src'));
    const writers = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      if (!src.includes('_discKind')) continue;
      const ast = B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
      const name = (m) => (m && m.type === 'MemberExpression' ? (m.computed ? (m.property.type === 'StringLiteral' ? m.property.value : null) : m.property.name) : null);
      B.traverse(ast, {
        AssignmentExpression(p) { if (name(p.node.left) === '_discKind') { const fn = p.getFunctionParent(); writers.push(relative(ROOT, f) + ' ' + (fn && fn.node.id ? fn.node.id.name : '?')); } },
        UpdateExpression(p) { if (name(p.node.argument) === '_discKind') writers.push(relative(ROOT, f) + ' update'); },
        UnaryExpression(p) { if (p.node.operator === 'delete' && name(p.node.argument) === '_discKind') writers.push(relative(ROOT, f) + ' delete'); },
      });
    }
    check('10. every write of S._discKind in src/ is discKindTo\'s, once', writers.length === 1 && writers[0] === 'src/game/rangedStick.js discKindTo', writers);

    /* ── 11. BroTown's calls ── */
    /* the screens' file that presses the disc, found by system (filesOf.mjs), never by its path */
    const btHit = [...readSystem('ui')].find(([f, src]) => /\.jsx$/.test(f) && src.includes('discPress('));
    const bt = btHit ? btHit[1] : '';
    const ast = B.parse(bt, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
    const gen = (n) => (B.gen.default || B.gen)(n, { comments: false }).code.replace(/\s+/g, ' ');
    const calls = Object.create(null);
    B.traverse(ast, { CallExpression(p) { const c = p.node.callee; if (c.type === 'Identifier' && /^(disc[A-Z]\w*|latchFrame|latchLook|twoButtonPress)$/.test(c.name)) (calls[c.name] = calls[c.name] || []).push(p); } });
    const one = (n) => (calls[n] || []).length === 1 ? calls[n][0] : null;
    const fr = one('discFrame');
    const frC = fr && fr.parentPath.isConditionalExpression() ? fr.parentPath.node : null;
    check('11. the frame: ONE discFrame, behind `twoButtonsLive() ?`, its answer the held attack\'s (`_lw`); no latchFrame left', !!frC && gen(frC.test) === 'twoButtonsLive()' && fr.parentPath.parentPath.isVariableDeclarator() && fr.parentPath.parentPath.node.id.name === '_lw' && !calls.latchFrame, { n: (calls.discFrame || []).length });
    const pr = one('discPress');
    const prIf = pr ? pr.findParent((p) => p.isIfStatement()) : null;
    const prNext = prIf ? prIf.getSibling(prIf.key + 1) : null;
    check('11. the press: `if (discPress(Sb) === \'stick\') return;` right before today\'s pinned press, untouched',
      !!prIf && gen(prIf.node) === "if (discPress(Sb) === 'stick') return;" && !!prNext && prNext.node && gen(prNext.node) === 'if (twoButtonsLive()) { twoButtonPress(Sb, Date.now(), requestTapAttack, rJoyRef.current); return; }' && (calls.twoButtonPress || []).length === 1,
      { at: prIf && gen(prIf.node), next: prNext && prNext.node && gen(prNext.node) });
    const mv = one('discMove');
    const mvFn = mv ? mv.node.arguments[3] : null;
    check('11. the drag: ONE discMove, its aim `(still ? rKnobFollow : rJoyAim)(...)` from the press\'s origin (mode 4\'s stick)',
      !!mvFn && mvFn.type === 'FunctionExpression' && gen(mvFn.body) === '{ (still ? rKnobFollow : rJoyAim)(_tb.clientX, _tb.clientY, bSwipe.sx, bSwipe.sy); }', mvFn && gen(mvFn));
    const lf = calls.discLift || [];
    const lfS = lf.map((p) => gen(p.node));
    const afterRel = lf.find((p) => { const st = p.parentPath; const prev = st.getSibling(st.key - 1); return prev && prev.node && gen(prev.node) === "handleRBtnRelease('b');"; });
    check('11. the lift: after the disc\'s handleRBtnRelease(\'b\'), the tap handed in and the cancel; and the page going away, a cancel',
      lf.length === 2 && !!afterRel && gen(afterRel.node) === 'discLift(stateRef.current, Date.now(), requestTapAttack, _bCancel)' && lfS.includes('discLift(stateRef.current, 0, null, true)'), lfS);
    check('11. the look: ONE discLook, no latchLook left', !!one('discLook') && !calls.latchLook);
  }
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
