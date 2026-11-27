/* ═══ v2.3.5345: THE LOOK SYSTEM'S HAND-TUNED TABLES (grand plan step 5.5, card M) ═══
 *
 * The renderers' tables and tuned constants of the `look` system
 * (docs/plan/census/M-tables.md), moved here verbatim with the comment above
 * each: no imports, no logic, imported back by the same names.  A value here
 * is a pixel on screen: change it as you would have in the renderer.
 */

/* ── from entityRenderer.js (v2.3.5345) ── */

/* v2.3.1274: size experiment (owner directive) — characters render 33%
   bigger and world monsters 50% bigger.  Applied at the CONTAINER level
   so the body, above-head bar, and labels scale together and the change
   stays one knob per entity type.  Render-only: world positions, server
   hitboxes, and combat ranges are untouched. */
/* v2.3.1277: owner — "character 25% smaller."  4/3 x 0.75 = 1.0, i.e.
   exactly the pre-experiment size; keep the knob for further tuning.
   ── v2.3.1821: back UP 25% (owner: "Make the character and name plate 25%
   larger.  Needs to be more legible for discerning details about the
   character and the font size").  This is the knob that note kept for
   exactly this, and it is the right one because it is applied at the
   CONTAINER level: the body, the above-head bar and the name plate all grow
   together, so the plate cannot drift off the character it belongs to.
   Render-only — world positions, server hitboxes and combat ranges are
   untouched, so nothing about reach or collision changes with it.
   The plate's TEXT needs one thing more than this scale; see the resolution
   note in _attachNamePill. */
const PLAYER_SIZE_MULT = 1.25;

const TRAIT_RETRY_LATER_MS = [5000, 10000, 20000, 40000, 60000];

/* v2.3.1305: per-direction trait load with bounded retry.  Owner
   two-player report: "lots of layers are missing depending on the
   angle of the player (face missing, clothes missing)".  The old
   loader fired each direction's Assets.load exactly ONCE with a
   swallow-all catch — one flaked request (deploy-day cold CDN edge,
   iPhone Safari dropping a request during the join burst) left
   e.tex[dir] null for the whole session, silently hiding that trait
   for that facing (_placeTrait's visible=false branch).  Two quiet
   retries (2s/6s) recover the transient case; the retry URL appends
   &r=N so a poisoned CDN/browser cache entry — and Pixi's own
   rejected-load cache — can't replay the failure.  A direction that
   still fails WITH a loaded sibling is real evidence (the art set
   exists but this dir flaked deterministically) and lands in the
   crashTrap ring + upload; a direction with NO loaded siblings stays
   quiet (trait sets missing whole dirs were historically normal —
   the old catch comment said "expected for directions that don't
   exist yet"). */
const _TRAIT_RETRY_MS = [2000, 6000];

/* Mirrored views (W/NW/SE) reuse the opposite sheet texture, so they
   render with dir = E/NE/SW + mirror.  This maps that base dir back to
   the on-screen direction so meta can carry an optional override keyed
   by the mirrored side (e.g. crownNudge.west) without disturbing the
   un-mirrored side. */
const MIRROR_SCREEN_DIR = { east: 'west', northeast: 'northwest', southwest: 'southeast' };

/* v2.3.1106: per-direction jog FOOT-PLANT frames (footstep SFX fires when the
   animation lands on one). Module-scope so the jog render path doesn't allocate
   a fresh object + arrays every frame (that per-frame garbage was a likely
   source of periodic GC hitches). resolveDirection only ever yields the 5 base
   dirs; mirror keys kept for clarity. */
const JOG_FOOT_FRAMES = {
  east: [3, 17], west: [3, 17],
  south: [0, 13], north: [0, 11],
  northeast: [9, 21], northwest: [9, 21],
  /* v2.3.1107: SW/SE is a DOUBLE-stride loop (~1656ms, ~2x the other dirs), so
     it has FOUR foot-plants per cycle, not two. [2,17] left the middle two
     silent and bunched the audible pair into a "first two replay". */
  southwest: [2, 8, 13, 18], southeast: [2, 8, 13, 18],
};

/* v2.3.537: per-(pose,dir) body render scale, DERIVED from silhouette
   measurement -- replaces the old hand-tuned bump stack (v2.3.164-171:
   N/S/E *1.10, NE *1.05/*1.0815, etc).  Goal: equal on-screen character
   HEIGHT across all 8 facings so the player doesn't grow/shrink when they
   turn.  Reference = crown-to-hip span (pose-invariant -- it sits above the
   swinging legs and ignores arm-swing, the two things that corrupt a raw
   pixel count or bbox height).  Measured per facing on the real sheets,
   normalized so every facing matches the tallest (southwest = 1.0, the
   larger size the user dialed in as the target).  Stand and jog measured
   separately because the run bends the legs (a deep stride is not a height
   change).  Mirror dirs (W<-E, NW<-NE, SE<-SW) share their base value.
   hit/attack keep the old behavior (no armor on them yet; east-hit
   stays slightly smaller per the original tuning).  v2.3.1053: pickup now
   ships chest/legs/shirt gear sheets (south-only) -- the gear shares the
   body transform, so it scales with the pose's default and needs no entry. */
const BODY_DIR_SCALE = {
  /* v2.3.541: south -3% (1.130->1.096), north -2% (1.150->1.127) per user.
     v2.3.548: NE idle 1.130->0.98 -- the armored figure (tall NE helmet +
     pauldrons) rendered 14% bigger than the others; bare-body scale couldn't
     account for armor height.  Brought NE down to match the armored cluster
     (~240px) so east no longer reads small next to it. */
  /* v2.3.569: derived by tools/derive_armor_scales.py -- normalizes every idle
     to ONE rendered height (~86px = 1.063x the median jog height, the validated
     standing-taller ratio) measured on the ARMORED figure (not the bare body,
     which couldn't see the gear's size variation).  Body WIDTH is handled
     separately in the gear (normalize_idle_width.py, helmet kept native).
     Manual tweaks baked in: south x0.97, north x0.98. */
  /* v2.3.571: NO width manipulation -- idle gear is kept at the ASPECT RATIO it
     was DRAWN at and only scaled UNIFORMLY (diagonally) to a consistent rendered
     height (~86px) by these per-dir factors.  The earlier per-axis width passes
     (bare-body in v2.3.569, jog-bulk in v2.3.570) distorted the drawn art and
     made dirs read too fat/skinny -- dropped.  scale.x == scale.y (STAND_WIDTH
     all 1.0) so the drawn proportions are preserved exactly. */
  /* v2.3.684: south 1.136 -> 1.051 -- the idle popped 8% LARGER than the jog
     when the run stopped.  v2.3.645 neutralized STAND_HEIGHT (0.975) and
     JOG_HEIGHT (1.052) without re-deriving this map; for south those two
     factors were what held idle == jog.  Re-measured on the armored figure:
     stand 188px, jog mean 197.6px -> 197.6/188 = 1.051 makes them equal. */
  /* ═══ v2.3.1826: RE-DERIVED FROM THE FIGURE ON SCREEN ═══
     Owner: "Character's size is inconsistent across different directions
     (east, southwest, etc).  I don't know the best way to fix that.  Also
     without breaking anything else (relative item scale like hats, beards,
     etc)."

     They are right, and the old numbers are why.  Measured through
     bodyFigureProbe — the painted crown-to-boots of the frame actually on
     screen, converted through the live transform — the eight facings came
     out spanning 9.4%:
         north 74.0  east/west 74.6  south 76.5  NE/NW 77.6  SE/SW 81.4
     Southwest is 9.9% taller than north, which is exactly the pair the
     owner named.

     WHY THE OLD MAP DID NOT HOLD IT.  It was derived at v2.3.569 against the
     ARMOURED figure, because at the time gear was drawn at its own size and
     the bare body could not see it.  v2.3.645 ended that — the aligned gear
     is drawn to FIT the body now, and only this uniform scale applies — so
     normalising the armoured silhouette stopped being the right target and
     nobody re-derived it.  South was then hand-patched at v2.3.684 for a
     different reason again (idle/jog parity).

     THE NEW TARGET is 77.2px, the facing-weighted mean of what the eight
     were already doing (east art covers E+W, SW art covers SW+SE, NE art
     covers NE+NW, so those three carry double weight).  Keeping the mean
     fixed means this removes the VARIANCE without making the character
     bigger or smaller overall — a size change is not what was asked for.

     THE BOOTS COME ALONG FOR FREE, and that is the check that the model is
     right rather than a coincidence: the body sprite is anchored at the
     CELL's centre, and the painted figure's centre sits at row ~126 of 256
     in every sheet, so a facing that is drawn taller also puts its feet
     lower — the character sinks and rises as it turns.  Equalising the
     heights predicted a foot-line spread of 1.2px, down from 4.5px, and
     that is what mp-bodysize measures.

     AND THE HATS ARE SAFE, which was the owner's actual worry: every trait
     is placed through _placeTrait with THIS bodyScale, and its anchors are
     frame-relative, so a hat's size and its seat on the head scale in
     lockstep with the body.  mp-bodysize asserts hat-height / body-height
     stays constant across facings rather than trusting that.

     NOT TOUCHING `jog` — see the note below.  Its numbers encode a
     deliberate perceptual correction for east's under-drawn source art, and
     re-deriving it on height alone would undo that. */
  stand: { south: 1.061, east: 1.018, north: 1.083, northeast: 0.998, southwest: 0.933 },
  /* v2.3.539: jog re-derived to match each facing's OWN idle size (the player
     was bigger running than standing).  Crown-to-hip over-scaled the jog
     because a running figure leans + spreads its legs, compressing vertical
     spans.  Re-anchored to rendered FULL height (crown-to-feet, what the eye
     actually reads) against the user's gold standard: SW jog==idle looks
     right, so every facing now hits SW's jog/idle render ratio (0.941). */
  /* north nudged 0.967 -> 1.05 (v2.3.540): its run has the largest leg-spread
     of any facing, so full-height matching shrank the body to fit the spread
     legs.  Hip-span said 1.22 (too big), full-height 0.967 (a bit small) --
     truth sits just above the full-height end. */
  /* east -3% (1.218->1.181, covers west via mirror) v2.3.542 per user. */
  /* east -2% uniform (1.181->1.157) v2.3.584 per user (covers west via mirror). */
  /* v2.3.740: east 1.157 -> 1.25 (owner: east jog armor much smaller than it
     should be).  Diagnosis: the jog-east SOURCE art draws the figure with
     ~18% less body mass than every other direction (mean silhouette 163px vs
     ~200px; it has been that way since the v2.3.5xx sheets — confirmed NOT a
     regression from the v2.3.705 half-cycle remap, whose frames are byte-
     identical art).  Height normalization alone can't fix small body mass on
     a leaning profile figure, so this is a perceptual split: +8% closes most
     of the mass gap at the cost of a small jog>stand height pop when
     stopping.  The DURABLE fix is regenerating jog-east art at proper figure
     scale via the same video pipeline that rebuilt NE (v2.3.708/716). */
  /* ═══ v2.3.1830: THE JOG MAP, RE-DERIVED ON EAST'S ANCHOR ═══
     Owner: "the larger issue is still the inconsistent player scale per
     direction.  I need you to provide a visual preview of the character per
     direction and come up with the best solution to equalize the scale
     between directions."

     v2.3.1826 equalised STAND to 0.1%.  Jogging still spanned 8.1%:
         south 77.39  SE/SW 77.39  E/W 78.54  NE/NW 80.24  north 83.67
     measured as painted crown-to-feet through the live transform, taken as
     the MEDIAN OF THE WHOLE RUN CYCLE rather than one frame — a running
     figure bobs, and a single frame compares eight arbitrary moments.  (The
     first pass sampled 14 moments and had SE and SW, which are the same
     sheet mirrored, disagreeing by 1%.  They are identical here, which is
     the check that the sampling is converged.)

     WHY EAST IS THE ANCHOR AND NOT THE MEAN.  East's 1.25 is not a height
     number — v2.3.740 set it to close an ~18% BODY MASS deficit in the
     jog-east source art, knowingly buying a small jog>stand pop to do it.
     Re-deriving it on height would quietly undo that.  So the target is
     east's own current rendered height, 78.54px, which happens to also be
     the median of the eight: east's entry is therefore UNCHANGED BY
     CONSTRUCTION and everything else moves to meet it.

     WHY NORTH MOVES MOST (1.050 -> 0.986, -6.1%).  v2.3.540 derived north
     on full height as 0.967, judged it "a bit small" against the leg-spread
     of its run, and settled on 1.050 — matched to the idle map OF THAT ERA,
     when north stood at 74.0px.  v2.3.1826 moved north's stand to 77.2px,
     so the target that 1.050 was tuned against no longer exists; this is
     the same principle re-applied to corrected inputs, not a perceptual
     call being overridden.  0.986 also sits 2% ABOVE the 0.967 that was
     called small, so it does not walk back into that.

     RESULT: jog spread 8.1% -> 0.05%, and because the anchor is east's
     height rather than the stand height, every facing now has the SAME
     +1.7% stand->jog pop that v2.3.740 already accepted for east — the pop
     is uniform instead of ranging from -0.8% to +8.4%.
     Traits ride this scale through _placeTrait, so hats and beards follow
     in lockstep; mp-scalesheet asserts that ratio while JOGGING rather than trusting it
     (mp-bodysize only ever covered standing). */
  jog:   { south: 1.015, east: 1.25, north: 0.986, northeast: 1.102, southwest: 1.015 },
};

/* ═══ v2.3.1836: WHERE THE CROWN AND THE FEET ACTUALLY ARE ═══
 *
 * Owner: "the shield block per direction still have mismatched character
 * scales."
 *
 * The block, the swing and the bow shot all replace the walking body with a
 * STAND-IN drawn by effectsRenderer, and entityRenderer sizes and plants it by
 * publishing S._swordBodyH / S._swordFootY.  Both were computed from the
 * constants 221 (feet row) and 33 (crown row), which are SOUTH's rows applied
 * to every facing — and then multiplied by bodyDirScale('stand', dir).
 *
 * That multiplication is the bug, and it is backwards in an interesting way.
 * The dir-scale exists to CANCEL the per-facing height differences in the
 * walking art: the sheets paint the figure 189/197/185/201/214 units tall and
 * the scale brings them all to one rendered height.  Measured:
 *      south 189*1.061   east 197*1.018   north 185*1.083
 *      northeast 201*0.998   southwest 214*0.933      -> 200.5 every time
 * Multiply that same scale by a CONSTANT 188 instead and the cancellation runs
 * the wrong way — it re-introduces the variation it was built to remove:
 *      175.4 .. 203.6, a 16.1% spread.
 * So the block pose was up to 16% bigger in one direction than another, which
 * is exactly what the owner is looking at.  The jog figure used for the
 * moving-block leg composite was worse: 26.8%.
 *
 * These are the MEASURED painted rows of each sheet, in 256-frame units, so
 * (feet - crown + 1) * dirScale is the constant the dir-scale was designed to
 * produce.  The jog rows are the CYCLE MEDIAN — a running figure bobs, so one
 * frame would be one arbitrary moment (the same reason mp-scalesheet medians
 * over the strip).
 *
 * The feet row was wrong per facing too, and independently: 221 is south's,
 * while east ends at 223 and southwest at 234.  A stand-in planted on south's
 * feet row floats or sinks in every other direction.
 */
const BODY_ROWS = {
  stand: {
    south:     { crown: 33, feet: 221 },
    east:      { crown: 27, feet: 223 },
    north:     { crown: 35, feet: 219 },
    northeast: { crown: 27, feet: 227 },
    southwest: { crown: 21, feet: 234 },
  },
  jog: {
    south:     { crown: 32, feet: 232 },
    east:      { crown: 48, feet: 210 },
    north:     { crown: 24, feet: 230 },
    northeast: { crown: 44, feet: 228 },
    southwest: { crown: 32, feet: 232 },
  },
};

/* v2.3.3146: the head traits' size on the gathering body poses -- the head
   there against the head standing (see poseTraitMul in _placeTrait) */
export const MINE_TRAIT_MUL = 1.116;

export const FISH_TRAIT_MUL = 1.07;

/* v2.3.1353: per-hat jog east/west corrections — the owner read the
   headwear comparison sheet row by row and dialed each hat against the
   v2.3.1349 global 0.67: `mul` multiplies the jog-east trait scale
   (west is the mirrored render of the same dir), `dy` nudges the hat
   down in SCREEN pixels (the three wide-brim hats rode high on the
   jogging head).  Applied to the hat AND its hair-clip mask (both flow
   through _placeTrait with the same tune), never to hair/beard — the
   bare-head row was owner-rated 0.
   v2.3.1354 (owner round 2, cumulative): helmet 1.20->1.15 +2px down,
   top-hat +3px, purple +1px, beanie 1.20->1.25 +2px down, shark-hat
   +2px down, wide-brims 10->7px (owner: "up 3px"). */
/* v2.3.1925: five `mul` values below were REBASED, not retuned.  The per-facing
   stand fit (tools/fit-headwear-scale.mjs) moved scale[east] on five of these
   hats, and jog-east renders scale[east] * 0.67 * mul — so leaving `mul` alone
   would have dragged the running hat along with the standing one.  Each was
   divided by exactly the factor its east scale moved by, which holds the jog
   frames pixel-identical to what they render today:
       bandana    x0.947 -> 1.10 / 0.947 = 1.162
       red-cap    x0.908 -> 1.10 / 0.908 = 1.211
       shark-hat  x0.850 -> 1.00 / 0.850 = 1.176
       top-hat    x1.077 -> 1.10 / 1.077 = 1.022
       wizard-hat x1.136 -> 1.40 / 1.136 = 1.232
   These eleven numbers are the owner's own by-eye round from v2.3.1353-1355 and
   the intent is to preserve that judgement exactly, not to re-open it. */
const JOG_EW_HAT_TUNE = {
  'old-school-helmet': { mul: 1.15, dy: 2 },
  'top-hat':           { mul: 1.022, dy: 3 },
  'purple-hat':        { mul: 1.10, dy: 1 },
  'beanie':            { mul: 1.25, dy: 2 },
  'red-cap':           { mul: 1.211, dy: 0 },
  'shark-hat':         { mul: 1.176, dy: 2 },
  'bandana':           { mul: 1.162, dy: 0 },
  'sombrero':          { mul: 1.20, dy: 6 }, /* v2.3.1355: owner round 3, up 1px */
  'bucket-hat':        { mul: 1.20, dy: 6 },
  'fedora':            { mul: 1.20, dy: 6 },
  /* v2.3.1542 (owner: "jog east makes the wizard hat fly off the head").  The
     hat is pinned by its OWN crown pixel, which for the wizard hat is the tip
     of the cone -- meta.anchors.east is the bbox top-centre and crownNudge.east
     is -37, by far the largest lift in the set (next is evil-crown at -30).
     The blanket jog-east 0.67 then shrinks the whole hat ABOUT THAT TIP, so the
     brim -- 47px below the anchor -- rises by a third of that span while the
     tip stays put.  Measured against the standing placement the brim landed
     ~15px high in 256-space, which on a tall pointed hat reads as the hat
     hovering over a bald head.  Every un-dialled hat has this to some degree;
     the wizard hat is the one where the geometry makes it obvious.
     mul 1.40 is the same correction hair got in v2.3.1454 (1.40 x 0.67 = 0.938,
     the MEASURED jog-east/stand-east head ratio, 44px vs 47px), and dy 3 pays
     back the last ~2px, which is the part of the -37 lift that _placeTrait
     applies unscaled while the head around it is 6% smaller.  Verified frame by
     frame against the standing reference over the whole 28-frame cycle. */
  'wizard-hat':        { mul: 1.232, dy: 3 },
};

const STAND_HAT_TUNE = {
  'bucket-hat': { mul: 1.10, dy: 2 },
  'fedora':     { mul: 1.10, dy: 2 },
};

/* v2.3.1389 (owner: "the head doesn't bob with the armor" + "headwear
   needs to move left with the head"): when the fullset knight figure is
   active, the DRAWN head is the jog-<dir>-head.png overlay — rebuilt
   (tools/rebuild_east_head_track.py) to ride the armor's own 25-frame
   bob and carrying the owner-dialed left shift.  body-tops.json still
   describes the BODY sheet's crown (28-frame cadence, unshifted), so
   hats/hair/beards anchored there slid against the visible head.  This
   table is the rebuilt head sheet's measured per-frame crown ([x, y],
   256-space, one entry per ARMOR frame); _crownOverride swaps it in for
   the trait anchors while the fullset figure is on screen. */
const FULLSET_CROWN = {
  /* v2.3.1390: smoothed track (owner: "really jittery") — the raw
     per-frame measurement stepped up to 10px between adjacent frames;
     this glides ≤4px like body-tops itself.
     v2.3.1455: FLOAT precision + the sub-pixel head residual folded in
     (the old even-integer rounding quantized the track to 2px steps),
     so hats/hair glide with the same corrected head the player sees. */
  east: [[134.6, 47.5], [135.6, 46.8], [136.0, 47.2], [135.4, 47.8], [134.6, 49.3], [134.6, 52.3], [135.0, 54.8], [134.9, 57.1], [134.4, 58.2], [133.9, 56.8], [134.0, 54.1], [134.1, 51.4], [134.6, 48.0], [135.6, 46.5], [136.0, 46.5], [135.6, 47.7], [134.5, 49.2], [134.2, 51.4], [134.6, 52.8], [135.0, 55.5], [134.6, 55.4], [134.0, 53.2], [134.0, 50.7], [134.1, 48.7], [134.1, 47.7]],
};

/* v2.3.1455 (owner: "'slivering' effect like lines are slightly cut and
   moving while jogging where the head meets the torso armor"): the head
   sheet's baked per-frame shift quantizes to whole sheet pixels (2px in
   256-space at the 128px sheet) while the armor's smoothed bob moves
   fractionally, so the head-to-collar seam breathed open/closed ±1px
   through the jog cycle — a thin moving cut line at the neck.  This is
   the FRACTIONAL remainder the bake couldn't carry (256-space, one
   entry per armor frame, emitted by tools/rebuild_east_head_track.py);
   _placePickupHead applies it as a sub-pixel y offset so the drawn head
   rides the armor's true smooth track and the seam stays put. */
const FULLSET_HEAD_RES = {
  east: [0.0, -0.67, 0.22, -0.22, -0.67, -0.22, -0.67, -0.44, 0.22, -0.67, -0.89, 0.44, 0.0, 0.0, 0.0, 0.22, 0.67, 0.89, -0.67, 0.0, 0.44, 0.67, 0.67, 0.67, 0.67],
};

/* v2.3.1540: CONSTANT per-direction seat of the head overlay on the fullset,
   in 256-space [dx, dy] (so 2 = one pixel of the 128px head sheet).  Distinct
   from FULLSET_HEAD_RES above, which is a per-FRAME sub-pixel residual keeping
   the head on the armour's smooth bob -- this is a fixed placement correction
   for a direction whose head simply sits wrong on the plate.
   Owner on the 3/4 front view: "southwest/southeast the head looks a little
   receded inside the armor, like the head is a little too far back and
   slightly under."  [-2,-2] is one sheet pixel forward (down-left is the
   facing) and one up, chosen off a 3x3 grid of 0/-1/-2 on both axes: at -1,-1
   the chin clears the collar cleanly, and by two sheet pixels a gap opens at
   the side of the neck.
   dx rides sb.scale.x, which carries the mirror sign, so SOUTHEAST -- drawn as
   a mirrored southwest -- gets the correction mirrored for free, which is what
   the owner asked for by naming both sides.
   Jog-only in practice: _placePickupHead is gated on the fullset for jog, so an
   unarmoured run is untouched.  tools/seal_jog_neck.py mirrors this table (in
   SHEET px) so the neck seam is measured where the head LANDS. */
const FULLSET_HEAD_SEAT = {
  southwest: [-2, -2],
};

/* v2.3.503: layered gear (paper-doll).  Each gear sheet frame is pixel-aligned
   to the body frame, so placement is just copying the body sprite's transform
   (which already carries mirror + bodyScale + bob).  No anchors/angles.  equip
   = { legs, chest, shoulders } item ids.  See docs/archive/root/gear-layer-spec.md. */
/* v2.3.748: 'shirt' is a tinted under-layer (white-base sheet x picked colour);
   it is NOT in the masked-body worn list (skin-tight, no body erase). */
const _GEAR_SLOTS = [['shirt', '_gearShirt'], ['legs', '_gearLegs'], ['chest', '_gearChest'], ['shoulders', '_gearShoulders']];

/* ═══ v2.3.2516: THE ROLL AND THE LOOT BEND TAKE THE CAPE OFF AGAIN ═══
 * Owner (D6, backlog triage 2026-09-14 §5.8): "hide the cape on the dodge pose
 * INCLUDING the loot bend."
 *
 * This reverses the v2.3.2129 paragraph directly above for TWO of its five
 * poses, and the reason is that the paragraph reasoned about the wrong risk.
 * It asked "does the cape still get DRAWN on this pose" and answered yes for
 * every real-body pose, which is true.  What it never asked is whether the
 * cape drawn there is drawn in the right PLACE.
 *
 * It is not, and only on these two.  The cape is a standing still pinned to
 * the frame's crown (_lookupBodyTop, see _placeCape), so it tracks the head
 * and hangs straight down from it.  That is correct for any pose where the
 * figure stays upright -- mine, fish and hit all do, which is why those three
 * stay OFF this list and keep the cape the owner paid for.  dodge and pickup
 * are the two where the torso goes HORIZONTAL: the bro tucks into a roll, or
 * folds down over a loot pile.  The crown follows him down, and a garment that
 * hangs straight down from it then hangs into the ground while the body is
 * bent away underneath -- the owner's words, "a cape hanging in mid-air while
 * the player crouched".
 *
 * `pickup` is a separate pose string from `dodge` (see the pose ladder at
 * ~9885 and the dodge branch at ~10033), so both are named; adding only
 * `dodge` would leave the loot bend exactly as reported. */
const _CAPE_HIDDEN_POSES = { swing: 1, bowshot: 1, chop: 1, cook: 1, fire: 1, dodge: 1, pickup: 1 };

/* v2.3.2025: owner, "angled more with jog" -- doubled.
   v2.3.2125: owner, "angled more aggressively so that the back of his body
   doesn't show behind it" -- 1.5x again (east 0.30 -> 0.45).  Chosen off a
   rendered ladder at 1x / 1.5x / 2x / 2.5x, and the ladder is why it is not
   more: past about 1.5x the rotation stops covering the back and starts
   LIFTING THE HEM off it, because the cape swings about the shoulders -- at
   2.5x the hem is near horizontal and the lower back is barer than it was at
   1x. More angle is not monotonically more cover, which is the thing that is
   not obvious from the ask. */
/* v2.3.2126: owner, of the v2.3.2125 ladder -- "Last cape frame most angled is
   correct". That frame was 2.5x the THEN-current table (east 0.30), i.e. 0.75
   rad, so the table takes those absolute values rather than another multiplier:
   a scale is meaningless once the thing it scales has moved, which is the trap
   the sweep that produced this fell into first (it asked for 2.5x again and
   rendered 1.125 rad -- a rung off a ladder nobody had looked at). */
const _CAPE_JOG_TILT = { east: 0.75, northeast: 0.50, southwest: -0.50, north: 0, south: 0 };

/* Where the cape swings FROM: the shoulders, not the middle of the frame.
   Pivoting about the centre would swing the hood as far as the hem and take
   the hood off the head, which is the thing v2.3.2023b just fixed.

   v2.3.2125: 0.27 -> 0.31, and this is a CONSEQUENCE of v2.3.2122-2124 rather
   than a taste change. The pivot is a fraction of the 256 FRAME, but what it
   needs to sit on is the shoulders of the ART -- and the art just moved 10px
   down inside that frame. Left at 0.27 the swing had crept up from the
   shoulders towards the neck, which is the "hanging off the side of his head"
   half of the report. 10/256 = 0.039, so 0.31 puts it back where it was. */
const _CAPE_PIVOT_Y = 0.33;   /* v2.3.2126: the picked frame's value */

/* v2.3.2127: owner, of the slide ladder -- "Only the furthest right frame
   looked correct", which is -28. My reading of "nudge left" had been that it
   would walk the hood off the head, and the pictures said so plainly at -20
   and -28; the owner looked at the same pictures and chose -28 anyway. The
   rendering was right and the JUDGEMENT was mine to lose: at this angle the
   hood is meant to ride back off the crown, because the figure is leaning into
   the run and the hood is trailing with the rest of the garment.
   The diagonals scale with the tilt (0.50/0.75 of east), so the whole table
   keeps one shape rather than three independent hand-set numbers. */
const _CAPE_JOG_DX = { east: -28, northeast: -19, southwest: 19, north: 0, south: 0 };

/* ═══ v2.3.2189: HOW MUCH OF THAT MOTION THE HOOD TAKES ═══
 * Fractions of the two numbers above, not a second table: the panels' tilt and
 * slide have been tuned by the owner three times (v2.3.2025, 2125, 2126-2127)
 * and re-tuning them must keep moving the whole garment.  See the long note in
 * _placeCape for why a hood cannot take the panels' motion at all.
 *
 * BOTH ARE ZERO, and that is the answer the pictures gave rather than a
 * placeholder: at 0 the hood sits exactly where the STANDING frames put it --
 * on the crown, tracking the head's own bob through the body-tops offset the
 * placement already applies -- and standing is the one pose that has never been
 * reported wrong.  A fraction of the panel motion is the obvious middle ground
 * and it is NOT free, because the pivot is at the shoulders: a partial swing
 * about a point below the neck still TRANSLATES the hood off the head, just
 * less far, so buying a little lean costs a little of the seat that was the
 * bug.  If a lean is ever wanted, the pivot has to move onto the neck first.
 * They exist as named constants, and as bench handles below, so that round is
 * a sweep rather than a rebuild. */
const _CAPE_HOOD_TILT_K = 0;

const _CAPE_HOOD_DX_K = 0;

const BODY_NECK_FRAC = 0.30;

const BODY_WAIST_FRAC = 0.585;

const _REGION_SPR = { head: '_bodyHead', torso: '_bodyTorso', legs: '_bodyLegs' };

/* ── HOW FAR THE BOOTS ARE BELOW THE DISPLAY'S ORIGIN, in container units ──
 * Derived from the numbers that already govern it rather than restated as a
 * constant: BODY_ROWS carries each facing's MEASURED foot row in 256-frame
 * units, the cell centre is 128, and one 256-space unit is
 * bodyDirScale * LOCAL_SCALE container units.
 *
 * The first cut used sheetGeometry's FEET_OFFSET = 24 -- which is a TOUCH
 * anchor, a different measurement of a different thing -- and the boots came
 * out 2.9 world px low on a tall bro.  The real figure is ~41.6 (south stand:
 * (221-128) * 1.061 * 0.421875), and mp-build measured exactly that before
 * this was fixed, which is how it was found.
 *
 * pose/dir come from the display's own animation cache, i.e. the frame that
 * was last DRAWN.  One frame of lag on a correction whose per-facing spread is
 * under a container unit is invisible, and it avoids reordering this call to
 * after the pose is chosen -- which would mean applying the lift after
 * display.y has already been read by the zone-scale lookup. */
const BODY_CELL_MID = 128;

const LOCAL_BODY_SCALE = 0.421875;   /* the local player's LOCAL_SCALE, v2.3.741 */

const NECK_ROWS = {
  stand: { south: 83, east: 82, north: 84, northeast: 79, southwest: 80 },
  jog: { south: 80, east: 92, north: 72, northeast: 82, southwest: 76 },
};

export { PLAYER_SIZE_MULT, TRAIT_RETRY_LATER_MS, _TRAIT_RETRY_MS, MIRROR_SCREEN_DIR, JOG_FOOT_FRAMES, BODY_DIR_SCALE, BODY_ROWS, JOG_EW_HAT_TUNE, STAND_HAT_TUNE, FULLSET_CROWN, FULLSET_HEAD_RES, FULLSET_HEAD_SEAT, _GEAR_SLOTS, _CAPE_HIDDEN_POSES, _CAPE_JOG_TILT, _CAPE_PIVOT_Y, _CAPE_JOG_DX, _CAPE_HOOD_TILT_K, _CAPE_HOOD_DX_K, BODY_NECK_FRAC, BODY_WAIST_FRAC, _REGION_SPR, BODY_CELL_MID, LOCAL_BODY_SCALE, NECK_ROWS };

/* ── from effectsRenderer.js (v2.3.5346) ── */

/* Place the cape and then drop its BACK half under the stand-in body.  The
   re-seat is per frame and guarded: the swing re-orders its weapon every frame
   too (_orderSwingWeapon), and the index it wants moves as sprites are shown
   and hidden, so reading the body's live index is the only thing that stays
   correct through that. */
const _STAND_IN_TRAIT_KEYS = ['capeBack', 'hair', 'beard', 'capeHood', 'capeHoodMask', 'species', 'eyestyle', 'eyewear', 'hat', 'hairMask'];   /* v2.3.2361: + eyewear, over the hood and under the hat -- this order IS the z-order when the set changes layer; v2.3.2643: + eyestyle, just under the eyewear; v2.3.2682: + species, just under the eye style */

export { _STAND_IN_TRAIT_KEYS };
