import React, { useEffect, useRef, useState } from 'react';
import { COL, TIER_COLOR, panelStyle, getState } from './common.js';

// Category filter chips — icon-only.  "All" comes first so the player
// always opens the bag with everything visible.
const CATEGORIES = [
  { id: 'all',      glyph: '◎', label: 'All' },
  { id: 'weapon',   glyph: '⚔', label: 'Weapon' },
  { id: 'armor',    glyph: '🛡', label: 'Armor' },
  { id: 'potion',   glyph: '🧪', label: 'Potion' },
  { id: 'crafting', glyph: '⚒', label: 'Crafting' },
];

// Light heuristic — classify an inventory key into one of the four
// category filters.  Items the heuristic doesn't recognise fall through
// to "crafting" since most pickup keys (wood_oak, fish_salmon, ore_iron,
// monster bones, etc.) are crafting materials.
const classify = (key) => {
  const k = (key || '').toLowerCase();
  if (/sword|bow|staff|spear|axe|dagger|hammer|wand|gauntlet/.test(k)) return 'weapon';
  if (/helm|cuirass|armor|shield|robe|cape|boots|gloves|mail|plate/.test(k)) return 'armor';
  if (/potion|elixir|tonic|salve|brew|tincture/.test(k)) return 'potion';
  return 'crafting';
};

// Friendly icon for a key — looks up by simple pattern.  Falls back to
// a tier-coloured ◇.  We keep things lightweight: the bag is a dashboard
// glance tool, not a crafting deep-dive.
const iconFor = (key) => {
  const k = (key || '').toLowerCase();
  if (/sword/.test(k))   return '⚔';
  if (/bow/.test(k))     return '🏹';
  if (/staff|wand/.test(k)) return '🪄';
  if (/shield|armor|helm|plate|mail/.test(k)) return '🛡';
  if (/potion|elixir|tonic|salve/.test(k))    return '🧪';
  if (/wood|log|plank/.test(k))               return '🪵';
  if (/fish|salmon|cod|trout/.test(k))        return '🐟';
  if (/ore|iron|copper|stone|gem/.test(k))    return '⛏';
  if (/herb|leaf|flower/.test(k))             return '🌿';
  if (/bone|skull|tooth/.test(k))             return '🦴';
  if (/coin|gold/.test(k))                    return '🪙';
  return '◇';
};

const ItemTile = ({ ikey, count }) => {
  const cat = classify(ikey);
  const color = TIER_COLOR[cat === 'weapon' ? 'rare' : cat === 'armor' ? 'uncommon' : 'common'] || COL.muted;
  return (
    <div style={{
      width: '100%', aspectRatio: '1 / 1',
      background: COL.tile,
      border: `1.5px solid ${color}`,
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 16,
      position: 'relative',
    }} title={ikey}>
      <span>{iconFor(ikey)}</span>
      {count > 1 && (
        <span style={{
          position: 'absolute', bottom: 1, right: 3,
          fontSize: 10, color: COL.text,
          textShadow: '0 0 2px #000',
        }}>{count}</span>
      )}
    </div>
  );
};

export const InventoryPanel = () => {
  const [, force] = useState(0);
  const [filter, setFilter] = useState('all');
  // Component-local recency tracking: every time we see a key's count
  // increase versus the previous frame, that key bubbles to the front
  // of recentRef.current.  This is the cheapest way to honour
  // "most recent items appear in upper-left" without modifying every
  // pickup site in the game loop.
  const recentRef = useRef([]);
  const prevCountRef = useRef({});

  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 400);
    return () => clearInterval(id);
  }, []);

  const S = getState();
  const inv = (S?.rpg?.inventory) || {};

  // Diff against last frame — bubble up any key whose count increased.
  const prev = prevCountRef.current;
  const recents = recentRef.current.slice();
  for (const [k, n] of Object.entries(inv)) {
    if ((prev[k] || 0) < n) {
      const idx = recents.indexOf(k);
      if (idx >= 0) recents.splice(idx, 1);
      recents.unshift(k);
    }
  }
  // Stitch in any keys we haven't seen yet (e.g. on initial mount with a
  // pre-populated inventory) at the back so they're still visible.
  for (const k of Object.keys(inv)) {
    if (!recents.includes(k)) recents.push(k);
  }
  // Drop keys whose count is 0 / missing.
  const visible = recents.filter(k => (inv[k] || 0) > 0);
  recentRef.current = visible;
  prevCountRef.current = { ...inv };

  // Apply the active category filter.
  const filtered = filter === 'all'
    ? visible
    : visible.filter(k => classify(k) === filter);

  // Gold display — moved here from the dashboard's name strip.
  const R = (S && S.rpg) || {};
  const gold =
    (R._compStats && (R._compStats.totalGoldEarned || R._compStats.goldEarnedTotal)) ||
    R.goldEarned || R.coins || R.gold || 0;
  const goldNuggets = R.goldNuggets || 0;
  const goldBars = R.goldBars || 0;

  return (
    <div style={panelStyle}>
      {/* Gold strip — current coin count + raw gold tallies. */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '0 2px 6px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 6,
        fontSize: 15,
      }}>
        <span style={{ color: '#f5c542', fontWeight: 700 }}>
          🪙 {Number(gold).toLocaleString()}
        </span>
        {(goldNuggets > 0 || goldBars > 0) && (
          <span style={{ color: COL.muted, fontSize: 13 }}>
            {goldBars > 0 ? `▮${goldBars}` : ''}
            {goldBars > 0 && goldNuggets > 0 ? ' · ' : ''}
            {goldNuggets > 0 ? `◇${goldNuggets}` : ''}
          </span>
        )}
      </div>

      {/* Filter strip — icon-only chips. */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {CATEGORIES.map(c => {
          const active = c.id === filter;
          return (
            <button key={c.id}
              onClick={() => setFilter(c.id)}
              title={c.label}
              style={{
                flex: 1,
                padding: '4px 0',
                background: active ? COL.accent : 'transparent',
                color: active ? '#fff' : COL.muted,
                border: `1px solid ${active ? COL.accent : COL.tileBor}`,
                borderRadius: 4,
                fontFamily: 'inherit',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >{c.glyph}</button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: COL.muted, fontSize: 12, textAlign: 'center', padding: '14px 0' }}>
          {filter === 'all' ? 'Bag is empty.' : 'No items in this category.'}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 6,
        }}>
          {filtered.slice(0, 32).map(k => (
            <ItemTile key={k} ikey={k} count={inv[k]} />
          ))}
        </div>
      )}
    </div>
  );
};
