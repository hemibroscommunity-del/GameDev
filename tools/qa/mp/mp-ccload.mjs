/* THE CREATOR OPENS WITH A CHARACTER IN IT (v2.3.1818).
 *
 * Owner, on the character creator: "Immediately after tapping new character
 * from splash screen the iOS keyboard scrolls you to this view.  Don't make
 * it jump to the name right away.  Also loading character assets seems slow
 * (no char in image)."
 *
 * Two claims, and both are the kind that look fine in a screenshot taken a
 * second too late:
 *   1. Nothing is focused when the creator opens — on a phone, focusing the
 *      name field IS opening the keyboard, and iOS then scrolls the field
 *      into the shrunken viewport and takes the character off the top.
 *   2. The figure is PAINTED soon after the creator opens, rather than the
 *      stage sitting empty while the sheets fetch.
 *
 * (2) is measured as time-to-first-pixels with the login screen's prewarm in
 * front of it, which is the whole mechanism: the creator is now reached by a
 * tap, so the seconds spent choosing on the login screen are seconds the
 * portrait's assets can be fetching.
 */
import * as H from './harness.mjs';

const focused = (P) => P.page.evaluate(() => {
  const a = document.activeElement;
  return a ? (a.id || a.tagName.toLowerCase()) : null;
});
/* Opaque pixels on the preview canvas: "is there a bro on the stage yet". */
const painted = (P) => P.page.evaluate(() => {
  /* The preview canvas carries no class — it is identified by its title
     ("Live preview — tap to zoom"), which is also what a screen reader and a
     hovering desktop player get.  Falling back to "any big canvas" found the
     WebGL world canvas behind the modal, which reads back as zero opaque
     pixels and looks exactly like "the character never painted". */
  const el = document.querySelector('canvas[title^="Live preview"]');
  if (!el || !el.width) return -1;
  try {
    const c = document.createElement('canvas');
    c.width = el.width; c.height = el.height;
    const x = c.getContext('2d');
    x.drawImage(el, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 32) n++;
    return n;
  } catch (e) { return -1; }
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Fresh', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true });

  /* Sit on the login screen the way a player does — this is the dead time the
     prewarm is supposed to use.  Short on purpose: a fix that only works if
     you hesitate for ten seconds is not a fix. */
  await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await P.page.waitForTimeout(1500);

  await P.page.click('[data-tut="login-create"]');
  await P.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });

  /* ── 1. nothing grabbed focus ── */
  const f0 = await focused(P);
  rec.ok('the creator opens with NOTHING focused (no keyboard, no scroll jump)',
    f0 !== 'bt-cc-name-input' && f0 !== 'input', { activeElement: f0 });
  /* GUARD: the field exists and is reachable — "not focused" must not be
     satisfied by the input having failed to render at all. */
  rec.ok('...and the name field is there to tap when you want it',
    !!(await P.page.$('input.bt-cc-name')), {});
  /* And focusing it still works, so nothing was broken in removing autofocus. */
  await P.page.click('input.bt-cc-name');
  await P.page.waitForTimeout(300);
  rec.ok('...and tapping it DOES focus it', (await focused(P)) === 'bt-cc-name-input',
    { activeElement: await focused(P) });

  /* ── 2. the figure arrives quickly ── */
  const t0 = Date.now();
  let px = -1, waited = 0;
  for (let i = 0; i < 60; i++) {
    px = await painted(P);
    if (px > 400) { waited = Date.now() - t0; break; }
    await P.page.waitForTimeout(100);
  }
  rec.ok('a character is painted on the creator stage', px > 400, { pixels: px, waitedMs: waited });
  /* 2.5s from the creator opening.  Not a benchmark of the machine — the
     assets were already being fetched while the login screen was up, so this
     is measuring whether that prewarm actually landed.  Generous enough not
     to flake on a loaded CI box, tight enough that a cold fetch of the body
     sheet plus body-tops would blow it. */
  rec.ok('...within 2.5s of the creator opening (the prewarm did its job)',
    px > 400 && waited < 2500, { waitedMs: waited, pixels: px });

  console.log('    LOGS ' + JSON.stringify((P.logs || []).slice(0, 8)));
  const diag = await P.page.evaluate(() => {
    const el = document.querySelector('canvas[title^="Live preview"]');
    return {
      canvas: el ? { w: el.width, h: el.height, cssW: Math.round(el.getBoundingClientRect().width) } : null,
      dirStamp: el ? (el.__btDir || null) : null,
      seq: el ? (el.__pseq || null) : null,
    };
  });
  console.log('    DIAG ' + JSON.stringify(diag));
  await P.page.screenshot({ path: '/home/user/GameDev/tools/maps/.cc.png' });
  await P.ctx.close().catch(() => {});
}
