/* ═══ THE WORLD LAID AHEAD OF THE SKATEBOARD (v2.3.3843) ═══
 *
 * The owner, 2026-10-29, on a computer: "the world still looks unbuilt on the
 * edges when I'm on the skateboard. I think you haven't compensated for the
 * speed of the skateboard yet in what to load from the world around you on
 * the edges."  The board rolls at RIDE_MULT (2.0) times a walk, on BroTown's
 * safe ground only (game/ride.js).
 *
 * On a computer (1440 x 900, the wide layout), in BroTown: a straight leg
 * east across the town and its commons, first at a walk and then at the
 * board's speed.  The speeds are
 * the game's own, measured first on the computer (D held, then Z and D held:
 * a real ride), and the ride's leg is on the board (Z).  Counted a frame at a time (TRAPS §200):
 *   - frames where a ground piece in view (and 48 px past it) was not laid
 *     yet, so the small overview showed under it (wheelStats.under);
 *   - ground pieces that came on screen before they were laid (popIns);
 *   - buildings, trees and rocks whose picture came on screen before their
 *     sprite sheet (the objects' lateDraws);
 *   - the most pieces held, and their MB (the extra a ride holds).
 * Asserted: riding shows the overview under at most RIDE_UNDER_MAX of its
 * frames, lays no piece and no object late on screen.  Walking is printed
 * beside it (main, the same box: a walk 2.7% under, a ride 3.7%).
 *
 *   node tools/qa/mp/run.mjs ridelay
 */
import * as H from './harness.mjs';

const DESK = { width: 1440, height: 900 };
const SAFE = 2000;               /* how far from the centre a leg runs: well inside the safe ground (zones.js wheel.safeR 2937; at 2600 the board stepped off before the leg's end) */
const RIDE_UNDER_MAX = 0.015;    /* of a ride's frames, the overview showing under a missing piece (main: 3.7%) */

/* the counters, a frame at a time: the game's own loop draws on the
   browser's animation frame, one draw a frame (TRAPS §200: frames, not a
   60 fps window) */
const arm = (P) => P.page.evaluate(() => {
  const W = window.__btWorldTrial;
  if (!W) return false;
  if (window.__rl) window.__rl.stop = true;
  const c = { frames: 0, under: 0, maxRes: 0, stop: false };
  const f = () => { if (c.stop) return; c.frames++; if (W.stats.under) c.under++; if (W.stats.resident > c.maxRes) c.maxRes = W.stats.resident; requestAnimationFrame(f); };
  requestAnimationFrame(f);
  window.__rl = c;
  return true;
});
const read = (P) => P.page.evaluate(() => {
  const W = window.__btWorldTrial, c = window.__rl || {};
  const o = W.objects();
  return { frames: c.frames, under: c.under, maxRes: c.maxRes, popIns: W.stats.popIns, late: o.lateDraws, loads: W.stats.loads,
    sumMs: W.stats.sumMs, resident: W.stats.resident, pieceBytes: W.stats.pieceBytes || 0, pages: o.pages, pagesMb: o.mb };
});

/* a leg: to its start, still a while, then across at `speed` game px a second */
async function leg(P, from, to, speed, board) {
  await H.glideTo(P, from.x, from.y, { speed: 4000, timeoutMs: 20000 });
  /* settle: every piece round the start laid */
  await H.waitFor(P, () => { const s = window.__btWorldTrial.stats; return { u: s.under, l: s.loading }; }, (v) => !v.u && v.l === 0,
    { timeout: 30000, label: 'the ground laid at the start' }).catch(() => null);
  await P.page.waitForTimeout(1500);
  /* on the board for a ride (Z, the worker's word): the ground lays further
     ahead of the board itself, not of a speed */
  let on = null;
  if (board) {
    await P.page.keyboard.press('z');
    on = await H.waitFor(P, () => window.__btRideBtn && window.__btRideBtn(), (v) => v && v.on === true, { timeout: 5000, label: 'on the board' }).then(() => true).catch(() => false);
  }
  const a = await read(P);
  await arm(P);
  await H.glideTo(P, to.x, to.y, { speed, timeoutMs: 60000 });
  const b = await read(P);
  const still = board ? await P.page.evaluate(() => { const r = window._gameState.current._ride; return r && r.on ? true : 'off: ' + (r && r.why); }) : null;
  if (board) {
    await P.page.keyboard.press('z');
    await H.waitFor(P, () => window.__btRideBtn && window.__btRideBtn(), (v) => v && v.on === false, { timeout: 5000, label: 'off the board' }).catch(() => null);
  }
  return { board: on, rodeToTheEnd: still, frames: b.frames, under: b.under, share: b.frames ? b.under / b.frames : 0, popIns: b.popIns - a.popIns, late: b.late - a.late,
    pieceMs: b.loads > a.loads ? Math.round((b.sumMs - a.sumMs) / (b.loads - a.loads)) : null, laid: b.loads - a.loads,
    view: await P.page.evaluate(() => { const S = window._gameState.current; return S._viewW ? [Math.round(S._viewW), Math.round(S._viewH)] : null; }),
    maxRes: b.maxRes, mb: Math.round(b.maxRes * (b.pieceBytes || 0) / 1e5) / 10, pages: b.pages, pagesMb: b.pagesMb };
}

async function device(browser, wsPort, webPort, rec, label, opts, G, speeds) {
  const P = await H.newPlayer(browser, { name: label, wsPort, webPort, world: 'wheel', ...opts });
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l,
      { timeout: 120000, label: 'into the Wheel' }).then(() => true).catch(() => false);
    rec.ok(`${label}: in BroTown (guard)`, ok);
    if (!ok) return null;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 30 }).catch(() => {});

    /* the speeds, the game's own: measured on the computer, D held */
    if (!speeds.walk) {
      await H.glideTo(P, G.cx - 1200, G.arrival.y, { speed: 4000, timeoutMs: 20000 });
      await P.page.waitForTimeout(1500);
      /* the game's own pace: the step a frame over the frame's own time
         (S._dtScale, 1 at 60 fps, capped at 3 -- the step is the speed
         times it, so the ratio is the speed) -- this box draws a few frames
         a second, so the clock alone reads a slow walk */
      const pace = async () => {
        await P.page.keyboard.down('d');
        await P.page.waitForTimeout(500);
        const v = await P.page.evaluate(() => new Promise((res) => {
          const S = window._gameState.current;
          let x = S.player.x, sumDx = 0, sumK = 0, n = 0;
          const f = () => {
            const k = S._dtScale || 1, nx = S.player.x;
            if (n > 0) { sumDx += nx - x; sumK += k; }
            x = nx; n++;
            if (n < 40) requestAnimationFrame(f); else res(Math.round(sumDx / Math.max(1e-6, sumK) * 60));
          };
          requestAnimationFrame(f);
        }));
        await P.page.keyboard.up('d');
        return { v };
      };
      const w = await pace();
      await P.page.keyboard.press('z');
      const on = await H.waitFor(P, () => window.__btRideBtn && window.__btRideBtn(), (v) => v && v.on === true, { timeout: 5000, label: 'on the board' }).then(() => true).catch(() => false);
      await P.page.waitForTimeout(400);
      await H.glideTo(P, G.cx - 1200, G.arrival.y, { speed: 4000, timeoutMs: 20000 });
      await P.page.waitForTimeout(800);
      const r = await pace();
      await P.page.keyboard.press('z');
      await H.waitFor(P, () => window.__btRideBtn && window.__btRideBtn(), (v) => v && v.on === false, { timeout: 5000, label: 'off the board' }).catch(() => null);
      speeds.walk = w.v; speeds.ride = r.v;
      rec.ok(`${label}: the game's own speeds -- a walk ${w.v} game px a second, the board ${r.v} (on the board: ${on})`,
        on && w.v > 60 && r.v > w.v * 1.5, { w, r });
    }

    /* v2.3.3843: one leg, east across the town and its commons (scaled down
       for the owner's usage: the computer, whose wide view lays the most
       pieces an edge, is where the owner saw it) */
    const legs = [
      ['east', { x: G.cx - SAFE, y: G.arrival.y }, { x: G.cx + SAFE, y: G.arrival.y }],
    ];
    const out = {};
    for (const [way, from, to] of legs) {
      for (const [how, v] of [['walking', speeds.walk], ['riding', speeds.ride]]) {
        const m = await leg(P, from, to, v, how === 'riding');
        out[way + ' ' + how] = m;
        console.log(`    ${label} ${way} ${how} at ${v}/s: ${m.frames} frames, the overview under ${m.under} (${(m.share * 100).toFixed(1)}%), `
          + `${m.popIns} pieces late on screen, ${m.late} objects late, ${m.laid} laid at ${m.pieceMs} ms each, view ${m.view}, up to ${m.maxRes} pieces (${m.mb} MB), ${m.pages} pages (${m.pagesMb} MB)`);
        /* v2.3.3843: one assertion, the ride (main: the overview under 3.7%
           of a ride's frames); walking is printed beside it, unchanged */
        if (how === 'riding') {
          rec.ok(`${label}: riding ${way}, the ground in view is laid ahead of the board -- the overview showed under ${m.under} of ${m.frames} frames (${(m.share * 100).toFixed(1)}%, at most ${RIDE_UNDER_MAX * 100}%; main 3.7%), ${m.popIns} pieces came on screen unlaid, ${m.late} objects late`,
            m.board === true && m.rodeToTheEnd === true && m.frames > 20 && m.share <= RIDE_UNDER_MAX && m.popIns === 0 && m.late === 0, m);
        }
      }
    }
    const extra = out['east riding'].mb - out['east walking'].mb;
    console.log(`    ${label}: riding holds up to ${extra.toFixed(1)} MB more ground than walking`);
    return out;
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const G = await H.wheelGeom();
  const speeds = {};
  await device(browser, wsPort, webPort, rec, 'computer', { viewport: DESK, wide: true }, G, speeds);
}
