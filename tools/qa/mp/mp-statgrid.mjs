/* ═══ THE POINTS SCREEN IS A 4 + 3 + 2 GRID, IN LESS ROOM THAN BEFORE ═══
 * (v2.3.2441)
 *
 * Owner, with a mockup: "the existing 2x2 stat-card layout becomes a dense but
 * clearly grouped 4 + 3 + 2 layout without consuming any additional screen
 * space", and twice over: "do not make the bottom menu taller, do not move its
 * top edge upward, do not reduce the visible game world."
 *
 * ── WHY THIS FILE, WHEN mp-prog3 AND mp-statcols ALREADY OPEN THIS SCREEN ──
 * They own different questions and neither can see this one.  mp-prog3 asks
 * what the panel DOES (what a spend costs, what the worker confirms, what a
 * dead pool greys out) and runs mostly at the harness's landscape default.
 * mp-statcols asks whether anything CLIPS, at three widths.  Neither knows how
 * many cells share a row, what a divider says, or whether the whole thing got
 * smaller -- which is the entire content of what the owner asked for.
 *
 * ── THE ONE THAT MATTERS MOST IS THE LAST ONE ──
 * `the centre of a cell SPENDS` is not a layout nicety.  The first cut of this
 * grid put the info button inline in the centred title row, a few pixels from
 * the cell's geometric centre -- which is where a thumb lands and where every
 * harness taps.  The info button stops propagation (it must, or reading about
 * a stat would also buy it), so the tap was swallowed and the point never
 * went.  It is invisible in a screenshot: the cell looks perfect.  mp-ptorb
 * caught it by accident because its SECOND spend happened to pick a cell whose
 * centre landed on the button.  That is luck, not coverage, so it is pinned
 * here on purpose, for every cell.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const ROW = '[role="button"][aria-label*=" of "]';

/* Every cell, grouped into the bands they actually render in — read off the
   measured top edge, not off an assumed order. */
const readGrid = (P) => P.page.evaluate((ROWSEL) => {
  const body = document.getElementById('bt-prog3-body');
  if (!body) return { err: 'no prog3 body' };
  const cells = [...body.querySelectorAll(ROWSEL)].map((el) => {
    const r = el.getBoundingClientRect();
    const label = el.getAttribute('aria-label') || '';
    return {
      stat: label.split(',')[0].replace(/ for (sword|bow|staff)$/, '').trim(),
      aria: label,
      x: Math.round(r.left), y: Math.round(r.top),
      w: Math.round(r.width), h: Math.round(r.height),
      cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2),
      /* What the cell PRINTS, with the info glyph and the orb excluded — the
         value the owner's mockup is about. */
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
  const bands = [];
  for (const c of cells) {
    const b = bands.find((z) => Math.abs(z.y - c.y) < 3);
    if (b) b.cells.push(c); else bands.push({ y: c.y, cells: [c] });
  }
  bands.sort((a, z) => a.y - z.y);
  /* The dividers: text + a thin rule, no box.  Found as the non-cell text
     nodes inside the body. */
  const heads = [...body.querySelectorAll('div')]
    .filter((d) => !d.closest(ROWSEL) && d.children.length
      && [...d.children].every((k) => k.tagName === 'SPAN'))
    .map((d) => (d.textContent || '').trim().replace(/\s+/g, ' '))
    .filter(Boolean);
  const chev = [...body.querySelectorAll('div')]
    .find((d) => !d.children.length && (d.textContent || '').trim() === '▾');
  const br = body.getBoundingClientRect();
  return {
    bands: bands.map((b) => ({ y: b.y, n: b.cells.length, w: b.cells[0].w,
      stats: b.cells.map((c) => c.stat) })),
    cells, heads,
    bodyH: Math.round(br.height), bodyW: Math.round(br.width),
    chevron: chev ? {
      size: parseFloat(getComputedStyle(chev).fontSize),
      opacity: parseFloat(getComputedStyle(chev).opacity),
      role: chev.getAttribute('role'), hidden: chev.getAttribute('aria-hidden'),
    } : null,
  };
}, ROW);

const readTabs = (P) => P.page.evaluate(() => (
  [...document.querySelectorAll('[data-prog3-lane]')].map((t) => {
    const spans = [...t.querySelectorAll('span')].filter((s) => !s.children.length);
    const pts = spans.find((s) => /^\d+\s+PTS$/.test((s.textContent || '').trim()));
    return {
      k: t.getAttribute('data-prog3-lane'),
      aria: t.getAttribute('aria-label'),
      title: t.getAttribute('title'),
      text: (t.textContent || '').trim().replace(/\s+/g, ' '),
      ptsText: pts ? pts.textContent.trim() : null,
      ptsColor: pts ? getComputedStyle(pts).color : null,
      ptsSize: pts ? parseFloat(getComputedStyle(pts).fontSize) : null,
      /* The count must live in exactly ONE visible place per tab. */
      countNodes: spans.filter((s) => /^\d+(\s+PTS)?$/.test((s.textContent || '').trim())).length,
      h: Math.round(t.getBoundingClientRect().height),
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

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Grid', wsPort, webPort,
    viewport: PHONE, touch: true, dpr: 2 });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);
  const myId = await H.readState(P, (S) => S.myId);

  /* Real points from the worker's own level-up path, so the gold "N PTS" state
     and a real spend are both exercised. */
  await fetch(`http://127.0.0.1:${wsPort}/api/admin/dev/kit`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: myId, what: 'levels' }),
  }).then((r) => r.json()).catch(() => null);
  await P.page.waitForTimeout(1500);
  const pool = await H.readState(P, (S) => (S.rpg && S.rpg.prog3 && S.rpg.prog3.pool) || 0);
  rec.ok('the worker minted a real point pool (guard)', pool >= 3, { pool });

  await openPoints(P);
  const g = await readGrid(P);
  rec.ok('the points body is open (guard)', !g.err && g.cells.length >= 7, g.err || g.cells.length);
  if (g.err) { await P.ctx.close().catch(() => {}); return; }
  console.log('    bands: ' + JSON.stringify(g.bands));
  console.log('    heads: ' + JSON.stringify(g.heads));

  /* ════════ 1. THREE BANDS, 4 THEN 3 THEN 2 ════════ */
  rec.ok('the stats fall into THREE bands, top to bottom', g.bands.length === 3, g.bands);
  rec.ok('...the first is the four weapon stats, four across',
    g.bands[0] && g.bands[0].n === 4
    && ['Damage', 'Crit', 'Crit Dmg', 'Atk Speed'].every((s, i) => g.bands[0].stats[i] === s),
    g.bands[0]);
  rec.ok('...the second is STAMINA | DODGE | ELEM POWER, three across',
    g.bands[1] && g.bands[1].n === 3
    && ['Stamina', 'Dodge', 'Elem Power'].every((s, i) => g.bands[1].stats[i] === s),
    g.bands[1]);
  rec.ok('...and the third is the two BIG cells, DEFENSE and MAX HP',
    g.bands[2] && g.bands[2].n === 2
    && g.bands[2].stats[0] === 'Defense' && g.bands[2].stats[1] === 'Max HP',
    g.bands[2]);
  /* The owner's "Defense and Max HP get the larger cells" — asserted as a
     RELATIONSHIP, not a pixel count, so a width retune cannot break it. */
  rec.ok('...and those two really are the larger cells (about half the width each)',
    g.bands[2] && g.bands[0] && g.bands[2].w > g.bands[1].w && g.bands[1].w > g.bands[0].w
    && Math.abs(g.bands[2].w - g.bodyW / 2) <= 6,
    { quarter: g.bands[0].w, third: g.bands[1].w, half: g.bands[2].w, bodyW: g.bodyW });
  /* Every cell in a band is one size — the part of v2.3.1710's rule that a
     banded grid can still keep. */
  rec.ok('every cell in a band is exactly one width, and every cell one height',
    g.bands.every((b) => [...new Set(b.cells === undefined ? [] : [])].length === 0)
    && [...new Set(g.cells.map((c) => c.h))].length === 1
    && g.bands.every((b) => [...new Set(g.cells.filter((c) => Math.abs(c.y - b.y) < 3).map((c) => c.w))].length === 1),
    { heights: [...new Set(g.cells.map((c) => c.h))] });

  /* ════════ 2. THE DIVIDERS SAY WHICH GROUP, AND FOLLOW THE LANE ════════ */
  rec.ok('a MELEE STATS divider heads the weapon band',
    g.heads.some((h) => /^MELEE STATS$/i.test(h)), g.heads);
  rec.ok('...and a GLOBAL STATS / SHARED divider heads the rest',
    /* `\s*`, not `\s+`: the two words are separate spans separated by a flex
       `gap`, so textContent concatenates them with no whitespace at all. */
    g.heads.some((h) => /^GLOBAL STATS\s*SHARED$/i.test(h)), g.heads);
  rec.ok('the retired ATTACK / CHARACTER SHARED headers are gone',
    !g.heads.some((h) => /^ATTACK$/i.test(h) || /^CHARACTER\s+SHARED$/i.test(h)), g.heads);

  await P.page.locator('[data-prog3-lane="bow"]').first().click({ timeout: 6000 }).catch(() => {});
  await P.page.waitForTimeout(900);
  const gBow = await readGrid(P);
  rec.ok('switching to Bow renames the weapon divider, so it always says whose stats these are',
    gBow.heads.some((h) => /^BOW STATS$/i.test(h)) && !gBow.heads.some((h) => /^MELEE STATS$/i.test(h)),
    gBow.heads);
  await P.page.locator('[data-prog3-lane="sword"]').first().click({ timeout: 6000 }).catch(() => {});
  await P.page.waitForTimeout(900);

  /* ════════ 3. THE TABS COUNT POINTS, NOT LEVELS ════════ */
  const tabs = await readTabs(P);
  console.log('    tabs: ' + JSON.stringify(tabs));
  rec.ok('all three weapon tabs are there (guard)', tabs.length === 3, tabs.length);
  rec.ok('every tab\'s second line is its remaining points, "N PTS"',
    tabs.every((t) => /^\d+ PTS$/.test(t.ptsText || '')), tabs.map((t) => t.ptsText));
  rec.ok('...and no tab still shows a level or a collapse caret',
    tabs.every((t) => !/LV\s*\d/.test(t.text) && !/[▲▼]/.test(t.text)),
    tabs.map((t) => t.text));
  /* "Do not duplicate the available-points count anywhere else." */
  rec.ok('...and the count appears exactly ONCE per tab -- the corner badge is gone',
    tabs.every((t) => t.countNodes === 1), tabs.map((t) => ({ k: t.k, n: t.countNodes })));
  /* The aria-label is a CONTRACT: mp-prog3 has found this control by
     `aria-label*="level"` since v2.3.1668, and three other files resolve
     through it.  The level left the SCREEN, not the accessibility tree. */
  rec.ok('...while the aria-label still names the level, which four scenarios resolve through',
    tabs.every((t) => /, level \d+$/.test(t.aria || '')), tabs.map((t) => t.aria));
  rec.ok('...and the tab still says how many points it has, for a screen reader',
    tabs.every((t) => /point/.test(t.title || '')), tabs.map((t) => t.title));
  const lit = tabs.filter((t) => !/^0 PTS$/.test(t.ptsText || ''));
  const zero = tabs.filter((t) => /^0 PTS$/.test(t.ptsText || ''));
  rec.ok('a lane with points to spend prints them in gold, not grey',
    lit.length === 0 || lit.every((t) => /216,\s*170,\s*88/.test(t.ptsColor || '')),
    lit.map((t) => ({ k: t.k, c: t.ptsColor })));
  rec.ok('...and a lane with none is muted',
    zero.length === 0 || zero.every((t) => /141,\s*155,\s*152/.test(t.ptsColor || '')),
    zero.map((t) => ({ k: t.k, c: t.ptsColor })));
  rec.ok('the tab row did not grow: still 44px, exactly as before',
    tabs.every((t) => t.h === 44), tabs.map((t) => t.h));

  /* ════════ 4. THE CELL PRINTS A LIVE VALUE, NOT "N / M" ════════ */
  const dmg = g.cells.find((c) => c.stat === 'Damage');
  const hp = g.cells.find((c) => c.stat === 'Max HP');
  rec.ok('a cell prints the stat\'s VALUE, not the old points-of-cap fraction',
    !!dmg && !dmg.text.some((t) => /^\d+\s*\/\s*\d+$/.test(t)), dmg && dmg.text);
  /* Max HP is the one whose truth is checkable from outside the panel. */
  const realHp = await H.readState(P, (S) => (S.rpg && S.rpg.maxHp) || 0);
  rec.ok('...and that value is the character\'s real one, not a local guess',
    !!hp && hp.text.some((t) => t === String(Math.round(realHp))),
    { printed: hp && hp.text, realHp });
  /* The count did not vanish -- it moved to where a reader can still get it. */
  rec.ok('the points-of-cap count survives in the aria-label, which mp-prog3 parses',
    g.cells.every((c) => /, \d+ of \d+\./.test(c.aria)), g.cells.slice(0, 2).map((c) => c.aria));

  /* ════════ 5. THE SCROLL CUE ════════ */
  rec.ok('a muted chevron cues the rows below the fold',
    !!g.chevron && g.chevron.opacity < 0.7, g.chevron);
  rec.ok('...and it is a cue, not a button -- nothing to tap and nothing to read out',
    !!g.chevron && !g.chevron.role && g.chevron.hidden === 'true', g.chevron);

  /* ════════ 6. IT GOT SMALLER, WHICH WAS THE ASK ════════
     280px is the measured height of the old two-column body at this width
     (nine 48px rows in two columns plus two group heads).  The new grid must
     be under it -- "without consuming any additional screen space". */
  rec.ok(`the whole stat area is SMALLER than the layout it replaces `
       + `(${g.bodyH}px against the old 280px)`,
    g.bodyH < 280, { now: g.bodyH, before: 280 });

  /* The picture goes here, AT REST -- before section 7 scrolls the panel to
     reach the cells below the fold.  A screenshot taken after that shows a
     mid-scroll panel with its sticky header over the bands, which looks like a
     layout bug and is only where the test left the scrollbar. */
  await P.page.evaluate(() => {
    const b = document.getElementById('bt-prog3-body');
    let n = b && b.parentElement;
    while (n && n !== document.body) {
      if (/auto|scroll/.test(getComputedStyle(n).overflowY)) { n.scrollTop = 0; break; }
      n = n.parentElement;
    }
  });
  await P.page.waitForTimeout(500);
  await P.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/statgrid.png` }).catch(() => {});

  /* ════════ 7. THE CENTRE OF A CELL SPENDS ════════
     The defect this file exists for.  For every cell, the point under its
     geometric centre must resolve to the cell itself and NOT to the info
     button -- an inline info button in a centred title row sits within a few
     pixels of that point, stops propagation, and silently eats the spend. */
  const centres = await P.page.evaluate(async (ROWSEL) => {
    /* SCROLL TO EACH CELL FIRST.  `elementFromPoint` answers null for a point
       outside the viewport, and null tests false for "is on the info button"
       -- so a version of this that did not scroll reported a serene PASS for
       the five cells below the fold, which are most of them.  That is the
       shape of vacuous green this whole file is written against. */
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
        hit: hit ? (hit.tagName + (hit.className ? '.' + String(hit.className).slice(0, 20) : '')) : null,
      });
    }
    return out;
  }, ROW);
  console.log('    centres: ' + JSON.stringify(centres));
  rec.ok('every cell was scrolled into view and hit-tested (guard: a null hit '
       + 'would make the assertions below vacuous)',
    centres.length >= 7 && centres.every((c) => c.inCell && c.hit),
    centres.filter((c) => !c.inCell));
  rec.ok('no cell\'s centre lands on its info button',
    centres.every((c) => !c.onInfo), centres.filter((c) => c.onInfo));

  /* ═══ AND THE ONE THAT MATTERS: A REAL FINGER IN THE MIDDLE BUYS A POINT ═══
     The hit-test above is a diagnostic, not the claim.  Proven by MUTATION: put
     the info button back inline in the centred title row -- the exact layout
     whose spend was being swallowed -- and every hit-test assertion above
     stays green, because the geometric centre lands on an inner flex row
     rather than on the button itself.  A test that survives the defect it was
     written for is not a test.
     So this taps, and reads the count back off the aria-label the worker's
     echo rewrites.  One cell per BAND, because the three bands have three
     different internal geometries and a defect in any one of them is a defect
     a player meets. */
  const spendAt = async (statName) => {
    const before = await P.page.evaluate((n) => {
      const el = [...document.querySelectorAll('[role="button"][aria-label*=" of "]')]
        .find((e) => (e.getAttribute('aria-label') || '').startsWith(n));
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const m = (el.getAttribute('aria-label') || '').match(/, (\d+) of (\d+)\./);
      const r = el.getBoundingClientRect();
      return { pts: m ? +m[1] : null, cap: m ? +m[2] : null,
        x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    }, statName);
    if (!before || before.pts == null) return { err: 'no cell ' + statName };
    /* Real touch input at real coordinates, with the drift a thumb has --
       scrollTap (v2.3.2326) exists because a tap with drift was being
       confiscated by the scroller, and a dispatched event would not test it. */
    const cdp = await P.page.context().newCDPSession(P.page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: before.x, y: before.y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: before.x + 5, y: before.y + 3 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    for (let i = 0; i < 40; i++) {
      await P.page.waitForTimeout(100);
      const now = await P.page.evaluate((n) => {
        const el = [...document.querySelectorAll('[role="button"][aria-label*=" of "]')]
          .find((e) => (e.getAttribute('aria-label') || '').startsWith(n));
        const m = el && (el.getAttribute('aria-label') || '').match(/, (\d+) of (\d+)\./);
        return m ? +m[1] : null;
      }, statName);
      if (now != null && now > before.pts) return { ok: true, from: before.pts, to: now };
    }
    return { ok: false, from: before.pts };
  };

  for (const [band, statName] of [['four-across', 'Crit Dmg'], ['three-across', 'Dodge'], ['two-across', 'Max HP']]) {
    const r = await spendAt(statName);
    console.log(`    spend at the centre of ${statName} (${band}): ` + JSON.stringify(r));
    rec.ok(`a real finger in the MIDDLE of a ${band} cell buys a point `
         + `(${statName}: ${r.from} -> ${r.to})`, r.ok === true, r);
  }
  /* And the info button is still there and still reachable -- the fix for the
     above must not be "delete the button". */
  rec.ok('...and every cell still HAS an info button, in its corner',
    g.cells.every((c) => c.info && c.info.w >= 22 && c.info.h >= 22),
    g.cells.filter((c) => !c.info || c.info.w < 22).map((c) => c.stat));
  rec.ok('...sitting in the top-right, clear of the middle',
    g.cells.every((c) => c.info && c.info.cx > c.cx && c.info.cy < c.cy),
    g.cells.filter((c) => c.info && !(c.info.cx > c.cx && c.info.cy < c.cy)).map((c) => c.stat));

  await P.ctx.close().catch(() => {});
}
