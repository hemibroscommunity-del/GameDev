/* ═══ THE RIDE'S GROUND, SENT TO THE CHIP A ROW AT A TIME (v2.3.6381, card SB PR 2) ═══
 *
 * The owner, 2026-11-18: "I notice 'grainy' feeling when on a skateboard
 * playing on my phone where sometimes it freezes just for tiny fractions of a
 * second while it loads."  mp-heldsweep's `ride` and `ridewalk` stations
 * (docs/plan/census/SB-ride.md) named the ground's biggest cost on the ring
 * round BroTown's safe ground: every piece laid took a row of the colour
 * atlas, and the row was written by sending the WHOLE atlas (256 KB) to the
 * graphics chip again (paletteTex.js atlasRowSent).
 *
 * A phone rides the same ring on the board, twice:
 *   - as it ships: rows were sent alone (rowsSent > 0), and the atlas on the
 *     chip, read back byte for byte, is the page's own (__btAtlasSame: no row
 *     differs) -- nothing a player sees changes;
 *   - `?atlasrow=0`: no row sent alone, the whole atlas every time, and the
 *     same atlas on the chip.
 *
 *   node tools/qa/mp/run.mjs rideheld
 */
import * as H from './harness.mjs';
export const lane = 'full';

const PHONE = { width: 430, height: 932 };
/* the ring: mp-heldsweep's (RING_R round the Wheel's centre, inside the safe ground, at the board's speed) */
const RING_R = 2200, RING_N = 16, RIDE_PX_S = 300;
const ring = (G) => {
  const out = [];
  for (let k = 0; k <= RING_N; k++) {
    const a = Math.PI / 2 + (k / RING_N) * Math.PI * 2;
    out.push([Math.round(G.cx + Math.cos(a) * RING_R), Math.round(G.cy + Math.sin(a) * RING_R)]);
  }
  return out;
};

async function ride(browser, wsPort, webPort, rec, label, query) {
  const P = await H.newPlayer(browser, { name: 'rh' + (query ? 'old' : 'new'), wsPort, webPort, world: 'wheel', viewport: PHONE, touch: true, dpr: 1, query });
  const stopAlive = H.keepAlive(P);
  try {
    await H.enterWorld(P);
    const ok = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 120000, label: 'into the world' }).then(() => true).catch(() => false);
    rec.ok(`${label}: in BroTown (guard)`, ok);
    if (!ok) return null;
    const G = await H.wheelGeom();
    const me = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', me, { heal: true, god: true, godMinutes: 20 }).catch(() => {});
    const pts = ring(G);
    await H.glideTo(P, pts[0][0], pts[0][1], { speed: 2500, timeoutMs: 120000 }).catch(() => {});
    await P.page.waitForTimeout(3000);
    const before = await P.page.evaluate(() => window.__btAtlasSame && window.__btAtlasSame());
    const loads0 = await P.page.evaluate(() => window.__btWorldTrial.stats.loads);
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
    await P.page.waitForTimeout(1500);
    const after = await P.page.evaluate(() => window.__btAtlasSame && window.__btAtlasSame());
    const pieces = (await P.page.evaluate(() => window.__btWorldTrial.stats.loads)) - loads0;
    const pal = await P.page.evaluate(() => (window.__btPalette ? window.__btPalette() : null));
    return { before, after, pieces, offs, on: !!(pal && pal.on) };
  } finally {
    stopAlive();
    await P.ctx.close().catch(() => {});
  }
}

export async function run({ browser, wsPort, webPort, rec }) {
  const now = await ride(browser, wsPort, webPort, rec, 'as it ships', '');
  const old = await ride(browser, wsPort, webPort, rec, 'as before (?atlasrow=0)', 'atlasrow=0');
  if (!now || !old) return;
  console.log('  as it ships:', JSON.stringify(now));
  console.log('  ?atlasrow=0:', JSON.stringify(old));
  rec.ok(`the ring laid ground on the board (guard): ${now.pieces} and ${old.pieces} pieces, colour numbers on (${now.on}, ${old.on})`,
    now.pieces >= 20 && old.pieces >= 20 && now.on && old.on, { now, old });
  const sentAlone = now.after && now.before ? now.after.rowsSent - now.before.rowsSent : 0;
  const sentWhole = now.after && now.before ? now.after.wholeSent - now.before.wholeSent : -1;
  rec.ok(`as it ships, each row went to the chip alone: ${sentAlone} rows sent alone on the ring, the whole atlas ${sentWhole} times`,
    sentAlone >= 20 && sentWhole === 0, { before: now.before, after: now.after });
  rec.ok(`...and the atlas on the chip is the page's own, byte for byte (${now.after ? now.after.rows : '?'} rows read back, ${now.after ? now.after.diffRows : '?'} differ)`,
    !!(now.after && now.after.rows > 0 && now.after.diffRows === 0 && !now.after.error), now.after);
  const oldAlone = old.after ? old.after.rowsSent : -1;
  rec.ok(`?atlasrow=0: no row sent alone (${oldAlone}), the whole atlas every time (${old.after ? old.after.wholeSent : '?'}), the same atlas on the chip (${old.after ? old.after.diffRows : '?'} rows differ)`,
    !!(old.after && old.after.rowsSent === 0 && old.after.wholeSent > 0 && old.after.diffRows === 0), old.after);
}
