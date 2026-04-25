import React from 'react';
import { INV, FONT, RARITY_BORDER, RARITY_FILL, POTION_TINT } from './inventoryStyles.js';
import { ItemArt } from './ItemArt.jsx';
import { inventoryBus } from './inventoryBus.js';

export const InventoryTile = ({ item, onTap, layer3 }) => {
  const isInShortcut = inventoryBus.state.shortcuts.includes(item.id);

  let fill = RARITY_FILL[item.quality] || INV.tileFill;
  let border = RARITY_BORDER[item.quality] || INV.tileBorder;
  let borderWidth = '0.5px';

  if (item.type === 'potion') {
    const tint = POTION_TINT[item.potionKind] || POTION_TINT.other;
    fill = tint.fill; border = tint.border;
  }
  if (item.isNew) {
    border = INV.newAccentBorder;
    fill = INV.newAccentFill;
    borderWidth = '2px';
  }
  if (item.quality === 'godly') {
    fill = INV.godlyBg;
  }

  const labelRight = item.count
    ? `×${item.count}`
    : (item.tier ? `T${item.tier}` : '');

  return (
    <div onClick={onTap} style={{
      position: 'relative', width: '100%', aspectRatio: '1',
      background: fill, border: `${borderWidth} solid ${border}`, borderRadius: 8,
      overflow: 'hidden', cursor: 'pointer', userSelect: 'none', touchAction: 'manipulation',
    }}>
      {/* Object render */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingBottom: '20%',
      }}>
        <ItemArt item={item} size="68%" />
      </div>

      {/* Layer 3: small crafter mark in bottom-left */}
      {layer3 && item.crafter && (
        <div style={{
          position: 'absolute', left: 4, bottom: 26,
          fontSize: 8, color: 'rgba(232,212,160,0.7)', fontFamily: FONT.mono,
        }}>{item.crafter[0].toUpperCase()}</div>
      )}

      {/* NEW pill, top-left */}
      {item.isNew && (
        <div style={{
          position: 'absolute', top: 4, left: 4,
          background: INV.newBadge, color: '#fff',
          fontSize: 9, fontWeight: 500, fontFamily: FONT.sans,
          padding: '1px 6px', borderRadius: 9,
        }}>NEW</div>
      )}

      {/* Shortcut badge, top-right */}
      {isInShortcut && layer3 !== false && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          width: 14, height: 14, borderRadius: 7,
          background: INV.shortcutBadgeBg,
          border: '0.5px solid rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 7, height: 7, background: INV.shortcutBadgeColor,
            transform: 'rotate(45deg)',
          }} />
        </div>
      )}

      {/* Bottom banner */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '30%',
        background: INV.tileBannerGrad,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '10px 6px 4px', gap: 4,
      }}>
        <div style={{
          flex: 1, minWidth: 0,
          fontSize: 11, fontWeight: 500, color: INV.textPrimary,
          fontFamily: FONT.sans, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{item.name || '(item)'}</div>
        <div style={{
          flexShrink: 0, fontSize: 9, color: 'rgba(255,255,255,0.6)',
          fontFamily: FONT.mono,
        }}>{labelRight}</div>
      </div>
    </div>
  );
};
