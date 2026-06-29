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
