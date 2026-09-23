/* ═══ v2.3.2732: THE MONSTERS' SHOTS, DRAWN IN CODE ═══
 *
 * Owner: "take another look at the procedurally drawn projectiles from slimes
 * and fire goblins ... I bet you could make better ones.  Just make sure it's
 * colored correctly (green slimes are recolored to blue during game but I
 * might add green ones later)."
 *
 * What they were: one still picture each -- slime-projectile-v1.png, a round
 * green ball, and the goblin's fireball.png -- slid along the ground line with
 * nothing behind them and nothing when they landed.
 *
 * This file is ONLY the pixel art.  Every function returns plain RGBA pixels
 * ({ w, h, data, ax, ay }) and touches no DOM and no Pixi, so the same code
 * mints the textures in the browser (monsterShotFx.js) and runs under node in
 * server/test/monstershots.test.mjs.  Nothing here is random: every noise term
 * is a hash of its inputs, so a frame is the same frame on every screen and in
 * every test run.
 *
 * THE GRID.  One art pixel is 1.125 world px -- the slime's own pixel (its
 * 128px sheet at 96/128 inside the 1.5x monster container) -- so a ball the
 * slime spits is drawn in the slime's own grain, and the fireball matches it.
 *
 * WHY THE DIRECTIONS ARE BAKED.  Rotating pixel art at draw time spins its
 * LIGHT with it: a glob lit from the top-left would be lit from the bottom-
 * right the moment it flew west.  So each travel direction (DIRS of them) is
 * drawn as its own frame, stretched along its own heading with the light
 * fixed where the rest of the world's light is.  That is also what keeps it
 * crisp: the sprite is never rotated, only placed.
 *
 * WHY THE GOO IS GREY.  The glob is minted in a grey ramp and tinted per
 * thrower at draw time.  Pixi's tint multiplies, so the ramp's white becomes
 * exactly the slime's drawn colour and each darker step a darker shade of it
 * -- the same brightness-ratio relation the recoloured slime sheets are built
 * with (monsterRecolor.js), so a blue slime's ball is the blue of the slime.
 * One set of frames serves every slime colour, including ones not made yet.
 */

export const ART_PX = 1.125;          /* world px per art pixel (see THE GRID) */
export const DIRS = 16;               /* baked travel headings, 22.5 deg apart */
export const GOO_PHASES = 6;          /* the glob's wobble cycle */
export const FIRE_PHASES = 8;         /* the fireball's flicker cycle */
export const FIRE_BURST_FRAMES = 6;
export const GOO_SPLASH_FRAMES = 3;

/* The goo's grey ramp, darkest first.  Index 5 is white = the thrower's colour
   under the tint; the steps below it are the slime sheet's own shades measured
   as a fraction of its lit green (0x5ca84c): 0.90, 0.80, 0.68, 0.59, and 0.45
   for the dark outline.  So a green slime's ball uses the sheet's palette, and
   a recoloured slime's ball the recolour's. */
export const GOO_GREYS = [0x72, 0x96, 0xad, 0xcc, 0xe6, 0xff];

/* Fire, hottest first -- the goblin's own flames (his head and torch): a pale
   yellow-white core, yellow, orange, red-orange, and a dark red edge. */
export const FIRE_RAMP = [0xfff6c8, 0xffd25a, 0xff8a1e, 0xe0431a, 0x9a2210];

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - (1 - t) * (1 - t);

/* 4x4 ordered dither, 0..1 -- the pixel-art way to step between two shades */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x, y) => (BAYER4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;

/* Integer hash -> [0,1).  Deterministic by construction (no Math.random). */
function hash3(x, y, s) {
  let h = (Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(s | 0, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash3(x0, y0, s), b = hash3(x0 + 1, y0, s);
  const c = hash3(x0, y0 + 1, s), d = hash3(x0 + 1, y0 + 1, s);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
const fbm = (x, y, s) => 0.62 * vnoise(x, y, s) + 0.38 * vnoise(x * 2.03 + 17.1, y * 2.03 - 9.7, s + 101);
/* a noise that wraps around a circle, so an animation loops without a seam */
const loopNoise = (a, ph, k, s) => vnoise(Math.cos(a) * k + Math.cos(ph) * 1.7 + 11, Math.sin(a) * k + Math.sin(ph) * 1.7 + 23, s);

/* smooth union of two distances -- what makes the head and the tail one blob */
function smin(a, b, k) {
  const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1);
  return b * (1 - h) + a * h - k * h * (1 - h);
}

function blank(w, h) { return { w, h, data: new Uint8ClampedArray(w * h * 4), ax: 0, ay: 0 }; }
/* A working canvas just big enough for a set of circles (cx, cy, r) around
   the anchor, which sits at (ax, ay).  Sixteen headings of a shape that is
   long in one direction waste most of a square canvas; sizing each one to
   its own shape is what keeps the minting fast. */
function canvasFor(circles, pad) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of circles) {
    x0 = Math.min(x0, c[0] - c[2]); x1 = Math.max(x1, c[0] + c[2]);
    y0 = Math.min(y0, c[1] - c[2]); y1 = Math.max(y1, c[1] + c[2]);
  }
  x0 = Math.floor(x0 - pad); y0 = Math.floor(y0 - pad);
  x1 = Math.ceil(x1 + pad); y1 = Math.ceil(y1 + pad);
  const img = blank(x1 - x0, y1 - y0);
  img.ax = -x0; img.ay = -y0;
  return img;
}
function put(img, x, y, rgb, a) {
  const i = (y * img.w + x) * 4;
  img.data[i] = (rgb >> 16) & 255; img.data[i + 1] = (rgb >> 8) & 255; img.data[i + 2] = rgb & 255;
  img.data[i + 3] = a == null ? 255 : a;
}
const grey = (g) => (g << 16) | (g << 8) | g;

/* Crop a working canvas to what was drawn (+1px margin) and carry the anchor
   over.  A frame is only as big as its own shape, which is what keeps sixteen
   headings of animation small. */
function crop(img) {
  let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (img.data[(y * img.w + x) * 4 + 3]) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) { const e = blank(1, 1); e.ax = 0.5; e.ay = 0.5; return e; }
  x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1);
  x1 = Math.min(img.w - 1, x1 + 1); y1 = Math.min(img.h - 1, y1 + 1);
  const out = blank(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = 0; y < out.h; y++) {
    const src = ((y + y0) * img.w + x0) * 4;
    out.data.set(img.data.subarray(src, src + out.w * 4), y * out.w * 4);
  }
  out.ax = img.ax - x0;
  out.ay = img.ay - y0;
  return out;
}

/* Light comes from the top-left and a little toward the viewer, the way the
   slime sheets and the fireball art are lit. */
const LX = -0.55, LY = -0.72, LZ = 0.62;
const LN = Math.hypot(LX, LY, LZ);
const L = [LX / LN, LY / LN, LZ / LN];
const LXY = Math.hypot(L[0], L[1]);

/* ── THE GOO GLOB ─────────────────────────────────────────────────────────
   A teardrop of jelly: a round head that leads, a tapering tail stretched out
   behind it by the throw, both one smooth blob.  The head wobbles (a two- and
   a three-lobed ripple rolling round it), the tail wags, and a drip swells at
   its tip and pinches off on the second half of the cycle.
   Shaded as a dome from the distance field: lit top-left, a dark keyline all
   round (lighter where the light hits it), and -- because it is jelly -- a
   glow along the inside of the rim AWAY from the light, where light that went
   in at the top comes back out.  Two small bubbles drift inside.
   `R` is the head radius in art px, `dir` 0..DIRS-1 the heading (0 = east,
   clockwise on screen), `phase` 0..GOO_PHASES-1.  The anchor is the head's
   centre, which is the point the projectile flies. */
export function gooFrame(R, dir, phase) {
  const th = (dir / DIRS) * TAU, ux = Math.cos(th), uy = Math.sin(th);
  const nx = -uy, ny = ux;
  const ph = (phase / GOO_PHASES) * TAU;
  const Lt = R * 1.6;                               /* head centre -> tail tip */
  const img = canvasFor([[0, 0, R * 1.2], [-ux * Lt, -uy * Lt, R * 0.62]], 2);
  const W = img.w, Hh = img.h, cx0 = img.ax, cy0 = img.ay;
  /* The teardrop is an UNEVEN CAPSULE -- a big circle and a small one joined
     by their common tangents -- so the head runs into the tail with no neck.
     Local axes: `b` measured back along the tail, `l` across it. */
  const tipR = R * (0.29 + 0.07 * Math.sin(ph));    /* the tip swells and thins: a bead of goo on the end */
  const sdf = (px, py) => {
    const r = Math.hypot(px, py) || 1e-6;
    const a = Math.atan2(py, px);
    const b = -(px * ux + py * uy);
    /* the tail wags a little, more toward its tip */
    const t = clamp(b / Lt, 0, 1);
    const l = Math.abs(px * nx + py * ny - Math.sin(t * 2.6 - ph) * 0.2 * R * t * t);
    /* the head wobbles: a two- and a three-lobed ripple rolling round it,
       strongest on the leading face, where the air pushes on it */
    const lead = Math.max(0, -b / r);
    const wob = 0.075 * Math.cos(2 * (a - th) + ph) + 0.045 * Math.cos(3 * a - 2 * ph + 1.3);
    const R1 = R * (1 + wob * (0.6 + 0.6 * lead));
    const kk = (R1 - tipR) / Lt, ka = Math.sqrt(Math.max(0, 1 - kk * kk));
    const kq = -l * kk + b * ka;
    if (kq < 0) return { d: Math.hypot(l, b) - R1, t: 0 };
    if (kq > ka * Lt) return { d: Math.hypot(l, b - Lt) - tipR, t: 1 };
    /* ...and the goo thins a little just behind the head as it is pulled out */
    return { d: l * ka + b * kk - R1 + R * 0.07 * Math.sin(Math.PI * t) * (0.6 + 0.4 * Math.sin(ph + 1)), t };
  };
  /* one distance per pixel, and the shading's normal from the grid itself --
     no second pass through the distance function per pixel */
  const dm = new Float32Array(W * Hh).fill(1), tm = new Float32Array(W * Hh);
  for (let y = 0; y < Hh; y++) {
    for (let x = 0; x < W; x++) {
      const r = sdf(x + 0.5 - cx0, y + 0.5 - cy0);
      dm[y * W + x] = r.d; tm[y * W + x] = r.t;
    }
  }
  /* two bubbles drifting inside the head */
  const bub = [
    [Math.cos(ph * 0.5 + 2.4) * R * 0.36 + ux * R * 0.1, Math.sin(ph * 0.5 + 2.4) * R * 0.28 + R * 0.14, 1.2],
    [Math.cos(-ph + 4.2) * R * 0.2 - R * 0.12, Math.sin(-ph + 4.2) * R * 0.18 + R * 0.34, 0.85],
  ];
  for (let y = 1; y < Hh - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const k = y * W + x;
      const d = dm[k];
      if (d >= 0) continue;
      const px = x + 0.5 - cx0, py = y + 0.5 - cy0;
      const t = tm[k];
      const edge = dm[k - 1] >= 0 || dm[k + 1] >= 0 || dm[k - W] >= 0 || dm[k + W] >= 0;
      const gx = dm[k + 1] - dm[k - 1], gy = dm[k + W] - dm[k - W];
      const gl = Math.hypot(gx, gy) || 1;
      const ogx = gx / gl, ogy = gy / gl;
      const facesLight = (ogx * L[0] + ogy * L[1]) / LXY;
      let idx;
      if (edge) {
        idx = facesLight > 0.25 ? 1 : 0;
      } else {
        /* a dome over the local thickness: the head's radius, thinning to the tip's */
        const rl = R * (1 - t) + tipR * t + 0.5;
        const depth = clamp(-d / rl, 0, 1);
        const m = 1 - depth;
        const nzz = Math.sqrt(Math.max(0, 1 - m * m));
        const diff = Math.max(0, ogx * m * L[0] + ogy * m * L[1] + nzz * L[2]);
        /* jelly: light that went in at the top comes back out along the far rim,
           and the thick middle of the glob is darker than its skin */
        const glow = smoothstep(0.34, 0.02, depth) * clamp(-facesLight + 0.15, 0, 1);
        const v = 0.3 + 0.82 * diff + 0.5 * glow - 0.16 * depth * depth + (bayer(x, y) - 0.5) * 0.07;
        idx = v < 0.44 ? 1 : v < 0.58 ? 2 : v < 0.71 ? 3 : v < 0.86 ? 4 : 5;
        for (const bb of bub) {
          const bd = Math.hypot(px - bb[0], py - bb[1]);
          if (bd < bb[2] && depth > 0.3) idx = Math.min(5, Math.max(idx, 4) + (bd < bb[2] * 0.5 ? 1 : 0));
        }
      }
      put(img, x, y, grey(GOO_GREYS[idx]));
    }
  }
  return crop(img);
}

/* The glob's specular highlight: a small untinted white shine at the head's
   top-left, drawn over the tinted glob (a tint can only darken, so a shine
   lighter than the slime has to be its own sprite).  Anchor = head centre, so
   it sits on any frame of any heading. */
export function gooShine(R) {
  const half = Math.ceil(R) + 2, W = half * 2;
  const img = blank(W, W);
  img.ax = half; img.ay = half;
  const cx = -0.4 * R, cy = -0.42 * R, rx = Math.max(1.3, 0.3 * R), ry = Math.max(0.9, 0.19 * R);
  const ca = Math.cos(-0.6), sa = Math.sin(-0.6);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const px = x + 0.5 - half - cx, py = y + 0.5 - half - cy;
      const qx = px * ca - py * sa, qy = px * sa + py * ca;
      const q = (qx * qx) / (rx * rx) + (qy * qy) / (ry * ry);
      if (q < 0.55) put(img, x, y, 0xffffff, 245);
      else if (q < 1.05) put(img, x, y, 0xffffff, 120);
    }
  }
  /* and a single glint pixel lower on the dome */
  const gx = Math.round(half + 0.1 * R), gy = Math.round(half - 0.62 * R);
  if (gx >= 0 && gy >= 0 && gx < W && gy < W) put(img, gx, gy, 0xffffff, 200);
  return crop(img);
}

/* ── THE FIREBALL ─────────────────────────────────────────────────────────
   A white-hot head and a comet tail of licking tongues, stepped through the
   goblin's five flame colours with an ordered dither.  The tongues scroll
   back along the tail as the frames advance (they are blown off the head),
   and the tail bends a little UP whichever way it flies -- flame rises -- so
   a fireball thrown sideways reads as fire, not as a comet.
   `Rh` head radius, `Lt` tail length, both art px.  Anchor = the head. */
/* distance to an uneven capsule running from a (radius ra) to b (radius rb) */
function sdSeg(px, py, ax, ay, bx, by, ra, rb) {
  const vx = bx - ax, vy = by - ay;
  const L2 = vx * vx + vy * vy || 1e-6, Ls = Math.sqrt(L2);
  const t = clamp(((px - ax) * vx + (py - ay) * vy) / L2, 0, 1);
  const qx = ax + vx * t, qy = ay + vy * t;
  return Math.hypot(px - qx, py - qy) - (ra + (rb - ra) * t) * (Ls > 0 ? 1 : 1);
}

export function fireFrame(Rh, Lt, dir, phase) {
  const th = (dir / DIRS) * TAU, ux = Math.cos(th), uy = Math.sin(th);
  const nx = -uy, ny = ux;
  const ph = (phase / FIRE_PHASES) * TAU;
  /* the head, and the tail's reach -- bent upward, so its far end sits higher */
  const tb = Lt * 1.08, rise = Lt * 0.2 * 1.17;
  const img = canvasFor([[0, 0, Rh * 1.15], [-ux * tb, -uy * tb - rise, Rh * 1.35], [-ux * tb * 0.5, -uy * tb * 0.5 - rise * 0.25, Rh * 1.35]], 3);
  const W = img.w, Hh = img.h, cx0 = img.ax, cy0 = img.ay;
  const pulse = 1 + 0.05 * Math.sin(ph * 2);
  /* Three tongues lick back off the head -- a long one down the middle and a
     shorter one each side -- waving across the tail and stretching and
     shrinking out of step with each other.  All in the head's own frame
     (b = distance back along the tail, l = across it). */
  const T = [];
  for (let i = 0; i < 3; i++) {
    const side = i - 1;
    const len = Lt * (side === 0 ? 1.0 : 0.72) * (0.86 + 0.14 * Math.sin(ph + i * 2.1));
    T.push({
      b0: Rh * 0.15, l0: side * Rh * 0.5,
      b1: len, l1: side * Rh * 0.95 + Math.sin(ph + i * 1.7) * Rh * 0.35,
      r0: Rh * (side === 0 ? 0.8 : 0.52), r1: 0.55,
      bend: Math.sin(ph * 1 + i * 2.4) * Rh * 0.45,
    });
  }
  const sdf = (px, py) => {
    const b0 = -(px * ux + py * uy);
    const s0 = clamp(b0 / Lt, 0, 1.3);
    const by = py + Lt * 0.2 * s0 * s0;           /* flame rises */
    const b = -(px * ux + by * uy);
    const l = px * nx + by * ny;
    let d = Math.hypot(px, py) - Rh * pulse;
    for (const t of T) {
      const sN = clamp(b / t.b1, 0, 1);
      const lb = l - t.bend * sN * sN;          /* the tongue curls as it goes */
      d = smin(d, sdSeg(b, lb, t.b0, t.l0, t.b1, t.l1, t.r0, t.r1), 1.4);
    }
    return { d, sN: clamp(b / Lt, 0, 1) };
  };
  const dm = new Float32Array(W * Hh), sm = new Float32Array(W * Hh);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const r = sdf(x + 0.5 - cx0, y + 0.5 - cy0);
    dm[y * W + x] = r.d; sm[y * W + x] = r.sN;
  }
  for (let y = 1; y < Hh - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const k = y * W + x;
      if (dm[k] >= 0) {
        /* a loose spark or two thrown off the tongues */
        if (dm[k] < 3.5 && sm[k] > 0.35 && hash3(x, y, 211 + phase) > 0.95) put(img, x, y, FIRE_RAMP[1 + (hash3(x, y, 223) * 2 | 0)]);
        continue;
      }
      /* Pixel fire is banded by DEPTH: the outside of every flame is red and
         the colours step inward to a pale core only where it is thick enough
         -- so the thin tongue tips burn red and the head burns white.  The
         tail runs cooler the further back it is. */
      const edge = dm[k - 1] >= 0 || dm[k + 1] >= 0 || dm[k - W] >= 0 || dm[k + W] >= 0;
      const depth = -dm[k] * (1 - 0.45 * sm[k]) + (bayer(x, y) - 0.5) * 0.7;
      let idx;
      if (edge) idx = 4;
      else if (depth > Rh * 0.62) idx = 0; else if (depth > Rh * 0.36) idx = 1;
      else if (depth > Rh * 0.16) idx = 2; else idx = 3;
      put(img, x, y, FIRE_RAMP[idx]);
    }
  }
  return crop(img);
}

/* The fire's burst when it lands: the head blows open into a fan of flame
   tongues that climb and curl upward while a low sheet of fire splashes out
   along the ground, then the whole thing cools through the ramp and breaks
   up.  Banded by depth like the fireball, so it is the same fire.  Anchor =
   the impact point. */
export function fireBurstFrame(Rb, k) {
  const t = (k + 0.5) / FIRE_BURST_FRAMES;
  const half = Math.ceil(Rb * 2.2 + 4), W = half * 2;
  const img = blank(W, W);
  img.ax = half; img.ay = Math.round(half * 1.25);
  const grow = easeOut(Math.min(1, t * 1.6));
  const tongues = [];
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (0.08 + 0.84 * (i / 6)) + (hash3(i, 5, 301) - 0.5) * 0.3;   /* an upward fan */
    const len = Rb * (0.75 + 0.6 * hash3(i, 7, 303)) * grow * (1 + 0.35 * t);
    tongues.push({ a, len, r0: Rb * (0.34 + 0.12 * hash3(i, 9, 307)) * (1 - 0.45 * t), curl: (hash3(i, 11, 309) - 0.5) * Rb * 0.5 });
  }
  const sdf = (px, py) => {
    /* the blast's heart, flattened where it meets the ground */
    const cr = Rb * (0.62 + 0.4 * grow) * (1 - 0.55 * t);
    let d = Math.hypot(px, py < 0 ? py : py * 2.4) - cr;
    /* the sheet of fire thrown out along the ground */
    const sheet = Math.hypot(px / (Rb * (0.9 + 0.9 * grow)), (py - Rb * 0.05) / (Rb * 0.26)) - 1;
    d = smin(d, sheet * Rb * 0.3, Rb * 0.25);
    for (const tg of tongues) {
      const ex = Math.cos(tg.a) * tg.len, ey = Math.sin(tg.a) * tg.len - tg.len * 0.35 * t;   /* rising */
      const sN = clamp((px * Math.cos(tg.a) + py * Math.sin(tg.a)) / Math.max(1, tg.len), 0, 1);
      d = smin(d, sdSeg(px - tg.curl * sN * sN, py, 0, 0, ex, ey, tg.r0, 0.5), Rb * 0.18);
    }
    return d;
  };
  const dm = new Float32Array(W * W);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) dm[y * W + x] = sdf(x + 0.5 - img.ax, y + 0.5 - img.ay);
  const cool = 1 - 0.62 * t;
  for (let y = 1; y < W - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const kk = y * W + x;
      if (dm[kk] >= 0) continue;
      /* it breaks up as it burns out */
      if (t > 0.45 && fbm(x * 0.35 + k * 3, y * 0.35 - k * 2, 311) < (t - 0.45) * 1.25) continue;
      const edge = dm[kk - 1] >= 0 || dm[kk + 1] >= 0 || dm[kk - W] >= 0 || dm[kk + W] >= 0;
      const depth = -dm[kk] * cool + (bayer(x, y) - 0.5) * 0.8;
      let idx;
      if (edge) idx = 4;
      else if (depth > Rb * 0.5) idx = 0; else if (depth > Rb * 0.3) idx = 1;
      else if (depth > Rb * 0.13) idx = 2; else idx = 3;
      put(img, x, y, FIRE_RAMP[idx]);
    }
  }
  return crop(img);
}

/* A burnt patch left on the ground: charred black at the centre, brown ash
   round it, a ragged edge.  Anchor = centre. */
export function scorchMark(Rx, seed) {
  const ry = Rx * 0.42;
  const half = Math.ceil(Rx * 1.25) + 2, hh = Math.ceil(ry * 1.4) + 2;
  const img = blank(half * 2, hh * 2);
  img.ax = half; img.ay = hh;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const px = x + 0.5 - half, py = y + 0.5 - hh;
      const a = Math.atan2(py / ry, px / Rx);
      const rr = Math.hypot(px / Rx, py / ry) / (0.82 + 0.3 * vnoise(Math.cos(a) * 2.6 + seed, Math.sin(a) * 2.6, 61));
      const n = fbm(px * 0.45 + seed * 3, py * 0.8, 67);
      if (rr > 1) continue;
      if (rr > 0.78 && n < 0.45) continue;              /* ragged, broken rim */
      /* charred black in the middle and a rim of pale ASH round it -- the ash
         is what shows on the Flame Fields' own dark, cracked ground, where a
         dark mark on dark earth reads as nothing */
      const c = rr < 0.45 ? 0x1b1411 : rr < 0.72 ? 0x2c2019 : 0x8a7d70;
      const al = rr < 0.45 ? 215 : rr < 0.72 ? 185 : 150;
      put(img, x, y, c, al);
    }
  }
  return crop(img);
}

/* A little splat of goo on the ground where a glob landed, drawn the way the
   slime's own death puddle is (slime-remnants-v1.png): a star of rounded arms
   foreshortened onto the ground, a dark keyline, a light rim along the edges
   that face the light, a darker lip on the ones that do not, and a few loose
   droplets round it.  Grey -- tinted to the thrower like the glob.  Anchor =
   centre. */
export function gooPuddle(R, seed) {
  const rx = R * 1.15, ry = R * 0.6;
  const half = Math.ceil(rx * 1.7) + 2, hh = Math.ceil(ry * 1.9) + 2;
  const img = blank(half * 2, hh * 2);
  img.ax = half; img.ay = hh;
  const arms = 5 + (hash3(seed, 1, 401) * 2 | 0);
  const a0 = hash3(seed, 2, 403) * TAU;
  const A = [];
  for (let i = 0; i < arms; i++) {
    const a = a0 + (i + (hash3(i, seed, 405) - 0.5) * 0.5) / arms * TAU;
    A.push([Math.cos(a), Math.sin(a), 0.7 + 0.36 * hash3(i, seed, 407), 0.25 + 0.08 * hash3(i, seed, 409)]);
  }
  const drops = [];
  for (let i = 0; i < 4; i++) {
    const a = hash3(i, seed, 411) * TAU, d = 1.2 + 0.3 * hash3(i, seed, 413);
    drops.push([Math.cos(a) * d, Math.sin(a) * d, 0.13 + 0.07 * hash3(i, seed, 415)]);
  }
  /* distance in units of rx, measured in the un-foreshortened ground plane */
  const sdf = (u, v) => {
    let d = Math.hypot(u, v) - 0.56;
    for (const a of A) d = smin(d, sdSeg(u, v, 0, 0, a[0] * a[2], a[1] * a[2], 0.36, a[3]), 0.2);
    let dd = 9;
    for (const q of drops) dd = Math.min(dd, Math.hypot(u - q[0], v - q[1]) - q[2]);
    return Math.min(d, dd);
  };
  const W = img.w, Hh = img.h;
  const dm = new Float32Array(W * Hh);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    dm[y * W + x] = sdf((x + 0.5 - half) / rx, (y + 0.5 - hh) / ry) * rx;
  }
  for (let y = 1; y < Hh - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const k = y * W + x;
      if (dm[k] >= 0) continue;
      const edge = dm[k - 1] >= 0 || dm[k + 1] >= 0 || dm[k - W] >= 0 || dm[k + W] >= 0;
      let idx;
      if (edge) idx = 0;
      else {
        /* which way the nearest edge faces: toward the light (top-left) gets
           the bright rim line, away from it the dark lip */
        const gx = dm[k + 1] - dm[k - 1], gy = dm[k + W] - dm[k - W];
        const gl = Math.hypot(gx, gy) || 1;
        const face = (gx * L[0] + gy * L[1]) / gl / LXY;
        const depth = -dm[k];
        if (depth < 1.6 && face > 0.2) idx = 5;
        else if (depth < 1.6 && face < -0.3) idx = 1;
        else idx = (bayer(x, y) < clamp(-(x - half) / rx - (y - hh) / ry - 0.1, 0, 1) * 0.85) ? 4 : 3;
      }
      put(img, x, y, grey(GOO_GREYS[idx]));
    }
  }
  return crop(img);
}

/* The glob hitting something: it slaps flat and throws a crown of goo up and
   out; on the last frame the crown's tips have come off as drops.  Grey,
   tinted.  Anchor = the contact point at the bottom of the splash. */
export function gooSplashFrame(R, k) {
  const t = (k + 0.5) / GOO_SPLASH_FRAMES;
  const half = Math.ceil(R * 2.1) + 3, hgt = Math.ceil(R * 2.3) + 3;
  const img = blank(half * 2, hgt + Math.ceil(R * 0.7) + 2);
  img.ax = half; img.ay = hgt;
  const baseRx = R * (1.05 + 0.45 * t), baseRy = R * (0.42 - 0.08 * t);
  const spikes = 7;
  const sdf = (px, py) => {
    let d = Math.hypot(px / baseRx, (py + baseRy * 0.2) / baseRy) - 1;
    d *= Math.min(baseRx, baseRy);
    for (let i = 0; i < spikes; i++) {
      const a = Math.PI + (i + 0.5) / spikes * Math.PI;          /* upper half */
      const len = R * (0.7 + 0.55 * hash3(i, 3, 89)) * (0.55 + 0.9 * t);
      const ex = Math.cos(a) * (baseRx * 0.8 + len * 0.7), ey = Math.sin(a) * len * 1.1 - baseRy * 0.2;
      const sx = Math.cos(a) * baseRx * 0.55, sy = -baseRy * 0.2;
      const vx = ex - sx, vy = ey - sy, vl2 = vx * vx + vy * vy || 1;
      const u = clamp(((px - sx) * vx + (py - sy) * vy) / vl2, 0, 1);
      const cx = sx + vx * u, cy = sy + vy * u;
      const rr = R * (0.26 - 0.18 * u);
      const ds = Math.hypot(px - cx, py - cy) - rr;
      if (k < GOO_SPLASH_FRAMES - 1 || u < 0.55) d = smin(d, ds, R * 0.18);
      /* the tip drop: attached while the crown rises, flying free on the last frame */
      const dropOff = k === GOO_SPLASH_FRAMES - 1 ? R * 0.45 : 0;
      const dd = Math.hypot(px - ex - Math.cos(a) * dropOff, py - ey - Math.sin(a) * dropOff) - R * (0.2 + 0.05 * t);
      d = k === GOO_SPLASH_FRAMES - 1 ? Math.min(d, dd) : smin(d, dd, R * 0.12);
    }
    return d;
  };
  const W = img.w, Hh = img.h;
  const map = new Uint8Array(W * Hh);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    if (sdf(x + 0.5 - half, y + 0.5 - hgt) < 0) map[y * W + x] = 1;
  }
  for (let y = 0; y < Hh; y++) {
    for (let x = 0; x < W; x++) {
      const kk = y * W + x;
      if (!map[kk]) continue;
      const up = !map[kk - W], dn = !map[kk + W], lf = !map[kk - 1], rt = !map[kk + 1];
      const px = x + 0.5 - half, py = y + 0.5 - hgt;
      let idx;
      if (up || dn || lf || rt) idx = (up && !dn && px < 0) ? 1 : 0;
      else {
        const v = 0.6 - 0.35 * (py / (R * 1.6)) - 0.18 * (px / (R * 2)) + (bayer(x, y) - 0.5) * 0.12;
        idx = v > 0.86 ? 5 : v > 0.7 ? 4 : v > 0.52 ? 3 : 2;
      }
      put(img, x, y, grey(GOO_GREYS[idx]));
    }
  }
  return crop(img);
}

/* Small pieces, all grey (tinted at draw time):
     drop3 / drop2   a flying drop of goo
     dot3 / dot4     a drop that has landed, flattened on the ground
     px1 / px2       a square spark or ember (white; tinted through the ramp)
     smoke           a soft puff
     shadow          an ellipse for a ball's shadow (drawn black, faint) */
export function smallPieces() {
  const mk = (rows, pal) => {
    const h = rows.length, w = rows[0].length;
    const img = blank(w, h);
    img.ax = w / 2; img.ay = h / 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch !== '.') put(img, x, y, pal[ch][0], pal[ch][1]);
    }
    return img;
  };
  const G = { O: [grey(GOO_GREYS[0]), 255], D: [grey(GOO_GREYS[2]), 255], M: [grey(GOO_GREYS[4]), 255], L: [0xffffff, 255] };
  const Wt = { W: [0xffffff, 255], a: [0xffffff, 150], b: [0xffffff, 70] };
  const K = { K: [0x000000, 255] };
  const out = {
    drop3: mk(['.O.', 'OLO', 'ODO', '.O.'], G),
    drop2: mk(['LM', 'DO'], G),
    dot3: mk(['.OO.', 'OMDO', '.OO.'], G),
    dot4: mk(['.OOO.', 'OLMDO', '.OOO.'], G),
    px1: mk(['W'], Wt),
    px2: mk(['WW', 'WW'], Wt),
    smoke: mk(['.bab.', 'baWab', 'aWWWa', 'baWab', '.bab.'], Wt),
    shadow: mk([
      '...KKKKKKKK...',
      '.KKKKKKKKKKKK.',
      'KKKKKKKKKKKKKK',
      '.KKKKKKKKKKKK.',
      '...KKKKKKKK...',
    ], K),
  };
  return out;
}

/* A smooth round glow for fire light (light is not pixel art: an additive,
   soft falloff, the staffCastFx precedent).  White; tinted at draw time. */
export function softGlow(size) {
  const img = blank(size, size);
  img.ax = size / 2; img.ay = size / 2;
  const c = size / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const r = Math.hypot(x + 0.5 - c, y + 0.5 - c) / c;
    if (r >= 1) continue;
    put(img, x, y, 0xffffff, Math.round(255 * Math.pow(1 - r, 2.2)));
  }
  return img;
}
