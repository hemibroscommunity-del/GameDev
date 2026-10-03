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
import { Sprite, Assets, Container, Texture, Rectangle, CanvasSource } from 'pixi.js';
import { wheelInfo, wheelObjectStats, wheelOnStop, wheelLifeOn } from '../game/wheelTrial.js';
import { BuildingLife, hasLife, wheelLifeWarm, wheelLifeFree, wheelLifeReady } from './wheelLife.js';
import { setZoneBlockerHook } from '../data/worldProps.js';
import { freeWheelNpcArt } from './npcSprites.js';
import { tickWheelBreak, drainWheelEvents, isWheelBroken, resetWheelBreak, onWheelBreak, wheelObjectKind, isBuilding } from '../game/wheelBreak.js';
import { WheelShatter, framePx } from './wheelShatter.js';
import { materialInfo, wheelMaterialOf } from '../data/wheelMaterials.js';
import { playerGroundDy } from './systems/entityRenderer.js';   /* v2.3.2999: where your boots are, for a tree you stand behind */

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
  /* v2.3.2999: which placing made them (placing.js PLACING, or PLACING_V2
     with `?placing=2`) */
  wheelObjectStats.version = o.version || null;
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
  /* v2.3.2983: the buildings' life -- its textures, made in code (wheelLife.js) */
  if (wheelLifeOn()) wheelLifeWarm();
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
      /* v2.3.2995: broken, it is its shards (wheelShatter.js) until mended */
      if (isWheelBroken(i)) return;
      seen.add(i);
      if (this.sprites.has(i)) return;
      const rec = _pages.get(ix.page[i]);
      if (!rec || rec.state !== 'ready') {
        if (!jumped && !this._late.has(i)) { this._late.add(i); wheelObjectStats.lateDraws++; }
        return;
      }
      const tex = rec.sheet && rec.sheet.textures && rec.sheet.textures[ix.frame[i]];
      if (!tex) return;
      const pic = new Sprite(tex);
      pic.anchor.set(ix.ax[i], 1);
      pic.scale.set(ix.o.flip[i] ? -ix.scl[i] : ix.scl[i], ix.scl[i]);
      /* v2.3.2983: a building with life is its picture and its life over it,
         one Container at its foot, so the depth pass moves them together */
      const id = ix.o.kinds[ix.o.kind[i]];
      let s = pic;
      if (this.life && wheelLifeReady() && hasLife(id)) {
        s = new Container();
        s.addChild(pic);
        s._pic = pic;
        s._life = new BuildingLife(id, ix.w[i], ix.h[i], ix.ax[i], ix.scl[i]);
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
        const rec = _pages.get(ix.page[i]);
        if (!rec || rec.state !== 'ready') return;
        if (isWheelBroken(i)) return;      /* v2.3.2995: rubble stops nobody */
        for (let b = o.boxOf[i]; b < o.boxOf[i + 1]; b++) {
          /* v2.3.2995: + `oi`, which object: a hit on it is that object's
             (wheelBreak.js), not every one of its kind's */
          out.push({ x0: o.boxes[b * 4], y0: o.boxes[b * 4 + 1], x1: o.boxes[b * 4 + 2], y1: o.boxes[b * 4 + 3], id: o.kinds[o.kind[i]], oi: i });
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
        this.shatter.add(i, tex, { x: o.x[i], y: o.y[i], ax: ix.ax[i], ks: ix.scl[i], flip: !!o.flip[i],
          hitX: ev.x, hitY: ev.y, ang: ev.ang, weapon: ev.weapon, as: ev.as, depth, dust: dustTint(info.tint) });
      }
      /* ...and a burst of what it is made of, thrown all round its foot */
      if (S) {
        if (!S._debrisBursts) S._debrisBursts = [];
        const h = Math.min(ix.h[i] * 0.4, 70);
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
        const A = sh.building ? 0.8 : sh.big ? 1.3 : 2.2;
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
          const x = ix.o.x[i], y = ix.o.y[i], h = ix.h[i], hw = ix.reach[i] * 0.8;
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
      if (ix.page[i] !== k) continue;
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
    try { this.shatter.destroy(); } catch (e) { /* gone */ }
    this._shakes.clear(); this._fadeIn.clear();
    resetWheelBreak();
    if (_live === this) _live = null;
    wheelObjectsFree();
  }
}
let _live = null;

/* ═══ v2.3.2995: AN OBJECT'S PICTURE, FOR WHAT A HIT DOES TO IT ═══ */
/* object i's picture, if its page is in */
function texOf(ix, i) {
  const rec = _pages.get(ix.page[i]);
  if (!rec || rec.state !== 'ready' || !rec.sheet || !rec.sheet.textures) return null;
  const t = rec.sheet.textures[ix.frame[i]];
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
  const ks = ix.scl[i], flip = !!ix.o.flip[i];
  const cs = ks / fp.res, sx = flip ? -cs : cs;
  return { fp, cs, sx, flip, u: (x - ix.o.x[i]) / sx + ix.ax[i] * fp.w, v: (y - ix.o.y[i]) / cs + fp.h };
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
    const cx = ix.o.x[oi] + (cu - ix.ax[oi] * W) * p.sx;
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
  const src = tex.source.resource;
  const W = p.fp.w, H = p.fp.h;
  const R = Math.max(4, Math.round(r / p.cs));
  const S = 2 * R + 1;
  const u0 = Math.round(p.u) - R, v0 = Math.round(p.v) - R;
  const cu0 = Math.max(0, u0), cv0 = Math.max(0, v0), cu1 = Math.min(W, u0 + S), cv1 = Math.min(H, v0 + S);
  if (cu1 - cu0 < 2 || cv1 - cv0 < 2) return null;
  const c = document.createElement('canvas'); c.width = S * 2; c.height = S;
  const g = c.getContext('2d', { willReadFrequently: true });
  try { g.drawImage(src, p.fp.x + cu0, p.fp.y + cv0, cu1 - cu0, cv1 - cv0, cu0 - u0, cv0 - v0, cu1 - cu0, cv1 - cv0); } catch (e) { return null; }
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
    x: ix.o.x[oi] + (u0 + S / 2 - ix.ax[oi] * W) * p.sx,
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
      if (!s2 || s2.destroyed) return null;
      /* (v2.3.2983: a building with life is a Container; its picture is `_pic`) */
      const pic = s2._pic || s2;
      return { layer: s2.parent ? s2.parent.label : null, x: s2.x, y: s2.y, w: Math.abs(pic.width), h: pic.height,
        ax: pic.anchor.x, flip: pic.scale.x < 0, life: s2._life ? s2._life.count() : null,
        /* v2.3.2999: see-through while you stand behind it */
        alpha: +s2.alpha.toFixed(3), crown: !!s2._crown };
    },
    /* v2.3.2995: the broken objects' shards, and an object's shake */
    shards: () => (_live ? _live.shatter.probe() : []),
    shatterStats: () => (_live ? { ..._live.shatter.stats } : null),
    shaking: (i) => !!(_live && _live._shakes.has(i)),
    fading: (i) => (_live && _live._fadeIn.has(i) ? (() => { const s = _live.sprites.get(i); return s ? +s.alpha.toFixed(2) : null; })() : null),
    drawn: (i) => !!(_live && _live.sprites.has(i)),
    /* the footprints the walk test has now, with their object */
    blockers: () => (_live ? _live._blockers.map((b) => ({ ...b })) : []),
    /* the sprite sheets in memory now, by name */
    pagesLoaded: () => {
      const ix = _idx;
      const out = [];
      for (const [k, rec] of _pages) if (rec.state === 'ready') out.push(ix ? ix.pageNames[k] : String(k));
      return out.sort();
    },
  };
}
