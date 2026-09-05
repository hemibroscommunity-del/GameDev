/* ═══ DOES A FINISHED HARVEST ACTUALLY PAY? (v2.3.2273) ═══
 *
 * Owner: "Chopped logs were not going into my inventory."
 *
 * ── WHY NOTHING CAUGHT THIS ──
 * mp-harvest walks the whole real route and drives a real extraction, and then
 * stops one step short: it waits for the gesture window to open, asserts the
 * button reads CHOP -- and walks away without ever swiping.  The log it uses
 * later it does not earn, it GRANTS:
 *
 *     await H.grant(wsPort, myId, 'item', { invKey: 'wood_pine', count: 2 })
 *
 * with the wait that follows swallowing its own timeout.  So the last link of
 * the chain -- gesture completes -> succeedExtraction -> node_strike ->
 * the worker credits the bag -> player_state carries it back -- has never been
 * exercised by anything.  The server suite cannot cover it either: its
 * fixtures push node_strike straight down a socket, which is TRAPS #18 exactly
 * (the harvest shield spent fourteen versions "green" that way).
 *
 * ── SO THIS DRIVES THE SWIPE ──
 * A real pointer stroke on the real gesture layer, not a call to
 * succeedExtraction: calling that would prove the reward path works and
 * nothing about whether a finger can reach it, and "the swipe never
 * completes" is one of the two candidate causes of the owner's report.
 * Woodcutting counts horizontal reversals (ExtractionSwipeLayer
 * repsFromGesture -> g.treewardStrokes), so the stroke below is a real
 * side-to-side chop with jitter -- the jitter is not decoration, gradeGesture
 * rejects a path with near-zero entropy as inhuman.
 *
 * ── AND IT ASKS THE WORKER, NOT THE CLIENT ──
 * The client mutates nothing locally when the server owns gather nodes
 * (lifeSkillRewards applyWoodReward: `if (!S._serverGatherNodes)`), so the
 * bag on screen is whatever player_state last said.  A client-side assertion
 * could therefore pass on a prediction that never happened, or fail on a
 * render lag.  The inventory diff below is read through the operator surface.
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

const srvInv = async (wsPort, id) => {
  const a = await H.adminPlayer(wsPort, id).catch(() => ({}));
  return (a && (a.inventory || (a.rpg && a.rpg.inventory) || (a.live && a.live.inventory))) || {};
};

/* Every key whose count went up, and by how much. */
const gained = (before, after) => {
  const out = {};
  for (const k of Object.keys(after || {})) {
    const d = (after[k] || 0) - ((before && before[k]) || 0);
    if (d > 0) out[k] = d;
  }
  return out;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Timber', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1200);
  const myId = await H.readState(P, (S) => S.myId);
  await H.instrumentWire(P);

  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (S && S.channel) S.channel.send({ type: 'quest_accept', payload: { questId: 'tut_1' } });
  });
  for (const tool of ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe']) {
    await H.grant(wsPort, myId, 'item', { invKey: tool, count: 1 }).catch(() => {});
  }
  await H.waitFor(P, (S) => (S.rpg?.inventory || {}).woodcutting_axe || 0, (n) => n >= 1,
    { timeout: 20000, label: 'the axe reaches the bag' }).catch(() => {});

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
    rec.skip('a finished chop puts a log in the bag', 'no exit tables on the _gameFns bridge');
    await P.ctx.close().catch(() => {});
    return;
  }
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

  /* ═══ ONE SPOKE, NOT A TOUR ═══
     The first cut walked every spoke looking for a tree, and that is wrong in
     a way worth writing down: the exit tables are WORLDVIEW tile coordinates,
     so once you are standing in a spoke, "walk to the next spoke's tile" is
     walking to a meaningless spot in the zone you are already in.  It found a
     tree on the first try (frost) and looked fine; the run after, it did not,
     and the whole scenario came back with zone null.
     So: frost by preference, the way mp-harvest picks it and for the same
     reason -- its snowmen are the slowest chase in the game, so a fresh
     character survives long enough to finish a harvest -- and take whatever it
     rolled.  The tree assertion below then reports honestly rather than the
     fixture wandering off to hunt for one. */
  const spoke = marks.spokes.find((s) => s.zoneId === 'frost') || marks.spokes[0];
  let zone = null, tree = null;
  for (let attempt = 0; attempt < 3 && !tree; attempt++) {
    if (!await travel(spoke.tx, spoke.ty, spoke.zoneId)) continue;
    await H.waitFor(P, (S) => (S.gatherNodes || []).filter((n) => n.alive).length, (n) => n > 0,
      { timeout: 15000 }).catch(() => {});
    tree = await H.readState(P, (S) => {
      const live = (S.gatherNodes || []).filter((n) => n.alive);
      const t = live.find((n) => n.nodeType === 'tree') || live[0] || null;
      return t ? { id: t.id, x: t.x, y: t.y, nodeType: t.nodeType,
        resourceType: t.resourceType || null, baseName: t.baseName || t.name || null,
        srv: !!S._serverGatherNodes } : null;
    });
    if (tree) zone = spoke.zoneId;
  }
  console.log('    harvesting in ' + zone + ': ' + JSON.stringify(tree));
  rec.ok('a live, worker-owned gather node was found to harvest (guard)',
    !!(tree && tree.srv), { zone, tree });
  if (!tree || !tree.srv) { await P.ctx.close().catch(() => {}); return; }
  rec.ok('...and it is a TREE, so this is the owner\'s case exactly',
    tree.nodeType === 'tree', tree);

  /* ═══ STAND WHERE A PLAYER STANDS, NOT ON THE ANCHOR ═══
     This is the whole point of the scenario and the first cut got it wrong.
     Hopping to the trunk BASE (node.y - 24) puts you 24px from the anchor,
     inside every gate there is, and the test passed while the owner's bug sat
     untouched.  A player does not stand at the base: a tree is 168px of art
     anchored at its foot and drawn IN FRONT of the character, only the trunk
     blocks movement, and the client offers CHOP anywhere inside that box plus
     a 56px pad (BroTown nodeReachDist) -- so "I am at the tree" is routinely
     120-240px from the anchor, and the worker's strike gate was a flat 110px
     radius from it.  y - 130 is an ordinary, unremarkable place to be while
     chopping: well inside the canopy, offered by the client, and 130px from
     the anchor.  If this scenario ever goes back to the base it stops testing
     the thing it exists for. */
  const STAND_Y_OFF = 130;
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
    }, { x: tree.x, y: tree.y - STAND_Y_OFF });
    await P.page.waitForTimeout(260);
    if (done) break;
  }
  await P.page.waitForTimeout(700);
  /* Say where we ended up and what each side thinks of it, so a failure below
     reads as a geometry disagreement rather than as a mystery. */
  const stance = await P.page.evaluate((id) => {
    const S = window._gameState.current;
    const n = (S.gatherNodes || []).find((g) => g.id === id);
    if (!n) return null;
    const d = Math.hypot(S.player.x - n.x, S.player.y - n.y);
    return { distToAnchor: Math.round(d), px: Math.round(S.player.x), py: Math.round(S.player.y),
      nx: Math.round(n.x), ny: Math.round(n.y),
      clientOffersHarvest: !!(S._nearNode || S._proxNode) };
  }, tree.id);
  console.log('    standing: ' + JSON.stringify(stance));
  rec.ok('the client offers a harvest from an ordinary spot in the canopy (guard)',
    !!(stance && stance.clientOffersHarvest), stance);
  /* Clear the field so a wandering monster cannot eat the tap -- the tap
     handler hit-tests monsters first, deliberately (v2.3.1448), and that is
     asserted where it is deterministic (mp-harvest), not here. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S._monstersStash = S.monsters; S.monsters = [];
  });

  const tapped = await P.page.evaluate((id) => {
    const S = window._gameState.current;
    const n = (S.gatherNodes || []).find((g) => g.id === id);
    if (!n) return { ok: false, why: 'node gone' };
    const cv = document.querySelector('canvas');
    const r = cv.getBoundingClientRect();
    const kx = S._worldScaleX || 1, ky = S._worldScaleY || 1;
    const x = r.left + (n.x - S.camera.x) * kx;
    const y = r.top + (n.y - 24 - S.camera.y) * ky;
    const mk = (type) => new TouchEvent(type, { bubbles: true, cancelable: true,
      touches: type === 'touchend' ? [] : [new Touch({ identifier: 88, target: cv, clientX: x, clientY: y })],
      changedTouches: [new Touch({ identifier: 88, target: cv, clientX: x, clientY: y })] });
    cv.dispatchEvent(mk('touchstart'));
    cv.dispatchEvent(mk('touchend'));
    return { ok: true, x: Math.round(x), y: Math.round(y) };
  }, tree.id);
  rec.ok('the node could be tapped to start the harvest (guard)', tapped.ok === true, tapped);
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S._monstersStash) { S.monsters = S._monstersStash; S._monstersStash = null; }
  });

  await H.waitFor(P, (S) => (S._extraction ? S._extraction.status : null), (v) => v === 'ready',
    { timeout: 20000, label: 'the gesture window opens' }).catch(() => {});
  const ready = await P.page.evaluate(() => (window.__btHarvest ? window.__btHarvest() : null));
  console.log('    window open: ' + JSON.stringify(ready));
  rec.ok('the gesture window opened, so there is something to swipe (guard)',
    !!(ready && ready.status === 'ready' && ready.cue), ready);
  if (!ready || ready.status !== 'ready') { await P.ctx.close().catch(() => {}); return; }

  const invBefore = await srvInv(wsPort, myId);
  const wireBefore = await H.wireCounts(P);

  /* ═══ THE SWIPE ═══
     Real pointer events on `window`, which is what ExtractionSwipeLayer binds
     (:180).  Woodcutting counts direction REVERSALS on x, so the stroke is a
     genuine side-to-side chop; the y wobble and the uneven step are there for
     gradeGesture's entropy floor (ent >= 0.04), which exists to reject exactly
     the kind of perfectly straight synthetic line a naive fixture would draw. */
  const swipe = await P.page.evaluate(async ({ cx, cy }) => {
    const fire = (type, x, y) => window.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, clientX: x, clientY: y,
      pointerId: 1, pointerType: 'touch', isPrimary: true, buttons: type === 'pointerup' ? 0 : 1,
    }));
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    fire('pointerdown', cx, cy);
    const AMP = 95;
    let strokes = 0;
    for (let s = 0; s < 40; s++) {
      const dir = s % 2 === 0 ? 1 : -1;
      for (let k = 1; k <= 6; k++) {
        const x = cx + dir * AMP * (k / 6);
        const y = cy + Math.sin(s * 1.7 + k) * 7 + (k % 2 ? 1.5 : -1.5);
        fire('pointermove', x, y);
        await sleep(11);
      }
      strokes++;
      const S = window._gameState.current;
      const ex = S && S._extraction;
      if (!ex || (ex.progress || 0) >= 1 || ex.status !== 'ready') break;
    }
    fire('pointerup', cx, cy);
    const S = window._gameState.current;
    return {
      strokes,
      exAfter: S._extraction ? { status: S._extraction.status, progress: S._extraction.progress } : null,
      probe: window.__btHarvest ? window.__btHarvest() : null,
    };
  }, { cx: ready.cue.x, cy: ready.cue.y });
  console.log('    swiped: ' + JSON.stringify(swipe));

  /* The gesture layer clears S._extraction on success (succeedExtraction), so
     "no extraction any more" is the completion signal a player would see as
     the tree falling. */
  rec.ok('the swipe filled the meter and the harvest completed',
    swipe.exAfter === null, swipe);

  await P.page.waitForTimeout(400);
  const wireAfter = await H.wireCounts(P);
  const struck = (wireAfter.node_strike || 0) - (wireBefore.node_strike || 0);
  rec.ok('...and the client told the worker about it (node_strike on the wire)',
    struck >= 1, { struck, wireBefore: wireBefore.node_strike || 0, wireAfter: wireAfter.node_strike || 0 });

  /* ═══ THE OWNER'S ASSERTION ═══
     Read from the WORKER.  With server-owned gather nodes the client grants
     nothing locally, so its bag is only ever an echo -- asking it would be
     asking the wrong copy (the tell in TRAPS #18). */
  let invAfter = {}, got = {};
  for (let i = 0; i < 20; i++) {
    await P.page.waitForTimeout(400);
    invAfter = await srvInv(wsPort, myId);
    got = gained(invBefore, invAfter);
    if (Object.keys(got).length) break;
  }
  /* v2.3.2273: and WHY, when it credited nothing.  Every gate in
     _handleNodeStrike used to be a bare `return`, so a failure here was
     indistinguishable from "the swipe never completed" -- which is how this
     symptom came to be reported three times and diagnosed from scratch three
     times.  Printed unconditionally: on a pass it says 'paid' and names the
     inventory key, which is the other half of the same evidence. */
  const strike = (await H.adminPlayer(wsPort, myId).catch(() => ({}))).live || {};
  console.log('    the worker credited: ' + JSON.stringify(got));
  console.log('    last node_strike:    ' + JSON.stringify(strike.lastStrike || null)
    + '   (strikes the switch saw: ' + (strike.strikesSeen != null ? strike.strikesSeen : '?') + ')');
  rec.ok('the worker acted on the strike rather than silently refusing it',
    !!(strike.lastStrike && strike.lastStrike.why === 'paid'), strike.lastStrike || { lastStrike: null });
  const wantType = tree.resourceType || (tree.nodeType === 'tree' ? 'wood'
    : tree.nodeType === 'fishSpot' ? 'fish' : 'ore');
  const resourceKeys = Object.keys(got).filter((k) => k.startsWith(wantType + '_'));
  rec.ok(`a finished harvest puts its resource in the bag (${wantType}_*)`,
    resourceKeys.length >= 1, { got, wantType, invBefore, invAfter });

  /* And the client is shown it, since a log the player cannot see is the same
     report.  Separate assertion so a server credit that never reaches the
     browser reads as its own failure rather than hiding inside the one above. */
  const onClient = await H.readState(P, (S) => S.rpg && S.rpg.inventory ? { ...S.rpg.inventory } : {});
  const clientHas = resourceKeys.some((k) => (onClient[k] || 0) >= (invAfter[k] || 0));
  rec.ok('...and the client\'s bag shows it too (player_state carried it back)',
    resourceKeys.length >= 1 && clientHas,
    { resourceKeys, server: resourceKeys.map((k) => invAfter[k]), client: resourceKeys.map((k) => onClient[k] || 0) });

  await P.ctx.close().catch(() => {});
}
