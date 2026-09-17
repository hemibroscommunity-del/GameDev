/* A tight crop of the band just above the tab row, magnified — the place a cell
   edge appeared to peek through in the full-frame capture. */
import * as H from './harness.mjs';
import { chromium } from 'playwright';
const WS = await H.freePort(), WEB = await H.freePort();
const worker = await H.startWorker(WS); const web = await H.serveDist(WEB);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
try {
  const P = await H.newPlayer(browser, { name: 'Band', wsPort: WS, webPort: WEB,
    viewport: { width: 390, height: 844 }, touch: true, dpr: 3 });
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
  const box = await P.page.evaluate(() => {
    const t = [...document.querySelectorAll('[role="button"][aria-pressed]')]
      .find((e) => /Equipment/i.test(e.getAttribute('aria-label') || ''));
    const row = t.parentElement; const r = row.getBoundingClientRect();
    let s = row.parentElement;
    while (s && !(s.scrollHeight - s.clientHeight > 4 && /auto|scroll/.test(getComputedStyle(s).overflowY))) s = s.parentElement;
    if (s) s.scrollTop = 200;
    return { x: 0, y: Math.max(0, r.top - 40), width: 390, height: 130 };
  });
  await P.page.waitForTimeout(400);
  console.log(JSON.stringify(await P.page.evaluate(() => {
    const t = [...document.querySelectorAll('[role="button"][aria-pressed]')]
      .find((e) => /Equipment/i.test(e.getAttribute('aria-label') || ''));
    const row = t.parentElement;
    let sc = row.parentElement;
    while (sc && !(sc.scrollHeight - sc.clientHeight > 4 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
    const cs = sc ? getComputedStyle(sc) : null;
    const sr = sc ? sc.getBoundingClientRect() : null;
    const rr = row.getBoundingClientRect();
    const card = document.querySelector('[data-prog3-card]');
    const hd = card ? card.firstElementChild.getBoundingClientRect() : null;
    return {
      scroller: sc ? { top: +sr.top.toFixed(1), padTop: cs.paddingTop, bg: cs.backgroundColor, overflowY: cs.overflowY } : null,
      tabRow: { top: +rr.top.toFixed(1), bottom: +rr.bottom.toFixed(1) },
      gapAboveTabs: sc ? +(rr.top - sr.top).toFixed(1) : null,
      cardHeader: hd ? { top: +hd.top.toFixed(1) } : null,
      gapTabsToHeader: hd ? +(hd.top - rr.bottom).toFixed(1) : null,
    };
  }), null, 1));
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/band.png`, clip: box });
  console.log('band clipped at', JSON.stringify(box));
} finally { await browser.close(); await H.stopWorker(worker); web.close && web.close(); }
