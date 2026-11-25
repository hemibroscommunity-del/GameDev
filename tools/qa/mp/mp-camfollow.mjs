/* ═══ THE VIEW FOLLOWS THE BRO, NOT HIS SPEED (v2.3.6660, card GR part 2) ═══
 *
 * The owner, 2026-11-24, on an iPhone 14 Pro, every Speed test row at 60:
 * "a bit subtly rubber bandy while on skateboard ... I suspect it has to do
 * with the camera view".  Card GR's census (M5) measured it: the view chased
 * a point ahead of the bro and trailed his speed, so each push from a stand
 * slid him ~30 device px forward on the screen and each roll-off ~45 back.
 * src/game/cameraFollow.js moves the view by his step, then closes the gap:
 * he sits at one place whatever his speed.
 *
 * The owner's shape: a 430 x 775 page at 3x, touch, BroTown (`world:
 * 'wheel'`), on the skateboard on open ground west of the town.  This box
 * draws about a frame a second at 3x, so the page's clock is replaced by one
 * that gives every frame 16.667 ms (mp-steadystep's way; TRAPS §200): the
 * game plays a steady 60 and each frame's state is read back
 * (window.__btStepLog: the bro's place and the camera's).  The ride: stood
 * (the view settled), `d` held 100 frames (the board pushes off from a stand
 * to top speed), let go (it rolls off to a stop), stood again.  Asserted:
 *   - the ride happened: top speed reached, the board stopped (guard);
 *   - as it ships: the bro's offset from the screen's middle within 2 device
 *     px of where he stood, EVERY frame;
 *   - `?camfollow=0` (the old chase), the same ride: he slides 20 device px
 *     or more (the fault, reproduced: the check catches it).
 *
 *   node tools/qa/mp/run.mjs camfollow
 */
import * as H from './harness.mjs';
export const lane = 'full';

const PHONE = { width: 430, height: 775 };
const STOOD = 10, HELD = 100, ROLLED = 150;   /* frames */
const N = 6;   /* the log's numbers a frame: the measured length, the step's, your place (x, y), the camera's (x, y) */

async function rideOnce(browser, wsPort, webPort, rec, label, query, name) {
  const P = await H.newPlayer(browser, { name, wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 3, query });
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
    await P.page.keyboard.press('z');
    const on = await H.waitFor(P, () => window.__btRideBtn && window.__btRideBtn(), (v) => v && v.on === true, { timeout: 8000, label: 'on the board' }).then(() => true).catch(() => false);
    rec.ok(`${label}: on the skateboard (guard)`, on);
    if (!on) return null;
    /* the page's clock, from here: 16.667 ms a frame, however long the box takes to draw it */
    await P.page.evaluate(() => {
      const raf = window.requestAnimationFrame.bind(window);
      let fake = performance.now(), seen = -1;
      performance.now = () => fake;
      window.requestAnimationFrame = (cb) => raf((t) => { if (t !== seen) { seen = t; fake += 1000 / 60; } cb(fake); });
      window.__btStepLog = [];
    });
    const frames = () => (window.__btStepLog ? window.__btStepLog.length / 6 : 0);
    /* stood until the view has settled on you (the chase: 8% a frame) */
    const settled = await H.waitFor(P, () => {
      const L = window.__btStepLog || [], n = L.length / 6;
      if (n < 12) return null;
      let d = 0;
      for (let k = n - 10; k < n; k++) d = Math.max(d, Math.abs((L[k * 6 + 2] - L[k * 6 + 4]) - (L[(k - 1) * 6 + 2] - L[(k - 1) * 6 + 4])), Math.abs((L[k * 6 + 3] - L[k * 6 + 5]) - (L[(k - 1) * 6 + 3] - L[(k - 1) * 6 + 5])));
      return { n, d };
    }, (v) => v && v.d < 0.005, { timeout: 600000, label: 'the view settled' }).catch(() => null);
    rec.ok(`${label}: stood, the view settled on the bro (guard)`, !!settled, settled);
    if (!settled) return null;
    const at = async (n) => H.waitFor(P, frames, (v) => v >= n, { timeout: 900000, label: `frame ${n}` }).then(() => true).catch(() => false);
    const start = await P.page.evaluate(frames);
    let ran = await at(start + STOOD);
    await P.page.keyboard.down('d');
    const go = await P.page.evaluate(frames);
    ran = ran && await at(go + HELD);
    await P.page.keyboard.up('d');
    const stop = await P.page.evaluate(frames);
    ran = ran && await at(stop + ROLLED);
    const log = await P.page.evaluate(() => window.__btStepLog.slice());
    const view = await P.page.evaluate(() => { const S = window._gameState.current; return { sx: S._worldScaleX || 0, sy: S._worldScaleY || S._worldScaleX || 0, dpr: window.devicePixelRatio || 1 }; });
    rec.ok(`${label}: the ride's frames played on the scripted clock (guard)`, ran, { frames: log.length / N });
    if (!ran) return null;
    const rows = [];
    for (let k = start; (k + 1) * N <= log.length; k++) {
      rows.push({ x: log[k * N + 2], y: log[k * N + 3], ox: (log[k * N + 2] - log[k * N + 4]) * view.sx * view.dpr, oy: (log[k * N + 3] - log[k * N + 5]) * view.sy * view.dpr });
    }
    rows.go = go - start; rows.stop = stop - start; rows.view = view;
    return rows;
  } finally {
    await P.ctx.close().catch(() => {});
  }
}

function read(rows) {
  const held = rows[0];
  let worst = 0, at = 0, top = 0;
  for (let i = 0; i < rows.length; i++) {
    const d = Math.hypot(rows[i].ox - held.ox, rows[i].oy - held.oy);
    if (d > worst) { worst = d; at = i; }
    if (i > 0) top = Math.max(top, Math.hypot(rows[i].x - rows[i - 1].x, rows[i].y - rows[i - 1].y));
  }
  const n = rows.length, still = Math.hypot(rows[n - 1].x - rows[n - 2].x, rows[n - 1].y - rows[n - 2].y);
  return { frames: n, worst: +worst.toFixed(3), at, top: +top.toFixed(3), still: +still.toFixed(4), ridden: +Math.hypot(rows[n - 1].x - rows[0].x, rows[n - 1].y - rows[0].y).toFixed(1), go: rows.go, stop: rows.stop, view: rows.view };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const now = await rideOnce(browser, wsPort, webPort, rec, 'as it ships', '', 'camfnew');
  const old = await rideOnce(browser, wsPort, webPort, rec, 'the old chase (?camfollow=0)', 'camfollow=0', 'camfold');
  if (!now || !old) return;
  const a = read(now), b = read(old);
  console.log(`    as it ships: ${JSON.stringify(a)}`);
  console.log(`    the old chase: ${JSON.stringify(b)}`);
  rec.ok(`the ride: pushed off from a stand to top speed (${a.top} and ${b.top} game px a frame: at least 4.9), rolled to a stop (${a.still} and ${b.still}), ${a.ridden} game px (guard)`,
    a.top >= 4.9 && b.top >= 4.9 && a.still < 0.01 && b.still < 0.01 && a.ridden > 300, { a, b });
  rec.ok(`as it ships: the bro within 2 device px of where he stood EVERY frame of the push, the ride and the roll-off (worst ${a.worst}, frame ${a.at})`, a.worst <= 2, a);
  rec.ok(`the old chase (?camfollow=0) fails the same ride: the bro slides ${b.worst} device px (frame ${b.at}; at least 20: the fault the check catches)`, b.worst >= 20, b);
}
