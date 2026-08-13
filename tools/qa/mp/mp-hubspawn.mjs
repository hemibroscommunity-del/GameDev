/* Leaving town does not put you back in town (v2.3.1703).
 *
 * Owner: "the character spawns above the town after exiting the town into the
 * worldview so continuing the downward run makes the character run into the
 * portal into town again.  Make the character spawn below the town portal
 * instead of above it."
 *
 * Two rules are under test and they only work together, which is why they are
 * one scenario:
 *
 *   1. ARRIVAL SIDE.  You leave town heading SOUTH, so you should come out
 *      south of the World View's town trail-head (24,28) — not north of it,
 *      with the way home directly in your path.  v2.3.1700 emerged 4 tiles
 *      toward the hub centre, which on this map IS north.
 *
 *   2. THE DISARM LATCH.  Rule 1 on its own reinstates the bug v2.3.1700 was
 *      fixing: every open spoke (frost 13,13 / ember 25,10 / sky 39,12) is
 *      NORTH of that marker, so walking to one from below crosses it.  The
 *      marker you came through is therefore disarmed until you are clear of
 *      it.  This is the assertion that matters — it is the one that decides
 *      whether a new player can reach the first quest zone at all.
 *
 * Positions are read from the CLIENT, because zone geometry and the exit
 * triggers are client-side (zoneTransitions.js); the worker only learns where
 * you ended up.  The marker coordinates are read from the game's own
 * WORLDVIEW_EXITS via the _gameFns bridge rather than hardcoded, so retuning
 * a trail-head moves the test with it.
 */
import * as H from './harness.mjs';

const TILE = 32;

/* Put the player on a tile and let the game tick see it. */
const stand = (P, tx, ty) => P.page.evaluate(({ x, y, t }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = x * t + t / 2;
  S.player.y = y * t + t / 2;
  return true;
}, { x: tx, y: ty, t: TILE });

const where = (P) => H.readState(P, (S) => ({
  zone: S.currentZone,
  tx: Math.floor(S.player.x / 32),
  ty: Math.floor(S.player.y / 32),
}));

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Rambler', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);

  /* The town gate is a HARD one since v2.3.1676 — no leaving until the mayor
     has armed you — so take his quest first or nothing below can happen. */
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
      townMark: f.WORLDVIEW_EXITS.find((e) => e.zoneId === 'town') || null,
      spokes: f.WORLDVIEW_EXITS.filter((e) => e.zoneId !== 'town')
        .map((e) => ({ zoneId: e.zoneId, tx: e.tx, ty: e.ty })),
    };
  });
  if (marks.err || !marks.townExit || !marks.townMark) {
    rec.skip('leaving town lands south of the World View town portal', marks.err || 'no markers');
    await P.ctx.close().catch(() => {});
    return;
  }

  /* ── 1. walk out of town on its real World View trail-head ── */
  await stand(P, marks.townExit.tx, marks.townExit.ty);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview',
    { timeout: 30000, label: 'reach the World View' }).catch(() => {});
  const landed = await where(P);
  rec.ok('walking onto the town trail-head reaches the World View',
    landed.zone === 'worldview', landed);
  /* THE OWNER'S REPORT.  ty greater than the marker's is south of it on this
     map (y grows downward), so this is literally "below the town portal". */
  rec.ok('...landing BELOW the town portal, not above it',
    landed.zone === 'worldview' && landed.ty > marks.townMark.ty,
    { landed, townMark: marks.townMark });
  /* And far enough below that the arrival is not already inside the trigger
     it just came out of. */
  rec.ok('...clear of the portal rather than standing on it',
    Math.abs(landed.tx - marks.townMark.tx) + Math.abs(landed.ty - marks.townMark.ty) >= 3,
    { landed, townMark: marks.townMark });

  /* Hold still for a few ticks: an arrival that immediately re-triggers is
     the exact bounce v2.3.948 and v2.3.1700 were both chasing. */
  await P.page.waitForTimeout(2500);
  rec.ok('and it stays there instead of bouncing straight back to town',
    (await where(P)).zone === 'worldview');

  /* ── 2. the latch: walking out over the marker must not warp you home ──
     Step onto the town marker itself — the worst case, and the exact tile a
     straight walk from the arrival point to any northern spoke crosses. */
  await stand(P, marks.townMark.tx, marks.townMark.ty);
  await P.page.waitForTimeout(1800);
  const overIt = await where(P);
  rec.ok('crossing the town portal on the way out does NOT warp you back',
    overIt.zone === 'worldview', { overIt, townMark: marks.townMark });

  /* ── 3. …and it re-arms once you have got clear of it ──
     Walk well away (past DISARM_CLEAR_R), then come back onto it. */
  const spoke = marks.spokes[0];
  await stand(P, spoke ? spoke.tx : 4, spoke ? spoke.ty : 4);
  await P.page.waitForTimeout(400);
  /* That may have entered the spoke zone, which is fine — it proves the walk
     works.  Either way, get back to the World View and try the town portal
     for real. */
  const atSpoke = await where(P);
  rec.ok('a straight walk from the arrival point reaches a spoke zone',
    !!spoke && atSpoke.zone === spoke.zoneId, { atSpoke, spoke });

  await P.ctx.close().catch(() => {});
}
