/* DOES THE EYEWEAR SWATCH PAINT THE RIGHT PART, AND DOES THE FIGURE CHANGE?
 * (v2.3.2424)
 *
 * Owner: "Do you think recolor options would work well for the glasses?  I
 * like how you recolored the hats."
 *
 * Yes, but not by aiming the hat rule at the eyewear folder.  The hat rule
 * paints the BIGGEST material; measured across all four facings, that is the
 * FRAME on four pairs and the LENS on three, and 3d-glasses is a two-point
 * coin-flip between them.  So the offer is per piece, the picker names the
 * part, and 3d-glasses is not offered at all.
 *
 * ── WHAT THIS FILE IS FOR ──
 * Three claims a screenshot cannot make and a reviewer will not notice:
 *   1. which pairs get the row, and that the row SAYS which part it paints;
 *   2. that a pair with no decision gets an EMPTY row rather than a silently
 *      mislabelled one;
 *   3. that picking a swatch moves PIXELS ON THE FIGURE, not just the ring
 *      around the swatch.
 *
 * ── AND WHY IT DOES NOT import() THE SOURCE MODULE ──
 * The first cut asked the page for `/src/rendering/traits/eyewearColorCatalog.js`.
 * The QA harness serves the BUILT `dist/`, where that path does not exist, so
 * every probe resolved null and five assertions failed for a reason that had
 * nothing to do with the feature.  Worse, one PASSED: "an undecided pair gets
 * NO swatches" was reading `swatches: -1`, which is the code for "the row
 * element was never found at all" -- a green tick for a creator that had never
 * opened.  So the module side now goes through `window.__btEyewearColor`, the
 * house-style handle (__btSetEyewear, __btMaterials, __btWardrobe), and the
 * DOM side asserts the row EXISTS before it asserts anything about what is in
 * it (TRAPS: an absent element satisfies every "is not there" check).
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* Same entry as mp-ccshades/mp-ccstand: the creator is behind the login
   screen's Create button, and the stage canvas is the signal it is up. */
async function openCreator(P) {
  await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await P.page.click('[data-tut="login-create"]');
  await P.page.waitForSelector('.bt-cc-stage canvas', { timeout: 30000 });
  await P.page.waitForTimeout(2500);
}

const pickTab = (P, label) => P.page.evaluate((l) => {
  const b = [...document.querySelectorAll('.bt-cc-tab')]
    .find((x) => (x.textContent || '').trim() === l);
  if (!b) return false;
  b.click();
  return true;
}, label);

/* TRAPS §66: the creator's colour controls are empty until a trait is picked,
   so every colour claim below has to select a real tile first. */
const pickTile = (P, title) => P.page.evaluate((t) => {
  const all = [...document.querySelectorAll('.bt-cc-strip > *')];
  const el = all.find((x) => (x.getAttribute('title') || '').toLowerCase() === t.toLowerCase());
  if (!el) return { ok: false, saw: all.map((x) => x.getAttribute('title')) };
  el.click();
  return { ok: true };
}, title);

/* The row is ALWAYS rendered (NameModal v2.3.1252 keeps the sheet a constant
   height and ghosts the block instead of removing it), so `present: false` is
   a broken scenario, never a passing assertion. */
const readRow = (P) => P.page.evaluate(() => {
  const row = document.querySelector('.bt-cc-colors-row');
  const block = document.querySelector('.bt-cc-colors');
  const part = document.querySelector('.bt-cc-colors-part');
  return {
    present: !!row,
    swatches: row ? row.querySelectorAll('button, [role="radio"]').length : -1,
    ghost: block ? block.classList.contains('bt-cc-ghost') : null,
    part: part ? (part.textContent || '').trim() : null,
  };
});

/* The preview canvas is a plain 2D canvas, readable directly (mp-ccstand and
   mp-ccshades both read it this way) -- no screenshot round trip. */
const grab = (P) => P.page.evaluate(() => {
  const c = document.querySelector('.bt-cc-stage canvas');
  if (!c) return null;
  try {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    return { w: c.width, h: c.height, data: Array.from(d) };
  } catch (e) { return { err: String(e) }; }
});

/* How many pixels differ, and how far apart in colour.  A recolour of a small
   sticker on a face moves a few hundred pixels, not a few dozen. */
function diff(a, b) {
  if (!a || !b || a.err || b.err || a.w !== b.w) return null;
  let n = 0, sum = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.abs(a.data[i] - b.data[i])
      + Math.abs(a.data[i + 1] - b.data[i + 1])
      + Math.abs(a.data[i + 2] - b.data[i + 2]);
    if (d > 40) { n++; sum += d; }
  }
  return { n, avg: n ? Math.round(sum / n) : 0 };
}

/* Click a swatch by its catalog id.  _swatchTile renders each with a title. */
const pickSwatch = (P, id) => P.page.evaluate((want) => {
  const row = document.querySelector('.bt-cc-colors-row');
  if (!row) return { ok: false, why: 'no row' };
  const tiles = [...row.querySelectorAll('button, [role="radio"]')];
  const hit = tiles.find((x) => {
    const t = (x.getAttribute('title') || x.getAttribute('aria-label') || '').toLowerCase();
    return t.indexOf(want) >= 0;
  }) || tiles[Math.floor(tiles.length / 2)];
  if (!hit) return { ok: false, why: 'no tiles', n: tiles.length };
  hit.click();
  return { ok: true, took: (hit.getAttribute('title') || hit.getAttribute('aria-label') || '').trim() };
}, id);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Shades', wsPort, webPort,
    viewport: PHONE, touch: true });
  await openCreator(P);

  /* ══ 1. the per-pair decisions, read from the SHIPPED bundle ══ */
  const decided = await P.page.evaluate(() => {
    const m = window.__btEyewearColor;
    if (!m) return null;
    const ids = ['golden-glasses', 'golden-monocle', 'thug-life', 'eye-patch',
      'goggles', 'laser-glasses', 'white-glass', '3d-glasses'];
    const out = {};
    for (const id of ids) out[id] = m.paints(id);
    return out;
  });
  rec.ok('the shipped client exposes the eyewear-colour decisions (guard: '
    + 'without this handle every claim below is untested, which is exactly how '
    + 'the first cut of this file passed on a creator it never opened)',
    !!decided, decided);
  if (!decided) { await P.ctx.close().catch(() => {}); return; }
  console.log('    what each pair paints: ' + JSON.stringify(decided));

  rec.ok('the four FRAME-ish pairs are offered, and say which part',
    decided['golden-glasses'] === 'Frame' && decided['golden-monocle'] === 'Frame'
    && decided['thug-life'] === 'Frame' && decided['eye-patch'] === 'Patch', decided);
  rec.ok('the three LENS pairs are offered, and say THAT instead',
    decided['goggles'] === 'Lens' && decided['laser-glasses'] === 'Lens'
    && decided['white-glass'] === 'Lens', decided);
  /* The one that matters most: light 38% vs dark 36% is a two-point margin, so
     an art edit could flip which part the swatch paints. */
  rec.ok('3d-glasses is NOT offered -- its decomposition is a coin flip and '
    + 'its identity is the red/cyan lenses', decided['3d-glasses'] === null, decided);

  /* ══ 2. the row appears in the creator, and names the part ══ */
  rec.ok('the Eyewear tab opened (guard)', await pickTab(P, 'Eyewear'), null);
  await P.page.waitForTimeout(600);

  const gotThug = await pickTile(P, 'Thug Life');
  rec.ok('Thug Life is in the catalogue and was picked (guard)', gotThug.ok === true, gotThug);
  await P.page.waitForTimeout(1200);
  const frameRow = await readRow(P);
  console.log('    thug-life row: ' + JSON.stringify(frameRow));
  rec.ok('the colour row exists at all (guard: it is always rendered, so a '
    + 'missing one means this scenario is measuring nothing)', frameRow.present === true, frameRow);
  rec.ok('a FRAME pair gets a live swatch row', frameRow.swatches > 6 && frameRow.ghost === false, frameRow);
  rec.ok('...and the row says it paints the Frame', frameRow.part === 'Frame', frameRow);

  const gotGog = await pickTile(P, 'Goggles');
  rec.ok('Goggles is in the catalogue and was picked (guard)', gotGog.ok === true, gotGog);
  await P.page.waitForTimeout(1200);
  const lensRow = await readRow(P);
  console.log('    goggles row: ' + JSON.stringify(lensRow));
  rec.ok('a LENS pair says it paints the Lens instead -- the same control, a '
    + 'different part, and it admits it',
    lensRow.present === true && lensRow.part === 'Lens' && lensRow.swatches > 6, lensRow);

  const got3d = await pickTile(P, '3D Glasses');
  rec.ok('3D Glasses is in the catalogue and was picked (guard)', got3d.ok === true, got3d);
  await P.page.waitForTimeout(1200);
  const noRow = await readRow(P);
  console.log('    3d-glasses row: ' + JSON.stringify(noRow));
  rec.ok('an undecided pair gets a row that EXISTS and is EMPTY -- ghosted, no '
    + 'swatches, no part label (the row is present, so this is a real check '
    + 'rather than an absent element satisfying an absence test)',
    noRow.present === true && noRow.swatches === 0 && noRow.ghost === true
    && noRow.part === null, noRow);

  /* ══ 3. the pixels on the FIGURE move ══
     This is the claim the owner actually asked about, and the one nothing
     else here proves: the swatch could light up while the preview keeps
     drawing the native art (it did, until characterPortrait learned to
     recolour eyewear in this same change). */
  await pickTile(P, 'Thug Life');
  await P.page.waitForTimeout(1600);
  const native = await grab(P);
  rec.ok('the preview canvas is readable (guard)', !!native && !native.err && native.w > 0,
    native && { w: native.w, err: native.err });
  if (!native || native.err) { await P.ctx.close().catch(() => {}); return; }

  const took = await pickSwatch(P, 'red');
  console.log('    swatch: ' + JSON.stringify(took));
  rec.ok('a swatch was actually clickable (guard)', took.ok === true, took);
  await P.page.waitForTimeout(2600);
  const painted = await grab(P);
  const moved = diff(native, painted);
  console.log('    figure delta after the swatch: ' + JSON.stringify(moved));
  rec.ok('choosing a colour REPAINTS THE FIGURE in the preview, not just the '
    + 'swatch ring -- the whole point of the control',
    !!moved && moved.n > 150, moved);

  /* And back to Default restores it, so the escape hatch is real. */
  await P.page.evaluate(() => {
    const b = document.querySelector('.bt-cc-defcolor');
    if (b) b.click();
  });
  await P.page.waitForTimeout(2200);
  const backToNative = diff(native, await grab(P));
  console.log('    delta after Default: ' + JSON.stringify(backToNative));
  rec.ok('...and Default puts the native paint back', !!backToNative && backToNative.n < 60, backToNative);

  /* ══ 4. the bake, per facing ══ */
  const bake = await P.page.evaluate(async () => {
    const m = window.__btEyewearColor;
    m.textures('thug-life', 'red');   /* kicks the bake; null until it lands */
    for (let i = 0; i < 80; i++) {
      const t = m.textures('thug-life', 'red');
      if (t && t.south) return { baked: true, dirs: Object.keys(t).sort() };
      await new Promise((r) => setTimeout(r, 100));
    }
    return { baked: false };
  }).catch((e) => ({ err: String(e) }));
  console.log('    bake: ' + JSON.stringify(bake));
  rec.ok('the in-WORLD path bakes a recoloured texture set too, so the bro on '
    + 'the map matches the bro in the creator', bake.baked === true, bake);
  rec.ok('...for every facing the art has -- and NOT north, which eyewear '
    + 'deliberately omits (v2.3.2361), so nothing 404s four times per colour',
    !!bake.dirs && bake.dirs.indexOf('north') < 0 && bake.dirs.length >= 3, bake);

  /* ══ 5. exclusions fall back to native, never to a blank ══ */
  const excluded = await P.page.evaluate(() => {
    const m = window.__btEyewearColor;
    return {
      goldYellow: !!m.textures('golden-glasses', 'yellow'),
      offered: (m.colorsFor('golden-glasses') || []).map((c) => c.id).indexOf('yellow'),
      unlisted: !!m.textures('3d-glasses', 'red'),
      nonePair: m.colorsFor('none'),
    };
  });
  console.log('    exclusions: ' + JSON.stringify(excluded));
  rec.ok('gold is not offered yellow -- a swatch that repaints gold gold is a '
    + 'control that appears to do nothing', excluded.offered < 0, excluded.offered);
  rec.ok('...and asking for it anyway renders the native art rather than a blank',
    excluded.goldYellow === false, excluded.goldYellow);
  rec.ok('an unlisted pair renders native too, so a saved appearance naming a '
    + 'colour it no longer offers falls back cleanly rather than showing a bare face',
    excluded.unlisted === false && excluded.nonePair === null, excluded);

  await P.ctx.close().catch(() => {});
}
