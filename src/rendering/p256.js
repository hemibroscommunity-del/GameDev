/* ═══ v2.3.3728: THE EFFECTS DRAWN FROM THEIR 256-COLOUR TWINS ═══
 *
 * docs/specs/pictures-256.md.  The owner, 2026-10-28: "You can go ahead and
 * reduce it. I won't notice at all from anything at 256."  Every effect drawn
 * in the world (the hit bursts, the whirlwind, the stun stars, the fire
 * trail, the portal's beam, the arrow blast...) and the gathering tools'
 * strips have a twin beside them on 256 colours (tools/art/reduce256.mjs,
 * listed in src/data/p256Files.js).  With `?p256` on -- the default;
 * `?p256=0` is the game as it was -- the game reads the twin, and a picture on
 * 256 colours is kept as colour numbers: one byte a pixel in the page and on
 * the graphics chip, where it was four on the chip (picsNumbers.js, the
 * monsters' way; paletteTex.js draws them).  One row of the atlas's colours
 * for each picture, whatever its frames.
 *
 * Two doors, as the pictures are loaded two ways:
 *   - a strip cropped and packed (gearSheets.js loadCroppedStrip): the twin is
 *     packed instead of the original, and the packed strip read into its
 *     numbers at once (stripAsNumbers);
 *   - a picture Pixi's loader loads whole (Assets.load: the portal's beam, the
 *     arrow blast, the snowball's burst, the anvil, the footprints): a loader
 *     ahead of Pixi's own reads the twin as a picture, its numbers off a
 *     canvas once, and hands back a texture of colour numbers -- the same
 *     address, the same size, so nothing that loads, finds or frees it
 *     changes (Assets.unload destroys it, which gives its row back).
 * Anything that cannot be (no colour-numbers program on this device, a row
 * short, a twin that will not load) is the original, as before.
 *
 * Probe: window.__btP256(). */
import { extensions, ExtensionType, LoaderParserPriority, Texture, Rectangle, Cache, loadTextures } from 'pixi.js';
import { P256_FILES } from '../data/p256Files.js';
import { picNumbersOn, stripAsNumbers } from './picsNumbers.js';
import { isPaletteSource } from './paletteDraw.js';
import { paletteDecided } from './paletteTex.js';

const _q = (() => { try { return typeof location !== 'undefined' ? (location.search || '') : ''; } catch (e) { return ''; } })();
const WANTED = !/[?&]p256=0\b/.test(_q);
/* (never while QA compares cropped strips against their files: __btTrimVerify) */
export function p256On() { return WANTED && picNumbersOn(); }

const _stats = { strips: 0, pictures: 0, asOriginal: 0, readMs: 0, undecided: 0 };

function pathOf(url) {
  let p = String(url || '');
  const q = p.search(/[?#]/);
  if (q >= 0) p = p.slice(0, q);
  const m = /^[a-z]+:\/\/[^/]+(\/.*)$/i.exec(p);
  return m ? m[1] : p;
}
function queryOf(url) {
  const s = String(url || ''), q = s.indexOf('?');
  return q < 0 ? '' : s.slice(q);
}

/* a picture with a twin, wanted */
function listed(url) {
  if (!WANTED) return null;
  const e = P256_FILES[pathOf(url)];
  return e && !(e.w % 4) ? e : null;
}

/* ═══ WAITING FOR THE RENDERER'S WORD ═══
   The effects are asked for as their modules are read -- before the renderer
   is made and says whether this device draws colour numbers (paletteTex.js
   setPaletteRenderer).  A picture with a twin waits for that word (at most
   DECIDE_MS: then the original, as before), so it is the twin where it will be
   drawn as numbers and the original everywhere else.  Everything waiting is
   still behind the loading screen (the fx preload gates). */
const DECIDE_MS = 20000;
let _decided = null;
export function whenPaletteDecided() {
  if (paletteDecided()) return Promise.resolve(true);
  if (_decided) return _decided;
  _decided = new Promise((res) => {
    const t0 = Date.now();
    const tick = () => {
      if (paletteDecided()) { _decided = null; res(true); return; }
      if (Date.now() - t0 > DECIDE_MS) { _decided = null; _stats.undecided++; res(false); return; }
      setTimeout(tick, 50);
    };
    tick();
  });
  return _decided;
}

/** For a strip loader: the address to load for `url` -- its twin where it will
 *  be drawn as colour numbers, else `url` itself.  Resolves at once for a
 *  picture with no twin. */
export async function p256Address(url) {
  if (!listed(url)) return url;
  await whenPaletteDecided();
  return p256Twin(url) || url;
}

/** The twin's address for `url` (its own query kept, so a cache-busting
 *  version still busts), or null: no twin, or not read that way here. */
export function p256Twin(url) {
  if (!p256On()) return null;
  const e = P256_FILES[pathOf(url)];
  if (!e) return null;
  /* a texture's frames are cut by its width: a twin is used only where its
     colour numbers need no padding (every one listed is) */
  if (e.w % 4) return null;
  return e.twin + queryOf(url);
}

/** gearSheets.js loadCroppedStrip, once packed: the strip as colour numbers on
 *  its own row, or null (the canvas stays, as before). */
export function packedTwinAsNumbers(url, canvas) {
  const src = stripAsNumbers('p256:' + pathOf(url), canvas, String(url));
  if (src) _stats.strips++;
  else _stats.asOriginal++;
  return src;
}

/* ── the loader for a picture loaded whole ── */
function loadImage(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
}
function textureOf(src, loader, url, w, h) {
  src.label = url;
  src._sourceOrigin = url;
  const tex = new Texture({ source: src, frame: new Rectangle(0, 0, w, h), label: url });
  const forget = () => {
    delete loader.promiseCache[url];
    if (Cache.has(url)) Cache.remove(url);
  };
  src.once('destroy', () => { if (loader.promiseCache[url]) forget(); });
  tex.once('destroy', () => { if (!src.destroyed) forget(); });
  return tex;
}
export const p256LoadParser = {
  name: 'btP256Load',
  id: 'bt-p256',
  extension: { type: ExtensionType.LoadParser, priority: LoaderParserPriority.High + 2, name: 'btP256Load' },
  test(url) { return !!listed(url); },
  async load(url, asset, loader) {
    await whenPaletteDecided();
    const twin = p256Twin(url);
    if (!twin) return loadTextures.load(url, asset, loader);
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    let src = null, w = 0, h = 0;
    try {
      const img = await loadImage(twin);
      w = img.naturalWidth; h = img.naturalHeight;
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0);
      src = stripAsNumbers('p256:' + pathOf(url), cv, String(url));
      cv.width = 0; cv.height = 0;
    } catch (e) { src = null; }
    if (typeof performance !== 'undefined') _stats.readMs += Math.round(performance.now() - t0);
    if (!src) {
      _stats.asOriginal++;
      return loadTextures.load(url, asset, loader);
    }
    _stats.pictures++;
    return textureOf(src, loader, String(url), w, h);
  },
  unload(texture, asset, loader) {
    if (texture && texture.source && isPaletteSource(texture.source)) { texture.destroy(true); return; }
    return loadTextures.unload(texture, asset, loader);
  },
};
extensions.add(p256LoadParser);

if (typeof window !== 'undefined') {
  window.__btP256 = () => ({ wanted: WANTED, on: p256On(), twins: Object.keys(P256_FILES).length, ..._stats });
}
