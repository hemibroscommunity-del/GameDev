/* ═══ ELEMENTAL SHARDS — one per zone ═══
 *
 * Each spawning zone owns a unique shard.  Shards drop from monster
 * kills at 10 % per kill and from successful harvest gathers (ore /
 * fish / wood) at 33 %.  When present, the shard icon renders on top
 * of the ground-loot pile and the player's inventory receives the
 * `shard_<zone>` key on walkover.
 *
 * Adding a new zone: append an entry below, run
 * tools/shards/build_shards.py to (re)generate the PNG, and the
 * InventoryPanel thumbnail will pick it up via the shard_* fallback
 * in thumbFor().  Colors should track the zone palette so the player
 * can read which shard belongs to which zone at a glance. */

export const ZONE_SHARDS = {
  meadow:  { key: 'shard_meadow',  color: '#5a9a40', label: 'Verdant Shard'  },
  ember:   { key: 'shard_ember',   color: '#ff6633', label: 'Ember Shard'    },
  mist:    { key: 'shard_mist',    color: '#6abb40', label: 'Mist Shard'     },
  frost:   { key: 'shard_frost',   color: '#88ccff', label: 'Frost Shard'    },
  thunder: { key: 'shard_thunder', color: '#9966ff', label: 'Thunder Shard'  },
  hollows: { key: 'shard_hollows', color: '#b09a82', label: 'Stone Shard'    },
  sky:     { key: 'shard_sky',     color: '#cce6ff', label: 'Wind Shard'     },
  tidal:   { key: 'shard_tidal',   color: '#3a8acc', label: 'Tidal Shard'    },
};

const KEY_TO_DESC = Object.fromEntries(
  Object.values(ZONE_SHARDS).map((s) => [s.key, s])
);

export function shardForZone(zoneId) {
  return ZONE_SHARDS[zoneId] || null;
}

export function shardByKey(shardKey) {
  return (shardKey && KEY_TO_DESC[shardKey]) || null;
}

/* 10 % roll for a monster-kill shard.  Returns the shard key or null
   so call sites can spread the field conditionally:
     var _shard = rollMonsterShard(S.currentZone);
     groundLoot.push({ ..., ...( _shard ? { shard: _shard } : {} ) });
   Zones without a registered shard (town, wasteland, dungeons) return
   null and the kill drops nothing extra. */
export function rollMonsterShard(zoneId) {
  if (Math.random() >= 0.10) return null;
  const s = ZONE_SHARDS[zoneId];
  return s ? s.key : null;
}

/* 33 % roll for a harvest-node shard (ore / fish / wood).  Mirrors
   rollMonsterShard.  The shard is added straight to inventory
   alongside the resource since harvest rewards are direct, not
   ground-loot-mediated. */
export function rollHarvestShard(zoneId) {
  if (Math.random() >= 0.33) return null;
  const s = ZONE_SHARDS[zoneId];
  return s ? s.key : null;
}

/* Public asset path for a shard key.  Matches the layout produced by
   tools/shards/build_shards.py. */
export function shardIconPath(shardKey) {
  return shardKey ? `/icons/shards/${shardKey}.png` : null;
}
