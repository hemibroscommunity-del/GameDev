import React from 'react';
import { TARGET_PERIMETER_PX, getActiveWeapon, specialManaCost } from '@/data/index.js';
import { specialAttack } from '@/game/playerActions.js';
import { isWheelSwimming } from '@/game/wheelSwim.js'; /* v2.3.3003: no special in the water */
import { BOW_SPECIAL_QUEUE_MS } from '@/game/combatHelpers.js'; /* v2.3.2543: the queued special's own expiry, so the button and the fire site cannot disagree about how long a request stands */
import { ctlBottom, rightCluster, RCTL_SLOT } from '@/ui/panels/ShieldButton.jsx'; /* v2.3.2574: back to the RIGHT disc, in the shared diagonal cluster above it */
import { Skin, StarburstIcon, SkinTag, pressOn, pressOff, useReadyFlash } from '@/ui/panels/controlSkin.jsx'; /* v2.3.3018: the owner's mockup */

/* ═══ v2.3.2542: A SPECIAL ATTACK BUTTON, ORBITING THE ATTACK DISC ═══
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
 * ═══ v2.3.2562: AND BACK TO THE LEFT AGAIN, WITH WHIRLWIND BESIDE IT ═══
 * (SUPERSEDED by v2.3.2574 -- the owner corrected this one message later and
 * the button is on the RIGHT disc now.  Kept because the hazard list it works
 * out is the one that applies whenever anything sits over the movement half,
 * and because the pair of them is the record of how this was settled.)
 * Owner, after playing the v2.3.2542 build and sending a screenshot: "I'd like
 * the whirlwind and special attack buttons diagonally above the left joystick
 * (directionally above but diagonal to provide enough space between them for
 * not accidentally pressing the other one)".  So this button returns to the
 * side it was on at v2.3.2472, one slot of a two-control diagonal -- see
 * leftCluster in ShieldButton.jsx for the geometry and why the two steps are
 * different sizes.
 *
 * WHICH MAKES THE PARAGRAPH BELOW LIVE AGAIN, in its ORIGINAL form: the
 * neighbour underneath is the movement layer once more, and a press that fell
 * through would walk or dodge.  The guards do not change -- touchstart,
 * touchend and touchmove are all stopped, and they were written for exactly
 * this side.  What changes is which failure they prevent, so both are kept
 * below rather than one being swapped for the other: this button has now been
 * on both halves of the screen twice, and the next move should not have to
 * rediscover either list.
 *
 * ═══ IT MUST SWALLOW ITS OWN TOUCHES -- ON EITHER SIDE ═══
 * On the LEFT (v2.3.2472, and again now) the hazard is the movement layer:
 * `[data-joyzone="L"]`, the full-height left HALF at z6, whose touchstart
 * begins a walk and whose swipe dodges.  A press that leaked would move the
 * player instead of firing.  This is asserted with a REAL finger rather than a
 * dispatched event, because dispatchEvent does not hit-test and so cannot tell
 * a reachable button from an unreachable one (TRAPS 67).
 *
 * On the RIGHT (v2.3.2542, kept for the record) there were TWO things
 * underneath, and the owner named both:
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
 * classifies one again -- the first half of a pair.  v2.3.2542 unbound the
 * right control's double tap (BroTown's handleRBtnPress), so there is nothing
 * on this side counting taps today; the guard stays anyway, because the cost is
 * two lines and the failure it prevents is silent.
 *
 * ═══ WHERE ═══
 * v2.3.2574: slot 0 of the RIGHT cluster -- the lower-RIGHT of the diagonal
 * pair above the ATTACK disc, with Whirlwind up and to its left.  The owner,
 * correcting the message v2.3.2562 was built from: "Spec and swirl need to be
 * on the right joystick.  It was put on the left."
 *
 * So this button has now been on both sides twice (right at v2.3.2542, left at
 * v2.3.2562, right again here), which is worth stating plainly rather than
 * hiding: that is what it costs to settle a placement by playing it, and the
 * only reason it stays cheap is that the anchor is one shared function.  The
 * header's LEFT-side hazards above are kept verbatim for the same reason -- the
 * next move may need them again.
 *
 * Measured through rightCluster (ShieldButton.jsx) rather than with its own
 * numbers, for the reason ctlColumn existed: a control that writes its own
 * layout rule drifts from its neighbour, and the owner has paid for that three
 * times now (v2.3.2254's button behind the dashboard, v2.3.2327's bash too far
 * away, and the Element Burst button's hand-rolled anchor sitting 8px from
 * Shield Bash undetected until v2.3.2574 measured it).
 *
 * ITS SLOT DOES NOT DEPEND ON WHIRLWIND BEING DRAWN (and v2.3.2574 did not
 * change that -- both moved, neither learned about the other).  Whirlwind disappears out
 * of combat as of v2.3.2561, and slots are keyed by control, so this button
 * holds its pixels whether or not its neighbour is on screen.  A control that
 * moves when its neighbour hides is worse than either problem alone, and
 * mp-btnlayout asserts the position is identical in both states.
 *
 * ═══ WHEN ═══
 * Unchanged: the same shape of predicate as shieldButtonLive -- a weapon in the
 * active slot and a fight on or about to be.  Deliberately NOT gated on
 * affordability: a button that vanishes when the mana runs out is a button the
 * player cannot learn, so it greys and floats specialAttack's own "No mana!"
 * popup instead.
 */
const SPECIAL_CD_MS = 1500;   /* playerActions.specialAttack's own §4.5 gate */

/* ═══ v2.3.2543: A HELD SPECIAL IS A STATE OF THIS BUTTON, NOT A MESSAGE ═══
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
  if (isWheelSwimming(S)) return false;   /* v2.3.3003: only your head is out of the water */
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
  /* v2.3.3018: the cooldown's end, read here ABOVE the early returns (a hook)
     -- the glow swells once when the arc closes. */
  var flash = useReadyFlash(!!(S && SPECIAL_CD_MS - (Date.now() - (S._lastSwipe || 0)) > 0));
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
        /* v2.3.2543: the held-special state, which replaced a popup.  A
           scenario can read a flag; it cannot read a ring. */
        queued: specialQueued(s2) };
    };
  }
  if (!specialButtonLive(S, TARGET_PERIMETER_PX)) return null;

  /* v2.3.2574: the shared RIGHT cluster decides the size, the right edge and
     the slot height -- one rule for this button and Whirlwind beside it. */
  var col = rightCluster(isLandscape);
  var size = col.size;

  var cdLeft = Math.max(0, SPECIAL_CD_MS - (Date.now() - (S._lastSwipe || 0)));
  var cdFrac = cdLeft / SPECIAL_CD_MS;
  var cost = specialManaCost(S.rpg);
  var afford = (S.rpg.mana || 0) >= cost;
  var ready = cdLeft <= 0 && afford;
  /* v2.3.2543: a swipe the bow is holding until its line lands.  See the
     header -- this is where the 'Lining up...' popup went. */
  var queued = specialQueued(S);

  var press = function (e) {
    /* Both, and in this order -- see the header.  preventDefault stops iOS
       synthesising a click (and the page's own touch-scroll absorber from
       seeing it); stopPropagation keeps [data-joyzone="R"] and the attack disc
       beneath from reading the same finger as a lock-on, a swing or an aim. */
    e.preventDefault();
    e.stopPropagation();
    pressOn(e);   /* v2.3.3018: the sheet's Pressed, while the finger is down */
    try { specialAttack(stateRef.current); } catch (err) { /* refusals float their own popup */ }
    setTick(function (v) { return v + 1; });
  };

  /* ═══ v2.3.3018: THE MOCKUP'S STARBURST, IN ITS FIVE STATES ═══
     The ✶ character and the SPEC / "2s" words are gone for the owner's
     mockup: a starburst on a gold-ringed button (controlSkin).
       ready to fire      Normal
       cooling down       Cooldown -- dark, the star grey, a blue arc closing
                          round the ring (the "2s" it replaces is the same 1.5s
                          clock), and the glow swells once when it closes
       not enough mana    Disabled -- all grey (it was a 0.55 fade)
       the bow is holding Ready / Charged -- the ring lit and glowing, with
       your swipe         AIM under the star (v2.3.2543: the state is the
                          button's, and AIM is the one word that tells you what
                          to do about it -- move the line onto something)
     A cooldown wins over no-mana: the arc is the one with a clock on it. */
  var skinState = queued ? 'ready' : (cdLeft > 0 ? 'cooldown' : (!afford ? 'disabled' : 'normal'));
  var grey = skinState === 'cooldown' || skinState === 'disabled';

  return React.createElement('div', {
    className: 'bt-desktop-hide',
    'data-special': queued ? 'queued' : (ready ? 'ready' : 'wait'),
    onTouchStart: press,
    onMouseDown: press,
    /* v2.3.2542: a touch that ENDS here must not reach the zone either -- rE
       classifies every release on that side, forwards a short one to the canvas
       as a lock-on click (v2.3.816) and runs the flick test that fires the
       special a SECOND time. */
    onTouchEnd: function (e) { e.preventDefault(); e.stopPropagation(); pressOff(e); },
    onTouchCancel: pressOff,
    onMouseUp: pressOff,
    onMouseLeave: pressOff,
    onTouchMove: function (e) { e.stopPropagation(); },
    onContextMenu: function (e) { e.preventDefault(); },
    style: {
      position: 'fixed',
      right: col.rightPx(RCTL_SLOT.special),
      bottom: ctlBottom(col.bottomPx(RCTL_SLOT.special)),
      width: size, height: size, borderRadius: '50%',
      /* Above [data-joyzone="R"] (z6) and the attack disc's corner box (z30),
         the same rung ShieldButton and AbilityButtons sit on. */
      zIndex: 31,
      touchAction: 'none',
      pointerEvents: 'auto',
      /* No CSS filter at any state -- a filter on a DOM overlay compositing
         over the WebGL canvas is the documented iOS grain hazard (v2.3.948,
         v2.3.1236); the skin draws every state without one. */
      WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
    },
  },
  React.createElement(Skin, {
    size: size, tone: 'slate', state: skinState,
    progress: cdLeft > 0 ? 1 - cdFrac : null,
    flash: flash && skinState === 'normal',
  }, React.createElement(StarburstIcon, { size: Math.round(size * 0.7), grey: grey })),
  /* v2.3.2543: AIM, because that is the ACTION the state is asking for -- the
     shot goes the moment the line touches something, so the one useful thing
     the player can do with this information is move the line.  'QUEUED' would
     name the machinery instead, which is what the popup did. */
  queued ? React.createElement(SkinTag, null, 'AIM') : null);
}
