/* REFIT AN INVENTORY ICON INSIDE ITS OWN CANVAS (v2.3.2473).
 *
 * Owner (backlog triage 2026-09-14, art item 11): "armored legs icon too small
 * in the equipped slot."
 *
 * WHY IT IS THE ART AND NOT THE SLOT.  HeroExpanded's eqCell draws EVERY slot
 * icon the same way -- width 80%, height 80%, objectFit contain -- so all four
 * metal icons are scaled by the same factor into the same square.  What differs
 * is how much of their own 256 canvas each one uses.  Measured with
 * tools/qa/mp/inspect-sheets.mjs:
 *
 *     chest-plate   content 196 x 186   (area 36.5k)
 *     sword         content 193 x 196   (area 37.8k)
 *     great-sword   content 196 x 184   (area 36.1k)
 *     greaves       content 127 x 196   (area 24.9k)   <- a third less ink
 *
 * All four are the same HEIGHT, which is why nobody spotted this by measuring
 * one number: legs are a narrow object, so matching their height leaves them
 * matching nothing the eye uses.  The eye judges area, and the greaves has two
 * thirds of everyone else's.
 *
 * SO THIS SCALES THE CONTENT, IT DOES NOT REDRAW IT.  The icon's own pixels are
 * scaled about the centre of their bounding box and written back into the same
 * 256 canvas -- no new art, nothing invented, and it is reproducible: run it
 * again with the same numbers and you get the same file.  `--margin` is the gap
 * left at the tightest edge, in the icon's own pixels, so the result cannot
 * touch the canvas edge and get clipped by the slot's rounding.
 *
 * AFTER THIS, RE-RUN tools/gear/make-metal-icons.mjs: copper and iron are
 * multiplies of the base icon and would otherwise stay the old size.
 *
 *   node tools/gear/refit-icon.mjs public/icons/items/greaves.webp --margin=12
 *   node tools/gear/refit-icon.mjs FILE --dry        (measure, write nothing)
 */
import { chromium } from 'playwright-core';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
if (!file || !existsSync(file)) { console.error('usage: refit-icon.mjs FILE [--margin=12] [--dry]'); process.exit(2); }
const arg = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const MARGIN = +arg('margin', '12');
const DRY = args.includes('--dry');

const pinned = process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(pinned) ? { executablePath: pinned } : {});
const page = await browser.newPage();
const out = await page.evaluate(async (o) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = o.url; });
  const W = img.width, H = img.height;
  const src = document.createElement('canvas');
  src.width = W; src.height = H;
  const sg = src.getContext('2d', { willReadFrequently: true });
  sg.drawImage(img, 0, 0);
  const d = sg.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
  }
  if (x1 < 0) return { error: 'the icon is empty' };
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  /* the largest scale that still leaves `margin` at the tightest edge */
  const k = Math.min((W - 2 * o.margin) / cw, (H - 2 * o.margin) / ch);
  const before = { x: x0, y: y0, w: cw, h: ch, area: cw * ch };
  if (o.dry) return { before, k: +k.toFixed(3), after: { w: Math.round(cw * k), h: Math.round(ch * k) } };
  const dst = document.createElement('canvas');
  dst.width = W; dst.height = H;
  const dg = dst.getContext('2d');
  /* SMOOTHED, and deliberately: these are painted 256px illustrations, not pixel
     art, and nothing samples their exact RGB (the metal icons are a multiply of
     this file, and the multiply is per channel).  Nearest here would stair-step
     every diagonal edge on the plate. */
  dg.imageSmoothingEnabled = true;
  dg.imageSmoothingQuality = 'high';
  const nw = cw * k, nh = ch * k;
  dg.drawImage(src, x0, y0, cw, ch, (W - nw) / 2, (H - nh) / 2, nw, nh);
  return { before, k: +k.toFixed(3), after: { w: Math.round(nw), h: Math.round(nh) },
    url: dst.toDataURL('image/webp', 1.0) };
}, { url: `data:image/webp;base64,${readFileSync(file).toString('base64')}`, margin: MARGIN, dry: DRY });

if (out.error) { console.error(out.error); process.exit(1); }
console.log(`${file}: content ${out.before.w}x${out.before.h} (area ${out.before.area}) `
  + `-> x${out.k} = ${out.after.w}x${out.after.h} (area ${out.after.w * out.after.h})`);
if (!DRY && out.url) {
  writeFileSync(file, Buffer.from(out.url.split(',')[1], 'base64'));
  console.log('WROTE', file, '— now re-run tools/gear/make-metal-icons.mjs');
}
await browser.close();
