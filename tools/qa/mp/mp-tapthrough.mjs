/* ═══ A TAP THAT CLOSES A WINDOW TAPS NOTHING UNDER IT (v2.3.3560, docs/specs/tap-through.md) ═══
 *
 * Found on the Points tab (#1070): on a 390 px phone, the ✕ of a shared
 * stat's window (Max HP...) closed the window AND opened the world map.  The
 * owner: "Yes begin the fix".
 *
 * The window closes on the finger's LIFT, and React takes it off the page
 * before the browser sends that tap's click, which then lands on what lies
 * under the finger -- there the minimap's invisible "open the world map"
 * button.  A control that takes its window away on a lift now eats that one
 * click (src/ui/swallowTapClick.js, TRAPS §247); `?tapthrough` is the game as
 * it was.  And on a computer the same button lay OVER the window (#root's
 * `contain: paint` makes the game one layer under the body-level button), so
 * a click on the ✕ opened the map and left the window up (game.css).
 *
 * In the world (`world: 'wheel'`), every coach lesson seeded done:
 *   1. a phone (390 x 844, 3x, a finger): a shared stat's window has its ✕ in
 *      the minimap's box -- the bug's geometry;
 *   2. a finger on that ✕ closes the window and the world map stays shut; the
 *      tap's click is eaten, and it was headed for the map's button;
 *   3. the dim round the window, tapped over the minimap, closes it, the map
 *      shut; "Got it" closes it with the Points tab still there and nothing
 *      opened;
 *   4. a NEW tap on the minimap 0.15 s after a ✕ closed the window opens the
 *      map: only the closing tap's own click is eaten;
 *   5. a weapon stat's taller window: its ✕ closes it, no click gets past;
 *   6. the gear picker's ✕ (ItemDetailPopup) closes it, no click gets past;
 *   7. with `?tapthrough` the same ✕ tap opens the world map: the test sees
 *      the bug as it was;
 *   8. a computer (1366 x 768, a mouse): the ✕ of a shared stat's window is in
 *      the minimap's box and is what a click there hits; the click closes it,
 *      the map stays shut (on main the map's button took it);
 *   9. no page errors.
 * "No click gets past" is read by a listener on <html> in the capture phase,
 * which hears every click the guard (on the document) let through.
 */
import * as H from './harness.mjs';

/* every coach lesson already done (QuestCoach.jsx LESSONS): the first-points
   card would ring this very grid while points wait */
const COACH_DONE = "try { if (!localStorage.getItem('bt_coach_v1')) localStorage.setItem('bt_coach_v1', JSON.stringify("
  + JSON.stringify({ openDash: true, move: true, equip: true, dashAfterTurnIn: true, equipAll: true, cycle: true,
    blockRanged: true, attack: true, special: true, points: true, chatTap: true, passkey: true })
  + ")); } catch (e) {}";

/* every click that got past the guard, and what it landed on */
const CLICK_LOG = "window.__qaClicks = []; document.addEventListener('DOMContentLoaded', () => {"
  + " document.documentElement.addEventListener('click', (e) => { const t = e.target;"
  + " let d = t && t.tagName ? t.tagName.toLowerCase() : String(t);"
  + " if (t && t.attributes) for (const a of t.attributes) { if (a.name.startsWith('data-')) { d += '[' + a.name + ']'; break; } }"
  + " window.__qaClicks.push(d); }, true); });";

async function openPoints(P) {
  const grid = P.page.locator('[data-prog3-grid]').first();
  const tab = P.page.locator('[aria-label="Build"], [aria-label^="Build —"], [aria-label="Points"]').first();
  for (let i = 0; i < 3; i++) {
    if (await grid.isVisible().catch(() => false)) return true;
    if (!(await tab.isVisible().catch(() => false))) {
      await H.openDest(P, 'Character').catch(() => {});
      await tab.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    }
    await tab.click({ timeout: 8000 }).catch(() => {});
    if (await grid.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false)) {
      await P.page.waitForTimeout(600);
      return true;
    }
  }
  return false;
}

const mapOpen = (P) => P.page.evaluate(() => !!document.querySelector('[data-world-map-north]'));
const shutMap = async (P) => {
  await P.page.evaluate(() => window.__btWorldMapOpen && window.__btWorldMapOpen(false));
  await P.page.waitForTimeout(500);
};
const shutWindow = async (P) => {
  await P.page.evaluate(() => window.__btInfoPopup && window.__btInfoPopup.close());
  await P.page.waitForTimeout(400);
};
const popupUp = (P) => P.page.evaluate(() => !!document.querySelector('[data-infopopup]'));
const clicksSeen = (P) => P.page.evaluate(() => (window.__qaClicks || []).length);
const clicksSince = (P, n) => P.page.evaluate((k) => (window.__qaClicks || []).slice(k), n);
const tapClicks = (P) => P.page.evaluate(() => {
  const t = window.__btTapClicks;
  return t ? { eaten: t.eaten, last: t.last, off: !!t.off } : null;
});

/* where things are while a stat window is up */
const windowGeo = (P) => P.page.evaluate(() => {
  const d = (el) => {
    if (!el || !el.tagName) return null;
    let s = el.tagName.toLowerCase();
    for (const a of el.attributes) { if (a.name.startsWith('data-')) { s += '[' + a.name + ']'; break; } }
    return s;
  };
  const x = document.querySelector('[data-infopopup-x]');
  const b = document.querySelector('[data-world-map-open]');
  const card = document.querySelector('[data-infopopup-card]');
  if (!x || !b || !card) return null;
  const xr = x.getBoundingClientRect(), br = b.getBoundingClientRect(), cr = card.getBoundingClientRect();
  const xc = { x: xr.left + xr.width / 2, y: xr.top + xr.height / 2 };
  const inMap = (p) => p.x >= br.left && p.x <= br.right && p.y >= br.top && p.y <= br.bottom;
  /* a point of the dim round the window inside the minimap's box: right of
     the card, or above it */
  let dim = null;
  if (br.right - cr.right > 8) dim = { x: (cr.right + br.right) / 2, y: (br.top + br.bottom) / 2 };
  else if (cr.top - br.top > 8) dim = { x: (br.left + br.right) / 2, y: (br.top + cr.top) / 2 };
  return { x: xc, xOverMap: inMap(xc), xHit: d(document.elementFromPoint(xc.x, xc.y)),
    map: { x: (br.left + br.right) / 2, y: (br.top + br.bottom) / 2 },
    dim, dimHit: dim && d(document.elementFromPoint(dim.x, dim.y)) };
});

/* a stat window, opened as a player opens it (a finger, or a mouse) */
async function openStat(P, row, mouse) {
  const at = await P.page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }, row);
  if (!at) return false;
  if (mouse) await P.page.mouse.click(at.x, at.y); else await P.page.touchscreen.tap(at.x, at.y);
  const up = await P.page.locator('[data-infopopup-x]').first().waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
  await P.page.waitForTimeout(700);
  return up;
}

const tap = (P, p) => P.page.touchscreen.tap(Math.round(p.x), Math.round(p.y));

async function phone(P, rec, errs, wsPort) {
  const id = await H.readState(P, (S) => S.myId);
  const zone = await H.readState(P, (S) => S.currentZone);
  rec.ok(`phone: in the world (zone "${zone}"), not the retired old map`, zone === 'wheel', { zone });
  await H.devOp(wsPort, 'kit', id, { what: 'levels' });
  rec.ok('phone: the Points tab opens', await openPoints(P));

  /* ── 1-2. the shared stat's ✕, over the minimap ── */
  rec.ok('phone: a shared stat\'s window opens', await openStat(P, '[data-prog3-row^="shared:"]'));
  const g = await windowGeo(P);
  rec.ok('phone: its ✕ lies in the minimap\'s box (the bug\'s geometry) and is what a finger there touches',
    !!g && g.xOverMap && g.xHit === 'button[data-infopopup-x]', g);
  const t0 = await tapClicks(P);
  let seen = await clicksSeen(P);
  await tap(P, g.x);
  await P.page.waitForTimeout(1200);
  const t1 = await tapClicks(P);
  rec.ok('phone: a finger on that ✕ closes the window, and the world map stays shut',
    !(await popupUp(P)) && !(await mapOpen(P)));
  rec.ok('phone: ...that tap\'s click was eaten, and it was headed for the world map\'s button',
    !!t1 && t1.eaten === (t0 ? t0.eaten : 0) + 1 && /data-world-map-open/.test((t1.last && t1.last.on) || ''), { t0, t1 });
  rec.ok('phone: ...and no click got past', (await clicksSince(P, seen)).length === 0, await clicksSince(P, seen));
  if (await mapOpen(P)) await shutMap(P);

  /* ── 3. the dim round the window, over the minimap; and "Got it" ── */
  await openStat(P, '[data-prog3-row^="shared:"]');
  const g2 = await windowGeo(P);
  rec.ok('phone: the dim round the window covers part of the minimap', !!(g2 && g2.dim) && g2.dimHit === 'div[data-infopopup]', g2);
  if (g2 && g2.dim) {
    seen = await clicksSeen(P);
    await tap(P, g2.dim);
    await P.page.waitForTimeout(1200);
    rec.ok('phone: a finger on the dim there closes the window, the map shut, no click past',
      !(await popupUp(P)) && !(await mapOpen(P)) && (await clicksSince(P, seen)).length === 0, await clicksSince(P, seen));
    if (await mapOpen(P)) await shutMap(P);
  }
  if (await popupUp(P)) await shutWindow(P);
  /* a window with nothing to spend wears "Got it" (a stat window with
     points to spend has the stepper in its place, InfoPopup v2.3.2695): one
     as the Equipment tab's pills open it, through the game's own bus */
  await P.page.evaluate(() => window.__btInfoPopup && window.__btInfoPopup.open({
    title: 'Max HP', body: 'How much damage you can take before you fall.', stat: '250' }));
  await P.page.locator('[data-infopopup-close]').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  await P.page.waitForTimeout(500);
  const got = await P.page.evaluate(() => {
    const b = document.querySelector('[data-infopopup-close]');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (got) {
    seen = await clicksSeen(P);
    await tap(P, got);
    await P.page.waitForTimeout(1200);
    const gridUp = await P.page.locator('[data-prog3-grid]').first().isVisible().catch(() => false);
    rec.ok('phone: "Got it" closes the window, the Points tab still there, nothing opened and no click past',
      !(await popupUp(P)) && !(await mapOpen(P)) && gridUp && (await clicksSince(P, seen)).length === 0,
      { gridUp, past: await clicksSince(P, seen) });
  } else {
    rec.ok('phone: the window has a "Got it" to tap', false, 'no [data-infopopup-close]');
    await shutWindow(P);
  }

  /* ── 4. a new tap, a moment later, is the player's ── */
  await openStat(P, '[data-prog3-row^="shared:"]');
  const g4 = await windowGeo(P);
  await tap(P, g4.x);
  await P.page.waitForTimeout(150);
  await tap(P, g4.map);
  const opened = await P.page.waitForFunction(() => !!document.querySelector('[data-world-map-north]'), null, { timeout: 5000 })
    .then(() => true).catch(() => false);
  rec.ok('phone: a NEW tap on the minimap 0.15 s after the ✕ closed the window opens the world map', opened && !(await popupUp(P)));
  if (await mapOpen(P)) await shutMap(P);

  /* ── 5. a weapon stat's taller window ── */
  rec.ok('phone: a weapon stat\'s window opens', await openStat(P, '[data-prog3-row^="sword:"]'));
  const g5 = await windowGeo(P);
  seen = await clicksSeen(P);
  await tap(P, g5.x);
  await P.page.waitForTimeout(1200);
  rec.ok('phone: its ✕ closes it, the map shut and no click past',
    !(await popupUp(P)) && !(await mapOpen(P)) && (await clicksSince(P, seen)).length === 0, { g5, past: await clicksSince(P, seen) });

  /* ── 6. the gear picker's ✕ (over the world, above the band) ── */
  await P.page.evaluate(() => window._itemDetailBus && window._itemDetailBus.open({ kind: 'loadout', slot: 'weapon', anchor: null, panel: null }));
  const px = await P.page.waitForFunction(() => {
    const b = document.querySelector('button[aria-label="Close"][data-esc="up"]:not([data-infopopup-x])');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return r.width > 0 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  }, null, { timeout: 8000 }).then((h) => h.jsonValue()).catch(() => null);
  rec.ok('phone: the gear picker opens with its ✕', !!px);
  if (px) {
    await P.page.waitForTimeout(500);
    seen = await clicksSeen(P);
    await tap(P, px);
    await P.page.waitForTimeout(1200);
    const still = await P.page.evaluate(() => !!(window._itemDetailBus && window._itemDetailBus.state.open));
    rec.ok('phone: the gear picker\'s ✕ closes it and no click gets past to the world under it',
      !still && (await clicksSince(P, seen)).length === 0, { still, past: await clicksSince(P, seen) });
  }
  rec.ok('phone: no page errors', errs.length === 0, errs.slice(0, 3));
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1-6: a phone ── */
  {
    const P = await H.newPlayer(browser, { name: 'Tapless', wsPort, webPort,
      viewport: { width: 390, height: 844 }, touch: true, dpr: 3, world: 'wheel', init: COACH_DONE + CLICK_LOG });
    const errs = [];
    P.page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
    try {
      await H.enterWorld(P);
      await P.page.waitForTimeout(1500);
      await phone(P, rec, errs, wsPort);
    } finally { await P.ctx.close().catch(() => {}); }
  }

  /* ── 7: the game as it was ── */
  {
    const P = await H.newPlayer(browser, { name: 'Tapthru', wsPort, webPort, query: 'tapthrough',
      viewport: { width: 390, height: 844 }, touch: true, dpr: 3, world: 'wheel', init: COACH_DONE });
    try {
      await H.enterWorld(P);
      await P.page.waitForTimeout(1500);
      const id = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'kit', id, { what: 'levels' });
      await openPoints(P);
      await openStat(P, '[data-prog3-row^="shared:"]');
      const g = await windowGeo(P);
      await tap(P, g.x);
      const opened = await P.page.waitForFunction(() => !!document.querySelector('[data-world-map-north]'), null, { timeout: 5000 })
        .then(() => true).catch(() => false);
      const t = await tapClicks(P);
      rec.ok('?tapthrough (the game as it was): the same ✕ tap opens the world map -- the test sees the bug',
        opened && !!t && t.off && t.eaten === 0, { opened, t });
    } finally { await P.ctx.close().catch(() => {}); }
  }

  /* ── 8: a computer ── */
  {
    const P = await H.newPlayer(browser, { name: 'Tapdesk', wsPort, webPort,
      viewport: { width: 1366, height: 768 }, world: 'wheel', init: COACH_DONE });
    const errs = [];
    P.page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
    try {
      await H.enterWorld(P);
      await P.page.waitForTimeout(1500);
      const id = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'kit', id, { what: 'levels' });
      rec.ok('computer: the Points tab opens', await openPoints(P));
      rec.ok('computer: a shared stat\'s window opens', await openStat(P, '[data-prog3-row^="shared:"]', true));
      const g = await windowGeo(P);
      rec.ok('computer: its ✕ lies in the minimap\'s box, and a click there hits the ✕, not the map\'s button',
        !!g && g.xOverMap && g.xHit === 'button[data-infopopup-x]', g);
      await P.page.mouse.click(Math.round(g.x.x), Math.round(g.x.y));
      await P.page.waitForTimeout(1200);
      rec.ok('computer: the click closes the window and the world map stays shut', !(await popupUp(P)) && !(await mapOpen(P)));
      rec.ok('computer: no page errors', errs.length === 0, errs.slice(0, 3));
    } finally { await P.ctx.close().catch(() => {}); }
  }
}
