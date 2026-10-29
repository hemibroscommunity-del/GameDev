import React from 'react';
import { TARGET_PERIMETER_PX } from '@/data/index.js';
import { toggleShield, shieldButtonLive } from '@/game/shieldToggle.js';
import { Skin, BlockFace, pressOn, pressOff, useReadyFlash } from './controlSkin.jsx'; /* v2.3.3018: the owner's mockup; v2.3.3522: the owner's shield on Block */

/* ═══ v2.3.2242: THE SHIELD BUTTON ═══
 *
 * Owner: "It'll be its own shield button that appears below the right button
 * during combat. Tapping it once holds the shield, tapping it again
 * disengages it."
 *
 * It replaces three controls at once: the double-tap-and-hold on the right
 * stick (BroTown rS), the orbiting BlockRing glyph, and LockOnActions' hold-
 * to-block button.  All three were HOLDS -- the shield lived exactly as long
 * as a finger did -- and all three were gestures nobody could see.  A toggle
 * on a labelled button is discoverable, survives a thumb moving to the
 * attack button, and matches the desktop Q key, which has been a toggle
 * since v2.3.1726.
 *
 * WHERE: v2.3.2562 (owner, after playing it) put it at the DIAGONAL BOTTOM-LEFT
 * of the attack disc, alone on that side -- see blockAnchor below.  Before that
 * v2.3.2472 (decision D9) had it level with the disc's centre at the foot of a
 * shared column, and before that it was centred directly under the disc, in the
 * 70px band between it and the dashboard.  That original band placement is what
 * put it under the thumb that presses Attack, and what made "a button appearing
 * under the thumb mid-block" the complaint v2.3.2446 answered by deleting it --
 * worth knowing, because v2.3.2562 moves it back DOWN into that band.  It is not
 * the same mistake: the button is off to the LEFT of the disc, not centred under
 * it, so it is not under the attacking thumb's travel.
 *
 * WHEN: shieldButtonLive -- a fight is on or about to be, and a shield is
 * equipped.  Polled at the same 200ms the ability buttons use.
 *
 * Every touch stops the event, exactly as AbilityButtons and the old
 * LockOnActions did: the whole right half of the screen is a touch zone
 * (rZoneRef, z6) and a tap that fell through it would forward a lock-on click
 * to the canvas.
 */
/* v2.3.3522: the button's picture is the owner's painted shield now
   (controlSkin BlockFace) -- it was the world's wood-shield sprite, SHIELD_SPRITE. */
/* How long the shield stays out of reach after the stamina ran it down
   (BroTown's `_shieldCdUntil = now + 2000`), so the cooldown arc can say how
   far through it is. */
const SHIELD_CD_MS = 2000;

/* The disc's geometry, shared with TouchControls (right:50, bottom:+70,
   96/108 wide since v2.3.2242). */
/* ═══ v2.3.3721: THE DISC A LITTLE SMALLER, AND A HAIR HIGHER ═══
 * The owner: "I'm thinking maybe the contextual button should shrink in size
 * a bit and the jump button made larger."  96/108 -> 84/94 (12.5% and 13%
 * smaller), and its bottom edge 70 -> 80 so the larger JUMP button under it
 * (jumpAnchor) keeps 12 px or more above the dashboard band.  The disc's TOP
 * edge comes down (166 -> 164 upright, 178 -> 174 sideways), so Sprint and the
 * right cluster over it, the health-bar ceiling and the coach's band
 * (combatBandTopPx) all move down a few px, never up. */
export const RBTN = { right: 50, bottom: 80, w: 84, wLand: 94, rightUp: 36, bottomUp: 72 };

/* ═══ v2.3.3740: UPRIGHT, THE DISC GOES DOWN AND RIGHT, JUMP TO ITS LEFT ═══
 * The owner, 2026-10-28, on an iPhone the night before the judges: "move the
 * contextual button slightly down and to the right more.  Move the jump
 * button more to the left.  The way the thumb rests on the screen it will
 * result in less accidental taps between jump and the contextual button.
 * Just make sure the change doesn't overlap any buttons there though (some
 * appear only during combat).  This is portrait on mobile".
 * UPRIGHT ONLY: the disc stands 14 px nearer the screen's edge (right 36, was
 * 50) and 8 px lower (72 over the band, was 80), toward where a right thumb
 * rests; sideways and on a computer RBTN.right / RBTN.bottom as before.
 * Not lower: its foot stays 9 px over the doors' Enter button (63 px over the
 * band, from ~120 px in from the edge on a 360 px phone; jumpAnchor's note).
 * Everything that hangs from the disc moves with it (Sprint over it, Special
 * and Whirlwind over Sprint); JUMP leaves the band under it for its LEFT
 * side (jumpAnchor), which moves Shield Bash, TRAP and Block (ctlColumn,
 * blockAnchor).  Read the disc's place through these two, never RBTN.right
 * or RBTN.bottom alone. */
export function discRight(isLandscape) { return isLandscape ? RBTN.right : RBTN.rightUp; }
export function discBottom(isLandscape) { return isLandscape ? RBTN.bottom : RBTN.bottomUp; }

/* v2.3.2472: and the LEFT disc's, for the Special button that now orbits it
   (SpecialButton.jsx).  Same numbers TouchControls has always rendered the
   movement joystick's corner box with -- lifted here so the two cannot drift,
   exactly as RBTN above was. */
export const LBTN = { left: 12, leftLand: 16, bottom: 70, w: 83, wLand: 98 };

/* ═══ v2.3.2472: ONE COLUMN, LEFT OF THE DISC ═══
 *
 * Owner decision D9: "Block left of the disc, abilities stacked above it."
 *
 * Three controls used to place themselves independently -- the shield centred
 * in the band BELOW the disc, Shield Bash in the band to its lower left, and
 * Whirlwind floating above the disc -- each with its own `right` expression and
 * its own `bottom` constant chosen against a different snapshot of the band.
 * They are one column now, so they are computed in one place: three copies of a
 * layout rule drift, and the owner has already paid for that twice
 * (v2.3.2254's button behind the dashboard, v2.3.2327's bash too far away).
 *
 * SLOT 0 is the Block button, vertically level with the disc's CENTRE -- the
 * thumb's resting height, which is the whole point of moving it off the band.
 * Slots 1 and 2 stack upward from it.
 *
 * WHY THE COLUMN HUGS THE DISC RATHER THAN THE MOVEMENT ZONE'S EDGE.  The band
 * available to a control left of the disc is `50vw .. disc-left`, and it is
 * narrow: 49px on a 390 phone, 34px on a 360.  v2.3.2327 resolved that squeeze
 * by clamping the button to `50vw - size`, which let it slide RIGHT, under the
 * disc -- safe only because the button sat in the band BELOW the disc, where
 * an overlap costs nothing.  Level with the disc's centre that same clamp would
 * put a 48px circle over the widest part of the attack button, which is the one
 * overlap that must never happen: the disc is the control you press most, and a
 * sibling with a higher z-index eats every touch in the overlap.
 *
 * So the anchor inverts.  The column's RIGHT edge is pinned 4px left of the
 * disc at every width -- no overlap with the attack button is possible by
 * construction -- and the shortfall on a narrow phone comes out of the movement
 * zone instead: at 390 the column's left edge lands 3px inside 50vw, at 375
 * about 10px.  That costs a 48px patch of *starting area* for the movement
 * joystick, at the extreme right edge of the left half, right next to the
 * attack button -- the part of the movement zone a thumb is least likely to
 * begin a walk in.  It is the cheaper of the two losses, and it is a DEFAULT
 * taken without the owner: if a phone check shows the movement stick catching,
 * the remedy is to shrink `size` here rather than to move the column right.
 * The 44px floor is Apple's minimum touch target; the button shrinks to fit the
 * band before it crosses the line, and only crosses it when even 44 will not
 * fit.
 */
export const CTL_GAP = 4;         /* column <-> disc */
export const CTL_STACK_GAP = 8;   /* between stacked slots */
export const CTL_MIN_SIZE = 44;   /* Apple's touch-target minimum */

/* ═══ v2.3.2542: ONE SLOT MAP, SHARED ═══
 * The map is exported rather than private to each file (AbilityButtons had its
 * own `SLOT_OF`, SpecialButton would have needed a second copy) for the reason
 * ctlColumn itself exists: three files writing three layout rules is what cost
 * the owner v2.3.2254 and v2.3.2327.  `bottomPx` is plain arithmetic on the
 * slot number, so a negative slot needs no special case.
 *
 * ONE NUMBER FROM THAT PASS IS STILL LOAD-BEARING and is why the left cluster
 * below is built the way it is: v2.3.2542 rejected a slot that worked out at
 * ~283px above the dashboard band on a 390px-tall landscape screen, because
 * that puts a combat button "up among the health bars" -- which are drawn on
 * the CANVAS, so no rect can catch it and only the number can. */
/* ═══ v2.3.2562: THE COLUMN IS DOWN TO ONE CONTROL ═══
 *
 * Owner, after playing the merged build and sending a screenshot: "the
 * placement of the buttons isn't ideal.  I'd like the whirlwind and special
 * attack buttons diagonally above the left joystick (directionally above but
 * diagonal to provide enough space between them for not accidentally pressing
 * the other one) and the shield block button to the diagonal bottom left of
 * that right joystick (as a mental separation for combat purpose further away
 * from the other buttons on its own side)."
 *
 * So the D9 column is dismantled, and what is left of it is Shield Bash.
 *   - Whirlwind and Special moved to the LEFT disc -- see leftCluster below.
 *     For Special this UNDOES v2.3.2542, which had just moved it here from the
 *     left ("Move the Special attack button to orbit the RIGHT joystick").
 *     That is the owner's call after playing both, and the v2.3.2472 file that
 *     first put it on the left is the better guide to the hazards now.
 *   - Block moved DOWN, out of slot 0 and into the band below the disc -- see
 *     blockAnchor below.
 *   - BASH IS NOT MENTIONED IN THE ASK, so it does not move: it keeps slot 1
 *     and therefore its exact pixels, which is the whole reason slots are keyed
 *     by control rather than by position in a list.
 *
 * The slot machinery stays for it rather than being flattened into two
 * literals.  ctlColumn still owns the width squeeze against the movement zone
 * and the 44px floor, and that reasoning is not bash-specific -- the next
 * control to want a place beside the disc should inherit it, not re-derive it.
 */
/* ═══ v2.3.2574: BASH COMES DOWN TO SLOT 0 ═══
 *
 * Owner, correcting the v2.3.2562 ask after playing it: "Spec and swirl need to
 * be on the right joystick.  It was put on the left."
 *
 * So Special and Whirlwind cross back to the RIGHT disc and sit above it
 * (rightCluster below).  That is the one thing the column could not survive:
 * slot 1's TOP edge is 194px above the band at 390 and 213 in landscape, and
 * the cluster's upper slot has to live in exactly that air.  Measured, with the
 * cluster's step and rise free to vary:
 *
 *   bash left at slot 1  ->  best achievable clear gap between the upper
 *                            cluster button and Bash is 15px, and only by
 *                            lifting the pair to 282px above the band in
 *                            landscape -- v2.3.2542 rejected 283 as "up among
 *                            the health bars".
 *   bash at slot 0       ->  24px at 390 and 360, 27px sideways, and the
 *                            tallest control drops back under the disc's top.
 *
 * 15px between two 45px circles is the accidental press the owner asked to be
 * rid of, so Bash moves.  DOWN, not away: slot 0 is level with the disc's
 * CENTRE -- the thumb's resting height, 4px off the disc, the closest any
 * button gets to it.  That matters because "bash too far away" is a complaint
 * this repo has already paid for once (v2.3.2327), so the one direction it must
 * not move is further out.
 *
 * WHAT THIS COST, said plainly: slot 0 is where the Element Burst button has
 * been sitting since v2.3.1734 with its own hand-rolled anchor, so Burst had to
 * move instead -- see leftCluster.  The right half holds four safe places (two
 * above the disc, one beside it, one in the band below) and five controls want
 * them; something had to leave.  Burst is the one that is least often on screen
 * (it needs an enchanted weapon AND level 6+, where every other button here
 * turns on moment-to-moment combat state), and its closeness to the disc is a
 * preference its own comment states rather than a complaint anyone has filed. */
/* v2.3.3617: slot 1, over Bash, is TRAP on an upright phone (TrapButton.jsx):
   up while a monster is targeted, which is when Block is up too, and the old
   pop-up at the bottom middle lay under Block's button there */
export const CTL_SLOT = { bash: 0, trap: 1 };

/* ═══ v2.3.2562: BLOCK, ALONE, BELOW AND LEFT OF THE ATTACK DISC ═══
 *
 * "the shield block button to the diagonal bottom left of that right joystick
 * (as a mental separation for combat purpose further away from the other
 * buttons on its own side)".  The DISTANCE is the feature, so it is measured
 * rather than eyeballed: mp-btnlayout asserts the clear gap to Bash.
 *
 * ═══ v2.3.2574: BLOCK DID NOT MOVE, BUT ITS NEIGHBOURS DID ═══
 * This anchor is byte-for-byte what v2.3.2562 shipped.  What changed around it
 * is worth writing down, because the sentence above talks about a distance and
 * that distance is not the same number any more:
 *
 *   to Special / Whirlwind   161 / 136px  ->  122 / 136px  (390, clear edge)
 *   to its nearest neighbour  29px (Burst) ->   30px (Bash)
 *
 * The separation the owner actually asked for -- Block apart from Special and
 * Whirlwind -- still holds with the disc's whole height between them, and it is
 * the disc's height that provides it rather than luck: those two are above the
 * disc's top edge and Block is below its bottom one.
 *
 * Its nearest neighbour is now Shield Bash where it used to be Element Burst,
 * at the same distance to within a pixel, because both occupy ctlColumn slot 0
 * and the two controls simply swapped places (CTL_SLOT, leftCluster).  Bash IS
 * the closer of the two to Block in spirit as well: Block raises the shield and
 * Bash exists only while it is raised, so the thumb that just pressed one is
 * already where the other appears.
 *
 * DOWN is where the room is.  It keeps the column's right edge -- 4px clear of
 * the disc, which is ctlColumn's one inviolable rule (a sibling at z31 lying on
 * the disc eats every touch in the overlap, and the disc is the control pressed
 * most) -- and drops below the disc's BOTTOM edge into the band D9 emptied and
 * v2.3.2542 briefly filled with the Special button.  That is diagonal from the
 * disc on both axes, and it is as far from Bash as this side can put it without
 * taking a second bite out of the movement zone.
 *
 * WHY NOT FURTHER LEFT, which would be the more literal reading of "diagonal".
 * The band available left of the disc is `50vw .. disc-left`: 49px at 390 and
 * 34px at 360.  The column already overhangs 50vw by a few px at narrow widths
 * (see ctlColumn's note, a deliberate default).  Sliding Block further left
 * would take a second, larger bite out of the surface that reads movement
 * drags, to buy separation the vertical drop already provides.
 */
export function blockAnchor(isLandscape) {
  var col = ctlColumn(isLandscape);
  /* v2.3.3740: upright, still diagonal below and left -- of JUMP now, which
     took the disc's lower left (jumpAnchor): its right edge JUMP_BLOCK_AIR
     in from Jump's, BLOCK_JUMP_DROP under Jump's foot, so the two overlap
     side to side by a third of Block and stand 10 px apart up and down.
     It cannot step clear of Jump to the left: on a 360 px phone the
     notification bell (66-102 px from the left, at the band's foot) is
     there.  It lies in the doors' Enter lane, as it always has (a fight's
     button; the Enter button is drawn over it). */
  /* ═══ v2.3.3799: JUMP WENT SOUTH-WEST ON THE RING (jumpAnchor) ═══
     Block stays the disc's diagonal bottom-left (v2.3.2562, the owner's
     "mental separation"), now beside Jump on its left, BLOCK_JUMP_SIDE of
     air: upright at the height it had (BLOCK_JUMP_DROP under Jump's old
     foot), sideways at the height it had (BLOCK_BAND_BOTTOM: half a button
     under Shield Bash, mp-abilslot).  Upright
     on a phone too narrow for that beside the notification bell (66-102 px
     from the left at the band's foot; a 320 px phone), it stands up beside
     Jump instead, under TRAP (ctlColumn), still left of the disc. */
  var jl = jumpAnchor(isLandscape);
  var right = jl.right + jl.size + BLOCK_JUMP_SIDE;
  if (isLandscape) return { size: col.size, right: right, bottomPx: BLOCK_BAND_BOTTOM - col.size - CTL_GAP };
  var vw = (typeof window !== 'undefined' && window.innerWidth) || 390;
  if (vw - right - col.size >= BELL_RIGHT_PX + BLOCK_JUMP_SIDE) {
    return { size: col.size, right: right, bottomPx: JUMP_FOOT_UP - BLOCK_JUMP_DROP - col.size };
  }
  return { size: col.size, right: right, bottomPx: col.bottomPx(CTL_SLOT.trap) - BLOCK_TRAP_DROP - col.size };
}
export const BLOCK_BAND_BOTTOM = 70;
export const BLOCK_JUMP_SIDE = 8;    /* v2.3.3799: Block's edge <-> Jump's, side by side */
export const BLOCK_TRAP_DROP = 10;   /* v2.3.3799: upright on a narrow phone, TRAP's foot <-> Block's top */
export const BELL_RIGHT_PX = 102;   /* v2.3.3799: the bell's right edge from the screen's left, upright (WorldChatFeed) */
export const BLOCK_JUMP_DROP = 10;   /* v2.3.3740: upright, Jump's foot <-> Block's top */

/* ═══ v2.3.2562: THE LEFT CLUSTER -- WHIRLWIND AND SPECIAL ═══
 *
 * "diagonally above the left joystick (directionally above but diagonal to
 * provide enough space between them for not accidentally pressing the other
 * one)".  Two requirements, and the second one is the measurable half.
 *
 * ABOVE: both sit clear of the movement disc's TOP edge (LBTN.bottom + its
 * width), so neither covers the joystick's own circle.
 *
 * DIAGONAL, AND WHY THE TWO STEPS ARE DIFFERENT SIZES.  Special takes the lower
 * slot, Whirlwind the upper -- up and to the RIGHT of it.  The HORIZONTAL step
 * is a full button plus half a button (LCTL_THUMB_FRAC), which means the boxes are fully
 * separated on that axis ALONE: whatever the vertical rise, they cannot touch.
 * That makes the rise free to be smaller than a full button, and it needs to
 * be: a full-button rise on both axes put the upper control ~283px above the
 * band in landscape, which is where v2.3.2542 rejected a slot for being "up
 * among the health bars".  So the rise is a little over half a button -- enough
 * to read as a diagonal, cheap in height.
 *
 * The separation that results is a real number and the owner asked for a real
 * gap, so mp-btnlayout asserts the centre-to-centre distance and the clear edge
 * gap at every width instead of asserting "they do not overlap", which a
 * shoulder-to-shoulder pair would also pass.
 *
 * NO SQUEEZE RULE HERE, unlike ctlColumn.  The cluster's far edge lands ~132px
 * from the screen's left at 360, well inside the 180px half, so there is no
 * narrow-phone band to fight over and no reason to carry ctlColumn's clamp.
 * What IS shared is the 44px floor.
 */
/* ═══ v2.3.2563: THE iOS EDGE GUARD IS A REAL OBSTACLE, NOT JUST A STRIP ═══
 * BroTown.jsx (~8449, v2.3.112) parks an 18px-wide transparent div down the
 * screen's left edge at z40 and preventDefaults every touchstart inside it, so
 * iOS does not read a swipe from the bezel as its back gesture.  It is ABOVE
 * this cluster (z31) and it swallows the touch outright.
 *
 * That never mattered while nothing lived over there.  v2.3.2562 moved the
 * Special button to `LBTN.left` (12), and 12 is INSIDE the guard: the leftmost
 * 6px of a 48px button stopped answering, leaving 42px of reachable width
 * against Apple's 44px minimum.  Found by review, confirmed with real taps --
 * a tap at x=14 did nothing, a tap at x=20 fired.
 *
 * So the cluster starts at the guard's edge rather than the disc's.  Exported
 * and consumed by BroTown's guard too, so the two cannot drift: one number,
 * one place, which is the same rule RBTN and LBTN are here for. */
export const EDGE_GUARD_PX = 18;

export const LCTL_GAP = 10;         /* cluster <-> the movement disc */
/* The owner's "enough space ... not accidentally pressing the other one", as a
   FRACTION of the button rather than a constant.  It was a flat 24px, which is
   half of a 48px portrait button but well under half of the 54px landscape one
   -- so the gap silently got proportionally tighter on the orientation with
   less room, which is backwards.  Half a button at every size instead, and
   mp-abilslot floors it at exactly that so the two cannot drift apart. */
export const LCTL_THUMB_FRAC = 0.5;
/* ═══ v2.3.2574: THE LEFT CLUSTER IS THE ELEMENT BURST BUTTON'S NOW ═══
 *
 * Special and Whirlwind left it for the right disc (CTL_SLOT's note says why),
 * and the Element Burst button -- evicted from the right-hand column by Bash --
 * takes slot 0.  It is a straight swap of occupants, not a new rule.
 *
 * WHY BURST INHERITS THIS MACHINERY RATHER THAN KEEPING ITS OWN ANCHOR.  Before
 * this it computed `right: 50 + discW + 10` and a bottom level with the disc's
 * centre in ElementBurstButton.jsx -- which is ctlColumn slot 0 to within two
 * pixels, arrived at independently.  That is the exact duplication ctlColumn was
 * created to end, and it had already gone wrong without anyone measuring it:
 * Burst's box sat 8px from Shield Bash at 390, 7px at 360 and 12px sideways,
 * the tightest pair of combat buttons in the shipped game and well inside the
 * "not accidentally pressing the other one" the owner is asking for.  Nothing
 * caught it because no test compared those two boxes.  Burst reads its anchor
 * from here now, so the next control to move cannot silently land on it.
 *
 * At 390 that puts Burst 131px clear of Bash instead of 8.  The cost is thumb
 * travel: Burst is across the screen from the disc, against its own comment's
 * wish to be reachable "without crossing the screen".  That is the trade this
 * change makes deliberately and it is the first thing to revisit if the owner
 * finds it awkward -- the remedy would be to shrink the right-hand controls
 * rather than to put two buttons back within 8px of each other. */
/* v2.3.3260: slot 1 is QUICK EAT (QuickEatButton.jsx) -- up and to the
   right of Burst, half a button clear of it by the cluster's own step, for
   the left thumb while the right one keeps attacking. */
export const LCTL_SLOT = { burst: 0, eat: 1 };

export function leftCluster(isLandscape) {
  var size = Math.max(CTL_MIN_SIZE, isLandscape ? 54 : 48);
  var discW = isLandscape ? LBTN.wLand : LBTN.w;
  /* v2.3.2563: never start inside the iOS edge guard -- see EDGE_GUARD_PX. */
  var left0 = Math.max(isLandscape ? LBTN.leftLand : LBTN.left, EDGE_GUARD_PX);
  /* The movement disc's top edge, in the same px-above-the-band units
     everything in this cluster is expressed in. */
  var discTop = LBTN.bottom + discW;
  var rise = Math.round(size * 0.55);
  var step = size + Math.round(size * LCTL_THUMB_FRAC);
  return {
    size: size,
    /* Slot 0 sits at the disc's own left edge; each slot steps RIGHT by a full
       button plus the thumb gap, which is what guarantees the separation. */
    leftPx: function (slot) { return left0 + slot * step; },
    bottomPx: function (slot) { return Math.round(discTop + LCTL_GAP + slot * rise); },
  };
}

/* ═══ v2.3.3006: THE SPRINT BUTTON, RIGHT OF THE MOVEMENT DISC ═══
 *
 * Owner: "a sprint button by the left joystick ... Maybe just to the right of
 * the left joystick" (SprintButton.jsx).  It stood level with the movement
 * disc's centre, LCTL_GAP clear of its right edge, until v2.3.3106.
 *
 * ═══ v2.3.3106: ...AND NOW JUST NORTH OF THE ATTACK DISC ═══
 * Owner: "I think it also makes sense to put the sprint button near the right
 * joystick instead of the left maybe just north of it", and of the clash with
 * Special and Whirlwind (which pop up above the disc in a fight, where Sprint
 * is always on screen): "Above, fights move up".
 *
 * CENTRED OVER THE DISC, RCTL_GAP clear of its top edge -- where the thumb
 * goes when it leaves ATTACK going up.  SPRINT NEVER MOVES: the right cluster
 * (Special, Whirlwind) makes room round it instead, a row higher upright and
 * to its left sideways (rightCluster), and it is laid out the same whether or
 * not Sprint is drawn (slots are keyed by control, never by what is mounted).
 *
 * The same 44px floor and the same 48/54 size as the clusters. */
/* SIDEWAYS IT STEPS LEFT, CLEAR OF THE MINIMAP.  Found by mp-sprint: on a
 * 390px-tall screen the Wheel's minimap (WHEEL_BOX 132 in wheelMinimap.js,
 * flush with the right edge from 46px down) ends 34px above the disc's top,
 * so a button centred over the disc lay under it.  Sideways Sprint's right
 * edge is SPRINT_MAP_CLEAR in from the screen's -- the minimap's width and
 * 8px -- still at the disc's top, up and to the left of it.  (The Special
 * button lay under the minimap there before v2.3.3106 too.) */
export const SPRINT_MAP_CLEAR = 132 + 8;

export function sprintAnchor(isLandscape) {
  var size = Math.max(CTL_MIN_SIZE, isLandscape ? 54 : 48);
  var discW = isLandscape ? RBTN.wLand : RBTN.w;
  var centred = discRight(isLandscape) + Math.round((discW - size) / 2);   /* v2.3.3740: discRight/discBottom */
  return {
    size: size,
    right: isLandscape ? Math.max(centred, SPRINT_MAP_CLEAR) : centred,
    bottomPx: discBottom(isLandscape) + discW + RCTL_GAP,
  };
}

/* ═══ v2.3.3017: JUMP, BENEATH THE ATTACK DISC ═══
 *
 * Owner: "Where should a 'jump' button go?  I'm thinking just make the right
 * joystick button be jump or put it beneath the right joystick", and of the
 * answer (beneath it, not on it: the disc already taps, drags, flicks and
 * harvests), "start working on real jumping" (JumpButton.jsx).
 *
 * CENTRED UNDER THE DISC, one CTL_GAP below its bottom edge -- the band D9
 * emptied, at Block's height.  The thumb slides straight down off ATTACK.
 * Block is in the same band but in ctlColumn, left of the disc: 28 px of clear
 * air between the two at 390 (31 sideways), and the disc's own half-width is
 * what keeps them apart at every width, as the disc's height keeps Block from
 * Special.  It stays above the dashboard band by construction (RBTN.bottom 70,
 * a button at most 54, the gap 4: 12 px to spare at the least), and mp-jump
 * measures the real boxes rather than trusting this arithmetic. */
/* ═══ v2.3.3721: ...AND LARGER -- 48/54 -> 60/64 ═══
 * The owner: "the jump button made larger" (with the disc above it shrunk).
 * Still under the disc, one CTL_GAP below its bottom edge, 16 px over the
 * dashboard band upright and 12 sideways (RBTN.bottom 80).  Centred, it would
 * come within 16 px of Block beside it (the disc's half-width is what kept
 * them apart, and the disc is narrower now), so it stands JUMP_BLOCK_AIR
 * clear of Block instead -- half a 48 px button, the standard mp-abilslot
 * holds the other pairs to -- which leaves it 8 px (upright) or 5 px
 * (sideways) toward the screen's edge of centred: still under the disc, the
 * thumb's slide straight down off it. */
/* ═══ v2.3.3740: UPRIGHT, LEFT OF THE DISC, NOT UNDER IT ═══
 * The owner: "Move the jump button more to the left ... less accidental taps
 * between jump and the contextual button" (RBTN's note).  Under the disc the
 * two had 4 px of air, along the line a resting right thumb lies on.  Now
 * Jump stands JUMP_DISC_AIR (18 px) clear of the disc's LEFT edge, its foot
 * level with the disc's (JUMP_FOOT_UP): 18 px of air between the two boxes
 * and between the two rings (centres 90 px apart, 76 before), side by side
 * across the thumb rather than along it.
 * WHY NOT LEFT ALONG THE BAND'S FOOT, which is the literal reading.  That
 * strip, 23-63 px over the band from about 120 px in from the right edge, is
 * the doors' Enter button's (BroTown, v2.3.3032: "in the free stretch between
 * the bell and the jump button"; mp-wheeldoors fails it on any button), and
 * the old place was already at its edge: Jump could not move left there at
 * all.  So its foot is 9 px over that strip's top, and the controls that
 * lived left of the disc make room: TRAP and Shield Bash stack over Jump
 * (ctlColumn), Block stays diagonal below and left (blockAnchor).
 * Sideways (and on a computer) it is v2.3.3721's place, under the disc. */
export const JUMP_SIZE = { up: 60, land: 64 };
export const JUMP_BLOCK_AIR = 24;
export const JUMP_DISC_AIR = 18;   /* v2.3.3740: upright, the disc's left edge <-> Jump */
export const JUMP_FOOT_UP = 72;    /* v2.3.3740: upright, Jump's foot over the band */
/* ═══ v2.3.3799: SOUTH-WEST ON THE DISC'S RING ═══
 * The owner, 2026-10-29: "I do want a change to the placement on the jump
 * button. It should be positioned orbiting southwest of the large contextual
 * button."  Jump stands on the disc's ring -- its centre the disc's radius,
 * JUMP_RING_GAP and its own radius from the disc's centre, the 10 px of air
 * Sprint keeps over the disc -- down and to the left:
 *   UPRIGHT at 45 degrees (58 px left and 58 px down of the disc's centre),
 *     its foot 26 px over the band at every width.  That is the doors' Enter
 *     lane (v2.3.3740's note above): the interact prompt rises over Jump
 *     while Jump is on screen upright (JumpButton publishes --bt-jump-clear,
 *     game.css .bt-interact-prompt).  TRAP and Shield Bash keep their places
 *     (ctlColumn stands on jumpSpotUp, Jump's old place); Block moves into
 *     the room Jump left (blockAnchor).
 *   SIDEWAYS turned toward south as far as it must to keep RCTL_JUMP_AIR
 *     from Shield Bash (and the skateboard, in Bash's place out of a fight),
 *     which hang left of the disc there; Block moves under the disc, Jump's
 *     old place.
 * A computer has no jump button (X). */
export const JUMP_RING_GAP = 10;   /* v2.3.3799: the disc's ring <-> Jump's, as Sprint's RCTL_GAP */
export const RCTL_JUMP_AIR = 8;    /* v2.3.3799: sideways, Shield Bash's foot <-> Jump's top */
/* v2.3.3799: where Jump stood upright before (v2.3.3740), which TRAP and
   Shield Bash still stand on (ctlColumn) */
export function jumpSpotUp() {
  var size = Math.max(CTL_MIN_SIZE, JUMP_SIZE.up);
  return { size: size, right: discRight(false) + RBTN.w + JUMP_DISC_AIR, bottomPx: JUMP_FOOT_UP };
}
export function jumpAnchor(isLandscape) {
  var size = Math.max(CTL_MIN_SIZE, isLandscape ? JUMP_SIZE.land : JUMP_SIZE.up);
  var discW = isLandscape ? RBTN.wLand : RBTN.w;
  /* the disc's centre: px in from the screen's right, px over the band */
  var cR = discRight(isLandscape) + discW / 2, cB = discBottom(isLandscape) + discW / 2;
  var ring = discW / 2 + JUMP_RING_GAP + size / 2;
  var down = ring * Math.SQRT1_2;
  if (isLandscape) {
    /* low enough that Jump's top keeps RCTL_JUMP_AIR under Shield Bash's foot */
    var bashFoot = ctlColumn(true).bottomPx(CTL_SLOT.bash);
    down = Math.min(ring, Math.max(down, cB + size / 2 - (bashFoot - RCTL_JUMP_AIR)));
  }
  var left = Math.sqrt(Math.max(0, ring * ring - down * down));
  return {
    size: size,
    right: Math.round(cR + left - size / 2),
    bottomPx: Math.round(cB - down - size / 2),
  };
}

/* ═══ v2.3.2574: THE RIGHT CLUSTER -- SPECIAL AND WHIRLWIND, ABOVE THE DISC ═══
 *
 * Owner: "Spec and swirl need to be on the right joystick.  It was put on the
 * left."  That corrects v2.3.2562, which read the previous message ("diagonally
 * above the left joystick") literally; the standing ask is the rest of that
 * sentence -- "directionally above but diagonal to provide enough space between
 * them for not accidentally pressing the other one" -- applied to the RIGHT
 * disc.
 *
 * This is leftCluster's arithmetic mirrored, on purpose and not by copy: the
 * two clusters differ only in which edge they hang from and which way the slots
 * step, so the rules that were argued out for the left one hold here unchanged.
 *   ABOVE: slot 0 clears the attack disc's TOP edge (RBTN.bottom + its width)
 *     by RCTL_GAP, so neither button covers the disc.
 *   DIAGONAL: slot 0 sits at the disc's own RIGHT edge; each slot steps LEFT by
 *     a full button plus half a button (LCTL_THUMB_FRAC) and UP by a little
 *     over half a button.  The horizontal step alone fully separates the boxes,
 *     which is what lets the rise stay small -- and the rise MUST stay small,
 *     because height is the binding constraint sideways (see below).
 *
 * MEASURED, because "enough space" is a number: 24px of clear air and 77px
 * centre to centre at 390 and 360, 27px and 86px in landscape.  mp-abilslot
 * asserts both and prints them, since whether it is enough for a real thumb is
 * the owner's judgement and not this file's.  (v2.3.3522: and the owner's
 * judgement was "too far away" -- 57 px and 9 px of air between the rings
 * now, 64 and 10 sideways: RCTL_PAIR_AIR below.)
 *
 * WHY IT STEPS LEFT RATHER THAN RIGHT.  Slot 0 already hangs at RBTN.right
 * (50px in from the screen edge, the disc's own margin) and stepping outward
 * would put slot 1 within 2px of the edge -- under the rounded corner in
 * portrait and under the Dynamic Island's inset in landscape, where iOS insets
 * BOTH long edges (BroTown ~3290, v2.3.2177).  Leftward it stays inside the
 * disc's margin at every width.
 *
 * AND WHY IT DOES NOT REACH THE MOVEMENT ZONE.  Slot 1's left edge lands 25px
 * inside 50vw at 390 and 10px at 360, so unlike ctlColumn there is no band to
 * fight over and no clamp to carry.  A third slot WOULD cross it (47px at 390),
 * which is the real reason Bash could not simply join this cluster.
 *
 * THE HEIGHT, which is the number that decided this layout.  Slot 1's top lands
 * 250px above the band in portrait and 272px sideways.  Sideways is the one
 * that matters: the screen is 390px tall, the health bars are drawn on the
 * CANVAS so no rect can catch a collision with them, and v2.3.2542 rejected a
 * slot at ~283px for being "up among the health bars".  272 is under that and
 * 10px above the 262 the left cluster shipped at -- the whole difference being
 * that the attack disc is 108 wide sideways where the movement disc is 98, so
 * its top edge starts 10px higher.  mp-abilslot measures the real gap to the
 * health bars rather than trusting the 283. */
export const RCTL_GAP = 10;         /* cluster <-> the attack disc */
export const RCTL_SLOT = { special: 0, whirl: 1 };

/* ═══ v2.3.3106: THE CLUSTER MAKES ROOM FOR SPRINT ═══
 * Sprint took the place right above the disc (sprintAnchor), so the cluster
 * moves -- the owner's "Above, fights move up".  Half a button of clear air
 * from Sprint either way (RCTL_SPRINT_CLEAR), the standard mp-abilslot holds
 * every pair here to, as a mis-press is a mis-press whichever two it is between:
 *   UPRIGHT, one row higher: slot 0 sits half a button over Sprint's top
 *     edge, at the disc's right margin as before, and keeps its diagonal step.
 *     Whirlwind's top lands 322px above the band at 390 (it was 250), far
 *     under the top bar and minimap on an 844px-tall screen.
 *   SIDEWAYS, beside it instead: a row higher would put Whirlwind's top at
 *     ~360px, past the 283 that v2.3.2542 rejected as "up among the health
 *     bars" on a 390px-tall screen.  So slot 0 stands LEFT of Sprint, at
 *     Sprint's height, half a button clear, and steps on leftward and up as
 *     before: Whirlwind's top at 272, the height this cluster always had --
 *     and both clear of the minimap, which Special lay under before.  Its
 *     left edge is 356px from the screen's right edge: inside the attack half
 *     from a 712px-wide phone up (an 844 has 66px to spare), 23px over the
 *     middle on a 667 -- a nibble of the movement half's far edge, away from
 *     the movement disc, which is the price of clearing the minimap. */
export const RCTL_SPRINT_CLEAR = 0.5;   /* of a button, Sprint <-> slot 0 */

/* ═══ v2.3.3522: WHIRLWIND COMES IN TOWARD SPECIAL ═══
 * The owner, playtesting: "Whirlwind action button needs to be placed closer
 * to melee special attack (too far away)."  Half a button of air on the
 * horizontal alone (the step above, a full button and a half) put their
 * centres 77 px apart upright (86 sideways): the thumb that fired the special
 * had to travel a button and a half to whirl.
 *
 * The diagonal stays -- it is the owner's own guard against "accidentally
 * pressing the other one" (v2.3.2562) -- and the rise with it (a little over
 * half a button, so the pair still reads as up-and-left).  What changes is the
 * DISTANCE: the step is now whatever puts the two rings RCTL_PAIR_AIR of a
 * button apart along the line between their centres -- the air a thumb
 * actually crosses, between two round buttons (a round button's corners are
 * not part of it: hit-testing follows the border radius).  Upright: centres 57
 * px apart (77 before), 9 px of air between the rings, 3 px between their
 * boxes side to side; sideways 64 px, 10 px of air.  Nothing else moves:
 * Special keeps its pixels (slot 0 still hangs at the disc's right margin, or
 * beside Sprint sideways), Whirlwind keeps its height (so the health-bar
 * ceiling and the coach's band, combatBandTopPx, are unchanged), and it moves
 * TOWARD Special, away from the movement half and the minimap.
 * mp-abilslot and mp-btnlayout measure the pair by that air (8 px at the
 * least, centres under 1.3 buttons apart) instead of the half-button box gap
 * every other pair keeps. */
export const RCTL_PAIR_AIR = 0.2;   /* of a button: Whirlwind's ring <-> Special's, centre line */
/* v2.3.3740: upright, Special and Whirlwind 4 px higher: Shield Bash moved up
   beside Sprint (ctlColumn stands on JUMP now), 20 px under Whirlwind, and
   mp-abilslot holds every combat pair but Special/Whirlwind to half a button
   (24).  Whirlwind's top is 316 px over the band, 4 under where it was. */
export const RCTL_BASH_LIFT = 4;

export function rightCluster(isLandscape) {
  var size = Math.max(CTL_MIN_SIZE, isLandscape ? 54 : 48);
  var spr = sprintAnchor(isLandscape);
  var rise = Math.round(size * 0.55);
  /* v2.3.3522: the step that leaves RCTL_PAIR_AIR between the rings (above);
     it was `size + size * LCTL_THUMB_FRAC`, the left cluster's */
  var pair = size * (1 + RCTL_PAIR_AIR);
  var step = Math.round(Math.sqrt(Math.max(0, pair * pair - rise * rise)));
  var clear = Math.round(size * RCTL_SPRINT_CLEAR);
  if (isLandscape) {
    return {
      size: size,
      rightPx: function (slot) { return spr.right + spr.size + clear + slot * step; },
      bottomPx: function (slot) { return Math.round(spr.bottomPx + slot * rise); },
    };
  }
  /* upright: the row over Sprint (v2.3.3740: RCTL_BASH_LIFT higher, for
     Shield Bash, which stands up and left of the disc now -- ctlColumn) */
  var base = spr.bottomPx + spr.size + clear + RCTL_BASH_LIFT;
  return {
    size: size,
    /* Slot 0 hangs at the disc's own right margin; each slot steps LEFT by
       `step` (v2.3.3522: a little over a button, RCTL_PAIR_AIR's air between
       the rings; it was a button and a half). */
    rightPx: function (slot) { return discRight(false) + slot * step; },   /* v2.3.3740: was RBTN.right */
    bottomPx: function (slot) { return Math.round(base + slot * rise); },
  };
}

export function ctlColumn(isLandscape) {
  var base = isLandscape ? 54 : 48;
  var discW = isLandscape ? RBTN.wLand : RBTN.w;
  var dR = discRight(isLandscape);   /* v2.3.3740 */
  var vw = (typeof window !== 'undefined' && window.innerWidth) || 390;
  /* How much clear room there is between the movement zone's right edge
     (a fixed 50% of the VIEWPORT in both orientations -- TouchControls'
     [data-joyzone] layers) and the disc's left edge. */
  var room = Math.round((vw - dR - discW) - vw / 2 - CTL_GAP);
  var size = Math.max(CTL_MIN_SIZE, Math.min(base, room));
  /* ═══ v2.3.3740: UPRIGHT, THE COLUMN STANDS ON JUMP ═══
     Jump took the disc's lower left (jumpAnchor), where slot 0 (Shield Bash,
     level with the disc's centre) lay.  Upright the column keeps its right
     edge CTL_GAP off the disc, and its first place stands CTL_STACK_GAP over
     Jump's top instead, beside the disc's upper half: TRAP there, Shield Bash
     over it.  TRAP takes the lower place because its words stand LEFT of it
     (TrapButton's tag): there they lie level with Element Burst, the room
     v2.3.3635 measured them against; one place up they would lie on Quick
     eat.  Both clear Sprint and Whirlwind (mp-thumbbtn measures every pair). */
  var jmp = isLandscape ? null : jumpSpotUp();   /* v2.3.3799: Jump's old place, which it has left (jumpAnchor) */
  var up0 = jmp ? jmp.bottomPx + jmp.size + CTL_STACK_GAP : 0;
  return {
    size: size,
    right: dR + discW + CTL_GAP,
    /* Slot 0 sits level with the disc's centre; each slot above clears the
       one below it, and slot -1 clears it downward into the empty band (see
       CTL_SLOT).  Returned in px, to be added to the sheet band. */
    bottomPx: function (slot) {
      if (jmp) {   /* v2.3.3740: upright, TRAP under Bash (above) */
        var lvl = slot === CTL_SLOT.trap ? 0 : slot === CTL_SLOT.bash ? 1 : slot;
        return Math.round(up0 + lvl * (size + CTL_STACK_GAP));
      }
      return Math.round(RBTN.bottom + (discW - size) / 2 + slot * (size + CTL_STACK_GAP));
    },
  };
}

/* The CSS `bottom` every control in this cluster hangs from: the dashboard
   band, plus the slot's own offset.  One string builder so a change to the
   band variable cannot reach three files. */
/* ═══ v2.3.2564: HOW HIGH THE COMBAT BAND REACHES ═══
 *
 * The owner, deciding §12.8: "Coach card move off the combat band".  The card
 * needs a number for where that band ENDS, and the honest source is the same
 * arithmetic the controls place themselves with -- not the DOM.
 *
 * WHY NOT MEASURE THE LIVE BOXES, which was the first cut and is the obvious
 * move.  Half these controls come and go: Whirlwind is gone out of combat
 * (v2.3.2561), Bash only exists with the guard raised, Special hides behind it.
 * So a DOM sweep answers "how high is the band RIGHT NOW", and the card that
 * reads it is not re-rendered when a button later appears underneath it.
 * Measured: at 360 the card placed itself before Whirlwind arrived and then
 * overlapped it by 14px, while the same code at 390 happened to be fine --
 * a layout rule that depends on render order, which is a flake waiting to
 * happen rather than a rule.
 *
 * Computed from the anchors instead: it covers every slot whether or not it is
 * currently drawn, which is also what the owner actually asked for -- "the band
 * is where the controls live and another button could land there later".
 *
 * Returned in the px-above-the-dashboard-band units the whole cluster uses, so
 * a caller adds the band height the same way ctlBottom does. */
export function combatBandTopPx(isLandscape) {
  var l = leftCluster(isLandscape);
  var r = rightCluster(isLandscape);
  var c = ctlColumn(isLandscape);
  var blk = blockAnchor(isLandscape);
  var spr = sprintAnchor(isLandscape);   /* v2.3.3006 */
  var jmp = jumpAnchor(isLandscape);     /* v2.3.3017 */
  var discR = isLandscape ? RBTN.wLand : RBTN.w;
  var discL = isLandscape ? LBTN.wLand : LBTN.w;
  /* ═══ v2.3.2574: EVERY SLOT, STILL -- INCLUDING THE ONES THAT MOVED ═══
     The list is exhaustive over the SLOT MAPS rather than over the controls
     that happen to be mounted, which is the property the v2.3.2564 note
     above is about: the card must clear a button that is not drawn yet.
     Special and Whirlwind moved from the left cluster to the right one and
     Burst took their place, so all three maps are read here.  The right
     cluster's upper slot is now the tallest thing in the band (250px at 390,
     272 sideways, against the left cluster's old 237/262), so a card that
     silently kept the old number would overlap it by 10-13px. */
  return Math.max(
    r.bottomPx(RCTL_SLOT.whirl) + r.size,      /* the right cluster's upper slot */
    r.bottomPx(RCTL_SLOT.special) + r.size,
    l.bottomPx(LCTL_SLOT.burst) + l.size,      /* Element Burst, over the movement disc */
    l.bottomPx(LCTL_SLOT.eat) + l.size,        /* Quick eat, beside it (v2.3.3260) */
    c.bottomPx(CTL_SLOT.bash) + c.size,        /* Shield Bash */
    c.bottomPx(CTL_SLOT.trap) + c.size,        /* TRAP, over it upright (v2.3.3617; v2.3.3740: under it) */
    blk.bottomPx + blk.size,                   /* Block */
    spr.bottomPx + spr.size,                   /* Sprint, over the attack disc (v2.3.3006; v2.3.3106 moved it) */
    jmp.bottomPx + jmp.size,                   /* Jump, under the attack disc (v2.3.3017) */
    discBottom(isLandscape) + discR,           /* the attack disc (v2.3.3740: its own height upright) */
    LBTN.bottom + discL);                      /* the movement disc */
}

export function ctlBottom(px) {
  return 'calc(var(--sheet-h, var(--dash-h)) + ' + px + 'px)';
}

export function ShieldButton(props) {
  var stateRef = props.stateRef;
  var isLandscape = props.isLandscape;
  var _tick = React.useState(0);
  var setTick = _tick[1];
  React.useEffect(function () {
    var id = setInterval(function () { setTick(function (v) { return (v + 1) % 1000000; }); }, 200);
    return function () { clearInterval(id); };
  }, [setTick]);

  var S = stateRef && stateRef.current;
  /* v2.3.3018: above the early returns (a hook) -- the glow swells once when
     the shield's cooldown runs out. */
  var flash = useReadyFlash(!!(S && S._shieldCdUntil && Date.now() < S._shieldCdUntil));
  if (!S || !S.rpg) return null;
  var live = shieldButtonLive(S, TARGET_PERIMETER_PX);
  /* QA probe (house style: __btMonHit, __btCoach): why the button is or is
     not on screen, which a screenshot cannot say. */
  if (typeof window !== 'undefined') {
    window.__btShieldBtn = function () {
      var s2 = stateRef && stateRef.current;
      return { live: shieldButtonLive(s2, TARGET_PERIMETER_PX), up: !!(s2 && s2._shieldUp),
        hasShield: !!(s2 && s2.rpg && s2.rpg.shield), lock: !!(s2 && s2.lockedTarget),
        monsters: (s2 && s2.monsters ? s2.monsters.length : 0) };
    };
  }
  /* Keep rendering while it is UP even if the fight moved away, or a raised
     shield could lose its own off switch. */
  if (!live && !S._shieldUp) return null;

  var on = !!S._shieldUp;
  var onCd = !!(S._shieldCdUntil && Date.now() < S._shieldCdUntil);
  /* v2.3.2472 (D9) put this in slot 0 of the left-of-the-disc column, level
     with the disc's centre.  v2.3.2562 (owner, after playing it) moved it to
     the diagonal bottom-left of the disc, on its own, for "mental separation
     for combat purpose" -- see blockAnchor. */
  var anchor = blockAnchor(isLandscape);
  var size = anchor.size;
  var right = anchor.right;
  var press = function (e) {
    e.preventDefault(); e.stopPropagation();
    pressOn(e);   /* v2.3.3018: the sheet's Pressed */
    try { toggleShield(stateRef.current); } catch (err) { /* refusal is silent-safe */ }
    setTick(function (v) { return v + 1; });
  };

  /* ═══ v2.3.3018: THE MOCKUP'S LOOK, THE SHIELD'S OWN PICTURE ═══
     The owner's mockup has no Block button in it (it only shows in a fight,
     with a shield); the up arrow under its attack button is the JUMP button
     of the real-jumping work (v2.3.3017, JumpButton.jsx), which wears
     controlSkin's jump picture.  Block takes the mockup's look with the shield's
     picture:
       down          Normal -- the gold ring, the shield at full strength (it
                     was 0.6 against the slate; the ring now says "live")
       UP            the sheet's Ready / Charged, on the warm face: lit ring,
                     glow -- the latched state, plain from across the screen
       cooling down  Cooldown -- after the stamina ran it down, a blue arc
                     closing over SHIELD_CD_MS (it was a 0.45 fade)
     and no word (BLOCK / UP), like every control in the mockup. */
  var cdLeft = onCd ? Math.max(0, S._shieldCdUntil - Date.now()) : 0;
  var skinState = on ? 'on' : (onCd ? 'cooldown' : 'normal');

  return React.createElement('div', {
    className: 'bt-desktop-hide',
    'data-shield': on ? 'up' : 'down',
    'aria-label': on ? 'Shield up' : 'Block',
    onTouchStart: press,
    onMouseDown: press,
    /* ═══ v2.3.3018: A REAL TAP TOGGLED THE SHIELD TWICE ═══
       React registers touchstart PASSIVE at its root (react-dom 18:
       touchstart, touchmove and wheel), so press()'s preventDefault above is
       ignored -- and a tap that nothing cancels is followed by the browser's
       emulated mousedown, which runs press() again: up, then straight back
       down.  Found by mp-btnskin, the first scenario to tap this button with
       a REAL finger (CDP); every other one dispatches a bare TouchEvent,
       which no browser follows with mouse events.  touchend is not passive,
       so cancelling it here stops the emulated mouse events -- the guard
       Special, Whirl/Bash, Element Burst, Sprint and the weapon button
       already carry.  Not stopped from bubbling: nothing on this side needs
       to stop hearing a release, and lE/rE/bE ignore a touch that is not
       theirs. */
    onTouchEnd: function (e) { e.preventDefault(); pressOff(e); },
    onTouchCancel: pressOff,
    onMouseUp: pressOff,
    onMouseLeave: pressOff,
    onContextMenu: function (e) { e.preventDefault(); },
    style: {
      position: 'fixed',
      right: right,
      bottom: ctlBottom(anchor.bottomPx),
      width: size, height: size, borderRadius: '50%',
      zIndex: 31,
      touchAction: 'none',
      WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
    },
  },
  React.createElement(Skin, {
    size: size, tone: on ? 'warm' : 'slate', state: skinState,
    progress: onCd ? 1 - Math.min(1, cdLeft / SHIELD_CD_MS) : null,
    flash: flash && skinState === 'normal',
  },
  /* ═══ v2.3.3522: THE OWNER'S SHIELD, FILLING THE FACE ═══
     The owner: "Block button needs a new icon."  It was the world's 64 px
     wood shield stretched to 30 px and pixelated.  Now the owner's painted
     gold shield fills the face inside the ring (controlSkin BlockFace, the
     specials' way), grey while the stamina's cooldown runs; the ring, its
     arc, the glow and the sparkles still say down / UP / cooling. */
  React.createElement(BlockFace, { size: size, grey: onCd })));
}

/* v2.3.2246's note on the icon, kept with the button it was written for:
      ═══ v2.3.2246: THE ICON WAS PAINTED BLACK ON BLACK ═══
         Owner: "Block button appears without an thumbnail icon until you
         actually tap block."  Exactly what the code did: the idle style was
         `filter: brightness(0) opacity(0.55)`, which forces EVERY pixel of
         the sprite to black regardless of the source art, and the button
         under it is a radial-gradient from #34444B to #202C32.  A black
         silhouette at 55% on near-black slate is nothing at all -- so the
         icon only appeared on the tap, when the filter went to 'none'.
         It was inherited from BlockRing (deleted this branch), where the
         same silhouette read against the WORLD, not against a dark button.
         The fix is the house idiom rather than a different filter: nothing
         else in this control cluster uses one.  AbilityButtons and
         ElementBurstButton both express idle with OPACITY alone and say why
         in as many words -- a CSS filter on a DOM overlay compositing over
         the WebGL canvas is the documented iOS grain hazard (v2.3.948's
         charge pie, v2.3.1236's joystick bases, CLAUDE.md's standing note).
         So: no filter at any time, and the OFF state is the real shield art
         at 0.6 against the slate fill, against the lit brass ring and warm
         fill of the ON state.
   v2.3.3018: still no filter at any time.  The OFF state is the shield at
   full strength now, because the gold ring round it is what says "live"; the
   ON state is told by the ring, the glow and the warm face (see above). */
