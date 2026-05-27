import React, { useEffect, useRef, useState } from 'react';

/* SpecialChargePie — 5-segment pie indicator anchored above the right
   joystick.  Replaces the in-world MP segment bar that previously sat
   above the player sprite (entityRenderer.js).  Each filled wedge =
   one special-attack charge.  The currently-empty slice sweeps
   clockwise as mana regenerates toward the next charge; the integer
   in that slice shows the count of charges currently ready.  Once all
   5 are full, the pie fades out and stays hidden until the next
   special is used.  See BroTown.jsx:doSpecialAttack for the
   maxMana/5-per-cast cost the visualization mirrors. */

const SEGMENTS = 5;
const SEG_DEG = 360 / SEGMENTS;
const FADE_MS = 300;

const polar = (cx, cy, r, deg) => {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
};

const pieWedge = (cx, cy, r, startDeg, endDeg) => {
  const [x1, y1] = polar(cx, cy, r, startDeg);
  const [x2, y2] = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return (
    'M' + cx + ',' + cy +
    ' L' + x1 + ',' + y1 +
    ' A' + r + ',' + r + ' 0 ' + large + ' 1 ' + x2 + ',' + y2 +
    ' Z'
  );
};

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
     size = 83 (portrait) / 98 (landscape).  Pie sits centered above
     it with an 8 px gap. */
  const joyW = isLandscape ? 98 : 83;
  const size = 64;
  const cx = size / 2;
  const cy = size / 2;
  const rOut = 30;
  const bottomVal = 'calc(var(--dash-h) + ' + (70 + joyW + 8) + 'px)';
  const rightVal  = (50 + (joyW - size) / 2) + 'px';

  const FILL    = '#4aa3ff';
  const EMPTY   = 'rgba(34, 42, 58, 0.85)';
  const DIVIDER = 'rgba(0, 0, 0, 0.7)';

  let numberPos = null;
  if (!isFull) {
    const sliceCenterDeg = -90 + (fullCharges + 0.5) * SEG_DEG;
    const rMid = rOut * 0.62;
    const [nx, ny] = polar(cx, cy, rMid, sliceCenterDeg);
    numberPos = { x: nx, y: ny };
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: bottomVal,
      right: rightVal,
      width: size,
      height: size,
      zIndex: 31,
      pointerEvents: 'none',
      opacity,
      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))',
    }}>
      <svg viewBox={'0 0 ' + size + ' ' + size} width={size} height={size}>
        {Array.from({ length: SEGMENTS }).map((_, i) => {
          const sDeg = -90 + i * SEG_DEG;
          const eDeg = -90 + (i + 1) * SEG_DEG;
          if (i < fullCharges) {
            return <path key={i} d={pieWedge(cx, cy, rOut, sDeg, eDeg)} fill={FILL} />;
          }
          if (i === fullCharges && partialFrac > 0) {
            const midDeg = sDeg + SEG_DEG * partialFrac;
            return (
              <g key={i}>
                <path d={pieWedge(cx, cy, rOut, sDeg, eDeg)} fill={EMPTY} />
                <path d={pieWedge(cx, cy, rOut, sDeg, midDeg)} fill={FILL} />
              </g>
            );
          }
          return <path key={i} d={pieWedge(cx, cy, rOut, sDeg, eDeg)} fill={EMPTY} />;
        })}
        {Array.from({ length: SEGMENTS }).map((_, i) => {
          const a = -90 + i * SEG_DEG;
          const [x2, y2] = polar(cx, cy, rOut, a);
          return <line key={'d' + i} x1={cx} y1={cy} x2={x2} y2={y2} stroke={DIVIDER} strokeWidth={1.5} />;
        })}
        <circle cx={cx} cy={cy} r={rOut} fill="none" stroke={DIVIDER} strokeWidth={1.5} />
        {numberPos && (
          <text
            x={numberPos.x}
            y={numberPos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Source Sans 3, sans-serif"
            fontWeight={800}
            fontSize={20}
            fill="#ffffff"
            stroke="rgba(0,0,0,0.85)"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {fullCharges}
          </text>
        )}
      </svg>
    </div>
  );
};
