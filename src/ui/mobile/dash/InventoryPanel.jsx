import React, { useEffect, useRef, useState } from 'react';
import { COL, panelStyle, getState } from './common.js';
import { eatBus } from '../eatBus.js';
import { itemDetailBus } from './itemDetailBus.js';
import { isLocked as itemIsLocked } from './inventoryLocks.js';
import { reconcileGearStash } from '../../../rendering/gearCatalog.js';
import { getBagEntries } from './bagModel.js';
import { getEquippedSlots, getEquipContribs, GHOST_SRC } from '../sheet/equipModel.js';
import { dashTileSize, DASH_GAP, DASH_ROWS, BAG_HEADER_H } from '../sheet/sheetGeometry.js'; /* v2.3.1646 */ /* v2.3.1328: contribs */
import { bagFilterBus, CATEGORIES } from './bagFilterBus.js'; /* v2.3.1649 */
import { BagFilterChips } from './BagFilterChips.jsx'; /* v2.3.1652 */
import { unequipWeaponSlot, unequipShieldDirect, unequipArmorDirect, unequipGearDirect } from './equipActions.js'; /* v2.3.1330 */
import { getEquip } from '../../../rendering/gearCatalog.js';

// Category filter chips.  "All" comes first so the player always opens
// the bag with everything visible.  v2.3.1231: UI Bible icons replace
// the legacy emoji glyphs (owner request); glyph kept as the
// image-failure fallback.
// v2.3.1312 (round-8): the owner's dedicated bag filter set replaces
// the borrowed nav/combat/skill art — Potion finally gets a real
// potion instead of the soak droplets.
/* v2.3.1652: the roster moved to bagFilterBus (see there); re-exported
   so every existing importer of InventoryPanel.CATEGORIES still works. */
export { CATEGORIES } from './bagFilterBus.js';

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
/* v2.3.1325 (owner icon sheets): the whole bag catalog repainted in
   one consistent style — everything now lives under /icons/items/.
   The old per-type dirs (icons/wood, icons/cook, ...) keep their files
   for any legacy surface still pointing at them. */
const ITEMS_V = '?v=2.3.1452';
const WOOD_THUMB = `/icons/items/wood-log.webp${ITEMS_V}`;
const BURNT_DUST_THUMB = `/icons/items/burnt-dust.webp${ITEMS_V}`;
const SLIME_REMNANTS_THUMB = `/icons/items/remnants-slime.webp${ITEMS_V}`;
const SNOWMAN_REMNANTS_THUMB = `/icons/items/remnants-snowman.webp${ITEMS_V}`;
const FIRE_GOBLIN_REMNANTS_THUMB = `/icons/items/remnants-fire-goblin.webp${ITEMS_V}`;
const SKELETON_REMNANTS_THUMB = `/icons/items/remnants-skeleton.webp${ITEMS_V}`;
/* Per-tier fish thumbnails (raw + cooked).  Order matters in thumbFor:
   match longer prefixes first so e.g. fish_clownfish doesn't fall
   through to the generic fish_ branch. Add an entry per tier; the
   generic 'fish' / 'cooked_fish' fallbacks catch unmapped tiers. */
const FISH_THUMBS = {
  fish_clownfish: `/icons/items/fish-clownfish.webp${ITEMS_V}`,
  fish_trout: `/icons/items/fish-trout.webp${ITEMS_V}`, /* v2.3.1325: trout finally has its own art */
};
const COOKED_FISH_THUMBS = {
  cooked_fish_clownfish: `/icons/items/cooked-clownfish.webp${ITEMS_V}`,
  cooked_fish_trout: `/icons/items/cooked-trout.webp${ITEMS_V}`,
};
const FISH_THUMB_DEFAULT = `/icons/items/fish-minnow.webp${ITEMS_V}`;
const COOKED_FISH_THUMB_DEFAULT = `/icons/items/cooked-minnow.webp${ITEMS_V}`;
const ORE_THUMBS = {
  ore_copper_ore: `/icons/items/ore-copper.webp${ITEMS_V}`,
};
const ORE_THUMB_DEFAULT = `/icons/items/ore-copper.webp${ITEMS_V}`;
/* v2.3.1696 (owner: "the fishing pole sprite has some of the background that
   failed to get keyed out in the holes between the fishing line and the
   fishing pole").  Confirmed by counting: of 256x256, 51,876 px were already
   transparent and 1,188 opaque near-white ones remained — the enclosed gaps
   between the line and the rod, which a border-flood keyer can never reach
   because they don't touch the outside.  Re-keyed on NEAR-WHITE + NEAR-NEUTRAL
   wherever it sits, so coloured highlights (the red float) survive.
   PNG because the source is webp and there is no webp ENCODER here — Chromium
   did the decoding, which is why this was fixable at all. */
const FISHING_POLE_THUMB = `/icons/items/fishing-pole.png${ITEMS_V}`;
/* v2.3.1689 (owner: "use these sprites for the woodcutting axe and the
   pickaxe ... You currently just have a log thumbnail for the woodcutting
   axe").  The owner's two-tool sheet, split into one square icon each,
   background keyed out and box-downscaled to 192px.  PNG rather than webp:
   the rest of this set is webp because it was authored that way, and there
   is no webp encoder in the build — the format is per-file, not a rule. */
const WOODCUTTING_AXE_THUMB = `/icons/items/woodcutting-axe.png${ITEMS_V}`;
const MINING_PICKAXE_THUMB  = `/icons/items/mining-pickaxe.png${ITEMS_V}`;
/* Elemental shards: one webp per zone, /icons/items/<key>.webp
   following the keys defined in src/data/shards.js (shard_meadow,
   shard_ember, ...).  thumbFor() takes the shard_ prefix branch
   below so any zone we add later just needs the webp dropped in --
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
  if (k.startsWith('shard_'))       return `/icons/items/${k}.webp${ITEMS_V}`;
  if (k === 'fishing_pole')         return FISHING_POLE_THUMB;
  /* v2.3.1689: the three gathering tools all have real art now.  These sit
     ABOVE no prefix rule on purpose — 'woodcutting_axe' does not match
     'wood_', but the next tool key might, and an exact match can't drift. */
  if (k === 'woodcutting_axe')      return WOODCUTTING_AXE_THUMB;
  if (k === 'mining_pickaxe')       return MINING_PICKAXE_THUMB;
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

/* v2.3.1293 (ChatGPT round-3 §6): the selected filter survives leaving the
   destination — module-scoped, session-only.  Switching to Hero and back
   should not silently reset a Weapon filter to All.
   v2.3.1649: that state moved to bagFilterBus, because the chips that set
   it now live in the band's top row and this module is no longer the only
   thing that needs to read it.  The RULE is unchanged and the bus is
   module-scoped for exactly the same reason. */
/* v2.3.1326 (owner: "bag [gets] two tabs at top — one for items in
   inventory and another for equipped items; keeps the views cleaner"):
   the active tab survives leaving the destination, same as the filter. */
/* v2.3.1639: pinned — the tab bar that set this is gone (see the render).
   Kept as a constant rather than deleted so the 'equipped' branch below
   stays compiling and reviewable for whoever re-homes those stat cards. */
/* v2.3.1639: see the render — an empty bag draws empty slots now. */
const SHOW_EMPTY_PLACEHOLDER = false;

let _lastBagTab = 'items';

/* v2.3.1328: stat glyphs for the EQUIPPED TOTAL cells.
   v2.3.1329b (owner: "use icons that already exist"): the inline SVG
   line-drawings are replaced by the game's own hero stat icon set
   (icons/ui/hero — the same art the Hero panel uses) + the gem
   currency icon, so the widget grid speaks the game's established
   icon language. */
const STAT_ICON = {
  DMG:   '/icons/ui/hero/damage.webp?v=2.3.1323',
  DPS:   '/icons/ui/hero/dps.webp?v=2.3.1323',
  BLOCK: '/icons/ui/hero/defense.webp?v=2.3.1323',
  HP:    '/icons/ui/hero/hp.webp?v=2.3.1323',
  GEM:   '/icons/ui/cur-gem.webp?v=2.3.1224',
  STAM:  '/icons/ui/hero/stamina.webp?v=2.3.1323',
};
const StatGlyph = ({ k, size }) => (
  <img src={STAT_ICON[k] || STAT_ICON.GEM} alt="" aria-hidden="true" draggable={false}
    style={{
      width: size || 14, height: size || 14, objectFit: 'contain',
      flex: 'none', userSelect: 'none', pointerEvents: 'none',
    }} />
);

export const InventoryPanel = () => {
  const [, force] = useState(0);
  /* v2.3.1649 (owner: "you can put all of the filter chips there to sort
     the inventory items"): the filter is LIVE again, driven by the chips
     that now live in the band's top row (BagFilterChips) through
     bagFilterBus.  The v2.3.1293 "survives leaving the destination" rule is
     unchanged — the bus is module-scoped, so it holds the choice exactly as
     the local _lastFilter did while the chips were retired. */
  const [filter, setFilter] = useState(bagFilterBus.get());
  useEffect(() => bagFilterBus.subscribe(setFilter), []);
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
      /* Budget: row padding 4+4 + 2 grid gaps of 6 + the widget
         pane's 2px border (its grid rows match the card rows, so its
         border-box is the row's tallest child) = 22 vertical.
         Floor 26 fits an SE-class box (~90px); below it the safety
         scroller takes over. */
      const t = Math.floor((el.clientHeight - 22) / 3);
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
  /* v2.3.1350 (owner: "the inventory menu needs to have a second row —
     at least partially but hopefully the full row — visible"): the
     items tray sizes its grid ROWS to fit two full rows in whatever
     height the sheet actually has.  Real phones' Safari chrome shrinks
     visualViewport below the rig's 844, where the width-driven square
     tiles pushed row two half under the toolbar.  rowH = min(tile
     width, half the tray's free height): square tiles whenever they
     fit, slightly squat tiles on short viewports, two FULL rows
     always.  Same ResizeObserver pattern as the equipped tab's eqCard
     (the sheet ANIMATES open over 220ms — a mount-time measure would
     stick at the mid-animation height). */
  /* v2.3.1646: itemRowH and its ResizeObserver are RETIRED.  They
     existed to fit two rows into whatever height the sheet really had —
     necessary while the bag chose its own tile size, and the source of
     two bugs on the way here (a bail-out that outlived the empty-state it
     guarded, and a height budget that outlived the padding it reserved).
     The tile size is shared with the dashboard now (dashTileSize), so
     there is nothing left to measure and nothing left to drift. */
  const itemsBoxRef = useRef(null);

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
  /* v2.3.1646 (owner: "make the bag slots on bag view the same size as
     the slots on the dashboard view"): ONE tile size for both surfaces —
     dashTileSize, the same function the three dashboard panels use.
     The grid was repeat(6, 1fr) with a separately MEASURED row height,
     which made the bag's cells 54 wide by 36 tall: not the dashboard's
     size, and not even square.  Fixed columns of that shared size with
     the shared gap, and as many as fit — nine at 390w, so the bag also
     goes from 12 visible slots to 18. */
  const vwNow = typeof window !== 'undefined' ? window.innerWidth : 390;
  const TILE = dashTileSize(vwNow);
  /* panel padding 6+6 and tray padding 3+3 come off the usable width.
     v2.3.1649: the floor drops from 4 columns to 3 — at the new 64px tile a
     390px phone fits five, but a 320-class screen fits four and the old
     floor of 4 would have forced a horizontal overflow on anything
     narrower rather than simply showing fewer, bigger slots. */
  const COLS = Math.max(3, Math.floor((vwNow - 18 + DASH_GAP) / (TILE + DASH_GAP)));
  const shownItems = filtered;
  const usedTiles = shownItems.length;
  /* v2.3.1645 (owner: "without filters to make room for extra slots"):
     the floor is TWO rows, not one.  It was max(COLS, ...) — so an empty
     bag drew exactly six slots and left the rest of the tray blank no
     matter how much room the retired filter track gave back.  The row
     measurement above guarantees two rows fit; this is what actually puts
     slots in them. */
  /* v2.3.1649 (owner: "2 rows should be fully visible keeping the shading
     effect on the very bottom row to indicate scrolling is possible"): the
     floor is DASH_ROWS + 1.  Two rows is what the tray's height affords in
     full; the extra row is what the fade at the tray's bottom edge is
     FADING — without it a bag holding eight items showed a fade over blank
     tray, which reads as a rendering artifact rather than as "keep
     scrolling".  A partial third row of empty slots is the affordance. */
  const totalCells = Math.max(COLS * (DASH_ROWS + 1), Math.ceil(usedTiles / COLS) * COLS);

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
    <div style={{ ...panelStyle, overflow: 'hidden', WebkitMaskImage: 'none', maskImage: 'none', display: 'flex', flexDirection: 'column',
      /* v2.3.1352 (owner: "there's more room between the toolbar
         container and the inventory window"): the Bag runs a tighter
         vertical budget than the shared panelStyle — top 8->6, bottom
         10->2 (the tray's own 18px fade is the bottom edge treatment;
         dead margin above the toolbar bought nothing).  Local override
         only: other panels keep panelStyle's padding. */
      /* v2.3.1643: the Bag's local override tightens with panelStyle.
         v2.3.1649: 4/2 -> 2/2 vertical.  The budget is exact now and every
         pixel is spoken for: the panel body is var(--cols-h) tall (the
         v2.3.1638 one-height rule), and TWO whole 64px rows plus the 9px
         edge fade need all but four of them. */
      padding: '2px 6px 2px' }}>

      {/* v2.3.1639 (owner: "remove 'items' and 'equipped' buttons since
          equipped is visible from the dashboard view").  The v2.3.1326
          segmented tabs are gone and the Bag is the item grid, full stop.
          The equipped block below still exists but bagTab is pinned to
          'items', so it never renders — the six worn slots live in the
          dashboard's middle panel now, one tap from anywhere, and a tab
          bar costing 42px of a 181px sheet to reach a second copy of them
          was the most expensive chrome on the screen.

          NOTE: the per-item stat CONTRIBUTION cards and the EQUIPPED
          TOTAL readout (getEquipContribs, v2.3.1328) only ever rendered
          in that tab.  The dashboard panel shows the slots, not the
          numbers, so those cards are currently unreachable. */}
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
              {/* Equipment cards, fixed order Weapon/Shield/Chest/Legs/Cape/Amulet.
                  v2.3.1329: 64 -> 60% — the widget grid gets the width. */}
              <div style={{
                flex: '1 1 60%', minWidth: 0,
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
                            /* 28 cap: WEAPON must never truncate at the
                               60% column — the name outranks art size. */
                            width: Math.min(eqCard - 12, 28), height: Math.min(eqCard - 12, 28),
                            flex: 'none', objectFit: 'contain',
                            imageRendering: 'pixelated',
                            opacity: sl.ghost ? 0.28 : (sl.iconSrc ? 1 : 0.95),
                            filter: sl.ghost ? 'grayscale(1)' : 'none',
                            userSelect: 'none', pointerEvents: 'none',
                          }} />
                      )}
                      {/* v2.3.1329b (owner: "not enough space — revert
                          the equipped item part"): cards stay QUIET —
                          art + slot label only.  Per-item stats live in
                          the display window on selection. */}
                      <span style={{
                        flex: 1, minWidth: 0,
                        fontSize: 10, fontWeight: 700, letterSpacing: '.03em',
                        color: sl.ghost ? COL.muted : COL.text2, lineHeight: 1.25,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{sl.label.toUpperCase()}</span>
                      {/* v2.3.1336 (owner): the bracketed checkmark becomes a
                          simple green gradient dot. */}
                      {!sl.ghost && <span className="bt-worn-dot" aria-hidden="true" />}
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
                  /* v2.3.1329 (feedback): 36 -> 40% — the widget grid's
                     big values get the width. */
                  flex: '1 1 40%', minWidth: 0, maxWidth: '42%',
                  alignSelf: 'stretch',
                  position: 'relative',
                  background: COL.well,
                  border: `1px solid ${selSlot ? 'rgba(216,168,95,.45)' : COL.tileBor}`,
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,.3)',
                  borderRadius: 10,
                  padding: selSlot ? (compactCard ? '3px 7px' : '6px 9px') : '0 6px',
                  display: 'flex', flexDirection: 'column',
                  cursor: selSlot ? 'pointer' : 'default',
                }}>
                {selSlot && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, paddingBottom: 2, flex: 'none' }}>
                    <span style={{
                      flex: 1, minWidth: 0,
                      fontSize: 9, fontWeight: 800, letterSpacing: '.08em',
                      color: COL.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{(selCard && selCard.title) || selSlot.label.toUpperCase()}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: COL.muted, flex: 'none' }}>×</span>
                  </div>
                )}
                {selSlot ? (
                  /* Item view: art + this item's contribution rows. */
                  <>
                    {/* v2.3.1330: the art hides on short viewports —
                        the Unequip button needs its room. */}
                    {!compactCard && (
                      <div style={{ flex: 'none', display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
                        <img src={selSlot.iconSrc || GHOST_SRC[selSlot.slot]} alt="" aria-hidden="true" draggable={false}
                          style={{
                            width: 40, height: 40,
                            objectFit: 'contain', imageRendering: 'pixelated',
                            userSelect: 'none', pointerEvents: 'none',
                          }} />
                      </div>
                    )}
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
                    {/* v2.3.1330 (owner): one-tap Unequip at the pane's
                        bottom — no second tap through the modal.  Same
                        shared flows the modal runs (equipActions.js);
                        amulet/cape have no unequip flow, so no button.
                        stopPropagation: the pane's own tap handler
                        would otherwise just deselect. */}
                    {(() => {
                      const R2 = (getState() && getState().rpg) || {};
                      const doUnequip = selSlot.slot === 'weapon' ? () => unequipWeaponSlot(R2.activeSlot === 'ranged' ? 'ranged' : R2.activeSlot === 'staff' ? 'staff' : 'weapon')
                        : selSlot.slot === 'shield' ? unequipShieldDirect
                        : selSlot.slot === 'chest' ? (R2.armor ? unequipArmorDirect : (getEquip('chest') !== 'none' ? () => unequipGearDirect('chest') : null))
                        : selSlot.slot === 'legs' ? () => unequipGearDirect('legs')
                        : null;
                      if (!doUnequip) return null;
                      return (
                        <button
                          onPointerUp={(e) => {
                            e.stopPropagation();
                            doUnequip();
                            setEqSel(null); /* item gone -> back to the aggregate */
                            force(v => v + 1);
                          }}
                          className="bt-chisel bt-chisel--danger"
                          style={{
                            flex: 'none', minHeight: compactCard ? 34 : 42,
                            margin: '4px 0 2px',
                            fontFamily: 'inherit', fontSize: 13, fontWeight: 800,
                            letterSpacing: '.02em',
                          }}>Unequip</button>
                      );
                    })()}
                  </>
                ) : (
                  /* v2.3.1329 (feedback): iOS-widget grid — 2 cols x 3
                     rows (DMG|DPS, BLOCK|HP, GEM|STAM), row heights
                     matched to the equipment rows so the two sides
                     share one rhythm.  Cells: small glyph+label line
                     over a BIG value; hairline dividers only (no
                     borders/gold — cells must not look tappable).
                     The x/6 count floats in the top-right corner. */
                  <>
                    <span aria-hidden="true" style={{
                      position: 'absolute', top: 3, right: 7,
                      fontSize: 9, fontWeight: 700, color: COL.muted,
                      fontVariantNumeric: 'tabular-nums', pointerEvents: 'none',
                    }}>{wornCount}/6</span>
                    <div style={{
                      flex: 'none',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gridTemplateRows: `${eqCard}px ${eqCard}px ${eqCard}px`,
                      gap: '6px 0',
                    }}>
                      {contribs.totals.map((row, i) => (
                        <div key={row.k} style={{
                          minWidth: 0, minHeight: 0,
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center', gap: compactCard ? 0 : 2,
                          borderLeft: i % 2 === 1 ? `1px solid ${COL.tileBor}` : 'none',
                          borderTop: i >= 2 ? `1px solid ${COL.tileBor}` : 'none',
                        }}>
                          {/* v2.3.1329b (owner): smaller label — the
                              hero-set icon carries the meaning, the
                              text is a whisper. */}
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 0 }}>
                            <StatGlyph k={row.k} size={compactCard ? 11 : 14} />
                            <span style={{
                              fontSize: compactCard ? 7.5 : 8.5, fontWeight: 600,
                              letterSpacing: '.04em', color: COL.muted,
                              whiteSpace: 'nowrap',
                            }}>{row.k}</span>
                          </span>
                          <span style={{
                            maxWidth: '100%',
                            fontSize: compactCard ? 13 : 18, lineHeight: 1.05, fontWeight: 800,
                            color: COL.text, opacity: row.v === '—' ? 0.45 : 1,
                            fontVariantNumeric: 'tabular-nums',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>{row.v}</span>
                        </div>
                      ))}
                    </div>
                  </>
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
      {/* v2.3.1645 (owner: "let me see what the bag looks like without
          filters to make room for extra slots"): the All / Weapon / Armor
          / Potion / Crafting track is GONE.  It was ~46px of a 93px panel
          — half the sheet — spent narrowing a grid that only holds a
          couple of rows to begin with, and `filter` is pinned to 'all',
          so everything is in that grid anyway.
          The CATEGORIES roster and the filtering logic stay: the chips
          are what was cut, not the capability, so a taller sheet or a
          search field can bring it back without re-deriving any of it.
          v2.3.1317's recessed track and v2.3.1320's funnel glyphs go with
          them; git has both. */}

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
      {/* v2.3.1639 (owner: "display inventory slots on dashboard and bag
          window views (remove empty bag message placeholder)").  The grid
          branch below ALREADY draws `totalCells - usedTiles` empty slots,
          so an empty bag renders as a full grid of empty squares — the
          same shape as a full one — the moment this stops short-circuiting
          to the placeholder.  That is the whole fix: an empty bag was the
          one state with a different layout, so the panel changed shape
          under you on your first pickup.
          The placeholder is kept behind the flag rather than deleted: it
          carries the per-filter copy ("No potion items yet.") that has no
          equivalent in a grid of blanks, and re-homing that is a separate
          call.  Flip to true to get it back. */}
      {SHOW_EMPTY_PLACEHOLDER && usedTiles === 0
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
          <>
          {/* v2.3.1652 (owner: "put the filters on their own header row
              above the inventory slots but spanning the whole width of the
              slot rows").  Its width is the grid's own width — COLS tiles
              and the gaps between them — so the header is exactly as wide
              as the rows it filters and each chip is one slot across.
              Both numbers come from the same COLS/TILE the grid uses, so
              they cannot drift on a viewport where COLS changes. */}
          <BagFilterChips
            width={COLS * TILE + (COLS - 1) * DASH_GAP}
            height={BAG_HEADER_H} />
          <div ref={itemsBoxRef} style={{
            marginTop: DASH_GAP,
            /* v2.3.1651 (owner: "remove the dark background behind the
               expanded bag pane slots").  The recessed tray — well fill,
               hairline and inset shadow — is gone; the slots sit straight
               on the panel.  It is the same call as v2.3.1650's on the nav
               group and the filter chips, and the same reasoning: every
               slot already draws its own well and border, so the tray was
               a darker box behind thirty darker boxes, and at two rows of
               64px tiles it read as a frame around a frame.
               The scroll fade below is now the ONLY edge treatment, which
               makes it easier to see rather than harder. */
            background: 'transparent',
            border: 'none',
            /* v2.3.1236: owner feedback — LARGER slots, same 32 capacity.
               32 is display-only (no server or pickup enforcement — see
               PR notes), but capacity is a game-balance call for the
               owner, so instead of a 5th row the tiles grow: tray
               padding 8→6 and grid gap 6→4 hand each of the 8 columns
               ~2.3px more width (tiles are square, so height follows),
               and the removed BAG label row absorbs the taller rows. */
            /* v2.3.1649: 6 -> 3.  See the panel padding above — the two
               full rows the owner asked for do not fit at 6, and inset
               padding is the cheapest of the three things competing for
               that height (the others being a row and the scroll cue). */
            padding: 3,
            flex: 1,
            minHeight: 0,
            /* v2.3.1285: overflow rows scroll inside the tray; the
               world never scrolls with panel content.  v2.3.1312: the
               bottom scroll-edge fade moved here from panelStyle (the
               panel is pinned now — only this tray scrolls). */
            overflowY: 'auto',
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch',
            /* v2.3.1643: the fade was 18px of a 93px panel — a fifth of
               the tray permanently dimmed.  10 still reads as "more
               below" without eating a whole item row.
               v2.3.1649 (owner: "keeping the shading effect on the very
               bottom row to indicate scrolling is possible"): 9px, and the
               height budget above now guarantees it falls BELOW row two
               rather than across it — the shading is on the partial third
               row, which is the row that is actually cut off. */
            WebkitMaskImage: 'linear-gradient(180deg, #000 calc(100% - 9px), transparent)',
            maskImage: 'linear-gradient(180deg, #000 calc(100% - 9px), transparent)',
          }}>
          <div style={{
            display: 'grid',
            /* v2.3.1285: 8 -> 6 columns — the same slot rhythm as the
               retired compact grid (Recent order is the shared bagModel
               sort). */
            gridTemplateColumns: `repeat(${COLS}, ${TILE}px)`,
            justifyContent: 'center',
            /* v2.3.1646: SQUARE rows at the shared size — no measurement,
               no first-frame fallback, and no way for the two surfaces to
               drift apart.  The v2.3.1350 itemRowH effect is retired with
               it (and with it the class of bug that had it bail out on an
               empty bag; see v2.3.1645). */
            gridAutoRows: `${TILE}px`,
            gap: DASH_GAP,
            /* v2.3.1312 (round-8 §7): scroll clearance — the last row
               must clear the edge fade at scroll end.  v2.3.1352:
               14 -> 10 (tighter budget; still holds the last row off
               the 18px fade at scroll end). */
            /* v2.3.1643: 10 -> 4.  Scroll clearance still holds the last
               row off the edge fade, which also shrinks below.
               v2.3.1649: 0 — the fade IS the bottom treatment now and the
               partial third row is meant to meet it. */
            paddingBottom: 0,
          }}>
            {(() => {
              /* v2.3.1350: with measured rows the tiles fill their row
                 instead of forcing 1:1 (squat-not-clipped on short
                 viewports; rowH is width-capped so they stay square
                 whenever the height allows). */
              /* v2.3.1646: the row IS the tile size now, so the tile just
                 fills its cell — square by construction. */
              const rowFit = { aspectRatio: 'auto', height: '100%' };
              return (<>
            {shownItems.map((e, i) => (
              <BagTile key={e.kind === 'item' ? `i-${e.key}` : `${e.kind}-${e.index}-${i}`} entry={e} style={rowFit} />
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
                ...(rowFit || {}),
              }} />
            ))}
              </>);
            })()}
          </div>
          </div>
          </>
        )}
      </> /* v2.3.1326: end Items tab */}
    </div>
  );
};

/* v2.3.1070: dispatch a shared bag entry to the right tile so every bag
   surface renders identical tiles from one list.  v2.3.1350: `style`
   threads the measured row-fit override down to both tile kinds. */
export const BagTile = ({ entry, style }) => {
  if (!entry) return null;
  if (entry.kind === 'item') {
    return <ItemTile ikey={entry.key} count={entry.count} style={style} />;
  }
  return <StashTile kind={entry.kind} obj={entry.obj} index={entry.index} style={style} />;
};

/* Stash tile for an unequipped weapon or shield.  Opens the popup
   with the stashWeapon / stashShield kind so the Equip action wires
   it back into the matching loadout slot. */
const StashTile = ({ kind, obj, index, style: styleOverride }) => {
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
  /* v2.3.1325 (owner icon sheets): stash tiles use the painted item
     set.  Greatsword and sword FINALLY split — they are distinct drop
     types but shared one icon since the stash existed; shields of every
     tier get art (was wood-only + 🛡 glyph). */
  const thumb = kind === 'stashGear'
    ? (obj && obj.gearId === 'steelplate'   ? `/icons/items/chest-plate.webp${ITEMS_V}`
      : obj && obj.gearId === 'steelgreaves' ? `/icons/items/greaves.webp${ITEMS_V}`
      : obj && obj.gearId === 'tshirt'       ? `/icons/items/cloth-shirt.webp${ITEMS_V}` : null)
    : kind === 'stashArmor'
    ? null /* no armor sprites yet -- glyph fallback below */
    : kind === 'stashShield'
    ? `/icons/items/shield.webp${ITEMS_V}`
    : obj && obj.type === 'bow'        ? `/icons/items/bow.webp${ITEMS_V}`
    : obj && obj.type === 'staff'      ? `/icons/items/staff.webp${ITEMS_V}`
    : obj && obj.type === 'greatsword' ? `/icons/items/great-sword.webp${ITEMS_V}`
    : `/icons/items/sword.webp${ITEMS_V}`;
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
      /* v2.3.1350: row-fit override from the measured items grid. */
      ...(styleOverride || {}),
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
