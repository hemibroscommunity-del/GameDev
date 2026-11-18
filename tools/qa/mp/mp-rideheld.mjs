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
 * the ground's worker spent a piece.
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

/* one ring on the board, the ground read every 250 ms of the page's clock */
async function ringOnce(P, G) {
  const pts = ring(G);
  await H.glideTo(P, pts[0][0], pts[0][1], { speed: 2500, timeoutMs: 120000 }).catch(() => {});
  await P.page.waitForTimeout(4000);
  await P.page.evaluate(() => {
    const s = window.__btWorldTrial.stats;
    window.__btRH = { s0: { loads: s.loads, popIns: s.popIns, sumMs: s.sumMs, maxMs: s.maxMs }, n: 0, short: 0, missing: 0, inView: 0, worst: 0, t0: performance.now() };
    window.__btRHi = setInterval(() => {
      const c = window.__btGroundCover && window.__btGroundCover();
      const R = window.__btRH;
      if (!c || !R) return;
      R.n++; R.inView += c.inView; R.missing += c.missing;
      if (c.missing > 0) R.short++;
      if (c.missing > R.worst) R.worst = c.missing;
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
      resident: s.resident, inFlight: s.loading };
  }, offs);
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
    console.log(`  query: ${query || '(as it ships)'}${H.PROFILE ? ', profile ' + H.PROFILE.name : ''}`);
    console.log('  cold ring:', JSON.stringify(cold));
    console.log('  warm ring:', JSON.stringify(warm));
    rec.ok(`the rings laid ground on the board (guard): ${cold.pieces} and ${warm.pieces} pieces, got off ${cold.offs + warm.offs} times`,
      cold.pieces >= 20 && warm.pieces >= 20, { cold, warm });
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}
