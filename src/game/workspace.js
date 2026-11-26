/* ═══ v2.3.6688: THE TWO-PANEL WORKSPACE: ONE STATE, ONE TRANSITION (card UI2-gear PR 2, the build's step 5) ═══
 *
 * The owner, 2026-11-25, with the master specification (part 5): "Keep the
 * source panel in its original location during quick inspection; the
 * opposite panel is replaced with the summary. No shifting the inventory to
 * the other side. Make selected slot and inspection mode unmistakable.
 * Provide a clear way back to management and preserve selection/scroll
 * context."  Gear is its first user; the shop, the bank, a bench and a trade
 * (the plan's step 8) call the same rule with their own two panels.
 *
 * One state, `{ mode, from, pick, scroll }`, and ONE function that moves it,
 * wsStep(state, event):
 *   mode    'manage' (both panels as they are) | 'look' (the panel opposite
 *           the source shows the pick's summary) | 'page' (the one item page
 *           over the workspace; its Back is the look it came from);
 *   from    the source panel, 'left' or 'right' (a panel never changes side:
 *           wsPanels says what each SIDE shows);
 *   pick    the picked thing's key in its panel (a bag square, a worn cell);
 *   scroll  each panel's kept scroll ({ left, right }), recorded while it is
 *           shown and handed back when it is shown again.
 * The events:
 *   { type: 'pick', side, key, look }   a tap on a thing; `look` false (an
 *        empty cell, nothing to sum up) picks it in management; the same
 *        thing tapped again puts it down (back to management);
 *   { type: 'close' }      the summary's close: management, the pick put down;
 *   { type: 'details' }    the summary's Details: the full page;
 *   { type: 'back' }       the page's Back: the same look, the same pick;
 *   { type: 'scroll', side, top }   a panel's scroll, while it is shown;
 *   { type: 'gone', keys } the pick is no longer there (sold, eaten, moved):
 *        management, with its scroll;
 *   { type: 'reset' }      the workspace closed.
 *   { type: 'fold', keep } the dashboard's Close (the band folds).  v2.3.6688 (the mends): under the frame
 *        (`keep` true) the workspace is kept as it is -- the pick, the look, the page and both scrolls -- for
 *        the frame's rule (the owner, 2026-11-25: Close resets no workspace; dashNav 'close' keeps both
 *        stacks); `keep` false (today's Gear, `?ui2=0`) it is the workspace at rest, as v2.3.4353's reset.
 * Pure: no imports (node tests it: tools/guards/workspace.test.mjs). */

export const WS_SIDES = Object.freeze(['left', 'right']);
export const WS_MODES = Object.freeze(['manage', 'look', 'page']);

const other = (side) => (side === 'left' ? 'right' : 'left');
const isSide = (s) => s === 'left' || s === 'right';
const scrollOf = (sc) => ({ left: Math.max(0, Number(sc && sc.left) || 0), right: Math.max(0, Number(sc && sc.right) || 0) });

/** The workspace at rest: management, nothing picked, both panels at the top. */
export function wsStart() {
  return Object.freeze({ mode: 'manage', from: null, pick: null, scroll: Object.freeze({ left: 0, right: 0 }) });
}

function make(mode, from, pick, scroll) {
  return Object.freeze({ mode, from: from || null, pick: pick == null ? null : String(pick), scroll: Object.freeze(scrollOf(scroll)) });
}

/** The one transition.  An event it does not know leaves the state as it is. */
export function wsStep(state, ev) {
  const s = state && WS_MODES.includes(state.mode) ? state : wsStart();
  const e = ev || {};
  switch (e.type) {
    case 'pick': {
      if (!isSide(e.side) || e.key == null || s.mode === 'page') return s;
      const key = String(e.key);
      /* the summary covers the side opposite the source: only the source can be tapped */
      if (s.mode === 'look' && e.side !== s.from) return s;
      if (s.pick === key && s.from === e.side) return make('manage', null, null, s.scroll);   /* tapped again: put down */
      if (e.look === false) return make('manage', e.side, key, s.scroll);
      return make('look', e.side, key, s.scroll);
    }
    case 'close':
      return s.mode === 'manage' && s.pick == null ? s : make('manage', null, null, s.scroll);
    case 'details':
      return s.mode === 'look' ? make('page', s.from, s.pick, s.scroll) : s;
    case 'back':
      return s.mode === 'page' ? make('look', s.from, s.pick, s.scroll) : s;
    case 'scroll': {
      if (!isSide(e.side) || s.mode === 'page') return s;
      /* only a side that is SHOWN records (the covered one keeps its last) */
      if (s.mode === 'look' && e.side !== s.from) return s;
      const top = Math.max(0, Number(e.top) || 0);
      if (s.scroll[e.side] === top) return s;
      return make(s.mode, s.from, s.pick, { ...s.scroll, [e.side]: top });
    }
    case 'gone': {
      if (s.pick == null) return s;
      const keys = Array.isArray(e.keys) ? e.keys.map(String) : [];
      return keys.includes(s.pick) ? s : make('manage', null, null, s.scroll);
    }
    case 'reset':
      return wsStart();
    case 'fold':
      return e.keep === true ? s : wsStart();
    default:
      return s;
  }
}

/** What each SIDE shows: 'panel' (its own), 'summary' (the pick's), and
    whether the full page covers both.  The source keeps its side. */
export function wsPanels(state) {
  const s = state || wsStart();
  if (s.mode === 'look' && isSide(s.from)) {
    return Object.freeze({ [s.from]: 'panel', [other(s.from)]: 'summary', page: false });
  }
  return Object.freeze({ left: 'panel', right: 'panel', page: s.mode === 'page' });
}

/** Is `key` on `side` the picked thing (the kit's SELECTED state)? */
export function wsPicked(state, side, key) {
  const s = state || wsStart();
  return s.pick != null && s.from === side && s.pick === String(key);
}

/** The scroll to give a side back when it is drawn again. */
export function wsScroll(state, side) {
  const s = state || wsStart();
  return isSide(side) ? (s.scroll[side] || 0) : 0;
}
