/* ═══ v2.3.6784: THE MENU'S GRID AND GEAR'S HEADERS, AND THE BAG IN WHOLE ROWS (card UI3-menus) ═══
 *
 * The owner, 2026-11-26 (docs/design/UI_FEEDBACK_2026-11-26.md, part 4):
 * "Main menu. Keep the four-by-two layout. Enlarge the icons by approximately
 * 25%, reduce the button bevels and shadows, and use the same typography
 * across all navigation buttons."  "Gear. ... Standardize the inventory and
 * equipment slot styling, shrink their headers, and make the gold balance a
 * compact pill."  And at 19:35 UTC: "the inventory slots don't fit neatly on
 * the new menu the third row gets cut off."
 *
 * In the Wheel's BroTown, a character given the dev kit's weapons twice, rare
 * armour, two minnows, copper ore and a "?" torso (a bag of more rows than fit):
 *   1. the Menu at 390 x 844: eight tiles four by two; each picture's DRAWN
 *      box (its rectangle) the rule's number (src/game/menuTile.js) and the
 *      same on all eight; no picture past its tile or over its label; every
 *      label the size, weight and face of the header's controls;
 *   2. the same at 375 x 667, 844 x 390, 667 x 375 and a computer; the band
 *      243, 235, 130 as today (667 x 375: its height recorded, not pinned);
 *   3. Gear: a bag square and a worn cell of the same grade draw the same
 *      socket (background, outline, radius); the bag's count, the pin's
 *      anchor and the "?" still shown;
 *  3b. at every shape, EVERY bag square that meets the scroller's drawn box
 *      lies wholly inside it (1 px), at rest and after a scroll has settled;
 *      the whole rows the geometry's (src/game/gearGeometry.js);
 *   4. the label row 24 px, no word under 11, every control 44 to the touch;
 *      the gold a recessed pill, its number the purse, not a button;
 *   5. `?ui2=0`: today's bag square (its own border and colour) and today's More;
 *   6. no page errors.
 *
 * Pictures (deviceScaleFactor 2), docs/shots/: ui3-menu.png,
 * ui3-menu-375x667.png, ui3-menu-sideways.png, ui3-gear.png,
 * ui3-gear-375x667.png, ui3-gear-sideways.png, ui3-gear-computer.png.
 * UI3_SHOT_SUFFIX=-before names them for a run on the code before this card.
 *
 *   node tools/qa/mp/run.mjs ui3menus
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';

export const lane = 'full';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOTS = path.join(ROOT, 'docs', 'shots');
const SUFFIX = String(process.env.UI3_SHOT_SUFFIX || '').replace(/[^a-z0-9-]/gi, '');

/* ── in the page ── */
function menuRead() {
  const band = document.querySelector('.bt-dashboard');
  const B = band ? band.getBoundingClientRect() : null;
  const grid = document.querySelector('[data-dash-grid]');
  if (!grid) return { band: B ? [Math.round(B.width), Math.round(B.height)] : null, grid: null };
  const G = grid.getBoundingClientRect();
  const font = (e) => { if (!e) return null; const s = getComputedStyle(e); return [s.fontSize, s.fontWeight, s.fontFamily].join('|'); };
  const tiles = Array.from(grid.querySelectorAll('[data-dest]')).map((t) => {
    const r = t.getBoundingClientRect();
    const img = t.querySelector('.u2-tile-art');
    const lab = t.querySelector('.u2-tile-label');
    const i = img ? img.getBoundingClientRect() : null;
    const l = lab ? lab.getBoundingClientRect() : null;
    return {
      id: t.getAttribute('data-dest'), w: r.width, h: r.height,
      art: i ? [Math.round(i.width * 10) / 10, Math.round(i.height * 10) / 10] : null,
      artIn: i ? i.left >= r.left - 0.5 && i.right <= r.right + 0.5 && i.top >= r.top - 0.5 && i.bottom <= r.bottom + 0.5 : true,
      overLabel: i && l ? i.bottom > l.top + 0.5 : false,
      font: font(lab),
    };
  });
  const ctl = document.querySelector('[data-dash-frame] [data-dash-ctl="back"]') || document.querySelector('[data-dash-frame] [data-dash-ctl]');
  return {
    band: B ? [Math.round(B.width), Math.round(B.height)] : null,
    grid: { id: grid.getAttribute('data-dash-grid'), rows: +grid.getAttribute('data-grid-rows'), art: +grid.getAttribute('data-menu-art'), box: [Math.round(G.width * 10) / 10, Math.round(G.height * 10) / 10] },
    tiles, ctlFont: font(ctl),
    pad: (() => { const t = grid.querySelector('[data-dest]'); return t ? getComputedStyle(t).paddingTop : null; })(),
  };
}
function gearRead() {
  const band = document.querySelector('.bt-dashboard');
  const B = band ? band.getBoundingClientRect() : null;
  const root = document.querySelector('[data-gear-ws]');
  const bag = document.querySelector('[data-gear-bag]');
  const grid = bag ? bag.querySelector('[data-u2-grid]') : null;
  const out = { band: B ? [Math.round(B.width), Math.round(B.height)] : null, root: !!root, short: !!(root && root.getAttribute('data-gear-short')) };
  if (!grid) return out;
  const G = grid.getBoundingClientRect();
  const cells = Array.from(grid.querySelectorAll('.u2-cell')).map((c) => c.getBoundingClientRect());
  const meet = cells.filter((r) => r.bottom > G.top + 0.01 && r.top < G.bottom - 0.01);
  const cut = meet.filter((r) => r.top < G.top - 1 || r.bottom > G.bottom + 1).map((r) => [Math.round(r.top - G.top), Math.round(r.bottom - G.top)]);
  const rowTops = Array.from(new Set(meet.map((r) => Math.round(r.top)))).length;
  const sock = (e) => { if (!e) return null; const s = getComputedStyle(e); return { bg: s.backgroundImage, bw: s.borderTopWidth, bs: s.borderTopStyle, rad: s.borderTopLeftRadius, grade: e.getAttribute('data-grade'), cls: e.className }; };
  const bagSlots = Array.from(bag.querySelectorAll('[data-bag-key]')).map((e) => ({ key: e.getAttribute('data-bag-key'), s: sock(e), text: e.textContent.trim(), q: !!e.querySelector('[data-unrevealed-mark]'), unrevealed: e.hasAttribute('data-unrevealed'), inline: [e.style.background, e.style.border, e.style.borderRadius].join('|') }));
  const worn = Array.from(document.querySelectorAll('[data-gear-body] .u2-slot')).map(sock);
  const head = document.querySelector('[data-gear-ws] [data-ws-side="left"] .u2-pane-head');
  const H0 = head ? head.getBoundingClientRect() : null;
  const small = [];
  for (const e of (root ? root.querySelectorAll('*') : [])) {
    const own = Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own || e.closest('[aria-hidden="true"]') || e.closest('[data-bag-key]')) continue;
    const fs0 = parseFloat(getComputedStyle(e).fontSize);
    if (fs0 < 11) small.push([e.className, fs0, e.textContent.trim().slice(0, 20)]);
  }
  const ctls = Array.from(document.querySelectorAll('[data-gear-ws] .u2-gp-ctl')).map((b) => ({ h: Math.round(b.getBoundingClientRect().height), touch: getComputedStyle(b, '::after').height }));
  const gold = document.querySelector('[data-gear-gold]');
  const R = (window._gameState && window._gameState.current && window._gameState.current.rpg) || {};
  return {
    ...out,
    scroller: [Math.round(G.height), grid.scrollHeight > grid.clientHeight + 1], top: grid.scrollTop,
    rows: +(bag.getAttribute('data-bag-rows') || 0), cell: cells.length ? Math.round(cells[0].width) : 0,
    meet: meet.length, cut, rowTops,
    bagSlots, worn,
    head: H0 ? Math.round(H0.height) : null, headFont: head ? getComputedStyle(head).fontSize : null,
    small, ctls,
    gold: gold ? { tag: gold.tagName, cls: gold.className, n: Number(gold.getAttribute('data-gear-gold')), text: gold.textContent.trim(), sunk: /inset/.test(getComputedStyle(gold).boxShadow), coins: Number(R.coins || 0), art: (() => { const i = gold.querySelector('img'); return i ? Math.round(i.getBoundingClientRect().width) : 0; })() } : null,
  };
}
const mread = (P) => P.page.evaluate(menuRead);
const gread = (P) => P.page.evaluate(gearRead);

const menuOk = (m, rows) => !!m.grid && m.grid.rows === rows && m.tiles.length === 8 && m.tiles.every((t) => t.art && Math.abs(t.art[0] - m.grid.art) <= 0.5 && Math.abs(t.art[1] - m.grid.art) <= 0.5)
  && m.tiles.every((t) => t.artIn && !t.overLabel) && new Set(m.tiles.map((t) => t.font)).size === 1 && m.tiles[0].font === m.ctlFont;
const menuWhy = (m) => ({ grid: m.grid, band: m.band, pad: m.pad, arts: m.tiles && m.tiles.map((t) => t.art && t.art.join('x')), out: m.tiles && m.tiles.filter((t) => !t.artIn || t.overLabel).map((t) => t.id), fonts: m.tiles && Array.from(new Set(m.tiles.map((t) => t.font))), ctl: m.ctlFont });
const wholeOk = (g) => g.meet > 0 && g.cut.length === 0 && g.rows >= 1 && g.rowTops === g.rows;
const wholeWhy = (g) => ({ rows: g.rows, rowTops: g.rowTops, cell: g.cell, scroller: g.scroller, top: g.top, cut: g.cut, meet: g.meet, short: g.short, band: g.band });

async function shot(P, file) {
  const name = file.replace(/\.png$/, SUFFIX + '.png');
  try {
    const r = await P.page.evaluate(() => { const b = document.querySelector('.bt-dashboard').getBoundingClientRect(); return { x: b.left, y: Math.max(0, b.top - 60), w: b.width, h: Math.min(innerHeight, b.bottom) - Math.max(0, b.top - 60) }; });
    await P.page.screenshot({ path: path.join(SHOTS, name), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
    return name;
  } catch (e) { return null; }
}
const centre = async (P, sel) => {
  let at = null;
  for (const t0 = Date.now(); !at && Date.now() - t0 < 15000;) {
    at = await P.page.evaluate((q) => { const el = document.querySelector(q); if (!el) return null; const r = el.getBoundingClientRect(); return r.width && r.height ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; }, sel).catch(() => null);
    if (!at) await P.page.waitForTimeout(250);
  }
  if (!at) throw new Error('no ' + sel);
  return at;
};
/* a phone's tap is the touchscreen's (mp-ui2gear's, v2.3.6688), never locator.tap's wait */
const tap = async (P, sel, ms = 700) => { const at = await centre(P, sel); await P.page.touchscreen.tap(at.x, at.y); await P.page.waitForTimeout(ms); };
async function inWorld(P, rec, tag) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${tag}: in the world (guard)`, !!w, w);
  await P.page.waitForTimeout(1500);
  return !!w;
}
async function seed(P, wsPort, rec, tag) {
  const id = await H.readState(P, (S) => S.myId);
  await H.armWorker(P, wsPort, id, ['bow', 'staff']).catch(() => null);
  await H.devOp(wsPort, 'kit', id, { what: 'weapons' }).catch(() => null);
  await P.page.waitForTimeout(1200);
  await H.devOp(wsPort, 'kit', id, { what: 'weapons' }).catch(() => null);
  await P.page.waitForTimeout(1200);
  const r0 = await P.page.evaluate(() => !!(window._gameState.current.rpg || {}).weapon);
  if (!r0) { await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null); await P.page.waitForTimeout(1500); }
  await H.devOp(wsPort, 'kit', id, { what: 'armor', quality: 'rare' }).catch(() => null);
  await H.grant(wsPort, id, 'item', { invKey: 'fish_minnow', count: 2 }).catch(() => null);
  await H.grant(wsPort, id, 'item', { invKey: 'ore_copper_ore', count: 3 }).catch(() => null);
  await H.devOp(wsPort, 'revealbag', id, { grade: 'elite', give: 'armor' }).catch(() => null);
  await P.page.waitForTimeout(2500);
  const n = await P.page.evaluate(() => { const R = window._gameState.current.rpg || {}; return (R.weaponStash || []).filter(Boolean).length + (R.armorStash || []).length; });
  rec.ok(`${tag}: seeded (weapons, rare armour, a "?" torso, fish and ore in the bag)`, n > 0, n);
}
const toMenu = async (P) => {
  await H.dashOpen(P, 'dashboard').catch(() => null);
  await P.page.waitForTimeout(500);
  await H.dashMenuRoot(P).catch(() => null);
  await P.page.waitForTimeout(900);
};
const toGear = async (P) => {
  await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b && b.go) b.go({ type: 'rest' }); });
  await P.page.waitForTimeout(500);
  await H.dashOpen(P, 'dashboard').catch(() => null);
  await P.page.evaluate(() => { const g = window.__btGearTab; if (g) g.bus.reset(); });
  await P.page.waitForTimeout(900);
};
/* the bag scrolled by a row and a half, and left to settle (the snap) */
const scrollBag = async (P) => {
  await P.page.evaluate(() => {
    const g = document.querySelector('[data-gear-bag] [data-u2-grid]');
    const c = g && g.querySelector('.u2-cell');
    if (g && c) g.scrollTo({ top: Math.round(c.getBoundingClientRect().height * 1.5) });
  });
  await P.page.waitForTimeout(1500);
};
async function bagRows(P, rec, tag, want) {
  const a = await gread(P);
  await scrollBag(P);
  const b = await gread(P);
  await P.page.evaluate(() => { const g = document.querySelector('[data-gear-bag] [data-u2-grid]'); if (g) g.scrollTop = 0; });
  await P.page.waitForTimeout(500);
  rec.ok(`3b. ${tag}: every bag square that meets the scroller lies wholly inside it, at rest and after a scroll settles; ${a.rows} whole row(s) of ${a.cell} px${want ? ` (the rule says ${want})` : ''}`,
    wholeOk(a) && wholeOk(b) && b.top > 0 && (!want || a.rows === want), { rest: wholeWhy(a), scrolled: wholeWhy(b) });
  return a;
}

export async function run({ browser, wsPort, webPort, rec }) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const errors = [];
  const sizes = [];

  const P = await H.newPlayer(browser, { name: 'Menubro', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  P.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 160)));
  try {
    if (!(await inWorld(P, rec, '390x844'))) return;
    await seed(P, wsPort, rec, '390x844');
    await H.unfoldBand(P).catch(() => null);

    /* 1. the Menu at 390 x 844 */
    await toMenu(P);
    const m1 = await mread(P);
    await shot(P, 'ui3-menu.png');
    sizes.push(['menu 390x844', m1.grid && m1.grid.art, m1.grid && m1.grid.box]);
    rec.ok(`1. 390x844: eight tiles four by two, every picture drawn ${m1.grid && m1.grid.art} px (the rule's), none past its tile or over its word, the words in the header's type; the band 243`,
      menuOk(m1, 2) && m1.band && m1.band[1] === 243, menuWhy(m1));

    /* 3. Gear at 390 x 844: one socket, the marks, the label row, the pill */
    await toGear(P);
    /* the pin's anchor: the ore's item page, Pin, and back */
    try {
      await tap(P, '[data-gear-bag] [data-bag-key="i-ore_copper_ore"]', 900);
      await tap(P, '[data-gear-details]', 1400);
      await tap(P, '[data-item-pin]', 900);
    } catch (e) { /* recorded below: the anchor not seen */ }
    await toGear(P);
    const g3 = await gread(P);
    await shot(P, 'ui3-gear.png');
    const pair = (g3.bagSlots || []).map((b) => b.s && (g3.worn || []).find((w) => w && w.grade === b.s.grade && w.bg === b.s.bg && w.bw === b.s.bw && w.rad === b.s.rad) && b).find(Boolean);
    const ore = (g3.bagSlots || []).find((b) => b.key === 'i-ore_copper_ore');
    const hid = (g3.bagSlots || []).find((b) => b.unrevealed);
    rec.ok('3. 390x844: a bag square and a worn cell of the same grade draw the same socket (background, outline, radius); no bag square paints its own face',
      !!pair && (g3.bagSlots || []).every((b) => /u2-slot/.test(b.s.cls) && b.inline === '||'), { pair: pair && pair.key, slot: pair && pair.s, bag0: (g3.bagSlots || [])[0], worn0: (g3.worn || [])[0] });
    rec.ok('3a. the bag\'s marks kept: the ore\'s count, the pin\'s anchor, the "?" on the unrevealed torso', !!ore && /3/.test(ore.text) && /⚓/.test(ore.text) && !!hid && hid.q,
      { ore: ore && ore.text, hidden: hid && { key: hid.key, q: hid.q } });
    rec.ok('4. the label row 24 px, its words 11 px, no word under 11; every control 24 tall and 44 to the touch; the gold a recessed pill (not a button), its number the purse, its coin 16 px',
      g3.head === 24 && g3.headFont === '11px' && g3.small.length === 0 && g3.ctls.length > 0 && g3.ctls.every((c) => c.h === 24 && c.touch === '44px')
      && !!g3.gold && g3.gold.tag === 'DIV' && /is-pill/.test(g3.gold.cls) && g3.gold.sunk && g3.gold.n === g3.gold.coins && g3.gold.text.length > 0 && g3.gold.art === 16,
      { head: g3.head, font: g3.headFont, small: g3.small, ctls: g3.ctls, gold: g3.gold });
    const r3 = await bagRows(P, rec, '390x844', 3);
    sizes.push(['gear 390x844', r3.rows + ' rows', r3.cell]);

    /* 2 and 3b. the other phone shapes */
    for (const sh of [{ w: 375, h: 667, band: 235, rows: 2, tag: '375x667' }, { w: 844, h: 390, band: 130, rows: 1, tag: '844x390' }, { w: 667, h: 375, band: null, rows: 1, tag: '667x375' }]) {
      await P.page.setViewportSize({ width: sh.w, height: sh.h });
      await P.page.waitForTimeout(1500);
      await toMenu(P);
      const m = await mread(P);
      if (sh.tag === '375x667') await shot(P, 'ui3-menu-375x667.png');
      if (sh.tag === '844x390') await shot(P, 'ui3-menu-sideways.png');
      sizes.push(['menu ' + sh.tag, m.grid && m.grid.art, m.grid && m.grid.box, m.band]);
      rec.ok(`2. ${sh.tag}: the grid ${sh.rows === 1 ? 'one row of eight' : 'four by two'}, every picture drawn ${m.grid && m.grid.art} px, inside its tile, the header's type; the band ${sh.band || '(recorded: ' + (m.band && m.band[1]) + ')'}`,
        menuOk(m, sh.rows) && (!sh.band || (m.band && m.band[1] === sh.band)), menuWhy(m));
      await toGear(P);
      if (sh.tag === '375x667') await shot(P, 'ui3-gear-375x667.png');
      if (sh.tag === '844x390') await shot(P, 'ui3-gear-sideways.png');
      const r = await bagRows(P, rec, sh.tag, sh.rows === 1 ? 1 : 0);
      sizes.push(['gear ' + sh.tag, r.rows + ' rows', r.cell]);
    }
  } finally {
    await P.ctx.close().catch(() => {});
  }

  /* ══ a computer ══ */
  const D = await H.newPlayer(browser, { name: 'Menudesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, dpr: 2 });
  D.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 160)));
  try {
    if (await inWorld(D, rec, 'computer')) {
      await seed(D, wsPort, rec, 'computer');
      await toMenu(D);
      const m = await mread(D);
      sizes.push(['menu computer', m.grid && m.grid.art, m.grid && m.grid.box, m.band]);
      rec.ok(`2. a computer: four by two, every picture drawn ${m.grid && m.grid.art} px, inside its tile, the header's type`, menuOk(m, 2), menuWhy(m));
      await toGear(D);
      await shot(D, 'ui3-gear-computer.png');
      const r = await bagRows(D, rec, 'computer', 0);
      sizes.push(['gear computer', r.rows + ' rows', r.cell]);
    }
  } finally {
    await D.ctx.close().catch(() => {});
  }

  /* ══ 5. ?ui2=0: today's bag square and today's More ══ */
  const O = await H.newPlayer(browser, { name: 'Menuold', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'ui2=0' });
  O.page.on('pageerror', (e) => errors.push(String(e && e.message || e).slice(0, 160)));
  try {
    if (await inWorld(O, rec, 'ui2=0')) {
      await H.grant(wsPort, await H.readState(O, (S) => S.myId), 'item', { invKey: 'ore_copper_ore', count: 3 }).catch(() => null);
      await O.page.waitForTimeout(1500);
      await H.unfoldBand(O).catch(() => null);
      await H.dashOpen(O, 'dashboard').catch(() => null);
      await O.page.waitForTimeout(900);
      const o = await O.page.evaluate(() => {
        const t = document.querySelector('[data-gear-pane="inv"] [data-bag-key]');
        return { ws: !!document.querySelector('[data-gear-ws]'), tile: t ? { cls: t.className, bg: t.style.background, border: t.style.border, rad: t.style.borderRadius } : null };
      });
      rec.ok('5a. ?ui2=0: today\'s Gear, its bag square its own (its colour, border and radius; no kit socket)',
        !o.ws && !!o.tile && !/u2-slot/.test(o.tile.cls) && !!o.tile.bg && /1px/.test(o.tile.border) && o.tile.rad === '6px', o);
      await H.dashOpen(O, 'more').catch(() => null);
      await O.page.waitForTimeout(900);
      const more = await O.page.evaluate(() => ({ tiles: document.querySelectorAll('[data-more-tile]').length, grid: !!document.querySelector('[data-dash-grid]') }));
      rec.ok('5b. ?ui2=0: today\'s More (its own tiles, not the Menu\'s grid)', more.tiles > 0 && !more.grid, more);
    }
  } finally {
    await O.ctx.close().catch(() => {});
  }

  rec.ok('6. no page errors', errors.length === 0, errors.slice(0, 6));
  rec.ok('the sizes (record)', true, sizes);
}
