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

const listeners = new Set();
const emit = () => {
  for (const fn of listeners) fn();
  /* ═══ v2.3.2152: THE ONE GEOMETRY PATH, SAME AS THE FOLD ═══
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
  try { window.dispatchEvent(new Event('resize')); } catch (e) { /* ignore */ }
};

/* v2.3.1312 (round-8; retagged from 1311 — #288 claimed it first):
   one restrained tick when the sheet snaps to a new state
   (round-8 spec: "subtle haptic on snap").  navigator.vibrate is a
   no-op on iOS Safari — Android/PWA users get it, everyone else
   silently doesn't; never let an exotic WebView throw over it. */
const haptic = () => { try { navigator.vibrate && navigator.vibrate(8); } catch (_) {} };

export const dashboardPanelBus = {
  state: { stack: ['bag'], mode: 'bar' },

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
    if (this.state.mode === 'bar' || this.root() !== id) {
      this.open(id);
    } else {
      this.toBar();
    }
  },

  // Swipe UP on a toolbar icon: open that destination expanded.
  // Already-open destination: deliberate no-op (ends never wrap).
  advance(id) {
    if (this.state.mode === 'bar' || this.root() !== id) {
      this.open(id);
    }
  },

  // Swipe DOWN: close to the bar.  No-op when the swiped destination
  // isn't the open one (retreating a foreign destination is a surprise).
  retreat(id) {
    if (this.state.mode === 'bar' || this.root() !== id) return;
    this.toBar();
  },

  open(id) {
    this.state.stack = [id];
    this.state.mode = 'expanded';
    haptic();
    emit();
  },

  // v2.3.1350: legacy alias — compact requests open expanded now
  // (external callers: GameApp's wheelBus 'more' activation).
  openCompact(id) { this.open(id); },

  expand() {
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
    if (this.current() === id) {
      this.clear();
    } else {
      this.state.stack = [id];
      this.state.mode = 'expanded';
      emit();
    }
  },

  // Push a child panel onto the stack — used by launcher tiles and the
  // Hero -> Build jump.  Drill children render expanded.
  push(id) {
    this.state.stack = [...this.state.stack, id];
    this.state.mode = 'expanded';
    emit();
  },

  // Pop one level (back-chip).  Never pops the last root — close to
  // the bar instead if already at the root.
  pop() {
    if (this.state.stack.length <= 1) { this.toBar(); return; }
    this.state.stack = this.state.stack.slice(0, -1);
    emit();
  },

  // "Full close" — straight to the resting bar with Bag re-armed as the
  // next destination.  Chat-open and panel self-closes land here.
  clear() {
    this.state.stack = ['bag'];
    this.state.mode = 'bar';
    emit();
  },

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

if (typeof window !== 'undefined') window.__broDashPanelBus = dashboardPanelBus;
