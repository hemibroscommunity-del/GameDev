/* v2.3.3018: screenshot the controls harness -- every touch button in every
   state, drawn by the game's own skin (src/ui/panels/controlSkin.jsx), on a
   stone ground and a grass one.  Usage:
     node tools/qa/controls-sheet-shot.mjs [outDir]
   Requires the vite dev server on :5173 (npx vite --port 5173). */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] || '/tmp/controls-sheet';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 700, height: 1500 }, deviceScaleFactor: 2 });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:5173/controls-harness.html');
await page.waitForFunction('window.__sheetReady === true', null, { timeout: 60000 });
/* every picture decoded before the shot */
await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 30000 });
await page.waitForTimeout(300);
const sheets = await page.$$('.sheet');
for (let i = 0; i < sheets.length; i++) {
  const path = `${out}/sheet-${i ? 'grass' : 'stone'}.png`;
  await sheets[i].screenshot({ path });
  console.log('saved', path);
}
/* the law this skin is built round: no CSS filter anywhere in it */
const filtered = await page.evaluate(() => [...document.querySelectorAll('.bt-skin, .bt-skin *')]
  .filter((el) => { const cs = getComputedStyle(el); return (cs.filter && cs.filter !== 'none') || (cs.backdropFilter && cs.backdropFilter !== 'none'); })
  .map((el) => el.className && el.className.baseVal != null ? el.className.baseVal : el.className));
console.log('filtered elements:', filtered.length ? filtered : 'none');
if (errs.length) console.log('page errors:', errs);
await browser.close();
