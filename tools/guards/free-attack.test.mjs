/* ═══ v2.3.6547: THE FREE ARROW AND THE PRESS THAT STAYS (card CT item 8; src/game/freeAttack.js) ═══
 *
 * The two buttons (`?manual=5`).  The owner, 2026-11-24: "I want arrows to be
 * able to shoot whenever the line of site is aimed at" and "I want to change
 * the melee behavior so that it doesn't jump to every monster".  Played on the
 * module itself, and its calls read off the syntax tree:
 *
 *   1. THE SWITCH: `?freefire=0` throws it (the row's one form, as
 *      `?rimsprint`'s); absent, `=1`, or the name inside a longer one do not;
 *   2. THE GATE'S RULE (freeArrow): an arrow with nothing on its line only for
 *      Attack's waiting tap, in the two buttons, with the switch on: every
 *      other of the eight, and a truthy stand-in for any of the three, is no;
 *   3. THE GATE'S CALL (freeArrowGo): in mode 5 a waiting tap is a yes and is
 *      counted (S._freeShots); no tap, mode 4, or `?freefire=0`: no, uncounted;
 *   4. THE PRESS (twoButtonPress), played: a sword and a monster 240 px ahead
 *      locks it and moves NOTHING (the player untouched, no dash, nothing
 *      written but the latch's and the sight's notes and the held attack);
 *      again lets go; nothing in sight is the tap's one attack; mode 4 nothing;
 *   5. THE PRESS'S ROAD, off the syntax tree: it calls only the latch's press
 *      and the tap it is handed (the orchestrator, 2026-11-24: "so a later
 *      part cannot wire the dash to Attack unseen");
 *   6. THE TWO CALLS, off the syntax tree (found by system, filesOf.mjs): the
 *      monsters' loop's bow gate, its `!_sightOn && !_mcFire` branch, is
 *      `_mayLoose = freeArrowGo(S, _tapAtkNow)` (no: the arrow held back as
 *      before), and the screens' Attack press in the two buttons is the one
 *      call `twoButtonPress(Sb, Date.now(), requestTapAttack); return;`.
 *
 * A guard under tools/guards (server/test/run.mjs runs it; nothing deploys).
 *
 * Break proof, tried by hand (v2.3.6547): freeArrow's `tapNow === true`
 * dropped -> FAIL 2; the gate's `_mayLoose = freeArrowGo(...)` back to `false`
 * -> FAIL 6a; `maybeSwordDash(S)` added to twoButtonPress -> FAIL 5; the
 * screens' branch gaining a call beside it -> FAIL 6b; `S.player.x += 1` in
 * twoButtonPress -> FAIL 4b.
 */
import { readFileSync } from 'node:fs';
import { readSystem } from './lib/filesOf.mjs';
import { createRequire } from 'node:module';
import { freeFireOn, freeArrow, freeArrowGo, twoButtonPress } from '../../src/game/freeAttack.js';
import { setManualCombat } from '../../src/game/manualCombat.js';

let failures = 0, passes = 0;
const check = (name, ok, detail) => {
  if (ok) { passes++; console.log('  ok   ' + name); }
  else { failures++; console.log('  FAIL ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
};

/* 1. the switches */
for (const [fn, name] of [[freeFireOn, 'freefire']]) {
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

/* 4. THE PRESS (twoButtonPress): played with a sword, a monster 240 px ahead */
{
  setManualCombat(5);
  const page = (slot, mons) => ({ player: { x: 100, y: 100 }, _renderFacing: 'east', monsters: mons, currentZone: 'wheel', rpg: { activeSlot: slot } });
  const mon = () => ({ id: 'm1', x: 340, y: 100, alive: true, curHp: 40 });
  const taps = [];
  const tap = (S, now) => { taps.push(now); };
  const S = page('melee', [mon()]);
  const before = JSON.stringify(S.player);
  const r1 = twoButtonPress(S, 1000, tap);
  check('4a. a sword, a monster in sight 240 px ahead: the press locks (\'lock\', the latch active on it, the held attack on), no tap',
    r1 === 'lock' && S._latchPhase === 'active' && S._latchId === 'm1' && S.autoAttack === true && taps.length === 0, { r1, ph: S._latchPhase, id: S._latchId, auto: S.autoAttack });
  /* the road moves nothing: the body, its speed, no dash, no lunge, no ability */
  const moved = JSON.stringify(S.player) !== before;
  const extra = Object.keys(S).filter((k) => !['player', '_renderFacing', 'monsters', 'currentZone', 'rpg', 'autoAttack'].includes(k) && !/^_(latch|sight)/.test(k));
  check('4b. ...and nothing moves the body: the player untouched, no dash (S._bashDash), nothing written but the latch\'s and the sight\'s notes and the held attack',
    !moved && S._bashDash === undefined && extra.length === 0, { moved, extra });
  const r2 = twoButtonPress(S, 1100, tap);
  check('4c. again: let go (\'unlock\', idle, the held attack off)', r2 === 'unlock' && S._latchPhase === 'idle' && S.autoAttack === false, { r2 });
  const E = page('ranged', []);
  const r3 = twoButtonPress(E, 1200, tap);
  check('4d. nothing in sight: the tap\'s one attack the way the body faces (handed the state and the time), the latch idle', r3 === 'once' && taps.length === 1 && taps[0] === 1200 && E._latchPhase !== 'active' && E.autoAttack === undefined, { r3, taps });
  check('4e. nothing in sight and no tap handed: no throw', twoButtonPress(page('ranged', []), 1300) === 'once');
  setManualCombat(4);
  const F = page('melee', [mon()]);
  check('4f. mode 4: the press does nothing (null), no tap, no latch', twoButtonPress(F, 1400, tap) === null && taps.length === 1 && F._latchPhase === undefined && F.autoAttack === undefined);
  setManualCombat(5);
}

/* 5. THE PRESS'S ROAD, off the syntax tree: twoButtonPress calls only the
   latch's press and the tap it is handed (a dash, a cast, a walk wired to
   Attack would be a new callee here) */
{
  const src = readFileSync(new URL('../../src/game/freeAttack.js', import.meta.url), 'utf8');
  let B5 = null;
  for (const pkg of ['package.json', 'server/package.json']) {
    try { const req = createRequire(new URL('../../' + pkg, import.meta.url)); const tr = req('@babel/traverse'); B5 = { parse: req('@babel/parser').parse, traverse: tr.default || tr }; break; } catch (e) { /* the next */ }
  }
  if (B5) {
    const ast = B5.parse(src, { sourceType: 'module' });
    const callees = [];
    B5.traverse(ast, { FunctionDeclaration(p) { if (p.node.id.name !== 'twoButtonPress') return; p.traverse({ CallExpression(q) { const c = q.node.callee; callees.push(c.type === 'Identifier' ? c.name : c.type); } }); } });
    check('5. twoButtonPress calls only latchAttackPress and the tap handed in', callees.length === 2 && callees.includes('latchAttackPress') && callees.includes('tap'), callees);
  } else check('5. @babel/parser loads', false);
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
    /* 6b: Attack's press in the two buttons: ONE call, the whole branch */
    const l = calls('ui', 'twoButtonPress');
    const lIf = l.length === 1 ? l[0].findParent((p) => p.isIfStatement()) : null;
    check('6b. the screens: ONE call, `if (twoButtonsLive()) { twoButtonPress(Sb, Date.now(), requestTapAttack); return; }` (the press\'s whole road; a dash beside it would show)',
      l.length === 1 && !!lIf && gen(lIf.node.test) === 'twoButtonsLive()' && gen(lIf.node.consequent) === '{ twoButtonPress(Sb, Date.now(), requestTapAttack); return; }', { n: l.length, test: lIf && gen(lIf.node.test), body: lIf && gen(lIf.node.consequent) });
  }
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
