import React from 'react';
import { COL, getState, qualityInk, QUALITY_LABEL } from './common.js';
import { getBagEntries } from './bagModel.js';
import { BagTile, GEAR_SEL_RING, GEAR_SEL_BLUE, GEAR_SEL_TINT } from './InventoryPanel.jsx';
import { GEAR_FILTER_GROUPS, GEAR_FILTERS, GEAR_CELLS, gearCell } from './itemCategory.js';
import { gearTabBus } from './gearTabBus.js';
import { itemActionList, runItemAction, entryTarget } from './itemActions.js';
import { resolveItemCard } from './ItemDetailPopup.jsx';
import { itemDetailBus } from './itemDetailBus.js';
import { weaponSlotFor, unequipWeaponSlot, unequipShieldDirect, unequipArmorDirect, unequipLegsDirect, unequipGearDirect } from './equipActions.js';
import { weaponRows, shieldRows, armourRows, compareRows, charLevel } from './gearStats.js';
import { combatSkillByKey, combatSkillState, WEAPON_SKILLS } from './combatSkill.js';
import { WeaponBar } from './WeaponBar.jsx';
import { getEquippedSlots, getEquipContribs, wpnIconSrc, weaponDisplayName, GHOST_SRC } from '../sheet/equipModel.js';
import { VitalBar, VITAL_ICONS, VITAL_LABEL } from '../sheet/VitalBar.jsx';   /* v2.3.4141: the overview's bars, the Character page's own */
import { shopBus } from '../shopBus.js';
import { registerXpCard, displayXp, xpCounting } from '../../xpLanding.js';
import { getEquip } from '../../../rendering/gearCatalog.js';
import { WEAPON_STASH_MAX, toDisplayHp } from '../../../data/gameSystems.js';
import { gemCutKey, gemIcon, gemElementName } from '@/data/gems.js';
import { coinArtFor } from '@/game/coinArt.js';   /* v2.3.4141: the coins beside the filter */
import { barNumber } from '@/game/barNumbers.js';   /* v2.3.4141: the coins' badge says a big purse short, as the top bar does */
import { UnrevealedMark } from '@/ui/reveal/UnrevealedMark.jsx';   /* v2.3.4141: a "?" piece's mark, as on its card */

/* ═══ v2.3.4141: THE GEAR TAB -- YOUR BAG, ONE CARD, YOUR GEAR ═══
 *
 * The owner's design (2026-11-02): three panels, "inventory on left with
 * filter on top ... the furthest right tab has all the equipped items
 * (tapping on an item highlights it in blue to show active press but
 * highlighted yellow shows what's 'on')".  It is the resting dashboard -- what
 * the bag button opens -- in all three of its homes: the upright phone's
 * band, the sideways phone's column, the computer's column.
 *
 * AS THE OWNER'S SECOND MOCKUP DRAWS IT (2026-11-03: "Inventory slots too
 * cramped. Changed to 9 visible slots"; "The middle panel should function as
 * one contextual information card, without tabs or a character portrait"),
 * with the owner's notes on it the same day:
 *   LEFT    "All Items" (a funnel, the words, a chevron) and the coins (the
 *           coin picture, the amount a count badge as on a bag slot), over a
 *           bag of THREE square slots a row, three rows in view, the rest by
 *           scrolling;
 *   MIDDLE  ONE card.  Nothing picked: "<name> Lv N", the HP, MP and EN bars
 *           (stamina IS the game's energy: VitalBar's "EN", one resource, one
 *           bar), then Melee, Bow and Magic as three tiles, each its big
 *           picture and "Lv N" ("each need just their large icons and levels
 *           ... If you tap on it it should turn into the xp bar").  Something
 *           picked: its picture beside its name, its grade and kind, two lines
 *           of what it is for, gear's numbers in a two-column grid with the
 *           change against what you wear inline (green / red), and ONE row of
 *           buttons at the foot;
 *   RIGHT   "Equipped" over Sword Bow Staff / Chest Legs Cape / Shield Amulet
 *           Gem.
 * v2.3.4141, the owner: "Make equipped slots as big as the slots you're using
 * for inventory" -- one size `t` for both grids; "connect the middle panel
 * ... to whatever the active attention item is (blue outline)" -- the card
 * wears the pick's blue (GEAR_SEL_BLUE, the ring's own colour) while
 * something is picked; "fit data in middle panel compact ... without needing
 * to do any scrolling" -- every state of the card fits its box (nothing in it
 * under 11 px), so it never scrolls (mp-geartab measures it).
 *
 * LAID OUT FROM ITS OWN BOX, NOT THE DEVICE.  The root measures itself
 * (ResizeObserver).  Wide enough (WIDE_AT): the bag | the card | the gear,
 * the two grids' squares one size `t` (as big as the card's MID_MIN allows,
 * never under 34 px), the card the rest.  Narrower (the sideways ~238 px
 * column): the bag and the gear side by side on top, the card the full width
 * under them.  A taller or wider band (Lane B's ?oneband=1) makes `t` bigger.
 *
 * WHAT A TAP DOES (gearTabBus.js holds the state and the rules):
 *   a cell    blue ring; the bag filters to its kind ("Swords" and its ×);
 *             the card shows that item with ONE button, Unequip -- tapped
 *             again, both go;
 *   a bag piece  blue ring; the card shows it, its numbers against what is
 *             in its slot, then its buttons from the one action list
 *             (itemActions.js);
 *   the bag's empty space, or the picked piece again: back to the overview;
 *   Equip / Unequip  the automatic filter goes back to "All Items".
 * The weapon in your hand wears GOLD (its edge and a glow); the cell you
 * tapped the BLUE ring outside it; both can show.  Each weapon cell wears its
 * combat skill's level ("Lv 7", or "+2" with points to spend) small in its
 * corner and a thin XP bar along its foot (xpLanding's count-up).
 *
 * This retires, for the bag, the notes "a Bag button", "Worn gear back on the
 * band" and "an item card that pushes the character or vitals around"
 * (docs/UI-DESIGN-NOTES.md, "The Gear tab").
 */

const PAD = 3;      /* the panels' own padding (both grids' panels: one size) */
const GAP = 3;      /* between the panels */
const G = 3;        /* between the squares, in both grids */
const SQ_MIN = 34;  /* the floor for a square, bag or gear */
const BAG_COLS = 3;    /* the owner's "9 visible slots": three by three */
const BAG_ROWS = 3;
const MID_MIN = 130;   /* the card wants this much before the squares grow */
const MID_HARD = 110;  /* ...and below this it goes under them (stacked) */
const WIDE_AT = 2 * (3 * SQ_MIN + 2 * G + 2 * PAD + 2) + MID_HARD + 2 * PAD + 2 * GAP;   /* two grid panels (their 1 px borders), the card, the gaps */
const HDR_H = 34;      /* the bag's filter-and-coins row (its controls 32 px: the UI review's floor for a finger) */
const EQ_HEAD = 18;    /* "Equipped" */
const FONT_MIN = 11;   /* the owner's floor for anything in the card */

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
    /* v2.3.4141: NO Unequip -- the worker's unequip_request for the amulet
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

const actBtn = (tone, off) => ({
  width: '100%', minHeight: 32, padding: '4px 4px', boxSizing: 'border-box',
  fontSize: 12, fontWeight: 800, fontFamily: 'inherit', borderRadius: 8, cursor: off ? 'default' : 'pointer',
  border: `1px solid ${tone === 'primary' ? COL.accent : tone === 'danger' ? '#C7655F' : COL.borderStrong}`,
  background: tone === 'primary' ? COL.accentFill : tone === 'danger' ? 'rgba(124,52,49,.55)' : COL.raised,
  color: tone === 'danger' ? '#FFF1EE' : COL.text, opacity: off ? 0.45 : 1,
  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
});

/* v2.3.4141: the mockup's small pictures, drawn inline (no new picture files:
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

/* v2.3.4141: gear's numbers in the card -- short words, two to a row, the
   change against what you wear inline (green better, red worse) */
const STAT_WORD = { Damage: 'DMG', DPS: 'DPS', Speed: 'SPD', Range: 'RANGE', Block: 'BLOCK', Stamina: 'EN', Defence: 'DEF', 'Damage cut': 'CUT' };
const StatGrid = ({ rows, cmp, line }) => (
  /* `line`: the short band's card -- the first three in one row, each "WORD
     value change" on one line */
  <div data-gear-grid="" style={line
    ? { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', columnGap: 4 }
    : { display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 6, rowGap: 1 }}>
    {(line ? rows.slice(0, 3) : rows).map((r) => (
      <div key={r.k} {...(cmp ? { 'data-gear-cmp': r.k, 'data-tone': r.tone } : { 'data-gear-stat': r.key || r.k })}
        title={cmp && r.old != null ? `${r.k}: ${r.old} → ${r.now}` : undefined}
        style={{ minWidth: 0, display: 'flex', flexDirection: line ? 'row' : 'column', alignItems: line ? 'baseline' : undefined, gap: line ? 3 : 0, lineHeight: 1.08, overflow: 'hidden' }}>
        <span style={{ fontSize: FONT_MIN, fontWeight: 800, color: COL.muted, letterSpacing: '.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{STAT_WORD[r.k] || r.k}</span>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 3, minWidth: 0, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: COL.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>{cmp ? r.now : r.v}</span>
          {cmp && r.diff && r.diff !== '=' && (
            <span data-gear-diff="" style={{ fontSize: FONT_MIN, fontWeight: 800, color: r.tone > 0 ? COL.xp : r.tone < 0 ? COL.danger : COL.muted }}>{r.diff}</span>
          )}
        </span>
      </div>
    ))}
  </div>
);
/* a weapon's element, a row of the grid ('None' without a gem) */
const elemRow = (wpn) => {
  const els = wpn ? [wpn.element1, wpn.element2].filter((e) => typeof e === 'string' && e) : [];
  return { k: 'ELEM', key: 'elem', v: els.length ? els.map(gemElementName).join(' + ') : 'None', now: els.length ? els.map(gemElementName).join(' + ') : 'None', diff: '', tone: 0 };
};

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

  /* ── geometry: one square size `t` for both grids ── */
  const wide = box.w >= WIDE_AT;
  const W = Math.max(0, box.w), H = Math.max(0, box.h);
  const footH = desk ? 48 + GAP : 0;   /* the computer's weapon bar, under the three */
  let t, sideH, broW, broH;
  /* v2.3.4141: SHORT -- a box too short for three rows of 34 px squares (the
     one band open on a sideways phone, Lane B's ~78 px row: PR #1410).  Both
     grids lie in ONE row of nine (the bag's nine in view, the nine cells in
     their order), and the card goes compact (shortCard below), so nothing is
     cut off, nothing scrolls, and the squares keep their one size. */
  const short = wide && (H - 2 * PAD - footH - 2 * PAD - 2 - HDR_H - 3 * G) / 3 < SQ_MIN;
  /* the grids' gutters and their panels' padding: 3 px, 2 px in the
     sideways column and the short band, where every pixel is wanted */
  const gg = wide && !short ? G : 2, pp = wide && !short ? PAD : 2;
  const rp = wide ? PAD : 1, rg = wide ? GAP : 2;   /* the root's padding and gaps, likewise */
  const cols = short ? 9 : BAG_COLS, rows = short ? 1 : BAG_ROWS;
  const hdr = short ? 28 : HDR_H;   /* the filter row: 26 px controls in the short band */
  const side = (x) => cols * x + (cols - 1) * gg + 2 * pp + 2;
  if (short) {
    const inner = W - 2 * PAD - 2 * GAP;
    sideH = H - 2 * PAD - footH;
    const tW = Math.floor((inner - 170 - 2 * (8 * gg + 2 * pp + 2)) / 18);
    const tH = sideH - 2 * pp - 2 - hdr - gg;
    t = Math.max(24, Math.min(tW, tH, 44));
    broW = inner - 2 * side(t);
    broH = sideH;
  } else if (wide) {
    /* the bag | the card | the gear: the squares as big as the card's
       MID_MIN and the height allow (never under 34 px; a 360 px phone pays
       for its 34 px squares out of the card), the card the rest */
    const inner = W - 2 * PAD - 2 * GAP;
    sideH = H - 2 * PAD - footH;
    const tW = Math.floor((inner - MID_MIN - 2 * (2 * gg + 2 * pp + 2)) / 6);
    const tH = Math.min(Math.floor((sideH - 2 * pp - 2 - hdr - gg - 2 * gg) / 3), Math.floor((sideH - 2 * pp - 2 - EQ_HEAD - 2 * gg) / 3));
    t = Math.max(SQ_MIN, Math.min(tW, tH, 64));
    broW = inner - 2 * side(t);
    broH = sideH;
  } else {
    /* the sideways column: the bag and the gear side by side on top, the
       card the full width under them */
    const inner = W - 2 * rp;
    t = Math.max(28, Math.min(56, Math.floor((inner - rg - 2 * (2 * gg + 2 * pp + 2)) / 6)));
    sideH = 2 * pp + 2 + hdr + gg + 3 * t + 2 * gg;
    broW = inner;
    broH = H > 0 ? Math.max(120, H - 2 * rp - footH - sideH - rg) : 160;
  }
  const sideW = side(t);
  const gridH = sideH - 2 * pp - 2 - hdr - gg;
  const rowsIn = Math.max(1, Math.min(rows, Math.floor((gridH + gg) / (t + gg))));
  const viewH = rowsIn * t + (rowsIn - 1) * gg;
  const fillTo = Math.max(Math.ceil(entries.length / cols), rows) * cols;

  const panel = (extra) => ({
    background: COL.well, border: `1px solid ${COL.borderStrong}`, borderRadius: 10,
    boxSizing: 'border-box', padding: PAD, minWidth: 0, minHeight: 0, position: 'relative',
    display: 'flex', flexDirection: 'column', overflow: 'hidden', ...(extra || null),
  });

  /* ═════ INVENTORY ═════ */
  const filterWord = fid === 'all' ? 'All Items' : ((GEAR_FILTERS[fid] || {}).pill || 'Filter');
  const hdrW = sideW - 2 * pp - 2;
  const coins = Number(R.coins || 0);
  const roomy = hdrW >= 128;   /* room for the chevron beside the coins */
  const inventory = (
    <div data-gear-pane="inv" style={panel({ width: sideW, height: sideH, flex: 'none', padding: pp })}>
      {/* the mockup's head -- "All Items" (or the filter on, with its ×) and
          the coins beside it */}
      <div style={{ height: hdr, flex: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
        <button type="button" data-gear-filter={fid} aria-expanded={st.menu} aria-label={'Filter: ' + filterWord}
          onClick={(e) => { e.stopPropagation(); gearTabBus.setMenu(!st.menu); }}
          style={{
            flex: '1 1 auto', minWidth: 0, height: hdr - 2, padding: '0 5px', borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 4,
            border: `1px solid ${fid === 'all' ? COL.borderStrong : COL.accent}`,
            background: fid === 'all' ? COL.wellSoft : COL.accentFill, color: COL.text,
            fontFamily: 'inherit', fontSize: 11, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}>
          {/* with a filter on, its word needs the room: the gold edge says "filtered" */}
          {(fid === 'all' || hdrW >= 150) && <Funnel size={12} color={fid === 'all' ? COL.text2 : COL.accent} />}
          <span style={{ flex: 1, minWidth: 0, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{filterWord}</span>
          {fid === 'all' && roomy && <Chevron size={11} color={COL.text2} up={st.menu} />}
        </button>
        {fid !== 'all' && (
          <button type="button" data-gear-filter-clear="" aria-label="Clear the filter"
            onClick={(e) => { e.stopPropagation(); gearTabBus.clearFilter(); }}
            style={{
              flex: 'none', width: 26, height: hdr - 2, borderRadius: 8, padding: 0,
              border: `1px solid ${COL.accent}`, background: COL.accentFill, color: COL.text,
              fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation',
            }}>{'×'}</button>
        )}
        {/* v2.3.4141, the owner: "Make gold icon as big as it can fit in that
            space and just put a badge over the number of gold (or whatever
            you currently do for item quantities)" -- the coins as a bag slot
            is: the picture filling its box, the amount the slots' own count
            badge (.bt-item-qty), a big purse said short as the top bar says
            it (barNumber: "12.4K") */}
        <span data-gear-gold={coins} title={coins.toLocaleString() + ' coins'} aria-label={coins.toLocaleString() + ' coins'} style={{
          flex: 'none', width: hdr, height: hdr - 2, boxSizing: 'border-box', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, border: `1px solid ${COL.border}`, background: COL.wellSoft,
        }}>
          <img src={coinArtFor(coins)} alt="" draggable={false} style={{ width: '88%', height: '88%', objectFit: 'contain', pointerEvents: 'none' }} />
          <span className="bt-item-qty" data-gear-gold-badge="">{barNumber(coins, true, 10000)}</span>
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
        /* nine in view, the rest by scrolling; a tap on an empty square (or
           the space round them) puts the pick down */
        <div data-gear-bag=""
          onClick={(e) => { if (!(e.target && e.target.closest && e.target.closest('[data-bag-key]'))) gearTabBus.deselect(); }}
          style={{
            flex: 'none', height: viewH, marginTop: gg, overflowY: 'auto', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${t}px)`, gridAutoRows: `${t}px`, gap: gg, justifyContent: 'center' }}>
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
          position: 'absolute', left: pp, right: pp, top: pp + hdr, bottom: pp, zIndex: 6,
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
          width: t, height: t, boxSizing: 'border-box', position: 'relative', flex: 'none',
          background: filled ? COL.slot : COL.wellSoft,
          border: `${filled ? edge.w : 1}px solid ${gold ? COL.accent : filled ? edge.c : COL.border}`, borderRadius: 8,
          boxShadow: ring || undefined,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation',
        }}>
        {c.id === 'gem' ? (
          ct.els && ct.els.length ? (
            <span style={{ display: 'flex', gap: 1, pointerEvents: 'none' }}>
              {ct.els.map((el, i) => <img key={el + i} src={gemIcon(gemCutKey(el))} alt="" draggable={false} style={{ width: ct.els.length > 1 ? t * 0.42 : t * 0.66, height: ct.els.length > 1 ? t * 0.42 : t * 0.66, objectFit: 'contain' }} />)}
            </span>
          ) : (
            <span aria-hidden="true" style={{ fontSize: t * 0.46, lineHeight: 1, opacity: 0.25, filter: 'grayscale(1)', pointerEvents: 'none' }}>{'💎'}</span>
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
  const equipment = (
    <div data-gear-pane="equip" style={panel({ width: sideW, height: sideH, flex: 'none', padding: pp, alignItems: 'center', justifyContent: 'flex-start' })}>
      {/* the mockup's "Equipped" head */}
      <div data-gear-eqhead="" style={{ height: EQ_HEAD, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 800, color: COL.text, letterSpacing: '.02em' }}>Equipped</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${t}px)`, gridAutoRows: `${t}px`, gap: gg, marginTop: Math.max(0, Math.min(hdr + gg - EQ_HEAD, Math.floor((sideH - 2 * pp - 2 - EQ_HEAD - 3 * t - 2 * gg) / 2))) }}>
        {GEAR_CELLS.map(cellEl)}
      </div>
    </div>
  );

  /* ═════ THE CARD ═════ */
  const nameEl = (name, quality) => (
    <div data-gear-name={name} style={{
      fontSize: short ? 12 : 12.5, fontWeight: 800, lineHeight: 1.15, color: COL.text, ...(qualityInk(quality) || null), overflowWrap: 'anywhere',
      display: '-webkit-box', WebkitLineClamp: short ? 1 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
    }}>{name}</div>
  );
  /* one or two lines of plain words, never more (the card never scrolls) */
  const sentence = (txt, color, lines) => txt ? (
    <div data-gear-info="" style={{
      fontSize: FONT_MIN, color: color || COL.text2, lineHeight: 1.3,
      display: '-webkit-box', WebkitLineClamp: lines || 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
    }}>{txt}</div>
  ) : null;
  const rule = short ? null : <div aria-hidden="true" style={{ height: 1, flex: 'none', background: `linear-gradient(90deg, transparent, ${COL.edgeWarm}, transparent)` }} />;
  /* the pick's picture in a small frame beside its name */
  const art = (thumb, glyph, hidden) => (
    <div data-gear-art="" style={{
      width: short ? 24 : 32, height: short ? 24 : 32, flex: 'none', position: 'relative', boxSizing: 'border-box', borderRadius: 7,
      background: '#121B20', border: `1.5px solid ${COL.edgeWarm}`,
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,.44)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
    }}>
      {thumb
        ? <img src={thumb} alt="" draggable={false} style={{ width: '84%', height: '84%', objectFit: 'contain', pointerEvents: 'none', ...(hidden ? { filter: 'brightness(0) opacity(.55)' } : null) }} />
        : glyph ? <span aria-hidden="true">{glyph}</span> : null}
      {hidden && <UnrevealedMark size={short ? 16 : 20} />}
    </div>
  );
  /* the head: the frame, the name, the kind (and the count of a stack) */
  const head = (pic, name, quality, kindLine, qty) => (
    <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start', minWidth: 0, flex: 'none' }}>
      {pic}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {nameEl(name, quality)}
        {(kindLine || qty > 1) && (
          <div data-gear-kind="" style={{ fontSize: FONT_MIN, fontWeight: 700, color: COL.muted, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {kindLine}{kindLine && qty > 1 ? ' · ' : ''}{qty > 1 && <span data-gear-qty={qty} style={{ color: COL.text }}>Qty {qty}</span>}
          </div>
        )}
      </div>
    </div>
  );
  const gradeWord = (q) => (q && q !== 'normal' && QUALITY_LABEL[q] ? QUALITY_LABEL[q] : '');
  /* the foot: ONE row -- the main button wider, then one more and "⋯" (the
     item card, with every other action) when there are more */
  const btnRow = (lead, rest, press, more) => {
    const shown = rest.length > 1 && more ? rest.slice(0, 1) : rest.slice(0, 2);
    const extra = rest.length > shown.length && more;
    const small = { minHeight: short ? 22 : 30, fontSize: 11.5, padding: short ? '0 3px' : '2px 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
    return (
      <div data-gear-row="" style={{ display: 'flex', gap: 3 }}>
        {lead && (
          <button type="button" data-gear-act={lead.id} {...(lead.attrs || {})}
            onClick={(e) => { e.stopPropagation(); press(lead); }}
            style={{ ...actBtn(lead.tone, false), ...small, width: 'auto', flex: '2 1 0', minWidth: 0 }}>{lead.label}</button>
        )}
        {shown.map((a) => (
          <button type="button" key={a.id} data-gear-act={a.id} disabled={a.off} aria-disabled={a.off || undefined} {...(a.attrs || {})}
            title={a.off && a.why ? a.why : undefined}
            onClick={(e) => { e.stopPropagation(); press(a); }}
            style={{ ...actBtn(a.tone, a.off), ...small, width: 'auto', flex: '1 1 0', minWidth: 0 }}>{a.label}</button>
        ))}
        {extra && (
          <button type="button" data-gear-act="more" aria-label="More: the item's card"
            onClick={(e) => { e.stopPropagation(); more(); }}
            style={{ ...actBtn(undefined, false), ...small, width: 30, flex: 'none' }}>{'⋯'}</button>
        )}
      </div>
    );
  };

  let footer = null;
  let body;
  if (selCell) {
    const c = gearCell(selCell);
    const ct = cellContent(R, selCell, slots);
    if (ct.item && ct.unequip) {
      footer = (
        <button type="button" data-gear-act="unequip"
          onClick={(e) => { e.stopPropagation(); ct.unequip(); gearTabBus.afterChange(); }}
          style={{ ...actBtn('danger', false), minHeight: short ? 22 : 30, fontSize: 11.5, ...(short ? { padding: '0 4px' } : null) }}>Unequip</button>
      );
    }
    const word = c.label.toLowerCase();
    const cellPic = selCell === 'gem'
      ? art(ct.els && ct.els.length ? gemIcon(gemCutKey(ct.els[0])) : null, ct.els && ct.els.length ? null : '💎', false)
      : art(ct.item ? ct.icon : null, null, false);
    const rows = ct.item && c.field ? ct.rows.concat([elemRow(ct.item)]) : ct.rows;
    body = (
      <div data-gear-stats="cell" data-gear-stats-for={selCell} style={{ display: 'flex', flexDirection: 'column', gap: short ? 2 : 3 }}>
        {selCell === 'gem' ? (
          <>
            {head(cellPic, ct.els && ct.els.length ? ct.name : 'No gem yet', null, 'Gem', 0)}
            {rule}
            {sentence(ct.hand
              ? (ct.els && ct.els.length ? 'Set in your ' + weaponDisplayName(ct.hand) + '.' : 'Your ' + weaponDisplayName(ct.hand) + ' has no gem in it.')
              : 'Nothing in your hand.', null, short ? 1 : 2)}
            {!short && <div data-gear-gemworks="" style={{ fontSize: FONT_MIN, fontWeight: 700, color: COL.muted, lineHeight: 1.3 }}>Gems are set at the Gem Works</div>}
          </>
        ) : ct.item ? (
          <>
            {head(cellPic, ct.name, ct.quality, [gradeWord(ct.quality), c.label, 'Equipped'].filter(Boolean).join(' · '), 0)}
            {rule}
            {rows.length > 0 ? <StatGrid rows={rows} line={short} /> : sentence(SLOT_SENTENCE[selCell], null, short ? 1 : 2)}
          </>
        ) : (
          <>
            {head(art(null, null, false), c.label, null, 'Empty', 0)}
            {rule}
            {sentence(`No ${word} yet. Pick one from your bag.`, null, short ? 1 : 2)}
          </>
        )}
      </div>
    );
  } else if (selEntry) {
    const target = entryTarget(selEntry);
    const card = (() => { try { return resolveItemCard(target); } catch (e) { return null; } })() || {};
    const o = selEntry.obj || null;
    let cmp = null;
    if (selEntry.kind === 'stashWeapon' && o) {
      const cur = R[weaponSlotFor(o.type)] || null;
      cmp = compareRows(cur ? weaponRows(R, cur) : [], weaponRows(R, o)).concat([elemRow(o)]);
    } else if (selEntry.kind === 'stashShield' && o) {
      cmp = compareRows(shieldRows(R.shield), shieldRows(o));
    } else if ((selEntry.kind === 'stashArmor' || selEntry.kind === 'stashLegs') && o) {
      const slot = selEntry.kind === 'stashArmor' ? 'chest' : 'legs';
      const cur = slot === 'chest' ? R.armor : R.legsArmor;
      cmp = compareRows(armourRows(cur, slot), armourRows(o, slot));
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
    footer = (lead || rest.length) ? btnRow(lead, rest, press, () => itemDetailBus.open({ ...target, anchor: anchorOf() })) : null;
    const q = !hidden && o ? o.quality : null;
    const kindLine = [gradeWord(q), card.desc].filter(Boolean).join(' · ');
    body = (
      <div data-gear-stats="bag" data-gear-stats-for={selEntry.kind === 'item' ? 'i-' + selEntry.key : selEntry.kind} style={{ display: 'flex', flexDirection: 'column', gap: short ? 2 : 3 }}>
        {head(art(card.thumb, card.glyph, hidden), name, q, kindLine, selEntry.kind === 'item' ? (selEntry.count || 0) : 0)}
        {rule}
        {cmp && cmp.length > 0
          ? <StatGrid rows={cmp} cmp line={short} />
          : sentence(card.info, card.infoColor, short ? 1 : 2)}
      </div>
    );
  } else {
    /* the overview -- "<name> Lv N", the combat resource bars, then the three
       combat skills.  The owner: "the gear tab just having the compact
       version just combat resource bars ... the 3 primary combat skill pills
       might sit well there too ... leveling up weapon is huge part", then
       "Melee bow magic each need just their large icons and levels similar to
       old bag layout with the 3 combat skills.  If you tap on it it should
       turn into the xp bar".  HP on the display scale (the Character page's,
       toDisplayHp); EN and MP as they are -- stamina IS the game's energy
       (VitalBar's "EN"), one resource, one bar.  Spending points lives on the
       Bro page. */
    const S = getState();
    const who = (S && S.myName) || 'You';
    const lvl = charLevel(R);
    const bar = (kind, cur, max) => (
      <div key={kind} data-vital={kind} title={VITAL_LABEL[kind]} style={{ display: 'flex' }}>
        <VitalBar kind={kind} cur={cur} max={max} thick={short ? 13 : 16}
          inset={(
            <div style={{
              width: '100%', minWidth: 0, display: 'flex', alignItems: 'center', gap: 3, padding: '0 6px 0 3px', boxSizing: 'border-box',
              color: '#FFFFFF', lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,.85), 0 0 3px rgba(0,0,0,.7)',
            }}>
              <img src={VITAL_ICONS[kind]} alt="" draggable={false} style={{ width: 12, height: 12, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
              <span style={{ fontSize: FONT_MIN, fontWeight: 800, letterSpacing: '.02em' }}>{VITAL_LABEL[kind]}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: FONT_MIN, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{Math.ceil(cur)}/{Math.ceil(max)}</span>
            </div>
          )} />
      </div>
    );
    const skills = WEAPON_SKILLS.map((s) => ({ s, k: combatSkillState(R, s) }));
    const open = skills.find((x) => x.s.key === st.xp) || null;
    /* a skill's tile: its big picture and "Lv N" (the XP that flies in
       after a kill still lands here, xpLanding); a tap turns it into its XP
       bar across the row -- "68 / 455 XP", the numbers the top bar's XP bar
       reads (combatSkill.js) -- until a second tap or 4 s (gearTabBus.showXp) */
    const tile = ({ s, k }) => (
      <button type="button" key={s.key} data-gear-skill={k.p3cat || s.key} data-lvl={k.lvl}
        aria-label={`${s.label} level ${k.lvl}: show its XP`}
        ref={k.p3cat ? ((el) => { if (el) registerXpCard(k.p3cat, el.getBoundingClientRect()); }) : undefined}
        onClick={(e) => { e.stopPropagation(); gearTabBus.showXp(s.key); }}
        style={{
          flex: '1 1 0', minWidth: 0, minHeight: 0, boxSizing: 'border-box', padding: short ? '0 3px' : '3px 2px', borderRadius: short ? 6 : 8,
          display: 'flex', flexDirection: short ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: short ? 4 : 2,
          border: `1px solid ${COL.borderStrong}`, background: COL.wellSoft, color: COL.text, fontFamily: 'inherit',
          cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
        }}>
        {short ? (
          <img src={s.iconSrc} alt="" draggable={false} style={{ width: 16, height: 16, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
        ) : (
          <span style={{ flex: '1 1 0', minHeight: 0, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={s.iconSrc} alt="" draggable={false} style={{ maxWidth: '100%', maxHeight: '100%', width: 40, height: 40, objectFit: 'contain', pointerEvents: 'none' }} />
          </span>
        )}
        <span style={{ flex: 'none', fontSize: 12, fontWeight: 900, color: COL.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>Lv {k.lvl}</span>
      </button>
    );
    const xpWide = ({ s, k }) => {
      const prog = k.xp ? Math.round(displayXp(k.p3cat, k.xp.prog)) : 0;
      const thresh = k.xp ? Math.round(k.xp.thresh) : 0;
      return (
        <button type="button" key={s.key} data-gear-skill={k.p3cat || s.key} data-lvl={k.lvl} data-gear-xpopen=""
          aria-label={`${s.label} level ${k.lvl}: ${k.xp ? prog + ' of ' + thresh + ' XP' : 'fully levelled'}`}
          ref={k.p3cat ? ((el) => { if (el) registerXpCard(k.p3cat, el.getBoundingClientRect()); }) : undefined}
          onClick={(e) => { e.stopPropagation(); gearTabBus.showXp(null); }}
          style={{
            flex: '1 1 0', minWidth: 0, minHeight: 0, boxSizing: 'border-box', padding: short ? '0 6px' : '4px 8px', borderRadius: short ? 6 : 8,
            display: 'flex', flexDirection: short ? 'row' : 'column', alignItems: short ? 'center' : undefined, justifyContent: 'center', gap: short ? 5 : 4,
            border: `1px solid ${COL.borderStrong}`, background: COL.wellSoft, color: COL.text, fontFamily: 'inherit', textAlign: 'left',
            cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
          }}>
          {short ? (
            <img src={s.iconSrc} alt="" draggable={false} style={{ width: 16, height: 16, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, width: '100%', minWidth: 0 }}>
              <img src={s.iconSrc} alt="" draggable={false} style={{ width: 20, height: 20, objectFit: 'contain', flex: 'none', pointerEvents: 'none' }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
              <span style={{ flex: 'none', fontSize: 12, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>Lv {k.lvl}</span>
            </span>
          )}
          <span aria-hidden="true" data-xpbar={k.p3cat || undefined} data-xpprog={k.xp ? prog : undefined} data-xpthresh={k.xp ? thresh : undefined}
            style={{ display: 'block', width: short ? 'auto' : '100%', flex: short ? '1 1 0' : undefined, minWidth: 0, height: 7, borderRadius: 4, overflow: 'hidden', background: COL.wellDeep }}>
            <span style={{ display: 'block', height: '100%', width: `${k.xp && thresh > 0 ? Math.min(100, (prog / thresh) * 100) : 100}%`, background: '#8AA9F9' }} />
          </span>
          <span data-gear-xpnum="" style={{ fontSize: FONT_MIN, fontWeight: 700, color: COL.text2, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {k.xp ? (short ? `${prog.toLocaleString()}/${thresh.toLocaleString()}` : `${prog.toLocaleString()} / ${thresh.toLocaleString()} XP`) : 'Fully levelled'}
          </span>
        </button>
      );
    };
    body = (
      <div data-gear-stats="mine" style={{ display: 'flex', flexDirection: 'column', gap: short ? 2 : 4, height: '100%', boxSizing: 'border-box' }}>
        <div data-gear-level={lvl} style={{ flex: 'none', display: short ? 'none' : 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 5, minWidth: 0 }}>
          <span data-gear-who="" style={{ minWidth: 0, fontSize: 13, fontWeight: 800, color: COL.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{who}</span>
          <span style={{ flex: 'none', fontSize: 12, fontWeight: 800, color: COL.accent, fontVariantNumeric: 'tabular-nums' }}>Lv {lvl}</span>
        </div>
        {short ? null : rule}
        <div data-gear-bars="" style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: short ? 2 : 3 }}>
          {bar('hp', toDisplayHp(R.hp || 0), toDisplayHp(R.maxHp || 100))}
          {bar('mana', R.mana || 0, R.maxMana || 100)}
          {bar('stamina', R.stamina || 0, R.maxStamina || 100)}
        </div>
        <div data-gear-skills="" style={{ flex: '1 1 0', minHeight: short ? 18 : 44, display: 'flex', gap: short ? 3 : 4 }}>
          {open ? xpWide(open) : skills.map(tile)}
        </div>
      </div>
    );
  }

  /* the card: data-gear-pane="bro" since v2.3.4141's first layout (mp-revealbag
     reads a "?" piece's Reveal in it).  While something is picked it wears
     the pick's own blue (GEAR_SEL_BLUE, the ring's colour) and a faint blue
     wash -- the owner's link between the blue outline and the card. */
  const linked = view === 'item';
  const broPane = (
    <div ref={bro} data-gear-pane="bro" data-gear-view={view} data-gear-linked={linked ? '1' : undefined}
      style={panel({
        width: broW, height: broH, flex: 'none', padding: short ? 2 : PAD,
        border: `1px solid ${linked ? GEAR_SEL_BLUE : COL.edgeWarm}`,
        background: COL.wellDeep,
        ...(linked ? { backgroundImage: `linear-gradient(${GEAR_SEL_TINT}, ${GEAR_SEL_TINT})`, boxShadow: `inset 0 0 0 1px ${GEAR_SEL_BLUE}` } : null),
      })}>
      {/* never scrolls: every state is laid out to fit (mp-geartab measures
          scrollHeight against clientHeight at 390 and 360 px) */}
      <div data-gear-scroll="" style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: short ? '0 1px' : '2px 2px 3px' }}>
        {body}
      </div>
      {footer && <div data-gear-foot="" style={{ flex: 'none', paddingTop: short ? 1 : 3 }}>{footer}</div>}
    </div>
  );

  return (
    <div ref={rootRef} className="bt-dashcols" data-gear-tab="" data-gear-layout={wide ? 'wide' : 'stack'}
      {...(desk ? { 'data-dash-desk': '' } : null)}
      style={{
        height: '100%', minHeight: 0, width: '100%', boxSizing: 'border-box', padding: rp,
        display: 'flex', flexDirection: 'column', gap: rg,
      }}>
      {box.w === 0 ? null : (
        <>
          {wide ? (
            <div style={{ flex: 'none', display: 'flex', gap: GAP, justifyContent: 'center', alignItems: 'flex-start' }}>
              {inventory}{broPane}{equipment}
            </div>
          ) : (
            <>
              <div style={{ flex: 'none', display: 'flex', gap: rg, justifyContent: 'center' }}>{inventory}{equipment}</div>
              {broPane}
            </>
          )}
          {desk && (
            <div data-dash-desk-combat="" style={{ flex: 'none', marginTop: 'auto' }}>
              <WeaponBar R={Rin} row />
            </div>
          )}
        </>
      )}
    </div>
  );
};
