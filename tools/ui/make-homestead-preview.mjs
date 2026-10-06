#!/usr/bin/env node
/* ═══ v2.3.2926: THE HOMESTEAD PICTURE ON THE INSPECT CARD ═══
 *
 * The owner's Inspect card mockup has a Homestead panel -- a little scene of
 * the player's farm with their pet in it.  There is no per-player farm scene
 * to render yet ("static Homestead preview" is one of the placeholders the
 * owner's direction allows), so the panel shows the farm zone's OWN art.
 *
 * A separate small file rather than the map itself, for the RAM reason in
 * CLAUDE.md's zone-asset note: a farm map decodes to megabytes of texture for
 * a panel ~160px wide, on the iPhone the owner already found "wonky with
 * RAM".  This picture is 480x300 (3x the panel), ~65KB on disk and ~0.6MB
 * decoded.
 *
 * v2.3.3124: the cave farm (farm_v1) is gone -- the owner, "This map isn't
 * suited for a farm" -- and the farm you walk is a ground picture with the
 * barn, the props and the trees standing on it as sprites
 * (src/data/farmLayout.js, drawn by src/rendering/farmWorld.js).  So the
 * picture is no longer a crop of the map: it is the farmstead drawn the way
 * the game draws it -- the ground, then everything standing, each at its
 * foot, the nearer over the further -- round the barn, with the yard in front
 * where the pet stands (.bt-pin-petsprite sits at the bottom middle).  No
 * shadows or light: the game adds those, and at 160px they are noise.
 *
 * Usage:  node tools/ui/make-homestead-preview.mjs [--force]
 * Re-run it after the farm's layout or pictures change.
 * Refuses to overwrite the output without --force, like slice-social-icons.
 *
 * Needs playwright-core (a devDependency) and the preinstalled Chromium at
 * /opt/pw-browsers/chromium -- the canvas does the drawing and the webp
 * encode, so there is no image library to install.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FARM_THINGS, FARM_GROUND } from '../../src/data/farmLayout.js';
import { FARM_ART } from '../../src/data/farmArt.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'public/icons/ui/homestead-preview.webp');
const PUB = path.join(ROOT, 'public');
/* The scene, in game px: the barn whole (its foot at y 566, its weathervane
   at 118) with the orchard behind it, the tool rack, the notice board and
   the seed sacks beside it, and the yard in front.  1.6:1, the output's
   shape; the panel's object-fit: cover trims a little off the top and
   bottom. */
const SCENE = { x: 80, y: 80, w: 864, h: 540 };
const OUT_W = 480;
const OUT_H = 300;
const PX = 2;   /* picture px a game px, every farm picture's (the art law) */

if (fs.existsSync(OUT) && !process.argv.includes('--force')) {
  console.error(`${path.relative(ROOT, OUT)} exists -- pass --force to overwrite`);
  process.exit(1);
}

const dataUrl = (file) => {
  const ext = path.extname(file).slice(1).toLowerCase();
  return `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${fs.readFileSync(file).toString('base64')}`;
};

/* Everything standing, as a picture and where its foot is in it. */
const pictures = {};   /* key -> data url */
const sheets = {};     /* sheet -> its frames (PixiJS sheet json) */
const items = [];
for (const t of FARM_THINGS) {
  if (t.art.indexOf('farm:') === 0) {
    const name = t.art.slice(5);
    const a = FARM_ART[name];
    if (!a) throw new Error('no farm picture ' + name);
    pictures[t.art] = pictures[t.art] || dataUrl(path.join(PUB, 'world/farm', name + '.png'));
    items.push({ key: t.art, x: t.x, y: t.y, flip: !!t.flip, src: { x: 0, y: 0, w: a.w, h: a.h }, foot: [a.foot[0], a.foot[1]] });
  } else if (t.art.indexOf('obj:') === 0) {
    const [sheet, frame] = t.art.slice(4).split('/');
    if (!sheets[sheet]) {
      sheets[sheet] = JSON.parse(fs.readFileSync(path.join(PUB, 'world/objects', sheet + '.json'), 'utf8'));
      pictures['sheet:' + sheet] = dataUrl(path.join(PUB, 'world/objects', sheets[sheet].meta.image));
    }
    const f = sheets[sheet].frames[frame];
    if (!f) throw new Error('no frame ' + t.art);
    const an = f.anchor || { x: 0.5, y: 1 };
    items.push({ key: 'sheet:' + sheet, x: t.x, y: t.y, flip: !!t.flip, src: f.frame, foot: [an.x * f.frame.w, an.y * f.frame.h] });
  }
}
/* nearer over further, as the depth pass sorts them */
items.sort((a, b) => a.y - b.y);
const ground = dataUrl(path.join(PUB, FARM_GROUND.picture.replace(/^\//, '')));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<html><body></body></html>');
  const out = await page.evaluate(async ({ ground, pictures, items, SCENE, OUT_W, OUT_H, PX }) => {
    const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const img = {};
    for (const k of Object.keys(pictures)) img[k] = await load(pictures[k]);
    const g0 = await load(ground);
    const c = document.createElement('canvas');
    c.width = OUT_W; c.height = OUT_H;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(g0, SCENE.x * PX, SCENE.y * PX, SCENE.w * PX, SCENE.h * PX, 0, 0, OUT_W, OUT_H);
    const k = OUT_W / SCENE.w;   /* output px a game px */
    let drawn = 0;
    for (const it of items) {
      const w = it.src.w / PX, h = it.src.h / PX;
      const left = it.x - it.foot[0] / PX, top = it.y - it.foot[1] / PX;
      if (left > SCENE.x + SCENE.w || left + w < SCENE.x || top > SCENE.y + SCENE.h || top + h < SCENE.y) continue;
      g.save();
      if (it.flip) {
        g.translate((it.x - SCENE.x) * k, 0);
        g.scale(-1, 1);
        g.drawImage(img[it.key], it.src.x, it.src.y, it.src.w, it.src.h, -(it.foot[0] / PX) * k, (top - SCENE.y) * k, w * k, h * k);
      } else {
        g.drawImage(img[it.key], it.src.x, it.src.y, it.src.w, it.src.h, (left - SCENE.x) * k, (top - SCENE.y) * k, w * k, h * k);
      }
      g.restore();
      drawn += 1;
    }
    return { url: c.toDataURL('image/webp', 0.86), drawn };
  }, { ground, pictures, items, SCENE, OUT_W, OUT_H, PX });
  const buf = Buffer.from(out.url.split(',')[1], 'base64');
  fs.writeFileSync(OUT, buf);
  console.log(`wrote ${path.relative(ROOT, OUT)} (${OUT_W}x${OUT_H}, ${out.drawn} things, ${(buf.length / 1024).toFixed(1)} KB)`);
} finally {
  await browser.close();
}
