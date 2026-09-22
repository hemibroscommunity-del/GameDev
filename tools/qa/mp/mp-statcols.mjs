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

/* v2.3.2594: ONE WEAPON PLUS SHARED is the most the screen will hold
   (owner), so the open pair is what this file measures — two columns of
   cells between two closed strips.  Four columns at every width still: the
   layout has no narrow fallback, because a lane you cannot see is the
   v2.3.1660 incident.  Below 360 the cell titles step down to the 10px floor
   and four short names instead (HeroExpanded NARROW_TITLE), which is what
   this file exists to verify. */
/* ═══ v2.3.2597: THE NARROW FALLBACK IS BACK, WHICH IS WHAT THIS FILE IS FOR ═══
   This file was written (v2.3.2382) to assert that the point rows go two
   abreast and FALL BACK TO ONE when they cannot — its own header still says
   320 is "below the floor. ONE column, deliberately". v2.3.2592's four-column
   screen removed that fallback and the table above was changed to two columns
   at every width to match.
   The owner's category card brings the fallback back, for the same reason and
   with the same shape of measurement: at 320 a half-width cell leaves the label
   46px and "Element" wants 62, so below 360 the card is one column. So 320
   returns to cols: 1, and the claim this file makes is once again "it never
   clips at any size" rather than "it fits at 390". */
const SIZES = [
  { w: 390, h: 844, cols: 2 },
  { w: 375, h: 812, cols: 2 },
  { w: 320, h: 568, cols: 1 },
];
/* 6 for the open weapon + 7 shared. */
/* v2.3.2597: SIX, not thirteen.  The four-column screen this file was written
   against put every stat of every lane on screen at once — 6 weapon + 7 shared.
   The owner replaced it with a 2x2 category grid you drill into, so a weapon's
   card carries its own six and Shared carries seven, and thirteen at once is a
   state the screen can no longer reach.  openPointCols drills into `sword`. */
/* v2.3.2642: THIRTEEN, not six.  The old screen showed one lane's six stats
   at a time; the owner's grid shows all of them -- six lane stats and seven
   body stats -- on one screen, which is the whole point of the redesign. */
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
       A shut column is 64px (v2.3.2595; 58 before) holding a points pill, an
       icon and a name, and "SHARED" is the longest of the four — so the
       resting state, not the open grid, is where a label runs out of room.
       It is also the state a player now lands on every time they open this
       screen (owner: "the default view should also to have them all closed"),
       which makes it the one worth measuring first.

       TWO detectors, because the owner's report ("it shows clipped numbers
       for the other combat skills and shared pool") slipped past the first
       one: scrollWidth > clientWidth catches a leaf that ELLIPSISED, and the
       box check catches a leaf that is simply OUTSIDE its column, which is
       what a pill hanging off the strip's left edge under `overflow:hidden`
       does — its own scrollWidth is perfectly happy.  An ellipsis and a tight
       fit look identical in a screenshot, and so do a clipped pill and a
       narrow one. */
    const shut = await P.page.evaluate(() => {
      const heads = [...document.querySelectorAll('[data-prog3-lane]')];
      const leaves = heads.flatMap((h) => {
        const hr = h.getBoundingClientRect();
        return [...h.querySelectorAll('*')]
          .filter((e) => e.children.length === 0 && ((e.textContent || '').trim() || e.tagName === 'IMG'))
          .map((e) => { const r = e.getBoundingClientRect();
            return { t: (e.textContent || '').trim() || e.tagName, sw: e.scrollWidth, cw: e.clientWidth,
              fs: parseFloat(getComputedStyle(e).fontSize),
              out: Math.round(Math.max(hr.left - r.left, r.right - hr.right)),
              k: h.getAttribute('data-prog3-lane') }; });
      });
      return {
        n: heads.length,
        open: heads.filter((h) => h.getAttribute('aria-expanded') === 'true').length,
        w: heads.map((h) => Math.round(h.getBoundingClientRect().width)),
        /* IMG is in `leaves` for the box check only — a replaced element's
           scrollWidth/clientWidth says nothing about an ellipsis. */
        clipped: leaves.filter((l) => l.t !== 'IMG' && l.sw > l.cw + 1),
        outside: leaves.filter((l) => l.out > 1),
        minFont: leaves.filter((l) => l.fs).length
          ? Math.min(...leaves.filter((l) => l.fs && l.t !== 'IMG').map((l) => l.fs)) : null,
      };
    });
    /* ═══ v2.3.2642: THIRTEEN CELLS, NOT FOUR COLUMNS ═══
       The owner replaced the category columns with one grid, so "all four are
       shut and share the width" describes a screen that is gone.  What this
       scenario is actually FOR survives untouched and matters more on a grid
       than it did on the columns: at 390, 375 and 320 nothing may ellipsise
       and nothing may hang outside its own box.  That is the check that
       catches a caption too long for its cell -- which this redesign hit for
       real ("ELEMENT" overran at 8.5px and had to come down to 8). */
    rec.ok(`${tag}: the Points grid is on screen with both heads (guard)`,
      shut.n === 2, shut);
    rec.ok(`${tag}: ...with no caption or count clipped in its cell`,
      shut.clipped.length === 0, shut.clipped);
    rec.ok(`${tag}: ...and nothing in a strip below the 10px type floor`,
      shut.minFont !== null && shut.minFont >= 10, { minFont: shut.minFont });

    /* ONE OPEN is the narrowest a CLOSED strip ever gets (three of them
       sharing the leftover), so it is the second state worth measuring. */
    await H.openPointCols(P, ['sword']);
    const oneOpen = await P.page.evaluate(() => {
      const heads = [...document.querySelectorAll('[data-prog3-lane]')];
      const leaves = heads.flatMap((h) => {
        const hr = h.getBoundingClientRect();
        return [...h.querySelectorAll('*')]
          .filter((e) => e.children.length === 0 && ((e.textContent || '').trim() || e.tagName === 'IMG'))
          .map((e) => { const r = e.getBoundingClientRect();
            return { t: (e.textContent || '').trim() || e.tagName, sw: e.scrollWidth, cw: e.clientWidth,
              out: Math.round(Math.max(hr.left - r.left, r.right - hr.right)),
              k: h.getAttribute('data-prog3-lane') }; });
      });
      return { w: heads.map((h) => Math.round(h.getBoundingClientRect().width)),
        /* IMG is in `leaves` for the box check only — a replaced element's
           scrollWidth/clientWidth says nothing about an ellipsis. */
        clipped: leaves.filter((l) => l.t !== 'IMG' && l.sw > l.cw + 1),
        outside: leaves.filter((l) => l.out > 1) };
    });
    console.log(`    ${tag} one open: ${JSON.stringify(oneOpen.w)}`);
    /* THE EXACT STATE THE OWNER SCREENSHOTTED, at the three widths: one
       weapon open, three strips beside it.  This is where a 64px strip has
       to hold "SHARED" and "+12" and where 58 did not. */
    /* v2.3.2642: there is no open/shut any more -- every stat is on screen at
       once, which is the redesign.  The clipping check that rode on the "open"
       state is kept below, where it now runs against all thirteen cells. */
    const m = await P.page.evaluate(() => {
      /* v2.3.2592: the whole four-column surface, not one lane's body. */
      const b = document.querySelector('[data-prog3-points]') || document.getElementById('bt-prog3-body');
      if (!b) return { err: 'no prog3 body' };
      const cs = getComputedStyle(b);
      /* v2.3.2597: the ROW's own handle.  `[role="button"][aria-label*=" of "]`
         now finds the [+] — the row stopped being the button when the owner
         made its body inert — and measuring a 44px button as if it were the
         row is how this read "rowW: 44" on a 163px row. */
      const rows = [...b.querySelectorAll('[data-prog3-row]')];
      const clipped = [];
      /* ═══ v2.3.2656: MEASURE THE TEXT, NOT THE BOX ═══
         scrollWidth > clientWidth catches a clip only when the element is
         WIDER than its content box.  These captions are shrink-to-fit flex
         items with maxWidth:100%, so when the word does not fit the SPAN
         shrinks with it and scrollWidth shrinks too -- the ellipsis appears
         and the two numbers stay equal.  v2.3.2656's tray narrowed every
         column by 1.4px, SPECIAL and DODGE ellipsised at 390, and this loop
         reported nothing; the capture is what showed it.
         So the natural width is measured directly: a clone of the same text
         in the same font, laid out with no width limit at all.  The old test
         stays underneath it -- it is right about every element that IS wider
         than its text, which is most of them. */
      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;left:-9999px;top:0;white-space:nowrap;width:auto;visibility:hidden';
      document.body.appendChild(probe);
      for (const r of rows) {
        for (const el of r.querySelectorAll('span,div')) {
          const t = (el.textContent || '').trim();
          if (el.children.length || !t) continue;
          if (el.scrollWidth > el.clientWidth + 1) {
            clipped.push({ t, want: el.scrollWidth, got: el.clientWidth, how: 'scroll' });
            continue;
          }
          const cs2 = getComputedStyle(el);
          probe.style.font = cs2.font || `${cs2.fontWeight} ${cs2.fontSize}/${cs2.lineHeight} ${cs2.fontFamily}`;
          probe.style.fontWeight = cs2.fontWeight;
          probe.style.fontSize = cs2.fontSize;
          probe.style.fontFamily = cs2.fontFamily;
          probe.style.letterSpacing = cs2.letterSpacing;
          probe.style.textTransform = cs2.textTransform;
          probe.textContent = t;
          const want = probe.getBoundingClientRect().width;
          const got = el.getBoundingClientRect().width;
          if (want > got + 0.5) clipped.push({ t, want: +want.toFixed(1), got: +got.toFixed(1), how: 'measured' });
        }
      }
      probe.remove();
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
        firstRow: rows.length ? (rows[0].querySelector('[data-prog3-plus]') || rows[0]).getAttribute('aria-label') : null,
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
    /* v2.3.2642: the first row is the SIX lane stats behind the weapons head,
       and the second the seven body stats behind the portrait -- the owner's
       two bands.  Asserted as the band COUNT below rather than as "two
       across", which was the card's shape. */
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
