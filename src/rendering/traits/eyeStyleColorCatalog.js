/* ═══ v2.3.2645: THE EYE STYLES TAKE THE EYE COLOUR ═══
 *
 * Owner: "None of the eyes are recolorable (don't know if they can be)."
 *
 * They can.  This is the bake that does it, and it is the smallest module of
 * its kind in the repo on purpose: NO PALETTE AND NO STORE.
 *
 * ── ONE CONTROL, NOT TWO ──
 * Every other recolourable trait owns three things: a swatch list, a
 * localStorage selection, and a texture bake.  An eye style needs only the
 * third, because the control already exists.  The Eyes tab has had a colour
 * row since v2.3.1928 and it means one thing -- "what colour are your eyes" --
 * so a style worn in that tab should answer to it.  A SECOND swatch row under
 * the same tab, with its own saved value, would ask the player to set their
 * eye colour twice and then watch the two disagree.
 *
 * That is also why this adds nothing to the wire and nothing to the server:
 * 'ec' has been relayed since v2.3.1930, so a peer wearing Demon Eyes in green
 * already arrives with everything needed to draw them.
 *
 * ── WHAT A SWATCH PAINTS, PER STYLE ──
 * The eyewear lesson (v2.3.2424) applies unchanged: the "biggest material"
 * rule lands on a different PART depending on the piece, so the part is pinned
 * per style and NAMED in the picker by eyeStylePaints below.  Measured with
 * segmentMaterials over the three shipped facings, pooled:
 *
 *     sleepy    hue230 42%   dark 32%   hue348 11%   hue278 7%   light 7%
 *     one-eye   light  86%   dark 10%   hue13 5%
 *     demon     hue38  86%   hue15 12%  light 2%
 *     wtf       light  72%   dark 28%
 *
 * SLEEPY pins its navy in traitMaterials.MAIN_MATERIAL (the lid IS its colour;
 * the dark is the outline and the pink inner-corner highlight must survive).
 * DEMON pins 'all' there, because a flame's two tones are one material to the
 * eye and sparing either leaves it half recoloured.
 *
 * ── ONE EYE AND WTF DO NOT FIT A PIN AT ALL, AND THAT IS THE BUG (v2.3.2646) ──
 * Owner, on the first cut: "the pupil for the one eye is only getting
 * recolored around a jagged edge not the whole pupil.  Also the wtf eye pupil
 * area isn't getting recolored."  Both were true, and both came from forcing
 * these two through machinery built for a hat.  Two faults, stacked:
 *
 * (1) THE PUPIL IS NOT ONE MATERIAL.  Pinning `dark` looks obviously right --
 *     it is the only non-white thing on the piece.  It is not: One Eye's pupil
 *     decomposes into the near-black band AND a dark red one, and on its
 *     southwest cell SIX of the nine pupil pixels are the red.  A positive pin
 *     paints part of a pupil and leaves the rest.  What these two pieces
 *     actually are is "the white, and everything that is not the white", so
 *     they SPARE the light material instead of pinning a dark one.
 *
 * (2) A RATIO CANNOT COLOUR A NEAR-BLACK MATERIAL, in either direction.
 *     recolorHairToCanvas multiplies the chosen colour by (pixel luminance /
 *     reference).  WTF's pupil core sits at luminance 1-8 against a material
 *     mean of 18, so red (178,58,48) came out (10,3,3) -- still black.  One
 *     Eye's pupil spans 10 to 104 about a mean of 14, so its core came out dark
 *     red while its rim multiplied past 255 on all three channels and blew out
 *     to WHITE.  A coloured jagged edge round a black pupil: exactly what was
 *     reported.
 *
 *     eyeColorCatalog.js reached this conclusion about the painted-in iris in
 *     v2.3.1928 and answered it by REPLACING the iris outright.  This file
 *     quoted that finding and then shipped a ratio pass anyway, with a better
 *     reference (`matRef`, below).  A better reference does not rescue a ratio
 *     -- the mean is dragged up by the anti-aliased rim, which is what pushed
 *     the core down and the rim through the ceiling.  So these two styles
 *     REPLACE: `flat`, the same answer and the same behaviour the real iris
 *     has had since v2.3.1928.
 *
 * ── matRef, FOR THE TWO THAT DO RETINT ──
 * Sleepy and Demon keep the ratio pass, because their colour carries real
 * shading that a flat fill would destroy.  The reference is still the mean
 * luminance of the pixels the swatch paints rather than of the whole sprite:
 * on a piece that is mostly something else, the sprite mean puts the painted
 * material far from k = 1 and the swatch stops meaning what it says.
 */

import { Texture } from 'pixi.js';
import { recolorHairToCanvas } from '../characterPortrait.js';
import { EYE_COLOR_CATALOG, eyeColorTarget } from './eyeColorCatalog.js';
import { recolorEnabled } from './recolorOptions.js';
import { segmentMaterials, materialIndex, mainMaterial } from './traitMaterials.js';

/* The Eyes tab's own palette, re-exported rather than copied -- see the
   header.  Named so a reader of the picker does not have to know that the two
   rows are the same row. */
export const EYE_STYLE_COLOR_CATALOG = EYE_COLOR_CATALOG;

/* Which styles offer the colour, and what the swatch paints.  An opt-IN, the
   same shape and for the same reason as EYEWEAR_PAINTS: a style imported
   tomorrow gets no colour until someone has looked at its decomposition and
   decided what a swatch should land on.  The MAIN_MATERIAL pin that carries
   out each decision is keyed 'eyes:<id>' -- namespaced because that table is
   keyed by bare trait id across every category, and 'demon' or 'wtf' is
   exactly the sort of id a hat could take later. */
export const EYE_STYLE_PAINTS = Object.create(null);   /* rule 4: id-keyed map */
/* `part` is the label.  With neither `spare` nor `flat`, the style takes the
   positive pin in MAIN_MATERIAL and the ratio retint -- the path every other
   recolourable trait uses. */
EYE_STYLE_PAINTS['sleepy'] = { part: 'Lids' };
EYE_STYLE_PAINTS['demon'] = { part: 'Flames' };
/* ...and these two spare the white and replace everything else outright, for
   the two reasons in the header. */
EYE_STYLE_PAINTS['one-eye'] = { part: 'Pupil', spare: 'light', flat: true };
EYE_STYLE_PAINTS['wtf'] = { part: 'Pupils', spare: 'light', flat: true };

/** The rule for a style, or null if it offers no colour. */
function paintRule(id) {
  return (id && id !== 'none' && EYE_STYLE_PAINTS[id]) || null;
}

/** What a swatch paints on this style, or null if it offers no colour. */
export function eyeStylePaints(id) {
  const r = paintRule(id);
  return r ? r.part : null;
}

/** The RGB a style's paintable part should take, or null for its own colours.
 *
 *  Delegates the palette lookup AND the recolorEnabled('eyes') gate to
 *  eyeColorTarget, so the style and the painted-in eyes can never disagree
 *  about what "Blue" is or about whether the feature is on at all. */
export function eyeStyleColorTarget(colorId, styleId) {
  if (!recolorEnabled('eyes')) return null;
  if (!eyeStylePaints(styleId)) return null;
  return eyeColorTarget(colorId);
}

/* ── in-game recoloured eye-style textures ── */
/* Three facings, like the art: north and northeast ship no frame, so loading
   them would 404 twice per style per colour (the eyewear note, v2.3.2361). */
const DIRS = ['east', 'south', 'southwest'];
const TRAIT_VER = '2.3.2411';   /* the EIGHTH copy of this key; all move together (grep TRAIT_VER).
                                   Not bumped by this change: it adds no art and edits no meta.json. */

const _cache = {};

function loadImg(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
}

/* One shared profile across a style's facings, pooled for the reason the hat
   (v2.3.1109) and the glasses (v2.3.2424) are: keyed per facing, the chosen
   colour lands on a different tone per angle and the eyes change shade as the
   head turns. */
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
  const rule = paintRule(id) || {};
  /* Exactly one of the two is set.  `spare` names a material to LEAVE ALONE
     and paints the rest; otherwise the positive pin in MAIN_MATERIAL decides
     which single material is painted (-1 there means 'all'). */
  const spare = rule.spare ? mats.findIndex((m) => m.kind === rule.spare) : -1;
  const main = spare >= 0 ? -1 : mainMaterial('eyes:' + id, mats);
  /* matRef: the mean luminance of the PAINTED pixels only.  Unused under
     `flat`, and computed anyway so the QA probe can report it. */
  let mSum = 0, mN = 0;
  for (const d of chunks) {
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] <= 30) continue;
      if (main >= 0 || spare >= 0) {
        const mi = materialIndex(d[i], d[i + 1], d[i + 2], mats);
        if (main >= 0 ? mi !== main : mi === spare) continue;
      }
      mSum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      mN++;
    }
  }
  return {
    ref: Math.max(1, n ? (sum / n) * 1.15 : maxL),
    matRef: Math.max(1, mN ? mSum / mN : 1),
    mats,
    main,
    spare,
    flat: !!rule.flat,
  };
}

const _refCache = Object.create(null);   /* rule 4: keyed by a trait id off a saved appearance */
export function getEyeStyleRef(id) {
  if (!id || id === 'none') return Promise.resolve(0);
  if (_refCache[id]) return Promise.resolve(_refCache[id]);
  return Promise.all(DIRS.map((dir) =>
    loadImg(`/sprites/traits/eyestyle/${id}/${dir}.png?v=${TRAIT_VER}`).then((img) => img).catch(() => null)
  )).then((imgs) => (_refCache[id] = _pooledProfile(imgs, id)));
}

/* Bounded, like every other recolour cache (v2.3.1119).  The 30s deferred
   destroy is so a texture still being drawn this frame is not pulled out from
   under the renderer. */
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
  const target = eyeStyleColorTarget(colorId, id);
  const key = id + '/' + colorId;
  _cache[key] = 'loading';
  const tex = {};
  Promise.all(DIRS.map((dir) =>
    loadImg(`/sprites/traits/eyestyle/${id}/${dir}.png?v=${TRAIT_VER}`).then((img) => ({ dir, img })).catch(() => ({ dir, img: null }))
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

/** Recoloured texture map for (eyeStyleId, colorId), or null for the native
 *  colours / while baking -- the caller falls back to the native textures. */
export function getColoredEyeStyleTextures(id, colorId) {
  if (!id || id === 'none' || !colorId || colorId === 'default') return null;
  /* An unlisted style, or the feature switched off, renders native -- so a
     saved appearance naming either falls back cleanly rather than showing
     something the picker no longer offers (the v2.3.1927 hat precedent). */
  if (!eyeStyleColorTarget(colorId, id)) return null;
  const key = id + '/' + colorId;
  const e = _cache[key];
  if (e === undefined) { build(id, colorId); return null; }
  if (e === 'loading') return null;
  delete _cache[key]; _cache[key] = e;   /* LRU touch */
  return e;
}

/* QA hook, the same shape and the same argument as the eyewear one
   (v2.3.2424): the claim worth pinning is not "a swatch lit up" but that the
   bake produces a real texture per facing for the facings the art HAS, that it
   paints the PINNED material and not the biggest one, and that an unlisted
   style falls back to native art.  None of that is visible in the DOM and none
   of it is reachable from a built bundle. */
if (typeof window !== 'undefined') {
  window.__btEyeStyleColor = {
    paints: eyeStylePaints,
    target: eyeStyleColorTarget,
    ref: (id) => getEyeStyleRef(id).then((p) => (p ? { matRef: p.matRef, ref: p.ref, main: p.main, spare: p.spare, flat: p.flat, mats: p.mats.map((m) => ({ kind: m.kind, hue: m.hue, share: m.share })) } : null)),
    textures: (id, colorId) => {
      const t = getColoredEyeStyleTextures(id, colorId);
      return t ? Object.keys(t).sort() : null;
    },
  };
}
