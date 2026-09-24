/* ═══ v2.3.2811-2814: THE WORLD'S SMALL MOTIONS ═══
 *
 * Owner: "I'm looking for a liveness pass.  Basically making things move a
 * little in a way that makes sense for whatever object it is.  Maybe a tree
 * swaying a bit, etc. ... From ambient effects to subtle animations that
 * enhance the experience."
 *
 * Everything here is a small motion laid over art that already exists, and
 * each one moves the way ITS object would:
 *
 *   trees, pines, shrubs   sway from the ground up in the same wind that
 *                          blows the dust and the clouds (windAt), with gusts
 *                          that TRAVEL -- a gust front rolls across a stand of
 *                          trees downwind rather than every trunk leaning at
 *                          once.  Each one is a damped spring with its own
 *                          natural period (a shrub is quick, a pine slow), so
 *                          they sway out of step and settle back after a gust.
 *                          A chop kicks the spring and shakes needles loose.
 *   the frost canopies     the near-camera branches bob about the edge they
 *                          hang from (never about their middle: the cut edge
 *                          must stay off the map).
 *   hanging signs, crates  swing on their chains, pendulum-slow for the heavy
 *                          AUCTION HOUSE board, quicker for the smith's small
 *                          shield.  The pieces were cut out of the building
 *                          art by tools/cut_prop_parts.py (see there).
 *   flags                  wave from the pole, faster in a stronger wind.
 *   the forge              smokes from its chimney (the painted smoke was cut
 *                          out, so this is the only smoke), spits sparks from
 *                          the chimney and the furnace.
 *   flames and lamps       flicker by DAY too -- at night worldFx lights them.
 *   the mayor's waterfalls run: light streaks slide down each fall and foam
 *                          at its foot; the lion and the fish pour.
 *   gold                   the bank's coins (and the mayor's and the auction
 *                          house's gilt) catch the light now and then.
 *   people, monsters       an NPC standing still breathes; so does a monster
 *                          that has stopped (its walk sheet holds one frame).
 *   dropped coins, ore     glint.
 *
 * ── RULES IT KEEPS ──
 *  - DISPLAY ONLY.  Nothing here is read by combat, collision, the depth
 *    pass or the network.  A sway is SKEW about the sprite's own bottom-centre
 *    anchor, so the ground point -- which is what the depth sort, the
 *    footprints and every hit-test read -- never moves.
 *  - Nothing is created per frame: fixed pools that hide what they do not use.
 *  - Everything is minted or loaded on the loading screen (preloadWorldLife,
 *    registered in preloadWorldAnimations) -- the preloading LAW.
 *  - window.__btAmbienceOff (the QA harness's calm switch, see worldFx) turns
 *    every motion off and leaves every piece AT REST, so a building still has
 *    its sign and its flags in a screenshot.  window.__btLifeRate slows this
 *    module's own clock for filming (1 = real time); nothing in the game sets
 *    it.
 *  - The pieces stuck onto a building ride a container that stands on the
 *    SAME ground line as the building (plus one pixel, so it always sorts just
 *    after it) and lives in the same layer, so the depth pass puts a sign
 *    behind you exactly when it puts its building behind you.  v2.3.2816: it
 *    names its host (`_ridesOn`) and the depth pass sorts it a quarter step
 *    after it, under a figure the pass raises over that building (TRAPS §115).
 *  - v2.3.2816: the pieces take the building's form shade (formShade.js) --
 *    see _buildRider.
 */
import { Container, Sprite, Texture, Rectangle, MeshPlane, Assets } from 'pixi.js';
import { windAt, dayPhase, lightingAt } from '@/game/timeOfDay.js';
import { PROP_PARTS, PROP_PART_SHEETS } from '@/data/propParts.js';
import { propsForZone, foregroundForZone } from '@/data/worldProps.js';
import { PROP_LIGHTS } from './worldFx.js';
import { SHADE, formShadeOn } from './formShade.js';
import { readArtBottoms } from './propGround.js';
import { npcArtUrl } from './npcSprites.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const own = (o, k) => k != null && Object.prototype.hasOwnProperty.call(o, k);

/* A stable 0..1 number from anything with a position or an id, so two trees
   never sway in step and a reload sways them the same way. */
function hash01(a, b) {
  let h = (Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x7f4a7c15, 0xc2b2ae35)) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

/* v2.3.2816: formShade's prop gradient at height t of a building (0 its top,
   1 its base), as a tint -- the colour its own quad takes at that row. */
function shadeTintAt(t) {
  const a = SHADE.prop.top, b = SHADE.prop.bot;
  const k = Math.max(0, Math.min(1, t));
  const ch = (i) => Math.max(0, Math.min(255, Math.round(255 * (a[i] + (b[i] - a[i]) * k))));
  return (ch(0) << 16) | (ch(1) << 8) | ch(2);
}

/* ─────────────────────────── textures ─────────────────────────── */

const FX = Object.create(null);      /* puff, glow, star, spark, dot, needle, streak */
const PART = Object.create(null);    /* propId -> partId -> Texture */
let _ready = null;

function mintFxSheet() {
  if (typeof document === 'undefined') return;
  const W = 96, H = 32;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const d = img.data;
  const put = (x, y, v, a) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const k = (y * W + x) * 4;
    const na = Math.max(d[k + 3] / 255, a);
    d[k] = d[k + 1] = d[k + 2] = Math.round(Math.max(0, Math.min(255, v)));
    d[k + 3] = Math.round(Math.min(1, na) * 255);
  };
  const sm = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  /* puff, 32x32 at (0,0): three overlapping lobes, lit from the upper left,
     soft at the rim -- the painted smoke's own look, drawn grey-on-grey so a
     tint sets its colour */
  const lobes = [[16, 15, 10.5], [10.5, 18.5, 7.5], [21.5, 19, 7.5], [15.5, 21.5, 7]];
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      let dens = 0, nx = 0, ny = 0;
      for (const [cx, cy, r] of lobes) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, dd = Math.hypot(dx, dy);
        const k = 1 - sm(r - 2.2, r + 0.6, dd);
        if (k > dens) { dens = k; nx = dx / r; ny = dy / r; }
      }
      if (dens <= 0.01) continue;
      const lit = 0.78 + 0.22 * Math.max(-1, Math.min(1, -nx * 0.55 - ny * 0.85));
      put(x, y, 255 * lit, dens * 0.92);
    }
  }
  /* glow, 32x32 at (32,0): a light's soft round falloff */
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const t = Math.hypot(x + 0.5 - 16, y + 0.5 - 16) / 16;
      if (t >= 1) continue;
      put(32 + x, y, 255, Math.pow(1 - t, 2.1));
    }
  }
  /* star, 16x16 at (64,0): a four-point glint, thin crisp arms and a hot
     middle, the shape light takes on a polished coin */
  for (let i = -7; i <= 7; i++) {
    const a = Math.pow(1 - Math.abs(i) / 7.5, 1.6);
    put(64 + 8 + i, 8, 255, a);
    put(64 + 8, 8 + i, 255, a);
    if (Math.abs(i) <= 3) { put(64 + 8 + i, 7, 255, a * 0.35); put(64 + 8 + i, 9, 255, a * 0.35); put(64 + 7, 8 + i, 255, a * 0.35); put(64 + 9, 8 + i, 255, a * 0.35); }
  }
  put(72, 8, 255, 1);
  /* spark, 8x8 at (80,0) */
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const t = Math.hypot(x + 0.5 - 4, y + 0.5 - 4) / 3.6;
      if (t < 1) put(80 + x, y, 255, Math.pow(1 - t, 1.4));
    }
  }
  /* dot, 4x4 at (88,0) */
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const t = Math.hypot(x + 0.5 - 2, y + 0.5 - 2) / 2;
      if (t < 1) put(88 + x, y, 255, 1 - t * t);
    }
  }
  /* needle, 3x1 at (92,0) */
  for (let x = 0; x < 3; x++) put(92 + x, 0, 255, 1);
  /* streak, 3x16 at (80,16): a sliver of light running down falling water */
  for (let y = 0; y < 16; y++) {
    const a = y < 11 ? sm(0, 11, y) : 1 - sm(11, 16, y);
    put(81, 16 + y, 255, a);
    put(80, 16 + y, 255, a * 0.35);
    put(82, 16 + y, 255, a * 0.35);
  }
  g.putImageData(img, 0, 0);
  const base = Texture.from(c);
  try { base.source.scaleMode = 'linear'; } catch (e) { /* older pixi */ }
  const cut = (x, y, w, h) => new Texture({ source: base.source, frame: new Rectangle(x, y, w, h) });
  FX.puff = cut(0, 0, 32, 32);
  FX.glow = cut(32, 0, 32, 32);
  FX.star = cut(64, 0, 16, 16);
  FX.spark = cut(80, 0, 8, 8);
  FX.dot = cut(88, 0, 4, 4);
  FX.needle = cut(92, 0, 3, 1);
  FX.streak = cut(80, 16, 3, 16);
}

/** Load the cut building pieces and mint the effect textures.  Awaited by
 *  the intro gate (preloadWorldAnimations): town is a resident hub, so its
 *  buildings' pieces are global like the buildings themselves. */
export function preloadWorldLife() {
  if (_ready) return _ready;
  _ready = (async () => {
    try { mintFxSheet(); } catch (e) { console.warn('[worldLife] fx mint failed', e && e.message); }
    const sheets = Object.create(null);
    await Promise.allSettled(Object.keys(PROP_PART_SHEETS).map(async (k) => {
      const sh = PROP_PART_SHEETS[k];
      const tex = await Assets.load({ src: npcArtUrl(sh.url), data: { resolution: sh.res } });
      if (!tex || !tex.source) return;
      /* the swing sheet is stored 2x and drawn LINEAR, the flags 1x NEAREST
         -- the reason is in tools/cut_prop_parts.py (SHEETS) */
      try { tex.source.scaleMode = sh.res > 1 ? 'linear' : 'nearest'; } catch (e) { /* older pixi */ }
      sheets[k] = tex.source;
    }));
    for (const propId of Object.keys(PROP_PARTS)) {
      const set = Object.create(null);
      for (const p of PROP_PARTS[propId].parts) {
        const src = sheets[p.kind];
        if (!src || !p.frame) continue;
        const [x, y, w, h] = p.frame;
        set[p.id] = new Texture({ source: src, frame: new Rectangle(x, y, w, h) });
      }
      PART[propId] = set;
    }
    return true;
  })();
  return _ready;
}

/* ─────────────────────────── the wind ─────────────────────────── */

/* A gust front: 0 until it arrives, a quick rise, a long ease back.  `p`
   grows as the front passes a point. */
function front(p) {
  const u = p - Math.floor(p);
  if (u < 0.05) return u / 0.05;
  if (u < 0.34) { const d = (u - 0.05) / 0.29; return (1 - d) * (1 - d); }
  return 0;
}
/** How hard the gusts are blowing at (x, y): 0..1.  Two trains of fronts
 *  rolling DOWNWIND at 70 px/s, 8 and 13 s apart at any one spot, each
 *  weaker or stronger than the last -- so a gust visibly travels across a
 *  stand of trees, and no two are the same. */
export function gustAt(x, y, t, wind) {
  const ux = Math.cos(wind.ang), uy = Math.sin(wind.ang);
  const s = x * ux + y * uy;
  const g1 = front((t * 70 - s) / 560);
  const g2 = front((t * 70 - s) / 910 + 0.37);
  const k = 0.6 + 0.4 * Math.sin(t / 13 + s / 1500);
  return Math.min(1, (g1 * 0.85 + g2 * 0.65) * k);
}

/* How each kind of thing moves.  Degrees at the TOP of the object.
   f0 is the natural sway frequency (Hz), zeta its damping. */
const SWAY = {
  tree:   { f0: 0.42, zeta: 0.12, lean: 0.55, turb: 0.42, gust: 1.5, max: 3.4 },
  pine:   { f0: 0.36, zeta: 0.14, lean: 0.45, turb: 0.34, gust: 1.2, max: 2.8 },
  shrub:  { f0: 0.9,  zeta: 0.2,  lean: 0.9,  turb: 0.9,  gust: 2.2, max: 4.5 },
  canopy: { f0: 0.3,  zeta: 0.28, lean: 0.2,  turb: 0.28, gust: 0.55, max: 1.2 },
};
/* Which props sway, and how (the rocks and the ice do not). */
const PROP_SWAY = Object.create(null);
PROP_SWAY['frost-pine-pair'] = 'pine';
PROP_SWAY['frost-pine-ridge'] = 'pine';
PROP_SWAY['frost-snow-shrubs'] = 'shrub';
/* The near-camera pieces that sway, and the point on each they hang from,
   in the art's own (unflipped) texture fractions -- the edge that is cut and
   runs off the map (ZONE_FOREGROUND in worldProps.js).  The mountain crag
   does not move. */
const FG_SWAY = Object.create(null);
FG_SWAY['fg-canopy-e'] = { u: 0, v: 0.5 };     /* cut on its left, i.e. its east edge once mirrored */
FG_SWAY['fg-canopy-sw'] = { u: 0, v: 1 };      /* cut bottom and left: the corner */

function springStep(st, target, dt, f0, zeta) {
  const w = TAU * f0;
  const n = Math.max(1, Math.ceil(dt * 60));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const a = -w * w * (st.th - target) - 2 * zeta * w * st.om;
    st.om += a * h;
    st.th += st.om * h;
  }
}

/* How a hanging piece swings: amplitude (deg) and how long its chain is,
   which sets the pendulum's period.  A heavy board barely moves. */
const SWING = {
  'forge/sign':           { amp: 2.4, len: 60 },
  'auction-house/sign':   { amp: 0.8, len: 150 },
  'auction-house/banner': { amp: 1.1, len: 70 },
  'auction-house/scales': { amp: 2.0, len: 110 },
  'bank/crate':           { amp: 1.5, len: 90 },
};
const PEND_G = 770;   /* world px / s^2: a 60 px chain swings in ~1.75 s */

/* ─── the buildings' live effects, in the ORIGINAL texture px ─── */
const FALLS = Object.create(null);
/* v2.3.2813: every fall on the mayor's house, measured off the art: a path
   down the water and its width.  Light streaks slide down each; foam at the
   foot of each. */
FALLS['mayor-house'] = [
  { pts: [[97, 246], [97, 288]], w: 15 },
  { pts: [[101, 292], [101, 337]], w: 18 },
  { pts: [[106, 341], [106, 373]], w: 17 },
  { pts: [[209, 149], [209, 207]], w: 23 },
  { pts: [[206, 227], [206, 281]], w: 23 },
  { pts: [[154, 312], [154, 338]], w: 9 },
  { pts: [[238, 229], [240, 238], [241, 249]], w: 7 },                           /* the lion */
  { pts: [[466, 351], [473, 355], [476, 364], [477, 376], [478, 388]], w: 6 },   /* the fish */
];
const SMOKE = Object.create(null);
/* sized off the chimney mouth (~60 texels across): a puff leaves it about
   half as wide and has spread past it by the time it thins out */
SMOKE.forge = [{ x: 156, y: 66, rate: 3.8, size: [30, 88], rise: 20, life: 5.0 }];
const SPARKS_EXTRA = Object.create(null);
SPARKS_EXTRA.forge = [{ x: 156, y: 70, rate: 1.1, spread: 9, up: 1 }];
const GLINT_RATE = { bank: 2.2, 'mayor-house': 0.45, 'auction-house': 0.6 };

/* ─────────────────────────── the module ─────────────────────────── */

export class WorldLife {
  constructor(layers) {
    this.layers = layers || {};
    this._t = 0;
    this._last = 0;
    this._sway = new WeakMap();          /* display object -> spring */
    this._riders = new Map();            /* prop id -> building rider */
    this._ore = new Map();               /* ore sprite -> rider */
    this._npc = new WeakMap();           /* npc figure -> { sx, sy, lx, ly, still } */
    this._probe = null;
    /* the FX textures are minted on the loading screen, after this is built,
       so a pool names its texture and looks it up when it hands one out */
    this._sparks = this._pool(this.layers.glows || this.layers.particles, 'spark', 48, 'add');
    this._needles = this._pool(this.layers.particles, 'needle', 40, 'normal');
    this._lootGlints = this._pool(this.layers.groundLoot, 'star', 10, 'add');
    this._errs = Object.create(null);
    if (typeof window !== 'undefined') {
      const self = this;
      window.__btWorldLife = () => self._probe;
      /* v2.3.2816, QA (mp-liveness's shade check): where a building and each
         of its pieces are on the page, in CSS px, and a way to hide one piece
         so a test can find its pixels by what disappears.  Asked on demand,
         never per frame. */
      window.__btWorldLifeRects = (id) => {
        const r = self._riders.get(id);
        const host = r && r.c._ridesOn;
        if (!r || !host || host.destroyed || !r.c.visible) return null;
        const cv = typeof document !== 'undefined' && document.querySelector('canvas');
        const off = cv ? cv.getBoundingClientRect() : { left: 0, top: 0 };
        const box = (o) => { const b = o.getBounds(); return { x: b.x + off.left, y: b.y + off.top, w: b.width, h: b.height }; };
        return { host: box(host), parts: r.parts.map((P) => ({ id: P.id, kind: P.kind, box: box(P.s || P.m), tint: (P.s || P.m).tint })) };
      };
      window.__btWorldLifeHide = (id, partId, hide) => {
        const r = self._riders.get(id);
        const P = r && r.parts.find((q) => q.id === partId);
        if (!P) return false;
        (P.s || P.m).visible = !hide;
        return true;
      };
    }
  }

  _pool(layer, key, n, blend) {
    const items = [];
    const holder = new Container();
    holder.label = 'worldLife';
    if (layer) layer.addChild(holder);
    return { holder, items, key, n, blend, next: 0 };
  }
  _take(pool) {
    const tex = FX[pool.key];
    if (pool.items.length < pool.n) {
      const s = new Sprite(tex || Texture.EMPTY);
      s.anchor.set(0.5);
      s.blendMode = pool.blend;
      s.visible = false;
      pool.holder.addChild(s);
      pool.items.push(s);
      s._life = null;
      return s;
    }
    /* full: reuse the oldest */
    const s = pool.items[pool.next % pool.items.length];
    pool.next++;
    if (tex && s.texture !== tex) s.texture = tex;
    return s;
  }

  /* Logged in the renderer's own words, once per part: the QA harness fails
     whatever scenario was on screen when a '[pixi-render] ... threw' appears
     (harness.mjs _noteRenderThrow), and a throw here must not hide behind the
     per-part catch that keeps the rest of the frame drawing. */
  _err(what, e) {
    if (!this._errs[what]) { this._errs[what] = true; console.error('[pixi-render] worldLife.' + what + ' threw', e && e.message, e && e.stack); }
  }

  /**
   * @param {object} S      game state
   * @param {object} cam    { cx, cy, viewW, viewH }
   * @param {number} now    Date.now() of this frame
   * @param {object} er     the EntityRenderer (props, npcs, monsters, canopies)
   * @param {object} fx     the EffectsRenderer (trees, ore, loot)
   */
  update(S, cam, now, er, fx) {
    if (!S) return;
    this._frameNo = (this._frameNo || 0) + 1;
    const rate = typeof window !== 'undefined' && typeof window.__btLifeRate === 'number' ? window.__btLifeRate : 1;
    const raw = this._last ? (now - this._last) / 1000 : 0.016;
    this._last = now;
    let dt = Math.min(0.1, Math.max(0, raw)) * Math.max(0, rate);
    /* QA filming (tools/qa/mp/shot-liveness.mjs): a headless page draws at a
       few irregular frames a second, so a film shot on the wall clock jerks.
       With __btLifeFrames set, this clock advances one fixed step
       (__btLifeStep, default 1/30 s) per frame while the count lasts and
       holds still at 0 -- one step per film frame, evenly.  Nothing in the
       game sets either. */
    if (typeof window !== 'undefined' && typeof window.__btLifeFrames === 'number') {
      if (window.__btLifeFrames > 0) { dt = typeof window.__btLifeStep === 'number' ? window.__btLifeStep : 1 / 30; window.__btLifeFrames--; }
      else dt = 0;
    }
    this._t += dt;
    const t = this._t;
    const calm = typeof window !== 'undefined' && window.__btAmbienceOff === true;
    /* the wind rides the wall clock (so dust, clouds and trees agree), except
       while filming, where it steps with this clock */
    const filming = typeof window !== 'undefined' && typeof window.__btLifeFrames === 'number';
    const wind = windAt(filming ? (this._filmT0 || (this._filmT0 = now)) + t * 1000 : now);
    let lamp = 0;
    try { lamp = lightingAt(dayPhase(now)).lamp || 0; } catch (e) { /* no sky: day */ }
    const probe = { calm, t: +t.toFixed(2), wind: +wind.speed.toFixed(1), sway: [], parts: [], riders: [], smoke: 0, sparks: 0, glints: 0, glows: 0, streaks: 0, needles: 0, breathing: [], lootGlints: 0, oreGlints: 0 };
    this._cam = cam || null;
    try { this._updateTrees(S, t, dt, wind, fx, calm, now, probe); } catch (e) { this._err('trees', e); }
    try { this._updatePropSway(S, t, dt, wind, er, calm, probe); } catch (e) { this._err('props', e); }
    try { this._updateCanopies(S, t, dt, wind, er, calm, probe); } catch (e) { this._err('canopy', e); }
    try { this._updateBuildings(S, t, dt, wind, er, calm, lamp, probe); } catch (e) { this._err('buildings', e); }
    try { this._updateBreathing(S, t, dt, er, calm, probe); } catch (e) { this._err('breath', e); }
    try { this._updateGlints(S, t, dt, fx, calm, lamp, probe); } catch (e) { this._err('glints', e); }
    try { this._stepSparks(dt, wind, calm, probe); } catch (e) { this._err('sparks', e); }
    try { this._stepNeedles(dt, t, wind, calm, probe); } catch (e) { this._err('needles', e); }
    this._probe = probe;
  }

  /* ───────── sway: one spring per swaying thing ───────── */

  _spring(obj, x, y) {
    let st = this._sway.get(obj);
    if (!st) {
      st = { th: 0, om: 0, ph: hash01(Math.round(x), Math.round(y)) * TAU, chop: 0, shiver: 0, shiverDir: 1 };
      this._sway.set(obj, st);
    }
    return st;
  }

  /* The angle (radians) a thing of this kind wants to lean at this moment. */
  _target(kind, st, x, y, t, wind) {
    const P = SWAY[kind];
    const strength = wind.speed / 14;
    const east = Math.cos(wind.ang);
    const g = gustAt(x, y, t, wind);
    const w = TAU * P.f0;
    const turb = Math.sin(t * w * 0.93 + st.ph) * 0.62 + Math.sin(t * w * 1.71 + st.ph * 1.37) * 0.38;
    const deg = east * strength * (P.lean + P.gust * g) + P.turb * turb * (0.7 + 0.5 * g);
    st.gust = g;
    return deg * DEG;
  }

  _swayStep(kind, st, x, y, t, dt, wind) {
    const P = SWAY[kind];
    springStep(st, this._target(kind, st, x, y, t, wind), dt, P.f0, P.zeta);
    const mx = P.max * DEG;
    if (st.th > mx) { st.th = mx; st.om = 0; } else if (st.th < -mx) { st.th = -mx; st.om = 0; }
    return st.th;
  }

  _updateTrees(S, t, dt, wind, fx, calm, now, probe) {
    const nodes = S.gatherNodes;
    if (!nodes || !fx) return;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n || !n.alive) continue;
      const spr = n._pixiSprite;
      if (!spr || spr.destroyed || !spr.visible) continue;
      if (n.nodeType !== 'tree') continue;
      if (calm) { if (spr.skew.x !== 0) spr.skew.x = 0; continue; }
      if (spr.texture && !this._onCamera(spr, spr.texture.width, spr.texture.height, 60)) continue;
      const st = this._spring(spr, n.x, n.y);
      /* ═══ a chop: the trunk takes the blow ═══
         effectsRenderer stamps _lifeChopAt on the strike frame, +200 ms so
         it lands with the bite of the axe and the chips (see there). */
      if (n._lifeChopAt && n._lifeChopAt !== st.chop && now >= n._lifeChopAt) {
        st.chop = n._lifeChopAt;
        const dir = n._lifeChopDir || 1;
        st.om += dir * 0.085;
        st.shiver = 1;
        st.shiverDir = dir;
        this._dropNeedles(spr, 4 + ((st.chop / 7) | 0) % 3, wind);
      }
      const th = this._swayStep('tree', st, n.x, n.y, t, dt, wind);
      spr.skew.x = -th;
      if (st.shiver > 0) {
        /* the trunk shivers for a third of a second after the blow */
        spr.x += Math.sin(t * 160) * 1.3 * st.shiver * st.shiverDir;
        st.shiver = Math.max(0, st.shiver - dt / 0.32);
      }
      /* a strong gust now and then shakes a needle loose */
      if (st.gust > 0.75 && Math.random() < dt * 0.18) this._dropNeedles(spr, 1, wind);
      /* the ground point is the contract (depth, hit-tests, footprints):
         published so a test can hold it to "never moves" */
      if (probe.sway.length < 24) probe.sway.push({ kind: 'tree', id: n.id != null ? String(n.id) : null, x: Math.round(n.x), y: Math.round(n.y), deg: +(th / DEG).toFixed(2), gust: +st.gust.toFixed(2), chopAt: n._lifeChopAt || 0, shiver: +st.shiver.toFixed(2), footDy: +(spr.y - n.y).toFixed(2) });
    }
  }

  _updatePropSway(S, t, dt, wind, er, calm, probe) {
    if (!er || !er.propDisplays) return;
    for (const [id, spr] of er.propDisplays) {
      if (!own(PROP_SWAY, id)) continue;
      if (!spr || spr.destroyed || !spr.visible) continue;
      if (calm) { if (spr.skew.x !== 0) spr.skew.x = 0; continue; }
      const kind = PROP_SWAY[id];
      const st = this._spring(spr, spr.x, spr.y);
      const th = this._swayStep(kind, st, spr.x, spr.y, t, dt, wind);
      spr.skew.x = -th;
      if (kind === 'pine' && st.gust > 0.8 && Math.random() < dt * 0.25) this._dropNeedles(spr, 1, wind);
      probe.sway.push({ kind, id, x: Math.round(spr.x), y: Math.round(spr.y), deg: +(th / DEG).toFixed(2), gust: +st.gust.toFixed(2) });
    }
  }

  _updateCanopies(S, t, dt, wind, er, calm, probe) {
    if (!er || !er.fgDisplays) return;
    const list = foregroundForZone(S.currentZone);
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      if (!own(FG_SWAY, f.id)) continue;
      const spr = er.fgDisplays.get(f.id);
      if (!spr || spr.destroyed || !spr.visible || !spr.texture) continue;
      let th = 0;
      if (!calm) {
        const st = this._spring(spr, f.x, f.y);
        th = this._swayStep('canopy', st, f.x, f.y, t, dt, wind);
      }
      /* Rotate about the edge it hangs from.  The renderer set x/y to the
         piece's centre this frame (anchor 0.5, 0.5); the hang point sits
         `a` from there, and staying put means moving the centre by
         a - R(th)a. */
      const hang = FG_SWAY[f.id];
      const tw = spr.texture.width, thh = spr.texture.height;
      const ax = (hang.u - 0.5) * tw * spr.scale.x, ay = (hang.v - 0.5) * thh * spr.scale.y;
      const c = Math.cos(th), s = Math.sin(th);
      spr.rotation = th;
      spr.x = f.x + ax - (c * ax - s * ay);
      spr.y = f.y + ay - (s * ax + c * ay);
      /* where the hang point actually ended up, against where it rests */
      const hx = spr.x + (c * ax - s * ay) - (f.x + ax), hy = spr.y + (s * ax + c * ay) - (f.y + ay);
      probe.sway.push({ kind: 'canopy', id: f.id, deg: +(th / DEG).toFixed(2), hangErr: +Math.hypot(hx, hy).toFixed(3) });
    }
  }

  _dropNeedles(spr, n, wind) {
    const w = Math.abs(spr.width), h = Math.abs(spr.height);
    for (let i = 0; i < n; i++) {
      const s = this._take(this._needles);
      s._life = {
        x: spr.x + (Math.random() - 0.5) * w * 0.55,
        y: spr.y - h * (0.3 + Math.random() * 0.5),
        vx: (Math.random() - 0.5) * 14 + wind.x * 0.35,
        vy: 14 + Math.random() * 14,
        age: 0, life: 1.6 + Math.random() * 0.9,
        rot: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 5,
        ph: Math.random() * TAU,
      };
      s.tint = Math.random() < 0.5 ? 0x2f5a2c : 0x4d7f3a;
      s.scale.set(1.6, 1.3);
      s.visible = true;
    }
  }

  _stepNeedles(dt, t, wind, calm, probe) {
    const items = this._needles.items;
    for (let i = 0; i < items.length; i++) {
      const s = items[i];
      const L = s._life;
      if (!L) continue;
      L.age += dt;
      if (calm || L.age >= L.life) { s._life = null; s.visible = false; continue; }
      /* flutter as it falls: sideways swings, a slow spin */
      L.x += (L.vx + Math.sin(L.age * 5 + L.ph) * 10) * dt;
      L.y += L.vy * dt;
      L.rot += L.spin * dt;
      s.x = L.x; s.y = L.y; s.rotation = L.rot;
      s.alpha = L.age > L.life - 0.45 ? Math.max(0, (L.life - L.age) / 0.45) : 1;
      probe.needles++;
    }
  }

  /* ───────── buildings ───────── */

  _rider(id, host) {
    let r = this._riders.get(id);
    if (r) return r;
    const c = new Container();
    c.label = 'life_' + id;
    const inner = new Container();
    inner.y = -1;                 /* the rider stands 1 px south of its host: see header */
    const origin = new Container();
    const partsL = new Container();
    const smokeL = new Container();
    const addL = new Container();
    origin.addChild(partsL, smokeL, addL);
    inner.addChild(origin);
    c.addChild(inner);
    r = { id, c, inner, origin, partsL, smokeL, addL, host: null, parts: [], smoke: [], glints: [], streaks: [], foam: [], glows: [], spawn: Object.create(null) };
    this._riders.set(id, r);
    return r;
  }

  _buildRider(r, id, host) {
    const tex = host.texture;
    const W = tex.width, H = tex.height;
    r.W = W; r.H = H;
    r.origin.x = -W / 2;
    r.origin.y = -H;
    /* the cut pieces, at rest where they were cut from */
    const def = own(PROP_PARTS, id) ? PROP_PARTS[id] : null;
    const texs = own(PART, id) ? PART[id] : null;
    if (def && texs) {
      for (const p of def.parts) {
        const pt = texs[p.id];
        if (!pt) continue;
        if (p.kind === 'swing') {
          const s = new Sprite(pt);
          const [ax, ay] = p.at;
          const [pvx, pvy] = p.pivot;
          s.anchor.set((pvx - ax) / pt.width, (pvy - ay) / pt.height);
          s.x = pvx; s.y = pvy;
          s._noSharp = true;    /* painted art, sampled as the building is (sharpPixels.js is for figures) */
          const key = id + '/' + p.id;
          const sw = SWING[key] || { amp: 1.2, len: 80 };
          r.partsL.addChild(s);
          r.parts.push({ kind: 'swing', id: p.id, s, amp: sw.amp * DEG, f0: Math.sqrt(PEND_G / sw.len) / TAU, st: { th: 0, om: 0, ph: hashStr(key) * TAU } });
        } else if (p.kind === 'flag') {
          const m = new MeshPlane({ texture: pt, verticesX: 9, verticesY: 3 });
          m.x = p.at[0]; m.y = p.at[1];
          r.partsL.addChild(m);
          const base = Float32Array.from(m.geometry.positions);
          /* the cloth is pinned along the pole, which sits a texel or two in
             from the piece's left edge (the piece overlaps the pole a little:
             see OVERLAP in tools/cut_prop_parts.py) */
          const pole = Math.max(0, (p.pole != null ? p.pole : p.at[0]) - p.at[0]);
          r.parts.push({ kind: 'flag', id: p.id, m, base, w: pt.width, h: pt.height, pole, ph: hashStr(id + p.id) * TAU,
            shade: shadeTintAt((p.at[1] + pt.height / 2) / H) });
        }
        /* v2.3.2817: where each piece was cut from, for the building's ground
           profile (see _updateBuildings) */
        (r.restPieces || (r.restPieces = [])).push({ texture: pt, x: p.at[0], y: p.at[1] });
      }
      /* v2.3.2816: the building is form-shaded (formShade.js: its top as
         painted, its base a cool shade), so a piece cut out of it must take
         the SAME gradient at the same height, or the forge's sign reads as a
         light patch pasted on a darker wall.  The swinging pieces take it the
         way a figure's clothes take their body's: their layer names a span --
         the building's own, 0..H in this layer's texture px -- and each
         corner is shaded by where it sits in it, so a sign swung a few
         degrees is still shaded right.  The flags are meshes, which the patch
         does not reach, so they are tinted with the shade at their middle
         (_stepParts); a flag is a few dozen texels tall, well under a step of
         the gradient.  The smoke, sparks and glows are light and air, not
         the building: their layers carry no mark. */
      r.partsL._vShadeKids = SHADE.prop;
      r.partsL._vShadeRef = { texture: { orig: { height: H } }, y: 0, anchor: { y: 0 }, scale: { y: 1 } };
    }
    /* flames and lamps: the lights worldFx already knows about, flickering by
       day (by night worldFx's halos take over, so these fade out as the lamps
       come on rather than doubling them) */
    const lights = own(PROP_LIGHTS, id) ? PROP_LIGHTS[id] : [];
    for (let j = 0; j < lights.length; j++) {
      const L = lights[j];
      if (L.k !== 'flame' && L.k !== 'lamp') continue;
      const g = new Sprite(FX.glow || Texture.EMPTY);
      g.anchor.set(0.5);
      g.blendMode = 'add';
      g.x = L.u * W; g.y = L.v * H;
      const rad = L.k === 'flame' ? Math.max(7, L.r * H * 0.2) : Math.max(5, L.r * H * 0.12);
      g.scale.set(rad * 2 / 32);
      g.tint = L.k === 'flame' ? 0xffb35a : 0xffdc8a;
      r.addL.addChild(g);
      r.glows.push({ s: g, k: L.k, j, x: g.x, y: g.y });
      if (L.k === 'flame') r.spawn['spark' + j] = { x: L.u * W, y: L.v * H - 2, rate: 0.35, spread: rad * 0.5, acc: hashStr(id + j) };
    }
    for (const e of (own(SPARKS_EXTRA, id) ? SPARKS_EXTRA[id] : [])) r.spawn['sparkX' + e.x] = { x: e.x, y: e.y, rate: e.rate, spread: e.spread, acc: 0 };
    r.falls = own(FALLS, id) ? FALLS[id].map((f) => {
      const seg = [];
      let len = 0;
      for (let i = 1; i < f.pts.length; i++) {
        const a = f.pts[i - 1], b = f.pts[i];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        seg.push({ a, b, l, at: len });
        len += l;
      }
      return { seg, len, w: f.w, acc: 0, foamAcc: 0 };
    }) : [];
    r.smokeDef = own(SMOKE, id) ? SMOKE[id] : [];
    r.glintSpots = def && def.glints ? def.glints : [];
    r.glintRate = own(GLINT_RATE, id) ? GLINT_RATE[id] : 0;
    r.built = true;
  }

  _updateBuildings(S, t, dt, wind, er, calm, lamp, probe) {
    if (!er || !er.propDisplays) return;
    /* which of this zone's props carry anything -- worked out once per zone,
       not per frame (propsForZone filters the whole table) */
    if (this._hereZone !== S.currentZone) {
      this._hereZone = S.currentZone;
      this._here = new Set();
      for (const p of propsForZone(S.currentZone)) {
        if (own(PROP_PARTS, p.id) || own(PROP_LIGHTS, p.id)) this._here.add(p.id);
      }
    }
    const here = this._here;
    for (const [id, r0] of this._riders) {
      if (!here.has(id)) r0.c.visible = false;
    }
    for (const id of here) {
      const host = er.propDisplays.get(id);
      if (!host || host.destroyed || !host.visible || !host.texture || host.texture === Texture.EMPTY || !host.parent) {
        const r0 = this._riders.get(id);
        if (r0) r0.c.visible = false;
        continue;
      }
      const r = this._rider(id, host);
      if (!r.built) {
        /* wait for the pieces (the gate awaits them, so this is one frame at
           most on a cold start) */
        if (own(PROP_PARTS, id) && !own(PART, id)) continue;
        this._buildRider(r, id, host);
      }
      /* v2.3.2817: the pieces cast their building's shadow with it
         (lightfx/shadows.js _placePieces reads this list; each piece's local
         transform is in the building's texture px, which is how the rider
         is built).  Set before the camera cull: a shadow can reach the
         screen from a building that has not. */
      if (!r.shadowList) r.shadowList = r.parts.map((P) => P.s || P.m);
      if (host._lifePieces !== r.shadowList) host._lifePieces = r.shadowList;
      /* v2.3.2817: ...and the building reads its base off its WHOLE picture,
         pieces put back where they were cut from (propGround.readArtBottoms),
         once the depth pass has read the cut one -- which its signs' and
         scales' columns read as empty.  One building a frame, like the first
         read. */
      const g = host._propGround;
      if (g && g.tried && !g._lifeWhole && r.restPieces && r.restPieces.length && this._wholeAt !== this._frameNo) {
        this._wholeAt = this._frameNo;
        g._lifeWhole = true;
        const whole = readArtBottoms(host.texture, r.restPieces);
        if (whole) g.bottoms = whole;
      }
      /* off camera: nothing to draw, so nothing to simulate either (a
         building's smoke and water are not worth a phone's time unseen) */
      if (!this._onCamera(host, r.W, r.H, 80)) { r.c.visible = false; continue; }
      /* ride the host: same layer, same ground line + 1, same scale */
      if (r.c.parent !== host.parent) host.parent.addChild(r.c);
      r.c.x = host.x;
      r.c.y = host.y + 1;
      r.inner.scale.set(host.scale.x, host.scale.y);
      if (host._propGround !== undefined) r.c._propGround = host._propGround;
      /* v2.3.2816: sort a quarter step after the host, not a whole row
         (depthSort.applyGroundSort) -- see TRAPS §115 */
      if (r.c._ridesOn !== host) r.c._ridesOn = host;
      r.c.visible = true;
      probe.riders.push({ id, layer: r.c.parent && r.c.parent.label || null, hostLayer: host.parent && host.parent.label || null,
        dy: +(r.c.y - host.y).toFixed(2), dz: +(r.c.zIndex - host.zIndex).toFixed(2), parts: r.parts.length });
      const kx = Math.abs(host.scale.x) || 1;
      this._stepParts(r, id, host, t, dt, wind, calm, probe);
      this._stepSmoke(r, t, dt, wind, calm, kx, probe);
      this._probe0 = probe;
      this._stepGlows(r, t, calm, lamp);
      this._stepFalls(r, t, dt, calm, probe);
      this._stepBuildingGlints(r, t, dt, calm, lamp, probe);
      this._emitSparks(r, host, dt, calm);
    }
  }

  /* Is a bottom-centre-anchored thing of texture size w x h on camera? */
  _onCamera(spr, w, h, pad) {
    const cam = this._cam;
    if (!cam || !(cam.viewW > 0)) return true;
    const hw = Math.abs(w * spr.scale.x) / 2, hh = Math.abs(h * spr.scale.y);
    return spr.x + hw >= cam.cx - pad && spr.x - hw <= cam.cx + cam.viewW + pad
      && spr.y >= cam.cy - pad && spr.y - hh <= cam.cy + cam.viewH + pad;
  }

  _stepParts(r, id, host, t, dt, wind, calm, probe) {
    const shadeOn = formShadeOn() && !(typeof window !== 'undefined' && window.__btShadeOff);
    const gx = host.x, gy = host.y - (r.H || 0) * 0.6;
    const g = gustAt(gx, gy, t, wind);
    const strength = wind.speed / 14;
    const east = Math.cos(wind.ang);
    for (let i = 0; i < r.parts.length; i++) {
      const P = r.parts[i];
      if (P.kind === 'swing') {
        let th = 0;
        if (!calm) {
          const w = TAU * P.f0;
          /* the wind pushes it downwind a little and rocks it near its own
             period; a gust swings it harder */
          const drive = Math.sin(t * w * 0.97 + P.st.ph) * 0.6 + Math.sin(t * w * 0.61 + P.st.ph * 1.9) * 0.4;
          const target = P.amp * (east * strength * (0.35 + 0.9 * g) * 0.6 + drive * (0.45 + 0.7 * g));
          springStep(P.st, target, dt, P.f0, 0.09);
          th = Math.max(-P.amp * 2, Math.min(P.amp * 2, P.st.th));
        }
        P.s.rotation = th;
        probe.parts.push({ prop: id, id: P.id, kind: 'swing', deg: +(th / DEG).toFixed(2) });
      } else if (P.kind === 'flag') {
        /* v2.3.2816: the building's form shade at the flag's height (see _buildRider) */
        const tint = shadeOn ? P.shade : 0xffffff;
        if (P.m.tint !== tint) P.m.tint = tint;
        const pos = P.m.geometry.positions;
        const base = P.base;
        if (calm) {
          if (!P.rest) { pos.set(base); P.m.geometry.getBuffer('aPosition').update(); P.rest = true; }
          probe.parts.push({ prop: id, id: P.id, kind: 'flag', amp: 0 });
          continue;
        }
        P.rest = false;
        const sp = Math.max(0, Math.min(1, (wind.speed - 9) / 10));
        P.ph += TAU * (1.15 + 0.85 * sp + 0.6 * g) * dt;
        /* amplitude at the free end, in texels: a small flag flutters less */
        const A = (1.5 + 1.2 * sp + 1.6 * g) * Math.min(1, P.w / 60 + 0.25);
        const n = pos.length / 2;
        for (let k = 0; k < n; k++) {
          const bx = base[k * 2], by = base[k * 2 + 1];
          const u = Math.max(0, (bx - P.pole) / Math.max(1, P.w - P.pole));
          const v = by / P.h;
          const env = Math.pow(u, 1.25);
          const ph = P.ph - u * TAU * 1.05 - v * 0.5;
          pos[k * 2] = bx - A * 0.35 * env * (1 - Math.cos(ph));
          pos[k * 2 + 1] = by + A * env * Math.sin(ph);
        }
        P.m.geometry.getBuffer('aPosition').update();
        probe.parts.push({ prop: id, id: P.id, kind: 'flag', amp: +A.toFixed(2), tipDy: +(pos[(8) * 2 + 1] - base[(8) * 2 + 1]).toFixed(2) });
      }
    }
  }

  _stepSmoke(r, t, dt, wind, calm, kx, probe) {
    const defs = r.smokeDef;
    if (!defs || !defs.length) return;
    for (let d = 0; d < defs.length; d++) {
      const D = defs[d];
      const key = 'smoke' + d;
      if (!calm) {
        r.spawn[key] = (r.spawn[key] || 0) + dt * D.rate;
        while (r.spawn[key] >= 1) {
          r.spawn[key] -= 1;
          let s = null;
          for (let i = 0; i < r.smoke.length; i++) if (!r.smoke[i]._life) { s = r.smoke[i]; break; }
          if (!s && r.smoke.length < 24) {
            s = new Sprite(FX.puff || Texture.EMPTY);
            s.anchor.set(0.5);
            r.smokeL.addChild(s);
            r.smoke.push(s);
          }
          if (!s) break;
          s._life = { x: D.x + (Math.random() - 0.5) * 6, y: D.y, age: 0, life: D.life * (0.85 + Math.random() * 0.3),
            s0: D.size[0], s1: D.size[1] * (0.85 + Math.random() * 0.3), rise: D.rise * (0.85 + Math.random() * 0.3),
            rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 0.5, wob: Math.random() * TAU };
          s.tint = 0x8f8a95;
          s.visible = true;
        }
      }
    }
    for (let i = 0; i < r.smoke.length; i++) {
      const s = r.smoke[i];
      const L = s._life;
      if (!L) continue;
      L.age += dt;
      if (calm || L.age >= L.life) { s._life = null; s.visible = false; continue; }
      const k = L.age / L.life;
      /* rises, slowing, and bends downwind the higher it gets */
      L.y -= L.rise * (1 - 0.45 * k) * dt;
      L.x += ((wind.x / kx) * (0.25 + 0.75 * k) + Math.sin(L.age * 1.3 + L.wob) * 3) * dt;
      L.rot += L.spin * dt;
      s.x = L.x; s.y = L.y; s.rotation = L.rot;
      s.scale.set((L.s0 + (L.s1 - L.s0) * Math.sqrt(k)) / 32);
      s.alpha = (k < 0.1 ? k / 0.1 : Math.pow(1 - (k - 0.1) / 0.9, 1.15)) * 0.86;
      /* just out of the chimney it is lit by the fire below */
      s.tint = k < 0.16 ? 0xb49a8c : 0xa6a1ad;
      probe.smoke++;
    }
  }

  _stepGlows(r, t, calm, lamp) {
    const day = calm ? 0 : Math.max(0, 1 - lamp * 1.4);
    for (let i = 0; i < r.glows.length; i++) {
      const G = r.glows[i];
      if (day < 0.02) { G.s.visible = false; continue; }
      const f = G.k === 'flame'
        ? 0.72 + 0.28 * (Math.sin(t * 11.3 + G.j * 1.7) * 0.5 + Math.sin(t * 17.9 + G.j) * 0.3 + Math.sin(t * 4.1 + G.j * 2.3) * 0.2)
        : 0.9 + 0.1 * Math.sin(t * 2.2 + G.j);
      G.s.alpha = (G.k === 'flame' ? 0.34 : 0.13) * f * day;
      G.s.visible = true;
      if (this._probe0) this._probe0.glows++;
    }
  }

  _pathAt(F, d) {
    for (let i = 0; i < F.seg.length; i++) {
      const S = F.seg[i];
      if (d <= S.at + S.l || i === F.seg.length - 1) {
        const k = S.l > 0 ? Math.max(0, Math.min(1, (d - S.at) / S.l)) : 0;
        const dx = S.b[0] - S.a[0], dy = S.b[1] - S.a[1];
        return { x: S.a[0] + dx * k, y: S.a[1] + dy * k, ang: Math.atan2(dy, dx) };
      }
    }
    return { x: 0, y: 0, ang: Math.PI / 2 };
  }

  _stepFalls(r, t, dt, calm, probe) {
    if (!r.falls || !r.falls.length) return;
    for (let f = 0; f < r.falls.length; f++) {
      const F = r.falls[f];
      if (calm) continue;
      F.acc += dt * (0.8 + F.w * 0.32);
      while (F.acc >= 1) {
        F.acc -= 1;
        let s = null;
        for (let i = 0; i < r.streaks.length; i++) if (!r.streaks[i]._life) { s = r.streaks[i]; break; }
        if (!s && r.streaks.length < 40) {
          s = new Sprite(FX.streak || Texture.EMPTY);
          s.anchor.set(0.5, 1);
          s.blendMode = 'add';
          r.addL.addChild(s);
          r.streaks.push(s);
        }
        if (!s) break;
        s._life = { f, d: -6, off: (Math.random() - 0.5) * F.w * 0.8, v: 58 + Math.random() * 34, len: 0.7 + Math.random() * 0.7 };
        s.tint = Math.random() < 0.5 ? 0xe6f8ff : 0xbfe8ff;
        s.visible = true;
      }
      F.foamAcc += dt * (1.5 + F.w * 0.12);
      while (F.foamAcc >= 1) {
        F.foamAcc -= 1;
        let s = null;
        for (let i = 0; i < r.foam.length; i++) if (!r.foam[i]._life) { s = r.foam[i]; break; }
        if (!s && r.foam.length < 30) {
          s = new Sprite(FX.dot || Texture.EMPTY);
          s.anchor.set(0.5);
          s.blendMode = 'add';
          r.addL.addChild(s);
          r.foam.push(s);
        }
        if (!s) break;
        const end = this._pathAt(F, F.len);
        s._life = { x: end.x + (Math.random() - 0.5) * F.w * 0.9, y: end.y - Math.random() * 2, vx: (Math.random() - 0.5) * 14, vy: -(8 + Math.random() * 14), age: 0, life: 0.35 + Math.random() * 0.25 };
        s.visible = true;
      }
    }
    for (let i = 0; i < r.streaks.length; i++) {
      const s = r.streaks[i];
      const L = s._life;
      if (!L) continue;
      const F = r.falls[L.f];
      L.d += L.v * dt;
      if (calm || !F || L.d > F.len + 4) { s._life = null; s.visible = false; continue; }
      const p = this._pathAt(F, Math.max(0, L.d));
      /* offset across the flow, perpendicular to it */
      s.x = p.x + Math.cos(p.ang + Math.PI / 2) * L.off;
      s.y = p.y + Math.sin(p.ang + Math.PI / 2) * L.off;
      s.rotation = p.ang - Math.PI / 2;
      s.scale.set(1, L.len);
      const e = Math.min(1, Math.max(0, L.d / 8), Math.max(0, (F.len + 4 - L.d) / 8));
      s.alpha = 0.55 * e;
      probe.streaks++;
    }
    for (let i = 0; i < r.foam.length; i++) {
      const s = r.foam[i];
      const L = s._life;
      if (!L) continue;
      L.age += dt;
      if (calm || L.age >= L.life) { s._life = null; s.visible = false; continue; }
      L.vy += 60 * dt;
      L.x += L.vx * dt; L.y += L.vy * dt;
      s.x = L.x; s.y = L.y;
      s.alpha = 0.7 * (1 - L.age / L.life);
      s.scale.set(0.7 + 0.5 * (1 - L.age / L.life));
    }
  }

  _stepBuildingGlints(r, t, dt, calm, lamp, probe) {
    const spots = r.glintSpots;
    if (!spots || !spots.length || !r.glintRate) return;
    if (!calm) {
      r.spawn.glint = (r.spawn.glint || 0) + dt * r.glintRate * (1 - 0.75 * lamp);
      while (r.spawn.glint >= 1) {
        r.spawn.glint -= 1;
        let s = null;
        for (let i = 0; i < r.glints.length; i++) if (!r.glints[i]._life) { s = r.glints[i]; break; }
        if (!s && r.glints.length < 10) {
          s = new Sprite(FX.star || Texture.EMPTY);
          s.anchor.set(0.5);
          s.blendMode = 'add';
          r.addL.addChild(s);
          r.glints.push(s);
        }
        if (!s) break;
        const sp = spots[(Math.random() * spots.length) | 0];
        s._life = { age: 0, life: 0.55 + Math.random() * 0.3, size: 1.05 + Math.random() * 0.6, rot0: (Math.random() - 0.5) * 0.4 };
        s.x = sp[0]; s.y = sp[1];
        s.tint = 0xfff3c4;
        s.visible = true;
      }
    }
    for (let i = 0; i < r.glints.length; i++) {
      const s = r.glints[i];
      const L = s._life;
      if (!L) continue;
      L.age += dt;
      if (calm || L.age >= L.life) { s._life = null; s.visible = false; continue; }
      const k = L.age / L.life;
      const pulse = Math.sin(k * Math.PI);
      s.scale.set(L.size * (0.35 + 0.65 * pulse));
      s.rotation = L.rot0 + k * 0.5;
      s.alpha = 0.95 * pulse;
      probe.glints++;
    }
  }

  _emitSparks(r, host, dt, calm) {
    if (calm) return;
    const sx = host.scale.x, sy = host.scale.y;
    for (const key in r.spawn) {
      if (key.slice(0, 5) !== 'spark') continue;
      const E = r.spawn[key];
      E.acc += dt * E.rate;
      while (E.acc >= 1) {
        E.acc -= 1;
        const s = this._take(this._sparks);
        /* world position of the emitter (the host is anchored bottom-centre) */
        const wx = host.x + (E.x - r.W / 2) * sx + (Math.random() - 0.5) * E.spread * Math.abs(sx);
        const wy = host.y + (E.y - r.H) * sy;
        s._life = { x: wx, y: wy, vx: (Math.random() - 0.5) * 16, vy: -(22 + Math.random() * 26), age: 0, life: 0.7 + Math.random() * 0.8, ph: Math.random() * TAU };
        s.tint = Math.random() < 0.6 ? 0xffb347 : 0xffe28a;
        s.visible = true;
      }
    }
  }

  _stepSparks(dt, wind, calm, probe) {
    const items = this._sparks.items;
    for (let i = 0; i < items.length; i++) {
      const s = items[i];
      const L = s._life;
      if (!L) continue;
      L.age += dt;
      if (calm || L.age >= L.life) { s._life = null; s.visible = false; continue; }
      L.vx += (wind.x * 0.9 - L.vx) * Math.min(1, dt * 1.2);
      L.vy *= Math.max(0, 1 - dt * 0.6);
      L.x += (L.vx + Math.sin(L.age * 9 + L.ph) * 6) * dt;
      L.y += L.vy * dt;
      s.x = L.x; s.y = L.y;
      const k = L.age / L.life;
      s.alpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      s.scale.set(0.42 * (1 - 0.5 * k));
      probe.sparks++;
    }
  }

  /* ───────── breathing ───────── */

  _updateBreathing(S, t, dt, er, calm, probe) {
    if (!er) return;
    if (er.npcDisplays) {
      for (const [id, d] of er.npcDisplays) {
        const fig = d && d._fig;
        if (!fig || fig.destroyed || fig.texture === Texture.EMPTY) continue;
        let b = this._npc.get(fig);
        if (!b) { b = { sx: fig.scale.x, sy: fig.scale.y, lx: d.x, ly: d.y, still: 0, k: 0, ph: hashStr(String(id)) * TAU, T: 3.6 + hashStr(id + 'T') * 0.9 }; this._npc.set(fig, b); }
        const moved = Math.abs(d.x - b.lx) + Math.abs(d.y - b.ly) > 0.05;
        b.lx = d.x; b.ly = d.y;
        b.still = moved ? 0 : b.still + dt;
        /* eases in once he has stood a moment, out the instant he walks */
        const want = calm || b.still < 0.3 ? 0 : 1;
        b.k += (want - b.k) * Math.min(1, dt * (want ? 2.5 : 12));
        if (b.k < 0.001) b.k = 0;
        const br = breath(t * TAU / b.T + b.ph);
        fig.scale.y = b.sy * (1 + 0.013 * b.k * br);
        fig.scale.x = b.sx * (1 + 0.004 * b.k * br);
        if (probe.breathing.length < 12) probe.breathing.push({ who: 'npc', id: String(id), k: +b.k.toFixed(2), sy: +(fig.scale.y / b.sy).toFixed(4) });
      }
    }
    if (er.monsterDisplays && !calm) {
      for (const [id, d] of er.monsterDisplays) {
        const body = d && d._spriteBody;
        if (!body || body.destroyed || !body.visible) continue;
        /* entityRenderer sets `_idlePose` on a variant holding its one idle
           frame, and rewrites the body's scale every frame -- so this scales
           THIS frame's value and never compounds */
        const k = d._idlePose ? Math.min(1, (d._lifeIdleK || 0) + dt * 2) : 0;
        d._lifeIdleK = k;
        if (k <= 0) continue;
        const br = breath(t * TAU / 2.9 + hashStr(String(id)) * TAU);
        body.scale.y *= 1 + 0.02 * k * br;
        body.scale.x *= 1 - 0.006 * k * br;
        if (probe.breathing.length < 24) probe.breathing.push({ who: 'monster', id: String(id), k: +k.toFixed(2) });
      }
    }
  }

  /* ───────── glints on the ground: coins and ore ───────── */

  _updateGlints(S, t, dt, fx, calm, lamp, probe) {
    if (!fx) return;
    /* coins on the ground: each catches the light every few seconds */
    const loot = fx._knownLoot;
    const items = this._lootGlints.items;
    let used = 0;
    if (loot && !calm) {
      for (const l of loot) {
        if (!l || used >= this._lootGlints.n) break;
        const sp = l._pixiCoinSprite && l._pixiCoinSprite.visible ? l._pixiCoinSprite
          : (!l.skull && l._pixiSprite && l._pixiSprite.visible ? l._pixiSprite : null);
        if (!sp || sp.destroyed || !sp.texture) continue;
        const per = 2.4 + hash01(l.ts | 0, (l.x | 0)) * 1.4;
        const ph = ((t + hash01((l.x | 0), (l.y | 0)) * per) % per) / 0.5;
        if (ph >= 1) continue;
        const s = items[used] || this._take(this._lootGlints);
        used++;
        if (FX.star && s.texture !== FX.star) s.texture = FX.star;
        const w = sp.texture.width * Math.abs(sp.scale.x), h = sp.texture.height * Math.abs(sp.scale.y);
        s.x = sp.x - sp.anchor.x * w + w * 0.34;
        s.y = sp.y - sp.anchor.y * h + h * 0.3;
        const pulse = Math.sin(ph * Math.PI);
        s.scale.set(0.75 * (0.3 + 0.7 * pulse));
        s.rotation = ph * 0.6;
        /* v2.3.2818: as bright as the coin itself -- a coin that is someone
           else's is drawn grey at 0.4 (effectsRenderer), and a full glint on
           a grey coin reads as a stray spark */
        s.alpha = 0.9 * pulse * (1 - 0.6 * lamp) * (sp.alpha >= 0 ? Math.min(1, sp.alpha) : 1);
        s.tint = 0xfff1b8;
        s.visible = true;
        probe.lootGlints++;
      }
    }
    for (let i = used; i < items.length; i++) items[i].visible = false;

    /* ore: now and then a crystal in the vein flashes */
    const seen = this._oreSeen || (this._oreSeen = new Set());
    seen.clear();
    const nodes = S.gatherNodes || [];
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n || !n.alive || n.nodeType !== 'oreVein') continue;
      const spr = n._pixiSprite;
      if (!spr || spr.destroyed || !spr.visible || !spr.parent) continue;
      seen.add(spr);
      let r = this._ore.get(spr);
      if (!r) {
        const c = new Container();
        c.label = 'life_ore';
        const s = new Sprite(FX.star || Texture.EMPTY);
        s.anchor.set(0.5);
        s.blendMode = 'add';
        s.visible = false;
        c.addChild(s);
        r = { c, s, per: 3.2 + hash01(n.x | 0, n.y | 0) * 2.2, off: hash01(n.y | 0, n.x | 0) };
        this._ore.set(spr, r);
      }
      if (r.c.parent !== spr.parent) spr.parent.addChild(r.c);
      r.c.x = spr.x; r.c.y = spr.y + 1;
      const ph = ((t + r.off * r.per) % r.per) / 0.55;
      if (calm || ph >= 1) { r.s.visible = false; continue; }
      if (ph < 0.02 || r.cycle == null) {
        /* a new spot each flash, somewhere on the rock's upper half */
        r.cycle = Math.floor((t + r.off * r.per) / r.per);
        const a = hash01(r.cycle, n.x | 0), b = hash01(n.y | 0, r.cycle);
        r.dx = (a - 0.5) * Math.abs(spr.width) * 0.45;
        r.dy = -Math.abs(spr.height) * (0.35 + b * 0.35) - 1;
      }
      const pulse = Math.sin(ph * Math.PI);
      r.s.x = r.dx; r.s.y = r.dy;
      r.s.scale.set(0.8 * (0.3 + 0.7 * pulse));
      r.s.rotation = ph * 0.5;
      r.s.alpha = 0.85 * pulse * (1 - 0.5 * lamp);
      r.s.tint = 0xe8f4ff;
      r.s.visible = true;
      probe.oreGlints++;
    }
    for (const [spr, r] of this._ore) {
      if (seen.has(spr)) continue;
      try { r.c.destroy({ children: true }); } catch (e) { /* gone */ }
      this._ore.delete(spr);
    }
  }
}

/* A breath: in a little quicker than out, a short rest at the bottom. */
function breath(ph) {
  const u = ((ph / TAU) % 1 + 1) % 1;
  if (u < 0.4) return -1 + 2 * smooth(u / 0.4);
  if (u < 0.85) return 1 - 2 * smooth((u - 0.4) / 0.45);
  return -1;
}
function smooth(x) { return x * x * (3 - 2 * x); }
