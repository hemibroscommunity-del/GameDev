/* ═══ v2.3.1668: heroSectionBus — "open Hero on THIS section" ═══
 *
 * The band's COMBAT pills used to route into the retired tier-2 screen
 * (`requestT2Category` + `dashboardPanelBus.push('t2')`).  Under prog3
 * that screen is dead content — worse than dead: T2Panel still spends
 * from the frozen legacy pool and persists it client-side, so tapping
 * Melee could quietly write points into a system nothing reads.
 *
 * The pills now ask Hero to open on its Build section with a combat type
 * pre-selected.  A one-shot request rather than persistent state: Hero
 * consumes it on its next render and clears it, so a later manual visit
 * to Hero doesn't get yanked back to Build.
 *
 * Same 13-line shape as controlsTutorialBus / bagFilterBus — the
 * established way one surface asks another to change without either
 * importing the other's component module.
 */
let _pending = null;
const listeners = new Set();

export const heroSectionBus = {
  /** Ask Hero to open on `section`, optionally with a combat type. */
  request(section, cat) {
    _pending = { section, cat: cat || null };
    listeners.forEach((fn) => { try { fn(_pending); } catch (e) { /* ignore */ } });
  },
  /** Read-and-clear.  Consumed by HeroExpanded on render. */
  take() { const p = _pending; _pending = null; return p; },
  peek() { return _pending; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
