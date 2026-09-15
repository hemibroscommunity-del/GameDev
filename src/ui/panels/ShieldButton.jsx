import React from 'react';
import { TARGET_PERIMETER_PX } from '@/data/index.js';
import { toggleShield, shieldButtonLive } from '@/game/shieldToggle.js';

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
const SHIELD_SPRITE = '/sprites/shields/wood-shield-front.png?v=2.3.1875';

/* The disc's geometry, shared with TouchControls (right:50, bottom:+70,
   96/108 wide since v2.3.2242). */
export const RBTN = { right: 50, bottom: 70, w: 96, wLand: 108 };

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
export const CTL_SLOT = { bash: 1 };

/* ═══ v2.3.2562: BLOCK, ALONE, BELOW AND LEFT OF THE ATTACK DISC ═══
 *
 * "the shield block button to the diagonal bottom left of that right joystick
 * (as a mental separation for combat purpose further away from the other
 * buttons on its own side)".  The DISTANCE is the feature, so it is measured
 * rather than eyeballed: mp-btnlayout asserts the clear gap to Bash.
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
  return {
    size: col.size,
    right: col.right,
    /* Below the disc's bottom edge by one gap.  Stays above the dashboard band
       by construction: RBTN.bottom is 70 and the button is at most 54 wide, so
       the result is positive at every width -- asserted in mp-btnlayout, which
       measures the real painted band rather than trusting that arithmetic. */
    bottomPx: RBTN.bottom - col.size - CTL_GAP,
  };
}

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
export const LCTL_GAP = 10;         /* cluster <-> the movement disc */
/* The owner's "enough space ... not accidentally pressing the other one", as a
   FRACTION of the button rather than a constant.  It was a flat 24px, which is
   half of a 48px portrait button but well under half of the 54px landscape one
   -- so the gap silently got proportionally tighter on the orientation with
   less room, which is backwards.  Half a button at every size instead, and
   mp-abilslot floors it at exactly that so the two cannot drift apart. */
export const LCTL_THUMB_FRAC = 0.5;
export const LCTL_SLOT = { special: 0, whirl: 1 };

export function leftCluster(isLandscape) {
  var size = Math.max(CTL_MIN_SIZE, isLandscape ? 54 : 48);
  var discW = isLandscape ? LBTN.wLand : LBTN.w;
  var left0 = isLandscape ? LBTN.leftLand : LBTN.left;
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

export function ctlColumn(isLandscape) {
  var base = isLandscape ? 54 : 48;
  var discW = isLandscape ? RBTN.wLand : RBTN.w;
  var vw = (typeof window !== 'undefined' && window.innerWidth) || 390;
  /* How much clear room there is between the movement zone's right edge
     (a fixed 50% of the VIEWPORT in both orientations -- TouchControls'
     [data-joyzone] layers) and the disc's left edge. */
  var room = Math.round((vw - RBTN.right - discW) - vw / 2 - CTL_GAP);
  var size = Math.max(CTL_MIN_SIZE, Math.min(base, room));
  return {
    size: size,
    right: RBTN.right + discW + CTL_GAP,
    /* Slot 0 sits level with the disc's centre; each slot above clears the
       one below it, and slot -1 clears it downward into the empty band (see
       CTL_SLOT).  Returned in px, to be added to the sheet band. */
    bottomPx: function (slot) {
      return Math.round(RBTN.bottom + (discW - size) / 2 + slot * (size + CTL_STACK_GAP));
    },
  };
}

/* The CSS `bottom` every control in this cluster hangs from: the dashboard
   band, plus the slot's own offset.  One string builder so a change to the
   band variable cannot reach three files. */
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
    try { toggleShield(stateRef.current); } catch (err) { /* refusal is silent-safe */ }
    setTick(function (v) { return v + 1; });
  };

  return React.createElement('div', {
    className: 'bt-desktop-hide',
    'data-shield': on ? 'up' : 'down',
    onTouchStart: press,
    onMouseDown: press,
    onContextMenu: function (e) { e.preventDefault(); },
    style: {
      position: 'fixed',
      right: right,
      bottom: ctlBottom(anchor.bottomPx),
      width: size, height: size, borderRadius: '50%',
      zIndex: 31,
      touchAction: 'none',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', lineHeight: 1,
      /* Lantern Slate, matching the ability buttons: raised slate, brass
         edge while it will do something; the warm accent-fill when it is UP. */
      background: on
        ? 'radial-gradient(circle, #6B5326 0%, #3A2C13 100%)'
        : 'radial-gradient(circle, #34444B 0%, #202C32 100%)',
      border: '2px solid ' + (on ? '#F0C878' : onCd ? 'rgba(238,242,235,.14)' : '#D8A85F'),
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)',
      opacity: onCd ? 0.45 : 1,
      transition: 'opacity 120ms linear',
      WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
    },
  },
  React.createElement('img', {
    src: SHIELD_SPRITE, alt: '', draggable: false,
    style: {
      width: Math.round(size * 0.56), height: Math.round(size * 0.56),
      imageRendering: 'pixelated', pointerEvents: 'none',
      /* ═══ v2.3.2246: THE ICON WAS PAINTED BLACK ON BLACK ═══
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
         fill of the ON state. */
      opacity: on ? 1 : 0.6,
    },
  }),
  React.createElement('span', {
    style: {
      fontSize: 11, fontWeight: 700, letterSpacing: '.04em', marginTop: 1,
      color: on ? '#F7F2E7' : '#B9C1BF', pointerEvents: 'none',
    },
  }, on ? 'UP' : 'BLOCK'));
}
