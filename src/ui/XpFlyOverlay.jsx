import React, { useEffect, useState } from 'react';

/* HudPopupOverlay — small "+N XP" / "+N G" popups anchored to HUD
   elements rather than to a world position.  Reads entries pushed to
   S._hudPopups by the combat-XP and gold-drop paths in BroTown.jsx.
   Each entry has { id, target, text, color, ts }.
   target = 'xpBar' anchors above the full-width XP strip that sits
   flush above the bottom dashboard.
   target = 'goldIcon' anchors just under the top-right gold pill.
   No arc — popups appear in place, drift up slightly, fade out.
   (Previously this file did an arc animation from the kill site to a
   stale 17vw/12vh target that pre-dated the full-width XP strip; the
   in-place HUD popup is what the user actually asked for.) */

const LIFE_MS = 1100;
const ENTRY_LIFETIME_MS = LIFE_MS + 100;
const STACK_SPACING_PX = 22;

export const XpFlyOverlay = () => {
  const [, force] = useState(0);

  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 80);
    return () => clearInterval(id);
  }, []);

  const S = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
  if (!S) return null;
  const pops = S._hudPopups || [];
  const now = Date.now();

  for (let i = pops.length - 1; i >= 0; i--) {
    if (now - pops[i].ts > ENTRY_LIFETIME_MS) pops.splice(i, 1);
  }
  if (!pops.length) return null;

  /* Per-target stack indices so concurrent pops don't overlap. */
  const stackByTarget = {};
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 90 }}>
      {pops.map(p => {
        const k = p.target || 'xpBar';
        const idx = stackByTarget[k] || 0;
        stackByTarget[k] = idx + 1;
        return <HudPopup key={p.id} pop={p} stackIdx={idx} />;
      })}
    </div>
  );
};

const HudPopup = ({ pop, stackIdx }) => {
  const [phase, setPhase] = useState(0); /* 0 = mounted, 1 = drifted */
  useEffect(() => {
    const id = requestAnimationFrame(() => setPhase(1));
    return () => cancelAnimationFrame(id);
  }, []);

  const isGold = pop.target === 'goldIcon';
  /* Anchor styles per target.  Gold pill is at top:6 right:6, ~32 px
     tall — popups fall just under it on the right edge.  XP strip is
     8 px tall and pinned to bottom: var(--dash-h) — popups float just
     above it on the right edge so they don't fight the dashboard. */
  const base = isGold
    ? {
        position: 'fixed',
        right: 'calc(env(safe-area-inset-right, 0px) + 12px)',
        top: 'calc(env(safe-area-inset-top, 0px) + 44px + ' + (stackIdx * STACK_SPACING_PX) + 'px)',
        textAlign: 'right',
      }
    : {
        position: 'fixed',
        right: 'calc(env(safe-area-inset-right, 0px) + 12px)',
        bottom: 'calc(var(--dash-h) + 14px + ' + (stackIdx * STACK_SPACING_PX) + 'px)',
        textAlign: 'right',
      };

  /* Phase 1 drift: gold sinks down 8 px, xp rises up 8 px. Both fade out. */
  const driftY = phase === 1 ? (isGold ? 8 : -8) : 0;

  return (
    <div
      style={{
        ...base,
        transform: 'translateY(' + driftY + 'px)',
        opacity: phase === 1 ? 0 : 1,
        color: pop.color || (isGold ? '#f5c542' : '#3ddc97'),
        fontFamily: 'Source Sans 3, sans-serif',
        fontWeight: 700,
        fontSize: 20,
        textShadow: '0 1px 2px rgba(0,0,0,.85), 0 0 4px rgba(0,0,0,.5)',
        transition: 'transform ' + LIFE_MS + 'ms ease-out, opacity ' + LIFE_MS + 'ms ease-in',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {pop.text}
    </div>
  );
};

/* Helper used by BroTown.jsx to enqueue a HUD-anchored popup. */
export function pushHudPopup(S, opts) {
  if (!S) return;
  if (!S._hudPopups) S._hudPopups = [];
  S._hudPopups.push({
    id: 'hp_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
    target: opts.target || 'xpBar',
    text: opts.text || '',
    color: opts.color || null,
    ts: Date.now(),
  });
}
