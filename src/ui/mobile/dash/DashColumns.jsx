import React from 'react';
import { COL } from './common.js';
import { getBagEntries } from './bagModel.js';
import { BagTile } from './InventoryPanel.jsx';
import { itemDetailBus } from './itemDetailBus.js';
import { IconCell, WeaponCell } from './dashCells.jsx';
import { getEquippedSlots, GHOST_SRC } from '../sheet/equipModel.js';
import { COMBAT_SKILLS, skillLevel } from '../sheet/heroModel.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { requestT2Category } from './T2Panel.jsx';
import { buildSkillUnspent, STAT_TO_WEAPON_CAT, calcDisplayDmgRange, calcDisplayDps, getActiveWeapon } from '../../../data/gameSystems.js';
import { dashTileSize, dashPanelWidths, combatPillWidth, equipCellSize, DASH_GAP, DASH_ROWS } from '../sheet/sheetGeometry.js';

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
  const eq = equipCellSize(vw);
  const rpg = R || {};

  /* ── BAG ── */
  const entries = getBagEntries(R);
  const openBag = () => dashboardPanelBus.open('bag');
  /* v2.3.1647: the bag fills EVERY row the panel has — nine at three rows
     — because it is the only panel with more to show than six.  The +N
     still rides the last cell when there is more than even that. */
  const BAG_CELLS = 3 * DASH_ROWS;
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
            fontSize: 10, fontWeight: 800, color: COL.text2,
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
  const equipped = getEquippedSlots(rpg);
  const bySlot = (s) => equipped.find(e => e.slot === s);
  const wpn = getActiveWeapon(rpg);
  const range = wpn ? calcDisplayDmgRange(rpg, wpn) : null;
  const dps = range ? calcDisplayDps(rpg, wpn) : 0;
  const dpsText = Math.round(dps * 10) / 10;
  const openPicker = (slot) => (anchor) => {
    const st = itemDetailBus.state;
    if (st && st.open && st.target && st.target.kind === 'loadout' && st.target.slot === slot) {
      itemDetailBus.close();
      return;
    }
    itemDetailBus.open({ kind: 'loadout', slot, anchor, panel: null });
  };
  const wpnSlot = bySlot('weapon');
  /* v2.3.1648: TWO per row over THREE rows, not three over two — see
     equipCellSize.  Weapon leads the top-left, where the eye lands first
     (it led the top-MIDDLE under the old three-across order, for the same
     reason); armour then reads down in worn order. */
  const loadoutRows = [
    ['weapon', 'shield'],
    ['chest', 'legs'],
    ['amulet', 'cape'],
  ];
  const equipCell = (slotName) => {
    const sl = bySlot(slotName);
    if (!sl) return <div key={`eq-${slotName}`} style={{ width: eq.w, height: eq.h, flex: 'none' }} />;
    /* Weapon keeps the tap-swaps / hold-picks gesture from v2.3.1562.
       With no weapon there is nothing to swap TO, so it falls back to the
       plain picker cell — the quick bar's own fallback. */
    if (slotName === 'weapon' && wpnSlot && !wpnSlot.ghost) {
      return (
        <WeaponCell key="eq-weapon" size={eq.w} h={eq.h} src={wpnSlot.iconSrc}
          slotLabel={rpg.activeSlot === 'ranged' ? 'Bow' : rpg.activeSlot === 'staff' ? 'Staff' : 'Melee'}
          onHold={openPicker('weapon')} />
      );
    }
    return (
      <IconCell key={`eq-${slotName}`} size={eq.w} h={eq.h}
        src={sl.iconSrc || GHOST_SRC[slotName]} dim={sl.ghost}
        alt={sl.label} title={sl.label}
        onTap={sl.pickerSlot ? openPicker(sl.pickerSlot) : undefined} />
    );
  };

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
          width: pillW, height: t, flex: 'none', boxSizing: 'border-box',
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
            width: t - 8, height: t - 8,
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
      gridTemplateColumns: `${panelW.wide}px ${panelW.wide}px ${panelW.narrow}px`,
      justifyContent: 'center',
      gap: DASH_GAP,
      height: '100%', boxSizing: 'border-box',
      padding: DASH_GAP,
      /* The bottom rule is the ONLY chrome — the row must read as part of
         the band, not as three floating widgets over the world. */
      borderBottom: `1px solid ${COL.divider}`,
    }}>
      {/* v2.3.1639 (owner: "display inventory slots on dashboard and bag
          window views, remove empty bag message placeholder").  The six
          slots render unconditionally — an empty bag now reads as six
          empty slots, the same shape as a full one, which is also how the
          Bag panel itself has always drawn it.  The old two-line message
          made the empty state a DIFFERENT layout from every other state,
          so the column changed shape the moment you picked something up. */}
      <Column label="Bag" onTap={openBag}>
        {Array.from({ length: DASH_ROWS }, (_, r) => (
          <div key={`bagrow-${r}`} style={tileRow}>{bagCells.slice(r * 3, r * 3 + 3)}</div>
        ))}
      </Column>

      <Column label="Equipped">
        {/* v2.3.1637: DMG/DPS left this column for the identity row
            (owner: "put the dmg and DPS up on the character row above the
            dashboard columns").  It is NOT also drawn here — the band's
            one-count rule, the same one that retired the floating gold
            chip at v2.3.1635.  The whole body is the six slots now. */}
        {loadoutRows.map((row, i) => (
          <div key={`eqrow-${i}`} style={tileRow}>{row.map(equipCell)}</div>
        ))}
      </Column>

      {/* v2.3.1648: three pills, one per tile ROW, so COMBAT lines up with
          the bag's three rows exactly — the row rhythm the other two panels
          set is what makes the different shape read as intentional. */}
      <Column label="Combat">
        {COMBAT_SKILLS.slice(0, 3).map(combatPill)}
      </Column>
    </div>
  );
};
