/* ═══ v2.3.5520: THE POSE'S PAGE DOOR -- ONE WRITER OF THE PHONE'S HELD POSE (card L PR 5) ═══
 * (docs/specs/pose-door.md, "the page")
 *
 * The phone's held pose is one field, `S._pose` (none: standing; or its
 * record: posing), written only by src/game/poseDoor.js poseTo, by a way of
 * POSE_PAGE_WAYS (hold, stand, forget).  Its rules are sendMove's and
 * endOwnPose's own checks (`?posedoor=0` lifts them).  This suite:
 *
 *   1. the door's own rules: each way's phase, a pose held by the living
 *      only, with its id and its place, a stand-up only of a pose, the
 *      switch;
 *   2. A SECOND WRITER FAILS: a write of `._pose` anywhere in src/ outside
 *      poseTo; every way has its caller (interactions.js hold and stand,
 *      rejoinSlots.js forget).  The phase table's guard reads the same off
 *      the syntax tree (tools/guards/phase-table.test.mjs §2, DOOR_SUITES);
 *   3. game/interactions.js and game/rejoinSlots.js THEMSELVES, loaded here
 *      (their `@/` imports resolved to src/, pixi.js stubbed, .json read):
 *      a sit and its `pose` to the worker; a dance replacing it; a step, a
 *      knock-back, a moment's move, each standing you up with its word to
 *      the worker; the zone's reset (runResets('zone')); the rejoin's
 *      rejoinClear, which says nothing;
 *   4. step 1 changes nothing: a pose asked by the dead is still refused
 *      before the door, and a stand-up of no pose still says nothing.
 *
 * Break proof, tried by hand: `S._pose = null;` put back in rejoinSlots.js
 * rejoinClear -> FAIL 2 (and the guard's §2).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { register } from 'node:module';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* the page's `@/` alias, pixi.js as a stub, and .json as a module, for
   interactions.js and what it imports (ladder-passes.test's hook) */
const SRC = new URL('../../src/', import.meta.url);
const pixiNames = new Set();
(function walk(d) {
  for (const f of readdirSync(d)) {
    const u = new URL(f, d);
    if (statSync(u).isDirectory()) walk(new URL(f + '/', d));
    else if (/\.(js|jsx|mjs)$/.test(f)) {
      for (const m of readFileSync(u, 'utf8').matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]pixi\.js['"]/g)) {
        for (const x of m[1].split(',')) { const k = x.trim().split(/\s+as\s+/)[0].trim(); if (/^[A-Za-z_$][\w$]*$/.test(k)) pixiNames.add(k); }
      }
    }
  }
})(SRC);
const PIXI_STUB = 'const P = new Proxy(function () {}, { get: (t, k) => (k === "prototype" ? t.prototype : k === Symbol.toPrimitive ? () => 0 : (typeof k === "symbol" ? undefined : P)), apply: () => P, construct: () => ({}) });\nexport default P;\n'
  + [...pixiNames].map((n) => `export const ${n} = P;`).join('\n');
register('data:text/javascript,' + encodeURIComponent(
  `export async function resolve(s, c, next) {
     if (s === 'pixi.js') return { url: 'data:text/javascript,' + encodeURIComponent(${JSON.stringify(PIXI_STUB)}), shortCircuit: true };
     if (s.startsWith('@/')) { let u = ${JSON.stringify(SRC.href)} + s.slice(2); if (!/\\.[a-z]+$/.test(u)) u += '.js'; return next(u, c); }
     return next(s, c);
   }
   export async function load(url, c, next) {
     if (url.startsWith('file:') && url.endsWith('.json')) {
       const { readFileSync } = await import('node:fs');
       return { format: 'module', source: 'export default ' + readFileSync(new URL(url), 'utf8') + ';', shortCircuit: true };
     }
     return next(url, c);
   }`));

/* the art loaders some of the graph starts at import only warn here (no Image in node) */
const warn = console.warn, error = console.error;
const quiet = (f) => (...a) => { if (!/^\[fx-strips\]/.test(String(a[0]))) f(...a); };
console.warn = quiet(warn); console.error = quiet(error);

const { poseTo, posePhase, POSE_PAGE_WAYS } = await import(new URL('game/poseDoor.js', SRC).href);
const I = await import(new URL('game/interactions.js', SRC).href);
const RS = await import(new URL('game/rejoinSlots.js', SRC).href);
const { runResets } = await import(new URL('game/resetOn.js', SRC).href);
const { setActionTransport } = await import(new URL('game/actions.js', SRC).href);

let clock = 1_900_000_000_000;
Date.now = () => clock;
const setSearch = (s) => { globalThis.location = { search: s }; };

/* ── 1. the door's own rules ── */
{
  check('1. the ways and their phases (the phase table\'s words)',
    JSON.stringify(POSE_PAGE_WAYS) === JSON.stringify({ hold: 'posing', stand: 'standing', forget: 'standing' }));
  setSearch('');
  const S = { _pose: null, player: { x: 10, y: 20 } };
  const rec = (o) => Object.assign({ id: 'sit', at: clock, popAt: clock, x: 10, y: 20, zone: 'wheel' }, o || {});
  check('1. standing at first', posePhase(S) === 'standing');
  check('1. a stand-up of no pose is refused (endOwnPose: nothing to stand up)', poseTo(S, null, 'stand') === false && S._pose === null);
  check('1. a hold writes its record', poseTo(S, rec(), 'hold') === true && posePhase(S) === 'posing' && S._pose.id === 'sit');
  const first = S._pose;
  check('1. ...and a new hold replaces it, as before', poseTo(S, rec({ id: 'robot' }), 'hold') === true && S._pose !== first && S._pose.id === 'robot');
  check('1. a pose with no id, or no place, or no start, is refused',
    poseTo(S, rec({ id: '' }), 'hold') === false && poseTo(S, rec({ x: NaN }), 'hold') === false && poseTo(S, rec({ at: undefined }), 'hold') === false && S._pose.id === 'robot');
  check('1. a stand-up: standing', poseTo(S, null, 'stand') === true && S._pose === null && posePhase(S) === 'standing');
  S.player.dead = true;
  check('1. the dead hold no pose', poseTo(S, rec(), 'hold') === false && S._pose === null);
  S.player.dead = false; S._dead = true;
  check('1. ...nor the dying (S._dead)', poseTo(S, rec(), 'hold') === false && S._pose === null);
  S._dead = false;
  check('1. the rejoin\'s forget, of a pose or of none', (poseTo(S, rec(), 'hold'), poseTo(S, null, 'forget')) === true && S._pose === null && poseTo(S, null, 'forget') === true);
  check('1. a way to standing takes no record', poseTo(S, rec(), 'stand') === false && poseTo(S, rec(), 'forget') === false);
  check('1. an unknown way, one off the prototype, or no state is refused',
    poseTo(S, null, 'nope') === false && poseTo(S, null, 'toString') === false && poseTo(null, rec(), 'hold') === false);
  setSearch('?posedoor=0');
  S.player.dead = true;
  check('1. ?posedoor=0: a pose by the dead, one with no place, a stand-up of none, as the old lines could have',
    poseTo(S, rec({ x: NaN }), 'hold') === true && posePhase(S) === 'posing' && (poseTo(S, null, 'stand'), poseTo(S, null, 'stand')) === true);
  check('1. ...but a pose still has its id', poseTo(S, rec({ id: '' }), 'hold') === false);
  S.player.dead = false;
  setSearch('');
}

/* ── 2. no second writer ── */
{
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
  const WRITE = /(?:\._pose|\[\s*['"`]_pose['"`]\s*\])\s*(?:\?\?|\|\||&&|\*\*|[-+*/%])?=(?!=)|delete\s+[\w$.]+\._pose\b|Object\.assign\(\s*[\w$.]+\s*,[^)]*\{[^}]*\b_pose\s*:/;
  const outside = [];
  let doorWrites = 0;
  for (const f of files) {
    const raw = readFileSync(new URL(f, ROOT), 'utf8');
    if (!raw.includes('_pose')) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'src/game/poseDoor.js') {
        if (/^export function poseTo\(S, rec, way\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\}\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. poseTo writes the pose (standing, and a record)', doorWrites === 2, doorWrites);
  check('2. no write of ._pose in src/ outside poseTo', outside.length === 0, outside);
  const code = (p) => strip(readFileSync(new URL(p, ROOT), 'utf8'));
  const ways = (src) => [...src.matchAll(/poseTo\(S,\s*(?:null|\{[^}]*\}),\s*'([a-z]+)'\)/g)].map((m) => m[1]).sort();
  const it = code('src/game/interactions.js');
  check('2. interactions.js asks hold (sendMove) and stand (endOwnPose)', ways(it).join() === 'hold,stand', ways(it));
  const eop = it.slice(it.indexOf('export function endOwnPose'));
  check('2. ...the stand-up in endOwnPose, before its word to the worker', /poseTo\(S, null, 'stand'\);[^\n]*\n\s*act\('pose', \{ id: null \}\)/.test(eop.slice(0, eop.indexOf('\n}'))));
  const rj = code('src/game/rejoinSlots.js');
  const rc = rj.slice(rj.indexOf('export function rejoinClear'));
  check('2. rejoinSlots.js rejoinClear asks forget', ways(rj).join() === 'forget' && /poseTo\(S, null, 'forget'\)/.test(rc.slice(0, rc.indexOf('\n}'))));
}

/* ── 3 and 4. interactions.js and rejoinSlots.js themselves ── */
{
  const sent = [];
  /* the worker hears the page through the action door (actions.js act) */
  setActionTransport({ send: (m) => { sent.push(m); return true; } });
  const poses = () => sent.filter((m) => m.type === 'pose').map((m) => (m.payload || m).id);   /* its row sends its fields at the top */
  const S = {
    myId: 'bp_me', currentZone: 'wheel', dmgNumbers: [], stats: { emotesUsed: 0 },
    player: { x: 100, y: 100, vx: 0, vy: 0 },
    _serverCaps: { emotemoves: true },
  };
  const still = { moving: false, attacking: false, shield: false, swimming: false, dead: false, jumping: false, harvesting: false, fightAt: 0 };
  check('3. a sit: the pose held, and `pose sit` to the worker', I.sendMove(S, 'sit', {}) === true && posePhase(S) === 'posing' && S._pose.id === 'sit'
    && S._pose.x === 100 && S._pose.zone === 'wheel' && poses().join() === 'sit', { pose: S._pose, sent: poses() });
  clock += 2000;
  I.updateOwnEmote(S, clock, still);
  check('3. sitting still keeps it', posePhase(S) === 'posing');
  check('3. a dance replaces it (no stand-up between, as before)', I.sendMove(S, 'robot', {}) === true && S._pose.id === 'robot' && poses().join() === 'sit,robot', poses());
  clock += 2000;
  I.updateOwnEmote(S, clock, Object.assign({}, still, { moving: true }));
  check('3. a step stands you up, with its word to the worker', posePhase(S) === 'standing' && poses().join() === 'sit,robot,', poses());
  I.endOwnPose(S);
  check('4. a stand-up of no pose still says nothing', poses().length === 3);

  clock += 2000;
  I.sendMove(S, 'sleep', {});
  S.player.x += 30;   /* a knock-back: moved with no thumb on the stick */
  clock += 100;
  I.updateOwnEmote(S, clock, still);
  check('3. a knock-back past the line stands you up', posePhase(S) === 'standing' && poses().slice(-2).join() === 'sleep,', poses());

  clock += 2000;
  I.sendMove(S, 'flop', {});
  clock += 2000;
  check('3. a moment\'s move (a wave) stands you up first', I.sendMove(S, 'wave', {}) === true && posePhase(S) === 'standing' && poses().slice(-2).join() === 'flop,', poses());

  clock += 3000;
  I.sendMove(S, 'sit', {});
  runResets('zone', S);
  check('3. a change of place (the zone\'s reset, endOwnPose) stands you up', posePhase(S) === 'standing' && poses().slice(-2).join() === 'sit,', poses());

  clock += 2000;
  I.sendMove(S, 'sit', {});
  const before = sent.length;
  const cleared = RS.rejoinClear(S, 0, () => {}, () => {});
  check('3. the rejoin (rejoinClear) forgets it, and says nothing to the worker', cleared.includes('pose') && posePhase(S) === 'standing' && sent.length === before, { cleared, sent: sent.length - before });

  clock += 2000;
  S.player.dead = true;
  const n = sent.length;
  check('4. the dead ask no pose (sendMove refuses first, as before)', I.sendMove(S, 'sit', {}) === false && posePhase(S) === 'standing' && sent.length === n);
  S.player.dead = false;
  setActionTransport(null);
}

console.log(`\npose-page-door: ${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
