/* ═══ v2.3.3190: A PICTURE KEPT AS COLOUR NUMBERS, READ ON THE CPU ═══
 *
 * The Wheel's ground and objects are kept as one byte a pixel, their colour's
 * number, and coloured on the GPU (paletteTex.js).  What reads one of their
 * pictures on the CPU -- a shadow's base off its art (propGround.js), a hit's
 * chips (hitMaterialFx.js), a burn mark (wheelObjects.js wheelScorch), a
 * shatter's shards (wheelShatter.js) -- reads it here: drawSourceRect does
 * what ctx.drawImage(source.resource, ...) did, for these and every other
 * source.  No Pixi and no imports: propGround.js, which the server's depth
 * test loads in Node, uses it.
 */

/** Is this texture source one of these (an R8 texture of colour numbers)? */
export function isPaletteSource(src) { return !!(src && src._btPal && !src.destroyed); }


/** RGBA (straight alpha, as a canvas holds it) for the source's pixels
 *  (x0, y0)-(x0 + w, y0 + h), clamped to the picture. */
export function paletteRegionRGBA(src, x0, y0, w, h) {
  const P = src && src._btPal;
  const idx = src && src.resource;
  if (!P || !idx || !(w > 0) || !(h > 0)) return null;
  const out = new Uint8ClampedArray(w * h * 4);
  const rgba = P.rgba;
  /* the colours un-premultiplied once, for a canvas's straight alpha */
  const straight = new Uint8ClampedArray(256 * 4);
  for (let k = 0; k < 256; k++) {
    const a = rgba[k * 4 + 3];
    straight[k * 4 + 3] = a;
    if (!a) continue;
    if (a === 255) { straight[k * 4] = rgba[k * 4]; straight[k * 4 + 1] = rgba[k * 4 + 1]; straight[k * 4 + 2] = rgba[k * 4 + 2]; continue; }
    straight[k * 4] = Math.round(rgba[k * 4] * 255 / a);
    straight[k * 4 + 1] = Math.round(rgba[k * 4 + 1] * 255 / a);
    straight[k * 4 + 2] = Math.round(rgba[k * 4 + 2] * 255 / a);
  }
  for (let y = 0; y < h; y++) {
    const sy = Math.min(P.h - 1, Math.max(0, y0 + y));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(P.w - 1, Math.max(0, x0 + x));
      const k = idx[sy * P.stride + sx] * 4, o = (y * w + x) * 4;
      out[o] = straight[k]; out[o + 1] = straight[k + 1]; out[o + 2] = straight[k + 2]; out[o + 3] = straight[k + 3];
    }
  }
  return out;
}

/**
 * ctx.drawImage(source's picture, sx, sy, sw, sh, dx, dy, dw, dh) -- for one
 * of these, from a scratch canvas of the region and a margin round it (so a
 * scaled draw's smoothing reads the neighbours it always read), let go of at
 * once.  Any other source: its resource, as before.  Throws as drawImage
 * would (the callers catch).
 */
const MARGIN = 2;
export function drawSourceRect(ctx, src, sx, sy, sw, sh, dx, dy, dw, dh) {
  if (!isPaletteSource(src)) { ctx.drawImage(src.resource, sx, sy, sw, sh, dx, dy, dw, dh); return; }
  const P = src._btPal;
  const x0 = Math.max(0, Math.floor(sx) - MARGIN), y0 = Math.max(0, Math.floor(sy) - MARGIN);
  const x1 = Math.min(P.w, Math.ceil(sx + sw) + MARGIN), y1 = Math.min(P.h, Math.ceil(sy + sh) + MARGIN);
  const w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0) return;
  const px = paletteRegionRGBA(src, x0, y0, w, h);
  if (!px || typeof document === 'undefined') throw new Error('no pixels');
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  try {
    c.getContext('2d').putImageData(new ImageData(px, w, h), 0, 0);
    ctx.drawImage(c, sx - x0, sy - y0, sw, sh, dx, dy, dw, dh);
  } finally {
    c.width = 0; c.height = 0;   /* iPhone Safari's canvas budget (v2.3.3046) */
  }
}
