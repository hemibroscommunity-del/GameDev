/* ═══ THE POINTS SCREEN IS FOUR COLUMNS — MELEE | MAGIC | BOW | SHARED ═══
 * (v2.3.2592; was an accordion over a shared band, v2.3.2512; a 4 + 3 + 2
 * grid under a selector row, v2.3.2441)
 *
 * Owner: "Right now spending and applying and using combat points is not a
 * fun experience ... The points section of the character tab should have a 4
 * column layout: melee, staff, bow, and shared.  Each column label should
 * have its combat icon centered above the label.  You can use the character
 * portrait for the 'shared' icon.  Points allocable (if any) will be to the
 * left of each icon."  And the economy under it: "for every point earned
 * through one of the 3 combat channels, you earn one 'shared' point too.  You
 * get both points but only the point earned in the combat channel can be spent
 * there (the point for shared can be allocated to any in that shared pool)."
 *
 * ── WHY THIS FILE, WHEN mp-prog3 AND mp-statcols ALSO OPEN THIS SCREEN ──
 * They own different questions.  mp-prog3 asks what the panel DOES with an
 * empty pool and whether every cell is reachable at three phone sizes;
 * mp-statcols asks whether anything CLIPS at three widths.  Neither knows
 * which column a cell is in, what a header carries, or whose pool a spend
 * came off — which is the entire content of what the owner asked for.
 *
 * ── THE ONES THAT MATTER MOST ARE THE LAST TWO ──
 * A real finger in the middle of a LANE cell must debit that lane's pool and
 * leave the shared pool alone, and a finger on a SHARED cell must do the
 * reverse — read back from the WORKER's blob, because the client's counts
 * are what the ack told it and the ack is what is under test.  That is the
 * owner's second sentence, proven end to end through the screen he asked for.
 * The centre-of-cell tap is kept from v2.3.2441 (an inline info button once
 * swallowed it; invisible in a screenshot, so it stays pinned).
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const ROW = '[role="button"][aria-label*=" of "]';
const LANE_ORDER = ['sword', 'staff', 'bow', 'shared'];
/* The closed strip's width, from HeroExpanded's COL_CLOSED_W.  Kept here as a
   number the assertions read rather than inlined three times: it moved 58 ->
   64 at v2.3.2595 when the owner reported clipped numbers on the strips, and
   an inlined 58 is how a width check quietly stops meaning anything. */
const CLOSED_W = 64;
const LANE_STATS = ['Range', 'Power', 'Speed', 'Luck', 'Special', 'Elemental'];
const SHARED_STATS = ['Max HP', 'Defense', 'Max Mana', 'Stamina', 'Dodge', 'Move Speed', 'Elem Resist'];

/* Every cell, grouped into the COLUMN it renders in — read off the
   `[data-prog3-col]` ancestor the client ships for exactly this, never off
   an assumed x. */
const readGrid = (P) => P.page.evaluate((ROWSEL) => {
  const body = document.querySelector('[data-prog3-points]');
  if (!body) return { err: 'no prog3 body' };
  const cells = [...body.querySelectorAll(ROWSEL)].map((el) => {
    const r = el.getBoundingClientRect();
    const label = el.getAttribute('aria-label') || '';
    const colEl = el.closest('[data-prog3-col]');
    return {
      col: colEl ? colEl.getAttribute('data-prog3-col') : null,
      stat: label.split(',')[0].replace(/ for (sword|bow|staff)$/, '').trim(),
      aria: label,
      x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2),
      text: [...el.querySelectorAll('span')]
        .filter((s) => !s.children.length && !s.hasAttribute('data-pt-orb')
          && !(s.parentElement && s.parentElement.hasAttribute('data-stat-info')))
        .map((s) => (s.textContent || '').trim()).filter(Boolean),
      /* v2.3.2595: `data-stat-info` is the CELL now, not a button in its
         corner — the owner: "Remove the 'i' and just make the explanation
         launch if they press any other part of the cell than the plus sign."
         So what is read here is the [+] that took the corner's place, and
         whether the cell itself carries the explainer handle. */
      selfInfo: el.hasAttribute('data-stat-info'),
      plus: (() => {
        const b = el.querySelector('[data-prog3-plus]');
        if (!b) return null;
        const br = b.getBoundingClientRect();
        return { w: Math.round(br.width), h: Math.round(br.height),
          l: Math.round(br.left), r: Math.round(br.right),
          t: Math.round(br.top), b: Math.round(br.bottom),
          cx: Math.round(br.left + br.width / 2), cy: Math.round(br.top + br.height / 2),
          aria: b.getAttribute('aria-label') || '', dis: b.getAttribute('aria-disabled') };
      })(),
    };
  });
  const cols = {};
  for (const c of cells) (cols[c.col] = cols[c.col] || []).push(c);
  const order = [...body.querySelectorAll('[data-prog3-col]')].map((d) => d.getAttribute('data-prog3-col'));
  const chev = [...body.querySelectorAll('div')]
    .find((d) => !d.children.length && (d.textContent || '').trim() === '▾');
  const br = body.getBoundingClientRect();
  return {
    order, cols, cells,
    bodyH: Math.round(br.height), bodyW: Math.round(br.width),
    chevron: chev ? {
      opacity: parseFloat(getComputedStyle(chev).opacity),
      role: chev.getAttribute('role'), hidden: chev.getAttribute('aria-hidden'),
    } : null,
  };
}, ROW);

/* The four column headers, with the geometry the owner's three sentences
   are about: icon centred, badge to its left, name under it. */
const readHeads = (P) => P.page.evaluate(() => (
  [...document.querySelectorAll('[data-prog3-lane]')].map((t) => {
    const hr = t.getBoundingClientRect();
    const badge = t.querySelector('[aria-label*="points to spend"]');
    const img = t.querySelector('img');
    const spans = [...t.querySelectorAll('span')].filter((s) => !s.children.length);
    const name = (t.getAttribute('aria-label') || '').split(',')[0].trim();
    const label = spans.find((s) => (s.textContent || '').trim() === name);
    const lv = spans.find((s) => /^Lv\s+\d+$/i.test((s.textContent || '').trim()));
    const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
      return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom),
        cx: Math.round(r.left + r.width / 2), w: Math.round(r.width), h: Math.round(r.height) }; };
    return {
      k: t.getAttribute('data-prog3-lane'),
      aria: t.getAttribute('aria-label'), title: t.getAttribute('title'),
      role: t.getAttribute('role'), expanded: t.getAttribute('aria-expanded'),
      head: rect(t), cx: Math.round(hr.left + hr.width / 2), h: Math.round(hr.height),
      sticky: getComputedStyle(t.parentElement).position,
      badge: badge ? { ...rect(badge), text: (badge.textContent || '').trim(),
        visible: getComputedStyle(badge).visibility !== 'hidden',
        bg: getComputedStyle(badge).backgroundColor,
        fs: parseFloat(getComputedStyle(badge).fontSize) } : null,
      badgeCount: [...t.querySelectorAll('[aria-label*="points to spend"]')].length,
      icon: img ? { ...rect(img), src: img.getAttribute('src') || '', fit: getComputedStyle(img).objectFit } : null,
      /* v2.3.2595: the WORD's own overflow, which is the owner's "I just want
         each word to fit in the column".  A label that ellipsises has
         scrollWidth > clientWidth and an unchanged bounding box, so the rect
         alone cannot answer it. */
      label: label ? { ...rect(label), text: label.textContent.trim(),
        sw: Math.round(label.scrollWidth), cw: Math.round(label.clientWidth) } : null,
      lv: lv ? lv.textContent.trim() : null,
    };
  })
));

async function openPoints(P) {
  await H.openDest(P, 'Character');
  await P.page.waitForTimeout(700);
  await P.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]')
    .first().click({ timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(1000);
}

/* ═══ v2.3.2593: A REAL THUMB ON A COLUMN HEADER ═══
   CDP touch with drift, not a dispatched PointerEvent, and the repo has paid
   twice to learn the difference: a synthetic dispatch cannot be confiscated
   by the sheet's scroller, so it stayed green through two rounds of the
   owner reporting an accordion that would not collapse (v2.3.2326).  The
   drift is the point — every real thumb moves 15-20px on a 44px control. */
async function touchDrift(P, x, y, drift = 16) {
  const cdp = await P.page.context().newCDPSession(P.page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 4; i++) {
    await new Promise((r) => setTimeout(r, 20));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (drift * i) / 4 }] });
  }
  await new Promise((r) => setTimeout(r, 20));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

async function tapHead(P, key, drift = 16) {
  const at = await P.page.evaluate((k) => {
    const el = document.querySelector(`[data-prog3-lane="${k}"]`);
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
    const hit = document.elementFromPoint(x, y);
    return { x, y, onLane: !!(hit && hit.closest && hit.closest(`[data-prog3-lane="${k}"]`)) };
  }, key);
  if (!at || !at.onLane) return false;
  await touchDrift(P, at.x, at.y, drift);
  await P.page.waitForTimeout(320);   /* the 140ms width transition, with room */
  return true;
}

/* Which columns are open, and how wide each one is — the two halves of a
   horizontal accordion, read together so a column that "opened" without
   taking any width cannot pass. */
const readCols = (P) => P.page.evaluate(() => (
  [...document.querySelectorAll('[data-prog3-lane]')].map((h) => {
    const body = document.querySelector(`[data-prog3-col="${h.getAttribute('data-prog3-lane')}"]`);
    return {
      k: h.getAttribute('data-prog3-lane'),
      open: h.getAttribute('aria-expanded') === 'true',
      headW: Math.round(h.getBoundingClientRect().width),
      bodyW: body ? Math.round(body.getBoundingClientRect().width) : null,
      cells: body ? body.querySelectorAll('[role="button"][aria-label*=" of "]').length : 0,
      info: !!h.querySelector('[data-lane-info]'),
    };
  })
));

/* The worker's own copy of the two pools and every allocation — the thing a
   spend is measured against. */
async function serverPools(wsPort, myId) {
  const admin = await H.adminPlayer(wsPort, myId);
  const p3 = admin && admin.rpg && admin.rpg.prog3;
  if (!p3) return null;
  return {
    pool: p3.pool || 0, shared: p3.shared || 0,
    poolBy: { ...(p3.poolBy || {}) },
    atk: JSON.parse(JSON.stringify(p3.atk || {})),
    alloc: { ...(p3.alloc || {}) },
  };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Grid', wsPort, webPort,
    viewport: PHONE, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);
  const myId = await H.readState(P, (S) => S.myId);

  /* Real points from the worker's own level-up path, so the gold badges and
     both real spends are exercised: the devkit awards XP through
     _prog3AwardXp, which mints the lane points AND the shared points. */
  await fetch(`http://127.0.0.1:${wsPort}/api/admin/dev/kit`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: myId, what: 'levels' }),
  }).then((r) => r.json()).catch(() => null);
  await P.page.waitForTimeout(1500);
  const pools0 = await H.readState(P, (S) => ({
    pool: (S.rpg && S.rpg.prog3 && S.rpg.prog3.pool) || 0,
    shared: (S.rpg && S.rpg.prog3 && S.rpg.prog3.shared) || 0,
    caps: !!(S._serverCaps && S._serverCaps.prog3shared),
  }));
  rec.ok('the worker advertises the shared-pool grid (guard)', pools0.caps === true, pools0);
  rec.ok('the worker minted a real LANE pool (guard)', pools0.pool >= 3, pools0);
  rec.ok('...and a real SHARED pool beside it — one per lane point (v2.3.2592)',
    pools0.shared >= 3, pools0);

  await openPoints(P);

  /* ════════ 0. THE RESTING STATE: ALL FOUR SHUT ════════
     Owner: "the default view should also to have them all closed."  Four
     strips and a line telling you what to do — no cells, nothing spendable,
     nothing to scroll. */
  const rest = await readCols(P);
  console.log('    at rest: ' + JSON.stringify(rest));
  rec.ok('the screen opens with all four columns CLOSED (v2.3.2593)',
    rest.length === 4 && rest.every((c) => c.open === false && c.cells === 0), rest);
  rec.ok('...sharing the width equally, because four strips is not a layout',
    rest.length === 4 && new Set(rest.map((c) => c.headW)).size === 1, rest.map((c) => c.headW));
  const restHint = await P.page.evaluate(() => {
    const body = document.querySelector('[data-prog3-points]');
    if (!body) return null;
    const hint = [...body.querySelectorAll('div')].find((d) => !d.children.length
      && /tap a column/i.test(d.textContent || ''));
    const chev = [...body.querySelectorAll('div')].find((d) => !d.children.length && (d.textContent || '').trim() === '▾');
    return { hint: hint ? hint.textContent.trim() : null, chevron: !!chev };
  });
  rec.ok('...with a line saying what to do, and no scroll cue for a screen with nothing to scroll',
    !!restHint && !!restHint.hint && restHint.chevron === false, restHint);
  rec.ok('...and no column shows an ℹ️ while it is shut (a 58px strip is already full)',
    rest.every((c) => c.info === false), rest.map((c) => [c.k, c.info]));

  /* ════════ 0b. OPENING ONE WIDENS IT AND NARROWS THE REST ════════
     The whole of "opening and closing horizontally": the open column takes
     the width the closed ones give up.  Asserted as a RELATIONSHIP, not a
     pixel count, so a retune of the strip width cannot break it. */
  rec.ok('the Melee header can be tapped (guard)', await tapHead(P, 'sword'), {});
  const one = await readCols(P);
  console.log('    one open: ' + JSON.stringify(one));
  const mel = one.find((c) => c.k === 'sword');
  const shut = one.filter((c) => c.k !== 'sword');
  rec.ok('tapping a column header OPENS it — its stats appear',
    !!mel && mel.open === true && mel.cells === 6, mel);
  rec.ok('...and it takes the width the other three give up (the horizontal accordion)',
    !!mel && shut.every((c) => !c.open && c.headW < mel.headW / 1.8), one.map((c) => [c.k, c.headW]));
  rec.ok('...while the closed three keep their strip, their badge and their name',
    shut.every((c) => c.headW >= 40 && c.cells === 0), shut);
  rec.ok('...and the body of the open column is exactly as wide as its header',
    !!mel && Math.abs(mel.headW - mel.bodyW) <= 1, mel);
  rec.ok('...and only NOW does it carry an ℹ️',
    !!mel && mel.info === true && shut.every((c) => c.info === false), one.map((c) => [c.k, c.info]));

  /* It must close again, or the accordion is a trap — the v2.3.2315 lesson,
     which took three taps to state honestly then and takes three now. */
  await tapHead(P, 'sword');
  const shutAgain = await readCols(P);
  rec.ok('tapping the OPEN column closes it again, back to four equal strips',
    shutAgain.every((c) => c.open === false && c.cells === 0)
      && new Set(shutAgain.map((c) => c.headW)).size === 1, shutAgain);

  /* ════════ 0c. ONE WEAPON AT A TIME, PLUS SHARED ════════
     Owner: "You can only have one combat skill open at a time but you can
     have one combat skill and the shared column open at the same time."
     Two rules, and each needs its own tap to tell them apart: a second
     WEAPON must replace the first, and Shared must not disturb either. */
  await tapHead(P, 'sword');
  await tapHead(P, 'bow');
  const swapped = await readCols(P);
  console.log('    weapon swapped: ' + JSON.stringify(swapped.map((c) => [c.k, c.open])));
  rec.ok('opening a second WEAPON closes the first — only one combat skill at a time',
    swapped.filter((c) => c.open).length === 1 && swapped.find((c) => c.k === 'bow').open === true
      && swapped.find((c) => c.k === 'sword').open === false, swapped);
  rec.ok('...and the one that closed gave its width back',
    swapped.find((c) => c.k === 'sword').headW < swapped.find((c) => c.k === 'bow').headW / 1.8,
    swapped.map((c) => [c.k, c.headW]));

  await tapHead(P, 'shared');
  const two = await readCols(P);
  console.log('    weapon + shared: ' + JSON.stringify(two));
  const twoOpen = two.filter((c) => c.open), twoShut = two.filter((c) => !c.open);
  rec.ok('a weapon and Shared CAN be open together — the pairing the screen is for',
    twoOpen.length === 2 && twoOpen.some((c) => c.k === 'bow') && twoOpen.some((c) => c.k === 'shared')
      && twoOpen.find((c) => c.k === 'bow').cells === 6
      && twoOpen.find((c) => c.k === 'shared').cells === 7, two);
  rec.ok('...sharing the open width evenly, still wider than the two closed strips',
    Math.abs(twoOpen[0].headW - twoOpen[1].headW) <= 1
      && twoShut.every((c) => c.headW < twoOpen[0].headW), two.map((c) => [c.k, c.headW]));
  /* And Shared is INDEPENDENT in both directions: switching weapons under it
     must leave it open, which is the half a single tap cannot show. */
  await tapHead(P, 'staff');
  const underShared = await readCols(P);
  rec.ok('...and switching weapons underneath leaves Shared open — it is not part of the radio group',
    underShared.find((c) => c.k === 'shared').open === true
      && underShared.find((c) => c.k === 'staff').open === true
      && underShared.find((c) => c.k === 'bow').open === false, underShared);
  rec.ok('...so two is the most the screen can ever hold',
    underShared.filter((c) => c.open).length === 2
      && underShared.reduce((n, c) => n + c.cells, 0) === 13, underShared);

  /* ════════ AND NOW THE CELLS, ONE WEAPON AT A TIME ════════
     Everything below measures the stats themselves.  Each weapon is opened
     in turn — there is no state in which all three are on screen — and the
     readings are merged, so the per-column assertions still ask about all
     four columns. */
  const gAll = { order: null, cols: {}, cells: [], bodyW: 0, chevron: null };
  for (const k of ['sword', 'staff', 'bow']) {
    await tapHead(P, k);                       /* Shared stays open under it */
    const gk = await readGrid(P);
    if (gk.err) { rec.ok('the points body is open (guard)', false, gk.err); await P.ctx.close().catch(() => {}); return; }
    gAll.order = gk.order;
    gAll.cols[k] = gk.cols[k] || [];
    gAll.cols.shared = gk.cols.shared || [];
    gAll.cells = gAll.cells.concat(gk.cells);
    gAll.bodyW = gk.bodyW;
    gAll.chevron = gk.chevron;
  }
  /* The LAST reading (Bow + Shared) is the live screen everything after this
     measures against; gAll carries the three weapons' cells for the
     per-column checks. */
  const g = gAll;
  rec.ok('the points body is open (guard)', g.cells.length >= 7, g.cells.length);
  console.log('    columns: ' + JSON.stringify(g.order) + '  cells seen across the three weapons: ' + g.cells.length);

  /* ════════ 1. FOUR COLUMNS, IN THE OWNER'S ORDER, WITH THE OWNER'S ROWS ════════ */
  rec.ok('four columns, left to right: melee, staff (Magic), bow, shared',
    g.order.join(',') === LANE_ORDER.join(','), g.order);
  for (const k of ['sword', 'staff', 'bow']) {
    const col = g.cols[k] || [];
    rec.ok(`the ${k} column holds the six lane stats, in order: ${LANE_STATS.join(' / ')}`,
      col.length === 6 && LANE_STATS.every((s, i) => col[i] && col[i].stat === s)
        && col.every((c) => new RegExp(` for ${k}$`).test(c.aria.split(',')[0])),
      col.map((c) => c.aria.split(',')[0]));
  }
  rec.ok(`the shared column holds the seven shared stats, in order: ${SHARED_STATS.join(' / ')}`,
    (g.cols.shared || []).length === 7 && SHARED_STATS.every((s, i) => g.cols.shared[i] && g.cols.shared[i].stat === s),
    (g.cols.shared || []).map((c) => c.stat));
  /* Every cell one size: a column that grew for one stat is a layout bug.
     v2.3.2594: a weapon and Shared split the open width evenly, so every
     cell on screen is the same width as every other — measured across the
     three weapon readings, which is three separate screens of the same
     shape. */
  rec.ok('every cell is exactly one width and one height',
    [...new Set(g.cells.map((c) => c.w))].length === 1 && [...new Set(g.cells.map((c) => c.h))].length === 1,
    { widths: [...new Set(g.cells.map((c) => c.w))], heights: [...new Set(g.cells.map((c) => c.h))], bodyW: g.bodyW });
  rec.ok('...and the open pair each take about a third of the body, the two strips the rest',
    Math.abs(g.cells[0].w - (g.bodyW - 2 * CLOSED_W - 12) / 2) <= 6,
    { cellW: g.cells[0].w, bodyW: g.bodyW });
  rec.ok('...and the weapon\'s row lines up with Shared\'s (the grid is still a grid)',
    LANE_STATS.every((s, i) => g.cols.bow[i] && g.cols.shared[i] && g.cols.bow[i].y === g.cols.shared[i].y),
    LANE_STATS.map((s, i) => [g.cols.bow[i] && g.cols.bow[i].y, g.cols.shared[i] && g.cols.shared[i].y]));
  rec.ok('...and every cell clears the 44pt line',
    g.cells.every((c) => c.h >= 44), [...new Set(g.cells.map((c) => c.h))]);

  /* ════════ 2. THE HEADER: ICON CENTRED, BADGE TO ITS LEFT, NAME UNDER IT ════════ */
  const heads = await readHeads(P);
  console.log('    heads: ' + JSON.stringify(heads.map((h) => ({ k: h.k, aria: h.aria, badge: h.badge && h.badge.text, lv: h.lv, h: h.h }))));
  rec.ok('four column headers, one per column, in the same order', heads.map((h) => h.k).join(',') === LANE_ORDER.join(','), heads.map((h) => h.k));
  rec.ok('each header is a real thumb target with the `, level N` aria-label four scenarios resolve through',
    heads.every((h) => h.role === 'button' && /, level \d+$/.test(h.aria || '') && h.h >= 44), heads.map((h) => [h.aria, h.h]));
  rec.ok('the lane headers are named the way every other screen names them (Melee / Magic / Bow) and the fourth is Shared',
    heads.map((h) => (h.aria || '').split(',')[0]).join('|') === 'Melee|Magic|Bow|Shared', heads.map((h) => h.aria));
  /* ═══ v2.3.2595: THE PAIR IS CENTRED, NOT THE ICON ON ITS OWN ═══
     This measured the ICON's centre against the header's, which is what
     v2.3.2592 shipped — and what the owner then reported as clipped numbers
     on the three strips.  The two facts are the same fact: an icon pinned
     dead-centre in a 64px strip leaves (32 - 11) = 21px to its left, and the
     points pill needs up to 33, so the pill hung off the edge with
     `overflow:hidden` hiding the evidence from every screenshot AND from
     this check.  The owner's sentences describe an ARRANGEMENT — "combat
     icon centered above the label", "points allocable will be to the left of
     each icon" — so what is centred is the pill-and-icon PAIR, and the
     pieces of the arrangement are each checked on their own below. */
  rec.ok('each header carries its points and its icon as one CENTRED pair above the label',
    heads.every((h) => { if (!h.icon || !h.badge) return false;
      const cx = (Math.min(h.badge.l, h.icon.l) + Math.max(h.badge.r, h.icon.r)) / 2;
      return Math.abs(cx - h.cx) <= 2; }),
    heads.map((h) => ({ k: h.k, badge: h.badge && [h.badge.l, h.badge.r],
      icon: h.icon && [h.icon.l, h.icon.r], head: h.cx })));
  rec.ok('...with the label UNDER the icon, and the level in the header\'s title and aria-label',
    heads.every((h) => h.label && h.icon && h.label.t >= h.icon.b - 1 && /level \d+/.test(h.title || '')),
    heads.map((h) => ({ k: h.k, label: h.label && h.label.text, title: h.title })));
  rec.ok('...and exactly ONE points badge per header, sitting to the LEFT of the icon ("points allocable will be to the left of each icon")',
    heads.every((h) => h.badgeCount === 1 && h.badge && h.icon && h.badge.r <= h.icon.l + 1
      && h.badge.b > h.icon.t && h.badge.t < h.icon.b),
    heads.map((h) => ({ k: h.k, badge: h.badge && [h.badge.l, h.badge.r], icon: h.icon && [h.icon.l, h.icon.r] })));
  /* v2.3.2595, the owner: "Add a plus sign (as shown beneath the columns next
     to each allocable area) before the number of points they have banked" —
     the same + the cells carry, so the count reads as a quantity waiting to
     be spent rather than as a level or as points already placed. */
  rec.ok('a header with points to spend shows the count on brass, prefixed with a +, big enough to read',
    heads.every((h) => h.badge && /^\+\d+$/.test(h.badge.text) && Number(h.badge.text.slice(1)) > 0
      && h.badge.visible && /216,\s*170,\s*88/.test(h.badge.bg || '') && h.badge.fs >= 12),
    heads.map((h) => h.badge));
  /* ═══ v2.3.2595: NOTHING IN A HEADER IS CUT OFF ═══
     Owner, on a shot of this exact screen with one weapon open: "it shows
     clipped numbers for the other combat skills and shared pool.  You have
     more room to shrink the melee column to give the others more space, I
     just want each word to fit in the column."  Two failures in one sentence
     and they are two different measurements: the NUMBER was outside its
     column's box (clipped by the header's own overflow:hidden), and a WORD
     that does not fit ellipsises, which changes scrollWidth and not the
     bounding box.  Asked here because `heads` is read with one weapon open
     beside Shared — the two 64px strips are the case the owner was looking
     at, and the only one where either can happen. */
  rec.ok('...and nothing in a header is cut off: the number sits inside its column and the word renders whole',
    heads.every((h) => h.badge && h.label && h.head
      && h.badge.l >= h.head.l - 1 && h.badge.r <= h.head.r + 1
      && h.label.sw <= h.label.cw + 1),
    heads.map((h) => ({ k: h.k, head: h.head && [h.head.l, h.head.r],
      badge: h.badge && [h.badge.l, h.badge.r],
      word: h.label && [h.label.text, h.label.sw, h.label.cw] })));
  /* The Shared column's picture is the CHARACTER, not a weapon: the owner's
     pick, and the honest one — those stats belong to the character, not to
     anything in its hands.  A cover-fit image that is not one of the three
     lane icons is the portrait (or its bust fallback before the bust is
     drawn); the three lanes must keep their own art. */
  const laneSrcs = heads.filter((h) => h.k !== 'shared').map((h) => h.icon && h.icon.src);
  const shared = heads.find((h) => h.k === 'shared');
  rec.ok('the Shared header wears the character portrait, not a weapon icon',
    !!(shared && shared.icon && shared.icon.fit === 'cover' && !laneSrcs.includes(shared.icon.src)),
    shared && shared.icon);
  rec.ok('...and the three lanes wear their own weapon art',
    laneSrcs.every((s) => /melee|bow|magic/.test(s || '')) && new Set(laneSrcs).size === 3, laneSrcs);

  /* ════════ 3. THE HEADER ROW IS STICKY, SO THE COLUMNS KEEP THEIR NAMES ════════ */
  const stickyWalk = await P.page.evaluate(async () => {
    const wait = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    let sc = document.querySelector('[data-prog3-points]');
    for (; sc; sc = sc.parentElement) {
      if (sc.scrollHeight - sc.clientHeight > 4 && /auto|scroll/.test(getComputedStyle(sc).overflowY)) break;
    }
    if (!sc) return { err: 'no scroll container' };
    const look = () => {
      const p = sc.getBoundingClientRect();
      return [...document.querySelectorAll('[data-prog3-lane]')].map((x) => {
        const b = x.getBoundingClientRect();
        return { k: x.getAttribute('data-prog3-lane'), top: Math.round(b.top),
          on: b.bottom > p.top + 1 && b.top < p.bottom - 1 };
      });
    };
    const at = {};
    for (const [tag, pos] of [['top', 0], ['mid', sc.scrollHeight / 2], ['max', sc.scrollHeight]]) {
      sc.scrollTop = pos; await wait();
      at[tag] = look();
    }
    sc.scrollTop = 0; await wait();
    return { at, win: Math.round(sc.getBoundingClientRect().height), sh: sc.scrollHeight };
  });
  console.log('    header row through the scroll: ' + JSON.stringify(stickyWalk));
  rec.ok('the header row is declared sticky', heads.every((h) => h.sticky === 'sticky'), heads.map((h) => h.sticky));
  rec.ok('...and every header says whether it is open, for a screen reader and for the four scenarios that resolve through it',
    heads.every((h) => h.expanded === 'true' || h.expanded === 'false')
      && heads.filter((h) => h.expanded === 'true').length === 2, heads.map((h) => [h.k, h.expanded]));
  rec.ok('...and all four headers stay on screen at the top, middle and end of the scroll',
    !stickyWalk.err && ['top', 'mid', 'max'].every((t) => stickyWalk.at[t].length === 4 && stickyWalk.at[t].every((l) => l.on)),
    stickyWalk);
  rec.ok('...at one and the same height (stuck, not merely scrolled past)',
    !stickyWalk.err && ['top', 'mid', 'max'].every((t) => new Set(stickyWalk.at[t].map((l) => l.top)).size === 1),
    stickyWalk.at);
  rec.ok('the stat area still lives inside the sheet\'s own scroller, which did not grow',
    !stickyWalk.err && stickyWalk.win > 0 && stickyWalk.win <= 260, stickyWalk);

  /* ════════ 4. THE CELL PRINTS A LIVE VALUE ════════ */
  const power = (g.cols.sword || []).find((c) => c.stat === 'Power');
  const hp = (g.cols.shared || []).find((c) => c.stat === 'Max HP');
  rec.ok('a cell prints the stat\'s VALUE, not the old points-of-cap fraction',
    !!power && !power.text.some((t) => /^\d+\s*\/\s*\d+$/.test(t)), power && power.text);
  /* Max HP is the one whose truth is checkable from outside the panel — in
     display units (v2.3.2520: ceil(hp / 5)). */
  const realHp = await H.readState(P, (S) => (S.rpg && S.rpg.maxHp) || 0);
  rec.ok('...and that value is the character\'s real one, in display units, not a local guess',
    !!hp && hp.text.some((t) => t === String(Math.ceil(realHp / 5))),
    { printed: hp && hp.text, realHp, want: Math.ceil(realHp / 5) });
  rec.ok('the points-of-cap count survives in the aria-label, which mp-prog3 parses',
    g.cells.every((c) => /, \d+ of \d+\./.test(c.aria)), g.cells.slice(0, 2).map((c) => c.aria));
  rec.ok('a muted chevron cues the rows below the fold, and it is a cue, not a button',
    !!g.chevron && g.chevron.opacity < 0.7 && !g.chevron.role && g.chevron.hidden === 'true', g.chevron);

  /* The picture goes here, AT REST. */
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/statgrid.png` }).catch(() => {});

  /* ════════ 5. THE CELL EXPLAINS, THE QUARTER AT ITS EDGE SPENDS ════════
     v2.3.2595, the owner, in one breath: "I also want the plus sign to add
     points to be much larger, taking up about 25% of the cell and aligned
     right border to border (all 3 sides).  Remove the 'i' and just make the
     explanation launch if they press any other part of the cell than the plus
     sign."
     So the two jobs are split by GEOMETRY instead of by a 22px glyph in a
     corner, and geometry is what this section measures.  The centre-of-cell
     hit test is kept from v2.3.2441 (an inline info button once swallowed it,
     invisibly in a screenshot) and now asks the opposite question: the middle
     of a cell must NOT be the [+]. */
  const centres = await P.page.evaluate(async (ROWSEL) => {   /* the live screen: Bow + Shared */
    const wait = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const out = [];
    for (const el of [...document.querySelectorAll(ROWSEL)]) {
      el.scrollIntoView({ block: 'center' });
      await wait();
      const r = el.getBoundingClientRect();
      const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
      const hit = document.elementFromPoint(x, y);
      out.push({
        stat: (el.getAttribute('aria-label') || '').split(',')[0],
        onPlus: !!(hit && hit.closest && hit.closest('[data-prog3-plus]')),
        inCell: !!(hit && hit.closest && hit.closest(ROWSEL) === el),
      });
    }
    return out;
  }, ROW);
  rec.ok('every cell was scrolled into view and its centre resolves to the cell itself (guard)',
    centres.length === 13 && centres.every((c) => c.inCell), centres.filter((c) => !c.inCell));
  rec.ok('no cell\'s centre lands on its [+] — the middle of a cell is the explainer',
    centres.every((c) => !c.onPlus), centres.filter((c) => c.onPlus));
  rec.ok('...and the cell ITSELF carries the explainer handle the ℹ️ used to ("press any other part of the cell")',
    g.cells.every((c) => c.selfInfo === true), g.cells.filter((c) => !c.selfInfo).map((c) => c.stat));
  /* "About 25%" is read as a band, not a number: 22-30% of the cell's width
     covers the rounding a 84-174px column does to a percentage without
     admitting a [+] that has quietly become a glyph again or eaten a third of
     the cell.  "Border to border (all 3 sides)" is three separate edges, so
     it is three separate comparisons. */
  rec.ok('every cell has a [+] of about a quarter of its width, flush to its top, right and bottom edges',
    g.cells.every((c) => c.plus
      && c.plus.w >= Math.round(c.w * 0.22) && c.plus.w <= Math.round(c.w * 0.30)
      && Math.abs(c.plus.r - (c.x + c.w)) <= 2
      && Math.abs(c.plus.t - c.y) <= 2 && Math.abs(c.plus.b - (c.y + c.h)) <= 2),
    g.cells.slice(0, 4).map((c) => ({ stat: c.stat, cell: [c.x, c.y, c.w, c.h],
      plus: c.plus && [c.plus.l, c.plus.t, c.plus.w, c.plus.h] })));
  rec.ok('...and the [+] is a named control a screen reader can use, disabled when there is nothing to spend',
    g.cells.every((c) => c.plus && /^Spend a point on /.test(c.plus.aria)
      && (c.plus.dis === 'true' || c.plus.dis === 'false')),
    g.cells.slice(0, 3).map((c) => c.plus && [c.plus.aria, c.plus.dis]));

  /* ════════ 6. A REAL FINGER SPENDS, AND THE RIGHT POOL PAYS ════════
     Proven by MUTATION against the worker: a lane spend must move THAT lane's
     count and nothing else; a shared spend must move the shared pool and
     nothing else.  The client's numbers are what the ack told it, so the
     truth is read from the admin surface. */
  const readPts = (col, statName) => P.page.evaluate(([c, n]) => {
    const el = [...document.querySelectorAll(`[data-prog3-col="${c}"] [role="button"][aria-label*=" of "]`)]
      .find((e) => (e.getAttribute('aria-label') || '').startsWith(n));
    const m = el && (el.getAttribute('aria-label') || '').match(/, (\d+) of (\d+)\./);
    return m ? +m[1] : null;
  }, [col, statName]);

  /* ═══ v2.3.2595: A SPEND IS TWO GESTURES NOW ═══
     Owner: "Add a second window asking if they're sure they want to spend the
     point."  The [+] opens the question and only the answer sends, so this
     taps the quarter, reads what the dialog SAYS (a confirm that names the
     wrong stat or the wrong pool is worse than none), and then answers it.
     `answer:'cancel'` runs the same gesture and backs out — the half that
     proves the dialog is a real gate rather than a slide the point passes
     through on its way to the worker. */
  const spendAt = async (col, statName, { answer = 'confirm', drift = 8, atTop = false } = {}) => {
    const before = await P.page.evaluate(([c, n, top]) => {
      const el = [...document.querySelectorAll(`[data-prog3-col="${c}"] [role="button"][aria-label*=" of "]`)]
        .find((e) => (e.getAttribute('aria-label') || '').startsWith(n));
      if (!el) return null;
      let sc = el;
      for (; sc; sc = sc.parentElement) {
        if (sc.scrollHeight - sc.clientHeight > 4) {
          const oy = getComputedStyle(sc).overflowY;
          if (oy === 'auto' || oy === 'scroll') break;
        }
      }
      /* `atTop` parks the SCROLLER at 0 instead of centring the cell —
         see the drift note below for why the two cannot be the same gesture. */
      if (top && sc) sc.scrollTop = 0; else el.scrollIntoView({ block: 'center' });
      const plus = el.querySelector('[data-prog3-plus]');
      const m = (el.getAttribute('aria-label') || '').match(/, (\d+) of (\d+)\./);
      const r = (plus || el).getBoundingClientRect();
      const sr = sc ? sc.getBoundingClientRect() : null;
      return { pts: m ? +m[1] : null, cap: m ? +m[2] : null, hasPlus: !!plus,
        scrollTop: sc ? Math.round(sc.scrollTop) : null,
        onScreen: !sr || (r.top >= sr.top - 1 && r.bottom <= sr.bottom + 1),
        x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    }, [col, statName, atTop]);
    if (!before || before.pts == null) return { err: 'no cell ' + statName + ' in ' + col };
    if (!before.hasPlus) return { err: 'no [+] on ' + statName + ' in ' + col };
    if (!before.onScreen) return { err: 'the [+] on ' + statName + ' is not in the scroller\'s window', before };
    /* ═══ WHY THE DRIFT AND THE SCROLL POSITION TRAVEL TOGETHER ═══
       Measured here (tools/qa/mp, a [+] instrumented for its own events):

         scroller at 0, drift  8   pointerdown touchstart pointerup touchend
         scroller at 0, drift 16   pointerdown touchstart POINTERCANCEL touchend
         scroller at 0, drift 24   pointerdown touchstart POINTERCANCEL touchend

       and the dialog opened in ALL THREE — the cancelled ones through
       scrollTap's touchend backstop, which is the whole of v2.3.2326.
       But park the scroller mid-way (scrollIntoView block:'center', which is
       what a spend on a cell below the fold needs) and a 16px downward drag
       is a REAL scroll: the scroller moves, and scrollTap declines the tap on
       purpose.  That is correct behaviour, not a bug, and it cost eleven red
       assertions in this file before it was measured rather than assumed.
       So: 8px for a cell that had to be scrolled to, 16px + `atTop` for the
       sloppy-thumb case, where the drag is an overscroll that moves nothing.
       A nested control that lost its `inner` flag fails the second one. */
    await touchDrift(P, before.x, before.y, drift);
    await P.page.waitForSelector('[data-prog3-spend]', { timeout: 4000 }).catch(() => {});
    const dlg = await P.page.evaluate(() => {
      const d = document.querySelector('[data-prog3-spend]');
      if (!d) return null;
      const txt = (s) => { const e = d.querySelector(s); return e ? (e.textContent || '').trim() : null; };
      return {
        stat: d.getAttribute('data-prog3-spend'),
        title: txt('[data-prog3-spend-title]'),
        ask: (d.querySelector('[data-prog3-spend-card]') || d).textContent.replace(/\s+/g, ' ').trim(),
        rows: txt('[data-prog3-spend-rows]'),
        confirm: txt('[data-prog3-spend-confirm]'),
        cancel: txt('[data-prog3-spend-cancel]'),
        infoBehind: !!document.querySelector('[data-infopopup]'),
        z: parseInt(getComputedStyle(d).zIndex, 10) || 0,
      };
    });
    if (!dlg) return { err: 'no confirm window for ' + statName, from: before.pts };
    const btn = answer === 'cancel' ? '[data-prog3-spend-cancel]' : '[data-prog3-spend-confirm]';
    const at = await P.page.evaluate((sel) => {
      const b = document.querySelector(sel);
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2),
        h: Math.round(r.height) };
    }, btn);
    if (!at) return { err: 'no ' + btn, dlg, from: before.pts };
    await touchDrift(P, at.x, at.y, 6);
    await P.page.waitForTimeout(300);
    const gone = await P.page.evaluate(() => !document.querySelector('[data-prog3-spend]'));
    if (answer === 'cancel') {
      await P.page.waitForTimeout(700);
      return { ok: (await readPts(col, statName)) === before.pts, dlg, gone, btnH: at.h, from: before.pts };
    }
    for (let i = 0; i < 40; i++) {
      await P.page.waitForTimeout(100);
      const now = await readPts(col, statName);
      if (now != null && now > before.pts) return { ok: true, dlg, gone, btnH: at.h, from: before.pts, to: now };
    }
    return { ok: false, dlg, gone, btnH: at.h, from: before.pts };
  };

  /* The MAGIC column, open beside Shared — the pair a player actually spends
     from, and both pool rules under test on one screen.  Opened through the
     harness helper rather than the local tap: it scrolls the header into
     view, hit-tests it and reports what ended up open, which is what turns a
     tap that quietly missed into a named guard rather than three failures
     further down (it did exactly that on the first run of this section). */
  const spendReady = await H.openPointCols(P, ['staff']);
  rec.ok('Magic and Shared are the open pair for the spends below (guard)',
    spendReady.length === 2 && spendReady.indexOf('staff') >= 0 && spendReady.indexOf('shared') >= 0,
    spendReady);
  /* Read the badges HERE, with that pair open, so the before/after below is
     one screen's worth of change rather than a comparison across states. */
  const headsBefore = await readHeads(P);
  const s0 = await serverPools(wsPort, myId);
  rec.ok('the worker\'s blob carries both pools (guard)', !!s0 && s0.pool > 0 && s0.shared > 0, s0);
  /* ═══ THE DIALOG IS A GATE, NOT A SLIDE ═══
     Cancel FIRST, and against the WORKER — "are you sure" that spends the
     point anyway is the worst outcome of the whole change, and the count on
     screen is only what the ack said, so a client-side no-op would read as a
     pass here if the server had moved.
     On the TOP row with a 16px drift, which is the sloppy thumb the [+]'s
     `inner` scrollTap flag exists for (see spendAt). */
  const sPre = await serverPools(wsPort, myId);
  const rNo = await spendAt('staff', 'Range for staff', { answer: 'cancel', drift: 16, atTop: true });
  console.log('    CANCEL a Range spend: ' + JSON.stringify(rNo));
  rec.ok('a sloppy thumb on the [+] still opens the confirm, and it names the stat, its lane and the pool that pays',
    !!rNo.dlg && rNo.dlg.stat === 'range' && /Range/.test(rNo.dlg.title || '') && /Magic/.test(rNo.dlg.title || '')
      && /Spend 1 Magic point\?/.test(rNo.dlg.ask || ''), rNo.dlg);
  rec.ok('...and shows what the point buys, now -> after, rather than only asking',
    !!rNo.dlg && !!rNo.dlg.rows && /→/.test(rNo.dlg.rows), rNo.dlg && rNo.dlg.rows);
  rec.ok('...with a Cancel and a Spend point, both a real thumb tall, and it sits above the explainer layer',
    !!rNo.dlg && rNo.dlg.cancel === 'Cancel' && rNo.dlg.confirm === 'Spend point'
      && rNo.btnH >= 44 && rNo.dlg.z > 9400, { dlg: rNo.dlg, btnH: rNo.btnH });
  rec.ok('...and tapping the [+] does NOT also open the stat explainer behind it',
    !!rNo.dlg && rNo.dlg.infoBehind === false, rNo.dlg);
  rec.ok('Cancel closes the window and spends NOTHING', rNo.ok === true && rNo.gone === true, rNo);
  const sNo = await serverPools(wsPort, myId);
  rec.ok('...and the worker was never asked: both pools and every allocation are where they were',
    !!sPre && !!sNo && sNo.pool === sPre.pool && sNo.shared === sPre.shared
      && JSON.stringify(sNo.atk) === JSON.stringify(sPre.atk)
      && JSON.stringify(sNo.alloc) === JSON.stringify(sPre.alloc),
    { before: sPre && { pool: sPre.pool, shared: sPre.shared, range: sPre.atk.staff && sPre.atk.staff.range },
      after: sNo && { pool: sNo.pool, shared: sNo.shared, range: sNo.atk.staff && sNo.atk.staff.range } });

  const r1 = await spendAt('staff', 'Range for staff');
  console.log('    spend Range in the MAGIC column: ' + JSON.stringify(r1));
  rec.ok(`a real finger on a lane cell's [+], answered, buys a point (staff Range: ${r1.from} -> ${r1.to})`, r1.ok === true, r1);
  await P.page.waitForTimeout(600);
  const s1 = await serverPools(wsPort, myId);
  rec.ok('...and the WORKER charged it to the Magic lane: atk.staff.range +1, poolBy.staff −1, pool −1',
    !!s0 && !!s1 && (s1.atk.staff.range || 0) === (s0.atk.staff.range || 0) + 1
      && s1.poolBy.staff === s0.poolBy.staff - 1 && s1.pool === s0.pool - 1,
    { before: s0 && { pool: s0.pool, poolBy: s0.poolBy }, after: s1 && { pool: s1.pool, poolBy: s1.poolBy } });
  rec.ok('...while the SHARED pool and the other two lanes did not move',
    !!s0 && !!s1 && s1.shared === s0.shared && s1.poolBy.sword === s0.poolBy.sword && s1.poolBy.bow === s0.poolBy.bow,
    { before: s0 && { shared: s0.shared, poolBy: s0.poolBy }, after: s1 && { shared: s1.shared, poolBy: s1.poolBy } });

  const r2 = await spendAt('shared', 'Dodge');
  console.log('    spend Dodge in the SHARED column: ' + JSON.stringify(r2));
  rec.ok(`a real finger on a shared cell's [+], answered, buys a point (Dodge: ${r2.from} -> ${r2.to})`, r2.ok === true, r2);
  rec.ok('...and the shared confirm asks for a SHARED point, not a lane one',
    !!r2.dlg && /Spend 1 shared point\?/.test(r2.dlg.ask || '') && /Shared/.test(r2.dlg.title || ''), r2.dlg);
  await P.page.waitForTimeout(600);
  const s2 = await serverPools(wsPort, myId);
  rec.ok('...and the WORKER charged it to the SHARED pool: alloc.dodge +1, shared −1',
    !!s1 && !!s2 && (s2.alloc.dodge || 0) === (s1.alloc.dodge || 0) + 1 && s2.shared === s1.shared - 1,
    { before: s1 && { shared: s1.shared, dodge: s1.alloc.dodge }, after: s2 && { shared: s2.shared, dodge: s2.alloc.dodge } });
  rec.ok('...while the lane pools did not move ("only the point earned in the combat channel can be spent there")',
    !!s1 && !!s2 && s2.pool === s1.pool && JSON.stringify(s2.poolBy) === JSON.stringify(s1.poolBy),
    { before: s1 && { pool: s1.pool, poolBy: s1.poolBy }, after: s2 && { pool: s2.pool, poolBy: s2.poolBy } });

  /* And the headers followed the ack: the Magic badge and the Shared badge
     each dropped by one, the other two did not move. */
  const heads2 = await readHeads(P);
  /* v2.3.2595: the badge reads "+7" now, so the number is what follows the +. */
  const n = (hs, k) => { const h = hs.find((x) => x.k === k);
    return h && h.badge ? Number(String(h.badge.text).replace(/^\+/, '')) : null; };
  rec.ok('the column badges followed the acks: Magic −1, Shared −1, Melee and Bow unchanged',
    n(heads2, 'staff') === n(headsBefore, 'staff') - 1 && n(heads2, 'shared') === n(headsBefore, 'shared') - 1
      && n(heads2, 'sword') === n(headsBefore, 'sword') && n(heads2, 'bow') === n(headsBefore, 'bow'),
    { before: LANE_ORDER.map((k) => n(headsBefore, k)), after: LANE_ORDER.map((k) => n(heads2, k)) });

  await P.ctx.close().catch(() => {});
}
