/* ═══ v2.3.4081: THE GEAR TAB'S STATE -- WHAT IS PICKED, WHAT IS FILTERED ═══
 *
 * The owner's design (2026-11-02): "when you tap on an equip slot your
 * inventory gets filtered to whatever item category was tapped on (sword gets
 * filtered to swords, capes filtered to capes) ... The middle character pane
 * can automatically change to display the stats of the highlighted weapon",
 * and the rules adopted against getting stuck: "Always show the active filter
 * ... One-tap clearing ... Automatic equipment filtering is temporary ...
 * Never show a mysterious empty inventory ... Keep selection distinct from
 * filtering".
 *
 * So two things, kept apart on purpose:
 *   sel     what is picked -- an equipment cell ({ cell }) or a bag piece
 *           ({ bag, obj }) -- the blue ring; the middle panel shows it;
 *   filter  what the bag shows -- { id, auto }.  A cell sets it with
 *           auto:true, and an automatic filter goes when the cell is tapped
 *           again, when anything is equipped or taken off, and with its ×; a
 *           filter picked from the menu (auto:false) stays until its ×.
 * Module-scoped, the bagFilterBus shape: it survives leaving the page within
 * a session.  The middle panel's tab (LOOK | STATS) is remembered per device
 * (localStorage, inside try/catch).  window.__btGearTab reads it for QA.
 *
 * v2.3.4081: THE OWNER'S MOCKUP (2026-11-03) -- the middle panel is LOOK |
 * STATS | DETAILS and exactly ONE shows ("it's supposed to be one or the
 * other").  `view` is the one showing: a tap on a cell or a bag piece shows
 * DETAILS; putting the pick down (tapped again, Equip, Unequip) goes back to
 * `tab`, the player's own last pick of LOOK or STATS (STATS at first).  A tap
 * on LOOK or STATS while something is picked shows that tab and keeps the pick
 * (its blue ring, its filter): DETAILS brings it back.
 */
import { gearCell } from './itemCategory.js';

const TAB_KEY = 'bt_gear_tab';
function readTab() {
  try { const v = localStorage.getItem(TAB_KEY); return v === 'look' ? 'look' : 'stats'; } catch (e) { return 'stats'; }
}

const state = { sel: null, filter: { id: 'all', auto: false }, menu: false, tab: readTab() };
state.view = state.tab;   /* v2.3.4081: 'look' | 'stats' | 'details' -- the one the middle shows */
const subs = new Set();
const emit = () => { subs.forEach((fn) => { try { fn(state); } catch (_e) { /* a listener's own problem */ } }); };

export const gearTabBus = {
  state,
  subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  /** Tap an equipment cell: picked and the bag filtered to its kind; tapped
   *  again, both go. */
  tapCell(id) {
    const c = gearCell(id);
    if (!c) return;
    if (state.sel && state.sel.cell === id) { gearTabBus.deselect(); return; }
    state.sel = { cell: id };
    state.filter = { id: c.filter, auto: true };
    state.menu = false;
    state.view = 'details';
    emit();
  },
  /** Tap a bag piece: picked (the filter is left as it is). `bag` is its
   *  data-bag-key, `obj` the stash object (null for an item). */
  tapBag(bag, obj) {
    if (state.sel && state.sel.bag === bag && (state.sel.obj || null) === (obj || null)) { gearTabBus.deselect(); return; }
    state.sel = { bag, obj: obj || null };
    state.menu = false;
    state.view = 'details';
    emit();
  },
  deselect() {
    if (!state.sel && !state.filter.auto) return;
    state.sel = null;
    state.view = state.tab;
    if (state.filter.auto) state.filter = { id: 'all', auto: false };
    emit();
  },
  /** After an Equip or an Unequip: the automatic filter and the pick go. */
  afterChange() {
    state.sel = null;
    state.view = state.tab;
    if (state.filter.auto) state.filter = { id: 'all', auto: false };
    state.menu = false;
    emit();
  },
  pickFilter(id) {
    state.filter = { id: id || 'all', auto: false };
    state.menu = false;
    emit();
  },
  clearFilter() {
    if (state.filter.id === 'all' && !state.menu) return;
    state.filter = { id: 'all', auto: false };
    state.menu = false;
    emit();
  },
  setMenu(open) {
    if (state.menu === !!open) return;
    state.menu = !!open;
    emit();
  },
  /** v2.3.4081: a tap on the middle's segmented row.  LOOK and STATS are
   *  remembered (the pick, if any, stays picked); DETAILS is never
   *  remembered -- it is the pick's, or the plain "tap something" line. */
  setTab(t) {
    if (t === 'details') {
      if (state.view === 'details') return;
      state.view = 'details';
      emit();
      return;
    }
    const v = t === 'look' ? 'look' : 'stats';
    state.tab = v;
    state.view = v;
    try { localStorage.setItem(TAB_KEY, v); } catch (e) { /* a private window: this session only */ }
    emit();
  },
};

if (typeof window !== 'undefined') {
  window.__btGearTab = {
    state: () => ({ sel: state.sel ? { cell: state.sel.cell || null, bag: state.sel.bag || null } : null, filter: { ...state.filter }, menu: state.menu, tab: state.tab, view: state.view }),
    bus: gearTabBus,
  };
}
