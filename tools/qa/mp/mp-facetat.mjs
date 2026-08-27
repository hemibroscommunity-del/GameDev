/* THE FACE TATTOO VANISHES WHEN YOU RUN (v2.3.1991 probe).
 *
 * Owner: "I think it's the face tattoo only showing on idle and disappears
 * during jog but then pops up on one frame."
 *
 * This photographs the same character standing and then running, with a face
 * tattoo that cannot be mistaken for anything else, so the three states the
 * owner describes — on when idle, off while running, on for one frame — are
 * visible side by side in one image.
 *
 * WHY A PROBE FIRST. The suspected mechanism is that a tattoo is baked INTO
 * the body sheet, and the face region is defined as "bare skin above the
 * torso band's top row" (playerDecal.js splitSkinRegions). The band's top is
 * derived per frame from the first SKIN row, so on a run frame it can be
 * driven by something other than the head — and a face region that collapses
 * to nothing paints no tattoo. That is a theory; this is the picture.
 */
import * as H from './harness.mjs';

/* A 16x16 grid, palette index 1, in a solid band across rows 4-7 — big,
   central, and impossible to confuse with a shadow or a fold. */
const FACE_ART = Array.from({ length: 16 }, (_, y) =>
  Array.from({ length: 16 }, (_, x) => (y >= 4 && y <= 7 && x >= 3 && x <= 12) ? '1' : '0').join(''),
).join('');

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Inked', wsPort, webPort, viewport: { width: 390, height: 844 } });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1800);

  const set = await P.page.evaluate((art) => {
    try { localStorage.setItem('bt-facetattoo', art); } catch (e) { return { ok: false }; }
    window.__btGridProbe = 1;   /* ask the bake to report its fitted grids */
    /* Nudge the art layer so the body sheet re-bakes with the new ink. */
    try { if (window.__btSetHair) window.__btSetHair('none'); } catch (e) { /* bald is fine */ }
    return { ok: true, len: art.length };
  }, FACE_ART);
  rec.ok('a face tattoo is set (guard)', !!(set && set.ok), set);

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
  for (let i = 0; i < 14; i++) { await P.page.waitForTimeout(70); shots.push(await shot()); }
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
