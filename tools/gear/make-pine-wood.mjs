/* Repaint the bow, staff and shield art as PINE (v2.3.1763; shield v2.3.1774).
 *
 *   node tools/gear/make-pine-wood.mjs
 *
 * Owner: "I also want the first wood tier for staffs and bows to be pine.  Can
 * you recolor the bow and staff lighter to look like pine?"
 *
 * This is NOT the material-tint pipeline, and it cannot be: a Pixi tint
 * MULTIPLIES, so it can only darken, and the ask is for LIGHTER wood.  The art
 * itself has to change — so it changes here, once, reproducibly, rather than by
 * hand in an image editor.
 *
 * The sources live in tools/gear/src-art (outside public/, so they do not ship)
 * precisely so this is re-runnable: reading the SHIPPED file and writing back
 * over it would compound the curve every run, and nobody would notice until the
 * bow was bone white.
 *
 * The transform, on wood pixels only:
 *   - lift toward white with a screen curve (this is the "lighter"),
 *   - pull the hue toward pine's pale yellow-tan by lifting green a little
 *     harder than red and blue,
 *   - leave the near-black keyline alone, or the art loses its outline and
 *     starts to look like a sticker.
 * The bowstring and any metal fittings are near-neutral and very light, so the
 * saturation gate below leaves them where they are.
 */
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'tools/gear/src-art');
const PUB = path.join(ROOT, 'public');

/* src (under tools/gear/src-art) -> destination (under public) */
const FILES = [
  ['bows/Bow2.webp', 'sprites/weapons/bows/Bow2.png'],
  ['bows/bow-south.webp', 'sprites/weapons/bows/bow-south.png'],
  ['bows/bow-southwest.webp', 'sprites/weapons/bows/bow-southwest.png'],
  ['bows/bow-east.webp', 'sprites/weapons/bows/bow-east.png'],
  ['bows/bow-northeast.webp', 'sprites/weapons/bows/bow-northeast.png'],
  ['bows/bow-north.webp', 'sprites/weapons/bows/bow-north.png'],
  ['staffs/Wizard Staff2.webp', 'sprites/weapons/staffs/Wizard Staff2.png'],
  ['icons/bow.webp', 'icons/items/bow.png'],
  ['icons/staff.webp', 'icons/items/staff.png'],
  /* v2.3.1774 (owner: "change bro's shield to pine shield and see if you can
     recolor it like you did for the staff and bow").  Same curve, same
     reasoning — the shield's face is wood and the ask is for LIGHTER wood,
     which a multiply tint cannot do.  Its steel rim and boss are near-neutral
     and light, so the saturation gate leaves them as metal. */
  ['icons/shield.webp', 'icons/items/shield.png'],
  ['shields/wood-shield-front.webp', 'sprites/shields/wood-shield-front.png'],
  ['shields/wood-shield-3q.webp', 'sprites/shields/wood-shield-3q.png'],
  ['shields/wood-shield-side.webp', 'sprites/shields/wood-shield-side.png'],
  /* v2.3.1825 (owner: "you need to change the bow attack art (each
     direction) to match the pine bow").  These are the bow-only layer of the
     five bowshot poses — the pose sheets are authored with the weapon
     separated out precisely so it can be recoloured without touching the
     archer.  They were never in this list, so the held bow went pine at
     v2.3.1763 and the drawn bow stayed brown for two months.
     Their sources are the ORIGINAL brown PNGs, copied into src-art
     unmodified: the shipped file was pristine because nothing had ever
     processed it. */
  ['player/bow-east-weapon.png', 'sprites/player/bow-east-weapon.png'],
  ['player/bow-north-weapon.png', 'sprites/player/bow-north-weapon.png'],
  ['player/bow-northwest-weapon.png', 'sprites/player/bow-northwest-weapon.png'],
  ['player/bow-south-weapon.png', 'sprites/player/bow-south-weapon.png'],
  ['player/bow-southwest-weapon.png', 'sprites/player/bow-southwest-weapon.png'],
];

const PAGE = `<!doctype html><meta charset="utf-8"><body><script>
window.__pine = (src) => new Promise((res) => {
  const img = new Image();
  img.onerror = () => res(null);
  img.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    const d = c.getImageData(0, 0, cv.width, cv.height); const p = d.data;
    /* ═══ v2.3.1825: THE CURVE, AND WHY IT IS NOT A SINGLE SCREEN ═══
       Owner: "The pine bow looks like the black outline was keyed out during
       recoloring to make it pine.  Add the outline back in."

       Measured before changing anything.  The v2.3.1763 curve was one screen
       step, up = c + (255 - c) * 0.42, which lifts the DARK end by ~92 and
       the light end by ~31 — it crushes the shadows.  On the icon art, whose
       drawing is carried by a dark brown ink band around L 20-45 rather than
       by a pure black keyline, that band came out at L 120-140: the same
       brightness as the wood beside it, so the linework vanished.  (The
       sprite bows kept theirs, because their outline really is near-black
       and was already inside the old guard.  The bow ICON's edge mean went
       85.9 -> 127.9 — that is the "keyed out" the owner is seeing.)

       No single tone curve can both make the wood pine-pale AND keep the ink
       dark if it lifts proportionally.  A REPEATED SCREEN can:
           out = 255 * (1 - (1 - x/255)^p)
       For small x this is almost exactly a linear gain of p, so shadow
       CONTRAST survives; it approaches 255 smoothly, so highlights roll off
       instead of clipping.  p = 2.869 is chosen so the wood midtone lands on
       the same value the approved pine art already has (66 -> 147), which is
       what keeps this a fix to the outline and not a re-colour of a colour
       the owner already signed off.

       The near-black guard below is kept but is no longer load-bearing: this
       curve maps 0 to 0 on its own.  It still spares true black from the
       WARM multiply. */
    const P_SCREEN = 2.869;
    const WARM = [1.00, 1.03, 0.90];   /* pine reads yellow-tan, not pink */
    const curve = new Uint8Array(256);
    for (let v = 0; v < 256; v++) {
      curve[v] = Math.round(255 * (1 - Math.pow(1 - v / 255, P_SCREEN)));
    }
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] < 8) continue;
      const r = p[i], g = p[i + 1], b = p[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      /* keyline: near-black and near-neutral -> the outline, leave it */
      if (mx < 60 && mx - mn < 24) continue;
      const lift = (c0, k) => Math.max(0, Math.min(255, Math.round(curve[c0] * k)));
      p[i] = lift(r, WARM[0]);
      p[i + 1] = lift(g, WARM[1]);
      p[i + 2] = lift(b, WARM[2]);
    }
    c.putImageData(d, 0, 0);
    res({ w: cv.width, h: cv.height, png: cv.toDataURL('image/png') });
  };
  img.src = src;
});
</script></body>`;

const TYPES = { '.html': 'text/html', '.webp': 'image/webp', '.png': 'image/png' };
const srv = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/__pine.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  fs.readFile(path.join(SRC, url), (e, b) => {
    if (e) { res.writeHead(404); return res.end('no'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(url)] || 'application/octet-stream' });
    res.end(b);
  });
});
await new Promise((r) => srv.listen(4272, r));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4272/__pine.html');

let wrote = 0;
for (const [src, dest] of FILES) {
  const got = await page.evaluate((s) => window.__pine(s), '/' + src);
  if (!got) { console.log(`  MISSING SOURCE  ${src}`); continue; }
  const out = path.join(PUB, dest);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(got.png.split(',')[1], 'base64'));
  console.log(`  wrote ${dest}  (${got.w}x${got.h})`);
  wrote++;
}
console.log(`${wrote} file(s) written from tools/gear/src-art`);
await browser.close();
srv.close();
