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
  /* v2.3.2074: the resource-timing buffer defaults to 250 entries and this
     game loads far more assets than that during the loading screen, so the
     World View's map had already been evicted by the time the check below
     asked for it -- reported as "none loaded" while the map was plainly
     painted on screen. Raised before the bundle runs. */
  const P = await H.newPlayer(browser, { name: 'Rambler', wsPort, webPort,
    init: 'try { performance.setResourceTimingBufferSize(3000); } catch (e) {}' });
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
  /* v2.3.1708: INSIDE the marker (toward the hub centre), not past it.  The
     owner asked for "below the town portal" and it shipped literally in
     v2.3.1703 — which broke the portal home, because Flame Fields sits due
     north of this marker and no arrival south of it can reach that spoke
     without crossing it.  The accidental walk-back-in they were describing is
     handled by the deafness timer instead. */
  rec.ok('...landing clear of the portal rather than on top of it',
    landed.zone === 'worldview'
    && Math.abs(landed.tx - marks.townMark.tx) + Math.abs(landed.ty - marks.townMark.ty) >= 3,
    { landed, townMark: marks.townMark });

  /* ── THE GROUND UNDER YOU IS THE NEW MAP (v2.3.2074) ──
     Owner: "Use this map instead for world view."  Checked here rather than in
     a suite of its own because this is the one scenario that already stands a
     real player on the World View, and "which map is loaded" is only a real
     question once someone is standing on it.

     Read from the browser's own resource timings, so it is the file the client
     ACTUALLY FETCHED rather than the constant it was supposed to read from.
     The negative half matters just as much: worldview_v3.webp is the trial the
     owner rejected in v2.3.1420 and is still on disk, so "v4 was fetched"
     alone would not catch a swap that also left the old one loading. */
  const maps = await P.page.evaluate(() => performance.getEntriesByType('resource')
    .map((e) => e.name).filter((n) => /\/maps\/worldview/.test(n))
    .map((n) => n.split('/').pop().split('?')[0]));
  rec.ok(`the World View loaded its map (${maps.join(', ') || 'none'})`,
    maps.includes('worldview_v4.webp'), maps);
  rec.ok('...and only that one -- the reverted v3 and the old v2 stay unloaded',
    !maps.some((m) => m === 'worldview_v2.webp' || m === 'worldview_v3.webp'), maps);

  /* And it is actually PAINTED, not merely downloaded: a map that fails to
     decode leaves the zone's flat palette fill, which is a solid colour. The
     overworld is grass, sand, snow and sea, so a real render has variety. */
  const shot = await H.screenshotPixels(P);
  const ch = shot.channels || 4;
  const hues = new Set();
  let lit = 0;
  for (let y = 0; y < shot.height; y += 4) {
    for (let x = 0; x < shot.width; x += 4) {
      const i = (y * shot.width + x) * ch;
      const r = shot.data[i], g = shot.data[i + 1], b = shot.data[i + 2];
      if (r + g + b > 90) lit++;
      hues.add(`${r >> 5},${g >> 5},${b >> 5}`);
    }
  }
  rec.ok(`the World View is actually painted (${hues.size} distinct tones on screen)`,
    hues.size > 40 && lit > 0, { tones: hues.size, lit });
  await P.page.screenshot({ path: H.REPO + '/tools/qa/mp/out/worldview.png' }).catch(() => {});

  /* ── THE TOWN WALL, AND WHERE YOU LAND INSIDE IT (v2.3.2075) ──
     Owner: "Use the pinkish line around the world view rock wall for blocked
     walkability and make sure the player doesn't spawn on the line or outside
     of it."  Two claims, checked separately, and neither from the mask file:
     the grid is read as the CLIENT built it, and the wall is then walked into. */
  const wall = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const grid = (S._tiledWalkable || {}).worldview;
    if (!grid || !grid.length) return null;
    const gh = grid.length, gw = grid[0].length;
    const Z = 48 * 32;
    const solid = (x, y) => !grid[Math.floor(y * gh / Z)][Math.floor(x * gw / Z)];
    let blocked = 0;
    for (const row of grid) for (const c of row) if (!c) blocked++;
    return { gw, gh, blocked, me: { x: Math.round(S.player.x), y: Math.round(S.player.y) },
      onWall: solid(S.player.x, S.player.y) };
  });
  rec.ok(`the World View loaded its walkability mask (${wall && wall.gw}x${wall && wall.gh}, `
       + `${wall && wall.blocked} blocked cells)`,
    !!(wall && wall.blocked > 3000 && wall.blocked < 9000), wall);
  rec.ok(`you do not arrive standing on the wall (at ${wall && wall.me.x},${wall && wall.me.y})`,
    !!wall && !wall.onWall, wall);

  /* INSIDE, not merely off it. Proven by geometry rather than by trusting the
     constant: the enclosed region is the one you cannot leave without passing
     the gate, so flood-filling from the player without crossing the wall must
     reach far fewer cells than the open map outside it. */
  const enclosure = await P.page.evaluate((marksIn) => {
    const S = window._gameState.current;
    const grid = S._tiledWalkable.worldview;
    const gh = grid.length, gw = grid[0].length, Z = 48 * 32;
    const sx = Math.floor(S.player.x * gw / Z), sy = Math.floor(S.player.y * gh / Z);
    const seen = new Uint8Array(gw * gh);
    const q = [[sy, sx]]; seen[sy * gw + sx] = 1;
    let n = 0;
    while (q.length) {
      const [y, x] = q.pop(); n++;
      for (const [dy, dx] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ny = y + dy, nx = x + dx;
        if (ny < 0 || nx < 0 || ny >= gh || nx >= gw) continue;
        if (!grid[ny][nx] || seen[ny * gw + nx]) continue;
        seen[ny * gw + nx] = 1; q.push([ny, nx]);
      }
    }
    const spokes = marksIn.map((e) => {
      const gx2 = Math.floor((e.tx * 32 + 16) * gw / Z), gy2 = Math.floor((e.ty * 32 + 16) * gh / Z);
      return { zoneId: e.zoneId, reachable: !!seen[gy2 * gw + gx2] };
    });
    /* Well outside the outline on all four sides -- sky above, sea below. */
    const leaks = [['NW sky', 40, 40], ['NE sky', 1490, 40],
      ['SW sea', 40, 1490], ['SE sea', 1490, 1490]]
      .filter(([, x, y]) => seen[Math.min(gh - 1, Math.floor(y * gh / Z)) * gw
        + Math.min(gw - 1, Math.floor(x * gw / Z))]).map(([n]) => n);
    return { reachable: n, total: gw * gh, spokes, leaks };
  }, marks.spokes);
  /* v2.3.2076: the owner traced the WHOLE playable boundary, so the walkable
     area is now the grassy star with the trails on it -- about a third of the
     map -- and the mountains, the volcano, the sky and the sea are on the far
     side of the line. Both bounds matter: too small and the town has sealed
     itself in, too large and the outline has a hole and you can walk into the
     sky (measured: a band one cell thinner leaks and 61% opens up). */
  rec.ok(`the playable area is the ground the owner outlined `
       + `(${Math.round(enclosure.reachable * 100 / enclosure.total)}% of the map reachable)`,
    enclosure.reachable > enclosure.total * 0.15
    && enclosure.reachable < enclosure.total * 0.5, enclosure);
  rec.ok(`...and it does not leak past the outline (${enclosure.leaks.join(', ') || 'sky and sea are sealed off'})`,
    enclosure.leaks.length === 0, enclosure);
  /* And every spoke is still reachable ON FOOT from where you land. Section 5
     below walks to one, but `stand` teleports, so it would pass over a wall
     that had sealed the town. This is the check that would not. */
  rec.ok(`...and all ${enclosure.spokes.length} trail-heads are reachable on foot from the arrival`,
    enclosure.spokes.every((s2) => s2.reachable), enclosure.spokes);

  /* THE WALL ACTUALLY STOPS YOU. Walk due north from the arrival: the ring's
     northern stones are the only thing between the player and the open map,
     so a wall that works holds them south of it. */
  const before = await P.page.evaluate(() => Math.round(window._gameState.current.player.y));
  await P.page.keyboard.down('w');
  await P.page.waitForTimeout(2600);
  await P.page.keyboard.up('w');
  await P.page.waitForTimeout(300);
  const after = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const grid = S._tiledWalkable.worldview;
    const gh = grid.length, gw = grid[0].length, Z = 48 * 32;
    return { y: Math.round(S.player.y), x: Math.round(S.player.x),
      onWall: !grid[Math.floor(S.player.y * gh / Z)][Math.floor(S.player.x * gw / Z)] };
  });
  rec.ok(`walking north into the town wall stops you (${before} -> ${after.y}, `
       + `the wall's inner face is near 760)`,
    after.y > 745 && !after.onWall, { before, after });
  rec.ok('...and you did try -- you are not simply where you spawned',
    after.y < before - 20, { before, after });

  /* AND YOU CANNOT BE SEALED INSIDE THE STONES. The wall is new geometry over
     ground that was open yesterday, so a character who logged out against the
     old wall art can load in inside the new band. Every candidate step would
     be solid, there would be no direction out, and they would be frozen for
     good -- a worse bug than the one the wall fixes. Dropped into the band on
     purpose here, and required to walk free. */
  const escape = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const grid = S._tiledWalkable.worldview;
    const gh = grid.length, gw = grid[0].length, Z = 48 * 32;
    /* The blocked cell NEAREST the player, not the first one in scan order:
       the case this guards is a character who logged out against the town
       wall and loads in inside the new band, so the test should stand them in
       that wall rather than in a stretch of mountain nobody has been near. */
    let put = null, best = Infinity;
    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        if (grid[gy][gx]) continue;
        const wx = (gx + 0.5) * Z / gw, wy = (gy + 0.5) * Z / gh;
        const d = Math.hypot(wx - S.player.x, wy - S.player.y);
        if (d < best) { best = d; put = { x: wx, y: wy }; }
      }
    }
    S.player.x = put.x; S.player.y = put.y; S.player.vx = 0; S.player.vy = 0;
    return put;
  });
  const from = await P.page.evaluate(() => ({ x: Math.round(window._gameState.current.player.x),
    y: Math.round(window._gameState.current.player.y) }));
  await P.page.keyboard.down('s');
  await P.page.waitForTimeout(1400);
  await P.page.keyboard.up('s');
  await P.page.waitForTimeout(250);
  const got = await P.page.evaluate(() => {
    const S = window._gameState.current;
    const grid = S._tiledWalkable.worldview;
    const gh = grid.length, gw = grid[0].length, Z = 48 * 32;
    return { x: Math.round(S.player.x), y: Math.round(S.player.y),
      stillInWall: !grid[Math.floor(S.player.y * gh / Z)][Math.floor(S.player.x * gw / Z)] };
  });
  /* The property is "no longer stuck", not "travelled far": once out of the
     band normal collision applies again, and on a curved wall that can be a
     few tens of pixels later. Measured as the cell they end on. */
  rec.ok(`a player standing inside the wall can walk out of it `
       + `(${from.x},${from.y} -> ${got.x},${got.y})`,
    !got.stillInWall && (got.x !== from.x || got.y !== from.y), { escape, from, got });

  /* RE-ARM THE ARRIVAL. The walk above took ~3 s and the hub-exit latch is
     deaf for 2500 ms (HUB_EXIT_DEAF_MS), so section 2 would be testing an
     EXPIRED window and reporting a bounce that no player would ever see. Hop
     home and come back out, so what follows measures a fresh arrival. */
  await stand(P, marks.townMark.tx, marks.townMark.ty);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'town',
    { timeout: 20000, label: 'back to town to re-arm' }).catch(() => {});
  await stand(P, marks.townExit.tx, marks.townExit.ty);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview',
    { timeout: 20000, label: 'a fresh arrival on the World View' }).catch(() => {});
  rec.ok('a fresh arrival was set up for the latch checks below',
    (await where(P)).zone === 'worldview', await where(P));

  /* ── 2. the momentum that brought you here must not carry you back ──
     The owner's v2.3.1703 report: they walked south out of town, kept
     walking, and went straight back in. */
  await stand(P, marks.townMark.tx, marks.townMark.ty);
  await P.page.waitForTimeout(700);              // well inside the deaf window
  rec.ok('walking straight on into the portal does NOT bounce you back to town',
    (await where(P)).zone === 'worldview', await where(P));

  /* ── 3. …AND A MOMENT LATER THE PORTAL HOME WORKS ──
     Owner: "the portal from worldview back into town doesn't work."  The
     v2.3.1703 latch released on DISTANCE (8 tiles) and the arrival sat 4
     tiles away, so the way home stayed dead until you had wandered off and
     come back — indistinguishable, from the seat, from a broken portal. */
  await P.page.waitForTimeout(2600);             // past HUB_EXIT_DEAF_MS
  await stand(P, marks.townMark.tx, marks.townMark.ty);
  const home = await H.waitFor(P, (S) => S.currentZone, (z) => z === 'town',
    { timeout: 15000, label: 'the portal home fires' }).catch(() => null);
  rec.ok('a moment later, walking into the town portal DOES take you home',
    home === 'town', await where(P));

  /* ── 4. THE LOCK-ON DOES NOT FOLLOW YOU OUT OF THE ZONE (v2.3.1710) ──
     Owner: "locking on a monster (tap to target) continues to follow the
     monster even when you exit the zone."  S.lockedTarget holds a direct REF
     to a monster object, and the only thing that ever cleared it was the
     target DYING — a monster you walked away from is still alive, so the
     reticle, the aim assist and the auto-attack all kept pointing into the
     zone you left.  Set BEFORE the hop, deliberately: the point is that it
     survives the transition, so it has to be held when the transition runs. */
  const locked = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S) return false;
    /* Shaped the way the canvas tap path builds it (BroTown.jsx). */
    S.lockedTarget = { type: 'monster', id: 'qa-lock-1',
      ref: { id: 'qa-lock-1', x: 100, y: 100, alive: true, curHp: 10 } };
    return !!S.lockedTarget;
  });
  rec.ok('a lock-on could be set before changing zone', locked === true);

  /* ── 5. …and the spokes are still reachable from the arrival point ──
     The reason the spawn cannot sit south of the marker: Flame Fields is
     almost due north of it, so a southern arrival puts the marker on the
     straight line there.  Walk it and prove the line is clear. */
  await stand(P, marks.townExit.tx, marks.townExit.ty);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === 'worldview',
    { timeout: 30000, label: 'back out to the World View' }).catch(() => {});
  rec.ok('...the zone change carried the player out of town',
    (await where(P)).zone === 'worldview', await where(P));
  rec.ok('...and the lock did NOT come with them',
    (await H.readState(P, (S) => (S.lockedTarget ? (S.lockedTarget.id || 'held') : null))) === null,
    await H.readState(P, (S) => S.lockedTarget && S.lockedTarget.id));

  /* v2.3.1817: FROST, not ember.  Spokes are gated on the Mayor Bro step that
     names them now (_zoneUnlocked), and the only quest accepted here is tut_1
     — which opens frost.  Walking at ember therefore gets turned back, which
     is the gate working, but it made this read as "the route to the spokes is
     blocked" when what this block tests is that the ARRIVAL POINT has a clear
     line to a spoke.  Frost tests the same line against a zone this player is
     actually allowed into.  The gate itself is covered by mp-zonegate. */
  const spoke = marks.spokes.find((s2) => s2.zoneId === 'frost') || marks.spokes[0];
  await stand(P, spoke.tx, spoke.ty);
  const atSpoke = await H.waitFor(P, (S) => S.currentZone, (z) => z === spoke.zoneId,
    { timeout: 15000, label: 'reach ' + spoke.zoneId }).catch(() => null);
  rec.ok('a straight walk from the arrival point still reaches the spoke zones',
    atSpoke === spoke.zoneId, { atSpoke, spoke });

  await P.ctx.close().catch(() => {});
}
