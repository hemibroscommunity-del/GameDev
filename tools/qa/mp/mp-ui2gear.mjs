/* ═══ v2.3.6687: GEAR'S ONE ITEM PAGE; v2.3.6688: GEAR'S TWO PANELS AND THE QUICK LOOK (card UI2-gear PRs 1 and 2) ═══
 *
 * Under the new frame Gear is two panels (src/ui/mobile/dash/GearPanels.jsx;
 * its rules src/game/workspace.js, compare.js, equipProject.js): Inventory
 * left (the storage grid), Equipped right (the nine cells in a body's
 * shape), no middle column; a tap on a square makes the OPPOSITE panel its
 * summary, whose Details opens the one item page (ItemPage.jsx, its model
 * src/game/itemInspect.js).  In the Wheel's BroTown, a character given the
 * dev kit's weapons twice (a greatsword in hand, a bow and a staff on, and a
 * SPARE greatsword in the bag), its armour in the RARE grade in the bag, two
 * minnows and copper ore (the legs and the amulet cells empty):
 *
 *   upright phone (390 x 844, touch), the specification's fifth task ("Find
 *   a stored sword and distinguish it from the equipped sword. Read what
 *   happens to DPS if equipped; find full comparison and return to the same
 *   selected item. Repeat from equipped-item side"):
 *     1. management: Inventory left (a regular grid), Equipped right (a body:
 *        three columns, the middle wider), no figure, no bars, no cell under
 *        44 px, nothing past its panel; the band 243 px as before;
 *     2. the bag scrolled, then the stored sword: the Inventory stays LEFT,
 *        its square picked (pushed in), Equipped's place the summary: "Now"
 *        and "If equipped" DPS, Details and Equip in view;
 *     3. Details: the one item page ("In your bag"); Back: the same summary,
 *        the same square picked;
 *     4. the summary's close: management, the bag's scroll as it was;
 *     5. the worn sword: Equipped stays RIGHT, its cell picked, the
 *        Inventory's place the summary ("Worn", DPS, Unequip); Details and
 *        Back: the same; the cell again: management, the bag's scroll kept;
 *     6. the rare chest piece: its summary heads with "Damage cut"; Equip:
 *        the worker puts it on (the chest cell filled, rare);
 *     7. a stack (the minnows): its own facts ("You hold 2") and action;
 *   375 x 667, sideways 844 x 390 and a computer (1280 x 800, wide): the
 *   panels and a look fit (no cell under 44, Equip, the headline and the way
 *   back in view); the item page fits (PR 1's checks);
 *   `?ui2=0`: today's Gear (three panels), no two panels.
 *
 *   v2.3.6689 (PR 3): Bro's Equipment door, a SHOWCASE (sheet/GearShowcase.jsx):
 *     11. Bro, Equipment: the figure, the nine worn cells in the body's shape,
 *        no bag, no cell under 44 px, Manage Gear; the header "Equipment",
 *        Back to Bro; the band's height as before;
 *     12. the worn sword's cell: the one item page, its facts and actions
 *        the SAME as from Gear's worn sword (the specification's eighth task:
 *        "Open the same item via Gear ... verify consistent facts and
 *        contextual actions"); Back: the showcase;
 *     13. Manage Gear: Gear's two panels;
 *     14. your own player card: a worn slot of its equipment row opens the
 *        one item page, the card gone;
 *     and at 375 x 667, sideways and on a computer the showcase fits.
 *
 * Pictures (deviceScaleFactor 2): docs/shots/ui2-gear-manage.png,
 * -look-bag.png, -look-worn.png, -sideways.png, -computer.png, PR 1's
 * -item-worn.png, -item-bag.png, and PR 3's -showcase.png,
 * -showcase-sideways.png, -showcase-computer.png.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';

export const lane = 'full';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOTS = path.join(ROOT, 'docs', 'shots');

/* the page's reading, in the page */
function itemRead() {
  const band = document.querySelector('.bt-dashboard');
  const B = band ? band.getBoundingClientRect() : null;
  const pg = document.querySelector('[data-item-page]');
  const txt = (sel) => { const e = document.querySelector(sel); return e ? e.textContent.trim() : null; };
  const out = {
    band: B ? [Math.round(B.width), Math.round(B.height)] : null,
    title: txt('[data-dash-frame] [data-u2="title"]'),
    back: txt('[data-dash-frame] [data-dash-ctl="back"]'),
    page: !!pg,
  };
  if (!pg) return out;
  const P = pg.getBoundingClientRect();
  const inside = (r) => r.left >= P.left - 0.5 && r.right <= P.right + 0.5 && r.top >= P.top - 0.5 && r.bottom <= P.bottom + 0.5;
  const btns = Array.from(pg.querySelectorAll('button')).map((b) => {
    const r = b.getBoundingClientRect();
    return { id: b.getAttribute('data-item-act'), w: Math.round(r.width), h: Math.round(r.height), off: b.disabled, in: inside(r), text: b.textContent.trim() };
  });
  const small = [];
  for (const e of pg.querySelectorAll('*')) {
    const own = Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own || e.closest('[aria-hidden="true"]')) continue;
    const fs0 = parseFloat(getComputedStyle(e).fontSize);
    if (fs0 < 11) small.push([e.className, fs0, e.textContent.trim().slice(0, 20)]);
  }
  const cut = Array.from(pg.querySelectorAll('.u2-group-v')).filter((v) => v.scrollWidth > v.clientWidth + 0.5).map((v) => v.textContent);
  const acts = pg.querySelector('[data-item-actions]');
  const id = pg.querySelector('[data-item-id]');
  const facts = Array.from(pg.querySelectorAll('[data-item-fact]')).map((f) => f.getAttribute('data-item-fact'));
  const grade = pg.querySelector('[data-item-grade-word]');
  const stars = pg.querySelector('[data-item-stars]');
  return {
    ...out,
    box: [Math.round(P.width), Math.round(P.height)],
    scrolls: pg.scrollHeight > pg.clientHeight + 1,
    name: txt('[data-item-page] [data-item-name]'),
    where: txt('[data-item-page] [data-item-where]'),
    grade: grade ? grade.getAttribute('data-item-grade-word') : null,
    stars: stars ? Number(stars.getAttribute('data-item-stars')) : 0,
    slot: (pg.querySelector('.u2-slot') || { getAttribute: () => null }).getAttribute('data-grade'),
    facts,
    acts: acts ? acts.getAttribute('data-item-actions').split(' ') : [],
    actsIn: acts ? inside(acts.getBoundingClientRect()) : true,
    idIn: id ? inside(id.getBoundingClientRect()) : false,
    btns,
    smallBtns: btns.filter((b) => b.w < 44 || b.h < 44),
    outBtns: btns.filter((b) => !b.in),
    small,
    cut,
    sideways: id && acts ? Math.abs(id.getBoundingClientRect().top - acts.getBoundingClientRect().top) < 30 : null,
  };
}
const read = (P) => P.page.evaluate(itemRead);
/* where a thing is, waited for (the page held seconds at a time on this box) */
const centre = async (P, sel) => {
  let at = null;
  for (const t0 = Date.now(); !at && Date.now() - t0 < 15000;) {
    at = await P.page.evaluate((q) => { const el = document.querySelector(q); if (!el) return null; const r = el.getBoundingClientRect(); return r.width && r.height ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; }, sel).catch(() => null);
    if (!at) await P.page.waitForTimeout(250);
  }
  if (!at) throw new Error('no ' + sel);
  return at;
};
/* v2.3.6688 (the mends): a phone's tap is the touchscreen's (mp-pointsreset's, v2.3.6681), not locator.tap's 6 s wait */
const tap = async (P, sel, ms = 600) => { const at = await centre(P, sel); await P.page.touchscreen.tap(at.x, at.y); await P.page.waitForTimeout(ms); };
/* v2.3.6688 (the mends): a computer's click by the mouse at the thing's middle, then a wait on the page's state.
   Playwright's locator.click waited for the page to settle and timed out at 6 s on this box's software drawing
   (the page is held seconds at a time: TRAPS §200; mp-pointsreset's touchscreen taps, v2.3.6681), not the game's. */
const click = async (P, sel, ms = 600, until) => {
  const at = await centre(P, sel);
  await P.page.mouse.click(at.x, at.y);
  if (until) await H.waitFor(P, until, (v) => !!v, { timeout: 15000, label: 'after ' + sel }).catch(() => null);
  await P.page.waitForTimeout(ms);
};
async function bandShot(P, file) {
  try {
    const r = await P.page.evaluate(() => { const b = document.querySelector('.bt-dashboard').getBoundingClientRect(); return { x: b.left, y: Math.max(0, b.top - 60), w: b.width, h: Math.min(innerHeight, b.bottom) - Math.max(0, b.top - 60) }; });
    await P.page.screenshot({ path: path.join(SHOTS, file), clip: { x: r.x, y: r.y, width: r.w, height: r.h } });
    return file;
  } catch (e) { return null; }
}
const rpgOf = (P) => P.page.evaluate(() => {
  const R = (window._gameState && window._gameState.current && window._gameState.current.rpg) || {};
  return { weapon: !!R.weapon, armor: R.armor ? { name: R.armor.name, q: R.armor.quality } : null, stashArmor: (R.armorStash || []).length };
});
async function inWorld(P, rec, tag) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${tag}: in the world (guard)`, !!w, w);
  await P.page.waitForTimeout(1500);
  return !!w;
}
async function seed(P, wsPort, rec, tag, full) {
  const id = await H.readState(P, (S) => S.myId);
  await H.armWorker(P, wsPort, id, ['bow', 'staff']).catch(() => null);
  await H.devOp(wsPort, 'kit', id, { what: 'weapons' }).catch(() => null);
  await P.page.waitForTimeout(1200);
  /* v2.3.6688: the kit again: a SPARE greatsword in the bag beside the one in hand */
  if (full) { await H.devOp(wsPort, 'kit', id, { what: 'weapons' }).catch(() => null); await P.page.waitForTimeout(1200); }
  const r0 = await P.page.evaluate(() => !!(window._gameState.current.rpg || {}).weapon);
  if (!r0) { await H.equipWeapon(P, 'greatsword', 'weapon', 'melee').catch(() => null); await P.page.waitForTimeout(1500); }
  if (full) {
    await H.devOp(wsPort, 'kit', id, { what: 'armor', quality: 'rare' }).catch(() => null);
    await H.grant(wsPort, id, 'item', { invKey: 'fish_minnow', count: 2 }).catch(() => null);
    await H.grant(wsPort, id, 'item', { invKey: 'ore_copper_ore', count: 3 }).catch(() => null);
  }
  await P.page.waitForTimeout(2500);
  const r = await rpgOf(P);
  rec.ok(`${tag}: seeded (a weapon in hand${full ? ', rare armour in the bag' : ''})`, r.weapon && (!full || r.stashArmor > 0 || !!r.armor), r);
}
/* Gear's root, the sword picked, its door pressed */
async function swordPage(P, press) {
  /* Gear's ROOT: the page left on Gear's stack goes (dashOpen would resume it) */
  await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b && b.go) b.go({ type: 'rest' }); });
  await P.page.waitForTimeout(600);
  await H.dashOpen(P, 'dashboard');
  await P.page.evaluate(() => { const g = window.__btGearTab; if (g) g.bus.deselect(); });
  await P.page.waitForTimeout(400);
  await press(P, '[data-gear-cell="sword"] [role="button"]');
  await press(P, '[data-gear-summary] [data-gear-details]', 900);
  return read(P);
}
const fits = (s) => s.page && !s.scrolls && s.smallBtns.length === 0 && s.outBtns.length === 0 && s.small.length === 0 && s.cut.length === 0 && s.actsIn && s.idIn;
const fitWhy = (s) => ({ box: s.box, scrolls: s.scrolls, smallBtns: s.smallBtns, outBtns: s.outBtns, small: s.small, cut: s.cut, actsIn: s.actsIn, idIn: s.idIn });

/* v2.3.6688: the two panels, read in the page */
function panelRead() {
  const band = document.querySelector('.bt-dashboard');
  const B = band ? band.getBoundingClientRect() : null;
  const root = document.querySelector('[data-gear-ws]');
  const side = (w) => document.querySelector(`[data-gear-ws] [data-ws-side="${w}"]`);
  const L = side('left'), Rt = side('right');
  const rect = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
  const inside = (r, P) => r && P && r[0] >= P[0] - 0.5 && r[0] + r[2] <= P[0] + P[2] + 0.5 && r[1] >= P[1] - 0.5 && r[1] + r[3] <= P[1] + P[3] + 0.5;
  const cells = [];
  for (const sd of [L, Rt]) {
    if (!sd) continue;
    const P = rect(sd);
    const grid = sd.querySelector('[data-u2-grid]');
    const G = grid ? rect(grid) : null;
    for (const c of sd.querySelectorAll('.u2-cell')) {
      const r = rect(c);
      /* a bag square scrolled out of its grid's view is not drawn: only those in view */
      if (G && (r[1] + r[3] <= G[1] || r[1] >= G[1] + G[3])) continue;
      cells.push({ k: c.getAttribute('data-ws-key'), w: r[2], h: r[3], in: G ? (r[0] >= G[0] - 0.5 && r[0] + r[2] <= G[0] + G[2] + 0.5) : inside(r, P) });
    }
  }
  const sum = document.querySelector('[data-gear-summary]');
  const S = sum ? rect(sum.closest('[data-ws-side]')) : null;
  const ctl = sum ? Array.from(sum.querySelectorAll('button')).map((b) => ({ t: b.getAttribute('data-gear-act') || (b.hasAttribute('data-gear-details') ? 'details' : b.hasAttribute('data-ws-close') ? 'close' : b.textContent.trim()), r: rect(b), off: b.disabled })) : [];
  const small = [];
  for (const e of (root ? root.querySelectorAll('*') : [])) {
    const own = Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own || e.closest('[aria-hidden="true"]') || e.closest('[data-bag-key]')) continue;
    const fs0 = parseFloat(getComputedStyle(e).fontSize);
    if (fs0 < 11) small.push([e.className, fs0, e.textContent.trim().slice(0, 20)]);
  }
  const g = window.__btGearTab ? window.__btGearTab.state() : null;
  const bag = document.querySelector('[data-gear-bag] [data-u2-grid]');
  return {
    band: B ? [Math.round(B.width), Math.round(B.height)] : null,
    root: !!root, mode: root && root.getAttribute('data-ws-mode'), from: root && root.getAttribute('data-ws-from'),
    left: L && L.getAttribute('data-ws-show'), right: Rt && Rt.getAttribute('data-ws-show'),
    leftBag: !!(L && L.querySelector('[data-gear-bag]')), rightBody: Rt ? (Rt.querySelector('[data-gear-body]') || { getAttribute: () => null }).getAttribute('data-gear-body') : null,
    leftBody: !!(L && L.querySelector('[data-gear-body]')), rightBag: !!(Rt && Rt.querySelector('[data-gear-bag]')),
    middle: !!document.querySelector('[data-gear-stats], [data-gear-pane="bro"], .bt-vitalbar'),
    cells, smallCells: cells.filter((c) => c.w < 44 || c.h < 44), outCells: cells.filter((c) => !c.in),
    sel: Array.from(document.querySelectorAll('[data-gear-ws] .u2-cell.is-sel')).map((c) => c.getAttribute('data-ws-key')),
    sum: sum ? { from: sum.getAttribute('data-gear-summary'), kind: sum.getAttribute('data-gear-kind'), text: sum.textContent.replace(/\s+/g, ' ').trim().slice(0, 240),
      head: (sum.querySelector('[data-cmp-head], [data-sum-head]') || { getAttribute: () => null }).getAttribute('data-cmp-head') || (sum.querySelector('[data-sum-head]') || { getAttribute: () => null }).getAttribute('data-sum-head'),
      ctl, ctlIn: ctl.every((c) => inside(c.r, S)), ctlBig: ctl.every((c) => c.r[2] >= 44 && c.r[3] >= 44) } : null,
    small,
    ws: g ? g.ws : null,
    bagTop: bag ? bag.scrollTop : null,
    short: !!(root && root.getAttribute('data-gear-short')),
  };
}
const pread = (P) => P.page.evaluate(panelRead);
const manageOk = (s) => s.root && s.mode === 'manage' && s.left === 'panel' && s.right === 'panel' && s.leftBag && !!s.rightBody && !s.middle
  && s.smallCells.length === 0 && s.outCells.length === 0 && s.small.length === 0 && s.cells.length >= 9;
const manageWhy = (s) => ({ mode: s.mode, left: s.left, right: s.right, leftBag: s.leftBag, body: s.rightBody, middle: s.middle, small: s.smallCells, out: s.outCells, words: s.small, n: s.cells.length });
const lookOk = (s, from) => s.mode === 'look' && s.from === from && !!s.sum && s.sum.ctlIn && s.sum.ctlBig
  && (from === 'left' ? s.left === 'panel' && s.leftBag && s.right === 'summary' : s.right === 'panel' && !!s.rightBody && s.left === 'summary')
  && s.sum.ctl.some((c) => c.t === 'details') && s.sum.ctl.some((c) => c.t === 'close') && s.small.length === 0;
const lookWhy = (s) => ({ mode: s.mode, from: s.from, left: s.left, right: s.right, sum: s.sum, words: s.small, sel: s.sel });
const toRest = async (P) => {
  await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b && b.go) b.go({ type: 'rest' }); });
  await P.page.waitForTimeout(500);
  await H.dashOpen(P, 'dashboard');
  await P.page.evaluate(() => { const g = window.__btGearTab; if (g) g.bus.reset(); });
  await P.page.waitForTimeout(500);
};
const spareSword = (P) => P.page.evaluate(() => {
  const R = (window._gameState && window._gameState.current && window._gameState.current.rpg) || {};
  const i = (R.weaponStash || []).findIndex((w) => w && (w.type === 'greatsword' || w.type === 'sword'));
  return i >= 0 ? 'stashWeapon-' + i : null;
});

/* v2.3.6689: Bro's Equipment showcase, read in the page */
function showRead() {
  const band = document.querySelector('.bt-dashboard');
  const B = band ? band.getBoundingClientRect() : null;
  const sc = document.querySelector('[data-gear-showcase]');
  const txt = (sel) => { const e = document.querySelector(sel); return e ? e.textContent.trim() : null; };
  const out = { band: B ? [Math.round(B.width), Math.round(B.height)] : null, title: txt('[data-dash-frame] [data-u2="title"]'),
    back: txt('[data-dash-frame] [data-dash-ctl="back"]'), there: !!sc, item: !!document.querySelector('[data-item-page]') };
  if (!sc) return out;
  const P = sc.getBoundingClientRect();
  const inside = (r) => r.left >= P.left - 0.5 && r.right <= P.right + 0.5 && r.top >= P.top - 0.5 && r.bottom <= P.bottom + 0.5;
  const cells = Array.from(sc.querySelectorAll('[data-gear-cell]')).map((c) => { const r = c.getBoundingClientRect(); return { id: c.getAttribute('data-gear-cell'), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), in: inside(r) }; });
  const fig = sc.querySelector('[data-gear-figure] canvas');
  const fr = fig ? fig.parentElement.getBoundingClientRect() : null;
  const m = sc.querySelector('[data-gear-manage]');
  const mr = m ? m.getBoundingClientRect() : null;
  const at = (id) => cells.find((c) => c.id === id) || null;
  const col = (ids) => { const xs = ids.map((id) => (at(id) || {}).x); return xs.every((x) => x != null && Math.abs(x - xs[0]) < 2); };
  return {
    ...out, whose: sc.getAttribute('data-gear-showcase'), box: [Math.round(P.width), Math.round(P.height)], short: sc.getAttribute('data-gear-short') === '1',
    cells, n: cells.length, small: cells.filter((c) => c.w < 44 || c.h < 44).map((c) => c.id), out: cells.filter((c) => !c.in).map((c) => c.id),
    bag: !!sc.querySelector('[data-gear-bag], [data-bag-key]'),
    figure: fr ? { w: Math.round(fr.width), h: Math.round(fr.height), in: inside(fr) } : null,
    manage: mr ? { w: Math.round(mr.width), h: Math.round(mr.height), in: inside(mr), text: m.textContent.trim() } : null,
    /* the body upright: the weapons one column, Cape, Chest, Legs the next, Shield, Amulet, Gem the third, left to right */
    body: col(['sword', 'bow', 'staff']) && col(['cape', 'chest', 'legs']) && col(['shield', 'amulet', 'gem'])
      && (at('sword') || {}).x < (at('chest') || {}).x && (at('chest') || {}).x < (at('shield') || {}).x,
  };
}
const sread = (P) => P.page.evaluate(showRead);
const showOk = (s, short) => s.there && s.n === 9 && s.small.length === 0 && s.out.length === 0 && !s.bag && !!s.manage && s.manage.in && s.manage.h >= 44
  && !!s.figure && s.figure.in && s.figure.h >= 40 && (short ? s.short : s.body) && s.title === 'Equipment';
const showWhy = (s) => ({ there: s.there, n: s.n, small: s.small, out: s.out, bag: s.bag, manage: s.manage, figure: s.figure, body: s.body, short: s.short, box: s.box, title: s.title });
/* Bro's landing, then its Equipment door pressed */
async function toShowcase(P, press) {
  await P.page.evaluate(() => { const b = window.__broDashPanelBus; if (b && b.go) b.go({ type: 'rest' }); });
  await P.page.waitForTimeout(500);
  await P.page.evaluate(() => { const b = window.__broDashPanelBus; b.open('more'); b.go({ type: 'push', id: 'hero' }); });
  /* the landing's tiles grow into place (dashGrow): the tap waits until the Equipment tile is where it stays
     (the first run's tap, read mid-growth, landed on Combat beside it: this box draws a few frames a second) */
  let last = null;
  for (const t0 = Date.now(); Date.now() - t0 < 15000;) {
    const r = await P.page.evaluate(() => { const e = document.querySelector('[data-dash-grid="bro"] [data-dest="equipment"]'); if (!e) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map(Math.round).join(); }).catch(() => null);
    if (r && r === last) break;
    last = r;
    await P.page.waitForTimeout(400);
  }
  await press(P, '[data-dash-grid="bro"] [data-dest="equipment"]', 1200);
  await H.waitFor(P, () => !!document.querySelector('[data-gear-showcase] [data-gear-cell]'), (v) => !!v, { timeout: 15000, label: 'the showcase' }).catch(() => null);
  await P.page.waitForTimeout(800);
}

export async function run({ browser, wsPort, webPort, rec }) {
  fs.mkdirSync(SHOTS, { recursive: true });

  const P = await H.newPlayer(browser, { name: 'Gearbro', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  try {
    if (!(await inWorld(P, rec, '390x844'))) return;
    await seed(P, wsPort, rec, '390x844', true);
    await H.unfoldBand(P).catch(() => null);
    await toRest(P);
    await P.page.waitForTimeout(600);

    /* 1. management */
    const s1 = await pread(P);
    await bandShot(P, 'ui2-gear-manage.png');
    rec.ok('1. 390x844: two panels, Inventory left (a grid), Equipped right (a body), no middle column, no cell under 44 px or past its panel, no word under 11 px; the band 390 x 243',
      manageOk(s1) && s1.rightBody === 'figure' && !!s1.band && s1.band[1] === 243, { ...manageWhy(s1), band: s1.band });

    /* 2. the bag scrolled, then the stored sword */
    const key = await spareSword(P);
    await P.page.evaluate(() => { const g = document.querySelector('[data-gear-bag] [data-u2-grid]'); if (g) g.scrollTop = 30; });
    await P.page.waitForTimeout(700);
    const top0 = (await pread(P)).bagTop;
    if (!key) { rec.ok('2. a spare greatsword in the bag (guard)', false, 'none'); return; }
    await P.page.evaluate((k) => { const e = document.querySelector(`[data-gear-bag] [data-bag-key="${k}"]`); if (e) e.scrollIntoView({ block: 'nearest' }); }, key);
    await P.page.waitForTimeout(500);
    const top1 = (await pread(P)).bagTop;
    await tap(P, `[data-gear-bag] [data-bag-key="${key}"]`, 800);
    const s2 = await pread(P);
    await bandShot(P, 'ui2-gear-look-bag.png');
    rec.ok('2a. the stored sword: the Inventory stays LEFT with its square picked (pushed in); the Equipped panel\'s place is its summary',
      lookOk(s2, 'left') && s2.sel.includes(key) && s2.sum.from === 'bag', lookWhy(s2));
    rec.ok('2b. ...the summary reads your DPS "Now" and "If equipped" (on you, by the Bro pages\' reader), with Details and Equip in view',
      !!s2.sum && s2.sum.head === 'dps' && /Now/.test(s2.sum.text) && /If equipped/.test(s2.sum.text) && s2.sum.ctl.some((c) => c.t === 'equip'), s2.sum);

    /* 3. Details, then Back: the same look */
    await tap(P, '[data-gear-summary] [data-gear-details]', 900);
    const s3 = await read(P);
    await bandShot(P, 'ui2-gear-item-bag.png');
    rec.ok('3a. Details: the one item page ("In your bag", the sword, Equip leads, no Sell)', s3.page && s3.where === 'In your bag' && s3.acts[0] === 'equip' && !s3.acts.includes('sell'), { where: s3.where, acts: s3.acts, title: s3.title });
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 900);
    const s3b = await pread(P);
    rec.ok('3b. Back: the same summary, the same square picked', lookOk(s3b, 'left') && s3b.sel.includes(key) && !!s3b.ws && s3b.ws.pick === key, lookWhy(s3b));

    /* 4. close: management, the scroll kept.  The ✕ must hold still (a tap waits for a box that stays put):
       its box sampled over six frames first */
    const still = await P.page.evaluate(async () => {
      const out = [];
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        const x = document.querySelector('[data-gear-summary] [data-ws-close]');
        const r = x ? x.getBoundingClientRect() : null;
        out.push(r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height), getComputedStyle(x).visibility, x.isConnected] : null);
      }
      return out;
    });
    rec.ok('4z. the summary\'s close holds still and is shown', still.every((r) => r && r[2] >= 44 && r[4] === 'visible') && new Set(still.map((r) => r && r.slice(0, 4).join())).size === 1, still);
    await P.page.locator('[data-gear-summary] [data-ws-close]').first().tap({ timeout: 6000 }).catch(async () => {
      await P.page.evaluate(() => { const x = document.querySelector('[data-gear-summary] [data-ws-close]'); if (x) x.click(); });
    });
    await P.page.waitForTimeout(700);
    const s4 = await pread(P);
    rec.ok('4. the summary\'s close: management, the bag\'s scroll as it was', manageOk(s4) && s4.bagTop === top1, { ...manageWhy(s4), top: s4.bagTop, want: top1, first: top0 });

    /* 5. from the Equipped side */
    await tap(P, '[data-gear-cell="sword"] [role="button"]', 800);
    const s5 = await pread(P);
    await bandShot(P, 'ui2-gear-look-worn.png');
    rec.ok('5a. the worn sword: Equipped stays RIGHT with its cell picked; the Inventory\'s place is its summary ("Worn", DPS, Unequip)',
      lookOk(s5, 'right') && s5.sel.includes('sword') && s5.sum.from === 'worn' && /Worn/.test(s5.sum.text) && s5.sum.head === 'DPS' && s5.sum.ctl.some((c) => c.t === 'unequip'), lookWhy(s5));
    await tap(P, '[data-gear-summary] [data-gear-details]', 900);
    const s5p = await read(P);
    await bandShot(P, 'ui2-gear-item-worn.png');
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 900);
    const s5b = await pread(P);
    rec.ok('5b. its Details: the item page ("Worn"); Back: the same summary, the same cell picked', s5p.page && s5p.where === 'Worn' && lookOk(s5b, 'right') && s5b.sel.includes('sword'), { page: s5p.where, back: lookWhy(s5b) });
    await tap(P, '[data-gear-cell="sword"] [role="button"]', 700);
    const s5c = await pread(P);
    rec.ok('5c. the cell again: management, the bag\'s scroll still kept', manageOk(s5c) && s5c.bagTop === top1, { ...manageWhy(s5c), top: s5c.bagTop, want: top1 });

    /* 6. the rare chest piece, then Equip */
    const chestKey = await P.page.evaluate(() => { const e = document.querySelector('[data-gear-bag] [data-bag-key^="stashArmor-"]'); return e ? e.getAttribute('data-bag-key') : null; });
    if (chestKey) {
      await P.page.evaluate((k) => { const e = document.querySelector(`[data-gear-bag] [data-bag-key="${k}"]`); if (e) e.scrollIntoView({ block: 'nearest' }); }, chestKey);
      await tap(P, `[data-gear-bag] [data-bag-key="${chestKey}"]`, 800);
      const s6 = await pread(P);
      rec.ok('6a. the rare chest piece: its summary heads with "Damage cut" (no effective-health number), Equip in view', lookOk(s6, 'left') && s6.sum.head === 'cut' && /Damage cut/i.test(s6.sum.text) && !/effective/i.test(s6.sum.text), lookWhy(s6));
      await tap(P, '[data-gear-summary] [data-gear-act="equip"]', 2500);
      const a6 = await P.page.evaluate(() => ({ chest: (document.querySelector('[data-gear-cell="chest"]') || { getAttribute: () => null }).getAttribute('data-gear-filled') }));
      const r6 = await rpgOf(P);
      rec.ok('6b. Equip: management, the worker puts the rare piece on (the chest cell filled)', a6.chest === '1' && !!r6.armor && r6.armor.q === 'rare' && (await pread(P)).mode === 'manage', { a6, r6 });
    } else {
      rec.ok('6. the bag\'s rare chest piece is in the bag (guard)', false, 'no stashArmor tile');
    }

    /* 7. a stack */
    await toRest(P);
    if (await P.page.locator('[data-gear-bag] [data-bag-key="i-fish_minnow"]').count()) {
      await P.page.evaluate(() => { const e = document.querySelector('[data-gear-bag] [data-bag-key="i-fish_minnow"]'); if (e) e.scrollIntoView({ block: 'nearest' }); });
      await tap(P, '[data-gear-bag] [data-bag-key="i-fish_minnow"]', 800);
      const s7 = await pread(P);
      rec.ok('7. a stack (two minnows): its own facts ("You hold 2") and its action, never only a name and Details', lookOk(s7, 'left') && /You hold/.test(s7.sum.text) && s7.sum.ctl.length >= 3, lookWhy(s7));
    } else {
      rec.ok('7. the minnows are in the bag (guard)', false, 'no i-fish_minnow tile');
    }

    /* 11-14 (v2.3.6689, PR 3): Bro's Equipment, a showcase */
    const g12 = await swordPage(P, tap);   /* the worn sword's item page from Gear, to hold the showcase's to */
    await toShowcase(P, tap);
    const s11 = await sread(P);
    await bandShot(P, 'ui2-gear-showcase.png');
    rec.ok('11. Bro, Equipment: the showcase (the figure, the nine worn cells in the body\'s shape, no bag, none under 44 px, Manage Gear), "Equipment" under the header, Back to Bro, the band 390 x 243',
      showOk(s11, false) && /Bro/.test(s11.back || '') && !!s11.band && s11.band[1] === 243, { ...showWhy(s11), back: s11.back, band: s11.band });
    await tap(P, '[data-gear-showcase] [data-gear-cell="sword"] [role="button"]', 1200);
    const p12 = await read(P);
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    rec.ok('12a. the worn sword\'s cell: the one item page, the SAME name, grade, facts, place and actions as from Gear', p12.page && g12.page && p12.name === g12.name && p12.grade === g12.grade
      && same(p12.facts, g12.facts) && p12.where === g12.where && same(p12.acts, g12.acts) && fits(p12),
      { show: { name: p12.name, facts: p12.facts, where: p12.where, acts: p12.acts }, gear: { name: g12.name, facts: g12.facts, where: g12.where, acts: g12.acts }, fit: fitWhy(p12) });
    await tap(P, '[data-dash-frame] [data-dash-ctl="back"]', 1000);
    const b12 = await sread(P);
    rec.ok('12b. Back: the showcase again', b12.there && !b12.item, { there: b12.there, item: b12.item, title: b12.title });
    await tap(P, '[data-gear-showcase] [data-gear-manage]', 1500);
    const m13 = await pread(P);
    rec.ok('13. Manage Gear: Gear\'s two panels', m13.root && m13.mode === 'manage' && m13.leftBag && !!m13.rightBody, { root: m13.root, mode: m13.mode });
    /* 14. your own player card: its equipment row */
    await P.page.evaluate(() => { if (window.__broInspectSelf) window.__broInspectSelf(); });
    await H.waitFor(P, () => !!document.querySelector('.bt-pin-equip [data-pin-item]'), (v) => !!v, { timeout: 15000, label: 'the card\'s equipment row' }).catch(() => null);
    const slot14 = await P.page.evaluate(() => { const e = document.querySelector('.bt-pin-equip [data-pin-item][data-slot="weapon"]') || document.querySelector('.bt-pin-equip [data-pin-item]'); return e ? e.getAttribute('data-slot') : null; });
    if (slot14) await tap(P, `.bt-pin-equip [data-pin-item][data-slot="${slot14}"]`, 1500);
    const p14 = await read(P);
    const card14 = await P.page.evaluate(() => !!document.querySelector('.bt-pcard'));
    rec.ok(`14. your player card: a worn slot (${slot14}) opens the one item page ("Worn"), the card gone`, !!slot14 && p14.page && p14.where === 'Worn' && !card14,
      { slot: slot14, page: p14.page, where: p14.where, name: p14.name, card: card14 });

    /* 8. the other shapes */
    for (const sh of [{ w: 375, h: 667, band: 235, tag: '375x667' }, { w: 844, h: 390, band: 130, tag: '844x390' }]) {
      await P.page.setViewportSize({ width: sh.w, height: sh.h });
      await P.page.waitForTimeout(1500);
      await toRest(P);
      const m = await pread(P);
      const k2 = await spareSword(P);
      if (k2) await P.page.evaluate((k) => { const e = document.querySelector(`[data-gear-bag] [data-bag-key="${k}"]`); if (e) e.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, k2);
      if (k2) await tap(P, `[data-gear-bag] [data-bag-key="${k2}"]`, 800);
      const l = await pread(P);
      if (sh.tag === '844x390') await bandShot(P, 'ui2-gear-sideways.png');
      rec.ok(`8. ${sh.tag}: the panels fit (no cell under 44, none past its panel; the band ${sh.w} x ${sh.band} as today); a look from the bag keeps Equip, the headline and the way back in view`,
        manageOk(m) && !!m.band && m.band[1] === sh.band && lookOk(l, 'left') && !!l.sum.head, { manage: manageWhy(m), band: m.band, look: lookWhy(l) });
      const s8 = await swordPage(P, tap);
      rec.ok(`8b. ${sh.tag}: the sword's item page from the summary fits`, fits(s8), fitWhy(s8));
      /* v2.3.6689: the showcase in this shape */
      await toShowcase(P, tap);
      const c8 = await sread(P);
      if (sh.tag === '844x390') await bandShot(P, 'ui2-gear-showcase-sideways.png');
      rec.ok(`8c. ${sh.tag}: Bro's Equipment showcase fits (nine cells, none under 44 px, none past the page, the figure and Manage Gear in view; the band as today)`,
        showOk(c8, sh.tag === '844x390') && !!c8.band && c8.band[1] === sh.band, { ...showWhy(c8), band: c8.band });
    }
  } finally {
    await P.ctx.close().catch(() => {});
  }

  /* ══ a computer ══ */
  const D = await H.newPlayer(browser, { name: 'Geardesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, dpr: 2 });
  try {
    if (!(await inWorld(D, rec, 'computer'))) return;
    await seed(D, wsPort, rec, 'computer', false);
    await toRest(D);
    const m = await pread(D);
    await click(D, '[data-gear-cell="sword"] [role="button"]', 800, () => { const g = window.__btGearTab; return g && g.state().ws.mode === 'look'; });
    const l = await pread(D);
    await bandShot(D, 'ui2-gear-computer.png');
    await D.page.keyboard.press('Escape');
    await D.page.waitForTimeout(600);
    const e = await pread(D);
    rec.ok('9a. a computer: the panels fit; a click on the worn sword is a look (not a swing), its summary in the Inventory\'s place; Esc closes the look',
      manageOk(m) && lookOk(l, 'right') && e.mode === 'manage', { manage: manageWhy(m), look: lookWhy(l), esc: e.mode });
    const s9 = await swordPage(D, click);
    rec.ok('9b. a computer: the sword\'s item page from the summary fits, every button 44 px or more', s9.page && s9.title === 'Sword' && fits(s9), { title: s9.title, fit: fitWhy(s9) });
    /* v2.3.6689: the showcase on a computer; a click on a cell is the item page, not a swing */
    await toShowcase(D, click);
    const c9 = await sread(D);
    await bandShot(D, 'ui2-gear-showcase-computer.png');
    await click(D, '[data-gear-showcase] [data-gear-cell="sword"] [role="button"]', 1000, () => !!document.querySelector('[data-item-page]'));
    const p9 = await read(D);
    rec.ok('9c. a computer: the showcase fits; a click on the worn sword opens its item page (not a swing)', showOk(c9, false) && p9.page && p9.title === 'Sword',
      { show: showWhy(c9), page: p9.page, title: p9.title });
  } finally {
    await D.ctx.close().catch(() => {});
  }

  /* ══ ?ui2=0: today's Gear ══ */
  const O = await H.newPlayer(browser, { name: 'Gearold', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'ui2=0' });
  try {
    if (!(await inWorld(O, rec, 'ui2=0'))) return;
    await H.unfoldBand(O).catch(() => null);
    await H.dashOpen(O, 'dashboard').catch(() => null);
    await O.page.waitForTimeout(900);
    const o = await O.page.evaluate(() => ({ ws: !!document.querySelector('[data-gear-ws]'), inv: !!document.querySelector('[data-gear-pane="inv"]'), equip: !!document.querySelector('[data-gear-pane="equip"]') }));
    rec.ok('10. ?ui2=0: today\'s Gear (its bag and Equipped panes), not the two panels', !o.ws && o.inv && o.equip, o);
  } finally {
    await O.ctx.close().catch(() => {});
  }
}
