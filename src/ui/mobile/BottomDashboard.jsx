import React, { useEffect, useRef, useState } from 'react';
/* v2.3.1236: owner feedback r4 §2 — WEAPON_TYPES / calcDisplayDmgRange /
   calcDisplayDps return to this import (r3 §1 had dropped them with the
   DMG/DPS/DEF footer): the readout is reinstated as the icon-based line
   in the Loadout column's freed third row. */
import { xpRequired, calcMaxHp, calcMaxStam, calcMaxMana, calcCritChance, calcBlockReduction, getDefenseBlockBonus, WEAPON_TYPES, getActiveWeapon, getWeaponCritStat, STAT_TO_WEAPON_CAT, calcDisplayDmgRange, calcDisplayDps } from '../../data/gameSystems.js';
import { skillXpRequired } from '../../data/items.js';
import { ZONES } from '../../data/zones.js';
import { portraitDataUrl } from '../../rendering/characterPortrait.js';
import { getSkin, getPants, getShoes, onSkinChange, onPantsChange, onShoesChange } from '../../rendering/playerSkins.js';
import { getHair, onHairChange } from '../../rendering/traits/hairCatalog.js';
import { getHairColor, hairColorTarget, onHairColorChange } from '../../rendering/traits/hairColorCatalog.js';
import { getHatColor, hatColorTarget, onHatColorChange } from '../../rendering/traits/hatColorCatalog.js';
import { getFacialHair, onFacialHairChange } from '../../rendering/traits/facialHairCatalog.js'; /* v2.3.1835: the beard STYLE was never subscribed */
import { getFacialHairColor, facialHairColorTarget, onFacialHairColorChange } from '../../rendering/traits/facialHairColorCatalog.js';
import { getHeadwear, onHeadwearChange } from '../../rendering/traits/headwearCatalog.js';
import { getShirt, onShirtChange } from '../../rendering/traits/shirtCatalog.js';
import { getShirtColor, shirtColorTarget, onShirtColorChange } from '../../rendering/traits/shirtColorCatalog.js';
import { getEyeColor, onEyeColorChange } from '../../rendering/traits/eyeColorCatalog.js'; /* v2.3.1928 */
import { getEquip } from '../../rendering/gearCatalog.js';
import { dashboardPanelBus } from './dashboardPanelBus.js';
import { expandedSheetHeight, drillSheetHeight, dashPanelWidths, DASH_GAP, bandFootprint, LAND_NAV_BTN_W, landscapeNavGroupW, landscapeSheetW, identityRowHeight, LAND_FOLD_CHIP_W, landDockFootprint } from './sheet/sheetGeometry.js'; /* v2.3.1283; v2.3.1350 two-state; v2.3.1311e drill height; v2.3.2197 barHeight left with the --sheet-h formula; v2.3.2157 the sideways band; v2.3.2166 the nav dock; v2.3.2168 the barless landscape */
import { DashColumns } from './dash/DashColumns.jsx';           /* v2.3.1636 */
import { NavRail } from './dash/NavRail.jsx';                   /* v2.3.1637 */
import { portraitStore } from './sheet/portraitStore.js';          /* v2.3.1294 */
import { hasUnseenLevelUps } from './sheet/skillsModel.js';        /* v2.3.1296 */
import { getFriendRows } from './sheet/friendsModel.js';           /* v2.3.1323 */
import { friendsSrv } from './sheet/friendsSync.js';               /* v2.3.1324 */
import { readyQuestCount } from './sheet/questModel.js';           /* v2.3.1298 */
import { sheetTransition } from './sheet/motion.js';            /* v2.3.1283 */
import { bagUnseen, bagEntryKey } from './sheet/bagUnseenModel.js'; /* v2.3.1312 */
import { COMBAT_SKILLS, unspentPointsTotal } from './sheet/heroModel.js'; /* v2.3.1311: hero toolbar badge; v2.3.1635: shared unspent total */
import { IdentityStrip } from './sheet/IdentityStrip.jsx';      /* v2.3.1635: persistent identity row */
import { HeroExpanded } from './sheet/HeroExpanded.jsx';        /* v2.3.1286 */
import { InventoryPanel }              from './dash/InventoryPanel.jsx';
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
import { QuestDetailPanel }   from './dash/QuestDetailPanel.jsx'; /* v2.3.1298 */
import { T2Panel, requestT2Category } from './dash/T2Panel.jsx';
import { SpendPointConfirm }   from './dash/SpendPointConfirm.jsx';
import { playVw, playVh, playIsLandscape } from './playViewport.js'; /* v2.3.2157: the band has a sideways shape */
import { dashMinBus } from './dashMinBus.js';
import { stampSheetH, unstampSheetH } from './sheetStamp.js'; /* v2.3.2197: one --sheet-h formula, shared with resize() + the watchdog */ /* v2.3.2119: fold the band to the identity row */

// Bottom-of-screen dashboard.  Replaces the radial UtilityWheel.
// Opening a destination grows the band into a sheet while the ribbon
// remains available.
/* v2.3.1636: this header described the pre-v2.3.1287 "Bag / Loadout /
   Build overview" for ~350 versions after that row was deleted.  The
   resting band is now THREE pinned rows, top to bottom:
     identity row   IdentityStrip band  (v2.3.1635) -- 52px
     columns row    DashColumns         (v2.3.1636) -- 133px
     nav ribbon     the 6 destinations              -- 87px
   The columns row is the old three-column overview restored at the
   owner's request, renamed BAG / EQUIPPED / COMBAT.  Keep this list
   honest -- it is the first thing anyone reads about this file. */

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

/* v2.3.1294: BAR_IMG + the Bar capsule component retired — the last
   consumers (three-panel dashboard bars, then the identity card) are
   gone.  The PNGs stay in public/icons/ui/ for stale-cached bundles. */

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
   band in v2.3.1280; the sheet header strip is the one title now).
   v2.3.1636: column headers are BACK in the band with the three-column
   row, but they are NOT this component — DashColumns renders its own
   plain bgStrong strip.  This one carried the v2.3.1249 raster texture
   caps, which Lantern Slate no longer uses; it stays retired. */

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
  const vw = playVw();   /* v2.3.1715: the shell, not the window */
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

/* v2.3.1205: `tut` = optional data-tut anchor id so the live-DOM
   ControlsTutorial can getBoundingClientRect() the real button.
   v2.3.1289: `snap` (owner request) — the ACTIVE destination shows a
   small brass chevron in its top-right corner: pointing up while
   compact ("tap to expand"), rotating to point down while expanded
   ("tap to collapse").  Matches the swipe direction, so the one glyph
   teaches both the tap toggle and the drag gesture. */
/* v2.3.1296: `dot` (round-5 notifications) — a small brass dot on the
   button's top-LEFT (the chevron owns top-right) for ACTIONABLE state
   only: unviewed skill level-ups, ready quest turn-ins.  Never for
   routine churn like XP gains or friends-online counts. */
/* v2.3.1318 (owner: touch/swipe conflicts resolve to THIS session):
   `onSwipe` returns — vertical swipes ON a toolbar icon are classified
   here at pointer-up (|dy| >= 24px and |dy| > 1.5·|dx| reads as a
   swipe; anything smaller stays a tap) and routed to the bus's
   discrete advance/retreat, which enforce open-compact-on-inactive
   and no-op-on-foreign-retreat.  Replaces #285/#288's ribbon-bound
   useSheetDrag (deleted with its __btNavSwipeTs tap swallow — the
   classifier IS the tap/swipe decision now).  Pointer capture keeps
   the up event on the button when the finger drifts off mid-swipe.
   v2.3.1311 (#288): a NUMBER `dot` renders as a count badge (Hero's
   unspent points); `true` keeps the notification dot.
   `pulse` (round-8 §Badges) — an epoch counter; each bump remounts the
   icon span (key) to replay one restrained scale pulse (CSS
   .bt-nav-pulse, reduced-motion guarded). */
const IconButton = ({ glyph, src: srcProp, label, active, onClick, onSwipe, node, tut, snap, dot, pulse }) => {
  /* v2.3.1283: destinations pass an explicit `src`; `glyph` (ICON_SRC
     lookup) stays for any legacy caller. */
  const src = srcProp || ICON_SRC[glyph];
  const [pressed, setPressed] = useState(false);
  const gestureStart = useRef(null);
  // Use onPointerUp instead of onClick so iOS fires it even when
  // another finger is mid-drag on a joystick.  stopPropagation
  // prevents the event reaching the dashboard's outer pointerdown
  // handler (which only stops further bubbling, not local).
  const fire = (e) => {
    e.stopPropagation();
    setPressed(false);
    const s = gestureStart.current;
    gestureStart.current = null;
    if (s && onSwipe) {
      const dy = e.clientY - s.y;
      const dx = e.clientX - s.x;
      if (Math.abs(dy) >= 24 && Math.abs(dy) > Math.abs(dx) * 1.5) {
        onSwipe(dy < 0 ? 'up' : 'down');
        return;
      }
    }
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
      onPointerDown={(e) => {
        e.stopPropagation();
        setPressed(true);
        gestureStart.current = { x: e.clientX, y: e.clientY };
        /* Without capture a swipe whose finger leaves the button never
           delivers pointerup here and the gesture dies silently. */
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
      }}
      onPointerCancel={() => { setPressed(false); gestureStart.current = null; }}
      onPointerLeave={() => setPressed(false)}
      data-tut={tut}
      aria-label={label}
      aria-pressed={active}
      data-pressed={pressed ? 'true' : 'false'}
      className="bt-dashboard-nav-button"
    >
      {/* v2.3.1326 (owner correction of v2.3.1325): classic 30px icon +
          text label restored — only the BUTTON grew (the shelf keeps the
          slot-derived height, so the tiles are taller touch targets). */}
      <span className={'bt-dashboard-nav-icon' + (pulse ? ' bt-nav-pulse' : '')} key={pulse || 0}>
        {node ? node : (
          <img
            src={src}
            alt={label}
            draggable={false}
            style={{ objectFit: 'contain', imageRendering: 'auto' }}
          />
        )}
      </span>
      <span className="bt-dashboard-nav-label">{label}</span>
      {/* v2.3.1311: a NUMBER dot renders as a count badge (the Hero
          icon's global unspent points — spec: badge only actionable
          things); `true` keeps the original notification dot.
          v2.3.1323: 'online' renders the dot in presence GREEN — the
          Friends icon's "someone is online" signal (never a count). */}
      {typeof dot === 'number' && dot > 0 ? (
        <span aria-hidden="true" style={{
          position: 'absolute', top: 2, left: 4,
          background: '#D8AA58', color: '#20170D',
          fontSize: 10, fontWeight: 900,
          borderRadius: 7, padding: '0 4px', lineHeight: 1.4,
          border: '1px solid rgba(0,0,0,.5)',
          pointerEvents: 'none',
        }}>{dot}</span>
      ) : (dot === true || dot === 'online') ? (
        <span aria-hidden="true" style={{
          position: 'absolute', top: 4, left: 6,
          width: 8, height: 8, borderRadius: '50%',
          background: dot === 'online' ? '#55B98A' : '#D8AA58',
          border: '1px solid rgba(0,0,0,.5)',
          pointerEvents: 'none',
        }} />
      ) : null}
      {/* v2.3.1314 (owner round-8b): state-aware chevrons — ONE chevron
          per available step, shown only while a view is open (never at
          bar).  v2.3.1350 (two-state): expanded is the only open state,
          so the active destination shows a single down chevron (bar is
          the one step down).  The gentle bob animation reads as
          "swipeable"; direction matches both the icon swipe and the
          tap toggle. */}
      {active && snap === 'expanded' && (
        <span className="bt-nav-snap" aria-hidden="true">
          <svg className="bt-nav-snap-down" viewBox="0 0 12 7" width="11" height="6">
            <path d="M2 1.5 L6 5.5 L10 1.5" stroke="currentColor" strokeWidth="1.8"
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
  /* v2.3.1265: Quests toolbar destination — read-only quest log.
     v2.3.1298: questDetail = the per-quest drill (objectives, rewards,
     tracking). */
  quests:       { title: 'Quests',      Component: QuestsPanel },
  questDetail:  { title: 'Quest',       Component: QuestDetailPanel },
  map:          { title: 'Map',         Component: MapPanel },
  /* v2.3.1291 (ChatGPT round-3 §1): the tab says Friends, so the header
     says Friends — one name everywhere (the panel id stays 'social' on
     the wire-free client side; renaming ids resets nothing). */
  social:       { title: 'Friends',     Component: SocialPanel },
  more:         { title: 'More',        Component: MorePanel },
  stats:        { title: 'Stats',       Component: StatsPanel },
  /* v2.3.1296 (round-5): expanded header says LIFE SKILLS to separate
     these from Hero's combat attributes; the toolbar label stays
     Skills.  v2.3.1312: the skillDetail drill is retired — the
     per-skill detail renders IN-PANEL inside SkillsPanel now. */
  skills:       { title: 'Life Skills', Component: SkillsPanel },
  encyclopedia: { title: 'Codex',       Component: EncyclopediaPanel },
  guild:        { title: 'Guild',       Component: GuildPanel },
  leaderboard:  { title: 'Leaderboard', Component: LeaderboardPanel },
  clan:         { title: 'Clan',        Component: ClanPanel },
  feedback:     { title: 'Feedback',    Component: FeedbackPanel },
  settings:     { title: 'Settings',    Component: SettingsPanel },
  /* v2.3.1143: Login Key display + device transfer. */
  /* v2.3.2038: titled 'Login Key' to match the More tile that now opens it
     directly -- what you tap and what opens should carry one name. */
  account:      { title: 'Login Key',   Component: AccountPanel },
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
  /* ═══ v2.3.2163: THE DASHBOARD, AS A DESTINATION — LANDSCAPE ONLY ═══
     Owner: "I can see 8 slots playing in [portrait] view (plus space for
     combat skills) so this should translate to 8 slots of space viewable
     in landscape."  Portrait's resting columns row IS this view, so
     portrait never routes here (NavRail's dashboard tap rests there); the
     landscape side sheet opens it as a destination: the same bag grid at
     the same PORTRAIT tile size (vwBasis = the device's short side),
     combat pills stacked below in the vertical space, scrolling as one
     column. */
  dashboard:    { title: 'Dashboard',   Component: function LandDash() {
    return React.createElement('div', {
      style: { flex: 1, minHeight: 0, overflowY: 'auto', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' },
    }, React.createElement(DashColumns, {
      R: (window._gameState && window._gameState.current && window._gameState.current.rpg) || null,
      stacked: true,
      vwBasis: Math.min(playVw(), playVh()),
    }));
  } },
};

/* v2.3.1283: the six toolbar destinations (nav-system spec).  Chat left
   the toolbar (owner) — the composer opens by tapping your own
   character in the world (BroTown self-tap gate).
   v2.3.1288 (PR B): every destination has a compact view now — the
   `compact:false` promotion flag and the compactless registration are
   gone (the bus keeps the mechanism, registered empty). */
const DESTINATIONS = [
  { id: 'bag',    label: 'Bag',     icon: '/icons/ui/nav-inventory.webp?v=2.3.1224' },
  { id: 'hero',   label: 'Character', icon: '/icons/ui/panel-self.webp?v=2.3.1224' },
  /* v2.3.1331 (owner art drop): dedicated life-skills crest replaces
     the borrowed panel-skills art (magenta knocked out, 256px webp). */
  { id: 'skills', label: 'Skills',  icon: '/icons/ui/nav-lifeskills.webp?v=2.3.1331' },
  { id: 'social', label: 'Friends', icon: '/icons/ui/nav-friends.webp?v=2.3.1224' },
  { id: 'quests', label: 'Quests',  icon: '/icons/ui/panel-quests.webp?v=2.3.1224' },
  { id: 'more',   label: 'More',    icon: '/icons/ui/nav-more.webp?v=2.3.1224' },
];

/* v2.3.1637 (owner correction to their own mockup: "it should be a new
   icon that represent a dashboard"): the rail's SEVENTH button, first in
   the stack.  The resting three-column band is a destination like any
   other and was the one state the toolbar could never light, because bar
   mode lights nothing.  panel-stats is the painted set's bar-chart-with-
   rising-arrow -- the only "your numbers" glyph in it, and used on one
   legacy screen otherwise, so it costs no collision.  Tapping it closes
   to rest (toBar) rather than opening a panel; there is no 'dashboard'
   entry in DESTINATIONS and the bus never sees the id. */
/* v2.3.1637b (owner): HERO is not in the rail — "the hero can just be
   pressing on the icon of the hero up top".  IdentityStrip's portrait
   carries it in band mode, which is the v2.3.1294 rule the ribbon's own
   Hero button already followed (the icon WAS the player's bust).  One
   fewer rail button is also ~32px of band height back. */
/* v2.3.1638 (owner): FOUR buttons — "just keep the dashboard, bag,
   quests, and friends buttons on that left side".  Hero was already the
   identity row's portrait (v2.3.1637b); Skills and More leave the rail
   here.
   MORE IS PINNED LAST, at the rail's bottom (owner: "you can add the
   more at bottom", immediately after the four-button cut).  It has to be
   somewhere: 'more' is the ONLY entry to Journey, Codex, Ranks, Clan,
   Guild and Settings — and Settings is the only route to Account, which
   holds the login key for device transfer.  Dropping it would have
   stranded all seven behind a screen nothing opens.

   v2.3.1639 (owner: "change left navigation to just dashboard, bag, and
   more"): Quests and Friends leave the rail too.  Neither is listed in
   MorePanel, so they join the stranded set below.

   STILL STRANDED, and now three: 'skills', 'quests' and 'social'.  The life
   skill tree (cooking / fishing / mining) lost its last entry point when
   the quick bar went at v2.3.1636 — the destination works, MorePanel
   does not list it, and nothing on screen opens it. */
/* v2.3.1651 (owner: "add one more button to the dashboard navigation to
   the right of bag for quests — I think those are the main buttons people
   will use").  FOUR now: Dashboard, Bag, Quests, More.  Quests slots in
   before More rather than after it, so More stays the last thing in the
   row — it is the overflow, and an overflow that is not on the end reads
   as just another destination. */
/* v2.3.1654 (owner: "you can replace bag view navigation with the
   character view").  Dashboard, Character, Quests, More.

   Bag's button had nothing left to open.  Since v2.3.1653 the resting
   dashboard IS the bag — four columns, its own filter header, and now its
   own scroll — so a Bag destination would have been a second, slightly
   wider copy of the screen you are already looking at.  The character
   view is what actually gained content in that trade (Hero > Overview
   took the equipped slots and their stat cards), so it takes the button. */
/* v2.3.1655 (owner: "make room for one more navigation button for
   lifeskills"): FIVE — Dashboard, Character, Quests, Skills, More.  Skills
   goes before More for the same reason Quests did at v2.3.1651: More is
   the overflow and has to stay on the end. */
const RAIL_ORDER = ['hero', 'quests', 'skills', 'more'];
const RAIL_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '/icons/ui/panel-stats.webp?v=2.3.1637' },
  ...RAIL_ORDER.map(id => DESTINATIONS.find(d => d.id === id)).filter(Boolean),
];

/* v2.3.1350 (owner): the COMPACT_VIEWS registry and the six compact
   glance views are RETIRED — bar and expanded are the only two nav
   states now (files deleted; git history has them). */

export const BottomDashboard = () => {
  const [, force] = useState(0);
  const [tooltip, setTooltip] = useState('');
  const dashRef = useRef(null);
  /* v2.3.2119: folded = columns row gone, identity row (and this component)
     still here.  Initialised from the bus — the preference is persisted and
     this component remounts on reconnect (the v2.3.2085 lesson). */
  const [dashMin, setDashMin] = useState(() => dashMinBus.min);
  /* ═══ v2.3.2157: WHICH SHAPE IS THE BAND? ═══
     Owner: "Landscape would be an optional view."  Self-subscribed from
     playIsLandscape() exactly the way ElementBurstButton and SpecialChargePie
     already do -- the shell's orientation, not the window's (a desktop
     monitor is landscape while the aspect-locked play shell is portrait,
     playViewport's two-widths law).  Sideways, the band is the identity row
     alone and an open destination renders as a SIDE sheet beside the world
     rather than the band growing. */
  const [land, setLand] = useState(() => playIsLandscape());
  /* ═══ v2.3.2174: WHICH EDGE THE PANEL TAKES ═══
     Owner, sideways on a real iPhone: "The iPhone has a punch hole that's
     awkward since it goes right through the menus."  BroTown's resize()
     measures both safe-area insets and stamps the CLEAR edge on <html>;
     this reads that one answer rather than measuring again, so the panel,
     the world offset and the CSS can never disagree about which side it is.
     'left' whenever there is no Island to dodge (a browser tab, Android,
     desktop, every headless run) -- the side the owner asked for. */
  const [side, setSide] = useState(() => {
    try { return document.documentElement.getAttribute('data-dash-side') || 'left'; }
    catch (e) { return 'left'; }
  });
  useEffect(() => {
    const onR = () => {
      setLand(playIsLandscape());
      try { setSide(document.documentElement.getAttribute('data-dash-side') || 'left'); }
      catch (e) { /* teardown: the next event heals it */ }
    };
    window.addEventListener('resize', onR);
    window.addEventListener('orientationchange', onR);
    /* The stamp is written INSIDE resize(); a listener registered here can
       run before it on the very same event, so re-read once the frame has
       settled.  Cheap: two attribute reads per rotation. */
    const onSettle = () => setTimeout(onR, 320);
    window.addEventListener('orientationchange', onSettle);
    return () => {
      window.removeEventListener('resize', onR);
      window.removeEventListener('orientationchange', onR);
      window.removeEventListener('orientationchange', onSettle);
    };
  }, []);
  useEffect(() => dashMinBus.subscribe(setDashMin), []);
  /* v2.3.2178: the landscape dock's box and the room panels keep clear of
     it, from one seam (sheetGeometry.landDockFootprint).  Recomputed every
     render like the other playVw()-derived numbers here -- the component
     already re-renders on resize, orientationchange and the 200ms force. */
  const landDock = landDockFootprint(playVw(), playVh());
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
  /* ═══ v2.3.1698: THE ITEM CARD GOES WITH THE PANEL THAT OPENED IT ═══
     Found in a headless playtest of the early game: equip the starter
     sword from Character > Weapon > CHANGE, then walk out of town.  The
     equip card was still floating mid-screen over the World View, over
     Verdant Wilds, and back in town again — it outlived the Character
     panel, the destination switch, the collapse to the toolbar AND two
     zone changes.  It then sat on top of Mayor Bro's turn-in dialogue and
     covered the Turn In Quest button, which is how a UI nit became a
     quest you cannot hand in.  (Its scrim swallows the tap that dismisses
     it, so the player's first tap anywhere is spent on the ghost card.)
     Same shape, same reason, as the v2.3.1235 tooltip line above — a
     floating layer anchored to a panel must not survive that panel.
     Gated on an ACTUAL destination/mode change, not on every bus emit:
     every itemDetailBus.open() call site lives INSIDE a panel view and
     none of them navigates, so a change-gated close can never race a
     card that is only just opening. */
  useEffect(() => {
    let last = dashboardPanelBus.root() + '|' + dashboardPanelBus.state.mode;
    return dashboardPanelBus.subscribe(() => {
      const now = dashboardPanelBus.root() + '|' + dashboardPanelBus.state.mode;
      if (now !== last) { last = now; itemDetailBus.close(); }
      setTooltip(''); force(v => v + 1);
    });
  }, []);
  /* v2.3.1312 (round-8 §Badges): the pickup watcher lives HERE — the
     dashboard is mounted in every snap mode.  It used to live in
     BagCompact, which unmounts at bar (the resting default!) and
     expanded, so pickups made while resting never badged the toolbar
     and inspections from the expanded grid never cleared it.  New bag
     keys register as unseen; opening a matching detail card marks
     seen.  Stack quantity increments reuse their key — no re-badge. */
  useEffect(() => {
    let prev = null;
    const tick = () => {
      const S = window._gameState && window._gameState.current;
      if (!S || !S.rpg) return;
      /* v2.3.1636: sampleQuickbar retired with the quick bar.  It existed
         to remember which life skill and which two combat skills you last
         trained, so nine cells could pick three to show; the COMBAT
         column shows all six parents and needs no such memory. */
      const keys = getBagEntries(S.rpg).map(bagEntryKey);
      if (prev) for (const k of keys) { if (!prev.has(k)) bagUnseen.add(k); }
      prev = new Set(keys);
    };
    tick();
    const id = setInterval(tick, 400);
    const unsubDetail = itemDetailBus.subscribe(() => {
      const t = itemDetailBus.state.open && itemDetailBus.state.target;
      if (!t) return;
      if (t.kind === 'inventory' && t.key) bagUnseen.markSeen(`i-${t.key}`);
      else if (typeof t.kind === 'string' && t.kind.startsWith('stash')) bagUnseen.markSeen(`${t.kind}-${t.index}`);
    });
    const unsubUnseen = bagUnseen.subscribe(() => force(v => v + 1));
    return () => { clearInterval(id); unsubDetail(); unsubUnseen(); };
  }, []);
  /* v2.3.1288: PR B — stamp the snap mode on <html> so pure CSS can dim
     the floating combat chrome (joystick discs + charge pie) while a
     sheet is open; rules live in game.css next to .bt-joystick-zone.
     CSS-driven so the dim never depends on those overlays re-rendering.
     v2.3.1290: also stamp --sheet-h (the sheet's CURRENT snap height in
     px) — overlays that dock above the OPEN sheet (the legacy tooltip
     toast) anchor to it, while world chrome keeps var(--dash-h). */
  useEffect(() => {
    /* ═══ v2.3.2197: THE FORMULA MOVED OUT; THIS OWNS THE LIFETIME ═══
       The arithmetic is in sheetStamp.js now, because three callers need it
       and the day two of them read different formulas they fight -- the
       lesson bandFootprint already taught the canvas watchdog.  What stays
       here is what genuinely belongs to the dashboard: stamping on mount, on
       every bus change, and REMOVING the stamp on unmount.

       v2.3.2196 (the resize listeners) was necessary and not sufficient.  It
       fixed a stamp that never re-ran on rotation; it left the stamp
       edge-triggered, still betting on the browser to send an event with the
       new dimensions on it.  Owner: "upon FIRST joining the game and first
       rotating to landscape SOMETIMES the joysticks are indeed missing" --
       sometimes and first-time is what a lost race sounds like, and iOS is
       specifically known for reporting pre-rotation dimensions on the first
       resize after an orientationchange.  BroTown's resize() and its 500ms
       watchdog now call the same function (see sheetStamp.js), which makes
       --sheet-h level-triggered like every other viewport-derived var: a
       missed or early event heals on the next tick instead of lasting until
       the player happens to open a menu.

       These listeners stay anyway.  They are the FAST path -- no waiting on a
       heartbeat for the common case -- and they keep the dashboard correct on
       its own terms rather than depending on another component being mounted.
       Calling twice costs nothing: stampSheetH skips the DOM write when the
       value has not moved. */
    stampSheetH();
    const unsub = dashboardPanelBus.subscribe(stampSheetH);
    const vv = window.visualViewport;
    window.addEventListener('resize', stampSheetH);
    if (vv) vv.addEventListener('resize', stampSheetH);
    return () => {
      unstampSheetH();
      window.removeEventListener('resize', stampSheetH);
      if (vv) vv.removeEventListener('resize', stampSheetH);
      unsub();
    };
  }, []);
  /* v2.3.1283: snap heights — recomputed on viewport changes with the
     same iOS-keyboard guard the canvas resize uses: when the keyboard
     shrinks visualViewport, HOLD the last value so the sheet doesn't
     jump under the chat composer.  v2.3.1350: the compact snap left
     with the compact state. */
  const [snapPx, setSnapPx] = useState(() => ({
    expanded: expandedSheetHeight(playVw(), playVh()),
    drill: drillSheetHeight(playVw(), playVh()),
  }));
  useEffect(() => {
    const vv = window.visualViewport;
    const recompute = () => {
      const vw = playVw();   /* v2.3.1715 */
      const vh = vv ? vv.height : window.innerHeight;
      if (vv && window.innerHeight - vh > 100) return; /* keyboard up */
      setSnapPx({ expanded: expandedSheetHeight(vw, vh), drill: drillSheetHeight(vw, vh) });
    };
    recompute();
    window.addEventListener('resize', recompute);
    if (vv) vv.addEventListener('resize', recompute);
    return () => {
      window.removeEventListener('resize', recompute);
      if (vv) vv.removeEventListener('resize', recompute);
    };
  }, []);
  /* v2.3.1312/1307 (retag: #288 owns 1311): BODY drags are gone — the
     sheet body is content, not a handle (drags fought panel scrolling).
     v2.3.1318 (owner: touch/swipe conflicts resolve to THIS session):
     useSheetDrag is retired AGAIN — icon swipes are classified in
     IconButton (pointer events) and routed to bus.advance/retreat; the
     mode change animates the band via the height ternary's 220ms
     transition, so there is no live height-tracking drag and no second
     writer to the band's height.  toolbarRef stays on the frame (tutorial
     anchoring + any future gesture surface).
     v2.3.2196: snapPxRef is GONE.  It existed only to feed the <html>
     stamp effect, and it raced that effect's own resize listener -- both
     listen for the same event, and the ref is written a render later than
     the stamp reads it.  The stamp computes the two heights live now
     (expandedSheetHeight / drillSheetHeight, the same helpers the state
     below uses); the snapPx STATE stays, because the band's own height
     still renders from it. */
  const toolbarRef = useRef(null);
  /* Player-card portrait: a head-and-shoulders render of the player's
     chosen cosmetics (skin / hair / hair color / beard / hat).  Generated
     on mount (captures the login picker) and regenerated if a cosmetic
     changes.  Falls back to the NFT avatar, then the static icon. */
  /* v2.3.1294: the portrait now ALSO feeds portraitStore — the Hero
     toolbar icon below and the Hero identity strip read it (the
     top-right card it used to serve is retired). */
  const [profilePortrait, setProfilePortrait] = useState('');
  useEffect(() => { portraitStore.set(profilePortrait); }, [profilePortrait]);
  /* ═══ v2.3.1835: THE FACE IN THE CORNER IS THE ONE YOU ARE PLAYING ═══
     Owner: "the character displayed in the HUD doesn't match the character
     played anymore."

     Two independent ways this portrait went stale, and both are the same
     class of bug — the picture is generated from a snapshot of eleven stores
     and nothing guaranteed the snapshot was the current one.

     1. A MISSING SUBSCRIPTION.  It READ getFacialHair() but only subscribed
        to onFacialHairColorChange, so changing the beard STYLE repainted
        nothing.  CharacterView, which draws the same figure on the equip
        screen, subscribes to the full set and says why in its own comment:
        "Missing a subscription does not break the picture — it makes it
        STALE, which is worse."  This is that, one store short.

     2. AN UNSEQUENCED ASYNC RACE, which is the one that can go wrong on a
        cosmetic that IS subscribed.  portraitDataUrl is async, several
        regens can be in flight at once (rolling a random bro fires ten
        setters in a row), and `alive` only guards unmount — so whichever
        render FINISHES last won, not whichever STARTED last.  A slow early
        portrait landing after a fast late one leaves the corner showing a
        character you have already changed away from.  A sequence number
        fixes it: only the newest request may set state. */
  useEffect(() => {
    let alive = true;
    let seq = 0;
    const regen = () => {
      const mine = ++seq;
      portraitDataUrl({
        skin: getSkin(), pants: getPants(), shoes: getShoes(),
        hair: getHair(), hairColor: hairColorTarget(getHairColor()),
        facialHair: getFacialHair(), facialHairColor: facialHairColorTarget(getFacialHairColor()),
        headwear: getHeadwear(), hatColor: hatColorTarget(getHatColor(), getHeadwear()), /* v2.3.1927 */
        eyeColor: getEyeColor(),
        shirt: getShirt(), shirtColor: shirtColorTarget(getShirtColor()),
      }, true).then(url => { if (alive && url && mine === seq) setProfilePortrait(url); });
    };
    regen();
    const unsubs = [onSkinChange(regen), onHairChange(regen), onHairColorChange(regen),
      onHeadwearChange(regen), onHatColorChange(regen),
      onFacialHairChange(regen), onFacialHairColorChange(regen),
      onShirtChange(regen), onShirtColorChange(regen), onEyeColorChange(regen), /* v2.3.1928 */
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
  /* v2.3.2119: OPENING A DESTINATION UNFOLDS.  Tapping Bag from a folded
     band means "I want the UI back", and the expanded sheet's own layout
     assumes the resting geometry.  Restoring here (not in the nav handler)
     catches every way a panel can open — nav tap, drill, a panel another
     system pushes. */
  useEffect(() => {
    if (mode === 'expanded' && dashMinBus.min) dashMinBus.set(false);
  }, [mode]);
  /* ═══ v2.3.2157: ROTATION CLOSES AN OPEN DESTINATION ═══
     The portrait bottom sheet and the landscape side sheet share no
     geometry, so there is no defined mid-state to animate between -- a
     panel left open across the flip would be laid out for a surface that
     no longer exists.  toBar() keeps the root, so the next tap resumes the
     same destination; the world is what greets the rotation. */
  const _landRef = useRef(land);
  useEffect(() => {
    if (_landRef.current !== land) {
      _landRef.current = land;
      if (dashboardPanelBus.state.mode === 'expanded') dashboardPanelBus.toBar();
    }
  }, [land]);

  /* v2.3.1642: litId and the badge counts were computed inside the
     retired ribbon's render IIFE.  The nav group needs them one level up
     now that it lives in the top row, so they are hoisted verbatim —
     same rules, same sources, just evaluated before the return. */
  /* v2.3.1290: bar mode = NOTHING lit — the resting state has no open
     destination (the remembered root only matters for resume). */
  /* v2.3.1922: inside a drilled child (Weapons, Settings, Friends, a quest
     detail...) rather than at a destination's root — the condition the old
     in-flow header rendered on, now read by the toolbar row instead. */
  const drill = mode === 'expanded' && stack.length > 1;
  const litId = mode === 'bar' ? null
    /* v2.3.2176: 'dashboard' is a real destination sideways (PANELS.dashboard,
       the 2x4 column) but it is not in DESTINATIONS, so it fell through to the
       legacy-root branch and lit MORE -- the wrong button entirely, on the one
       screen the chart button names.  Matched first, before that fallback. */
    : rootId === 'dashboard' ? 'dashboard'
    : DESTINATIONS.map(d => d.id).includes(rootId) ? rootId
    /* legacy drill roots (inventory push, tutorial ids...) light More */
    : (rootId ? 'more' : 'bag');
  const Sb = (typeof window !== 'undefined') && window._gameState && window._gameState.current;
  /* v2.3.1296 (round-5): actionable badges only — skills: unviewed
     level-ups; quests: READY turn-ins (v2.3.1298); hero: the GLOBAL
     unspent-point total (v2.3.1311, one definition since v2.3.1635);
     social: pending requests + unread DMs, else an online dot.  The Bag's
     circle dot was removed at v2.3.1315 (owner) — the pickup pulse and
     the in-bag sparkles stay. */
  const dots = {
    skills: hasUnseenLevelUps((Sb && Sb.rpg) || {}),
    quests: readyQuestCount(Sb) > 0,
    hero: unspentPointsTotal(Sb && Sb.rpg),
    social: (() => {
      try {
        const actionable = friendsSrv.requestsIn().length + friendsSrv.unreadTotal();
        if (actionable > 0) return actionable;
        return getFriendRows(Sb).some(r => r.online) ? 'online' : false;
      } catch (_e) { return false; }
    })(),
  };

  /* v2.3.1294: the card's level/gold reads and the v2.3.131 gold
     count-up left with the card — the Hero identity strip owns the
     readouts now (its coin keeps the glimmer class; the RAF count-up
     retired with its anchor). */

  const Active = active?.Component;
  /* v2.3.1649: the top row shares the columns row's tracks — see the grid
     below.  One call, so the two rows can never disagree about where a
     column starts. */
  const dashCols = dashPanelWidths(playVw());   /* v2.3.1715 */

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

      {/* ═══ v2.3.2157: THE LANDSCAPE SIDE SHEET ═══
          Owner: "No I don't want an overlay over the world" + "You should be
          able to play the game with the menus open.  That's the idea."

          Sideways, an open destination renders HERE -- a fixed column on the
          right, from the top of the screen down to the band -- instead of
          the band growing.  The world does not sit under it: resize()
          narrows the canvas (and game.css narrows .brotown-wrap) to
          --play-w, so this sheet occupies ground the world has already
          yielded.  Side by side, never on top.

          A SIBLING of the band, outside .brotown-wrap -- placement, not
          z-index, is what keeps it out of the wrap's stacking context
          (TRAPS §20: no number crosses that boundary).  The band below it
          never moves and never grows (the v2.3.1637b one-position law), so
          the nav that opened this sheet is the nav that closes it, in the
          same place.

          Deliberately NOT in _anyPanelOpen/uiBusyBus: this is the dashboard
          sheet, which has never counted as "busy" -- that gate is for the
          legacy full-screen panels.  The joysticks stay live on the world
          beside it, which is the entire point.

          Opaque world-chrome surface, no backdrop-filter (iOS Safari +
          WebGL, LANTERN-SLATE-SPEC), radius on the one corner that meets
          the world. */}
      {land && active ? (
        <div
          className="bt-land-sheet"
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: 0,
            /* v2.3.2174 (owner: the punch hole "goes right through the
               menus"): the panel takes the CLEAR edge — see the `side`
               state above.  The border and the radius are the seam where
               the panel meets the world, so they mirror with it. */
            ...(side === 'left' ? { left: 0 } : { right: 0 }),
            /* v2.3.2166 (owner: the dashboard buttons "should all be
               included in that container on that whole right side"): the
               sheet runs to the SCREEN's bottom edge now, not the band's
               top — the strip narrows to the world's width beside it
               (game.css), and the nav dock below occupies the container's
               own bottom row.  The content wrapper reserves that row via
               --dash-h so panels never slide under the buttons. */
            bottom: 0,
            width: 'var(--sheet-w, 400px)',
            zIndex: 30,
            boxSizing: 'border-box',
            background: 'rgba(13,22,27,.96)',
            ...(side === 'left'
              ? { borderRight: '1px solid rgba(229,237,233,.20)' }
              : { borderLeft: '1px solid rgba(229,237,233,.20)' }),
            color: COL.text,
            fontFamily: 'Source Sans 3, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            touchAction: 'none',
            paddingTop: 'env(safe-area-inset-top, 0px)',
          }}
        >
          {/* ═══ v2.3.2168: THE DRILL HEADER LIVES IN THE SHEET NOW ═══
              The back-chip and title used to ride the band's identity row;
              with the bar gone sideways (owner: "remove that whole bottom
              length bar"), a drill (Settings, Build, quest detail) would
              have had no way back.  Same chip, same title treatment, at
              the top of the container where the drill actually is. */}
          {drill && (
            <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px 0' }}>
              <button
                onPointerUp={(e) => { e.stopPropagation(); dashboardPanelBus.pop(); }}
                className="bt-chisel bt-chisel--chip"
                style={{ ...chipStyle, flex: 'none' }}
              >◂</button>
              <div style={{
                minWidth: 0, fontSize: 13, fontWeight: 700, letterSpacing: '.10em',
                textTransform: 'uppercase', color: COL.text,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{active ? active.title : ''}</div>
            </div>
          )}
          {/* v2.3.2166: the bottom padding is the nav dock's zone.
              v2.3.2178: and it is the DOCK's own arithmetic now, not a second
              copy of it -- the reserve never knew where the dock actually
              sat, only how tall it was, so an inset that moved the dock left
              the panel reserving the wrong row.  landDockFootprint returns
              both from the same expression. */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: `8px 8px ${landDock.reserve}` }}>
            {Active && <Active />}
          </div>
        </div>
      ) : null}

      {/* ═══ v2.3.2168: GOLD, AS A CHIP ═══
          Owner: "Coins can go someplace else (they don't need an entire
          screen length)."  The bar existed to carry this one number; the
          number survives as a compact chip at the WORLD's bottom centre —
          left is keyed to --play-w, so when a sheet opens and the world
          narrows, the chip re-centres over the world rather than the
          screen.  This is the ONLY gold count on a landscape screen (the
          band that carried the other one no longer renders), so the
          v2.3.1563 one-count rule holds by construction.  pointer-events
          none: it is a readout over the touch zones, never a control. */}
      {land ? <LandGoldChip /> : null}

      {/* ═══ v2.3.2166: THE LANDSCAPE NAV DOCK ═══
          Owner: "the dashboard buttons (for dashboard bag view, character
          view, lifeskills) should all be included in that container on that
          whole right side."

          Sideways the five buttons leave the band's flex row and become a
          FIXED dock in the screen's bottom-right corner — the same corner
          they occupied inside the band, so nothing moves under a thumb
          that knows where they live (v2.3.1637b).  What changes is what
          is painted BEHIND them: the strip at rest, the side container
          when a sheet is open — which is exactly "included in that
          container" without the buttons ever moving between two parents
          or two positions.  Rendered after the band so it always paints
          on top; the buttons narrow to LAND_NAV_BTN_W so the whole group
          fits inside the container's width. */}
      {land ? (
        <div
          className="bt-land-navdock"
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            /* v2.3.2174: the dock rides the panel to whichever edge is
               clear — it is the container's own bottom row. */
            ...(side === 'left' ? { left: DASH_GAP } : { right: DASH_GAP }),
            /* v2.3.2178 (owner: "the dashboard buttons can go down some to
               make more room so the combat skills don't get clipped"): the
               dock gives most of the home-indicator inset back instead of
               sitting on top of it, and its height and the panel's reserve
               now come from ONE place -- landDockFootprint.  Installed, the
               old anchor lifted the dock 21px into the panel and it covered
               the combat cards; in a browser tab the inset is 0 and none of
               this moves, which is exactly why the bug never showed here. */
            bottom: landDock.bottom,
            /* v2.3.2168: its OWN height — --dash-h is only the inset now
               that the bar is gone, so the dock states the row height the
               band used to lend it. */
            height: landDock.h,
            /* v2.3.2170 (owner, zoomed screenshot: "the left side of the
               buttons has space to fill"): the dock spans the DASHBOARD
               container's inner width — always that width, whatever is
               open, so the buttons hold one screen position (v2.3.1637b)
               — and NavRail's `fill` flexes the five buttons into it. */
            /* v2.3.2176 (owner: "the dashboard navigation buttons still
               visible that should've been hidden inside the main dashboard
               screen when it's minimized"): the dock is only as wide as
               what it shows.  At rest that is the chip alone, so the row
               stops reserving a container's worth of world for buttons
               that are not there; open, it is the container's inner width
               and the buttons fill it (NavRail's `fill`).  The chip itself
               never moves -- it is the first item either way, at the same
               screen position (v2.3.1637b). */
            width: mode === 'expanded'
              ? landscapeSheetW(playVw(), playVh(), 'dashboard') - 2 * DASH_GAP
              : undefined,
            zIndex: 31,
            display: 'flex', alignItems: 'center', paddingLeft: DASH_GAP,
          }}
        >
          {/* ═══ v2.3.2171: THE LANDSCAPE FOLD CHIP ═══
              Owner: "add a button for minimizing that whole dashboard area
              (just like the portrait equivalent)."  Same chip, same corner
              rule as portrait's (v2.3.2120: far left of the row, there in
              every mode).  Landscape's rest state IS minimized, so the
              glyph pair maps to the sheet: ▾ closes whatever is open, ▴
              opens the dashboard column. */}
          <button
            onPointerUp={(e) => {
              e.stopPropagation();
              if (dashboardPanelBus.state.mode === 'expanded') dashboardPanelBus.toBar();
              else dashboardPanelBus.open('dashboard');
            }}
            className="bt-chisel bt-chisel--chip"
            aria-label={mode === 'expanded' ? 'Minimize dashboard' : 'Expand dashboard'}
            aria-expanded={mode === 'expanded'}
            data-land-fold={mode === 'expanded' ? 'open' : 'min'}
            style={{ ...chipStyle, flex: 'none', fontSize: 15, width: LAND_FOLD_CHIP_W }}
          >{mode === 'expanded' ? '▾' : '▴'}</button>
          {/* ═══ v2.3.2176: MINIMIZED MEANS MINIMIZED ═══
              Owner: the nav buttons "should've been hidden inside the main
              dashboard screen when it's minimized."  So sideways they are
              part of the CONTAINER, not permanent world chrome: at rest the
              only control on the world is the chip that opens it (plus the
              gold chip and the bell, which are readouts).  Reaching a
              destination costs one extra tap, which the owner weighed and
              chose -- the world is what landscape is for. */}
          {mode === 'expanded' ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              <NavRail
                items={RAIL_ITEMS}
                litId={litId}
                atRest={mode === 'bar'}
                vw={playVw()}
                vh={typeof window !== 'undefined' ? window.innerHeight : 844}
                dots={dots}
                btnW={LAND_NAV_BTN_W}
                fill
                landLit
                profilePortrait={profilePortrait} />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* v2.3.1294 (ChatGPT round-4, owner-approved): the persistent
          top-right identity card is RETIRED — name/level/XP/gold are
          rarely needed mid-play, and the card cost world space in the
          new toolbar-only resting state.  Hero owns the character HUD
          now (sheet/IdentityStrip.jsx); transient +XP/+gold popups
          (XpFlyOverlay) still land top-right; combat health stays on
          the above-head bars (v2.3.1272). */}

    <div
      ref={dashRef}
      className="bt-dashboard"
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        /* v2.3.1283: ONE bottom sheet.  v2.3.1350 (owner): TWO snap
           points — bar (var(--dash-h) toolbar shelf, the resting
           default; canvas/zones/HUD all key off it) and expanded
           (detail).  Every destination uses the same snaps.  220ms
           token; reduced-motion drops the transition. */
        /* v2.3.2157: sideways the band NEVER grows -- expanded content
           lives in the side sheet, and a band that grew would cover the
           world the owner asked to keep playing in. */
        /* ═══ v2.3.2198: THE EXPANDED SHEET PAYS THE INSET TOO ═══
           Owner, on the installed web app: "none of the other menus sit
           right.  Portrait mode."

           The resting band is `var(--dash-h)`, which since v2.3.2178
           INCLUDES the home-indicator inset.  The expanded snap is a plain
           pixel number that does not -- while this element pays
           `paddingBottom: var(--sab)` in both states.  So on an installed
           phone, opening a destination made the sheet SHRINK by the inset
           (measured: band 277 resting, 243 expanded) and its top edge DROP
           by the same 34px, which is the gap under the gold row in the
           owner's screenshot.  Expanding must never take room away.

           Zero in a browser tab, which is exactly why every headless run
           and every desktop check missed it -- the same blind spot, in the
           same arithmetic, that v2.3.2178's note describes. */
        height: land ? 'var(--dash-h)'
          : mode === 'expanded'
            ? `calc(${stack.length > 1 ? snapPx.drill : snapPx.expanded}px + var(--sab, 0px))` /* v2.3.1311e: drill = taller */
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
        paddingBottom: 'var(--sab, 0px)',
        /* touch-action: none swallows browser default gestures (pan,
           zoom, swipe) on the dashboard chrome.  Inner scrollable panels
           use panelStyle.touchAction = 'pan-y' to opt back in to
           vertical scrolling. Without this, an accidental horizontal
           swipe on the dashboard area was being interpreted as a page
           pan and the viewport visibly juddered. */
        touchAction: 'none',
      }}
    >
      {/* v2.3.1307/1311: the top-edge drag handle is gone — band-wide
          swipes are retired (owner: too ambiguous over interactive
          menus; a handle with no gesture behind it is a lie).  Resizing
          lives on the toolbar: tap cycle + icon swipes + chevrons. */}
      {active && !land ? (
        <>
          {/* v2.3.1350 (owner: "remove the headers — it's redundant"):
              ROOT panels have no header strip — the lit toolbar button
              already names the destination, and the freed 44px goes to
              content (the Bag's second item row was the motivating
              case).  DRILL children (Settings, Build, quest detail...)
              still need their title and a way out — their titles are NOT
              on the toolbar and the back-chip is the way out — but at
              v2.3.1922 both moved INTO the toolbar row rather than
              standing in a header of their own here; see below. */}
          {/* ═══ v2.3.1922: THE DRILL HEADER MOVED UP INTO THE TOOLBAR ROW ═══
              The 44px header that stood here is gone — not deleted, RELOCATED
              into the absolute nav row further down this file, where the back
              chip and the title now sit beside the gold and the nav buttons.

              It had to move because it was never really a row.  Measured on a
              390x844 phone with Weapons drilled open: the header occupied
              y601..645 and the absolute nav row (zIndex 3) occupied y601..653
              — the SAME pixels.  So the header was drawn underneath the
              toolbar, and both of the owner's reports are that one fact seen
              from two sides:

                "The gold amount is over the back button."  The chip sat at
                x52..86 and the gold group at x67..115 — 19px of overlap, with
                the coin painted on top of the glyph.  v2.3.1689 had already
                fixed this once by padding the header 52px past the Hero
                PORTRAIT (right edge 44); the portrait later gave that corner
                up to the gold readout (v2.3.1635), and a hand-tuned offset
                against one neighbour does not survive a new neighbour.

                "The char stats should be raised up to fit the window better."
                The band paid for the toolbar TWICE — 44px of invisible header
                in the flex flow, then the 52px marginTop below that reserves
                the toolbar's real height.  Panel bodies got 147px of a 243px
                band; they now get 191, which is the whole of the Weapons
                sheet's fifth channel row that was falling off the bottom.

              The title moved with it rather than being dropped: it is the one
              thing the toolbar does NOT already say for a drill (v2.3.1350's
              reasoning for why root panels have no header at all). */}
          {/* v2.3.1229: panels render in a flex body ABOVE the persistent
              toolbar (spec §9: the toolbar stays visible in panel mode;
              its lit item identifies the panel).  v2.3.1307b: the toolbar
              is absolute-pinned to the band bottom now — the marginBottom
              reserves its height so panel content never hides under it
              (v2.3.1325: var — the shelf is slot-derived now). */}
          {/* v2.3.1560: reserve the RIBBON's height, not the whole band's
              — the quick bar hides while a panel is expanded, so the
              panel gets those ~50px back (var(--dash-h) here would have
              left a blank strip and cost the Bag its third item row). */}
          {/* v2.3.1637: reserve the RAIL's width, not the retired
              ribbon's height.  Same purpose as the v2.3.1307b
              marginBottom it replaces -- panel content must never slide
              under the persistent navigation. */}
          {/* v2.3.1642: reserve the nav group's ROW at the band's top,
              not the retired rail's width down its left. */}
          {/* v2.3.1922: this marginTop is now the band's ONLY reservation for
              the toolbar row — the 44px drill header that used to stack on
              top of it has moved into that row.  One overlay, one
              reservation. */}
          {/* v2.3.2198: MINUS --sab.  This reserves the absolute nav row
              pinned at the band's top, and that row's own height is
              `--dash-h - --cols-h - --sab` (see it, ~60 lines below).  This
              line kept the v2.3.1922 subtraction as it was, so once
              v2.3.2178 folded the home-indicator inset into --dash-h the
              reservation and the thing it reserves disagreed by exactly the
              inset -- and since the sheet ALSO pays it as paddingBottom, the
              inset was charged twice.  That is the same failure v2.3.1922
              wrote up as "the band paid for the toolbar TWICE", arriving by
              a new road: 34px of dead space above every panel on an
              installed phone, and 34px of panel falling off the bottom. */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 'calc(var(--dash-h, 145px) - var(--cols-h, 93px) - var(--sab, 0px))' }}>
            {Active && <Active />}
          </div>
        </>
      ) : null /* v2.3.1350: bar mode — toolbar only, the game's resting
           default (owner: maximum world visibility).  The compact
           branch left with the compact state. */}

      {/* v2.3.1635 (owner "option C"): the PERSISTENT IDENTITY ROW —
          portrait, name, level, exact XP to the next one, unspent build
          points, active weapon, gold.  Third persistent row, pinned
          above the quick bar for the same reason that one is pinned
          (v2.3.1307b): anything in the band's flex flow hops when a
          sheet closes and its content unmounts.

          THIS RETIRES THE v2.3.1563 FLOATING GOLD CHIP.  That chip put a
          coin count over the world precisely because the band had
          nowhere to show one, and its own comment records the rule that
          makes keeping both impossible: "two live gold counts on one
          screen disagree the moment one of them lags".  The row carries
          gold in the same corner of the screen and reads it from the
          same rpg blob, so the chip is redundant, not merely duplicated.

          Hidden while a panel is expanded, exactly like the quick bar
          and the old chip: Hero's own IdentityStrip owns the readout
          there, and that is the same one-count rule.  --dash-h does NOT
          change when it hides (the BAR-height invariant) — the row just
          isn't drawn, so the canvas is never reallocated. */}
      {/* v2.3.1642 (owner: "put the rail buttons on the top to the left
          of the character in its own little section up there"): the TOP
          ROW is the nav group and the identity strip, side by side.

          THE GROUP IS OUTSIDE the `mode !== 'expanded'` gate on purpose.
          The strip hides when a panel opens (Hero's own header owns that
          readout — the one-count rule), but navigation cannot hide with
          it: the ribbon this descends from stayed visible under an open
          sheet because it was the only way to switch destination or get
          out, and putting the buttons inside the strip would have
          restored exactly that trap.  Keeping it mounted also holds it at
          one screen position in both modes, so nothing slides out from
          under the thumb that just tapped it (the v2.3.1637b rule). */}
      {/* v2.3.1649 (owner: "shift the player HUD data to the left ... move
          the navigation buttons all the way to the right in that little
          ribbon area"): the top row is a GRID on the columns row's own
          three tracks, not a flex row.

          That is what makes the two alignment promises in the same message
          keepable — gold "above the inventory preview slots" and DPS
          "aligned above the weapon" are claims about specific columns, and
          the only honest way to keep them at every viewport is to lay this
          row out with the same dashPanelWidths the columns use.  The strip
          renders straight into tracks 1 and 2; the nav group takes track 3
          and right-aligns, which is the "all the way to the right" ask and
          also frees the LEFT of this row — where the bag's filter chips now
          go while the Bag is open. */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0,
        bottom: 'calc(var(--sab, 0px) + var(--cols-h, 93px))',
        /* v2.3.2178: --dash-h carries the home-indicator inset now (see
           bandFootprint), and this row is offset from the band's bottom by
           that same inset -- so it must come OUT of the height, or the row
           grows by an inset it has already been moved past and overhangs
           the band's top edge.  Zero in a browser tab; the whole bug on an
           installed phone. */
        height: 'calc(var(--dash-h, 145px) - var(--cols-h, 93px) - var(--sab, 0px))',
        zIndex: 3,
        boxSizing: 'border-box',
        /* v2.3.2166: sideways the nav group is a fixed dock (below), so the
           strip must RESERVE its corner or the identity readout flexes
           under the buttons the moment they leave the flex row. */
        padding: land
          ? `0 ${landscapeNavGroupW() + DASH_GAP}px 0 ${DASH_GAP}px`
          : `0 ${DASH_GAP}px`,
        /* v2.3.1653: a flex row again.  The grid existed to put the strip
           on the columns row's tracks; with two panels below and no weapon
           cell to align to, there is nothing left for the tracks to keep
           in register — see IdentityStrip. */
        display: 'flex', alignItems: 'center', gap: DASH_GAP,
        borderBottom: mode === 'expanded' ? 'none' : `1px solid ${COL.divider}`,
      }}>
        {/* v2.3.1650 (owner: "put player HUD in same spot when the 'more
            options' pane is displayed on the dashboard").  The strip used to
            hide the moment ANY panel opened, which is why the More pane
            arrived with the top row suddenly empty and your name, level, XP
            and gold gone.  It stays now, in the same place, for every
            destination — the row is band chrome, and the panel below it has
            its own body either way.

            THE ONE EXCEPTION IS THE BAG, and only because the Bag is the
            destination that asked for this space: its category chips (also
            the owner's, v2.3.1649) take the strip's place there.  Two
            things cannot occupy one row, and in the Bag the chips win
            because they are controls and the strip is a readout. */}
        {/* v2.3.1652 (owner: "make the player HUD on the dashboard on the
            expanded bag view too"): no exceptions left.  The strip renders
            in EVERY mode and destination, including the Bag — the filter
            chips that displaced it here have moved into the Bag panel as
            their own header row, so the two are no longer competing for
            one row and the HUD never moves or disappears. */}
        {/* v2.3.1922: the drill back-chip, FIRST in the row.  Laid out as a
            flex sibling of the gold readout and the nav buttons rather than
            positioned against them, which is the whole point — the row now
            allocates the space instead of the chip guessing an offset that
            goes stale the next time this corner is rearranged.  34px against
            the 44px touch rule is the pre-existing chipStyle; the row is 52px
            tall and centres it, so the tappable area is the row's height. */}
        {/* v2.3.2119: the FOLD chip; v2.3.2120 (owner: "all the way left on
            the dashboard (to the left of gold count) and stays there
            regardless of which tab is open"): FIRST in the row, in every
            mode.  A control that anchors the row's left edge cannot also
            migrate with the modes — same one-screen-position rule the nav
            group follows (v2.3.1637b): nothing slides out from under the
            thumb that knows where it lives.

            IN EXPANDED MODE the tap means "get all this out of my way":
            close the sheet to the bar FIRST, then fold.  In that order on
            purpose — the mode-effect above unfolds whenever a sheet is
            open, so folding while still expanded would be setting a flag
            for the effect to immediately revert; with the sheet already
            closed the effect has nothing to say.  Opening any tab still
            unfolds (that effect is unchanged) — the chip stays put, its
            meaning flips with the glyph. */}
        <button
          onPointerUp={(e) => {
            e.stopPropagation();
            if (mode === 'expanded') { dashboardPanelBus.toBar(); dashMinBus.set(true); }
            else dashMinBus.set(!dashMinBus.min);
          }}
          className="bt-chisel bt-chisel--chip"
          aria-label={dashMin ? 'Expand dashboard' : 'Minimize dashboard'}
          aria-expanded={!dashMin}
          data-dash-fold={dashMin ? 'min' : 'open'}
          /* ═══ v2.3.2266: A PILL THAT SAYS WHAT IT DOES ═══
             Owner: "the down arrow to hide the entire dashboard is a little too
             subtle.  Make it a pill that says CLOSE."

             A 15px glyph in a 34px box, on a row that also carries the gold
             readout and five nav chips, is the smallest thing on the busiest
             strip -- and it hides the whole dashboard, which is the largest
             thing it could do.  A word is the fix; it also removes the arrow's
             own ambiguity, which is the same complaint he made about the world
             chat's chevron in the same breath.

             OPEN / CLOSE rather than a single label, because the control is a
             toggle and a pill reading CLOSE while the dashboard is already
             closed would be worse than the arrow.  Caption type from the
             Lantern Slate scale (11/800 uppercase, .08em) so it matches the
             other chrome, and `width: auto` with real padding so it sizes to its
             word -- chipStyle's fixed 34px square would clip it.  The 44px
             touch rule the row is built to (see the note above) is unaffected:
             the box only gets wider.

             NOT A LITERAL PILL, and that is deliberate rather than an
             oversight: .bt-chisel draws its shape from a 9-sliced border-image
             (game.css), so border-radius on this element paints nothing at all
             -- the frame art owns the corners.  Forcing a true capsule would
             mean dropping that frame and inventing a shape no other control in
             the game wears.  What the owner asked for is a labelled button
             instead of a subtle glyph, and this is that, in the house chrome
             every neighbouring chip is already wearing. */
          style={{
            ...chipStyle,
            width: 'auto',
            minWidth: 34,
            padding: '0 10px',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '.08em',
          }}
        >{dashMin ? 'OPEN' : 'CLOSE'}</button>
        {drill && (
          <button
            onPointerUp={(e) => { e.stopPropagation(); dashboardPanelBus.pop(); }}
            className="bt-chisel bt-chisel--chip"
            style={{ ...chipStyle, flex: 'none' }}
          >◂</button>
        )}
        {/* v2.3.692: the LOADOUT / BUILD ColHeader treatment (13px, .10em
            tracking, uppercase) so every open panel title reads the same.
            v2.3.1922: it sits NEXT TO the back chip and takes its natural
            width, rather than centring in the row on flex:1.

            Centred was what the old standalone header could afford; in a
            shared row it is not.  Measured: between the gold readout's right
            edge (111) and the nav group's left (185) there is ~62px, and
            IdentityStrip flexes into the same leftover — so a centred title
            rendered "BUILD" as "B U...".  Beside the chip it has ~145px and
            needs about 50, and back-chip-then-label is the pattern a phone
            user already reads as "where this goes back to".  maxWidth keeps a
            long drill title from ever pushing the gold off its own row; the
            ellipsis is the backstop, not the plan. */}
        {drill && (
          <div style={{
            flex: 'none', minWidth: 0, maxWidth: 132,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '.10em',
            textTransform: 'uppercase',
            color: COL.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>{active ? active.title : ''}</div>
        )}
        <IdentityStrip band />
        {/* Track 3, right-aligned.  The group is WIDER than the narrow
            track (132 vs 90 at 390w) and deliberately overflows it to the
            LEFT: track 2 holds only the DPS anchor box, which is pinned to
            that track's left edge over the weapon cell, so the overflow
            crosses empty space and never the readout.  Sizing the buttons
            down to fit the track instead would have put them back at 24px
            wide — the size the owner asked to grow away from at
            v2.3.1644. */}
        {/* v2.3.2166: not sideways — there the five buttons live in the
            fixed nav dock so the side container can enclose them (owner:
            "included in that container on that whole right side"). */}
        {!land && (
          <div style={{ flex: 'none', display: 'flex', alignItems: 'center' }}>
            <NavRail
              items={RAIL_ITEMS}
              litId={litId}
              atRest={mode === 'bar'}
              vw={playVw()}   /* v2.3.1715 */
              vh={typeof window !== 'undefined' ? window.innerHeight : 844}
              dots={dots}
              profilePortrait={profilePortrait} />
          </div>
        )}
      </div>

      {/* v2.3.1636 (owner, with a reference shot): the THREE-COLUMN ROW —
          BAG / EQUIPPED / COMBAT — in the slot the v2.3.1560 quick bar
          held.  Absolute-pinned directly on top of the ribbon for the
          same reason the ribbon itself is pinned (v2.3.1307b): anything
          in the band's flex flow hops when a sheet closes and the content
          unmounts.  Hidden while a panel is expanded — the open
          destination already shows all of this at full size, and the
          panel keeps its height. */}
      {mode !== 'expanded' && !dashMin && !land && (
        <div style={{
          position: 'absolute',
          left: 0, right: 0,
          bottom: 'var(--sab, 0px)',
          zIndex: 2,
          boxSizing: 'border-box',
          /* v2.3.1635: its OWN height, not calc(--dash-h - --nav-h).  With
             the identity row added that subtraction became "middle row +
             identity row" and would have stretched this over both.
             v2.3.2119: gated on the fold too — --cols-h is stamped 0 while
             folded, and a row rendered into 0px would still mount all three
             panels to show nothing. */
          height: 'var(--cols-h, 93px)',
        }}>
          <DashColumns R={(window._gameState && window._gameState.current && window._gameState.current.rpg) || null} />
        </div>
      )}


    </div>
    </>
  );
};

/* v2.3.1332: frame via .bt-chisel — layout only here. */
/* v2.3.2168: the landscape gold chip (see the render-site comment).  Reads
   the same R.coins IdentityStrip reads and ticks itself once a second —
   gold moves on server settlement, not per frame, and a 1s readout lag on
   a coin count is invisible while a live subscription here would be a new
   wire into a component that renders four elements. */
const LandGoldChip = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((v) => (v + 1) % 1000000), 1000);
    return () => clearInterval(id);
  }, []);
  const R = (window._gameState && window._gameState.current && window._gameState.current.rpg) || {};
  const gold = R.coins || R.gold || 0;
  return (
    <div className="bt-land-gold" aria-label={`${gold} gold`} style={{
      position: 'fixed',
      /* v2.3.2174: centred over the WORLD, wherever the world starts.
         --world-x is the world's left edge (0 whenever the panel is on the
         right), so this needs no knowledge of the side — the same stamp
         that offsets the wrap re-centres the chip. */
      left: 'calc(var(--world-x, 0px) + var(--play-w, 100%) / 2)',
      transform: 'translateX(-50%)',
      bottom: 'calc(var(--sab, 0px) + 6px)',
      zIndex: 30,
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '4px 10px',
      background: 'rgba(13,22,27,.78)',
      border: '1px solid rgba(229,237,233,.16)',
      borderRadius: 999,
      pointerEvents: 'none',
    }}>
      <img src="/icons/popups/gold.webp" alt="" draggable={false}
        style={{ width: 16, height: 16, objectFit: 'contain' }} />
      <span className="bt-coin-glimmer" style={{
        color: COL.gold, fontSize: 14, fontWeight: 800,
        fontVariantNumeric: 'tabular-nums', lineHeight: 1,
      }}>{Number(gold).toLocaleString()}</span>
    </div>
  );
};

const chipStyle = {
  width: 34, height: 34,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: COL.text,
  fontFamily: 'inherit',
  fontSize: 20,
  fontWeight: 700,
  lineHeight: 1,
  cursor: 'pointer',
  flex: '0 0 auto',
};
