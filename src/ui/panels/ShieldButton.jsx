import React from 'react';
import { TARGET_PERIMETER_PX } from '@/data/index.js';
import { toggleShield, shieldButtonLive } from '@/game/shieldToggle.js';

/* ═══ v2.3.2229: THE SHIELD BUTTON ═══
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
 * WHERE: centred directly under the right button, in the 70px band between
 * the disc and the dashboard (the disc sits at sheet-h + 70).  The band is
 * also where the target-switch arrows go (docs/specs/control-redesign.md
 * §2.3), flanking this button.
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
   96/108 wide since v2.3.2229). */
export const RBTN = { right: 50, bottom: 70, w: 96, wLand: 108 };

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
  var size = isLandscape ? 54 : 48;
  var discW = isLandscape ? RBTN.wLand : RBTN.w;
  var right = RBTN.right + (discW - size) / 2;
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
      bottom: 'calc(var(--sheet-h, var(--dash-h)) + 12px)',
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
      /* Idle: the same silhouette read BlockRing used, so "off" is unmistakable. */
      filter: on ? 'none' : 'brightness(0) opacity(0.55)',
    },
  }),
  React.createElement('span', {
    style: {
      fontSize: 9, fontWeight: 700, letterSpacing: '.04em', marginTop: 1,
      color: on ? '#F7F2E7' : '#B9C1BF', pointerEvents: 'none',
    },
  }, on ? 'UP' : 'BLOCK'));
}
