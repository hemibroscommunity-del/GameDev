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

import { ARCHETYPES, MONSTER_HP_CURVE, monsterHpFlat } from './data.js';

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

/* v2.3.1194: BOSS ABILITY SCRIPT (handoff item F follow-up).  Server
 * bosses were stat-scaled chase-and-swing only; the slam/charge/summon/
 * sweep kit lived in DEAD client AI (monsterCombat.js boss phase
 * cycling + the dungeonWaves.js unlock gates -- unreachable under
 * S._serverDungeon).  Ported here as a per-boss script riding
 * _tickDungeons, per the spec's attach-point note ("keep it in
 * dungeon.js; don't fork _tickMonsters").
 *
 * Numbers are the legacy client values (code is truth) with two
 * deliberate conservative deviations:
 *   - MAX_HIT_PCT: one ability hit never exceeds half the victim's max
 *     HP -- the no-oneshot guard (BALANCE-PLAN has no boss table; this
 *     invariant stands in for one).
 *   - SUMMON.MAX_ALIVE + REWARD_MULT: legacy minions were UNCAPPED and
 *     paid full swarm XP/gold at 30% HP -- an add-farming faucet once
 *     the server owns the credit.  Capped at 4 live minions and the
 *     rewards halved.
 * NOT ported: the invulnerable-except-recovery phase armor (it would
 * touch every damage path and §7 kill-credit surfaces for no ask) and
 * 'enrage' (standard depth dungeons only -- dormant since v2.3.54).
 * v2.3.1199: enrage has since shipped as a clean REDESIGN (the ENRAGE
 * block below + _dungeonTickEnrage), not a port of the legacy
 * 30%-HP rage. */
export const BOSS_ABILITIES = {
  FIRST_CAST_MS: 3000,    // legacy: _nextAbility = spawn + 3000
  COOLDOWN_MS: 4000,      // legacy: _abilityInterval on the custom-dungeon path
  TELEGRAPH_MS: 1000,     // legacy telegraph phase; client renders the warning
  SUMMON_UNLOCK_LVL: 20,  // legacy: cfg.monsterLevel >= 20 adds summon
  SWEEP_UNLOCK_LVL: 40,   // legacy: cfg.monsterLevel >= 40 adds sweep
  MAX_HIT_PCT: 0.5,       // no-oneshot guard: one ability hit <= 50% of victim maxHp
  /* v2.3.1215 (item I): per-archetype ability kits.  Until now EVERY
   * boss ran the same slam+charge rotation (+ summon/sweep by level),
   * so the bossArchetype knob changed only stats, never behaviour.  Now
   * each archetype starts with its SIGNATURE ability live from level 1
   * (a swarm summons, a sentinel sweeps, a stalker charges) via its base
   * kit; the legacy level gates (SUMMON_UNLOCK/SWEEP_UNLOCK) still layer
   * the fuller kit onto any archetype at depth, so a high-level boss of
   * any type eventually wields the whole rotation.  All abilities are
   * the EXISTING kinds (no new wire surface, rule 13) and every hit
   * still routes through _dungeonBossHitPlayer -> the MAX_HIT_PCT
   * no-oneshot clamp (authoritative over everything, item I danger).
   * Unknown archetypes fall back to the brute kit. */
  KITS: {
    brute:    ['slam', 'charge'],   // heavy melee -- the legacy default
    sentinel: ['sweep', 'slam'],    // wide, space-controlling
    swarm:    ['summon', 'slam'],   // spawner: adds from level 1
    stalker:  ['charge', 'slam'],   // aggressive lunger
    hexer:    ['summon', 'sweep', 'siphon'],  // caster: adds + wide control + life-drain (v2.3.1217 signature)
    volatile: ['charge', 'slam'],   // explosive rusher
  },
  // Archetype-distinct boss glyph (rides the existing monster emoji
  // wire -- no client code).  Fallback dragon for brute/fodder/snowman.
  BOSS_EMOJI: { brute: '🐉', sentinel: '🗿', swarm: '🕷', stalker: '🐺', hexer: '🧙', volatile: '☄' },
  SLAM:   { RANGE: 80, DMG_MULT: 1.5 },   // legacy slamRange / m.dmg x1.5
  SWEEP:  { RANGE: 70, DMG_MULT: 1.2 },   // legacy sweepRange / m.dmg x1.2
  /* v2.3.1217 (item I follow-up): SIPHON -- the first genuinely NEW
   * boss ability kind since the v2.3.1194 port.  A single-target
   * life-drain: the boss hits the nearest player in range for DMG_MULT,
   * then heals itself HEAL_PCT of its own maxHp -- but ONLY on damage
   * that actually LANDS, so a well-timed block (full negation) denies
   * the heal as well as the hit.  Damage still routes through
   * _dungeonBossHitPlayer -> the MAX_HIT_PCT clamp (authoritative); the
   * heal clamps to maxHp and rides the normal monster HP tick delta.
   * Hexer's signature (a caster that sustains); no new wire event --
   * it reuses dungeon_boss_ability with kind 'siphon'. */
  SIPHON: { RANGE: 100, DMG_MULT: 1.3, HEAL_PCT: 0.03 },
  // Legacy charge: spd x6 per 60fps FRAME for 600ms; the server ticks
  // at 45Hz, so x8/tick approximates the same px/sec lunge.
  CHARGE: { DURATION_MS: 600, SPEED_MULT: 8, HIT_RANGE: 45, DMG_MULT: 1.5 },
  SUMMON: {
    COUNT_MIN: 2, COUNT_MAX: 3, // legacy: 2 + rand(0..1)
    LEVEL_DELTA: 5,             // legacy: minion level = boss level - 5
    HP_MULT: 0.3,               // legacy: 30%-HP swarm adds
    MAX_ALIVE: 4,               // live-minion cap (legacy: uncapped)
    REWARD_MULT: 0.5,           // XP/gold haircut vs a real swarm (faucet guard)
  },
  /* v2.3.1199: ENRAGE -- soft anti-stall timer, a clean REDESIGN of
   * the legacy depth-dungeon enrage that v2.3.1194 deliberately did
   * not port (the legacy version was a one-shot 30%-HP rage on
   * dormant standard-depth content, dead since v2.3.54).  NOT a hard
   * wipe: after AFTER_MS of the boss being in combat (clock starts at
   * the first damage it takes) its damage ramps DMG_STEP per STEP_MS
   * up to DMG_CAP, and ability cooldowns shorten by COOLDOWN_MULT.
   * The v2.3.1194 MAX_HIT_PCT no-oneshot clamp stays authoritative:
   * enrage inflates m.dmg BEFORE the clamp, never around it.  Owner
   * tuning knobs live here; flip ENABLED to false to turn the whole
   * timer off. */
  ENRAGE: {
    ENABLED: true,
    AFTER_MS: 120000,    // 2 min in combat before the timer arms
    STEP_MS: 30000,      // one ramp step per 30s enraged
    DMG_STEP: 0.10,      // +10% of the boss's spawn dmg per step
    DMG_CAP: 0.50,       // ramp ceiling: +50% total
    COOLDOWN_MULT: 0.6,  // 4000ms ability cooldowns become 2400ms
  },
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
    /* v2.3.1608: own-property gate -- ARCHETYPES['constructor'] is a
       truthy inherited member, so a crafted archetype survived this
       sanitizer and _getArchetype later read undefined stats off it,
       spawning NaN-hp monsters that can never be killed and permanently
       wedge the owner's dungeon slot (TRAPS #6). */
    const arch = (a) => (typeof a === 'string' && Object.prototype.hasOwnProperty.call(ARCHETYPES, a)) ? a : 'fodder';
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
    // v2.3.1150: live-ops kill switch (dungeon_error is already in
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
    // v2.3.1218 (item D follow-up): leader-initiated group entry -- if the
    // starter leads a party, pull their co-located members into the same
    // instance so a party runs the dungeon together (instances are shared
    // by design: rewards + boss HP already scale to everyone present).
    this._dungeonPullPartyMembers(inst, session.id);
  },

  // v2.3.1218: send the SAME dungeon_started to each eligible party member
  // so their client runs the identical entry path (gameEvents.js does not
  // gate on who requested it -- no new client code, no teleport primitive).
  // Conservative guards: ONLY when the starter is the party LEADER, and
  // only members who are connected, alive, and standing in the starter's
  // CURRENT zone (they were together when the run began -- a member off in
  // another zone or their own dungeon is left where they are).  ps.z is
  // unchanged here (the owner's client zones in asynchronously on its own
  // dungeon_started), so it still reads the pre-run zone.  Returns the
  // number pulled.  No caps flag: an old client already enters on
  // dungeon_started, so this is deploy-order safe in both directions.
  _dungeonPullPartyMembers(inst, ownerId) {
    const p = this._partyOf && this._partyOf(ownerId);
    if (!p || p.leader !== ownerId) return 0;
    const ownerPs = this.playerState[ownerId];
    const fromZone = ownerPs && ownerPs.z;
    if (!fromZone) return 0;
    let pulled = 0;
    for (const pid of p.members) {
      if (pid === ownerId) continue;
      const mps = this.playerState[pid];
      if (!mps || mps.dead || mps.dying || mps.disconnected) continue;
      if (mps.z !== fromZone) continue;
      this._dungeonSend(pid, { type: 'dungeon_started', payload: { zone: inst.zone, cfg: inst.cfg, wave: 1 } });
      pulled++;
    }
    return pulled;
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
      hp: Math.ceil(baseHp * a.hpMult) + monsterHpFlat(lvl), /* v2.3.1364: Lv1-2 -> flatLow */
      maxHp: Math.ceil(baseHp * a.hpMult) + monsterHpFlat(lvl),
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

  // v2.3.1215 (item I): the ability rotation for a boss of `archetype`
  // at `level` -- its signature kit (BOSS_ABILITIES.KITS) plus the
  // legacy summon/sweep level gates layered on (deduped), so depth still
  // grows every archetype toward the full rotation.  Unknown archetypes
  // fall back to the brute kit.
  _dungeonBossKit(archetype, level) {
    const base = BOSS_ABILITIES.KITS[archetype] || BOSS_ABILITIES.KITS.brute;
    const kit = base.slice();
    if (level >= BOSS_ABILITIES.SUMMON_UNLOCK_LVL && !kit.includes('summon')) kit.push('summon');
    if (level >= BOSS_ABILITIES.SWEEP_UNLOCK_LVL && !kit.includes('sweep')) kit.push('sweep');
    return kit;
  },

  _dungeonSpawnBoss(inst) {
    const list = this.monsters[inst.zone];
    if (!list) return;
    const present = this._dungeonZonePlayers(inst.zone).length;
    const scale = DUNGEONS.PARTY_HP_SCALE[Math.max(0, Math.min(present - 1, DUNGEONS.PARTY_HP_SCALE.length - 1))];
    const m = this._dungeonMonster(inst, inst.cfg.bossArchetype, inst.cfg.monsterLevel + 5, inst.cfg.element, 'boss');
    // v2.3.1346: the flat +100 HP bump applies AFTER the boss/party
    // multipliers -- "all monsters get +100", not +100 x8 amplified.
    const hpFlat = monsterHpFlat(m.level); /* v2.3.1364: level-aware — must match the flat added at spawn */
    m.hp = Math.ceil((m.hp - hpFlat) * inst.cfg.bossMultiplier * scale) + hpFlat;
    m.maxHp = m.hp;
    m.dmg = Math.ceil(m.dmg * 1.5);
    m.emoji = BOSS_ABILITIES.BOSS_EMOJI[inst.cfg.bossArchetype] || '🐉';
    m.color = '#ff5e6c';
    // Center-top, same spot the legacy client boss appeared.
    m.x = Math.floor(inst.cfg.width / 2) * this.TILE;
    m.y = Math.floor(inst.cfg.height / 3) * this.TILE;
    m.spawnX = m.x; m.spawnY = m.y;
    // v2.3.1194: ability script state.  Kit + unlock gates are the
    // legacy custom-dungeon values (dungeonWaves.js) verbatim.  All
    // underscore fields -- every wire mapping (zone snapshot, tick
    // delta, _dungeonPushZoneState) copies explicit fields, so none of
    // this leaks to clients.
    m._dungeonBoss = true;
    // v2.3.1215 (item I): archetype signature kit + the legacy level
    // gates layered on (see BOSS_ABILITIES.KITS).
    m._abilities = this._dungeonBossKit(inst.cfg.bossArchetype, inst.cfg.monsterLevel);
    m._abilityPattern = 0;   // fixed rotation cursor (legacy _attackPattern)
    m._abilityPhase = null;  // null | 'telegraph'
    m._pendingAbility = null;
    m._phaseUntil = 0;
    m._nextAbilityAt = Date.now() + BOSS_ABILITIES.FIRST_CAST_MS;
    list.push(m);
    inst.bossSpawned = true;
    this._markMonsterDirty(inst.zone, m.id);
  },

  // v2.3.1194: private notice to everyone inside -- the client handler
  // is DISPLAY-ONLY (popup / impact ring / shake); all damage arrives
  // via the authoritative monster_attack + player_state paths below.
  _dungeonBossAbilityEvent(zone, players, m, ability, phase, extra) {
    const payload = {
      zone, monsterId: m.id, ability, phase,
      x: Math.round(m.x), y: Math.round(m.y), ...extra,
    };
    for (const pid of players) {
      this._dungeonSend(pid, { type: 'dungeon_boss_ability', payload });
    }
  },

  // v2.3.1194: one ability hit vs one player.  Mirrors the basic-attack
  // sequence in _tickMonsters (block short-circuit, _applyDamage,
  // lifesteal damage tracking, monster_attack emission, save/flush,
  // death check) so abilities ride the exact same authoritative-damage
  // rails.  Deliberately NO thorns reflect on a blocked ability -- the
  // reflect surface stays pinned to the basic swing (one reflect per
  // MONSTER_ATTACK_CD); an AoE that also triggered it would multiply
  // thorns output per cast.
  // v2.3.1217: returns the HP actually taken (0 on block / dodge / grace /
  // dead) so a life-drain caller (siphon) can gate its heal on a landed hit.
  _dungeonBossHitPlayer(inst, m, pid, dmgMult) {
    const ps = this.playerState[pid];
    if (!ps || ps.dead || ps.dying) return 0;
    const zone = inst.zone;
    if (ps.blocking) {
      // Block = full negation (v2.3.1110 omni rule), same stamina cost
      // as a blocked basic attack; staminaDrain rides the wire so the
      // client's floating number matches the server-side cost.
      const staminaCost = Math.max(1, Math.round(15 * this._blockStaminaMult(ps)));
      if (typeof ps.stamina === 'number') {
        ps.stamina = Math.max(0, ps.stamina - staminaCost);
        this._saveRpg(pid, ps);
        this._queuePlayerStateFlush(pid);
      }
      this.eventBuffer.push({
        type: 'monster_attack',
        payload: {
          monsterId: m.id, targetId: pid, dmg: m.dmg, dmgTaken: 0,
          blocked: true, staminaDrain: staminaCost,
          zone, attackerX: m.x, attackerY: m.y,
        },
      });
      return 0;
    }
    // No-oneshot clamp BEFORE _applyDamage so dodge/Iron Skin/Second
    // Wind all see the already-conservative number.
    const raw = Math.min(
      Math.ceil(m.dmg * dmgMult),
      Math.max(1, Math.floor((ps.maxHp || 100) * BOSS_ABILITIES.MAX_HIT_PCT))
    );
    const res = this._applyDamage(ps, raw, false);
    if (!res.dodged) {
      const trackAmt = res.graced ? (res.dmgIntent || 0) : res.dmgTaken;
      this._trackMonsterDamage(ps, m.id, trackAmt);
    }
    this.eventBuffer.push({
      type: 'monster_attack',
      payload: {
        monsterId: m.id, targetId: pid, dmg: raw, dmgTaken: res.dmgTaken,
        dodged: res.dodged, secondWind: res.secondWind || undefined,
        zone, attackerX: m.x, attackerY: m.y,
      },
    });
    this._saveRpg(pid, ps);
    this._queuePlayerStateFlush(pid);
    if (ps.hp <= 0 && !ps.dying) {
      this._handlePlayerDeath(ps, pid, 'monster:' + m.id);
    }
    return res.dodged ? 0 : res.dmgTaken;
  },

  // v2.3.1194: summon execution.  Minions ride the normal
  // _dungeonMonster pipeline (noRespawn, §7 contribution, kill quests)
  // with the legacy 30% HP cut, PLUS the cap + reward haircut the
  // legacy client never had (see BOSS_ABILITIES header).  Returns the
  // number actually spawned so the caller knows whether a zone_state
  // re-push is needed.
  _dungeonBossSummon(inst, m) {
    const list = this.monsters[inst.zone];
    if (!list) return 0;
    const aliveMinions = list.filter((x) => x._bossMinion && x.alive).length;
    const headroom = BOSS_ABILITIES.SUMMON.MAX_ALIVE - aliveMinions;
    if (headroom <= 0) return 0;
    const want = BOSS_ABILITIES.SUMMON.COUNT_MIN + Math.floor(
      Math.random() * (BOSS_ABILITIES.SUMMON.COUNT_MAX - BOSS_ABILITIES.SUMMON.COUNT_MIN + 1));
    const n = Math.min(want, headroom);
    if (inst._minionSeq === undefined) inst._minionSeq = 0;
    for (let i = 0; i < n; i++) {
      const lvl = Math.max(1, m.level - BOSS_ABILITIES.SUMMON.LEVEL_DELTA);
      const mn = this._dungeonMonster(inst, 'swarm', lvl, m.element, 'minion-' + (inst._minionSeq++));
      mn._bossMinion = true;
      mn.hp = Math.max(1, Math.ceil(mn.hp * BOSS_ABILITIES.SUMMON.HP_MULT));
      mn.maxHp = mn.hp;
      mn.xp = Math.max(1, Math.ceil(mn.xp * BOSS_ABILITIES.SUMMON.REWARD_MULT));
      mn.gold = Math.max(0, Math.ceil(mn.gold * BOSS_ABILITIES.SUMMON.REWARD_MULT));
      // Near-boss placement clamped inside the arena (legacy parity:
      // +-40/+-30 px scatter, min 2 tiles off the walls).
      mn.x = Math.max(this.TILE * 2, Math.min(m.x + (Math.random() - 0.5) * 80, (inst.cfg.width - 2) * this.TILE));
      mn.y = Math.max(this.TILE * 2, Math.min(m.y + (Math.random() - 0.5) * 60, (inst.cfg.height - 2) * this.TILE));
      mn.spawnX = mn.x; mn.spawnY = mn.y;
      list.push(mn);
      this._markMonsterDirty(inst.zone, mn.id);
    }
    return n;
  },

  // v2.3.1199: the ENRAGE soft timer (config + rationale on the
  // BOSS_ABILITIES.ENRAGE block).  Runs every ability tick, fully
  // independent of the cast state machine, so the ramp keeps counting
  // through telegraphs and charges.  The combat clock arms on the
  // FIRST DAMAGE the boss takes (hp < maxHp observed by the 45Hz
  // tick), not on spawn -- a boss nobody engages never enrages.  Each
  // stack rewrites m.dmg from the stashed spawn value (_enrageBaseDmg;
  // never compounds) so the ramp applies to basic swings AND every
  // ability (they all multiply m.dmg), and each stack emits the
  // existing dungeon_boss_ability event with kind 'enrage' -- reusing
  // the PRIVILEGED type instead of minting a new one (rule 13 surface
  // stays fixed); the client case is display-only (tint/popup).
  _dungeonTickEnrage(inst, players, m, now) {
    const E = BOSS_ABILITIES.ENRAGE;
    if (!E.ENABLED) return;
    if (!m._combatSince) {
      if (m.hp < m.maxHp) m._combatSince = now;
      return;
    }
    const enragedFor = now - m._combatSince - E.AFTER_MS;
    if (enragedFor < 0) return;
    const maxStacks = Math.round(E.DMG_CAP / E.DMG_STEP);
    const stacks = Math.min(maxStacks, 1 + Math.floor(enragedFor / E.STEP_MS));
    if (stacks <= (m._enrageStacks || 0)) return;
    if (m._enrageBaseDmg === undefined) m._enrageBaseDmg = m.dmg;
    m._enrageStacks = stacks;
    const pct = Math.min(E.DMG_CAP, stacks * E.DMG_STEP);
    m.dmg = Math.ceil(m._enrageBaseDmg * (1 + pct));
    this._markMonsterDirty(inst.zone, m.id);
    this._dungeonBossAbilityEvent(inst.zone, players, m, 'enrage', 'execute', {
      stacks, pct: Math.round(pct * 100),
    });
  },

  // v2.3.1199: enraged bosses also cycle abilities faster -- the soft
  // timer's second pressure lever alongside the damage ramp.
  _dungeonBossCooldownMs(m) {
    const B = BOSS_ABILITIES;
    if (!m._enrageStacks) return B.COOLDOWN_MS;
    return Math.max(1000, Math.round(B.COOLDOWN_MS * B.ENRAGE.COOLDOWN_MULT));
  },

  // v2.3.1194: the per-tick ability driver.  Cycle per cast:
  //   ready (cooldown elapsed) -> telegraph (1s wind-up, movement +
  //   basic swing suppressed via the existing _attackingUntil/atkCd
  //   fields _tickMonsters already honors -- no core-AI fork) ->
  //   execute -> cooldown.
  // Charge is the one ability with a duration: its movement runs here
  // (never in _tickMonsters) and ends on first contact or timeout.
  _dungeonTickBossAbilities(inst, players, now) {
    const list = this.monsters[inst.zone];
    if (!list) return;
    const m = list.find((x) => x._dungeonBoss && x.alive);
    if (!m) return;
    const B = BOSS_ABILITIES;

    // v2.3.1199: enrage soft timer ticks BEFORE the cast machine's
    // early returns so the ramp keeps counting mid-charge/telegraph.
    this._dungeonTickEnrage(inst, players, m, now);

    // ── Charge in flight ──
    if (m._chargeUntil) {
      if (now < m._chargeUntil) {
        // Keep _tickMonsters' chase step out of the lunge (it honors
        // _attackingUntil as a movement freeze).
        m._attackingUntil = Math.max(m._attackingUntil || 0, now + 100);
        m.x += Math.cos(m._chargeAngle) * m._chargeSpeed;
        m.y += Math.sin(m._chargeAngle) * m._chargeSpeed;
        // Never lunge out of the arena.
        m.x = Math.max(this.TILE, Math.min(m.x, (inst.cfg.width - 1) * this.TILE));
        m.y = Math.max(this.TILE, Math.min(m.y, (inst.cfg.height - 1) * this.TILE));
        this._markMonsterDirty(inst.zone, m.id);
        for (const pid of players) {
          const ps = this.playerState[pid];
          if (!ps || ps.dead || ps.dying) continue;
          const dx = ps.x - m.x, dy = ps.y - m.y;
          if (dx * dx + dy * dy < B.CHARGE.HIT_RANGE * B.CHARGE.HIT_RANGE) {
            this._dungeonBossHitPlayer(inst, m, pid, B.CHARGE.DMG_MULT);
            m._chargeUntil = 0; // stop charging on hit (legacy parity)
            break;
          }
        }
        return; // no new casts mid-lunge
      }
      m._chargeUntil = 0;
    }

    // ── Telegraph running / resolving ──
    if (m._abilityPhase === 'telegraph') {
      if (now < m._phaseUntil) {
        m._attackingUntil = Math.max(m._attackingUntil || 0, now + 100);
        return; // still winding up -- the client is rendering the warning
      }
      const ability = m._pendingAbility;
      m._abilityPhase = null;
      m._pendingAbility = null;
      // v2.3.1199: cooldown shortens while enraged.
      m._nextAbilityAt = now + this._dungeonBossCooldownMs(m);
      const extra = {}; // proto-ok: fixed-field payload struct, not an id-keyed map
      if (ability === 'slam' || ability === 'sweep') {
        const cfgA = ability === 'slam' ? B.SLAM : B.SWEEP;
        extra.range = cfgA.RANGE;
        for (const pid of players) {
          const ps = this.playerState[pid];
          if (!ps || ps.dead || ps.dying) continue;
          const dx = ps.x - m.x, dy = ps.y - m.y;
          if (dx * dx + dy * dy < cfgA.RANGE * cfgA.RANGE) {
            this._dungeonBossHitPlayer(inst, m, pid, cfgA.DMG_MULT);
          }
        }
      } else if (ability === 'charge') {
        // Aim at the nearest live player at execute time (legacy aimed
        // at ITS player -- single-player AI; nearest is the MP analog).
        let tgt = null, best = Infinity;
        for (const pid of players) {
          const ps = this.playerState[pid];
          if (!ps || ps.dead || ps.dying) continue;
          const d2 = (ps.x - m.x) * (ps.x - m.x) + (ps.y - m.y) * (ps.y - m.y);
          if (d2 < best) { best = d2; tgt = ps; }
        }
        if (tgt) {
          m._chargeUntil = now + B.CHARGE.DURATION_MS;
          m._chargeAngle = Math.atan2(tgt.y - m.y, tgt.x - m.x);
          m._chargeSpeed = m.spd * B.CHARGE.SPEED_MULT;
        }
      } else if (ability === 'summon') {
        const n = this._dungeonBossSummon(inst, m);
        extra.count = n;
        // Fresh entities need the full-snapshot path on BOTH protocols
        // (per-tick deltas only update entities the client already
        // knows) -- same reason wave spawns re-push.
        if (n > 0) this._dungeonPushZoneState(inst.zone);
      } else if (ability === 'siphon') {
        // v2.3.1217: life-drain -- nearest live player in range takes the
        // hit; the boss heals a slice of maxHp ONLY if the hit landed
        // (block/dodge/grace deny both the damage AND the heal).  The
        // heal clamps to maxHp and rides the monster HP tick delta.
        extra.range = B.SIPHON.RANGE;
        let tgt = null, best = B.SIPHON.RANGE * B.SIPHON.RANGE;
        for (const pid of players) {
          const ps = this.playerState[pid];
          if (!ps || ps.dead || ps.dying) continue;
          const d2 = (ps.x - m.x) * (ps.x - m.x) + (ps.y - m.y) * (ps.y - m.y);
          if (d2 < best) { best = d2; tgt = pid; }
        }
        if (tgt) {
          const dealt = this._dungeonBossHitPlayer(inst, m, tgt, B.SIPHON.DMG_MULT);
          if (dealt > 0 && m.hp < m.maxHp) {
            const heal = Math.min(m.maxHp - m.hp, Math.ceil(m.maxHp * B.SIPHON.HEAL_PCT));
            m.hp += heal;
            extra.heal = heal;
            this._markMonsterDirty(inst.zone, m.id);
          }
        }
      }
      this._dungeonBossAbilityEvent(inst.zone, players, m, ability, 'execute', extra);
      return;
    }

    // ── Ready: pick the next ability in the fixed rotation ──
    if (now < m._nextAbilityAt) return;
    let ability = null;
    for (let i = 0; i < m._abilities.length; i++) {
      const cand = m._abilities[m._abilityPattern % m._abilities.length];
      m._abilityPattern++;
      if (cand === 'summon') {
        // At the minion cap, skip to the next ability instead of
        // burning the cast on a no-op.
        const aliveMinions = list.filter((x) => x._bossMinion && x.alive).length;
        if (aliveMinions >= B.SUMMON.MAX_ALIVE) continue;
      }
      ability = cand;
      break;
    }
    if (!ability) { m._nextAbilityAt = now + this._dungeonBossCooldownMs(m); return; }
    m._abilityPhase = 'telegraph';
    m._pendingAbility = ability;
    m._phaseUntil = now + B.TELEGRAPH_MS;
    // Plant the boss for the wind-up and hold its basic swing through
    // the execute -- both via fields _tickMonsters already honors.
    m._attackingUntil = Math.max(m._attackingUntil || 0, now + B.TELEGRAPH_MS);
    m.atkCd = Math.max(m.atkCd || 0, now + B.TELEGRAPH_MS + 500);
    const extra = { ms: B.TELEGRAPH_MS };
    if (ability === 'slam') extra.range = B.SLAM.RANGE;
    if (ability === 'sweep') extra.range = B.SWEEP.RANGE;
    if (ability === 'siphon') extra.range = B.SIPHON.RANGE;
    this._dungeonBossAbilityEvent(inst.zone, players, m, ability, 'telegraph', extra);
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
      // v2.3.1194: boss ability script (telegraph/execute/charge/summon)
      // runs while the boss lives; wave logic below is untouched.
      if (inst.bossSpawned) this._dungeonTickBossAbilities(inst, players, now);
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
