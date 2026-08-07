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
import { getFacialHair } from '../../rendering/traits/facialHairCatalog.js';
import { getFacialHairColor, facialHairColorTarget, onFacialHairColorChange } from '../../rendering/traits/facialHairColorCatalog.js';
import { getHeadwear, onHeadwearChange } from '../../rendering/traits/headwearCatalog.js';
import { getShirt, onShirtChange } from '../../rendering/traits/shirtCatalog.js';
import { getShirtColor, shirtColorTarget, onShirtColorChange } from '../../rendering/traits/shirtColorCatalog.js';
import { getEquip } from '../../rendering/gearCatalog.js';
import { dashboardPanelBus } from './dashboardPanelBus.js';
import { barHeight, expandedSheetHeight, drillSheetHeight } from './sheet/sheetGeometry.js'; /* v2.3.1283; v2.3.1350 two-state; v2.3.1311e drill height; v2.3.1325 slot-derived bar */
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
const RAIL_ORDER = ['bag', 'more'];
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
    const stamp = () => {
      const mode = dashboardPanelBus.state.mode;
      document.documentElement.dataset.btSheet = mode;
      /* v2.3.1311e: drill panels (stack depth > 1) use the taller sheet. */
      const px = mode === 'expanded' ? (dashboardPanelBus.state.stack.length > 1 ? snapPxRef.current.drill : snapPxRef.current.expanded)
        : barHeight(window.innerWidth, window.innerHeight);
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
  /* v2.3.1283: snap heights — recomputed on viewport changes with the
     same iOS-keyboard guard the canvas resize uses: when the keyboard
     shrinks visualViewport, HOLD the last value so the sheet doesn't
     jump under the chat composer.  v2.3.1350: the compact snap left
     with the compact state. */
  const [snapPx, setSnapPx] = useState(() => ({
    expanded: expandedSheetHeight(window.innerWidth, window.innerHeight),
    drill: drillSheetHeight(window.innerWidth, window.innerHeight),
  }));
  useEffect(() => {
    const vv = window.visualViewport;
    const recompute = () => {
      const vw = vv ? vv.width : window.innerWidth;
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
     writer to the band's height.  The snapPx ref feeds the <html>
     stamp effect.  toolbarRef stays on the frame (tutorial anchoring +
     any future gesture surface). */
  const snapPxRef = useRef(snapPx);
  snapPxRef.current = snapPx;
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

  /* v2.3.1642: litId and the badge counts were computed inside the
     retired ribbon's render IIFE.  The nav group needs them one level up
     now that it lives in the top row, so they are hoisted verbatim —
     same rules, same sources, just evaluated before the return. */
  /* v2.3.1290: bar mode = NOTHING lit — the resting state has no open
     destination (the remembered root only matters for resume). */
  const litId = mode === 'bar' ? null
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
        height: mode === 'expanded' ? (stack.length > 1 ? snapPx.drill : snapPx.expanded) + 'px' /* v2.3.1311e: drill = taller */
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
      {/* v2.3.1307/1311: the top-edge drag handle is gone — band-wide
          swipes are retired (owner: too ambiguous over interactive
          menus; a handle with no gesture behind it is a lie).  Resizing
          lives on the toolbar: tap cycle + icon swipes + chevrons. */}
      {active ? (
        <>
          {/* v2.3.1350 (owner: "remove the headers — it's redundant"):
              ROOT panels have no header strip — the lit toolbar button
              already names the destination, and the freed 44px goes to
              content (the Bag's second item row was the motivating
              case).  DRILL children (Settings, Build, quest detail...)
              keep a slim header: their titles are NOT on the toolbar
              and the back-chip is the way out.  44px minimum so back
              meets the 44pt touch rule (Lantern Slate §9). */}
          {stack.length > 1 && (
            <div style={{
              height: 44,
              flex: '0 0 44px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 8px',
              borderBottom: `1px solid ${COL.divider}`,
              gap: 8,
            }}>
              <button
                onPointerUp={(e) => { e.stopPropagation(); dashboardPanelBus.pop(); }}
                className="bt-chisel bt-chisel--chip"
                style={chipStyle}
              >◂</button>
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
              {/* v2.3.1307: the header ▾ chevron chip (v2.3.1290) is
                  removed — the owner made the toolbar-icon swipe the ONE
                  resize control, and a second down-path here undercut
                  that.  A width-matched spacer keeps the title centered
                  against the back-chip. */}
              <span style={{ width: 32, flex: '0 0 32px' }} aria-hidden="true" />
            </div>
          )}
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
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 'calc(var(--dash-h, 145px) - var(--cols-h, 93px))' }}>
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
      <div style={{
        position: 'absolute',
        left: 0, right: 0,
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--cols-h, 93px))',
        height: 'calc(var(--dash-h, 145px) - var(--cols-h, 93px))',
        zIndex: 3,
        boxSizing: 'border-box',
        padding: '0 4px',
        display: 'flex', alignItems: 'center', gap: 6,
        borderBottom: mode === 'expanded' ? 'none' : `1px solid ${COL.divider}`,
      }}>
        <NavRail
          items={RAIL_ITEMS}
          litId={litId}
          atRest={mode === 'bar'}
          vw={typeof window !== 'undefined' ? window.innerWidth : 390}
          vh={typeof window !== 'undefined' ? window.innerHeight : 844}
          dots={dots}
          profilePortrait={profilePortrait} />
        {mode !== 'expanded' && (
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
            <IdentityStrip band />
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
      {mode !== 'expanded' && (
        <div style={{
          position: 'absolute',
          left: 0, right: 0,
          bottom: 'env(safe-area-inset-bottom, 0px)',
          zIndex: 2,
          boxSizing: 'border-box',
          /* v2.3.1635: its OWN height, not calc(--dash-h - --nav-h).  With
             the identity row added that subtraction became "middle row +
             identity row" and would have stretched this over both. */
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
