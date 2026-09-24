/* ═══ v2.3.2915: A PEER CHOPS AT THE TREE, AND COOKS AT THE FIRE ═══
 *
 * Owner: "check all other broadcasted player animations to make sure they
 * match what your character does client side so there's no discrepancies."
 *
 * Chopping and cooking swap your body for a stand-in figure, and on YOUR
 * screen that figure is drawn where the work is: the lumberjack beside the
 * trunk (_updateExtractionCue: 30 px off the tree, on its ground line), the
 * cook beside the campfire (pan over the flames).  Neither skill moves you
 * there -- you chop from wherever the tree offered you the button, which the
 * mp-chopyield note measures at 120-240 px from its base, and you cook from
 * wherever you stand near your fire.  So the figure and your position differ,
 * and a watcher who draws the figure at your POSITION draws a different
 * picture from yours: a lumberjack swinging at air up in the canopy, a cook
 * frying beside the fire instead of over it.
 *
 * Two real clients.  B works; A watches.  Every case compares the two
 * screens' figures directly -- the sprites the renderers actually drew
 * (chopSpriteRaw / cookSpriteRaw, both read-only), in world units, as offsets
 * from the tree or fire both clients hold.  No formula is copied in here
 * (TRAPS §35): the owner's own screen is the reference.
 *
 *   COOK -- in town, on a fire lit through the game's own path: the bag's
 *     log tap sets exactly the S._firemaking record written below, and the
 *     game loop lights the campfire and sends campfire_lit.  Cooked from where
 *     it was lit, and again from the fire's far side.
 *   CHOP -- in Frost Ridge, on a real worker-owned tree (town has none),
 *     from the canopy spot mp-chopyield uses and from beside the trunk.
 *   MINE / FISH -- no stand-in figure (you are seated at the vein or pond),
 *     but your screen draws your vein OVER you and your line's ripples and
 *     bobber on the water; the watcher must draw a peer's the same.
 *
 * The extraction is held in its wind-up ('waiting') the way mp-cookpeer
 * holds it, so the pose stays up for as long as the measurement takes.
 *
 *   node tools/qa/mp/run.mjs gatherspot
 */
import * as H from './harness.mjs';

/* World px.  Both figures are drawn from the same strips on the same anchor,
   so where the two screens agree they agree exactly; 1.5 px is interpolation
   slack on the watcher's copy of the worker's position. */
const POS_TOL = 1.5;
const SCALE_TOL = 0.01;

/* One figure, as drawn: where its anchor sits relative to the node, which way
   it faces, how big it is.  `id` null = your own figure. */
const figure = (P, kind, id, node) => P.page.evaluate(({ kind, id, node }) => {
  const R = window._pixiRenderer;
  if (!R) return { err: 'no renderer' };
  let sp = null;
  if (kind === 'chop') sp = R.chopSpriteRaw(id);
  else { const c = R.cookSpriteRaw(id); sp = c && c.body; }
  if (!sp) return { err: 'no sprite' };
  if (!sp.visible) return { err: 'not drawn' };
  return {
    dx: +(sp.x - node.x).toFixed(2), dy: +(sp.y - node.y).toFixed(2),
    sign: sp.scale.x < 0 ? -1 : 1, scaleY: +Math.abs(sp.scale.y).toFixed(5),
  };
}, { kind, id, node });

/* Retry until the figure is up: the watcher's copy needs the relay to land. */
const figureWhenDrawn = async (P, kind, id, node, tries = 30) => {
  let last = null;
  for (let i = 0; i < tries; i++) {
    last = await figure(P, kind, id, node);
    if (last && !last.err) return last;
    await P.page.waitForTimeout(150);
  }
  return last;
};

const moveTo = (P, x, y) => H.hopTo(P, x, y);

/* Hold a harvest the way startExtraction opens one, but parked in its wind-up. */
const startHarvest = (P, skill, nodePick) => P.page.evaluate(({ skill, nodePick }) => {
  const S = window._gameState.current;
  const node = nodePick === 'campfire' ? S._campfire
    : (S.gatherNodes || []).find((n) => n && n.id === nodePick);
  if (!node) return { ok: false, why: 'node not found' };
  if (S.player) { S.player.vx = 0; S.player.vy = 0; }
  const now = Date.now();
  S._extraction = {
    nodeId: node.id, nodeRef: node, skill, startedAt: now,
    windowOpensAt: now + 600000, windowClosesAt: now + 600000 + 3000,
    status: 'waiting', swipeSamples: [],
  };
  if (skill === 'cooking') S._extraction.fishKey = 'fish_minnow';
  return { ok: true, px: S.player.x, py: S.player.y };
}, { skill, nodePick });

const stopHarvest = (P) => P.page.evaluate(() => { window._gameState.current._extraction = null; });

/* The watcher has seen the worker's harvest code arrive (the move relay). */
const waitPeerEx = async (A, bId, code) => {
  for (let i = 0; i < 40; i++) {
    const ex = await A.page.evaluate((id) => {
      const o = window._gameState.current.others[id];
      return o ? (o._ex || null) : 'gone';
    }, bId);
    if (ex === code) return true;
    await A.page.waitForTimeout(150);
  }
  return false;
};

async function compare(rec, label, A, B, bId, kind, nodeA, nodeB) {
  /* Let the relays settle (the move heartbeat is 500 ms). */
  await A.page.waitForTimeout(1300);
  const own = await figureWhenDrawn(B, kind, null, nodeB);
  const peer = await figureWhenDrawn(A, kind, bId, nodeA);
  if (!own || own.err || !peer || peer.err) {
    rec.ok(`${label}: both screens draw the figure (guard)`, false, { own, peer });
    return null;
  }
  const where = await B.page.evaluate((n) => {
    const S = window._gameState.current;
    return { fromNode: [+(S.player.x - n.x).toFixed(1), +(S.player.y - n.y).toFixed(1)] };
  }, nodeB);
  console.log(`    ${label}: worker stands ${JSON.stringify(where.fromNode)} from it; own figure ${JSON.stringify([own.dx, own.dy, own.sign])}, peer's ${JSON.stringify([peer.dx, peer.dy, peer.sign])}`);
  const off = Math.hypot(peer.dx - own.dx, peer.dy - own.dy);
  rec.ok(`${label}: the watcher draws the figure where its owner does (off by ${off.toFixed(1)} px)`,
    Math.abs(peer.dx - own.dx) <= POS_TOL && Math.abs(peer.dy - own.dy) <= POS_TOL, { own, peer, where });
  rec.ok(`${label}: ...facing the same way`, peer.sign === own.sign, { own: own.sign, peer: peer.sign });
  rec.ok(`${label}: ...at the same size`, Math.abs(peer.scaleY / own.scaleY - 1) <= SCALE_TOL,
    { own: own.scaleY, peer: peer.scaleY });
  return { own, peer, off };
}

export async function run({ browser, wsPort, webPort, rec }) {
  const { A, B } = await H.joinPair(browser, { wsPort, webPort, nameA: 'Watcher', nameB: 'Worker' });
  await H.waitMutualSight(A, B);
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);
  for (const id of [aId, bId]) await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 20 }).catch(() => null);
  /* The tools, for BOTH players: a client does not draw a node its own player
     has no tool for (v2.3.1680's gate), so without a pickaxe neither screen
     draws the vein at all and the mining comparison would be two nulls.
     Granted the way mp-chopyield grants them, through the operator surface. */
  for (const [P, id] of [[A, aId], [B, bId]]) {
    for (const tool of ['woodcutting_axe', 'fishing_pole', 'mining_pickaxe']) {
      await H.grant(wsPort, id, 'item', { invKey: tool, count: 1 }).catch(() => {});
    }
    await H.waitFor(P, (S) => ((S.rpg && S.rpg.inventory) || {}).mining_pickaxe || 0, (n) => n >= 1,
      { timeout: 20000, label: 'the tools reach the bag' }).catch(() => {});
  }
  rec.ok('probes present: the renderer\'s read-only chop and cook getters (guard)',
    await A.page.evaluate(() => { const R = window._pixiRenderer;
      return !!R && typeof R.chopSpriteRaw === 'function' && typeof R.cookSpriteRaw === 'function'; }), {});

  /* ═══ COOK, in town ═══ */
  await B.page.evaluate(() => {
    const S = window._gameState.current;
    if (S.player) S.player.x += 90;   /* stand clear of the watcher */
  });
  await B.page.waitForTimeout(700);
  await B.page.evaluate(() => {
    const S = window._gameState.current;
    const now = Date.now();
    S._firemaking = { startedAt: now, doneAt: now + 700, x: S.player.x, y: S.player.y + 6 };
  });
  const fireB = await H.waitFor(B, (S) => (S._campfire ? { x: S._campfire.x, y: S._campfire.y } : null),
    (v) => !!v, { timeout: 8000, label: 'the campfire is lit' }).catch(() => null);
  let fireA = null;
  for (let i = 0; i < 30 && !fireA; i++) {
    fireA = await A.page.evaluate((id) => {
      const m = window._gameState.current._peerCampfires;
      const f = m && m.get(String(id));
      return f ? { x: f.x, y: f.y } : null;
    }, bId);
    if (!fireA) await A.page.waitForTimeout(150);
  }
  rec.ok('the worker lights a fire and the watcher receives it (guard)',
    !!fireB && !!fireA && Math.abs(fireA.x - fireB.x) < 0.01 && Math.abs(fireA.y - fireB.y) < 0.01, { fireB, fireA });
  if (fireB && fireA) {
    /* 1. From where it was lit. */
    const s1 = await startHarvest(B, 'cooking', 'campfire');
    const saw1 = await waitPeerEx(A, bId, 'cook');
    rec.ok('the watcher sees the worker start cooking (guard)', s1.ok && saw1, { s1, saw1 });
    await compare(rec, 'cook, from where the fire was lit', A, B, bId, 'cook', fireA, fireB);
    await stopHarvest(B);
    /* 2. From the fire's far side: walk round it, then cook. */
    await moveTo(B, fireB.x - 55, fireB.y - 40);
    await B.page.waitForTimeout(500);
    const s2 = await startHarvest(B, 'cooking', 'campfire');
    const saw2 = await waitPeerEx(A, bId, 'cook');
    rec.ok('...and again from the other side of the fire (guard)', s2.ok && saw2, { s2, saw2 });
    await compare(rec, 'cook, from the far side of the fire', A, B, bId, 'cook', fireA, fireB);
    await stopHarvest(B);
  }

  /* ═══ CHOP, in Frost Ridge (town has no trees) ═══ */
  await H.warpToZone(B, { wsPort, label: 'Frost Ridge', zoneId: 'frost' }).catch(() => null);
  await H.warpToZone(A, { wsPort, label: 'Frost Ridge', zoneId: 'frost' }).catch(() => null);
  for (const id of [aId, bId]) await H.devOp(wsPort, 'vitals', id, { heal: true, god: true, godMinutes: 20 }).catch(() => null);
  const zones = { A: await H.readState(A, (S) => S.currentZone), B: await H.readState(B, (S) => S.currentZone) };
  rec.ok('both players are in Frost Ridge (guard)', zones.A === 'frost' && zones.B === 'frost', zones);
  if (zones.A !== 'frost' || zones.B !== 'frost') { await A.ctx.close().catch(() => {}); await B.ctx.close().catch(() => {}); return; }
  await H.waitFor(B, (S) => (S.gatherNodes || []).filter((n) => n && n.alive && n.nodeType === 'tree').length,
    (n) => n > 0, { timeout: 15000, label: 'trees arrive' }).catch(() => null);
  /* The tree nearest the worker that the watcher holds too, by id. */
  const tree = await B.page.evaluate(() => {
    const S = window._gameState.current;
    const live = (S.gatherNodes || []).filter((n) => n && n.alive && n.nodeType === 'tree');
    live.sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y));
    const t = live[0];
    return t ? { id: t.id, x: t.x, y: t.y, srv: !!S._serverGatherNodes } : null;
  });
  const treeA = tree ? await A.page.evaluate((id) => {
    const n = (window._gameState.current.gatherNodes || []).find((g) => g && g.id === id);
    return n ? { x: n.x, y: n.y } : null;
  }, tree.id) : null;
  rec.ok('a worker-owned tree both clients hold (guard)',
    !!(tree && tree.srv && treeA && Math.abs(treeA.x - tree.x) < 0.01 && Math.abs(treeA.y - tree.y) < 0.01), { tree, treeA });
  if (tree && treeA) {
    const spots = [
      { label: 'chop, from the canopy (mp-chopyield\'s spot)', x: tree.x + 8, y: tree.y - 130 },
      { label: 'chop, from beside the trunk', x: tree.x - 95, y: tree.y - 12 },
    ];
    for (const sp of spots) {
      await moveTo(B, sp.x, sp.y);
      await moveTo(A, sp.x - 140, sp.y + 70);   /* the watcher close enough to draw the worker */
      await B.page.waitForTimeout(600);
      const st = await startHarvest(B, 'woodcutting', tree.id);
      const saw = await waitPeerEx(A, bId, 'chop');
      rec.ok(`${sp.label}: the watcher sees the worker start chopping (guard)`, st.ok && saw, { st, saw });
      await compare(rec, sp.label, A, B, bId, 'chop', treeA, tree);
      await stopHarvest(B);
      await B.page.waitForTimeout(400);
    }
  }

  /* ═══ MINE and FISH: the two harvests that SEAT you (startExtraction puts
     you at a fixed offset from the vein or pond).  No stand-in figure -- your
     own screen draws two other things for them, and those are compared: the
     ore you are mining drawn OVER you (so it hides the rock baked into the
     swing), and the ripples and bobber where your line lands. ═══ */
  const seatOf = await B.page.evaluate(() => {
    const S = window._gameState.current;
    const near = (type) => {
      const live = (S.gatherNodes || []).filter((n) => n && n.alive !== false && n.nodeType === type);
      live.sort((a, b) => Math.hypot(a.x - S.player.x, a.y - S.player.y) - Math.hypot(b.x - S.player.x, b.y - S.player.y));
      return live[0] ? { id: live[0].id, x: live[0].x, y: live[0].y } : null;
    };
    return { vein: near('oreVein'), pond: near('fishSpot') };
  });
  /* Seated exactly where startExtraction seats you: the offsets are
     MINE_SEAT / FISH_SEAT in data/constants.js (-7,-86 and +52,-43). */
  const seat = async (node, dx, dy) => {
    await moveTo(B, node.x + dx, node.y + dy);
    await B.page.evaluate(({ x, y }) => {
      const S = window._gameState.current;
      S.player.x = x; S.player.y = y; S.player.vx = 0; S.player.vy = 0;
    }, { x: node.x + dx, y: node.y + dy });
    await moveTo(A, node.x + dx - 150, node.y + dy + 60);
    await B.page.waitForTimeout(600);
  };
  const layerOf = (P, id) => P.page.evaluate((nid) => {
    const n = (window._gameState.current.gatherNodes || []).find((g) => g && g.id === nid);
    const sp = n && n._pixiSprite;
    return sp && sp.parent ? (sp.parent.label || '?') : null;
  }, id);
  rec.ok('a worker-owned ore vein and fishing spot in Frost Ridge (guard)', !!(seatOf.vein && seatOf.pond), seatOf);
  if (seatOf.vein) {
    await seat(seatOf.vein, -7, -86);
    const st = await startHarvest(B, 'mining', seatOf.vein.id);
    const saw = await waitPeerEx(A, bId, 'mine');
    rec.ok('mine: the watcher sees the worker start mining (guard)', st.ok && saw, { st, saw });
    await A.page.waitForTimeout(900);
    const own = await layerOf(B, seatOf.vein.id), peer = await layerOf(A, seatOf.vein.id);
    console.log(`    mine: the vein is drawn in '${own}' on the miner's screen, '${peer}' on the watcher's`);
    rec.ok('mine: the miner\'s own screen lifts the vein over them (guard: the thing being matched)', own === 'overlayWorld', { own });
    rec.ok(`mine: the watcher draws the ore OVER the miner, as the miner's own screen does (own '${own}', watcher '${peer}')`,
      !!own && own === peer, { own, peer });
    await stopHarvest(B);
    await B.page.waitForTimeout(500);
  }
  if (seatOf.pond) {
    await seat(seatOf.pond, 52, -43);
    const st = await startHarvest(B, 'fishing', seatOf.pond.id);
    const saw = await waitPeerEx(A, bId, 'fish');
    rec.ok('fish: the watcher sees the worker start fishing (guard)', st.ok && saw, { st, saw });
    await A.page.waitForTimeout(900);
    const holes = async (P) => P.page.evaluate(() => (window.__btFishHoles ? window.__btFishHoles() : null));
    const ownH = await holes(B), peerH = await holes(A);
    const mineH = (ownH || []).find((h) => h.who === 'self');
    const theirs = (peerH || []).find((h) => h.who === bId);
    console.log(`    fish: line in the water at ${JSON.stringify(mineH)} on the angler's screen, ${JSON.stringify(theirs)} on the watcher's`);
    rec.ok('fish: the watcher draws the ripples and bobber where the angler\'s own screen does',
      !!(mineH && theirs && Math.abs(mineH.x - theirs.x) < 0.5 && Math.abs(mineH.y - theirs.y) < 0.5), { ownH, peerH });
    await stopHarvest(B);
  }
  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
