import React from 'react';
import { abilityStatus } from '@/game/abilities.js';
import { maybeSwordDash } from '@/game/abilities.js';
import { updateTargeting } from '@/game/targeting.js';
import { twoButtonsLive } from '@/game/latch.js';
import { chargeShown } from '@/game/controlVisibility.js';
import { chargeLock } from '@/game/thumbSide.js';
import { thumbAnchor } from './thumbSpot.js';
import { padAnchor } from './padSpot.js';   /* v2.3.6640: the controller's context socket (card PAD) */
import { ctlBottom, rightCluster } from './ShieldButton.jsx';
import { Skin, SkinTag, WPN_PILL_ICONS, pressOn, pressOff, useReadyFlash } from './controlSkin.jsx';

/* ═══ v2.3.6549: CHARGE, THE SWORD'S DASH AS ITS OWN BUTTON (card CT part 16) ═══
 * The owner, 2026-11-24: "I want to change the melee behavior so that it
 * doesn't jump to every monster. Instead you must press an attack charge
 * button to get that behavior."  And of a Charge button shown only while a
 * monster is in sight but too far for the sword: "do the recommended charge
 * button behavior".
 *
 * The two buttons only (`?manual=5`; `?chargebtn=0` none).  Shown while a
 * melee weapon is in hand and a monster is in sight (or locked) but not in
 * the sword's reach (controlVisibility.js chargeShown, thumbSide.js's phase);
 * it goes otherwise -- once the dash lands the monster is in reach, Charge
 * goes and the specials come.  A press locks the monster if none is locked
 * (the one in sight now: thumbSide.js chargeLock, no attack of its own), puts
 * the lock in place this moment (targeting.js updateTargeting, the one writer
 * of S.lockedTarget, which in this mode locks the latch's id) and dashes at it
 * (abilities.js maybeSwordDash: the sword's lunge, reach 900, cooldown 2500
 * ms; its body's move is BroTown's S._bashDash; the worker allows it as it
 * always has: nothing on the worker changes).  During the cooldown the button
 * is dimmed with the sweep, as Whirlwind is.  Its picture is the game's own
 * sword (the weapon pill's, warmed on the loading screen: controlsPreload.js)
 * with three bold speed lines drawn behind it (no new picture), and its word,
 * "Charge", in the skin's tag (as Special's AIM / ON).
 * Its spot is its own on the right thumb's arc (thumbArc.js: the outer ring,
 * up and left of Block); off the arc it hangs where Whirlwind's slot would.
 * No key on a computer: the two buttons are a touch screen's only (latch.js
 * twoButtonsLive), so Charge never shows with a mouse.
 */

let _presses = 0, _dashes = 0;   /* the probe's counts, this page's */

/** The press: true when the dash went.  `S` the game's state. */
export function chargePress(S) {
  if (!S || !S.rpg) return false;
  if (!chargeShowing(S)) return false;   /* v2.3.6640: the one ask, below */
  if (chargeLock(S) == null) return false;
  try { updateTargeting(S); } catch (e) { /* the lock comes next frame; the dash below refuses without it */ }
  try { return maybeSwordDash(S) === true; } catch (e) { return false; }
}

/** v2.3.6640: is Charge on screen now (the controller's context socket:
 *  RideButton gives the socket up to it, padSkin.js ctxFor).  The resolver's
 *  one caller stays this file (sight.test 10). */
export function chargeShowing(S) {
  return !!S && !!S.rpg && chargeShown(S, twoButtonsLive(), chargeMelee(S));
}

/** A melee weapon in hand, and the dash this character has. */
export function chargeMelee(S) {
  if (!S || !S.rpg) return false;
  const slot = S.rpg.activeSlot;
  if (slot === 'ranged' || slot === 'staff') return false;
  const st = abilityStatus(S, 'sworddash');
  return !!(st && st.visible && st.equipped !== false);
}

/* the three speed lines, bold and outlined dark as the painted icons are, so
   they read plainly at 44 points (the orchestrator, for the owner's "ease and
   clarity": Charge must not read as a second Attack) */
const LINES = [[12, 34, 38], [6, 50, 36], [12, 66, 38]];
function SpeedLines(props) {
  const s = props.size;
  const line = function (l, i, w, c) { return React.createElement('line', { key: i, x1: l[0], y1: l[1], x2: l[2], y2: l[1], stroke: c, strokeWidth: w, strokeLinecap: 'round' }); };
  return React.createElement('svg', { width: s, height: s, viewBox: '0 0 100 100', 'aria-hidden': 'true',
    style: { position: 'absolute', left: 0, top: 0, pointerEvents: 'none' } },
  LINES.map(function (l, i) { return line(l, 'o' + i, 14, '#141a1e'); }),
  LINES.map(function (l, i) { return line(l, 'f' + i, 8, props.grey ? '#9aa1a8' : '#ffd36a'); }));
}

export function ChargeButton(props) {
  const stateRef = props.stateRef;
  const isLandscape = props.isLandscape;
  /* the 200 ms render of its neighbours (AbilityButtons, SpecialButton): the
     phase and the cooldown change without a React state change */
  const [, setTick] = React.useState(0);
  React.useEffect(function () {
    const id = setInterval(function () { setTick(function (v) { return (v + 1) % 1000000; }); }, 200);
    return function () { clearInterval(id); };
  }, []);
  const S = stateRef && stateRef.current;
  const st = S && S.rpg ? abilityStatus(S, 'sworddash') : null;
  const cooling = !!(st && st.cdLeft > 0);
  const flash = useReadyFlash(cooling);
  if (typeof window !== 'undefined') {
    /* QA probe, house style (__btShieldBtn, __btSpecialBtn): why it is or is not on screen */
    window.__btChargeBtn = function () {
      const s2 = stateRef && stateRef.current;
      if (!s2 || !s2.rpg) return { shown: false };
      const st2 = abilityStatus(s2, 'sworddash');
      return { shown: chargeShown(s2, twoButtonsLive(), chargeMelee(s2)), melee: chargeMelee(s2),
        phase: s2._thumbPhase || 'calm', sight: s2._sightPhase || 'none', latch: s2._latchPhase || 'idle',
        cdLeft: st2 ? st2.cdLeft : null, presses: _presses, dashes: _dashes };
    };
  }
  if (!S || !S.rpg || !st) return null;
  if (!chargeShown(S, twoButtonsLive(), chargeMelee(S))) return null;

  const arc = thumbAnchor('charge', isLandscape);
  const col = arc ? null : rightCluster(isLandscape);
  /* v2.3.6640: in the controller, the context socket (padSpot.js) */
  const at = padAnchor('charge', isLandscape, arc || { size: col.size, right: col.rightPx(1), bottomPx: col.bottomPx(1) });
  const size = at.size;
  const right = at.right;
  const bottomPx = at.bottomPx;
  const ready = !cooling && st.afford !== false;
  const skinState = cooling ? 'cooldown' : (ready ? 'normal' : 'disabled');
  const grey = skinState !== 'normal';
  const art = Math.round(size * 0.62);

  const press = function (e) {
    e.preventDefault();
    e.stopPropagation();
    pressOn(e);
    const s = stateRef && stateRef.current;
    if (!s) return;
    _presses++;   /* QA: the probe's counts (window.__btChargeBtn) */
    if (chargePress(s)) _dashes++;
  };
  return React.createElement('div', {
    className: 'bt-desktop-hide',
    'data-charge': ready ? 'ready' : 'cooling',
    'data-uisfx': 'off',
    role: 'button',
    'aria-label': 'Charge',
    onTouchStart: press,
    onTouchEnd: function (e) { e.preventDefault(); e.stopPropagation(); pressOff(e); },
    onTouchCancel: pressOff,
    onTouchMove: function (e) { e.stopPropagation(); },
    onMouseDown: press,
    onMouseUp: pressOff,
    onMouseLeave: pressOff,
    onContextMenu: function (e) { e.preventDefault(); },
    style: {
      position: 'fixed', right: right, bottom: ctlBottom(bottomPx),
      width: size, height: size, borderRadius: '50%',
      /* above the zones (z6) and the attack disc's box (z30), as its neighbours */
      zIndex: 31, pointerEvents: 'auto',
      /* TRAPS 229: manipulation (its touchstart's preventDefault already
         keeps a pan or a zoom from starting on it) */
      touchAction: 'manipulation',
      WebkitTapHighlightColor: 'transparent', WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
    },
  }, React.createElement(Skin, { size: size, tone: 'slate', state: skinState, progress: cooling ? 1 - st.cdFrac : null, flash: flash && skinState === 'normal',
    pad: at.pad ? 'charge' : null, face: at.face },   /* v2.3.6640: the painted face, no word (the mockup's) */
    React.createElement('span', { className: 'bt-skin-art', 'data-icon': 'charge', style: { position: 'relative', display: 'block', width: size, height: size } },
      React.createElement(SpeedLines, { size: size, grey: grey }),
      React.createElement('img', { src: grey ? WPN_PILL_ICONS.melee.off : WPN_PILL_ICONS.melee.on, alt: '', draggable: false, width: art, height: art,
        style: { position: 'absolute', left: '60%', top: '50%', width: art, height: art, transform: 'translate(-50%,-50%)', objectFit: 'contain', pointerEvents: 'none' } })),
    /* its word, as Special's state words (SkinTag): the right side's buttons carry words there */
    React.createElement(SkinTag, null, 'Charge')));
}
