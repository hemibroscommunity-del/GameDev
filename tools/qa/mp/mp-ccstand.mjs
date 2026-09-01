/* THE BRO STANDS IN THE MIDDLE OF HIS PEDESTAL (v2.3.2151).
 *
 * Owner: "move the character to the center of the pedestal on the character
 * creation screen."
 *
 * The canvas and the pedestal group are BOTH `left:50%; translateX(-50%)` on
 * the same stage, so the stylesheet says they already agree -- which is why
 * this cannot be checked by reading boxes. The offset is INSIDE the bitmap:
 * drawCharacterPortrait paints a 256x256 frame whose figure does not sit on
 * its own centre line, and NameModal's per-angle nudge only ever corrected
 * VERTICALLY (the `translateY` table).
 *
 * So this measures INK. The preview canvas is transparent-backed, so alpha
 * alone isolates the character; his drawn centre is mapped out of bitmap
 * space into page space through the canvas's own rect and compared with the
 * platform image's rect. A page screenshot could not do this -- the stage has
 * an opaque backdrop, and every pixel of it would count as him. */
import * as H from './harness.mjs';

/* Where the drawn character actually is, in PAGE pixels.
 * The bitmap is square and the element box is square with object-fit:contain,
 * so bitmap -> box is a single uniform scale with no letterboxing. */
const inkSpan = (P) => P.page.evaluate(() => {
  const c = document.querySelector('.bt-cc-stage canvas');
  if (!c) return null;
  const r = c.getBoundingClientRect();
  let px;
  try {
    px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  } catch (e) { return { err: String(e) }; }
  let minX = c.width, maxX = -1, minY = c.height, maxY = -1, n = 0, sum = 0;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (px[(y * c.width + x) * 4 + 3] < 40) continue;
      n++; sum += x;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (!n) return { empty: true, bmp: { w: c.width, h: c.height } };
  const s = r.width / c.width;
  return {
    bmp: { w: c.width, h: c.height, minX, maxX, minY, maxY, centroid: sum / n, n },
    /* the mid-point of the drawn SILHOUETTE, which is what "centred" means to
       an eye -- a centroid leans toward whichever arm is out. */
    pageMid: r.left + ((minX + maxX) / 2 + 0.5) * s,
    pageTop: r.top + minY * s,
    pageBottom: r.top + (maxY + 1) * s,
    pageCentroid: r.left + (sum / n) * s,
    canvasMid: r.left + r.width / 2,
    scale: s,
  };
});

const rect = (P, sel) => P.page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, w: r.width, h: r.height,
           mid: r.left + r.width / 2, bottom: r.top + r.height };
}, sel);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Stander', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await P.page.click('[data-tut="login-create"]');
  await P.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
  await P.page.waitForTimeout(1600);

  const plat = await rect(P, '.bt-cc-stage img[src*="platform"]');
  rec.ok('the pedestal is on screen (guard)', !!plat && plat.w > 40, plat);
  const ink = await inkSpan(P);
  rec.ok('the character is drawn (guard)', !!ink && !!ink.bmp && !ink.empty && !ink.err, ink);
  if (!plat || !ink || !ink.bmp || ink.empty) return;

  /* The tolerance is in PAGE pixels and deliberately tight: the pedestal is
     ~200px wide here, so 6px is 3% of it -- about the width of his boot, and
     the smallest offset the eye picks up as "not standing in the middle". */
  const off = ink.pageMid - plat.mid;
  rec.ok(`the bro's silhouette is centred on the pedestal (off by ${off.toFixed(1)}px)`,
    Math.abs(off) <= 6, { off, ink, plat });

  /* WHERE THE BOOTS LAND, as a fraction of the pedestal image. The art is a
     disc in perspective: its TOP FACE runs from the very top of the image down
     to the front lip at ~0.76, and the side wall fills the rest. So "on the
     pedestal" is a band, measured off the art itself
     (tools/qa/mp/out/platform reference: widest rows 0.39-0.53, front lip
     ~0.76), not a single line. Below 0.78 and he is on the rock in front of
     it, which is where v2.3.2151 found him. */
  const foot = (y) => (y - plat.top) / plat.h;
  const f0 = foot(ink.pageBottom);
  rec.ok(`his boots are ON the pedestal's top face, not in front of it `
       + `(${(f0 * 100).toFixed(0)}% down the disc)`,
    f0 >= 0.12 && f0 <= 0.72, { f0, feet: ink.pageBottom, plat });
  /* And still inside the stage: raising him is only right up to the point
     where his head leaves the picture. */
  const stage = await rect(P, '.bt-cc-stage');
  rec.ok('...without pushing his head out of the stage',
    ink.pageTop >= stage.top, { head: ink.pageTop, stageTop: stage.top });

  /* ═══ v2.3.2199: AND CLEAR OF THE LOGO, WHICH IS THE REAL CEILING ═══
     Owner, with a screenshot: "the character is up against the logo."  He
     was -- 9px under the sword's tip with the tallest hair and hat -- and
     the assertion directly above said he was fine, because it measures the
     STAGE and the logo was moved on top of the stage at v2.3.1527.  A true
     guard over the wrong edge.

     The ceiling is the SWORD, not the wordmark: .bt-cc-logo-sword is a
     115%-tall sprite pinned at top:19%, so its tip hangs to ~134% of the
     logo's own height and is the lowest ink the logo group puts on the
     stage.  Measuring .bt-cc-logo would repeat the original mistake one
     element over.

     And it has to be measured on the TALLEST head the game can produce, not
     the default one: bald-with-no-hat clears by 84px and tells you nothing.
     So this walks every hair and every hat, keeps the highest head each
     produces, and checks that one. */
  const swordBottom = async () => (await rect(P, '.bt-cc-logo-sword')).bottom;
  const openCat = (name) => P.page.evaluate((n) => {
    const b = [...document.querySelectorAll('[role="tab"],button')]
      .find((e) => new RegExp('^' + n + '$', 'i').test((e.textContent || '').trim()));
    if (b) { b.click(); return true; }
    return false;
  }, name);
  const stripLen = () => P.page.evaluate(() =>
    (document.querySelector('.bt-cc-strip') || { children: [] }).children.length);
  const pickTile = (i) => P.page.evaluate((idx) => {
    const t = [...document.querySelector('.bt-cc-strip').children][idx];
    if (t) t.click();
  }, i);
  /* Walk a category and return the highest head (smallest pageTop) it can make. */
  const tallestIn = async (cat) => {
    if (!(await openCat(cat))) return null;
    await P.page.waitForTimeout(400);
    const n = await stripLen();
    let best = null, bestI = -1;
    for (let i = 0; i < n; i++) {
      await pickTile(i);
      await P.page.waitForTimeout(260);
      const k = await inkSpan(P);
      if (!k || !k.bmp || k.empty) continue;
      if (best === null || k.pageTop < best) { best = k.pageTop; bestI = i; }
    }
    /* leave the tallest one ON, so hair and hat stack for the final check */
    if (bestI >= 0) { await pickTile(bestI); await P.page.waitForTimeout(300); }
    return { best, bestI, n };
  };
  const hair = await tallestIn('Hair');
  const hats = await tallestIn('Hats');
  /* v2.3.2201: BUILD TOO.  v2.3.2199 walked hair and hats, called the
     remaining gap comfortable, and shipped -- and the owner's next
     screenshot was a TALL bro back up against the wordmark.  Build is a
     third height multiplier (heightMul) sitting in the same picker, worth
     30px on its own: it took the worst hair-and-hat pair from 51px under
     the sword to 21.  A "tallest head the game can build" check that skips
     one of the three things that make a head tall is not that check. */
  const build = await tallestIn('Build');
  rec.ok('every hair, hat and build could be tried (guard)',
    !!hair && !!hats && !!build && hair.n > 1 && hats.n > 1 && build.n > 1,
    { hair, hats, build });
  const worst = await inkSpan(P);
  const sword = await swordBottom();
  const gap = worst && worst.pageTop ? Math.round(worst.pageTop - sword) : null;
  /* ═══ WHAT COUNTS AS CLEAR IS THE OWNER'S CALL, NOT MINE ═══
     v2.3.2199 set this at 12px, reasoning from the 9px that had just been
     reported.  Then the owner looked at 21px -- which passes a 12px bar --
     and said "the character is up against the logo" again.  So 12 was a
     number I made up that the evidence has since contradicted, and the bar
     is now the one the owner actually drew: comfortably above the 21 they
     rejected, comfortably below the 38 this ships with, so it fails on what
     they disliked without being so tight that a device a few pixels wider
     trips it.

     v2.3.2202: 28 -> 50. The owner looked at 37px and asked for another 10%
     off, so 28 was still under what they will accept. Measured at 390x844
     deliberately: swept across 390 / 402 / 430 at dpr 3 the gap GROWS with
     width (the logo is capped at 168px while the stage scales with the
     column), so the narrowest phone is the worst case and this number is
     the smallest any device sees. */
  rec.ok(`the tallest head the game can build clears the logo's sword (${gap}px)`,
    gap !== null && gap >= 50, { gap, head: worst && worst.pageTop, swordBottom: sword, hair, hats, build });

  /* ═══ v2.3.2200: THE MEASURED FIGURE IS THE BODY, NOT ITS SHADOW ═══
     Owner, twice: "the shoes are transparent" / "Shoes appear semi
     transparent."  They never were -- over magenta the boots come back
     opaque -- but characterCreatorEffects.measureFigure scanned for
     `alpha > 8`, and the composite carries the v2.3.1300 contact shadow,
     whose faintest pixels are alpha 8-11.  So the figure's "bottom" was the
     bottom of the SHADOW, which reframed the camera and armed the
     bottom-edge dissolve over the boots.

     This cannot be caught in the finished picture: the boots measure opaque
     in both states.  It lives in that one number, so the number is what is
     asserted -- the reported bottom must sit on the body's own ink, not tens
     of rows under it.  Compared against the lowest FULLY OPAQUE row of the
     live preview, which the shadow (alpha <= 133) can never reach. */
  const bounds = await P.page.evaluate(() => {
    const b = window.__btFigBounds;
    const c = document.querySelector('.bt-cc-stage canvas');
    if (!b || !c) return null;
    const W = c.width, Hh = c.height;
    const d = c.getContext('2d').getImageData(0, 0, W, Hh).data;
    let solid = -1, anyInk = -1;
    for (let y = Hh - 1; y >= 0 && solid < 0; y--)
      for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] === 255) { solid = y; break; }
    for (let y = Hh - 1; y >= 0 && anyInk < 0; y--)
      for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 8) { anyInk = y; break; }
    return { bot: b.bot, top: b.top, solidFrac: solid / Hh, anyInkFrac: anyInk / Hh };
  });
  rec.ok('the figure bounds are readable (guard)', !!bounds, bounds);
  if (bounds) {
    /* There IS a shadow: some ink sits below the last solid row.  If this
       ever goes to zero the A/B below stops proving anything. */
    rec.ok('...and the contact shadow really does extend below his boots (guard)',
      bounds.anyInkFrac > bounds.solidFrac + 0.01, bounds);
    /* The measured bottom must track the BOOTS.  Shipped it tracked the
       shadow: 56 rows of an 865px canvas, ~6.5% of the frame, lower. */
    rec.ok('...and the measured figure bottom is his boots, not the shadow under them',
      Math.abs(bounds.bot - bounds.solidFrac) <= 0.03,
      { measuredBot: bounds.bot, boots: bounds.solidFrac, shadow: bounds.anyInkFrac });
  }

  /* Rotate him and check the other facings too: the offset the owner sees is
     per-FRAME, so a fix that only lands on south is a fix for one sixth of the
     screen. Drag the canvas, which is how a player turns him now (v2.3.2006
     removed the rotate buttons). */
  const c = await rect(P, '.bt-cc-stage canvas');
  for (let i = 0; i < 3; i++) {
    await P.page.mouse.move(c.mid, 400);
    await P.page.mouse.down();
    await P.page.mouse.move(c.mid + 40, 400, { steps: 4 });
    await P.page.mouse.up();
    await P.page.waitForTimeout(700);
    const k = await inkSpan(P);
    if (!k || !k.bmp || k.empty) { rec.ok(`facing ${i + 1}: drawn`, false, k); continue; }
    const d = k.pageMid - plat.mid;
    rec.ok(`facing ${i + 1} is centred on the pedestal too (off by ${d.toFixed(1)}px)`,
      Math.abs(d) <= 6, { off: d, bmp: k.bmp });
    const fd = foot(k.pageBottom);
    rec.ok(`facing ${i + 1} stands ON the disc too `
         + `(${(fd * 100).toFixed(0)}% down it)`,
      fd >= 0.12 && fd <= 0.72, { fd, feet: k.pageBottom });
  }
}
