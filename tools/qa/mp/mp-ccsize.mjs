/* THE CREATOR'S TWO ICONS, AND THE DEFAULT COLOUR BUTTON — v2.3.2035.
 *
 * v2.3.2090 adds sections 3b and 3c: the button was restyled because it was
 * hard to SEE, and "more obvious" only means something as a measurement of
 * rendered pixels.  Read §40 of docs/TRAPS.md before touching that sampling --
 * the image is devicePixelRatio times the CSS box, and the first draft of it
 * reported a contrast of 1 for a near-white button on a dark panel.
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

  /* ── 3b. IS IT ACTUALLY VISIBLE? — v2.3.2090 ──
     Owner: "make the default button more obvious for color picker (maybe a
     different background color)".  v2.3.2035 shipped it as a near-transparent
     fill (rgba(255,255,255,.05)) above swatch tiles that carry a LIGHT well,
     so it read as a disabled caption beside them.

     "More obvious" is only a real claim if it is a NUMBER, and the number has
     to come from the rendered pixels rather than the stylesheet: a fill can be
     declared bright and still be invisible because something translucent sits
     over it, or because the rule lost the cascade.  So this samples the
     button's own fill and the backdrop immediately beside it and asserts the
     gap in perceived brightness.  The old style scored ~10 of 255 here; a
     threshold of 90 cannot be met by tinting the old fill a bit and is met
     with room to spare by giving it the picker's well. */
  const lum = (px) => 0.2126 * px[0] + 0.7152 * px[1] + 0.0722 * px[2];
  const rect = (sel) => P.page.evaluate((s2) => {
    const el = document.querySelector(s2);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, sel);

  /* Read here, before anything is picked.  Nothing needs unselecting first:
     the v2.3.2090 restyle puts the whole selected/unselected difference on the
     RING (3c below), so the fill this measures is the same fill in both
     states -- which is the point.  The state the owner was looking at and
     could not see was the unchosen one, and it now carries this same well. */
  const dr = await rect('.bt-cc-defcolor');
  rec.ok('the Default button has a box to sample (guard)', !!dr, dr);

  /* A generous margin either side, so the clip carries backdrop AND button.
     Sampled at the button's vertical middle: 6px inside its left edge is fill
     (the label is centred, so no glyph is in the way), and 12px outside is the
     colour block behind it -- the head row is empty there, which is why the
     backdrop reading is of the sheet and not of a swatch. */
  const clipW = dr ? Math.round(dr.w) + 40 : 0;
  const strip = dr && await H.screenshotPixels(P, {
    x: Math.round(dr.x) - 20, y: Math.round(dr.y + dr.h / 2) - 1,
    width: clipW, height: 3
  });
  /* A SCREENSHOT IS NOT IN CSS PIXELS.  getBoundingClientRect speaks CSS px and
     the returned image is devicePixelRatio times that -- 2x here -- so indexing
     the image with a CSS offset lands at HALF the distance in.  The first draft
     sampled "6px inside the left edge", landed 7px OUTSIDE it, read the panel
     twice and reported a contrast of 1 for a near-white button on a dark panel.
     Scale by the image's own width over the clip's, so the sampling follows the
     ratio the browser actually used rather than one assumed here. */
  const k = strip ? strip.width / clipW : 1;
  const midY = strip ? Math.floor(strip.height / 2) : 0;
  const contrast = strip
    ? Math.abs(lum(strip.at(Math.round((20 + 6) * k), midY))
             - lum(strip.at(Math.round(6 * k), midY)))
    : -1;
  rec.ok('the Default button stands off the panel behind it — its fill and the '
       + 'backdrop beside it differ by more than 90 of 255 in brightness '
       + '(the near-transparent v2.3.2035 fill scored about 10)',
    contrast >= 90, { contrast: Math.round(contrast), dpr: Math.round(k * 100) / 100,
      fill: strip && strip.at(Math.round(26 * k), midY),
      behind: strip && strip.at(Math.round(6 * k), midY) });

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

  /* ── 3c. AND THE PICK STILL READS AS THE PICK — v2.3.2090 ──
     The v2.3.2090 restyle moved the selected state off the FILL (it used to
     darken to a brass wash) and onto a brass RING, the same signal a chosen
     swatch carries.  That is the failure mode worth a test: give the unchosen
     button a bright well and forget to re-pitch the chosen one, and the
     CHOSEN state ends up the quieter of the two.  Counting brass pixels in a
     band around the button answers it in the rendered image. */
  const brassy = async () => {
    const r = await rect('.bt-cc-defcolor');
    if (!r) return -1;
    const px = await H.screenshotPixels(P, {
      x: Math.round(r.x) - 5, y: Math.round(r.y) - 5,
      width: Math.round(r.w) + 10, height: Math.round(r.h) + 10
    });
    let n = 0;
    for (let y = 0; y < px.height; y++) {
      for (let x = 0; x < px.width; x++) {
        const c = px.at(x, y);
        if (c[0] > 150 && c[0] - c[2] > 55 && c[1] > c[2]) n++;
      }
    }
    return n;
  };
  const ringOn = await brassy();
  await P.page.evaluate(() => {
    const t = document.querySelector('.bt-cc-colors-row > *');
    if (t) (t.querySelector('button') || t).click();
  });
  await P.page.waitForTimeout(700);
  const ringOff = await brassy();
  rec.ok('the chosen Default wears a brass ring, the unchosen one does not — '
       + 'selection reads the same way it reads on a swatch',
    ringOn > ringOff + 60, { ringOn, ringOff });

  /* Put it back so the assertions after this one see the state they expect. */
  await P.page.click('.bt-cc-defcolor');
  await P.page.waitForTimeout(600);

  /* ── 4. Reset — v2.3.2036 ──
     Owner: "bald shirtless character is what I wanted for reset". So the
     contract is a fixed BARE state, not a snapshot of anything -- assert the
     actual tiles, by name, rather than "it changed".

     Read both halves, because writing only one is how a reset goes subtly
     wrong: the picker's TICK proves the React selection state, and a
     fingerprint of the PREVIEW CANVAS proves the trait store, since the figure
     is drawn from the store and not from the tick. A reset that wrote the
     store but not the tick leaves the picker lying; the reverse leaves the
     character wrong. Either alone passes a one-sided test.

     An earlier draft of this block read S.player.hair and friends. They do not
     exist -- the player object carries x/y/vx/vy/dir and nothing else -- so it
     compared {} to {} and PASSED VACUOUSLY, which is worse than failing. */
  const look = () => P.page.evaluate(async () => {
    const tickOf = async (label) => {
      const b = [...document.querySelectorAll('.bt-cc-tab')]
        .find((x) => (x.textContent || '').trim() === label);
      if (b) b.click();
      await new Promise((r) => setTimeout(r, 300));
      const t = [...document.querySelectorAll('.bt-cc-strip > *')]
        .find((el) => el.children.length > 1);      /* the check badge */
      return t ? (t.getAttribute('title') || '?') : null;
    };
    const ticks = {};
    for (const l of ['Hair', 'Shirt', 'Hats', 'Beard']) ticks[l] = await tickOf(l);
    let px = null;
    const c = document.querySelector('canvas');
    if (c) {
      try {
        const o = document.createElement('canvas');
        o.width = 24; o.height = 40;
        const x = o.getContext('2d');
        x.drawImage(c, 0, 0, 24, 40);
        const d = x.getImageData(0, 0, 24, 40).data;
        let h = 0;
        for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) >>> 0;
        px = h;
      } catch (e) { px = 'blocked'; }
    }
    return { ticks, px };
  });

  /* Dress the character up first, so Reset has something to strip. Randomize
     is the honest way to do it -- it is the same button a player would have
     pressed -- and it rolls hair, hat, beard and shirt among others. */
  await P.page.click('.bt-cc-btn--hero:not(.bt-cc-reset)');
  await P.page.waitForTimeout(1800);
  const dressed = await look();
  const anyWorn = ['Hair', 'Shirt', 'Hats', 'Beard']
    .some((k) => dressed.ticks[k] && dressed.ticks[k] !== 'None');
  rec.ok('Randomize put something ON the character (guard: stripping an '
       + 'already-bare character proves nothing)', anyWorn, dressed.ticks);

  await P.page.click('.bt-cc-reset');
  await P.page.waitForTimeout(1500);
  const bare = await look();

  rec.ok('Reset leaves the character BALD', bare.ticks.Hair === 'None', bare.ticks);
  rec.ok('...and SHIRTLESS', bare.ticks.Shirt === 'None', bare.ticks);
  rec.ok('...with no hat', bare.ticks.Hats === 'None', bare.ticks);
  rec.ok('...and no beard', bare.ticks.Beard === 'None', bare.ticks);
  rec.ok('...and the CHARACTER actually changed with the ticks — the trait '
       + 'store, not just the picker', bare.px !== dressed.px,
    { dressedPx: dressed.px, barePx: bare.px });

  /* Idempotent: a second Reset from an already-bare character is a no-op, not
     a wobble. Cheap to check and the kind of thing that quietly is not true. */
  await P.page.click('.bt-cc-reset');
  await P.page.waitForTimeout(1200);
  const bare2 = await look();
  rec.ok('Reset twice is the same as Reset once',
    JSON.stringify(bare2.ticks) === JSON.stringify(bare.ticks),
    { bare: bare.ticks, bare2: bare2.ticks });

  /* And the colour picks go back to Default with it -- the button added
     earlier in this same version is the thing that shows it. */
  await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('.bt-cc-tab')]
      .find((x) => (x.textContent || '').trim() === 'Skin');
    if (b) b.click();
  });
  await P.page.waitForTimeout(700);
  const skinDefault = await P.page.evaluate(() =>
    !!document.querySelector('.bt-cc-defcolor--on'));
  rec.ok('...and colour picks are back to Default too', skinDefault, { skinDefault });
}
