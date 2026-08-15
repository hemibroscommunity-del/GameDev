import React from 'react';
import { ABILITY_META } from '@/data/index.js';
import { abilityStatus, castAbility } from '@/game/abilities.js';

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
    return function () { clearInterval(id); };
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

  var size = isLandscape ? 54 : 48;
  return React.createElement('div', {
    className: 'bt-desktop-hide',
    style: {
      position: 'fixed',
      /* Above the right joystick disc (which sits at sheet-h + 70) and clear
         of the sheet, so an open menu never traps the buttons. */
      bottom: 'calc(var(--sheet-h, var(--dash-h)) + 178px)',
      right: isLandscape ? 22 : 18,
      zIndex: 31,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      WebkitUserSelect: 'none',
      userSelect: 'none',
    },
  }, live.map(function (entry) {
    var kind = entry.kind, st = entry.st;
    var meta = ABILITY_META[kind] || { label: kind, glyph: '?' };
    var ready = st.cdLeft <= 0 && st.afford && st.equipped;
    return React.createElement('div', {
      key: kind,
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
        width: size,
        height: size,
        borderRadius: '50%',
        position: 'relative',
        touchAction: 'none',
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
        fontSize: 10, fontWeight: 700, letterSpacing: '.04em',
        color: ready ? '#F7F2E7' : '#687575', pointerEvents: 'none', marginTop: 2,
      },
    }, st.cdLeft > 0 ? (Math.ceil(st.cdLeft / 1000) + 's') : meta.label));
  }));
}
