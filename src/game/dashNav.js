/* ═══ v2.3.6681: THE DASHBOARD'S WAY ROUND (card UI2-frame, the build's step 2) ═══
 *
 * The owner, 2026-11-25, with the master specification: "Use independently
 * remembered Gear and Menu workspaces, a universal directory, one contextual
 * header and actual-history navigation"; "Gear and Menu have independent
 * remembered states. Gear opens the Gear workspace; Menu resumes the previous
 * exploration destination. Closing temporarily hides the dashboard without
 * resetting either workspace"; "Back follows the actual navigation history
 * (the player's journey), not necessarily the canonical category tree. Close
 * returns to gameplay. Preserve scroll, selections and relevant context on
 * returning from drill-downs"; "The Menu shortcut on a deep view opens the
 * directory root; ordinary Menu workspace entry resumes its prior state."
 *
 * ONE STATE, ONE TRANSITION FUNCTION (finish.md part 5, rule 5; CLAUDE.md §5:
 * a phase lives in one field).  The state:
 *   ws     which workspace is up: 'gear' or 'menu';
 *   shown  the dashboard drawn (false: closed, the slim row with Gear and Menu);
 *   gear   the Gear workspace's own stack of pages over its root (the bag);
 *   menu   the Menu's own stack of pages over its root (the directory);
 *   seq    the last entry's number (each entry its own `key`).
 * An empty stack is that workspace's root.  An entry:
 *   { id, key, scroll, sel, who, from, ret }
 *   id     the page (src/game/dashDests.js, BottomDashboard's PANELS);
 *   key    this visit's own number: the same page twice in one journey keeps
 *          two scrolls;
 *   scroll the page's kept scroll (the frame writes it: dashScroll.js);
 *   sel    the page's kept selection (a later step's pages write it);
 *   who    whose page: null is yours (step 9 sets another player's);
 *   from   where it grew from (step 2's PR 2, the motion: a tile's cell);
 *   ret    an ARRIVAL's way home: the { ws, shown } it came from.  A page
 *          reached from the world (the quest card, a key, a toast) is not
 *          under a list you never saw: its Back goes where you were (the
 *          card's reading 6).  It holds while the journey is unbroken: Close
 *          or a move to Gear drops it, and Back then walks the Menu's own
 *          history.
 *
 * NO IMPORTS: node tests it (tools/guards/dash-nav.test.mjs). */

/** The state a page starts with: Gear up (the default gameplay workspace). */
export function dashNavInit(shown) {
  return Object.freeze({ ws: 'gear', shown: !!shown, gear: Object.freeze([]), menu: Object.freeze([]), seq: 0 });
}

function entry(id, key, a) {
  return Object.freeze({
    id: String(id),
    key,
    scroll: 0,
    sel: a && a.sel != null ? a.sel : null,
    who: a && a.who != null ? a.who : null,
    from: a && a.from != null ? a.from : null,
    ret: a && a.ret ? a.ret : null,
  });
}

/* the journey's ways home are dropped when it is broken (Close, or Gear) */
function dropRets(stack) {
  if (!stack.some((e) => e.ret)) return stack;
  return Object.freeze(stack.map((e) => (e.ret ? Object.freeze({ ...e, ret: null }) : e)));
}

function top(stack) { return stack.length ? stack[stack.length - 1] : null; }

function same(e, id, who) { return !!e && e.id === String(id) && (e.who || null) === (who == null ? null : who); }

function put(s, patch) { return Object.freeze({ ...s, ...patch }); }

/**
 * The one transition.  `a.type`:
 *   'gear'      Gear's button, I, the handle on a closed band: the Gear
 *               workspace as it was left;
 *   'rest'      the old "to the bar" (a shop wanting the bag, a turn of the
 *               phone): Gear's ROOT, shown; the Menu kept;
 *   'menu'      Menu from play, from the closed row or from Gear's root:
 *               RESUMES the Menu's last page.  `a.offers(id)` says whether
 *               the worker still offers a page; one it no longer does falls
 *               the Menu to its root;
 *   'menuRoot'  the Menu shortcut on a deep page: the directory's root, NO
 *               page left under it (Back from there goes to Gear);
 *   'push'      a door inside a page: a page over the one up, in the
 *               workspace up.  The page already on top is not pushed twice.
 *               `a.replace`: it takes the top's place and its way home (an
 *               opener and its page asked in one breath: the quest card's
 *               open('quests') then push('questDetail'));
 *   'arrive'    a shortcut from the world or a key: inside the Menu a push;
 *               from play or Gear a page on the Menu's stack carrying its
 *               way home (ret);
 *   'back'      the header's Back: the page you came from, to its spot;
 *   'close'     Close: the dashboard hidden, both workspaces as they were;
 *   'keep'      the frame keeps a page's scroll or selection (`a.key`,
 *               `a.scroll`, `a.sel`).
 * Returns the next state (the same object when nothing changes).
 */
export function dashNavStep(s, a) {
  if (!s || !a) return s;
  switch (a.type) {
    case 'gear':
      if (s.shown && s.ws === 'gear') return s;
      return put(s, { ws: 'gear', shown: true, menu: dropRets(s.menu) });
    case 'rest':
      if (s.shown && s.ws === 'gear' && !s.gear.length) return s;
      return put(s, { ws: 'gear', shown: true, gear: Object.freeze([]), menu: dropRets(s.menu) });
    case 'menu': {
      let menu = s.menu;
      const offers = typeof a.offers === 'function' ? a.offers : null;
      if (offers && menu.some((e) => !offers(e.id))) menu = Object.freeze([]);
      if (s.shown && s.ws === 'menu' && menu === s.menu) return s;
      return put(s, { ws: 'menu', shown: true, menu });
    }
    case 'menuRoot':
      if (s.shown && s.ws === 'menu' && !s.menu.length) return s;
      return put(s, { ws: 'menu', shown: true, menu: Object.freeze([]) });
    case 'push': {
      if (a.id == null) return s;
      if (!s.shown) return dashNavStep(s, { ...a, type: 'arrive' });
      const ws = s.ws;
      const stack = s[ws];
      const t = top(stack);
      if (a.replace && t) {
        if (same(t, a.id, a.who)) return s;
        const seq = s.seq + 1;
        const e = entry(a.id, seq, { ...a, ret: t.ret });
        return put(s, { seq, [ws]: Object.freeze([...stack.slice(0, -1), e]) });
      }
      if (same(t, a.id, a.who)) return s;
      const seq = s.seq + 1;
      return put(s, { seq, [ws]: Object.freeze([...stack, entry(a.id, seq, { ...a, ret: null })]) });
    }
    case 'arrive': {
      if (a.id == null) return s;
      if (s.shown && s.ws === 'menu') return dashNavStep(s, { ...a, type: 'push' });
      const t = top(s.menu);
      if (same(t, a.id, a.who) && t.ret) return put(s, { ws: 'menu', shown: true });
      const seq = s.seq + 1;
      const e = entry(a.id, seq, { ...a, ret: Object.freeze({ ws: s.ws, shown: s.shown }) });
      return put(s, { seq, ws: 'menu', shown: true, menu: Object.freeze([...s.menu, e]) });
    }
    case 'back': {
      if (!s.shown) return s;
      const stack = s[s.ws];
      if (stack.length) {
        const t = top(stack);
        const rest = Object.freeze(stack.slice(0, -1));
        if (t.ret) return put(s, { [s.ws]: rest, ws: t.ret.ws, shown: !!t.ret.shown });
        return put(s, { [s.ws]: rest });
      }
      /* the Menu's root: Back is Gear (the root's header: "< Gear") */
      if (s.ws === 'menu') return put(s, { ws: 'gear' });
      /* Gear's root has no Back: its Close stands there */
      return put(s, { shown: false, menu: dropRets(s.menu) });
    }
    case 'close':
      if (!s.shown) return s;
      return put(s, { shown: false, menu: dropRets(s.menu) });
    case 'keep': {
      const fix = (stack) => {
        const i = stack.findIndex((e) => e.key === a.key);
        if (i < 0) return stack;
        const e = stack[i];
        const scroll = a.scroll != null ? Math.max(0, Number(a.scroll) || 0) : e.scroll;
        const sel = a.sel !== undefined ? a.sel : e.sel;
        if (scroll === e.scroll && sel === e.sel) return stack;
        const next = stack.slice();
        next[i] = Object.freeze({ ...e, scroll, sel });
        return Object.freeze(next);
      };
      const gear = fix(s.gear), menu = fix(s.menu);
      if (gear === s.gear && menu === s.menu) return s;
      return put(s, { gear, menu });
    }
    default:
      return s;
  }
}

/** What is up: the workspace, the page on top (null at a root) and how deep. */
export function dashNavView(s) {
  const stack = s[s.ws];
  return { ws: s.ws, shown: s.shown, top: top(stack), depth: stack.length };
}

/**
 * Where Back goes, so its words can name it (the card's reading 6):
 *   { kind: 'page', id, who }    the page under this one;
 *   { kind: 'ws', ws, id }       a workspace (its top page's id, or null at
 *                                its root): "Gear", "Menu";
 *   { kind: 'world' }            back to play (an arrival from the world);
 *   null                         no Back (Gear's root, or closed).
 */
export function dashNavBackTo(s) {
  if (!s.shown) return null;
  const stack = s[s.ws];
  if (stack.length) {
    const t = top(stack);
    if (t.ret) {
      if (!t.ret.shown) return { kind: 'world' };
      const other = s[t.ret.ws];
      const ot = top(other);
      return { kind: 'ws', ws: t.ret.ws, id: ot ? ot.id : null };
    }
    if (stack.length > 1) {
      const b = stack[stack.length - 2];
      return { kind: 'page', id: b.id, who: b.who };
    }
    return { kind: 'ws', ws: s.ws, id: null };
  }
  if (s.ws === 'menu') {
    const gt = top(s.gear);
    return { kind: 'ws', ws: 'gear', id: gt ? gt.id : null };
  }
  return null;
}

/* ── the old face's words (src/ui/mobile/dashboardPanelBus.js keeps its meaning
   for every caller and the 44 phone tests that drive window.__broDashPanelBus) ── */

/** The pages that ARE Gear's root: the bag at rest ('dashboard' the old
    sideways column, 'bag' and 'inventory' the old bag page). */
const GEAR_ROOT = { dashboard: 1, bag: 1, inventory: 1 };
export function isGearRoot(id) { return Object.prototype.hasOwnProperty.call(GEAR_ROOT, String(id)); }

/** What the old `open(id)` asks: Gear's root for the bag; the Menu's root for
    'more' (More's page is the directory now); the Menu resumed for 'menu';
    any other page an arrival (from the world, a key, a toast). */
/* A page that hands over to another as it opens: the quest's own page gives
   the quest to the Quests tab and opens the tab (QuestDetailPanel.jsx
   QuestDetailToPages, v2.3.6620).  The tab TAKES ITS PLACE (and its way
   home), never goes over it: over it, Back would land on the page that hands
   over again, which opens the tab again -- a Back that never leaves. */
const HANDS_OVER = { questDetail: 1 };
export function handsOver(id) { return Object.prototype.hasOwnProperty.call(HANDS_OVER, String(id)); }

export function dashNavOpen(id, s) {
  if (isGearRoot(id)) return { type: 'rest' };
  if (id === 'more') return { type: 'menuRoot' };
  if (id === 'menu') return { type: 'menu' };
  const t = s && s.shown ? top(s[s.ws]) : null;
  if (t && handsOver(t.id)) return { type: 'push', id, replace: true };
  return { type: 'arrive', id };
}

/** A computer's page key (deskKeys.js navKey): I Gear, O the Menu, the others
    their page; pressed with its own page up, it closes (as today). */
export function dashNavKey(s, id) {
  const v = dashNavView(s);
  if (isGearRoot(id)) return v.shown && v.ws === 'gear' ? { type: 'close' } : { type: 'gear' };
  if (id === 'more' || id === 'menu') return v.shown && v.ws === 'menu' ? { type: 'close' } : { type: 'menu' };
  if (v.shown && v.ws === 'menu' && v.top && v.top.id === id) return { type: 'close' };
  return { type: 'arrive', id };
}

/** The old `state`: { stack, mode }.  'bar' is Gear's root or closed (the
    bag's row at rest, or the band folded: dashMinBus); 'expanded' a page, or
    the Menu's root ('menu'). */
export function dashNavLegacy(s) {
  if (!s.shown) return { stack: ['bag'], mode: 'bar' };
  if (s.ws === 'gear') {
    return s.gear.length ? { stack: ['bag', ...s.gear.map((e) => e.id)], mode: 'expanded' } : { stack: ['bag'], mode: 'bar' };
  }
  return { stack: s.menu.length ? s.menu.map((e) => e.id) : ['menu'], mode: 'expanded' };
}
