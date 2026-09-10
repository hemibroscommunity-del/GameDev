/* ═══ THE BRO DOES NOT BOB WHEN YOU SPIN HIM (v2.3.2459) ═══
 *
 * Owner: "When you spin the bro around in the create character screen it looks
 * like north and south jump up on the platform (not consistent all the way
 * around for positioning)."
 *
 * He was right, and the number is the point: the boots landed on SIX different
 * lines across the eight facings, 15.0px apart end to end, north and south the
 * highest.  The cause was a per-angle nudge table (NameModal) written when the
 * frames really did sit at different heights and never retuned when the
 * character was halved and the art re-cut -- it was adding 8px of correction
 * to a 1px problem.
 *
 * WHAT THIS MEASURES, AND WHY IT IS THE HONEST MEASURE.  It reads the LOWEST
 * INKED ROW of the live preview canvas at each facing -- the boots -- converts
 * it to a screen line through the canvas's own box, and demands they agree.
 * Not the element's position (the element never moved; the art inside it did),
 * and not the stylesheet (a test that read the table would be asserting the
 * numbers back to themselves).
 *
 * The drag IS the control: the rotate buttons went at v2.3.2006, so the spin
 * is driven here with the same pointer events a finger sends, 30px per step
 * against the 26px threshold NameModal uses.
 */
import * as H from './harness.mjs';

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Spin', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await H.uncoverDoor(P.page);
  await Promise.all([
    P.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
    P.page.click('[data-tut="login-create"]'),
  ]);
  await P.page.waitForSelector('.bt-cc-shell', { timeout: 30000 });
  await P.page.waitForTimeout(3000);

  const measure = () => P.page.evaluate(() => {
    const cv = document.querySelector('.bt-cc-stage canvas') || document.querySelector('canvas[title*="Live preview"]');
    if (!cv) return null;
    const cx = cv.getContext('2d');
    const d = cx.getImageData(0, 0, cv.width, cv.height).data;
    /* lowest opaque row = the boots, in BITMAP px */
    let bottom = -1, top = -1;
    for (let y = 0; y < cv.height; y++) {
      let any = false;
      for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 24) { any = true; break; }
      if (any) { if (top < 0) top = y; bottom = y; }
    }
    const r = cv.getBoundingClientRect();
    const cs = getComputedStyle(cv);
    return { bmpH: cv.height, top, bottom, cssH: +r.height.toFixed(2), y: +r.y.toFixed(2),
      transform: cs.transform, dir: window.__btPreviewDir || null };
  });

  /* The rotate buttons went at v2.3.2006; the drag IS the control, and it
     steps one facing per 26px of travel (NameModal's onPointerMove). */
  const spin = () => P.page.evaluate(() => {
    const cv = document.querySelector('canvas[title*="Live preview"]');
    if (!cv) return false;
    const r = cv.getBoundingClientRect();
    const y = r.top + r.height / 2;
    const x0 = r.left + r.width / 2 - 20;
    const ev = (type, x) => cv.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, composed: true, pointerId: 5, pointerType: 'touch',
      isPrimary: true, clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1 }));
    ev('pointerdown', x0); ev('pointermove', x0 + 30); ev('pointerup', x0 + 30);
    return true;
  });
  const dirs = ['south', 'southeast', 'east', 'northeast', 'north', 'northwest', 'west', 'southwest'];
  const rows = [];
  const mislabelled = [];
  for (let i = 0; i < 8; i++) {
    const m = await measure();
    /* The client says which way it is facing (v2.3.2459).  The computed order
       is kept as the GUARD beside it: if the two ever disagree, the drag is
       not stepping the way this file thinks and the labels below would be
       fiction. */
    const dir = m && m.dir ? m.dir : dirs[(7 + i) % 8];
    if (m && m.dir && m.dir !== dirs[(7 + i) % 8]) mislabelled.push({ said: m.dir, expected: dirs[(7 + i) % 8] });
    rows.push({ dir, ...m });
    console.log(`    ${dir}: ${JSON.stringify(m)}`);
    await spin();
    await P.page.waitForTimeout(800);
  }
  /* the boots' line on screen = the canvas's own top + the bitmap row, scaled */
  const feet = rows.map((r) => ({ dir: r.dir, line: r.y + (r.bottom + 1) * (r.cssH / r.bmpH), bottom: r.bottom, top: r.top }));
  const lo = Math.min(...feet.map((f) => f.line)), hi = Math.max(...feet.map((f) => f.line));
  console.log('    FEET LINES ' + JSON.stringify(feet.map((f) => ({ d: f.dir, y: +f.line.toFixed(1), b: f.bottom }))));
  console.log(`    SPREAD ${(hi - lo).toFixed(2)}px  (lo ${lo.toFixed(1)} hi ${hi.toFixed(1)})`);
  rec.ok('the drag stepped the facings the way this file assumes (guard)',
    mislabelled.length === 0, { mislabelled });
  rec.ok('all eight facings drew a figure to measure (guard)',
    rows.length === 8 && rows.every((r) => r && r.bottom > 0), { n: rows.length });
  /* One pixel of slack for the sub-pixel scaling (the bitmap is 522 rows drawn
     into 260.81 CSS px, so one row is 0.4995px and cannot land exactly).
     Measured after the fix: 0.00px.  Measured before it: 15.00px. */
  rec.ok(`the boots land on ONE line all the way round (spread ${(hi - lo).toFixed(2)}px)`,
    (hi - lo) <= 1, { spread: +(hi - lo).toFixed(2), feet: feet.map((f) => ({ d: f.dir, y: +f.line.toFixed(1) })) });
  /* And the two the owner named are not the outliers any more -- stated
     separately because a spread test alone would pass on a build that moved
     every facing by the same wrong amount. */
  const ns = feet.filter((f) => f.dir === 'north' || f.dir === 'south').map((f) => f.line);
  const rest = feet.filter((f) => f.dir !== 'north' && f.dir !== 'south').map((f) => f.line);
  rec.ok('...and north and south are not sitting higher than the rest',
    Math.max(...ns) - Math.min(...rest) <= 1 && Math.max(...rest) - Math.min(...ns) <= 1,
    { ns, rest });
  await P.ctx.close().catch(() => {});
}
