/* ═══ v2.3.3838: A WINDOWS COMPUTER NEVER BUILDS THE LOOK PALETTE ═══
 *
 * The owner's Windows laptop (Chrome and Firefox) froze at 75% of the loading
 * bar for 5-10 minutes: ANGLE's Direct3D compiler (FXC) took that long over
 * the look palette's program, and its prewarm waits for the compile
 * (docs/specs/look-palette.md "Not on Windows", TRAPS §259).  This box has no
 * Direct3D, so the freeze itself cannot be played here; what can be is that a
 * page on Windows never asks for the program at all.
 *
 *   1. a computer whose browser says Windows (its user agent and Chromium's
 *      userAgentData.platform), the sideways layout: reaches BroTown, the
 *      loading screen gone; `__btLookPalette()` says not wanted, why
 *      'windows', never prewarmed, never linked, no looks and no rows;
 *   2. ...a reload reaches the world the same way, with no page errors;
 *   3. an iPhone: unchanged -- wanted, why 'default', built and on;
 *   4. v2.3.3842: a Mac (Safari, no touch points): not built either, why
 *      'mac', and it reaches BroTown;
 *   5. ...but an iPad asking for the desktop site (it says "Macintosh", with
 *      five touch points) keeps the palette, as an iPhone does.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(H.REPO, 'tools/qa/mp/out');
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `lookwin-${name}.png`) }); } catch (e) { /* a picture only */ } };
const lp = (P) => P.page.evaluate(() => (window.__btLookPalette ? window.__btLookPalette() : null));
const introUp = (P) => P.page.evaluate(() => document.body.classList.contains('bt-intro-up'));

/* the browser's own words about itself, set before the game's first script
   (lookPalette.js decides once, at load) */
function uaInit(ua, platform, mobile, touchPoints) {
  return `(() => {
    const ua = ${JSON.stringify(ua)};
    Object.defineProperty(Navigator.prototype, 'userAgent', { get: () => ua, configurable: true });
    Object.defineProperty(Navigator.prototype, 'maxTouchPoints', { get: () => ${Number(touchPoints) || 0}, configurable: true });
    const uad = { platform: ${JSON.stringify(platform)}, mobile: ${mobile ? 'true' : 'false'}, brands: [], getHighEntropyValues: async () => ({}), toJSON() { return {}; } };
    Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => uad, configurable: true });
  })();`;
}
const WIN_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
/* a Mac's Safari -- and an iPad's, which asks for the desktop site with the same words */
const MAC_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

async function reachWorld(P, label) {
  const t0 = Date.now();
  await H.enterWorld(P);
  const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label }).then(() => true).catch(() => false);
  return { ok, ms: Date.now() - t0 };
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. a Windows computer ── */
  const W = await H.newPlayer(browser, { name: 'Winbro', wsPort, webPort, viewport: { width: 1440, height: 900 }, world: 'wheel', wide: true, init: uaInit(WIN_CHROME, 'Windows', false) });
  const errs = [];
  W.page.on('pageerror', (e) => errs.push(String(e && e.message || e).slice(0, 300)));
  const r1 = await reachWorld(W, 'windows: the world');
  await W.page.waitForTimeout(4000);
  const s1 = await lp(W), up1 = await introUp(W);
  rec.ok('1a Windows: reaches BroTown, the loading screen gone', r1.ok && !up1, { ...r1, up1 });
  rec.ok('1b Windows: the page reads a Windows browser', await W.page.evaluate(() => /Windows/.test(navigator.userAgent)), null);
  rec.ok('1c Windows: the look palette not wanted, why "windows"', !!s1 && s1.wanted === false && s1.why === 'windows', s1);
  rec.ok('1d Windows: its program never built (no prewarm, no link asked), no looks, no rows', !!s1 && !s1.prewarmed && s1.ok == null && s1.looks === 0 && s1.rows === 0, s1);
  await shot(W, '1-windows');

  /* ── 2. ...and after a reload ── */
  await W.page.reload();
  const r2 = await reachWorld(W, 'windows: after a reload');
  await W.page.waitForTimeout(3000);
  const s2 = await lp(W), up2 = await introUp(W);
  rec.ok('2a Windows: a reload reaches the world too, still not built', r2.ok && !up2 && !!s2 && s2.why === 'windows' && !s2.prewarmed, { ...r2, s2 });
  rec.ok('2b Windows: no page errors', errs.length === 0, { errs: errs.slice(0, 8) });
  await W.ctx.close().catch(() => {});

  /* ── 3. an iPhone: unchanged ── */
  const P = await H.newPlayer(browser, { name: 'Phonebro', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, world: 'wheel', init: uaInit(IPHONE, '', true, 5) });
  const perrs = [];
  P.page.on('pageerror', (e) => perrs.push(String(e && e.message || e).slice(0, 300)));
  const r3 = await reachWorld(P, 'iphone: the world');
  await P.page.waitForTimeout(4000);
  const s3 = await lp(P);
  rec.ok('3a iPhone: reaches the world', r3.ok, r3);
  rec.ok('3b iPhone: the look palette wanted, why "default", built and on', !!s3 && s3.wanted === true && s3.why === 'default' && !!s3.prewarmed && s3.ok === true && s3.on === true, s3);
  rec.ok('3c iPhone: no page errors', perrs.length === 0, { errs: perrs.slice(0, 8) });
  await P.ctx.close().catch(() => {});

  /* ── 4. a Mac (v2.3.3842): not built either ── */
  const M = await H.newPlayer(browser, { name: 'Macbro', wsPort, webPort, viewport: { width: 1440, height: 900 }, world: 'wheel', wide: true, init: uaInit(MAC_SAFARI, '', false, 0) });
  const merrs = [];
  M.page.on('pageerror', (e) => merrs.push(String(e && e.message || e).slice(0, 300)));
  const r4 = await reachWorld(M, 'mac: the world');
  await M.page.waitForTimeout(3000);
  const s4 = await lp(M), up4 = await introUp(M);
  rec.ok('4a Mac: reaches BroTown, the loading screen gone', r4.ok && !up4, { ...r4, up4 });
  rec.ok('4b Mac: the look palette not wanted, why "mac", never built', !!s4 && s4.wanted === false && s4.why === 'mac' && !s4.prewarmed && s4.ok == null, s4);
  rec.ok('4c Mac: no page errors', merrs.length === 0, { errs: merrs.slice(0, 8) });
  await shot(M, '4-mac');
  await M.ctx.close().catch(() => {});

  /* ── 5. an iPad asking for the desktop site: keeps the palette ── */
  const T = await H.newPlayer(browser, { name: 'Padbro', wsPort, webPort, viewport: { width: 1024, height: 1366 }, touch: true, world: 'wheel', init: uaInit(MAC_SAFARI, '', true, 5) });
  const terrs = [];
  T.page.on('pageerror', (e) => terrs.push(String(e && e.message || e).slice(0, 300)));
  const r5 = await reachWorld(T, 'ipad: the world');
  await T.page.waitForTimeout(3000);
  const s5 = await lp(T);
  rec.ok('5a iPad (desktop site): reaches the world, the palette wanted, why "default", built and on', r5.ok && !!s5 && s5.wanted === true && s5.why === 'default' && !!s5.prewarmed && s5.on === true, { ...r5, s5 });
  rec.ok('5b iPad: no page errors', terrs.length === 0, { errs: terrs.slice(0, 8) });
  await T.ctx.close().catch(() => {});
}
