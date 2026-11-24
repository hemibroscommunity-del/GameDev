/* ═══ v2.3.6540: WHAT YOU HAVE IN SIGHT (card CT PR 1; src/game/sight.js) ═══
 *
 * The two buttons (`?manual=5`, a trial).  The owner, 2026-11-23: "The line
 * of site will become visible if it's within target range of the monster
 * (target range will depend on whether melee weapon or ranged weapon is
 * equipped with range being longer)."  What it does, played on the module:
 *
 *   1. THE RANGES: a sword's is today's ring (440, held out to 550); a bow's
 *      and a staff's the worker's reach less its slack (675 x the gear's
 *      multiplier), held out by the same share but never past what the
 *      worker would land (hitproof.js _hitReach's 675 x mult + slack);
 *   2. THE EDGE: a monster walking in is sighted at 440, not before; walking
 *      out it is lost past 550, not before;
 *   3. THE CONE: 45 degrees each side of the facing for a new one, 55 to keep
 *      one; a dead monster is never sighted;
 *   4. OF SEVERAL: the one nearest the facing's line wins, then the nearest;
 *   5. NO FLICKER: the phase goes to sighted at once and to none only
 *      HOLD_MS after the last sighting; a monster walked back and forth
 *      across the edge changes it once; a zone change clears it at once;
 *   6. THE DOOR: sightTo writes the phase, refuses another word, and no write
 *      of S._sightPhase in src/ is outside it (the phase table's guard reads
 *      the same off the syntax tree, DOOR_SUITES).
 *
 * v2.3.6543 (card CT PR 4: the sight line, and Block and the specials
 * appearing):
 *   7. THE LINE (sightLine): from the body to the monster in sight while the
 *      phase is sighted and the frame's step still sights (S._sightAt within
 *      HOLD_MS), never to one dead, at 0 hp, gone, or nowhere;
 *   8. THE BUTTONS (controlVisibility.js combatButtonsShown, the one
 *      resolver): any other mode, every button's own rule; the two buttons,
 *      on screen while sighted, latched, or in a fight between players, and
 *      nothing else; the fight asked last;
 *   9. THE LEAF (rendering/leaves/effects-sight.js sightStream, handed the
 *      line; v2.3.6544: drawSightLine, rendering/sightLineDraw.js, makes it
 *      from the state and keeps the QA record): drawSightLine draws the
 *      bow's stream to the monster, from the body, its length the gap;
 *      nothing while the bow's own beam is drawn; beamStream draws one closed
 *      polygon as the renderer's did;
 *  10. THE CALLERS, off the syntax tree (an ALLOW list): Block, Special and
 *      Whirlwind / Shield Bash each ask the resolver with
 *      `twoButtonsLive()` (the one gate, v2.3.6542) and `fightOn`, in the render's own
 *      gate (its `return null`), and nothing else in src/ calls it; the
 *      renderer calls drawSightLine once, in its overlays, after the bow's
 *      beam, with `shouldDraw && isBow`.
 *
 * Break proof, tried by hand: `if (d > (kept ? range.out : range.in))` ->
 * `if (d > range.in)` -> FAIL 2 and 5; `S._sightPhase = 'none';` in
 * sightClear -> FAIL 6 (and the guard's §2).
 * v2.3.6543, tried by hand (each FAILs its section): `<= SIGHT.HOLD_MS` ->
 * `< SIGHT.HOLD_MS` (7); `String(m.id) !== k` -> `m.id !== S._sightId` (7);
 * the dead test dropped (7); `|| latchPhase(S) === 'active'` dropped (8);
 * `!!fight(S)` -> `!!fight` (8); `if (!twoOn) return true` -> `false` (8);
 * the `beamDrawn` skip dropped (9); ShieldButton's resolver call dropped, or
 * its `!fineInput()` dropped (10); a fourth caller in src/ (10).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { findIn } from '../../tools/guards/lib/filesOf.mjs';
import { SIGHT, SIGHT_PHASES, sightRange, sightPick, sightPhase, sightTo, sightStep, sightClear, angleOff, sightLine } from '../../src/game/sight.js';   /* v2.3.6543: + the line */
import { combatButtonsShown, combatReach } from '../../src/game/controlVisibility.js';   /* v2.3.6543 */
import { latchTo, latchFrame, latchReach } from '../../src/game/latch.js';   /* v2.3.6543 */
import { beamStream, sightStream } from '../../src/rendering/leaves/effects-sight.js';   /* v2.3.6543; v2.3.6544: the leaf only draws (main's leaves guard) */
import { drawSightLine } from '../../src/rendering/sightLineDraw.js';   /* v2.3.6544: the line made from the state, and its QA record, off the leaf */
import { babel } from '../../tools/guards/lib/renderTables.mjs';   /* v2.3.6543: the callers off the syntax tree */

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const near = (a, b) => Math.abs(a - b) < 1e-9;
const deg = (d) => (d * Math.PI) / 180;
const me = { x: 1000, y: 1000 };
const mon = (id, d, a = 0, alive = true) => ({ id, x: me.x + Math.cos(deg(a)) * d, y: me.y + Math.sin(deg(a)) * d, alive });

/* ── 1. the ranges ── */
{
  const sw = sightRange('melee'), bow = sightRange('ranged'), staff = sightRange('staff'), bow12 = sightRange('ranged', 1.2);
  check('1. a sword: today\'s ring, 440 held out to 550', sw.in === 440 && sw.out === 550, sw);
  check('1. a bare hand or an unknown slot is a sword\'s', sightRange(undefined).in === 440 && sightRange('fists').out === 550);
  check('1. a bow: 675, held out to 825 (the worker\'s 675 + 150, under 675 x 1.25)', bow.in === 675 && bow.out === 825, bow);
  check('1. a staff: 675, held out to 843.75 (675 x 1.25, under the worker\'s 675 + 250)', staff.in === 675 && near(staff.out, 843.75), staff);
  check('1. a bow with gear of 1.2: 810, held out to 960', near(bow12.in, 810) && near(bow12.out, 960), bow12);
  check('1. a ranged weapon sights farther than a sword (the owner: "range being longer")', bow.in > sw.in && staff.in > sw.in);
  let over = [];
  for (const m of [0.5, 1, 1.2, 1.5, 2]) for (const [slot, slack] of [['ranged', 150], ['staff', 250]]) {
    const r = sightRange(slot, m);
    if (r.out > 675 * m + slack + 1e-9 || r.in > 675 * m) over.push([slot, m, r]);
  }
  check('1. never more than the worker would land (any gear)', over.length === 0, over);
  const hp = readFileSync(new URL('../src/hitproof.js', import.meta.url), 'utf8');
  check('1. the mirror: hitproof.js still says 675, 150 and 250', /ARROW_PX: 675,/.test(hp) && /ARROW_SLACK_PX: 150,/.test(hp) && /STAFF_SLACK_PX: 250,/.test(hp));
  const tg = readFileSync(new URL('../../src/game/targeting.js', import.meta.url), 'utf8');
  check('1. the mirror: the sword\'s ring is still 220 x 2, held out by 1.25',
    findIn('data', /export const TARGET_PERIMETER_PX = 220;/).length === 1 && findIn('data', /export const TARGET_HYST = 1\.25;/).length === 1 && /MELEE_PERIMETER_K = 2;/.test(tg) && SIGHT.SWORD_PX === 440 && SIGHT.HYST === 1.25);
}

/* ── 2. the edge ── */
{
  const R = sightRange('melee');
  let cur = null, firstIn = null, firstOut = null;
  for (let d = 600; d >= 300; d -= 1) { const p = sightPick(me, 0, [mon('a', d)], R, cur); if (p && firstIn == null) firstIn = d; cur = p ? p.id : null; }
  check('2. walking in: sighted at 440, not before', firstIn === 440, firstIn);
  for (let d = 300; d <= 700; d += 1) { const p = sightPick(me, 0, [mon('a', d)], R, cur); if (!p && firstOut == null) firstOut = d; cur = p ? p.id : null; }
  check('2. walking out: lost past 550, not before', firstOut === 551, firstOut);
  check('2. a bow\'s edge: 675 in, 825 out', !!sightPick(me, 0, [mon('a', 675)], sightRange('ranged'), null) && !sightPick(me, 0, [mon('a', 676)], sightRange('ranged'), null) && !!sightPick(me, 0, [mon('a', 825)], sightRange('ranged'), 'a') && !sightPick(me, 0, [mon('a', 826)], sightRange('ranged'), 'a'));
}

/* ── 3. the cone ── */
{
  const R = sightRange('melee');
  check('3. 44 degrees off the facing: sighted; 46: not', !!sightPick(me, 0, [mon('a', 200, 44)], R, null) && !sightPick(me, 0, [mon('a', 200, 46)], R, null));
  check('3. the one sighted keeps it to 55 degrees, not past', !!sightPick(me, 0, [mon('a', 200, 54)], R, 'a') && !sightPick(me, 0, [mon('a', 200, 56)], R, 'a'));
  check('3. behind you: never', !sightPick(me, 0, [mon('a', 100, 180)], R, null));
  check('3. a dead monster: never', !sightPick(me, 0, [mon('a', 100, 0, false)], R, null) && !sightPick(me, 0, [mon('a', 100, 0, false)], R, 'a'));
  check('3. the facing\'s way, not east: facing south sees a monster south', !!sightPick(me, Math.PI / 2, [mon('a', 200, 90)], R, null) && !sightPick(me, Math.PI / 2, [mon('a', 200, 0)], R, null));
  check('3. the angle wraps at west', near(angleOff(deg(179), deg(-179)), deg(2)));
  /* v2.3.6540 (the gatekeeper's sitting 56, plant S11): the other way round */
  check('3. ...and the other way: facing west (+PI), a monster up-left (-135 deg) is 45 off', near(angleOff(deg(-135), Math.PI), deg(45)) && near(angleOff(deg(-179), deg(179)), deg(2)));
}

/* ── 4. of several ── */
{
  const R = sightRange('melee');
  const p = sightPick(me, 0, [mon('near', 100, 20), mon('line', 400, 10)], R, null);
  check('4. the one nearest the facing\'s line wins over a nearer one off it', p && p.id === 'line', p);
  const q = sightPick(me, 0, [mon('far', 400, 10), mon('close', 150, 10)], R, null);
  check('4. on the same line, the nearest', q && q.id === 'close', q);
  const r = sightPick(me, 0, [mon('dead', 50, 0, false), mon('live', 300, 30)], R, null);
  check('4. a dead one on the line does not win', r && r.id === 'live', r);
}

/* ── 5. no flicker ── */
{
  const R = sightRange('melee');
  const S = {};
  let t = 0, changes = 0;
  const frame = (d) => { const p = sightPick(me, 0, [mon('a', d)], R, S._sightId || null); if (sightStep(S, p, t)) changes++; t += 50; };
  frame(700); frame(600);
  check('5. nothing in range: none, no change', sightPhase(S) === 'none' && changes === 0);
  frame(430);
  check('5. sighted at once', sightPhase(S) === 'sighted' && S._sightId === 'a' && changes === 1);
  for (let i = 0; i < 60; i++) frame(i % 2 ? 545 : 556);   /* back and forth across the out edge, three seconds */
  check('5. walked back and forth across the edge: no change at all', changes === 1 && sightPhase(S) === 'sighted', changes);
  for (let i = 0; i < 60; i++) frame(i % 2 ? 435 : 445);   /* and across the in edge */
  check('5. ...and across the in edge: none', changes === 1, changes);
  frame(700);
  check('5. gone past the edge: still sighted for the hold', sightPhase(S) === 'sighted');
  const goneAt = t;
  while (t - goneAt < SIGHT.HOLD_MS + 100) frame(700);
  check('5. ...then none, once', sightPhase(S) === 'none' && changes === 2 && S._sightId === null, changes);
  frame(430);
  check('5. a zone change: none at once, no hold', sightClear(S) === true && sightPhase(S) === 'none' && S._sightId === null);
}

/* ── 6. the door ── */
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
  check('6. nothing written: none', sightPhase(S) === 'none' && SIGHT_PHASES.join() === 'none,sighted');
  check('6. sightTo writes a phase of its list, once', sightTo(S, 'sighted') === true && sightTo(S, 'sighted') === false && S._sightPhase === 'sighted');
  check('6. ...and refuses another word', sightTo(S, 'seen') === false && S._sightPhase === 'sighted');
  const w = writesOutside('_sightPhase', 'src/game/sight.js', 'sightTo');
  check('6. sightTo writes the phase', w.inDoorWrites === 1, w.inDoorWrites);
  check('6. no write of S._sightPhase in src/ outside sightTo', w.outside.length === 0, w.outside);
}

/* ── 7. the line (v2.3.6543) ── */
{
  const T = 50000;
  const mk = (over) => Object.assign({ player: { x: 1000, y: 1000 }, monsters: [{ id: 7, x: 1300, y: 1400, alive: true, curHp: 9 }], _sightPhase: 'sighted', _sightId: 7, _sightAt: T }, over || {});
  const l = sightLine(mk(), T + 10);
  check('7. sighted: from the body to the monster, its length the gap', !!l && l.id === 7 && l.x0 === 1000 && l.y0 === 1000 && l.x1 === 1300 && l.y1 === 1400 && near(l.d, 500), l);
  check('7. one object, reused', sightLine(mk(), T) === l);
  check('7. the id read as words both sides (a number spawned, a string over the wire)', !!sightLine(mk({ _sightId: '7' }), T) && !!sightLine(mk({ monsters: [{ id: '7', x: 1, y: 2, alive: true }] }), T));
  check('7. held to HOLD_MS after the step last sighted, not a moment more', !!sightLine(mk(), T + SIGHT.HOLD_MS) && sightLine(mk(), T + SIGHT.HOLD_MS + 1) === null);
  check('7. no clock, nothing', sightLine(mk(), undefined) === null && sightLine(mk(), NaN) === null);
  check('7. phase none: nothing (with a kept id)', sightLine(mk({ _sightPhase: 'none' }), T) === null && sightLine(mk({ _sightPhase: undefined }), T) === null);
  check('7. no id, no body, no S: nothing', sightLine(mk({ _sightId: null }), T) === null && sightLine(mk({ player: null }), T) === null && sightLine(null, T) === null);
  check('7. the monster gone from the list: nothing', sightLine(mk({ monsters: [{ id: 8, x: 1, y: 2, alive: true }] }), T) === null && sightLine(mk({ monsters: null }), T) === null);
  check('7. dead, or at 0 hp: nothing', sightLine(mk({ monsters: [{ id: 7, x: 1, y: 2, alive: false }] }), T) === null && sightLine(mk({ monsters: [{ id: 7, x: 1, y: 2, alive: true, curHp: 0 }] }), T) === null);
  check('7. nowhere (a place not a number): nothing', sightLine(mk({ monsters: [{ id: 7, x: NaN, y: 2, alive: true }] }), T) === null && sightLine(mk({ monsters: [{ id: 7, x: 1, y: Infinity, alive: true }] }), T) === null && sightLine(mk({ player: { x: NaN, y: 0 } }), T) === null && sightLine(mk({ player: { x: 0, y: undefined } }), T) === null);
  check('7. the first of the same id, a hole in the list skipped', !!sightLine(mk({ monsters: [null, { id: 7, x: 1000, y: 1100, alive: true }] }), T));
  /* played: a frame's step sights it, the line follows; walked out, the line
     stays the HOLD and goes with the phase */
  const S = { player: { x: 0, y: 0 }, monsters: [{ id: 'm', x: 300, y: 0, alive: true }] };
  const R = sightRange('melee');
  sightStep(S, sightPick(S.player, 0, S.monsters, R, null), 1000);
  const a = sightLine(S, 1000);
  check('7. played: sighted at 300, the line drawn', !!a && near(a.d, 300), a);
  S.monsters[0].x = 600;
  sightStep(S, sightPick(S.player, 0, S.monsters, R, S._sightId), 1100);
  check('7. played: past 550, the line held while the phase holds', !!sightLine(S, 1100) && sightPhase(S) === 'sighted');
  sightStep(S, sightPick(S.player, 0, S.monsters, R, S._sightId), 1000 + SIGHT.HOLD_MS + 1);
  check('7. played: the phase gone, the line gone', sightPhase(S) === 'none' && sightLine(S, 1000 + SIGHT.HOLD_MS + 1) === null);
}

/* ── 8. the buttons: the one resolver (v2.3.6543) ── */
{
  let asked = 0;
  const yes = () => { asked++; return true; }, no = () => { asked++; return false; };
  check('8. any other mode: every button\'s own rule (true), whatever S', combatButtonsShown({}, false, no) === true && combatButtonsShown(null, false, false) === true && combatButtonsShown(undefined, 0) === true);
  check('8. the two buttons, nothing in sight, no latch, no fight: hidden', combatButtonsShown({}, true, no) === false && combatButtonsShown({}, true, false) === false && combatButtonsShown({}, true) === false);
  check('8. the two buttons, no S: hidden', combatButtonsShown(null, true, yes) === false);
  asked = 0;
  check('8. sighted: shown, and the fight not asked', combatButtonsShown({ _sightPhase: 'sighted' }, true, no) === true && asked === 0);
  const L = {};
  latchTo(L, 'active', 'm1');
  check('8. the latch active (combat on): shown', combatButtonsShown(L, true, no) === true && asked === 0);
  latchTo(L, 'idle', null, 'press');
  check('8. the latch let go, nothing in sight: hidden', combatButtonsShown(L, true, no) === false);
  check('8. a fight between players (sparTargets fightOn): shown', combatButtonsShown({}, true, yes) === true && combatButtonsShown({}, true, true) === true);
  const seen = [];
  combatButtonsShown({ k: 1 }, true, (s) => { seen.push(s && s.k); return false; });
  check('8. the fight asked of S', seen.length === 1 && seen[0] === 1, seen);
  /* the edge, played: the buttons follow the phase, one change in, one out */
  const S = { player: { x: 0, y: 0 }, monsters: [{ id: 'e', x: 600, y: 0, alive: true }] };
  const R = sightRange('melee');
  let flips = 0, was = combatButtonsShown(S, true, false), t = 0;
  const path = [];
  for (let k = 0; k < 6; k++) path.push(600, 500, 435, 470, 545, 480);   /* in once, then back and forth between 435 and 545 */
  path.push(700, 700, 700, 700, 700, 700, 700, 700);
  for (const x of path) {
    S.monsters[0].x = x; t += 100;
    sightStep(S, sightPick(S.player, 0, S.monsters, R, S._sightId == null ? null : S._sightId), t);
    const now = combatButtonsShown(S, true, false);
    if (now !== was) { flips++; was = now; }
  }
  check('8. a monster walked back and forth across the edge: the buttons came once and went once', flips === 2 && was === false, flips);
  /* their "a monster near": the sight's range in the two buttons */
  check('8. reach: a sword\'s before any frame, 550 (the sight held out)', latchReach() === 550 && combatReach(true, 220) === 550, latchReach());
  check('8. reach: any other mode, the base untouched', combatReach(false, 220) === 220 && combatReach(0, 300) === 300);
  latchFrame({ player: { x: 0, y: 0 }, monsters: [], currentZone: 'wheel' }, 1, false, 'ranged', 1);
  check('8. reach: a bow\'s once a frame sighted with it (825, the worker\'s 675 + 150)', latchReach() === 825 && combatReach(true, 220) === 825, latchReach());
  check('8. reach: never less than the base', combatReach(true, 900) === 900);
  latchFrame({ player: { x: 0, y: 0 }, monsters: [], currentZone: 'wheel' }, 2, false, 'melee', 1);
  check('8. reach: back to the sword\'s', latchReach() === 550);
}

/* ── 9. the leaf (v2.3.6543) ── */
{
  const rec = () => { const g = { ops: [] }; for (const k of ['moveTo', 'lineTo', 'closePath', 'fill']) g[k] = (...a) => { g.ops.push([k, ...a]); return g; }; return g; };
  const g0 = rec();
  beamStream(g0, { x: 10, y: 20 }, 0, 240, 0);
  const lines = g0.ops.filter((o) => o[0] === 'lineTo').length;
  const fill = g0.ops.find((o) => o[0] === 'fill');
  check('9. beamStream: one closed polygon along the heading, white at 0.2 (the renderer\'s)', g0.ops[0][0] === 'moveTo' && near(g0.ops[0][1], 10) && lines === 2 * 25 - 1 && g0.ops.filter((o) => o[0] === 'closePath').length === 1 && !!fill && fill[1].color === 0xffffff && fill[1].alpha === 0.2, { lines, fill });
  const xs = g0.ops.filter((o) => o[0] === 'lineTo').map((o) => o[1]);
  check('9. beamStream: as long as asked (240 px east)', near(Math.max(...xs), 250), Math.max(...xs));
  const now = Date.now();
  const S = { player: { x: 100, y: 100 }, monsters: [{ id: 3, x: 100, y: 400, alive: true }], _sightPhase: 'sighted', _sightId: 3, _sightAt: now + 60000 };
  const g1 = rec();
  check('9. drawSightLine: sighted, drawn', drawSightLine(g1, S, 0, false) === true && g1.ops.length > 0);
  const ys = g1.ops.filter((o) => o[0] === 'lineTo').map((o) => o[2]);
  check('9. ...from the body, south to the monster', near(g1.ops[0][2], 100) && Math.abs(g1.ops[0][1] - 100) < 4, g1.ops[0]);
  check('9. ...reaching the monster', Math.abs(Math.max(...ys) - 400) < 4, Math.max(...ys));
  const g2 = rec();
  check('9. the bow\'s own beam drawn this frame: nothing', drawSightLine(g2, S, 0, true) === false && g2.ops.length === 0);
  const g3 = rec();
  check('9. nothing in sight: nothing', drawSightLine(g3, Object.assign({}, S, { _sightPhase: 'none' }), 0, false) === false && g3.ops.length === 0);
  check('9. no graphic, or on the body: nothing, no throw', drawSightLine(null, S, 0, false) === false && drawSightLine(rec(), Object.assign({}, S, { monsters: [{ id: 3, x: 100, y: 100, alive: true }] }), 0, false) === false);
  /* v2.3.6544: the leaf alone, handed the line (it reads no state): what it says it did */
  const ln = { id: 3, x0: 100, y0: 100, x1: 100, y1: 400, d: 300 };
  const g4 = rec();
  check('9. sightStream: a line, drawn, and says so', sightStream(g4, ln, 0, false) === 'drawn' && g4.ops.length > 0 && near(g4.ops[0][2], 100));
  const g5 = rec();
  check('9. sightStream: the bow\'s beam this frame, none, nothing in sight: each said, nothing drawn',
    sightStream(g5, ln, 0, true) === 'bow-beam' && sightStream(null, ln, 0, false) === 'none' && sightStream(g5, Object.assign({}, ln, { d: 1 }), 0, false) === 'none' && sightStream(g5, null, 0, false) === null && g5.ops.length === 0);
}

/* ── 10. the callers, off the syntax tree: an ALLOW list (v2.3.6543) ── */
{
  const { parse, traverse } = babel();
  const ROOT = new URL('../../', import.meta.url);
  const walk = (dir, out) => {
    for (const e of readdirSync(new URL(dir, ROOT))) {
      const rel = dir + e;
      if (statSync(new URL(rel, ROOT)).isDirectory()) walk(rel + '/', out);
      else if (/\.jsx?$/.test(e)) out.push(rel);
    }
    return out;
  };
  /* the resolver's callers: the file, and the component whose render asks */
  const ALLOW = Object.freeze({
    'src/ui/panels/ShieldButton.jsx': 2,   /* the render's gate, and its QA probe */
    'src/ui/panels/SpecialButton.jsx': 2,   /* the render's gate, and its QA probe */
    'src/ui/panels/AbilityButtons.jsx': 1,   /* the render's gate */
  });
  const calls = Object.create(null), bad = [], gates = Object.create(null), draws = [], reach = Object.create(null), reachBad = [];
  /* v2.3.6542 (the gatekeeper's sitting 60): the one gate, latch.js twoButtonsLive() (latch.test H2 holds every caller of twoButtonsOn) */
  const isTwoOn = (e) => !!e && e.type === 'CallExpression' && e.callee.type === 'Identifier' && e.callee.name === 'twoButtonsLive' && e.arguments.length === 0;
  for (const f of walk('src/', [])) {
    const src = readFileSync(new URL(f, ROOT), 'utf8');
    if (!src.includes('combatButtonsShown') && !src.includes('drawSightLine')) continue;
    const ast = parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
    traverse(ast, {
      CallExpression(path) {
        const n = path.node;
        if (n.callee.type !== 'Identifier') return;
        if (n.callee.name === 'drawSightLine') {
          const fn = path.getFunctionParent();
          const a = n.arguments;
          draws.push({ f, in: fn && fn.node.key ? fn.node.key.name : null,
            args: a.length === 4 && a[0].type === 'Identifier' && a[0].name === 'gfx' && a[1].type === 'Identifier' && a[1].name === 'S' && a[2].type === 'Identifier' && a[2].name === 'now'
              && a[3].type === 'LogicalExpression' && a[3].operator === '&&' && a[3].left.name === 'shouldDraw' && a[3].right.name === 'isBow',
            line: n.loc && n.loc.start.line });
          return;
        }
        if (n.callee.name !== 'combatButtonsShown') return;
        calls[f] = (calls[f] || 0) + 1;
        const a = n.arguments;
        const ok = a.length === 3 && isTwoOn(a[1]) && a[2].type === 'Identifier' && a[2].name === 'fightOn';
        if (!ok) bad.push(f + ':' + (n.loc && n.loc.start.line));
        /* in the gate, beside it: the button's own rule handed the reach */
        const own = path.findParent((p) => p.isLogicalExpression());
        if (own) {
          const other = own.node.left === n || (own.node.left.type === 'UnaryExpression' && own.node.left.argument === n) ? own.node.right : own.node.left;
          const oc = other.type === 'UnaryExpression' ? other.argument : other;
          if (oc.type === 'CallExpression' && oc.callee.type === 'Identifier' && /ButtonLive$/.test(oc.callee.name)) {
            const r = oc.arguments[1];
            const reachOk = !!r && r.type === 'CallExpression' && r.callee.type === 'Identifier' && r.callee.name === 'combatReach' && r.arguments.length === 2 && isTwoOn(r.arguments[0])
              && r.arguments[1].type === 'Identifier' && r.arguments[1].name === 'TARGET_PERIMETER_PX';
            reach[f] = (reach[f] || 0) + (reachOk ? 1 : 0);
            if (!reachOk) reachBad.push(f + ':' + (n.loc && n.loc.start.line));
          }
        }
        /* the render's gate: the call decides a `return null` of the component */
        const ifp = path.findParent((p) => p.isIfStatement());
        const decl = path.findParent((p) => p.isVariableDeclarator());
        if (ifp && ifp.node.consequent.type === 'ReturnStatement' && ifp.node.consequent.argument && ifp.node.consequent.argument.type === 'NullLiteral') gates[f] = (gates[f] || 0) + 1;
        else if (decl && decl.node.id.name === 'live') {
          /* ShieldButton: `var live = ... && combatButtonsShown(...)`, then `if (!live && !S._shieldUp) return null` */
          const b = path.scope.getBinding('live');
          const used = b && b.referencePaths.some((r) => { const i = r.findParent((p) => p.isIfStatement()); return i && i.node.consequent.type === 'ReturnStatement' && i.node.consequent.argument && i.node.consequent.argument.type === 'NullLiteral'; });
          if (used && b.constantViolations.length === 0) gates[f] = (gates[f] || 0) + 1;
        }
      },
    });
  }
  const want = Object.keys(ALLOW).sort().join(), got = Object.keys(calls).sort().join();
  check('10. the resolver\'s callers are the three buttons, and nothing else in src/', want === got, { want, got });
  check('10. ...each as many times as listed', Object.keys(ALLOW).every((f) => calls[f] === ALLOW[f]), calls);
  check('10. ...each with `twoButtonsLive()` and `fightOn`', bad.length === 0, bad);
  check('10. ...each in its render\'s gate (its `return null`)', Object.keys(ALLOW).every((f) => gates[f] === 1), gates);
  check('10. Block\'s and Special\'s own rules handed `combatReach(twoButtonsLive(), TARGET_PERIMETER_PX)` beside the resolver',
    reach['src/ui/panels/ShieldButton.jsx'] === 1 && reach['src/ui/panels/SpecialButton.jsx'] === 1 && reachBad.length === 0, { reach, reachBad });
  check('10. the renderer draws the sight line once, in its overlays, with `gfx, S, now, shouldDraw && isBow`',
    draws.length === 1 && /\/systems\/effects[A-Z]\w+\.js$/.test(draws[0].f) && draws[0].in === '_updateOverlays' && draws[0].args, draws);   /* the effects renderer, by its folder (tests-by-system: no suite names a big file by its path) */
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
