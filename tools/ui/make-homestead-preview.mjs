#!/usr/bin/env node
/* ═══ v2.3.2926: THE HOMESTEAD PICTURE ON THE INSPECT CARD ═══
 *
 * The owner's Inspect card mockup has a Homestead panel -- a little scene of
 * the player's farm with their pet in it.  There is no per-player farm scene
 * to render yet ("static Homestead preview" is one of the placeholders the
 * owner's direction allows), so the panel shows the farm zone's OWN map art:
 * the tilled plots and the pond, cropped out of public/maps/farm_v1.webp.
 *
 * A separate small file rather than the map itself, for the RAM reason in
 * CLAUDE.md's zone-asset note: the map decodes to ~6MB of texture for a panel
 * ~160px wide, on the iPhone the owner already found "wonky with RAM".  This
 * crop is 480x300 (3x the panel), ~40KB on disk and ~0.6MB decoded.
 *
 * Usage:  node tools/ui/make-homestead-preview.mjs [--force]
 * Re-run it if the farm map is redrawn (and point MAP at the new version).
 * Refuses to overwrite the output without --force, like slice-social-icons.
 *
 * Needs playwright-core (a devDependency) and the preinstalled Chromium at
 * /opt/pw-browsers/chromium -- the canvas does the crop and the webp encode,
 * so there is no image library to install.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MAP = path.join(ROOT, 'public/maps/farm_v1.webp');
const OUT = path.join(ROOT, 'public/icons/ui/homestead-preview.webp');
/* The crop, as fractions of the map so a re-export at another size still
   frames the same place: the two tilled plots, the pond on the left, and the
   mushroom-lit grass around them. */
const CROP = { x: 0.089, y: 0.273, w: 0.622, h: 0.466 };
const OUT_W = 480;
const OUT_H = 300;

if (fs.existsSync(OUT) && !process.argv.includes('--force')) {
  console.error(`${path.relative(ROOT, OUT)} exists -- pass --force to overwrite`);
  process.exit(1);
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
try {
  const page = await browser.newPage();
  const b64 = fs.readFileSync(MAP).toString('base64');
  await page.setContent(`<img id="m" src="data:image/webp;base64,${b64}">`);
  await page.waitForFunction(() => document.getElementById('m').complete);
  const dataUrl = await page.evaluate(({ CROP, OUT_W, OUT_H }) => {
    const img = document.getElementById('m');
    const W = img.naturalWidth, H = img.naturalHeight;
    const sx = Math.round(CROP.x * W), sy = Math.round(CROP.y * H);
    const sw = Math.round(CROP.w * W), sh = Math.round(CROP.h * H);
    const c = document.createElement('canvas');
    c.width = OUT_W; c.height = OUT_H;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H);
    return c.toDataURL('image/webp', 0.86);
  }, { CROP, OUT_W, OUT_H });
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  fs.writeFileSync(OUT, buf);
  console.log(`wrote ${path.relative(ROOT, OUT)} (${OUT_W}x${OUT_H}, ${(buf.length / 1024).toFixed(1)} KB)`);
} finally {
  await browser.close();
}
