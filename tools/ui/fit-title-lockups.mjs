#!/usr/bin/env node
/* ═══ v2.3.2642: THE OWNER'S TWO NEW LOCKUPS, CUT FOR THE TWO SCREENS ═══
 *
 * Owner, with two files: the wide BRO TOWN mark (sword through the O) "on the
 * trait picker instead of the current one", and the full HEMI BROS / BRO TOWN /
 * MULTIPLAYER AARPG stack "on the splash page to replace the current one".
 *
 * Both arrive as big square-ish exports with a lot of empty canvas around the
 * ink, and both are consumed by CSS that sizes the ELEMENT, not the ink:
 * .bt-cc-logo is `width:min(var(--cc-leftw),168px)` and .bt-login-logo is
 * `width:min(80vw,380px)`.  Shipping the raw export therefore ships PADDING as
 * if it were artwork -- the mark renders smaller than its box by exactly the
 * margin the export happened to have, and every layout number downstream
 * (the title band's padding, the headroom the character is measured against)
 * is solving against a box whose edges mean nothing.  So step one is always
 * an alpha TRIM: after it, the element's box IS the artwork's box, which is
 * what lets `bottom of .bt-cc-logo` be a true ceiling for the character
 * (mp-ccstand/mp-ccfeet) instead of a guess.
 *
 * Step two is the SILHOUETTE each shimmer masks itself with.  docs/TRAPS.md
 * §52: a CSS mask is a different resource destination from an <img>, so
 * pointing the mask at the art downloads the art a second time -- 85 KB and
 * 373 KB of gold, fetched twice on a cold load, to learn where the letters
 * are.  A mask reads ALPHA ONLY, so each `-mask.webp` here is white RGB
 * carrying the source's alpha verbatim: lossy WebP (the RGB is a constant,
 * there is nothing to lose) at a fraction of the art's bytes.
 *
 * Run:  node tools/ui/fit-title-lockups.mjs        (needs sharp; art-only tool,
 *                                                   not on the build path)
 */
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'tools/gear/src-art/splash');
const OUT = path.join(ROOT, 'public/ui/welcome/title');

/* Alpha bbox at a threshold rather than sharp's own trim(): these exports
   carry a faint glow that fades to a=1..8 well outside the ink, and trimming
   at "not exactly zero" keeps ~100px of invisible halo on every side. */
const ALPHA_FLOOR = 8;
async function inkBox(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] > ALPHA_FLOOR) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error(`${file}: no ink above alpha ${ALPHA_FLOOR}`);
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/* The art, trimmed and scaled to `width`, plus its alpha-only twin. */
async function cut({ src, out, width }) {
  const file = path.join(SRC, src);
  const box = await inkBox(file);
  const base = sharp(file).extract(box).resize({ width, fit: 'inside', kernel: 'lanczos3' });
  const artPath = path.join(OUT, `${out}.png`);
  /* TRUECOLOUR PNG, measured against the alternatives rather than assumed.
     The instinct on a 486 KB hero asset is to quantise or to switch to WebP,
     and at this size both are worse deals: palette-256 costs 149 KB and an
     RMSE of 2.4 on the opaque gold, WebP q94 costs 146 KB and an RMSE of 8.3
     (its chroma subsampling eats the thin dark outline the art is drawn
     with), while plain truecolour at compressionLevel 9 is 144 KB and exact.
     The old file was 486 KB because it was written at the default effort,
     not because gold needs the bytes. */
  const art = base.clone().png({ compressionLevel: 9, effort: 10 });
  const artInfo = await art.toFile(artPath);

  /* White RGB + the source's alpha. `-webkit-mask` only ever reads the alpha
     channel, so the colour is arbitrary; white is what makes the file legible
     if a human ever opens it. */
  const maskPath = path.join(OUT, `${out}-mask.webp`);
  const alpha = await base.clone().ensureAlpha().extractChannel('alpha').toBuffer();
  const { width: w, height: h } = await sharp(artPath).metadata();
  const maskInfo = await sharp({ create: { width: w, height: h, channels: 3, background: '#ffffff' } })
    .joinChannel(await sharp(alpha).resize(w, h, { fit: 'fill' }).toBuffer())
    .webp({ quality: 70, alphaQuality: 100, effort: 6 })
    .toFile(maskPath);

  console.log(`${src}  ink ${box.width}x${box.height} @${box.left},${box.top}`
    + `  ->  ${out}.png ${artInfo.width}x${artInfo.height} ${(artInfo.size / 1024).toFixed(0)} KB`
    + `  +  ${out}-mask.webp ${(maskInfo.size / 1024).toFixed(0)} KB`);
}

/* WIDTHS, and why these two are so different.
   - logo-full is the splash title: CSS caps it at 380 CSS px, so 760 covers a
     2x screen at 1:1 and a 3x phone at the cap's own 80vw (312px on a 390pt
     phone -> 936 device px, where the art is downscaled anyway).  760 is also
     what the lockup it replaces shipped at, so the screen's tuned numbers
     (max-height:46vh, the shimmer's box) keep meaning what they meant.
   - brotown-lockup is the trait picker's title: CSS caps it at 168 CSS px, so
     even a 3x phone asks for 504.  732 (half the source) is the next clean
     step above that, and 72 KB for it. */
await cut({ src: 'hemi-lockup-src.png',    out: 'logo-full',      width: 760 });
await cut({ src: 'brotown-lockup-src.png', out: 'brotown-lockup', width: 732 });
