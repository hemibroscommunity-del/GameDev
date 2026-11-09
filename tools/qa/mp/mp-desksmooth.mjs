/* ═══ A COMPUTER'S WORLD, WHOLE AND SMOOTH (v2.3.4355) ═══
 *
 * The owner, of the expo of 2026-11-05, where the judges played on computers
 * while live-streaming: "The game was not smooth, and patches of texture like
 * a checker pattern showed all round the outer ring of the view, away from my
 * character"; and of the same day, "on a computer the map loads in pieces
 * (many squares not drawn); phones are fine".  And, asking for this file: "so
 * a computer's smoothness at a short laptop, 1920x1080 and a large monitor,
 * with and without the throttle, is a number a later PR can break."
 *
 * WHAT THE PATCHES WERE (all three reproduced here before they were fixed):
 *   - a computer that had never opened the game, on a slow line: the ground's
 *     pictures (0.35 MB each) had not come when their ground was laid, and a
 *     piece laid without one drew the Ground Studio's "not made yet" chequer
 *     (ground-worker.js, A SLOW LINE);
 *   - downloads cut at 15 s and begun again from nothing on that line;
 *   - a slowed processor: the zone gate let go at a flat 15 s with the first
 *     screen's ground still being laid, the missing pieces on the outer ring
 *     (game/zoneGate.js).
 * mp-ridelay already times ONE computer (1440 x 900) on the skateboard; this
 * closes the gap: three computers, and the two conditions that made the
 * patches.
 *
 * THE PARTS
 *   1. a short laptop (1366 x 657), 1920 x 1080 and a large monitor
 *      (2560 x 1440), each `wide: true` and `lookpalette=0` (Windows and a Mac
 *      draw looks the old way: game/lookPaletteChoice.js), on a quiet box:
 *        - at the loading screen's lift every piece of ground in view is laid
 *          and none is short of a picture;
 *        - standing 4 s, then a walk east across the town at a walk's speed:
 *          no piece comes on screen unlaid, the overview shows under a missing
 *          piece in at most UNDER_MAX of the walk's frames, no piece is short;
 *        - the game's own work a frame (perfTracker's workMs: the whole frame
 *          callback, the game and Pixi's drawing calls), its middle frame
 *          standing and walking, under LINES below.
 *   2. 1920 x 1080 with the page's processor slowed THROTTLE times (Chromium's
 *      own throttle: the stand-in for a stream's encoder): the same, the
 *      frame's line scaled; the gate must hold until the ground is laid.
 *   3. 1920 x 1080 on a thin line (H.slowLine: the ground's pictures down one
 *      shared 150 KB a second, a first visit): the loading screen waits for
 *      the town's pictures while they are still coming and lifts on ground
 *      wholly drawn (the owner's "Go recommended", 2026-11-09), no download
 *      is cut or failed, and the walk after it lays no piece short (the
 *      pictures were fetched ahead).
 *   4. 1920 x 1080 slowed AND on a line that says nothing for 6 s: the way in
 *      does not wait for a line gone quiet (3 s without a byte) and lays the
 *      town plain; the pictures then come while the loading screen is still
 *      up -- that ground is laid again once the screen lifts, whole within
 *      WHOLE_MS (found by the review of this change: 8 of 50 pieces stayed
 *      plain a minute after the lift).
 *
 * READ THE FRAME'S NUMBERS AS A LINE, NOT AS A COMPUTER'S.  This box draws in
 * software, a few frames a second (TRAPS §200), so nothing here is a frame
 * rate.  What carries over is what the main thread does a frame, and that is
 * what the lines hold: a change that doubles the game's work a frame on a
 * wide view fails here.  A real graphics chip's own faults cannot be seen on
 * this box at all: the Test panel's Speed test, run on the computer, is how
 * those are captured (docs/STATE-MACHINES.md, item A).
 *
 * THE SAMPLE, AND THE FULL RUN (CLAUDE.md §6).  This is the sample: about 7
 * minutes.  BT_DS_FULL=1 adds the throttle at the other two sizes and a
 * thinner line (60 KB a second): about 30 minutes.
 *
 *   node tools/qa/mp/run.mjs desksmooth
 *   BT_DS_SIZES=1920x1080 ...     # only these windows
 *   BT_DS_PARTS=quiet,slowline    # only these parts (quiet, throttle, both, slowline)
 *   BT_DS_SHOTS=1                 # pictures into tools/qa/mp/out/
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';

const OUT = new URL('./out/', import.meta.url).pathname;
const ALL = [{ width: 1366, height: 657, name: 'short laptop' }, { width: 1920, height: 1080, name: '1920x1080' }, { width: 2560, height: 1440, name: 'large monitor' }];
const SIZES = process.env.BT_DS_SIZES
  ? process.env.BT_DS_SIZES.split(',').map((s) => { const [w, h] = s.split('x').map(Number); return ALL.find((a) => a.width === w && a.height === h) || { width: w, height: h, name: s }; })
  : ALL;
const PARTS = (process.env.BT_DS_PARTS || 'quiet,throttle,both,slowline').split(',').map((s) => s.trim());
const FULL = process.env.BT_DS_FULL === '1';
const SHOTS = process.env.BT_DS_SHOTS === '1';
const THROTTLE = 4;

/* ── THE LINES ──────────────────────────────────────────────────────────
   Never raise one silently: say in the PR body by how much and why, as the
   memory check's lines are kept (tools/qa/mp/memory-budget.mjs).
   The frame: the middle frame's work in ms on THIS box, quiet (x THROTTLE
   when the page is slowed).  Measured 2026-11-09 with this change. */
const LINES = {
  UNDER_MAX: 0.05,        /* of a walk's frames, the overview showing under a missing piece (quiet: 0 measured) */
  UNDER_MAX_SLOWED: 0.15, /* ...with the page slowed (0 measured) */
  WHOLE_MS: 30000,        /* the town whole this long after the lift (thin line: it lifts whole, 0.2 s measured; the quiet line: 10 s) */
  P95_TIMES: 3,           /* 19 frames in 20 within this many times the middle frame's line (2.0 to 2.1 times measured) */
};
/* per window: [standing, walking] the middle frame's work, ms, quiet.
   Measured (standing / walking): 1366x657 4.0 / 4.7, 1920x1080 4.2 / 6.0,
   2560x1440 5.0 / 5.8; slowed x4 at 1920x1080 20.9 / 26.4.  Every computer
   sees the same 1.13 million game px of world (game/viewCap.js), so the
   three do the same work and share one line: about twice what was measured,
   so a change that doubles the game's work on a wide view fails. */
const WORK_LINES = { '1366x657': [9, 12], '1920x1080': [9, 12], '2560x1440': [9, 12] };

const q = (arr, p) => { if (!arr.length) return 0; const v = [...arr].sort((a, b) => a - b); return +v[Math.min(v.length - 1, Math.floor(v.length * p))].toFixed(1); };

const cover = (P) => P.page.evaluate(() => (window.__btGroundCover ? window.__btGroundCover() : null));
const stats = (P) => P.page.evaluate(() => {
  const W = window.__btWorldTrial, s = W && W.stats;
  return s ? { loads: s.loads, sumMs: s.sumMs, popIns: s.popIns, partial: s.partial, relaid: s.relaid, mended: s.mended, failures: s.failures,
    dlFails: s.dlFails, dl: s.dl, diet: s.diet, entryMs: s.entryMs, late: W.objects().lateDraws } : null;
});

/* a frame at a time (the game draws once an animation frame: TRAPS §200) */
const arm = (P) => P.page.evaluate(() => {
  if (window.__ds) window.__ds.stop = true;
  const c = { frames: 0, under: 0, missSum: 0, viewSum: 0, maxMiss: 0, maxShort: 0, stop: false };
  const f = () => {
    if (c.stop) return;
    const g = window.__btGroundCover && window.__btGroundCover();
    if (g) { c.frames++; if (g.under) c.under++; c.missSum += g.missing; c.viewSum += g.inView; if (g.missing > c.maxMiss) c.maxMiss = g.missing; if (g.short > c.maxShort) c.maxShort = g.short; }
    requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
  window.__ds = c;
  if (window.perfTracker && window.perfTracker.reset) window.perfTracker.reset();
  return true;
});
const disarm = (P) => P.page.evaluate(() => {
  const c = window.__ds; c.stop = true;
  const a = (window.perfTracker && window.perfTracker.getSamples && window.perfTracker.getSamples()) || [];
  return { c, work: a.map((s) => s.workMs || 0), sim: a.map((s) => s.simMs || 0), app: a.map((s) => s.appMs || 0),
    stage: a.map((s) => (s.tileMs || 0) + (s.entityMs || 0) + (s.effectsMs || 0)) };
});

/* until every piece in view is laid whole: ms, or null past `limit` */
async function untilWhole(P, limit = 120000) {
  const t0 = Date.now();
  let g = null;
  while (Date.now() - t0 < limit) {
    g = await cover(P);
    if (g && g.missing === 0 && !g.under && g.short === 0) return { ms: Date.now() - t0, g };
    await P.page.waitForTimeout(100);
  }
  return { ms: null, g };
}

async function measure(P, drive) {
  const a = await stats(P);
  await arm(P);
  await drive();
  const r = await disarm(P);
  const b = await stats(P);
  return { frames: r.c.frames, underShare: r.c.frames ? +(r.c.under / r.c.frames).toFixed(3) : 0, missShare: r.c.viewSum ? +(r.c.missSum / r.c.viewSum).toFixed(4) : 0,
    maxMiss: r.c.maxMiss, maxShort: r.c.maxShort, popIns: b.popIns - a.popIns, late: b.late - a.late, partial: b.partial - a.partial, laid: b.loads - a.loads,
    pieceMs: b.loads > a.loads ? Math.round((b.sumMs - a.sumMs) / (b.loads - a.loads)) : null,
    work: { p50: q(r.work, 0.5), p95: q(r.work, 0.95) }, sim: q(r.sim, 0.5), stage: q(r.stage, 0.5), app: q(r.app, 0.5) };
}

async function device(browser, wsPort, webPort, rec, vp, G, how) {
  const tag = `${vp.width}x${vp.height}`;
  const label = `${vp.name === tag ? tag : vp.name + ' ' + tag}${how.throttle ? `, page slowed x${how.throttle}` : ''}${how.slow ? `, thin line ${how.slow}` : ''}`;
  if (how.slow) H.slowLine(how.slow);
  const P = await H.newPlayer(browser, { name: 'ds' + vp.width + (how.throttle ? 't' : how.slow ? 's' : ''), wsPort, webPort, world: 'wheel', wide: true,
    viewport: { width: vp.width, height: vp.height }, query: 'lookpalette=0' });
  try {
    /* the stand-in for a stream's encoder: Chromium's own processor throttle,
       on this page (the harness's BT_QA_CPU_THROTTLE slows every scenario's
       pages; this slows one part's) */
    if (how.throttle && !(Number(process.env.BT_QA_CPU_THROTTLE) > 1)) {
      const cdp = await P.ctx.newCDPSession(P.page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: how.throttle });
    }
    /* the way in, watched from its first frame: what is laid at the lift */
    const t0 = Date.now();
    const enter = H.enterWorld(P, 240000).catch((e) => ({ err: String(e) }));
    let first = null, gateMs = null;
    for (;;) {
      const v = await P.page.evaluate(() => {
        const S = window._gameState && window._gameState.current, W = window.__btWorldTrial;
        return S ? { z: S.currentZone, l: !!S._zoneLoading, lt: S._zoneLoading ? Date.now() - S._zoneLoading.t : null,
          g: window.__btGroundCover ? window.__btGroundCover() : null, entry: W && W.stats ? W.stats.entryMs : null, loads: W && W.stats ? W.stats.loads : null } : null;
      }).catch(() => null);
      if (v && v.l && v.lt != null) gateMs = v.lt;
      if (v && v.z === 'wheel' && !v.l && v.g) { first = Object.assign(v.g, { done: v.entry != null, loads: v.loads, gateMs }); break; }
      if (Date.now() - t0 > 300000) break;
      await P.page.waitForTimeout(50);
    }
    await enter;
    rec.ok(`${label}: in BroTown (guard)`, !!first, { waited: Date.now() - t0 });
    if (!first) return null;
    if (SHOTS) { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: `${OUT}desksmooth-${tag}${how.throttle ? '-slowed' : how.slow ? '-thin' : ''}-lift.png` }).catch(() => {}); }
    console.log(`    ${label}: the view ${first.view[0]} x ${first.view[1]} game px, ${first.cols} x ${first.rows} = ${first.inView} pieces; at the lift ${first.missing} missing (${first.far} on the outer ring), `
      + `${first.short} short of a picture; the gate held ${first.gateMs} ms, the way in ${first.done ? 'finished' : 'NOT finished'} (${first.loads} pieces laid by then)`);

    if (how.slow && how.throttle) {
      /* ── part 4: slowed AND on a thin line -- the pictures come while the
         loading screen is still up, after their ground was laid without them ── */
      const w = await untilWhole(P, 60000);
      const s0 = await stats(P);
      console.log(`      at the lift ${first.short} short of ${first.inView}; whole ${w.ms} ms after it; ${s0.partial} laid short on the way in, ${s0.relaid} laid again, ${s0.mended} whole; cut ${s0.dl && s0.dl.cuts}, failed ${s0.dlFails}; the gate's pieces waited ${s0.dl && s0.dl.gateWaitMs} ms`);
      /* the line says nothing for 6 s: the worker stops waiting after 3 s without a byte and lays the town plain, as
         it must on a dead line -- then the pictures come, with the loading screen still up */
      rec.ok(`${label}: on a line gone quiet the way in does not wait for it -- ${s0.partial} pieces laid in plain colour behind the loading screen, after ${s0.dl && s0.dl.gateWaitMs} ms of waiting (3 s without a byte, and half a second a late picture: at most 9 s) (guard)`,
        s0.partial > 0 && !!s0.dl && s0.dl.gateWaitMs >= 2500 && s0.dl.gateWaitMs <= 9000, { partial: s0.partial, dl: s0.dl });
      rec.ok(`${label}: ground laid without a picture behind the loading screen is laid again once the screen lifts -- ${first.short} short at the lift, whole ${w.ms} ms after it (at most ${LINES.WHOLE_MS}; `
        + `before, a picture that came while the screen was still up was never heard of again, and its ground stayed plain until you walked away)`,
        first.missing === 0 && w.ms != null && w.ms <= LINES.WHOLE_MS, { first, ms: w.ms, last: w.g, partial: s0.partial, relaid: s0.relaid });
      return { label, first, wholeMs: w.ms };
    }
    if (how.slow) {
      /* ── part 3: a first visit on a thin line ── */
      /* the owner's "Go recommended" (2026-11-09): the loading screen waits for the town's pictures while they are
         still coming, so a slow first visit arrives in a town already drawn (how.plainOk: a line too thin for that) */
      rec.ok(`${label}: the loading screen waits for the town's pictures and lifts on ground wholly drawn -- ${first.missing} missing, ${first.short} short of a picture, of ${first.inView} (the gate held ${first.gateMs} ms; `
        + `before, it lifted at 12 s on 38 to 50 pieces in plain colour)`, first.missing === 0 && first.done && (how.plainOk || first.short === 0), first);
      const w = await untilWhole(P, 120000);
      const s0 = await stats(P);
      console.log(`      whole ${w.ms} ms after the lift; ${s0.partial} pieces laid short on the way in, ${s0.relaid} laid again, ${s0.mended} whole; downloads cut ${s0.dl && s0.dl.cuts}, failed ${s0.dlFails}; the gate's pieces waited ${s0.dl && s0.dl.gateWaitMs} ms for pictures`);
      rec.ok(`${label}: the town is whole ${w.ms} ms after the lift (at most ${LINES.WHOLE_MS}; main: 12.5 s at this line with the same pictures, 85 s at 60 KB a second)`,
        w.ms != null && w.ms <= LINES.WHOLE_MS, { ms: w.ms, last: w.g });
      rec.ok(`${label}: no download was cut off or failed (cut ${s0.dl && s0.dl.cuts}, failed ${s0.dlFails}; main cut 14 at 60 KB a second and began each again from nothing)`,
        !!s0.dl && s0.dl.cuts === 0 && s0.dlFails === 0, { dl: s0.dl, dlFails: s0.dlFails });
      rec.ok(`${label}: the gate's pieces shared one wait for their pictures, while they were still coming (${s0.dl && s0.dl.gateWaitMs} ms, at most 30 s and half a second a late picture; ${s0.dl && Math.round(s0.dl.bytes / 1024)} KB came)`,
        !!s0.dl && s0.dl.gateWaitMs > 0 && s0.dl.gateWaitMs <= 34000 && s0.dl.bytes > 0, s0.dl);
      /* the walk out of town: its pictures were fetched ahead while you stood */
      const me = await H.readState(P, (S) => S.myId);
      await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
      await P.page.waitForTimeout(how.settle || 20000);   /* a player reads the welcome and looks round: the quiet downloads run */
      const walk = await measure(P, () => H.glideTo(P, G.cx + 1500, G.arrival.y, { speed: 150, timeoutMs: 120000 }));
      const s1 = await stats(P);
      console.log(`      a walk east out of town after ${(how.settle || 20000) / 1000} s standing: ${JSON.stringify(walk)}; fetched ahead ${s1.dl && s1.dl.far} pictures in ${s1.dl && s1.dl.farRuns} looks`);
      rec.ok(`${label}: pictures were fetched ahead of the walk (${s1.dl && s1.dl.far}), and the walk laid ${walk.partial} pieces short of a picture, ${walk.maxShort} in view at once (main laid 25 short on this line)`,
        !!s1.dl && s1.dl.far > 0 && walk.partial <= 2 && walk.maxShort <= 2, { walk, dl: s1.dl });
      return { label, first, wholeMs: w.ms, walk };
    }

    /* ── parts 1 and 2 ── */
    rec.ok(`${label}: the loading screen lifts on ground wholly laid -- ${first.missing} of ${first.inView} pieces missing, ${first.short} short (the gate held ${first.gateMs} ms${how.throttle ? '; the flat 15 s let go with 14 missing, 11 on the outer ring' : ''})`,
      first.missing === 0 && first.short === 0 && first.done, first);
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
    await H.glideTo(P, G.cx - 900, G.arrival.y, { speed: 4000, timeoutMs: 30000 });
    await untilWhole(P, 60000);
    await P.page.waitForTimeout(1500);
    const stand = await measure(P, () => P.page.waitForTimeout(how.throttle ? 8000 : 5000));
    const walk = await measure(P, () => H.glideTo(P, G.cx + 900, G.arrival.y, { speed: 150, timeoutMs: 120000 }));
    console.log(`      standing: ${JSON.stringify(stand)}`);
    console.log(`      walking east: ${JSON.stringify(walk)}`);
    const underMax = how.throttle ? LINES.UNDER_MAX_SLOWED : LINES.UNDER_MAX;
    rec.ok(`${label}: on a walk across the town no ground comes on screen unlaid -- ${walk.popIns} pieces late, the overview under ${(walk.underShare * 100).toFixed(1)}% of ${walk.frames} frames (at most ${underMax * 100}%), `
      + `${walk.maxShort} short, ${walk.late} objects late`, walk.frames > 10 && walk.popIns === 0 && walk.underShare <= underMax && walk.maxShort === 0 && walk.late === 0, walk);
    const wl = WORK_LINES[tag];
    if (wl && wl[0] > 0) {
      const k = how.throttle || 1;
      rec.ok(`${label}: the game's work a frame, its middle frame -- standing ${stand.work.p50} ms (at most ${wl[0] * k}), walking ${walk.work.p50} ms (at most ${wl[1] * k})`,
        stand.frames > 5 && stand.work.p50 > 0 && stand.work.p50 <= wl[0] * k && walk.work.p50 <= wl[1] * k, { stand: stand.work, walk: walk.work });
      rec.ok(`${label}: ...and 19 frames in 20 -- standing ${stand.work.p95} ms (at most ${wl[0] * k * LINES.P95_TIMES}), walking ${walk.work.p95} ms (at most ${wl[1] * k * LINES.P95_TIMES})`,
        stand.work.p95 <= wl[0] * k * LINES.P95_TIMES && walk.work.p95 <= wl[1] * k * LINES.P95_TIMES, { stand: stand.work, walk: walk.work });
    } else {
      console.log(`      (no line for ${tag}: the work a frame is printed, not judged)`);
    }
    return { label, first, stand, walk };
  } finally {
    if (how.slow) H.slowLine(null);
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const G = await H.wheelGeom();
  const mid = SIZES.find((s) => s.width === 1920) || SIZES[0];
  const out = [];
  if (PARTS.includes('quiet')) for (const vp of SIZES) out.push(await device(browser, wsPort, webPort, rec, vp, G, {}));
  if (PARTS.includes('throttle')) for (const vp of FULL ? SIZES : [mid]) out.push(await device(browser, wsPort, webPort, rec, vp, G, { throttle: THROTTLE }));
  /* part 4: the page slowed, and a line that says nothing for 6 s and then is quick (BT_DS_BOTH_LINE: another line) */
  if (PARTS.includes('both')) out.push(await device(browser, wsPort, webPort, rec, mid, G, { throttle: THROTTLE, slow: process.env.BT_DS_BOTH_LINE || '/world/ground/:600:6000' }));
  if (PARTS.includes('slowline')) {
    out.push(await device(browser, wsPort, webPort, rec, mid, G, { slow: '/world/ground/:150:200' }));
    if (FULL) {
      /* a thinner line: only that nothing is cut and it ends whole (2.4 MB at 60 KB a second is 41 s) */
      const keep = LINES.WHOLE_MS;
      LINES.WHOLE_MS = 60000;
      try { out.push(await device(browser, wsPort, webPort, rec, mid, G, { slow: '/world/ground/:60:200', settle: 45000, plainOk: true })); } finally { LINES.WHOLE_MS = keep; }
    }
  }
  console.log('\n    the table (work a frame in ms, this box):');
  for (const o of out) if (o && o.stand) console.log(`      ${o.label.padEnd(44)} view ${o.first.view.join(' x ').padEnd(11)} ${String(o.first.inView).padStart(3)} pieces   standing p50 ${String(o.stand.work.p50).padStart(6)} p95 ${String(o.stand.work.p95).padStart(6)}   walking p50 ${String(o.walk.work.p50).padStart(6)} p95 ${String(o.walk.work.p95).padStart(6)}   under ${(o.walk.underShare * 100).toFixed(1)}%`);
}
