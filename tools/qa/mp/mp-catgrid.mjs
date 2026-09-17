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
    /* ═══ THE CARD'S [i] EXPLAINS THE CATEGORY ═══
       Ported from mp-prog3, whose four-column accordion block retires with the
       layout it tested.  This is not the per-stat glyph v2.3.2595 removed: it
       is the LANE explainer, the same one the dashboard's combat pills open, so
       the two screens say one thing about one skill.  Only driven at one
       viewport — it is behaviour, not geometry. */
    if (label === '390-portrait') {
      const infoTapped = await finger(P, '[data-lane-info]');
      const laneInfo = await P.page.evaluate(() => {
        const el = document.querySelector('[data-infopopup]');
        return el ? { title: el.getAttribute('data-infopopup'), text: el.innerText.slice(0, 120) } : null;
      });
      rec.ok(`${label}: the card's [i] opens the CATEGORY explainer, captioned for it`,
        !!infoTapped && !!laneInfo && /bow/i.test(laneInfo.title + laneInfo.text), laneInfo);
      /* ...and it is not the spend window: nothing here may commit a point. */
      rec.ok(`${label}: ...and that explainer carries no spend action`,
        await P.page.evaluate(() => !document.querySelector('[data-infopopup-action]')));
      await P.page.keyboard.press('Escape');
      await P.page.waitForTimeout(260);
      rec.ok(`${label}: ...and Escape closes it`,
        await P.page.evaluate(() => !document.querySelector('[data-infopopup]')));
    }

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

    /* ═══ v2.3.2605: THE WAY OUT MUST BE ON THE SCREEN ═══
       The window had no height cap and the scrim centres it, so a card taller
       than the viewport hung off both ends and took its buttons with it. At
       360x360 — a phone in landscape — "Spend point" and "Got it" sat 13 to
       44px BELOW the bottom edge on every stat whose window carries a scene,
       which is nine of the thirteen. A tap at the button's centre lands
       outside the viewport, so the window could not be dismissed at all.
       This is asserted at EVERY viewport, not just the landscape ones, and on
       the buttons rather than on the card: a card that scrolls its middle is
       fine, a button below the fold is not. */
    const reach = await P.page.evaluate(() => {
      const card = document.querySelector('[data-infopopup-card]');
      if (!card) return null;
      const vh = window.innerHeight, vw = window.innerWidth;
      const box = (sel) => { const e = card.querySelector(sel); if (!e) return null;
        const r = e.getBoundingClientRect();
        return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1),
          off: +Math.max(0, r.bottom - vh, -r.top, r.right - vw, -r.left).toFixed(1) }; };
      const cr = card.getBoundingClientRect();
      return { vh, card: { h: +cr.height.toFixed(1), off: +Math.max(0, cr.bottom - vh, -cr.top).toFixed(1) },
        action: box('[data-infopopup-action]'), close: box('[data-infopopup-close]'),
        scrolls: !!card.querySelector('[data-infopopup-scroll]') };
    });
    rec.ok(`${label}: the window's buttons are ON the screen — both of them, fully`,
      !!reach && !!reach.action && !!reach.close
        && reach.action.off === 0 && reach.close.off === 0, reach);
    rec.ok(`${label}: ...and the card itself never hangs off the viewport`,
      !!reach && reach.card.off === 0 && reach.card.h <= reach.vh, reach && reach.card);
    console.log(`    window: card ${reach && reach.card.h} of ${reach && reach.vh}, buttons off by ${reach && reach.action && reach.action.off}/${reach && reach.close && reach.close.off}`);

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
        cardW: +c.getBoundingClientRect().width.toFixed(1),
        window: sc ? sc.clientHeight : null,
        /* v2.3.2601: Resist, the odd seventh, is ONE column like every other
           cell (it spanned both until the owner said otherwise). Measured as
           rendered widths rather than read off a style attribute — the point
           is that the cells are the same size on screen, not how that was
           spelled. */
        widths: rows.map((b) => +b.parentElement.parentElement.getBoundingClientRect().width.toFixed(1)),
        lastW: lastRow ? +lastRow.getBoundingClientRect().width.toFixed(1) : null };
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
    const ws = (sh && sh.widths) || [];
    const spread = ws.length ? +(Math.max(...ws) - Math.min(...ws)).toFixed(1) : null;
    console.log(`    ${label} SHARED: ${sh && sh.n} stats, card ${sh && sh.cardH} in ${sh && sh.window}`
      + `  cells ${ws[0]}px, last ${sh && sh.lastW}px (spread ${spread})`);
    rec.ok(`${label}: every Shared cell is the SAME width — Resist included, one column not two`,
      ws.length === 7 && spread !== null && spread <= 1, { widths: ws, spread });
    /* Same-width alone would also pass if EVERY cell went full width, so the
       half-width claim is checked against the card it sits in. Landscape is one
       column by design, so it is exempt. */
    rec.ok(`${label}: ...and in two columns that width really is HALF the card, not a full row`,
      land ? true : (!!sh && sh.lastW < sh.cardW * 0.6),
      sh && { lastW: sh.lastW, cardW: sh.cardW });

    /* v2.3.2611: inside a card there is no instruction line — the grid's one
       said it already and the [+] is the row's only control. Asserted by the
       TEXT rather than by counting elements, so it stays true if the line moves. */
    const hint = await P.page.evaluate(() => {
      const t = document.body.innerText || '';
      return { inCard: /Tap \+ to spend/i.test(t), grid: /Tap a category/i.test(t) };
    });
    rec.ok(`${label}: a category card carries NO "tap + to spend" line`, !!hint && hint.inCard === false, hint);

    /* ═══ v2.3.2611: THE SHARED CARD'S LABELS, MEASURED ═══
       The sub-pixel clip check above runs on the FIRST card opened, which is a
       weapon — and every weapon label is short. Shared carries the long ones
       ("Max Mana", "Stamina", "Defense") and was never measured, which is how
       "Max Mana" came to render as an ellipsis at 360 unnoticed. Measured with
       a Range because scrollWidth is an integer and hid a 0.14px overflow once
       (v2.3.2597). */
    const clip = await P.page.evaluate(() => {
      return [...document.querySelectorAll('[data-prog3-row]')].map((r) => {
        const lab = r.querySelector('span');
        if (!lab) return null;
        const rg = document.createRange(); rg.selectNodeContents(lab);
        const nat = rg.getBoundingClientRect().width;
        const box = lab.getBoundingClientRect().width;
        return { t: lab.textContent, over: +(nat - box).toFixed(2) };
      }).filter(Boolean);
    });
    const worstClip = clip.reduce((a, b) => (b.over > a.over ? b : a), clip[0] || { t: '?', over: 99 });
    rec.ok(`${label}: no Shared label is cut off by its own cell (worst "${worstClip.t}" ${worstClip.over}px over)`,
      clip.length === 7 && worstClip.over <= 0.05, clip.filter((c) => c.over > 0.05));
    console.log(`    labels: worst "${worstClip.t}" ${worstClip.over}px over its box`);

    /* ═══ v2.3.2602: THE ICON CENTRED IN THE GAP ═══
       Owner: "center the icon between the label and the plus sign on each
       cell."  Centred in the space that is ACTUALLY LEFT — between the label's
       right edge and the [+]'s left edge — not centred on the cell, which
       would drift once one row's label is wider than another's.  So it is
       measured per row against that row's own two neighbours.
       The flex gap sets a MINIMUM clearance either side of the icon, and the
       auto margins only distribute what is left over. So the contract that
       actually has to hold at every width is SYMMETRY — left clearance equals
       right — and it survives even when the leftover reaches zero, because the
       two minimums are equal. `free` reports that leftover so a row running out
       of it is visible rather than silently rounded away. */
    const centred = await P.page.evaluate(() => {
      return [...document.querySelectorAll('[data-prog3-row]')].map((r) => {
        const lab = r.querySelector('span'), img = r.querySelector('img');
        const plus = r.querySelector('[data-prog3-plus]');
        if (!lab || !img || !plus) return null;
        const l = lab.getBoundingClientRect(), i = img.getBoundingClientRect(), b = plus.getBoundingClientRect();
        const gapL = i.left - l.right, gapR = b.left - i.right;
        const min = parseFloat(getComputedStyle(r).columnGap) || 0;
        return { k: (r.getAttribute('data-prog3-row') || '').split(':').pop(),
          off: +((i.left + i.width / 2) - (l.right + b.left) / 2).toFixed(2),
          gapL: +gapL.toFixed(2), gapR: +gapR.toFixed(2),
          free: +(Math.min(gapL, gapR) - min).toFixed(2) };
      }).filter(Boolean);
    });
    const worstOff = centred.reduce((a, b) => (Math.abs(b.off) > Math.abs(a.off) ? b : a), centred[0] || { k: '?', off: 99 });
    const tightest = centred.reduce((a, b) => (b.free < a.free ? b : a), centred[0] || { k: '?', free: -99 });
    console.log(`    icon centring: worst ${worstOff.k} ${worstOff.off}px off, least free space ${tightest.k} ${tightest.free}px`);
    rec.ok(`${label}: every icon sits CENTRED in its own row's gap (worst ${worstOff.k} ${worstOff.off}px)`,
      centred.length === 7 && Math.abs(worstOff.off) <= 0.75, centred.map((c) => `${c.k} ${c.off}`));
    /* The one that has to hold on the longest label at the narrowest cell:
       clearance is equal on both sides and never falls under the row's own gap,
       so even a row with no leftover space still reads as centred. */
    rec.ok(`${label}: ...and no icon is closer to the [+] than to the label, even where the leftover space runs out (least free ${tightest.k} ${tightest.free}px)`,
      centred.length === 7 && centred.every((c) => Math.abs(c.gapL - c.gapR) <= 0.75 && c.free >= -0.01),
      centred.map((c) => `${c.k} L${c.gapL} R${c.gapR} free${c.free}`));
    /* ═══ THE PER-STAT COLOURS, MEASURED AS RENDERED ═══
       Asserting the authored hex would prove nothing — the question the whole
       palette analysis turned on is whether the colours survive the way they
       are DRAWN.  So this reads the computed spine off each row and checks the
       seven Shared stats are mutually distinguishable by CIEDE2000, the floor
       mp-monsterplate pins at 12.  (The full 78-pair sweep lives in
       tools/qa/mp/palette-mock4.mjs; this is the on-screen guard.) */
    if (label === '390-portrait') {
      /* v2.3.2598: the colour is the cell's BACKGROUND now, not a spine — and
         the label's ink and the [+]'s outline come with it, so all three are
         read off the rendered cell rather than trusted. */
      const spines = await P.page.evaluate(() => {
        const out = [];
        const rgb = (v) => { const m = (v || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m ? [+m[1], +m[2], +m[3]] : null; };
        document.querySelectorAll('[data-prog3-row]').forEach((r) => {
          const b = r.querySelector('[data-prog3-plus]');
          const lab = r.querySelector('span');
          const bg = rgb(getComputedStyle(r).backgroundColor);
          if (bg) out.push({ k: r.getAttribute('data-prog3-row'),
            label: (b && b.getAttribute('aria-label') || '').split(',')[0],
            rgb: bg,
            ink: lab ? rgb(getComputedStyle(lab).color) : null,
            plusBorder: b ? rgb(getComputedStyle(b).borderTopColor) : null });
        });
        return out;
      });
      rec.ok(`${label}: every Shared stat draws a colour spine`,
        spines.length === 7, spines.map((x) => x.label));
      /* CIEDE2000, computed here rather than imported, so the assertion reads
         the same numbers the palette tools do. */
      const lab = ([r, g, b]) => {
        const f = (c) => { c /= 255; return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92; };
        const [R, G, B] = [f(r), f(g), f(b)];
        const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
        const Y = (0.2126 * R + 0.7152 * G + 0.0722 * B);
        const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
        const g2 = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
        return [116 * g2(Y) - 16, 500 * (g2(X) - g2(Y)), 200 * (g2(Y) - g2(Z))];
      };
      /* CIE76 is enough to catch a COLLISION; the palette tools do full
         CIEDE2000 and report 2 of 78 under the floor, both owner-fixed. */
      const d = (a, b) => { const A = lab(a), B = lab(b);
        return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
      let worst = Infinity, pair = '';
      for (let i = 0; i < spines.length; i++) for (let j = i + 1; j < spines.length; j++) {
        const v = d(spines[i].rgb, spines[j].rgb);
        if (v < worst) { worst = v; pair = `${spines[i].label}/${spines[j].label}`; }
      }
      console.log(`    colour spines: ${spines.length}, worst pair ${pair} = ${worst.toFixed(1)}`);
      rec.ok(`${label}: ...and no two Shared stats share a colour (worst pair ${pair} ${worst.toFixed(1)})`,
        spines.length === 7 && worst > 12, { pair, worst: +worst.toFixed(1) });

      /* ═══ WHAT AN OPAQUE FILL PUTS AT RISK ═══
         A coloured cell only works if what sits ON it still reads.  Both are
         measured as rendered: the label's ink, and the [+]'s outline, which
         exists because gold against these fills is 1.10:1 to 1.88:1 — under the
         floor on every one of the thirteen. */
      const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92; };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const inks = spines.filter((x) => x.ink).map((x) => ({ k: x.label, c: ratio(x.ink, x.rgb) }));
      const worstInk = inks.reduce((a, b) => (b.c < a.c ? b : a), inks[0] || { k: '?', c: 0 });
      /* v2.3.2599: the orb the owner asked to remove must be GONE, and the
         stat's own icon — the thing they want bigger — must still be there.
         Asserted together because the risk in "remove the small circle" is
         removing the wrong round thing. */
      const iconry = await P.page.evaluate(() => {
        const rows = [...document.querySelectorAll('[data-prog3-row]')];
        return { orbs: document.querySelectorAll('[data-pt-orb]').length,
          icons: rows.filter((r) => r.querySelector('img')).length,
          iconW: rows[0] && rows[0].querySelector('img')
            ? +rows[0].querySelector('img').getBoundingClientRect().width.toFixed(1) : null };
      });
      rec.ok(`${label}: the point orb is gone from every row`, iconry.orbs === 0, iconry);
      rec.ok(`${label}: ...and every row still has its stat icon, larger (${iconry.iconW}px, was 13 before the redesign)`,
        iconry.icons === 7 && iconry.iconW >= 30, iconry);
      console.log(`    icons: ${iconry.iconW}px (${(iconry.iconW / 13).toFixed(1)}x the original 13), orbs ${iconry.orbs}`);

      rec.ok(`${label}: every label still reads on its coloured cell (worst ${worstInk.k} ${worstInk.c.toFixed(2)}:1, AA 4.5)`,
        inks.length === 7 && worstInk.c >= 4.5, inks.map((i) => `${i.k} ${i.c.toFixed(1)}`));
      const edges = spines.filter((x) => x.plusBorder).map((x) => ({ k: x.label, c: ratio(x.plusBorder, x.rgb) }));
      const worstEdge = edges.reduce((a, b) => (b.c < a.c ? b : a), edges[0] || { k: '?', c: 0 });
      rec.ok(`${label}: ...and the [+] keeps a visible edge on every fill (worst ${worstEdge.k} ${worstEdge.c.toFixed(2)}:1)`,
        edges.length === 7 && worstEdge.c >= 3, edges.map((e) => `${e.k} ${e.c.toFixed(1)}`));
      console.log(`    fills: worst label ${worstInk.k} ${worstInk.c.toFixed(2)}:1, worst [+] edge ${worstEdge.k} ${worstEdge.c.toFixed(2)}:1`);

      /* ═══ v2.3.2600: THE GREY EDGE, AND THE TWO SEAMS ═══
         Owner: "a gray border around each cell", and "make sure the cells don't
         slide above the headers."  Both are asserted as RENDERED, because both
         failed silently once already: `COL.panel` is not a palette key, so the
         card header's background computed to rgba(0,0,0,0) and the rows scrolled
         visibly through a header that was still there in the DOM.  A geometry
         check alone would have called that fine. */
      const edge = await P.page.evaluate(() => {
        const rgb = (v) => { const m = (v || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return m ? [+m[1], +m[2], +m[3]] : null; };
        const rows = [...document.querySelectorAll('[data-prog3-row]')];
        return rows.map((r) => { const cs = getComputedStyle(r);
          return { k: r.getAttribute('data-prog3-row'),
            w: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map(parseFloat),
            col: rgb(cs.borderTopColor), fill: rgb(cs.backgroundColor) }; });
      });
      const allFour = edge.every((e) => e.w.every((w) => w >= 1));
      const oneColour = new Set(edge.map((e) => (e.col || []).join(','))).size === 1;
      const edgeInk = edge.map((e) => ({ k: e.k, c: ratio(e.col, e.fill) }));
      const worstRim = edgeInk.reduce((a, b) => (b.c < a.c ? b : a), edgeInk[0] || { k: '?', c: 0 });
      rec.ok(`${label}: every cell is ringed on all four sides by ONE grey border`,
        edge.length === 7 && allFour && oneColour, edge.map((e) => `${e.k} ${e.w.join('/')}`));
      rec.ok(`${label}: ...and that border stands off every fill it rings (worst ${worstRim.k} ${worstRim.c.toFixed(2)}:1)`,
        worstRim.c >= 1.5, edgeInk.map((e) => `${e.k} ${e.c.toFixed(2)}`));
      console.log(`    rim: ${(edge[0] && edge[0].col || []).join(',')}, worst standoff ${worstRim.k} ${worstRim.c.toFixed(2)}:1`);

    /* ═══ v2.3.2611: THE [+] FLUSH, AND ONE INSTRUCTION NOT TWO ═══
       Owner: "Move plus sign to the very edge of the cell there's some space
       showing", and "Remove 'tap + to spend a point' row".
       The [+]'s clearance is measured on all four sides against the cell's
       BORDER box, which is what separates the two things that look the same:
       1px on every side is the grey border, and the [+] belongs inside it;
       anything MORE than that is padding, which is the space they saw (it was
       5 on the right — 1 border + 4 padding). */
      const flush = await P.page.evaluate(() => {
        const r = document.querySelector('[data-prog3-row]');
        const b = r && r.querySelector('[data-prog3-plus]');
        if (!r || !b) return null;
        const c = r.getBoundingClientRect(), p = b.getBoundingClientRect();
        return { top: +(p.top - c.top).toFixed(2), right: +(c.right - p.right).toFixed(2),
          bottom: +(c.bottom - p.bottom).toFixed(2),
          border: parseFloat(getComputedStyle(r).borderRightWidth) };
      });
      rec.ok(`${label}: the [+] is FLUSH to the cell — its only clearance is the 1px border itself`,
        !!flush && flush.right <= flush.border + 0.01
          && flush.top <= flush.border + 0.01 && flush.bottom <= flush.border + 0.01, flush);
      console.log(`    [+] clearance: top ${flush && flush.top} right ${flush && flush.right} bottom ${flush && flush.bottom} (border ${flush && flush.border})`);

      /* Scroll the card HALF a row and look at the strip between the scroller's
         own top edge and the card header's bottom.  Nothing in it may carry a
         cell's fill: that is what "sliding above the headers" looks like, and it
         is the one thing a hit-test cannot see. */
      const seam = await P.page.evaluate(() => {
        const t = [...document.querySelectorAll('[role="button"][aria-pressed]')]
          .find((e) => /Equipment/i.test(e.getAttribute('aria-label') || ''));
        if (!t) return null;
        const row = t.parentElement;
        let sc = row.parentElement;
        while (sc && !(sc.scrollHeight - sc.clientHeight > 4 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
        if (!sc) return null;
        sc.scrollTop = 200;
        const card = document.querySelector('[data-prog3-card]');
        const hd = card && card.firstElementChild;
        const sr = sc.getBoundingClientRect(), rr = row.getBoundingClientRect();
        const hr = hd ? hd.getBoundingClientRect() : null;
        const alpha = (v) => { const m = (v || '').match(/rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/); return m ? +m[1] : 1; };
        return { aboveTabs: +(rr.top - sr.top).toFixed(2),
          tabsToHeader: hr ? +(hr.top - rr.bottom).toFixed(2) : null,
          tabsOpaque: alpha(getComputedStyle(row).backgroundColor) === 1,
          headOpaque: hd ? alpha(getComputedStyle(hd).backgroundColor) === 1 : false,
          band: hr ? { x: Math.round(sr.left), y: Math.round(sr.top),
            width: Math.round(sr.width), height: Math.max(1, Math.round(hr.bottom - sr.top)) } : null };
      });
      await P.page.waitForTimeout(260);
      rec.ok(`${label}: the tab row pins FLUSH to the scroller's edge — no strip for cells to show through`,
        !!seam && seam.aboveTabs === 0, seam && { aboveTabs: seam.aboveTabs });
      rec.ok(`${label}: ...and the card header pins FLUSH under the tab row`,
        !!seam && seam.tabsToHeader === 0, seam && { tabsToHeader: seam.tabsToHeader });
      rec.ok(`${label}: ...and both headers are OPAQUE (a transparent sticky bar is still "sliding above")`,
        !!seam && seam.tabsOpaque && seam.headOpaque, seam && { tabs: seam.tabsOpaque, head: seam.headOpaque });
      if (seam && seam.band) {
        const png = await P.page.screenshot({ clip: seam.band });
        const bleed = await P.page.evaluate(async ({ src, fills }) => {
          const img = new Image();
          await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = src; });
          const cv = document.createElement('canvas');
          cv.width = img.width; cv.height = img.height;
          const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
          const d = cx.getImageData(0, 0, cv.width, cv.height).data;
          let hits = 0, worst = null;
          for (let i = 0; i < d.length; i += 4) {
            for (const f of fills) {
              if (Math.abs(d[i] - f[0]) <= 6 && Math.abs(d[i + 1] - f[1]) <= 6 && Math.abs(d[i + 2] - f[2]) <= 6) {
                hits++; worst = [d[i], d[i + 1], d[i + 2]]; break;
              }
            }
          }
          return { px: cv.width * cv.height, hits, worst };
        }, { src: `data:image/png;base64,${png.toString('base64')}`, fills: spines.map((x) => x.rgb) });
        rec.ok(`${label}: mid-scroll, NO cell fill appears anywhere above the card header's bottom edge (${bleed.hits}/${bleed.px}px)`,
          bleed.hits === 0, bleed);
        console.log(`    seam band ${seam.band.height}px tall, ${bleed.hits} cell-coloured pixels`);
        await P.page.screenshot({ path: `${OUT}/catgrid-seam.png`, clip: seam.band });
      }
    }
    await P.page.screenshot({ path: `${OUT}/catgrid-${label}-shared.png` });

    /* The uncoloured comparison, for the owner to choose between. */
    if (label === '390-portrait') {
      await P.page.evaluate(() => history.replaceState({}, '', `${location.pathname}?p3colour=0`));
      await finger(P, '[data-prog3-back]');
      await finger(P, '[data-prog3-lane="shared"]');
      await P.page.screenshot({ path: `${OUT}/catgrid-390-portrait-nocolour.png` });
      await P.page.evaluate(() => history.replaceState({}, '', location.pathname));
    }

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
