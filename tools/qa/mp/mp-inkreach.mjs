/* ═══ HOW MUCH OF THE GARMENT YOU CAN ACTUALLY DRAW ON (v2.3.2461) ═══
 *
 * Owner: "The pants area on the editor doesn't let you put your design all the
 * way to the edge of the squares.  Also I think the squares (usable grid
 * space) on the shirt front and back should be longer downwards."
 *
 * WHY THIS IS A SCENARIO AND NOT A SCREENSHOT.  The reach of a drawing grid is
 * three numbers deep and every one of them is invisible from outside: the
 * region the editor FRAMES, the box the grid is FITTED into inside it, and the
 * mask that decides where the ink SHOWS.  A print that stops short looks
 * identical whether the grid was too small, the grid was right and the mask
 * rejected it, or the drawing simply had no ink out there -- and only the
 * stamp holds all three.  So this floods every cell of both garments and reads
 * playerDecal's per-cell coverage probe, which counts, per cell, how many of
 * its pixels pass the mask.  A cell reading zero is a square you can draw in
 * and never see.
 *
 * WHAT IT DEFENDS, in the owner's terms:
 *   pants -- the squares ARE the trousers the editor frames, so there is no
 *            margin of fabric outside them (this is the same rule v2.3.1994
 *            gave the three skin grids, and the note there saying trousers
 *            were deliberately left out is what this replaces).
 *   shirt -- the grid starts where it always did and runs much further down:
 *            measured, it covered 74% of the shirt's height and now covers
 *            92%, with the top edge unmoved so an existing print keeps its
 *            shoulder line.
 *   both  -- no dead band: every row and every column of both grids has at
 *            least one cell with fabric under it, or the grid has been pushed
 *            off its garment.
 */
import * as H from './harness.mjs';

const FULL = '8'.repeat(256);   /* every cell inked, in a blue the body has none of */

/** Rows / columns of the coverage map that carry no fabric at all. */
const deadBands = (cellN) => {
  const rows = [], cols = [];
  for (let y = 0; y < 16; y++) {
    let live = false;
    for (let x = 0; x < 16; x++) if (cellN[y * 16 + x] > 0) live = true;
    if (!live) rows.push(y);
  }
  for (let x = 0; x < 16; x++) {
    let live = false;
    for (let y = 0; y < 16; y++) if (cellN[y * 16 + x] > 0) live = true;
    if (!live) cols.push(x);
  }
  return { rows, cols };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Reacher', wsPort, webPort });
  const page = A.page;

  /* Flood both garments before the first bake: the grid is measured whether or
     not there is ink, but the COVERAGE map is only interesting against a
     drawing that tries to use every cell. */
  await page.evaluate((full) => {
    try {
      window.__btGridProbe = 1;
      localStorage.setItem('bt-pantsart', full);
      localStorage.setItem('bt-pantsart-back', full);
      localStorage.setItem('bt-shirtart', full);
      localStorage.setItem('bt-shirtart-back', full);
    } catch (e) { /* ignore */ }
  }, FULL);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { window.__btGridProbe = 1; });
  await page.waitForTimeout(1500);

  const created = await page.$('[data-tut="login-create"]');
  if (created) await created.click();
  await page.waitForSelector('input.bt-cc-name', { timeout: 30000 });

  /* He has to be WEARING both, or neither sheet bakes and there is nothing to
     measure -- a fresh character wears no shirt. */
  for (const tab of ['Shirt', 'Pants']) {
    const t = await page.$(`button:has-text("${tab}")`);
    rec.ok(`the creator has a ${tab} tab (guard)`, !!t);
    if (!t) return;
    await t.click();
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.bt-cc-strip button')]
        .find((x) => (x.getAttribute('title') || '').toLowerCase() !== 'none');
      if (b) b.click();
    });
    await page.waitForTimeout(900);
  }

  /* The designer is what publishes the grids: it bakes the portrait with
     `reportGrids`, and both garments land in the one `__btGrids` object.
     Entered from PANTS, deliberately.  The tattoo screens take off whatever
     covers the canvas they point at -- a shirt for the chest -- so a designer
     opened from Skin bakes a bare torso and there is no shirt grid at all to
     measure (that is what the first cut of this scenario measured: pants
     only). */
  const pants = await page.$('button:has-text("Pants")');
  if (pants) { await pants.click(); await page.waitForTimeout(600); }
  await page.click('button.bt-cc-ink-pane');
  await page.waitForTimeout(900);
  const drawTab = await page.$('button:has-text("Drawing")');
  if (drawTab) { await drawTab.click(); await page.waitForTimeout(700); }
  await page.waitForSelector('.bt-bodyink-cv', { timeout: 20000 });
  await page.waitForTimeout(2600);

  const g = await page.evaluate(() => {
    const grids = window.__btInkGrids;
    if (!grids) return null;
    const pick = (k) => {
      const r = (grids[k] || [])[0];
      if (!r || !r.cellN) return null;
      return { ox: r.ox, oy: r.oy, cw: r.cw, ch: r.ch,
        lx: r.lx, rx: r.rx, ty: r.ty, by: r.by, box: r.box || null, cellN: r.cellN };
    };
    return { pants: pick('pants'), shirt: pick('shirt') };
  });

  rec.ok('the designer publishes both garment grids to measure (guard)',
    !!(g && g.pants && g.shirt), { got: g ? Object.keys(g).filter((k) => g[k]) : null });
  if (!g || !g.pants || !g.shirt) return;

  /* ── PANTS: THE SQUARES ARE THE TROUSERS ────────────────────────────────
     The editor frames lx..rx / ty..by (BodyInk's fitRegion), so if the grid is
     that same rectangle then what you can see is what you can ink, and the
     margin of undrawable fabric the owner hit cannot exist.  One pixel of
     slack each way: gridFit rounds. */
  const p = g.pants;
  const pw = p.rx - p.lx + 1, ph = p.by - p.ty + 1;
  const gw = 16 * p.cw, gh = 16 * p.ch;
  const fitW = Math.abs(p.ox - p.lx) <= 1 && Math.abs(gw - pw) <= 1.5;
  const fitH = Math.abs(p.oy - p.ty) <= 1 && Math.abs(gh - ph) <= 1.5;
  rec.ok('the PANTS grid covers the whole region the editor frames -- no margin '
    + `of trouser outside the squares (${gw.toFixed(1)}x${gh.toFixed(1)} over ${pw}x${ph})`,
    fitW && fitH, { grid: { ox: p.ox, oy: p.oy, w: +gw.toFixed(2), h: +gh.toFixed(2) },
      region: { lx: p.lx, ty: p.ty, w: pw, h: ph } });

  /* ── SHIRT: SAME TOP, MUCH MORE BELOW ───────────────────────────────────
     Measured as a fraction of the SHIRT SPRITE's own height, which is what
     "longer downwards" is about -- an absolute row number would move with the
     art.  Both halves are asserted: the reach, and that the top did not move
     to buy it (a print already on a shirt must keep its shoulder line). */
  const s = g.shirt;
  const bh = s.box ? (s.box.bot - s.box.top + 1) : 0;
  rec.ok('the shirt reports the sprite box its grid is fitted to (guard)', bh > 0, { box: s.box });
  if (bh > 0) {
    const top = (s.oy - s.box.top) / bh;
    const bottom = (s.oy + 16 * s.ch - s.box.top) / bh;
    rec.ok(`the SHIRT grid runs to ${(bottom * 100).toFixed(0)}% down the shirt `
      + '-- it reached 74% before, which left a quarter of the garment with no '
      + 'square over it', bottom >= 0.90, { top: +top.toFixed(3), bottom: +bottom.toFixed(3) });
    rec.ok('...and its TOP did not move to pay for that, so a print already on '
      + `a shirt keeps its shoulder line (${(top * 100).toFixed(1)}%)`,
      Math.abs(top - 0.167) <= 0.02, { top: +top.toFixed(3) });
  }

  /* ── NEITHER GRID HANGS OFF ITS GARMENT ─────────────────────────────────
     Reaching further is only worth having if the new squares land on fabric.
     A whole row or column with no mask under it anywhere is a band of the
     drawing that can never appear -- the failure mode this change could
     plausibly introduce, so it is the thing to pin. */
  for (const [name, rep] of [['pants', p], ['shirt', s]]) {
    const d = deadBands(rep.cellN);
    rec.ok(`every row and column of the ${name} grid has fabric under it `
      + '-- no band of squares that can never show ink',
      d.rows.length === 0 && d.cols.length === 0, d);
  }
}
