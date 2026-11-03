/* ═══ v2.3.3898: THE WORLD MAP ALWAYS SHOWS BROTOWN WHEN YOU'RE HOME ═══
 *
 * The owner, 2026-11-02: "There was a player who opened up the minimap and
 * was stuck on the old minimap that looked really zoomed out and didn't show
 * the town. When you're in the town it should always be zoomed in enough to
 * see the town."
 *
 * The map opened on the town only when the worker's last "where am I" said
 * region 'town'; anywhere else (the commons, which reads "BroTown" and
 * "safe" too; a stale answer from where you died) it opened on the whole
 * Wheel at zoom 1, the town a ~6 px speck.  One phone in the live world:
 *   1. in BroTown the map opens on the town's buildings (zoom >= 6 the short
 *      Wheel's, every building on the screen);
 *   2. on the commons, the same;
 *   3. out in a land it opens on YOU, up close (◎'s zoom, >= 4), not zoom 1;
 *   4. straight after a jump home from that land (a respawn's move, the
 *      worker's answer still the land's: `fresh` false), the town again;
 *   5. no page errors.
 * Coordinates come from the plan (H.wheelGeom) and the zone's safe radius,
 * never written here.
 */
import * as H from './harness.mjs';
import { WHEEL_SPAWNS } from '../../../server/src/wheelspawns.js';
import { ZONES } from '../../../src/data/zones.js';

const PHONE = { width: 390, height: 844 };

export async function run({ browser, wsPort, webPort, rec }) {
  const G = await H.wheelGeom();
  const C = { x: G.cx, y: G.cy };
  const safeR = ZONES.wheel.safeR;
  const spot = (land, r) => {
    const [ax, ay] = WHEEL_SPAWNS[land].anchor;
    const d = Math.hypot(ax - C.x, ay - C.y);
    return { x: Math.round(C.x + ((ax - C.x) / d) * r), y: Math.round(C.y + ((ay - C.y) / d) * r) };
  };
  const P = await H.newPlayer(browser, { name: 'Homebro', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  const errors = [];
  P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  let stop = false;
  (async () => { while (!stop) { await P.page.keyboard.press('Control').catch(() => {}); for (let i = 0; i < 40 && !stop; i++) await P.page.waitForTimeout(500).catch(() => {}); } })();
  try {
    await H.enterWorld(P);
    const inW = await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
      (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'into the Wheel' }).catch(() => null);
    rec.ok('in the Wheel (guard)', !!inW, inW);
    if (!inW) return;
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 30 });
    await H.devOp(wsPort, 'quests', myId);   /* past the Mayor's gate: out of the commons */
    await P.page.waitForTimeout(2500);

    const region = () => P.page.evaluate(() => {
      const L = window.__btZoneBanner && window.__btZoneBanner.land ? window.__btZoneBanner.land() : {};
      const S = window._gameState.current;
      return { region: L.cur || null, x: Math.round(S.player.x), y: Math.round(S.player.y) };
    });
    const closeMap = async () => { await P.page.evaluate(() => window.__btWorldMapOpen && window.__btWorldMapOpen(false)); await P.page.waitForTimeout(400); };
    /* the map's view once its first frame is drawn */
    const openRead = async () => {
      await P.page.evaluate(() => window.__btWorldMapOpen && window.__btWorldMapOpen(true));
      return H.waitFor(P, () => {
        const m = window.__btWorldMap;
        return m && m.open && m.more ? { zoom: m.zoom, rel: m.rel, cx: m.cx, cy: m.cy, buildingsAt: m.more.buildingsAt || 0 } : null;
      }, (v) => !!v, { timeout: 8000, label: 'the world map' }).catch(() => null);
    };
    const nearTown = (w) => !!w && Math.hypot(w.cx - C.x, w.cy - C.y) < 1500;
    const townShown = (w) => !!w && w.rel >= 6 - 1e-6 && nearTown(w) && w.buildingsAt >= 3;
    const walkTo = async (t) => { for (let i = 0; i < 6; i++) { await H.hopTo(P, t.x, t.y, { tries: 60 }); const h = await region(); if (Math.hypot(h.x - t.x, h.y - t.y) < 40) return h; } return region(); };

    /* ── 1. in BroTown ── */
    const r1 = await region();
    const w1 = await openRead();
    rec.ok(`in BroTown (${r1.region}) the map opens on the town: zoom ${w1 && w1.rel && w1.rel.toFixed(1)} the short Wheel's, ${w1 && w1.buildingsAt} buildings on the screen`,
      townShown(w1), { r1, w1 });
    await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/out/homemap-1-town.png' }).catch(() => {});
    await closeMap();

    /* ── 2. on the commons ── */
    const cm = spot('frost', Math.round(safeR * 0.82));
    const r2 = await walkTo(cm);
    await P.page.waitForTimeout(1200);
    const r2b = await region();
    rec.ok(`...walked onto the commons (${r2b.region}, ${Math.round(Math.hypot(r2b.x - C.x, r2b.y - C.y))} px out) (guard)`, r2b.region === 'commons', { r2, r2b });
    const w2 = await openRead();
    rec.ok(`on the commons the map opens on the town too (zoom ${w2 && w2.rel && w2.rel.toFixed(1)}, ${w2 && w2.buildingsAt} buildings), not the whole Wheel`,
      townShown(w2), w2);
    await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/out/homemap-2-commons.png' }).catch(() => {});
    await closeMap();

    /* ── 3. out in a land ── */
    const ld = spot('frost', safeR + 260);
    await walkTo(ld);
    await P.page.waitForTimeout(1500);
    const r3 = await region();
    rec.ok(`...walked out into a land (${r3.region}) (guard)`, !!r3.region && r3.region !== 'commons' && r3.region !== 'town', r3);
    const w3 = await openRead();
    rec.ok(`out in a land the map opens on you, up close (zoom ${w3 && w3.rel && w3.rel.toFixed(1)}, ${w3 && Math.round(Math.hypot(w3.cx - r3.x, w3.cy - r3.y))} px off you), never the whole Wheel`,
      !!w3 && w3.rel >= 4 - 1e-6 && w3.zoom > 1.01 && Math.hypot(w3.cx - r3.x, w3.cy - r3.y) < 200, { w3, r3 });
    await closeMap();

    /* ── 4. a jump home, as a respawn moves you: the worker's word is still
          the land's, so the map must not trust it ── */
    const home = G.arrival;
    const stale = await P.page.evaluate(({ x, y }) => {
      const S = window._gameState.current;
      S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0;
      if (window.__btWorldMapOpen) window.__btWorldMapOpen(true);
      return true;
    }, home);
    const w4 = await H.waitFor(P, () => {
      const m = window.__btWorldMap;
      return m && m.open && m.more ? { zoom: m.zoom, rel: m.rel, cx: m.cx, cy: m.cy, buildingsAt: m.more.buildingsAt || 0 } : null;
    }, (v) => !!v, { timeout: 8000, label: 'the world map' }).catch(() => null);
    rec.ok(`straight after a jump home from the land (the worker's answer not yet fresh) the map opens on the town (zoom ${w4 && w4.rel && w4.rel.toFixed(1)}, ${w4 && w4.buildingsAt} buildings)`,
      stale && townShown(w4), w4);
    await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/out/homemap-4-home.png' }).catch(() => {});
    await closeMap();

    rec.ok('no page errors', errors.length === 0, errors.slice(0, 5));
  } finally {
    stop = true;
  }
}
