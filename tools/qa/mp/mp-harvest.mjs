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
  /* ═══ CLOSE THE DISTANCE IN ACCEPTED HOPS, DO NOT TELEPORT ═══
     v2.3.1706: this used to write S.player.x/y straight onto the node, and
     that is why the worker never saw the harvest.  movement.js caps a move at
     `500 * dt + 80` px and, on reject, "drops EVERYTHING so a cheater can't
     flip blocking/dodging/dead while teleporting" — `ex` rides that same
     packet, so the rejected jump took the harvest activity code with it.
     Worse, a reject does NOT write ps.x, so every later stationary move is
     still the same illegal distance from the server's stale idea of where the
     player is: once rejected, rejected forever.  The client looked perfectly
     healthy throughout (_lastBroadcastEx was 'chop'), which is exactly the
     kind of disagreement this file exists to catch — it just caught the
     harness first.
     Hops of 100px with a beat between them sit well inside the cap. */
  const hopTo = async (tx, ty) => {
    for (let i = 0; i < 40; i++) {
      const done = await P.page.evaluate(({ x, y }) => {
        const S = window._gameState.current;
        const dx = x - S.player.x, dy = y - S.player.y;
        const d = Math.hypot(dx, dy);
        if (d < 6) { S.player.vx = 0; S.player.vy = 0; return true; }
        const step = Math.min(100, d);
        S.player.x += (dx / d) * step;
        S.player.y += (dy / d) * step;
        return false;
      }, { x: tx, y: ty });
      await P.page.waitForTimeout(260);   /* > the 198ms solo move gap */
      if (done) return true;
    }
    return false;
  };
  const nodeTarget = await H.readState(P, (S) => {
    const n = (S.gatherNodes || []).find((g) => g.alive);
    return n ? { x: n.x, y: n.y - 24 } : null;
  });
  if (nodeTarget) await hopTo(nodeTarget.x, nodeTarget.y);
  await P.page.waitForTimeout(600);
  const nodeAt = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const n = (S.gatherNodes || []).find((g) => g.alive);
    if (!n) return null;
    S.player.vx = 0; S.player.vy = 0;
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
  /* Dispatched IN PAGE rather than through Playwright's .click().  The prompt
     is anchored over the node, which on a phone-sized viewport puts it under
     the bottom dashboard — Playwright refuses to click an element another
     element intercepts, and this scenario's original `.catch(() => {})`
     swallowed that refusal, so every assertion below it failed for a reason
     that had nothing to do with the code under test.  A real finger reaches
     the button (the loop re-anchors it above the dashboard on a real phone);
     the harness is the thing that cannot.  Its onClick is still the code
     path being exercised. */
  const clicked = await P.page.evaluate(() => {
    const el = document.getElementById('bt-node-prompt');
    if (!el) return false;
    el.click();
    return true;
  });
  rec.ok('the harvest prompt could be pressed', clicked);
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

  /* ═══ v2.3.1765: THE WHITE GESTURE DRAWS IN FRONT OF THE TREE ═══
     Owner: "The woodcutting cue of the white gesture is still showing in the
     layer behind the tree.  It needs to show in front of it."
     STILL, because v2.3.1713 answered this by moving the CHOPPER to
     gestureFront and left the animated finger on nodeGfx in gatherNodes,
     under the trees.  Asserted as an ORDER between two layers read off the
     live scene graph — the cue's own parent, and the parent of a real tree
     sprite this frame — rather than against a hard-coded layer name, so the
     check still means something if either side is moved again.
     Checked here because this is the one scenario that already has a real
     client mid-chop at a real worker-owned tree. */
  const cueLayers = await P.page.evaluate(() => {
    const probe = window._pixiRenderer && window._pixiRenderer.cueLayerProbe;
    const S = window._gameState && window._gameState.current;
    if (!probe || !S) return null;
    const p = probe();
    /* The tree's layer lives on the node object itself (node._pixiSprite),
       which is where _updateGatherNodes parents it. */
    const tree = (S.gatherNodes || []).find((n) => n && n.nodeType === 'tree' && n._pixiSprite && n._pixiSprite.parent);
    return { ...p, treeLayer: tree ? tree._pixiSprite.parent.label : null };
  });
  rec.ok('the cue-layer probe answered', !!cueLayers && !!cueLayers.cueLayer, cueLayers);
  if (cueLayers && cueLayers.treeLayer) {
    const depth = (l) => cueLayers.order.indexOf(l);
    /* GUARD: if the cue and the trees ever land on the SAME layer the
       comparison below is trivially satisfied by ">=" and proves nothing, so
       require a strict ordering between two distinct layers. */
    rec.ok('the cue and the trees are on different layers (guard)',
      cueLayers.cueLayer !== cueLayers.treeLayer, cueLayers);
    rec.ok('the white gesture cue draws IN FRONT of the tree it is chopping',
      depth(cueLayers.cueLayer) > depth(cueLayers.treeLayer), cueLayers);
    /* And the thing it was left behind on is genuinely below the trees —
       naming the regression so a revert fails with the reason attached. */
    rec.ok('...whereas nodeGfx, where it used to draw, is behind them',
      depth(cueLayers.nodeGfxLayer) < depth(cueLayers.treeLayer), cueLayers);
  } else {
    rec.ok('a live tree sprite was on screen to compare against', false, cueLayers);
  }

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

  /* ═══════════════════════════════════════════════════════════════════════
     v2.3.1765: COOKING AND FIREMAKING GET THE SAME PEACE
     Owner: "snowmen were still attacking me (attacks from enemies should stop
     during cooking and firemaking too)."

     This needs the same headless treatment as the harvest above and for the
     same reason, not by analogy: the worker's branch for these two keys off
     `ex` arriving as 'cook' / 'fire' on the move packet, and whether the
     SHIPPED CLIENT ever sends those codes is a fact no server suite can
     establish.  server/test/combat-lifecycle.test.mjs sets ps.ex by hand — it
     would stay green against a client that broadcasts nothing, which is
     precisely how the harvest shield spent fourteen versions not working.

     Both are driven through real UI: the log is lit from its bag item's
     "Light fire" button, and the cook is started by tapping the campfire that
     appears — the same two taps a player makes. ══════════════════════════ */
  /* ═══ WALK OFF THE NODE FIRST, AND PROVE THE OLD SHIELD IS DEAD ═══
     Not tidiness — the first version of this section lit its fire standing on
     the tree it had just been chopping, and PASSED with the entire cook/fire
     branch commented out of the worker.  The gathering record survives a
     walk-away (it is swept lazily, ten minutes later) and its own branch only
     needs a live node within EXTRACT_SHIELD_RANGE and a truthy `ex` — so
     `ex: 'fire'` re-lit the OLD shield and the assertions below read a green
     that had nothing to do with the code under test.
     So: move clear of the node, then assert the worker still holds the stale
     record while the shield is DOWN.  After that guard, any shield that comes
     up can only have come from the node-free branch. */
  if (nodeTarget) await hopTo(nodeTarget.x + 420, nodeTarget.y);
  await P.page.waitForTimeout(900);
  const offNode = await serverHarvest(wsPort, myId);
  rec.ok('...and the stale gather record is still on the worker (guard: it must not be the source)',
    offNode.extracting === true, offNode);
  rec.ok('...yet the shield is DOWN this far from the node (guard)',
    offNode.shield === false, offNode);

  await H.grant(wsPort, myId, 'item', { invKey: 'wood_pine', count: 2 }).catch(() => {});
  await H.grant(wsPort, myId, 'item', { invKey: 'fish_minnow', count: 2 }).catch(() => {});
  await H.waitFor(P, (S) => (S.rpg?.inventory || {}).wood_pine || 0, (n) => n >= 1,
    { timeout: 20000, label: 'the log and the fish reach the bag' }).catch(() => {});
  await P.page.waitForTimeout(600);

  /* ── FIREMAKING.  The window is SHORT on purpose — v2.3.1749 cut the light
        to 700ms — so the worker is polled rather than sampled once.  Polling
        is not papering over a race here: the question is "was the shield ever
        up while the fire was being lit", and a single read 900ms later
        answers a different question. ── */
  const lit = await P.page.evaluate(() => {
    const bus = window._itemDetailBus;
    const S = window._gameState && window._gameState.current;
    if (!bus || !S || !S.rpg) return false;
    bus.open({ kind: 'inventory', key: 'wood_pine', count: (S.rpg.inventory || {}).wood_pine || 0 });
    return true;
  });
  rec.ok('the log\'s item card could be opened', lit);
  await P.page.waitForTimeout(500);
  const struck = await H.clickText(P, 'Light fire').then(() => true).catch(() => false);
  rec.ok('...and it offers Light fire', struck);
  const fireSeen = await (async () => {
    const out = { ex: null, shield: false, clientFire: false };
    for (let i = 0; i < 24; i++) {
      const [srvF, cliF] = await Promise.all([
        serverHarvest(wsPort, myId),
        H.readState(P, (S) => !!S._firemaking),
      ]);
      if (cliF) out.clientFire = true;
      if (srvF.ex === 'fire') out.ex = 'fire';
      if (srvF.shield) out.shield = true;
      if (out.ex === 'fire' && out.shield) break;
      await P.page.waitForTimeout(120);
    }
    return out;
  })();
  rec.ok('the client really is lighting a fire', fireSeen.clientFire, fireSeen);
  rec.ok('...the WORKER hears the fire activity code on `move`', fireSeen.ex === 'fire', fireSeen);
  rec.ok('...so monsters are told to leave a firemaker alone', fireSeen.shield === true, fireSeen);

  /* ── COOKING.  A campfire is a client-local node (there is no server
        campfire — see the note on _extractionShielded), so this is exactly
        the case that has no anchor to bind to and needed the node-free
        branch.  Its window is comfortable: an open delay plus the swipe
        window, seconds not milliseconds. ── */
  await P.page.waitForTimeout(1400);          /* let the 700ms light finish */
  const fireNode = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    /* S._campfire, NOT S.gatherNodes: a campfire is a client-local prop with
       no server node (BroTown.jsx ~4166), which is the very reason the cook
       shield needed a node-free branch.  Looking for it in the gather list
       finds nothing and reports "no campfire" for a fire that is burning. */
    const n = S && S._campfire && S._campfire.alive ? S._campfire : null;
    if (!n) return null;
    S.player.vx = 0; S.player.vy = 0;
    S._tapNode = n;                            /* same door the harvest half uses above */
    return { x: n.x, y: n.y, zone: n.zone };
  });
  rec.ok('lighting the log actually produced a campfire to cook at', !!fireNode, fireNode);
  if (fireNode) {
    /* The campfire carries no id (it is not a server node), so wait on the
       node TYPE the prompt has latched instead. */
    await H.waitFor(P, (S) => (S._nearNode ? S._nearNode.nodeType : null), (v) => v === 'campfire',
      { timeout: 15000, label: 'the campfire becomes interactable' }).catch(() => {});
    const cookClicked = await P.page.evaluate(() => {
      const el = document.getElementById('bt-node-prompt');
      if (!el) return false;
      el.click();
      return true;
    });
    rec.ok('the campfire offers a prompt that can be pressed', cookClicked);
    await P.page.waitForTimeout(1400);
    const cookCli = await H.readState(P, (S) => (S._extraction ? S._extraction.skill : null));
    rec.ok('the client believes it is cooking', cookCli === 'cooking', cookCli);
    const srvCook = await serverHarvest(wsPort, myId);
    rec.ok('...the WORKER hears the cook activity code on `move`', srvCook.ex === 'cook', srvCook);
    /* THE ASSERTION THE OWNER'S REPORT IS ABOUT. */
    rec.ok('...so the snowmen are told to leave a cook alone', srvCook.shield === true, srvCook);
    /* And it releases, for the same reason the harvest half proves it: a
       shield that can stick is worse than the bug it fixes, and this one has
       no node whose death would end it. */
    await H.nudge(P, 'w', 700);
    await P.page.waitForTimeout(1400);
    const srvCookAfter = await serverHarvest(wsPort, myId);
    rec.ok('...and walking away from the fire drops it — no lingering immunity',
      srvCookAfter.shield === false, srvCookAfter);
  }

  await P.ctx.close().catch(() => {});
}
