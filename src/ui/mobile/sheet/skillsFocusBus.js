/* v2.3.1296 (round-5 Skills): compact-tile tap → expand + scroll that
   skill's card into view + brief highlight.  The compact tile stamps a
   request here before expanding; SkillsPanel consumes it on mount (or
   live if already mounted).  epoch disambiguates repeat taps on the
   same skill. */

let req = null; /* { key, epoch } */
let epoch = 0;
const listeners = new Set();

export const skillsFocusBus = {
  focus(key) {
    req = { key, epoch: ++epoch };
    for (const fn of listeners) fn();
  },
  consume() { const r = req; req = null; return r; },
  peek() { return req; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
