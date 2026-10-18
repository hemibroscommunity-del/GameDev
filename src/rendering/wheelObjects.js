/* ═══ v2.3.2975: THE WHEEL'S OBJECTS — buildings, trees, rocks and props ═══
 *
 * Owner, 2026-10-02, with a zip of every object but the Town Hall: "Wire
 * this stuff into the game."
 *
 * Where each object stands is worked out once by the ground worker
 * (public/tools/world/core/placing.js, posted with its 'ready'); this draws
 * the ones near you, from the Object Studio's sprite sheets in
 * public/world/objects/ (a few objects a page, each page a palette PNG --
 * tools/world/repack-objects.mjs), and tells the walk test where their
 * footprints are.  The `?trial=wheel` twin of the town's props
 * (data/worldProps.js), streamed the way the Wheel's ground is
 * (wheelGround.js):
 *
 *   PAGES     a sprite sheet is loaded when one of its objects stands within
 *             LOAD_MARGIN game px of the view -- further on the side you are
 *             heading -- and let go DROP_MS after none is within DROP_MARGIN.
 *             The way in waits for the pages round the arrival
 *             (wheelObjectsWarm, behind the zone overlay), so the town is
 *             there when the overlay lifts; past that they load as you walk,
 *             like the ground's pieces (docs/WORLD-MAP-PIPELINE.md: the
 *             Wheel's streaming rule -- what a seamless world has in place of
 *             one zone's loading screen).  Leaving the Wheel frees them all
 *             (the ZONE-ASSET rule in CLAUDE.md).
 *   SPRITES   one for each object whose picture can reach the screen, made
 *             as it comes near and destroyed as it goes (never its texture:
 *             that is the page's); anchored at the foot (the middle of its
 *             bottom row, or a palm's trunk: v2.3.2981), in
 *             `entities`, so the depth pass sorts them by where they touch the
 *             ground like every other prop (depthSort.js) -- walk north of a
 *             building and its roof hides you.
 *   FOOTPRINTS the ground each drawn object stops you on (placing.js
 *             footprintOf), the ones within BLOCK_R of the player, handed to
 *             the walk test through worldProps.zoneBlockers -- what you can
 *             see is what stops you, and a page still loading stops nobody.
 */
/* v2.3.2995: AND THEY TAKE HITS.  An object shakes when a shot or a blade
 * lands on it (a tree sways), breaks into shards of its own picture after
 * enough of them (wheelShatter.js) -- its footprint gone from the walk test
 * while it is broken -- and fades back in, mended, a few minutes later
 * (src/game/wheelBreak.js keeps the count and the clock).  What a hit throws
 * is cut from the picture where it landed (wheelPropArt, for hitMaterialFx),
 * a bolt's burn mark is the picture's own pixels scorched (wheelScorch), and
 * the arrows and marks left in an object are drawn where it stands
 * (wheelPropRec, for effectsRenderer's prop marks).
 */
import { Sprite, Assets, Container, Texture, Rectangle, CanvasSource, Spritesheet } from 'pixi.js';
import { wheelInfo, wheelObjectStats, wheelOnStop, wheelLifeOn } from '../game/wheelTrial.js';
import { BuildingLife, hasLife, wheelLifeWarm, wheelLifeFree, wheelLifeReady } from './wheelLife.js';
import { setZoneBlockerHook } from '../data/worldProps.js';
import { freeWheelNpcArt } from './npcSprites.js';
import { tickWheelBreak, drainWheelEvents, isWheelBroken, resetWheelBreak, onWheelBreak, wheelObjectKind, isBuilding } from '../game/wheelBreak.js';
import { WheelShatter, framePx } from './wheelShatter.js';
import { BuildingFires, buildingFireOn } from './buildingFire.js';   /* v2.3.3230: a building you keep hitting catches fire */
import { materialInfo, wheelMaterialOf } from '../data/wheelMaterials.js';
import { playerGroundDy } from './systems/entityRenderer.js';   /* v2.3.2999: where your boots are, for a tree you stand behind */
import { releaseShadowTextures } from './lightfx/shadows.js';   /* v2.3.3000: a freed sheet leaves no shadow behind */
import { WHEEL_SUN } from './lightfx/zoneLight.js';             /* v2.3.3000: how far a shadow reaches */
import { SHADE } from './formShade.js';                         /* v2.3.3000: shaded toward the ground, as the old props */
import { readArtBottoms } from './propGround.js';               /* v2.3.3028: where each column of a picture meets the ground */
import { drawSourceRect } from './paletteDraw.js';              /* v2.3.3190: a page kept as colour numbers, read on the CPU */
import { paletteOn, makePaletteSource, paletteStats } from './paletteTex.js';   /* v2.3.3190: ...and drawn so */

const BASE = '/world/objects/';
const CACHE_PREFIX = 'wheel-object/';
const BUCKET = 512;          /* game px a side, the index's cells */
const LOAD_MARGIN = 480;     /* game px past the view: a page loads when one of its objects stands this near */
const DROP_MARGIN = 1000;    /* ...and is let go once none is within this, */
const DROP_MS = 4000;        /* ...for this long */
const AHEAD_MS = 1200, AHEAD_MAX = 900;   /* and further on the side you are heading */
const DRAW_MARGIN = 48;      /* game px past the view a picture is drawn from */
const MAX_LOADING = 2;
const BLOCK_R = 640;         /* footprints within this of the player go to the walk test */
const BLOCK_MOVE = 96;       /* ...made again when the player has moved this far */
const PAGE_WAIT_MS = 9000;   /* the way in waits at most this long for its pages */
const FADE_IN_MS = 1600;     /* v2.3.2995: a mended object fading back in */
/* ═══ v2.3.2999: A TREE YOU ARE BEHIND GOES SEE-THROUGH ═══
   Placing v2's woods are thick (placing.js PLACING v2), and in one the bro
   vanished under the canopy -- mp-placing2's jungle picture.  So a tree
   (anything with a crown, wheelMaterials.js `canopy`) whose crown covers
   you while you stand behind its foot eases to SEE_ALPHA, and back when you
   step out: Stardew's rule.  Buildings stay solid (the roof drawn over you
   is the owner's, v2.3.2975).  With placing v2 (`?placing=2`) or `?fade`;
   `?nofade` never. */
const SEE_ALPHA = 0.42, SEE_MS = 110;
const CANOPY_FADE = (() => {
  try {
    const q = window.location.search || '';
    return /(^|[?&])(placing=2|fade)(=|&|$)/.test(q) && !/(^|[?&])nofade(=|&|$)/.test(q);
  } catch (e) { return false; }
})();

/* The numbers for the trial's readout and the QA scenario live in
   wheelTrial.js (wheelObjectStats), which the readout can read without pixi. */
export { wheelObjectStats };

/* ── the index: what stands where, built once per worker answer ── */
let _idx = null;
function index() {
  const info = wheelInfo();
  const o = info && info.objects;
  if (!o || !o.n || !o.manifest) { _idx = null; return null; }
  if (_idx && _idx.src === o) return _idx;
  const man = o.manifest;
  const pageNames = man.atlases.map((a) => a.name);
  const pageOf = Object.create(null);
  man.atlases.forEach((a, k) => { pageOf[a.name] = k; });
  const byId = Object.create(null);
  for (const m of man.objects) byId[m.id] = m;
  /* per kind and piece: page, frame, size */
  const kinds = o.kinds.map((id, kk) => {
    const m = byId[id];
    if (!m || !m.pieces || !m.pieces.length) return null;
    /* v2.3.2982: how many times its picture's size it is drawn -- the
       big-town preview's buildings bigger (placing.js kindScale), else 1 */
    const ks = (o.kindScale && o.kindScale[kk]) || 1;
    /* v2.3.2981: `ax`, where it stands across its picture (its foot, a share
       of its width): the middle for most, the trunk for a leaning palm,
       whose trunk is far off its picture's middle (objects/atlas.js
       standPiece) -- so its trunk is drawn where it was placed, on its
       footprint, and a mirrored one turns on its trunk */
    return m.pieces.map((pc) => ({ page: pageOf[pc.atlas] != null ? pageOf[pc.atlas] : -1, frame: pc.frame, w: pc.gameW * ks, h: pc.gameH * ks, ks,
      ax: pc.foot && pc.w > 0 ? Math.min(1, Math.max(0, pc.foot[0] / pc.w)) : 0.5 }));
  });
  const n = o.n, worldW = o.worldW, worldH = o.worldH;
  const cols = Math.ceil(worldW / BUCKET), rows = Math.ceil(worldH / BUCKET);
  /* ═══ v2.3.3315: WHAT EACH OBJECT IS DRAWN AS, KEPT ONCE A PIECE ═══
     Its page, frame, size, anchor, reach and scale depend only on its kind
     and piece, so they are kept once for each piece -- `page`, `w`, `h`,
     `ax`, `reach`, `scl` and `frame`, read at the piece's number -- and an
     object keeps only that number (`pk`, 0: none, so no page).  They were
     kept for every object, 22 bytes each and a slot of `frame`: ~1.4 MB on
     the page for the Wheel five times longer's 63,486 (mp-membudget's
     buffers line).  Read as ix.w[ix.pk[i]]. */
  const PK = [null];
  const pkOf = kinds.map((ks) => (ks ? ks.map((pc) => { if (pc.page < 0) return 0; PK.push(pc); return PK.length - 1; }) : null));
  const np = PK.length;
  const page = new Int16Array(np).fill(-1), w = new Float32Array(np), h = new Float32Array(np);
  /* the anchor across each picture, and how far it reaches either side of
     its foot (half its width, more for a palm stood on its trunk) */
  const ax = new Float32Array(np), reach = new Float32Array(np), scl = new Float32Array(np);
  const frame = new Array(np).fill(null);
  for (let p = 1; p < np; p++) {
    const pc = PK[p];
    page[p] = pc.page; w[p] = pc.w; h[p] = pc.h; frame[p] = pc.frame;
    ax[p] = pc.ax; reach[p] = Math.max(pc.ax, 1 - pc.ax) * pc.w; scl[p] = pc.ks;
  }
  if (np > 65535) throw new Error('wheelObjects: more pieces than a Uint16Array holds');
  const pk = new Uint16Array(n);
  /* (and the index's numbers in 16 bits while every object's number fits) */
  const Ix = n < 65536 ? Uint16Array : Uint32Array;
  const count = new Ix(cols * rows + 1);
  let maxH = 0, maxHalfW = 0, placed = 0;
  for (let i = 0; i < n; i++) {
    const ks = kinds[o.kind[i]];
    if (!ks || !o.present[o.kind[i]]) continue;
    const p = pkOf[o.kind[i]][o.piece[i] % ks.length];
    if (!p) continue;
    pk[i] = p;
    if (h[p] > maxH) maxH = h[p];
    if (reach[p] > maxHalfW) maxHalfW = reach[p];
    placed++;
    count[cellOf(o.x[i], o.y[i], cols, rows) + 1]++;
  }
  for (let c = 1; c < count.length; c++) count[c] += count[c - 1];
  const fill = count.slice(0, cols * rows);
  const items = new Ix(placed);
  for (let i = 0; i < n; i++) if (pk[i]) items[fill[cellOf(o.x[i], o.y[i], cols, rows)]++] = i;
  const pageMB = man.atlases.map((a) => (a.w * a.h * 4) / 1048576);
  /* v2.3.3190: which pages are palette PNGs (all of them: the manifest says) */
  const palette = man.atlases.map((a) => a.palette !== false);
  wheelObjectStats.placed = placed;
  wheelObjectStats.pagesOf = pageNames.length;
  wheelObjectStats.placeMs = o.placeMs != null ? o.placeMs : null;
  /* v2.3.2999: which placing made them (placing.js PLACING, or PLACING_V2
     with `?placing=2`) */
  wheelObjectStats.version = o.version || null;
  _idx = { src: o, o, n, cols, rows, start: count, items, pk, page, w, h, ax, reach, scl, frame, maxH, maxHalfW, pageNames, pageMB, palette,
    sheets: man.atlases.map((a) => BASE + a.sheet) };
  return _idx;
}
function cellOf(x, y, cols, rows) {
  const c = Math.max(0, Math.min(cols - 1, Math.floor(x / BUCKET))), r = Math.max(0, Math.min(rows - 1, Math.floor(y / BUCKET)));
  return r * cols + c;
}
/* every object whose foot is in the rectangle (game px) */
function each(ix, x0, y0, x1, y1, fn) {
  const c0 = Math.max(0, Math.floor(x0 / BUCKET)), c1 = Math.min(ix.cols - 1, Math.floor(x1 / BUCKET));
  const r0 = Math.max(0, Math.floor(y0 / BUCKET)), r1 = Math.min(ix.rows - 1, Math.floor(y1 / BUCKET));
  const ox = ix.o.x, oy = ix.o.y;
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const k = r * ix.cols + c;
    for (let q = ix.start[k], e = ix.start[k + 1]; q < e; q++) {
      const i = ix.items[q], x = ox[i], y = oy[i];
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) fn(i);
    }
  }
}

/* ═══ v2.3.3190: A PAGE KEPT AS ITS COLOUR NUMBERS ═══
   Every page is a palette PNG -- one byte a pixel, its colours listed once
   (tools/world/repack-objects.mjs) -- that a browser loading it as a picture
   unpacks to four bytes a pixel, twice: in the page (the asset cache) and on
   the graphics chip.  Where the game draws pictures as colour numbers
   (rendering/paletteTex.js), the page is fetched and read as the numbers
   themselves (png8Worker.js, png8Decode.js), and kept so on the chip -- one
   byte a pixel there, and the same one byte in the page for what reads a
   picture on the CPU at its own size (a hit's chips, a burn mark, a shatter:
   paletteDraw.js; a shadow's base is read as the page loads, below).  Its
   colours are premultiplied, as Pixi premultiplies a
   picture it uploads, and its frames are Pixi's own Spritesheet's, from the
   same sheet, at the same size (meta.scale 2).  Anything that is not a
   palette PNG, or does not read, is loaded as a picture, as before. */
/* the sheets are read on a core of their own (png8Worker.js): unpacked on a
   busy main thread, a sheet took 17-35 s to come in */
let _pw = null, _pwSeq = 0;
const _pwWait = new Map();
function pngWorker() {
  if (_pw) return _pw;
  if (typeof Worker === 'undefined') return null;
  try { _pw = new Worker(new URL('./png8Worker.js', import.meta.url), { type: 'module' }); } catch (e) { _pw = null; return null; }
  _pw.onmessage = (ev) => {
    const m = ev.data || {};
    const done = _pwWait.get(m.id);
    if (!done) return;
    _pwWait.delete(m.id);
    done(m);
  };
  _pw.onerror = () => { stopPngWorker(); };
  return _pw;
}
/* leaving the Wheel (and a black screen's rebuild): the worker goes, and
   whatever it was reading is let go (the pages are dropped anyway) */
function stopPngWorker() {
  if (_pw) { try { _pw.terminate(); } catch (e) { /* gone */ } _pw = null; }
  for (const done of _pwWait.values()) done({ ok: false, error: 'stopped' });
  _pwWait.clear();
}
function readSheet(url) {
  const w = pngWorker();
  if (!w) return Promise.resolve(null);
  const id = ++_pwSeq;
  return new Promise((resolve) => {
    _pwWait.set(id, resolve);
    try { w.postMessage({ id, url }); } catch (e) { _pwWait.delete(id); resolve(null); }
  });
}
async function loadPalettePage(url) {
  const m = await readSheet(url);
  if (!m || !m.ok) return null;
  const rgba = new Uint8Array(1024);
  for (let c = 0; c < m.n; c++) {
    const a = m.alpha[c];
    rgba[c * 4] = Math.round(m.rgb[c * 3] * a / 255);
    rgba[c * 4 + 1] = Math.round(m.rgb[c * 3 + 1] * a / 255);
    rgba[c * 4 + 2] = Math.round(m.rgb[c * 3 + 2] * a / 255);
    rgba[c * 4 + 3] = a;
  }
  let label = m.image;
  try { const u = new URL(m.image); label = u.pathname + u.search; } catch (e) { /* as it came */ }
  /* (a picture from a file is collected off the chip when idle, and comes
     back from its numbers, which this keeps) */
  const src = makePaletteSource({ idx: m.idx, w: m.w, h: m.h, stride: m.stride, rgba,
    alphaMode: 'premultiplied-alpha', label, autoGarbageCollect: true });
  if (!src) return null;
  const sheet = new Spritesheet({ texture: new Texture({ source: src }), data: m.data, cachePrefix: CACHE_PREFIX });
  sheet.parseSync();
  await readPageBottoms(sheet, m.bytes);
  return sheet;
}

/* ═══ EACH FRAME'S BASE, READ OFF THE PICTURE AS IT ALWAYS WAS ═══
   A low thing casts column by column from where each column of its picture
   meets the ground (wheelObjectCasters, v2.3.3028), read by scaling the frame
   down onto a 128-column canvas (propGround.readArtBottoms).  A browser
   scales an <img> and a canvas of the same pixels differently (measured in
   Chromium: 25 of a fence sheet's 640 columns, and 98 of the Verdant Wilds'
   first sheet's, came out on another row), so the colour numbers cannot be
   read that way and give the same shadows.  So the page's picture is decoded
   ONCE, as it loads, as the <img> it always was, every frame's base read off
   it exactly as before (the same call), and the picture let go of --
   where the old way kept it for as long as the page was loaded.  Measured:
   all 183 frames of the 41 sheets read the same as from the old way's own
   picture.  (A picture that will not decode leaves its frames to
   readArtBottoms on the numbers, a near match.) */
async function readPageBottoms(sheet, bytes) {
  if (typeof Image === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return;
  let url = null;
  const img = new Image();
  try {
    url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
    img.src = url;
    await img.decode();
    const res = sheet.textureSource.resolution || 1;
    const pic = { source: { resource: img, pixelWidth: img.naturalWidth, width: img.naturalWidth / res } };
    for (const t of Object.values(sheet.textures)) {
      pic.frame = t.frame;
      _bottoms.set(t, readArtBottoms(pic) || null);
    }
  } catch (e) { /* the numbers, then (above) */ }
  try { img.src = ''; } catch (e) { /* gone */ }
  if (url) { try { URL.revokeObjectURL(url); } catch (e) { /* gone */ } }
}

/* ── the pages ── */
const _pages = new Map();     /* page index -> { state: 'loading'|'ready'|'failed', sheet, wanted, p, palette } */
let _loading = 0;
function loadPage(ix, k) {
  let rec = _pages.get(k);
  if (rec) return rec.p;
  rec = { state: 'loading', sheet: null, wanted: performance.now(), p: null, gen: _gen, palette: false, picture: false, t0: performance.now() };
  _pages.set(k, rec);
  _loading++;
  const url = ix.sheets[k];
  /* a prefix of their own for the frames Pixi files in its cache: bare, a
     frame called 'stone-1' or 'barrel-2' would take (and, unloaded, take
     away) any other sheet's frame of that name */
  const asPicture = () => { rec.picture = true; return Assets.load({ src: url, data: { cachePrefix: CACHE_PREFIX } }); };
  /* v2.3.3190: as colour numbers where the game draws them so (above) */
  const st = paletteStats();
  const load = paletteOn() && ix.palette[k]
    ? loadPalettePage(url).catch(() => null).then((sheet) => {
      if (sheet) { rec.palette = true; st.pages++; return sheet; }
      /* (let go while it was read -- the Wheel left, a rebuild: nothing to load) */
      if (_pages.get(k) !== rec || rec.gen !== _gen) return null;
      st.pagesRgba++;
      return asPicture();
    })
    : asPicture();
  rec.p = load.then((sheet) => {
    _loading--;
    notePageLoad(ix.pageNames[k], rec, !!sheet);
    /* let go while it was loading (the Wheel left behind): drop it again */
    if (_pages.get(k) !== rec || rec.gen !== _gen) { freeSheet(url, rec, sheet); return null; }
    rec.state = 'ready';
    rec.sheet = sheet;
    wheelObjectStats.loads++;
    return sheet;
  }, () => {
    _loading--;
    notePageLoad(ix.pageNames[k], rec, false);
    if (_pages.get(k) === rec) { rec.state = 'failed'; wheelObjectStats.failed++; }
    return null;
  });
  return rec.p;
}
/* v2.3.3190: QA -- the last pages loaded, how they came and how long they took */
const _pageLog = [];
function notePageLoad(name, rec, ok) {
  _pageLog.push({ name, ok, palette: !!rec.palette, ms: Math.round(performance.now() - rec.t0), gen: rec.gen });
  if (_pageLog.length > 24) _pageLog.shift();
}
/* v2.3.3190: a page as colour numbers is this module's own (destroyed with
   its frames, which lets go of its row of colours); a picture is the asset
   cache's, unloaded only by the page that loaded it -- one let go while its
   numbers were read (and never loaded as a picture) must not unload the
   picture a later wish for the same page is loading */
function freeSheet(url, rec, sheet) {
  if (rec.palette) { try { if (sheet) sheet.destroy(true); } catch (e) { /* gone */ } return; }
  if (rec.picture) Assets.unload(url).catch(() => {});
}
function dropPage(ix, k) {
  const rec = _pages.get(k);
  if (!rec) return;
  _pages.delete(k);
  /* v2.3.3000: the shadows cast from its pictures let go of them first --
     a pooled shadow piece only hides (lightfx/shadows.js
     releaseShadowTextures).  Before the objects' own update and the
     shadows' in the same frame, so the ones still wanted are placed again
     before anything is drawn. */
  if (rec.state === 'ready') { releaseShadowTextures(); freeSheet(ix.sheets[k], rec, rec.sheet); }
}
let _gen = 0;

/* The way in's half (worldTrial.preloadWheel, behind the zone overlay): the
   pages of every object within (rx, ry) game px of (x, y), and of every
   picture that reaches that far up from below. */
export async function wheelObjectsWarm(x, y, rx, ry) {
  const t0 = performance.now();
  const ix = index();
  if (!ix) return;
  /* v2.3.2983: the buildings' life -- its textures, made in code (wheelLife.js) */
  if (wheelLifeOn()) wheelLifeWarm();
  const want = new Set();
  each(ix, x - rx - ix.maxHalfW, y - ry, x + rx + ix.maxHalfW, y + ry + ix.maxH, (i) => want.add(ix.page[ix.pk[i]]));
  const all = Promise.all([...want].map((k) => loadPage(ix, k)));
  await Promise.race([all, new Promise((r) => setTimeout(r, PAGE_WAIT_MS))]);
  wheelObjectStats.warmMs = Math.round(performance.now() - t0);
}

/* Every page let go, and the index with it: leaving the Wheel. */
export function wheelObjectsFree() {
  _gen++;
  stopPngWorker();   /* v2.3.3190 */
  const ix = _idx;
  for (const k of [..._pages.keys()]) {
    if (ix) dropPage(ix, k);
    else _pages.delete(k);
  }
  _idx = null;
  wheelLifeFree();
  wheelObjectStats.pages = 0;
  wheelObjectStats.mb = 0;
  wheelObjectStats.drawn = 0;
  wheelObjectStats.loading = 0;
  wheelObjectStats.blockers = 0;
}
export function wheelObjectsResetCounts() {
  Object.assign(wheelObjectStats, { loads: 0, failed: 0, lateDraws: 0, warmMs: null });
}
/* the worker stopping (five seconds after leaving the Wheel) takes the
   pages with it, whether or not the way in got as far as drawing them --
   and Mayor Bro's own copy of his picture (npcSprites.js) */
wheelOnStop(() => { wheelObjectsFree(); freeWheelNpcArt(); });

/* ── the renderer ── */
export class WheelObjects {
  constructor(layer, renderer) {
    this.layer = layer;
    this.renderer = renderer || null;
    this.sprites = new Map();       /* object index -> Sprite */
    this.dead = false;
    this._vx = 0; this._vy = 0; this._lastT = null;
    this._wantAt = 0;
    this._blockers = [];
    this._blockAt = null;
    this._pagesSeen = -1;
    this._late = new Set();
    this._offHook = setZoneBlockerHook((zoneId) => (zoneId === this._zone ? this._blockers : null));
    this._zone = null;
    /* v2.3.2983: the buildings' life (wheelLife.js), unless `?nolife` */
    this.life = wheelLifeOn();
    this._lifeT = null;
    /* v2.3.2995: hits, breaks and mendings */
    this.shatter = new WheelShatter(layer);
    this._shakes = new Map();       /* object index -> { t0, frac, tree, building, big } */
    this._fadeIn = new Map();       /* object index -> when it began to fade back in */
    this._breakT = null;
    /* v2.3.3230: ...and a building's fire, from where it is struck to its
       rubble (buildingFire.js), unless `?nobuildingfire` */
    this.fires = buildingFireOn() ? new BuildingFires(layer) : null;
    this._fireView = { x0: 0, y0: 0, x1: 0, y1: 0 };
    this._offBreak = onWheelBreak((type, oi) => {
      /* gone from the walk test and the arrows' path in the same call */
      if (type === 'break') this._blockers = this._blockers.filter((b) => b.oi !== oi);
      else this._blockAt = null;
    });
    _live = this;
  }

  update(cx, cy, viewW, viewH, S) {
    if (this.dead) return;
    this._zone = S ? S.currentZone : null;
    const ix = index();
    if (!ix) { this._clearSprites(); this._blockers = []; return; }
    const now = performance.now();
    /* v2.3.2995: what was hit, broken and mended since last frame */
    tickWheelBreak(S, Date.now());
    const evs = drainWheelEvents();
    if (evs) for (const ev of evs) { try { this._event(ev, ix, S, now); } catch (e) { /* one object's trouble is its own */ } }
    /* v2.3.3230: a building's hits, break, mending and forgotten count, to its
       fire -- after the break's heap is made above, so its pieces can burn */
    if (evs && this.fires) for (const ev of evs) { try { this._fireEvent(ev, ix, now); } catch (e) { /* one fire's trouble is its own */ } }
    /* the camera's speed, for loading ahead (wheelGround.js) */
    const jumped = this._lastCx != null && Math.abs(cx - this._lastCx) + Math.abs(cy - this._lastCy) > 400;
    if (this._lastT != null && !jumped) {
      const dt = Math.max(1, now - this._lastT), k = Math.min(1, dt / 250);
      this._vx += ((cx - this._lastCx) / dt - this._vx) * k;
      this._vy += ((cy - this._lastCy) / dt - this._vy) * k;
    }
    this._lastCx = cx; this._lastCy = cy; this._lastT = now;

    /* 1. the pages wanted round the view, four times a second */
    if (now - this._wantAt > 250) {
      this._wantAt = now;
      const ax = Math.max(-AHEAD_MAX, Math.min(AHEAD_MAX, this._vx * AHEAD_MS));
      const ay = Math.max(-AHEAD_MAX, Math.min(AHEAD_MAX, this._vy * AHEAD_MS));
      const want = new Set(), keep = new Set();
      each(ix, cx - LOAD_MARGIN + Math.min(0, ax) - ix.maxHalfW, cy - LOAD_MARGIN + Math.min(0, ay),
        cx + viewW + LOAD_MARGIN + Math.max(0, ax) + ix.maxHalfW, cy + viewH + LOAD_MARGIN + ix.maxH + Math.max(0, ay), (i) => want.add(ix.page[ix.pk[i]]));
      each(ix, cx - DROP_MARGIN - ix.maxHalfW, cy - DROP_MARGIN, cx + viewW + DROP_MARGIN + ix.maxHalfW, cy + viewH + DROP_MARGIN + ix.maxH, (i) => keep.add(ix.page[ix.pk[i]]));
      for (const k of want) {
        const rec = _pages.get(k);
        if (rec) { rec.wanted = now; continue; }
        if (_loading < MAX_LOADING) loadPage(ix, k);
      }
      for (const [k, rec] of _pages) {
        if (keep.has(k)) { rec.wanted = Math.max(rec.wanted, now - DROP_MS / 2); continue; }
        if (rec.state !== 'loading' && now - rec.wanted > DROP_MS) this._dropPage(ix, k);
      }
    }

    /* 2. a sprite for every object whose picture can reach the screen */
    const vx0 = cx - DRAW_MARGIN, vx1 = cx + viewW + DRAW_MARGIN, vy0 = cy - DRAW_MARGIN, vy1 = cy + viewH + DRAW_MARGIN;
    const seen = this._seen || (this._seen = new Set());
    seen.clear();
    /* v2.3.3000: ...or whose SHADOW can.  The sun is upper left
       (lightfx/zoneLight.js WHEEL_SUN), so a thing's shadow reaches lx x its
       height to the right of it and ly x its height below its foot: a tall
       pine just off the top or the left edge of the screen still darkens
       the ground on it, and drawn only once its picture came on, its shadow
       would pop in at the edge. */
    const SLX = WHEEL_SUN.lx, SLY = WHEEL_SUN.ly;
    each(ix, vx0 - ix.maxHalfW - SLX * ix.maxH, vy0 - SLY * ix.maxH, vx1 + ix.maxHalfW, vy1 + ix.maxH, (i) => {
      const x = ix.o.x[i], y = ix.o.y[i], hw = ix.reach[ix.pk[i]], h = ix.h[ix.pk[i]];
      if (x + hw + SLX * h < vx0 || x - hw > vx1 || y + SLY * h < vy0 || y - h > vy1) return;
      /* v2.3.2995: broken, it is its shards (wheelShatter.js) until mended */
      if (isWheelBroken(i)) return;
      seen.add(i);
      if (this.sprites.has(i)) return;
      const rec = _pages.get(ix.page[ix.pk[i]]);
      if (!rec || rec.state !== 'ready') {
        /* (late only if its PICTURE was due on screen, not just its shadow) */
        const pictureIn = !(x + hw < vx0 || y < vy0);
        if (pictureIn && !jumped && !this._late.has(i)) { this._late.add(i); wheelObjectStats.lateDraws++; }
        return;
      }
      const tex = rec.sheet && rec.sheet.textures && rec.sheet.textures[ix.frame[ix.pk[i]]];
      if (!tex) return;
      const pic = new Sprite(tex);
      pic.anchor.set(ix.ax[ix.pk[i]], 1);
      pic.scale.set(ix.o.flip[i] ? -ix.scl[ix.pk[i]] : ix.scl[ix.pk[i]], ix.scl[ix.pk[i]]);
      /* v2.3.2983: a building with life is its picture and its life over it,
         one Container at its foot, so the depth pass moves them together */
      const id = ix.o.kinds[ix.o.kind[i]];
      /* ═══ v2.3.3000: SHADED TOWARD THE GROUND, AS THE OLD PROPS WERE ═══
         The old map's props were drawn a little darker and cooler toward
         their base (formShade.js, v2.3.2767: light from above, no texture,
         no pass); the Wheel's 13,000 never were, and stood flat beside the
         shaded figures.  Snow things take the near-neutral snow shade
         (v2.3.2893: a lilac snowbank was the owner's complaint). */
      const mat = wheelMaterialOf(id);
      pic._vShade = mat && (mat.canopy === 'snow' || mat.mat === 'snow' || mat.mat === 'ice' || /snow|frost|ice/.test(id)) ? SHADE.propSnow : SHADE.prop;
      let s = pic;
      if (this.life && wheelLifeReady() && hasLife(id)) {
        s = new Container();
        s.addChild(pic);
        s._pic = pic;
        /* v2.3.3382: + its picture, out of which a flag's cloth is cut */
        s._life = new BuildingLife(id, ix.w[ix.pk[i]], ix.h[ix.pk[i]], ix.ax[ix.pk[i]], ix.scl[ix.pk[i]], pic);
        s.addChild(s._life.view);
      }
      s.x = x; s.y = y;
      s.label = 'wheelObject';
      s._wheelObject = i;
      this.layer.addChild(s);
      this.sprites.set(i, s);
    });
    for (const [i, s] of this.sprites) {
      if (seen.has(i)) continue;
      this.sprites.delete(i);
      try { s.destroy({ children: true }); } catch (e) { /* gone */ }
    }
    if (this._late.size > 2000) this._late.clear();
    /* v2.3.2995: shaking from a hit, fading back in mended, and the shards */
    this._motion(ix, now);
    /* v2.3.3230: the buildings' fires, on their pictures and their shards as
       they are now */
    if (this.fires) {
      const v = this._fireView;
      v.x0 = cx; v.y0 = cy; v.x1 = cx + viewW; v.y1 = cy + viewH;
      try { this.fires.update(this, now, v); } catch (e) { /* the fire's trouble is its own */ }
    }
    /* v2.3.2999: ...and a tree you stand behind, see-through */
    this._seeThrough(ix, S, now);
    /* v2.3.2983: the buildings' life, for the ones drawn */
    if (this.life) {
      const dt = this._lifeT != null ? Math.min(0.1, (now - this._lifeT) / 1000) : 0;
      this._lifeT = now;
      const t0 = performance.now();
      let alive = 0;
      for (const s of this.sprites.values()) {
        if (!s._life) continue;
        s._life.update(dt);
        alive++;
      }
      wheelObjectStats.alive = alive;
      /* what it costs a frame, smoothed (QA) */
      const ms = performance.now() - t0;
      wheelObjectStats.lifeMs = wheelObjectStats.lifeMs == null ? ms : wheelObjectStats.lifeMs * 0.95 + ms * 0.05;
    }

    /* 3. the footprints near the player, for the walk test */
    const P = S && S.player;
    let ready = 0;
    for (const rec of _pages.values()) if (rec.state === 'ready') ready++;
    if (P && (!this._blockAt || ready !== this._pagesSeen || Math.abs(P.x - this._blockAt.x) + Math.abs(P.y - this._blockAt.y) > BLOCK_MOVE)) {
      this._blockAt = { x: P.x, y: P.y };
      this._pagesSeen = ready;
      const out = [], o = ix.o;
      each(ix, P.x - BLOCK_R - ix.maxHalfW, P.y - BLOCK_R, P.x + BLOCK_R + ix.maxHalfW, P.y + BLOCK_R + ix.maxH, (i) => {
        const rec = _pages.get(ix.page[ix.pk[i]]);
        if (!rec || rec.state !== 'ready') return;
        if (isWheelBroken(i)) return;      /* v2.3.2995: rubble stops nobody */
        for (let b = o.boxOf[i]; b < o.boxOf[i + 1]; b++) {
          /* v2.3.2995: + `oi`, which object: a hit on it is that object's
             (wheelBreak.js), not every one of its kind's */
          /* v2.3.3206: + `h`, its picture's height, so a hit at the boots is
             shown on the picture, not in the air over a bench
             (combatHelpers.propHitHeight) */
          out.push({ x0: o.boxes[b * 4], y0: o.boxes[b * 4 + 1], x1: o.boxes[b * 4 + 2], y1: o.boxes[b * 4 + 3], id: o.kinds[o.kind[i]], oi: i, h: ix.h[ix.pk[i]] });
        }
      });
      this._blockers = out;
    }

    /* 4. the numbers */
    let mb = 0;
    /* (v2.3.3190: a page kept as colour numbers is a quarter of its colours) */
    for (const [k, rec] of _pages) if (rec.state === 'ready') mb += rec.palette ? ix.pageMB[k] / 4 : ix.pageMB[k];
    wheelObjectStats.drawn = this.sprites.size;
    wheelObjectStats.pages = ready;
    wheelObjectStats.mb = Math.round(mb * 10) / 10;
    wheelObjectStats.loading = _loading;
    wheelObjectStats.blockers = this._blockers.length;
  }

  /* the walk test's footprints, now (worldProps.zoneBlockers) */
  blockers() { return this._blockers; }

  /* ── v2.3.2995: hits, breaks and mendings (wheelBreak.js) ── */
  _event(ev, ix, S, now) {
    const i = ev.oi;
    if (i == null || i < 0 || i >= ix.n) return;
    const k = wheelObjectKind(i);
    if (ev.type === 'hit') {
      this._shakes.set(i, { t0: now, frac: ev.frac || 0, tree: !!(k && k.canopy),
        building: !!(k && isBuilding(k.id)), big: !!(k && k.big) });
      return;
    }
    if (ev.type === 'break') {
      this._shakes.delete(i);
      this._fadeIn.delete(i);
      const s = this.sprites.get(i);
      if (s) { this.sprites.delete(i); try { s.destroy({ children: true }); } catch (e) { /* gone */ } }
      const tex = texOf(ix, i);
      const o = ix.o;
      let depth = 12;
      if (o.boxOf) for (let b = o.boxOf[i]; b < o.boxOf[i + 1]; b++) depth = Math.max(depth, o.boxes[b * 4 + 3] - o.boxes[b * 4 + 1]);
      const info = materialInfo(k && k.mat);
      if (tex) {
        this.shatter.add(i, tex, { x: o.x[i], y: o.y[i], ax: ix.ax[ix.pk[i]], ks: ix.scl[ix.pk[i]], flip: !!o.flip[i],
          hitX: ev.x, hitY: ev.y, ang: ev.ang, weapon: ev.weapon, as: ev.as, depth, dust: dustTint(info.tint) });
      }
      /* ...and a burst of what it is made of, thrown all round its foot */
      if (S) {
        if (!S._debrisBursts) S._debrisBursts = [];
        const h = Math.min(ix.h[ix.pk[i]] * 0.4, 70);
        S._debrisBursts.push({ monsterId: 'wobj:' + i + ':b', kind: info.fx, tint: info.tint,
          x: o.x[i], y: o.y[i] - h, gy: o.y[i], h, ang: Number.isFinite(ev.ang) ? ev.ang : -Math.PI / 2,
          t0: Date.now(), weapon: 'bolt', big: true, hitX: o.x[i], hitY: o.y[i] - h, prop: true, oi: i, mat: k && k.mat });
      }
      this._blockers = this._blockers.filter((b) => b.oi !== i);
      return;
    }
    if (ev.type === 'repair') {
      this.shatter.remove(i);
      this._fadeIn.set(i, now);
      this._blockAt = null;
    }
  }

  /* v2.3.3230: a building's event, for its fire */
  _fireEvent(ev, ix, now) {
    const i = ev.oi;
    if (i == null || i < 0 || i >= ix.n) return;
    const k = wheelObjectKind(i);
    if (!k || !isBuilding(k.id)) return;
    this.fires.event(ev, ix, this, now);
  }

  _motion(ix, now) {
    const o = ix.o;
    for (const [i, sh] of this._shakes) {
      const s = this.sprites.get(i);
      const age = now - sh.t0;
      const dur = sh.tree ? 700 : sh.building ? 220 : 280;
      if (!s || s.destroyed || age >= dur) {
        if (s && !s.destroyed) { s.x = o.x[i]; s.rotation = 0; }
        this._shakes.delete(i);
        continue;
      }
      const k = 1 - age / dur, harder = 1 + sh.frac * 0.8;
      if (sh.tree) {
        /* a tree rocks on its roots, its crown swinging a few px */
        s.rotation = Math.sin(age * 0.021) * 0.014 * harder * k * k;
      } else {
        /* v2.3.3467: a building 1.6 (was 0.8) -- under a CSS px on a
           computer (the world drawn ~0.57), it was rounded away there:
           every hit on a building now shows (hitMaterialFx, A BUILDING
           SHOWS EVERY HIT) */
        const A = sh.building ? 1.6 : sh.big ? 1.3 : 2.2;
        s.x = o.x[i] + Math.sin(age * 0.16) * A * harder * k;
      }
    }
    for (const [i, t0] of this._fadeIn) {
      const a = Math.min(1, (now - t0) / FADE_IN_MS);
      const s = this.sprites.get(i);
      /* v2.3.2999: with the see-through trees on, _seeThrough sets the
         alpha from both (it would undo this one); without, as before */
      if (s && !s.destroyed) { if (CANOPY_FADE) s._mendA = a; else s.alpha = a; }
      if (a >= 1) { this._fadeIn.delete(i); if (s && !s.destroyed && CANOPY_FADE) s._mendA = 1; }
    }
    const dt = this._breakT != null ? now - this._breakT : 16.667;
    this._breakT = now;
    this.shatter.update(dt);
  }

  _seeThrough(ix, S, now) {
    /* off (no `?placing=2` or `?fade`): nothing to do, every frame */
    if (!CANOPY_FADE) return;
    const dt = this._seeT != null ? now - this._seeT : 16.667;
    this._seeT = now;
    const P = S && S.player;
    let fy = null, px = 0, bodyH = 100;
    if (P) {
      px = P.x;
      fy = P.y + (playerGroundDy(S.currentZone, P.x, P.y) || 0);
      if (S._bodyDrawH > 20) bodyH = S._bodyDrawH;
    }
    const k = Math.min(1, dt / SEE_MS);
    let seeing = 0;
    for (const [i, s] of this.sprites) {
      if (s.destroyed) continue;
      let see = s._see == null ? 1 : s._see;
      let want = 1;
      if (fy != null) {
        if (s._crown == null) { const m = wheelMaterialOf(ix.o.kinds[ix.o.kind[i]]); s._crown = !!(m && m.canopy); }
        if (s._crown) {
          const x = ix.o.x[i], y = ix.o.y[i], h = ix.h[ix.pk[i]], hw = ix.reach[ix.pk[i]] * 0.8;
          /* behind its foot, under its crown, and the crown over your body */
          if (fy < y - 4 && fy > y - h + 20 && Math.abs(px - x) < hw + 14 && fy - bodyH < y - h * 0.35) want = SEE_ALPHA;
        }
      }
      see += (want - see) * k;
      if (Math.abs(see - want) < 0.01) see = want;
      s._see = see;
      if (see < 1) seeing++;
      const a = (s._mendA == null ? 1 : s._mendA) * see;
      if (s.alpha !== a) s.alpha = a;
    }
    wheelObjectStats.seeThrough = seeing;
  }

  _dropPage(ix, k) {
    /* its sprites first: drop the reference, then the texture (CLAUDE.md) */
    for (const [i, s] of this.sprites) {
      if (ix.page[ix.pk[i]] !== k) continue;
      this.sprites.delete(i);
      try { s.destroy({ children: true }); } catch (e) { /* gone */ }
    }
    dropPage(ix, k);
  }

  _clearSprites() {
    for (const s of this.sprites.values()) { try { s.destroy({ children: true }); } catch (e) { /* gone */ } }
    this.sprites.clear();
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    this._clearSprites();
    this._blockers = [];
    if (this._offHook) { this._offHook(); this._offHook = null; }
    /* v2.3.2995: the shards and the count go with the Wheel: everything is
       whole again next time */
    if (this._offBreak) { this._offBreak(); this._offBreak = null; }
    /* v2.3.3230: the fires first -- the rubble's ride the shards */
    if (this.fires) { try { this.fires.destroy(); } catch (e) { /* gone */ } this.fires = null; }
    try { this.shatter.destroy(); } catch (e) { /* gone */ }
    this._shakes.clear(); this._fadeIn.clear();
    resetWheelBreak();
    if (_live === this) _live = null;
    wheelObjectsFree();
  }
}
let _live = null;

/* ═══ v2.3.3000: WHAT THE WHEEL'S OBJECTS CAST ═══
 * Owner: "I liked the old shadows ... put that on this wheel world too".  The
 * old map's props cast along their map's sun (lightfx/casters.js, v2.3.2749);
 * the Wheel's objects were never in that list.  The same two kinds:
 *
 *   a BILLBOARD -- a tree, a rock, a barrel, a fence -- is one projection of
 *     its picture, pivoted on the middle of its footprint (a tree's trunk, a
 *     rock's base), so it swings with a hit's shake and fades with nothing:
 *     a see-through tree (v2.3.2999) keeps its whole shadow;
 *   a BUILDING casts column by column (shadows.js placeDepth): its front wall
 *     from its foot, its roof from its footprint's back edge.  Its art is
 *     drawn square-on, so every column's base is the foot (`bottoms: null`);
 *     the picture is anchored at (its foot across, 1), and a building with
 *     life is a Container, so the column model is handed a stand-in at the
 *     picture's own middle and bottom.
 *
 * Into `out` (collectCasters' list), one caster per object drawn this frame;
 * the caster objects are kept on the sprites, so a frame allocates nothing.
 * Nothing at all outside the Wheel. */
/* ═══ v2.3.3028: A LOW THING'S SHADOW STARTS AT ITS OWN BASE ═══
 * Owner, 2026-10-04: "Sea level props have shadows that appear to be floating
 * off the ground a bit. Shadows not connecting to the prop."  A billboard's
 * one projection is pivoted on the MIDDLE of its footprint, and the footprint
 * reaches back from the foot a share of the picture's height (placing.js
 * FOOT: 0.4 of a rock, a barrel, a crate, driftwood; 0.35 of a bush) -- so a
 * low thing's shadow began 11-20 game px up its picture, and the bottom of the
 * picture, its front base, cast up toward the sun, hidden behind it.  On 57 of
 * the 109 low pictures nothing at all fell under the front base, and a shadow
 * reached a median 23% of what one from the base would (measured off the
 * sheets).  The sea's rocks and driftwood showed it most.
 *
 * So everything but a tree now casts COLUMN BY COLUMN, as a building does
 * (shadows.js placeDepth), each column a billboard on its OWN base -- the
 * lowest solid pixel of that column of the picture (propGround
 * readArtBottoms, read once a picture, a few a frame) -- but never further
 * back than the footprint's middle, where it pivoted before, so a fence's
 * rail, a bench's seat or a sign casts from there and not from mid-air.  A
 * tree keeps its billboard: its footprint is a fixed 12-24 px under a crown
 * hundreds tall, its trunk hides the pivot, and it sways (the column model
 * does not).  Until its picture is read, a thing casts as before. */
const _bottoms = new WeakMap();   /* texture -> Float32Array, or null where it cannot be read */
const BOTTOMS_A_FRAME = 4;
let _castFrame = 0, _bottomsLeft = 0;
function bottomsOf(tex) {
  const b = _bottoms.get(tex);
  if (b !== undefined) return b;
  if (_bottomsLeft <= 0) return undefined;   /* a later frame */
  _bottomsLeft--;
  const r = readArtBottoms(tex) || null;
  _bottoms.set(tex, r);
  return r;
}
export function wheelObjectCasters(out) {
  const live = _live;
  if (!live || live.dead || !live.sprites.size) return;
  const ix = _idx;
  if (!ix) return;
  const o = ix.o;
  _castFrame++; _bottomsLeft = BOTTOMS_A_FRAME;
  /* QA (mp-wheelshadows): the billboard for everything, as before v2.3.3028,
     to measure the two side by side */
  const board = typeof window !== 'undefined' && window.__btWheelCastBoard === true;
  for (const [i, s] of live.sprites) {
    if (!s || s.destroyed || !s.visible) continue;
    const pic = s._pic || s;
    const tex = pic.texture;
    if (!tex || tex.destroyed || !tex.source || tex.source.destroyed) continue;
    let c = s._caster;
    if (isBuilding(o.kinds[o.kind[i]])) {
      if (!c) {
        let back = Infinity;
        for (let b = o.boxOf[i]; b < o.boxOf[i + 1]; b++) back = Math.min(back, o.boxes[b * 4 + 1]);
        c = s._caster = { key: 'w:' + i, depth: { spr: { texture: null, x: 0, y: 0, scale: { x: 1, y: 1 } }, g: { base: 0, bottoms: null },
          back: Number.isFinite(back) ? back : o.y[i] - ix.h[ix.pk[i]] * 0.5, pieces: null }, alive: true };
      }
      const d = c.depth, sp = d.spr, sx = pic.scale.x, sy = pic.scale.y;
      /* (a building with life: its picture sits inside the Container) */
      const ox = s._pic ? s.x + pic.x : s.x, oy = s._pic ? s.y + pic.y : s.y;
      sp.texture = tex;
      sp.x = ox + (0.5 - pic.anchor.x) * tex.frame.width * sx;
      sp.y = oy;
      sp.scale.x = sx; sp.scale.y = sy;
      d.g.base = sp.y;
      out.push(c);
      continue;
    }
    if (!c) {
      let y0 = Infinity, y1 = -Infinity;
      for (let b = o.boxOf[i]; b < o.boxOf[i + 1]; b++) { y0 = Math.min(y0, o.boxes[b * 4 + 1]); y1 = Math.max(y1, o.boxes[b * 4 + 3]); }
      const mat = wheelMaterialOf(o.kinds[o.kind[i]]);
      c = s._caster = { key: 'w:' + i, px: 0, py: 0, dy: Number.isFinite(y0) ? (y0 + y1) / 2 - o.y[i] : 0, sprites: [pic], alive: true, noHold: true,
        /* v2.3.3028: all but a tree cast column by column (above) */
        cols: (mat && mat.canopy) ? null : { spr: { texture: null, x: 0, y: 0, scale: { x: 1, y: 1 } },
          g: { base: 0, bottoms: null, fh: 0, sy: 1 }, back: Infinity, pieces: null, floor: 0 },
        depth: null };
    }
    if (c.cols && !board) {
      const bot = bottomsOf(tex);
      if (bot) {
        const d = c.cols, sp = d.spr, sx = pic.scale.x, sy = pic.scale.y;
        const ox = s._pic ? s.x + pic.x : s.x, oy = s._pic ? s.y + pic.y : s.y;
        const fw = tex.frame.width, fh = tex.frame.height;
        sp.texture = tex;
        sp.x = ox + (0.5 - pic.anchor.x) * fw * sx;      /* the column model's anchor is (0.5, 1) */
        sp.y = oy + (1 - pic.anchor.y) * fh * sy;
        sp.scale.x = sx; sp.scale.y = sy;
        d.g.base = sp.y; d.g.bottoms = bot; d.g.fh = fh; d.g.sy = sy;
        d.floor = o.y[i] + c.dy;                          /* the footprint's middle: no base further back */
        c.depth = d;
        out.push(c);
        continue;
      }
      c.depth = null;   /* not read yet (or unreadable): the billboard, as before */
    } else if (c.cols) c.depth = null;
    c.px = s.x; c.py = o.y[i] + c.dy;
    c.sprites[0] = pic;
    out.push(c);
  }
}

/* ═══ v2.3.3000: WHAT SWAYS IN THE WIND ═══
 * The old map's trees swayed (worldLife.js, v2.3.2811: a spring each, gusts
 * that roll across a stand); the Wheel's only moved when hit.  Each drawn
 * tree and leafy plant is handed to worldLife's wind here: a broadleaf as a
 * `tree`, a snow-laden pine (and the stiff dead tree) as a `pine`, a bush, a
 * fern, a sage tuft or a tall flower as a `shrub`.  Stone, metal, buildings,
 * stumps and props stand still.  The kind is worked out once a sprite. */
const SHRUBS = new Set(['bush', 'flowers', 'frostbush', 'sage', 'fern', 'giantflower']);
function swayKindOf(id) {
  const m = wheelMaterialOf(id);
  if (m && m.canopy) return m.canopy === 'snow' || m.canopy === 'char' ? 'pine' : 'tree';
  return SHRUBS.has(id) ? 'shrub' : null;
}
/** fn(sprite, kind, footX, footY, crown) for each drawn object that sways.
 *  v2.3.3001: `crown` is a tree's canopy ('leaf', 'snow', 'char', 'slime'),
 *  null for a shrub -- what a gust shakes loose of it (worldLife). */
export function forEachWheelSwayer(fn) {
  const live = _live, ix = _idx;
  if (!live || live.dead || !ix || !live.sprites.size) return;
  const o = ix.o;
  for (const [i, s] of live.sprites) {
    if (!s || s.destroyed || s._pic) continue;   /* a building with life never sways */
    let kind = s._swayKind;
    if (kind === undefined) {
      const id = o.kinds[o.kind[i]];
      kind = s._swayKind = swayKindOf(id);
      const m = kind ? wheelMaterialOf(id) : null;
      s._swayCrown = (m && m.canopy) || null;
    }
    if (kind) fn(s, kind, o.x[i], o.y[i], s._swayCrown);
  }
}

/* v2.3.3382: every drawn building's waving flag (wheelLife.js FLAG), for
   worldLife to wave with its clock and wind: fn(life, footX, footY) */
export function forEachWheelFlag(fn) {
  const live = _live, ix = _idx;
  if (!live || live.dead || !ix || !live.sprites.size) return;
  const o = ix.o;
  for (const [i, s] of live.sprites) {
    if (!s || s.destroyed || !s._life || !s._life.flag) continue;
    fn(s._life, o.x[i], o.y[i]);
  }
}

/* ═══ v2.3.2995: AN OBJECT'S PICTURE, FOR WHAT A HIT DOES TO IT ═══ */
/* object i's picture, if its page is in */
function texOf(ix, i) {
  const rec = _pages.get(ix.page[ix.pk[i]]);
  if (!rec || rec.state !== 'ready' || !rec.sheet || !rec.sheet.textures) return null;
  const t = rec.sheet.textures[ix.frame[ix.pk[i]]];
  return t && t.source && !t.destroyed ? t : null;
}
/* the material's colour, paled for the dust it raises */
function dustTint(c) {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const m = (v) => Math.round(v + (220 - v) * 0.55);
  return (m(r) << 16) | (m(g) << 8) | m(b);
}
/* a world point -> object i's picture, in the picture's own pixels */
function toPic(ix, i, tex, x, y) {
  const fp = framePx(tex);
  if (!fp) return null;
  const ks = ix.scl[ix.pk[i]], flip = !!ix.o.flip[i];
  const cs = ks / fp.res, sx = flip ? -cs : cs;
  return { fp, cs, sx, flip, u: (x - ix.o.x[i]) / sx + ix.ax[ix.pk[i]] * fp.w, v: (y - ix.o.y[i]) / cs + fp.h };
}

/** Where object `oi` stands, for the marks drawn on it (effectsRenderer):
 *  { id, x, y, blockD, drawnX } -- drawnX where it is drawn this frame,
 *  shaking and all -- or null when it is not in the Wheel's objects or is
 *  broken. */
export function wheelPropRec(oi) {
  const ix = _idx;
  if (!ix || oi == null || oi < 0 || oi >= ix.n || isWheelBroken(oi)) return null;
  const o = ix.o;
  const s = _live && _live.sprites.get(oi);
  let d = 0;
  if (o.boxOf) for (let b = o.boxOf[oi]; b < o.boxOf[oi + 1]; b++) d = Math.max(d, o.boxes[b * 4 + 3] - o.boxes[b * 4 + 1]);
  return { id: 'wobj:' + oi, oi, x: o.x[oi], y: o.y[oi], blockD: d, drawnX: s && !s.destroyed ? s.x : o.x[oi], drawn: !!(s && !s.destroyed) };
}

/** The picture a hit on object `oi` at (x, y) cuts its pieces from
 *  (hitMaterialFx's chips): { tex, u, v (the point, in the picture's own
 *  pixels), cs (world px per picture pixel), R (how far round it to cut) }.
 *  `crown`: the tree's crown instead -- its middle, and { cx, z0, z1, hw }
 *  for where the falling leaves start.  Null without the picture. */
export function wheelPropArt(oi, x, y, crown) {
  const ix = _idx;
  if (!ix || oi == null || oi < 0 || oi >= ix.n) return null;
  const tex = texOf(ix, oi);
  if (!tex) return null;
  const p = toPic(ix, oi, tex, x, y);
  if (!p) return null;
  const W = p.fp.w, H = p.fp.h;
  if (crown) {
    /* a crown is the top of the picture: its middle across, a third down */
    const cu = W * 0.5, cv = H * 0.3;
    const cx = ix.o.x[oi] + (cu - ix.ax[ix.pk[oi]] * W) * p.sx;
    return { tex, u: cu, v: cv, cs: p.cs, R: Math.min(W, H) * 0.22,
      crown: { cx, z0: H * 0.42 * p.cs, z1: H * 0.9 * p.cs, hw: W * 0.34 * p.cs } };
  }
  return { tex, u: Math.max(0, Math.min(W - 1, p.u)), v: Math.max(0, Math.min(H - 1, p.v)), cs: p.cs, R: Math.max(10, 9 / p.cs) };
}

/* ── a bolt's mark: the picture's own pixels, burnt ── */
/** Let go of a mark's pixels -- effectsRenderer, when the mark goes (its
 *  sprites first: the marks own their pixels, never the objects' pages, so
 *  leaving the Wheel frees them with the marks, in the same frame). */
export function freeWheelScorch(mark) {
  if (!mark || !mark.source) return;
  try { mark.tex.destroy(false); } catch (e) { /* gone */ }
  try { mark.glow.destroy(false); } catch (e) { /* gone */ }
  try { mark.source.destroy(); } catch (e) { /* gone */ }
}
/**
 * The mark a bolt leaves on object `oi` at (x, y), `r` world px across its
 * middle: the picture's own pixels there, burnt (or frosted, or stained --
 * `style`), never spilling past the picture's edge, as { tex, glow, source,
 * x, y (where its middle goes), sx, sy (its scale) }; `glow` is the same
 * shape in white, for the heat that fades off it.  Null without the picture.
 */
export function wheelScorch(oi, x, y, r, style) {
  const ix = _idx;
  if (!ix || oi == null || oi < 0 || oi >= ix.n || typeof document === 'undefined') return null;
  const tex = texOf(ix, oi);
  if (!tex) return null;
  const p = toPic(ix, oi, tex, x, y);
  if (!p) return null;
  const W = p.fp.w, H = p.fp.h;
  const R = Math.max(4, Math.round(r / p.cs));
  const S = 2 * R + 1;
  const u0 = Math.round(p.u) - R, v0 = Math.round(p.v) - R;
  const cu0 = Math.max(0, u0), cv0 = Math.max(0, v0), cu1 = Math.min(W, u0 + S), cv1 = Math.min(H, v0 + S);
  if (cu1 - cu0 < 2 || cv1 - cv0 < 2) return null;
  const c = document.createElement('canvas'); c.width = S * 2; c.height = S;
  const g = c.getContext('2d', { willReadFrequently: true });
  /* v2.3.3190: drawSourceRect, so a page kept as colour numbers burns the same */
  try { drawSourceRect(g, tex.source, p.fp.x + cu0, p.fp.y + cv0, cu1 - cu0, cv1 - cv0, cu0 - u0, cv0 - v0, cu1 - cu0, cv1 - cv0); } catch (e) { return null; }
  let img;
  try { img = g.getImageData(0, 0, S, S); } catch (e) { return null; }
  const d = img.data;
  const glow = g.createImageData(S, S), gd = glow.data;
  const ph = Math.random() * 6.28, ph2 = Math.random() * 6.28;
  let any = 0;
  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const q = (py * S + px) * 4;
      const a = d[q + 3];
      if (a < 8) { d[q + 3] = 0; continue; }
      const dx = px - R, dy = py - R, ang = Math.atan2(dy, dx);
      /* a ragged rim, and a speckle in it */
      const rim = 1 + 0.2 * Math.sin(3 * ang + ph) + 0.1 * Math.sin(7 * ang + ph2);
      const hsh = ((px * 73856093) ^ (py * 19349663) ^ R) & 255;
      const dd = Math.hypot(dx, dy) / (R * rim) + (hsh / 255 - 0.5) * 0.18;
      const k = Math.max(0, Math.min(1, (1 - dd) / 0.55));
      if (k <= 0) { d[q + 3] = 0; continue; }
      const r0 = d[q], g0 = d[q + 1], b0 = d[q + 2];
      const lum = (r0 * 77 + g0 * 150 + b0 * 29) >> 8;
      let tr, tg, tb, mix;
      if (style === 'frost') { tr = 236; tg = 246; tb = 255; mix = 0.72 * k; }
      else if (style === 'wet') { tr = r0 * 0.55; tg = g0 * 0.6; tb = b0 * 0.7 + 20; mix = 0.7 * k; }
      else if (style === 'stain') { tr = 64 + lum * 0.2; tg = 104 + lum * 0.25; tb = 34 + lum * 0.1; mix = 0.6 * k; }
      else { tr = 16 + lum * 0.2; tg = 11 + lum * 0.14; tb = 8 + lum * 0.1; mix = 0.86 * k; }
      d[q] = r0 + (tr - r0) * mix; d[q + 1] = g0 + (tg - g0) * mix; d[q + 2] = b0 + (tb - b0) * mix;
      d[q + 3] = a * Math.min(1, k * 1.7);
      if (!style || style === 'burn') {
        const hot = k * k;
        gd[q] = 255; gd[q + 1] = 255; gd[q + 2] = 255; gd[q + 3] = a * hot;
      }
      any++;
    }
  }
  if (!any) return null;
  g.putImageData(img, 0, 0);
  g.putImageData(glow, S, 0);
  const source = new CanvasSource({ resource: c, width: S * 2, height: S, resolution: 1, scaleMode: 'linear' });
  const mk = { source,
    tex: new Texture({ source, frame: new Rectangle(0, 0, S, S) }),
    glow: new Texture({ source, frame: new Rectangle(S, 0, S, S) }),
    x: ix.o.x[oi] + (u0 + S / 2 - ix.ax[ix.pk[oi]] * W) * p.sx,
    y: ix.o.y[oi] + (v0 + S / 2 - H) * p.cs,
    sx: p.sx, sy: p.cs };
  return mk;
}

/* QA probe, house style: what is drawn and loaded, and what stops you. */
if (typeof window !== 'undefined') {
  window.__btWheelObjects = {
    stats: wheelObjectStats,
    /* the objects within r game px of (x, y): { id, x, y, w, h, drawn } */
    near: (x, y, r = 600) => {
      const ix = index();
      if (!ix) return [];
      const out = [];
      each(ix, x - r, y - r, x + r, y + r, (i) => {
        const rec = _pages.get(ix.page[ix.pk[i]]);
        out.push({ i, id: ix.o.kinds[ix.o.kind[i]], x: ix.o.x[i], y: ix.o.y[i], w: ix.w[ix.pk[i]], h: ix.h[ix.pk[i]], ready: !!(rec && rec.state === 'ready') });
      });
      return out;
    },
    mayor: () => { const info = wheelInfo(); return info && info.objects ? info.objects.mayor || null : null; },
    /* the sprite drawn for object i, and which side of the player the depth
       pass put it on: 'entities' (under him) or 'gatherNodesFront' (over) */
    sprite: (i) => {
      const s2 = _live && _live.sprites.get(i);
      if (!s2 || s2.destroyed) return null;
      /* (v2.3.2983: a building with life is a Container; its picture is `_pic`) */
      const pic = s2._pic || s2;
      return { layer: s2.parent ? s2.parent.label : null, x: s2.x, y: s2.y, w: Math.abs(pic.width), h: pic.height,
        ax: pic.anchor.x, flip: pic.scale.x < 0, life: s2._life ? s2._life.count() : null,
        /* v2.3.2999: see-through while you stand behind it */
        alpha: +s2.alpha.toFixed(3), crown: !!s2._crown,
        /* v2.3.3000: shaded toward the ground, swaying in the wind, casting */
        shade: !!pic._vShade, skew: +pic.skew.x.toFixed(4), sway: s2._swayKind || null };
    },
    /* v2.3.3028: how object i casts: a tree's billboard ('board'), or
       column by column ('cols') on its own base -- the frame's foot, the
       lowest base any column was read at, and the floor no base may be
       further back than (the footprint's middle) */
    caster: (i) => {
      const s2 = _live && _live.sprites.get(i);
      const c = s2 && s2._caster;
      if (!c) return null;
      if (!c.cols) return { model: c.depth ? 'building' : 'board', pivot: +(c.py || 0).toFixed(1) };
      const d = c.cols, b = d.g.bottoms;
      let low = -Infinity, n = 0;
      if (b) for (let k = 0; k < b.length; k++) if (b[k] >= 0) { n++; low = Math.max(low, d.g.base - (1 - b[k]) * d.g.fh * d.g.sy); }
      return { model: c.depth ? 'cols' : 'waiting', foot: +d.g.base.toFixed(1), lowest: n ? +low.toFixed(1) : null,
        floor: +d.floor.toFixed(1), columns: b ? b.length : 0, solid: n,
        /* v2.3.3190: every column's base, for mp-palette (a page kept as
           colour numbers reads them as the picture did) */
        bottoms: b ? Array.from(b, (v) => +v.toFixed(5)) : null };
    },
    /* v2.3.2995: the broken objects' shards, and an object's shake */
    shards: () => (_live ? _live.shatter.probe() : []),
    shatterStats: () => (_live ? { ..._live.shatter.stats } : null),
    shaking: (i) => !!(_live && _live._shakes.has(i)),
    /* v2.3.3230: every building's fire: its spots, flames, sparks, smoke and
       rubble (buildingFire.js) */
    fires: () => (_live && _live.fires ? _live.fires.probe(_live) : []),
    fading: (i) => (_live && _live._fadeIn.has(i) ? (() => { const s = _live.sprites.get(i); return s ? +s.alpha.toFixed(2) : null; })() : null),
    drawn: (i) => !!(_live && _live.sprites.has(i)),
    /* the footprints the walk test has now, with their object */
    blockers: () => (_live ? _live._blockers.map((b) => ({ ...b })) : []),
    /* v2.3.3190: the last pages loaded: { name, ok, palette, ms, gen } */
    pageLog: () => _pageLog.slice(),
    /* the sprite sheets in memory now, by name */
    pagesLoaded: () => {
      const ix = _idx;
      const out = [];
      for (const [k, rec] of _pages) if (rec.state === 'ready') out.push(ix ? ix.pageNames[k] : String(k));
      return out.sort();
    },
  };
}
