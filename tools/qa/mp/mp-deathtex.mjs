/* ═══ DOES TEXTURE MEMORY COME BACK WHEN YOU DIE? (v2.3.2328) ═══
 *
 * mp-texdrift asked this for the WALK-OUT and v2.3.2272 answered it: the map
 * and the monster variant sheets are released a beat after you leave a spoke,
 * and the hub-to-hub steady state stopped growing.
 *
 * It never asked the same question about the other exit, which is dying -- and
 * dying is by far the more common way to leave a combat zone.  It went through
 * a completely different function (`applyLocalRespawn`, game/respawn.js), which
 * reassigned `S.currentZone` and rebuilt the map and freed NOTHING.  So a death
 * in ember stranded the whole fire-goblin bundle plus the map, and permanently:
 * a map left behind in `_residentZoneMaps` never re-arms the entry gate that
 * would have freed it on a later visit, so no subsequent transition cleaned up
 * after it either.
 *
 * The measurement is the same one for the same reason -- `__btTex()` counts
 * decoded w*h*4 rather than file size, because 7.8 MB of PNG on disk is 122 MB
 * of RGBA in the GPU, which is why this class of leak has never looked like a
 * problem from a directory listing, and because a byte count is
 * device-independent enough to mean something from a headless box.
 *
 * HOW THE DEATH IS INDUCED, and what that does and does not prove.  There are
 * exactly two callers of applyLocalRespawn: the worker's `player_respawned`
 * message (wsClient.js:1867) and the stuck-dead watchdog in the game loop
 * (BroTown.jsx:4266, v2.3.1822).  This scenario goes through the WATCHDOG,
 * because it is the one a page can reach on its own -- forging the message
 * would mean forging a privileged server event, which the client is built to
 * refuse and a test has no business teaching it to accept.
 *
 * So the page is put into the exact state the watchdog exists for: `_dying`
 * set, `_deathStart` older than its 20s floor, and hp positive on the wire,
 * which is the "the worker says I am alive and I am still on the floor"
 * condition.  The watchdog then calls applyLocalRespawn itself, unstubbed.
 * Both callers pass through the same function, so the release under test is
 * the same release either way -- but this proves it for the watchdog path
 * literally and for the message path by that shared code, not by observation.
 *
 * SAMPLED AT THE HUB BOTH TIMES.  Before the trip and after the respawn the
 * player is standing in town with town's art on screen, so the only thing that
 * can differ between the two readings is what the client kept from a zone it is
 * no longer standing in.
 */
import * as H from './harness.mjs';

const TILE = 32;

const stand = (P, x, y) => P.page.evaluate(({ px, py }) => {
  const S = window._gameState && window._gameState.current;
  if (!S || !S.player) return false;
  S.player.x = px; S.player.y = py;
  return true;
}, { px: x, py: y }).catch(() => false);

const tex = (P) => P.page.evaluate(() => (window.__btTex ? window.__btTex() : null));

async function goto(P, list, zoneId) {
  const mark = await P.page.evaluate(({ which, z }) => {
    const f = window._gameFns || {};
    const arr = (which === 'town' ? f.TOWN_EXITS : f.WORLDVIEW_EXITS) || [];
    const e = arr.find((x) => x.zoneId === z);
    return e ? { tx: e.tx, ty: e.ty } : null;
  }, { which: list, z: zoneId });
  if (!mark) return null;
  await stand(P, mark.tx * TILE + 16, mark.ty * TILE + 16);
  await H.waitFor(P, (S) => S.currentZone, (z) => z === zoneId, { timeout: 40000 }).catch(() => {});
  await P.page.waitForTimeout(4000);   /* past the per-zone overlay */
  return H.readState(P, (S) => S.currentZone);
}

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Reaper', wsPort, webPort,
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  const t0 = await tex(P);
  rec.ok('the resident-texture probe answers (guard)',
    !!(t0 && typeof t0.mb === 'number' && t0.mb > 0), t0);
  if (!t0) { await P.ctx.close().catch(() => {}); return; }
  console.log('    town (baseline): ' + t0.mb + 'MB');

  /* The quests open the gate out of town. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    if (S && S.channel) for (const q of ['tut_1', 'tut_2', 'tut_3', 'tut_4']) {
      S.channel.send({ type: 'quest_accept', payload: { questId: q } });
    }
  });
  await P.page.waitForTimeout(1500);

  const hub = await goto(P, 'town', 'worldview');
  rec.ok('reached the worldview hub (guard)', hub === 'worldview', { hub });
  if (hub !== 'worldview') { await P.ctx.close().catch(() => {}); return; }
  const tHub = await tex(P);
  console.log('    worldview (the baseline the respawn is compared against): ' + tHub.mb + 'MB');

  /* ember is the heaviest spoke -- the fire goblin bundle alone is ~30MB
     decoded -- so it is where a stranded zone is unmistakable rather than
     arguable. */
  const inZone = await goto(P, 'worldview', 'ember');
  rec.ok('reached ember, the heavy spoke (guard)', inZone === 'ember', { inZone });
  if (inZone !== 'ember') { await P.ctx.close().catch(() => {}); return; }
  const tIn = await tex(P);
  console.log('    in ember: ' + tIn.mb + 'MB  (+' + (tIn.mb - tHub.mb).toFixed(1) + ' over the hub)');
  rec.ok('...and standing in it actually costs texture, so there is something to free (guard)',
    tIn.mb > tHub.mb + 5, { hub: tHub.mb, ember: tIn.mb });

  /* DIE, then present the watchdog with its own condition (see the header):
     down, down for longer than its 20s floor, and the wire says we are alive. */
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    S.rpg.hp = 0; S._dying = true; S._deathStart = Date.now() - 21000;
    S.rpg.hp = S.rpg.maxHp || 50;   /* the worker reporting us up again */
  });
  const back = await H.waitFor(P, (S) => (S._dying ? null : S.currentZone),
    (z) => z === 'town', { timeout: 40000, label: 'respawn into town' }).catch(() => null);
  rec.ok('the death respawned us in town (guard)', back === 'town', { back });
  if (back !== 'town') { await P.ctx.close().catch(() => {}); return; }

  /* The release is deliberately one beat late (releaseLeftZoneArt, 400ms) so it
     cannot pull sheets out from under displays the renderer has not torn down
     yet. Wait well past it, or this samples the moment before the release. */
  await P.page.waitForTimeout(5000);
  const tAfter = await tex(P);
  console.log('    town after dying in ember: ' + tAfter.mb + 'MB');

  /* THE ASSERTION. Both readings are taken in a hub with hub art on screen, so
     a difference is what ember left behind. Before v2.3.2328 this was the full
     bundle plus the map and it never came back at all. */
  const stranded = tAfter.mb - tHub.mb;
  rec.ok('dying releases the zone you died in, like walking out of it does',
    stranded < 8, { worldviewBaseline: tHub.mb, inEmber: tIn.mb, afterDeath: tAfter.mb,
      strandedMb: +stranded.toFixed(1), allowanceMb: 8 });

  if (stranded >= 8) {
    const now = await P.page.evaluate(() => window.__btTex(true));
    const keep = (now && now.list ? now.list : []).filter((r) => r.mb > 0.3).slice(0, 12);
    console.log('    still resident, largest first:');
    keep.forEach((r) => console.log('      ' + String(r.mb).padStart(7) + 'MB  ' + r.k));
  }

  /* And the map specifically: a zone map left in _residentZoneMaps is the half
     that also breaks the entry gate, so no LATER transition would free it. */
  const mapResident = await P.page.evaluate(() => {
    const f = window._gameFns || {};
    return f.isZoneMapResident ? !!f.isZoneMapResident('ember') : null;
  });
  if (mapResident === null) rec.skip('the ember map is evicted too', 'isZoneMapResident is not exposed to scenarios');
  else rec.ok('...including its ~6MB map, so the entry gate re-arms next visit', mapResident === false, { mapResident });

  await P.ctx.close().catch(() => {});
}
