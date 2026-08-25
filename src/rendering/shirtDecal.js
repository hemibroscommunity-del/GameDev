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
import { ART_W, ART_H, artColorAt, artHasInk } from './traits/shirtArt.js';

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
 * @param {string} art  a 256-char drawing (see traits/shirtArt.js)
 * @param {number} frameH  frame height in px (frames are square)
 * @param {boolean} [mirror]  pre-flip the drawing, for facings the renderer
 *        draws mirrored — so the print still reads the right way round
 * @returns {HTMLCanvasElement} a NEW canvas; the input is never mutated
 */
export function stampShirtArt(sheet, art, frameH, mirror) {
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
  /* Clip the paint to the fabric. */
  octx.globalCompositeOperation = 'destination-in';
  octx.drawImage(sheet, 0, 0);
  ctx.drawImage(ov, 0, 0);
  return cv;
}
