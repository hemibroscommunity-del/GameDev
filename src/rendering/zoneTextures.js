/* ═══ v2.3.2272: ZONE ART HAS TO BE ABLE TO GO AWAY AGAIN ═══
 *
 * Owner: "the game slows down after playing for a while (like an accumulated
 * frame rate drop)."
 *
 * ── WHAT WAS MEASURED, BEFORE ANY OF THIS WAS WRITTEN ──
 * mp-perfdrift looked in the SCENE and found nothing: over a minute of held-
 * attack combat the node count sat flat at ~310.  mp-texdrift then asked what
 * the client still HOLDS after you walk away, sampling resident decoded
 * texture (window.__btTex) at the worldview hub between legs of a tour:
 *
 *     hub 382.5MB -> ember -> 413 -> sky -> 449.2 -> frost -> 468.8 -> verdant
 *     -> 474.4MB.  Same hub, same art on screen, +92MB.
 *
 * Monotone, and never released.  The ~6MB dip on each return is the ONE thing
 * v2.3.1405 frees, the zone map -- which is also the control that says the
 * instrument can see a release when one happens.
 *
 * ── WHY THE REST WAS NEVER FREED ──
 * Not an oversight in one place; there was nowhere to put it.  Every monster
 * sprite module keeps its strips in module-scope closures behind a memoised
 * `loadPromise`, and none of them has ever had an unload, so once a zone has
 * been visited its art is resident for the life of the page.  Decoded, that is
 * not small: measured off the PNG headers, fire-goblin is 60.5MB of RGBA
 * (1.9MB as PNG on disk -- which is why file sizes never made this look like a
 * problem), mummy 22.0, snowman 17.5, skeleton 14.2.
 *
 * ── WHY A TRACKER RATHER THAN SIX HAND-WRITTEN URL LISTS ──
 * An unload that re-derives the loader's URLs is a drift hazard: the day
 * someone adds a sheet or bumps a SPRITE_VERSION, the unload silently stops
 * matching and leaks again with no symptom.  So the URL list is not written
 * twice -- `loadTracked` IS the load call, and it records what it loaded.  A
 * sheet that is loaded is a sheet that can be freed, by construction.
 *
 * Bundles, not variant keys: thornShambler and rockmonster share one loader
 * (v2.3.4355: bogLurker and fishman did until the water frog), so freeing by key would tear the art out from
 * under a variant that is still in the zone you just walked into.
 *
 * ── THIS DOES NOT WEAKEN THE PRELOADING LAW ──
 * CLAUDE.md's law forbids LAZY loads -- art that arrives mid-play and hitches.
 * Everything freed here is re-loaded by `preloadZoneAssets`, awaited behind the
 * per-zone loading overlay, which is the ZONE-ASSET EXCEPTION the same law
 * already carves out and exactly the trade v2.3.1405 made for the map.  What
 * changes is the steady state: "the zone you are standing in" instead of
 * "everywhere you have been".
 */
import { Assets, Cache, Rectangle, Texture } from 'pixi.js';
import { packTrimmed, packTrimmedSliced } from './gearSheets.js';   /* v2.3.2870: monster strips load cropped; v2.3.4400: a few ms at a time in play */
import { holdOnceDrawn, forgetHeld, numbersOfSliced, numbersOf } from './heldNumbers.js';   /* v2.3.3699: held once drawn, as colour numbers */
import { stripAsNumbers, releaseBundleNumbers, picNumbersOn } from './picsNumbers.js';   /* v2.3.3715: ?picnumbers, colour numbers on the chip */
import { noteMade } from '../debug/madeLog.js';   /* v2.3.4400: a strip packed on the page says its name and its time */
import { readStrip, stripReadOn } from './stripRead.js';   /* v2.3.4450: a strip read from its 256-colour file's own numbers, off the page's thread */

/* bundle name -> the set of URLs loaded under it.  A Set, so a re-entered zone
   re-registering the same sheet costs one entry rather than a growing list. */
const _bundles = new Map();
/* v2.3.2870: bundle name -> the cropped canvas sources loadTrackedStrip made.
   Not Assets-owned, so Assets.unload cannot free them; unloadBundle does. */
const _crops = new Map();
/* v2.3.2870: bumped by every unload, so a strip still decoding when its zone
   is left is dropped on arrival instead of published into a freed bundle. */
const _gen = new Map();

/** Load a texture and remember which bundle it belongs to.  Drop-in for
 *  `Assets.load(url)` -- same promise, same value, same caching (Assets is
 *  still the cache; this only records the key so it can be handed back). */
export function loadTracked(bundle, url) {
  let set = _bundles.get(bundle);
  if (!set) { set = new Set(); _bundles.set(bundle, set); }
  set.add(url);
  return Assets.load(url);
}

/* ═══ v2.3.2870: MONSTER STRIPS, CROPPED ═══
 *
 * Owner: "find out how to reduce memory in ember too".  Measured (tex-attrib,
 * v2.3.2859): the fire goblin is Ember's largest cost at 35MB decoded, and
 * every monster strip is a row of 256x256 (the snowman's 128x128) cells with
 * the creature in the middle of each -- 27-40% of every cell is empty.  This
 * is the loader the armour, the stand-ins and the NPC walk strips already use
 * (gearSheets.packTrimmed): each cell cropped to its art, the crops packed into
 * one canvas, each frame a Texture whose `orig` is the whole cell and whose
 * `trim` is where the crop sits in it -- so a Sprite draws it in exactly the
 * same place, at the same size.
 *
 * Decoded through a plain Image rather than Assets.load, for the reason item
 * 11 of OPTIMIZATION-ROADMAP P7 found: Assets would keep the WHOLE strip in
 * its cache beside the crop, and the saving would be negative.  The canvas is
 * therefore not Assets-owned, so the bundle records the source and
 * unloadBundle destroys it (and the Cache entry Texture.from made for it).
 *
 * Resolves to the frames (one per cell, floor(width / fw) of them, as the
 * modules counted before) or [] for a missing file.  Frames carry `__btIx` /
 * `__btN` like every cropped frame (TRAPS §106: never recover an index from
 * frame.x / frame.width).  A strip the packer declines (art fills the cells)
 * comes back as plain slices of the uncropped image, still tracked (v2.3.4359:
 * of its colour numbers where they are on, see below). */
export function loadTrackedStrip(bundle, url, fw, fh) {
  const gen = _gen.get(bundle) || 0;
  /* ═══ v2.3.4450: FIRST, FROM THE FILE'S OWN NUMBERS, OFF THE PAGE'S THREAD ═══
     The owner: "I thought fire goblin strips were converted into 256 color
     art like everything should be."  They are, and they are held as colour
     numbers; but the way in unpacked each file to full colour, cropped and
     packed it on a canvas, and read every pixel back to find the numbers the
     file had held all along (13 to 39 ms a strip of the page's time; a few
     ms a frame since v2.3.4400).  Now the reader's worker reads the numbers
     from the file, crops and packs them there (stripRead.js, stripPack.js),
     and the page makes the texture: about a ms a strip.  A strip that cannot
     be read so (not a 256-colour PNG, no worker, numbers off on this device)
     is unpacked on the page, exactly as before (_stripByImage). */
  /* (never while QA compares a strip's numbers with its packed canvas: __btPicNumVerify, mp-picsonce -- the reader
     makes no canvas) */
  if (stripReadOn() && picNumbersOn() && !(typeof window !== 'undefined' && window.__btPicNumVerify === true)) {
    return readStrip(url, fw, fh).then((m) => {
      if ((_gen.get(bundle) || 0) !== gen) return [];   /* its zone was left while it was read */
      if (!m) return _stripByImage(bundle, url, fw, fh, gen);
      /* in play, one strip's texture a slice (the same line and clock as the strips unpacked gently) */
      if (stripFrameMs() > 0) return _inLine(async () => { await stripTurn(); return _stripOfNumbers(bundle, url, fw, fh, gen, m); });
      return _stripOfNumbers(bundle, url, fw, fh, gen, m);
    }).catch(() => []);
  }
  return _stripByImage(bundle, url, fw, fh, gen);
}
/* the strip's texture and frames from the numbers the worker read (packed, or whole when its art fills its cells) --
   or, when the bundle's rows of colours have no room for it, the page's own way */
function _stripOfNumbers(bundle, url, fw, fh, gen, m) {
  if ((_gen.get(bundle) || 0) !== gen) return [];
  const _madeT0 = performance.now();
  const numSrc = stripAsNumbers(bundle, null, url, { w: m.w, h: m.h, idx: m.idx, pal: m.pal });
  if (!numSrc) return _stripByImage(bundle, url, fw, fh, gen);
  let set = _crops.get(bundle);
  if (!set) { set = new Set(); _crops.set(bundle, set); }
  set.add(numSrc);
  const n = m.n;
  _stripStats.push({ bundle, url, fullBytes: (m.fileW || n * fw) * (m.fileH || fh) * 4, packedBytes: m.w * m.h * 4, numbers: true, read: true });
  const frames = [];
  for (let i = 0; i < n; i++) {
    let t;
    if (m.cells) {
      const c = m.cells[i];
      t = new Texture({ source: numSrc, frame: new Rectangle(c.ax, c.ay, c.w, c.h),
        orig: new Rectangle(0, 0, fw, fh), trim: new Rectangle(c.tx, c.ty, c.w, c.h) });
    } else {
      t = new Texture({ source: numSrc, frame: new Rectangle(i * fw, 0, fw, fh) });
    }
    t.__btIx = i; t.__btN = n;
    frames.push(t);
  }
  _readStats.strips++;
  const ms = performance.now() - _madeT0;
  if (ms > _readStats.longest) _readStats.longest = ms;
  noteMade('strip made', ms, 'strip made ' + url);
  return frames;
}
const _readStats = { strips: 0, longest: 0 };
/* QA (mp-stripgentle, strip-door's phone half): ONE strip both ways, in this browser -- cropped and packed on a
   canvas and read back (the page's way), and read from its file's own numbers on the worker -- and how they differ:
   the size, the cells, and pixel by pixel (see-through or not; a solid pixel's colour; a partly see-through
   pixel's colour as it is drawn, premultiplied).  Nothing is kept. */
if (typeof window !== 'undefined') {
  window.__btStripCompare = async (url, fw, fh) => {
    const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
    const W = img.naturalWidth || img.width;
    const n = Math.max(1, Math.floor(W / fw));
    const packed = packTrimmed(img, fw, fh, n);
    let a = null;
    if (packed) { a = numbersOf(packed.canvas); if (a) a.cells = packed.cells; packed.canvas.width = 0; packed.canvas.height = 0; }
    else {
      const whole = document.createElement('canvas');
      whole.width = n * fw; whole.height = fh;
      const wctx = whole.getContext('2d', { willReadFrequently: true });
      wctx.imageSmoothingEnabled = false;
      wctx.drawImage(img, 0, 0);
      a = numbersOf(whole);
      if (a) a.cells = null;
      whole.width = 0; whole.height = 0;
    }
    const b = await readStrip(url, fw, fh);
    if (!a || !b) return { ok: false, page: !!a, read: !!b };
    const cellsOf = (c) => (c ? c.map((x) => [x.ax, x.ay, x.tx, x.ty, x.w, x.h, x.blank ? 1 : 0].join(',')).join(';') : 'whole');
    const out = { ok: true, w: [a.w, b.w], h: [a.h, b.h], sameSize: a.w === b.w && a.h === b.h, sameCells: cellsOf(a.cells) === cellsOf(b.cells),
      colours: [a.pal.length, b.pal.length], px: a.w * a.h, alphaDiffers: 0, solidDiffers: 0, partly: 0, partlyDrawnMax: 0 };
    if (!out.sameSize) return out;
    const pm = (c, sh) => Math.round(((c >>> sh) & 255) * (c >>> 24) / 255);
    for (let i = 0; i < out.px; i++) {
      const ca = a.pal[a.idx[i]], cb = b.pal[b.idx[i]];
      if (ca === cb) continue;
      const aa = ca >>> 24, ab = cb >>> 24;
      if (aa !== ab) { out.alphaDiffers++; continue; }
      if (aa === 255) { out.solidDiffers++; continue; }
      out.partly++;
      const d = Math.max(Math.abs(pm(ca, 0) - pm(cb, 0)), Math.abs(pm(ca, 8) - pm(cb, 8)), Math.abs(pm(ca, 16) - pm(cb, 16)));
      if (d > out.partlyDrawnMax) out.partlyDrawnMax = d;
    }
    return out;
  };
}
function _stripByImage(bundle, url, fw, fh, gen) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im); im.onerror = rej; im.src = url;
  }).then((img) => {
    if ((_gen.get(bundle) || 0) !== gen) return [];   /* its zone was left while it decoded */
    /* v2.3.4400: in play, a few ms a frame and one strip at a time (below);
       behind a loading screen, all at once, as ever */
    if (stripFrameMs() > 0) return _inLine(() => _stripGently(bundle, url, fw, fh, gen, img));
    const _madeT0 = performance.now();   /* v2.3.4400: how long this strip's packing holds the page (debug/madeLog.js) */
    const W = img.naturalWidth || img.width;
    const n = Math.max(1, Math.floor(W / fw));
    const packed = packTrimmed(img, fw, fh, n);
    const frames = _stripFrames(bundle, url, fw, fh, img, n, packed, undefined);
    noteMade('strip ' + _stripName(url), performance.now() - _madeT0, 'strip ' + url);
    return frames;
  }).catch(() => []);
}

/* ═══ v2.3.4400: A LOOK THAT LOADS AS YOU WALK IS UNPACKED BETWEEN FRAMES ═══
   The owner's iPhone: "It noticeably slowed when I rode by the blacksmith
   hammering."  The Blacksmith stands on the Flame Fields' side of the town,
   where the fire goblin's look starts to load as you come (wheelMonsterArt.js)
   -- fourteen strips, each packed and read into its colour numbers on the
   page in one go as its file arrived: 13 to 39 ms a strip on the test box,
   300 ms of the page held inside a second (mp-stripgentle).
   So IN PLAY (BroTown.jsx tells this module the frame's length; 0 behind any
   loading screen) a strip is unpacked a cell and a band of rows at a time
   (gearSheets.js packTrimmedSliced, heldNumbers.js numbersOfSliced), ONE
   strip at a time, a slice a frame: a quarter of the frame's length, never
   under SLICE_MIN_MS (a 60-a-second phone: 4 ms a frame; this box, whose
   frames are 200 ms: a strip a turn, as before).  The pixels, the cells and
   the numbers are the same to the byte.  Behind a loading screen nothing
   waits: a zone's art loads flat out, as it always did.
   `?stripgentle=0`: the old way for one tab.  `?stripslice=4`: a fixed slice
   in ms (QA, to play a phone's on a slow box). */
const SLICE_MIN_MS = 3, SLICE_MAX_MS = 50, SLICE_SHARE = 0.25, SLICE_WAIT_MS = 120;
const _search = (() => { try { return window.location.search || ''; } catch (e) { return ''; } })();
const _gentleOff = /(^|[?&])stripgentle=(0|off|false)(&|$)/.test(_search);
const _sliceFixed = (() => { const m = /(^|[?&])stripslice=(\d+)(&|$)/.exec(_search); return m ? Math.max(1, +m[2]) : 0; })();
let _play = null;
/** BroTown.jsx: `fn()` is the frame's length in ms while the world is in
 *  play, 0 behind a loading screen (or the tab hidden). */
export function setStripPlay(fn) { _play = typeof fn === 'function' ? fn : null; }
function stripFrameMs() {
  if (_gentleOff || !_play) return 0;
  try { const v = +_play(); return v > 0 ? v : 0; } catch (e) { return 0; }
}
const _stripName = (url) => String(url).replace(/^.*\//, '').replace(/[?#].*$/, '').slice(0, 28);
/* one strip at a time, and one clock for the slice across them */
let _line = Promise.resolve(), _waiting = 0, _sliceT0 = 0;
const _slices = { strips: 0, slices: 0, longest: 0 };
function _inLine(job) {
  if (_waiting++ === 0) _sliceT0 = performance.now();
  const p = _line.then(job, job);
  _line = p.then(() => { _waiting--; }, () => { _waiting--; });
  return p;
}
const _afterFrame = () => new Promise((res) => {
  let done = false;
  const go = () => { if (!done) { done = true; res(); } };
  /* after the next frame has been drawn (a task behind its callbacks); or SLICE_WAIT_MS, with no frame coming */
  try { requestAnimationFrame(() => setTimeout(go, 0)); } catch (e) { /* the timer below */ }
  setTimeout(go, SLICE_WAIT_MS);
});
/* asked between two small pieces of work: this slice's ms spent -> the next frame first */
async function stripTurn() {
  const frameMs = stripFrameMs();
  if (!frameMs) return;                       /* a loading screen came up: no more waiting */
  const budget = _sliceFixed || Math.max(SLICE_MIN_MS, Math.min(SLICE_MAX_MS, frameMs * SLICE_SHARE));
  const spent = performance.now() - _sliceT0;
  if (spent < budget) return;
  _slices.slices++;
  if (spent > _slices.longest) _slices.longest = spent;
  noteMade('strip slice', spent);
  await _afterFrame();
  _sliceT0 = performance.now();
}
async function _stripGently(bundle, url, fw, fh, gen, img) {
  /* the file unpacked off the page's thread where the browser can (else the first draw unpacks it, in one go) */
  try { if (typeof img.decode === 'function') await img.decode(); } catch (e) { /* drawn as it is */ }
  /* (the page was free while the browser unpacked the file: this slice's ms start now) */
  _sliceT0 = performance.now();
  const W = img.naturalWidth || img.width;
  const n = Math.max(1, Math.floor(W / fw));
  const packed = await packTrimmedSliced(img, fw, fh, n, stripTurn);
  let read;
  if (packed && picNumbersOn()) read = (await numbersOfSliced(packed.canvas, stripTurn)) || false;
  let whole = null;
  if (!packed && picNumbersOn()) {
    /* a strip the packer leaves whole (v2.3.4359, below): drawn here, read in bands */
    try {
      whole = document.createElement('canvas');
      whole.width = n * fw; whole.height = fh;
      const wctx = whole.getContext('2d', { willReadFrequently: true });
      wctx.imageSmoothingEnabled = false;
      wctx.drawImage(img, 0, 0);
      await stripTurn();
      read = (await numbersOfSliced(whole, stripTurn)) || false;
    } catch (e) { read = false; }
  }
  /* (the last step is one piece of work -- the numbers put on the bundle's row of colours, the texture made -- so it
     starts a slice of its own) */
  await stripTurn();
  /* its zone was left while it was unpacked: nothing is kept (from here to the end nothing waits, so a bundle let go
     now is let go of this strip too) */
  if ((_gen.get(bundle) || 0) !== gen) {
    try { if (packed) { packed.canvas.width = 0; packed.canvas.height = 0; } if (whole) { whole.width = 0; whole.height = 0; } } catch (e) { /* gone */ }
    return [];
  }
  _slices.strips++;
  return _stripFrames(bundle, url, fw, fh, img, n, packed, read, whole);
}
if (typeof window !== 'undefined') window.__btStripSlices = () => ({ ..._slices, on: !_gentleOff, fixed: _sliceFixed, frameMs: stripFrameMs(), read: { ..._readStats } });

/* the strip's texture and frames from its packed canvas (or the image whole): `read` its colour numbers when they
   were read already (gently: the packed canvas's, or the whole canvas `whole`'s; false: more than 256 colours) */
function _stripFrames(bundle, url, fw, fh, img, n, packed, read, wholeCv) {
    const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    /* v2.3.3715: ?picnumbers -- the packed strip read into its colour numbers
       now and uploaded as them, its canvas let go of (picsNumbers.js); a strip
       that cannot be is the canvas, as before */
    const packedBytes = packed ? packed.canvas.width * packed.canvas.height * 4 : W * H * 4;
    let numSrc = packed ? stripAsNumbers(bundle, packed.canvas, url, read) : null;
    /* v2.3.4359: ...AND A STRIP THE PACKER LEAVES WHOLE.  The owner, of the
       new monsters: "you're converting the pictures into the 256 color
       framework right?  That should be happening as part of the process."
       It was not for every strip: the packer declines one whose art fills its
       cells (the water frog's death, 20 cells of a burst that reaches every
       edge: 5.2 MB), and a declined strip went up as its image, four bytes a
       pixel, whatever its colours.  Cropping saves such a strip nothing, but
       colour numbers still save three quarters, so it is drawn whole on a
       canvas and read into its numbers the same way (stripAsNumbers empties
       the canvas; on a refusal it is emptied here and the image goes up, as
       before).  Its frames are the plain slices below, on the numbers. */
    if (!packed && picNumbersOn()) {
      let whole = wholeCv || null;
      try {
        if (!whole) {
          whole = document.createElement('canvas');
          whole.width = n * fw; whole.height = fh;
          const wctx = whole.getContext('2d', { willReadFrequently: true });
          wctx.imageSmoothingEnabled = false;
          wctx.drawImage(img, 0, 0);
        }
        numSrc = stripAsNumbers(bundle, whole, url, wholeCv ? read : undefined);
      } catch (e) { numSrc = null; }
      if (!numSrc && whole) { try { whole.width = 0; whole.height = 0; } catch (e) { /* gone */ } }
    }
    const src = numSrc || Texture.from(packed ? packed.canvas : img).source;
    /* v2.3.3699: once drawn, the packed canvas is read into its colour numbers
       and emptied -- the picture stays on the graphics chip (heldNumbers.js) */
    if (packed && !numSrc) holdOnceDrawn(src);
    let set = _crops.get(bundle);
    if (!set) { set = new Set(); _crops.set(bundle, set); }
    set.add(src);
    _stripStats.push({ bundle, url, fullBytes: W * H * 4,
      packedBytes, numbers: !!numSrc });
    const frames = [];
    for (let i = 0; i < n; i++) {
      let t;
      if (packed) {
        const c = packed.cells[i];
        t = new Texture({ source: src, frame: new Rectangle(c.ax, c.ay, c.w, c.h),
          orig: new Rectangle(0, 0, fw, fh), trim: new Rectangle(c.tx, c.ty, c.w, c.h) });
      } else {
        t = new Texture({ source: src, frame: new Rectangle(i * fw, 0, fw, fh) });
      }
      t.__btIx = i; t.__btN = n;
      frames.push(t);
    }
    if (_verify) _verify.set(url, { frames, fw, fh });
    return frames;
}
const _stripStats = [];
/* QA only: mp-monstertrim sets __btTrimVerify before load and compares every
   cropped frame against the served file. */
const _verify = (typeof window !== 'undefined' && window.__btTrimVerify) ? new Map() : null;
if (typeof window !== 'undefined') {
  window.__btStripTrim = () => _stripStats.slice();
  window.__btStripTrimFrames = () => (_verify ? [..._verify.entries()].map(([url, v]) => ({ url, ...v })) : null);
}

function _releaseCrops(bundle) {
  const set = _crops.get(bundle);
  if (!set) return 0;
  _crops.delete(bundle);
  let n = 0;
  for (const src of set) {
    const res = src.resource;
    if (!src._btPicNum) forgetHeld(src);   /* v2.3.3699 (v2.3.3715: a strip of colour numbers was never held) */
    try { if (!src.destroyed) src.destroy(); n++; } catch (e) { /* gone */ }
    /* Texture.from parked a Texture under the canvas (or image) in Cache; it
       only leaves when THAT texture is destroyed, which nothing holds. */
    try { if (res && Cache.has(res)) Cache.remove(res); } catch (e) { /* older pixi */ }
    try { if (res && res.getContext) { res.width = 0; res.height = 0; } } catch (e) { /* not a canvas */ }
  }
  return n;
}

/** Release every URL a bundle loaded.  Resolves to how many were released, so
 *  a caller (and mp-texdrift) can tell "freed nothing" from "was never loaded".
 *  Each unload is guarded on its own: one URL that is still referenced must not
 *  abandon the rest of the bundle. */
export async function unloadBundle(bundle) {
  _gen.set(bundle, (_gen.get(bundle) || 0) + 1);   /* v2.3.2870: strips in flight are dropped on arrival */
  let n = _releaseCrops(bundle);                    /* v2.3.2870: the cropped strips */
  releaseBundleNumbers(bundle);                     /* v2.3.3715: their rows of colours (?picnumbers) */
  const set = _bundles.get(bundle);
  if (!set || set.size === 0) return n;
  _bundles.delete(bundle);
  for (const url of set) {
    try { await Assets.unload(url); n++; } catch (e) { /* still in use / already gone */ }
  }
  return n;
}

/** Whether a bundle currently holds anything -- used by the zone-exit sweep to
 *  skip work rather than to decide correctness. */
export function bundleLoaded(bundle) {
  const set = _bundles.get(bundle);
  const crops = _crops.get(bundle);
  return !!((set && set.size) || (crops && crops.size));
}

/* Dev probe, house style: which bundles are resident and how many URLs each
   holds.  mp-texdrift reads this to say WHICH art a climb is made of, which a
   total in megabytes cannot. */
if (typeof window !== 'undefined') {
  window.__btBundles = function () {
    const out = {};
    _bundles.forEach((set, k) => { out[k] = set.size; });
    _crops.forEach((set, k) => { out[k] = (out[k] || 0) + set.size; });   /* v2.3.2870 */
    return out;
  };
}
