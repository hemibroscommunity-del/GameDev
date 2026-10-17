/* ═══ v2.3.3281: THE OWNER'S BAG ICONS, IN THE GAME ═══
 *
 * The owner, 2026-10-17: "Here are the art assets from the 5 other prompts" --
 * five sheets cut by tools/ui/cut-bag-icons.py into 53 bag icons.  On a real
 * page in the Wheel's BroTown, with a bag the worker filled (/api/admin/grant;
 * the default room, which is where the harness's grant and dev levers go):
 *   1. the bag: every one of the 53 (sixteen seeds, sixteen crops, compost, the
 *      five dishes, the box trap, five hardened woods, nine essences) draws its
 *      picture -- its new file, decoded -- where the seeds wore 🌱, the crops
 *      and dishes their glyphs, the trap the Trapping skill's icon;
 *   2. the Feed & Seed window's Seeds tab draws what it sells as the bag does,
 *      the seed packets and the compost sack, decoded;
 *   3. the Cookhouse: each recipe row leads with what it makes (the five
 *      dishes, the tonics' bottles), decoded;
 *   4. the Woodworker's Traps tab shows the owner's box trap;
 *   5. the quick-eat button: hurt, with a Garden Stew in the bag, it shows the
 *      stew -- a picture the loading screen fetched, so nothing is fetched as
 *      it appears;
 *   6. no page errors.
 * Pictures in tools/qa/mp/out/bagicons-*.png.
 *
 *   node tools/qa/mp/run.mjs bagicons
 */
import { join } from 'node:path';
import * as H from './harness.mjs';
import { FARM, FARM_CROP_ORDER, farmIconFor } from '../../../src/data/farmCrops.js';
import { DISHES } from '../../../src/data/dishes.js';
import { SALVAGE, essenceKey, essenceIcon } from '../../../src/data/salvage.js';
import { HARDENED_WOOD_RECIPES, hardenedWoodIcon } from '../../../src/data/hardenedWood.js';

const VIEW = { width: 900, height: 700 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `bagicons-${name}.png`) }).catch(() => {});
  /* the loading screen fetches far more than the 250 resource timings a page
     keeps by default -- room for all, so the quick-eat stew's warm-up is seen */
  const A = await H.newPlayer(browser, { name: 'Baggy', wsPort, webPort, world: 'wheel', viewport: VIEW,
    init: 'try{performance.setResourceTimingBufferSize(20000)}catch(e){}' });
  const errors = [];
  A.page.on('pageerror', (e) => errors.push(String(e && e.message || e)));
  await H.enterWorld(A);
  let inWheel = false;
  for (let i = 0; i < 120 && !inWheel; i++) {
    inWheel = (await H.readState(A, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel';
    if (!inWheel) await A.page.waitForTimeout(500);
  }
  let stopAlive = false;
  (async () => { while (!stopAlive) { await A.page.keyboard.press('Control').catch(() => {}); for (let i = 0; i < 40 && !stopAlive; i++) await A.page.waitForTimeout(500).catch(() => {}); } })();
  try {
    await A.page.waitForTimeout(2000);
    const me = await H.readState(A, (S) => S.myId);

    /* ── the bag, filled by the worker ── */
    const want = new Map();   /* key -> the file its picture must come from */
    for (const id of FARM_CROP_ORDER) {
      const c = FARM.CROPS[id];
      want.set(c.seed, farmIconFor(c.seed));
      want.set(c.item, farmIconFor(c.item));
    }
    want.set(FARM.COMPOST, farmIconFor(FARM.COMPOST));
    for (const k of Object.keys(DISHES)) want.set(k, DISHES[k].icon);
    want.set('trap_box', '/icons/items/trap-box.webp?v=2.3.3281');
    for (const k of Object.keys(HARDENED_WOOD_RECIPES)) want.set(k, hardenedWoodIcon(k));
    for (const g of SALVAGE.ESSENCE_GRADES) for (const m of Object.keys(SALVAGE.METALS)) want.set(essenceKey(g, m), essenceIcon(essenceKey(g, m)));
    const tGrant = await A.page.evaluate(() => performance.now());
    for (const k of want.keys()) await H.grant(wsPort, me, 'item', { invKey: k, count: 2 });
    let have = [];
    for (let i = 0; i < 60; i++) {
      have = await H.readState(A, (S) => Object.keys((S.rpg && S.rpg.inventory) || {}));
      if ([...want.keys()].every((k) => have.includes(k))) break;
      await A.page.waitForTimeout(250);
    }
    const missing = [...want.keys()].filter((k) => !have.includes(k));
    rec.ok(`the worker filled the bag with all ${want.size}`, want.size === 53 && missing.length === 0, missing);

    /* ── 1. the bag ── */
    await A.page.evaluate(() => { try { window.__broDashPanelBus.open('bag'); } catch (e) {} });
    await A.page.waitForTimeout(1200);
    const tiles = async () => A.page.evaluate(async (keys) => {
      const out = {};
      for (const k of keys) {
        const el = document.querySelector(`[data-inv-key="${k}"]`);
        if (!el) { out[k] = { tile: false }; continue; }
        el.scrollIntoView({ block: 'nearest' });
        const img = el.querySelector('img');
        if (img && !(img.complete && img.naturalWidth > 0)) { try { await img.decode(); } catch (e) { /* counted below */ } }
        out[k] = { tile: true, src: img ? img.getAttribute('src') : null, ok: !!(img && img.complete && img.naturalWidth > 0), glyph: img ? null : el.innerText.slice(0, 4) };
      }
      return out;
    }, [...want.keys()]);
    const t1 = await tiles();
    /* the file is the picture's identity; its ?v= is only a cache-buster (the
       essences keep the bag's old ITEMS_V: /icons/ is revalidated, never
       immutable -- public/_headers -- so a file replaced in place is fetched) */
    const file = (u) => String(u || '').split('?')[0];
    const wrong = [...want.keys()].filter((k) => !(t1[k] && t1[k].tile && t1[k].ok && file(t1[k].src) === file(want.get(k))));
    rec.ok(`1. the bag draws all ${want.size} as the owner's pictures, each its own file, decoded (no 🌱, no glyph, no skill icon)`,
      wrong.length === 0, wrong.slice(0, 8).map((k) => ({ k, ...t1[k], want: want.get(k) })));
    await A.page.evaluate(() => { const el = document.querySelector('[data-inv-key="seed_carrot"]'); if (el) el.scrollIntoView({ block: 'start' }); });
    await A.page.waitForTimeout(300);
    await shot(A, 'bag');
    await A.page.evaluate(() => { const el = document.querySelector('[data-inv-key="essence_rare_copper"]'); if (el) el.scrollIntoView({ block: 'start' }); });
    await A.page.waitForTimeout(300);
    await shot(A, 'bag2');
    await A.page.evaluate(() => { try { window.__broDashPanelBus.clear(); } catch (e) {} });
    await A.page.waitForTimeout(400);

    /* ── 2. the Feed & Seed window ── */
    await A.page.evaluate(() => window.__btBuildingWindow.open('farm'));
    const seeds = await H.waitFor(A, () => {
      const rows = Array.from(document.querySelectorAll('[data-farm-row]'));
      return rows.map((r) => { const i = r.querySelector('img[data-farm-icon]'); return { row: r.getAttribute('data-farm-row'), src: i ? i.getAttribute('src') : null, ok: !!(i && i.complete && i.naturalWidth > 0) }; });
    }, (v) => v.length >= 2 && v.every((r) => r.ok), { timeout: 8000, label: 'the Seeds tab' }).catch(() => null);
    rec.ok(`2. the Feed & Seed window sells seeds as their packets and compost as its sack (${seeds ? seeds.map((r) => r.row).join(', ') : 'no rows'})`,
      !!seeds && seeds.every((r) => r.ok && r.src === farmIconFor(r.row)) && seeds.some((r) => r.row === 'compost') && seeds.some((r) => /^seed_/.test(r.row)), seeds);
    await A.page.waitForTimeout(400);
    await shot(A, 'feedseed');
    await A.page.evaluate(() => window.__btBuildingWindow.open(null));
    await A.page.waitForTimeout(500);

    /* ── 3. the Cookhouse ── */
    await A.page.evaluate(() => window.__btBuildingWindow.open('cook'));
    const cook = await H.waitFor(A, () => Array.from(document.querySelectorAll('img[data-cook-pic]'))
      .map((i) => ({ makes: i.getAttribute('data-cook-pic'), src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0 })),
    (v) => v.length >= 5 && v.every((r) => r.ok), { timeout: 8000, label: 'the Cookhouse rows' }).catch(() => null);
    const dishRows = cook ? cook.filter((r) => Object.prototype.hasOwnProperty.call(DISHES, r.makes)) : [];
    rec.ok(`3. the Cookhouse's rows lead with what they make, decoded: the five dishes as the owner drew them (${dishRows.map((r) => r.makes).join(', ')}), the tonics their bottles`,
      dishRows.length === 5 && dishRows.every((r) => r.src === DISHES[r.makes].icon) && cook.some((r) => /potion-/.test(r.src)), cook);
    await A.page.waitForTimeout(300);
    await shot(A, 'cook');
    await A.page.evaluate(() => window.__btBuildingWindow.open(null));
    await A.page.waitForTimeout(500);

    /* ── 4. the Woodworker's Traps tab ── */
    await A.page.evaluate(() => { window._gameState.current._wwType = 'traps'; window.__btBuildingWindow.open('woodwork'); });
    const trap = await H.waitFor(A, () => { const i = document.querySelector('[data-traps-tab] img'); return i ? { src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0 } : null; },
      (v) => !!v && v.ok, { timeout: 8000, label: 'the Traps tab' }).catch(() => null);
    rec.ok('4. the Woodworker\'s Traps tab shows the owner\'s box trap', !!trap && /\/icons\/items\/trap-box\.webp/.test(trap.src), trap);
    await shot(A, 'traps');
    await A.page.evaluate(() => window.__btBuildingWindow.open(null));
    await A.page.waitForTimeout(500);

    /* ── 5. the quick-eat button ── */
    const before = await A.page.evaluate((t) => performance.getEntriesByType('resource')
      .filter((e) => /garden-stew\.webp/.test(e.name)).map((e) => ({ at: Math.round(e.startTime), early: e.startTime < t })), tGrant);
    const hp = await H.readState(A, (S) => (S.rpg && S.rpg.maxHp) || 100);
    await H.devOp(wsPort, 'vitals', me, { heal: false, hp: Math.max(1, Math.floor(hp / 2)) });
    const qe = await H.waitFor(A, () => {
      const el = document.querySelector('.bt-quickeat-btn');
      const img = el && el.querySelector('img[data-icon="food"]');
      return el ? { key: el.getAttribute('data-quickeat'), src: img ? img.getAttribute('src') : null, ok: !!(img && img.complete && img.naturalWidth > 0) } : null;
    }, (v) => !!v && v.ok && v.key === 'meal_garden_stew', { timeout: 10000, label: 'the quick-eat stew' }).catch(() => null);
    /* the stew is the only heal eaten at once in this bag (no cooked fish), so
       the button must offer it; its picture's first fetch is the loading
       screen's warm-up (controlsPreload.js), long before the grant */
    rec.ok(`5. hurt with a Garden Stew, the quick-eat button shows the owner's stew, first fetched on the loading screen (${before.length ? 'at ' + before[0].at + ' ms' : 'not fetched before'})`,
      !!qe && qe.src === DISHES.meal_garden_stew.icon && before.length > 0 && before[0].early, { qe, before });
    await shot(A, 'quickeat');

    rec.ok('6. no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stopAlive = true;
    await A.ctx.close().catch(() => {});
  }
}
