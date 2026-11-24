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
 *   H. THE ONE GATE (v2.3.6542, the gatekeeper's sitting 60): a mouse on a
 *      touch screen in mode 5, Attack's press latches nothing (null, idle),
 *      the same press with the touch pointer locks; mode 4 latches nothing;
 *      and every caller of twoButtonsOn in src/ is read off the syntax tree
 *      against an ALLOW list (the gate itself; a new site asking it alone,
 *      or under another name, goes red).
 *
 * H's break proof, tried by hand (v2.3.6542): BroTown.jsx's Attack press
 * back to `twoButtonsOn()` -> FAIL H2; `import { twoButtonsOn as tb }` in
 * targeting.js -> FAIL H2; latchAttackPress's gate line taken out -> FAIL
 * H1; twoButtonsLive returning twoButtonsOn() alone -> FAIL H1.
 *
 * Break proof, tried by hand: `if (next) { ... }` -> `if (false)` in
 * latchCheck -> FAIL 3; `S._latchPhase = 'idle';` in latchClear -> FAIL 4
 * (and the guard's §2).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { LATCH_PHASES, LATCH_ENDS, latchPhase, latchTo, latchPress, latchCheck, latchClear, latchFrame, latchAttackPress, latchHolds, latchLook, sightNow, twoButtonsLive } from '../../src/game/latch.js';   /* v2.3.6542: + the wiring (card CT PR 3) */
import { sightRange, SIGHT_PHASES, SIGHT, sightPhase, sightPick, drawnFace } from '../../src/game/sight.js';
import { STICK_PHASES } from '../../src/game/stickZones.js';   /* v2.3.6540: G2 below */
import { PHASES } from '../../src/state/phases.js';
import { setManualCombat } from '../../src/game/manualCombat.js';   /* v2.3.6542: H below */
import { createRequire } from 'node:module';
setManualCombat(5);   /* v2.3.6542: the press asks the gate itself: this suite plays mode 5 on a touch screen (no window: no mouse) */

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

/* ═══ v2.3.6542: 5. WIRED (card CT PR 3): the frame, the press, the ends, the move ═══
   A page's state as the step `input` sees it: you at (0, 0) facing east, the
   monsters in S.monsters.  latchFrame's answer is the held attack
   (S.autoAttack): true attacking, false let go, null nothing to say. */
{
  const mon = (id, x, y = 0, alive = true) => ({ id, x, y, alive });
  const page = (mons) => ({ player: { x: 0, y: 0 }, _renderFacing: 'east', monsters: mons, currentZone: 'wheel' });
  let t = 1000;
  const frame = (S, dead, slot) => latchFrame(S, (t += 50), !!dead, slot || 'melee', 1);

  /* 5a. a whole fight with two presses: sighted, Attack locks, attacks to the end */
  {
    const a = mon('a', 300), S = page([a]);
    check('5a. a monster ahead in range: sighted, the latch idle, nothing said', frame(S) === null && sightPhase(S) === 'sighted' && latchPhase(S) === 'idle');
    check('5a. Attack pressed: locked on it', latchAttackPress(S) === 'lock' && latchPhase(S) === 'active' && S._latchId === 'a');
    check('5a. a frame while locked: attacking', frame(S) === true);
    S._renderFacing = 'west';
    check('5a. the drawn facing turned away: still locked (the lock is not the cone\'s)', frame(S) === true && S._latchId === 'a');
    S._renderFacing = 'east';
    check('5a. Attack again: let go (\'press\'), the next frame idle', latchAttackPress(S) === 'unlock' && S._latchEnd === 'press' && frame(S) === null);
  }
  /* 5b. its end at the range's edge: 550 holds, past it lets go, once */
  {
    const a = mon('a', 300), S = page([a]);
    frame(S); latchAttackPress(S);
    a.x = 550;
    check('5b. walked out to 550: held', frame(S) === true);
    a.x = 551;
    check('5b. at 551: let go (\'range\') -- the held attack false once', frame(S) === false && S._latchEnd === 'range' && latchPhase(S) === 'idle');
    check('5b. ...then nothing said (no write a frame)', frame(S) === null);
    a.x = 440; frame(S);
    check('5b. back in at 440: sighted again, the latch waits for a press', latchPhase(S) === 'idle' && sightPhase(S) === 'sighted');
  }
  /* 5c. its death: the lock moves to the nearest other in sight, no new press */
  {
    const a = mon('a', 300, 40), b = mon('b', 200, 20), c = mon('c', 400, -10), S = page([a, b, c]);
    frame(S); latchAttackPress(S);
    check('5c. three ahead: the one nearest the facing\'s line locked', S._latchId === 'c', S._latchId);
    c.alive = false;
    check('5c. it dies: the lock moves to the nearest other in sight (b), still attacking', frame(S) === true && S._latchId === 'b' && latchPhase(S) === 'active');
    b.curHp = 0;
    check('5c. at 0 hp it counts as dead: moves to a', frame(S) === true && S._latchId === 'a');
    S.monsters = [b];
    check('5c. gone from the list, none other in sight: let go (\'killed\')', frame(S) === false && S._latchEnd === 'killed');
  }
  /* 5d. none other IN SIGHT: one behind you does not take the lock */
  {
    const a = mon('a', 300), behind = mon('z', -100), S = page([a, behind]);
    frame(S); latchAttackPress(S); a.alive = false;
    check('5d. the last ahead dies, one behind: let go, not moved', frame(S) === false && S._latchEnd === 'killed' && S._latchId === null);
  }
  /* 5e. your death, a change of place */
  {
    const a = mon('a', 300), S = page([a]);
    frame(S); latchAttackPress(S);
    check('5e. your death: let go (\'death\'), nothing in sight', frame(S, true) === false && S._latchEnd === 'death' && sightPhase(S) === 'none');
    frame(S); latchAttackPress(S);
    S.currentZone = 'dungeon';
    check('5e. a change of place: let go (\'zone\')', frame(S) === false && S._latchEnd === 'zone');
    S.currentZone = 'wheel'; frame(S); latchAttackPress(S); S._zoneLoading = true;
    check('5e. a zone loading: let go (\'zone\')', frame(S) === false && S._latchEnd === 'zone');
  }
  /* 5f. a press with nothing in sight NOW: one attack -- never the 400 ms hold's kept id (the gatekeeper's sitting 56) */
  {
    const a = mon('a', 300), S = page([a]);
    frame(S);
    S._renderFacing = 'west'; frame(S);
    check('5f. turned away: the sight held a while (its kept id)', sightPhase(S) === 'sighted' && S._sightId === 'a');
    check('5f. ...and a press there is one attack, not a lock', latchAttackPress(S) === 'once' && latchPhase(S) === 'idle');
    const E = page([]);
    check('5f. nothing at all: one attack', latchAttackPress(E) === 'once');
  }
  /* 5g. the attack held off and taken up again: the shield, a harvest, a climb, a swim */
  {
    const a = mon('a', 300), S = page([a]);
    frame(S); latchAttackPress(S);
    for (const [k, v] of [['_shieldUp', true], ['_extraction', {}], ['_climb', {}], ['_wheelSwim', { on: true }]]) {
      S[k] = v;
      const off = frame(S) === false && latchHolds(S) === false && latchPhase(S) === 'active';
      S[k] = k === '_wheelSwim' ? { on: false } : null;
      check('5g. ' + k + ': the attack held off, the latch kept; then taken up again', off && frame(S) === true && latchHolds(S) === true);
    }
    check('5g. idle: latchHolds is false (a lift in any other mode lets go as it did)', latchHolds({}) === false && latchHolds(null) === false);
  }
  /* 5h. a bow's range */
  {
    const a = mon('a', 600), S = page([a]);
    check('5h. 600 away: a sword sees nothing, a bow sees it', (frame(S, false, 'melee'), sightPhase(S) === 'none') && (frame(S, false, 'ranged'), sightPhase(S) === 'sighted'));
    latchAttackPress(S);
    a.x = 826;
    check('5h. the bow\'s lock holds to 825, lets go past it', S._latchId === 'a' && (a.x = 825, frame(S, false, 'ranged') === true) && (a.x = 826, frame(S, false, 'ranged') === false));
  }
  /* 5i. the drawn facing, and no garbage a frame */
  {
    check('5i. the drawn facing: the renderer\'s word, else the turn, else south',
      drawnFace({ _renderFacing: 'north' }) === -Math.PI / 2 && drawnFace({ _renderFacing: 'west' }) === Math.PI
      && drawnFace({ _facingAngle: 1 }) === 1 && drawnFace({}) === Math.PI / 2 && drawnFace({ _renderFacing: '__proto__', _facingAngle: 2 }) === 2);
    const R = sightRange('melee'), me = { x: 0, y: 0 }, L = [mon('a', 100)];
    check('5i. the pick is one object, reused (no garbage a frame)', sightPick(me, 0, L, R, null) === sightPick(me, 0, L, R, null));
    const S = page([mon('a', 300)]);
    check('5i. sightNow reads the page', sightNow(S) && sightNow(S).id === 'a');
  }
  /* 5j. the disc wears the phase, written only when it changes */
  {
    let writes = 0; const attrs = Object.create(null);
    const el = { getAttribute: (k) => (k in attrs ? attrs[k] : null), setAttribute: (k, v) => { writes++; attrs[k] = v; } };
    const S = page([mon('a', 300)]);
    latchLook(el, S); latchLook(el, S);
    check('5j. idle: raised (data-latch off), written once', attrs['data-latch'] === 'off' && writes === 1);
    frame(S); latchAttackPress(S); latchLook(el, S); latchLook(el, S);
    check('5j. active: pressed in (on), one more write', attrs['data-latch'] === 'on' && writes === 2);
    check('5j. no element: nothing', latchLook(null, S) === false);
  }
}

/* v2.3.6540 (the gatekeeper's sitting 56, G2): the phase table's states are the modules' own lists */
for (const [name, list] of [['latch', LATCH_PHASES], ['sight', SIGHT_PHASES], ['stick', STICK_PHASES]]) {
  const row = PHASES.find((p) => p.name === name && p.side === 'page');
  check('G2. the phase table\'s ' + name + ' row holds the module\'s states', !!row && JSON.stringify(row.states) === JSON.stringify(list), row && row.states);
}

/* ── v2.3.6542 (part 6): the latch's lock follows a replaced monster ──
   mp-twobuttons 2c: after a whole list's replace the latch kept its lock on
   the OLD object (still "holdable", frozen where it was), and every swing
   aimed at it (monsterCombat: the lock's ref is the aim): 45 swings at a
   fishman 25 px off, 48 degrees wide, none landing.  The keep in latchLock
   now asks lockRefPresent (the ref re-pointed by id to the live one) first. */
{
  const tg = readFileSync(new URL('../../src/game/targeting.js', import.meta.url), 'utf8');
  const fn = (tg.match(/function latchLock\(S\) \{[\s\S]*?\n\}/) || [''])[0];
  const keep = fn.split('\n').find((l) => /^\s*if \(lt && id != null/.test(l)) || '';
  check('R. the latch keeps its lock only once its ref is the live monster (lockRefPresent before monHoldable, in the keep)',
    /lockRefPresent\(S\) && monHoldable\(lt\.ref\)\) return;/.test(keep), keep.trim().slice(0, 200));
  check('R. lockRefPresent re-points the ref by id (String both sides)', /String\(m\.id\) === String\(lt\.id\)\) \{ lt\.ref = m; return true; \}/.test(tg));
}

/* ═══ v2.3.6542 (the gatekeeper's sitting 60): H. THE ONE GATE ═══
   The gate was split: the Attack press asked twoButtonsOn() alone, the frame
   that ends a latch asked it with !fineInput().  On a touch screen with a
   mouse a press latched and nothing ended it. */
{
  /* H1. the gatekeeper's probe, as behaviour: the device's pointer is a
     MediaQueryList deviceProfile keeps (live), so a stub one turns the mouse
     on and off */
  const mq = { matches: false };
  if (typeof globalThis.window === 'undefined') globalThis.window = {};
  globalThis.window.matchMedia = () => mq;
  const page = () => ({ player: { x: 0, y: 0 }, _renderFacing: 'east', monsters: [{ id: 'g', x: 300, y: 0, alive: true }], currentZone: 'wheel' });
  setManualCombat(5);
  mq.matches = true;
  const M = page();
  check('H1. mode 5, a mouse on a touch screen: the gate is shut', twoButtonsLive() === false);
  check('H1. ...and Attack\'s press with a monster in sight latches nothing', latchAttackPress(M) === null && latchPhase(M) === 'idle' && !M._latchId && !M._latchPhase);
  mq.matches = false;
  const T = page();
  check('H1. the touch pointer: the same press locks', twoButtonsLive() === true && latchAttackPress(T) === 'lock' && latchPhase(T) === 'active');
  setManualCombat(4);
  const F = page();
  check('H1. mode 4: the press latches nothing', twoButtonsLive() === false && latchAttackPress(F) === null && latchPhase(F) === 'idle');
  setManualCombat(5);
  delete globalThis.window.matchMedia;

  /* H2. every caller of twoButtonsOn in src/, off the syntax tree: an ALLOW
     list of (file, the function it is called in).  An import of it under
     another name, or a namespace's .twoButtonsOn, is a caller too. */
  /* (file: the nearest named function) -> how many calls.  v2.3.6544: + the
     Test panel's row, which shows and flips the device's CHOICE (any device:
     the stored `?manual=5`), never plays the mode (card CT PR 5) */
  const ALLOW = Object.freeze({ 'src/game/latch.js:twoButtonsLive': 1, 'src/ui/panels/DevPanel.jsx:DevPanel': 5 });
  let B = null;
  for (const pkg of ['package.json', 'server/package.json']) {
    try { const req = createRequire(new URL('../../' + pkg, import.meta.url)); const tr = req('@babel/traverse'); B = { parse: req('@babel/parser').parse, traverse: tr.default || tr }; break; } catch (e) { /* the next */ }
  }
  check('H2. @babel/parser and @babel/traverse load (npm install in the root or server/)', !!B);
  if (B) {
    const ROOT = new URL('../../', import.meta.url).pathname;
    const files = [];
    const walk = (d) => { for (const n of readdirSync(ROOT + d)) { const p = d + '/' + n; if (statSync(ROOT + p).isDirectory()) walk(p); else if (/\.(js|jsx|mjs)$/.test(n)) files.push(p); } };
    walk('src');
    const found = [], bad = [];
    for (const f of files) {
      const raw = readFileSync(ROOT + f, 'utf8');
      if (!raw.includes('twoButtonsOn')) continue;
      const ast = B.parse(raw, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
      const names = new Set(['twoButtonsOn']);   /* its own name always (a call with no import still reads as one), and any alias */
      B.traverse(ast, {
        ImportSpecifier(p) { const im = p.node.imported; if (im && (im.name || im.value) === 'twoButtonsOn') { names.add(p.node.local.name); if (p.node.local.name !== 'twoButtonsOn') bad.push(f + ': imported as ' + p.node.local.name); } },
      });
      B.traverse(ast, {
        CallExpression(p) {
          const c = p.node.callee;
          const hit = (c.type === 'Identifier' && names.has(c.name)) || (c.type === 'MemberExpression' && !c.computed && c.property && c.property.name === 'twoButtonsOn');
          if (!hit) return;
          let fn = p.getFunctionParent(), nm = null;   /* v2.3.6544: the nearest NAMED function (a click's arrow is its component's) */
          while (fn && !nm) { nm = (fn.node.id && fn.node.id.name) || (fn.parent && fn.parent.id && fn.parent.id.name) || (fn.parent && fn.parent.key && fn.parent.key.name) || null; if (!nm) fn = fn.getFunctionParent(); }
          const at = f + ':' + (nm || '(top)');
          found.push(at);
          if (!ALLOW[at]) bad.push(at + ' (line ' + p.node.loc.start.line + ')');
        },
      });
    }
    const n = Object.create(null); for (const a of found) n[a] = (n[a] || 0) + 1;
    check('H2. every caller of twoButtonsOn in src/ is on the ALLOW list (the sites ask twoButtonsLive), as many times as listed', bad.length === 0 && Object.keys(ALLOW).every((k) => n[k] === ALLOW[k]) && Object.keys(n).length === Object.keys(ALLOW).length, { bad, n });
  }
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
