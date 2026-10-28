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
 *     v2.3.3310: and the GPU's growth on the third trip leaves out pictures
 *     made BEFORE the second trip ended and drawn for the first time since
 *     (each texture's uid says when its picture was made: __btGpuTex) -- a
 *     body strip loaded behind the loading screen goes up to the graphics chip
 *     the first time it is drawn, a jog to the north-east the fight first
 *     needed on the third trip, and it stays there by design.  That is not
 *     something the trip made, and which trip first draws it is luck: #936
 *     and #937 went red at +4.1/+4.2 on main's own code that way.  The line
 *     says how much was such first draws.  (The other part of those reds was
 *     a real waste, fixed in effectsRenderer: every townsperson's last speech
 *     bubble kept its picture, 1 MB on a 3x phone, while hidden.)
 * The GPU is read twice at every stop: as it is (the budget -- a phone holds
 * what it drew in the last minute too), and as Pixi's own collector leaves it
 * a minute later (`settled`: every texture not drawn in the last 2 s aged 61 s
 * and the collector run -- pixi 8.17 unloads what may be collected after 60 s
 * unused, and uploads it again when drawn); the trip-over-trip check reads
 * the settled figure, which does not depend on when the collector last ran.
 * A failure names the line, what was read, the budget and what to do.
 *
 * The player is untouchable (the worker's dev god mode, 8 min, armed again
 * every 2 s since v2.3.3656: a rejoin makes the worker's player state afresh)
 * so no death trip lands in the middle of a reading, and a Control press every
 * 20 s keeps the idle logout away (as mp-wheeldeep).  Each stop's label names
 * any rejoin, death or reload since the stop before (the game's crash log).
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
/* v2.3.3644: a trip that ends further than this from the fight's spot never
   reached the fight (the fight looks for a monster within 900 px) */
const REACH_PX = 400;
const HOME_MS = 14000;
/* v2.3.3656: how long a stop waits for the Wheel's monster looks to load at
   the fight and to be let go at home (wheelMonsterArt.js, __btWheelArt) */
const LOOKS_MS = 45000;

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

/* the GPU a minute later, as Pixi's collector would leave it (see the header):
   { mb, uidNow, held: [[uid, MB], ...] } -- v2.3.3310: with every texture
   still held and the uid the next picture made would get */
const settledGpu = (P) => P.page.evaluate(() => {
  const R = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
  if (!R || !R.texture || !R.gc || !R.gc.run || !window.__btGpuTex) return null;
  const now = R.gc.now != null ? R.gc.now : performance.now();
  for (const src of R.texture.managedTextures || []) {
    if (src && !src.destroyed && src._gcLastUsed >= 0 && now - src._gcLastUsed > 2000) src._gcLastUsed = now - 61000;
  }
  R.gc.run();
  const g = window.__btGpuTex(100000);
  if (!g || typeof g.mb !== 'number') return null;
  return { mb: g.mb, uidNow: typeof g.uidNow === 'number' ? g.uidNow : null,
    held: (g.list || []).filter((r) => typeof r.uid === 'number').map((r) => [r.uid, r.mb]) };
});

/* v2.3.3310: of what the GPU held at `b` and not at `a`, the MB of pictures
   made before `a` was read -- drawn for the first time since (the header).
   null when either reading lacks the uids (an older build's probe). */
const firstDrawsMB = (a, b) => {
  if (!a || !b || typeof a.uidNow !== 'number' || !Array.isArray(a.held) || !Array.isArray(b.held)) return null;
  const before = new Set(a.held.map(([u]) => u));
  let mb = 0;
  for (const [u, m] of b.held) if (u < a.uidNow && !before.has(u)) mb += m;
  return +mb.toFixed(1);
};

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

/* v2.3.3656: wait until the Wheel's monster looks (__btWheelArt: how many
   ready, how many loading) pass `ok`, at most `ms`; the last reading, or null
   on a build without the probe */
async function waitLooks(P, ok, ms) {
  const t0 = Date.now();
  let a = null;
  while (Date.now() - t0 < ms) {
    a = await P.page.evaluate(() => (window.__btWheelArt ? window.__btWheelArt() : null)).catch(() => null);
    if (!a || ok(a)) return a;
    await P.page.waitForTimeout(500);
  }
  return a;
}

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
  /* v2.3.3656: WHAT HAPPENED BETWEEN TWO STOPS.  The game's own crash log
     (crashTrap recordCrash prints every entry as "[bt-crash] <kind> <why>")
     and any page load after the first: a rejoin ('resume-resync', a thaw past
     5 s; 'dead-pipe'), a death ('died'), a recovery reload ('auto-reload',
     'watchdog-dark', 'canvas-purge').  #1148's first runs read the fight in
     today's town on two trips of three, with nothing to say why. */
  const trail = [];
  let loaded = false;
  P.page.on('console', (m) => {
    const t = m.text();
    if (/^\[bt-crash\]/.test(t)) trail.push({ at: Date.now(), t: t.replace(/^\[bt-crash\]\s*/, '').slice(0, 160) });
  });
  P.page.on('load', () => { if (loaded) trail.push({ at: Date.now(), t: 'page load (a reload)' }); loaded = true; });
  const KINDS = [['rejoin', /^(resume-resync|dead-pipe|connect-stall)\b/], ['death', /^died\b/],
    ['reload', /^(auto-reload|watchdog-dark|canvas-purge)\b|^page load/]];
  let trailFrom = Date.now();
  const trailSince = () => {
    const seen = trail.filter((e) => e.at >= trailFrom);
    trailFrom = Date.now();
    const n = KINDS.map(([k, re]) => [k, seen.filter((e) => re.test(e.t)).length]);
    return { seen: seen.map((e) => e.t), words: n.filter(([, c]) => c).map(([k, c]) => `${c} ${k}${c === 1 ? '' : 's'}`).join(', ') };
  };
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }), (v) => v.zone === 'wheel' && !v.loading,
      { timeout: 90000, label: 'into the Wheel' }).catch(() => null);
    rec.ok(`in the Wheel's BroTown${QUERY ? ` (?${QUERY})` : ''} (guard)`, !!ok, ok);
    if (!ok) return;
    const myId = await H.readState(P, (S) => S.myId);
    /* past the Mayor's gate, as the tour does, and untouchable at the fight */
    /* ═══ v2.3.3644: AND THE GATE STAYS OPEN ═══
       The gate (wheelHome.js wheelCommonsGate) reads the page's own
       `rpg._quests.tut_1`, and the worker's first whole player_state replaces
       `_quests` (wsClient) whenever it lands.  On a quick runner that was
       before the flag was set here; on a slow one it came after, the gate held
       the bro on the commons' edge every trip, the hop's 220 tries ran out (4.5
       minutes a trip), no monster was ever near ("0 swings") and the job ran
       past its 20 minutes (#1130's run 816, #1139's 827; #1136's 820 passed
       that way in 18, measuring the commons and not the fight).  And not only
       the first: on #1140's first run the flag was taken 4 times on the first
       trip and 23 on the second, and the gate turned the bro back 2 and 11
       times before it was put back.  So the WORKER is told the quests are done
       (/dev/quests: every quest handed in, no reward paid -- mp-ghostaudit's
       way), and every echo carries tut_1; the flag is still put back whenever
       one takes it away, for a worker that refused. */
    const finished = await H.devOp(wsPort, 'quests', myId).catch((e) => ({ ok: false, error: String(e && e.message || e) }));
    const handedIn = await H.waitFor(P, (S) => !!(S.rpg && S.rpg._quests && S.rpg._quests.tut_1 === 'turnedIn'), (v) => v,
      { timeout: 10000, label: 'the worker\'s quests, handed in' }).catch(() => false);
    console.log(`    the worker's quests handed in: ${finished && finished.ok ? finished.finished : JSON.stringify(finished)}; the page heard: ${!!handedIn}`);
    await P.page.evaluate(() => {
      const keep = () => {
        const S = window._gameState && window._gameState.current, R = S && S.rpg;
        if (!R) return;
        if (!R._quests || typeof R._quests !== 'object') R._quests = {};
        if (!R._quests.tut_1) { R._quests.tut_1 = true; window.__mbGatePutBack = (window.__mbGatePutBack || 0) + 1; }
      };
      keep();
      window.__mbGatePutBack = 0;
      window.__mbGateOpen = setInterval(keep, 100);
    });
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 8 }).catch(() => null);
    (async () => {
      while (!stopAlive) {
        await P.page.keyboard.press('Control').catch(() => {});
        for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
    /* ═══ v2.3.3656: AND KEPT UNTOUCHABLE THROUGH A REJOIN ═══
       God mode lives on the worker's player state, in memory (devtools.js),
       and a rejoin makes that state afresh.  A runner drawing a 3x phone in
       software freezes the page past 5 s now and then, the game takes that as
       a return and rejoins (wsClient _resumeRecover 'thaw'), and the level-1
       bro, untouchable no more at the Flame Fields, can die there: on #1148's
       first runs the fight's reading was taken in today's town (a respawn's
       way back) on two trips of three, and a 4x slowed run here rejoined once
       on the way in.  So it is armed again every 2 s, and healed; the trail
       above says in each stop's label when a rejoin, death or reload came. */
    (async () => {
      while (!stopAlive) {
        await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 8 }).catch(() => null);
        for (let i = 0; i < 4 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
      }
    })();
    await P.page.waitForTimeout(8000);
    const { sample, workers } = await memSampler(P, browser);
    const take = async (label0) => {
      const tr = trailSince();
      const label = label0 + (tr.words ? ` [${tr.words} since the last stop]` : '');
      const s = await sample(label);
      s.trail = tr.seen;
      s.workers = await workers();
      /* v2.3.3717: what the ground worker was asked (ground-worker.js DIET) */
      s.groundDiet = await P.page.evaluate(() => { const t = window.__btWorldTrial; return t && t.stats ? { diet: t.stats.diet || null, loads: t.stats.loads, maxMs: t.stats.maxMs, sumMs: t.stats.sumMs, popIns: t.stats.popIns, unpacked: t.stats.unpacked } : null; }).catch(() => null);
      const sg = await settledGpu(P);
      s.gpuSettled = sg ? sg.mb : null;
      s.gpuUidNow = sg ? sg.uidNow : null;   /* v2.3.3310: for the first draws (firstDrawsMB) */
      s.gpuHeld = sg ? sg.held : null;
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
      const t0 = Date.now();
      /* v2.3.3656: by the clock (H.glideTo), ~13 s; hopTo's 42 round trips to
         a busy page took 124-134 s on a runner and the job ran out of time.
         Then the stop waits for the monsters' looks to be in, the reading the
         header asks for, however long a runner takes to decode them. */
      await H.glideTo(P, at[0], at[1] + 40);
      const looks = await waitLooks(P, (a) => a.ready > 0 && a.loading === 0, LOOKS_MS);
      /* v2.3.3644: how close the hop came, and the gate's turnings-back */
      const there = await P.page.evaluate((a) => {
        const S = window._gameState.current;
        return { d: Math.round(Math.hypot(S.player.x - a[0], S.player.y - a[1])), gate: S._wheelGateHits || 0, putBack: window.__mbGatePutBack || 0 };
      }, [at[0], at[1] + 40]);
      const hopS = Math.round((Date.now() - t0) / 1000);
      const swings = await fight(P, FIGHT_MS);
      const atFight = await take(`trip ${k}: a fight at the Flame Fields (${swings} swings; ${there.d} px short after ${hopS} s, `
        + `${looks ? looks.ready : '?'} looks in, the gate ${there.gate}, its flag put back ${there.putBack})`);
      atFight.reach = there.d;
      await H.glideTo(P, home.x, home.y);
      await P.page.waitForTimeout(HOME_MS);
      /* v2.3.3656: and home again is once they are let go (the header's stop
         3), not a fixed wait after a trip that now takes a sixth as long */
      await waitLooks(P, (a) => a.ready === 0 && a.loading === 0, LOOKS_MS);
      const back = await take(`trip ${k}: home again`);
      trips.push({ swings, atFight, back });
    }
    /* v2.3.3644: REACHED it -- a trip held on the commons (above) read the
       commons three times and passed, every line measured but the fight's */
    rec.ok(`the trip reached the fight and came home, three times (${trips.map((t) => t.swings).join(', ')} swings; `
      + `${trips.map((t) => t.atFight.reach).join(', ')} px short of the fight's spot, at most ${REACH_PX})`,
      trips.length === 3 && trips.every((t) => t.atFight.zone === 'wheel' && t.back.zone === 'wheel' && t.atFight.reach <= REACH_PX),
      { zones: trips.map((t) => [t.atFight.zone, t.back.zone, t.atFight.reach]),
        trail: trips.map((t) => [t.atFight.trail, t.back.trail]) });

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
    /* v2.3.3310: the GPU's growth less its first draws of pictures made before
       (the header) is what the trip made and kept */
    const gg = grew.find((g) => g.k === 'gpu');
    const fd = firstDrawsMB({ uidNow: a.gpuUidNow, held: a.gpuHeld }, { held: b.gpuHeld });
    if (gg && fd != null) { gg.firstDraws = fd; gg.made = +(gg.d - fd).toFixed(1); }
    out.tripGrowth = grew;
    const leaks = grew.filter((g) => typeof g.second !== 'number' || typeof g.third !== 'number' || !((g.made != null ? g.made : g.d) <= g.may));
    rec.ok(`the third trip ends where the second did (${grew.map((g) => `${g.k}${g.k === 'gpu' ? ' settled' : ''} ${g.d >= 0 ? '+' : ''}${g.d}`
      + (g.firstDraws != null ? ` -- ${g.firstDraws} of it first draws of pictures made before` : '')).join(', ')} MB)`,
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
