/* ═══ ONE DASHBOARD ON EVERY SCREEN (v2.3.4072; v2.3.4092: THE DEFAULT) ═══
 *
 * The owner: "unification of all different screen types ... to use the same
 * layout and just scale differences to screen size ... I like the 1/3 idea
 * where the menu takes up that much of the bottom of the screen even in
 * layout orientation", with "responsive density rather than uniform scaling
 * ... Use the available space to determine the number of inventory slots".
 * v2.3.4092, the owner: "Move the left side menu to the bottom of screen on
 * computer and all other devices" -- ON by default, `?oneband=0` the side
 * column for one device (src/ui/oneBand.js, docs/specs/one-band.md).
 *
 * Three screens in the Wheel's BroTown, each with NOTHING asked (the
 * default): an upright phone (390 x 844), a phone on its side (844 x 390) and
 * a computer playing wide (1280 x 720, `wide: true`).  On each:
 *   - the upright layout draws (data-orient "portrait", the band at the
 *     bottom, the nav row in it, no side sheet, no keys strip);
 *   - the band is at most a third of the screen and never taller than an
 *     upright phone's 243 (v2.3.4092: today's height, the owner), and an
 *     upright phone's band is the upright band it always was;
 *   - the bag's tiles fit the box: every tile of the first row inside the bag
 *     panel, the panel and the combat cards inside the row, the tile at least
 *     the touch minimum, the counts as many as the box holds;
 *   - a page (Quests) opens INSIDE the band, at the band's own height;
 *   - the world's canvas sits above the band, no wider than 2.2:1 (bars at
 *     its sides past that), and on a phone the two joysticks sit above it;
 *   - on a computer the nav buttons keep their key caps, every key (I P J L K
 *     O) opens its page inside the band and Esc closes it, the controls list
 *     starts folded to its ⌨ (no list over the world) and H opens it.
 * Then the device's choice (v2.3.4092): no key and the old "on" ('1') both
 * read on; `?oneband=0` turns it off and the device keeps the off; `?oneband=1`
 * clears it.  And the old layout, still reachable: a sideways phone with
 * `?oneband=0` plays the side column (data-orient "landscape", no band) --
 * the full old-layout suites are landdash and deskwide (both `?oneband=0`).
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* pictures for the PR and the owner (tools/qa/mp/out/, not committed) */
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out');
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `oneband-${name}.png`) }); } catch (e) { /* a picture only */ } };

const MIN_TILE = 44;          /* sheetGeometry ONE_BAND_TILE_MIN (UI-BIBLE's touch minimum) */
const WORLD_MAX_ASPECT = 2.2; /* sheetGeometry ONE_BAND_WORLD_MAX_ASPECT (game.css's world rule) */
const OVERLAP = 14;           /* sheetGeometry DASH_OVERLAP: the canvas runs under the band's corners */

const read = (P) => P.page.evaluate(() => {
  const o = window.__btOneBand ? window.__btOneBand() : null;
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return b.width > 0 ? { x: Math.round(b.left), y: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) } : null; };
  const cols = document.querySelector('[data-one-band-cols]');
  const bag = cols && cols.querySelector('[aria-label="Bag"]');
  const combat = cols && cols.querySelector('[aria-label="Combat"]');
  /* the bag's grid: the element whose children are the tiles */
  const grid = bag && Array.from(bag.querySelectorAll('div')).find((d) => getComputedStyle(d).display === 'grid');
  const tiles = grid ? Array.from(grid.children).map(r) : [];
  const joy = ['.bt-joystick-base', '.bt-rjoy-base'].map((s) => r(document.querySelector(s)));
  const desk = window.__btDeskWide ? window.__btDeskWide() : null;
  return {
    o, bag: r(bag), combat: r(combat), tiles, joy, desk,
    navs: Array.from(document.querySelectorAll('.bt-dashboard [data-nav]')).map((n) => ({ id: n.getAttribute('data-nav'), key: n.getAttribute('data-key'), box: r(n) })),
    landSheet: !!document.querySelector('.bt-land-sheet'),
    keysStrip: r(document.querySelector('.bt-desk-keys')),
    mode: window.__broDashPanelBus ? window.__broDashPanelBus.state.mode : null,
    root: window.__broDashPanelBus ? window.__broDashPanelBus.state.stack[0] : null,
  };
});

async function screen(browser, wsPort, webPort, rec, { label, viewport, touch, wide, query }) {
  const P = await H.newPlayer(browser, {
    name: 'One' + label.replace(/[^A-Za-z]/g, '').slice(0, 8), wsPort, webPort,
    world: 'wheel', viewport, touch: !!touch, wide: !!wide, query: query || '',
  });
  try {
    await H.enterWorld(P);
    await P.page.waitForTimeout(2500);
    /* a first join arrives folded (v2.3.2495): unfold, as a player taps OPEN */
    await H.unfoldBand(P);
    await P.page.waitForTimeout(800);
    return P;
  } catch (e) {
    await P.ctx.close().catch(() => {});
    throw e;
  }
}

async function oneBandChecks(P, rec, { label, viewport, upright, computer }) {
  const W = viewport.width, Hh = viewport.height;
  const third = Math.round(Hh / 3);
  const g = await read(P);
  const o = g.o || {};
  console.log(`    [${label}] ` + JSON.stringify({ orient: o.orient, dashH: o.dashH, colsH: o.colsH, playW: o.playW, worldX: o.worldX, band: o.band, cols: o.cols, canvas: o.canvas, layout: o.layout }));

  rec.ok(`${label}: the switch is on, and the upright layout draws (data-orient portrait, no side sheet)`,
    o.on === true && o.orient === 'portrait' && !g.landSheet, { on: o.on, orient: o.orient, landSheet: g.landSheet });
  rec.ok(`${label}: the band is at the screen's foot, at most a third of it (${third} px)`,
    !!o.band && o.band.h <= third + 1 && o.band.h <= 243 + 1 && Math.abs(o.band.y + o.band.h - Hh) <= 1 && o.dashH <= third + 1,
    { band: o.band, dashH: o.dashH, third });
  if (upright) {
    /* the upright band it always was: 52 + 191 at 390 x 844 (sheetGeometry
       barHeight), 4 x 2 slots of the upright tile with the filter header */
    rec.ok(`${label}: an upright phone's band is the upright band (243 px, 4 x 2 slots, the header)`,
      o.dashH === 243 && !!o.layout && o.layout.cols === 4 && o.layout.rows === 2 && o.layout.header === true,
      { dashH: o.dashH, layout: o.layout });
  }
  const navTop = g.navs.filter((n) => n.box);
  rec.ok(`${label}: the nav row is in the band, every button on the screen`,
    navTop.length >= 6 && navTop.every((n) => n.box.y >= o.band.y - 1 && n.box.b <= Hh + 1 && n.box.x >= -1 && n.box.r <= W + 1),
    navTop.map((n) => ({ id: n.id, box: n.box })));

  /* ── the bag's tiles fit the box ── */
  const L = o.layout;
  const row1 = L ? g.tiles.slice(0, L.cols).filter(Boolean) : [];
  rec.ok(`${label}: the columns row laid out from its box (${L ? L.cols + ' x ' + L.rows + ' of ' + L.tile + ' px' : 'no layout'})`,
    !!L && !!o.cols && L.w === Math.floor(o.cols.w) && L.h === Math.floor(o.cols.h) && L.tile >= MIN_TILE
      && L.cols * (L.tile + 4) <= o.cols.w + 4,
    { layout: L, cols: o.cols });
  rec.ok(`${label}: the first row of tiles inside the bag panel, the panel and the combat cards inside the row`,
    !!g.bag && !!g.combat && row1.length === (L ? L.cols : -1)
      && row1.every((t) => t.x >= g.bag.x && t.r <= g.bag.r && t.y >= g.bag.y && Math.abs(t.w - L.tile) <= 1)
      && g.bag.x >= o.cols.x - 1 && g.combat.r <= o.cols.x + o.cols.w + 1
      && g.bag.b <= o.cols.y + o.cols.h + 1 && g.combat.b <= o.cols.y + o.cols.h + 1
      && g.bag.r <= g.combat.x,
    { bag: g.bag, combat: g.combat, row1, cols: o.cols });
  /* responsive density: a wider box holds more slots than the upright four */
  if (!upright) {
    rec.ok(`${label}: the wider box holds more slots across than the upright four`,
      !!L && L.cols > 4, { cols: L && L.cols });
  }

  /* ── the world above ── */
  const cv = o.canvas;
  const worldH = cv ? Math.min(cv.h, o.band.y - cv.y) : 0;
  rec.ok(`${label}: the world's canvas sits above the band (its foot under the band's corners only)`,
    !!cv && cv.y <= 1 && cv.y + cv.h <= o.band.y + OVERLAP + 1, { canvas: cv, bandTop: o.band && o.band.y });
  rec.ok(`${label}: the world is no wider than ${WORLD_MAX_ASPECT}:1 above the band, centred (bars at its sides past that)`,
    !!cv && cv.w / Math.max(1, worldH) <= WORLD_MAX_ASPECT + 0.02
      && Math.abs(cv.x - (W - cv.w) / 2) <= 2 && Math.abs(cv.w - o.playW) <= 1,
    { canvas: cv, worldH, aspect: cv ? +(cv.w / Math.max(1, worldH)).toFixed(3) : null, playW: o.playW, worldX: o.worldX });
  if (!computer) {
    rec.ok(`${label}: both joysticks sit above the band, inside the world`,
      g.joy.every((j) => j && j.b <= o.band.y + 1 && j.x >= cv.x - 1 && j.r <= cv.x + cv.w + 1),
      { joy: g.joy, bandTop: o.band.y, canvas: cv });
  }

  /* ── a page opens inside the band ── */
  const slug = label.replace(/[^a-z]+/gi, '-');
  await shot(P, slug + '-rest');
  const rest = o.band;
  await H.openDest(P, 'Quests');
  await P.page.waitForTimeout(900);
  await shot(P, slug + '-quests');
  const open = await read(P);
  const ob = open.o && open.o.band;
  rec.ok(`${label}: Quests opens INSIDE the band, at the band's own height`,
    open.mode === 'expanded' && open.root === 'quests' && !!ob && Math.abs(ob.h - rest.h) <= 1 && Math.abs(ob.y - rest.y) <= 1,
    { mode: open.mode, root: open.root, rest, open: ob });
  await H.closeDest(P);
  await P.page.waitForTimeout(500);

  if (computer) {
    rec.ok(`${label}: a computer plays the upright layout -- no side column, no keys strip (the class still frees the shell)`,
      !!g.desk && g.desk.on === true && g.desk.active === false && !g.keysStrip,
      { desk: g.desk, keysStrip: g.keysStrip });
    rec.ok(`${label}: the nav buttons keep their key caps (I P J L K O)`,
      ['dashboard', 'hero', 'quests', 'skills', 'encyclopedia', 'more'].every((id) => (g.navs.find((n) => n.id === id) || {}).key),
      g.navs.map((n) => ({ id: n.id, key: n.key })));
    /* v2.3.4092: every page key opens its page inside the band, and Esc
       closes it (deskKeys.js; the key each button wears is the key it obeys) */
    const caps = g.navs.filter((n) => n.key && n.id !== 'dashboard').map((n) => ({ id: n.id, key: n.key }));
    const keyed = [];
    for (const c of caps) {
      await P.page.keyboard.press(c.key.toLowerCase());
      await P.page.waitForTimeout(700);
      const k = await read(P);
      await P.page.keyboard.press('Escape');
      await P.page.waitForTimeout(600);
      const e = await read(P);
      keyed.push({ ...c, mode: k.mode, root: k.root, h: k.o && k.o.band && k.o.band.h, after: e.mode });
    }
    rec.ok(`${label}: each page key opens its page inside the band at the band's height, and Esc closes it`,
      caps.length >= 5 && keyed.every((k) => k.mode === 'expanded' && Math.abs((k.h || 0) - rest.h) <= 1 && k.after === 'bar'),
      keyed);
    /* I is the bag: at rest it folds the band away and brings it back (the
       fold control's job, deskKeys.js navKey) */
    const fold = () => P.page.evaluate(() => { const b = document.querySelector('[data-dash-fold]'); return b ? b.getAttribute('data-dash-fold') : null; });
    const f0 = await fold();
    await P.page.keyboard.press('i');
    await P.page.waitForTimeout(700);
    const f1 = await fold();
    await P.page.keyboard.press('i');
    await P.page.waitForTimeout(700);
    const f2 = await fold();
    rec.ok(`${label}: I folds the band away and I brings it back`, f0 !== 'min' && f1 === 'min' && f2 !== 'min', { f0, f1, f2 });
    await P.page.keyboard.press('j');
    await P.page.waitForTimeout(800);
    const k = await read(P);
    rec.ok(`${label}: J opens Quests inside the band, as its button does`,
      k.mode === 'expanded' && k.root === 'quests' && !!k.o.band && Math.abs(k.o.band.h - rest.h) <= 1,
      { mode: k.mode, root: k.root, band: k.o.band });
    await P.page.keyboard.press('j');
    await P.page.waitForTimeout(500);
    /* v2.3.4092 (B3's rough edge): the controls list no longer comes up over
       the world's bottom-left -- folded to its ⌨ until H or the ⌨ opens it */
    const kb = () => P.page.evaluate(() => ({ chip: !!document.querySelector('.bt-kb-chip'), rows: document.querySelectorAll('.bt-kb-hints .bt-kb-key').length }));
    const kb0 = await kb();
    await P.page.keyboard.press('h');
    await P.page.waitForTimeout(500);
    const kb1 = await kb();
    await P.page.keyboard.press('h');
    await P.page.waitForTimeout(400);
    rec.ok(`${label}: the controls list starts folded to its ⌨ (nothing over the world), and H opens it`,
      kb0.chip && kb0.rows === 0 && kb1.rows >= 4, { start: kb0, afterH: kb1 });
  }
}

/* v2.3.4092: is the band on for this page load (html.bt-one-band, applied
   before the first render, so a bare load answers without entering the world) */
async function loadAndRead(P, url) {
  await P.page.goto(url, { waitUntil: 'domcontentloaded' });
  await P.page.waitForFunction(() => document.documentElement.classList.length > 0 || document.readyState === 'complete', null, { timeout: 15000 }).catch(() => {});
  await P.page.waitForTimeout(600);
  return P.page.evaluate(() => ({ on: document.documentElement.classList.contains('bt-one-band'), key: (() => { try { return localStorage.getItem('bt_oneband'); } catch (e) { return 'n/a'; } })() }));
}

export async function run({ browser, wsPort, webPort, rec }) {
  const screens = [
    { label: 'upright phone', viewport: { width: 390, height: 844 }, touch: true, upright: true },
    { label: 'sideways phone', viewport: { width: 844, height: 390 }, touch: true },
    { label: 'computer', viewport: { width: 1280, height: 720 }, wide: true, computer: true },
  ];
  for (const s of screens) {
    const P = await screen(browser, wsPort, webPort, rec, s);   /* v2.3.4092: nothing asked -- the default */
    try { await oneBandChecks(P, rec, s); }
    finally { await P.ctx.close().catch(() => {}); }
  }

  /* ── v2.3.4092: a phone turned, live: the band re-lays itself both ways ── */
  {
    const P = await screen(browser, wsPort, webPort, rec, { label: 'turned', viewport: { width: 390, height: 844 }, touch: true });
    const warns = [];
    P.page.on('console', (m) => { if (m.type() === 'warning' && m.text().includes('[canvas-watchdog]')) warns.push(m.text()); });
    try {
      const look = async () => {
        const g = await read(P);
        const css = await P.page.evaluate(() => { const d = document.querySelector('.bt-dashboard'); return d ? { inline: d.style.height, computed: getComputedStyle(d).height, transition: getComputedStyle(d).transition } : null; });
        return { orient: g.o.orient, dashH: g.o.dashH, band: g.o.band, canvas: g.o.canvas, cols: g.o.layout && g.o.layout.cols, rows: g.o.layout && g.o.layout.rows, mode: g.mode, css };
      };
      const up0 = await look();
      await P.page.setViewportSize({ width: 844, height: 390 });
      await P.page.waitForTimeout(2500);
      const side = await look();
      await P.page.setViewportSize({ width: 390, height: 844 });
      await P.page.waitForTimeout(1500);
      const up1 = await look();
      await P.page.waitForTimeout(2500);   /* a watchdog war heals twice a second: give it time to show */
      rec.ok('a phone turned sideways and back keeps the band: 243 -> 130 (9 across) -> 243, the canvas above it each way, no watchdog heals',
        up0.dashH === 243 && side.orient === 'portrait' && side.dashH === 130 && side.cols > 4 && side.band && side.band.y === 260
          && !!side.canvas && side.canvas.y + side.canvas.h <= 260 + OVERLAP + 1
          && up1.dashH === 243 && up1.cols === 4 && up1.canvas && up1.canvas.w === 390 && warns.length === 0,
        { up0, side, up1, warns: warns.slice(0, 3) });
    } finally { await P.ctx.close().catch(() => {}); }
  }

  /* ── v2.3.4092: the device's choice ── */
  {
    const P = await H.newPlayer(browser, { name: 'OneKeys', wsPort, webPort, world: 'wheel', viewport: { width: 844, height: 390 }, touch: true });
    try {
      const u = new URL(P.page.url());
      const bare = (extra) => { const v = new URL(u.toString()); v.searchParams.delete('oneband'); if (extra) for (const [k, x] of Object.entries(extra)) v.searchParams.set(k, x); return v.toString(); };
      const fresh = await loadAndRead(P, bare());
      await P.page.evaluate(() => { try { localStorage.setItem('bt_oneband', '1'); } catch (e) { /* none */ } });
      const oldOn = await loadAndRead(P, bare());
      const offQ = await loadAndRead(P, bare({ oneband: '0' }));
      const offKept = await loadAndRead(P, bare());
      const onQ = await loadAndRead(P, bare({ oneband: '1' }));
      const onKept = await loadAndRead(P, bare());
      rec.ok('the device\'s choice: no key is on, the old "on" (\'1\') stays on, ?oneband=0 turns it off and the device keeps it, ?oneband=1 clears it',
        fresh.on && oldOn.on && !offQ.on && offQ.key === '0' && !offKept.on && onQ.on && onQ.key === null && onKept.on,
        { fresh, oldOn, offQ, offKept, onQ, onKept });
    } finally { await P.ctx.close().catch(() => {}); }
  }

  /* ── the old layout, still reachable: ?oneband=0 sideways is the side column ── */
  const P = await screen(browser, wsPort, webPort, rec, { label: 'sideways off', viewport: { width: 844, height: 390 }, touch: true, query: 'oneband=0' });
  try {
    const g = await read(P);
    rec.ok('with ?oneband=0 a sideways phone plays the side column (data-orient landscape, no band height, no one-band row)',
      g.o && g.o.on === false && g.o.orient === 'landscape' && g.o.dashH === 0 && !g.o.cols,
      { o: g.o });
  } finally { await P.ctx.close().catch(() => {}); }
}
