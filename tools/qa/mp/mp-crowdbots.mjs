/* ═══ v2.3.3208: WHAT A BIG CROWD COSTS THE PHONE ═══
 *
 * The owner, 2026-10-13: "I want to see how many players I can fit while
 * appearing to be in the same world. Hopefully 1000 while just as smooth is
 * possible."  A server split can carry the crowd; the PHONE still has to draw
 * it.  mp-crowd (v2.3.1973) asks the same question with real browsers as the
 * peers, so it stops at a handful.  This one stands ONE phone page in the
 * Wheel's BroTown and walks the load test's own bots round it
 * (tools/qa/load/bots.mjs: guests that join, go down to the Wheel and walk
 * like a phone, `walkR` keeping them on the phone's screen), adding them in
 * steps up to the room's cap.  At each step, for ~10 s:
 *
 *   - the game's own frame cost (perfTracker: workMs, the time inside the
 *     game's frame; entityMs, the entities' share), p50 and p95;
 *   - the page's whole main-thread time a second (CDP Performance metrics:
 *     TaskDuration and ScriptDuration over the window) -- the frames AND the
 *     socket's messages, which perfTracker does not see;
 *   - the peers the page knows and the ones within its screen's reach.
 *
 * READ THE GROWTH, NOT THE ABSOLUTE.  This box draws in software and runs the
 * bots and the worker beside the page, so a phone's own numbers are not
 * these; the cost per extra player against the empty town is what carries
 * over (mp-crowd's rule).  docs/SERVER-SPLIT-PLAN.md reads it.
 *
 *   BT_NO_TRACE=1 node tools/qa/mp/run.mjs crowdbots     # steps 0,25,50,80,110
 *   BT_NO_TRACE=1 BT_CROWD_STEPS=0,40,80 node tools/qa/mp/run.mjs crowdbots
 *
 * BT_NO_TRACE=1 (harness.mjs startWorker): without it wrangler's own local
 * tracing makes every message ~5x dearer (TRAPS §168) and the local room stops
 * letting bots in at about 95 players.  BT_MAX_PLAYERS=N runs a copy of the
 * server with that cap, for steps past 119 bots (v2.3.3240).  The bots send a
 * real phone's 2 s look (`track`) unless BT_CROWD_TRACK=0.
 *
 * v2.3.3241: BT_CROWD_QUERY adds to the page's address (`nopeercull`: every
 * other player drawn wherever they stand, as before; `crowd=K`: the crowd cap
 * at K, `crowd=all` none), and each row says how many players the renderer
 * left undrawn far off screen (`farHidden`) and past the cap (`crowdHidden`).
 *
 * v2.3.3378: BT_CROWD_LOOK (JSON) is what the bots wear over the sampled look
 * -- iron plate, greaves and sword put three shining pieces of metal a bot on
 * the phone's screen -- and each row says how many the shine drew
 * (`shine`: drawn in the pass, in passes of their own).
 */
import * as H from './harness.mjs';
import { fork } from 'node:child_process';
import { join } from 'node:path';

const ROOM = 'crowdbots';
const VIEW = { width: 390, height: 844 };
const STEPS = (process.env.BT_CROWD_STEPS || '0,25,50,80,110').split(',').map(Number).filter((n) => n >= 0);
const SAMPLE_MS = Number(process.env.BT_CROWD_SAMPLE_MS || 10000);
/* the bots' circle round the square: 420 keeps them on the phone's screen;
   BT_CROWD_WALKR=2400 spreads them over the town and commons, most of them
   off it (v2.3.3240) */
const WALK_R = Number(process.env.BT_CROWD_WALKR || 420);
const HOMES = ['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant'];

/* the bots in GROUPS processes (load.mjs's way): one Node process holding
   110 sockets left a third of them stuck connecting */
const GROUPS = 3;
function startBots(wsPort) {
  const tot = { closes: {}, rejects: {}, roomFull: 0, errors: 0 };
  const groups = [];
  for (let i = 0; i < GROUPS; i++) {
    const child = fork(join(H.REPO, 'tools', 'qa', 'load', 'bots.mjs'), [], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
    const g = { child, last: null };
    /* each report is one second's; the refusals and closes are added up */
    child.on('message', (m) => {
      if (!m || m.type !== 'report') return;
      g.last = m.data;
      for (const k of ['closes', 'rejects']) for (const [c, n] of Object.entries(m.data[k] || {})) tot[k][c] = (tot[k][c] || 0) + n;
      tot.roomFull += m.data.roomFull || 0; tot.errors += m.data.errors || 0;
    });
    child.send({ cmd: 'config', cfg: {
      url: `ws://127.0.0.1:${wsPort}/ws?room=${ROOM}&rf=1`, wireUrl: null, fighters: 0, homes: HOMES, tag: String.fromCharCode(99 + i),
      idle: false, walkR: WALK_R,
      /* v2.3.3240: each bot sends a real phone's 2 s look, as players do
         (bots.mjs --track), so the phone hears the worker's relays too */
      track: process.env.BT_CROWD_TRACK !== '0',
      /* v2.3.3378: BT_CROWD_LOOK, JSON merged into that look -- e.g.
         '{"eqc":"ironplate","eql":"irongreaves","wpnType":"sword","wpnMat":"iron"}'
         dresses every bot in iron, each piece a shine on the phone's screen */
      look: process.env.BT_CROWD_LOOK ? JSON.parse(process.env.BT_CROWD_LOOK) : null,
    } });
    groups.push(g);
  }
  return {
    add: (n) => {
      const per = groups.map(() => 0);
      for (let i = 0; i < n; i++) per[i % GROUPS]++;
      groups.forEach((g, i) => { if (per[i]) g.child.send({ cmd: 'add', n: per[i], spreadMs: Math.max(1000, per[i] * 120) }); });
    },
    states: () => {
      const s = {};
      for (const g of groups) for (const [k, v] of Object.entries((g.last && g.last.states) || {})) s[k] = (s[k] || 0) + v;
      return s;
    },
    totals: () => tot,
    stop: () => {
      for (const g of groups) {
        try { g.child.send({ cmd: 'stop' }); } catch { /* gone */ }
        setTimeout(() => { try { g.child.kill('SIGKILL'); } catch { /* gone */ } }, 1500);
      }
    },
  };
}

const q = (arr, p) => {
  if (!arr.length) return 0;
  const v = [...arr].sort((a, b) => a - b);
  return +v[Math.min(v.length - 1, Math.floor(v.length * p))].toFixed(2);
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Watcher', wsPort, webPort, world: 'wheel', viewport: VIEW, touch: true, query: 'room=' + ROOM + (process.env.BT_CROWD_QUERY ? '&' + process.env.BT_CROWD_QUERY : '') });
  await H.enterWorld(P);
  let inWheel = false;
  for (let i = 0; i < 120 && !inWheel; i++) {
    inWheel = (await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone))) === 'wheel';
    if (!inWheel) await P.page.waitForTimeout(500);
  }
  rec.ok('the watcher is in the Wheel\'s BroTown', inWheel);
  if (!inWheel) return;

  /* the QA keep-alive key (CLAUDE.md: Shift is the sprint, so Control) */
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();

  const cdp = await P.page.context().newCDPSession(P.page);
  await cdp.send('Performance.enable');
  const metrics = async () => {
    const r = await cdp.send('Performance.getMetrics');
    const o = {};
    for (const m of r.metrics) o[m.name] = m.value;
    return o;
  };

  const bots = startBots(wsPort);
  const rows = [];
  let have = 0;
  try {
    for (const want of STEPS) {
      if (want > have) { bots.add(want - have); have = want; }
      /* wait until the page knows (nearly) all of them */
      const t0 = Date.now();
      let known = 0;
      while (Date.now() - t0 < 60000) {
        known = await H.readState(P, (S) => Object.keys(S.others || {}).length);
        if (known >= Math.floor(want * 0.95)) break;
        await P.page.waitForTimeout(1000);
      }
      await P.page.waitForTimeout(4000);
      await P.page.evaluate(() => {
        window.perfTracker && window.perfTracker.reset();
        /* v2.3.3378: the render-target switches a frame (a phone's graphics
           chip sets the whole frame aside at each), counted on the context */
        const gl = window._pixiRenderer && window._pixiRenderer.app.renderer.gl;
        if (gl && !gl.__bfWrapped) {
          const bind = gl.bindFramebuffer.bind(gl);
          gl.bindFramebuffer = (t, f) => { window.__bfCount = (window.__bfCount || 0) + 1; return bind(t, f); };
          gl.__bfWrapped = true;
        }
        window.__bfCount = 0;
      });
      const m0 = await metrics();
      const w0 = Date.now();
      await P.page.waitForTimeout(SAMPLE_MS);
      const m1 = await metrics();
      const wall = (Date.now() - w0) / 1000;
      /* BT_CROWD_PROFILE=<dir>: a CPU profile of the page for 6 s at each
         step, to see what each extra player costs a frame */
      if (process.env.BT_CROWD_PROFILE) {
        await cdp.send('Profiler.enable');
        await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
        await cdp.send('Profiler.start');
        await P.page.waitForTimeout(6000);
        const { profile } = await cdp.send('Profiler.stop');
        const { writeFileSync, mkdirSync } = await import('node:fs');
        mkdirSync(process.env.BT_CROWD_PROFILE, { recursive: true });
        writeFileSync(join(process.env.BT_CROWD_PROFILE, `page-${want}.cpuprofile`), JSON.stringify(profile));
      }
      const r = await P.page.evaluate(() => {
        const S = window._gameState.current;
        const a = (window.perfTracker && window.perfTracker.getSamples && window.perfTracker.getSamples()) || [];
        const me = S.player || {};
        let near = 0;
        for (const id in (S.others || {})) {
          const o = S.others[id];
          if (o && Math.abs(o.x - me.x) < 340 && Math.abs(o.y - me.y) < 700) near++;
        }
        const lf = window.__btLightFx && window.__btLightFx.probe ? window.__btLightFx.probe() : null;
        const g = lf && lf.glint;
        return {
          known: Object.keys(S.others || {}).length, near, farHidden: S._peersFarHidden || 0, crowdHidden: S._peersCrowdHidden || 0,
          work: a.map((s) => s.workMs || 0), entity: a.map((s) => s.entityMs || 0),
          /* v2.3.3378: the metal shine this frame -- pieces drawn in the pass
             (`batched`) and in passes of their own (`lit`, a filter each) */
          shine: g ? { targets: g.targets, lit: g.lit, batched: g.batched || 0 } : null,
          switches: window.__bfCount || 0,
        };
      });
      const row = {
        bots: want, known: r.known, onScreen: r.near, farHidden: r.farHidden, crowdHidden: r.crowdHidden, frames: r.work.length,
        workP50: q(r.work, 0.5), workP95: q(r.work, 0.95),
        entityP50: q(r.entity, 0.5), entityP95: q(r.entity, 0.95),
        taskMsPerS: +(((m1.TaskDuration - m0.TaskDuration) * 1000) / wall).toFixed(1),
        scriptMsPerS: +(((m1.ScriptDuration - m0.ScriptDuration) * 1000) / wall).toFixed(1),
        heapMB: +((m1.JSHeapUsedSize || 0) / 1048576).toFixed(1),
        shine: r.shine,
        targetSwitchesPerFrame: r.work.length ? +(r.switches / r.work.length).toFixed(1) : null,
      };
      rows.push(row);
      console.log('  crowdbots', JSON.stringify(row), 'bots:', JSON.stringify(bots.states()), JSON.stringify(bots.totals()));
    }
  } finally {
    stopAlive = true;
    bots.stop();
  }

  console.log('\n  bots | known | on screen | frames | work ms p50/p95 | entity ms p50/p95 | main thread ms/s | script ms/s | heap MB');
  for (const r of rows) {
    console.log(`  ${String(r.bots).padStart(4)} | ${String(r.known).padStart(5)} | ${String(r.onScreen).padStart(9)} | ${String(r.frames).padStart(6)} | ${String(r.workP50).padStart(6)} / ${String(r.workP95).padStart(6)} | ${String(r.entityP50).padStart(6)} / ${String(r.entityP95).padStart(6)} | ${String(r.taskMsPerS).padStart(16)} | ${String(r.scriptMsPerS).padStart(11)} | ${r.heapMB}`);
  }
  const top = rows[rows.length - 1];
  rec.ok('the watcher saw the crowd at the last step (95% of the bots known)', top && top.known >= Math.floor(top.bots * 0.95), top);
  rec.ok('frames were sampled at every step', rows.every((r) => r.frames > 0), rows.map((r) => r.frames));
  rec.ok('no page errors', !P.logs.some((l) => /pageerror/.test(l)), P.logs.slice(-5));
}
