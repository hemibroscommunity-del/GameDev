/* The four new explainer scenes (v2.3.2616), looked at rather than reasoned
   about: opens each one and films the stage at six moments across its loop.
     node tools/qa/mp/probe-scenes.mjs [stat ...] */
import * as H from './harness.mjs';
import { chromium } from 'playwright';
const WANT = process.argv.slice(2).length ? process.argv.slice(2) : ['range', 'stam', 'move', 'eres'];
const WS = await H.freePort(), WEB = await H.freePort();
const worker = await H.startWorker(WS); const web = await H.serveDist(WEB);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
try {
  const P = await H.newPlayer(browser, { name: 'Scenes', wsPort: WS, webPort: WEB,
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P); await P.page.waitForTimeout(2400);
  const myId = await H.readState(P, (S) => S.myId);
  await fetch(`http://127.0.0.1:${WS}/api/admin/dev/kit`, { method: 'POST',
    headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: myId, what: 'levels' }) }).catch(() => null);
  await P.page.waitForTimeout(1500);
  await H.openDest(P, 'Character'); await P.page.waitForTimeout(700);
  await P.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]')
    .first().click({ timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(700);
  for (const stat of WANT) {
    const lane = ['range'].includes(stat) ? 'bow' : 'shared';
    await H.openPointCols(P, [lane]);
    const hit = await P.page.evaluate((k) => {
      const b = document.querySelector(`[data-prog3-plus][data-stat-info="${k}"]`);
      if (!b) return null;
      b.scrollIntoView({ block: 'center' });
      const r = b.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    }, stat);
    if (!hit) { console.log(`${stat}: no [+] found`); continue; }
    await P.page.touchscreen.tap(hit.x, hit.y);
    await P.page.waitForTimeout(500);
    const box = await P.page.evaluate(() => {
      const d = document.querySelector('[data-stat-demo]');
      if (!d) return null;
      const r = d.getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
    });
    if (!box) { console.log(`${stat}: no scene rendered`); continue; }
    for (let i = 0; i < 6; i++) {
      await P.page.waitForTimeout(900);
      await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/scene-${stat}-${i}.png`, clip: box });
    }
    console.log(`${stat}: 6 frames, stage ${box.width}x${box.height}`);
    await P.page.keyboard.press('Escape').catch(() => {});
    await P.page.waitForTimeout(400);
  }
} finally { await browser.close(); await H.stopWorker(worker); web.close && web.close(); }
