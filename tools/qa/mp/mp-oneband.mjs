/* ═══ ONE DASHBOARD ON EVERY SCREEN, TO TRY (?oneband=1) (v2.3.4072) ═══
 *
 * The owner: "unification of all different screen types ... to use the same
 * layout and just scale differences to screen size ... I like the 1/3 idea
 * where the menu takes up that much of the bottom of the screen even in
 * layout orientation", with "responsive density rather than uniform scaling
 * ... Use the available space to determine the number of inventory slots".
 * Behind a switch, off by default (src/ui/oneBand.js, docs/specs/one-band.md).
 *
 * Three screens in the Wheel's BroTown, each with ?oneband=1: an upright
 * phone (390 x 844), a phone on its side (844 x 390) and a computer playing
 * wide (1280 x 720, `wide: true`).  On each:
 *   - the upright layout draws (data-orient "portrait", the band at the
 *     bottom, the nav row in it, no side sheet, no keys strip);
 *   - the band is at most a third of the screen, and an upright phone's band
 *     is the upright band it always was;
 *   - the bag's tiles fit the box: every tile of the first row inside the bag
 *     panel, the panel and the combat cards inside the row, the tile at least
 *     the touch minimum, the counts as many as the box holds;
 *   - a page (Quests) opens INSIDE the band, at the band's own height;
 *   - the world's canvas sits above the band, no wider than 2.2:1 (bars at
 *     its sides past that), and on a phone the two joysticks sit above it;
 *   - on a computer the nav buttons keep their key caps and a key opens a page.
 * And one guard the other way: the same sideways phone WITHOUT the switch
 * still plays the sideways layout (data-orient "landscape", no band) -- the
 * full sideways and computer suites are landdash and deskwide.
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
    !!o.band && o.band.h <= third + 1 && Math.abs(o.band.y + o.band.h - Hh) <= 1 && o.dashH <= third + 1,
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
    await P.page.keyboard.press('j');
    await P.page.waitForTimeout(800);
    const k = await read(P);
    rec.ok(`${label}: J opens Quests inside the band, as its button does`,
      k.mode === 'expanded' && k.root === 'quests' && !!k.o.band && Math.abs(k.o.band.h - rest.h) <= 1,
      { mode: k.mode, root: k.root, band: k.o.band });
    await P.page.keyboard.press('j');
    await P.page.waitForTimeout(500);
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const screens = [
    { label: 'upright phone', viewport: { width: 390, height: 844 }, touch: true, upright: true },
    { label: 'sideways phone', viewport: { width: 844, height: 390 }, touch: true },
    { label: 'computer', viewport: { width: 1280, height: 720 }, wide: true, computer: true },
  ];
  for (const s of screens) {
    const P = await screen(browser, wsPort, webPort, rec, { ...s, query: 'oneband=1' });
    try { await oneBandChecks(P, rec, s); }
    finally { await P.ctx.close().catch(() => {}); }
  }

  /* ── the switch is off by default: sideways is still sideways ── */
  const P = await screen(browser, wsPort, webPort, rec, { label: 'sideways off', viewport: { width: 844, height: 390 }, touch: true });
  try {
    const g = await read(P);
    rec.ok('without the switch a sideways phone keeps the sideways layout (data-orient landscape, no band height, no one-band row)',
      g.o && g.o.on === false && g.o.orient === 'landscape' && g.o.dashH === 0 && !g.o.cols,
      { o: g.o });
  } finally { await P.ctx.close().catch(() => {}); }
}
