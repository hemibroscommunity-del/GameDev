/* ═══ THE FARM, ON A PHONE (v2.3.3102) ═══
 *
 * Owner: "mechanics similar to the old FarmVille game where you have to wait
 * to harvest and each has a wait time different depending on what it is.
 * Need to dig, plant seeds, fertilize, water, etc."  Then: "Good.  Go ahead
 * and build it" (docs/FARMING-PLAN.md Phase 1, docs/specs/farm.md).
 *
 * One real player, on a phone, in the Wheel's Brotown, against a real worker:
 *   1. "Enter" at the Feed & Seed opens the new window (caps.farm): six beds
 *      of grass from the worker -- the free deed -- and the tool on Dig;
 *   2. ONE finger dragged across three beds digs all three, in one message;
 *   3. the Seeds tab sells carrot seeds and compost for the worker's coins;
 *   4. the tool moves to Plant by itself; "Plant all" sows the dug beds;
 *   5. Water re-times a bed (8 min -> 6 min, a drop in its corner), Fertilize
 *      puts compost on one (a worm), each one tap;
 *   6. ripened by the operator's dev op (a carrot takes real minutes), the
 *      beds read "Ready" and the tool is Harvest; "Harvest all" pays 7 carrots
 *      (3 fertilized + 2 + 2) and 75 Farming XP, settled by the worker -- its
 *      own copy of the bag says so;
 *   7. closed and opened again, the farm is the worker's: rough again where it
 *      was harvested;
 *   8. "Visit Your Farm" is still there (mp-wheeldoors walks it);
 *   9. v2.3.3102: switched off (liveflags `farm: false`), a second player who
 *      joins after gets the window CLOSED -- a card that sends nothing -- not
 *      the old browser-only plots; and no page errors.
 * Pictures: tools/qa/mp/out/farm-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `farm-${name}.png`) }).catch(() => {});

  const A = await H.newPlayer(browser, { name: 'Farmbro', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true });
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

    const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.farm));
    rec.ok('the worker advertises caps.farm', caps === true, caps);

    /* ── to the Feed & Seed's steps (mp-wheelhalls' walk) ── */
    const standAt = async (x, bootsY) => {
      for (let k = 0; k < 4; k++) {
        const dy = await A.page.evaluate(() => { const S = window._gameState.current, g = window.__btPlayerGround(); return g.y - S.player.y; });
        await H.hopTo(A, x, bootsY - dy, { step: 100, gap: 260, tries: 90 });
        await A.page.waitForTimeout(800);
        const g = await A.page.evaluate(() => window.__btPlayerGround());
        if (Math.hypot(g.x - x, g.y - bootsY) < 12) return true;
      }
      return false;
    };
    let doors = [];
    for (let i = 0; i < 40 && doors.length < 17; i++) {
      doors = await A.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
      if (doors.length < 17) await A.page.waitForTimeout(500);
    }
    const fs = doors.find((d) => d.id === 'feedseed');
    rec.ok('the Feed & Seed has a door (guard)', !!fs, doors.map((d) => d.id));
    if (!fs) return;
    await standAt(fs.x, fs.y + 30);
    let enter = null;
    for (let i = 0; i < 16 && !enter; i++) {
      enter = await A.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); return b ? (b.textContent || '').trim() : null; });
      if (!enter) await A.page.waitForTimeout(250);
    }
    await A.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });

    const farmView = () => A.page.evaluate(() => {
      const F = window.__btFarm;
      const v = F && F.view;
      const tool = document.querySelector('[data-farm-tool-on="1"]');
      const st = document.querySelector('[data-farm-status="1"]');
      return {
        open: !!document.querySelector('[data-farm]'),
        beds: v ? v.plots.map((p) => p.s + (p.crop ? ':' + p.crop : '') + (p.water ? '+w' : '') + (p.feed ? '+f' : '')) : null,
        drawn: Array.from(document.querySelectorAll('[data-bed]')).map((b) => b.getAttribute('data-bed-state')),
        tool: tool ? tool.getAttribute('data-farm-tool') : null,
        status: st ? (st.textContent || '').trim() : null,
        pending: !!(F && F.pending),
        plots: v ? v.plots : null,
        now: F ? F.serverNow() : 0,
      };
    });
    const until = async (pred, ms = 8000) => {
      let v = null;
      for (let t0 = Date.now(); Date.now() - t0 < ms;) { v = await farmView(); if (pred(v)) return v; await A.page.waitForTimeout(200); }
      return v;
    };
    const bag = () => H.readState(A, (S) => ({ inv: Object.assign({}, S.rpg && S.rpg.inventory), coins: S.rpg && S.rpg.coins, farming: S.rpg && S.rpg.lifeSkills && S.rpg.lifeSkills.farming }));
    const tap = (sel) => A.page.evaluate((s) => { const e = document.querySelector(s); if (e && !e.disabled) { e.click(); return true; } return false; }, sel);

    /* ── 1. the window ── */
    const v1 = await until((v) => v.open && v.beds && v.drawn.length === 6);
    await shot(A, 'open');
    rec.ok(`"${enter}" opens the Feed & Seed's farm: six beds of grass from the worker (${v1.beds && v1.beds.join(' ')}) and the tool on Dig`,
      !!enter && v1.open && v1.beds && v1.beds.length === 6 && v1.beds.every((b) => b === 'rough') && v1.drawn.every((s) => s === 'rough') && v1.tool === 'dig', v1);

    /* ── 2. one finger across three beds ── */
    const rects = await A.page.evaluate(() => Array.from(document.querySelectorAll('[data-bed]')).map((b) => { const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; }));
    await A.page.evaluate(() => { window.__farmSent = 0; const S = window._gameState.current; const orig = S.channel.send.bind(S.channel); S.channel.send = (m) => { if (m && /^farm_/.test(m.type)) window.__farmSent++; return orig(m); }; });
    await A.page.mouse.move(rects[0].x, rects[0].y);
    await A.page.mouse.down();
    for (const r of [rects[1], rects[2]]) { await A.page.mouse.move(r.x, r.y, { steps: 6 }); }
    await A.page.mouse.up();
    const v2 = await until((v) => v.beds && v.beds.slice(0, 3).every((b) => b === 'tilled'));
    const sent2 = await A.page.evaluate(() => window.__farmSent);
    await shot(A, 'dug');
    rec.ok(`one finger dragged across three beds digs all three (${v2.beds && v2.beds.join(' ')}) in ONE message to the worker (${sent2}); beds ${Math.round(rects[0].w)} px wide`,
      v2.beds && v2.beds.slice(0, 3).every((b) => b === 'tilled') && v2.beds.slice(3).every((b) => b === 'rough') && sent2 === 1 && rects[0].w >= 80, { v2, sent2 });

    /* ── 3. the Seeds tab ── */
    const b0 = await bag();
    await tap('[data-farm-tab="seeds"]');
    await A.page.waitForTimeout(300);
    await shot(A, 'seeds');
    await tap('[data-farm-buy="seed_carrot"][data-farm-buy-n="5"]');
    let b1 = b0;
    for (let i = 0; i < 30 && !(b1.inv.seed_carrot >= 5); i++) { await A.page.waitForTimeout(200); b1 = await bag(); }
    await A.page.waitForTimeout(300);
    await tap('[data-farm-buy="compost"][data-farm-buy-n="1"]');
    let b2 = b1;
    for (let i = 0; i < 30 && !(b2.inv.compost >= 1); i++) { await A.page.waitForTimeout(200); b2 = await bag(); }
    /* v2.3.3110: the crops still to open sit in one line a level, with no
       buy button -- Cloudpetal among Farming 10's. */
    const shop = await A.page.evaluate(() => ({
      rows: Array.from(document.querySelectorAll('[data-farm-row]')).map((r) => r.getAttribute('data-farm-row')),
      locked: Array.from(document.querySelectorAll('[data-farm-locked]')).map((l) => ({ lvl: Number(l.getAttribute('data-farm-locked')),
        crops: Array.from(l.querySelectorAll('[data-farm-locked-crop]')).map((c) => c.getAttribute('data-farm-locked-crop')) })),
      cloudBuy: !!document.querySelector('[data-farm-buy="seed_cloudpetal"]'),
    }));
    const cloudLocked = shop.locked.some((l) => l.lvl === 10 && l.crops.includes('cloudpetal'));
    rec.ok(`the Seeds tab sells 5 carrot seeds for 10 coins and a bag of compost for 4 (${b0.coins} -> ${b2.coins}), the worker's bag says so; Cloudpetal (Farming 10) cannot be bought`,
      b1.inv.seed_carrot === 5 && b2.inv.compost === 1 && b2.coins === b0.coins - 14 && !shop.cloudBuy && cloudLocked, { b0, b2, shop });
    /* v2.3.3110: sixteen crops -- at Farming 1 it sells the four that open
       there, then compost, and lists the other twelve by the level they
       open at. */
    const want1 = ['seed_carrot', 'seed_wheat', 'seed_firebloom', 'seed_strawberry', 'compost'];
    const wantLocked = [
      { lvl: 5, crops: ['tomato', 'potato', 'frostberry', 'rock_vine'] },
      { lvl: 10, crops: ['corn', 'cabbage', 'cloudpetal', 'dewmelon', 'pumpkin'] },
      { lvl: 15, crops: ['thunder_pepper', 'gloomcap'] },
      { lvl: 20, crops: ['heartroot'] },
    ];
    rec.ok(`...at Farming 1 it sells carrot, wheat, firebloom and strawberry seeds and compost (${shop.rows.join(', ')}), and lists the other twelve crops under the level they open at`,
      JSON.stringify(shop.rows) === JSON.stringify(want1) && JSON.stringify(shop.locked) === JSON.stringify(wantLocked), shop);

    /* ── 4. the tool follows the farm: Plant, and Plant all ── */
    await tap('[data-farm-tab="beds"]');
    const v4a = await until((v) => v.tool === 'plant', 3000);
    /* the pick that mp-farm's first run caught: three dug, three grass, seeds
       in the bag -- the tool must be Plant, not Dig */
    /* v2.3.3110: the Plant tool offers only seeds in the bag -- carrots. */
    const chips = await A.page.evaluate(() => Array.from(document.querySelectorAll('[data-farm-seed]')).map((c) => c.getAttribute('data-farm-seed')));
    rec.ok(`the Plant tool offers only the seeds in the bag (${chips.join(', ')}), not sixteen chips`, JSON.stringify(chips) === JSON.stringify(['carrot']), chips);
    await tap('[data-farm-seed="carrot"]');
    await A.page.waitForTimeout(200);
    await tap('[data-farm-all]');
    const v4 = await until((v) => v.beds && v.beds.slice(0, 3).every((b) => b.startsWith('planted:carrot')));
    const b4 = await bag();
    await shot(A, 'planted');
    rec.ok(`with the beds dug the tool moves to Plant by itself (${v4a.tool}), and "Plant all" sows carrots in the three (${v4.beds && v4.beds.join(' ')}), two seeds left`,
      v4a.tool === 'plant' && v4.beds && v4.beds.slice(0, 3).every((b) => b.startsWith('planted:carrot')) && b4.inv.seed_carrot === 2, { v4, inv: b4.inv });
    const p0 = v4.plots[0];
    rec.ok(`a carrot takes 8 minutes dry, on the worker's clock (${Math.round((p0.readyAt - p0.plantedAt) / 60000)} min)`, p0.readyAt - p0.plantedAt === 8 * 60000, p0);

    /* ── 5. water one, feed one: one tap each ── */
    await tap('[data-farm-tool="water"]');
    await A.page.waitForTimeout(200);
    await A.page.mouse.click(rects[0].x, rects[0].y);
    const v5 = await until((v) => v.beds && v.beds[0].includes('+w'));
    const p5 = v5.plots[0];
    await tap('[data-farm-tool="feed"]');
    await A.page.waitForTimeout(200);
    await A.page.mouse.click(rects[0].x, rects[0].y);
    const v5b = await until((v) => v.beds && v.beds[0].includes('+f'));
    const b5 = await bag();
    await shot(A, 'tended');
    rec.ok(`Water re-times the bed to 6 minutes (${Math.round((p5.readyAt - p5.plantedAt) / 60000)} min), Fertilize puts the compost on it (${v5b.beds && v5b.beds[0]}), one tap each`,
      p5.water === 1 && p5.readyAt - p5.plantedAt === 6 * 60000 && v5b.beds[0] === 'planted:carrot+w+f' && !b5.inv.compost, { p5, v5b: v5b.beds, inv: b5.inv });
    const unripe = v5b.plots.every((p) => p.s !== 'planted' || v5b.now < p.readyAt);
    rec.ok('...and nothing is ripe yet', unripe, v5b.plots);

    /* ── 6. ripe (the operator's dev op), Harvest all ── */
    const rip = await H.devOp(wsPort, 'farmripe', id);
    const v6a = await until((v) => v.drawn.filter((s) => s === 'ripe').length === 3);
    await A.page.waitForTimeout(300);
    const v6t = await farmView();
    await shot(A, 'ripe');
    rec.ok(`ripened by the dev op (${rip && rip.ripened}), the three beds read Ready and the tool is Harvest (${v6t.tool})`,
      !!rip && rip.ripened === 3 && v6a.drawn.filter((s) => s === 'ripe').length === 3 && v6t.tool === 'harvest', { rip, v6a: v6a.drawn, tool: v6t.tool });
    const f0 = (await bag()).farming || { level: 1, xp: 0 };
    await tap('[data-farm-all]');
    const v6 = await until((v) => v.beds && v.beds.slice(0, 3).every((b) => b === 'rough') && /Carrot/.test(v.status || ''));
    let b6 = await bag();
    for (let i = 0; i < 20 && b6.inv.crop_carrot !== 7; i++) { await A.page.waitForTimeout(200); b6 = await bag(); }
    const srv = await H.adminPlayer(wsPort, id);
    const srvInv = (srv && srv.rpg && srv.rpg.inventory) || {};
    await shot(A, 'harvested');
    const xpGain = ((b6.farming && b6.farming.level) > (f0.level || 1)) ? 'levelled' : (b6.farming.xp - (f0.xp || 0));
    rec.ok(`"Harvest all" pays 7 carrots (3 fertilized + 2 + 2) and 75 Farming XP (${xpGain}), the window saying "${v6.status}", the beds rough again`,
      b6.inv.crop_carrot === 7 && (xpGain === 75 || xpGain === 'levelled') && /\+7 Carrot/.test(v6.status || '') && v6.beds.slice(0, 3).every((b) => b === 'rough'),
      { inv: b6.inv, farming: b6.farming, v6 });
    rec.ok(`...settled by the worker: its own copy of the bag holds the 7 carrots (${srvInv.crop_carrot})`, srvInv.crop_carrot === 7, srvInv);

    /* ── 7. closed and opened again ── */
    await A.page.evaluate(() => { const b = document.querySelector('.bt-inspect-close'); if (b) b.click(); });
    await A.page.waitForTimeout(600);
    await A.page.evaluate(() => { window.__btFarm.view = null; });   /* forget it here: the window must ask the worker again */
    await A.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
    const v7 = await until((v) => v.open && v.beds && v.beds.length === 6);
    rec.ok(`closed and opened again, the farm is the worker's (${v7.beds && v7.beds.join(' ')})`, v7.beds && v7.beds.every((b) => b === 'rough'), v7.beds);

    /* ── 8. the farm trip, and clean ── */
    const visit = await A.page.evaluate(() => { const b = document.querySelector('[data-farm-visit]'); return b ? (b.textContent || '').trim() : null; });
    rec.ok('"Visit Your Farm" is still in the window', visit === 'Visit Your Farm', visit);

    /* ── 9. v2.3.3102: the kill switch.  A tab that joins while `farm: false`
       is set gets the window CLOSED -- a card that asks the worker nothing --
       not the old browser-only plots (the review's finding: "No seeds" beside
       beds it could not see).  A second player, so the caps are fresh. ── */
    const admin = async (path, init) => (await (await fetch('http://127.0.0.1:' + wsPort + '/api/admin' + path,
      Object.assign({ headers: { Authorization: 'Bearer ' + H.ADMIN_KEY } }, init || {}))).json());
    const flagOff = await admin('/flags', { method: 'POST', headers: { Authorization: 'Bearer ' + H.ADMIN_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'farm', value: false }) });
    const B = await H.newPlayer(browser, { name: 'Farmbro2', wsPort, webPort, viewport: PHONE, touch: true });
    B.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
    try {
      await H.enterWorld(B);
      const capsB = await H.readState(B, (S) => S._serverCaps && S._serverCaps.farm);
      await B.page.evaluate(() => {
        window.__btFarmSends = 0;
        const S = window._gameState && window._gameState.current;
        const ch = S && S.channel;
        if (ch) { const orig = ch.send.bind(ch); ch.send = (m) => { if (m && /^farm_/.test(String(m.type))) window.__btFarmSends += 1; return orig(m); }; }
      });
      await B.page.evaluate(() => { try { window._uiPanels.building('farm'); } catch (e) { /* the check below says */ } });
      await B.page.waitForTimeout(1500);
      await shot(B, 'closed');
      const c = await B.page.evaluate(() => ({
        closed: !!document.querySelector('[data-farm-status="closed"]'),
        words: ((document.querySelector('[data-farm-status="closed"]') || {}).textContent || '').trim(),
        tabs: document.querySelectorAll('[data-farm-tab]').length,
        visit: !!document.querySelector('[data-farm-visit]'),
        sends: window.__btFarmSends,
        pending: !!(window.__btFarm && window.__btFarm.pending),
        legacy: /No seeds/.test(document.body.textContent || ''),
      }));
      rec.ok(`switched off (flag set: ${!!(flagOff && flagOff.ok)}, caps.farm ${capsB}), a tab that joins after gets the window CLOSED ("${c.words}"): no tabs, Visit Your Farm, no old plots, and nothing sent (${c.sends})`,
        !!(flagOff && flagOff.ok) && capsB === false && c.closed && /closed for now/.test(c.words) && c.tabs === 0 && c.visit && !c.legacy && c.sends === 0 && !c.pending, c);
    } finally {
      await admin('/flags?name=farm', { method: 'DELETE' }).catch(() => {});
      await B.ctx.close().catch(() => {});
    }
    stopAlive = true;
    rec.ok('no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    stopAlive = true;
  }
}
