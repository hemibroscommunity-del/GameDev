/* ═══ THE OWNER'S BLACK SCREEN, AND THE WATCHDOG THAT COULD NOT SEE IT (v2.3.3017) ═══
 *
 * Owner, 2026-10-04: "I was fighting fire goblins and my screen went black",
 * then a screenshot from the iPhone: the world gone to the canvas's own navy
 * (CANVAS_BG 0x0d0b18; the screenshot read 12/11/23) with only the sword in
 * the bro's hand drawn, the HUD alive, the minimap gone -- and nothing in the
 * crash feed.  An iOS graphics reset leaves exactly that: what was loaded
 * from a file is drawn again, what the game drew itself on the GPU (the
 * body, the ground, the minimap) comes back blank.  Chromium restores all of
 * it (WEBGL_lose_context here gave the whole world back), so the screen is
 * made directly: the stage hidden (window.__btBlankStage), the canvas showing
 * nothing but its own colour.
 *
 * The black-screen watchdog (BroTown.jsx) is the game's last line: dark 10 s
 * -> rebuild, 20 s -> reload.  It counted a pixel lit when its channels
 * summed past 30, and the navy's sum is 48 -- so that screen read 100% lit,
 * and nothing ever struck.  On a phone-sized page against a real worker:
 *   1. before, the world is drawn and reads lit;
 *   2. the screen made as on the owner's phone reads dark to the watchdog's
 *      rule now (it read 100% lit by the old one);
 *   3. within its two strikes the watchdog asks for a rebuild, and says so in
 *      the crash log;
 *   4. behind a loading veil it does not judge (the canvas's colour is meant
 *      to show there while the next zone is laid);
 *   5. the rebuild brings the world back; no page errors.
 * Pictures: tools/qa/mp/out/glrestore-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

/* the share of the world area (between the top bar and the controls) that is
   not the canvas's own navy, from a screenshot */
async function worldShare(P, OUT, name) {
  const buf = await P.page.screenshot({ type: 'png' });
  if (OUT) await P.page.screenshot({ path: join(OUT, `glrestore-${name}.png`) }).catch(() => {});
  const img = H.decodePng(buf);
  const { width, height } = img;
  let n = 0, other = 0;
  for (let y = Math.round(height * 0.16); y < Math.round(height * 0.45); y += 3) {
    for (let x = 0; x < width; x += 3) {
      const [r, g, b] = img.at(x, y);
      n++;
      if (Math.abs(r - 13) + Math.abs(g - 11) + Math.abs(b - 24) > 24) other++;
    }
  }
  return +(100 * other / n).toFixed(1);
}

/* the watchdog's own sample, where it takes it (an animation frame), by its
   old rule and by the game's rule now (window.__btLitPx) */
const watchdogLit = (P) => P.page.evaluate(() => new Promise((res) => requestAnimationFrame(() => {
  try {
    const cv = document.querySelector('canvas');
    const c2 = document.createElement('canvas'); c2.width = 32; c2.height = 18;
    const g2 = c2.getContext('2d'); g2.drawImage(cv, 0, 0, 32, 18);
    const d = g2.getImageData(0, 0, 32, 18).data;
    let old = 0, now = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] + d[i + 1] + d[i + 2] > 30) old++;
      if (window.__btLitPx && window.__btLitPx(d[i], d[i + 1], d[i + 2])) now++;
    }
    res({ old: Math.round(100 * old / 576), now: window.__btLitPx ? Math.round(100 * now / 576) : null });
  } catch (e) { res({ err: String(e && e.message || e) }); }
})));

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'Resetbro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    await P.page.waitForTimeout(5000);

    /* 1 */
    const before = await worldShare(P, OUT, 'before');
    const litBefore = await watchdogLit(P);
    rec.ok(`before: the world is drawn (${before}% of it not the canvas's navy) and reads lit to the watchdog (${litBefore.now}%)`,
      before > 30 && litBefore.now >= 1, { before, litBefore });

    /* 2: the owner's screen -- rebuilds counted, not done */
    await P.page.evaluate(() => {
      window.__btRebuilds = []; window.__btRealRebuild = window._rebuildRenderer;
      window._rebuildRenderer = (why) => { window.__btRebuilds.push(String(why)); };
      try { localStorage.removeItem('bt-crashlog'); } catch (e) { /* ignore */ }
    });
    const hook = await P.page.evaluate(() => { if (!window.__btBlankStage) return false; window.__btBlankStage(true); return true; });
    await P.page.waitForTimeout(800);
    const blank = await worldShare(P, OUT, 'owner-screen');
    const litBlank = await watchdogLit(P);
    rec.ok(`the screen as on the owner's phone (the canvas's navy, ${blank}% else) reads dark to the watchdog now: ${litBlank.now}% lit (by the old rule ${litBlank.old}%, so it never struck)`,
      hook && blank < 3 && litBlank.now != null && litBlank.now < 1 && litBlank.old >= 90, { hook, blank, litBlank });

    /* 3: two strikes, 5 s apart, then a rebuild */
    const asked = await H.waitFor(P, () => (window.__btRebuilds || []).slice(), (a) => a.length >= 1, { timeout: 30000, label: 'watchdog rebuild' }).catch(() => []);
    const log = await P.page.evaluate(() => { try { return JSON.parse(localStorage.getItem('bt-crashlog') || '[]'); } catch (e) { return []; } });
    const strikes = log.filter((e) => e.kind === 'watchdog-dark');
    rec.ok(`...and within its two strikes the watchdog asks for a rebuild ("${asked[0] || 'none'}"), the strikes in the crash log (${strikes.length})`,
      asked.length >= 1 && /watchdog/.test(asked[0]) && strikes.length >= 2, { asked, kinds: log.map((e) => e.kind) });

    /* 4: behind a veil it does not judge */
    await P.page.evaluate(() => {
      window.__btRebuilds = [];
      const S = window._gameState.current; S.__wdDark = 0;
      const v = document.createElement('div'); v.className = 'bt-zone-loading'; v.id = 'qa-veil'; document.body.appendChild(v);
    });
    await P.page.waitForTimeout(13000);
    const underVeil = await P.page.evaluate(() => ({ n: (window.__btRebuilds || []).length, dark: window._gameState.current.__wdDark || 0 }));
    rec.ok(`...but behind a loading veil it does not judge, the canvas's colour being meant to show there (${underVeil.n} rebuilds, ${underVeil.dark} strikes in 13 s)`,
      underVeil.n === 0 && underVeil.dark === 0, underVeil);

    /* 5: the world back */
    await P.page.evaluate(() => {
      const v = document.getElementById('qa-veil'); if (v) v.remove();
      window.__btBlankStage(false);
      window._rebuildRenderer = window.__btRealRebuild;
      window._rebuildRenderer('qa: glrestore');
    });
    await P.page.waitForTimeout(8000);
    const back = await worldShare(P, OUT, 'after-rebuild');
    rec.ok(`...and the rebuild brings the world back (${back}% not navy)`, back > before * 0.6, { back, before });
    const errors = P.logs.filter((l) => /pageerror/.test(l));
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 4));
  } finally {
    await P.ctx.close().catch(() => {});
  }
}
