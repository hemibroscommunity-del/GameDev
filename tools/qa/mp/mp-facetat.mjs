/* THE FACE TATTOO VANISHES WHEN YOU RUN (v2.3.1991 probe, v2.3.1992 gate).
 *
 * Owner: "I think it's the face tattoo only showing on idle and disappears
 * during jog but then pops up on one frame."
 *
 * This photographs the same character standing and then running, with ink that
 * cannot be mistaken for anything else, so the three states the owner describes
 * — on when idle, off while running, on for one frame — are visible side by
 * side in one image.
 *
 * WHAT IT TURNED OUT TO BE (v2.3.1992).  Not the region: the face mask is
 * exactly the head on every run frame.  The FIT.  stampRegion measured the
 * region's column extent by walking a per-FRAME histogram while comparing its
 * index against a per-SHEET coordinate, so on frame 0 (where the two spaces
 * coincide) it was right and on every later frame both ends of the extent
 * walked to the last kept column — a one-pixel-wide box, which gridFit then
 * clamped back up to a 16px grid jammed against the leading edge of the face,
 * half of it off the head and clipped away by the mask.  Frame 0 is
 * the frame that popped, and a standing sheet is one frame, which is why idle
 * was always fine.
 *
 * WHY THIS SCENARIO NOW ASKS ABOUT ALL FOUR DRAWINGS.  The same fit serves the
 * chest tattoo, the arm tattoo and the trouser print, and the same defect hit
 * all four on every jog frame — nobody had reported the trouser print because
 * a print is a smaller thing to lose than a face.  A fix for one of them that
 * broke another would look exactly like a fix, so the gate below measures the
 * fit on EVERY sheet the game bakes (stand and jog, all five facings) and on
 * all four regions.
 *
 * HOW THE GATE TELLS A GOOD FIT FROM A COLLAPSED ONE.  Not by the box's size —
 * a chest legitimately narrows to 39% of its widest mid-stride as the torso
 * twists, so "the box is small" proves nothing.  By MASS: the probe reports the
 * row/column histograms the extent was measured from, so the question is what
 * share of the region's own pixels the fitted box actually spans.  Measured on
 * the shipped art: 0.003-0.006 on every broken frame, 0.82-1.00 on every frame
 * that fits.  There is no threshold to tune between those.
 */
import * as H from './harness.mjs';

/* A 16x16 grid, palette index 1, in a solid band across rows 4-7 — big,
   central, and impossible to confuse with a shadow or a fold. */
const FACE_ART = Array.from({ length: 16 }, (_, y) =>
  Array.from({ length: 16 }, (_, x) => (y >= 4 && y <= 7 && x >= 3 && x <= 12) ? '1' : '0').join(''),
).join('');
/* v2.3.1992: the other three regions, inked so the bake reports their fits too.
   Solid blocks rather than the face's band: what these are for is the
   MEASUREMENT (and being visible in the whole-figure shot), not legibility as a
   design. */
const BLOCK_ART = Array.from({ length: 16 }, (_, y) =>
  Array.from({ length: 16 }, (_, x) => (y >= 3 && y <= 12 && x >= 3 && x <= 12) ? '2' : '0').join(''),
).join('');
/* Every sheet the game bakes for a drawn player, and what the owner is in when
   they see each: five standing facings and five running ones. */
const REGIONS = ['face', 'tattoo', 'arms', 'pants'];
const REGION_NAME = { face: 'the face tattoo', tattoo: 'the chest tattoo', arms: 'the arm tattoo', pants: 'the trouser print' };

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Inked', wsPort, webPort, viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1800);

  const set = await P.page.evaluate(([face, block]) => {
    try {
      localStorage.setItem('bt-facetattoo', face);
      /* v2.3.1992: chest, arm and trousers too — one bake, four fits. */
      localStorage.setItem('bt-tattooart', block);
      localStorage.setItem('bt-armtattoo', block);
      localStorage.setItem('bt-pantsart', block);
    } catch (e) { return { ok: false }; }
    window.__btGridProbe = 1;   /* ask the bake to report its fitted grids */
    /* Nudge the art layer so the body sheet re-bakes with the new ink. */
    try { if (window.__btSetHair) window.__btSetHair('none'); } catch (e) { /* bald is fine */ }
    return { ok: true, len: face.length };
  }, [FACE_ART, BLOCK_ART]);
  rec.ok('a face tattoo (and chest/arm/trouser ink) is set (guard)', !!(set && set.ok), set);

  /* The flag has to survive the reload, or the bake runs with the probe off —
     which is how the first attempt read back a null grid report. */
  await P.page.addInitScript(() => { window.__btGridProbe = 1; });
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await P.page.waitForTimeout(1200);
  const created = await P.page.$('[data-tut="login-create"]');
  if (created) await created.click();
  await H.enterWorld(P).catch(() => {});
  await P.page.waitForTimeout(2500);

  const shot = async () => {
    const b = await P.page.evaluate(() => {
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2 - 26), y: Math.round(r.y + r.height / 2 - 60), width: 52, height: 56 };
    });
    return P.page.screenshot({ clip: b });
  };

  const shots = [];
  /* v2.3.1992: the WHOLE PHONE SCREEN at game size, standing, before any of the
     cropped frames below.  TRAPS "A skin blob on a character sheet is NOT the
     body part you think it is": the crop that proves your fix is the crop that
     hides your side effect, and this scenario's 52x56 clip is exactly such a
     crop — it is the right instrument for "is there ink on the face" and it
     cannot show ink that has landed somewhere else on the figure. */
  const { writeFileSync: _wf } = await import('node:fs');
  _wf(H.REPO + '/tools/qa/mp/.last-facetat-idle.png', await P.page.screenshot());
  /* IDLE FACING SOUTH — the state the owner says works. */
  for (let i = 0; i < 2; i++) { await P.page.waitForTimeout(160); shots.push(await shot()); }
  /* IDLE FACING EAST. This separates POSE from DIRECTION, and it is the
     control the first run of this scenario was missing: the owner idles facing
     south and runs facing east, so "works on idle, gone on the run" and "works
     facing south, gone facing east" produce the identical report. Tap east
     briefly, then stand still. */
  await P.page.keyboard.down('d');
  await P.page.waitForTimeout(260);
  await P.page.keyboard.up('d');
  await P.page.waitForTimeout(900);
  for (let i = 0; i < 2; i++) { await P.page.waitForTimeout(160); shots.push(await shot()); }
  /* Then a full stride, sampled densely enough to catch a single frame. */
  await P.page.keyboard.down('d');
  for (let i = 0; i < 14; i++) {
    await P.page.waitForTimeout(70);
    shots.push(await shot());
    /* ...and one whole screen MID-STRIDE, for the same reason. */
    if (i === 7) _wf(H.REPO + '/tools/qa/mp/.last-facetat-run.png', await P.page.screenshot());
  }
  await P.page.keyboard.up('d');
  rec.ok('captured idle-south, idle-east, then a full stride', shots.length === 18, { shots: shots.length });

  const strip = await P.page.evaluate(async (pngs) => {
    const imgs = await Promise.all(pngs.map((b64) => new Promise((res) => {
      const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null);
      im.src = 'data:image/png;base64,' + b64;
    })));
    const ok = imgs.filter(Boolean);
    if (!ok.length) return null;
    const S = 6, cols = 6;
    const rows = Math.ceil(ok.length / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * ok[0].width * S; cv.height = rows * ok[0].height * S;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#14202a'; g.fillRect(0, 0, cv.width, cv.height);
    ok.forEach((im, i) => g.drawImage(im, (i % cols) * im.width * S, Math.floor(i / cols) * im.height * S,
      im.width * S, im.height * S));
    return cv.toDataURL('image/png');
  }, shots.map((b) => b.toString('base64')));

  if (strip) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(H.REPO + '/tools/qa/mp/.last-facetat.png', Buffer.from(strip.split(',')[1], 'base64'));
  }
  rec.ok('a strip was captured (1-2 idle south, 3-4 idle EAST, rest running east)', !!strip);

  /* ── THE MEASUREMENT ──
     The face region is "bare skin above the torso band's top row"
     (playerDecal.js splitSkinRegions). The tattoo is painted into whatever
     that region says, so a frame where it collapses paints nothing. Read the
     per-frame sizes for the pose the character is actually in. */
  const all = await P.page.evaluate(() => window.__btSkinRegions || null);
  const keys = all ? Object.keys(all) : [];
  rec.ok('the bake reported per-frame face regions (guard)', keys.length > 0, { sheets: keys });
  /* BY NAME, not by size: keying on frame count picked the 14-frame MINING
     strip as "the biggest" and reported on the wrong animation. */
  const regions = all && all['jog-east'] ? all['jog-east'] : null;
  if (regions) {
    const f = regions.face;
    const zero = f.filter((n) => n === 0).length;
    const nonzero = f.filter((n) => n > 0);
    rec.ok(`the face region exists on every frame (${f.length - zero}/${f.length} frames have one)`,
      zero === 0, { zeroFrames: zero, total: f.length, face: f });
    rec.ok('...and is a consistent size, not collapsing frame to frame',
      nonzero.length > 0 && Math.min(...nonzero) > Math.max(...nonzero) * 0.4,
      { min: nonzero.length ? Math.min(...nonzero) : null, max: nonzero.length ? Math.max(...nonzero) : null, face: f });
    rec.ok('...and the sheet measured really is the east run strip',
      regions.frames > 4, { frames: regions.frames, sheets: keys });
  }

  /* The baked strip itself — the difference between "the region said it could
     be painted" and "it was painted". */
  const grids = await P.page.evaluate(() => window.__btFaceGrids || null);
  rec.ok('the stamp reported a fitted grid for the run strip',
    !!(grids && grids.length), grids && { n: grids.length });
  if (grids && grids.length) {
    /* THE FIT ITSELF. The region is right and nothing paints, so the question
       is where the 16x16 grid landed: `cw`/`ch` are the cell size in pixels,
       and a grid whose cells are sub-pixel paints nothing at all. */
    const cw = grids.map((g) => +g.cw.toFixed(2)), ch = grids.map((g) => +g.ch.toFixed(2));
    rec.ok(`every frame's grid cell is at least a pixel (min ${Math.min(...cw)}x${Math.min(...ch)})`,
      Math.min(...cw) >= 1 && Math.min(...ch) >= 1,
      { minCw: Math.min(...cw), minCh: Math.min(...ch), sample: grids[0] });
    rec.ok('...and the grid sits on the head, not off it',
      grids.every((g) => g.ox >= g.lx - g.cw && g.oy >= g.ty - g.ch),
      { sample: grids.slice(0, 2) });
  }

  /* ── EVERY SHEET, EVERY REGION (v2.3.1992) ──
     The reduction runs INSIDE the page on purpose: the histograms are ~500k
     integers across ten sheets and four regions, and shipping them over the
     debug channel to count them here would cost seconds and prove nothing
     extra.  What comes back is one row per (sheet, region). */
  const fits = await P.page.evaluate(() => {
    const by = window.__btGridsByTag || null;
    if (!by) return null;
    const out = [];
    for (const tag of Object.keys(by)) {
      for (const reg of ['face', 'tattoo', 'arms', 'pants']) {
        const gs = (by[tag] && by[tag][reg]) || [];
        if (!gs.length) continue;
        let colCov = 1, rowCov = 1, minCw = Infinity, minCh = Infinity, offRegion = 0, worst = null;
        for (const g of gs) {
          if (!g.colN || !g.rowN) continue;
          const x0 = g.frame * 256;
          const cTot = g.colN.reduce((a, b) => a + b, 0) || 1;
          const rTot = g.rowN.reduce((a, b) => a + b, 0) || 1;
          let cIn = 0, rIn = 0;
          for (let i = g.lx - x0; i <= g.rx - x0; i++) cIn += g.colN[i] || 0;
          for (let i = g.ty; i <= g.by; i++) rIn += g.rowN[i] || 0;
          const c = cIn / cTot, r = rIn / rTot;
          if (c < colCov) { colCov = c; worst = { frame: g.frame, lx: g.lx, rx: g.rx, ty: g.ty, by: g.by, cw: +g.cw.toFixed(2) }; }
          if (r < rowCov) rowCov = r;
          if (g.cw < minCw) minCw = g.cw;
          if (g.ch < minCh) minCh = g.ch;
          /* the grid has to overlap the region it was measured from at all */
          if (g.ox + g.cw * 16 <= g.lx || g.ox >= g.rx + 1) offRegion++;
        }
        out.push({ tag, reg, n: gs.length, colCov: +colCov.toFixed(3), rowCov: +rowCov.toFixed(3),
          minCw: +minCw.toFixed(2), minCh: +minCh.toFixed(2), offRegion, worst });
      }
    }
    return out;
  });
  rec.ok('the bake reported a fit for every sheet it baked (guard)',
    !!(fits && fits.length >= 8), fits && { rows: fits.length, tags: [...new Set(fits.map((f) => f.tag))] });

  if (fits && fits.length) {
    /* Measured on the shipped art: a fitted box spans 0.82-1.00 of its region's
       mass when the fit is right and 0.003-0.006 when it has collapsed.  0.6 is
       nowhere near either, which is the point of putting it there. */
    const MASS = 0.6;
    for (const reg of REGIONS) {
      const rows = fits.filter((f) => f.reg === reg);
      if (!rows.length) { rec.ok(`${REGION_NAME[reg]} was measured on some sheet`, false, { reg }); continue; }
      const bad = rows.filter((f) => f.colCov < MASS || f.rowCov < MASS);
      const worstRow = rows.reduce((a, b) => (b.colCov < a.colCov ? b : a));
      rec.ok(`${REGION_NAME[reg]}: the fitted box holds its region on all ${rows.length} sheets `
        + `(worst ${worstRow.tag} ${worstRow.colCov} across / ${Math.min(...rows.map((r) => r.rowCov))} down)`,
        bad.length === 0, { bad: bad.slice(0, 4) });
      const thin = rows.filter((f) => f.minCw < 1 || f.minCh < 1);
      rec.ok(`...and every cell of its 16x16 grid is at least a pixel`,
        thin.length === 0, { thin: thin.slice(0, 4) });
      const off = rows.filter((f) => f.offRegion > 0);
      rec.ok(`...and no frame's grid lands off the region entirely`,
        off.length === 0, { off: off.slice(0, 4) });
    }
    /* THE POSE IS THE WHOLE REPORT: idle works, the jog does not.  So the jog
       sheets are called out by name rather than being averaged in with the
       standing ones they were always going to outnumber. */
    const jog = fits.filter((f) => f.tag.startsWith('jog'));
    const stand = fits.filter((f) => f.tag.startsWith('stand'));
    rec.ok(`the RUNNING sheets fit as well as the standing ones `
      + `(jog worst ${jog.length ? Math.min(...jog.map((f) => f.colCov)) : 'n/a'}, `
      + `stand worst ${stand.length ? Math.min(...stand.map((f) => f.colCov)) : 'n/a'})`,
      jog.length >= 4 && stand.length >= 4 && Math.min(...jog.map((f) => f.colCov)) >= 0.6,
      { jog: jog.filter((f) => f.colCov < 0.6).slice(0, 4), tags: [...new Set(fits.map((f) => f.tag))] });
  }

  const bake = await P.page.evaluate(() => window.__btLastBake || null);
  if (bake && bake.png) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(H.REPO + '/tools/qa/mp/.last-bake.png', Buffer.from(bake.png.split(',')[1], 'base64'));
    if (bake.region) writeFileSync(H.REPO + '/tools/qa/mp/.last-region.png', Buffer.from(bake.region.split(',')[1], 'base64'));
  }
  rec.ok('the baked run strip was captured', !!(bake && bake.png), bake && { frames: bake.frames });

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
