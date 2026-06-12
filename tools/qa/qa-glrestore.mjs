/* lose AND restore the context (the restored-but-black case) -- assert the
 * unconditional escalation still rebuilds on a fresh canvas. */
import { chromium } from 'playwright-core';
const EXE = '/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: EXE, headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--mute-audio'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
await page.addInitScript(`window.BROTOWN_WS_URL = 'ws://127.0.0.1:8787'`);
await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(9000);
await page.locator('input').first().fill('GlRestoreBot', { timeout: 30000 });
await page.locator('input').first().press('Enter');
await page.waitForTimeout(18000);
await page.evaluate(() => {
  const cv = document.querySelector('canvas.brotown-canvas');
  if (cv) cv.__qaTag = 'ORIGINAL';
  const gl = window._pixiRenderer.app.renderer.gl;
  const ext = gl.getExtension('WEBGL_lose_context');
  ext.loseContext();
  setTimeout(() => { try { ext.restoreContext(); } catch (e) {} }, 500);
});
await page.waitForTimeout(2000);
const mid = await page.evaluate(() => ({
  glLost: window._pixiRenderer.app.renderer.gl.isContextLost(),
}));
console.log('after restore (pre-escalation):', JSON.stringify(mid));
await page.waitForTimeout(8000);
const post = await page.evaluate(() => {
  const r = window._pixiRenderer;
  const gl = r && r.app && r.app.renderer && r.app.renderer.gl;
  const cv = document.querySelector('canvas.brotown-canvas');
  return {
    status: window._gameState?.current?._realtimeStatus,
    glLost: gl ? gl.isContextLost() : 'no-gl',
    canvasTag: cv ? (cv.__qaTag || 'untagged') : 'no-canvas',
    crash: JSON.parse(localStorage.getItem('bt-crashlog') || '[]').map(e => e.kind),
  };
});
console.log('post:', JSON.stringify(post));
const ok = mid.glLost === false && post.canvasTag === 'untagged'
  && post.glLost === false && post.status === 'connected'
  && post.crash.includes('gl-rebuild');
console.log('errors:', errs.length, errs.slice(0, 4));
console.log(ok ? 'PASS: restored context still triggers rebuild' : 'FAIL');
await browser.close();
process.exit(ok ? 0 : 1);
