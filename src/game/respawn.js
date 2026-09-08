/* ═══════════════════════════════════════════════════════════════════
   LOCAL RESPAWN — standing back up, in one place
   ═══════════════════════════════════════════════════════════════════
   v2.3.1822.  Owner: "I also died while I was on another tab and my
   character just got stuck there.  I had to wait for a monster to attack me
   again and die again while it was my active screen to respawn in town."

   The whole of the client's "you are alive again" sequence used to live
   inline in ONE message handler (wsClient's `case 'player_respawned'`), which
   made receiving that single message the only way out of the death state.  A
   backgrounded tab's socket is suspended by the browser, so the message the
   worker sent five seconds after the death went nowhere, and `S._dying`
   stayed true forever — the freeze the owner hit.

   The real fix is on the worker (it now records an undelivered respawn and
   replays it on rejoin), but a client that can only be rescued by a message
   is a client that will be stuck again the next time a message is lost.  So
   the sequence lives here, and the game loop has a watchdog that can run it
   directly.  Keeping ONE copy is the point: the handler and the watchdog
   drifting apart would be a half-respawn, which is worse than either. */

import { BT_AUDIO, ZONES, TILE, generateZoneMap, updateZoneDimensions } from '@/data/index.js';
import { releaseLeftZoneArt } from '@/game/zoneTransitions.js'; /* v2.3.2328: dying is leaving a zone */

/**
 * Put the player back on their feet in `zone`.  Idempotent enough to call
 * from either the wire handler or the watchdog.
 *
 * @param {object} S     the game state
 * @param {string} zone  where the worker says we are standing (defaults town)
 */
export function applyLocalRespawn(S, zone) {
  if (!S) return;
  /* v2.3.1127: dying inside a dungeon leaves it -- clear the dungeon flags
     the legacy path left stale (harmless then, but a stale _serverDungeon
     would suppress the local wave engine and pin the synthetic ZONES
     entry). */
  if (S._serverDungeon) {
    if (ZONES[S._serverDungeon] && ZONES[S._serverDungeon]._instance) delete ZONES[S._serverDungeon];
    S._serverDungeon = null;
  }
  S._inDungeon = false;
  S._inCustomDungeon = false;
  S._customDungeonConfig = null;
  S._dungeonComplete = false;
  S._dungeonBossSpawned = false;
  /* v2.3.2328: release the art of the zone we are leaving BY DYING.  Every
     other exit from a combat zone frees its map and its monster variant
     sheets; this one never did, so the zone you died in stayed resident for
     the life of the page -- ~36.5 MB for a death in ember, and permanently,
     because a map left in _residentZoneMaps never re-arms the entry gate that
     would have freed it later.  See releaseLeftZoneArt for why both halves are
     deferred here when the walk-out frees the map immediately. */
  var _diedIn = S.currentZone;
  S.currentZone = zone || 'town';
  try { releaseLeftZoneArt(_diedIn, S.currentZone); } catch (e) {}
  updateZoneDimensions(S.currentZone);
  try { BT_AUDIO.startZoneAmbient(S.currentZone); } catch (e) {}
  S.map = generateZoneMap(S.currentZone);
  S.monsters = [];
  S.lockedTarget = null;   /* v2.3.2242 (post-review): the monsters it pointed at are gone with the zone */
  S.gatherNodes = [];
  if (S.player) {
    S.player.x = (ZONES[S.currentZone] ? ZONES[S.currentZone].w / 2 : 16) * TILE;
    S.player.y = (ZONES[S.currentZone] ? ZONES[S.currentZone].h / 2 : 16) * TILE;
  }
  S.respawnTimer = Date.now() + 3000;
  S._deathStart = 0;
  S._dying = false;
  /* Tell the server our new position + zone + dead=false.  Other clients
     clear our _isDead via the broadcast. */
  if (S.channel && S.player) {
    try {
      S.channel.send({ type: 'broadcast', event: 'move', payload: { x: S.player.x, y: S.player.y, z: S.currentZone, vx: 0, vy: 0 } });
      S.channel.send({ type: 'broadcast', event: 'player_respawned', payload: { id: S.myId } });
    } catch (e) {}
  }
  try { localStorage.setItem('bt_rpg', JSON.stringify(S.rpg)); } catch (e) {}
}
