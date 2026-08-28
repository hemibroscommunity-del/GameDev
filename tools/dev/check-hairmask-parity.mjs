/* v2.3.1959: the hair MASK lands exactly where the HAT lands.
 *
 * ═══ WHAT WENT WRONG ═══
 * A hat that declares `clipsHair` has its silhouette (hairmask/<dir>.png)
 * placed as a mask over the hair sprite, so long hair cannot poke out of the
 * top or the sides.  That mask is only correct if it is placed with the SAME
 * numbers as the hat.  Two of the hat's adjustments depend on the hair worn
 * under it, so they cannot live in meta.json and are passed in at the
 * placement call instead:
 *
 *   the float lift (v2.3.1561) — a `floatsAboveHair` hat hovers clear of the
 *   hair, so it is lifted by however tall that hair is;
 *   the band refit (v2.3.1943) — a `band: true` hat encircles the head, so on
 *   the afro it is grown horizontally to reach around it.
 *
 * Each was added to the hat's own placement in both renderers, and each was
 * left out of the MASK's placement in both renderers.  The world renderer's
 * _clipHairToHat asked hatPoseTune only; the portrait's renderTraitCanvas did
 * not even take a liftY/mulX to pass.  So with either adjustment live, the
 * clip cut the hair to a silhouette the hat was not standing in — and the
 * symptom reads as broken ART (hair sheared in mid-air, or bulging out of a
 * band) rather than as broken placement.
 *
 * ═══ WHY THIS TEST HAS TO MANUFACTURE ITS CASE ═══
 * No shipped hat can reach the bug, which is exactly why it survived two
 * versions and why a test over today's catalogue would prove nothing.
 * Measured at the time of writing (this file re-measures it below and prints
 * what it finds): `halo` is the only `floatsAboveHair` hat and it has neither
 * `clipsHair` nor a hairmask/ folder; `bandana-2`, `bandana-blue` and
 * `naruto-headband` are the only `band: true` hats and all three declare
 * `clipsHair: false`.  Turning `clipsHair` on for a band, or drawing a mask
 * for a floating hat, is a one-line content change — the trap this pins is
 * for whoever makes it.
 *
 * So the case is built here: a REAL band id (so bandFit's real hairSwell.json
 * numbers apply — a made-up id is not in the catalog and would refit by 1.0,
 * testing nothing) wearing a MANUFACTURED meta that turns on `clipsHair` and
 * `floatsAboveHair` together, over the afro.  No art and no meta.json on disk
 * is touched; the meta is served to the renderer by the stubbed fetch.
 *
 * ═══ WHY THE PORTRAIT IS DRIVEN AND THE WORLD RENDERER IS NOT ═══
 * characterPortrait.js is a 2D-canvas compositor over plain ES modules, so
 * with a recording canvas / Image / fetch it can be run for real in node and
 * asked where it actually put the two sprites.  entityRenderer.js cannot:
 * it pulls in pixi.js, whose Assets touches `document` at import time
 * (measured — `ReferenceError: document is not defined` out of
 * BrowserAdapter.getBaseUrl before any of this file's code runs).  Its half is
 * therefore pinned two ways: the shared traits/hatHairFit.js is unit-tested
 * here, and the one line that regressed is checked in source — a grep is a
 * weak test, but "the mask placement calls the same tune builder the hat
 * placement calls" is precisely the property that was violated, and a source
 * check that runs everywhere beats a browser test that runs nowhere.
 *
 * Zero dependencies (node only), like every other check precheck runs: the
 * loader hook below exists because src/ imports .json with vite's bare
 * syntax, which node requires an import attribute for.
 */
import { register } from 'node:module';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

/* Node 22 refuses `import X from './y.json'` without `with { type: 'json' }`;
   vite adds it for us in the app build, so the source cannot carry it. */
register('data:text/javascript,' + encodeURIComponent(
  'export async function resolve(s, c, next) {\n'
  + '  const r = await next(s, c);\n'
  + '  if (/\\.json(\\?|$)/.test(r.url)) return { ...r, importAttributes: { type: "json" } };\n'
  + '  return r;\n'
  + '}\n'));

let fails = 0;
const ok = (name, cond, detail) => {
  if (cond) { console.log('PASS ' + name); return; }
  fails++; console.log('FAIL ' + name + (detail !== undefined ? '\n       ' + detail : ''));
};
const info = (msg) => console.log('     ' + msg);

/* ══════════════════════════════════════════════════════════════════════
   0.  The unreachability claim, re-measured rather than trusted.
   ══════════════════════════════════════════════════════════════════════ */
const HW_DIR = join(ROOT, 'public/sprites/traits/headwear');
const catalogSrc = readFileSync(join(ROOT, 'src/rendering/traits/headwearCatalog.js'), 'utf8');
const BAND_IDS = [...catalogSrc.matchAll(/\{\s*id:\s*'([^']+)'[^}]*\bband:\s*true/g)].map((m) => m[1]);
const reachable = [];
for (const id of readdirSync(HW_DIR)) {
  const metaPath = join(HW_DIR, id, 'meta.json');
  if (!existsSync(metaPath)) continue;
  const m = JSON.parse(readFileSync(metaPath, 'utf8'));
  const hasMask = existsSync(join(HW_DIR, id, 'hairmask'));
  if (!(m.clipsHair && hasMask)) continue;
  if (m.floatsAboveHair || BAND_IDS.includes(id)) reachable.push(id);
}
info(`band hats in the catalog: ${BAND_IDS.join(', ') || '(none)'}`);
info(`shipped hats that clip hair AND float or band: ${reachable.length ? reachable.join(', ') : '(none — the bug is unreachable from content, hence the manufactured case below)'}`);

/* ══════════════════════════════════════════════════════════════════════
   1.  The shared fit itself.  Both renderers place the hat AND the mask
       from this; if it went neutral the rest of the test would pass while
       measuring nothing, so the case is asserted to be live first.
   ══════════════════════════════════════════════════════════════════════ */
const { hatHairFit } = await import(pathToFileURL(join(ROOT, 'src/rendering/traits/hatHairFit.js')).href);

const BAND_ID = BAND_IDS[0];                    /* a real band, so bandFit bites */
const DIR = 'east';
/* Manufactured: a band that also clips hair and floats.  bbox[3] is the art's
   own height, which is what puts the hat's UNDERSIDE below the crown and so
   forces a non-zero lift. */
const HAT_META = {
  fullFrame: true, clipsHair: true, floatsAboveHair: true,
  anchors: { east: [128, 40] }, crownNudge: { east: [0, -6] },
  bboxes: { east: [98, 34, 60, 20] }, scale: { east: 1 },
};
const HAIR_META = {
  fullFrame: true, anchors: { east: [128, 30] }, crownNudge: { east: [0, -20] },
  bboxes: { east: [92, 10, 72, 60] }, scale: { east: 1 },
};
const fit = hatHairFit(BAND_ID, HAT_META, 'afro', HAIR_META, 'stand', DIR, DIR);
ok('the manufactured case is live: the float lift is non-zero', fit.dy256 < 0, `dy256=${fit.dy256}`);
ok('the manufactured case is live: the band refit widens', fit.mulX > 1, `mulX=${fit.mulX}`);
ok('a hat that neither floats nor bands is left alone',
  (() => { const f = hatHairFit('top-hat', { anchors: {} }, 'afro', HAIR_META, 'stand', DIR, DIR);
    return f.dy256 === 0 && f.mulX === 1; })());
ok('a bare head still lifts a floating hat off the scalp',
  hatHairFit(BAND_ID, HAT_META, 'none', null, 'stand', DIR, DIR).dy256 < 0);

/* ══════════════════════════════════════════════════════════════════════
   2.  The portrait, driven for real.
   ══════════════════════════════════════════════════════════════════════ */
const TEX = 128;            /* both the hat frame and its mask are 128 on disk */
const draws = [];           /* every drawImage, with the live transform */

const mul = (a, b) => [
  a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const invert = (m) => {
  const det = m[0] * m[3] - m[1] * m[2];
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det,
    (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det];
};

function makeCanvas() {
  const cv = { width: 0, height: 0, style: {} };
  let m = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const ctx = {
    canvas: cv,
    imageSmoothingEnabled: true, imageSmoothingQuality: 'low',
    globalCompositeOperation: 'source-over', fillStyle: '#000',
    save() { stack.push(m.slice()); },
    restore() { if (stack.length) m = stack.pop(); },
    translate(x, y) { m = mul(m, [1, 0, 0, 1, x, y]); },
    scale(x, y) { m = mul(m, [x, 0, 0, y, 0, 0]); },
    setTransform(a, b, c, d, e, f) { m = [a, b, c, d, e, f]; },
    drawImage(img, dx = 0, dy = 0, dw, dh) {
      draws.push({ target: cv, img, src: (img && img.src) || null, m: m.slice(),
        dx, dy, w: dw != null ? dw : ((img && (img.naturalWidth || img.width)) || 0),
        h: dh != null ? dh : ((img && (img.naturalHeight || img.height)) || 0) });
    },
    clearRect() {}, fillRect() {},
    getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(4, w * h * 4)), width: w, height: h }; },
    putImageData() {},
    createRadialGradient() { return { addColorStop() {} }; },
  };
  cv.getContext = () => ctx;
  return cv;
}
globalThis.document = { createElement: (t) => (t === 'canvas' ? makeCanvas() : { style: {} }) };
globalThis.Image = class {
  constructor() { this.naturalWidth = TEX; this.naturalHeight = TEX; this.width = TEX; this.height = TEX; }
  set src(v) { this._src = v; queueMicrotask(() => this.onload && this.onload()); }
  get src() { return this._src; }
};
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
/* Every meta the portrait asks for is answered from here, which is how the
   manufactured hat reaches the renderer without touching a file on disk. */
globalThis.fetch = async (url) => {
  const body = /body-tops\.json/.test(url) ? { [`stand-${DIR}-0`]: [128, 33] }
    : /headwear\//.test(url) ? HAT_META
      : /\/hair\//.test(url) ? HAIR_META : null;
  return { ok: !!body, json: async () => body };
};

const { drawCharacterPortrait } = await import(pathToFileURL(join(ROOT, 'src/rendering/characterPortrait.js')).href);
const out = makeCanvas();
await drawCharacterPortrait(out, { headwear: BAND_ID, hair: 'afro', dir: DIR });

const hat = draws.find((d) => d.src && d.src.includes(`/headwear/${BAND_ID}/`) && !d.src.includes('hairmask'));
const mask = draws.find((d) => d.src && d.src.includes('/hairmask/'));
ok('the portrait drew the hat', !!hat);
ok('the portrait drew the hair mask (the manufactured meta clips hair)', !!mask);

if (hat && mask) {
  /* The hat is painted onto the figure canvas, which carries the portrait's
     own zoom/mirror stack; the mask is painted onto a bare FRAME canvas of
     its own, which is then composited over the hair at (0,0).  Divide the
     figure's outer transform out of the hat and the two are directly
     comparable.  `outer` is read off the composite rather than assumed: it is
     the transform of the canvas-into-figure blits (body, hair), all of which
     are drawn at the origin with nothing extra applied. */
  /* The compositor builds the figure on an offscreen canvas and blits that
     into the caller's canvas at the very end (v2.3.715, so a rotation does
     not flash blank), so the offscreen one is whatever got drawn into `out`. */
  const workCanvas = draws.filter((d) => d.target === out).map((d) => d.img).pop();
  const blits = draws.filter((d) => d.target === workCanvas && !d.src && d.dx === 0 && d.dy === 0);
  ok('the figure canvas took at least one whole-frame blit to read its transform off',
    blits.length > 0);
  ok('...and every one of them agrees on that transform',
    blits.every((b) => b.m.every((v, i) => Math.abs(v - blits[0].m[i]) < 1e-9)));
  const outer = blits[0].m;
  const hatLocal = mul(invert(outer), hat.m);
  /* Compare where the two IMAGES actually land: their drawn corners, which
     fold the anchor offset, the lift and the horizontal grow into one number
     each.  Both frames are the same size on disk, so equal corners means
     equal placement and equal scale. */
  const corners = (d, m) => [...apply(m, d.dx, d.dy), ...apply(m, d.dx + d.w, d.dy + d.h)];
  const hc = corners(hat, hatLocal), mc = corners(mask, mask.m);
  const near = hc.every((v, i) => Math.abs(v - mc[i]) < 1e-6);
  ok('the mask lands exactly where the hat lands (float lift AND band refit)',
    near, `hat corners [${hc.map((v) => v.toFixed(3))}]\n       mask corners [${mc.map((v) => v.toFixed(3))}]`);
  /* Guard against the comparison quietly measuring nothing: two sprites both
     placed with NEITHER adjustment also land on top of each other, and that
     is the broken state for a hat which is supposed to have both.  So assert
     the hat's own placement carries them — the band refit is horizontal only,
     so it shows up as scaleX != scaleY, and the float lift as an anchor above
     where crownNudge alone would have put it. */
  const hatAnchor = apply(hatLocal, 0, 0);
  const noLiftY = 33 + HAT_META.crownNudge.east[1];   /* body-tops crown + crownNudge */
  ok('the hat itself carries the band refit (scaleX != scaleY)',
    Math.abs(hatLocal[0] - hatLocal[3]) > 1e-6, `scaleX=${hatLocal[0]} scaleY=${hatLocal[3]}`);
  ok('the hat itself carries the float lift (anchor sits above the plain crown nudge)',
    hatAnchor[1] < noLiftY - 1e-6, `anchorY=${hatAnchor[1]} un-lifted=${noLiftY}`);
}

/* ══════════════════════════════════════════════════════════════════════
   3.  The world renderer, in source (see the header for why).
   ══════════════════════════════════════════════════════════════════════ */
const erSrc = readFileSync(join(ROOT, 'src/rendering/systems/entityRenderer.js'), 'utf8');
const clipBody = erSrc.slice(erSrc.indexOf('function _clipHairToHat('),
  erSrc.indexOf('function _placeHair('));
ok('_clipHairToHat places the mask with _hatTune — the same builder _placeHeadwear uses',
  /_placeTrait\([\s\S]*?_hatTune\(/.test(clipBody),
  'the mask placement is back to a subset of the hat\'s adjustments');
const standInBody = erSrc.slice(erSrc.indexOf('function _clipStandInHair('),
  erSrc.indexOf('export function placeSkillTraits('));
ok('_clipStandInHair places the mask with the fit its caller gave the hat',
  /_placeStandaloneTrait\([\s\S]*?fit && fit\.dy256, fit && fit\.mulX\)/.test(standInBody),
  'the swing/chop/cook stand-ins are masking with their own numbers again');

console.log(fails ? `\n${fails} FAILED` : '\nhairmask-parity: ALL PASS');
process.exit(fails ? 1 : 0);
