// Lightweight pub/sub for opening / closing the over-head chat bubble.
// Lives outside React state so the BottomDashboard icon and the bubble
// component can talk without prop drilling through GameApp.

const listeners = new Set();

export const chatBubbleBus = {
  open: false,
  setOpen(v) {
    if (this.open === v) return;
    this.open = v;
    for (const fn of listeners) fn();
  },
  toggle() { this.setOpen(!this.open); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
