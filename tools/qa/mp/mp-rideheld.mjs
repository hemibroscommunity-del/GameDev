/* ═══ THE GROUND AHEAD OF THE BOARD (v2.3.6382, card SB) ═══
 *
 * The owner, 2026-11-18: "I notice 'grainy' feeling when on a skateboard
 * playing on my phone where sometimes it freezes just for tiny fractions of a
 * second while it loads."  mp-heldsweep's `ride` station
 * (docs/plan/census/SB-ride.md) found what the board does that a walk does
 * not: it outruns the ground.  Pieces of ground reach the screen before they
 * are laid, and the overview's plan colours show there until they come
 * (wheelGround.js popIns): 79% of the pieces riding on budget-android, 37% on
 * this box plain.
 *
 * A phone rides mp-heldsweep's ring round BroTown's safe ground on the board,
 * twice (the first round meets the world's art for the first time, the second
 * finds it come), and the ground is read four times a second
 * (__btGroundCover): how much of the view was missing, how often, and what
 * the ground's worker spent a piece, the pieces held and the graphics chip's MB.
 *
 *   node tools/qa/mp/run.mjs rideheld
 *   BT_QA_PROFILE=budget-android node tools/qa/mp/run.mjs rideheld
 *   BT_RH_QUERY=groundsend=0 ...   the same with a page switch thrown
 */
import * as H from './harness.mjs';
export const lane = 'full';

const PHONE = { width: 430, height: 932 };
/* the ring: mp-heldsweep's (RING_K of the safe ground's radius round the Wheel's centre, at the board's speed): the
   radius from the worker's own WHEEL_SAFE_R, never a Wheel distance written here */
const RING_K = 0.75, RING_N = 16, RIDE_PX_S = 300;
let _safeR = null;
const ring = (G) => {
  const RING_R = Math.round(RING_K * _safeR);
  const out = [];
  for (let k = 0; k <= RING_N; k++) {
    const a = Math.PI / 2 + (k / RING_N) * Math.PI * 2;
    out.push([Math.round(G.cx + Math.cos(a) * RING_R), Math.round(G.cy + Math.sin(a) * RING_R)]);
  }
  return out;
};

/* ── the lines (v2.3.6382), this box plain, as it ships; never raised silently ──
   MISSING_MAX  the share of the view's pieces unlaid on the warm ring, on average: 3.1 and 3.4% measured with
                groundsend (17.5 and 19.3% with `?groundsend=0`, the ground as it was);
   HELD_MAX     the most pieces of ground held on the ring: 77 measured (67 and 70 as it was; 86 before the trim
                behind the board) -- the planning session's condition (2026-11-18): a line at the ride's
                measured peak, so it cannot creep;
   GPU_MAX_MB   the graphics chip's total at its highest on the ring: 78.2 and 81.4 measured in two runs (76.9 and
                80.7 as it was: the chip's total moves 2 to 4 MB run to run with the town's other pictures), so
                the line is the higher with that much room.  The game's own peak is
                mp-membudget's tour on foot, 78 to 82 against its 109.3 line: the ride does not raise it. */
const MISSING_MAX = 8, HELD_MAX = 80, GPU_MAX_MB = 84;

/* one ring on the board, the ground read every 250 ms of the page's clock */
async function ringOnce(P, G) {
  const pts = ring(G);
  await H.glideTo(P, pts[0][0], pts[0][1], { speed: 2500, timeoutMs: 120000 }).catch(() => {});
  await P.page.waitForTimeout(4000);
  await P.page.evaluate(() => {
    const s = window.__btWorldTrial.stats;
    window.__btRH = { s0: { loads: s.loads, popIns: s.popIns, sumMs: s.sumMs, maxMs: s.maxMs, dropped: (window.__btGroundCover() || {}).dropped || 0 }, n: 0, short: 0, missing: 0, inView: 0, worst: 0, held: 0, heldMax: 0, gpuMax: 0, under: 0, t0: performance.now() };
    window.__btRHi = setInterval(() => {
      const c = window.__btGroundCover && window.__btGroundCover();
      const R = window.__btRH;
      if (!c || !R) return;
      R.n++; R.inView += c.inView; R.missing += c.missing;
      if (c.missing > 0) R.short++;
      if (c.missing > R.worst) R.worst = c.missing;
      if (c.under) R.under++;   /* v2.3.6383: the overview drawn under the pieces (one missing round the view) */
      /* the memory: the ground's pieces held, and the graphics chip's MB (pixiApp.js __btGpuMb) */
      R.held += c.held; if (c.held > R.heldMax) R.heldMax = c.held;
      const g = window.__btGpuMb ? window.__btGpuMb() : null;
      if (g && g.mb > R.gpuMax) R.gpuMax = g.mb;
    }, 250);
  });
  let offs = 0;
  for (const [x, y] of pts.slice(1)) {
    const on = await P.page.evaluate(() => { const b = window.__btRideBtn && window.__btRideBtn(); return !!(b && b.on); });
    if (!on) {
      offs++;
      await P.page.keyboard.press('z');
      await H.waitFor(P, () => window.__btRideBtn && window.__btRideBtn(), (v) => v && v.on === true, { timeout: 8000, label: 'on the board' }).catch(() => null);
    }
    await H.glideTo(P, x, y, { speed: RIDE_PX_S, timeoutMs: 120000 });
  }
  return P.page.evaluate((offs) => {
    clearInterval(window.__btRHi);
    const R = window.__btRH, s = window.__btWorldTrial.stats, secs = (performance.now() - R.t0) / 1000;
    const loads = s.loads - R.s0.loads, ms = s.sumMs - R.s0.sumMs;
    return { secs: Math.round(secs), offs: offs - 1, pieces: loads, perSec: +(loads / secs).toFixed(2), popIns: s.popIns - R.s0.popIns,
      popPct: loads ? Math.round(100 * (s.popIns - R.s0.popIns) / loads) : null,
      /* the share of the reads with a piece of the view unlaid, and of the view's pieces unlaid on average */
      shortPct: R.n ? Math.round(100 * R.short / R.n) : null, missingPct: R.inView ? +(100 * R.missing / R.inView).toFixed(1) : null, worst: R.worst, reads: R.n,
      /* the ground worker: its ms a piece, and the share of the ring it was laying */
      workerMs: loads ? +(ms / loads).toFixed(1) : null, workerBusyPct: Math.round(100 * ms / 1000 / secs), workerMax: s.maxMs,
      underPct: R.n ? Math.round(100 * R.under / R.n) : null,
      dropped: ((window.__btGroundCover() || {}).dropped || 0) - R.s0.dropped,
      heldMean: R.n ? Math.round(R.held / R.n) : null, heldMax: R.heldMax, gpuMaxMb: +R.gpuMax.toFixed(1), inFlight: s.loading };
  }, offs);
}

/* ── v2.3.6383: A U-TURN (the gatekeeper's sitting 52 on #2253) ──
   On the board the side behind is let go sooner, and up to RIDE_IN_FLIGHT pieces asked for the way it was going sit
   in the worker's line ahead of any new ask.  A straight leg east of UTURN_PX from the ring's first point, then
   straight back the same way at once: the way back read as the ring is (what was unlaid, the overview under it). */
const UTURN_PX = 1500;
async function uTurn(P, G) {
  const [x0, y0] = ring(G)[0];
  await H.glideTo(P, x0, y0, { speed: 2500, timeoutMs: 120000 }).catch(() => {});
  await P.page.waitForTimeout(4000);
  const on = await P.page.evaluate(() => { const b = window.__btRideBtn && window.__btRideBtn(); return !!(b && b.on); });
  if (!on) {
    await P.page.keyboard.press('z');
    await H.waitFor(P, () => window.__btRideBtn && window.__btRideBtn(), (v) => v && v.on === true, { timeout: 8000, label: 'on the board' }).catch(() => null);
  }
  await H.glideTo(P, x0 + UTURN_PX, y0, { speed: RIDE_PX_S, timeoutMs: 120000 });
  await P.page.evaluate(() => {
    const s = window.__btWorldTrial.stats;
    window.__btRH = { s0: { loads: s.loads, popIns: s.popIns, sumMs: s.sumMs, maxMs: s.maxMs, dropped: (window.__btGroundCover() || {}).dropped || 0 }, n: 0, short: 0, missing: 0, inView: 0, worst: 0, held: 0, heldMax: 0, gpuMax: 0, under: 0, t0: performance.now() };
    window.__btRHi = setInterval(() => {
      const c = window.__btGroundCover && window.__btGroundCover();
      const R = window.__btRH;
      if (!c || !R) return;
      R.n++; R.inView += c.inView; R.missing += c.missing;
      if (c.missing > 0) R.short++;
      if (c.missing > R.worst) R.worst = c.missing;
      if (c.under) R.under++;
    }, 250);
  });
  await H.glideTo(P, x0, y0, { speed: RIDE_PX_S, timeoutMs: 120000 });
  return P.page.evaluate(() => {
    clearInterval(window.__btRHi);
    const R = window.__btRH, s = window.__btWorldTrial.stats, secs = (performance.now() - R.t0) / 1000;
    const loads = s.loads - R.s0.loads;
    return { secs: Math.round(secs), pieces: loads, popIns: s.popIns - R.s0.popIns,
      shortPct: R.n ? Math.round(100 * R.short / R.n) : null, missingPct: R.inView ? +(100 * R.missing / R.inView).toFixed(1) : null,
      worst: R.worst, underPct: R.n ? Math.round(100 * R.under / R.n) : null, reads: R.n,
      dropped: ((window.__btGroundCover() || {}).dropped || 0) - R.s0.dropped };
  });
}

/* ── v2.3.6383: STOP AND GO (the gatekeeper's sitting 52 on #2253) ──
   A ride of short pushes with a pause after each, the way a player taps along: the side behind is left and taken
   back as the board slows and starts.  Counts the pieces asked for and let go before they came (`dropped`). */
const GO_PX = 300, GO_N = 8, GO_PAUSE_MS = 700;
async function stopAndGo(P, G) {
  const [x0, y0] = ring(G)[0];
  await H.glideTo(P, x0 - GO_PX * GO_N / 2, y0, { speed: 2500, timeoutMs: 120000 }).catch(() => {});
  await P.page.waitForTimeout(4000);
  const on = await P.page.evaluate(() => { const b = window.__btRideBtn && window.__btRideBtn(); return !!(b && b.on); });
  if (!on) {
    await P.page.keyboard.press('z');
    await H.waitFor(P, () => window.__btRideBtn && window.__btRideBtn(), (v) => v && v.on === true, { timeout: 8000, label: 'on the board' }).catch(() => null);
  }
  const d0 = await P.page.evaluate(() => ({ d: (window.__btGroundCover() || {}).dropped || 0, l: window.__btWorldTrial.stats.loads }));
  for (let k = 1; k <= GO_N; k++) {
    await H.glideTo(P, x0 - GO_PX * GO_N / 2 + GO_PX * k, y0, { speed: RIDE_PX_S, timeoutMs: 60000 });
    await P.page.waitForTimeout(GO_PAUSE_MS);
  }
  const d1 = await P.page.evaluate(() => ({ d: (window.__btGroundCover() || {}).dropped || 0, l: window.__btWorldTrial.stats.loads }));
  return { pieces: d1.l - d0.l, dropped: d1.d - d0.d };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const query = process.env.BT_RH_QUERY || '';
  const P = await H.newPlayer(browser, { name: 'rh', wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1, query });
  const stopAlive = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'into the world' }).then(() => true).catch(() => false);
    rec.ok('in BroTown (guard)', ok);
    if (!ok) return;
    const G = await H.wheelGeom();
    _safeR = (await import(H.REPO + '/server/src/wheelspawns.js')).WHEEL_SAFE_R;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});
    const cold = await ringOnce(P, G);
    const warm = await ringOnce(P, G);
    const turn = await uTurn(P, G);
    const go = await stopAndGo(P, G);
    console.log(`  query: ${query || '(as it ships)'}${H.PROFILE ? ', profile ' + H.PROFILE.name : ''}`);
    console.log('  cold ring:', JSON.stringify(cold));
    console.log('  warm ring:', JSON.stringify(warm));
    console.log('  the way back from a U-turn:', JSON.stringify(turn));
    console.log('  stop and go:', JSON.stringify(go));
    rec.ok(`the rings laid ground on the board (guard): ${cold.pieces} and ${warm.pieces} pieces, got off ${cold.offs + warm.offs} times`,
      cold.pieces >= 20 && warm.pieces >= 20, { cold, warm });
    /* the lines: as it ships, on this box plain (a slowed profile's numbers go to the census, never a line; with
       `?groundsend=0` there is nothing to hold) */
    if (!query && !H.PROFILE) {
      rec.ok(`the ground keeps up with the board: on the warm ring ${warm.missingPct}% of the view's pieces unlaid on average (line ${MISSING_MAX}%; ${warm.popPct}% came on screen before they were laid)`,
        warm.missingPct != null && warm.missingPct <= MISSING_MAX, warm);
      rec.ok(`...and holds no more for it: at most ${warm.heldMax} pieces (line ${HELD_MAX}), the graphics chip ${warm.gpuMaxMb} MB at its highest (line ${GPU_MAX_MB})`,
        warm.heldMax <= HELD_MAX && warm.gpuMaxMb <= GPU_MAX_MB, warm);
    }
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
