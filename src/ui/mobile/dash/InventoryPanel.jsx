import React, { useEffect, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { eatBus } from '../eatBus.js';
import { itemDetailBus } from './itemDetailBus.js';
import { isLocked as itemIsLocked } from './inventoryLocks.js';
import { reconcileGearStash } from '../../../rendering/gearCatalog.js';
import { getBagEntries } from './bagModel.js';

// Category filter chips.  "All" comes first so the player always opens
// the bag with everything visible.  v2.3.1231: UI Bible icons replace
// the legacy emoji glyphs (owner request); glyph kept as the
// image-failure fallback.  No potion icon exists in the 90-icon set,
// so Potion borrows the soak droplets until one is generated.
export const CATEGORIES = [
  { id: 'all',      glyph: '◎', iconSrc: '/icons/ui/nav-inventory.webp?v=2.3.1231',       label: 'All' },
  { id: 'weapon',   glyph: '⚔', iconSrc: '/icons/ui/combat-melee.webp?v=2.3.1231',        label: 'Weapon' },
  { id: 'armor',    glyph: '🛡', iconSrc: '/icons/ui/combat-defense.webp?v=2.3.1231',      label: 'Armor' },
  { id: 'potion',   glyph: '🧪', iconSrc: '/icons/ui/status-soak.webp?v=2.3.1231',         label: 'Potion' },
  { id: 'crafting', glyph: '⚒', iconSrc: '/icons/ui/skill-blacksmithing.webp?v=2.3.1231', label: 'Crafting' },
];

// Light heuristic — classify an inventory key into one of the four
// category filters.  Items the heuristic doesn't recognise fall through
// to "crafting" since most pickup keys (wood_oak, fish_salmon, ore_iron,
// monster bones, etc.) are crafting materials.
export const classify = (key) => {
  const k = (key || '').toLowerCase();
  if (/sword|bow|staff|spear|axe|dagger|hammer|wand|gauntlet/.test(k)) return 'weapon';
  if (/helm|cuirass|armor|shield|robe|cape|boots|gloves|mail|plate/.test(k)) return 'armor';
  if (/potion|elixir|tonic|salve|brew|tincture/.test(k)) return 'potion';
  return 'crafting';
};

// Per-key thumbnail asset overrides.  When present, ItemTile renders an
// <img> instead of the emoji glyph so the bag reflects what the player
// actually caught/crafted.  Currently only fish-08 is wired — map all
// fish_* inventory keys to its frame-0 thumbnail; expand once additional
// fish sprites are wired into the minigame.
const WOOD_THUMB = '/icons/wood/wood-log.webp';
const BURNT_DUST_THUMB = '/icons/cook/burnt-dust.webp';
const SLIME_REMNANTS_THUMB = '/icons/monsters/slime-remnants.webp';
const SNOWMAN_REMNANTS_THUMB = '/icons/monsters/snowman-remnants.webp';
const FIRE_GOBLIN_REMNANTS_THUMB = '/icons/monsters/fire-goblin-remnants.webp';
const SKELETON_REMNANTS_THUMB = '/icons/monsters/skeleton-remnants.webp';
/* Per-tier fish thumbnails (raw + cooked).  Order matters in thumbFor:
   match longer prefixes first so e.g. fish_clownfish doesn't fall
   through to the generic fish_ branch. Add an entry per tier; the
   generic 'fish' / 'cooked_fish' fallbacks catch unmapped tiers. */
const FISH_THUMBS = {
  fish_clownfish: '/icons/fish/fish-clownfish.webp',
};
const COOKED_FISH_THUMBS = {
  cooked_fish_clownfish: '/icons/cook/cooked-fish-clownfish.webp',
};
const FISH_THUMB_DEFAULT = '/icons/fish/fish-minnow.webp';
const COOKED_FISH_THUMB_DEFAULT = '/icons/cook/cooked-fish-minnow.webp';
const ORE_THUMBS = {
  ore_copper_ore: '/icons/ore/ore-copper.webp',
};
const ORE_THUMB_DEFAULT = '/icons/ore/ore-copper.webp';
const FISHING_POLE_THUMB = '/icons/tools/fishing-pole.webp';
/* Elemental shards: one PNG per zone, all under /icons/shards/<key>.webp
   following the keys defined in src/data/shards.js (shard_meadow,
   shard_ember, ...).  thumbFor() takes the shard_ prefix branch
   below so any zone we add later just needs the PNG dropped in --
   no new code in the inventory panel. */
export const thumbFor = (key) => {
  const k = (key || '').toLowerCase();
  if (COOKED_FISH_THUMBS[k])        return COOKED_FISH_THUMBS[k];
  if (k.startsWith('cooked_fish_')) return COOKED_FISH_THUMB_DEFAULT;
  if (k.startsWith('burnt_'))       return BURNT_DUST_THUMB;
  if (FISH_THUMBS[k])               return FISH_THUMBS[k];
  if (k.startsWith('fish_'))        return FISH_THUMB_DEFAULT;
  if (k.startsWith('wood_'))        return WOOD_THUMB;
  if (ORE_THUMBS[k])                return ORE_THUMBS[k];
  if (k.startsWith('ore_'))         return ORE_THUMB_DEFAULT;
  if (k.startsWith('shard_'))       return `/icons/shards/${k}.webp`;
  if (k === 'fishing_pole')         return FISHING_POLE_THUMB;
  if (k === 'slime-remnants')       return SLIME_REMNANTS_THUMB;
  if (k === 'fire-goblin-remnants') return FIRE_GOBLIN_REMNANTS_THUMB;
  if (k === 'skeleton-remnants')    return SKELETON_REMNANTS_THUMB;
  if (k === 'snowman')              return SNOWMAN_REMNANTS_THUMB;
  return null;
};

// Friendly icon for a key — looks up by simple pattern.  Falls back to
// a tier-coloured ◇.  We keep things lightweight: the bag is a dashboard
// glance tool, not a crafting deep-dive.
export const iconFor = (key) => {
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

export const ItemTile = ({ ikey, count, style: styleOverride }) => {
  /* v2.3.1228: owner correction — the bag showed category colors
     (weapons blue, armor green) that read as fake rarity and clashed
     with the popup's honest grey.  Materials/keys carry no quality, so
     every plain inventory tile gets the quiet common edge (§11). */
  const color = 'rgba(139, 150, 149, 0.55)';
  /* v2.3.177 (F3): every tile opens the ItemDetailPopup -- cook /
     eat / lock all flow through the popup's action buttons now,
     so the inline tap handlers for fish are deprecated. The popup
     decides what actions are valid for the item. */
  const handleTap = (e) => {
    e.stopPropagation();
    /* v2.3.210: capture tile rect so the popup can anchor itself
       beside the tapped cell instead of centering on the viewport. */
    let anchor = null;
    try {
      const rect = e.currentTarget.getBoundingClientRect();
      anchor = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    } catch (_e) {}
    itemDetailBus.open({ kind: 'inventory', key: ikey, count: count || 0, anchor });
  };
  const locked = itemIsLocked(ikey);
  return (
    <div onPointerUp={handleTap} style={{
      width: '100%', aspectRatio: '1 / 1',
      background: COL.tile,
      border: `1px solid ${color}`,
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18,
      position: 'relative',
      cursor: 'pointer',
      touchAction: 'manipulation',
      /* v2.3.162: caller can override sizing (e.g. drop aspectRatio so
         tiles fill non-square cells in the dashboard inventory preview). */
      ...(styleOverride || {}),
    }} title={ikey}>
      {(() => {
        const thumb = thumbFor(ikey);
        return thumb
          ? <img src={thumb} alt={ikey} draggable={false}
              style={{ width: '85%', height: '85%', objectFit: 'contain', imageRendering: 'auto' }} />
          : <span>{iconFor(ikey)}</span>;
      })()}
      {count > 1 && (
        <span style={{
          position: 'absolute', bottom: 1, right: 3,
          fontSize: 15, color: COL.text,
          textShadow: '0 1px 2px rgba(0,0,0,.8)',
        }}>{count}</span>
      )}
      {locked && (
        /* v2.3.177: anchor glyph in the upper-right corner of anchored
           tiles. Matches the popup's anchor-glyph styling.
           v2.3.1070: ⚓ replaces the old "L" -- an anchored item stays
           pinned to the bag instead of scrolling off with recency. */
        <span style={{
          position: 'absolute', top: 1, right: 1,
          width: 14, height: 14,
          background: 'rgba(9, 14, 17, 0.85)',
          border: '1px solid #f5c542',
          borderRadius: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, lineHeight: 1,
        }}>⚓</span>
      )}
    </div>
  );
};

export const InventoryPanel = () => {
  const [, force] = useState(0);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 400);
    return () => clearInterval(id);
  }, []);

  const S = getState();

  /* v2.3.687: self-healing gear stash -- restore any orphaned steel piece
     (e.g. unequipped via the Equipment menu's toggle, which predates the
     stash) so it can always be re-equipped from the bag. */
  if (S?.rpg) {
    try {
      if (reconcileGearStash(S.rpg)) {
        localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
      }
    } catch (e) { /* reconcile is best-effort */ }
  }

  /* v2.3.1070: the bag (full panel) and the quick-bag preview now read the
     SAME ordered entry list, so they always match.  Unequipped Loadout gear
     rides in this list as stash entries -- taking an item off therefore drops
     it straight into both surfaces, newest-first (unless anchored). */
  const entries = getBagEntries(S?.rpg);
  const filtered = filter === 'all'
    ? entries
    : entries.filter(e => e.cat === filter);

  const SLOTS = 32;
  const shownItems = filtered.slice(0, SLOTS);
  const usedTiles = shownItems.length;

  return (
    <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>

      {/* Filter strip — labeled category chips (glyph + name).
          v2.3.1235: row scrolls horizontally (nowrap + pan-x) so chips
          never squash as categories grow; labels lifted to the 11px type
          floor; active state is the brass-soft TINT + brass hairline per
          the correction-pass palette (solid accent fills retired).
          v2.3.1236: owner feedback — "the inventory menu says 'bag'
          multiple times": the panel's own "BAG" label row is gone.
          v2.3.1240: the sheet header now says INVENTORY, distinguishing
          this deeper destination from the always-on quick Bag.  The
          "N / 32" counter it carried now sits at the right end of this
          row, OUTSIDE the scrollable chip strip so it never scrolls
          away; the freed row height goes to larger slot tiles below. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 4, flexWrap: 'nowrap', overflowX: 'auto', touchAction: 'pan-x', WebkitOverflowScrolling: 'touch' }}>
        {CATEGORIES.map(c => {
          const active = c.id === filter;
          return (
            <button key={c.id}
              onClick={() => setFilter(c.id)}
              title={c.label}
              style={{
                flex: '1 0 auto', minWidth: 56,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                padding: '4px 8px',
                background: active ? COL.accentFill : 'transparent',
                color: active ? COL.text : COL.muted,
                border: `1px solid ${active ? COL.accent : COL.border}`,
                borderRadius: 5,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {c.iconSrc
                ? <img src={c.iconSrc} alt="" draggable={false}
                    style={{ width: 18, height: 18, objectFit: 'contain' }}
                    onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(c.glyph)); }} />
                : <span style={{ fontSize: 14, lineHeight: 1 }}>{c.glyph}</span>}
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.02em' }}>{c.label}</span>
            </button>
          );
        })}
      </div>
      {/* v2.3.1236: slot counter (kept from the removed BAG row). */}
      <span style={{ flex: 'none', fontSize: 11, color: COL.muted, paddingRight: 2 }}>
        {Math.min(usedTiles, SLOTS)} / {SLOTS}
      </span>
      </div>

      {/* v2.3.1235: the empty bag no longer renders the recessed tray —
          an enormous bordered rectangle around one small message read as
          a broken screen (owner correction).  Zero items = icon + message
          centered directly on the sheet; the tray/grid below is unchanged
          and only mounts once there is something to hold. */}
      {usedTiles === 0
        ? (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '24px 8px', textAlign: 'center', color: COL.muted }}>
            {/* v2.3.1224: UI Bible satchel icon */}
            <img src="/icons/ui/nav-inventory.webp?v=2.3.1224" alt="" draggable={false}
              style={{ width: 40, height: 40, opacity: 0.4, filter: 'grayscale(1)' }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: COL.text2 }}>
              {filter === 'all' ? 'Your bag is empty.' : `No ${(CATEGORIES.find(c => c.id === filter)?.label || 'matching').toLowerCase()} items yet.`}
            </div>
            {filter === 'all' && (
              /* v2.3.1235: 10.5px lavender-gray → 12px palette muted (type
                 floor + no off-palette grays). */
              <div style={{ fontSize: 12, color: COL.muted, maxWidth: 220 }}>
                Defeat monsters and gather materials to fill it up.
              </div>
            )}
          </div>
        )
        : (
          /* v2.3.1229: Lantern Slate recessed tray replaces the red leather
             here too (spec hard lock: leather removed EVERYWHERE — the
             v2.3.1227 sweep caught the preview grid but missed this one,
             owner-reported with a screenshot). */
          <div style={{
            background: COL.well,
            border: `1px solid ${COL.tileBor}`,
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
            borderRadius: 10,
            /* v2.3.1236: owner feedback — LARGER slots, same 32 capacity.
               32 is display-only (no server or pickup enforcement — see
               PR notes), but capacity is a game-balance call for the
               owner, so instead of a 5th row the tiles grow: tray
               padding 8→6 and grid gap 6→4 hand each of the 8 columns
               ~2.3px more width (tiles are square, so height follows),
               and the removed BAG label row absorbs the taller rows. */
            padding: 6,
            flex: 1,
            minHeight: 0,
          }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: 4,
          }}>
            {shownItems.map((e, i) => (
              <BagTile key={e.kind === 'item' ? `i-${e.key}` : `${e.kind}-${e.index}-${i}`} entry={e} />
            ))}
            {/* Empty slots so the bag always reads as a full grid of squares.
                v2.3.1039: recessed dark fill + clearly-visible outline (the old
                COL.tileBor at .10 alpha vanished against the leather bg). */}
            {Array.from({ length: Math.max(0, SLOTS - usedTiles) }).map((_, i) => (
              <div key={`empty-${i}`} aria-hidden="true" style={{
                width: '100%', aspectRatio: '1 / 1',
                background: 'rgba(0,0,0,0.28)',
                border: '1px solid rgba(238, 242, 235, 0.24)',
                borderRadius: 6,
              }} />
            ))}
          </div>
          </div>
        )}
    </div>
  );
};

/* v2.3.1070: dispatch a shared bag entry to the right tile so the quick-bag
   preview and the full Bag panel render identical tiles from one list. */
export const BagTile = ({ entry }) => {
  if (!entry) return null;
  if (entry.kind === 'item') {
    return <ItemTile ikey={entry.key} count={entry.count} />;
  }
  return <StashTile kind={entry.kind} obj={entry.obj} index={entry.index} />;
};

/* Stash tile for an unequipped weapon or shield.  Opens the popup
   with the stashWeapon / stashShield kind so the Equip action wires
   it back into the matching loadout slot. */
const StashTile = ({ kind, obj, index }) => {
  /* v2.3.1070: anchored stash items show the same ⚓ badge as inventory
     tiles -- the popup anchors them under the matching index-based key. */
  const locked = itemIsLocked(`${kind}_${index}`);
  const handleTap = (e) => {
    e.stopPropagation();
    let anchor = null;
    try {
      const rect = e.currentTarget.getBoundingClientRect();
      anchor = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    } catch (_e) {}
    if (kind === 'stashShield') {
      itemDetailBus.open({ kind: 'stashShield', shield: obj, index, anchor });
    } else if (kind === 'stashArmor') {
      /* v2.3.228: armor stash tile -> popup with Equip action. */
      itemDetailBus.open({ kind: 'stashArmor', armor: obj, index, anchor });
    } else if (kind === 'stashGear') {
      /* v2.3.685: unequipped worn gear (steel chest/legs). */
      itemDetailBus.open({ kind: 'stashGear', gear: obj, index, anchor });
    } else {
      itemDetailBus.open({ kind: 'stashWeapon', wpn: obj, index, anchor });
    }
  };
  const v = '2.3.211';
  const thumb = kind === 'stashGear'
    ? ((obj && (obj.gearId === 'steelplate' || obj.gearId === 'steelgreaves'))
        ? `/sprites/gear/icons/${obj.gearId}.webp?v=2.3.685` : null)
    : kind === 'stashArmor'
    ? null /* no armor sprites yet -- glyph fallback below */
    : kind === 'stashShield'
    ? (obj && obj.gearBase === 'wood' ? `/sprites/shields/wood-shield-front.webp?v=${v}` : null)
    : obj && obj.type === 'bow'   ? `/sprites/weapons/bows/Bow2.webp?v=${v}`
    : obj && obj.type === 'staff' ? `/sprites/weapons/staffs/Wizard%20Staff2.webp?v=${v}`
    : obj && obj.gearBase === 'wood' ? `/sprites/weapons/swords/steel-sword-east.webp?v=2.3.1070` /* v2.3.1070: mini steel-sword icon, not bamboo */
    : `/sprites/weapons/swords/Sword1.webp?v=${v}`;
  /* v2.3.1228: edge from the item's REAL quality (weapons carry
     server-rolled quality; shields/armor have none -> common grey).
     Godly gets the conic ring class instead of a border color. */
  const q = obj && obj.quality;
  const color = q === 'rare' ? '#5B99DE'
    : q === 'elite' ? '#A477DF'
    : q === 'godly' ? 'transparent'
    : 'rgba(139, 150, 149, 0.55)';
  const edgeWidth = (q === 'rare' || q === 'elite' || q === 'godly') ? 2 : 1;
  const rarityClass = q === 'rare' ? 'ls-slot--rare'
    : q === 'elite' ? 'ls-slot--legendary'
    : q === 'godly' ? 'ls-slot--godly' : '';
  const fallbackGlyph = kind === 'stashShield' ? '\u{1F6E1}'
                      : kind === 'stashArmor'  ? '\u{1F9BA}'
                      : kind === 'stashGear'   ? (obj && obj.slot === 'legs' ? '\u{1F456}' : '\u{1F9BA}')
                      :                          '⚔';
  return (
    <div onPointerUp={handleTap} className={rarityClass} style={{
      width: '100%', aspectRatio: '1 / 1',
      background: COL.tile,
      border: `${edgeWidth}px solid ${color}`,
      borderRadius: 6,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
      cursor: 'pointer',
      touchAction: 'manipulation',
    }} title={(obj && obj.name) || (kind === 'stashShield' ? 'Shield' : kind === 'stashArmor' ? 'Armor' : 'Weapon')}>
      {thumb
        ? <img src={thumb} alt="" draggable={false}
            style={{ width: '85%', height: '85%', objectFit: 'contain', imageRendering: 'auto' }} />
        : <span style={{ fontSize: 18 }}>{fallbackGlyph}</span>}
      {locked && (
        <span style={{
          position: 'absolute', top: 1, right: 1,
          width: 14, height: 14,
          background: 'rgba(9, 14, 17, 0.85)',
          border: '1px solid #f5c542',
          borderRadius: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, lineHeight: 1,
        }}>⚓</span>
      )}
    </div>
  );
};
