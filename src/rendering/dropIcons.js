/* ═══ v2.3.3473: A DROPPED ITEM'S PICTURE ON THE GROUND ═══
 *
 * A drop (game/itemDrop.js) is drawn as the item, from its bag picture
 * (game/dropLook.js), shrunk once to ICON_PX as lootIcons.js does the rare
 * drops' icons: the bag's pictures ship at 192-256 px and draw at ~32 world
 * px, so a 64 px texture is ~16 KB on the graphics chip instead of ~256 KB.
 *
 * NOT PRELOADED, the one kind of exception CLAUDE.md's law allows: which of
 * the bag's hundred-odd items someone drops "cannot be known at load time",
 * and loading every bag picture as a texture would hold ~25 MB for a pile
 * that may never be seen.  The picture is usually already in the browser's
 * cache (the bag shows it), it is decoded off the frame (img.decode), and the
 * pile draws a stand-in mark until it is ready -- never a blank, never a
 * stall.
 *
 * MEMORY (CLAUDE.md "Memory is budgeted"): a pile holds its picture
 * (acquireDropIcon) and lets go of it when its sprites are disposed
 * (releaseDropIcon, effectsRenderer _disposeLoot).  A picture nobody holds
 * is kept for the next pile of the same thing, at most KEEP_MAX of them, the
 * longest unheld destroyed first -- never one a pile still holds.
 */
import { Texture } from 'pixi.js';

export const ICON_PX = 64;
const KEEP_MAX = 24;

/* url -> { tex, state: 'loading'|'ready'|'failed', refs, freeAt } */
const icons = new Map();

function shrink(img) {
  const cv = document.createElement('canvas');
  cv.width = ICON_PX; cv.height = ICON_PX;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  /* fitted, not stretched: a bag picture is square, but a future one may not be */
  const k = Math.min(ICON_PX / (img.naturalWidth || ICON_PX), ICON_PX / (img.naturalHeight || ICON_PX));
  const w = Math.round((img.naturalWidth || ICON_PX) * k), h = Math.round((img.naturalHeight || ICON_PX) * k);
  c.drawImage(img, Math.round((ICON_PX - w) / 2), Math.round((ICON_PX - h) / 2), w, h);
  return Texture.from(cv);
}

function load(url, e) {
  if (typeof Image === 'undefined') { e.state = 'failed'; return; }
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    const done = () => {
      if (e.state !== 'loading') return;   /* let go of while it loaded */
      try { e.tex = shrink(img); e.state = 'ready'; } catch (err) { e.state = 'failed'; }
    };
    if (typeof img.decode === 'function') img.decode().then(done, done); else done();
  };
  /* a picture that will not load leaves the stand-in mark: the pile is
     still there and still picked up */
  img.onerror = () => { if (e.state === 'loading') e.state = 'failed'; };
  img.src = url;
}

function trim() {
  if (icons.size <= KEEP_MAX) return;
  const free = [];
  for (const [url, e] of icons) if (e.refs <= 0) free.push([url, e]);
  free.sort((a, b) => a[1].freeAt - b[1].freeAt);
  for (const [url, e] of free) {
    if (icons.size <= KEEP_MAX) break;
    icons.delete(url);
    e.state = 'gone';
    if (e.tex) { try { e.tex.destroy(true); } catch (err) { /* already gone */ } e.tex = null; }
  }
}

/* A pile takes hold of its picture (once): starts its load if it is new. */
export function acquireDropIcon(url) {
  if (!url) return;
  let e = icons.get(url);
  if (!e) {
    e = { tex: null, state: 'loading', refs: 0, freeAt: 0 };
    icons.set(url, e);
    load(url, e);
  }
  e.refs++;
  trim();
}

/* ...and lets go of it when its sprites go. */
export function releaseDropIcon(url) {
  const e = url ? icons.get(url) : null;
  if (!e) return;
  e.refs = Math.max(0, e.refs - 1);
  if (e.refs === 0) e.freeAt = Date.now();
  trim();
}

/* The picture, once it is ready (null while it loads, or if it failed) */
export function dropIconTexture(url) {
  const e = url ? icons.get(url) : null;
  return e && e.state === 'ready' && e.tex && !e.tex.destroyed ? e.tex : null;
}

/* QA probe: what is held */
export function dropIconStats() {
  const out = [];
  for (const [url, e] of icons) out.push({ url, state: e.state, refs: e.refs });
  return out;
}
