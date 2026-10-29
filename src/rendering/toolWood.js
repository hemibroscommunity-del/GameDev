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

/* ═══ v2.3.3881: THE PICKAXE, SOLID ═══
 * The owner, 2026-10-29, playtesting for the showing: "Ok the pickaxe for the
 * first quest is still invisible or at least very lightly drawn. Can you use
 * code to fill it with a handle and just an iron color for the metal part?"
 * The mining sheets draw it as a thin stroke, one or two art px wide, in a
 * pale wood and a blue-grey steel that sit close to the ground's own colours;
 * at a phone's or a computer's scale it all but vanished.  So, at the bake
 * (behind the loading screen, once a look -- never a frame), on the pixels
 * toolWoodMask finds:
 *   - the steel's blue-grey touching it joins it (the mask's steel test took
 *     next to none on most frames), the rock's plain grey dust does not;
 *   - the HEAD is the thick grey (WHICH GREY IS THE HEAD: the art shades the
 *     handle in the head's grey, one px wide), and the wood right against it;
 *   - filled: the handle a solid wood brown, the head a solid iron grey with a
 *     light top edge, every pixel fully opaque;
 *   - outlined: half an art px OUTWARD into the empty pixels round it (never
 *     onto the body), dark brown round the handle, dark iron round the head,
 *     so the stroke stands off whatever it is drawn over.
 * `?toolsolid=0` in the address: the pickaxe as it was (one tab).
 * Returns the pixels painted. */
const WOOD = [134, 88, 46], WOOD_DARK = [58, 34, 16];
const IRON = [150, 157, 166], IRON_LIGHT = [214, 220, 228], IRON_DARK = [44, 48, 56];
const STEEL_BLUE = 12;     /* the steel's blue over its red (the art's ~20; the rock's dust ~0) */
const HEAD_CORE_MIN_256 = 6;   /* px grey all round, at a 256 px frame: the head has them, the handle's shading none */
export function solidTool(d, w, h, FW, mask) {
  const N = w * h, k = h / 256;
  const edge = Math.max(1, Math.round(1 * k));   /* half an art px at the mining sheets' 128: wider filled the gaps between the arm and the legs */
  const m = mask.slice();
  const near = (p, want, r) => {
    const x = p % w, y = (p - x) / w, fx0 = x - (x % FW), fx1 = Math.min(w, fx0 + FW);
    for (let yy = Math.max(0, y - r); yy <= Math.min(h - 1, y + r); yy++) {
      for (let xx = Math.max(fx0, x - r); xx <= Math.min(fx1 - 1, x + r); xx++) if (want(m[yy * w + xx])) return true;
    }
    return false;
  };
  /* the steel's grey: blue-tinted (the art's steel is ~20 bluer than red;
     the dust the swing throws off the rock is a plain grey), in pieces
     (8-connected, in its frame) that touch the pickaxe */
  const grey = new Uint8Array(N);
  let any = 0;
  for (let p = 0, i = 0; p < N; p++, i += 4) {
    if (m[p]) { any++; continue; }
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
    if (a > 40 && b - r >= STEEL_BLUE && Math.max(r, g, b) - Math.min(r, g, b) < 48 && r > 80 && r < 225) grey[p] = 1;
  }
  if (!any) return 0;
  /* WHICH GREY IS THE HEAD.  The art shades the handle in the head's own
     grey, so no single pixel's colour parts them; their THICKNESS does.  The
     handle's shading is one art px wide (two at the bake's 256), the head's
     iron two or three: a grey piece (8-connected, in its frame, touching the
     pickaxe) is the head when it has HEAD_CORE_MIN px or more grey all round
     (their 3 x 3 all grey), the handle's shading otherwise (wood); and the
     wood right against the head is its rim (iron).  Not by the pickaxe's long
     axis: at the rock it points at you, and its axis runs along the head. */
  const seen = new Uint8Array(N), list = new Int32Array(N);
  const coreMin = Math.max(2, Math.round(HEAD_CORE_MIN_256 * k * k));
  for (let p0 = 0; p0 < N; p0++) {
    if (!grey[p0] || seen[p0]) continue;
    const x0 = p0 % w, fx0 = x0 - (x0 % FW), fx1 = Math.min(w, fx0 + FW);
    let end = 0, touches = false;
    seen[p0] = 1; list[end++] = p0;
    for (let i = 0; i < end; i++) {
      const p = list[i], x = p % w, y = (p - x) / w;
      for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++) {
        for (let xx = Math.max(fx0, x - 1); xx <= Math.min(fx1 - 1, x + 1); xx++) {
          const q = yy * w + xx;
          if (m[q]) touches = true;
          else if (grey[q] && !seen[q]) { seen[q] = 1; list[end++] = q; }
        }
      }
    }
    if (!touches) continue;
    let core = 0;
    for (let i = 0; i < end && core < coreMin; i++) {
      const p = list[i], x = p % w, y = (p - x) / w;
      if (x <= fx0 || x >= fx1 - 1 || y <= 0 || y >= h - 1) continue;
      let all = true;
      for (let yy = y - 1; yy <= y + 1 && all; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (!grey[yy * w + xx]) { all = false; break; }
      if (all) core++;
    }
    const v = core >= coreMin ? 2 : 1;
    for (let i = 0; i < end; i++) m[list[i]] = v;
  }
  /* the head's rim: the wood right against it */
  const rim = [];
  for (let p = 0; p < N; p++) if (m[p] === 1 && near(p, (v) => v === 2, Math.max(1, Math.round(2 * k)))) rim.push(p);
  for (const p of rim) m[p] = 2;
  const put = (i, c) => { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
  let n = 0;
  /* the fill, and the head's light top edge */
  for (let p = 0, i = 0; p < N; p++, i += 4) {
    if (!m[p]) continue;
    if (m[p] === 1) put(i, WOOD);
    else put(i, p >= w && m[p - w] !== 2 ? IRON_LIGHT : IRON);
    n++;
  }
  /* the outline, out into the empty pixels only */
  const out = [];
  for (let p = 0, i = 0; p < N; p++, i += 4) {
    if (m[p] || d[i + 3] > 40) continue;
    if (near(p, (v) => v === 2, edge)) out.push(p, 2);
    else if (near(p, (v) => v === 1, edge)) out.push(p, 1);
  }
  for (let j = 0; j < out.length; j += 2) { put(out[j] * 4, out[j + 1] === 2 ? IRON_DARK : WOOD_DARK); n++; }
  return n;
}
