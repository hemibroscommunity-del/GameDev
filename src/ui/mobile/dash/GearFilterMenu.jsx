/* ═══ v2.3.4151: GEAR'S FILTER MENU ("Show": All items, then the groups, each with its count) ═══
 * v2.3.6688 (card UI2-gear PR 2): out of GearTab.jsx into its own file, the same menu for today's Gear
 * (`?ui2=0`) and the two panels (GearPanels.jsx), down over the bag's panel only.  `box` is its place
 * inside that panel (left, right, top, bottom). */
import React from 'react';
import { COL } from './common.js';
import { GEAR_FILTER_GROUPS, GEAR_FILTERS } from './itemCategory.js';
import { gearTabBus } from './gearTabBus.js';
import { WEAPON_STASH_MAX } from '../../../data/gameSystems.js';

export const GearFilterMenu = ({ fid, allEntries, counts, weaponsHeld, box }) => (
    <div data-gear-menu="" style={{
      position: 'absolute', ...box, zIndex: 6,
      background: COL.bg, border: `1px solid ${COL.borderStrong}`, borderRadius: 8,
      boxShadow: '0 8px 18px rgba(4,7,9,.45)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px 2px 8px', borderBottom: `1px solid ${COL.divider}` }}>
        <span style={{ flex: 'none', fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: COL.muted }}>Show</span>
        {/* the weapon bag's fill -- no cap on the bag (only the weapon bag has one) */}
        <span data-gear-fill="" style={{ flex: 1, minWidth: 0, textAlign: 'right', fontSize: 10, fontWeight: 700, color: COL.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>
          weapons {weaponsHeld}/{WEAPON_STASH_MAX}
        </span>
        <button type="button" data-esc="" data-key="Esc" data-key-at="hang" aria-label="Close the filter menu"
          onClick={(e) => { e.stopPropagation(); gearTabBus.setMenu(false); }}
          style={{ position: 'relative', flex: 'none', width: 34, height: 32, padding: 0, border: 'none', background: 'transparent', color: COL.text, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', touchAction: 'manipulation' }}>{'✕'}</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', touchAction: 'pan-y', padding: 3 }}>
        {[{ id: 'all', label: 'All items', rows: ['all'] }].concat(GEAR_FILTER_GROUPS).map((g) => {
          const n = g.rows.reduce((a, id) => a + (id === 'all' ? allEntries.length : (counts[id] || 0)), 0);
          const multi = g.rows.length > 1;
          return (
            <div key={g.id} data-gear-group={g.id} style={{ opacity: n ? 1 : 0.42 }}>
              {multi && <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: COL.muted, padding: '5px 6px 2px' }}>{g.label}</div>}
              {g.rows.map((id) => {
                const c = id === 'all' ? allEntries.length : (counts[id] || 0);
                const word = id === 'all' ? 'All items' : multi ? GEAR_FILTERS[id].pill : g.label;
                const cur = fid === id;
                return (
                  <button type="button" key={id} data-gear-filter-row={id} data-count={c}
                    onClick={(e) => { e.stopPropagation(); gearTabBus.pickFilter(id); }}
                    style={{
                      width: '100%', minHeight: 34, display: 'flex', alignItems: 'center', gap: 6,
                      padding: multi ? '0 8px 0 14px' : '0 8px', boxSizing: 'border-box', borderRadius: 6,
                      border: `1px solid ${cur ? COL.accent : 'transparent'}`, background: cur ? COL.accentFill : 'transparent',
                      color: c ? COL.text : COL.disabled, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
                      textAlign: 'left', cursor: 'pointer', touchAction: 'manipulation',
                    }}>
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{word}</span>
                    <span style={{ flex: 'none', fontSize: 11, fontWeight: 800, color: COL.muted, fontVariantNumeric: 'tabular-nums' }}>{c}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
);
