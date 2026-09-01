/* THE LOADING BAR IS PAINTED INTO THE FILM (v2.3.2199)
 *
 * Owner: "on the web app view the ocean screen loading bar gets clipped."
 *
 * The loading screen's caption and progress bar are not DOM -- they are
 * frames of /intro/loading-ashore.mp4, a 400x736 portrait clip (v2.3.1220,
 * which dropped the JS overlay for exactly that reason).  So how the video
 * element FITS its box is not a cosmetic choice here: `cover` crops, and what
 * it crops on a viewport wider in aspect than 0.543 is the strip the bar is
 * drawn in.  At 1000x780 that is 530px off each end of an 1840px render --
 * the bar is not clipped, it is gone.
 *
 * Two viewports, because the bug only exists at one of them: a phone loses
 * the bar's ENDS, a desktop window loses the bar entirely.  Both are the same
 * property, so both are asserted the same way.
 *
 * WHAT THIS CAN AND CANNOT SEE.  Headless Chromium has no H.264 decoder, so
 * videoWidth/videoHeight read 0 and there is no way to measure the painted
 * frame from here -- a pixel assertion would be a fiction.  What IS real and
 * checkable is the rule that decides the crop, and a regression here is
 * someone changing that one word back.  The arithmetic that makes `contain`
 * the right word is written out in game.css beside it.
 */
import * as H from './harness.mjs';

const fit = (P) => P.page.evaluate(() => {
  const el = document.querySelector('.bt-intro video');
  if (!el) return { err: 'no intro video on screen' };
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const wrap = document.querySelector('.bt-intro');
  const w = wrap ? getComputedStyle(wrap) : null;
  return {
    fit: cs.objectFit,
    box: [Math.round(r.width), Math.round(r.height)],
    vp: [window.innerWidth, window.innerHeight],
    wrapBg: w ? w.backgroundColor : null,
  };
});

async function check(browser, wsPort, webPort, rec, viewport, label) {
  const P = await H.newPlayer(browser, { name: 'Fit' + label, wsPort, webPort, viewport, touch: true });
  /* Sample while the overlay is still up: kick the join, do not await it. */
  await P.page.waitForTimeout(1200);
  await H.uncoverDoor(P.page).catch(() => {});
  const joining = H.enterWorld(P).catch(() => null);
  let seen = null;
  for (let i = 0; i < 8 && !seen; i++) {
    await P.page.waitForTimeout(500);
    const f = await fit(P);
    if (!f.err) seen = f;
  }
  if (!seen) {
    rec.skip(`${label}: the intro overlay was never caught on screen`);
  } else {
    console.log(`    ${label}: ` + JSON.stringify(seen));
    rec.ok(`${label}: the loading clip is never CROPPED — the bar is in the film`,
      seen.fit === 'contain', seen);
    rec.ok(`${label}: ...and the letterbox lands on black, so containing costs nothing`,
      seen.wrapBg === 'rgb(0, 0, 0)', seen);
  }
  await joining;
  await P.ctx.close().catch(() => {});
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* A phone: cover crops the bar's ENDS (scales by height, 459px wide in 390). */
  await check(browser, wsPort, webPort, rec, { width: 390, height: 844 }, 'phone');
  /* A desktop window: cover crops the bar AWAY (scales by width, 1840px tall in 780). */
  await check(browser, wsPort, webPort, rec, { width: 1000, height: 780 }, 'desktop');
}
