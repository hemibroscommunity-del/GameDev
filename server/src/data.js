/* ═══ SERVER DATA TABLES — extracted from GameRoom (P4 slice 2, v2.3.1115) ═══
 *
 * Moved VERBATIM out of the method bodies in index.js; the lookup methods
 * (_getArchetype, _getZoneConfig, _fishHealAmount, _getCookingRecipe,
 * _getShopItem, _QUEST_REWARDS_DATA, _BLACKSMITH_TIERS_DATA,
 * _WOODWORKING_TIERS_DATA) remain in GameRoom so no call site changed.
 * These MIRROR client tables -- each carries the same keep-in-sync
 * obligation the inline comments always had:
 *   ARCHETYPES         <-> src/data/gameSystems.js ARCHETYPES
 *   ZONES              <-> src/data/zones.js (level bands MUST match)
 *   FISH_TIERS         <-> src/data/lifeSkills.js FISHING_TIERS
 *   COOKING_RECIPES    <-> src/data/gameSystems.js (index order matters)
 *   SHOP_ITEMS         <-> src/ui/panels/buildings/VendorPanel.jsx
 *                          (v2.3.1151: pointer fixed -- the vendor table
 *                          moved out of BroTown.jsx in the v2.3.882
 *                          decomposition; test/mirror-audit.test.mjs
 *                          extracts from that path, keep them together)
 *   QUEST_REWARDS      <-> src/data/gameSystems.js QUEST_CHAINS rewards
 *   BLACKSMITH/WOODWORKING_TIERS <-> src/data/gameSystems.js            */

/* v2.3.1140: BF-1 fix -- monster HP curve centralized + ramp flattened
 * 1.065 -> 1.052 so mid-band kill times pass the §6.5 audit gates (HP
 * compounded past linear player damage growth across L25-L80).
 *   MONSTER_HP_CURVE <-> src/data/gameSystems.js MONSTER_HP_CURVE
 * Consumed by _spawnZoneMonsters (index.js) and _dungeonMonster
 * (dungeon.js).  Damage/XP/gold curves stay inline at those call sites
 * (unchanged by BF-1; centralize them if they ever need tuning). */
export const MONSTER_HP_CURVE = { base: 12.5, ramp: 1.052, plateau: 1.035, endgame: 1.025, flat: 100, flatLow: 50, flatLowMaxLvl: 2 }; /* v2.3.1346: owner — every monster +100 HP flat.  v2.3.1364: owner — Lv1-2 monsters carry 50 LESS of it (flatLow) so starter fights don't feel spongy */

/* v2.3.1364: level-aware flat HP term.  Use this instead of reading
 * MONSTER_HP_CURVE.flat directly at spawn sites — Lv1-2 gets flatLow.
 * MIRRORED in src/data/gameSystems.js monsterHpFlat (keep in sync). */
export function monsterHpFlat(level) {
  return level <= (MONSTER_HP_CURVE.flatLowMaxLvl || 0)
    ? (MONSTER_HP_CURVE.flatLow || 0)
    : (MONSTER_HP_CURVE.flat || 0);
}

/* v2.3.1153: damage channel was repriced flat-in-tierMult -> a
 * tier-independent multiplier (+49.5% at 99 pts).
 * v2.3.1343 (owner directive 2026-07-16, kid-simple reprice): FLAT
 * +1/pt again, but added POST-tier POST-variance (pre-crit/buffs) in
 * _computeAttackDamage — "+1 damage per point" is the kid sentence,
 * and post-roll flat can't compound with tier like the pre-1153
 * version did.  Imbalance accepted by design (fun-first).
 *   DAMAGE_CHANNEL_FLAT <-> src/data/gameSystems.js DAMAGE_CHANNEL_FLAT
 *                           (and WEAPON_CHANNELS damage-role perPt) */
export const DAMAGE_CHANNEL_FLAT = 1;

/* v2.3.1345 (owner round 2): ACCELERATING FLAT + COUNTER SKILLS.
 * Point N in a free-running channel is worth 2·UNIT·N (always bigger
 * than the point before); cumulative = UNIT·p·(p+1).  Crit/dodge are
 * deterministic accumulators at rate 0.005/pt ("every Nth hit").
 * Mirrors src/data/gameSystems.js t2Accel/T2_UNITS/t2CounterRate —
 * mirror-audit ties them. */
export const T2_UNITS = {
  /* v2.3.1415: critDmg 1.5 -> 4 (owner balance pass — crit build hits
     per-point parity with the damage channel; see the client
     gameSystems.js T2_UNITS note).  Keep in lockstep with the client. */
  damage: 1, critDmg: 4, ironskin: 0.5, resilience: 1, thorns: 1,
  secondwind: 2.5, vigor: 2, recovery: 1, lifeblood: 1.5, stamina: 1,
};
export function t2Accel(pts, unit) {
  const p = Math.max(0, Math.min(100, Math.floor(pts || 0)));
  return Math.round(unit * p * (p + 1));
}
export function t2CounterRate(pts) {
  return Math.max(0, Math.min(100, Math.floor(pts || 0))) * 0.005;
}

/* ═══ v2.3.1451: BENCH-LOCKED T2 PRICING (owner directive 2026-07-24) ═══
 *
 * "Make the strength of that skill relative to current level monsters
 * (and lower) with decaying power carried to the next level up...
 * each stat point needs to offer an immediate noticeable improvement
 * similar to an increase in base damage."
 *
 * The 10 FLAT-number channels (the T2_UNITS set) stop being absolute
 * accelerating flats and become BENCH-LOCKED: a point, at the moment
 * it is spent, converts to a permanent flat amount sized as a
 * percentage of the BENCHMARK MONSTER's stats at the buyer's level.
 * Benchmark = a level-(combatLevel/10) SENTINEL (1.0/1.0 mults), so:
 *   - every point is immediately felt against what you fight NOW
 *     ("1 point = a 4% bite of today's monster"), at level 3 and at
 *     level 900 alike;
 *   - the number NEVER shrinks (owner choice: locked-in, no explicit
 *     decay factor) — monsters simply outgrow old points, which is
 *     the "decaying power carried to the next level up";
 *   - flat PER POINT, not accelerating: the benchmark itself grows
 *     ~5%/monster-level (ticking every 10 combat levels), so later
 *     points are still bigger than earlier ones without re-creating
 *     the absurd absolute flats (+10,100 damage vs a 537-HP endgame
 *     monster) that t2Accel produced.
 * The mechanical channels (tempo/cleave/counters/etc.) are UNTOUCHED,
 * and t2Accel/T2_UNITS above stay: counters still use t2CounterRate,
 * and pre-t2bench clients still run the legacy math locally until the
 * caps flag flips their paths (deploy-order safety).
 * Server owns the accumulated values (ps.t2Flat — see grids.js); the
 * client NEVER supplies them, it only predicts with these same
 * helpers.  MIRRORED in src/data/gameSystems.js; mirror-audit pins
 * every table and probes the functions at several benchmarks. */

/* Standalone twin of GameRoom._monsterStat (index.js) / the client's
 * monsterStat (gameSystems.js) — the tri-phase spawn curve.  Needed
 * here so the bench helpers below can price points off the REAL
 * spawn math (a benchmark that could drift from what actually spawns
 * would silently break the whole "relative to monsters" promise). */
export function monsterStat(base, level, rRamp, rPlateau, rEndgame) {
  if (level <= 30) return Math.ceil(base * Math.pow(rRamp, level - 1));
  const at30 = Math.ceil(base * Math.pow(rRamp, 29));
  if (level <= 65) return Math.ceil(at30 * Math.pow(rPlateau, level - 30));
  const at65 = Math.ceil(at30 * Math.pow(rPlateau, 35));
  return Math.ceil(at65 * Math.pow(rEndgame, level - 65));
}

/* Combat level 1-1000 -> benchmark monster level 1-100.  CEIL, so the
 * yardstick monster grows a level exactly every 10 points placed and
 * is never 0 ("every 10 levels, your yardstick monster grows one"). */
export function t2BenchLevel(playerLevel) {
  return Math.max(1, Math.min(100, Math.ceil((playerLevel || 1) / 10)));
}

/* Benchmark SENTINEL stats at bench level B — hp uses the centralized
 * MONSTER_HP_CURVE + the level-aware flat term, dmg uses the same
 * inline curve constants as _spawnZoneMonsters / _dungeonMonster
 * (base 12, ramps 1.045/1.025/1.018).  Sentinel mults are 1.0/1.0 so
 * no archetype factor appears. */
export function t2BenchStats(B) {
  return {
    hp: Math.ceil(monsterStat(MONSTER_HP_CURVE.base, B, MONSTER_HP_CURVE.ramp, MONSTER_HP_CURVE.plateau, MONSTER_HP_CURVE.endgame)) + monsterHpFlat(B),
    dmg: Math.ceil(monsterStat(12, B, 1.045, 1.025, 1.018)),
  };
}

/* The one tuning table.  ref 'hp' = fraction of the benchmark
 * sentinel's HP (offense reads as "bites out of the monster"); ref
 * 'dmg' = fraction of its damage (defense/heals/pools read as
 * "monster hits soaked/healed/survived").  Tuned against the
 * balance-sim gates (tools/balance-sim.mjs --bench; INV-03 kill-time
 * windows, INV-06 EHP spread). */
export const T2_BENCH = {
  damage:     { ref: 'hp',  pct: 0.04 }, /* 1 pt = a 4% bite of today's monster, every swing */
  critDmg:    { ref: 'hp',  pct: 0.16 }, /* 4x the damage point — keeps the v2.3.1415 crit-pair parity (LUCKY every 2nd hit at max counter) */
  thorns:     { ref: 'hp',  pct: 0.05 }, /* 20 at-level pts ≈ a full monster per block */
  ironskin:   { ref: 'dmg', pct: 0.05 }, /* 20 at-level pts ≈ one sentinel hit fully soaked (floor 1 stays) */
  resilience: { ref: 'dmg', pct: 0.08 }, /* big hits only (>20% maxHp rule unchanged) */
  secondwind: { ref: 'dmg', pct: 0.15 }, /* ~7 pts heal back one sentinel hit per proc (10s cd unchanged) */
  recovery:   { ref: 'dmg', pct: 0.05 },
  lifeblood:  { ref: 'dmg', pct: 0.10 },
  vigor:      { ref: 'dmg', pct: 0.25 }, /* maxHp in enemy hits: 4 pts ≈ +1 hit survived */
  stamina:    { ref: 'dmg', pct: 0.10 },
};

/* The 30 channels in THE canonical order (_clampBuildTotal's walk:
 * sword, bow, staff, defense, hp, endurance).  `role` names the
 * T2_BENCH entry for the 10 bench-priced channels; null = mechanical
 * (occupies a purchase slot / level, banks no flat).  This SAME array
 * drives the stats_update diff-pricing walk (grids.js) and the replay
 * migration below — one order, everywhere, or replays diverge. */
export const T2_BENCH_CANONICAL = [
  { grid: 'sword', key: 'edge',        role: 'damage' },
  { grid: 'sword', key: 'precision',   role: null },
  { grid: 'sword', key: 'executioner', role: 'critDmg' },
  { grid: 'sword', key: 'tempo',       role: null },
  { grid: 'sword', key: 'cleave',      role: null },
  { grid: 'bow',   key: 'drawPower',   role: 'damage' },
  { grid: 'bow',   key: 'marksmanship', role: null },
  { grid: 'bow',   key: 'headshot',    role: 'critDmg' },
  { grid: 'bow',   key: 'piercing',    role: null },
  { grid: 'bow',   key: 'longshot',    role: null },
  { grid: 'staff', key: 'spellPower',  role: 'damage' },
  { grid: 'staff', key: 'overload',    role: null },
  { grid: 'staff', key: 'detonation',  role: null },
  { grid: 'staff', key: 'attunement',  role: null },
  { grid: 'staff', key: 'focus',       role: 'critDmg' },
  { grid: 'defense', key: 'bulwark',    role: null },
  { grid: 'defense', key: 'ironskin',   role: 'ironskin' },
  { grid: 'defense', key: 'thorns',     role: 'thorns' },
  { grid: 'defense', key: 'secondwind', role: 'secondwind' },
  { grid: 'defense', key: 'poise',      role: null },
  { grid: 'hp', key: 'vigor',      role: 'vigor' },
  { grid: 'hp', key: 'recovery',   role: 'recovery' },
  { grid: 'hp', key: 'lifeblood',  role: 'lifeblood' },
  { grid: 'hp', key: 'resilience', role: 'resilience' },
  { grid: 'hp', key: 'laststand',  role: null },
  { grid: 'endurance', key: 'stamina',      role: 'stamina' },
  { grid: 'endurance', key: 'conditioning', role: null },
  { grid: 'endurance', key: 'swiftness',    role: null },
  { grid: 'endurance', key: 'evasion',      role: null },
  { grid: 'endurance', key: 'reflexes',     role: null },
];

/* Zeroed accumulator in the persisted shape: one number per
 * bench-priced channel, grouped by grid. */
export function emptyT2Flat() {
  const out = {};
  for (const ch of T2_BENCH_CANONICAL) {
    if (!ch.role) continue;
    if (!out[ch.grid]) out[ch.grid] = {};
    out[ch.grid][ch.key] = 0;
  }
  return out;
}

/* What ONE point is worth if bought at benchmark B.  CEIL, not round:
 * a point is always AT LEAST its promised fraction, which makes the
 * kid-anchors hold by algebra at every benchmark — 4 vigor points
 * always survive one extra sentinel hit (4·ceil(.25d) ≥ d), 20
 * ironskin points always soak a full one (20·ceil(.05d) ≥ d).  With
 * round(), mid benchmarks broke both (sim gates BN-03/BN-04).
 * max(1, …) is belt-and-braces; ceil of a positive already ≥ 1. */
export function t2PointValue(role, B) {
  const r = T2_BENCH[role];
  if (!r) return 0;
  const s = t2BenchStats(B);
  return Math.max(1, Math.ceil(r.pct * (r.ref === 'hp' ? s.hp : s.dmg)));
}

/* Level "at that moment" = level BEFORE the point lands = 1 + points
 * already placed.  Purely a function of the build total, so server
 * and client derive it identically without trusting ps.level. */
export function t2SpendLevel(buildTotalBefore) {
  return Math.min(1000, 1 + Math.max(0, buildTotalBefore || 0));
}

/* Replay-at-benchmark: rebuild the accumulator for a blob whose
 * purchase HISTORY was never stored (the v9 migration, the join
 * boundary heal, and test fixtures).  Fair deterministic assumption:
 * each channel's p points were uniformly interleaved across the
 * player's N total purchases — channel point j prices at global
 * purchase position ceil((2j-1)·N/(2p)) (midpoint stratification).
 * Properties: exact when one channel holds every point (pos = j);
 * order-independent; a lone point in an N=1000 build prices at the
 * median level; re-running on the same counts is a no-op by
 * construction. */
export function t2ReplayFlat(blob) {
  const out = emptyT2Flat();
  if (!blob || typeof blob !== 'object') return out;
  const pts = (ch) => {
    const spec = (ch.grid === 'sword' || ch.grid === 'bow' || ch.grid === 'staff')
      ? (blob.weaponSpecs && blob.weaponSpecs[ch.grid])
      : ch.grid === 'defense' ? blob.defenseSpec
      : ch.grid === 'hp' ? blob.hpSpec
      : blob.enduranceSpec;
    const v = (spec && typeof spec[ch.key] === 'number') ? spec[ch.key] : 0;
    return Math.max(0, Math.min(100, Math.floor(v)));
  };
  let N = 0;
  for (const ch of T2_BENCH_CANONICAL) N += pts(ch);
  if (N <= 0) return out;
  for (const ch of T2_BENCH_CANONICAL) {
    if (!ch.role) continue;
    const p = pts(ch);
    let v = 0;
    for (let j = 1; j <= p; j++) {
      const pos = Math.ceil(((2 * j - 1) * N) / (2 * p));
      v += t2PointValue(ch.role, t2BenchLevel(t2SpendLevel(pos - 1)));
    }
    out[ch.grid][ch.key] = v;
  }
  return out;
}

export const ARCHETYPES = {
      fodder:   { hpMult: 0.6, dmgMult: 0.8, spdMult: 1.0, emoji: '🟢', color: '#3dd497' },
      brute:    { hpMult: 1.5, dmgMult: 1.3, spdMult: 0.7, emoji: '🪨', color: '#6b6b6b' },
      swarm:    { hpMult: 0.4, dmgMult: 0.6, spdMult: 1.2, emoji: '🦇', color: '#9333ea' },
      sentinel: { hpMult: 1.0, dmgMult: 1.0, spdMult: 1.0, emoji: '🛡️', color: '#e8e8e8' },
      volatile: { hpMult: 0.8, dmgMult: 1.0, spdMult: 1.0, emoji: '💥', color: '#ea580c' },
      stalker:  { hpMult: 0.7, dmgMult: 1.2, spdMult: 1.3, emoji: '👁️', color: '#2C3E50' },
      hexer:    { hpMult: 0.9, dmgMult: 0.8, spdMult: 1.0, emoji: '💀', color: '#8E44AD' },
      snowman:  { hpMult: 1.3, dmgMult: 1.1, spdMult: 0.8, emoji: '⛄', color: '#b0d8f0' },
    };

/* v2.3.1116: `lawless` = open PvP without consent (GDD §26.4 posture).
 * All current wilderness zones are flagged lawless, which PRESERVES the
 * shipped behavior (client marks only town/farm_home `safe`; everywhere
 * else free-fire was live).  The gate in _resolvePvPAttack fail-closes
 * on any zone NOT in this table -- town and farm_home were never listed
 * here, so unconsented town PvP (with full death-pile drops) dies with
 * this flag.  Duels still work in town via the consent pair. */
/* v2.3.1140: zone-level UNPINNING (BALANCE-PLAN §10 phase 6, handoff
 * item K).  Bands per docs/MAP-REDESIGN.md §Bands -- each spoke owns a
 * slice of 1-100; _spawnZoneMonsters lerps monster level from the low
 * end (zone entry, north) to the high end (deep, south) by depthPct.
 * Unblocked by the BF-1 HP-curve fix above (the L35/L65 kill-time
 * gates that pinned everything to [1,1] now pass).  MUST stay in
 * lockstep with src/data/zones.js -- the client clamps server-sent
 * monster levels to ITS band (monsterVariants.js applyZoneVariant), so
 * a mismatch visibly downgrades monsters client-side.  NOTE: no zone
 * entry gating exists yet (every spoke is walkable from town at L1);
 * MAP-REDESIGN lists gating as a follow-up. */
/* v2.3.1141: `secondary` mirrors the client zone table's secondary
 * element (fusion weapon drops pair primary+secondary; server-minted
 * drops need it now that the drop roll is server-side). */
/* v2.3.1160: every band flattened to [1,2] — OWNER DIRECTIVE
 * (2026-07-04 playtest): "All zones at initial depth should be level 1
 * or 2. I have not made more depth zones yet since the game is still a
 * demo."  The MAP-REDESIGN 1-100 spoke bands (kept as comments per
 * zone) put ~L20 snowmen at the frost entrance because the world-view
 * exit spawns the player at the DEEP end of the depth lerp.  Restore
 * the per-zone bands only when depth content actually ships. */
export const ZONES = {
      meadow:  { w:32, h:32, level:[1,2],  element:null,    secondary:null,    lawless:true, spawns:[{arch:'fodder',count:3}] },       /* band: [1,10] */
      ember:   { w:32, h:32, level:[1,2], element:'flame', secondary:'stone', lawless:true, spawns:[{arch:'fodder',count:3}] },          /* band: [55,80] */
      /* v2.3.1147: verdant + mist populated -- they owned the [22,40]
       * band but spawned NOTHING, leaving a no-content hole between
       * frost/tidal (max 25) and hollows/sky (min 38) once zones
       * unpinned.  New monsters are tinted reskins of existing sprite
       * sheets (see client ZONE_VARIANT_MAP: verdant fodder->mossSlime,
       * brute->thornShambler; mist fodder->mireWisp, brute->bogLurker).
       * Base archetypes carry ALL the stats -- variants are visual. */
      mist:    { w:32, h:32, level:[1,2], element:'venom', secondary:'wind',  lawless:true, spawns:[{arch:'fodder',count:2},{arch:'brute',count:1}] },  /* band: [22,40] */
      /* v2.3.1534 (owner: "remove the rock monster from this level"): the
       * brute spawn -- which skinned as thornShambler, the mossy
       * rockmonster -- is dropped, so Verdant Wilds is slimes only.  This
       * table is authoritative; src/data/zones.js mirrors it. */
      /* v2.3.1535: the second entry's `variant` pins ONE spawn to blueSlime
       * (fast + squishy); the other 7 take the zone default mossSlime.
       * MIRROR of src/data/zones.js verdant.spawns -- zones.test.mjs compares
       * these two arrays with JSON equality, so they move together. */
      verdant: { w:32, h:32, level:[1,2], element:'flora',  secondary:'venom',    lawless:true, spawns:[{arch:'fodder',count:2},{arch:'fodder',count:1,variant:'blueSlime'}] }, /* band: [22,40] */
      frost:   { w:32, h:32, level:[1,2],  element:'frost', secondary:'storm', lawless:true, spawns:[{arch:'snowman',count:3}] },        /* band: [8,25] */
      thunder: { w:32, h:32, level:[1,2], element:'storm', secondary:'flame', lawless:true, spawns:[{arch:'fodder',count:3}] },          /* band: [55,80] */
      hollows: { w:32, h:32, level:[1,2], element:'stone', secondary:'venom', lawless:true, spawns:[{arch:'brute',count:3}] },           /* band: [38,58] */
      sky:     { w:32, h:32, level:[1,2], element:'wind',  secondary:'frost', lawless:true, spawns:[{arch:'stalker',count:1},{arch:'hexer',count:1},{arch:'volatile',count:1}] }, /* band: [38,58] */
      tidal:   { w:32, h:32, level:[1,2],  element:'water', secondary:'venom', lawless:true, spawns:[{arch:'brute',count:3}] },          /* band: [8,25] */
    };

/* v2.3.1625: the ZONE ID ALLOWLIST -- the only zone strings a client may
 * put in ps.z.  ZONES above lists only the zones the SERVER spawns
 * monsters for; a player also legitimately stands in the three hubs and
 * in the two endgame zones the server has no spawn config for, so those
 * five are named here explicitly.
 *
 * WHY THIS EXISTS.  ps.z came straight off the wire with no validation,
 * and this.monsters / this.nodes / this.loot are keyed by it.  A `move`
 * carrying z:'__proto__' made _ensureZoneMonsters return Object.prototype
 * (truthy, so the spawn guard never fired), whose .length is undefined,
 * so _tickMonsters' `length === 0` continue-guard fell through into
 * `for (const m of monsters)` on a non-iterable -- a throw every tick,
 * swallowed by the v2.3.1562 guard(), which left monster AI, respawn,
 * monster->player damage and monster deltas DEAD FOR THE WHOLE SHARED
 * ROOM for as long as that one player's ps.z stayed poisoned.  ps.z is
 * written before the throw, so a single unauthenticated message was a
 * permanent room-wide outage.  Membership validation also bounds the
 * zone-keyed maps, which arbitrary strings could otherwise grow without
 * limit (one key per invented zone, walked by _tickNodes at 45Hz).
 *
 * MIRROR of src/data/zones.js -- test/zones.test.mjs compares the two
 * key sets and FAILS if they drift.  That test is the safety net for the
 * real hazard here: a zone added client-side but not listed here would
 * strand a player at its entrance, which is worse than the bug this
 * closes.  Add new zones to BOTH files in the same PR. */
export const VALID_ZONE_IDS = new Set([
      ...Object.keys(ZONES),
      /* Hubs -- no monsters, no spawn config, special-cased all over the
         server (the `z !== 'town' && z !== 'farm_home'` guards). */
      'town', 'farm_home', 'worldview',
      /* v2.3.1438 endgame pair.  Client-side ZONES has them (BroTown.jsx
         sets currentZone directly); the server has no spawn entry, so
         _spawnZoneMonsters returns [] and they tick empty -- legal, and
         they must NOT be rejected or the endgame is unreachable. */
      'shadow', 'radiant',
    ]);

/* v2.3.1625: dungeon instance zones are minted server-side as
 * 'dungeon:' + id (dungeon.js).  Validated by SHAPE here and by
 * live-instance membership at the call site -- never by the client's
 * say-so alone. */
export const DUNGEON_ZONE_RE = /^dungeon:[A-Za-z0-9_-]{1,32}$/;

export const FISH_TIERS = [
      { lvl: 1,  name: 'minnow' },
      { lvl: 6,  name: 'clownfish' },
      { lvl: 11, name: 'trout' },
    ];

export const COOKING_RECIPES = [
      { ingredients: { herb_firebloom: 1 },                          buff: 'regen',  power: 0.02, duration: 60, tier: 1 },
      { ingredients: { herb_rock_vine: 1, herb_cloudpetal: 1 },      buff: 'resist', power: 0.05, duration: 60, tier: 1 },
      { ingredients: { herb_firebloom: 2 },                          buff: 'damage', power: 0.05, duration: 90, tier: 2 },
    ];

export const SHOP_ITEMS = {
      cookedMinnow:  { cost: 8,  effect: 'healFish', power: 23 },
      basicTrap:     { cost: 20, effect: 'trap' },
      staminaSalts:  { cost: 12, effect: 'stamina', power: 60 },
      manaShard:     { cost: 18, effect: 'mana', power: 40 },
      whetstone:     { cost: 35, effect: 'dmgBuff' },
    };

/* v2.3.1120: declarative quest objectives.  An entry WITH `objective`
 * is server-verified: the GameRoom increments its counter (kill credit
 * loop / harvest credit) and _handleQuestTurnIn refuses to pay until
 * it's met.  Entries WITHOUT one stay client-trusted -- their signals
 * (building visits, dungeon clears, collision discoveries, crafting
 * flags, pet counts) only exist client-side today; add objectives here
 * one quest at a time as those signals move server-side.  Types:
 *   {type:'kill',   arch:null|'<archetype>', count:N}  -- monster kills
 *   {type:'gather', count:N}                           -- node harvests
 *   {type:'flag', flag} / {type:'collect', invKey, count} -- reserved;
 *   NOTE flag-type must NOT be wired to server _questFlags writes until
 *   flags are server-owned (see docs/specs/quests.md clobber hazard). */
export const QUEST_REWARDS = {
      /* ═══ v2.3.1665: THE TUTORIAL ARC ═══
       * The one chain a new player can follow start to finish, and the
       * reason the demo is completable rather than merely playable.  Every
       * step is SERVER-VERIFIED (`objective`), zone-scoped, and pays out
       * through the same _handleQuestTurnIn path as everything else.
       *
       * ITEM TIERS ARE DELIBERATELY THE LOWEST.  Since v2.3.1661 weapons
       * gate on the matching trained skill and armor on allocated defense
       * points, both at tierIndex x 5.  A generous mid-tier gift would be
       * granted and then refused at the equip gate -- the worst possible
       * new-player moment.  `wood` is tierIndex 0 and tierMult 1.0 armor
       * estimates to tierIndex 0, so both require 0 and can never block.
       * If you retier these, re-check gear.js _prog3EquipOk first.
       *
       * The zone order follows the map's geography, not difficulty: live
       * spawn bands are all flattened to [1,2] (v2.3.1160), so this teaches
       * TRAVEL rather than gating on power. */
      tut_1: {gold:25,  xp:40,  next:'tut_2',
              objective:{type:'kill', arch:null, zone:'meadow', count:3}},
      tut_2: {gold:40,  xp:60,  next:'tut_3',
              objective:{type:'kill', arch:null, zone:'meadow', count:5},
              item:{kind:'armor', name:"Scout's Vest", tierMult:1.0}},
      tut_3: {gold:60,  xp:100, next:'tut_4',
              objective:{type:'kill', arch:null, zone:'frost', count:5},
              item:{kind:'weapon', weaponType:'greatsword', tierKey:'wood', name:"Bro's Blade"}},
      tut_4: {gold:150, xp:150, next:'tut_5',
              objective:{type:'kill', arch:null, zone:'verdant', count:6}},
      tut_5: {gold:400, xp:300, next:null,
              objective:{type:'kill', arch:null, zone:'hollows', count:8}},

      mayor_1:    {gold:50,  xp:30,  next:'mayor_2'},
      mayor_2:    {gold:100, xp:80,  next:'mayor_3', objective:{type:'kill', arch:null, count:5}},
      mayor_3:    {gold:300, xp:200, next:null},
      trader_1:   {gold:25,  xp:20,  next:'trader_2'},
      trader_2:   {gold:75,  xp:50,  next:'trader_3', objective:{type:'gather', count:3}},
      trader_3:   {gold:150, xp:100, next:null},
      enchant_1:  {gold:50,  xp:40,  next:'enchant_2'},
      enchant_2:  {gold:200, xp:150, next:'enchant_3'},
      enchant_3:  {gold:500, xp:300, next:null},
      scout_1:    {gold:100, xp:80,  next:'scout_2'},
      scout_2:    {gold:200, xp:150, next:null},
      bron_1:     {gold:60,  xp:40,  next:'bron_2'},
      bron_2:     {gold:120, xp:80,  next:'bron_3'},
      bron_3:     {gold:200, xp:150, next:'bron_4'},
      bron_4:     {gold:400, xp:250, next:null},
      luna_1:     {gold:40,  xp:30,  next:'luna_2'},
      luna_2:     {gold:100, xp:70,  next:'luna_3'},
      luna_3:     {gold:250, xp:180, next:null},
      kai_1:      {gold:80,  xp:60,  next:'kai_2'},
      kai_2:      {gold:200, xp:120, next:'kai_3'},
      kai_3:      {gold:350, xp:200, next:null},
      ash_1:      {gold:100, xp:80,  next:'ash_2'},
      ash_2:      {gold:250, xp:180, next:'ash_3'},
      ash_3:      {gold:500, xp:350, next:'ash_4'},
      ash_4:      {gold:800, xp:500, next:null},
    };

export const BLACKSMITH_TIERS = {
      wood:         {minLvl:1, slots:1, oreName:'wood',          oreCost:3,  goldCost:8,    tierMult:1.00, statReq:0  },
      copper:       {minLvl:6, slots:1, oreName:'copper',        oreCost:3,  goldCost:20,   tierMult:1.12, statReq:10 },
      iron:         {minLvl:11,slots:1, oreName:'iron',          oreCost:4,  goldCost:35,   tierMult:1.25, statReq:20 },
      steel:        {minLvl:16,slots:1, oreName:'steel',         oreCost:5,  goldCost:55,   tierMult:1.40, statReq:30 },
      titanium:     {minLvl:21,slots:1, oreName:'titanium',      oreCost:5,  goldCost:85,   tierMult:1.56, statReq:40 },
      obsidian:     {minLvl:26,slots:1, oreName:'obsidian',      oreCost:6,  goldCost:120,  tierMult:1.74, statReq:50 },
      mythril:      {minLvl:31,slots:2, oreName:'mythril',       oreCost:7,  goldCost:170,  tierMult:1.94, statReq:60 },
      diamond:      {minLvl:36,slots:2, oreName:'diamond',       oreCost:8,  goldCost:240,  tierMult:2.16, statReq:70 },
      abyssal:      {minLvl:41,slots:2, oreName:'abyssal',       oreCost:9,  goldCost:330,  tierMult:2.40, statReq:80 },
      dragonbone:   {minLvl:46,slots:2, oreName:'dragonbone',    oreCost:10, goldCost:440,  tierMult:2.68, statReq:90 },
      shadowsteel:  {minLvl:51,slots:2, oreName:'shadowsteel',   oreCost:11, goldCost:570,  tierMult:2.98, statReq:100},
      bloodstone:   {minLvl:56,slots:2, oreName:'bloodstone',    oreCost:12, goldCost:720,  tierMult:3.32, statReq:110},
      runestone:    {minLvl:61,slots:2, oreName:'runite',        oreCost:13, goldCost:900,  tierMult:3.70, statReq:120},
      sunstone:     {minLvl:66,slots:2, oreName:'sunstone',      oreCost:14, goldCost:1100, tierMult:4.12, statReq:130},
      demonite:     {minLvl:71,slots:2, oreName:'demonite',      oreCost:15, goldCost:1350, tierMult:4.58, statReq:140},
      spiritforge:  {minLvl:76,slots:2, oreName:'spiritore',     oreCost:16, goldCost:1650, tierMult:5.10, statReq:150},
      starforged:   {minLvl:81,slots:2, oreName:'starite',       oreCost:18, goldCost:2000, tierMult:5.68, statReq:160},
      celestial:    {minLvl:86,slots:2, oreName:'celestite',     oreCost:20, goldCost:2500, tierMult:6.32, statReq:170},
      antimatter:   {minLvl:91,slots:2, oreName:'antimatter',    oreCost:22, goldCost:3200, tierMult:7.04, statReq:180},
      worldbreaker: {minLvl:96,slots:2, oreName:'voidcrystal',   oreCost:25, goldCost:4200, tierMult:7.84, statReq:190},
    };

export const WOODWORKING_TIERS = {
      wood:         {minLvl:1, slots:1, wood:'wood',         woodCost:3,  goldCost:8,    tierMult:1.00, statReq:0  },
      softwood:     {minLvl:6, slots:1, wood:'softwood',     woodCost:3,  goldCost:20,   tierMult:1.12, statReq:10 },
      hardwood:     {minLvl:11,slots:1, wood:'hardwood',     woodCost:4,  goldCost:35,   tierMult:1.25, statReq:20 },
      pine:         {minLvl:16,slots:1, wood:'pine_lumber',  woodCost:5,  goldCost:55,   tierMult:1.40, statReq:30 },
      maple:        {minLvl:21,slots:1, wood:'maple_wood',   woodCost:5,  goldCost:85,   tierMult:1.56, statReq:40 },
      ironbark:     {minLvl:26,slots:1, wood:'ironbark',     woodCost:6,  goldCost:120,  tierMult:1.74, statReq:50 },
      crystalwood:  {minLvl:31,slots:2, wood:'crystal_wood', woodCost:7,  goldCost:170,  tierMult:1.94, statReq:60 },
      elder:        {minLvl:36,slots:2, wood:'elder_wood',   woodCost:8,  goldCost:240,  tierMult:2.16, statReq:70 },
      spiritwood:   {minLvl:41,slots:2, wood:'spirit_wood',  woodCost:9,  goldCost:330,  tierMult:2.40, statReq:80 },
      dragonwood:   {minLvl:46,slots:2, wood:'dragon_wood',  woodCost:10, goldCost:440,  tierMult:2.68, statReq:90 },
      shadowthorn:  {minLvl:51,slots:2, wood:'shadowthorn',  woodCost:11, goldCost:570,  tierMult:2.98, statReq:100},
      bloodoak:     {minLvl:56,slots:2, wood:'bloodoak',     woodCost:12, goldCost:720,  tierMult:3.32, statReq:110},
      runewood:     {minLvl:61,slots:2, wood:'runewood',     woodCost:13, goldCost:900,  tierMult:3.70, statReq:120},
      sunbark:      {minLvl:66,slots:2, wood:'sunbark',      woodCost:14, goldCost:1100, tierMult:4.12, statReq:130},
      demonwood:    {minLvl:71,slots:2, wood:'demonwood',    woodCost:15, goldCost:1350, tierMult:4.58, statReq:140},
      ghostwood:    {minLvl:76,slots:2, wood:'ghostwood',    woodCost:16, goldCost:1650, tierMult:5.10, statReq:150},
      starwood:     {minLvl:81,slots:2, wood:'starwood',     woodCost:18, goldCost:2000, tierMult:5.68, statReq:160},
      worldtree:    {minLvl:86,slots:2, wood:'worldtree',    woodCost:20, goldCost:2500, tierMult:6.32, statReq:170},
      voidtimber:   {minLvl:91,slots:2, wood:'void_timber',  woodCost:22, goldCost:3200, tierMult:7.04, statReq:180},
      worldbreaker: {minLvl:96,slots:2, wood:'voidwood',     woodCost:25, goldCost:4200, tierMult:7.84, statReq:190},
    };

/* v2.3.1128: guild-quest ladder + valid guild skills (Wave 2 PR11).
 *   GUILD_QUESTS <-> src/data/gameSystems.js GUILD_QUESTS (index order
 *   IS the ladder -- claims count under 'guild_claims:<pid>' indexes
 *   into this array; never reorder, only append)
 *   GUILD_SKILLS <-> src/data/gameSystems.js SKILL_GUILDS keys        */
export const GUILD_SKILLS = [
  'woodcutting', 'fishing', 'mining', 'farming', 'cooking',
  'blacksmithing', 'woodworking', 'gemCutting', 'enchanting', 'trapping',
];
export const GUILD_QUESTS = [
  { checkLvl: 5,   gold: 30,   ap: 10 },
  { checkLvl: 15,  gold: 80,   ap: 25 },
  { checkLvl: 30,  gold: 150,  ap: 40 },
  { checkLvl: 50,  gold: 300,  ap: 75 },
  { checkLvl: 70,  gold: 500,  ap: 150 },
  { checkLvl: 90,  gold: 800,  ap: 250 },
  { checkLvl: 100, gold: 1200, ap: 400 },
  { checkLvl: 150, gold: 2000, ap: 750 },
];

/* v2.3.1131: quality grades (BALANCE-PLAN §4.6b, adopted from GDD --
 * the CANONICAL table).  Multiplies EFFECTIVE WEAPON BASE only
 * (pre-stat, pre-tierMult); rolled ONCE at server mint, immutable.
 *   QUALITY_GRADES <-> src/data/gameSystems.js QUALITY_MULTS  */
export const QUALITY_GRADES = {
  normal: { mult: 1.00 },
  rare:   { mult: 1.20 },
  elite:  { mult: 1.50 },
  godly:  { mult: 3.00 },
};

/* v2.3.1139 (item I): amulet elemDmg mirror for _computeAttackDamage.
 *   AMULET_TIER_POWER <-> src/data/items.js AMULET_TIERS basePower
 *   Only the FLAME gem grants elemDmg (AMULET_GEM_STATS) -- the other
 *   gems' stats are applied at their own point-of-use client-side and
 *   don't touch the authoritative damage roll.
 *   value = round((3 + 2.5 × basePower) × 10)/10 %  -> multiplier
 *   1 + value/100, gated on the weapon having element1. */
export const AMULET_TIER_POWER = { simple: 1.0, ornate: 1.5, regal: 2.2, mythic: 3.0 };

/* v2.3.1180: valid amulet gems (mirror of src/data/items.js
 * AMULET_GEM_STATS keys) -- the join sanitizer whitelists ps.amulet.gem
 * against this so a forged blob can't smuggle an unknown gem that a
 * future _computeAttackDamage branch might read.  Only 'flame' affects
 * authoritative damage today; the rest keep legit non-flame amulets
 * intact through the sanitize pass. */
export const AMULET_GEMS = new Set(['flame', 'frost', 'water', 'venom', 'storm', 'stone', 'wind', 'dark', 'light']);

/* v2.3.1192 (item I follow-up): server amulet forge (amulet.js) -- the
 * forge mint tables.  Until this slice amulets were a client-crafted
 * blob and the residual forgery ceiling was a free legit-shaped mythic
 * (+10.5% elemDmg); now the worker validates + consumes + mints.
 *   AMULET_FORGE_TIERS <-> src/data/items.js AMULET_TIERS
 *     (minLvl / label / bars / goldCost -- basePower stays in
 *      AMULET_TIER_POWER above; mirror-audit pins both tables)
 *   NUGGETS_PER_BAR    <-> src/data/items.js NUGGETS_PER_BAR
 *   GOLD_NUGGET_MONSTER_DROP <-> src/data/items.js
 *     GOLD_NUGGET_DROP.monsterKill (the .lifeSkill rate has NO live
 *     client roll site -- dead data, deliberately not mirrored). */
export const AMULET_FORGE_TIERS = {
  simple: { minLvl: 1,  label: 'Simple', bars: 1,  goldCost: 50 },
  ornate: { minLvl: 15, label: 'Ornate', bars: 3,  goldCost: 200 },
  regal:  { minLvl: 35, label: 'Regal',  bars: 6,  goldCost: 500 },
  mythic: { minLvl: 60, label: 'Mythic', bars: 10, goldCost: 1200 },
};
export const NUGGETS_PER_BAR = 5;
export const GOLD_NUGGET_MONSTER_DROP = 0.0001;

/* v2.3.1198 (amulet-forge successor slice): polished-gem income tables
 * (amulet.js _gemRawOnKill / _handleGemCut).  The gem economy was the
 * amulet gem op's documented deny-by-default hole -- the server's
 * lifeSkills.gems map was whatever the join bootstrap captured, so a
 * legitimately mined+cut gem was denied at the amulet slot.  Now the
 * worker rolls the kill drop and settles the Gem Cutter's cut.
 *   GEM_CUT_TIERS <-> src/data/gameSystems.js GEM_CUT_TIERS
 *     (minLvl / successRate -- label is client presentation; the cut
 *      op resolves the rate from the SERVER-held gemCutting level)
 *   GEM_RAW_MONSTER_DROP <-> src/data/items.js
 *     GEM_DROP_RATES.monsterKill (the woodcutting/fishing/mining rates
 *     are DEAD DATA -- no roll site has ever read them, all the way
 *     back to the original index.html; deliberately not mirrored, the
 *     GOLD_NUGGET_DROP.lifeSkill precedent).
 * Valid gem keys are raw_/polished_ + AMULET_GEMS above (the nine
 * ELEMENTS -- one shared element registry on both sides). */
export const GEM_CUT_TIERS = {
  rough:    { minLvl: 1,  successRate: 0.6 },
  fine:     { minLvl: 15, successRate: 0.75 },
  flawless: { minLvl: 35, successRate: 0.90 },
  perfect:  { minLvl: 60, successRate: 0.98 },
};
export const GEM_RAW_MONSTER_DROP = 0.05;

/* v2.3.1209 (amulet-forge successor slice A): server-settled gem
 * EXTRACTION (amulet.js _handleAmuletForge op:'extract').  ForgePanel's
 * two Extract buttons (equipped weapon/shield/amulet + weapon stash)
 * were the last client-local gem mutations: the client stripped the
 * SERVER-held gear blob and self-credited polished gems, and the next
 * player_state echo stomped both back (broken settlement, no
 * regression -- amulet-forge.md "Residuals").  Now the worker owns it:
 * validate the blob from server state, charge coins, mint polished
 * gems, strip the blob, rebuild the display name from the tables
 * below.  Gated by a NARROW caps.gemExtract flag (NOT caps.amuletForge
 * -- an old worker advertises amuletForge but denies the unknown
 * extract op, which would break extraction against it: the caps.gems
 * lesson, TRAPS #9).
 *   GEM_EXTRACT_BASE_COST <-> src/data/items.js GEM_EXTRACT_BASE_COST
 *     (cost = ceil(base * tierMult), mirror-audit §8e)
 * The label tables mirror the client tier/weapon .label fields (used
 * only to rebuild the post-extraction display name so the echo matches
 * the client's optimistic prediction -- a compact side table rather
 * than bloating BLACKSMITH_TIERS/WOODWORKING_TIERS; §8e pins them). */
export const GEM_EXTRACT_BASE_COST = 25;
export const BLACKSMITH_TIER_LABELS = {
  wood: 'Wood', copper: 'Copper', iron: 'Iron', steel: 'Steel',
  titanium: 'Titanium', obsidian: 'Obsidian', mythril: 'Mythril',
  diamond: 'Diamond', abyssal: 'Abyssal', dragonbone: 'Dragonbone',
  shadowsteel: 'Shadowsteel', bloodstone: 'Bloodstone', runestone: 'Runestone',
  sunstone: 'Sunstone', demonite: 'Demonite', spiritforge: 'Spiritforge',
  starforged: 'Starforged', celestial: 'Celestial', antimatter: 'Antimatter',
  worldbreaker: 'Worldbreaker',
};
export const WOODWORKING_TIER_LABELS = {
  wood: 'Wood', softwood: 'Softwood', hardwood: 'Hardwood', pine: 'Pine',
  maple: 'Maple', ironbark: 'Ironbark', crystalwood: 'Crystal Wood',
  elder: 'Elder Wood', spiritwood: 'Spirit Wood', dragonwood: 'Dragonwood',
  shadowthorn: 'Shadowthorn', bloodoak: 'Bloodoak', runewood: 'Runewood',
  sunbark: 'Sunbark', demonwood: 'Demonwood', ghostwood: 'Ghostwood',
  starwood: 'Starwood', worldtree: 'Worldtree', voidtimber: 'Void Timber',
  worldbreaker: 'Worldbreaker',
};
export const WEAPON_TYPE_LABELS = {
  greatsword: 'Great Sword', sword: 'Sword', bow: 'Bow', staff: 'Staff',
};

/* v2.3.1141: rarity tiers for server-minted weapon drops.  Mults only --
 * labels/colors are client presentation (RARITY_TIERS there carries
 * them).  These become the drop blob's tierMult, same slot the forge
 * mint fills from BLACKSMITH_TIERS.
 *   RARITY_TIERS <-> src/data/gameSystems.js RARITY_TIERS (mult values) */
export const RARITY_TIERS = {
  common:    { mult: 1.00 },
  elemental: { mult: 1.50 },
  fusion:    { mult: 2.25 },
  shift:     { mult: 3.00 },
};
