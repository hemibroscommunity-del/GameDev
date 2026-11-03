import React from 'react';
import { COL, getState, qualityInk, QUALITY_LABEL } from './common.js';
import { getBagEntries } from './bagModel.js';
import { BagTile, GEAR_SEL_RING } from './InventoryPanel.jsx';
import { GEAR_FILTER_GROUPS, GEAR_FILTERS, GEAR_CELLS, gearCell } from './itemCategory.js';
import { gearTabBus } from './gearTabBus.js';
import { itemActionList, runItemAction, entryTarget } from './itemActions.js';
import { resolveItemCard } from './ItemDetailPopup.jsx';
import { itemDetailBus } from './itemDetailBus.js';
import { weaponSlotFor, unequipWeaponSlot, unequipShieldDirect, unequipArmorDirect, unequipLegsDirect, unequipGearDirect } from './equipActions.js';
import { weaponRows, shieldRows, armourRows, compareRows, charLevel } from './gearStats.js';
import { combatSkillByKey, combatSkillState, WEAPON_SKILLS } from './combatSkill.js';
import { WeaponBar } from './WeaponBar.jsx';
import { requestT2Category } from './T2Panel.jsx';
import { getEquippedSlots, getEquipContribs, wpnIconSrc, weaponDisplayName, GHOST_SRC } from '../sheet/equipModel.js';
import { heroSectionBus } from '../sheet/heroSectionBus.js';
import { VitalBar, VITAL_ICONS, VITAL_LABEL } from '../sheet/VitalBar.jsx';   /* v2.3.4101: the overview's bars, the Character page's own */
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { shopBus } from '../shopBus.js';
import { registerXpCard, displayXp, xpCounting } from '../../xpLanding.js';
import { getEquip } from '../../../rendering/gearCatalog.js';
import { WEAPON_STASH_MAX, toDisplayHp } from '../../../data/gameSystems.js';
import { gemCutKey, gemIcon, gemElementName } from '@/data/gems.js';
import { coinArtFor } from '@/game/coinArt.js';   /* v2.3.4101: the coins beside the filter */
import { UnrevealedMark } from '@/ui/reveal/UnrevealedMark.jsx';   /* v2.3.4101: a "?" piece's mark, as on its card */
import { deskWords } from '@/game/deskWords.js';

/* ═══ v2.3.4101: THE GEAR TAB -- YOUR BAG, ONE CARD, YOUR GEAR ═══
 *
 * The owner's design (2026-11-02): three panels, "inventory on left with
 * filter on top ... the furthest right tab has all the equipped items
 * (tapping on an item highlights it in blue to show active press but
 * highlighted yellow shows what's 'on')".  It is the resting dashboard -- what
 * the bag button opens -- in all three of its homes: the upright phone's
 * band, the sideways phone's column, the computer's column.
 *
 * AS THE OWNER'S SECOND MOCKUP DRAWS IT (2026-11-03: "Inventory slots too
 * cramped. Changed to 9 visible slots", and "The middle panel should function
 * as one contextual information card, without tabs or a character portrait"):
 *   LEFT    "All Items" (a funnel, the words, a chevron) with your coins
 *           beside it, over a bag of THREE square slots a row, three rows in
 *           view (nine), the rest by scrolling, empty squares filling the view;
 *   MIDDLE  ONE card.  Nothing picked: "<name> Lv N", the HP, MP and EN bars
 *           (stamina IS the game's energy: VitalBar's "EN", one resource, so
 *           one bar), then DEF DODGE RESIST | DMG SPD CRIT RANGE.  Something
 *           picked: its picture in a frame, its name in its grade's colour,
 *           its kind, "Qty: N" for a stack, what the game says it is for, and
 *           for gear its numbers against what you wear (green / red), then its
 *           one main button and the rest small under it;
 *   RIGHT   "Equipped" over Sword Bow Staff / Chest Legs Cape / Shield Amulet
 *           Gem.
 *
 * LAID OUT FROM ITS OWN BOX, NOT THE DEVICE.  The root measures itself
 * (ResizeObserver): wide enough (WIDE_AT) and the three panels sit across --
 * the gear 26% (never under three 34 px cells), the card 33% (never under
 * MID_MIN), the bag the rest; narrower (the sideways ~238 px column) and the
 * bag takes the top, the card and the gear side by side under it.  The bag's
 * squares are as big as three across and three down allow, so a taller or
 * wider band (Lane B's ?oneband=1) simply makes them bigger.
 *
 * WHAT A TAP DOES (gearTabBus.js holds the state and the rules):
 *   a cell    blue ring; the bag filters to its kind ("Filter: Swords" and its
 *             ×); the card shows that item with ONE button, Unequip -- tapped
 *             again, both go;
 *   a bag piece  blue ring; the card shows it, compared against what is in
 *             its slot ("old → new", green better, red worse), then its
 *             buttons from the one action list (itemActions.js);
 *   the bag's empty space, or the picked piece again: back to the overview;
 *   Equip / Unequip  the automatic filter goes back to "All Items".
 * The weapon in your hand wears GOLD (its edge and a glow); the cell you
 * tapped the BLUE ring outside it; both can show.  Each weapon cell wears its
 * combat skill's level ("Lv 7", or "+2" with points to spend) small in its
 * corner -- the band's three combat-skill pills left with the Gear tab -- and
 * a thin XP bar along its foot, the pills' own count-up (xpLanding).
 *
 * This retires, for the bag, the notes "a Bag button", "Worn gear back on the
 * band" and "an item card that pushes the character or vitals around"
 * (docs/UI-DESIGN-NOTES.md, "The Gear tab").
 */

const PAD = 3;      /* the panels' own padding */
const GAP = 3;      /* between the panels */
const TG = 4;       /* between the bag's squares (the mockup's wider gutter) */
const EP = 3;       /* the equipment panel's padding */
const CELL_MIN = 34;   /* the floor for an equipment cell */
const TILE_MIN = 34;   /* ...and for a bag square */
const BAG_COLS = 3;    /* v2.3.4101: the owner's "9 visible slots": three by three */
const BAG_ROWS = 3;
const MID_MIN = 120;   /* the card: three bars and two columns of numbers */
const BAG_MIN = BAG_COLS * TILE_MIN + (BAG_COLS - 1) * TG + 2 * PAD;
const EQ_MIN = 3 * CELL_MIN + 2 * 3 + 2 * EP;
const WIDE_AT = BAG_MIN + EQ_MIN + MID_MIN + 2 * PAD + 2 * GAP;
const HDR_H = 34;      /* the bag's filter-and-coins row (its controls 32 px: the UI review's floor for a finger) */
const EQ_HEAD = 18;    /* "Equipped" */

const CELL_SKILL = { sword: 'power', bow: 'agility', staff: 'mind' };
const HAND_FIELD = { melee: 'weapon', ranged: 'rangedWeapon', staff: 'staffWeapon' };

/* what each slot is, in one plain sentence */
const SLOT_SENTENCE = {
  sword: 'A melee weapon: swing it up close.',
  bow: 'Shoots arrows from a distance.',
  staff: 'Casts magic orbs that fly at your target.',
  shield: 'Raise it to block a hit.',
  chest: 'Cuts the damage of every hit you take.',
  legs: 'Cuts the damage of every hit you take.',
  cape: 'A contest prize, worn on your back.',
  amulet: 'Adds its gem’s power to your fighting.',
};

const rarityEdge = (q) => (q === 'rare' ? { c: '#5B99DE', w: 2, cls: 'ls-slot--rare' }
  : q === 'elite' ? { c: '#E8893A', w: 2, cls: 'ls-slot--legendary' }
  : q === 'godly' ? { c: 'transparent', w: 2, cls: 'ls-slot--godly' }
  : { c: 'rgba(139, 150, 149, 0.55)', w: 1, cls: '' });

function useMeasure() {
  const ref = React.useRef(null);
  const [box, setBox] = React.useState({ w: 0, h: 0 });
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => {
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width), h = Math.round(r.height);
      setBox((b) => (b.w === w && b.h === h ? b : { w, h }));
    };
    read();
    let ro = null;
    try { ro = new ResizeObserver(read); ro.observe(el); } catch (e) { /* an old browser: the first read stands */ }
    return () => { try { ro && ro.disconnect(); } catch (e) { /* gone */ } };
  }, []);
  return [ref, box];
}

/* The equipped piece in a cell, as { item, icon, quality, name, target, rows }.
   `target` is what the cell's Unequip acts on (null: no button). */
function cellContent(R, id, slots) {
  const c = gearCell(id);
  if (c.field) {
    const wpn = R[c.field] || null;
    return {
      item: wpn, icon: wpn ? wpnIconSrc(R, wpn) : null, quality: wpn && wpn.quality,
      name: wpn ? weaponDisplayName(wpn) : '',
      unequip: wpn ? () => unequipWeaponSlot(c.active === 'melee' ? 'weapon' : c.active) : null,
      rows: wpn ? weaponRows(R, wpn) : [],
    };
  }
  const sl = slots.find((x) => x.slot === id);
  if (id === 'shield') {
    return { item: R.shield || null, icon: sl && sl.iconSrc, quality: R.shield && R.shield.quality,
      name: (R.shield && R.shield.name) || 'Shield', unequip: R.shield ? () => unequipShieldDirect() : null,
      rows: shieldRows(R.shield) };
  }
  if (id === 'chest' || id === 'legs') {
    const piece = id === 'chest' ? R.armor : R.legsArmor;
    const gearId = getEquip(id);
    const worn = !!(sl && sl.item);
    const unequip = piece ? () => (id === 'chest' ? unequipArmorDirect() : unequipLegsDirect())
      : (gearId && gearId !== 'none') ? () => unequipGearDirect(id) : null;
    return { item: worn ? (piece || sl.item) : null, icon: sl && sl.iconSrc, quality: piece && piece.quality,
      name: (piece && piece.name) || (id === 'chest' ? 'Chest' : 'Legs'), unequip,
      rows: piece ? armourRows(piece, id) : [] };
  }
  if (id === 'cape') {
    const it = sl && sl.item;
    return { item: it || null, icon: sl && sl.iconSrc, quality: null, name: it ? it.name : 'Cape',
      unequip: it ? () => {
        const S = getState();
        try { if (S && S.channel) S.channel.send({ type: 'cape_equip', payload: { worn: false } }); } catch (e) { /* offline */ }
      } : null,
      rows: [] };
  }
  if (id === 'amulet') {
    /* v2.3.4101: NO Unequip -- the worker's unequip_request for the amulet
       slot nulls it with no bag to put it in (gear.js _handleUnequipRequest:
       "armor/shield/amulet just null out"), so the button would destroy it */
    const card = getEquipContribs(R).cards.amulet;
    return { item: R.amulet || null, icon: sl && sl.iconSrc, quality: null,
      name: (R.amulet && R.amulet.name) || 'Amulet', unequip: null,
      rows: card ? card.rows.map((r) => ({ k: r.k, v: r.v })) : [] };
  }
  /* gem: the gems set in the weapon in your hand */
  const hand = R[HAND_FIELD[R.activeSlot || 'melee']] || null;
  const els = hand ? [hand.element1, hand.element2].filter(Boolean) : [];
  return { item: els.length ? { els, hand } : null, icon: null, els, hand, quality: null,
    name: els.length ? els.map((e) => gemElementName(e) + ' Gem').join(' + ') : 'Gem', unequip: null, rows: [] };
}

/* ── a stat list (k left, v right) ── */
const StatList = ({ rows, attr }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    {rows.map((r) => (
      <div key={r.k} {...{ [attr || 'data-gear-stat']: r.key || r.k }} style={{ display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 0 }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 10.5, fontWeight: 700, color: COL.muted, lineHeight: 1.15, overflowWrap: 'anywhere' }}>{r.k}</span>
        <span style={{ flex: 'none', fontSize: 11.5, fontWeight: 800, color: COL.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{r.v}</span>
      </div>
    ))}
  </div>
);

/* ── "old → new", the difference coloured ── */
const CompareList = ({ rows }) => (
  <div data-gear-compare="" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    {rows.map((r) => (
      <div key={r.k} data-gear-cmp={r.k} data-tone={r.tone} style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: COL.muted, lineHeight: 1.1 }}>{r.k}</span>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 3, flexWrap: 'wrap', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: COL.text2 }}>{r.old}</span>
          <span style={{ fontSize: 10, color: COL.muted }}>{'→'}</span>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: COL.text }}>{r.now}</span>
          {r.diff && (
            <span style={{ fontSize: 11, fontWeight: 800, color: r.tone > 0 ? COL.xp : r.tone < 0 ? COL.danger : COL.muted }}>{r.diff}</span>
          )}
        </span>
      </div>
    ))}
  </div>
);

const actBtn = (tone, off) => ({
  width: '100%', minHeight: 32, padding: '4px 4px', boxSizing: 'border-box',
  fontSize: 12, fontWeight: 800, fontFamily: 'inherit', borderRadius: 8, cursor: off ? 'default' : 'pointer',
  border: `1px solid ${tone === 'primary' ? COL.accent : tone === 'danger' ? '#C7655F' : COL.borderStrong}`,
  background: tone === 'primary' ? COL.accentFill : tone === 'danger' ? 'rgba(124,52,49,.55)' : COL.raised,
  color: tone === 'danger' ? '#FFF1EE' : COL.text, opacity: off ? 0.45 : 1,
  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
});

/* v2.3.4101: the mockup's small pictures, drawn inline (no new picture files:
   the memory law) -- the filter's funnel and its chevron */
const Funnel = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ flex: 'none', display: 'block' }}>
    <path d="M2 2.5h12l-4.6 5.6v4.6l-2.8 1.3V8.1z" fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);
const Chevron = ({ size, color, up }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ flex: 'none', display: 'block', transform: up ? 'rotate(180deg)' : undefined }}>
    <path d="M3 6l5 5 5-5" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const GearTab = ({ R: Rin, desk }) => {
  const R = Rin || {};
  const [rootRef, box] = useMeasure();
  const [, tick] = React.useReducer((n) => (n + 1) % 1000000, 0);
  React.useEffect(() => gearTabBus.subscribe(() => tick()), []);
  React.useEffect(() => shopBus.subscribe(() => tick()), []);   /* v2.3.2059: the bag is half the shop */
  React.useEffect(() => itemDetailBus.subscribe(() => tick()), []);
  /* v2.3.1874's count-up, which the weapon cells' bars carry now: frames only
     while xpLanding holds or counts a card */
  React.useEffect(() => {
    let raf = 0, alive = true;
    const step = () => { if (!alive) return; if (xpCounting()) tick(); raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);
  const bro = React.useRef(null);

  const st = gearTabBus.state;
  const allEntries = getBagEntries(Rin);
  const fid = st.filter.id;
  const entries = fid === 'all' ? allEntries : allEntries.filter((e) => e.gcat === fid);
  const counts = Object.create(null);
  for (const e of allEntries) counts[e.gcat] = (counts[e.gcat] || 0) + 1;
  const weaponsHeld = (R.weaponStash || []).filter(Boolean).length;
  const slots = Rin ? getEquippedSlots(R) : [];

  /* the bag pick, resolved against the bag as it is now (a stash object by
     identity, an item by its key) -- a pick the bag no longer holds is none */
  let selEntry = null;
  if (st.sel && st.sel.bag) {
    selEntry = allEntries.find((e) => (st.sel.obj ? e.obj === st.sel.obj : (e.kind === 'item' && 'i-' + e.key === st.sel.bag))) || null;
  }
  const selCell = st.sel && st.sel.cell ? st.sel.cell : null;
  const view = selCell || selEntry ? 'item' : 'overview';

  /* ── geometry ── */
  const wide = box.w >= WIDE_AT;
  const W = Math.max(0, box.w), H = Math.max(0, box.h);
  const footH = desk ? 48 + GAP : 0;   /* the computer's weapon bar, under the three */
  let invW, broW, eqW, cell, invH, lowH, cg;
  if (wide) {
    /* v2.3.4101: the gear 26%, the card 33%, the bag the rest -- each never
       under its floor; on a 390 px phone the bag is ~139 px, three ~41 px
       squares across */
    const inner = W - 2 * PAD - 2 * GAP;
    eqW = Math.max(EQ_MIN, Math.round(inner * 0.26));
    broW = Math.max(MID_MIN, Math.round(inner * 0.33));
    invW = inner - eqW - broW;
    invH = H - 2 * PAD - footH;
    cg = eqW >= 150 ? 6 : 3;
    const byW = Math.floor((eqW - 2 * EP - 2 * cg) / 3);
    const byH = Math.floor((invH - 2 * EP - EQ_HEAD - 2 * cg) / 3);
    /* v2.3.4081: a box too short for three 34 px rows (the one band on a
       sideways phone gives this row ~82 px) shrinks the cells to fit rather
       than cutting the bottom row off */
    const floor = byH > 0 && byH < CELL_MIN ? Math.max(20, byH) : CELL_MIN;
    cell = Math.max(floor, Math.min(byW, byH > 0 ? byH : byW, 64));
  } else {
    invW = W - 2 * PAD;
    cg = 3;
    eqW = Math.max(Math.round((W - 2 * PAD - GAP) * 0.5), EQ_MIN);
    broW = W - 2 * PAD - GAP - eqW;
    cell = Math.max(CELL_MIN, Math.min(Math.floor((eqW - 2 * EP - 2 * cg) / 3), 48));
    lowH = EQ_HEAD + 3 * cell + 2 * cg + 2 * EP;
    invH = H > 0 ? Math.max(120, H - 2 * PAD - GAP - lowH - footH) : 200;
  }
  /* v2.3.4101: three across and three down in view -- as big as both allow */
  const gridH = invH - 2 * PAD - HDR_H - TG;
  const byTW = Math.floor((invW - 2 * PAD - (BAG_COLS - 1) * TG) / BAG_COLS);
  const byTH = Math.floor((gridH - (BAG_ROWS - 1) * TG) / BAG_ROWS);
  const tile = Math.max(TILE_MIN, Math.min(byTW, byTH > 0 ? byTH : byTW, 76));
  /* a box too short for three rows of 34 px (the one band sideways, ~82 px)
     shows the rows that fit and scrolls the rest -- never a square under 34 */
  const rowsIn = Math.max(1, Math.min(BAG_ROWS, Math.floor((gridH + TG) / (tile + TG))));
  const viewH = rowsIn * tile + (rowsIn - 1) * TG;
  const fillTo = Math.max(Math.ceil(entries.length / BAG_COLS), BAG_ROWS) * BAG_COLS;

  const panel = (extra) => ({
    background: COL.well, border: `1px solid ${COL.borderStrong}`, borderRadius: 10,
    boxSizing: 'border-box', padding: PAD, minWidth: 0, minHeight: 0, position: 'relative',
    display: 'flex', flexDirection: 'column', overflow: 'hidden', ...(extra || null),
  });

  /* ═════ INVENTORY ═════ */
  const filterWord = fid === 'all' ? 'All Items' : ((GEAR_FILTERS[fid] || {}).pill || 'Filter');
  const hdrW = invW - 2 * PAD;
  const coins = Number(R.coins || 0);
  const roomy = hdrW >= 128;   /* room for the chevron beside the coins */
  /* v2.3.4101: with a filter on in a narrow head, the coins keep their
     picture and give their number's room to the filter's word (the number
     in its title) -- the filter is the one thing the head must always say */
  const coinWords = fid === 'all' || hdrW >= 170;
  const inventory = (
    <div data-gear-pane="inv" style={panel({ width: invW, height: invH })}>
      {/* v2.3.4101: the mockup's head -- "All Items" (or the filter on, with
          its ×) and your coins beside it */}
      <div style={{ height: HDR_H, flex: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
        <button type="button" data-gear-filter={fid} aria-expanded={st.menu} aria-label={'Filter: ' + filterWord}
          onClick={(e) => { e.stopPropagation(); gearTabBus.setMenu(!st.menu); }}
          style={{
            flex: '1 1 auto', minWidth: 0, height: HDR_H - 2, padding: '0 5px', borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 4,
            border: `1px solid ${fid === 'all' ? COL.borderStrong : COL.accent}`,
            background: fid === 'all' ? COL.wellSoft : COL.accentFill, color: COL.text,
            fontFamily: 'inherit', fontSize: 10.5, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}>
          <Funnel size={12} color={fid === 'all' ? COL.text2 : COL.accent} />
          <span style={{ flex: 1, minWidth: 0, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{filterWord}</span>
          {fid === 'all' && roomy && <Chevron size={11} color={COL.text2} up={st.menu} />}
        </button>
        {fid !== 'all' && (
          <button type="button" data-gear-filter-clear="" aria-label="Clear the filter"
            onClick={(e) => { e.stopPropagation(); gearTabBus.clearFilter(); }}
            style={{
              flex: 'none', width: 28, height: HDR_H - 2, borderRadius: 8, padding: 0,
              border: `1px solid ${COL.accent}`, background: COL.accentFill, color: COL.text,
              fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation',
            }}>{'×'}</button>
        )}
        <span data-gear-gold={coins} title={coins.toLocaleString() + ' coins'} style={{
          flex: 'none', height: HDR_H - 2, boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', gap: 3,
          padding: '0 5px', borderRadius: 8, border: `1px solid ${COL.border}`, background: COL.wellSoft,
        }}>
          <img src={coinArtFor(coins)} alt="" draggable={false} style={{ width: 13, height: 13, objectFit: 'contain', pointerEvents: 'none' }} />
          {coinWords && (
            <span style={{ fontSize: 10.5, fontWeight: 800, color: COL.gold, fontVariantNumeric: 'tabular-nums' }}>
              {coins >= 100000 ? Math.floor(coins / 1000) + 'k' : coins.toLocaleString()}
            </span>
          )}
        </span>
      </div>
      {/* the bag */}
      {entries.length === 0 && fid !== 'all' ? (
        <div data-gear-empty={fid} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 6, textAlign: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: COL.text2 }}>No {(GEAR_FILTERS[fid] || {}).none || 'items'} in your bag</span>
          <button type="button" data-gear-showall=""
            onClick={(e) => { e.stopPropagation(); gearTabBus.clearFilter(); }}
            style={{ ...actBtn(undefined, false), width: 'auto', padding: '4px 14px' }}>Show all</button>
        </div>
      ) : (
        /* v2.3.4101: nine in view, the rest by scrolling; a tap on an empty
           square (or the space round them) puts the pick down */
        <div data-gear-bag=""
          onClick={(e) => { if (!(e.target && e.target.closest && e.target.closest('[data-bag-key]'))) gearTabBus.deselect(); }}
          style={{
            flex: 'none', height: viewH, marginTop: TG, overflowY: 'auto', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${BAG_COLS}, ${tile}px)`, gridAutoRows: `${tile}px`, gap: TG, justifyContent: 'center' }}>
            {Array.from({ length: fillTo }, (_, i) => {
              const e = entries[i];
              if (!e) return <div key={'w' + i} data-gear-slot-empty="" aria-hidden="true" style={{ background: COL.wellSoft, border: `1px solid ${COL.border}`, borderRadius: 8 }} />;
              const bagKey = e.kind === 'item' ? 'i-' + e.key : `${e.kind}-${e.index}`;
              const on = !!(selEntry && selEntry === e);
              return (
                <BagTile key={bagKey + ':' + i} entry={e} selected={on}
                  onSelect={() => gearTabBus.tapBag(bagKey, e.kind === 'item' ? null : e.obj)}
                  style={{ aspectRatio: 'auto', height: '100%' }} />
              );
            })}
          </div>
        </div>
      )}
      {/* the menu: down over the bag panel only */}
      {st.menu && (
        <div data-gear-menu="" style={{
          position: 'absolute', left: PAD, right: PAD, top: PAD + HDR_H, bottom: PAD, zIndex: 6,
          background: COL.bg, border: `1px solid ${COL.borderStrong}`, borderRadius: 8,
          boxShadow: '0 8px 18px rgba(4,7,9,.45)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px 2px 8px', borderBottom: `1px solid ${COL.divider}` }}>
            <span style={{ flex: 'none', fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: COL.muted }}>Show</span>
            {/* the weapon bag's fill -- no cap on the bag (only the weapon bag has one) */}
            <span data-gear-fill="" style={{ flex: 1, minWidth: 0, textAlign: 'right', fontSize: 10, fontWeight: 700, color: COL.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>
              weapons {weaponsHeld}/{WEAPON_STASH_MAX}
            </span>
            <button type="button" data-esc="" data-key="Esc" data-key-at="hang" aria-label="Close the filter menu"
              onClick={(e) => { e.stopPropagation(); gearTabBus.setMenu(false); }}
              style={{ position: 'relative', flex: 'none', width: 34, height: 32, padding: 0, border: 'none', background: 'transparent', color: COL.text, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', touchAction: 'manipulation' }}>{'✕'}</button>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', touchAction: 'pan-y', padding: 3 }}>
            {[{ id: 'all', label: 'All items', rows: ['all'] }].concat(GEAR_FILTER_GROUPS).map((g) => {
              const n = g.rows.reduce((a, id) => a + (id === 'all' ? allEntries.length : (counts[id] || 0)), 0);
              const multi = g.rows.length > 1;
              return (
                <div key={g.id} data-gear-group={g.id} style={{ opacity: n ? 1 : 0.42 }}>
                  {multi && <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: COL.muted, padding: '5px 6px 2px' }}>{g.label}</div>}
                  {g.rows.map((id) => {
                    const c = id === 'all' ? allEntries.length : (counts[id] || 0);
                    const word = id === 'all' ? 'All items' : multi ? GEAR_FILTERS[id].pill : g.label;
                    const cur = fid === id;
                    return (
                      <button type="button" key={id} data-gear-filter-row={id} data-count={c}
                        onClick={(e) => { e.stopPropagation(); gearTabBus.pickFilter(id); }}
                        style={{
                          width: '100%', minHeight: 34, display: 'flex', alignItems: 'center', gap: 6,
                          padding: multi ? '0 8px 0 14px' : '0 8px', boxSizing: 'border-box', borderRadius: 6,
                          border: `1px solid ${cur ? COL.accent : 'transparent'}`, background: cur ? COL.accentFill : 'transparent',
                          color: c ? COL.text : COL.disabled, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
                          textAlign: 'left', cursor: 'pointer', touchAction: 'manipulation',
                        }}>
                        <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{word}</span>
                        <span style={{ flex: 'none', fontSize: 11, fontWeight: 800, color: COL.muted, fontVariantNumeric: 'tabular-nums' }}>{c}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  /* ═════ EQUIPMENT ═════ */
  const hand = R.activeSlot || 'melee';
  const cellEl = (c) => {
    const ct = cellContent(R, c.id, slots);
    const filled = !!ct.item;
    const blue = selCell === c.id;
    const gold = !!(c.active && c.active === hand && filled);
    const edge = rarityEdge(ct.quality);
    /* the weapon in hand gold-edged and glowing, as the mockups draw it (a
       ring inside, so a rarity edge and the blue pick ring outside can both
       still show) */
    const ring = [gold ? `inset 0 0 0 2px ${COL.focus}` : null, gold && !blue ? '0 0 9px rgba(234, 198, 117, 0.55)' : null, blue ? GEAR_SEL_RING : null].filter(Boolean).join(', ');
    const sk = CELL_SKILL[c.id] ? combatSkillState(R, combatSkillByKey(CELL_SKILL[c.id])) : null;
    const pic = c.id === 'gem'
      ? null
      : (ct.icon || GHOST_SRC[c.id === 'sword' || c.id === 'bow' || c.id === 'staff' ? 'weapon' : c.id]);
    return (
      <div key={c.id} data-eqslot={c.id} data-gear-cell={c.id}
        data-gear-sel={blue ? '1' : undefined} data-gear-active={gold ? '1' : undefined}
        data-gear-filled={filled ? '1' : '0'}
        className={[edge.cls, sk && sk.unspent > 0 ? 'bt-build-flash' : ''].filter(Boolean).join(' ') || undefined}
        role="button" aria-pressed={blue} aria-label={c.label + (filled ? ': ' + ct.name : ', empty')}
        title={c.label + (filled ? ' — ' + ct.name : '')}
        ref={sk && sk.p3cat ? ((el) => { if (el) registerXpCard(sk.p3cat, el.getBoundingClientRect()); }) : undefined}
        onPointerUp={(e) => { e.stopPropagation(); gearTabBus.tapCell(c.id); }}
        style={{
          width: cell, height: cell, boxSizing: 'border-box', position: 'relative', flex: 'none',
          background: filled ? COL.slot : COL.wellSoft,
          border: `${filled ? edge.w : 1}px solid ${gold ? COL.accent : filled ? edge.c : COL.border}`, borderRadius: 9,
          boxShadow: ring || undefined,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation',
        }}>
        {c.id === 'gem' ? (
          ct.els && ct.els.length ? (
            <span style={{ display: 'flex', gap: 1, pointerEvents: 'none' }}>
              {ct.els.map((el, i) => <img key={el + i} src={gemIcon(gemCutKey(el))} alt="" draggable={false} style={{ width: ct.els.length > 1 ? cell * 0.42 : cell * 0.66, height: ct.els.length > 1 ? cell * 0.42 : cell * 0.66, objectFit: 'contain' }} />)}
            </span>
          ) : (
            <span aria-hidden="true" style={{ fontSize: cell * 0.46, lineHeight: 1, opacity: 0.25, filter: 'grayscale(1)', pointerEvents: 'none' }}>{'💎'}</span>
          )
        ) : (
          <img src={pic} alt="" draggable={false} style={{ width: '78%', height: '78%', objectFit: 'contain', opacity: filled ? 1 : 0.3, pointerEvents: 'none' }} />
        )}
        {sk && (
          <span data-gear-badge={c.id} aria-hidden="true" style={{
            position: 'absolute', top: 1, right: 2, fontSize: 8.5, fontWeight: 900, lineHeight: 1,
            color: sk.unspent > 0 ? COL.accent : COL.text2, textShadow: '0 1px 2px rgba(9,14,17,.9)',
            fontVariantNumeric: 'tabular-nums', pointerEvents: 'none',
          }}>{sk.unspent > 0 ? '+' + sk.unspent : 'Lv ' + sk.lvl}</span>
        )}
        {sk && sk.xp && (
          <span aria-hidden="true" data-xpbar={sk.p3cat || undefined}
            data-xpprog={sk.p3cat ? Math.round(displayXp(sk.p3cat, sk.xp.prog)) : undefined}
            data-xpthresh={sk.p3cat ? Math.round(sk.xp.thresh) : undefined}
            style={{ position: 'absolute', left: 4, right: 4, bottom: 2, height: 3, borderRadius: 2, overflow: 'hidden', background: COL.wellDeep, pointerEvents: 'none' }}>
            <span style={{ display: 'block', height: '100%', width: `${Math.min(100, (displayXp(sk.p3cat, sk.xp.prog) / sk.xp.thresh) * 100)}%`, background: '#8AA9F9' }} />
          </span>
        )}
      </div>
    );
  };
  const gridW = 3 * cell + 2 * cg;
  const equipment = (
    <div data-gear-pane="equip" style={panel({ width: eqW, height: wide ? invH : lowH, padding: EP, alignItems: 'center', justifyContent: 'flex-start' })}>
      {/* v2.3.4101: the mockup's "Equipped" head */}
      <div data-gear-eqhead="" style={{ height: EQ_HEAD, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 800, color: COL.text, letterSpacing: '.02em' }}>Equipped</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(3, ${cell}px)`, gridAutoRows: `${cell}px`, gap: cg, width: gridW, marginTop: wide ? Math.max(0, Math.min(6, Math.floor((invH - 2 * EP - EQ_HEAD - 3 * cell - 2 * cg) / 2))) : 0 }}>
        {GEAR_CELLS.map(cellEl)}
      </div>
    </div>
  );

  /* ═════ THE CARD ═════ */
  const goPoints = (s) => {
    const k = combatSkillState(R, s);
    /* v2.3.4101: pushed over the dashboard page, not opened in its place, so
       the Points window's back chip comes back to the Gear tab.  At rest (the
       upright band, mode 'bar') there is no page under it yet: the dashboard
       page (PANELS.dashboard, this tab) goes first -- a page pushed over the
       resting band would pop back to the old Bag page, and CLOSE folds the
       whole band away. */
    if (dashboardPanelBus.state.mode === 'bar' || dashboardPanelBus.state.stack[0] !== 'dashboard') dashboardPanelBus.open('dashboard');
    if (k.p3) { heroSectionBus.request('Build', k.p3cat); dashboardPanelBus.push('hero'); }
    else if (k.cat) { requestT2Category(k.cat); dashboardPanelBus.push('t2'); }
  };
  const nameEl = (name, quality) => (
    <div data-gear-name={name} style={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.15, color: COL.text, ...(qualityInk(quality) || null), overflowWrap: 'anywhere' }}>{name}</div>
  );
  const sentence = (t, color) => t ? <div data-gear-info="" style={{ fontSize: 10.5, color: color || COL.text2, lineHeight: 1.3 }}>{t}</div> : null;
  const rule = <div aria-hidden="true" style={{ height: 1, flex: 'none', background: `linear-gradient(90deg, transparent, ${COL.edgeWarm}, transparent)` }} />;
  /* v2.3.4101: the pick's picture in a frame (the item card's own well) */
  const art = (thumb, glyph, hidden) => (
    <div data-gear-art="" style={{
      width: 40, height: 40, flex: 'none', position: 'relative', boxSizing: 'border-box', borderRadius: 8,
      background: '#121B20', border: `1.5px solid ${COL.edgeWarm}`,
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
    }}>
      {thumb
        ? <img src={thumb} alt="" draggable={false} style={{ width: '82%', height: '82%', objectFit: 'contain', pointerEvents: 'none', ...(hidden ? { filter: 'brightness(0) opacity(.55)' } : null) }} />
        : glyph ? <span aria-hidden="true">{glyph}</span> : null}
      {hidden && <UnrevealedMark size={22} />}
    </div>
  );
  /* the head of the pick's card: the frame, the name, the kind, the count */
  const head = (pic, name, quality, kindLine, qty) => (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', minWidth: 0 }}>
      {pic}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nameEl(name, quality)}
        {kindLine && <div data-gear-kind="" style={{ fontSize: 10, fontWeight: 700, color: COL.muted, lineHeight: 1.2 }}>{kindLine}</div>}
        {qty > 1 && (
          <span data-gear-qty={qty} style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 800, color: COL.text, border: `1px solid ${COL.borderStrong}`, borderRadius: 6, padding: '1px 5px', fontVariantNumeric: 'tabular-nums' }}>Qty: {qty}</span>
        )}
      </div>
    </div>
  );
  const gradeWord = (q) => (q && q !== 'normal' && QUALITY_LABEL[q] ? QUALITY_LABEL[q] : '');

  /* The pick's main button rides at the card's foot, always in view however
     long its numbers run: Unequip for a cell, the first of a bag piece's
     actions (Equip, Eat, Drink, Reveal...) for a bag piece; the rest small
     under it. */
  let footer = null;
  let body;
  if (selCell) {
    const c = gearCell(selCell);
    const ct = cellContent(R, selCell, slots);
    if (ct.item && ct.unequip) {
      footer = (
        <button type="button" data-gear-act="unequip"
          onClick={(e) => { e.stopPropagation(); ct.unequip(); gearTabBus.afterChange(); }}
          style={actBtn('danger', false)}>Unequip</button>
      );
    }
    const sk = CELL_SKILL[selCell] ? combatSkillState(R, combatSkillByKey(CELL_SKILL[selCell])) : null;
    const word = c.label.toLowerCase();
    const cellPic = selCell === 'gem'
      ? art(ct.els && ct.els.length ? gemIcon(gemCutKey(ct.els[0])) : null, ct.els && ct.els.length ? null : '💎', false)
      : art(ct.item ? ct.icon : null, null, false);
    body = (
      <div data-gear-stats="cell" data-gear-stats-for={selCell} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {selCell === 'gem' ? (
          <>
            {head(cellPic, ct.els && ct.els.length ? ct.name : 'No gem yet', null, 'Gem', 0)}
            {rule}
            {sentence(ct.hand
              ? (ct.els && ct.els.length ? 'Set in your ' + weaponDisplayName(ct.hand) + '.' : 'Your ' + weaponDisplayName(ct.hand) + ' has no gem in it.')
              : 'Nothing in your hand.')}
            <div data-gear-gemworks="" style={{ fontSize: 10.5, fontWeight: 700, color: COL.muted, lineHeight: 1.3 }}>Gems are set at the Gem Works</div>
          </>
        ) : ct.item ? (
          <>
            {head(cellPic, ct.name, ct.quality, [gradeWord(ct.quality), c.label, 'Equipped'].filter(Boolean).join(' · '), 0)}
            {rule}
            {ct.rows.length > 0 && <StatList rows={ct.rows} />}
            {sentence(SLOT_SENTENCE[selCell])}
          </>
        ) : (
          <>
            {head(art(null, null, false), c.label, null, 'Empty', 0)}
            {rule}
            {sentence(`No ${word} yet. Pick one from your bag.`)}
          </>
        )}
        {sk && (
          <div data-gear-skill={sk.p3cat || sk.skill.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: `1px solid ${COL.divider}`, paddingTop: 5 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: COL.text }}>{sk.skill.label} Lv {sk.lvl}</div>
            <div style={{ fontSize: 10, color: COL.muted, fontVariantNumeric: 'tabular-nums' }}>
              {sk.xp ? `${Math.round(sk.xp.prog)} / ${Math.round(sk.xp.thresh)} XP to Lv ${sk.lvl + 1}` : 'Fully levelled'}
            </div>
            {sk.unspent > 0 && (
              <button type="button" data-gear-act="points"
                onClick={(e) => { e.stopPropagation(); goPoints(sk.skill); }}
                style={actBtn('primary', false)}>Spend points</button>
            )}
          </div>
        )}
      </div>
    );
  } else if (selEntry) {
    const target = entryTarget(selEntry);
    const card = (() => { try { return resolveItemCard(target); } catch (e) { return null; } })() || {};
    const o = selEntry.obj || null;
    let cmp = null, vs = '';
    if (selEntry.kind === 'stashWeapon' && o) {
      const cur = R[weaponSlotFor(o.type)] || null;
      cmp = compareRows(cur ? weaponRows(R, cur) : [], weaponRows(R, o));
      vs = cur ? 'vs your ' + weaponDisplayName(cur) : 'Your ' + (o.type === 'bow' ? 'bow' : o.type === 'staff' ? 'staff' : 'sword') + ' slot is empty';
    } else if (selEntry.kind === 'stashShield' && o) {
      cmp = compareRows(shieldRows(R.shield), shieldRows(o));
      vs = R.shield ? 'vs your ' + (R.shield.name || 'shield') : 'Your shield slot is empty';
    } else if ((selEntry.kind === 'stashArmor' || selEntry.kind === 'stashLegs') && o) {
      const slot = selEntry.kind === 'stashArmor' ? 'chest' : 'legs';
      const cur = slot === 'chest' ? R.armor : R.legsArmor;
      cmp = compareRows(armourRows(cur, slot), armourRows(o, slot));
      vs = cur ? 'vs your ' + (cur.name || slot) : 'Your ' + slot + ' slot is empty';
    }
    /* a "?" piece (v2.3.4012's mystery reveal) shows its card's name, "Rare
       or better" and no comparison -- its numbers would give its grade away */
    const hidden = !!card.unrevealed;
    if (hidden) cmp = null;
    const name = !hidden && selEntry.kind === 'stashWeapon' && o ? weaponDisplayName(o) : (card.name || '');
    const list = itemActionList(target, card);
    const anchorOf = () => {
      try { const r = bro.current.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; } catch (e) { return null; }
    };
    const ui = {
      close: () => gearTabBus.deselect(),
      sell: () => itemDetailBus.open({ ...target, anchor: anchorOf(), flow: 'sell' }),
      drop: () => itemDetailBus.open({ ...target, anchor: anchorOf(), flow: 'drop' }),
    };
    const press = (a) => {
      if (a.off) return;
      const changes = a.id === 'equip' || a.id === 'unequip' || a.id === 'capeOn' || a.id === 'capeOff';
      runItemAction(a.id, target, card, changes ? { ...ui, close: () => gearTabBus.afterChange() } : ui, { equip: { activate: false } });
    };
    const lead = list.find((a) => !a.off && a.id !== 'sell' && a.id !== 'drop' && a.id !== 'lock') || null;
    const rest = list.filter((a) => a !== lead);
    footer = (lead || rest.length) ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {lead && (
          <button type="button" data-gear-act={lead.id} {...(lead.attrs || {})}
            onClick={(e) => { e.stopPropagation(); press(lead); }}
            style={actBtn(lead.tone, false)}>{lead.label}</button>
        )}
        {/* v2.3.4101: the rest small under the main one (Sell, Drop, Pin,
            Inspect...), each greyed with its reason where it cannot */}
        {rest.length > 0 && (
          <div data-gear-more="" style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {rest.map((a) => (
              <button type="button" key={a.id} data-gear-act={a.id} disabled={a.off} aria-disabled={a.off || undefined} {...(a.attrs || {})}
                title={a.off && a.why ? a.why : undefined}
                onClick={(e) => { e.stopPropagation(); press(a); }}
                style={{ ...actBtn(a.tone, a.off), width: 'auto', flex: '1 1 auto', minHeight: 28, fontSize: 10.5, padding: '2px 5px' }}>{a.label}</button>
            ))}
          </div>
        )}
      </div>
    ) : null;
    const offWhy = rest.filter((a) => a.off && a.why).map((a) => a.why);
    const q = !hidden && o ? o.quality : null;
    const kindLine = [gradeWord(q), card.desc].filter(Boolean).join(' · ');
    body = (
      <div data-gear-stats="bag" data-gear-stats-for={selEntry.kind === 'item' ? 'i-' + selEntry.key : selEntry.kind} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {head(art(card.thumb, card.glyph, hidden), name, q, kindLine, selEntry.kind === 'item' ? (selEntry.count || 0) : 0)}
        {rule}
        {sentence(card.info, card.infoColor)}
        {cmp && cmp.length > 0 && <div style={{ fontSize: 10, color: COL.muted }}>{vs}</div>}
        {cmp && cmp.length > 0 && <CompareList rows={cmp} />}
        {offWhy.map((w) => <div key={w} style={{ fontSize: 10, color: COL.muted, lineHeight: 1.3 }}>{w}</div>)}
      </div>
    );
  } else {
    /* v2.3.4101: the overview -- "<name> Lv N", the combat resource bars,
       then the three combat skills.  The owner (2026-11-03): "the gear tab
       just having the compact version just combat resource bars ... the 3
       primary combat skill pills might sit well there too ... leveling up
       weapon is huge part".  The full stat sheet lives on the Bro page, so
       no DEF / DODGE / DMG columns here.  HP on the display scale (the
       Character page's, toDisplayHp); EN and MP as they are -- stamina IS the
       game's energy (VitalBar's "EN"), one resource, one bar. */
    const S = getState();
    const who = (S && S.myName) || 'You';
    const lvl = charLevel(R);
    const bar = (kind, cur, max) => (
      <div key={kind} data-vital={kind} title={VITAL_LABEL[kind]} style={{ display: 'flex' }}>
        <VitalBar kind={kind} cur={cur} max={max} thick={13}
          inset={(
            <div style={{
              width: '100%', minWidth: 0, display: 'flex', alignItems: 'center', gap: 3, padding: '0 6px 0 3px', boxSizing: 'border-box',
              color: '#FFFFFF', lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,.85), 0 0 3px rgba(0,0,0,.7)',
            }}>
              <img src={VITAL_ICONS[kind]} alt="" draggable={false} style={{ width: 11, height: 11, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
              <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.04em' }}>{VITAL_LABEL[kind]}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 10, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{Math.ceil(cur)}/{Math.ceil(max)}</span>
            </div>
          )} />
      </div>
    );
    /* v2.3.4101: a combat skill's pill (32 px tall, the UI review's floor for
       a finger) -- its picture, its name, "Lv N" and
       the XP to the next level (combatSkill.js, the numbers the weapon cells
       and the old band pills read; xpLanding's count-up and data-xpbar, so a
       kill's flying XP lands here); gold and glowing with points to spend.
       A tap opens the Points window on that skill (the Bro page's Points
       tab, pushed over the dashboard so its ✕ comes back here). */
    const pill = (s) => {
      const k = combatSkillState(R, s);
      const glow = k.unspent > 0;
      const frac = k.xp && k.xp.thresh > 0 ? Math.min(1, displayXp(k.p3cat, k.xp.prog) / k.xp.thresh) : 1;
      return (
        <button type="button" key={s.key} data-gear-skillpill={k.p3cat || s.key} data-lvl={k.lvl} data-unspent={k.unspent}
          data-glow={glow ? '1' : undefined}
          className={glow ? 'bt-build-flash' : undefined}
          aria-label={`${s.label} level ${k.lvl}${glow ? ', ' + k.unspent + ' points to spend' : ''}: open Points`}
          ref={k.p3cat ? ((el) => { if (el) registerXpCard(k.p3cat, el.getBoundingClientRect()); }) : undefined}
          onClick={(e) => { e.stopPropagation(); goPoints(s); }}
          style={{
            width: '100%', minHeight: 32, boxSizing: 'border-box', padding: '3px 6px 4px', borderRadius: 8,
            display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, fontFamily: 'inherit', textAlign: 'left',
            border: `1px solid ${glow ? COL.accent : COL.borderStrong}`, background: glow ? COL.accentFill : COL.wellSoft,
            boxShadow: glow ? '0 0 9px rgba(216, 170, 88, 0.55)' : undefined,
            color: COL.text, cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
          }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%', minWidth: 0 }}>
            <img src={s.iconSrc} alt="" draggable={false} style={{ width: 14, height: 14, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
            {glow && <span data-gear-points="" style={{ flex: 'none', fontSize: 9.5, fontWeight: 900, color: COL.onAccent, background: COL.accent, borderRadius: 5, padding: '0 3px', lineHeight: 1.35 }}>+{k.unspent}</span>}
            <span style={{ flex: 'none', fontSize: 10.5, fontWeight: 800, color: glow ? COL.accent : COL.text2, fontVariantNumeric: 'tabular-nums' }}>Lv {k.lvl}</span>
          </span>
          <span aria-hidden="true" data-xpbar={k.p3cat || undefined}
            data-xpprog={k.p3cat && k.xp ? Math.round(displayXp(k.p3cat, k.xp.prog)) : undefined}
            data-xpthresh={k.p3cat && k.xp ? Math.round(k.xp.thresh) : undefined}
            style={{ display: 'block', width: '100%', height: 3, borderRadius: 2, overflow: 'hidden', background: COL.wellDeep }}>
            <span style={{ display: 'block', height: '100%', width: `${Math.round(frac * 100)}%`, background: '#8AA9F9' }} />
          </span>
        </button>
      );
    };
    body = (
      <div data-gear-stats="mine" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div data-gear-level={lvl} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 5, minWidth: 0, padding: '1px 0' }}>
          <span data-gear-who="" style={{ minWidth: 0, fontSize: 13, fontWeight: 800, color: COL.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{who}</span>
          <span style={{ flex: 'none', fontSize: 11.5, fontWeight: 800, color: COL.accent, fontVariantNumeric: 'tabular-nums' }}>Lv {lvl}</span>
        </div>
        {rule}
        <div data-gear-bars="" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {bar('hp', toDisplayHp(R.hp || 0), toDisplayHp(R.maxHp || 100))}
          {bar('mana', R.mana || 0, R.maxMana || 100)}
          {bar('stamina', R.stamina || 0, R.maxStamina || 100)}
        </div>
        <div data-gear-skills="" style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 1 }}>
          {WEAPON_SKILLS.map(pill)}
        </div>
      </div>
    );
  }

  /* the card: data-gear-pane="bro" since v2.3.4101's first layout (mp-revealbag
     reads a "?" piece's Reveal in it) */
  const broPane = (
    <div ref={bro} data-gear-pane="bro" data-gear-view={view}
      style={panel({ width: broW, height: wide ? invH : lowH, border: `1px solid ${COL.edgeWarm}`, background: COL.wellDeep })}>
      {/* the foot fades, so a card that runs past the panel reads as "more
          below" (the dashboard's own scroll-edge fade, common.js) */}
      <div data-gear-scroll="" style={{
        flex: 1, minHeight: 0, overflowY: 'auto', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', padding: '2px 2px 8px',
        WebkitMaskImage: 'linear-gradient(180deg, #000 calc(100% - 10px), transparent)',
        maskImage: 'linear-gradient(180deg, #000 calc(100% - 10px), transparent)',
      }}>
        {body}
      </div>
      {footer && <div data-gear-foot="" style={{ flex: 'none', paddingTop: 3 }}>{footer}</div>}
    </div>
  );

  return (
    <div ref={rootRef} className="bt-dashcols" data-gear-tab="" data-gear-layout={wide ? 'wide' : 'stack'}
      {...(desk ? { 'data-dash-desk': '' } : null)}
      style={{
        height: '100%', minHeight: 0, width: '100%', boxSizing: 'border-box', padding: PAD,
        display: 'flex', flexDirection: wide ? 'row' : 'column', gap: GAP,
        alignItems: wide ? 'flex-start' : 'stretch', justifyContent: wide ? 'center' : 'flex-start',
        ...(wide ? null : { flexWrap: 'nowrap' }),
        ...(desk ? { flexDirection: 'column', alignItems: 'stretch' } : null),
      }}>
      {box.w === 0 ? null : desk ? (
        <>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: wide ? 'row' : 'column', gap: GAP, alignItems: 'stretch' }}>
            {inventory}
            {wide ? <>{broPane}{equipment}</> : <div style={{ display: 'flex', gap: GAP }}>{broPane}{equipment}</div>}
          </div>
          <div data-dash-desk-combat="" style={{ flex: 'none' }}>
            <WeaponBar R={Rin} row />
          </div>
        </>
      ) : wide ? (
        <>{inventory}{broPane}{equipment}</>
      ) : (
        <>
          {inventory}
          <div style={{ display: 'flex', gap: GAP, flex: 'none' }}>{broPane}{equipment}</div>
        </>
      )}
    </div>
  );
};
