/* ═══ v2.3.6549: THE RIGHT THUMB'S PHASE (card CT part 16; src/game/thumbSide.js) ═══
 *
 * The two buttons (`?manual=5`).  The owner, 2026-11-24: "I want a clean
 * attack and jump button that's it. The special attacks buttons should only
 * appear when a monster is within attack range. I want to change the melee
 * behavior so that it doesn't jump to every monster. Instead you must press
 * an attack charge button to get that behavior."  What it does, played on the
 * module:
 *
 *   1. THE REACH: a sword's is the engage test's 72 x its multiplier, out
 *      1.25 x; a bow's and a staff's their shot range (675 x the multiplier,
 *      out 1.25 x but never past the worker's slack).
 *   2. THE GAP: the least to a live monster (a dead one, one at 0 hp, one
 *      with no place, none: not counted); the caller's measure when handed.
 *   3. THE STEPS: calm, a sighting is a threat, a lock is a threat, a hit in
 *      the last 3 s is a threat (an unseen one too) and goes after it; in
 *      reach is reach; the in line to come, the out line to stay, and the
 *      hold past the last frame in it; then threat or calm by what is left.
 *   4. THE EDGE, played: a monster walked back and forth across the reach's
 *      edge: the specials come once and go once.
 *   5. THE DOOR: thumbTo refuses a word not of its list; no write of
 *      S._thumbPhase in src/ outside it; thumbClear calms at once.
 *   6. CHARGE'S LOCK: the latch's id when locked; else the one in sight now,
 *      locked 'active' (no attack); nothing in sight: null, nothing locked.
 *   7. THE SWITCHES: each on with no address, each thrown by its `=0`.
 *   8. THE GLUE'S MIRROR: THUMB.SWORD_PX is gameSystems.js GS_OUTER_RADIUS,
 *      and the slack numbers are sight.js's.
 *
 * Mutants of thumbSide.js's lines, each killed by a check here or in
 * sight.test 8 (the run in the PR body); the survivors are listed there with
 * why.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { THUMB, THUMB_PHASES, reachRange, reachGap, thumbPhase, thumbTo, thumbStep, thumbClear, hurtLately,
  reachSpecialsOn, threatBlockOn, chargeBtnOn, specialsUp, blockUp, chargeUp, chargeLock } from '../../src/game/thumbSide.js';
import { SIGHT } from '../../src/game/sight.js';
import { findIn } from '../../tools/guards/lib/filesOf.mjs';
import { latchTo, latchFrame } from '../../src/game/latch.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* ── 1. the reach ── */
{
  const sw = reachRange('melee'), sw2 = reachRange('melee', 3, 1.5), bow = reachRange('ranged'), staff = reachRange('staff'), bow12 = reachRange('ranged', 1.2, 9);
  check('1. a sword: the engage test\'s 72, out 90', sw.in === 72 && sw.out === 90, sw);
  check('1. a sword x its own multiplier (not the bow\'s): 108, out 135', sw2.in === 108 && sw2.out === 135, sw2);
  check('1. a bare hand or an unknown slot is a sword\'s; a bad multiplier is 1', reachRange(undefined).in === 72 && reachRange('fists', 2, -1).out === 90 && reachRange('melee', 1, 0).in === 72 && reachRange('melee', 1, 'x').in === 72);
  check('1. a bow: its shot, 675, out 825 (the worker\'s 675 + 150, under 1.25 x)', bow.in === 675 && bow.out === 825, bow);
  check('1. a staff: 675, out 843.75 (1.25 x, under the worker\'s 925)', staff.in === 675 && staff.out === 843.75, staff);
  check('1. a bow x 1.2 (the sword\'s multiplier ignored): 810, out 960', bow12.in === 810 && bow12.out === 960, bow12);
  check('1. a bow\'s bad multiplier is 1', reachRange('ranged', 0).in === 675 && reachRange('staff', -2).in === 675 && reachRange('ranged', 'x').in === 675);
  check('1. a multiplier under 1 is kept (a bow 0.5: 337.5; a sword 0.5: 36)', reachRange('ranged', 0.5).in === 337.5 && reachRange('melee', 1, 0.5).in === 36);
}

/* ── 2. the gap ── */
{
  const S = { player: { x: 0, y: 0 }, monsters: [
    { id: 1, x: 300, y: 0, alive: true }, { id: 2, x: 0, y: 120, alive: true }, { id: 3, x: 10, y: 0, alive: false },
    { id: 4, x: 20, y: 0, alive: true, curHp: 0 }, { id: 5, x: NaN, y: 0, alive: true }, null] };
  check('2. the nearest live monster (120), never the dead, the dying, the placeless', reachGap(S) === 120, reachGap(S));
  check('2. the caller\'s measure, handed the monster and you', reachGap(S, (m, P) => (m.id === 1 ? 5 : 500) + P.x) === 5);
  check('2. none: Infinity', reachGap({ player: { x: 0, y: 0 }, monsters: [] }) === Infinity && reachGap({ player: { x: 0, y: 0 } }) === Infinity && reachGap(null) === Infinity && reachGap({ monsters: [] }) === Infinity);
  check('2. a measure that says nothing is no monster', reachGap(S, () => undefined) === Infinity);
  const Q = { player: { x: 100, y: 200 }, monsters: [{ id: 1, x: 103, y: 196, alive: true }] };
  check('2. measured from where you stand (not the origin)', reachGap(Q) === 5, reachGap(Q));
  check('2. the curHp a number above 0 is alive', reachGap({ player: { x: 0, y: 0 }, monsters: [{ id: 1, x: 3, y: 4, alive: true, curHp: 1 }] }) === 5);
}

/* ── 3. the steps ── */
{
  const R = reachRange('melee');
  const S = { player: { x: 0, y: 0 } };
  check('3. nothing written: calm', thumbPhase(S) === 'calm' && thumbPhase(null) === 'calm');
  check('3. far, nothing seen: calm, no change', thumbStep(S, 1000, 500, R) === false && thumbPhase(S) === 'calm');
  S._sightPhase = 'sighted';
  check('3. a sighting: threat (a change)', thumbStep(S, 1100, 500, R) === true && thumbPhase(S) === 'threat');
  S._sightPhase = 'none';
  check('3. the sighting gone: calm', thumbStep(S, 1200, 500, R) === true && thumbPhase(S) === 'calm');
  latchTo(S, 'active', 'm1');
  check('3. a lock: threat', thumbStep(S, 1300, 500, R) === true && thumbPhase(S) === 'threat');
  latchTo(S, 'idle', null, 'press');
  thumbStep(S, 1400, 500, R);
  S.lastDamageTaken = 2000;
  check('3. a monster\'s hit, none in sight: threat', thumbStep(S, 2000, 500, R) === true && thumbPhase(S) === 'threat');
  check('3. ...held to just under 3 s after it', thumbStep(S, 4999, 500, R) === false && thumbPhase(S) === 'threat');
  check('3. ...and gone at 3 s', thumbStep(S, 5000, 500, R) === true && thumbPhase(S) === 'calm');
  check('3. hurtLately: a hit from the future or none is not', hurtLately({ lastDamageTaken: 10 }, 5) === false && hurtLately({}, 5) === false && hurtLately({ lastDamageTaken: 0 }, 5) === false && hurtLately(null, 5) === false && hurtLately({ lastDamageTaken: 5 }, 5) === true && hurtLately({ lastDamageTaken: 1 }, 2) === true);
  check('3. in reach (72): reach', thumbStep(S, 6000, 72, R) === true && thumbPhase(S) === 'reach' && S._thumbAt === 6000);
  check('3. ...held to the out line (90) with no change', thumbStep(S, 6100, 90, R) === false && thumbPhase(S) === 'reach' && S._thumbAt === 6100);
  check('3. ...past it, held for the hold (400 ms)', thumbStep(S, 6499, 91, R) === false && thumbPhase(S) === 'reach' && S._thumbAt === 6100);
  check('3. ...and gone after it: calm (nothing else)', thumbStep(S, 6500, 91, R) === true && thumbPhase(S) === 'calm');
  check('3. a new one needs the IN line: 73 is not reach', thumbStep(S, 6600, 73, R) === false && thumbPhase(S) === 'calm');
  S._sightPhase = 'sighted';
  thumbStep(S, 6700, 72, R);
  check('3. out of reach with one in sight: threat (Block stays)', thumbStep(S, 7200, 200, R) === true && thumbPhase(S) === 'threat');
  check('3. no S, no range: nothing', thumbStep(null, 1, 1, R) === false && thumbStep(S, 1, 1, null) === false && thumbPhase(S) === 'threat');
  check('3. a note with no moment yet: the hold counts from 0', (() => { const Q = { _thumbPhase: 'reach' }; return thumbStep(Q, 300, 500, R) === false && thumbStep(Q, 400, 500, R) === true; })());
}

/* ── 4. the edge, played ── */
{
  const R = reachRange('melee');
  const S = { player: { x: 0, y: 0 }, _sightPhase: 'sighted', monsters: [{ id: 'e', x: 200, y: 0, alive: true }] };
  let flips = 0, was = specialsUp(S), t = 0;
  const path = [200, 120, 70];
  for (let k = 0; k < 8; k++) path.push(80, 88, 71, 86, 75);   /* in once, then back and forth inside the out line */
  path.push(150, 150, 150, 150, 150, 150);
  for (const x of path) {
    S.monsters[0].x = x; t += 100;
    thumbStep(S, t, reachGap(S), R);
    const now = specialsUp(S);
    if (now !== was) { flips++; was = now; }
  }
  check('4. a monster back and forth across the reach\'s edge: the specials came once and went once', flips === 2 && was === false, flips);
  check('4. ...and Block stayed (the sighting)', blockUp(S) === true && thumbPhase(S) === 'threat');
}

/* ── 5. the door ── */
{
  const S = {};
  check('5. thumbTo refuses a word not of its list, and no S', thumbTo(S, 'near') === false && !S._thumbPhase && thumbTo(null, 'reach') === false && thumbTo('x', 'reach') === false);
  check('5. thumbTo writes, once', thumbTo(S, 'reach') === true && thumbTo(S, 'reach') === false && S._thumbPhase === 'reach');
  check('5. its three words', THUMB_PHASES.join() === 'calm,threat,reach' && Object.isFrozen(THUMB_PHASES) && Object.isFrozen(THUMB));
  S._thumbAt = 5;
  check('5. thumbClear: calm at once, the note emptied', thumbClear(S) === true && thumbPhase(S) === 'calm' && S._thumbAt === 0 && thumbClear(null) === false);
  check('5. blockUp, specialsUp, chargeUp: no S is no', blockUp(null) === false && specialsUp(null) === false && chargeUp(null, true) === false && blockUp('x') === false && specialsUp(7) === false);
  check('5. chargeUp: the weapon exactly true', chargeUp({ _sightPhase: 'sighted' }, 1) === false && chargeUp({ _sightPhase: 'sighted' }, true) === true);
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
  const WRITE = /(?:\._thumbPhase|\[\s*['"`]_thumbPhase['"`]\s*\])\s*(?:\?\?|\|\||&&|[-+*/%])?=(?!=)|delete\s+[\w$.]+\._thumbPhase\b|Object\.assign\(\s*[\w$.]+\s*,[^)]*\{[^}]*\b_thumbPhase\s*:/;
  const outside = [];
  let inDoorWrites = 0;
  for (const f of files) {
    const raw = readFileSync(new URL(f, ROOT), 'utf8');
    if (!raw.includes('_thumbPhase')) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'src/game/thumbSide.js') {
        if (/^export function thumbTo\(/.test(l)) inDoor = true;
        else if (inDoor && /^\}\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) inDoorWrites++; else outside.push(f + ':' + (i + 1));
    }
  }
  check('5. thumbTo writes the phase (once)', inDoorWrites === 1, inDoorWrites);
  check('5. no write of S._thumbPhase in src/ outside thumbTo', outside.length === 0, outside);
}

/* ── 6. Charge's lock ── */
{
  const S = { player: { x: 0, y: 0 }, _renderFacing: 'east', currentZone: 'wheel', monsters: [{ id: 'far', x: 300, y: 0, alive: true }] };
  latchFrame(S, 1, false, 'melee', 1);   /* the sight's range a sword's (latch.js's last frame) */
  check('6. nothing locked: the one in sight now, locked active (no attack, no auto)', chargeLock(S) === 'far' && S._latchPhase === 'active' && S._latchId === 'far');
  check('6. locked: the lock\'s id, nothing changed', chargeLock(S) === 'far' && S._latchPhase === 'active');
  const N = { player: { x: 0, y: 0 }, _renderFacing: 'east', monsters: [{ id: 'back', x: -300, y: 0, alive: true }], _sightPhase: 'sighted', _sightId: 'back' };
  check('6. nothing in sight NOW (behind you, the hold\'s kept id): null, nothing locked', chargeLock(N) === null && !N._latchPhase);
  check('6. no S: null', chargeLock(null) === null && chargeLock('x') === null);
}

/* ── 7. the switches ── */
{
  check('7. each on with no address', reachSpecialsOn('') && threatBlockOn('') && chargeBtnOn('') && reachSpecialsOn() && threatBlockOn() && chargeBtnOn());
  check('7. `?reachspecials=0` throws only it', !reachSpecialsOn('?reachspecials=0') && threatBlockOn('?reachspecials=0') && chargeBtnOn('?reachspecials=0'));
  check('7. `?threatblock=0` throws only it', !threatBlockOn('?threatblock=0') && reachSpecialsOn('?threatblock=0') && chargeBtnOn('?threatblock=0'));
  check('7. `?chargebtn=0` throws only it', !chargeBtnOn('?chargebtn=0') && reachSpecialsOn('?chargebtn=0') && threatBlockOn('?chargebtn=0'));
  check('7. `=1` throws none', reachSpecialsOn('?reachspecials=1') && threatBlockOn('?threatblock=1') && chargeBtnOn('?chargebtn=1'));
}

/* ── 8. the mirrors ── */
{
  const hits = findIn('data', /export const GS_OUTER_RADIUS = \d+;/);
  const m = hits.length === 1 ? /= (\d+);/.exec(hits[0].text) : null;
  check('8. THUMB.SWORD_PX is the data\'s GS_OUTER_RADIUS (the engage test\'s)', !!m && +m[1] === THUMB.SWORD_PX, hits);
  check('8. the shot and its slack are sight.js\'s', THUMB.SHOT_PX === SIGHT.SHOT_PX && THUMB.BOW_SLACK_PX === SIGHT.BOW_SLACK_PX && THUMB.STAFF_SLACK_PX === SIGHT.STAFF_SLACK_PX && THUMB.HYST === SIGHT.HYST && THUMB.HOLD_MS === SIGHT.HOLD_MS);
  check('8. the hurt window is 3 s', THUMB.HURT_MS === 3000);
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
