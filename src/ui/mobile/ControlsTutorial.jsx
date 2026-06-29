import React, { useEffect, useState } from 'react';
import { controlsTutorialBus } from './controlsTutorialBus.js';

/* Callout positions are expressed in percent of the screenshot's
   own dimensions, so the overlay scales correctly whatever size the
   user views it at.

   Each entry has:
     target  — the (x, y) point on the screenshot the arrow points to
     label   — short title shown in the bubble
     desc    — one-line explanation
     anchor  — where the bubble sits relative to its target
                "L" left of target, "R" right, "T" above, "B" below

   Coordinates were eyeballed against the v2.3.221 screenshot at
   public/ui/controls-screenshot.webp.  Tweak in this file if the
   game's HUD changes meaningfully. */
const CALLOUTS = [
  { target: { x: 50,  y: 9  }, label: 'Zone',     desc: 'Current area + level range',     anchor: 'B' },
  { target: { x: 88,  y: 8  }, label: 'Profile',  desc: 'Name, level, gold',              anchor: 'B' },
  { target: { x: 7,   y: 8  }, label: 'Back',     desc: 'Leave the zone',                 anchor: 'B' },
  { target: { x: 22,  y: 52 }, label: 'Move',     desc: 'Drag the left joystick',         anchor: 'T' },
  { target: { x: 78,  y: 52 }, label: 'Attack',   desc: 'Drag right — hold for special',  anchor: 'T' },
  { target: { x: 10,  y: 72 }, label: 'Bag',      desc: 'Quick-drop pickups',             anchor: 'R' },
  { target: { x: 47,  y: 76 }, label: 'Loadout',  desc: 'Tap a slot to equip / unequip',  anchor: 'T' },
  { target: { x: 82,  y: 76 }, label: 'Stats',    desc: 'Skills + attribute points',      anchor: 'L' },
  { target: { x: 50,  y: 96 }, label: 'Menus',    desc: 'Bag, Codex, Map, More…',         anchor: 'T' },
];

const COL = {
  bg:      '#0f111a',
  card:    'rgba(20,22,32,0.96)',
  border:  'rgba(255,255,255,0.18)',
  accent:  '#f5c542',
  text:    '#f0ece0',
  muted:   '#9a978c',
};

const SCREENSHOT_URL = '/ui/controls-screenshot.webp?v=1';

/* Translate an anchor letter to (dx, dy) percent offsets for the bubble. */
function anchorOffset(anchor) {
  switch (anchor) {
    case 'L': return { dx: -22, dy: 0,   tx: 'right',  ty: 'center' };
    case 'R': return { dx:  22, dy: 0,   tx: 'left',   ty: 'center' };
    case 'T': return { dx: 0,   dy: -10, tx: 'center', ty: 'bottom' };
    case 'B': return { dx: 0,   dy:  10, tx: 'center', ty: 'top'    };
    default:  return { dx: 0,   dy:  10, tx: 'center', ty: 'top'    };
  }
}

export const ControlsTutorial = () => {
  const [, setV] = useState(0);
  useEffect(() => controlsTutorialBus.subscribe(() => setV(v => v + 1)), []);
  if (!controlsTutorialBus.isOpen()) return null;

  const onClose = () => controlsTutorialBus.close();

  return (
    <div
      onPointerDown={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9300,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 12,
        fontFamily: 'Source Sans 3, system-ui, sans-serif',
      }}
    >
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520, maxHeight: '92vh',
          background: COL.bg,
          border: `1px solid ${COL.border}`,
          borderRadius: 12,
          padding: 12,
          display: 'flex', flexDirection: 'column', gap: 10,
          color: COL.text,
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.02em' }}>
            Controls
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: `1px solid ${COL.border}`,
              color: COL.text,
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12, fontWeight: 700,
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >Close</button>
        </div>

        <div style={{
          fontSize: 11, color: COL.muted, lineHeight: 1.4,
        }}>
          Tap anywhere outside the panel to dismiss.
        </div>

        <div style={{
          position: 'relative',
          width: '100%',
          flex: '0 1 auto',
          overflow: 'auto',
          border: `1px solid ${COL.border}`,
          borderRadius: 8,
          background: '#000',
        }}>
          {/* Image keeps its aspect ratio; callouts overlay in percent
              coords so they track the image at any rendered size. */}
          <div style={{ position: 'relative', width: '100%' }}>
            <img
              src={SCREENSHOT_URL}
              alt="Game screen"
              draggable={false}
              style={{
                display: 'block',
                width: '100%',
                height: 'auto',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />

            {/* SVG arrows: drawn in viewBox 100x100 to match percent coords. */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              {CALLOUTS.map((c, i) => {
                const { dx, dy } = anchorOffset(c.anchor);
                const x1 = c.target.x + dx;
                const y1 = c.target.y + dy;
                const x2 = c.target.x;
                const y2 = c.target.y;
                return (
                  <g key={i}>
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={COL.accent}
                      strokeWidth="0.5"
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                    />
                    <circle
                      cx={x2} cy={y2} r="0.9"
                      fill={COL.accent}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Callout bubbles, also in percent coords. */}
            {CALLOUTS.map((c, i) => {
              const { dx, dy, tx, ty } = anchorOffset(c.anchor);
              const bx = c.target.x + dx;
              const by = c.target.y + dy;
              const translate = `translate(${
                tx === 'center' ? '-50%' : tx === 'right' ? '-100%' : '0'
              }, ${
                ty === 'center' ? '-50%' : ty === 'bottom' ? '-100%' : '0'
              })`;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: bx + '%',
                    top:  by + '%',
                    transform: translate,
                    background: 'rgba(15,17,26,0.92)',
                    border: `1px solid ${COL.accent}`,
                    borderRadius: 5,
                    padding: '3px 6px',
                    minWidth: 56,
                    textAlign: 'center',
                    pointerEvents: 'none',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                  }}
                >
                  <div style={{
                    fontSize: 10, fontWeight: 800,
                    color: COL.accent, letterSpacing: '0.04em',
                    textTransform: 'uppercase', lineHeight: 1.1,
                  }}>{c.label}</div>
                  <div style={{
                    fontSize: 9, color: COL.text,
                    marginTop: 1, lineHeight: 1.15, whiteSpace: 'nowrap',
                  }}>{c.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ fontSize: 11, color: COL.muted, lineHeight: 1.45 }}>
          <strong style={{ color: COL.text }}>Tips:</strong>{' '}
          Tap an inventory item or loadout slot to open a tooltip with Equip / Unequip.
          Special attack drains one MP segment — five segments per full bar.
          Swipe the screen during combat to dodge, lunge, or fire a retreat shot.
        </div>
      </div>
    </div>
  );
};
