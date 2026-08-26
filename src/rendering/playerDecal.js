/* ═══ v2.3.1938: STAMP A DRAWING ONTO THE SHIRT ═══
 *
 * Owner: "allowing people to customize their own t shirts".
 *
 * ── WHY THE DECAL IS PLACED FROM THE SHIRT'S OWN PIXELS ──
 * The obvious approach is a chest anchor per pose/direction/frame, and it is
 * the wrong one: the shirt is drawn from ~20 sheets (stand, jog x 26 frames,
 * hit, bow, sword, ...) x 5 facings, so that is hundreds of numbers to author
 * and re-author whenever the art moves.
 *
 * Instead each FRAME is measured: the decal is placed against that frame's own
 * shirt silhouette, so it follows the torso through every pose, every bob of a
 * jog cycle, and every facing without a single hand-tuned coordinate.
 *
 * Two details make that measurement behave:
 *
 *   1. The box is taken from the TORSO ROWS, not the whole shirt.  A sleeve
 *      swings out during a jog, and using the full bounding box would make the
 *      decal slide left and right with the arms.  The torso is found as the
 *      widest run in the shirt's upper half, which is the chest.
 *
 *   2. The stamp is CLIPPED to the shirt's own alpha (destination-in against
 *      the frame), so a drawing can never spill onto skin, past a sleeve, or
 *      into the gap under an arm.  It is paint on the fabric, not a sticker
 *      floating over the character.
 *
 * The result is composited into a copy of the sheet, so downstream code keeps
 * treating the shirt as one texture and nothing else has to learn about this.
 *
 * ── WHY `mirror` EXISTS ──
 * Owner: "The mirroring logic needs changed.  Your smiley face rotated the
 * opposite direction."  Three of the eight facings are drawn by FLIPPING
 * another one (east->west, northeast->northwest, southwest->southeast), and a
 * decal baked into the sheet flips with it — so a print read backwards on half
 * the compass.  A print on a shirt does not reverse when its wearer turns
 * round, so on those facings the drawing is pre-flipped here and comes out
 * correct after the sprite's own mirror.
 */
import { ART_W, ART_H, artColorAt, artHasInk } from './traits/playerArt.js';
import { patternInk } from './traits/patternCatalog.js';   /* v2.3.1941 */

/* The decal covers this much of the chest box.  Under 1 so the drawing sits
   INSIDE the shirt with fabric visible around it, which is what reads as a
   print on a tee rather than a re-textured shirt. */
const FILL_W = 0.72;
const FILL_H = 0.58;
/* Chest centre, as a fraction down the torso box: a print sits on the chest,
   not the belly. */
const CHEST_Y = 0.46;

/** The chest box of one frame, or null if the frame has no shirt in it. */
export function chestBox(data, W, H, x0, fw) {
  let top = -1, bot = -1;
  const rowRun = new Array(H).fill(null);
  for (let y = 0; y < H; y++) {
    let a = -1, b = -1;
    for (let x = x0; x < x0 + fw && x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 40) { if (a < 0) a = x; b = x; }
    }
    if (a >= 0) { rowRun[y] = [a, b]; if (top < 0) top = y; bot = y; }
  }
  if (top < 0) return null;
  /* Torso = the widest row in the shirt's UPPER HALF.  Sleeves are widest
     overall on some frames, and they move; the chest does not. */
  const mid = top + Math.max(1, Math.round((bot - top) * 0.55));
  let bw = 0, bx = [0, 0];
  for (let y = top; y <= mid; y++) {
    const r = rowRun[y];
    if (r && r[1] - r[0] + 1 > bw) { bw = r[1] - r[0] + 1; bx = r; }
  }
  if (!bw) return null;
  return { x0: bx[0], x1: bx[1], top, bot };
}

/**
 * Composite `art` onto every frame of a shirt sheet.
 * @param {HTMLImageElement|HTMLCanvasElement} sheet  the shirt art
 * @param {string} art  a 256-char drawing (see traits/playerArt.js)
 * @param {number} frameH  frame height in px (frames are square)
 * @param {boolean} [mirror]  pre-flip the drawing, for facings the renderer
 *        draws mirrored — so the print still reads the right way round
 * @returns {HTMLCanvasElement} a NEW canvas; the input is never mutated
 */
export function stampShirtArt(sheet, art, frameH, mirror, clip) {
  const W = sheet.naturalWidth || sheet.width;
  const H = sheet.naturalHeight || sheet.height;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, 0, 0);
  if (!artHasInk(art)) return cv;

  const fh = frameH || H;
  const frames = Math.max(1, Math.round(W / fh));
  const src = ctx.getImageData(0, 0, W, H).data;

  /* Paint every frame's decal onto ONE overlay, then clip the whole overlay to
     the sheet in a single pass — one composite instead of one per frame. */
  const ov = document.createElement('canvas');
  ov.width = W; ov.height = H;
  const octx = ov.getContext('2d');
  octx.imageSmoothingEnabled = false;

  for (let f = 0; f < frames; f++) {
    const box = chestBox(src, W, H, f * fh, fh);
    if (!box) continue;
    const bw = box.x1 - box.x0 + 1;
    const bh = box.bot - box.top + 1;
    const dw = Math.max(ART_W, Math.round(bw * FILL_W));
    const dh = Math.max(ART_H, Math.round(bh * FILL_H));
    const cx = (box.x0 + box.x1 + 1) / 2;
    const cy = box.top + bh * CHEST_Y;
    const ox = Math.round(cx - dw / 2);
    const oy = Math.round(cy - dh / 2);
    const cw = dw / ART_W, ch = dh / ART_H;
    for (let gy = 0; gy < ART_H; gy++) {
      for (let gx = 0; gx < ART_W; gx++) {
        /* read the drawing flipped; the sprite's own mirror undoes it */
        const col = artColorAt(art, mirror ? (ART_W - 1 - gx) : gx, gy);
        if (!col) continue;
        octx.fillStyle = col;
        /* Round both edges so neighbouring cells share one boundary and the
           grid tiles with no seams at fractional cell sizes. */
        const px = Math.round(ox + gx * cw), py = Math.round(oy + gy * ch);
        const pw = Math.round(ox + (gx + 1) * cw) - px;
        const ph = Math.round(oy + (gy + 1) * ch) - py;
        if (pw > 0 && ph > 0) octx.fillRect(px, py, pw, ph);
      }
    }
  }
  /* Clip the paint to the fabric.
     v2.3.1942 (owner: "keep it contained within the black outlines ... otherwise
     it makes the clothes appear floating or like one dimensional"): `clip`, when
     given, is the LIT fabric rather than the whole sprite, so a print stops at
     the garment's own outline instead of painting over it.  Defaults to the
     sheet, which is the pre-v2.3.1942 behaviour. */
  octx.globalCompositeOperation = 'destination-in';
  octx.drawImage(clip || sheet, 0, 0);
  ctx.drawImage(ov, 0, 0);
  return cv;
}

/* ═══ v2.3.1940: STAMPING A REGION OF THE BODY SHEET ═══
 *
 * Owner: "allow drawing on pants too.  Also allow drawing in the form of
 * tattoos on the character skin."
 *
 * The shirt is its own sprite, so stampShirtArt above can measure it from the
 * sheet's alpha.  Pants and skin are not: they are CLASSIFIED REGIONS of the
 * body sheet, found by the same colour tests the recolour uses.  So this takes
 * the region as a mask and works on the pixel array in place, which is where
 * recolorBodyToCanvas already is when it calls this — no second decode, no
 * second canvas.
 *
 * Same two properties as the shirt stamp, for the same reasons: the box is
 * measured PER FRAME so the drawing rides the body through every pose, and the
 * paint is confined to the mask so a tattoo can never land on a trouser leg or
 * a leg print on a boot.
 */

/** Stamp `art` into every frame, confined to `mask` (1 byte per pixel).
 *  `box` places it inside each frame's region: fractions of the region's own
 *  width/height, and how far down its centre sits. */
const REGION_KEEP = 0.15;   /* a row/column counts as part of the region at 15% of the peak */
/** The largest 4-connected piece of `mask` within one frame's columns.
 *  Returns the input when there is only one piece, so the common case costs a
 *  scan and no allocation. */
function _largestPiece(mask, w, h, x0, x1) {
  const seen = new Uint8Array(w * h);
  let best = null, bestN = 0, pieces = 0;
  for (let y = 0; y < h; y++) {
    for (let x = x0; x < x1; x++) {
      const p0 = y * w + x;
      if (!mask[p0] || seen[p0]) continue;
      pieces++;
      /* A plain growable array, deliberately: a fixed-size stack would have to
         silently drop cells when it filled, and an under-filled component is a
         wrong answer that looks like a right one. */
      const cells = [p0];
      seen[p0] = 1;
      for (let i = 0; i < cells.length; i++) {
        const q = cells[i];
        const qy = (q / w) | 0, qx = q - qy * w;
        if (qx > x0 && mask[q - 1] && !seen[q - 1]) { seen[q - 1] = 1; cells.push(q - 1); }
        if (qx < x1 - 1 && mask[q + 1] && !seen[q + 1]) { seen[q + 1] = 1; cells.push(q + 1); }
        if (qy > 0 && mask[q - w] && !seen[q - w]) { seen[q - w] = 1; cells.push(q - w); }
        if (qy < h - 1 && mask[q + w] && !seen[q + w]) { seen[q + w] = 1; cells.push(q + w); }
      }
      if (cells.length > bestN) { bestN = cells.length; best = cells; }
    }
  }
  if (pieces <= 1 || !best) return mask;
  const out = new Uint8Array(w * h);
  for (let i = 0; i < best.length; i++) out[best[i]] = 1;
  return out;
}

/**
 * Paint `art` into the region `mask` marks out, one box per frame.
 * @param {object} [opts] `{ eachPiece: true }` stamps EVERY limb-sized piece of
 *        the region rather than only the largest — see framePieces.  Omitted,
 *        the behaviour is exactly what it was: largest piece only, confined to
 *        the whole mask, which keeps the shipped chest/trouser bakes identical.
 */
/* ═══ v2.3.1962: WHERE THE 16x16 GRID LANDS, IN ONE PLACE ═══
 *
 * The drawing is a 16x16 grid fitted into a box inside the region's measured
 * bulk rectangle.  That arithmetic used to live inline in stampRegion and
 * nowhere else, which was fine while the only thing that needed it was the
 * stamp itself.  The designer now needs the SAME numbers to run backwards —
 * the owner wants to draw on the character rather than on a detached grid, so
 * a touch on the body has to resolve to a cell — and a second copy of a fit
 * like this is precisely how the hat and its hair-mask drifted apart
 * (v2.3.1959).  One function, used by both directions.
 *
 * `fillW`/`fillH` are the share of the region the grid covers and `cy` is where
 * its centre sits down the region, so the caller's BOX constants keep meaning
 * exactly what they meant.
 */
export function gridFit(lx, rx, ty, by, box) {
  const bw = rx - lx + 1, bh = by - ty + 1;
  const dw = Math.max(ART_W, Math.round(bw * box.fillW));
  const dh = Math.max(ART_H, Math.round(bh * box.fillH));
  const ox = Math.round((lx + rx + 1) / 2 - dw / 2);
  const oy = Math.round(ty + bh * box.cy - dh / 2);
  return { ox, oy, cw: dw / ART_W, ch: dh / ART_H };
}

/** The inverse of gridFit: which grid cell a pixel of the SHEET falls in, or
 *  null when it falls outside the grid entirely.  Deliberately does NOT consult
 *  the region mask — a touch just off the arm should still resolve to the cell
 *  it is nearest, or the last few pixels of every stroke would be swallowed.
 *  What the mask governs is where the ink SHOWS, which the live preview says
 *  better than a rejected touch would. */
export function cellAt(g, x, y) {
  const gx = Math.floor((x - g.ox) / g.cw);
  const gy = Math.floor((y - g.oy) / g.ch);
  if (gx < 0 || gy < 0 || gx >= ART_W || gy >= ART_H) return null;
  return { gx, gy };
}

export function stampRegion(d, w, h, frameW, mask, art, mirror, box, opts) {
  if (!artHasInk(art)) return 0;
  const frames = Math.max(1, Math.floor(w / frameW));
  const eachPiece = !!(opts && opts.eachPiece);
  const underSkin = !!(opts && opts.underSkin);   /* v2.3.1950 */
  /* v2.3.1962: when the caller passes an array, every grid this stamp fits is
     pushed into it.  The designer reads them to turn a touch on the body back
     into a cell; the game passes nothing and the array never exists. */
  const report = (opts && opts.report) || null;
  let painted = 0;
  let scratch = null, seenBuf = null;
  /* The mask is its own array, so painting colours into `d` can never change
     what counts as region -- every frame is measured and filled against the
     classification the caller made BEFORE any retinting. */
  for (let f = 0; f < frames; f++) {
    const x0 = f * frameW, x1 = Math.min(w, x0 + frameW);
    /* ── MEASURE THE REGION BY ITS BULK, NOT BY ITS EXTREMES ──
       A plain bounding box is wrong here, and measurably so.  The classifier
       that produces `mask` is a per-pixel colour test over hand-painted art,
       so it picks up a scatter of stray singles far from the real region: on
       stand-east the trouser test also accepted a handful of dark pixels up in
       the torso, which stretched the pants box from 55 rows to 129 and moved
       the print off the legs and onto the chest, where the mask then rejected
       every pixel of it -- the drawing silently did not appear at all.
       So: count the mask per row and per column, and keep only the rows and
       columns carrying a real share of it.  Strays are ones and twos; the
       region itself is tens.  A fraction of the peak (rather than a fixed
       count) keeps this working for a thin profile view as well as a broad
       front one. */
    /* ── AND MEASURE IT ON ONE PIECE, NOT ON ALL OF THEM (v2.3.1945) ──
       The bulk rule above handles specks; it does not handle the region
       SPLITTING.  A standing figure's trousers are one blob, but a running
       one's are two legs with a gap between them, and a box measured across
       both centres in that gap -- where the mask rejects nearly all of it.
       Measured with a solid 10x10 drawing through a full cycle, the print's
       visible area collapsed from 465px on the standing frame to 4px mid-
       stride on jog-east, and to 2-3px on jog-northeast and hit.  A print you
       drew on your trousers all but vanished whenever you ran.
       So the box is measured on the LARGEST connected piece of the region in
       that frame -- one leg -- which is where a print sits anyway.  On every
       single-piece frame (all five standing facings, and the tattoo's torso)
       the largest piece IS the whole region, so those are unchanged to the
       pixel; only the frames that were broken move. */
    /* v2.3.1949: a figure has two arms, and the single-piece rule above would
       ink only the bigger one.  When each piece is stamped it is also its own
       confinement, so one arm's box can never bleed onto the other. */
    if (eachPiece && !seenBuf) seenBuf = new Uint8Array(w * h);
    const pieceList = eachPiece ? framePieces(mask, w, h, x0, x1, seenBuf) : [null];
    for (let pi = 0; pi < pieceList.length; pi++) {
    /* One scratch mask for the whole sheet, painted from this piece's cell
       list and wiped again by the same list — O(piece), not O(sheet). */
    if (eachPiece) {
      if (!scratch) scratch = new Uint8Array(w * h);
      const cs = pieceList[pi];
      for (let i = 0; i < cs.length; i++) scratch[cs[i]] = 1;
    }
    const piece = eachPiece ? scratch : _largestPiece(mask, w, h, x0, x1);
    const confine = eachPiece ? scratch : mask;
    const release = () => {
      if (!eachPiece) return;
      const cs = pieceList[pi];
      for (let i = 0; i < cs.length; i++) scratch[cs[i]] = 0;
    };
    const rowN = new Int32Array(h), colN = new Int32Array(x1 - x0);
    let peakRow = 0, peakCol = 0;
    for (let y = 0; y < h; y++) {
      for (let x = x0; x < x1; x++) {
        if (!piece[y * w + x]) continue;
        if (++rowN[y] > peakRow) peakRow = rowN[y];
        if (++colN[x - x0] > peakCol) peakCol = colN[x - x0];
      }
    }
    if (!peakRow) { release(); continue; }   /* this piece has nothing here */
    const rowMin = Math.max(2, peakRow * REGION_KEEP), colMin = Math.max(2, peakCol * REGION_KEEP);
    let lx = Infinity, rx = -1, ty = Infinity, by = -1;
    for (let y = 0; y < h; y++) if (rowN[y] >= rowMin) { if (y < ty) ty = y; if (y > by) by = y; }
    for (let x = 0; x < colN.length; x++) if (colN[x] >= colMin) { if (x < lx) lx = x + x0; if (x + x0 > rx) rx = x + x0; }
    if (rx < 0 || by < 0) { release(); continue; }
    /* v2.3.1950: the region's own mean brightness, so ink can be shaded BY the
       body rather than pasted flat over it — see INK_TUNE. */
    let refLum = 0;
    if (underSkin) {
      let n = 0, sum = 0;
      for (let y = ty; y <= by; y++) {
        for (let x = lx; x <= rx; x++) {
          if (!confine[y * w + x]) continue;
          const i = (y * w + x) * 4;
          sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          n++;
        }
      }
      refLum = n ? sum / n : 128;
    }
    const { ox, oy, cw, ch } = gridFit(lx, rx, ty, by, box);
    if (report) report.push({ ox, oy, cw, ch, lx, rx, ty, by, frame: f });
    for (let gy = 0; gy < ART_H; gy++) {
      for (let gx = 0; gx < ART_W; gx++) {
        const col = artColorAt(art, mirror ? (ART_W - 1 - gx) : gx, gy);
        if (!col) continue;
        const R = parseInt(col.slice(1, 3), 16), G = parseInt(col.slice(3, 5), 16), B = parseInt(col.slice(5, 7), 16);
        const px = Math.round(ox + gx * cw), py = Math.round(oy + gy * ch);
        const pw = Math.round(ox + (gx + 1) * cw) - px, ph = Math.round(oy + (gy + 1) * ch) - py;
        for (let y = py; y < py + ph; y++) {
          if (y < 0 || y >= h) continue;
          for (let x = px; x < px + pw; x++) {
            if (x < x0 || x >= x1) continue;
            if (!confine[y * w + x]) continue;   /* confined to the region */
            const i = (y * w + x) * 4;
            if (underSkin) {
              const sr = d[i], sg = d[i + 1], sb = d[i + 2];
              /* Shade the ink by how light or dark THIS pixel of the body is
                 relative to the region's average, so the mark follows the
                 muscle shading and the contour lines instead of flattening
                 them.  Clamped: a contour line is near-black and would
                 otherwise take the ink to zero. */
              let sh = 1;
              if (INK_TUNE.shade > 0 && refLum > 0) {
                const lum = 0.299 * sr + 0.587 * sg + 0.114 * sb;
                sh = 1 + (lum / refLum - 1) * INK_TUNE.shade;
                if (sh < 0.55) sh = 0.55; else if (sh > 1.45) sh = 1.45;
              }
              /* v2.3.1950: a FIXED alpha cannot work.  Measured on the three
                 skin tones: black ink at 0.6 alpha reads beautifully on pale
                 skin and all but disappears on dark skin, because black on
                 dark brown has almost no contrast to begin with.  So the ink
                 gets more opaque exactly where it would otherwise vanish —
                 which is also how real ink behaves, more of it being what you
                 need to show up.  Full translucency where the ink and the skin
                 are far apart, opaque where they are close. */
              let A = INK_TUNE.alpha;
              if (INK_TUNE.contrast > 0) {
                const lumI = 0.299 * R * sh + 0.587 * G * sh + 0.114 * B * sh;
                const lumS = 0.299 * sr + 0.587 * sg + 0.114 * sb;
                const c = Math.abs(lumI - lumS) / 255 / INK_TUNE.contrast;
                if (c < 1) A = A + (1 - A) * (1 - c);
              }
              d[i] = sr + (R * sh - sr) * A;
              d[i + 1] = sg + (G * sh - sg) * A;
              d[i + 2] = sb + (B * sh - sb) * A;
            } else {
              d[i] = R; d[i + 1] = G; d[i + 2] = B;
            }
            painted++;
          }
        }
      }
    }
    release();
    }
  }
  return painted;
}

/* Where each drawing sits inside its region.  Fractions, not pixels, so they
   hold at any sheet resolution and through every pose. */
/* Tuned against the shipped art, not guessed: the trouser region on these
   sheets is a short pair of shorts (waist to mid-thigh, 55 rows on stand-south),
   so a small print sat on the waistband where the leg gap ate half of it.  These
   numbers fill the shorts and sit just below the belt line.  The chest box is
   the same idea one region up. */
export const PANTS_BOX = { fillW: 0.78, fillH: 0.62, cy: 0.45 };   /* across the shorts */
export const TATTOO_BOX = { fillW: 0.70, fillH: 0.55, cy: 0.50 };  /* chest */
/* v2.3.1949 (owner: "Allow tattoos on the face and arms too").
   A face is small and mostly eyes, so the ink covers less of it and sits low —
   a cheek/jaw mark rather than a mask over the eyes.  An arm is a narrow
   vertical strip, so its box is nearly the full width of the limb. */
/* ═══ v2.3.1950: INK UNDER SKIN ═══
   Owner: "what effect can make these really look like tattoos instead of just
   black lines on the character?  Maybe making them have some semi transparency?"

   Right diagnosis.  A tattoo was REPLACING the skin pixel outright, so it
   ignored every bit of the body's shading and read as a sticker stuck on.  Ink
   is under skin: some skin shows through it, and the body's own light and
   shadow fall across it.

   These three numbers were CHOSEN BY RENDERING, not guessed — every
   combination on the same figure, on alabaster / tan / ebony, with black ink
   and with white, on the chest and then on the face and arms:

     alpha 0.60     how much skin shows through.  0.85 still read as paint;
                    0.50 lost the face mark on dark skin.
     shade 1.0      the ink is modulated by how light or dark the body is at
                    that pixel, relative to the region's average, so a mark
                    follows the arm's curve instead of flattening it.
     contrast 0.35  the window over which alpha ramps back to opaque.

   THE THIRD ONE IS THE INTERESTING ONE.  A fixed alpha cannot work here: black
   ink at 0.60 looks beautiful on pale skin and all but vanishes on dark skin,
   because black on dark brown has almost no contrast to start with — and the
   palette has fifteen colours against every skin tone.  So the ink is allowed
   to go opaque exactly where it would otherwise disappear, and stays
   translucent where ink and skin are far apart.  Which is also how real ink
   behaves: more of it is what you need in order to show up.

   Frozen because these are measured values, and because a mutable global that
   any module could change would silently re-tune every character in the game.
   Applied ONLY where `underSkin` is set — the three skin canvases.  A shirt
   print is ink ON fabric, not under skin, and stays opaque. */
export const INK_TUNE = Object.freeze({ alpha: 0.60, shade: 1.0, contrast: 0.35 });

export const FACE_BOX = { fillW: 0.62, fillH: 0.46, cy: 0.60 };
export const ARM_BOX = { fillW: 0.92, fillH: 0.40, cy: 0.42 };

/* ═══ v2.3.1949: THE OTHER TWO SKIN REGIONS ═══
 *
 * The chest tattoo has always been "bare skin ∩ the torso band" — the band the
 * shirt tracker already computes.  The face and the arms fall out of the SAME
 * two masks by position, so neither needs a new colour test (and a new colour
 * test over hand-painted art is exactly what produced the speck-chasing in
 * v2.3.1944/1945):
 *
 *   face = skin ABOVE the torso band       — the band starts at the neck seed
 *                                            row, so everything skin-coloured
 *                                            above it is head.
 *   arms = skin BESIDE the torso band      — within the band's own rows but not
 *                                            in it.  With a shirt on, the band
 *                                            IS the shirt, so this is the bare
 *                                            forearm; bare-chested, it is the
 *                                            upper arm outside the torso fill.
 *
 * Bounding the arms by the torso's own last row is what keeps them off the
 * SHINS: the art wears shorts, so a bare lower leg is skin too, and an
 * unbounded "skin that is not torso and not head" mask reaches the ankles.
 */
export function splitSkinRegions(skin, torso, w, h, frameW) {
  const frames = Math.max(1, Math.floor(w / frameW));
  const face = new Uint8Array(w * h);
  const arms = new Uint8Array(w * h);
  for (let f = 0; f < frames; f++) {
    const x0 = f * frameW, x1 = Math.min(w, x0 + frameW);
    let top = -1, bot = -1;
    for (let y = 0; y < h; y++) {
      for (let x = x0; x < x1; x++) {
        if (!torso[y * w + x]) continue;
        if (top < 0) top = y;
        bot = y;
        break;
      }
    }
    if (top < 0) continue;            /* no torso in this frame: place nothing */
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = x0; x < x1; x++) {
        if (!skin[row + x]) continue;
        if (y < top) face[row + x] = 1;
        else if (y <= bot && !torso[row + x]) arms[row + x] = 1;
      }
    }
  }
  return { face, arms };
}

/* How much of a frame's biggest piece a second piece must reach to count as a
   limb of its own rather than a speck.  Two arms are within a few pixels of
   each other; a stray run of classified skin is a fraction of one. */
const PIECE_KEEP = 0.35;

/** Every connected piece of `mask` in one frame that is a real share of the
 *  largest, each as a LIST OF CELL INDICES.  A figure has TWO arms, and
 *  _largestPiece — right for a print on one trouser leg — would tattoo only the
 *  bigger one.
 *
 *  Cell lists rather than a mask per piece, deliberately: a full-sheet
 *  Uint8Array is 458 KB on a jog strip, and one per piece per frame came to
 *  ~13 MB of garbage for a single bake — measured at +34 ms on jog-east, which
 *  is two dropped frames the moment a tattooed player walks on screen.  The
 *  caller paints one reusable scratch mask from the list and clears just the
 *  cells it set. */
export function framePieces(mask, w, h, x0, x1, seenBuf) {
  /* `seenBuf` is the caller's reusable visited-map.  A fresh Uint8Array per
     FRAME is 458 KB on a jog strip and 6 MB across the sheet, for a buffer whose
     only job is to be zero at the start — so it is wiped by the cells that were
     set, which is O(region) rather than O(sheet). */
  const seen = seenBuf || new Uint8Array(w * h);
  const found = [];
  for (let y = 0; y < h; y++) {
    for (let x = x0; x < x1; x++) {
      const p0 = y * w + x;
      if (!mask[p0] || seen[p0]) continue;
      const cells = [p0];
      seen[p0] = 1;
      for (let i = 0; i < cells.length; i++) {
        const q = cells[i];
        const qy = (q / w) | 0, qx = q - qy * w;
        if (qx > x0 && mask[q - 1] && !seen[q - 1]) { seen[q - 1] = 1; cells.push(q - 1); }
        if (qx < x1 - 1 && mask[q + 1] && !seen[q + 1]) { seen[q + 1] = 1; cells.push(q + 1); }
        if (qy > 0 && mask[q - w] && !seen[q - w]) { seen[q - w] = 1; cells.push(q - w); }
        if (qy < h - 1 && mask[q + w] && !seen[q + w]) { seen[q + w] = 1; cells.push(q + w); }
      }
      found.push(cells);
    }
  }
  /* Wipe only what was marked, so the buffer is reusable next frame. */
  if (seenBuf) for (const c of found) for (let i = 0; i < c.length; i++) seen[c[i]] = 0;
  if (!found.length) return [];
  let best = 0;
  for (const c of found) if (c.length > best) best = c.length;
  const keep = Math.max(8, best * PIECE_KEEP);
  return found.filter((c) => c.length >= keep);
}

/* ═══ v2.3.1941: PATTERNS ═══
 *
 * Owner: "patterns for clothing like shirt and pants."
 *
 * A pattern is a small tile repeated across the WHOLE garment, so unlike the
 * drawing above there is no box to measure and no chest to find — every pixel
 * of the region gets a tile cell.  Two things are worth stating because both
 * were decisions, not defaults:
 *
 * ── THE TILE IS ANCHORED TO THE FRAME, NOT TO THE GARMENT ──
 * Anchoring to the garment's own bounding box would make the pattern move WITH
 * the shirt, which sounds more correct and looks worse: the box shifts a pixel
 * or two between animation frames, so the whole pattern would jump by a cell
 * fraction every frame and stripes would crawl over a jogging player.  Anchored
 * to the frame origin the pattern is rock steady and the garment moves through
 * it by the same pixel or two — invisible at this scale, where one tile cell is
 * two or three pixels to begin with.
 *
 * ── MIRRORING, SAME RULE AS THE DRAWING ──
 * Three facings are drawn flipped.  A vertical stripe does not care, but a
 * diagonal or a chevron reverses, so the tile is read pre-flipped on those
 * facings exactly as the drawing is.
 */

/* ═══ v2.3.1942: PAINT THE FABRIC, NOT THE LINE ART ═══
 *
 * Owner: "For the patterns can you keep it contained within the black outlines
 * of the shirt and pants?  Otherwise it makes the clothes appear floating or
 * like one dimensional."
 *
 * Exactly right, and it is one rule for both garments even though they were
 * failing for two different reasons.  Measured on the shipped art:
 *
 *   SHIRT (its own sprite, masked by plain alpha).  The sheet is sharply
 *   bimodal: 96 of 673 opaque pixels on stand-south are the outline at
 *   luminance 0-31, 563 are white fabric at 224-255, and only ~14 sit anywhere
 *   between.  The pattern was painting the outline flat along with the fabric.
 *
 *   TROUSERS (a classified region of the body sheet).  The true black outline
 *   is already OUTSIDE the region — the green test rejects it — but the
 *   region's own rim is the dark shading just inside that outline, and it is
 *   what gives the legs their roundness: 253 rim pixels averaging luminance 62
 *   against an interior averaging 104.  The pattern was flattening that.
 *
 * So: a pattern or a print only paints the LIT part of a garment, and the line
 * art and shading show through it the way they show through dye.
 *
 * ── WHY THE TEST RUNS ON THE ORIGINAL ART ──
 * Both garments are recoloured — the shirt by a tint, the trousers by a retint
 * — so "is this pixel dark" asked after the colour is applied would answer yes
 * to the whole garment on a black shirt and paint nothing at all.  The source
 * art is fixed, so the threshold is measured against that and holds for every
 * colour a player can pick.
 *
 * ── AND WHY IT FAILS SAFE ──
 * If a future sheet is dark-based, this rule would mask nearly everything out
 * and the pattern would silently vanish.  Both callers fall back to the plain
 * region when the lit mask comes out too small to be a garment.
 */
const LIT_MIN = 4;              /* below this share of the region, distrust the rule */

/** Luminance of the pixel at byte offset `i`. */
function _lum(d, i) { return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; }

/** Drop the darkest pixels of `mask` (outline + shading), measured on `base`
 *  — the ORIGINAL, un-recoloured pixels.  Returns the original mask unchanged
 *  if the result would be too small to be a garment. */
export function litFabricMask(base, mask, n, minLum) {
  const lit = new Uint8Array(n);
  let kept = 0, had = 0;
  for (let p = 0; p < n; p++) {
    if (!mask[p]) continue;
    had++;
    if (_lum(base, p * 4) < minLum) continue;
    lit[p] = 1; kept++;
  }
  /* Nothing recognisable left -> the threshold is wrong for this art; paint the
     whole region rather than dropping the feature on the floor. */
  if (!had || kept * LIT_MIN < had) return mask;
  return lit;
}

/* Thresholds, from the measurements in the block above.  The shirt's sits in
   the middle of a nearly empty gap (32-223 holds ~14 of 673 pixels), so it is
   not a tuned number — anything in that band gives the same answer.  The
   trousers' is a real split of a continuous range, chosen between the rim's
   average (62) and the interior's (104). */
export const SHIRT_LIT_MIN = 96;
export const PANTS_LIT_MIN = 80;
/* v2.3.1944: the boots are FLAT gray by construction — the classifier that
   finds them demands a channel spread under 28 and a max of 45-140 — so unlike
   the trousers there is no lit/shaded split to protect, only the near-black
   outline pixels that creep in at the edges.  Low, and doing little. */
export const SHOES_LIT_MIN = 52;

/* ═══ v2.3.1945: A CLASSIFIED REGION HAS SPECKS IN IT, AND A TILE PAINTS THEM ═══
 *
 * The trouser and boot regions are found by a per-pixel colour test over
 * hand-painted art, and both tests accept a scatter of pixels nowhere near the
 * garment.  stampRegion copes, because it measures a BOX from the region's bulk
 * and never reaches a speck outside it.  stampPattern does not: it tiles every
 * masked pixel, so the specks come out wearing the pattern colour.
 *
 * ── WHY THIS IS POSITIONAL, AFTER A ROW-BAND RULE FAILED ──
 * v2.3.1944 kept the contiguous band of rows holding the busiest row.  That
 * works on the STAND sheets, where the specks are a handful of pixels marooned
 * far from the garment, and it fails on the animation sheets, where they are
 * neither few nor marooned: on jog-south the boot test picks up runs of 12-20px
 * at rows 34-51 -- as dense as a boot -- so on five of the 26 frames the band
 * centred on the SPECKS and dropped the boots entirely.  A patterned shoe put
 * its stripes on the character's head and left the feet plain.
 *
 * Density cannot separate them and neither can size: measured per frame, a
 * boot fragments into components of 132/112/88px while a speck run reaches
 * 60px, so any size floor either keeps specks or eats a boot.
 *
 * POSITION separates them completely, because it is the one thing the art
 * guarantees: boots are at the feet and trousers are on the legs.  Measured
 * over 156 frames -- every facing of stand, jog and hit -- as the height a
 * garment reaches UP FROM THE FEET, as a fraction of the figure's own height:
 *
 *     boots      max 0.255   (deepest: jog-southwest frame 19)
 *     trousers   max 0.567   (deepest: hit-south frame 5)
 *
 * The ceilings below sit well clear of both, and the figure's extent is
 * measured per frame from its own alpha, so a pose that stands taller or
 * crouches lower carries the cut with it rather than fighting it.
 */
export const SHOES_MAX_UP = 0.35;    /* measured max 0.255 */
export const PANTS_MAX_UP = 0.68;    /* measured max 0.567 */

/** A copy of `mask` keeping only what lies within `maxUp` of the figure's feet,
 *  measured per frame from the figure's own opaque extent in `d`.
 *  Returns the input unchanged if that would leave nothing. */
export function regionFromFeet(d, mask, w, h, frameW, maxUp) {
  const frames = Math.max(1, Math.floor(w / frameW));
  const out = new Uint8Array(w * h);
  let kept = 0;
  for (let f = 0; f < frames; f++) {
    const x0 = f * frameW, x1 = Math.min(w, x0 + frameW);
    let top = -1, bot = -1;
    for (let y = 0; y < h; y++) {
      let any = false;
      for (let x = x0; x < x1; x++) if (d[(y * w + x) * 4 + 3] > 40) { any = true; break; }
      if (any) { if (top < 0) top = y; bot = y; }
    }
    if (bot < 0) continue;
    const limit = bot - (bot - top + 1) * maxUp;
    for (let y = Math.max(0, Math.ceil(limit)); y <= bot; y++) {
      for (let x = x0; x < x1; x++) if (mask[y * w + x]) { out[y * w + x] = 1; kept++; }
    }
  }
  return kept ? out : mask;
}

/** Tile `pat` (a parsed pattern from patternCatalog) across every pixel of
 *  `mask`, in place on the pixel array.  Returns the number of pixels painted. */
export function stampPattern(d, w, h, frameW, mask, pat, mirror) {
  if (!pat) return 0;
  const tile = pat.tile;
  const R = parseInt(pat.color.slice(1, 3), 16);
  const G = parseInt(pat.color.slice(3, 5), 16);
  const B = parseInt(pat.color.slice(5, 7), 16);
  const cell = Math.max(1, tile.cell);
  const tw = tile.w * cell, th = tile.h * cell;
  let painted = 0;
  for (let y = 0; y < h; y++) {
    const ty = Math.floor((((y % th) + th) % th) / cell);
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      /* phase within the FRAME, so every frame of a strip tiles identically */
      const fx = x % frameW;
      const sx = mirror ? (frameW - 1 - fx) : fx;
      const tx = Math.floor((((sx % tw) + tw) % tw) / cell);
      if (!patternInk(tile, tx, ty)) continue;
      const i = (y * w + x) * 4;
      d[i] = R; d[i + 1] = G; d[i + 2] = B;
      painted++;
    }
  }
  return painted;
}

/* ═══ v2.3.1941: ONE PLACE THAT DRESSES A SHIRT SHEET ═══
 *
 * Colour, pattern and print in a fixed order, because the order is the whole
 * correctness argument and it was previously spread across two files that
 * disagreed.
 *
 *   1. TINT the white-base fabric.
 *   2. PATTERN over the tinted fabric.
 *   3. PRINT over the pattern.
 *
 * ── WHY THE TINT MOVED IN HERE ──
 * The world renderer coloured the shirt with a multiplicative sprite tint
 * applied to the FINISHED texture, so a print baked into that texture got
 * multiplied by the shirt colour too: a drawing on a black shirt came out
 * black.  The login portrait did it the other way round (tint, then stamp) and
 * looked right, so the two disagreed about what a player's own shirt looks
 * like.  Baking the tint here fixes both at once and is what makes patterns
 * possible at all — a pattern IS colour, and a pattern multiplied by the shirt
 * under it is invisible on any dark shirt.
 *
 * The caller must therefore draw the returned texture with NO tint.  It costs
 * nothing in sheets: a player has one shirt colour, so the tint does not
 * multiply the cache, it just joins the key.
 */
export function composeShirt(sheet, frameH, opts) {
  const o = opts || {};
  const W = sheet.naturalWidth || sheet.width;
  const H = sheet.naturalHeight || sheet.height;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, 0, 0);

  /* v2.3.1942: the lit fabric, read BEFORE the tint (see litFabricMask). */
  const base = ctx.getImageData(0, 0, W, H).data;
  const alpha = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) if (base[p * 4 + 3] > 40) alpha[p] = 1;
  const lit = (o.pattern || (o.art && artHasInk(o.art)))
    ? litFabricMask(base, alpha, W * H, SHIRT_LIT_MIN) : alpha;

  if (o.tint) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgb(${o.tint[0]},${o.tint[1]},${o.tint[2]})`;
    ctx.fillRect(0, 0, W, H);
    /* multiply paints the transparent surround too; clip back to the fabric */
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(sheet, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }

  if (o.pattern) {
    const id = ctx.getImageData(0, 0, W, H);
    stampPattern(id.data, W, H, frameH || H, lit, o.pattern, !!o.mirror);
    ctx.putImageData(id, 0, 0);
  }

  if (o.art && artHasInk(o.art)) {
    /* The print is clipped to the same lit fabric, so it stops at the outline
       and at the seam lines rather than erasing them. */
    return stampShirtArt(cv, o.art, frameH, !!o.mirror, _maskCanvas(lit, W, H));
  }
  return cv;
}

/** A canvas that is opaque exactly where `mask` is set — a clip source for the
 *  2D compositor, which cannot take a byte array. */
function _maskCanvas(mask, W, H) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const id = ctx.createImageData(W, H);
  for (let p = 0; p < W * H; p++) if (mask[p]) id.data[p * 4 + 3] = 255;
  ctx.putImageData(id, 0, 0);
  return cv;
}
