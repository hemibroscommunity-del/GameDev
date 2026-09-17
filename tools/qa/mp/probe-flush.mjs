/* "Move plus sign to the very edge of the cell there's some space showing."
   Where exactly is the space?  Measured on all four edges of the [+] against the
   cell's BORDER box, so the answer distinguishes padding from the border itself.
     node tools/qa/mp/probe-flush.mjs [width] */
import * as H from './harness.mjs';
import { chromium } from 'playwright';
const W = +(process.argv[2] || 390);
const WS = await H.freePort(), WEB = await H.freePort();
const worker = await H.startWorker(WS); const web = await H.serveDist(WEB);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
try {
  const P = await H.newPlayer(browser, { name: 'Flush', wsPort: WS, webPort: WEB,
    viewport: { width: W, height: 844 }, touch: true });
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
  await H.openPointCols(P, ['shared']);
  const out = await P.page.evaluate(() => {
    const r = document.querySelector('[data-prog3-row]');
    const b = r.querySelector('[data-prog3-plus]');
    const cr = r.getBoundingClientRect(), br = b.getBoundingClientRect();
    const cs = getComputedStyle(r), bs = getComputedStyle(b);
    return {
      cell: { w: +cr.width.toFixed(2), h: +cr.height.toFixed(2),
        pad: cs.padding, border: cs.borderTopWidth, radius: cs.borderRadius, overflow: cs.overflow },
      plus: { w: +br.width.toFixed(2), h: +br.height.toFixed(2), border: bs.borderTopWidth, radius: bs.borderRadius },
      gap: { top: +(br.top - cr.top).toFixed(2), right: +(cr.right - br.right).toFixed(2),
        bottom: +(cr.bottom - br.bottom).toFixed(2), left: +(br.left - cr.left).toFixed(2) },
    };
  });
  console.log(`@${W} ` + JSON.stringify(out, null, 1));
  const box = await P.page.evaluate(() => {
    const r = document.querySelector('[data-prog3-row]').getBoundingClientRect();
    return { x: Math.round(r.right - 90), y: Math.round(r.top - 6), width: 96, height: Math.round(r.height + 12) };
  });
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/flush-${W}.png`, clip: box });
} finally { await browser.close(); await H.stopWorker(worker); web.close && web.close(); }
