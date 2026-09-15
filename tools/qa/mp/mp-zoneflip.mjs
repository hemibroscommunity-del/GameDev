/* THE FRONT/BACK SWITCH IS IN FRONT, AND IT KEEPS ITS OWN TAPS (v2.3.2541).
 *
 * Owner, on the newly-merged build: the front/back switch "is layered BEHIND
 * something and needs to be in front" -- in the tattoo editor and in the
 * clothing/design editor alike.
 *
 * ── WHY THE EXISTING COVERAGE PASSED WHILE THIS SHIPPED ──
 * mp-bodyink already asserts the flip button is there and works:
 *
 *     const b = document.querySelector('[data-zone-flip]');
 *     return b ? { side: ..., visible: !!b.offsetParent } : null;
 *
 * `offsetParent` answers "is this laid out and not display:none".  It is
 * non-null for a button with another element painted flat on top of it, and it
 * is non-null for a button whose taps a neighbour is eating.  The suite then
 * flips sides with `page.click(...)`, and Playwright's click dispatches to the
 * element it was given rather than to whatever is actually under the point --
 * so the one check that could have caught this was steering around it.  Every
 * assertion was true and none of them was the property the owner reported.
 *
 * ── SO THIS FILE ASKS THE TWO QUESTIONS A THUMB ASKS ──
 *   1. WHAT IS PAINTED ON TOP?  Compared as computed stacking against the
 *      selected zone frame, which is the thing that was winning.
 *   2. WHO GETS THE TAP?  `document.elementFromPoint` at nine points across the
 *      button's own face -- the reading a finger takes.  A button drawn on top
 *      whose corner a neighbour still catches is the same bug wearing a
 *      different hat, and the owner would report it identically.
 * Then it taps the button for real, at a corner rather than dead centre, and
 * requires the figure to have turned round.  (2) can only be trusted if a tap
 * that passes it actually does something.
 *
 * ── AND IT ASKS THEM IN ALL THREE EDITORS ──
 * The picker is one component (PlayerPaint's ZonePicker) but three screens
 * reach it, and the owner named two of them.  The shirt and the trousers open
 * on their PATTERN mode, which has no sides by design (`hasSides`), so this
 * file steps to the Drawing mode first -- a version of this test that forgot to
 * would find no flip button at all and report three cheerful skips.
 *
 * Measured on the broken build, at 390x844:
 *   Skin    frame hit box y 190-242 vs flip y 227-271   5 of 9 points stolen
 *   Shirt   frame hit box y 208-258 vs flip y 245-289   5 of 9 points stolen
 *   Pants   frame hit box y 180-264 vs flip y 247-291   5 of 9 points stolen
 * On the fixed build all three own 9 of 9.
 */
import * as H from './harness.mjs';

/* Portrait phone, the big portrait phone, and landscape -- the pane is a
   different size in each and the overlap is a geometry bug, so one viewport
   would only ever prove one of them. */
const SIZES = [{ w: 390, h: 844 }, { w: 414, h: 896 }, { w: 844, h: 390 }];
/* The creator tab, and what the panel calls the zone once it is open. */
const EDITORS = [
  { tab: 'Skin', zone: 'body' },
  { tab: 'Shirt', zone: 'shirt' },
  { tab: 'Pants', zone: 'pants' },
];
/* Nine points across the button's face, as fractions of its own box. The
   corners and the top edge are the ones that were being stolen; dead centre
   was always fine, which is why a single-point probe would have called this
   fixed while the top third of the target was still dead. */
const POINTS = [[.5, .5], [.5, .08], [.5, .92], [.08, .5], [.92, .5],
  [.2, .2], [.8, .2], [.2, .8], [.8, .8]];

const openCreator = async (P) => {
  await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await P.page.click('[data-tut="login-create"]');
  await P.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
  await P.page.waitForTimeout(2400);
};

/* Into one editor, on a mode that HAS two sides. */
const openEditor = async (P, tab) => {
  await P.page.evaluate((l) => {
    const b = [...document.querySelectorAll('.bt-cc-tabs .bt-cc-tab')]
      .find((x) => (x.textContent || '').trim() === l);
    if (b) b.click();
  }, tab);
  await P.page.waitForTimeout(900);
  await P.page.click('button.bt-cc-ink-pane', { timeout: 15000 });
  await P.page.waitForSelector('.bt-paint', { timeout: 15000 });
  await P.page.waitForTimeout(900);
  /* The garments open on Pattern, which is sideless on purpose. The tattoo
     screen has no mode strip at all, so this is a no-op there. */
  await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('.bt-paint-tabs .bt-cc-tab')]
      .find((x) => /drawing/i.test(x.textContent || ''));
    if (b) b.click();
  });
  await P.page.waitForTimeout(1600);
};

const probe = (P, points) => P.page.evaluate((PTS) => {
  const flip = document.querySelector('.bt-zone-flip');
  if (!flip) return { noFlip: true };
  const fr = flip.getBoundingClientRect();
  const zi = (el) => { const v = getComputedStyle(el).zIndex; return v === 'auto' ? 0 : (parseInt(v, 10) || 0); };
  const frames = [...document.querySelectorAll('.bt-zone-frame')];
  const sel = frames.find((b) => b.classList.contains('bt-zone-frame--on')) || null;
  const hits = PTS.map(([fx, fy]) => {
    const top = document.elementFromPoint(fr.left + fr.width * fx, fr.top + fr.height * fy);
    return { at: [fx, fy], ownedByFlip: !!(top && (top === flip || flip.contains(top))),
      top: top ? (top.className || top.tagName) : null };
  });
  const r = sel ? sel.getBoundingClientRect() : null;
  return {
    flipZ: zi(flip), selZ: sel ? zi(sel) : null,
    selKey: sel ? sel.getAttribute('data-zone-btn') : null,
    /* The two boxes DO overlap -- that is the layout, and it is fine. The bug
       was never the overlap, it was who won it. Reported so a future reader can
       see the test is not passing merely because they drifted apart. */
    boxesOverlap: r ? !(r.right < fr.left || r.left > fr.right || r.bottom < fr.top || r.top > fr.bottom) : null,
    flipRect: [fr.x, fr.y, fr.width, fr.height].map(Math.round),
    selRect: r ? [r.x, r.y, r.width, r.height].map(Math.round) : null,
    side: flip.getAttribute('data-zone-flip'),
    owned: hits.filter((h) => h.ownedByFlip).length, total: hits.length,
    stolen: hits.filter((h) => !h.ownedByFlip),
  };
}, points);

export async function run({ browser, wsPort, webPort, rec }) {
  for (const size of SIZES) {
    const at = `${size.w}x${size.h}`;
    for (const ed of EDITORS) {
      const P = await H.newPlayer(browser, {
        name: 'Ink', wsPort, webPort, touch: true,
        viewport: { width: size.w, height: size.h },
      });
      try {
        await openCreator(P);
        await openEditor(P, ed.tab);
        const m = await probe(P, POINTS);
        if (m.noFlip) {
          /* A skip, not a pass: a screen with no way to turn the figure round
             is the v2.3.2150 bug back, and burying it in a green run is how it
             would stay unnoticed. */
          rec.skip(`${at} ${ed.tab}: the editor has a flip button`,
            'no [data-zone-flip] on screen -- the drawing mode never opened');
          await P.page.close();
          continue;
        }

        /* ── 1. IN FRONT ── */
        rec.ok(`${at} ${ed.tab}: the flip button is stacked ABOVE the selected `
          + `zone frame (flip z=${m.flipZ}, frame "${m.selKey}" z=${m.selZ})`,
          m.selZ === null || m.flipZ > m.selZ, m);

        /* ── 2. AND IT OWNS ITS OWN FACE ──
           The one that matters. Paint order and hit order are the same order,
           so this is what (1) is FOR -- but they are asserted separately
           because a future change could give the button a z-index and still
           put something else over the top of it. */
        rec.ok(`${at} ${ed.tab}: every one of the ${m.total} points across the `
          + `flip button receives its own taps (${m.owned}/${m.total})`,
          m.owned === m.total, { owned: m.owned, total: m.total, stolen: m.stolen.slice(0, 4), flipRect: m.flipRect, selRect: m.selRect });

        /* ── 3. AND A REAL TAP AT A REAL CORNER TURNS HIM ROUND ──
           At (.2,.2), which is inside the region that was being eaten. A tap
           that lands and does nothing is what the owner would report. */
        const before = m.side;
        await P.page.mouse.click(m.flipRect[0] + m.flipRect[2] * 0.2,
          m.flipRect[1] + m.flipRect[3] * 0.2);
        await P.page.waitForTimeout(1000);
        const after = await P.page.evaluate(() => {
          const b = document.querySelector('.bt-zone-flip');
          return b ? b.getAttribute('data-zone-flip') : null;
        });
        rec.ok(`${at} ${ed.tab}: a tap near the button's top-left corner turns `
          + `the figure round (${before} -> ${after})`,
          !!after && after !== before, { before, after });
      } catch (e) {
        rec.ok(`${at} ${ed.tab}: the editor opened`, false, String(e).slice(0, 300));
      }
      await P.page.close();
    }
  }
}
