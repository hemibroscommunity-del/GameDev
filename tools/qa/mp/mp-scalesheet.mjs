/* WHAT SIZE IS THE CHARACTER, FACING EACH WAY? (v2.3.1830)
 *
 * Owner: "the larger issue is still the inconsistent player scale per
 * direction.  I need you to provide a visual preview of the character per
 * direction and come up with the best solution to equalize the scale."
 *
 * Measures BOTH poses in all eight facings through bodyFigureProbe — the
 * painted crown-to-boots of the frame actually on screen, converted through
 * the live transform — and writes the numbers to out/scale.json for
 * tools/qa/scale-sheet.mjs to draw a contact sheet from.
 *
 * v2.3.1826 normalised STAND to within 4%; jog was deliberately left alone
 * because its numbers encode a perceptual correction (v2.3.740).  If the
 * character still changes size as it turns, jog is the remaining suspect and
 * this is what shows it rather than argues about it.
 *
 * v2.3.1830: it was — jog spanned 8.1%.  The jog map is now anchored on
 * east's height so v2.3.740 survives untouched; these assertions hold it.
 */
import * as H from './harness.mjs';
import fs from 'fs';

const DIRS = ['south', 'southeast', 'east', 'northeast', 'north', 'northwest', 'west', 'southwest'];
const ANG = {
  east: 0, southeast: Math.PI / 4, south: Math.PI / 2, southwest: 3 * Math.PI / 4,
  west: Math.PI, northwest: -3 * Math.PI / 4, north: -Math.PI / 2, northeast: -Math.PI / 4,
};

/* Pin the facing from INSIDE a rAF — _facingAngle is slewed by the game loop,
   so a value written from evaluate() is gone before the next draw. */
async function pinStand(P, dir) {
  await P.page.evaluate(({ d, ang }) => {
    window.__btPinDir = d;
    if (window.__btPinRaf) return;
    const tick = () => {
      const S = window._gameState && window._gameState.current;
      const k = window.__btPinDir;
      if (S && k) { S._facing = k; S._facingAngle = ang[k]; S._renderFacing = k; }
      window.__btPinRaf = requestAnimationFrame(tick);
    };
    window.__btPinRaf = requestAnimationFrame(tick);
  }, { d: dir, ang: ANG });
  await P.page.waitForTimeout(700);
}

/* ═══ JOG IS DRIVEN WITH REAL KEYS ═══
   The first version of this faked it: it nudged the player ±2px on alternate
   frames, which nets to zero displacement, so the renderer never saw movement
   and every "jogging" row came back pose:'stand' — identical numbers to the
   standing pass, and TWO ASSERTIONS PASSED VACUOUSLY off them.  Holding the
   real keys makes the game choose the pose and the facing, which is the thing
   under test; the probe reports which facing was actually drawn, so the
   mirror collapse (west renders as east) is observed rather than assumed. */
const KEYS = {
  north: ['KeyW'], south: ['KeyS'], west: ['KeyA'], east: ['KeyD'],
  northeast: ['KeyW', 'KeyD'], northwest: ['KeyW', 'KeyA'],
  southeast: ['KeyS', 'KeyD'], southwest: ['KeyS', 'KeyA'],
};
async function jog(P, dir) {
  /* Stop the standing pin first or it fights the game's own facing. */
  await P.page.evaluate(() => {
    if (window.__btPinRaf) { cancelAnimationFrame(window.__btPinRaf); window.__btPinRaf = null; }
  });
  const keys = KEYS[dir] || [];
  for (const k of keys) await P.page.keyboard.down(k);
  await P.page.waitForTimeout(900);    // let the walk cycle actually start

  /* ═══ COVER THE CYCLE BY FRAME INDEX, NOT BY CLOCK ═══
     A jogging figure's painted height swings from ~68 to ~83 screen px as it
     bobs, so what a timed sample measures is mostly WHERE IN THE STRIDE it
     landed.  Two earlier versions got this wrong in different ways:
       - one frame only: east read 70.9 against west 83.3, the SAME sheet
         mirrored and therefore impossible;
       - 14 timed shots: southeast read 79.33 against southwest 78.55 — again
         one sheet, and still 1% apart, because the median of 14 draws from a
         15px range is still noisy.
     So sample until every frame INDEX has been seen (the probe reports it),
     keep one reading per index, and take the median across the cycle.  That
     is deterministic: mirrors then agree exactly, which is the check that it
     converged rather than the check that it ran. */
  const byFrame = new Map();
  let seenSame = 0;
  for (let i = 0; i < 220 && seenSame < 45; i++) {
    const r = await P.page.evaluate(() => (window._pixiRenderer && window._pixiRenderer.bodyFigureProbe
      ? window._pixiRenderer.bodyFigureProbe() : null));
    if (r && !r.err && r.painted && r.painted.h > 0 && r.pose === 'jog') {
      const had = byFrame.has(r.frameIx);
      if (!had) byFrame.set(r.frameIx, r);
      seenSame = had ? seenSame + 1 : 0;
    }
    await P.page.waitForTimeout(25);
  }
  const samples = [...byFrame.values()];
  for (const k of keys) await P.page.keyboard.up(k);
  await P.page.waitForTimeout(250);
  if (!samples.length) return null;
  samples.sort((a, b) => a.frameIx - b.frameIx);
  const med = (arr) => arr.slice().sort((a, b) => a - b)[arr.length >> 1];
  const hs = samples.map((r) => r.figurePx);
  const ws = samples.map((r) => r.widthPx);
  const base = samples[Math.floor(samples.length / 2)];
  return Object.assign({}, base, {
    figurePx: +med(hs).toFixed(2),
    widthPx: +med(ws).toFixed(2),
    hMin: +Math.min(...hs).toFixed(1), hMax: +Math.max(...hs).toFixed(1),
    n: samples.length,
    frames: samples.map((r) => r.frameIx),
  });
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Ruler', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  /* Dress the figure before measuring, or the trait guards below have
     nothing to read and SKIP — which looks like a pass in the summary line.
     Ids come out of the game's own catalogs (mp-bodysize does the same) so a
     retired id cannot silently return this to a bare head. */
  const dressed = await P.page.evaluate(() => {
    const f = window._gameFns;
    if (!f || !f.setHeadwear || !f.HEADWEAR_CATALOG) return null;
    const hat = (f.HEADWEAR_CATALOG || []).find((h) => h && h.id && h.id !== 'none');
    const beard = (f.FACIALHAIR_CATALOG || []).find((b) => b && b.id && b.id !== 'none');
    try { if (hat) f.setHeadwear(hat.id); } catch (e) { /* retired id */ }
    try { if (beard && f.setFacialHair) f.setFacialHair(beard.id); } catch (e) {}
    return { hat: hat && hat.id, beard: beard && beard.id };
  });
  await P.page.waitForTimeout(1500);
  rec.ok('the character is wearing a hat, so trait scale can be checked (guard)',
    !!(dressed && dressed.hat), dressed);

  const rows = [];
  const keep = (want, moving, r) => {
    if (r && !r.err && r.painted && r.painted.h > 0) {
      rows.push({ want, moving, pose: r.pose, facing: r.facing,
        figurePx: r.figurePx, widthPx: r.widthPx, feetOffsetPx: r.feetOffsetPx,
        hMin: r.hMin, hMax: r.hMax, n: r.n, frames: r.frames,
        hatScaleRatio: r.hatScaleRatio, beardScaleRatio: r.beardScaleRatio,
        painted: r.painted, unitPxY: r.unitPxY });
    }
  };
  for (const d of DIRS) {
    await pinStand(P, d);
    keep(d, false, await P.page.evaluate(() => (window._pixiRenderer && window._pixiRenderer.bodyFigureProbe
      ? window._pixiRenderer.bodyFigureProbe() : null)));
  }
  for (const d of DIRS) keep(d, true, await jog(P, d));

  rec.ok('every facing was measured in both poses (guard)',
    rows.length === DIRS.length * 2, { got: rows.length, of: DIRS.length * 2 });
  /* GUARD AGAINST THE VACUOUS PASS: if the jog rows are not actually the jog
     pose, every jog assertion below is measuring the standing sheet and will
     agree with itself perfectly.  That is exactly what the first version of
     this file did. */
  const jogRows = rows.filter((r) => r.moving);
  rec.ok('the jogging pass really reached the JOG pose (guard)',
    jogRows.length > 0 && jogRows.every((r) => r.pose === 'jog'),
    { poses: jogRows.map((r) => `${r.want}:${r.pose}`) });
  /* A median over a PARTIAL cycle is just a differently-shaped guess, so
     assert the sampler actually walked the whole strip.  The shortest jog
     sheet is southwest's 20 frames. */
  rec.ok('every jog reading covers a whole run cycle, not part of one (guard)',
    jogRows.every((r) => (r.frames || []).length >= 20),
    { seen: jogRows.map((r) => `${r.want}=${(r.frames || []).length}`) });

  const byPose = (mv) => rows.filter((r) => r.moving === mv);
  for (const [label, mv] of [['standing', false], ['jogging', true]]) {
    const set = byPose(mv);
    if (!set.length) continue;
    const hs = set.map((r) => r.figurePx);
    const lo = Math.min(...hs), hi = Math.max(...hs);
    const spread = (hi - lo) / ((hi + lo) / 2);
    const sorted = set.slice().sort((a, b) => a.figurePx - b.figurePx);
    /* v2.3.1832: 4% -> 1%.  4% was the threshold a NOISY sampler needed; now
       that the cycle is covered by frame index the reading is deterministic
       (mirrors agree to 0.00px), so the assertion can be as tight as the
       thing it is guarding.  Measured: stand 0.1%, jog 0.05%. */
    rec.ok(`${label}: the character is the same height whichever way it faces (within 1%)`,
      spread < 0.01,
      { spreadPct: +(spread * 100).toFixed(1),
        smallest: `${sorted[0].want} ${sorted[0].figurePx}`,
        largest: `${sorted[sorted.length - 1].want} ${sorted[sorted.length - 1].figurePx}`,
        all: set.map((r) => `${r.want}=${r.figurePx}`) });
  }

  /* Stand vs jog for the SAME facing: the character must not pop when it
     stops.  This is the pairing v2.3.684 was chasing one facing at a time. */
  const pops = [];
  for (const d of DIRS) {
    const s = rows.find((r) => r.want === d && !r.moving);
    const j = rows.find((r) => r.want === d && r.moving);
    if (!s || !j) continue;
    pops.push({ dir: d, stand: s.figurePx, jog: j.figurePx,
      pct: +(((j.figurePx - s.figurePx) / s.figurePx) * 100).toFixed(1) });
  }
  const worstPop = pops.reduce((a, b) => (Math.abs(b.pct) > Math.abs(a.pct) ? b : a), pops[0] || { pct: 0 });
  /* v2.3.1832: 6% -> 2.5%.  Measured +1.7% in every facing, which is the pop
     v2.3.740 already accepted for east and is now uniform rather than ranging
     to +8.4%.  Tight enough that any facing drifting off the shared anchor
     fails here. */
  rec.ok('no facing changes size when it starts or stops moving (within 2.5%)',
    Math.abs(worstPop.pct || 0) < 2.5, { worst: worstPop, all: pops });

  /* ═══ MIRRORS MUST AGREE, AND ON THE SCALE, NOT THE BOB ═══
     west renders the east sheet flipped, NW the NE sheet, SE the SW sheet —
     so the applied scale is necessarily identical and any difference is a
     measurement artefact.  This is the check that caught the single-frame
     sampling (east 70.9 vs west 83.3 off ONE sheet).  It asserts on
     unitPxY — screen px per texture px, which is the scale alone — because
     figurePx legitimately differs by where in the run cycle each landed. */
  for (const [a, b] of [['east', 'west'], ['northeast', 'northwest'], ['southwest', 'southeast']]) {
    for (const mv of [false, true]) {
      const ra = rows.find((r) => r.want === a && r.moving === mv);
      const rb = rows.find((r) => r.want === b && r.moving === mv);
      if (!ra || !rb) continue;
      rec.ok(`${mv ? 'jogging' : 'standing'}: ${b} is drawn at the same scale as ${a} (same sheet, mirrored)`,
        Math.abs(ra.unitPxY - rb.unitPxY) < 1e-4,
        { [a]: ra.unitPxY, [b]: rb.unitPxY });
      /* And therefore at the same HEIGHT.  This is the assertion that fails
         when the sampler has not converged — it is how the 14-shot version
         was caught reading SE 79.33 against SW 78.55 off one sheet. */
      rec.ok(`${mv ? 'jogging' : 'standing'}: ...and reads the same height as ${a} (sampler converged)`,
        Math.abs(ra.figurePx - rb.figurePx) < 0.1,
        { [a]: ra.figurePx, [b]: rb.figurePx });
    }
  }

  /* ═══ THE HATS DID NOT COME LOOSE ═══
     The owner's standing worry about any body-scale change is "relative item
     scale like hats, beards".  mp-bodysize asserts trait/body ratio but only
     while STANDING, so nothing covered the pose this version changed.

     THE INVARIANT IS NOT "FLAT ACROSS ALL EIGHT", and the first draft of this
     assertion said it was and duly failed on correct code.  Jog east/west
     hats carry JOG_EW_HAT_TUNE — a global 0.67 plus a per-hat multiplier the
     owner dialled in hat by hat at v2.3.1353/1354 — so east and west SHOULD
     read differently from the other six.  What must hold is that the ratio
     depends only on that tune and not on the body scale: flat within each
     group, and east exactly equal to west.
     The beard is measured on fewer facings by design — turned away from the
     camera there is no beard on screen to measure. */
  const EW = new Set(['east', 'west']);
  for (const [what, key, minSeen] of [['hat', 'hatScaleRatio', 8], ['beard', 'beardScaleRatio', 2]]) {
    const worn = rows.filter((r) => r.moving && r[key] > 0);
    rec.ok(`jogging: the ${what} is on screen to be measured (guard)`,
      worn.length >= minSeen, { measured: worn.length, need: minSeen,
        all: worn.map((r) => `${r.want}=${r[key]}`) });
    for (const [group, want] of [['the six unturned facings', false], ['east/west', true]]) {
      const g = worn.filter((r) => EW.has(r.want) === want);
      if (g.length < 2) continue;
      const v = g.map((r) => r[key]);
      const spread = (Math.max(...v) - Math.min(...v)) / (Math.max(...v) || 1);
      rec.ok(`jogging: the ${what} keeps one size relative to the body across ${group}`,
        spread < 0.02, { spreadPct: +(spread * 100).toFixed(2),
          all: g.map((r) => `${r.want}=${r[key]}`) });
    }
  }

  try {
    fs.mkdirSync('tools/qa/mp/out', { recursive: true });
    fs.writeFileSync('tools/qa/mp/out/scale.json', JSON.stringify({ rows, pops }, null, 1));
  } catch (e) { /* the assertions are the test; the file is for the picture */ }

  await P.ctx.close().catch(() => {});
}
