/* v2.3.1294 (ChatGPT round-4, owner-approved): the character portrait,
   shared.  The persistent top-right identity card is retired — Hero
   owns the character HUD now — but its portrait pipeline lives on:
   BottomDashboard (always mounted) still regenerates the bust on
   cosmetic changes and writes it HERE, so the Hero toolbar icon and
   the Hero identity strip read one url and can never disagree. */

let url = '';
const listeners = new Set();

export const portraitStore = {
  get() { return url; },
  set(next) {
    if (next === url) return;
    url = next;
    for (const fn of listeners) fn();
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
