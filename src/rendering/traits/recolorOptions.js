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
 * RESOLVED in v2.3.1497 -- every flag is back on.  The hats that made this
 * necessary are held dormant by pendingTraits.js, so nothing reaching players
 * has a head baked into its frame and there is nothing left for a recolor to
 * expose.  The file stays because the coupling is real and will matter again:
 * if those traits are ever released before they are re-cut against a flat-key
 * head, `skin`, `hair`, `beard` and `hat` have to come back off with them.
 *
 * Not the same thing as the `solid` gate in hatColorCatalog.  That one is
 * unrelated and stays regardless: recolor is a brightness-ratio pass over every
 * opaque pixel, so offering it on a multi-tone hat flattens the accents the
 * flag was written to protect.  It was simply never enforced until v2.3.1493.
 */
export const RECOLOR_ENABLED = {
  skin: true,
  hair: true,
  beard: true,
  hat: true,
  pants: true,
  shoes: true,
  shirt: true,
  /* v2.3.1929: eye colour.  Listed so it has the same one-word off switch
     as every other colour category rather than being the one that cannot be
     turned off.  It paints a masked iris on the REAL head, so if the baked-head
     hats above ever come back it is in the same exposure class as `skin`. */
  eyes: true,
};

/* v2.3.1499: whether hat color is restricted to hats flagged `solid`.
 *
 * OFF, to match what main ships today.  hatColorCatalog's header has always
 * claimed the restriction, but nothing enforced it, so live players have been
 * recoloring multi-tone hats (Top Hat, Sombrero, Fedora, Shark Hat, Bandana,
 * Old School Helmet) for as long as the feature has existed.  Enforcing it here
 * would have quietly removed a control they use today -- a regression dressed
 * as a bug fix, on a merge whose whole point is to change nothing visible.
 *
 * The restriction is still right, and this is the switch for it: turn it on
 * together with PENDING_TRAITS_LIVE.  The generated hats are the ones it really
 * protects -- retinting them repaints the head baked into their frames -- and
 * that is the moment to decide whether the older hats lose the option too. */
export const SOLID_ONLY_HAT_COLOR = false;

/** True if `key`'s color picker should be offered and its recolor applied. */
export function recolorEnabled(key) {
  return RECOLOR_ENABLED[key] !== false;
}
