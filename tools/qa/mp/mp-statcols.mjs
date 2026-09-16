/* THE POINT ROWS GO TWO ABREAST, AND FALL BACK TO ONE WHEN THEY CANNOT (v2.3.2382).
 *
 * Owner: "On the stat point application menu make it so that whatever primary
 * combat skill you're on it's divided into two columns: on the left is the
 * attack (offensive) points and on the right are the global (mostly defensive)
 * points.  Right now it Seems like each row has a lot of room and could be
 * split into two."
 *
 * ── WHY THIS IS ITS OWN FILE AND NOT AN mp-prog3 ASSERTION ──
 * mp-prog3 is 126 assertions about what the panel DOES -- what a spend costs,
 * what the worker confirms, which rows are disabled with an empty pool -- and
 * it runs at one viewport because none of that depends on width.  This is the
 * opposite: the whole change is a width branch, and the only way to see it is
 * to open the same panel at more than one size.
 *
 * ── THE THREE WIDTHS, AND WHY EACH ONE IS HERE ──
 *   390  the phone this game is for.  Two columns.
 *   375  the narrowest iPhone (SE), and the width the 375px floor was computed
 *        for: label = (panelVw - 16)/2 - 77 >= 97.33 solves to 364.7, so 375
 *        is the first size that fits and it fits by 5.2px.  If a label ever
 *        grows, this is the assertion that goes red first.
 *   320  below the floor.  ONE column, deliberately -- at 320 a half column
 *        leaves 75px for a label that wants 97.33 and all three long labels
 *        clip.  Asserting the FALLBACK is the point: "it fits at 390" is not
 *        the claim, "it never clips at any size" is.
 *
 * Clipping is measured as scrollWidth > clientWidth on every leaf element
 * inside a row, not by eye and not by a screenshot: at this size an ellipsis
 * and a tight fit look identical in a PNG, and the label is the thing the
 * whole arithmetic was about.
 */
import * as H from './harness.mjs';

/* v2.3.2592: FOUR columns at every width — the owner's layout has no narrow
   fallback (a lane you cannot see is the v2.3.1660 incident); below 360px
   the cell titles step down to the 10px floor and four short names instead
   (HeroExpanded NARROW_TITLE), which is what this file exists to verify. */
/* v2.3.2594: ONE WEAPON PLUS SHARED is the most the screen will hold
   (owner), so the open pair is what this file measures — two columns of
   cells between two closed strips.  Four columns at every width still: the
   layout has no narrow fallback, because a lane you cannot see is the
   v2.3.1660 incident.  Below 360 the cell titles step down to the 10px floor
   and four short names instead (HeroExpanded NARROW_TITLE), which is what
   this file exists to verify. */
const SIZES = [
  { w: 390, h: 844, cols: 2 },
  { w: 375, h: 812, cols: 2 },
  { w: 320, h: 568, cols: 2 },
];
/* 6 for the open weapon + 7 shared. */
const CELLS = 13;

export async function run({ browser, wsPort, webPort, rec }) {
  for (const S of SIZES) {
    const tag = `${S.w}x${S.h}`;
    const P = await H.newPlayer(browser, { name: 'Cols' + S.w, wsPort, webPort,
      viewport: { width: S.w, height: S.h }, touch: true, dpr: 3 });
    await H.enterWorld(P);
    await P.page.waitForTimeout(1200);
    await P.page.locator('[aria-label="Character"]').first().click({ timeout: 6000 }).catch(() => {});
    await P.page.waitForTimeout(900);
    /* v2.3.1972's three spellings: the tab is "Points" with an empty pool and
       "Build — N points" with a badge, and it was "Build" before that. */
    await P.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]')
      .first().click({ timeout: 8000 }).catch(() => {});
    await P.page.waitForTimeout(900);
    /* ═══ v2.3.2593: THE CLOSED STRIP IS THE NARROWEST THING ON THIS SCREEN ═══
       A shut column is 58px holding a badge, an icon and a name, and "SHARED"
       is the longest of the four — so the resting state, not the open grid,
       is where a label runs out of room.  It is also the state a player now
       lands on every time they open this screen (owner: "the default view
       should also to have them all closed"), which makes it the one worth
       measuring first.  Same detector as below: scrollWidth > clientWidth on
       every leaf, because at this size an ellipsis and a tight fit look
       identical in a screenshot. */
    const shut = await P.page.evaluate(() => {
      const heads = [...document.querySelectorAll('[data-prog3-lane]')];
      const leaves = heads.flatMap((h) => [...h.querySelectorAll('*')]
        .filter((e) => e.children.length === 0 && (e.textContent || '').trim())
        .map((e) => ({ t: (e.textContent || '').trim(), sw: e.scrollWidth, cw: e.clientWidth,
          fs: parseFloat(getComputedStyle(e).fontSize) })));
      return {
        n: heads.length,
        open: heads.filter((h) => h.getAttribute('aria-expanded') === 'true').length,
        w: heads.map((h) => Math.round(h.getBoundingClientRect().width)),
        clipped: leaves.filter((l) => l.sw > l.cw + 1),
        minFont: leaves.length ? Math.min(...leaves.map((l) => l.fs)) : null,
      };
    });
    rec.ok(`${tag}: at rest all four columns are shut, sharing the width (guard)`,
      shut.n === 4 && shut.open === 0 && new Set(shut.w).size === 1, shut);
    rec.ok(`${tag}: ...with no column's name or count clipped in its strip`,
      shut.clipped.length === 0, shut.clipped);
    rec.ok(`${tag}: ...and nothing in a strip below the 10px type floor`,
      shut.minFont !== null && shut.minFont >= 10, { minFont: shut.minFont });

    /* ONE OPEN is the narrowest a CLOSED strip ever gets (three of them
       sharing the leftover), so it is the second state worth measuring. */
    await H.openPointCols(P, ['sword']);
    const oneOpen = await P.page.evaluate(() => {
      const heads = [...document.querySelectorAll('[data-prog3-lane]')];
      const leaves = heads.flatMap((h) => [...h.querySelectorAll('*')]
        .filter((e) => e.children.length === 0 && (e.textContent || '').trim())
        .map((e) => ({ t: (e.textContent || '').trim(), sw: e.scrollWidth, cw: e.clientWidth })));
      return { w: heads.map((h) => Math.round(h.getBoundingClientRect().width)),
        clipped: leaves.filter((l) => l.sw > l.cw + 1) };
    });
    console.log(`    ${tag} one open: ${JSON.stringify(oneOpen.w)}`);
    rec.ok(`${tag}: with one column open the other three are strips, and nothing in them is cut off`,
      oneOpen.clipped.length === 0, oneOpen);

    /* Then the open PAIR — a weapon and Shared, the most the screen holds
       and the state the cell measurements below are about. */
    await H.openPointCols(P);

    const m = await P.page.evaluate(() => {
      /* v2.3.2592: the whole four-column surface, not one lane's body. */
      const b = document.querySelector('[data-prog3-points]') || document.getElementById('bt-prog3-body');
      if (!b) return { err: 'no prog3 body' };
      const cs = getComputedStyle(b);
      const rows = [...b.querySelectorAll('[role="button"][aria-label*=" of "]')];
      const clipped = [];
      for (const r of rows) {
        for (const el of r.querySelectorAll('span,div')) {
          if (el.children.length === 0 && (el.textContent || '').trim()
              && el.scrollWidth > el.clientWidth + 1) {
            clipped.push({ t: (el.textContent || '').trim(), want: el.scrollWidth, got: el.clientWidth });
          }
        }
      }
      return {
        dir: cs.flexDirection,
        w: +b.getBoundingClientRect().width.toFixed(1),
        h: +b.getBoundingClientRect().height.toFixed(1),
        overflowX: +(b.scrollWidth - b.clientWidth).toFixed(1),
        rows: rows.length,
        rowW: rows.length ? +rows[0].getBoundingClientRect().width.toFixed(1) : 0,
        /* v2.3.2441: how many cells share the first band's y. */
        bandN: rows.length
          ? rows.filter((r) => Math.abs(r.getBoundingClientRect().top
              - rows[0].getBoundingClientRect().top) < 2).length
          : 0,
        firstRow: rows.length ? rows[0].getAttribute('aria-label') : null,
        clipped,
      };
    });

    rec.ok(`${tag}: the points panel is open (guard)`,
      !m.err && m.rows === CELLS, m);
    if (m.err || m.rows !== CELLS) { await P.ctx.close().catch(() => {}); continue; }

    /* ═══ v2.3.2441: THE TWO-COLUMN CLAIM IS RETIRED ═══
       v2.3.2382 made this a ROW of two columns on the owner's ask; v2.3.2441
       makes it a COLUMN of three bands (4 across, then 3, then 2) on the
       owner's mockup.  So the flex-direction this file was built to pin has
       flipped BY INSTRUCTION, and asserting `row` would now be asserting the
       previous design against the current one.
       What the file is really for survives untouched and is the rest of this
       loop: at three widths, in the layout that is actually shipping, nothing
       clips and nothing scrolls sideways.  That is the property that caught
       real bugs (a 2px crop of "150%" at 375 during this very change), and it
       is width-dependent, which is why this file exists separately from
       mp-prog3 at all. */
    rec.ok(`${tag}: the stats are laid out in bands, top to bottom `
         + `(flex-direction ${m.dir}, first band ${m.rowW}px of ${m.w})`,
      m.dir === 'column', m);
    /* The BAND SHAPE, per width -- 4 across above 375, and the narrow fallback
       below it.  Asserted from the measured x/width of the cells rather than
       from a constant, so a change to the gap or the padding is visible here. */
    rec.ok(`${tag}: the first row runs TWO across — the open weapon and Shared`
         + ` (${m.bandN} cells on the first row)`,
      m.bandN === S.cols, m);

    /* The whole reason the layout is allowed to change: nothing may clip. */
    rec.ok(`${tag}: ...and no label, count or caption is cut off`,
      m.clipped.length === 0, m.clipped);
    rec.ok(`${tag}: ...and the body does not scroll sideways`,
      m.overflowX <= 1, m);

    /* ATTACK stays first in document order in BOTH layouts. Several scenarios
       take the first [role="button"][aria-label*=" of "] and expect an attack
       row; left-is-offence has to read the same to the harness as to the eye. */
    rec.ok(`${tag}: ...and the first row is still an ATTACK row`,
      !!m.firstRow && / for (sword|bow|staff)\b/.test(m.firstRow), m.firstRow);

    await P.ctx.close().catch(() => {});
  }
}
