import React from 'react';
import { INV, FONT, RARITY_BORDER, POTION_TINT } from './inventoryStyles.js';
import { ItemArt } from './ItemArt.jsx';
import { inventoryBus } from './inventoryBus.js';

/* v2.3.1228: Lantern Slate §11 slot system — occupied slots use the
   radial "mist" fill over --ui-slot; rarity is a thin EDGE language
   (1px common @55%, 2px rare+, Godly = animated conic ring via the
   .ls-slot--godly class in game.css) and never changes the fill. */
const MIST_FILL =
  'radial-gradient(circle at 48% 42%, rgba(238,240,225,.16) 0%, rgba(238,240,225,.05) 48%, rgba(238,240,225,0) 76%), #243137';
const RARITY_CLASS = {
  rare: 'ls-slot--rare',
  elite: 'ls-slot--legendary',
  godly: 'ls-slot--godly',
};

export const InventoryTile = ({ item, onTap, layer3 }) => {
  const isInShortcut = inventoryBus.state.shortcuts.includes(item.id);

  const fill = MIST_FILL;
  let border = RARITY_BORDER[item.quality] || RARITY_BORDER.normal;
  let borderWidth = item.quality === 'rare' || item.quality === 'elite' ? '2px' : '1px';

  if (item.type === 'potion' && (!item.quality || item.quality === 'normal')) {
    /* potion-kind tint only where rarity wouldn't own the edge */
    const tint = POTION_TINT[item.potionKind] || POTION_TINT.other;
    border = tint.border;
  }
  if (item.quality === 'godly') {
    /* the conic ::after ring replaces the border exactly (2px pad) */
    border = 'transparent';
    borderWidth = '2px';
  }

  const labelRight = item.count
    ? `×${item.count}`
    : (item.tier ? `T${item.tier}` : '');

  return (
    <div onClick={onTap} className={RARITY_CLASS[item.quality] || ''} style={{
      position: 'relative', width: '100%', aspectRatio: '1',
      background: fill, border: `${borderWidth} solid ${border}`, borderRadius: 8,
      overflow: 'hidden', cursor: 'pointer', userSelect: 'none', touchAction: 'manipulation',
    }}>
      {/* Object render — ~80% optical box + the §5 icon shadow */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        paddingBottom: '20%',
        filter: 'drop-shadow(0 1px 0 rgba(255,255,255,.18)) drop-shadow(0 2px 3px rgba(0,0,0,.22))',
      }}>
        <ItemArt item={item} size="74%" />
      </div>

      {/* Layer 3: small crafter mark in bottom-left */}
      {layer3 && item.crafter && (
        <div style={{
          position: 'absolute', left: 4, bottom: 26,
          fontSize: 10, color: 'rgba(232,212,160,0.7)', fontFamily: FONT.mono, /* v2.3.1239: 10px font floor (was 8) */
        }}>{item.crafter[0].toUpperCase()}</div>
      )}

      {/* v2.3.1228: NEW = 6px brass dot with a 2px dark keyline (§11
          state matrix) — replaces the text pill; no pulse. */}
      {item.isNew && (
        <div style={{
          position: 'absolute', top: 4, left: 4,
          width: 6, height: 6, borderRadius: '50%',
          background: '#D8A85F',
          border: '2px solid #10181D',
          boxSizing: 'content-box',
        }} />
      )}

      {/* Shortcut badge, top-right */}
      {isInShortcut && layer3 !== false && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          width: 14, height: 14, borderRadius: 7,
          background: INV.shortcutBadgeBg,
          border: '0.5px solid rgba(238, 242, 235, 0.32)',
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
          flexShrink: 0, fontSize: 10, color: 'rgba(238, 242, 235, 0.65)', /* v2.3.1239: 10px font floor (was 9) */
          fontFamily: FONT.mono,
        }}>{labelRight}</div>
      </div>
    </div>
  );
};
