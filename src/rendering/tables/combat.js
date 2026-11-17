/* ═══ v2.3.5345: THE COMBAT SYSTEM'S HAND-TUNED TABLES (grand plan step 5.5, card M) ═══
 *
 * The renderers' tables and tuned constants of the `combat` system
 * (docs/plan/census/M-tables.md), moved here verbatim with the comment above
 * each: no imports, no logic, imported back by the same names.  A value here
 * is a pixel on screen: change it as you would have in the renderer.
 */

/* ── from entityRenderer.js (v2.3.5345) ── */

/* v2.3.1821b: how far the idle SOUTH greatsword tilts off the face, in
   radians about the grip.  Negative because the south sheet is mirrored (see
   the note at the assignment); ~10 degrees, which is the "smidge" the owner
   asked for rather than a re-pose. */
/* v2.3.1839: -0.18 -> -0.60.  Owner, on the second look: "South idle the
   sword is in front of the characters face.  Angle south sword just a bit so
   it's not over the face."  Chosen from a SWEEP photographed in game
   (mp-southsword, BT_TILT_SWEEP) rather than derived: the sign is the trap
   this file already warns about, and the sweep settles which way is which —
   negative swings the tip LEFT clear of the head, positive drags it down
   across the chest.  At -0.18 the blade ran straight up over the face; -0.45
   only grazed clear; -0.60 clears the head box with the whole segment below
   it, and still reads as a carried sword rather than a held-out one. */
const SOUTH_IDLE_TILT = -0.60;

/* v2.3.2925: display px the carried greatsword shifts right while its grip
   hole is on, so the grip runs under the middle of the hand (see the snap block
   in _updatePlayer).  Keyed pose-facingIdx; each one picked by sweeping it
   in-game.  jog S: the grip slanted out of the fist.  idle S / SE (owner:
   "fingers around the grip"): the grip hung mostly left of the fingers.
   window.__btGripNudge = { 'stand-2': 3, ... } overrides per key. */
const GRIP_NUDGE_X = { 'jog-2': 2, 'stand-2': 4, 'stand-1': 2 };

/* ═══ v2.3.2911: THE FIST GOES OVER THE HANDLE ═══
 * Owner: "East, Southwest, northeast the characters hand should be over the
 * handle."  Measured before changing anything (a red dot drawn at the grip
 * anchor): the anchor WAS on the hand at all three -- the fault was layering.
 * At E and NE the carried greatsword is drawn above the body, so the handle
 * covered the fist whole; at SW it was drawn behind (v2.3.2516), so the arm
 * swallowed the handle and only the crossguard showed, beside the hand.
 *
 * The fix is a HOLE, not a stamp: the blade is inverse-masked by a small
 * circle at the grip, so whatever the character has at the hand -- skin, a
 * sleeve, a gauntlet, a recolour -- shows through on top of the handle, with
 * the handle visible either side of the fist.  The v2.3.185 hand-cap did this
 * by cloning BODY pixels, which is why it had to be switched off under a
 * shirt (v2.3.749) and so never ran for most players.
 *
 * SW: the carried pose comes back in front for this -- the blade hangs away
 * from the body there, so the fist is the only overlap.  The SWING keeps the
 * v2.3.2516 behind-the-body order (swingActive is excluded; the swing's own
 * z-order lives in effectsRenderer).  Greatsword only: its per-facing art is
 * the one this was measured on. */
/* v2.3.2925: + south (2).  Owner: "you can make it look like the players hand
   is over the sword handle jogging south.  Right now it just shows the
   floating handle with the hand behind it." */
/* v2.3.2925: + southeast (1), standing only (see gripHoleWanted).  Owner:
   "Southeast fingers around the grip (slight strip showing between fingers." */
const GRIP_HOLE_FACINGS = { 0: true, 1: true, 2: true, 3: true, 7: true };

const GRIP_HOLE_R = 4.2;   /* display px -- about the fist; window.__btGripHoleR tunes it */

/* ═══ v2.3.2925: SOUTH GETS A FIST-SIZED HOLE ═══
   Owner: "The fist during jog south actually punches through the handle."
   4.2 display px is ~5 sheet px of radius at the south jog's 0.42 body scale
   -- a hole ~10 px across round a fist ~5-6 px across -- so the cut showed a
   ring of gap round the fist, a fist punched THROUGH the handle rather than
   wrapped round it.  2.6 is the fist's own radius (~3 sheet px), still wider
   than the handle, so the fist reads across it.  The other three facings keep
   the size the owner signed off on at v2.3.2911. */
const GRIP_HOLE_R_BY_FACING = { 2: 2.6 };

const SWING_FULL_ARC = Math.PI * 0.85 * 0.70;   // ~107° visual sweep

const REST_ANG = {
  sword: -Math.PI / 4,
  greatsword: -Math.PI / 4,
  bow: 0,
  staff: -Math.PI / 2,
};

/* ═══ v2.3.1785: the raised shield gets an arm ═══
 * See blockArm.js for why this is cut from the bow art rather than masked out
 * of the standing body (owner: "There is no outstretched arm the shield orbits
 * the body").  Returns the world-space point the shield should be held at, or
 * null when there is no arm for this facing — in which case the caller keeps
 * the old free-floating placement, which is what every north facing uses.
 *
 * The bow art is authored at a different size from the walking body, so the
 * arm is scaled by the same ratio the bow stand-in uses (drawn body height
 * over the bow sheet's 188px figure) and then pinned by its SHOULDER to the
 * body's shoulder.  Pinning by the shoulder rather than by the frame corner is
 * what keeps it attached when the figure's per-facing scale changes.
 */
const BLOCK_ARM_SHOULDER = {
  /* Where the body's shoulder sits, in display-local px, per rendered facing.
     Only the facings with an arm appear — south has none (see blockArm.js). */
  east:      [7, -12],
  west:      [-7, -12],
  southeast: [6, -12],
  southwest: [-6, -12],
};

/* ═══ v2.3.1882: JUST BELOW THE HEAD, ON THE CAMERA'S RIGHT ═══
 * Owner: "The south block sword needs its position to move.  It should be
 * just below the head on the right side of the body (right side from camera
 * perspective)."
 *
 * Was { x: -11, y: -34 }, which put the grip at screen LEFT and at HEAD
 * height — above the shoulders, clear of the body, with the blade sweeping
 * further left again.  Nothing was holding it, and that is what it looked
 * like: a sword hanging in the air beside his ear.
 *
 * The new numbers are read off the figure rather than guessed, via
 * blockGeomProbe (pixiRenderer), which reports the body in THIS space —
 * display-local, the same units this constant is written in.  For the south
 * stand at the time of writing: crown y -42.5, shoulders y -15.7, feet y
 * 41.6, torso x -13.9..+13.9, and the shield a 72px disc centred (4.2, 15.4),
 * i.e. spanning y -20.6..+51.4.  So:
 *   x +17  — just outside the right ribs (13.9), so it reads as beside him
 *            rather than painted on his chest.  POSITIVE is the camera's
 *            right, which is the player's own left hand: the off hand, which
 *            is the one not carrying the shield.
 *   y -13  — a couple of units below the shoulder line at -15.7, which is
 *            "just below the head" stated as a number.
 * That lands the grip inside the shield's top-right quadrant, so the disc
 * cuts the hilt and the blade runs out past its edge — the occlusion the
 * owner asked for at v2.3.1871 and the reason this sprite is parked directly
 * beneath the shield in the child list. */
const SOUTH_BLOCK_OFFHAND = { x: 17, y: -13 };

/* Per-type, because the two kinds of art hang from the grip in opposite
 * directions.  The posed greatsword and bow are drawn hilt-high with the
 * blade falling away, so the default puts the grip up by the shoulder and the
 * blade runs down into the shield.  A staff is AIMED (its icon is neutral)
 * and stands head-up out of the fist, so the same grip drove its butt end
 * straight across the face.  Dropped and pushed out, it rises clear of the
 * head and its lower end tucks behind the shield's top edge instead. */
const SOUTH_BLOCK_OFFHAND_BY_TYPE = {
  /* v2.3.1882: mirrored with the default (x -25 -> +25).  Its own offset from
     the grip is unchanged — it still stands further out and lower than a
     blade does, because it is AIMED and rises head-up out of the fist rather
     than hanging from a hilt. */
  staff: { x: 25, y: -20, px: 40 },
};

export { SOUTH_IDLE_TILT, GRIP_NUDGE_X, GRIP_HOLE_FACINGS, GRIP_HOLE_R, GRIP_HOLE_R_BY_FACING, SWING_FULL_ARC, REST_ANG, BLOCK_ARM_SHOULDER, SOUTH_BLOCK_OFFHAND, SOUTH_BLOCK_OFFHAND_BY_TYPE };
