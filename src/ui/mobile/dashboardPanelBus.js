// Tracks the bottom sheet's navigation state.
//
// v2.3.1283 (nav-system spec): the band is ONE bottom sheet; stack[0]
// is the active toolbar DESTINATION (bag/hero/skills/social/quests/
// more), deeper entries are drill children (e.g. more -> settings)
// rendered expanded.
//
// v2.3.1290 (owner: three-state nav): THREE snap modes —
//   'bar'      — toolbar only.  The game's DEFAULT resting state:
//                maximum world visibility, nothing open.  stack keeps
//                the last destination so reopening resumes where you
//                were, but nothing renders and no button is lit.
//   'compact'  — the destination's glance view.
//   'expanded' — the destination's detailed / actionable view.
//
// Toolbar semantics (v2.3.1316, owner round-8b — supersedes both the
// v2.3.1307 taps-never-resize contract from #285 and the v2.3.1311
// tap-toggle): tapping any destination from the bar (or an inactive
// one anytime) opens its COMPACT view; tapping the ACTIVE destination
// cycles UP then closes — compact -> expanded -> bar — so three taps
// walk a destination through all of its states ("third tap to return
// to toolbar only").  Icon SWIPES also resize, one snap per swipe —
// classified in IconButton at pointer-up and routed to advance/retreat
// below (v2.3.1318: this session's discrete contract, owner-selected
// over #285's ribbon drag).  Movement/aim input never collapses the
// sheet — play with menus open (v2.3.1307); the combat chrome rides
// above the open sheet keyed off --sheet-h.

const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

/* v2.3.1312 (round-8; retagged from 1311 — #288 claimed it first):
   one restrained tick when the sheet snaps to a new state
   (round-8 spec: "subtle haptic on snap").  navigator.vibrate is a
   no-op on iOS Safari — Android/PWA users get it, everyone else
   silently doesn't; never let an exotic WebView throw over it. */
const haptic = () => { try { navigator.vibrate && navigator.vibrate(8); } catch (_) {} };

export const dashboardPanelBus = {
  state: { stack: ['bag'], mode: 'bar' },

  // Destinations that have no compact view — the bus routes their
  // compact requests to expanded.  v2.3.1288 (PR B): EMPTY since
  // Friends/Quests/More got compact views; the mechanism stays for any
  // future compactless destination.
  compactless: new Set(),

  // Top-of-stack helper — what the dashboard should currently render.
  current() {
    const s = this.state.stack;
    return s.length ? s[s.length - 1] : null;
  },

  // The active toolbar destination (stack root).
  root() {
    return this.state.stack[0] || 'bag';
  },

  // Toolbar tap (owner round-8b; both sessions converged — #288's
  // v2.3.1311b and this branch's v2.3.1316 wrote the IDENTICAL body):
  // from the bar or an inactive destination -> its compact view
  // (switching never keeps the old size); active destination cycles
  // compact -> expanded -> bar.  #285's desktop exception died with
  // the cycle's return — mice cycle the same way fingers do.
  tapDestination(id) {
    if (this.state.mode === 'bar' || this.root() !== id) {
      this.openCompact(id);
    } else if (this.state.mode === 'compact') {
      this.expand();
    } else {
      this.toBar();
    }
  },

  /* v2.3.1318 (owner: "if there are any conflicts with touch or swipe
     controls with the other session keep yours"): the icon-swipe
     semantics return to THIS session's discrete advance/retreat
     contract, displacing #285's drag-release rules where they
     differed — a swipe up on an INACTIVE icon opens that destination
     COMPACT (the drag opened it at the swiped-to size, jumping straight
     to expanded past the compact glance), and a swipe DOWN on an
     inactive icon is a NO-OP (the drag closed the sheet — retreating a
     destination you didn't swipe on is a surprise). */
  // Swipe UP on a toolbar icon: one state up — bar/inactive -> compact
  // -> expanded.  At expanded it's a deliberate no-op (ends never wrap).
  advance(id) {
    if (this.state.mode === 'bar' || this.root() !== id) {
      this.openCompact(id);
    } else if (this.state.mode === 'compact') {
      this.expand();
    }
  },

  // Swipe DOWN: one state down — expanded -> compact -> bar.  No-op
  // when the swiped destination isn't the open one.
  retreat(id) {
    if (this.state.mode === 'bar' || this.root() !== id) return;
    this.stepDown();
  },

  openCompact(id) {
    this.state.stack = [id];
    this.state.mode = this.compactless.has(id) ? 'expanded' : 'compact';
    haptic();
    emit();
  },

  expand() {
    if (this.state.mode === 'expanded') return;
    this.state.mode = 'expanded';
    haptic();
    emit();
  },

  // One step down: expanded -> compact (popping drill children — they
  // have no compact view), compact -> bar.  The header ▾ chip and the
  // back-chip's root case land here.
  stepDown() {
    if (this.state.mode === 'expanded') {
      this.state.mode = 'compact';
      this.state.stack = [this.state.stack[0] || 'bag'];
      haptic();
      emit();
    } else if (this.state.mode === 'compact') {
      this.toBar();
    }
  },

  // Straight to the toolbar-only resting state.  Joystick/movement
  // interlocks land here — combat wants the world back NOW, not a
  // stopover in compact.  The root is kept so the next tap/swipe
  // resumes the same destination.
  toBar() {
    if (this.state.mode === 'bar') return;
    this.state.mode = 'bar';
    this.state.stack = [this.state.stack[0] || 'bag'];
    haptic();
    emit();
  },

  // Settle to an explicit snap — the honest "set mode" API for tests
  // and any future gesture surface (its drag-release caller retired
  // v2.3.1318).  Leaving expanded pops drill children for the same
  // reason stepDown does.
  settle(mode) {
    if (this.state.mode === mode) return;
    this.state.mode = mode;
    if (mode !== 'expanded') this.state.stack = [this.state.stack[0] || 'bag'];
    haptic();
    emit();
  },

  // v2.3.1290: legacy alias — pre-three-state callers meant "get the
  // sheet out of the way"; that is stepDown semantics now.
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
  // Hero -> Build jump.  Drill children have no compact view, so a push
  // implies the expanded snap.
  push(id) {
    this.state.stack = [...this.state.stack, id];
    this.state.mode = 'expanded';
    emit();
  },

  // Pop one level (back-chip).  Never pops the last root — step down
  // instead if already at the root.
  pop() {
    if (this.state.stack.length <= 1) { this.stepDown(); return; }
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
