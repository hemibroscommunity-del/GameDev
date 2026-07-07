import React, { useEffect, useState } from 'react';
import { controlsTutorialBus } from './controlsTutorialBus.js';
import { dashboardPanelBus } from './dashboardPanelBus.js';

/* v2.3.1205: REBUILT as live DOM-anchored annotations.  The previous
   version dimmed the screen over a frozen screenshot
   (public/ui/controls-screenshot.webp, callout coordinates eyeballed
   at v2.3.221) — every HUD change since silently made it lie.  Now,
   on open, we getBoundingClientRect() the REAL controls (joystick
   visuals, the dashboard's Bag/Loadout/Build columns + Chat/More
   toolbar buttons via data-tut anchors added in BottomDashboard.jsx)
   and draw a dim backdrop with a highlight cutout + labelled bubble
   per target.  Targets that aren't in the DOM are skipped, so future
   HUD changes degrade to fewer callouts instead of wrong ones.  The
   screenshot was deleted (git-recoverable).

   Bus API unchanged: controlsTutorialBus.open()/close(); overlay z
   stays 9300 (see src/ui/zLayers.js ladder). */

/* Callout registry — sel is a live-DOM selector.  shape 'circle'
   rings round controls; default is a rounded-rect cutout.  anchor
   'T' puts the bubble above the target, 'B' below. */
const CALLOUTS = [
  { sel: '.bt-joystick-zone',        shape: 'circle', anchor: 'T',
    label: 'Move',    desc: 'Drag the left stick' },
  { sel: '.bt-rjoy-base',            shape: 'circle', anchor: 'T',
    label: 'Attack',  desc: 'Drag the right stick — hold for special' },
  { sel: '[data-tut="dash-bag"]',    anchor: 'T',
    label: 'Bag',     desc: 'Recent pickups — tap to open the full bag' },
  { sel: '[data-tut="dash-loadout"]', anchor: 'T',
    label: 'Loadout', desc: 'Tap a slot to equip / unequip' },
  { sel: '[data-tut="dash-build"]',  anchor: 'T',
    label: 'Build',   desc: 'Your stats — tap a cell for details' },
  { sel: '[data-tut="dash-chat"]',   anchor: 'T',
    label: 'Chat',    desc: 'Toggle the chat bubble' },
  { sel: '[data-tut="dash-more"]',   anchor: 'T',
    label: 'More',    desc: 'Map, guild, settings…' },
];

const COL = {
  card:    'rgba(15,17,26,0.92)',
  border:  'rgba(255,255,255,0.18)',
  accent:  '#f5c542',
  text:    '#f0ece0',
  muted:   '#9a978c',
};

/* Measure every callout's live element.  Missing / zero-size elements
   (e.g. joysticks on desktop, or a mid-transition dashboard) are
   skipped — never guessed at. */
function measureTargets() {
  const out = [];
  for (const c of CALLOUTS) {
    let el = null;
    try { el = document.querySelector(c.sel); } catch (_e) {}
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (!r || r.width < 2 || r.height < 2) continue;
    out.push({ ...c, rect: { left: r.left, top: r.top, width: r.width, height: r.height } });
  }
  return out;
}

export const ControlsTutorial = () => {
  const [, setV] = useState(0);
  const [targets, setTargets] = useState([]);
  useEffect(() => controlsTutorialBus.subscribe(() => setV(v => v + 1)), []);
  const open = controlsTutorialBus.isOpen();

  /* On open: pop the dashboard back to its idle 3-column view (the
     tutorial is launched from the More panel, which unmounts the
     columns it needs to annotate), then measure on the next frame +
     two settle retries.  Re-measure on resize / orientationchange;
     all listeners cleaned up on close/unmount. */
  useEffect(() => {
    if (!open) return undefined;
    try { dashboardPanelBus.clear(); } catch (_e) {}
    const measure = () => setTargets(measureTargets());
    const raf = requestAnimationFrame(measure);
    const t1 = setTimeout(measure, 120);
    const t2 = setTimeout(measure, 400);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [open]);

  if (!open) return null;

  const onClose = () => controlsTutorialBus.close();
  const vw = window.innerWidth || 1;
  const PAD = 5; // breathing room between element edge and cutout

  return (
    <div
      onPointerDown={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9300,
        fontFamily: 'Source Sans 3, system-ui, sans-serif',
        touchAction: 'none',
      }}
    >
      {/* Dim backdrop with a cutout per live target (SVG mask), plus an
          accent ring so each highlighted control pops. */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <defs>
          <mask id="bt-tut-cutouts">
            <rect x="0" y="0" width="100%" height="100%" fill="#fff" />
            {targets.map((t, i) => t.shape === 'circle' ? (
              <circle key={i}
                cx={t.rect.left + t.rect.width / 2}
                cy={t.rect.top + t.rect.height / 2}
                r={Math.max(t.rect.width, t.rect.height) / 2 + PAD}
                fill="#000" />
            ) : (
              <rect key={i}
                x={t.rect.left - PAD} y={t.rect.top - PAD}
                width={t.rect.width + PAD * 2} height={t.rect.height + PAD * 2}
                rx={8} fill="#000" />
            ))}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.72)" mask="url(#bt-tut-cutouts)" />
        {targets.map((t, i) => t.shape === 'circle' ? (
          <circle key={'r' + i}
            cx={t.rect.left + t.rect.width / 2}
            cy={t.rect.top + t.rect.height / 2}
            r={Math.max(t.rect.width, t.rect.height) / 2 + PAD}
            fill="none" stroke={COL.accent} strokeWidth="1.5" />
        ) : (
          <rect key={'r' + i}
            x={t.rect.left - PAD} y={t.rect.top - PAD}
            width={t.rect.width + PAD * 2} height={t.rect.height + PAD * 2}
            rx={8} fill="none" stroke={COL.accent} strokeWidth="1.5" />
        ))}
      </svg>

      {/* Callout bubbles — same styling as the old screenshot bubbles,
          but positioned off the measured rects.  Bubble centre x is
          clamped so edge targets (e.g. More, far right) stay on
          screen. */}
      {targets.map((t, i) => {
        const cx = Math.max(64, Math.min(vw - 64, t.rect.left + t.rect.width / 2));
        const above = t.anchor !== 'B';
        const y = above ? t.rect.top - PAD - 6 : t.rect.top + t.rect.height + PAD + 6;
        return (
          <div key={'b' + i} style={{
            position: 'absolute',
            left: cx, top: y,
            transform: `translate(-50%, ${above ? '-100%' : '0'})`,
            background: COL.card,
            border: `1px solid ${COL.accent}`,
            borderRadius: 5,
            padding: '3px 6px',
            minWidth: 56, maxWidth: 150,
            textAlign: 'center',
            pointerEvents: 'none',
            boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
          }}>
            <div style={{
              fontSize: 10, fontWeight: 800,
              color: COL.accent, letterSpacing: '0.04em',
              textTransform: 'uppercase', lineHeight: 1.1,
            }}>{t.label}</div>
            <div style={{
              fontSize: 9, color: COL.text,
              marginTop: 1, lineHeight: 1.15,
            }}>{t.desc}</div>
          </div>
        );
      })}

      {/* Header card — title, close, and the combat tips that don't
          map to a single control. */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(92vw, 420px)',
          background: COL.card,
          border: `1px solid ${COL.border}`,
          borderRadius: 10,
          padding: '8px 10px',
          color: COL.text,
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.02em' }}>Controls</div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: `1px solid ${COL.border}`,
              color: COL.text,
              borderRadius: 6,
              padding: '3px 10px',
              fontSize: 12, fontWeight: 700,
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >Close</button>
        </div>
        <div style={{ fontSize: 10, color: COL.muted, lineHeight: 1.4, marginTop: 4 }}>
          Swipe the screen during combat to dodge, lunge, or fire a retreat shot.
          Special attack drains one MP segment.  Tap anywhere to dismiss.
        </div>
      </div>
    </div>
  );
};
