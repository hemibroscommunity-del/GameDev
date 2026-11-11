/* ═══ v2.3.4625: THE TIMING BAR'S PICTURE, WARMED ON THE LOADING SCREEN ═══
 *
 * CLAUDE.md's preloading LAW for a DOM picture (xpBarPreload.js's three
 * steps): the timing bar (ui/panels/TimingBar.jsx) shows on the first swing
 * of a fight, so a fetch then is a bar that arrives empty-handed a beat late.
 * One 2.4 KB file (ui/panels/timingBarArt.js), decoded and held for the
 * session -- and ONLY on the free-swing trial (`?manual=3`) with the bar
 * wanted (`?timingbar=0` hides it): off the trial nothing is fetched and
 * nothing is held, so a player who never meets the bar pays nothing.
 */
import { TB_ART } from '../ui/panels/timingBarArt.js';
import { manualFreeSwing, timingBarWanted } from '../game/manualCombat.js';

const _held = [];
/* the one warm, shared: the loading screen's preload runs again on a later
   pass (mp-timingbar caught two copies held), and one decoded copy is all
   the bar needs */
let _warm = null;

export function preloadTimingBar() {
  let want = false;
  try { want = manualFreeSwing() && timingBarWanted(); } catch (_e) { want = false; }
  try {
    if (typeof window !== 'undefined') {
      /* QA: was the bar's picture warmed, and is it held (mp-timingbar)? */
      window.__btTimingBarWarm = { wanted: want, count: () => _held.length };
    }
  } catch (_e) { /* a locked-down window */ }
  if (!want || typeof Image === 'undefined') return Promise.resolve(null);
  if (_warm) return _warm;
  _warm = new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const done = () => { _held.push(img); resolve(img); };
      if (typeof img.decode === 'function') img.decode().then(done, done);
      else done();
    };
    /* a failed warm never fails the gate: the bar's own style fetches at use */
    img.onerror = () => { _warm = null; resolve(null); };   /* a failed warm may be tried again by the next pass */
    img.src = TB_ART;
  });
  return _warm;
}
