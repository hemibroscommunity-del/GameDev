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
 * sit in have SMALLER minimums under a short viewport, so an icon chosen
 * against a desktop button can crush
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
  /* ═══ v2.3.2456: THE DIE HAS SINCE BEEN ASKED FOR TOO ═══
     This asserted the die stayed at 22 -- "one icon was asked for, not two"
     (v2.3.2035) -- and the owner asked for the other one at v2.3.2453:
     "randomize button for name needs to be larger it looks small and awkward".
     So the claim inverts, and what survives it is the mechanism that made the
     first version safe: the two icons share .bt-cc-action-icon and each states
     its OWN size inline, so they can be moved independently.  Asserting they
     are DIFFERENT is what keeps that true -- if a later edit sizes the shared
     class, both land on one number and this goes red. */
  const die = await box(P, '.bt-cc-namewrap .bt-cc-action-icon');
  rec.ok('the name-reroll die is enlarged too (owner, v2.3.2453)',
    !!die && die.w >= 28, die);
  rec.ok('...and the two icons still carry their own sizes rather than one '
    + `shared class value (die ${die && die.w}, randomize ${rnd && rnd.w})`,
    !!die && !!rnd && die.w !== rnd.w, { die: die && die.w, rnd: rnd && rnd.w });

  /* ═══ v2.3.2464: THE REROLL SYMBOL, AND THE FIELD IT SHARES A BOX WITH ═══
     Owner, a third time and about the picture rather than its size: "I'm
     talking about the symbol for randomizing to the right of the name...
     Whatever that is.  Maybe replace it with a recycle icon or something."
     cc-random-name.webp is a parchment scroll with a small die beside it, and
     at the ~30px this button can spare the die is eight pixels across.  Two
     rounds of enlarging could not fix a silhouette problem, so it is a stroked
     vector now. */
  const isVector = await P.page.evaluate(() => {
    const el = document.querySelector('.bt-cc-namewrap .bt-cc-action-icon');
    return el ? el.tagName.toLowerCase() : null;
  });
  rec.ok('the name reroll symbol is a VECTOR, so it cannot blur back into a '
    + 'beige smudge at icon scale', isVector === 'svg', { tag: isVector });

  /* THE GUARD THAT MATTERS, AND THE TRAP IT ENCODES.
     Growing this button eats the field's right padding, and past a threshold
     the placeholder ellipsises to "Tap to na...".  That shipped once already
     BEHIND A MEASUREMENT THAT SAID IT FIT: an <input>'s scrollWidth reflects
     its VALUE and ignores its placeholder entirely, so an empty field always
     reports no overflow no matter how badly the placeholder is clipped.
     The honest test is to put the placeholder in AS the value and measure
     that, which is what this does -- then put the field back. */
  const fit = await P.page.evaluate(() => {
    const f = document.querySelector('input.bt-cc-name');
    if (!f) return null;
    const prev = f.value;
    f.value = f.placeholder;
    const r = { text: f.placeholder, scrollW: f.scrollWidth, clientW: f.clientWidth };
    f.value = prev;
    r.truncates = r.scrollW > r.clientW + 0.5;
    return r;
  });
  rec.ok('...and the bigger button has not clipped the placeholder to '
    + '"Tap to na..." (measured as a value, not as a placeholder)',
    !!fit && fit.truncates === false, fit);

  const heroBtn = await box(P, '.bt-cc-btn--hero');
  rec.ok('...without pushing its button taller than the 52px minimum '
       + '(guard: "bigger" must not mean "the layout moved")',
    !!heroBtn && heroBtn.h <= 60, { heroBtn, rnd });

  /* ── 1b. EVERY TAB WEARS ART THAT ACTUALLY DECODED (v2.3.2389) ──
     The Eyewear tab drew an inline SVG glyph as a placeholder from v2.3.2361
     until the owner sent art for it.  Swapping a glyph for an <img> introduces
     a failure this file's other assertions cannot see: a wrong path gives a
     BROKEN image, and a broken image occupies its CSS box, keeps its class and
     reports a perfectly ordinary getBoundingClientRect.  Every measurement in
     this file would still pass over a tab showing nothing at all.

     naturalWidth is the only honest question -- it is 0 until the bytes are
     decoded.  Asked of all nine tabs rather than of eyewear alone, because the
     same typo is available in any of them and none was covered before. */
  const tabArt = await P.page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.bt-cc-tabs .bt-cc-tab').forEach((b) => {
      const label = (b.querySelector('.bt-cc-tab-label') || {}).textContent || '?';
      const img = b.querySelector('img.bt-cc-tab-icon');
      const svg = b.querySelector('svg.bt-cc-tab-icon');
      out.push({ label: label.trim(), kind: img ? 'img' : svg ? 'svg' : 'none',
        nat: img ? img.naturalWidth : null, src: img ? img.getAttribute('src') : null });
    });
    return out;
  });
  const painted = tabArt.filter((t) => t.kind === 'img');
  rec.ok(`all nine creator tabs have an icon of some kind (${tabArt.length} found)`,
    tabArt.length === 9 && tabArt.every((t) => t.kind !== 'none'), tabArt);
  /* NINE painted, not eight.  _TABS still carries a tenth entry with an inline
     `build` glyph, but v2.3.2268 deleted Build from _typeDefs and the list ends
     in `.filter(!!_typeDefs[x.t])`, so that tab has not rendered since -- the
     branch is kept deliberately as the restoration path.  The first cut of this
     assertion expected 8 + 1 glyph from reading _TABS, and the browser said
     otherwise; the browser is right. */
  rec.ok(`...and every one of them is painted art, no glyphs left on screen -- ${painted.length}/9`,
    painted.length === tabArt.length, tabArt.map((t) => t.label + ':' + t.kind));
  rec.ok('...and every one actually decoded its bytes (naturalWidth > 0)',
    painted.length > 0 && painted.every((t) => t.nat > 0),
    painted.filter((t) => !(t.nat > 0)));
  /* The one the owner asked for, named, so a regression says which tab. */
  const eyewear = tabArt.find((t) => t.label === 'Eyewear');
  rec.ok('the Eyewear tab is painted art now, not the placeholder glyph',
    !!eyewear && eyewear.kind === 'img' && eyewear.nat > 0, eyewear);

  /* ── 2. the tattoo icon — only on the Skin tab ── */
  const toSkin = await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('button')]
      .find((x) => (x.textContent || '').trim() === 'Skin');
    if (b) { b.click(); return true; }
    return false;
  });
  rec.ok('the Skin tab could be opened (guard)', toSkin === true, { toSkin });
  await P.page.waitForTimeout(900);

  /* ═══ v2.3.2415: THE ICON MOVED, AND THE NUMBER MOVED WITH IT ═══
     v2.3.2035 took this icon 26 -> 34 inside a 54px button whose other half was
     a sentence.  The owner then asked for that sentence to be replaced by the
     tattoo tools ("Instead of using space for 'tattoo your body or face' I'd
     rather you just have the tools for tattooing right there beneath the
     character"), so there is no label bar left to size it against: it is a
     badge on the picture now, .bt-cc-ink-badge, at 28.
     28, not 34, and that is a judgement rather than a measurement -- on a
     170px-wide picture 34px reads as a sticker stuck on the character.  It is
     still above the 26 the owner asked it to grow from, which is the property
     this assertion was written to hold; if it now reads too small on a real
     phone, this is the number to change and this note is why. */
  const tat = await box(P, 'img.bt-cc-ink-badge');
  rec.ok('the tattoo icon survived the label bar it used to live in, and is '
       + 'still the painted art (guard)', !!tat, tat);
  rec.ok('...and it is still bigger than the 26px the owner asked it to grow '
       + 'from', !!tat && tat.w >= 28 && tat.h >= 28, tat);

  /* THE ONE THAT WOULD BITE ON A PHONE.  A badge has to stay a badge: it sits
     over the one thing this pane exists to show, so an icon that grew to fill
     the picture would pass "bigger than 26" and hide the character. */
  const pane = await box(P, '.bt-cc-ink-pane');
  rec.ok('...and it is a badge ON the picture rather than a sticker OVER it -- '
       + 'under a third of the pane in both directions',
    !!(pane && tat) && tat.h < pane.h / 3 && tat.w < pane.w / 3,
    { pane, tat });

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
      /* v2.3.2456: which tile is PICKED.  This used to count children -- the
         picked tile was the one carrying a second child, the cc-selected.webp
         badge -- and v2.3.2454 put the owner's painted frames on the tiles,
         which draw the check INSIDE the selected art.  There is no extra
         element to count any more; the mark is the tile's own background, and
         reading that is also closer to what the player sees. */
      const t = [...document.querySelectorAll('.bt-cc-strip > *')]
        .find((el) => /cc-tile-on/.test(getComputedStyle(el.querySelector('button') || el).backgroundImage || ''));
      return t ? (t.getAttribute('title') || (t.querySelector('button') || {}).title || '?') : null;
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

  /* ═══ v2.3.2205: THE "THERE IS MORE BELOW" CUE ═══
     Owner, on the Hats tab: "additional hat options don't surface the
     shadowed effect to cue additional options anymore."

     It had been dead since v2.3.1524 and nothing noticed, so the interesting
     question is what a test would have had to check to catch it. Not "does
     the overlay exist" -- it existed the whole time, correctly wired, at
     opacity 0. Not "is it in the DOM when the catalogue is long" -- also true
     the whole time. The two properties that were actually false:

       1. the flag goes TRUE on a catalogue that overflows, and
       2. the band lies along the edge the content runs off.

     (2) is the one that pins the axis. A right-hand 26px column and a bottom
     22px band are both "an overlay on the strip"; only measuring the rect
     against the strip's own box can tell them apart, which is why this
     asserts the band is nearly as wide as the strip and sits at its floor
     rather than just asserting it is visible.

     Hats is the catalogue the owner was looking at and the longest in the
     game, so it is the honest one to drive -- but the guard below still
     proves it overflows rather than trusting that. */
  const opened = await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('.bt-cc-tab')]
      .find((x) => (x.textContent || '').trim() === 'Hats');
    if (b) b.click();
    return !!b;
  });
  rec.ok('the Hats tab is there to open (guard)', opened, { opened });
  await P.page.waitForTimeout(800);

  const cue = () => P.page.evaluate(() => {
    const strip = document.querySelector('.bt-cc-strip');
    const more = document.querySelector('.bt-cc-scroll .bt-cc-more');
    if (!strip || !more) return null;
    const sr = strip.getBoundingClientRect();
    const mr = more.getBoundingClientRect();
    return {
      overflow: strip.scrollHeight - strip.clientHeight,
      top: Math.round(strip.scrollTop),
      on: more.className.indexOf('bt-cc-more--on') >= 0,
      /* Computed, not the class: a rule could hide it in a way the class
         name cannot see. */
      opacity: Number(getComputedStyle(more).opacity),
      widthFrac: mr.width / sr.width,
      floorGap: Math.round(sr.bottom - mr.bottom),
      height: Math.round(mr.height)
    };
  });

  const atTop = await cue();
  rec.ok('the Hats catalogue really is taller than its strip (guard: a cue '
       + 'that never had anything to announce proves nothing)',
    !!atTop && atTop.overflow > 20, atTop);
  rec.ok('...so the "more below" cue is showing', !!atTop && atTop.on, atTop);
  rec.ok('...and it is actually painted, not just class-tagged',
    !!atTop && atTop.opacity > 0.9, atTop);
  /* The axis assertions -- the two that fail on the pre-v2.3.2205 overlay,
     which was a narrow column pinned to the RIGHT edge. */
  rec.ok('...lying across the strip\'s full width, not down one side',
    !!atTop && atTop.widthFrac > 0.9, atTop);
  /* v2.3.2206: this used to require the band's bottom to LAND on the strip's
     bottom (|gap| <= 2), and that tolerance is exactly what shipped the
     owner's one-device-pixel bright line -- two boxes that agree in CSS can
     still round to different device pixels on a composited touch-scroller.
     The band now deliberately OVERSHOOTS, so the pin is that it hangs BELOW
     the strip rather than meeting it, with a ceiling so a future edit cannot
     turn a 3px overshoot into a 30px one that swallows the row beneath. */
  rec.ok('...hanging past the strip\'s bottom edge, so no rounding seam can '
       + 'open up under it', !!atTop && atTop.floorGap <= -2 && atTop.floorGap >= -8, atTop);

  /* And it goes away at the end of the list: a cue that is always on is
     decoration, not information. */
  await P.page.evaluate(() => {
    const strip = document.querySelector('.bt-cc-strip');
    if (strip) strip.scrollTop = strip.scrollHeight;
  });
  await P.page.waitForTimeout(500);
  const atEnd = await cue();
  rec.ok('scrolled to the last hat, the cue is gone', !!atEnd && !atEnd.on, atEnd);

  /* v2.3.2205: the scroll RESET carried the same axis bug (scrollLeft on an
     overflow-x:hidden box). Leave Hats scrolled to the bottom, switch away
     and back, and the catalogue must start at the top again.

     Stated honestly: this one PASSES against the unfixed source too, so it
     is a pin, not the guard that would have caught the bug. Hair's catalogue
     is shorter than Hats', so swapping to it shrinks the content under a
     scrolled box and the browser clamps scrollTop to 0 on its own -- the
     broken reset got the right answer by accident on this particular pair of
     tabs. It is kept because the invariant is real and cheap, and because a
     future long-catalogue-to-long-catalogue switch would make it bite. */
  const back = await P.page.evaluate(() => {
    const hit = (label) => {
      const b = [...document.querySelectorAll('.bt-cc-tab')]
        .find((x) => (x.textContent || '').trim() === label);
      if (b) b.click();
      return !!b;
    };
    return hit('Hair');
  });
  rec.ok('the Hair tab is there to switch to (guard)', back, { back });
  await P.page.waitForTimeout(600);
  await P.page.evaluate(() => {
    const b = [...document.querySelectorAll('.bt-cc-tab')]
      .find((x) => (x.textContent || '').trim() === 'Hats');
    if (b) b.click();
  });
  await P.page.waitForTimeout(700);
  const reopened = await cue();
  rec.ok('coming back to Hats starts at the top of the list, not where you '
       + 'left it', !!reopened && reopened.top === 0, reopened);
  rec.ok('...with the cue showing again', !!reopened && reopened.on, reopened);

  /* ── 5. THE COLOUR ROW DOES NOT HIDE COLOURS IT HAS ROOM FOR (v2.3.2396) ──
     Owner, with a screenshot of the Hair tab: "For some reason the color
     picker is dimming the colors even when there's more room to display."

     The cue above is honest; the CAP was not.  .bt-cc-colors-row was a fixed
     two rows on every tab, so Hair -- fourteen colours, four rows of content --
     hid 75px of swatches behind the fade while 261px of panel sat EMPTY below
     the Design button.

     THE TRAP THIS SECTION IS BUILT AROUND: the colour row is EMPTY until a
     trait is actually picked.  A fresh character is 'None' on every tab, so a
     probe that just opens a tab and measures reports "13 swatches" as one
     child and no overflow, on all eight tabs, and tells you the bug is not
     there.  It cost me a wrong diagnosis before the numbers made sense.  So
     each tab here PICKS its first real option first. */
  const colourFit = async (tab) => P.page.evaluate(async (t) => {
    const b = [...document.querySelectorAll('.bt-cc-tab')].find((x) => (x.textContent || '').trim() === t);
    if (!b) return null;
    b.click();
    await new Promise((r) => setTimeout(r, 400));
    const tiles = [...document.querySelectorAll('.bt-cc-strip > *')];
    if (tiles.length > 1) { tiles[1].click(); await new Promise((r) => setTimeout(r, 600)); }
    const row = document.querySelector('.bt-cc-colors-row');
    if (!row) return null;
    const wrap = row.parentElement;
    const more = wrap && wrap.querySelector('.bt-cc-more');
    const panel = document.querySelector('.bt-cc-panel');
    const draw = document.querySelector('.bt-cc-ink');   /* v2.3.2414 */
    const pr = panel.getBoundingClientRect();
    const dr = draw ? draw.getBoundingClientRect() : null;
    return { t, swatches: row.children.length,
      clientH: row.clientHeight, scrollH: row.scrollHeight,
      hidden: row.scrollHeight - row.clientHeight,
      cue: !!(more && more.classList.contains('bt-cc-more--on')),
      drawBottom: dr ? Math.round(dr.bottom) : null, panelBottom: Math.round(pr.bottom) };
  }, tab);

  for (const tab of ['Hair', 'Shirt']) {
    const f = await colourFit(tab);
    console.log(`    ${tab} colours: ` + JSON.stringify(f));
    rec.ok(`${tab}: its colour swatches are actually rendered (guard: ${f && f.swatches})`,
      !!f && f.swatches > 6, f);
    rec.ok(`${tab}: the colour row hides none of them (${f && f.scrollH}px of swatches in a ${f && f.clientH}px box)`,
      !!f && f.hidden <= 2, f);
    rec.ok(`${tab}: ...so nothing is dimmed behind a fade`, !!f && f.cue === false, f);
    /* The room it grew into was real spare space, not the ink card's.
       v2.3.2414: Hair has no drawing, so it has no card -- the assertion is
       about the tabs that DO carry one, and `drawBottom === null` is the
       honest reading of "there is nothing here to push out" rather than a
       silent pass. */
    rec.ok(`${tab}: ...and the ink card, where there is one, is still inside `
       + `the panel (${f && f.drawBottom === null ? 'no card on this tab' : 'card present'})`,
      !!f && (f.drawBottom === null || f.drawBottom <= f.panelBottom), f);
  }
}
