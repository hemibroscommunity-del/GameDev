import React from 'react';
import { COL } from './common.js';
import { getBagEntries } from './bagModel.js';
import { BagTile } from './InventoryPanel.jsx';
import { BagFilterChips } from './BagFilterChips.jsx';
import { bagFilterBus } from './bagFilterBus.js';
import { COMBAT_SKILLS, skillLevel } from '../sheet/heroModel.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { requestT2Category } from './T2Panel.jsx';
import { buildSkillUnspent, STAT_TO_WEAPON_CAT } from '../../../data/gameSystems.js';
import { dashTileSize, dashPanelWidths, combatPillWidth, combatPillHeight, BAG_VIEW_COLS, DASH_GAP, DASH_ROWS, BAG_HEADER_H } from '../sheet/sheetGeometry.js';

/* v2.3.1636 (owner, with a reference screenshot of the pre-v2.3.1287
   dashboard): the THREE-COLUMN ROW — BAG / LOADOUT / BUILD restored as
   persistent chrome, replacing the nine-cell quick bar in the same slot.

   "I wanted something like this but even spacing between the 3 columns
   and using the UI theme."  Those two corrections are the whole brief and
   both are load-bearing:
     - EVEN SPACING.  The original columns were content-sized, so BAG came
       out narrow and LOADOUT wide and the row read as three unrelated
       widgets.  repeat(3, 1fr) with one gap value; every column gets the
       same width at every viewport, and the tile size is derived from
       that third (dashTileSize) rather than each column picking its own.
     - THE UI THEME.  The reference is the old navy build with a red bag
       panel; this is Lantern Slate (docs/LANTERN-SLATE-SPEC.md) —
       raised cards on the band, one bgStrong header strip each, brass
       reserved for the ONE thing that is a call to action (unspent
       points).  No second accent colour anywhere in the row.

   THE LABELS ARE THE GAME'S OWN WORDS (owner: "the shortest most
   meaningful labels that a broad audience would understand").  The
   originals were BAG / LOADOUT / BUILD; two of those are genre jargon
   that a first-time player has no way to decode.  Rather than invent
   plainer ones, each column takes the name this game ALREADY uses for
   exactly that thing on a screen one tap away:
     BAG       the nav button directly below it says "Bag" and opens the
               panel this column taps into.  Naming the column
               "Inventory" would make the column and the button look like
               two different destinations.
     EQUIPPED  the Bag panel's own segmented tab (v2.3.1326, owner's
               naming) for the worn six.  Columns one and two are, quite
               literally, that panel's two tabs.
     COMBAT    NOT "Skills" — that word is spoken for by the nav button
               for LIFE skills (cooking/fishing/mining), and pointing two
               controls with one name at different panels is worse than
               any amount of jargon.  Not "Stats" either: these are
               levelled skills you spend points into, not passive
               readouts.
   Shortest that stay meaningful, and nothing here teaches a word that
   is used nowhere else.

   WHY IT REPLACES THE QUICK BAR RATHER THAN JOINING IT (owner's call,
   asked directly): the quick bar showed three bag entries, worn
   chest/legs/weapon and three skills — a strict subset of what these
   columns show, at nine cells the width of a fingertip.  Keeping both
   would have put the same data on screen twice and pushed the band past a
   third of the phone.  The identity row (v2.3.1635) stays: it carries
   name/level/XP/gold, which no column shows.

   EVERY TAP ROUTES THROUGH THE SAME BUS its full-size counterpart uses —
   the rule the quick bar set at v2.3.1560 and the reason this row cannot
   drift from the panels it summarises.  Nothing here can change game
   state on its own; it is read-only state plus a bus call. */

/* v2.3.1639 (owner: "get rid of the labels for bag, equipped, and combat
   and use the extra space to fit the 6 slots as evenly as you can").  The
   header strip is gone; each panel is now nothing but its six slots.

   The labels were doing real work at v2.3.1636 — they are how you learn
   which third is which — but they cost 17px of a ~85px panel to say
   something the CONTENTS say once you have looked twice: items, worn
   gear, skill icons.  With them gone the grid distributes over the whole
   panel instead of a strip beneath a caption. */
const Column = ({ children, onTap, label }) => (
  <div
    role={onTap ? 'button' : undefined}
    aria-label={label}
    onPointerUp={onTap ? (e) => { e.stopPropagation(); onTap(); } : undefined}
    style={{
      background: COL.raised,
      border: `1px solid ${COL.border}`,
      borderRadius: 9,
      display: 'flex', flexDirection: 'column',
      /* v2.3.1640: ONE gap value on every axis — the panel's own padding
         and the space between its two tile rows are the same DASH_GAP the
         frame and the tile rows use.  space-evenly is gone with it: the
         panel is now exactly as tall as its contents, so there is no
         surplus left to distribute and 'evenly' would only reintroduce
         the uneven edges this removes. */
      alignItems: 'center', justifyContent: 'center',
      padding: DASH_GAP, gap: DASH_GAP,
      minWidth: 0, overflow: 'hidden',
      cursor: onTap ? 'pointer' : 'default',
    }}>{children}</div>
);

/* Both grid columns lay their tiles out three across, two down — the same
   rhythm, so the eye reads one row of six per column rather than three
   different grids. */
const tileRow = { display: 'flex', gap: DASH_GAP, justifyContent: 'center' };

export const DashColumns = ({ R }) => {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
  const t = dashTileSize(vw);
  const panelW = dashPanelWidths(vw);
  const rpg = R || {};
  const [bagFilter, setBagFilter] = React.useState(bagFilterBus.get());
  React.useEffect(() => bagFilterBus.subscribe(setBagFilter), []);

  /* ── BAG ── */
  /* v2.3.1653: the dashboard's bag IS the bag now, so it obeys the filter
     its own header sets — a header that changed a different screen's list
     would be the worst of both. */
  const entries = getBagEntries(R).filter(e => bagFilter === 'all' || e.cat === bagFilter);
  const openBag = () => dashboardPanelBus.open('bag');
  /* v2.3.1649 (owner: "I think 4 slots can only be visible on the
     dashboard.  The rest can be put into full bag view"): FOUR cells —
     BAG_COLS across, DASH_ROWS down.  The +N overflow chip still rides the
     last cell, and it is doing more work than it used to: with four
     previews instead of nine it is the honest "there is more in here"
     marker AND the tap target that opens the full bag. */
  const BAG_CELLS = BAG_VIEW_COLS * DASH_ROWS;
  const shown = entries.length > BAG_CELLS ? entries.slice(0, BAG_CELLS - 1) : entries.slice(0, BAG_CELLS);
  const overflow = entries.length > BAG_CELLS ? entries.length - (BAG_CELLS - 1) : 0;
  const bagCells = [];
  for (let i = 0; i < BAG_CELLS; i++) {
    if (i === BAG_CELLS - 1 && overflow > 0) {
      bagCells.push(
        <div key="bag-more" onPointerUp={(e) => { e.stopPropagation(); openBag(); }}
          title={`${overflow} more — open the Bag`}
          style={{
            width: t, height: t, flex: 'none',
            background: COL.wellSoft, border: `1px solid ${COL.tileBor}`, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 800, color: COL.text2,
            fontVariantNumeric: 'tabular-nums', cursor: 'pointer',
          }}>+{overflow}</div>
      );
    } else if (shown[i]) {
      bagCells.push(
        <div key={`bag-${i}`} style={{ width: t, height: t, flex: 'none' }}>
          <BagTile entry={shown[i]} style={{ width: t, height: t, aspectRatio: 'auto' }} />
        </div>
      );
    } else {
      bagCells.push(
        <div key={`bag-${i}`} onPointerUp={(e) => { e.stopPropagation(); openBag(); }}
          style={{
            width: t, height: t, flex: 'none',
            background: COL.well, border: `1px solid ${COL.tileBor}`, borderRadius: 6,
            cursor: 'pointer',
          }} />
      );
    }
  }

  /* ── LOADOUT ── */
  /* v2.3.1653 (owner: "move the equipped view to be merged with the
     character overview so the equipped slots are grouped on the left and
     the player stats are shown on the right").  The EQUIPPED panel is gone
     from the band; its slots, its picker wiring and its stat cards now
     live in Hero > Overview (HeroExpanded), where there is width for the
     numbers that were never shown beside them here.

     THAT MOVE REVIVES DEAD CODE rather than writing new: getEquipContribs
     (v2.3.1328) built per-item contribution cards and an equipment TOTALS
     readout that have not rendered anywhere since the Bag's Equipped tab
     was retired at v2.3.1639.  They are what "the player stats ...
     contextually changes if you are selecting an equipped item" asks for,
     and they were already correct — only unreachable. */

  /* ── COMBAT ── */
  /* v2.3.1648 (owner: "the combat skills can be changed into just 3: bow,
     melee, and magic.  The hp, defense, and stamina/energy can just be
     reflected in total hp, energy points ... make the three combat skills a
     different shape that fits the space better, does not need to be
     square"):  THREE WIDE PILLS, one per row, replacing six 35px squares.

     WHY THE THREE THAT LEFT ARE NOT MISSED: Vitality, Defense and Stamina
     are the three whose whole output is a resource number, and those
     numbers already read live on the world HUD (the HP and energy bars) —
     which is the owner's own reasoning.  Melee / Bow / Magic are the three
     that answer a question no bar can: which weapon class am I actually
     built for.

     COMBAT_SKILLS ITSELF STILL HAS ALL SIX and must keep them — Hero's
     build cards and the T2 spend screens enumerate that array, and dropping
     entries there would make three skills unspendable.  This is a
     presentation slice (0..3), nothing more.

     THE PILL IS WHERE THE LEGIBILITY COMES FROM.  A square in a narrow
     column held a 28px icon and a 9px corner digit; the pill's 82px of
     width holds a 33px icon AND the level at 16px — bigger than anything
     else on the band, for the one number this panel exists to tell you.

     NO TEXT LABEL, tried and measured: "MELEE" at 10px beside a 26px icon
     needed ~87px and rendered ellipsised to "M…" — which is worse than no
     label at all, since Melee and Magic both truncate to the same letter.
     Widening the column enough to fit the words costs the bag squares 3px
     each, and the squares are what the owner's complaint is about.  The
     three glyphs (sword / bow / wand) are the same ones Hero's build cards
     label in full, one tap away, and both aria-label and title spell it
     out here for anyone who needs it read aloud. */
  const pillW = combatPillWidth(vw);
  const pillH = combatPillHeight(vw);
  const combatPill = (s) => {
    const unspent = buildSkillUnspent(rpg, s.key);
    const lvl = skillLevel(rpg, s.key);
    const cat = STAT_TO_WEAPON_CAT[s.key];
    return (
      <div key={s.key}
        role="button"
        className={unspent > 0 ? 'bt-build-flash' : undefined}
        onPointerUp={(e) => {
          e.stopPropagation();
          dashboardPanelBus.open('hero');
          if (cat) { requestT2Category(cat); dashboardPanelBus.push('t2'); }
        }}
        aria-label={`${s.label} level ${lvl}`}
        title={`${s.label} — Lv ${lvl}${unspent > 0 ? `, ${unspent} unspent` : ''}`}
        style={{
          width: pillW, height: pillH, flex: 'none', boxSizing: 'border-box',
          display: 'flex', flexDirection: 'row', alignItems: 'center',
          justifyContent: 'space-between', gap: 4, padding: '0 8px 0 4px',
          background: unspent > 0 ? COL.accentFill : COL.wellSoft,
          border: `1px solid ${unspent > 0 ? COL.accent : COL.tileBor}`,
          /* Fully-rounded ends: the same pill the nav buttons use, so the
             one non-square thing on the row reads as deliberate rather
             than as a square that failed to fit. */
          borderRadius: 999,
          cursor: 'pointer', touchAction: 'manipulation',
        }}>
        <img src={s.iconSrc} alt="" draggable={false}
          style={{
            width: pillH - 8, height: pillH - 8,
            flex: 'none', objectFit: 'contain', pointerEvents: 'none',
          }} />
        {/* The level, at 16px on its own — it was a 9px corner digit through
            v2.3.1647, which is the exact kind of number the owner said a
            player with weaker sight cannot read. */}
        <span aria-hidden="true" style={{
          flex: 'none',
          fontSize: 16, fontWeight: 900, lineHeight: 1,
          color: unspent > 0 ? COL.accent : COL.text,
          fontVariantNumeric: 'tabular-nums', pointerEvents: 'none',
        }}>{unspent > 0 ? `+${unspent}` : lvl}</span>
      </div>
    );
  };

  return (
    <div className="bt-dashcols" style={{
      display: 'grid',
      /* v2.3.1636's "three equal thirds" is now WIDE / WIDE / NARROW — see
         dashPanelWidths.  Equal thirds capped the bag square at 35px, and
         the owner's legibility complaint outranks the visual rule the
         equality was there to serve.  The two panels that hold squares are
         still exactly equal to each other; only COMBAT, whose contents are
         a different shape on purpose, is narrower. */
      gridTemplateColumns: `${panelW.wide}px ${panelW.narrow}px`,
      justifyContent: 'center',
      gap: DASH_GAP,
      height: '100%', boxSizing: 'border-box',
      padding: DASH_GAP,
      /* The bottom rule is the ONLY chrome — the row must read as part of
         the band, not as three floating widgets over the world. */
      borderBottom: `1px solid ${COL.divider}`,
    }}>
      {/* v2.3.1653: the BAG panel is the dashboard's main event now —
          BAG_VIEW_COLS across with its own filter header, which is the
          "make the dashboard view the main bag view" ask plus "the
          dashboard view's bag slots also get the filters as the headers"
          in one panel.  The header is sized from the same COLS/TILE the
          rows use, so each chip lands one slot wide. */}
      <Column label="Bag" onTap={openBag}>
        <BagFilterChips
          width={BAG_VIEW_COLS * t + (BAG_VIEW_COLS - 1) * DASH_GAP}
          height={BAG_HEADER_H} />
        {Array.from({ length: DASH_ROWS }, (_, r) => (
          <div key={`bagrow-${r}`} style={tileRow}>{bagCells.slice(r * BAG_VIEW_COLS, r * BAG_VIEW_COLS + BAG_VIEW_COLS)}</div>
        ))}
      </Column>

      {/* v2.3.1648: three pills stacked over the same inner height the
          bag's rows occupy, so both panels end on one baseline even though
          neither holds the same number of things.
          v2.3.1653 (owner: "the combat stats stay on the right in their own
          column"): unchanged, and now the only company the bag has. */}
      <Column label="Combat">
        {COMBAT_SKILLS.slice(0, 3).map(combatPill)}
      </Column>
    </div>
  );
};
