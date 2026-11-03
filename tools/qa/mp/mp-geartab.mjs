/* ═══ mp-geartab (v2.3.4020): THE GEAR TAB -- YOUR BAG, YOUR BRO AND YOUR GEAR ═══
 *
 * The owner's design (2026-11-02): the resting dashboard is three panels,
 * INVENTORY | BRO | EQUIPMENT (src/ui/mobile/dash/GearTab.jsx).  In the Wheel's
 * BroTown, a character given the test kit's weapons, a second greatsword, a
 * shield and two fish:
 *
 *   upright phone (390 x 844, touch):
 *     1. the band is the Gear tab, three across; the equipment grid's nine
 *        cells, each at least 34 px; the weapon cells wear their level badge
 *        ("Lv n" or "+n"); the sword cell the gold ring (in hand);
 *     2. tap Sword: its blue ring, the pill reads "Swords ×", STATS shows the
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
      rec.ok('[390x844] the equipment grid: Sword Bow Staff / Shield Chest Legs / Cape Amulet Gem, every cell 34 px or more',
        cellsOk && s1.cells.map((c) => c.id).join() === 'sword,bow,staff,shield,chest,legs,cape,amulet,gem', s1.cells.map((c) => [c.id, c.box && c.box.w]));
      const badges = s1.cells.filter((c) => ['sword', 'bow', 'staff'].includes(c.id)).map((c) => c.badge);
      rec.ok('[390x844] each weapon cell wears its combat skill\'s level ("Lv n", or "+n" with points)',
        badges.length === 3 && badges.every((b) => /^(Lv \d+|\+\d+)$/.test(b || '')), badges);
      rec.ok('[390x844] the sword cell (in hand) wears the gold ring; the pill reads "All items"; STATS on, your own numbers',
        s1.cells.find((c) => c.id === 'sword').on && /All items/.test(s1.pill || '') && s1.stats === 'mine', { pill: s1.pill, stats: s1.stats, tabs: s1.tabs });

      /* 2. tap Sword */
      await tapEl(P, '[data-gear-cell="sword"]');
      const s2 = await look(P);
      await P.page.screenshot({ path: `${OUT}/phone-2-sword.png` });
      rec.ok('[390x844] tap Sword: its blue ring, the pill "Swords ×", STATS the sword with ONE button, Unequip',
        s2.cells.find((c) => c.id === 'sword').sel && /Swords/.test(s2.pill || '') && s2.pillClear
          && s2.stats === 'cell' && s2.statsFor === 'sword' && !!s2.name && s2.acts.filter((a) => a !== 'points').join() === 'unequip', s2);
      rec.ok('[390x844] ...and the bag shows swords only', s2.bag.length >= 1 && s2.bag.every((k) => /^stashWeapon-/.test(k)), s2.bag);

      /* 3. tap the spare greatsword in the bag */
      const spare = s2.bag.find((k) => /^stashWeapon-/.test(k));
      await tapEl(P, `[data-gear-bag] [data-bag-key="${spare}"]`);
      const s3 = await look(P);
      await P.page.screenshot({ path: `${OUT}/phone-3-compare.png` });
      rec.ok('[390x844] tap a bag sword: its blue ring, the comparison rows (old → new), Equip at the panel\'s foot (the action list\'s first)',
        s3.bagSel.join() === spare && s3.stats === 'bag' && s3.cmp.length >= 2 && s3.cmp.every((r) => /→/.test(r.text)) && s3.acts.includes('equip')
          && !!(await P.page.$('[data-gear-foot] [data-gear-act="equip"]')), s3);

      /* 4. Equip */
      const before = await rpgOf(P);
      await tapEl(P, '[data-gear-act="equip"]');
      await P.page.waitForTimeout(1800);
      const s4 = await look(P);
      const after = await rpgOf(P);
      const srv = await H.adminPlayer(wsPort, await H.readState(P, (S) => S.myId));
      await P.page.screenshot({ path: `${OUT}/phone-4-equipped.png` });
      rec.ok('[390x844] Equip: the pill back to "All items", nothing picked, STATS your own numbers again',
        /All items/.test(s4.pill || '') && !s4.pillClear && s4.stats === 'mine' && s4.bagSel.length === 0 && !s4.cells.some((c) => c.sel), s4);
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
      rec.ok('[390x844] Show all: "All items" and the whole bag back', /All items/.test(s8.pill || '') && s8.bag.length >= 3 && !s8.empty, s8);
      /* the menu's ✕ is Esc's (data-esc) */
      await tapEl(P, '[data-gear-filter]');
      const esc = await P.page.evaluate(() => { const m = document.querySelector('[data-gear-menu] [data-esc]'); if (!m) return false; m.click(); return true; });
      await P.page.waitForTimeout(300);
      rec.ok('[390x844] the menu\'s ✕ wears data-esc and shuts it', esc && !(await look(P)).menu);

      /* LOOK keeps between visits (per device) */
      await tapEl(P, '[data-gear-tab-btn="look"]');
      const s9 = await look(P);
      await P.page.screenshot({ path: `${OUT}/phone-7-look.png` });
      rec.ok('[390x844] LOOK shows the bro (the character view)', !!(await P.page.$('[data-gear-look] canvas')) && s9.tabs.includes('look:true'), s9.tabs);
      await tapEl(P, '[data-gear-cell="bow"]');
      const s10 = await look(P);
      rec.ok('[390x844] picking a cell shows STATS (the bow)', s10.stats === 'cell' && s10.statsFor === 'bow', s10);
      await tapEl(P, '[data-gear-cell="bow"]');
      const s11 = await look(P);
      rec.ok('[390x844] tapped again, the bow is put down and the filter goes: back to LOOK, the remembered tab',
        !s11.cells.some((c) => c.sel) && /All items/.test(s11.pill || '') && s11.tabs.includes('look:true'), s11);
      await tapEl(P, '[data-gear-tab-btn="stats"]');

      /* sideways: the narrow column, the bag over BRO | EQUIPMENT */
      await P.page.setViewportSize({ width: 844, height: 390 });
      await P.page.waitForTimeout(1500);
      await P.page.evaluate(() => { try { window.__broDashPanelBus.open('dashboard'); } catch (e) { /* no sheet */ } });
      await P.page.waitForTimeout(1500);
      const l1 = await look(P);
      await P.page.screenshot({ path: `${OUT}/side-1.png` });
      rec.ok('[844x390] sideways the column is narrow: the bag on top, BRO | EQUIPMENT side by side under it',
        l1.layout === 'stack' && !!(l1.panes.inv && l1.panes.bro && l1.panes.equip)
          && l1.panes.bro.t >= l1.panes.inv.t + l1.panes.inv.h - 1 && l1.panes.bro.l < l1.panes.equip.l
          && l1.cells.every((c) => c.box && c.box.w >= 34), { panes: l1.panes, cells: l1.cells.map((c) => c.box && c.box.w) });
      /* the kit's shield is in the bag: an empty cell, then the shield on from the bag */
      await tapEl(P, '[data-gear-cell="shield"]');
      const l2 = await look(P);
      await P.page.screenshot({ path: `${OUT}/side-2-shield.png` });
      const shieldTile = l2.bag.find((k) => /^stashShield-/.test(k));
      rec.ok('[844x390] tap the empty Shield cell: "Shields ×", STATS "No shield yet. Pick one from your bag.", the bag the shield',
        /Shields/.test(l2.pill || '') && l2.statsFor === 'shield' && l2.acts.length === 0
          && await P.page.evaluate(() => /No shield yet\. Pick one from your bag\./.test((document.querySelector('[data-gear-stats]') || {}).textContent || ''))
          && !!shieldTile, l2);
      if (shieldTile) {
        await tapEl(P, `[data-gear-bag] [data-bag-key="${shieldTile}"]`);
        const l3 = await look(P);
        rec.ok('[844x390] the bag\'s shield: its comparison (Block, against an empty slot) and Equip at the panel\'s foot',
          l3.stats === 'bag' && l3.cmp.some((r) => r.k === 'Block') && !!(await P.page.$('[data-gear-foot] [data-gear-act="equip"]')), l3);
        await tapEl(P, '[data-gear-act="equip"]');
        await P.page.waitForTimeout(1200);
        await tapEl(P, '[data-gear-cell="shield"]');
        const l4 = await look(P);
        await P.page.screenshot({ path: `${OUT}/side-3-shield-on.png` });
        rec.ok('[844x390] equipped: the Shield cell filled, STATS the shield with one button, Unequip',
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
      rec.ok('[computer] the Gear tab in the column, three across, the weapon bar at its foot wearing 1 2 3, the sword in hand gold',
        d1.layout === 'wide' && d1.bar.map((b) => b.key).join() === '1,2,3' && (d1.bar.find((b) => b.slot === 'melee') || {}).on
          && d1.bar.every((b) => b.box && d1.panes.inv && b.box.t >= d1.panes.inv.t + d1.panes.inv.h - 1), d1);
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
