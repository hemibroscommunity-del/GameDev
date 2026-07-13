import React, { useEffect, useRef, useState } from 'react';
/* v2.3.1236: owner feedback r4 §2 — WEAPON_TYPES / calcDisplayDmgRange /
   calcDisplayDps return to this import (r3 §1 had dropped them with the
   DMG/DPS/DEF footer): the readout is reinstated as the icon-based line
   in the Loadout column's freed third row. */
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

/* v2.3.1227: Lantern Slate (docs/LANTERN-SLATE-SPEC.md) — dark
   mineral charcoal shelf, warm-white text, one lantern-brass accent.
   overlay* tokens are for chrome floating OVER the game world
   (player card, tooltips): same language at world-card opacity. */
/* v2.3.1235: correction-pass palette — this local block had gone stale
   (the QA reviewer sampled the band's "brass" top edge as gray-green:
   the old .28-alpha straw).  Values MUST stay in sync with game.css
   :root tokens and dash/common.js COL. */
const COL = {
  bg:        '#1E2E34',                    // sheet
  raised:    '#293B41',
  well:      '#111E23',
  wellSoft:  '#16262C',
  slot:      '#24363C',
  toolbar:   '#0E191E',
  border:    'rgba(229,237,233,0.11)',
  divider:   'rgba(229,237,233,0.11)',
  edgeWarm:  'rgba(216,170,88,0.42)',
  text:      '#F4F0E7',
  text2:     '#B6C1BE',
  muted:     '#8D9B98',
  hp:        '#E35D5B',
  stam:      '#DFAE4E',
  mp:        '#4F8FDE',
  xp:        '#58B97B',
  gold:      '#D8AA58',
  brass:     '#D8AA58',
  brassFill: 'rgba(216,170,88,0.15)',
  brassText: '#D8AA58',
  onAccent:  '#172126',
  tileBor:   'rgba(229,237,233,0.08)',
  overlayBg:     'rgba(13,22,27,0.88)',
  overlayBorder: 'rgba(229,237,233,0.20)',
  overlayText:   '#F4F0E7',
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
/* v2.3.1235: batch-4 state-correction §2 — the old `tip` prose paragraphs
   are gone; each stat now carries `train`, the one-sentence training line
   rendered as the tooltip's explanation row (the quantified benefit line
   is derived live in the render loop from the same formulas the cells
   already display). */
const CHAR_STATS = [
  { key: 'power',     label: 'Melee',     short: 'MEL', iconSrc: '/icons/ui/combat-melee.webp?v=2.3.1224',   pixelated: false, iconScale: 1.5, train: 'Improves when sword or greatsword attacks land.' },
  { key: 'agility',   label: 'Bow',       short: 'BOW', iconSrc: '/icons/ui/combat-bow.webp?v=2.3.1225',     pixelated: false, iconScale: 1.5, train: 'Also boosts move speed and dodge; improves when dodges succeed or bow shots land.' },
  { key: 'mind',      label: 'Magic',     short: 'MAG', iconSrc: '/icons/ui/combat-magic.webp?v=2.3.1224',   pixelated: false, iconScale: 1.5, train: 'Also grows the mana pool; improves when you spend mana on staff bolts.' },
  { key: 'vitality',  label: 'HP',        short: 'HP',  iconSrc: '/icons/ui/stat-vitality.webp?v=2.3.1224',  pixelated: false, iconScale: 1.5, train: 'Improves when you take damage and survive the fight.' },
  /* Defense = Tier-2 trained skill (rpg.defenseSkill.level); tapping opens the
     DEF spend tab in the T2 panel (wired in v2.3.693).  v2.3.696: DEF and END
     swapped -- bottom row reads Vitality · Defense · Endurance per user. */
  { key: 'defense',   label: 'Defense',   short: 'DEF', iconSrc: '/icons/ui/stat-defense.webp?v=2.3.1224',   pixelated: false, iconScale: 1.5, t2: true, train: 'Improves when you block and mitigate hits; spend points in the DEF tab.' },
  { key: 'endurance', label: 'Endurance', short: 'END', iconSrc: '/icons/ui/stat-endurance.webp?v=2.3.1225', pixelated: false, iconScale: 1.5, train: 'Improves when you spend stamina on dodge, block, or sprint.' },
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
    /* v2.3.1236: owner dashboard feedback §1 — the 16px icon is gone;
       the freed space goes to a larger title (11 -> 13/700, same
       uppercase + .14em tracking, underline kept). */
    /* v2.3.1236: owner feedback r2 §3 — 13 was a notch too loud next to
       the slot grids; 12/700 keeps the hierarchy without shouting. */
    fontSize: 12,
    fontWeight: 700,
    color: COL.text2,
    letterSpacing: '.14em',
    textTransform: 'uppercase',
    padding: '0 2px 2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottom: `1px solid ${COL.divider}`,
    marginBottom: 3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  }}>
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</span>
  </div>
);

// Tooltip popup module — taps on stat / skill rows show a short
// description above the dashboard.  One active tooltip at a time;
// auto-dismisses after 3s or on next tap.
/* v2.3.1235: batch-4 state-correction §2 — Build/stat tooltips upgraded
   from a single prose toast to a three-part anchored card: title line
   ("Melee 12", 13/700), quantified benefit line (15/700), and a short
   training sentence (12/1.35), with an 8px caret pointing at the tapped
   cell and x-clamping (12px margins) so the card never leaves the
   screen.  Callers that still pass a plain string (bars, player-card
   readouts, life skills) keep the legacy centered toast unchanged.
   Radius 10 + committed panel-shadow recipe per the earlier batch-4
   rollout (was off-recipe rgba(0,0,0,.5)). */
const Tooltip = ({ tip, onClose }) => {
  useEffect(() => {
    if (!tip) return;
    const id = setTimeout(onClose, 3000);
    return () => clearTimeout(id);
  }, [tip]);
  if (!tip) return null;
  const surface = {
    background: COL.overlayBg,
    border: `1px solid ${COL.overlayBorder}`,
    borderRadius: 10,
    color: COL.overlayText,
    fontFamily: 'Source Sans 3, sans-serif',
    zIndex: 36,
    boxShadow: '0 14px 30px rgba(4,7,9,.38)',
  };
  if (typeof tip === 'string') {
    // Legacy path — centered prose toast above the dashboard band.
    return (
      <div
        onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          ...surface,
          position: 'fixed',
          left: '50%',
          bottom: 'calc(var(--dash-h) + 12px)',
          transform: 'translateX(-50%)',
          maxWidth: '88vw',
          padding: '8px 12px',
          fontSize: 15,
          lineHeight: 1.3,
        }}
      >
        {tip}
      </div>
    );
  }
  const { title, benefit, body, anchor } = tip;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(280, vw - 24);
  const cx = anchor ? anchor.left + anchor.width / 2 : vw / 2;
  const left = Math.max(12, Math.min(cx - w / 2, vw - 12 - w));
  /* Prefer ABOVE the tapped cell (caret pointing down at it) so the
     card sits over the world, never under the dashboard band; flip
     below with the caret up only when the cell hugs the top edge. */
  const above = !anchor || anchor.top > 160;
  /* Caret offsets along the clamped card so it keeps pointing at the
     cell; 19px floor keeps the triangle clear of the 10px corners. */
  const caretX = Math.max(19, Math.min(cx - left, w - 19));
  const pos = !anchor
    ? { left, bottom: 'calc(var(--dash-h) + 12px)' }
    : above
      ? { left, bottom: vh - anchor.top + 10 }
      : { left, top: anchor.bottom + 10 };
  /* Two-triangle bordered caret: outer 9px in the border color, inner
     8px in the surface color, hanging off the edge nearest the cell. */
  const tri = (size, color) => ({
    position: 'absolute',
    [above ? 'top' : 'bottom']: '100%',
    left: caretX - size,
    width: 0,
    height: 0,
    borderLeft: `${size}px solid transparent`,
    borderRight: `${size}px solid transparent`,
    [above ? 'borderTop' : 'borderBottom']: `${size}px solid ${color}`,
    pointerEvents: 'none',
  });
  return (
    <div
      onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
      style={{ ...surface, position: 'fixed', width: w, padding: '12px 14px', ...pos }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, color: COL.text2 }}>{title}</div>
      {benefit && (
        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25, color: '#F4F0E7', marginTop: 2 }}>{benefit}</div>
      )}
      {body && (
        <div style={{ fontSize: 12, lineHeight: 1.35, color: '#B6C1BE', marginTop: 4 }}>{body}</div>
      )}
      {anchor && <div style={tri(9, COL.overlayBorder)} />}
      {anchor && <div style={tri(8, COL.overlayBg)} />}
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
  /* v2.3.1235: correction pass §5 — the permanent stone plates made
     the toolbar read as an app launcher competing with the world.
     Inactive buttons are now BARE (transparent shell, muted label);
     only the ACTIVE destination gets a shell: brass-soft fill, subtle
     brass border, and a 24×3px brass indicator centered at the shelf
     top.  Never a solid gold fill. */
  return (
    <button
      onPointerUp={fire}
      data-tut={tut}
      style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        padding: '4px 0',
        background: 'transparent',
        border: 'none',
        color: COL.text,
        cursor: 'pointer',
        fontFamily: 'Source Sans 3, sans-serif',
        touchAction: 'none',
        minHeight: 44,
      }}
    >
      {active && (
        <span style={{
          position: 'absolute', top: 0, left: '50%',
          width: 24, height: 3, transform: 'translateX(-50%)',
          background: 'var(--ui-brass)', borderRadius: '0 0 3px 3px',
          pointerEvents: 'none',
        }} />
      )}
      <span style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: active ? 'var(--ui-brass-soft)' : 'transparent',
        border: active ? '1px solid rgba(216,170,88,.45)' : '1px solid transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {node ? node : (
          <img
            src={src}
            alt={label}
            draggable={false}
            style={{
              width: 32,
              height: 32,
              objectFit: 'contain',
              imageRendering: 'auto',
            }}
          />
        )}
      </span>
      <span style={{
        fontSize: 11,
        fontWeight: 600,
        color: active ? 'var(--ui-text)' : 'var(--ui-text-muted)',
        letterSpacing: '.02em',
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
/* v2.3.1238: owner feedback §2 — the quick-bag / loadout cells were
   width-driven squares (aspect-ratio on 1fr columns, min-content rows),
   so once they grew (v2.3.1236 r3) the THIRD row could exceed the
   column's content height on short viewports (and on iPhones, where
   env(safe-area-inset-bottom) eats ~34px of the band) and got clipped.
   Fix: both grids become size containers and every square cell caps its
   width at one third of the grid's HEIGHT budget (3 rows + 2×4px gaps),
   so cells stay width-driven on tall phones (min() picks 100%) and
   shrink to fit the height on short ones.  Same formula in both grids
   keeps the owner-mandated bag/loadout cell-size parity (both grids
   share the exact same content-box height).  If container-query units
   are unsupported the min() is dropped and behavior degrades to the
   previous width-driven sizing. */
const FIT_GRID_CONTAIN = { containerType: 'size' };
const FIT_TILE_W = 'min(100%, calc((100cqh - 8px) / 3))';

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
        /* v2.3.1236: owner dashboard feedback §2 — recessed tray chrome
           removed (was the v2.3.1227 well background/border/inset
           shadow); only the item slots' own borders remain, and the
           freed padding enlarges the slots. */
        /* v2.3.1236: owner feedback r3 §2 — wrapper padding 2 -> 0: the
           column now carries the (symmetric, minimal) 2px horizontal
           inset for ALL three panels, and zeroing the wrapper's bottom
           padding puts the bag grid's bottom edge on the same y as the
           loadout/Build grids (§4).  The freed width goes to the cells. */
        padding: 0,
      }}
      title="Tap to open Bag"
    >
      {/* v2.3.1057: 3-col x 3-row slot grid mirroring the Loadout column's
          square grid (same 3 columns, same gap — 4 as of v2.3.1236 owner
          feedback r2 §2).  With all three columns
          equal width, each square comes out the exact loadout square size.
          Tiles stay square (ItemTile's default aspectRatio 1/1).  Items
          first, then faint empty slots fill to 9 so it always reads as an
          inventory grid. */}
      {/* v2.3.1236: owner feedback r3 §4 — alignContent center -> 'end':
          the 3x3 block bottom-anchors in the column so its bottom row
          lines up with the loadout and Build grids' bottom rows (all
          three columns share height and 4px bottom padding). */}
      {/* v2.3.1236: owner feedback r4 §1 — 'end' -> 'start': the grids
          now TOP-anchor instead, so the loadout's two slot rows sit
          level with THIS grid's first two rows (identical geometry:
          3 equal columns, gap 4, padding 0, square min-content rows,
          same ColHeader above, same 4px column top padding).  The
          loadout's freed third row hosts its reinstated damage line. */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridAutoRows: 'min-content',
        alignContent: 'start',
        /* v2.3.1236: owner dashboard feedback §2 — the v2.3.1235
           well-deep gradient tray (background/border/inset shadow/
           padding) is gone; the slots grow into the freed space and
           the gap bumps 3 -> 4 to keep them breathing. */
        gap: 4,
        padding: 0,
        /* v2.3.1238: owner feedback §2 — height-aware square cells
           (see FIT_TILE_W above). */
        ...FIT_GRID_CONTAIN,
      }}>
        {tiles.map((e, i) => (
          /* v2.3.1238: owner feedback §2 — sizing wrapper caps the tile
             at the height budget (BagTile/ItemTile roots are width:100%
             aspect 1/1, so they follow the wrapper's width). */
          <div
            key={e.kind === 'item' ? `i-${e.key}` : `${e.kind}-${e.index}-${i}`}
            style={{ width: FIT_TILE_W, justifySelf: 'center', minWidth: 0 }}
          >
            <BagTile entry={e} />
          </div>
        ))}
        {Array.from({ length: Math.max(0, 9 - tiles.length) }).map((_, i) => (
          <div key={`pe-${i}`} aria-hidden="true" style={{
            aspectRatio: '1 / 1',
            /* v2.3.1238: owner feedback §2 — same height-aware cap as
               the item tiles above. */
            width: FIT_TILE_W,
            justifySelf: 'center',
            background: COL.wellSoft,
            border: `1px solid ${COL.tileBor}`,
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44)',
            borderRadius: 8,
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
  /* v2.3.1236: owner feedback — stat screen shows the six combat skills;
     Weapons menu renamed Build (display string only; the t2 id and
     WEAPON_* internals keep their names). */
  t2:           { title: 'Build',       Component: T2Panel },
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
  /* v2.3.1235: batch-4 state-correction §2 — an anchored stat tooltip
     must not linger over a freshly opened panel: clear it on every
     panel-bus event (it did NOT clear before; only the 3s timer did). */
  useEffect(() => dashboardPanelBus.subscribe(() => { setTooltip(''); force(v => v + 1); }), []);
  /* v2.3.1229b: chat-bubble state lights the Chat toolbar icon. */
  useEffect(() => chatBubbleBus.subscribe(() => force(v => v + 1)), []);
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
  /* v2.3.1236: owner dashboard feedback §6 — `xp`/`xpNeeded` removed
     with the player-card XP strip below; nothing else read them. */
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

  /* v2.3.1236: owner dashboard feedback §6 — the build-points XP strip
     (v2.3.114 bottom trim -> v2.3.152 BP progress -> v2.3.821/v2.3.1227
     player-card bottom strip) is REMOVED along with its xpPct/bp calc;
     the per-cell Build strips are now the progress readout. */

  return (
    <>
      {/* v2.3.177 (F3): item-detail popup mounts here so it inherits the
          dashboard's React tree but its position:fixed inset:0 makes it
          float above the entire app at zIndex 50. */}
      <ItemDetailPopup />
      {/* v2.3.911: build-skill point-spend confirmation window (floats above
          the dashboard at zIndex 60, over the Builds menu). */}
      <SpendPointConfirm />
      <Tooltip tip={tooltip} onClose={() => setTooltip('')} />

      {/* v2.3.821: the XP bar moved off the bottom trim into the top-right
          character card (beneath the gold row) at the owner's request --
          see the card below. */}

      {/* Upper-right player card — v2.3.1227: Lantern Slate compact
          132×58 horizontal card (§10): portrait left with presence dot,
          name / Lv + gold right (v2.3.1236: the 3px XP strip that was
          flush to the inner bottom is gone — owner feedback §6).
          Replaces the tall vertical stack; the separate "N online" pill
          is gone (presence = the dot; count moves to Friends later). */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 8px)',
          zIndex: 30,
          width: 132,
          height: 58,
          background: COL.overlayBg,
          border: `1px solid ${COL.overlayBorder}`,
          borderRadius: 12,
          boxShadow: '0 14px 30px rgba(4,7,9,.38)',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '0 8px 0 6px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          touchAction: 'none',
        }}>
        {/* Portrait 40×40 with presence dot. */}
        <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
          <img
            src={profilePortrait || (S && S.myAvatar) || '/icons/ui/profile.webp?v=2.3.128'}
            alt="Portrait"
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              imageRendering: 'pixelated',
              borderRadius: 8,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
          <span style={{
            position: 'absolute', right: -2, bottom: -2,
            width: 7, height: 7, borderRadius: '50%',
            background: (S && S._realtimeStatus === 'connected') ? '#59BF91' : '#D95C54',
            border: '2px solid #202C32',
          }} />
        </div>
        {/* Name / level + gold. */}
        <div style={{ flex: 1, minWidth: 0, paddingBottom: 3 }}>
          <div style={{
            color: COL.overlayText,
            fontFamily: 'Source Sans 3, sans-serif',
            fontSize: 13,
            fontWeight: 700,
            lineHeight: '15px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{(S && S.myName) || 'Anon'}</div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'Source Sans 3, sans-serif',
            lineHeight: '15px',
          }}>
            <span style={{ color: COL.text2, fontSize: 10, fontWeight: 600 }}>Lv {level}</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              color: COL.gold, fontSize: 13, fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              minWidth: 0, overflow: 'hidden',
            }}>
              <img src="/icons/popups/gold.webp" alt=""
                style={{ width: 13, height: 13, imageRendering: 'pixelated', display: 'block' }} />
              <span className="bt-coin-glimmer">{Number(displayGold).toLocaleString()}</span>
            </span>
          </div>
        </div>
        {/* v2.3.1236: owner dashboard feedback §6 — the 3px XP strip that
            sat flush to the card's inner bottom is removed. */}
      </div>

    <div
      ref={dashRef}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        /* v2.3.1229b: panel mode grows the band (owner: panels were too
           small in the leftover strip once the toolbar persisted) —
           bottom-sheet pattern; the world stays visible above.  220ms =
           the spec's panel motion token. */
        /* v2.3.1235: Checkpoint B §3 — More is a LAUNCHER, not a content
           panel: 56vh left it a giant empty sheet, so it sizes to its
           content (header + 5×2 grid + toolbar ≈ 260px). Every other
           panel keeps the 56vh bottom sheet. */
        height: active ? (activeId === 'more' ? 'auto' : '56vh') : 'var(--dash-h)',
        transition: 'height 220ms cubic-bezier(.2,.8,.2,1)',
        /* v2.3.1227: Lantern Slate band — charcoal gradient, warm top
           edge (the "lantern" cue), soft up-shadow. */
        /* v2.3.1235: §4 — ONE continuous band-top→band-bottom gradient
           (no mid stop) + the quiet brass top edge (edge-warm token is
           now rgba(216,170,88,.42)). */
        background: 'linear-gradient(180deg, var(--ui-band-top) 0%, var(--ui-band-bottom) 100%)',
        borderTop: `1px solid ${COL.edgeWarm}`,
        /* v2.3.1238: owner feedback §1 — the spec's up-shadow
           (--shadow-band, '0 -10px 24px rgba(6,10,12,.22)') is REMOVED:
           its -10px offset put the densest part of the shadow ~10px
           ABOVE the band edge, which over bright terrain read as a
           detached "faint bar above the dashboard" (owner initially
           took it for the retired v2.3.114 XP strip; pixel-probed and
           confirmed by toggling the shadow).  The 1px edge-warm top
           border stays — that lantern cue is intentional. */
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
          {/* Header strip — back-chip (only on drilled child), title, ×.
              v2.3.1229: 44px minimum so back/close meet the 44pt touch
              rule (Lantern Slate §9). */}
          <div style={{
            height: 44,
            flex: '0 0 44px',
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
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '.10em',
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
          {/* v2.3.1229: panels render in a flex body ABOVE the persistent
              toolbar (spec §9: the toolbar stays visible in panel mode;
              its lit item identifies the panel; tapping it again = home). */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {Active && <Active />}
          </div>
        </>
      ) : (
        <>
          {/* 3-column body with section headers; gold moved to the Bag. */}
          <div style={{
            flex: 1,
            /* v2.3.1236: owner dashboard feedback §3 — back to 4px top
               padding; the 9px existed only to give the retired Loadout
               lift paint headroom. */
            padding: '4px 12px 6px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}>
            {/* v2.3.1236: owner feedback r2 §1 — 1px var(--ui-line) divider
                divs between the three columns, full column height; row gap
                8 -> 4 so each divider sits centered in ~the same 9px of
                total inter-column space as before. */}
            <div style={{ flex: 1, display: 'flex', gap: 4, minHeight: 0 }}>
              {/* ── Left column — hybrid card: HP/MP/END chip row +
                  Crit/Move derived stats + session summary (Zone, Kills,
                  Playtime).  v2.3.126: portrait migrated to the top-right
                  HUD; this column narrowed (flex 0.85) so Loadout
                  (flex 1.35) gets the slack. */}
              {/* v2.3.1205: data-tut anchors on the three columns — the
                  live-DOM ControlsTutorial measures these instead of the
                  retired frozen screenshot. */}
              <div data-tut="dash-bag" style={{
                /* v2.3.1235: §4 widths — Bag 31% / Loadout 38% / Build 31%
                   (flex-grow ratios; Loadout is the wider center anchor). */
                /* v2.3.1236: owner feedback r2 §2 — back to equal thirds so
                   a bag cell and a loadout slot render the same size (both
                   grids: 3 equal columns, gap 4, 2px inner inset). */
                flex: '1 1 0',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                /* v2.3.1236: owner feedback r3 §2 — owner saw excess left
                   padding on the bag grid: 4px column + 2px wrapper stacked
                   to a 6px inset each side.  All three columns drop to a
                   symmetric minimal 2px horizontal inset (inner wrappers/
                   grids now pad 0), so the cells absorb the freed width.
                   Vertical stays 4 — the shared bottom-padding number the
                   §4 bottom alignment is built on. */
                padding: '4px 2px',
                /* v2.3.1227: no card chrome — the band is the container
                   (Lantern Slate §8); Bag is the quiet/deep module. */
                /* v2.3.129: clip overflow so the Kills row (and any other
                   session-summary row) doesn't bleed past the column's
                   bottom border at narrow heights. */
                overflow: 'hidden',
              }}>
                {/* v2.3.1065: BAG title matching the Loadout/Build ColHeaders
                    (sits on the red container tint; the leather-backed grid
                    renders below). */}
                {/* v2.3.1236: owner dashboard feedback §1 — icon prop removed. */}
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
                            background: COL.wellSoft,
                            border: `1px solid ${COL.tileBor}`,
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
                      <div style={{ borderTop: `1px solid ${COL.divider}`, paddingTop: 2 }}>
                        <div
                          onPointerUp={(e) => { e.stopPropagation(); setTooltip(`Crit chance — Power baseline plus the equipped weapon's crit channel (${getWeaponCritStat(R)}).  Allocate it under Build.`); }}
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
                      <div style={{ borderTop: `1px solid ${COL.divider}`, paddingTop: 2, flex: 1, minHeight: 0 }}>
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

              {/* v2.3.1236: owner feedback r2 §1 — full-height column divider. */}
              <div aria-hidden="true" style={{ flex: 'none', width: 1, alignSelf: 'stretch', background: 'var(--ui-line)' }} />

              {/* ── Middle column — Loadout.
                  v2.3.125 introduced the DMG/DPS line + 3-then-2 equip
                  grid.  v2.3.126 widened to flex 1.35 (was 1) using the
                  slack freed by the left column shrinking to 0.85.
                  Weapon slot still cycles activeSlot on tap (the
                  floating WeaponSwapBar was unmounted in v2.3.125).
                  v2.3.1057: flex 1.35 -> 1 so Bag / Loadout / Build are all
                  equal width. */}
              <div data-tut="dash-loadout" style={{
                /* v2.3.1236: owner dashboard feedback §3 — the v2.3.1235
                   raised-anchor treatment (5px translateY lift +
                   marginBottom:-5, raised gradient, border, top radii,
                   shadow) is removed at the owner's request: Loadout is
                   a plain flex column like Build, still 38% wide. */
                /* v2.3.1236: owner feedback r2 §2 — 38% -> equal third; the
                   DMG/DPS/DEF readout moved to a footer line (§4) so the
                   six slots match the bag cells' size exactly.
                   r3 §1: that footer is now removed outright — the info
                   lives in the item picker and stat screen.
                   r4 §2: ...and it's back, by owner request, as a compact
                   icon-based line occupying the grid's third row (level
                   with the bag's third row now that both grids top-align). */
                flex: '1 1 0',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                /* v2.3.1236: owner feedback r3 §2 — symmetric minimal 2px
                   horizontal inset (matches Bag/Build); 4px vertical kept
                   as the shared bottom-padding for the §4 alignment. */
                padding: '4px 2px',
                position: 'relative',
                zIndex: 1,
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
                  /* v2.3.1236: owner feedback r4 §2 — wType/slotLabel and the
                     calcDisplayDmgRange/Dps readout return (r3 §1 removed
                     them with the footer): the readout is reinstated as the
                     compact icon line in the grid's freed third row below,
                     restored verbatim from the r2 (c4a427b1) derivations. */
                  const wType = wpn && WEAPON_TYPES[wpn.type];
                  /* v2.3.227: uppercased to match the other loadout
                     labels (SHIELD / AMULET / CHEST / LEGS). */
                  const slotLabel = slot === 'ranged' ? 'RANGED'
                                   : slot === 'staff' ? 'STAFF' : 'MELEE';
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
                  /* v2.3.1228: `quality` (weapons only — the one item class
                     with server-rolled quality, §4.6b) draws the Lantern
                     Slate rarity edge on the LIVE loadout slot: 2px blue
                     rare / violet elite, godly = the conic ring class.
                     Rarity edge outranks the generic occupied-brass edge. */
                  const slotCell = ({ k, label, iconSrc, onTap, active, equipped, equippedGlyph, quality }) => {
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
                        borderRadius: 4,
                        background: active ? COL.brassFill : COL.wellSoft,
                        border: godly ? '2px solid transparent'
                          : rarityEdge ? `2px solid ${rarityEdge}`
                          : active ? `1px solid rgba(216,168,95,.7)` : `1px solid ${COL.tileBor}`,
                        boxShadow: active && !rarityEdge && !godly ? 'inset 0 0 6px rgba(245,199,70,0.3)' : 'none',
                        cursor: onTap ? 'pointer' : 'default',
                        touchAction: 'none',
                        minWidth: 0,
                        minHeight: 0,
                        aspectRatio: '1 / 1',
                        /* v2.3.1238: owner feedback §2 — height-aware cap
                           (matches the bag tiles; see FIT_TILE_W). */
                        width: FIT_TILE_W,
                        justifySelf: 'center',
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
                          /* v2.3.1233: QA — "AMULET" spilled out of its old
                             ~35px square; 6.5px was the fit then.
                             v2.3.1235: Loadout is now the 38% column, so the
                             slots grew ~20% — but checkpoint review caught
                             "AMULE" clipped at 390×844 at 9px, and the T's
                             crossbar was STILL half-cut at 8.5px (verified
                             at 8× zoom). 8px + tight tracking finally fits
                             the full word on the narrowest supported phone
                             (11px floor waived for these placeholder tags;
                             clip is the backstop). */
                          /* v2.3.1236: owner feedback r2 §2 — Loadout back
                             to an equal third, so the slots are ~15%
                             narrower than the 38%-column squares that 8px
                             was measured against; scale the tag down the
                             same ratio (8 -> 7) so AMULET's T keeps its
                             crossbar at 390px.  overflow:hidden remains
                             the backstop. */
                          fontSize: 7,
                          letterSpacing: '-0.02em',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}>{label}</span>
                      )}
                    </div>
                  );
                  };
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
                     is a follow-up (see chat).  (v2.3.1236 r4 §2: restored
                     with the reinstated readout line.) */
                  const armorDef = (gearChestId !== 'none' ? 5 : 0) + (gearLegsId !== 'none' ? 5 : 0);
                  return (
                    /* v2.3.1069: the loadout is now ONE 3-row grid that mirrors
                       the quick-bag's 3x3 (same 3 columns, gridAutoRows:min-content
                       square cells, alignContent:center) so the two panels share
                       row geometry. */
                    /* v2.3.1236: owner feedback r2 §2+§4 — the row-1 data cell
                       felt awkward and kept the slots smaller than the bag
                       cells; the grid is the clean 3-col x 2-row slot block. */
                    /* v2.3.1236: owner feedback r3 §4 — geometry is
                       IDENTICAL to the bag grid by the numbers: 3 equal
                       columns, gap 4, padding 0 (each column carries the
                       2px horizontal inset), so at equal column widths a
                       loadout slot === a bag cell. */
                    /* v2.3.1236: owner feedback r4 §1+§2 — alignContent
                       'end' -> 'start' (both grids TOP-anchor now), and the
                       grid grows an explicit THIRD row that mirrors the
                       bag's: an invisible aspect-1/1 spacer cell sizes row 3
                       to exactly one slot height, so rows 1-3 here match the
                       bag's rows 1-3 by construction (same columns, gap,
                       padding, row-sizing rule).  The reinstated damage
                       readout spans that row, vertically centered — i.e.
                       level with the bag's third row. */
                    <div style={{
                      flex: 1,
                      minHeight: 0,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gridAutoRows: 'min-content',
                      alignContent: 'start',
                      gap: 4,
                      padding: 0,
                      /* v2.3.1238: owner feedback §2 — same height-aware
                         square-cell treatment as the bag grid (identical
                         formula + identical grid height = cell-size
                         parity by construction; the row-3 spacer keeps
                         the stat table inside the same 3-row budget). */
                      ...FIT_GRID_CONTAIN,
                    }}>
                      {/* The six equipment slots (Chest·Weapon·Shield
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
                        {slotCell({ k: 'weapon', label: 'WEAPON', iconSrc: slotIconSrc, active: !!wpn, onTap: onTapWeapon, quality: wpn && wpn.quality })}
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
                        {/* v2.3.1236: owner feedback r4 §2 — the damage
                            readout returns (r3 §1 removed the r2 text
                            footer; owner asked for a compact ICON line in
                            the freed third row).  Invisible square spacer
                            first: with gridAutoRows min-content it sizes
                            row 3 to one slot height — the exact height of
                            the bag's third row — so the line's band is
                            level with it by construction. */}
                        <div aria-hidden="true" style={{
                          gridRow: 3,
                          gridColumn: 1,
                          aspectRatio: '1 / 1',
                          minWidth: 0,
                          minHeight: 0,
                          pointerEvents: 'none',
                          /* v2.3.1238: owner feedback §2 — the spacer that
                             sizes row 3 shrinks with the cells so all
                             three rows fit the height budget. */
                          width: FIT_TILE_W,
                          justifySelf: 'center',
                        }} />
                        {/* One centered line spanning row 3:
                              [sword] 8-13  DPS 17.5  [shield] +10
                            The sword is the SAME asset melee damage popups
                            stamp on monsters (monsterCombat pushDmgPopup
                            iconKey:'sword' -> /icons/popups/sword.webp);
                            the shield is the popups-set partner (the
                            pre-v2.3.1224 Build DEF icon — full-bleed,
                            unlike the Bible combat-defense.webp with its
                            12% built-in margin).  Icons 13px (spec "~14"),
                            values 11/600 tabular #F4F0E7, tiny 9px muted
                            "DPS" text label (no icon exists for DPS).  The
                            "·" separators from the owner's sketch are
                            dropped to 3px gaps — the fit allowance he gave
                            for the ~112px inner column at 390px.  overflow
                            hidden + nowrap is the clip backstop.  The two
                            anchored tooltips are the r2 footer's own,
                            handler bodies byte-identical to c4a427b1. */}
                        {/* v2.3.1236: owner feedback r5 — the r4 one-liner
                            clipped on the owner's phone; his fix: reuse the
                            three slot columns as a mini stat table — DMG /
                            DPS / DEF headers with the values beneath, 1px
                            separators between the cells.  Same two anchored
                            tooltips (weapon tooltip on the DMG and DPS
                            cells, defense on DEF), bodies unchanged. */}
                        {/* v2.3.1237: owner feedback r6 — each stat sits under
                            the slot column it describes: DEF under column 1
                            (CHEST/LEGS armor), DPS under column 2 (WEAPON).
                            The damage range is dropped ("not necessary");
                            column 3 stays blank. */}
                        {[
                          ['DEF', `+${armorDef}`, 'def'],
                          ['DPS', dpsText, 'weapon'],
                        ].map(([hdr, val, kind], ci) => (
                          <div key={hdr}
                            onPointerUp={(e) => { e.stopPropagation(); setTooltip(kind === 'weapon' ? {
                                title: `DMG ${dmgText}`,
                                benefit: `${dpsText} damage per second (${slotLabel.toLowerCase()})`,
                                body: 'Tap the weapon slot to cycle melee → ranged → staff.',
                                anchor: e.currentTarget.getBoundingClientRect(),
                              } : {
                                title: `DEF +${armorDef}`,
                                benefit: `+${armorDef} defense from worn armor`,
                                body: 'Counts chest + legs pieces; armor damage mitigation is not wired up yet.',
                                anchor: e.currentTarget.getBoundingClientRect(),
                              }); }}
                            title={kind === 'weapon' ? `${slotLabel} · DMG ${dmgText} · DPS ${dpsText}` : 'Defense from worn armor'}
                            style={{
                              gridRow: 3,
                              gridColumn: ci + 1,
                              minWidth: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 2,
                              cursor: 'pointer',
                              touchAction: 'none',
                              borderLeft: ci > 0 ? '1px solid var(--ui-line)' : 'none',
                              overflow: 'hidden',
                            }}>
                            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', color: '#8D9B98' }}>{hdr}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#F4F0E7', whiteSpace: 'nowrap' }}>{val}</span>
                          </div>
                        ))}
                      </div>
                  );
                })()}
              </div>

              {/* v2.3.1236: owner feedback r2 §1 — full-height column divider. */}
              <div aria-hidden="true" style={{ flex: 'none', width: 1, alignSelf: 'stretch', background: 'var(--ui-line)' }} />

              {/* ── Right column — Stats + Life Skills merged.
                  v2.3.125: Build (5 char stats) and Life Skills (10) now
                  share one column as a 3-sub-col x 5-row grid.  Build
                  occupies sub-col 1; Life Skills fills sub-cols 2 and 3
                  (5 rows of 2 skills each).  Per-cell XP strip preserved. */}
              <div ref={buildColRef} data-tut="dash-build" style={{
                /* v2.3.1235: §4 widths — Build 31%, flat quiet readout. */
                /* v2.3.1236: owner feedback r2 §2 — equal third (this column
                   actually WIDENS, 31% -> 33.3%, so its 3x2 text cells gain
                   room; no inner-padding change needed). */
                flex: '1 1 0',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                /* v2.3.1236: owner feedback r3 §2 — symmetric minimal 2px
                   horizontal inset (matches Bag/Loadout); 4px vertical kept
                   as the shared bottom-padding for the §4 alignment. */
                padding: '4px 2px',
              }}>
                <ColHeader>{SHOW_LIFE_SKILLS ? 'Stats · Skills' : 'Build'}</ColHeader>
                {/* v2.3.1236: owner feedback r3 §4 — no alignment change
                    needed HERE for the line-up: flex:1 + 1fr rows mean this
                    grid fills the column's content area top-to-bottom, so
                    its top edge already sits where the bag/loadout grids
                    now START (r4 §1 flipped them to alignContent:'start')
                    and its bottom stays on the shared 4px column padding —
                    the band keeps one coherent top AND bottom edge. */}
                <div style={{
                  flex: 1,
                  display: 'grid',
                  /* v2.3.692: Build-only is a clean 3-col x 2-row grid filled
                     ROW-major (damage stats top, combat resources bottom).
                     With life skills shown, fall back to the old 3-col x 5-row
                     column-flow layout (Build in sub-col 1, skills in 2-3). */
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  /* v2.3.1236: owner feedback r5b — 1fr rows stretched this
                     grid over the full column height, so its cell content
                     floated LOWER than the top-packed Bag/Loadout rows.
                     min-content rows + alignContent start pack the two rows
                     at the top, level with the neighbors' first rows. */
                  gridTemplateRows: SHOW_LIFE_SKILLS ? 'repeat(5, 1fr)' : 'repeat(2, min-content)',
                  alignContent: SHOW_LIFE_SKILLS ? 'stretch' : 'start',
                  /* v2.3.1235: §4 — open grid: no gap, cells share faint
                     dividers instead of six individual dark cards. */
                  gap: SHOW_LIFE_SKILLS ? 2 : 0,
                  gridAutoFlow: SHOW_LIFE_SKILLS ? 'column' : 'row',
                  minHeight: 0,
                  /* v2.3.1238: owner feedback §3 — size container so the
                     stat cells (grown 6px by the reserved pill padding
                     below) can cap themselves at half the grid height on
                     short viewports instead of overflowing the band. */
                  ...(SHOW_LIFE_SKILLS ? {} : FIT_GRID_CONTAIN),
                }}>
                  {CHAR_STATS.map((s, bi) => {
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
                    let benefit = '';
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
                    /* v2.3.1235: batch-4 state-correction §2 — bonusTxt/
                       tipFull prose replaced by the structured tooltip's
                       three parts: title `${label} ${val}`, this benefit
                       line (same live formulas as before), and the short
                       s.train sentence.  Defense has no live coefficient
                       to print, so it gets the effect phrase, no number. */
                    if (s.key === 'vitality')       benefit = `${R.maxHp || calcMaxHp(R.level || 1, val)} max HP`;
                    else if (s.key === 'endurance') benefit = `${R.maxStamina || calcMaxStam(val)} max stamina`;
                    else if (s.key === 'power')     benefit = `+${(val * 0.1667).toFixed(1)} base melee damage`;
                    else if (s.key === 'agility')   benefit = `+${(val * 0.1667).toFixed(1)} base bow damage`;
                    else if (s.key === 'mind')      benefit = `+${(val * 0.1667).toFixed(1)} base magic damage`;
                    else if (s.key === 'defense')   benefit = 'Stronger blocks + damage reduction';
                    const tipTitle = `${s.label} ${val}`;
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
                            /* v2.3.1235: batch-4 state-correction §2 —
                               structured tooltip anchored to this cell. */
                            setTooltip({
                              title: tipTitle,
                              benefit,
                              body: s.train,
                              anchor: e.currentTarget.getBoundingClientRect(),
                            });
                          }
                        }}
                        title={`${tipTitle} — ${benefit}. ${s.train}`}
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
                          /* v2.3.1238: owner feedback §3 — the value text
                             sat on padding-bottom 2 while the 4px XP pill
                             floats absolute at bottom 2..6, so the digits'
                             descender box dipped ~1px INTO the pill.
                             Reserve the pill's zone instead: 8px bottom
                             padding = pill (2+4) + 2px clearance, so text
                             and pill can never overlap. */
                          padding: '2px 4px 8px',
                          /* v2.3.1238: owner feedback §3 — cap at half the
                             (gap-0) 2-row grid so the 6px growth doesn't
                             overflow short viewports; the icon is the
                             shrink absorber (flexShrink 1, v2.3.1225).
                             -1px absorbs the row-1 cells' bottom border. */
                          maxHeight: SHOW_LIFE_SKILLS ? undefined : 'calc(50cqh - 1px)',
                          /* v2.3.1235: §4 — OPEN cells: no fill, no card
                             border; faint shared dividers between cells
                             (right edge on cols 1-2, bottom edge on row 1
                             of the 3x2 build grid). */
                          background: 'transparent',
                          borderRight: (!SHOW_LIFE_SKILLS && bi % 3 !== 2) ? `1px solid ${COL.divider}` : 'none',
                          borderBottom: (!SHOW_LIFE_SKILLS && bi < 3) ? `1px solid ${COL.divider}` : 'none',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          touchAction: 'none',
                          minHeight: 0,
                        }}>
                        {unspentPts > 0 && (
                          <span style={{
                            position: 'absolute', top: 1, right: 2,
                            background: '#D8A85F', color: '#20170D',
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
                        {/* v2.3.1235: §3 key numbers — 16/700 tabular. */}
                        <span style={{ color: COL.text, fontWeight: 700, fontSize: 16, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{val}</span>
                        <div style={{
                          position: 'absolute',
                          /* v2.3.1236: owner feedback r3 §3 — the strip ran
                             edge-to-edge and read as cut off.  Now a
                             contained pill: inset 15% each side (~70% width,
                             centered), lifted 2px off the cell bottom,
                             borderRadius 999 + overflow hidden so the fill
                             clips to the pill's rounded ends. */
                          left: '15%', right: '15%', bottom: 2,
                          /* v2.3.1236: owner dashboard feedback §5 — XP
                             strip 2 -> 4px so progress is noticeable. */
                          height: 4,
                          borderRadius: 999,
                          overflow: 'hidden',
                          background: '#0B1216',
                          pointerEvents: 'none',
                        }}>
                          <div style={{
                            width: pct + '%',
                            height: '100%',
                            borderRadius: 999,
                            background: '#D8A85F',
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
                          background: COL.wellSoft,
                          border: `1px solid ${COL.tileBor}`,
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
                          /* v2.3.1236: owner feedback r3 §3 — same contained
                             pill as the Build strips (this branch is dormant
                             while SHOW_LIFE_SKILLS is false; kept in step so
                             flipping the flag doesn't resurrect the old
                             edge-to-edge look). */
                          left: '15%', right: '15%', bottom: 2,
                          /* v2.3.1236: owner dashboard feedback §5 — XP
                             strip 2 -> 4px so progress is noticeable. */
                          height: 4,
                          borderRadius: 999,
                          overflow: 'hidden',
                          background: '#0B1216',
                          pointerEvents: 'none',
                        }}>
                          <div style={{
                            width: sPct + '%',
                            height: '100%',
                            borderRadius: 999,
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

        </>
      )}

      {/* Icon row — bottom 30% of dashboard.  v2.3.1227: separate
          darkest navigation shelf (Lantern Slate §9).  v2.3.1229: now
          PERSISTENT — it renders in panel mode too, with the active
          destination lit (brass plate + top line); tapping the lit icon
          toggles back to the dashboard.  rootId (stack[0]) keeps More
          lit while one of its children (Settings, Stats, ...) is open. */}
      {(() => {
        const rootId = stack.length ? stack[0] : null;
        const moreLit = !!rootId && !['inventory', 'social', 'encyclopedia', 'journey'].includes(rootId);
        return (
          <div style={{
            /* v2.3.1229b: fixed 68px shelf in panel mode (30% of the
               grown band would balloon); 30% of the resting 28vh band
               ≈ the same 68px, so the shelf never visibly jumps. */
            height: active ? 68 : '30%',
            minHeight: 56,
            flex: '0 0 auto',
            borderTop: `1px solid ${COL.divider}`,
            /* v2.3.1235: §5 — flat darkest toolbar shelf. */
            background: 'var(--ui-toolbar)',
            display: 'flex',
            alignItems: 'stretch',
          }}>
            <IconButton glyph="inventory" label="Bag" active={rootId === 'inventory'}
              onClick={() => dashboardPanelBus.toggle('inventory')} />
            <IconButton glyph="friends"   label="Friends" active={rootId === 'social'}
              onClick={() => dashboardPanelBus.toggle('social')} />
            <IconButton glyph="codex"     label="Codex" active={rootId === 'encyclopedia'}
              onClick={() => dashboardPanelBus.toggle('encyclopedia')} />
            <IconButton glyph="journey"   label="Journey" active={rootId === 'journey'}
              onClick={() => dashboardPanelBus.toggle('journey')} />
            {/* v2.3.1015: Chat replaces Map in the toolbar — TOGGLES the
                over-head chat bubble (ChatBubble.jsx): tap to open, tap again
                to close.  v2.3.1225: UI Bible panel-chat icon replaces the
                placeholder inline SVG. */}
            <IconButton glyph="chat" label="Chat" tut="dash-chat"
              active={chatBubbleBus.open}
              onClick={() => {
                /* v2.3.1235: §7 Chat state fix — opening Chat dismisses
                   any open destination sheet so the composer shows over
                   the world/HUD with only Chat marked active (it used
                   to open ON TOP of e.g. the Journey panel). */
                const opening = !chatBubbleBus.open;
                chatBubbleBus.toggle();
                if (opening) dashboardPanelBus.clear();
              }} />
            <IconButton glyph="more"      label="More" tut="dash-more" active={moreLit}
              onClick={() => dashboardPanelBus.toggle('more')} />
          </div>
        );
      })()}
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
