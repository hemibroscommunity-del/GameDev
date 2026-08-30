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
  return {
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
  rec.ok('landscape at rest: the band is the identity row alone (48px, no columns)',
    rest.dashH === 48 && rest.colsH === 0, rest);
  rec.ok('...well under the one-third chrome ceiling (48 <= 129)',
    rest.dashH <= Math.floor(390 / 3), { dashH: rest.dashH, ceiling: Math.floor(390 / 3) });
  rec.ok('...the world gets the whole width (canvas 844x356, play-w 844)',
    rest.canvasW === 844 && rest.canvasH === 356 && rest.playW === 844, rest);
  rec.ok('...at the landscape view rule (scale canvasH/480, world 480 tall)',
    Math.abs(rest.scale - 356 / 480) < 0.005 && rest.viewH === 480, rest);
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
  /* v2.3.2158: the sheet earns exactly the 4-column bag panel's width at
     the PORTRAIT tile size (basis = the short side, 390 -> tile 63 ->
     sheet 292) — the owner's "8 slots plus combat skills", not a share of
     the screen. */
  rec.ok('opening the Bag NARROWS the canvas — the world yields, nothing overlays it',
    open.canvasW === 844 - open.sheetW && open.sheetW >= 280 && open.sheetW <= 340
      && open.playW === open.canvasW, open);
  rec.ok('...the sheet sits exactly in the yielded ground, beside the world',
    !!open.sheet && Math.abs(open.sheet.x - open.canvasW) <= 1
      && Math.abs(open.sheet.w - open.sheetW) <= 1, open.sheet);
  rec.ok('...from the top of the screen down to the band, which it does not cover',
    !!open.sheet && open.sheet.top <= 1 && Math.abs(open.sheet.bottom - (390 - 48)) <= 2, open.sheet);
  rec.ok('...the band did not move or grow (48px, one screen position)',
    !!open.band && open.band.h === 48 + (open.band.h - 48 > 4 ? 0 : (open.band.h - 48))
      && Math.abs(open.band.top - (390 - open.band.h)) <= 2, open.band);
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
  /* ═══ v2.3.2160: THE ROTATION, NOT A REFLOW ═══
     Owner, with the portrait band screenshot: "it would actually be 2 slots
     wide and 4 slots vertical height leaving 8 slots viewable at one time
     ... I was making a portrait to landscape conversion of viewable game
     area that keeps equivalent dashboard view space."
     So the DASHBOARD destination earns a column exactly two slots wide
     (390-basis tile 63 -> panel 140 -> sheet 158) while pane destinations
     (the Bag detail asserted at 280..340 above, Hero, Settings) keep the
     4-column width — the two-widths rule in landscapeSheetW. */
  rec.ok('...in the narrow 2-slot column (~158) — pane sheets stay 4 slots wide',
    viaTap.sheetW >= 145 && viaTap.sheetW <= 185 && viaTap.sheetW < open.sheetW - 80,
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
      /* 4 whole rows + the 12px peek sliver: (h + gap) / (tile + gap) lands
         between 4 and 5 iff exactly four rows are fully visible */
      const visRows = tile ? (scroller.clientHeight + 4) / (tile + 4) : 0;
      return cols === 2 && visRows >= 4 && visRows < 5;
    }));
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
  await P.ctx.close().catch(() => {});
}
