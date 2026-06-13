/* v2.3.816 QA: floating joystick model.  In a touch/mobile context, assert:
 *  - the left/right zones render (data-joyzone L/R) and cover their half;
 *  - the joystick discs start HIDDEN (opacity 0);
 *  - a touchstart anywhere in a zone spawns that disc centered under the
 *    finger at ~25% opacity; touchend hides it again.
 * Dispatches real TouchEvents in-page (CDP/touchscreen timing is too coarse
 * to observe the mid-gesture opacity). */
import { chromium } from 'playwright-core';
const EXE = '/tmp/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: EXE, headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--mute-audio'] });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
});
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
await page.addInitScript(`window.BROTOWN_WS_URL = 'ws://127.0.0.1:8787'`);
await page.goto('http://localhost:4173/?noresume=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(9000);
await page.locator('input').first().fill('JoyBot', { timeout: 30000 });
await page.locator('input').first().press('Enter');
await page.waitForTimeout(15000);

// Fire a real touchstart at (px,py) on the element under that point, read the
// disc state, then touchend.  Returns the disc's opacity + center offset.
const probe = (zone, px, py) => page.evaluate(({ zone, px, py }) => {
  const zoneEl = document.querySelector(`[data-joyzone="${zone}"]`);
  if (!zoneEl) return { err: 'no zone ' + zone };
  const baseSel = zone === 'L' ? '.bt-joystick-base' : '.bt-rjoy-base';
  const base = document.querySelector(baseSel);
  if (!base) return { err: 'no base ' + baseSel };
  // Read the INLINE opacity (not computed) -- the 0.12s fade transition makes
  // getComputedStyle return the mid-animation value right after the set.
  const cs = () => ({ opacity: base.style.opacity || '0' });
  const idle = cs().opacity;
  const mk = (type) => {
    const t = new Touch({ identifier: 1, target: zoneEl, clientX: px, clientY: py, pageX: px, pageY: py });
    return new TouchEvent(type, { bubbles: true, cancelable: true, changedTouches: [t], targetTouches: type === 'touchend' ? [] : [t], touches: type === 'touchend' ? [] : [t] });
  };
  zoneEl.dispatchEvent(mk('touchstart'));
  const r = base.getBoundingClientRect();
  const active = cs().opacity;
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  window.dispatchEvent(mk('touchend'));
  const after = cs().opacity;
  return { idle: +idle, active: +active, after: +after, dcx: Math.round(cx - px), dcy: Math.round(cy - py),
           zoneW: Math.round(zoneEl.getBoundingClientRect().width), vw: window.innerWidth };
}, { zone, px, py });

const L = await probe('L', 80, 500);
const R = await probe('R', 320, 500);
console.log('LEFT :', JSON.stringify(L));
console.log('RIGHT:', JSON.stringify(R));

const ok = (s) => s && s.idle === 0 && Math.abs(s.active - 0.25) < 0.001 && s.after === 0
  && Math.abs(s.dcx) <= 2 && Math.abs(s.dcy) <= 2 && Math.abs(s.zoneW - s.vw / 2) <= 1;
const pass = ok(L) && ok(R) && errs.length === 0;
console.log('errors:', errs.length, errs.slice(0, 4));
console.log(pass ? 'PASS: floating joysticks hidden->spawn-at-touch(25%)->hidden, half-width zones'
                 : 'FAIL');
await browser.close();
process.exit(pass ? 0 : 1);
