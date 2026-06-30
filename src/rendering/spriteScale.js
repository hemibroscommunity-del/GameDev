/* spriteScale — keep downscaled-on-disk sprite sheets working at the runtime's
 * logical frame size (v2.3.1108).
 *
 * To shrink the download, sprite-sheet PNGs are stored physically smaller on
 * disk (e.g. 96px frames) but the renderer's whole coordinate system — frame
 * slicing, anchors.json / body-tops.json, the masked-body region rows, and the
 * recolour pixel thresholds in playerSkins — assumes 256px frames. So each
 * loader upscales the freshly-loaded image back to a 256px frame height here,
 * before slicing/recolour. NEAREST-NEIGHBOUR is used so the upscale introduces
 * NO new colours: the recolour pipeline keys on exact skin/pants/shoes RGB, and
 * nearest sampling preserves those values exactly (bilinear would blur edge
 * pixels into new shades and mis-tint them).
 *
 * No-op when the source is already >= frameH tall, so adding the call to a
 * loader is safe even before the PNGs are downscaled (full-res art passes
 * straight through).
 */

/** Upscale a loaded sheet (HTMLImageElement | HTMLCanvasElement | ImageBitmap)
 *  to `frameH` px tall via nearest-neighbour, preserving aspect. Returns a
 *  canvas, or the original untouched when it's already >= frameH tall. */
export function upscaleToFrameHeight(img, frameH = 256) {
  const h = img.naturalHeight || img.height || 0;
  const w = img.naturalWidth || img.width || 0;
  if (!h || !w || h >= frameH) return img;
  const scale = frameH / h;
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * scale));
  cv.height = frameH;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false; // nearest-neighbour: exact palette preserved
  ctx.drawImage(img, 0, 0, cv.width, cv.height);
  return cv;
}

/* v2.3.1120: DISPLAY downscale. Characters render at ~100px on a phone but the
   sheets are processed at the 256px logical frame, so the final DISPLAY textures
   are stored at 256/DISPLAY_DS px to cut GPU VRAM ~DISPLAY_DS^2. Recolor /
   classification / all metadata stay in 256-space; only the baked display
   texture shrinks (the pickup-head HEAD_DS pattern, generalised). Every consumer
   that uses the body sprite's scale divides 256-space offsets by DISPLAY_DS in
   lockstep, so DISPLAY_DS=1 is an exact no-op + instant rollback. */
export const DISPLAY_DS = 2;

/** Downscale an image/canvas to 1/ds in both dimensions onto a new canvas
 *  (bilinear). Returns the source unchanged when ds <= 1 (the DISPLAY_DS=1
 *  no-op path). Used by the body / gear / base-sheet loaders + the masked-body
 *  bake to shrink the final display texture only. */
export function downscaleByFactor(src, ds = DISPLAY_DS) {
  if (!ds || ds <= 1) return src;
  const w = src.naturalWidth || src.width || 0;
  const h = src.naturalHeight || src.height || 0;
  if (!w || !h) return src;
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w / ds));
  cv.height = Math.max(1, Math.round(h / ds));
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  /* v2.3.1121: HIGH-quality resampling. The default ('low', a cheap 2x2 bilinear)
     mangled thin high-contrast lines on the 2x downscale -- the dark shoe outline
     read as "chewed up". 'high' uses a wider/Lanczos-like kernel that preserves
     thin edges; the bake is one-time (behind the loading screen / lazy), so the
     extra cost is negligible. */
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, cv.width, cv.height);
  return cv;
}
