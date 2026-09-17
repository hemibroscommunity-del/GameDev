/* PUBLISH SCENARIO SCREENSHOTS SO A PR CAN ACTUALLY SHOW THEM (v2.3.2603).
 *
 * `tools/qa/mp/out/` is gitignored, so a PR body linking
 * raw.githubusercontent.com/.../tools/qa/mp/out/<name>.png serves a 404 — the
 * reviewer sees a broken image and no error anywhere says so. (PR #663 carried
 * twelve of them.)  This copies the named shots into `docs/shots/`, which IS
 * committed, converting them to WebP on the way: the full-frame PNGs run
 * 1.5-2.0MB each and a dozen of those does not belong in the history.
 *
 * The conversion runs through Chromium's own canvas because the sandbox has no
 * cwebp, no ImageMagick and no PIL — the same trick measure-ref.mjs uses to
 * read a PNG's pixels.
 *
 *   node tools/qa/mp/publish-shots.mjs <name> [<name> ...]
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SRC = `${REPO}/tools/qa/mp/out`;
const DST = `${REPO}/docs/shots`;
const names = process.argv.slice(2);
if (!names.length) { console.error('usage: publish-shots.mjs <name> [<name> ...]'); process.exit(2); }
mkdirSync(DST, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
for (const n of names) {
  const png = readFileSync(`${SRC}/${n}.png`);
  const out = await page.evaluate(async (src) => {
    const img = new Image();
    await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = src; });
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    cv.getContext('2d').drawImage(img, 0, 0);
    return { w: img.width, h: img.height, data: cv.toDataURL('image/webp', 0.88) };
  }, `data:image/png;base64,${png.toString('base64')}`);
  const buf = Buffer.from(out.data.split(',')[1], 'base64');
  writeFileSync(`${DST}/${n}.webp`, buf);
  console.log(`${n}  ${out.w}x${out.h}  ${(png.length / 1024 / 1024).toFixed(2)}MB png -> ${(buf.length / 1024).toFixed(0)}KB webp`);
}
await browser.close();
console.log(`\nwrote ${names.length} file(s) to docs/shots/`);
