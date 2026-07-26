/* v2.3.1497: the traits from the 2026-07-26 sheet run, held back from players.
 *
 * Owner directive: the work is finished enough to MERGE but not to SHIP -- the
 * hats still carry the head they were drawn on (see recolorOptions.js), and
 * that is not something to hand to players yet.  Everything else on the branch
 * should go live.
 *
 * So the art, the metadata and the catalog entries all land on main; the two
 * catalogs simply do not EXPORT these ids while the switch below is off.
 * Filtering at the export is what makes the dormancy total rather than
 * cosmetic, because every consumer reads the exported array and nothing reads
 * the sprite folders directly:
 *
 *   - the Hats and Hair pickers list the catalog          -> entries absent
 *   - RANDOMIZE rolls the catalog                          -> cannot pick one
 *   - traitThumbs builds thumbnails from the catalog       -> none built
 *   - preloadTraits() loads catalog x 5 directions on the
 *     startup gate                                         -> nothing loaded
 *
 * That last one is the point worth keeping: a trait frame is a fixed 256x256,
 * so these 34 entries are ~42MB of texture on a gate that already troubles
 * iPhones.  Dormant means the build is not merely quiet about them, it never
 * pays for them.
 *
 * A stored selection naming one of these falls back to 'none' -- the catalogs
 * validate saved ids against what they export (v2.3.1495), so nobody ends up
 * wearing something the picker cannot show.
 *
 * TO SHIP THEM: set PENDING_TRAITS_LIVE to true. Nothing else. The intended
 * order is to re-cut the hats first, from sheets whose head has been painted a
 * flat key color, and to turn the recolor options in recolorOptions.js back on
 * at the same time -- the two are the same underlying problem.
 */
export const PENDING_TRAITS_LIVE = false;

/* Exactly the ids this run added, against what main already had. Crown is NOT
   here: it shipped in v2.3.1483 and stays live. */
export const PENDING_HEADWEAR = [
  'wizard-hat', 'mickey-ears', 'evil-crown', 'barbarian-helmet', 'army-helmet',
  'axe-head', 'golden-bucket', 'arabian-robe', 'headphones', 'devil-horns',
  'cat-ears', 'new-idea', 'bucket-hat-2', 'bandana-2', 'asian-hat', 'fez-hat',
  'russian-hat', 'cowboy-hat', 'folded-brim', 'gray-hat', 'safety-helmet',
  'naruto-headband', 'cowboy-hat-2', 'chinese-hat', 'spartan-helmet',
  'bandana-blue', 'kermit-hat', 'halo',
];

export const PENDING_HAIR = [
  'split-hair', 'dirty-blonde', 'slick-back-hair', 'afro', 'blonde-hair',
  'flat-top',
];

/** Drop the held-back entries from a catalog, unless they are live. */
export function withoutPending(catalog, pendingIds) {
  if (PENDING_TRAITS_LIVE) return catalog;
  return catalog.filter(e => pendingIds.indexOf(e.id) < 0);
}
