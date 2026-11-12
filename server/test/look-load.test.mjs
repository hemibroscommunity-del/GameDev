/* ═══ v2.3.4368: A CHARACTER'S LOOK LOADS, AND STAYS LOADED ═══
 *
 * The state-machine sweep (2026-11-03, V18) found four places where your own
 * look's pictures were thrown out, given up on, or left to the first draw:
 *   1. R7-2: the head-overlay cap's "never evict your own heads" guard still
 *      spelt the key with trousers and boots after v2.3.3658 took them out of
 *      the key, so it guarded only a player in default trousers AND boots.
 *      Now both are built by one builder (_headComboPrefix).
 *   2. R7-1: a body sheet whose download failed once let the loading screen
 *      pass: its 2 s / 6 s retries did not chain into the promise it returned.
 *   3. R8-11: the hat, eyewear and eye-style recolours ran every facing in one
 *      go with no try, so one facing that threw left the whole key 'loading'
 *      for the visit (hair and beard already tried each facing).
 *   4. R8-11: the loading screen waited for your hat, hair and beard colours,
 *      but not your eyewear or eye-style colours (the PRELOADING law).
 * The real code is cut out of src/ and run here with stubs, so a fix that is
 * undone in the source is a FAIL line here.
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

/* the text of `function name(...) {...}` (export stripped), or '' */
function cut(text, name) {
  const m = new RegExp('(?:export\\s+)?function\\s+' + name + '\\s*\\(').exec(text);
  if (!m) return '';
  let i = text.indexOf('{', text.indexOf(')', m.index));
  /* the parameter list may hold default values with no braces: find the body's
     opening brace after the closing paren of the parameter list */
  let depth = 0;
  for (let j = i; j < text.length; j++) {
    const c = text[j];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return text.slice(m.index, j + 1).replace(/^export\s+/, ''); }
  }
  return '';
}

/* a fake clock: setTimeout is recorded and run by hand */
function fakeTimers() {
  const q = [];
  return {
    setTimeout: (fn, ms) => { q.push({ fn, ms }); return q.length; },
    pending: () => q.length,
    runAll: async () => { while (q.length) { const t = q.shift(); t.fn(); await flush(); } },
  };
}
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

/* ── 1. the head cap guards YOUR heads, whatever trousers and boots ── */
{
  const PS = src('src/rendering/playerSkins.js');
  const code = [cut(PS, '_headComboPrefix'), cut(PS, '_headSheetKey'), cut(PS, '_pickupHeadCap')].join('\n');
  check('1a the cap and the key builder are found in playerSkins.js', /function _headSheetKey/.test(code) && /function _pickupHeadCap/.test(code));
  const run = (own, specksOff) => {
    const cache = {};
    const released = [];
    const ctx = vm.createContext({
      GARMENT_SPECKS_OFF: specksOff,
      _pickupHeadSheets: cache,
      _skinStore: { get: () => own.skin }, _pantsStore: { get: () => own.pants }, _shoesStore: { get: () => own.shoes },
      _headArtSeg: () => '',
      releaseCanvasSource: (s) => released.push(s),
      setTimeout: (fn) => fn(),
    });
    vm.runInContext(code, ctx);
    const tex = (n) => [{ source: { n } }];
    /* your own sheets are the oldest (baked behind the loading screen) */
    const ownKeys = [];
    for (const [pose, dir] of [['jog', 'north'], ['jog', 'east'], ['hit', 'south'], ['pickup', 'south'], ['mine', 'south']]) {
      const k = ctx._headSheetKey(own.skin, own.pants, own.shoes, pose, dir, null, null);
      cache[k] = tex(k); ownKeys.push(k);
    }
    const styled = ctx._headSheetKey(own.skin, own.pants, own.shoes, 'jog', 'south', { id: 'demon' }, null);
    cache[styled] = tex(styled); ownKeys.push(styled);
    /* a busy BroTown: armoured peers of other skin tones */
    let n = 0;
    const peers = ['pale', 'olive', 'brown', 'dark', 'tan2', 'ochre', 'umber', 'sand'];
    for (; n < 40; ) {   /* 40 peer sheets: well past the cap of 32 */
      const k = ctx._headSheetKey(peers[n % peers.length], 'cargo', 'sneakers', 'jog', 'p' + n, null, null);
      cache[k] = tex(k); n++;
      ctx._pickupHeadCap();
    }
    return { cache, ownKeys, released };
  };
  const look = { skin: 'tan', pants: 'jeans', shoes: 'boots' };   /* not the default trousers or boots */
  const r = run(look, false);
  const lost = r.ownKeys.filter((k) => !r.cache[k]);
  check('1b non-default trousers and boots: none of your own head sheets is evicted in a busy scene (the bug: R7-2)', lost.length === 0, lost);
  check('1c ...the cap still bounds the cache (peers evicted, sources released)', Object.keys(r.cache).length <= 33 && r.released.length > 0,
    { size: Object.keys(r.cache).length, released: r.released.length });
  const d = run({ skin: 'tan', pants: null, shoes: null }, false);
  check('1d default trousers and boots: still guarded, as before', d.ownKeys.every((k) => d.cache[k]));
  const off = run(look, true);
  check('1e ?garmentspecks=0 (trousers and boots back in the key): still guarded', off.ownKeys.every((k) => off.cache[k]),
    off.ownKeys.filter((k) => !off.cache[k]));
  check('1f the guard builds its prefix with the key\'s own builder (one builder, not two spellings)',
    /_localPrefix\s*=\s*_headComboPrefix\(/.test(cut(PS, '_pickupHeadCap')) && /_headComboPrefix\(/.test(cut(PS, '_headSheetKey')));
}

/* ── 2. a failed body download: the promise waits through the retries ── */
{
  const PS = src('src/rendering/playerSkins.js');
  /* v2.3.4930: buildBodySheet hands the page's bake (and every retry) to
     _buildBodySheetPage when the worker is not wanted (bodyBake.js); the
     download and its retries are that function's */
  const code = cut(PS, 'buildBodySheet') + '\n' + cut(PS, '_buildBodySheetPage');
  check('2a buildBodySheet is found', code.length > 0 && /_buildBodySheetPage\(/.test(cut(PS, 'buildBodySheet')));
  const timers = fakeTimers();
  const sheets = {};
  const gaveUp = [];
  const loads = [];
  const ctx = vm.createContext({
    _bodySheets: sheets,
    bodyWorkerWanted: () => false,
    _BODY_RETRY_MS: [2000, 6000],
    _bodyLater: { gaveUp: (k) => gaveUp.push(k) },
    artForFacing: (a) => a,
    SPRITE_VERSION: 1,
    loadImg: (url) => { loads.push(url); return Promise.reject(new Error('404')); },
    setTimeout: timers.setTimeout,
    window: {}, console,
  });
  vm.runInContext(code, ctx);
  let settled = false;
  const p = ctx.buildBodySheet('k1', 'jog', 'south', null, null, null, null, null, null, null);
  check('2b it returns a promise', p && typeof p.then === 'function');
  if (p && p.then) p.then(() => { settled = true; });
  await flush();
  check('2c after the first failed download the promise has NOT settled (the bug: R7-1, the loading screen passed here)',
    !settled && sheets.k1 === 'loading' && timers.pending() === 1, { settled, sheet: sheets.k1, timers: timers.pending() });
  await timers.runAll();
  await flush();
  check('2d it settles only after the third try, then gives up to a later round',
    settled && loads.length === 3 && Array.isArray(sheets.k1) && sheets.k1.length === 0 && gaveUp[0] === 'k1',
    { settled, loads: loads.length, sheet: sheets.k1, gaveUp });
  check('2e the retries bust the cache (&r=1, &r=2)', /&r=1/.test(loads[1] || '') && /&r=2/.test(loads[2] || ''), loads);
}

/* ── 3. hat, eyewear, eye style: one facing that throws does not sink the others ── */
const TRAITS = [
  ['hat', 'src/rendering/traits/hatColorCatalog.js'],
  ['eyewear', 'src/rendering/traits/eyewearColorCatalog.js'],
  ['eye style', 'src/rendering/traits/eyeStyleColorCatalog.js'],
];
for (const [label, file] of TRAITS) {
  const S = src(file);
  const code = cut(S, 'build');
  const cache = {};
  const ctx = vm.createContext({
    _cache: cache, _building: Object.create(null), _refCache: Object.create(null),
    _pooledProfile: () => ({}),
    DIRS: ['south', 'east', 'north', 'northeast'], dirsFor: () => ['south', 'east', 'north', 'northeast'],
    TRAIT_VER: 1,
    loadImg: (url) => Promise.resolve({ url }),
    hatColorTarget: () => '#f00', eyewearColorTarget: () => '#f00', eyeStyleColorTarget: () => '#f00',
    recolorHairToCanvas: (img) => { if (/east\.png/.test(img.url) && !/northeast/.test(img.url)) throw new Error('canvas refused'); return { img }; },
    Texture: { from: (cv) => ({ source: {}, cv }) },
    keepAsImage: () => {}, Cache: {},
    _capCache: () => {},
  });
  vm.runInContext(code, ctx);
  try { ctx.build('pirate', 'red'); } catch (e) { /* the build itself must not throw */ }
  await flush();
  const e = cache['pirate/red'];
  check(`3 ${label}: one facing throws, the other three are still recoloured (the bug: R8-11, the key stayed 'loading')`,
    e && e !== 'loading' && !!e.south && !!e.north && !!e.northeast && !e.east, e === 'loading' ? 'loading' : Object.keys(e || {}));
}

/* ── 4. the loading screen waits for your eyewear and eye-style colours ── */
for (const [label, file, fn, getter] of [
  ['eyewear', 'src/rendering/traits/eyewearColorCatalog.js', 'coloredEyewearReady', 'getColoredEyewearTextures'],
  ['eye style', 'src/rendering/traits/eyeStyleColorCatalog.js', 'coloredEyeStyleReady', 'getColoredEyeStyleTextures'],
]) {
  const S = src(file);
  const code = [cut(S, 'build'), cut(S, getter), cut(S, fn)].join('\n');
  check(`4a ${label}: ${fn} is exported (the bug: R8-11, none existed)`, new RegExp('export function ' + fn + '\\(').test(S));
  if (!cut(S, fn)) continue;
  let release;
  const gate = new Promise((r) => { release = r; });
  const cache = {};
  const ctx = vm.createContext({
    _cache: cache, _building: Object.create(null), _refCache: Object.create(null),
    _pooledProfile: () => ({}),
    DIRS: ['south', 'east'], dirsFor: () => ['south', 'east'],
    TRAIT_VER: 1,
    loadImg: (url) => gate.then(() => ({ url })),
    eyewearColorTarget: () => '#f00', eyeStyleColorTarget: () => '#f00',
    headLookTextures: () => null, headLookReady: () => Promise.resolve(),
    recolorHairToCanvas: (img) => ({ img }),
    Texture: { from: (cv) => ({ source: {}, cv }) },
    keepAsImage: () => {}, Cache: {}, _capCache: () => {},
  });
  vm.runInContext(code, ctx);
  let done = false;
  ctx[fn]('round', 'red').then(() => { done = true; });
  await flush();
  check(`4b ${label}: the promise waits while the recolour bakes`, !done && cache['round/red'] === 'loading', { done, e: cache['round/red'] });
  release();
  await flush();
  check(`4c ${label}: ...and settles once it is made`, done && cache['round/red'] && !!cache['round/red'].south, { done });
  let nat = false;
  await ctx[fn]('round', 'default').then(() => { nat = true; });
  check(`4d ${label}: the native colour settles at once (nothing to make)`, nat);
}
{
  const ER = src('src/rendering/systems/entityRenderer.js');
  const pt = cut(ER, 'preloadTraits');
  check('4e preloadTraits awaits your eyewear colour', /own\.push\(coloredEyewearReady\(getEyewear\(\), getEyewearColor\(\)\)\)/.test(pt));
  check('4f preloadTraits awaits your eye-style colour (the eye colour paints it, as the draw does)',
    /own\.push\(coloredEyeStyleReady\(getEyeStyle\(\), getEyeColor\(\)\)\)/.test(pt));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
