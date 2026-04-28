// Tracks which menu panel is currently expanded inside the BottomDashboard.
// `stack` is a one-deep drill stack: the top is the active panel id, and
// pushing a child id (e.g. "settings" from the "more" launcher) lets us
// render a back-chip without losing the launcher context.

const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

export const dashboardPanelBus = {
  state: { stack: [] },

  // Top-of-stack helper — what the dashboard should currently render.
  current() {
    const s = this.state.stack;
    return s.length ? s[s.length - 1] : null;
  },

  // Toggle the icon-row buttons use: tap the same icon to collapse,
  // tap a different one to switch.
  toggle(id) {
    const cur = this.current();
    if (cur === id) {
      this.state.stack = [];
    } else {
      this.state.stack = [id];
    }
    emit();
  },

  // Push a child panel onto the stack — used by MorePanel grid tiles.
  push(id) {
    this.state.stack = [...this.state.stack, id];
    emit();
  },

  // Pop one level (back-chip).
  pop() {
    if (this.state.stack.length === 0) return;
    this.state.stack = this.state.stack.slice(0, -1);
    emit();
  },

  // Full close — used by the × chip in the panel header.
  clear() {
    if (this.state.stack.length === 0) return;
    this.state.stack = [];
    emit();
  },

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

if (typeof window !== 'undefined') window.__broDashPanelBus = dashboardPanelBus;
