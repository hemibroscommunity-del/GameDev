/* A focused re-check of ONE claim: does any cell TITLE truncate at 360 in
   variant b?  The sweep in shot-mock4 said no and the composed strip appears
   to say yes, so this asks the DOM directly and prints every title's box. */
import * as H from './harness.mjs';
import { chromium } from 'playwright';

const WS = await H.freePort(), WEB = await H.freePort();
const worker = await H.startWorker(WS);
const web = await H.serveDist(WEB);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
try {
  const P = await H.newPlayer(browser, { name: 'Probe', wsPort: WS, webPort: WEB,
    viewport: { width: 360, height: 800 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2400);
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current; const R = S && S.rpg;
    if (R && R.prog3) { R.prog3.pool = 6; R.prog3.poolBy = { sword: 1, bow: 4, staff: 1 }; R.prog3.shared = 3; }
    if (S) S._serverCaps = Object.assign({}, S._serverCaps, { prog3Chan: true, prog3shared: true });
  });
  await H.openDest(P, 'Character');
  await P.page.waitForTimeout(600);
  await P.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]')
    .first().click({ timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(800);
  for (const m of ['a', 'b']) {
    await P.page.evaluate((mm) => history.replaceState({}, '', `${location.pathname}?mock4=${mm}`), m);
    await P.page.evaluate(() => {
      const el = document.querySelector('[data-prog3-lane="bow"]');
      const r = el.getBoundingClientRect();
      const o = { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch',
        clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
      el.dispatchEvent(new PointerEvent('pointerdown', o));
      el.dispatchEvent(new PointerEvent('pointerup', o));
    });
    await P.page.waitForTimeout(500);
    const rows = await P.page.evaluate(() => {
      const out = [];
      document.querySelectorAll('[data-prog3-col] > [role="button"]').forEach((c, i) => {
        /* The title is the FIRST span in the cell. */
        const t = c.querySelector('span');
        if (!t) return;
        const cs = getComputedStyle(t);
        /* FRACTIONAL, because scrollWidth/clientWidth are integers: a 46.52px
           box holding 47.19px of text reports 47 and 47 and the overflow
           vanishes. That is what fooled the first two passes while the pixels
           plainly read "POW...".  A Range over the text node measures what the
           glyphs actually take, to sub-pixel. */
        const rng = document.createRange();
        rng.selectNodeContents(t);
        const textW = rng.getBoundingClientRect().width;
        const boxW = t.getBoundingClientRect().width
          - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
        out.push({ i, text: t.textContent,
          sw: t.scrollWidth, cw: t.clientWidth,
          textW: +textW.toFixed(2), boxW: +boxW.toFixed(2),
          over: +(textW - boxW).toFixed(2), font: cs.fontSize, ov: cs.textOverflow });
      });
      return out;
    });
    console.log(`\n=== mock4=${m} @360 — ${rows.length} cells ===`);
    rows.forEach((r) => console.log(
      `  [${String(r.i).padStart(2)}] "${r.text}" text=${r.textW} box=${r.boxW} over=${r.over} (int said ${r.sw - r.cw}) ${r.font}` + (r.over > 0.05 ? '   <-- TRUNCATES' : '')));
    console.log(`  truncating: ${rows.filter((r) => r.over > 0.05).length}`);
    /* A tight, magnified shot of the POWER cell itself — the one the composed
       strip appears to disagree with the numbers about.  A picture of the
       exact element beats arguing with a sweep. */
    const box = await P.page.evaluate(() => {
      const cells = document.querySelectorAll('[data-prog3-col] > [role="button"]');
      const c = cells[1];
      if (!c) return null;
      const r = c.getBoundingClientRect();
      return { x: r.left - 2, y: r.top - 2, width: r.width + 4, height: r.height + 4 };
    });
    if (box) await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/probe-power-${m}.png`, clip: box });
  }
} finally {
  await browser.close(); await H.stopWorker(worker); web.close && web.close();
}
