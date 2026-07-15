import React from 'react';
import { COL } from '../dash/common.js';

/* v2.3.1285: THE square slot component of the nav-system (spec: "all
   slots use the same dimensions, corner radius, border weight, padding,
   icon-safe area, and gaps").  Styling ported from the retired Loadout
   slotCell (rarity edges, brass occupied edge) with the ghost variant
   for empty equipped positions (25-30% opacity pictogram). */
/* v2.3.1320 (owner: "understood without using language"): `wornSrc` —
   a small badge icon in the tile's top-right corner marking an
   OCCUPIED equipped slot as "worn".  Replaces the EQUIP text rail;
   the owner's bag-equipped art is the glyph.  Ghost slots carry no
   badge (the silhouette already says "empty gear position"). */
export const SlotTile = ({ k, label, iconSrc, ghostSrc, onTap, occupied, quality, badge, wornSrc, children }) => {
  const rarityEdge = quality === 'rare' ? '#5B99DE'
    : quality === 'elite' ? '#A477DF' : null;
  const godly = quality === 'godly';
  return (
    <div key={k}
      className={godly ? 'ls-slot--godly' : (quality === 'rare' ? 'ls-slot--rare' : quality === 'elite' ? 'ls-slot--legendary' : '')}
      onPointerUp={onTap ? (e) => {
        e.stopPropagation();
        let anchor = null;
        try {
          const rect = e.currentTarget.getBoundingClientRect();
          anchor = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
        } catch (_e) {}
        onTap(anchor);
      } : undefined}
      title={label}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        background: occupied ? COL.brassFill : COL.wellSoft,
        border: godly ? '2px solid transparent'
          : rarityEdge ? `2px solid ${rarityEdge}`
          : occupied ? '1px solid rgba(216,168,95,.7)' : `1px solid ${COL.tileBor}`,
        boxShadow: occupied && !rarityEdge && !godly ? 'inset 0 0 6px rgba(245,199,70,0.3)' : 'inset 0 2px 4px rgba(0,0,0,.30)',
        cursor: onTap ? 'pointer' : 'default',
        touchAction: 'none',
        minWidth: 0,
        minHeight: 0,
        aspectRatio: '1 / 1',
        width: '100%',
      }}>
      {iconSrc ? (
        <img src={iconSrc} alt={label} draggable={false}
          style={{
            width: '82%', height: '82%', objectFit: 'contain',
            imageRendering: 'pixelated',
            userSelect: 'none', pointerEvents: 'none',
          }} />
      ) : ghostSrc ? (
        /* Empty-state ghost pictogram: low-contrast, ~28% opacity,
           grayscaled so real item art can stand in for missing
           silhouette assets (spec §Top row).  When the slot is OCCUPIED
           but the item has no art yet (amulet), the same pictogram
           renders at full strength instead. */
        <img src={ghostSrc} alt="" aria-hidden="true" draggable={false}
          style={{
            width: '68%', height: '68%', objectFit: 'contain',
            imageRendering: 'pixelated',
            opacity: occupied ? 0.95 : 0.28,
            filter: occupied ? 'none' : 'grayscale(1)',
            userSelect: 'none', pointerEvents: 'none',
          }} />
      ) : null}
      {badge != null && (
        <span className="bt-item-qty">{badge}</span>
      )}
      {occupied && wornSrc && (
        <span aria-hidden="true" style={{
          position: 'absolute', top: 2, right: 2,
          width: 15, height: 15,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(9,14,17,.85)',
          border: '1px solid rgba(216,170,88,.55)',
          borderRadius: 4,
          pointerEvents: 'none', zIndex: 1,
        }}>
          <img src={wornSrc} alt="" draggable={false}
            style={{ width: 11, height: 11, objectFit: 'contain' }} />
        </span>
      )}
      {children}
    </div>
  );
};
