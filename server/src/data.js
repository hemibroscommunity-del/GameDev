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
 *   SHOP_ITEMS         <-> client NPC vendor table (BroTown.jsx)
 *   QUEST_REWARDS      <-> src/data/gameSystems.js QUEST_CHAINS rewards
 *   BLACKSMITH/WOODWORKING_TIERS <-> src/data/gameSystems.js            */

/* v2.3.1140: BF-1 fix -- monster HP curve centralized + ramp flattened
 * 1.065 -> 1.052 so mid-band kill times pass the §6.5 audit gates (HP
 * compounded past linear player damage growth across L25-L80).
 *   MONSTER_HP_CURVE <-> src/data/gameSystems.js MONSTER_HP_CURVE
 * Consumed by _spawnZoneMonsters (index.js) and _dungeonMonster
 * (dungeon.js).  Damage/XP/gold curves stay inline at those call sites
 * (unchanged by BF-1; centralize them if they ever need tuning). */
export const MONSTER_HP_CURVE = { base: 12.5, ramp: 1.052, plateau: 1.035, endgame: 1.025 };

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
export const ZONES = {
      meadow:  { w:32, h:32, level:[1,10],  element:null,    lawless:true, spawns:[{arch:'fodder',count:10}] },
      ember:   { w:32, h:32, level:[55,80], element:'flame', lawless:true, spawns:[{arch:'fodder',count:6}] },
      mist:    { w:32, h:32, level:[22,40], element:'venom', lawless:true, spawns:[] },
      verdant: { w:32, h:32, level:[22,40], element:null,    lawless:true, spawns:[] },
      frost:   { w:32, h:32, level:[8,25],  element:'frost', lawless:true, spawns:[{arch:'snowman',count:4}] },
      thunder: { w:32, h:32, level:[55,80], element:'storm', lawless:true, spawns:[{arch:'fodder',count:6}] },
      hollows: { w:32, h:32, level:[38,58], element:'stone', lawless:true, spawns:[{arch:'brute',count:4}] },
      sky:     { w:32, h:32, level:[38,58], element:'wind',  lawless:true, spawns:[{arch:'stalker',count:4},{arch:'hexer',count:3},{arch:'volatile',count:3}] },
      tidal:   { w:32, h:32, level:[8,25],  element:'water', lawless:true, spawns:[{arch:'brute',count:3}] },
    };

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
