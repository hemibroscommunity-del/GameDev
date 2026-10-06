/* ═══ THE FARM YOU WALK, ON A PHONE (v2.3.3124) ═══
 *
 * The owner, 2026-10-06: "I want your character to be able to walk around on
 * the farm.  I want the planting process to happen by your character taking
 * action on the plot of ground.  You dig, you water, you fertilize, etc. you
 * can use the firemaking animation for all of that.  I don't want the game to
 * just be reading a bunch of boring menus.  Make the timer appear above the
 * crop that was planted and any next steps it needs (next in sequence like
 * 'Needs Watering') etc".
 *
 * One player on a phone against a real worker:
 *   1. seeds and compost from the worker; the Feed & Seed's "Visit Your Farm"
 *      (a real touch) takes you onto the farm under its loading screen, and
 *      the farm is all there when it lifts: the ground, the barn, the props,
 *      six beds of grass, a spade over each (the step as the stick's own
 *      picture; the words only over the bed you are nearest);
 *   2. walk up to a bed: the stick wears the spade, the prompt says "Dig";
 *      E kneels you there (the fire-lighter's kneel, with no log), one
 *      farm_act goes when it ends, the bed turns to dug earth -- "Needs
 *      Planting";
 *   3. two kinds of seed: their pictures over the prompt, a tap picks one;
 *      a tap on the RIGHT STICK plants it -- the carrot's sprout, a timer and
 *      "Needs Watering";
 *   4. a tap on the BED ITSELF waters it -- "Needs Fertilizer"; the prompt's
 *      button fertilizes it -- the timer alone;
 *   5. what a step needs is said before kneeling (no compost: nothing sent),
 *      and walking away mid-step sends nothing;
 *   6. ripened by the dev op: "Ready to Harvest!", E pulls it -- 3 carrots
 *      (fertilized) and the Farming XP, the carrot flying to the bag, the bed
 *      back to grass;
 *   7. a farm the page was never told of is asked for on arrival (one
 *      farm_open); the barn stops your boots; the gate takes you back to the
 *      Wheel.
 * Pictures: tools/qa/mp/out/farmwalk-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FARM_BEDS, FARM_THINGS, FARM_GATE } from '../../../src/data/farmLayout.js';

const PHONE = { width: 390, height: 844 };
const FOOT_DY = 52;   /* a body's middle to its boots on the farm (no perspective) */

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (name) => A.page.screenshot({ path: join(OUT, `farmwalk-${name}.png`) }).catch(() => {});

  const A = await H.newPlayer(browser, { name: 'Walkfarmer', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
  const errors = [];
  A.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await A.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await A.page.waitForTimeout(500).catch(() => {});
    }
  })();
  try {
    await H.enterWorld(A);
    const wa = await H.waitFor(A, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the Wheel' }).catch(() => null);
    rec.ok('the player is in the Wheel (guard)', !!wa, wa);
    if (!wa) return;
    const id = await H.readState(A, (S) => S.myId);
    await H.devOp(wsPort, 'quests', id);
    await H.devOp(wsPort, 'vitals', id, { god: true, godMinutes: 30 });
    await A.page.evaluate(() => { setInterval(() => { const S = window._gameState && window._gameState.current; if (S) S._isDesktop = false; }, 120); });
    await A.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
    /* every farm_act this page sends, counted */
    await A.page.evaluate(() => {
      window.__farmActs = [];
      const S = window._gameState.current;
      const orig = S.channel.send.bind(S.channel);
      window.__farmOpens = 0;
      S.channel.send = (m) => {
        if (m && m.type === 'farm_act') window.__farmActs.push(JSON.parse(JSON.stringify(m.payload)));
        if (m && m.type === 'farm_open') window.__farmOpens += 1;
        return orig(m);
      };
    });
    const acts = () => A.page.evaluate(() => window.__farmActs.slice());
    const bag = () => H.readState(A, (S) => ({ inv: Object.assign({}, S.rpg && S.rpg.inventory), farming: S.rpg && S.rpg.lifeSkills && S.rpg.lifeSkills.farming }));
    const walk = () => A.page.evaluate(() => (window.__btFarmWalk ? window.__btFarmWalk() : null));
    const world = () => A.page.evaluate(() => (window.__btFarmWorld ? window.__btFarmWorld() : null));
    const view = () => A.page.evaluate(() => (window.__btFarm && window.__btFarm.view ? window.__btFarm.view.plots.map((p) => p.s + (p.crop ? ':' + p.crop : '') + (p.water ? '+w' : '') + (p.feed ? '+f' : '')) : null));
    const icon = () => A.page.evaluate(() => { const d = document.querySelector('.bt-rjoy-base'); return d ? d.getAttribute('data-ricon') : null; });
    const until = async (fn, pred, ms = 8000) => {
      let v = null;
      for (let t0 = Date.now(); Date.now() - t0 < ms;) { v = await fn(); if (pred(v)) return v; await A.page.waitForTimeout(150); }
      return v;
    };
    /* stand with your boots at (x, y) */
    const standBoots = (x, y) => H.hopTo(A, x, y - FOOT_DY, { step: 80, gap: 220, tries: 60 });

    /* ── 1. seeds and compost, then the way onto the farm ── */
    const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.farm));
    rec.ok('the worker advertises caps.farm (guard)', caps === true, caps);
    const buy = async (item, n) => {
      await until(() => A.page.evaluate(() => !(window.__btFarm && window.__btFarm.pending)), (v) => v, 6000);
      await A.page.evaluate(({ item, n }) => window.__btFarm.buy(window._gameState.current, item, n), { item, n });
      return until(bag, (b) => (b.inv[item] || 0) >= n, 8000);
    };
    await buy('seed_carrot', 5);
    await buy('seed_wheat', 1);
    const b0 = await buy('compost', 1);
    rec.ok(`5 carrot seeds, 1 wheat seed and 1 compost bought from the worker (guard: ${b0.inv.seed_carrot}, ${b0.inv.seed_wheat}, ${b0.inv.compost})`,
      b0.inv.seed_carrot === 5 && b0.inv.seed_wheat === 1 && b0.inv.compost === 1, b0.inv);
    await A.page.evaluate(() => { try { window._uiPanels.building('farm'); } catch (e) { /* the check says */ } });
    const visitBtn = await until(() => A.page.evaluate(() => { const b = document.querySelector('[data-farm-visit]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }), (v) => !!v, 8000);
    const win = await until(() => A.page.evaluate(() => ({
      tabs: Array.from(document.querySelectorAll('[data-farm-tab]')).map((t) => t.getAttribute('data-farm-tab')),
      beds: document.querySelectorAll('[data-bed]').length,
      summary: (document.querySelector('[data-farm-summary]') || {}).textContent || null,
    })), (v) => !!v.summary, 8000);
    await shot('window');
    rec.ok(`the Feed & Seed window plants nothing now: tabs ${win.tabs.join(', ')}, no beds in it, "Visit Your Farm" at the top ("${win.summary}")`,
      JSON.stringify(win.tabs.slice(0, 1)) === JSON.stringify(['seeds']) && win.tabs.indexOf('beds') < 0 && win.beds === 0 && !!visitBtn && /6 beds to plant/.test(win.summary || ''), win);
    const wheelScale = await H.readState(A, (S) => S._worldScaleX);
    /* what the GPU and the asset cache hold in the Wheel, to set the farm's
       against (pixiApp.js __btGpuTex) */
    const gpu = () => A.page.evaluate(() => (window.__btGpuTex ? window.__btGpuTex(16) : null));
    const memWheel = await gpu();
    await A.page.touchscreen.tap(visitBtn.x, visitBtn.y);
    const onFarm = await until(() => H.readState(A, (S) => ({ zone: S.currentZone, hold: !!S._farmArtHold, veil: !!document.querySelector('.bt-zone-loading') })),
      (v) => v.zone === 'farm_home' && !v.hold && !v.veil, 20000);
    const holds = await A.page.evaluate(() => (window.__btFarmHolds || []).slice());
    const w1 = await until(world, (w) => w && w.built && w.beds.every((b) => b.soil === 'plot') && w.beds.every((b) => b.label && b.icon === 'icon:dig'), 8000);
    const ground = await A.page.evaluate(() => (window.__btZoneMapUrl ? window.__btZoneMapUrl() : null));
    await shot('arrive');
    rec.ok(`"Visit Your Farm" takes you onto the farm under its loading screen (${holds.length} hold, ready ${holds.length ? holds[holds.length - 1].ready : '-'}), and it lifts on the farm all there: ${w1 && w1.things} things of ${FARM_THINGS.length}, six beds of grass`,
      onFarm.zone === 'farm_home' && holds.length >= 1 && holds[holds.length - 1].ready === true && w1 && w1.built && w1.things === FARM_THINGS.length, { onFarm, holds, w1, ground });
    /* v2.3.3124: the farm is bigger than an upright phone's view both ways
       now (1024 x 1408), so it draws at the character size every zone does
       -- the cave farm's 960 x 800 forced 0.82, the bro 64% bigger than in town */
    const farmScale = await H.readState(A, (S) => S._worldScaleX);
    rec.ok(`...drawn at the character size of BroTown (scale ${farmScale && farmScale.toFixed(3)} on the farm, ${wheelScale && wheelScale.toFixed(3)} in the Wheel)`,
      farmScale > 0 && wheelScale > 0 && Math.abs(farmScale / wheelScale - 1) < 0.02, { farmScale, wheelScale });
    rec.ok(`...a spade over each bed, no words while you are far from them (${w1 && w1.beds.map((b) => b.icon + ':' + (b.label || []).length).join(' ')})`,
      w1 && w1.beds.every((b) => b.icon === 'icon:dig' && b.label && b.label.length === 0), w1 && w1.beds);

    /* ── 2. walk up to bed 0: the spade, "Dig"; E kneels you and digs it ── */
    const B0 = FARM_BEDS[0];
    await standBoots(B0.x + B0.w / 2, B0.y - 16);
    const n0 = await until(walk, (w) => w && w.near && w.near.i === 0 && w.near.step === 'dig', 4000);
    const ic0 = await until(icon, (v) => v === 'farm-dig', 3000);
    const pr0 = await until(() => A.page.evaluate(() => { const p = document.querySelector('[data-farm-step]'); return p ? { step: p.getAttribute('data-farm-step'), text: (p.textContent || '').trim() } : null; }), (v) => !!v, 3000);
    const wa0 = await until(world, (w) => w && w.beds[0].label && w.beds[0].label[0] === 'Needs Digging', 3000);
    await shot('at-bed');
    rec.ok(`at bed 0 the stick wears the spade (${ic0}), the prompt says "${pr0 && pr0.text}", and that bed alone says "${wa0 && wa0.beds[0].label && wa0.beds[0].label[0]}" (the others ${wa0 && wa0.beds.slice(1).map((b) => (b.label || []).length).join('')} words)`,
      n0 && n0.near && n0.near.step === 'dig' && ic0 === 'farm-dig' && pr0 && pr0.step === 'dig' && /Dig/.test(pr0.text)
        && wa0 && wa0.beds[0].label[0] === 'Needs Digging' && wa0.beds.slice(1).every((b) => b.label && b.label.length === 0), { n0, ic0, pr0, wa0: wa0 && wa0.beds });
    const a0 = (await acts()).length;
    await A.page.keyboard.press('e');
    /* read in one go while the 1.5 s step lasts (a screenshot on this box can
       take most of it) */
    const k0 = await until(() => A.page.evaluate(() => ({ w: window.__btFarmWalk(), fig: window.__btFireFigure ? window.__btFireFigure() : null, body: !!window._gameState.current._standInBody })),
      (v) => v.w && v.w.work && v.fig && v.fig.visible && v.fig.farm && v.fig.frame >= 1 && v.body, 2000);
    await shot('kneel-dig');
    rec.ok(`E kneels you at the bed: the fire-lighter's figure on the farmer's frames (frame ${k0.fig && k0.fig.frame} of ${k0.fig && k0.fig.farmFrames}), your walking body put away, the step "${k0.w && k0.w.work && k0.w.work.step}"`,
      k0.w && k0.w.work && k0.w.work.step === 'dig' && k0.fig && k0.fig.farm === true && k0.fig.farmFrames === 3 && k0.fig.frame >= 1 && k0.body, k0);
    const v0 = await until(view, (v) => v && v[0] === 'tilled', 6000);
    const w2 = await until(world, (w) => w && w.beds[0].soil === 'bed-dug' && w.beds[0].label && w.beds[0].label[0] === 'Needs Planting', 4000);
    const a0b = await acts();
    rec.ok(`...and when the kneel ends ONE farm_act goes (${JSON.stringify(a0b.slice(a0))}) and the bed is dug earth, "Needs Planting" (${w2 && w2.beds[0].soil})`,
      v0 && v0[0] === 'tilled' && a0b.length - a0 === 1 && a0b[a0].op === 'dig' && JSON.stringify(a0b[a0].beds) === '[0]' && w2 && w2.beds[0].soil === 'bed-dug', { v0, acts: a0b.slice(a0), w2: w2 && w2.beds[0] });

    /* ── 3. two kinds of seed: pick one; the RIGHT STICK's tap plants it ── */
    await A.page.waitForTimeout(400);
    const pk = await until(() => A.page.evaluate(() => Array.from(document.querySelectorAll('[data-farm-seed-pick]')).map((b) => b.getAttribute('data-farm-seed-pick') + ':' + b.getAttribute('data-on'))), (v) => v && v.length === 2, 4000);
    const tapSel = async (sel) => {
      const r = await A.page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, sel);
      if (r) await A.page.touchscreen.tap(r.x, r.y);
      return !!r;
    };
    await tapSel('[data-farm-seed-pick="wheat"]');
    const pkW = await until(() => A.page.evaluate(() => ({ w: window.__btFarmWalk().seed, txt: (document.querySelector('[data-farm-step]') || {}).textContent })), (v) => v.w === 'wheat', 3000);
    await tapSel('[data-farm-seed-pick="carrot"]');
    const pkC = await until(() => A.page.evaluate(() => ({ w: window.__btFarmWalk().seed, txt: (document.querySelector('[data-farm-step]') || {}).textContent })), (v) => v.w === 'carrot', 3000);
    await shot('seed-pick');
    rec.ok(`two kinds of seed in the bag: their pictures over the prompt (${pk && pk.join(' ')}), a tap picks wheat ("${pkW.txt}"), then carrot ("${pkC.txt}")`,
      pk && pk.length === 2 && pk[0] === 'carrot:1' && pkW.w === 'wheat' && /Plant Wheat/.test(pkW.txt || '') && pkC.w === 'carrot' && /Plant Carrot/.test(pkC.txt || ''), { pk, pkW, pkC });
    const icP = await until(icon, (v) => v === 'farm-plant', 3000);
    await A.page.evaluate(() => {
      const z = document.querySelector('[data-joyzone="R"]');
      const b = z.getBoundingClientRect();
      const x = b.left + b.width * 0.7, y = b.top + b.height * 0.3;
      const el = document.elementFromPoint(x, y) || z;
      const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
        touches: t === 'touchend' ? [] : [new Touch({ identifier: 91, target: el, clientX: x, clientY: y })],
        changedTouches: [new Touch({ identifier: 91, target: el, clientX: x, clientY: y })] });
      el.dispatchEvent(mk('touchstart')); el.dispatchEvent(mk('touchend'));
    });
    const v1 = await until(view, (v) => v && v[0] === 'planted:carrot', 7000);
    const w3 = await until(world, (w) => w && w.beds[0].crop === 'carrot-sprout' && w.beds[0].label && w.beds[0].label.length === 2, 4000);
    await shot('planted');
    const jumped = await A.page.evaluate(() => (window.__btJumpBtn ? window.__btJumpBtn().count : 0));
    rec.ok(`a tap on the right stick (wearing ${icP}) plants a carrot (${v1 && v1[0]}): the sprout, its timer and "${w3 && w3.beds[0].label && w3.beds[0].label[1]}" over it, and no jump`,
      icP === 'farm-plant' && v1 && v1[0] === 'planted:carrot' && w3 && /^\d+m( \d+s)?$/.test(w3.beds[0].label[0]) && w3.beds[0].label[1] === 'Needs Watering' && !jumped, { icP, v1, w3: w3 && w3.beds[0], jumped });

    /* ── 4. a tap on the bed itself waters it; the prompt's button fertilizes ── */
    await A.page.waitForTimeout(400);
    const bedPt = await A.page.evaluate((b) => {
      const S = window._gameState.current, c = document.querySelector('canvas'), r = c.getBoundingClientRect();
      return { x: r.left + (b.x + b.w / 2 - S.camera.x) * S._worldScaleX, y: r.top + (b.y + b.h * 0.6 - S.camera.y) * S._worldScaleY };
    }, B0);
    await A.page.touchscreen.tap(bedPt.x, bedPt.y);
    const v2 = await until(view, (v) => v && v[0] === 'planted:carrot+w', 7000);
    const bt = await A.page.evaluate(() => window.__btBedTap || null);
    const w4 = await until(world, (w) => w && w.beds[0].soil === 'bed-wet' && w.beds[0].label && w.beds[0].label[1] === 'Needs Fertilizer', 4000);
    rec.ok(`a tap on the bed itself (${JSON.stringify(bt)}) waters it (${v2 && v2[0]}): the soil darker, "${w4 && w4.beds[0].label && w4.beds[0].label[1]}"`,
      v2 && v2[0] === 'planted:carrot+w' && bt && bt.bed === 0 && bt.used && w4 && w4.beds[0].soil === 'bed-wet', { v2, bt, w4: w4 && w4.beds[0] });
    await A.page.waitForTimeout(400);
    await until(() => A.page.evaluate(() => { const p = document.querySelector('[data-farm-step]'); return p ? p.getAttribute('data-farm-step') : null; }), (v) => v === 'feed', 3000);
    await tapSel('[data-farm-step="feed"]');
    const v3 = await until(view, (v) => v && v[0] === 'planted:carrot+w+f', 7000);
    const w5 = await until(world, (w) => w && w.beds[0].soil === 'bed-wetfed' && w.beds[0].label && w.beds[0].label.length === 1, 4000);
    await shot('tended');
    rec.ok(`the prompt's button ("Fertilize") composts it (${v3 && v3[0]}): the soil worked and wet, the timer alone over it (${w5 && w5.beds[0].label})`,
      v3 && v3[0] === 'planted:carrot+w+f' && w5 && w5.beds[0].soil === 'bed-wetfed' && /^\d+m( \d+s)?$/.test(w5.beds[0].label[0]), { v3, w5: w5 && w5.beds[0] });

    /* ── 5. what a step needs, said first; walking away sends nothing ── */
    const B1 = FARM_BEDS[1];
    await standBoots(B1.x + B1.w / 2, B1.y - 16);
    for (const want of ['tilled', 'planted:carrot', 'planted:carrot+w']) {
      await until(walk, (w) => w && w.near && w.near.i === 1 && !w.work, 4000);
      await until(() => A.page.evaluate(() => !window.__btFarm.pending), (v) => v, 4000);
      await A.page.keyboard.press('e');
      await until(view, (v) => v && v[1] === want, 7000);
      await A.page.waitForTimeout(300);
    }
    const before5 = (await acts()).length;
    await until(walk, (w) => w && w.near && w.near.i === 1 && w.near.step === 'feed', 4000);
    await A.page.keyboard.press('e');
    await A.page.waitForTimeout(1600);
    const n5 = await A.page.evaluate(() => ({ work: window.__btFarmWalk().work, said: (window.__btFarmSaid || []).map((d) => d.text) }));
    const after5 = (await acts()).length;
    rec.ok(`with no compost left, E at a watered bed says so over it ("No compost: ...") and kneels for nothing: no step, nothing sent (${after5 - before5})`,
      !n5.work && after5 === before5 && n5.said.some((t) => /No compost/.test(t)), n5);
    const B2 = FARM_BEDS[2];
    await standBoots(B2.x + B2.w / 2, B2.y - 16);
    await until(walk, (w) => w && w.near && w.near.i === 2 && w.near.step === 'dig', 4000);
    const before6 = (await acts()).length;
    await A.page.keyboard.press('e');
    await until(walk, (w) => w && w.work, 2000);
    await A.page.evaluate(() => { const S = window._gameState.current; S.player.x += 40; });
    await A.page.waitForTimeout(2200);
    const n6 = await walk();
    const v6 = await view();
    rec.ok(`walking away mid-step drops it: no step under way, nothing sent (${(await acts()).length - before6}), the bed still grass (${v6 && v6[2]})`,
      !n6.work && (await acts()).length === before6 && v6 && v6[2] === 'rough', { n6, v6 });

    /* ── 6. ripe: "Ready to Harvest!", E pulls it, the carrot flies to the bag ── */
    const rip = await H.devOp(wsPort, 'farmripe', id);
    await standBoots(B0.x + B0.w / 2, B0.y - 16);
    const w7 = await until(world, (w) => w && w.beds[0].crop === 'carrot-ripe' && w.beds[0].label && w.beds[0].label[0] === 'Ready to Harvest!'
      && w.beds[1].label && w.beds[1].label[0] === 'Ready!', 6000);
    const icH = await until(icon, (v) => v === 'farm-harvest', 4000);
    await shot('ripe');
    rec.ok(`ripened (${rip && rip.ripened}), the carrot is the owner's ripe picture with "${w7 && w7.beds[0].label && w7.beds[0].label[0]}" over it (the far one: "${w7 && w7.beds[1].label && w7.beds[1].label[0]}"), and the stick wears the basket (${icH})`,
      !!rip && rip.ripened >= 1 && w7 && w7.beds[0].crop === 'carrot-ripe' && w7.beds[0].label[0] === 'Ready to Harvest!' && w7.beds[1].label[0] === 'Ready!' && icH === 'farm-harvest', { rip, w7: w7 && w7.beds.slice(0, 2), icH });
    const f0 = (await bag()).farming || { level: 1, xp: 0 };
    await A.page.evaluate(() => { window.__flown = []; new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.tagName === 'IMG' && /carrot-ripe/.test(n.src || '')) window.__flown.push(Date.now()); }).observe(document.body, { childList: true }); });
    await A.page.keyboard.press('e');
    const v7 = await until(view, (v) => v && v[0] === 'rough', 7000);
    let b7 = await bag();
    for (let i = 0; i < 20 && b7.inv.crop_carrot !== 3; i++) { await A.page.waitForTimeout(200); b7 = await bag(); }
    const flown = await A.page.evaluate(() => window.__flown.length);
    const srv = await H.adminPlayer(wsPort, id);
    const srvInv = (srv && srv.rpg && srv.rpg.inventory) || {};
    const w8 = await until(world, (w) => w && w.beds[0].soil === 'plot' && w.beds[0].label && w.beds[0].label[0] === 'Needs Digging', 4000);
    await shot('harvested');
    const xpGain = ((b7.farming && b7.farming.level) > (f0.level || 1)) ? 'levelled' : (b7.farming.xp - (f0.xp || 0));
    rec.ok(`E pulls it: 3 carrots (fertilized; the worker's bag ${srvInv.crop_carrot}) and 25 Farming XP (${xpGain}), the carrot flying to the bag (${flown}), the bed grass again`,
      v7 && v7[0] === 'rough' && b7.inv.crop_carrot === 3 && srvInv.crop_carrot === 3 && (xpGain === 25 || xpGain === 'levelled') && flown >= 1 && w8 && w8.beds[0].soil === 'plot',
      { v7, inv: b7.inv, srvInv: srvInv.crop_carrot, xpGain, flown });

    /* ── 6b. a farm this page has never been told of -- you came by the Land
       Office and never opened the Feed & Seed, and the join sends a farm
       only once there is one -- is asked for while you stand on it: one
       farm_open, and the beds have their steps again ── */
    const icons = (w) => (w ? w.beds.map((b) => b.icon).join(' ') : '');
    const before9 = icons(await world());
    const o0 = await A.page.evaluate(() => window.__farmOpens);
    await A.page.evaluate(() => { window.__btFarm.view = null; });
    const back = await until(() => A.page.evaluate(() => ({ view: !!(window.__btFarm && window.__btFarm.view), opens: window.__farmOpens })), (v) => v.view, 9000);
    const w9 = await until(world, (w) => icons(w) === before9, 4000);
    await A.page.waitForTimeout(1200);
    const o1 = await A.page.evaluate(() => window.__farmOpens);
    /* (the answer is back within a frame or two here, so the bare beds in
       between are not waited for) */
    rec.ok(`a farm the page has not been told of is asked for on the farm (${o1 - o0} farm_open), and the beds have their steps again (${icons(w9)})`,
      back.view && o1 - o0 === 1 && icons(w9) === before9 && !!before9, { back, o0, o1, before9, after: icons(w9) });

    /* ── 6c. memory: after a whole visit's farming, the farm holds its own
       pictures and not the Wheel's (CLAUDE.md, "Memory is budgeted").  The
       numbers go to out/farmwalk-memory.json. ── */
    const memFarm = await gpu();
    const tot = (m) => (m && !m.err ? m.mb + ((m.cacheNotOnGpu && m.cacheNotOnGpu.mb) || 0) : NaN);
    try { writeFileSync(join(OUT, 'farmwalk-memory.json'), JSON.stringify({ wheel: memWheel, farm: memFarm }, null, 1)); } catch (e) { /* the check says */ }
    rec.ok(`on the farm the page holds ${memFarm && memFarm.mb} MB on the GPU and ${memFarm && memFarm.cacheNotOnGpu && memFarm.cacheNotOnGpu.mb} MB cached, against the Wheel's ${memWheel && memWheel.mb} and ${memWheel && memWheel.cacheNotOnGpu && memWheel.cacheNotOnGpu.mb}: less in all`,
      tot(memFarm) < tot(memWheel), { farm: memFarm && { mb: memFarm.mb, cache: memFarm.cacheNotOnGpu, top: (memFarm.list || []).slice(0, 8) }, wheel: memWheel && { mb: memWheel.mb, cache: memWheel.cacheNotOnGpu && memWheel.cacheNotOnGpu.mb } });

    /* ── 7. the barn stops your boots; the gate takes you back out ── */
    const barn = FARM_THINGS.find((t) => t.art === 'farm:barn');
    const wallY = barn.y + barn.block[1] + barn.block[3];
    await standBoots(420, wallY + 70);
    await A.page.keyboard.down('w');
    await A.page.waitForTimeout(1800);
    await A.page.keyboard.up('w');
    const g = await A.page.evaluate(() => window.__btPlayerGround());
    rec.ok(`walking north into the barn, your boots stop at its wall (${Math.round(g.y)}, the wall at ${wallY})`, g.y >= wallY - 2 && g.y < wallY + 30, { g, wallY });
    await standBoots(FARM_GATE.x, 1376);
    const out = await until(() => H.readState(A, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading })), (v) => v.zone === 'wheel' && !v.loading, 30000);
    rec.ok(`the gate takes you back out to the Wheel (${out.zone})`, out.zone === 'wheel', out);

    stopAlive = true;
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    stopAlive = true;
  }
}
