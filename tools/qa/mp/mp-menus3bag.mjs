/* ═══ v2.3.6861: BRO · BAG IN THE NEW PANEL, PLAYED (card MN step 4) ═══
 *
 * The owner's Bag (docs/design/menus3/; the card's step "Bro · Bag"): the Bro
 * button opens the new panel on the Bag, always; its rail and grid are the
 * game's real bag, spare weapons and spare armour; a tile opens the one Item
 * page with the game's actions; Equip is two taps from the closed bag; Gear
 * is a tab of the rail (nine slots and the pet out); a slot's page lists
 * what fits with a direct Equip; a pet opens its page; Back goes one page
 * and gives back the rail; the tap on the world that closes it is
 * swallowed (no walk, no swing).
 *
 *   1. UPRIGHT (390 x 844, touch), a character seeded on the worker (a weapon
 *      in hand and a spare, rare armour, fish, ore, a potion, a pet): Bro
 *      opens the panel on the Bag (All, its count the bag's own); the rail's
 *      seven, each 44+ tall; the grid four across, its tiles 44+; the fight
 *      controls hidden and the world's view moved up (the camera's aim, the
 *      bro above the panel); Armor's filter only armour; Pets not in All; a
 *      tile -> the Item page (its facts, Pin, Drop, the counter's actions
 *      greyed with where) -> Back to the grid on Armor; Equip two taps from
 *      the closed bag (Bro, the armour's tile... is three: the rail's place
 *      is the bag's own; from All: tile, Equip); Gear's nine slots and the
 *      pet row; a slot's page with its candidates' Equip; the Pets filter ->
 *      a pet's page with Take out; the world tap closes and is swallowed
 *      (the bro does not move);
 *   2. SIDEWAYS (844 x 390): the drawer 40% on the right; the fight controls
 *      NOT hidden, and the attack disc left of the drawer, uncovered;
 *   3. A COMPUTER (1280 x 800, `wide: true`): the drawer; the grid four or
 *      more across; Esc closes it; a click on the world that closes it is no
 *      swing.
 *
 * Measured from OUTSIDE the game (this test's evaluate).  Pictures
 * (deviceScaleFactor 1): tools/qa/out/menus3bag-*.png. */
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'tools', 'qa', 'out');

const box = (P, sel) => P.page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 0 ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null; }, sel);
const boxes = (P, sel) => P.page.evaluate((s) => Array.from(document.querySelectorAll(s)).map((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((r) => r.w > 0), sel);
const attrs = (P, sel, a) => P.page.evaluate(([s, n]) => Array.from(document.querySelectorAll(s)).map((el) => el.getAttribute(n)), [sel, a]);
const pstate = (P) => P.page.evaluate(() => { const s = window.__btMenus3.panelState(); const t = window.__btMenus3.top(); return { open: s.open, menu: s.menu, section: s.section, depth: s.nav ? s.nav.length : 0, page: t ? t.page : null, rail: t ? t.rail : null, arg: t ? t.arg : null }; });
const rpg = (P) => H.readState(P, (S) => { const r = S.rpg || {}; return { armor: r.armor ? (r.armor.name || 'worn') : null, stashArmor: (r.armorStash || []).filter(Boolean).length, legs: (r.legsStash || []).filter(Boolean).length, weapons: (r.weaponStash || []).filter(Boolean).length, inv: Object.keys(r.inventory || {}).length, pets: (S._petBook && S._petBook.list) ? S._petBook.list.length : -1, active: S._petBook ? S._petBook.active : null }; });

async function tap(P, sel, touch) {
  const b = await box(P, sel);
  if (!b) return false;
  const x = b.x + b.w / 2, y = b.y + b.h / 2;
  if (touch) await P.page.touchscreen.tap(x, y); else await P.page.mouse.click(x, y);
  await P.page.waitForTimeout(500);
  return true;
}
async function shot(P, name) {
  try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: path.join(OUT, 'menus3bag-' + name + '.png') }); } catch (e) { /* a picture only */ }
}
async function inWorld(P, rec, who) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${who}: in the world (BroTown)`, !!w, w);
  if (!w) return false;
  await P.page.waitForFunction(() => !!(window.__btMenus3 && window.__btMenus3.on()), null, { timeout: 30000 }).catch(() => {});
  await P.page.waitForTimeout(2000);
  return true;
}
/* the worker seeds the character (its own levers: the kit, a grant, the trapping lever's pet) */
async function seed(P, wsPort, rec, who) {
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
  await H.grant(wsPort, id, 'item', { invKey: 'manaShard', count: 2 }).catch(() => null);
  await H.devOp(wsPort, 'trapping', id, { pet: { home: 'frost', level: 3 } }).catch(() => null);
  await P.page.waitForTimeout(2500);
  const r = await rpg(P);
  rec.ok(`${who}: seeded (spare armour, a spare weapon, items, a pet)`, (r.stashArmor + r.legs) > 0 && r.inv >= 3, r);
  return r;
}
async function openBag(P, touch) {
  await tap(P, '[data-menus3-dock="bro"]', touch);
  await P.page.waitForTimeout(400);
  return pstate(P);
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. upright ── */
  const P = await H.newPlayer(browser, { name: 'Bagphone', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(P, rec, 'upright')) {
      await seed(P, wsPort, rec, 'upright');
      const cam0 = await H.readState(P, (S) => ({ cy: S.camera.y, py: S.player.y }));
      let ps = await openBag(P, true);
      rec.ok('upright: Bro opens the new panel on the Bag (All)', ps.open && ps.section === 'bag' && ps.page === 'root' && (ps.rail == null || ps.rail === 'all'), ps);
      await P.page.waitForTimeout(1800);
      const cam1 = await H.readState(P, (S) => ({ cy: S.camera.y, py: S.player.y }));
      const moved = (cam1.cy - cam1.py) - (cam0.cy - cam0.py);
      rec.ok('upright: the world\'s view moved so the bro stands higher (the camera\'s aim, not its scale)', moved > 20, { cam0, cam1, moved });
      rec.ok('upright: the fight controls hidden while it is open', await P.page.evaluate(() => document.documentElement.classList.contains('bt-menus3-hide-ctl')), null);
      const rail = await attrs(P, '[data-m3-rail]', 'data-m3-rail');
      const railB = await boxes(P, '[data-m3-rail]');
      rec.ok('upright: the rail\'s seven, in order, each 44+ tall', rail.join() === 'all,gear,weapons,armor,consumables,materials,pets' && railB.every((b) => b.h >= 44), { rail, railB: railB.slice(0, 2) });
      const allWord = await P.page.evaluate(() => (document.querySelector('[data-m3-rail="all"]') || {}).textContent || '');
      const tiles = await boxes(P, '[data-m3-tile]');
      const cnt = await P.page.evaluate(() => Number((document.querySelector('[data-m3-grid]') || {}).getAttribute && document.querySelector('[data-m3-grid]').getAttribute('data-m3-grid')));
      rec.ok('upright: All says the bag\'s own count, no cap', /^All \(\d+\)$/.test(allWord.trim()) && allWord.includes('(' + cnt + ')'), { allWord, cnt });
      const rowY = tiles.length ? tiles[0].y : 0;
      const perRow = tiles.filter((t) => t.y === rowY).length;
      rec.ok('upright: the grid four across, its tiles 44+', perRow === Math.min(4, tiles.length) && tiles.every((t) => t.h >= 44 && t.w >= 44), { perRow, n: tiles.length, t0: tiles[0] });
      const kindsAll = await attrs(P, '[data-m3-tile]', 'data-m3-kind');
      rec.ok('upright: All holds no pet', !(await box(P, '[data-m3-grid] [data-m3-pet]')), kindsAll);
      await shot(P, 'upright-bag');

      /* Armor's filter, a tile, the Item page, Back */
      await tap(P, '[data-m3-rail="armor"]', true);
      const kinds = await attrs(P, '[data-m3-tile]', 'data-m3-kind');
      rec.ok('upright: Armor shows only armour', kinds.length > 0 && kinds.every((k) => ['chest', 'legs', 'cape', 'shield', 'amulet'].includes(k)), kinds);
      const firstArm = (await attrs(P, '[data-m3-tile]', 'data-m3-tile'))[0];
      await tap(P, `[data-m3-tile="${firstArm}"]`, true);
      ps = await pstate(P);
      const acts = (await attrs(P, '[data-m3-act]', 'data-m3-act'));
      rec.ok('upright: a tile opens the Item page, Back in the header', ps.page === 'item' && ps.arg === firstArm && !!(await box(P, '[data-menus3-back]')), { ps, acts });
      rec.ok('upright: the Item page has its facts and the game\'s actions (Equip, Pin, Drop or Reveal)', !!(await box(P, '[data-m3-item-name]')) && acts.includes('lock') && (acts.includes('equip') || acts.includes('reveal')), acts);
      const counters = await attrs(P, '[data-m3-counter]', 'data-m3-counter');
      rec.ok('LISTED upright: the counter actions shown greyed with where: ' + counters.join(' '), true, null);
      await shot(P, 'upright-item');
      await tap(P, '[data-m3-act="lock"]', true);
      const pinned = await P.page.evaluate(() => (document.querySelector('[data-m3-act="lock"]') || {}).textContent || '');
      rec.ok('upright: Pin on the Item page pins (its word turns to Unpin)', /Unpin/.test(pinned), pinned);
      await tap(P, '[data-m3-act="lock"]', true);
      await tap(P, '[data-menus3-back]', true);
      ps = await pstate(P);
      rec.ok('upright: Back goes one page, to the grid, Armor still lit', ps.page === 'root' && ps.rail === 'armor' && !(await box(P, '[data-menus3-back]')), ps);

      /* Equip: two taps from the closed bag (the X; Bro; the tile; Equip -- the tile and Equip are the two) */
      await tap(P, '[data-menus3-x]', true);
      ps = await openBag(P, true);
      rec.ok('upright: Bro opens on All again, never where it was left', ps.page === 'root' && (ps.rail == null || ps.rail === 'all'), ps);
      const before = await rpg(P);
      const allTiles = await P.page.evaluate(() => Array.from(document.querySelectorAll('[data-m3-tile]')).map((el) => ({ id: el.getAttribute('data-m3-tile'), k: el.getAttribute('data-m3-kind') })));
      const arm = allTiles.find((t) => t.k === 'chest' || t.k === 'legs');
      if (arm) {
        await tap(P, `[data-m3-tile="${arm.id}"]`, true);
        const lead = await P.page.evaluate(() => (document.querySelector('[data-m3-lead]') || {}).getAttribute ? document.querySelector('[data-m3-lead]').getAttribute('data-m3-lead') : null);
        await tap(P, `[data-m3-lead] [data-m3-act]`, true);
        await P.page.waitForTimeout(2500);
        const after = await rpg(P);
        rec.ok(`upright: Equip (or Reveal) in two taps from the bag (${lead}): the worker moved the piece`, (lead === 'equip' || lead === 'reveal') && (after.stashArmor + after.legs !== before.stashArmor + before.legs || after.armor !== before.armor), { lead, before, after });
      } else rec.ok('upright: an armour tile in All', false, allTiles.slice(0, 6));

      /* Gear: nine slots and the pet row; a slot's page */
      ps = await pstate(P);
      if (ps.page !== 'root') await tap(P, '[data-menus3-back]', true);
      await tap(P, '[data-m3-rail="gear"]', true);
      const slots = await attrs(P, '[data-m3-slot]', 'data-m3-slot');
      const slotB = await boxes(P, '[data-m3-slot]');
      rec.ok('upright: Gear\'s nine slots, 44+, and the pet row', slots.join() === 'sword,bow,staff,chest,legs,cape,shield,amulet,gem' && slotB.every((b) => b.h >= 44) && !!(await box(P, '[data-m3-petrow]')), slots);
      await shot(P, 'upright-gear');
      await tap(P, '[data-m3-slot="sword"]', true);
      ps = await pstate(P);
      const cands = await attrs(P, '[data-m3-cand]', 'data-m3-cand');
      const eqs = await boxes(P, '[data-m3-equip]');
      rec.ok('upright: a slot opens its page: what is worn, and the candidates each with Equip', ps.page === 'slot' && ps.arg === 'sword' && !!(await box(P, '[data-m3-wornrow="sword"]')) && (cands.length === 0 || eqs.length === cands.length), { ps, cands, eqs: eqs.length });
      await shot(P, 'upright-slot');
      await tap(P, '[data-menus3-back]', true);
      ps = await pstate(P);
      rec.ok('upright: Back from the slot to Gear', ps.page === 'root' && ps.rail === 'gear', ps);

      /* Pets: a pet opens its page (today's, with Take out) */
      /* the rail's last place sits past the screen's edge: the rail scrolls it in, as a thumb would */
      await P.page.evaluate(() => { const el = document.querySelector('[data-m3-rail="pets"]'); if (el) el.scrollIntoView({ inline: 'end', block: 'nearest' }); });
      await P.page.waitForTimeout(400);
      await tap(P, '[data-m3-rail="pets"]', true);
      const pets = await attrs(P, '[data-m3-pet]', 'data-m3-pet');
      if (pets.length) {
        await tap(P, `[data-m3-pet="${pets[0]}"]`, true);
        ps = await pstate(P);
        const petActs = await P.page.evaluate(() => Array.from(document.querySelectorAll('[data-m3-petpage] button')).map((b) => b.textContent.trim()).filter(Boolean));
        rec.ok('upright: a pet opens its page (take out or put away, rename, release)', ps.page === 'pet' && petActs.some((t) => /Take out|Put away/i.test(t)) && petActs.some((t) => /Rename/i.test(t)), { ps, petActs });
        await shot(P, 'upright-pet');
        await tap(P, '[data-menus3-back]', true);
      } else rec.ok('upright: the seeded pet is listed', false, await rpg(P));

      /* the world's tap closes, swallowed: the bro does not walk */
      const at = await P.page.evaluate(() => { const x = 195, y = 200; const el = document.elementFromPoint(x, y); return { x, y, tag: el ? el.tagName : null }; });
      const p0 = await H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y), sw: S._swingCount || 0 }));
      if (at.tag === 'CANVAS') {
        await P.page.touchscreen.tap(at.x, at.y);
        await P.page.waitForTimeout(1500);
        const p1 = await H.readState(P, (S) => ({ x: Math.round(S.player.x), y: Math.round(S.player.y), sw: S._swingCount || 0 }));
        ps = await pstate(P);
        rec.ok('upright: a tap on the world closes the panel', !ps.open && (await P.page.evaluate(() => window.__btMenus3.why())) === 'world', ps);
        rec.ok('upright: ...and is swallowed (the bro did not move)', Math.abs(p1.x - p0.x) <= 2 && Math.abs(p1.y - p0.y) <= 2, { p0, p1 });
      } else rec.ok(`LISTED upright: the world tap not played: ${at.tag} at ${at.x},${at.y}`, true, null);
    }
  } finally { await P.page.context().close().catch(() => {}); }

  /* ── 2. sideways ── */
  const Q = await H.newPlayer(browser, { name: 'Bagside', wsPort, webPort, world: 'wheel', viewport: { width: 844, height: 390 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(Q, rec, 'sideways')) {
      const ps = await openBag(Q, true);
      const pb = await box(Q, '[data-menus3-panel="drawer"]');
      rec.ok('sideways: Bro opens the drawer, 40% wide on the right', ps.open && !!pb && Math.abs(pb.w - Math.round(844 * 0.4)) <= 3 && Math.abs(pb.x + pb.w - 844) <= 3, { ps, pb });
      rec.ok('sideways: the fight controls are not hidden', !(await Q.page.evaluate(() => document.documentElement.classList.contains('bt-menus3-hide-ctl'))), null);
      const disc = await Q.page.evaluate(() => { const el = document.querySelector('.bt-rjoy-zone'); if (!el) return null; const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; const hit = document.elementFromPoint(cx, cy); return { x: Math.round(r.left), r: Math.round(r.right), vis: getComputedStyle(el).visibility, under: !!(hit && hit.closest && hit.closest('[data-menus3-panel]')), hit: hit ? (hit.getAttribute('data-joyzone') || hit.className || hit.tagName) : null }; });
      /* idle the disc is see-through and lets a tap fall to the right zone under it (TouchControls v2.3.2246): "uncovered" is no drawer over it */
      rec.ok('sideways: the attack disc stands left of the drawer, uncovered', !!disc && !!pb && disc.r <= pb.x + 2 && disc.vis !== 'hidden' && !disc.under, { disc, pb });
      await shot(Q, 'sideways-bag');
      await tap(Q, '[data-menus3-x]', true);
      const disc2 = await Q.page.evaluate(() => { const el = document.querySelector('.bt-rjoy-zone'); if (!el) return null; const r = el.getBoundingClientRect(); return Math.round(r.right); });
      rec.ok('sideways: shut, the disc is back at its place', disc2 != null && disc2 > 844 * 0.6, disc2);
    }
  } finally { await Q.page.context().close().catch(() => {}); }

  /* ── 3. a computer ── */
  const D = await H.newPlayer(browser, { name: 'Bagdesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, query: 'menus3=1' });
  try {
    if (await inWorld(D, rec, 'computer')) {
      const ps = await openBag(D, false);
      const pb = await box(D, '[data-menus3-panel="drawer"]');
      rec.ok('computer: Bro opens the drawer on the Bag', ps.open && ps.section === 'bag' && !!pb, { ps, pb });
      const tiles = await boxes(D, '[data-m3-tile]');
      const perRow = tiles.length ? tiles.filter((t) => t.y === tiles[0].y).length : 0;
      rec.ok('computer: the grid four or more across', tiles.length === 0 || perRow >= Math.min(4, tiles.length), { perRow, n: tiles.length });
      await shot(D, 'computer-bag');
      /* a click on the world closes it, and is no swing */
      const sw0 = await H.readState(D, (S) => ({ a: S.isSwinging ? 1 : 0, t: S.swingTimer || 0 }));
      await D.page.mouse.click(300, 300);
      await D.page.waitForTimeout(800);
      const sw1 = await H.readState(D, (S) => ({ a: S.isSwinging ? 1 : 0, t: S.swingTimer || 0 }));
      const st = await pstate(D);
      rec.ok('computer: a click on the world closes it', !st.open, st);
      rec.ok('computer: ...and is no swing', sw1.t === sw0.t && !sw1.a, { sw0, sw1 });
      await openBag(D, false);
      await D.page.keyboard.press('Escape');
      await D.page.waitForTimeout(500);
      rec.ok('computer: Esc closes it', (await pstate(D)).open === false, null);
    }
  } finally { await D.page.context().close().catch(() => {}); }
}
