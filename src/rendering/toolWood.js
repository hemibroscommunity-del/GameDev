/* ═══ v2.3.3671: THE PICKAXE KEEPS ITS WOOD ═══
 *
 * The owner, 2026-10-27: "check all the animations for ghost remnants of
 * either a body beneath or areas for cleanup".  mp-ghostaudit's miner, a green
 * bro, swung a GREEN pickaxe.  The mining sheets (mine-south and its head)
 * draw the pickaxe in its own wood and steel -- not in the magenta key that
 * the axe and the rod are drawn in and coloured at load (toolRecolor.js) --
 * and its wood is the skin's hue family, so the recolour's skin test took the
 * handle and the rim of its head, and every player mined with a pickaxe the
 * colour of their skin.
 *
 * WHICH PIXELS ARE THE PICKAXE.  The miner's skin is a deeper orange than the
 * wood: over the sheet's 14 frames the skin sits at green/red 0.5-0.6 and
 * blue/red 0.2-0.3, the wood at 0.65 and up and 0.32 and up (both measured on
 * the pixels the skin test passes).  So a skin-test pixel that pale is wood
 * when it is part of a pale piece (8-connected, in its frame) of WOOD_MIN px
 * or more at a 256 px frame.  The handle and the head's rim are one long
 * piece; an eye's corner, an ear's edge or a knuckle's highlight is a few px,
 * and stays skin.  The head's steel is the boots' grey, and the boot test
 * would paint it the player's boots where the pickaxe swings down by the
 * legs, so grey within STEEL_REACH px of the wood is the pickaxe's too.  What
 * is the pickaxe keeps the colour it is painted.
 *
 * No imports: tools/qa/tool-wood.mjs runs it over the sheets' real pixels. */

const WOOD_MIN_256 = 40;
const STEEL_REACH_256 = 6;

/** The pickaxe's pixels on a mining sheet: a mask, a byte a pixel (1 its
 *  wood, 2 its steel, 0 anything else).  `d` the ORIGINAL RGBA pixels, `w` x
 *  `h`, frames `FW` wide. */
export function toolWoodMask(d, w, h, FW) {
  const N = w * h, k = h / 256;
  const woodMin = Math.max(8, Math.round(WOOD_MIN_256 * k * k));
  const reach = Math.max(2, Math.round(STEEL_REACH_256 * k));
  const pale = new Uint8Array(N);
  let n = 0;
  for (let p = 0, i = 0; p < N; p++, i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
    /* playerSkins _isSkin, not the white of the eye (_isEyeCream), and pale */
    if (a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25 && g < 0.8 * r
      && g >= 0.65 * r && b >= 0.32 * r) { pale[p] = 1; n++; }
  }
  const out = new Uint8Array(N);
  if (!n) return out;
  /* the pale pieces big enough to be the pickaxe */
  const seen = new Uint8Array(N), list = new Int32Array(n);
  let woodN = 0;
  for (let p0 = 0; p0 < N; p0++) {
    if (!pale[p0] || seen[p0]) continue;
    const x0 = p0 % w, fx0 = x0 - (x0 % FW), fx1 = Math.min(w, fx0 + FW);
    let end = 0;
    seen[p0] = 1; list[end++] = p0;
    for (let i = 0; i < end; i++) {
      const p = list[i], x = p % w, y = (p - x) / w;
      for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++) {
        for (let xx = Math.max(fx0, x - 1); xx <= Math.min(fx1 - 1, x + 1); xx++) {
          const q = yy * w + xx;
          if (pale[q] && !seen[q]) { seen[q] = 1; list[end++] = q; }
        }
      }
    }
    if (end >= woodMin) { for (let i = 0; i < end; i++) out[list[i]] = 1; woodN += end; }
  }
  if (!woodN) return out;
  /* the steel: the boots' grey within `reach` of the wood (a square, in the
     wood's frame), found by a sweep across and then a sweep down -- the same
     square as walking round every wood pixel, without the walk */
  const across = new Uint8Array(N);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let fx0 = 0; fx0 < w; fx0 += FW) {
      const fx1 = Math.min(w, fx0 + FW);
      let last = -1e9;   /* the nearest wood to the left */
      for (let x = fx0; x < fx1; x++) {
        if (out[row + x] === 1) last = x;
        if (x - last <= reach) across[row + x] = 1;
      }
      last = 1e9;        /* and to the right */
      for (let x = fx1 - 1; x >= fx0; x--) {
        if (out[row + x] === 1) last = x;
        if (last - x <= reach) across[row + x] = 1;
      }
    }
  }
  for (let x = 0; x < w; x++) {
    let last = -1e9;
    for (let y = 0; y < h; y++) {
      if (across[y * w + x]) last = y;
      if (y - last <= reach) _steel(d, out, y * w + x);
    }
    last = 1e9;
    for (let y = h - 1; y >= 0; y--) {
      if (across[y * w + x]) last = y;
      if (last - y <= reach) _steel(d, out, y * w + x);
    }
  }
  return out;
}

/* a grey pixel beside the wood: the boots' test (playerSkins), opaque */
function _steel(d, out, q) {
  if (out[q]) return;
  const i = q * 4;
  if (d[i + 3] <= 180) return;
  const r = d[i], g = d[i + 1], b = d[i + 2];
  const mx = r > g ? (r > b ? r : b) : (g > b ? g : b), mn = r < g ? (r < b ? r : b) : (g < b ? g : b);
  if ((mx - mn) < 28 && mx >= 45 && mx < 140) out[q] = 2;
}
