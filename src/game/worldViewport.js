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
import { WORLD_ZOOM, TILE } from '@/data/constants.js';
import { ZONES } from '@/data/zones.js'; /* v2.3.2247: the per-zone zoom ceiling */

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
/* ═══ v2.3.2247: DERIVED, OR IT QUIETLY BECOMES THE MAIN RULE ═══
   0.5 was chosen against WORLD_ZOOM 1.5, where a 390pt phone sits at 0.667 and
   the narrowest phone in circulation (320pt) wants 0.547 -- comfortably above,
   which is what made it "a backstop and not a second rule fighting the first".
   At WORLD_ZOOM 3 the intended scale is 0.333 and a literal 0.5 would clamp
   EVERY phone, capping the owner's 50% zoom-out at 25% while looking like it
   had worked.  Measured before this was derived: town came out at 0.500, not
   the 0.349 its own map allows.
   0.75/WORLD_ZOOM reproduces 0.5 at 1.5 exactly, so the relationship the note
   above documents is the thing that is preserved, not the number. */
const MIN_SCALE = 0.75 / WORLD_ZOOM;   /* 0.25 at WORLD_ZOOM 3 */

/* ═══ v2.3.2156: LANDSCAPE GETS ITS OWN REFERENCE, ON THE OTHER AXIS ═══
 *
 * Owner: "Landscape would be an optional view.  You can play in portrait or
 * landscape."
 *
 * The width-only rule above is exactly right in portrait and exactly wrong
 * sideways: at 844 CSS px wide it read a landscape phone as "a very wide
 * screen" and zoomed IN (scale 1.44), squeezing the world to 585x96 -- three
 * tiles of height, measured.  A landscape canvas is not a wide portrait, it
 * is a SHORT one, and the scarce axis is the one the rule must protect.
 *
 * So the constraint SWITCHES AXES with the canvas's own shape, and only
 * switches -- it never doubles up.  The header above records that a second,
 * simultaneous height term cost a questline run before it was understood;
 * this is not that.  One constraint is active at a time, selected by
 * orientation, and each branch is the other's mirror.
 *
 * WHERE 480 COMES FROM -- AREA PARITY, because fairness is standing policy
 * (the cap itself, v2.3.1768b; the SE floor removal, v2.3.2021: "spotting a
 * monster or another player before they spot you is the whole tactical
 * layer").  A 390x844 portrait phone sees 585 x ~922 world px = ~539K px^2.
 * With the landscape band at its folded 48px (the v2.3.2118 identity-row
 * footprint, which is what the landscape dashboard rests at), REF_VIEW_H=480
 * gives, measured on real clients:
 *     844x390  ->  canvas 844x356  scale .742  view 1138x480  (+1.3% area)
 *     812x375  ->  canvas 812x341  scale .710  view 1143x480  (+2.4%)
 *     932x430  ->  canvas 932x396  scale .825  view 1130x480  (-1.1%)
 * Same area, different shape: landscape trades vertical spotting range for
 * horizontal, and every landscape player sees the SAME 480 world px of
 * height -- the "same slice for everyone" rule, transposed.
 *
 * UNTIL THE LANDSCAPE BAND SHIPS (the PR after this one), a landscape phone
 * still carries the portrait band (~261px), so the canvas is ~143 tall and
 * this rule bottoms out at MIN_SCALE: view 1688x286.  That is deliberate --
 * an overview rather than a keyhole, ~3x the world the broken layout showed
 * -- and it is BELOW portrait's area, so the interim state gives nobody an
 * advantage.  The QA scenario pins the final numbers, not the interim ones.
 */
/* v2.3.2247: derived, not a literal.  480 was 320*WORLD_ZOOM back when that
   was 1.5, and the area-parity arithmetic above is what picked it -- so when
   the owner asked for 50% more zoom-out, leaving this a literal would have
   zoomed portrait out and left LANDSCAPE exactly where it was.  Kept as the
   expression so the parity survives the next change to WORLD_ZOOM too. */
export const REF_VIEW_H = Math.round(320 * WORLD_ZOOM);   /* 960 at WORLD_ZOOM 3 */

/** The logical world viewport for a canvas, plus the world->CSS scale.
 *  W/H are WORLD px — what the camera centres and clamps against, and what the
 *  projectile sim measures screen edges in. */
export function worldViewport(canvas, zoneId) {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const cssW = (canvas ? canvas.width : 0) / dpr;
  const cssH = (canvas ? canvas.height : 0) / dpr;
  /* Every screen gets the SAME slice of world, drawn at whatever size fits.
     Above the reference width that means zooming IN (v2.3.1768b, desktop);
     below it, v2.3.2021, it means zooming OUT.
     v2.3.2156: the canvas's own shape picks which axis carries the rule --
     see the landscape note above.  The canvas and not the window, so both
     callers (camera and renderer) agree by construction, and the desktop
     shell -- whose canvas is aspect-locked to a PORTRAIT phone -- can never
     wander into the landscape branch however wide the monitor is. */
  const land = cssW > cssH;
  let scale = land
    ? Math.max(MIN_SCALE, cssH / REF_VIEW_H)
    : Math.max(MIN_SCALE, cssW / REF_VIEW_W);
  /* ═══ v2.3.2247: A ZONE MAY REFUSE THE ZOOM ═══
     Owner: "don't zoom out larger than the screen area would show."

     WORLD_ZOOM is a TARGET.  A zone only contains so much world, and past its
     edge zooming out buys nothing to look at: the camera clamp (BroTown,
     v2.3.819) hits its "map smaller than the viewport" branch, centres the map
     and draws empty tray around it.  So the zone floors the scale -- a floor
     and not a clamp-after-the-fact, because both callers derive W/H from this
     one number and the camera must agree with the renderer by construction.

     max() of three floors, and the two zone terms are per AXIS on purpose: a
     zone is not always square (town 1664x1760, farm_home 960x800) and the
     scarce axis has to win.  Whichever is scarcer for THIS canvas decides.

     This also fixes a pre-existing case nobody had reported: at WORLD_ZOOM 1.5
     a 390pt portrait phone already asked for 922px of world height, and
     farm_home is only 800 deep -- so the farm has been drawing void bands
     above and below since it shipped.  It now zooms in far enough to fill.

     Unknown/missing zone id -> no floor, exactly as before this existed; the
     boot frames before S.currentZone is set must not be special-cased into a
     different scale, or the first frame jumps. */
  const _z = zoneId && ZONES[zoneId];
  if (_z) {
    scale = Math.max(scale, cssW / (_z.w * TILE), cssH / (_z.h * TILE));
  }
  return { W: cssW / scale, H: cssH / scale, scale };
}
