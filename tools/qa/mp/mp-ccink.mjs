/* ═══ THE INK CARD IS THE WAY IN NOW (v2.3.2399) ═══
 *
 * Owner: "I'd rather make the tattoo editor simplified, just a preview of the
 * body you'd be editing right there in the panel.  I don't really want a button
 * to launch the editor anymore.  Every time somebody playtests the game they
 * always never notice it."
 *
 * ── WHY THIS FILE EXISTS RATHER THAN A SCREENSHOT ──
 * "Nobody notices it" is not a property a test can read directly, so this file
 * asserts the three measurable things that were actually wrong, each of which a
 * screenshot would let you talk yourself out of:
 *
 *   1. THE DEAD HEIGHT.  On Skin at 390x844 the old button sat with 122.5px of
 *      empty panel above it (a `visibility:hidden` colour block that this tab
 *      can never fill -- `colors: null`) and 147.6px below it: 270px of nothing
 *      wrapped around the one control on the tab.  A thing in a gap between two
 *      things is the one place a scanning eye does not stop.  Section 2 pins
 *      the gap on BOTH sides, because closing one and opening the other would
 *      be no fix at all.
 *   2. THE CHARACTER MUST NOT MOVE.  v2.3.1938 ghosted this control on all
 *      eight tabs to hold the sheet's height constant (v2.3.1252), and
 *      v2.3.2399 stops doing that.  Section 3 asserts the property that rule
 *      was protecting -- the stage is the same height on every tab -- rather
 *      than the mechanism, which the v2.3.1524 two-column split had already
 *      made redundant.
 *   3. THE PREVIEW IS ACTUALLY HIS, AND ACTUALLY LIVE.  A card that shows a
 *      generic body, or one that goes stale the moment you draw on it, is the
 *      same failure wearing new clothes.  Section 5 draws a real tattoo through
 *      the real editor and requires the card's own pixels to change.
 *
 * ── THE TRAP THIS FILE IS BUILT AROUND (docs/TRAPS.md 66) ──
 * A fresh character has an EMPTY tattoo store.  A probe that opens the Skin tab
 * and diffs the card against a reference finds nothing and truthfully reports
 * no bug -- it never got the control into the state the bug lives in.  So
 * section 5 guards on "the card says Nothing here yet" BEFORE it draws, and on
 * the store actually having ink AFTER, and only then asks whether the picture
 * moved.
 *
 * ── AND docs/TRAPS.md 65 ──
 * .bt-cc-stage carries `transform:translateX(7%) scale(2)`, so its
 * getBoundingClientRect is DOUBLE its layout box.  Section 3 measures
 * offsetHeight -- the question is "did the layout move", not "what does the
 * player see" -- and asserts the 2x relationship as its own guard, so a future
 * reader can see which ruler is which.
 *
 * ── ONE THING THIS FILE HONESTLY CANNOT PROVE (section 7) ──
 * The `.bt-paint` touch-action fix is a fix for iOS Safari.  Chromium's
 * ancestor walk for a pan stops at the scroll container that would perform it,
 * so a headless drag scrolls that panel with or without the declaration.  The
 * assertions there pin the arithmetic that makes the fix matter (the panel
 * overflows and Done is below the fold at 390x664) plus the declaration itself,
 * and say so out loud rather than dressing a stylesheet read up as a behaviour
 * test.
 */
import * as H from './harness.mjs';

const SIZES = [{ w: 390, h: 844 }, { w: 390, h: 664 }];
/* Which canvases the tattoo target spans -- the card's empty state reads all
   five, so the test has to as well (playerArt.js CANVASES). */
const TAT_KEYS = { tattoo: 'bt-tattooart', tattooBack: 'bt-tattooart-back',
  tattooFace: 'bt-facetattoo', tattooArm: 'bt-armtattoo', tattooHeadBack: 'bt-headbackart' };

const openCreator = async (P) => {
  await P.page.waitForSelector('[data-tut="login-create"]', { timeout: 30000 });
  await P.page.click('[data-tut="login-create"]');
  await P.page.waitForSelector('input.bt-cc-name', { timeout: 30000 });
  await P.page.waitForTimeout(2400);
};

const pickTab = (P, label) => P.page.evaluate((l) => {
  const b = [...document.querySelectorAll('.bt-cc-tabs .bt-cc-tab')]
    .find((x) => (x.textContent || '').trim() === l);
  if (b) { b.click(); return true; }
  return false;
}, label);

/* Every number section 2 turns on, read from the browser in one pass. */
const layout = (P) => P.page.evaluate(() => {
  const R = (sel) => { const e = document.querySelector(sel); if (!e) return null;
    const b = e.getBoundingClientRect();
    return { y: +b.y.toFixed(1), h: +b.height.toFixed(1), w: +b.width.toFixed(1),
      bottom: +b.bottom.toFixed(1), offH: e.offsetHeight,
      hidden: Math.max(0, e.scrollHeight - e.clientHeight) }; };
  const panel = document.querySelector('.bt-cc-panel');
  const card = document.querySelector('.bt-cc-ink');
  const strip = document.querySelector('.bt-cc-strip');
  const pb = panel && panel.getBoundingClientRect();
  const cb = card && card.getBoundingClientRect();
  const sb = strip && strip.getBoundingClientRect();
  const padB = panel ? parseFloat(getComputedStyle(panel).paddingBottom) : 0;
  return {
    panel: R('.bt-cc-panel'), strip: R('.bt-cc-strip'), card: R('.bt-cc-ink'),
    pane: R('.bt-cc-ink-pane'), tools: R('.bt-cc-ink-tools'),
    chips: document.querySelectorAll('.bt-cc-ink-chip').length,
    widths: document.querySelectorAll('.bt-cc-ink-width').length,
    pats: document.querySelectorAll('.bt-cc-ink-pats > button').length,
    eraser: document.querySelectorAll('.bt-cc-ink-chip--erase').length,
    badge: document.querySelectorAll('.bt-cc-ink-badge').length,
    /* the tools have to be BENEATH the picture -- that is the owner's word */
    toolsBelowPane: (() => {
      const pv = document.querySelector('.bt-cc-ink-pane');
      const tl = document.querySelector('.bt-cc-ink-tools');
      if (!pv || !tl) return null;
      return tl.getBoundingClientRect().top >= pv.getBoundingClientRect().bottom - 1;
    })(),
    /* a button inside a button is markup the browser un-nests unpredictably */
    nestedButtons: document.querySelectorAll('button button').length,
    tiles: document.querySelectorAll('.bt-cc-strip > *').length,
    /* the two halves of the dead height the old button sat between */
    gapAbove: (cb && sb) ? +(cb.top - sb.bottom).toFixed(1) : null,
    freeBelow: (cb && pb) ? +(pb.bottom - padB - cb.bottom).toFixed(1) : null,
    emptyChip: !!document.querySelector('.bt-cc-ink-empty'),
    /* the retired button must be GONE, not merely re-dressed */
    legacyButtons: document.querySelectorAll('.bt-cc-draw').length,
    cardIsButton: (() => { const b = document.querySelector('.bt-cc-ink-pane');
      return b ? b.tagName.toLowerCase() : null; })(),
    cardName: (() => { const b = document.querySelector('.bt-cc-ink-pane');
      return b ? b.getAttribute('aria-label') : null; })(),
    /* TRAPS 65: layout vs painted, on the element that differs by 2x */
    stageOffH: (() => { const e = document.querySelector('.bt-cc-stage'); return e ? e.offsetHeight : null; })(),
    stageRectH: (() => { const e = document.querySelector('.bt-cc-stage');
      return e ? +e.getBoundingClientRect().height.toFixed(1) : null; })(),
  };
});

/* A cheap fingerprint of the card's own canvas, for "did the picture move". */
const cardHash = (P) => P.page.evaluate(() => {
  const c = document.querySelector('canvas.bt-cc-ink-pv');
  if (!c || !c.width) return null;
  try {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let h = 0, ink = 0, l = c.width, r = -1, t = c.height, b = -1;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        h = (h * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) >>> 0;
        if (d[i + 3] <= 40) continue;
        ink++;
        if (x < l) l = x; if (x > r) r = x;
        if (y < t) t = y; if (y > b) b = y;
      }
    }
    /* The figure is drawn onto a TRANSPARENT canvas over the pane's CSS
       gradient, so an alpha bbox is the silhouette exactly -- no colour
       threshold to tune.  The margins are what section 2b turns on. */
    return { h, ink, w: c.width, y: c.height,
      leftMargin: l, rightMargin: c.width - 1 - r, top: t, bottom: b };
  } catch (e) { return { err: String(e).slice(0, 80) }; }
});

export async function run({ browser, wsPort, webPort, rec }) {
  for (const S of SIZES) {
    const tag = `${S.w}x${S.h}`;
    const P = await H.newPlayer(browser, { name: 'Inky', wsPort, webPort,
      viewport: { width: S.w, height: S.h }, touch: true });
    await openCreator(P);

    /* ════ 1. THE DOOR ════ */
    rec.ok(`${tag}: the Skin tab opened (guard)`, await pickTab(P, 'Skin'), null);
    await P.page.waitForTimeout(1400);
    const L = await layout(P);

    rec.ok(`${tag}: the old Design button is gone, not merely restyled -- the `
      + `card REPLACES it (${L.legacyButtons} .bt-cc-draw left)`,
      L.legacyButtons === 0, L);
    rec.ok(`${tag}: the ink card is on screen (guard: ${L.card && L.card.w}x${L.card && L.card.h})`,
      !!L.card && L.card.w > 100 && L.card.h > 60, L);
    if (!L.card) { await P.ctx.close().catch(() => {}); continue; }
    /* It has to BE a control, not a picture with a handler bolted on: a <button>
       is what gives it the keyboard, the focus ring and the announcement. */
    /* v2.3.2400: the CARD is a container and the PICTURE is the button -- the
       card holds the palette's buttons now, and nesting them would be invalid
       markup.  Both halves are asserted. */
    rec.ok(`${tag}: the picture is a real <button> with an accessible name `
      + `("${L.cardName}"), so it is reachable by keyboard and announced as one control`,
      L.cardIsButton === 'button' && !!L.cardName && L.cardName.length > 4, L);
    rec.ok(`${tag}: ...and no control on the page is a button inside a button`,
      L.nestedButtons === 0, L);

    /* ════ 2. IT FILLS THE DEAD HEIGHT INSTEAD OF FLOATING IN IT ════
       The measured "before" on this tab: 122.5px above the button (the ghosted
       colour block) and 147.6px below it at 390x844, 100.5 and 2.0 at 390x664.
       Both halves are asserted, because a change that closed one and opened the
       other would have moved the problem rather than fixed it. */
    rec.ok(`${tag}: the card sits hard under the swatch grid rather than a `
      + `hand's width below it (${L.gapAbove}px; the button had 122.5px of `
      + `ghosted colour block above it at 390x844)`,
      L.gapAbove !== null && L.gapAbove <= 20, L);
    rec.ok(`${tag}: ...and it reaches down the panel rather than leaving a `
      + `second empty band under it (${L.freeBelow}px left; the button left 147.6px at 390x844)`,
      L.freeBelow !== null && L.freeBelow <= 70, L);
    const dead = (L.gapAbove || 0) + (L.freeBelow || 0);
    /* The number the owner's complaint is really about, stated once: at 390x844
       the button was marooned in 270.1px of nothing. */
    rec.ok(`${tag}: so the dead height around the way-in is ${Math.round(dead)}px, `
      + `down from 270.1 at 390x844 / 102.5 at 390x664`,
      dead <= 90, { dead, gapAbove: L.gapAbove, freeBelow: L.freeBelow });
    /* ── THE OWNER'S SECOND ASK, AS THREE NUMBERS (v2.3.2400) ──
       "Instead of using space for 'tattoo your body or face' I'd rather you
       just have the tools for tattooing right there beneath the character."
       So: there IS a tool block, it is BELOW the picture, and the picture is
       still a picture -- the failure mode of giving the tools their room is a
       card that is all palette over a five-pixel body.  60px is the CSS floor
       on .bt-cc-ink-pane; 56 catches the floor being removed without
       re-failing on sub-pixel rounding. */
    rec.ok(`${tag}: there is a tool block on the card at all `
      + `(${L.tools && L.tools.h}px)`, !!L.tools && L.tools.h > 30, L);
    rec.ok(`${tag}: ...and it is BENEATH the picture, not above it or beside it`,
      L.toolsBelowPane === true, L);
    rec.ok(`${tag}: ...and the picture is still a picture of somebody `
      + `(${L.pane && L.pane.h}px of body)`, !!L.pane && L.pane.h >= 56, L);

    /* ════ 2b. THE WHOLE FRAME IS IN SHOT, NOT A CROP OF IT ════
       Every window in PlayerPaint's FOCUS table was measured against
       .bt-paint-pv, which is aspect-ratio:1/1.  The card is 170x214 here and
       170x99 at 390x664 -- never square -- and the panel's own blit pins the
       window's HEIGHT and derives its width from the box, which in a portrait
       box means 0.79x the intended width.  On the tattoo frame that slices the
       ARMS off both sides, and the arms are part of the canvas you are being
       invited to draw on.
       The tell is a silhouette that touches both edges of its own canvas: with
       the frame intact there is ground either side of him.  This is the
       assertion that goes red if `fit: 'contain'` is ever dropped. */
    const shot = await cardHash(P);
    rec.ok(`${tag}: the card actually painted a figure (guard: ${shot && shot.ink} opaque px)`,
      !!shot && !shot.err && shot.ink > 400, shot);
    /* THE THRESHOLD IS A FRACTION, AND IT HAS TO BE THIS BIG.  The first cut
       asked for "> 3px" of margin and PASSED against the broken framing: a
       height-pinned window still leaves about 3.9% of the canvas clear either
       side, so 3px of 336 separated nothing.  Mutation-testing it is what found
       that -- dropping `fit:'contain'` left all 89 assertions green.
       Measured, contain gives 19% at 390x844 and 32% at 390x664; without it,
       3.9%.  10% sits clear of both. */
    const marginFrac = shot && shot.w
      ? Math.min(shot.leftMargin, shot.rightMargin) / shot.w : 0;
    rec.ok(`${tag}: ...and he is framed rather than cropped -- there is ground `
      + `either side of him (${Math.round(marginFrac * 100)}% of the canvas; a `
      + `height-pinned window leaves 3.9% and slices the arms off)`,
      marginFrac >= 0.10, { shot, marginFrac });

    /* ════ 2c. THE TOOLS ARE THE RIGHT TOOLS FOR THE TAB ════
       Skin can be drawn on, so it gets the ink palette and the brush widths.
       Shoes cannot (pattern-only, v2.3.1944), so a colour palette there would
       be a row of controls that do nothing -- it gets the pattern tiles, which
       section 6b checks. */
    rec.ok(`${tag}: the whole ink palette is under him, all sixteen of it `
      + `(${L.chips} chips)`, L.chips === 16, L);
    rec.ok(`${tag}: ...including the eraser, drawn as a hole rather than as a `
      + `colour, the way the editor draws it`, L.eraser === 1, L);
    rec.ok(`${tag}: ...and the three brush widths (${L.widths})`, L.widths === 3, L);
    /* The owner asked for this icon twice (v2.3.2008 painted it, v2.3.2035 grew
       it); the label bar it lived in is gone, so it must still be somewhere. */
    rec.ok(`${tag}: ...and the painted tattoo icon survived the label bar it `
      + `used to sit in`, L.badge === 1, L);

    /* ════ 3. THE CHARACTER DOES NOT MOVE (what the ghost row protected) ════ */
    const stages = await P.page.evaluate(async () => {
      const out = {};
      const tabs = [...document.querySelectorAll('.bt-cc-tabs .bt-cc-tab')]
        .map((b) => (b.textContent || '').trim());
      for (const t of tabs) {
        const b = [...document.querySelectorAll('.bt-cc-tabs .bt-cc-tab')]
          .find((x) => (x.textContent || '').trim() === t);
        if (b) b.click();
        await new Promise((r) => setTimeout(r, 320));
        const st = document.querySelector('.bt-cc-stage');
        out[t] = st ? st.offsetHeight : null;
      }
      return out;
    });
    const heights = Object.values(stages);
    rec.ok(`${tag}: all nine tabs were visited (guard: ${heights.length})`,
      heights.length === 9 && heights.every((h) => h > 0), stages);
    rec.ok(`${tag}: the character is EXACTLY the same size on every tab, with `
      + `the ghost row that used to reserve it retired (${heights[0]}px throughout)`,
      new Set(heights).size === 1, stages);
    /* docs/TRAPS.md 65, made visible: the two rulers disagree by 2x on this
       element, and a measurement that did not respond to the CSS would be the
       tell that the wrong one was picked. */
    rec.ok(`${tag}: ...measured as LAYOUT height -- the painted rect is 2x it `
      + `because the stage carries scale(2) (${L.stageOffH} vs ${L.stageRectH})`,
      Math.abs(L.stageRectH - L.stageOffH * 2) <= 2, L);

    /* ════ 4. THE OPTION STRIP DID NOT PAY FOR THE PICTURE ════
       The card takes the room the ghost band and the button were holding, not
       the catalogue's -- which is what `flex:1 1 0` on .bt-cc-ink is for.  Skin
       is the tab to prove it on: at 390x664 its strip used to hide 16px. */
    rec.ok(`${tag}: the Skin tab opened again (guard)`, await pickTab(P, 'Skin'), null);
    await P.page.waitForTimeout(900);
    const L2 = await layout(P);
    rec.ok(`${tag}: the whole skin catalogue is rendered (guard: ${L2.tiles} tiles)`,
      L2.tiles >= 12, L2);
    rec.ok(`${tag}: ...and none of it is hidden behind a scroll -- the card took `
      + `the dead band's room, not the catalogue's (${L2.strip && L2.strip.hidden}px hidden; `
      + `it was 16px at 390x664 before the card)`,
      !!L2.strip && L2.strip.hidden <= 2, L2);

    /* Hats is the longest catalogue in the game and the one that was starved:
       retiring the ghosted button on a tab with no drawing hands it back 62px. */
    rec.ok(`${tag}: the Hats tab opened (guard)`, await pickTab(P, 'Hats'), null);
    await P.page.waitForTimeout(900);
    const H1 = await layout(P);
    rec.ok(`${tag}: Hats really does overflow its strip (guard: ${H1.strip && H1.strip.hidden}px hidden)`,
      !!H1.strip && H1.strip.hidden > 50, H1);
    rec.ok(`${tag}: ...and Hats shows NO card at all, so a tab with nothing to `
      + `draw on spends none of its height reserving one`,
      H1.card === null, H1);
    /* The number: 427.1 -> 496.1 at 390x844, 265.1 -> 334.1 at 390x664. */
    rec.ok(`${tag}: ...which gives its strip 60px+ more catalogue than the `
      + `ghosted button left it (${H1.strip && H1.strip.h}px of strip)`,
      !!H1.strip && H1.strip.h >= (S.h === 844 ? 490 : 328), H1);

    /* ════ 6. THE CARD IS ON EVERY TAB THAT HAS A DRAWING, AND NO OTHER ════
       _PAINT_FROM_TAB has FOUR targets, not one: shirt, pants, skin (tattoo)
       and shoes.  A card built for the tattoo alone would silently delete the
       other three editors, which have no other door. */
    const perTab = await P.page.evaluate(async () => {
      const out = {};
      const names = [...document.querySelectorAll('.bt-cc-tabs .bt-cc-tab')]
        .map((b) => (b.textContent || '').trim());
      for (const t of names) {
        const b = [...document.querySelectorAll('.bt-cc-tabs .bt-cc-tab')]
          .find((x) => (x.textContent || '').trim() === t);
        if (b) b.click();
        await new Promise((r) => setTimeout(r, 340));
        const c = document.querySelector('.bt-cc-ink');
        out[t] = c ? (c.getAttribute('aria-label') || 'card') : null;
      }
      return out;
    });
    /* Shirt is deliberately absent here: with no shirt on there is nothing to
       print on, which is v2.3.1938's rule and is unchanged. */
    for (const t of ['Skin', 'Pants', 'Shoes']) {
      rec.ok(`${tag}: ${t} offers the card, so its editor still has a door `
        + `("${perTab[t]}")`, !!perTab[t], perTab);
    }
    for (const t of ['Hair', 'Hats', 'Eyes', 'Beard']) {
      rec.ok(`${tag}: ${t} has no card -- nothing on that tab can be drawn on`,
        perTab[t] === null, perTab);
    }
    rec.ok(`${tag}: Shirt with no shirt on has no card either -- a print with `
      + `nothing to print on is a dead control (v2.3.1938)`,
      perTab.Shirt === null, perTab);
    /* ...and putting a shirt ON brings it back.  Without this the assertion
       above is satisfied by a card that never appears on Shirt at all. */
    rec.ok(`${tag}: the Shirt tab opened (guard)`, await pickTab(P, 'Shirt'), null);
    await P.page.waitForTimeout(700);
    const wore = await P.page.evaluate(async () => {
      const tiles = [...document.querySelectorAll('.bt-cc-strip > *')];
      const t = tiles.find((x) => (x.getAttribute('title') || '').toLowerCase() !== 'none');
      if (!t) return false;
      (t.querySelector('button') || t).click();
      await new Promise((r) => setTimeout(r, 900));
      return true;
    });
    rec.ok(`${tag}: a shirt could be put on (guard)`, wore === true, { wore });
    await P.page.waitForTimeout(700);
    const SH = await layout(P);
    rec.ok(`${tag}: ...and with a shirt on, the card is there to design it `
      + `("${SH.cardName}")`, !!SH.card, SH);
    /* Shirt's colour block is REAL, so the card must not have eaten it. */
    const shirtColours = await P.page.evaluate(() => {
      const blk = document.querySelector('.bt-cc-colors');
      return { swatches: document.querySelectorAll('.bt-cc-colors-row > *').length,
        ghost: !!blk && blk.className.includes('bt-cc-ghost'),
        yielded: !!blk && blk.className.includes('bt-cc-colors--yield'),
        h: blk ? +blk.getBoundingClientRect().height.toFixed(1) : null };
    });
    rec.ok(`${tag}: ...without taking the shirt's twelve colour swatches with it `
      + `(${shirtColours.swatches} swatches in a ${shirtColours.h}px block)`,
      shirtColours.swatches > 6 && !shirtColours.ghost && !shirtColours.yielded
        && shirtColours.h > 100, shirtColours);

    /* ════ 6b. SHOES GET THE TOOLS SHOES HAVE ════
       Pattern-only (v2.3.1944): there is nothing to draw on an eight-pixel
       boot, so an ink palette there would be sixteen controls that do nothing.
       The tiles are patternsFor('shoes') -- the four that still read at that
       size -- plus a "plain" one to take it off again. */
    rec.ok(`${tag}: the Shoes tab opened (guard)`, await pickTab(P, 'Shoes'), null);
    await P.page.waitForTimeout(1100);
    const SO = await layout(P);
    rec.ok(`${tag}: Shoes has a card (guard)`, !!SO.card, SO);
    rec.ok(`${tag}: ...whose tools are PATTERN TILES, not an ink palette -- `
      + `there is nothing to draw on a boot (${SO.pats} tiles, ${SO.chips} chips)`,
      SO.pats === 5 && SO.chips === 0, SO);

    await P.ctx.close().catch(() => {});
  }

  /* ════ 5. THE PICTURE IS HIS, AND IT IS LIVE ════
     One viewport is enough for this: it is about wiring, not geometry.  390x844
     so the card is at its full 260px and a 16x16 stroke is several card pixels. */
  const P = await H.newPlayer(browser, { name: 'Inky2', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  await openCreator(P);
  rec.ok('liveness: the Skin tab opened (guard)', await pickTab(P, 'Skin'), null);
  await P.page.waitForTimeout(1600);

  /* THE GUARD THAT MAKES THE REST NON-VACUOUS (docs/TRAPS.md 66): a fresh
     character has no ink anywhere, and the card says so.  If this is ever
     false, every "the picture changed" assertion below is measuring a
     character who was already tattooed. */
  const arts0 = await P.page.evaluate((keys) => {
    const o = {}; for (const k of Object.keys(keys)) { try { o[k] = localStorage.getItem(keys[k]) || ''; } catch (e) { o[k] = ''; } } return o;
  }, TAT_KEYS);
  const inkedCells = (a) => (a ? [...a].filter((c) => c !== '0').length : 0);
  const total0 = Object.values(arts0).reduce((n, a) => n + inkedCells(a), 0);
  rec.ok(`liveness: this character starts with no tattoo at all (guard: ${total0} inked cells)`,
    total0 === 0, arts0);
  const L0 = await layout(P);
  rec.ok('liveness: ...so the card says "Nothing here yet" rather than showing '
    + 'a bare chest and letting it read as a photograph', L0.emptyChip === true, L0);

  const before = await cardHash(P);
  rec.ok(`liveness: the card canvas has pixels to compare (guard: ${before && before.ink} opaque)`,
    !!before && !before.err && before.ink > 500, before);

  /* Change the SKIN TONE.  The cheapest proof that the picture is of THIS
     player and not a stock body: nothing about the tattoo changes here. */
  await P.page.evaluate(async () => {
    const tiles = [...document.querySelectorAll('.bt-cc-strip > *')];
    const t = tiles[tiles.length - 1];
    if (t) (t.querySelector('button') || t).click();
    await new Promise((r) => setTimeout(r, 1400));
  });
  await P.page.waitForTimeout(1200);
  const afterSkin = await cardHash(P);
  rec.ok('liveness: picking a different skin tone repaints the card -- the body '
    + 'in it is HIS, not a stock figure',
    !!afterSkin && !!before && afterSkin.h !== before.h, { before, afterSkin });

  /* ═══ THE TOOLS UNDER HIM ARE THE EDITOR'S TOOLS (v2.3.2400) ═══
     This is the assertion the whole shared store exists for, and it is written
     end-to-end on purpose.  Checking that the inline chip LOOKS selected, or
     that the editor's matching swatch has a ring, would both pass against two
     pickers that merely agree about highlighting.  So: tap a colour under the
     character, let it open the editor, draw with whatever the editor is armed
     with, and read the CELL BACK OUT OF THE STORE.  playerArt encodes each cell
     as one hex character of the palette index, so colour 5 lands as '5' and
     nothing else can produce that.
     Index 5 (#f2c94c) rather than 1: 1 is the default, so a store that was
     never written would pass. */
  const TEST_INK = 5;
  const tapped = await P.page.evaluate((i) => {
    const chips = [...document.querySelectorAll('.bt-cc-ink-chip')];
    if (chips.length <= i) return false;
    chips[i].click();
    return true;
  }, TEST_INK);
  rec.ok(`liveness: colour ${TEST_INK} could be tapped under the character (guard)`,
    tapped === true, { tapped });
  const editor = await P.page.waitForSelector('.bt-bodyink-cv', { timeout: 20000 })
    .then(() => true).catch(() => false);
  rec.ok('liveness: tapping a TOOL under the character opens the editor -- the '
    + 'tools are the way in, not a decoration beside one', editor, { editor });
  if (editor) {
    await P.page.waitForTimeout(2000);
    const aim = await P.page.evaluate(() => {
      const c = document.querySelector('.bt-bodyink-cv');
      const a = c && c.__btInkAim && c.__btInkAim.tattoo;
      return a ? { w: c.width, h: c.height, x: a.x, y: a.y } : null;
    });
    rec.ok('liveness: the editor reports where the torso is (guard)', !!aim, aim);
    if (aim) {
      const box = await (await P.page.$('.bt-bodyink-cv')).boundingBox();
      /* Several taps, spread across the torso, so the change is bigger than one
         card pixel and cannot be lost to rounding in the downscale. */
      for (const [dx, dy] of [[0, 0], [12, 0], [-12, 0], [0, 14], [0, -14]]) {
        const px = box.x + ((aim.x + dx) / aim.w) * box.width;
        const py = box.y + ((aim.y + dy) / aim.h) * box.height;
        await P.page.mouse.move(px, py);
        await P.page.mouse.down();
        await P.page.mouse.move(px + 1, py + 1);
        await P.page.mouse.up();
        await P.page.waitForTimeout(320);
      }
      const arts1 = await P.page.evaluate((keys) => {
        const o = {}; for (const k of Object.keys(keys)) { try { o[k] = localStorage.getItem(keys[k]) || ''; } catch (e) { o[k] = ''; } } return o;
      }, TAT_KEYS);
      const total1 = Object.values(arts1).reduce((n, a) => n + inkedCells(a), 0);
      rec.ok(`liveness: the strokes really landed in the store (guard: ${total1} inked cells)`,
        total1 > 0, arts1);
      /* AND THEY LANDED IN THE COLOUR THAT WAS PICKED UNDER THE CHARACTER. */
      const chars = new Set(Object.values(arts1).join('').split('').filter((c) => c !== '0'));
      rec.ok(`liveness: ...in colour ${TEST_INK} -- the chip under the character `
        + `armed the editor, so the inline palette and the editor's palette are `
        + `one picker (cells written: ${[...chars].join('')})`,
        chars.has(String(TEST_INK)) && chars.size === 1, { chars: [...chars], arts1 });

      /* Close the editor the way a player does. */
      await P.page.evaluate(() => {
        const b = [...document.querySelectorAll('.bt-paint button')]
          .find((x) => (x.textContent || '').trim() === 'Done');
        if (b) b.click();
      });
      await P.page.waitForTimeout(2200);
      const L1 = await layout(P);
      const after = await cardHash(P);
      rec.ok('liveness: back in the creator, the card has DROPPED its '
        + '"Nothing here yet" chip -- it read the store, it did not just render once',
        L1.emptyChip === false, L1);
      rec.ok('liveness: ...and the picture itself changed, so the card is '
        + 'showing the tattoo that was just drawn rather than a stale composite',
        !!after && !!afterSkin && after.h !== afterSkin.h, { afterSkin, after });
    }
  }

  /* ════ 7. THE PAINT PANEL CAN BE PANNED (v2.3.2399) ════
     Stated honestly: the failure is an iOS Safari one and Chromium cannot
     reproduce it.  What IS provable here is that the condition exists -- the
     panel overflows on a 664-tall phone and Done is below its fold -- and that
     the panel now carries an explicit vertical-pan permission instead of
     inheriting the initial value, which is what .bt-name-modal's touch-action:
     none policy (game.css, v2.3.738: "the rail and sheet re-allow pan-y;
     everything else is taps") requires of every scroller inside it. */
  await P.ctx.close().catch(() => {});
  const Q = await H.newPlayer(browser, { name: 'Panner', wsPort, webPort,
    viewport: { width: 390, height: 664 }, touch: true });
  await openCreator(Q);
  rec.ok('paint panel: the Skin tab opened (guard)', await pickTab(Q, 'Skin'), null);
  await Q.page.waitForTimeout(1200);
  await Q.page.click('button.bt-cc-ink-pane');
  const up = await Q.page.waitForSelector('.bt-paint', { timeout: 20000 })
    .then(() => true).catch(() => false);
  rec.ok('paint panel: the editor opened (guard)', up, { up });
  if (up) {
    await Q.page.waitForTimeout(2000);
    const pan = await Q.page.evaluate(() => {
      const p = document.querySelector('.bt-paint');
      const r = p.getBoundingClientRect();
      const done = [...p.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Done');
      const db = done && done.getBoundingClientRect();
      const cs = getComputedStyle(p);
      const strip = document.querySelector('.bt-cc-strip');
      return {
        overflow: p.scrollHeight - p.clientHeight,
        doneBottom: db ? +db.bottom.toFixed(1) : null,
        panelBottom: +r.bottom.toFixed(1),
        doneBelowFold: !!db && db.bottom > r.bottom + 0.5,
        touchAction: cs.touchAction, overscroll: cs.overscrollBehaviorY,
        /* the two siblings this panel is being brought into line with */
        stripTouchAction: strip ? getComputedStyle(strip).touchAction : null,
      };
    });
    rec.ok(`paint panel: at 390x664 it really does overflow (guard: ${pan.overflow}px)`,
      pan.overflow > 20, pan);
    rec.ok(`paint panel: ...with DONE below the fold (${pan.doneBottom} against a `
      + `panel bottom of ${pan.panelBottom}) -- so a finger that cannot pan this `
      + `box cannot finish a tattoo`, pan.doneBelowFold === true, pan);
    rec.ok(`paint panel: ...so it re-allows vertical panning explicitly, the way `
      + `.bt-cc-strip does inside the same touch-action:none modal `
      + `(panel "${pan.touchAction}", strip "${pan.stripTouchAction}")`,
      /pan-y/.test(pan.touchAction), pan);
    rec.ok(`paint panel: ...and does not chain a drag past its own ends into the `
      + `creator behind it (overscroll-behavior "${pan.overscroll}")`,
      pan.overscroll === 'contain', pan);
    /* ── THE CONTROL THAT WAS ACTUALLY LOST IN HERE (v2.3.2399) ──
       .bt-paint-sideswitch carried no grid-area, and .bt-paint is a GRID, so it
       auto-placed into an implicit row after every named one: measured
       offsetTop 708 in a 738px content box, below the tool rows, below the
       palette, below DONE and off the panel's fold.  The owner asked for that
       switch by name ("I don't see a menu option that toggles tattooing the
       back"), so a switch you can only reach by discovering the panel scrolls
       is the same failure as the Design button nobody noticed.
       Asserted against DONE rather than against a pixel row: "above the last
       button in the panel" is the property, and it survives the panel being
       re-laid out again. */
    const swap = await Q.page.evaluate(() => {
      const p = document.querySelector('.bt-paint');
      const sw = document.querySelector('.bt-paint-sideswitch');
      const done = [...p.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Done');
      if (!sw || !done) return null;
      const s2 = sw.getBoundingClientRect(), d = done.getBoundingClientRect();
      const pr = p.getBoundingClientRect();
      const tabs = document.querySelector('.bt-paint-tabs');
      const t = tabs && tabs.getBoundingClientRect();
      return { swTop: +s2.top.toFixed(1), swBottom: +s2.bottom.toFixed(1),
        swOffsetTop: sw.offsetTop, doneTop: +d.top.toFixed(1),
        panelTop: +pr.top.toFixed(1), panelBottom: +pr.bottom.toFixed(1),
        tabsBottom: t ? +t.bottom.toFixed(1) : null,
        gridArea: getComputedStyle(sw).gridArea,
        insideFold: s2.bottom <= pr.bottom + 0.5 && s2.top >= pr.top - 0.5 };
    });
    rec.ok('front/back switch: it is on the tattoo screen at all (guard)', !!swap, swap);
    if (swap) {
      rec.ok(`paint panel: the front/back switch sits UNDER THE TABS, where its `
        + `own comment has claimed since v2.3.2150 (offsetTop ${swap.swOffsetTop}; `
        + `it was 708, in an implicit grid row below everything)`,
        swap.tabsBottom !== null && swap.swTop >= swap.tabsBottom - 1
          && swap.swTop < swap.tabsBottom + 40, swap);
      rec.ok(`paint panel: ...above the Done button rather than below it `
        + `(${swap.swBottom} vs ${swap.doneTop})`, swap.swBottom < swap.doneTop, swap);
      rec.ok(`paint panel: ...and inside the panel's own fold, so it needs no `
        + `pan to reach -- which is the whole point of a control the owner `
        + `asked for by name`, swap.insideFold === true, swap);
    }

    /* The one behavioural half Chromium CAN answer: a real touch drag on a
       non-canvas part of the panel moves it.  This goes red if anyone ever
       writes touch-action:none here, which is the other way to get this
       wrong. */
    const cdp = await Q.page.context().newCDPSession(Q.page);
    const at = await Q.page.evaluate(() => {
      const p = document.querySelector('.bt-paint');
      const ctl = p.querySelector('.bt-paint-ctl') || p;
      const b = ctl.getBoundingClientRect();
      return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + 10) };
    });
    const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent',
      { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    await send('touchStart', at.x, at.y);
    for (let i = 1; i <= 12; i++) await send('touchMove', at.x, at.y - i * 10);
    await send('touchEnd', at.x, at.y - 120);
    await Q.page.waitForTimeout(700);
    const moved = await Q.page.evaluate(() => document.querySelector('.bt-paint').scrollTop);
    rec.ok(`paint panel: a real touch drag scrolls it (${moved}px) -- Chromium `
      + `would do this without the declaration too, so this pins the wrong `
      + `direction (touch-action:none) rather than proving the iOS fix`,
      moved > 20, { moved, overflow: pan.overflow });
    await cdp.detach().catch(() => {});
  }
  await Q.page.screenshot({ path: `${H.REPO}/tools/qa/mp/out/ccink.png` }).catch(() => {});
  await Q.ctx.close().catch(() => {});

  /* ════ 8. LANDSCAPE: THE PANEL NOW FITS AT ALL ════
     iPhone held sideways is 844x390 and is a primary case, not an afterthought
     (.bt-paint has a whole three-column re-flow for it).  The stray implicit
     grid row the front/back switch was auto-placed into WAS the entire
     landscape overflow -- 24px of a 396px content box -- so putting the switch
     where its comment always said it went closes it completely.  Asserted as
     "nothing is below the fold" rather than as a pixel count, because that is
     the property a player feels. */
  const R = await H.newPlayer(browser, { name: 'Sideways', wsPort, webPort,
    viewport: { width: 844, height: 390 }, touch: true });
  await openCreator(R);
  rec.ok('landscape: the Skin tab opened (guard)', await pickTab(R, 'Skin'), null);
  await R.page.waitForTimeout(1200);
  await R.page.click('button.bt-cc-ink-pane');
  const land = await R.page.waitForSelector('.bt-paint', { timeout: 20000 })
    .then(() => true).catch(() => false);
  rec.ok('landscape: the editor opened (guard)', land, { land });
  if (land) {
    await R.page.waitForTimeout(2200);
    const M = await R.page.evaluate(() => {
      const p = document.querySelector('.bt-paint');
      const pr = p.getBoundingClientRect();
      const below = [...p.querySelectorAll('button')]
        .filter((b) => b.getBoundingClientRect().bottom > pr.bottom + 0.5)
        .map((b) => (b.textContent || b.className || '?').trim().slice(0, 24));
      return { overflow: p.scrollHeight - p.clientHeight, below,
        buttons: p.querySelectorAll('button').length,
        cols: getComputedStyle(p).gridTemplateColumns };
    });
    rec.ok(`landscape: the panel has its controls to place (guard: ${M.buttons} buttons `
      + `across ${M.cols})`, M.buttons > 20, M);
    rec.ok(`landscape: nothing in the editor is below the fold any more `
      + `(${M.overflow}px of overflow; it was 24px, all of it the misplaced `
      + `front/back switch)`, M.overflow === 0 && M.below.length === 0, M);
  }
  await R.ctx.close().catch(() => {});
}
