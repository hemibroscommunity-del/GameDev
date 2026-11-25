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
 *
 *   5. (v2.3.6548) plays today's press under `?holdauto=0`: a lock is 'auto'
 *      at once (the held attack on), the kill moves the lock;
 *   7. (v2.3.6556, card CT part 23) A LOCK OUT OF VIEW LETS GO TO ONE IN
 *      VIEW: locked on a monster out of the view (S.camera, S._viewW/_viewH)
 *      with one in view in range, the lock moves to the nearest in view at
 *      AWAY_MS (400), the phase kept; a lock IN view is never taken by a
 *      nearer one; the press locks the nearest in view (sight.js 12);
 *      `?nearpick=0` neither.  The card's plants, each FAILs 7: (e) the
 *      move dropped (a lock out of view held 2 s with one in view in range);
 *      (f) the move made for a lock in view (taken by a nearer one); (g) the
 *      switch ignored (nearpick=0 not giving the old answers).
 *   6. TAP AND HOLD (v2.3.6548, card CT part 15), the page's rule: a tap
 *      locks ('active', no held attack) and the lock stays; a press on it is
 *      'strike'; a hold fills at 600 ms ('auto'; `?autohold=<ms>` clamped
 *      200 to 3000); a lift before is a tap; a slide past 56 px ends the
 *      hold; a tap while auto lets go ('press'); a kill lets EVERYTHING go,
 *      another in sight or not; out of range and your death drop a hold;
 *      the disc's data-latch off / lock / auto and its ring (data-hold a/b,
 *      --autohold) set once at the press.
 * Mutants (v2.3.6548): 61 one-line changes of the added lines of latch.js,
 * freeAttack.js, controlVisibility.js and targeting.js, run against this
 * suite, sight.test and tools/guards/free-attack: 60 killed.  The one that
 * lives: targeting.js latchLock reading `=== 'active'` alone (the lock
 * dropped while auto): that file imports by the '@' alias, so no node suite
 * loads it; mp-twobuttons 2b's hold step reads the lock while auto.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { AUTOHOLD, holdAutoOn, autoHoldMs, latchLocked, latchHoldStart, latchRelease, latchSlide, latchFill, latchRing, latchRingOff, latchLine } from '../../src/game/latch.js';   /* v2.3.6548: tap and hold (6) */
import { AWAY_MS, nearPickOn, latchAway, sightView } from '../../src/game/latch.js';   /* v2.3.6556: a lock out of view lets go to one in view (7) */
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
  check('1. nothing written: idle', latchPhase(S) === 'idle' && LATCH_PHASES.join() === 'idle,active,auto');
  check('1. a press with nothing sighted: one attack, still idle', latchPress(S, null) === 'once' && latchPhase(S) === 'idle' && !S._latchPhase);
  check('1. a press with a monster sighted (today\'s press): locked, auto', latchPress(S, 'm7') === 'lock' && latchPhase(S) === 'auto' && S._latchId === 'm7');
  check('1. while locked, a frame in range holds it', latchCheck(S, { alive: true, d: 300 }, OUT, []) === null && S._latchId === 'm7');
}

/* ── 2. the five ends ── */
{
  check('2. there are five, named', LATCH_ENDS.join() === 'press,range,killed,death,zone');
  const a = locked();
  check('2. press: pressed again lets go', latchPress(a, 'b') === 'unlock' && latchPhase(a) === 'idle' && a._latchEnd === 'press' && a._latchId === null);
  const b = locked();
  check('2. range: 549 holds (the sword\'s 550)', latchCheck(b, { alive: true, d: 549 }, OUT, []) === null && latchPhase(b) === 'auto');
  { const e = locked();
    check('2. range: exactly 550 holds (the gatekeeper\'s sitting 56, L2)', latchCheck(e, { alive: true, d: 550 }, OUT, []) === null && latchPhase(e) === 'auto');
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
  check('3. the target dies with others sighted: the lock moves to the nearest, no new press', r === 'moved' && latchPhase(S) === 'auto' && S._latchId === 'near', [r, S]);
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
   (S.autoAttack): true attacking, false let go, null nothing to say.
   v2.3.6548: section 5 plays today's press (`?holdauto=0`: a press locks
   AND holds, a kill moves the lock); the hold's rule is section 6. */
globalThis.location = { search: '?holdauto=0' };
{
  const mon = (id, x, y = 0, alive = true) => ({ id, x, y, alive });
  const page = (mons) => ({ player: { x: 0, y: 0 }, _renderFacing: 'east', monsters: mons, currentZone: 'wheel' });
  let t = 1000;
  const frame = (S, dead, slot) => latchFrame(S, (t += 50), !!dead, slot || 'melee', 1);

  /* 5a. a whole fight with two presses: sighted, Attack locks, attacks to the end */
  {
    const a = mon('a', 300), S = page([a]);
    check('5a. a monster ahead in range: sighted, the latch idle, nothing said', frame(S) === null && sightPhase(S) === 'sighted' && latchPhase(S) === 'idle');
    check('5a. Attack pressed: locked on it', latchAttackPress(S) === 'lock' && latchPhase(S) === 'auto' && S._latchId === 'a');
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
    check('5c. three ahead: the nearest locked (v2.3.6556: was the one nearest the facing\'s line, c)', S._latchId === 'b', S._latchId);
    b.alive = false;
    check('5c. it dies: the lock moves to the nearest other in sight (a), still attacking', frame(S) === true && S._latchId === 'a' && latchPhase(S) === 'auto');
    a.curHp = 0;
    check('5c. at 0 hp it counts as dead: moves to c', frame(S) === true && S._latchId === 'c');
    S.monsters = [a];
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
      const off = frame(S) === false && latchHolds(S) === false && latchPhase(S) === 'auto';
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
    check('5j. auto: pressed in (auto), one more write', attrs['data-latch'] === 'auto' && writes === 2);
    check('5j. no element: nothing', latchLook(null, S) === false);
  }
}
delete globalThis.location;

/* ═══ v2.3.6548: 6. TAP AND HOLD (card CT part 15) ═══
   The owner, 2026-11-24: "if you hold down the attack button near a monster
   something signifies that the auto-attack is enabled. Maybe 2 seconds.
   Otherwise each tap is its own attack cycle."  The page's own rule (no
   `?holdauto=0`): a tap locks and strikes, a hold past the fill is auto, a
   tap while auto lets go, a kill lets everything go. */
{
  const mon = (id, x, y = 0, alive = true) => ({ id, x, y, alive });
  const page = (mons) => ({ player: { x: 0, y: 0 }, _renderFacing: 'east', monsters: mons, currentZone: 'wheel' });
  const F = (S, now, dead) => latchFrame(S, now, !!dead, 'melee', 1);
  check('6. the hold\'s rule is the page\'s (no address)', holdAutoOn() === true && holdAutoOn('') === true && holdAutoOn('?holdauto=0') === false && holdAutoOn('?holdauto=1') === true);
  check('6. the fill: 600 ms by default, `?autohold=` in whole ms, 200 to 3000',
    autoHoldMs() === 600 && autoHoldMs('') === 600 && autoHoldMs('?autohold=2000') === 2000 && autoHoldMs('?autohold=200') === 200 && autoHoldMs('?autohold=3000') === 3000
      && autoHoldMs('?autohold=199') === 200 && autoHoldMs('?autohold=3001') === 3000 && autoHoldMs('?autohold=abc') === 600 && autoHoldMs('?autohold=') === 600 && autoHoldMs('?autohold=-5') === 600 && autoHoldMs('?autohold=7.5') === 600,
    [autoHoldMs('?autohold=2000'), autoHoldMs('?autohold=199'), autoHoldMs('?autohold=3001')]);
  check('6. AUTOHOLD: 600, 200 to 3000, a slide of 56 px', AUTOHOLD.MS === 600 && AUTOHOLD.MIN === 200 && AUTOHOLD.MAX === 3000 && AUTOHOLD.SLIDE_PX === 56 && Object.isFrozen(AUTOHOLD));

  /* 6a. a tap: one attack cycle, a lock that stays, no held attack */
  {
    const S = page([mon('a', 300), mon('b', 320, 20)]);
    check('6a. sighted, idle', F(S, 1000) === null && latchPhase(S) === 'idle');
    check('6a. the press locks: active (no held attack), the id the sighted one', latchAttackPress(S) === 'lock' && latchPhase(S) === 'active' && latchLocked(S) && S._latchId === 'a' && latchHolds(S) === false);
    check('6a. the hold starts on the lock (the press\'s own time)', latchHoldStart(S, 1000) === true && S._latchHoldAt === 1000);
    check('6a. 300 ms on: not filled', F(S, 1300) === false && latchPhase(S) === 'active' && S._latchHoldAt === 1000);
    check('6a. lifted at 300 ms: the hold ends (a tap), the lock stays', latchRelease(S) === true && S._latchHoldAt === 0 && latchPhase(S) === 'active' && S._latchId === 'a');
    check('6a. ...and a lift with no hold says so', latchRelease(S) === false);
    check('6a. long after: still the lock, never auto (the fill is the hold\'s alone)', F(S, 5000) === false && latchPhase(S) === 'active' && latchHolds(S) === false);
    check('6a. a tap on the lock: \'strike\' (one attack), the lock kept on a', latchAttackPress(S) === 'strike' && latchPhase(S) === 'active' && S._latchId === 'a');
    check('6a. the line is the lock\'s while active', latchLine(S, 5000, false) !== null);
  }
  /* 6b. a hold past the fill: auto, the finger may lift */
  {
    const S = page([mon('a', 300)]);
    F(S, 1000); latchAttackPress(S); latchHoldStart(S, 1000);
    check('6b. 599 ms: not yet', F(S, 1599) === false && latchPhase(S) === 'active');
    check('6b. 600 ms: auto, the held attack on (the frame says true)', F(S, 1600) === true && latchPhase(S) === 'auto' && S._latchHoldAt === 0 && latchHolds(S) === true && S._latchId === 'a');
    check('6b. lifted after the fill: nothing ends (no hold running), still auto', latchRelease(S) === false && latchPhase(S) === 'auto' && F(S, 1700) === true);
    check('6b. a tap while auto: \'unlock\' -- off, idle (end press)', latchAttackPress(S) === 'unlock' && latchPhase(S) === 'idle' && S._latchEnd === 'press' && latchHolds(S) === false);
    check('6b. ...the frame after: nothing to say (null: the press let the held attack go)', F(S, 1750) === null);
    check('6b. no hold starts with nothing locked', latchHoldStart(S, 1800) === false && !S._latchHoldAt);
    const H = page([mon('a', 300)]);
    F(H, 1000); latchAttackPress(H); latchHoldStart(H, 1000);
    check('6b. latchFill alone: at 1999 of 2000 no, at 2000 yes', latchFill(H, 2999, 2000) === false && latchPhase(H) === 'active' && latchFill(H, 3000, 2000) === true && latchPhase(H) === 'auto');
    check('6b. latchFill with no hold: nothing', latchFill(H, 9000, 600) === false && latchFill(null, 9000, 600) === false && latchFill({ _latchHoldAt: 0 }, 9000, 1) === false);
  }
  /* 6c. a kill: everything lets go, no hop to a second monster standing near */
  {
    const a = mon('a', 300), S = page([a, mon('b', 330, 10)]);
    F(S, 1000); latchAttackPress(S); latchHoldStart(S, 1000); F(S, 1600);
    check('6c. auto on a', latchPhase(S) === 'auto' && S._latchId === 'a');
    a.alive = false;
    check('6c. a dies, b in sight: let go (\'killed\'), no move, the held attack false', F(S, 1650) === false && latchPhase(S) === 'idle' && S._latchEnd === 'killed' && S._latchId === null);
    check('6c. the next frame: nothing (b sighted, not locked)', F(S, 1700) === null && latchPhase(S) === 'idle');
    const b = mon('b', 300), T = page([b, mon('c', 330, 10)]);
    F(T, 1000); latchAttackPress(T); latchHoldStart(T, 1000);
    b.curHp = 0;
    check('6c. a tap\'s lock dies mid-hold: idle, the hold dropped', F(T, 1200) === false && latchPhase(T) === 'idle' && T._latchHoldAt === 0 && T._latchEnd === 'killed');
    check('6c. ...and the fill never comes', F(T, 2000) === null && latchPhase(T) === 'idle');
  }
  /* 6d. out of sight: auto ends; a hold whose lock goes is dropped */
  {
    const a = mon('a', 300), S = page([a]);
    F(S, 1000); latchAttackPress(S); latchHoldStart(S, 1000); F(S, 1600);
    a.x = 560;
    check('6d. auto, the monster past 550: let go (\'range\')', F(S, 1650) === false && latchPhase(S) === 'idle' && S._latchEnd === 'range');
    const b = mon('b', 300), T = page([b]);
    F(T, 1000); latchAttackPress(T); latchHoldStart(T, 1000);
    b.x = 600;
    check('6d. mid-hold out of range: idle, the hold dropped', F(T, 1100) === false && T._latchHoldAt === 0 && latchPhase(T) === 'idle');
    const D = page([mon('d', 300)]);
    F(D, 1000); latchAttackPress(D); latchHoldStart(D, 1000);
    check('6d. your death mid-hold: idle, the hold dropped', F(D, 1100, true) === false && D._latchHoldAt === 0 && D._latchEnd === 'death');
    check('6d. latchFill on a hold with no lock drops it', (() => { const X = { _latchHoldAt: 5 }; return latchFill(X, 9000, 600) === false && X._latchHoldAt === 0; })());
    check('6d. ...and on one already auto: dropped, nothing written again', (() => { const X = { _latchPhase: 'auto', _latchId: 'q', _latchHoldAt: 5, _latchEnd: 'x' }; return latchFill(X, 9000, 600) === false && X._latchHoldAt === 0 && X._latchEnd === 'x'; })());
  }
  /* 6e. a press with nothing in sight: one attack, no lock, no ring */
  {
    const S = page([mon('a', -300)]);
    F(S, 1000);
    check('6e. nothing sighted: \'once\', idle, no hold', latchAttackPress(S) === 'once' && latchPhase(S) === 'idle' && latchHoldStart(S, 1000) === false);
    check('6e. the pure press: idle and nothing sighted is once; locked again is strike; auto again is unlock',
      latchPress({}, null, true) === 'once' && latchPress({ _latchPhase: 'active', _latchId: 'q' }, 'z', true) === 'strike' && latchPress({ _latchPhase: 'auto', _latchId: 'q' }, 'z', true) === 'unlock');
    const W = { _latchPhase: 'active', _latchId: 'q' };
    check('6e. a strike keeps its lock (not the one sighted now)', latchPress(W, 'z', true) === 'strike' && W._latchId === 'q');
    check('6e. `hold` is exactly true: anything else is today\'s press (a lock is auto)', (() => { const X = {}; return latchPress(X, 'z', 1) === 'lock' && latchPhase(X) === 'auto'; })());
    check('6e. today\'s press on a tap\'s lock lets go', (() => { const X = { _latchPhase: 'active', _latchId: 'q' }; return latchPress(X, 'z') === 'unlock' && latchPhase(X) === 'idle'; })());
    check('6e. the hold\'s press with an empty id: once', latchPress({}, '', true) === 'once');
  }
  /* 6f. a slide off the button ends the hold, as a lift */
  {
    const S = { _latchPhase: 'active', _latchId: 'a', _latchHoldAt: 10 };
    check('6f. 56 px: still on the button', latchSlide(S, 56, 0) === false && S._latchHoldAt === 10);
    check('6f. past 56 px: slid off, the hold ends', latchSlide(S, 40, 40) === true && S._latchHoldAt === 0);
    check('6f. again: nothing to end', latchSlide(S, 90, 0) === false);
    check('6f. a hold start needs a time', latchHoldStart(S, 0) === false && latchHoldStart(S, NaN) === false && latchHoldStart(null, 5) === false);
  }
  /* 6g. the disc: data-latch lock / auto / off, the ring once at the press */
  {
    let writes = 0; const attrs = Object.create(null), props = Object.create(null);
    const el = { getAttribute: (k) => (k in attrs ? attrs[k] : null), setAttribute: (k, v) => { writes++; attrs[k] = String(v); }, removeAttribute: (k) => { writes++; delete attrs[k]; },
      style: { setProperty: (k, v) => { props[k] = v; } } };
    const S = page([mon('a', 300)]);
    F(S, 1000); latchLook(el, S);
    check('6g. idle: off', attrs['data-latch'] === 'off' && writes === 1);
    latchAttackPress(S); latchHoldStart(S, 1000);
    check('6g. the ring at the press: data-hold a, --autohold its length', latchRing(el, S, 600) === true && attrs['data-hold'] === 'a' && props['--autohold'] === '600ms');
    latchLook(el, S);
    check('6g. locked mid-hold: lock, the ring kept', attrs['data-latch'] === 'lock' && attrs['data-hold'] === 'a');
    check('6g. a look with nothing changed writes nothing', latchLook(el, S) === false);
    F(S, 1600); latchLook(el, S);
    check('6g. filled: auto (lit), the ring gone', attrs['data-latch'] === 'auto' && !('data-hold' in attrs));
    attrs['data-hold'] = 'b';
    check('6g. a ring left with no hold: taken away, and the look says it wrote', latchLook(el, S) === true && !('data-hold' in attrs));
    check('6g. no hold: no ring', latchRing(el, S, 600) === false && !('data-hold' in attrs) && latchRing(null, S, 600) === false);
    S._latchHoldAt = 5;
    check('6g. a second press\'s ring is b (a new animation: the fill restarts with no layout read), then a', latchRing(el, S, 2000) === true && attrs['data-hold'] === 'a' && latchRing(el, S, 2000) === true && attrs['data-hold'] === 'b' && props['--autohold'] === '2000ms');
    check('6g. the ring off at once: true once, then false', latchRingOff(el) === true && !('data-hold' in attrs) && latchRingOff(el) === false && latchRingOff(null) === false);
  }
  /* 6h. `?autohold=2000` through the frame */
  {
    globalThis.location = { search: '?autohold=2000' };
    const S = page([mon('a', 300)]);
    F(S, 1000); latchAttackPress(S); latchHoldStart(S, 1000);
    check('6h. ?autohold=2000: 1999 ms no', F(S, 2999) === false && latchPhase(S) === 'active');
    check('6h. ...2000 ms auto', F(S, 3000) === true && latchPhase(S) === 'auto');
    globalThis.location = { search: '?holdauto=0&autohold=200' };
    const T = page([mon('t', 300)]);
    F(T, 1000);
    check('6h. ?holdauto=0: the press is auto at once (no hold)', latchAttackPress(T) === 'lock' && latchPhase(T) === 'auto' && latchHoldStart(T, 1000) === false);
    delete globalThis.location;
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

/* ── 7. v2.3.6556: a lock out of view lets go to one in view (card CT part 23) ── */
{
  globalThis.location = { search: '' };
  const mon = (id, x, y = 0, alive = true) => ({ id, x, y, alive });
  /* the bow (675 in, 825 out); the view 400 px each side, 300 up and down */
  const page = (mons) => ({ player: { x: 0, y: 0 }, _renderFacing: 'east', monsters: mons, currentZone: 'wheel7', camera: { x: -400, y: -300 }, _viewW: 800, _viewH: 600 });
  let t = 50000;
  const frame = (S, slot) => latchFrame(S, (t += 50), false, slot || 'ranged', 1);
  const run = (S, ms, slot) => { const end = t + ms; let r; while (t < end) r = frame(S, slot); return r; };
  check('7. the numbers: 400 ms; the switch on by default, off only at ?nearpick=0', AWAY_MS === 400 && nearPickOn('') === true && nearPickOn('?nearpick=0') === false && nearPickOn('?nearpick=1') === true);
  /* (e) locked out of view, one in view in range: moves after 400 ms */
  {
    const S = page([mon('far', 600), mon('near', 0, 200)]);
    frame(S); latchTo(S, 'active', 'far');
    frame(S);
    run(S, 300);
    check('7e. 350 ms out of view: still on the one out of view', S._latchId === 'far' && S._latchAwayAt > 0);
    run(S, 100);
    check('7e. at 400 ms: moved to the one in view, the phase kept (a tap\'s lock)', S._latchId === 'near' && latchPhase(S) === 'active' && S._latchAwayAt === 0);
    const T = page([mon('far', 600), mon('n1', 0, 250), mon('n2', -150, 0), mon('n3', 300, 200)]);
    frame(T); latchTo(T, 'auto', 'far');
    const held = run(T, 2000);
    check('7e. held 2 s: on the NEAREST in view (n2, behind you), still attacking', T._latchId === 'n2' && latchPhase(T) === 'auto' && held === true, T._latchId);
    const U = page([mon('far', 600), mon('n2', -150, 0), mon('n1', 0, 250)]);
    frame(U); latchTo(U, 'auto', 'far'); run(U, 2000);
    check('7e. ...whichever comes first in the list', U._latchId === 'n2', U._latchId);
  }
  /* the move needs one in view IN RANGE, and lasting 400 ms */
  {
    const S = page([mon('far', 450), mon('corner', 390, 290)]);   /* a sword: 440 in; the corner is 486 off */
    frame(S, 'melee'); latchTo(S, 'active', 'far'); run(S, 2000, 'melee');
    check('7. a sword, the only one in view out of its range: the lock stays', S._latchId === 'far' && latchPhase(S) === 'active');
    const n = mon('n', 0, 200), T = page([mon('far', 600), n]);
    frame(T); latchTo(T, 'active', 'far');
    run(T, 300); n.alive = false; frame(T); n.alive = true; run(T, 300);
    check('7. the one in view gone for a frame: the 400 ms start again', T._latchId === 'far');
    run(T, 200);
    check('7. ...and run out after', T._latchId === 'n');
    const W = page([mon('far', 600), mon('n', 0, 200)]);
    delete W.camera;
    frame(W); latchTo(W, 'active', 'far'); run(W, 2000);
    check('7. no camera (no view): no move', W._latchId === 'far');
    const X = page([mon('far', 600), mon('n', 0, 200)]); X._viewH = 0;
    frame(X); latchTo(X, 'active', 'far'); run(X, 2000);
    check('7. a view of no size: no move', X._latchId === 'far');
  }
  /* (f) a lock IN view is never taken by a nearer one */
  {
    const S = page([mon('a', 300), mon('b', 100, 50), mon('c', -50, 0)]);
    frame(S); latchTo(S, 'auto', 'a');
    const r = run(S, 2000);
    check('7f. locked in view, nearer ones in view: the lock stays (the player chose it)', S._latchId === 'a' && r === true && !(S._latchAwayAt > 0));
    const T = page([mon('a', 400, 300), mon('b', 100, 0)]);   /* on the view's corner: in it */
    frame(T); latchTo(T, 'active', 'a'); run(T, 2000);
    check('7f. a lock on the view\'s very edge is in it: stays', T._latchId === 'a');
  }
  /* the press: the nearest in view (sight.js 12 through sightNow) */
  {
    const S = page([mon('line', 500, 0), mon('near', 250, 150)]);
    frame(S);
    check('7. the press locks the nearest in view, not the one on the line out of view', latchAttackPress(S) === 'lock' && S._latchId === 'near', S._latchId);
    const N = page([mon('upper', 200, 150), mon('in', 390, 0)]);   /* a short view: 100 px up and down */
    N.camera = { x: -400, y: -100 }; N._viewH = 200;
    frame(N);
    check('7. the press: one in view (390 off) before a nearer one out of view (250 off, under the view)', latchAttackPress(N) === 'lock' && N._latchId === 'in', N._latchId);
    check('7. sightView: the camera and the drawn size, as numbers', (() => { const v = sightView(S); return v && v.x === -400 && v.y === -300 && v.w === 800 && v.h === 600; })() && sightView({ camera: { x: 0, y: 0 }, _viewW: 10 }) === null && sightView({ camera: { x: 0, y: 0 }, _viewH: 10 }) === null && sightView({ camera: { x: NaN, y: 0 }, _viewW: 10, _viewH: 10 }) === null && sightView({ camera: { x: 0, y: NaN }, _viewW: 10, _viewH: 10 }) === null && sightView({ _viewW: 10, _viewH: 10 }) === null && sightView(null) === null);
  }
  /* (g) `?nearpick=0`: the old pick and no move */
  {
    globalThis.location = { search: '?nearpick=0' };
    const S = page([mon('line', 500, 0), mon('near', 250, 150)]);
    frame(S);
    check('7g. ?nearpick=0: the press locks the one nearest the facing\'s line, out of view', latchAttackPress(S) === 'lock' && S._latchId === 'line', S._latchId);
    run(S, 2000);
    check('7g. ?nearpick=0: the lock out of view held 2 s, one in view in range', S._latchId === 'line' && !(S._latchAwayAt > 0));
    globalThis.location = { search: '' };
  }
  /* the mutants' edges (v2.3.6556) */
  {
    const S = { player: { x: 1000, y: 500 }, _renderFacing: 'east', monsters: [mon('far', 1600, 500), mon('a', 1000, 700), mon('b', 800, 500)], currentZone: 'wheel7', camera: { x: 600, y: 200 }, _viewW: 800, _viewH: 600 };
    frame(S); latchTo(S, 'active', 'far'); run(S, 1000);
    check('7. away from the world\'s corner: the two in view the same distance, the first', S._latchId === 'a', S._latchId);
    const T = page([mon('far', 520), mon('edge', 0, 440)]);
    T.camera = { x: -500, y: -500 }; T._viewW = 1000; T._viewH = 1000;
    frame(T, 'melee'); latchTo(T, 'active', 'far'); run(T, 1000, 'melee');
    check('7. a sword: one in view at exactly its 440 is in range', T._latchId === 'edge', T._latchId);
    check('7. sightView: a view of no height or no width is none', sightView({ camera: { x: 0, y: 0 }, _viewW: 10, _viewH: 0 }) === null && sightView({ camera: { x: 0, y: 0 }, _viewW: 0, _viewH: 10 }) === null);
  }
  /* latchAway, the rule alone */
  {
    const S = {}; latchTo(S, 'active', 'a');
    const N = { id: 'b', d: 100 };
    check('7. latchAway: the first frame away starts the time', latchAway(S, 1000, true, N) === null && S._latchAwayAt === 1000);
    check('7. ...399 ms: nothing; 400: moved', latchAway(S, 1399, true, N) === null && S._latchId === 'a' && latchAway(S, 1400, true, N) === 'moved' && S._latchId === 'b' && S._latchAwayAt === 0);
    check('7. not away: the time cleared', latchAway(S, 1500, true, { id: 'c', d: 1 }) === null && S._latchAwayAt === 1500 && latchAway(S, 1600, false, { id: 'c', d: 1 }) === null && S._latchAwayAt === 0);
    latchAway(S, 1700, true, { id: 'c', d: 1 });
    check('7. away with no one in view: the time cleared', latchAway(S, 1800, true, null) === null && S._latchAwayAt === 0);
    latchAway(S, 1850, true, { id: 'c', d: 1 });
    check('7. only exactly true is away', latchAway(S, 1900, 1, { id: 'c', d: 1 }) === null && S._latchAwayAt === 0);
    latchAway(S, 1950, true, { id: 'c', d: 1 });
    check('7. the one in view the lock itself: nothing, the time cleared', latchAway(S, 2000, true, { id: 'b', d: 1 }) === null && S._latchAwayAt === 0);
    const Q = {}; latchTo(Q, 'active', 7); latchAway(Q, 1950, true, { id: 'c', d: 1 });
    check('7. ...its id as a number', latchAway(Q, 2000, true, { id: '7', d: 1 }) === null && Q._latchAwayAt === 0);
    latchAway(S, 2050, true, { id: 'c', d: 1 });
    check('7. an id of none in view: nothing', latchAway(S, 2100, true, { id: null, d: 1 }) === null && S._latchAwayAt === 0);
    const I = { _latchAwayAt: 900 };
    check('7. idle: nothing, the time cleared', latchAway(I, 2000, true, N) === null && I._latchAwayAt === 0 && latchAway(null, 1, true, N) === null);
    const Z = {}; latchTo(Z, 'active', 'a'); latchAway(Z, 1000, true, N);
    check('7. latchTo zeroes the time: a new lock', latchTo(Z, 'auto', 'q') === true && Z._latchAwayAt === 0);
    latchAway(Z, 1100, true, N);
    check('7. ...and an end', latchTo(Z, 'idle', null, 'press') === true && Z._latchAwayAt === 0);
  }
  delete globalThis.location;
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
