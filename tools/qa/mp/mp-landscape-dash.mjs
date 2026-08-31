/* THE LANDSCAPE DASHBOARD: A 48px STRIP, AND A SHEET THE WORLD YIELDS TO
 * (v2.3.2157)
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
  /* v2.3.2168: the gold chip that replaced the bar's screen-length readout */
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
    /* v2.3.2174: which edge the panel took, where the world starts, and the
       canvas's REAL left edge -- the three the side rule has to keep in
       agreement. */
    side: document.documentElement.getAttribute('data-dash-side'),
    worldX: parseInt(cs.getPropertyValue('--world-x')) || 0,
    canvasX: Math.round(r.left),
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
  /* v2.3.2168 (owner: "You can actually remove that whole bottom length
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
  /* ═══ v2.3.2174: THE PANEL TAKES THE CLEAR EDGE ═══
     Owner: "The iPhone has a punch hole that's awkward since it goes right
     through the menus."  With no Island to dodge (headless, both insets 0)
     the rule resolves LEFT -- the side the owner asked for -- and at rest
     the world still spans everything, so nothing is offset yet. */
  rec.ok('...the panel claims the LEFT edge when there is no Island to dodge',
    rest.side === 'left' && rest.worldX === 0 && rest.canvasX === 0, rest);
  rec.ok('...and the fold chip is gone (the band already IS the fold)',
    await P.page.evaluate(() => {
      const c = document.querySelector('[data-dash-fold]');
      return !c || getComputedStyle(c).display === 'none';
    }));

  /* ═══ v2.3.2176: MINIMIZED MEANS MINIMIZED ═══
     Owner: "the dashboard navigation buttons still visible that should've
     been hidden inside the main dashboard screen when it's minimized."  So
     at rest the world carries NO nav buttons -- only the chip that opens the
     container (and the gold chip and bell, which are readouts).  This
     replaces the old "a nav button is on screen to open with" guard, which
     asserted the very thing the owner asked to remove. */
  rec.ok('at rest the world carries NO nav buttons — only the chip that opens them',
    await P.page.evaluate(() => !document.querySelector('.bt-navrail [data-nav]')
      && !!document.querySelector('[data-land-fold]')));

  /* ── OPEN ── */
  await P.page.evaluate(() => window.__broDashPanelBus.open('bag'));
  await P.page.waitForTimeout(900);
  const open = await geom(P);
  console.log('    open: ' + JSON.stringify(open));
  /* ═══ v2.3.2173: THE LEGACY BAG PANE IS RETIRED SIDEWAYS ═══
     Owner: "you show another bag view with tiny inventory slots.  That
     must be a legacy view that needs to retire.  It got replaced with
     the [dashboard column] view."  Asking the bus for 'bag' in landscape
     lands on the DASHBOARD column — the same request that used to
     produce the tiny-slot InventoryPanel. */
  rec.ok('asking for the legacy Bag pane lands on the DASHBOARD column (retired sideways)',
    await P.page.evaluate(() => window.__broDashPanelBus.state.stack[0] === 'dashboard'
      && !!document.querySelector('.bt-land-sheet .bt-dashcols')));
  /* v2.3.2172 (owner: "should be that skinny and the exact same for all
     the buttons"): ONE width — every destination opens in the dashboard's
     own narrow column (~220 at phone sizes). */
  rec.ok('opening it NARROWS the canvas — the world yields, nothing overlays it',
    open.canvasW === 844 - open.sheetW && open.sheetW >= 205 && open.sheetW <= 245
      && open.playW === open.canvasW, open);
  /* v2.3.2174: stated as a RULE rather than "the sheet is on the right", so
     the same assertion holds on whichever edge the Island pushed it to --
     the world occupies [worldX, worldX+playW] and the panel takes exactly
     the ground beside it, with no overlap and no gap. */
  const _sheetXWant = open.side === 'left' ? 0 : open.playW;
  rec.ok('...the sheet sits exactly in the yielded ground, beside the world',
    !!open.sheet && Math.abs(open.sheet.x - _sheetXWant) <= 1
      && Math.abs(open.sheet.w - open.sheetW) <= 1
      && open.canvasX === open.worldX
      && open.worldX === (open.side === 'left' ? open.sheetW : 0),
    { sheet: open.sheet, want: _sheetXWant, side: open.side, worldX: open.worldX, canvasX: open.canvasX });
  /* v2.3.2166: the sheet is the WHOLE right side now — screen top to
     screen bottom — and the strip narrows to the world's width beside it
     (the zone header's own rule), so no band runs under the container. */
  rec.ok('...from the top of the screen to its BOTTOM — the whole right side is the container',
    !!open.sheet && open.sheet.top <= 1 && Math.abs(open.sheet.bottom - 390) <= 2, open.sheet);
  rec.ok('...still no band painted anywhere (the bar stays gone with a sheet open)',
    !open.band || open.band.h === 0, open.band);
  rec.ok('...and the gold chip re-centres over the NARROWED world, off the sheet',
    !!open.gold && Math.abs(open.gold.cx - (open.worldX + open.playW / 2)) <= 3
      && open.gold.cx > open.worldX + 20
      && open.gold.cx < open.worldX + open.playW - 20,
    { gold: open.gold, worldX: open.worldX, playW: open.playW });
  /* v2.3.2176: the one-position law (v2.3.1637b) is now measured between
     two OPEN states -- the buttons do not exist at rest to compare against,
     and what the law protects is a button moving under the thumb that is
     about to tap it again. */
  const navAfter = await navRect(P);
  await P.page.evaluate(() => window.__broDashPanelBus.open('hero'));
  await P.page.waitForTimeout(700);
  const navOther = await navRect(P);
  rec.ok('...and switching destination does not move the nav buttons (v2.3.1637b)',
    !!navAfter && !!navOther && JSON.stringify(navAfter) === JSON.stringify(navOther),
    { onDashboard: navAfter, onHero: navOther });
  await P.page.evaluate(() => window.__broDashPanelBus.open('bag'));
  await P.page.waitForTimeout(700);
  rec.ok('the zone header spans the WORLD, not the screen (a complete window)',
    open.zoneHeaderW !== null && Math.abs(open.zoneHeaderW - open.playW) <= 1,
    { zoneHeaderW: open.zoneHeaderW, playW: open.playW });
  rec.ok('the sheet has no horizontal overflow (panelVw, not playVw)',
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
  rec.ok('you can WALK with the sheet open — "play the game with the menus open"',
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

  /* ═══ v2.3.2158: THE OWNER'S EXACT GESTURE ═══
     Owner, on a real device: "I see the thin bar at the bottom but no
     inventory slots when dashboard is active."  Everything above drove the
     bus; the owner drives a THUMB.
     v2.3.2176: the way IN from rest is the chip now (the buttons are hidden
     when minimized, the owner's later ask), so the thumb path is: chip
     opens the container, and the chart button inside it is the DASHBOARD
     destination -- lit, and a second tap gives the world back. */
  const viaChip = await P.page.evaluate(() => {
    const c = document.querySelector('[data-land-fold]');
    if (!c) return null;
    c.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return true;
  });
  rec.ok('the chip is the way in from rest (guard)', viaChip === true);
  await P.page.waitForTimeout(900);
  const chart = await P.page.evaluate(() => {
    const b = document.querySelector('.bt-navrail [data-nav="dashboard"]');
    if (!b) return null;
    return { lit: b.getAttribute('aria-pressed') === 'true',
             opaque: !/^rgba\(0, 0, 0, 0\)$/.test(getComputedStyle(b).backgroundColor) };
  });
  /* v2.3.2176 (owner: "the main dashboard button (the chart) is transparent
     but should have the same background as the other buttons"): the lit fill
     was a translucent brass TINT with nothing opaque behind it. */
  rec.ok('the chart button is inside the container, lit, and NOT transparent',
    !!chart && chart.lit && chart.opaque, chart);
  await P.page.waitForTimeout(200);
  const viaTap = await geom(P);
  rec.ok('the chip opened the DASHBOARD sideways — the slots are back',
    viaTap.mode === 'expanded' && !!viaTap.sheet && viaTap.canvasW < 844, viaTap);
  /* v2.3.2163: the destination is the STACKED dashboard — the bag grid AND
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
  /* ═══ v2.3.2165/2161: THE ROTATION, NOT A REFLOW ═══
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
  /* v2.3.2171: the fold chip joined the dock row, so the nav-bound width
     is six slots (~220 at phone sizes).
     v2.3.2172 (owner: "that skinny and the exact same for all the
     buttons"): the dashboard and every pane share ONE width. */
  rec.ok('...in the same skinny column every destination gets (one width for all buttons)',
    viaTap.sheetW >= 205 && viaTap.sheetW <= 245 && viaTap.sheetW === open.sheetW,
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
  /* v2.3.2168 (owner: "you'll still need to fit the sort chips somewhere
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
  /* v2.3.2166: nothing to scroll for — the three combat pills sit ON
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
  /* v2.3.2170 (owner, zoomed screenshot: "the left side of the buttons has
     space to fill"): the button row FILLS the container's width — no dead
     slack left of the first button. */
  rec.ok('...and the button row FILLS the container\'s width (no slack on its left)',
    !!footing && !!footing.dock
      && (footing.dock.r - footing.dock.x) >= (footing.sheet.r - footing.sheet.x) - 20,
    footing);
  /* v2.3.2165: shoot the OPEN dashboard — the state every owner correction
     in this file has been about — rather than the resting band. */
  await P.page.screenshot({ path: '/home/user/GameDev/tools/qa/mp/out/landscape-dash.png' });
  await P.page.evaluate(() => {
    const b = document.querySelector('.bt-navrail [data-nav="dashboard"]');
    if (b) b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await P.page.waitForTimeout(900);
  const viaTap2 = await geom(P);
  rec.ok('...and tapping the chart button gives the world back (the toggle it always was)',
    viaTap2.mode === 'bar' && viaTap2.canvasW === 844, viaTap2);
  rec.ok('...which also puts the nav buttons away again',
    await P.page.evaluate(() => !document.querySelector('.bt-navrail [data-nav]')));

  /* ═══ v2.3.2171: THE FOLD CHIP, SIDEWAYS ═══
     Owner: "add a button for minimizing that whole dashboard area (just
     like the portrait equivalent)."  Far left of the dock row, in every
     mode: ▴ at rest opens the dashboard, ▾ minimizes whatever is open. */
  const chipUp = await P.page.evaluate(() => {
    const c = document.querySelector('[data-land-fold]');
    if (!c) return null;
    c.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return c.getAttribute('data-land-fold');
  });
  await P.page.waitForTimeout(800);
  const afterChipOpen = await geom(P);
  rec.ok('the fold chip exists at rest (▴) and OPENS the dashboard area',
    chipUp === 'min' && afterChipOpen.mode === 'expanded' && afterChipOpen.canvasW < 844,
    { chipStateAtTap: chipUp, after: { mode: afterChipOpen.mode, canvasW: afterChipOpen.canvasW } });
  await P.page.evaluate(() => {
    const c = document.querySelector('[data-land-fold]');
    if (c) c.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await P.page.waitForTimeout(800);
  const afterChipClose = await geom(P);
  rec.ok('...and tapping it again (▾) MINIMIZES the whole dashboard area',
    afterChipClose.mode === 'bar' && afterChipClose.canvasW === 844, afterChipClose);

  /* v2.3.2172: the CHARACTER view in the skinny column — the pane that
     clipped at every earlier width.  It must lay out vertically with no
     horizontal overflow, per the owner's "align some of the panes
     vertically ... put stats beneath that". */
  await P.page.evaluate(() => window.__broDashPanelBus.open('hero'));
  await P.page.waitForTimeout(1000);
  const heroFit = await P.page.evaluate(() => {
    const sh = document.querySelector('.bt-land-sheet');
    if (!sh) return null;
    const shR = sh.getBoundingClientRect();
    const wide = [...sh.querySelectorAll('*')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.right > shR.right + 2 && r.width > 4;
    }).length;
    const text = sh.textContent || '';
    return { scrollFits: sh.scrollWidth <= sh.clientWidth + 1, wide,
             hasStats: /OFFENSE/i.test(text) && /DEFENSE/i.test(text) && /Damage/.test(text) };
  });
  rec.ok('the character view fits the skinny column — stacked, nothing clipped sideways',
    !!heroFit && heroFit.scrollFits && heroFit.wide === 0 && heroFit.hasStats, heroFit);
  await P.page.evaluate(() => window.__broDashPanelBus.toBar());
  await P.page.waitForTimeout(400);

  /* ═══ v2.3.2168: A DRILL STILL HAS A WAY BACK ═══
     The back-chip rode the band's identity row, and the band is gone
     sideways — so the chip moved into the sheet's own header.  Drill in,
     find it, tap it, land back on the parent. */
  await P.page.evaluate(() => { window.__broDashPanelBus.open('quests'); });
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
    drillBack.found && drillBack.onScreen && popped === 'quests',
    { ...drillBack, stackAfterPop: popped });
  await P.page.evaluate(() => window.__broDashPanelBus.toBar());
  await P.page.waitForTimeout(400);

  /* ═══ v2.3.2173: EVERY LABEL RENDERS WHOLE ═══
     Owner: "you also need to actually examine all of the screenshots of
     each view visually.  It's obvious that the labels are getting cut
     off."  What the eye caught, the suite now pins: for each destination,
     zero elements past the sheet's right edge AND zero truncated text
     leaves (a leaf whose scrollWidth exceeds its box is exactly an
     ellipsised or clipped label — "W Lv 0", "Qu…", "Comple…").  A future
     panel that outgrows the skinny column fails here BY NAME. */
  for (const dest of ['quests', 'skills', 'more']) {
    await P.page.evaluate((d) => window.__broDashPanelBus.open(d), dest);
    await P.page.waitForTimeout(900);
    const fit = await P.page.evaluate(() => {
      const sh = document.querySelector('.bt-land-sheet');
      if (!sh) return null;
      const shR = sh.getBoundingClientRect();
      let past = 0; const trunc = [];
      for (const el of sh.querySelectorAll('*')) {
        const rr = el.getBoundingClientRect();
        if (rr.width > 4 && rr.right > shR.right + 2) past++;
        if (el.children.length === 0 && (el.textContent || '').trim().length > 2
            && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
          trunc.push((el.textContent || '').trim().slice(0, 24));
        }
      }
      return { past, truncated: trunc.slice(0, 6), truncCount: trunc.length };
    });
    rec.ok(`${dest}: every label renders whole — nothing clipped or ellipsised`,
      !!fit && fit.past === 0 && fit.truncCount === 0, fit);
  }
  /* ═══ v2.3.2176: THE HERO PANE'S THREE SECTIONS, SWEPT TOO ═══
     The sweep above covered quests/skills/more and stopped there, which is
     exactly why Journey shipped reading "K...", "D...", "L..." in the narrow
     column and the owner had to point at it a second time.  Hero is one
     destination with THREE screens behind a section switch, so it needs its
     own walk. */
  /* ═══ v2.3.2176b: SWEEP THE POINTED CHARACTER, NOT THE FRESH ONE ═══
     This walk was already here and it passed -- while the shipped build
     rendered "Equipm...", "Poi...", "Journ..." in a screenshot.  The reason
     is the state it swept: a fresh character has no unspent points, so the
     Points tab carried no count badge, and it is the badge's 12px reserve
     that pushed the three tabs over the strip's 191 and ellipsised ALL of
     them.  A guard that only ever sees the empty state cannot see the bug.
     Same for the records: "Deepest Zone" is a zone NAME, and the fresh
     value is the em dash.  Both are seeded here so the sweep walks the
     screen a player who has been playing actually has. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current; const R = S && S.rpg;
    if (R && R.prog3) { R.prog3.pool = 6; R.prog3.poolBy = { sword: 1, bow: 4, staff: 1 }; }
    if (R) {
      const cs = R._compStats = R._compStats || {};
      cs.totalGoldEarned = 1234567; cs.deepestZone = 'Frost Hollow';
    }
    if (S) S._serverCaps = Object.assign({}, S._serverCaps, { prog3Chan: true });
  });
  await P.page.evaluate(() => window.__broDashPanelBus.open('hero'));
  await P.page.waitForTimeout(900);
  for (const sec of ['Overview', 'Build', 'Records']) {
    const fit = await P.page.evaluate((s) => {
      const tab = document.querySelector(`.bt-land-sheet [role="button"][data-section="${s}"]`);
      if (tab) tab.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      return !!tab;
    }, sec);
    if (!fit) { rec.ok(`hero/${sec}: the section tab exists`, false, { sec }); continue; }
    await P.page.waitForTimeout(650);
    const clip = await P.page.evaluate(() => {
      const sh = document.querySelector('.bt-land-sheet');
      const shR = sh.getBoundingClientRect();
      let past = 0; const trunc = [];
      for (const el of sh.querySelectorAll('*')) {
        const rr = el.getBoundingClientRect();
        if (rr.width > 4 && rr.right > shR.right + 2) past++;
        if (el.children.length === 0 && (el.textContent || '').trim().length > 2
            && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
          trunc.push((el.textContent || '').trim().slice(0, 24));
        }
      }
      return { past, truncated: [...new Set(trunc)].slice(0, 6), truncCount: trunc.length };
    });
    rec.ok(`hero/${sec}: every label renders whole — nothing clipped or ellipsised`,
      clip.past === 0 && clip.truncCount === 0, clip);
  }
  await P.page.evaluate(() => window.__broDashPanelBus.toBar());
  await P.page.waitForTimeout(400);

  /* ═══ v2.3.2174: NOTHING FROM THE WORLD SITS ON THE PANEL ═══
     Moving the panel to the left edge broke two things that a passing test
     suite said nothing about, and only LOOKING at the screenshot found them:
     the quest coach card clamped itself to `window.innerWidth` and slid under
     the panel, and the v2.3.2155 notification bell was pinned to the screen's
     bottom-left corner -- which is now the panel's corner.  Both are outside
     .brotown-wrap, so the contain:paint mechanic could not carry them and
     each needed --world-x by hand.
     This sweep is the guard: any visible, text-bearing world chrome whose box
     intrudes into the panel's column fails HERE, by name, instead of in a
     screenshot nobody re-reads. */
  await P.page.evaluate(() => window.__broDashPanelBus.open('dashboard'));
  await P.page.waitForTimeout(1000);
  const intruders = await P.page.evaluate(() => {
    const sheet = document.querySelector('.bt-land-sheet').getBoundingClientRect();
    const out = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (el.closest('.bt-land-sheet') || el.closest('.bt-land-navdock')) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) continue;
      const r = el.getBoundingClientRect();
      /* text-bearing chrome only: the canvas and full-screen scrims are
         SUPPOSED to span the panel's column (the world paints under it). */
      if (r.width < 20 || r.height < 12 || r.width > 700) continue;
      const txt = (el.textContent || '').trim();
      if (!txt) continue;
      if (r.left < sheet.right - 4 && r.right > sheet.left + 4) {
        out.push(txt.slice(0, 28) + ' @' + Math.round(r.left));
      }
    }
    return [...new Set(out)].slice(0, 6);
  });
  rec.ok('no world chrome sits on the panel — the bell and the coach card ride the world',
    intruders.length === 0, { intruders });
  /* v2.3.2175 (owner: "Make it so when you tap on the alert bell it pops back
     up with the notifications"): the inverse of the sweep above, and the
     property the owner actually feels -- the bell must be the thing UNDER THE
     FINGER, not the panel that moved on top of it.  elementFromPoint is the
     honest question: whatever is topmost at the bell's centre is what a tap
     hits. */
  const bellHit = await P.page.evaluate(() => {
    const b = document.querySelector('[data-world-chat-toggle]');
    if (!b) return { absent: true };
    const r = b.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      x: Math.round(r.left),
      reachable: !!top && !!top.closest('[data-world-chat-toggle]'),
      hitBy: top ? String(top.className || top.tagName).slice(0, 24) : 'none',
    };
  });
  rec.ok('the notification bell is reachable sideways — a tap lands on IT, not the panel',
    bellHit.absent || bellHit.reachable, bellHit);
  await P.page.evaluate(() => window.__broDashPanelBus.toBar());
  await P.page.waitForTimeout(400);

  /* ═══ v2.3.2174: THE PANEL DODGES THE ISLAND, EITHER WAY ═══
     Owner: "The iPhone has a punch hole that's awkward since it goes right
     through the menus."  The Island lands on the LEFT or the RIGHT purely by
     which way the phone was turned, so a fixed side is right for one rotation
     and wrong for the other -- the whole point of measuring it.

     Headless has no Island, so one is SIMULATED at the source of truth:
     resize() reads its insets off #bt-sab-probe's padding, so overriding that
     padding is exactly what a real notch does to it.  Left inset > right
     means the Island is on the LEFT, so the panel must flee to the RIGHT and
     take the world, the gold chip and the dock with it. */
  const flip = await P.page.evaluate(async () => {
    const st = document.createElement('style');
    st.id = 'bt-fake-island';
    st.textContent = '#bt-sab-probe{padding-left:59px!important;padding-right:0px!important}';
    document.head.appendChild(st);
    window.dispatchEvent(new Event('resize'));
    await new Promise((r) => setTimeout(r, 700));
    const cs = getComputedStyle(document.documentElement);
    const c = document.querySelector('canvas').getBoundingClientRect();
    const zh = document.querySelector('.bt-zone-header');
    return {
      side: document.documentElement.getAttribute('data-dash-side'),
      worldX: parseInt(cs.getPropertyValue('--world-x')) || 0,
      padL: parseInt(cs.getPropertyValue('--world-pad-l')) || 0,
      canvasX: Math.round(c.left),
      headerPadL: zh ? Math.round(parseFloat(getComputedStyle(zh).paddingLeft) || 0) : null,
    };
  });
  rec.ok('an Island on the LEFT pushes the whole dashboard to the RIGHT',
    flip.side === 'right' && flip.worldX === 0 && flip.canvasX === 0, flip);
  rec.ok('...and the world keeps its art full-bleed while its HUD clears the Island',
    flip.padL === 59 && flip.headerPadL === 59, flip);
  /* With the panel open on that side, the world must start at 0 and the
     sheet must sit at the far edge -- the mirror of the left-side case. */
  await P.page.evaluate(() => window.__broDashPanelBus.open('dashboard'));
  await P.page.waitForTimeout(900);
  const flipOpen = await geom(P);
  rec.ok('...opening it there yields the world\'s RIGHT edge, not its left',
    flipOpen.side === 'right' && flipOpen.worldX === 0 && flipOpen.canvasX === 0
      && !!flipOpen.sheet && Math.abs(flipOpen.sheet.x - flipOpen.playW) <= 1
      && Math.abs(flipOpen.gold.cx - flipOpen.playW / 2) <= 3, flipOpen);
  /* Put the probe back so nothing after this inherits a fake notch. */
  await P.page.evaluate(async () => {
    const st = document.getElementById('bt-fake-island');
    if (st) st.remove();
    window.__broDashPanelBus.toBar();
    window.dispatchEvent(new Event('resize'));
    await new Promise((r) => setTimeout(r, 500));
  });
  const restored = await geom(P);
  rec.ok('...and with the Island gone the panel returns to the left, world un-offset',
    restored.side === 'left' && restored.worldX === 0 && restored.canvasX === 0, restored);

  /* ═══ v2.3.2177: THE CASE A REAL iPHONE ACTUALLY PRESENTS ═══
     Owner, on the shipped v2.3.2174: "It always displays on the left."  The
     test above passes and always did, because it feeds the rule an
     ASYMMETRIC pair of insets -- and that is not what iOS hands a landscape
     page.  iOS insets BOTH long edges by the same amount (rounded corners on
     both sides), so `insL > insR` was false in both rotations and 'left' was
     the only answer the old rule could give.  The bug lived entirely in the
     gap between what the test simulated and what the device does.

     So: SYMMETRIC insets, exactly as iOS reports them, with the rotation as
     the only thing that differs between the two cases.  If either of these
     comes back 'left' for both angles, the fix has regressed to the bug. */
  const symmetric = async (angle) => P.page.evaluate(async (a) => {
    let st = document.getElementById('bt-fake-island');
    if (!st) { st = document.createElement('style'); st.id = 'bt-fake-island'; document.head.appendChild(st); }
    /* Both edges inset the same, which is the real iOS landscape answer. */
    st.textContent = '#bt-sab-probe{padding-left:59px!important;padding-right:59px!important}';
    /* screen.orientation is read-only; redefine the angle the way a rotation
       would change it.  Same source of truth resolveDashSide() reads. */
    try {
      Object.defineProperty(window.screen.orientation, 'angle', { configurable: true, get: () => a });
    } catch (e) { /* fall back to window.orientation below */ }
    try {
      Object.defineProperty(window, 'orientation', { configurable: true, get: () => a });
    } catch (e) { /* one of the two will have taken */ }
    window.dispatchEvent(new Event('resize'));
    await new Promise((r) => setTimeout(r, 700));
    return {
      angle: a,
      side: document.documentElement.getAttribute('data-dash-side'),
      insets: 'both 59',
    };
  }, angle);

  const at90 = await symmetric(90);
  rec.ok('with iOS\'s symmetric insets, a 90 rotation still picks a side (the v2.3.2174 bug)',
    at90.side === 'right', at90);
  const at270 = await symmetric(270);
  rec.ok('...and turning the phone the other way moves it, rather than pinning left forever',
    at270.side === 'left' && at270.side !== at90.side, { at90, at270 });

  /* The Settings pin overrides both signals, in both rotations -- the escape
     hatch for a rotation mapping this repo cannot verify against hardware. */
  const pinned = await P.page.evaluate(async () => {
    const out = [];
    for (const want of ['left', 'right']) {
      window.__btDashSide(want);            /* dispatches its own resize */
      await new Promise((r) => setTimeout(r, 600));
      out.push({ want, got: document.documentElement.getAttribute('data-dash-side') });
    }
    window.__btDashSide('auto');
    await new Promise((r) => setTimeout(r, 600));
    return { out, back: document.documentElement.getAttribute('data-dash-side') };
  });
  rec.ok('...and a pinned side wins over the rotation, both ways',
    pinned.out.every((o) => o.got === o.want), pinned);
  rec.ok('...with Auto handing the decision back when it is chosen again',
    pinned.back === 'left', pinned);

  await P.ctx.close().catch(() => {});
}
