/* v2.3.772 QA: force a REAL WebGL context loss (WEBGL_lose_context.loseContext()
 * without ever calling restoreContext) and assert the crashTrap escalation
 * triggers the epoch rebuild: new canvas element, fresh healthy GL context,
 * socket still connected, no page errors. */
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
await page.locator('input').first().fill('GlLossBot', { timeout: 30000 });
await page.locator('input').first().press('Enter');
await page.waitForTimeout(18000);

const st = (label) => page.evaluate(() => {
  const r = window._pixiRenderer;
  const gl = r && r.app && r.app.renderer && r.app.renderer.gl;
  const cv = document.querySelector('canvas.brotown-canvas');
  return {
    status: window._gameState?.current?._realtimeStatus,
    zone: window._gameState?.current?.currentZone,
    pixiActive: !!window.__pixiActive,
    glLost: gl ? gl.isContextLost() : 'no-gl',
    canvasTag: cv ? (cv.__qaTag || 'untagged') : 'no-canvas',
    crash: JSON.parse(localStorage.getItem('bt-crashlog') || '[]').map(e => e.kind),
  };
}).then(s => { console.log(label, JSON.stringify(s)); return s; });

await page.evaluate(() => {
  const cv = document.querySelector('canvas.brotown-canvas');
  if (cv) cv.__qaTag = 'ORIGINAL';
});
const pre = await st('pre-loss:   ');

// Kill the context for real. Pixi's _contextLossForced is false (we go
// through the raw extension, not pixi.forceContextLoss), and we never call
// restoreContext -- so the browser will NOT bring this context back.
// crashTrap's 2.5s escalation is the only road to recovery.
await page.evaluate(() => {
  const gl = window._pixiRenderer.app.renderer.gl;
  const ext = gl.getExtension('WEBGL_lose_context');
  window.__qaExt = ext; // keep alive, but never restoreContext()
  ext.loseContext();
});
await page.waitForTimeout(800);
const lost = await st('post-loss:  ');
await page.waitForTimeout(9000); // escalation at 2.5s + pixi re-init + first bakes
const post = await st('post-rebuild:');

const ok =
  lost.glLost === true &&
  post.glLost === false &&
  post.canvasTag === 'untagged' &&            // new element replaced the tagged one
  post.pixiActive === true &&
  post.status === 'connected' &&
  post.crash.includes('CONTEXT_LOST') &&
  post.crash.includes('gl-rebuild');
console.log('errors:', errs.length, errs.slice(0, 4));
console.log(ok ? 'PASS: context loss -> epoch rebuild -> healthy renderer' : 'FAIL');
await browser.close();
process.exit(ok ? 0 : 1);
