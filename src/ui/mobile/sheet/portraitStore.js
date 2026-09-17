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

/* ═══ v2.3.2615: ONE PORTRAIT SOURCE, NAMED ONCE ═══
 * The Shared column in the points panel (HeroExpanded.jsx) resolved the
 * character's picture with a three-step fallback written inline, and the
 * level-up burst now needs the SAME picture in its medallion — a character
 * level-up wears the character (owner directive 2026-09-17).  A second copy of
 * the chain is how the two would drift, so the chain moves here, beside the
 * store it reads from, and both call sites go through it.
 *
 * The first two steps cost no network: `url` is a canvas data URL that
 * BottomDashboard (always mounted) generated from the player's own cosmetics,
 * and S.myAvatar is likewise already in hand.  Only the last step is a file,
 * which is why it is in the level-up preload manifest — see
 * src/rendering/levelUpBurstPreload.js. */
export const PORTRAIT_FALLBACK_SRC = '/icons/ui/hero/tab-overview.webp?v=2.3.2592';

export function portraitSrc(S) {
  return portraitStore.get() || (S && S.myAvatar) || PORTRAIT_FALLBACK_SRC;
}
