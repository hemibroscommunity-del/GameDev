/* ═══ v2.3.3695: THE XP BAR'S PICTURES, WARMED ON THE LOADING SCREEN ═══
 *
 * CLAUDE.md's preloading LAW for a DOM picture (levelUpBurstPreload.js's
 * reasoning, the same three steps): the XP bar (ZoneHeader.jsx) shows the
 * skill's icon on the first hit of a fight, so a fetch then is a picture that
 * arrives a beat after its bar.  Three small files (the owner's Points icons,
 * a few KB each), decoded and held for the session: the bar can show anywhere
 * you fight, so there is no zone to scope them to.
 */
import { XP_BAR_ICONS } from '../ui/mobile/xpBarArt.js';

const _held = [];

function warm(url) {
  if (typeof Image === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const done = () => { _held.push(img); resolve(img); };
      if (typeof img.decode === 'function') img.decode().then(done, done);
      else done();
    };
    /* a failed warm never fails the gate: the bar's <img> fetches at use */
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function preloadXpBar() {
  try {
    if (typeof window !== 'undefined') {
      /* QA: is this url one of the pictures held decoded (mp-xpbar)? */
      window.__btXpBarWarm = { has: (url) => _held.some((im) => im && im.src === url), count: () => _held.length };
    }
  } catch (_e) { /* a locked-down window */ }
  return Promise.all(Object.values(XP_BAR_ICONS).map(warm));
}
