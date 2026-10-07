/* ═══ THE FARM, ON A PHONE (v2.3.3127) ═══
 *
 * Owner: "mechanics similar to the old FarmVille game where you have to wait
 * to harvest and each has a wait time different depending on what it is.
 * Need to dig, plant seeds, fertilize, water, etc."  Then: "Good.  Go ahead
 * and build it" (docs/FARMING-PLAN.md Phase 1, docs/specs/farm.md).
 *
 * v2.3.3136: the beds are worked ON YOUR FARM, where they lie -- the owner:
 * "I don't want the game to just be reading a bunch of boring menus" --
 * and mp-farmwalk walks that.  The Feed & Seed is the farm's shop and its
 * order board.  So here, one real player, on a phone, in the Wheel's
 * Brotown, against a real worker:
 *   1. "Enter" at the Feed & Seed opens the window (caps.farm) on its Seeds
 *      tab: no beds and no tools in it any more, "Visit Your Farm" at the top
 *      and a line saying how your beds are doing -- six to plant, the
 *      worker's free deed;
 *   2. the Seeds tab sells carrot seeds and compost for the worker's coins;
 *      at Farming 1 four crops and compost, the other twelve under the level
 *      they open at, each drawn as the owner drew it grown, every picture in;
 *   3. the summary line follows the WORKER'S farm: three beds dug and sown
 *      (farm_act, as the beds' own steps send it), "3 growing"; ripened by the
 *      operator's dev op, "3 ready to harvest" in green; harvested, 6 carrots
 *      in the worker's own copy of the bag and six beds to plant again;
 *   4. closed and opened again, the line is the worker's;
 *   5. switched off (liveflags `farm: false`), a second player who joins
 *      after gets the window CLOSED -- a card that sends nothing, no summary,
 *      no tabs -- not the old browser-only plots; and no page errors.
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
      const sum = document.querySelector('[data-farm-summary]');
      const tabOn = Array.from(document.querySelectorAll('[data-farm-tab]')).find((t) => /inset/.test(t.style.boxShadow || ''));
      return {
        open: !!document.querySelector('[data-farm]'),
        beds: v ? v.plots.map((p) => p.s + (p.crop ? ':' + p.crop : '') + (p.water ? '+w' : '') + (p.feed ? '+f' : '')) : null,
        /* v2.3.3136: the window draws no beds and offers no tools */
        drawnBeds: document.querySelectorAll('[data-bed]').length,
        tools: document.querySelectorAll('[data-farm-tool]').length,
        tabs: Array.from(document.querySelectorAll('[data-farm-tab]')).map((t) => t.getAttribute('data-farm-tab')),
        tab: tabOn ? tabOn.getAttribute('data-farm-tab') : null,
        summary: sum ? (sum.textContent || '').trim() : null,
        ready: sum ? Number(sum.getAttribute('data-farm-summary')) : null,
        summaryColor: sum ? getComputedStyle(sum).color : null,
        visitFirst: (() => {
          const vb = document.querySelector('[data-farm-visit]'), tb = document.querySelector('[data-farm-tab]');
          return !!vb && (!tb || vb.getBoundingClientRect().top < tb.getBoundingClientRect().top);
        })(),
        status: ((document.querySelector('[data-farm-status="1"]') || {}).textContent || '').trim() || null,
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
    /* v2.3.3136: every farm picture in the window has come in (complete, with
       a size) -- a broken address would show nothing where a crop should be */
    const artIn = async () => {
      let v = null;
      for (let t0 = Date.now(); Date.now() - t0 < 6000;) {
        v = await A.page.evaluate(() => {
          const imgs = Array.from(document.querySelectorAll('[data-farm] img[data-farm-pic]'));
          return { n: imgs.length, bad: imgs.filter((i) => !(i.complete && i.naturalWidth > 0)).map((i) => i.getAttribute('data-farm-pic')) };
        });
        if (v.n && !v.bad.length) return v;
        await A.page.waitForTimeout(200);
      }
      return v;
    };
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

    /* ── 1. the window: Seeds first, no beds, the way to your farm ── */
    const v1 = await until((v) => v.open && v.beds && v.summary);
    await shot(A, 'open');
    rec.ok(`"${enter}" opens the Feed & Seed on its Seeds tab (${v1.tab}; tabs ${v1.tabs.join(', ')}), the worker's six beds of grass behind it (${v1.beds && v1.beds.join(' ')})`,
      !!enter && v1.open && v1.tab === 'seeds' && v1.tabs[0] === 'seeds' && v1.tabs.indexOf('beds') < 0 && v1.beds && v1.beds.length === 6 && v1.beds.every((b) => b === 'rough'), v1);
    rec.ok(`v2.3.3136: no beds and no tools in the window (${v1.drawnBeds} beds, ${v1.tools} tools) -- they are worked on your farm -- and "Visit Your Farm" above the tabs`,
      v1.drawnBeds === 0 && v1.tools === 0 && v1.visitFirst, v1);
    rec.ok(`...with a line saying how your beds are doing: "${v1.summary}"`, v1.summary === 'Your farm: 6 beds to plant' && v1.ready === 0, v1.summary);

    /* ── 2. the Seeds tab ── */
    const b0 = await bag();
    await shot(A, 'seeds');
    await tap('[data-farm-buy="seed_carrot"][data-farm-buy-n="5"]');
    let b1 = b0;
    for (let i = 0; i < 30 && !(b1.inv.seed_carrot >= 5); i++) { await A.page.waitForTimeout(200); b1 = await bag(); }
    await A.page.waitForTimeout(300);
    await tap('[data-farm-buy="compost"][data-farm-buy-n="1"]');
    let b2 = b1;
    for (let i = 0; i < 30 && !(b2.inv.compost >= 1); i++) { await A.page.waitForTimeout(200); b2 = await bag(); }
    /* v2.3.3135: the crops still to open sit in one line a level, with no
       buy button -- Cloudpetal among Farming 10's. */
    const shop = await A.page.evaluate(() => ({
      rows: Array.from(document.querySelectorAll('[data-farm-row]')).map((r) => r.getAttribute('data-farm-row')),
      locked: Array.from(document.querySelectorAll('[data-farm-locked]')).map((l) => ({ lvl: Number(l.getAttribute('data-farm-locked')),
        crops: Array.from(l.querySelectorAll('[data-farm-locked-crop]')).map((c) => c.getAttribute('data-farm-locked-crop')) })),
      cloudBuy: !!document.querySelector('[data-farm-buy="seed_cloudpetal"]'),
    }));
    const cloudLocked = shop.locked.some((l) => l.lvl === 10 && l.crops.includes('cloudpetal'));
    const vS = await farmView();
    rec.ok(`the Seeds tab sells 5 carrot seeds for 10 coins and a bag of compost for 4 (${b0.coins} -> ${b2.coins}), the worker's bag says so ("${vS.status}"); Cloudpetal (Farming 10) cannot be bought`,
      b1.inv.seed_carrot === 5 && b2.inv.compost === 1 && b2.coins === b0.coins - 14 && !shop.cloudBuy && cloudLocked, { b0, b2, shop, status: vS.status });
    /* v2.3.3135: sixteen crops -- at Farming 1 it sells the four that open
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
    /* v2.3.3136: each row shows its crop grown (the compost its bin), and so
       does each crop still to open */
    const a3 = await artIn();
    const pics3 = await A.page.evaluate(() => ({
      rows: Array.from(document.querySelectorAll('[data-farm-row]')).map((r) => { const i = r.querySelector('img[data-farm-pic]'); return i ? i.getAttribute('data-farm-pic') : null; }),
      locked: Array.from(document.querySelectorAll('[data-farm-locked-crop]')).map((c) => { const i = c.querySelector('img[data-farm-pic]'); return i ? i.getAttribute('data-farm-pic') : null; }),
    }));
    const wantRowPics = ['carrot-ripe', 'wheat-ripe', 'firebloom-ripe', 'strawberry-ripe', 'compost-bin'];
    const wantLockedPics = wantLocked.flatMap((l) => l.crops.map((c) => c + '-ripe'));
    rec.ok(`v2.3.3136: the Seeds tab draws each crop as the owner drew it grown (${pics3.rows.join(', ')}), the twelve still to open too, every picture in (${a3 && a3.n})`,
      same(pics3.rows, wantRowPics) && same(pics3.locked, wantLockedPics) && a3 && a3.n === 17 && !a3.bad.length, { pics3, a3 });

    /* ── 3. the summary follows the worker's farm.  The beds' own steps on
       the farm send exactly these farm_act messages (game/farmWalk.js); here
       they go straight from the bus, the window open, as mp-farmwalk kneels
       for them one bed at a time. ── */
    const act = async (op, beds, crop) => {
      for (let i = 0; i < 40; i++) {
        const ok = await A.page.evaluate(({ op, beds, crop }) => {
          const S = window._gameState.current, F = window.__btFarm;
          return !F.pending && F.act(S, op, beds, crop);
        }, { op, beds, crop });
        if (ok) break;
        await A.page.waitForTimeout(150);
      }
      return until((v) => !v.pending, 6000);
    };
    await act('dig', [0, 1, 2]);
    await act('plant', [0, 1, 2], 'carrot');
    const v3 = await until((v) => v.beds && v.beds.slice(0, 3).every((b) => b === 'planted:carrot') && /3 growing/.test(v.summary || ''));
    const b3 = await bag();
    await shot(A, 'growing');
    rec.ok(`three beds dug and sown with carrots by the worker (${v3.beds && v3.beds.join(' ')}), two seeds left (${b3.inv.seed_carrot}): "${v3.summary}"`,
      v3.beds && v3.beds.slice(0, 3).every((b) => b === 'planted:carrot') && b3.inv.seed_carrot === 2 && v3.summary === 'Your farm: 3 growing · 3 beds to plant' && v3.ready === 0,
      { beds: v3.beds, summary: v3.summary, inv: b3.inv });
    const p0 = v3.plots[0];
    rec.ok(`a carrot takes 8 minutes dry, on the worker's clock (${Math.round((p0.readyAt - p0.plantedAt) / 60000)} min)`, p0.readyAt - p0.plantedAt === 8 * 60000, p0);

    const rip = await H.devOp(wsPort, 'farmripe', id);
    const v4 = await until((v) => v.ready === 3);
    await shot(A, 'ripe');
    rec.ok(`ripened by the dev op (${rip && rip.ripened}), the line reads "${v4.summary}", in green (${v4.summaryColor})`,
      !!rip && rip.ripened === 3 && v4.summary === 'Your farm: 3 ready to harvest · 3 beds to plant' && v4.ready === 3 && v4.summaryColor === 'rgb(85, 185, 138)', { rip, v4 });

    const f0 = (await bag()).farming || { level: 1, xp: 0 };
    await act('harvest', [0, 1, 2]);
    const v5 = await until((v) => v.beds && v.beds.every((b) => b === 'rough') && v.summary === 'Your farm: 6 beds to plant');
    let b5 = await bag();
    for (let i = 0; i < 20 && b5.inv.crop_carrot !== 6; i++) { await A.page.waitForTimeout(200); b5 = await bag(); }
    const srv = await H.adminPlayer(wsPort, id);
    const srvInv = (srv && srv.rpg && srv.rpg.inventory) || {};
    const xpGain = ((b5.farming && b5.farming.level) > (f0.level || 1)) ? 'levelled' : (b5.farming.xp - (f0.xp || 0));
    rec.ok(`harvested: 6 carrots (2 a bed, none fertilized) and ${xpGain} Farming XP, the worker's own copy of the bag says so (${srvInv.crop_carrot}), and the line is back to "${v5.summary}"`,
      b5.inv.crop_carrot === 6 && srvInv.crop_carrot === 6 && (xpGain === 'levelled' || xpGain > 0) && v5.summary === 'Your farm: 6 beds to plant',
      { inv: b5.inv, farming: b5.farming, srvInv, v5: v5.summary });

    /* ── 4. closed and opened again ── */
    await A.page.evaluate(() => { const b = document.querySelector('.bt-inspect-close'); if (b) b.click(); });
    await A.page.waitForTimeout(600);
    await A.page.evaluate(() => { window.__btFarm.view = null; });   /* forget it here: the window must ask the worker again */
    await A.page.evaluate(() => { const b = Array.from(document.querySelectorAll('button.bt-interact-prompt')).find((q) => /Enter /.test(q.textContent || '')); if (b) b.click(); });
    const v7 = await until((v) => v.open && v.beds && v.beds.length === 6 && v.summary);
    rec.ok(`closed and opened again, the farm is the worker's (${v7.beds && v7.beds.join(' ')}): "${v7.summary}"`,
      v7.beds && v7.beds.every((b) => b === 'rough') && v7.summary === 'Your farm: 6 beds to plant', v7);

    /* ── 9. v2.3.3127: the kill switch.  A tab that joins while `farm: false`
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
        summary: !!document.querySelector('[data-farm-summary]'),
        sends: window.__btFarmSends,
        pending: !!(window.__btFarm && window.__btFarm.pending),
        legacy: /No seeds/.test(document.body.textContent || ''),
      }));
      rec.ok(`switched off (flag set: ${!!(flagOff && flagOff.ok)}, caps.farm ${capsB}), a tab that joins after gets the window CLOSED ("${c.words}"): no tabs, no summary, Visit Your Farm, no old plots, and nothing sent (${c.sends})`,
        !!(flagOff && flagOff.ok) && capsB === false && c.closed && /closed for now/.test(c.words) && c.tabs === 0 && !c.summary && c.visit && !c.legacy && c.sends === 0 && !c.pending, c);
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
