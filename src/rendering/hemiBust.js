/* ═══ v2.3.3999: YOUR PORTRAIT IS A HEMI BRO ═══
 *
 * The owner, 2026-11-03: "For profile picture art I want it in the style of
 * the original hemi bro NFT's as much as possible with the custom stuff added
 * on to it."  So the character's headshot -- the Character button's icon, the
 * identity strip, the level-up medallion, the trade window, the inspect card,
 * the character list, everything portraitDataUrl(opts, true) serves -- is a
 * 32 x 32 Hemi Bros bust of the look, stacked from the collection's own trait
 * layers by the townsfolk's rules (docs/specs/hemi-portrait.md):
 *
 *   look -> hemiLook.js hemiRecipe -> hemiBustCore.js composeBust -> 32 x 32
 *        -> 6 x 6 blocks, nearest neighbour -> a 192 x 192 PNG data URL
 *
 * The layers are ONE palette PNG (public/portrait/hemi-bros-atlas.png, 256 x
 * 256, 6 KB; tools/portrait/make-hemi-atlas.mjs), loaded behind the loading
 * screen (preloadAnimations.js `hemiBust`: PRELOADING IS LAW) and read as its
 * colour numbers (png8Decode.js), never drawn: the page keeps 59 small layers
 * of 4 KB, and each portrait is made on a 192 px canvas let go at once.
 *
 * v2.3.4049: default OFF (owner, 2026-11-03: "Sorry but I don't like the pfp"):
 * the game's own headshot everywhere, as before v2.3.3999, and the atlas is not
 * even loaded.  `?hemiface=1` turns it on for one tab (the Test panel's row
 * went with the default: there is nothing left for it to turn off).  A
 * look the collection has no bro for (the monkey) keeps the game's headshot,
 * and so does any failure here: '' means "draw the old one".
 *
 * Every picture is a data URL ending `#hemi` (a data URL's fragment is not
 * part of its picture), so one rule shows each one crisp wherever it is put:
 * `img[src$="#hemi"] { image-rendering: pixelated }`, written once below --
 * smoothed, a 32 px bust shrunk into a 40 px chip blurs every pixel edge, as
 * Diego's shop chip did (npc-creator-looks.md). */
import { HEMI_ATLAS } from './hemiAtlasIndex.js';
import { composeBust, upscale, sliceAtlas, GRID } from './hemiBustCore.js';
import { hemiRecipe, hemiFaceChoice } from './hemiLook.js';
import { decodePng8 } from './png8Decode.js';
import { skinTarget } from './playerSkins.js';
import { getPattern } from './traits/patternCatalog.js';

export const HEMI_SCALE = 6;          /* 32 x 6 = 192, the townsfolk's heads' size */
const CACHE_CAP = 24;                 /* data URLs kept, newest last (a cache has a cap) */

let _layers = null;                   /* name -> 32 x 32 RGBA */
let _loading = null;
let _choice = null;
const _cache = new Map();             /* recipe key -> data URL */
const _stats = { wanted: null, why: '', loaded: false, loadError: '', made: 0, cached: 0, fellBack: 0, last: null };

function choice() {
  if (_choice) return _choice;
  let search = '';
  try { search = (typeof window !== 'undefined' && window.location && window.location.search) || ''; } catch (e) { search = ''; }
  _choice = hemiFaceChoice(search);
  _stats.wanted = _choice.on; _stats.why = _choice.why;
  return _choice;
}

/** Is the headshot a Hemi Bro on this page? (v2.3.4049: only with `?hemiface=1`) */
export function hemiFaceWanted() { return choice().on; }

/* the atlas's numbers to RGBA; a browser with no DecompressionStream (iOS
   before 16.4) reads the PNG as a picture instead */
async function atlasRgba() {
  const res = await fetch(HEMI_ATLAS.url);
  if (!res.ok) throw new Error('atlas ' + res.status);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const p = await decodePng8(bytes);
  if (p) {
    const out = new Uint8Array(p.w * p.h * 4);
    for (let y = 0; y < p.h; y++) {
      for (let x = 0; x < p.w; x++) {
        const k = p.idx[y * p.stride + x], o = (y * p.w + x) * 4;
        out[o] = p.rgb[k * 3]; out[o + 1] = p.rgb[k * 3 + 1]; out[o + 2] = p.rgb[k * 3 + 2]; out[o + 3] = p.alpha[k];
      }
    }
    return { w: p.w, data: out };
  }
  const blob = new Blob([bytes], { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, cv.width, cv.height);
    cv.width = cv.height = 0;
    return { w: d.width, data: new Uint8Array(d.data.buffer) };
  } finally { URL.revokeObjectURL(url); }
}

/** The atlas, loaded once (preloadAnimations.js awaits this behind the
 *  loading screen).  Resolves to the layers, or null when off or failed. */
export function preloadHemiBust() {
  if (!hemiFaceWanted()) return Promise.resolve(null);
  if (_layers) return Promise.resolve(_layers);
  if (!_loading) {
    _loading = atlasRgba().then((a) => {
      _layers = sliceAtlas(a.data, a.w, HEMI_ATLAS.layers, HEMI_ATLAS.cols, HEMI_ATLAS.cell);
      _stats.loaded = true;
      return _layers;
    }).catch((e) => {
      _stats.loadError = String((e && e.message) || e);
      _loading = null;   /* the next portrait asks again */
      return null;
    });
  }
  return _loading;
}

let _css = false;
function crispRule() {
  if (_css || typeof document === 'undefined') return;
  _css = true;
  try {
    const st = document.createElement('style');
    st.setAttribute('data-bt', 'hemi-portrait');
    st.textContent = 'img[src$="#hemi"]{image-rendering:pixelated}';
    document.head.appendChild(st);
  } catch (e) { /* the picture still shows, smoothed */ }
}

/** portraitDataUrl's options (characterPortrait.js: ids for the skin and the
 *  pieces, colour TARGETS for the colours) -> hemiLook's look.  An absent
 *  shirt pattern is this device's own, as drawCharacterPortrait reads it. */
export function lookFromPortraitOpts(opts) {
  const o = opts || {};
  return {
    skin: o.skin && o.skin !== 'default' ? skinTarget(o.skin) : null,
    hair: o.hair, hairColor: o.hairColor || null,
    headwear: o.headwear, hatColor: o.hatColor || null,
    facialHair: o.facialHair, facialHairColor: o.facialHairColor || null,
    eyewear: o.eyewear, eyewearColor: o.eyewearColor || null,
    eyeStyle: o.eyeStyle, species: o.species,
    shirt: o.shirt, shirtColor: o.shirtColor || null,
    shirtPattern: o.shirtPattern !== undefined ? (o.shirtPattern || '') : getPattern('shirt'),
  };
}

/** The headshot as a Hemi Bro: a 192 x 192 PNG data URL, or '' (off, a look
 *  with no bro, or any failure -- the caller draws the game's own). */
export async function hemiBustUrl(opts) {
  try {
    if (!hemiFaceWanted()) return '';
    const recipe = hemiRecipe(lookFromPortraitOpts(opts), HEMI_ATLAS.backgrounds);
    if (!recipe) { _stats.fellBack++; return ''; }
    const key = JSON.stringify(recipe);
    const hit = _cache.get(key);
    if (hit) {
      _cache.delete(key); _cache.set(key, hit);   /* newest last */
      _stats.cached++;
      return hit;
    }
    const layers = await preloadHemiBust();
    if (!layers || typeof document === 'undefined') { _stats.fellBack++; return ''; }
    const px = composeBust(layers, recipe);
    const S = HEMI_SCALE, W = GRID * S;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = W;
    cv.getContext('2d').putImageData(new ImageData(upscale(px, S), W, W), 0, 0);
    const url = cv.toDataURL('image/png') + '#hemi';
    cv.width = cv.height = 0;   /* the canvas let go: the URL is the picture */
    crispRule();
    _cache.set(key, url);
    while (_cache.size > CACHE_CAP) _cache.delete(_cache.keys().next().value);
    _stats.made++;
    _stats.last = { bg: recipe.bgName, hair: recipe.hair && recipe.hair.name, headwear: recipe.headwear && recipe.headwear.name, eyes: recipe.eyes, eyewear: recipe.eyewear && recipe.eyewear.name, beard: !!recipe.beard, shirt: !!recipe.shirt };
    return url;
  } catch (e) {
    _stats.fellBack++;
    return '';
  }
}

/* QA (the UI review's hemi states): what the portrait is made of */
if (typeof window !== 'undefined') {
  window.__btHemiFace = () => ({ ..._stats, wanted: hemiFaceWanted(), layers: _layers ? Object.keys(_layers).length : 0, cache: _cache.size });
}
