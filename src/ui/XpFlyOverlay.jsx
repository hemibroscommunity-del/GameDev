import React, { useEffect, useState } from 'react';

/* XpFlyOverlay — reads S._xpFlies entries pushed by the kill-reward path
   in BroTown.jsx and renders each as a fixed-position floating "+N XP"
   that arcs from the kill location toward the dashboard's XP bar.
   Mirrors the fish-to-bag animation in FishingMinigame.jsx but for the
   kill-XP feedback loop. Each entry self-removes after FLY_MS. */

const FLY_MS = 700;
const ENTRY_LIFETIME_MS = FLY_MS + 200;

// XP bar approximate target — sits in the left column of the dashboard,
// at the bottom of the four-bar stack (HP, Mana, Energy, XP).  Dashboard
// height is var(--dash-h) ~ 28vh, icon row consumes ~30% of that, and the
// XP bar is the bottom-most bar in the stack above the icon row.
const TARGET_LEFT = '17vw';     // horizontal centre of the left column
const TARGET_BOTTOM = '12vh';   // approximately the XP bar's vertical centre

export const XpFlyOverlay = () => {
  const [, force] = useState(0);

  // Tick every 80ms so newly-pushed entries get rendered promptly and
  // expired ones get culled.  rAF would be smoother but the entries
  // animate via CSS transition on the elements themselves; we just need
  // to mount/unmount them in time.
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 80);
    return () => clearInterval(id);
  }, []);

  const S = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
  if (!S) return null;
  const flies = S._xpFlies || [];
  const now = Date.now();

  // Cull expired entries in-place so we don't accumulate forever.
  for (let i = flies.length - 1; i >= 0; i--) {
    if (now - flies[i].ts > ENTRY_LIFETIME_MS) flies.splice(i, 1);
  }
  if (!flies.length) return null;

  const cx = (S.camera && S.camera.x) || 0;
  const cy = (S.camera && S.camera.y) || 0;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 90 }}>
      {flies.map(f => <XpFly key={f.id} fly={f} cx={cx} cy={cy} />)}
    </div>
  );
};

// Each XpFly mounts at the kill's CSS coords, then on the next frame
// flips to the target coords so the CSS transition fires.  Removes
// itself from S._xpFlies on transitionend (parent re-render culls it).
const XpFly = ({ fly, cx, cy }) => {
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setArrived(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Start position in CSS pixels: world → css conversion is 1:1 in the
  // active Canvas 2D path (setTransform(dpr, 0, 0, dpr), no Y compression).
  const startLeft = (fly.worldX - cx) + 'px';
  const startTop = (fly.worldY - cy) + 'px';

  return (
    <div
      style={{
        position: 'fixed',
        left: arrived ? TARGET_LEFT : startLeft,
        top: arrived ? 'auto' : startTop,
        bottom: arrived ? TARGET_BOTTOM : 'auto',
        transform: 'translate(-50%, -50%) scale(' + (arrived ? 0.6 : 1.0) + ')',
        opacity: arrived ? 0 : 1,
        color: '#3ddc97',
        fontFamily: 'VT323, monospace',
        fontWeight: 700,
        fontSize: 22,
        textShadow: '0 1px 2px rgba(0,0,0,.85), 0 0 4px rgba(61,220,151,.55)',
        transition: 'left ' + FLY_MS + 'ms cubic-bezier(.25,.6,.4,1), top ' + FLY_MS + 'ms cubic-bezier(.25,.6,.4,1), bottom ' + FLY_MS + 'ms cubic-bezier(.25,.6,.4,1), transform ' + FLY_MS + 'ms ease-out, opacity ' + FLY_MS + 'ms ease-in 200ms',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      +{fly.value} XP
    </div>
  );
};
