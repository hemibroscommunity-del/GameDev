/* The icon centred between label and [+] (v2.3.2602): the numbers per row, and
   a crop of the whole SHARED card so the vertical raggedness can be judged by
   eye rather than argued about.   node tools/qa/mp/probe-centre.mjs [width] */
import * as H from './harness.mjs';
import { chromium } from 'playwright';
const W = +(process.argv[2] || 360);
const WS = await H.freePort(), WEB = await H.freePort();
const worker = await H.startWorker(WS); const web = await H.serveDist(WEB);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
try {
  const P = await H.newPlayer(browser, { name: 'Centre', wsPort: WS, webPort: WEB,
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
  const rows = await P.page.evaluate(() => [...document.querySelectorAll('[data-prog3-row]')].map((r) => {
    const lab = r.querySelector('span'), img = r.querySelector('img'), plus = r.querySelector('[data-prog3-plus]');
    const l = lab.getBoundingClientRect(), i = img.getBoundingClientRect(), b = plus.getBoundingClientRect(), rr = r.getBoundingClientRect();
    return { k: (r.getAttribute('data-prog3-row') || '').split(':').pop(), text: lab.textContent,
      labW: +l.width.toFixed(1), iconInRow: +(i.left - rr.left).toFixed(1),
      gapL: +(i.left - l.right).toFixed(2), gapR: +(b.left - i.right).toFixed(2) };
  }));
  console.log(`@${W}  ` + rows.map((r) => `${r.text}[lab ${r.labW} | L ${r.gapL} R ${r.gapR} | x ${r.iconInRow}]`).join('\n     '));
  for (const [tag, pos] of [['top', 0], ['bot', 99999]]) {
    const box = await P.page.evaluate((y) => {
      const c = document.querySelector('[data-prog3-card]');
      let sc = c.parentElement;
      while (sc && !(sc.scrollHeight - sc.clientHeight > 4 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
      if (sc) sc.scrollTop = y;
      const s = sc.getBoundingClientRect();
      return { x: Math.round(s.left), y: Math.round(s.top), width: Math.round(s.width), height: Math.round(s.height) };
    }, pos);
    await P.page.waitForTimeout(300);
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/centre-${W}-${tag}.png`, clip: box });
    console.log(`crop ${tag}`, JSON.stringify(box));
  }
} finally { await browser.close(); await H.stopWorker(worker); web.close && web.close(); }
