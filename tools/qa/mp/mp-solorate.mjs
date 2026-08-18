/* HOW STALE IS THE WORKER'S COPY OF YOU WHEN YOU PLAY ALONE? (v2.3.1767)
 *
 * Owner: "when I was playing by myself last night the monsters were moving
 * really slowly and rubber banding.  Idk if that's a one off or if it had
 * something to do with slowing down the tick rate when you're alone."
 *
 * They were right, and this measures it.  wsClient's adaptive move rate
 * (MOVE_GAP_SOLO_MS) drops your outbound position updates to ~5Hz when no peer
 * shares your zone, on the reasoning that the fast rate is "smoothness
 * delivered to an empty room".  The room is not empty: MONSTER AI CHASES
 * ps.x/ps.y, the worker's copy of you, so alone you become a target that moves
 * five times a second in ~40px jumps.  The monster lurches toward where you
 * were, stops, lurches again — which is exactly the report.
 *
 * Measured here rather than argued, on the same client against the same
 * worker, with and without a peer in the zone.  `distinct server positions` is
 * the tell: it counts how many different places the worker believed you were
 * during one three-second walk, which is the update RATE with the sampling
 * noise divided out.
 *
 * MEASURED, local wrangler + Chromium, same box:
 *   BEFORE (MOVE_GAP_SOLO_MS = 198)
 *     SOLO         max gap 38.5px, avg 19.4px, 15 distinct positions / 57 samples
 *     WITH A PEER  max gap 12.5px, avg  4.4px, 46 distinct positions / 53 samples
 *   AFTER (v2.3.1767, floor raised to 66 — owner: "raise solo floor everywhere")
 *     SOLO         max gap 19.3px, avg 10.3px, 36 distinct positions / 57 samples
 *     WITH A PEER  max gap 10.0px, avg  4.0px, 45 distinct positions / 50 samples
 *
 * The last assertion was RED on purpose when this landed as a diagnosis; the
 * floor change is what turns it green.  Solo is still a little behind watched
 * (66ms against 33ms, by design — the packet saving was real, only its size
 * was wrong), which is why the assertion asks for most of the watched rate
 * rather than all of it.
 */
import * as H from './harness.mjs';

async function sample(P, wsPort, id, ms) {
  const out = [];
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const [cli, live] = await Promise.all([
      H.readState(P, (S) => ({ x: S.player.x, y: S.player.y })),
      H.adminPlayer(wsPort, id).then((a) => (a && a.live) || null).catch(() => null),
    ]);
    if (cli && live) out.push({ t: Date.now() - t0, cx: cli.x, cy: cli.y, sx: live.x, sy: live.y,
      gap: Math.hypot(cli.x - live.x, cli.y - live.y) });
    await P.page.waitForTimeout(40);
  }
  return out;
}
const report = (label, rows, rec) => {
  const gaps = rows.map((r) => r.gap);
  const max = Math.max(...gaps), avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  /* How many DISTINCT server positions were observed — the tell for the rate.
     At 30Hz a 3s walk shows dozens; at 5Hz it shows ~15. */
  const distinct = new Set(rows.map((r) => r.sx.toFixed(1) + ',' + r.sy.toFixed(1))).size;
  rec.ok(`${label}: sampled the walk`, rows.length > 10, { rows: rows.length });
  console.log(`    ${label}: max gap ${max.toFixed(1)}px, avg ${avg.toFixed(1)}px, distinct server positions ${distinct} over ${rows.length} samples`);
  return { max, avg, distinct };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Solo', wsPort, webPort });
  await H.enterWorld(A);
  await A.page.waitForTimeout(1500);
  const idA = await H.readState(A, (S) => S.myId);

  await A.page.keyboard.down('d');
  const solo = await sample(A, wsPort, idA, 3000);
  await A.page.keyboard.up('d');
  const s = report('SOLO', solo, rec);

  /* Now put a peer in the same zone — that flips wsClient's moveGapMs from
     the 198ms solo rate to the 33ms seen rate. */
  const B = await H.newPlayer(browser, { name: 'Peer', wsPort, webPort, guest: true });
  await H.enterWorld(B);
  await B.page.waitForTimeout(1200);
  await H.waitMutualSight(A, B).catch(() => {});
  await A.page.waitForTimeout(600);

  await A.page.keyboard.down('a');
  const paired = await sample(A, wsPort, idA, 3000);
  await A.page.keyboard.up('a');
  const p = report('WITH A PEER', paired, rec);

  rec.ok('the worker tracks a SOLO player as closely as a watched one',
    s.distinct >= p.distinct * 0.6,
    { soloDistinct: s.distinct, pairedDistinct: p.distinct, soloMaxGap: s.max, pairedMaxGap: p.max });

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
