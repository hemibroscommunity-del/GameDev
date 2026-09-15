import React from 'react';
import { TARGET_PERIMETER_PX, getActiveWeapon, specialManaCost } from '@/data/index.js';
import { specialAttack } from '@/game/playerActions.js';
import { BOW_SPECIAL_QUEUE_MS } from '@/game/combatHelpers.js'; /* v2.3.2527: the queued special's own expiry, so the button and the fire site cannot disagree about how long a request stands */
import { LBTN, ctlBottom } from '@/ui/panels/ShieldButton.jsx';

/* ═══ v2.3.2472: A SPECIAL ATTACK BUTTON, BESIDE THE MOVEMENT STICK ═══
 *
 * Owner (C1, backlog §2.4): a Special Attack button orbiting the LEFT stick,
 * as a second trigger for the same `doSpecialAttack` the flick fires.
 *
 * WHY A SECOND TRIGGER RATHER THAN A REPLACEMENT.  The flick stays: it is what
 * ControlsTutorial teaches, what QuestCoach's `special` mark rings, and what
 * mp-rbutton / mp-solospecial pin.  What it is not is reliable -- it is a
 * SPEED test (0.15 px/ms over 8px in under 400ms, BroTown's rE and bE), so a
 * deliberate thumb that is a shade too slow fires an ordinary swing instead,
 * and the player has no way to see which reading they got.  A labelled button
 * cannot be misread, shows its own cooldown, and can be pressed while the
 * right thumb is holding Attack -- which the flick, living on that same thumb,
 * can never be.
 *
 * ═══ IT MUST SWALLOW ITS OWN TOUCHES ═══
 * This is the whole hazard of putting anything on the left side, and it is the
 * mechanism behind the v2.3.2123 world-chat incident and AbilityButtons'
 * standing note.  The movement input is NOT the little disc you can see: it is
 * [data-joyzone="L"], a fixed layer covering the entire left half at z6, and a
 * LEFT-ZONE SWIPE IS THE DODGE (BroTown's lE -> handleCanvasSwipe).  So a
 * button sitting over that layer has two jobs beyond looking like a button:
 *
 *   1. It must take its own touches -- pointerEvents 'auto' at a z-index above
 *      the zone -- or the press falls through and dodges instead of casting.
 *   2. It must stopPropagation AND preventDefault on touchstart, so the press
 *      is not ALSO read by the zone underneath as the start of a walk or the
 *      first half of a dodge swipe.
 *
 * A finger that lands here therefore cannot move the character or dodge for
 * the duration of that touch.  That is the deliberate cost of the control, and
 * it is why it sits BESIDE the disc rather than over it: the stick's own
 * resting position stays clear, and the button is a place the thumb goes on
 * purpose.
 *
 * ═══ WHERE ═══
 * The mirror of the Block button's new home (D9): immediately to the INSIDE of
 * the left disc, level with its centre.  Measured from LBTN so it tracks the
 * disc if that ever moves.  At 390x844 that is x 99..147 -- comfortably inside
 * the left half (195), so unlike the right-hand column this one never has to
 * choose between the movement zone and the disc.
 *
 * ═══ WHEN ═══
 * The same shape of predicate as shieldButtonLive: a weapon in the active slot
 * and a fight on or about to be.  Deliberately NOT gated on affordability --
 * a button that vanishes when the mana runs out is a button the player cannot
 * learn; it greys and floats specialAttack's own "No mana!" popup instead.
 */
const SPECIAL_CD_MS = 1500;   /* playerActions.specialAttack's own §4.5 gate */

/* ═══ v2.3.2527: A HELD SPECIAL IS A STATE OF THIS BUTTON, NOT A MESSAGE ═══
 *
 * Owner, after playing the merged bow rework: swiping the bow's special on a
 * monster "often pops a message saying the ability is queued", and "the player
 * does not need telling every time; they swiped, they expect a shot."
 *
 * The bow only looses when its sight line is on something (monsterCombat's
 * gate), so a special pressed while the line is empty is REMEMBERED and fires
 * on the first frame the line lands -- v2.3.2473's queue, and it is good
 * behaviour worth keeping.  What was wrong is that it announced itself in a
 * `pushDmgPopup` over the player's head, once per swipe, while they were
 * aiming.  The feedback is not deleted (a control that silently does nothing
 * is indistinguishable from a broken one -- the same note playerActions' own
 * no-mana refusal carries); it MOVED to the one place the player is already
 * looking when they press it, and it costs them no reading.
 *
 * WHY THE EXPIRY IS IMPORTED RATHER THAN RE-STATED.  `_bowSpecialQueued` is a
 * timestamp, and monsterCombat drops it once it is older than
 * BOW_SPECIAL_QUEUE_MS.  A button with its own copy of that number would light
 * for a request the fire site had already abandoned (or go dark on one it was
 * still holding) the first time either moved -- the same one-number-two-places
 * failure as the origin bug in the report this ships with.
 *
 * DELIBERATELY NOT gated on the weapon: the queue is bow-only at the fire site
 * (`R.activeSlot === 'ranged'`), so the flag is simply never set on anything
 * else and testing the slot here would be a second copy of that rule too. */
export function specialQueued(S) {
  if (!S || !S._bowSpecialQueued) return false;
  return (Date.now() - S._bowSpecialQueued) < BOW_SPECIAL_QUEUE_MS;
}

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
        weapon: !!getActiveWeapon(s2.rpg), lock: !!(s2.lockedTarget && s2.lockedTarget.ref),
        /* v2.3.2527: the held-special state, which replaced a popup.  A
           scenario can read a flag; it cannot read a ring. */
        queued: specialQueued(s2) };
    };
  }
  if (!specialButtonLive(S, TARGET_PERIMETER_PX)) return null;

  var size = isLandscape ? 54 : 48;
  var discW = isLandscape ? LBTN.wLand : LBTN.w;
  var left = (isLandscape ? LBTN.leftLand : LBTN.left) + discW + 4;
  var bottomPx = Math.round(LBTN.bottom + (discW - size) / 2);

  var cdLeft = Math.max(0, SPECIAL_CD_MS - (Date.now() - (S._lastSwipe || 0)));
  var cdFrac = cdLeft / SPECIAL_CD_MS;
  var cost = specialManaCost(S.rpg);
  var afford = (S.rpg.mana || 0) >= cost;
  var ready = cdLeft <= 0 && afford;
  /* v2.3.2527: a swipe the bow is holding until its line lands.  See the
     header -- this is where the 'Lining up...' popup went. */
  var queued = specialQueued(S);

  var press = function (e) {
    /* Both, and in this order -- see the header.  preventDefault stops iOS
       synthesising a click (and the page's own touch-scroll absorber from
       seeing it); stopPropagation keeps [data-joyzone="L"] beneath from
       reading the same finger as a walk or a dodge swipe. */
    e.preventDefault();
    e.stopPropagation();
    try { specialAttack(stateRef.current); } catch (err) { /* refusals float their own popup */ }
    setTick(function (v) { return v + 1; });
  };

  return React.createElement('div', {
    className: 'bt-desktop-hide',
    'data-special': queued ? 'queued' : (ready ? 'ready' : 'wait'),
    onTouchStart: press,
    onMouseDown: press,
    /* A touch that ENDS here must not reach the zone either: lE classifies a
       release, and a press-and-lift on this button would otherwise read as the
       first tap of the left stick's weapon-swap double tap. */
    onTouchEnd: function (e) { e.preventDefault(); e.stopPropagation(); },
    onTouchMove: function (e) { e.stopPropagation(); },
    onContextMenu: function (e) { e.preventDefault(); },
    style: {
      position: 'fixed',
      left: left,
      bottom: ctlBottom(bottomPx),
      width: size, height: size, borderRadius: '50%',
      /* Above [data-joyzone="L"] (z6) and the disc's corner box (z30), the
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
      /* v2.3.2527: a held swipe reads as the LIT slate with a full brass rim --
         the same two tokens the ready state already uses, turned up rather
         than a new colour, so the button says "your press landed and is
         waiting" without introducing a third visual language to learn.  Still
         no CSS filter at any state: a filter on a DOM overlay compositing over
         the WebGL canvas is the documented iOS grain hazard (v2.3.948,
         v2.3.1236), and a pulsing one would be the same hazard in motion. */
      background: (ready || queued)
        ? 'radial-gradient(circle, #34444B 0%, #202C32 100%)'
        : 'radial-gradient(circle, #1A2429 0%, #141C21 100%)',
      border: (queued ? '3px solid #F0C878' : '2px solid ' + (ready ? '#D8A85F' : 'rgba(238,242,235,.14)')),
      boxShadow: queued
        ? 'inset 0 0 0 1px rgba(240,200,120,.35), inset 0 1px 0 rgba(255,255,255,.10)'
        : (ready ? 'inset 0 1px 0 rgba(255,255,255,.08)' : 'none'),
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
      color: queued ? '#F0C878' : (ready ? '#F7F2E7' : '#687575'), pointerEvents: 'none',
    },
  },
  /* v2.3.2527: AIM, because that is the ACTION the state is asking for -- the
     shot goes the moment the line touches something, so the one useful thing
     the player can do with this information is move the line.  'QUEUED' would
     name the machinery instead, which is what the popup did. */
  queued ? 'AIM' : (cdLeft > 0 ? (Math.ceil(cdLeft / 1000) + 's') : 'SPEC')));
}
