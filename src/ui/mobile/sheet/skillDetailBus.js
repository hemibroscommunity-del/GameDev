/* v2.3.1296 (round-5 Skills): which skill the detail view shows.
   v2.3.1312 (owner lifeskills spec): upgraded from a bare module `let`
   to a tiny store —
   - PERSISTED last-viewed skill (localStorage) so the compact grid can
     brass-outline the "selected or last-viewed" tile across reloads;
   - subscribe() so SkillsCompact repaints the outline live;
   - open()/consumeOpen(): a compact-tile tap now expands the sheet AND
     lands directly in that skill's IN-PANEL detail view (the old flow
     just scrolled its card into view) — epoch disambiguates repeat
     taps.  The old pushed 'skillDetail' drill is gone; the detail view
     renders inside SkillsPanel at the same sheet height. */

const KEY = 'bt_lastSkill';
let key = null;
try { key = (typeof localStorage !== 'undefined' && localStorage.getItem(KEY)) || null; } catch (e) { /* ignore */ }

let openEpoch = 0;
let consumedEpoch = 0;
const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

export const skillDetailBus = {
  select(k) {
    key = k;
    try { localStorage.setItem(KEY, k); } catch (e) { /* ignore */ }
    emit();
  },
  selected() { return key; },
  /* Request the detail view to open for the selected skill. */
  open(k) {
    this.select(k);
    openEpoch++;
    emit();
  },
  /* SkillsPanel: returns the skill key once per open() request. */
  consumeOpen() {
    if (openEpoch === consumedEpoch) return null;
    consumedEpoch = openEpoch;
    return key;
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
