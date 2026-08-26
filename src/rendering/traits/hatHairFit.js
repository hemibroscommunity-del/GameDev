/* ═══ v2.3.1959: THE HAIR-DEPENDENT HALF OF A HAT'S PLACEMENT ═══
 *
 * Two of a hat's placement adjustments cannot live in its meta.json, because
 * they depend on the HAIR worn under it, which the meta cannot know:
 *
 *   dy256 — the float lift (v2.3.1561).  A `floatsAboveHair` hat is not worn,
 *           it hovers, so its clearance is measured against the hair actually
 *           on the head rather than pinned to the bare crown.
 *   mulX  — the band refit (v2.3.1943).  A `band: true` hat encircles the head,
 *           so on big hair it has to grow horizontally to reach around it.
 *
 * Both were added directly at the hat's own placement call, once in the world
 * renderer and once in the portrait — and both times the HAIR MASK that a
 * `clipsHair` hat clips the hair to was left placing itself without them.  The
 * mask is supposed to land exactly where the hat lands; a mask that is short
 * of the lift or narrower than the band cuts the hair to the wrong shape, and
 * the symptom reads as broken ART (hair sheared off in mid-air, or bulging out
 * the sides of a band) rather than as broken placement, which is the kind of
 * bug that gets chased in the wrong file for a day.
 *
 * ── WHY THIS IS A MODULE AND NOT TWO MORE LINES AT EACH CALL SITE ──
 * Because the two adjustments arrived a version apart and BOTH missed the mask
 * the same way.  A third one added at the call sites would miss it a third
 * time.  Stated once, in one function, the hat placement and the mask
 * placement ask the same question and cannot get different answers — adding
 * the next hair-dependent adjustment lands on both in a single edit.
 *
 * ── WHY IT IS PURE (metas in, numbers out) ──
 * The two renderers hold their trait art in completely different caches (Pixi
 * textures keyed by direction vs. a promise map of <img> elements), so a
 * shared function that looked its own metas up could not serve both.  Passing
 * the metas in also makes this the one piece of the placement that a plain
 * `node` probe can exercise: the world renderer imports pixi.js, which touches
 * `document` at import time and cannot be loaded outside a browser (measured
 * — `Assets.init` throws `document is not defined`).  See
 * tools/dev/check-hairmask-parity.mjs.
 *
 * NOTE ON UNREACHABILITY (measured 2026-08-26, at the time of writing): no
 * shipped combination hits either mismatch.  `halo` is the only
 * `floatsAboveHair` hat and it has neither `clipsHair` nor a hairmask/ folder;
 * `bandana-2` / `bandana-blue` / `naruto-headband` are the only `band: true`
 * hats and all three declare `clipsHair: false`.  The fix is a trap removal,
 * not a visible repair — turning `clipsHair` on for a band, or giving a
 * floating hat a mask, is a one-line content change that would otherwise
 * silently produce a wrong clip.
 */
import { bandFit } from './bandFit.js';

/* v2.3.1561, moved here v2.3.1959 (owner: "make the halo appear higher above
   the player's head — it looks like it's almost laying flat on the hair").

   Every other hat is WORN: its crownNudge pins it a fixed distance from the
   bare crown, which is right because a hat sits on the skull and the hair
   tucks under it.  A halo is the one piece that is not worn — it floats —
   and a fixed crown offset cannot float, because the hair between the crown
   and the halo varies by 18px across the set (measured: slick-back tops out
   5px above the crown, the afro 23px).  The halo's authored placement put
   its underside 3px above the BARE crown, so on anything but the flattest
   hair it was inside the hair; on the afro it was 14px inside it.

   So a trait with `floatsAboveHair` in its meta gets an extra lift computed
   against the hair actually being worn: park its underside at least
   FLOAT_BASE above the bare crown AND at least FLOAT_GAP above the worn
   hair's top, whichever is higher.  The lift is only ever upward (never a
   drop), and a hat without the flag is untouched — this cannot move the
   other 38 hats.

   Both numbers are 256-space, like everything else in trait meta, so they
   scale with the body the same way crownNudge does. */
const FLOAT_BASE = 12;   /* clearance over a bare scalp */
const FLOAT_GAP = 5;     /* clearance over the top of the worn hair */

/** The upward lift (256-space, negative = up; 0 when the hat does not float)
 *  for `hatMeta` worn over the hair described by `hairMeta` (null = bare head).
 *  `screenDir` lets a meta override a mirrored side independently and falls
 *  back to `dir`, exactly as the renderers' own nudge lookups do. */
export function floatAboveHairLift(hatMeta, hairMeta, pose, dir, screenDir) {
  if (!(hatMeta && hatMeta.floatsAboveHair)) return 0;
  const sd = screenDir || dir;
  const pick = (o) => o && (o[sd] != null ? o[sd] : o[dir]);
  const topOf = (m) => {
    /* anchors are the art's own bbox top-centre, so crownNudge Y IS the
       trait's top edge relative to the body crown (negative = above). */
    const cn = pick(m.crownNudge) || [0, 0];
    const pn = pick(m.poseNudge && m.poseNudge[pose]) || [0, 0];
    return cn[1] + pn[1];
  };
  const bbox = pick(hatMeta.bboxes) || null;
  const bottom = topOf(hatMeta) + ((bbox && bbox[3]) || 0);
  /* Bare head reads as hairTop 0 (the crown itself). */
  const hairTop = hairMeta ? topOf(hairMeta) : 0;
  const target = Math.min(-FLOAT_BASE, hairTop - FLOAT_GAP);
  return Math.min(0, target - bottom);
}

/** Every hair-dependent adjustment this hat gets, as one object:
 *    { dy256, mulX }  —  0 / 1 when nothing applies.
 *  Whatever places the HAT and whatever places its HAIR MASK must both apply
 *  the result of ONE call to this, or the clip cuts a silhouette the hat is
 *  not standing in. */
export function hatHairFit(hatId, hatMeta, hairId, hairMeta, pose, dir, screenDir) {
  return {
    dy256: floatAboveHairLift(hatMeta, hairMeta, pose, dir, screenDir),
    mulX: bandFit(hatId, hairId, dir),
  };
}
