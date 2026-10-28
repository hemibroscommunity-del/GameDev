/* ═══ v2.3.3689: A HEAD PIECE'S PICTURE IS ASKED FOR AGAIN, NEVER WAITED ON FOR EVER ═══
 *
 * The owner, 2026-10-28: "I logged in as another character and traits were
 * missing when jogging in certain directions", then "Nevermind there's still
 * issues with the disappearing traits I still see it."
 *
 * Each facing of a head piece is its own small picture (~1.5 KB; the whole
 * set ~1.2 MB).  A request that STALLS -- no answer and no error, which a
 * flaky Wi-Fi or a phone changing networks can leave behind -- never settles,
 * and every retry the game had waited for a failure: the piece stayed off in
 * that one facing for the session (TRAPS §257).  The base pictures
 * (entityRenderer `_loadTraitDir`, loadCroppedStrip's `timeoutMs`) and the
 * colour catalogs' own copies of them (hair, hat, beard, glasses, eye style,
 * shirt: a recolour reads the picture again to repaint it) now give up on a
 * picture after TRAIT_LOAD_TIMEOUT_MS and ask again, past any cache.
 *
 * No imports: the six catalogs and the renderer share it. */

/* Each is ~1.5 KB, so 20 s is a request that died, never a slow one; the
   loading screen's own cap is 20 s too.  `?traittimeoutms=` (1-60 s) for a
   test that hangs one (mp-traitswitch). */
export const TRAIT_LOAD_TIMEOUT_MS = (() => {
  try {
    const m = /[?&]traittimeoutms=(\d+)/.exec((typeof location !== 'undefined' && location.search) || '');
    if (m) return Math.max(1000, Math.min(60000, Number(m[1])));
  } catch (e) { /* the default */ }
  return 20000;
})();

/* the waits before the second and third asks (entityRenderer's own rounds) */
const RETRY_MS = [2000, 6000];

/** A head piece's picture as an <img>: given up on after
    TRAIT_LOAD_TIMEOUT_MS (its download cancelled) or on an error, and asked
    for twice more, each past any cache (`&r=`).  Rejects after the third. */
export function loadTraitImg(url, attempt = 0) {
  return new Promise((res, rej) => {
    const im = new Image();
    let done = false;
    const fail = () => {
      if (attempt < RETRY_MS.length) {
        setTimeout(() => { loadTraitImg(url, attempt + 1).then(res, rej); }, RETRY_MS[attempt]);
      } else rej(new Error('trait picture failed: ' + url));
    };
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      im.onload = null; im.onerror = null;
      try { im.src = ''; } catch (e) { /* the download is let go of either way */ }
      fail();
    }, TRAIT_LOAD_TIMEOUT_MS);
    im.onload = () => { if (done) return; done = true; clearTimeout(timer); res(im); };
    im.onerror = () => { if (done) return; done = true; clearTimeout(timer); fail(); };
    im.src = url + (attempt > 0 ? (url.indexOf('?') >= 0 ? '&' : '?') + 'r=' + attempt : '');
  });
}
