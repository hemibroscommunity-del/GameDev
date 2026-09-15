import React from 'react';
import { ABILITY_META } from '@/data/index.js';
import { abilityStatus, castAbility } from '@/game/abilities.js';
import { blockRingBus } from '@/ui/mobile/blockRingBus.js'; /* v2.3.2252: the bash button follows the shield's edge, not a 200ms poll */
import { ctlColumn, ctlBottom } from '@/ui/panels/ShieldButton.jsx'; /* v2.3.2472: the one shared left-of-the-disc column (D9) */

/* ═══ v2.3.2472: STACKED ABOVE THE BLOCK BUTTON ═══
   Owner decision D9: "Block left of the disc, abilities stacked above it."

   This is the third move for these two buttons and the first one that is not a
   position of their own.  v2.3.2254 put the column ABOVE the disc; v2.3.2327
   split it -- Shield Bash down and to the left, Whirlwind left where it was --
   because the owner said bash was "too far away" and two 48px buttons plus a
   gap did not fit in the 58px of band under the disc.  Neither placement had
   anything to do with the other controls: three files each wrote their own
   `right` expression and their own `bottom` constant.

   Now there is ONE column and ShieldButton owns its geometry (ctlColumn):
   Block at slot 0, level with the disc's centre, Bash at slot 1 and Whirlwind
   at slot 2 stacking upward from it.  The stack is vertical and unbounded
   upward, so the v2.3.2327 squeeze that forced the split does not exist any
   more -- the room that ran out was the band BELOW the disc, and nothing lives
   there now.

   Slots are assigned by KIND, not by position in `live`, so Whirlwind does not
   slide down into Bash's place on the frames where bash is hidden (it is
   visible only while the shield is raised, which is most frames).  A button
   that moves when its neighbour appears is a button the thumb misses. */
const SLOT_OF = { bash: 1, whirl: 2 };

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
    if (st.visible) live.push({ kind: kinds[i], st: st });
  }
  if (!live.length) return null;

  var col = ctlColumn(isLandscape);
  var size = col.size;

  /* One column, one rule: the slot number decides both axes.  The v2.3.2327
     note that used to live here -- "two single buttons in two places, no stack
     to overflow" -- described a workaround for a band that is no longer where
     these buttons live. */
  var slotStyle = function (kind) {
    return {
      right: col.right,
      bottom: ctlBottom(col.bottomPx(SLOT_OF[kind] || 1)),
    };
  };

  return React.createElement(React.Fragment, null, live.map(function (entry) {
    var kind = entry.kind, st = entry.st;
    var meta = ABILITY_META[kind] || { label: kind, glyph: '?' };
    var ready = st.cdLeft <= 0 && st.afford && st.equipped;
    var slot = slotStyle(kind);
    return React.createElement('div', {
      key: kind,
      className: 'bt-desktop-hide',
      'data-ability': kind,
      onTouchStart: function (e) {
        e.preventDefault();
        e.stopPropagation();
        try { castAbility(stateRef.current, kind); } catch (err) {}
      },
      onClick: function (e) {
        e.preventDefault();
        e.stopPropagation();
        try { castAbility(stateRef.current, kind); } catch (err) {}
      },
      style: {
        position: 'fixed',
        right: slot.right,
        bottom: slot.bottom,
        zIndex: 31,
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
        opacity: st.equipped ? 1 : 0.45,
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
