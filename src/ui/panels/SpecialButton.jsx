import React from 'react';
import { TARGET_PERIMETER_PX, getActiveWeapon, specialManaCost } from '@/data/index.js';
import { specialAttack } from '@/game/playerActions.js';
import { ctlColumn, ctlBottom, CTL_SLOT } from '@/ui/panels/ShieldButton.jsx'; /* v2.3.2527: the shared right-hand column */

/* ═══ v2.3.2527: A SPECIAL ATTACK BUTTON, ORBITING THE ATTACK DISC ═══
 *
 * Owner, after playing the merged build on a phone: "Move the Special attack
 * button to orbit the RIGHT joystick, not the left."  v2.3.2472 put it beside
 * the movement stick, per the backlog's C1 brief; this is the same button, one
 * screen-half over, and the reasons below are what change with the move.
 *
 * WHY A SECOND TRIGGER RATHER THAN A REPLACEMENT.  Unchanged from v2.3.2472:
 * the flick stays -- it is what ControlsTutorial teaches, what QuestCoach's
 * `special` mark rings, and what mp-rbutton / mp-solospecial pin.  What it is
 * not is reliable; it is a SPEED test (0.15 px/ms over 8px in under 400ms,
 * BroTown's rE and bE), so a deliberate thumb that is a shade too slow fires an
 * ordinary swing instead and the player has no way to see which reading they
 * got.  A labelled button cannot be misread and shows its own cooldown.
 *
 * ═══ IT MUST STILL SWALLOW ITS OWN TOUCHES -- FOR A DIFFERENT NEIGHBOUR ═══
 * On the left the hazard was the movement layer: a press that fell through
 * walked or dodged.  On the right there are TWO things underneath, and the
 * owner named both:
 *
 *   1. THE ATTACK DISC (`.bt-rjoy-base`, z30, pointerEvents:'auto' whenever the
 *      contextual button is live).  This button sits at z31 in the column that
 *      hugs the disc's left edge, so the two do not overlap by construction
 *      (ctlColumn pins the column's right edge 4px clear of the disc -- that is
 *      D9's whole point) -- but "does not overlap" is a layout claim, and layout
 *      moves.  preventDefault + stopPropagation on touchstart is the belt to
 *      that braces: even if a future width brought the boxes together, the
 *      press could not reach bS -> handleRBtnPress and fire a swing.
 *   2. THE RIGHT ZONE (`[data-joyzone="R"]`, the full-height right HALF at z6).
 *      It is the joystick: its rS presses through handleRBtnPress too, its rM
 *      aims, and its rE forwards any short tap to the canvas as a lock-on click
 *      (v2.3.816) -- so a press that leaked would lock on, swing, and re-aim.
 *
 * A touch that ENDS here is stopped for the same reason it was on the left:
 * a release is classified, and this surface's release must not be read as the
 * end of a tap, a flick, or -- for as long as any surface on this side ever
 * classifies one again -- the first half of a pair.  v2.3.2527 unbound the
 * right control's double tap (BroTown's handleRBtnPress), so there is nothing
 * on this side counting taps today; the guard stays anyway, because the cost is
 * two lines and the failure it prevents is silent.
 *
 * ═══ WHERE ═══
 * Slot -1 of the D9 column: hugging the disc's left edge, one button below the
 * Block button, in the band the shield vacated.  See CTL_SLOT in
 * ShieldButton.jsx for why it goes BELOW the stack rather than on top of it.
 * Measured through ctlColumn, so it tracks the disc and the other three
 * controls at every width instead of carrying a fourth copy of the layout rule.
 *
 * ═══ WHEN ═══
 * Unchanged: the same shape of predicate as shieldButtonLive -- a weapon in the
 * active slot and a fight on or about to be.  Deliberately NOT gated on
 * affordability: a button that vanishes when the mana runs out is a button the
 * player cannot learn, so it greys and floats specialAttack's own "No mana!"
 * popup instead.
 */
const SPECIAL_CD_MS = 1500;   /* playerActions.specialAttack's own §4.5 gate */

export function specialButtonLive(S, perimeterPx) {
  if (!S || !S.rpg || !S.player) return false;
  if (!getActiveWeapon(S.rpg)) return false;
  /* No special from behind a raised guard (playerActions drops the shield
     rather than refusing, but offering the button there would invite the
     player to break their own block by accident). */
  if (S._shieldUp) return false;
  if (S._extraction) return false;
  if (S.lockedTarget && S.lockedTarget.ref) return true;
  if (S.lastDamageTaken && Date.now() - S.lastDamageTaken < 5000) return true;
  const P = S.player;
  const R = perimeterPx || 220;
  const list = S.monsters;
  if (list) {
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (!m || !m.alive) continue;
      if (typeof m.curHp === 'number' && m.curHp <= 0) continue;
      const dx = m.x - P.x, dy = m.y - P.y;
      if (dx * dx + dy * dy <= R * R) return true;
    }
  }
  return false;
}

export function SpecialButton(props) {
  var stateRef = props.stateRef;
  var isLandscape = props.isLandscape;
  /* Same 200ms poll as ShieldButton and AbilityButtons: the cooldown sweep and
     the mana state both change without a React state change. */
  var _tick = React.useState(0);
  var setTick = _tick[1];
  React.useEffect(function () {
    var id = setInterval(function () { setTick(function (v) { return (v + 1) % 1000000; }); }, 200);
    return function () { clearInterval(id); };
  }, [setTick]);

  var S = stateRef && stateRef.current;
  if (!S || !S.rpg) return null;

  /* QA probe, house style (__btShieldBtn, __btMonHit): why the button is or is
     not on screen, which a screenshot cannot say. */
  if (typeof window !== 'undefined') {
    window.__btSpecialBtn = function () {
      var s2 = stateRef && stateRef.current;
      if (!s2 || !s2.rpg) return { live: false };
      var cd2 = Math.max(0, SPECIAL_CD_MS - (Date.now() - (s2._lastSwipe || 0)));
      return { live: specialButtonLive(s2, TARGET_PERIMETER_PX), cdLeft: cd2,
        mana: s2.rpg.mana, cost: specialManaCost(s2.rpg),
        weapon: !!getActiveWeapon(s2.rpg), lock: !!(s2.lockedTarget && s2.lockedTarget.ref) };
    };
  }
  if (!specialButtonLive(S, TARGET_PERIMETER_PX)) return null;

  /* v2.3.2527: the shared right-hand column decides the size, the right edge
     and the slot height -- one rule for Block, Bash, Whirlwind and this. */
  var col = ctlColumn(isLandscape);
  var size = col.size;

  var cdLeft = Math.max(0, SPECIAL_CD_MS - (Date.now() - (S._lastSwipe || 0)));
  var cdFrac = cdLeft / SPECIAL_CD_MS;
  var cost = specialManaCost(S.rpg);
  var afford = (S.rpg.mana || 0) >= cost;
  var ready = cdLeft <= 0 && afford;

  var press = function (e) {
    /* Both, and in this order -- see the header.  preventDefault stops iOS
       synthesising a click (and the page's own touch-scroll absorber from
       seeing it); stopPropagation keeps [data-joyzone="R"] and the attack disc
       beneath from reading the same finger as a lock-on, a swing or an aim. */
    e.preventDefault();
    e.stopPropagation();
    try { specialAttack(stateRef.current); } catch (err) { /* refusals float their own popup */ }
    setTick(function (v) { return v + 1; });
  };

  return React.createElement('div', {
    className: 'bt-desktop-hide',
    'data-special': ready ? 'ready' : 'wait',
    onTouchStart: press,
    onMouseDown: press,
    /* v2.3.2527: a touch that ENDS here must not reach the zone either -- rE
       classifies every release on that side, forwards a short one to the canvas
       as a lock-on click (v2.3.816) and runs the flick test that fires the
       special a SECOND time. */
    onTouchEnd: function (e) { e.preventDefault(); e.stopPropagation(); },
    onTouchMove: function (e) { e.stopPropagation(); },
    onContextMenu: function (e) { e.preventDefault(); },
    style: {
      position: 'fixed',
      right: col.right,
      bottom: ctlBottom(col.bottomPx(CTL_SLOT.special)),
      width: size, height: size, borderRadius: '50%',
      /* Above [data-joyzone="R"] (z6) and the disc's corner box (z30), the
         same rung ShieldButton and AbilityButtons sit on. */
      zIndex: 31,
      touchAction: 'none',
      pointerEvents: 'auto',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', lineHeight: 1,
      /* Lantern Slate, matching the shield and ability buttons: raised slate
         with a brass edge while it will do something.  No CSS filter at any
         state -- a filter on a DOM overlay compositing over the WebGL canvas
         is the documented iOS grain hazard (v2.3.948, v2.3.1236). */
      background: ready
        ? 'radial-gradient(circle, #34444B 0%, #202C32 100%)'
        : 'radial-gradient(circle, #1A2429 0%, #141C21 100%)',
      border: '2px solid ' + (ready ? '#D8A85F' : 'rgba(238,242,235,.14)'),
      boxShadow: ready ? 'inset 0 1px 0 rgba(255,255,255,.08)' : 'none',
      opacity: afford ? 1 : 0.55,
      WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
    },
  },
  /* Cooldown sweep, the same conic wedge AbilityButtons uses. */
  cdFrac > 0 && React.createElement('div', {
    style: {
      position: 'absolute', inset: 0, borderRadius: '50%',
      background: 'conic-gradient(from -90deg, rgba(0,0,0,.55) 0deg, rgba(0,0,0,.55) '
        + Math.round(cdFrac * 360) + 'deg, transparent ' + Math.round(cdFrac * 360) + 'deg)',
      pointerEvents: 'none',
    },
  }),
  React.createElement('span', {
    style: { fontSize: isLandscape ? 20 : 18, pointerEvents: 'none' },
  }, '✶'),
  React.createElement('span', {
    style: {
      fontSize: 11, fontWeight: 700, letterSpacing: '.04em', marginTop: 2,
      color: ready ? '#F7F2E7' : '#687575', pointerEvents: 'none',
    },
  }, cdLeft > 0 ? (Math.ceil(cdLeft / 1000) + 's') : 'SPEC'));
}
