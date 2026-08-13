/* THE HARVEST SHIELD REACHES THE WORKER (v2.3.1704).
 *
 * Owner, twice: "make it so monsters don't attack you while you're extracting
 * resources (fishing, mining, etc) it's really annoying and glitchy"
 * (v2.3.1690), and then again after that shipped: "the monsters keep attacking
 * you while harvesting resources.  I wanted monsters to ignore you during
 * resource extraction."
 *
 * WHY THE SECOND REPORT HAPPENED, and why it needs a HEADLESS test rather than
 * another server suite.  The shield was built entirely on the worker and
 * pinned by server/test/combat-lifecycle.test.mjs, which was green the whole
 * time — because those fixtures push `extraction_start` straight down a
 * socket.  The shipped client could not: `channelShim.send`
 * (src/networking/wsClient.js) is an ALLOWLIST, and `extraction_start` had no
 * passthrough line in it, so the message never left the browser.  TRAPS #18,
 * and it had been silently eating this message since v2.3.229 — taking the
 * swipe-timing anticheat down with it.
 *
 * That failure is INVISIBLE from the client: S._extraction says "I am
 * harvesting" whether or not the worker ever heard about it.  So every
 * assertion below that matters reads the WORKER (H.adminPlayer), which is the
 * tell TRAPS #18 describes — the client's copy and the server's copy of the
 * same fact disagreeing.
 *
 * The scenario walks the real route (town -> World View -> a spoke zone) so
 * the nodes are the worker's own, not injected: the shield resolves its node
 * out of the server's list every tick, so a made-up node id proves nothing.
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

/* The worker's view of the harvest state (v2.3.1704 admin fields):
     ex            — the harvest activity code arriving on `move`
     extracting    — the worker holds a validated extraction record
     harvestShield — that record is currently granting immunity */
const serverHarvest = async (wsPort, id) => {
  const live = (await H.adminPlayer(wsPort, id).catch(() => ({}))).live || {};
  return { ex: live.ex ?? null, extracting: !!live.extracting, shield: !!live.harvestShield, zone: live.zone };
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Harvey', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);
  const myId = await H.readState(P, (S) => S.myId);
  await H.instrumentWire(P);

  /* The town gate is hard since v2.3.1676 — the mayor has to arm you before
     any of the walking below is possible. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  /* And gathering is tool-gated since v2.3.1680, on BOTH sides — the client
     hides a node you have no tool for, and the worker refuses the start.
     All three are granted because which node this scenario ends up harvesting
     depends on what the worker rolled into the zone it walks to.  Granted
     through the operator surface so the WORKER is the one that put them in
     the bag, exactly as mp-authority seeds its logs. */
  for (const tool of ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe']) {
    await H.grant(wsPort, myId, 'item', { invKey: tool, count: 1 }).catch(() => {});
  }
  await H.waitFor(P, (S) => (S.rpg?.inventory || {}).mining_pickaxe || 0, (n) => n >= 1,
    { timeout: 20000, label: 'the tools reach the bag' }).catch(() => {});

  /* ── walk to a zone that has real, worker-owned gather nodes ── */
  const marks = await P.page.evaluate(() => {
    const f = window._gameFns;
    if (!f || !f.TOWN_EXITS || !f.WORLDVIEW_EXITS) return null;
    return {
      townExit: f.TOWN_EXITS.find((e) => e.zoneId === 'worldview') || null,
      spokes: f.WORLDVIEW_EXITS.filter((e) => e.zoneId !== 'town')
        .map((e) => ({ zoneId: e.zoneId, tx: e.tx, ty: e.ty })),
    };
  });
  if (!marks || !marks.townExit || !marks.spokes.length) {
    rec.skip('the harvest shield reaches the worker', 'no exit tables on the _gameFns bridge');
    await P.ctx.close().catch(() => {});
    return;
  }
  /* Frost by preference: its snowmen are the slowest chase in the game (spd
     0.4) with a 900 ms telegraphed throw, so an unarmed fresh character can
     reach a node there and still be alive to harvest it.  The scenario is
     about the harvest wire, not about surviving ember. */
  const spoke = marks.spokes.find((s) => s.zoneId === 'frost') || marks.spokes[0];
  /* Re-STAND rather than wait once.  A trail-head fires from the game loop's
     proximity scan, and a single position write can land on a frame the loop
     skips (a zone-loading overlay, a dropped rAF) — which reads as "the town
     gate is shut" and takes the whole scenario down with it. */
  const travel = async (tx, ty, zoneId) => {
    for (let i = 0; i < 6; i++) {
      await stand(P, tx, ty);
      const got = await H.waitFor(P, (S) => S.currentZone, (z) => z === zoneId,
        { timeout: 6000, label: 'reach ' + zoneId }).catch(() => null);
      if (got === zoneId) return true;
    }
    return (await H.readState(P, (S) => S.currentZone)) === zoneId;
  };
  await travel(marks.townExit.tx, marks.townExit.ty, 'worldview');
  await travel(spoke.tx, spoke.ty, spoke.zoneId);
  /* The node list arrives on the zone_state that follows the transition, not
     with it, so wait for it rather than reading the frame we landed on. */
  await H.waitFor(P, (S) => (S.gatherNodes || []).filter((n) => n.alive).length, (n) => n > 0,
    { timeout: 20000, label: 'the zone\'s gather nodes arrive' }).catch(() => {});
  const inZone = await H.readState(P, (S) => ({ zone: S.currentZone, srv: !!S._serverGatherNodes,
    types: (S.gatherNodes || []).filter((n) => n.alive).map((n) => n.nodeType) }));
  rec.ok('the player reaches a spoke zone with worker-owned gather nodes',
    inZone.zone === spoke.zoneId && inZone.srv && inZone.types.length > 0, inZone);
  if (inZone.zone !== spoke.zoneId || !inZone.types.length) {
    rec.skip('the harvest shield reaches the worker', 'no live gather node in ' + inZone.zone);
    await P.ctx.close().catch(() => {});
    return;
  }

  /* ── stand at whatever node the worker rolled, and press the prompt a
        finger would press ── */
  const nodeAt = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const n = (S.gatherNodes || []).find((g) => g.alive);
    if (!n) return null;
    S.player.x = n.x; S.player.y = n.y - 24; S.player.vx = 0; S.player.vy = 0;
    /* Since v2.3.1448 proximity alone does not open the shell — "only when a
       user touches the resource on screen does the resource extraction menu
       pop up" — so the tap is what publishes S._nearNode.  Set the same way
       mp-lifeskill does: the canvas hit-test is not what is under test here,
       the wire is, and the BUTTON below is still clicked for real. */
    S._tapNode = n;
    return { id: n.id, x: n.x, y: n.y, nodeType: n.nodeType };
  });
  /* nodeType -> the skill startExtraction records and the `ex` code the client
     broadcasts on `move` (BroTown's node prompt / v2.3.1092). */
  const SKILL = { tree: 'woodcutting', fishSpot: 'fishing', oreVein: 'mining' };
  const EXCODE = { woodcutting: 'chop', fishing: 'fish', mining: 'mine' };
  const wantSkill = SKILL[nodeAt && nodeAt.nodeType] || 'woodcutting';
  await H.waitFor(P, (S) => (S._nearNode ? S._nearNode.id : null), (v) => v === nodeAt.id,
    { timeout: 15000, label: 'the tree becomes interactable' }).catch(() => {});
  const prompted = await P.page.locator('#bt-node-prompt').count().catch(() => 0);
  rec.ok('the node offers its harvest prompt', prompted >= 1, { prompted, nodeAt });
  await P.page.locator('#bt-node-prompt').first().click({ timeout: 5000 }).catch(() => {});
  await P.page.waitForTimeout(1200);

  const clientEx = await H.readState(P, (S) => (S._extraction ? S._extraction.skill : null));
  rec.ok('the client believes it is harvesting', clientEx === wantSkill, { clientEx, wantSkill, nodeAt });
  const wire = await H.wireCounts(P);
  rec.ok('...and it TRIED to tell the worker (extraction_start on the wire)',
    (wire.extraction_start || 0) >= 1, wire);

  /* ═══ THE REGRESSION ═══
     Before v2.3.1704 the two assertions above both passed and these did not:
     the shim dropped the message, so the worker held no extraction record for
     anyone, ever, and the shield it gates could not engage once. */
  const srv = await serverHarvest(wsPort, myId);
  rec.ok('THE WORKER actually received it (a real extraction record exists)',
    srv.extracting === true, srv);
  rec.ok('...the harvest activity code is arriving on `move` too',
    srv.ex === EXCODE[wantSkill], { srv, want: EXCODE[wantSkill] });
  rec.ok('...so the shield monsters read is UP', srv.shield === true, srv);

  /* ═══ AND IT ENDS ═══
     A shield that can stick is a worse bug than the one being fixed, so prove
     the real client releases it.  Walking away is the cancel a player hits
     most (v2.3.1500 cancels on the joystick itself, before you have moved far
     enough for the radius to notice) — which is exactly why the worker-side
     shield keys off the harvest code and not off a timer. */
  await H.nudge(P, 'w', 700);
  await P.page.waitForTimeout(1200);
  const after = await H.readState(P, (S) => (S._extraction ? S._extraction.skill : null));
  rec.ok('walking away cancels the extraction on the client', after === null, after);
  const srvAfter = await serverHarvest(wsPort, myId);
  rec.ok('...and the WORKER drops the shield with it — no lingering immunity',
    srvAfter.shield === false, srvAfter);

  await P.ctx.close().catch(() => {});
}
