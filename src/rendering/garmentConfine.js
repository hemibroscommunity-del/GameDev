/* ═══ v2.3.3647: A GARMENT'S COLOUR GOES ON THE GARMENT ═══
 *
 * The owner, 2026-10-27: "check all the animations for ghost remnants of
 * either a body beneath or areas for cleanup".  mp-ghostaudit dressed a bro in
 * pink trousers and blue boots, and the head came back wearing them: specks of
 * blue and pink round its outline, a blue line along the top of an eye, more
 * along the arms -- in the walking figure, the hit, the swing, the bow, nearly
 * every pose.
 *
 * WHY.  recolorBodyToCanvas finds the trousers and boots by COLOUR: green-ish
 * is a trouser, a flat grey 45-139 is a boot.  The anti-aliased pixels along
 * the art's outlines -- where the dark line meets the skin or the background --
 * are often exactly that grey, or that olive, anywhere on the figure, and every
 * one was painted the player's trousers or boots.  In the default colours the
 * specks are dark and pass for outline; in white, red or blue boots they do
 * not.  The patterns met the same specks in v2.3.1944/1945 and were confined
 * by height (playerDecal regionFromFeet); the plain colour never was, and that
 * rule alone cannot be used for it: in the roll the legs go overhead, and the
 * boots would lose their colour.
 *
 * THE RULE, per frame:
 *   - the TROUSERS are the trouser-coloured pixels in pieces (8-connected) of
 *     TROUSER_MIN px or more at a 256 px frame, with their fringe within
 *     FRINGE px, and any trouser-coloured pixel in the band the patterns use,
 *     playerDecal's PANTS_MAX_UP of the figure's height up from its feet (a
 *     torso strip's waistband, measured from its own bottom);
 *   - a BOOT is a whole boot-grey piece any pixel of which lies within TOUCH
 *     px of the trousers and that has an inside (INSIDE px whose four
 *     neighbours are all its own): a boot hangs off its trouser leg however
 *     the leg is turned, and a line of outline grey down the back to the
 *     waist is not a boot -- or, thin, with no skin beside it and a black
 *     sole's thick dark within reach (THICK_DARK): the north jog's raised
 *     back foot is a black sole under a thin grey rim; or a boot-grey pixel in
 *     the band the patterns use, playerDecal's SHOES_MAX_UP of the figure's
 *     height up from its feet (a sole's rim cut off by a dark line).  Both
 *     bands are passed in: playerDecal owns them.
 * A head overlay has no garments at all: its bake passes none (playerSkins
 * _buildPickupHeadSheet).
 * Everything the rule paints today it painted before; what it leaves is a
 * speck that keeps the art's own colour, the outline's grey or olive.
 *
 * HOW IT IS RUN.  Nearly every trouser and boot pixel lies in its band, and a
 * pixel in its band is the garment whatever else is true, so the bake paints
 * those as it finds them (garmentBands, inGarmentBand) and keeps back only the
 * ones outside; judgeGarments walks those and the pieces they belong to, and
 * labels a trouser piece big or small only when a speck asks, a walk that
 * stops at TROUSER_MIN.  On the widest sheet, jog-east (7,168 x 256), that is
 * a third more than the recolour's own pass (13.5 -> 18 ms in Node), where
 * walking every garment pixel cost three times as much.  confineGarments runs
 * the same steps over two whole masks: tools/qa/garment-confine.mjs.
 *
 * No imports, for that tool.  `?garmentspecks=0` is the game as it was. */

const TROUSER_MIN_256 = 30;
const TOUCH_256 = 4;
const FRINGE_256 = 2;
const INSIDE_256 = 24;
/* a thin boot-grey piece that hangs off the trousers is a boot when it
   borders a sole: this many px of THICK dark (black whose four neighbours are
   black too) within DARK_REACH px of it, and no skin beside it.  The raised
   back foot of the north jog is a black sole with a thin grey rim (16 px with
   an inside, of 20-68): its rims border 28-82 px of thick dark; the outline
   specks that also hang off the trousers (the waist's corners, a thigh's
   edge, a fold) border 0-20 */
const THICK_DARK_256 = 25;
const DARK_REACH_256 = 3;

/** The bits of `cls`, a byte a pixel the bake fills as it classifies the
 *  ORIGINAL art (before any retint): a trouser, a boot's grey, skin, and dark
 *  (opaque, every channel under 45). */
export const GC_PANTS = 1, GC_BOOT = 2, GC_SKIN = 4, GC_DARK = 8;

/** Each frame's two band lines: a trouser pixel at or below `pants[f]` (a row,
 *  fractional) or a boot pixel at or below `shoes[f]` is always the garment.
 *  The figure's top and feet are its first rows from the top and from the
 *  bottom with alpha over 40 -- playerDecal regionFromFeet's measure, so these
 *  are exactly the bands the patterns are painted in.  A frame with nothing
 *  drawn has its lines at Infinity. */
export function garmentBands(d, w, h, FW, shoesUp, pantsUp) {
  const frames = Math.max(1, Math.floor(w / FW));
  const pants = new Float64Array(frames).fill(Infinity), shoes = new Float64Array(frames).fill(Infinity);
  const drawn = (y, x0, x1) => {
    for (let i = (y * w + x0) * 4 + 3, e = (y * w + x1) * 4 + 3; i < e; i += 4) if (d[i] > 40) return true;
    return false;
  };
  for (let f = 0; f < frames; f++) {
    const x0 = f * FW, x1 = Math.min(w, x0 + FW);
    let top = 0;
    while (top < h && !drawn(top, x0, x1)) top++;
    if (top === h) continue;
    let bot = h - 1;
    while (!drawn(bot, x0, x1)) bot--;
    pants[f] = bot - (bot - top + 1) * pantsUp;
    shoes[f] = bot - (bot - top + 1) * shoesUp;
  }
  return { frames, pants, shoes };
}

/** Is pixel p (index y * w + x) at or below its frame's line in `lim`? */
export function inGarmentBand(lim, frames, p, w, FW) {
  const x = p % w;
  return (p - x) / w >= lim[Math.min(frames - 1, (x - (x % FW)) / FW)];
}

/** Which of the trouser and boot pixels OUTSIDE their bands are the garment.
 *  `cls` the classes (GC_*), `bands` garmentBands', `outP` / `outB` the
 *  trouser and boot pixels that lie outside their bands, as lists (any order).
 *  Returns `{ pants, boots }`: the ones of those to paint.  A pixel in its band
 *  is painted whatever this says, so the caller paints those as it finds them.
 *  Only the pixels outside the bands and the pieces they belong to are
 *  visited: on a 7,000 px wide jog sheet a few hundred, where the sheet is
 *  1.8 M px and its trousers 50 K. */
export function judgeGarments(w, h, FW, cls, bands, outP, outB) {
  const k = h / 256;
  const minPiece = Math.max(6, Math.round(TROUSER_MIN_256 * k * k));
  const touch = Math.max(2, Math.round(TOUCH_256 * k));
  const fringe = Math.max(1, Math.round(FRINGE_256 * k));
  const minInside = Math.max(2, Math.round(INSIDE_256 * k * k));
  const minDark = Math.max(4, Math.round(THICK_DARK_256 * k * k));
  const reach = Math.max(2, Math.round(DARK_REACH_256 * k));
  const N = w * h;
  const keepP = [], keepB = [];
  const pantsAt = (q) => (cls[q] & GC_PANTS) !== 0;
  const bootAt = (q) => (cls[q] & GC_BOOT) !== 0;
  /* is the trouser piece q lies in minPiece px or more?  Found by a walk of
     the piece that stops at minPiece, its answer kept on every pixel it
     walked (1 big, 2 small; 3 while walking): a walk from a pixel not yet
     walked that meets a pixel known big is in that same piece */
  const lab = new Uint8Array(N);
  const walk = new Int32Array(minPiece);
  const isBig = (q) => {
    if (lab[q]) return lab[q] === 1;
    let end = 0, big = false;
    lab[q] = 3; walk[end++] = q;
    for (let i = 0; i < end && !big; i++) {
      const p = walk[i], x = p % w, y = (p - x) / w;
      const fx0 = x - (x % FW), fx1 = Math.min(w, fx0 + FW);
      const xa = x > fx0 ? x - 1 : x, xb = x < fx1 - 1 ? x + 1 : x;
      const ya = y > 0 ? y - 1 : y, yb = y < h - 1 ? y + 1 : y;
      for (let yy = ya; yy <= yb && !big; yy++) {
        for (let xx = xa; xx <= xb; xx++) {
          const r = yy * w + xx;
          if (!pantsAt(r)) continue;
          if (lab[r] === 1) { big = true; break; }
          if (lab[r] === 0) {
            if (end >= minPiece) { big = true; break; }
            lab[r] = 3; walk[end++] = r;
          }
        }
      }
    }
    if (end >= minPiece) big = true;
    const v = big ? 1 : 2;
    for (let i = 0; i < end; i++) lab[walk[i]] = v;
    return big;
  };
  /* a pixel of a big trouser piece within r px of p (a square), in p's frame */
  const nearBig = (p, r) => {
    const x = p % w, y = (p - x) / w;
    const fx0 = x - (x % FW), fx1 = Math.min(w, fx0 + FW);
    const x0 = Math.max(fx0, x - r), x1 = Math.min(fx1 - 1, x + r);
    const y1 = Math.min(h - 1, y + r);
    for (let yy = Math.max(0, y - r); yy <= y1; yy++) {
      const row = yy * w;
      for (let xx = x0; xx <= x1; xx++) if (pantsAt(row + xx) && isBig(row + xx)) return true;
    }
    return false;
  };
  if (outP) for (let j = 0; j < outP.length; j++) if (nearBig(outP[j], fringe)) keepP.push(outP[j]);
  if (outB && outB.length) {
    const seen = new Uint8Array(N);
    let piece = new Int32Array(256);
    const thick = (q) => {
      const x = q % w, fx = x % FW;
      if (fx === 0 || fx === FW - 1 || q < w || q >= N - w) return false;
      return (cls[q] & cls[q - 1] & cls[q + 1] & cls[q - w] & cls[q + w] & GC_DARK) !== 0;
    };
    for (let j = 0; j < outB.length; j++) {
      const p0 = outB[j];
      if (seen[p0]) continue;
      /* the whole boot-grey piece p0 lies in, in its frame, 8-connected */
      const x0 = p0 % w, fx0 = x0 - (x0 % FW), fx1 = Math.min(w, fx0 + FW);
      let end = 0, skinBeside = false;
      seen[p0] = 1; piece[end++] = p0;
      for (let i = 0; i < end; i++) {
        const p = piece[i], x = p % w, y = (p - x) / w;
        const xa = x > fx0 ? x - 1 : x, xb = x < fx1 - 1 ? x + 1 : x;
        const ya = y > 0 ? y - 1 : y, yb = y < h - 1 ? y + 1 : y;
        for (let yy = ya; yy <= yb; yy++) {
          for (let xx = xa; xx <= xb; xx++) {
            const q = yy * w + xx;
            if (cls[q] & GC_SKIN) skinBeside = true;
            if (!bootAt(q) || seen[q]) continue;
            seen[q] = 1;
            if (end === piece.length) { const g = new Int32Array(end * 2); g.set(piece); piece = g; }
            piece[end++] = q;
          }
        }
      }
      /* a boot hangs off its trouser leg however the leg is turned... */
      let on = false;
      for (let i = 0; i < end && !on; i++) on = nearBig(piece[i], touch);
      /* ...and is SOLID: a boot has an inside, a line of outline grey running
         down the back to the waist has none (it would take the touch, and the
         whole line the boot's colour) */
      if (on) {
        let inside = 0;
        for (let i = 0; i < end && inside < minInside; i++) {
          const p = piece[i], fx = (p % w) % FW;
          if (fx === 0 || fx === FW - 1 || p < w || p >= N - w) continue;
          if (bootAt(p - 1) && bootAt(p + 1) && bootAt(p - w) && bootAt(p + w)) inside++;
        }
        /* ...or, thin, is the rim of a sole: no skin beside it, and a black
           sole's thick dark within reach (THICK_DARK_256) */
        if (inside < minInside) {
          on = false;
          if (!skinBeside) {
            const counted = new Set();
            for (let i = 0; i < end && counted.size < minDark; i++) {
              const p = piece[i], x = p % w, y = (p - x) / w;
              const xa = Math.max(fx0, x - reach), xb = Math.min(fx1 - 1, x + reach);
              for (let yy = Math.max(0, y - reach), ye = Math.min(h - 1, y + reach); yy <= ye; yy++) {
                for (let xx = xa; xx <= xb; xx++) {
                  const q = yy * w + xx;
                  if (!counted.has(q) && thick(q)) counted.add(q);
                }
              }
            }
            on = counted.size >= minDark;
          }
        }
      }
      if (!on) continue;
      for (let i = 0; i < end; i++) {
        if (!inGarmentBand(bands.shoes, bands.frames, piece[i], w, FW)) keepB.push(piece[i]);
      }
    }
  }
  return { pants: keepP, boots: keepB };
}

/** The whole rule on two masks: which of the trouser- and boot-coloured
 *  pixels to paint.  `d` the ORIGINAL RGBA pixels (its alpha, and for skin
 *  and dark its colour), `pants` / `boots` the colour-classified masks
 *  (either may be null), `shoesUp` / `pantsUp` playerDecal's SHOES_MAX_UP /
 *  PANTS_MAX_UP.  Returns `{ pants, boots }`, masks of the pixels that are the
 *  garment.  The game's bake (playerSkins recolorBodyToCanvas) takes the same
 *  steps one at a time, so it paints a pixel in its band as it finds it;
 *  tools/qa/garment-confine.mjs runs this over every sheet. */
export function confineGarments(d, w, h, FW, pants, boots, shoesUp, pantsUp) {
  const N = w * h;
  const bands = garmentBands(d, w, h, FW, shoesUp, pantsUp);
  const cls = new Uint8Array(N);
  const outPants = pants ? new Uint8Array(N) : null, outBoots = boots ? new Uint8Array(N) : null;
  const outP = [], outB = [];
  for (let p = 0, i = 0; p < N; p++, i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
    /* playerSkins _isSkin, not the white of the eye (_isEyeCream) */
    if (a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25 && g < 0.8 * r) cls[p] |= GC_SKIN;
    if (a > 180 && r < 45 && g < 45 && b < 45) cls[p] |= GC_DARK;
    if (pants && pants[p]) {
      cls[p] |= GC_PANTS;
      if (inGarmentBand(bands.pants, bands.frames, p, w, FW)) outPants[p] = 1;
      else outP.push(p);
    }
    if (boots && boots[p]) {
      cls[p] |= GC_BOOT;
      if (inGarmentBand(bands.shoes, bands.frames, p, w, FW)) outBoots[p] = 1;
      else outB.push(p);
    }
  }
  const kept = judgeGarments(w, h, FW, cls, bands, outP, outB);
  for (const p of kept.pants) outPants[p] = 1;
  for (const p of kept.boots) outBoots[p] = 1;
  return { pants: outPants, boots: outBoots };
}
