/* ═══ v2.3.6649: THE RANGED STICK'S LIFT THE PAGE MISSED (card PAD part 14; src/game/rangedStick.js discLiftMissed) ═══
 *
 * Sitting 73's reviewer, reading #2425 (tag 6648) after it landed: BroTown's
 * Attack lift (bE) returned at `if (!t) return;` -- the lift's touch not in
 * e.changedTouches -- BEFORE the stick's release at its end.  Tag 6548 had
 * moved the latch's release above that lookup ("a 150 ms tap's lift missed it
 * there"); 6648's stick was not moved with it.  So a missed lift left a bow's
 * stick aiming and the bow SHOOTING after the thumb was off, until the next
 * press.  The owner's rule (2026-11-27, about 16:35): "Make it so bow keeps
 * shooting as long as held down" -- as long as HELD: it stops when the thumb
 * lifts, always.
 *
 * Played on the module and the real functions it feeds (latch.js,
 * freeAttack.js, tapJump.js), bE's head run as BroTown runs it (`lift`
 * below), and BroTown's call read off the syntax tree (finish.md part 5,
 * rules 1 and 2: never a pattern of text):
 *
 *   1. A MISSED LIFT (the finger off the screen, its touch not in the
 *      event's list), a bow and a staff, aimed: the aim and the held attack
 *      end, the bow's gate holds (no more free arrows), the knob home ONCE,
 *      no tap's shot                                                (dodge a, b)
 *   2. A FOUND LIFT: the release ONCE (bE's own line at its end), never a
 *      second from here; the aim ends; a tap still shoots once      (dodge c)
 *   3. A CANCEL (touchcancel, found or missed): the aim ends, no shot;
 *      the rule reads no event type, so a pointercancel's is the same (dodge a)
 *   4. ANOTHER FINGER's lift while Attack's is still down: nothing (dodge d)
 *   5. A SWORD: a missed lift is today's, twoButtonRelease's alone (its
 *      auto kept, the fight goes on), nothing from here             (dodge e)
 *   6. THE WIRING in BroTown.jsx: ONE discLiftMissed, in bE, right after the
 *      changedTouches lookup and before `if (!t) return;`, handed `_bGone`
 *      (the finger not in e.touches), `!!t` and handleRBtnRelease('b')  (dodge f)
 *
 * BREAK PROOF (rule 8), each planted and seen RED, 2026-11-27 (a script
 * swapped each line in, ran this suite, put it back):
 *   a. discLiftMissed returning null at once (the old hole)    -> FAIL 1, 1s, 3;
 *   b. its `release()` taken out                               -> FAIL 1, 1s;
 *   c. its `found === true` test taken out (a found lift released twice)
 *                                                              -> FAIL 2, 2s;
 *   d. its `gone !== true` test taken out                      -> FAIL 4;
 *   e. its `_press.kind !== 'stick'` test taken out            -> FAIL 5;
 *   f. BroTown's call moved below `if (!t) return;`            -> FAIL 6.
 */
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { discKind, discPress, discMove, discLift, discLiftMissed, discFrame, stickLoose } from '../../src/game/rangedStick.js';
import { latchPhase, latchHolds, twoButtonsLive, autoHoldMs } from '../../src/game/latch.js';
import { twoButtonPress, twoButtonRelease, freeArrowGo } from '../../src/game/freeAttack.js';
import { requestTapAttack } from '../../src/game/tapJump.js';
import { setManualCombat } from '../../src/game/manualCombat.js';
import { readSystem } from './lib/filesOf.mjs';
import { ROOT } from './lib/fourLines.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* the page: a touch screen, the two buttons */
globalThis.window = globalThis.window || {};
globalThis.window.matchMedia = () => ({ matches: false });
globalThis.location = { search: '' };
setManualCombat(5);

const VW = 800, VH = 600;
function page(slot, east) {
  return {
    player: { x: 0, y: 0 }, _renderFacing: east ? 'east' : 'west', _facingAngle: east ? 0 : Math.PI, _facing: east ? 'right' : 'left',
    monsters: [{ id: 'm1', x: 150, y: 0, alive: true, curHp: 50 }], currentZone: 'wheel',
    rpg: { activeSlot: slot, hp: 100 }, camera: { x: -VW / 2, y: -VH / 2 },
  };
}
function frames(S, t0, ms) {
  let t = t0;
  for (; t <= t0 + ms; t += 50) {
    const lw = twoButtonsLive() ? discFrame(S, t, false, S.rpg.activeSlot, 1, VW, VH) : null;
    if (lw !== null) S.autoAttack = lw;
  }
  return t;
}
/* Attack's press, as bS runs it (the stick first, then today's) */
function press(S, now) {
  if (discPress(S) === 'stick') return 'stick';
  return twoButtonPress(S, now, requestTapAttack, null);
}
/* rJoyAim past the dead zone, as ranged-stick.test's aimer */
const aimer = (S, dx, dy) => (still) => {
  if (still) return;
  const a = Math.atan2(dy, dx);
  S._aimAngle = a; S._lastAimAngle = a; S._aiming = true; S._aimSrc = 'stick'; S.autoAttack = true;
};
/* handleRBtnRelease('b'), counted: the knob home and its two writes (BroTown's) */
function releaser(S) {
  const r = () => { r.n++; S._aiming = false; S.autoAttack = latchHolds(S); };
  r.n = 0;
  return r;
}
/* bE's head and tail, as BroTown runs them (its wiring held in 6); ID the
   finger on Attack; `touches` the fingers still down, `changed` the event's */
const ID = 7;
const has = (list, id) => list.some((x) => x.identifier === id);
function lift(S, type, touches, changed, rel, now) {
  const gone = !has(touches, ID);
  if (twoButtonsLive() && gone) twoButtonRelease(S, null);
  const found = has(changed, ID);
  const r = discLiftMissed(S, gone, found, rel);
  if (!found) return { r, tail: null };
  if (twoButtonsLive()) twoButtonRelease(S, null);
  rel();
  return { r, tail: discLift(S, now, requestTapAttack, type === 'touchcancel') };
}
/* a stick pressed and dragged east, held long enough to be shooting */
function heldStick(slot) {
  const S = page(slot);
  let t = frames(S, 1000, 300);
  press(S, t);
  discMove(S, 60, 0, aimer(S, 60, 0));
  t = frames(S, t, 800);
  return { S, t };
}
const OTHER = { identifier: 3 };

/* ── 1. a missed lift ── */
for (const slot of ['ranged', 'staff']) {
  const s = slot === 'ranged' ? '' : 's';
  const { S, t } = heldStick(slot);
  const shooting = S._aiming === true && S.autoAttack === true && (slot !== 'ranged' || stickLoose(S));
  const rel = releaser(S);
  const n0 = S._tapAttacks || 0;
  /* the move thumb lifts; Attack's finger is gone and its own lift never came */
  const o = lift(S, 'touchend', [], [OTHER], rel, t);
  check('1' + s + '. ' + slot + ' held and shooting, its lift missed: the aim and the held attack end, the knob home once, no tap',
    shooting && o.r === 'missed' && o.tail === null && S._aiming === false && S.autoAttack === false && rel.n === 1 && (S._tapAttacks || 0) === n0,
    { shooting, r: o.r, aiming: S._aiming, auto: S.autoAttack, rel: rel.n });
  if (slot === 'ranged') check('1. ...the bow\'s gate holds: no free arrow after the thumb is off', !stickLoose(S) && freeArrowGo(S, false) === false);
  /* the next event (another lift, the same hole) does nothing more */
  const o2 = lift(S, 'touchend', [], [OTHER], rel, t + 50);
  check('1' + s + '. ...a later lift finds the press spent: no second release', o2.r === null && rel.n === 1);
}

/* ── 2. a found lift ── */
for (const slot of ['ranged', 'staff']) {
  const s = slot === 'ranged' ? '' : 's';
  const { S, t } = heldStick(slot);
  const rel = releaser(S);
  const o = lift(S, 'touchend', [], [{ identifier: ID }], rel, t);
  check('2' + s + '. ' + slot + ', a lift whose touch is found: released ONCE (bE\'s own end), the aim ends',
    o.r === null && o.tail === 'aimed' && rel.n === 1 && S._aiming === false && S.autoAttack === false, { r: o.r, tail: o.tail, rel: rel.n });
  const T = page(slot);
  frames(T, 1000, 300); press(T, 1300);
  const relT = releaser(T);
  const n0 = T._tapAttacks || 0;
  const oT = lift(T, 'touchend', [], [{ identifier: ID }], relT, 1400);
  check('2' + s + '. ...a tap found: one shot, one release', oT.r === null && oT.tail === 'tap' && relT.n === 1 && (T._tapAttacks || 0) === n0 + 1, { r: oT.r, tail: oT.tail, rel: relT.n });
}

/* ── 3. a cancel ── */
{
  const { S, t } = heldStick('ranged');
  const rel = releaser(S);
  const o = lift(S, 'touchcancel', [], [{ identifier: ID }], rel, t);
  check('3. a touchcancel found: the aim ends, the gate holds, one release', o.tail === 'aimed' && rel.n === 1 && !stickLoose(S) && S.autoAttack === false);
  const M = heldStick('ranged');
  const relM = releaser(M.S);
  const oM = lift(M.S, 'touchcancel', [], [], relM, M.t);
  check('3. a touchcancel missed (a pointercancel\'s alike: the rule reads no type): the aim ends, the gate holds', oM.r === 'missed' && relM.n === 1 && !stickLoose(M.S) && M.S.autoAttack === false);
  const T = page('ranged');
  frames(T, 1000, 300); press(T, 1300);
  const n0 = T._tapAttacks || 0;
  lift(T, 'touchcancel', [], [], releaser(T), 1400);
  check('3. a never-aimed press cancelled or missed: no shot', (T._tapAttacks || 0) === n0);
}

/* ── 4. another finger's lift, Attack's still down ── */
{
  const { S, t } = heldStick('ranged');
  const rel = releaser(S);
  const o = lift(S, 'touchend', [{ identifier: ID }], [OTHER], rel, t);
  check('4. the move thumb lifts, Attack\'s finger still down: nothing here, still shooting', o.r === null && rel.n === 0 && S._aiming === true && S.autoAttack === true && stickLoose(S));
  discLift(S, t, null, true);
}

/* ── 5. a sword ── */
{
  const S = page('melee', true);
  let t = frames(S, 1000, 300);
  const p = press(S, t);
  t = frames(S, t, autoHoldMs() + 300);
  const held = S.autoAttack === true && latchPhase(S) === 'auto';
  const rel = releaser(S);
  const o = lift(S, 'touchend', [], [OTHER], rel, t);
  check('5. a sword, held to auto, its lift missed: nothing from here (twoButtonRelease\'s, today\'s), the kind a latch',
    discKind(S) === 'latch' && p !== 'stick' && held && o.r === null && rel.n === 0, { p, held, r: o.r, rel: rel.n });
  t = frames(S, t, 300);
  check('5. ...the latch\'s own release, as today: the fight goes on (auto kept)', latchPhase(S) === 'auto' && S.autoAttack === true, { latch: S._latchPhase, auto: S.autoAttack });
}

/* ── 6. BroTown's call ── */
{
  let B = null;
  for (const pkg of ['package.json', 'server/package.json']) {
    try { const req = createRequire(join(ROOT, pkg)); const tr = req('@babel/traverse'); B = { parse: req('@babel/parser').parse, traverse: tr.default || tr, gen: req('@babel/generator') }; break; } catch (e) { /* the next */ }
  }
  check('6. @babel/parser, traverse and generator load (npm install in the root or server/)', !!B);
  if (B) {
    const hit = [...readSystem('ui')].find(([f, src]) => /\.jsx$/.test(f) && src.includes('discLiftMissed('));
    const ast = B.parse(hit ? hit[1] : '', { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
    const gen = (n) => (B.gen.default || B.gen)(n, { comments: false }).code.replace(/\s+/g, ' ');
    const calls = [];
    B.traverse(ast, { CallExpression(p) { if (p.node.callee.type === 'Identifier' && p.node.callee.name === 'discLiftMissed') calls.push(p); } });
    const c = calls.length === 1 ? calls[0] : null;
    const fn = c ? c.getFunctionParent() : null;
    const fnName = fn && fn.parentPath && fn.parentPath.isVariableDeclarator() ? fn.parentPath.node.id.name : (fn && fn.node.id ? fn.node.id.name : null);
    const st = c ? c.parentPath : null;
    const prev = st ? st.getSibling(st.key - 1) : null;
    const next = st ? st.getSibling(st.key + 1) : null;
    check('6. ONE discLiftMissed, in bE, its four arguments the finger gone, the touch found and the knob home',
      !!c && fnName === 'bE' && gen(c.node) === "discLiftMissed(stateRef.current, _bGone, !!t, function () { handleRBtnRelease('b'); })",
      { n: calls.length, fnName, at: c && gen(c.node) });
    check('6. ...right after `var t = findT(e.changedTouches, ...)` and right before `if (!t) return;`',
      !!prev && !!prev.node && gen(prev.node) === 'var t = findT(e.changedTouches, bTouchId.current);' && !!next && !!next.node && gen(next.node) === 'if (!t) return;',
      { prev: prev && prev.node && gen(prev.node), next: next && next.node && gen(next.node) });
    let gone = null;
    if (fn) fn.traverse({ VariableDeclarator(p) { if (p.node.id.name === '_bGone') gone = gen(p.node.init); } });
    check('6. ...`_bGone` is Attack\'s finger not in e.touches (6548\'s own test)', gone === '!findT(e.touches || [], bTouchId.current)', gone);
  }
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
