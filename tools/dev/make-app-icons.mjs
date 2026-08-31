#!/usr/bin/env node
/* ═══ v2.3.2191: BUILD THE HOME-SCREEN ICON SET FROM ONE MASTER ═══
 *
 * Owner, with the BRO TOWN plate: "Can you use this image for the web app
 * (that you save to your home page on iPhone) also configure it however you
 * need to for android."
 *
 * Four files, three platforms, one artwork -- and none of the platforms
 * reads another's:
 *   icon-180.png            iOS home screen (apple-touch-icon).  iOS never
 *                           looks at the manifest for this, wants 180x180,
 *                           and rounds the corners itself.
 *   icon-192/512.png        Android + Chrome install, via the manifest.
 *   icon-maskable-512.png   Android adaptive icon.  The launcher CROPS this
 *                           to a circle or squircle and only the middle 80%
 *                           is guaranteed to survive, so the artwork is
 *                           scaled into that safe zone and the plate colour
 *                           fills the rest.  Full-bleed here would cut the
 *                           outer letters off "BRO" and "TOWN".
 *   favicon-32/192.png      Browser tab.
 *
 * This exists as a SCRIPT rather than as four hand-cut files because the
 * next art drop should be one command, not a morning of exporting -- and
 * because the maskable inset is a rule (80%) that has to be reapplied
 * correctly every time, which is exactly the kind of thing a human redoing
 * it by eye gets subtly wrong.
 *
 * There is no ImageMagick or PIL in this sandbox, so the resizing is done by
 * the Chromium that IS here: draw into a canvas at the exact target size and
 * read the PNG back with toDataURL -- not a screenshot, which would carry a
 * device-pixel-ratio and hand back the wrong dimensions.
 *
 *   node tools/dev/make-app-icons.mjs <master.png>
 *
 * The master should be square and at least 512px; the owner's was 1254.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.cwd(), 'public/icons/app');

/* Android's maskable safe zone: the middle 80% of the icon. */
const MASKABLE_INSET = 0.8;

const JOBS = [
  { name: 'icon-180.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-512.png', size: 512, inset: MASKABLE_INSET },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-192.png', size: 192 },
];

const master = process.argv[2];
if (!master || !fs.existsSync(master)) {
  console.error('usage: node tools/dev/make-app-icons.mjs <master.png>');
  process.exit(1);
}

const buf = fs.readFileSync(master);
const w = buf.readUInt32BE(16);
const h = buf.readUInt32BE(20);
if (w !== h) console.warn(`WARN master is ${w}x${h}, not square — the icons will be squashed.`);
if (w < 512) console.warn(`WARN master is only ${w}px — 512 and 192 will be upscaled.`);

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent('<body style="margin:0">');
  const made = await page.evaluate(async ({ data, jobs }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + data;
    await img.decode();
    /* The colour the maskable pads with, sampled from the master's own
       corner so it continues the plate rather than guessing at it. */
    const probe = document.createElement('canvas');
    probe.width = probe.height = img.width;
    const pctx = probe.getContext('2d');
    pctx.drawImage(img, 0, 0);
    const px = pctx.getImageData(3, 3, 1, 1).data;
    const corner = `rgb(${px[0]},${px[1]},${px[2]})`;
    const out = [];
    for (const j of jobs) {
      const c = document.createElement('canvas');
      c.width = c.height = j.size;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      if (j.inset) {
        ctx.fillStyle = corner;
        ctx.fillRect(0, 0, j.size, j.size);
        const d = Math.round(j.size * j.inset);
        const o = Math.round((j.size - d) / 2);
        ctx.drawImage(img, o, o, d, d);
      } else {
        ctx.drawImage(img, 0, 0, j.size, j.size);
      }
      out.push({ name: j.name, data: c.toDataURL('image/png').split(',')[1] });
    }
    return { corner, out };
  }, { data: buf.toString('base64'), jobs: JOBS });

  fs.mkdirSync(OUT, { recursive: true });
  console.log('plate colour sampled from the master:', made.corner);
  for (const f of made.out) {
    const dest = path.join(OUT, f.name);
    fs.writeFileSync(dest, Buffer.from(f.data, 'base64'));
    const b = fs.readFileSync(dest);
    console.log('  ' + f.name.padEnd(24), b.readUInt32BE(16) + 'x' + b.readUInt32BE(20),
      (b.length / 1024).toFixed(0) + 'kB');
  }
  console.log('\nThe manifest and index.html already point at these names — nothing to rewire.');
} finally {
  await browser.close();
}
