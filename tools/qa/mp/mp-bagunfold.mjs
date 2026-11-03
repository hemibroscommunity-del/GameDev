/* ═══ v2.3.3897: THE BAG BUTTON OPENS A FOLDED DASHBOARD ═══
 *
 * The owner, 2026-11-02: "If you try to tap the bag dashboard button while
 * playing with the menu minimized it doesn't expand the dashboard into the
 * bag.  It should.  All the other buttons do."
 *
 * One upright phone in the world:
 *   1. the band unfolded on arrival (guard), its bag columns showing;
 *   2. the fold control folds it: data-dash-fold="min", no bag columns;
 *   3. a tap on the bag button ([data-nav="dashboard"]) unfolds it: "open",
 *      the bag columns (.bt-dashcols) back;
 *   4. a second tap leaves it unfolded (it only unfolds, never folds);
 *   5. no page errors.
 *
 *   node tools/qa/mp/run.mjs bagunfold
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const read = (P) => P.page.evaluate(() => {
  const f = document.querySelector('[data-dash-fold]');
  const cols = document.querySelector('.bt-dashcols');
  const r = cols ? cols.getBoundingClientRect() : null;
  return { fold: f ? f.getAttribute('data-dash-fold') : null, cols: !!(r && r.width > 40 && r.height > 40) };
});

const tapEl = async (P, sel) => {
  const loc = P.page.locator(sel).first();
  await loc.waitFor({ state: 'visible', timeout: 6000 });
  await loc.click({ force: true });
  await P.page.waitForTimeout(900);
};

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Foldbag', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const errs = [];
  A.page.on('pageerror', (e) => errs.push(String(e && e.message || e).slice(0, 200)));
  try {
    await H.enterWorld(A);
    await H.unfoldBand(A);
    const s1 = await read(A);
    rec.ok(`1. the band unfolded on arrival, bag columns showing (guard): ${JSON.stringify(s1)}`, s1.fold === 'open' && s1.cols, s1);

    await tapEl(A, '[data-dash-fold="open"]');
    const s2 = await read(A);
    rec.ok(`2. the fold control folds it: ${JSON.stringify(s2)}`, s2.fold === 'min' && !s2.cols, s2);

    await tapEl(A, '[data-nav="dashboard"]');
    const s3 = await read(A);
    rec.ok(`3. the bag button unfolds it, the bag columns back: ${JSON.stringify(s3)}`, s3.fold === 'open' && s3.cols, s3);

    await tapEl(A, '[data-nav="dashboard"]');
    const s4 = await read(A);
    rec.ok(`4. a second tap leaves it unfolded: ${JSON.stringify(s4)}`, s4.fold === 'open' && s4.cols, s4);

    rec.ok('5. no page errors', errs.length === 0, errs.slice(0, 5));
  } finally {
    await A.ctx.close().catch(() => {});
  }
}
