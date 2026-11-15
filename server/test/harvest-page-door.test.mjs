/* ═══ v2.3.5219: THE HARVEST'S PAGE DOOR -- ONE WRITER OF THE PHONE'S HARVEST (card L PR 5) ═══
 * (docs/specs/harvest-door.md, "the page")
 *
 * The phone's harvest is one field, `S._extraction` (none, or the record of
 * the swing in flight -- mining, woodcutting, fishing or a cook -- whose
 * `status` goes waiting, then ready), written only by
 * src/game/harvestDoor.js harvestTo, by a way of HARVEST_PAGE_WAYS.  Its
 * rules are the callers' own checks (`?harvestdoor=0` lifts them).  The
 * page's harvest, cook and fishing rows of the phase table are this one
 * door.  This suite:
 *
 *   1. the door's own rules: each way's phase, a start or a try only from
 *      none, a try locked and a start not, the window open only from waiting
 *      and only at its time, a strike only from ready, `tried` only of a
 *      locked try, the switch;
 *   2. A SECOND WRITER FAILS: a write of `._extraction` anywhere in src/
 *      outside harvestTo, or of a harvest record's `.status`; every way has
 *      its caller where it is said to be (lifeSkillRewards.js, BroTown.jsx's
 *      tick, zoneTransitions.js clearZoneLocalFx).  The phase table's guard
 *      reads the same off the syntax tree (tools/guards/phase-table.test.mjs
 *      §2, DOOR_SUITES);
 *   3. game/lifeSkillRewards.js ITSELF, loaded here (its `@/` imports
 *      resolved to src/, pixi.js stubbed, its .json read): a mining start
 *      asking the worker for its hits, a new tap ending the old, the
 *      worker's plan landing and the window opening, the strike and its
 *      node_strike; a cook at your fire and its cook_request; a try your
 *      level cannot work, its 0s and its end; a strike at a node gone; the
 *      zone's clear (clearZoneLocalFx, cut from its file and run);
 *   4. step 1 changes nothing: a strike before the window opens is still
 *      refused and keeps the swing; a try never opens.
 *
 * Break proof, tried by hand: `S._extraction = null;` put back in
 * succeedExtraction -> FAIL 2 (and the guard's §2).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { register } from 'node:module';
import { findIn } from '../../tools/guards/lib/filesOf.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

/* the page's `@/` alias, pixi.js as a stub, and .json as a module, for
   lifeSkillRewards.js and what it imports (ladder-passes.test's hook) */
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

const { harvestTo, harvestPhase, HARVEST_PAGE_WAYS } = await import(new URL('game/harvestDoor.js', SRC).href);
const L = await import(new URL('game/lifeSkillRewards.js', SRC).href);
const { setActionTransport } = await import(new URL('game/actions.js', SRC).href);

let clock = 1_900_000_000_000;
Date.now = () => clock;
const setSearch = (s) => { globalThis.location = { search: s }; };

/* ── 1. the door's own rules ── */
{
  check('1. the ways and their phases',
    JSON.stringify(HARVEST_PAGE_WAYS) === JSON.stringify({ start: 'waiting', try: 'waiting', open: 'ready', strike: 'none', lost: 'none', walk: 'none', tried: 'none', again: 'none', zone: 'none' }));
  setSearch('');
  const S = { _extraction: null };
  const rec = (o) => Object.assign({ status: 'waiting', skill: 'mining', nodeId: 'n1', windowOpensAt: clock + 1000 }, o || {});
  check('1. a start writes its record', harvestTo(S, rec(), 'start') === true && harvestPhase(S) === 'waiting');
  const first = S._extraction;
  check('1. ...and a second start over it is refused (startExtraction ends the old one first)', harvestTo(S, rec({ nodeId: 'n2' }), 'start') === false && S._extraction === first);
  check('1. a record of another way\'s phase is refused', harvestTo(S, rec({ status: 'ready' }), 'start') === false && harvestTo(S, rec(), 'strike') === false && S._extraction === first);
  check('1. the window does not open before its time', harvestTo(S, null, 'open') === false && harvestPhase(S) === 'waiting');
  check('1. a strike only from ready', harvestTo(S, null, 'strike') === false && S._extraction === first);
  check('1. `tried` only of a locked try', harvestTo(S, null, 'tried') === false && S._extraction === first);
  clock += 1000;
  check('1. at its time the window opens, in place (the same record)', harvestTo(S, null, 'open') === true && S._extraction === first && harvestPhase(S) === 'ready' && first.status === 'ready');
  check('1. ...and opens once', harvestTo(S, null, 'open') === false);
  check('1. the strike: none', harvestTo(S, null, 'strike') === true && S._extraction === null && harvestPhase(S) === 'none');
  check('1. a try is locked, a start is not', harvestTo(S, rec(), 'try') === false && harvestTo(S, rec({ locked: { need: 5 } }), 'start') === false && S._extraction === null);
  check('1. a try writes its locked record', harvestTo(S, rec({ locked: { need: 5 }, windowOpensAt: Infinity }), 'try') === true && harvestPhase(S) === 'waiting');
  clock += 1e9;
  check('1. a try never opens (its window at Infinity)', harvestTo(S, null, 'open') === false && harvestPhase(S) === 'waiting');
  check('1. ...and ends by `tried`', harvestTo(S, null, 'tried') === true && S._extraction === null);
  check('1. a way to none takes no record', harvestTo(S, rec(), 'walk') === false);
  for (const w of ['lost', 'walk', 'again', 'zone']) {
    harvestTo(S, rec(), 'start');
    check(`1. \`${w}\` ends any harvest`, harvestTo(S, null, w) === true && S._extraction === null);
  }
  check('1. ...and the ways to none write none from none too, as the old lines did', harvestTo(S, null, 'zone') === true && S._extraction === null);
  check('1. an unknown way, one off the prototype, or no state is refused',
    harvestTo(S, null, 'nope') === false && harvestTo(S, null, 'toString') === false && harvestTo(null, rec(), 'start') === false);
  setSearch('?harvestdoor=0');
  harvestTo(S, rec(), 'start');
  const before = S._extraction;
  check('1. ?harvestdoor=0: a start over one in flight, the window early, a strike before it, as the old lines could have',
    harvestTo(S, rec({ nodeId: 'n3' }), 'start') === true && S._extraction !== before && harvestTo(S, null, 'open') === true && harvestPhase(S) === 'ready'
    && (harvestTo(S, rec(), 'start'), harvestTo(S, null, 'strike')) === true && S._extraction === null);
  check('1. ...but a record still of its own way\'s status', harvestTo(S, rec({ status: 'ready' }), 'start') === false);
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
  const WRITE = /(?:\._extraction|\[\s*['"`]_extraction['"`]\s*\])\s*(?:\?\?|\|\||&&|\*\*|[-+*/%])?=(?!=)|delete\s+[\w$.]+\._extraction\b|Object\.assign\(\s*[\w$.]+\s*,[^)]*\{[^}]*\b_extraction\s*:/;
  /* a harvest record's status: the field's own, or a local the code names a harvest by */
  const STATUS = /(?:\._extraction|\b_?ex)\s*\.\s*status\s*=(?!=)/;
  const outside = [];
  let doorWrites = 0, doorStatus = 0;
  for (const f of files) {
    const raw = readFileSync(new URL(f, ROOT), 'utf8');
    if (!raw.includes('_extraction') && !raw.includes('status')) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'src/game/harvestDoor.js') {
        if (/^export function harvestTo\(S, rec, way\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\}\s*$/.test(l)) inDoor = false;
      }
      if (inDoor && /\bcur\.status = 'ready'/.test(l)) { doorStatus++; continue; }
      const w = WRITE.test(l), st = STATUS.test(l);
      if (!w && !st) continue;
      if (inDoor && w) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. harvestTo writes the harvest (none, and a record) and opens its window', doorWrites === 2 && doorStatus === 1, { doorWrites, doorStatus });
  check('2. no write of ._extraction, nor of a harvest record\'s .status, in src/ outside harvestTo', outside.length === 0, outside);
  const code = (p) => strip(readFileSync(new URL(p, ROOT), 'utf8'));
  const callers = (src) => [...src.matchAll(/harvestTo\(S,\s*(?:null|_rec|_try),\s*'([a-z]+)'\)/g)].map((m) => m[1]).sort();
  const lsr = callers(code('src/game/lifeSkillRewards.js'));
  check('2. lifeSkillRewards.js asks again, start, try, tried, lost and strike', lsr.join() === 'again,lost,start,strike,tried,try', lsr);
  /* the screens' calls (BroTown.jsx's tick today), read by system (tests-by-system) */
  const ui = findIn('ui', /harvestTo\(/).filter((x) => !/^\s*(\/\/|\*|\/\*)/.test(x.text));
  const bt = callers(ui.map((x) => x.text).join('\n'));
  check('2. the screens (BroTown.jsx\'s tick) ask lost, walk (the stick, the reach) and open, in one file', bt.join() === 'lost,open,walk,walk' && new Set(ui.map((x) => x.file)).size === 1, ui.map((x) => x.file + ':' + x.line));
  const zt = code('src/game/zoneTransitions.js');
  const czl = zt.slice(zt.indexOf('export function clearZoneLocalFx'));
  check('2. zoneTransitions.js clearZoneLocalFx asks zone', callers(zt).join() === 'zone' && /harvestTo\(S, null, 'zone'\)/.test(czl.slice(0, czl.indexOf('\n}'))));
}

/* ── 3 and 4. game/lifeSkillRewards.js itself ── */
{
  const sent = [];
  const deps = { setRpgState: () => {} };
  /* a send leaves by the bro's channel or, as card K moves them, the action
     door's transport (actions.js act): both are this list */
  setActionTransport({ send: (m) => { sent.push(m); return true; } });
  const S = {
    _extraction: null, currentZone: 'wheel', dmgNumbers: [],
    player: { x: 500, y: 500, vx: 0, vy: 0 },
    rpg: { hp: 100, inventory: {}, lifeSkills: { mining: { level: 1, xp: 0 }, cooking: { level: 1, xp: 0 }, fishing: { level: 1, xp: 0 }, woodcutting: { level: 1, xp: 0 } } },
    _serverCaps: { gatherhits: 1, gatherreq: 1 }, _serverGatherNodes: true,
    channel: { send: (m) => sent.push(m), isLive: () => true },
    gatherNodes: [],
  };
  const vein = { id: 'vein1', x: 600, y: 600, alive: true, nodeType: 'oreVein', gatherLvl: 1, name: 'Copper Ore' };
  const vein2 = { id: 'vein2', x: 640, y: 600, alive: true, nodeType: 'oreVein', gatherLvl: 1, name: 'Copper Ore' };
  S.gatherNodes.push(vein, vein2);

  L.startExtraction(S, vein, 'mining');
  const ex = S._extraction;
  const start = sent.find((m) => m.type === 'extraction_start');
  check('3. a mining start: its record, waiting for the worker\'s hits, and the ask for them',
    ex && ex.nodeId === 'vein1' && ex.skill === 'mining' && harvestPhase(S) === 'waiting' && ex.hits && ex.windowOpensAt === Infinity
    && start && start.payload.nodeId === 'vein1' && start.payload.hitSeq === ex.hits.seq, { ex: !!ex, start });
  L.startExtraction(S, vein2, 'mining');
  check('3. a new tap ends the old and starts its own', S._extraction && S._extraction !== ex && S._extraction.nodeId === 'vein2' && harvestPhase(S) === 'waiting');
  const ex2 = S._extraction;
  /* the worker's plan lands, its hits fall due, and the window opens a beat later */
  check('3. the worker\'s plan lands on its own attempt', L.applyGatherHits(S, { seq: ex2.hits.seq, hits: [1, 1], hp: 2, nodeId: 'vein2' }) === true && ex2.windowOpensAt < Infinity);
  check('4. a strike while the hits fall is refused, and the swing kept', L.succeedExtraction(S, 'good', deps) === false && S._extraction === ex2);
  for (let i = 0; i < 40 && ex2.hits && ex2.hits.shown < (ex2.hits.plan || []).length; i++) { clock += 250; L.tickGatherHits(S, ex2, vein2, clock); }
  clock += 2000;
  check('3. the hits have landed; the window\'s time has come', ex2.hits && ex2.hits.shown === 2 && clock >= ex2.windowOpensAt, { hits: ex2.hits && ex2.hits.shown, opens: ex2.windowOpensAt, clock });
  /* BroTown.jsx's tick (not loadable in node: its own line is §2's) asks the door the same */
  check('3. the window opens through the door (the tick\'s ask)', ex2.status === 'waiting' && clock >= ex2.windowOpensAt && harvestTo(S, null, 'open') === true && harvestPhase(S) === 'ready');
  sent.length = 0;
  let ok = false, err = null;
  try { ok = L.succeedExtraction(S, 'perfect', deps); } catch (e) { err = String(e && e.stack || e).slice(0, 300); }
  const strike = sent.find((m) => m.type === 'node_strike');
  check('3. the strike: its node_strike to the worker, and the harvest ends', ok === true && S._extraction === null && strike && strike.payload.id === 'vein2' && strike.payload.accuracy === 'perfect', { ok, err, sent: sent.map((m) => m.type) });

  /* a strike at a node gone (the worker depleted it) */
  L.startExtraction(S, vein, 'mining');
  S._extraction.windowOpensAt = clock;   /* the test's own: its time come, as a plan would */
  harvestTo(S, null, 'open');
  vein.alive = false; S.gatherNodes = [vein2];
  check('3. a strike at a node gone: none, and no reward', L.succeedExtraction(S, 'good', deps) === false && S._extraction === null);
  vein.alive = true; S.gatherNodes = [vein, vein2];

  /* a cook at your fire: its fish, its hits asked, its cook_request */
  sent.length = 0;
  const fire = { id: 'fire1', x: 520, y: 520, alive: true, nodeType: 'campfire' };
  S._campfire = fire;
  L.startExtraction(S, fire, 'cooking', { fishKey: 'fish_minnow' });
  const cookEx = S._extraction;
  const cookStart = sent.find((m) => m.type === 'extraction_start');
  check('3. a cook: its record carries its fish, and asks for its hits by the fish', cookEx && cookEx.skill === 'cooking' && cookEx.fishKey === 'fish_minnow'
    && cookStart && cookStart.payload.skill === 'cooking' && cookStart.payload.fishKey === 'fish_minnow', { cookStart });
  harvestTo(S, null, 'open') || (cookEx.windowOpensAt = clock, harvestTo(S, null, 'open'));
  sent.length = 0;
  ok = false; err = null;
  try { ok = L.succeedExtraction(S, 'good', deps); } catch (e) { err = String(e && e.stack || e).slice(0, 300); }
  const cook = sent.find((m) => m.type === 'cook_request');
  check('3. the cook\'s strike: its cook_request, and the harvest ends', ok === true && S._extraction === null && cook && cook.payload.fishKey === 'fish_minnow', { ok, err, sent: sent.map((m) => m.type) });

  /* a try your level cannot work: its 0s, then it ends by itself, sending nothing */
  sent.length = 0;
  const deep = { id: 'vein9', x: 600, y: 600, alive: true, nodeType: 'oreVein', gatherLvl: 21, reqLvl: 30, name: 'Obsidian' };
  S.gatherNodes.push(deep);
  L.startExtraction(S, deep, 'mining');
  const tryEx = S._extraction;
  check('3. a try: a locked record, waiting, and nothing sent', tryEx && tryEx.locked && tryEx.locked.need === 30 && harvestPhase(S) === 'waiting' && sent.length === 0, { locked: tryEx && tryEx.locked, sent });
  clock += 1e7;
  check('4. a try never opens', harvestTo(S, null, 'open') === false && harvestPhase(S) === 'waiting');
  L.tickGatherHits(S, tryEx, deep, clock);
  check('3. ...its 0s land, and it ends by itself (`tried`)', tryEx.hits.shown === tryEx.hits.plan.length && S._extraction === null, { shown: tryEx.hits.shown });
  check('3. ...and never asked the worker anything', sent.length === 0, sent);

  /* the zone's clear (zoneTransitions.js does not load in node: its
     function is cut from the file and run, as zone-leftovers.test does, with
     the real door handed in) */
  const zt = readFileSync(new URL('../../src/game/zoneTransitions.js', import.meta.url), 'utf8');
  const head = 'export function clearZoneLocalFx(S) {';
  const at = zt.indexOf(head);
  let body = null;
  for (let i = zt.indexOf('{', at + head.length - 1), depth = 0; at >= 0 && i < zt.length; i++) {
    if (zt[i] === '{') depth++;
    else if (zt[i] === '}' && --depth === 0) { body = zt.slice(zt.indexOf('{', at + head.length - 1) + 1, i); break; }
  }
  const clearZoneLocalFx = body && new Function('harvestTo', 'return function (S) {' + body + '};')(harvestTo);
  L.startExtraction(S, vein, 'mining');
  const inFlight = harvestPhase(S);
  clearZoneLocalFx && clearZoneLocalFx(S);
  check('3. a change of place: clearZoneLocalFx ends the harvest in flight, through the door', !!clearZoneLocalFx && inFlight === 'waiting' && S._extraction === null);
}

console.log(`\nharvest-page-door: ${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
