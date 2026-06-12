/* v2.3.774 QA: pixel-level proof of the post-rebuild world.  Forces a real
 * context loss, waits for the epoch rebuild, then SCREENSHOTS and compares
 * canvas brightness before/after.  v2.3.773's tests asserted a healthy
 * context but never looked at the screen -- the iPhone showed tiles black
 * with sprites + FPS overlay alive. */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import zlib from 'node:zlib';

function pngBrightness(buf) {
  // crude PNG decode: use the IDAT raw data only for a relative measure is
  // unreliable -- instead decode via the browser. (kept for reference)
  return null;
}

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
await page.locator('input').first().fill('PixelBot', { timeout: 30000 });
await page.locator('input').first().press('Enter');
await page.waitForTimeout(18000);

/* Measure world-canvas brightness by drawing it into a 2D canvas in-page.
 * webgl canvas has preserveDrawingBuffer=false, so sample via toDataURL
 * right after a forced render: instead, drawImage(canvas) immediately
 * inside a rAF callback -- the buffer is intact within the frame. */
const sample = () => page.evaluate(() => new Promise((res) => {
  requestAnimationFrame(() => {
    try {
      const cv = document.querySelector('canvas.brotown-canvas');
      const c2 = document.createElement('canvas');
      c2.width = 160; c2.height = 90;
      const g = c2.getContext('2d');
      g.drawImage(cv, 0, 0, 160, 90);
      const d = g.getImageData(0, 0, 160, 90).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] + d[i + 1] + d[i + 2] > 45) lit++;
      }
      res({ litPct: +(100 * lit / (160 * 90)).toFixed(1) });
    } catch (e) { res({ err: String(e).slice(0, 120) }); }
  });
}));

const pre = await sample();
console.log('pre-loss lit%:', JSON.stringify(pre));
await page.screenshot({ path: '/tmp/glpix-pre.png' });

await page.evaluate(() => {
  const gl = window._pixiRenderer.app.renderer.gl;
  gl.getExtension('WEBGL_lose_context').loseContext();
});
console.log('context killed; waiting for rebuild + re-bake...');
await page.waitForTimeout(14000);

const post = await sample();
console.log('post-rebuild lit%:', JSON.stringify(post));
await page.screenshot({ path: '/tmp/glpix-post.png' });
const diag = await page.evaluate(() => {
  const r = window._pixiRenderer;
  const tiles = r && r.app && r.app.stage ? (() => {
    let counts = [];
    for (const ch of r.app.stage.children) counts.push(ch.label + ':' + ch.children.length);
    return counts;
  })() : null;
  return {
    glLost: r.app.renderer.gl.isContextLost(),
    crash: JSON.parse(localStorage.getItem('bt-crashlog') || '[]').map(e => e.kind),
    stage: tiles,
  };
});
console.log('diag:', JSON.stringify(diag));
console.log('errors:', errs.length, errs.slice(0, 6));
const ok = pre.litPct > 20 && post.litPct > 20 && diag.crash.includes('gl-rebuild');
console.log(ok ? 'PASS: world visibly renders after rebuild' : 'FAIL: post-rebuild world is dark');
await browser.close();
process.exit(ok ? 0 : 1);
