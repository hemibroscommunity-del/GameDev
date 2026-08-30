/* ═══ v2.3.2156/2157: THE CONTINUE PLATE, FROM THE OWNER'S OWN ART ═══
 *
 * Owner: "change the continue button on splash page to use these assets
 * instead" — a gold pixel CONTINUE wordmark and a C-with-arrow emblem —
 * and then, seeing the first frameless cut: "Put it on same button frame."
 *
 * So the mark sets into the same framed plate Create Character wears: a
 * blanked copy of btn-create.png (lettering and diamonds erased by per-row
 * median fill of the interior, which keeps the vertical gradient and the
 * inner bevel), with the emblem at 1.15x the letter height beside the
 * wordmark, centred in the frame's interior.  The door's two actions are a
 * matched pair again, and the gold sits on the dark interior where it
 * reads loudest.  Interior box of that frame, measured: x 51..749,
 * y 29..182 at 799x212.
 *
 * Headless Chromium is the compositor, exactly like relabel-login-plate.mjs
 * before it: the sandbox has no PIL/sharp, and a browser canvas is the one
 * pixel machine every dev box here is guaranteed to carry.  The plate is
 * rendered at 2x the frame's pixels so the mark keeps its edges when CSS
 * scales the button.
 *
 *   node tools/ui/compose-continue-plate.mjs <wordmark> <emblem> <blank-frame>
 *
 * Writes public/ui/welcome/title/btn-continue.png and prints the canvas
 * size for the aspect-ratio in game.css (the pair must move together).
 */
import { chromium } from 'playwright-core';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const [wordmarkPath, emblemPath, framePath] = process.argv.slice(2);
if (!wordmarkPath || !emblemPath || !framePath) {
  console.error('usage: compose-continue-plate.mjs <wordmark> <emblem> <blank-frame>');
  process.exit(2);
}

const b64 = async (p) => `data:image/png;base64,${(await readFile(p)).toString('base64')}`;
const wordmark = await b64(wordmarkPath);
const emblem = await b64(emblemPath);
const frame = await b64(framePath);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await (await browser.newContext()).newPage();
const out = await page.evaluate(async ({ wordmark, emblem, frame }) => {
  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const [wm, em, fr] = await Promise.all([load(wordmark), load(emblem), load(frame)]);
  const S = 2;                                   /* 2x for edge crispness */
  const c = document.createElement('canvas');
  c.width = fr.width * S; c.height = fr.height * S;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(fr, 0, 0, c.width, c.height);
  const box = { x: 51 * S, y: 29 * S, w: (749 - 51) * S, h: (182 - 29) * S };
  const pad = 14 * S;
  const availW = box.w - pad * 2, availH = box.h - pad * 2;
  /* the mark: emblem a badge at 1.15x the letter height, gap of a fifth */
  const unitH = 100;
  const emH = unitH * 1.15, emW = em.width * (emH / em.height);
  const wmW = wm.width * (unitH / wm.height);
  const gap = emH / 5;
  const k = Math.min(availW / (emW + gap + wmW), availH / emH);
  const emH2 = emH * k, emW2 = emW * k, wmH2 = unitH * k, wmW2 = wmW * k, gap2 = gap * k;
  /* v2.3.2159 (owner: "align left for continue icon and label"): the mark
     starts at the interior's left padding rather than centring. */
  /* v2.3.2162 (owner: "center just the continue label and leave the
     continue icon where it is (left aligned)"): the two parts split —
     the emblem holds the left padding, the wordmark centres in the
     frame's whole interior on its own.  If a centred label would run
     under the badge, it yields right to the badge's edge plus the gap
     (and still fits: k already sized the full row into availW). */
  const x0 = box.x + pad;
  const cy = box.y + box.h / 2;
  ctx.drawImage(em, x0, cy - emH2 / 2, emW2, emH2);
  const wmX = Math.max(box.x + (box.w - wmW2) / 2, x0 + emW2 + gap2);
  ctx.drawImage(wm, wmX, cy - wmH2 / 2, wmW2, wmH2);
  return { data: c.toDataURL('image/png'), W: fr.width, H: fr.height };
}, { wordmark, emblem, frame });
await browser.close();

const outPath = resolve(REPO, 'public/ui/welcome/title/btn-continue.png');
await writeFile(outPath, Buffer.from(out.data.split(',')[1], 'base64'));
console.log(`wrote ${outPath}  (frame ${out.W}x${out.H}, rendered 2x)  aspect-ratio ${out.W}/${out.H}`);
