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
/* v2.3.1236: 2 -> 1 (owner: character sprite quality visibly declined at the
   half-resolution display bake; restore the full 256px display textures,
   accepting the longer bake/upload behind the loading screen and the ~4x
   texture VRAM that v2.3.1120 traded away).  DISPLAY_DS=2 remains the
   documented instant rollback if iPhone memory pressure / WebGL context loss
   returns.  NOTE: many body-sheet PNGs ship 128px-on-disk since the download
   downscale (v2.3.1108, upscaled back nearest-neighbour here) -- this
   constant governs the BAKE/display resolution, not the source art. */
/* v2.3.1408: 1 -> 2, the documented rollback above, taken WITH owner
   approval ("try half-res on preview").  iPhone memory pressure returned
   as hard Safari OOM page kills: ~245MB of GPU display textures + the
   matching CPU canvases parked the game at the kill threshold, and the
   ~64MB fishing-start allocation (fish/pickup strips + bakes) tipped it
   ("crashed just as I began fishing").  Half-res display bakes cut the
   body/bake share ~4x.  Differences vs the v2.3.1236-rejected look:
   the full-steel knight now renders from the PAINTED fullset figures
   (v2.3.1361+), which at DS=2 are Lanczos-downscaled painted art (see
   gearSheets fullset branch), not the old soft body bakes — and gear
   overlays stay at the full 256 contract.  Instant rollback: set 1. */
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

/* v2.3.1237: owner feedback — jog-shimmer at DISPLAY_DS=1 ("the lines on the
   character are shaky when it's animated"; regression from the v2.3.1236
   2 -> 1 flip).  At DS=2 every body display bake passed through
   downscaleByFactor's imageSmoothingQuality 'high' resample — v2.3.1121's fix
   for the "chewed up"/crawling thin outlines — which anti-aliased the hard
   stair-step edges the nearest-neighbour 128->256 upscale (v2.3.1108) leaves.
   At DS=1 downscaleByFactor is a no-op, so the display texture became the RAW
   nearest-upscaled art: binary hard edges rendered near 1:1, where every
   sub-pixel of motion flips the bilinear blend along each stair-step — the
   shimmer.  Mipmaps can't fix it: the GPU's box-filtered mip level 1 of a
   constant-2x2-block image is bit-identical to the raw hard-edged 128px art,
   so NO level of the chain contains anti-aliased edges.
   Fix: when (and only when) the sheet was nearest-upscaled from
   smaller-on-disk art, resample the FINAL display canvas down to the on-disk
   height and smoothly back up ('high' both ways).  The down step reconstructs
   the true on-disk texels (every 2x2 block is constant, so nothing real is
   lost); the up step lays the ~1px anti-aliased edge gradients the DS=2
   Lanczos bake used to provide, at the full 256px display size the owner
   asked for.  Native full-res sheets (srcH >= bake height, e.g.
   stand-south.png) pass through untouched and stay pixel-sharp.  The recolour
   pipeline runs BEFORE this on the exact-palette nearest upscale, so its RGB
   classification is unaffected.  Rollback: DISPLAY_DS=2 in this file — this
   helper then defers to downscaleByFactor, byte-identical to v2.3.1235. */
export function bakeDisplayCanvas(full, srcH) {
  if (DISPLAY_DS > 1) {
    /* v2.3.1412 (owner: half-res "looks soft").  Most body sheets ship
       128px ON DISK (v2.3.1108) and reach here as an exact 2x pixel-
       double (nearest upscale, and the recolour maps each 2x2 block
       uniformly).  For those, a NEAREST 2x downscale is a LOSSLESS
       inverse — every display texel is an exact on-disk (recoloured)
       texel — where the smooth Lanczos downscale was re-blurring art
       that was never really 256 to begin with.  Native >=256 art keeps
       the smooth path (real detail needs real resampling). */
    const h = full.naturalHeight || full.height || 0;
    if (srcH && h && srcH === Math.round(h / DISPLAY_DS)) {
      const w = full.naturalWidth || full.width || 0;
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(w / DISPLAY_DS));
      cv.height = Math.max(1, Math.round(h / DISPLAY_DS));
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = false; // nearest: exact texel picks
      ctx.drawImage(full, 0, 0, cv.width, cv.height);
      return cv;
    }
    return downscaleByFactor(full, DISPLAY_DS);
  }
  return antialiasUpscaledCanvas(full, srcH);
}

/* v2.3.1341: the DS=1 anti-alias resample above, extracted so GEAR sheets can
   get the identical edge treatment.  Size-preserving by contract: the output
   canvas is always the input's dimensions, so consumers that rely on the full
   256 frame (effectsRenderer's combat stand-ins, gear<->body pixel alignment)
   are unaffected — which is exactly why gearSheets couldn't reuse
   bakeDisplayCanvas itself (a future DISPLAY_DS=2 rollback would shrink gear
   through downscaleByFactor and break both).  Native-res art (srcH >= h)
   passes through untouched and stays pixel-sharp. */
export function antialiasUpscaledCanvas(full, srcH) {
  const w = full.naturalWidth || full.width || 0;
  const h = full.naturalHeight || full.height || 0;
  if (!w || !h || !srcH || srcH >= h) return full;  // native-res art: keep sharp
  const mid = document.createElement('canvas');
  mid.width = Math.max(1, Math.round(w * (srcH / h)));
  mid.height = srcH;
  const mctx = mid.getContext('2d');
  mctx.imageSmoothingEnabled = true;
  mctx.imageSmoothingQuality = 'high';
  mctx.drawImage(full, 0, 0, mid.width, mid.height);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(mid, 0, 0, w, h);
  return out;
}
