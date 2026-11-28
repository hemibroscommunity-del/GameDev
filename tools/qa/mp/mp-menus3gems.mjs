/* ═══ v2.3.6877: THE COUNTER'S MAKE AT THE GEM WORKS, PLAYED (card MN step 13c) ═══
 *
 * The last bench of the one Make (mp-menus3make the Blacksmith,
 * mp-menus3benches the Woodworker and the Cookhouse):
 *
 *   1. UPRIGHT (390 x 844, touch), a character with five Ember shards and six
 *      raw flame gems on the worker's file (the admin grant): the Gem Cutter's
 *      door (its window setter, `_uiPanels.building('gemcut')`) opens the
 *      Counter, NOT today's window, "Gem Works · Make", today's two tabs, Cut
 *      gems chosen; nothing chosen until a row is tapped; the Ember shards'
 *      cap the shards, "Crack 3" is today's ONE counted ask (the worker takes
 *      3 shards) and today's reveal plays under its row; the raw flame gems
 *      combined twice, one ask after another (6 raw into 2 gems); 44+;
 *   2. SIDEWAYS (844 x 390): the Enchanter's door opens the Counter on Set
 *      gems (its own tab); the dev kit's greatsword in hand: its flame gem is
 *      one at a time (no picker), set by the worker; 44+ in the drawer;
 *   3. A COMPUTER (1280 x 800, `wide: true`): the drawer; Esc closes it;
 *      `?menus3=0`: the same doors open TODAY's Gem Works window.
 *
 * Pictures (deviceScaleFactor 1): tools/qa/out/menus3gems-*.png. */
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
  try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: path.join(OUT, 'menus3gems-' + name + '.png') }); } catch (e) { /* a picture only */ }
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
async function seed(P, wsPort, items) {
  const me = await H.readState(P, (S) => S.myId);
  await H.devOp(wsPort, 'quests', me, {}).catch(() => null);
  await H.closeNpcDialogue(P).catch(() => {});
  for (const k of Object.keys(items)) await H.grant(wsPort, me, 'item', { invKey: k, count: items[k] });
  await H.waitFor(P, (S) => { const I = (S.rpg && S.rpg.inventory) || {}; return Object.keys(items).every((k) => (I[k] || 0) >= items[k]); }, (v) => v, { timeout: 15000, label: 'the seed' }).catch(() => null);
  return me;
}
async function openBench(P, id) {
  await P.page.evaluate((x) => { window._uiPanels.building(x); }, id);
  await P.page.waitForSelector('[data-menus3-make="gemworks"]', { timeout: 10000 }).catch(() => {});
  await P.page.waitForTimeout(600);
  return pstate(P);
}
const inv = (P, k) => P.page.evaluate((key) => { const S = window._gameState && window._gameState.current; return ((S && S.rpg && S.rpg.inventory) || {})[key] || 0; }, k);
const title = (P) => P.page.evaluate(() => (document.querySelector('[data-menus3-title]') || {}).textContent || '');
const qty = async (P) => ({ n: Number(await attr(P, '[data-menus3-qty-n]', 'data-menus3-qty-n')), cap: Number(await attr(P, '[data-menus3-qty-n]', 'data-menus3-qty-cap')) });
const goText = (P) => P.page.evaluate(() => (document.querySelector('[data-menus3-make-go]') || {}).textContent || '');
const onTab = (P) => P.page.evaluate(() => { const t = document.querySelector('[data-gem-tab][data-on="1"]'); return t ? t.getAttribute('data-gem-tab') : null; });
async function runLine(P) {
  await P.page.waitForFunction(() => { const el = document.querySelector('[data-menus3-make-line]'); return !!el && el.getAttribute('data-menus3-make-line') !== 'working'; }, null, { timeout: 15000 }).catch(() => {});
  return attr(P, '[data-menus3-make-line]', 'data-menus3-make-line');
}

export async function run({ browser, wsPort, webPort, rec }) {
  /* ── 1. upright: crack, combine ── */
  const P = await H.newPlayer(browser, { name: 'Gemphone', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(P, rec, 'upright')) {
      await seed(P, wsPort, { shard_ember: 5, gem_raw_flame: 6 });
      const caps = await H.readState(P, (S) => { const c = S._serverCaps || {}; return { crack: !!c.shardcrack, wg: !!c.weapongem, sg: !!c.shieldgem, am: !!c.amuletForge }; });
      rec.ok('upright: the worker settles every gem ask (crack, weapon, shield, amulet)', caps.crack && caps.wg && caps.sg && caps.am, caps);
      const ps = await openBench(P, 'gemcut');
      rec.ok('upright: the Gem Cutter\'s door opens the Counter, in Make', ps.open && ps.section === 'counter' && ps.station === 'gemcut' && ps.menu === null, ps);
      rec.ok('upright: ...and NOT today\'s window', !(await box(P, '[data-gem-works="gemcut"]')), null);
      const t1 = await title(P);
      rec.ok(`upright: the header says "${t1}"`, /Gem Works/.test(t1) && /Make/.test(t1), t1);
      const tabs = await P.page.evaluate(() => Array.from(document.querySelectorAll('[data-gem-tab]')).map((e) => e.getAttribute('data-gem-tab')).join());
      rec.ok(`upright: today's two tabs (${tabs}), Cut gems first`, tabs === 'gemcut,enchant' && (await onTab(P)) === 'gemcut', tabs);
      rec.ok('upright: nothing is chosen until a row is tapped (no quick-tap)', (await attr(P, '[data-menus3-make-foot]', 'data-menus3-make-foot')) === '', null);
      /* the crack: today's one counted ask */
      await tap(P, '[data-menus3-recipe="gemcut:crack-ember"]', true);
      const sh0 = await inv(P, 'shard_ember');
      let q = await qty(P);
      rec.ok(`upright: the Ember shards chosen, the picker's cap the shards (${q.cap} of ${sh0})`, q.cap === sh0 && sh0 >= 5, { q, sh0 });
      await tap(P, '[data-menus3-qty="plus"]', true);
      await tap(P, '[data-menus3-qty="plus"]', true);
      q = await qty(P);
      const g1 = await goText(P);
      rec.ok(`upright: plus twice 3, one commit "${g1}"`, q.n === 3 && /Crack 3/.test(g1), { q, g1 });
      let sm = await small(P);
      rec.ok('upright: every tappable thing 44 x 44 or more', sm.length === 0, sm);
      await tap(P, '[data-menus3-make-go]', true);
      const cracked = await H.waitFor(P, (S) => ((S.rpg && S.rpg.inventory) || {}).shard_ember || 0, (v) => v === sh0 - 3, { timeout: 15000, label: 'three cracked' }).catch(() => null);
      rec.ok('upright: Crack 3: the worker took 3 shards (today\'s one counted ask)', cracked !== null, { sh0, cracked });
      const tiles = await P.page.waitForSelector('[data-crack-tiles] [data-crack-tile]', { timeout: 6000 }).then(() => P.page.evaluate(() => document.querySelectorAll('[data-crack-tiles] [data-crack-tile]').length)).catch(() => 0);
      rec.ok(`upright: today's reveal plays, a tile a shard (${tiles})`, tiles === 3, tiles);
      await shot(P, 'upright-crack');
      /* the combine: one ask after another */
      const raw0 = await inv(P, 'gem_raw_flame');
      const gem0 = await inv(P, 'gem_flame');
      await tap(P, '[data-menus3-recipe="gemcut:combine-flame"]', true);
      q = await qty(P);
      rec.ok(`upright: the raw flame gems chosen, the cap a gem a three (${q.cap} of ${raw0} raw)`, q.cap === Math.floor(raw0 / 3) && q.cap >= 2, { q, raw0 });
      await tap(P, '[data-menus3-qty="max"]', true);
      q = await qty(P);
      const want = q.n;
      const g2 = await goText(P);
      rec.ok(`upright: Max, "${g2}"`, new RegExp('Combine ' + want).test(g2), g2);
      await tap(P, '[data-menus3-make-go]', true);
      const comb = await H.waitFor(P, (S) => { const I = (S.rpg && S.rpg.inventory) || {}; return { raw: I.gem_raw_flame || 0, gem: I.gem_flame || 0 }; }, (v) => v.raw === raw0 - 3 * want && v.gem === gem0 + want, { timeout: 30000, label: 'combined' }).catch(() => null);
      rec.ok(`upright: Combine ${want}: ${3 * want} raw into ${want} gems, each the worker's`, !!comb, { raw0, gem0, comb });
      rec.ok('upright: the run said it was all made', (await runLine(P)) === 'done', null);
      sm = await small(P);
      rec.ok('upright: every tappable thing 44 x 44 or more (after the runs)', sm.length === 0, sm);
      await shot(P, 'upright-combined');
      await tap(P, '[data-menus3-x]', true);
      rec.ok('upright: the X closes the Counter', (await pstate(P)).open === false, null);
    }
  } finally { await P.page.context().close().catch(() => {}); }

  /* ── 2. sideways: Set gems, its own door, one at a time ── */
  const S2 = await H.newPlayer(browser, { name: 'Gemside', wsPort, webPort, world: 'wheel', viewport: { width: 844, height: 390 }, touch: true, query: 'menus3=1' });
  try {
    if (await inWorld(S2, rec, 'sideways')) {
      const me = await seed(S2, wsPort, { gem_flame: 1 });
      await H.devOp(wsPort, 'kit', me, { what: 'weapons' });
      await H.waitFor(S2, (S) => !!((S.rpg && S.rpg.weapon && S.rpg.weapon.type === 'greatsword') || ((S.rpg && S.rpg.weaponStash) || []).some((w) => w && w.type === 'greatsword')), (v) => v, { timeout: 15000, label: 'the kit' }).catch(() => null);
      await H.equipWeapon(S2, 'greatsword', 'weapon', 'melee');
      const bare = await H.waitFor(S2, (S) => { const w = S.rpg && S.rpg.weapon; return w ? { t: w.type, e1: w.element1 || null } : null; }, (v) => !!v && v.t === 'greatsword' && !v.e1, { timeout: 15000, label: 'greatsword bare' }).catch(() => null);
      rec.ok('sideways: a bare greatsword in hand', !!bare, bare);
      const ps = await openBench(S2, 'enchant');
      const pb = await box(S2, '[data-menus3-panel]');
      rec.ok('sideways: the Enchanter\'s door opens the Counter in the drawer, on Set gems', ps.open && ps.station === 'enchant' && (await onTab(S2)) === 'enchant'
        && !!pb && Math.abs(pb.w - Math.round(844 * 0.4)) <= 3 && Math.abs(pb.x + pb.w - 844) <= 3, { ps, pb });
      await tap(S2, '[data-menus3-recipe="enchant:set-weapon-flame"]', true);
      const one = await P2Words(S2);
      rec.ok(`sideways: the flame gem for the greatsword: one at a time, no picker ("${one.go}")`, !one.picker && /One at a time/.test(one.order) && /Set gem/.test(one.go), one);
      const sm = await small(S2);
      rec.ok('sideways: every tappable thing 44 x 44 or more', sm.length === 0, sm);
      await shot(S2, 'sideways-set');
      await tap(S2, '[data-menus3-make-go]', true);
      const set = await H.waitFor(S2, (S) => { const w = S.rpg && S.rpg.weapon; return w ? w.element1 || null : null; }, (v) => v === 'flame', { timeout: 15000, label: 'the gem set' }).catch(() => null);
      rec.ok('sideways: the worker set the flame gem in the greatsword', set === 'flame', set);
      const out = await S2.page.waitForSelector('[data-menus3-recipe="enchant:out-weapon"]', { timeout: 6000 }).then(() => true).catch(() => false);
      rec.ok('sideways: Take out is offered for it, as today', out, out);
      await shot(S2, 'sideways-set-done');
    }
  } finally { await S2.page.context().close().catch(() => {}); }

  /* ── 3. a computer ── */
  const D = await H.newPlayer(browser, { name: 'Gemdesk', wsPort, webPort, world: 'wheel', viewport: { width: 1280, height: 800 }, wide: true, query: 'menus3=1' });
  try {
    if (await inWorld(D, rec, 'computer')) {
      const ps = await openBench(D, 'gemcut');
      rec.ok('computer: the drawer, the Gem Works in it', ps.open && ps.section === 'counter' && (await attr(D, '[data-menus3-panel]', 'data-menus3-panel')) === 'drawer', ps);
      await shot(D, 'computer');
      await D.page.keyboard.press('Escape');
      await D.page.waitForTimeout(500);
      rec.ok('computer: Esc closes it', (await pstate(D)).open === false, null);
      const u = new URL(D.page.url()); u.searchParams.set('menus3', '0');
      await D.page.goto(u.toString(), { waitUntil: 'domcontentloaded' });
      await D.page.waitForFunction(() => !!(window._uiPanels && window.__broDashPanelBus), null, { timeout: 60000 }).catch(() => {});
      await H.enterWorld(D).catch(() => {});
      await D.page.waitForTimeout(2500);
      await D.page.evaluate(() => { window._uiPanels.building('gemcut'); });
      const oldCut = await D.page.waitForSelector('[data-gem-works="gemcut"]', { timeout: 10000 }).then(() => true).catch(() => false);
      await D.page.evaluate(() => { window._uiPanels.building('enchant'); });
      const oldSet = await D.page.waitForSelector('[data-gem-works="enchant"]', { timeout: 10000 }).then(() => true).catch(() => false);
      rec.ok('computer, ?menus3=0: the same doors open today\'s Gem Works window, each on its tab', oldCut && oldSet && !(await box(D, '[data-menus3-panel]')), { oldCut, oldSet });
    }
  } finally { await D.page.context().close().catch(() => {}); }
}

/* the foot's words: the order line, the commit, and whether a picker is there */
function P2Words(P) {
  return P.page.evaluate(() => ({
    order: (document.querySelector('.m3-make-order') || {}).textContent || '',
    go: (document.querySelector('[data-menus3-make-go]') || {}).textContent || '',
    picker: !!document.querySelector('[data-menus3-qty-n]'),
  }));
}
