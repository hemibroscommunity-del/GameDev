// Tiny pub-sub for the utility wheel: lets unrelated modules read/dispatch
// open state, badge counts, and slot taps without React context plumbing.

const listeners = new Set();

const state = {
  open: false,
  inCombat: false,            // wheel hides during combat per spec
  // Per-tool badge state. Keys are tool IDs (inventory, journey, ...).
  // Each entry is { count: number } for numbered, { dot: true } for dot-only.
  // Absent / falsy = no badge.
  badges: {},
  // Surface routing — when a slot is tapped, what surface should open.
  // Other modules call onActivate(toolId, fn) to subscribe.
  activations: new Map(),
};

const emit = () => { for (const fn of listeners) fn(); };

export const wheelBus = {
  state,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  setOpen(v)  { state.open = !!v; emit(); },
  toggle()    { state.open = !state.open; emit(); },
  setInCombat(v) { state.inCombat = !!v; emit(); },
  setBadge(toolId, badge) {
    if (badge == null || badge === false) delete state.badges[toolId];
    else state.badges[toolId] = badge;
    emit();
  },
  onActivate(toolId, fn) {
    state.activations.set(toolId, fn);
    return () => { if (state.activations.get(toolId) === fn) state.activations.delete(toolId); };
  },
  activate(toolId) {
    const fn = state.activations.get(toolId);
    state.open = false;
    emit();
    if (fn) try { fn(); } catch (e) { console.error('[wheel] activation failed:', e); }
    else console.log(`[wheel] no handler for tool: ${toolId}`);
  },
  // Sum of numbered badges across all tools (for the trigger summary pill).
  trigSummary() {
    let n = 0;
    for (const k in state.badges) {
      const b = state.badges[k];
      if (typeof b?.count === 'number') n += b.count;
    }
    return n;
  },
};

if (typeof window !== 'undefined') {
  window.wheelBus = wheelBus;
}
