/* ═══ v2.3.2847: THE BOW SPECIAL, WHITE-HOT ═══
 *
 * Owner: "I want to see what the arrow special would look like with you
 * drawing the special instead of using my special arrow sprite.  I'd like
 * something glowing and a bit animated over the normal arrow like a white
 * bit glowing hot arrow."
 *
 * What it was: a painted sheet (arrow-special-v1.webp, v2.3.1396) -- a red-
 * fletched arrow in a yellow flame wrap, four near-identical frames, plus the
 * v2.3.2511 additive white pulse.  Painted, so it never matched the pine
 * arrow the bow actually fires, and it was a different arrow from the one you
 * nocked.
 *
 * What it is now: THE PINE ARROW, HEATED.  The same art every plain shot uses,
 * drawn at the special's size, with the heat drawn in code on top of it:
 *   AURA     a stepped, pixel-edged glow round the silhouette -- warm white at
 *            the arrow, yellow, then an orange-red rim -- whose ragged edge
 *            licks and flickers on the 12 fps step.  Wider at the head: the
 *            tip is the hottest part.  Drawn once plain (its colour shows on a
 *            bright ground) and once additive (it is light on a dark one).
 *   HEAT     the arrow's own pixels recoloured by heat and drawn OPAQUE: the
 *            steel head white-hot, the shaft pale with an orange rim, the
 *            fletching yellow and orange in its own feather pattern, and the
 *            black keyline kept, so the outline still reads (the owner has
 *            asked for that outline three times: v2.3.1876, 1877, 2511).  A
 *            bright band crawls down the shaft to the tip twice a second, and
 *            an additive white breath rides v2.3.2511's 260 ms pulse.
 *            OPAQUE, NOT ADDED LIGHT, because the first cut was added light
 *            only and on the town's yellow cobbles it all but vanished: light
 *            cannot show against a bright ground; a white-hot body with a
 *            black outline can.
 *   FLARE    a pixel twinkle on the tip.
 *   SPARKS   square pixels shed along the flight path, cooling white ->
 *            yellow -> orange -> red as they fall behind: the tracer.
 *   SMOULDER once it is in something (a monster, the ground, a prop) the head
 *            is buried, as before (v2.3.2381), and the shaft cools from white
 *            to a red ember with charred edges and burnt fletching (EMBER
 *            frames: the heated art a step, two and three palette steps
 *            cooler; a tint flattened it to one orange) -- then THROBS on each
 *            of the 500 ms chip ticks the stuck arrow deals (projectiles.js,
 *            v2.3.1402/1425), with
 *            a few rising sparks, and builds back to white-hot in its last
 *            half second before the send-off blast (v2.3.2400's _arrowSendOff).
 *            The heat says what the arrow is doing: it is still burning him.
 *            v2.3.2848: the special is a volley of three now, with no blast
 *            (bowVolley.js), so its arrows BURN OUT instead: after the last
 *            tick the embers darken and fade.  Only the lone arrow an old
 *            worker still gets flares white before its blast (`blast`).
 *
 * THE HIT SHAPE DOES NOT MOVE.  The painted special was drawn 62.8 world px
 * long (a 314 px frame at scale 0.20) and projectiles.js's PROJ_BODY
 * .arrowSpecial capsule is measured off that: back 28.9, front 33.9, half
 * 12.8.  HOT_LEN is the same 62.8, so the pine arrow's pivot (0.457) puts its
 * back at 28.7 and its front at 34.1 -- within 0.2 px -- and the aura is sized
 * to reach the capsule's 12.8 px half-width.  The picture was re-made to fit
 * the hit test, not the other way round (the table's own rule: "IF THE ART IS
 * RECUT OR RESCALED, THESE MOVE WITH IT" -- it was rescaled to stay put).
 *
 * NOTHING HERE IS A FILTER.  Every glow is an additive sprite: a filter over
 * the WebGL canvas is the documented iOS grain hazard (v2.3.948, v2.3.1236).
 *
 * NOTHING NEW TO DOWNLOAD, AND NOTHING LOADED LATE.  The heat and aura frames
 * are derived from the pine arrow's own pixels, inside the same _fxLoad()
 * .then() that frames its noHead crop (effectsRenderer), which the preload
 * gate awaits -- so they exist before the loading screen lifts, the
 * animation-preloading law's contract, with no fetch of their own.  The
 * painted special sheet is no longer requested at all (HOT_SPECIAL_ARROW in
 * effectsRenderer, a one-line revert).
 *
 * LEAF MODULE, like staffCastFx: effectsRenderer imports it, it imports
 * nothing of the renderer's.
 */
import { Container, Sprite, Texture, Rectangle } from 'pixi.js';

/* World px.  = the painted special's drawn length; see the header. */
export const HOT_LEN = 62.8;
/* One art pixel of the character sheets in world px (staffCastFx's PIX): the
   sparks and the tip flare are drawn in the characters' own pixels. */
const PIX = 3 * 0.421875;
const STEP_MS = 1000 / 12;          /* the 12 fps flicker step */
const PULSE_MS = 260;               /* v2.3.2511's breathing, kept */
const HOT_N = 6;                    /* heat frames: the crawl band's six stops */
const AURA_N = 4;                   /* aura flicker frames */
const PAD = 20;                     /* aura padding, texels, each side */
const BLK = 2;                      /* aura block, texels -- ~1 world px at HOT_LEN */
const MAX_SPARKS = 240;
const EMBER_N = 4;                  /* smoulder frames: the still heat and three cooler steps */
const LIFE_MS = 4000;               /* a stuck or planted special's life (projectiles.js) */
const TICK_MS = 500;                /* its chip / ground ticks */

/* The heated arrow's palette, coolest first: char, dark red, red-orange,
   orange, yellow, pale, white.  The keyline is its own near-black. */
const HEAT_COL = [0x2a0c06, 0x9a2a12, 0xe0501c, 0xff9a30, 0xffd860, 0xfff6d8, 0xffffff];
/* A hot object's outline is a dark ember red, not black. */
const KEY_COL = 0x2a0a04;
/* A spark's life in five steps, hottest first (staffCastFx's HEAT_AT idea).
   Brief at white: most of a spark's life is spent orange and red, the part
   that still reads on snow and on the town's yellow cobbles. */
const SPARK_RAMP = [0xffffff, 0xffe070, 0xff9a30, 0xe0501c, 0x9a2a12];
const SPARK_AT = [0.1, 0.25, 0.55, 0.82];
/* The smoulder's tint, by heat.  Stepped, not blended: a colour that slides
   smoothly reads as a filter; one that steps reads as a palette. */
const COOL_STOPS = [
  [0.00, 0x7a1e0e], [0.30, 0xc8461e], [0.42, 0xff7a24],
  [0.58, 0xffb040], [0.76, 0xffe7a0], [0.92, 0xffffff],
];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function coolTint(h) {
  let c = COOL_STOPS[0][1];
  for (let i = 0; i < COOL_STOPS.length; i++) if (h >= COOL_STOPS[i][0]) c = COOL_STOPS[i][1];
  return c;
}

/** How hot a landed special is, 0..1.  `since` is when it was first drawn
 *  headless (it arrived); `tickBase` is its stuckAt / plantedAt, which is what
 *  the chip ticks and the send-off count from.  `blast`: it ends in the
 *  send-off (v2.3.2848: only the lone arrow an old worker gets) -- it builds
 *  back to white for it; otherwise it burns out. */
export function smoulderHeat(now, since, tickBase, blast) {
  const a = now - (since || now);
  let h = a < 140 ? 1 : a < 900 ? 1 - 0.55 * easeOut((a - 140) / 760) : 0.45;
  if (tickBase) {
    const t = now - tickBase;
    if (t >= TICK_MS) {
      const ph = (t - TICK_MS) % TICK_MS;
      h = Math.max(h, 0.45 + 0.35 * Math.max(0, 1 - ph / 240));
    }
    if (blast) {
      if (t > LIFE_MS - 600) h = Math.max(h, 0.45 + 0.55 * smoothstep(LIFE_MS - 600, LIFE_MS - 50, t));
    } else {
      h *= 1 - 0.8 * burnOut(t);   /* v2.3.2848: the embers darken after the last tick */
    }
  }
  return clamp(h, 0, 1);
}
/* v2.3.2848: 0 -> 1 across the stretch after the burn's last tick (at
   LIFE_MS - TICK_MS; its flare has faded by then) to the end of the arrow's
   life -- how far a volley arrow has burnt out. */
function burnOut(t) {
  return smoothstep(LIFE_MS - 450, LIFE_MS - 30, t);
}
/** v2.3.2848: how much of a burnt-out arrow is left to see, 1 -> 0 at the
 *  end of its life (1 while it still ends in a blast, which is its exit). */
export function smoulderFade(now, tickBase, blast) {
  if (blast || !tickBase) return 1;
  return 1 - burnOut(now - tickBase);
}
/** The smoulder's tint (over the heated art) and its ember's alpha, for a
 *  heat -- shared with the prop marks, which draw their shaft inside a
 *  prop's overlay. */
export function smoulderLook(h) {
  return { tint: coolTint(h), alpha: 0.3 + 0.62 * h, ember: emberStep(h) };
}
/** Which ember frame a heat shows: 0 the full heat, 3 the coolest. */
export function emberStep(h) {
  return h >= 0.85 ? 0 : h >= 0.66 ? 1 : h >= 0.52 ? 2 : 3;
}

/* ── the art, derived from the pine arrow ─────────────────────────────── */
const ART = {
  ready: false,
  w: 128, h: 32,              /* the pine texture's size, texels */
  ax: 0.457, headFrac: 0.742, /* its pivot and head crop (ARROW_PINE) */
  full: null, noHead: null,   /* ARROW_PINE's own two textures */
  heat: [], heatStill: null, heatNoHead: null, flash: null, flashNoHead: null, ember: [],
  aura: [], auraAx: 0.5, auraReach: 0,
  glow: null, px: null,
  nearest: false,
};
export function hotArrowReady() { return ART.ready; }
export function hotArrowArt() { return ART; }

/** Build every heat texture from the pine arrow.  Called from the pine
 *  arrow's own load (effectsRenderer), so it rides the preload gate.
 *  Returns false (and leaves ART not ready) if the pixels cannot be read. */
export function buildHotArrowArt(full, noHead, headFrac, anchorX) {
  try {
    if (typeof document === 'undefined' || !full || !full.source) return false;
    const res = full.source.resource;
    const fr = full.frame;
    if (!res || !fr) return false;
    const W = Math.round(fr.width), H = Math.round(fr.height);
    const rc = document.createElement('canvas');
    rc.width = W; rc.height = H;
    const rg = rc.getContext('2d', { willReadFrequently: true });
    rg.drawImage(res, fr.x, fr.y, fr.width, fr.height, 0, 0, W, H);
    const px = rg.getImageData(0, 0, W, H).data;
    const solid = new Uint8Array(W * H), key = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const a = px[i * 4 + 3];
      if (a < 100) continue;
      solid[i] = 1;
      const l = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
      if (l < 60) key[i] = 1;   /* the black keyline */
    }
    /* The pine art's keyline was grown INWARD a pixel (v2.3.2511) so the plain
       arrow's outline survives the downscale; on the shaft that leaves one
       interior texel between two outline ones -- a black stick.  White-hot,
       only the outline texels that touch the outside stay dark; the inner ring
       is part of the glowing body. */
    const edge = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!key[i]) continue;
        const out = (xx, yy) => xx < 0 || yy < 0 || xx >= W || yy >= H || !solid[yy * W + xx];
        if (out(x - 1, y) || out(x + 1, y) || out(x, y - 1) || out(x, y + 1)) edge[i] = 1;
      }
    }
    for (let i = 0; i < W * H; i++) if (key[i] && !edge[i]) key[i] = 0;
    const headX = Math.round(W * headFrac);
    /* where the fletching ends: the first column right of 20% whose opaque
       run is no taller than a quarter of the art -- the bare shaft */
    let fletchX = Math.round(W * 0.31);
    for (let x = Math.round(W * 0.2); x < headX; x++) {
      let n = 0;
      for (let y = 0; y < H; y++) n += solid[y * W + x];
      if (n > 0 && n <= H / 4) { fletchX = x; break; }
    }

    /* ── atlas: aura frames, then heat frames, then the glow and a pixel ── */
    const AW = W + PAD * 2, AH = H + PAD * 2;
    const atlasW = Math.max(AURA_N * (AW + 2), (HOT_N + 1) * (W + 2), EMBER_N * (W + 2)) + 2;
    const atlasH = AH + 2 + (H + 2) * 2 + 28;
    const ac = document.createElement('canvas');
    ac.width = atlasW; ac.height = atlasH;
    const ag = ac.getContext('2d');
    const img = ag.createImageData(atlasW, atlasH);
    const D = img.data;
    const put = (x, y, rgb, a) => {
      if (x < 0 || y < 0 || x >= atlasW || y >= atlasH) return;
      const o = (y * atlasW + x) * 4;
      D[o] = (rgb >> 16) & 255; D[o + 1] = (rgb >> 8) & 255; D[o + 2] = rgb & 255; D[o + 3] = Math.round(a * 255);
    };

    /* DEPTH: texels from the nearest texel that is not interior (clear, or
       keyline) -- so a colour can run hottest in the middle of a part and
       cooler at its rim, the way a heated bar glows. */
    const depth = new Uint8Array(W * H);
    {
      const q = [];
      for (let i = 0; i < W * H; i++) {
        if (solid[i] && !key[i]) depth[i] = 255;
        else q.push(i);
      }
      for (let qi = 0; qi < q.length; qi++) {
        const i = q[qi], x = i % W, y = (i - x) / W, d = depth[i];
        const nb = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1];
        for (const j of nb) if (j >= 0 && depth[j] > d + 1) { depth[j] = d + 1; q.push(j); }
      }
    }
    /* the fletching's own light/dark pattern, kept: brighter feathers burn a
       step hotter than darker ones */
    let fl = 0, fn = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < fletchX; x++) {
        const i = y * W + x;
        if (solid[i] && !key[i]) { fl += 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]; fn++; }
      }
    }
    const flMean = fn ? fl / fn : 128;

    /* HEATED frames (HOT_N with the crawl band, then one still frame): the
       pine arrow's own pixels, recoloured by heat and drawn OPAQUE inside its
       own keyline.  Opaque on purpose: the first cut was added light only,
       and on the town's yellow cobbles it all but vanished -- added light
       cannot show against a bright ground, a white-hot body with a black
       outline can.  Head white with a pale rim; shaft pale with an orange
       rim, hotter toward the head; fletching yellow and orange by its own
       pattern, with a red-orange rim.  A bright band crawls tail to tip. */
    const baseLv = (i, x) => {
      const rim = depth[i] <= 1;
      if (x >= headX) return rim ? 5 : 6;
      if (x >= fletchX) return rim ? 3 : (x > W * 0.6 ? 5 : 4);
      const l = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
      return rim ? 2 : (l >= flMean ? 4 : 3);
    };
    const hy = AH + 2;
    for (let f = 0; f <= HOT_N; f++) {
      const ox = f * (W + 2);
      const band = f < HOT_N ? Math.round(W * 0.08 + f * ((headX - W * 0.08) / HOT_N)) : -999;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          if (!solid[i]) continue;
          if (key[i]) { put(ox + x, hy + y, KEY_COL, 1); continue; }
          let lv = baseLv(i, x);
          const db = Math.abs(x - band);
          if (db <= 2) lv += 2; else if (db <= 6) lv += 1;
          if (f < HOT_N && hash(i * 13 + f * 977) > 0.965) lv += 1;
          put(ox + x, hy + y, HEAT_COL[clamp(lv, 0, 6)], 1);
        }
      }
    }
    /* FLASH: the interior in white -- the additive breath over the heated
       arrow (v2.3.2511's pulse, now on the pine arrow) */
    const fy = hy + H + 2;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (solid[i] && !key[i]) put(x, fy + y, 0xffffff, 1);
      }
    }
    /* EMBER frames: the still heated arrow a step, two and three palette steps
       cooler -- what a buried shaft cools through between its ticks.  Picked
       by heat, never blended (the palette rule): at the smoulder's floor the
       shaft is a red-orange core in charred edges and the fletching has burnt
       dark; a tick flares it back up the ladder. */
    for (let e = 1; e <= EMBER_N - 1; e++) {
      const ox = e * (W + 2);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          if (!solid[i]) continue;
          if (key[i]) { put(ox + x, fy + y, KEY_COL, 1); continue; }
          put(ox + x, fy + y, HEAT_COL[clamp(baseLv(i, x) - e, 0, 6)], 1);
        }
      }
    }

    /* AURA frames.  Distance from the silhouette on a BLK-texel grid (two-
       pass chamfer), then three stepped bands inside a radius that grows
       toward the tip and is shaped per frame by coarse value noise -- licks
       that flicker, not per-pixel speckle. */
    const GW = Math.ceil(AW / BLK), GH = Math.ceil(AH / BLK);
    const dist = new Float32Array(GW * GH).fill(1e9);
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        let on = false;
        for (let yy = 0; yy < BLK && !on; yy++) {
          for (let xx = 0; xx < BLK && !on; xx++) {
            const sx = gx * BLK + xx - PAD, sy = gy * BLK + yy - PAD;
            if (sx >= 0 && sy >= 0 && sx < W && sy < H && solid[sy * W + sx]) on = true;
          }
        }
        if (on) dist[gy * GW + gx] = 0;
      }
    }
    const R2 = Math.SQRT2;
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        const i = gy * GW + gx;
        let d = dist[i];
        if (gx > 0) d = Math.min(d, dist[i - 1] + 1);
        if (gy > 0) {
          d = Math.min(d, dist[i - GW] + 1);
          if (gx > 0) d = Math.min(d, dist[i - GW - 1] + R2);
          if (gx < GW - 1) d = Math.min(d, dist[i - GW + 1] + R2);
        }
        dist[i] = d;
      }
    }
    for (let gy = GH - 1; gy >= 0; gy--) {
      for (let gx = GW - 1; gx >= 0; gx--) {
        const i = gy * GW + gx;
        let d = dist[i];
        if (gx < GW - 1) d = Math.min(d, dist[i + 1] + 1);
        if (gy < GH - 1) {
          d = Math.min(d, dist[i + GW] + 1);
          if (gx < GW - 1) d = Math.min(d, dist[i + GW + 1] + R2);
          if (gx > 0) d = Math.min(d, dist[i + GW - 1] + R2);
        }
        dist[i] = d;
      }
    }
    const LAT = 3;   /* noise lattice, blocks */
    const vnoise = (gx, gy, seed) => {
      const fx = gx / LAT, fy = gy / LAT;
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = fx - x0, ty = fy - y0;
      const n = (x, y) => hash(x * 57 + y * 131 + seed * 7919);
      const a = n(x0, y0) + (n(x0 + 1, y0) - n(x0, y0)) * tx;
      const b = n(x0, y0 + 1) + (n(x0 + 1, y0 + 1) - n(x0, y0 + 1)) * tx;
      return a + (b - a) * ty;
    };
    const auraBands = [[0.42, 0xfff4d0, 0.95], [0.72, 0xffb43c, 0.7], [1.0, 0xff5a1a, 0.42]];
    /* Capped to the hit capsule (PROJ_BODY.arrowSpecial): no wider than its
       12.8 px half, no further forward than the tip.  A glow that reached
       past either would draw the arrow touching a monster it has not hit. */
    const capY = Math.floor(12.6 / (HOT_LEN / W));   /* texels from the centre line */
    const capX1 = W + 2;                            /* texels: just past the tip */
    let auraReach = 0;   /* texels from the centre line to the aura's farthest lit block, any frame */
    for (let f = 0; f < AURA_N; f++) {
      const ox = f * (AW + 2);
      for (let gy = 0; gy < GH; gy++) {
        for (let gx = 0; gx < GW; gx++) {
          const d = dist[gy * GW + gx];
          if (d <= 0) continue;
          const tx0 = gx * BLK - PAD, ty0 = gy * BLK + BLK / 2 - AH / 2;
          if (tx0 + BLK > capX1 || Math.abs(ty0) + BLK / 2 > capY) continue;
          const u = clamp(tx0 / W, 0, 1);
          const R = (3 + 3.6 * u) * (0.72 + 0.56 * vnoise(gx, gy, f + 1));
          const t = d / R;
          let band = null;
          for (const bd of auraBands) { if (t <= bd[0]) { band = bd; break; } }
          if (!band) continue;
          auraReach = Math.max(auraReach, Math.abs(gy * BLK + BLK / 2 - AH / 2) + BLK / 2);
          for (let yy = 0; yy < BLK; yy++) {
            for (let xx = 0; xx < BLK; xx++) put(ox + gx * BLK + xx, gy * BLK + yy, band[1], band[2]);
          }
        }
      }
    }

    /* GLOW: a small stepped disc (the ember at a buried tip), and PX: one
       white pixel block for the sparks and the flare. */
    const gyy = fy + H + 2, GR = 12;
    for (let y = -GR; y < GR; y++) {
      for (let x = -GR; x < GR; x++) {
        const bx = Math.floor(x / BLK) * BLK + BLK / 2, by = Math.floor(y / BLK) * BLK + BLK / 2;
        const r = Math.sqrt(bx * bx + by * by);
        const c = r <= 4 ? [0xffffff, 1] : r <= 8 ? [0xffd26a, 0.55] : r <= GR ? [0xff7a24, 0.22] : null;
        if (c) put(2 + GR + x, gyy + GR + y, c[0], c[1]);
      }
    }
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) put(2 * GR + 6 + x, gyy + y, 0xffffff, 1);

    ag.putImageData(img, 0, 0);
    const base = Texture.from(ac);
    /* NEAREST: a texel is an art pixel and must stay one at any zoom (the
       hitMaterialFx rule) -- a linear-filtered aura is the soft glow the owner
       keeps asking to have removed. */
    base.source.scaleMode = 'nearest';
    const sub = (x, y, w, h) => new Texture({ source: base.source, frame: new Rectangle(x, y, w, h) });
    ART.aura = [];
    for (let f = 0; f < AURA_N; f++) ART.aura.push(sub(f * (AW + 2), 0, AW, AH));
    ART.heat = [];
    for (let f = 0; f < HOT_N; f++) ART.heat.push(sub(f * (W + 2), hy, W, H));
    ART.heatStill = sub(HOT_N * (W + 2), hy, W, H);
    ART.heatNoHead = sub(HOT_N * (W + 2), hy, Math.max(1, headX), H);
    ART.flash = sub(0, fy, W, H);
    ART.flashNoHead = sub(0, fy, Math.max(1, headX), H);
    ART.ember = [ART.heatNoHead];
    for (let e = 1; e < EMBER_N; e++) ART.ember.push(sub(e * (W + 2), fy, Math.max(1, headX), H));
    ART.glow = sub(2, gyy, GR * 2, GR * 2);
    ART.px = sub(2 * GR + 6, gyy, 4, 4);
    ART.w = W; ART.h = H;
    ART.ax = anchorX; ART.headFrac = headFrac;
    ART.auraAx = (PAD + anchorX * W) / AW;
    ART.auraReach = auraReach;
    ART.full = full; ART.noHead = noHead;
    ART.nearest = base.source.scaleMode === 'nearest'
      || !!(base.source.style && base.source.style.scaleMode === 'nearest');
    ART.ready = true;
    return true;
  } catch (e) {
    console.warn('[hot-arrow] could not build the heat art', e && e.message);
    return false;
  }
}

/* Index pools refilled from zero every frame (staffCastFx's SpritePool). */
class Pool {
  constructor(parent, blend, cap) { this.parent = parent; this.blend = blend; this.cap = cap; this.list = []; this.n = 0; }
  take(tex) {
    if (this.n >= this.cap || !tex) return null;
    let sp = this.list[this.n];
    if (!sp || sp.destroyed) {
      sp = new Sprite(tex);
      if (this.blend) sp.blendMode = this.blend;
      this.parent.addChild(sp);
      this.list[this.n] = sp;
    }
    this.n++;
    if (sp.texture !== tex) sp.texture = tex;
    if (!sp.visible) sp.visible = true;
    return sp;
  }
  begin() { this.n = 0; }
  end() {
    for (let i = this.n; i < this.list.length; i++) {
      const sp = this.list[i];
      if (sp && !sp.destroyed && sp.visible) sp.visible = false;
    }
  }
}

const TWINKLE = [[3, 2], [2, 3], [1, 1], [2, 1], [3, 3], [1, 2]];
const MAX_REPORT = 12;

export class HotArrowFx {
  /** layer: the projectile layer.  Everything here is one Container kept as
   *  its top child, so the glow sits round the arrow it belongs to (the arrow
   *  sprite is ours too) and over the plain arrows beside it.
   *  The aura draws TWICE from one texture: once with normal blending, so its
   *  colour shows on a bright ground (snow, sand, the town's cobbles), and
   *  once additively, so it is light on a dark one. */
  constructor(layer) {
    this.layer = layer;
    this.root = new Container();
    this.root.label = 'hotArrow';
    layer.addChild(this.root);
    const cAuraN = new Container(), cAuraA = new Container(), cBase = new Container(), cHot = new Container(), cPx = new Container();
    this.root.addChild(cAuraN, cAuraA, cBase, cHot, cPx);
    this.auraN = new Pool(cAuraN, null, 24);
    this.aura = new Pool(cAuraA, 'add', 24);
    this.base = new Pool(cBase, null, 24);
    this.hot = new Pool(cHot, 'add', 48);
    this.px = new Pool(cPx, null, 420);
    this.sparks = new Array(MAX_SPARKS);
    for (let i = 0; i < MAX_SPARKS; i++) {
      this.sparks[i] = { on: false, x: 0, y: 0, vx: 0, vy: 0, grav: 0, drag: 1, age: 0, life: 1, size: 1, pk: 1 };
    }
    this._si = 0;
    this._lastNow = 0;
    this._rep = [];
    for (let i = 0; i < MAX_REPORT; i++) this._rep.push({});
    this._repN = 0;
    this._stats = { strikes: 0, throbs: 0, shed: 0 };
    if (typeof window !== 'undefined') {
      /* Dev probe, house style (__btStaffFx, __btHitFx): a screenshot cannot
         say whether the glow is additive, what heat a stuck arrow is at, or
         that the sparks are square -- so the system reports what it drew.
         mp-hotarrow reads this. */
      const self = this;
      window.__btHotArrow = () => self.probe();
    }
  }

  begin() {
    const L = this.layer;
    if (L && L.children.length && L.children[L.children.length - 1] !== this.root) L.addChild(this.root);
    this.auraN.begin(); this.aura.begin(); this.base.begin(); this.hot.begin(); this.px.begin();
    this._repN = 0;
  }

  end() {
    this.auraN.end(); this.aura.end(); this.base.end(); this.hot.end(); this.px.end();
  }

  clear() {
    for (const p of this.sparks) p.on = false;
    this.begin();
    this.end();
  }

  _spawn() {
    const a = this.sparks, n = a.length;
    for (let k = 0; k < n; k++) {
      const p = a[this._si];
      this._si = (this._si + 1) % n;
      if (!p.on) { p.on = true; p.age = 0; return p; }
    }
    return null;
  }

  _spark(x, y, vx, vy, grav, drag, life, size, pk) {
    const p = this._spawn();
    if (!p) return;
    p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.grav = grav; p.drag = drag;
    p.life = life; p.size = size; p.pk = pk;
  }

  /* one square, n art pixels wide, snapped to the art-pixel grid */
  _sq(x, y, n, tint, alpha, pk) {
    const sp = this.px.take(ART.px);
    if (!sp) return;
    const u = PIX * (pk || 1);
    sp.anchor.set(0.5, 0.5);
    sp.x = Math.round(x / u) * u;
    sp.y = Math.round(y / u) * u;
    sp.scale.set((u * n) / 4);
    if (sp.tint !== tint) sp.tint = tint;
    sp.alpha = alpha;
  }

  /* the arrow, its flash and its aura, posed alike */
  _pose(sp, ax, x, y, ang, s) {
    sp.anchor.set(ax, 0.5);
    sp.scale.set(s);
    sp.x = x; sp.y = y;
    sp.rotation = ang;
  }

  /** Draw one white-hot special.  `headless`: it has arrived in something
   *  (the caller's v2.3.2381 / v2.3.2844 rule).  `tickBase`: its stuckAt/plantedAt,
   *  0 in flight or for a peer's arrow (v2.3.2848: a volley's shared clock,
   *  bowVolley.js burnT0).  `blast`: it ends in the send-off (smoulderHeat).
   *  Returns false when the art is not built yet, so the caller can fall
   *  back. */
  arrow(p, x, y, ang, alpha, pk, now, headless, tickBase, blast) {
    if (!ART.ready || !p || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    const k = pk || 1;
    const a0 = clamp(Number.isFinite(alpha) ? alpha : 1, 0, 1);
    const r = ang || 0;
    const s = (HOT_LEN * k) / ART.w;
    const c = Math.cos(r), sn = Math.sin(r);
    let st = p._hotSt;
    if (!st) st = p._hotSt = { lx: NaN, ly: NaN, acc: 0, ph: (Math.random() * 6) | 0, since: 0, tick: 0 };
    const step = Math.floor(now / STEP_MS) + st.ph;
    const rep = this._repN < MAX_REPORT ? this._rep[this._repN++] : null;

    if (!headless) {
      st.since = 0;
      const flick = 0.8 + 0.2 * hash(step);
      const aTex = ART.aura[step % AURA_N];
      const an = this.auraN.take(aTex), au = this.aura.take(aTex);
      if (an) { this._pose(an, ART.auraAx, x, y, r, s); an.alpha = a0 * 0.5 * flick; }
      if (au) { this._pose(au, ART.auraAx, x, y, r, s); au.alpha = a0 * 0.6 * flick; }
      const b = this.base.take(ART.heat[step % HOT_N]);
      if (b) { this._pose(b, ART.ax, x, y, r, s); b.alpha = a0; if (b.tint !== 0xffffff) b.tint = 0xffffff; }
      /* the breath: white light over the heated body on v2.3.2511's 260 ms */
      const pulse = Math.sin(Math.PI * ((now % PULSE_MS) / PULSE_MS));
      const h = this.hot.take(ART.flash);
      if (h) {
        this._pose(h, ART.ax, x, y, r, s);
        if (h.tint !== 0xffffff) h.tint = 0xffffff;
        h.alpha = a0 * 0.35 * pulse;
      }
      const front = (1 - ART.ax) * HOT_LEN * k;
      /* the hottest point: a stepped glow on the head (its middle is ~0.76 of
         the way from the pivot to the tip) */
      const hg = this.hot.take(ART.glow);
      if (hg) {
        hg.anchor.set(0.5, 0.5);
        hg.scale.set(s * (1 + 0.25 * pulse));
        hg.x = x + c * front * 0.76; hg.y = y + sn * front * 0.76; hg.rotation = 0;
        if (hg.tint !== 0xffffff) hg.tint = 0xffffff;
        hg.alpha = a0 * 0.55 * flick;
      }
      /* the tip twinkle, screen-aligned like a glint */
      const tx = x + c * front * 0.97, ty = y + sn * front * 0.97;
      const tw = TWINKLE[step % TWINKLE.length];
      const u = PIX * k;
      this._sq(tx, ty, 2, 0xffffff, a0, k);
      for (let i = 1; i <= tw[0]; i++) {
        const tint = i === tw[0] ? 0xff9a30 : 0xfff3c4;   /* orange at the arm's end: it reads on a pale ground too */
        this._sq(tx + i * u, ty, 1, tint, a0, k); this._sq(tx - i * u, ty, 1, tint, a0, k);
      }
      for (let i = 1; i <= tw[1]; i++) {
        const tint = i === tw[1] ? 0xff9a30 : 0xfff3c4;
        this._sq(tx, ty + i * u, 1, tint, a0, k); this._sq(tx, ty - i * u, 1, tint, a0, k);
      }
      this._shed(st, x, y, c, sn, k);
      if (rep) {
        rep.state = 'flight'; rep.x = +x.toFixed(1); rep.y = +y.toFixed(1); rep.rot = +r.toFixed(3);
        rep.len = +(HOT_LEN * k).toFixed(2); rep.drawnLen = b ? +(b.width).toFixed(2) : 0;
        rep.headless = false; rep.tex = 'heat';
        rep.baseTint = b ? b.tint : 0; rep.frame = step % HOT_N;
        rep.flashAlpha = h ? +h.alpha.toFixed(3) : 0;
        rep.auraAlpha = au ? +au.alpha.toFixed(3) : 0; rep.auraNAlpha = an ? +an.alpha.toFixed(3) : 0;
        rep.auraFrame = step % AURA_N;
        rep.heat = 1;
        rep.alpha = +a0.toFixed(3);
      }
    } else {
      if (!st.since) {
        st.since = now;
        this._strike(x, y, c, sn, k);
      }
      const heat = smoulderHeat(now, st.since, tickBase || 0, blast);
      const tint = coolTint(heat), ember = emberStep(heat);   /* not smoulderLook: nothing in the frame loop allocates */
      const a1 = a0 * smoulderFade(now, tickBase || 0, blast);   /* v2.3.2848: a volley arrow burns out and is gone */
      const axN = ART.ax / ART.headFrac;
      /* the heated shaft, its head buried, drawn in the ember frame its heat
         has cooled to -- a palette step, not a tint (a multiply flattened the
         whole shaft to one orange) -- with a light of its own colour over it
         that swells on each tick */
      const b = this.base.take(ART.ember[ember] || ART.heatNoHead);
      if (b) { this._pose(b, axN, x, y, r, s); b.alpha = a1; if (b.tint !== 0xffffff) b.tint = 0xffffff; }
      const fl = this.hot.take(ART.flashNoHead);
      if (fl) {
        this._pose(fl, axN, x, y, r, s);
        if (fl.tint !== tint) fl.tint = tint;
        fl.alpha = a1 * 0.4 * heat * heat;
      }
      /* the ember where the head went in */
      const cut = (ART.headFrac - ART.ax) * HOT_LEN * k;
      const ex = x + c * cut, ey = y + sn * cut;
      const g = this.hot.take(ART.glow);
      if (g) {
        g.anchor.set(0.5, 0.5);
        g.scale.set(s * (0.8 + 0.5 * heat));
        g.x = ex; g.y = ey; g.rotation = 0;
        if (g.tint !== tint) g.tint = tint;
        g.alpha = a1 * (0.25 + 0.7 * heat);
      }
      if (tickBase) {
        const n = Math.floor((now - tickBase) / TICK_MS);
        if (n >= 1 && n !== st.tick) {
          st.tick = n;
          this._stats.throbs++;
          this._rise(x, y, c, sn, k, 3);
        }
        /* the heat building for the blast; a volley arrow has none to build */
        if (blast && now - tickBase > LIFE_MS - 600 && Math.random() < 0.5) this._rise(x, y, c, sn, k, 1);
      }
      if (rep) {
        rep.state = tickBase ? 'smoulder' : 'landed'; rep.x = +x.toFixed(1); rep.y = +y.toFixed(1); rep.rot = +r.toFixed(3);
        rep.len = +(HOT_LEN * k).toFixed(2); rep.drawnLen = b ? +(b.width / ART.headFrac).toFixed(2) : 0;
        rep.headless = true; rep.tex = 'ember' + ember;
        rep.baseTint = b ? b.tint : 0; rep.frame = ember;
        rep.flashAlpha = 0; rep.auraAlpha = 0; rep.auraNAlpha = 0; rep.auraFrame = -1;
        rep.emberAlpha = g ? +g.alpha.toFixed(3) : 0;
        rep.heat = +heat.toFixed(3);
        rep.alpha = +a1.toFixed(3);   /* v2.3.2848: the burn-out's fade */
      }
    }
    st.lx = x; st.ly = y;
    return true;
  }

  /* Sparks shed along the stretch flown since last frame, off the shaft --
     more of them near the head, the hottest part. */
  _shed(st, x, y, c, sn, k) {
    if (!Number.isFinite(st.lx)) return;
    const dx = x - st.lx, dy = y - st.ly;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (!(d > 0.5) || d > 260 * k) { st.acc = 0; return; }
    const back = ART.ax * HOT_LEN * k, front = (1 - ART.ax) * HOT_LEN * k;
    const gap = 9 * k;
    st.acc += d;
    let n = 0;
    while (st.acc >= gap && n < 6) {
      st.acc -= gap; n++;
      const f = st.acc / d;                          /* how far back along this frame's stretch */
      const bx = x - dx * f, by = y - dy * f;
      const along = -back * 0.9 + (back * 0.9 + front * 0.8) * Math.sqrt(Math.random());
      const side = (Math.random() - 0.5) * 4 * k;
      const px = bx + c * along - sn * side, py = by + sn * along + c * side;
      const sp = (20 + Math.random() * 50) * k, lat = (Math.random() - 0.5) * 90 * k;
      this._spark(px, py, -c * sp - sn * lat, -sn * sp + c * lat - Math.random() * 30 * k,
        -20 * k, 0.9, 140 + Math.random() * 200, Math.random() < 0.25 ? 2 : 1, k);
      this._stats.shed++;
    }
    if (Math.random() < 0.25) {
      /* now and then one pops off the head, sideways and quick */
      const hx = x + c * front * 0.8, hy = y + sn * front * 0.8;
      const sgn = Math.random() < 0.5 ? -1 : 1, v = (80 + Math.random() * 60) * k;
      this._spark(hx, hy, -sn * v * sgn - c * 30 * k, c * v * sgn - sn * 30 * k, 60 * k, 0.86, 200 + Math.random() * 100, 1, k);
    }
  }

  /* The strike: it has just gone in -- a handful thrown back out of the
     wound the way it came, falling. */
  _strike(x, y, c, sn, k) {
    this._stats.strikes++;
    const cut = (ART.headFrac - ART.ax) * HOT_LEN * k;
    const ex = x + c * cut, ey = y + sn * cut;
    for (let i = 0; i < 9; i++) {
      const spread = (Math.random() - 0.5) * 2.4;
      const ca = Math.cos(spread), sa = Math.sin(spread);
      const dxv = -(c * ca - sn * sa), dyv = -(sn * ca + c * sa);
      const v = (60 + Math.random() * 110) * k;
      this._spark(ex, ey, dxv * v, dyv * v - 40 * k, 180 * k, 0.9, 250 + Math.random() * 230, i < 3 ? 2 : 1, k);
    }
  }

  /* A throb's sparks: from along the buried shaft, rising. */
  _rise(x, y, c, sn, k, n) {
    const back = ART.ax * HOT_LEN * k, cut = (ART.headFrac - ART.ax) * HOT_LEN * k;
    for (let i = 0; i < n; i++) {
      const along = -back * 0.6 + (back * 0.6 + cut) * Math.random();
      const px = x + c * along, py = y + sn * along;
      this._spark(px, py, (Math.random() - 0.5) * 50 * k, -(40 + Math.random() * 60) * k,
        -15 * k, 0.94, 300 + Math.random() * 260, 1, k);
    }
  }

  /** Advance and draw the sparks.  After every arrow() this frame. */
  update(now) {
    const dt = clamp(this._lastNow ? now - this._lastNow : 16.667, 0, 50);
    this._lastNow = now;
    const f = dt / 16.667;
    for (const p of this.sparks) {
      if (!p.on) continue;
      p.age += dt;
      if (p.age >= p.life) { p.on = false; continue; }
      const dr = Math.pow(p.drag, f);
      p.vx *= dr; p.vy *= dr;
      p.vy += p.grav * (dt / 1000);
      p.x += p.vx * (dt / 1000);
      p.y += p.vy * (dt / 1000);
      const u = p.age / p.life;
      let i = 0;
      while (i < 4 && u >= SPARK_AT[i]) i++;
      /* a hot spark is a pixel bigger, and shrinks as it cools */
      this._sq(p.x, p.y, p.size + (i <= 1 ? 1 : 0), SPARK_RAMP[i], 1, p.pk);
    }
  }

  probe() {
    let live = 0;
    for (const p of this.sparks) if (p.on) live++;
    const tints = new Set();
    for (let i = 0; i < this.px.n; i++) { const sp = this.px.list[i]; if (sp) tints.add(sp.tint); }
    const blend = (pool) => { const sp = pool.list[0]; return sp ? sp.blendMode : pool.blend; };
    let filters = 0;
    for (const pool of [this.auraN, this.aura, this.base, this.hot, this.px]) {
      for (let i = 0; i < pool.n; i++) { const sp = pool.list[i]; if (sp && sp.filters && sp.filters.length) filters++; }
    }
    const L = this.root.parent;
    const arrows = [];
    for (let i = 0; i < this._repN; i++) arrows.push(Object.assign({}, this._rep[i]));
    return {
      ready: ART.ready, nearest: ART.nearest,
      len: HOT_LEN, pix: PIX,
      /* world px from the shaft's centre line to the aura's farthest lit
         pixel, at the special's size -- PROJ_BODY.arrowSpecial's half is 12.8 */
      auraHalf: +(ART.auraReach * (HOT_LEN / ART.w)).toFixed(2),
      arrows,
      sparks: live, drawn: { auraN: this.auraN.n, aura: this.aura.n, base: this.base.n, hot: this.hot.n, px: this.px.n },
      sparkTints: [...tints],
      blends: { aura: blend(this.aura), auraN: blend(this.auraN) || 'normal', hot: blend(this.hot), base: blend(this.base) || 'normal' },
      filters,
      onTop: !!(L && L.children[L.children.length - 1] === this.root),
      layer: (L && L.label) || null,
      stats: Object.assign({}, this._stats),
    };
  }
}
