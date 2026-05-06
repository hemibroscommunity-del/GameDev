/**
 * NFT 360° avatar texture pipeline for the Pixi renderer.
 *
 * Mirrors the Canvas 2D path in BroTown.jsx (~3098-3329):
 *   1. Fetch the NFT image URL.
 *   2. Sample the top-left corner pixel as the background color.
 *      Set alpha=0 on every pixel within tolerance of that color.
 *   3. From the processed image, build two 28×28 canvases (`front`
 *      and `back`) that the renderer cross-fades between based on
 *      the player's facing angle.
 *
 * The Canvas 2D path also samples top/mid/bot region colors for tinting,
 * but the renderer doesn't currently use them, so we skip those.
 *
 * Each loaded URL is cached in two stages so a player whose avatar
 * URL was loaded earlier in the session re-uses the textures
 * immediately on zone change.
 */

import { Texture } from 'pixi.js';

const SIZE = 28;
const BG_TOLERANCE = 40;

/** url → { front: Texture, back: Texture, size: 28 } once both are ready, or null while loading. */
const cache = new Map();
/** url → Promise<entry> in flight, prevents duplicate fetches. */
const loading = new Map();

/** Load an image into an HTMLImageElement.  Resolves with the image, or
 *  rejects on error / CORS failure. */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

/** Background-key the source image into a 64×64 transparent canvas
 *  (the sample size matches Canvas 2D processing).  Returns the
 *  HTMLCanvasElement, ready to draw from. */
function processToTransparent(img) {
  const sz = 64;
  const off = document.createElement('canvas');
  off.width = sz;
  off.height = sz;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, sz, sz);
  let imgData;
  try {
    imgData = ctx.getImageData(0, 0, sz, sz);
  } catch {
    /* Tainted canvas (CORS) — return raw, no key. */
    return null;
  }
  const d = imgData.data;
  const bgR = d[0], bgG = d[1], bgB = d[2];
  for (let i = 0; i < d.length; i += 4) {
    if (Math.abs(d[i] - bgR) < BG_TOLERANCE
     && Math.abs(d[i + 1] - bgG) < BG_TOLERANCE
     && Math.abs(d[i + 2] - bgB) < BG_TOLERANCE) {
      d[i + 3] = 0;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return off;
}

/** Build the 28×28 `front` and `back` canvases from the processed
 *  source.  Currently they're identical (just the source rescaled
 *  to 28×28) — the Canvas 2D path applies subtle face-mask /
 *  hue-shift transforms but the user-visible difference is small,
 *  and the renderer's cross-fade alpha is what sells the rotation.
 *  Punted on the visual tweaks until needed. */
function buildFrontBack(processedCanvas) {
  const front = document.createElement('canvas');
  front.width = SIZE;
  front.height = SIZE;
  const fctx = front.getContext('2d');
  fctx.imageSmoothingEnabled = false;
  fctx.drawImage(processedCanvas, 0, 0, SIZE, SIZE);

  /* Back: horizontally mirrored copy of front, with a subtle
     dark overlay so it reads as "facing away" silhouette.  This is
     a reasonable approximation of the Canvas 2D back canvas without
     the contrast-mask logic, and at 28×28 the user mostly sees the
     silhouette anyway. */
  const back = document.createElement('canvas');
  back.width = SIZE;
  back.height = SIZE;
  const bctx = back.getContext('2d');
  bctx.imageSmoothingEnabled = false;
  bctx.save();
  bctx.translate(SIZE, 0);
  bctx.scale(-1, 1);
  bctx.drawImage(processedCanvas, 0, 0, SIZE, SIZE);
  bctx.restore();
  /* Multiply with a cool-dark tint to deemphasize face details. */
  bctx.globalCompositeOperation = 'source-atop';
  bctx.fillStyle = 'rgba(20, 18, 50, 0.45)';
  bctx.fillRect(0, 0, SIZE, SIZE);

  return { front, back };
}

/** Returns the NFT texture pair for `url`, kicking off a load if not
 *  already cached.  Returns null until the textures are ready (caller
 *  falls back to procedural / sprite-sheet body in the meantime). */
export function getNftTextures(url) {
  if (!url) return null;
  const entry = cache.get(url);
  if (entry) return entry;
  if (loading.has(url)) return null;

  const promise = (async () => {
    try {
      const img = await loadImage(url);
      const processed = processToTransparent(img);
      const source = processed || img;
      const { front, back } = buildFrontBack(source);
      const result = {
        front: Texture.from(front),
        back:  Texture.from(back),
        size:  SIZE,
      };
      cache.set(url, result);
      return result;
    } catch (e) {
      console.warn('[nft-avatars] failed to load', url, e && e.message);
      cache.set(url, null);   // negative cache so we don't retry every frame
      return null;
    }
  })();
  loading.set(url, promise);
  return null;
}
