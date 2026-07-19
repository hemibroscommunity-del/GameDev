/* v2.3.1349: screenshot the belt-harness page (the REAL masked-body bake with
   the chain waist paint) per direction.  Usage:
     node tools/qa/belt-harness-shot.mjs [outDir]
   Requires the vite dev server on :5173 (started by the caller). */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] || '/tmp/belt-harness';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 3200, height: 1200 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:5173/belt-harness.html');
await page.waitForFunction('window.__done === true', null, { timeout: 300000 });
for (const d of ['south', 'north', 'east', 'northeast', 'southwest']) {
  const el = await page.$('#board-' + d);
  if (el) {
    await el.screenshot({ path: `${out}/real-${d}.png` });
    console.log('saved', `${out}/real-${d}.png`);
  } else {
    console.log('MISSING board', d);
  }
}
await browser.close();
