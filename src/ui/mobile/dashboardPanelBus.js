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
// Toolbar semantics (v2.3.1307, owner): TAPS never resize.  Tapping an
// inactive destination opens/switches to it (compact from the bar,
// KEEPING the current size otherwise); tapping the active destination
// is a no-op.  Resizing — bar <-> compact <-> expanded — happens ONLY
// via a vertical swipe on the toolbar icons (useSheetDrag, now bound
// to the ribbon).  The old tap-cycle (compact -> expanded -> bar) and
// the header ▾ chevron are gone: two resize methods plus band-wide
// swipes over interactive menus read as ambiguous in play-testing.
// Movement/aim input no longer collapses the sheet — the owner wants
// players walking around with menus open (BroTown interlocks removed
// same version).

const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

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

  // Toolbar tap (v2.3.1307): open/switch only, never resize.  From the
  // bar -> the destination's compact view; from an open sheet ->
  // v2.3.1311 (owner Hero spec): switching destinations ALWAYS opens
  // the new one in COMPACT (was keep-current-size) — compact is every
  // destination's front door; expanded is a deliberate step; active
  // tap -> no-op (swipe down is the one way to shrink).
  // DESKTOP EXCEPTION: mouse users can't swipe (useSheetDrag is
  // touch-only), so on no-touch devices the active tap keeps the old
  // v2.3.1290 cycle (compact -> expanded -> bar) or the sheet would be
  // stuck open.  Primary platform is iPhone Safari; this branch is the
  // dev/desktop escape hatch.
  tapDestination(id) {
    if (this.state.mode === 'bar' || this.root() !== id) {
      this.openCompact(id);
    } else if (!(typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0))) {
      if (this.state.mode === 'compact') this.expand();
      else this.toBar();
    }
    /* touch device + active destination already open: no-op */
  },

  openCompact(id) {
    this.state.stack = [id];
    this.state.mode = this.compactless.has(id) ? 'expanded' : 'compact';
    emit();
  },

  expand() {
    if (this.state.mode === 'expanded') return;
    this.state.mode = 'expanded';
    emit();
  },

  // One step down: expanded -> compact (popping drill children — they
  // have no compact view), compact -> bar.  The header ▾ chip and the
  // back-chip's root case land here.
  stepDown() {
    if (this.state.mode === 'expanded') {
      this.state.mode = 'compact';
      this.state.stack = [this.state.stack[0] || 'bag'];
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
    emit();
  },

  // Settle to an explicit snap after a drag (useSheetDrag).  Leaving
  // expanded pops drill children for the same reason stepDown does.
  settle(mode) {
    if (this.state.mode === mode) return;
    this.state.mode = mode;
    if (mode !== 'expanded') this.state.stack = [this.state.stack[0] || 'bag'];
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
