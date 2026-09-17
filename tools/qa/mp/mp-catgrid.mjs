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

/* ═══ REAL POINTS, FROM THE WORKER ═══
   A first cut seeded the pools in the BROWSER (R.prog3.pool = 15). Every layout
   assertion passed on that and every SPEND assertion failed, because the server
   had never heard of those points and was right to refuse the allocate — the
   game is server-authoritative for progression (CLAUDE.md). The blob simply
   never moved, which reads exactly like a dead [+] button and is not one.
   So points are minted the way mp-statgrid mints them: the devkit's `levels`
   award runs the worker's own _prog3AwardXp, which creates the lane points AND
   the shared points on the server. If this ever fails, the spend assertions go
   red rather than silently testing nothing. */
async function seed(P, wsPort) {
  const myId = await H.readState(P, (S) => S.myId);
  await fetch(`http://127.0.0.1:${wsPort}/api/admin/dev/kit`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: myId, what: 'levels' }),
  }).then((r) => r.json()).catch(() => null);
  await P.page.waitForTimeout(1600);
  return P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    const R = S && S.rpg;
    const p = (R && R.prog3) || {};
    return { pool: p.pool, shared: p.shared, poolBy: p.poolBy,
      caps: !!(S && S._serverCaps && S._serverCaps.prog3shared) };
  });
}

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
  const j = (o) => JSON.parse(JSON.stringify(o || {}));
  return { pool: p.pool, shared: p.shared, poolBy: j(p.poolBy), atk: j(p.atk), alloc: j(p.alloc) };
});

/* Answer the confirm window with a real finger and WAIT FOR THE WORKER.
   A spend is a round trip — the client only sends prog3_allocate, and the blob
   moves when the server echoes — so this polls rather than sleeping once.
   The same shape mp-statgrid used, which is where this coverage comes from. */
async function answerConfirm(P, which, settle) {
  /* v2.3.2597: the spend lives at the bottom of the INFORMATION window now —
     one window that explains and confirms, the owner's own arrangement — so
     'confirm' is its gold action and 'cancel' is its close. */
  const ok = await finger(P, which === 'confirm' ? '[data-infopopup-action]' : '[data-infopopup-close]');
  if (!ok) return { err: 'no ' + which };
  for (let i = 0; i < 40; i++) {
    await P.page.waitForTimeout(100);
    const now = await pools(P);
    if (settle(now)) return { ok: true, now };
  }
  return { ok: false, now: await pools(P) };
}

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
    const seeded = await seed(P, wsPort);
    rec.ok(`${label}: the worker minted real points to spend (guard — a client-side seed would make every spend below vacuous)`,
      !!seeded && seeded.pool > 0 && seeded.shared > 0, seeded);
    /* Ported from mp-statgrid, which retires with the four-column layout it
       tested: the worker advertises the shared pool, and mints one SHARED point
       per lane point (v2.3.2592).  Neither is about layout, so neither should
       have gone with it. */
    rec.ok(`${label}: the worker advertises the shared-pool grid (guard)`, !!seeded && seeded.caps === true, seeded);
    rec.ok(`${label}: ...and minted a real SHARED pool beside the lane pool — one per lane point (v2.3.2592)`,
      !!seeded && seeded.pool >= 3 && seeded.shared >= 3, seeded);
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
    /* ═══ v2.3.2597: WHAT TWO COLUMNS ACTUALLY COST ═══
       The owner asked to TRY two columns inside the card, then moved the stat
       values out to the confirm to pay for them. These are the numbers that say
       whether that worked: the cell width, the widest label against the box it
       has, the [+] against the size the reference shot gives it, and whether
       the card still needs to scroll. */
    const two = await P.page.evaluate(() => {
      const c = document.querySelector('[data-prog3-card]');
      if (!c) return null;
      const grid = c.querySelector('div[style*="grid"]');
      const plus = c.querySelector('[data-prog3-plus]');
      const row = plus && plus.parentElement;
      /* Every stat label in the card, with the box it actually has. */
      const labels = [...c.querySelectorAll('[data-prog3-plus]')].map((b) => {
        const sp = b.parentElement.querySelector('span');
        if (!sp) return null;
        const cs = getComputedStyle(sp);
        const rg = document.createRange(); rg.selectNodeContents(sp);
        return { t: sp.textContent, need: +rg.getBoundingClientRect().width.toFixed(2),
          box: +(sp.getBoundingClientRect().width).toFixed(2) };
      }).filter(Boolean);
      labels.sort((a, b) => b.need - a.need);
      /* Does the card still overflow its scroller? */
      let sc = c.parentElement;
      while (sc && !(sc.scrollHeight - sc.clientHeight > 4 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
      return {
        cols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : null,
        cellW: row ? +row.getBoundingClientRect().width.toFixed(1) : null,
        plus: plus ? { w: +plus.getBoundingClientRect().width.toFixed(1), h: +plus.getBoundingClientRect().height.toFixed(1) } : null,
        widest: labels[0], labels: labels.map((l) => l.t),
        cardH: +c.getBoundingClientRect().height.toFixed(1),
        window: sc ? sc.clientHeight : null,
        scrolls: sc ? (sc.scrollHeight - sc.clientHeight > 4) : null,
      };
    });
    rec.ok(`${label}: inside the card the stats lay out in ${land ? 'ONE column (the ~191px pane cannot hold two)' : 'TWO columns'}`,
      !!two && two.cols === (land ? 1 : 2), two && { cols: two.cols, cellW: two.cellW });
    rec.ok(`${label}: the widest label still fits its half-width cell`,
      !!two && two.widest && two.widest.need <= two.widest.box + 0.05,
      two && { widest: two.widest, cellW: two.cellW });
    rec.ok(`${label}: the [+] keeps the reference shot's prominence at half width (>= 44x26)`,
      !!two && two.plus && two.plus.w >= 44 && two.plus.h >= 26, two && two.plus);
    console.log(`    ${label} two-col: cell ${two && two.cellW}px  [+] ${two && two.plus && two.plus.w}x${two && two.plus.h}`
      + `  widest "${two && two.widest && two.widest.t}" needs ${two && two.widest && two.widest.need} of ${two && two.widest && two.widest.box}`
      + `  card ${two && two.cardH} in ${two && two.window}  scrolls=${two && two.scrolls}`);

    rec.ok(`${label}: every [+] keeps the "N of M" aria-label mp-prog3 parses`,
      !!card && card.labels.every((l) => / \d+ of \d+\./.test(l || '')), card && card.labels);
    await P.page.screenshot({ path: `${OUT}/catgrid-${label}-bow.png` });

    /* ── THE [+] OPENS THE WINDOW, AND SPENDS NOTHING BY ITSELF ── */
    const before = await pools(P);
    const tappedPlus = await finger(P, '[data-prog3-plus]');
    rec.ok(`${label}: a real finger reaches a row's [+]`, tappedPlus);
    const confirm = await P.page.evaluate(() => {
      const el = document.querySelector('[data-infopopup-action]');
      if (!el) return null;
      const root = el.closest('div[style]') ? el.closest('div[style]').parentElement : document.body;
      return { open: true, text: (root.innerText || '').slice(0, 400) };
    });
    rec.ok(`${label}: ...which opens the spend window`, !!confirm);
    const after = await pools(P);
    rec.ok(`${label}: ...and NOTHING was spent by opening it (a mis-tap costs a window, not a point)`,
      JSON.stringify(before) === JSON.stringify(after), { before, after });
    /* ═══ THE WINDOW IS ALSO THE EXPLAINER ═══
       With the row body inert and the card's [i] explaining the CATEGORY, this
       window is the ONLY route to what an individual stat does. If it stops
       carrying the explanation there is no way to read it at all — which is a
       silent hole, not a visible break, so it is asserted. */
    const expl = await P.page.evaluate(() => {
      const el = document.querySelector('[data-infopopup-body]');
      const demo = document.querySelector('[data-infopopup-demo]');
      const rows = document.querySelector('[data-infopopup-rows]');
      return el ? { text: el.innerText.trim().slice(0, 160), hasDemo: !!demo, hasRows: !!rows } : null;
    });
    rec.ok(`${label}: ...and the window EXPLAINS the stat — the only route to that, now the row body is inert`,
      !!expl && expl.text.length > 20, expl);

    rec.ok(`${label}: the window NAMES THE WEAPON — opened from a Bow row it says Bow`,
      !!confirm && /Bow/i.test(confirm.text), confirm && confirm.text.slice(0, 120));
    await P.page.screenshot({ path: `${OUT}/catgrid-${label}-confirm.png` });

    /* ═══ THE SPEND ITSELF, PORTED FROM mp-statgrid ═══
       Driven once (the behaviour does not vary by viewport, and every run costs
       a worker round trip). This is the coverage that must not be lost when the
       four-column suites retire: that answering the window actually buys the
       point, and that the WORKER charges the lane that owns it — "only the
       point earned in the combat channel can be spent there". */
    if (label === '390-portrait') {
      const b4 = before;
      const spent = await answerConfirm(P, 'confirm', (n) => n.pool !== b4.pool);
      rec.ok(`${label}: answering the window actually buys the point`, !!spent.ok, spent.now && { pool: spent.now.pool });
      const n = spent.now || {};
      rec.ok(`${label}: ...and the WORKER charged the BOW lane, not the shared pool`,
        !!spent.ok && (n.poolBy || {}).bow === (b4.poolBy || {}).bow - 1 && n.shared === b4.shared,
        { beforeBow: (b4.poolBy || {}).bow, afterBow: (n.poolBy || {}).bow, beforeShared: b4.shared, afterShared: n.shared });
      rec.ok(`${label}: ...and the other two weapon lanes did not move`,
        !!spent.ok && (n.poolBy || {}).sword === (b4.poolBy || {}).sword && (n.poolBy || {}).staff === (b4.poolBy || {}).staff,
        { before: b4.poolBy, after: n.poolBy });
    } else {
      await finger(P, '[data-infopopup-close]');
    }

    /* ── SHARED: SEVEN ROWS, THE TIGHTEST CASE ── */
    await finger(P, '[data-prog3-back]');
    const backOk = await has(P, '[data-prog3-grid]');
    rec.ok(`${label}: Back returns to the grid`, backOk);
    await finger(P, '[data-prog3-lane="shared"]');
    const sh = await P.page.evaluate(() => {
      const c = document.querySelector('[data-prog3-card]');
      if (!c) return null;
      const rows = [...c.querySelectorAll('[data-prog3-plus]')];
      /* Shared is the worst case for height: SEVEN stats, so four grid rows
         where a weapon has three. Its card height is the number that answers
         "does two columns remove the scroll". */
      let sc = c.parentElement;
      while (sc && !(sc.scrollHeight - sc.clientHeight > 4 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
      const lastRow = rows[rows.length - 1] && rows[rows.length - 1].parentElement.parentElement;
      return { key: c.getAttribute('data-prog3-card'), n: rows.length,
        allPlus: rows.every((b) => b.getBoundingClientRect().height > 20),
        cardH: +c.getBoundingClientRect().height.toFixed(1),
        window: sc ? sc.clientHeight : null,
        /* The odd seventh spans both columns rather than sitting beside a hole. */
        lastSpans: lastRow ? /1 \/ -1|1\/-1/.test(lastRow.getAttribute('style') || '') : null };
    });
    rec.ok(`${label}: SHARED opens and shows all SEVEN of its stats, each with a [+]`,
      !!sh && sh.key === 'shared' && sh.n === 7 && sh.allPlus, sh);
    if (label === '390-portrait') {
      /* The other half of the two-pool rule: a SHARED stat draws on the shared
         pool and leaves every weapon lane alone. */
      const b5 = await pools(P);
      await finger(P, '[data-prog3-plus]');
      const sSpent = await answerConfirm(P, 'confirm', (n) => n.shared !== b5.shared);
      const n5 = sSpent.now || {};
      rec.ok(`${label}: a SHARED stat spends the SHARED pool`,
        !!sSpent.ok && n5.shared === b5.shared - 1,
        { before: b5.shared, after: n5.shared });
      rec.ok(`${label}: ...and no weapon lane paid for it`,
        !!sSpent.ok && JSON.stringify(n5.poolBy) === JSON.stringify(b5.poolBy),
        { before: b5.poolBy, after: n5.poolBy });
    }
    console.log(`    ${label} SHARED: ${sh && sh.n} stats, card ${sh && sh.cardH} in ${sh && sh.window}`
      + `  lastSpansBothColumns=${sh && sh.lastSpans}`);
    rec.ok(`${label}: Shared's odd seventh stat spans both columns — not a half cell beside a hole`,
      land ? true : (!!sh && sh.lastSpans === true), sh && { lastSpans: sh.lastSpans });
    await P.page.screenshot({ path: `${OUT}/catgrid-${label}-shared.png` });

    /* ── THE ONE-COLUMN COMPARISON, for the owner to choose between ──
       Two columns cost the [+] about a quarter of its width. `?p3cols=1`
       renders the same card in one column with the [+] at its full reference
       size, so the trade can be looked at rather than described. */
    if (!land && label === '360-portrait') {
      await P.page.evaluate(() => history.replaceState({}, '', `${location.pathname}?p3cols=1`));
      await finger(P, '[data-prog3-back]');
      await finger(P, '[data-prog3-lane="shared"]');
      const one = await P.page.evaluate(() => {
        const c = document.querySelector('[data-prog3-card]');
        const plus = c && c.querySelector('[data-prog3-plus]');
        return c ? { cardH: +c.getBoundingClientRect().height.toFixed(1),
          plusW: plus ? +plus.getBoundingClientRect().width.toFixed(1) : null } : null;
      });
      console.log(`    360 ONE-COLUMN comparison: card ${one && one.cardH}  [+] ${one && one.plusW}px wide`);
      await P.page.screenshot({ path: `${OUT}/catgrid-360-portrait-onecol.png` });
      await P.page.evaluate(() => history.replaceState({}, '', location.pathname));
    }

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
