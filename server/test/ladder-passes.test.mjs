/* ═══ v2.3.5229: THE PASSES ARE KNOBS OF THE LANES (card O PR 9) ═══
 * (src/game/drawLanes.js AXES; lightfx/glint.js, lightfx/lightFx.js,
 *  wheelWater.js; docs/LANES.md; grand plan 2.1 and 2.3)
 *
 * The chip axis of the ladder: the rate, then the metal's shine, then the
 * shadows, then still water.  A phone whose frames wait on the graphics chip,
 * and still late at 30, gives up the shine, then the shadows, then the sea's
 * motion, before the pixels (the pixels' own axis, at a veil).  Each pass is
 * read through laneKnob in its own file, told when it moves (onKnob).  Held:
 *
 *   1. THE LADDER: the chip axis is the rate, the shine, the shadows, still
 *      water, one step each, in that order; the three are moved and live;
 *      `?ladderpass=0` takes the three (only) off the governor's live set.
 *   2. EACH FILE FOLLOWS ITS KNOB at every chip rung, down and back up: the
 *      shine off from rung 2, the shadows from 3, the sea still at 4; told
 *      once a move (a frame reads a boolean, never laneKnob).
 *   3. THE DEVICE'S OWN SWITCH STILL WINS: the shine is drawn when the
 *      device's switch (`?sheen`, the Speed test's step) AND the knob say on;
 *      the shadows the same (`?lightfx`); the water the same (its live
 *      switch).  The Speed test reads and puts back the device's switch, not
 *      the knob's (its snapshot is unchanged).
 *   4. ONE CHANGE A RUNG, NEVER ONE A FRAME (TRAPS §218): over many frames at
 *      a rung, the shadows are cleared once (LightFx.update), the shine's
 *      light is withheld from the glint (null) every frame with nothing
 *      re-released, and the sea's layer is hidden and the ground under open
 *      sea shown once (WheelWater.tick, cover()).
 *   5. NOTHING LOADS ON THE WAY BACK (the preloading law): the sea's quads
 *      are laid whatever the knob (WheelWater.set reads none), the shine's
 *      and shadows' programs are warmed by the device's switch alone
 *      (pixiRenderer.js), never the knob's.
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14:
 *   - glint.js sheenLive: `return sheenOn();`                        -> FAIL 3, 4
 *   - lightFx.js update: `if (!lightFxOn() || !S)` as it was         -> FAIL 4
 *   - wheelWater.js tick: `const off = _liveOff;` as it was          -> FAIL 4
 *   - the shine and the shadows swapped on the chip axis             -> FAIL 1 (and 2, 3, 4)
 *   - drawLanes.js liveKnobs without the passes' switch              -> FAIL 1
 *   - lightFx.js update: `this.clear();` every frame the knob is off  -> FAIL 4
 */
import { register } from 'node:module';
import { readFileSync, readdirSync, statSync } from 'node:fs';

/* Server CI installs only server/'s packages: 'pixi.js' is not there.  Every
   name the source imports from it is a do-nothing stand-in (as
   glint-peer-slots.test does), `@/` is src/, and a .json is a module of its
   data -- served before the three files are loaded.  Nothing is drawn here:
   what is read is what each file decides. */
const SRC = new URL('../../src/', import.meta.url);
const names = new Set();
(function walk(d) {
  for (const f of readdirSync(d)) {
    const u = new URL(f, d);
    if (statSync(u).isDirectory()) walk(new URL(f + '/', d));
    else if (/\.(js|jsx|mjs)$/.test(f)) {
      for (const m of readFileSync(u, 'utf8').matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]pixi\.js['"]/g)) {
        for (const x of m[1].split(',')) { const k = x.trim().split(/\s+as\s+/)[0].trim(); if (/^[A-Za-z_$][\w$]*$/.test(k)) names.add(k); }
      }
    }
  }
})(SRC);
const PIXI_STUB = 'const P = new Proxy(function () {}, { get: (t, k) => (k === "prototype" ? t.prototype : k === Symbol.toPrimitive ? () => 0 : (typeof k === "symbol" ? undefined : P)), apply: () => P, construct: () => ({}) });\nexport default P;\n'
  + [...names].map((n) => `export const ${n} = P;`).join('\n');
register('data:text/javascript,' + encodeURIComponent(
  `export async function resolve(s, c, next) {
     if (s === 'pixi.js') return { url: 'data:text/javascript,' + encodeURIComponent(${JSON.stringify(PIXI_STUB)}), shortCircuit: true };
     if (s.startsWith('@/')) return next(${JSON.stringify(SRC.href)} + s.slice(2), c);
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
const D = await import('../../src/game/drawLanes.js');
const G = await import('../../src/rendering/lightfx/glint.js');
const LF = await import('../../src/rendering/lightfx/lightFx.js');
const W = await import('../../src/rendering/wheelWater.js');

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}
const code = (p) => readFileSync(new URL(p, SRC), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');

/* ── 1. the ladder ── */
{
  const chip = D.AXES.chip.map((r) => r.knob + ':' + r.to).join(',');
  check(`1. the chip axis is the rate, the shine, the shadows, still water, one step each (${chip})`, chip === 'rate:1,shine:1,shadows:1,water:1');
  check('1. the three passes are read through laneKnob (moved) and live', D.PASS_KNOBS.join() === 'shine,shadows,water'
    && D.PASS_KNOBS.every((k) => D.KNOBS[k].reader.moved && D.liveKnobs().includes(k)), D.liveKnobs());
  const hadLoc = Object.prototype.hasOwnProperty.call(globalThis, 'location');
  const was = globalThis.location;
  globalThis.location = { search: '?ladderpass=0' };
  D._resetLanes();
  const held = D.liveKnobs().slice();
  if (hadLoc) globalThis.location = was; else delete globalThis.location;
  D._resetLanes();
  check(`1. \`?ladderpass=0\` takes the three off the live set, and only them (${held.join('+')})`,
    !D.PASS_KNOBS.some((k) => held.includes(k)) && held.includes('rate') && held.includes('pixels') && D.ladderPassOn('?ladderpass=0') === false && D.ladderPassOn('?x=1') === true);
}

/* ── 2. each file follows its knob ── */
{
  D._resetLanes();
  const at = () => ({ shine: G.shineKnobOn(), shadows: LF.shadowsKnobOn(), still: W.waterKnobStill() });
  const row = at();   /* the first read subscribes each */
  const seen = [];
  for (const c of [0, 1, 2, 3, 4, 3, 2, 1, 0]) { D.setRung(0, c, 0); seen.push([c, at()]); }
  const want = (c) => ({ shine: c < 2, shadows: c < 3, still: c >= 4 });
  const off = seen.filter(([c, v]) => JSON.stringify(v) !== JSON.stringify(want(c)));
  check('2. at the row: the shine, the shadows, the moving sea', JSON.stringify(row) === JSON.stringify(want(0)), row);
  check('2. at each chip rung, down and back up: the shine off from 2, the shadows from 3, the sea still at 4', off.length === 0, off);
  check('2. a frame reads a boolean: each knob is read through laneKnob in one function, its subscriber\'s',
    (code('rendering/lightfx/glint.js').match(/\blaneKnob\('shine'\)/g) || []).length === 1
    && (code('rendering/lightfx/lightFx.js').match(/\blaneKnob\('shadows'\)/g) || []).length === 1
    && (code('rendering/wheelWater.js').match(/\blaneKnob\('water'\)/g) || []).length === 1
    && /onKnob\('shine'/.test(code('rendering/lightfx/glint.js')) && /onKnob\('shadows'/.test(code('rendering/lightfx/lightFx.js')) && /onKnob\('water'/.test(code('rendering/wheelWater.js')));
  D.setRung(0, 0, 0);
}

/* ── 3. the device's own switch still wins ── */
{
  D.setRung(0, 0, 0);
  G.setSheen(false, false);
  const a = G.sheenLive();
  G.setSheen(true, false);
  const b = G.sheenLive();
  D.setRung(0, 2, 0);
  const c = G.sheenLive();
  D.setRung(0, 0, 0);
  check('3. the shine: drawn when the device\'s switch AND the knob say on (off/row: no; on/row: yes; on/shine rung: no)', !a && b && !c, { a, b, c });
  LF.setLightFx(false, false);
  const d = LF.lightFxLive();
  LF.setLightFx(true, false);
  const e = LF.lightFxLive();
  D.setRung(0, 3, 0);
  const f = LF.lightFxLive();
  D.setRung(0, 0, 0);
  check('3. the shadows: the same (`?lightfx`, and the shadows\' rung)', !d && e && !f && LF.lightFxOn() === true, { d, e, f });
  const st = readFileSync(new URL('game/speedTest.js', SRC), 'utf8');
  check('3. the Speed test reads and puts back the device\'s switches, never the knobs (its snapshot as it was)',
    /return \{ light: lightFxOn\(\), shine: sheenOn\(\), water, one: oneBatchOn\(\), pre: shadowPrepassOn\(\) \};/.test(st) && !/sheenLive|lightFxLive|KnobOn|KnobStill/.test(st));
}

/* ── 4. one change a rung, never one a frame ── */
{
  D.setRung(0, 0, 0);
  LF.setLightFx(true, false); G.setSheen(true, false);
  const lf = new LF.LightFx(null, null, null);
  let clears = 0;
  const realClear = lf.clear.bind(lf);
  lf.clear = () => { clears++; realClear(); };
  const sheens = [];
  lf.glint.update = (S, now, er, fx, zone, sheen) => { sheens.push(sheen ? 'lit' : null); };
  const S = { currentZone: 'town', others: {}, player: null, rpg: null };
  let now = 1000;
  const frames = (n) => { for (let i = 0; i < n; i++) lf.update(S, now += 16, null, null); };
  frames(5);
  const atRow = { clears, sheens: sheens.splice(0).join() };
  D.setRung(0, 2, 0);   /* the shine's rung */
  frames(30);
  const atShine = { clears, sheens: [...new Set(sheens.splice(0))] };
  D.setRung(0, 3, 0);   /* the shadows' rung */
  frames(30);
  const atShadows = { clears, frames: sheens.splice(0).length };
  D.setRung(0, 0, 0);
  frames(5);
  const back = { clears, sheens: [...new Set(sheens.splice(0))] };
  check('4. the shadows\' rung clears the shadows ONCE over 30 frames, and none at the row or the shine\'s rung',
    atRow.clears === 0 && atShine.clears === 0 && atShadows.clears === 1 && back.clears === 1, { atRow, atShine, atShadows, back });
  check('4. the shine\'s rung withholds the shine\'s light every frame (the glint lets its pieces go once, as the switch\'s step did); back at the row it is lit again',
    atRow.sheens.split(',').every((x) => x === 'lit') && atShine.sheens.join() === '' && back.sheens.join() === 'lit', { atRow, atShine, back });
  /* the sea: the layer's visible and the ground under open sea, written only as a change */
  const writes = [];
  const root = { _v: true, label: '' };
  Object.defineProperty(root, 'visible', { get() { return this._v; }, set(v) { if (v !== this._v) writes.push(v); this._v = v; } });
  const ww = Object.create(W.WheelWater.prototype);
  Object.assign(ww, { root, meshes: new Map(), dead: false, _covering: true });
  let covers = 0;
  const realCover = ww.cover.bind(ww);
  ww.cover = (on) => { if (on !== ww._covering) covers++; realCover(on); };
  const tick = (n) => { for (let i = 0; i < n; i++) ww.tick(now += 16); };
  tick(5);
  D.setRung(0, 4, 0);
  tick(30);
  const still = { writes: writes.slice(), covers, covering: ww._covering };
  D.setRung(0, 3, 0);
  tick(30);
  check('4. still water: the sea\'s layer hidden and the ground under open sea shown ONCE over 30 frames, and once back',
    still.writes.join() === 'false' && still.covers === 1 && still.covering === false && writes.join() === 'false,true' && covers === 2 && ww._covering === true,
    { still, writes, covers });
  D.setRung(0, 0, 0);
}

/* ── 5. nothing loads on the way back ── */
{
  const ww = code('rendering/wheelWater.js');
  const at = ww.indexOf('  set(key, i, j, wf, info, pic, ground) {');
  const body = ww.slice(at, ww.indexOf('\n  }\n', at));
  check('5. the sea\'s quads are laid whatever the knob (WheelWater.set reads no knob): nothing to load when it moves again',
    at > 0 && !/stillNow|waterKnobStill|laneKnob/.test(body), body.slice(0, 200));
  const px = code('rendering/pixiRenderer.js');
  check('5. the shine\'s programs are warmed behind the loading screen by the device\'s switch alone, never the knob',
    /if \(lightFxOn\(\)\) prewarmGlintPipe/.test(px) && /if \(lightFxOn\(\)\) warmSheenBatch/.test(px) && !/lightFxLive|sheenLive/.test(px));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
