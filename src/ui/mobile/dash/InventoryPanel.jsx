import React, { useEffect, useRef, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { eatBus } from '../eatBus.js';
import { itemDetailBus } from './itemDetailBus.js';
import { isLocked as itemIsLocked } from './inventoryLocks.js';
import { reconcileGearStash } from '../../../rendering/gearCatalog.js';
import { getBagEntries } from './bagModel.js';
import { getEquippedSlots, getEquipContribs, GHOST_SRC } from '../sheet/equipModel.js'; /* v2.3.1328: contribs */

// Category filter chips.  "All" comes first so the player always opens
// the bag with everything visible.  v2.3.1231: UI Bible icons replace
// the legacy emoji glyphs (owner request); glyph kept as the
// image-failure fallback.
// v2.3.1312 (round-8): the owner's dedicated bag filter set replaces
// the borrowed nav/combat/skill art — Potion finally gets a real
// potion instead of the soak droplets.
export const CATEGORIES = [
  { id: 'all',      glyph: '◎', iconSrc: '/icons/bag/bag-all.webp?v=2.3.1312',      label: 'All' },
  { id: 'weapon',   glyph: '⚔', iconSrc: '/icons/bag/bag-weapons.webp?v=2.3.1312',  label: 'Weapon' },
  { id: 'armor',    glyph: '🛡', iconSrc: '/icons/bag/bag-armor.webp?v=2.3.1312',    label: 'Armor' },
  { id: 'potion',   glyph: '🧪', iconSrc: '/icons/bag/bag-potions.webp?v=2.3.1312',  label: 'Potion' },
  { id: 'crafting', glyph: '⚒', iconSrc: '/icons/bag/bag-crafting.webp?v=2.3.1312', label: 'Crafting' },
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
      {/* v2.3.1249: owner-approved — the big uncontained 15px count becomes
          a compact contained badge (bottom-right, bare number, 2-digit max;
          recipe in game.css .bt-item-qty).  Shared by the quick Bag preview
          and the full Inventory panel since both render this tile.  The
          anchor badge (top-right) is untouched and cannot collide. */}
      {count > 1 && (
        <span className="bt-item-qty">{count}</span>
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
          fontSize: 10, lineHeight: 1, /* v2.3.1239: 10px font floor (was 9) */
        }}>⚓</span>
      )}
    </div>
  );
};

/* v2.3.1293 (ChatGPT round-3 §6): the selected filter survives leaving
   the destination — module-scoped, session-only.  Switching to Hero
   and back should not silently reset a Weapon filter to All. */
let _lastFilter = 'all';
/* v2.3.1326 (owner: "bag [gets] two tabs at top — one for items in
   inventory and another for equipped items; keeps the views cleaner"):
   the active tab survives leaving the destination, same as the filter. */
let _lastBagTab = 'items';

/* v2.3.1328: monochrome stat glyphs for the EQUIPPED TOTAL rows —
   simple interface indicators, not painted item icons (brief §Visual
   hierarchy).  Stroke currentColor at the muted tone. */
const StatGlyph = ({ k }) => {
  const paths = {
    DMG:   'M2 10 L9 3 M9 3 L9 6 M9 3 L6 3 M3.5 8.5 L2 10 M4 6.5 L5.5 8',      /* sword */
    DPS:   'M6 1 L7 4.5 L10.5 5.5 L7.5 7 L8.5 10.5 L6 8 L3.5 10.5 L4.5 7 L1.5 5.5 L5 4.5 Z', /* burst */
    BLOCK: 'M6 1.2 L10 2.8 V6 C10 8.4 8.4 10 6 10.8 C3.6 10 2 8.4 2 6 V2.8 Z', /* shield */
    HP:    'M6 10 C2.4 7.4 1.4 5 2.6 3.4 C3.6 2 5.4 2.4 6 3.8 C6.6 2.4 8.4 2 9.4 3.4 C10.6 5 9.6 7.4 6 10 Z', /* heart */
    GEM:   'M3.4 2 H8.6 L10.5 4.6 L6 10 L1.5 4.6 Z M1.5 4.6 H10.5 M6 10 L4.2 4.6 M6 10 L7.8 4.6', /* gem */
  };
  return (
    <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" style={{ flex: 'none', color: COL.muted }}>
      <path d={paths[k] || paths.GEM} fill="none" stroke="currentColor"
        strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const InventoryPanel = () => {
  const [, force] = useState(0);
  const [filter, setFilterState] = useState(_lastFilter);
  const setFilter = (f) => { _lastFilter = f; setFilterState(f); };
  /* v2.3.1328b (owner: "don't display the stats of each item unless
     it's tapped"): which equipped card is selected — the right pane is
     a FIXED display window showing the aggregate when nothing is
     selected and the tapped item's contribution when one is.  Not
     module-persisted: selection is a transient inspection, cleared on
     tab switch. */
  const [eqSel, setEqSel] = useState(null);
  const [bagTab, setBagTabState] = useState(_lastBagTab);
  const setBagTab = (t) => { _lastBagTab = t; setBagTabState(t); setEqSel(null); };
  /* v2.3.1327 (owner device: "the last row gets cut off"): measure the
     tab's actual box and size rows to FIT — real phones' Safari chrome
     shrinks visualViewport below the rig's 844.
     v2.3.1328 (owner mockup): the measure now sizes the CARD ROW
     height for the 2-col x 3-row card grid (pad 6+6 + 2 gaps of 6 =
     24 vertical), clamped 36..78.  ResizeObserver, not a one-shot:
     the sheet ANIMATES open over 220ms, so a mount-time measure reads
     the mid-animation (small) height and sticks at the floor. */
  const eqBoxRef = useRef(null);
  const [eqCard, setEqCard] = useState(56);
  useEffect(() => {
    if (bagTab !== 'equipped') return;
    const measure = () => {
      const el = eqBoxRef.current;
      if (!el || !el.clientHeight) return;
      /* Budget: row padding 4+4 + 2 grid gaps of 6 = 20 vertical.
         Floor 26 fits an SE-class box (~90px); below it the safety
         scroller takes over.  The cards are art + label only, so a
         26px row stays readable. */
      const t = Math.floor((el.clientHeight - 20) / 3);
      const clamped = Math.max(26, Math.min(78, t));
      setEqCard(prev => (Math.abs(prev - clamped) > 1 ? clamped : prev));
    };
    measure();
    const obs = window.ResizeObserver ? new ResizeObserver(measure) : null;
    if (obs && eqBoxRef.current) obs.observe(eqBoxRef.current);
    window.addEventListener('resize', measure);
    return () => {
      if (obs) obs.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [bagTab]);

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

  /* v2.3.1285 (nav-system spec §Bag Expanded): 6-col grid, GROWS by
     whole rows and scrolls — the bag has no real capacity (the old
     "N / 32" was display-only fiction, now retired).
     v2.3.1312 (round-8 §7): empty cells only COMPLETE the final row
     (min one row) — the old 4-row minimum padded a small bag with
     rows of dead cells that read as fake capacity. */
  const COLS = 6;
  const shownItems = filtered;
  const usedTiles = shownItems.length;
  const totalCells = Math.max(COLS, Math.ceil(usedTiles / COLS) * COLS);

  const R = (S && S.rpg) || {};
  const equipped = getEquippedSlots(R);
  const openPicker = (pickerSlot) => (anchor) => {
    const st = itemDetailBus.state;
    if (st && st.open && st.target && st.target.kind === 'loadout' && st.target.slot === pickerSlot) {
      itemDetailBus.close();
      return;
    }
    itemDetailBus.open({ kind: 'loadout', slot: pickerSlot, anchor, panel: null });
  };

  return (
    /* v2.3.1312 (round-8 §9): the PANEL no longer scrolls — equipped
       row + filter chips stay pinned while only the item tray scrolls
       (overflow moved off panelStyle onto the tray, and the bottom
       scroll-edge fade follows it there). */
    <div style={{ ...panelStyle, overflow: 'hidden', WebkitMaskImage: 'none', maskImage: 'none', display: 'flex', flexDirection: 'column' }}>

      {/* v2.3.1326 (owner): Items / Equipped segmented tabs — the
          equipped row no longer shares the screen with the item grid;
          each view gets the full sheet.  Same segmented-track pattern
          as the Friends panel's tabs. */}
      <div style={{
        display: 'flex', gap: 2, marginTop: 2, marginBottom: 8, flex: 'none',
        background: COL.well, border: `1px solid ${COL.tileBor}`,
        borderRadius: 8, padding: 3,
      }}>
        {[
          { id: 'items', label: 'Items', icon: '/icons/ui/nav-inventory.webp?v=2.3.1224' },
          { id: 'equipped', label: 'Equipped', icon: '/icons/bag/bag-equipped.webp?v=2.3.1320' },
        ].map(t => (
          <button key={t.id}
            onClick={() => setBagTab(t.id)}
            aria-pressed={bagTab === t.id}
            style={{
              flex: 1, minHeight: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: bagTab === t.id ? COL.accentFill : 'transparent',
              border: `1px solid ${bagTab === t.id ? COL.accent : 'transparent'}`,
              borderRadius: 6, color: bagTab === t.id ? COL.text : COL.text2,
              fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', touchAction: 'manipulation',
            }}>
            <img src={t.icon} alt="" draggable={false}
              style={{ width: 16, height: 16, objectFit: 'contain' }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* v2.3.1328 (owner mockup): left ~64% — six QUIET equipment
          cards (2-col x 3-row, fixed order, art + slot label only);
          right ~36% — one FIXED display window.
          v2.3.1328b (owner: "don't display the stats of each item
          unless it's tapped"): the window shows the loadout AGGREGATE
          when nothing is selected and the tapped item's contribution
          when a card is; tapping the already-selected card opens the
          existing equip modal (management stays one tap deeper), and
          tapping the window returns it to the aggregate.  Empty slots
          keep their old behavior (straight to the picker). */}
      {bagTab === 'equipped' && (() => {
        const contribs = getEquipContribs(R);
        const wornCount = equipped.filter(sl => !sl.ghost).length;
        const compactCard = eqCard < 52; /* short viewports: tighter type */
        const selSlot = equipped.find(sl => sl.slot === eqSel && !sl.ghost) || null;
        const selCard = selSlot ? contribs.cards[selSlot.slot] : null;
        return (
        <div ref={eqBoxRef} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ display: 'flex', gap: 8, padding: '4px 2px', minWidth: 0 }}>
              {/* Equipment cards, fixed order Weapon/Shield/Chest/Legs/Cape/Amulet. */}
              <div style={{
                flex: '1 1 64%', minWidth: 0,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gridAutoRows: `${eqCard}px`,
                gap: 6,
              }}>
                {equipped.map(sl => {
                  const openModal = sl.pickerSlot ? openPicker(sl.pickerSlot)
                    : sl.slot === 'amulet' && R.amulet
                      ? (anchor) => itemDetailBus.open({ kind: 'amulet', amulet: R.amulet, anchor })
                      : undefined;
                  const selected = !sl.ghost && eqSel === sl.slot;
                  /* Occupied: first tap selects (window shows the item);
                     tap again for the modal.  Empty: picker directly. */
                  const onTap = sl.ghost ? openModal
                    : (anchor) => {
                        if (eqSel === sl.slot) { openModal && openModal(anchor); }
                        else setEqSel(sl.slot);
                      };
                  const rarityEdge = sl.quality === 'rare' ? '#5B99DE'
                    : sl.quality === 'elite' ? '#A477DF' : null;
                  const art = sl.iconSrc || GHOST_SRC[sl.slot];
                  return (
                    <div key={`eq-${sl.slot}`}
                      onPointerUp={onTap ? (e) => {
                        e.stopPropagation();
                        let anchor = null;
                        try {
                          const rect = e.currentTarget.getBoundingClientRect();
                          anchor = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
                        } catch (_e) {}
                        onTap(anchor);
                      } : undefined}
                      title={sl.label}
                      aria-pressed={selected}
                      style={{
                        position: 'relative', minWidth: 0,
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '0 6px',
                        borderRadius: 9,
                        background: sl.ghost ? COL.wellSoft : COL.brassFill,
                        /* Restrained gold = equipped; dark neutral =
                           empty; the SELECTED card gets the 2px brass
                           inset ring (same accent language as the
                           active tab).  Rarity keeps its edge color. */
                        border: rarityEdge ? `2px solid ${rarityEdge}`
                          : sl.ghost ? `1px solid ${COL.tileBor}`
                          : selected ? `1px solid ${COL.brass}`
                          : '1px solid rgba(216,168,95,.55)',
                        boxShadow: selected ? `inset 0 0 0 2px ${COL.brass}`
                          : sl.ghost ? 'inset 0 2px 4px rgba(0,0,0,.30)'
                          : 'inset 0 0 6px rgba(245,199,70,0.18)',
                        cursor: onTap ? 'pointer' : 'default',
                        touchAction: 'none',
                      }}>
                      {art && (
                        <img src={art} alt="" aria-hidden="true" draggable={false}
                          style={{
                            /* 32 cap: at 40 the slot labels truncated
                               ("WEA…") — the name outranks art size. */
                            width: Math.min(eqCard - 12, 32), height: Math.min(eqCard - 12, 32),
                            flex: 'none', objectFit: 'contain',
                            imageRendering: 'pixelated',
                            opacity: sl.ghost ? 0.28 : (sl.iconSrc ? 1 : 0.95),
                            filter: sl.ghost ? 'grayscale(1)' : 'none',
                            userSelect: 'none', pointerEvents: 'none',
                          }} />
                      )}
                      <span style={{
                        flex: 1, minWidth: 0,
                        fontSize: 10, fontWeight: 700, letterSpacing: '.03em',
                        color: sl.ghost ? COL.muted : COL.text2, lineHeight: 1.25,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{sl.label.toUpperCase()}</span>
                      {!sl.ghost && (
                        <img src="/icons/bag/bag-equipped.webp?v=2.3.1320" alt="" aria-hidden="true" draggable={false}
                          style={{
                            position: 'absolute', top: 2, right: 2,
                            width: 13, height: 13, objectFit: 'contain',
                            pointerEvents: 'none', zIndex: 1,
                          }} />
                      )}
                    </div>
                  );
                })}
              </div>
              {/* The fixed display window: aggregate by default, the
                  selected item's contribution when a card is tapped.
                  Tapping it returns to the aggregate. */}
              <div
                onPointerUp={selCard || selSlot ? (e) => { e.stopPropagation(); setEqSel(null); } : undefined}
                style={{
                  flex: '1 1 36%', minWidth: 0, maxWidth: '38%',
                  alignSelf: 'stretch',
                  background: COL.well,
                  border: `1px solid ${selSlot ? 'rgba(216,168,95,.45)' : COL.tileBor}`,
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,.3)',
                  borderRadius: 10,
                  /* compact viewports: the pane's MIN content height is
                     what overflows first — tighter padding + line
                     heights below keep 5 rows inside the shortest
                     sheets. */
                  padding: compactCard ? '3px 7px' : '6px 9px',
                  display: 'flex', flexDirection: 'column',
                  cursor: selSlot ? 'pointer' : 'default',
                }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, paddingBottom: 2, flex: 'none' }}>
                  <span style={{
                    flex: 1, minWidth: 0,
                    fontSize: 9, fontWeight: 800, letterSpacing: '.08em',
                    color: COL.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{selSlot ? ((selCard && selCard.title) || selSlot.label.toUpperCase()) : 'EQUIPPED TOTAL'}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: COL.muted, fontVariantNumeric: 'tabular-nums', flex: 'none' }}>
                    {selSlot ? '×' : `${wornCount}/6`}
                  </span>
                </div>
                {selSlot ? (
                  /* Item view: art + this item's contribution rows. */
                  <>
                    <div style={{ flex: 'none', display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
                      <img src={selSlot.iconSrc || GHOST_SRC[selSlot.slot]} alt="" aria-hidden="true" draggable={false}
                        style={{
                          width: compactCard ? 28 : 40, height: compactCard ? 28 : 40,
                          objectFit: 'contain', imageRendering: 'pixelated',
                          userSelect: 'none', pointerEvents: 'none',
                        }} />
                    </div>
                    {(selCard ? [selCard.primary, selCard.secondary].filter(Boolean) : []).map((row, i) => (
                      <div key={row.k + i} style={{
                        flex: 1, minHeight: 0, maxHeight: 44,
                        display: 'flex', alignItems: 'center', gap: 5,
                        borderTop: `1px solid ${COL.tileBor}`,
                      }}>
                        <span style={{ fontSize: compactCard ? 9 : 10, fontWeight: 700, letterSpacing: '.05em', color: COL.muted, flex: 'none' }}>{row.k}</span>
                        <span style={{
                          flex: 1, minWidth: 0, textAlign: 'right',
                          fontSize: compactCard ? 12 : 18, lineHeight: 1.05, fontWeight: 800, color: COL.text,
                          fontVariantNumeric: 'tabular-nums',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{row.v}</span>
                      </div>
                    ))}
                    {!selCard && (
                      /* Cosmetic pieces contribute no stats — say so
                         with a quiet dash row, never fake zeros. */
                      <div style={{
                        flex: 1, minHeight: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderTop: `1px solid ${COL.tileBor}`,
                        fontSize: 16, fontWeight: 800, color: COL.muted,
                      }}>—</div>
                    )}
                  </>
                ) : (
                  contribs.totals.map((row, i) => (
                    <div key={row.k} style={{
                      flex: 1, minHeight: 0,
                      display: 'flex', alignItems: 'center', gap: 5,
                      borderTop: i === 0 ? 'none' : `1px solid ${COL.tileBor}`,
                    }}>
                      <StatGlyph k={row.k} />
                      <span style={{ fontSize: compactCard ? 9 : 10, fontWeight: 700, letterSpacing: '.05em', color: COL.muted, flex: 'none' }}>{row.k}</span>
                      <span style={{
                        flex: 1, minWidth: 0, textAlign: 'right',
                        fontSize: compactCard ? 12 : 18, lineHeight: 1.05, fontWeight: 800,
                        color: row.v === '—' ? COL.muted : COL.text,
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{row.v}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {bagTab === 'items' && <>
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
      {/* v2.3.1312 (round-8 §6): fixed five-chip row, no horizontal
          scroll, icons 20px.
          v2.3.1317 (owner): recessed segmented track = the filter
          affordance, with a LIVE result readout that reacts to the
          active chip.
          v2.3.1319 (owner): the readout became a CornerTag riding the
          track's top edge.
          v2.3.1320 (owner: "understood without using language"): the
          FILTER text rail is gone — every chip carries a tiny funnel
          glyph in its top-right corner instead (per the owner's own
          suggestion).
          v2.3.1325 (owner): the count CornerTag that rode this track's
          top edge is REMOVED — it visually landed on one of the filter
          chips and read as chip info; "not the right place for
          inventory item info".  The equipped row's N/6 tag (a slot
          gauge the owner asked for in round 8b) stays. */}
      <div style={{ position: 'relative', marginTop: 2, marginBottom: 6, flex: 'none' }}>
        <div style={{
          minWidth: 0,
          display: 'flex', alignItems: 'stretch', gap: 2,
          background: COL.well,
          border: `1px solid ${COL.tileBor}`,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,.3)',
          borderRadius: 8,
          padding: 3,
        }}>
        {CATEGORIES.map(c => {
          const active = c.id === filter;
          return (
            <button key={c.id}
              onClick={() => setFilter(c.id)}
              title={c.label}
              aria-pressed={active}
              style={{
                position: 'relative',
                flex: '1 1 0', minWidth: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                /* v2.3.1319: 4px -> 2px vertical + 20 -> 18px icon —
                   part of handing the header lines' room back to the
                   item tray (18 is round-8 §6's floor). */
                padding: '2px 2px',
                background: active ? COL.accentFill : 'transparent',
                color: active ? COL.text : COL.text2,
                border: active ? `1px solid ${COL.accent}` : '1px solid transparent',
                borderRadius: 6,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {/* v2.3.1320: the language-free filter mark — a tiny
                  funnel on every chip's top-right corner (owner's
                  suggestion); brass on the active chip. */}
              <svg viewBox="0 0 10 10" width="9" height="9" aria-hidden="true" style={{
                position: 'absolute', top: 2, right: 2, pointerEvents: 'none',
              }}>
                <path d="M1 1.5 H9 L6.2 5 V8.6 L3.8 7.4 V5 Z"
                  fill={active ? COL.accent : 'none'}
                  stroke={active ? COL.accent : COL.muted} strokeWidth="1.1" strokeLinejoin="round" />
              </svg>
              {c.iconSrc
                ? <img src={c.iconSrc} alt="" draggable={false}
                    style={{ width: 18, height: 18, objectFit: 'contain' }}
                    onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(c.glyph)); }} />
                : <span style={{ fontSize: 14, lineHeight: 1 }}>{c.glyph}</span>}
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>{c.label}</span>
            </button>
          );
        })}
        </div>
      </div>
      {/* v2.3.1285: the fictional "N / 32" counter is retired with the
          display cap (nav-system plan §0.3); the bag has no real limit. */}

      {/* v2.3.1317 (owner screenshot): the free-floating empty state
          OVERFLOWED — since the sheet lost height to the equipped/filter
          headers, its flex box could shrink below its content, and the
          centered icon/text spilled UP over the Armor chip and clipped
          at the bottom under the toolbar.  It now lives INSIDE the same
          recessed tray the grid uses (overflow-y auto, minHeight 0), so
          tight sheets scroll it instead of overlapping neighbors — and
          the compacted content (icon 32, tight paddings) fits without
          scrolling on every current phone anyway.  (v2.3.1235 dropped
          the tray for empty state; the tray reads fine now that the
          headers above give the panel structure.) */}
      {usedTiles === 0
        ? (
          <div style={{
            background: COL.well,
            border: `1px solid ${COL.tileBor}`,
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.035)',
            borderRadius: 10,
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch',
            display: 'flex', flexDirection: 'column',
            padding: '10px 8px', color: COL.muted,
          }}>
            {/* v2.3.1321 (owner screenshot): margin:auto wrapper instead
                of justifyContent:center — centered flex content TALLER
                than a scrollable box clips at BOTH ends (the icon rode
                the tray's top edge, the text's last line vanished under
                the bottom).  margin:auto centers when it fits and
                top-aligns + scrolls when it doesn't. */}
            <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, textAlign: 'center' }}>
              {/* v2.3.1224: UI Bible satchel icon */}
              <img src="/icons/ui/nav-inventory.webp?v=2.3.1224" alt="" draggable={false}
                style={{ width: 32, height: 32, opacity: 0.4, filter: 'grayscale(1)', flex: 'none' }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: COL.text2 }}>
                {filter === 'all' ? 'Your bag is empty.' : `No ${(CATEGORIES.find(c => c.id === filter)?.label || 'matching').toLowerCase()} items yet.`}
              </div>
              {filter === 'all' && (
                /* v2.3.1321 (owner): maxWidth 220 forced a two-line wrap
                   whose second line clipped on device — at full tray
                   width the sentence fits ONE line on any modern phone
                   (~285px at 12px vs ~330px tray @390).  No nowrap: a
                   320px-class screen wraps instead of overflowing, and
                   the margin:auto wrapper keeps it visible either way. */
                <div style={{ fontSize: 12, color: COL.muted }}>
                  Defeat monsters and gather materials to fill it up.
                </div>
              )}
            </div>
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
            /* v2.3.1285: overflow rows scroll inside the tray; the
               world never scrolls with panel content.  v2.3.1312: the
               bottom scroll-edge fade moved here from panelStyle (the
               panel is pinned now — only this tray scrolls). */
            overflowY: 'auto',
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch',
            WebkitMaskImage: 'linear-gradient(180deg, #000 calc(100% - 18px), transparent)',
            maskImage: 'linear-gradient(180deg, #000 calc(100% - 18px), transparent)',
          }}>
          <div style={{
            display: 'grid',
            /* v2.3.1285: 8 -> 6 columns — the same slot rhythm as the
               compact grid, so the first six cells ARE the compact
               recent row (Recent order is the shared bagModel sort). */
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gap: 8,
            /* v2.3.1312 (round-8 §7): scroll clearance — the last row
               must clear the edge fade at scroll end.  The toolbar sits
               BELOW the sheet body in flex (it never overlaps this
               tray), so 14px of grid padding + the 18px fade is the
               honest equivalent of the spec's "toolbar + 12" rule. */
            paddingBottom: 14,
          }}>
            {shownItems.map((e, i) => (
              <BagTile key={e.kind === 'item' ? `i-${e.key}` : `${e.kind}-${e.index}-${i}`} entry={e} />
            ))}
            {/* Empty slots so the bag always reads as a full grid of squares.
                v2.3.1039: recessed dark fill + clearly-visible outline (the old
                COL.tileBor at .10 alpha vanished against the leather bg). */}
            {Array.from({ length: Math.max(0, totalCells - usedTiles) }).map((_, i) => (
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
      </> /* v2.3.1326: end Items tab */}
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
          fontSize: 10, lineHeight: 1, /* v2.3.1239: 10px font floor (was 9) */
        }}>⚓</span>
      )}
    </div>
  );
};
