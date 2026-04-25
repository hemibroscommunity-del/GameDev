import React, { useEffect, useRef, useState } from 'react';
import { inventoryBus } from './inventoryBus.js';
import { INV, FONT } from './inventoryStyles.js';
import { InventoryTile } from './InventoryTile.jsx';
import { ItemTooltip, SalvageToast } from './ItemTooltip.jsx';
import { EquippedTab } from './EquippedTab.jsx';

const useBusVersion = () => {
  const [, setV] = useState(0);
  useEffect(() => inventoryBus.subscribe(() => setV(v => v + 1)), []);
};

const SortSheet = ({ current, onPick, onCancel }) => {
  const opts = [
    ['newestFirst', 'Newest first'],
    ['oldestFirst', 'Oldest first'],
    ['tierHigh',    'Tier (high to low)'],
    ['tierLow',     'Tier (low to high)'],
    ['alpha',       'Alphabetical'],
  ];
  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, zIndex: 100040,
      background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: INV.bg, padding: 16,
        borderTopLeftRadius: 14, borderTopRightRadius: 14,
      }}>
        <div style={{ width: 32, height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 2, margin: '0 auto 14px' }} />
        {opts.map(([k, label]) => (
          <div key={k} onClick={() => onPick(k)} style={{
            padding: 14, fontFamily: FONT.sans, fontSize: 14,
            color: k === current ? '#fff' : INV.textPrimary,
            fontWeight: k === current ? 500 : 400,
            borderBottom: '0.5px solid rgba(255,255,255,.05)',
            cursor: 'pointer',
          }}>{label}</div>
        ))}
      </div>
    </div>
  );
};

const InventoryTab = ({ onItemTap }) => {
  const layers = inventoryBus.state.layers;
  const layer1 = layers[1];
  const layer3 = layers[3];

  const [sortOpen, setSortOpen] = useState(false);
  const cat = inventoryBus.state.category;
  const counts = inventoryBus.countByCategory();

  // Layer 0 chips (subset). Layer 1+ shows all owned categories.
  const allChips = [
    { id: 'all',     label: 'All' },
    { id: 'weapons', label: 'Weapons' },
    { id: 'armor',   label: 'Armor' },
    { id: 'gems',    label: 'Gems' },
    { id: 'potions', label: 'Potions' },
    { id: 'other',   label: 'Other' },
  ];
  const visibleChips = layer1
    ? allChips
    : allChips.filter(c => ['all', 'weapons', 'armor', 'potions'].includes(c.id) || (counts[c.id] || 0) > 0);

  const items = inventoryBus.filteredItems();
  const sortLabel = {
    newestFirst: 'Newest first', oldestFirst: 'Oldest first',
    tierHigh: 'Tier (high to low)', tierLow: 'Tier (low to high)', alpha: 'Alphabetical',
  }[inventoryBus.state.sort];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Category chips */}
      <div style={{
        height: 40, display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', overflowX: 'auto', overflowY: 'hidden', whiteSpace: 'nowrap',
        scrollbarWidth: 'none',
      }}>
        {visibleChips.map(c => {
          const active = cat === c.id;
          const count = counts[c.id] || 0;
          return (
            <div key={c.id} onClick={() => inventoryBus.setCategory(c.id)} style={{
              padding: '6px 12px', borderRadius: 16,
              background: active ? INV.chipActive : INV.chipInactive,
              fontFamily: FONT.sans, fontSize: 12, fontWeight: active ? 500 : 400,
              color: '#fff', cursor: 'pointer', userSelect: 'none', touchAction: 'manipulation',
              flexShrink: 0,
            }}>
              {c.label}
              {(layer1 || c.id === 'all') && count > 0 && (
                <span style={{ marginLeft: 6, fontFamily: FONT.mono, fontSize: 10,
                  color: active ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.4)' }}>{count}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Sort row (Layer 1+) */}
      {layer1 && (
        <div style={{
          height: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 14px 4px', fontFamily: FONT.sans,
        }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{sortLabel}</span>
          <span onClick={() => setSortOpen(true)}
            style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>Sort ▾</span>
        </div>
      )}

      {/* Tile grid (scrollable) */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: '4px 14px 14px',
      }}>
        {items.length === 0 ? (
          <div style={{
            padding: 24, textAlign: 'center', color: INV.textMuted,
            fontFamily: FONT.sans, fontSize: 13,
          }}>{inventoryBus.state.search ? 'No matches' : 'Nothing here yet'}</div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
          }}>
            {items.map(it => (
              <InventoryTile key={it.id} item={it} onTap={() => onItemTap(it, false)} layer3={layer3} />
            ))}
          </div>
        )}

        {/* Search bar pinned at bottom of scroll */}
        <div style={{
          marginTop: 14, padding: '9px 12px',
          background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
            <circle cx="10" cy="10" r="6" />
            <line x1="14.5" y1="14.5" x2="20" y2="20" />
          </svg>
          <input
            value={inventoryBus.state.search}
            onChange={e => inventoryBus.setSearch(e.target.value)}
            placeholder="Search"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: INV.textPrimary, fontFamily: FONT.sans, fontSize: 13,
              padding: 0,
            }}
          />
        </div>
      </div>

      {sortOpen && (
        <SortSheet
          current={inventoryBus.state.sort}
          onPick={(s) => { inventoryBus.setSort(s); setSortOpen(false); }}
          onCancel={() => setSortOpen(false)}
        />
      )}
    </div>
  );
};

// Damage vignette + shake + low-HP desaturation (spec Part 11).
const useDamageReact = () => {
  useBusVersion();
  const [vig, setVig] = useState(0);     // 0..1 alpha pulse
  const [shake, setShake] = useState(0); // pixels
  const lastTick = useRef(0);
  const damageTick = inventoryBus.state.damageTick;

  useEffect(() => {
    if (damageTick === lastTick.current) return;
    lastTick.current = damageTick;
    setVig(0.2);
    setShake((Math.random() - 0.5) * 4);
    const ramp = setTimeout(() => setVig(0.2), 250);
    const off  = setTimeout(() => setVig(0), 650);
    const stop = setTimeout(() => setShake(0), 80);
    return () => { clearTimeout(ramp); clearTimeout(off); clearTimeout(stop); };
  }, [damageTick]);

  const lowHp = inventoryBus.state.hp < 0.3;
  return { vig, shake, lowHp };
};

export const InventorySurface = () => {
  useBusVersion();
  const [tooltip, setTooltip] = useState(null);
  const onItemTap = (item, isEquipped) => setTooltip({ item, isEquipped });

  const { vig, shake, lowHp } = useDamageReact();

  if (!inventoryBus.state.open) return null;

  const counts = inventoryBus.countByCategory();
  const totalCount = counts.all || 0;
  const tab = inventoryBus.state.activeTab;

  return (
    <>
      <style>{`
        @keyframes inv-sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes inv-surface-in { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99000,
        background: INV.bg, color: INV.textPrimary,
        display: 'flex', flexDirection: 'column',
        animation: 'inv-surface-in 220ms ease-out',
        transform: `translate(${shake}px, 0)`,
        transition: 'transform 80ms ease-out',
        filter: lowHp ? 'saturate(0.7)' : 'none',
        borderTop: lowHp ? '2px solid rgba(200,60,60,0.4)' : 'none',
      }}>
        {/* Tab bar */}
        <div style={{
          height: 44, display: 'flex', alignItems: 'stretch',
          background: INV.tabBar, borderBottom: `0.5px solid ${INV.tabBorder}`,
          padding: '0 14px',
        }}>
          {['inventory', 'equipped'].map(t => {
            const active = tab === t;
            return (
              <div key={t} onClick={() => inventoryBus.setTab(t)} style={{
                display: 'flex', alignItems: 'center', padding: '0 16px',
                position: 'relative', cursor: 'pointer', gap: 6,
                color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                fontFamily: FONT.sans, fontSize: 14, fontWeight: active ? 500 : 400,
              }}>
                {t === 'inventory' ? 'Inventory' : 'Equipped'}
                {t === 'inventory' && (
                  <span style={{ fontFamily: FONT.mono, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{totalCount}</span>
                )}
                {active && (
                  <div style={{ position: 'absolute', left: 16, right: 16, bottom: 0, height: 2, background: '#fff' }} />
                )}
              </div>
            );
          })}
          <div style={{ flex: 1 }} />
          <div onClick={() => inventoryBus.setOpen(false)} style={{
            display: 'flex', alignItems: 'center', padding: '0 8px',
            color: 'rgba(255,255,255,0.55)', fontSize: 22, cursor: 'pointer',
            fontFamily: FONT.sans, fontWeight: 300, lineHeight: 1,
          }}>×</div>
        </div>

        {/* Tab content */}
        {tab === 'inventory'
          ? <InventoryTab onItemTap={onItemTap} />
          : <EquippedTab onItemTap={onItemTap} />}
      </div>

      {/* HP/stamina pass-through is handled by existing HUD which sits at higher z-index when present.
          Here we render the damage edge vignette over the surface. */}
      {vig > 0 && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99500, pointerEvents: 'none',
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(180,40,40,${vig}) 100%)`,
          transition: 'background 250ms ease-out',
        }} />
      )}

      {tooltip && (
        <ItemTooltip
          item={tooltip.item}
          isEquipped={tooltip.isEquipped}
          onClose={() => setTooltip(null)}
        />
      )}

      <SalvageToast />
    </>
  );
};
