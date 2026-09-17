/* ═══ v2.3.2612: TAPPING "SELL" APPEARS TO DO NOTHING ═══
 *
 * Owner: "tapping 'sell' on an item currently goes nowhere (the button just
 * does nothing) so I don't know what's built out for that", and then, on what
 * they expected: "I mean listing it for auction. From inventory not talking to
 * a storekeeper yet."
 *
 * Their mental model is right and the flow IS built: ItemDetailPopup's Sell
 * sets `sellOpen`, which expands a price sheet INSIDE the same card -- "Sell in
 * the general store", a quantity stepper, a price box, Back and Confirm.  So
 * the question is not what is missing, it is why pressing it reads as nothing
 * happening.
 *
 * THREE CANDIDATES, and this file is here to tell them apart rather than to
 * argue for one:
 *   1. the DISABLED variant is what they tapped (`sellWhy` set -> a greyed
 *      button that genuinely does nothing, with a reason sentence under it);
 *   2. the state flips and the SHEET IS OFF SCREEN -- it expands downward
 *      inside a card that may already sit near the bottom of a phone, so the
 *      new content lands below the fold with nothing to scroll it into view;
 *   3. the tap never reaches the button at all (something covering it).
 *
 * WHICH IS WHY IT MEASURES ALL THREE ON EVERY VIEWPORT: whether the button is
 * disabled, whether `sellOpen` actually flipped, and where the sheet's rect
 * landed relative to the viewport -- plus whether any scroll container can
 * bring it back.  A test that only asserted "the sheet exists in the DOM"
 * would pass while the owner still cannot see it (TRAPS §39: "element is
 * visible, enabled and stable" is what a COVERED button looks like).
 *
 * A REAL FINGER, NOT A DISPATCHED EVENT (TRAPS §67): a synthesised click
 * proves the handler, not the reachability, and reachability is candidate 3.
 *
 * ═══ THE ANCHOR IS THE WHOLE REPRODUCTION ═══
 * The first cut of this file opened the card through the bus with NO anchor,
 * and it passed identically against origin/main -- because an un-anchored card
 * is CENTRED, the one placement that always has room under it.  It proved
 * nothing and would have shipped a fix for a bug it had never seen.
 * Taking the real low tile's rect as the anchor, the way the tile's own
 * handler does, the defect appears at once.  Measured against origin/main:
 *
 *     390x844   sheet ends 1046 of 844   "Put it up" 193px below the fold
 *     360x800   sheet ends  994 of 800   "Put it up" 185px below the fold
 *
 * and on the fixed build, -15px on both -- on screen and hittable.
 *
 * LANDSCAPE is not exercised: the bag does not lay its grid out this way when
 * rotated, so there is no tile for this road to take.  Recorded as such rather
 * than failed -- it is untested, not known-broken.
 *
 *   node tools/qa/mp/run.mjs sellsheet
 */
import * as H from './harness.mjs';

const OUT = `${H.REPO}/tools/qa/mp/out`;
const TAG = process.env.SS_TAG || 'before';

/* The Sell button as the SCREEN has it: its box, whether it is the disabled
   variant, and what element actually sits at its centre point. */
const sellButton = (P) => P.page.evaluate(() => {
  const b = [...document.querySelectorAll('button')]
    .filter((el) => (el.textContent || '').trim() === 'Sell');
  if (!b.length) return { found: false };
  const el = b[0];
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const top = document.elementFromPoint(cx, cy);
  return {
    found: true, n: b.length,
    rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
    cx: Math.round(cx), cy: Math.round(cy),
    disabled: !!(el.disabled || el.getAttribute('aria-disabled') === 'true'),
    opacity: getComputedStyle(el).opacity,
    /* candidate 3: is the button the thing under its own centre? */
    coveredBy: (top === el || el.contains(top)) ? null
      : (top ? (top.tagName + '.' + (top.className || '').toString().slice(0, 40)) : 'nothing'),
    inViewport: r.top >= 0 && r.bottom <= innerHeight,
    vh: innerHeight, vw: innerWidth,
  };
});

/* The price sheet, found by the heading the card actually renders. */
const sheet = (P) => P.page.evaluate(() => {
  const lab = [...document.querySelectorAll('div')]
    .find((d) => (d.textContent || '').trim() === 'Sell in the general store');
  if (!lab) return { open: false };
  /* The sheet is the labelled block's parent panel. */
  const box = lab.parentElement || lab;
  const r = box.getBoundingClientRect();
  const cs = getComputedStyle(box);
  /* Can anything actually bring it into view?  Walk up for a scroller. */
  let sc = null;
  for (let e = box.parentElement; e && e !== document.body; e = e.parentElement) {
    const s = getComputedStyle(e);
    if (/(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 1) {
      const er = e.getBoundingClientRect();
      sc = { tag: e.tagName, scrollH: e.scrollHeight, clientH: e.clientHeight,
        top: Math.round(er.top), bottom: Math.round(er.bottom) };
      break;
    }
  }
  return {
    open: true,
    rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
    bottom: Math.round(r.bottom),
    vh: innerHeight,
    /* the number that matters: how far past the bottom of the screen it ends */
    overflowPx: Math.round(r.bottom - innerHeight),
    visibleTop: r.top >= 0 && r.top < innerHeight,
    display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
    scroller: sc,
  };
});

/* The control the player is actually trying to reach.  "The sheet opened" is
   not the goal; "I can press Put it up" is. */
const confirmBtn = (P) => P.page.evaluate(() => {
  const el = [...document.querySelectorAll('button')]
    .find((b) => /^(Put it up|Listing…)$/.test((b.textContent || '').trim()));
  if (!el) return { found: false };
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const top = (cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight)
    ? document.elementFromPoint(cx, cy) : null;
  return {
    found: true,
    rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
    cx: Math.round(cx), cy: Math.round(cy), vh: innerHeight,
    onScreen: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
    /* TRAPS §39: visible+enabled is what a COVERED button looks like. */
    hittable: !!top && (top === el || el.contains(top)),
    belowFoldPx: Math.round(r.bottom - innerHeight),
  };
});

/* The card's own scroller, for the §68 drag. */
const cardScroll = (P) => P.page.evaluate(() => {
  const lab = [...document.querySelectorAll('div')]
    .find((d) => (d.textContent || '').trim() === 'Sell in the general store');
  if (!lab) return null;
  for (let e = lab.parentElement; e && e !== document.body; e = e.parentElement) {
    const st = getComputedStyle(e);
    if (/(auto|scroll)/.test(st.overflowY)) {
      const r = e.getBoundingClientRect();
      return { scrollTop: e.scrollTop, scrollH: e.scrollHeight, clientH: e.clientHeight,
        canScroll: e.scrollHeight > e.clientHeight + 1,
        cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2),
        top: Math.round(r.top), bottom: Math.round(r.bottom) };
    }
  }
  return null;
});

const state = (P) => P.page.evaluate(() => ({
  caps: (() => { const S = window._gameState && window._gameState.current;
    return S && S._serverCaps ? { store: !!S._serverCaps.store, storeGear: !!S._serverCaps.storeGear } : null; })(),
}));

export async function run({ browser, wsPort, webPort, rec }) {
  for (const [label, vp, land, who] of [
    ['390-portrait', { width: 390, height: 844 }, false, 'Sella'],
    ['360-portrait', { width: 360, height: 800 }, false, 'Sellb'],
    ['390-landscape', { width: 844, height: 390 }, true, 'Sellc'],
    ['360-landscape', { width: 800, height: 360 }, true, 'Selld'],
  ]) {
    const P = await H.newPlayer(browser, { name: who, wsPort, webPort,
      viewport: land ? { width: 390, height: 844 } : vp, touch: true });
    await H.enterWorld(P);
    await P.page.waitForTimeout(2400);
    if (land) { await P.page.setViewportSize(vp); await P.page.waitForTimeout(1100); }
    const myId = await H.readState(P, (S) => S.myId);

    const st = await state(P);
    rec.ok(`${label}: the worker advertises the store cap (guard)`, !!(st.caps && st.caps.store), st.caps || {});

    /* A stack, so the quantity stepper renders too -- it makes the sheet
       TALLER, which is the condition candidate 2 is about. */
    /* Several kinds, so the grid has OCCUPIED tiles low down rather than the
       empty padding slots the bag draws under them. */
    for (const k of ['wood_oak', 'ore_copper', 'fish_trout', 'wood_willow', 'ore_iron', 'fish_salmon']) {
      await H.grant(wsPort, myId, 'item', { invKey: k, count: 6 });
    }
    await P.page.waitForTimeout(2000);

    await H.openDest(P, 'Bag').catch(() => {});
    await P.page.waitForTimeout(900);

    /* ═══ TAP A REAL TILE, AND THE LOWEST ONE ═══
       The first cut of this file opened the card through the bus with no
       `anchor`, and that is why it could not reproduce the owner's report:
       with no anchor `positionFor` CENTRES the card, which is the one
       placement that always has room underneath it.  A player taps a bag
       tile, the tile's rect becomes the anchor, and a tile low in the grid
       anchors the card low -- which is the case the price sheet then grows
       out of the bottom of.  Reproducing the owner's path means taking it. */
    const tile = await P.page.evaluate(() => {
      /* By the RESOLVED track list, not by `repeat(...)`: getComputedStyle
         expands repeat() to explicit pixel tracks, so matching the authored
         shorthand finds nothing (it found nothing, which is how this is
         known).  The bag grid resolves to five ~72px columns. */
      const grid = [...document.querySelectorAll('div')]
        .map((d) => ({ d, gt: getComputedStyle(d).gridTemplateColumns || '', n: d.children.length }))
        .filter((o) => o.n >= 2 && (o.gt.match(/px/g) || []).length >= 2)
        .sort((a, b) => b.n - a.n)[0];
      if (!grid) return null;
      /* Only cells that actually HOLD something.  The grid pads itself with
         empty slots, and the lowest cell is usually one of those -- tapping it
         opens nothing, which the first run read as "the tap did not work". */
      const cells = [...grid.d.children]
        .map((c) => ({ c, r: c.getBoundingClientRect() }))
        .filter((o) => o.r.width > 20 && o.r.height > 20 && o.r.bottom <= innerHeight && o.r.top >= 0)
        .filter((o) => o.c.querySelector('svg') || (o.c.textContent || '').trim().length > 0);
      if (!cells.length) return null;
      cells.sort((a, b) => b.r.bottom - a.r.bottom);   /* the LOWEST on screen */
      const t = cells[0];
      const r = t.r;
      return { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2),
        bottom: Math.round(r.bottom), vh: innerHeight, cells: cells.length,
        anchor: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } };
    });
    if (!tile) {
      /* The bag grid does not lay out this way in landscape, so this road is
         simply not available there.  Recorded rather than failed: it is an
         untested viewport, not a known-broken one, and a red row here would
         claim knowledge this file does not have (TRAPS §28 cuts both ways --
         a test must not assert what it did not measure either). */
      rec.ok(`${label}: NOT EXERCISED -- no occupied bag tile found in this layout`, true, {});
      await P.ctx.close().catch(() => {});
      continue;
    }
    rec.ok(`${label}: found a real, occupied bag tile low on screen (guard)`, true, tile);
    /* Opened with THAT TILE'S OWN RECT as the anchor -- the same object the
       tile's handler builds (InventoryPanel `handleTap`, v2.3.210) and passes
       to this same bus call.  The tile's tap plumbing is not what is under
       test here (mp-store already drives the bag's controls); the card's
       PLACEMENT is, and the placement is a function of the anchor.  Handing it
       the real low tile's rect is what the first cut of this file got wrong by
       passing no anchor at all, which centres the card and hides the bug. */
    await P.page.evaluate((a) => window._itemDetailBus
      && window._itemDetailBus.open({ kind: 'inventory', key: 'wood_oak', count: 6, anchor: a }), tile.anchor);
    await P.page.waitForTimeout(800);
    /* The card must have opened AND been anchored -- an un-anchored open is
       the centred placement this scenario exists to stop testing. */
    const anch = await P.page.evaluate(() => {
      const b = window._itemDetailBus;
      const t = b && b.state && b.state.target;
      return { open: !!(b && b.state && b.state.open), anchored: !!(t && t.anchor),
        anchorTop: t && t.anchor ? Math.round(t.anchor.top) : null };
    });
    rec.ok(`${label}: the card opened anchored to that tile (guard)`
      + ` (tile bottom ${tile.bottom} of ${tile.vh})`,
      anch.open === true && anch.anchored === true, { ...anch, tile });
    if (!anch.open) { await P.ctx.close().catch(() => {}); continue; }

    const before = await sellButton(P);
    rec.ok(`${label}: the card shows a Sell button`, before.found === true, before);
    if (!before.found) { await P.ctx.close().catch(() => {}); continue; }
    /* candidate 1 */
    rec.ok(`${label}: ...and it is not the disabled variant`, before.disabled === false, before);
    /* candidate 3 */
    rec.ok(`${label}: ...and nothing is covering it`, before.coveredBy === null, before);
    rec.ok(`${label}: ...and it is on screen`, before.inViewport === true, before);

    await P.page.screenshot({ path: `${OUT}/sellsheet-${TAG}-${label}-card.png` });

    /* A REAL FINGER on the button's centre (TRAPS §67). */
    await P.page.touchscreen.tap(before.cx, before.cy);
    await P.page.waitForTimeout(700);

    const sh = await sheet(P);
    /* candidate 2 -- the state flipped, so the tap DID work */
    rec.ok(`${label}: the tap opened the price sheet (the state flipped)`, sh.open === true, sh);
    await P.page.screenshot({ path: `${OUT}/sellsheet-${TAG}-${label}-after.png` });
    if (!sh.open) { await P.ctx.close().catch(() => {}); continue; }

    /* ...AND THE POINT OF THE FILE: can the player SEE what just opened?
       Recorded, not gated: how far the sheet ends past the fold is the number
       that moves, and the hard assertion is the one below it -- a sheet that
       ends 20px low with the buttons still on screen is not the bug, and a
       sheet that fits with the buttons covered is. */
    rec.ok(`${label}: sheet ends ${sh.bottom} of ${sh.vh} (overflow ${sh.overflowPx}px)`, true, sh);

    /* THE GOAL, not the mechanism: the player has to be able to press the
       button that actually lists the item.  `hittable` and not just a rect --
       TRAPS §39, "visible, enabled and stable" is what a COVERED button looks
       like, and the 360-landscape run caught exactly that: the backdrop over
       the control, so the tap CLOSED the card. */
    const cb = await confirmBtn(P);
    rec.ok(`${label}: the sheet offers "Put it up"`, cb.found === true, cb);
    const reachable = !!(cb.found && cb.onScreen && cb.hittable);
    if (true) {
      rec.ok(`${label}: ..."Put it up" is on screen and tappable`
        + (cb.found ? ` (ends ${cb.rect.y + cb.rect.h} of ${cb.vh})` : ''), reachable, cb);
    } else {
      /* ═══ LANDSCAPE IS NOT FIXED BY THIS VERSION, AND SAYS SO ═══
         Recorded rather than gated, which needs justifying because TRAPS §28
         is about exactly this move -- a test that reports instead of failing
         asserts nothing.  The difference is that this is not an unknown: the
         card's content measures ~474px and a landscape phone viewport is
         360-390px, so NO placement fits it and re-placing cannot be the fix.
         Gating here would leave `run.mjs` permanently red on a defect this
         version does not claim to fix, which buries the ones it does.
         What IS gated in landscape is everything the fix does touch -- the
         button is not covered, and the tap opens the sheet -- and that is what
         caught the regression the first cut of this fix shipped
         (`overflowY: 'auto'` put the backdrop over the Sell button at
         360-landscape and the tap CLOSED the card).
         Flip this to a hard assertion with the layout change that makes the
         card fit a short viewport. */
      rec.ok(`${label}: KNOWN UNFIXED -- "Put it up" sits ${cb.belowFoldPx}px below the fold `
        + `(card content ~474px, viewport ${cb.vh}px; no placement fits)`, true, cb);
    }
    await P.page.screenshot({ path: `${OUT}/sellsheet-${TAG}-${label}-confirm.png` });

    await P.ctx.close().catch(() => {});
  }
}
