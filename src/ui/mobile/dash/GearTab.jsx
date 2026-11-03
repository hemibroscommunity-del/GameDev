import React from 'react';
import { COL, getState, qualityInk } from './common.js';
import { getBagEntries } from './bagModel.js';
import { BagTile, GEAR_SEL_RING } from './InventoryPanel.jsx';
import { GEAR_FILTER_GROUPS, GEAR_FILTERS, GEAR_CELLS, gearCell } from './itemCategory.js';
import { gearTabBus } from './gearTabBus.js';
import { itemActionList, runItemAction, entryTarget } from './itemActions.js';
import { resolveItemCard } from './ItemDetailPopup.jsx';
import { itemDetailBus } from './itemDetailBus.js';
import { weaponSlotFor, unequipWeaponSlot, unequipShieldDirect, unequipArmorDirect, unequipLegsDirect, unequipGearDirect } from './equipActions.js';
import { weaponRows, shieldRows, armourRows, compareRows, myStatRows } from './gearStats.js';
import { combatSkillByKey, combatSkillState } from './combatSkill.js';
import { WeaponBar } from './WeaponBar.jsx';
import { requestT2Category } from './T2Panel.jsx';
import { getEquippedSlots, getEquipContribs, wpnIconSrc, weaponDisplayName, GHOST_SRC } from '../sheet/equipModel.js';
import { CharacterView } from '../sheet/CharacterView.jsx';
import { heroSectionBus } from '../sheet/heroSectionBus.js';
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { shopBus } from '../shopBus.js';
import { registerXpCard, displayXp, xpCounting } from '../../xpLanding.js';
import { getEquip } from '../../../rendering/gearCatalog.js';
import { WEAPON_STASH_MAX } from '../../../data/gameSystems.js';
import { gemCutKey, gemIcon, gemElementName } from '@/data/gems.js';
import { coinArtFor } from '@/game/coinArt.js';
import { UnrevealedMark } from '@/ui/reveal/UnrevealedMark.jsx';   /* v2.3.4031: a "?" piece's mark, as on its card */

/* ═══ v2.3.4031: THE GEAR TAB -- YOUR BAG, YOUR BRO AND YOUR GEAR, SIDE BY SIDE ═══
 *
 * The owner's design (2026-11-02): three panels, "inventory on left with
 * filter on top, character in the middle with tabs that can change between
 * look and stats/details and the furthest right tab has all the equipped
 * items (tapping on an item highlights it in blue to show active press but
 * highlighted yellow shows what's 'on')".  It is the resting dashboard -- what
 * the bag button opens -- in all three of its homes: the upright phone's
 * band, the sideways phone's column, the computer's column.
 *
 * LAID OUT FROM ITS OWN BOX, NOT THE DEVICE.  The root measures itself
 * (ResizeObserver): 330 px wide or more and the three panels sit across at
 * 46% | 24% | 30%; narrower (the sideways ~238 px column) and the bag takes
 * the top, BRO and EQUIPMENT side by side under it.  So a wider band (Lane
 * B's ?oneband=1) just works.
 *
 * WHAT A TAP DOES (gearTabBus.js holds the state and the rules):
 *   a cell    blue ring; the bag filters to its kind ("Swords ×"); the middle
 *             shows that item with ONE button, Unequip -- tapped again, both go;
 *   a bag piece  blue ring; the middle shows it, compared against what is in
 *             its slot ("old → new", green better, red worse), then its
 *             buttons from the one action list (itemActions.js);
 *   Equip / Unequip  the automatic filter goes back to "All items".
 * The weapon in your hand wears a GOLD ring inside the cell; the cell you
 * tapped the BLUE ring outside it; both can show.  Each weapon cell wears its
 * combat skill's level ("Lv 7", or "+2" with points to spend) -- the band's
 * three combat-skill pills left with this change -- and a thin XP bar along
 * its foot, the pills' own count-up (xpLanding) and their data-xpbar.
 *
 * This retires, for the bag, the notes "a Bag button", "Worn gear back on the
 * band" and "an item card that pushes the character or vitals around"
 * (docs/UI-DESIGN-NOTES.md, "The Gear tab").  The Character page keeps its
 * Equipment tab until Lane B rebuilds that page.
 */

const PAD = 4;      /* the panels' own padding (DASH_GAP) */
const GAP = 4;      /* between the panels */
const TG = 3;       /* between the bag's tiles */
const EP = 3;       /* the equipment panel's padding */
const CG = 2;       /* between the equipment cells */
const CELL_MIN = 34;   /* the brief's floor for an equipment cell */
const WIDE_AT = 330;
const TAB_H = 28;
const PILL_H = 28;
const HEAD_H = 16;

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
    /* v2.3.4031: NO Unequip -- the worker's unequip_request for the amulet
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
  const showStats = !!(selCell || selEntry) || st.tab === 'stats';

  /* ── geometry ── */
  const wide = box.w >= WIDE_AT;
  const W = Math.max(0, box.w), H = Math.max(0, box.h);
  const footH = desk ? 48 + GAP : 0;   /* the computer's weapon bar, under the three */
  const eqMinW = 3 * CELL_MIN + 2 * CG + 2 * EP;
  let invW, broW, eqW, cell, invH, lowH;
  if (wide) {
    /* 46% | 24% | 30% -- the equipment never under three 34 px cells across,
       the bag paying for it on a narrow phone */
    const inner = W - 2 * PAD - 2 * GAP;
    eqW = Math.max(Math.round(inner * 0.30), eqMinW);
    broW = Math.round(inner * 0.24);
    invW = inner - eqW - broW;
    invH = H - 2 * PAD - footH;
    const byW = Math.floor((eqW - 2 * EP - 2 * CG) / 3);
    const byH = Math.floor((invH - 2 * EP - 2 * CG) / 3);
    cell = Math.max(CELL_MIN, Math.min(byW, byH > 0 ? byH : byW, 60));
  } else {
    invW = W - 2 * PAD;
    eqW = Math.max(Math.round((W - 2 * PAD - GAP) * 0.5), eqMinW);
    broW = W - 2 * PAD - GAP - eqW;
    cell = Math.max(CELL_MIN, Math.min(Math.floor((eqW - 2 * EP - 2 * CG) / 3), 48));
    lowH = 3 * cell + 2 * CG + 2 * EP;
    invH = H > 0 ? Math.max(120, H - 2 * PAD - GAP - lowH - footH) : 200;
  }
  const cols = Math.max(2, Math.floor((invW - 2 * PAD + TG) / (44 + TG)));
  const tile = Math.max(30, Math.floor((invW - 2 * PAD - (cols - 1) * TG) / cols));
  const visRows = Math.max(2, Math.floor((invH - HEAD_H - PILL_H - 2 * PAD - 2 * TG) / (tile + TG)));
  const cellCount = Math.max(entries.length, fid === 'all' ? (visRows + 1) * cols : 0);
  const fillTo = Math.ceil(cellCount / cols) * cols;

  const panel = (extra) => ({
    background: COL.raised, border: `1px solid ${COL.border}`, borderRadius: 9,
    boxSizing: 'border-box', padding: PAD, minWidth: 0, minHeight: 0, position: 'relative',
    display: 'flex', flexDirection: 'column', overflow: 'hidden', ...(extra || null),
  });

  /* ═════ INVENTORY ═════ */
  const filterWord = fid === 'all' ? 'All items' : ((GEAR_FILTERS[fid] || {}).pill || 'Filter');
  const inventory = (
    <div data-gear-pane="inv" style={panel(wide ? { width: invW, height: invH } : { width: invW, height: invH })}>
      {/* the gold and the bag's fill -- no cap on the bag (only the weapon bag has one) */}
      <div style={{ height: HEAD_H, flex: 'none', display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 2, minWidth: 0 }}>
        <span data-gear-gold={R.coins || 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flex: 'none' }}>
          <img src={coinArtFor(R.coins || 0)} alt="" draggable={false} style={{ width: 14, height: 14, objectFit: 'contain' }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: COL.gold, fontVariantNumeric: 'tabular-nums' }}>{Number(R.coins || 0).toLocaleString()}</span>
        </span>
        <span data-gear-fill="" style={{ flex: 1, minWidth: 0, textAlign: 'right', fontSize: 10, fontWeight: 700, color: COL.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>
          {allEntries.length} item{allEntries.length === 1 ? '' : 's'} · weapons {weaponsHeld}/{WEAPON_STASH_MAX}
        </span>
      </div>
      {/* the filter pill: "All items ▾", or the filter and its × */}
      <div style={{ height: PILL_H, flex: 'none', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
        <button type="button" data-gear-filter={fid} aria-expanded={st.menu}
          onClick={(e) => { e.stopPropagation(); gearTabBus.setMenu(!st.menu); }}
          style={{
            flex: '1 1 auto', minWidth: 0, height: PILL_H - 2, padding: '0 10px', borderRadius: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4,
            border: `1px solid ${fid === 'all' ? COL.borderStrong : COL.accent}`,
            background: fid === 'all' ? COL.wellSoft : COL.accentFill, color: COL.text,
            fontFamily: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation',
          }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{filterWord}</span>
          {fid === 'all' && <span aria-hidden="true" style={{ fontSize: 10, color: COL.muted }}>{st.menu ? '▴' : '▾'}</span>}
        </button>
        {fid !== 'all' && (
          <button type="button" data-gear-filter-clear="" aria-label="Clear the filter"
            onClick={(e) => { e.stopPropagation(); gearTabBus.clearFilter(); }}
            style={{
              flex: 'none', width: 34, height: PILL_H - 2, borderRadius: 999, padding: 0,
              border: `1px solid ${COL.accent}`, background: COL.accentFill, color: COL.text,
              fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer', touchAction: 'manipulation',
            }}>{'×'}</button>
        )}
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
        <div data-gear-bag="" style={{
          flex: 1, minHeight: 0, marginTop: TG, overflowY: 'auto', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch',
          WebkitMaskImage: 'linear-gradient(180deg, #000 calc(100% - 9px), transparent)',
          maskImage: 'linear-gradient(180deg, #000 calc(100% - 9px), transparent)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${tile}px)`, gridAutoRows: `${tile}px`, gap: TG, justifyContent: 'center', padding: 2 }}>
            {Array.from({ length: fillTo }, (_, i) => {
              const e = entries[i];
              if (!e) return <div key={'w' + i} aria-hidden="true" style={{ background: COL.well, border: `1px solid ${COL.tileBor}`, borderRadius: 6 }} />;
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
          position: 'absolute', left: PAD, right: PAD, top: PAD + HEAD_H + 2 + PILL_H, bottom: PAD, zIndex: 6,
          background: COL.bg, border: `1px solid ${COL.borderStrong}`, borderRadius: 8,
          boxShadow: '0 8px 18px rgba(4,7,9,.45)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ flex: 'none', display: 'flex', alignItems: 'center', padding: '2px 4px 2px 8px', borderBottom: `1px solid ${COL.divider}` }}>
            <span style={{ flex: 1, fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: COL.muted }}>Show</span>
            <button type="button" data-esc="" data-key="Esc" data-key-at="hang" aria-label="Close the filter menu"
              onClick={(e) => { e.stopPropagation(); gearTabBus.setMenu(false); }}
              style={{ position: 'relative', width: 32, height: 28, padding: 0, border: 'none', background: 'transparent', color: COL.text, fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', touchAction: 'manipulation' }}>{'✕'}</button>
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
    const ring = [gold ? `inset 0 0 0 2px ${COL.focus}` : null, blue ? GEAR_SEL_RING : null].filter(Boolean).join(', ');
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
          background: COL.wellSoft, border: `${filled ? edge.w : 1}px solid ${filled ? edge.c : COL.tileBor}`, borderRadius: 7,
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
            position: 'absolute', top: 1, right: 2, fontSize: 9, fontWeight: 900, lineHeight: 1,
            color: sk.unspent > 0 ? COL.accent : COL.text, textShadow: '0 1px 2px rgba(9,14,17,.9)',
            fontVariantNumeric: 'tabular-nums', pointerEvents: 'none',
          }}>{sk.unspent > 0 ? '+' + sk.unspent : 'Lv ' + sk.lvl}</span>
        )}
        {sk && sk.xp && (
          <span aria-hidden="true" data-xpbar={sk.p3cat || undefined}
            data-xpprog={sk.p3cat ? Math.round(displayXp(sk.p3cat, sk.xp.prog)) : undefined}
            data-xpthresh={sk.p3cat ? Math.round(sk.xp.thresh) : undefined}
            style={{ position: 'absolute', left: 3, right: 3, bottom: 2, height: 3, borderRadius: 2, overflow: 'hidden', background: COL.wellDeep, pointerEvents: 'none' }}>
            <span style={{ display: 'block', height: '100%', width: `${Math.min(100, (displayXp(sk.p3cat, sk.xp.prog) / sk.xp.thresh) * 100)}%`, background: '#8AA9F9' }} />
          </span>
        )}
      </div>
    );
  };
  const gridW = 3 * cell + 2 * CG;
  const equipment = (
    <div data-gear-pane="equip" style={panel({ width: eqW, ...(wide ? { height: invH } : { height: lowH }), padding: EP, alignItems: 'center', justifyContent: wide ? 'flex-start' : 'center' })}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(3, ${cell}px)`, gridAutoRows: `${cell}px`, gap: CG, width: gridW }}>
        {GEAR_CELLS.map(cellEl)}
      </div>
    </div>
  );

  /* ═════ BRO ═════ */
  const tabBtn = (id, word) => {
    const on = id === 'stats' ? showStats : !showStats;
    return (
      <button type="button" data-gear-tab-btn={id} aria-pressed={on}
        onClick={(e) => {
          e.stopPropagation();
          /* STATS while a pick shows is already STATS; LOOK puts the pick down */
          if (id === 'stats' && (selCell || selEntry)) return;
          if (selCell || selEntry) gearTabBus.deselect();
          gearTabBus.setTab(id);
        }}
        style={{
          flex: '1 1 0', minWidth: 0, height: TAB_H - 4, padding: 0, borderRadius: 7,
          border: `1px solid ${on ? COL.accent : COL.border}`, background: on ? COL.accentFill : COL.wellSoft,
          color: on ? COL.text : COL.text2, fontFamily: 'inherit', fontSize: 10.5, fontWeight: 800,
          letterSpacing: '.08em', cursor: 'pointer', touchAction: 'manipulation',
        }}>{word}</button>
    );
  };
  const goPoints = (s) => {
    const k = combatSkillState(R, s);
    dashboardPanelBus.open('hero');
    if (k.p3) heroSectionBus.request('Build', k.p3cat);
    else if (k.cat) { requestT2Category(k.cat); dashboardPanelBus.push('t2'); }
  };
  const nameEl = (name, quality) => (
    <div data-gear-name={name} style={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.15, color: COL.text, ...(qualityInk(quality) || null), overflowWrap: 'anywhere' }}>{name}</div>
  );
  const sentence = (t) => t ? <div style={{ fontSize: 10.5, color: COL.text2, lineHeight: 1.3 }}>{t}</div> : null;
  /* The pick's main button rides at the foot of the middle panel, always in
     view however long the stats above it run (a phone's middle panel is 90 px
     wide and ~150 tall): Unequip for a cell, the first of a bag piece's
     actions (Equip, Eat, Drink...) for a bag piece; the rest scroll. */
  let footer = null;
  let statsBody;
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
    statsBody = (
      <div data-gear-stats="cell" data-gear-stats-for={selCell} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {selCell === 'gem' ? (
          <>
            {nameEl(ct.els && ct.els.length ? ct.name : 'No gem yet', null)}
            {sentence(ct.hand
              ? (ct.els && ct.els.length ? 'Set in your ' + weaponDisplayName(ct.hand) + '.' : 'Your ' + weaponDisplayName(ct.hand) + ' has no gem in it.')
              : 'Nothing in your hand.')}
            <div data-gear-gemworks="" style={{ fontSize: 10.5, fontWeight: 700, color: COL.muted, lineHeight: 1.3 }}>Gems are set at the Gem Works</div>
          </>
        ) : ct.item ? (
          <>
            {nameEl(ct.name, ct.quality)}
            {ct.rows.length > 0 && <StatList rows={ct.rows} />}
            {sentence(SLOT_SENTENCE[selCell])}
          </>
        ) : (
          <>
            {nameEl(c.label, null)}
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
    /* v2.3.4031: a "?" piece (v2.3.4012's mystery reveal) shows its card's
       name and no comparison -- its numbers would give its grade away */
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
    if (lead) {
      footer = (
        <button type="button" data-gear-act={lead.id} {...(lead.attrs || {})}
          onClick={(e) => { e.stopPropagation(); press(lead); }}
          style={actBtn(lead.tone, false)}>{lead.label}</button>
      );
    }
    statsBody = (
      <div data-gear-stats="bag" data-gear-stats-for={selEntry.kind === 'item' ? 'i-' + selEntry.key : selEntry.kind} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {hidden ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ position: 'relative', width: 24, height: 24, flex: 'none' }}><UnrevealedMark size={22} /></div>
            {nameEl(name, null)}
          </div>
        ) : nameEl(name, o && o.quality)}
        {cmp && cmp.length > 0 && <div style={{ fontSize: 10, color: COL.muted }}>{vs}</div>}
        {cmp && cmp.length > 0 && <CompareList rows={cmp} />}
        {sentence(card.info || card.desc)}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {list.filter((a) => a !== lead).map((a) => (
            <React.Fragment key={a.id}>
              <button type="button" data-gear-act={a.id} disabled={a.off} aria-disabled={a.off || undefined} {...(a.attrs || {})}
                onClick={(e) => { e.stopPropagation(); press(a); }}
                style={actBtn(a.tone, a.off)}>{a.label}</button>
              {a.off && a.why && <div style={{ fontSize: 10, color: COL.muted, lineHeight: 1.3 }}>{a.why}</div>}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  } else {
    statsBody = (
      <div data-gear-stats="mine" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <StatList rows={myStatRows(R)} />
      </div>
    );
  }
  const broInnerW = Math.max(40, broW - 2 * PAD);
  const broInnerH = Math.max(40, (wide ? invH : lowH) - 2 * PAD - TAB_H);
  const figSize = Math.max(40, Math.min(broInnerH - 4, Math.floor((broInnerW - 4) / 0.52)));
  const handWpn = R[HAND_FIELD[hand]] || null;
  const broPane = (
    <div ref={bro} data-gear-pane="bro" style={panel({ width: broW, height: wide ? invH : lowH })}>
      <div style={{ height: TAB_H, flex: 'none', display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {tabBtn('look', 'LOOK')}
        {tabBtn('stats', 'STATS')}
      </div>
      {showStats ? (
        <>
          <div data-gear-scroll="" style={{ flex: 1, minHeight: 0, overflowY: 'auto', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch', padding: '2px 2px 6px' }}>
            {statsBody}
          </div>
          {footer && <div data-gear-foot="" style={{ flex: 'none', paddingTop: 3 }}>{footer}</div>}
        </>
      ) : (
        <div data-gear-look="" style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <CharacterView size={figSize} weapon={handWpn} shield={R.shield} dir="southwest" crop />
        </div>
      )}
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
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: wide ? 'row' : 'column', gap: GAP, alignItems: wide ? 'stretch' : 'stretch' }}>
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

