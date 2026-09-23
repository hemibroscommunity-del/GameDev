/* ═══ v2.3.2744: THE CAMPFIRE'S PIXEL ART, MINTED IN CODE ═══
 *
 * Owner: "I saw you can create good looking pixel flames.  Instead of the
 * current generated fire (after lighting logs for firewood) ... I want you
 * recreate it better."
 *
 * Everything here is drawn into ONE small canvas at startup (no files, nothing
 * to download, nothing loaded on first sight -- the preloading LAW), sampled
 * NEAREST by campfireFx.js so every art pixel stays a hard square.  This module
 * has no imports on purpose: it is plain canvas maths, so a test page can mint
 * the same atlas the game does and look at it.
 *
 * What is in the atlas:
 *   flame   FLAME_FRAMES looping frames x FLAME_SIZES sizes.  Built from five
 *           tongues (a tall centre, two shoulders, two small licks at the
 *           edges) whose heights breathe, whose tips sway and along which a
 *           travelling wave licks upward; an upward-scrolling noise field
 *           breaks the edges; detached licks tear off the tips and rise.
 *           Heat maps onto a six-step ramp, white-hot at the core and base to a
 *           dark red rim -- the rim IS the outline, as in hand-drawn fire.
 *           Every time term completes a whole number of cycles per loop, so
 *           frame FLAME_FRAMES-1 flows into frame 0 with no seam.
 *   logs    two logs crossed in an X, seen from the game's 3/4 view (a 45°
 *           log foreshortens to a 1:2 pixel slope), shaded as cylinders lit
 *           from above, bark streaked along the grain, end grain with a ring
 *           on the two ends that face the camera.  Split into a BACK half
 *           (under the flame) and a FRONT half (over its base), so the fire
 *           burns between them.  LOG_STAGES stages of char: each bark pixel has
 *           its own threshold, lower near the crossing where the flame licks,
 *           so the wood blackens pixel by pixel from the middle outward, ends
 *           in ash, and grows glowing cracks (a separate additive layer).
 *   puffs   smoke, six sizes, lit from the upper left, dithered rim.
 *   glow    the warm pool of light the fire throws on the ground, and a
 *           smaller halo in the air behind the flame, both in stepped bands
 *           (a soft gradient is exactly what this replaces).
 *   sq      one white pixel: sparks and embers are squares of it.
 */

export const FLAME_W = 18;
export const FLAME_H = 25;
export const FLAME_FRAMES = 16;
/* heights relative to a full fire: catching, growing, settling, full */
export const FLAME_SIZES = [0.34, 0.58, 0.8, 1];
export const LOG_W = 24;
export const LOG_H = 15;
export const LOG_STAGES = 6;
export const PUFF_R = [1.5, 2, 2.6, 3.3, 4.1, 5];
export const GLOW_W = 40;
export const GLOW_H = 14;
export const HALO_R = 10;

/* where the flame's base sits in the log cell: the crossing of the two logs */
export const LOG_CROSS = { x: 12, y: 7 };

const TAU = Math.PI * 2;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* value noise on a gw x gh grid that WRAPS both ways -- so a field scrolled by
   exactly gh cells over one loop comes back to where it started */
function wrapNoise(gw, gh, seed) {
  const r = rng(seed);
  const g = new Float32Array(gw * gh);
  for (let i = 0; i < g.length; i++) g[i] = r();
  const at = (xi, yi) => g[(((yi % gh) + gh) % gh) * gw + (((xi % gw) + gw) % gw)];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
  };
}

/* ── flame ── */
/* hot -> cool; below the last step the pixel is empty */
export const FLAME_RAMP = [
  [0.95, 0xfffbe4],
  [0.80, 0xffe06a],
  [0.64, 0xffb534],
  [0.47, 0xff8121],
  [0.31, 0xe4511d],
  [0.16, 0x9e2715],
];
/* bx base offset, w half-width at the base, h height (size 1), amp/f/ph height
   breathing, sway/sf/sph tip sway, wob/wf the lick travelling up the tongue.
   f, sf and wf are whole cycles per loop -- the seamless-loop rule. */
const TONGUES = [
  { bx: 0,    w: 3.9, h: 17.5, amp: 0.09, f: 2, ph: 0.00, sway: 1.2, sf: 1, sph: 0.10, wob: 0.8, wf: 3 },
  { bx: -2.9, w: 2.6, h: 10,   amp: 0.17, f: 3, ph: 0.35, sway: 1.0, sf: 2, sph: 0.55, wob: 0.6, wf: 4 },
  { bx: 3.1,  w: 2.6, h: 11.5, amp: 0.15, f: 2, ph: 0.70, sway: 1.0, sf: 1, sph: 0.80, wob: 0.6, wf: 3 },
  { bx: -5.4, w: 1.6, h: 5,    amp: 0.35, f: 4, ph: 0.20, sway: 0.6, sf: 2, sph: 0.30, wob: 0.35, wf: 5 },
  { bx: 5.5,  w: 1.6, h: 4.5,  amp: 0.35, f: 3, ph: 0.60, sway: 0.6, sf: 3, sph: 0.90, wob: 0.35, wf: 5 },
];
/* licks that tear off a tongue's tip and rise, shrinking: birth phase, life
   (fraction of the loop), which tongue, sideways drift, radius */
const LICKS = [
  { p: 0.02, life: 0.30, k: 0, dx: 0.6,  r: 1.6, rise: 6 },
  { p: 0.27, life: 0.26, k: 2, dx: 0.45, r: 1.3, rise: 4.5 },
  { p: 0.52, life: 0.32, k: 0, dx: -0.7, r: 1.5, rise: 6 },
  { p: 0.78, life: 0.24, k: 1, dx: -0.35, r: 1.2, rise: 4.5 },
];
const NOISE_CELL = 3.2;          /* art px per noise cell */
const NOISE_GW = 8, NOISE_GH = 7; /* 7 cells tall -> 22.4 px of scroll per loop */

function tongueGeom(T, t, s) {
  const H = T.h * s * (1 + T.amp * Math.sin(TAU * (t * T.f + T.ph)));
  return H;
}

function flameHeat(x, y, t, s, noise) {
  const h = (FLAME_H - 1 - y) + 0.5;
  const cx = (FLAME_W - 1) / 2;
  let heat = 0;
  for (const T of TONGUES) {
    const H = tongueGeom(T, t, s);
    if (H < 1.2 || h > H + 0.4) continue;
    const v = Math.min(1, h / H);
    const xc = cx + T.bx * (0.55 + 0.45 * s)
      + T.sway * s * Math.sin(TAU * (t * T.sf + T.sph)) * Math.pow(v, 1.5)
      + T.wob * s * Math.sin(TAU * (v * 1.1 - t * T.wf)) * v;
    const hw = T.w * (0.62 + 0.38 * s) * Math.pow(1 - v, 0.6) * (0.8 + 0.2 * Math.sin(Math.PI * Math.min(1, v * 2.4)));
    const edge = hw + 0.6;
    const dx = Math.abs(x - xc);
    if (dx >= edge) continue;
    const k = Math.pow(1 - dx / edge, 0.8) * (1.06 - 0.6 * v);
    /* soft max: overlapping tongues read hotter where they meet */
    heat = heat + k - heat * k;
  }
  for (const L of LICKS) {
    let a = t - L.p; a -= Math.floor(a);
    if (a >= L.life) continue;
    a /= L.life;
    const T = TONGUES[L.k];
    const tip = tongueGeom(T, t, s);
    const by = (FLAME_H - 1) - (tip - 0.5 + a * L.rise * s);
    const bxp = cx + T.bx * (0.55 + 0.45 * s) + L.dx * a * 3 + T.sway * s * Math.sin(TAU * (t * T.sf + T.sph));
    const r = L.r * (0.55 + 0.45 * s) * (1 - a * 0.75);
    const d = Math.hypot(x - bxp, (y - by) * 0.8);
    if (d < r + 0.5) {
      const k = (1 - d / (r + 0.5)) * (0.62 - 0.3 * a) + 0.12;
      if (k > heat) heat = k;
    }
  }
  if (heat <= 0) return 0;
  /* the flicker: noise rising through the flame, biting hardest at the rim
     and the top where fire is thinnest */
  const n = noise(x / NOISE_CELL, (y + t * NOISE_GH * NOISE_CELL) / NOISE_CELL);
  const bite = 0.14 + 0.2 * (1 - Math.min(1, heat * 1.3));
  return heat + (n - 0.5) * bite;
}

export function flameBand(heat) {
  for (let i = 0; i < FLAME_RAMP.length; i++) if (heat >= FLAME_RAMP[i][0]) return i;
  return -1;
}

/* One frame as ramp indices (-1 = empty), then cleaned the way a pixel artist
   would: a lone pixel with no same-or-hotter neighbour is dropped, a one-pixel
   hole is filled, and a pixel of a band none of its four neighbours share
   takes their commonest band.  Noise makes fire lively; single stray pixels
   only make it grainy. */
function flameBands(t, s, noise) {
  const W = FLAME_W, H = FLAME_H;
  const a = new Int8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) a[y * W + x] = flameBand(flameHeat(x, y, t, s, noise));
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? -1 : a[y * W + x];
  const out = new Int8Array(a);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = a[y * W + x];
      const n = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
      const filled = n.filter((b) => b >= 0);
      if (v >= 0 && filled.length === 0 && y < H - 3) { out[y * W + x] = -1; continue; }
      if (v < 0 && filled.length === 4) { out[y * W + x] = Math.max(...filled); continue; }
      if (v >= 0 && filled.length >= 3 && !n.includes(v)) {
        const cnt = {};
        for (const b of filled) cnt[b] = (cnt[b] || 0) + 1;
        let best = v, bn = 0;
        for (const k in cnt) if (cnt[k] > bn) { bn = cnt[k]; best = +k; }
        out[y * W + x] = best;
      }
    }
  }
  return out;
}

/* ── logs ── */
const BARK = { O: 0x21150c, D: 0x44291a, M: 0x633d24, L: 0x85552f, H: 0xa4703d };
const CHAR = { D: 0x160f0b, M: 0x271b13, L: 0x3a2a1d };
const ASH = [0x8c8680, 0xaba59c, 0x6f6a64];
const GRAIN = { O: 0x3a2414, E: 0xdcb57c, R: 0xb2864e, C: 0xc49a60 };
const CRACK = [0xffc24a, 0xff7a22, 0xd8431a];

/* A 45° log in the 3/4 view: axis a->b in art px, radius r.  `front` is the
   end that faces the camera and shows its end grain. */
const LOGS = [
  /* the lower log, back-right to front-left */
  { a: { x: 21.4, y: 3.4 }, b: { x: 3.0, y: 11.4 }, r: 2.4, seed: 11 },
  /* the upper log, back-left to front-right, resting across it */
  { a: { x: 2.7, y: 3.0 }, b: { x: 21.5, y: 11.2 }, r: 2.5, seed: 29 },
];

function logPixel(L, px, py) {
  const ux = L.b.x - L.a.x, uy = L.b.y - L.a.y;
  const len = Math.hypot(ux, uy);
  const dx = ux / len, dy = uy / len;
  /* normal pointing UP the screen */
  let nx = -dy, ny = dx;
  if (ny > 0) { nx = -nx; ny = -ny; }
  const rx = px - L.a.x, ry = py - L.a.y;
  const t = rx * dx + ry * dy;
  const d = rx * nx + ry * ny;
  return { t, d, len };
}

/* one log cell: fills body/cap into rgba arrays by painter order.  Returns per
   pixel {col, kind, t} so the char pass can decide per pixel. */
function paintLogs(w, h) {
  const cell = new Array(w * h).fill(null);
  for (let li = 0; li < LOGS.length; li++) {
    const L = LOGS[li];
    const r = L.r;
    const nz = wrapNoise(16, 4, L.seed);
    const rr = rng(L.seed * 7 + 3);
    const fissure = [];
    for (let i = 0; i < 3; i++) fissure.push({ t: 3 + rr() * 13, d: (rr() - 0.5) * 1.2, l: 2 + rr() * 2.5 });
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const X = px + 0.5, Y = py + 0.5;
        const { t, d, len } = logPixel(L, X, Y);
        let inBody = t >= 0 && t <= len && Math.abs(d) <= r;
        /* rounded back end */
        if (!inBody && t < 0 && t > -r) inBody = Math.hypot(t * 1.6, d) <= r;
        /* the front end: an end-grain ellipse, seen at an angle */
        let capQ = -1;
        {
          const ct = t - len;
          const q = Math.hypot(ct / (r * 0.62), d / r);
          if (q <= 1.02 && ct > -r * 0.9) capQ = q;
        }
        if (!inBody && capQ < 0) continue;
        if (capQ >= 0 && t >= len - r * 0.62 * Math.sqrt(Math.max(0, 1 - (d / r) * (d / r)))) {
          const col = capQ > 0.8 ? GRAIN.O : capQ > 0.56 ? GRAIN.E : capQ > 0.34 ? GRAIN.R : GRAIN.C;
          cell[py * w + px] = { col, kind: 'grain', t: t / len, d: d / r, li };
          continue;
        }
        if (!inBody) continue;
        /* cylinder lit from above: the top of the log (d > 0) catches the light */
        const s = d / r;
        let b = 0.5 + 0.5 * s;
        b += (nz(t / 2.2, (d + 3) / 1.6) - 0.5) * 0.22;
        let col;
        if (Math.abs(s) > 0.8) col = s < 0 ? BARK.O : BARK.D;
        else if (b < 0.3) col = BARK.D;
        else if (b < 0.56) col = BARK.M;
        else if (b < 0.8) col = BARK.L;
        else col = BARK.H;
        for (const f of fissure) {
          if (t > f.t && t < f.t + f.l && Math.abs(d / r - f.d * 0.5) < 0.16 && col !== BARK.O) col = BARK.D;
        }
        cell[py * w + px] = { col, kind: 'bark', t: t / len, d: s, b, li };
      }
    }
  }
  return cell;
}

function hexToRgb(c) { return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; }

function put(img, W, x, y, col, a = 255) {
  if (col < 0) return;
  const i = (y * W + x) * 4;
  const [r, g, b] = hexToRgb(col);
  img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = a;
}

/* ── the atlas ── */
export function mintCampfireAtlas(doc) {
  const D = doc || (typeof document !== 'undefined' ? document : null);
  const flameW = FLAME_W * FLAME_FRAMES, flameH = FLAME_H * FLAME_SIZES.length;
  const logRowW = LOG_W * LOG_STAGES;
  const W = Math.max(flameW, logRowW) + 2;
  /* rows: flames | logs back | logs front | cracks back | cracks front | puffs + glow + halo + sq */
  const yLogs = flameH + 1;
  const yPuff = yLogs + LOG_H * 4 + 1;
  const puffCell = Math.ceil(PUFF_R[PUFF_R.length - 1] * 2) + 2;
  const H = yPuff + Math.max(puffCell, GLOW_H, HALO_R * 2 + 1) + 2;
  const cv = D.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const img = g.createImageData(W, H);
  const rects = { flame: [], logBack: [], logFront: [], crackBack: [], crackFront: [], puff: [] };

  /* flames */
  const noise = wrapNoise(NOISE_GW, NOISE_GH, 1337);
  for (let si = 0; si < FLAME_SIZES.length; si++) {
    const row = [];
    for (let f = 0; f < FLAME_FRAMES; f++) {
      const t = f / FLAME_FRAMES;
      const ox = f * FLAME_W, oy = si * FLAME_H;
      const band = flameBands(t, FLAME_SIZES[si], noise);
      for (let y = 0; y < FLAME_H; y++) {
        for (let x = 0; x < FLAME_W; x++) {
          const b = band[y * FLAME_W + x];
          if (b >= 0) put(img, W, ox + x, oy + y, FLAME_RAMP[b][1]);
        }
      }
      row.push({ x: ox, y: oy, w: FLAME_W, h: FLAME_H });
    }
    rects.flame.push(row);
  }

  /* logs: base paint, then per stage the char pass */
  const base = paintLogs(LOG_W, LOG_H);
  const thr = new Float32Array(LOG_W * LOG_H);
  const cr = new Float32Array(LOG_W * LOG_H);
  const rr = rng(4242);
  const nz = wrapNoise(10, 6, 77);
  for (let y = 0; y < LOG_H; y++) {
    for (let x = 0; x < LOG_W; x++) {
      const c = base[y * LOG_W + x];
      if (!c) continue;
      /* distance along the log from the crossing (0 at the flame, 1 at an end) */
      const fromCross = Math.min(1, Math.abs(c.t - 0.5) * 2);
      const top = c.kind === 'bark' ? (c.d + 1) / 2 : 0.3;
      thr[y * LOG_W + x] = Math.min(1, Math.max(0,
        0.08 + fromCross * 0.62 - top * 0.14 + (nz(x / 2.2, y / 2.2) - 0.5) * 0.36 + (rr() - 0.5) * 0.12));
      cr[y * LOG_W + x] = rr();
    }
  }
  /* crack seams: noise stretched along each log's own axis */
  const seam = new Float32Array(LOG_W * LOG_H);
  {
    const sn = wrapNoise(12, 6, 909);
    for (let y = 0; y < LOG_H; y++) {
      for (let x = 0; x < LOG_W; x++) {
        const p = base[y * LOG_W + x];
        if (!p || p.kind !== 'bark') continue;
        const L = LOGS[p.li];
        const q = logPixel(L, x + 0.5, y + 0.5);
        seam[y * LOG_W + x] = sn(q.t / 2.6 + p.li * 5, (q.d / L.r) * 2.2 + 3);
      }
    }
  }
  const crossT = {};
  for (let li = 0; li < LOGS.length; li++) {
    /* the axis parameter where each log passes the crossing */
    const L = LOGS[li];
    const { t, len } = logPixel(L, LOG_CROSS.x, LOG_CROSS.y);
    crossT[li] = t / len;
  }
  for (let st = 0; st < LOG_STAGES; st++) {
    const c = st / (LOG_STAGES - 1);
    const ox = st * LOG_W;
    for (let part = 0; part < 2; part++) {
      const oy = yLogs + part * LOG_H;
      const oyC = yLogs + (2 + part) * LOG_H;
      for (let y = 0; y < LOG_H; y++) {
        for (let x = 0; x < LOG_W; x++) {
          const p = base[y * LOG_W + x];
          if (!p) continue;
          /* which half: front = nearer the camera than the crossing */
          const isFront = p.t > crossT[p.li] + 0.04;
          if ((part === 1) !== isFront) continue;
          let col = p.col;
          const th = thr[y * LOG_W + x];
          const charred = th < c * 1.02;
          if (charred) {
            if (p.kind === 'grain') col = p.col === GRAIN.O ? CHAR.D : CHAR.M;
            else col = (p.b || 0.5) > 0.66 ? CHAR.L : (p.b || 0.5) > 0.36 ? CHAR.M : CHAR.D;
            /* the last of it goes to ash on the upper side */
            if (c > 0.7 && p.kind === 'bark' && p.d > 0.2 && cr[y * LOG_W + x] < (c - 0.7) * 1.6) {
              col = ASH[(x + y) % 3];
            }
            /* glowing cracks, on their own additive layer: short seams
               along the grain (seam[] is streaked along each log's axis),
               only where the char has gone deep, and never through ash */
            const deep = c - th;
            const sm = seam[y * LOG_W + x];
            if (deep > 0.18 && sm > 0.7 - deep * 0.15 && p.kind === 'bark' && Math.abs(p.d) < 0.7
                && col !== ASH[0] && col !== ASH[1] && col !== ASH[2]) {
              const k = sm > 0.86 ? 0 : sm > 0.76 ? 1 : 2;
              put(img, W, ox + x, oyC + y, CRACK[k]);
            }
          }
          put(img, W, ox + x, oy + y, col);
        }
      }
    }
    rects.logBack.push({ x: ox, y: yLogs, w: LOG_W, h: LOG_H });
    rects.logFront.push({ x: ox, y: yLogs + LOG_H, w: LOG_W, h: LOG_H });
    rects.crackBack.push({ x: ox, y: yLogs + 2 * LOG_H, w: LOG_W, h: LOG_H });
    rects.crackFront.push({ x: ox, y: yLogs + 3 * LOG_H, w: LOG_W, h: LOG_H });
  }

  /* smoke puffs: white-grey, lit from the upper left, checker-dithered rim */
  let px0 = 0;
  for (let i = 0; i < PUFF_R.length; i++) {
    const R = PUFF_R[i];
    const n = Math.ceil(R * 2) + 1;
    const cxp = n / 2, cyp = n / 2;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const dx = x + 0.5 - cxp, dy = y + 0.5 - cyp;
        const q = Math.hypot(dx, dy) / R;
        if (q > 1) continue;
        if (R > 2.4 && q > 0.8 && ((x + y) & 1)) continue;
        const lit = (-dx - dy) / (R * 1.41);
        const col = lit > 0.35 ? 0xffffff : lit > -0.25 ? 0xdadde0 : 0xb4b9be;
        put(img, W, px0 + x, yPuff + y, col);
      }
    }
    rects.puff.push({ x: px0, y: yPuff, w: n, h: n });
    px0 += n + 1;
  }
  /* ground glow: an ellipse in three stepped bands (alpha carries the band) */
  const gx0 = px0 + 1;
  for (let y = 0; y < GLOW_H; y++) {
    for (let x = 0; x < GLOW_W; x++) {
      const dx = (x + 0.5 - GLOW_W / 2) / (GLOW_W / 2), dy = (y + 0.5 - GLOW_H / 2) / (GLOW_H / 2);
      const q = Math.hypot(dx, dy);
      if (q > 1) continue;
      let a = q < 0.42 ? 255 : q < 0.7 ? 150 : 70;
      if (q > 0.86 && ((x + y) & 1)) continue;
      put(img, W, gx0 + x, yPuff + y, 0xffffff, a);
    }
  }
  rects.glow = { x: gx0, y: yPuff, w: GLOW_W, h: GLOW_H };
  /* the halo in the air behind the flame */
  const hx0 = gx0 + GLOW_W + 1, hn = HALO_R * 2 + 1;
  for (let y = 0; y < hn; y++) {
    for (let x = 0; x < hn; x++) {
      const q = Math.hypot(x + 0.5 - hn / 2, y + 0.5 - hn / 2) / HALO_R;
      if (q > 1) continue;
      let a = q < 0.45 ? 255 : q < 0.75 ? 140 : 60;
      if (q > 0.85 && ((x + y) & 1)) continue;
      put(img, W, hx0 + x, yPuff + y, 0xffffff, a);
    }
  }
  rects.halo = { x: hx0, y: yPuff, w: hn, h: hn };
  /* one white pixel for sparks */
  const sqx = hx0 + hn + 1;
  put(img, W, sqx, yPuff, 0xffffff);
  rects.sq = { x: sqx, y: yPuff, w: 1, h: 1 };
  if (sqx + 1 > W) throw new Error('campfire atlas too narrow');

  g.putImageData(img, 0, 0);
  return { canvas: cv, rects };
}

/* ember colour by life fraction (0 = just thrown, 1 = gone) */
export const EMBER_RAMP = [
  [0.12, 0xfffbe0],
  [0.30, 0xffe070],
  [0.52, 0xffae30],
  [0.75, 0xff6a1a],
  [1.01, 0xb83214],
];
export function emberColor(k) {
  for (const [max, col] of EMBER_RAMP) if (k < max) return col;
  return EMBER_RAMP[EMBER_RAMP.length - 1][1];
}
