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
   whole UI was laid out against.
   v2.3.2021: the trailing comment said 488, which was true when WORLD_ZOOM was
   1.25 and has been wrong since it became 1.5.  It is 585.  Left as a derived
   expression rather than a literal precisely so the VALUE cannot rot -- only
   the note about it could, and did. */
export const REF_VIEW_W = Math.round(390 * WORLD_ZOOM);   /* 585 at WORLD_ZOOM 1.5 */

/* ═══ v2.3.2021: A NARROW PHONE ZOOMS OUT INSTEAD OF SEEING LESS ═══
 *
 * v2.3.1768b capped the world so a BIG screen could not see more than a phone.
 * It left the other end alone, and the other end was not neutral: below the
 * reference width the scale sat at a fixed 1/WORLD_ZOOM, so a narrower phone
 * kept the same sprite size and simply got a smaller window onto the world.
 * Measured against a 390pt iPhone, as a share of visible world AREA:
 *
 *     iPhone SE 1st/2nd  320pt    55%
 *     iPhone SE 3rd / 8  375pt    76%
 *     Galaxy S8          360pt    81%
 *     iPhone 13 mini     375pt    93%
 *     iPhone 13/14/15    390pt   100%   <- the reference
 *     iPhone 15 Pro Max  430pt   100%   (bigger screen, same view -- the cap)
 *
 * An SE player was seeing barely half the world an iPhone 13 player saw. In a
 * game where spotting a monster or another player before they spot you is the
 * whole tactical layer, that is a gameplay difference, not a cosmetic one --
 * and it ran the WRONG WAY, penalising the cheaper phone.
 *
 * So the floor goes and the same rule runs in both directions: one slice of
 * world, scaled to whatever box it has. A 320pt phone now draws the world at
 * 0.55 instead of 0.67 and sees all 585 world px.
 *
 * WHY THAT IS NOT JUST TRADING ONE PROBLEM FOR ANOTHER. The sprites do get
 * smaller in CSS px -- but a 320pt screen is also physically narrower than a
 * 390pt one by about the same ratio, so what a thumb actually sees is close to
 * unchanged, while the tactical view becomes equal. Sprites shrinking with the
 * screen is the normal case; the view shrinking with it was the bug.
 *
 * MIN_SCALE exists only to stop a DEGENERATE box -- a desktop window dragged
 * to a sliver, a foldable's cover screen -- from zooming out to nothing. Every
 * real phone clears it with room: the narrowest in circulation is 320pt, which
 * wants 0.547. Nothing at or above 293pt is touched by the floor at all, so it
 * is a backstop and not a second rule fighting the first.
 *
 * STILL WIDTH ONLY. Height follows from the same scale, exactly as before; the
 * warning above about a second height constraint stands unchanged. */
const MIN_SCALE = 0.5;

/** The logical world viewport for a canvas, plus the world->CSS scale.
 *  W/H are WORLD px — what the camera centres and clamps against, and what the
 *  projectile sim measures screen edges in. */
export function worldViewport(canvas) {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const cssW = (canvas ? canvas.width : 0) / dpr;
  const cssH = (canvas ? canvas.height : 0) / dpr;
  /* Every screen gets the SAME slice of world, drawn at whatever size fits.
     Above the reference width that means zooming IN (v2.3.1768b, desktop);
     below it, v2.3.2021, it means zooming OUT. */
  const scale = Math.max(MIN_SCALE, cssW / REF_VIEW_W);
  return { W: cssW / scale, H: cssH / scale, scale };
}
