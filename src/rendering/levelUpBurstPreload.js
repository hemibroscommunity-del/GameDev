/* ═══ v2.3.2591: LEVEL-UP BURST PRELOAD ═══
 *
 * CLAUDE.md's preloading LAW, applied to the one asset in this feature that
 * is NOT a Pixi texture.  The burst is drawn in the DOM (it is a screen-space
 * celebration over the HUD, like the banner it replaces, not a world effect),
 * so there is no Assets.load to hang it off — but "it is a CSS background"
 * does not exempt it.  A 424KB strip fetched on the frame a player first
 * levels up is exactly the mid-play hitch the law exists to stop, and it would
 * land at the most dramatic moment the game has.
 *
 * `decode()` rather than just `onload`: onload resolves when the BYTES are
 * there, decode() when the browser actually has a bitmap it can paint.  On a
 * strip this size the difference is a visible stall on the first paint, which
 * is the same hitch one step later.
 *
 * The Image objects are held in a module-level array on purpose.  A decoded
 * image with no reference is collectable, and a browser under memory pressure
 * WILL drop it — which would put the fetch back on first use, silently, which
 * is the regression this file exists to prevent.
 *
 * The skill icons come too.  They are small (6-30KB) and the repo loads UI
 * icons lazily everywhere else, which is fine for a panel the player opened
 * on purpose — but these ones are drawn INSIDE the burst, in the medallion's
 * void, and an icon that arrives a beat after the art is the most visible
 * version of this bug rather than the least.
 */
import { LEVELUP_STRIP_SRC } from '../data/levelUpBurst.js';
import { LEVELUP_ICON_URLS } from '../ui/levelUpIcons.js';

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
    /* A failed warm must not fail the gate — the intro overlay lifting is
       worth more than this asset, and the <img>/background falls back to a
       normal fetch at use time. */
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function preloadLevelUpBurst() {
  return Promise.all([LEVELUP_STRIP_SRC, ...LEVELUP_ICON_URLS].map(warm));
}

/* For rigs: how many of the warms are actually being held. */
export function levelUpBurstWarmCount() { return _held.length; }
