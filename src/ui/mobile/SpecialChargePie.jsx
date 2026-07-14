import React, { useEffect, useRef, useState } from 'react';

/* SpecialChargePie — big-number + thin progress ring above the right
   joystick.  Replaces the in-world MP segment bar that used to float
   above the player sprite (entityRenderer.js).
   - Center number = special-attack charges currently ready.
   - Ring around it sweeps clockwise from 12 o'clock to show how
     close the next charge is.  When the ring completes, the number
     ticks up by 1 and the ring resets.
   - Fades out once charges hit max (R.mana >= R.maxMana) so the HUD
     stays clean during full-charge play; reappears the moment a
     special is fired and mana drops below full.
   See BroTown.jsx:doSpecialAttack for the per-cast mana cost
   (floor(maxMana / 5)) the visualization mirrors. */

const SEGMENTS = 5;
const FADE_MS = 300;

export const SpecialChargePie = () => {
  const [, force] = useState(0);
  const [isLandscape, setIsLandscape] = useState(
    typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false
  );
  const fullSinceRef = useRef(null);

  useEffect(() => {
    let raf;
    const tick = () => {
      force(v => v + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    const onResize = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const S = (typeof window !== 'undefined' && window._gameState) ? window._gameState.current : null;
  const R = S && S.rpg;
  if (!R || !R.maxMana) return null;

  const cur = Math.max(0, Math.min(R.maxMana, R.mana || 0));
  const max = R.maxMana;
  const fillFront = (cur / max) * SEGMENTS;
  const fullCharges = Math.min(SEGMENTS, Math.floor(fillFront + 1e-6));
  const partialFrac = fullCharges < SEGMENTS ? (fillFront - fullCharges) : 0;
  const isFull = fullCharges >= SEGMENTS;

  if (isFull) {
    if (fullSinceRef.current == null) fullSinceRef.current = Date.now();
  } else {
    fullSinceRef.current = null;
  }
  const sinceFull = fullSinceRef.current ? Date.now() - fullSinceRef.current : 0;
  const opacity = isFull ? Math.max(0, 1 - sinceFull / FADE_MS) : 1;
  if (opacity <= 0.001) return null;

  /* Joystick footprint: bottom = var(--dash-h) + 70px, right = 50px,
     size = 83 (portrait) / 98 (landscape).  Indicator sits centered
     above it with an 8 px gap. */
  const joyW = isLandscape ? 98 : 83;
  const size = 40;
  const cx = size / 2;
  const cy = size / 2;
  /* 40 px overall.  Ring annulus is half the radius (10 px wide),
     leaving a 20 px-diameter dark center for the number. */
  const ringR = 15;
  const strokeW = 10;
  const diskR = ringR - strokeW / 2;
  const C = 2 * Math.PI * ringR;
  const bottomVal = 'calc(var(--dash-h) + ' + (70 + joyW + 8) + 'px)';
  const rightVal  = (50 + (joyW - size) / 2) + 'px';

  const RING_FG   = '#4aa3ff';
  const RING_BG   = 'rgba(34, 42, 58, 0.9)';
  const DISK_FILL = 'rgba(15, 19, 30, 0.78)';
  const DISK_EDGE = 'rgba(0, 0, 0, 0.6)';

  return (
    /* v2.3.1288: className hooks the expanded-sheet dim (game.css,
       nav-system PR B).  The charge-full fade `opacity` moved off this
       root onto the <svg> — an inline opacity here would beat the
       class rule (inline > selector), so the two effects live on
       separate elements and simply multiply. */
    <div className="bt-charge-pie" style={{
      position: 'fixed',
      bottom: bottomVal,
      right: rightVal,
      width: size,
      height: size,
      zIndex: 31,
      pointerEvents: 'none',
      /* v2.3.948: drop-shadow removed -- on iOS a CSS drop-shadow filter on a DOM
         overlay compositing over the WebGL canvas produced grainy "static" on the
         pie (the next suspect flagged in CLAUDE.md after the strokeDasharray fix).
         The disk fill + edge stroke below already give it definition. */
    }}>
      <svg viewBox={'0 0 ' + size + ' ' + size} width={size} height={size} style={{ opacity, display: 'block' }}>
        <circle cx={cx} cy={cy} r={diskR} fill={DISK_FILL} stroke={DISK_EDGE} strokeWidth={1} />
        <circle cx={cx} cy={cy} r={ringR} fill="none" stroke={RING_BG} strokeWidth={strokeW} />
        <circle
          cx={cx}
          cy={cy}
          r={ringR}
          fill="none"
          stroke={RING_FG}
          strokeWidth={strokeW}
          strokeLinecap="butt"
          /* Fixed-point formatting: tiny fractions stringify in exponent
             notation (9.4e-7), which some SVG dasharray parsers reject --
             an invalid dasharray falls back to a SOLID stroke, flashing a
             full blue ring over the indicator for a frame whenever the
             ring resets near zero. */
          strokeDasharray={(Math.max(0, partialFrac) * C).toFixed(2) + ' ' + C.toFixed(2)}
          transform={'rotate(-90 ' + cx + ' ' + cy + ')'}
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Source Sans 3, sans-serif"
          fontWeight={800}
          fontSize={15}
          fill="#ffffff"
          stroke="rgba(0,0,0,0.85)"
          strokeWidth={2}
          paintOrder="stroke"
        >
          {fullCharges}
        </text>
      </svg>
    </div>
  );
};
