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
import { BAR_H, compactDashHeight, expandedSheetHeight } from './sheet/sheetGeometry.js'; /* v2.3.1283; v2.3.1290 three-state */
import { sheetTransition } from './sheet/motion.js';            /* v2.3.1283 */
import { useSheetDrag } from './sheet/useSheetDrag.js';         /* v2.3.1283 */
import { BagCompact } from './sheet/BagCompact.jsx';            /* v2.3.1285 */
import { HeroCompact } from './sheet/HeroCompact.jsx';          /* v2.3.1286 */
import { HeroExpanded } from './sheet/HeroExpanded.jsx';        /* v2.3.1286 */
import { SkillsCompact } from './sheet/SkillsCompact.jsx';      /* v2.3.1286 */
import { FriendsCompact } from './sheet/FriendsCompact.jsx';    /* v2.3.1288 */
import { QuestsCompact } from './sheet/QuestsCompact.jsx';      /* v2.3.1288 */
import { MoreCompact } from './sheet/MoreCompact.jsx';          /* v2.3.1288 */
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
import { QuestsPanel }        from './dash/QuestsPanel.jsx';
import { T2Panel, requestT2Category } from './dash/T2Panel.jsx';
import { SpendPointConfirm }   from './dash/SpendPointConfirm.jsx';

// Bottom-of-screen dashboard.  Replaces the radial UtilityWheel.
// When idle it renders the Bag / Loadout / Build overview above a
// persistent 6-destination navigation ribbon.  Opening a destination
// grows the band into a sheet while the ribbon remains available.

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
  /* v2.3.1265: Quests joins the ribbon (5-button toolbar). */
  quests:    '/icons/ui/panel-quests.webp?v=2.3.1224',
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
/* v2.3.1287: CHAR_STATS moved to sheet/heroModel.js (COMBAT_SKILLS);
   the life-skills roster to sheet/skillsModel.js. */

/* Dashboard now focuses on the build/combat stats; the life-skills grid is
   hidden behind this flag (flip to true to restore the 10-skill column). */


// Tiny column-header used at the top of each of the three dashboard
// columns.  Centered above its column.
/* v2.3.1249: owner — panel-header TEXTURES only, with everything else
   (spacing, alignment, type) untouched.  `variant` paints a raster
   texture cap (real material cropped from the owner's approved mockup;
   classes in game.css) behind the existing title.  FLOW-NEUTRAL by
   construction: the negative margins are exactly cancelled by added
   padding (top −4+4, sides −4+(2+4), bottom unchanged), so the title
   glyphs and every sibling stay at the same pixel; the cap just paints
   edge-to-edge through the column's 4px inset.  Verified by pixel-diff
   against the pre-change build. */
/* v2.3.1287: ColHeader retired with the 3-panel row (headers left the
   band in v2.3.1280; the sheet header strip is the one title now). */

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
          /* v2.3.1290: toast docks above the OPEN sheet (--sheet-h is
             the live snap height stamped by the dashboard), not the
             resting bar — tips fire from panel content. */
          bottom: 'calc(var(--sheet-h, var(--dash-h)) + 12px)',
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
    ? { left, bottom: 'calc(var(--sheet-h, var(--dash-h)) + 12px)' } /* v2.3.1290 */
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
   ControlsTutorial can getBoundingClientRect() the real button.
   v2.3.1289: `snap` (owner request) — the ACTIVE destination shows a
   small brass chevron in its top-right corner: pointing up while
   compact ("tap to expand"), rotating to point down while expanded
   ("tap to collapse").  Matches the swipe direction, so the one glyph
   teaches both the tap toggle and the drag gesture. */
const IconButton = ({ glyph, src: srcProp, label, active, onClick, node, tut, snap }) => {
  /* v2.3.1283: destinations pass an explicit `src`; `glyph` (ICON_SRC
     lookup) stays for any legacy caller. */
  const src = srcProp || ICON_SRC[glyph];
  const [pressed, setPressed] = useState(false);
  // Use onPointerUp instead of onClick so iOS fires it even when
  // another finger is mid-drag on a joystick.  stopPropagation
  // prevents the event reaching the dashboard's outer pointerdown
  // handler (which only stops further bubbling, not local).
  const fire = (e) => {
    e.stopPropagation();
    setPressed(false);
    onClick && onClick();
  };
  /* v2.3.1240: the toolbar is one dark navigation ribbon, but every
     destination gets a one-pixel micro-bevel so its hit area reads as a
     button.  The selected destination reverses that bevel (pressed) and
     gains the focus-ring edge.  The default dashboard has no selected
     toolbar destination. */
  return (
    <button
      type="button"
      onPointerUp={fire}
      onPointerDown={(e) => { e.stopPropagation(); setPressed(true); }}
      onPointerCancel={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      data-tut={tut}
      aria-label={label}
      aria-pressed={active}
      data-pressed={pressed ? 'true' : 'false'}
      className="bt-dashboard-nav-button"
    >
      <span className="bt-dashboard-nav-icon">
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
      <span className="bt-dashboard-nav-label">{label}</span>
      {active && snap && (
        <span className="bt-nav-snap" data-expanded={snap === 'expanded' ? 'true' : 'false'} aria-hidden="true">
          <svg viewBox="0 0 12 12" width="12" height="12">
            <path d="M2.5 7.5 L6 4 L9.5 7.5" stroke="currentColor" strokeWidth="1.8"
              fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </button>
  );
};

// Map of panel id → { title, Component }.  Children pushed onto the stack
// from MorePanel use the same registry, which is why MorePanel doesn't
// hard-code its child component refs.
/* v2.3.1285: InventoryPreview (the quick-bag card) retired — BagCompact
   (sheet/BagCompact.jsx) is the home view now. */
const PANELS = {
  /* v2.3.1240: Bag is the always-on quick preview; Inventory is the
     deeper toolbar destination that opens the full item surface. */
  inventory:    { title: 'Inventory',   Component: InventoryPanel },
  self:         { title: 'Self',        Component: SelfPanel },
  journey:      { title: 'Journey',     Component: JourneyPanel },
  /* v2.3.1265: Quests toolbar destination — read-only quest log. */
  quests:       { title: 'Quests',      Component: QuestsPanel },
  map:          { title: 'Map',         Component: MapPanel },
  /* v2.3.1291 (ChatGPT round-3 §1): the tab says Friends, so the header
     says Friends — one name everywhere (the panel id stays 'social' on
     the wire-free client side; renaming ids resets nothing). */
  social:       { title: 'Friends',     Component: SocialPanel },
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
  /* v2.3.1283: nav-system destination roots.  v2.3.1286: Hero gets its
     dedicated expanded sheet.  v2.3.1291 (ChatGPT round-3 §1): Hero
     OWNS identity/stats/build now — the Self and Stats tiles left the
     More launcher; their PANELS entries stay only so stale drill ids
     in old sessions don't render a blank sheet. */
  bag:          { title: 'Bag',         Component: InventoryPanel },
  hero:         { title: 'Hero',        Component: HeroExpanded },
};

/* v2.3.1283: the six toolbar destinations (nav-system spec).  Chat left
   the toolbar (owner) — the composer opens by tapping your own
   character in the world (BroTown self-tap gate).
   v2.3.1288 (PR B): every destination has a compact view now — the
   `compact:false` promotion flag and the compactless registration are
   gone (the bus keeps the mechanism, registered empty). */
const DESTINATIONS = [
  { id: 'bag',    label: 'Bag',     icon: '/icons/ui/nav-inventory.webp?v=2.3.1224' },
  { id: 'hero',   label: 'Hero',    icon: '/icons/ui/panel-self.webp?v=2.3.1224' },
  { id: 'skills', label: 'Skills',  icon: '/icons/ui/panel-skills.webp?v=2.3.1224' },
  { id: 'social', label: 'Friends', icon: '/icons/ui/nav-friends.webp?v=2.3.1224' },
  { id: 'quests', label: 'Quests',  icon: '/icons/ui/panel-quests.webp?v=2.3.1224' },
  { id: 'more',   label: 'More',    icon: '/icons/ui/nav-more.webp?v=2.3.1224' },
];

/* v2.3.1288: PR B — the rootId ternary chain in the render became this
   registry the moment it hit six entries. */
const COMPACT_VIEWS = {
  bag:    BagCompact,
  hero:   HeroCompact,
  skills: SkillsCompact,
  social: FriendsCompact,
  quests: QuestsCompact,
  more:   MoreCompact,
};

export const BottomDashboard = () => {
  const [, force] = useState(0);
  const [tooltip, setTooltip] = useState('');
  const dashRef = useRef(null);
  /* v2.3.1025: the BUILD/stats column rect -- the loadout equip picker docks
     over it (to the right of the loadout cells) so switching categories never
     moves the menu or covers the loadout, and it can't exceed the dashboard. */
  useEffect(() => {
    const id = setInterval(() => force(v => v + 1), 200);
    return () => clearInterval(id);
  }, []);
  /* v2.3.1235: batch-4 state-correction §2 — an anchored stat tooltip
     must not linger over a freshly opened panel: clear it on every
     panel-bus event (it did NOT clear before; only the 3s timer did). */
  useEffect(() => dashboardPanelBus.subscribe(() => { setTooltip(''); force(v => v + 1); }), []);
  /* v2.3.1288: PR B — stamp the snap mode on <html> so pure CSS can dim
     the floating combat chrome (joystick discs + charge pie) while a
     sheet is open; rules live in game.css next to .bt-joystick-zone.
     CSS-driven so the dim never depends on those overlays re-rendering.
     v2.3.1290: also stamp --sheet-h (the sheet's CURRENT snap height in
     px) — overlays that dock above the OPEN sheet (the legacy tooltip
     toast) anchor to it, while world chrome keeps var(--dash-h). */
  useEffect(() => {
    const stamp = () => {
      const mode = dashboardPanelBus.state.mode;
      document.documentElement.dataset.btSheet = mode;
      const px = mode === 'expanded' ? snapPxRef.current.expanded
        : mode === 'compact' ? snapPxRef.current.compact
        : BAR_H;
      document.documentElement.style.setProperty('--sheet-h', px + 'px');
    };
    stamp();
    const unsub = dashboardPanelBus.subscribe(stamp);
    return () => {
      delete document.documentElement.dataset.btSheet;
      document.documentElement.style.removeProperty('--sheet-h');
      unsub();
    };
  }, []);
  /* v2.3.1283: snap heights — compact and expanded recomputed on
     viewport changes with the same iOS-keyboard guard the canvas resize
     uses: when the keyboard shrinks visualViewport, HOLD the last value
     so the sheet doesn't jump under the chat composer.  v2.3.1290:
     compact joins expanded as React state (it's an overlay snap now,
     not the resting --dash-h). */
  const [snapPx, setSnapPx] = useState(() => ({
    compact: compactDashHeight(window.innerWidth),
    expanded: expandedSheetHeight(window.innerWidth, window.innerHeight),
  }));
  useEffect(() => {
    const vv = window.visualViewport;
    const recompute = () => {
      const vw = vv ? vv.width : window.innerWidth;
      const vh = vv ? vv.height : window.innerHeight;
      if (vv && window.innerHeight - vh > 100) return; /* keyboard up */
      setSnapPx({ compact: compactDashHeight(vw), expanded: expandedSheetHeight(vw, vh) });
    };
    recompute();
    window.addEventListener('resize', recompute);
    if (vv) vv.addEventListener('resize', recompute);
    return () => {
      window.removeEventListener('resize', recompute);
      if (vv) vv.removeEventListener('resize', recompute);
    };
  }, []);
  /* v2.3.1283: swipe gestures between snaps (spec §Direct manipulation);
     v2.3.1290: three snaps.  Getters read the ref so a drag
     mid-rotation still clamps correctly. */
  const snapPxRef = useRef(snapPx);
  snapPxRef.current = snapPx;
  useSheetDrag(dashRef,
    () => BAR_H,
    () => snapPxRef.current.compact,
    () => snapPxRef.current.expanded);
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
  /* v2.3.1283: two snap points.  `active` (the expanded panel) is only
     truthy in expanded mode — compact renders the destination's compact
     view with no header chrome (spec: compact views are glanceable,
     label-free). */
  const mode = dashboardPanelBus.state.mode;
  const rootId = dashboardPanelBus.root();
  const activeId = stack.length ? stack[stack.length - 1] : null;
  const active = mode === 'expanded' ? (PANELS[activeId] || PANELS[rootId] || PANELS.bag) : null;

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
      className="bt-dashboard"
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        /* v2.3.1283: ONE bottom sheet.  v2.3.1290 (owner): THREE snap
           points — bar (var(--dash-h) = the 72px toolbar shelf, the
           resting default; canvas/zones/HUD all key off it), compact
           (glance), expanded (detail).  Every destination uses the same
           snaps.  220ms token; reduced-motion drops the transition. */
        height: mode === 'expanded' ? snapPx.expanded + 'px'
          : mode === 'compact' ? snapPx.compact + 'px'
          : 'var(--dash-h)',
        transition: sheetTransition(),
        /* v2.3.1240: surface, rounded top edge, and crisp contact shadow
           live in .bt-dashboard so the mockup recipe stays testable in
           CSS instead of being split across inline declarations. */
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
      {/* v2.3.1283: drag affordance (spec: subtle, must not consume
          content height) — absolutely positioned over the band's top
          edge so the compact height budget is untouched.  v2.3.1290:
          hidden in bar mode (nothing to drag — the resting band is all
          toolbar; destinations open by tap). */}
      {mode !== 'bar' && (
        /* v2.3.1293 (round-3 §5): bigger visible handle (44x5) — the
           drag itself works anywhere on non-scrolling chrome, so the
           whole top strip already exceeds a 44px hit area; the visual
           just needed to look grabbable. */
        <div aria-hidden="true" style={{
          position: 'absolute',
          top: 4,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 44,
          height: 5,
          borderRadius: 3,
          background: 'rgba(229,237,233,.28)',
          pointerEvents: 'none',
        }} />
      )}
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
                panel title reads consistently. */}
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
            {/* v2.3.1290 (ChatGPT round-3 §5): the header chip is a
                DOWN CHEVRON, not an × — this control steps the sheet
                down to the destination's compact view, it doesn't
                dismiss anything.  × stays reserved for true popovers
                (item card, inspect). */}
            <button
              aria-label="Collapse"
              onPointerUp={(e) => { e.stopPropagation(); dashboardPanelBus.stepDown(); }}
              style={chipStyle}
            >
              <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true">
                <path d="M2.5 4.5 L6 8 L9.5 4.5" stroke="currentColor" strokeWidth="1.8"
                  fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          {/* v2.3.1229: panels render in a flex body ABOVE the persistent
              toolbar (spec §9: the toolbar stays visible in panel mode;
              its lit item identifies the panel; tapping it again = home). */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {Active && <Active />}
          </div>
        </>
      ) : mode === 'compact' ? (
        /* v2.3.1288 (PR B): all six destinations render their compact
           view from the COMPACT_VIEWS registry. */
        (() => { const CompactView = COMPACT_VIEWS[rootId] || BagCompact; return <CompactView />; })()
      ) : null /* v2.3.1290: bar mode — toolbar only, the game's resting
           default (owner: maximum world visibility). */}

      {/* Navigation ribbon.  v2.3.1229: PERSISTENT in both modes.
          v2.3.1283 (nav-system): SIX destinations, each always one of
          the DESTINATIONS roots; the active root carries the brass edge
          in BOTH snap modes (Bag is selected at rest — there is no
          "nothing selected" state anymore).  Tap semantics live in
          dashboardPanelBus.tapDestination: inactive -> compact, active
          -> expanded/compact toggle.  rootId (stack[0]) keeps a
          destination selected while one of its drill children
          (Settings, T2, ...) is open. */}
      {(() => {
        const knownRoots = DESTINATIONS.map(d => d.id);
        /* v2.3.1290: bar mode = NOTHING lit — the resting state has no
           open destination (the remembered root only matters for
           resume, not for display). */
        const litId = mode === 'bar' ? null
          : knownRoots.includes(rootId) ? rootId
          /* legacy drill roots (inventory push, tutorial ids...) light More */
          : (rootId ? 'more' : 'bag');
        return (
          <div className="bt-dashboard-toolbar-frame" style={{
            /* v2.3.1229b: fixed 68px shelf in panel mode (30% of the
               grown band would balloon); 30% of the resting 28vh band
               ≈ the same 68px, so the shelf never visibly jumps. */
            /* v2.3.1241: edge-parity — the RESTING shelf is now a fixed 68
               (was '30%' of the fractional band), so the ribbon frame never
               lands on a sub-pixel vertical coord that would resample its
               contour on Retina.  Panel mode was already 68. */
            /* v2.3.1258: 68 -> 72 — the taller-dashboard pass adds 4px of
               breathing room between the panels and the nav row via the
               frame's top padding; the shelf grows by the same 4 so the
               ribbon (and the buttons' rendered height) stay EXACTLY as
               before.  A fixed +4 inside the fixed shelf would instead
               squeeze the buttons to their 44px floor and clip the labels
               (caught on the rig). */
            height: 72,
            minHeight: 56,
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'stretch',
          }}>
            {/* v2.3.1283: owner — SIX buttons (Bag · Hero · Skills ·
                Friends · Quests · More).  Chat left the toolbar: the
                composer opens by tapping your own character (the
                over-head bubble flow is otherwise unchanged).  Hero and
                Skills reuse panel-self/panel-skills art until dedicated
                nav-* icons are generated. */}
            <div className="bt-dashboard-toolbar-ribbon">
              {DESTINATIONS.map(d => (
                <IconButton key={d.id} src={d.icon} label={d.label}
                  tut={d.id === 'more' ? 'dash-more' : undefined}
                  active={litId === d.id}
                  snap={litId === d.id ? mode : null}
                  onClick={() => dashboardPanelBus.tapDestination(d.id)} />
              ))}
            </div>
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
