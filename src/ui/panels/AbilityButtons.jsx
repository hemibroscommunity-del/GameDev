import React from 'react';
import { ABILITY_META } from '@/data/index.js';
import { abilityStatus, castAbility } from '@/game/abilities.js';
import { blockRingBus } from '@/ui/mobile/blockRingBus.js'; /* v2.3.2252: the bash button follows the shield's edge, not a 200ms poll */
import { ctlColumn, ctlBottom, CTL_SLOT, rightCluster, RCTL_SLOT } from '@/ui/panels/ShieldButton.jsx'; /* v2.3.2574: both buttons are on the RIGHT again -- Bash in the column (slot 0), Whirlwind in the cluster above the disc */

/* ═══ v2.3.2574: BOTH BUTTONS ARE BACK ON THE RIGHT ═══
   Owner, correcting the message v2.3.2562 was built from: "Spec and swirl need
   to be on the right joystick.  It was put on the left."

   So Whirlwind comes back across to the right disc and sits ABOVE it, beside
   the Special button, in the mirrored cluster (rightCluster / RCTL_SLOT).
   Shield Bash -- still not mentioned in any of the owner's messages -- had to
   come DOWN one slot to make room, because the column's slot 1 is exactly the
   air the cluster's upper button needs; ShieldButton's CTL_SLOT note carries
   the measurement that forced it, and what it cost (the Element Burst button
   moved to the left disc).

   THE HISTORY BELOW STILL READS CORRECTLY as the record of what was tried; add
   this pass to the end of it rather than rewriting it. */
/* ═══ v2.3.2562: THE TWO BUTTONS ARE ON OPPOSITE SIDES NOW ═══
   Owner, after playing the merged build and sending a screenshot: "the
   placement of the buttons isn't ideal.  I'd like the whirlwind and special
   attack buttons diagonally above the left joystick ... and the shield block
   button to the diagonal bottom left of that right joystick."

   So Whirlwind leaves the D9 column for the LEFT disc (leftCluster), beside the
   Special button, and Shield Bash -- which the ask does not mention -- stays
   exactly where it is, in what is left of the column (ctlColumn, CTL_SLOT).

   THE HISTORY, because this cluster has moved four times and each move was
   made to undo the previous one's complaint:
     v2.3.2254  a column ABOVE the disc.
     v2.3.2327  split it -- Bash down and to the left ("too far away"),
                Whirlwind left where it was -- because two 48px buttons plus a
                gap did not fit in the 58px of band under the disc.
     v2.3.2472  D9: one column LEFT of the disc, Block at slot 0 level with its
                centre, Bash and Whirlwind stacking upward.  The squeeze that
                forced the v2.3.2327 split did not apply to a vertical stack.
     v2.3.2542  the Special button joined it at slot -1, and the slot map moved
                to ShieldButton's CTL_SLOT so four controls were one list.
     v2.3.2562  this: the column empties out to Bash alone.

   WHAT SURVIVES ALL OF IT, and is the reason the moves stay cheap: slots are
   assigned by CONTROL, never by position in `live`.  Bash does not slide when
   Whirlwind is hidden out of combat (v2.3.2561) and Special does not slide when
   Whirlwind is hidden beside it -- a button that moves when its neighbour
   appears or vanishes is a button the thumb misses.  And no control here
   computes its own anchor: ShieldButton owns both sides' geometry, because
   three files writing three layout rules is what cost the owner v2.3.2254's
   button behind the dashboard and v2.3.2327's bash too far away. */

/* ═══ v2.3.1733: THE ABILITY BUTTONS ═══
 *
 * PR 5's touch surface.  Two round targets stacked above the right (combat)
 * joystick — Shield Bash and Whirlwind — each appearing the moment its
 * milestone level is reached and not one level before.  THE VISIBILITY IS
 * THE FEATURE: the owner asked for levels that unlock things, and a button
 * arriving on the HUD is the most legible form that can take.
 *
 * WHY BUTTONS AND NOT ONLY THE PLANNED GESTURES.  The plan's touch inputs
 * were "tap attack while shield up" (shipped — see BroTown's rS handler) and
 * "long-press attack" for Whirlwind.  The long press could NOT ship as
 * specified: holding the right joystick IS the auto-attack input (rS sets
 * S.autoAttack on touchstart and the hold sustains it), so a long-press
 * trigger would fire Whirlwind every few seconds during ordinary
 * auto-attacking, spending 40% of the stamina bar the player is trying to
 * hold their shield with.  A button is deliberate, discoverable, greys out
 * with an honest reason, and shows its cooldown — which a hidden gesture
 * cannot.  Desktop keeps E / R as specified.
 *
 * Everything drawn here is a PREDICTION (src/data/abilities.js mirrors the
 * server's table); the worker validates every cast independently and
 * ability_rejected explains any disagreement.
 *
 * bt-desktop-hide matches the joysticks: on a mouse the keys are the input,
 * and the keyboard hints strip advertises them.
 */
export function AbilityButtons(props) {
  var stateRef = props.stateRef;
  var isLandscape = props.isLandscape;
  /* Cooldown sweep + stamina affordability change without a React state
     change, so tick a cheap counter.  200 ms: fast enough that a 4 s sweep
     reads as motion, slow enough to be free next to the game loop. */
  var _tick = React.useState(0);
  var setTick = _tick[1];
  React.useEffect(function () {
    var id = setInterval(function () { setTick(function (v) { return (v + 1) % 1000000; }); }, 200);
    /* ═══ v2.3.2252: THE SHIELD MOVES THIS BUTTON, SO IT MUST NOT WAIT ═══
       Shield Bash's button is visible exactly while the shield is RAISED
       (game/abilities.abilityStatus).  On the 200ms poll alone that reads as a
       button that arrives late and lingers after the shield drops -- and the
       lingering half is worse than cosmetic: a tap in that window routes into
       castAbility, which re-checks the live state and refuses, so the button is
       on screen and dead.  blockRingBus is the bus shieldToggle already emits
       on for every raise and drop, so the button re-renders on the same edge
       the shield does. */
    var off = blockRingBus.subscribe(function () { setTick(function (v) { return (v + 1) % 1000000; }); });
    return function () { clearInterval(id); try { off(); } catch (e) { /* already gone */ } };
  }, [setTick]);

  var S = stateRef && stateRef.current;
  if (!S || !S.rpg) return null;

  var kinds = ['bash', 'whirl'];
  var live = [];
  for (var i = 0; i < kinds.length; i++) {
    var st = abilityStatus(S, kinds[i]);
    /* ═══ v2.3.2561: OUT OF COMBAT, WHIRLWIND IS NOT ON SCREEN AT ALL ═══
       Owner, after playing the v2.3.2542 build: the button should disappear
       when you are not in combat rather than grey out.

       FILTERED HERE, NOT FOLDED INTO `visible`, and that is the whole shape of
       this change.  `visible` is also what castAbility gates on
       (game/abilities.js), so moving the lock into it would kill the
       "Not in combat!" popup on every path -- including the desktop R key,
       where this component is bt-desktop-hide and the popup is the only
       feedback there is.  So the CAST rule and the BUTTON rule are different
       rules now: abilityStatus still reports `engaged` honestly, castAbility
       still refuses out loud, and only the render list narrows.

       Slots are assigned by CONTROL (CTL_SLOT in the column, RCTL_SLOT in the
       cluster above the disc, LCTL_SLOT over the movement disc), so nothing
       slides into Whirlwind's place on the frames where it is gone -- not
       Shield Bash below it and not the Special button beside it.  v2.3.2574
       moved every one of those controls and none of them had to learn about
       the others, which is the whole return on keying slots by control.

       No linger, and no CSS gate.  A real unmount rather than opacity/
       visibility, because a hidden-but-present box still answers
       getBoundingClientRect and still takes taps (TRAPS §41) -- nothing anchors
       onboarding to this button (ControlsTutorial and QuestCoach ring
       .bt-rjoy-base and [data-shield], never [data-ability]), so there is no
       coach mark to leave ringing empty air.  And the gate does not chatter:
       targeting.js takes the lock at 220px and holds it to 275 (TARGET_HYST),
       so a monster pacing the perimeter cannot flicker the button.  That 55px
       dead band is why the right disc's 400ms linger (LANTERN-SLATE-SPEC
       v2.3.2246) is not needed here -- the disc lingers because ITS input is
       bare candidacy, which has no hysteresis of its own. */
    if (st.visible && st.engaged !== false) live.push({ kind: kinds[i], st: st });
  }
  if (!live.length) return null;

  /* ═══ v2.3.2574: SAME SIDE AGAIN, DIFFERENT HEIGHTS ═══
     Whirlwind sits in the cluster ABOVE the attack disc and Shield Bash beside
     it, level with its centre.  One component still renders both, because what
     they share is their BEHAVIOUR (the same status, cooldown sweep, cast routing
     and refusal) -- only the anchor differs, and the anchor is the one thing
     neither of them computes for itself.  Both helpers live in
     ShieldButton.jsx, so a third control arriving in either place inherits the
     rule rather than copying it -- which is exactly what went wrong for the
     Element Burst button, whose hand-rolled anchor drifted to within 8px of
     Bash without anything noticing (see leftCluster). */
  var rcol = ctlColumn(isLandscape);
  var rclu = rightCluster(isLandscape);

  var anchorOf = function (kind) {
    /* v2.3.2574: the cluster above the disc, checked first.  Same
       hasOwnProperty test the column uses below and for the same reason --
       RCTL_SLOT's members are legally 0. */
    if (Object.prototype.hasOwnProperty.call(RCTL_SLOT, kind)) {
      return {
        size: rclu.size,
        right: rclu.rightPx(RCTL_SLOT[kind]),
        bottom: ctlBottom(rclu.bottomPx(RCTL_SLOT[kind])),
      };
    }
    /* hasOwnProperty, NOT `|| 1` (v2.3.2542): CTL_SLOT's members can legally be
       0 or negative, and `0 || 1` is Shield Bash's own slot -- which would
       stack an unknown control exactly on top of it at z31. */
    return {
      size: rcol.size,
      right: rcol.right,
      bottom: ctlBottom(rcol.bottomPx(
        Object.prototype.hasOwnProperty.call(CTL_SLOT, kind) ? CTL_SLOT[kind] : 1)),
    };
  };

  return React.createElement(React.Fragment, null, live.map(function (entry) {
    var kind = entry.kind, st = entry.st;
    var meta = ABILITY_META[kind] || { label: kind, glyph: '?' };
    /* v2.3.2542: `engaged` joins the ready test, so the brass edge and the
       bright label cannot say "live" while castAbility refuses.
       v2.3.2561: the filter above means a rendered button is always engaged, so
       this term no longer decides anything -- KEPT as the belt to that braces.
       It is the term that stops a button from painting itself live in the
       ~200ms window between the lock dropping and the next tick re-rendering,
       if a future change ever renders an unengaged ability for its own reason. */
    var ready = st.cdLeft <= 0 && st.afford && st.equipped && st.engaged !== false;
    var anchor = anchorOf(kind);
    var size = anchor.size;
    return React.createElement('div', {
      key: kind,
      className: 'bt-desktop-hide',
      'data-ability': kind,
      /* v2.3.2542: the button's own answer to "why is this dim", for QA and for
         anyone reading the DOM -- a screenshot cannot separate a cooldown from
         an unmet stance rule. */
      'data-ready': ready ? '1' : '0',
      'data-engaged': st.engaged === false ? '0' : '1',
      /* v2.3.2542: the press routes into castAbility, which re-checks the LIVE
         state and floats the reason instead of leaving the player to guess why
         nothing happened.
         v2.3.2561: still deliberate.  Out of combat there is no longer a button
         to press -- but the 200ms tick means one can survive a few frames past
         the lock dropping, and that press must still say "Not in combat!"
         rather than die quietly (the v2.3.2252 "on screen and dead" window). */
      onTouchStart: function (e) {
        e.preventDefault();
        e.stopPropagation();
        try { castAbility(stateRef.current, kind); } catch (err) {}
      },
      /* ═══ v2.3.2562: THE RELEASE AND THE DRAG ARE STOPPED TOO ═══
         v2.3.2574: the zone underneath is [data-joyzone="R"] now rather than
         "L" -- both buttons came back to the right side -- and the guards stay,
         because the right half is a touch zone too (rZoneRef, z6, the lock-on
         and attack surface).  A tap that fell through it would forward a lock-on
         click to the canvas, which is the reason ShieldButton's header gives for
         every control over there stopping its events.  Stopping only the
         touchstart would leave a release, or a thumb that slid a few px, to be
         read by the zone, so all three are stopped -- the same three
         SpecialButton has carried since v2.3.2472.

         KEEP THEM IF EITHER BUTTON EVER CROSSES BACK.  Over [data-joyzone="L"]
         the same leak is worse: touchstart there begins a WALK and a swipe
         dodges, and lM/lE are bound to WINDOW (BroTown ~9345), so a leak would
         not even need the zone element in the propagation path. */
      onTouchEnd: function (e) { e.preventDefault(); e.stopPropagation(); },
      onTouchMove: function (e) { e.stopPropagation(); },
      onClick: function (e) {
        e.preventDefault();
        e.stopPropagation();
        try { castAbility(stateRef.current, kind); } catch (err) {}
      },
      style: {
        position: 'fixed',
        /* One or the other, never both: an `undefined` here leaves the property
           unset, so the button hangs from the side its anchor named. */
        left: anchor.left,
        right: anchor.right,
        bottom: anchor.bottom,
        /* Above the joystick zones (z6) and both discs' corner boxes (z30). */
        zIndex: 31,
        pointerEvents: 'auto',
        width: size,
        height: size,
        borderRadius: '50%',
        touchAction: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        /* Lantern Slate: raised actionable surface, brass edge when live. */
        background: ready
          ? 'radial-gradient(circle, #34444B 0%, #202C32 100%)'
          : 'radial-gradient(circle, #1A2429 0%, #141C21 100%)',
        border: '2px solid ' + (ready ? '#D8A85F' : 'rgba(238,242,235,.14)'),
        boxShadow: ready ? 'inset 0 1px 0 rgba(255,255,255,.08)' : 'none',
        /* The 0.45 "you cannot use this yet" wash the missing-weapon case has
           used since v2.3.1733.  v2.3.2542 extended it to the engagement rule;
           v2.3.2561 hides that case instead, so in practice this is the
           missing-weapon wash again -- the `engaged` term is kept for the same
           reason as the one in `ready` above. */
        opacity: (st.equipped && st.engaged !== false) ? 1 : 0.45,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        lineHeight: 1,
      },
    },
    /* Cooldown sweep — a conic wedge that unwinds, masked to a ring so the
       glyph stays readable.  No filter/drop-shadow: those composite as
       grainy static over the WebGL canvas on iOS (v2.3.1236). */
    st.cdFrac > 0 && React.createElement('div', {
      style: {
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'conic-gradient(from -90deg, rgba(0,0,0,.55) 0deg, rgba(0,0,0,.55) '
          + Math.round(st.cdFrac * 360) + 'deg, transparent ' + Math.round(st.cdFrac * 360) + 'deg)',
        pointerEvents: 'none',
      },
    }),
    React.createElement('span', {
      style: { fontSize: isLandscape ? 20 : 18, pointerEvents: 'none' },
    }, meta.glyph),
    React.createElement('span', {
      style: {
        fontSize: 11, fontWeight: 700, letterSpacing: '.04em',
        color: ready ? '#F7F2E7' : '#687575', pointerEvents: 'none', marginTop: 2,
      },
    }, st.cdLeft > 0 ? (Math.ceil(st.cdLeft / 1000) + 's') : meta.label));
  }));
}
