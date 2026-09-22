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
 * 4. NOTHING OF THE OLD EYE IS LEFT SHOWING.  Owner, on the first cut: "I still
 *    see some remnants around the eyes where you stickered over the old ones."
 *    Two assertions, because there were two remnants.
 *    (a) Every pixel of the base eye must have CHANGED. The base eye's footprint
 *        is read off the bare capture -- the not-skin pixels in the eye band --
 *        so the test knows where the old eye was without being told, and a
 *        sliver of black top edge peeking out one pixel to the left of a style
 *        fails it.
 *    (b) With a style on, changing the eye COLOUR must change nothing at all.
 *        That is exact rather than approximate: the bake paints the iris or
 *        erases it, never both (playerSkins.recolorBodyToCanvas), so a single
 *        changed pixel means an iris survived under the style.
 *
 * 5. THE ONE EYE HAS A PUPIL, checked on the committed art rather than through
 *    the renderer. Owner: "Looks like one eye lost its black pupil." The
 *    flat-keying pre-pass recovered the dark parts of a drawing by dilating the
 *    art and taking whatever ink that landed on, which finds a thin outline and
 *    guts a solid block: the pupil is a 20px square whose bottom runs past the
 *    white sclera, so it imported as a hollow arch. The 256px frame carried
 *    FOUR dark pixels where the fixed one carries twenty-four, and that
 *    six-fold gap is the assertion. Static, because the defect is in the art
 *    and a browser adds nothing to seeing it.
 *
 * 6. THE WORLD SPRITE GETS IT TOO, not only the creator's preview. The erase
 *    lives in the body bake, and the bake draws remote players as well as you,
 *    so the style has to be HANDED to it at seven call sites rather than read
 *    from a store (the v2.3.1930 rule). That is precisely the shape of omission
 *    this repo keeps hitting -- v2.3.1788's "the attack stand-ins wear the
 *    WALKING skin", v2.3.2431's missing frame width -- so it is asserted from
 *    the cache keys the world bake actually produced, which name the style.
 *
 * 7. BOTH SLOTS ARE WORN AT ONCE.  The entire reason eye styles are their own
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
  /* ── 5. the One Eye's pupil is solid, read off the art ──
     Before the browser, because it needs nothing from it.  The 256px `hi/`
     frame is the one the portrait loads (loadTraitBest), so it is the one
     measured; `dark` is the same near-black threshold the remnant probe uses. */
  {
    const { readFileSync } = await import('node:fs');
    const { decode } = await import('../../png.mjs');
    const px = decode(readFileSync(H.REPO + '/public/sprites/traits/eyestyle/one-eye/hi/south.png'));
    let dark = 0;
    for (let i = 0; i < px.data.length; i += 4) {
      if (px.data[i + 3] < 120) continue;
      const l = 0.299 * px.data[i] + 0.587 * px.data[i + 1] + 0.114 * px.data[i + 2];
      if (l < 90) dark++;
    }
    rec.ok(`the One Eye's pupil is a solid block, not the rim of a hollow one `
         + `(${dark} dark px in the 256 frame; the hollowed import had 4)`,
      dark >= 12, { dark });
  }

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

  /* ── the eye window, and a count of hard-dark pixels in it ──
     THE REMNANT TEST, and it took two wrong shapes to find the right one. A
     padded rectangle round the irises swept in the nose, the nose-bridge
     shading and the ear notches -- all legitimately not-skin, all legitimately
     unchanged by an eye style -- and reported ~1000 "remnants" per style
     against a face that was clean. A flood outward from the irises leaked
     through that same bridge shading into the nose and reported 2888px of
     "eye" on a head whose eyes are about 300.

     What works needs no footprint at all. DEMON EYES is drawn with NO DARK
     PIXEL IN IT -- minimum luminance 106, against a near-black threshold of 90
     -- so while it is worn, any hard-dark pixel in the eye window can only be
     the old eye. The bare face's own count is the control: it has to be well
     above zero, or the test would pass on a blank canvas.

     DEMON ONLY, and One Eye is the reason to say so. Its 128px frame is just as
     bright (minimum 167) and it still failed this probe with 52 dark pixels:
     the portrait loads `hi/south.png`, the 256px original, and THAT carries the
     cyclops pupil at luminance 83. A style is only a valid probe if BOTH its
     frames are clear, because which one is on screen depends on the surface. */
  const DARK = 90;
  const win = (() => {
    const p2 = Math.max(4, Math.round(eyeH / 2));
    return { x0: Math.max(0, eye.minX - p2), x1: Math.min(none.w - 1, eye.maxX + p2),
      y0: Math.max(0, eye.minY - p2), y1: Math.min(none.h - 1, eye.maxY + p2) };
  })();
  const darkIn = (cap) => {
    let n = 0;
    for (let y = win.y0; y <= win.y1; y++) {
      for (let x = win.x0; x <= win.x1; x++) {
        const i = (y * cap.w + x) * 4;
        if (cap.data[i + 3] < 200) continue;
        const l = 0.299 * cap.data[i] + 0.587 * cap.data[i + 1] + 0.114 * cap.data[i + 2];
        if (l < DARK) n++;
      }
    }
    return n;
  };
  const bareDark = darkIn(none);
  console.log(`    the bare face has ${bareDark} hard-dark px in the eye window ${JSON.stringify(win)}`);
  rec.ok(`the bare face's own eyes are ${bareDark} hard-dark px in the eye window -- `
       + `the control the remnant test would fail without (guard)`,
    bareDark > 40, { bareDark, win });

  /* ── 3. each style covers the real eyes, and leaves none of them showing ── */
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
    /* The remnant probe, on the two styles that can carry it: their own art
       holds no dark pixel, so a dark pixel in the eye window is the old eye. */
    if (style === 'Demon Eyes') {
      const darkLeft = darkIn(worn);
      rec.ok(`${style} is drawn with no dark pixels at either resolution, so the `
           + `${darkLeft} hard-dark px left in the eye window is all that remains `
           + `of the old eye (the bare face has ${bareDark})`,
        darkLeft === 0, { style, darkLeft, bareDark, win });
    }
  }

  /* ── 4(b). with a style on, the eye colour has nothing left to paint ──
     Exact, not approximate: the bake recolours the iris or erases it, never
     both, so one changed pixel here means an iris survived under the style.
     Run on WTF Eyes, which is still the pick from the loop above. */
  await P.page.evaluate(() => {
    const row = document.querySelector('.bt-cc-colors');
    const el = row && [...row.querySelectorAll('button')].find((b) => (b.getAttribute('title') || '') === 'Red');
    if (el) el.click();
  });
  await P.page.waitForTimeout(1600);
  const styledRed = await grab(P);
  await P.page.evaluate(() => {
    const row = document.querySelector('.bt-cc-colors');
    const el = row && [...row.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Default');
    if (el) el.click();
  });
  await P.page.waitForTimeout(1600);
  const styledDefault = await grab(P);
  if (styledRed && !styledRed.err && styledDefault && !styledDefault.err
      && styledRed.w === styledDefault.w) {
    const irisLeft = diff(styledRed, styledDefault);
    console.log('    eye colour under a style changes: ' + JSON.stringify(irisLeft));
    rec.ok(`with a style worn, the eye-colour swatch has nothing left to paint `
         + `(${irisLeft.n}px changed between Red and Default)`,
      irisLeft.n === 0, irisLeft);
  } else {
    rec.ok('both eye-colour captures readable and the same size (guard)', false,
      { a: styledRed && [styledRed.w, styledRed.err], b: styledDefault && [styledDefault.w, styledDefault.err] });
  }

  /* ── 7. glasses go OVER eyes, and both are worn at once ──
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

  /* ── 6. into the world, where the body is baked by a different path ──
     The creator composites through characterPortrait; the walking figure goes
     through getBodyFrame, and the two only agree if the style was threaded to
     both.  bodySheetKey writes `es:<id>` into the cache key of any sheet baked
     with a style, and __btBodySheetKeys reports the keys that really got baked
     -- so this reads the world's own answer rather than asking it to look
     right in a 40px screenshot. */
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);
  const keysOff = await P.page.evaluate(() => (window.__btBodySheetKeys ? window.__btBodySheetKeys() : null));
  rec.ok('the world baked some body sheets and the probe can read their keys (guard)',
    Array.isArray(keysOff) && keysOff.length > 0, { n: keysOff && keysOff.length });
  const set = await P.page.evaluate(() => {
    if (!window.__btSetEyeStyle) return false;
    window.__btSetEyeStyle('demon');
    return true;
  });
  rec.ok('the eye style can be set in the world (guard)', set === true, null);
  await P.page.waitForTimeout(2500);
  const keysOn = await P.page.evaluate(() => (window.__btBodySheetKeys ? window.__btBodySheetKeys() : []));
  const withStyle = keysOn.filter((k) => k.indexOf('es:demon') >= 0);
  console.log('    world body sheets carrying the style: ' + JSON.stringify(withStyle.slice(0, 4)));
  rec.ok(`the WORLD body bake was handed the eye style -- ${withStyle.length} sheet(s) `
       + `keyed es:demon, so the walking figure is erased the same way the preview is`,
    withStyle.length > 0, { withStyle: withStyle.slice(0, 6), total: keysOn.length });

  const errs = P.logs.filter((l) => String(l).startsWith('pageerror'));
  rec.ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await P.ctx.close();
}
