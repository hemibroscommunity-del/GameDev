/* ═══ v2.3.6873: THE COUNTER'S MAKE AT THE WOODWORKER AND THE COOKHOUSE, PLAYED (card MN step 13b) ═══
 *
 * Step 13 built the Blacksmith (mp-menus3make); this plays the two benches
 * built after it, the same Make:
 *
 *   1. UPRIGHT (390 x 844, touch), a character with pine logs and firebloom
 *      on the worker's file (the admin grant): the Woodworker's window setter
 *      (its door's and its keeper's, `_uiPanels.building('woodwork')`) opens
 *      the Counter, NOT today's window, "Woodworker · Make"; today's tabs;
 *      Traps: a pine log selected, the cap the logs, "Make 3" is today's ONE
 *      counted request (3 traps, 3 logs); the Cookhouse the same way,
 *      "Cookhouse · Make", today's campfire line, Herb Bread with Max and
 *      minus, cooked one after another, each the worker's; 44+ throughout;
 *   2. SIDEWAYS (844 x 390): the drawer, 44+; the Gem Works opens the
 *      Counter too (v2.3.6877: built, mp-menus3gems);
 *   3. A COMPUTER (1280 x 800, `wide: true`): the drawer; Esc closes it;
 *      `?menus3=0`: the same setter opens TODAY's two windows.
 *
 * Pictures (deviceScaleFactor 1): tools/qa/out/menus3benches-*.png. */
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
  try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: path.join(OUT, 'menus3benches-' + name + '.png') }); } catch (e) { /* a picture only */ }
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
/* the quests handed in (no one stops us), the things on the worker's file */
async function seed(P, wsPort, items) {
  const me = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', me, {}).catch(() => null);
  await H.closeNpcDialogue(P).catch(() => {});
  for (const k of Object.keys(items)) await H.grant(wsPort, me, 'item', { invKey: k, count: items[k] });
  await H.waitFor(P, (S) => { const I = (S.rpg && S.rpg.inventory) || {}; return Object.keys(items).every((k) => (I[k] || 0) >= items[k]); }, (v) => v, { timeout: 15000, label: 'the seed' }).catch(() => null);
  return me;
}
async function openBench(P, id, bench) {
  await P.page.evaluate((x) => { window._uiPanels.building(x); }, id);
  await P.page.waitForSelector('[data-menus3-make="' + bench + '"]', { timeout: 10000 }).catch(() => {});
  await P.page.waitForTimeout(600);
  return pstate(P);
}
const inv = (P, k) => P.page.evaluate((key) => { const S = window._gameState && window._gameState.current; return ((S && S.rpg && S.rpg.inventory) || {})[key] || 0; }, k);
const title = (P) => P.page.evaluate(() => (document.querySelector('[data-menus3-title]') || {}).textContent || '');
const qty = async (P) => ({ n: Number(await attr(P, '[data-menus3-qty-n]', 'data-menus3-qty-n')), cap: Number(await attr(P, '[data-menus3-qty-n]', 'data-menus3-qty-cap')) });
async function runLine(P) {
  await P.page.waitForFunction(() => { const el = document.querySelector('[data-menus3-make-line]'); return !!el && el.getAttribute('data-menus3-make-line') !== 'working'; }, null, { timeout: 12000 }).catch(() => {});
  return attr(P, '[data-menus3-make-line]', 'data-menus3-make-line');
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. upright: the Woodworker's traps, the Cookhouse's bread ── */
  const P = await H.newPlayer(browser, { name: 'Benchphone', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(P, rec, 'upright')) {
      await seed(P, wsPort, { wood_pine_log: 5, herb_firebloom: 4 });
      const caps = await H.readState(P, (S) => { const c = S._serverCaps || {}; return { trap: !!c.trapcraft, meals: !!c.meals }; });
      rec.ok('upright: the worker makes traps and cooks meals into the bag', caps.trap && caps.meals, caps);
      /* the Woodworker */
      let ps = await openBench(P, 'woodwork', 'woodworker');
      rec.ok('upright: the Woodworker\'s window setter opens the Counter, in Make', ps.open && ps.section === 'counter' && ps.station === 'woodwork' && ps.menu === null, ps);
      rec.ok('upright: ...and NOT today\'s window', !(await box(P, '[data-woodwork="1"]')), null);
      const t1 = await title(P);
      rec.ok(`upright: the header says "${t1}"`, /Woodworker/.test(t1) && /Make/.test(t1), t1);
      const tabs = await P.page.evaluate(() => Array.from(document.querySelectorAll('[data-ww-type]')).map((e) => e.getAttribute('data-ww-type')).join());
      rec.ok(`upright: today's tabs on the rail (${tabs})`, /^bow,staff/.test(tabs) && /traps/.test(tabs), tabs);
      await tap(P, '[data-ww-type="traps"]', true);
      rec.ok('upright: nothing is chosen until a recipe is tapped (no quick-tap)', (await attr(P, '[data-menus3-make-foot]', 'data-menus3-make-foot')) === '', null);
      await tap(P, '[data-menus3-recipe="traps:wood_pine_log"]', true);
      const logs0 = await inv(P, 'wood_pine_log');
      const traps0 = await inv(P, 'trap_box');
      let q = await qty(P);
      rec.ok(`upright: the pine log chosen, the picker's cap the logs (${q.cap} of ${logs0})`, q.cap === logs0 && logs0 >= 5, { q, logs0 });
      await tap(P, '[data-menus3-qty="plus"]', true);
      await tap(P, '[data-menus3-qty="plus"]', true);
      q = await qty(P);
      const go = await P.page.evaluate(() => (document.querySelector('[data-menus3-make-go]') || {}).textContent || '');
      rec.ok(`upright: plus twice 3, one commit "${go}"`, q.n === 3 && /Make 3/.test(go), { q, go });
      let sm = await small(P);
      rec.ok('upright: every tappable thing 44 x 44 or more', sm.length === 0, sm);
      await shot(P, 'upright-traps');
      await tap(P, '[data-menus3-make-go]', true);
      const made = await H.waitFor(P, (S) => { const I = (S.rpg && S.rpg.inventory) || {}; return { logs: I.wood_pine_log || 0, traps: I.trap_box || 0 }; }, (v) => v.logs === logs0 - 3 && v.traps === traps0 + 3, { timeout: 15000, label: 'three traps' }).catch(() => null);
      rec.ok('upright: Make 3: the worker made 3 traps of 3 logs (today\'s one counted request)', !!made, { logs0, traps0, made });
      rec.ok('upright: the run said "Made 3 of 3."', (await runLine(P)) === 'done', null);
      await tap(P, '[data-menus3-x]', true);
      rec.ok('upright: the X closes the Counter', (await pstate(P)).open === false, null);
      /* the Cookhouse */
      ps = await openBench(P, 'cook', 'cookhouse');
      rec.ok('upright: the Cookhouse\'s window setter opens the Counter, in Make', ps.open && ps.section === 'counter' && ps.station === 'cook', ps);
      const t2 = await title(P);
      rec.ok(`upright: the header says "${t2}", today's campfire line kept`, /Cookhouse/.test(t2) && /Make/.test(t2) && !!(await box(P, '[data-cook-fish-note]')), t2);
      await tap(P, '[data-menus3-recipe="recipes:r0"]', true);
      const herbs0 = await inv(P, 'herb_firebloom');
      const bread0 = await inv(P, 'meal_herb_bread');
      q = await qty(P);
      rec.ok(`upright: Herb Bread chosen, the picker's cap the herbs (${q.cap} of ${herbs0})`, q.cap === herbs0 && herbs0 >= 4, { q, herbs0 });
      await tap(P, '[data-menus3-qty="max"]', true);
      await tap(P, '[data-menus3-qty="minus"]', true);
      q = await qty(P);
      const goC = await P.page.evaluate(() => (document.querySelector('[data-menus3-make-go]') || {}).textContent || '');
      rec.ok(`upright: Max then minus, "${goC}"`, q.n === herbs0 - 1 && new RegExp('Cook ' + (herbs0 - 1)).test(goC), { q, goC });
      sm = await small(P);
      rec.ok('upright: every tappable thing 44 x 44 or more (the Cookhouse)', sm.length === 0, sm);
      await shot(P, 'upright-cook');
      const want = herbs0 - 1;
      await tap(P, '[data-menus3-make-go]', true);
      const cooked = await H.waitFor(P, (S) => { const I = (S.rpg && S.rpg.inventory) || {}; return { herbs: I.herb_firebloom || 0, bread: I.meal_herb_bread || 0 }; }, (v) => v.herbs === herbs0 - want && v.bread === bread0 + want, { timeout: 30000, label: 'the bread' }).catch(() => null);
      rec.ok(`upright: Cook ${want}: ${want} breads, one cook after another, each the worker's`, !!cooked, { herbs0, bread0, cooked });
      rec.ok('upright: the run said it was all made', (await runLine(P)) === 'done', null);
      await shot(P, 'upright-cooked');
    }
  } finally { await P.page.context().close().catch(() => {}); }

  /* ── 2. sideways: the Woodworker in the drawer; the Gem Works' Counter too (v2.3.6877) ── */
  const S2 = await H.newPlayer(browser, { name: 'Benchside', wsPort, webPort, world: 'wheel', viewport: { width: 844, height: 390 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(S2, rec, 'sideways')) {
      await seed(S2, wsPort, { wood_pine_log: 2 });
      const ps = await openBench(S2, 'woodwork', 'woodworker');
      const pb = await box(S2, '[data-menus3-panel]');
      rec.ok('sideways: the drawer, 40% wide on the right, the Counter in it', ps.open && ps.section === 'counter' && !!pb && Math.abs(pb.w - Math.round(844 * 0.4)) <= 3 && Math.abs(pb.x + pb.w - 844) <= 3, { ps, pb });
      await tap(S2, '[data-ww-type="traps"]', true);
      await tap(S2, '[data-menus3-recipe="traps:wood_pine_log"]', true);
      const sm = await small(S2);
      rec.ok('sideways: every tappable thing 44 x 44 or more', sm.length === 0, sm);
      await shot(S2, 'sideways');
      await tap(S2, '[data-menus3-x]', true);
      /* v2.3.6877 (card MN step 13c): the Gem Works is built now (mp-menus3gems plays it) */
      await S2.page.evaluate(() => { window._uiPanels.building('gemcut'); });
      const gw = await S2.page.waitForSelector('[data-menus3-make="gemworks"]', { timeout: 10000 }).then(() => true).catch(() => false);
      rec.ok('sideways: the Gem Works opens the Counter too (v2.3.6877)', gw && (await pstate(S2)).station === 'gemcut', gw);
      await tap(S2, '[data-menus3-x]', true);
    }
  } finally { await S2.page.context().close().catch(() => {}); }

  /* ── 3. a computer ── */
  const D = await H.newPlayer(browser, { name: 'Benchdesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, query: 'menus3=1' });
  try {
    if (await inWorld(D, rec, 'computer')) {
      const ps = await openBench(D, 'cook', 'cookhouse');
      rec.ok('computer: the drawer, the Cookhouse in it', ps.open && ps.section === 'counter' && (await attr(D, '[data-menus3-panel]', 'data-menus3-panel')) === 'drawer', ps);
      await shot(D, 'computer');
      await D.page.keyboard.press('Escape');
      await D.page.waitForTimeout(500);
      rec.ok('computer: Esc closes it', (await pstate(D)).open === false, null);
      /* ?menus3=0: yesterday's game, today's windows */
      const u = new URL(D.page.url()); u.searchParams.set('menus3', '0');
      await D.page.goto(u.toString(), { waitUntil: 'domcontentloaded' });
      await D.page.waitForFunction(() => !!(window._uiPanels && window.__broDashPanelBus), null, { timeout: 60000 }).catch(() => {});
      await H.enterWorld(D).catch(() => {});
      await D.page.waitForTimeout(2500);
      await D.page.evaluate(() => { window._uiPanels.building('woodwork'); });
      const oldW = await D.page.waitForSelector('[data-woodwork="1"]', { timeout: 10000 }).then(() => true).catch(() => false);
      await D.page.evaluate(() => { window._uiPanels.building('cook'); });
      const oldC = await D.page.waitForSelector('[data-cook-fish-note]', { timeout: 10000 }).then(() => true).catch(() => false);
      rec.ok('computer, ?menus3=0: the same setter opens today\'s Woodworker and Cookhouse windows', oldW && oldC && !(await box(D, '[data-menus3-panel]')), { oldW, oldC });
    }
  } finally { await D.page.context().close().catch(() => {}); }
}
