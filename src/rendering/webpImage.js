/* v2.3.1122: load a sprite image as WebP with a PNG fallback.
 *
 * The CI workflow (.github/workflows/optimize-assets.yml) generates a lossless
 * .webp next to each sprite .png. Requesting the .webp first cuts the download
 * (~46% on the player + gear sheets) while the .png fallback keeps things working
 * for any sheet that wasn't converted (or on the rare browser without WebP --
 * iOS 14+ has it). Lossless means the decoded pixels are identical to the PNG,
 * so the recolor (exact skin/pants/shoes RGB) and masked-body bake are unchanged.
 *
 * Drop-in replacement for the per-module `new Image()` / `loadImg` helpers.
 */
function _img(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
}

/* v2.3.2328: the set of sprite paths that actually HAVE a twin, scanned from
   public/sprites at build time (vite.config.js scanWebpTwins) and inlined here.
   Before this, the only way to find out was to ask the server and see it fail:
   one wasted round trip plus an SPA-fallback body per missing twin, measured at
   49 of them on a single cold load, on every load, for every player.
   That cost used to be temporary — "the twin will exist once CI runs". It is
   not any more: optimize-sprites.mjs now rejects a twin that is not
   pixel-identical to its PNG or is not actually smaller, so for some files "no
   twin" is the permanent and correct answer, and probing for them forever would
   be pure waste.
   Falling back to probing when the define is absent keeps this working outside a
   Vite build (a bare node import, a test harness) with the old behaviour. */
const _TWINS = typeof __WEBP_TWINS__ !== 'undefined' && Array.isArray(__WEBP_TWINS__)
  ? new Set(__WEBP_TWINS__)
  : null;

/** Load `pngUrl` as WebP if possible, else fall back to the PNG. Preserves any
 *  `?v=`/`#` suffix. Non-.png URLs load as-is. */
export function loadWebpOrPng(pngUrl) {
  const webpUrl = pngUrl.replace(/\.png(\?|#|$)/i, '.webp$1');
  if (webpUrl === pngUrl) return _img(pngUrl);
  /* Compare the PATH only — the callers append their own ?v= cache-bust. */
  if (_TWINS && !_TWINS.has(webpUrl.split('?')[0].split('#')[0])) return _img(pngUrl);
  return _img(webpUrl).catch(() => _img(pngUrl));
}
