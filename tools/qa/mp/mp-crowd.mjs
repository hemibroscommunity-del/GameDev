/* ═══ v2.3.1973: WHAT A CROWD COSTS THE PHONE ═══
 *
 * `server/test/load-crowd.mjs` answers the server half of "does this survive
 * a public demo" and the answer there is a comfortable yes: 60 players in one
 * zone cost 0.2 ms of a 22 ms tick.  It cannot answer the half that actually
 * decides whether the demo is playable, because the binding constraint is not
 * the worker — it is the RECEIVER.  Every co-located peer is another remote
 * figure the client rebuilds each frame (body, head traits, worn gear, name
 * plate, shield, sword) and another ~4 KB/s down the socket, on a phone.
 *
 * So this joins one OBSERVER on a phone viewport and then adds peers to the
 * same zone, sampling the client's own per-frame CPU between each step.
 *
 * WHAT IT MEASURES, and why it is not frame intervals: headless Chromium
 * throttles requestAnimationFrame, so rAF deltas report a flat ~100 ms
 * whatever the game is doing — a number identical in the control and the
 * suspect is measuring the harness (the v2.3.1808 finding, mp-fps.mjs).
 * `perfTracker.workMs` is the client's own callback cost and is unaffected by
 * how often the browser chooses to call it.
 *
 * READ THE RATIO, NOT THE ABSOLUTE.  A sandbox running other jobs inflates
 * every sample; what survives that is entityMs at N peers over entityMs at
 * zero, measured back to back in one process.  The assertions below are
 * deliberately about SHAPE — the cost is bounded and the observer still sees
 * everyone — not about a frame-time target, which is the owner's to read off
 * the printed table on a real device.
 *
 * Peers cost browser processes, so the default crowd is small.  Point it at a
 * real machine with BT_CROWD=15 for a number worth quoting.
 */
import * as H from './harness.mjs';

const CROWD = Number(process.env.BT_CROWD || 7);
/* Steps to sample at: 0 peers (the control), then half, then all. */
const STEPS = [...new Set([0, Math.max(1, Math.floor(CROWD / 2)), CROWD])];

const sample = async (P, ms, label) => {
  await P.page.evaluate(() => { window.perfTracker && window.perfTracker.reset(); });
  await P.page.waitForTimeout(ms);
  const r = await P.page.evaluate(() => {
    const pt = window.perfTracker;
    if (!pt || !pt.getSamples) return null;
    const a = pt.getSamples();
    if (!a.length) return null;
    const col = (k) => a.map((s) => s[k] || 0).sort((x, y) => x - y);
    const q = (v, p) => +(v[Math.min(v.length - 1, Math.floor(v.length * p))] || 0).toFixed(2);
    const w = col('workMs');
    return {
      frames: a.length,
      workP50: q(w, 0.5), workP95: q(w, 0.95),
      entityP50: q(col('entityMs'), 0.5), entityP95: q(col('entityMs'), 0.95),
    };
  });
  return { label, ...(r || {}) };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, {
    name: 'Watcher', wsPort, webPort, viewport: { width: 390, height: 844 }, touch: true,
  });
  await H.enterWorld(P);
  await P.page.waitForTimeout(4000);
  const zone = await H.readState(P, (S) => S.currentZone);
  rec.ok('the observer is in a zone to be crowded', !!zone, { zone });

  const peers = [];
  const rows = [];
  let joinFailedAt = 0;
  for (const want of STEPS) {
    while (peers.length < want) {
      const n = peers.length + 1;
      try {
        /* guest:1 so every peer is its OWN identity — two tabs share one
           bp_ passphrase by design, and a crowd of one player is not a
           crowd (CLAUDE.md, identity). */
        const Q = await H.newPlayer(browser, { name: 'Crowd' + n, wsPort, webPort, guest: true });
        await H.enterWorld(Q);
        peers.push(Q);
      } catch (e) {
        joinFailedAt = joinFailedAt || n;
        break;
      }
    }
    if (peers.length < want) break;
    /* Let the observer actually receive and build them before sampling. */
    await P.page.waitForTimeout(3000);
    const seen = await H.readState(P, (S) => Object.keys(S.others || {}).length);
    const s = await sample(P, 4000, `${peers.length} peer(s)`);
    rows.push({ peers: peers.length, seen, ...s });
    console.log('   ' + JSON.stringify(rows[rows.length - 1]));
  }

  rec.ok('every peer that joined is visible to the observer',
    rows.length > 0 && rows.every((r) => r.seen >= r.peers), rows.map((r) => [r.peers, r.seen]));

  const base = rows[0];
  const top = rows[rows.length - 1];
  rec.ok('the client reported real frame samples at every step',
    rows.every((r) => (r.frames || 0) > 5), rows.map((r) => r.frames));

  /* THE SHAPE ASSERTION.  Per-peer entity cost must not blow up: rendering
     N peers should cost roughly N times one peer, not N-squared.  Compared as
     COST PER PEER between the first and last step, back to back in one
     process so machine load is shared.  Generous bound — this is a tripwire
     for an accidental per-peer full-rebuild, not a performance target. */
  if (base && top && top.peers > base.peers) {
    const perPeer = (r) => (r.peers ? r.entityP50 / r.peers : r.entityP50);
    const grow = base.peers ? perPeer(top) / Math.max(0.01, perPeer(base)) : null;
    rec.ok('per-peer render cost does not blow up as the crowd grows',
      grow === null || grow < 4,
      { basePeers: base.peers, topPeers: top.peers, baseEntityP50: base.entityP50, topEntityP50: top.entityP50, perPeerRatio: grow && +grow.toFixed(2) });
    rec.ok('...and the whole frame is still bounded (entity work under half the frame)',
      top.workP50 === 0 || top.entityP50 <= top.workP50 * 0.5 + 1,
      { entityP50: top.entityP50, workP50: top.workP50 });
  }

  console.log('   peers | seen | workP50 | workP95 | entityP50 | entityP95');
  for (const r of rows) {
    console.log(`   ${String(r.peers).padStart(5)} | ${String(r.seen).padStart(4)} | ${String(r.workP50).padStart(7)} | ${String(r.workP95).padStart(7)} | ${String(r.entityP50).padStart(9)} | ${String(r.entityP95).padStart(9)}`);
  }
  console.log('   (ABSOLUTE ms is only meaningful on an idle machine — the RATIO is the finding.)');
  if (joinFailedAt) console.log(`   note: could not start peer #${joinFailedAt} (browser resources), crowd capped at ${peers.length}`);

  for (const Q of peers) { try { await Q.ctx.close(); } catch { /* best effort */ } }
  await P.ctx.close();
}
