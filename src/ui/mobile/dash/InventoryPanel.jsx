import React, { useEffect, useState } from 'react';
import { inventoryBus } from '../inventoryBus.js';
import { COL, TIER_COLOR, panelStyle, getState } from './common.js';

const TABS = [
  { id: 'inventory', label: 'Bag' },
  { id: 'equipped',  label: 'Equipped' },
];

const ItemTile = ({ item }) => {
  if (!item) return (
    <div style={{
      width: '100%', aspectRatio: '1 / 1',
      background: 'rgba(255,255,255,0.03)',
      border: `1px dashed ${COL.tileBor}`,
      borderRadius: 6,
    }} />
  );
  const color = TIER_COLOR[item.tier] || COL.muted;
  return (
    <div style={{
      width: '100%', aspectRatio: '1 / 1',
      background: COL.tile,
      border: `1.5px solid ${color}`,
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18,
      position: 'relative',
    }} title={item.name || item.id}>
      <span>{item.icon || '◇'}</span>
      {item.count > 1 && (
        <span style={{
          position: 'absolute', bottom: 1, right: 3,
          fontSize: 10, color: COL.text,
          textShadow: '0 0 2px #000',
        }}>{item.count}</span>
      )}
    </div>
  );
};

const EquippedSlot = ({ slot, item }) => {
  const color = item ? (TIER_COLOR[item.tier] || COL.muted) : COL.tileBor;
  return (
    <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
      <div style={{
        width: '100%', aspectRatio: '1 / 1',
        background: COL.tile,
        border: `1.5px solid ${color}`,
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
      }}>
        <span>{item?.icon || '–'}</span>
      </div>
      <div style={{
        fontSize: 10, color: COL.muted,
        marginTop: 2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{slot}</div>
    </div>
  );
};

export const InventoryPanel = () => {
  const [, force] = useState(0);
  useEffect(() => inventoryBus.subscribe(() => force(v => v + 1)), []);

  const tab = inventoryBus.state.activeTab || 'inventory';
  const items = inventoryBus.state.items || [];
  const equipped = inventoryBus.state.equipped || {};

  if (tab === 'equipped') {
    const slots = ['weapon', 'ranged', 'staff', 'armor', 'pet'];
    return (
      <div style={panelStyle}>
        <TabStrip tab={tab} />
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {slots.map(s => <EquippedSlot key={s} slot={s} item={equipped[s]} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <TabStrip tab={tab} />
      {items.length === 0 ? (
        <div style={{ color: COL.muted, fontSize: 12, textAlign: 'center', padding: '18px 0' }}>
          Bag is empty.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 6,
          marginTop: 8,
        }}>
          {items.slice(0, 32).map((it, i) => <ItemTile key={it.id || i} item={it} />)}
        </div>
      )}
    </div>
  );
};

const TabStrip = ({ tab }) => (
  <div style={{ display: 'flex', gap: 6 }}>
    {TABS.map(t => {
      const active = t.id === tab;
      return (
        <button key={t.id}
          onClick={() => inventoryBus.setTab(t.id)}
          style={{
            flex: 1,
            padding: '4px 6px',
            background: active ? COL.accent : 'transparent',
            color: active ? '#fff' : COL.muted,
            border: `1px solid ${active ? COL.accent : COL.tileBor}`,
            borderRadius: 4,
            fontFamily: 'inherit',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >{t.label}</button>
      );
    })}
  </div>
);
