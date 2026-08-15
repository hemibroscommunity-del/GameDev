/* DOES TOURING ZONES LEAK? (v2.3.1741)
 *
 * Owner: the game "slowed down significantly towards the end" of a full
 * playtest, and "it fixed after reloading".  Reload-fixes-it puts the cause
 * in the CLIENT, not the worker or the room.  mp-soak.mjs then ruled out the
 * per-frame effect lists: 90s of continuous combat in one zone moves neither
 * the frame time nor any collection.
 *
 * That leaves the axis a full playtest is made of and a single-zone soak
 * never touches: ZONE CHANGES.
 *
 * The specific suspicion, from reading the code rather than guessing:
 * freeZoneMap (tiledMaps.js) unloads the zone's MAP IMAGE and nothing else.
 * preloadZoneAssets also loads that zone's monster VARIANT sheets, its
 * recolours and (in frost) the snowman set — CLAUDE.md sizes those at
 * 10-20MB per zone — and no path frees any of them.  Tour a dozen zones and
 * all of it stays resident.
 *
 * This walks the hub round trip over and over and reports heap and frame time
 * per lap.  It is a MEASUREMENT first: if the heap climbs monotonically with
 * laps, the hypothesis is confirmed and the fix has a target; if it is flat,
 * the asset lead is dead and the search moves on.
 */
import * as H from './harness.mjs';

const LAPS = Number(process.env.BT_ZONE_LAPS || 6);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Tourist', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  const marks = await P.page.evaluate(() => {
    const f = window._gameFns;
    if (!f || !f.TOWN_EXITS || !f.WORLDVIEW_EXITS) return null;
    return {
      out: f.TOWN_EXITS.find((e) => e.zoneId === 'worldview'),
      frost: f.WORLDVIEW_EXITS.find((e) => e.zoneId === 'frost'),
      home: f.WORLDVIEW_EXITS.find((e) => e.zoneId === 'town'),
    };
  });
  rec.ok('the hub exit table is readable', !!(marks && marks.out && marks.frost && marks.home), marks);
  if (!marks || !marks.out || !marks.frost || !marks.home) { await P.ctx.close().catch(() => {}); return; }

  const stand = (tx, ty) => P.page.evaluate(({ x, y }) => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.player) return false;
    S.player.x = x * 32 + 16; S.player.y = y * 32 + 16;
    return true;
  }, { x: tx, y: ty });
  const travel = async (tx, ty, zoneId) => {
    for (let i = 0; i < 8; i++) {
      await stand(tx, ty);
      const got = await H.waitFor(P, (S) => S.currentZone, (z) => z === zoneId,
        { timeout: 8000, label: 'reach ' + zoneId }).catch(() => null);
      if (got === zoneId) return true;
    }
    return (await H.readState(P, (S) => S.currentZone)) === zoneId;
  };

  await P.page.evaluate(() => {
    window.__ft = [];
    let last = performance.now();
    const tick = (now) => {
      const d = now - last; last = now;
      if (d > 0 && d < 500) window.__ft.push(d);
      if (window.__ft.length > 4000) window.__ft.shift();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    window.__ftDrain = () => {
      const a = window.__ft.slice().sort((x, y) => x - y);
      window.__ft = [];
      if (!a.length) return null;
      return { mean: +(a.reduce((s, v) => s + v, 0) / a.length).toFixed(2) };
    };
  });

  const probe = () => P.page.evaluate(() => ({
    heapMB: (window.performance && performance.memory)
      ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
    zone: (window._gameState && window._gameState.current || {}).currentZone || null,
    ft: window.__ftDrain ? window.__ftDrain() : null,
  }));

  const laps = [];
  let travelled = 0;
  for (let i = 0; i < LAPS; i++) {
    const a = await travel(marks.out.tx, marks.out.ty, 'worldview');
    const b = await travel(marks.frost.tx, marks.frost.ty, 'frost');
    /* Leave the spoke the way the game actually lets you: its own tile-9
       return marker (v2.3.1732's finding — a spoke has no exit table). */
    const back = await P.page.evaluate(() => {
      const S = window._gameState && window._gameState.current;
      if (!S || !S.map || !S.player) return null;
      const px = Math.floor(S.player.x / 32), py = Math.floor(S.player.y / 32);
      let best = null;
      for (let y = 0; y < S.map.length; y++) {
        const row = S.map[y]; if (!row) continue;
        for (let x = 0; x < row.length; x++) {
          if (row[x] !== 9) continue;
          const d = Math.abs(x - px) + Math.abs(y - py);
          if (!best || d < best.d) best = { tx: x, ty: y, d };
        }
      }
      return best;
    });
    if (back) await travel(back.tx, back.ty, 'worldview');
    const c = await travel(marks.home.tx, marks.home.ty, 'town');
    if (a && b && c) travelled++;
    await P.page.waitForTimeout(2500); /* let the zone settle + GC breathe */
    const m = await probe();
    laps.push({ lap: i + 1, ...m });
    console.log(`      lap ${i + 1}: zone=${m.zone} heap=${m.heapMB}MB`
      + (m.ft ? ` frame=${m.ft.mean}ms` : ''));
  }

  rec.ok('the tour actually completed its laps', travelled >= Math.ceil(LAPS / 2),
    { travelled, laps: LAPS });

  const withHeap = laps.filter((l) => typeof l.heapMB === 'number');
  if (withHeap.length < 3) {
    rec.skip('zone touring does not leak', 'no heap readings (performance.memory unavailable)');
  } else {
    const first = withHeap[0].heapMB, last = withHeap[withHeap.length - 1].heapMB;
    const perLap = (last - first) / (withHeap.length - 1);
    console.log(`      heap ${first}MB -> ${last}MB over ${withHeap.length} laps  (${perLap.toFixed(1)}MB/lap)`);
    /* A lap loads and leaves two zones.  Assets that are never freed show up
       as a steady per-lap climb; ordinary churn wobbles either way and lands
       near zero.  6MB/lap is well above wobble and well under the 10-20MB a
       full variant set would cost, so it catches the real thing without
       failing on GC timing. */
    rec.ok('touring zones does not accumulate heap lap after lap',
      perLap < 6, { first, last, perLap: +perLap.toFixed(1), laps: withHeap.length });
  }

  const ftL = laps.filter((l) => l.ft).map((l) => l.ft.mean);
  if (ftL.length >= 3) {
    console.log(`      frame ${ftL[0]}ms -> ${ftL[ftL.length - 1]}ms`);
    rec.ok('...and the frame cost does not climb with the tour',
      ftL[ftL.length - 1] <= ftL[0] * 1.4 + 2, { first: ftL[0], last: ftL[ftL.length - 1] });
  }

  await P.ctx.close().catch(() => {});
}
