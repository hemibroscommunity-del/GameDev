/* ═══ v2.3.2156: THE CONTINUE PLATE, FROM THE OWNER'S OWN ART ═══
 *
 * Owner: "change the continue button on splash page to use these assets
 * instead" — a gold pixel CONTINUE wordmark and a C-with-arrow emblem,
 * supplied as two PNGs.  This composes them into ONE plate (emblem left,
 * wordmark right, vertically centred) because the login door's buttons are
 * single painted plates by design (background-image + aspect-ratio;
 * mp-keylogin asserts "painted plates, not CSS rectangles").
 *
 * Headless Chromium is the compositor, exactly like relabel-login-plate.mjs
 * before it: the sandbox has no PIL/sharp, and a browser canvas is the one
 * pixel machine every dev box here is guaranteed to carry.
 *
 *   node tools/ui/compose-continue-plate.mjs <wordmark.png> <emblem.png>
 *
 * Writes public/ui/welcome/title/btn-continue.png and prints the canvas
 * size for the aspect-ratio in game.css (the pair must move together).
 */
import { chromium } from 'playwright-core';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const [wordmarkPath, emblemPath] = process.argv.slice(2);
if (!wordmarkPath || !emblemPath) { console.error('usage: compose-continue-plate.mjs <wordmark> <emblem>'); process.exit(2); }

const b64 = async (p) => `data:image/png;base64,${(await readFile(p)).toString('base64')}`;
const wordmark = await b64(wordmarkPath);
const emblem = await b64(emblemPath);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await (await browser.newContext()).newPage();
const out = await page.evaluate(async ({ wordmark, emblem }) => {
  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const [wm, em] = await Promise.all([load(wordmark), load(emblem)]);
  /* The wordmark sets the scale: its glyphs render at 300px tall.  The
     emblem stands 1.2x the letter height — a badge, not a letter — and the
     gap is a fifth of the emblem so the two read as one mark. */
  const WM_H = 300;
  const wmW = Math.round(wm.width * (WM_H / wm.height));
  const EM_H = Math.round(WM_H * 1.2);
  const emW = Math.round(em.width * (EM_H / em.height));
  const GAP = Math.round(EM_H / 5);
  const W = emW + GAP + wmW;
  const H = EM_H;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(em, 0, 0, emW, EM_H);
  ctx.drawImage(wm, emW + GAP, Math.round((H - WM_H) / 2), wmW, WM_H);
  return { data: c.toDataURL('image/png'), W, H };
}, { wordmark, emblem });
await browser.close();

const outPath = resolve(REPO, 'public/ui/welcome/title/btn-continue.png');
await writeFile(outPath, Buffer.from(out.data.split(',')[1], 'base64'));
console.log(`wrote ${outPath}  ${out.W}x${out.H}  (aspect-ratio ${out.W}/${out.H})`);
