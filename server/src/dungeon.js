/* ═══ v2.3.1127: INSTANCED DUNGEONS (PR12 of the heavy-systems plan;
 * spec in docs/specs/dungeons.md) ═══
 *
 * Replaces the client-spawned Dungeon Workshop runs with server-owned
 * instances.  Before this, the ENTIRE dungeon was client theatre: the
 * client built the arena, spawned its own monsters from a config it
 * chose (bossMultiplier, waves, monsterLevel -- all attacker-editable),
 * scored its own kills, and self-credited the completion gold/XP.  In
 * a 100% server-based game that's both a legacy remnant (Rule Zero,
 * docs/ARCHITECTURE-HANDOFF.md) and an open faucet.
 *
 * Design: FOLDED INSTANCES.  An instance is just a zone id the ZONES
 * table doesn't know: 'dungeon:<id>'.  That one trick makes the whole
 * existing combat stack work unmodified:
 *   - _activeZones() ticks any zone players stand in -> instance
 *     monsters get the full server AI (aggro/chase/attack/wander).
 *   - The move handler's zone-change branch sends whatever
 *     _ensureZoneMonsters finds -> since we pre-populate
 *     this.monsters[zone] before the client zones in, the wave-1
 *     snapshot rides the normal zone_state and the client flips to
 *     server-authoritative combat automatically.
 *   - monster_damage/_resolveMonsterKill give kill XP, gold, loot
 *     piles, quest credit and GDD §7 contribution sharing for free.
 *   - Zone ids absent from ZONES fail closed for PvP and are skipped
 *     by every zone-config-dependent branch (all guarded).
 * The only core change needed was a one-line respawn guard in
 * _resolveMonsterKill (m.noRespawn) so cleared waves STAY cleared.
 *
 * State is in-memory only (this._dungeons).  Deliberate: unlike duels
 * or market escrow there is no debited value at risk -- a deploy or
 * hibernation mid-run just evaporates the run; the player walks out
 * via the exit tile and starts a new one.  Rewards are settled the
 * moment the last wave dies, to everyone standing in the instance
 * (zone presence IS membership -- a party feature needs no roster).
 *
 * Reward formulas mirror the legacy client self-credit numbers
 * (src/game/dungeonWaves.js) so the feature ships value-neutral:
 *   boss route:  gold 30*waves + lvl*2, xp 80*waves + lvl*5
 *   no-boss:     gold 20*waves,         xp 50*waves
 * Boss HP scales by cfg.bossMultiplier (server-clamped 2..8) and by
 * present player count 1.0/1.6/2.2/3.0 (GDD §55.7 party scaling). */

import { ARCHETYPES, MONSTER_HP_CURVE } from './data.js';

export const DUNGEONS = {
  MAX_WAVES: 10,        // client caps at 10 by level; hard server ceiling
  MAX_GROUPS: 4,        // monster groups per wave
  MAX_GROUP_COUNT: 8,   // monsters per group
  LEVEL_HARD_CAP: 100,  // monsterLevel also capped at owner's level (GDD §36)
  BOSS_MULT_MIN: 2,
  BOSS_MULT_MAX: 8,
  MAX_INSTANCES: 8,     // room-wide concurrent instance cap
  DONE_LINGER_MS: 15000,   // completed instance kept while clients play the win
  EMPTY_SWEEP_MS: 60000,   // no players inside for this long -> instance dies
  PARTY_HP_SCALE: [1.0, 1.6, 2.2, 3.0], // boss HP by players present (GDD §55.7)
  VALID_ELEMENTS: ['flame', 'venom', 'frost', 'storm', 'stone', 'wind', 'water'],
};

function clampInt(v, lo, hi, dflt) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return dflt;
  return Math.max(lo, Math.min(hi, n));
}

export const dungeonMethods = {
  _dungeonSend(playerId, obj) {
    const ws = this._wsBySessionId(playerId);
    if (!ws) return;
    try { ws.send(JSON.stringify(obj)); } catch (e) {}
  },

  _dungeonError(playerId, code, message) {
    this._dungeonSend(playerId, { type: 'dungeon_error', payload: { code, message } });
  },

  // Alive, connected players standing in the instance zone.  Zone
  // presence is the membership model: whoever walks in fights, whoever
  // is inside at the final kill gets paid.
  _dungeonZonePlayers(zone) {
    const out = [];
    for (const [pid, ps] of Object.entries(this.playerState)) {
      if (ps.z === zone && !ps.dead && !ps.dying && !ps.disconnected) out.push(pid);
    }
    return out;
  },

  // Never trust the client blob: every field is clamped/whitelisted.
  // Unknown archetypes collapse to fodder (matches _getArchetype's own
  // fallback), monsterLevel is capped at the OWNER's level -- the GDD
  // §36 rule the client UI enforces and a forged config bypassed.
  _dungeonSanitizeConfig(raw, ps) {
    raw = raw && typeof raw === 'object' ? raw : {};
    const lvlCap = Math.max(1, Math.min(ps.level || 1, DUNGEONS.LEVEL_HARD_CAP));
    const arch = (a) => (typeof a === 'string' && ARCHETYPES[a]) ? a : 'fodder';
    const elem = (e) => DUNGEONS.VALID_ELEMENTS.includes(e) ? e : null;
    const groupsIn = Array.isArray(raw.monsters) ? raw.monsters.slice(0, DUNGEONS.MAX_GROUPS) : [];
    const groups = groupsIn.map((g) => ({
      archetype: arch(g && g.archetype),
      count: clampInt(g && g.count, 1, DUNGEONS.MAX_GROUP_COUNT, 4),
      element: elem(g && g.element),
    }));
    if (groups.length === 0) groups.push({ archetype: 'fodder', count: 4, element: null });
    return {
      name: String(raw.name || 'Dungeon').slice(0, 24),
      terrain: String(raw.terrain || 'stone_halls').slice(0, 24),
      width: clampInt(raw.width, 20, 40, 25),
      height: clampInt(raw.height, 15, 35, 20),
      waves: clampInt(raw.waves, 1, DUNGEONS.MAX_WAVES, 3),
      monsterLevel: clampInt(raw.monsterLevel, 1, lvlCap, 1),
      element: elem(raw.element),
      monsters: groups,
      hasBoss: !!raw.hasBoss,
      bossArchetype: arch(raw.bossArchetype || 'brute'),
      bossMultiplier: clampInt(raw.bossMultiplier, DUNGEONS.BOSS_MULT_MIN, DUNGEONS.BOSS_MULT_MAX, 4),
    };
  },

  // dungeon_start -- explicit switch case (never a relay).  Purely
  // in-memory, no storage awaits, so it runs atomically within its
  // webSocketMessage event.
  _handleDungeonStart(session, payload) {
    // v2.3.1146: live-ops kill switch (dungeon_error is already in
    // PRIVILEGED_EVENTS; the client renders the message).
    if (this._flagOn && this._flagOn('disable_dungeons')) {
      return this._dungeonError(session.id, 'disabled', 'Dungeons are temporarily disabled');
    }
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead) {
      return this._dungeonError(session.id, 'not-now', 'Cannot start a dungeon right now');
    }
    if (!this._dungeons) this._dungeons = new Map();
    for (const inst of this._dungeons.values()) {
      if (inst.ownerId === session.id && inst.state === 'active') {
        return this._dungeonError(session.id, 'already-running', 'You already have a dungeon running');
      }
    }
    if (this._dungeons.size >= DUNGEONS.MAX_INSTANCES) {
      return this._dungeonError(session.id, 'room-full', 'Too many dungeons running — try again soon');
    }
    const cfg = this._dungeonSanitizeConfig((payload && payload.config) || payload, ps);
    const id = crypto.randomUUID().slice(0, 8);
    const zone = 'dungeon:' + id;
    const inst = {
      id, zone, ownerId: session.id, cfg,
      wave: 1, state: 'active', bossSpawned: false,
      createdAt: Date.now(), emptySince: 0, doneAt: 0,
    };
    this._dungeons.set(id, inst);
    // Pre-populate BEFORE replying: the client zone-changes into the
    // instance on dungeon_started, and the move handler's
    // _ensureZoneMonsters must find this array (an unset key would
    // lazy-"spawn" the empty unknown-zone list instead).
    this.monsters[zone] = [];
    this._dungeonSpawnWave(inst);
    this._dungeonSend(session.id, { type: 'dungeon_started', payload: { zone, cfg, wave: 1 } });
  },

  // Mirrors _spawnZoneMonsters' stat pipeline exactly (same
  // _monsterStat curves x archetype multipliers) so dungeon monsters
  // are worth the same XP/gold as world monsters of their level.
  // noRespawn is the one divergence: cleared waves stay cleared
  // (_resolveMonsterKill honors it when stamping respawnAt).
  _dungeonMonster(inst, archKey, lvl, element, idSuffix) {
    const a = this._getArchetype(archKey);
    // HP curve centralized v2.3.1140 (BF-1) -- keeps dungeon monsters on
    // the same flattened ramp as world spawns.
    const baseHp = this._monsterStat(MONSTER_HP_CURVE.base, lvl, MONSTER_HP_CURVE.ramp, MONSTER_HP_CURVE.plateau, MONSTER_HP_CURVE.endgame);
    const baseDmg = this._monsterStat(12, lvl, 1.045, 1.025, 1.018);
    const baseXp = this._monsterStat(10, lvl, 1.045, 1.025, 1.018);
    const baseGold = this._monsterStat(5, lvl, 1.035, 1.020, 1.015);
    // Same placement box as the legacy client spawner: upper half of
    // the arena, 3 tiles off the walls (player enters at bottom center).
    const x = (3 + Math.random() * (inst.cfg.width - 6)) * this.TILE;
    const y = (2 + Math.random() * (inst.cfg.height / 2 - 2)) * this.TILE;
    const spd = 0.5 * a.spdMult;
    return {
      id: 'dm-' + inst.id + '-' + idSuffix,
      arch: archKey,
      variant: null, spawnVariant: null, spawnSpd: spd,
      level: lvl,
      element: element || null,
      hp: Math.ceil(baseHp * a.hpMult),
      maxHp: Math.ceil(baseHp * a.hpMult),
      dmg: Math.ceil(baseDmg * a.dmgMult),
      xp: Math.ceil(baseXp),
      gold: Math.ceil(baseGold),
      spd,
      emoji: a.emoji, color: a.color,
      x, y, spawnX: x, spawnY: y,
      alive: true, targetId: null, atkCd: 0,
      respawnAt: 0,
      noRespawn: true,
    };
  },

  _dungeonSpawnWave(inst) {
    const list = this.monsters[inst.zone];
    if (!list) return;
    let n = 0;
    for (const g of inst.cfg.monsters) {
      for (let i = 0; i < g.count; i++) {
        // +0..2 level jitter: legacy client parity.
        const lvl = inst.cfg.monsterLevel + Math.floor(Math.random() * 3);
        const m = this._dungeonMonster(inst, g.archetype, lvl, g.element || inst.cfg.element, inst.wave + '-' + (n++));
        list.push(m);
        this._markMonsterDirty(inst.zone, m.id);
      }
    }
  },

  _dungeonSpawnBoss(inst) {
    const list = this.monsters[inst.zone];
    if (!list) return;
    const present = this._dungeonZonePlayers(inst.zone).length;
    const scale = DUNGEONS.PARTY_HP_SCALE[Math.max(0, Math.min(present - 1, DUNGEONS.PARTY_HP_SCALE.length - 1))];
    const m = this._dungeonMonster(inst, inst.cfg.bossArchetype, inst.cfg.monsterLevel + 5, inst.cfg.element, 'boss');
    m.hp = Math.ceil(m.hp * inst.cfg.bossMultiplier * scale);
    m.maxHp = m.hp;
    m.dmg = Math.ceil(m.dmg * 1.5);
    m.emoji = '🐉';
    m.color = '#ff5e6c';
    // Center-top, same spot the legacy client boss appeared.
    m.x = Math.floor(inst.cfg.width / 2) * this.TILE;
    m.y = Math.floor(inst.cfg.height / 3) * this.TILE;
    m.spawnX = m.x; m.spawnY = m.y;
    list.push(m);
    inst.bossSpawned = true;
    this._markMonsterDirty(inst.zone, m.id);
  },

  // Wholesale zone_state re-push to everyone inside.  The per-tick
  // monster deltas only UPDATE entities the client already knows; a
  // freshly spawned wave needs the full-snapshot path (the client's
  // _applyZoneMonstersMsg replaces S.monsters wholesale, which also
  // clears last wave's corpses).  Loot rides along so the replace
  // doesn't eat visible piles; v1 sessions get only zone_monsters
  // (their separate nodes/loot messages would clobber real state).
  _dungeonPushZoneState(zone) {
    const list = this.monsters[zone] || [];
    const wire = list.map((m) => ({
      id: m.id, arch: m.arch, level: m.level, element: m.element,
      x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp, dmg: m.dmg,
      xp: m.xp, gold: m.gold, spd: m.spd, emoji: m.emoji, color: m.color,
      alive: m.alive,
    }));
    for (const [ws, s] of this.sessions) {
      const ps = s.id && this.playerState[s.id];
      if (!ps || ps.z !== zone) continue;
      try {
        if (s.protocolVersion === 2) {
          ws.send(JSON.stringify({ type: 'zone_state', zone, monsters: wire, nodes: [], loot: this._zoneLootForWire(zone) }));
        } else {
          ws.send(JSON.stringify({ type: 'zone_monsters', zone, monsters: wire }));
        }
      } catch (e) {}
    }
  },

  _dungeonComplete(inst, players, now) {
    inst.state = 'done';
    inst.doneAt = now;
    const cfg = inst.cfg;
    // Legacy client formulas, verbatim (dungeonWaves.js) -- the
    // feature ships value-neutral vs. the self-credit it replaces.
    const gold = cfg.hasBoss ? 30 * cfg.waves + cfg.monsterLevel * 2 : 20 * cfg.waves;
    const xp = cfg.hasBoss ? 80 * cfg.waves + cfg.monsterLevel * 5 : 50 * cfg.waves;
    for (const pid of players) {
      const ps = this.playerState[pid];
      if (!ps) continue;
      // Single-mutation settle on live ps inside the tick (the gamble
      // pattern): recipients are online by definition (zone presence),
      // no escrow, no opId -- there is no crash window between roll
      // and payout because there is no roll.
      ps.coins = (ps.coins || 0) + gold;
      this._addCombatXp(ps, xp);
      this._saveRpg(pid, ps);
      this._queuePlayerStateFlush(pid);
      this._dungeonSend(pid, { type: 'dungeon_complete', payload: { zone: inst.zone, gold, xp, boss: cfg.hasBoss } });
    }
  },

  _dungeonCleanup(inst) {
    this._dungeons.delete(inst.id);
    delete this.monsters[inst.zone];
    delete this.loot[inst.zone];
    delete this.nodes[inst.zone];
    this.dirtyMonsters.delete(inst.zone);
    delete this.dirtyMonsterIds[inst.zone];
    this.dirtyNodes.delete(inst.zone);
    delete this.dirtyNodeIds[inst.zone];
  },

  // Piggybacks on the tick loop (which only runs while the room has
  // players -- an instance whose players all leave is swept next time
  // ANYONE is online; if the DO restarts first, memory is simply gone).
  _tickDungeons(now) {
    if (!this._dungeons || this._dungeons.size === 0) return;
    for (const inst of [...this._dungeons.values()]) {
      const players = this._dungeonZonePlayers(inst.zone);
      if (inst.state === 'done') {
        // Linger so the winners see the cleared arena; sweep once they
        // leave (or unconditionally after 5 min -- campers can't pin it).
        if (now - inst.doneAt > DUNGEONS.DONE_LINGER_MS && players.length === 0) this._dungeonCleanup(inst);
        else if (now - inst.doneAt > 300000) this._dungeonCleanup(inst);
        continue;
      }
      if (players.length === 0) {
        // Covers owner-never-entered, everyone-walked-out, and
        // everyone-died (respawn moves ps.z to town).
        if (!inst.emptySince) inst.emptySince = now;
        if (now - inst.emptySince > DUNGEONS.EMPTY_SWEEP_MS) this._dungeonCleanup(inst);
        continue;
      }
      inst.emptySince = 0;
      const list = this.monsters[inst.zone];
      if (!list || list.length === 0) continue;
      if (!list.every((m) => !m.alive)) continue;
      // Wave cleared.
      if (inst.wave < inst.cfg.waves) {
        inst.wave++;
        this._dungeonSpawnWave(inst);
        this._dungeonPushZoneState(inst.zone);
        for (const pid of players) {
          this._dungeonSend(pid, { type: 'dungeon_wave', payload: { zone: inst.zone, wave: inst.wave, total: inst.cfg.waves } });
        }
      } else if (inst.cfg.hasBoss && !inst.bossSpawned) {
        this._dungeonSpawnBoss(inst);
        this._dungeonPushZoneState(inst.zone);
        for (const pid of players) {
          this._dungeonSend(pid, { type: 'dungeon_boss', payload: { zone: inst.zone } });
        }
      } else {
        this._dungeonComplete(inst, players, now);
      }
    }
  },
};
