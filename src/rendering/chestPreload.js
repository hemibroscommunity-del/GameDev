/* ═══ v2.3.2820: THE DAILY CHEST'S ART, WARM BEFORE THE INTRO LIFTS ═══
 * Owner's 9-frame chest sheet (idle, two shakes, six opening frames), cut to a
 * 9 x 256 strip by the import in this PR: every cell anchored on the chest's
 * base so it does not jump between rows of the source sheet, and the red
 * matte fringe on the glow recoloured to the glow's gold.
 *
 * Animation preloading is LAW (CLAUDE.md): the claim window opens at login,
 * i.e. seconds after the intro lifts, and its first frame is exactly where a
 * blank would be seen.  So both images are decoded on the preload gate
 * (preloadAnimations.js group `dailyChest`) and HELD, the gestureCuePreload
 * pattern -- a decoded Image dropped on the floor can be evicted again.
 *
 * These URLs are the cache keys: every consumer imports them from here
 * rather than spelling its own query string. */
export const DAILY_CHEST_STRIP = '/ui/chest/daily-chest-strip.webp?v=2820';
export const DAILY_CHEST_ICON = '/icons/items/daily-chest.webp?v=2820';
export const DAILY_CHEST_FRAMES = 9;

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
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

let _p = null;
export function preloadDailyChest() {
  if (!_p) _p = Promise.all([warm(DAILY_CHEST_STRIP), warm(DAILY_CHEST_ICON)]);
  return _p;
}
