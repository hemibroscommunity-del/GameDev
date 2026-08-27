/* THE CREATOR'S TWO ICONS, AND THE DEFAULT COLOUR BUTTON — v2.3.2035.
 *
 * Three owner asks, all of them about things you can only judge by looking:
 * the tattoo icon and the Randomize Look icon were too small, and "default"
 * was not a thing you could pick.
 *
 * WHY THIS FILE EXISTS RATHER THAN A SCREENSHOT.  A size bump is trivially
 * "done" in CSS and trivially wrong on a phone: the two buttons these icons
 * sit in have SMALLER minimums under `max-height:720px` (game.css: .bt-cc-draw
 * drops 54px -> 44px), so an icon chosen against a desktop button can crush
 * the control on an iPhone SE and nobody notices until a player says the
 * screen looks broken. The viewport here is 390x844 and every assertion is a
 * MEASUREMENT of the rendered box, not of the stylesheet.
 *
 * THE DEFAULT BUTTON'S REAL PROPERTY is not that it renders -- it is that it
 * is reachable when a colour IS picked, and that picking it puts the store
 * back to 'default'. v2.3.1253's rule (re-tap your own pick to unselect) was
 * the thing the owner could not find, so a test that only checks the button
 * exists would miss the entire point.
 */
import * as H from './harness.mjs';

/* The rendered box, from the browser, not from the stylesheet. */
const box = (P, sel) => P.page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height) };
}, sel);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Sizer', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });

  await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await P.page.click('[data-tut="login-create"]');
  await P.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
  await P.page.waitForTimeout(1200);

  /* ── 1. the Randomize Look icon ──
     Addressed through its BUTTON, not by `.bt-cc-action-icon` alone: that
     class has two users and the name-reroll die comes first in the document,
     so the bare selector measures the wrong icon.  The first draft did
     exactly that, reported 22px, and sent me looking for a CSS override that
     did not exist -- the measurement was of a different picture. */
  const rnd = await box(P, '.bt-cc-btn--hero .bt-cc-action-icon');
  rec.ok('the Randomize Look icon is on screen (guard)', !!rnd, rnd);
  rec.ok('...and it is bigger than the 20px it used to be',
    !!rnd && rnd.w >= 28 && rnd.h >= 28, rnd);
  /* And the OTHER user of that class is untouched: the owner asked for the
     randomize icon, not the name die.  Sizing the shared class would have
     passed the assertion above and quietly changed a control nobody
     mentioned. */
  const die = await box(P, '.bt-cc-namewrap .bt-cc-action-icon');
  rec.ok('the name-reroll die is NOT enlarged — one icon was asked for, not two',
    !!die && die.w <= 24, die);

  const heroBtn = await box(P, '.bt-cc-btn--hero');
  rec.ok('...without pushing its button taller than the 52px minimum '
       + '(guard: "bigger" must not mean "the layout moved")',
    !!heroBtn && heroBtn.h <= 60, { heroBtn, rnd });

  /* ── 2. the tattoo icon — only on the Skin tab ── */
  const toSkin = await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('button')]
      .find((x) => (x.textContent || '').trim() === 'Skin');
    if (b) { b.click(); return true; }
    return false;
  });
  rec.ok('the Skin tab could be opened (guard)', toSkin === true, { toSkin });
  await P.page.waitForTimeout(900);

  const tat = await box(P, 'img.bt-cc-draw-icon');
  rec.ok('the tattoo icon is the painted art, not the fallback pencil (guard)',
    !!tat, tat);
  rec.ok('...and it is bigger than the 26px it used to be',
    !!tat && tat.w >= 32 && tat.h >= 32, tat);

  /* THE ONE THAT WOULD BITE ON A PHONE.  .bt-cc-draw is min-height 44px at
     this viewport height, not 54 -- an icon sized against the desktop button
     would overflow it here and nowhere else. */
  const drawBtn = await box(P, '.bt-cc-draw');
  rec.ok('...and it still FITS its button on a phone-sized screen, with the '
       + 'icon inside the box rather than setting its height',
    !!(drawBtn && tat) && tat.h < drawBtn.h && drawBtn.h >= 44,
    { drawBtn, tat });

  /* ── 3. the Default colour button ──
     A COLOUR ROW ONLY EXISTS ONCE AN ITEM IS PICKED (`_def.sel !== 'none'`,
     NameModal.jsx), so the tab alone is not enough. The first draft checked
     the Hair tab straight away, found the whole colour block ghosted, and
     "picked a colour" by clicking the ghost's placeholder div -- every
     assertion after that was measuring an invisible element. Probing it
     against unmodified main confirmed the ghosting is correct behaviour and
     not a regression, which is worth stating so nobody re-investigates it. */
  await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('.bt-cc-tab')]
      .find((x) => (x.textContent || '').trim() === 'Hair');
    if (b) b.click();
  });
  await P.page.waitForTimeout(700);
  await P.page.evaluate(() => {
    const strip = document.querySelector('.bt-cc-strip');
    const t = strip && (strip.children[1] || strip.children[0]);
    if (t) (t.querySelector('button') || t).click();
  });
  await P.page.waitForTimeout(800);

  const live = await P.page.evaluate(() => {
    const blk = document.querySelector('.bt-cc-colors');
    return !!(blk && !blk.className.includes('bt-cc-ghost'));
  });
  rec.ok('a hair is picked, so the colour row is live (guard: every assertion '
       + 'below is vacuous against a ghosted block)', live, { live });

  const def = await box(P, '.bt-cc-defcolor');
  rec.ok('the Default button is on screen', !!def, def);
  rec.ok('...and it is a text button, not a swatch — it is the ABSENCE of a '
       + 'colour, so anything square-and-coloured would lie about that',
    !!def && def.w > def.h * 1.6, def);

  /* It must sit ABOVE the swatches, which is where the owner asked for it and
     is also why it is a row rather than the absolute label v2.3.1310 retired
     for overlapping them. */
  const order = await P.page.evaluate(() => {
    const d = document.querySelector('.bt-cc-defcolor');
    const row = document.querySelector('.bt-cc-colors-row');
    if (!d || !row) return null;
    const a = d.getBoundingClientRect(), b = row.getBoundingClientRect();
    return { defBottom: Math.round(a.bottom), rowTop: Math.round(b.top) };
  });
  rec.ok('...positioned above the colour options, not over them',
    !!order && order.defBottom <= order.rowTop + 1, order);

  /* THE BEHAVIOUR. Pick a colour, then use Default to come back — the round
     trip is the thing v2.3.1253 made undiscoverable. */
  const startsOn = await P.page.evaluate(() =>
    !!document.querySelector('.bt-cc-defcolor--on'));
  rec.ok('with nothing picked, Default reads as the current choice', startsOn, { startsOn });

  /* THE ROW MUST NOT STILL CARRY A 'default' TILE.  It used to be the first
     one, and it drew a hard-coded swatch -- blue on Shirt (#3a5bd0), purple on
     Hats (#7c6cff) -- over an item of some other colour entirely. That tile IS
     the owner's complaint, so the button replacing it only helps if the tile
     is gone; two Defaults, one of them lying, would be worse than one.
     This assertion is why the first draft failed honestly: it clicked the
     first tile to "pick a colour", hit the default tile, and set the store
     back to 'default'. */
  const titles = await P.page.evaluate(() =>
    [...document.querySelectorAll('.bt-cc-colors-row > *')]
      .map((b) => b.getAttribute('title') || ''));
  rec.ok('the swatch row no longer carries a Default tile — the button is the '
       + 'only Default, and a word cannot claim to be a colour',
    titles.length > 0 && !titles.some((t) => /original color/i.test(t)), titles);

  const picked = await P.page.evaluate(() => {
    const t = document.querySelector('.bt-cc-colors-row > *');
    if (!t) return false;
    (t.querySelector('button') || t).click();
    return true;
  });
  rec.ok('a colour could be picked (guard: the round trip needs a there and back)',
    picked === true, { picked });
  await P.page.waitForTimeout(700);
  const offAfterPick = await P.page.evaluate(() =>
    !!document.querySelector('.bt-cc-defcolor--on'));
  rec.ok('...and Default stops reading as chosen once a colour is', !offAfterPick,
    { stillOn: offAfterPick });

  await P.page.click('.bt-cc-defcolor');
  await P.page.waitForTimeout(700);
  const backOn = await P.page.evaluate(() =>
    !!document.querySelector('.bt-cc-defcolor--on'));
  rec.ok('tapping Default puts the colour back — the way out that previously '
       + 'existed only as "re-tap the swatch you chose"', backOn, { backOn });
}
