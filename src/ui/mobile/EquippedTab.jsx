import React, { useState } from 'react';
import { inventoryBus } from './inventoryBus.js';
import { INV, FONT } from './inventoryStyles.js';
import { ItemArt } from './ItemArt.jsx';

const SlotPicker = ({ slot, onPick, onCancel }) => {
  const items = inventoryBus.state.items.filter(it => {
    if (slot === 'weapon') return it.type === 'weapon';
    if (slot === 'armor')  return it.type === 'armor';
    if (slot === 'pet')    return it.type === 'pet';
    if (slot === 'tool')   return it.type === 'tool';
    return false;
  });
  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, zIndex: 100050,
      background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: INV.bg, padding: 16,
        borderTopLeftRadius: 14, borderTopRightRadius: 14,
        maxHeight: '70vh', overflowY: 'auto',
      }}>
        <div style={{ width: 32, height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 2, margin: '0 auto 14px' }} />
        <div style={{
          color: INV.textMuted, fontFamily: FONT.sans, fontSize: 11,
          letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 12,
        }}>EQUIP {slot}</div>
        {items.length === 0 && (
          <div style={{ color: INV.textMuted, fontFamily: FONT.sans, fontSize: 13, padding: 12 }}>
            Nothing in inventory fits this slot.
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {items.map(it => (
            <div key={it.id} onClick={() => onPick(it)} style={{
              padding: 8, background: 'rgba(255,255,255,.04)', borderRadius: 8,
              border: '0.5px solid rgba(255,255,255,.15)', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <ItemArt item={it} size={42} />
              <div style={{ fontSize: 10, color: INV.textPrimary, fontFamily: FONT.sans, marginTop: 4,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {it.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Slot = ({ slot, item, label, borderColor, onTap }) => {
  const empty = !item;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div onClick={onTap} style={{
        width: 52, height: 52, borderRadius: 10,
        background: empty ? 'rgba(255,255,255,0.02)' : `${borderColor.replace(/[\d.]+\)/, '0.12)')}`,
        border: empty
          ? '1.5px dashed rgba(255,255,255,0.2)'
          : `1.5px solid ${borderColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', userSelect: 'none', touchAction: 'manipulation',
      }}>
        {empty
          ? <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 22, fontWeight: 300 }}>+</div>
          : <ItemArt item={item} size={36} />
        }
      </div>
      <div style={{
        marginTop: 4, fontSize: 9, letterSpacing: 0.3,
        color: empty ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.55)',
        fontFamily: FONT.sans,
      }}>{label}</div>
    </div>
  );
};

const ShortcutSlot = ({ idx, item, onTap }) => {
  const empty = !item;
  return (
    <div onClick={() => onTap(idx)} style={{
      width: 48, height: 48, borderRadius: 10,
      background: empty ? 'rgba(255,255,255,0.03)' : 'rgba(80, 140, 200, 0.15)',
      border: empty
        ? '1.5px dashed rgba(255,255,255,0.15)'
        : '1.5px solid rgba(80, 140, 200, 0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', userSelect: 'none', touchAction: 'manipulation',
      position: 'relative',
    }}>
      {empty
        ? <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>+</div>
        : <ItemArt item={item} size={28} />
      }
      {item && item.count != null && item.count > 0 && (
        <div style={{
          position: 'absolute', right: 2, bottom: 2,
          fontSize: 10, fontFamily: FONT.mono, color: '#E8D4A0',
          textShadow: '0 1px 2px rgba(0,0,0,.7)',
        }}>×{item.count}</div>
      )}
    </div>
  );
};

const ShortcutPickerSheet = ({ slotIdx, onPick, onCancel }) => {
  const items = inventoryBus.state.items.filter(it =>
    it.type === 'potion' || it.type === 'tool' || it.type === 'gem' || it.type === 'weapon');
  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, zIndex: 100050,
      background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: INV.bg, padding: 16,
        borderTopLeftRadius: 14, borderTopRightRadius: 14,
        maxHeight: '70vh', overflowY: 'auto',
      }}>
        <div style={{ width: 32, height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 2, margin: '0 auto 14px' }} />
        <div style={{
          color: INV.textMuted, fontFamily: FONT.sans, fontSize: 11,
          letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 12,
        }}>SHORTCUT SLOT {slotIdx + 1}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {items.map(it => (
            <div key={it.id} onClick={() => onPick(it.id)} style={{
              padding: 6, background: 'rgba(255,255,255,.04)', borderRadius: 8,
              border: '0.5px solid rgba(255,255,255,.15)', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <ItemArt item={it} size={32} />
              <div style={{ fontSize: 9, color: INV.textPrimary, fontFamily: FONT.sans, marginTop: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {it.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ShortcutActionSheet = ({ slotIdx, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, zIndex: 100050,
    background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'flex-end',
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      width: '100%', background: INV.bg, padding: 16,
      borderTopLeftRadius: 14, borderTopRightRadius: 14,
    }}>
      <div style={{ width: 32, height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 2, margin: '0 auto 14px' }} />
      <div onClick={() => { inventoryBus.clearShortcut(slotIdx); onClose(); }} style={{
        padding: 14, color: INV.destructive, fontFamily: FONT.sans, fontSize: 14,
        textAlign: 'center', borderBottom: '0.5px solid rgba(255,255,255,.1)', cursor: 'pointer',
      }}>Remove shortcut</div>
      <div onClick={onClose} style={{
        padding: 14, color: INV.textPrimary, fontFamily: FONT.sans, fontSize: 14,
        textAlign: 'center', cursor: 'pointer',
      }}>Cancel</div>
    </div>
  </div>
);

export const EquippedTab = ({ onItemTap }) => {
  const [pickerSlot, setPickerSlot] = useState(null);
  const [shortcutPicker, setShortcutPicker] = useState(null);
  const [shortcutAction, setShortcutAction] = useState(null);

  const eq = inventoryBus.state.equipped;
  const sc = inventoryBus.state.shortcuts;
  const allItems = [
    ...inventoryBus.state.items,
    ...Object.values(eq).filter(Boolean),
  ];
  const findItem = (id) => allItems.find(i => i?.id === id) || null;

  const slotConfig = [
    { slot: 'weapon', label: 'WEAPON', border: INV.slotWeaponBorder, pos: { left: 30,  top: 100 } },
    { slot: 'armor',  label: 'ARMOR',  border: INV.slotArmorBorder,  pos: { right: 30, top: 50  } },
    { slot: 'pet',    label: 'PET',    border: INV.slotPetBorder,    pos: { right: 30, top: 160 } },
    { slot: 'tool',   label: 'TOOL',   border: INV.slotToolBorder,   pos: { left: 30,  top: 200 } },
  ];

  return (
    <div style={{ padding: 14 }}>
      {/* Body silhouette area */}
      <div style={{
        position: 'relative', height: 280, marginBottom: 8,
        background: `radial-gradient(ellipse at center top, ${INV.silhouetteGradient}, transparent 70%)`,
      }}>
        {/* Generic Bro silhouette */}
        <svg width="58" height="80" viewBox="0 0 58 80" style={{
          position: 'absolute', left: '50%', top: 30, transform: 'translateX(-50%)',
        }}>
          <ellipse cx="29" cy="14" rx="11" ry="13" fill={INV.silhouetteSkin} />
          <path d="M14 30 Q 14 26 29 26 Q 44 26 44 30 L 44 60 Q 44 64 39 65 L 19 65 Q 14 64 14 60 Z"
            fill={INV.silhouetteCloth} />
          <rect x="20" y="65" width="7" height="15" fill={INV.silhouetteCloth} />
          <rect x="31" y="65" width="7" height="15" fill={INV.silhouetteCloth} />
        </svg>

        {slotConfig.map(s => (
          <div key={s.slot} style={{ position: 'absolute', ...s.pos }}>
            <Slot
              slot={s.slot}
              item={eq[s.slot]}
              label={s.label}
              borderColor={s.border}
              onTap={() => {
                if (eq[s.slot]) onItemTap(eq[s.slot], true);
                else setPickerSlot(s.slot);
              }}
            />
          </div>
        ))}
      </div>

      {/* Shortcuts section */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 0 8px',
      }}>
        <div style={{
          fontSize: 12, fontWeight: 500, letterSpacing: 0.4,
          color: 'rgba(255,255,255,0.75)', fontFamily: FONT.sans,
        }}>SHORTCUTS</div>
        <div style={{
          fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: FONT.sans,
        }}>Tap a slot to set</div>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-start' }}>
        {[0, 1].map(i => (
          <ShortcutSlot
            key={i}
            idx={i}
            item={findItem(sc[i])}
            onTap={(idx) => {
              if (sc[idx]) setShortcutAction(idx);
              else setShortcutPicker(idx);
            }}
          />
        ))}
      </div>

      {pickerSlot && (
        <SlotPicker
          slot={pickerSlot}
          onPick={(it) => {
            inventoryBus.setEquipped(pickerSlot, it);
            inventoryBus.setItems(inventoryBus.state.items.filter(i => i.id !== it.id));
            setPickerSlot(null);
          }}
          onCancel={() => setPickerSlot(null)}
        />
      )}
      {shortcutPicker !== null && (
        <ShortcutPickerSheet
          slotIdx={shortcutPicker}
          onPick={(itemId) => { inventoryBus.setShortcut(shortcutPicker, itemId); setShortcutPicker(null); }}
          onCancel={() => setShortcutPicker(null)}
        />
      )}
      {shortcutAction !== null && (
        <ShortcutActionSheet slotIdx={shortcutAction} onClose={() => setShortcutAction(null)} />
      )}
    </div>
  );
};
