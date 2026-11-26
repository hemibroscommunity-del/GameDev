// Tracks the bottom sheet's navigation state.
//
// v2.3.1283 (nav-system spec): the band is ONE bottom sheet; stack[0]
// is the active toolbar DESTINATION (bag/hero/skills/social/quests/
// more), deeper entries are drill children (e.g. more -> settings)
// rendered expanded.
//
// v2.3.1350 (owner: "make the expanded menu and toolbar menu the only
// options"): the compact glance state is RETIRED — two snap modes:
//   'bar'      — toolbar only.  The game's DEFAULT resting state:
//                maximum world visibility, nothing open.  stack keeps
//                the last destination so reopening resumes where you
//                were, but nothing renders and no button is lit.
//   'expanded' — the destination's detailed / actionable view.
// (v2.3.1290's three-state history — compact as the middle snap, the
// v2.3.1316 three-tap cycle — lives in git; the compact views and
// their COMPACT_VIEWS registry were deleted with this slice.)
//
// Toolbar semantics: tapping any destination from the bar (or an
// inactive one anytime) opens its EXPANDED view; tapping the ACTIVE
// destination closes to the bar — a plain toggle.  Icon SWIPES map to
// the same two states: up opens, down closes (classified in IconButton
// at pointer-up, routed to advance/retreat below).  Movement/aim input
// never collapses the sheet — play with menus open (v2.3.1307); the
// combat chrome rides above the open sheet keyed off --sheet-h.

import { playIsLandscape, bandResize } from './playViewport.js'; /* v2.3.2173: the bag-pane tourniquet below; v2.3.6241: + bandResize */
import { dashMinBus } from './dashMinBus.js';   /* v2.3.6681: the fold follows the frame's `shown` */
import { ui2FrameOn } from './ui2Frame.js';     /* v2.3.6681: the new frame, ON (?ui2=0 the way back) */
import {
  dashNavInit, dashNavStep, dashNavView, dashNavLegacy, dashNavOpen, dashNavKey,
} from '../../game/dashNav.js';                 /* v2.3.6681: the one state and its one transition */

const listeners = new Set();
const emit = () => {
  for (const fn of listeners) fn();
  /* ═══ v2.3.2157: THE ONE GEOMETRY PATH, SAME AS THE FOLD ═══
     In landscape the world YIELDS width to the open sheet (owner: menus
     beside the world, playable while open), which means opening or closing
     a destination is a canvas-geometry change -- and dashMinBus's own note
     names the only safe road: BroTown's resize() owns turning band state
     into pixels, and the watchdog re-derives the same arithmetic.  A sheet
     the canvas doesn't know about is a black stripe where the world should
     be; one the watchdog doesn't know about is a healing war every 500ms.
     Dispatched on EVERY state change rather than landscape-only: in
     portrait resize() recomputes identical numbers and its short-circuit
     returns before touching the canvas, so the extra event costs a
     comparison -- cheaper than this file knowing which orientation it is
     in. */
  /* v2.3.6241: marked as the band's (playViewport.js bandResize): the kept sizes stand (card HB PR 2) */
  try { bandResize(); } catch (e) { /* ignore */ }
};

/* v2.3.1312 (round-8; retagged from 1311 — #288 claimed it first):
   one restrained tick when the sheet snaps to a new state
   (round-8 spec: "subtle haptic on snap").  navigator.vibrate is a
   no-op on iOS Safari — Android/PWA users get it, everyone else
   silently doesn't; never let an exotic WebView throw over it. */
const haptic = () => { try { navigator.vibrate && navigator.vibrate(8); } catch (_) {} };

/* ═══ v2.3.2173: THE TINY-SLOT BAG PANE IS RETIRED SIDEWAYS ═══
   Owner, reviewing the landscape view screenshots: "you show another bag
   view with tiny inventory slots.  That must be a legacy view that needs
   to retire.  It got replaced with the [dashboard column] view."
   Nothing in src/ opens 'bag'/'inventory' any more (v2.3.1654 made the
   resting dashboard the bag; v2.3.2163 pointed the sideways button at the
   dashboard destination), so this is a tourniquet, not a route: whatever
   old call site or test still asks for the legacy inventory pane in
   landscape lands on the 2x4 dashboard column instead.  Portrait is
   untouched — the panel remains registered for its history there. */
const landSafe = (id) => {
  try {
    if ((id === 'bag' || id === 'inventory') && playIsLandscape()) return 'dashboard';
  } catch (e) { /* pre-boot: no viewport to ask */ }
  return id;
};

/* ═══ v2.3.4172: LIFE SKILLS AND ACHIEVEMENTS ARE PAGES UNDER BRO ═══
   The owner's five buttons (Gear, Bro, Quests, Codex, More): "Lifeskills
   move inside Bro", and Achievements leave More for Bro too.  Bro is one card
   now (sheet/BroCard.jsx, the owner: "like what it looks like when you inspect
   another player"), and its Life Skills and Achievements rows open those
   pages ON TOP of it, as a drill under Bro: stack ['hero', id], the drill's
   back chip returning to the card.  Every road that still asks for them --
   the L key, the top bar's AP medal (open('more') then push('achievements')),
   a player card's title chip, a test, an old call site -- lands there, so
   there is one home for each and no second copy of either page to drift.
   Asked from a page already under Bro (Life Skills' own AP button), it goes
   on top of that page, so the back chip steps back to it. */
const BRO_PAGES = { skills: 1, achievements: 1 };
const broPage = (id) => Object.prototype.hasOwnProperty.call(BRO_PAGES, id);
/* ═══ v2.3.4393: THE LEADERBOARDS HAVE THEIR OWN BUTTON ═══
   They were a drill under More (open('more') then push('leaderboard')); now
   they are a destination on the row (BottomDashboard RAIL_ORDER).  Every old
   road that still pushes them -- the Town Board's row, a weigh-in card's
   Records, a profile's button, a test -- lands on that one page, its button
   lit, never a second copy under More with a back chip to it. */
const OWN_PAGES = { leaderboard: 1 };
const ownPage = (id) => Object.prototype.hasOwnProperty.call(OWN_PAGES, id);

/* ═══ v2.3.6681: A THIN FACE OVER THE WAY ROUND (card UI2-frame) ═══
   The owner, 2026-11-25: "independently remembered Gear and Menu workspaces
   ... actual-history navigation ... Closing temporarily hides the dashboard
   without resetting either workspace."  Under the new frame (on; `?ui2=0` the
   way back) the dashboard's state is src/game/dashNav.js's ONE state, moved
   only by its ONE transition; this bus keeps its words for every caller and
   the 44 phone tests that drive window.__broDashPanelBus: `state` is read
   from it ({ stack, mode }, dashNavLegacy), `open` is an arrival (or Gear's
   root, or the Menu's), `push` a page over the one up, `pop` Back, `toBar`
   Gear's root.  What toBar USED to do here -- keep only the first page, so
   closing forgot every page under it -- is the memory the frame adds.
   THE FOLD IS `shown`: the band folded (dashMinBus, the key bt_dash_min) is
   the frame closed.  dashNav holds it; the fold follows each transition, and
   a fold from outside (the handle, the tutorial's folded start) is told to
   dashNav as Close or Gear, so the two never disagree.
   ONE BREATH: callers ask for a page as `open(list)` then `push(page)` (the
   quest card: open('quests') then push('questDetail')).  An arrival made by
   open() is remembered until the end of the current script, and a push in
   that breath takes its place and its way home -- so the quest's page is not
   under a Quests list you never saw (the card's reading 6). */
let _nav = null;
let _syncing = false;
let _opener = null;
let _offers = null;
const nav = () => { if (!_nav) _nav = dashNavInit(!dashMinBus.min); return _nav; };
const frameOn = () => { try { return ui2FrameOn(); } catch (e) { return false; } };
function step(a, quiet) {
  const prev = nav();
  const next = dashNavStep(prev, a);
  if (next === prev) return false;
  _nav = next;
  if (quiet) return true;   /* a kept scroll: nothing to draw */
  if (dashMinBus.min === next.shown) {
    _syncing = true;
    try { dashMinBus.set(!next.shown); } finally { _syncing = false; }
  }
  if (next.shown !== prev.shown || next.ws !== prev.ws) haptic();
  emit();
  return true;
}
try {
  dashMinBus.subscribe((min) => {
    if (_syncing || !frameOn()) return;
    const n = nav();
    if (min && n.shown) step({ type: 'close' });
    else if (!min && !n.shown) step({ type: 'gear' });
  });
} catch (e) { /* no fold bus: the frame alone */ }
function arrive(a) {
  const before = dashNavView(nav()).top;
  step(a);
  const t = dashNavView(nav()).top;
  if (a.type === 'arrive' && t && (!before || before.key !== t.key)) {
    _opener = t.key;
    const k = t.key;
    try { queueMicrotask(() => { if (_opener === k) _opener = null; }); } catch (e) { _opener = null; }
  }
}
const face = {
  fopen(id) { arrive(dashNavOpen(id, nav())); },
  fpush(id, opts) {
    const t = dashNavView(nav()).top;
    const replace = _opener != null && !!t && t.key === _opener && nav().shown;
    _opener = null;
    step({ ...(opts || {}), type: 'push', id, replace });
  },
  ftoggle(id) {
    const v = dashNavView(nav());
    if (v.shown && v.top && v.top.id === id) step({ type: 'close' });
    else face.fopen(id);
  },
};

export const dashboardPanelBus = {
  /* v2.3.6681: the old state lives in `_old` (?ui2=0); `state` is read from
     the frame's one state when the frame is on */
  _old: { stack: ['bag'], mode: 'bar' },
  get state() { return frameOn() ? dashNavLegacy(nav()) : this._old; },
  set state(v) { this._old = v; },

  /* v2.3.6681: the frame's own (dash/DashHeader.jsx, MenuGrid.jsx,
     BottomDashboard.jsx): is it on, its one state, and a transition by name
     ('gear', 'menu', 'menuRoot', 'back', 'close', 'push', 'arrive', 'keep').
     A kept scroll moves nothing on screen and draws nothing (quiet). */
  frameOn() { return frameOn(); },
  nav() { return nav(); },
  go(a) {
    if (!a) return false;
    if (a.type === 'menu' && _offers) return step({ ...a, offers: _offers });
    if (a.type === 'arrive') { arrive(a); return true; }
    return step(a, a.type === 'keep');
  },
  /* the pages the worker offers now (BottomDashboard): a resumed Menu whose
     page has gone falls to its root (the card's dodge) */
  setOffers(fn) { _offers = typeof fn === 'function' ? fn : null; },
  /* a computer's page key (deskKeys.js navKey) */
  key(id) {
    const a = dashNavKey(nav(), id);
    return this.go(a);
  },

  // Top-of-stack helper — what the dashboard should currently render.
  current() {
    const s = this.state.stack;
    return s.length ? s[s.length - 1] : null;
  },

  // The active toolbar destination (stack root).
  root() {
    return this.state.stack[0] || 'bag';
  },

  // Toolbar tap (v2.3.1350 two-state): bar or an inactive destination
  // -> that destination expanded; the active destination -> bar.
  tapDestination(id) {
    if (frameOn()) { face.ftoggle(id); return; }   /* v2.3.6681 */
    /* v2.3.2639: the ui-close tick that v2.3.2637 put here is GONE, because
       this function has no callers -- nothing in src/ calls tapDestination.
       The nav rail talks to open() and toBar() directly, so the sound was
       wired to dead code and the owner heard nothing when tapping the tabs.
       It now lives on the rail's own pointer handler, which is the gesture.
       This function is left otherwise untouched: it is a public method of
       the bus and removing it is a separate decision. */
    if (this.state.mode === 'bar' || this.root() !== id) {
      this.open(id);
    } else {
      this.toBar();
    }
  },

  // Swipe UP on a toolbar icon: open that destination expanded.
  // Already-open destination: deliberate no-op (ends never wrap).
  advance(id) {
    if (frameOn()) { if (this.current() !== id) face.fopen(id); return; }   /* v2.3.6681 */
    if (this.state.mode === 'bar' || this.root() !== id) {
      this.open(id);
    }
  },

  // Swipe DOWN: close to the bar.  No-op when the swiped destination
  // isn't the open one (retreating a foreign destination is a surprise).
  retreat(id) {
    if (frameOn()) { if (this.current() === id) step({ type: 'rest' }); return; }   /* v2.3.6681 */
    if (this.state.mode === 'bar' || this.root() !== id) return;
    this.toBar();
  },

  open(id) {
    if (frameOn()) { face.fopen(id); return; }   /* v2.3.6681: an arrival, Gear's root or the Menu's */
    /* v2.3.4172: Life Skills and Achievements open under Bro */
    this.state.stack = broPage(id) ? ['hero', id] : [landSafe(id)];
    this.state.mode = 'expanded';
    haptic();
    emit();
  },

  // v2.3.1350: legacy alias — compact requests open expanded now
  // (external callers: GameApp's wheelBus 'more' activation).
  openCompact(id) { this.open(id); },

  expand() {
    if (frameOn()) { if (!nav().shown) step({ type: 'gear' }); return; }   /* v2.3.6681 */
    if (this.state.mode === 'expanded') return;
    this.state.mode = 'expanded';
    haptic();
    emit();
  },

  // One step down IS the bar now (two states).  The back-chip's root
  // case and legacy collapse() land here.
  stepDown() {
    this.toBar();
  },

  // Straight to the toolbar-only resting state.  Joystick/movement
  // interlocks land here — combat wants the world back NOW.  The root
  // is kept so the next tap/swipe resumes the same destination.
  toBar() {
    if (frameOn()) { step({ type: 'rest' }); return; }   /* v2.3.6681: Gear's root; the Menu's pages kept */
    if (this.state.mode === 'bar') return;
    this.state.mode = 'bar';
    this.state.stack = [this.state.stack[0] || 'bag'];
    haptic();
    emit();
  },

  // Settle to an explicit snap — the honest "set mode" API for tests
  // and any future gesture surface.  'compact' maps to 'expanded'
  // (v2.3.1350 two-state).  Leaving expanded pops drill children.
  settle(mode) {
    if (frameOn()) { if (mode === 'bar') step({ type: 'rest' }); else if (!nav().shown) step({ type: 'gear' }); return; }   /* v2.3.6681 */
    if (mode === 'compact') mode = 'expanded';
    if (this.state.mode === mode) return;
    this.state.mode = mode;
    if (mode !== 'expanded') this.state.stack = [this.state.stack[0] || 'bag'];
    haptic();
    emit();
  },

  // v2.3.1290: legacy alias — pre-three-state callers meant "get the
  // sheet out of the way"; that is bar semantics now.
  collapse() { this.stepDown(); },

  // Legacy toggle kept for old call sites (InventoryPreview tap etc.).
  toggle(id) {
    if (frameOn()) { face.ftoggle(id); return; }   /* v2.3.6681 */
    /* v2.3.4172: under Bro, and the same press again closes it */
    if (broPage(id)) { if (this.state.mode === 'expanded' && this.current() === id) this.toBar(); else this.open(id); return; }
    if (this.current() === id) {
      this.clear();
    } else {
      this.state.stack = [landSafe(id)];
      this.state.mode = 'expanded';
      emit();
    }
  },

  // Push a child panel onto the stack — used by launcher tiles and the
  // Hero -> Build jump.  Drill children render expanded.
  push(id, opts) {
    if (frameOn()) { face.fpush(id, opts); return; }   /* v2.3.6681: a page over the one up (opts: who, from) */
    /* v2.3.4172: a drill to Life Skills or Achievements goes under Bro
       (on top of the page there if Bro is the one open) */
    if (broPage(id) && !(this.state.mode === 'expanded' && this.root() === 'hero')) { this.open(id); return; }
    if (broPage(id) && this.current() === id) return;   /* already on it */
    /* v2.3.4393: a page with its own button opens as that button does */
    if (ownPage(id)) { if (!(this.state.mode === 'expanded' && this.current() === id)) this.open(id); return; }
    this.state.stack = [...this.state.stack, landSafe(id)];
    this.state.mode = 'expanded';
    emit();
  },

  // Pop one level (back-chip).  Never pops the last root — close to
  // the bar instead if already at the root.
  pop() {
    if (frameOn()) { step({ type: 'back' }); return; }   /* v2.3.6681: Back, by the journey */
    if (this.state.stack.length <= 1) { this.toBar(); return; }
    this.state.stack = this.state.stack.slice(0, -1);
    emit();
  },

  // "Full close" — straight to the resting bar with Bag re-armed as the
  // next destination.  Chat-open and panel self-closes land here.
  clear() {
    if (frameOn()) { step({ type: 'rest' }); return; }   /* v2.3.6681: Gear's root; the Menu's pages kept */
    this.state.stack = ['bag'];
    this.state.mode = 'bar';
    emit();
  },

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

if (typeof window !== 'undefined') window.__broDashPanelBus = dashboardPanelBus;
