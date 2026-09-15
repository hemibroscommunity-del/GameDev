/* PNG -> WEBP FOR THE INVENTORY ICONS, WITHOUT PYTHON (v2.3.2519).
 *
 * tools/webp_icons.py does this with numpy+Pillow and is what
 * make-metal-icons.mjs calls.  Neither package is installed in this sandbox
 * (CLAUDE.md: the one image engine present is the pre-installed Chromium), so
 * that step fails and the generated icons stay .png while metalIconPath() asks
 * for .webp -- a 404 on every metal icon in the bag.  This is the Chromium
 * path, so the generator can finish in a session that has no Python imaging.
 *
 * IT IS NOT LOSSLESS AND IT SAYS SO, WITH A NUMBER.  Chromium's canvas encoder
 * has no lossless mode reachable from toDataURL, and a 2D canvas backing store
 * is premultiplied, so partially transparent pixels do not survive a round trip
 * exactly (docs/TRAPS.md section 53, and the header of tools/webp_convert.mjs).
 * That is why the sprite sheets under public/sprites are forbidden from going
 * near it -- the runtime recolour classifies skin, pants and shoes by EXACT
 * RGB.  Inventory icons are the opposite case: nothing samples them, the metal
 * multiply is applied here at generation time rather than at runtime, and they
 * are 256px paintings rather than pixel art.
 *
 * So every file is DECODED BACK and compared against its source before it is
 * kept, and the worst channel difference over the fully opaque pixels is
 * printed.  A file that drifts past --maxdelta is not written.  "Lossy is fine
 * here" is a claim, and this is the claim being checked rather than asserted.
 *
 *   node tools/gear/icons-to-webp.mjs public/icons/items/greaves-copper.png ...
 *   node tools/gear/icons-to-webp.mjs --all      (every *-copper/-iron png)
 */
import { chromium } from 'playwright-core';
import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ICONS = join(REPO, 'public/icons/items');
const args = process.argv.slice(2);
const arg = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const MAXDELTA = +arg('maxdelta', '6');
const KEEP_PNG = args.includes('--keep-png');
let files = args.filter((a) => !a.startsWith('--'));
if (args.includes('--all')) {
  files = readdirSync(ICONS).filter((f) => /-(copper|iron)\.png$/.test(f)).map((f) => join(ICONS, f));
}
if (!files.length) { console.error('usage: icons-to-webp.mjs FILE.png... | --all'); process.exit(2); }

const pinned = process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(pinned) ? { executablePath: pinned } : {});
const page = await browser.newPage();
let ok = 0, bad = 0;
for (const f of files) {
  if (!existsSync(f)) { console.log(`MISSING ${f}`); bad++; continue; }
  const r = await page.evaluate(async (o) => {
    const load = async (u) => {
      const i = new Image();
      await new Promise((res, rej) => { i.onload = res; i.onerror = rej; i.src = u; });
      const c = document.createElement('canvas');
      c.width = i.width; c.height = i.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(i, 0, 0);
      return { c, w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data };
    };
    const A = await load(o.url);
    const webp = A.c.toDataURL('image/webp', 1.0);
    const B = await load(webp);
    if (A.w !== B.w || A.h !== B.h) return { error: `size ${A.w}x${A.h} -> ${B.w}x${B.h}` };
    let worstOpaque = 0, worstAny = 0, opaque = 0;
    for (let i = 0; i < A.d.length; i += 4) {
      const da = Math.abs(A.d[i] - B.d[i]), db = Math.abs(A.d[i + 1] - B.d[i + 1]),
        dc = Math.abs(A.d[i + 2] - B.d[i + 2]), dd = Math.abs(A.d[i + 3] - B.d[i + 3]);
      const m = Math.max(da, db, dc, dd);
      if (m > worstAny) worstAny = m;
      if (A.d[i + 3] === 255) { opaque++; if (m > worstOpaque) worstOpaque = m; }
    }
    return { webp, worstOpaque, worstAny, opaque, w: A.w, h: A.h };
  }, { url: `data:image/png;base64,${readFileSync(f).toString('base64')}` });

  if (r.error) { console.log(`FAILED ${f}: ${r.error}`); bad++; continue; }
  const out = f.replace(/\.png$/, '.webp');
  const line = `${out.replace(REPO + '/', '')}  ${r.w}x${r.h}  worst delta: opaque ${r.worstOpaque}, any ${r.worstAny}`;
  if (r.worstOpaque > MAXDELTA) { console.log(`REJECTED ${line}  (> ${MAXDELTA})`); bad++; continue; }
  writeFileSync(out, Buffer.from(r.webp.split(',')[1], 'base64'));
  if (!KEEP_PNG) { try { unlinkSync(f); } catch (e) { /* the .webp is what ships */ } }
  console.log(`wrote ${line}`);
  ok++;
}
await browser.close();
console.log(`${ok} written, ${bad} rejected/failed (max opaque delta allowed: ${MAXDELTA})`);
process.exitCode = bad ? 1 : 0;
