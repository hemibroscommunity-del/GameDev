/* ═══ spawnscale.js: a monster as a zone snapshot says it, the snapshot, the roster push ═══
 *
 * v2.3.4850: the POPULATION SCALER that lived here (v2.3.1983: more monsters
 * and nodes in a zone for each extra player in it, held-population
 * hysteresis, SPAWN_SCALE) is gone.  It scaled only the old map's authored
 * lands (data.js ZONES with `spawns`), and the worker refuses those lands for
 * good (v2.3.4675, zonejudge.js R3): the Wheel's lands are never scalable
 * (wheelzone.js).  What stays is what the Wheel still reads: monsterSnapWire,
 * _zoneSnapshotWire, _pushZoneRoster, and _monsterRespawnMs (combat.js).
 * The scaler's history: docs/specs/spawn-scaling.md.  */
import { bossSplitWire } from './slimeboss.js';   /* v2.3.3558: the giant slime's splits in the snapshot */


/* One monster as a zone snapshot says it: everything the phone needs to make
   it (the tick says only where it is and how it is doing, tick.js
   monsterWire).  v2.3.3318: a function of its own, for the tick's `mw` too
   (wheelnear.js), so the two can never say a monster differently. */
export function monsterSnapWire(m) {
  return {
    id: m.id, arch: m.arch, level: m.level, element: m.element,
    x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp, dmg: m.dmg,
    xp: m.xp, gold: m.gold, spd: m.spd, emoji: m.emoji, color: m.color,
    alive: m.alive,
    /* v2.3.2295: who it is chasing, so a client that JOINS or changes zone
       starts with the truth rather than with undefined. That baseline is
       what stops the notice cue firing for every already-aggroed monster in
       the zone the moment you walk in -- "it just noticed you" is a
       TRANSITION, and a transition needs a previous value. See tick.js. */
    tg: m.targetId || null,
    /* v2.3.2978: a Wheel monster says which zone it is from, and so its
       skin -- one zone with eight zones' monsters cannot be skinned by
       the zone's own name (wheelzone.js).  Both fields only on those, so
       every other zone's snapshot is byte-identical. */
    ...(m.home ? { home: m.home, variant: m.variant || null } : {}),
    /* v2.3.3556: a dungeon's boss says so (dungeon.js _dungeonSpawnBoss) --
       on it alone, so every other snapshot is byte-identical; v2.3.3558: a
       splitting one its splits done and in all (slimeboss.js) */
    ...(m._dungeonBoss ? { boss: 1, ...bossSplitWire(m) } : {}),
  };
}

export const spawnScaleMethods = {
  /* Respawn delay for a monster that just died.  v2.3.4850: always
     RESPAWN_TIME (it shortened with the zone's population, old lands only;
     the Wheel's lands never did).  Kept as a method: combat.js and pets.js
     call it from every kill. */
  _monsterRespawnMs(zoneId) {
    return this.RESPAWN_TIME;
  },

  /* One definition of a zone snapshot, for the join path (join.js), the
     zone-change path (movement.js) and the roster push below, so there is exactly one definition
     of what a zone snapshot looks like — this repo has been bitten by a
     second copy of a wire shape drifting from the first. */
  /* v2.3.3318: `pick` (optional) chooses which of the zone's monsters go in
     -- the Wheel's arrival takes only those around the phone (wheelnear.js);
     every other caller sends them all, as before */
  /* v2.3.3473: `viewer` (optional) -- the player the snapshot is for, whose
     own drops in their private minute go in its loot (itemdrop.js); without
     one, the loot everyone may see */
  _zoneSnapshotWire(zoneId, pick, viewer) {
    const all = this._ensureZoneMonsters(zoneId) || [];
    const monsters = (pick ? pick(all) : all).map(monsterSnapWire);
    const nodes = (this._ensureZoneNodes(zoneId) || []).map((n) => ({
      id: n.id, nodeType: n.nodeType, x: n.x, y: n.y,
      tierLvl: n.tierLvl, alive: n.alive, respawnAt: n.respawnAt,
      /* v2.3.3012: a Wheel node says which land it grows in (wheelzone.js);
         only on those, so every other zone's snapshot is byte-identical. */
      ...(n.home ? { home: n.home } : {}),
    }));
    return { monsters, nodes, loot: this._zoneLootForWire(zoneId, viewer) };
  },

  /* Announce a changed roster to everyone standing in the zone.  Re-sends
     the SNAPSHOT, not a delta, because a delta cannot introduce an entity
     on any client version (see the deploy-order note at the top).  Protocol
     v1 gets the legacy pair; v2 gets the merged frame. */
  _pushZoneRoster(zoneId, exceptWs) {
    /* Serialize ONCE per protocol version, not once per session.  A busy
       zone is ~17 sessions and the frame is a ~24-monster array; stringify
       per socket is what put a 16.8 ms spike in load-tick's worst tick.
       Built lazily so a zone with only v2 clients never pays for the v1
       pair (which is every zone in practice — v1 is the legacy fallback). */
    let snap = null, v2 = null, v1m = null, v1n = null;
    for (const [ws, s] of this.sessions) {
      if (ws === exceptWs) continue;
      const ps = s.id && this.playerState[s.id];
      if (!ps || ps.z !== zoneId) continue;
      if (!snap) snap = this._zoneSnapshotWire(zoneId);
      try {
        if (s.protocolVersion === 2) {
          /* v2.3.3473: a player with a drop still private here gets a list
             with it in (itemdrop.js) -- the shared one leaves it out, and a
             zone_state REPLACES a phone's piles, so theirs would vanish at
             every roster change.  Rare: only while a drop is a minute old. */
          if (this._dropPrivateIn(zoneId, s.id)) {
            ws.send(JSON.stringify({
              type: 'zone_state', zone: zoneId,
              monsters: snap.monsters, nodes: snap.nodes, loot: this._zoneLootForWire(zoneId, s.id),
            }));
            continue;
          }
          if (v2 === null) {
            v2 = JSON.stringify({
              type: 'zone_state', zone: zoneId,
              monsters: snap.monsters, nodes: snap.nodes, loot: snap.loot,
            });
          }
          ws.send(v2);
        } else {
          if (v1m === null) {
            v1m = JSON.stringify({ type: 'zone_monsters', zone: zoneId, monsters: snap.monsters });
            v1n = JSON.stringify({ type: 'zone_nodes', zone: zoneId, nodes: snap.nodes });
          }
          ws.send(v1m);
          ws.send(v1n);
        }
      } catch (e) { /* dead socket; webSocketClose reaps it */ }
    }
  },
};
