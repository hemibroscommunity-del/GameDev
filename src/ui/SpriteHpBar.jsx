import React, { useEffect, useRef } from 'react';

/* v2.3.1273: DOM version of the owner's health-bar art (the canvas
   widgets live in entityRenderer).  Two-sprite technique: the empty
   frame paints the track, and the full red bar paints on top CLIPPED to
   the hp fraction — smooth at any percentage.  Damage feedback matches
   the canvas bars: a brief white flash over the remaining fill plus a
   white ghost segment that holds ~140ms then drains to the new value
   (constants mirror entityRenderer's v2.3.458 tuning).

   The ghost/flash animation runs on ONE mount-lifetime rAF loop that
   mutates the overlay divs directly (refs, no setState).  The first
   version re-armed the loop from a depless useEffect + forced renders;
   React's cleanup/re-schedule cycle starved it to roughly one tick per
   PARENT re-render, so the ghost took ~30s to drain instead of ~1s. */
const FRAME_URL = '/ui/bars/hp-frame.png?v=2.3.1273';
const FULL_URL = '/ui/bars/hp-full.png?v=2.3.1273';
/* Red fill inset within the sprite box (measured on the sheet). */
const IN_X = 5, IN_W = 90, IN_Y = 21, IN_H = 58; /* percents */
const GHOST_HOLD_MS = 140;
const GHOST_DRAIN_PER_S = 0.6;
const FLASH_MS = 160;

export const SpriteHpBar = ({ hp, maxHp, height = 14, style }) => {
  const frac = Math.max(0, Math.min(1, (maxHp || 0) > 0 ? (hp || 0) / maxHp : 0));
  const st = useRef({ ghost: frac, prev: frac, drainAt: 0, flashUntil: 0 });
  const ghostRef = useRef(null);
  const flashRef = useRef(null);
  const m = st.current;

  if (frac < m.prev - 0.0005) {          /* damage: arm flash + hold ghost */
    m.ghost = Math.max(m.ghost, m.prev);
    m.drainAt = performance.now() + GHOST_HOLD_MS;
    m.flashUntil = performance.now() + FLASH_MS;
  } else if (frac > m.prev) {
    m.ghost = frac;                       /* heal: snap up */
  }
  m.prev = frac;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - last) / 1000; last = now;
      if (now >= m.drainAt && m.ghost > m.prev) {
        m.ghost = Math.max(m.prev, m.ghost - GHOST_DRAIN_PER_S * dt);
      }
      const g = ghostRef.current;
      if (g) {
        const gw = m.ghost - m.prev;
        g.style.display = gw > 0.001 ? 'block' : 'none';
        g.style.left = `${IN_X + IN_W * m.prev}%`;
        g.style.width = `${IN_W * gw}%`;
      }
      const f = flashRef.current;
      if (f) {
        const fl = m.flashUntil - now;
        f.style.display = (fl > 0 && m.prev > 0) ? 'block' : 'none';
        f.style.opacity = fl > 0 ? String(0.85 * (fl / FLASH_MS)) : '0';
        f.style.width = `${IN_W * m.prev}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [m]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height,
      backgroundImage: `url('${FRAME_URL}')`,
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      ...style,
    }}>
      {/* ghost: the just-lost chunk, white, drains toward frac (rAF-driven) */}
      <div ref={ghostRef} style={{
        position: 'absolute',
        display: 'none',
        top: `${IN_Y}%`, height: `${IN_H}%`,
        background: 'rgba(255,255,255,.92)',
        pointerEvents: 'none',
      }} />
      {/* fill: full-bar art clipped to frac (background scaled 1/frac) */}
      {frac > 0.001 && (
        <div style={{
          position: 'absolute', inset: 0,
          width: `${frac * 100}%`,
          overflow: 'hidden',
          backgroundImage: `url('${FULL_URL}')`,
          backgroundSize: `${100 / frac}% 100%`,
          backgroundRepeat: 'no-repeat',
        }} />
      )}
      {/* white damage flash over the remaining fill (rAF-driven) */}
      <div ref={flashRef} style={{
        position: 'absolute',
        display: 'none',
        left: `${IN_X}%`,
        top: `${IN_Y}%`, height: `${IN_H}%`,
        background: '#fff',
        pointerEvents: 'none',
      }} />
    </div>
  );
};
