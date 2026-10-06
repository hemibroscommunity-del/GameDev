/* ═══ THE MEMORY BUDGET, CHECKED ON EVERY PR (v2.3.3101) ═══
 *
 * Owner, 2026-10-06, after the memory work (docs/MEMORY-PLAN.md) had halved
 * what the page holds: "if I add new features going forward how do I know I
 * won't ruin the memory saving system?" -- and then "Yes all 3": this check on
 * every PR (.github/workflows/memory.yml), the rule in CLAUDE.md (Conventions,
 * "Memory is budgeted"), and the eight-land tour (mp-memledger) on a button.
 *
 * A phone (390 x 844, dpr 3) plays the game as a player gets it, and what the
 * page holds is read (memprobe.mjs, after forced GCs -- the tour's own ruler)
 * at seven stops:
 *   1. BroTown, on arrival;
 *   2. a fight at the Flame Fields' inner end -- where the owner's screen went
 *      black (v2.3.3017) -- the monsters' looks loaded and swings landing;
 *   3. home again, once those looks have been let go (10 s after the last
 *      monster wearing one was within 3,600 px: wheelMonsterArt.js);
 *   4-7. the same trip twice more.
 * Then:
 *   - each kind of memory's HIGHEST reading must be within its line in
 *     tools/qa/mp/memory-budget.mjs;
 *   - the third trip must end where the second did, within TRIP_GROWTH: a
 *     leak grows trip over trip.  Not the first against the second: the first
 *     two trips fill caches that then hold (measured: the GPU's canvases +2.3
 *     MB on the first, +5.1 on the second -- text and hit-chip pages, 1024 x
 *     256 and the like -- and nothing on the third).
 * The GPU is read twice at every stop: as it is (the budget -- a phone holds
 * what it drew in the last minute too), and as Pixi's own collector leaves it
 * a minute later (`settled`: every texture not drawn in the last 2 s aged 61 s
 * and the collector run -- pixi 8.17 unloads what may be collected after 60 s
 * unused, and uploads it again when drawn); the trip-over-trip check reads
 * the settled figure, which does not depend on when the collector last ran.
 * A failure names the line, what was read, the budget and what to do.
 *
 * The player is untouchable (the worker's dev god mode, 8 min) so no death
 * trip lands in the middle of a reading, and a Control press every 20 s keeps
 * the idle logout away (as mp-wheeldeep).
 *
 * Results: tools/qa/mp/out/membudget.json (every stop, the biggest canvases by
 * size, the workers).  QA_MB_QUERY adds a URL switch, to see the check catch a
 * real regression: `gpucopies` keeps the gear strips' and the damage font's
 * canvases (v2.3.3088), ~25 MB -- `canvases` goes red; `musicdecode` decodes
 * the music again (as before v2.3.3073), ~63 MB -- `sound` goes red.
 */
import * as H from './harness.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MEM_INIT, memSampler } from './memprobe.mjs';
import { MEMORY_BUDGET } from './memory-budget.mjs';

const PHONE = { width: 390, height: 844 };
const QUERY = process.env.QA_MB_QUERY || '';
const FIGHT_MS = 10000;
const HOME_MS = 14000;

/* how much the third trip may end above the second, per line, in MB: a
   reading's own noise run to run on one build, well under any leak worth a
   black screen.  Measured over six runs on main (2026-10-06): the GPU
   (settled) +1.0 at most, the heap +0.8, the workers +2.0 (the ground
   builder's heap steps by ~2 MB), every other line +0. */
const TRIP_GROWTH = { artCache: 3, gpu: 4, canvases: 3, sound: 1, heap: 3, buffers: 3, workers: 4 };

/* each line of the budget, read off one stop */
const READ = {
  artCache: (s) => s.cache,
  gpu: (s) => s.gpu,
  canvases: (s) => s.canvasMB,
  sound: (s) => s.decodedMB,
  heap: (s) => s.heapMB,
  buffers: (s) => s.buffersMB,
  workers: (s) => (s.workers && s.workers.length
    ? +s.workers.reduce((a, w) => a + (w.heapMB || 0) + (w.buffersMB || 0), 0).toFixed(1) : null),
};

/* the GPU a minute later, as Pixi's collector would leave it (see the header) */
const settledGpu = (P) => P.page.evaluate(() => {
  const R = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
  if (!R || !R.texture || !R.gc || !R.gc.run || !window.__btGpuTex) return null;
  const now = R.gc.now != null ? R.gc.now : performance.now();
  for (const src of R.texture.managedTextures || []) {
    if (src && !src.destroyed && src._gcLastUsed >= 0 && now - src._gcLastUsed > 2000) src._gcLastUsed = now - 61000;
  }
  R.gc.run();
  const g = window.__btGpuTex(1);
  return g && typeof g.mb === 'number' ? g.mb : null;
});

const WHAT_TO_DO = 'Find what the change holds first: tools/qa/mp/out/membudget.json lists every stop and the biggest canvases by size, '
  + 'mp-gpuaudit names the textures, mp-memledger tours all eight lands.  If the feature really needs the memory, raise THIS line in '
  + 'tools/qa/mp/memory-budget.mjs in the same PR and say in the PR, in plain words, how many MB and why (CLAUDE.md, "Memory is budgeted").';

/* the nearest live monster, and where the player is */
const near = (P) => P.page.evaluate(() => {
  const S = window._gameState.current;
  if (!S || !S.player) return null;
  let m = null, d = Infinity;
  for (const x of S.monsters || []) {
    if (!x || x.alive === false || x.dead) continue;
    const dd = Math.hypot(x.x - S.player.x, x.y - S.player.y);
    if (dd < d) { d = dd; m = { x: x.x, y: x.y, d: dd }; }
  }
  return { px: S.player.x, py: S.player.y, m };
});

/* a finger on an element: touchstart, then touchend (mp-firefight) */
const tapSel = (P, sel, id, fx = 0.5, fy = 0.5) => P.page.evaluate(({ sel, id, fx, fy }) => {
  const el = document.querySelector(sel);
  if (!el) return false;
  const b = el.getBoundingClientRect(), x = b.left + b.width * fx, y = b.top + b.height * fy;
  const mk = (t) => new TouchEvent(t, { bubbles: true, cancelable: true,
    touches: t === 'touchend' ? [] : [new Touch({ identifier: id, target: el, clientX: x, clientY: y })],
    changedTouches: [new Touch({ identifier: id, target: el, clientX: x, clientY: y })] });
  el.dispatchEvent(mk('touchstart'));
  el.dispatchEvent(mk('touchend'));
  return true;
}, { sel, id, fx, fy });

/* hold the keys that walk toward (dx, dy) for ms */
async function stepToward(P, dx, dy, ms) {
  const keys = [];
  if (dy < -12) keys.push('w'); else if (dy > 12) keys.push('s');
  if (dx < -12) keys.push('a'); else if (dx > 12) keys.push('d');
  for (const k of keys) await P.page.keyboard.down(k);
  await P.page.waitForTimeout(ms);
  for (const k of keys) await P.page.keyboard.up(k);
}

/* a short fight: walk to the nearest monster and swing at it */
async function fight(P, ms) {
  const t0 = Date.now();
  let swings = 0;
  while (Date.now() - t0 < ms) {
    const s = await near(P).catch(() => null);
    if (!s || !s.m || s.m.d > 900) { await P.page.waitForTimeout(400); continue; }
    if (s.m.d > 70) await stepToward(P, s.m.x - s.px, s.m.y - s.py, Math.min(450, 60 + s.m.d * 1.2));
    else {
      if (await tapSel(P, '[data-joyzone="R"]', 52, 0.5, 0.4)) swings++;
      await P.page.waitForTimeout(220);
    }
  }
  return swings;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const P = await H.newPlayer(browser, { name: 'membudget', wsPort, webPort, viewport: PHONE, touch: true, dpr: 3, world: 'wheel', init: MEM_INIT, query: QUERY });
  const out = { query: QUERY, budget: MEMORY_BUDGET, stops: [] };
  let stopAlive = false;
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok(`in the Wheel's BroTown${QUERY ? ` (?${QUERY})` : ''} (guard)`, !!ok, ok);
    if (!ok) return;
    const myId = await H.readState(P, (S) => S.myId);
    /* past the Mayor's gate, as the tour does, and untouchable at the fight */
    await P.page.evaluate(() => { const S = window._gameState.current; const R = S.rpg; R._quests = R._quests || {}; R._quests.tut_1 = true; });
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 8 }).catch(() => null);
    (async () => {
      while (!stopAlive) {
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
    await P.page.waitForTimeout(8000);
    const { sample, workers } = await memSampler(P, browser);
    const take = async (label) => {
      const s = await sample(label);
      s.workers = await workers();
      s.gpuSettled = await settledGpu(P);
      out.stops.push(s);
      const row = Object.fromEntries(Object.keys(READ).map((k) => [k, READ[k](s)]));
      console.log(`    ${label}: ${Object.entries(row).map(([k, v]) => `${k} ${v}`).join(', ')} (gpu settled ${s.gpuSettled})`);
      return s;
    };

    /* ── the seven stops ── */
    await take('BroTown, on arrival');
    const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
    const at = WHEEL_SPAWNS.ember.points[0];
    const home = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
    const trips = [];
    for (let k = 1; k <= 3; k++) {
      await H.hopTo(P, at[0], at[1] + 40, { tries: 220, step: 140, gap: 200 });
      const swings = await fight(P, FIGHT_MS);
      const atFight = await take(`trip ${k}: a fight at the Flame Fields (${swings} swings)`);
      await H.hopTo(P, home.x, home.y, { tries: 220, step: 140, gap: 200 });
      await P.page.waitForTimeout(HOME_MS);
      const back = await take(`trip ${k}: home again`);
      trips.push({ swings, atFight, back });
    }
    rec.ok(`the trip reached the fight and came home, three times (${trips.map((t) => t.swings).join(', ')} swings)`,
      trips.length === 3 && trips.every((t) => t.atFight.zone === 'wheel' && t.back.zone === 'wheel'), trips.map((t) => [t.atFight.zone, t.back.zone]));

    /* ── within budget ── */
    const peaks = {};
    for (const k of Object.keys(READ)) {
      const vals = out.stops.map((s) => ({ v: READ[k](s), at: s.label }));
      const bad = vals.filter((x) => typeof x.v !== 'number' || !Number.isFinite(x.v));
      const top = vals.filter((x) => typeof x.v === 'number').sort((a, b) => b.v - a.v)[0] || null;
      peaks[k] = top;
      const line = MEMORY_BUDGET[k];
      if (bad.length || !top) {
        rec.ok(`${k}: read at every stop`, false, { unread: bad.map((x) => x.at) });
        continue;
      }
      rec.ok(`${k} (${line.name}): at most ${top.v} MB (${top.at}), budget ${line.mb} MB`,
        top.v <= line.mb, { line: k, read: top.v, at: top.at, budget: line.mb, over: +(top.v - line.mb).toFixed(1), whatToDo: WHAT_TO_DO });
    }
    out.peaks = peaks;
    console.log('    line        highest   budget   room');
    for (const k of Object.keys(READ)) {
      const p = peaks[k], b = MEMORY_BUDGET[k].mb;
      console.log(`    ${k.padEnd(10)} ${String(p ? p.v : '?').padStart(8)} ${String(b).padStart(8)} ${p ? String(+(b - p.v).toFixed(1)).padStart(6) : ''}`);
    }

    /* ── no leak: the third trip ends where the second did ── */
    const a = trips[1].back, b = trips[2].back;
    const at2 = (k, s) => (k === 'gpu' ? s.gpuSettled : READ[k](s));
    const grew = Object.keys(READ).map((k) => ({ k, second: at2(k, a), third: at2(k, b),
      d: +((at2(k, b) || 0) - (at2(k, a) || 0)).toFixed(1), may: TRIP_GROWTH[k] }));
    out.tripGrowth = grew;
    const leaks = grew.filter((g) => typeof g.second !== 'number' || typeof g.third !== 'number' || !(g.d <= g.may));
    rec.ok(`the third trip ends where the second did (${grew.map((g) => `${g.k}${g.k === 'gpu' ? ' settled' : ''} ${g.d >= 0 ? '+' : ''}${g.d}`).join(', ')} MB)`,
      leaks.length === 0, { leaks, whatToDo: 'Something made on the way out or at the fight is never let go.  mp-memledger tours all eight lands and shows what keeps growing; '
        + 'anything made per zone change, per land or per fight must be destroyed when it goes (CLAUDE.md, "Memory is budgeted").' });

    const pageErrors = P.logs.filter((l) => /pageerror/.test(l));
    rec.ok('no page errors', pageErrors.length === 0, pageErrors.slice(0, 4));
  } finally {
    stopAlive = true;
    writeFileSync(join(OUT, 'membudget.json'), JSON.stringify(out, null, 1));
    await P.ctx.close().catch(() => {});
  }
}
