/* WIND DUNES: THE SPAWN YOU CANNOT LEAVE (v2.3.2122).
 *
 * Owner, after the live demo: "the desert winds level blocks you when you try
 * to exit.  Unwalkable path you spawn on."
 *
 * Wind Dunes is zone `sky`, entered from the World View's NE trail-head
 * (39,12).  That `dir: 'ne'` arrival is the one under test — it is the only
 * diagonal spoke that is open, so it is the only one anybody played.
 *
 * WHAT THIS ASKS THE GAME, rather than asking the source:
 *   - where does the arrival actually put you;
 *   - is that spot solid, per the client's OWN isSolid (window.__btIsSolid,
 *     v2.3.2078) — the same predicate movement uses, so it cannot disagree
 *     with what the player felt;
 *   - where did the return marker (tile 9) land;
 *   - can you WALK from one to the other — stepped in half-tiles along the
 *     line, which is the honest version of "is the path unwalkable";
 *   - and does standing on the marker actually take you home.
 *
 * The last one is the owner's sentence in full: "blocks you when you try to
 * exit" is satisfied by a marker you cannot reach AND by a marker that does
 * nothing when you stand on it, and those are different bugs.
 */
import * as H from './harness.mjs';

const TILE = 32;

const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py;
  return true;
}, { px: x, py: y });

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Dunes', wsPort, webPort });
  await H.enterWorld(P);
  await P.page.waitForTimeout(1500);

  /* Every zone the tutorial names is gated (v2.3.1817), and the town gate
     itself needs tut_1, so take the chain far enough to be allowed into the
     dunes.  Accepting is what opens a zone — completing is not required. */
  await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.channel) return;
    for (const q of ['tut_1', 'tut_2', 'tut_3']) {
      S.channel.send({ type: 'quest_accept', payload: { questId: q } });
    }
  });
  await P.page.waitForTimeout(2500);

  const marks = await P.page.evaluate(() => {
    const f = window._gameFns || {};
    return {
      townExit: (f.TOWN_EXITS || []).find((e) => e.zoneId === 'worldview') || null,
      sky: (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId === 'sky') || null,
    };
  });
  if (!marks.townExit || !marks.sky) {
    rec.skip('Wind Dunes can be entered at all', 'no exit tables on the bridge');
    await P.ctx.close().catch(() => {});
    return;
  }

  /* town -> World View -> Wind Dunes, both legs by walking onto the real
     trail-head, so the arrival is the one a player gets. */
  await stand(P, marks.townExit.tx * TILE + 16, marks.townExit.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview',
    { timeout: 30000, label: 'reach the World View' }).catch(() => {});
  await P.page.waitForTimeout(600);
  await stand(P, marks.sky.tx * TILE + 16, marks.sky.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'sky',
    { timeout: 30000, label: 'reach the Wind Dunes' }).catch(() => {});
  await P.page.waitForTimeout(1200);

  const arrived = await H.readState(P, (S) => S.currentZone);
  rec.ok('the Wind Dunes can be entered from the World View', arrived === 'sky', arrived);
  if (arrived !== 'sky') { await P.ctx.close().catch(() => {}); return; }

  /* ── WHERE YOU LANDED, AND WHETHER IT IS SOLID ── */
  const spawn = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const solid = window.__btIsSolid;
    const P0 = S.player;
    /* THE GAME'S OWN BODY TEST.  BroTown's movement step accepts a position
       only if all four corners at +/-hs are clear (hs = 10), so that — not a
       single centre-point sample — is what decides whether the player can
       physically occupy a spot.  A centre point can be legal while the body
       overlaps a wall, and that is exactly the shape of the reported bug. */
    const HS = 10;
    const bodyClear = (x, y) => !solid(x - HS, y - HS) && !solid(x + HS, y - HS)
      && !solid(x - HS, y + HS) && !solid(x + HS, y + HS);
    const ring = [];
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      ring.push(bodyClear(P0.x + dx * 20, P0.y + dy * 20));
    }
    return {
      x: P0.x, y: P0.y,
      tx: Math.floor(P0.x / 32), ty: Math.floor(P0.y / 32),
      solidHere: !!solid(P0.x, P0.y),
      bodyClear: bodyClear(P0.x, P0.y),
      openNeighbours: ring.filter(Boolean).length,
    };
  });
  console.log('    spawn: ' + JSON.stringify(spawn));
  rec.ok('the arrival tile itself is walkable', !spawn.solidHere, spawn);
  rec.ok('...with the whole body clear, not just the centre point', spawn.bodyClear, spawn);
  rec.ok('...and you can step off it in every direction', spawn.openNeighbours === 8, spawn);

  /* ── WHERE THE WAY HOME IS ── */
  const ret = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const out = [];
    for (let ty = 0; ty < S.map.length; ty++) {
      for (let tx = 0; tx < S.map[ty].length; tx++) {
        if (S.map[ty][tx] === 9) out.push({ tx, ty });
      }
    }
    return out;
  });
  console.log('    return tiles: ' + JSON.stringify(ret));

  /* ═══ THE OTHER COLLIDER ═══
     isSolid covers terrain and NPCs.  Ore veins and trees block through a
     SEPARATE per-axis test in the movement step (_nodeBlock), and monsters
     through _monBlock — so a probe that only asks isSolid can report an
     arrival as clear that a player cannot stand on.  Nothing pushes NODES
     away from the arrival either: the zone-entry code pushes monsters to
     200px and says nothing about nodes.  So: what is sitting on the two
     places that matter. */
  const bodies = await P.page.evaluate((tiles) => {
    const S = window._gameState.current;
    const spots = [{ tag: 'arrival', x: S.player.x, y: S.player.y }]
      .concat(tiles.map((t) => ({ tag: 'return', x: t.tx * 32 + 16, y: t.ty * 32 + 16 })));
    const near = (list, x, y, r) => (list || []).filter((o) =>
      o && o.alive !== false && Math.hypot((o.x || 0) - x, (o.y || 0) - y) < r).length;
    return {
      serverNodes: !!S._serverGatherNodes,
      serverMonsters: !!S._serverMonsters,
      nodeCount: (S.gatherNodes || []).length,
      monCount: (S.monsters || []).length,
      spots: spots.map((s) => ({
        tag: s.tag,
        nodesWithin40: near(S.gatherNodes, s.x, s.y, 40),
        monsWithin40: near(S.monsters, s.x, s.y, 40),
      })),
    };
  }, ret);
  console.log('    bodies: ' + JSON.stringify(bodies));
  rec.ok('nothing harvestable is sitting on the arrival',
    bodies.spots[0] && bodies.spots[0].nodesWithin40 === 0, bodies);
  rec.ok('...nor on the way home',
    bodies.spots.slice(1).every((s) => s.nodesWithin40 === 0), bodies);
  rec.ok('the zone has a return marker at all', ret.length > 0, ret);
  if (!ret.length) { await P.ctx.close().catch(() => {}); return; }

  /* ── CAN YOU WALK THERE ──
     Half-tile steps along the straight line, using the game's own isSolid.
     Reported as the fraction of the way you get before something stops you,
     so a failure says WHERE it blocks rather than just that it does. */
  const walk = await P.page.evaluate((target) => {
    const S = window._gameState.current;
    const solid = window.__btIsSolid;
    const ax = S.player.x, ay = S.player.y;
    const bx = target.tx * 32 + 16, by = target.ty * 32 + 16;
    const d = Math.hypot(bx - ax, by - ay);
    let got = d;
    for (let s = 16; s <= d; s += 16) {
      const x = ax + (bx - ax) * (s / d), y = ay + (by - ay) * (s / d);
      if (solid(x, y)) { got = s; break; }
    }
    return { distTiles: d / 32, reachedTiles: got / 32, clear: got >= d };
  }, ret[0]);
  console.log('    walk to return: ' + JSON.stringify(walk));
  rec.ok('the straight line from the arrival to the way home is walkable',
    walk.clear, walk);

  /* ── AND THE MARKER ACTUALLY FIRES ── */
  await stand(P, ret[0].tx * TILE + 16, ret[0].ty * TILE + 16);
  const left = await H.waitFor(P, (S) => S.currentZone, (z) => z !== 'sky',
    { timeout: 20000, label: 'leave the Wind Dunes' }).then(() => true).catch(() => false);
  const now = await H.readState(P, (S) => S.currentZone);
  rec.ok('standing on the return marker takes you out of the Wind Dunes', left, now);
  if (!left) { await P.ctx.close().catch(() => {}); return; }
  await P.page.waitForTimeout(1200);

  /* ── AND WHERE IT PUTS YOU DOWN ──
     The World View is the ONE zone with a live walk mask (the owner traced it,
     v2.3.2076; every other mask is off).  Coming back from a spoke lands you
     "four tiles from the marker you came through, toward the hub centre" — a
     rule written when the overworld was open ground, which the mask knows
     nothing about.  The mask's generator checks the TOWN arrival and that
     every trail-head stays reachable from it; the spoke RETURN point is a
     different point and is checked nowhere.  So it is checked here. */
  const back = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const solid = window.__btIsSolid;
    const P0 = S.player;
    const HS = 10;
    const bodyClear = (x, y) => !solid(x - HS, y - HS) && !solid(x + HS, y - HS)
      && !solid(x - HS, y + HS) && !solid(x + HS, y + HS);
    const ring = [];
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      ring.push(bodyClear(P0.x + dx * 20, P0.y + dy * 20));
    }
    return {
      zone: S.currentZone, x: P0.x, y: P0.y,
      tx: Math.floor(P0.x / 32), ty: Math.floor(P0.y / 32),
      solidHere: !!solid(P0.x, P0.y),
      bodyClear: bodyClear(P0.x, P0.y),
      openNeighbours: ring.filter(Boolean).length,
    };
  });
  console.log('    back on the hub: ' + JSON.stringify(back));
  rec.ok('returning from the dunes lands you on walkable ground',
    !back.solidHere, back);
  /* ═══ THE REGRESSION THIS SCENARIO EXISTS FOR ═══
     "Is the centre point legal" was ALWAYS true here and the arrival was
     still unplayable: the measured bug put the player 8px from the wall —
     inside their own 10px half-width — so the BODY overlapped it and four of
     the eight ways out were shut.  These two are the claim, and the first is
     the one that was false: the nudge (v2.3.2122) guarantees the body fits,
     which is precisely what the movement step requires of any position. */
  rec.ok('...with the whole body clear of the wall, not just the centre point',
    back.bodyClear, back);
  rec.ok('...and there is somewhere to walk from there', back.openNeighbours > 0, back);

  /* Reaching the way home is the claim that matters: an arrival with one open
     neighbour inside a pocket of wall is still a zone you cannot leave. */
  const home = await P.page.evaluate(() => {
    const f = window._gameFns || {};
    return (f.WORLDVIEW_EXITS || []).find((e) => e.zoneId === 'town') || null;
  });
  if (home) {
    const trek = await P.page.evaluate((t) => {
      const S = window._gameState.current;
      const solid = window.__btIsSolid;
      const ax = S.player.x, ay = S.player.y;
      const bx = t.tx * 32 + 16, by = t.ty * 32 + 16;
      const d = Math.hypot(bx - ax, by - ay);
      let got = d;
      for (let s = 16; s <= d; s += 16) {
        const x = ax + (bx - ax) * (s / d), y = ay + (by - ay) * (s / d);
        if (solid(x, y)) { got = s; break; }
      }
      return { distTiles: d / 32, reachedTiles: got / 32, clear: got >= d };
    }, home);
    console.log('    walk to town marker (straight line): ' + JSON.stringify(trek));

    /* A blocked straight line is not a bug on an overworld with mountains in
       it — you walk around.  The question is whether the arrival is in a
       POCKET, so flood-fill the zone from where you landed, using the game's
       own isSolid at half-tile resolution, and ask whether the way home is in
       the reachable set at all.  That is the difference between "a detour"
       and "a zone you cannot leave". */
    const flood = await P.page.evaluate((t) => {
      const S = window._gameState.current;
      const solid = window.__btIsSolid;
      const Z = (window.__btZones || {})[S.currentZone];
      if (!Z) return { err: 'no zone dims' };
      const STEP = 16;                                  /* half a tile */
      const W = Math.ceil(Z.w * 32 / STEP), Hh = Math.ceil(Z.h * 32 / STEP);
      const seen = new Uint8Array(W * Hh);
      const at = (x, y) => y * W + x;
      const openCell = (x, y) => x >= 0 && x < W && y >= 0 && y < Hh
        && !solid(x * STEP + STEP / 2, y * STEP + STEP / 2);
      const sx = Math.floor(S.player.x / STEP), sy = Math.floor(S.player.y / STEP);
      const q = [at(sx, sy)];
      seen[at(sx, sy)] = 1;
      let head = 0, n = 0;
      while (head < q.length) {
        const i = q[head++]; n++;
        const x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= W || ny < 0 || ny >= Hh) continue;
          const j = at(nx, ny);
          if (seen[j] || !openCell(nx, ny)) continue;
          seen[j] = 1; q.push(j);
        }
      }
      const hx = Math.floor((t.tx * 32 + 16) / STEP), hy = Math.floor((t.ty * 32 + 16) / STEP);
      return {
        reachableCells: n,
        totalCells: W * Hh,
        homeReachable: hx >= 0 && hx < W && hy >= 0 && hy < Hh && !!seen[at(hx, hy)],
        homeCellOpen: openCell(hx, hy),
      };
    }, home);
    console.log('    flood: ' + JSON.stringify(flood));
    /* The clearance number is the most legible evidence for this regression:
       the bug measured 8px to the nearest blocked cell with roomy=false; the
       fix measures 24px with roomy=true.  Logged rather than asserted — the
       body test above is the assertion, this is what makes a future failure
       readable at a glance. */
    console.log('    clearance at the arrival: ' + JSON.stringify(await P.page.evaluate(() => {
      const S = window._gameState.current;
      const g = (S._tiledWalkable && S._tiledWalkable[S.currentZone]) || null;
      if (!g || !g.length) return { nogrid: true };
      const gh = g.length, gw = g[0].length;
      const Z = (window.__btZones || {})[S.currentZone];
      const mw = Z.w * 32, mh = Z.h * 32;
      const gx = Math.floor(S.player.x * gw / mw), gy = Math.floor(S.player.y * gh / mh);
      const open = (x, y) => y >= 0 && y < gh && x >= 0 && x < gw && g[y][x] !== false;
      let nearest = Infinity;
      for (let r = 1; r < 40 && nearest === Infinity; r++) {
        for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
          if (!open(gx + ox, gy + oy)) nearest = r;
        }
      }
      return { cellPx: mw / gw, nearestBlockedPx: nearest * (mw / gw) };
    })));

    rec.ok('...and the town portal is REACHABLE from where the dunes drop you',
      !!flood.homeReachable, flood);
  }

  await P.ctx.close().catch(() => {});
}
