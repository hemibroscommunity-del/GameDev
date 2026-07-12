import React, { useEffect, useRef, useState } from 'react';
import { inventoryBus } from './inventoryBus.js';
import { INV, FONT, RARITY_BORDER } from './inventoryStyles.js';
import { ItemArt } from './ItemArt.jsx';

const fmtTier = (item, layer2) => {
  const parts = [`Tier ${item.tier ?? '?'}`];
  if (layer2 && item.quality && item.quality !== 'normal') parts[0] += ' ' + item.quality[0].toUpperCase() + item.quality.slice(1);
  if (layer2 && item.hardness != null) parts.push(`Hardness ${item.hardness}`);
  if (layer2 && item.temper != null && item.temper > 0) parts.push(`Temper ${item.temper}`);
  return parts.join(' · ');
};

const STAT_LABEL = {
  layer0: { atk: 'Hits harder', def: 'Tougher', spd: 'A bit slower', crit: 'Lucky strike' },
  layer2: { atk: 'Attack', def: 'Defense', spd: 'Speed', crit: 'Crit chance' },
};

// Salvage / Trash undo toast.
const ToastHost = ({ children }) => (
  <div style={{
    position: 'fixed', left: 0, right: 0, bottom: 0,
    display: 'flex', justifyContent: 'center', pointerEvents: 'none',
    zIndex: 100040,
  }}>{children}</div>
);

let toastQueue = [];
let toastListeners = new Set();
const subscribeToast = (fn) => { toastListeners.add(fn); return () => toastListeners.delete(fn); };
const emitToast = () => { for (const fn of toastListeners) fn(); };

export const queueSalvageToast = (item, undo) => {
  // Stack consecutive salvages within the window.
  const now = Date.now();
  toastQueue = toastQueue.filter(t => now - t.startedAt < 30000);
  if (toastQueue.length) {
    toastQueue[0].items.push(item);
    toastQueue[0].undos.push(undo);
    toastQueue[0].startedAt = now;
  } else {
    toastQueue.push({ items: [item], undos: [undo], startedAt: now });
  }
  emitToast();
};

export const SalvageToast = () => {
  const [, setV] = useState(0);
  useEffect(() => subscribeToast(() => setV(v => v + 1)), []);
  useEffect(() => {
    const i = setInterval(() => {
      const before = toastQueue.length;
      toastQueue = toastQueue.filter(t => Date.now() - t.startedAt < 30000);
      if (toastQueue.length !== before) emitToast();
    }, 1000);
    return () => clearInterval(i);
  }, []);
  if (!toastQueue.length) return null;
  const t = toastQueue[0];
  const label = t.items.length === 1
    ? `Salvaged ${t.items[0].name || 'item'} · Undo`
    : `Salvaged ${t.items.length} items · Undo All`;
  return (
    <ToastHost>
      <div onClick={() => { t.undos.forEach(u => u && u()); toastQueue.shift(); emitToast(); }}
        style={{
          margin: '0 0 22px', padding: '10px 16px',
          /* v2.3.1235: batch-4 rollout — corrected raised token + strong
             hairline (toast is a transient world surface). */
          background: '#293B41', border: '1px solid rgba(229,237,233,.20)',
          borderRadius: 10, color: INV.textPrimary, fontFamily: FONT.sans, fontSize: 13,
          pointerEvents: 'auto', cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(4,7,9,.38)',
        }}>{label}</div>
    </ToastHost>
  );
};

// Drag-to-dismiss bottom sheet wrapper.
const useDragDismiss = (onDismiss) => {
  const [drag, setDrag] = useState(0);
  const start = useRef(0);
  const active = useRef(false);
  return {
    drag,
    onTouchStart: (e) => { active.current = true; start.current = e.touches[0].clientY; },
    onTouchMove: (e) => {
      if (!active.current) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy > 0) setDrag(dy);
    },
    onTouchEnd: (e) => {
      active.current = false;
      const sheetH = e.currentTarget.offsetHeight;
      if (drag / sheetH > 0.4) onDismiss();
      setDrag(0);
    },
  };
};

const Comparison = ({ item, layer2 }) => {
  const equipped = inventoryBus.state.equipped;
  let comparedTo = null;
  if (item.type === 'weapon') comparedTo = equipped.weapon;
  else if (item.type === 'armor') comparedTo = equipped[item.slot || 'chest'];
  else if (item.type === 'pet') comparedTo = equipped.pet;
  else return null;

  const labels = layer2 ? STAT_LABEL.layer2 : STAT_LABEL.layer0;
  const keys = layer2 ? ['atk', 'def', 'spd'] : ['atk', 'def'];

  const rows = keys.map(k => {
    const a = item.stats?.[k] ?? 0;
    const b = comparedTo?.stats?.[k] ?? 0;
    return { k, label: labels[k] || k, delta: a - b };
  });

  return (
    <div style={{
      /* v2.3.1235: batch-4 rollout — translucent-white fill was
         off-token; nested module rides the card token. */
      background: '#24363C', borderRadius: 8,
      padding: 10, marginBottom: 10,
    }}>
      <div style={{
        /* v2.3.1235: batch-4 rollout — section header 11/700 .14em muted. */
        fontSize: 11, fontWeight: 700, color: INV.textVeryMuted, letterSpacing: '.14em',
        fontFamily: FONT.sans, textTransform: 'uppercase', marginBottom: 6,
      }}>
        {layer2 && comparedTo ? `VS YOUR ${(comparedTo.name || 'GEAR').toUpperCase()}` : 'COMPARED TO WHAT YOU\'RE WEARING'}
      </div>
      {rows.map(r => (
        <div key={r.k} style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 12, fontFamily: FONT.sans, color: INV.textPrimary,
          padding: '3px 0',
        }}>
          <span>{r.label}</span>
          <span style={{
            fontFamily: FONT.mono,
            color: r.delta > 0 ? INV.positive : r.delta < 0 ? INV.negative : INV.textMuted,
          }}>{r.delta > 0 ? '+' : ''}{r.delta}</span>
        </div>
      ))}
    </div>
  );
};

const GemsBlock = ({ item }) => {
  if (!item.gemSlots) return null;
  const filled = (item.gems || []).length;
  return (
    <div style={{
      /* v2.3.1235: batch-4 rollout — off-token translucent fill → card
         token; header to the 11/700 .14em muted section recipe. */
      background: '#24363C', borderRadius: 8,
      padding: '10px 12px', marginBottom: 12,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: INV.textVeryMuted, letterSpacing: '.14em',
        fontFamily: FONT.sans, marginBottom: 4, textTransform: 'uppercase',
      }}>GEMS</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {(item.gems || []).map((g, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: getElementColor(g) }} />
              <span style={{ fontSize: 12, color: INV.textPrimary, fontFamily: FONT.sans }}>{g}</span>
            </div>
          ))}
          {filled === 0 && <span style={{ fontSize: 12, color: INV.textMuted }}>(empty)</span>}
        </div>
        <span style={{ fontSize: 11, fontFamily: FONT.mono, color: INV.textMuted }}>
          {filled} of {item.gemSlots} slots
        </span>
      </div>
    </div>
  );
};
const getElementColor = (el) => ({
  flame: '#E8704A', frost: '#5AA8E8', flora: '#7BC25A', stone: '#9C8B6A',
  wind: '#A6D9D2', light: '#E8D29B', dark: '#7E5BA3', volt: '#E0D85C',
  /* v2.3.1235: batch-4 rollout — unknown-element fallback was off-token
     #888; muted text-3 token (element tints themselves are game data). */
}[el] || '#8D9B98');

const MarketBlock = ({ item, layer3 }) => {
  if (!layer3) return null;
  const range = item.tier ? `${item.tier * 30}-${item.tier * 70}g recently` : '— recently';
  return (
    <div style={{
      /* v2.3.1235: batch-4 rollout — 0.5px sub-pixel border → 1px hairline
         (only 1px hairlines in the system); header/link were off-token
         warm-gold rgba's → brass token, header to 11/700 .14em. */
      background: INV.marketBg, border: `1px solid ${INV.marketBorder}`,
      borderRadius: 8, padding: '8px 10px', marginBottom: 12,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: INV.marketAccent, letterSpacing: '.14em', fontFamily: FONT.sans }}>MARKET</div>
        <div style={{ fontSize: 12, fontFamily: FONT.mono, color: INV.marketAccent }}>{range}</div>
      </div>
      <div style={{ fontSize: 11, color: INV.marketAccent, cursor: 'pointer' }}>List ↗</div>
    </div>
  );
};

const ActionButton = ({ label, primary, destructive, onClick, ghost }) => {
  if (!label) return <div />;
  /* v2.3.1235: batch-4 rollout — button trio onto the corrected recipes:
     primary = committed gold gradient (#EAC675 edge, #172126 ink);
     destructive = OUTLINE only (filled-red #7C3431 is banned — danger
     never fills); default = secondary #293B41 + strong hairline. All
     labels 13/700 (button type ramp); 0.5px borders → 1px. */
  const bg = primary ? 'linear-gradient(180deg,#E2B765,#D2A14D)' : destructive ? 'transparent' : '#293B41';
  const border = primary ? '#EAC675' : destructive ? '#D8635D' : 'rgba(229,237,233,.20)';
  const color = primary ? INV.onPrimaryBtn : destructive ? '#D8635D' : INV.textPrimary;
  return (
    <div onClick={onClick} style={{
      flex: 1, padding: '14px 10px', textAlign: 'center', borderRadius: 10,
      background: bg, border: `1px solid ${border}`, color,
      fontFamily: FONT.sans, fontSize: 13, fontWeight: 700,
      cursor: 'pointer', userSelect: 'none', touchAction: 'manipulation',
    }}>{label}</div>
  );
};

const actionsFor = (item, isEquipped) => {
  if (isEquipped) return ['Take off', null, 'Add shortcut', null];
  switch (item.type) {
    case 'weapon': case 'armor': case 'pet':
      return ['Wear', 'Keep safe', 'Add shortcut', 'Salvage'];
    case 'potion': case 'tool':
      return ['Use', 'Keep safe', 'Add shortcut', 'Salvage'];
    case 'gem':
      return ['Socket', 'Keep safe', 'Add shortcut', 'Salvage'];
    case 'material':
      return [null, 'Keep safe', null, 'Salvage'];
    default: return ['Wear', 'Keep safe', 'Add shortcut', 'Salvage'];
  }
};

const ShortcutPicker = ({ onPick, onCancel }) => (
  <div onClick={onCancel} style={{
    position: 'fixed', inset: 0, zIndex: 100050,
    /* v2.3.1235: batch-4 rollout — pure-black scrim → strong scrim token
       (this picker stacks over the sheet, so it takes the .52 rung). */
    background: 'rgba(4,9,12,.52)', display: 'flex', alignItems: 'flex-end',
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      width: '100%', background: INV.bg, padding: 16,
      borderTopLeftRadius: 14, borderTopRightRadius: 14,
    }}>
      {/* v2.3.1235: batch-4 rollout — grab handle / slot chrome onto the
          corrected hairline + well-soft tokens (empty slot = well-soft). */}
      <div style={{ width: 32, height: 4, background: 'rgba(229,237,233,.20)', borderRadius: 2, margin: '0 auto 14px' }} />
      <div style={{ color: INV.textPrimary, fontFamily: FONT.sans, fontSize: 13, marginBottom: 12 }}>
        Pick a shortcut slot to assign:
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
        {[0, 1].map(i => (
          <div key={i} onClick={() => onPick(i)} style={{
            width: 100, height: 80, borderRadius: 10,
            border: '1.5px dashed rgba(229,237,233,.20)',
            background: INV.tileFill,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
            <div style={{ fontSize: 11, color: INV.textMuted, fontFamily: FONT.sans }}>SLOT {i + 1}</div>
            <div style={{ fontSize: 22, color: INV.textVeryMuted }}>+</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const ItemTooltip = ({ item, isEquipped, onClose }) => {
  const drag = useDragDismiss(onClose);
  const [showPicker, setShowPicker] = useState(false);
  const layers = inventoryBus.state.layers;
  const layer2 = layers[2];
  const layer3 = layers[3];

  if (!item) return null;
  const acts = actionsFor(item, isEquipped);

  const subtitle = item.type === 'potion' || item.type === 'material'
    ? (item.count ? `×${item.count}` : item.type)
    : fmtTier(item, layer2);

  const onAction = (label) => {
    if (label === 'Wear') {
      const slot = item.type === 'weapon' ? 'weapon' : item.type === 'armor' ? (item.slot || 'chest') : item.type === 'pet' ? 'pet' : null;
      if (slot) {
        const prev = inventoryBus.state.equipped[slot];
        const items = inventoryBus.state.items.filter(i => i.id !== item.id);
        if (prev) items.push(prev);
        inventoryBus.setItems(items);
        inventoryBus.setEquipped(slot, item);
      }
      onClose();
    } else if (label === 'Take off') {
      if (isEquipped) {
        const slot = item.type === 'weapon' ? 'weapon' : item.type === 'armor' ? (item.slot || 'chest') : item.type === 'pet' ? 'pet' : 'tool';
        inventoryBus.setEquipped(slot, null);
        inventoryBus.setItems([...inventoryBus.state.items, item]);
      }
      onClose();
    } else if (label === 'Use') {
      if (item.count && item.count > 1) {
        const items = inventoryBus.state.items.map(i =>
          i.id === item.id ? { ...i, count: i.count - 1 } : i);
        inventoryBus.setItems(items);
      } else {
        inventoryBus.setItems(inventoryBus.state.items.filter(i => i.id !== item.id));
      }
      onClose();
    } else if (label === 'Add shortcut' || label === 'Move shortcut') {
      setShowPicker(true);
    } else if (label === 'Salvage' || label === 'Trash') {
      const idx = inventoryBus.state.items.findIndex(i => i.id === item.id);
      const removed = inventoryBus.state.items[idx];
      const items = inventoryBus.state.items.filter(i => i.id !== item.id);
      inventoryBus.setItems(items);
      const undo = () => {
        const cur = inventoryBus.state.items.slice();
        cur.splice(Math.min(idx, cur.length), 0, removed);
        inventoryBus.setItems(cur);
      };
      queueSalvageToast(removed, undo);
      onClose();
    } else if (label === 'Keep safe') {
      onClose();
    } else if (label === 'Socket') {
      onClose();
    }
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 100030,
        /* v2.3.1233: spec modal scrim; blur removed (no backdrop-filter) */
        /* v2.3.1235: batch-4 rollout — off-token rgba(8,16,20,.56) →
           strong scrim token (the sheet holds a destructive Salvage
           decision, so it keeps the .52 rung). */
        background: 'rgba(4,9,12,.52)',
      }} />
      <div onTouchStart={drag.onTouchStart} onTouchMove={drag.onTouchMove} onTouchEnd={drag.onTouchEnd}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 100031,
          /* v2.3.1235: batch-4 rollout — 0.5px off-token top edge → 1px
             strong hairline (floating-sheet edge). */
          background: INV.bg, borderTop: '1px solid rgba(229,237,233,.20)',
          borderTopLeftRadius: 14, borderTopRightRadius: 14,
          padding: '8px 14px 18px', boxSizing: 'border-box',
          color: INV.textPrimary, fontFamily: FONT.sans,
          maxHeight: '85vh', overflowY: 'auto',
          transform: `translateY(${drag.drag}px)`,
          animation: 'inv-sheet-up 200ms ease-out',
        }}>
        {/* v2.3.1235: batch-4 rollout — handle onto the corrected strong
            hairline token. */}
        <div style={{ width: 32, height: 4, background: 'rgba(229,237,233,.20)', borderRadius: 2, margin: '0 auto 12px' }} />

        {/* Hero */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
          <div style={{
            width: 68, height: 68, borderRadius: 10,
            /* v2.3.1235: batch-4 rollout — off-token warm-gold rgba's →
               brass-soft plate; unknown-quality edge falls back to the
               Common rarity edge (rarity edges are game data). */
            background: 'rgba(216,170,88,.15)',
            border: `1.5px solid ${RARITY_BORDER[item.quality] || RARITY_BORDER.normal}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><ItemArt item={item} size={48} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.serif, fontSize: 17, fontWeight: 500, color: INV.textPrimary }}>
              {item.name || '(unnamed)'}
            </div>
            {/* v2.3.1235: batch-4 rollout — metadata line onto text-3;
                crafter credit onto the brass token (was off-token warm
                rgba's). */}
            <div style={{ fontFamily: FONT.mono, fontSize: 12, color: INV.textVeryMuted, marginTop: 3 }}>
              {subtitle}
            </div>
            {layer3 && item.crafter && (
              <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 11,
                color: INV.marketAccent, marginTop: 3 }}>
                forged by {item.crafter}{item.acquiredAt ? ` · ${dayLabel(item.acquiredAt)}` : ''}
              </div>
            )}
          </div>
        </div>

        <Comparison item={item} layer2={layer2} />
        <GemsBlock item={item} />
        <MarketBlock item={item} layer3={layer3} />

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <ActionButton label={acts[0]} primary onClick={() => onAction(acts[0])} />
          <ActionButton label={acts[1]} onClick={() => onAction(acts[1])} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ActionButton label={acts[2]} onClick={() => onAction(acts[2])} />
          <ActionButton label={acts[3]} destructive onClick={() => onAction(acts[3])} />
        </div>
      </div>
      {showPicker && (
        <ShortcutPicker
          onPick={(idx) => { inventoryBus.setShortcut(idx, item.id); setShowPicker(false); onClose(); }}
          onCancel={() => setShowPicker(false)}
        />
      )}
    </>
  );
};

const dayLabel = (ts) => {
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
};
