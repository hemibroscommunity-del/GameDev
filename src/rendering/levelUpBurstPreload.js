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
 *
 * v2.3.5004: THE ART IS COLOUR NUMBERS NOW, NOT THE STRIP DECODED.  Holding
 * the strip decoded for the session was 6.29 MB in the page; now the eight
 * frames' 256-colour files are held packed (398 KB) with frames 0-1 open
 * (89 KB of numbers), the rest opened on a worker as a burst starts
 * (levelUpBurstNumbers.js, docs/specs/pictures-256.md §7a) -- loaded here,
 * behind the loading screen, as the strip was.  The strip is still warmed where the numbers cannot be drawn
 * (`?burstnumbers=0`, a browser with no DecompressionStream, a first load
 * that failed), so the law holds on every path.
 */
import { LEVELUP_STRIP_SRC, LEVELUP_NUM_URLS } from '../data/levelUpBurst.js';
import { levelUpNumbersWanted, loadLevelUpNumbers, levelUpNumbersStats } from './levelUpBurstNumbers.js'; /* v2.3.5004 */
import { LEVELUP_ICON_URLS } from '../ui/levelUpIcons.js';
import { portraitStore } from '../ui/mobile/sheet/portraitStore.js'; /* v2.3.2615 */
import { warmOnce } from './warmOnce.js';   /* v2.3.4652 */

const _held = [];

/* v2.3.4652: once a page, not once a join (warmOnce.js says why); a failed
   warm never fails the gate: the picture fetches at use */
const warm = warmOnce(_held);

/* ═══ v2.3.2615: AND THE PORTRAIT ═══
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
        /* v2.3.5004: the art's colour numbers (held, ready, the draws' cost),
           and what of the art is held decoded as a picture (nothing, unless
           the strip is the way: mp-levelupnum step 7) */
        numbers: levelUpNumbersStats,
        artHeld: levelUpBurstArtHeld,
      };
    }
  } catch (e) { /* SSR / locked-down window */ }
  /* v2.3.3693: and the ten gold numerals the medallion's level is drawn in
     (~3 KB each): the same reason as the icons, they are drawn INSIDE the
     burst, on its first frame. */
  /* v2.3.5004: the art as its colour numbers; the strip only where they
     cannot be drawn, or did not come (a failed first load: the burst then
     draws the strip, so it is warmed here, behind the loading screen) */
  const art = levelUpNumbersWanted()
    ? loadLevelUpNumbers().then((ok) => (ok ? null : warm(LEVELUP_STRIP_SRC)))
    : warm(LEVELUP_STRIP_SRC);
  return Promise.all([art, ...[...LEVELUP_ICON_URLS, ...LEVELUP_NUM_URLS].map(warm)]);
}

/* v2.3.5004: for rigs: the burst's art held decoded as pictures -- how many
   and their bytes at four a pixel (the strip: 6.29 MB; with the numbers, none) */
export function levelUpBurstArtHeld() {
  let n = 0, bytes = 0;
  for (const img of _held) {
    if (!img || !/\/sprites\/fx\/levelup-burst/.test(img.src || '')) continue;
    n++;
    bytes += (img.naturalWidth || 0) * (img.naturalHeight || 0) * 4;
  }
  return { n, bytes };
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
