/* ═══ v2.3.6687: THE ONE ITEM PAGE: WHAT OPENS IT, AND WHAT IT READS (card UI2-gear PR 1) ═══
 *
 * The page itself is dash/ItemPage.jsx, a page of the dashboard's frame
 * ('item', BottomDashboard's PANELS) pushed on the workspace that opened it
 * (Gear's own stack: its Back is Gear, as it was left, the pick kept by
 * gearTabBus).  Its model is src/game/itemInspect.js.  This file is the
 * bridge between them: an opener hands over what it knows of an item and the
 * game's state FROM ITS PARENT (`R`, the rpg record GearTab was given:
 * open-hand.test closes window._gameState to new readers), and
 * itemPageInput() turns that into the model's input from the game's OWN
 * readers, the same ones Gear's card uses:
 *   the item card's facts  ItemDetailPopup resolveItemCard (the data model);
 *   the actions            itemActions.js itemActionList (the one list) and
 *                          runItemAction (the one runner);
 *   the stat rows          gearStats.js weaponRows / shieldRows / armourRows
 *                          (a weapon's DPS is calcDisplayDps on YOUR character);
 *   a worn cell            gearCells.js cellContent (Gear's own reader);
 *   the equip gate         gameSystems.js getEquipReqLabel (the number the
 *                          worker's gate asks; equipActions refuses by it).
 * PR 1 opens it from Gear's card only ("Gear's Details opens it first;
 * nothing else moves yet"); the Codex, Bro's Equipment and the tooltips come
 * to it in PR 3 with a `from` of their own. */
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { resolveItemCard } from './ItemDetailPopup.jsx';
import { itemActionList, runItemAction, entryTarget } from './itemActions.js';
import { itemDetailBus } from './itemDetailBus.js';
import { gearTabBus } from './gearTabBus.js';
import { weaponSlotFor } from './equipActions.js';
import { weaponRows, shieldRows, armourRows } from './gearStats.js';
import { cellContent } from './gearCells.js';
import { gearCell } from './itemCategory.js';
import { isCapeItemKey } from './InventoryPanel.jsx';
import { getEquippedSlots, weaponDisplayName } from '../sheet/equipModel.js';
import { getEquipReqLabel } from '../../../data/gameSystems.js';
import { gemElementName } from '@/data/gems.js';

/* the page's one source: what was opened, and a number for each change (a
   pin toggled) so the page draws again */
let _src = null;
let _seq = 0;
const _subs = new Set();
const emit = () => { _seq += 1; for (const f of [..._subs]) { try { f(_seq); } catch (e) { /* a page went */ } } };

export const itemPageBus = {
  get state() { return _src; },
  get seq() { return _seq; },
  subscribe(fn) { _subs.add(fn); return () => _subs.delete(fn); },
  bump() { emit(); },
};

/** Open the one item page over the workspace that is up.  `src`:
 *    { from: 'gear', R, entry }   a bag entry (bagModel), Gear's pick;
 *    { from: 'gear', R, cell }    one of Gear's nine cells ('sword' ... 'amulet'). */
export function openItemPage(src) {
  if (!src || !src.R) return;
  _src = Object.freeze({ ...src });
  emit();
  try { dashboardPanelBus.push('item'); } catch (e) { /* no frame: nothing to draw it in */ }
}

/** Back to the page under it (Gear, as it was left). */
export function closeItemPage() {
  try { dashboardPanelBus.pop(); } catch (e) { /* the frame went */ }
}

const KIND_OF_FIELD = { weapon: 'sword', rangedWeapon: 'bow', staffWeapon: 'staff' };
const gemsOf = (w) => (w ? [w.element1, w.element2].filter(Boolean).map((e) => gemElementName(e) + ' Gem') : []);
const hardOf = (w) => (w && typeof w === 'object' && w.hardness != null ? Number(w.hardness) || 0 : null);
const safe = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };

/* a bag entry's input */
function fromEntry(R, entry) {
  const target = entryTarget(entry);
  if (!target) return null;
  const card = safe(() => resolveItemCard(target), null) || {};
  const o = entry.obj || null;
  const hidden = !!card.unrevealed;
  let kind = 'item';
  let rows = [];
  let req = null;
  if (entry.kind === 'stashWeapon' && o) {
    kind = KIND_OF_FIELD[weaponSlotFor(o.type)] || 'sword';
    rows = safe(() => weaponRows(R, o), []);
    req = safe(() => getEquipReqLabel(o, 'weapon', R), null);
  } else if (entry.kind === 'stashShield' && o) {
    kind = 'shield';
    rows = safe(() => shieldRows(o), []);
    req = safe(() => getEquipReqLabel(o, 'shield', R), null);
  } else if ((entry.kind === 'stashArmor' || entry.kind === 'stashLegs') && o) {
    kind = entry.kind === 'stashArmor' ? 'chest' : 'legs';
    rows = safe(() => armourRows(o, kind), []);
    req = safe(() => getEquipReqLabel(o, 'armor', R), null);
  } else if (entry.kind === 'stashGear' && o) {
    kind = o.slot === 'legs' ? 'legs' : 'chest';
  } else if (entry.kind === 'item' && isCapeItemKey(entry.key)) {
    kind = 'cape';
  }
  const info = card.info && !/^Quantity:/.test(card.info) ? card.info : '';
  return {
    target, card, place: 'bag',
    input: {
      place: 'bag', atShop: false, kind,
      name: !hidden && entry.kind === 'stashWeapon' && o ? weaponDisplayName(o) : (card.name || ''),
      art: card.thumb || null, glyph: card.glyph || null,
      quality: hidden ? null : (o ? o.quality : null), hidden,
      rows, line: rows.length ? '' : (info || card.desc || ''),
      count: entry.count || 0,
      hardness: entry.kind === 'stashWeapon' ? hardOf(o) : null,
      gems: entry.kind === 'stashWeapon' ? gemsOf(o) : [],
      req: hidden ? null : req,
      actions: itemActionList(target, card),
    },
  };
}

/* the item card's target for a worn cell, where the card has one */
function cellTarget(R, id) {
  const c = gearCell(id);
  if (c.field) return R[c.field] ? { kind: 'weapon', wpn: R[c.field], slot: c.active } : null;
  if (id === 'shield') return R.shield ? { kind: 'shield', shield: R.shield } : null;
  if (id === 'chest' && R.armor) return { kind: 'armor', armor: R.armor };
  return null;
}

/* a worn cell's input: Gear's own reader, the item card's where it has one */
function fromCell(R, id) {
  if (id === 'gem') return null;   /* the gems are set in the weapon in your hand: its own page shows them */
  const ct = safe(() => cellContent(R, id, getEquippedSlots(R)), null);
  if (!ct || !ct.item) return null;
  const c = gearCell(id);
  const target = cellTarget(R, id);
  const card = target ? (safe(() => resolveItemCard(target), null) || {}) : {};
  /* the one list where the card answers; else Gear's own Unequip (a legs
     piece, a cape) and none for the amulet (the worker would destroy it:
     gearCells.js) */
  const actions = target ? itemActionList(target, card)
    : (ct.unequip ? [{ id: 'unequip', label: 'Unequip', tone: 'primary', off: false, why: '', attrs: null }] : []);
  const kind = c.field ? (KIND_OF_FIELD[c.field] || 'sword') : id;
  return {
    target, card, place: 'worn', unequip: ct.unequip,
    input: {
      place: 'worn', kind,
      name: ct.name || card.name || '',
      art: ct.icon || card.thumb || null, glyph: card.glyph || null,
      quality: ct.quality || null,
      rows: ct.rows || [],
      line: (ct.rows && ct.rows.length) ? '' : (card.info || ''),
      hardness: c.field ? hardOf(ct.item) : null,
      gems: c.field ? gemsOf(ct.item) : [],
      req: null,   /* worn: the gate has said yes */
      actions,
    },
  };
}

/** What the page draws from, or null when the item is gone. */
export function itemPageInput(src) {
  if (!src || !src.R) return null;
  if (src.entry) return fromEntry(src.R, src.entry);
  if (src.cell) return fromCell(src.R, src.cell);
  return null;
}

/** Run one of the page's actions: the one runner, as Gear's card runs it.
    A change to what you wear or hold goes back to Gear, which shows it (the
    specification's Q82: "Routine: Equip item -- immediate component update");
    Drop hands to the item card's own sheet; Pin stays and redraws. */
export function runItemPageAction(id, got) {
  if (!got) return;
  const back = (after) => { closeItemPage(); if (after) after(); };
  if (!got.target) {
    if (id === 'unequip' && got.unequip) back(() => { got.unequip(); gearTabBus.afterChange(); });
    return;
  }
  const changes = id === 'equip' || id === 'unequip' || id === 'capeOn' || id === 'capeOff';
  const ui = {
    close: () => back(changes ? () => gearTabBus.afterChange() : null),
    sell: () => {},
    drop: () => back(() => itemDetailBus.open({ ...got.target, anchor: null, flow: 'drop' })),
  };
  runItemAction(id, got.target, got.card, ui, { equip: { activate: false } });
  if (id === 'lock') emit();
}
