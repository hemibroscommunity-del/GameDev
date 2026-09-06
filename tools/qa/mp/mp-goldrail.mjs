/* ═══ THE PURSE MOVES TO THE ZONE RAIL, AND THE BUTTONS TAKE ITS ROOM (v2.3.2320) ═══
 *
 * Owner, in one message: "Make the 5 dashboard navigation buttons wider to
 * increase tap surface you can just center the button icon images.  Move gold
 * amount display to very top right on the top bar that lists the zone name."
 *
 * They are one change.  The band's identity row had no slack — measured, its
 * children came to 486px inside 382 — so the buttons could only get wider if
 * something left the row, and the thing the owner wanted moved is what left.
 *
 * WHAT THIS HAS TO PROVE, beyond "a number appears in the header":
 *
 *   1. It MOVED.  Two live gold counts on one screen disagree the moment one
 *      of them lags — the rule that retired the v2.3.1563 floating chip.  So
 *      this counts every gold readout on the screen and requires exactly one,
 *      in portrait AND in landscape (where the count used to be a separate
 *      component, `.bt-land-gold`, at the world's bottom centre).
 *
 *   2. The buttons are actually wider, at more than one width.  docs/UI-BIBLE
 *      sets the bar: "Touch targets: 44x44pt minimum for anything tappable
 *      (Apple HIG)."  They measured 36 x 44 before this.
 *
 *   3. THE REGRESSION THE ROOM PAYS FOR.  With the purse in the row, a drilled
 *      panel (More > Settings) pushed the rail off the screen: the "More"
 *      button's centre sat 22px past the right edge of a 390px phone, not
 *      clipped — the row is overflow:visible — just gone.  Nothing caught it,
 *      because a covered or off-screen element still reports a fine rect, and
 *      QuestCoach's Login Key lesson (the only prompt that tells a player how
 *      not to lose their character) hit-tests that exact button and retires
 *      itself in silence when it cannot be reached.  So this hit-tests every
 *      nav button's own centre, drilled, with elementFromPoint — the check
 *      that is red on the build before this one.
 *
 *   4. The rail does not steal touches from the world.  It is
 *      pointer-events:none and the purse must inherit that, or a readout over
 *      the world eats taps meant for the game under it.
 */
import * as H from './harness.mjs';

const GOLD = 1234567;
const GOLD_TXT = '1,234,567';

const setGold = (P, n) => P.page.evaluate((v) => {
  const S = window._gameState.current;
  S.rpg.coins = v;
  try { window.__broDashPanelBus.toBar(); } catch (e) {}
}, n);

/* Every element on the screen that PRINTS the formatted purse, counted as
   leaves so one number does not read as four nested boxes.  This is the
   one-count rule's only honest measurement: not "is it in the header" but
   "how many are there". */
const goldCounts = (P, txt) => P.page.evaluate((t) => {
  const hit = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length) continue;
    const s = (el.textContent || '').trim();
    if (s.indexOf(t) === -1) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    let where = 'loose';
    if (el.closest('.bt-zone-header')) where = 'zone-header';
    else if (el.closest('.bt-land-gold')) where = 'land-gold';
    else if (el.closest('.bt-dashboard')) where = 'dashboard';
    hit.push({ where, x: Math.round(r.left), y: Math.round(r.top),
      right: Math.round(r.right), w: Math.round(r.width) });
  }
  return hit;
}, txt);

const railGeom = (P) => P.page.evaluate(() => {
  const btns = [...document.querySelectorAll('.bt-navrail [data-nav]')];
  return btns.map((b) => {
    const r = b.getBoundingClientRect();
    const img = b.querySelector('img');
    const ir = img ? img.getBoundingClientRect() : null;
    const cx = Math.round(r.left + r.width / 2);
    const cy = Math.round(r.top + r.height / 2);
    const top = document.elementFromPoint(cx, cy);
    return {
      id: b.getAttribute('data-nav'),
      w: Math.round(r.width), h: Math.round(r.height),
      left: Math.round(r.left), right: Math.round(r.right),
      cx, cy,
      /* Is the button's own centre the thing a finger would find there?
         `null` means nothing at all answered — off-screen. */
      answers: top ? (top.closest('[data-nav]') === b ? 'self'
        : (top.closest('[data-nav]') ? 'other-nav' : top.tagName)) : null,
      /* The icon's centre against the button's, both axes.  "You can just
         center the button icon images" is the owner's own instruction for
         what the extra width should do with the glyph. */
      dx: ir ? Math.round((ir.left + ir.width / 2) - cx) : null,
      dy: ir ? Math.round((ir.top + ir.height / 2) - cy) : null,
      /* ═══ v2.3.2321: THE CORNERS HAVE TO BE ALIVE ═══
         border-radius clips HIT-TESTING, not just paint, so a round button's
         corners are not merely empty -- they are dead, and a rect that only
         looks like a rect would pass every width check above while giving the
         thumb nothing back.  Measured 5px inside each corner of the button's
         own box: circles answered 0 of 20 corner probes, the rects answer 20. */
      corners: (() => {
        const IN = 5;
        const at = (x, y) => {
          const el = document.elementFromPoint(Math.round(x), Math.round(y));
          return !!(el && el.closest('[data-nav]') === b);
        };
        return [at(r.left + IN, r.top + IN), at(r.right - IN, r.top + IN),
          at(r.left + IN, r.bottom - IN), at(r.right - IN, r.bottom - IN)]
          .filter(Boolean).length;
      })(),
      radius: getComputedStyle(b).borderRadius,
    };
  });
});

const headerGeom = (P) => P.page.evaluate(() => {
  const h = document.querySelector('.bt-zone-header');
  const b = document.querySelector('.bt-zone-header__balance');
  const t = document.querySelector('.bt-zone-header__title');
  const rr = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(r.right),
      top: Math.round(r.top), bottom: Math.round(r.bottom),
      w: Math.round(r.width), h: Math.round(r.height) }; };
  const bR = rr(b);
  return {
    header: rr(h), balance: bR, title: rr(t),
    titleText: t ? (t.textContent || '').trim() : null,
    balanceText: b ? (b.textContent || '').trim() : null,
    /* pointer-events INHERITS, so the honest check is what actually answers
       at the readout's centre -- the world, not the rail. */
    pe: b ? getComputedStyle(b).pointerEvents : null,
    answersAtGold: bR ? (() => {
      const el = document.elementFromPoint(bR.left + bR.w / 2, bR.top + bR.h / 2);
      return el ? (el.closest('.bt-zone-header') ? 'header' : el.tagName) : null;
    })() : null,
    hasPurse: !!document.querySelector('.bt-zone-header [data-purse]'),
    landGold: !!document.querySelector('.bt-land-gold'),
    vw: window.innerWidth,
  };
});

/* `minW` is what the DERIVED width comes out at on that phone, not one flat
   number.  44 is the UI-BIBLE floor and 390+ reaches it; a 360 has to fit the
   same five buttons beside a CLOSE pill and a back chip in 30 fewer pixels and
   lands at 40.  Asserting 44 everywhere would have been an assertion that is
   red on both sides of the change, which proves nothing about it -- what the
   change owes every phone is "wider than the 36 it was", and the touch floor
   where the width exists to give. */
const PHONES = [
  { width: 390, height: 844, tag: 'iPhone 13/14/15', minW: 44 },
  { width: 360, height: 780, tag: 'small Android', minW: 40 },
];

export async function run({ browser, wsPort, webPort, rec }) {
  for (const ph of PHONES) await onePhone({ browser, wsPort, webPort, rec }, ph);
  await landscape({ browser, wsPort, webPort, rec });
}

async function onePhone({ browser, wsPort, webPort, rec }, phone) {
  const T = phone.width + 'w: ';
  const P = await H.newPlayer(browser, {
    name: 'Gld' + phone.width, wsPort, webPort,
    viewport: { width: phone.width, height: phone.height }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2200);
  await setGold(P, GOLD);
  await P.page.waitForTimeout(700);

  const hd = await headerGeom(P);
  rec.ok(T + 'the purse is IN the zone-name rail, printing the real balance',
    !!hd.balance && hd.hasPurse && (hd.balanceText || '').indexOf(GOLD_TXT) !== -1, hd.balance);
  rec.ok(T + '...at the rail\'s right end, not floating in the middle of it',
    !!hd.balance && !!hd.header && (hd.header.right - hd.balance.right) <= 14
      && hd.balance.left > hd.header.left + hd.header.w / 2,
    { header: hd.header, balance: hd.balance });
  rec.ok(T + '...clear of the zone title, which still has the middle',
    !!hd.title && !!hd.balance && hd.title.right <= hd.balance.left + 1
      && (hd.titleText || '').length > 0,
    { title: hd.title, titleText: hd.titleText, balance: hd.balance });
  /* The rail floats over the live world.  A readout that took a touch would
     take it from the game, which is why the rail is pointer-events:none and
     only the logout chip opts back in. */
  rec.ok(T + '...and takes NO touches -- the world still answers under it',
    hd.pe === 'none' && hd.answersAtGold !== 'header',
    { pe: hd.pe, answers: hd.answersAtGold });

  const counts = await goldCounts(P, GOLD_TXT);
  rec.ok(T + 'exactly ONE gold count on the screen, and it is the rail\'s',
    counts.length === 1 && counts[0].where === 'zone-header', counts);

  const rail = await railGeom(P);
  rec.ok(T + 'all five nav buttons are there', rail.length === 5, rail.map((b) => b.id));
  /* 44x44 is docs/UI-BIBLE's floor for anything tappable.  The WIDTH is what
     the owner asked for and what this change buys; the height is derived from
     identityRowHeight and is 40 on a <=720-tall phone, which is why only the
     width is held to 44 here (sheetGeometry says so at the ceiling). */
  rec.ok(T + '...each wider than the 36 they were, and ' + phone.minW + ' here',
    rail.every((b) => b.w >= phone.minW && b.w > 36),
    rail.map((b) => b.id + ':' + b.w + 'x' + b.h));
  rec.ok(T + '...with the icon still centred in the wider box, both axes',
    rail.every((b) => b.dx !== null && Math.abs(b.dx) <= 1 && Math.abs(b.dy) <= 2),
    rail.map((b) => b.id + ':' + b.dx + ',' + b.dy));
  /* The owner asked for rectangles to reclaim the corners the circles threw
     away; this is the assertion that the corners came back.  A shape-only
     check (radius !== 999px) would pass on a rect that some later overlay
     covers -- what matters is whether a finger there reaches the button. */
  rec.ok(T + '...and all four corners of each button are LIVE, not clipped away',
    rail.every((b) => b.corners === 4),
    rail.map((b) => b.id + ':' + b.corners + '/4 r=' + b.radius));
  rec.ok(T + '...every one of them on screen and answering its own centre',
    rail.every((b) => b.answers === 'self' && b.left >= 0 && b.right <= phone.width),
    rail.map((b) => b.id + ':' + b.answers + ' [' + b.left + '..' + b.right + ']'));

  /* ═══ THE DRILLED SCREEN — where the rail used to fall off the phone ═══ */
  await P.page.evaluate(() => window.__broDashPanelBus.open('more'));
  await P.page.waitForTimeout(600);
  await H.clickText(P, 'Settings', { timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(800);
  const drilled = await P.page.evaluate(() => {
    const bus = window.__broDashPanelBus;
    const row = document.querySelector('[data-dash-fold]');
    const r = row ? row.parentElement : null;
    return {
      stack: (bus && bus.state && bus.state.stack) ? bus.state.stack.length : 0,
      mode: (bus && bus.state && bus.state.mode) || null,
      scrollW: r ? r.scrollWidth : null, clientW: r ? r.clientWidth : null,
    };
  });
  const railD = await railGeom(P);
  rec.ok(T + 'DRILLED: the row no longer overflows its own width',
    drilled.scrollW !== null && drilled.scrollW <= drilled.clientW + 1, drilled);
  rec.ok(T + 'DRILLED: every nav button is still on screen and hit-testable',
    railD.length === 5
      && railD.every((b) => b.answers === 'self' && b.left >= 0 && b.right <= phone.width),
    railD.map((b) => b.id + ':' + b.answers + ' [' + b.left + '..' + b.right + ']'));
  /* The one the silent failure was actually about. */
  const more = railD.find((b) => b.id === 'more');
  rec.ok(T + 'DRILLED: the More button -- the Login Key lesson\'s anchor -- is reachable',
    !!more && more.answers === 'self' && more.cx < phone.width, more);
  /* The purse does not come back on a drilled screen either. */
  const dCounts = await goldCounts(P, GOLD_TXT);
  rec.ok(T + 'DRILLED: still exactly one gold count, still the rail\'s',
    dCounts.length === 1 && dCounts[0].where === 'zone-header', dCounts);

  await P.ctx.close();
}

/* ═══ SIDEWAYS ═══
 * The count used to be its own component here (`.bt-land-gold`, a chip at the
 * world's bottom centre) because the band does not exist in landscape and the
 * rail had only a spacer.  The rail has a purse column now and it narrows to
 * the world's width sideways, so the chip would be a second live count. */
async function landscape({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'GldLand', wsPort, webPort,
    viewport: { width: 844, height: 390 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2600);
  await setGold(P, GOLD);
  await P.page.waitForTimeout(900);

  const hd = await headerGeom(P);
  const counts = await goldCounts(P, GOLD_TXT);
  rec.ok('LANDSCAPE: the purse is in the rail, and the bottom-centre chip is gone',
    !!hd.balance && hd.hasPurse && !hd.landGold, { balance: hd.balance, landGold: hd.landGold });
  rec.ok('LANDSCAPE: exactly one gold count, in the rail',
    counts.length === 1 && counts[0].where === 'zone-header', counts);

  /* ═══ THE ISLAND ═══
   * Sideways the rail takes the notch as PADDING (game.css's landscape block)
   * and the purse is the element that padding protects -- it is the thing at
   * the edge the Island eats.  mp-landscape-dash fakes the notch on the LEFT;
   * the purse needs the right. */
  await P.page.evaluate(() => {
    const st = document.createElement('style');
    st.id = 'bt-fake-island';
    st.textContent = ':root{--world-pad-r:59px!important}';
    document.head.appendChild(st);
    window.dispatchEvent(new Event('resize'));
  });
  await P.page.waitForTimeout(700);
  const isl = await headerGeom(P);
  rec.ok('LANDSCAPE: an Island on the right pushes the purse clear of it',
    !!isl.balance && !!isl.header && (isl.header.right - isl.balance.right) >= 55,
    { header: isl.header, balance: isl.balance });
  await P.ctx.close();
}
