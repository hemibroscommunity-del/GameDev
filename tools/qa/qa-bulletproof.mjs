/* v2.3.777 QA: the bulletproof path.  Make the renderer UNRECOVERABLE
 * in-place (kill the GL context, then refuse every new context -- webgl
 * AND 2d -- on the game canvas only), and assert the final line holds:
 * black-screen watchdog strikes -> in-place rebuild fails -> auto-reload
 * with resume flag -> page boots clean (evaluate-installed stub dies with
 * the page) -> auto-rejoin as the same character -> world lit.  No login
 * screen, no user action. */
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
await page.locator('input').first().fill('ProofBot', { timeout: 30000 });
await page.locator('input').first().press('Enter');
await page.waitForTimeout(20000); // in-game + watchdog armed (15s grace)

const st = (label) => page.evaluate(() => new Promise((res) => {
  requestAnimationFrame(() => {
    let litPct = -1;
    try {
      const cv = document.querySelector('canvas.brotown-canvas');
      const c2 = document.createElement('canvas');
      c2.width = 32; c2.height = 18;
      const g = c2.getContext('2d');
      g.drawImage(cv, 0, 0, 32, 18);
      const d = g.getImageData(0, 0, 32, 18).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 30) lit++;
      litPct = Math.round(100 * lit / (32 * 18));
    } catch (e) {}
    res({
      name: window._gameState?.current?.myName || null,
      status: window._gameState?.current?._realtimeStatus,
      atLogin: !!document.querySelector('.bt-name-modal'),
      pixiActive: window.__pixiActive,
      litPct,
      crash: JSON.parse(localStorage.getItem('bt-crashlog') || '[]').map(e => e.kind),
    });
  });
})).then((s) => { console.log(label, JSON.stringify(s)); return s; });

const pre = await st('pre-kill:   ');

/* Unrecoverable kill: every later getContext() on the GAME canvas returns
 * null (the watchdog's own sampler canvas is unaffected).  Installed via
 * evaluate, so the auto-reload wipes the stub -- like iOS pressure easing. */
await page.evaluate(() => {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...a) {
    if (this.className && this.className.indexOf('brotown-canvas') !== -1) return null;
    return orig.call(this, type, ...a);
  };
  const gl = window._pixiRenderer.app.renderer.gl;
  gl.getExtension('WEBGL_lose_context').loseContext();
});
console.log('killed; waiting for watchdog strikes -> auto-reload -> auto-rejoin...');
await page.waitForTimeout(45000);

const post = await st('post-heal:  ');
const ok = pre.litPct > 20 && pre.name === 'ProofBot'
  && post.name === 'ProofBot'            // same character, no login screen
  && post.atLogin === false
  && post.status === 'connected'
  && post.litPct > 20                    // world visibly rendering again
  && post.crash.includes('watchdog-dark')
  && post.crash.includes('auto-reload')
  && post.crash.includes('auto-rejoin');
console.log('errors:', errs.length, errs.slice(0, 4));
console.log(ok ? 'PASS: unrecoverable death -> auto-reload -> same character back in a lit world'
              : 'FAIL');
await browser.close();
process.exit(ok ? 0 : 1);
