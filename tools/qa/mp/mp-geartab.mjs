/* ═══ mp-geartab (v2.3.4151): THE GEAR TAB -- YOUR BAG, ONE CARD, YOUR GEAR ═══
 *
 * v2.3.4151: the owner's second mockup (2026-11-03) -- the bag three square
 * slots a row, nine in view (bigger than 34 px), the coins beside "All Items";
 * the middle ONE card, no tabs and no figure: the overview ("<name> Lv N",
 * the HP, MP and EN bars, DEF DODGE RESIST | DMG SPD CRIT RANGE, no "Combat
 * Power") with nothing picked, the pick's card (its picture, name, kind,
 * numbers, one main button) with something picked; "Equipped" over Sword Bow
 * Staff / Chest Legs Cape / Shield Amulet Gem.
 *
 * The owner's design (2026-11-02): the resting dashboard is three panels,
 * INVENTORY | BRO | EQUIPMENT (src/ui/mobile/dash/GearTab.jsx).  In the Wheel's
 * BroTown, a character given the test kit's weapons, a second greatsword, a
 * shield and two fish:
 *
 *   upright phone (390 x 844, touch):
 *     1. the band is the Gear tab, three across; the equipment grid's nine
 *        cells, each at least 34 px; the weapon cells plain (v2.3.4151: no
 *        badge, no XP line); the sword cell the gold ring (in hand);
 *     2. tap Sword: its blue ring, the pill reads "Swords ×", the card shows the
 *        sword by name with ONE button, Unequip;
 *     3. tap the bag's spare greatsword: its blue ring, the comparison rows
 *        ("old → new") and its buttons from the action list (Equip first);
 *     4. Equip: the worker takes it (the spare in the slot), the pill back to
 *        "All items", nothing picked;
 *     5. the pill's menu: its groups and counts; Fish (none held: greyed? no --
 *        two held), then Potions (none): "No potions in your bag" and Show
 *        all, which brings the bag back;
 *     6. Esc-able ✕ on the menu (data-esc);
 *   computer (1280 x 800, wide):
 *     7. the Gear tab in the column, the weapon bar at its foot wearing 1 2 3;
 *        a click on 2 puts the bow in hand -- the WORKER's activeSlot 'ranged'.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const OUT = `${H.REPO}/tools/qa/mp/out/geartab`;

const look = (P) => P.page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const vis = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 ? { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null; };
  const root = q('[data-gear-tab]');
  const cells = [...document.querySelectorAll('[data-gear-cell]')].map((c) => ({
    id: c.getAttribute('data-gear-cell'), box: vis(c), sel: c.getAttribute('data-gear-sel') === '1', on: c.getAttribute('data-gear-active') === '1',
    badge: (c.querySelector('[data-gear-badge]') || {}).textContent || null,
    xpline: !!c.querySelector('[data-xpbar]'), text: c.textContent.trim(),
  }));
  const stats = q('[data-gear-stats]');
  return {
    layout: root ? root.getAttribute('data-gear-layout') : null,
    root: vis(root),
    panes: Object.fromEntries([...document.querySelectorAll('[data-gear-pane]')].map((p) => [p.getAttribute('data-gear-pane'), vis(p)])),
    cells,
    pill: (q('[data-gear-filter]') || {}).textContent || null,
    pillClear: !!q('[data-gear-filter-clear]'),
    stats: stats ? stats.getAttribute('data-gear-stats') : null,
    statsFor: stats ? stats.getAttribute('data-gear-stats-for') : null,
    name: (q('[data-gear-name]') || {}).textContent || null,
    acts: [...document.querySelectorAll('[data-gear-act]')].map((b) => b.getAttribute('data-gear-act')),
    cmp: [...document.querySelectorAll('[data-gear-cmp]')].map((r) => ({ k: r.getAttribute('data-gear-cmp'), tone: Number(r.getAttribute('data-tone')), text: r.textContent })),
    bagSel: [...document.querySelectorAll('[data-gear-bag] [data-gear-sel="1"]')].map((t) => t.getAttribute('data-bag-key')),
    bag: [...document.querySelectorAll('[data-gear-bag] [data-bag-key]')].map((t) => t.getAttribute('data-bag-key')),
    menu: !!q('[data-gear-menu]'),
    rows: [...document.querySelectorAll('[data-gear-filter-row]')].map((r) => ({ id: r.getAttribute('data-gear-filter-row'), n: Number(r.getAttribute('data-count')) })),
    empty: (q('[data-gear-empty]') || {}).textContent || null,
    tabs: [...document.querySelectorAll('[data-gear-tab-btn]')].map((b) => b.getAttribute('data-gear-tab-btn') + ':' + b.getAttribute('aria-pressed')),
    /* v2.3.4151: the card's view and its parts, the bag's squares */
    who: (q('[data-gear-who]') || {}).textContent || null,
    bars: [...document.querySelectorAll('[data-gear-bars] [data-vital]')].map((b) => b.getAttribute('data-vital')),
    skills: [...document.querySelectorAll('[data-gear-skill]')].map((b) => ({ id: b.getAttribute('data-gear-skill'), lvl: Number(b.getAttribute('data-lvl')), open: b.hasAttribute('data-gear-xpopen'), img: !!b.querySelector('img'), xpbar: !!b.querySelector('[data-xpbar]'), num: (b.querySelector('[data-gear-xpnum]') || {}).textContent || null, text: b.textContent, box: vis(b),
      /* v2.3.4161: the level label above the icon */
      lvAbove: (() => { const l = b.querySelector('[data-gear-skill-lv]'), i = b.querySelector('img'); if (!l || !i) return null; return l.getBoundingClientRect().bottom <= i.getBoundingClientRect().top + 1; })() })),
    /* v2.3.4151: the card never scrolls, nothing in it under 11 px, its
       border the pick's blue while something is picked; the two grids one size */
    fit: (() => {
      const c = q('[data-gear-pane="bro"]');
      if (!c) return null;
      const sc = c.querySelector('[data-gear-scroll]');
      const cr = c.getBoundingClientRect();
      const fonts = [];
      c.querySelectorAll('*').forEach((el) => {
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) fonts.push({ f: parseFloat(getComputedStyle(el).fontSize), t: el.textContent.trim().slice(0, 16) });
      });
      const small = fonts.filter((x) => x.f < 11);
      const out = [...c.querySelectorAll('button, [data-gear-grid] > *')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.right > cr.right + 0.5 || r.bottom > cr.bottom + 0.5); }).length;
      return { over: c.scrollHeight - c.clientHeight, scOver: sc ? sc.scrollHeight - sc.clientHeight : 0, small, outside: out,
        border: getComputedStyle(c).borderTopColor, linked: c.getAttribute('data-gear-linked') === '1' };
    })(),
    ringOf: (() => { const el = q('[data-gear-sel="1"]'); return el ? getComputedStyle(el).boxShadow : null; })(),
    sizes: (() => {
      const b = q('[data-gear-bag] [data-bag-key], [data-gear-bag] [data-gear-slot-empty]');
      const c = q('[data-gear-cell]');
      return { bag: b ? Math.round(b.getBoundingClientRect().width * 10) / 10 : null, cell: c ? Math.round(c.getBoundingClientRect().width * 10) / 10 : null };
    })(),
    goldBadge: (q('[data-gear-gold-badge]') || {}).textContent || null,
    columns: !!q('[data-gear-body], [data-gear-attack]'),
    gold: q('[data-gear-gold]') ? { n: Number(q('[data-gear-gold]').getAttribute('data-gear-gold')), box: vis(q('[data-gear-gold]')) } : null,
    pillBox: vis(q('[data-gear-filter]')),
    eqHead: (q('[data-gear-eqhead]') || {}).textContent || null,
    qty: (q('[data-gear-qty]') || { getAttribute: () => null }).getAttribute('data-gear-qty'),
    art: !!q('[data-gear-art] img'),
    figure: !!q('[data-gear-pane="bro"] canvas'),
    view: (q('[data-gear-pane="bro"]') || { getAttribute: () => null }).getAttribute('data-gear-view'),
    level: (q('[data-gear-level]') || { getAttribute: () => null }).getAttribute('data-gear-level'),
    power: /combat power/i.test((q('[data-gear-tab]') || {}).textContent || ''),
    squares: (() => {
      const g = q('[data-gear-bag]');
      if (!g) return null;
      const gr = g.getBoundingClientRect();
      const all = [...g.querySelectorAll('[data-bag-key], [data-gear-slot-empty]')].map((t) => t.getBoundingClientRect());
      const inView = all.filter((r) => r.top < gr.bottom - 2);
      const lefts = new Set(all.map((r) => Math.round(r.left)));
      return { n: all.length, empties: g.querySelectorAll('[data-gear-slot-empty]').length, cols: lefts.size, minW: Math.round(Math.min(...all.map((r) => r.width))), minH: Math.round(Math.min(...all.map((r) => r.height))), inView: inView.length };
    })(),
    bar: [...document.querySelectorAll('[data-weapon-bar] [data-weapon-slot]')].map((b) => ({ slot: b.getAttribute('data-weapon-slot'), key: b.getAttribute('data-key'), on: b.getAttribute('data-weapon-on') === '1', box: vis(b) })),
  };
});

const rpgOf = (P) => P.page.evaluate(() => {
  const R = (window._gameState && window._gameState.current && window._gameState.current.rpg) || {};
  const w = (x) => (x ? { type: x.type, name: x.name, gearBase: x.gearBase } : null);
  return { weapon: w(R.weapon), ranged: w(R.rangedWeapon), staff: w(R.staffWeapon), stash: (R.weaponStash || []).map(w), active: R.activeSlot, shield: !!R.shield };
});

/* a real finger (CDP touch) at an element's middle -- the browser hit-tests it */
async function tapEl(P, sel) {
  const b = await P.page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    e.scrollIntoView({ block: 'nearest' });   /* a row down a menu, as a thumb would scroll to it */
    const r = e.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel);
  await P.page.waitForTimeout(150);
  if (!b) return false;
  await P.page.touchscreen.tap(b.x, b.y);
  await P.page.waitForTimeout(500);
  return true;
}

async function seed(P, wsPort, rec, tag) {
  const id = await H.readState(P, (S) => S.myId);
  const armed = await H.armWorker(P, wsPort, id, ['bow', 'staff']);
  /* the sword in hand, then a second greatsword in the bag to compare */
  await H.devOp(wsPort, 'kit', id, { what: 'weapons' }).catch(() => null);
  await P.page.waitForTimeout(1200);
  const r0 = await rpgOf(P);
  if (!r0.weapon) {
    await H.equipWeapon(P, 'greatsword', 'weapon', 'melee');
    await P.page.waitForTimeout(1500);
  } else {
    await P.page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'set_active_slot', payload: { slot: 'melee' } }); S.rpg.activeSlot = 'melee'; S._userCycledSlot = true; });
  }
  await H.devOp(wsPort, 'kit', id, { what: 'shield' }).catch(() => null);
  await H.grant(wsPort, id, 'item', { invKey: 'fish_minnow', count: 2 }).catch(() => null);
  await P.page.waitForTimeout(2500);
  const r = await rpgOf(P);
  rec.ok(`[${tag}] seeded: a greatsword in hand, a bow and a staff on, a spare greatsword in the bag`,
    !!(r.weapon && r.ranged && r.staff && r.stash.some((w) => w && w.type === 'greatsword')), { armed, r });
  return id;
}

/* v2.3.4151: the owner's "without needing to do any scrolling" -- the card's
   fit, its 11 px floor, its blue link, the grids' one size, at one state */
const BLUE = 'rgb(79, 143, 222)';   /* GEAR_SEL_BLUE */
function fitOk(rec, tag, s, picked) {
  const f = s.fit || {};
  rec.ok(`${tag}: the card fits -- no scrolling (scrollHeight <= clientHeight + 1), nothing past its edge, nothing under 11 px`,
    f.over <= 1 && f.scOver <= 1 && f.outside === 0 && f.small && f.small.length === 0, f);
  rec.ok(`${tag}: ${picked ? 'the card wears the pick\'s blue (the ring\'s own colour)' : 'nothing picked: the card\'s own border, not the blue'}`,
    picked ? (f.border === BLUE && f.linked && /rgb\(79, 143, 222\)/.test(s.ringOf || '')) : (f.border !== BLUE && !f.linked), { border: f.border, ring: s.ringOf });
}
/* `floor`: 34 px, except the sideways column (~222 px), where two grids of
   three side by side cannot both be 34 px and the brief's rule is "shrink both
   grids equally rather than make them differ" -- 32 px there */
function sameSize(rec, tag, s, floor) {
  const f = floor || 34;
  rec.ok(`${tag}: the Equipped cells are the bag's squares' size (within 1 px), ${f} px or more`,
    s.sizes && s.sizes.bag && s.sizes.cell && Math.abs(s.sizes.bag - s.sizes.cell) <= 1 && s.sizes.cell >= f, s.sizes);
}

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });

  /* ══ the upright phone ══ */
  {
    const P = await H.newPlayer(browser, { name: 'Geary', wsPort, webPort, touch: true, world: 'wheel', viewport: { width: 390, height: 844 } });
    try {
      await H.enterWorld(P);
      await seed(P, wsPort, rec, '390x844');
      await H.unfoldBand(P);
      await P.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) { /* at rest */ } });
      await P.page.waitForTimeout(1200);
      const s1 = await look(P);
      await P.page.screenshot({ path: `${OUT}/phone-1-rest.png` });
      const cellsOk = s1.cells.length === 9 && s1.cells.every((c) => c.box && c.box.w >= 34 && c.box.h >= 34);
      rec.ok('[390x844] the band is the Gear tab, three across: INVENTORY | BRO | EQUIPMENT, left to right',
        s1.layout === 'wide' && !!(s1.panes.inv && s1.panes.bro && s1.panes.equip)
          && s1.panes.inv.l < s1.panes.bro.l && s1.panes.bro.l < s1.panes.equip.l, { layout: s1.layout, panes: s1.panes });
      rec.ok('[390x844] the equipment grid in the mockup\'s order: Sword Bow Staff / Chest Legs Cape / Shield Amulet Gem, every cell 34 px or more',
        cellsOk && s1.cells.map((c) => c.id).join() === 'sword,bow,staff,chest,legs,cape,shield,amulet,gem', s1.cells.map((c) => [c.id, c.box && c.box.w]));
      /* v2.3.4151: the mockup's bag -- four square slots a row, never under
         34 px, every square in view a slot (the rest empty squares) */
      /* v2.3.4151: the owner's "9 visible slots" -- three by three, bigger */
      rec.ok('[390x844] the bag: three square slots a row, nine in view, each 34 px or more, empty squares filling the view',
        !!s1.squares && s1.squares.cols === 3 && s1.squares.minW >= 34 && s1.squares.minH >= 34 && s1.squares.inView === 9
          && s1.squares.n % 3 === 0, s1.squares);
      rec.ok('[390x844] the coins beside the filter pill, on its row (the coin picture, the amount a count badge), the pill "All Items"',
        !!s1.gold && !!s1.pillBox && s1.gold.box && s1.gold.box.l > s1.pillBox.l && Math.abs(s1.gold.box.t + s1.gold.box.h / 2 - (s1.pillBox.t + s1.pillBox.h / 2)) <= 3
          && s1.goldBadge === (s1.gold.n >= 10000 ? s1.goldBadge : s1.gold.n.toLocaleString('en-US')) && !!s1.goldBadge
          && /All items/i.test(s1.pill || ''), { gold: s1.gold, badge: s1.goldBadge, pill: s1.pill, pillBox: s1.pillBox });
      sameSize(rec, '[390x844]', s1);
      fitOk(rec, '[390x844] the overview', s1, false);
      const badges = s1.cells.filter((c) => ['sword', 'bow', 'staff'].includes(c.id)).map((c) => c.badge);
      /* v2.3.4151, the owner: "remove the points badges and thin xp lines from those" */
      const wcells = s1.cells.filter((c) => ['sword', 'bow', 'staff'].includes(c.id));
      rec.ok('[390x844] "Equipped" over the grid; the weapon cells plain -- their picture only, no level or points badge, no XP line',
        s1.eqHead === 'Equipped' && wcells.length === 3 && wcells.every((c) => !c.badge && !c.xpline && c.text === ''), { head: s1.eqHead, cells: wcells.map((c) => [c.id, c.badge, c.xpline, c.text]) });
      rec.ok('[390x844] the sword cell (in hand) gold; the card the overview: no tabs, no figure',
        s1.cells.find((c) => c.id === 'sword').on && s1.stats === 'mine' && s1.view === 'overview' && s1.tabs.length === 0 && !s1.figure,
        { stats: s1.stats, view: s1.view, tabs: s1.tabs, figure: s1.figure });
      rec.ok('[390x844] the overview: "<name> Lv N", the HP, MP and EN bars (one energy bar: stamina is the energy), no stat columns, no "Combat Power"',
        s1.who === 'Geary' && Number(s1.level) >= 1 && s1.bars.join() === 'hp,mana,stamina' && !s1.columns && !s1.power,
        { who: s1.who, level: s1.level, bars: s1.bars, columns: s1.columns, power: s1.power });
      rec.ok('[390x844] ...then Melee, Bow and Magic as three tiles side by side: each only its picture and "Lv N" (no XP bar, no points badge)',
        s1.skills.length === 3 && s1.skills.every((k) => !k.open && k.img && !k.xpbar && /^Lv \d+$/.test(k.text.trim()) && k.lvl >= 1)
          && s1.skills[0].box.t === s1.skills[1].box.t && s1.skills[1].box.l > s1.skills[0].box.l, s1.skills);
      /* v2.3.4161, the owner: "list the level of each weapon above the icon" */
      rec.ok('[390x844] ...each tile\'s "Lv N" sits above its icon',
        s1.skills.length === 3 && s1.skills.every((k) => k.lvAbove === true), s1.skills.map((k) => [k.id, k.lvAbove]));
      /* a tap turns a tile into its XP bar; a second tap turns it back */
      await tapEl(P, `[data-gear-skill="${s1.skills[0].id}"]`);
      const sx = await look(P);
      await P.page.screenshot({ path: `${OUT}/phone-1b-xp.png` });
      rec.ok('[390x844] tap Melee: its tile turns into its XP bar, "current / next XP" (the top bar\'s numbers)',
        sx.skills.length === 1 && sx.skills[0].open && sx.skills[0].xpbar && /^[\d,]+ \/ [\d,]+ XP$|^Fully levelled$/.test(sx.skills[0].num || ''), sx.skills);
      fitOk(rec, '[390x844] the overview, an XP bar open', sx, false);
      await tapEl(P, '[data-gear-xpopen]');
      const sx2 = await look(P);
      rec.ok('[390x844] ...a second tap turns it back into the three tiles', sx2.skills.length === 3 && sx2.skills.every((k) => !k.open), sx2.skills);

      /* 2. tap Sword */
      await tapEl(P, '[data-gear-cell="sword"]');
      const s2 = await look(P);
      await P.page.screenshot({ path: `${OUT}/phone-2-sword.png` });
      rec.ok('[390x844] tap Sword: its blue ring, the bag filtered to swords with its ×, the card the sword (its picture) with ONE button, Unequip',
        s2.cells.find((c) => c.id === 'sword').sel && /Swords/.test(s2.pill || '') && s2.pillClear
          && s2.view === 'item' && s2.art
          && s2.stats === 'cell' && s2.statsFor === 'sword' && !!s2.name && s2.acts.filter((a) => a !== 'points').join() === 'unequip', s2);
      fitOk(rec, '[390x844] the Sword slot', s2, true);
      rec.ok('[390x844] ...and the bag shows swords only', s2.bag.length >= 1 && s2.bag.every((k) => /^stashWeapon-/.test(k)), s2.bag);

      /* 3. tap the spare greatsword in the bag */
      const spare = s2.bag.find((k) => /^stashWeapon-/.test(k));
      await tapEl(P, `[data-gear-bag] [data-bag-key="${spare}"]`);
      const s3 = await look(P);
      await P.page.screenshot({ path: `${OUT}/phone-3-compare.png` });
      rec.ok('[390x844] tap a bag sword: its blue ring, its numbers against the sword worn (the change inline, green / red), Equip at the card\'s foot (the action list\'s first)',
        s3.bagSel.join() === spare && s3.stats === 'bag' && s3.cmp.length >= 2 && s3.cmp.every((r) => Number.isFinite(r.tone)) && s3.acts.includes('equip')
          && !!(await P.page.$('[data-gear-foot] [data-gear-act="equip"]')), s3);

      fitOk(rec, '[390x844] a bag sword compared', s3, true);

      /* 4. Equip */
      const before = await rpgOf(P);
      await tapEl(P, '[data-gear-act="equip"]');
      await P.page.waitForTimeout(1800);
      const s4 = await look(P);
      const after = await rpgOf(P);
      const srv = await H.adminPlayer(wsPort, await H.readState(P, (S) => S.myId));
      await P.page.screenshot({ path: `${OUT}/phone-4-equipped.png` });
      rec.ok('[390x844] Equip: the pill back to "All Items", nothing picked, the overview again',
        /All items/i.test(s4.pill || '') && !s4.pillClear && s4.stats === 'mine' && s4.view === 'overview' && s4.bagSel.length === 0 && !s4.cells.some((c) => c.sel), s4);
      rec.ok('[390x844] ...the worker took it: the hand still the sword slot, the bag the same count of weapons',
        after.active === 'melee' && after.stash.length === before.stash.length && !!(srv.live || srv.rpg), { before, after });

      /* 5. the menu, Fish, then an empty kind */
      await tapEl(P, '[data-gear-filter]');
      const s5 = await look(P);
      await P.page.screenshot({ path: `${OUT}/phone-5-menu.png` });
      const ids = s5.rows.map((r) => r.id);
      rec.ok('[390x844] the pill drops its menu over the bag: every group, each with its count',
        s5.menu && ['all', 'sword', 'bow', 'staff', 'shield', 'chest', 'legs', 'cape', 'amulet', 'gem', 'ore', 'wood', 'crops', 'fish', 'food', 'potion', 'quest', 'other'].every((x) => ids.includes(x))
          && (s5.rows.find((r) => r.id === 'fish') || {}).n >= 1, s5.rows);
      rec.ok('[390x844] ...over the inventory panel only (the other two stay put)',
        JSON.stringify(s5.panes.bro) === JSON.stringify(s4.panes.bro) && JSON.stringify(s5.panes.equip) === JSON.stringify(s4.panes.equip), { s4: s4.panes, s5: s5.panes });
      await tapEl(P, '[data-gear-filter-row="fish"]');
      const s6 = await look(P);
      rec.ok('[390x844] Fish: the menu shut, the pill "Fish ×", the bag the fish', !s6.menu && /Fish/.test(s6.pill || '') && s6.pillClear
        && s6.bag.length >= 1 && s6.bag.every((k) => /^i-fish_/.test(k)), s6);
      await tapEl(P, '[data-gear-filter]');
      await tapEl(P, '[data-gear-filter-row="potion"]');
      const s7 = await look(P);
      await P.page.screenshot({ path: `${OUT}/phone-6-empty.png` });
      rec.ok('[390x844] an empty kind is never a mysterious empty bag: "No potions in your bag" and Show all',
        /No potions in your bag/.test(s7.empty || '') && !!(await P.page.$('[data-gear-showall]')), s7);
      await tapEl(P, '[data-gear-showall]');
      const s8 = await look(P);
      rec.ok('[390x844] Show all: "All Items" and the whole bag back', /All items/i.test(s8.pill || '') && s8.bag.length >= 3 && !s8.empty, s8);
      /* the menu's ✕ is Esc's (data-esc) */
      await tapEl(P, '[data-gear-filter]');
      const esc = await P.page.evaluate(() => { const m = document.querySelector('[data-gear-menu] [data-esc]'); if (!m) return false; m.click(); return true; });
      await P.page.waitForTimeout(300);
      rec.ok('[390x844] the menu\'s ✕ wears data-esc and shuts it', esc && !(await look(P)).menu);

      /* v2.3.4151: a stack -- its card, then the same piece again or the
         empty bag puts it down */
      const fishKey = s8.bag.find((k) => /^i-fish_/.test(k));
      await tapEl(P, `[data-gear-bag] [data-bag-key="${fishKey}"]`);
      const s9 = await look(P);
      await P.page.screenshot({ path: `${OUT}/phone-7-item.png` });
      rec.ok('[390x844] tap the fish: the card shows it -- its picture, its name, "Qty: 2", its buttons from the one list (Inspect where the worker weighs)',
        s9.view === 'item' && s9.stats === 'bag' && s9.art && !!s9.name && s9.qty === '2' && s9.bagSel.join() === fishKey, s9);
      fitOk(rec, '[390x844] a material (the fish)', s9, true);
      await tapEl(P, `[data-gear-bag] [data-bag-key="${fishKey}"]`);
      const s10 = await look(P);
      rec.ok('[390x844] the fish again: back to the overview', s10.view === 'overview' && s10.stats === 'mine' && s10.bagSel.length === 0, s10);
      await tapEl(P, `[data-gear-bag] [data-bag-key="${fishKey}"]`);
      await tapEl(P, '[data-gear-bag] [data-gear-slot-empty]');
      const s11 = await look(P);
      rec.ok('[390x844] picked again, then an empty square tapped: back to the overview', s11.view === 'overview' && s11.bagSel.length === 0, s11);
      await tapEl(P, '[data-gear-cell="bow"]');
      const s12 = await look(P);
      await tapEl(P, '[data-gear-cell="bow"]');
      const s13 = await look(P);
      rec.ok('[390x844] the Bow cell: the card the bow and the bag filtered; tapped again, both go (the overview, "All Items")',
        s12.view === 'item' && s12.statsFor === 'bow' && /Bows/.test(s12.pill || '')
          && s13.view === 'overview' && /All items/i.test(s13.pill || '') && !s13.cells.some((c) => c.sel), { s12: [s12.view, s12.statsFor, s12.pill], s13: [s13.view, s13.pill] });

      /* v2.3.4151: the same at 360 x 780 -- the narrow phone pays for its
         34 px squares out of the card, which still fits every state */
      await P.page.setViewportSize({ width: 360, height: 780 });
      await P.page.waitForTimeout(1500);
      await P.page.evaluate(() => { try { window.__broDashPanelBus.toBar(); } catch (e) { /* at rest */ } const g = window.__btGearTab; if (g) { g.bus.afterChange(); g.bus.clearFilter(); } });
      await P.page.waitForTimeout(800);
      const n1 = await look(P);
      await P.page.screenshot({ path: `${OUT}/narrow-1-overview.png` });
      rec.ok('[360x780] three across still', n1.layout === 'wide', n1.layout);
      sameSize(rec, '[360x780]', n1);
      fitOk(rec, '[360x780] the overview', n1, false);
      await tapEl(P, `[data-gear-skill="${(n1.skills[1] || {}).id}"]`);
      fitOk(rec, '[360x780] the overview, an XP bar open', await look(P), false);
      await tapEl(P, '[data-gear-xpopen]');
      const oreKey = n1.bag.find((k) => /^i-fish_/.test(k));
      await tapEl(P, `[data-gear-bag] [data-bag-key="${oreKey}"]`);
      fitOk(rec, '[360x780] a material', await look(P), true);
      await tapEl(P, `[data-gear-bag] [data-bag-key="${oreKey}"]`);
      await tapEl(P, '[data-gear-cell="sword"]');
      const n2 = await look(P);
      await P.page.screenshot({ path: `${OUT}/narrow-2-slot.png` });
      fitOk(rec, '[360x780] the Sword slot', n2, true);
      const spare2 = n2.bag.find((k) => /^stashWeapon-/.test(k));
      if (spare2) await tapEl(P, `[data-gear-bag] [data-bag-key="${spare2}"]`);
      const n3 = await look(P);
      await P.page.screenshot({ path: `${OUT}/narrow-3-compare.png` });
      rec.ok('[360x780] a bag sword compared (guard)', n3.stats === 'bag' && n3.cmp.length >= 2, { stats: n3.stats, cmp: n3.cmp.length });
      fitOk(rec, '[360x780] a bag sword compared', n3, true);
      await P.page.evaluate(() => { const g = window.__btGearTab; if (g) { g.bus.afterChange(); g.bus.clearFilter(); } });
      await P.page.setViewportSize({ width: 390, height: 844 });
      await P.page.waitForTimeout(1200);

      /* sideways: the narrow column, the bag over BRO | EQUIPMENT */
      await P.page.setViewportSize({ width: 844, height: 390 });
      await P.page.waitForTimeout(1500);
      await P.page.evaluate(() => { try { window.__broDashPanelBus.open('dashboard'); } catch (e) { /* no sheet */ } });
      await P.page.waitForTimeout(1500);
      const l1 = await look(P);
      await P.page.screenshot({ path: `${OUT}/side-1.png` });
      /* v2.3.4161: since #1410 (v2.3.4152) a sideways phone opens the ONE
         band, a short row: the bag | the card | the gear, side by side (the
         stacked column -- the bag and the gear over the card -- is the band
         switched off, ?oneband=0).  Either is the Gear tab laid out right. */
      const stacked = l1.layout === 'stack' && !!(l1.panes.inv && l1.panes.bro && l1.panes.equip)
        && l1.panes.inv.l < l1.panes.equip.l && Math.abs(l1.panes.inv.t - l1.panes.equip.t) <= 1
        && l1.panes.bro.t >= l1.panes.inv.t + l1.panes.inv.h - 1;
      const row = !!(l1.panes.inv && l1.panes.bro && l1.panes.equip)
        && l1.panes.inv.l < l1.panes.bro.l && l1.panes.bro.l < l1.panes.equip.l
        && Math.abs(l1.panes.inv.t - l1.panes.bro.t) <= 1 && Math.abs(l1.panes.bro.t - l1.panes.equip.t) <= 1;
      rec.ok('[844x390] sideways: the one band\'s row (the bag | the card | the gear), or with the band off the column (the bag and the gear over the card)',
        stacked || row, { panes: l1.panes, layout: l1.layout });
      sameSize(rec, '[844x390]', l1, 32);
      fitOk(rec, '[844x390] the overview', l1, false);
      /* the kit's shield is in the bag: an empty cell, then the shield on from the bag */
      await tapEl(P, '[data-gear-cell="shield"]');
      const l2 = await look(P);
      await P.page.screenshot({ path: `${OUT}/side-2-shield.png` });
      const shieldTile = l2.bag.find((k) => /^stashShield-/.test(k));
      rec.ok('[844x390] tap the empty Shield cell: the bag filtered to shields with its ×, the card "No shield yet. Pick one from your bag."',
        /Shields/.test(l2.pill || '') && l2.statsFor === 'shield' && l2.acts.length === 0
          && await P.page.evaluate(() => /No shield yet\. Pick one from your bag\./.test((document.querySelector('[data-gear-stats]') || {}).textContent || ''))
          && !!shieldTile, l2);
      if (shieldTile) {
        await tapEl(P, `[data-gear-bag] [data-bag-key="${shieldTile}"]`);
        const l3 = await look(P);
        rec.ok('[844x390] the bag\'s shield: its comparison (Block, against an empty slot) and Equip at the card\'s foot',
          l3.stats === 'bag' && l3.cmp.some((r) => r.k === 'Block') && !!(await P.page.$('[data-gear-foot] [data-gear-act="equip"]')), l3);
        fitOk(rec, '[844x390] the bag\'s shield compared', l3, true);
        await tapEl(P, '[data-gear-act="equip"]');
        await P.page.waitForTimeout(1200);
        await tapEl(P, '[data-gear-cell="shield"]');
        const l4 = await look(P);
        await P.page.screenshot({ path: `${OUT}/side-3-shield-on.png` });
        rec.ok('[844x390] equipped: the Shield cell filled, the card the shield with one button, Unequip',
          (l4.cells.find((c) => c.id === 'shield') || {}).sel && l4.statsFor === 'shield' && l4.acts.join() === 'unequip' && !!l4.name, l4);
      }
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }

  /* ══ a computer playing wide ══ */
  {
    const P = await H.newPlayer(browser, { name: 'Deska', wsPort, webPort, world: 'wheel', wide: true, viewport: { width: 1280, height: 800 } });
    try {
      await H.enterWorld(P);
      const id = await seed(P, wsPort, rec, 'computer');
      await P.page.evaluate(() => { try { window.__broDashPanelBus.open('dashboard'); } catch (e) { /* no sheet */ } });
      await P.page.waitForTimeout(1500);
      const d1 = await look(P);
      await P.page.screenshot({ path: `${OUT}/desk-1.png` });
      /* v2.3.4161: in the computer's one band (the default since #1410) the
         bar stands BESIDE the three (GearTab barBeside); in the old column
         it sat at their foot */
      rec.ok('[computer] the Gear tab three across, the weapon bar (at its foot, or beside the three in the band) wearing 1 2 3, the sword in hand gold',
        d1.layout === 'wide' && d1.bar.map((b) => b.key).join() === '1,2,3' && (d1.bar.find((b) => b.slot === 'melee') || {}).on
          && d1.bar.every((b) => b.box && d1.panes.inv && d1.panes.equip
            && (b.box.t >= d1.panes.inv.t + d1.panes.inv.h - 1 || b.box.l >= d1.panes.equip.l + d1.panes.equip.w - 1)), d1);
      sameSize(rec, '[computer]', d1);
      fitOk(rec, '[computer] the overview', d1, false);
      const b = d1.bar.find((x) => x.slot === 'ranged');
      await P.page.mouse.click(b.box.l + b.box.w / 2, b.box.t + b.box.h / 2);
      await P.page.waitForTimeout(1500);
      /* the worker's own record (its paced save: wait for it) */
      let srvSlot = null;
      for (let i = 0; i < 40 && srvSlot !== 'ranged'; i++) {
        const srv = await H.adminPlayer(wsPort, id).catch(() => null);
        srvSlot = srv && srv.rpg ? srv.rpg.activeSlot : null;
        if (srvSlot !== 'ranged') await P.page.waitForTimeout(500);
      }
      const r = await rpgOf(P);
      const d2 = await look(P);
      await P.page.screenshot({ path: `${OUT}/desk-2-bow.png` });
      rec.ok('[computer] a click on 2 puts the bow in hand: the page and the WORKER say ranged, the chip gold',
        r.active === 'ranged' && srvSlot === 'ranged' && (d2.bar.find((x) => x.slot === 'ranged') || {}).on, { page: r.active, srvSlot });
      rec.ok('[computer] ...and the Gear tab\'s gold ring moved to the bow cell', (d2.cells.find((c) => c.id === 'bow') || {}).on && !(d2.cells.find((c) => c.id === 'sword') || {}).on, d2.cells);
    } finally {
      await P.ctx.close().catch(() => {});
    }
  }
}
