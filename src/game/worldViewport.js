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

/* ═══ v2.3.2249: HOW SMALL THE BRO IS ALLOWED TO GET ═══
 * Owner, on the first cut: "the bro is too small."
 *
 * WORLD_ZOOM says how far out to zoom and the zone says how far out it CAN go;
 * neither of them knows how big that leaves the character, and in town -- the
 * deepest map, so the one that can afford the most zoom -- it left him 23 CSS
 * px tall against about 40 before.  At that size his tattoos, cape and outfit
 * stop resolving; the game's own cosmetic scenarios (mp-skinworld,
 * mp-facingside) cannot find the art on him, which is the measurement that
 * turned "looks small" into a number.
 *
 * So this is the third floor, and the only one that is a TASTE decision rather
 * than arithmetic: MIN_SCALE guards a degenerate box, the zone terms guard
 * against void, and this one guards the character.  It is deliberately a
 * separate named constant and not folded into MIN_SCALE, because the next
 * person to tune it should not have to work out which of the two they mean.
 *
 * ═══ v2.3.2256b: THE TABLE BELOW WAS WRONG, TWICE OVER ═══
 * It used to say "very close to 66 * scale" and list 0.50 -> 33 px, and then
 * four lines further down it said 0.50 "draws the bro at ~72 px".  Both were
 * in the same comment and neither was the character: 66 was the QA CROP BOX
 * (tools/qa/mp/harness.mjs's 40x46-ish figure crop, which is roughly twice the
 * figure -- TRAPS #37, measuring the box that defines a drawing instead of the
 * drawing) and 72 was the sprite FRAME, the whole 256px animation cell with its
 * transparent margin above the hat and below the feet, which is what
 * mp-zoomshot printed until v2.3.2256.
 *
 * The real figure is 105.7 world px crown-to-foot -- (feet - crown + 1) x
 * bodyDirScale x LOCAL_SCALE 0.421875 x PLAYER_SIZE_MULT 1.25, published every
 * frame as S._bodyDrawH and measured live at 106.3.  So on a 390x844 phone in
 * a browser tab (band 243, canvas 615):
 *      0.349  ->  37 CSS px   (no floor: what the owner called too small)
 *      0.45   ->  48 CSS px
 *      0.50   ->  53 CSS px   <- FIGURE_SCALE_FLOOR
 *      0.55   ->  58 CSS px
 *      0.667  ->  70 CSS px   (the pre-v2.3.2247 size, everywhere)
 * Only town, worldview and the two 40x40 zones are affected -- the nine combat
 * zones already floor at 0.601 on their own map size, above every candidate
 * here, so this constant cannot change how a fight looks.
 *
 * AND THAT LAST SENTENCE IS THE ONE TO READ BEFORE RETUNING ANYTHING.  In a
 * combat zone the figure's size is set ENTIRELY by the map: a 32x32 zone is
 * 1024 world px and the canvas is ~600 CSS, so the height floor lands at
 * ~0.60 and the viewport is already exactly the whole map.  There is no
 * zoom-out headroom there at all -- the next pixel out is void tray.  Asked in
 * 2026-09 to make the bro 75 DEVICE px (25 CSS) on a Pro Max, the honest answer
 * was that no zone in the game is big enough: town, the deepest map, bottoms
 * out at ~36 CSS px and ember has zero slack.  If that comes up again, the
 * lever is the sprite (PLAYER_SIZE_MULT) or the map size, never this file.
 * CHOSEN ON RENDERED SCREENSHOTS, not by argument.  tools/qa/mp/sweep-zoom.mjs
 * rebuilds the client at each candidate and shoots the same spot in town, so
 * the owner picked this by looking at five real builds side by side rather
 * than from a description of them -- their words, on being shown the first
 * cut: "the bro is too small ... can you actually simulate at different sizes
 * so I don't have to do a bunch of guesswork."
 *
 * 0.45 first, then 0.50 after playing it (v2.3.2250).  0.50 draws the bro at
 * ~53 CSS px (the ~72 this line used to claim was the sprite frame, see above)
 * and still zooms town out ~25% from the pre-v2.3.2247 view; it also
 * closes the town-vs-combat size gap further, since a combat zone floors at
 * 0.601 on its own map size (1.20x apart now, against 1.34x at 0.45 and 1.72x
 * with no floor at all).  Re-run the sweep before moving this number. */
export const FIGURE_SCALE_FLOOR = 0.50;

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
  /* ═══ v2.3.2257: ONE CHARACTER SIZE, IN EVERY ZONE ═══
     Owner: "I want the character to be exactly as large as he is right now in
     the zones on main right now.  Use that size for in town and in the zones."

     He was not the same size in both, and the floor above is why.  A zone's own
     size decides its scale, so on a tall phone a 32x32 combat zone (1024 world
     px against a ~655 CSS canvas) floors at 0.64 while town (1664x1760, far
     more world than the canvas can want) never reaches its own floor at all
     and falls through to FIGURE_SCALE_FLOOR's flat 0.50.  Measured on the
     owner's installed Pro Max: 67.6 CSS px of character in a combat zone,
     52.9 in town -- 28% apart, in the same game, walking through a portal.
     (farm_home, the smallest map at 960x800, is 86.5: 64% bigger than town.)

     So the figure floor stops being a hand-tuned constant and becomes a
     REFERENCE ZONE: whatever scale a standard 32x32 combat zone would resolve
     to on this canvas, every other zone gets at least that.  The nine combat
     zones are unchanged BY CONSTRUCTION -- for them these two terms are
     literally the same arithmetic as their own zone terms above -- which is
     the first half of what the owner asked for.

     Still a floor, so it can only ever zoom IN, and zooming in cannot make
     void: the v2.3.2247 rule above is untouched and still wins wherever a map
     is smaller than the reference (farm_home keeps its 0.82).  That one cannot
     be brought DOWN to the reference without drawing the tray, so farm_home
     stays the odd zone out; nothing can be done about that from here.

     FIGURE_SCALE_FLOOR stays underneath as the short-phone case: below a ~512
     CSS canvas the reference term drops under 0.50 and the flat floor is what
     keeps the character legible, exactly as it was chosen to. */
  const FIGURE_REF_PX = 32 * TILE;   /* the nine combat zones' own map size */
  const _vref = _z && (land ? _z.refViewH : _z.refViewW);
  /* ═══ v2.3.2257: ...EXCEPT THE VISTA, WHICH GETS ITS OLD ONE BACK ═══
     Owner: "For character size in worldview revert to how big the character
     was previously.  He's too small in worldview now."

     He is, and by a number: the World View shrinks the figure on purpose with
     a distance curve (ZONES.worldview.playerScale, near 0.55 -> far 0.03,
     v2.3.859) and v2.3.2247 then multiplied that by a SECOND shrink when the
     one width rule became a per-zone floor.  48x48 tiles is 1536 world px, so
     the World View never reaches its own floor either and lands on the flat
     0.50 -- against 0.735 under the pre-v2.3.2247 rule on this canvas.  His
     figure went from 42.7 CSS px to 29.1: 68% of what it was.

     The revert is the OLD RULE, not a new number: cssW / refViewW, which is
     `Math.round(390 * 1.5)` -- the reference width at the WORLD_ZOOM of the
     day (worldViewport.js at 2deb56a, the commit before v2.3.2247).  Carried
     in zones.js rather than as a literal here, for the reason v2.3.1574 gives
     about this very zone: the depth curve used to be hand-copied in three
     places and they drifted.
     Only the WORLD scale moves.  The perspective curve is untouched, so the
     vista still shrinks him with distance -- that is the effect, and
     mp-wvglass pins it on the container scale, which this does not touch.

     ON THE SAME AXIS THE OLD RULE USED, which is the whole point of restoring
     a rule rather than a number: sideways it was cssH / REF_VIEW_H (480), not
     the width.  Spending the width in landscape gave 844/585 = 1.443 and blew
     the vista up to nearly triple -- the first cut of this did exactly that,
     and only a landscape row in the check table caught it. */
  if (_vref > 0) {
    /* INSTEAD OF the reference floor, not beside it.  The first cut had both
       terms live and let max() pick, which is not a revert: on a tall canvas
       (the band minimised, or sideways) cssH/1024 beats cssW/585 and the vista
       comes out BIGGER than it ever was -- measured 14% over on a Pro Max with
       the dashboard folded.  "As big as he was previously" has an exact answer
       and this is it; the reference floor is for the zones that are supposed to
       match each other, and the vista is explicitly not one of them. */
    scale = Math.max(scale, (land ? cssH : cssW) / _vref);
  } else {
    scale = Math.max(scale, cssW / FIGURE_REF_PX, cssH / FIGURE_REF_PX);
  }
  /* v2.3.2249: ...and never so far out that the character stops reading. */
  scale = Math.max(scale, FIGURE_SCALE_FLOOR);
  return { W: cssW / scale, H: cssH / scale, scale };
}
