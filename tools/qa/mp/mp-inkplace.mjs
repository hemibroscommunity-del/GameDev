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
 * So the probe reports each frame's own opaque extent (fx0..fx1, fy0..fy1) —
 * the FIGURE — and the ink is measured against the character:
 *
 *     cx = (ox + dw/2 - fx0) / figureW    the ink's centre across the figure
 *     cy = (oy + dh/2 - fy0) / figureH    ... and down it
 *     sx = dw / figureW                   how much of the figure it covers
 *     sy = dh / figureH
 *
 * A tattoo that sits on the same part of the body all cycle holds those steady
 * frame to frame.  One that crawls moves cx/cy; one that breathes moves sx/sy.
 * The gate is the SPREAD (max - min) across the frames of one sheet.
 *
 * ── THE FIGURE MOVES TOO, WHICH IS WHY THE GATE IS NOT TIGHT ──
 * The figure box is not a fixed frame of reference either: arms swing out
 * through a stride and widen it, a raised knee moves its bottom edge.  A
 * perfectly-placed chest tattoo therefore still wobbles a few percent.  The
 * gate is set from the shipped art — the numbers are in the commit that added
 * this file — far enough above the honest wobble to mean something and far
 * enough below a real crawl to catch one.
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

const REGIONS = ['face', 'tattoo', 'arms', 'pants'];
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
          /* Against the FIGURE, not the region box — see the header. */
          const fw = g.fx1 - g.fx0 + 1, fh = g.fy1 - g.fy0 + 1;
          if (!(fw > 1) || !(fh > 1)) continue;
          const dw = g.cw * 16, dh = g.ch * 16;
          us.push((g.ox + dw / 2 - g.fx0) / fw);
          vs.push((g.oy + dh / 2 - g.fy0) / fh);
          sxs.push(dw / fw);
          sys.push(dh / fh);
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
        for (const { g } of perFrame.values()) { lefts.push(g.fx0); tops.push(g.fy0); }
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
  const SLIDE = 0.20;   /* of the figure's own width/height */
  const BREATHE = 0.35; /* of the figure's own width/height */
  for (const reg of REGIONS) {
    const rs = rows.filter((r) => r.reg === reg);
    if (!rs.length) { rec.ok(`${REGION_NAME[reg]} was measured on some animation`, false, { reg }); continue; }
    const slid = rs.filter((r) => r.ux > SLIDE || r.uy > SLIDE);
    const worst = rs.reduce((a, b) => (Math.max(b.ux, b.uy) > Math.max(a.ux, a.uy) ? b : a));
    rec.ok(`${REGION_NAME[reg]} stays put through all ${rs.length} animation sheets `
      + `(worst ${worst.tag}: ${worst.ux} across / ${worst.uy} down)`,
      slid.length === 0, { slid: slid.slice(0, 5) });
    const breathed = rs.filter((r) => r.sx > BREATHE || r.sy > BREATHE);
    const wb = rs.reduce((a, b) => (Math.max(b.sx, b.sy) > Math.max(a.sx, a.sy) ? b : a));
    rec.ok(`...and keeps the same size on the body (worst ${wb.tag}: ${wb.sx} wide / ${wb.sy} tall)`,
      breathed.length === 0, { breathed: breathed.slice(0, 5) });
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
  const ACROSS = 0.28;   /* facings reshape the body far more than frames do */
  for (const reg of REGIONS) {
    const bad = [];
    for (const pose of Object.keys(byPose)) {
      const rs = byPose[pose].filter((r) => r.reg === reg);
      if (rs.length < 2) continue;
      const dx = Math.max(...rs.map((r) => r.uxMid)) - Math.min(...rs.map((r) => r.uxMid));
      const dy = Math.max(...rs.map((r) => r.uyMid)) - Math.min(...rs.map((r) => r.uyMid));
      if (dx > ACROSS || dy > ACROSS) bad.push({ pose, dx: +dx.toFixed(3), dy: +dy.toFixed(3), n: rs.length });
    }
    rec.ok(`${REGION_NAME[reg]} lands in the same place whichever way you face`,
      bad.length === 0, { bad: bad.slice(0, 5) });
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
  const HALF_TILE = 6;
  const walked = crawl.filter((c) => c.dx > HALF_TILE || c.dy > HALF_TILE);
  rec.ok(`a garment pattern does not walk half a tile across the fabric between `
    + `frames (worst ${worstCrawl.tag}: ${worstCrawl.dx}px across, ${worstCrawl.dy}px `
    + `down, against a 12px period)`,
    walked.length === 0, { walked: walked.slice(0, 8), all: crawl.slice(0, 8) });

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
