/* ═══ v2.3.4652: A LOADING SCREEN'S WARM-UP, ONCE A PAGE ═══
 *
 * Five of the loading screen's small warm-ups (the controls' icons, the
 * gesture cues, the level-up burst, the quest window's art, the XP bar's
 * icons) decode their pictures and HOLD the <img>s, so the first time each
 * one shows it paints a bitmap that is already there (the preloading law).
 * Back to the menu and joining again runs the loading screen again, and each
 * of them made and held a fresh set of <img>s for the same URLs: the list
 * grew by every picture again on every rejoin, for the life of the page
 * (state-machine sweep VC-2, R5-9; #1505).  The stat scene's slime, the only
 * one measured as a real cost, was fixed at v2.3.4452 the same way; the chest
 * already warmed once (`_p`).
 *
 * warmOnce(held) is the warm-up those five shared word for word, keyed by
 * URL: a URL warmed already (or still warming) gives back its promise, so one
 * <img> is held a URL.  A warm that FAILED is dropped from the list and tried
 * again by the next loading screen, as before; a failed warm never fails the
 * gate (the <img> fetches at use).
 *
 * `?warmonce=0` is the game as it was (a fresh warm every pass). */

let _on = true;
try { if (typeof location !== 'undefined' && /[?&]warmonce=0\b/.test(location.search || '')) _on = false; } catch (e) { /* on */ }

export function warmOnce(held) {
  const warmed = new Map();   /* url -> the promise of its held <img> */
  return function warm(url) {
    if (typeof Image === 'undefined') return Promise.resolve(null);
    if (_on && warmed.has(url)) return warmed.get(url);
    const p = new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        const done = () => { held.push(img); resolve(img); };
        if (typeof img.decode === 'function') img.decode().then(done, done);
        else done();
      };
      img.onerror = () => { warmed.delete(url); resolve(null); };
      img.src = url;
    });
    if (_on) warmed.set(url, p);
    return p;
  };
}
