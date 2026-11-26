/* ═══ v2.3.4151: THE GEAR TAB'S STATE -- WHAT IS PICKED, WHAT IS FILTERED ═══
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
 * a session.  window.__btGearTab reads it for QA.
 *
 * v2.3.4151: THE OWNER'S SECOND MOCKUP (2026-11-03) -- the middle is ONE card,
 * no tabs: the overview with nothing picked, the pick's card with something
 * picked.  So there is no tab to remember: `view` is 'item' while something is
 * picked and 'overview' otherwise (the LOOK | STATS | DETAILS tabs of the first
 * mockup, and their localStorage key, are gone).
 */
import { gearCell } from './itemCategory.js';
import { dashMinBus } from '../dashMinBus.js';   /* v2.3.4353: the band folding resets this tab */
import { wsStart, wsStep } from '../../../game/workspace.js';   /* v2.3.6688: the two panels' one state (card UI2-gear PR 2); relative, as node tests read this bus */

const state = { sel: null, filter: { id: 'all', auto: false }, menu: false, more: false, ws: wsStart() };
/* v2.3.6688 (card UI2-gear PR 2): `ws`, the two panels' workspace (src/game/workspace.js: management, a
   look from the bag (left) or from the worn cells (right), the item page), moved ONLY by wsStep through
   wsDo below; under the frame `sel` is derived from it (a bag pick keeps its stash object by identity, as
   tapBag's does).  Today's Gear (`?ui2=0`) never reads `ws`. */
/* v2.3.4191: `more` -- the item card's "⋯" open (its Drop, Pin, Inspect...);
   it shuts with any new pick, put-down or filter.  (The skill tiles and their
   XP state left with the tiles, for the Bro page.) */
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
    state.more = false;
    emit();
  },
  /** Tap a bag piece: picked (the filter is left as it is). `bag` is its
   *  data-bag-key, `obj` the stash object (null for an item). */
  tapBag(bag, obj) {
    if (state.sel && state.sel.bag === bag && (state.sel.obj || null) === (obj || null)) { gearTabBus.deselect(); return; }
    state.sel = { bag, obj: obj || null };
    state.menu = false;
    state.more = false;
    emit();
  },
  /** v2.3.4233: tap the coins: picked like any other object (the card says
   *  what gold is); tapped again, put down. */
  tapGold() {
    if (state.sel && state.sel.gold) { gearTabBus.deselect(); return; }
    state.sel = { gold: true };
    state.menu = false;
    state.more = false;
    emit();
  },
  /** v2.3.6688: one event of the two panels' workspace (wsStep's), `obj` a bag pick's stash object;
   *  `quiet` records without a redraw (a scroll, read at the top of a frame). */
  wsDo(ev, obj, quiet) {
    const n = wsStep(state.ws, ev);
    if (n === state.ws) return;
    const was = state.ws;
    state.ws = n;
    if (n.pick == null) state.sel = null;
    else if (n.from === 'left') state.sel = { bag: n.pick, obj: ev && ev.type === 'pick' ? (obj || null) : ((state.sel && state.sel.obj) || null) };
    else state.sel = { cell: n.pick };
    /* an empty cell picked in management filters the bag to its kind (the owner's 2026-11-02 rule); put
       down, or a look begun, the automatic filter goes */
    if (n.from === 'right' && n.mode === 'manage' && n.pick != null) {
      const c = gearCell(n.pick);
      if (c) state.filter = { id: c.filter, auto: true };
    } else if (state.filter.auto && !(n.from === 'left' && was.from === 'right' && was.mode === 'manage')) {
      state.filter = { id: 'all', auto: false };
    }
    if (n.pick !== was.pick) { state.menu = false; state.more = false; }
    if (!quiet) emit();
  },
  deselect() {
    if (state.ws.pick != null) { gearTabBus.wsDo({ type: 'close' }); return; }
    if (!state.sel && !state.filter.auto) return;
    state.sel = null;
    state.more = false;
    if (state.filter.auto) state.filter = { id: 'all', auto: false };
    emit();
  },
  /** After an Equip or an Unequip: the automatic filter and the pick go. */
  afterChange() {
    state.ws = wsStep(state.ws, { type: 'close' });   /* v2.3.6688: back to management, the scroll kept */
    state.sel = null;
    state.more = false;
    if (state.filter.auto) state.filter = { id: 'all', auto: false };
    state.menu = false;
    emit();
  },
  /** v2.3.4353 (owner: "got stuck with the detail menu open on one item, so it was filtered every time he opened
   *  and closed the dashboard"): the band closing puts everything back to the default -- no pick (the bro in the
   *  middle), "All Items", no menus open.  */
  reset() {
    state.ws = wsStep(state.ws, { type: 'reset' });   /* v2.3.6688 */
    if (!state.sel && state.filter.id === 'all' && !state.filter.auto && !state.menu && !state.more) return;
    state.sel = null;
    state.more = false;
    state.menu = false;
    state.filter = { id: 'all', auto: false };
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
  /** v2.3.4191: the item card's "⋯" (its other actions), open or shut. */
  setMore(open) {
    if (state.more === !!open) return;
    state.more = !!open;
    emit();
  },
  setMenu(open) {
    if (state.menu === !!open) return;
    state.menu = !!open;
    emit();
  },
};

try { dashMinBus.subscribe((min) => { if (min) gearTabBus.reset(); }); } catch (_e) { /* no band bus: the tab keeps its pick */ }

if (typeof window !== 'undefined') {
  window.__btGearTab = {
    state: () => ({ sel: state.sel ? { cell: state.sel.cell || null, bag: state.sel.bag || null } : null, filter: { ...state.filter }, menu: state.menu, more: state.more, view: state.sel ? 'item' : 'overview', ws: { mode: state.ws.mode, from: state.ws.from, pick: state.ws.pick, scroll: { ...state.ws.scroll } } }),   /* v2.3.6688: + the two panels' workspace */
    bus: gearTabBus,
  };
}
