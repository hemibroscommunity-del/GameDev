/* ═══ v2.3.2934: THE STYLE LAB'S GAME SCREEN ═══
 *
 * A stand-in for the game's screen, built to judge ONE thing: how a look sits
 * round the bro.  So what is fixed is exactly what the game fixes:
 *
 *   - the camera: 1024 game px of height on the phone's canvas, as the game
 *     shows in portrait (src/game/worldViewport.js), with the dashboard band
 *     folded (38 CSS px) or open (229 CSS px) as measured on a 390 x 844 phone;
 *   - the bro: his real jog and stand strips with the white tee on top
 *     (/sprites/player, /sprites/gear/shirt/tshirt), 105.7 game px crown to
 *     foot, walking 150 game px a second;
 *   - the monsters and the NPC: the real fire goblin, slime and blacksmith at
 *     their game sizes (monsterVariants liveScalePx x MONSTER_SIZE_MULT 1.5;
 *     NPC_SPRITE_SCALE x 1.14).
 *
 * What changes with the look is the ground, the objects, the building and the
 * NPC, and every code-drawn effect follows the look's pixel grid and palette:
 * the water, the night and its lights, the rain and snow, the shadows and the
 * sway.  That is the owner's point about pixel art -- "you're really good at
 * adding effects that are code driven" -- made visible: an effect drawn on the
 * same grid in the same colours looks like part of the art.
 *
 * Not the game: no server, no UI beyond the two bands, no real collision map.
 */
import { mk, nearestIn } from './process.js';

export const WORLD = { w: 1400, h: 2200 };
/* The colours the code-drawn effects need, kept in every snapped look's
   palette the way a pixel artist keeps water and light colours in theirs:
   without them a look whose pictures hold no blue draws its pond in the
   nearest greys and yellows (caught on the first run of the mix look).
   Deep, mid and shallow water, its highlight, foam; night; warm light; dusk. */
export const EFFECT_PALETTE = [
  [28, 70, 126], [53, 113, 161], [78, 156, 196], [148, 226, 251], [226, 238, 240],
  [10, 16, 44], [255, 176, 92], [70, 40, 70],
];
const BRO_H = 105.7;
const WALK = 150;
const VIEW_H = 1024;
export const BANDS = { closed: 38, open: 229, top: 46 };

const DIRS = ['south', 'north', 'east', 'northeast', 'southwest'];
const MIRROR = { west: 'east', northwest: 'northeast', southeast: 'southwest' };
const OCT = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];

/* Where things stand: feet positions in game px. */
const LAYOUT = {
  building: { x: 700, y: 560 },
  npc: { x: 520, y: 640 },
  trees: [[250, 820], [1160, 760], [430, 1540], [1190, 1450], [170, 2040], [880, 2120]],
  rocks: [[560, 1030], [990, 1230], [300, 1260], [700, 1980]],
  bushes: [[840, 880], [1060, 1600], [610, 1820], [120, 1100]],
  signs: [[790, 1120]],
  pond: { x: 980, y: 1860, rx: 250, ry: 135 },
  bro: { x: 700, y: 1260 },
  goblin: { a: [260, 1700], b: [760, 1700] },
  slime: { x: 1040, y: 1060 },
  /* the demo stroll when nobody is touching the screen: clear of every
     object's footprint (checked segment by segment) */
  walk: [[700, 1260], [700, 960], [1080, 960], [1080, 1380], [620, 1640], [340, 1400]],
};
const FOOT = { tree: 16, rock: 24, bush: 24, sign: 9 };

/* ── the sprites every look shares ── */
function loadImg(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('could not load ' + url));
    im.src = url;
  });
}

/* the lowest and highest opaque rows over every frame of a strip */
function rows(c, fw) {
  const g = c.getContext('2d', { willReadFrequently: true });
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let top = c.height, bot = -1;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] > 40) { if (y < top) top = y; if (y > bot) bot = y; break; }
    }
  }
  return { top, bot, fw, n: Math.max(1, Math.round(c.width / fw)) };
}

function compose(base, over, overScale) {
  const c = mk(base.width, base.height), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(base, 0, 0);
  if (over) g.drawImage(over, 0, 0, over.width * overScale, over.height * overScale);
  return c;
}

export async function loadSprites() {
  const S = { jog: {}, stand: {} };
  await Promise.all(DIRS.map(async (d) => {
    const [jb, jt, sb, st] = await Promise.all([
      loadImg(`/sprites/player/jog-${d}.png`),
      loadImg(`/sprites/gear/shirt/tshirt/jog-${d}.png`).catch(() => null),
      loadImg(`/sprites/player/stand-${d}.png`),
      loadImg(`/sprites/gear/shirt/tshirt/stand-${d}.png`).catch(() => null),
    ]);
    const jog = compose(jb, jt, 1);
    S.jog[d] = { c: jog, ...rows(jog, jb.height) };
    /* the tee's stand sheet is stored at half the body's size and drawn 2x,
       as the game does (gearSheets: half-res, NN-upscaled) */
    const stand = compose(sb, st, st ? sb.width / st.width : 1);
    S.stand[d] = { c: stand, ...rows(stand, sb.height) };
  }));
  /* the bro's size: stand-south's figure is BRO_H tall; the jog frames are
     half-res copies of the same cell */
  const ss = S.stand.south;
  S.standScale = BRO_H / (ss.bot - ss.top + 1);
  S.jogScale = S.standScale * (ss.fw / S.jog.south.fw);
  const [gob, slime, smith] = await Promise.all([
    loadImg('/sprites/monsters/fire-goblin/walk-e.png'),
    loadImg('/sprites/monsters/slime-idle-v5.png'),
    loadImg('/sprites/npc/blacksmith-bro.png'),
  ]);
  const gc = compose(gob, null, 1), slc = compose(slime, null, 1), smc = compose(smith, null, 1);
  S.goblin = { c: gc, ...rows(gc, gob.height), scale: (64 / 256) * 1.5 };
  S.slime = { c: slc, ...rows(slc, slime.height), scale: (96 / 128) * 1.5 };
  S.smith = { c: smc, ...rows(smc, smith.height), scale: (120 / 256) * 1.14 };
  return S;
}

/* ── the scene ── */
export class Scene {
  constructor(canvas, sprites) {
    this.cv = canvas;
    this.g = canvas.getContext('2d');
    this.sp = sprites;
    this.opts = { time: 'day', weather: 'none', shadows: true, sway: true, dash: 'closed', frame: true, auto: true };
    this.look = null;
    this.bro = { x: LAYOUT.bro.x, y: LAYOUT.bro.y, face: 'south', dist: 0, moving: false };
    this.target = null;
    this.lastInput = -1e9;
    this.walkIdx = 1;
    this.t = 0;
    this.drops = [];
    this.stats = { frames: 0, drawn: 0, objects: 0, characters: 0, water: false, night: false, weather: 0 };
    this._s = 0;
    this.cam = { x: 0, y: 0 };
    this.stuck = 0;
    this._built = null;
    this._dark = null;
    this._water = null;
    this._bindInput();
  }

  /* look = { ground, groundWorld, groundRender, thingsRender, palette,
     things: { tree: [{c, w, h}], rock, bush, sign }, building: {c, w, h},
     npc: {c, w, h} } -- every w/h in game px, already at its final size
     (app.js applies the owner's object-size slider BEFORE the snap, so a
     pixel look's grid stays exact) */
  setLook(look) { this.look = look; this._built = null; }
  setOpts(o) {
    Object.assign(this.opts, o);
    /* only the bands change the scale; everything else is drawn live */
    if ('dash' in o || 'frame' in o) this._built = null;
  }

  _bindInput() {
    const cv = this.cv;
    const at = (e) => {
      const r = cv.getBoundingClientRect();
      const dpr = cv.width / r.width;
      return this._toWorld((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr);
    };
    cv.addEventListener('pointerdown', (e) => {
      /* capture keeps the drag alive off the canvas; a pointer the browser
         does not consider active (a synthetic one) must not stop the walk */
      try { cv.setPointerCapture(e.pointerId); } catch (_e) { /* not capturable */ }
      this.target = at(e);
      this.lastInput = this.t;
    });
    cv.addEventListener('pointermove', (e) => { if (this.target) { this.target = at(e); this.lastInput = this.t; } });
    const up = () => { this.target = null; this.lastInput = this.t; };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
  }

  /* device px per game px, and the game canvas's device height */
  _metrics() {
    const cv = this.cv;
    const dpr = cv.width / Math.max(1, cv.clientWidth || cv.width);
    const band = this.opts.frame ? BANDS[this.opts.dash] * dpr : 0;
    const gameH = cv.height - band;
    return { dpr, band, gameH, s: gameH / VIEW_H };
  }

  _toWorld(px, py) {
    const m = this._metrics();
    return { x: this.cam.x + px / m.s, y: this.cam.y + py / m.s };
  }

  /* ── building the device-size pictures for this look and this screen ── */
  _build() {
    const L = this.look;
    const m = this._metrics();
    const s = m.s;
    const b = { s, tiles: null, things: [], shadows: new Map(), pixel: 0, pal: null };
    this._s = s;
    if (!L) { this._built = b; return b; }
    const scaleTo = (src, w, h, smooth) => {
      const c = mk(w, h), g = c.getContext('2d');
      g.imageSmoothingEnabled = smooth;
      if (smooth) g.imageSmoothingQuality = 'high';
      g.drawImage(src, 0, 0, c.width, c.height);
      return c;
    };
    if (L.ground) {
      const px = Math.max(8, Math.round(L.groundWorld * s));
      b.tiles = scaleTo(L.ground, px, px, !!L.groundRender.smooth);
      b.tileWorld = px / s;
    }
    const tr = L.thingsRender;
    b.pixel = tr.snap > 0 ? tr.snap : 0;
    b.pal = L.palette && L.palette.length ? L.palette : null;
    const put = (e, kind, x, y) => {
      if (!e) return;
      const c = scaleTo(e.c, e.w * s, e.h * s, !!tr.smooth);
      b.things.push({ kind, x, y, c, w: c.width, h: c.height, phase: (x * 0.013 + y * 0.007) % 6.28 });
    };
    const T = L.things || {};
    LAYOUT.trees.forEach(([x, y], i) => put(pick(T.tree, i), 'tree', x, y));
    LAYOUT.rocks.forEach(([x, y], i) => put(pick(T.rock, i), 'rock', x, y));
    LAYOUT.bushes.forEach(([x, y], i) => put(pick(T.bush, i), 'bush', x, y));
    LAYOUT.signs.forEach(([x, y], i) => put(pick(T.sign, i), 'sign', x, y));
    if (L.building) put(L.building, 'building', LAYOUT.building.x, LAYOUT.building.y);
    if (L.npc) put(L.npc, 'npc', LAYOUT.npc.x, LAYOUT.npc.y);
    for (const t of b.things) {
      /* a shadow is the object's own silhouette, flattened and thrown to the
         lower right (daylight from the upper left, WORLD-BIBLE §6) */
      const sh = mk(t.w, t.h), g = sh.getContext('2d');
      g.drawImage(t.c, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#000';
      g.fillRect(0, 0, t.w, t.h);
      b.shadows.set(t, sh);
    }
    b.near = b.pal ? nearestIn(b.pal) : null;
    this._built = b;
    this._dark = null;
    this._water = null;
    return b;
  }

  /* ── one frame ── */
  frame(dt) {
    this.t += dt;
    const b = (this._built && this._s === this._metrics().s) ? this._built : this._build();
    this._step(dt);
    const g = this.g, cv = this.cv, m = this._metrics(), s = m.s;
    const viewW = cv.width / s, viewH = m.gameH / s;
    this.cam = {
      x: clamp(this.bro.x - viewW / 2, 0, Math.max(0, WORLD.w - viewW)),
      y: clamp(this.bro.y - 30 - viewH / 2, 0, Math.max(0, WORLD.h - viewH)),
    };
    /* whole device pixels: a camera between pixels makes hard pixel art crawl */
    const ox = Math.round(this.cam.x * s), oy = Math.round(this.cam.y * s);
    this.cam.x = ox / s; this.cam.y = oy / s;
    const X = (wx) => Math.round(wx * s) - ox, Y = (wy) => Math.round(wy * s) - oy;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#26361f';
    g.fillRect(0, 0, cv.width, cv.height);
    let drawn = 0;

    if (b.tiles) {
      const tw = b.tiles.width;
      const x0 = -(((ox % tw) + tw) % tw), y0 = -(((oy % tw) + tw) % tw);
      for (let y = y0; y < m.gameH; y += tw) for (let x = x0; x < cv.width; x += tw) { g.drawImage(b.tiles, x, y); drawn++; }
    }
    this._drawWater(g, b, s, ox, oy);

    /* shadows under everything that stands */
    const chars = this._characters();
    if (this.opts.shadows) {
      g.save();
      g.globalAlpha = 0.28;
      for (const t of b.things) {
        const sh = b.shadows.get(t);
        g.setTransform(1, 0, -0.62, -0.36, X(t.x), Y(t.y));
        g.drawImage(sh, -t.w / 2, -t.h, t.w, t.h);
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = '#000';
      for (const c of chars) {
        g.beginPath();
        g.ellipse(X(c.x), Y(c.y), c.shadow * s, c.shadow * 0.36 * s, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }

    /* everything that stands, sorted by where it meets the ground */
    const list = b.things.map((t) => ({ y: t.y, draw: () => this._drawThing(g, b, t, X(t.x), Y(t.y)) }))
      .concat(chars.map((c) => ({ y: c.y, draw: () => this._drawChar(g, c, X(c.x), Y(c.y), s) })));
    list.sort((a, c) => a.y - c.y);
    for (const it of list) { it.draw(); drawn++; }

    this._drawNight(g, b, s, ox, oy, m.gameH);
    this._drawWeather(g, b, s, m.gameH, dt);
    if (this.opts.frame) {
      g.fillStyle = '#17212a';
      g.fillRect(0, m.gameH, cv.width, cv.height - m.gameH);
      g.fillStyle = 'rgba(216,168,95,.55)';
      g.fillRect(0, m.gameH, cv.width, Math.max(1, Math.round(m.dpr)));
    }
    this.stats.frames++;
    this.stats.drawn = drawn;
    this.stats.objects = b.things.length;
    this.stats.characters = chars.length;
  }

  _characters() {
    const sp = this.sp, t = this.t, bro = this.bro;
    const out = [];
    const face = MIRROR[bro.face] || bro.face;
    const flip = !!MIRROR[bro.face];
    if (bro.moving) {
      const J = sp.jog[face];
      out.push({ x: bro.x, y: bro.y, img: J.c, fw: J.fw, fi: Math.floor(bro.dist / 6.5) % J.n, foot: J.bot, scale: sp.jogScale, flip, shadow: 24 });
    } else {
      const St = sp.stand[face];
      out.push({ x: bro.x, y: bro.y, img: St.c, fw: St.fw, fi: 0, foot: St.bot, scale: sp.standScale, flip, shadow: 24 });
    }
    /* the goblin walks his beat, the slime bobs, the blacksmith stands by the
       store unless the look brought its own NPC */
    const G = sp.goblin, a = LAYOUT.goblin.a, bb = LAYOUT.goblin.b;
    const span = bb[0] - a[0], period = (2 * span) / 60;
    const ph = (t % period) / period;
    const gx = a[0] + span * (ph < 0.5 ? ph * 2 : 2 - ph * 2);
    out.push({ x: gx, y: a[1], img: G.c, fw: G.fw, fi: Math.floor(gx / 5) % G.n, foot: G.bot, scale: G.scale, flip: ph >= 0.5, shadow: 20 });
    const Sl = sp.slime;
    out.push({ x: LAYOUT.slime.x + Math.sin(t * 0.4) * 60, y: LAYOUT.slime.y + Math.sin(t * 0.7) * 20, img: Sl.c, fw: Sl.fw, fi: Math.floor(t * 12) % Sl.n, foot: Sl.bot, scale: Sl.scale, flip: false, shadow: 24 });
    if (!(this.look && this.look.npc)) {
      const Sm = sp.smith;
      out.push({ x: LAYOUT.npc.x, y: LAYOUT.npc.y, img: Sm.c, fw: Sm.fw, fi: 0, foot: Sm.bot, scale: Sm.scale, flip: false, shadow: 22 });
    }
    return out;
  }

  _drawChar(g, c, x, y, s) {
    const k = c.scale * s;
    const w = Math.round(c.fw * k), h = Math.round(c.img.height * k);
    const fy = Math.round(c.foot * k);
    g.save();
    g.imageSmoothingEnabled = false;
    g.translate(x, y);
    if (c.flip) g.scale(-1, 1);
    g.drawImage(c.img, c.fi * c.fw, 0, c.fw, c.img.height, -Math.round(w / 2), -fy, w, h);
    g.restore();
  }

  _drawThing(g, b, t, x, y) {
    g.imageSmoothingEnabled = false;
    const left = x - Math.round(t.w / 2), top = y - t.h;
    if (t.kind !== 'tree' || !this.opts.sway) { g.drawImage(t.c, left, top); return; }
    /* the canopy sways, the trunk does not: bands of the picture shifted by a
       whole number of art pixels, so a pixel tree stays pixel art */
    const px = b.pixel ? Math.max(1, Math.round(b.pixel * b.s)) : 2;
    const amp = 4 * b.s * Math.sin(this.t * 1.3 + t.phase);
    for (let by = 0; by < t.h; by += px) {
      const hgt = Math.min(px, t.h - by);
      const up = 1 - (by + hgt / 2) / t.h;              /* 1 at the top, 0 at the foot */
      const k = Math.max(0, (up - 0.38) / 0.62);
      let off = amp * k * k;
      off = b.pixel ? Math.round(off / px) * px : Math.round(off);
      g.drawImage(t.c, 0, by, t.w, hgt, left + off, top + by, t.w, hgt);
    }
  }

  /* ── the water: drawn by code, on the look's grid, in the look's colours ── */
  _drawWater(g, b, s, ox, oy) {
    const P = LAYOUT.pond;
    const cell = b.pixel || 2;                          /* game px per water pixel */
    const W = Math.ceil((P.rx * 2.3) / cell), H = Math.ceil((P.ry * 2.3) / cell);
    if (!this._water || this._water.c.width !== W || this._water.c.height !== H) {
      const c = mk(W, H);
      this._water = { c, g: c.getContext('2d'), img: c.getContext('2d').createImageData(W, H) };
    }
    const wb = this._water, d = wb.img.data, t = this.t;
    const x0 = P.x - (W * cell) / 2, y0 = P.y - (H * cell) / 2;
    const near = b.near;
    for (let j = 0; j < H; j++) {
      const wy = y0 + (j + 0.5) * cell, v = (wy - P.y) / P.ry;
      const sy = Math.sin(wy * 0.19 - t * 1.1);
      for (let i = 0; i < W; i++) {
        const wx = x0 + (i + 0.5) * cell, u = (wx - P.x) / P.rx;
        const rho = Math.sqrt(u * u + v * v), th = Math.atan2(v, u);
        const edge = 1 + 0.08 * Math.sin(3 * th + 0.7) + 0.05 * Math.sin(5 * th + 1.9);
        const k = (j * W + i) * 4;
        if (rho > edge * 1.1) { d[k + 3] = 0; continue; }
        let r, gg, bl, a = 255;
        if (rho > edge) {
          /* the wet bank: the ground darkened, the one ring the art does not paint */
          r = 60; gg = 48; bl = 30; a = 110;
        } else {
          const depth = 1 - rho / edge;
          const sd = depth * depth * (3 - 2 * depth);
          r = 78 - 50 * sd; gg = 156 - 86 * sd; bl = 196 - 70 * sd;
          if (Math.sin(wx * 0.07 + t * 1.6) * sy > 0.86) { r += 70; gg += 70; bl += 55; }
          if (depth < 0.07 + 0.03 * Math.sin(t * 2.1 + th * 6)) { r = 226; gg = 238; bl = 240; }
          if (near) { const q = near(r | 0, gg | 0, bl | 0); r = q[0]; gg = q[1]; bl = q[2]; }
        }
        d[k] = r; d[k + 1] = gg; d[k + 2] = bl; d[k + 3] = a;
      }
    }
    wb.g.putImageData(wb.img, 0, 0);
    g.save();
    g.imageSmoothingEnabled = !b.pixel;
    g.drawImage(wb.c, Math.round(x0 * s) - ox, Math.round(y0 * s) - oy, Math.round(W * cell * s), Math.round(H * cell * s));
    g.restore();
    this.stats.water = true;
  }

  /* ── night: darkness with holes where the lights are, dithered onto the
     look's pixel grid when the look has one ── */
  _drawNight(g, b, s, ox, oy, gameH) {
    const dark = { day: 0, dusk: 0.42, night: 0.8 }[this.opts.time] || 0;
    this.stats.night = dark > 0;
    if (!dark) return;
    const cell = b.pixel || 4;
    const W = Math.ceil(this.cv.width / (cell * s)) + 1, H = Math.ceil(gameH / (cell * s)) + 1;
    if (!this._dark || this._dark.c.width !== W || this._dark.c.height !== H) {
      const c = mk(W, H);
      this._dark = { c, g: c.getContext('2d'), img: c.getContext('2d').createImageData(W, H) };
    }
    const D = this._dark, d = D.img.data;
    const L = LAYOUT, bro = this.bro;
    /* x, y, radius, strength: the bro's lantern, the store's two windows, the
       signpost lamp */
    const lights = [
      bro.x, bro.y - 50, 190, 1,
      L.building.x - 70, L.building.y - 110, 150, 0.9,
      L.building.x + 80, L.building.y - 110, 150, 0.9,
      L.signs[0][0], L.signs[0][1] - 80, 120, 0.8,
    ];
    const dusk = this.opts.time === 'dusk';
    const wr = 255, wg = dusk ? 150 : 176, wbl = dusk ? 70 : 92;
    const nr = dusk ? 70 : 10, ng = dusk ? 40 : 16, nb = dusk ? 70 : 44;
    const cx0 = Math.floor(ox / (cell * s)), cy0 = Math.floor(oy / (cell * s));
    const near = b.near, pixel = b.pixel;
    for (let j = 0; j < H; j++) {
      const wy = (cy0 + j + 0.5) * cell;
      for (let i = 0; i < W; i++) {
        const wx = (cx0 + i + 0.5) * cell;
        let lit = 0;
        for (let q = 0; q < lights.length; q += 4) {
          const dx = (wx - lights[q]) / lights[q + 2], dy = ((wy - lights[q + 1]) * 1.25) / lights[q + 2];
          const dd = dx * dx + dy * dy;
          if (dd < 1) { const v = lights[q + 3] * (1 - dd); if (v > lit) lit = v; }
        }
        let a = dark * (1 - lit);
        if (pixel) {
          /* ordered dithering onto five steps: the light falls off in pixel
             bands, the way a pixel artist would draw it */
          a = Math.min(dark, Math.floor(a * 4 + BAYER[((cy0 + j) & 3) * 4 + ((cx0 + i) & 3)]) / 4);
        }
        const w = lit * 0.3;
        const mixw = w / (a + w + 1e-6);
        let r = nr + (wr - nr) * mixw, gg = ng + (wg - ng) * mixw, bl = nb + (wbl - nb) * mixw;
        if (near) { const p = near(r | 0, gg | 0, bl | 0); r = p[0]; gg = p[1]; bl = p[2]; }
        const k = (j * W + i) * 4;
        d[k] = r; d[k + 1] = gg; d[k + 2] = bl; d[k + 3] = Math.round(255 * Math.min(1, a + w));
      }
    }
    D.g.putImageData(D.img, 0, 0);
    g.save();
    g.imageSmoothingEnabled = !pixel;
    const px = cell * s;
    g.drawImage(D.c, Math.round(cx0 * px - ox), Math.round(cy0 * px - oy), Math.round(W * px), Math.round(H * px));
    g.restore();
  }

  _drawWeather(g, b, s, gameH, dt) {
    const kind = this.opts.weather;
    if (kind === 'none') { this.drops.length = 0; this.stats.weather = 0; return; }
    const n = kind === 'rain' ? 150 : 110;
    const vw = this.cv.width / s, vh = gameH / s;
    while (this.drops.length < n) this.drops.push({ x: Math.random() * vw, y: Math.random() * vh, v: 0.7 + Math.random() * 0.6 });
    const px = b.pixel ? Math.max(1, Math.round(b.pixel * s)) : 0;
    g.save();
    g.fillStyle = kind === 'rain' ? 'rgba(200,220,255,.55)' : 'rgba(255,255,255,.9)';
    for (const p of this.drops) {
      if (kind === 'rain') { p.y += 900 * p.v * dt; p.x += 120 * dt; }
      else { p.y += 55 * p.v * dt; p.x += Math.sin(this.t * 1.2 + p.v * 9) * 20 * dt; }
      if (p.y > vh) { p.y -= vh; p.x = Math.random() * vw; }
      if (p.x > vw) p.x -= vw;
      let x = p.x * s, y = p.y * s;
      if (px) {
        x = Math.round(x / px) * px; y = Math.round(y / px) * px;
        if (kind === 'rain') g.fillRect(x, y, px, px * 4); else g.fillRect(x, y, px, px);
      } else if (kind === 'rain') {
        g.fillRect(x, y, Math.max(1, s * 1.2), 16 * s);
      } else {
        g.beginPath(); g.arc(x, y, 2.2 * s, 0, Math.PI * 2); g.fill();
      }
    }
    g.restore();
    this.stats.weather = this.drops.length;
  }

  /* ── walking ── */
  _step(dt) {
    const bro = this.bro;
    let goal = this.target;
    if (!goal && this.opts.auto && this.t - this.lastInput > 4) {
      goal = { x: LAYOUT.walk[this.walkIdx][0], y: LAYOUT.walk[this.walkIdx][1] };
      if (Math.hypot(goal.x - bro.x, goal.y - bro.y) < 12) this.walkIdx = (this.walkIdx + 1) % LAYOUT.walk.length;
    }
    bro.moving = false;
    if (!goal) return;
    const dx = goal.x - bro.x, dy = goal.y - bro.y, dist = Math.hypot(dx, dy);
    if (dist < 6) return;
    const step = Math.min(dist, WALK * dt);
    const nx = bro.x + (dx / dist) * step, ny = bro.y + (dy / dist) * step;
    const free = (x, y) => x > 20 && x < WORLD.w - 20 && y > 60 && y < WORLD.h - 10 && !this._blocked(x, y);
    if (free(nx, ny)) { bro.x = nx; bro.y = ny; }
    else if (free(nx, bro.y)) bro.x = nx;
    else if (free(bro.x, ny)) bro.y = ny;
    else {
      /* walled in on the demo stroll: take the next leg instead */
      this.stuck += dt;
      if (!this.target && this.stuck > 1.5) { this.walkIdx = (this.walkIdx + 1) % LAYOUT.walk.length; this.stuck = 0; }
      return;
    }
    this.stuck = 0;
    bro.dist += step;
    bro.moving = true;
    const ang = Math.atan2(dy, dx);
    bro.face = OCT[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
  }

  _blocked(x, y) {
    const q = pondRho(x, y);
    if (q.rho < q.edge) return true;
    const b = this._built;
    if (!b) return false;
    for (const t of b.things) {
      if (t.kind === 'building') {
        const hw = (t.w / b.s) / 2;
        if (Math.abs(x - t.x) < hw && y < t.y + 8 && y > t.y - 60) return true;
        continue;
      }
      const r = FOOT[t.kind];
      if (r && Math.hypot(x - t.x, (y - t.y) * 1.6) < r) return true;
    }
    return false;
  }
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

function pondRho(x, y) {
  const P = LAYOUT.pond;
  const u = (x - P.x) / P.rx, v = (y - P.y) / P.ry;
  const theta = Math.atan2(v, u);
  return { rho: Math.hypot(u, v), theta, edge: 1 + 0.08 * Math.sin(3 * theta + 0.7) + 0.05 * Math.sin(5 * theta + 1.9) };
}

function pick(list, i) { return list && list.length ? list[i % list.length] : null; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
