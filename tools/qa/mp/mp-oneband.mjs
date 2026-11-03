/* ═══ ONE DASHBOARD ON EVERY SCREEN (v2.3.4072; v2.3.4152: THE DEFAULT) ═══
 *
 * The owner: "unification of all different screen types ... to use the same
 * layout and just scale differences to screen size ... I like the 1/3 idea
 * where the menu takes up that much of the bottom of the screen even in
 * layout orientation", with "responsive density rather than uniform scaling
 * ... Use the available space to determine the number of inventory slots".
 * v2.3.4152, the owner: "Move the left side menu to the bottom of screen on
 * computer and all other devices" -- ON by default, `?oneband=0` the side
 * column for one device (src/ui/oneBand.js, docs/specs/one-band.md).
 *
 * Three screens in the Wheel's BroTown, each with NOTHING asked (the
 * default): an upright phone (390 x 844), a phone on its side (844 x 390) and
 * a computer playing wide (1280 x 720, `wide: true`).  On each:
 *   - the upright layout draws (data-orient "portrait", the band at the
 *     bottom, the nav row in it, no side sheet, no keys strip);
 *   - the band is at most a third of the screen and never taller than an
 *     upright phone's 243 (v2.3.4152: today's height, the owner), and an
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
 * Then the device's choice (v2.3.4152): no key and the old "on" ('1') both
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
  /* v2.3.4151: the resting row is the Gear tab (GearTab.jsx): its bag pane
     and its gear pane stand where the Bag panel and the Combat cards stood */
  const bag = cols && (cols.querySelector('[aria-label="Bag"]') || cols.querySelector('[data-gear-pane="inv"]'));
  const combat = cols && (cols.querySelector('[aria-label="Combat"]') || cols.querySelector('[data-gear-pane="equip"]'));
  const gearTab = !!(cols && cols.querySelector('[data-gear-tab]'));
  /* the bag's grid: the element whose children are the tiles */
  const grid = bag && Array.from(bag.querySelectorAll('div')).find((d) => getComputedStyle(d).display === 'grid');
  const tileMin = gearTab && grid ? Math.round(Math.min(...Array.from(grid.children).map((c) => c.getBoundingClientRect().width))) : null;
  const tiles = grid ? Array.from(grid.children).map(r) : [];
  const joy = ['.bt-joystick-base', '.bt-rjoy-base'].map((s) => r(document.querySelector(s)));
  const desk = window.__btDeskWide ? window.__btDeskWide() : null;
  return {
    o, bag: r(bag), combat: r(combat), tiles, joy, desk, gearTab, tileMin,
    navs: Array.from(document.querySelectorAll('.bt-dashboard [data-nav]')).map((n) => ({ id: n.getAttribute('data-nav'), key: n.getAttribute('data-key'), box: r(n) })),
    landSheet: !!document.querySelector('.bt-land-sheet'),
    keysStrip: r(document.querySelector('.bt-desk-keys')),
    mode: window.__broDashPanelBus ? window.__broDashPanelBus.state.mode : null,
    root: window.__broDashPanelBus ? window.__broDashPanelBus.state.stack[0] : null,
  };
});

/* ═══ v2.3.4152: A PHONE ON ITS SIDE ═══
   The owner's decision (src/ui/mobile/bandSideways.js): sideways the band
   rests FOLDED to its button row; a nav button opens its page; CLOSE folds it
   again; while it is open the controls step aside (hidden, not touchable);
   folded they sit above the row, inside the world, clear of the player frame,
   the minimap and its plate. */
const CTL_SELS = {
  stick: '.bt-joystick-zone', disc: '.bt-rjoy-zone', sprint: '[data-sprint]', ride: '[data-ride]', eat: '[data-quickeat]',
  jump: '[data-jump]', shield: '[data-shield]', special: '[data-special]', tri: '[data-weapon-pill]'   /* v2.3.4152: the weapon pill replaced the triangle (v2.3.4130) */, abil: '[data-ability]',
  burst: '.bt-burst-btn', pie: '.bt-charge-pie', trap: '[data-trap-round]',
};
const controls = (P) => P.page.evaluate((sels) => {
  const box = (b) => ({ x: Math.round(b.left), y: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom) });
  const out = [];
  for (const [name, s] of Object.entries(sels)) {
    for (const el of document.querySelectorAll(s)) {
      const b = el.getBoundingClientRect();
      if (b.width < 1 || b.height < 1) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none') continue;
      /* is it the thing a tap at its middle reaches? (hidden: never) */
      const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      out.push({ name, ...box(b), vis: cs.visibility, hit: !!hit && (hit === el || el.contains(hit)) });
    }
  }
  const pf = document.querySelector('.bt-pf');
  const m = window.__btWheelMini, pl = window.__btWheelPlate;
  return {
    ctl: out,
    pf: pf ? box(pf.getBoundingClientRect()) : null,
    mini: m ? { x: m.left, y: m.top, r: m.left + m.w, b: m.top + m.h } : null,
    plate: pl ? { x: Math.round(pl.left), y: Math.round(pl.top), r: Math.round(pl.left + pl.width), b: Math.round(pl.top + pl.height) } : null,
    fold: (document.querySelector('[data-dash-fold]') || { getAttribute: () => null }).getAttribute('data-dash-fold'),
    side: window.__btBandSide ? window.__btBandSide() : null,
    stored: (() => { try { return localStorage.getItem('bt_dash_min'); } catch (e) { return 'n/a'; } })(),
    mode: window.__broDashPanelBus ? window.__broDashPanelBus.state.mode : null,
  };
}, CTL_SELS);
const meets = (a, b) => !!a && !!b && a.x < b.r && b.x < a.r && a.y < b.b && b.y < a.b;

/* a fight's worth of controls on screen: a shield (raised: Shield Bash), the
   three weapons (the triangle), a monster near (Block, the abilities,
   Special) -- mp-btnlayout's fixture */
const arm = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  if (S.rpg && !S.rpg.shield) S.rpg.shield = { type: 'shield', name: 'QA Shield', tierMult: 1 };
  if (S.rpg) S.rpg.weapon = { type: 'sword', name: 'QA Sword', tierMult: 1, element1: 'flame' };   /* enchanted: Element Burst */
  if (S.rpg) { S.rpg.inventory = Object.assign({}, S.rpg.inventory, { cooked_fish_minnow: 3 }); S.rpg.hp = Math.max(1, (S.rpg.maxHp || 100) - 50); }   /* hurt, with food: Quick eat */
  if (S.rpg && !S.rpg.rangedWeapon) S.rpg.rangedWeapon = { type: 'bow', name: 'QA Bow', tierMult: 1 };
  if (S.rpg && !S.rpg.staffWeapon) S.rpg.staffWeapon = { type: 'staff', name: 'QA Staff', tierMult: 1 };
  if (S.rpg) S.rpg.activeSlot = 'melee';
  S._serverMonsters = false;
  S.monsters = [{ id: 'side_1', arch: 'fodder', archetype: 'fodder', type: 'fodder', x: S.player.x + 80, y: S.player.y, renderX: S.player.x + 80, renderY: S.player.y,
    hp: 5000, curHp: 5000, maxHp: 5000, dmg: 0, level: 1, gold: 0, spd: 0, vx: 0, vy: 0, alive: true, statuses: {}, _hitThisSwing: false, _atkCd: 0, _stunUntil: 0, respawnAt: 0, moveTimer: 0, _stuckArrows: [] }];
});

async function sidewaysChecks(P, rec, { label, viewport }) {
  const W = viewport.width, Hh = viewport.height;
  await arm(P);
  await P.page.waitForTimeout(1500);
  const rest = await controls(P);
  const o = (await read(P)).o || {};
  console.log(`    [${label} folded] ` + JSON.stringify({ rest, band: o.band, playW: o.playW, worldX: o.worldX }));
  rec.ok(`${label}: the band RESTS folded to its button row (a phone on its side), and the fold is not written to the device's choice`,
    rest.fold === 'min' && !!rest.side && rest.side.side === true && rest.side.open === false && rest.stored !== '1' && !!o.band && o.band.h < 80,
    { fold: rest.fold, side: rest.side, stored: rest.stored, band: o.band });
  const names = rest.ctl.map((c) => c.name);
  rec.ok(`${label}: guard: the fight's controls are on screen to be measured (the stick, the disc, Sprint, Jump, the weapon pill, Block, Special)`,
    ['stick', 'disc', 'sprint', 'jump', 'tri', 'shield', 'special'].every((n) => names.includes(n)) && !!rest.pf && !!rest.mini && !!rest.plate,
    { names, pf: rest.pf, mini: rest.mini, plate: rest.plate });
  const top = o.band ? o.band.y : Hh;
  const x0 = (o.worldX || 0), x1 = x0 + (o.playW || W);
  const bad = rest.ctl.filter((c) => c.b > top + 1 || c.x < x0 - 1 || c.r > x1 + 1 || c.y < 0
    || meets(c, rest.pf) || meets(c, rest.mini) || meets(c, rest.plate));
  rec.ok(`${label}: folded, every control sits above the button row inside the world, clear of the player frame, the minimap and its plate`,
    rest.ctl.length >= 7 && bad.length === 0, { bad, top, world: [x0, x1], pf: rest.pf, mini: rest.mini, plate: rest.plate });
  rec.ok(`${label}: folded, every control is shown and a tap at its middle reaches it (nothing over it)`,
    rest.ctl.filter((c) => c.name !== 'stick' && c.name !== 'pie').every((c) => c.vis === 'visible' && c.hit),
    rest.ctl.filter((c) => c.vis !== 'visible' || !c.hit));
  rec.ok(`${label}: the touch targets keep 44 px`,
    rest.ctl.filter((c) => ['disc', 'sprint', 'jump', 'shield', 'special', 'ride', 'eat', 'abil', 'burst'].includes(c.name)).every((c) => c.r - c.x >= 44 && c.b - c.y >= 44),
    rest.ctl.map((c) => ({ n: c.name, w: c.r - c.x, h: c.b - c.y })));
  await shot(P, 'sideways-folded');

  /* a nav button opens its page: the band unfolds, the controls step aside */
  await H.openDest(P, 'Quests');
  await P.page.waitForTimeout(1000);
  const open = await controls(P);
  await shot(P, 'sideways-open');
  rec.ok(`${label}: a nav button opens its page (the band unfolds), and every control steps aside -- hidden, a tap never reaches one`,
    open.mode === 'expanded' && open.fold === 'open' && open.side && open.side.open === true
      && open.ctl.length >= 7 && open.ctl.every((c) => c.vis === 'hidden' && !c.hit),
    { mode: open.mode, fold: open.fold, side: open.side, ctl: open.ctl.filter((c) => c.vis !== 'hidden' || c.hit) });
  /* CLOSE folds it again, and the controls come back */
  await H.closeDest(P);
  await P.page.waitForTimeout(900);
  const back = await controls(P);
  rec.ok(`${label}: CLOSE folds it again and the controls come back, where they were`,
    back.mode === 'bar' && back.fold === 'min' && back.side && back.side.open === false
      && back.ctl.filter((c) => c.name !== 'stick' && c.name !== 'pie').every((c) => c.vis === 'visible')
      && rest.ctl.every((c) => back.ctl.some((d) => d.name === c.name && Math.abs(d.x - c.x) <= 2 && Math.abs(d.y - c.y) <= 2)),
    { mode: back.mode, fold: back.fold, side: back.side });
  /* a page that closes itself (the bus's toBar: a finished task, a panel's
     own close) folds it too, not only CLOSE */
  await H.openDest(P, 'Quests');
  await P.page.waitForTimeout(800);
  await P.page.evaluate(() => window.__broDashPanelBus.toBar());
  await P.page.waitForTimeout(900);
  const again = await controls(P);
  rec.ok(`${label}: a page that closes itself folds the band too (never resting on the columns with the controls away)`,
    again.mode === 'bar' && again.fold === 'min' && again.side && again.side.open === false, { mode: again.mode, fold: again.fold, side: again.side });
  /* the bag's page, for the PR's picture */
  await P.page.evaluate(() => window.__broDashPanelBus.open('dashboard'));
  await P.page.waitForTimeout(1000);
  await shot(P, 'sideways-gear');
  await P.page.evaluate(() => window.__broDashPanelBus.toBar());
  await P.page.waitForTimeout(800);
}

async function screen(browser, wsPort, webPort, rec, { label, viewport, touch, wide, query, before }) {
  const P = await H.newPlayer(browser, {
    name: 'One' + label.replace(/[^A-Za-z]/g, '').slice(0, 8), wsPort, webPort,
    world: 'wheel', viewport, touch: !!touch, wide: !!wide, query: query || '',
  });
  try {
    await H.enterWorld(P);
    await P.page.waitForTimeout(2500);
    if (before) await before(P);
    /* a first join arrives folded (v2.3.2495): unfold, as a player taps OPEN */
    await H.unfoldBand(P);
    await P.page.waitForTimeout(800);
    return P;
  } catch (e) {
    await P.ctx.close().catch(() => {});
    throw e;
  }
}

/* v2.3.4151: the Gear tab inside the one band -- the owner, of PR #1410: "The
   new universal dashboard system will need to adapt to the new redesign we're
   adding for 'gear'".  Its card never scrolls, nothing in it under 11 px, and
   the bag's squares and the Equipped cells one size; in each state (nothing
   picked, a bag piece picked) */
const gearFit = (P) => P.page.evaluate(() => {
  const c = document.querySelector('[data-one-band-cols] [data-gear-pane="bro"]');
  if (!c) return null;
  const cr = c.getBoundingClientRect();
  const sc = c.querySelector('[data-gear-scroll]');
  const small = [];
  c.querySelectorAll('*').forEach((el) => {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && parseFloat(getComputedStyle(el).fontSize) < 11) small.push(el.textContent.trim().slice(0, 16));
  });
  const outside = [...c.querySelectorAll('button, [data-gear-grid] > *')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.right > cr.right + 0.5 || r.bottom > cr.bottom + 0.5); }).length;
  const b = document.querySelector('[data-one-band-cols] [data-gear-bag] [data-bag-key], [data-one-band-cols] [data-gear-bag] [data-gear-slot-empty]');
  const e = document.querySelector('[data-one-band-cols] [data-gear-cell]');
  const cells = [...document.querySelectorAll('[data-one-band-cols] [data-gear-cell]')].map((x) => x.getBoundingClientRect());
  const eq = document.querySelector('[data-one-band-cols] [data-gear-pane="equip"]');
  const er = eq ? eq.getBoundingClientRect() : null;
  return {
    over: c.scrollHeight - c.clientHeight, scOver: sc ? sc.scrollHeight - sc.clientHeight : 0, small, outside,
    bag: b ? Math.round(b.getBoundingClientRect().width * 10) / 10 : null, cell: e ? Math.round(e.getBoundingClientRect().width * 10) / 10 : null,
    cellsIn: !!er && cells.length === 9 && cells.every((r) => r.bottom <= er.bottom + 0.5 && r.right <= er.right + 0.5),
    view: c.getAttribute('data-gear-view'),
    /* v2.3.4151: the tab's own width, and its margins in the band's row */
    root: (() => {
      const g = document.querySelector('[data-one-band-cols] [data-gear-tab]');
      const row = document.querySelector('[data-one-band-cols]');
      if (!g || !row) return null;
      const a = g.getBoundingClientRect(), b = row.getBoundingClientRect();
      return { w: Math.round(a.width), left: Math.round(a.left - b.left), right: Math.round(b.right - a.right), layout: g.getAttribute('data-gear-layout') };
    })(),
  };
});
async function gearChecks(P, rec, label, shotPath, computer) {
  const g0 = await gearFit(P);
  /* v2.3.4151, the owner: "The stretched middle panel looks silly on
     computer" -- across a wide band the tab is at most 560 px (GearTab
     GEAR_MAX_W) and centred */
  if (computer) {
    rec.ok(`${label}: the Gear tab never stretches -- at most 560 px wide, centred in the band (its margins equal within 2 px)`,
      !!g0 && !!g0.root && g0.root.w <= 561 && Math.abs(g0.root.left - g0.root.right) <= 2, g0 && g0.root);
  }
  rec.ok(`${label}: the Gear tab's card fits the band -- no scrolling, nothing past its edge, nothing under 11 px; the bag's squares and the Equipped cells one size (34 px or more), all nine cells inside their panel`,
    !!g0 && g0.view === 'overview' && g0.over <= 1 && g0.scOver <= 1 && g0.outside === 0 && g0.small.length === 0
      && g0.bag && g0.cell && Math.abs(g0.bag - g0.cell) <= 1 && g0.cell >= 34 && g0.cellsIn, g0);
  if (shotPath) await P.page.screenshot({ path: shotPath }).catch(() => {});
  /* a bag piece picked: the card still fits */
  const key = await P.page.evaluate(() => { const t = document.querySelector('[data-one-band-cols] [data-gear-bag] [data-bag-key]'); return t ? t.getAttribute('data-bag-key') : null; });
  if (key) {
    await P.page.evaluate((k) => { const t = document.querySelector(`[data-one-band-cols] [data-gear-bag] [data-bag-key="${k}"]`); if (t) t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); }, key);   /* v2.3.4152: the tile answers a finger's lift (ItemTile onPointerUp), never a click -- this was a no-op until the sideways run put a fish in the bag */
    await P.page.waitForTimeout(600);
    const g1 = await gearFit(P);
    rec.ok(`${label}: ...a bag piece picked, the card still fits (no scrolling, nothing under 11 px)`,
      !!g1 && g1.view === 'item' && g1.over <= 1 && g1.scOver <= 1 && g1.outside === 0 && g1.small.length === 0, g1);
    await P.page.evaluate(() => { const g = window.__btGearTab; if (g) g.bus.afterChange(); });
    await P.page.waitForTimeout(300);
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
  /* v2.3.4151: the Gear tab lays its bag out from the same box itself (three
     square slots a row, nine in view, never under 34 px -- the owner's second
     mockup), so its first row is its own three */
  const row1g = g.gearTab ? g.tiles.slice(0, 3).filter(Boolean) : row1;
  rec.ok(`${label}: the first row of tiles inside the bag panel, the panel and the combat cards inside the row`,
    !!g.bag && !!g.combat && (g.gearTab ? row1g.length === 3 && g.tileMin >= 34 : row1.length === (L ? L.cols : -1))
      && row1g.every((t) => t.x >= g.bag.x && t.r <= g.bag.r && t.y >= g.bag.y && (g.gearTab || Math.abs(t.w - L.tile) <= 1))
      && g.bag.x >= o.cols.x - 1 && g.combat.r <= o.cols.x + o.cols.w + 1
      && g.bag.b <= o.cols.y + o.cols.h + 1 && g.combat.b <= o.cols.y + o.cols.h + 1
      && g.bag.r <= g.combat.x,
    { bag: g.bag, combat: g.combat, row1: row1g, gearTab: g.gearTab, tileMin: g.tileMin, cols: o.cols });
  try { mkdirSync(OUT, { recursive: true }); } catch (e) { /* the pictures only */ }
  await gearChecks(P, rec, label, join(OUT, 'oneband-gear-' + label.replace(/[^a-z]+/gi, '-') + '.png'), computer);
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
  if (upright) {   /* v2.3.4152: sideways the controls step aside for an open band (sidewaysChecks) */
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
    /* v2.3.4152: every page key opens its page inside the band, and Esc
       closes it (deskKeys.js; the key each button wears is the key it obeys) */
    const caps = g.navs.filter((n) => n.key && n.id !== 'dashboard').map((n) => ({ id: n.id, key: n.key }));
    const keyed = [];
    for (const c of caps) {
      await P.page.keyboard.press(c.key.toLowerCase());
      await P.page.waitForTimeout(700);
      /* v2.3.4152: a page's first mount can hold this slow box's main
         thread past the band's 220 ms grow (seen once: Character at 48 px,
         the folded row, 700 ms after P): wait for it, by the band itself */
      await P.page.waitForFunction((h) => { const d = document.querySelector('.bt-dashboard'); return !!d && Math.abs(d.getBoundingClientRect().height - h) <= 1; }, rest.h, { timeout: 4000 }).catch(() => {});
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
    /* v2.3.4152 (B3's rough edge): the controls list no longer comes up over
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

/* ═══ v2.3.4152: A COMPUTER: THE BAND'S CONTENT CENTRED ═══
   The nav row, an open page and the resting columns (BottomDashboard's
   data-band-box) are centred, as wide as the world above (--play-w) and at
   most 1200 px; the band's own background the window's width. */
const BAND_MAX_W = 1200;
const bandBoxes = (P) => P.page.evaluate(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return b.width > 0 ? { x: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width) } : null; };
  const o = window.__btOneBand ? window.__btOneBand() : {};
  return {
    win: window.innerWidth, playW: o.playW, band: r(document.querySelector('.bt-dashboard')),
    nav: r(document.querySelector('[data-band-box="nav"]')), cols: r(document.querySelector('[data-band-box="cols"]')),
    page: r(document.querySelector('[data-band-box="page"]')),
  };
});
async function centredChecks(P, rec, { label }) {
  const at = async (w, h) => {
    await P.page.setViewportSize({ width: w, height: h });
    await P.page.waitForTimeout(2000);
    await H.unfoldBand(P);
    await P.page.waitForTimeout(600);
    const rest = await bandBoxes(P);
    await H.openDest(P, 'Quests');
    await P.page.waitForTimeout(900);
    const open = await bandBoxes(P);
    if (w === 1920) await shot(P, 'computer-1920-quests');
    await H.closeDest(P);
    await P.page.waitForTimeout(500);
    /* the bag's page (the Gear button's, until Lane A's Gear tab), for the PR's picture */
    await P.page.evaluate(() => window.__broDashPanelBus.open('dashboard'));
    await P.page.waitForTimeout(900);
    await shot(P, `computer-${w}-gear`);
    await P.page.evaluate(() => window.__broDashPanelBus.toBar());
    await P.page.waitForTimeout(500);
    return { rest, open };
  };
  const ok = (b, want, W) => !!b && Math.abs(b.w - want) <= 2 && Math.abs(b.x - (W - b.w) / 2) <= 2;
  for (const [w, h] of [[1920, 1080], [1280, 720]]) {
    const { rest, open } = await at(w, h);
    const want = Math.min(BAND_MAX_W, rest.playW || w);
    rec.ok(`${label} ${w}x${h}: the band's content is centred at ${want} px (the world's width, at most ${BAND_MAX_W}), the band itself the window's width`,
      !!rest.band && rest.band.w >= w - 2 && ok(rest.nav, want, w) && ok(rest.cols, want, w) && ok(open.page, want, w) && ok(open.nav, want, w),
      { rest, open, want });
  }
}

/* v2.3.4152: is the band on for this page load (html.bt-one-band, applied
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
    { label: 'sideways phone', viewport: { width: 844, height: 390 }, touch: true, sideways: true },
    { label: 'computer', viewport: { width: 1280, height: 720 }, wide: true, computer: true },
  ];
  for (const s of screens) {
    /* v2.3.4152: sideways, the resting fold and the controls first, then the
       band unfolded for the checks every screen shares */
    const before = s.sideways ? (P) => sidewaysChecks(P, rec, s) : null;
    const P = await screen(browser, wsPort, webPort, rec, { ...s, before });   /* nothing asked -- the default */
    try {
      const side = await P.page.evaluate(() => (window.__btBandSide ? window.__btBandSide().side : null));
      if (!s.sideways) {
        rec.ok(`${s.label}: not a phone on its side -- the band open at rest, as built (no sideways fold)`,
          side === false, { side });
      }
      await oneBandChecks(P, rec, s);
      if (s.computer) await centredChecks(P, rec, s);
    }
    finally { await P.ctx.close().catch(() => {}); }
  }

  /* ── v2.3.4152: a phone turned, live: the band re-lays itself both ways ── */
  {
    const P = await screen(browser, wsPort, webPort, rec, { label: 'turned', viewport: { width: 390, height: 844 }, touch: true });
    const warns = [];
    P.page.on('console', (m) => { if (m.type() === 'warning' && m.text().includes('[canvas-watchdog]')) warns.push(m.text()); });
    try {
      const look = async () => {
        const g = await read(P);
        const css = await P.page.evaluate(() => { const d = document.querySelector('.bt-dashboard'); return d ? { inline: d.style.height, computed: getComputedStyle(d).height, transition: getComputedStyle(d).transition } : null; });
        const fold = await P.page.evaluate(() => { const b = document.querySelector('[data-dash-fold]'); return b ? b.getAttribute('data-dash-fold') : null; });
        return { orient: g.o.orient, dashH: g.o.dashH, band: g.o.band, canvas: g.o.canvas, cols: g.o.layout && g.o.layout.cols, rows: g.o.layout && g.o.layout.rows, mode: g.mode, css, fold };
      };
      const up0 = await look();
      await P.page.setViewportSize({ width: 844, height: 390 });
      await P.page.waitForTimeout(2500);
      const side = await look();
      await P.page.setViewportSize({ width: 390, height: 844 });
      await P.page.waitForTimeout(1500);
      const up1 = await look();
      await P.page.waitForTimeout(2500);   /* a watchdog war heals twice a second: give it time to show */
      /* v2.3.4152: sideways it rests folded (its button row alone), and
         upright again it is the upright's own band, open as it was */
      rec.ok('a phone turned sideways and back: 243 -> folded to its button row -> 243 open again, the canvas above it each way, no watchdog heals',
        up0.dashH === 243 && up0.fold !== 'min' && side.orient === 'portrait' && side.fold === 'min' && side.dashH > 0 && side.dashH < 80
          && side.band && side.band.y === 390 - side.dashH
          && !!side.canvas && side.canvas.y + side.canvas.h <= side.band.y + OVERLAP + 1
          && up1.dashH === 243 && up1.fold !== 'min' && up1.cols === 4 && up1.canvas && up1.canvas.w === 390 && warns.length === 0,
        { up0, side, up1, warns: warns.slice(0, 3) });
      /* ...and sideways with OPEN pressed, today's 130 px, 9 across */
      await P.page.setViewportSize({ width: 844, height: 390 });
      await P.page.waitForTimeout(2500);
      await H.unfoldBand(P);
      await P.page.waitForTimeout(1200);
      const sideOpen = await look();
      rec.ok('...and sideways, OPEN pressed, the band is today\'s 130 px with more slots across than upright',
        sideOpen.fold === 'open' && sideOpen.dashH === 130 && sideOpen.cols > 4 && sideOpen.band && sideOpen.band.y === 260,
        sideOpen);
    } finally { await P.ctx.close().catch(() => {}); }
  }

  /* ── v2.3.4152: the device's choice ── */
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
