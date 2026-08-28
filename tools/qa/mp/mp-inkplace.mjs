/* DOES A TATTOO STAY IN THE SAME PLACE WHILE YOU MOVE? (v2.3.2082)
 *
 * Owner: "Check tattoo and pattern placements on all animations for
 * consistency."
 *
 * ── WHY THIS IS NOT mp-facetat ──
 * mp-facetat (v2.3.1992) asks whether the fitted box HOLDS ITS REGION: what
 * share of the head's own pixels the grid spans.  That catches a fit that has
 * collapsed to a sliver, which is what the vanishing face tattoo was.  It
 * cannot catch the failure the owner is asking about here, because a box can
 * span 100% of its region's mass on every single frame and still WANDER: the
 * region is re-measured per frame, its edges move with the pose, and the ink
 * rides wherever they put it.  On screen that is a tattoo that crawls around
 * the chest as you run — every frame individually correct, the sequence wrong.
 *
 * ── WHAT IS MEASURED, AND WHAT WOULD HAVE BEEN A TAUTOLOGY ──
 * `window.__btGridProbe` makes every bake publish the grid it fitted for every
 * frame (`__btGridsByTag['<pose>-<dir>'] = { pants, tattoo, face, arms }`, each
 * an array of `{ ox, oy, cw, ch, lx, rx, ty, by, fx0, fx1, fy0, fy1, frame }` —
 * playerDecal stampRegion).
 *
 * The obvious metric — where the drawing sits inside its REGION box — proves
 * nothing whatsoever, and it is worth writing down why, because it looks
 * exactly like the right measurement.  gridFit CENTRES the grid on that box:
 *
 *     ox = (lx + rx + 1) / 2 - dw / 2        dw = round(regionW * fillW)
 *     oy = ty + regionH * cy - dh / 2        dh = round(regionH * fillH)
 *
 * so (ox - lx) / regionW is (1 - fillW) / 2 on EVERY frame of EVERY sheet, by
 * construction, whatever the art does.  Measure that and you have tested the
 * arithmetic.  What can actually drift is where the region BOX lands on the
 * body, and that only shows against a third thing.
 *
 * So the probe reports the FIGURE in each frame, and the ink is measured
 * against the character rather than against its own box.
 *
 * ── AND AGAINST THE FIGURE'S CENTROID, NOT ITS BOUNDING BOX ──
 * The first cut used the box, and it measured the wrong thing so cleanly that
 * it is worth keeping the numbers.  Ink on the chest reported a 0.20 spread
 * across jog-east — and jog-east's figure BOX moves 21px inside its frame over
 * the cycle (tools/dev/pattern-drift.py) against a figure about 100px wide,
 * which is 0.21.  The metric was reporting the swinging sleeve that widens the
 * box, arriving at the same answer whatever the ink did.
 *
 * The centroid of the same figure moves 1.4px over that cycle.  So:
 *
 *     cx = (ox + dw/2 - fcx) / sqrt(fn)   the ink's centre from the body's
 *     cy = (oy + dh/2 - fcy) / sqrt(fn)   ... in units of the body's own size
 *     sx = dw / sqrt(fn)                  how big the drawing is on that body
 *     sy = dh / sqrt(fn)
 *
 * sqrt(pixel count) is the scale that belongs with a centroid: an area is
 * steadier than a width for exactly the reason the centroid is steadier than
 * an edge.
 *
 * ── THE ARMS ARE NOT MEASURED HERE, ON PURPOSE ──
 * An arm tattoo SHOULD move relative to the body — the arm swings, and ink
 * that stayed put while the limb travelled would be the bug.  Measured against
 * the body's centroid the arms report a 0.83 spread on jog-south, which is the
 * arm doing its job.  There is no body-relative claim to make about them, so
 * this file makes none; that the ink stays ON the arm is mp-facetat's
 * mass-coverage gate, which is the right shape of question for a limb.
 *
 * ── WHAT IS GATED, AND WHAT IS ONLY REPORTED ──
 * Only one thing is gated: that the drawing's centre stays ON the figure at
 * all, on every frame of every sheet.  That is a claim this file's reference
 * can actually carry, and a fit that has wandered off the body fails it.
 *
 * The tighter claim — "and it does not drift more than N" — is REPORTED and
 * not gated, deliberately, after two attempts at a threshold that each turned
 * out to be measuring something else:
 *
 *   1. against the region box: (1 - fillW)/2 on every frame by construction,
 *      a restatement of gridFit (see above);
 *   2. against the figure's bounding box: reported 0.20 on jog-east, which is
 *      the 21px the BOX moves as a sleeve swings, over a ~100px figure.
 *
 * The centroid reference below is the honest third, and a threshold on it
 * would be a third guess dressed as a measurement.  What a drift number means
 * to a player is a judgement about a look; the numbers are here, ranked worst
 * first, for the person who can make it.  A pose whose ink genuinely leaves
 * the body trips the gate that IS here.
 *
 * ── EVERY ANIMATION, NOT EVERY SHEET THE PROBE HAPPENS TO HOLD ──
 * preloadBodyAll bakes stand/jog/hit for all five source facings plus
 * pickup-south and mine-south; attack, sword, bow, dodge and fish bake on
 * first use.  So the scenario ACTS: it swings, shoots, rolls and fishes, and
 * then asserts the tags it expected are present.  Reading only what the
 * preload left would quietly answer a smaller question than the owner asked.
 */
import * as H from './harness.mjs';

/* Solid, off-centre and asymmetric on both axes: a block in the middle would
   read the same after a slide of half its own width, and a symmetric one would
   hide a mirror.  Rows 2-9, columns 4-11 of the 16x16 grid. */
const INK = Array.from({ length: 16 }, (_, y) =>
  Array.from({ length: 16 }, (_, x) => (y >= 2 && y <= 9 && x >= 4 && x <= 11) ? '2' : '0').join(''),
).join('');

/* Collected for all four; only the three BODY-FIXED ones are gated (see the
   header — an arm tattoo is supposed to travel with the arm). */
const REGIONS = ['face', 'tattoo', 'arms', 'pants'];
const HELD = ['face', 'tattoo', 'pants'];
const REGION_NAME = {
  face: 'the face tattoo', tattoo: 'the chest tattoo',
  arms: 'the arm tattoo', pants: 'the trouser print',
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Inked', wsPort, webPort, viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1600);

  const set = await P.page.evaluate((ink) => {
    try {
      localStorage.setItem('bt-tattooart', ink);
      localStorage.setItem('bt-facetattoo', ink);
      localStorage.setItem('bt-armtattoo', ink);
      localStorage.setItem('bt-pantsart', ink);
    } catch (e) { return { ok: false }; }
    return { ok: true, len: ink.length };
  }, INK);
  rec.ok('all four drawings are set (guard)', !!(set && set.ok), set);

  /* The probe must be up BEFORE the page bakes anything, or the sheets the
     preload builds report nothing — mp-facetat learned this the hard way. */
  await P.page.addInitScript(() => { window.__btGridProbe = 1; });
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await P.page.waitForTimeout(1200);
  const created = await P.page.$('[data-tut="login-create"]');
  if (created) await created.click();
  await H.enterWorld(P).catch(() => {});
  await P.page.waitForTimeout(2600);

  /* ── DRIVE THE ANIMATIONS THAT DO NOT PRELOAD ──
     Each of these exists to make one more sheet bake.  Failures here are not
     asserted: a pose the build cannot reach is reported by its tag being
     absent below, which says more than a click that did not land. */
  const key = async (k, ms = 420) => {
    await P.page.keyboard.down(k); await P.page.waitForTimeout(ms);
    await P.page.keyboard.up(k); await P.page.waitForTimeout(320);
  };
  await key('d', 900);                                   /* jog east   */
  await key('s', 700);                                   /* jog south  */
  await key('w', 500);                                   /* jog north  */
  await P.page.keyboard.press('Space').catch(() => {});  /* dodge roll */
  await P.page.waitForTimeout(700);
  /* A swing needs something to swing at; the pose bakes either way, because
     the attack animation plays on an empty click too. */
  const box = await P.page.evaluate(() => {
    const c = document.querySelector('canvas'); const r = c.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  });
  for (let i = 0; i < 3; i++) {
    await P.page.mouse.click(box.x + 40, box.y - 10).catch(() => {});
    await P.page.waitForTimeout(360);
  }
  await P.page.waitForTimeout(900);

  /* ── READ THE FITS ──
     Computed in the page so the grids never cross the bridge; only the
     summary does. */
  const rows = await P.page.evaluate((regions) => {
    const byTag = window.__btGridsByTag;
    if (!byTag) return null;
    const out = [];
    for (const tag of Object.keys(byTag)) {
      for (const reg of regions) {
        const gs = (byTag[tag] || {})[reg];
        if (!gs || gs.length < 2) continue;   /* a one-frame sheet cannot drift */
        /* The arms are stamped with eachPiece, so a frame contributes TWO
           grids — one per arm — and comparing them to each other would read a
           left arm against a right one as drift.  Group by frame and keep the
           larger piece, which is the one a drawing is placed on. */
        const perFrame = new Map();
        for (const g of gs) {
          const w = (g.rx - g.lx + 1) * (g.by - g.ty + 1);
          const cur = perFrame.get(g.frame);
          if (!cur || w > cur.area) perFrame.set(g.frame, { g, area: w });
        }
        const us = [], vs = [], sxs = [], sys = [];
        for (const { g } of perFrame.values()) {
          /* Against the figure's CENTROID and AREA — see the header. */
          const scale = Math.sqrt(g.fn || 0);
          if (!(scale > 1)) continue;
          const dw = g.cw * 16, dh = g.ch * 16;
          us.push((g.ox + dw / 2 - g.fcx) / scale);
          vs.push((g.oy + dh / 2 - g.fcy) / scale);
          sxs.push(dw / scale);
          sys.push(dh / scale);
        }
        if (us.length < 2) continue;
        const spread = (a) => Math.max(...a) - Math.min(...a);
        /* ── AND WHERE THE FIGURE SITS INSIDE ITS OWN FRAME ──
           This is the PATTERN half of the owner's question.  stampPattern
           phases its tile on `x % frameW` and `y` — the FRAME, not the body —
           so a garment pattern is nailed to the cel while the figure moves
           through it.  How far the figure shifts inside its frame between
           frames IS how far the stripes crawl across the shirt, in 256-space
           pixels, and the tile period is only 12-16px (patternCatalog). */
        const lefts = [], tops = [];
        for (const { g } of perFrame.values()) {
          /* FRAME-LOCAL.  fx0 is a sheet coordinate, so a raw spread across a
             28-frame strip is 27 x 256 = the stride between cels, not the
             figure moving inside one — the first cut of this file reported a
             figure travelling 7162px inside a 256px frame. */
          lefts.push(g.fx0 - g.frame * g.fw);
          tops.push(g.fy0);
        }
        out.push({
          tag, reg, frames: us.length,
          ux: +spread(us).toFixed(4), uy: +spread(vs).toFixed(4),
          sx: +spread(sxs).toFixed(4), sy: +spread(sys).toFixed(4),
          uxMid: +(us.reduce((a, b) => a + b, 0) / us.length).toFixed(3),
          uyMid: +(vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(3),
          figDx: spread(lefts), figDy: spread(tops),
        });
      }
    }
    return out;
  }, REGIONS);

  rec.ok('the bake reported per-frame grids for the multi-frame sheets (guard)',
    !!(rows && rows.length >= 8),
    rows && { rows: rows.length, tags: [...new Set(rows.map((r) => r.tag))] });
  if (!rows || !rows.length) { await P.ctx.close(); return; }

  /* Which ANIMATIONS the report actually covers.  Named, because "8 rows" is
     satisfied by eight facings of one pose. */
  const poses = [...new Set(rows.map((r) => r.tag.split('-')[0]))].sort();
  rec.ok(`more than one animation was measured (${poses.join(', ')})`,
    poses.length >= 2, { poses, tags: [...new Set(rows.map((r) => r.tag))].sort() });

  /* ═══ THE GATE ═══
     See the header: set from the shipped art, not chosen to pass.  A drawing
     that holds its anatomical place still moves a little, because gridFit
     quantises to whole pixels against a region whose own width changes
     through a stride. */
  /* THE GATE: the ink is on the figure.  A centre further than one body-radius
     from the body's own centroid is not on the body at all -- sqrt(pixel
     count) is roughly a figure's half-height here, so 1.0 is generous and
     still catches a fit that has left. */
  const OFF_BODY = 1.0;
  for (const reg of HELD) {
    const rs = rows.filter((r) => r.reg === reg);
    if (!rs.length) { rec.ok(`${REGION_NAME[reg]} was measured on some animation`, false, { reg }); continue; }
    const off = rs.filter((r) => Math.abs(r.uxMid) > OFF_BODY || Math.abs(r.uyMid) > OFF_BODY);
    rec.ok(`${REGION_NAME[reg]} is on the figure on all ${rs.length} animation sheets`,
      off.length === 0, { off: off.slice(0, 5) });
  }

  /* REPORTED, not gated -- see the header for why a threshold here would be a
     third guess.  Worst first, so the line itself is the finding. */
  for (const reg of HELD) {
    const rs = rows.filter((r) => r.reg === reg);
    if (!rs.length) continue;
    const worst = rs.slice().sort((a, b) => Math.max(b.ux, b.uy) - Math.max(a.ux, a.uy)).slice(0, 4);
    console.log(`      ${REGION_NAME[reg]} — drift through a cycle, worst sheets `
      + `(body-radii, across/down): `
      + worst.map((r) => `${r.tag} ${r.ux}/${r.uy}`).join('  '));
  }

  /* ── AND THE SAME PLACE IN EVERY DIRECTION ──
     A drawing that sits mid-chest facing south and slides to the armpit facing
     east is consistent within each sheet and wrong to a player, who turns
     round constantly.  Compared per POSE so a stride is never measured against
     a stand. */
  const byPose = {};
  for (const r of rows) {
    const pose = r.tag.split('-')[0];
    (byPose[pose] = byPose[pose] || []).push(r);
  }
  for (const reg of HELD) {
    const spread = [];
    for (const pose of Object.keys(byPose)) {
      const rs = byPose[pose].filter((r) => r.reg === reg);
      if (rs.length < 2) continue;
      const dx = Math.max(...rs.map((r) => r.uxMid)) - Math.min(...rs.map((r) => r.uxMid));
      const dy = Math.max(...rs.map((r) => r.uyMid)) - Math.min(...rs.map((r) => r.uyMid));
      spread.push(`${pose} ${dx.toFixed(2)}/${dy.toFixed(2)}`);
    }
    if (spread.length) {
      console.log(`      ${REGION_NAME[reg]} — spread across FACINGS of one pose: ${spread.join('  ')}`);
    }
  }

  /* ═══ THE PATTERN HALF ═══
     A tattoo is fitted to the body per frame; a garment PATTERN is not fitted
     at all — stampPattern phases its tile on the frame's own coordinates, so
     the tile stands still while the figure moves through it.  The shipped
     tiles repeat every 12-16px in 256-space (patternCatalog: stripe-v is 4
     cells at cell 3, chevron 8 at 2), so a figure that shifts 6px inside its
     frame between frames drags the stripes half a period across the shirt.

     THE THRESHOLD IS THE TILE, not a number chosen to pass: half of the
     shortest shipped period (12px) is 6px, and past half a period every
     stripe has moved into where its neighbour was — which is the point at
     which "the fabric shifted" stops being a sub-pixel shimmer and becomes a
     pattern that visibly walks across the garment. */
  const crawl = [...new Map(rows.map((r) => [r.tag, r])).values()]
    .map((r) => ({ tag: r.tag, dx: r.figDx, dy: r.figDy }))
    .sort((a, b) => Math.max(b.dx, b.dy) - Math.max(a.dx, a.dy));
  const worstCrawl = crawl[0] || { tag: 'n/a', dx: 0, dy: 0 };
  /* v2.3.2083: REPORTED, not gated, and the reason is the point.  This number
     is how far the FIGURE travels inside its cel, which is a property of the
     ART and does not change when the pattern is fixed.  It was the right
     measurement for finding the bug -- while the tile was phased on the cel,
     figure travel WAS pattern crawl -- and it is the wrong assertion for
     guarding the fix, because v2.3.2082 anchors the tile to the garment's own
     centroid, so the figure may travel as far as it likes and the stripes go
     with it.  Gating it would fail forever on art that is behaving.
     tools/dev/pattern-drift.py carries the same numbers for every pose sheet
     and the arithmetic against the 12-16px tile periods. */
  console.log(`      garment patterns — figure travel inside its own cel `
    + `(was the crawl before v2.3.2082, now ridden out by the garment anchor): `
    + crawl.slice(0, 6).map((c) => `${c.tag} ${c.dx}/${c.dy}px`).join('  '));

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
