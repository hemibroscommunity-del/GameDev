/* ═══ THE EYES TAB PICKS A SHAPE AND A COLOUR (v2.3.2643) ═══
 *
 * Owner, with four mannequin sheets: "I want these as 'eyes' choices --
 * Sleepy eyes, one eye, demon eyes, wtf eyes."
 *
 * Four things this asserts, each because it is the thing most likely to be
 * quietly wrong rather than because it is the easiest thing to measure:
 *
 * 1. THE FOUR STYLES ARE IN THE STRIP.  A catalog entry with no art on disk
 *    still renders a tile, so this is a guard, not the test.
 *
 * 2. THE COLOUR ROW IS LIVE ON 'NONE'.  The picker's standing rule blanks the
 *    colour row when the pick is 'none' -- right everywhere else (there is no
 *    hat to paint) and exactly backwards here, because 'none' IS the real eyes
 *    and the row recolours the real eyes.  `colorsWhenNone` in NameModal is
 *    one boolean guarding that, so it is one boolean away from regressing, and
 *    a player would experience it as the eye-colour feature disappearing.
 *
 * 3. EACH STYLE COVERS THE REAL EYES.  Measured as the difference between two
 *    captures of the same character, which is how mp-ccshades separates a piece
 *    from the head it is drawn on: every colour heuristic for "which pixels are
 *    the eyes" is a guess, and a diff is exact.
 *
 *    WHAT IT IS COMPARED AGAINST MATTERS MORE THAN THE DIFF DOES, and the first
 *    cut of this file got it wrong: it asserted the changed rows fell inside a
 *    band derived from the figure's height (a head is "the top 28%", eyes "40%
 *    down it"), and failed all four styles against art that is correctly
 *    placed, because those fractions describe the 256 sprite frame and not the
 *    creator's composited preview.  A percentage of a bounding box is a guess
 *    dressed as a measurement.
 *
 *    So the reference is DERIVED, from the game's own answer to "where are the
 *    eyes": picking an eye COLOUR repaints the iris pixels and nothing else
 *    (eyeMask.json), so the diff between two eye colours IS the eye row, on
 *    this canvas, at this scale, for this character.  Each style then has to
 *    cover it.  A piece that lands on the forehead overlaps nothing and fails,
 *    which is the failure the slot's placement maths exists to prevent.
 *
 * 4. BOTH SLOTS ARE WORN AT ONCE.  The entire reason eye styles are their own
 *    slot rather than four more eyewear entries is that you can wear Demon Eyes
 *    AND sunglasses.  So this puts the Thug Life shades on, then Demon Eyes on
 *    top, and asserts the face changed AND the shades are still the picked
 *    eyewear -- if the two collapsed into one slot, the second pick would have
 *    taken the first off, and the face would have changed either way.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

const grab = (P) => P.page.evaluate(() => {
  const c = document.querySelector('.bt-cc-stage canvas');
  if (!c) return null;
  try {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    return { w: c.width, h: c.height, data: Array.from(d) };
  } catch (e) { return { err: String(e) }; }
});

const pickTab = (P, label) => P.page.evaluate((l) => {
  const b = [...document.querySelectorAll('.bt-cc-tab')]
    .find((x) => (x.textContent || '').trim() === l);
  if (!b) return false;
  b.click();
  return true;
}, label);

const stripTitles = (P) => P.page.evaluate(() =>
  [...document.querySelectorAll('.bt-cc-strip > *')].map((x) => x.getAttribute('title')));

const pickTile = (P, title) => P.page.evaluate((t) => {
  const el = [...document.querySelectorAll('.bt-cc-strip > *')]
    .find((x) => (x.getAttribute('title') || '').toLowerCase() === t.toLowerCase());
  if (!el) return { ok: false, saw: [...document.querySelectorAll('.bt-cc-strip > *')].map((x) => x.getAttribute('title')) };
  el.click();
  return { ok: true };
}, title);

/* Is the colour block SHOWING, rather than merely present?  It is always in the
   DOM -- the constant-sheet-height rule (v2.3.1252) keeps it there as a ghost --
   so presence proves nothing and `bt-cc-ghost` is the state that matters. */
const colourRow = (P) => P.page.evaluate(() => {
  const el = document.querySelector('.bt-cc-colors');
  if (!el) return { present: false };
  return {
    present: true,
    ghost: el.className.indexOf('bt-cc-ghost') >= 0,
    swatches: el.querySelectorAll('.bt-cc-scroll > * > *').length,
  };
});

/* The pixels two captures of the same character disagree on. */
function diff(a, b) {
  const W = a.w, Hh = a.h;
  let n = 0, minX = W, maxX = -1, minY = Hh, maxY = -1;
  for (let y = 0; y < Hh; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1])
        + Math.abs(a.data[i + 2] - b.data[i + 2]) + Math.abs(a.data[i + 3] - b.data[i + 3]);
      if (d < 40) continue;
      n++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return { n, minX, maxX, minY, maxY };
}

/* The figure's own ink bounds, so the diff can be judged against the BODY
   rather than against the canvas -- the canvas is mostly empty and a fraction
   of its height means nothing. */
function bounds(cap) {
  const W = cap.w, Hh = cap.h;
  let minX = W, maxX = -1, minY = Hh, maxY = -1;
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    if (cap.data[(y * W + x) * 4 + 3] < 40) continue;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY, h: maxY - minY + 1 };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Eyes', wsPort, webPort,
    viewport: PHONE, touch: true, dpr: 2 });
  await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await P.page.click('[data-tut="login-create"]');
  await P.page.waitForSelector('.bt-cc-stage canvas', { timeout: 30000 });
  await P.page.waitForTimeout(2500);

  rec.ok('the Eyes tab opened (guard)', await pickTab(P, 'Eyes'), null);
  await P.page.waitForTimeout(700);

  /* ── 1. the four styles are offered ── */
  const titles = await stripTitles(P);
  const WANT = ['Sleepy Eyes', 'One Eye', 'Demon Eyes', 'WTF Eyes'];
  const missing = WANT.filter((w) => !titles.some((t) => (t || '') === w));
  rec.ok(`the Eyes tab offers all four styles (saw ${JSON.stringify(titles)})`,
    missing.length === 0, { titles, missing });
  rec.ok('...and "None" is still the first tile, so the real eyes are reachable',
    (titles[0] || '').toLowerCase() === 'none', { titles });

  /* ── 2. the colour row survives the 'none' pick ── */
  const pickedNone = await pickTile(P, 'None');
  rec.ok('None is pickable (guard)', pickedNone.ok === true, pickedNone);
  await P.page.waitForTimeout(900);
  const rowNone = await colourRow(P);
  rec.ok('the eye-COLOUR row is live while the style is None -- the pick it '
       + 'matters most on, because None IS the real eyes',
    rowNone.present && rowNone.ghost === false && rowNone.swatches > 0, rowNone);

  const none = await grab(P);
  rec.ok('the creator canvas is readable (guard)', !!none && !none.err && none.w > 0,
    none && { w: none.w, h: none.h, err: none.err });
  if (!none || none.err) return;
  const body = bounds(none);
  console.log('    figure bounds: ' + JSON.stringify(body));

  /* ── where the real eyes ARE, asked of the game rather than guessed ──
     An eye colour repaints the iris and nothing else, so this diff is the eye
     row itself.  Done on the Eyes tab, which is where both controls live, so
     the canvas does not change size between the two captures. */
  const swatch = await P.page.evaluate(() => {
    const row = document.querySelector('.bt-cc-colors');
    const el = row && [...row.querySelectorAll('button')].find((b) => (b.getAttribute('title') || '') === 'Red');
    if (!el) return { ok: false, saw: row ? [...row.querySelectorAll('button')].map((b) => b.getAttribute('title')) : null };
    el.click();
    return { ok: true };
  });
  rec.ok('the Red eye swatch is in the colour row and was picked (guard)', swatch.ok === true, swatch);
  await P.page.waitForTimeout(1600);
  const red = await grab(P);
  const eye = (red && !red.err) ? diff(none, red) : null;
  console.log('    the real eyes, from the eye-colour diff: ' + JSON.stringify(eye));
  rec.ok(`the eye-colour swatch repainted the irises, which is the reference `
       + `every placement check below is measured against (${eye && eye.n}px, `
       + `rows ${eye && eye.minY}..${eye && eye.maxY})`,
    !!eye && eye.n > 8 && eye.maxY >= eye.minY, eye);
  if (!eye || eye.maxY < eye.minY) return;
  const eyeH = eye.maxY - eye.minY + 1;
  /* Back to the art's own colour, so the style captures below differ from
     `none` by the STYLE and not by the style plus a red iris. */
  await P.page.evaluate(() => {
    const row = document.querySelector('.bt-cc-colors');
    const el = row && [...row.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Default');
    if (el) el.click();
  });
  await P.page.waitForTimeout(1600);

  /* ── 3. each style covers the real eyes ── */
  for (const style of WANT) {
    const picked = await pickTile(P, style);
    rec.ok(`${style} is pickable (guard)`, picked.ok === true, picked);
    if (!picked.ok) continue;
    await P.page.waitForTimeout(1800);
    const worn = await grab(P);
    if (!worn || worn.err) { rec.ok(`${style}: canvas still readable (guard)`, false, worn); continue; }
    const d = diff(none, worn);
    console.log(`    ${style}: ${JSON.stringify(d)}`);
    rec.ok(`${style} changes the picture (${d.n}px)`, d.n > 60, d);
    if (d.maxY < 0) continue;
    const over = Math.min(d.maxY, eye.maxY) - Math.max(d.minY, eye.minY) + 1;
    const cover = over > 0 ? over / eyeH : 0;
    rec.ok(`${style} covers the real eye row -- ${Math.round(cover * 100)}% of it `
         + `(style rows ${d.minY}..${d.maxY}, eyes ${eye.minY}..${eye.maxY})`,
      cover >= 0.8, { d, eye, cover });
    /* ...and does not spill down the face.  A piece seated too low reads as a
       moustache; the flames are the only thing allowed to climb, so only the
       BOTTOM edge is bounded here. */
    rec.ok(`${style} does not hang below the eyes onto the mouth `
         + `(bottom ${d.maxY} vs eyes ${eye.maxY}, one eye-height of slack)`,
      d.maxY <= eye.maxY + eyeH, { d, eye, eyeH });
  }

  /* ── 4. glasses go OVER eyes, and both are worn at once ──
     BOTH CAPTURES ARE TAKEN ON THE EYEWEAR TAB, which is the whole trick here.
     The creator re-frames its preview per tab (pickPreviewCat), so the canvas
     is a different SIZE on the Eyes tab than on the Eyewear one -- the first
     cut of this file compared one against the other and measured a 74,801px
     "difference" that was the crop moving, not the character changing.  Two
     captures from the same tab differ only by what is on the face. */
  rec.ok('back to the Eyes tab to clear the style (guard)', await pickTab(P, 'Eyes'), null);
  await P.page.waitForTimeout(700);
  rec.ok('None re-picked (guard)', (await pickTile(P, 'None')).ok === true, null);
  await P.page.waitForTimeout(1200);
  rec.ok('the Eyewear tab opened (guard)', await pickTab(P, 'Eyewear'), null);
  await P.page.waitForTimeout(700);
  const shades = await pickTile(P, 'Thug Life');
  rec.ok('Thug Life is pickable (guard)', shades.ok === true, shades);
  await P.page.waitForTimeout(1800);
  const shadesOnly = await grab(P);

  rec.ok('back to the Eyes tab (guard)', await pickTab(P, 'Eyes'), null);
  await P.page.waitForTimeout(700);
  rec.ok('Demon Eyes picked on top of the shades (guard)',
    (await pickTile(P, 'Demon Eyes')).ok === true, null);
  await P.page.waitForTimeout(1200);
  rec.ok('back to the Eyewear tab, so this capture frames as the last one did (guard)',
    await pickTab(P, 'Eyewear'), null);
  await P.page.waitForTimeout(1800);
  const both = await grab(P);

  if (!shadesOnly || shadesOnly.err || !both || both.err) {
    rec.ok('both captures readable (guard)', false,
      { shadesOnly: shadesOnly && shadesOnly.err, both: both && both.err });
    return;
  }
  rec.ok('the two layering captures are the same size, so the diff is the face '
       + 'and not the crop (guard)',
    shadesOnly.w === both.w && shadesOnly.h === both.h,
    { a: [shadesOnly.w, shadesOnly.h], b: [both.w, both.h] });
  if (shadesOnly.w !== both.w || shadesOnly.h !== both.h) return;

  const added = diff(shadesOnly, both);
  console.log('    demon eyes added on top of the shades: ' + JSON.stringify(added));
  /* If the two slots were mutually exclusive -- four more eyewear entries
     instead of a slot of their own -- picking Demon Eyes would have taken the
     shades OFF, and this diff would be the shades disappearing rather than the
     flames appearing.  Either way it is non-zero, so the size alone proves
     nothing; what proves it is that the shades are still there, which the
     assertion below reads off the Eyewear tab's own selection. */
  rec.ok(`putting Demon Eyes on over the shades changed the face (${added.n}px)`,
    added.n > 60, added);
  /* Which eyewear tile is picked, read off the tile ART rather than a class:
     selection is drawn by swapping the card background to cc-tile-on.png
     (_apTileStyle in BroTown.jsx), and these tiles carry no selected class at
     all -- the first cut of this line read className and got an empty string
     from a tile that WAS selected. */
  const stillOn = await P.page.evaluate(() => {
    const el = [...document.querySelectorAll('.bt-cc-strip > *')]
      .find((x) => (x.getAttribute('title') || '') === 'Thug Life');
    if (!el) return { found: false };
    return { found: true, on: (el.style.background || '').indexOf('cc-tile-on') >= 0 };
  });
  rec.ok('...and the Thug Life shades are STILL the picked eyewear, so the two '
       + 'slots are worn together rather than replacing each other',
    stillOn.found === true && stillOn.on === true, { stillOn });
}
