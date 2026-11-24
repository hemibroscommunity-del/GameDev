/* ═══ v2.3.6547: THE FREE ARROW AND THE SWORD THAT STAYS (card CT item 8; src/game/freeAttack.js) ═══
 *
 * The two buttons (`?manual=5`).  The owner, 2026-11-24: "I want arrows to be
 * able to shoot whenever the line of site is aimed at" and "I want to change
 * the melee behavior so that it doesn't jump to every monster".  Played on the
 * module itself, and its two calls read off the syntax tree:
 *
 *   1. THE SWITCHES: `?freefire=0` and `?meleestay=0` throw them (the row's
 *      one form, as `?rimsprint`'s); absent, `=1`, or the name inside a
 *      longer one do not;
 *   2. THE GATE'S RULE (freeArrow): an arrow with nothing on its line only for
 *      Attack's waiting tap, in the two buttons, with the switch on: every
 *      other of the eight, and a truthy stand-in for any of the three, is no;
 *   3. THE GATE'S CALL (freeArrowGo): in mode 5 a waiting tap is a yes and is
 *      counted (S._freeShots); no tap, mode 4, or `?freefire=0`: no, uncounted;
 *   4. THE LUNGE'S RULE (latchLunge): only with the stay switched off, the two
 *      buttons, the latch active, a sword, the latch's lock written;
 *   5. THE LUNGE'S CALL (latchLungeGo): the stay on (the default) never asks the
 *      dash; `?meleestay=0` asks it and returns its true, a refusal or a throw
 *      is no; a bow's latch, an idle latch or no lock never asks;
 *   6. THE TWO CALLS, off the syntax tree (found by system, filesOf.mjs): the
 *      monsters' loop's bow gate, its `!_sightOn && !_mcFire` branch, is
 *      `_mayLoose = freeArrowGo(S, _tapAtkNow)` (no: the arrow held back as
 *      before), and the screens ask latchLungeGo(S, maybeSwordDash) once,
 *      inside the latch frame's `_lw !== null` branch.
 *
 * A guard under tools/guards (server/test/run.mjs runs it; nothing deploys).
 *
 * Break proof, tried by hand (v2.3.6547): freeArrow's `tapNow === true`
 * dropped -> FAIL 2; `stay === false` -> `!stay` -> FAIL 4 (undefined);
 * the gate's `_mayLoose = freeArrowGo(...)` back to `false` -> FAIL 6a;
 * latchLungeGo's call moved out of the `_lw !== null` branch -> FAIL 6b.
 */
import { readSystem } from './lib/filesOf.mjs';
import { createRequire } from 'node:module';
import { freeFireOn, meleeStayOn, freeArrow, freeArrowGo, latchLunge, latchLungeGo } from '../../src/game/freeAttack.js';
import { latchPress, latchClear } from '../../src/game/latch.js';
import { setManualCombat } from '../../src/game/manualCombat.js';

let failures = 0, passes = 0;
const check = (name, ok, detail) => {
  if (ok) { passes++; console.log('  ok   ' + name); }
  else { failures++; console.log('  FAIL ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
};

/* 1. the switches */
for (const [fn, name] of [[freeFireOn, 'freefire'], [meleeStayOn, 'meleestay']]) {
  check(`1. ${name}: on with no address, '', '?${name}=1', '?x${name}=0'`, fn('') === true && fn(`?${name}=1`) === true && fn(`?x${name}=0`) === true && fn('?manual=5') === true);
  check(`1. ${name}: off with =0 (alone and beside another), the row's one form`, fn(`?${name}=0`) === false && fn(`?manual=5&${name}=0`) === false);
}

/* 2. the gate's rule */
{
  const B = [true, false];
  let only = 0, wrong = [];
  for (const a of B) for (const b of B) for (const c of B) {
    const r = freeArrow(a, b, c);
    if (r === true) only++;
    if (r !== (a && b && c)) wrong.push([a, b, c, r]);
  }
  check('2. freeArrow: yes only for (tap, two buttons, on)', only === 1 && wrong.length === 0 && freeArrow(true, true, true) === true, wrong);
  check('2. freeArrow: a truthy stand-in is no (1, \'x\', {})', freeArrow(1, true, true) === false && freeArrow(true, 'x', true) === false && freeArrow(true, true, {}) === false);
}

/* 3. the gate's call */
{
  setManualCombat(5);
  const S = {};
  check('3. freeArrowGo: mode 5, a waiting tap: yes, counted', freeArrowGo(S, true) === true && S._freeShots === 1, S);
  check('3. freeArrowGo: no tap: no, not counted', freeArrowGo(S, false) === false && S._freeShots === 1, S);
  check('3. freeArrowGo: no state: still the rule (no throw)', freeArrowGo(null, true) === true);
  globalThis.location = { search: '?manual=5&freefire=0' };
  check('3. freeArrowGo: ?freefire=0: no, not counted', freeArrowGo(S, true) === false && S._freeShots === 1, S);
  delete globalThis.location;
  setManualCombat(4);
  check('3. freeArrowGo: mode 4: no, not counted', freeArrowGo(S, true) === false && S._freeShots === 1, S);
  setManualCombat(5);
}

/* 4. the lunge's rule */
{
  const yes = ['active', 'melee', true, true, false];
  check('4. latchLunge: the stay off, the two buttons, active, a sword, locked: yes', latchLunge(...yes) === true);
  const bad = [
    ['idle', 'melee', true, true, false], ['active', 'ranged', true, true, false], ['active', 'staff', true, true, false],
    ['active', 'melee', false, true, false], ['active', 'melee', true, false, false], ['active', 'melee', true, true, true],
    ['active', 'melee', true, true, undefined], ['active', 'melee', 1, true, false], ['active', 'melee', true, 1, false], ['active', 'melee', true, true, 0],
  ];
  const wrong = bad.filter((a) => latchLunge(...a) !== false);
  check('4. latchLunge: every other is no (idle, a bow, a staff, no lock, mode off, the stay on or unsaid, truthy stand-ins)', wrong.length === 0, wrong);
}

/* 5. the lunge's call */
{
  setManualCombat(5);
  let asked = 0;
  const dash = (r) => () => { asked++; if (r === 'throw') throw new Error('no'); return r; };
  const mk = (slot) => { const S = { rpg: { activeSlot: slot } }; latchPress(S, 'm1'); S.lockedTarget = { type: 'monster', id: 'm1', ref: { id: 'm1' }, latch: true }; return S; };
  check('5. latchLungeGo: the stay on (the default): the dash never asked', latchLungeGo(mk('melee'), dash(true)) === false && asked === 0, { asked });
  globalThis.location = { search: '?manual=5&meleestay=0' };
  check('5. latchLungeGo: ?meleestay=0: the dash asked, its true returned', latchLungeGo(mk('melee'), dash(true)) === true && asked === 1, { asked });
  check('5. latchLungeGo: ?meleestay=0: a refusal (false), a truthy non-true, a throw: no', latchLungeGo(mk('melee'), dash(false)) === false && latchLungeGo(mk('melee'), dash(1)) === false && latchLungeGo(mk('melee'), dash('throw')) === false && asked === 4, { asked });
  asked = 0;
  const idle = mk('melee'); latchClear(idle, 'press');
  const noLock = mk('melee'); noLock.lockedTarget = null;
  const notLatch = mk('melee'); notLatch.lockedTarget = { type: 'monster', id: 'm1', ref: { id: 'm1' } };
  check('5. latchLungeGo: ?meleestay=0 but a bow, an idle latch, no lock, a lock not the latch\'s, no dash: never asked', latchLungeGo(mk('ranged'), dash(true)) === false && latchLungeGo(idle, dash(true)) === false && latchLungeGo(noLock, dash(true)) === false && latchLungeGo(notLatch, dash(true)) === false && latchLungeGo(mk('melee'), null) === false && latchLungeGo(null, dash(true)) === false && asked === 0, { asked });
  setManualCombat(4);
  check('5. latchLungeGo: ?meleestay=0 in mode 4: never asked', latchLungeGo(mk('melee'), dash(true)) === false && asked === 0, { asked });
  delete globalThis.location;
  setManualCombat(5);
}

/* 6. the two calls, off the syntax tree (found by system: the monsters' loop
   and the screens; tools/guards/lib/filesOf.mjs) */
{
  let B = null;
  for (const pkg of ['package.json', 'server/package.json']) {
    try { const req = createRequire(new URL('../../' + pkg, import.meta.url)); const tr = req('@babel/traverse'); B = { parse: req('@babel/parser').parse, traverse: tr.default || tr, gen: req('@babel/generator') }; break; } catch (e) { /* the next */ }
  }
  check('6. @babel/parser, traverse and generator load (npm install in the root or server/)', !!B);
  if (B) {
    const gen = (n) => (B.gen.default || B.gen)(n, { comments: false }).code.replace(/\s+/g, ' ');
    const calls = (system, name) => {
      const out = [];
      for (const [file, src] of readSystem(system)) {
        if (!/\.(js|jsx|mjs)$/.test(file) || !src.includes(name + '(')) continue;
        const ast = B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
        B.traverse(ast, { CallExpression(p) { const c = p.node.callee; if (c.type === 'Identifier' && c.name === name) out.push(p); } });
      }
      return out;
    };
    /* 6a: the bow's gate: `_mayLoose = freeArrowGo(S, _tapAtkNow)` in the
       `!_sightOn && !_mcFire` branch (the else of the special's) */
    const g = calls('monsters', 'freeArrowGo');
    const gAs = g.length === 1 ? g[0].parentPath : null;
    const gIf = g.length === 1 ? g[0].findParent((p) => p.isIfStatement()) : null;
    const gTest = gIf ? gen(gIf.node.test) : null;
    const gElse = gIf && gIf.parentPath && gIf.parentPath.isIfStatement() ? gen(gIf.parentPath.node.test) : null;
    check('6a. the monsters\' loop: ONE call, `_mayLoose = freeArrowGo(S, _tapAtkNow)` in the bow gate\'s `!_sightOn && !_mcFire`, the else of the special\'s branch',
      g.length === 1 && !!gAs && gAs.isAssignmentExpression() && gen(gAs.node) === '_mayLoose = freeArrowGo(S, _tapAtkNow)' && gTest === '!_sightOn && !_mcFire' && gElse === '_sightOn && S._bowSpecialQueued', { n: g.length, as: gAs && gen(gAs.node), gTest, gElse });
    /* 6b: the frame's lunge */
    const l = calls('ui', 'latchLungeGo');
    const lIf = l.length === 1 ? l[0].findParent((p) => p.isIfStatement()) : null;
    check('6b. the screens: ONE call, latchLungeGo(S, maybeSwordDash), inside the latch frame\'s `_lw !== null`',
      l.length === 1 && gen(l[0].node) === 'latchLungeGo(S, maybeSwordDash)' && !!lIf && gen(lIf.node.test) === '_lw !== null', { n: l.length, call: l[0] && gen(l[0].node), test: lIf && gen(lIf.node.test) });
  }
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
