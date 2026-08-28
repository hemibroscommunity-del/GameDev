import { chromium } from 'playwright-core';
import { legacyLogin } from './legacy-login.mjs';
import { existsSync } from 'node:fs';

// v2.3.1105: browser resolution — QA_CHROME env > the session-side /tmp
// shell (when present) > undefined, which lets playwright-core pick its
// managed browser (the CI path after `npx playwright install`).
const SHELL = '/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
const EXE = process.env.QA_CHROME || (existsSync(SHELL) ? SHELL : undefined);
const URL = 'http://localhost:4173/';
const events = [];
const log = (kind, msg) => { events.push({ t: Date.now(), kind, msg: String(msg).slice(0, 300) }); };

const browser = await chromium.launch({
  executablePath: EXE, headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--mute-audio', '--ignore-certificate-errors'],
});
const page = await browser.newPage({ viewport: { width: 844, height: 390 } }); // iPhone-ish landscape
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log('console.' + m.type(), m.text()); });
page.on('pageerror', (e) => log('PAGEERROR', e.message));
page.on('requestfailed', (r) => log('requestfailed', r.url().slice(0, 120) + ' :: ' + (r.failure()?.errorText || '')));

// v2.3.1105: point the client at a local worker when QA_WS_URL is set
// (CI runs `wrangler dev` on :8787) — same addInitScript pattern as the
// other harnesses.  Unset -> unchanged default (production worker).
if (process.env.QA_WS_URL) {
  await page.addInitScript(`window.BROTOWN_WS_URL = ${JSON.stringify(process.env.QA_WS_URL)};`);
}

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);

await page.screenshot({ path: '/tmp/qa-login.png' });
const bodyText = await page.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 400));
log('flow', 'bodyText: ' + bodyText);
/* v2.3.1964: the splash has no name box — it has a login door.
   legacyLogin takes the same route a player takes (see
   tools/qa/legacy-login.mjs for what broke and when). */
try {
  await legacyLogin(page, 'QA Bot');
  log('flow', 'entered world through the login door');
} catch (e) { log('flow', 'login flow issue: ' + e.message); }

// wait for the join (player state appears)
let joined = false;
for (let i = 0; i < 60; i++) {
  joined = await page.evaluate(() => !!(window._gameState && window._gameState.current && window._gameState.current.player && window._gameState.current.player.x != null)).catch(() => false);
  if (joined) break;
  await page.waitForTimeout(1000);
}
log('flow', 'joined=' + joined);

const heap = [];
if (joined) {
  const canvas = page.locator('canvas').first();
  const keys = ['d', 'w', 'a', 's', 'd', 's', 'w', 'a'];
  for (let round = 0; round < 16; round++) {
    const k = keys[round % keys.length];
    await page.keyboard.down(k);
    await page.waitForTimeout(2500);
    await page.keyboard.up(k);
    try { await canvas.click({ position: { x: 500, y: 200 }, timeout: 1000 }); } catch (e) {}
    const h = await page.evaluate(() => ({
      heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
      zone: window._gameState?.current?.currentZone,
      others: Object.keys(window._gameState?.current?.others || {}).length,
      monsters: (window._gameState?.current?.monsters || []).length,
    })).catch(() => null);
    heap.push(h);
    await page.waitForTimeout(1500);
  }
}
const crashlog = await page.evaluate(() => localStorage.getItem('bt-crashlog')).catch(() => null);
const pageErrors = events.filter((e) => e.kind === 'PAGEERROR').length;
console.log(JSON.stringify({ joined, pageErrors, heap, crashlog, events }, null, 1));
await browser.close();
// v2.3.1105: real exit code so CI (and run-all.mjs fail-fast, which keys
// off exit status) can gate on this.  Fail on: never joined, any
// uncaught page error (the v2.3.756 incident class), or a crash log.
// console.error / requestfailed stay informational — too flaky to gate.
process.exit(!joined || pageErrors > 0 || crashlog ? 1 : 0);
