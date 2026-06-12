import { chromium } from 'playwright-core';

const EXE = '/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
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

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);

await page.screenshot({ path: '/tmp/qa-login.png' });
const bodyText = await page.evaluate(() => document.body.innerText.replace(/\n+/g, ' | ').slice(0, 400));
log('flow', 'bodyText: ' + bodyText);
// login: fill the name input if present, then press PLAY
try {
  const input = page.locator('input').first();
  await input.fill('QA Bot');
  await input.press('Enter');           // name field submits on Enter -> joinTown()
  log('flow', 'submitted name (Enter)');
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
console.log(JSON.stringify({ joined, heap, crashlog, events }, null, 1));
await browser.close();
