/* ═══ HOW MUCH WORLD THE PLAYER SEES (v2.3.1768b) ═══
 *
 * Owner: "I'm wondering if the Mobile view can just be blown up proportionally
 * to fit the desktop view.  I know monitors are naturally landscape so it would
 * need black bars on the sides."
 *
 * v2.3.1768 locked the desktop shell to the phone's ASPECT, which fixed the
 * shape and stopped the extra world.  It left the shell small — 420x770 on a
 * 1680x1050 monitor — because the width was still pinned at 25% of the window.
 * Letting the shell fill the monitor's HEIGHT is what "blown up" means, and on
 * its own it would undo the fix: a 573px-wide box at the old fixed zoom shows
 * 716 world px again, half again as much as a phone.
 *
 * So the zoom stops being fixed.  The world viewport is CAPPED, and the box is
 * scaled up to fill whatever room it has: same slice of world, drawn bigger.
 *
 * WIDTH ONLY, and that is not laziness.  The shell carries the phone's aspect
 * by construction (game.css), so once the width is pinned the height follows
 * from the same ratio — adding a height term would be a second constraint that
 * can only ever fight the first one, and on a window that is taller per unit
 * width than a phone (the QA harness's 1000x780, for instance) it would zoom in
 * and quietly shrink every scenario's view of the world.  Measured that: it
 * cost a questline run before the cause was understood.
 *
 * Below the cap NOTHING CHANGES.  A phone is under it, so the scale stays
 * 1/WORLD_ZOOM and every number this returns is the number the two call sites
 * computed inline before this module existed.
 *
 * ONE FUNCTION, TWO CALLERS.  The camera (BroTown's loop) and the renderer
 * (renderFrame) each computed this independently, each with a comment warning
 * that they must agree or "the player drifts off-centre".  Two copies of a rule
 * that must match is a bug waiting its turn.
 */
import { WORLD_ZOOM } from '@/data/constants.js';

/* The design target, in WORLD px: a 390px-wide iPhone Safari viewport times
   WORLD_ZOOM.  390 is the width playViewport.js falls back to and the one the
   whole UI was laid out against; 488 is what a phone measurably shows today
   (verified in tools/qa/mp/mp-desktopbox.mjs). */
export const REF_VIEW_W = Math.round(390 * WORLD_ZOOM);   /* 488 */

/** The logical world viewport for a canvas, plus the world->CSS scale.
 *  W/H are WORLD px — what the camera centres and clamps against, and what the
 *  projectile sim measures screen edges in. */
export function worldViewport(canvas) {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const cssW = (canvas ? canvas.width : 0) / dpr;
  const cssH = (canvas ? canvas.height : 0) / dpr;
  /* The pre-cap behaviour: show WORLD_ZOOM times the CSS box... */
  const base = 1 / WORLD_ZOOM;
  /* ...unless that would show more world than the cap allows, in which case
     zoom IN until it fits. */
  const scale = Math.max(base, cssW / REF_VIEW_W);
  return { W: cssW / scale, H: cssH / scale, scale };
}
