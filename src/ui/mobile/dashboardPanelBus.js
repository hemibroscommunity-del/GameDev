// Tracks the bottom sheet's navigation state.
//
// v2.3.1283 (nav-system spec): the band is now ONE bottom sheet with two
// snap points, and there is no "nothing open" state — Bag compact is the
// resting home view.  State:
//   stack — drill stack; stack[0] is the active toolbar DESTINATION
//           (bag/hero/skills/social/quests/more), deeper entries are
//           drill children (e.g. more -> settings) rendered expanded.
//   mode  — 'compact' | 'expanded' snap point.
//
// Toolbar semantics (spec §Shared Interaction Model): tapping an inactive
// destination opens its COMPACT view; tapping the active destination
// toggles expanded/collapsed.  A state toggle — no double-tap timing.

const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

export const dashboardPanelBus = {
  state: { stack: ['bag'], mode: 'compact' },

  // Destinations that have no compact view yet (PR B fills them in).
  // BottomDashboard registers these; the bus routes their compact
  // requests to expanded, and a collapse lands on home (Bag compact)
  // instead of a compact frame with no content.
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

  // Toolbar tap: inactive destination -> its compact view; active
  // destination -> expanded/compact toggle.
  tapDestination(id) {
    if (this.root() !== id) {
      this.openCompact(id);
    } else if (this.state.mode === 'expanded') {
      this.collapse();
    } else {
      this.expand();
    }
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

  // Collapse to compact.  Also pops any drill children so a
  // movement-collapse never strands a child panel (settings, t2...)
  // in a compact frame it has no view for.  A compactless root
  // (social/quests/more until PR B) collapses home to Bag instead.
  collapse() {
    if (this.state.mode === 'compact' && this.state.stack.length <= 1) return;
    if (this.compactless.has(this.state.stack[0])) { this.clear(); return; }
    this.state.mode = 'compact';
    this.state.stack = [this.state.stack[0] || 'bag'];
    emit();
  },

  // Legacy toggle kept for old call sites (InventoryPreview tap etc.):
  // same-destination tap now collapses to Bag compact instead of the
  // retired "nothing open" state.
  toggle(id) {
    if (this.current() === id) {
      this.clear();
    } else {
      this.state.stack = [id];
      this.state.mode = 'expanded';
      emit();
    }
  },

  // Push a child panel onto the stack — used by MorePanel grid tiles and
  // the Hero -> T2 jump.  Drill children have no compact view, so a push
  // implies the expanded snap.
  push(id) {
    this.state.stack = [...this.state.stack, id];
    this.state.mode = 'expanded';
    emit();
  },

  // Pop one level (back-chip).  Never pops the last root — that would
  // leave no destination; collapse instead if already at the root.
  pop() {
    if (this.state.stack.length <= 1) { this.collapse(); return; }
    this.state.stack = this.state.stack.slice(0, -1);
    emit();
  },

  // "Full close" — lands on the home state (Bag compact); there is no
  // empty state anymore.  Audit note (v2.3.1283): all legacy call sites
  // (header x-chip, chat-open, panel self-closes) want exactly this.
  clear() {
    this.state.stack = ['bag'];
    this.state.mode = 'compact';
    emit();
  },

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

if (typeof window !== 'undefined') window.__broDashPanelBus = dashboardPanelBus;
