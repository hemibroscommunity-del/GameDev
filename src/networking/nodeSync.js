import { createGatherNode, ZONES } from '@/data/index.js';

/* === nodeSync — gather-node snapshot self-heal (v2.3.1301) ===
 *
 * Owner bug report (two-player session): one player's resource nodes
 * (fishing/mining/etc) never appeared while the other player, standing
 * in the same zone, saw them.  Root cause is a delivery race with no
 * recovery path:
 *
 *   - The server emits the zone's node list exactly ONCE, from
 *     _handleMove, and only when the client's move packet flips ps.z
 *     (server/src/movement.js).  If that single crossing packet is
 *     lost — or the snapshot arrives a frame before S.currentZone
 *     flips and the stale-zone guard discards it (v2.3.136) — the
 *     client has no nodes.
 *   - S._serverGatherNodes latches true on the first state_sync (the
 *     join payload always carries a nodes array, even empty in town),
 *     so the legacy local spawnGatherNodes fallback never runs.
 *   - Per-tick node deltas only mutate nodes that already exist by id
 *     — they can never CREATE one.  Empty stays empty until the player
 *     leaves and re-enters.
 *
 * Two self-heal mechanisms, both client-only and deploy-order safe:
 *
 *   1. BUFFER, don't drop: the wsClient stale-zone guards now stash a
 *      mismatched snapshot here instead of discarding it; onZoneEntered
 *      applies it if the newly-entered zone matches.
 *   2. RECLAIM: after entering a non-safe zone, if the node list is
 *      still empty on a 2s check (max 4 tries), re-send the current
 *      move packet (position + z).  If the original crossing move was
 *      lost, the server's z-flip detection fires on the re-send and
 *      re-emits the zone_state snapshot.  No new event types.
 */

export function stashPendingZoneNodes(S, zone, nodes) {
  S._pendingZoneNodes = { zone: zone, nodes: nodes };
}

/* Thicken the worker's minimal node payload into the full client node
   shape — same recipe as the wsClient appliers (forced tierLvl so two
   clients agree on tier per server node id). */
function _applyNodes(S, zone, nodes) {
  S.gatherNodes = nodes.map(function (n) {
    var local = createGatherNode(zone, 'shallow', n.x, n.y, n.nodeType, n.tierLvl);
    local.id = n.id;
    local.alive = !!n.alive;
    local.respawnAt = n.respawnAt || 0;
    return local;
  });
}

/* Call on EVERY zone entry (all three zoneTransitions entry paths),
   after the legacy !_serverGatherNodes fallback has had its chance. */
export function onZoneEntered(S, zoneId) {
  if (S._nodeResyncT) { clearInterval(S._nodeResyncT); S._nodeResyncT = null; }
  var cfg = ZONES[zoneId];
  if (cfg && cfg.safe) {
    /* Safe zones never have resource nodes (v2.3.136) — drop any
       buffered snapshot so it can't leak later. */
    S._pendingZoneNodes = null;
    return;
  }
  var p = S._pendingZoneNodes;
  if (p && p.zone === zoneId && p.nodes) {
    _applyNodes(S, zoneId, p.nodes);
    S._pendingZoneNodes = null;
    return;
  }
  if (!S._serverGatherNodes) return; /* legacy local spawn already ran */
  var tries = 0;
  S._nodeResyncT = setInterval(function () {
    tries++;
    var done = S.currentZone !== zoneId
      || (S.gatherNodes && S.gatherNodes.length)
      || !S._serverGatherNodes
      || tries > 4;
    if (done) { clearInterval(S._nodeResyncT); S._nodeResyncT = null; return; }
    if (S.channel && S.player) {
      /* Same packet shape as the teleport re-sends in wsClient. */
      S.channel.send({ type: 'broadcast', event: 'move', payload: { x: S.player.x, y: S.player.y, z: S.currentZone, vx: 0, vy: 0 } });
    }
  }, 2000);
}
