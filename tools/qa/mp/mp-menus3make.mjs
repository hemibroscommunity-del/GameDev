/* ═══ v2.3.6872: THE COUNTER'S MAKE AT THE BLACKSMITH, PLAYED (card MN step 13) ═══
 *
 * The owner's Counter (docs/design/menus3/; the card's Decided 6): the
 * Blacksmith's window opens the new panel as the Counter, in Make; today's
 * tabs and recipes; a tap selects; the one quantity picker; a number sent as
 * today's request (one smelt request with its count; the armour forged one
 * after another), the worker settling each.
 *
 *   1. UPRIGHT (390 x 844, touch), a character with copper ore and bars on
 *      the worker's file (the admin grant): today's window setter (the
 *      door's and the keeper's, `_uiPanels.building('forge')`) opens the
 *      Counter, NOT today's window; its header "Blacksmith · Make" with the
 *      gold; the tabs on a rail; a copper smelt row selected, the picker's
 *      cap the ore (one a bar), plus / minus / Max; "Smelt 3" makes 3 bars
 *      (the worker's); the Armor tab, a Copper Torso x2 forged one after
 *      another (bars -10, two torsos in the bag); every tappable thing 44+;
 *   2. SIDEWAYS (844 x 390): the drawer 40% on the right, the Counter in it,
 *      every tappable thing 44+;
 *   3. A COMPUTER (1280 x 800, `wide: true`): the drawer; Esc closes it;
 *      then `?menus3=0`: the same setter opens TODAY's Blacksmith window.
 *
 * Measured from OUTSIDE the game (this test's evaluate).  Pictures
 * (deviceScaleFactor 1): tools/qa/out/menus3make-*.png. */
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as H from './harness.mjs';
export const lane = 'full';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'tools', 'qa', 'out');

const box = (P, sel) => P.page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 0 ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null; }, sel);
const pstate = (P) => P.page.evaluate(() => { const s = window.__btMenus3.panelState(); return { open: s.open, menu: s.menu, section: s.section, station: s.station ? s.station.id : null }; });
const small = (P) => P.page.evaluate(() => Array.from(document.querySelectorAll('[data-menus3-panel] button, [data-menus3-panel] a')).map((el) => { const r = el.getBoundingClientRect(); return { t: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((b) => b.w > 0 && (b.w < 44 || b.h < 44)));
const bag = (P) => H.readState(P, (S) => { const R = S.rpg || {}; const I = R.inventory || {}; return { ore: I.ore_copper_ore || 0, bar: I.bar_copper || 0, torsos: (R.armorStash || []).length, coins: R.coins || 0 }; });
const attr = (P, sel, a) => P.page.evaluate(([s, n]) => { const el = document.querySelector(s); return el ? el.getAttribute(n) : null; }, [sel, a]);

async function tap(P, sel, touch) {
  await P.page.evaluate((s) => { const el = document.querySelector(s); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' }); }, sel).catch(() => {});
  await P.page.waitForTimeout(250);
  const b = await box(P, sel);
  if (!b) return false;
  const x = b.x + b.w / 2, y = b.y + b.h / 2;
  if (touch) await P.page.touchscreen.tap(x, y); else await P.page.mouse.click(x, y);
  await P.page.waitForTimeout(500);
  return true;
}
async function shot(P, name) {
  try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: path.join(OUT, 'menus3make-' + name + '.png') }); } catch (e) { /* a picture only */ }
}
async function inWorld(P, rec, who) {
  await H.enterWorld(P);
  const w = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${who}: in the world (BroTown)`, !!w, w);
  if (!w) return false;
  await P.page.waitForFunction(() => !!(window.__btMenus3 && window.__btMenus3.on()), null, { timeout: 30000 }).catch(() => {});
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, [data-coach-card], [data-coach-ring] { visibility: hidden !important; }' }).catch(() => {});
  await P.page.waitForTimeout(1500);
  return true;
}
/* the quests handed in (no one stops us), the ore and bars on the worker's file */
async function seed(P, wsPort, ore, bars) {
  const me = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', me, {}).catch(() => null);
  await H.closeNpcDialogue(P).catch(() => {});
  if (ore) await H.grant(wsPort, me, 'item', { invKey: 'ore_copper_ore', count: ore });
  if (bars) await H.grant(wsPort, me, 'item', { invKey: 'bar_copper', count: bars });
  await H.waitFor(P, (S) => { const I = (S.rpg && S.rpg.inventory) || {}; return [I.ore_copper_ore || 0, I.bar_copper || 0]; }, (v) => v[0] >= ore && v[1] >= bars, { timeout: 15000, label: 'the seed' }).catch(() => null);
  return me;
}
async function openSmith(P) {
  await P.page.evaluate(() => { window._uiPanels.building('forge'); });
  await P.page.waitForSelector('[data-menus3-make="blacksmith"]', { timeout: 10000 }).catch(() => {});
  await P.page.waitForTimeout(600);
  return pstate(P);
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. upright ── */
  const P = await H.newPlayer(browser, { name: 'Makephone', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(P, rec, 'upright')) {
      await seed(P, wsPort, 6, 10);
      const one = await H.readState(P, (S) => !!(S._serverCaps && S._serverCaps.onetoone && S._serverCaps.smelting && S._serverCaps.armorforge));
      rec.ok('upright: the worker smelts one ore a bar and forges armour', one, one);
      let ps = await openSmith(P);
      rec.ok('upright: the Blacksmith\'s window setter opens the Counter, in Make', ps.open && ps.section === 'counter' && ps.station === 'forge' && ps.menu === null, ps);
      rec.ok('upright: ...and NOT today\'s window', !(await box(P, '[data-smithy="1"]')), null);
      const title = await P.page.evaluate(() => (document.querySelector('[data-menus3-title]') || {}).textContent || '');
      const gold = Number(await attr(P, '[data-menus3-gold]', 'data-menus3-gold'));
      const b0 = await bag(P);
      rec.ok(`upright: the header says "${title}" with the gold (${gold})`, /Blacksmith/.test(title) && /Make/.test(title) && gold === b0.coins, { title, gold, coins: b0.coins });
      const tabs = await P.page.evaluate(() => Array.from(document.querySelectorAll('[data-smithy-tab]')).map((e) => e.getAttribute('data-smithy-tab')).join());
      rec.ok(`upright: today's tabs on the rail (${tabs})`, /^smelt,forge,armor,upgrade/.test(tabs) && /salvage/.test(tabs), tabs);
      await tap(P, '[data-smithy-tab="smelt"]', true);
      rec.ok('upright: nothing is chosen until a recipe is tapped (no quick-tap)', (await attr(P, '[data-menus3-make-foot]', 'data-menus3-make-foot')) === '', null);
      await tap(P, '[data-menus3-recipe="smelt:bar_copper"]', true);
      const cap = Number(await attr(P, '[data-menus3-qty-n]', 'data-menus3-qty-cap'));
      rec.ok(`upright: the copper smelt chosen, the picker's cap the ore (${cap})`, cap === b0.ore && b0.ore === 6, { cap, b0 });
      await tap(P, '[data-menus3-qty="plus"]', true);
      await tap(P, '[data-menus3-qty="plus"]', true);
      let n = Number(await attr(P, '[data-menus3-qty-n]', 'data-menus3-qty-n'));
      await tap(P, '[data-menus3-qty="max"]', true);
      const nMax = Number(await attr(P, '[data-menus3-qty-n]', 'data-menus3-qty-n'));
      await tap(P, '[data-menus3-qty="minus"]', true);
      await tap(P, '[data-menus3-qty="minus"]', true);
      await tap(P, '[data-menus3-qty="minus"]', true);
      const n3 = Number(await attr(P, '[data-menus3-qty-n]', 'data-menus3-qty-n'));
      rec.ok('upright: plus twice 3, Max the cap, minus three times 3', n === 3 && nMax === 6 && n3 === 3, { n, nMax, n3 });
      const go = await P.page.evaluate(() => (document.querySelector('[data-menus3-make-go]') || {}).textContent || '');
      rec.ok(`upright: one commit, "${go}"`, /Smelt 3/.test(go), go);
      const sm = await small(P);
      rec.ok('upright: every tappable thing 44 x 44 or more', sm.length === 0, sm);
      await shot(P, 'upright-smelt');
      await tap(P, '[data-menus3-make-go]', true);
      const b1 = await H.waitFor(P, (S) => { const I = (S.rpg && S.rpg.inventory) || {}; return { ore: I.ore_copper_ore || 0, bar: I.bar_copper || 0 }; }, (v) => v.ore === b0.ore - 3 && v.bar === b0.bar + 3, { timeout: 15000, label: 'smelted 3' }).catch(() => null);
      rec.ok('upright: Smelt 3: the worker made 3 bars of 3 ore', !!b1, { b0, b1 });
      /* the Armor tab: two torsos, forged one after another */
      await tap(P, '[data-smithy-tab="armor"]', true);
      await tap(P, '[data-menus3-recipe="armor:copper_torso"]', true);
      const capA = Number(await attr(P, '[data-menus3-qty-n]', 'data-menus3-qty-cap'));
      await tap(P, '[data-menus3-qty="plus"]', true);
      const before = await bag(P);
      rec.ok(`upright: the Copper Torso's cap is the bars (${capA} of ${before.bar} at 5)`, capA === Math.floor(before.bar / 5), { capA, before });
      await shot(P, 'upright-armor');
      await tap(P, '[data-menus3-make-go]', true);
      const b2 = await H.waitFor(P, (S) => { const R = S.rpg || {}; return { bar: (R.inventory || {}).bar_copper || 0, torsos: (R.armorStash || []).length }; }, (v) => v.bar === before.bar - 10 && v.torsos === before.torsos + 2, { timeout: 25000, label: 'two torsos' }).catch(() => null);
      rec.ok('upright: Forge 2: two torsos, one after another (bars -10)', !!b2, { before, b2 });
      await P.page.waitForFunction(() => { const el = document.querySelector('[data-menus3-make-line]'); return !!el && el.getAttribute('data-menus3-make-line') !== 'working'; }, null, { timeout: 8000 }).catch(() => {});
      const line = await attr(P, '[data-menus3-make-line]', 'data-menus3-make-line');
      rec.ok('upright: the run said "Made 2 of 2."', line === 'done', line);
      await shot(P, 'upright-made');
      await tap(P, '[data-menus3-x]', true);
      rec.ok('upright: the X closes the Counter', (await pstate(P)).open === false, null);
    }
  } finally { await P.page.context().close().catch(() => {}); }

  /* ── 2. sideways ── */
  const S2 = await H.newPlayer(browser, { name: 'Makeside', wsPort, webPort, world: 'wheel', viewport: { width: 844, height: 390 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(S2, rec, 'sideways')) {
      await seed(S2, wsPort, 2, 0);
      const ps = await openSmith(S2);
      const pb = await box(S2, '[data-menus3-panel]');
      rec.ok('sideways: the drawer, 40% wide on the right, the Counter in it', ps.open && ps.section === 'counter' && !!pb && Math.abs(pb.w - Math.round(844 * 0.4)) <= 3 && Math.abs(pb.x + pb.w - 844) <= 3, { ps, pb });
      await tap(S2, '[data-smithy-tab="smelt"]', true);
      await tap(S2, '[data-menus3-recipe="smelt:bar_copper"]', true);
      const sm = await small(S2);
      rec.ok('sideways: every tappable thing 44 x 44 or more', sm.length === 0, sm);
      await shot(S2, 'sideways');
    }
  } finally { await S2.page.context().close().catch(() => {}); }

  /* ── 3. a computer ── */
  const D = await H.newPlayer(browser, { name: 'Makedesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, query: 'menus3=1' });
  try {
    if (await inWorld(D, rec, 'computer')) {
      const ps = await openSmith(D);
      rec.ok('computer: the drawer, the Counter in it', ps.open && ps.section === 'counter' && (await attr(D, '[data-menus3-panel]', 'data-menus3-panel')) === 'drawer', ps);
      await shot(D, 'computer');
      await D.page.keyboard.press('Escape');
      await D.page.waitForTimeout(500);
      rec.ok('computer: Esc closes it', (await pstate(D)).open === false, null);
      /* ?menus3=0: yesterday's game, today's window */
      const u = new URL(D.page.url()); u.searchParams.set('menus3', '0');
      await D.page.goto(u.toString(), { waitUntil: 'domcontentloaded' });
      await D.page.waitForFunction(() => !!(window._uiPanels && window.__broDashPanelBus), null, { timeout: 60000 }).catch(() => {});
      await H.enterWorld(D).catch(() => {});
      await D.page.waitForTimeout(2500);
      await D.page.evaluate(() => { window._uiPanels.building('forge'); });
      const old = await D.page.waitForSelector('[data-smithy="1"]', { timeout: 10000 }).then(() => true).catch(() => false);
      rec.ok('computer, ?menus3=0: the same setter opens today\'s Blacksmith window', old && !(await box(D, '[data-menus3-panel]')), old);
    }
  } finally { await D.page.context().close().catch(() => {}); }
}
