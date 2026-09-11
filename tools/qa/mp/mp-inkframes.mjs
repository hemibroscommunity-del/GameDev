/* A DRAWING MUST NOT PULSE AS HE RUNS (v2.3.2470).
 *
 * Owner: "Shirtless south jog tattoos flicker on chest."
 *
 * ── WHY THIS FILE MEASURES THE STRIP AND NOT THE SCREEN ──
 * Three separate counters gave this bug a clean bill before it was found: the
 * body-sheet cache never missed, the swing/block stand-in strips were all baked
 * before the loading gate lifted, and the texture handed to the sprite was the
 * correct INKED sheet on all 48 draws of jog-south.  Every one of those was
 * true and none of them was the bug.
 *
 * The drawing is fitted and stamped ONCE PER FRAME of the strip, so a pose can
 * be perfectly cached, handed out perfectly, and still blink -- because the
 * FRAMES THEMSELVES differ.  No cache counter can see that.  The honest place
 * to measure is the baked strip, frame by frame, which is what __btInkProbe
 * makes the bake report.
 *
 * ── AND WHY THE SHAPE OF THE CLAIM IS "FLAT", NOT "PRESENT" ──
 * No frame was ever EMPTY.  Asserting "every frame has ink" passes on the
 * broken build.  What the owner can see is that the drawing GROWS AND SHRINKS,
 * so the measurement has to be the spread across the strip, not its floor.
 *
 * Measured on the shipped jog-south sheet, chest tattoo, shirtless:
 *   before   616 .. 1676   six frames far below the rest, min/median 0.43
 *   after   1032 .. 1676   the six recover,              min/median 0.71
 * Six frames of twenty-six come round about once per stride, which is why it
 * read as a flicker in time with his feet -- and why STANDING was always fine:
 * a stand sheet is one frame, and one frame has nothing to cycle between.
 */
import * as H from './harness.mjs';

const TATTOO_KEY = 'bt-tattooart';
/* Palette 8 is #3f7fd0: a blue no skin tone, trouser or ground tile leads in.
   Filling most of the grid keeps the measurement well clear of the noise a
   few-cell doodle would sit in. */
const solid = (ch) => {
  let s = '';
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) s += (y >= 3 && y <= 12 && x >= 3 && x <= 12) ? ch : '0';
  return s;
};
const median = (a) => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'InkFrames', wsPort, webPort,
    /* The probe reads each baked sheet back out of its canvas, so it is OFF
       unless a scenario asks -- far too much work to do on a player's phone. */
    init: `try { window.__btInkProbe = true;
      localStorage.setItem(${JSON.stringify(TATTOO_KEY)}, ${JSON.stringify(solid('8'))});
      localStorage.setItem('bt-shirt', 'none'); } catch (e) {}` });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  const shirt = await P.page.evaluate(() => {
    try { return localStorage.getItem('bt-shirt'); } catch (e) { return null; }
  });
  rec.ok(`SHIRTLESS, which is the case that breaks (guard: bt-shirt = ${shirt}) -- `
    + 'a shirt gives the torso a mask of its own and covers the chest anyway',
    shirt === 'none', { shirt });

  const sheets = await P.page.evaluate(() => {
    const m = window.__btSheetInk || {};
    const out = {};
    for (const k of Object.keys(m)) {
      const v = m[k];
      out[v.pose + '/' + v.dir] = v.perFrame;
    }
    return out;
  });
  rec.ok(`the bake reported its per-frame ink (guard: ${Object.keys(sheets).length} sheets) -- `
    + 'without the probe every assertion below would be vacuous',
    Object.keys(sheets).length >= 6, { sheets: Object.keys(sheets) });

  const jog = sheets['jog/south'];
  rec.ok(`the jog/south strip is baked and has frames to cycle between `
    + `(guard: ${jog && jog.length})`, !!jog && jog.length > 8, { frames: jog && jog.length });
  if (!jog) return;

  const stand = sheets['stand/south'];
  rec.ok(`the chest drawing IS in the bake at all (guard: standing carries `
    + `${stand && stand[0]} px of it)`, !!stand && stand[0] > 200, { stand });

  /* ── THE CLAIM ── */
  const min = Math.min(...jog), max = Math.max(...jog), med = median(jog);
  const ratio = +(min / med).toFixed(3);
  rec.ok(`the chest drawing does not pulse as he runs south: the thinnest frame `
    + `carries ${ratio} of the median (min ${min}, median ${med}, max ${max}); `
    + 'was 0.43 with the largest-piece rule, six frames of twenty-six far below '
    + 'the rest and coming round once a stride',
    ratio >= 0.6, { min, med, max, ratio, perFrame: jog });

  /* The floor, kept as a SEPARATE row so a future regression that empties a
     frame outright is named as that rather than as a spread. */
  rec.ok(`...and no frame of it loses the drawing outright (empty `
    + `${jog.filter((n) => n === 0).length}/${jog.length})`,
    jog.every((n) => n > 0), { perFrame: jog });

  /* ── EAST AND NORTHEAST: REPORTED, NOT PINNED, AND HERE IS WHY ──
     Owner: "northeast jog spills the tattoo to the backswing arm", "East jog
     appears to flicker the tattoo and spill onto backswing arm as well".
     These numbers moved the right way -- jog/east's spread narrowed from
     500..990 to 537..839 -- but a count of blue pixels in a frame is NOT the
     same claim as "the drawing is there".  The figure, his trousers and his
     shoes are recoloured art too and some of it leads blue, so separating the
     tattoo from the sprite needs a second bro who has drawn NOTHING and is
     otherwise identical.  That control is not built: a bro with a default look
     skips the custom bake entirely (preloadBodyAll returns early when there is
     nothing to recolour), so he produces no strips to subtract, and one with a
     different skin is not the same baseline.
     Asserting on the raw counts would be pinning the sprite as much as the
     drawing, so this row REPORTS and the suite stays honest about what it has
     actually established. */
  const eastPair = { standEast: (sheets['stand/east'] || [])[0],
    jogEast: sheets['jog/east'], standNE: (sheets['stand/northeast'] || [])[0],
    jogNE: sheets['jog/northeast'] };
  rec.ok(`east/northeast, UNCONTROLLED and reported only: ${JSON.stringify(eastPair)}`,
    true, eastPair);

  /* ── THE OTHER FRONT-FACING STRIPS, REPORTED, NOT PINNED ──
     They improved too and none of them lost ink, but their spreads are the
     poses' own (a dodge really does hide the chest mid-roll), so pinning them
     here would be pinning something this change does not own. */
  const others = {};
  for (const k of Object.keys(sheets)) {
    const v = sheets[k];
    if (k === 'jog/south' || v.length < 2 || Math.max(...v) < 200) continue;
    others[k] = { min: Math.min(...v), med: median(v), max: Math.max(...v) };
  }
  rec.ok(`the other multi-frame front strips, for the record: ${JSON.stringify(others)}`,
    true, others);
}
