/* ═══ A STEADY STEP ON A STEADY SCREEN (v2.3.4400) ═══
 *
 * The owner, 2026-11-09, on an iPhone 14 Pro Max in Safari, riding the
 * skateboard through the town with the frame meter on: "it was saying 60fps
 * but the screen looked gritty like it was 30fps or worse" -- at the screen's
 * own resolution, at a lower one and with no buildings: "All 3 were gritty."
 * The meter: 60 frames a second, the frames' lengths "avg 16.7 p95 19.0 max
 * 24.0".  Every frame was shown on time; what wobbled was how far each one
 * moved you (src/game/frameClock.js).
 *
 * This box draws a few frames a second, so it cannot show 60.  It does not
 * need to: the fault is in how the game turns a frame's measured length into
 * a step, and that can be played to it.  A phone page in the world, on the
 * skateboard, riding east; then the page's own clock is replaced by one that
 * says what the owner's phone said -- each frame 16.7 ms after the last, the
 * game's code starting up to 7 ms late (avg 16.7, p95 ~19, max ~24) -- and
 * every frame's step is read back (window.__btStepLog).  Two pages: the game
 * as it ships, and `?dtsmooth=0` (the old way).  Asserted:
 *   - the wobble the game was played is the phone's meter (guard);
 *   - the old way: the ground covered a frame is up to a quarter or more
 *     out, frame to frame (the fault, reproduced);
 *   - as it ships: never more than 6% out, and one frame to the next within
 *     10% of a step;
 *   - both cover the same ground a frame on the whole (nobody is faster).
 *
 *   node tools/qa/mp/run.mjs steadystep
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const F = 1000 / 60;
const FRAMES = 150;           /* frames read, after the first SKIP */
const SKIP = 30;

/* the phone's wobble: the same seeded lengths as server/test/frame-clock.test.mjs */
function wobble(n) {
  let s = 20261109 >>> 0;
  const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const starts = [];
  for (let k = 0; k < n + 1; k++) {
    const u = r();
    const late = u < 0.02 ? 5 + r() * 2.4 : u < 0.12 ? 1.5 + r() * 1.2 : r() * 0.8;
    starts.push(k * F + late);
  }
  const out = [];
  for (let k = 1; k < starts.length; k++) out.push(starts[k] - starts[k - 1]);
  return out;
}
const q = (a, p) => { const v = [...a].sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(v.length * p))]; };

async function ride(browser, wsPort, webPort, rec, label, query, seq) {
  const P = await H.newPlayer(browser, { name: 'step' + (query ? 'old' : 'new'), wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1, query });
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'into the Wheel' }).then(() => true).catch(() => false);
    rec.ok(`${label}: in BroTown (guard)`, ok);
    if (!ok) return null;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 20 }).catch(() => {});
    const G = await H.wheelGeom();
    /* open ground west of the town, a long clear run east along the arrival's row (mp-ridelay's leg) */
    await H.glideTo(P, G.cx - 1700, G.arrival.y, { speed: 4000, timeoutMs: 30000 });
    await P.page.waitForTimeout(2500);
    await P.page.keyboard.press('z');
    const on = await H.waitFor(P, () => window.__btRideBtn && window.__btRideBtn(), (v) => v && v.on === true, { timeout: 8000, label: 'on the board' }).then(() => true).catch(() => false);
    rec.ok(`${label}: on the skateboard (guard)`, on);
    if (!on) return null;
    await P.page.keyboard.down('d');
    await P.page.waitForTimeout(1500);
    /* the page's clock, from here, is the phone's: one scripted length a frame */
    await P.page.evaluate((lens) => {
      const raf = window.requestAnimationFrame.bind(window);
      let fake = performance.now(), i = 0, seen = -1;
      performance.now = () => fake;
      /* one length a FRAME, however many loops ask for the frame (the game's, React's, the minimap's ...): every
         callback of one frame is handed the same real time, so the clock moves on the first of them only */
      window.requestAnimationFrame = (cb) => raf((t) => { if (t !== seen) { seen = t; fake += lens[i++ % lens.length]; } cb(fake); });
      window.__btStepLog = [];
    }, seq);
    const N = 6;   /* the log's numbers a frame: the measured length, the step's, your place (x, y), the camera's (x, y) */
    const got = await H.waitFor(P, () => (window.__btStepLog ? window.__btStepLog.length / 6 : 0), (n) => n >= SKIP + FRAMES + 2, { timeout: 180000, label: 'the frames' }).then(() => true).catch(() => false);
    const log = await P.page.evaluate(() => window.__btStepLog.slice());
    const view = await P.page.evaluate(() => { const S = window._gameState.current; return { sx: S._worldScaleX || 0, dpr: window.devicePixelRatio || 1 }; });
    await P.page.keyboard.up('d');
    rec.ok(`${label}: ${SKIP + FRAMES} frames ridden on the scripted clock (guard)`, got, { frames: log.length / N });
    if (!got) return null;
    const rows = [];
    for (let k = N * (SKIP + 1); k + N - 1 < log.length && rows.length < FRAMES; k += N) {
      rows.push({ raw: log[k], step: log[k + 1], d: Math.hypot(log[k + 2] - log[k + 2 - N], log[k + 3] - log[k + 3 - N]),
        cam: Math.hypot(log[k + 4] - log[k + 4 - N], log[k + 5] - log[k + 5 - N]),
        /* where you stand on the screen: your place less the camera's, in game px */
        onX: log[k + 2] - log[k + 4] });
    }
    rows.view = view;
    return rows;
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

function read(rows) {
  const d = rows.map((r) => r.d), mid = q(d, 0.5);
  let hop = 0;
  for (let i = 1; i < d.length; i++) hop = Math.max(hop, Math.abs(d[i] - d[i - 1]));
  return { frames: rows.length, mid: +mid.toFixed(3), worst: +Math.max(...d.map((v) => Math.abs(v - mid) / mid)).toFixed(3), hop: +(hop / mid).toFixed(3),
    mean: +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(3), rawP95: +q(rows.map((r) => r.raw), 0.95).toFixed(1), rawMax: +Math.max(...rows.map((r) => r.raw)).toFixed(1),
    rawAvg: +(rows.reduce((a, r) => a + r.raw, 0) / rows.length).toFixed(2), moving: d.filter((v) => v > 0.5).length,
    /* the world's slide a frame (the camera's), and how far you wander on the screen while it chases you */
    camMid: +q(rows.map((r) => r.cam), 0.5).toFixed(3), camWorst: +Math.max(...rows.map((r) => Math.abs(r.cam - mid) / mid)).toFixed(3),
    onScreen: +(Math.max(...rows.map((r) => r.onX)) - Math.min(...rows.map((r) => r.onX))).toFixed(2) };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const seq = wobble(600);
  const now = await ride(browser, wsPort, webPort, rec, 'as it ships', '', seq);
  const old = await ride(browser, wsPort, webPort, rec, 'the old way (?dtsmooth=0)', 'dtsmooth=0', seq);
  if (!now || !old) return;
  const a = read(now), b = read(old);
  console.log(`    as it ships: ${JSON.stringify(a)}`);
  console.log(`    the old way: ${JSON.stringify(b)}`);
  rec.ok(`the game was played the phone's wobble -- frame lengths avg ${b.rawAvg}, p95 ${b.rawP95}, max ${b.rawMax} ms (the owner's meter: avg 16.7, p95 18 to 19, max 22 to 24) and rode every frame (guard)`,
    Math.abs(b.rawAvg - F) < 0.3 && b.rawP95 > 17.4 && b.rawMax > 21 && b.rawMax < 25 && b.moving >= FRAMES - 2 && a.moving >= FRAMES - 2, { a, b });
  rec.ok(`the old way: the ground covered a frame is up to ${(b.worst * 100).toFixed(0)}% out, and jumps by ${(b.hop * 100).toFixed(0)}% of a step from one frame to the next (the fault: at least 25% and 40%)`,
    b.worst >= 0.25 && b.hop >= 0.4, b);
  rec.ok(`as it ships: never more than ${(a.worst * 100).toFixed(1)}% out (at most 6%), ${(a.hop * 100).toFixed(1)}% from one frame to the next (at most 10%)`,
    a.worst <= 0.06 && a.hop <= 0.1, a);
  rec.ok(`both cover the same ground a frame on the whole -- ${a.mean} and ${b.mean} game px (within 3%: nobody is faster)`, Math.abs(a.mean - b.mean) / b.mean <= 0.03, { a: a.mean, b: b.mean });
}
