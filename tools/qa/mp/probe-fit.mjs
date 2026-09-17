/* Does the explainer window FIT, at every size, for every stat that has a
   scene?  Measures the window's own box and its action row against the
   viewport.   node tools/qa/mp/probe-fit.mjs <w> <h> */
import * as H from './harness.mjs';
import { chromium } from 'playwright';
const W = +(process.argv[2] || 360), HT = +(process.argv[3] || 360);
const WS = await H.freePort(), WEB = await H.freePort();
const worker = await H.startWorker(WS); const web = await H.serveDist(WEB);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
try {
  const P = await H.newPlayer(browser, { name: 'Fit', wsPort: WS, webPort: WEB,
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P); await P.page.waitForTimeout(2400);
  const myId = await H.readState(P, (S) => S.myId);
  await fetch(`http://127.0.0.1:${WS}/api/admin/dev/kit`, { method: 'POST',
    headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: myId, what: 'levels' }) }).catch(() => null);
  await P.page.waitForTimeout(1500);
  await P.page.setViewportSize({ width: W, height: HT });
  await P.page.waitForTimeout(900);
  await P.page.evaluate(() => window.__broDashPanelBus && window.__broDashPanelBus.open('hero'));
  await P.page.waitForTimeout(900);
  await P.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]')
    .first().click({ timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(700);
  for (const [lane, keys] of [['bow', ['range', 'dmg', 'aspd', 'luck']], ['shared', ['stam', 'move', 'eres', 'hp', 'def']]]) {
    await H.openPointCols(P, [lane]);
    for (const k of keys) {
      const hit = await P.page.evaluate((key) => {
        const b = document.querySelector(`[data-prog3-plus][data-stat-info="${key}"]`);
        if (!b) return null;
        b.scrollIntoView({ block: 'center' });
        const r = b.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      }, k);
      if (!hit) { console.log(`${k}: no row`); continue; }
      await P.page.touchscreen.tap(hit.x, hit.y);
      await P.page.waitForTimeout(450);
      const m = await P.page.evaluate(() => {
        const close = document.querySelector('[data-infopopup-close]');
        if (!close) return null;
        const card = close.closest('div[style*="border-radius"]') || close.parentElement.parentElement;
        const cr = card.getBoundingClientRect(), br = close.getBoundingClientRect();
        const scene = document.querySelector('[data-stat-demo]');
        return { cardTop: +cr.top.toFixed(0), cardBot: +cr.bottom.toFixed(0), cardH: +cr.height.toFixed(0),
          btnTop: +br.top.toFixed(0), btnBot: +br.bottom.toFixed(0), vh: window.innerHeight,
          scene: !!scene, offTop: +Math.max(0, -cr.top).toFixed(0),
          offBot: +Math.max(0, br.bottom - window.innerHeight).toFixed(0) };
      });
      console.log(`${k.padEnd(6)} scene=${m && m.scene ? 'Y' : 'n'} card ${m && m.cardH}px  btn ${m && m.btnTop}..${m && m.btnBot} of ${m && m.vh}  OFF top ${m && m.offTop} bottom ${m && m.offBot}`);
      await P.page.keyboard.press('Escape').catch(() => {});
      await P.page.waitForTimeout(300);
    }
  }
} finally { await browser.close(); await H.stopWorker(worker); web.close && web.close(); }
