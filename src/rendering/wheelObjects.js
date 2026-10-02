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
import { Sprite, Assets } from 'pixi.js';
import { wheelInfo, wheelObjectStats, wheelOnStop } from '../game/wheelTrial.js';
import { setZoneBlockerHook } from '../data/worldProps.js';
import { freeWheelNpcArt } from './npcSprites.js';

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
  const page = new Int16Array(n).fill(-1), w = new Float32Array(n), h = new Float32Array(n);
  /* the anchor across each picture, and how far it reaches either side of
     its foot (half its width, more for a palm stood on its trunk) */
  const ax = new Float32Array(n), reach = new Float32Array(n), scl = new Float32Array(n);
  const frame = new Array(n);
  const count = new Uint32Array(cols * rows + 1);
  let maxH = 0, maxHalfW = 0, placed = 0;
  for (let i = 0; i < n; i++) {
    const ks = kinds[o.kind[i]];
    if (!ks || !o.present[o.kind[i]]) continue;
    const pc = ks[o.piece[i] % ks.length];
    if (pc.page < 0) continue;
    page[i] = pc.page; w[i] = pc.w; h[i] = pc.h; frame[i] = pc.frame;
    ax[i] = pc.ax; reach[i] = Math.max(pc.ax, 1 - pc.ax) * pc.w; scl[i] = pc.ks;
    if (pc.h > maxH) maxH = pc.h;
    if (reach[i] > maxHalfW) maxHalfW = reach[i];
    placed++;
    count[cellOf(o.x[i], o.y[i], cols, rows) + 1]++;
  }
  for (let c = 1; c < count.length; c++) count[c] += count[c - 1];
  const fill = count.slice(0, cols * rows);
  const items = new Uint32Array(placed);
  for (let i = 0; i < n; i++) if (page[i] >= 0) items[fill[cellOf(o.x[i], o.y[i], cols, rows)]++] = i;
  const pageMB = man.atlases.map((a) => (a.w * a.h * 4) / 1048576);
  wheelObjectStats.placed = placed;
  wheelObjectStats.pagesOf = pageNames.length;
  wheelObjectStats.placeMs = o.placeMs != null ? o.placeMs : null;
  _idx = { src: o, o, n, cols, rows, start: count, items, page, w, h, ax, reach, scl, frame, maxH, maxHalfW, pageNames, pageMB,
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

/* ── the pages ── */
const _pages = new Map();     /* page index -> { state: 'loading'|'ready'|'failed', sheet, wanted, p } */
let _loading = 0;
function loadPage(ix, k) {
  let rec = _pages.get(k);
  if (rec) return rec.p;
  rec = { state: 'loading', sheet: null, wanted: performance.now(), p: null, gen: _gen };
  _pages.set(k, rec);
  _loading++;
  const url = ix.sheets[k];
  /* a prefix of their own for the frames Pixi files in its cache: bare, a
     frame called 'stone-1' or 'barrel-2' would take (and, unloaded, take
     away) any other sheet's frame of that name */
  rec.p = Assets.load({ src: url, data: { cachePrefix: CACHE_PREFIX } }).then((sheet) => {
    _loading--;
    /* let go while it was loading (the Wheel left behind): drop it again */
    if (_pages.get(k) !== rec || rec.gen !== _gen) { Assets.unload(url).catch(() => {}); return null; }
    rec.state = 'ready';
    rec.sheet = sheet;
    wheelObjectStats.loads++;
    return sheet;
  }, () => {
    _loading--;
    if (_pages.get(k) === rec) { rec.state = 'failed'; wheelObjectStats.failed++; }
    return null;
  });
  return rec.p;
}
function dropPage(ix, k) {
  const rec = _pages.get(k);
  if (!rec) return;
  _pages.delete(k);
  if (rec.state === 'ready') Assets.unload(ix.sheets[k]).catch(() => {});
}
let _gen = 0;

/* The way in's half (worldTrial.preloadWheel, behind the zone overlay): the
   pages of every object within (rx, ry) game px of (x, y), and of every
   picture that reaches that far up from below. */
export async function wheelObjectsWarm(x, y, rx, ry) {
  const t0 = performance.now();
  const ix = index();
  if (!ix) return;
  const want = new Set();
  each(ix, x - rx - ix.maxHalfW, y - ry, x + rx + ix.maxHalfW, y + ry + ix.maxH, (i) => want.add(ix.page[i]));
  const all = Promise.all([...want].map((k) => loadPage(ix, k)));
  await Promise.race([all, new Promise((r) => setTimeout(r, PAGE_WAIT_MS))]);
  wheelObjectStats.warmMs = Math.round(performance.now() - t0);
}

/* Every page let go, and the index with it: leaving the Wheel. */
export function wheelObjectsFree() {
  _gen++;
  const ix = _idx;
  for (const k of [..._pages.keys()]) {
    if (ix) dropPage(ix, k);
    else _pages.delete(k);
  }
  _idx = null;
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
    _live = this;
  }

  update(cx, cy, viewW, viewH, S) {
    if (this.dead) return;
    this._zone = S ? S.currentZone : null;
    const ix = index();
    if (!ix) { this._clearSprites(); this._blockers = []; return; }
    const now = performance.now();
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
        cx + viewW + LOAD_MARGIN + Math.max(0, ax) + ix.maxHalfW, cy + viewH + LOAD_MARGIN + ix.maxH + Math.max(0, ay), (i) => want.add(ix.page[i]));
      each(ix, cx - DROP_MARGIN - ix.maxHalfW, cy - DROP_MARGIN, cx + viewW + DROP_MARGIN + ix.maxHalfW, cy + viewH + DROP_MARGIN + ix.maxH, (i) => keep.add(ix.page[i]));
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
    each(ix, vx0 - ix.maxHalfW, vy0, vx1 + ix.maxHalfW, vy1 + ix.maxH, (i) => {
      const x = ix.o.x[i], y = ix.o.y[i], hw = ix.reach[i];
      if (x + hw < vx0 || x - hw > vx1 || y < vy0 || y - ix.h[i] > vy1) return;
      seen.add(i);
      if (this.sprites.has(i)) return;
      const rec = _pages.get(ix.page[i]);
      if (!rec || rec.state !== 'ready') {
        if (!jumped && !this._late.has(i)) { this._late.add(i); wheelObjectStats.lateDraws++; }
        return;
      }
      const tex = rec.sheet && rec.sheet.textures && rec.sheet.textures[ix.frame[i]];
      if (!tex) return;
      const s = new Sprite(tex);
      s.anchor.set(ix.ax[i], 1);
      s.x = x; s.y = y;
      s.scale.set(ix.o.flip[i] ? -ix.scl[i] : ix.scl[i], ix.scl[i]);
      s.label = 'wheelObject';
      s._wheelObject = i;
      this.layer.addChild(s);
      this.sprites.set(i, s);
    });
    for (const [i, s] of this.sprites) {
      if (seen.has(i)) continue;
      this.sprites.delete(i);
      try { s.destroy(); } catch (e) { /* gone */ }
    }
    if (this._late.size > 2000) this._late.clear();

    /* 3. the footprints near the player, for the walk test */
    const P = S && S.player;
    let ready = 0;
    for (const rec of _pages.values()) if (rec.state === 'ready') ready++;
    if (P && (!this._blockAt || ready !== this._pagesSeen || Math.abs(P.x - this._blockAt.x) + Math.abs(P.y - this._blockAt.y) > BLOCK_MOVE)) {
      this._blockAt = { x: P.x, y: P.y };
      this._pagesSeen = ready;
      const out = [], o = ix.o;
      each(ix, P.x - BLOCK_R - ix.maxHalfW, P.y - BLOCK_R, P.x + BLOCK_R + ix.maxHalfW, P.y + BLOCK_R + ix.maxH, (i) => {
        const rec = _pages.get(ix.page[i]);
        if (!rec || rec.state !== 'ready') return;
        for (let b = o.boxOf[i]; b < o.boxOf[i + 1]; b++) {
          out.push({ x0: o.boxes[b * 4], y0: o.boxes[b * 4 + 1], x1: o.boxes[b * 4 + 2], y1: o.boxes[b * 4 + 3], id: o.kinds[o.kind[i]] });
        }
      });
      this._blockers = out;
    }

    /* 4. the numbers */
    let mb = 0;
    for (const [k, rec] of _pages) if (rec.state === 'ready') mb += ix.pageMB[k];
    wheelObjectStats.drawn = this.sprites.size;
    wheelObjectStats.pages = ready;
    wheelObjectStats.mb = Math.round(mb * 10) / 10;
    wheelObjectStats.loading = _loading;
    wheelObjectStats.blockers = this._blockers.length;
  }

  /* the walk test's footprints, now (worldProps.zoneBlockers) */
  blockers() { return this._blockers; }

  _dropPage(ix, k) {
    /* its sprites first: drop the reference, then the texture (CLAUDE.md) */
    for (const [i, s] of this.sprites) {
      if (ix.page[i] !== k) continue;
      this.sprites.delete(i);
      try { s.destroy(); } catch (e) { /* gone */ }
    }
    dropPage(ix, k);
  }

  _clearSprites() {
    for (const s of this.sprites.values()) { try { s.destroy(); } catch (e) { /* gone */ } }
    this.sprites.clear();
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    this._clearSprites();
    this._blockers = [];
    if (this._offHook) { this._offHook(); this._offHook = null; }
    if (_live === this) _live = null;
    wheelObjectsFree();
  }
}
let _live = null;

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
        const rec = _pages.get(ix.page[i]);
        out.push({ i, id: ix.o.kinds[ix.o.kind[i]], x: ix.o.x[i], y: ix.o.y[i], w: ix.w[i], h: ix.h[i], ready: !!(rec && rec.state === 'ready') });
      });
      return out;
    },
    mayor: () => { const info = wheelInfo(); return info && info.objects ? info.objects.mayor || null : null; },
    /* the sprite drawn for object i, and which side of the player the depth
       pass put it on: 'entities' (under him) or 'gatherNodesFront' (over) */
    sprite: (i) => {
      const s2 = _live && _live.sprites.get(i);
      return s2 && !s2.destroyed ? { layer: s2.parent ? s2.parent.label : null, x: s2.x, y: s2.y, w: Math.abs(s2.width), h: s2.height,
        ax: s2.anchor.x, flip: s2.scale.x < 0 } : null;
    },
    /* the sprite sheets in memory now, by name */
    pagesLoaded: () => {
      const ix = _idx;
      const out = [];
      for (const [k, rec] of _pages) if (rec.state === 'ready') out.push(ix ? ix.pageNames[k] : String(k));
      return out.sort();
    },
  };
}
