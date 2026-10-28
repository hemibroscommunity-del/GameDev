/* ═══ v2.3.3715: A PICTURE FROM A FILE, HELD ONCE ═══
 *
 * The owner, 2026-10-28: "The game needs to be extremely memory efficient."
 * docs/specs/pictures-once.md is the whole story, with the census.
 *
 * Every picture the game loads from a file goes through Pixi's asset loader
 * as an <img> (pixiRenderer.js, v2.3.778: never an ImageBitmap, which an
 * iPhone's memory purge empties), and once it is drawn it is held twice: the
 * <img>'s decoded pixels in the page (the asset cache, mp-membudget's
 * `artCache`) and its copy on the graphics chip, which is what is drawn
 * (`gpu`).  Pixi reads the <img> again only to send it to a chip again:
 *   - a renderer that has not got it (a black screen's rebuild: every one goes
 *     through createPixiApp, pixiApp.js);
 *   - after Pixi's own collector took an idle copy off the chip (renderer.gc:
 *     60 s undrawn) and it is drawn again;
 *   - an update of the source (a picture swapped in place: none of a file's).
 *
 * ONE COPY (`?onecopy`): once a picture from a file is on the chip, its page
 * copy is let go of -- the source's <img> handed back (the source keeps a
 * stand-in of its size, so nothing that measures it changes), and with it
 * Pixi's second hold (`options.resource`).  Then:
 *   - Pixi's collector taking it off the chip: it is loaded again from its
 *     file at once (the 'unload' Pixi sends; the browser's cache has the
 *     file), and holds its <img> as it did before, until drawn again;
 *   - the graphics lost (webglcontextlost): every one is loaded again at
 *     once, and a rebuilt renderer waits for them (restoreAllPictures, in
 *     createPixiApp, behind the rebuild's own wait) before it draws;
 *   - a chip asked for one with no page copy anyway (an upload in the middle
 *     of its reload): its space is made empty, it is loaded, and sent again
 *     the moment it is in (`blankUploads`: QA reads 0 on every trip).
 * A picture something reads back on the CPU keeps its copy: the readers are
 * in the census (the spec), and a reader can ask for its picture by
 * keepPageCopy(source).  A picture never drawn keeps its <img> (it has no
 * other copy).  An <img> held elsewhere stays as it is -- only the source's
 * hold goes, so a module that kept the <img> itself still draws from it.
 *
 * COLOUR NUMBERS ON THE CHIP (`?picnumbers`): picsNumbers.js.
 *
 * Off by default (the owner turns it on once it passes on their phone);
 * `?onecopy=0` or `?gpucopies` keep every copy.  QA: window.__btPicsOnce(). */
import { Cache, Texture } from 'pixi.js';

const _q = (() => { try { return typeof location !== 'undefined' ? (location.search || '') : ''; } catch (e) { return ''; } })();
const ON = /[?&]onecopy(=1|&|$)/.test(_q) && !/[?&]gpucopies\b/.test(_q);
export function picsOnceOn() { return ON && !(typeof window !== 'undefined' && window.__btTrimVerify === true); }

const SWEEP_MS = 1000;
const SWEEP_BUDGET_MS = 4;
const _stats = { bitmapsSwapped: 0, bitmapsSwappedMB: 0, bitmapsReleased: 0, released: 0, releasedMB: 0, restored: 0, restoreFailed: 0, blankUploads: 0, unloads: 0, lostRestores: 0, kept: 0, sweeps: 0 };
const _released = new Set();   /* sources whose page copy is let go of */
const _loading = new Map();    /* source -> the promise of its <img> again */

/* a picture's place in the page, of its size, where its <img> was: Pixi reads
   a resource's size (resourceWidth), nothing else, until it uploads it */
function standIn(w, h) {
  return { width: w, height: h, naturalWidth: w, naturalHeight: h, __btReleased: true };
}
export function isReleased(source) { return !!(source && source.resource && source.resource.__btReleased); }

/** A reader of `source`'s pixels on the CPU: its page copy is never let go of
 *  (and is loaded again now, should it have gone). */
export function keepPageCopy(source) {
  if (!source) return null;
  source.__btKeepPage = true;
  if (isReleased(source)) return restore(source);
  return Promise.resolve(true);
}

/* a file the browser can give again (a blob: or data: picture is made by the
   page and lives only in it) */
const FILE = /^(https?:\/\/[^?#]+|\/[^/?#][^?#]*)\.(png|webp|jpe?g|gif)([?#]|$)/i;
/* ONLY THESE let go of their page copy once drawn: the families nothing reads
   back on the CPU after they load (the census, docs/specs/pictures-once.md:
   every reader of a picture's pixels and what it reads).  The weapons, the
   body and gear sheets, the traits, the props, trees and rocks (a shadow's
   base, propGround.js), the arrows (hotArrowFx.js), the popups' icons
   (effectsRenderer _tightPopupIcon), the maps (the dashboard's and the
   minimap) and the townsfolk keep theirs.  A family is added here only after
   its readers are checked. */
const ONLY_DRAWN = /^(?:https?:\/\/[^/]+)?\/(?:sprites\/fx|sprites\/effects|ui|icons\/ui)\//i;
const isBitmap = (r) => typeof ImageBitmap !== 'undefined' && r instanceof ImageBitmap;
/* where a source's picture came from: an <img>'s own address, or (an
   ImageBitmap has none) the address Pixi's loader labelled it with */
function urlOf(src) {
  const r = src.resource;
  if (typeof HTMLImageElement !== 'undefined' && r instanceof HTMLImageElement) return r.currentSrc || r.src || '';
  return String(src.label || src._sourceOrigin || '');
}

/* only a picture from a file, as an <img> or an ImageBitmap, of the size the
   chip holds */
function releasable(src, renderer) {
  if (!src || src.destroyed || src.__btKeepPage || src._btPal) return false;
  if (src.uploadMethodId !== 'image') return false;
  const img = src.resource;
  const isImg = typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement;
  if (!isImg && !isBitmap(img)) return false;
  if (isImg && (!img.complete || !(img.naturalWidth > 0))) return false;
  if (!(img.width > 0)) return false;
  if (!FILE.test(urlOf(src)) || !ONLY_DRAWN.test(urlOf(src))) return false;
  const g = src._gpuData && src._gpuData[renderer.uid];
  if (!g || g.width !== src.pixelWidth || g.height !== src.pixelHeight) return false;
  return true;
}

/* ═══ AN IMAGEBITMAP NEVER DRAWN, AN <img> INSTEAD ═══
   pixiRenderer.js asks Pixi's loader for <img>s (v2.3.778: an iPhone's memory
   purge empties an ImageBitmap and leaves it drawing nothing), but the pictures
   a module loads as it is first read (fxStrips.js, the gathering nodes' art)
   are asked for before that line runs, and come back as ImageBitmaps: decoded,
   in the page, whether or not they are ever drawn (51 of them, 17.7 MB, at the
   census's fight).  One not on the chip is loaded again as an <img> (the
   browser's cache has its file; an <img> is decoded when it is drawn) and the
   ImageBitmap let go of.  One on the chip is let go of like any other. */
function swapBitmap(src) {
  const bm = src.resource;
  const url = urlOf(src);
  src.__btSwapping = true;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    src.__btSwapping = false;
    if (src.destroyed || src.resource !== bm || img.naturalWidth !== bm.width || img.naturalHeight !== bm.height) return;
    src.resource = img;
    try { if (src.options && src.options.resource === bm) src.options.resource = null; } catch (e) { /* frozen */ }
    /* drawn meanwhile: its copy on the chip is these pixels.  Not closed: let
       go of, so a module that kept the ImageBitmap itself still draws from it
       (and the page frees it once nothing does) */
    _stats.bitmapsSwapped++;
    _stats.bitmapsSwappedMB = +(_stats.bitmapsSwappedMB + img.naturalWidth * img.naturalHeight * 4 / 1048576).toFixed(1);
  };
  img.onerror = () => { src.__btSwapping = false; src.__btKeepPage = true; };
  img.src = url;
}

function release(src) {
  const img = src.resource;
  const bitmap = isBitmap(img);
  const st = { url: urlOf(src), cross: bitmap ? 'anonymous' : (img.crossOrigin || null), w: bitmap ? img.width : img.naturalWidth, h: bitmap ? img.height : img.naturalHeight };
  src.__btOnce = st;
  src.resource = standIn(st.w, st.h);
  try { if (src.options && src.options.resource === img) src.options.resource = null; } catch (e) { /* frozen */ }
  /* (an ImageBitmap is not closed, only let go of: swapBitmap's reason) */
  if (bitmap) _stats.bitmapsReleased++;
  if (!src.__btOnceHooked) {
    src.__btOnceHooked = true;
    /* Pixi's collector took it off the chip, or something unloaded it: its
       page copy back at once, as it was before (destroy unloads too: then
       nothing) */
    src.on('unload', () => {
      if (src.destroyed || !isReleased(src)) return;
      _stats.unloads++;
      restore(src);
    });
    src.once('destroy', () => { _released.delete(src); _loading.delete(src); });
  }
  _released.add(src);
  _stats.released++;
  _stats.releasedMB = +(_stats.releasedMB + st.w * st.h * 4 / 1048576).toFixed(1);
}

/** The page copy of `src` again, from its file: a promise of true once the
 *  source holds its <img>.  The chip's copy is the same pixels, so it is not
 *  sent again -- unless a chip was given an empty one meanwhile (`blank`). */
export function restore(src) {
  if (!isReleased(src) || src.destroyed) return Promise.resolve(!src.destroyed);
  if (_loading.has(src)) return _loading.get(src);
  const st = src.__btOnce;
  const p = new Promise((resolve) => {
    const img = new Image();
    if (st.cross) img.crossOrigin = st.cross;
    img.onload = () => {
      _loading.delete(src);
      if (src.destroyed || !isReleased(src)) { resolve(false); return; }
      if (img.naturalWidth !== st.w || img.naturalHeight !== st.h) { _stats.restoreFailed++; resolve(false); return; }
      src.resource = img;
      _released.delete(src);
      _stats.restored++;
      if (st.blank) {
        st.blank = false;
        try { src.update(); } catch (e) { /* sent the next time it is drawn */ }
      }
      resolve(true);
    };
    img.onerror = () => {
      _loading.delete(src);
      _stats.restoreFailed++;
      resolve(false);
    };
    img.src = st.url;
  });
  _loading.set(src, p);
  return p;
}

/** Every page copy back (the graphics lost; a rebuilt renderer waits on
 *  this before its first frame).  At most `ms` (a file that will not come is
 *  then sent empty and loaded behind: the blank upload's way). */
export function restoreAllPictures(ms = 8000) {
  if (!_released.size) return Promise.resolve(0);
  const list = [..._released];
  _stats.lostRestores += list.filter((s) => !_loading.has(s)).length;
  const all = list.map((s) => restore(s));
  return Promise.race([Promise.all(all).then(() => all.length), new Promise((r) => setTimeout(() => r(-1), ms))]);
}

/* ── the upload: a chip asked for a picture with no page copy ── */
let _installed = false;
export function installPicsOnceUpload(GlTextureSystem) {
  if (_installed || !ON || !GlTextureSystem || !GlTextureSystem.prototype) return;
  _installed = true;
  const P = GlTextureSystem.prototype;
  const upd = P.onSourceUpdate;
  P.onSourceUpdate = function (source) {
    if (source && isReleased(source) && source.uploadMethodId === 'image') {
      /* its space on the chip, empty, until its file is in (restore sends it) */
      _stats.blankUploads++;
      source.__btOnce.blank = true;
      const glTexture = this.getGlSource(source);
      this._gl.bindTexture(glTexture.target, glTexture.texture);
      this._boundTextures[this._activeTextureLocation] = source;
      this._initEmptyTexture2D(glTexture, source);
      glTexture.width = source.pixelWidth;
      glTexture.height = source.pixelHeight;
      restore(source);
      return;
    }
    return upd.call(this, source);
  };
}

/* ── the sweep: what is on this renderer's chip lets go of its page copy ── */
function cacheSources(each) {
  const map = Cache && (Cache._cache || Cache.cache);
  if (!map || typeof map.forEach !== 'function') return;
  map.forEach((v) => {
    if (!v) return;
    if (v instanceof Texture || v.source) { each(v.source); return; }
    if (v.textures && typeof v.textures === 'object') {
      for (const k in v.textures) { const t = v.textures[k]; if (t && t.source) each(t.source); }
    }
  });
}

let _timer = 0;
let _renderer = null;
export function sweepPicsOnce(renderer) {
  if (!picsOnceOn() || !renderer || !renderer.texture) return 0;
  try {
    const gl = renderer.gl;
    if (gl && typeof gl.isContextLost === 'function' && gl.isContextLost()) return 0;
  } catch (e) { return 0; }
  _stats.sweeps++;
  const t0 = performance.now();
  const seen = new Set();
  let n = 0;
  cacheSources((src) => {
    if (!src || seen.has(src) || performance.now() - t0 > SWEEP_BUDGET_MS) return;
    seen.add(src);
    if (src.__btKeepPage && !isReleased(src)) return;
    if (!releasable(src, renderer)) {
      if (src && !src.destroyed && !src.__btSwapping && !src.__btKeepPage && src.uploadMethodId === 'image' && isBitmap(src.resource)
        && src.resource.width > 0 && !(src._gpuData && src._gpuData[renderer.uid]) && FILE.test(urlOf(src))) swapBitmap(src);
      return;
    }
    release(src);
    n++;
  });
  return n;
}

/** The renderer the game draws with (createPixiApp): swept now and then; a
 *  lost context brings every page copy back at once. */
export function startPicsOnce(renderer, canvas) {
  if (!picsOnceOn()) return;
  _renderer = renderer;
  if (_timer) clearInterval(_timer);
  _timer = setInterval(() => {
    if (!_renderer || _renderer !== renderer) return;
    try { sweepPicsOnce(renderer); } catch (e) { /* next time */ }
  }, SWEEP_MS);
  try {
    canvas.addEventListener('webglcontextlost', () => { if (_renderer === renderer) restoreAllPictures(); });
  } catch (e) { /* the rebuild still waits on it */ }
}

export function picsOnceStats() {
  let heldMB = 0;
  for (const s of _released) if (!s.destroyed && s.__btOnce) heldMB += s.__btOnce.w * s.__btOnce.h * 4;
  return { on: picsOnceOn(), ..._stats, releasedNow: _released.size, releasedNowMB: +(heldMB / 1048576).toFixed(1), loading: _loading.size };
}

if (typeof window !== 'undefined') {
  window.__btPicsOnce = picsOnceStats;
  /* QA (mp-picsonce): one sweep now, and every page copy back */
  window.__btPicsOnceSweep = () => sweepPicsOnce(_renderer);
  window.__btPicsOnceRestoreAll = () => restoreAllPictures();
}
