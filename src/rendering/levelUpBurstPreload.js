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
import { portraitStore } from '../ui/mobile/sheet/portraitStore.js'; /* v2.3.2610 */

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

/* ═══ v2.3.2610: AND THE PORTRAIT ═══
 *
 * A CHARACTER level-up seats the player's own bust in the medallion instead of
 * a skill icon (owner directive 2026-09-17).  That picture is not a file — it
 * is a canvas data URL that BottomDashboard rasterises from the live cosmetics
 * and publishes through portraitStore — so there is no fetch to preload and the
 * usual reading of the law does not obviously reach it.
 *
 * It still gets warmed, for the reason the law exists rather than its letter.
 * A data URL of a few hundred KB has to be DECODED before the browser can
 * paint it, and doing that on the frame a level-up lands is the same hitch as
 * a fetch, at the same dramatic moment; `decode()` is exactly what `warm` is
 * built around.  The subscription matters as much as the first call: the
 * portrait is regenerated whenever the player changes a cosmetic, and a warm
 * bitmap for a portrait they no longer have is not a warm bitmap.
 *
 * The URL that is genuinely a file — PORTRAIT_FALLBACK_SRC, the last step of
 * portraitSrc — rides in LEVELUP_ICON_URLS with the skill icons.
 *
 * Wired here, at the module that already owns this feature's warming, rather
 * than in the store: portraitStore is a four-line leaf that the trade window
 * and the identity strip also read, and giving it an opinion about decoding
 * would put this feature's policy inside everyone else's dependency. */
/* ONE slot, not the _held array.  _held is a fixed manifest — the strip plus
   the skill icons, warmed once — and appending to it on every cosmetic change
   would hold every bust the player has ever worn for the life of the session:
   a fix for one hitch turned into a slow leak on the platform (iPhone Safari)
   the zone-asset exception exists to protect.  Only the CURRENT portrait needs
   to be decoded and referenced; the previous one is not going to be drawn. */
let _stopPortraitWatch = null;
let _portraitHeld = null;
function warmPortrait() {
  const url = portraitStore.get();
  if (!url || typeof Image === 'undefined') return;
  if (_portraitHeld && _portraitHeld.src === url) return;
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    const keep = () => { _portraitHeld = img; };
    if (typeof img.decode === 'function') img.decode().then(keep, keep);
    else keep();
  };
  img.onerror = () => { /* the <img> falls back to a normal decode at use time */ };
  img.src = url;
}

export function preloadLevelUpBurst() {
  if (!_stopPortraitWatch) _stopPortraitWatch = portraitStore.subscribe(warmPortrait);
  warmPortrait();
  /* The rig's seam.  "Preloading is law" is only worth as much as the check
     that enforces it, and a decoded bitmap is not something a screenshot can
     show — the frame where the portrait was NOT ready looks identical to the
     frame where it was, one repaint later.  So the rig asks by value: is THIS
     url one of the bitmaps being held?  (tools/qa/mp/shot-levelup.mjs.) */
  try {
    if (typeof window !== 'undefined') {
      window.__btLevelUpWarm = {
        has: levelUpBurstHasWarm,
        portrait: () => portraitStore.get(),
        count: levelUpBurstWarmCount,
      };
    }
  } catch (e) { /* SSR / locked-down window */ }
  return Promise.all([LEVELUP_STRIP_SRC, ...LEVELUP_ICON_URLS].map(warm));
}

/* For rigs: how many of the warms are actually being held. */
export function levelUpBurstWarmCount() { return _held.length; }

/* Is a given url one of the bitmaps this module is holding decoded?  The rig
   asks about the portrait by value, because "the count went up" cannot tell a
   warmed portrait from a warmed skill icon. */
export function levelUpBurstHasWarm(url) {
  if (!url) return false;
  if (_portraitHeld && _portraitHeld.src === url) return true;
  for (const img of _held) if (img && img.src === url) return true;
  return false;
}
