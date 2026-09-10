/* ═══ v2.3.2424: EYEWEAR RECOLOUR ═══
 *
 * Owner: "Do you think recolor options would work well for the glasses?  I
 * like how you recolored the hats."
 *
 * Yes -- but NOT by simply pointing the hat rule at the eyewear folder, and
 * the measurement is why.  segmentMaterials was run over every eyewear piece,
 * pooled across all four facings, exactly as hatColorCatalog does.  The hat
 * rule recolours the BIGGEST material and leaves the rest.  On glasses that
 * lands somewhere different on half of them:
 *
 *     3d-glasses      light 38%   dark 36%   hue2 14%   hue233 11%
 *     eye-patch       dark 100%
 *     goggles         hue202 80%  dark 17%
 *     golden-glasses  hue49 80%   dark 18%
 *     golden-monocle  hue45 46%   dark 37%   hue199 14%
 *     laser-glasses   hue237 43%  dark 34%   hue352 20%
 *     thug-life       dark 84%    hue243 16%
 *     white-glass     light 60%   dark 40%
 *
 * FOUR pieces (eye-patch, golden-glasses, golden-monocle, thug-life) have the
 * FRAME as their biggest material, which is what you would expect a swatch to
 * paint.  The other four have the LENS.  That is not a defect -- a coloured
 * lens is a real look, arguably a better one than a coloured frame -- but it
 * does mean the control paints a different PART depending on which pair you
 * are wearing, and a picker that does not say so is lying about what it does.
 * Hence PAINTS below: the row is labelled with the part, per piece.
 *
 * ── 3D GLASSES ARE DELIBERATELY NOT OFFERED ──
 * Two reasons, and the first alone is enough.  Their identity IS the red and
 * cyan lenses; recolouring either one destroys the thing that makes them 3D
 * glasses, and recolouring the frame instead leaves the pair looking untouched
 * at a glance.  And the decomposition is UNSTABLE: light 38% against dark 36%
 * is a two-point margin, so a small art edit could silently flip which part
 * the swatch paints -- the same control doing two different things across a
 * sprite revision, which reads as broken rather than as a change.
 *
 * ── WHY A PIN PER PIECE RATHER THAN "BIGGEST WINS" ──
 * mainMaterial already takes a per-trait override (traitMaterials.js
 * MAIN_MATERIAL), which is where these live.  Pinning by hue angle or by band
 * rather than leaning on "biggest" makes the choice survive an art edit: the
 * gold rim stays the gold rim even if the dark keyline grows past it.
 */

import { Texture } from 'pixi.js';
import { recolorHairToCanvas } from '../characterPortrait.js';
import { HAT_COLOR_CATALOG } from './hatColorCatalog.js';
import { recolorEnabled } from './recolorOptions.js';
import { segmentMaterials, mainMaterial } from './traitMaterials.js';

/* ONE palette, shared with hats on purpose.  A second copy of the same twelve
   swatches would drift the first time either is retuned, and "the blue on my
   hat is not the blue on my glasses" is exactly the kind of thing that gets
   reported as a bug six months later. */
export const EYEWEAR_COLOR_CATALOG = HAT_COLOR_CATALOG;

/* Which pieces offer the row at all.  An opt-IN rather than an opt-out: a new
   pair imported tomorrow gets no picker until somebody has looked at its
   decomposition and decided what a swatch should paint, which is the decision
   this file exists to record. */
export const EYEWEAR_PAINTS = Object.create(null);   /* rule 4: id-keyed map */
EYEWEAR_PAINTS['golden-glasses'] = 'Frame';
EYEWEAR_PAINTS['golden-monocle'] = 'Frame';
EYEWEAR_PAINTS['thug-life'] = 'Frame';
EYEWEAR_PAINTS['eye-patch'] = 'Patch';      /* one material; the whole thing recolours */
EYEWEAR_PAINTS['goggles'] = 'Lens';
EYEWEAR_PAINTS['laser-glasses'] = 'Lens';
EYEWEAR_PAINTS['white-glass'] = 'Lens';
/* 3d-glasses: deliberately absent -- see the header. */

/** Does this pair offer a colour row, and what does the swatch paint? */
export function eyewearPaints(id) {
  return (id && EYEWEAR_PAINTS[id]) || null;
}

/* A colour a particular pair does not offer.  Same shape as the hat exclusion
   list and empty today: the measured pieces all read cleanly in all twelve.
   It exists so the first "that one looks wrong on the gold" has somewhere to
   go that is not a code change to the rule. */
const EYEWEAR_COLOR_EXCLUDE = Object.create(null);
EYEWEAR_COLOR_EXCLUDE['golden-glasses'] = ['yellow'];   /* it is already gold: the swatch would read as a control that does nothing */
EYEWEAR_COLOR_EXCLUDE['golden-monocle'] = ['yellow'];   /* same, and the same reasoning as the crown's yellow at v2.3.1927 */

export function eyewearColorExcluded(id, colorId) {
  const skip = id && EYEWEAR_COLOR_EXCLUDE[id];
  return !!(skip && skip.indexOf(colorId) >= 0);
}

export function eyewearColorsFor(id) {
  if (!eyewearPaints(id)) return null;   /* no row at all for an unlisted pair */
  const skip = EYEWEAR_COLOR_EXCLUDE[id];
  return skip ? EYEWEAR_COLOR_CATALOG.filter((c) => skip.indexOf(c.id) < 0) : EYEWEAR_COLOR_CATALOG;
}

export function eyewearColorTarget(colorId, id) {
  if (!recolorEnabled('eyewear')) return null;
  if (id && !eyewearPaints(id)) return null;
  if (eyewearColorExcluded(id, colorId)) return null;
  const e = EYEWEAR_COLOR_CATALOG.find((c) => c.id === colorId);
  return (e && e.target) || null;
}

/* ── selection store (localStorage), same shape as every other colour ── */
const STORAGE_KEY = 'bt-eyewearcolor';
let _active = 'default';
try {
  const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
  if (saved) _active = saved;
} catch (e) { /* localStorage unavailable (private window) */ }

const _listeners = new Set();
export function getEyewearColor() { return _active; }
export function setEyewearColor(id) {
  if (id === _active) return;
  _active = id;
  try { localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* ignore */ }
  _listeners.forEach((fn) => { try { fn(id); } catch (e) { /* ignore */ } });
}
export function onEyewearColorChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/* ── in-game recoloured eyewear textures ── */
/* v2.3.2361: north is omitted from every eyewear sheet on purpose -- the piece
   is not visible from behind, so the renderer hides it (the beard precedent,
   v2.3.1530).  Loading it would 404 four times per pair per colour. */
const DIRS = ['east', 'northeast', 'south', 'southwest'];
const TRAIT_VER = '2.3.2411';   /* the SIXTH copy of this key; all move together (grep TRAIT_VER).
                                   Not bumped here: this change adds no art and edits no meta.json, so
                                   nothing a returning player already holds has gone stale. */

const _cache = {};

function loadImg(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
}

/* One shared recolour reference across a pair's facings, for the same reason
   the hat one is pooled (v2.3.1109): keyed per facing, the chosen colour lands
   on a different tone per angle and the glasses change as the head turns. */
function _pooledProfile(imgs, id) {
  const chunks = [];
  let sum = 0, n = 0, maxL = 1;
  for (const img of imgs) {
    if (!img) continue;
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    chunks.push(d);
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 30) {
        const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        sum += l; n++; if (l > maxL) maxL = l;
      }
    }
  }
  const mats = segmentMaterials(chunks);
  return { ref: Math.max(1, n ? (sum / n) * 1.15 : maxL), mats, main: mainMaterial(id, mats) };
}

const _refCache = Object.create(null);   /* rule 4: keyed by a trait id off a saved appearance */
export function getEyewearRef(id) {
  if (!id || id === 'none') return Promise.resolve(0);
  if (_refCache[id]) return Promise.resolve(_refCache[id]);
  return Promise.all(DIRS.map((dir) =>
    loadImg(`/sprites/traits/eyewear/${id}/${dir}.png?v=${TRAIT_VER}`).then((img) => img).catch(() => null)
  )).then((imgs) => (_refCache[id] = _pooledProfile(imgs, id)));
}

/* Bounded, like every other recolour cache (v2.3.1119): a crowded zone must not
   grow it without limit.  The 30s deferred destroy is so a texture still being
   drawn this frame is not pulled out from under the renderer. */
const _CACHE_CAP = 12;
function _capCache() {
  const keys = Object.keys(_cache);
  if (keys.length <= _CACHE_CAP) return;
  for (const k of keys) {
    const e = _cache[k];
    if (e === 'loading') continue;
    delete _cache[k];
    setTimeout(() => {
      try { for (const dir in e) { const t = e[dir]; if (t && t.source) t.source.destroy(); } }
      catch (err) { /* ignore */ }
    }, 30000);
    break;
  }
}

function build(id, colorId) {
  const target = eyewearColorTarget(colorId, id);
  const key = id + '/' + colorId;
  _cache[key] = 'loading';
  const tex = {};
  Promise.all(DIRS.map((dir) =>
    loadImg(`/sprites/traits/eyewear/${id}/${dir}.png?v=${TRAIT_VER}`).then((img) => ({ dir, img })).catch(() => ({ dir, img: null }))
  )).then((loaded) => {
    const prof = _refCache[id] || (_refCache[id] = _pooledProfile(loaded.map((l) => l.img), id));
    for (const { dir, img } of loaded) {
      if (!img) continue;   /* dir missing -> the renderer falls back to native art */
      const cv = recolorHairToCanvas(img, target, prof);
      const t = Texture.from(cv);
      if (t && t.source) { t.source.scaleMode = 'linear'; t.source.autoGenerateMipmaps = true; }
      tex[dir] = t;
    }
    _cache[key] = tex;
    _capCache();
  });
}

/** Recoloured texture map for (eyewearId, colorId), or null for the native
 *  colour / while baking -- the caller falls back to the native textures. */
export function getColoredEyewearTextures(id, colorId) {
  if (!id || id === 'none' || !colorId || colorId === 'default') return null;
  /* An unlisted pair, or a colour it does not offer, renders native -- so a
     saved appearance naming either falls back cleanly rather than showing
     something the picker no longer offers (the v2.3.1927 hat precedent). */
  if (!eyewearColorTarget(colorId, id)) return null;
  const key = id + '/' + colorId;
  const e = _cache[key];
  if (e === undefined) { build(id, colorId); return null; }
  if (e === 'loading') return null;
  delete _cache[key]; _cache[key] = e;   /* LRU touch */
  return e;
}

/* QA hook, same shape as eyewearCatalog's __btSetEyewear (v2.3.2424).  The
   claim worth pinning is not "a swatch lit up" -- it is that the bake produces
   a real texture per facing, for the facings the art HAS, and that an excluded
   or unlisted pair falls back to native art instead.  None of that is visible
   in the DOM and none of it is reachable from a built bundle, so it is exposed
   here rather than by importing the source module (which only resolves in a
   dev server, not in the `dist/` the QA harness serves). */
if (typeof window !== 'undefined') {
  window.__btEyewearColor = {
    paints: eyewearPaints,
    colorsFor: eyewearColorsFor,
    excluded: eyewearColorExcluded,
    target: eyewearColorTarget,
    get: getEyewearColor,
    set: setEyewearColor,
    textures: getColoredEyewearTextures,
  };
}
