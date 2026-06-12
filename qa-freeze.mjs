import { chromium } from 'playwright-core';
const EXE = '/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: EXE, headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--mute-audio'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
await page.addInitScript(`window.BROTOWN_WS_URL = 'ws://127.0.0.1:8787'`);
await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(9000);
await page.locator('input').first().fill('FreezeBot', { timeout: 30000 });
await page.locator('input').first().press('Enter');
await page.waitForTimeout(18000);
const st = () => page.evaluate(() => ({
  status: window._gameState?.current?._realtimeStatus,
  zone: window._gameState?.current?.currentZone,
  crash: localStorage.getItem('bt-crashlog'),
})).catch(() => 'DEAD');
console.log('pre-freeze:', JSON.stringify(await st()));

const cdp = await ctx.newCDPSession(page);
await cdp.send('Page.enable');
await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
console.log('frozen 25s (iOS background simulation)...');
await new Promise(r => setTimeout(r, 25000));
await cdp.send('Page.setWebLifecycleState', { state: 'active' });
// fire visibilitychange like iOS does on resume
await page.evaluate(() => {
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}).catch(() => {});
await page.waitForTimeout(8000);
console.log('post-resume:', JSON.stringify(await st()));
console.log('errors:', errs.length, errs.slice(0, 4));
await browser.close();
