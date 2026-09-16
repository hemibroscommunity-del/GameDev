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
      info: (() => {
        const b = el.querySelector('[data-stat-info]');
        if (!b) return null;
        const br = b.getBoundingClientRect();
        return { w: Math.round(br.width), h: Math.round(br.height),
          cx: Math.round(br.left + br.width / 2), cy: Math.round(br.top + br.height / 2) };
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
      label: label ? { ...rect(label), text: label.textContent.trim() } : null,
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
  const cdp = await P.page.context().newCDPSession(P.page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: at.x, y: at.y }] });
  for (let i = 1; i <= 4; i++) {
    await new Promise((r) => setTimeout(r, 20));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: at.x, y: at.y + (drift * i) / 4 }] });
  }
  await new Promise((r) => setTimeout(r, 20));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
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

  /* TWO AT ONCE, which is why the columns sit side by side rather than
     stacking: with all four shut the screen is empty until you tap, so
     holding a weapon and Shared open together is the useful state. */
  await tapHead(P, 'sword');
  await tapHead(P, 'shared');
  const two = await readCols(P);
  console.log('    two open: ' + JSON.stringify(two));
  const twoOpen = two.filter((c) => c.open), twoShut = two.filter((c) => !c.open);
  rec.ok('two columns can be open at once — a weapon and Shared, side by side',
    twoOpen.length === 2 && twoOpen.some((c) => c.k === 'sword') && twoOpen.some((c) => c.k === 'shared')
      && twoOpen.find((c) => c.k === 'sword').cells === 6
      && twoOpen.find((c) => c.k === 'shared').cells === 7, two);
  rec.ok('...sharing the open width evenly, still wider than the two closed strips',
    Math.abs(twoOpen[0].headW - twoOpen[1].headW) <= 1
      && twoShut.every((c) => c.headW < twoOpen[0].headW), two.map((c) => [c.k, c.headW]));

  /* ════════ AND NOW THE FLAT GRID, WITH ALL FOUR OPEN ════════
     Everything below measures the four columns together — the layout the
     owner drew before the accordion was added to it. */
  for (const k of ['staff', 'bow']) await tapHead(P, k);
  const all = await readCols(P);
  rec.ok('all four columns can be open at once (guard for everything below)',
    all.every((c) => c.open) && all.reduce((n, c) => n + c.cells, 0) === 25, all);

  const g = await readGrid(P);
  rec.ok('the points body is open (guard)', !g.err && g.cells.length >= 7, g.err || g.cells.length);
  if (g.err) { await P.ctx.close().catch(() => {}); return; }
  console.log('    columns: ' + JSON.stringify(g.order) + '  cells: ' + g.cells.length);

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
  /* Every cell one size: a column that grew for one stat is a layout bug. */
  rec.ok('every cell is exactly one width and one height (a quarter of the body)',
    [...new Set(g.cells.map((c) => c.w))].length === 1 && [...new Set(g.cells.map((c) => c.h))].length === 1
      && Math.abs(g.cells[0].w - g.bodyW / 4) <= 6,
    { widths: [...new Set(g.cells.map((c) => c.w))], heights: [...new Set(g.cells.map((c) => c.h))], bodyW: g.bodyW });
  rec.ok('...and rows line up across the columns (the grid is a grid)',
    LANE_STATS.every((s, i) => new Set(['sword', 'staff', 'bow'].map((k) => g.cols[k][i].y)).size === 1),
    LANE_STATS.map((s, i) => ['sword', 'staff', 'bow'].map((k) => g.cols[k][i].y)));
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
  rec.ok('each header carries its icon CENTRED (the owner: "combat icon centered above the label")',
    heads.every((h) => h.icon && Math.abs(h.icon.cx - h.cx) <= 2), heads.map((h) => ({ k: h.k, icon: h.icon && h.icon.cx, head: h.cx })));
  rec.ok('...with the label UNDER the icon, and the level in the header\'s title and aria-label',
    heads.every((h) => h.label && h.icon && h.label.t >= h.icon.b - 1 && /level \d+/.test(h.title || '')),
    heads.map((h) => ({ k: h.k, label: h.label && h.label.text, title: h.title })));
  rec.ok('...and exactly ONE points badge per header, sitting to the LEFT of the icon ("points allocable will be to the left of each icon")',
    heads.every((h) => h.badgeCount === 1 && h.badge && h.icon && h.badge.r <= h.icon.l + 1
      && h.badge.b > h.icon.t && h.badge.t < h.icon.b),
    heads.map((h) => ({ k: h.k, badge: h.badge && [h.badge.l, h.badge.r], icon: h.icon && [h.icon.l, h.icon.r] })));
  rec.ok('a header with points to spend shows the count on brass, big enough to read',
    heads.every((h) => h.badge && /^\d+$/.test(h.badge.text) && Number(h.badge.text) > 0
      && h.badge.visible && /216,\s*170,\s*88/.test(h.badge.bg || '') && h.badge.fs >= 12),
    heads.map((h) => h.badge));
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
    heads.every((h) => h.expanded === 'true'), heads.map((h) => [h.k, h.expanded]));
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

  /* ════════ 5. THE CENTRE OF EVERY CELL IS THE CELL ════════ */
  const centres = await P.page.evaluate(async (ROWSEL) => {
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
        onInfo: !!(hit && hit.closest && hit.closest('[data-stat-info]')),
        inCell: !!(hit && hit.closest && hit.closest(ROWSEL) === el),
      });
    }
    return out;
  }, ROW);
  rec.ok('every cell was scrolled into view and its centre resolves to the cell itself (guard)',
    centres.length >= 25 && centres.every((c) => c.inCell), centres.filter((c) => !c.inCell));
  rec.ok('no cell\'s centre lands on its info button', centres.every((c) => !c.onInfo), centres.filter((c) => c.onInfo));
  rec.ok('...and every cell still HAS an info button, in its top-right corner, clear of the middle',
    g.cells.every((c) => c.info && c.info.w >= 22 && c.info.h >= 22 && c.info.cx > c.cx && c.info.cy < c.cy),
    g.cells.filter((c) => !c.info || !(c.info.cx > c.cx && c.info.cy < c.cy)).map((c) => c.stat));

  /* ════════ 6. A REAL FINGER SPENDS, AND THE RIGHT POOL PAYS ════════
     Proven by MUTATION against the worker: a lane spend must move THAT lane's
     count and nothing else; a shared spend must move the shared pool and
     nothing else.  The client's numbers are what the ack told it, so the
     truth is read from the admin surface. */
  const spendAt = async (col, statName) => {
    const before = await P.page.evaluate(([c, n]) => {
      const el = [...document.querySelectorAll(`[data-prog3-col="${c}"] [role="button"][aria-label*=" of "]`)]
        .find((e) => (e.getAttribute('aria-label') || '').startsWith(n));
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const m = (el.getAttribute('aria-label') || '').match(/, (\d+) of (\d+)\./);
      const r = el.getBoundingClientRect();
      return { pts: m ? +m[1] : null, cap: m ? +m[2] : null,
        x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    }, [col, statName]);
    if (!before || before.pts == null) return { err: 'no cell ' + statName + ' in ' + col };
    const cdp = await P.page.context().newCDPSession(P.page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: before.x, y: before.y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: before.x + 5, y: before.y + 3 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    for (let i = 0; i < 40; i++) {
      await P.page.waitForTimeout(100);
      const now = await P.page.evaluate(([c, n]) => {
        const el = [...document.querySelectorAll(`[data-prog3-col="${c}"] [role="button"][aria-label*=" of "]`)]
          .find((e) => (e.getAttribute('aria-label') || '').startsWith(n));
        const m = el && (el.getAttribute('aria-label') || '').match(/, (\d+) of (\d+)\./);
        return m ? +m[1] : null;
      }, [col, statName]);
      if (now != null && now > before.pts) return { ok: true, from: before.pts, to: now };
    }
    return { ok: false, from: before.pts };
  };

  const s0 = await serverPools(wsPort, myId);
  rec.ok('the worker\'s blob carries both pools (guard)', !!s0 && s0.pool > 0 && s0.shared > 0, s0);
  const r1 = await spendAt('staff', 'Range for staff');
  console.log('    spend Range in the MAGIC column: ' + JSON.stringify(r1));
  rec.ok(`a real finger in the MIDDLE of a lane cell buys a point (staff Range: ${r1.from} -> ${r1.to})`, r1.ok === true, r1);
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
  rec.ok(`a real finger in the MIDDLE of a shared cell buys a point (Dodge: ${r2.from} -> ${r2.to})`, r2.ok === true, r2);
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
  const n = (hs, k) => { const h = hs.find((x) => x.k === k); return h && h.badge ? Number(h.badge.text) : null; };
  rec.ok('the column badges followed the acks: Magic −1, Shared −1, Melee and Bow unchanged',
    n(heads2, 'staff') === n(heads, 'staff') - 1 && n(heads2, 'shared') === n(heads, 'shared') - 1
      && n(heads2, 'sword') === n(heads, 'sword') && n(heads2, 'bow') === n(heads, 'bow'),
    { before: LANE_ORDER.map((k) => n(heads, k)), after: LANE_ORDER.map((k) => n(heads2, k)) });

  await P.ctx.close().catch(() => {});
}
