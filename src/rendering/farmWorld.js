/* ═══ v2.3.3136: THE FARM YOU WALK ═══
 *
 * The owner, 2026-10-06: "I want your character to be able to walk around on
 * the farm.  I want the planting process to happen by your character taking
 * action on the plot of ground ... Make the timer appear above the crop that
 * was planted and any next steps it needs (next in sequence like 'Needs
 * Watering') etc".
 *
 * Draws your farm (farm_home) from src/data/farmLayout.js, the way the
 * Wheel's objects are drawn (wheelObjects.js):
 *
 *   THINGS   the barn, the owner's props, and the trees, fences and gate
 *            borrowed from the Wheel's object sheets: each a Sprite at its
 *            foot in `entities`, so the depth pass sorts it with you
 *            (depthSort.js) -- walk behind the barn and its roof hides you.
 *            Their footprints go to the walk test at your BOOTS
 *            (worldProps.setZoneBlockerHook), with the farm's edge.
 *   BEDS     each bed's soil -- the plot's stakes on grass, dug, watered,
 *            fertilized or both -- flat on `groundDetails`, and what grows in
 *            it at its stage (sprout, young, nearly grown, ripe: a third of
 *            its time each, by the worker's clock) standing in `entities`.
 *   LABELS   over each bed, on `worldUi` and sized on the screen like the
 *            resources' (nodeLabels.js): its next step as the right stick's
 *            own picture (a spade, a sprout, a watering can, a sack of
 *            compost, a basket) and its timer -- and over the bed you are
 *            nearest, in words: "Needs Digging", "Needs Planting", "4m 12s /
 *            Needs Watering", "Needs Fertilizer", "Ready to Harvest!"
 *            (game/farmWork.js bedNext, the worker's own rules).  Words over
 *            all six ran into each other; the owner's rule for the
 *            resources' labels was "I just don't want the screen to be too
 *            busy with text" (v2.3.3059).
 *   WORK     the bits that fly from your hands as you kneel at a bed
 *            (S._farmWork): dirt, seeds, water, compost, the crop popping up
 *            -- from where the hands meet what stands where the cook's pan is
 *            (effectsRenderer _updateFarmKneel, S._farmHands).
 *   COVERS   those pictures -- the crate of earth, seeds or water and the
 *            straw (public/sprites/skills/farm-cover-*.png) and the compost
 *            bin (a farm picture already): src/data/farmCovers.js.  Loaded
 *            here with the rest, so the effects renderer only looks them up.
 *
 * Nothing here decides anything: the beds are only ever the worker's
 * farm_state (ui/mobile/farmBus.js).
 *
 * MEMORY (CLAUDE.md, "Memory is budgeted").  Every picture is loaded behind
 * the farm's loading screen (preloadFarmArt, from preloadZoneAssets) and let
 * go on the way out (freeFarmArt, from freeZoneAssets); the Wheel's sheets
 * are loaded at an address of the farm's own (`?farm=1`) so the Wheel
 * letting go of its copy never takes the farm's.  docs/specs/farm-walk.md.
 */
import { Sprite, Assets, Container, Graphics, Text, Texture } from 'pixi.js';
import { FARM_THINGS, FARM_BEDS, FARM_CROP_FOOT_DY, farmBlockers } from '../data/farmLayout.js';
import { FARM_ART } from '../data/farmArt.js';
import { farmArtUrl } from '../data/farmArtUrl.js';
import { FARM_COVERS } from '../data/farmCovers.js';   /* v2.3.3136: what stands where the cook's pan is */
import { setFarmCoversReady } from './standIns.js';
import { setZoneBlockerHook } from '../data/worldProps.js';
import { SHADE } from './formShade.js';
import { releaseShadowTextures } from './lightfx/shadows.js';
import { farmBus } from '../ui/mobile/farmBus.js';
import { bedNext, farmClock, farmWorkBeats, cropStageOf, soilOf, FARM_STEPS } from '../game/farmWork.js';
import { playerGroundDy } from './systems/entityRenderer.js';

export const FARM_ZONE_ID = 'farm_home';
const OBJ_BASE = '/world/objects/';
const OBJ_PREFIX = 'farm-object/';
const OBJ_QUERY = '?farm=1';

/* ── the pictures ── (the address is data: src/data/farmArtUrl.js) */
export { farmArtUrl };
const _tex = new Map();       /* 'farm:<name>' / 'obj:<atlas>/<frame>' -> Texture */
const _sheets = new Map();    /* atlas -> sheet url (loaded) */
let _loadP = null;
let _ready = false;
let _gen = 0;
/** Are the farm's pictures in (preloadFarmArt resolved, nothing freed since)? */
export function farmArtReady() { return _ready; }
export const farmArtStats = { loaded: 0, failed: 0, ms: null };

function farmNames() {
  const out = new Set();
  for (const t of FARM_THINGS) if (t.art.indexOf('farm:') === 0) out.add(t.art.slice(5));
  /* every soil and every crop's every stage: a bed can turn to any of them
     while you stand there, and a picture loaded on first sight is a hitch
     (the preloading law) */
  for (const n of Object.keys(FARM_ART)) {
    if (n.indexOf('bed-') === 0 || n === 'plot' || /-(sprout|young|grown|ripe)$/.test(n)) out.add(n);
  }
  /* v2.3.3136: and a cover that is a farm picture (the compost bin) */
  for (const k of Object.keys(FARM_COVERS)) if (FARM_COVERS[k].art) out.add(FARM_COVERS[k].art);
  return [...out];
}
/* the five steps' pictures, the right stick's own (public/ui/controls/),
   drawn once onto a small canvas as they load (nodeLabels.js's way with the
   bag's tools: an SVG with no size of its own is drawn at the size asked) */
const STEP_ICON = (step) => '/ui/controls/farm-' + step + '.svg?v=2.3.3124';
const STEP_ICON_PX = 64;
function loadStepIcon(step) {
  if (typeof Image === 'undefined') return Promise.reject(new Error('no DOM'));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const cv = document.createElement('canvas');
        cv.width = STEP_ICON_PX; cv.height = STEP_ICON_PX;
        cv.getContext('2d').drawImage(img, 0, 0, STEP_ICON_PX, STEP_ICON_PX);
        resolve(Texture.from(cv));
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = STEP_ICON(step);
  });
}
function objAtlases() {
  const out = new Set();
  for (const t of FARM_THINGS) {
    if (t.art.indexOf('obj:') !== 0) continue;
    out.add(t.art.slice(4).split('/')[0]);
  }
  return [...out];
}

/** Every picture the farm draws, loaded: registered in preloadZoneAssets
 *  ('farm_home'), behind the farm's loading screen.  Resolves when all are in
 *  or have failed (a failed one is simply not drawn). */
export function preloadFarmArt() {
  if (_loadP) return _loadP;
  const gen = _gen;
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const jobs = [];
  for (const n of farmNames()) {
    jobs.push(Assets.load(farmArtUrl(n)).then((t) => {
      if (gen !== _gen) return;
      _tex.set('farm:' + n, t);
      farmArtStats.loaded++;
    }, () => { farmArtStats.failed++; }));
  }
  for (const st of FARM_STEPS) {
    jobs.push(loadStepIcon(st).then((t) => {
      if (gen !== _gen) { t.destroy(true); return; }
      _tex.set('icon:' + st, t);
      farmArtStats.loaded++;
    }, () => { farmArtStats.failed++; }));
  }
  for (const a of objAtlases()) {
    const url = OBJ_BASE + a + '.json' + OBJ_QUERY;
    jobs.push(Assets.load({ src: url, data: { cachePrefix: OBJ_PREFIX } }).then((sheet) => {
      if (gen !== _gen) { Assets.unload(url).catch(() => {}); return; }
      _sheets.set(a, url);
      const tx = (sheet && sheet.textures) || {};
      for (const f of Object.keys(tx)) _tex.set('obj:' + a + '/' + f, tx[f]);
      farmArtStats.loaded++;
    }, () => { farmArtStats.failed++; }));
  }
  /* v2.3.3136: the covers -- what stands where the cook's pan is when you
     kneel at a bed (effectsRenderer _updateFarmKneel looks them up by these
     same addresses; the compost bin is a farm picture, loaded above) */
  for (const key of Object.keys(FARM_COVERS)) {
    const c = FARM_COVERS[key];
    if (!c.url) continue;
    jobs.push(Assets.load(c.url).then((t) => {
      if (gen !== _gen) { Assets.unload(c.url).catch(() => {}); return; }
      _tex.set('cover:' + key, t);
      farmArtStats.loaded++;
    }, () => { farmArtStats.failed++; }));
  }
  _loadP = Promise.all(jobs).then(() => {
    if (gen === _gen) {
      _ready = true;
      /* the farmer kneels only with every cover in: a step whose cover is
         missing would show the cook's pan */
      setFarmCoversReady(Object.keys(FARM_COVERS).every((key) => {
        const c = FARM_COVERS[key];
        return c.url ? _tex.has('cover:' + key) : _tex.has('farm:' + c.art);
      }));
    }
    farmArtStats.ms = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
  });
  return _loadP;
}

/** Let every farm picture go: leaving the farm (freeZoneAssets). */
export function freeFarmArt() {
  _gen++;
  _loadP = null;
  _ready = false;
  setFarmCoversReady(false);   /* v2.3.3136 */
  if (!_tex.size && !_sheets.size) return;
  try { releaseShadowTextures(); } catch (e) { /* no shadows yet */ }
  for (const [k, t] of _tex) {
    if (k.indexOf('farm:') === 0) Assets.unload(farmArtUrl(k.slice(5))).catch(() => {});
    else if (k.indexOf('cover:') === 0) { const c = FARM_COVERS[k.slice(6)]; if (c && c.url) Assets.unload(c.url).catch(() => {}); }
    else if (k.indexOf('icon:') === 0) { try { t.destroy(true); } catch (e) { /* gone */ } }
  }
  for (const url of _sheets.values()) Assets.unload(url).catch(() => {});
  _tex.clear();
  _sheets.clear();
  farmArtStats.loaded = 0;
}

function tex(art) { return _tex.get(art) || null; }

/* ── the look of a label, in CSS px (nodeLabels.js's) ── */
const FONT = 'Source Sans 3, sans-serif';
const INK = 0x0B1F2D;
const BRASS = 0xD8AA58;
const LINE_H = 16;
const PAD_X = 6, PAD_Y = 2;
const ICON_PX = 16;
const PILL_H = 20;
/* the bed whose words are spelled out: the one you are at, else the nearest
   whose middle is within this of your boots (game px) */
const WORDS_R = 260;
const STEP_FILL = Object.freeze({
  dig: '#E8D2A8', plant: '#B8E59A', water: '#8FD3FF', feed: '#E3B873', harvest: '#7BE495', wait: '#F4F0E7',
});
const SCALE_MIN = 0.25, SCALE_MAX = 4;
const BODY_HALF_W = 22, BODY_UP = 96, BODY_DOWN = 50, CLEAR = 6;

function _dpr() { return (typeof window !== 'undefined' && window.devicePixelRatio) || 1; }

/* ── the renderer ── */
let _live = null;
export class FarmWorld {
  constructor(layers) {
    _live = this;
    this.layers = layers;
    this.things = [];
    this.beds = FARM_BEDS.map((b, i) => ({ i, b, soil: null, crop: null, label: null, soilName: '', cropName: '', key: '' }));
    this.bits = [];
    this._work = null;
    this._built = false;
    /* the walk test: the things' footprints and the farm's edge, at your boots */
    this._blockers = farmBlockers();
    this._offHook = setZoneBlockerHook((zoneId) => (zoneId === FARM_ZONE_ID ? this._blockers : null));
  }

  _build() {
    if (this._built) return;
    let missing = 0;
    for (const t of FARM_THINGS) {
      if (this.things.some((s) => s._farmThing === t)) continue;
      const tx = tex(t.art);
      if (!tx) { missing++; continue; }
      const sp = new Sprite(tx);
      if (t.art.indexOf('farm:') === 0) {
        const a = FARM_ART[t.art.slice(5)];
        sp.anchor.set(a ? a.foot[0] / a.w : 0.5, a ? a.foot[1] / a.h : 1);
        sp.scale.set(0.5);   /* the owner's pictures: 2 picture px a game px, loaded at 1 */
      } else {
        /* the Wheel's sheets carry their own resolution (meta.scale 2) and
           their feet as each frame's anchor */
        const da = tx.defaultAnchor;
        sp.anchor.set(da ? da.x : 0.5, da ? da.y : 1);
      }
      if (t.flip) sp.scale.x = -sp.scale.x;
      sp._vShade = SHADE.prop;
      sp.x = t.x; sp.y = t.y;
      sp.label = 'farmThing';
      sp._farmThing = t;
      this.layers.entities.addChild(sp);
      this.things.push(sp);
    }
    if (!missing) this._built = true;
  }

  /* the bed's soil and its crop, as the worker says they are */
  _bed(B, p, now) {
    const soilName = p && p.s !== 'rough' ? soilOf(p) : 'plot';
    if (B.soilName !== soilName) {
      const t = tex('farm:' + soilName);
      if (t) {
        if (!B.soil || B.soil.destroyed) {
          B.soil = new Sprite(t);
          B.soil.label = 'farmBedSoil';
          B.soil.scale.set(0.5);
          this.layers.groundDetails.addChild(B.soil);
        } else B.soil.texture = t;
        const a = FARM_ART[soilName];
        B.soil.anchor.set(a ? a.foot[0] / a.w : 0.5, a ? a.foot[1] / a.h : 0.5);
        B.soil.x = B.b.x + B.b.w / 2;
        B.soil.y = B.b.y + B.b.h / 2;
        B.soilName = soilName;
      }
    }
    const cropName = p && p.s === 'planted' && p.crop ? p.crop + '-' + cropStageOf(p, now) : '';
    if (B.cropName !== cropName) {
      const t = cropName ? tex('farm:' + cropName) : null;
      if (!t) {
        if (B.crop && !B.crop.destroyed) B.crop.visible = false;
      } else {
        if (!B.crop || B.crop.destroyed) {
          B.crop = new Sprite(t);
          B.crop.label = 'farmCrop';
          B.crop.scale.set(0.5);
          B.crop._vShade = SHADE.prop;
          this.layers.entities.addChild(B.crop);
        } else B.crop.texture = t;
        const a = FARM_ART[cropName];
        B.crop.anchor.set(a ? a.foot[0] / a.w : 0.5, a ? a.foot[1] / a.h : 1);
        B.crop.x = B.b.x + B.b.w / 2;
        B.crop.y = B.b.y + FARM_CROP_FOOT_DY;
        B.crop.visible = true;
      }
      B.cropName = cropName;
    }
  }

  _label(B, S, p, now, hide, full) {
    const n = bedNext(p, now);
    const timer = n.left != null ? farmClock(n.left) : '';
    const step = n.step || (n.left != null ? 'wait' : '');
    /* the picture: the step's own -- the stick's -- or, with nothing to do
       but wait, the crop's */
    const iconArt = n.step ? 'icon:' + n.step : (p && p.crop ? 'farm:' + p.crop + '-ripe' : '');
    /* the words: over the bed you are nearest, its timer and its step; over
       the rest the timer alone (or "Ready!"), the picture saying the step */
    const lines = [];
    if (full) {
      if (timer) lines.push([timer, '#F4F0E7']);
      if (n.words) lines.push([n.words, STEP_FILL[step] || '#F4F0E7']);
    } else if (n.ripe) lines.push(['Ready!', STEP_FILL.harvest]);
    else if (timer) lines.push([timer, '#F4F0E7']);
    let root = B.label;
    if (!root || root.destroyed) {
      root = new Container();
      root.label = 'farmBedLabel';
      root.eventMode = 'none';
      const bg = new Graphics();
      root.addChild(bg);
      const icon = new Sprite(Texture.EMPTY);
      icon.anchor.set(0.5, 0.5);
      root.addChild(icon);
      const top = new Text({ text: '', style: { fontFamily: FONT, fontSize: 13, fontWeight: '800', fill: '#F4F0E7' } });
      top.anchor.set(0, 0.5);
      root.addChild(top);
      const bot = new Text({ text: '', style: { fontFamily: FONT, fontSize: 12, fontWeight: '800', fill: '#8FD3FF' } });
      bot.anchor.set(0, 0.5);
      root.addChild(bot);
      root._fl = { bg, icon, top, bot, key: '', scale: 0, res: 0, w: 0, h: 0, dx: 0, words: [] };
      this.layers.worldUi.addChild(root);
      B.label = root;
    }
    const L = root._fl;
    /* laid out in CSS px with the label's foot at (0, 0), again only when
       what it says changes */
    /* (whether its picture has come in yet is part of it: a label laid out
       under the loading screen, before its picture, is laid out again) */
    const it = iconArt ? tex(iconArt) : null;
    const key = lines.map((l) => l[0] + l[1]).join('|') + '|' + step + '|' + (it ? '' : '-') + '|' + iconArt;
    if (L.key !== key) {
      L.key = key;
      L.words = lines.map((l) => l[0]);
      L.icon.texture = it || Texture.EMPTY;
      L.icon.visible = !!it;
      const rows = [L.top, L.bot];
      rows.forEach((t, li) => {
        const l = lines[li];
        t.visible = !!l;
        if (l) { t.text = l[0]; t.style.fill = l[1]; t.style.fontSize = li === 0 && lines.length > 1 ? 13 : 12; }
      });
      const textW = lines.length ? Math.max(...lines.map((l, li) => rows[li].width)) : 0;
      const ripe = step === 'harvest';
      L.bg.clear();
      if (!lines.length) {
        /* the picture alone, on a disc */
        L.w = PILL_H; L.h = PILL_H;
        L.bg.circle(0, -PILL_H / 2, PILL_H / 2);
        L.bg.fill({ color: INK, alpha: 0.78 });
        L.bg.stroke({ color: BRASS, width: 1, alpha: 0.6 });
        if (it) { L.icon.scale.set(ICON_PX / Math.max(it.width, it.height)); L.icon.x = 0; L.icon.y = -PILL_H / 2; }
      } else {
        const iconW = it ? ICON_PX + 4 : 0;
        const h = lines.length > 1 ? PAD_Y * 2 + LINE_H * 2 : PILL_H;
        const w = PAD_X * 2 + iconW + textW;
        L.w = w; L.h = h;
        const x0 = -w / 2;
        L.bg.roundRect(x0, -h, w, h, Math.min(10, h / 2));
        L.bg.fill({ color: INK, alpha: 0.82 });
        L.bg.stroke({ color: ripe ? 0x7BE495 : BRASS, width: 1, alpha: ripe ? 0.9 : 0.55 });
        let x = x0 + PAD_X;
        if (it) {
          L.icon.scale.set(ICON_PX / Math.max(it.width, it.height));
          L.icon.x = x + ICON_PX / 2; L.icon.y = -h / 2;
          x += iconW;
        }
        lines.forEach((l, li) => {
          const t = rows[li];
          t.x = x;
          t.y = lines.length > 1 ? -h + PAD_Y + LINE_H * (li + 0.5) : -h / 2;
        });
      }
    }
    if (hide) { root.visible = false; return; }
    /* screen-sized: one CSS px of label is 1/worldScale world px */
    const ws = (S && S._worldScaleX) || 1;
    const sc = Math.min(SCALE_MAX, Math.max(SCALE_MIN, 1 / ws));
    if (L.scale !== sc) { L.scale = sc; root.scale.set(sc); }
    const res = Math.min(4, Math.max(1, _dpr() * sc * ws));
    if (L.res !== res) { L.res = res; L.top.resolution = res; L.bot.resolution = res; }
    /* over the bed, or over what grows in it if that stands taller */
    const cx = B.b.x + B.b.w / 2;
    let footY = B.b.y - 8;
    if (B.crop && !B.crop.destroyed && B.crop.visible) {
      const top = B.crop.y - B.crop.height * (B.crop.anchor ? B.crop.anchor.y : 1);
      footY = Math.min(footY, top - 6);
    }
    /* a label that would lie over your bro slides out to the side away from
       you, eased (nodeLabels.js's rule) */
    let want = 0;
    const P = S && S.player;
    if (P && typeof P.x === 'number') {
      const half = L.w * sc / 2, top = footY - L.h * sc;
      const bx0 = P.x - BODY_HALF_W, bx1 = P.x + BODY_HALF_W;
      if (footY > P.y - BODY_UP && top < P.y + BODY_DOWN && cx + half > bx0 && cx - half < bx1) {
        want = P.x >= cx ? (bx0 - CLEAR - half) - cx : (bx1 + CLEAR + half) - cx;
      }
    }
    L.dx += (want - L.dx) * 0.35;
    if (Math.abs(want - L.dx) < 0.5) L.dx = want;
    root.x = cx + L.dx;
    root.y = footY;
    root.visible = true;
  }

  /* the bits that fly from the hands, at each lean of a step (S._farmWork) */
  _workFx(S, now) {
    const w = S && S._farmWork;
    if (!w) { this._work = null; return; }
    if (this._work !== w) { this._work = w; w._beat = 0; w._beats = farmWorkBeats(w.doneAt - w.startedAt); }
    const t = now - w.startedAt;
    while (w._beat < w._beats.length && t >= w._beats[w._beat]) {
      w._beat++;
      this._burst(S, w, now);
    }
  }

  _burst(S, w, now) {
    const B = this.beds[w.bed];
    if (!B) return;
    /* from the mouth of what stands where the cook's pan is -- the crate's
       opening, the bin's compost (effectsRenderer _updateFarmKneel); the bed's
       back if it is not drawn */
    const h = w.step !== 'harvest' && S && S._farmHands && now - S._farmHands.at < 250 ? S._farmHands : null;   /* a harvest's leaves fly from the crop */
    const hx = h ? h.x : B.b.x + B.b.w / 2, hy = h ? h.y : B.b.y + 16;
    /* sized to be SEEN at the farm's zoom (~0.5 CSS px a game px): a clod
       is 2-4 CSS px, as a pixel of the bro's own art is */
    const KINDS = {
      dig: { n: 9, cols: [0x8A5A2B, 0xAB7132, 0x6B4423, 0xC08A4A], up: 1.0, spread: 1.0, size: [5, 8] },
      plant: { n: 6, cols: [0xD9C27A, 0xBFA35E, 0x9BD46A], up: 0.55, spread: 0.6, size: [4, 6] },
      water: { n: 10, cols: [0x8FD3FF, 0xBFE8FF, 0x5FB4F0], up: 0.85, spread: 0.9, size: [4, 7] },
      feed: { n: 8, cols: [0x4A3420, 0x6B4C2A, 0x7C8C3A, 0x3A2A18], up: 0.6, spread: 0.8, size: [4, 7] },
      harvest: { n: 8, cols: [0x6FBF4A, 0x8FD45A, 0x4E9A33], up: 1.1, spread: 0.9, size: [5, 8] },
    };
    const k = KINDS[w.step] || KINDS.dig;
    const seed = (w.startedAt % 997) + w._beat * 31;
    for (let i = 0; i < k.n; i++) {
      const r1 = ((seed * 9301 + i * 49297) % 233280) / 233280;
      const r2 = ((seed * 7919 + i * 104729) % 233280) / 233280;
      const g = new Graphics();
      const sz = k.size[0] + (k.size[1] - k.size[0]) * r2;
      g.rect(-sz / 2, -sz / 2, sz, sz);
      g.fill({ color: k.cols[i % k.cols.length] });
      g.x = hx + (r1 - 0.5) * 30;
      g.y = hy;
      /* in front of the kneeling farmer and what stands beside him (both on
         gestureFront, created before these), flying up from the hands */
      (this.layers.gestureFront || this.layers.projectiles || this.layers.particles).addChild(g);
      this.bits.push({ g, vx: (r1 - 0.5) * 140 * k.spread, vy: -(90 + r2 * 120) * k.up, born: now, life: 520 + r2 * 260, y0: hy + 6 });
    }
  }

  _bitsTick(now, dt) {
    for (let i = this.bits.length - 1; i >= 0; i--) {
      const b = this.bits[i];
      const age = now - b.born;
      if (age > b.life || b.g.destroyed) {
        try { b.g.destroy(); } catch (e) { /* gone */ }
        this.bits.splice(i, 1);
        continue;
      }
      b.vy += 520 * dt;
      b.g.x += b.vx * dt;
      b.g.y = Math.min(b.y0, b.g.y + b.vy * dt);
      if (b.g.y >= b.y0) { b.vx *= 0.6; }
      b.g.alpha = Math.max(0, 1 - Math.max(0, age - b.life * 0.6) / (b.life * 0.4));
    }
  }

  update(S, now) {
    if (!S || S.currentZone !== FARM_ZONE_ID) return;
    this._build();
    const view = farmBus.view;
    const sNow = farmBus.serverNow();
    const working = S._farmWork ? S._farmWork.bed : -1;
    const on = !!(S._serverCaps && S._serverCaps.farm);
    /* the bed that says its step in words: the one you are at, else the
       nearest within WORDS_R of your boots */
    let wordsAt = S._nearBed ? S._nearBed.i : -1;
    if (wordsAt < 0 && S.player) {
      const fy = S.player.y + playerGroundDy(S.currentZone, S.player.x, S.player.y);
      let best = WORDS_R;
      for (const B of this.beds) {
        const d = Math.hypot(S.player.x - (B.b.x + B.b.w / 2), fy - (B.b.y + B.b.h / 2));
        if (d < best) { best = d; wordsAt = B.i; }
      }
    }
    for (const B of this.beds) {
      const p = on && view && view.plots ? view.plots[B.i] : null;
      /* a farm the worker has not described yet (or has switched off) is
         shown as its plots of grass, with no words over them */
      this._bed(B, p, sNow);
      if (B.label || (on && view)) this._label(B, S, p, sNow, !on || !view || working === B.i || B.i >= ((view && view.beds) || 0), wordsAt === B.i);
      if (B.soil && !B.soil.destroyed) B.soil.visible = !view || B.i < view.beds;
    }
    const dt = this._t != null ? Math.min(0.05, (now - this._t) / 1000) : 0;
    this._t = now;
    this._workFx(S, now);
    this._bitsTick(now, dt);
  }

  /** QA (mp-farmwalk): what is drawn, read-only. */
  probe() {
    return {
      things: this.things.length, built: this._built,
      beds: this.beds.map((B) => ({
        soil: B.soilName, crop: B.cropName,
        label: B.label && !B.label.destroyed && B.label.visible ? B.label._fl.words.slice() : null,
        icon: B.label && !B.label.destroyed && B.label.visible && B.label._fl.icon.visible ? (B.label._fl.key.split('|').pop() || null) : null,
      })),
      bits: this.bits.length,
      blockers: this._blockers.length,
    };
  }

  destroy() {
    if (_live === this) _live = null;
    if (this._offHook) { try { this._offHook(); } catch (e) { /* gone */ } this._offHook = null; }
    for (const s of this.things) { try { s.destroy(); } catch (e) { /* gone */ } }
    this.things = [];
    for (const B of this.beds) {
      for (const k of ['soil', 'crop']) { if (B[k]) { try { B[k].destroy(); } catch (e) { /* gone */ } B[k] = null; } }
      if (B.label) { try { B.label.destroy({ children: true, texture: false, textureSource: false }); } catch (e) { /* gone */ } B.label = null; }
    }
    for (const b of this.bits) { try { b.g.destroy(); } catch (e) { /* gone */ } }
    this.bits = [];
  }
}

/* ═══ THE FARM'S SHADOWS ═══
   The farm is lit as the Wheel is (zoneLight.js farm_home: the Wheel's sun,
   the commons' shade), and its things cast as the Wheel's do
   (wheelObjects.js wheelObjectCasters): the barn column by column, from its
   picture's own base (a building's shadow starts at its walls), everything
   else -- trees, props, what grows in the beds -- a billboard pivoted at its
   foot.  Called by lightfx/casters.js; nothing outside the farm. */
export function farmCasters(out) {
  const w = _live;
  if (!w) return;
  for (const s of w.things) {
    if (!s || s.destroyed || !s.visible) continue;
    const tex = s.texture;
    if (!tex || tex.destroyed || !tex.source || tex.source.destroyed) continue;
    const t = s._farmThing;
    if (t && t.art === 'farm:barn') {
      let c = s._caster;
      if (!c) {
        c = s._caster = { key: 'farm:barn', depth: { spr: { texture: null, x: 0, y: 0, scale: { x: 1, y: 1 } }, g: { base: 0, bottoms: null },
          back: t.y + t.block[1], pieces: null }, alive: true };
      }
      const d = c.depth, sp = d.spr;
      sp.texture = tex;
      sp.x = s.x + (0.5 - s.anchor.x) * tex.frame.width * s.scale.x;
      sp.y = s.y;
      sp.scale.x = s.scale.x; sp.scale.y = s.scale.y;
      d.g.base = sp.y;
      out.push(c);
      continue;
    }
    /* the low and flat (flowers, the gate's own ground line) cast nothing a
       pixel tall enough to matter; a fence's shadow is its own (cheap) */
    if (!s._caster) s._caster = { key: 'farm:' + w.things.indexOf(s), px: 0, py: 0, sprites: [s], alive: true, noHold: true };
    s._caster.px = s.x; s._caster.py = s.y - 4;
    out.push(s._caster);
  }
  for (const B of w.beds) {
    const s = B.crop;
    if (!s || s.destroyed || !s.visible) continue;
    if (!s._caster) s._caster = { key: 'farm:crop:' + B.i, px: 0, py: 0, sprites: [s], alive: true, noHold: true };
    s._caster.px = s.x; s._caster.py = s.y - 2;
    s._caster.sprites[0] = s;
    out.push(s._caster);
  }
}
