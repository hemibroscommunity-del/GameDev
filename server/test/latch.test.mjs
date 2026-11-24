/* ═══ v2.3.6540: THE ATTACK LATCH (card CT PR 1; src/game/latch.js) ═══
 *
 * The two buttons (`?manual=5`, a trial).  The owner, 2026-11-23: "when
 * pressed it stays activated until out of range or the button is pressed
 * again ... It will lock on target while combat is active."  What it does,
 * played on the module itself:
 *
 *   1. A PRESS with a monster sighted locks it (active); with none sighted
 *      it is ONE attack the way the body faces, and the latch stays idle;
 *   2. THE FIVE ENDS: pressed again ('press'); the target past the out range
 *      ('range': the sword's 440 held out to 550, so 549 holds and 551
 *      ends); the target dead with none other sighted ('killed'); your death
 *      ('death'); a change of place or a rejoin ('zone');
 *   3. THE MOVE: the target dead with others sighted, the lock moves to the
 *      NEAREST of them, still active, with no new press;
 *   4. THE DOOR: latchTo writes the phase and its notes, refuses an unknown
 *      end or an empty id, and no write of S._latchPhase in src/ is outside
 *      it (the phase table's guard reads the same off the syntax tree).
 *
 * Break proof, tried by hand: `if (next) { ... }` -> `if (false)` in
 * latchCheck -> FAIL 3; `S._latchPhase = 'idle';` in latchClear -> FAIL 4
 * (and the guard's §2).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { LATCH_PHASES, LATCH_ENDS, latchPhase, latchTo, latchPress, latchCheck, latchClear } from '../../src/game/latch.js';
import { sightRange, SIGHT_PHASES } from '../../src/game/sight.js';
import { STICK_PHASES } from '../../src/game/stickZones.js';   /* v2.3.6540: G2 below */
import { PHASES } from '../../src/state/phases.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const OUT = sightRange('melee').out;
const locked = (id = 'a') => { const S = {}; latchPress(S, id); return S; };

/* ── 1. a press ── */
{
  const S = {};
  check('1. nothing written: idle', latchPhase(S) === 'idle' && LATCH_PHASES.join() === 'idle,active');
  check('1. a press with nothing sighted: one attack, still idle', latchPress(S, null) === 'once' && latchPhase(S) === 'idle' && !S._latchPhase);
  check('1. a press with a monster sighted: locked, active', latchPress(S, 'm7') === 'lock' && latchPhase(S) === 'active' && S._latchId === 'm7');
  check('1. while locked, a frame in range holds it', latchCheck(S, { alive: true, d: 300 }, OUT, []) === null && S._latchId === 'm7');
}

/* ── 2. the five ends ── */
{
  check('2. there are five, named', LATCH_ENDS.join() === 'press,range,killed,death,zone');
  const a = locked();
  check('2. press: pressed again lets go', latchPress(a, 'b') === 'unlock' && latchPhase(a) === 'idle' && a._latchEnd === 'press' && a._latchId === null);
  const b = locked();
  check('2. range: 549 holds (the sword\'s 550)', latchCheck(b, { alive: true, d: 549 }, OUT, []) === null && latchPhase(b) === 'active');
  { const e = locked();
    check('2. range: exactly 550 holds (the gatekeeper\'s sitting 56, L2)', latchCheck(e, { alive: true, d: 550 }, OUT, []) === null && latchPhase(e) === 'active');
    check('2. range: a distance that is not a number lets go', latchCheck(e, { alive: true, d: NaN }, OUT, []) === 'range' && latchPhase(e) === 'idle'); }
  check('2. range: 551 lets go', latchCheck(b, { alive: true, d: 551 }, OUT, []) === 'range' && latchPhase(b) === 'idle' && b._latchEnd === 'range');
  const bow = locked();
  check('2. range: a bow\'s target holds to 825 (its out)', latchCheck(bow, { alive: true, d: 820 }, sightRange('ranged').out, []) === null && latchCheck(bow, { alive: true, d: 830 }, sightRange('ranged').out, []) === 'range');
  const c = locked();
  check('2. killed: the target dead, none other sighted', latchCheck(c, { alive: false, d: 50 }, OUT, []) === 'killed' && latchPhase(c) === 'idle' && c._latchEnd === 'killed');
  const c2 = locked();
  check('2. killed: the target gone from the world counts as dead', latchCheck(c2, null, OUT, []) === 'killed');
  const d = locked();
  check('2. death: your death lets go', latchClear(d, 'death') === true && latchPhase(d) === 'idle' && d._latchEnd === 'death');
  const e = locked();
  check('2. zone: a change of place lets go', latchClear(e, 'zone') === true && latchPhase(e) === 'idle' && e._latchEnd === 'zone');
  check('2. a clear when idle writes nothing', latchClear({}, 'zone') === false);
  const f = locked();
  latchPress(f, null);
  check('2. after an end, the next press with something sighted locks again', latchPress(f, 'z') === 'lock' && f._latchId === 'z' && f._latchEnd === null);
}

/* ── 3. the move ── */
{
  const S = locked('a');
  const r = latchCheck(S, { alive: false, d: 40 }, OUT, [{ id: 'far', d: 400 }, { id: 'near', d: 120 }, { id: 'a', d: 40 }]);
  check('3. the target dies with others sighted: the lock moves to the nearest, no new press', r === 'moved' && latchPhase(S) === 'active' && S._latchId === 'near', [r, S]);
  check('3. ...and holds on it', latchCheck(S, { alive: true, d: 120 }, OUT, []) === null && S._latchId === 'near');
  const T = locked('a');
  check('3. the dead one itself is never the next', latchCheck(T, { alive: false, d: 40 }, OUT, [{ id: 'a', d: 10 }]) === 'killed');
}

/* ── 4. the door ── */
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
  check('4. latchTo refuses an empty id', latchTo(S, 'active', '') === false && latchTo(S, 'active', null) === false && !S._latchPhase);
  check('4. ...a word not of its list', latchTo(S, 'on', 'a') === false && !S._latchPhase);
  latchTo(S, 'active', 'a');
  check('4. ...an end not of its list', latchTo(S, 'idle', null, 'bored') === false && latchPhase(S) === 'active');
  const w = writesOutside('_latchPhase', 'src/game/latch.js', 'latchTo');
  check('4. latchTo writes the phase (active, idle)', w.inDoorWrites === 2, w.inDoorWrites);
  check('4. no write of S._latchPhase in src/ outside latchTo', w.outside.length === 0, w.outside);
}

/* v2.3.6540 (the gatekeeper's sitting 56, G2): the phase table's states are the modules' own lists */
for (const [name, list] of [['latch', LATCH_PHASES], ['sight', SIGHT_PHASES], ['stick', STICK_PHASES]]) {
  const row = PHASES.find((p) => p.name === name && p.side === 'page');
  check('G2. the phase table\'s ' + name + ' row holds the module\'s states', !!row && JSON.stringify(row.states) === JSON.stringify(list), row && row.states);
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
