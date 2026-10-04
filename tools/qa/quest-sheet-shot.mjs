/* v2.3.3030: screenshot the quest harness -- the quest windows in the owner's
   painted art, drawn by the game's own components (src/quest-harness.html),
   one picture per state: the offer, the choice with and without a pick, the
   confirmation, and the five banners.  Usage:
     node tools/qa/quest-sheet-shot.mjs [outDir] [width=390] [dpr=3]
   (QSTATES=offer,done picks states; a width over 600 is sideways, 390 tall)
   Requires the vite dev server on :5173 (npx vite --port 5173). */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] || '/tmp/quest-sheet';
const width = +(process.argv[3] || 390);
const dpr = +(process.argv[4] || 3);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=swiftshader'],
});
/* ignoreHTTPSErrors: the game's font (Google Fonts, through this sandbox's
   proxy) or the page draws a fallback that is wider than the real one */
const STATES = (process.env.QSTATES || 'offer,choose,chosen,done,banner,compact,auto,accepted,reward').split(',');
const vh = +(process.env.QHEIGHT || (width > 600 ? 390 : 844));
const errs = [];
for (const st of STATES) {
  /* ignoreHTTPSErrors: the game's font (Google Fonts, through this sandbox's
     proxy) or the page draws a fallback that is wider than the real one */
  const page = await browser.newPage({ viewport: { width, height: vh }, deviceScaleFactor: dpr, ignoreHTTPSErrors: true });
  page.on('pageerror', (e) => errs.push(st + ': ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push(st + ': ' + r.status() + ' ' + r.url()); });
  await page.goto(`http://localhost:5173/quest-harness.html?state=${st}`);
  await page.waitForFunction('window.__sheetReady === true', null, { timeout: 60000 });
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  /* the arrival sparkles and burst have played out, and the flights landed */
  await page.waitForTimeout(st === 'done' ? 700 : 2600);
  await page.screenshot({ path: `${out}/${st}.png` });
  if (st === 'choose') {
    const filtered = await page.evaluate(() => [...document.querySelectorAll('[class*="bt-qw"], [class*="bt-qw"] *')]
      .filter((el) => { const cs = getComputedStyle(el); return (cs.filter && cs.filter !== 'none') || (cs.backdropFilter && cs.backdropFilter !== 'none'); })
      .map((el) => String(el.className && el.className.baseVal != null ? el.className.baseVal : el.className)));
    console.log('filtered elements:', filtered.length ? filtered : 'none');
  }
  await page.close();
}
console.log('saved to', out);
if (errs.length) console.log('page errors:', errs);
await browser.close();
