/* ═══ v2.3.3695: THE XP BAR'S PICTURES, WARMED ON THE LOADING SCREEN ═══
 *
 * CLAUDE.md's preloading LAW for a DOM picture (levelUpBurstPreload.js's
 * reasoning, the same three steps): the XP bar (ZoneHeader.jsx) shows the
 * skill's icon on the first hit of a fight, so a fetch then is a picture that
 * arrives a beat after its bar.  Three small files (the owner's Points icons,
 * a few KB each), decoded and held for the session: the bar can show anywhere
 * you fight, so there is no zone to scope them to.
 */
import { XP_BAR_ICONS, TOPBAR_LOGO } from '../ui/mobile/xpBarArt.js';
import { warmOnce } from './warmOnce.js';   /* v2.3.4652 */

const _held = [];

/* v2.3.4652: once a page, not once a join (warmOnce.js says why); a failed
   warm never fails the gate: the picture fetches at use */
const warm = warmOnce(_held);

export function preloadXpBar() {
  try {
    if (typeof window !== 'undefined') {
      /* QA: is this url one of the pictures held decoded (mp-xpbar)? */
      window.__btXpBarWarm = { has: (url) => _held.some((im) => im && im.src === url), count: () => _held.length };
    }
  } catch (_e) { /* a locked-down window */ }
  return Promise.all(Object.values(XP_BAR_ICONS).concat([TOPBAR_LOGO]).map(warm));   /* v2.3.4263: + the top bar's logo */
}
