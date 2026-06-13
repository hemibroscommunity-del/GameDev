/* v2.3.819 QA: camera clamps to map bounds.  Teleport the player to the map
 * corners and centre; assert the camera (S.camera = viewport top-left in
 * world coords) never goes past [0, ZW-W] x [0, ZH-H] -- i.e. the viewport
 * never shows the out-of-bounds void -- and is NOT clamped in open middle. */
import { chromium } from 'playwright-core';
const EXE = '/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: EXE, headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--mute-audio'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
await page.addInitScript(`window.BROTOWN_WS_URL = 'ws://127.0.0.1:8787'`);
await page.goto('http://localhost:4173/?noresume=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(9000);
await page.locator('input').first().fill('CamBot', { timeout: 30000 });
await page.locator('input').first().press('Enter');
await page.waitForTimeout(15000);

const dims = await page.evaluate(() => {
  const S = window._gameState.current;
  const cv = document.querySelector('canvas.brotown-canvas');
  const dpr = window.devicePixelRatio || 1;
  return { zone: S.currentZone, ZW: 48 * 32, ZH: 48 * 32, W: cv.width / dpr, H: cv.height / dpr };
});
console.log('dims:', JSON.stringify(dims));

// Park the player at (wx,wy) for ~2.2s (camera lerp settles), then read camera.
const park = (wx, wy) => page.evaluate(({ wx, wy }) => new Promise((res) => {
  const S = window._gameState.current;
  let n = 0;
  const iv = setInterval(() => {
    S.player.x = wx; S.player.y = wy;          // hold position against any drift
    S.stickX = 0; S.stickY = 0;
    if (++n >= 22) {
      clearInterval(iv);
      res({ camX: +S.camera.x.toFixed(1), camY: +S.camera.y.toFixed(1), zone: S.currentZone });
    }
  }, 100);
}), { wx, wy });

const tl = await park(30, 30);                              // top-left corner
const br = await park(dims.ZW - 30, dims.ZH - 30);          // bottom-right corner
const mid = await park(dims.ZW / 2, dims.ZH / 2);           // open centre
console.log('top-left :', JSON.stringify(tl));
console.log('btm-right:', JSON.stringify(br));
console.log('centre   :', JSON.stringify(mid));

const maxX = dims.ZW - dims.W, maxY = dims.ZH - dims.H;
const near = (a, b) => Math.abs(a - b) <= 2;
const stayedTown = tl.zone === 'town' && br.zone === 'town' && mid.zone === 'town';
const tlOK = near(tl.camX, 0) && near(tl.camY, 0);
const brOK = near(br.camX, maxX) && near(br.camY, maxY);
const midOK = near(mid.camX, dims.ZW / 2 - dims.W / 2) && near(mid.camY, dims.ZH / 2 - dims.H / 2);
// And never out of bounds in any sample:
const inBounds = [tl, br, mid].every(s => s.camX >= -0.5 && s.camX <= maxX + 0.5 && s.camY >= -0.5 && s.camY <= maxY + 0.5);
const pass = stayedTown && tlOK && brOK && midOK && inBounds && errs.length === 0;
console.log('expected: tl~(0,0) br~(' + maxX + ',' + maxY + ') mid~(' + (dims.ZW/2 - dims.W/2) + ',' + (dims.ZH/2 - dims.H/2) + ')');
console.log('errors:', errs.length, errs.slice(0, 4));
console.log(pass ? 'PASS: camera edge-locks at map bounds, centers in the open middle'
                 : 'FAIL  (stayedTown=' + stayedTown + ' tlOK=' + tlOK + ' brOK=' + brOK + ' midOK=' + midOK + ' inBounds=' + inBounds + ')');
await browser.close();
process.exit(pass ? 0 : 1);
