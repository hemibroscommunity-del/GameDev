import React, { useEffect, useRef, useState } from 'react';
import { xpRequired, calcMaxHp, calcMaxStam, calcMaxMana, calcCritChance, calcBlockReduction, getDefenseBlockBonus, WEAPON_TYPES, getActiveWeapon, getWeaponCritStat, buildSkillUnspent, STAT_TO_WEAPON_CAT, calcDisplayDmgRange, calcDisplayDps } from '../../data/gameSystems.js';
import { skillXpRequired } from '../../data/items.js';
import { ZONES } from '../../data/zones.js';
import { portraitDataUrl } from '../../rendering/characterPortrait.js';
import { getSkin, getPants, getShoes, onSkinChange, onPantsChange, onShoesChange } from '../../rendering/playerSkins.js';
import { getHair, onHairChange } from '../../rendering/traits/hairCatalog.js';
import { getHairColor, hairColorTarget, onHairColorChange } from '../../rendering/traits/hairColorCatalog.js';
import { getHatColor, hatColorTarget, onHatColorChange } from '../../rendering/traits/hatColorCatalog.js';
import { getFacialHair } from '../../rendering/traits/facialHairCatalog.js';
import { getFacialHairColor, facialHairColorTarget, onFacialHairColorChange } from '../../rendering/traits/facialHairColorCatalog.js';
import { getHeadwear, onHeadwearChange } from '../../rendering/traits/headwearCatalog.js';
import { getShirt, onShirtChange } from '../../rendering/traits/shirtCatalog.js';
import { getShirtColor, shirtColorTarget, onShirtColorChange } from '../../rendering/traits/shirtColorCatalog.js';
import { getEquip } from '../../rendering/gearCatalog.js';
import { dashboardPanelBus } from './dashboardPanelBus.js';
import { chatBubbleBus } from './chatBubbleBus.js';
import { InventoryPanel, BagTile }     from './dash/InventoryPanel.jsx';
import { ItemDetailPopup }             from './dash/ItemDetailPopup.jsx';
import { itemDetailBus }               from './dash/itemDetailBus.js';
import { subscribe as subscribeInvLocks } from './dash/inventoryLocks.js';
import { getBagEntries }               from './dash/bagModel.js';
import { SelfPanel }         from './dash/SelfPanel.jsx';
import { JourneyPanel }      from './dash/JourneyPanel.jsx';
import { MapPanel }          from './dash/MapPanel.jsx';
import { SocialPanel }       from './dash/SocialPanel.jsx';
import { MorePanel }         from './dash/MorePanel.jsx';
import { StatsPanel }        from './dash/StatsPanel.jsx';
import { SkillsPanel }       from './dash/SkillsPanel.jsx';
import { EncyclopediaPanel } from './dash/EncyclopediaPanel.jsx';
import { GuildPanel }        from './dash/GuildPanel.jsx';
import { LeaderboardPanel }  from './dash/LeaderboardPanel.jsx';
import { ClanPanel }         from './dash/ClanPanel.jsx';
import { FeedbackPanel }     from './dash/FeedbackPanel.jsx';
import { SettingsPanel }     from './dash/SettingsPanel.jsx';
/* v2.3.1143: account panel -- Login Key display + device transfer. */
import { AccountPanel }      from './dash/AccountPanel.jsx';
import { T2Panel, requestT2Category } from './dash/T2Panel.jsx';
import { SpendPointConfirm }   from './dash/SpendPointConfirm.jsx';

// Bottom-of-screen dashboard.  Replaces the radial UtilityWheel.
// When idle it renders character stats + a 7-icon row.  When the user
// taps any toolbar icon, the dashboard swaps in a panel component that
// occupies the full 25vh band and the icon row hides.

/* v2.3.1226: light & airy palette per docs/UI-BIBLE.md Part 2 — the
   band flips to Parchment/Ink/Brass.  overlay* tokens are for chrome
   floating OVER the game world (top-right player card, tooltips):
   those stay translucent Ink per the Bible's world-overlap rule so
   they read against bright grass and dark caves alike. */
const COL = {
  bg:        '#F7F2E8',              // Parchment
  border:    'rgba(34,48,60,0.16)',  // Hairline
  divider:   'rgba(34,48,60,0.10)',
  text:      '#22303C',              // Ink
  muted:     '#68737F',              // Slate
  hp:        '#C0392B',
  stam:      '#B7791F',
  mp:        '#2B6CB0',
  xp:        '#2F855A',
  gold:      '#B7791F',
  brass:     '#B08D57',
  brassText: '#8A6A3B',              // brass darkened for text on light
  overlayBg:     'rgba(34,48,60,0.82)',
  overlayBorder: 'rgba(253,251,245,0.16)',
  overlayText:   '#FDFBF5',
};

// Bar artwork sliced from the user-supplied mockup screenshot.  Each
// PNG has dark padding baked into both ends; the Bar component
// over-stretches the image and clips the parent so the colored middle
// fills edge-to-edge with flat corners (no rounded pill).
//
// v=2.3.68: cache-bust suffix added because users reported the bars
// + toolbar icons missing in-game.  Cloudflare's edge had served the
// PNGs for ~weeks; the new ?v= query string forces a fresh fetch on
// every browser (the bytes haven't changed -- the suffix just busts
// the URL-based cache key).
const BAR_IMG = {
  hp:   '/icons/ui/bar-hp.webp?v=2.3.115',
  mp:   '/icons/ui/bar-mp.webp?v=2.3.115',
  stam: '/icons/ui/bar-stam.webp?v=2.3.115',
  xp:   '/icons/ui/bar-xp.webp?v=2.3.115',
};

// Toolbar icon source.  v2.3.1224: swapped to the UI Bible icon set
// (docs/UI-BIBLE.md Part 4; generated per the Part 5 master prompt and
// sliced by tools/process_icon_sheets.py).  The old mockup-sliced
// bag/friends/... webps stay in public/icons/ui/ untouched so any
// stale-cached bundle keeps working.
const ICON_SRC = {
  inventory: '/icons/ui/nav-inventory.webp?v=2.3.1224',
  friends:   '/icons/ui/nav-friends.webp?v=2.3.1224',
  codex:     '/icons/ui/nav-codex.webp?v=2.3.1224',
  journey:   '/icons/ui/nav-journey.webp?v=2.3.1224',
  map:       '/icons/ui/nav-map.webp?v=2.3.1224',
  more:      '/icons/ui/nav-more.webp?v=2.3.1224',
  /* v2.3.1225: chat finally gets a real icon (was an inline SVG since
     v2.3.1015, the one toolbar glyph the v2.3.1224 swap missed). */
  chat:      '/icons/ui/panel-chat.webp?v=2.3.1225',
};

// Character build stats shown in the middle dashboard column, ordered for a
// 2-row x 3-col grid (v2.3.692): TOP row = damage stats (Power / Agility /
// Mind), BOTTOM row = combat resources (Vitality / Endurance / Defense).
// Defense is the Tier-2 trained skill (rpg.defenseSkill); the others are
// Tier-1 capacity stats.  Tooltip phrasing per GDD §1.2.
/* v2.3.1224: stat icons swapped to the UI Bible set (combat-* for the
   three weapon-category damage stats, stat-* for the resource stats).
   The old popups/*.webp icons stay for damage popups.
   v2.3.1225: iconScale 1.5 across the grid — the Bible icons carry a
   12% built-in margin, so at 1.0 they rendered visibly smaller than
   the full-bleed popups icons they replaced (owner report).  Bow +
   endurance re-sliced with interior background knockout. */
const CHAR_STATS = [
  { key: 'power',     label: 'Melee',     short: 'MEL', iconSrc: '/icons/ui/combat-melee.webp?v=2.3.1224',   pixelated: false, iconScale: 1.5, tip: 'Melee — melee weapon damage scaling. Trains by landing damage with sword / greatsword.' },
  { key: 'agility',   label: 'Bow',       short: 'BOW', iconSrc: '/icons/ui/combat-bow.webp?v=2.3.1225',     pixelated: false, iconScale: 1.5, tip: 'Bow — bow damage + move speed, dodge distance, attack speed. Trains by successful dodges and ranged hits.' },
  { key: 'mind',      label: 'Magic',     short: 'MAG', iconSrc: '/icons/ui/combat-magic.webp?v=2.3.1224',   pixelated: false, iconScale: 1.5, tip: 'Magic — staff (magic) damage + mana pool size. Trains by spending mana on staff bolts.' },
  { key: 'vitality',  label: 'HP',        short: 'HP',  iconSrc: '/icons/ui/stat-vitality.webp?v=2.3.1224',  pixelated: false, iconScale: 1.5, tip: 'HP — health pool size. Trains by taking damage and surviving the fight.' },
  /* Defense = Tier-2 trained skill (rpg.defenseSkill.level); tapping opens the
     DEF spend tab in the T2 panel (wired in v2.3.693).  v2.3.696: DEF and END
     swapped -- bottom row reads Vitality · Defense · Endurance per user. */
  { key: 'defense',   label: 'Defense',   short: 'DEF', iconSrc: '/icons/ui/stat-defense.webp?v=2.3.1224',   pixelated: false, iconScale: 1.5, t2: true, tip: 'Defense — block strength + damage reduction. Trains by blocking and mitigating hits; spend points in the DEF tab.' },
  { key: 'endurance', label: 'Endurance', short: 'END', iconSrc: '/icons/ui/stat-endurance.webp?v=2.3.1225', pixelated: false, iconScale: 1.5, tip: 'Endurance — stamina pool size. Trains by spending stamina on dodge, block, or sprint.' },
];

/* Dashboard now focuses on the build/combat stats; the life-skills grid is
   hidden behind this flag (flip to true to restore the 10-skill column). */
const SHOW_LIFE_SKILLS = false;

// 10 life skills — names match the canonical labels in BroTown.jsx
// (Woodcutting, Fishing, Mining, Cooking, Blacksmithing, Woodworking,
// Gem Cutting, Enchanting, Farming, Trapping).
const LIFE_SKILLS = [
  /* v2.3.1224: iconSrc = UI Bible skill icons; emoji kept as the render
     fallback if an image ever 404s. */
  { key: 'cooking',       icon: '🍳', iconSrc: '/icons/ui/skill-cooking.webp?v=2.3.1224',       label: 'Cooking',       tip: 'Cooking — turn raw ingredients into stat-boosting food.' },
  { key: 'fishing',       icon: '🎣', iconSrc: '/icons/ui/skill-fishing.webp?v=2.3.1224',       label: 'Fishing',       tip: 'Fishing — catch fish from water tiles for cooking + alchemy.' },
  { key: 'mining',        icon: '⛏',  iconSrc: '/icons/ui/skill-mining.webp?v=2.3.1224',        label: 'Mining',        tip: 'Mining — break ore + zone gems with a pickaxe.' },
  { key: 'woodcutting',   icon: '🪓', iconSrc: '/icons/ui/skill-woodcutting.webp?v=2.3.1224',   label: 'Woodcutting',   tip: 'Woodcutting — chop trees for logs and twigs.' },
  { key: 'farming',       icon: '🌾', iconSrc: '/icons/ui/skill-farming.webp?v=2.3.1224',       label: 'Farming',       tip: 'Farming — plant + harvest crops on owned plots.' },
  { key: 'blacksmithing', icon: '🔨', iconSrc: '/icons/ui/skill-blacksmithing.webp?v=2.3.1224', label: 'Blacksmithing', tip: 'Blacksmithing — forge weapons, armor, tools.' },
  { key: 'woodworking',   icon: '🛠',  iconSrc: '/icons/ui/skill-woodworking.webp?v=2.3.1224',   label: 'Woodworking',   tip: 'Woodworking — craft bows, staves, furniture from logs.' },
  { key: 'gemCutting',    icon: '💎', iconSrc: '/icons/ui/skill-gemcutting.webp?v=2.3.1224',    label: 'Gem Cutting',   tip: 'Gem Cutting — refine raw gems into polished sockets.' },
  { key: 'enchanting',    icon: '✨', iconSrc: '/icons/ui/skill-enchanting.webp?v=2.3.1224',    label: 'Enchanting',    tip: 'Enchanting — infuse equipment with elemental effects.' },
  { key: 'trapping',      icon: '🪤', iconSrc: '/icons/ui/skill-trapping.webp?v=2.3.1224',      label: 'Trapping',      tip: 'Trapping — hunt animals + monsters with set traps.' },
];

// Tiny column-header used at the top of each of the three dashboard
// columns.  Centered above its column.
const ColHeader = ({ children }) => (
  <div style={{
    /* v2.3.114: -1 fontSize + white text per "everything white". */
    fontSize: 14,
    color: COL.text,
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    padding: '0 2px 2px',
    textAlign: 'center',
    borderBottom: `1px solid ${COL.divider}`,
    marginBottom: 3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }}>{children}</div>
);

// Tooltip popup module — taps on stat / skill rows show a short
// description above the dashboard.  One active tooltip at a time;
// auto-dismisses after 3s or on next tap.
const Tooltip = ({ text, onClose }) => {
  useEffect(() => {
    if (!text) return;
    const id = setTimeout(onClose, 3000);
    return () => clearTimeout(id);
  }, [text]);
  if (!text) return null;
  return (
    <div
      onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(var(--dash-h) + 12px)',
        transform: 'translateX(-50%)',
        maxWidth: '88vw',
        padding: '8px 12px',
        background: COL.overlayBg,
        border: `1px solid ${COL.overlayBorder}`,
        borderRadius: 8,
        color: COL.overlayText,
        fontFamily: 'Source Sans 3, sans-serif',
        fontSize: 15,
        lineHeight: 1.3,
        zIndex: 36,
        boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
      }}
    >
      {text}
    </div>
  );
};

// Stat bar — uses the mockup's clean rounded-capsule artwork.  We
// stretch the PNG to full width, slide a depletion overlay over the
// right-hand portion (sharp left edge, rounded right cap), and lay
// two text overlays on top: a metric label on the left and live
// current/max on the right.
const Bar = ({ label, cur, max, kind, tip, onTip }) => {
  const pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
  const src = BAR_IMG[kind];
  return (
    <div
      onPointerUp={tip && onTip ? (e) => { e.stopPropagation(); onTip(tip); } : undefined}
      title={tip}
      style={{
        position: 'relative',
        width: '100%',
        height: 28,
        overflow: 'hidden',
        cursor: tip ? 'pointer' : 'default',
        touchAction: 'none',
      }}>
      <img
        src={src}
        alt={label}
        draggable={false}
        style={{
          position: 'absolute',
          top: 0,
          left: '-7%',
          width: '114%',
          height: '100%',
          objectFit: 'fill',
        }}
      />
      {pct < 100 && (
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: pct + '%',
          right: 0,
          background: 'linear-gradient(90deg, rgba(0,0,0,0.55), rgba(0,0,0,0.72))',
          transition: 'left .15s linear',
          pointerEvents: 'none',
        }} />
      )}
      {/* Metric label (left side). */}
      <span style={{
        position: 'absolute',
        left: 10,
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: 15,
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '.04em',
        textShadow: '0 1px 2px rgba(0,0,0,.85), 0 0 1px rgba(0,0,0,.95)',
        pointerEvents: 'none',
        fontFamily: 'Source Sans 3, sans-serif',
      }}>{label}</span>
      {/* Live current / max (right side). */}
      <span style={{
        position: 'absolute',
        right: 10,
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: 15,
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '.04em',
        textShadow: '0 1px 2px rgba(0,0,0,.85), 0 0 1px rgba(0,0,0,.95)',
        pointerEvents: 'none',
        fontFamily: 'Source Sans 3, sans-serif',
      }}>{Math.round(cur)} / {Math.round(max)}</span>
    </div>
  );
};

/* v2.3.1205: `tut` = optional data-tut anchor id so the live-DOM
   ControlsTutorial can getBoundingClientRect() the real button. */
const IconButton = ({ glyph, label, active, onClick, node, tut }) => {
  const src = ICON_SRC[glyph];
  // Use onPointerUp instead of onClick so iOS fires it even when
  // another finger is mid-drag on a joystick.  stopPropagation
  // prevents the event reaching the dashboard's outer pointerdown
  // handler (which only stops further bubbling, not local).
  const fire = (e) => { e.stopPropagation(); onClick && onClick(); };
  return (
    <button
      onPointerUp={fire}
      data-tut={tut}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: '4px 0',
        background: active ? 'rgba(176,141,87,0.22)' : 'transparent',
        border: 'none',
        borderRight: `1px solid ${COL.divider}`,
        color: COL.text,
        cursor: 'pointer',
        fontFamily: 'Source Sans 3, sans-serif',
        opacity: active ? 1 : 0.95,
        touchAction: 'none',
      }}
    >
      {/* v2.3.1013: glyphs without a PNG (e.g. Chat) pass an inline `node`
          rendered in the 38×38 icon slot instead of an <img>. */}
      {node ? (
        <span style={{
          width: 38,
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>{node}</span>
      ) : (
        <img
          src={src}
          alt={label}
          draggable={false}
          style={{
            width: 38,
            height: 38,
            objectFit: 'contain',
            imageRendering: 'auto',
          }}
        />
      )}
      <span style={{
        /* v2.3.114: -1 fontSize + inactive labels white. */
        fontSize: 14,
        color: active ? COL.brassText : COL.text,
        letterSpacing: '.04em',
      }}>{label}</span>
    </button>
  );
};

// Map of panel id → { title, Component }.  Children pushed onto the stack
// from MorePanel use the same registry, which is why MorePanel doesn't
// hard-code its child component refs.
/* v2.3.155: compact inventory preview that lives in the bottom-left
   column of the dashboard (replacing the HP/MP/END chip card). Shows
   the N most-recent inventory items in a small grid; tap empty space
   anywhere in the card to open the full Bag panel. Tile interactions
   (cook raw fish, eat cooked fish) still work via the shared ItemTile.
   Recents-tracking mirrors InventoryPanel.jsx so the same item ordering
   logic shows up here. */
const InventoryPreview = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 400);
    return () => clearInterval(id);
  }, []);
  /* v2.3.177 (F3): re-render whenever an anchor toggles so the anchored-
     first sort picks up the change without waiting for the 400ms timer. */
  useEffect(() => subscribeInvLocks(() => force(v => v + 1)), []);
  const S = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
  /* v2.3.1070: the quick-bag preview reads the SAME shared entry list as the
     full Bag panel, so the two always match -- unequipped Loadout gear shows
     up here the moment it's taken off, newest-first (unless anchored). */
  const entries = getBagEntries(S && S.rpg);
  /* 3-col x 3-row grid (9 tiles). v2.3.1057: now that all three dashboard
     columns are equal width, the quick-bag is a 3-col square grid matching
     the Loadout slots; a third row fits cleanly when the block is anchored
     to the top of the column. Items fill first, then faint empty slots pad
     out to 9 so it always reads as an inventory grid. */
  const tiles = entries.slice(0, 9);
  const openFullBag = (e) => {
    if (e) e.stopPropagation();
    dashboardPanelBus.toggle('inventory');
  };
  return (
    <div
      /* v2.3.845: id lets the catch-flight animation (effectsRenderer
         _updateCatchFlights) find the quick-bag on screen so a caught fish
         flies into it. */
      id="bt-bag-target"
      onPointerUp={openFullBag}
      style={{
        /* v2.3.162: zero inner padding + zero flex gap. The only outer
           whitespace around the tile grid is the column wrapper's
           padding:4. Matching the grid's gap:4 below makes every gap
           in the preview the same: cell-to-cell, cell-to-edge. The
           Bag label header from v2.3.155 came out for the same reason
           (its margin broke the top-edge uniformity); the whole card
           is tappable so the label was redundant anyway. */
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        /* v2.3.761: leather backdrop (owner art) behind the quick-bag tiles;
           a touch of padding so the texture's border reads as the frame. */
        backgroundImage: 'url(/icons/ui/bag-bg.webp?v=2.3.761)',
        backgroundSize: '100% 100%',
        borderRadius: 6,
        padding: 3,
      }}
      title="Tap to open Bag"
    >
      {/* v2.3.1057: 3-col x 3-row slot grid mirroring the Loadout column's
          square grid (same 3 columns, same gap:3).  With all three columns
          equal width, each square comes out the exact loadout square size.
          Tiles stay square (ItemTile's default aspectRatio 1/1); the block
          is centered vertically (alignContent:center) under the BAG title so
          the leftover column height splits evenly above/below the 3x3 block
          instead of pooling beneath it.  Items first, then faint empty slots
          fill to 9 so it always reads as an inventory grid. */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridAutoRows: 'min-content',
        alignContent: 'center',
        gap: 3,
      }}>
        {tiles.map((e, i) => (
          <BagTile
            key={e.kind === 'item' ? `i-${e.key}` : `${e.kind}-${e.index}-${i}`}
            entry={e}
          />
        ))}
        {Array.from({ length: Math.max(0, 9 - tiles.length) }).map((_, i) => (
          <div key={`pe-${i}`} aria-hidden="true" style={{
            aspectRatio: '1 / 1',
            background: '#EFE7D6',
            border: '1px solid rgba(34,48,60,0.16)',
            boxShadow: 'inset 0 1px 3px rgba(34,48,60,0.10)',
            borderRadius: 6,
          }} />
        ))}
      </div>
    </div>
  );
};

const PANELS = {
  inventory:    { title: 'Bag',         Component: InventoryPanel },
  self:         { title: 'Self',        Component: SelfPanel },
  journey:      { title: 'Journey',     Component: JourneyPanel },
  map:          { title: 'Map',         Component: MapPanel },
  social:       { title: 'Social',      Component: SocialPanel },
  more:         { title: 'More',        Component: MorePanel },
  stats:        { title: 'Stats',       Component: StatsPanel },
  skills:       { title: 'Skills',      Component: SkillsPanel },
  encyclopedia: { title: 'Codex',       Component: EncyclopediaPanel },
  guild:        { title: 'Guild',       Component: GuildPanel },
  leaderboard:  { title: 'Leaderboard', Component: LeaderboardPanel },
  clan:         { title: 'Clan',        Component: ClanPanel },
  feedback:     { title: 'Feedback',    Component: FeedbackPanel },
  settings:     { title: 'Settings',    Component: SettingsPanel },
  /* v2.3.1143: Login Key display + device transfer. */
  account:      { title: 'Account',     Component: AccountPanel },
  /* v2.3.235 (Phase 5): Tier 2 spec allocation panel. */
  t2:           { title: 'Weapons',     Component: T2Panel },
};

export const BottomDashboard = () => {
  const [, force] = useState(0);
  const [tooltip, setTooltip] = useState('');
  const dashRef = useRef(null);
  /* v2.3.1025: the BUILD/stats column rect -- the loadout equip picker docks
     over it (to the right of the loadout cells) so switching categories never
     moves the menu or covers the loadout, and it can't exceed the dashboard. */
  const buildColRef = useRef(null);
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 200);
    return () => clearInterval(id);
  }, []);
  useEffect(() => dashboardPanelBus.subscribe(() => force(v => v + 1)), []);
  /* Player-card portrait: a head-and-shoulders render of the player's
     chosen cosmetics (skin / hair / hair color / beard / hat).  Generated
     on mount (captures the login picker) and regenerated if a cosmetic
     changes.  Falls back to the NFT avatar, then the static icon. */
  const [profilePortrait, setProfilePortrait] = useState('');
  useEffect(() => {
    let alive = true;
    const regen = () => {
      portraitDataUrl({
        skin: getSkin(), pants: getPants(), shoes: getShoes(),
        hair: getHair(), hairColor: hairColorTarget(getHairColor()),
        facialHair: getFacialHair(), facialHairColor: facialHairColorTarget(getFacialHairColor()),
        headwear: getHeadwear(), hatColor: hatColorTarget(getHatColor()),
        shirt: getShirt(), shirtColor: shirtColorTarget(getShirtColor()),
      }, true).then(url => { if (alive && url) setProfilePortrait(url); });
    };
    regen();
    const unsubs = [onSkinChange(regen), onHairChange(regen), onHairColorChange(regen),
      onHeadwearChange(regen), onHatColorChange(regen), onFacialHairColorChange(regen),
      onShirtChange(regen), onShirtColorChange(regen),
      onPantsChange(regen), onShoesChange(regen)];
    return () => { alive = false; unsubs.forEach(u => u && u()); };
  }, []);
  /* Native non-passive touchmove preventDefault on the dashboard.
     Stops iOS from interpreting an upward swipe over the bars/buttons
     as a page pan -- which previously caused the dashboard area to
     shake (rubber-band / URL-bar transition).  React's synthetic
     onTouchMove is passive on some Safari versions so preventDefault
     there is ignored; this listener is explicitly passive: false.
     Touches that started inside a scrollable panel (overflow auto/scroll)
     are allowed to bubble untouched so panel content can still scroll. */
  useEffect(() => {
    const el = dashRef.current;
    if (!el) return;
    const onMove = (e) => {
      let node = e.target;
      while (node && node !== el && node.nodeType === 1) {
        try {
          const cs = window.getComputedStyle(node);
          if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') return;
        } catch (_) {}
        node = node.parentNode;
      }
      if (e.cancelable) e.preventDefault();
    };
    el.addEventListener('touchmove', onMove, { passive: false });
    return () => el.removeEventListener('touchmove', onMove);
  }, []);

  const stack = dashboardPanelBus.state.stack;
  const activeId = stack.length ? stack[stack.length - 1] : null;
  const active = activeId ? PANELS[activeId] : null;

  const S = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
  const R = (S && S.rpg) || {};

  const level = R.level || 1;
  const xp = R.xp || 0;
  // Use the canonical xpRequired curve so the dashboard's bar agrees
  // with the game-loop level-up threshold.
  const xpNeeded = xpRequired(level);
  /* v2.3.1207: `buildThresh` (xpRequired(combat level)) removed — the
     build-cell progress strips now divide by the STAT'S OWN threshold,
     xpRequired(R[stat]), computed per cell below.  Since v2.3.910 the
     real level-up trigger (combatHelpers addBuildProg) keys the cost to
     the stat's level, and combat level became the SUM of the stats — so
     dividing by xpRequired(level) made every strip read near-zero at
     mid game.  (T2Panel's grid tabs already used the per-stat curve.) */

  // Gold readout — moved from the bag panel into the top-right HUD so
  // the inventory grid has full vertical room.  Use the same fallback
  // chain the bag was using so cached vs canonical fields both work.
  const gold =
    (R._compStats && (R._compStats.totalGoldEarned || R._compStats.goldEarnedTotal)) ||
    R.goldEarned || R.coins || R.gold || 0;

  /* v2.3.131: smoothly count the gold readout up to the new total
     instead of snapping.  Pickup popup shows "+N G" below the pill
     while the number visibly ticks toward `gold`.  RAF stops as soon
     as the displayed value reaches the target. */
  const [displayGold, setDisplayGold] = useState(gold);
  const displayGoldRef = useRef(gold);
  useEffect(() => {
    if (gold === displayGoldRef.current) return undefined;
    let raf = 0;
    const tick = () => {
      const cur = displayGoldRef.current;
      if (cur === gold) return;
      const diff = gold - cur;
      const step = Math.sign(diff) * Math.max(1, Math.ceil(Math.abs(diff) * 0.3));
      const next = Math.abs(step) >= Math.abs(diff) ? gold : cur + step;
      displayGoldRef.current = next;
      setDisplayGold(next);
      if (next !== gold) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [gold]);

  const Active = active?.Component;

  /* v2.3.114: thin XP strip pinned across the screen flush above the
     bottom dashboard. v2.3.152: repurposed to show build-points-to-
     next-level since combat level is now a pure function of BP (A1).
     Bar fills 0 -> 100% as buildPointsThisLvl goes 0 -> 5; resets on
     level-up. The original xpPct path is kept commented as a quick
     revert path if BP-progress turns out to feel wrong. */
  // const xpPct = xpNeeded > 0 ? Math.max(0, Math.min(100, (xp / xpNeeded) * 100)) : 0;
  const bp = R._buildPointsThisLvl || 0;
  const xpPct = Math.max(0, Math.min(100, (bp / 5) * 100));

  return (
    <>
      {/* v2.3.177 (F3): item-detail popup mounts here so it inherits the
          dashboard's React tree but its position:fixed inset:0 makes it
          float above the entire app at zIndex 50. */}
      <ItemDetailPopup />
      {/* v2.3.911: build-skill point-spend confirmation window (floats above
          the dashboard at zIndex 60, over the Builds menu). */}
      <SpendPointConfirm />
      <Tooltip text={tooltip} onClose={() => setTooltip('')} />

      {/* v2.3.821: the XP bar moved off the bottom trim into the top-right
          character card (beneath the gold row) at the owner's request --
          see the card below. */}

      {/* Upper-right player card — portrait, name + level, gold.
          Name plate moved here from above the player's head so the
          new HP heart has unobstructed space right above the head. */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 6px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 6px)',
          zIndex: 30,
          background: COL.overlayBg,
          border: `1px solid ${COL.overlayBorder}`,
          borderRadius: 8,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.25)',
          padding: '4px 6px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          touchAction: 'none',
        }}>
        {/* Portrait frame — 40x40, centered. */}
        <div style={{
          width: 40,
          height: 40,
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6,
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img
            /* Show the player's customized login-picker character first (it
               matches the in-game body); fall back to an NFT avatar, then the
               static icon.  Previously S.myAvatar (a stale/pool NFT pick) took
               priority and showed e.g. a monkey even though the in-game
               character is the cosmetic bro (the NFT is suppressed in-world
               when worn armour hides the body). */
            src={profilePortrait || (S && S.myAvatar) || '/icons/ui/profile.webp?v=2.3.128'}
            alt="Portrait"
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              imageRendering: 'pixelated',
              borderRadius: 4,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        </div>
        {/* Name + level row, centered under the portrait. */}
        <div style={{
          color: '#e8eaf8',
          fontFamily: 'Source Sans 3, sans-serif',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '.02em',
          textAlign: 'center',
          lineHeight: 1.15,
          maxWidth: 96,
          textShadow: '0 1px 2px rgba(0,0,0,.85)',
        }}>
          <div style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{(S && S.myName) || 'Anon'}</div>
          <div style={{ color: '#a0a8c0', fontSize: 11 }}>Lv {level}</div>
        </div>
        {/* Gold row — icon + value, centered under the portrait. */}
        <div style={{
          color: '#f5c542',
          fontFamily: 'Source Sans 3, sans-serif',
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '.04em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}>
          <img
            src="/icons/popups/gold.webp"
            alt=""
            style={{
              width: 16,
              height: 16,
              imageRendering: 'pixelated',
              display: 'block',
            }}
          />
          {/* v2.3.821: animated gold-sheen glimmer on the coin count. */}
          <span className="bt-coin-glimmer">{Number(displayGold).toLocaleString()}</span>
        </div>
        {/* v2.3.821: XP progress — moved here, beneath the character card. */}
        <div style={{
          alignSelf: 'stretch',
          height: 6,
          marginTop: 1,
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.35)',
        }}>
          <div style={{
            width: xpPct + '%',
            height: '100%',
            background: 'linear-gradient(90deg, #3ddc97, #5be3aa)',
            transition: 'width .4s ease-out',
          }} />
        </div>
      </div>

    <div
      ref={dashRef}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        height: 'var(--dash-h)',
        /* v2.3.122: dark bluish-gray vertical gradient behind the
           three column panels so the sections pop against a slightly
           lifted backdrop instead of a flat near-black field. */
        background: 'linear-gradient(180deg, #1e2436 0%, #141826 55%, #0c0f18 100%)',
        borderTop: `1px solid ${COL.border}`,
        color: COL.text,
        fontFamily: 'Source Sans 3, sans-serif',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        paddingBottom: 'env(safe-area-inset-bottom)',
        /* touch-action: none swallows browser default gestures (pan,
           zoom, swipe) on the dashboard chrome.  Inner scrollable panels
           use panelStyle.touchAction = 'pan-y' to opt back in to
           vertical scrolling. Without this, an accidental horizontal
           swipe on the dashboard area was being interpreted as a page
           pan and the viewport visibly juddered. */
        touchAction: 'none',
      }}
    >
      {active ? (
        <>
          {/* Header strip — back-chip (only on drilled child), title, ×. */}
          <div style={{
            height: 38,
            flex: '0 0 38px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            borderBottom: `1px solid ${COL.divider}`,
            gap: 8,
          }}>
            {stack.length > 1 && (
              <button
                onPointerUp={(e) => { e.stopPropagation(); dashboardPanelBus.pop(); }}
                style={chipStyle}
              >◂</button>
            )}
            {/* v2.3.692: match the LOADOUT / BUILD ColHeader treatment
                (14px, .08em tracking, uppercase, centered) so every open
                panel title — BAG, MAP, etc. — reads consistently. */}
            <div style={{
              flex: 1,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              textAlign: 'center',
              color: COL.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>{active.title}</div>
            <button
              onPointerUp={(e) => { e.stopPropagation(); dashboardPanelBus.clear(); }}
              style={chipStyle}
            >×</button>
          </div>
          {Active && <Active />}
        </>
      ) : (
        <>
          {/* 3-column body with section headers; gold moved to the Bag. */}
          <div style={{
            flex: 1,
            padding: '4px 12px 6px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}>
            <div style={{ flex: 1, display: 'flex', gap: 8, minHeight: 0 }}>
              {/* ── Left column — hybrid card: HP/MP/END chip row +
                  Crit/Move derived stats + session summary (Zone, Kills,
                  Playtime).  v2.3.126: portrait migrated to the top-right
                  HUD; this column narrowed (flex 0.85) so Loadout
                  (flex 1.35) gets the slack. */}
              {/* v2.3.1205: data-tut anchors on the three columns — the
                  live-DOM ControlsTutorial measures these instead of the
                  retired frozen screenshot. */}
              <div data-tut="dash-bag" style={{
                /* v2.3.1057: all three columns (Bag / Loadout / Build) are
                   now equal width (flex 1 each) so the quick-bag squares,
                   the loadout slots, and the build cells all line up at the
                   same size -- the bag and loadout both being 3-col grids
                   with the same gap means their squares come out identical. */
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                padding: 4,
                borderRadius: 6,
                border: `1px solid ${COL.border}`,
                background: 'rgba(255,100,100,0.04)',
                boxShadow: 'inset 0 1px 3px rgba(34,48,60,0.06)',
                /* v2.3.129: clip overflow so the Kills row (and any other
                   session-summary row) doesn't bleed past the column's
                   bottom border at narrow heights. */
                overflow: 'hidden',
              }}>
                {/* v2.3.1065: BAG title matching the Loadout/Build ColHeaders
                    (sits on the red container tint; the leather-backed grid
                    renders below). */}
                <ColHeader>Bag</ColHeader>
                {/* v2.3.155: hybrid HP/MP/END card replaced with a
                    compact inventory preview. The derived stats it used
                    to show (Crit / Block / Zone / Kills / Time) are
                    available in the Stats and Journey panels. Original
                    IIFE was kept below the swap as a `false &&` block
                    so the v2.3.127 layout is one revert away. */}
                <InventoryPreview />
                {false && (() => {
                  const maxHp  = R.maxHp     || calcMaxHp(R.level || 1, R.vitality || 0);
                  const maxMp  = R.maxMana   || calcMaxMana(R.mind || 0);
                  const maxSta = R.maxStamina || calcMaxStam(R.endurance || 0);
                  /* Derived combat stats — calcCritChance and
                     calcBlockReduction both return 0..1 fractions;
                     multiply by 100 + round for the % display. */
                  /* Crit = Power baseline + the equipped weapon CATEGORY's
                     crit channel (matches the combat loop; generic Ferocity
                     retired). */
                  const critPct  = Math.round(calcCritChance(R.power || 0, getWeaponCritStat(R)) * 100);
                  const blockPct = Math.round(calcBlockReduction(getDefenseBlockBonus(R), R.shield) * 100);
                  /* Session summary — zone name lookup is safe-guarded so
                     a missing currentZone or a zone removed from ZONES
                     never crashes the dashboard.  _compStats may be
                     absent on older save shapes. */
                  const zoneId = (S && S.currentZone) || 'town';
                  const zoneName = (ZONES[zoneId] && ZONES[zoneId].name) || zoneId;
                  const cs = R._compStats || {};
                  const kills = cs.monstersKilled || 0;
                  const pts = cs.playtimeSeconds || 0;
                  const pth = Math.floor(pts / 3600);
                  const ptm = Math.floor((pts % 3600) / 60);
                  const ptText = pth > 0 ? `${pth}h ${ptm}m` : `${ptm}m`;
                  const rowStyle = {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 6,
                    padding: '1px 4px',
                    cursor: 'pointer',
                    touchAction: 'none',
                  };
                  const rowLabel = {
                    color: COL.muted,
                    fontWeight: 700,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '.05em',
                  };
                  const rowVal = { color: COL.text, fontWeight: 700, fontSize: 13 };
                  /* Stat-tinted chip row used for HP / MP / END.  Label
                     adopts the resource-bar color (red/blue/gold) so the
                     three rows read as a quick durability sheet. */
                  const chipRow = (label, val, color, tip) => ({
                    label, val, color, tip,
                  });
                  const statChips = [
                    chipRow('HP',  maxHp,  COL.hp,   `Max HP at Vitality ${R.vitality || 0}.`),
                    chipRow('MP',  maxMp,  COL.mp,   `Max Mana at Mind ${R.mind || 0}.`),
                    chipRow('END', maxSta, COL.stam, `Max Stamina at Endurance ${R.endurance || 0}.`),
                  ];
                  return (
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      minHeight: 0,
                      padding: '2px 2px 0',
                    }}>
                      {/* HP / MP / END — vertical chips, full column
                         width so labels and values both fit cleanly. */}
                      {statChips.map((c) => (
                        <div key={c.label}
                          onPointerUp={(e) => { e.stopPropagation(); setTooltip(c.tip); }}
                          title={c.tip}
                          style={{
                            ...rowStyle,
                            background: 'rgba(34,48,60,0.05)',
                            border: '1px solid rgba(34,48,60,0.10)',
                            borderRadius: 3,
                            padding: '1px 6px',
                          }}>
                          <span style={{
                            color: c.color,
                            fontWeight: 800,
                            fontSize: 11,
                            letterSpacing: '.06em',
                          }}>{c.label}</span>
                          <span style={rowVal}>{c.val}</span>
                        </div>
                      ))}
                      {/* Derived stats — Crit + Block.  Block % pairs
                         offense/defense with Crit and rises when the
                         player equips a shield or trains Fortification. */}
                      <div style={{ borderTop: '1px solid rgba(34,48,60,0.10)', paddingTop: 2 }}>
                        <div
                          onPointerUp={(e) => { e.stopPropagation(); setTooltip(`Crit chance — Power baseline plus the equipped weapon's crit channel (${getWeaponCritStat(R)}).  Allocate it under Weapons.`); }}
                          title="Crit chance from Power + weapon crit channel"
                          style={rowStyle}>
                          <span style={rowLabel}>Crit</span>
                          <span style={rowVal}>{critPct}%</span>
                        </div>
                        <div
                          onPointerUp={(e) => { e.stopPropagation(); setTooltip(`Block — a raised shield fully negates hits.  The % shows base 25% + shield gear bonus.  Bulwark (Defense grid) cuts block stamina costs.`); }}
                          title="Block: full negation while shielded"
                          style={rowStyle}>
                          <span style={rowLabel}>Block</span>
                          <span style={rowVal}>{blockPct}%</span>
                        </div>
                      </div>
                      {/* Session summary — Zone / Kills / Playtime. */}
                      <div style={{ borderTop: '1px solid rgba(34,48,60,0.10)', paddingTop: 2, flex: 1, minHeight: 0 }}>
                        <div
                          onPointerUp={(e) => { e.stopPropagation(); setTooltip(`Current zone: ${zoneName} (${zoneId}).`); }}
                          title={`Current zone: ${zoneName}`}
                          style={rowStyle}>
                          <span style={rowLabel}>Zone</span>
                          <span style={{ ...rowVal, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>{zoneName}</span>
                        </div>
                        <div
                          onPointerUp={(e) => { e.stopPropagation(); setTooltip(`Lifetime monsters killed: ${kills.toLocaleString()}.`); }}
                          title="Lifetime monsters killed"
                          style={rowStyle}>
                          <span style={rowLabel}>Kills</span>
                          <span style={rowVal}>{kills.toLocaleString()}</span>
                        </div>
                        <div
                          onPointerUp={(e) => { e.stopPropagation(); setTooltip(`Total playtime: ${ptText}.`); }}
                          title="Total playtime"
                          style={rowStyle}>
                          <span style={rowLabel}>Time</span>
                          <span style={rowVal}>{ptText}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* ── Middle column — Loadout.
                  v2.3.125 introduced the DMG/DPS line + 3-then-2 equip
                  grid.  v2.3.126 widened to flex 1.35 (was 1) using the
                  slack freed by the left column shrinking to 0.85.
                  Weapon slot still cycles activeSlot on tap (the
                  floating WeaponSwapBar was unmounted in v2.3.125).
                  v2.3.1057: flex 1.35 -> 1 so Bag / Loadout / Build are all
                  equal width. */}
              <div data-tut="dash-loadout" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                padding: 4,
                borderRadius: 6,
                border: `1px solid ${COL.border}`,
                background: 'rgba(120,110,255,0.04)',
                boxShadow: 'inset 0 1px 3px rgba(34,48,60,0.06)',
              }}>
                <ColHeader>Loadout</ColHeader>
                {(() => {
                  /* DMG/DPS calc — mirrors WeaponSwapBar.readState() so the
                     numbers match what combat actually rolls.  Stat driver
                     follows EQUIP_STAT_MAP: POW for melee, AGI for bow,
                     MIND for staff.  Damage ranges + staff cooldown penalty
                     mirror calcWeaponDmg in gameLoop.js. */
                  const slot = R.activeSlot || 'melee';
                  const wpn = (S && R) ? getActiveWeapon(R) : null;
                  const wType = wpn && WEAPON_TYPES[wpn.type];
                  /* v2.3.227: uppercased to match the other loadout
                     labels (SHIELD / AMULET / CHEST / LEGS). */
                  const slotLabel = slot === 'ranged' ? 'RANGED'
                                   : slot === 'staff' ? 'STAFF' : 'MELEE';
                  /* v2.3.129: loadout slot uses the real in-world weapon
                     sprite (same artwork the player sees swinging) instead
                     of the small popup-icon placeholder.  URLs mirror
                     rendering/weaponSprites.js so the dashboard and the
                     Pixi scene stay in sync. */
                  /* v2.3.172: wood-tier swords pick the bamboo art so
                     the Loadout slot icon matches what the player sees
                     in-world. Mirrors the SHEETS table in
                     src/rendering/weaponSprites.js. */
                  const isWoodSword = slot === 'melee' && wpn && wpn.gearBase === 'wood';
                  /* v2.3.211: gate icon on having a weapon equipped --
                     after Unequip, R[slot] is null so wpn is null and
                     the cell should show no icon (UNARMED). */
                  const slotIconSrc = !wpn ? null
                                     : slot === 'ranged' ? '/sprites/weapons/bows/Bow2.webp?v=2.3.173'
                                     : slot === 'staff' ? '/sprites/weapons/staffs/Wizard%20Staff2.webp?v=2.3.173'
                                     : isWoodSword     ? '/sprites/weapons/swords/steel-sword-east.webp?v=2.3.1070' /* v2.3.1070: mini steel-sword icon, not bamboo */
                                     :                    '/sprites/weapons/swords/Sword1.webp?v=2.3.173';
                  /* v2.3.1206: inline math (v2.3.912 stat driver +
                     v2.3.1131 quality/hardness + v2.3.1133 crit-channel
                     fold) extracted VERBATIM into gameSystems'
                     calcDisplayDmgRange/calcDisplayDps so the popup +
                     inventory readouts share it — this readout was the
                     one correct copy; the helpers key stat/variance off
                     wpn.type instead of activeSlot, identical whenever
                     the slot holds its own weapon type (guaranteed by
                     the v2.3.1159 slot repair). Numbers must not move. */
                  let dmgText = '0', dpsText = '0.0';
                  if (wType) {
                    const range = calcDisplayDmgRange(R, wpn);
                    dmgText = range.text;
                    dpsText = calcDisplayDps(R, wpn).toFixed(1);
                  }
                  /* Equip slot list — order matches the user's wireframe.
                     v2.3.127 reorder: Row 1 reads Shield · Amulet · Weapon
                     so the active weapon sits at the natural thumb-reach
                     position (top-right) while defense-y slots flank it.
                     Row 2: Chest · Legs.  Leg & amulet still placeholder
                     text since there's no PNG art yet. */
                  const shieldSrc = R.shield ? '/sprites/shields/wood-shield-front.webp?v=2.3.198' : null;
                  const armorSrc = null; /* No chest-armor PNG sprite yet. */
                  /* Plain function (not a React component) so React doesn't
                     see a fresh component-type identity on every render and
                     remount the cells.  Called as slotCell({...}) below. */
                  const slotCell = ({ k, label, iconSrc, onTap, active, equipped, equippedGlyph }) => (
                    <div key={k}
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
                        borderRadius: 4,
                        background: active ? 'rgba(176,141,87,0.18)' : 'rgba(34,48,60,0.05)',
                        border: active ? '1px solid rgba(176,141,87,0.70)' : '1px solid rgba(34,48,60,0.12)',
                        boxShadow: active ? 'inset 0 0 6px rgba(245,199,70,0.3)' : 'none',
                        cursor: onTap ? 'pointer' : 'default',
                        touchAction: 'none',
                        minWidth: 0,
                        minHeight: 0,
                        aspectRatio: '1 / 1',
                      }}>
                      {iconSrc ? (
                        <img
                          src={iconSrc}
                          alt={label}
                          draggable={false}
                          style={{
                            width: '85%',
                            height: '85%',
                            objectFit: 'contain',
                            imageRendering: 'pixelated',
                            opacity: equipped === false ? 0.35 : 1,
                            userSelect: 'none',
                            pointerEvents: 'none',
                          }}
                        />
                      ) : equipped && equippedGlyph ? (
                        /* v2.3.228: fallback when an item is equipped but
                           has no sprite (e.g. armor).  Renders the glyph
                           bold so the slot doesn't read as "empty". */
                        <span style={{
                          fontSize: 22,
                          lineHeight: 1,
                          userSelect: 'none',
                          pointerEvents: 'none',
                        }}>{equippedGlyph}</span>
                      ) : (
                        <span style={{
                          color: COL.muted,
                          fontWeight: 700,
                          fontSize: 9,
                          letterSpacing: '.06em',
                        }}>{label}</span>
                      )}
                    </div>
                  );
                  /* v2.3.210: tapping the weapon slot now opens the
                     ItemDetailPopup for the currently-active weapon
                     instead of cycling melee/ranged/staff. */
                  /* v2.3.1025: every loadout cell opens the unified picker
                     (kind:'loadout') docked over the BUILD column (to the right
                     of the loadout cells), so it never covers the loadout and
                     stays put while you switch categories.  Tapping the SAME
                     cell again closes it; tapping a different cell switches the
                     picker's slot in place. */
                  const openLoadout = (slot) => (anchor) => {
                    const st = itemDetailBus.state;
                    if (st && st.open && st.target && st.target.kind === 'loadout' && st.target.slot === slot) {
                      itemDetailBus.close();
                      return;
                    }
                    let panel = null;
                    try {
                      const r = buildColRef.current && buildColRef.current.getBoundingClientRect();
                      if (r) panel = { left: r.left, top: r.top, width: r.width, height: r.height };
                    } catch (_e) {}
                    itemDetailBus.open({ kind: 'loadout', slot, anchor, panel });
                  };
                  const onTapWeapon = openLoadout('weapon');
                  const onTapShield = openLoadout('shield');
                  /* v2.3.228: armor slot tap opens the same popup. */
                  const onTapArmor = (anchor) => {
                    if (!R.armor) return;
                    itemDetailBus.open({ kind: 'armor', armor: R.armor, anchor });
                  };
                  /* v2.3.685: chest/legs cells bind to the WORN gear (the
                     rendered steel set, gearCatalog slots -- equipped by
                     default on join).  Tap opens the popup with Unequip,
                     which stashes the piece in the bag (rpg.gearStash),
                     mirroring the weapon/shield flow. */
                  const gearChestId = getEquip('chest');
                  const gearLegsId = getEquip('legs');
                  const gearShirtId = getEquip('shirt');
                  const gearIconSrc = (id) =>
                    (id === 'steelplate' || id === 'steelgreaves')
                      ? `/sprites/gear/icons/${id}.webp?v=2.3.685`
                      : id === 'tshirt' ? '/sprites/gear/icons/tshirt.webp?v=2.3.756' : null;
                  /* v2.3.756: the CHEST cell holds two layers (armour over
                     shirt).  Its icon shows the TOP visible layer; tapping
                     always opens the two-layer picker, even when empty, so
                     either layer can be re-equipped from here. */
                  const onTapChestLayers = openLoadout('chest');
                  const onTapLegsArmor = openLoadout('legs');
                  /* v2.3.1069: worn-equipment defense readout.  NOTE: armor is
                     currently cosmetic -- the only def value is the placeholder
                     `def:5` per piece in gearCatalog; actual damage mitigation
                     is server-authoritative and not yet wired to chest/legs.
                     This line just surfaces what's equipped (chest + legs ×5)
                     so the loadout shows an "effect" number; the real mechanic
                     is a follow-up (see chat). */
                  const armorDef = (gearChestId !== 'none' ? 5 : 0) + (gearLegsId !== 'none' ? 5 : 0);
                  return (
                    /* v2.3.1069: the loadout is now ONE 3-row grid that mirrors
                       the quick-bag's 3x3 (same 3 columns, gridAutoRows:min-content
                       square cells, alignContent:center, gap:3, padding:3) so the
                       two panels share row geometry.  Row 1 is a full-width data
                       cell sized to ~one square tall (aspectRatio) holding the
                       DMG/DPS + DEF readouts; rows 2-3 are the six equipment slots
                       -- which therefore line up EXACTLY with the bag's bottom two
                       rows of squares. */
                    <div style={{
                      flex: 1,
                      minHeight: 0,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gridAutoRows: 'min-content',
                      alignContent: 'center',
                      gap: 3,
                      padding: 3,
                    }}>
                      {/* Row 1 — data cell spanning all three columns, ~one
                          square tall so the grid reads as 3 rows (aspectRatio
                          ≈ full-width / square; tune if a hair off). */}
                      <div style={{
                        gridColumn: '1 / -1',
                        aspectRatio: '3.18 / 1',
                        minHeight: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                      }}>
                        <div
                          onPointerUp={(e) => { e.stopPropagation(); setTooltip(`${slotLabel} weapon — tap the weapon slot to cycle melee → ranged → staff.`); }}
                          title={`${slotLabel} · DMG ${dmgText} · DPS ${dpsText}`}
                          style={{ fontSize: 11, color: COL.text, letterSpacing: '.02em', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', touchAction: 'none' }}>
                          <span style={{ color: COL.muted }}>DMG </span>{dmgText}
                          <span style={{ color: COL.muted }}>  ·  DPS </span>{dpsText}
                        </div>
                        <div
                          onPointerUp={(e) => { e.stopPropagation(); setTooltip('Defense from worn armor (chest + legs). Placeholder for now — armor does not yet reduce damage.'); }}
                          title="Defense from worn armor"
                          style={{ fontSize: 11, color: COL.text, letterSpacing: '.02em', textAlign: 'center', whiteSpace: 'nowrap', cursor: 'pointer', touchAction: 'none' }}>
                          <span style={{ color: COL.muted }}>DEF </span>+{armorDef}
                        </div>
                      </div>
                      {/* Rows 2-3 — the six equipment slots (Chest·Weapon·Shield
                          / Legs·Amulet·Cape). */}
                      {slotCell({
                          k: 'chest',
                          label: 'CHEST',
                          /* v2.3.756: top visible layer -- armour over
                             shirt; legacy stats-armor fallback last */
                          iconSrc: gearChestId !== 'none' ? gearIconSrc(gearChestId)
                                 : gearShirtId !== 'none' ? gearIconSrc(gearShirtId)
                                 : armorSrc,
                          equipped: gearChestId !== 'none' || gearShirtId !== 'none' || !!R.armor,
                          equippedGlyph: '\u{1F9BA}',
                          active: gearChestId !== 'none' || gearShirtId !== 'none' || !!R.armor,
                          onTap: onTapChestLayers,
                        })}
                        {/* v2.3.1025: label is always WEAPON (melee/ranged/staff all live here). */}
                        {slotCell({ k: 'weapon', label: 'WEAPON', iconSrc: slotIconSrc, active: !!wpn, onTap: onTapWeapon })}
                        {slotCell({ k: 'shield', label: 'SHIELD', iconSrc: shieldSrc, active: !!R.shield, equipped: !!R.shield, onTap: onTapShield })}
                        {slotCell({
                          k: 'legs',
                          label: 'LEGS',
                          iconSrc: gearLegsId !== 'none' ? gearIconSrc(gearLegsId) : null,
                          equipped: gearLegsId !== 'none',
                          equippedGlyph: '\u{1F456}',
                          active: gearLegsId !== 'none',
                          onTap: onTapLegsArmor,
                        })}
                        {slotCell({ k: 'amulet', label: 'AMULET', iconSrc: null, active: !!R.amulet, equipped: !!R.amulet })}
                        {/* Cape: new back-layer slot (v2.3.692).  Render + equip
                            flow land in Phase 2; cell shows as empty for now. */}
                        {slotCell({ k: 'cape', label: 'CAPE', iconSrc: null, active: false })}
                      </div>
                  );
                })()}
              </div>

              {/* ── Right column — Stats + Life Skills merged.
                  v2.3.125: Build (5 char stats) and Life Skills (10) now
                  share one column as a 3-sub-col x 5-row grid.  Build
                  occupies sub-col 1; Life Skills fills sub-cols 2 and 3
                  (5 rows of 2 skills each).  Per-cell XP strip preserved. */}
              <div ref={buildColRef} data-tut="dash-build" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                padding: 4,
                borderRadius: 6,
                border: `1px solid ${COL.border}`,
                background: 'rgba(80,200,130,0.04)',
                boxShadow: 'inset 0 1px 3px rgba(34,48,60,0.06)',
              }}>
                <ColHeader>{SHOW_LIFE_SKILLS ? 'Stats · Skills' : 'Build'}</ColHeader>
                <div style={{
                  flex: 1,
                  display: 'grid',
                  /* v2.3.692: Build-only is a clean 3-col x 2-row grid filled
                     ROW-major (damage stats top, combat resources bottom).
                     With life skills shown, fall back to the old 3-col x 5-row
                     column-flow layout (Build in sub-col 1, skills in 2-3). */
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gridTemplateRows: SHOW_LIFE_SKILLS ? 'repeat(5, 1fr)' : 'repeat(2, 1fr)',
                  gap: 2,
                  gridAutoFlow: SHOW_LIFE_SKILLS ? 'column' : 'row',
                  minHeight: 0,
                }}>
                  {CHAR_STATS.map(s => {
                    /* Defense is a Tier-2 skill (level on rpg.defenseSkill);
                       the rest are Tier-1 capacity stats read straight off R.
                       defenseSkill is absent until v2.3.693 wires it -> 0. */
                    const isDef = s.t2;
                    const val = isDef ? ((R.defenseSkill && R.defenseSkill.level) || 0) : (R[s.key] ?? 0);
                    const prog = isDef
                      ? 0   /* DEF progress strip wired with the skill in v2.3.693 */
                      : ((R._buildProg && R._buildProg[s.key]) || 0);
                    /* v2.3.1207: divide by the STAT'S OWN threshold — the
                       exact formula the level-up trigger uses
                       (combatHelpers addBuildProg, v2.3.910), and what
                       T2Panel's grid tabs already show.  Was
                       xpRequired(combat level), i.e. the stat SUM. */
                    const statThresh = Math.max(200, Math.floor(xpRequired(val)));
                    const pct = Math.max(0, Math.min(100, (prog / statThresh) * 100));
                    let bonusTxt = '';
                    /* v2.3.1207: vitality reads R.maxHp (the recalc/echo
                       product — includes armor HP + the Vigor mult) like
                       the endurance sibling, instead of re-deriving a
                       raw calcMaxHp that omitted both.  The dmg lines
                       print the REAL stat coefficient: each point adds
                       0.1667 to weapon base damage (calcDisplayDmgRange
                       / server _computeAttackDamage) — the 0.8 was the
                       retired pre-v2.3.912 rate, already fixed in the
                       loadout copy but missed here and in the
                       combatHelpers level-up floater. */
                    if (s.key === 'vitality')       bonusTxt = `${R.maxHp || calcMaxHp(R.level || 1, val)} HP`;
                    else if (s.key === 'endurance') bonusTxt = `${R.maxStamina || calcMaxStam(val)} STA`;
                    else if (s.key === 'power')     bonusTxt = `+${(val * 0.1667).toFixed(1)} melee base dmg`;
                    else if (s.key === 'agility')   bonusTxt = `+${(val * 0.1667).toFixed(1)} bow base dmg`;
                    else if (s.key === 'mind')      bonusTxt = `+${(val * 0.1667).toFixed(1)} magic base dmg`;
                    else if (s.key === 'defense')   bonusTxt = `Lv ${val} — block + damage cut`;
                    const tipFull = `${s.label} ${val} → ${bonusTxt}. ${s.tip}`;
                    /* v2.3.911: unspent Tier-2 points for this build skill.
                       When > 0 the cell pulses + shows a badge, and tapping it
                       opens the Builds menu jumped to that skill's tab instead
                       of just showing the tooltip. */
                    const unspentPts = buildSkillUnspent(R, s.key);
                    const openT2Cat = s.key === 'defense' ? 'defense' : STAT_TO_WEAPON_CAT[s.key];
                    return (
                      <div key={'b_' + s.key}
                        className={unspentPts > 0 ? 'bt-build-flash' : undefined}
                        onPointerUp={(e) => {
                          e.stopPropagation();
                          if (unspentPts > 0 && openT2Cat) {
                            requestT2Category(openT2Cat);
                            dashboardPanelBus.push('t2');
                          } else {
                            setTooltip(tipFull);
                          }
                        }}
                        title={tipFull}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          /* v2.3.696: vertical stack -- icon top-center,
                             value centered directly beneath it (user).
                             v2.3.695's horizontal pair superseded. */
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                          padding: '2px 4px',
                          borderRadius: 3,
                          background: 'rgba(176,141,87,0.10)',
                          border: '1px solid rgba(176,141,87,0.35)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          touchAction: 'none',
                          minHeight: 0,
                        }}>
                        {unspentPts > 0 && (
                          <span style={{
                            position: 'absolute', top: 1, right: 2,
                            background: '#B08D57', color: '#fff',
                            fontSize: 9, fontWeight: 900,
                            borderRadius: 7, padding: '0px 4px', lineHeight: 1.4,
                            pointerEvents: 'none', zIndex: 1,
                          }}>{unspentPts}</span>
                        )}
                        <img
                          src={s.iconSrc}
                          alt={s.label}
                          draggable={false}
                          style={{
                            width: 24 * (s.iconScale || 1),
                            height: 24 * (s.iconScale || 1),
                            objectFit: 'contain',
                            imageRendering: s.pixelated ? 'pixelated' : 'auto',
                            pointerEvents: 'none',
                            userSelect: 'none',
                            /* v2.3.1225: shrink-allowed so the 1.5x icon is a
                               ceiling, not a clip risk in short cells
                               (overflow:hidden on the cell). */
                            flexShrink: 1,
                            minHeight: 0,
                          }}
                        />
                        <span style={{ color: COL.text, fontWeight: 700, fontSize: 14, lineHeight: 1 }}>{val}</span>
                        <div style={{
                          position: 'absolute',
                          left: 0, right: 0, bottom: 0,
                          height: 2,
                          background: 'rgba(34,48,60,0.10)',
                          pointerEvents: 'none',
                        }}>
                          <div style={{
                            width: pct + '%',
                            height: '100%',
                            background: '#B08D57',
                            transition: 'width .15s linear',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                  {SHOW_LIFE_SKILLS && LIFE_SKILLS.map(sk => {
                    const sk_st = (R.lifeSkills && R.lifeSkills[sk.key]) || {};
                    const lvl = sk_st.level || 0;
                    const xp = sk_st.xp || 0;
                    const need = skillXpRequired(lvl);
                    const sPct = need > 0 ? Math.max(0, Math.min(100, (xp / need) * 100)) : 0;
                    return (
                      <div key={'s_' + sk.key}
                        onPointerUp={(e) => { e.stopPropagation(); setTooltip(`${sk.label} · Lv ${lvl} (${Math.round(sPct)}% to next) — ${sk.tip.split('—').slice(1).join('—').trim()}`); }}
                        title={sk.tip}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '0 4px',
                          borderRadius: 3,
                          background: 'rgba(34,48,60,0.05)',
                          border: '1px solid rgba(34,48,60,0.10)',
                          fontSize: 11,
                          minHeight: 0,
                          cursor: 'pointer',
                          touchAction: 'none',
                          overflow: 'hidden',
                        }}>
                        {/* v2.3.1224: UI Bible icon with emoji fallback */}
                        {sk.iconSrc
                          ? <img src={sk.iconSrc} alt="" draggable={false}
                              style={{ width: 14, height: 14, flexShrink: 0, objectFit: 'contain' }}
                              onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(sk.icon)); }} />
                          : <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>{sk.icon}</span>}
                        {/* v2.3.126: matches Build cell — flex:1 + center
                            so the level number stays centered regardless
                            of glyph width variance between emoji. */}
                        <span style={{ flex: 1, textAlign: 'center', color: COL.text, fontWeight: 700, fontSize: 13 }}>{lvl}</span>
                        <div style={{
                          position: 'absolute',
                          left: 0, right: 0, bottom: 0,
                          height: 2,
                          background: 'rgba(34,48,60,0.10)',
                          pointerEvents: 'none',
                        }}>
                          <div style={{
                            width: sPct + '%',
                            height: '100%',
                            background: 'rgba(61,220,151,0.85)',
                            transition: 'width .15s linear',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Icon row — bottom 30% of dashboard. */}
          <div style={{
            height: '30%',
            minHeight: 56,
            borderTop: `1px solid ${COL.divider}`,
            display: 'flex',
            alignItems: 'stretch',
          }}>
            <IconButton glyph="inventory" label="Bag"
              onClick={() => dashboardPanelBus.toggle('inventory')} />
            <IconButton glyph="friends"   label="Friends"
              onClick={() => dashboardPanelBus.toggle('social')} />
            <IconButton glyph="codex"     label="Codex"
              onClick={() => dashboardPanelBus.toggle('encyclopedia')} />
            <IconButton glyph="journey"   label="Journey"
              onClick={() => dashboardPanelBus.toggle('journey')} />
            {/* v2.3.1015: Chat replaces Map in the toolbar — TOGGLES the
                over-head chat bubble (ChatBubble.jsx): tap to open, tap again
                to close.  v2.3.1225: UI Bible panel-chat icon replaces the
                placeholder inline SVG. */}
            <IconButton glyph="chat" label="Chat" tut="dash-chat"
              onClick={() => chatBubbleBus.toggle()} />
            <IconButton glyph="more"      label="More" tut="dash-more"
              onClick={() => dashboardPanelBus.toggle('more')} />
          </div>
        </>
      )}
    </div>
    </>
  );
};

const chipStyle = {
  width: 32, height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: `1px solid ${COL.divider}`,
  borderRadius: 4,
  color: COL.text,
  fontFamily: 'inherit',
  fontSize: 22,
  fontWeight: 700,
  lineHeight: 1,
  cursor: 'pointer',
  flex: '0 0 auto',
};
