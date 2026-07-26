/* v2.3.1494: which recolor options are live.
 *
 * Owner directive, 2026-07-26: "disable the skin tone for now too. The one
 * thing you can allow color changing for is shirt color."
 *
 * WHY, so this is not mistaken for a design choice and quietly reverted:
 * the generated headwear batch (v2.3.1488+) came back from the generator as
 * REDRAWN sheets, and every one of those hat frames still contains the head it
 * was drawn on.  Normally that head hides under the real one exactly, which is
 * why the hats look right.  Anything that changes the head underneath breaks
 * the alignment and exposes the passenger as a second head:
 *
 *   - skin tone   recolors the real head; the baked one stays the base tone
 *   - hat color   recolors the hat frame INCLUDING the head baked into it
 *   - hair/beard  color sits in the same region and reads as part of the mess
 *
 * The shirt is nowhere near the head, so it is unaffected and stays on.
 *
 * This is a stopgap.  The real fix is to re-cut the hats from sheets whose head
 * has been painted a flat key color, at which point every flag here goes back
 * to true and the pickers return with nothing to break.  Flip them here -- the
 * pickers and the renderer both read this, so one edit restores an option
 * completely.
 */
export const RECOLOR_ENABLED = {
  skin: false,
  hair: false,
  beard: false,
  hat: false,
  pants: false,
  shoes: false,
  shirt: true,
};

/** True if `key`'s color picker should be offered and its recolor applied. */
export function recolorEnabled(key) {
  return RECOLOR_ENABLED[key] !== false;
}
