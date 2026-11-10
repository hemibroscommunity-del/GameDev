/* ═══ A STEADY RATE ON A SCREEN THE GAME CANNOT KEEP UP WITH (v2.3.4395) ═══
 *
 * The owner's iPhone 14 Pro Max, Safari offering the page the screen's own
 * 120 a second, twenty-four minutes into a session: "Still performance
 * issues", the frame meter reading "fps ~51  frame avg 19.6 p95 26.0 max
 * 32.0 ms".  The phone no longer finished a frame inside one refresh, nor
 * always inside two: frames were on the glass for two refreshes, three, two,
 * four.  The steady step (mp-steadystep) moves you the same distance every
 * frame; shown for unequal times that is an unequal speed on the glass.
 * game/framePacer.js draws on a whole number of refreshes the device can
 * keep to instead (server/test/frame-pacer.test.mjs holds the rule).
 *
 * This box draws a few frames a second, so the phone's screen is SCRIPTED,
 * as mp-steadystep scripts its clock: the page's clock moves one refresh of
 * a 120 screen for every call the browser makes, and after a frame the game
 * DREW, by that frame's scripted cost rounded up to whole refreshes (65% of
 * frames inside two, 30% three, 5% four: the owner's meter).  A phone rides
 * the skateboard east on that screen, twice: as it ships, and `?pace=0`
 * (every refresh the browser offers, as before).  Asserted:
 *   - the old way: the frames are the phone's uneven mix, and the speed on
 *     the glass (the ground a frame covers over the time it is shown) is 25%
 *     or more out for one frame in ten (the fault);
 *   - as it ships: the pacer finds a 120 screen and draws every third
 *     refresh; nine frames in ten are the same 25 ms, and the speed on the
 *     glass is within 6% for nine in ten;
 *   - both cover the same ground a second (nobody is faster or slower).
 *
 *   node tools/qa/mp/run.mjs steadypace
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };
const B = 1000 / 120;
const SETTLE = 380;           /* drawn frames standing still while the pacer settles: two verdicts of 80 a step, two steps, and some */
const LEAD = 40;              /* ...then the ride's first frames (up to speed, the steady step's mean full) */
const FRAMES = 150;           /* ...and the frames read: about 1100 game px of the 1700 of open ground */

/* the owner's hot phone, the same seeded costs as server/test/frame-pacer.test.mjs */
function costs(n) {
  let s = 20261110 >>> 0;
  const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const out = [];
  for (let i = 0; i < n; i++) { const u = r(); out.push(u < 0.65 ? 9 + r() * 7 : u < 0.95 ? 17.2 + r() * 7 : 25.5 + r() * 7); }
  return out;
}
const q = (a, p) => { const v = [...a].sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(v.length * p))]; };

async function ride(browser, wsPort, webPort, rec, label, query, seq) {
  const P = await H.newPlayer(browser, { name: 'pace' + (query ? 'old' : 'new'), wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1, query });
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'into the Wheel' }).then(() => true).catch(() => false);
    rec.ok(`${label}: in BroTown (guard)`, ok);
    if (!ok) return null;
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 20 }).catch(() => {});
    const G = await H.wheelGeom();
    /* open ground west of the town, a long clear run east along the arrival's row (mp-steadystep's leg) */
    await H.glideTo(P, G.cx - 1700, G.arrival.y, { speed: 4000, timeoutMs: 30000 });
    await P.page.waitForTimeout(2500);
    await P.page.keyboard.press('z');
    const on = await H.waitFor(P, () => window.__btRideBtn && window.__btRideBtn(), (v) => v && v.on === true, { timeout: 8000, label: 'on the board' }).then(() => true).catch(() => false);
    rec.ok(`${label}: on the skateboard (guard)`, on);
    if (!on) return null;
    /* the phone's screen, from here: a refresh a call, and a drawn frame's cost before the next */
    await P.page.evaluate(({ b, seqIn }) => {
      const raf = window.requestAnimationFrame.bind(window);
      let fake = performance.now(), i = 0, seen = -1, count = -1;
      performance.now = () => fake;
      /* one move of the clock a FRAME of this box, however many loops ask for the frame (mp-steadystep) */
      window.requestAnimationFrame = (cb) => raf((t) => {
        if (t !== seen) {
          seen = t;
          const S = window._gameState && window._gameState.current;
          const n = S ? (S._frameCount | 0) : 0;
          const drew = n !== count;
          count = n;
          fake += drew ? Math.max(1, Math.ceil(seqIn[i++ % seqIn.length] / b - 1e-9)) * b : b;
        }
        cb(fake);
      });
      window.__btStepLog = [];
    }, { b: B, seqIn: seq });
    const N = 6;
    const frames = () => (window.__btStepLog ? window.__btStepLog.length / 6 : 0);
    /* standing while the pacer makes up its mind (the game draws all the same), then the ride */
    const settled = await H.waitFor(P, frames, (n) => n >= SETTLE, { timeout: 420000, label: 'the settling frames' }).then(() => true).catch(() => false);
    const from = await P.page.evaluate(() => window.__btStepLog.length / 6);
    await P.page.keyboard.down('d');
    const got = settled && await H.waitFor(P, frames, (n) => n >= from + LEAD + FRAMES + 2, { timeout: 300000, label: 'the ride\'s frames' }).then(() => true).catch(() => false);
    const log = await P.page.evaluate(() => window.__btStepLog.slice());
    const pace = await P.page.evaluate(() => (window.__btPace ? window.__btPace() : null));
    await P.page.keyboard.up('d');
    rec.ok(`${label}: ${SETTLE} frames standing and ${LEAD + FRAMES} ridden on the scripted screen (guard)`, got, { frames: log.length / N });
    if (!got) return null;
    const rows = [];
    for (let k = N * (from + LEAD); k + 2 * N - 1 < log.length && rows.length < FRAMES; k += N) {
      /* the ground this frame covered, and how long it was on the glass: until the NEXT frame was drawn */
      rows.push({ raw: log[k], d: Math.hypot(log[k + 2] - log[k + 2 - N], log[k + 3] - log[k + 3 - N]), shown: log[k + N] });
    }
    rows.pace = pace;
    return rows;
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

function read(rows) {
  const shown = rows.map((r) => r.shown);
  const share = (v) => shown.filter((x) => Math.abs(x - v) <= 0.6).length / shown.length;
  const glass = rows.map((r) => r.d / r.shown);   /* game px a ms, as the eye follows it */
  const mid = q(glass, 0.5);
  const out = glass.map((v) => Math.abs(v - mid) / mid);
  return { frames: rows.length, two: +share(2 * B).toFixed(2), three: +share(3 * B).toFixed(2), four: +share(4 * B).toFixed(2),
    avg: +(shown.reduce((a, b) => a + b, 0) / shown.length).toFixed(1), moving: rows.filter((r) => r.d > 0.5).length,
    outP90: +q(out, 0.9).toFixed(3), outMax: +Math.max(...out).toFixed(3),
    /* the ground a second, on the whole */
    speed: +(1000 * rows.reduce((a, r) => a + r.d, 0) / shown.reduce((a, b) => a + b, 0)).toFixed(1) };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const seq = costs(1200);
  const now = await ride(browser, wsPort, webPort, rec, 'as it ships', '', seq);
  const old = await ride(browser, wsPort, webPort, rec, 'the old way (?pace=0)', 'pace=0', seq);
  if (!now || !old) return;
  const a = read(now), b = read(old);
  console.log(`    as it ships: ${JSON.stringify(a)}  the pacer ${JSON.stringify(now.pace)}`);
  console.log(`    the old way: ${JSON.stringify(b)}  the pacer ${JSON.stringify(old.pace)}`);
  rec.ok(`the game was played the owner's phone -- frames on the glass for two refreshes ${(b.two * 100).toFixed(0)}%, three ${(b.three * 100).toFixed(0)}%, four ${(b.four * 100).toFixed(0)}%, avg ${b.avg} ms (the meter: 19.6) -- and rode every frame (guard)`,
    b.two > 0.5 && b.two < 0.8 && b.three > 0.15 && Math.abs(b.avg - 19.6) < 1.6 && b.moving >= FRAMES - 2 && a.moving >= FRAMES - 2 && old.pace === null, { a, b });
  rec.ok(`the old way: the speed on the glass is ${(b.outP90 * 100).toFixed(0)}% out for one frame in ten, ${(b.outMax * 100).toFixed(0)}% at worst (the fault: at least 25%)`, b.outP90 >= 0.25, b);
  rec.ok(`as it ships: the pacer reads a ${now.pace && now.pace.hz} screen and draws every ${now.pace && now.pace.every} refreshes (${now.pace && now.pace.rate} a second)`,
    !!now.pace && now.pace.hz === 120 && now.pace.every === 3 && now.pace.rate === 40, now.pace);
  rec.ok(`as it ships: ${(a.three * 100).toFixed(0)}% of frames are on the glass the same 25 ms (at least 90%; ${(b.three * 100).toFixed(0)}% before)`, a.three >= 0.9, a);
  rec.ok(`as it ships: the speed on the glass is within ${(a.outP90 * 100).toFixed(1)}% for nine frames in ten (at most 6%; ${(b.outP90 * 100).toFixed(0)}% before)`, a.outP90 <= 0.06, a);
  rec.ok(`both cover the same ground a second -- ${a.speed} and ${b.speed} game px (within 3%: nobody is faster)`, Math.abs(a.speed - b.speed) / b.speed <= 0.03, { a: a.speed, b: b.speed });
}
