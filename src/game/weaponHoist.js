/* ═══ v2.3.4995: A WEAPON DRAWN OUT OF ITS FIGURE'S RUN -- THE RULE ═══
 *
 * The census (docs/specs/crowd-lanes.md "Texture atlases") left each walking
 * player in a crowd at about two batches: the look pieces (body, tee, hair:
 * one program) and the weapon (another).  The weapon sits INSIDE the run of
 * look pieces -- behind the body in four facings, between the tee and the
 * hair in the others -- so it breaks the look batch of its own figure and of
 * the next one.
 *
 * Draw order only matters where two pieces cover the same pixels.  So a
 * weapon can be drawn at the START of its world layer (one carried behind
 * the body) or at its END (one carried in front) whenever nothing drawn
 * between its real place and that new place overlaps it on the screen: the
 * same pixels, exactly, because no pixel it covers is covered by anything it
 * changed places with.  Every look piece of every figure then runs
 * unbroken, and the look atlas (v2.3.4993) fits them in one batch.
 *
 * This file is the part with no Pixi in it (server/test/weapon-layer.test.mjs):
 * boxes are [x0, y0, x1, y1] on the screen.
 *
 * No imports.
 */

/** Two boxes share a pixel (touching edges do not). */
export function boxesHit(a, b) {
  return a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
}

/** Whether `w` overlaps none of `boxes[from .. to)` (null entries are
    nothing drawn). */
export function clearOf(w, boxes, from, to) {
  for (let i = from; i < to; i++) {
    const b = boxes[i];
    if (b && boxesHit(w, b)) return false;
  }
  return true;
}

/**
 * Where a figure's weapon is drawn this frame: 'back' (the start of its
 * layer), 'front' (its end, before the name plates) or null (in place).
 *   w        the weapon's box
 *   behind   true when it is drawn before the body (its own run)
 *   own      the boxes of the figure's own pieces it would change places
 *            with: before it when behind, after it when in front
 *   boxes    every child of the layer in drawing order (this figure's
 *            included, at index i), null where nothing is drawn
 */
export function hoistOf(w, behind, own, boxes, i) {
  if (!w) return null;
  for (let k = 0; k < own.length; k++) if (own[k] && boxesHit(w, own[k])) return null;
  if (behind) return clearOf(w, boxes, 0, i) ? 'back' : null;
  return clearOf(w, boxes, i + 1, boxes.length) ? 'front' : null;
}
