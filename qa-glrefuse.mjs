/* v2.3.774: simulate iOS refusing WebGL context creation under GPU
 * pressure: stub getContext(webgl) to return null and kill the live
 * context.  Assert the rebuild lands on the Canvas-renderer fallback,
 * records pixi-canvas-fallback, and keeps retrying -- then un-stub and
 * assert a backoff retry restores a real WebGL renderer. */
import { chromium } from 'playwright-core';
const EXE = '/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: EXE, headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--mute-audio'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
await page.addInitScript(`window.BROTOWN_WS_URL = 'ws://127.0.0.1:8787'`);
await page.goto('http://localhost:4173/?dev=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(9000);
await page.locator('input').first().fill('RefuseBot', { timeout: 30000 });
await page.locator('input').first().press('Enter');
await page.waitForTimeout(18000);

const st = (label) => page.evaluate(() => {
  const r = window._pixiRenderer;
  const ren = r && r.app && r.app.renderer;
  return {
    pixiActive: window.__pixiActive,
    renderer: ren ? ren.name : 'none',
    glLost: ren && ren.gl ? ren.gl.isContextLost() : 'no-gl',
    canvasFallback: !!window.__btCanvasFallback,
    fails: window.__btPixiInitFails || 0,
    status: window._gameState?.current?._realtimeStatus,
    crash: JSON.parse(localStorage.getItem('bt-crashlog') || '[]').map(e => e.kind),
  };
}).then((s) => { console.log(label, JSON.stringify(s)); return s; });

await page.evaluate(() => {
  const orig = HTMLCanvasElement.prototype.getContext;
  window.__qaOrigGetContext = orig;
  HTMLCanvasElement.prototype.getContext = function (type, ...a) {
    if (/webgl/i.test(type)) return null;
    return orig.call(this, type, ...a);
  };
  const gl = window._pixiRenderer.app.renderer.gl;
  gl.getExtension('WEBGL_lose_context').loseContext();
});
await page.waitForTimeout(9000); // rebuild -> canvas fallback -> retries (still refused)
const mid = await st('while refused:');

await page.evaluate(() => {
  HTMLCanvasElement.prototype.getContext = window.__qaOrigGetContext;
});
await page.waitForTimeout(20000); // next backoff retry should land on webgl
const post = await st('post-unstub: ');

const ok = mid.pixiActive === true && mid.renderer === 'canvas'
  && mid.canvasFallback === true && mid.fails >= 1
  && mid.crash.includes('pixi-canvas-fallback')
  && post.renderer !== 'canvas' && post.glLost === false
  && post.canvasFallback === false && post.status === 'connected'
  && post.crash.includes('gl-rebuild-ok');
console.log('errors:', errs.length, errs.slice(0, 4));
console.log(ok ? 'PASS: canvas fallback retries until WebGL returns' : 'FAIL');
await browser.close();
process.exit(ok ? 0 : 1);
