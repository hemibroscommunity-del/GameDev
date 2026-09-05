/* ═══ v2.3.1983: POPULATION-SCALED SPAWNS ═══
 *
 * Owner: "Content throughout is a valid concern.  Maybe it should spawn
 * resources based on the number of players in the zone?"
 *
 * THE MEASURED PROBLEM.  Every wilderness zone carries exactly 3 monsters
 * (data.js ZONES.spawns) and one node per gathering skill
 * (gathering.js _getZoneNodeConfig), SHARED by everyone standing in it.
 * Solo that is a tuned experience: 3 monsters on the 15s RESPAWN_TIME is
 * 12 kills/minute available, which is what v2.3.1739 set by feel.  Ten
 * people on the same early quest need ~40 kills and are handed the same
 * 12/min between them — 1.2 each — and one ore vein between ten miners is
 * one ore per player per ~200s.  At a public demo the first ten people to
 * log in stand in an empty field watching for a slime.  That is the first
 * impression, and it is a WORLD-SIZE bug, not a balance one: the zone was
 * never sized for a crowd.
 *
 * WHAT THIS DOES.  Per zone, keyed on how many players are IN THAT ZONE
 * (never the room total — the room is world-wide and a zone nobody is in
 * must keep spawning nothing, or an empty world burns tick budget and
 * bandwidth on monsters no one can see):
 *
 *   monster cap    = min(24, base + ceil((p-1) * 1.5))
 *   monster respawn= max(6000, RESPAWN_TIME / (1 + (p-1) * 0.06))
 *   nodes per skill= min(3,  base + floor((p-1) / 4))
 *
 * The two monster dials are deliberately split by the job they do.  The
 * CAP fixes "I look around and the zone is empty"; the RESPAWN RATE fixes
 * "I turned around and there is nothing left" — and the owner's own tuning
 * history (v2.3.1592 / v2.3.1739, both quoted at RESPAWN_TIME) says rate is
 * the half that is felt.  Multiplying them together is why both are gentle:
 * available kills/minute = cap x 60000/respawn, so a linear cap on a linear
 * rate would grow quadratically.  What the numbers actually deliver, per
 * player per minute (the quantity a player experiences):
 *
 *     p=1   3 monsters / 15.0s = 12.0/min  -> 12.0 each   (unchanged, solo)
 *     p=5   9 monsters / 12.1s = 44.6/min  ->  8.9 each
 *     p=10 17 monsters /  9.7s = 105/min   -> 10.5 each
 *     p=15 24 monsters /  8.2s = 176/min   -> 11.8 each
 *     p=25 24 monsters /  6.1s = 236/min   ->  9.4 each
 *
 * i.e. roughly FLAT at just under the solo experience, never above it, and
 * degrading gently past the ceiling instead of falling off a cliff.  Solo
 * play is bit-for-bit what it is today (p=1 => base, => RESPAWN_TIME).
 *
 * THE CEILING is 24 monsters/zone, hit at exactly 15 players.  It is not a
 * guess: server/test/load-tick.mjs scenario B already measures 25 real
 * monsters per zone x 7 zones = 175 monsters against 120 players at 0.35 ms
 * average tick out of the 22 ms budget, so this ceiling is a shape the room
 * has been proven to carry.  Bandwidth is the tighter constraint (a v1
 * session gets the whole dirty zone list every tick), which is the other
 * reason not to go linear.
 *
 * HYSTERESIS — the part that matters more than the curve.  Population
 * changes constantly as people walk between zones, and a cap that
 * recomputed from the live count would pop monsters in and out of
 * existence in front of players, which reads far worse than a sparse zone.
 * So the cap is driven by a HELD population, not the live one:
 *   - it rises INSTANTLY (an arrival should get monsters now, not in a
 *     minute — the demo case is ten people arriving at once), though the
 *     WORLD catches up at GROW_PER_PASS monsters per 2 s pass, so a full
 *     3 -> 24 fill takes ~10 s of zone filling in rather than one frame
 *     of twenty-one monsters blinking into existence;
 *   - it falls by AT MOST ONE PLAYER PER 60 SECONDS while anyone is still
 *     there, so a zone that peaked at 15 relaxes over ~14 minutes;
 *   - it drops to zero the moment the zone is EMPTY, because nobody is
 *     there to watch it happen — that is the free trim, and it is where
 *     almost all of the trimming really occurs.
 * On top of that, trimming NEVER touches anything in use: only monsters
 * this module itself added (`_scaled`) are ever removed, and only when they
 * are more than 600 px from every player in the zone (past the half-diagonal
 * of the phone viewport the game is designed against) AND either already
 * dead or unengaged — no target, no damage credit, no statuses, no live
 * stun.  A monster someone is fighting and a node someone is mining are
 * untouchable; a live extraction pins its node by id.  The authored 3 are
 * never removed at all.
 *
 * DEPLOY-ORDER SAFETY (handoff rule 19/21).  New monsters are announced by
 * RE-SENDING the existing zone snapshot — `zone_state` to protocol-v2
 * sessions, `zone_monsters` + `zone_nodes` to v1 — the same messages every
 * client has handled since before protocol v2, and the same shape
 * _dungeonPushZoneState has used since v2.3.1127.  No new event type, no
 * caps flag, nothing for the client to learn: an OLD client sees the extra
 * monsters correctly against a NEW worker, which is the whole point,
 * because the per-entity tick delta CANNOT introduce an entity (wsClient's
 * tick handler updates ids it already knows and silently ignores the rest —
 * a monster announced only by delta would be invisible while its AI still
 * attacked you).  Snapshots go out only when a zone's roster actually
 * changed, so the client-side wholesale replace they trigger is rare.
 *
 * COST.  The scaler runs at most once per SCALE_MS (2 s) — ~1 tick in 90 —
 * and does one pass over playerState plus one pass over the zones that have
 * entities; it is NOT a per-tick re-scan.  Everything else is amortised:
 * the respawn timer is computed at kill time, and the ongoing cost is
 * simply "more monsters in _tickMonsters", which is the load-tick B shape
 * measured above.
 *
 * STORAGE: none.  Held population is in-memory scratch (handoff rule 11) —
 * a deploy wipes it and the world re-derives the correct cap within 2 s
 * from live sessions, so nothing of value is lost and no new storage key
 * (and no registry entry) is needed.
 *
 * TRUST: entirely server-side.  The only client input anywhere near it is
 * the player's own zone, which `move` already validates against
 * VALID_ZONE_IDS — a client cannot ask for monsters. */

export const SPAWN_SCALE = {
  SCALE_MS: 2000,            // recompute cadence (~1 tick in 90)
  MON_PER_PLAYER: 1.5,       // extra monsters per extra player in zone
  MON_MAX: 24,               // hard per-zone ceiling (load-tick B shape)
  MON_RESPAWN_K: 0.06,       // respawn divisor slope per extra player
  MON_RESPAWN_FLOOR_MS: 6000,// never faster than this, at any population
  NODE_PLAYERS_PER_EXTRA: 4, // one extra node per skill per 4 extra players
  NODE_MAX: 3,               // per skill per zone — see the botfp note below
  DECAY_MS: 60000,           // held population sheds 1 player per minute
  SPAWN_CLEAR_PX: 300,       // don't materialise a monster in someone's face
  TRIM_SAFE_PX: 800,         // never trim within this of a player (v2.3.2247, see below)
  PLACE_TRIES: 12,           // rejection-sampling attempts for a spawn point
  /* v2.3.1983: how much a zone may GROW in one pass.  Two reasons, one
     measured and one felt.  Measured: ten people landing in a zone at once
     asks for 21 new monsters, and the roster snapshot that follows is the
     expensive part — load-tick's worst-case tick went 2.6 ms -> 16.8 ms
     with the whole growth in one frame.  Four per pass spreads a full
     3 -> 24 fill over ~10 s of 2 s passes and keeps every tick boring.
     Felt: a zone that fills in over a few seconds looks like a world
     waking up; twenty-one monsters blinking into existence in one frame
     looks like a bug. */
  GROW_PER_PASS: 4,
};

export const spawnScaleMethods = {
  /* Only authored wilderness zones scale.  Dungeon instances (`dungeon:*`)
     ride ordinary zone ids through this.monsters, and their wave counts are
     _tickDungeons' business — scaling them here would fight the wave logic
     it uses to decide a wave is cleared. */
  _spawnScalableZone(zoneId) {
    if (!zoneId || zoneId === 'town' || zoneId === 'farm_home') return false;
    const z = this._getZoneConfig(zoneId);
    return !!(z && z.spawns && z.spawns.length);
  },

  _zoneBaseMonsterCount(zoneId) {
    const z = this._getZoneConfig(zoneId);
    if (!z || !z.spawns) return 0;
    return z.spawns.reduce((n, s) => n + (s.count || 0), 0);
  },

  /* Live count of players standing in a zone.  Disconnected sessions are
     excluded (they are ghosts awaiting cleanup); DEAD players are counted —
     they are about to respawn and are still "in" the zone as far as the
     supply they need is concerned. */
  _zonePlayerCount(zoneId) {
    let n = 0;
    for (const ps of Object.values(this.playerState)) {
      if (ps && !ps.disconnected && ps.z === zoneId) n++;
    }
    return n;
  },

  /* The damped population the caps are computed from.  See the hysteresis
     note at the top: instant up, one-per-minute down, zero when empty. */
  _heldPop(zoneId, raw, now) {
    if (!this._zonePop) this._zonePop = Object.create(null); // null-proto: zone ids are client-supplied (TRAPS #6)
    let st = this._zonePop[zoneId];
    if (!st) st = this._zonePop[zoneId] = { held: 0, decayAt: now };
    if (raw <= 0) { st.held = 0; st.decayAt = now; return 0; }
    if (raw >= st.held) { st.held = raw; st.decayAt = now; return st.held; }
    if (now - st.decayAt >= SPAWN_SCALE.DECAY_MS) {
      st.held = Math.max(raw, st.held - 1);
      st.decayAt = now;
    }
    return st.held;
  },

  _scaledMonsterCap(zoneId, held) {
    const base = this._zoneBaseMonsterCount(zoneId);
    if (base <= 0) return 0;
    const p = Math.max(1, Math.floor(held || 0));
    return Math.max(base, Math.min(SPAWN_SCALE.MON_MAX,
      base + Math.ceil((p - 1) * SPAWN_SCALE.MON_PER_PLAYER)));
  },

  _scaledNodeCap(zoneId, held, base) {
    const p = Math.max(1, Math.floor(held || 0));
    return Math.max(base, Math.min(SPAWN_SCALE.NODE_MAX,
      base + Math.floor((p - 1) / SPAWN_SCALE.NODE_PLAYERS_PER_EXTRA)));
  },

  /* Respawn delay for a monster that just died in this zone.  Called from
     the kill paths (combat.js _resolveMonsterKill, pets.js capture) so the
     cadence costs nothing per tick.  Unscalable zones — dungeons above all,
     where noRespawn usually applies anyway — keep RESPAWN_TIME exactly. */
  _monsterRespawnMs(zoneId) {
    if (!this._spawnScalableZone(zoneId)) return this.RESPAWN_TIME;
    const st = this._zonePop && this._zonePop[zoneId];
    const p = Math.max(1, Math.floor((st && st.held) || 0));
    if (p <= 1) return this.RESPAWN_TIME;
    return Math.max(SPAWN_SCALE.MON_RESPAWN_FLOOR_MS,
      Math.round(this.RESPAWN_TIME / (1 + (p - 1) * SPAWN_SCALE.MON_RESPAWN_K)));
  },

  // ── the tick entry point ────────────────────────────────────────────
  _tickSpawnScale(now) {
    if (now - (this._spawnScaleAt || 0) < SPAWN_SCALE.SCALE_MS) return;
    this._spawnScaleAt = now;
    /* One pass over playerState for every zone at once — the per-zone
       re-scan this deliberately is not. */
    const pop = new Map();
    for (const ps of Object.values(this.playerState)) {
      if (!ps || ps.disconnected || !ps.z) continue;
      pop.set(ps.z, (pop.get(ps.z) || 0) + 1);
    }
    /* Zones to visit: every populated one, plus every one we already hold
       entities for (so a zone that just emptied gets trimmed back to its
       authored size instead of staying inflated for the life of the DO). */
    const zones = new Set();
    for (const z of pop.keys()) if (this._spawnScalableZone(z)) zones.add(z);
    for (const z of Object.keys(this.monsters)) if (this._spawnScalableZone(z)) zones.add(z);
    for (const z of Object.keys(this.nodes)) if (this._spawnScalableZone(z)) zones.add(z);
    for (const zoneId of zones) this._spawnScaleZone(zoneId, now, pop.get(zoneId) || 0);
  },

  /* Scale one zone.  Also called synchronously from the zone-entry and
     join paths so the arriving player's OWN snapshot already carries the
     grown roster (otherwise they would see the old world for up to
     SCALE_MS and then get re-synced, which looks like a glitch). */
  _spawnScaleZone(zoneId, now, rawPop, exceptWs) {
    if (!this._spawnScalableZone(zoneId)) return false;
    const t = now || Date.now();
    const raw = (typeof rawPop === 'number') ? rawPop : this._zonePlayerCount(zoneId);
    const held = this._heldPop(zoneId, raw, t);
    /* Nothing there and nothing spawned yet: do not lazily create a world
       for an empty zone. */
    if (held <= 0 && !this.monsters[zoneId] && !this.nodes[zoneId]) return false;
    const players = [];
    for (const ps of Object.values(this.playerState)) {
      if (ps && !ps.disconnected && ps.z === zoneId) players.push(ps);
    }
    let changed = false;
    if (this._scaleZoneMonsters(zoneId, held, players, t)) changed = true;
    if (this._scaleZoneNodes(zoneId, held, players, t)) changed = true;
    if (changed) this._pushZoneRoster(zoneId, exceptWs);
    return changed;
  },

  // ── monsters ────────────────────────────────────────────────────────
  _scaleZoneMonsters(zoneId, held, players, now) {
    const cap = this._scaledMonsterCap(zoneId, held);
    if (cap <= 0) return false;
    const list = this.monsters[zoneId];
    if (!list) return false; // never lazily spawn a zone here — entry does that
    if (list.length === cap) return false;
    if (list.length < cap) {
      return this._growZoneMonsters(zoneId,
        Math.min(SPAWN_SCALE.GROW_PER_PASS, cap - list.length), players);
    }
    return this._trimZoneMonsters(zoneId, list.length - cap, players, now);
  },

  _growZoneMonsters(zoneId, want, players) {
    const zone = this._getZoneConfig(zoneId);
    const list = this.monsters[zoneId];
    if (!zone || !list) return false;
    /* Weighted archetype pool: one entry per authored monster, so a zone's
       MIX survives scaling (sky is 1 stalker + 1 hexer + 1 volatile, not
       three of whatever came first). */
    const pool = [];
    for (const s of zone.spawns) for (let i = 0; i < (s.count || 0); i++) pool.push(s);
    if (pool.length === 0) return false;
    if (!this._zoneSpawnSeq) this._zoneSpawnSeq = Object.create(null); // null-proto (TRAPS #6)
    let added = 0;
    for (let k = 0; k < want; k++) {
      /* v2.3.2244: the same farthest-point picker the authored spawns use
         (index.js _pickSpreadSpawn), with the players standing here as
         extra points to stay away from -- so a scaled add is spread from
         the monsters already in the zone AND does not materialise on top
         of anyone, which reads as a bug even when it is the feature
         working.  (The old version avoided players only.) */
      const _pt = this._pickSpreadSpawn(zone, list.filter((mm) => mm && mm.alive), players, SPAWN_SCALE.SPAWN_CLEAR_PX);
      const x = _pt.x, y = _pt.y;
      const seq = (this._zoneSpawnSeq[zoneId] = (this._zoneSpawnSeq[zoneId] || 0) + 1);
      const spawn = pool[(seq - 1) % pool.length];
      /* Same builder the authored spawns use, so a scaled monster is
         identical in every respect (level ramp, variant, hp/dmg/xp curves)
         except its id and the `_scaled` mark that makes it trimmable. */
      const m = this._makeZoneMonster(zoneId, zone, spawn, 'sm-' + zoneId + '-x' + seq, x, y);
      if (!m) continue;
      m._scaled = true;
      list.push(m);
      this._markMonsterDirty(zoneId, m.id);
      added++;
    }
    return added > 0;
  },

  /* Remove up to `want` SCALED monsters.  Never an authored one, never one
     that is in use, and never one a player could SEE go.

     v2.3.2247: 600 -> 800.  The rule is "past the half-diagonal of the screen
     the game is designed against", and the client's zoom-out moved that screen.
     The old note's "~488x1056" was already two zoom changes stale (it describes
     WORLD_ZOOM 1.25); what matters is that the world viewport is now capped PER
     ZONE by the zone's own size, so the biggest one that can hold scaled
     monsters is a 40x40 zone (shadow/radiant) at 1280 world px deep:
         phone   812 x 1280  -> half-diagonal 758
         desktop 914 x 1280  -> half-diagonal 786
     600 would let a monster wink out at the far corner of a screen it is still
     drawn on.  800 clears the worst case with margin.  The 32x32 combat zones
     come out at 606/629, which is why nobody had seen this at 600.

     The consequence the paragraph below records -- a parked player holding
     monsters near them -- gets slightly wider with the radius, and is still
     bounded by the same MON_MAX cap.  Dead-and-waiting ones are taken first —
     among the off-screen candidates they are the cheapest to lose — but
     they are held to the same distance rule as the living, because a corpse
     removed mid-death-animation is a sprite vanishing in front of someone.
     The consequence, stated because it is a real one: a player parked in a
     zone that has emptied around them holds the monsters near THEM until
     they move or leave.  That is the trade this feature is willing to make
     — the cap is bounded at MON_MAX either way, and an over-full zone is
     invisible where a popping one is not. */
  _trimZoneMonsters(zoneId, want, players, now) {
    const list = this.monsters[zoneId];
    if (!list) return false;
    const engaged = (m) => {
      if (m.targetId) return true;
      if (m.dmgByPlayer && Object.keys(m.dmgByPlayer).length > 0) return true;
      if (m.statuses && Object.keys(m.statuses).length > 0) return true;
      if (m._stunUntil && m._stunUntil > now) return true;
      return false;
    };
    const farFromAll = (m) => {
      for (const p of players) {
        if (Math.hypot((p.x || 0) - m.x, (p.y || 0) - m.y) < SPAWN_SCALE.TRIM_SAFE_PX) return false;
      }
      return true;
    };
    const deadFar = [], aliveFar = [];
    for (const m of list) {
      if (!m._scaled) continue;
      if (!farFromAll(m)) continue;          // on someone's screen: untouchable
      if (!m.alive) { deadFar.push(m); continue; }
      if (!engaged(m)) aliveFar.push(m);
    }
    const removable = deadFar.concat(aliveFar);
    if (removable.length === 0) return false;
    const doomed = new Set(removable.slice(0, want).map((m) => m.id));
    if (doomed.size === 0) return false;
    this.monsters[zoneId] = list.filter((m) => !doomed.has(m.id));
    const ids = this.dirtyMonsterIds[zoneId];
    if (ids) for (const id of doomed) ids.delete(id);
    return true;
  },

  // ── gather nodes ────────────────────────────────────────────────────
  _scaleZoneNodes(zoneId, held, players, now) {
    const list = this.nodes[zoneId];
    if (!list) return false;
    const cfg = this._getZoneNodeConfig(zoneId);
    const base = { tree: cfg.treeCt, fishSpot: cfg.fishCt, oreVein: cfg.oreCt };
    let changed = false;
    for (const type of ['tree', 'fishSpot', 'oreVein']) {
      const b = base[type] || 0;
      if (b <= 0) continue;
      const cap = this._scaledNodeCap(zoneId, held, b);
      const have = list.filter((n) => n.nodeType === type).length;
      if (have < cap) { if (this._growZoneNodes(zoneId, type, cap - have)) changed = true; }
      else if (have > cap) { if (this._trimZoneNodes(zoneId, type, have - cap, players, now)) changed = true; }
    }
    return changed;
  },

  _growZoneNodes(zoneId, type, want) {
    const list = this.nodes[zoneId];
    if (!list) return false;
    if (!this._zoneNodeSeq) this._zoneNodeSeq = Object.create(null); // null-proto (TRAPS #6)
    let added = 0;
    for (let k = 0; k < want; k++) {
      const seq = (this._zoneNodeSeq[zoneId] = (this._zoneNodeSeq[zoneId] || 0) + 1);
      /* Same placement rule as the authored layout (v2.3.1444's minimum-gap
         rejection sampling), fed the nodes already standing so a scaled-in
         vein cannot land on top of an existing prompt. */
      const n = this._placeGatherNode(zoneId, type, list, 'sn-' + zoneId + '-x' + seq);
      if (!n) continue;
      n._scaled = true;
      list.push(n);
      this._markNodeDirty(zoneId, n.id);
      added++;
    }
    return added > 0;
  },

  _trimZoneNodes(zoneId, type, want, players, now) {
    const list = this.nodes[zoneId];
    if (!list) return false;
    /* A node someone is mid-extraction on is pinned by id — this is the
       "never despawn a node someone is mining" guarantee, and it holds even
       for a harvest that started minutes ago (EXTRACTION_TIMEOUT_MS). */
    const busy = new Set();
    for (const ex of Object.values(this.extractions || {})) {
      if (ex && ex.nodeId) busy.add(ex.nodeId);
    }
    const doomed = new Set();
    for (const n of list) {
      if (doomed.size >= want) break;
      if (!n._scaled || n.nodeType !== type) continue;
      if (busy.has(n.id)) continue;
      let near = false;
      for (const p of players) {
        if (Math.hypot((p.x || 0) - n.x, (p.y || 0) - n.y) < SPAWN_SCALE.TRIM_SAFE_PX) { near = true; break; }
      }
      if (near) continue;
      doomed.add(n.id);
    }
    if (doomed.size === 0) return false;
    this.nodes[zoneId] = list.filter((n) => !doomed.has(n.id));
    const ids = this.dirtyNodeIds[zoneId];
    if (ids) for (const id of doomed) ids.delete(id);
    void now;
    return true;
  },

  // ── the wire ────────────────────────────────────────────────────────
  /* The three zone lists in their established wire shapes.  Shared with
     the zone-change path (movement.js) so there is exactly one definition
     of what a zone snapshot looks like — this repo has been bitten by a
     second copy of a wire shape drifting from the first. */
  _zoneSnapshotWire(zoneId) {
    const monsters = (this._ensureZoneMonsters(zoneId) || []).map((m) => ({
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
    }));
    const nodes = (this._ensureZoneNodes(zoneId) || []).map((n) => ({
      id: n.id, nodeType: n.nodeType, x: n.x, y: n.y,
      tierLvl: n.tierLvl, alive: n.alive, respawnAt: n.respawnAt,
    }));
    return { monsters, nodes, loot: this._zoneLootForWire(zoneId) };
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
