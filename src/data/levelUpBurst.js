/* ═══ v2.3.2591: LEVEL-UP BURST — the measured geometry of the owner's art ═══
 *
 * `public/sprites/fx/levelup-burst-v1.webp` is eight frames of a gold burst
 * across one strip.  The medallion at its centre has a GLOWING EMPTY CIRCLE,
 * and that void is deliberate: it is where the levelling skill's icon goes.
 *
 * ═══ WHY THESE NUMBERS ARE MEASURED AND NOT TYPED ═══
 *
 * The strip is 2172x724 and 2172 / 8 = 271.5, so there is no integer grid to
 * cut on.  The tempting move is to round to 271 or 272 because the arithmetic
 * nearly works.  It does not nearly work — this is TRAPS §59 ("slicing a
 * contact sheet on an even grid it only looks like"), and here the artist
 * drew to the art rather than to a grid by a wide margin: the frame contents
 * are 175..359px wide and their midpoints sit up to ~100px from where an even
 * grid would put them.  A grid cut would take a slice of frame 4's rays into
 * frame 3 and lose the left edge of frame 4.
 *
 * So the cuts below come from the MINIMA OF THE ALPHA COLUMN PROFILE, and the
 * circle from the pixels inside each frame — a distance transform to seed the
 * centre, then the median of 360 ray casts to the edge of the cream core.
 * (The median matters: on frames 0 and 4 the white rays cross the disc and a
 * plain "largest bright blob" leaks out along them — frame 4's blob measures
 * 296x333 for a disc of radius 47.5.)  Re-derive with:
 *
 *     git show e136a64:public/sprites/fx/levelup-burst-v1.png > /tmp/lu.png
 *     node tools/levelup/measure-medallion.mjs /tmp/lu.png
 *
 * (The source PNG is not in the tree — it was 2.2MB and shipped as a 424KB
 * webp instead.  It stays recoverable from the raw-assets commit above.)
 *
 * ═══ WHY THE STRIP IS NOT REPACKED ONTO A UNIFORM GRID ═══
 *
 * Because the medallion MOVES AND SCALES across the eight frames (r goes
 * 17.5 -> 47.5 -> 40), an icon at "the centre of the cell" would drift and
 * jitter.  Repacking into medallion-centred cells would fix that, but the
 * cells would have to be 369x672 each to hold frame 4's rays — 2952x672 in
 * total, LARGER than the source.  So the strip keeps its own geometry and the
 * renderer pins the MEASURED CIRCLE CENTRE to a fixed screen point instead.
 * The icon then cannot jitter: it is not tracking the medallion, it is the
 * thing the medallion is positioned around.
 *
 * Per frame:
 *   sx, sy, sw, sh  the frame's tight content rect inside the strip
 *   ox, oy          the circle's centre, RELATIVE TO that rect
 *   r               the circle's radius, in strip pixels
 *   ms              how long the frame is held (see the timing note below)
 */

export const LEVELUP_STRIP_SRC = '/sprites/fx/levelup-burst-v1.webp?v=2.3.2591';
export const LEVELUP_STRIP_W = 2172;
export const LEVELUP_STRIP_H = 724;

/* ═══ TIMING (a judgement call, recorded so it can be argued with) ═══
 * The sting's loudest transient is at 0.24s and its body runs to 2.24s.  The
 * burst therefore reaches its peak frame (4) at 280ms — close enough to that
 * transient to read as one event — holds the peak a beat longer than the
 * frames either side, then settles through 5 and 6.  Frame 7 is the settled,
 * readable medallion, so it is not given a duration here: it HOLDS (see
 * LEVELUP_HOLD_MS) while the player reads which skill and what level, then
 * the whole overlay fades.  Total ≈ 2.8s against 2.24s of sound. */
export const LEVELUP_FRAMES = [
  { sx: 8,    sy: 275, sw: 175, sh: 192, ox: 90.3,  oy: 97.9,  r: 17.5, ms: 70 },
  { sx: 198,  sy: 240, sw: 246, sh: 227, ox: 120.4, oy: 129.5, r: 28.0, ms: 70 },
  { sx: 453,  sy: 188, sw: 247, sh: 358, ox: 122.5, oy: 159.1, r: 32.0, ms: 70 },
  { sx: 703,  sy: 127, sw: 300, sh: 460, ox: 154.4, oy: 209.9, r: 43.0, ms: 70 },
  { sx: 1003, sy: 31,  sw: 359, sh: 645, ox: 184.5, oy: 308.3, r: 47.5, ms: 130 },
  { sx: 1362, sy: 113, sw: 280, sh: 516, ox: 140.5, oy: 227.4, r: 46.0, ms: 90 },
  { sx: 1657, sy: 162, sw: 251, sh: 393, ox: 127.8, oy: 183.1, r: 38.5, ms: 90 },
  { sx: 1908, sy: 180, sw: 264, sh: 334, ox: 130.0, oy: 163.7, r: 40.0, ms: 0 },
];

/* Frame 7 holds this long after the run-in, then the overlay fades out. */
export const LEVELUP_HOLD_MS = 1500;
export const LEVELUP_FADE_MS = 500;
export const LEVELUP_RUN_MS = LEVELUP_FRAMES.reduce((t, f) => t + f.ms, 0); /* 590 */
export const LEVELUP_TOTAL_MS = LEVELUP_RUN_MS + LEVELUP_HOLD_MS + LEVELUP_FADE_MS;

/* The largest frame, which is what the on-screen fit is solved against so the
   burst never overflows the viewport at its peak. */
export const LEVELUP_MAX_W = 359;
export const LEVELUP_MAX_H = 645;

/* ═══ LAYOUT CONSTANTS ═══
 * Here rather than in the component because the QA rig
 * (tools/qa/mp/shot-levelup.mjs) crops around the pinned circle to prove the
 * icon does not move, and a rig that RETYPED this fraction would quietly
 * crop 17px off the truth the first time it was tuned — which it did, once.
 * One definition, imported by both. */
export const LEVELUP_PIN_Y_FRAC = 0.40;   /* circle centre, as a fraction of viewport height */
export const LEVELUP_CAPTION_BOX_H = 58;  /* two caption lines plus the plate's padding */
export const LEVELUP_CAPTION_GAP = 6;     /* art to caption */

/* How much of the circle the icon fills.  0.78 rather than 1.0: the measured
   radius is the cream void's edge, and an icon drawn out to it would touch the
   blue enamel ring on every side. */
export const LEVELUP_ICON_FILL = 0.78;

/* Frame index at a given elapsed time; clamps to the last frame, which holds. */
export function levelUpFrameAt(ms) {
  let t = 0;
  for (let i = 0; i < LEVELUP_FRAMES.length - 1; i++) {
    t += LEVELUP_FRAMES[i].ms;
    if (ms < t) return i;
  }
  return LEVELUP_FRAMES.length - 1;
}
