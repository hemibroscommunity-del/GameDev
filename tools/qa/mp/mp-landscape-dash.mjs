/* THE LANDSCAPE DASHBOARD: A 48px STRIP, AND A SHEET THE WORLD YIELDS TO
 * (v2.3.2152)
 *
 * Owner, across the mockup rounds: "Landscape would be an optional view.
 * You can play in portrait or landscape."  "No I don't want an overlay over
 * the world."  "You should be able to play the game with the menus open.
 * That's the idea."
 *
 * Those are three testable claims and this scenario holds all of them:
 *
 *  - AT REST the band is the identity row alone (--dash-h 48, --cols-h 0)
 *    and the world gets the whole width.  48 is also measured against the
 *    33dvh chrome ceiling (LANTERN-SLATE-SPEC hard lock) explicitly.
 *  - OPEN is side-by-side, not an overlay: the canvas itself NARROWS to
 *    --play-w and the sheet occupies ground the world no longer paints.
 *    "The panel covers the world" and "the world yields to the panel" are
 *    indistinguishable to a rectangle check, so the assertion is on the
 *    CANVAS's own width — the world literally is not under the sheet.
 *  - PLAYABLE while open: the character walks (real keyboard input through
 *    the real input loop) with the Bag expanded, and _uiBusy stays false —
 *    the dashboard sheet must never join the legacy panels' busy gate.
 *
 * The one-position law (v2.3.1637b) gets its own assertion: the nav button
 * that opened the sheet is measured before and after, and the two rects
 * must be identical — nothing slides out from under the thumb.
 */
import * as H from './harness.mjs';

const geom = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  const c = document.querySelector('canvas');
  const r = c.getBoundingClientRect();
  const cs = getComputedStyle(document.documentElement);
  const band = document.querySelector('.bt-dashboard');
  const b = band ? band.getBoundingClientRect() : null;
  const sheet = document.querySelector('.bt-land-sheet');
  const sh = sheet ? sheet.getBoundingClientRect() : null;
  const zh = document.querySelector('.bt-zone-header');
  /* v2.3.2163: the gold chip that replaced the bar's screen-length readout */
  const gold = document.querySelector('.bt-land-gold');
  const goldR = gold ? gold.getBoundingClientRect() : null;
  return {
    gold: goldR ? { cx: Math.round(goldR.left + goldR.width / 2), bottom: Math.round(goldR.bottom), text: (gold.textContent || '').trim() } : null,
    canvasW: Math.round(r.width), canvasH: Math.round(r.height),
    dashH: parseInt(cs.getPropertyValue('--dash-h')) || 0,
    colsH: parseInt(cs.getPropertyValue('--cols-h')) || 0,
    playW: parseInt(cs.getPropertyValue('--play-w')) || 0,
    sheetW: parseInt(cs.getPropertyValue('--sheet-w')) || 0,
    orient: document.documentElement.getAttribute('data-orient'),
    band: b ? { top: Math.round(b.top), h: Math.round(b.height), w: Math.round(b.width) } : null,
    sheet: sh ? { x: Math.round(sh.left), w: Math.round(sh.width), top: Math.round(sh.top), bottom: Math.round(sh.bottom) } : null,
    zoneHeaderW: zh ? Math.round(zh.getBoundingClientRect().width) : null,
    viewW: Math.round(S._viewW || 0), viewH: Math.round(S._viewH || 0),
    scale: +(S._worldScaleX || 0).toFixed(4),
    uiBusy: !!S._uiBusy,
    mode: (window.__broDashPanelBus && window.__broDashPanelBus.state.mode) || null,
  };
});

const navRect = (P) => P.page.evaluate(() => {
  const b = document.querySelector('.bt-navrail [data-nav]');
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Sidey', wsPort, webPort, touch: true, viewport: { width: 844, height: 390 }, dpr: 2,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(3000);

  /* ── AT REST ── */
  const rest = await geom(P);
  console.log('    rest: ' + JSON.stringify(rest));
  /* v2.3.2163 (owner: "You can actually remove that whole bottom length
     bar now"): sideways there is NO band at all — the world takes the
     whole screen, gold is a chip at the world's bottom centre, and the
     nav buttons float in their fixed dock. */
  rec.ok('landscape at rest: the bar is GONE (dash-h 0, no band painted)',
    rest.dashH === 0 && rest.colsH === 0 && (!rest.band || rest.band.h === 0), rest);
  rec.ok('...zero bottom chrome against the one-third ceiling',
    rest.dashH <= Math.floor(390 / 3), { dashH: rest.dashH, ceiling: Math.floor(390 / 3) });
  rec.ok('...the world gets the WHOLE screen (canvas 844x390, play-w 844)',
    rest.canvasW === 844 && rest.canvasH === 390 && rest.playW === 844, rest);
  rec.ok('...at the landscape view rule (scale canvasH/480, world 480 tall)',
    Math.abs(rest.scale - 390 / 480) < 0.005 && rest.viewH === 480, rest);
  rec.ok('...gold is a CHIP at the world\'s bottom centre, not a screen-length bar',
    !!rest.gold && Math.abs(rest.gold.cx - 844 / 2) <= 3 && rest.gold.bottom >= 370
      && /\d/.test(rest.gold.text), rest.gold);
  rec.ok('...and the fold chip is gone (the band already IS the fold)',
    await P.page.evaluate(() => {
      const c = document.querySelector('[data-dash-fold]');
      return !c || getComputedStyle(c).display === 'none';
    }));

  const navBefore = await navRect(P);
  rec.ok('a nav button is on screen to open with (guard)', !!navBefore, navBefore);

  /* ── OPEN ── */
  await P.page.evaluate(() => window.__broDashPanelBus.open('bag'));
  await P.page.waitForTimeout(900);
  const open = await geom(P);
  console.log('    open: ' + JSON.stringify(open));
  /* v2.3.2164: a PANE sheet is the device's whole portrait width (390
     here) — every destination renders pixel-identical to portrait, which
     is what caught Hero's stat columns clipping at the old bag-derived
     292. */
  rec.ok('opening the Bag NARROWS the canvas — the world yields, nothing overlays it',
    open.canvasW === 844 - open.sheetW && open.sheetW === 390
      && open.playW === open.canvasW, open);
  rec.ok('...the sheet sits exactly in the yielded ground, beside the world',
    !!open.sheet && Math.abs(open.sheet.x - open.canvasW) <= 1
      && Math.abs(open.sheet.w - open.sheetW) <= 1, open.sheet);
  /* v2.3.2161: the sheet is the WHOLE right side now — screen top to
     screen bottom — and the strip narrows to the world's width beside it
     (the zone header's own rule), so no band runs under the container. */
  rec.ok('...from the top of the screen to its BOTTOM — the whole right side is the container',
    !!open.sheet && open.sheet.top <= 1 && Math.abs(open.sheet.bottom - 390) <= 2, open.sheet);
  rec.ok('...still no band painted anywhere (the bar stays gone with a sheet open)',
    !open.band || open.band.h === 0, open.band);
  rec.ok('...and the gold chip re-centres over the NARROWED world, off the sheet',
    !!open.gold && Math.abs(open.gold.cx - open.playW / 2) <= 3
      && open.gold.cx + 40 < open.canvasW, open.gold);
  const navAfter = await navRect(P);
  rec.ok('...and the nav button that opened it has not moved a pixel (v2.3.1637b)',
    !!navAfter && JSON.stringify(navAfter) === JSON.stringify(navBefore),
    { before: navBefore, after: navAfter });
  rec.ok('the zone header spans the WORLD, not the screen (a complete window)',
    open.zoneHeaderW !== null && Math.abs(open.zoneHeaderW - open.playW) <= 1,
    { zoneHeaderW: open.zoneHeaderW, playW: open.playW });
  rec.ok('the bag grid fits its sheet — no horizontal overflow (panelVw, not playVw)',
    await P.page.evaluate(() => {
      const sh = document.querySelector('.bt-land-sheet');
      if (!sh) return false;
      return sh.scrollWidth <= sh.clientWidth + 1;
    }));

  /* ── PLAYABLE WHILE OPEN — the owner's whole idea ── */
  rec.ok('the sheet does not count as "busy" (dashboard sheets never have)',
    open.uiBusy === false, { uiBusy: open.uiBusy });
  const x0 = await H.readState(P, (S) => Math.round(S.player.x));
  await P.page.keyboard.down('KeyD');
  await P.page.waitForTimeout(900);
  await P.page.keyboard.up('KeyD');
  await P.page.waitForTimeout(200);
  const x1 = await H.readState(P, (S) => Math.round(S.player.x));
  const still = await geom(P);
  rec.ok('you can WALK with the Bag open — "play the game with the menus open"',
    still.mode === 'expanded' && x1 > x0 + 20,
    { from: x0, to: x1, mode: still.mode });

  /* the joystick disc is reachable on the world side, not under the sheet */
  rec.ok('the left joystick is present and un-covered on the world side',
    await P.page.evaluate(() => {
      const d = document.querySelector('.bt-joystick-base') || document.querySelector('.bt-joystick-zone');
      if (!d) return false;
      const r = d.getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!el && !el.closest('.bt-land-sheet');
    }));

  /* ── CLOSE ── */
  await P.page.evaluate(() => window.__broDashPanelBus.toBar());
  await P.page.waitForTimeout(900);
  const closed = await geom(P);
  rec.ok('closing gives the world its width back',
    closed.canvasW === 844 && closed.playW === 844 && !closed.sheet, closed);

  /* ═══ v2.3.2153: THE OWNER'S EXACT GESTURE ═══
     Owner, on a real device: "I see the thin bar at the bottom but no
     inventory slots when dashboard is active."  Everything above drove the
     bus; the owner drives a THUMB, and the chart button's portrait job --
     toBar(), because rest IS the dashboard there -- was a lit button that
     produced nothing sideways.  So: tap the REAL chart button and demand
     the bag, slots visible; tap it again and demand the world back. */
  const chart = await P.page.evaluate(() => {
    const b = document.querySelector('.bt-navrail [data-nav="dashboard"]');
    if (!b) return null;
    b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return true;
  });
  rec.ok('the chart button exists to tap (guard)', chart === true);
  await P.page.waitForTimeout(900);
  const viaTap = await geom(P);
  rec.ok('tapping the DASHBOARD button opens the sheet sideways — the slots are back',
    viaTap.mode === 'expanded' && !!viaTap.sheet && viaTap.canvasW < 844, viaTap);
  /* v2.3.2158: the destination is the STACKED dashboard — the bag grid AND
     the combat pills, both named by the owner, in one vertical column. */
  rec.ok('...with the bag grid AND the combat pills stacked in it',
    await P.page.evaluate(() => {
      const sh = document.querySelector('.bt-land-sheet');
      if (!sh) return false;
      /* the stacked DashColumns marker + the three icon-labeled pills (they
         read "LV n", not skill names) + enough divs to be a real grid */
      const lvs = ((sh.textContent || '').match(/LV\s*\d/g) || []).length;
      return !!sh.querySelector('.bt-dashcols') && lvs >= 3
        && sh.querySelectorAll('div').length > 8;
    }));
  /* ═══ v2.3.2160/2161: THE ROTATION, NOT A REFLOW ═══
     Owner: "it would actually be 2 slots wide and 4 slots vertical height
     leaving 8 slots viewable at one time ... a portrait to landscape
     conversion of viewable game area that keeps equivalent dashboard view
     space" — then: "the width of the entire dashboard area should be
     enough to include the 3 combat skills at the bottom ... the dashboard
     buttons should all be included in that container on that whole right
     side."
     So the DASHBOARD destination earns a narrow column (bound by the
     five-button nav row: ~188 at phone sizes) holding the 2x4 bag, the
     three combat skills as a row, and the nav dock — ALL visible at once —
     while pane destinations (the Bag detail asserted at 280..340 above,
     Hero, Settings) keep the 4-column width. */
  rec.ok('...in the narrow nav-bound column (~188) — pane sheets stay 4 slots wide',
    viaTap.sheetW >= 170 && viaTap.sheetW <= 210 && viaTap.sheetW < open.sheetW - 80,
    { dashboardSheetW: viaTap.sheetW, paneSheetW: open.sheetW });
  rec.ok('...and the bag grid is 2 columns x 4 visible rows — portrait 4x2, rotated',
    await P.page.evaluate(() => {
      const sh = document.querySelector('.bt-land-sheet');
      if (!sh) return false;
      /* the bag grid is the one div with an inline gridAutoRows (its tiles
         are square rows of the same t the columns use) */
      const grid = [...sh.querySelectorAll('div')].find((d) => d.style && d.style.gridAutoRows);
      if (!grid) return false;
      const cols = getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length;
      const scroller = grid.parentElement;
      const tile = grid.firstElementChild ? grid.firstElementChild.getBoundingClientRect().width : 0;
      /* exactly four whole rows: (h + gap) / (tile + gap) lands in [4,5) */
      const visRows = tile ? (scroller.clientHeight + 4) / (tile + 4) : 0;
      return cols === 2 && visRows >= 3.95 && visRows < 5;
    }));
  /* v2.3.2163 (owner: "you'll still need to fit the sort chips somewhere
     on the landscape bag view"): the five filter chips are a vertical rail
     down the grid's LEFT side, spanning the grid's own height. */
  rec.ok('...the 5 sort chips ride a vertical rail beside the slots',
    await P.page.evaluate(() => {
      const rail = document.querySelector('.bt-land-sheet .bt-bagrail');
      if (!rail) return false;
      const chips = rail.querySelectorAll('[role="button"]');
      const rr = rail.getBoundingClientRect();
      const grid = [...document.querySelectorAll('.bt-land-sheet div')].find((d) => d.style && d.style.gridAutoRows);
      if (!grid) return false;
      const gr = grid.getBoundingClientRect();
      return chips.length === 5 && rr.right <= gr.left            /* beside, not above */
        && Math.abs(rr.height - gr.height) <= 14                   /* spanning its height */
        && rr.height > rr.width * 4;                               /* actually vertical */
    }));
  /* v2.3.2161: nothing to scroll for — the three combat pills sit ON
     SCREEN at the container's foot, above the nav dock, and the dock's
     buttons sit inside the container's footprint. */
  const footing = await P.page.evaluate(() => {
    const sh = document.querySelector('.bt-land-sheet');
    if (!sh) return null;
    const shR = sh.getBoundingClientRect();
    /* the combat cards are the role=button leaves that read "LV n" — the
       bar is absent at the level cap, so it cannot be the hook */
    const pills = [...sh.querySelectorAll('[role="button"]')]
      .filter((el) => /\bLV\s*\d/.test(el.textContent || '') && !el.querySelector('[role="button"]'))
      .map((el) => el.getBoundingClientRect());
    const dock = document.querySelector('.bt-land-navdock');
    const dockR = dock ? dock.getBoundingClientRect() : null;
    const btns = dock ? dock.querySelectorAll('[data-nav]').length : 0;
    return {
      sheet: { x: Math.round(shR.left), r: Math.round(shR.right) },
      pills: pills.map((r) => ({ top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left) })),
      dock: dockR ? { x: Math.round(dockR.left), r: Math.round(dockR.right), bottom: Math.round(dockR.bottom) } : null,
      btns,
    };
  });
  rec.ok('...the 3 combat skills are VISIBLE at the bottom — no scrolling to find them',
    !!footing && footing.pills.length === 3
      && footing.pills.every((r) => r.bottom <= 390 - 44 && r.top >= 0),
    footing);
  rec.ok('...and the five nav buttons sit INSIDE the container ("included in that container")',
    !!footing && !!footing.dock && footing.btns >= 5
      && footing.dock.x >= footing.sheet.x - 1 && footing.dock.r <= footing.sheet.r + 1
      && footing.dock.bottom <= 391,
    footing);
  /* v2.3.2160: shoot the OPEN dashboard — the state every owner correction
     in this file has been about — rather than the resting band. */
  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/landscape-dash.png' });
  await P.page.evaluate(() => {
    const b = document.querySelector('.bt-navrail [data-nav="dashboard"]');
    if (b) b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await P.page.waitForTimeout(900);
  const viaTap2 = await geom(P);
  rec.ok('...and tapping it again gives the world back (the same toggle it always was)',
    viaTap2.mode === 'bar' && viaTap2.canvasW === 844, viaTap2);

  /* ═══ v2.3.2163: A DRILL STILL HAS A WAY BACK ═══
     The back-chip rode the band's identity row, and the band is gone
     sideways — so the chip moved into the sheet's own header.  Drill in,
     find it, tap it, land back on the parent. */
  await P.page.evaluate(() => { window.__broDashPanelBus.open('bag'); });
  await P.page.waitForTimeout(500);
  await P.page.evaluate(() => { window.__broDashPanelBus.push('settings'); });
  await P.page.waitForTimeout(700);
  const drillBack = await P.page.evaluate(() => {
    const chip = [...document.querySelectorAll('.bt-land-sheet button')]
      .find((b) => (b.textContent || '').includes('◂'));
    if (!chip) return { found: false };
    const r = chip.getBoundingClientRect();
    chip.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return { found: true, onScreen: r.top >= 0 && r.bottom <= 390 && r.left >= 0 };
  });
  await P.page.waitForTimeout(700);
  const popped = await P.page.evaluate(() => window.__broDashPanelBus.state.stack.join('>'));
  rec.ok('a drill (Settings) shows a back-chip INSIDE the sheet, and it pops back to the parent',
    drillBack.found && drillBack.onScreen && popped === 'bag',
    { ...drillBack, stackAfterPop: popped });
  await P.page.evaluate(() => window.__broDashPanelBus.toBar());
  await P.page.waitForTimeout(400);
  await P.ctx.close().catch(() => {});
}
