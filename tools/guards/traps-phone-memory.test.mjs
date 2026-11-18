/* ═══ v2.3.5763: TRAPS INTO GUARDS, THE PHONE'S MEMORY (card V2 PR 4) ═══
 *
 * Grand plan step 8.2, card V2's fourth batch (the form: tools/guards/README.md,
 * "A trap held").  The census of what holds each trap:
 * docs/plan/census/traps.md.
 *
 * TRAPS §49 (the rule): every module of the page named `*Sprites.js` with an unload (`export function unload*`, `free*`, `release*`) empties, in it, each module-level container its loader fills (`[]`, `{}`, a Map or Set, a `let` that starts null); today's misses and the modules with no unload listed (a census). Break: src/rendering/snowmanSprites.js: `PHASE_SHEETS` left out of unloadSnowmanSprites -> FAIL (tried 2026-11-17).
 * TRAPS §139 (the rule): no `.source.destroy()` in the page outside `releaseCanvasSource` (releaseCanvasTexture.js, which takes the canvas out of Pixi's Cache too); today's two listed. Break: src/rendering/fishTopEvict.js: `tex.source.destroy();` in releaseFishTop -> FAIL (tried 2026-11-17).
 * TRAPS §253 (the rule): a function of src/rendering/ that makes a canvas, in a file that names none of `keepOnGpuOnly`, `keepAsImage`, the colour numbers (`paletteTex`, `heldNumbers`), is listed; the list only falls. Break: src/rendering/dropIcons.js: a new `function makeBadge() { return document.createElement('canvas'); }` -> FAIL (tried 2026-11-17).
 * TRAPS §254 (the rule): no `new Text({ style: { ...BASE, ... } })` in the page (derive a style with `.clone()`); today's spreads listed by function and count. Break: entityRenderer.js: one more spread style in drawNodeHpBar -> FAIL (tried 2026-11-17).
 * TRAPS §340 (the rule): the callers of `lookPaletteOn()` and `lookSheenOn()` are a closed list, by function and count (a new one asks lookSheenState() and waits on null). Break: src/rendering/gearWalkFrame.js: a second `lookSheenOn()` in a new function -> FAIL (tried 2026-11-17).
 * TRAPS §341 (the rule): no loop of `.destroy(false)` in the page outside `destroyTextures` (bulkTexDestroy.js); today's listed by function. Break: src/rendering/lookPalette.js: `for (const t of dying) t.destroy(false);` in the sweep -> FAIL (tried 2026-11-17).
 *
 * HOW IT READS.  The page's code under src/ (comments dropped:
 * lib/codeOnly.mjs; strings blanked: lib/maskCode.mjs), one function at a
 * time (lib/fnSpans.mjs `namedFn`: the nearest named function around a
 * place; '(top)' outside any).  §49 finds the `*Sprites.js` modules by
 * system (lib/filesOf.mjs) and reads their own text, comments dropped.  A
 * list names a function (and a container), never a file and line.  Card
 * M2 holds the two renderers: §254 and §340 read them, by name; a move
 * between their files is never a new place.  GitHub's `test` job has no
 * pixi.js: nothing here imports the page.
 *
 * ALL SIX KEEP LISTS (the plan's rule 3): a place not listed fails, the
 * lists only fall, and a listed place that is gone fails until its name
 * comes off.  Each one stepped in today is under Found in
 * docs/plan/status/V2.md, for the card whose file it is.
 *
 * BREAK PROOF (rule 8), each tried by hand in a scratch copy, then undone:
 *   §49   snowmanSprites.js: `for (const k in PHASE_SHEETS) PHASE_SHEETS[k].length = 0;`
 *         gone from unloadSnowmanSprites (the strips are handed to loadStrip) -> FAIL §49
 *   §139  fishTopEvict.js: `tex.source.destroy();` in releaseFishTop      -> FAIL §139
 *   §253  dropIcons.js: a new function that makes a canvas               -> FAIL §253
 *   §254  entityRenderer.js: one more spread style in drawNodeHpBar      -> FAIL §254
 *   §340  gearWalkFrame.js: `lookSheenOn()` in a new function            -> FAIL §340
 *   §341  lookPalette.js: the sweep's destroyTextures made a loop        -> FAIL §341
 *         bulkTexDestroy.js: `destroyTextures` renamed                  -> FAIL §341 (the door's name)
 *
 * Run from the repository's root: node tools/guards/traps-phone-memory.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';
import { codeOf } from './lib/codeOnly.mjs';
import { maskCode } from './lib/maskCode.mjs';
import { filesOf, systemNames } from './lib/filesOf.mjs';
import { spansOf, namedFn, closeOf } from './lib/fnSpans.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};
/* a census by name: found (a Set, or a Map name -> count) against the known list */
function census(tag, what, found, known) {
  const count = (k) => (found instanceof Map ? found.get(k) || 0 : found.has(k) ? 1 : 0);
  const want = (k) => (typeof known[k] === 'number' ? known[k] : 1);
  const names = found instanceof Map ? [...found.keys()] : [...found];
  const fresh = names.filter((k) => !Object.hasOwn(known, k) || count(k) > want(k)).sort();
  const gone = Object.keys(known).filter((k) => count(k) < want(k));
  check(`${tag}: ${what}: ${names.length} today, none new`, fresh.length === 0, fresh.map((k) => k + (found instanceof Map ? ' x' + count(k) : '')));
  check(`${tag}: every listed place is still there (a fixed one comes off, or its count falls)`, gone.length === 0, gone);
}

const code = codeOf(['src']);
const masked = new Map();
const spans = new Map();
const M = (f) => { if (!masked.has(f)) { const m = maskCode(code.get(f)); masked.set(f, m); spans.set(f, spansOf(m)); } return masked.get(f); };
const PAGE = [...code.keys()];

/* ── §49: an unload empties what its loader filled ── */

/* `the unload (or, with none, the module's first export): container` */
const UNLOAD_KNOWN = {
  'unloadVariantSprites: _variantLoadKicked': 'monsterVariantSprites.js: a flag, not a container: the variant look is asked once a page',
  'freeTownScenery: _done': 'npcSprites.js: the scenery\'s once-a-page flags',
  'unloadSlimeSprites: singlesPromise': 'slimeSprites.js: the singles\' load, kept across visits',
  'unloadSlimeSprites: _stillSet': 'slimeSprites.js: the still frames, kept across visits',
  /* no unload: kept for the page's life (the player's own, a pet's, a cape's, a shield's, a weapon's) */
  'capeSprites (no unload): _sets': 'capes: the page\'s life', 'petSprites (no unload): _tex': 'pets', 'petSprites (no unload): _loading': 'pets',
  'petSprites (no unload): _frames': 'pets', 'playerSprites (no unload): loadPromise': 'the player\'s own sheets',
  'shieldSprites (no unload): loadPromise': 'shields', 'shieldSprites (no unload): _set': 'shields',
  'weaponSprites (no unload): loadPromise': 'weapons',
};
{
  const mods = [...new Set(systemNames().flatMap((s) => filesOf(s)))].filter((f) => /^src\/.*\/[\w$]+Sprites\.js$/.test(f)).sort();
  check(`§49: the page's *Sprites.js modules are found by system (${mods.length})`, mods.length >= 15, mods.length);
  const found = new Set();
  let unloads = 0;
  for (const f of mods) {
    const src = readFileSync(join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
    const decl = [...src.matchAll(/^(?:export\s+)?(?:let|const|var)\s+([\w$]+)\s*=\s*(?:\[|\{|new Map|new Set|Object\.create\(null\)|null\s*;)/gm)].map((x) => x[1]);
    const filled = decl.filter((n) => {
      const rest = src.replace(new RegExp('^(?:export\\s+)?(?:let|const|var)\\s+' + n.replace(/\$/g, '\\$') + '\\s*=', 'm'), '');
      const e = n.replace(/\$/g, '\\$');
      return new RegExp('(?<![\\w$.])' + e + '(?:\\.push\\(|\\.set\\(|\\.add\\(|\\[[^\\]]+\\]\\s*=[^=]|\\s*=[^=>])').test(rest)
        /* or handed to a loader that fills it: `loadStrip(url, NAME[k])` */
        || new RegExp('(?<![\\w$.])load\\w*\\([^;]*?,\\s*' + e + '(?:\\[[^\\]]+\\])?\\s*[,)]').test(rest);
    });
    const unl = [...src.matchAll(/^export\s+(?:async\s+)?function\s+((?:unload|free|release)\w*)\s*\(/gm)];
    const body = unl.map((u) => { const i = src.indexOf('{', u.index); return src.slice(i, closeOf(src, i)); }).join('\n');
    unloads += unl.length;
    const owner = unl.length ? unl[0][1] : ((/^export\s+(?:async\s+)?function\s+([\w$]+)/m.exec(src) || [])[1] || 'module').replace(/^/, '') ;
    const label = unl.length ? owner : (f.slice(f.lastIndexOf('/') + 1, -3) + ' (no unload)');
    for (const n of filled) {
      const e = n.replace(/\$/g, '\\$');
      const emptied = new RegExp('(?<![\\w$.])' + e + '(?:\\s*=[^=]|\\.length\\s*=\\s*0|\\.clear\\(|\\.splice\\(|\\[[^\\]]*\\]\\s*=)|delete\\s+' + e + '\\[|(?:of|in|keys\\(|values\\(|entries\\()\\s*\\(?\\s*' + e + '\\b').test(body);
      if (!emptied || !unl.length) found.add(label + ': ' + n);
    }
  }
  check(`§49: their unloads are read (${unloads})`, unloads >= 10, unloads);
  census('§49', 'containers a *Sprites.js loader fills that its unload leaves full (or with no unload)', found, UNLOAD_KNOWN);
}

/* ── §139: a canvas's source goes through releaseCanvasSource ── */

const SOURCE_KNOWN = { freeWheelScorch: 'wheelObjects.js: the scorch mark\'s own source', _destroy: 'wheelShatter.js: the shatter\'s own source' };
{
  const found = new Set();
  let door = 0;
  for (const f of PAGE) {
    const m = M(f);
    if (/function releaseCanvasSource\(/.test(m)) door++;
    for (const x of m.matchAll(/\.source\.destroy\(\)/g)) { const n = namedFn(spans.get(f).fns, x.index); if (n !== 'releaseCanvasSource') found.add(n); }
  }
  check('§139: releaseCanvasSource is defined once in the page', door === 1, door);
  census('§139', 'functions that destroy a texture\'s source outside releaseCanvasSource', found, SOURCE_KNOWN);
}

/* ── §253: a canvas made to keep is kept as an image, on the chip, or as numbers ── */

/* the function that makes a canvas, in a file that names no keep, by count: each a scratch canvas, a worker's, or stepped in */
const CANVAS_KNOWN = {
  '(top)': 5, _buildPickupHeadSheetPage: 1, _maskCanvas: 1, _standInBake: 2, antialiasUpscaledCanvas: 2, atlasRgba: 1, bakeDisplayCanvas: 1,
  bakeHeadFull: 1, buildFrontBack: 2, buildHotArrowArt: 2, canvas: 1, canvasTexture: 1, composeShirt: 1, cropFilm: 1, cropFrame: 1,
  cropToPaint: 1, ctx2d: 1, display: 1, downscaleByFactor: 1, drawCharacterPortrait: 3, drawIcon: 2, drawSourceRect: 1, dressShirtStrip: 1,
  fetchSheet: 1, fileKeyMask: 1, fitSymbol: 2, footprintTexture: 1, gearNumbersCanvas: 1, glowTex: 1, greyed: 1, headPixelsTick: 1,
  hemiBustUrl: 1, loadOne: 1, loadSheet: 1, loadStepIcon: 1, lootBeamTexture: 1, mintCampfireAtlas: 1, mintFxSheet: 1, mintGrottoFx: 1,
  packTrimmedCore: 2, paletteThumb: 1, portraitDataUrl: 2, processToTransparent: 1, readbackFrames: 1, recolorBodyToCanvas: 2,
  recolorHairToCanvas: 1, recordFishRodMask: 1, renderTraitCanvas: 1, run: 4, runJob: 1, sameCut: 2, shrink: 3, softBake: 2, source: 10,
  sqTex: 1, stampHeadInk: 1, stampShirtArt: 3, stripDetachedComponents: 1, tex: 1, toolRecoloredCanvas: 1, upscaleToFrameHeight: 1,
};
{
  const KEEP = /keepOnGpuOnly|keepAsImage|paletteTex|heldNumbers/;
  const found = new Map();
  let made = 0;
  for (const f of PAGE) {
    if (!f.startsWith('src/rendering/')) continue;
    const c = code.get(f);
    const all = [...c.matchAll(/createElement\("canvas"\)|new OffscreenCanvas\(/g)];
    made += all.length;
    if (!all.length || KEEP.test(c)) continue;
    M(f);
    for (const x of all) { const n = namedFn(spans.get(f).fns, x.index); found.set(n, (found.get(n) || 0) + 1); }
  }
  check(`§253: the canvases src/rendering/ makes are read (${made})`, made >= 80, made);
  census('§253', 'functions that make a canvas in a file that keeps none (keepOnGpuOnly, keepAsImage, colour numbers)', found, CANVAS_KNOWN);
}

/* ── §254: a Text's style is a clone, never a spread ── */

const SPREAD_KNOWN = {
  _renderCoinOverlay: 1, _updateDamageNumbers: 1, _updateGroundLoot: 8, prewarmDmgFontPipe: 1,   /* the effects renderer */
  _updateNPCs: 1, _updatePet: 1, createOtherPlayerDisplay: 1, createPlayerDisplay: 2, drawNodeHpBar: 1,   /* the entity renderer */
};
{
  const found = new Map();
  for (const f of PAGE) {
    const m = M(f);
    for (const x of m.matchAll(/new Text\(/g)) {
      const o = x.index + x[0].length - 1;
      const arg = m.slice(o, closeOf(m, o));
      if (!/style:\{[^{}]*\.\.\.[\w$]/.test(arg)) continue;
      const n = namedFn(spans.get(f).fns, x.index);
      found.set(n, (found.get(n) || 0) + 1);
    }
  }
  census('§254', 'new Texts whose style spreads another (derive it with .clone())', found, SPREAD_KNOWN);
}

/* ── §340: who asks whether the look program is on ── */

const LOOK_ON_KNOWN = {
  'lookPaletteOn: folkSkillReady': 1, 'lookPaletteOn: lookArmourOn': 1, 'lookPaletteOn: lookFolkOn': 1, 'lookPaletteOn: lookFrames': 1,
  'lookPaletteOn: lookSheenOn': 1, 'lookPaletteOn: (top)': 3, 'lookPaletteOn: constructor': 2, 'lookPaletteOn: _updateNPCs': 1,
  'lookSheenOn: gearLookOn': 1, 'lookSheenOn: gearWalkOn': 1, 'lookSheenOn: weaponLookOn': 1,
};
{
  const found = new Map();
  let defs = 0;
  for (const f of PAGE) {
    const m = M(f);
    if (/function lookPaletteOn\(\)/.test(m) && /function lookSheenOn\(\)/.test(m)) defs++;
    for (const x of m.matchAll(/(?<![\w$.])(lookPaletteOn|lookSheenOn)\(\)(?!\{)/g)) {
      const k = x[1] + ': ' + namedFn(spans.get(f).fns, x.index);
      found.set(k, (found.get(k) || 0) + 1);
    }
  }
  check('§340: lookPaletteOn and lookSheenOn are defined, together, once', defs === 1, defs);
  census('§340', 'callers of lookPaletteOn() and lookSheenOn() (a new one asks lookSheenState() and waits on null)', found, LOOK_ON_KNOWN);
}

/* ── §341: many Textures of one source go through destroyTextures ── */

const LOOP_KNOWN = {
  _dispose: 'deathCrumble.js', freeDungeonArt: 'dungeonArt.js', _trimBakeCache: 'the effects renderer', freeFrostImpactTex: 'the effects renderer',
  compare: 'gearLookProbe.js, headLookProbe.js (the probes)', oldWeaponFrames: 'gearLookProbe.js', freeGrottoFx: 'grottoFx.js',
  freeMlook: 'lookArmour.js', compareHeads: 'lookPaletteProbe.js', compareStandIns: 'lookPaletteProbe.js',
  buildZoneDeath: 'monsterDeathZonesFx.js', freeZoneDeath: 'monsterDeathZonesFx.js', freeMonsterRecolor: 'monsterRecolor.js',
  _releaseCrops: 'npcSprites.js', freeTownScenery: 'npcSprites.js', dropPicture: 'wheelDoors.js', _destroy: 'wheelShatter.js',
};
{
  const found = new Set();
  let door = 0;
  for (const f of PAGE) {
    const m = M(f);
    if (/function destroyTextures\(/.test(m)) door++;
    for (const x of m.matchAll(/(?<![\w$.])for\(/g)) {
      const h = closeOf(m, x.index + 3);
      const k = h + 1;
      const body = m[k] === '{' ? m.slice(k, closeOf(m, k) + 1) : m.slice(k, m.indexOf(';', k) + 1);
      if (!/\.destroy\(false\)/.test(body)) continue;
      const n = namedFn(spans.get(f).fns, x.index);
      if (n !== 'destroyTextures') found.add(n);
    }
  }
  check('§341: destroyTextures is defined once in the page', door === 1, door);
  census('§341', 'functions with a loop of .destroy(false) outside destroyTextures', found, LOOP_KNOWN);
}

process.exit(failed ? 1 : 0);
