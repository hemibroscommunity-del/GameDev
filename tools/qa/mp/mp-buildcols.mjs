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
  /* v2.3.2592: + a shared pool, so the fourth column carries a badge too. */
  if (R && R.prog3) { R.prog3.pool = 6; R.prog3.poolBy = { sword: 1, bow: 4, staff: 1 }; R.prog3.shared = 3; }
  if (S) S._serverCaps = Object.assign({}, S._serverCaps, { prog3Chan: true, prog3shared: true });
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
  /* v2.3.2592: THE FOUR COLUMNS, PHOTOGRAPHED.  The accordion this file used
     to open and close is gone — every lane is on screen at once, under a
     sticky header row — so the frames worth looking at are simply the screen
     at rest, at the two widths that matter, with points on every column. */
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
    await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/build-after-${w}-grid.png` });

    const grid = await P.page.evaluate(() => {
      const heads = [...document.querySelectorAll('[data-prog3-lane]')];
      const cols = [...document.querySelectorAll('[data-prog3-col]')];
      const first = cols.map((c) => c.querySelector('[role="button"][aria-label*=" of "]'));
      let sc = first[0] && first[0].parentElement;
      while (sc && getComputedStyle(sc).overflowY !== 'auto') sc = sc.parentElement;
      const p = sc ? sc.getBoundingClientRect() : null;
      const floor = p ? Math.min(p.bottom, window.innerHeight) : window.innerHeight;
      const headRow = heads[0] && heads[0].parentElement;
      const hb = headRow ? headRow.getBoundingClientRect() : null;
      return {
        heads: heads.map((x) => x.getAttribute('data-prog3-lane')),
        cols: cols.map((x) => x.getAttribute('data-prog3-col')),
        overflow: cols.map((c) => ({ k: c.getAttribute('data-prog3-col'),
          x: c.scrollWidth - c.clientWidth })),
        firstVisible: first.map((f) => {
          if (!f) return null;
          const b = f.getBoundingClientRect();
          return Math.round(Math.max(0, Math.min(b.bottom, floor) - Math.max(b.top, hb ? hb.bottom : 0)));
        }),
        cellH: first[0] ? Math.round(first[0].getBoundingClientRect().height) : 0,
      };
    });
    console.log(`    ${w}: ${JSON.stringify(grid)}`);
    rec.ok(`${w}: four headers over four columns — melee, staff, bow, shared`,
      grid.heads.join(',') === 'sword,staff,bow,shared' && grid.cols.join(',') === 'sword,staff,bow,shared', grid);
    rec.ok(`${w}: every column's first cell is wholly on screen at rest, under the header row`,
      grid.firstVisible.every((v) => v != null && v >= grid.cellH - 1), grid);
    rec.ok(`${w}: no column scrolls sideways`,
      grid.overflow.every((o) => o.x <= 1), grid.overflow);

    if (w === 390) {
      await crop(P, 'build-after-selector', '[data-prog3-lane]', 40);
    }
    await P.ctx.close().catch(() => {});
  }
}
