/* ═══ v2.3.5239 (card O; the gatekeeper's sitting 23): HOW A SILHOUETTE CLIPS ═══
 * hairClip.js asks this for each silhouette.  The stencil, where it is
 * installed and not switched off (`?alphaclip`), with the silhouette drawn
 * into it by its own program: a picture by the clip's (`batch-clip`, or
 * `batch-clip-alpha` for a monster's), colour numbers by the palette's twin
 * (paletteTex.js).  When the clip's own programs fail their self-test at the
 * door (`selfOff`), a PICTURE goes to the alpha mask, as it was -- but a
 * silhouette of COLOUR NUMBERS (p256.js: the hats' and hoods' hair masks)
 * stays on the stencil: its program is the palette's, not the clip's, and
 * the alpha mask would read its numbers as alpha x red (a number / 255:
 * nothing kept, the hair gone).  NO IMPORTS: node tests it
 * (server/test/self-test.test.mjs §10). */

/** 'stencil' or 'alpha' for one silhouette: `palette`, its picture is colour numbers. */
export function clipRoute(installed, alphaSwitch, selfOff, palette) {
  if (!installed || alphaSwitch) return 'alpha';
  if (selfOff && !palette) return 'alpha';
  return 'stencil';
}
