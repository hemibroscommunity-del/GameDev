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
 * WHERE: v2.3.2472 (owner decision D9) moved it to the LEFT of the disc,
 * level with the disc's centre, with the ability buttons stacked above it --
 * see ctlColumn below.  It used to be centred directly under the disc, in the
 * 70px band between it and the dashboard; the band placement is what put it
 * under the thumb that presses Attack, and what made "a button appearing under
 * the thumb mid-block" the complaint v2.3.2446 answered by deleting it.
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
       one below it.  Returned in px, to be added to the sheet band. */
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
  /* v2.3.2472 (D9): slot 0 of the left-of-the-disc column -- see ctlColumn. */
  var col = ctlColumn(isLandscape);
  var size = col.size;
  var right = col.right;
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
      bottom: ctlBottom(col.bottomPx(0)),
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
