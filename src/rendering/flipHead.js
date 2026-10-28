/* ═══ v2.3.3738: WHERE THE HEAD IS IN THE TUMBLE ═══
 *
 * The owner, on the double jump's flip (the roll's tumble, in the air, since
 * v2.3.3682): "The double jump head is transparent and needs at least the hat
 * rotated to match the head during the flip."
 *
 * The roll sheets (dodge-east / dodge-south, 9 frames of 256) record no head:
 * the head pieces sit on the standing crown (body-tops), and the tumble's
 * crown is a boot.  So they were hidden for the whole roll (_placeTrait), and
 * the armoured body's bake kept the top third of the figure as "the head"
 * (maskedBake.js) -- on the handstand and the tuck the head is at the BOTTOM,
 * so it was erased with the body under the plate: the background showed
 * through it.
 *
 * Measured by tools/qa/flip_head_track.py: the head is the skin the steel
 * plate's own roll frame leaves uncovered, its largest blob; its TURN is the
 * line from the figure's middle to the head against the same line standing.
 * Two south frames are set by hand (marked): the head is hidden there (the
 * tuck seen from above, then the back of the upside-down body), the blob it
 * found was a hand -- the head is the bottom of the figure, upside down.
 *
 * Per sheet: `stand` [cx, cy] the head standing (stand-<dir>); `frames` per
 * roll frame [cx, cy, r, turn] -- the head's centre and radius in the 256
 * frame, and how far it is turned from upright (radians, clockwise on screen,
 * the unmirrored sheet).  r 0: no head to restore in the bake (hidden). */
export const FLIP_HEAD = Object.freeze({
  east: {
    stand: [127.3, 48.3],
    frames: [
      [153.6, 130.3, 17.0, 0.597],
      [169.3, 173.2, 16.8, 1.377],
      [173.2, 187.0, 16.3, 2.119],
      [151.3, 203.2, 13.9, 2.377],
      [151.1, 198.5, 12.8, 2.326],
      [105.4, 206.1, 13.0, -2.628],
      [156.5, 142.9, 17.1, 0.728],
      [141.5, 88.5, 17.1, 0.225],
      [126.6, 56.1, 20.5, 0.011],
    ],
  },
  south: {
    stand: [127.5, 52.9],
    frames: [
      [128.1, 130.2, 20.6, -0.001],
      [122.4, 147.0, 22.3, -0.138],
      [111.0, 188.9, 20.6, -2.735],
      [128.0, 204.0, 0, -2.94],    /* by hand: the tuck from above, the head under it */
      [127.7, 202.0, 0, 3.1416],   /* by hand: the back of the upside-down body, head down */
      [140.3, 201.9, 18.0, 2.701],
      [127.3, 156.7, 21.6, -0.068],
      [133.6, 118.1, 19.5, 0.098],
      [128.1, 55.2, 19.8, -0.006],
    ],
  },
});

/** The head on roll frame `f` of sheet `dir` ('east' | 'south'), or null. */
export function flipHeadAt(dir, f) {
  const t = FLIP_HEAD[dir];
  const r = t && t.frames[f | 0];
  return r ? { x: r[0], y: r[1], r: r[2], turn: r[3], sx: t.stand[0], sy: t.stand[1] } : null;
}
