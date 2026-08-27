/* A ZONE OPENS WHEN A QUEST SENDS YOU THERE (v2.3.1817).
 *
 * Owner: "make each zone open up only after a mayor bro quest requires that
 * area."
 *
 * The lock is enforced by the WORKER (_zoneUnlocked, gating on the quest
 * table's own objective.zone) and mirrored by the client so a locked portal
 * explains itself instead of reading as broken — which is exactly how the
 * v2.3.1708 portal incident got reported.
 *
 * What this drives is the pair AGREEING, from the seat: standing on the spoke
 * you have no quest for leaves you in the hub, and standing on the one your
 * quest names takes you through.  Both are checked against the WORKER's idea
 * of where you are, not the client's — the client refusing to trigger would
 * satisfy every on-screen check while a forged packet still walked in.
 *
 * The negative case is the one worth having: without it, "the frost portal
 * works" passes just as well on a build with no gate at all.
 */
import * as H from './harness.mjs';

const TILE = 32;
const stand = (P, tx, ty) => P.page.evaluate(({ x, y, t }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = x * t + t / 2;
  S.player.y = y * t + t / 2;
  return true;
}, { x: tx, y: ty, t: TILE });

const zoneOf = (P) => H.readState(P, (S) => S.currentZone);

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Gated', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);
  const myId = await H.readState(P, (S) => S.myId);

  /* tut_1 names FROST.  Accepting it also clears the v2.3.1676 town gate, so
     this one accept is what makes the rest of the file reachable at all. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  await P.page.waitForTimeout(1800);

  const marks = await P.page.evaluate(() => {
    const f = window._gameFns;
    if (!f || !f.WORLDVIEW_EXITS || !f.TOWN_EXITS) return { err: 'no exit tables on the bridge' };
    return {
      townExit: f.TOWN_EXITS.find((e) => e.zoneId === 'worldview') || null,
      frost: f.WORLDVIEW_EXITS.find((e) => e.zoneId === 'frost') || null,
      ember: f.WORLDVIEW_EXITS.find((e) => e.zoneId === 'ember') || null,
    };
  });
  if (marks.err || !marks.townExit || !marks.frost || !marks.ember) {
    rec.skip('zone gating', marks.err || 'exit markers missing');
    await P.ctx.close().catch(() => {});
    return;
  }

  await stand(P, marks.townExit.tx, marks.townExit.ty);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview', 12000).catch(() => {});
  rec.ok('reached the World View (guard)', (await zoneOf(P)) === 'worldview', { zone: await zoneOf(P) });

  /* ── LOCKED: ember belongs to tut_4, which is not active ── */
  await stand(P, marks.ember.tx, marks.ember.ty);
  await P.page.waitForTimeout(2500);
  const afterEmber = await zoneOf(P);
  rec.ok('a spoke with no quest for it does NOT let you in', afterEmber !== 'ember', { afterEmber });
  /* `.zone`, not `.z` — the admin summary renames it (admin.js `zone: ps.z`).
     Worth the note: the first cut read `.z`, which is undefined here, so this
     assertion passed for the wrong reason (undefined !== 'ember') while its
     twin below failed and gave the mistake away. */
  const srvEmber = await H.serverPlayer(wsPort, myId);
  rec.ok('...and the WORKER agrees you never went',
    !!(srvEmber && srvEmber.zone && srvEmber.zone !== 'ember'),
    { workerZone: srvEmber && srvEmber.zone });

  /* Not a freeze: the player is still somewhere sane and still playing. */
  rec.ok('...and you are still in the hub, not stranded',
    (await zoneOf(P)) === 'worldview', { zone: await zoneOf(P) });

  /* ── OPEN: frost is what tut_1 names ── */
  await stand(P, marks.frost.tx, marks.frost.ty);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'frost', 12000).catch(() => {});
  const afterFrost = await zoneOf(P);
  rec.ok('the spoke your quest NAMES lets you through', afterFrost === 'frost', { afterFrost });
  /* Poll rather than read once: the zone change re-registers the player with
     the room, so a single read can land in the gap and come back empty — which
     is indistinguishable from "the worker disagrees" if you assert on it. */
  /* v2.3.2012: poll for the ZONE IT IS ASSERTING, not merely for a non-empty
     read.  The old loop broke on `srvFrost.zone` being truthy at all, and the
     first non-empty read after a zone change is normally the OLD zone -- so it
     asserted on a stale value and reported "workerZone: worldview" as a
     client/server disagreement.  (The ember case above could not see this: it
     asserts `zone !== 'ember'`, which a stale 'worldview' satisfies.)
     Still bounded, and it keeps the LAST read either way, so a worker that
     genuinely never agrees still fails with the value it actually returned. */
  let srvFrost = null;
  for (let i = 0; i < 16; i++) {
    const got = await H.serverPlayer(wsPort, myId);
    if (got && got.zone) srvFrost = got;
    if (srvFrost && srvFrost.zone === 'frost') break;
    await P.page.waitForTimeout(500);
  }
  rec.ok('...and the WORKER put you there too (the client is not pretending)',
    !!(srvFrost && srvFrost.zone === 'frost'), { workerZone: srvFrost && srvFrost.zone });

  await P.ctx.close().catch(() => {});
}
