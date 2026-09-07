/* THE BUILD SCREEN, PHOTOGRAPHED (v2.3.2326).
 *
 * Owner: "3 accordion columns rather than 3 accordion rows per combat primary
 * combat skill might work better."
 *
 * mp-prog3 asserts this layout to death and takes NO pictures -- both of its
 * `screenshot` mentions are comments describing captures a human took by hand
 * to find bugs the assertions had missed.  This is that human, automated: the
 * frames worth looking at, at the two widths that matter, in the states a
 * player is actually in.
 *
 * Every shot seeds a NON-EMPTY point pool.  A default harness character has an
 * empty one by design, which hides the badge, the brass on the spendable rows
 * and the whole reason someone is on this screen -- so the pretty shot would
 * have been of a screen nobody visits.
 */
import * as H from './harness.mjs';

const seed = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current; const R = S && S.rpg;
  if (R && R.prog3) { R.prog3.pool = 6; R.prog3.poolBy = { sword: 1, bow: 4, staff: 1 }; }
  if (S) S._serverCaps = Object.assign({}, S._serverCaps, { prog3Chan: true });
});

/* press: always toggles.  pick: only opens.  The first cut used pick() twice
   to open then close and measured a screen that never changed -- the second
   call saw an already-open column and did nothing. */
const press = (P, k) => P.page.evaluate(async (key) => {
  const wait = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const el = document.querySelector(`[data-prog3-lane="${key}"]`);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const o = { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch',
    clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
  el.dispatchEvent(new PointerEvent('pointerdown', o));
  el.dispatchEvent(new PointerEvent('pointerup', o));
  await wait(); await new Promise((r2) => setTimeout(r2, 260));
  return true;
}, k);

const pick = async (P, k) => {
  const open = await P.page.evaluate((key) => {
    const el = document.querySelector(`[data-prog3-lane="${key}"]`);
    return !!el && el.getAttribute('aria-expanded') === 'true';
  }, k);
  if (!open) await press(P, k);
  return true;
};

/* A crop around one element, the mp-notifbell recipe -- for the one question
   no assertion answers: does the 44px lit column read as a DIFFERENT control
   from the 28px section tabs 4px above it, or as six tabs in two rows? */
async function crop(P, name, sel, pad = 8) {
  const box = await P.page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  }, sel);
  if (!box) return false;
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/${name}.png`,
    clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad),
      width: box.width + 2 * pad, height: box.height + 2 * pad } });
  return true;
}

export async function run({ browser, wsPort, webPort, rec }) {
  for (const [w, h] of [[390, 844], [320, 568]]) {
    const P = await H.newPlayer(browser, { name: `Cols${w}`, wsPort, webPort,
      viewport: { width: w, height: h }, touch: true });
    await H.enterWorld(P);
    await P.page.waitForTimeout(2400);
    await seed(P);
    await H.openDest(P, 'Character');
    await P.page.waitForTimeout(600);
    await P.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]')
      .first().click({ timeout: 8000 }).catch(() => {});
    await P.page.waitForTimeout(800);

    /* MAGIC, deliberately.  It is the lane that used to put its first stat row
       under the fold -- entirely, at 320 -- so it is the frame that shows what
       changed rather than the one that always looked fine. */
    await pick(P, 'staff');
    await P.page.waitForTimeout(300);
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/build-after-${w}-magic.png` });
    const magic = await P.page.evaluate(() => {
      const first = document.querySelector('[role="button"][aria-label*=" of "]');
      const sel = document.querySelector('[data-prog3-lane]').parentElement.getBoundingClientRect();
      let sc = first && first.parentElement;
      while (sc && getComputedStyle(sc).overflowY !== 'auto') sc = sc.parentElement;
      const p = sc ? sc.getBoundingClientRect() : null;
      const b = first ? first.getBoundingClientRect() : null;
      return b ? { top: Math.round(b.top), bottom: Math.round(b.bottom),
        selBottom: Math.round(sel.bottom),
        panelBottom: p ? Math.round(p.bottom) : null,
        visible: Math.round(Math.max(0, Math.min(b.bottom, p ? p.bottom : 1e9) - Math.max(b.top, sel.bottom))) } : null;
    });
    console.log(`    ${w}: Magic first stat row ${JSON.stringify(magic)}`);
    rec.ok(`${w}: with Magic picked, its first stat row is wholly on screen`,
      !!magic && magic.visible >= 47, magic);

    /* The closed state — what tapping the lit column again gets you. */
    await press(P, 'staff');
    await P.page.waitForTimeout(350);
    const closed = await P.page.evaluate(() => ({
      open: [...document.querySelectorAll('[data-prog3-lane]')]
        .filter((x) => x.getAttribute('aria-expanded') === 'true').length,
      recaps: document.querySelectorAll('[data-prog3-recap]').length,
      numbers: [...document.querySelectorAll('[data-prog3-recap] span:last-child span')]
        .map((s) => (s.textContent || '').trim()).length,
    }));
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/build-after-${w}-closed.png` });
    console.log(`    ${w}: closed ${JSON.stringify(closed)}`);
    rec.ok(`${w}: tapping the lit column again closes it to three recap rows`,
      closed.open === 0 && closed.recaps === 3, closed);
    /* Twelve: prog3AtkMeta() is FOUR attack stats, not three -- counted off
       the live DOM rather than off memory, which is where the first cut of
       this assertion got 9 from.  Four for each of the three weapons is the
       whole of what a collapsed lane used to show one lane at a time, and it
       is now on screen for all three at once. */
    rec.ok(`${w}: ...carrying all twelve attack numbers, so nothing is lost by closing`,
      closed.numbers === 12, closed);

    if (w === 390) {
      await pick(P, 'staff');
      await P.page.waitForTimeout(300);
      await crop(P, 'build-after-selector', '[data-prog3-lane]', 40);
    }
    await P.ctx.close().catch(() => {});
  }
}
