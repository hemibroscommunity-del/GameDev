import React, { useEffect, useState } from 'react';
import { RBTN } from '@/ui/panels/ShieldButton.jsx'; /* v2.3.2229: right-button geometry */
import { playIsLandscape } from './playViewport.js';
import { PROG3, burstRefusal, burstWeapon } from '@/data/prog3.js';
import { ELEMENTS } from '@/data/elements.js';
import { elementBurst } from '@/game/playerActions.js';

/* ═══ v2.3.1734: ELEMENT BURST BUTTON (COMBAT-OVERHAUL-PLAN PR 6) ═══
 *
 * iPhone Safari is the primary platform, so the ability's real input is
 * this button and the desktop G key is the second door — not the other
 * way round.
 *
 * IT APPEARS ONLY WHEN ELIGIBLE, and that is the design, not laziness
 * about disabled states.  The bottom band is the most contested space in
 * the game and a permanently-parked button for an ability most characters
 * cannot use yet would cost every player screen real estate to advertise
 * something to a few.  The moment you equip an enchanted weapon at level
 * 6+ it fades in, tinted with THAT weapon's element, which is also how a
 * player learns the two are connected without a tutorial line.
 *
 * (Eligibility here is a DISPLAY gate.  burstRefusal is the same function
 * the action itself calls, and the server re-decides all four conditions
 * from its own state — burst.js _burstRefusal.  Deleting this component in
 * devtools buys nothing.)
 *
 * Sits on the LEFT of the right-joystick assembly, mirroring the charge
 * pie's placement above it, so the thumb that already lives there reaches
 * it without crossing the screen.  Same fixed-position idiom, same
 * --sheet-h keying, so it rides above an open sheet like the pie does.
 *
 * NO drop-shadow filter — v2.3.948's iOS incident (a CSS drop-shadow on a
 * DOM overlay compositing over the WebGL canvas produced grainy static on
 * the charge pie).  Definition comes from the fill and the border.
 */

const SIZE = 46;
const FADE_MS = 180;

export const ElementBurstButton = () => {
  const [, force] = useState(0);
  const [isLandscape, setIsLandscape] = useState(playIsLandscape());

  useEffect(() => {
    let raf;
    const tick = () => { force((v) => v + 1); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    const onResize = () => setIsLandscape(playIsLandscape());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const S = (typeof window !== 'undefined' && window._gameState) ? window._gameState.current : null;
  const R = S && S.rpg;
  if (!R) return null;

  const wpn = burstWeapon(R);   /* NOT getActiveWeapon — see burstWeapon's note */
  /* Pass no cast time: the cooldown must NOT hide the button, or it would
     blink out of existence for three seconds every time it is used and the
     thumb would have nothing to aim at.  Cooldown is drawn instead. */
  const refusal = burstRefusal(R, wpn, 0);
  /* `mana` is the one refusal that keeps the button on screen — dimmed.
     It is the state a player is in constantly and the one where seeing the
     button (and the mana bar refilling) is the whole feedback loop. */
  if (refusal && refusal !== 'mana') return null;

  const element = wpn && wpn.element1;
  const color = (ELEMENTS[element] && ELEMENTS[element].color) || '#8E44AD';
  const now = Date.now();
  const cdLeft = Math.max(0, PROG3.BURST_CD_MS - (now - (S._lastBurstAt || 0)));
  const cdFrac = cdLeft / PROG3.BURST_CD_MS;
  const ready = !refusal && cdLeft <= 0;

  /* Joystick footprint, same measurements SpecialChargePie works from:
     bottom = var(--dash-h) + 70px, right = 50px, size 83 / 98. */
  const joyW = isLandscape ? RBTN.wLand : RBTN.w;   /* v2.3.2229: the disc grew; one source of truth */
  const bottomVal = 'calc(var(--sheet-h, var(--dash-h)) + ' + (70 + (joyW - SIZE) / 2) + 'px)';
  const rightVal = (50 + joyW + 10) + 'px';

  const press = (e) => {
    e.preventDefault();
    e.stopPropagation();   /* the canvas under this takes taps as attacks */
    if (!ready) return;
    elementBurst(S);
  };

  return (
    <div
      className="bt-burst-btn"
      onPointerDown={press}
      role="button"
      aria-label="Element Burst"
      style={{
        position: 'fixed',
        bottom: bottomVal,
        right: rightVal,
        width: SIZE,
        height: SIZE,
        zIndex: 31,
        borderRadius: '50%',
        background: 'rgba(15, 19, 30, 0.82)',
        border: '2px solid ' + color,
        opacity: ready ? 1 : 0.45,
        transition: 'opacity ' + FADE_MS + 'ms linear',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}
    >
      <svg viewBox={'0 0 ' + SIZE + ' ' + SIZE} width={SIZE} height={SIZE} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {/* The nova the button fires, drawn as the button: a filled core
            with two rings at the ratio the ability actually uses. */}
        <circle cx={SIZE / 2} cy={SIZE / 2} r={7} fill={color} opacity={ready ? 0.95 : 0.6} />
        <circle cx={SIZE / 2} cy={SIZE / 2} r={12} fill="none" stroke={color} strokeWidth={1.5} opacity={0.65} />
        <circle cx={SIZE / 2} cy={SIZE / 2} r={17} fill="none" stroke={color} strokeWidth={1} opacity={0.35} />
        {cdFrac > 0 && (
          /* Cooldown sweep on the rim — the same clockwise-from-12
             dasharray idiom as the charge pie, INCLUDING its fixed-point
             formatting: tiny fractions stringify in exponent notation
             (9.4e-7), which some SVG parsers reject, and an invalid
             dasharray falls back to a SOLID stroke (v2.3.10 incident). */
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={(SIZE - 6) / 2}
            fill="none"
            stroke="rgba(0,0,0,0.62)"
            strokeWidth={4}
            strokeLinecap="butt"
            strokeDasharray={(cdFrac * (Math.PI * (SIZE - 6))).toFixed(2) + ' ' + (Math.PI * (SIZE - 6)).toFixed(2)}
            transform={'rotate(-90 ' + (SIZE / 2) + ' ' + (SIZE / 2) + ')'}
          />
        )}
      </svg>
    </div>
  );
};
