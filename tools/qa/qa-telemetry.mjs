import { chromium } from 'playwright-core';
const EXE = '/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: EXE, headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--mute-audio'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
const page = await ctx.newPage();
await page.addInitScript(`window.BROTOWN_WS_URL = 'ws://127.0.0.1:8787'`);
await page.goto('http://localhost:4173/?noresume=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(9000);
await page.locator('input').first().fill('TelemBot', { timeout: 30000 });
await page.locator('input').first().press('Enter');
await page.waitForTimeout(15000);
await page.evaluate(() => {
  const gl = window._pixiRenderer.app.renderer.gl;
  gl.getExtension('WEBGL_lose_context').loseContext();
});
await page.waitForTimeout(8000); // CONTEXT_LOST -> immediate flush at 1.5s + rebuild events
await browser.close();
const res = await fetch('http://127.0.0.1:8787/api/feedback/crashes?limit=10').then(r => r.json());
const mine = res.reports.filter(r => r.ua.includes('HeadlessChrome') || r.v !== '?');
const hit = res.reports.find(r => r.log.some(e => e.kind === 'CONTEXT_LOST') && r.ua !== 'qa-curl');
console.log('reports on server:', res.count);
console.log('telemetry report:', hit ? JSON.stringify({ v: hit.v, zone: hit.zone, kinds: hit.log.map(e => e.kind) }) : 'NONE');
console.log(hit ? 'PASS: crash telemetry uploaded automatically from a live session' : 'FAIL');
process.exit(hit ? 0 : 1);
