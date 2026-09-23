/* ═══ v2.3.2644: WHICH EARS ARE VISIBLE FROM A GIVEN FACING ═══
 *
 * Found by review, not by reasoning. tools/ears/ear-contact-sheet.mjs drew the
 * proposed ear on both sides of the head in every frame, and the PROFILE views
 * came back wrong in a way no measurement would have caught: the rear ear is
 * correct, and the front one lands on the character's nose and mouth. An ear
 * belongs where an ear is, and in profile the near one is behind the face.
 *
 * So the rule is per facing:
 *   'both'  front, back and the 3/4 views -- both ears sit clear of the face.
 *           Checked on stand-south and stand-southwest: correct.
 *   'rear'  pure profile -- draw only the ear away from the direction of view.
 *
 * MIRRORED FACINGS NEED NO ENTRY. The renderer draws west from the east sheet
 * flipped (MIRROR_SCREEN_DIR in entityRenderer.js), and an ear baked into the
 * east sheet flips with it -- so 'rear' authored once for east is automatically
 * rear for west. Adding a 'west' row here would be a second source of truth for
 * a facing that has no sheet of its own.
 *
 * WHO READS THIS TODAY: tools/ears/ear-contact-sheet.mjs, and nothing in the
 * renderer yet -- the painter does not exist until the 33 unlandmarked sheets
 * have an anchor (docs/specs/SPECIES-PLAN.md). That is stated because an
 * exported placement rule with no runtime consumer is EXACTLY the shape of
 * traitCategories.js, which advertises 'attachAt: head.eyes' to nobody and
 * cost this project a wrong cost estimate (TRAPS §96). The difference is that
 * this file has a consumer that runs, and the review sheets in the PR were
 * drawn through it. If you are reading it and the painter still does not
 * import it, treat that as the work being unfinished, not as a registry to
 * fill in.
 *
 * WHICH SIDE IS REAR: the source art for `east` faces RIGHT (verified on the
 * contact sheet -- the nose and the single visible eye are on the high-x side),
 * so the rear ear is the LOW-x one. That is the whole reason this file states a
 * side rather than letting the painter infer one from the facing name.
 */

/** 'both' | 'rear' — how many ears a base direction shows. */
export function earSidesFor(dir) {
  return dir === 'east' ? 'rear' : 'both';
}

/** For a 'rear' facing, which end of the head box carries the ear.
 *  'l' = the low-x side, which on the east sheets is the back of the skull. */
export function rearSideFor(dir) {
  return dir === 'east' ? 'l' : null;
}

/** Convenience: the sides to paint, as a list, for a base direction. */
export function earSideList(dir) {
  return earSidesFor(dir) === 'rear' ? [rearSideFor(dir)] : ['l', 'r'];
}
