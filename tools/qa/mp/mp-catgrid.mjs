/* THE POINTS SCREEN AS FOUR CATEGORY BUTTONS (v2.3.2597).
 *
 * The owner sent reference shots: a 2x2 grid of MELEE / BOW / MAGIC / SHARED,
 * and tapping one drills into a card of that category's stats with a wide [+]
 * down the right edge of every row.  This drives that screen the way a thumb
 * does and asserts the things the shape has to get right.
 *
 * EVERY GESTURE IS A REAL FINGER (TRAPS §67).  `page.touchscreen.tap` at real
 * coordinates goes through hit testing; `dispatchEvent` does not, and a test
 * built on it passes whether or not the control is reachable — which is the
 * exact bug class §67 exists for.  What is asserted is the OUTCOME: did the
 * card open, did the window open, did the pool move.
 *
 * The two things most worth catching here:
 *   - a stat with no way to reach it.  The [+] is now the ONLY route to a
 *     stat's explanation, so a row rendering without one strands that stat.
 *     Every row, in all four categories, must carry a [+].
 *   - spending in the wrong lane.  The window opened from a BOW row must say
 *     Bow, because "so the user doesn't accidentally spend the wrong weapon
 *     point type" is the owner's stated reason for the confirm existing.
 */
import * as H from './harness.mjs';

const OUT = `${H.REPO}/tools/qa/mp/out`;

const seed = (P) => P.page.evaluate(() => {
  const S = window._gameState && window._gameState.current; const R = S && S.rpg;
  if (R && R.prog3) { R.prog3.pool = 15; R.prog3.poolBy = { sword: 4, bow: 10, staff: 1 }; R.prog3.shared = 16; }
  if (S) S._serverCaps = Object.assign({}, S._serverCaps, { prog3Chan: true, prog3shared: true });
});

/* A REAL finger on the centre of a selector, after scrolling it into view.
   Returns false when the element is not there at all, so a miss reads as a
   miss rather than as a silent pass. */
async function finger(P, sel) {
  const box = await P.page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }, sel);
  if (!box) return false;
  await P.page.touchscreen.tap(box.x, box.y);
  await P.page.waitForTimeout(340);
  return true;
}

const has = (P, sel) => P.page.evaluate((s) => !!document.querySelector(s), sel);
const pools = (P) => P.page.evaluate(() => {
  const R = window._gameState && window._gameState.current && window._gameState.current.rpg;
  const p = (R && R.prog3) || {};
  return { pool: p.pool, shared: p.shared, poolBy: JSON.parse(JSON.stringify(p.poolBy || {})) };
});

async function openPoints(P) {
  await H.openDest(P, 'Character');
  await P.page.waitForTimeout(600);
  await P.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]')
    .first().click({ timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(700);
}

export async function run({ browser, wsPort, webPort, rec }) {
  for (const [label, vp, land, who] of [
    ['390-portrait', { width: 390, height: 844 }, false, 'Catgrida'],
    ['360-portrait', { width: 360, height: 800 }, false, 'Catgridb'],
    ['390-landscape', { width: 844, height: 390 }, true, 'Catgridc'],
    ['360-landscape', { width: 800, height: 360 }, true, 'Catgridd'],
  ]) {
    /* Created in portrait always: the creator's Play button sits below the
       fold in a 390-tall viewport, so a landscape context times out in
       enterWorld and it reads as a broken door. */
    const P = await H.newPlayer(browser, { name: who, wsPort, webPort,
      viewport: land ? { width: 390, height: 844 } : vp, touch: true });
    await H.enterWorld(P);
    await P.page.waitForTimeout(2400);
    if (land) { await P.page.setViewportSize(vp); await P.page.waitForTimeout(1100); }
    await seed(P);
    if (land) {
      await P.page.evaluate(() => window.__broDashPanelBus && window.__broDashPanelBus.open('hero'));
      await P.page.waitForTimeout(900);
      await P.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]')
        .first().click({ timeout: 8000 }).catch(() => {});
      await P.page.waitForTimeout(700);
    } else {
      await openPoints(P);
    }

    /* ── THE GRID ── */
    const grid = await P.page.evaluate(() => {
      const g = document.querySelector('[data-prog3-grid]');
      if (!g) return null;
      const lanes = [...document.querySelectorAll('[data-prog3-lane]')];
      const gb = g.getBoundingClientRect();
      return {
        cols: getComputedStyle(g).gridTemplateColumns.split(' ').length,
        lanes: lanes.map((l) => ({
          key: l.getAttribute('data-prog3-lane'),
          label: l.getAttribute('aria-label'),
          w: +l.getBoundingClientRect().width.toFixed(1),
          h: +l.getBoundingClientRect().height.toFixed(1),
          pts: l.querySelectorAll('[aria-label*="points to spend"]').length,
          overflowX: gb.width - g.scrollWidth,
        })),
      };
    });
    rec.ok(`${label}: the Points screen opens on a 2x2 grid of four categories`,
      !!grid && grid.cols === 2 && grid.lanes.length === 4, grid && { cols: grid.cols, n: grid.lanes.length });
    rec.ok(`${label}: the four are melee, staff, bow, shared, each a real thumb target`,
      !!grid && grid.lanes.map((l) => l.key).join(',') === 'sword,staff,bow,shared'
        && grid.lanes.every((l) => l.h >= 44 - 0.5),
      grid && grid.lanes.map((l) => `${l.key}:${l.w}x${l.h}`).join(' '));
    rec.ok(`${label}: exactly one "points to spend" per category (the contract four scenarios read)`,
      !!grid && grid.lanes.every((l) => l.pts === 1), grid && grid.lanes.map((l) => l.pts));
    rec.ok(`${label}: every category still carries its ", level N" aria-label`,
      !!grid && grid.lanes.every((l) => /, level \d+$/.test(l.label || '')),
      grid && grid.lanes.map((l) => l.label));
    await P.page.screenshot({ path: `${OUT}/catgrid-${label}-grid.png` });

    /* ── DRILL IN, WITH A REAL FINGER ── */
    const tapped = await finger(P, '[data-prog3-lane="bow"]');
    rec.ok(`${label}: a real finger on BOW reaches it (hit-tested, not dispatched)`, tapped);
    const opened = await has(P, '[data-prog3-card="bow"]');
    rec.ok(`${label}: ...and it opens the BOW card`, opened);

    const card = await P.page.evaluate(() => {
      const c = document.querySelector('[data-prog3-card]');
      if (!c) return null;
      const rows = [...c.querySelectorAll('[data-prog3-plus]')];
      const cb = c.getBoundingClientRect();
      const labels = [...c.querySelectorAll('[data-prog3-plus]')].map((b) => b.getAttribute('aria-label'));
      /* Anything ellipsised inside the card, measured fractionally — integer
         scrollWidth/clientWidth hide a sub-pixel overflow (v2.3.2596). */
      const clipped = [];
      c.querySelectorAll('span, div').forEach((k) => {
        const cs = getComputedStyle(k);
        if (cs.textOverflow !== 'ellipsis' || !k.firstChild) return;
        const rg = document.createRange(); rg.selectNodeContents(k);
        const tw = rg.getBoundingClientRect().width;
        const bw = k.getBoundingClientRect().width
          - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
        if (tw - bw > 0.05) clipped.push({ t: k.textContent.slice(0, 16), by: +(tw - bw).toFixed(2) });
      });
      return {
        back: !!c.querySelector('[data-prog3-back]'),
        info: !!c.querySelector('[data-lane-info]'),
        nRows: rows.length,
        plus: rows.map((b) => { const r = b.getBoundingClientRect(); return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; }),
        labels, clipped,
        cardH: +cb.height.toFixed(1),
        cardW: +cb.width.toFixed(1),
        /* The row's own budget, so an overflow says WHICH element ate it. */
        rowParts: (() => {
          const r0 = c.querySelector('[data-prog3-plus]');
          if (!r0) return null;
          const row = r0.parentElement;
          return { rowW: +row.getBoundingClientRect().width.toFixed(1),
            parts: [...row.children].map((k) => `${k.tagName.toLowerCase()}:${k.getBoundingClientRect().width.toFixed(1)}`) };
        })(),
      };
    });
    rec.ok(`${label}: the card carries Back and the category [i]`, !!card && card.back && card.info, card && { back: card.back, info: card.info });
    rec.ok(`${label}: a weapon shows all SIX of today's stats (the shot pre-dates v2.3.2592 and drew four)`,
      !!card && card.nRows === 6, card && { rows: card.nRows });
    rec.ok(`${label}: EVERY row carries a [+] — the only route to a stat's explanation, so a row without one strands it`,
      !!card && card.plus.length === card.nRows && card.plus.every((p) => p.w > 20 && p.h > 20),
      card && card.plus.map((p) => `${p.w}x${p.h}`).join(' '));
    rec.ok(`${label}: nothing in the card is cut off (measured to sub-pixel)`,
      !!card && card.clipped.length === 0, card && { clipped: card.clipped, cardW: card.cardW, row: card.rowParts });
    rec.ok(`${label}: every [+] keeps the "N of M" aria-label mp-prog3 parses`,
      !!card && card.labels.every((l) => / \d+ of \d+\./.test(l || '')), card && card.labels);
    await P.page.screenshot({ path: `${OUT}/catgrid-${label}-bow.png` });

    /* ── THE [+] OPENS THE WINDOW, AND SPENDS NOTHING BY ITSELF ── */
    const before = await pools(P);
    const tappedPlus = await finger(P, '[data-prog3-plus]');
    rec.ok(`${label}: a real finger reaches a row's [+]`, tappedPlus);
    const confirm = await P.page.evaluate(() => {
      const el = document.querySelector('[data-prog3-spend-confirm]');
      if (!el) return null;
      const root = el.closest('div[style]') ? el.closest('div[style]').parentElement : document.body;
      return { open: true, text: (root.innerText || '').slice(0, 400) };
    });
    rec.ok(`${label}: ...which opens the spend window`, !!confirm);
    const after = await pools(P);
    rec.ok(`${label}: ...and NOTHING was spent by opening it (a mis-tap costs a window, not a point)`,
      JSON.stringify(before) === JSON.stringify(after), { before, after });
    rec.ok(`${label}: the window NAMES THE WEAPON — opened from a Bow row it says Bow`,
      !!confirm && /Bow/i.test(confirm.text), confirm && confirm.text.slice(0, 120));
    await P.page.screenshot({ path: `${OUT}/catgrid-${label}-confirm.png` });
    await finger(P, '[data-prog3-spend-cancel]');

    /* ── SHARED: SEVEN ROWS, THE TIGHTEST CASE ── */
    await finger(P, '[data-prog3-back]');
    const backOk = await has(P, '[data-prog3-grid]');
    rec.ok(`${label}: Back returns to the grid`, backOk);
    await finger(P, '[data-prog3-lane="shared"]');
    const sh = await P.page.evaluate(() => {
      const c = document.querySelector('[data-prog3-card]');
      if (!c) return null;
      const rows = [...c.querySelectorAll('[data-prog3-plus]')];
      return { key: c.getAttribute('data-prog3-card'), n: rows.length,
        allPlus: rows.every((b) => b.getBoundingClientRect().height > 20) };
    });
    rec.ok(`${label}: SHARED opens and shows all SEVEN of its stats, each with a [+]`,
      !!sh && sh.key === 'shared' && sh.n === 7 && sh.allPlus, sh);
    await P.page.screenshot({ path: `${OUT}/catgrid-${label}-shared.png` });

    /* ═══ WHAT "NO PAGE ERRORS" CAN HONESTLY MEAN IN THIS SANDBOX ═══
       Two requests can never succeed here and neither belongs to this change:
       the Google Fonts stylesheet, and the catalogue CSV that BroTown.jsx and
       GameApp.jsx fetch from raw.githubusercontent. Both are made on
       origin/main, both are blocked the same way — the agent proxy terminates
       TLS with a CA Chromium does not trust, so they surface as
       ERR_CERT_AUTHORITY_INVALID. Verified by listening to `requestfailed`
       for the URLs (probe-cert.mjs) rather than guessing from the console text,
       which carries no URL.
       So the assertion tests what it can mean: no page error that is NOT the
       sandbox intercepting an external host. Widening it back to "zero logs"
       would make this scenario permanently red for a reason no change here can
       fix, which is how a real failure gets ignored. */
    const real = P.logs.filter((l) => !/ERR_CERT_AUTHORITY_INVALID|ERR_CERT_COMMON_NAME_INVALID/.test(l));
    rec.ok(`${label}: no page errors (excluding the sandbox's TLS block on fonts + the catalogue CSV, which fail on main too)`,
      real.length === 0, real.slice(0, 3));
    await P.ctx.close();
  }
}
