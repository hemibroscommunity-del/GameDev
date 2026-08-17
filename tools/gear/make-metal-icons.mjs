/* Generate the per-metal inventory icons (v2.3.1760).
 *
 *   node tools/gear/make-metal-icons.mjs
 *
 * The WORLD costs nothing per metal — a sprite tint is a multiply inside the
 * batcher (src/rendering/traits/materialTints.js).  Icons are the one place
 * that does not hold: they are <img> tags in React, and a CSS filter cannot
 * express a per-channel multiply, so each metal needs a real file.
 *
 * This script IS that step, so it is one command rather than something someone
 * did by hand in an image editor and cannot reproduce.  It reads the metals
 * straight out of materialTints.js — the same table the renderer uses — and
 * applies the SAME multiply, which is what keeps the icon in the bag and the
 * figure on screen the same metal.  Add a row to MATERIALS, run this, done.
 *
 * Rendering happens in the headless Chromium the QA harness already uses,
 * because there is no image library in this sandbox and Chromium's canvas is
 * the same one the game recolours with.
 */
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PUB = path.join(ROOT, 'public');

/* The pieces that come in metals, and the icon each borrows from.  A weapon
 * whose art is not near-neutral must NOT be listed here — the tint would fight
 * the art's own colour (see the note in materialTints.js). */
const SOURCES = [
  { key: 'chest-plate', src: 'icons/items/chest-plate.webp' },
  { key: 'greaves', src: 'icons/items/greaves.webp' },
  { key: 'great-sword', src: 'icons/items/great-sword.webp' },
  { key: 'sword', src: 'icons/items/sword.webp' },
];

async function materials() {
  /* Read the table without importing the module: it pulls in pixi-adjacent
     browser globals through its neighbours, and this script runs in node. */
  const srcPath = path.join(ROOT, 'src/rendering/traits/materialTints.js');
  const text = fs.readFileSync(srcPath, 'utf8');
  const out = {};
  const body = text.slice(text.indexOf('export const MATERIALS'));
  const re = /(\w+):\s*\{\s*id:\s*'([^']+)'[^}]*rgb:\s*\[([^\]]+)\](?:[^}]*level:\s*([\d.]+))?/g;
  let m;
  while ((m = re.exec(body))) {
    const rgb = m[3].split(',').map((n) => Number(n.trim()));
    const level = m[4] ? Number(m[4]) : 1;
    const mx = Math.max(1, ...rgb);
    const k = (255 / mx) * level;
    out[m[2]] = rgb.map((c) => Math.min(255, Math.round(c * k)));
  }
  return out;
}

const PAGE = `<!doctype html><meta charset="utf-8"><body><script>
window.__tint = (src, tint) => new Promise((res) => {
  const img = new Image();
  img.onerror = () => res(null);
  img.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    const d = c.getImageData(0, 0, cv.width, cv.height); const p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] === 0) continue;
      p[i] = Math.round(p[i] * tint[0] / 255);
      p[i + 1] = Math.round(p[i + 1] * tint[1] / 255);
      p[i + 2] = Math.round(p[i + 2] * tint[2] / 255);
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
  if (url === '/__gen.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  fs.readFile(path.join(PUB, url), (e, b) => {
    if (e) { res.writeHead(404); return res.end('no'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(url)] || 'application/octet-stream' });
    res.end(b);
  });
});
await new Promise((r) => srv.listen(4271, r));

const MATS = await materials();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4271/__gen.html');

let wrote = 0, skipped = 0;
for (const [mat, tint] of Object.entries(MATS)) {
  /* 'steel' is the art as drawn — a white multiply is a no-op, and shipping a
     byte-identical copy under a second name is how two files drift apart. */
  if (tint[0] === 255 && tint[1] === 255 && tint[2] === 255) { skipped++; continue; }
  for (const s of SOURCES) {
    const got = await page.evaluate(([src, t]) => window.__tint(src, t), ['/' + s.src, tint]);
    if (!got) { console.log(`  MISSING SOURCE  ${s.src}`); continue; }
    const out = path.join(PUB, 'icons/items', `${s.key}-${mat}.png`);
    fs.writeFileSync(out, Buffer.from(got.png.split(',')[1], 'base64'));
    console.log(`  wrote ${path.relative(PUB, out)}  (${got.w}x${got.h}, tint ${tint.join(',')})`);
    wrote++;
  }
}
console.log(`${wrote} icon(s) written, ${skipped} native metal(s) skipped`);
await browser.close();
srv.close();
