/* ═══ v2.3.6861: BRO · BAG IN THE NEW PANEL -- THE RAIL, THE GRID, GEAR, THE ITEM PAGE, A SLOT, A PET (card MN step 4) ═══
 *
 * The owner's Bag (docs/design/menus3/SPEC.md "What You Carry", the card's
 * "Decided" 4, the wireframe v4.4): a filter rail (All, Gear, Weapons, Armor,
 * Consumables, Materials, Pets) over a grid four across, a tile its picture,
 * its name and its count; Gear a tab of the rail (the nine slots and the pet
 * out with you); a tile opens the ONE Item page; a slot its page (what is
 * worn, and what in the bag fits, each with a direct Equip); a pet its page.
 * The rules are node's (src/game/menus3Bag.js, menus3Nav.js); the history and
 * its Back are the panel's (menus3Wire.js menus3Bus).
 *
 * NOTHING NEW IS INVENTED.  Every list is the game's own reader: the bag and
 * the spare lists (dash/bagModel.js getBagEntries, identical spare armour as
 * one tile: dash/gearBag.js groupSpare), a worn slot (dash/gearCells.js
 * cellContent), an item's facts and actions (dash/itemPageOpen.js
 * itemPageInput -> src/game/itemInspect.js inspectItem: the model today's
 * item page draws), and every action runs through THE one runner today's
 * Gear runs (dash/itemActions.js runItemAction), so each sends the SAME
 * request through the action door (act()).  Drop opens the item card's own
 * sheet (how many, the confirmation), as Gear's does; a pet's page IS
 * today's (dash/PetsPage.jsx PetOne: take out, put away, rename, release).
 * What is done at a town counter (selling, banking, smelting...) is shown
 * greyed with where (menus3Bag.js counterActions).
 *
 * The pictures are the game's own item art, the same files today's Gear
 * draws (BagTile); the pets' the sheet the loading screen fetched. */
import React from 'react';
import { Ui2Slot, Ui2Group, Ui2Value, Ui2Action, Ui2Comparison, ui2RootClass } from '@/ui/kit/index.js';
import { getBagEntries } from '@/ui/mobile/dash/bagModel.js';
import { groupSpare } from '@/ui/mobile/dash/gearBag.js';
import { BagTile } from '@/ui/mobile/dash/InventoryPanel.jsx';
import { resolveItemCard } from '@/ui/mobile/dash/ItemDetailPopup.jsx';
import { entryTarget, runItemAction } from '@/ui/mobile/dash/itemActions.js';
import { itemPageInput } from '@/ui/mobile/dash/itemPageOpen.js';
import { itemDetailBus } from '@/ui/mobile/dash/itemDetailBus.js';
import { cellContent } from '@/ui/mobile/dash/gearCells.js';
import { gearCell } from '@/ui/mobile/dash/itemCategory.js';
import { subscribe as locksChanged } from '@/ui/mobile/dash/inventoryLocks.js';
import { getEquippedSlots } from '@/ui/mobile/sheet/equipModel.js';
import { PetOne } from '@/ui/mobile/dash/PetsPage.jsx';
import { PetPortrait } from '@/ui/petPortrait.jsx';
import { dashboardPanelBus } from '@/ui/mobile/dashboardPanelBus.js';
import { inspectItem, reqWords } from '@/game/itemInspect.js';
import { compareSet } from '@/game/compare.js';   /* the equipped comparison, as Gear's quick look */
import { projectEquip } from '@/game/equipProject.js';
import { itemActIntent } from '@/game/v17Gear.js';
import { petbookOn, petList, activePet } from '@/game/petBook.js';
import { petDisplayName, worldSafeText } from '@/data/trapping.js';
import { WEAPON_STASH_MAX } from '@/data/gameSystems.js';
import { beforeDraw } from '@/game/framePacer.js';
import { MENUS3_RAIL, MENUS3_SLOTS, railId, railEntries, railCounts, slotCandidates, counterActions, gridCols } from '@/game/menus3Bag.js';
import { menus3Bus, menus3Close, menus3ShapeNow } from './menus3Wire.js';
import { SAY } from '@/data/say/menus3.js';
import { SAY as SAY_P } from '@/data/say/pets.js';
import { say } from '@/game/say.js';
import { winVw } from '@/ui/mobile/playViewport.js';

/* ── names, kept: a tile's name asks the item card once per key (an item) or
   per piece (a spare), not every draw ── */
const _itemName = new Map();
const _pieceName = new WeakMap();
function nameOf(e) {
  try {
    if (e.kind === 'item') {
      let n = _itemName.get(e.key);
      if (n == null) {
        n = (resolveItemCard({ kind: 'inventory', key: e.key, count: 0 }) || {}).name || e.key;
        if (_itemName.size > 400) _itemName.clear();   /* a cap: the bag's keys are far fewer */
        _itemName.set(e.key, n);
      }
      return n;
    }
    if (!e.obj) return '';
    let n = _pieceName.get(e.obj);
    if (n == null) { n = (resolveItemCard(entryTarget(e)) || {}).name || ''; _pieceName.set(e.obj, n); }
    return n;
  } catch (x) { return ''; }
}

/* an entry's handle in the history (a string: the nav compares it) */
export function entryArg(e) { return e.kind === 'item' ? 'item:' + e.key : e.kind + ':' + e.index; }
function findEntry(entries, arg) {
  if (typeof arg !== 'string') return null;
  const i = arg.indexOf(':');
  const kind = arg.slice(0, i), rest = arg.slice(i + 1);
  for (const e of entries) {
    if (e.kind !== kind) continue;
    if (kind === 'item' ? e.key === rest : String(e.index) === rest) return e;
  }
  return null;
}

/* the words of a rail place */
function railWord(id, c) {
  switch (id) {
    case 'all': return say(SAY, 'menus3.railAll', { n: c.all });
    case 'gear': return say(SAY, 'menus3.railGear');
    case 'weapons': return say(SAY, 'menus3.railWeapons', { n: c.weapons, max: c.weaponsMax });
    case 'armor': return say(SAY, 'menus3.railArmor');
    case 'consumables': return say(SAY, 'menus3.railConsumables');
    case 'materials': return say(SAY, 'menus3.railMaterials');
    default: return say(SAY, 'menus3.railPets', { n: c.pets });
  }
}

const COUNTER_WORD = {
  sell: () => say(SAY, 'menus3.counterSell'), smelt: () => say(SAY, 'menus3.counterSmelt'), cook: () => say(SAY, 'menus3.counterCook'),
  setGem: () => say(SAY, 'menus3.counterSetGem'), harden: () => say(SAY, 'menus3.counterHarden'), bank: () => say(SAY, 'menus3.counterBank'),
};

/* ── a tile: the game's own picture (BagTile), its name under it ── */
function Tile({ e, onOpen }) {
  const name = nameOf(e);
  return (
    <button type="button" className="u2-raised u2-ctl m3-tile" data-m3-tile={entryArg(e)} data-m3-kind={e.gcat || ''}
      aria-label={name} onClick={() => onOpen(e)}>
      <span className="m3-tile-art" aria-hidden="true"><BagTile kit entry={e} selected={false} style={{ width: 40, height: 40 }} /></span>
      <span className="m3-tile-name">{name}</span>
    </button>
  );
}

/* ── the Gear tab: the nine slots, the pet out with you ── */
function GearTab({ R, S, open }) {
  const slots = getEquippedSlots(R);
  const pet = S ? activePet(S) : null;
  return (
    <div data-m3-gear="">
      <div className="m3-geargrid">
        {MENUS3_SLOTS.map((id) => {
          let ct = null;
          try { ct = cellContent(R, id, slots); } catch (x) { ct = null; }
          const worn = !!(ct && ct.item);
          return (
            <button key={id} type="button" className="u2-raised u2-ctl m3-slot" data-m3-slot={id} data-m3-worn={worn ? '1' : '0'}
              onClick={() => open('slot', id)}>
              <span className="m3-slot-art" aria-hidden="true">
                <Ui2Slot grade={(ct && ct.quality) || 'normal'} art={worn ? ct.icon : null} empty={!worn} size={32} />
              </span>
              <span className="m3-slot-words">
                <span className="m3-slot-label">{gearCell(id).label}</span>
                <span className="m3-slot-name">{worn ? ct.name : say(SAY, 'menus3.slotEmpty')}</span>
              </span>
            </button>
          );
        })}
      </div>
      <button type="button" className="u2-raised u2-ctl m3-petrow" data-m3-petrow={pet ? String(pet.id) : ''}
        onClick={() => { if (pet && pet.id != null && petbookOn(S)) open('pet', String(pet.id)); else open('pets'); }}>
        <span className="m3-petrow-art" aria-hidden="true">{pet ? <PetPortrait pet={pet} size={30} /> : null}</span>
        <span>{say(SAY, 'menus3.activePet')} · {pet ? worldSafeText(petDisplayName(pet)) : say(SAY, 'menus3.noPet')}</span>
      </button>
    </div>
  );
}

/* ── the Pets rail: every pet you own; Pet House and the journal stay on
   today's Pets page (a door) until the Counter's Keep step ── */
function PetsRail({ S, open }) {
  const live = petbookOn(S);
  const list = live ? petList(S) : [];
  const out = live ? activePet(S) : null;
  const toToday = () => { menus3Close('door'); try { dashboardPanelBus.open('pets'); } catch (x) { /* no band */ } };
  return (
    <div data-m3-pets={list.length}>
      {!live ? <p className="m3-line">{say(SAY, 'menus3.petsOff')}</p> : null}
      {live && !list.length ? <p className="m3-line" data-m3-empty="">{say(SAY_P, 'pets.emptyHow', { trap: say(SAY_P, 'pets.trapButton') })}</p> : null}
      <div className="m3-grid" style={{ gridTemplateColumns: 'repeat(var(--m3-cols, 4), minmax(0, 1fr))' }}>
        {list.map((p) => (
          <button key={String(p.id)} type="button" className={'u2-raised u2-ctl m3-tile' + (out && out.id === p.id ? ' is-selected' : '')}
            data-m3-pet={String(p.id)} onClick={() => open('pet', String(p.id))}>
            <span className="m3-tile-art" aria-hidden="true"><PetPortrait pet={p} size={36} /></span>
            <span className="m3-tile-name">{worldSafeText(petDisplayName(p))}</span>
          </button>
        ))}
      </div>
      <button type="button" className="u2-raised u2-ctl m3-door" data-m3-petsdoor="" onClick={toToday}>{say(SAY, 'menus3.petsMore')}</button>
    </div>
  );
}

/* the rail's place, read at the top of the next frame (docs/specs/layout-reads.md way 3), once a frame */
let _railAsk = false;
function keepRailX(ref) {
  if (_railAsk) return;
  _railAsk = true;
  beforeDraw(() => { _railAsk = false; const el = ref.current; if (el) BagRoot._railX = el.scrollLeft; });
}

/* ── the bag's own page: the rail and what it shows ── */
function BagRoot({ R, S, top, open }) {
  const rail = railId(top.rail);
  const entries = React.useMemo(() => groupSpare(getBagEntries(R)), [R]);
  const counts = railCounts(entries, R && Array.isArray(R.weaponStash) ? R.weaponStash.filter(Boolean).length : 0, WEAPON_STASH_MAX, S ? petList(S).length : 0);
  const railRef = React.useRef(null);
  /* the rail's place: put back at the top of a frame (no measuring) */
  React.useEffect(() => {
    const x = BagRoot._railX || 0;
    if (x > 0) beforeDraw(() => { const el = railRef.current; if (el) el.scrollLeft = x; });
  }, []);
  const pick = (id) => { menus3Bus.keep({ rail: id, scroll: 0 }); menus3Bus.bump(); };
  const shown = rail === 'gear' || rail === 'pets' ? null : railEntries(entries, rail);
  return (
    <div data-m3-bag={rail}>
      <div className="m3-rail" ref={railRef} role="tablist" aria-label={say(SAY, 'menus3.railAria')}
        onScroll={() => keepRailX(railRef)}>
        {MENUS3_RAIL.map((id) => (
          <button key={id} type="button" role="tab" aria-selected={id === rail} className={'u2-raised u2-ctl m3-pill' + (id === rail ? ' is-selected' : '')}
            data-m3-rail={id} onClick={() => pick(id)}>{railWord(id, counts)}</button>
        ))}
      </div>
      {rail === 'gear' ? <GearTab R={R} S={S} open={open} /> : null}
      {rail === 'pets' ? <PetsRail S={S} open={open} /> : null}
      {shown ? (
        shown.length ? (
          <div className="m3-grid" data-m3-grid={shown.length} style={{ gridTemplateColumns: 'repeat(var(--m3-cols, 4), minmax(0, 1fr))' }}>
            {shown.map((e) => <Tile key={entryArg(e)} e={e} onOpen={(x) => open('item', entryArg(x))} />)}
          </div>
        ) : <p className="m3-line" data-m3-empty="">{say(SAY, rail === 'all' ? 'menus3.emptyAll' : 'menus3.emptyRail')}</p>
      ) : null}
    </div>
  );
}

/* ── run one of an item's actions: THE runner today's Gear runs ── */
function runAct(id, got, stay) {
  if (!got) return;
  if (!got.target) {
    if (id === 'unequip' && got.unequip) { got.unequip(); menus3Bus.back(); }
    return;
  }
  const ui = {
    close: () => { if (!stay) menus3Bus.back(); },
    sell: () => {},
    drop: () => itemDetailBus.open({ ...got.target, anchor: null, flow: 'drop' }),
  };
  runItemAction(id, got.target, got.card, ui, { equip: { activate: false } });
}

/* the kinds a comparison is drawn for (dash/GearPanels.jsx COMPARE_KINDS) */
const COMPARE_KINDS = Object.freeze({ sword: 1, bow: 1, staff: 1, chest: 1, legs: 1, shield: 1 });
/* "Now" and "If equipped", YOUR character's numbers (src/game/equipProject.js), never better or worse in words of its own */
function comparison(R, entry, got, m) {
  if (!entry || !entry.obj || m.hidden || !COMPARE_KINDS[got.input.kind]) return null;
  try {
    const p = projectEquip(R, entry.obj, got.input.kind);
    return p ? compareSet({ kind: p.kind, a: p.now, b: p.then, restricted: reqWords(p.req).why, hidden: m.hidden }) : null;
  } catch (x) { return null; }
}

/* ── the one Item page ── */
function ItemPage3({ R, arg }) {
  const [, redraw] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => locksChanged(() => redraw()), []);
  let got = null;
  let entry = null;
  if (typeof arg === 'string' && arg.indexOf('cell:') === 0) {
    try { got = itemPageInput({ from: 'gear', R, cell: arg.slice(5) }); } catch (x) { got = null; }
  } else {
    entry = findEntry(groupSpare(getBagEntries(R)), arg);
    if (entry) { try { got = itemPageInput({ from: 'gear', R, entry }); } catch (x) { got = null; } }
  }
  const m = got ? inspectItem(got.input) : null;
  if (!m) return <div className="m3-page" data-m3-item="" data-m3-gone=""><p className="m3-line">{say(SAY, 'menus3.gone')}</p></div>;
  const acts = m.actions.filter((a) => a.id !== 'sell');   /* selling is a counter's: below, greyed with where */
  const lead = acts.find((a) => a.lead) || null;
  const rest = acts.filter((a) => a !== lead);
  const counters = entry ? counterActions(entry.gcat, got.card && got.card.actions, entry.kind) : [];
  const btn = (a, wide) => (
    <Ui2Action key={a.id} intent={itemActIntent(a.id) || undefined} c={a.face} label={a.label} disabled={a.off}
      data-m3-act={a.id} data-item-act={a.id} aria-description={a.off ? a.why : undefined}
      style={wide ? { width: '100%' } : { flex: '1 1 0' }} {...(a.attrs || {})}
      onClick={(ev) => { ev.stopPropagation(); if (!a.off) runAct(a.id, got, a.id === 'lock'); }} />
  );
  const why = acts.filter((a) => a.off && a.why).map((a) => a.label + ': ' + a.why)[0] || '';
  const cmp = comparison(R, entry, got, m);
  const cmpRow = (r, head) => (
    <Ui2Comparison key={r.key} k={r.label} before={r.a.n} after={r.b.n} lower={r.goodWay === 'lower'} digits={r.dec} unit={r.unit}
      className={head ? 'is-head' : undefined} data-m3-cmp={r.key} />
  );
  return (
    <div className={ui2RootClass('m3-page')} data-m3-item={arg} data-m3-grade={m.hidden ? 'hidden' : m.grade}>
      <div className="m3-item-id">
        <Ui2Slot grade={m.hidden ? 'normal' : m.grade} hidden={m.hidden} art={m.art} size={48} name={m.name} />
        <span className="m3-item-words">
          <span className="m3-item-name" data-m3-item-name={m.name}>{m.name}</span>
          <span className="m3-item-sub">{[m.gradeWord, m.where].filter(Boolean).join(' · ')}</span>
        </span>
      </div>
      {m.facts.length ? (
        <div className="m3-facts" data-m3-facts={m.facts.length}>
          {m.facts.map((f) => <Ui2Group key={f.k} k={f.k} data-m3-fact={f.k}><Ui2Value v={f.v} /></Ui2Group>)}
        </div>
      ) : null}
      {cmp && cmp.head ? (
        <div className="m3-cmp" data-m3-compare={cmp.head.key}>
          {cmpRow(cmp.head, true)}
          {(cmp.rows || []).map((r) => cmpRow(r, false))}
          {cmp.restricted || cmp.tradeoff ? <p className="m3-why">{cmp.restricted || cmp.tradeoff}</p> : null}
        </div>
      ) : null}
      {m.line ? <p className="m3-line" data-m3-item-line="">{m.line}</p> : null}
      {rest.length ? <div className="m3-acts" data-m3-acts={rest.map((a) => a.id).join(' ')}>{rest.map((a) => btn(a, false))}</div> : null}
      {why ? <p className="m3-why" data-m3-why="">{why}</p> : null}
      {counters.length ? (
        <div className="m3-counters" data-m3-counters={counters.map((c) => c.id).join(' ')}>
          <span className="m3-counters-head">{say(SAY, 'menus3.townOnly')}</span>
          {counters.map((c) => (
            /* not pressable here, so no raised face (ui3-weights): a line, greyed */
            <span key={c.id} className="m3-counter" aria-disabled="true" data-m3-counter={c.id}>
              {COUNTER_WORD[c.id]()}
            </span>
          ))}
        </div>
      ) : null}
      {lead ? <div className="m3-foot" data-m3-lead={lead.id}>{btn(lead, true)}</div> : null}
    </div>
  );
}

/* ── a slot's page: what is worn, and what in the bag fits, each with Equip ── */
function SlotPage({ R, slot, open }) {
  const entries = groupSpare(getBagEntries(R));
  let ct = null;
  try { ct = cellContent(R, slot, getEquippedSlots(R)); } catch (x) { ct = null; }
  const worn = !!(ct && ct.item);
  const cands = slotCandidates(entries, slot);
  return (
    <div className="m3-page" data-m3-slotpage={slot}>
      <span className="m3-counters-head">{say(SAY, 'menus3.wornNow')}</span>
      {worn ? (
        <button type="button" className="u2-raised u2-ctl m3-row" data-m3-wornrow={slot} onClick={() => open('item', 'cell:' + slot)}>
          <Ui2Slot grade={ct.quality || 'normal'} art={ct.icon} size={40} name={ct.name} />
          <span className="m3-row-name">{ct.name}</span>
        </button>
      ) : <p className="m3-line">{say(SAY, 'menus3.wornNone')}</p>}
      {slot === 'chest' ? (
        <button type="button" className="u2-raised u2-ctl m3-door" data-m3-shirt=""
          onClick={() => itemDetailBus.open({ kind: 'loadout', slot: 'chest', anchor: null })}>{say(SAY, 'menus3.shirtCard')}</button>
      ) : null}
      <span className="m3-counters-head">{say(SAY, 'menus3.candidates')}</span>
      {slot === 'gem' ? <p className="m3-line">{say(SAY, 'menus3.gemSet')}</p> : null}
      {!cands.length ? <p className="m3-line" data-m3-nocand="">{say(SAY, 'menus3.noCandidates')}</p> : null}
      {cands.map((e) => {
        let got = null;
        try { got = itemPageInput({ from: 'gear', R, entry: e }); } catch (x) { got = null; }
        const eq = got ? got.input.actions.find((a) => a.id === 'equip' || a.id === 'capeOn') : null;
        return (
          <div key={entryArg(e)} className="m3-cand" data-m3-cand={entryArg(e)}>
            <button type="button" className="u2-raised u2-ctl m3-row" onClick={() => open('item', entryArg(e))}>
              <span className="m3-tile-art" aria-hidden="true"><BagTile kit entry={e} selected={false} style={{ width: 40, height: 40 }} /></span>
              <span className="m3-row-name">{nameOf(e)}</span>
            </button>
            {eq ? (
              <Ui2Action intent={itemActIntent('equip') || undefined} label={say(SAY, 'menus3.equip')} disabled={eq.off}
                data-m3-equip={entryArg(e)} onClick={(ev) => { ev.stopPropagation(); if (!eq.off) runAct(eq.id, got, true); }} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** The Bag section: the page on top of the panel's history. */
export function Menus3Bag({ R, getS, top }) {
  const S = typeof getS === 'function' ? getS() : null;
  const open = React.useCallback((page, arg) => {
    if (page === 'pets') { menus3Bus.keep({ rail: 'pets', scroll: 0 }); menus3Bus.bump(); return; }
    menus3Bus.push(page, arg == null ? null : String(arg));
  }, []);
  if (!R || !top) return null;
  const cols = gridCols(winVw() * (top && menus3ShapeNow() === 'drawer' ? 0.4 : 1));
  const style = { '--m3-cols': cols };
  let body = null;
  if (top.page === 'item') body = <ItemPage3 R={R} arg={top.arg} />;
  else if (top.page === 'slot') body = <SlotPage R={R} slot={top.arg} open={open} />;
  else if (top.page === 'pet') body = <div className="m3-petpage" data-m3-petpage={top.arg}><PetOne getS={getS} id={top.arg} /></div>;
  else body = <BagRoot R={R} S={S} top={top} open={open} />;
  return <div className="m3-bag" style={style} data-m3-page={top.page}>{body}</div>;
}
