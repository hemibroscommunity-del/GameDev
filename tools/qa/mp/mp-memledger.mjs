/* ═══ EVERYTHING THE PAGE HOLDS, NOT ONLY ITS TEXTURES, AND WHAT A TOUR OF THE LANDS LEAVES BEHIND (v2.3.3075) ═══
 *
 * Owner: "Make a plan for how you will optimize game performance
 * (particularly memory usage)" -- docs/MEMORY-PLAN.md.  mp-gpuaudit names the
 * textures; this measures what it cannot see, which turned out to be most of
 * the page: decoded sound (89 MB held in the Wheel's Brotown, the old town's
 * track 40 MB of it), every 2D canvas alive (548 of them, 128 MB), the main
 * thread's ArrayBuffers (the ground's own copy of its pieces), and the
 * workers' heaps.  Then a phone tours the eight lands twice (Brotown -> each
 * land's inner monsters -> Brotown) and asserts the second lap ends where the
 * first did: the asset cache, the canvases and the JS heap.  A lap that ends
 * higher is a leak; mp-soak / mp-zonechurn / mp-texdrift tour only the old
 * lands, which the Wheel closed.
 * Last, a rebuild's crash entry carries what the page held (crashTrap
 * _memWords): minutes up, rebuilds, textures, sound.
 *
 * Each figure is read after a forced GC.  Results print and go to
 * tools/qa/mp/out/memledger.json.  QA_ML_LAPS (default 2), QA_ML_STAY (s at
 * each land, default 6).
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
/* v2.3.3101: the ruler lives in memprobe.mjs, shared with mp-membudget */
import { MEM_INIT, memSampler } from './memprobe.mjs';

const PHONE = { width: 390, height: 844 };
const LAPS = +(process.env.QA_ML_LAPS || 2);
const STAY = +(process.env.QA_ML_STAY || 6);
const LANDS = ['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant'];

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'memledger', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: MEM_INIT });
  const out = { laps: [] };
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!ok, ok);
    if (!ok) return;
    /* the tour walks through monsters; nobody should die of it */
    await P.page.evaluate(() => { const S = window._gameState.current; const R = S.rpg; R._quests = R._quests || {}; R._quests.tut_1 = true; S.player.godMode = true; });
    await P.page.waitForTimeout(8000);
    const { sample, workers } = await memSampler(P, browser);

    /* ── the ledger, on arrival ── */
    const arrival = await sample('arrival');
    arrival.workers = await workers();
    out.arrival = arrival;
    console.log(`    on arrival: ${JSON.stringify(arrival)}`);
    rec.ok(`the ledger on arrival: cache ${arrival.cache} MB, GPU ${arrival.gpu} MB, 2D canvases ${arrival.canvasMB} MB (${arrival.canvasN}), `
      + `sound decoded ${arrival.decodedMB} MB (${arrival.decodedN}; the game's own count ${arrival.soundHeld && arrival.soundHeld.mb}), `
      + `JS heap ${arrival.heapMB} MB + ${arrival.buffersMB} MB of buffers, ${arrival.workers ? arrival.workers.length : '?'} workers`,
    arrival.cache > 0 && arrival.canvasMB > 0 && arrival.heapMB > 0 && !!arrival.soundHeld, arrival);
    /* the game's own sound count (BT_AUDIO.decodedMB, what the crash reports
       carry) agrees with the buffers the page decoded and still holds */
    rec.ok(`BT_AUDIO.decodedMB agrees with the buffers alive: ${arrival.soundHeld && arrival.soundHeld.mb} vs ${arrival.decodedMB} MB`,
      !!arrival.soundHeld && Math.abs(arrival.soundHeld.mb - arrival.decodedMB) <= Math.max(2, arrival.decodedMB * 0.05), { game: arrival.soundHeld, page: arrival.decodedMB });

    /* ── the tour ── */
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const home = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    for (let lap = 1; lap <= LAPS; lap++) {
      for (const land of LANDS) {
        const pt = WHEEL_SPAWNS[land].points[0];
        await H.hopTo(P, pt[0], pt[1] + 40, { tries: 220, step: 140, gap: 200 });
        await P.page.waitForTimeout(STAY * 1000);
      }
      await H.hopTo(P, home.x, home.y, { tries: 220, step: 140, gap: 200 });
      await P.page.waitForTimeout(STAY * 1000 + 6000);
      const s = await sample(`lap ${lap}, back in Brotown`);
      out.laps.push(s);
      console.log(`    ${s.label}: cache ${s.cache} MB, GPU ${s.gpu}, canvases ${s.canvasMB} MB (${s.canvasN}), sound ${s.decodedMB} MB, heap ${s.heapMB} + ${s.buffersMB} MB`);
    }
    if (out.laps.length >= 2) {
      const a = out.laps[0], b = out.laps[out.laps.length - 1], k = out.laps.length - 1;
      rec.ok(`touring the eight lands again leaves the asset cache where the first lap did: ${a.cache} -> ${b.cache} MB`,
        b.cache - a.cache <= 6, { lap1: a.cache, last: b.cache });
      rec.ok(`...and the 2D canvases grow less than 8 MB a lap: ${a.canvasMB} -> ${b.canvasMB} MB over ${k} lap(s)`,
        (b.canvasMB - a.canvasMB) / k <= 8, { lap1: a.canvasMB, last: b.canvasMB });
      rec.ok(`...and the JS heap less than 6 MB a lap: ${a.heapMB} -> ${b.heapMB} MB`,
        (b.heapMB - a.heapMB) / k <= 6, { lap1: a.heapMB, last: b.heapMB });
    }

    /* ── a rebuild's crash entry says what the page held ── */
    await P.page.evaluate(() => window._rebuildRenderer && window._rebuildRenderer('mp-memledger'));
    await P.page.waitForTimeout(3000);
    const entry = await P.page.evaluate(() => {
      try { const log = JSON.parse(localStorage.getItem('bt-crashlog') || '[]'); return log.filter((e) => e.kind === 'gl-rebuild').pop() || null; } catch (e) { return null; }
    });
    out.rebuildEntry = entry;
    rec.ok(`a rebuild's crash entry carries what the page held: "${entry && entry.msg}"`,
      !!entry && /min up, 1 rebuild, [\d.]+ MB of textures, [\d.]+ MB of sound/.test(entry.msg), entry);
  } finally {
    writeFileSync(join(OUT, 'memledger.json'), JSON.stringify(out, null, 1));
    await P.ctx.close().catch(() => {});
  }
}
