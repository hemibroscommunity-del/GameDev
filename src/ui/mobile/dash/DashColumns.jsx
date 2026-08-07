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
import { dashTileSize } from '../sheet/sheetGeometry.js';

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

const Column = ({ title, children, onTap }) => (
  <div
    onPointerUp={onTap ? (e) => { e.stopPropagation(); onTap(); } : undefined}
    style={{
      background: COL.raised,
      border: `1px solid ${COL.border}`,
      borderRadius: 9,
      display: 'flex', flexDirection: 'column',
      minWidth: 0, overflow: 'hidden',
      cursor: onTap ? 'pointer' : 'default',
    }}>
    <div style={{
      flex: 'none',
      background: COL.bgStrong,
      borderBottom: `1px solid ${COL.border}`,
      textAlign: 'center',
      fontSize: 9, fontWeight: 800, letterSpacing: '.14em',
      color: COL.muted, lineHeight: 1, padding: '4px 0',
    }}>{title}</div>
    <div style={{
      flex: 1, minHeight: 0, minWidth: 0,
      /* v2.3.1637 (owner: "it needs to fill the space better (the
         slots)"): space-evenly, not centre.  The rail's six buttons set
         a taller band than three columns of tiles need, and centring
         left that surplus as one dead block under the tiles instead of
         spreading it between them. */
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'space-evenly',
      padding: '4px 2px', gap: 3,
    }}>{children}</div>
  </div>
);

/* Both grid columns lay their tiles out three across, two down — the same
   rhythm, so the eye reads one row of six per column rather than three
   different grids. */
const tileRow = { display: 'flex', gap: 3, justifyContent: 'center' };

export const DashColumns = ({ R }) => {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
  const t = dashTileSize(vw);
  const rpg = R || {};

  /* ── BAG ── */
  const entries = getBagEntries(R);
  const openBag = () => dashboardPanelBus.open('bag');
  /* Six tiles fit the two-row rhythm; a seventh item becomes a +N on the
     last one rather than a third row nobody has the height for. */
  const shown = entries.length > 6 ? entries.slice(0, 5) : entries.slice(0, 6);
  const overflow = entries.length > 6 ? entries.length - 5 : 0;
  const bagCells = [];
  for (let i = 0; i < 6; i++) {
    if (i === 5 && overflow > 0) {
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
  /* The reference's order, kept: worn armour reads left-to-right on the
     top row with the weapon in the middle where the eye lands first. */
  const loadoutRow1 = ['chest', 'weapon', 'shield'];
  const loadoutRow2 = ['legs', 'amulet', 'cape'];
  const equipCell = (slotName) => {
    const sl = bySlot(slotName);
    if (!sl) return <div key={`eq-${slotName}`} style={{ width: t, height: t, flex: 'none' }} />;
    /* Weapon keeps the tap-swaps / hold-picks gesture from v2.3.1562.
       With no weapon there is nothing to swap TO, so it falls back to the
       plain picker cell — the quick bar's own fallback. */
    if (slotName === 'weapon' && wpnSlot && !wpnSlot.ghost) {
      return (
        <WeaponCell key="eq-weapon" size={t} src={wpnSlot.iconSrc}
          slotLabel={rpg.activeSlot === 'ranged' ? 'Bow' : rpg.activeSlot === 'staff' ? 'Staff' : 'Melee'}
          onHold={openPicker('weapon')} />
      );
    }
    return (
      <IconCell key={`eq-${slotName}`} size={t}
        src={sl.iconSrc || GHOST_SRC[slotName]} dim={sl.ghost}
        alt={sl.label} title={sl.label}
        onTap={sl.pickerSlot ? openPicker(sl.pickerSlot) : undefined} />
    );
  };

  /* ── BUILD ── */
  const buildTile = (s) => {
    const unspent = buildSkillUnspent(rpg, s.key);
    /* v2.3.1313's map: Vitality and Stamina are 'hp' and 'endurance', not
       their stat keys — getting this wrong makes the tile a dead button. */
    const cat = s.key === 'defense' ? 'defense'
      : s.key === 'vitality' ? 'hp'
      : s.key === 'endurance' ? 'endurance'
      : STAT_TO_WEAPON_CAT[s.key];
    return (
      <div key={s.key}
        className={unspent > 0 ? 'bt-build-flash' : undefined}
        onPointerUp={(e) => {
          e.stopPropagation();
          dashboardPanelBus.open('hero');
          if (cat) { requestT2Category(cat); dashboardPanelBus.push('t2'); }
        }}
        title={`${s.label} — Lv ${skillLevel(rpg, s.key)}${unspent > 0 ? `, ${unspent} unspent` : ''}`}
        style={{
          width: t, flex: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
          cursor: 'pointer', touchAction: 'manipulation',
        }}>
        <div style={{
          position: 'relative',
          width: t, height: t,
          background: unspent > 0 ? COL.accentFill : COL.wellSoft,
          border: `1px solid ${unspent > 0 ? COL.accent : COL.tileBor}`,
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src={s.iconSrc} alt="" draggable={false}
            style={{ width: '80%', height: '80%', objectFit: 'contain', pointerEvents: 'none' }} />
        </div>
        <span style={{
          fontSize: 10, fontWeight: 800, lineHeight: 1,
          color: unspent > 0 ? COL.accent : COL.text2,
          fontVariantNumeric: 'tabular-nums', pointerEvents: 'none',
        }}>{unspent > 0 ? `+${unspent}` : skillLevel(rpg, s.key)}</span>
      </div>
    );
  };

  return (
    <div className="bt-dashcols" style={{
      display: 'grid',
      /* The owner's correction, in one line: three equal thirds, one gap. */
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 8,
      height: '100%', boxSizing: 'border-box',
      padding: '0 4px 4px',
      /* The bottom rule is the ONLY chrome — the row must read as part of
         the band, not as three floating widgets over the world. */
      borderBottom: `1px solid ${COL.divider}`,
    }}>
      <Column title="BAG" onTap={entries.length ? undefined : openBag}>
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', color: COL.muted, fontSize: 11, lineHeight: 1.35 }}>
            Empty.<br />Tap to open.
          </div>
        ) : (
          <>
            <div style={tileRow}>{bagCells.slice(0, 3)}</div>
            <div style={tileRow}>{bagCells.slice(3, 6)}</div>
          </>
        )}
      </Column>

      <Column title="EQUIPPED">
        {/* v2.3.1637: DMG/DPS left this column for the identity row
            (owner: "put the dmg and DPS up on the character row above the
            dashboard columns").  It is NOT also drawn here — the band's
            one-count rule, the same one that retired the floating gold
            chip at v2.3.1635.  The whole body is the six slots now. */}
        <div style={tileRow}>{loadoutRow1.map(equipCell)}</div>
        <div style={tileRow}>{loadoutRow2.map(equipCell)}</div>
      </Column>

      <Column title="COMBAT">
        <div style={tileRow}>{COMBAT_SKILLS.slice(0, 3).map(buildTile)}</div>
        <div style={tileRow}>{COMBAT_SKILLS.slice(3, 6).map(buildTile)}</div>
      </Column>
    </div>
  );
};
