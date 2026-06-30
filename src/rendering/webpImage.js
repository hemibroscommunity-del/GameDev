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

/** Load `pngUrl` as WebP if possible, else fall back to the PNG. Preserves any
 *  `?v=`/`#` suffix. Non-.png URLs load as-is. */
export function loadWebpOrPng(pngUrl) {
  const webpUrl = pngUrl.replace(/\.png(\?|#|$)/i, '.webp$1');
  if (webpUrl === pngUrl) return _img(pngUrl);
  return _img(webpUrl).catch(() => _img(pngUrl));
}

/* v2.3.1122: same WebP-with-PNG-fallback, but for Pixi's Assets.load() (returns
   a Texture) -- used by the monster/trait loaders that go through Assets rather
   than `new Image()`. Drop-in for `Assets.load(pngUrl)`. */
export async function loadTextureWebpOrPng(pngUrl) {
  const { Assets } = await import('pixi.js');
  const webpUrl = (typeof pngUrl === 'string') ? pngUrl.replace(/\.png(\?|#|$)/i, '.webp$1') : pngUrl;
  if (webpUrl === pngUrl) return Assets.load(pngUrl);
  try { return await Assets.load(webpUrl); }
  catch (e) { return Assets.load(pngUrl); }
}
