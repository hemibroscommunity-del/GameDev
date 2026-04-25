import React, { useEffect, useRef, useState } from 'react';
import { wheelBus } from './wheelBus.js';
import { SLOT_POSITIONS, TOOL_CATALOG, loadSlotConfig, saveSlotConfig } from './wheelConfig.js';

// Color canon (spec §"Color and typography canon")
const COL = {
  bg:       '#F1EFE8',
  border:   '#E2DCC8',
  border2:  '#D3D1C7',
  text:     '#2C2C2A',
  muted:    '#888780',
  muted2:   '#B4B2A9',
  badgeRed: '#E24B4A',
  dimOverlay: 'rgba(30, 51, 40, 0.4)',
  trigBg:   'rgba(241, 239, 232, 0.85)',
  pressedBg:'#2C2C2A',
};

const TRIG_DIAM   = 58;
const TRIG_BOTTOM = 16;     // px above bottom edge — small buffer
const WHEEL_RADIUS = 115;   // outer radius from center
const SLOT_DIAM    = 60;
const ICON_PX      = 32;
const WHEEL_BOTTOM_OFFSET = 40; // px above bottom; wheel center sits ~140 above bottom
const TRIG_COLLAPSED_OPACITY = 0.75;

const toRad = (deg) => (deg * Math.PI) / 180;

const slotXY = (angleDeg, r) => {
  const a = toRad(angleDeg);
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
};

const ToolIcon = ({ tool, size = 24, color = COL.text, strokeWidth = 1.6 }) => {
  if (!tool) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d={tool.icon} />
    </svg>
  );
};

// Trigger summary pill (sum of numbered badges; static, never animated).
const SummaryPill = ({ count }) => {
  if (!count) return null;
  return (
    <div style={{
      position: 'absolute', top: -4, right: -4,
      minWidth: 16, height: 12, padding: '0 4px',
      borderRadius: 7, background: COL.badgeRed,
      color: '#fff', fontSize: 9, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 1px 2px rgba(0,0,0,.3)',
      lineHeight: 1, fontWeight: 700,
    }}>{count}</div>
  );
};

const SlotBadge = ({ badge }) => {
  if (!badge) return null;
  if (typeof badge.count === 'number') {
    return (
      <div style={{
        position: 'absolute', top: -3, right: -3,
        minWidth: 16, height: 12, padding: '0 4px',
        borderRadius: 7, background: COL.badgeRed,
        color: '#fff', fontSize: 9, fontFamily: 'ui-monospace, monospace',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        lineHeight: 1, fontWeight: 700,
      }}>{badge.count}</div>
    );
  }
  if (badge.dot) {
    return (
      <div style={{
        position: 'absolute', top: -2, right: -2,
        width: 8, height: 8, borderRadius: 4, background: COL.badgeRed,
      }} />
    );
  }
  return null;
};

// Renders one of the trigger's six tiny icons at its angular position.
const TriggerIcon = ({ pos, tool }) => {
  const r = TRIG_DIAM / 2 - 8;
  const { x, y } = slotXY(pos.angle, r);
  return (
    <div style={{
      position: 'absolute', left: '50%', top: '50%',
      transform: `translate(${x - 5}px, ${y - 5}px)`,
      width: 10, height: 10, pointerEvents: 'none',
    }}>
      <ToolIcon tool={tool} size={10} color={COL.text} strokeWidth={2} />
    </div>
  );
};

const useBusVersion = () => {
  const [, setV] = useState(0);
  useEffect(() => wheelBus.subscribe(() => setV(v => v + 1)), []);
};

// Long-press detection helper.
const useLongPress = (cb, ms = 500) => {
  const t = useRef(null);
  const fired = useRef(false);
  return {
    onTouchStart: () => { fired.current = false; t.current = setTimeout(() => { fired.current = true; cb(); }, ms); },
    onTouchEnd:   () => { if (t.current) clearTimeout(t.current); },
    onTouchMove:  () => { if (t.current) clearTimeout(t.current); },
    onMouseDown:  () => { fired.current = false; t.current = setTimeout(() => { fired.current = true; cb(); }, ms); },
    onMouseUp:    () => { if (t.current) clearTimeout(t.current); },
    onMouseLeave: () => { if (t.current) clearTimeout(t.current); },
    didFire: () => fired.current,
  };
};

const Slot = ({ pos, toolId, badge, onTap, onLongPress }) => {
  const [pressed, setPressed] = useState(false);
  const lp = useLongPress(() => { if (pos.customizable) onLongPress(); }, 500);
  const tool = TOOL_CATALOG[toolId];
  const { x, y } = slotXY(pos.angle, WHEEL_RADIUS);
  const tap = (e) => {
    e.stopPropagation();
    if (lp.didFire()) return;
    onTap();
  };
  return (
    <div style={{
      position: 'absolute', left: '50%', top: '50%',
      transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))`,
      width: SLOT_DIAM, height: SLOT_DIAM + 18,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <div
        onClick={tap}
        onTouchStart={(e) => { setPressed(true); lp.onTouchStart(e); }}
        onTouchEnd={(e) => { setPressed(false); lp.onTouchEnd(e); }}
        onTouchMove={lp.onTouchMove}
        onMouseDown={(e) => { setPressed(true); lp.onMouseDown(e); }}
        onMouseUp={(e) => { setPressed(false); lp.onMouseUp(e); }}
        onMouseLeave={(e) => { setPressed(false); lp.onMouseLeave(e); }}
        style={{
          position: 'relative',
          width: SLOT_DIAM, height: SLOT_DIAM, borderRadius: SLOT_DIAM / 2,
          background: pressed ? COL.pressedBg : COL.bg,
          border: `1.5px solid ${COL.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,.12)',
          cursor: 'pointer', userSelect: 'none', touchAction: 'manipulation',
          transition: 'background 80ms',
        }}
      >
        <ToolIcon tool={tool} size={ICON_PX} color={pressed ? '#fff' : COL.text} strokeWidth={1.7} />
        <SlotBadge badge={badge} />
      </div>
      <div style={{
        marginTop: 4, fontSize: 10, color: COL.text,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        textAlign: 'center', textShadow: '0 1px 2px rgba(255,255,255,.7)',
        whiteSpace: 'nowrap',
      }}>{tool?.label || ''}</div>
    </div>
  );
};

// Picker bottom-sheet for swapping a non-fixed slot's tool.
const SwapPicker = ({ slotId, currentTool, onPick, onCancel }) => {
  const tools = Object.entries(TOOL_CATALOG).filter(([id]) => id !== 'more');
  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, zIndex: 100020,
      background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: COL.bg,
        borderTopLeftRadius: 14, borderTopRightRadius: 14,
        padding: '14px 14px 24px', boxSizing: 'border-box',
        maxHeight: '70vh', overflowY: 'auto',
      }}>
        <div style={{ width: 32, height: 4, background: COL.muted, borderRadius: 2, margin: '0 auto 10px' }} />
        <div style={{
          fontSize: 11, color: COL.muted, letterSpacing: '0.3px',
          fontFamily: 'system-ui, sans-serif', marginBottom: 10,
        }}>SWAP SLOT {slotId} O'CLOCK</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {tools.map(([id, tool]) => (
            <div key={id} onClick={() => onPick(id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: 10, borderRadius: 10,
              background: id === currentTool ? COL.border : '#fff',
              border: `1px solid ${COL.border2}`, cursor: 'pointer',
            }}>
              <ToolIcon tool={tool} size={26} color={COL.text} strokeWidth={1.6} />
              <div style={{ marginTop: 4, fontSize: 10, color: COL.text }}>{tool.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const UtilityWheel = () => {
  useBusVersion();
  const [config, setConfig] = useState(loadSlotConfig);
  const [picker, setPicker] = useState(null); // { slotId } when open
  const [animKey, setAnimKey] = useState(0);

  // Re-trigger the open animation each time the wheel opens.
  const lastOpenRef = useRef(false);
  if (wheelBus.state.open !== lastOpenRef.current) {
    if (wheelBus.state.open) setAnimKey(k => k + 1);
    lastOpenRef.current = wheelBus.state.open;
  }

  if (wheelBus.state.inCombat) return null; // hidden during combat

  const summary = wheelBus.trigSummary();
  const open = wheelBus.state.open;

  // Trigger (collapsed). onTouchStart fires immediately on the new touch even
  // while the left joystick is already held, so the wheel can be opened
  // mid-movement. onClick remains as the desktop/fallback path.
  const onTriggerTouchStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    wheelBus.toggle();
  };
  const trigger = (
    <div
      onClick={() => wheelBus.toggle()}
      onTouchStart={onTriggerTouchStart}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        left: '50%', bottom: TRIG_BOTTOM,
        transform: 'translateX(-50%)',
        width: TRIG_DIAM, height: TRIG_DIAM, borderRadius: TRIG_DIAM / 2,
        background: COL.trigBg,
        border: `1px solid ${COL.muted}`,
        boxShadow: '0 2px 6px rgba(0,0,0,.18)',
        zIndex: 9000,
        cursor: 'pointer', touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        opacity: open ? 0 : TRIG_COLLAPSED_OPACITY,
        pointerEvents: open ? 'none' : 'auto',
        transition: 'opacity 200ms',
      }}
    >
      {SLOT_POSITIONS.map(p => (
        <TriggerIcon key={p.id} pos={p} tool={TOOL_CATALOG[config[p.id]]} />
      ))}
      <SummaryPill count={summary} />
    </div>
  );

  // Open wheel
  const wheelCenterFromBottom = WHEEL_BOTTOM_OFFSET + WHEEL_RADIUS;
  const wheelOpen = open && (
    <div
      onClick={() => wheelBus.setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 9100,
        background: COL.dimOverlay,
        animation: 'btw-fadein 200ms ease-out',
      }}
    >
      <div
        key={animKey}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: '50%', bottom: WHEEL_BOTTOM_OFFSET,
          transform: 'translate(-50%, 0)',
          width: WHEEL_RADIUS * 2 + SLOT_DIAM,
          height: WHEEL_RADIUS * 2 + SLOT_DIAM + 18,
          animation: 'btw-wheel-in 250ms ease-out',
        }}
      >
        {/* Center container — slots positioned around this point */}
        <div style={{ position: 'absolute', left: '50%', bottom: WHEEL_RADIUS, width: 0, height: 0 }}>
          {SLOT_POSITIONS.map(p => (
            <Slot
              key={p.id}
              pos={p}
              toolId={config[p.id]}
              badge={wheelBus.state.badges[config[p.id]]}
              onTap={() => wheelBus.activate(config[p.id])}
              onLongPress={() => p.customizable && setPicker({ slotId: p.id })}
            />
          ))}
          {/* Center X — dismiss */}
          <div onClick={() => wheelBus.setOpen(false)} style={{
            position: 'absolute', left: -12, top: -12, width: 24, height: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: COL.muted, fontSize: 18, fontFamily: 'system-ui, sans-serif',
            cursor: 'pointer', userSelect: 'none', touchAction: 'manipulation',
          }}>×</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes btw-fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes btw-wheel-in {
          from { transform: translate(-50%, 0) scale(0.25); opacity: 0; }
          to   { transform: translate(-50%, 0) scale(1);    opacity: 1; }
        }
      `}</style>
      {trigger}
      {wheelOpen}
      {picker && (
        <SwapPicker
          slotId={picker.slotId}
          currentTool={config[picker.slotId]}
          onPick={(toolId) => {
            const next = { ...config, [picker.slotId]: toolId };
            setConfig(next);
            saveSlotConfig(next);
            setPicker(null);
          }}
          onCancel={() => setPicker(null)}
        />
      )}
    </>
  );
};
