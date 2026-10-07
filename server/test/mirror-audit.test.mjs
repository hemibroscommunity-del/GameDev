/* Client/server mirror-table conformance audit (v2.3.1151; spec:
 * docs/specs/conformance-audit.md).
 *
 * server/src/data.js opens with a list of "keep in sync with the
 * client" obligations that, until now, were enforced by memory — and
 * table drift is invisible in play until someone notices damage
 * prediction desyncing or a vendor charging the wrong price (the sky
 * spawn-table drift caught in v2.3.1147 is the incident that motivated
 * making this mechanical).  This suite imports BOTH sides (every
 * client data module is plain-node importable — the balance sim and
 * tick.test already rely on that) and compares the LOAD-BEARING
 * fields: server fields are the authoritative subset, client entries
 * may carry extra presentation fields (label/color/desc) that are not
 * compared.
 *
 * ZONES level-band lockstep is deliberately NOT here — tick.test.mjs
 * already asserts it (server ZONES vs client zones.js, including the
 * spawn tables); this suite covers everything else data.js mirrors.
 *
 * The variant-map and speed exemptions are SELF-PRUNING: each asserts
 * the divergence still exists, so when someone closes it server-side
 * the exemption fails loudly and gets deleted instead of rotting.   */
import { existsSync } from 'node:fs'; /* v2.3.3016: a Wheel dungeon's floor picture is in the game */
import * as SRV from '../src/data.js';
import { GameRoom } from '../src/index.js';
/* v2.3.1734: the prog3 constant mirror the plan already claimed was
   enforced here.  See check 12 at the bottom. */
import { PROG3 as SRV_PROG3 } from '../src/prog3.js';
/* v2.3.1812: check 13 compares telegraph kit kinds against the client's
   render whitelist — see the block at the bottom for why it reads text. */
import { TELEGRAPH as SRV_TELEGRAPH, BASIC_WINDUP as SRV_BASIC_WINDUP, BURROW_ARCH as SRV_BURROW_ARCH, SLIME_BURST as SRV_SLIME_BURST } from '../src/telegraph.js'; /* v2.3.2221; v2.3.2224 */
import { FIRE_TRAIL as SRV_FIRE_TRAIL } from '../src/firetrail.js'; /* v2.3.2238 */
import { SMELT as SRV_SMELT } from '../src/smelting.js'; /* v2.3.2822 */
import { HARDEN as SRV_HARDEN, HARDEN_BAR_BY_TIER as SRV_HARDEN_BAR_BY_TIER, HARDEN_WOOD_BY_TIER as SRV_HARDEN_WOOD_BY_TIER, HARDEN_MATERIAL_NAMES as SRV_HARDEN_NAMES, hardenGoldFor as srvHardenGold, hardenAmountFor as srvHardenAmount, hardenMaterialFor as srvHardenMat, hardenIsWood as srvHardenIsWood } from '../src/hardening.js'; /* v2.3.3139 */
import { HARDENED_WOOD as SRV_HARDENED_WOOD } from '../src/hardenedwood.js'; /* v2.3.3139 */
import { HARDEN_COSTS as CLIENT_HARDEN, HARDEN_MATERIAL_NAMES as CLIENT_HARDEN_NAMES, hardenGoldFor as clientHardenGold, hardenAmountFor as clientHardenAmount, hardenMaterialFor as clientHardenMat, hardenIsWood as clientHardenIsWood, hardenTierOf as clientHardenTier } from '../../src/data/hardenCosts.js'; /* v2.3.3139 */
import { HARDENED_WOOD_RECIPES as CLIENT_HARDENED_WOOD, HARDENED_WOOD_MAX_PER_REQUEST as CLIENT_HW_MAX, HARDEN_WOOD_BY_TIER as CLIENT_HARDEN_WOOD_BY_TIER } from '../../src/data/hardenedWood.js'; /* v2.3.3139 */
import { SMELT_RECIPES as CLIENT_SMELT } from '../../src/data/items.js'; /* v2.3.2822 */
import { FARM as SRV_FARM, farmGrowMs as srvFarmGrowMs, farmYield as srvFarmYield } from '../src/farm.js'; /* v2.3.3127 */
import { FARM as CLIENT_FARM, FARM_CROP_ORDER as CLIENT_FARM_ORDER, farmGrowMs as clientFarmGrowMs, farmYieldShown as clientFarmYieldShown } from '../../src/data/farmCrops.js'; /* v2.3.3127 */
import { ARMOR_FORGE as SRV_ARMOR_FORGE } from '../src/armorforge.js'; /* v2.3.3092 */
import { ARMOR_FORGE_RECIPES as CLIENT_ARMOR_FORGE } from '../../src/data/items.js'; /* v2.3.3092 */
import { GATHER_HITS as SRV_GATHER_HITS, HONEST_CYCLE as SRV_HONEST_CYCLE, GATHER_REQ_LVL as SRV_GATHER_REQ_LVL, gatherReqLvl as srvGatherReqLvl } from '../src/gathering.js'; /* v2.3.2956; HONEST_CYCLE v2.3.3036; GATHER_REQ_LVL v2.3.3038 */
import { GATHER_REQ_LVL as CLIENT_GATHER_REQ_LVL, gatherReqLvl as clientGatherReqLvl } from '../../src/data/lifeSkills.js'; /* v2.3.3038 */
import { ELEM_HITS as SRV_ELEM_HITS, CHILL as SRV_CHILL } from '../src/monsterstatus.js'; /* v2.3.2996 */
import { CHILL_MULT as CLIENT_CHILL_MULT, ELEM_STATUSES as CLIENT_ELEM_STATUSES, ELEM_LOOK as CLIENT_ELEM_LOOK, ELEM_ICON_SRC as CLIENT_ELEM_ICON_SRC } from '../../src/game/elemHits.js'; /* v2.3.2996 */
import { SPRINT as SRV_SPRINT } from '../src/sprint.js'; /* v2.3.3006 */
import { WHEEL_DUNGEON as SRV_WHEEL_DUNGEON } from '../src/wheeldungeon.js'; /* v2.3.3016 */
import { WHEEL_DUNGEON_HOMES as CLIENT_WHEEL_DUNGEON_HOMES, DOOR_R as CLIENT_DOOR_R, WHEEL_DOOR_LOOK as CLIENT_WHEEL_DOOR_LOOK, WHEEL_DUNGEON_FLOOR as CLIENT_WHEEL_DUNGEON_FLOOR, WHEEL_ARENA as CLIENT_WHEEL_ARENA } from '../../src/data/wheelDungeons.js'; /* v2.3.3016 */
import { WHEEL_LAND_LEVELS as CLIENT_WHEEL_LAND_LEVELS } from '../../src/data/wheelSignposts.js'; /* v2.3.3089 */
import { PVP_HEAL as CLIENT_PVP_HEAL } from '../../src/game/fightFood.js'; /* v2.3.3133 */
import { WHEEL_SPAWNS as SRV_WHEEL_SPAWNS } from '../src/wheelspawns.js'; /* v2.3.3089 */
import { SPRINT_MULT as CLIENT_SPRINT_MULT, SPRINT_DRAIN_PER_S as CLIENT_SPRINT_DRAIN, SPRINT_MIN_START as CLIENT_SPRINT_MIN_START, REGEN_PAUSE_MS as CLIENT_SPRINT_REGEN_PAUSE } from '../../src/game/sprint.js'; /* v2.3.3006 */
import { GATHER_SWING as CLIENT_GATHER_SWING, gatherNodeHp as clientGatherNodeHp, gatherHitTimes as clientGatherHitTimes, GATHER_HIT_LEAD_MS as CLIENT_GATHER_HIT_LEAD_MS, GATHER_HIT_SETTLE_MS as CLIENT_GATHER_HIT_SETTLE_MS, awardSkillXp as clientAwardSkillXp /* v2.3.3041 */, createDefaultLifeSkills as clientDefaultLifeSkills /* v2.3.3041 */, migrateLifeSkills as clientMigrateLifeSkills /* v2.3.3041 */, createDefaultRpg as clientDefaultRpg /* v2.3.3138 */ } from '../../src/data/gameSystems.js';
import { NEW_CHARACTER_COINS as SRV_NEW_CHARACTER_COINS } from '../src/join.js';   /* v2.3.3138 */
import { freshLifeSkills as srvFreshLifeSkills } from '../src/migrations.js';       /* v2.3.3138 */ /* v2.3.2956; the lead and settle v2.3.3036 */
import { GESTURE_FLOOR_MS as CLIENT_GESTURE_FLOOR_MS } from '../../src/game/gesturePose.js'; /* v2.3.3036 */
import { LIFE_SKILL_XP_BASE as SRV_LIFE_SKILL_XP_BASE } from '../src/gathering.js'; /* v2.3.3090 */
import { LIFE_SKILL_XP_BASE as CLIENT_LIFE_SKILL_XP_BASE, skillXpRequired as clientSkillXpRequired } from '../../src/data/items.js'; /* v2.3.3090 */
import { LIFE_SKILL_XP as CLIENT_LIFE_SKILL_XP } from '../../src/data/lifeSkills.js'; /* v2.3.3090 */
import { PROG3 as CLIENT_PROG3 } from '../../src/data/prog3.js';
import { NML as CLIENT_NML, NML_CENTRE as CLIENT_NML_CENTRE, nmlLevelAt as clientNmlLevelAt } from '../../src/data/noMansLandRings.js'; /* v2.3.3058 */
import { NML as SRV_NML, nmlLevelAt as srvNmlLevelAt } from '../src/nomansland.js';
/* v2.3.3120: pet trapping -- the button's odds, the Traps tab, the kinds, the name rule */
import { TRAPPING as SRV_TRAPPING, trapChance as srvTrapChance, trapRollXp as srvTrapRollXp, trapCatchXp as srvTrapCatchXp } from '../src/trapping.js';
import { PET_KINDS as SRV_PET_KINDS, PET_NAME as SRV_PET_NAME, cleanPetName as srvCleanPetName, petKindOf as srvPetKindOf, PETBOOK as SRV_PETBOOK,
  petXpToNext as srvPetXpToNext, petGainXp as srvPetGainXp,
  petWardOf as srvPetWardOf, petHousePrice as srvPetHousePrice, petWireOf as srvPetWireOf } from '../src/petbook.js';
import { TRAPPING as CLIENT_TRAPPING, trapChance as clientTrapChance, trapRollXp as clientTrapRollXp, trapCatchXp as clientTrapCatchXp,
  PET_KINDS as CLIENT_PET_KINDS, PET_NAME as CLIENT_PET_NAME, cleanPetName as clientCleanPetName, petKindOfMonster as clientPetKindOf,
  PET_BIG_AT as CLIENT_PET_BIG_AT, TRAP_WORDS as CLIENT_TRAP_WORDS,
  PET_XP as CLIENT_PET_XP, petXpToNext as clientPetXpToNext, petGainXp as clientPetGainXp,
  PET_TRADE_MAX as CLIENT_PET_TRADE_MAX,
  PET_WARD as CLIENT_PET_WARD, petWardOf as clientPetWardOf, PET_WARD_WHAT as CLIENT_PET_WARD_WHAT,
  PET_HOUSE as CLIENT_PET_HOUSE, petHousePrice as clientPetHousePrice, parsePetWire as clientParsePetWire } from '../../src/data/trapping.js';
import { WHEEL_CENTRE as SRV_WHEEL_CENTRE } from '../src/wheelspawns.js';
import {
  ARCHETYPES, MONSTER_HP_CURVE, COOKING_RECIPES, QUEST_CHAINS,
  DISHES as CLIENT_DISHES, /* v2.3.3130: what a Cookhouse dish does */
  MONSTER_DMG_CURVE, monsterHpFlat as clientMonsterHpFlat, /* v2.3.3055 */
  BLACKSMITH_TIERS, WOODWORKING_TIERS, SKILL_GUILDS, GUILD_QUESTS,
  QUALITY_MULTS, RARITY_TIERS,
  ARMOR_DR, /* v2.3.2664: the armour grades' ceiling lifts */
  DAMAGE_CHANNEL_FLAT, WEAPON_CHANNELS, T2_UNITS as CLIENT_T2_UNITS,
  GEM_CUT_TIERS, WEAPON_TYPES,
  /* v2.3.1451: bench-locked T2 mirrors */
  T2_BENCH as CLIENT_T2_BENCH, T2_BENCH_CANONICAL as CLIENT_T2_BENCH_CANONICAL,
  t2BenchStats as clientT2BenchStats, t2PointValue as clientT2PointValue,
  t2BenchLevel as clientT2BenchLevel, t2SpendLevel as clientT2SpendLevel,
  t2ReplayFlat as clientT2ReplayFlat,
  /* v2.3.1765: the two life-skill numbers the owner just retuned.  Both are
     hand-copied mirrors whose comments tell the next reader to "keep in
     lockstep" — which is exactly the obligation this suite exists to stop
     enforcing by memory. */
  getFishHealAmount as clientFishHeal,
  /* v2.3.1765: the equip gate.  The two sides reach the same number by
     DIFFERENT roads — the worker by tier index, the client by statReq/2 — so
     they can drift without either looking wrong on its own. */
  canEquipItem as clientCanEquip,
  /* v2.3.2664: the armour ladder's Defense requirement, both halves. */
  armorDefReq as clientArmorDefReq, isArmourLadderPiece as clientIsArmourLadderPiece,
  ARMOR_FREE_TIERS as CLIENT_ARMOR_FREE_TIERS, ARMOR_DEF_REQ_PER_TIER as CLIENT_ARMOR_DEF_REQ_PER_TIER,
} from '../../src/data/gameSystems.js';
/* The client's prog3 gate is DORMANT until the worker advertises caps.prog3
   (deploy-order safety, prog3.js `_enabled`) — without this the comparison
   below silently exercises the legacy raw-stat path on the client and the
   prog3 path on the server, which are not mirrors of each other and never
   were. */
import { setProg3Enabled, setProg3XEnabled, setProg3SharedEnabled, setProg3RelEnabled, setProg3ElemEnabled, prog3CritPct, prog3CritMult, prog3CritFlat, PROG3_LEGACY_ATK, PROG3_LINEAR,
  prog3Curve as cliCurve, prog3Edge as cliEdge, prog3DodgePct, prog3DefPct, prog3PowerMult, prog3SpecialMult, prog3MoveMult, prog3ElemPower } from '../../src/data/prog3.js'; /* v2.3.2218; v2.3.2592; v2.3.2680 */
import { prog3Curve as srvCurve, prog3Edge as srvEdge } from '../src/prog3.js'; /* v2.3.2680 */
import { elemAttackStat as srvElem } from '../src/elemental.js'; /* v2.3.2680 */
import { createGatherNode as clientGatherNode, WOODCUTTING_TIERS as CLIENT_WOOD_TIERS } from '../../src/data/lifeSkills.js';
/* v2.3.2652: prop blockers — the worker's first piece of world geometry. */
import { ZONE_PROPS as SRV_ZONE_PROPS, attackBlocked as srvAttackBlocked } from '../src/props.js';
import {
  WORLD_PROPS as CLIENT_WORLD_PROPS, propsForZone as clientPropsForZone,
  propFootprint as clientPropFootprint, attackBlocked as clientAttackBlocked,
} from '../../src/data/worldProps.js';
import { FISHING_TIERS } from '../../src/data/lifeSkills.js';
import { AMULET_TIERS, NUGGETS_PER_BAR, GOLD_NUGGET_DROP, GEM_DROP_RATES, GEM_EXTRACT_BASE_COST } from '../../src/data/items.js';
import { MONSTER_VARIANTS, ZONE_VARIANT_MAP } from '../../src/data/monsterVariants.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

// _variantForArchInZone/_variantSpeed touch no instance state — call
// them off the prototype so this suite needs no mock DO plumbing.
const room = Object.create(GameRoom.prototype);

// ── 1. ARCHETYPES: combat scalars must agree (server is authoritative
// for HP/damage; the client predicts with its copy) ──
{
  const bad = [];
  for (const [k, sv] of Object.entries(SRV.ARCHETYPES)) {
    const cv = ARCHETYPES[k];
    if (!cv) { bad.push({ arch: k, missing: 'client' }); continue; }
    for (const f of ['hpMult', 'dmgMult', 'spdMult']) {
      if (sv[f] !== cv[f]) bad.push({ arch: k, field: f, server: sv[f], client: cv[f] });
    }
  }
  check('ARCHETYPES combat scalars mirror (client may have EXTRA variant archetypes; server keys are the contract)', bad.length === 0, bad);
}

// ── 2. MONSTER_HP_CURVE: exact — this is BF-1's centralized curve ──
{
  const bad = Object.keys(SRV.MONSTER_HP_CURVE).filter((f) => SRV.MONSTER_HP_CURVE[f] !== MONSTER_HP_CURVE[f]);
  check('MONSTER_HP_CURVE identical (a drifted curve desyncs every kill-time expectation)', bad.length === 0, bad);
}
/* v2.3.3055: the damage curve and the GROWING flat -- the Points window's
   scene fights the client's createMonster, so its numbers are these */
{
  const bad = Object.keys(SRV.MONSTER_DMG_CURVE).filter((f) => SRV.MONSTER_DMG_CURVE[f] !== MONSTER_DMG_CURVE[f]);
  check('MONSTER_DMG_CURVE identical', bad.length === 0 && Object.keys(MONSTER_DMG_CURVE).length === Object.keys(SRV.MONSTER_DMG_CURVE).length, bad);
  const flats = [];
  for (let L = 1; L <= 100; L++) if (SRV.monsterHpFlat(L) !== clientMonsterHpFlat(L)) flats.push({ L, server: SRV.monsterHpFlat(L), client: clientMonsterHpFlat(L) });
  check('monsterHpFlat identical at every level 1-100', flats.length === 0, flats.slice(0, 5));
}

// ── 3. FISH_TIERS: level gates + names (server name is the client
// name lowercased — the heal path resolves inventory keys from it) ──
{
  const bad = [];
  SRV.FISH_TIERS.forEach((t, i) => {
    const c = FISHING_TIERS[i];
    if (!c || c.lvl !== t.lvl || c.name.toLowerCase() !== t.name) bad.push({ i, server: t, client: c && { lvl: c.lvl, name: c.name } });
  });
  check('FISH_TIERS lvl+name mirror (server = client lowercased)', bad.length === 0, bad);
}

// ── 4. COOKING_RECIPES: INDEX-ALIGNED (the wire sends recipe indexes;
// reordering either side changes what players cook) ──
{
  const bad = [];
  /* v2.3.3130: compared on what the WORKER reads -- tier, cooking level,
     ingredients and what it makes.  The client's buff/power/duration on rows
     0-2 are the OLD instant effect, read only in front of an old worker (no
     caps.meals); the new worker's effect is DISHES (§4b). */
  SRV.COOKING_RECIPES.forEach((r, i) => {
    const c = COOKING_RECIPES[i];
    if (!c || c.tier !== r.tier || c.cookLvl !== r.cookLvl /* v2.3.3127: the worker's gate */
      || c.makes !== r.makes /* v2.3.3130 */ || JSON.stringify(c.ingredients) !== JSON.stringify(r.ingredients)) {
      bad.push({ i, server: r, client: c });
    }
  });
  if (COOKING_RECIPES.length !== SRV.COOKING_RECIPES.length) bad.push({ length: { server: SRV.COOKING_RECIPES.length, client: COOKING_RECIPES.length } });
  check('COOKING_RECIPES per-index mirror (order is the wire format)', bad.length === 0, bad);
  /* v2.3.3130: ...and those old effect fields are pinned to the worker they
     describe, frozen here as v2.3.3127's table said them (review: comparing
     on what the new worker reads had left them pinned to nothing).  Only the
     first three rows carry one: CookPanel and the campfire offer a row an old
     worker can cook by `recipe.buff`, and that worker has no fourth row. */
  const OLD_WORKER = [
    { buff: 'regen', power: 0.02, duration: 60 },
    { buff: 'resist', power: 0.05, duration: 60 },
    { buff: 'damage', power: 0.20, duration: 90 },
  ];
  const legacy = [];
  COOKING_RECIPES.forEach((c, i) => {
    const o = OLD_WORKER[i];
    if (o ? (c.buff !== o.buff || c.power !== o.power || c.duration !== o.duration) : c.buff !== undefined) {
      legacy.push({ i, client: { buff: c.buff, power: c.power, duration: c.duration }, oldWorker: o || 'none (no buff)' });
    }
  });
  check('the client\'s old-worker effects match v2.3.3127\'s, on its three rows only', legacy.length === 0, legacy);
}

// ── 4b. v2.3.3130: DISHES, both directions, and every recipe makes a thing
// the worker can eat or drink (a dish, or a SHOP_ITEMS bottle) ──
{
  const bad = [];
  for (const [k, d] of Object.entries(SRV.DISHES)) {
    const c = CLIENT_DISHES[k];
    if (!c) { bad.push({ k, missing: 'client' }); continue; }
    for (const f of ['slot', 'buff', 'power', 'duration']) if (c[f] !== d[f]) bad.push({ k, f, server: d[f], client: c[f] });
  }
  for (const k of Object.keys(CLIENT_DISHES)) if (!SRV.DISHES[k]) bad.push({ k, missing: 'server (the bag shows a dish the worker cannot eat)' });
  check('DISHES mirror: slot, buff, power and duration, both directions', bad.length === 0, bad);
  const orphan = SRV.COOKING_RECIPES.filter((r) => !r.makes || !(Object.prototype.hasOwnProperty.call(SRV.DISHES, r.makes) || Object.prototype.hasOwnProperty.call(SRV.SHOP_ITEMS, r.makes)));
  check('every recipe makes a dish or a bottle the worker knows', orphan.length === 0, orphan);
  /* Damage only in a brew: combat.js's cheat ceiling was sized at one x2 brew. */
  const mealDmg = Object.entries(SRV.DISHES).filter(([, d]) => d.slot === 'meal' && d.buff === 'damage');
  check('no meal raises damage (damage is only ever a brew)', mealDmg.length === 0, mealDmg);
  /* v2.3.3132: and he sells NOTHING -- owner: "Remove all of Diego's
     potions. I want food and drink to come exclusively from farming and
     recipes."  Re-adding a bottle to his shelf fails here, on purpose. */
  check('DIEGO_SHELF is empty: food and drink come only from farming and recipes', SRV.DIEGO_SHELF.length === 0, SRV.DIEGO_SHELF);
  /* ...and every bottle he used to sell can be made at the Cookhouse, except
     the Cooked Minnow, which is a fisher's cooked minnow (cook_request). */
  const unmade = Object.keys(SRV.SHOP_ITEMS).filter((k) => k !== 'cookedMinnow' && !SRV.COOKING_RECIPES.some((r) => r.makes === k));
  check('every bottle Diego sold is brewed at the Cookhouse now', unmade.length === 0, unmade);
  /* v2.3.3133: one bite at a time in a fight with a player -- the page holds
     its own bite back by the worker's numbers (fightFood.js). */
  check('PVP_HEAL mirror: the fight window and the gap between bites',
    CLIENT_PVP_HEAL.WINDOW_MS === SRV.PVP_HEAL.WINDOW_MS && CLIENT_PVP_HEAL.GAP_MS === SRV.PVP_HEAL.GAP_MS,
    { server: SRV.PVP_HEAL, client: CLIENT_PVP_HEAL });
}

// ── 5. QUEST_REWARDS vs QUEST_CHAINS: payouts + chain links, BOTH
// directions (a client-only quest could never be paid; a server-only
// entry is dead) ──
{
  const bad = [];
  for (const [k, sv] of Object.entries(SRV.QUEST_REWARDS)) {
    const c = QUEST_CHAINS[k];
    if (!c) { bad.push({ quest: k, missing: 'client' }); continue; }
    if (c.reward.gold !== sv.gold || c.reward.xp !== sv.xp || (c.next || null) !== (sv.next || null)) {
      bad.push({ quest: k, server: { gold: sv.gold, xp: sv.xp, next: sv.next }, client: { ...c.reward, next: c.next } });
    }
  }
  for (const k of Object.keys(QUEST_CHAINS)) if (!SRV.QUEST_REWARDS[k]) bad.push({ quest: k, missing: 'server' });
  check('QUEST_REWARDS <-> QUEST_CHAINS gold/xp/next mirror, both directions', bad.length === 0, bad);
}

// ── 5b. v2.3.1681: the quest dialog's item THUMBNAILS (`gives`) are display
// only, but showing a player a picture of a sword the server will not hand
// over is the worst kind of wrong.  Assert that a promised payout moment
// really exists server-side: when:'accept' needs grantOnAccept, when:'complete'
// needs reward.item.  (The reverse is deliberately NOT asserted — a granted
// item with no art in the repo, like the axe, is allowed to go unillustrated.)
{
  const bad = [];
  for (const [k, c] of Object.entries(QUEST_CHAINS)) {
    if (!Array.isArray(c.gives) || !c.gives.length) continue;
    const sv = SRV.QUEST_REWARDS[k];
    if (!sv) { bad.push({ quest: k, missing: 'server' }); continue; }
    for (const g of c.gives) {
      if (!g || !g.icon) { bad.push({ quest: k, reason: 'gives entry has no icon' }); continue; }
      if (g.when === 'accept' && !Array.isArray(sv.grantOnAccept)) {
        bad.push({ quest: k, icon: g.icon, reason: 'promises an item on accept, server has no grantOnAccept' });
      }
      if (g.when === 'complete' && !sv.item) {
        bad.push({ quest: k, icon: g.icon, reason: 'promises an item on turn-in, server pays no item' });
      }
      if (g.when !== 'accept' && g.when !== 'complete') {
        bad.push({ quest: k, when: g.when, reason: "when must be 'accept' or 'complete'" });
      }
    }
  }
  check('QUEST_CHAINS.gives thumbnails match a real server payout moment', bad.length === 0, bad);
}

// ── 5c. Every icon named by `gives` is a file that exists.  A 404 here is a
// blank square in the tutorial's first dialogue, which no unit test over data
// alone would ever notice.
{
  const bad = [];
  const pub = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public');
  for (const [k, c] of Object.entries(QUEST_CHAINS)) {
    for (const g of (c.gives || [])) {
      if (!g || !g.icon) continue;
      try { readFileSync(join(pub, g.icon.replace(/^\//, '').split('?')[0])); }
      catch (_e) { bad.push({ quest: k, icon: g.icon }); }
    }
  }
  check('QUEST_CHAINS.gives icons exist on disk', bad.length === 0, bad);
}

// ── 6. BLACKSMITH/WOODWORKING: every server field of every tier (the
// client entries carry extra label/color/desc presentation) ──
function tierMirror(name, srv, cli) {
  const bad = [];
  const sk = Object.keys(srv), ck = Object.keys(cli);
  if (JSON.stringify(sk) !== JSON.stringify(ck)) bad.push({ keyOrder: { server: sk, client: ck } });
  for (const k of sk) {
    for (const f of Object.keys(srv[k] || {})) {
      if (!cli[k] || srv[k][f] !== cli[k][f]) bad.push({ tier: k, field: f, server: srv[k] && srv[k][f], client: cli[k] && cli[k][f] });
    }
  }
  check(name + ' tiers mirror (key order + every server field; forge mints must match client previews)', bad.length === 0, bad.slice(0, 5));
}
tierMirror('BLACKSMITH', SRV.BLACKSMITH_TIERS, BLACKSMITH_TIERS);
tierMirror('WOODWORKING', SRV.WOODWORKING_TIERS, WOODWORKING_TIERS);

// ── 7. GUILD_SKILLS vs SKILL_GUILDS keys; GUILD_QUESTS per-index (the
// index IS the claims ladder under guild_claims:<pid> — never reorder) ──
{
  const ck = Object.keys(SKILL_GUILDS);
  check('GUILD_SKILLS === SKILL_GUILDS keys (a skill on one side only can\'t claim quests)',
    JSON.stringify([...SRV.GUILD_SKILLS].sort()) === JSON.stringify([...ck].sort()),
    { server: SRV.GUILD_SKILLS, client: ck });
  const bad = [];
  if (SRV.GUILD_QUESTS.length !== GUILD_QUESTS.length) bad.push({ len: { server: SRV.GUILD_QUESTS.length, client: GUILD_QUESTS.length } });
  SRV.GUILD_QUESTS.forEach((q, i) => {
    const c = GUILD_QUESTS[i];
    if (!c || c.checkLvl !== q.checkLvl || c.reward.gold !== q.gold || c.reward.ap !== q.ap) {
      bad.push({ i, server: q, client: c && { checkLvl: c.checkLvl, ...c.reward } });
    }
  });
  check('GUILD_QUESTS ladder mirrors per-index (checkLvl/gold/ap)', bad.length === 0, bad);
}

// ── 8. QUALITY / AMULET / RARITY multipliers ──
{
  const bad = Object.entries(SRV.QUALITY_GRADES).filter(([k, v]) => QUALITY_MULTS[k] !== v.mult).map(([k]) => k);
  check('QUALITY_GRADES <-> QUALITY_MULTS', bad.length === 0, bad);
}
{
  /* v2.3.2664: how far one piece of each grade raises armour's 75 % ceiling.
     combat.js _armorDrMult reads it off QUALITY_GRADES; the item cards and the
     Hero pane read ARMOR_DR.LIFT.  Checked both ways, so a grade added on one
     side only fails here. */
  const keys = new Set([...Object.keys(SRV.QUALITY_GRADES), ...Object.keys(ARMOR_DR.LIFT)]);
  const bad = [...keys].filter((k) => !SRV.QUALITY_GRADES[k] || SRV.QUALITY_GRADES[k].armorLift !== ARMOR_DR.LIFT[k]);
  check('QUALITY_GRADES armorLift <-> ARMOR_DR.LIFT', bad.length === 0, bad);
}
{
  const bad = Object.entries(SRV.AMULET_TIER_POWER).filter(([k, v]) => !AMULET_TIERS[k] || AMULET_TIERS[k].basePower !== v).map(([k]) => k);
  check('AMULET_TIER_POWER <-> AMULET_TIERS basePower (drives the flame-gem elemDmg roll)', bad.length === 0, bad);
}
{
  const bad = Object.entries(SRV.RARITY_TIERS).filter(([k, v]) => !RARITY_TIERS[k] || RARITY_TIERS[k].mult !== v.mult).map(([k]) => k);
  check('RARITY_TIERS mults mirror (labels/colors are client-only presentation)', bad.length === 0, bad);
}

// ── 8c. v2.3.1192 server amulet forge: the mint tables (amulet.js) vs
// the client's AMULET_TIERS / NUGGETS_PER_BAR / GOLD_NUGGET_DROP.  A
// drifted cost table would let the forge charge a different price than
// the client previews (or deny crafts the client thinks it can afford). ──
tierMirror('AMULET_FORGE', SRV.AMULET_FORGE_TIERS, AMULET_TIERS);
check('NUGGETS_PER_BAR mirror (the smelt op consumes the server constant)',
  SRV.NUGGETS_PER_BAR === NUGGETS_PER_BAR,
  { server: SRV.NUGGETS_PER_BAR, client: NUGGETS_PER_BAR });
check('GOLD_NUGGET_MONSTER_DROP <-> GOLD_NUGGET_DROP.monsterKill (server rolls the kill drop now)',
  SRV.GOLD_NUGGET_MONSTER_DROP === GOLD_NUGGET_DROP.monsterKill,
  { server: SRV.GOLD_NUGGET_MONSTER_DROP, client: GOLD_NUGGET_DROP.monsterKill });

// ── 8d. v2.3.1198 server gem income (amulet.js successor slice): the
// cut-success ladder and the kill drop rate vs the client tables.  A
// drifted ladder would make the Gem Cutter's success preview lie about
// what the server-rolled cut actually pays.  The client's
// GEM_DROP_RATES.woodcutting/fishing/mining are DEAD DATA (no roll
// site ever read them, back to the original index.html) -- deliberately
// not mirrored, the GOLD_NUGGET_DROP.lifeSkill precedent above. ──
tierMirror('GEM_CUT', SRV.GEM_CUT_TIERS, GEM_CUT_TIERS);
check('GEM_RAW_MONSTER_DROP <-> GEM_DROP_RATES.monsterKill (server rolls the kill drop now)',
  SRV.GEM_RAW_MONSTER_DROP === GEM_DROP_RATES.monsterKill,
  { server: SRV.GEM_RAW_MONSTER_DROP, client: GEM_DROP_RATES.monsterKill });

// ── 8e. v2.3.1209 server gem EXTRACTION (amulet.js op:'extract'): the
// cost constant and the display-name label tables.  The client
// wholesale-replaces the gear blob (name included) from the extraction
// echo, so a drifted label would flip the weapon/shield/amulet name on
// every extract; a drifted cost would reject spends the button
// previewed.  The label tables are a compact server-side mirror of the
// client tier/weapon .label fields (only the extraction name rebuild
// needs them server-side). ──
check('GEM_EXTRACT_BASE_COST server <-> client (the extract coin gate)',
  SRV.GEM_EXTRACT_BASE_COST === GEM_EXTRACT_BASE_COST,
  { server: SRV.GEM_EXTRACT_BASE_COST, client: GEM_EXTRACT_BASE_COST });
function labelMirror(name, srvLabels, cliTable) {
  const bad = [];
  const sk = Object.keys(srvLabels), ck = Object.keys(cliTable);
  if (JSON.stringify(sk) !== JSON.stringify(ck)) bad.push({ keyOrder: { server: sk, client: ck } });
  for (const k of sk) {
    if (!cliTable[k] || srvLabels[k] !== cliTable[k].label) {
      bad.push({ key: k, server: srvLabels[k], client: cliTable[k] && cliTable[k].label });
    }
  }
  check(name + ' extraction labels mirror the client .label (name rebuild parity)', bad.length === 0, bad.slice(0, 5));
}
labelMirror('BLACKSMITH', SRV.BLACKSMITH_TIER_LABELS, BLACKSMITH_TIERS);
labelMirror('WOODWORKING', SRV.WOODWORKING_TIER_LABELS, WOODWORKING_TIERS);
labelMirror('WEAPON_TYPE', SRV.WEAPON_TYPE_LABELS, WEAPON_TYPES);

// ── 8b. v2.3.1153 damage-channel reprice: the server coefficient, the
// client coefficient, and the allocation-panel perPt (percent per point)
// must all describe the same multiplier, or the panel readout lies about
// what the authoritative roll pays. ──
{
  // v2.3.1343 (kid-simple reprice): the damage channel is FLAT
  // +DAMAGE_CHANNEL_FLAT/pt (post-tier post-variance); the mirror tie
  // moves from PCT/100 to the flat constant itself.
  check('DAMAGE_CHANNEL_FLAT server <-> client', SRV.DAMAGE_CHANNEL_FLAT === DAMAGE_CHANNEL_FLAT,
    { server: SRV.DAMAGE_CHANNEL_FLAT, client: DAMAGE_CHANNEL_FLAT });
  // v2.3.1345: the accelerating-flat UNIT table must match exactly —
  // a one-sided retune silently splits prediction from settlement.
  check('T2_UNITS server <-> client (accelerating-flat units)',
    JSON.stringify(SRV.T2_UNITS) === JSON.stringify(CLIENT_T2_UNITS),
    { server: SRV.T2_UNITS, client: CLIENT_T2_UNITS });
  const bad = [];
  for (const [cat, defs] of Object.entries(WEAPON_CHANNELS)) {
    for (const d of defs) {
      if (d.role === 'damage' && Math.abs((d.perPt || 0) - DAMAGE_CHANNEL_FLAT) > 1e-12) {
        bad.push({ cat, key: d.key, perPt: d.perPt });
      }
    }
  }
  check('WEAPON_CHANNELS damage-role perPt ties to DAMAGE_CHANNEL_FLAT', bad.length === 0, bad);

  // ── v2.3.1451: BENCH-LOCKED T2 mirrors.  The tuning table, the
  // canonical channel order, and every pricing function must agree
  // between server data.js and client gameSystems.js — a one-sided
  // retune splits the client's spend-time prediction from the
  // server's authoritative accumulator (grids.js _t2BenchReprice),
  // and a canonical-order drift makes replays diverge. ──
  check('T2_BENCH server <-> client (bench-locked tuning table)',
    JSON.stringify(SRV.T2_BENCH) === JSON.stringify(CLIENT_T2_BENCH),
    { server: SRV.T2_BENCH, client: CLIENT_T2_BENCH });
  check('T2_BENCH_CANONICAL server <-> client (channel order + roles)',
    JSON.stringify(SRV.T2_BENCH_CANONICAL) === JSON.stringify(CLIENT_T2_BENCH_CANONICAL),
    { server: SRV.T2_BENCH_CANONICAL.length, client: CLIENT_T2_BENCH_CANONICAL.length });
  {
    const fnBad = [];
    for (const B of [1, 2, 8, 25, 65, 80, 100]) {
      if (JSON.stringify(SRV.t2BenchStats(B)) !== JSON.stringify(clientT2BenchStats(B))) fnBad.push({ B, fn: 't2BenchStats' });
      for (const role of Object.keys(SRV.T2_BENCH)) {
        if (SRV.t2PointValue(role, B) !== clientT2PointValue(role, B)) fnBad.push({ B, role, fn: 't2PointValue' });
      }
    }
    for (const L of [1, 5, 10, 11, 250, 991, 1000]) {
      if (SRV.t2BenchLevel(L) !== clientT2BenchLevel(L)) fnBad.push({ L, fn: 't2BenchLevel' });
      if (SRV.t2SpendLevel(L) !== clientT2SpendLevel(L)) fnBad.push({ L, fn: 't2SpendLevel' });
    }
    // Replay parity on a mixed build — the migration/boundary path and
    // the client's fixture builder must agree byte-for-byte.
    const mixed = {
      weaponSpecs: { sword: { edge: 60, executioner: 30 }, bow: { drawPower: 15 } },
      defenseSpec: { ironskin: 40, secondwind: 25, bulwark: 50 },
      hpSpec: { vigor: 70, lifeblood: 10, laststand: 20 },
      enduranceSpec: { stamina: 35, swiftness: 45 },
    };
    if (JSON.stringify(SRV.t2ReplayFlat(mixed)) !== JSON.stringify(clientT2ReplayFlat(mixed))) fnBad.push({ fn: 't2ReplayFlat' });
    check('bench-locked pricing functions server <-> client (probes at several benchmarks)', fnBad.length === 0, fnBad);
  }
}

// ── 9. Variant map: server _variantForArchInZone vs client
// ZONE_VARIANT_MAP.  Two documented exemptions where the server
// deliberately has NO entry (legacy tidal/hollows brutes predate the
// server-side variant resolution; their remains keys were never
// variant-scoped).  Each exemption asserts the server STILL returns
// null so it self-prunes when someone closes the gap. ──
{
  const EXEMPT = new Set(['tidal.brute', 'hollows.brute']);
  const bad = [];
  for (const [zone, m] of Object.entries(ZONE_VARIANT_MAP)) {
    for (const [arch, variant] of Object.entries(m)) {
      const srv = room._variantForArchInZone(arch, zone);
      if (EXEMPT.has(zone + '.' + arch)) {
        if (srv !== null) bad.push({ zone, arch, exemptionStale: 'server now maps this — delete the exemption', server: srv });
      } else if (srv !== variant) {
        bad.push({ zone, arch, server: srv, client: variant });
      }
    }
  }
  check('ZONE_VARIANT_MAP <-> _variantForArchInZone (self-pruning exemptions: tidal/hollows brute)', bad.length === 0, bad);
}

// ── 10. Variant speeds: every client variant that declares spd must
// match server _variantSpeed — except fishman/rockmonster, the
// documented pre-existing divergence (server has no entry; those
// brutes move at brute base 0.35 server-side while the client cfg
// says 0.5 — left alone to preserve shipped zones' feel).  The
// exemption self-prunes the same way. ──
{
  const EXEMPT = new Set(['fishman', 'rockmonster']);
  const bad = [];
  for (const [k, v] of Object.entries(MONSTER_VARIANTS)) {
    if (v.spd == null) continue;
    const srv = room._variantSpeed(k);
    if (EXEMPT.has(k)) {
      if (srv !== undefined) bad.push({ variant: k, exemptionStale: 'server now has a speed — delete the exemption', server: srv });
    } else if (srv !== v.spd) {
      bad.push({ variant: k, server: srv, client: v.spd });
    }
  }
  check('variant speeds mirror (self-pruning exemptions: fishman/rockmonster)', bad.length === 0, bad);
}

// ── 11. SHOP_ITEMS vs the VendorPanel item array.  The client table
// is inline JSX (src/ui/panels/buildings/VendorPanel.jsx), so extract
// {id, cost, effect} triples by regex — and hard-fail if extraction
// finds nothing (panel moved/renamed → update the path here AND the
// pointer comment in server/src/data.js). ──
{
  const panelPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'ui', 'panels', 'buildings', 'VendorPanel.jsx');
  const src = readFileSync(panelPath, 'utf8');
  const re = /id:\s*'(\w+)',[\s\S]*?cost:\s*(\d+),[\s\S]*?effect:\s*'(\w+)'/g;
  const found = {};
  let m;
  while ((m = re.exec(src))) found[m[1]] = { cost: Number(m[2]), effect: m[3] };
  check('VendorPanel extraction found items (zero = regex rot or the panel moved)', Object.keys(found).length >= 3, Object.keys(found));
  const bad = [];
  for (const [id, sv] of Object.entries(SRV.SHOP_ITEMS)) {
    const c = found[id];
    if (!c) { bad.push({ id, missing: 'client' }); continue; }
    if (c.cost !== sv.cost || c.effect !== sv.effect) bad.push({ id, server: sv, client: c });
  }
  for (const id of Object.keys(found)) if (!SRV.SHOP_ITEMS[id]) bad.push({ id, missing: 'server (client sells something the server won\'t settle)' });
  check('SHOP_ITEMS <-> VendorPanel cost/effect mirror, both directions', bad.length === 0, bad);
}

// ── 12. PROG3 scalar constants (v2.3.1734).  COMBAT-OVERHAUL-PLAN's
// standing constraints assert these are "CI-enforced by
// mirror-audit.test.mjs" — they were NOT.  The client half
// (src/data/prog3.js) is a hand-copied mirror whose only job is to
// predict the numbers the wire will confirm, so drift here is silent
// until a player notices the HUD promising casts the worker refuses.
// Comparing the SCALARS the client mirror actually declares: it is a
// subset by design (the server owns curve functions the client never
// evaluates), so this checks every key present on BOTH sides. ──
{
  const flat = (obj, prefix, out) => {
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === 'object') flat(v, prefix + k + '.', out);
      else out[prefix + k] = v;
    }
    return out;
  };
  const srv = flat(SRV_PROG3, '', {});
  const cli = flat(CLIENT_PROG3, '', {});
  const shared = Object.keys(cli).filter((k) => k in srv);
  check('PROG3 mirror extraction found the scalar set (zero = the mirror moved)', shared.length >= 15, shared.length);
  const bad = shared.filter((k) => String(srv[k]) !== String(cli[k])).map((k) => ({ key: k, server: srv[k], client: cli[k] }));
  check('PROG3 constants mirror server<->client (a drifted one desyncs every predicted number — the v2.3.1451 rule)',
    bad.length === 0, bad);
  /* The four v2.3.1734 additions by name, so a mirror that silently
     LOSES one fails here rather than quietly passing the subset check. */
  /* v2.3.2662: BURST_MIN_CHAR_LEVEL left the list -- it was the milestone
     ladder's rung 6 and is deleted on both sides (abilities.test.mjs pins
     that it stays deleted). */
  const required = ['SPECIAL_MANA_COST', 'MANA_PER_MAGIC_LEVEL', 'BURST_MANA_COST', 'BURST_CD_MS', 'BURST_RADIUS', 'BURST_DMG_MULT'];
  const missing = required.filter((k) => !(k in cli) || !(k in srv));
  check('the mana-rework / Element Burst constants exist on BOTH sides', missing.length === 0, missing);

  /* ═══ v2.3.2512: THE KEY SETS, NOT JUST THE VALUES ═══
     The subset comparison above is deliberately forgiving — the server owns
     curve functions the client never evaluates — but that forgiveness has a
     hole with teeth: a stat that MOVES tables (or is deleted from one side)
     stops appearing in `shared` and the drift passes silently.  This version
     is exactly that case: `elem` left BODY for ATK, and until this assertion
     existed a client still carrying BODY.elem would have been reported clean
     while every elemental readout it printed came from a stat the worker no
     longer had.

     BODY and ATK are the two tables the allocation UI maps and the worker's
     whitelist reads, so their key sets must match EXACTLY, both directions. */
  for (const table of ['BODY', 'ATK']) {
    const sk = Object.keys(SRV_PROG3[table] || {}).sort();
    const ck = Object.keys(CLIENT_PROG3[table] || {}).sort();
    check(`PROG3.${table} key sets match exactly (a stat on one side only is a silent desync)`,
      sk.length > 0 && sk.join(',') === ck.join(','), { server: sk, client: ck });
  }
  /* And the three stats this version moved or created, by name, so a future
     edit that quietly drops one fails here rather than in a player's build. */
  check('elem is an ATK stat on BOTH sides (it left BODY in v2.3.2512)',
    !!SRV_PROG3.ATK.elem && !!CLIENT_PROG3.ATK.elem
      && !SRV_PROG3.BODY.elem && !CLIENT_PROG3.BODY.elem,
    { srvAtk: SRV_PROG3.ATK.elem, cliAtk: CLIENT_PROG3.ATK.elem,
      srvBody: SRV_PROG3.BODY.elem, cliBody: CLIENT_PROG3.BODY.elem });
  check('eres and mana are BODY stats on BOTH sides',
    !!SRV_PROG3.BODY.eres && !!CLIENT_PROG3.BODY.eres
      && !!SRV_PROG3.BODY.mana && !!CLIENT_PROG3.BODY.mana);
  /* v2.3.2592: the four-column grid's arrivals, by name, both sides — and
     the retired pair GONE from both, because a client still carrying
     ATK.crit would draw a row the worker refuses. */
  check('luck / range / special are ATK stats and move is a BODY stat, on BOTH sides (v2.3.2592)',
    !!SRV_PROG3.ATK.luck && !!CLIENT_PROG3.ATK.luck
      && !!SRV_PROG3.ATK.range && !!CLIENT_PROG3.ATK.range
      && !!SRV_PROG3.ATK.special && !!CLIENT_PROG3.ATK.special
      && !!SRV_PROG3.BODY.move && !!CLIENT_PROG3.BODY.move);
  check('...and the retired crit pair is gone from PROG3 on both sides',
    !SRV_PROG3.ATK.crit && !SRV_PROG3.ATK.critDmg && !CLIENT_PROG3.ATK.crit && !CLIENT_PROG3.ATK.critDmg);
  check('SHARED_POINTS_PER_LEVEL exists on BOTH sides', 'SHARED_POINTS_PER_LEVEL' in srv && 'SHARED_POINTS_PER_LEVEL' in cli);
}

// ── 13. Life-skill retune mirrors (v2.3.1765).  Two numbers the owner
// asked for by hand — "Fish heal needs to be closer to 100" and
// "Lifeskills xp is far too slow ... increase it by about 5x" — each
// written twice, once in the worker (authoritative) and once on the
// client (prediction).  A drift is invisible in play: the client shows
// its own number and the next player_state quietly takes it back, which
// reads as the game stuttering rather than as a mismatch. ──
{
  const room = new GameRoom(
    { storage: { get: async () => null, put: async () => {}, list: async () => new Map(), delete: async () => {} },
      blockConcurrencyWhile: async (f) => f() },
    { ROOM_NAME: 'mirror-audit' });
  const fishBad = [];
  for (const key of ['cooked_fish_minnow', 'cooked_fish_trout', 'cooked_fish_nonesuch']) {
    const srvHeal = room._fishHealAmount(key);
    const cliHeal = clientFishHeal(key);
    if (srvHeal !== cliHeal) fishBad.push({ key, server: srvHeal, client: cliHeal });
  }
  check('fish heal mirrors server<->client, unmapped default included', fishBad.length === 0, fishBad);
  check('...and tier one lands on the owner\'s number', room._fishHealAmount('cooked_fish_minnow') === 100,
    room._fishHealAmount('cooked_fish_minnow'));

  /* createGatherNode is the client half of _harvestXpForTier's base.  Driven
     through the real function rather than by re-typing its formula here: a
     test that recomputes the expression it is checking mirrors the typo too. */
  /* The REAL tier levels off WOODCUTTING_TIERS, not invented ones: forcedTierLvl
     falls back to a depth roll when no tier matches, so [1,2,5] silently
     compared tier one three times — the first cut of this check did exactly
     that and reported a drift that was its own doing. */
  const xpBad = [];
  const seenXp = [];
  for (const lvl of CLIENT_WOOD_TIERS.map((t) => t.lvl)) {
    const node = clientGatherNode('meadow', 'shallow', 0, 0, 'tree', lvl);
    const srvBase = room._harvestXpForTier(lvl, 'ok');   /* 'ok' = 1.0x, the base */
    seenXp.push(node && node.xp);
    if (!node || node.xp !== srvBase) xpBad.push({ lvl, server: srvBase, client: node && node.xp });
  }
  /* GUARD, and not a theoretical one — the first cut of this check swept
     [1, 2, 5] and got tier one back three times: forcedTierLvl silently falls
     back to a depth roll when no tier carries that lvl, so a sweep that looks
     broad can compare the same tier over and over and pass on a mirror that
     has drifted everywhere above the floor.  If the tiers really were swept,
     the client's XP must VARY. */
  check('the tier sweep actually swept distinct tiers (guard)',
    new Set(seenXp).size === CLIENT_WOOD_TIERS.length, seenXp);
  check('harvest XP base mirrors server<->client across tiers', xpBad.length === 0, xpBad);
  check('...and a tier-one harvest pays the retuned 25x base (owner: x5 again)',
    room._harvestXpForTier(1, 'ok') === 163, room._harvestXpForTier(1, 'ok'));
}

// ── 14. Equip-gate mirror (v2.3.1765).  Owner: "Copper counts as rung
// zero."  The worker scores a weapon by its POSITION in the forge table;
// the client scores the same weapon by statReq/2.  Both had to learn that
// the ladder starts at copper, and a one-sided edit is invisible in play
// until a player watches a weapon refuse to stay equipped. ──
{
  const room = new GameRoom(
    { storage: { get: async () => null, put: async () => {}, list: async () => new Map(), delete: async () => {} },
      blockConcurrencyWhile: async (f) => f() },
    { ROOM_NAME: 'mirror-audit-equip' });
  /* Swept across REAL tier keys off both tables rather than a hand-picked
     few — the drift this catches is per-tier. */
  setProg3Enabled(true);
  const metals = Object.keys(SRV.BLACKSMITH_TIERS);
  const woods = Object.keys(SRV.WOODWORKING_TIERS);
  const cases = [];
  for (const k of metals) cases.push({ type: 'greatsword', gearBase: k, slot: 'weapon', tierMult: 1 });
  for (const k of woods) cases.push({ type: 'bow', gearBase: 'ww_' + k, slot: 'rangedWeapon', tierMult: 1 });
  const bad = [];
  /* Every trained level from 0 to 30: agreeing at one level proves nothing,
     since the two formulas could differ by a constant and still match where
     both say yes. */
  for (let lvl = 0; lvl <= 30; lvl += 1) {
    const ps = { prog3: { sk: { sword: { level: lvl }, bow: { level: lvl }, staff: { level: lvl } },
      alloc: {}, atk: {}, pool: {}, ms: {} } };
    const rpg = { prog3: ps.prog3 };
    for (const c of cases) {
      const item = { type: c.type, gearBase: c.gearBase, tierMult: c.tierMult, name: 'x' };
      const srvOk = room._prog3EquipOk(ps, c.slot, item);
      const cliOk = clientCanEquip(rpg, item, c.type);
      if (srvOk !== cliOk) bad.push({ lvl, gearBase: c.gearBase, server: srvOk, client: cliOk });
    }
  }
  check('equip gate agrees server<->client across every tier and level 0-30',
    bad.length === 0, bad.slice(0, 8));
  /* GUARD: the sweep is only meaningful if the gate ever says NO.  If
     prog3Live() or the prog3 branch stopped firing on this fixture, every
     comparison would be true===true and the check above would pass on a
     mirror that had drifted everywhere. */
  const anyRefusal = cases.some((c) => room._prog3EquipOk(
    { prog3: { sk: { sword: { level: 0 }, bow: { level: 0 }, staff: { level: 0 } }, alloc: {}, atk: {}, pool: {}, ms: {} } },
    c.slot, { type: c.type, gearBase: c.gearBase, tierMult: 1, name: 'x' }) === false);
  check('...and the gate does refuse SOMETHING at level 0 (guard: an always-yes gate agrees trivially)',
    anyRefusal === true);
  /* The owner's rule itself, on both sides. */
  const lvl1 = { prog3: { sk: { sword: { level: 1 }, bow: { level: 1 }, staff: { level: 1 } }, alloc: {}, atk: {}, pool: {}, ms: {} } };
  check('copper is rung zero on the CLIENT too (owner\'s call, both sides)',
    clientCanEquip({ prog3: lvl1.prog3 }, { type: 'greatsword', gearBase: 'copper', tierMult: 1 }, 'greatsword') === true);

  /* ═══ v2.3.2664: THE ARMOUR LADDER, SWEPT THE SAME WAY ═══
     Owner: "Yeah I'll go with your defense requirements for next tiers" --
     copper and iron free, then 5 Defense per tier.  The client never gated a
     piece without a gearBase at all until this version, which is how an iron
     torso was equipped, refused and eaten (v2.3.2122); so the two gates are
     compared across every tier, grade and Defense level that matters. */
  check('armour requirement constants mirror (free tiers, Defense per tier)',
    SRV.ARMOR_FREE_TIERS === CLIENT_ARMOR_FREE_TIERS && SRV.ARMOR_DEF_REQ_PER_TIER === CLIENT_ARMOR_DEF_REQ_PER_TIER,
    { srv: [SRV.ARMOR_FREE_TIERS, SRV.ARMOR_DEF_REQ_PER_TIER], cli: [CLIENT_ARMOR_FREE_TIERS, CLIENT_ARMOR_DEF_REQ_PER_TIER] });
  const armourItems = [];
  for (let tm = 0; tm <= 9; tm += 0.25) armourItems.push({ name: 'x', tierMult: tm, mat: 'steel' });
  armourItems.push({ name: 'Iron Torso', tierMult: 2, mat: 'iron', slot: 'armor' });
  armourItems.push({ name: 'Iron Torso', tierMult: 1.25, mat: 'iron' });
  armourItems.push({ name: 'forged iron', tierMult: 8, mat: 'iron' });
  armourItems.push({ name: 'Copper Torso', tierMult: 1, mat: 'copper', kind: 'armor' });
  armourItems.push({ name: 'godly', tierMult: 3, mat: 'steel', quality: 'godly' });
  armourItems.push({ name: 'no tier' });
  armourItems.push({ name: 'nan', tierMult: 'x' });
  armourItems.push({ gearBase: 'mythril', tierMult: 1.94 });
  armourItems.push({ gearBase: 'iron', tierMult: 1.25 });
  /* A WEAPON shape is checked for the ladder test only, not swept through
     the gate below: no client screen offers a weapon for the armour slot
     (only a hand-built equip_request can), the worker keeps its old
     tier-table gate for it, and drops.test.mjs §8b pins that server-side. */
  const weaponShape = { type: 'greatsword', tierMult: 4 };
  const reqBad = [...armourItems, weaponShape].filter((it) => SRV.armorDefReq(it) !== clientArmorDefReq(it)
    || SRV.isArmourLadderPiece(it) !== clientIsArmourLadderPiece(it));
  check('armorDefReq / isArmourLadderPiece agree server<->client on every shape', reqBad.length === 0, reqBad.slice(0, 6));
  const armBad = [];
  let armRefused = 0;
  for (let def = 0; def <= 35; def += 1) {
    const ps = { prog3: { sk: { sword: { level: 40 }, bow: { level: 1 }, staff: { level: 1 } },
      alloc: { def }, atk: {}, pool: {}, ms: {} } };
    for (const item of armourItems) {
      const srvOk = room._prog3EquipOk(ps, 'armor', item);
      const cliOk = clientCanEquip({ prog3: ps.prog3 }, item, 'armor');
      if (!srvOk) armRefused++;
      if (srvOk !== cliOk) armBad.push({ def, item, server: srvOk, client: cliOk });
    }
  }
  check('armour equip gate agrees server<->client across tiers 0-9 and Defense 0-35',
    armBad.length === 0, armBad.slice(0, 6));
  check('...and it does refuse something (guard: an always-yes gate agrees trivially)', armRefused > 0, armRefused);
}

/* ═══ 13. v2.3.1812: TELEGRAPH KINDS vs THE CLIENT'S RENDER WHITELIST ═══
   The monster_ability handler in src/networking/gameEvents.js renders only
   abilities it has a label for and `break`s on anything else — deliberately,
   so a forged or unknown wire string draws nothing.  The cost of that
   discipline is that a NEW server kit ships, telegraphs correctly, is
   authoritative, and is completely invisible in play.  No error, no warning:
   the signature failure of this codebase.  Fodder's `lunge` (v2.3.1812) is
   the second kit to need the client entry, which is two too many to keep
   trusting memory for.

   Read as TEXT rather than imported: gameEvents.js is a wire handler, not a
   data module, and pulling it in would drag the renderer with it.  The regex
   is pinned to the exact literal, so if someone restructures the whitelist
   this fails loudly and gets updated rather than silently matching nothing —
   which is why the parse itself is asserted first. */
{
  const src = readFileSync(new URL('../../src/networking/gameEvents.js', import.meta.url), 'utf8');
  const m = src.match(/var _maLabels = \{([^}]*)\}/);
  check('telegraph mirror: the client\'s ability whitelist is still parseable',
    !!m, { found: !!m });
  const clientKinds = m ? (m[1].match(/(\w+)\s*:/g) || []).map((k) => k.replace(/\s*:$/, '')) : [];
  check('telegraph mirror: ...and the parse found something (guard: an empty list matches nothing)',
    clientKinds.length >= 2, clientKinds);
  const serverKinds = Object.values(SRV_TELEGRAPH.KITS).map((k) => k.kind);
  const missing = serverKinds.filter((k) => !clientKinds.includes(k));
  check('telegraph mirror: every server kit has a client label (or it renders NOTHING)',
    missing.length === 0, { missing, serverKinds, clientKinds });
  /* Colours and shakes are keyed by the same strings; a label without them
     falls back to a generic amber, which is a silent downgrade rather than a
     silent absence — still worth catching. */
  for (const table of ['_maColors', '_maShake']) {
    const mm = src.match(new RegExp('var ' + table + ' = \\{([^}]*)\\}'));
    const keys = mm ? (mm[1].match(/(\w+)\s*:/g) || []).map((k) => k.replace(/\s*:$/, '')) : [];
    check(`telegraph mirror: ${table} covers every kit too`,
      serverKinds.every((k) => keys.includes(k)), { table, keys, serverKinds });
  }

  /* ═══ v2.3.2215: the SAME trap, for the universal basic wind-up ═══
     The client renders only the ability strings it has a table entry for
     and silently drops the rest — which is how a server-side tell can ship,
     be fully authoritative, and be invisible in play.  The kits above are
     pinned for that reason; the basic wind-up needs the same pin or the
     tell that fires on EVERY swing is the one that goes dark. */
  const bwm = src.match(/var _bwKinds = \{([^}]*)\}/);
  check('windup mirror: the client\'s basic-windup whitelist is parseable',
    !!bwm, { found: !!bwm });
  const bwClient = bwm ? (bwm[1].match(/(\w+)\s*:/g) || []).map((k) => k.replace(/\s*:$/, '')) : [];
  check('windup mirror: ...and it accepts both server kinds (swing + throw)',
    ['swing', 'throw'].every((k) => bwClient.includes(k)), bwClient);
  /* Every duration key must be a REAL archetype, or a typo silently gets
     DEFAULT and one monster quietly loses its tuned tell. */
  const archKeys = Object.keys(ARCHETYPES);
  const strayArch = Object.keys(SRV_BASIC_WINDUP.MS).filter((k) => k !== 'DEFAULT' && !archKeys.includes(k));
  check('windup mirror: every duration key is a real archetype (a typo would fall back to DEFAULT)',
    strayArch.length === 0, { strayArch, archKeys });

  /* ═══ v2.3.2216: the throw strip must know WHICH basic it is drawing ═══
     The snowman's only attack sheet is a snowball throw, but he melee-pokes
     inside his 100px minRange — the range you actually fight him at.  Until
     v2.3.2216 the client stamped the animation fields for both kinds, so a
     melee poke played a throw: a ball appeared in his hand and no projectile
     ever followed.  The fix is a _shootAnimKind stamp on the writer side and
     a gate on the reader side, and it is worthless if either half is
     dropped — so pin BOTH, the same way the whitelist above is pinned. */
  check('windup mirror: gameEvents stamps _shootAnimKind from the wire ability',
    /_shootAnimKind\s*=\s*payload\.ability/.test(src), {});
  const rend = readFileSync(
    new URL('../../src/rendering/systems/entityRenderer.js', import.meta.url), 'utf8');
  check('windup mirror: ...and the renderer gates the throw strip on it',
    /_shootAnimKind\s*!==\s*'swing'/.test(rend), {});
  /* The release frame is what aligns the drawn ball with the real
     projectile; if the strips are ever redrawn at a different length this
     must move with them, so pin that it is inside the sheet. */
  const sprites = readFileSync(
    new URL('../../src/rendering/snowmanSprites.js', import.meta.url), 'utf8');
  const relM = sprites.match(/ATTACK_RELEASE_FRAME\s*=\s*(\d+)/);
  check('windup mirror: the snowman attack strips declare a release frame',
    !!relM, { found: !!relM });
  check('windup mirror: ...and it is inside the 8-frame strips as drawn',
    !!relM && Number(relM[1]) > 0 && Number(relM[1]) < 8, relM && relM[1]);

  /* ═══ v2.3.2217: the ball must leave his HAND, on the ball's own tick ═══
     Two follow-ups to the same report.  The server can only place the
     snowball at the monster's logical point (its feet), so the throwing-hand
     offset is measured off the strips client-side — and a facing with no
     entry silently falls back to south's hand, which is the quiet failure
     this pins.  The release is then driven by the projectile event rather
     than by the wind-up clock, because a tick boundary plus the wire put the
     ball a beat behind the arm. */
  const muzM = sprites.match(/const THROW_MUZZLE_PX = \{([\s\S]*?)\n\};/);
  const muzKeys = muzM ? (muzM[1].match(/(\w+)\s*:\s*\{/g) || []).map((k) => k.replace(/\s*:\s*\{$/, '')) : [];
  const dirM = sprites.match(/const DIR_MAP = \{([\s\S]*?)\n\};/);
  const dirSrcs = dirM ? [...new Set((dirM[1].match(/src:\s*'(\w+)'/g) || []).map((k) => k.replace(/src:\s*'/, '').replace(/'$/, '')))] : [];
  check('muzzle mirror: both the muzzle table and DIR_MAP are parseable',
    muzKeys.length > 0 && dirSrcs.length > 0, { muzKeys, dirSrcs });
  const muzMissing = dirSrcs.filter((d) => !muzKeys.includes(d));
  check('muzzle mirror: every facing the strips are drawn from has a hand offset',
    muzMissing.length === 0, { muzMissing, muzKeys, dirSrcs });
  check('muzzle mirror: the renderer publishes the hand for the facing it draws',
    /_muzzleX\s*=\s*_mz\.dx/.test(rend), {});
  check('muzzle mirror: ...and the projectile launches from it',
    /_muzzleX/.test(src) && /_sbX/.test(src), {});
  check('release sync: the projectile event stamps the release instant',
    /_throwReleaseAt\s*=\s*Date\.now\(\)/.test(src), {});
  check('release sync: ...and the renderer waits for it rather than a clock',
    /_throwReleaseAt/.test(rend) && /THROW_RELEASE_GRACE_MS/.test(rend), {});

  /* ═══ v2.3.2217: the ball in the air is the ball in his hand ═══
     snowball.png is CUT from frame 5 of the south throw strip, so it is a
     generated asset that must be committed — miss it and the projectile
     silently drops back to the procedural orb the owner asked us to
     replace.  Pin the file, the loader (it rides loadSnowmanSprites, which
     preloadZoneAssets awaits for frost — the preload law's zone exception)
     and the consumer. */
  let ballBytes = 0;
  try {
    ballBytes = readFileSync(new URL(
      '../../public/sprites/monsters/snowman/snowball.png', import.meta.url)).length;
  } catch { /* missing */ }
  check('snowball art: the cut-out ball sprite is committed',
    ballBytes > 0, { bytes: ballBytes });
  check('snowball art: it loads with the rest of the snowman (per-zone preload)',
    /loadSnowball\(\)/.test(sprites) && /snowball\.png/.test(sprites), {});
  const fx = readFileSync(
    new URL('../../src/rendering/systems/effectsRenderer.js', import.meta.url), 'utf8');
  check('snowball art: ...and the thrown ball actually draws it',
    /getSnowballTexture\(\)/.test(fx), {});
  /* The procedural orb stays as the fallback — a ball you cannot see is a
     ball you cannot dodge, and the art is a per-zone asset. */
  check('snowball art: ...with the procedural orb kept as the fallback',
    /cold rim/.test(fx), {});

  /* ═══ v2.3.2217: the ball bursts where its flight ends ═══
     Owner-supplied art, normalised into the repo's 8-frame strip.  Three
     ways this dies quietly, so three pins: the strip goes missing; the
     queue is filled but never drained (or vice versa); or the per-zone
     preload entry is dropped, which turns it into exactly the first-use
     texture load CLAUDE.md calls a regression. */
  let burstBytes = 0;
  try {
    burstBytes = readFileSync(new URL(
      '../../public/sprites/effects/snowball-burst-v1.png', import.meta.url)).length;
  } catch { /* missing */ }
  check('snowball burst: the strip is committed',
    burstBytes > 0, { bytes: burstBytes });
  const proj = readFileSync(
    new URL('../../src/game/projectiles.js', import.meta.url), 'utf8');
  /* BOTH endings must queue: reaching the aimed point (a dodge) and
     reaching the player (a hit).  Bursting only on damage would make a
     successful dodge look like the ball evaporated. */
  /* Call sites only — the declaration itself reads `queueSnowballBurst(S, proj)` too. */
  const queued = (proj.match(/queueSnowballBurst\(S, proj\); return false;/g) || []).length;
  check('snowball burst: both ways a flight can end queue one',
    queued === 2, { queued });
  check('snowball burst: ...and the renderer drains that queue',
    /_updateSnowballBursts/.test(fx) && /snowballBursts/.test(fx), {});
  const pre = readFileSync(
    new URL('../../src/rendering/preloadAnimations.js', import.meta.url), 'utf8');
  check('snowball burst: ...and it is preloaded per-zone, not on first use',
    /ensureSnowballBurstTex/.test(pre) && /tasks\.push\(Promise\.resolve\(ensureSnowballBurstTex/.test(pre), {});

  /* ═══ v2.3.2245: THE HARVEST LIVES ON THE RIGHT BUTTON ═══
     Owner: "No resource extraction button in the middle of the screen or
     needing to tap on the resource or perform the gestures in the middle of
     the screen area. ... The gesture cues will be on the right button."
     Three pins: the mid-screen shell element is gone from BroTown; the
     gesture layer anchors on the button; and the strip URLs the button face
     plays (gesturePose.js GESTURE_TOOL_URLS) are the SAME files the world
     renderer slices (effectsRenderer GESTURE_TOOLS) -- a hand-copied mirror,
     which is exactly the kind this suite exists to hold in lockstep.
     v2.3.2760: the button no longer plays the strips whole -- its cue is a
     mini tool (gesturePose GESTURE_CUE_SPRITES), and only the pan is cut from
     a strip (cell 0, there is no pan icon) -- but GESTURE_TOOL_URLS is still
     where that pan URL comes from, so the pin still guards a real mirror. */
  const _bro = readFileSync(new URL('../../src/ui/BroTown.jsx', import.meta.url), 'utf8');
  const _esl = readFileSync(new URL('../../src/ui/ExtractionSwipeLayer.jsx', import.meta.url), 'utf8');
  const _gp = readFileSync(new URL('../../src/game/gesturePose.js', import.meta.url), 'utf8');
  check('harvest on the button: the mid-screen shell element (#bt-node-prompt) is gone',
    !/id:\s*["']bt-node-prompt["']/.test(_bro), {});
  check('harvest on the button: the gesture layer anchors on the right button',
    /querySelector\('\.bt-rjoy-base'\)/.test(_esl) && !/FISH_CUE_DY/.test(_esl), {});
  const _urlsA = [...fx.matchAll(/url:\s*'([^']+gesture[^']+)'/g)].map((m) => m[1]).sort();
  const _urlsB = [...(_gp.match(/'\/sprites\/tools\/[^']+'/g) || [])].map((u) => u.slice(1, -1)).sort();
  check('harvest on the button: the gesture strips gesturePose names are the ones the world renderer slices',
    _urlsA.length === 4 && JSON.stringify(_urlsA) === JSON.stringify(_urlsB), { world: _urlsA, button: _urlsB });
  check('harvest on the button: the character frames follow the hand (both renderers read gesturePose01)',
    /gesturePose01\(/.test(rend) && /gesturePose01\(/.test(fx), {});

  /* ═══ v2.3.2243: MAGIC HITS AS WIDE AS AN ARROW ═══
     Owner: "Magic attack radius will be nerfed to be same as bow."  Two
     halves.  The reach claim the client sends for a PvP hit is
     WEAPON_TYPES[type].range -- staff must equal bow.  The splash radius is
     projectiles.js's per-archetype _hitR table, which used to carry a wider
     staff column as an `a.isStaff ? N : M` ternary; a single one left
     anywhere in that block would quietly give the staff its splash back. */
  check('magic = bow: the staff reach claim equals the bow reach claim',
    WEAPON_TYPES.staff.range === WEAPON_TYPES.bow.range,
    { staff: WEAPON_TYPES.staff.range, bow: WEAPON_TYPES.bow.range });
  const _hitRBlock = proj.slice(proj.indexOf('var _hitR = 18;'), proj.indexOf('staffAoeMult(S.rpg)'));
  check('magic = bow: no staff-only splash radius survives in the projectile hit table',
    _hitRBlock.length > 100 && !/isStaff\s*\?\s*\d+\s*:\s*\d+/.test(_hitRBlock)
    /* v2.3.2518: the small-monster radius reads 25, not 27.  v2.3.2511
       re-measured the slime frame by frame (34/48/54 wide, 41 tall) and
       found 27 was one axis of an ellipse, so a circle drawn at it was 46%
       too generous vertically -- the "it counted when it clearly passed
       over its head" report.  The sentinel here is guarding that the table
       still HAS its per-size rows, so it tracks the value; it does not get
       to hold the radius at a number the art disproved.  Caught after the
       fact because the client-only change that moved it ran no server
       suite (this file is the mirror, and it lives on the server side). */
    && /_hitR = 25;/.test(_hitRBlock) && /_hitR = 40;/.test(_hitRBlock),
    { blockLen: _hitRBlock.length, staffTernaries: (_hitRBlock.match(/isStaff\s*\?/g) || []).length });

  /* ═══ v2.3.2218: THE CRIT THE POPUP PREDICTS IS THE CRIT THE SERVER ROLLS ═══
     gameEvents skips the server's damage number for your OWN hits ("we
     already show it locally"), so on your own swing the popup is purely
     monsterCombat's local prediction and is never corrected on screen — the
     HP bar just drains by a different figure.  That makes any drift here
     invisible in play and permanent, which is how the swing path stayed on
     the retired Power/Ferocity curves for the whole prog3 era while
     calcDisplayDps and the Hero screen were moved over.

     First: the client's own prog3 crit helpers must equal the server's
     formula (these are what the fixed swing path calls). */
  /* v2.3.2592: ONE stat, LUCK, carries both halves — the client's helpers
     must equal the server's _prog3CritChance / _prog3CritMult for every
     allocation, on a worker that advertises the folded grid. */
  setProg3XEnabled(true); setProg3SharedEnabled(true); setProg3RelEnabled(true); /* v2.3.2680: a relative worker */
  const mkP3 = (luck) => ({
    prog3: { v: 3, sk: { sword: { level: 40 }, bow: { level: 1 }, staff: { level: 1 } },
      atk: { sword: { luck, dmg: 0 }, bow: {}, staff: {} }, alloc: {}, poolBy: {} },
  });
  let critDrift = null;
  for (const l of [0, 10, 25, 50, 75, 100]) {
    const p = mkP3(l);
    const srvChance = room._prog3CritChance(p, 'sword');
    const srvMult = room._prog3CritMult(p, 'sword');
    const cliChance = prog3CritPct(p, 'sword');
    const cliMult = prog3CritMult(p, 'sword');
    if (Math.abs(srvChance - cliChance) > 1e-9 || Math.abs(srvMult - cliMult) > 1e-9) {
      critDrift = { l, srvChance, cliChance, srvMult, cliMult }; break;
    }
  }
  check('crit parity: the client crit helpers equal the server roll across the allocation range',
    critDrift === null, critDrift);

  /* ═══ v2.3.2680: EVERY CURVE READER, BOTH SIDES, WITH AND WITHOUT A MONSTER ═══
     The curve and the edge are stated once per side (prog3Curve / prog3Edge);
     these pin the two sides' functions to each other and every reader built
     on them, at edge 1 (a readout) and against monsters above the yardstick
     (the roll), so a one-sided retune fails here rather than in a player's
     damage popup. */
  let curveDrift = null;
  for (const q of [0, 0.5, 1, 3, 5, 10, 40, 999]) for (const k of [7, 10]) {
    if (Math.abs(srvCurve(q, k) - cliCurve(q, k)) > 1e-12) { curveDrift = { q, k }; break; }
  }
  for (const [y, m] of [[10, null], [10, 5], [10, 10], [10, 11], [10, 13], [10, 15], [10, 40], [1, 3]]) {
    if (Math.abs(srvEdge(y, m) - cliEdge(y, m)) > 1e-12) { curveDrift = { y, m }; break; }
  }
  check('curve parity: prog3Curve and prog3Edge are the same function on both sides', curveDrift === null, curveDrift);
  const mkRel = (pts) => ({ activeSlot: 'melee',
    prog3: { v: 3, sk: { sword: { level: 20 }, bow: { level: 1 }, staff: { level: 1 } },
      atk: { sword: { luck: pts, dmg: pts, special: pts, elem: pts }, bow: {}, staff: {} },
      alloc: { def: pts, dodge: pts, eres: pts, move: pts }, poolBy: {} } });
  setProg3Enabled(true); setProg3ElemEnabled(true); /* a relative worker carries the per-weapon elem grid too */
  let relDrift = null;
  scan: for (const pts of [0, 1, 5, 20, 90]) for (const mlvl of [undefined, 20, 22, 24, 30]) {
    const p = mkRel(pts);
    const pairs = [
      ['crit', room._prog3CritChance(p, 'sword', mlvl), prog3CritPct(p, 'sword', mlvl)],
      ['critMult', room._prog3CritMult(p, 'sword', mlvl), prog3CritMult(p, 'sword', mlvl)],
      ['power', room._prog3PowerMult(p, 'sword', mlvl), prog3PowerMult(p, 'sword', mlvl)],
      ['special', room._prog3SpecialMult(p, 'sword', mlvl), prog3SpecialMult(p, 'sword', mlvl)],
      ['dodge', room._prog3DodgePct(p, mlvl), prog3DodgePct(p, mlvl)],
      ['def', 1 - room._prog3DefMult(p, mlvl), prog3DefPct(p, mlvl)],
      ['elem', srvElem(p, 'power', 'sword', mlvl), prog3ElemPower(p, 'sword', mlvl)],
      ['move', room._prog3MoveMult(p), prog3MoveMult(p)],
    ];
    const bad = pairs.find(([, a, b]) => Math.abs(a - b) > 1e-9);
    if (bad) { relDrift = { pts, mlvl, stat: bad[0], server: bad[1], client: bad[2] }; break scan; }
  }
  check('curve parity: every curve reader equals its server twin, at edge 1 and against stronger monsters',
    relDrift === null, relDrift);
  /* And against a LINEAR worker (no caps.prog3rel) the same readers must
     predict that worker's pts × per, off PROG3_LINEAR (rule 19). */
  setProg3RelEnabled(false);
  const lin = mkRel(50);
  check('linear worker: the readers fall back to PROG3_LINEAR exactly',
    Math.abs(prog3CritPct(lin, 'sword') - (PROG3_LINEAR.luck.base + 50 * PROG3_LINEAR.luck.per)) < 1e-9
      && Math.abs(prog3CritMult(lin, 'sword') - (1.5 + 50 * PROG3_LINEAR.luck.dmgPer)) < 1e-9
      && Math.abs(prog3DodgePct(lin) - 50 * PROG3_LINEAR.dodge.per) < 1e-9
      && Math.abs(prog3DefPct(lin) - 50 * PROG3_LINEAR.def.per) < 1e-9
      && prog3PowerMult(lin, 'sword') === 1,
    { crit: prog3CritPct(lin, 'sword'), dodge: prog3DodgePct(lin) });
  setProg3RelEnabled(true);
  setProg3ElemEnabled(false);
  setProg3Enabled(false);
  check('crit parity: ...and no flat term under prog3, matching combat.js',
    prog3CritFlat(mkP3(100), 'sword') === 0, prog3CritFlat(mkP3(100), 'sword'));
  /* And the RETIRED pair, against a worker that has not folded it: the
     client must predict THAT worker's crit/critDmg roll (rule 19) — pinned
     against the retired values the client keeps in PROG3_LEGACY_ATK. */
  setProg3SharedEnabled(false);
  const legacyP = { prog3: { v: 3, sk: { sword: { level: 40 }, bow: { level: 1 }, staff: { level: 1 } },
    atk: { sword: { crit: 50, critDmg: 75, dmg: 0 }, bow: {}, staff: {} }, alloc: {}, poolBy: {} } };
  check('crit parity (old worker): the client predicts the retired crit/critDmg roll',
    Math.abs(prog3CritPct(legacyP, 'sword') - (PROG3_LEGACY_ATK.crit.base + 50 * PROG3_LEGACY_ATK.crit.per)) < 1e-9
      && Math.abs(prog3CritMult(legacyP, 'sword') - (1.5 + 75 * PROG3_LEGACY_ATK.critDmg.per)) < 1e-9,
    { chance: prog3CritPct(legacyP, 'sword'), mult: prog3CritMult(legacyP, 'sword') });
  setProg3XEnabled(false);

  /* Second: the swing path must actually CALL them.  The helpers being
     correct is worth nothing if the popup does not read them — which was
     exactly the state this pin was written for. */
  const mc = readFileSync(
    new URL('../../src/game/monsterCombat.js', import.meta.url), 'utf8');
  for (const fn of ['prog3CritPct', 'prog3CritMult', 'prog3CritFlat']) {
    check(`crit parity: the swing prediction calls ${fn}`, mc.includes(fn + '(_R6'), {});
  }
  /* The 8% floor and the staff x0.35 are legacy-only: the server applies
     neither under prog3, so they must not run on the prog3 branch. */
  check('crit parity: the legacy floor/staff-scalar sit behind the legacy branch',
    /_p3Cat \? prog3CritPct/.test(mc) || /if \(_p3Cat\) \{/.test(mc), {});
  /* combat.js multiplies the special in BEFORE anchoring, so anchoring
     first and scaling after would multiply the FLOOR too. */
  check('crit parity: the special multiplies in before the crit anchor',
    /_specBase \* specialMult/.test(mc) && !/_critBase \* specialMult/.test(mc), {});

  /* ═══ v2.3.2220: in a server zone the popup REPORTS, it does not guess ═══
     Aligning the formula (v2.3.2218) could not align two separate
     Math.random() calls: the worker rolls its own variance and its own crit
     and discards the client's, so a local prediction is a second roll that
     agrees only by luck — a client crit on a server non-crit prints ~2.5x
     what landed.  The local number must therefore be gated to
     client-authoritative zones, and the server's must be painted for our own
     hits.  Either half alone reverts the bug or prints nothing at all. */
  check('damage truth: the local number is gated to client-authoritative zones',
    /if \(!S\._serverMonsters\) \{/.test(mc), {});
  check('damage truth: ...and the server number is painted for our own hits',
    /payload\.ability \|\| S\._serverMonsters/.test(src), {});

  /* ═══ v2.3.2221: the burrow, on both sides of the wire ═══
     The same whitelist trap as the telegraph kits and the basic wind-up: the
     client drops ability names it does not know, so a phase the server sends
     and the client has no branch for is a mechanic that ships fully working
     and completely invisible.  And a phase with no RESYNC field strands a
     player who joins mid-pile in front of a snowman that shrugs off hits. */
  const burM = src.match(/var _burPhases = \{([^}]*)\}/);
  const burClient = burM ? (burM[1].match(/(\w+)\s*:/g) || []).map((k) => k.replace(/\s*:$/, '')) : [];
  check('burrow mirror: the client accepts every phase the server emits',
    ['dig', 'pile', 'emerge'].every((k) => burClient.includes(k)), burClient);
  check('burrow mirror: ...and every burrowing archetype is a real one',
    Object.keys(SRV_BURROW_ARCH).every((k) => Object.keys(ARCHETYPES).includes(k)),
    Object.keys(SRV_BURROW_ARCH));
  const tickSrc = readFileSync(new URL('../src/tick.js', import.meta.url), 'utf8');
  const wsSrc = readFileSync(
    new URL('../../src/networking/wsClient.js', import.meta.url), 'utf8');
  check('burrow mirror: the phase rides the wire for resyncs (w.ph)',
    /w\.ph = m\._burPhase/.test(tickSrc) && /md\.ph/.test(wsSrc), {});
  /* The pile reuses the boss IMMUNE flag rather than inventing a second
     "cannot be hurt" concept the popup path would not know about. */
  check('burrow mirror: the pile sets the existing _invulnerable flag',
    /_invulnerable = payload\.phase === 'pile'/.test(src), {});
  check('burrow mirror: ...and the renderer draws the phase sheets',
    /getSnowmanPhaseFrame/.test(rend), {});

  /* v2.3.2224: the pile is INTANGIBLE, not merely invulnerable.  Owner:
     attacking it should send no combat messages and projectiles should pass
     through.  Both the melee sweep and the projectile pass must consult the
     same predicate -- a sword that ignores the mound while an arrow stops
     dead on it reads as a bug in whichever one you notice second. */
  const projSrc = readFileSync(
    new URL('../../src/game/projectiles.js', import.meta.url), 'utf8');
  const cliVariants = readFileSync(
    new URL('../../src/data/monsterVariants.js', import.meta.url), 'utf8');
  check('intangible: the melee sweep skips it beside !m.alive',
    /!m\.alive \|\| isIntangible\(m\)/.test(mc), {});
  check('intangible: ...and so does the projectile pass',
    /!m\.alive \|\| isIntangible\(m\)/.test(projSrc), {});
  /* Bosses keep their IMMUNE cue: there the message IS the mechanic. */
  check('intangible: the IMMUNE popup is still reachable for boss phases',
    /_invulnerable\) \{/.test(mc) && /'IMMUNE'/.test(mc), {});
  /* ═══ v2.3.2226: a slime mid-swell is intangible TOO ═══
     The swell leaves it ALIVE with 0 hp, a state the client had never seen.
     The melee sweep saw a live monster and fell into the local kill block
     (`if (m.curHp <= 0)`), which spawns ground loot -- once per swing, for
     the whole fuse, while the server granted loot exactly once.  That is the
     owner's "dozens of slimes in my bag then fixes the amounts".
     If this predicate ever stops covering _burstUntil the duplication comes
     straight back, and it comes back as an ECONOMY bug, not a visual one. */
  check('intangible: ...and covers a slime mid-death-swell (the phantom-loot bug)',
    /_burstUntil/.test(cliVariants) && /isIntangible/.test(cliVariants), {});

  /* ═══ v2.3.2224: the blue slime's death burst ═══
     Same whitelist trap as every other ability: a phase the server emits and
     the client has no branch for ships fully working and invisible -- and an
     invisible telegraph on a 60-damage blast is worse than no blast. */
  check('burst mirror: the client handles the burst ability',
    /payload\.ability === 'burst'/.test(src), {});
  check('burst mirror: ...both phases of it',
    /phase === 'swell'/.test(src) && /phase === 'execute'/.test(src), {});
  check('burst mirror: ...and the swell is drawn',
    /_burstUntil/.test(rend), {});
  /* v2.3.2227: the slime's own explosion (slime-death-v10) must play at the
     size it grew to.  Clearing the swell on detonation snapped the sprite
     back to 1x first, so the thing that blew up was not the thing that had
     filled the screen.  Both halves pinned: the stamp on detonation, and the
     renderer holding peak while the explosion is the frame being drawn.
     v2.3.2228: the hold moved INTO the death branches.  It first shipped
     after them, where the general swell multiplier lives -- but the
     dead-monster branch `continue`s long before that line, so a corpse never
     reached it.  Hence the second pin: the multiplier has to be applied above
     the `continue`, in the branch that draws the death frame.  A pin that
     only asked for the field would have passed on the unreachable version. */
  check('burst art: detonation hands the peak size to the death burst',
    /_burstPeakFrom = Date\.now\(\)/.test(src), {});
  const _deadBranch = rend.slice(rend.indexOf('if (!m.alive) {'), rend.indexOf('const emojiText = new Text('));
  check('burst art: ...and the renderer holds it INSIDE the death branch',
    /_peakK = m\._burstPeakFrom/.test(_deadBranch) && (_deadBranch.match(/\* _peakK/g) || []).length >= 2, {
      declared: /_peakK = m\._burstPeakFrom/.test(_deadBranch),
      applied: (_deadBranch.match(/\* _peakK/g) || []).length,
    });
  /* And the stamp must be cleared when the monster comes BACK, or its next,
     ordinary death replays the explosion at 3.5x. */
  check('burst art: ...and the peak stamp is dropped on respawn',
    /_spawnFxAt = now;[\s\S]{0,400}?m\._burstPeakFrom = 0;/.test(rend), {});
  check('burst mirror: the fuse rides the wire for resyncs (w.bu)',
    /w\.bu = m\._burstUntil/.test(tickSrc) && /md\.bu/.test(wsSrc), {});
  /* Every exploding variant must be a real variant, or the table silently
     matches nothing and the mechanic never fires. */
  const strayBurst = Object.keys(SRV_SLIME_BURST.VARIANTS)
    .filter((k) => !new RegExp('\\b' + k + ':').test(cliVariants));
  check('burst mirror: every exploding variant is a real one',
    strayBurst.length === 0, { strayBurst, declared: Object.keys(SRV_SLIME_BURST.VARIANTS) });
}

/* ═══ 21. v2.3.2238: THE FIRE GOBLIN'S FIRE TRAIL ═══
   The trail's own rules are pinned deterministically in
   server/test/firetrail.test.mjs.  What THAT suite cannot see is the four
   places this system can be perfectly correct and completely inert:

     - the client has no `fire_trail` case, so the fire is invisible while
       it burns (the whitelist trap that has now caught the telegraph kits,
       the basic wind-up, the burrow phases and the slime burst);
     - the renderer has no branch, same outcome one layer down;
     - _tickMonsters never calls the drop hook, so no patch is ever laid;
     - movement.js never replays the snapshot, so a player who walks into
       ember mid-chase burns on ground they cannot see.

   Each is a silent, shipping-green failure.  Hence four text pins. */
{
  const cliSrc = readFileSync(new URL('../../src/networking/gameEvents.js', import.meta.url), 'utf8');
  const cliRend = readFileSync(
    new URL('../../src/rendering/systems/effectsRenderer.js', import.meta.url), 'utf8');
  const srvTick = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  const srvMove = readFileSync(new URL('../src/movement.js', import.meta.url), 'utf8');

  check('firetrail mirror: the client handles the fire_trail event',
    /case 'fire_trail'/.test(cliSrc), {});
  check('firetrail mirror: ...and the renderer draws the patches',
    /S\._fireTrail/.test(cliRend), {});
  /* ═══ v2.3.2239: THE OWNER'S ART ═══
     Three ways the sheet can ship and do nothing, each pinned:
       - it is not in the fxStrips load loop, so it never preloads (and
         CLAUDE.md's animation-preloading law is broken silently);
       - the sprite is added to a layer ABOVE the player, which is the bug
         v2.3.2238 shipped: `particles` sits above `entities`/`player` in
         pixiApp's WORLD_LAYER_NAMES, so burning GROUND painted over the
         character standing on it;
       - the scale comes from the sprite instead of the scorch plate, which
         draws a lie about the radius the worker tests -- and this hazard
         persists, so a player learns its edge by walking it. */
  const cliFx = readFileSync(new URL('../../src/rendering/fxStrips.js', import.meta.url), 'utf8');
  check('firetrail art: the strip is in the fxStrips preload loop',
    /for \(const cfg of \[[^\]]*FIRE_TRAIL_FX[^\]]*\]\)/.test(cliFx), {});
  check('firetrail art: ...and fxStripsReady is what the manifest awaits',
    /export function fxStripsReady/.test(cliFx), {});
  check('firetrail art: the patch sprite goes on the layer BELOW the player',
    /this\.telegraphLayer\.addChild\(spr\)/.test(cliRend), {});
  check('firetrail art: the scale is taken from the scorch plate, not the sprite',
    /FIRE_TRAIL_PLATE_FRAC/.test(cliRend) && /FIRE_TRAIL_PLATE_FRAC/.test(cliFx), {});
  /* The procedural discs are the FALLBACK, not a leftover: a sheet that
     fails to load must degrade to a visible hazard, never to invisible
     ground that still burns you. */
  check('firetrail art: the procedural fallback is still there for a missing sheet',
    /FIRE_TRAIL_FX\.frames\.length === 8/.test(cliRend), {});
  check('firetrail mirror: _tickMonsters lays the trail',
    /this\._maybeDropFirePatch\(/.test(srvTick), {});
  check('firetrail mirror: ...and burns it once per zone per tick',
    /this\._tickFireTrail\(/.test(srvTick), {});
  check('firetrail mirror: an arriving player is shown the ground already alight',
    /this\._sendFireTrailSnapshot\(/.test(srvMove), {});
  /* Every fire-laying variant must be a real one, or the table matches
     nothing and the whole mechanic silently never fires -- the same check
     the burst table gets above, for the same reason. */
  const cliVars = readFileSync(
    new URL('../../src/data/monsterVariants.js', import.meta.url), 'utf8');
  const strayFire = Object.keys(SRV_FIRE_TRAIL.VARIANTS)
    .filter((k) => !new RegExp('\\b' + k + ':').test(cliVars));
  check('firetrail mirror: every fire-laying variant is a real one',
    strayFire.length === 0, { strayFire, declared: Object.keys(SRV_FIRE_TRAIL.VARIANTS) });
  /* v2.3.2238: and the local shield fallback must not eat a hit the worker
     already resolved -- fire has no direction to face away from, so an
     unguarded arc test would swallow every burn number.  Pinned because it
     is one `!_srvResolved` that a future edit to this handler could drop
     without anything else noticing. */
  check('firetrail mirror: the client\'s block fallback yields to a server-resolved hit',
    /S\._shieldUp && !_srvResolved && isAttackInShieldArc/.test(cliSrc), {});
}

/* ═══ 22. v2.3.2240: THE OWNER'S TEST PANEL ═══
   The dev kit's own rules are pinned in server/test/devtools.test.mjs and its
   reachability in tools/qa/mp/mp-devpanel.mjs.  What neither can see is the
   SECURITY posture drifting: this feature is safe only because every
   privileged action is an ADMIN_KEY-gated HTTP call and NOTHING is reachable
   over the websocket.  A future session adding a convenient `dev_warp`
   message would hand every client the zone gate, and no functional test
   would notice, because the feature would still work. */
{
  const devSrv = readFileSync(new URL('../src/devtools.js', import.meta.url), 'utf8');
  const idxSrv = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  const panel = readFileSync(new URL('../../src/ui/panels/DevPanel.jsx', import.meta.url), 'utf8');
  const header = readFileSync(new URL('../../src/ui/mobile/ZoneHeader.jsx', import.meta.url), 'utf8');
  const combatSrc = readFileSync(new URL('../src/combat.js', import.meta.url), 'utf8');

  check('devkit security: no dev_* websocket case exists in the worker',
    !/case 'dev[_a-z]*':/.test(idxSrv), {});
  check('devkit security: the panel opens no socket message of its own',
    !/channel\.send\(/.test(panel) && !/sendEvent\(/.test(panel), {});
  check('devkit security: every panel action goes through /api/admin',
    /\/api\/admin/.test(panel) && /Authorization/.test(panel), {});
  check('devkit security: the routes hang off the authenticated admin fetch',
    /_devFetch\(request, path, json\)/.test(readFileSync(new URL('../src/admin.js', import.meta.url), 'utf8')), {});
  /* God mode must stay in-memory and must stay bounded. */
  check('devkit: god mode is read from playerState in _applyDamage',
    /ps\._godUntil && Date\.now\(\) < ps\._godUntil/.test(combatSrc), {});
  check('devkit: god mode is capped so it cannot be left on forever',
    /GOD_MINUTES_MAX/.test(devSrv), {});
  /* The unlock must derive from the gate the game reads, not a second list. */
  check('devkit: the unlock derives from QUEST_ZONE_GATE itself',
    /QUEST_ZONE_GATE/.test(devSrv), {});
  /* The panel must remain reachable, and by the gesture the docs describe. */
  check('devkit: the long-press trigger is still wired to the zone title',
    /bt-zone-header__title/.test(header) && /onPointerDown=\{holdStart\}/.test(header), {});
  check('devkit: ...and the panel is still what it opens',
    /DevPanel\.jsx/.test(header), {});
}

// ── PROP BLOCKERS: the worker's copy must match the client's ──
/* v2.3.2652: props block attacks, which is the first rule the worker has ever
   had that needs to know where the scenery is.  server/src/props.js is a
   hand-copied mirror of worldProps.js for the usual reason (the worker bundle
   imports nothing from src/), and this is the guard that stops it drifting --
   the same treatment the spawn tables got after v2.3.1147.
   A drifted footprint does not crash: it silently blocks a shot the client
   claimed, or lets one through the client refused, which is invisible in play
   and infuriating to debug. */
{
  const cliZones = [...new Set(CLIENT_WORLD_PROPS.map((p) => p.zone))];
  const srvZones = Object.keys(SRV_ZONE_PROPS);
  check('props: the worker knows about the same zones the client places props in',
    cliZones.length === srvZones.length && cliZones.every((z) => srvZones.includes(z)),
    { cliZones, srvZones });

  for (const z of cliZones) {
    /* The client's own filter decides what is real: propsForZone applies the
       town mapV gate, and only props WITH a footprint block anything. Deriving
       the expectation from the same functions the game calls is the point --
       a list rebuilt by hand here would be a third copy to keep in sync. */
    const want = clientPropsForZone(z).filter((p) => clientPropFootprint(p))
      .map((p) => ({ id: p.id, x: p.x, y: p.y, blockW: p.blockW, blockD: p.blockD }))
      .sort((a, b) => (a.id < b.id ? -1 : 1));
    const got = (SRV_ZONE_PROPS[z] || [])
      .map((p) => ({ id: p.id, x: p.x, y: p.y, blockW: p.blockW, blockD: p.blockD }))
      .sort((a, b) => (a.id < b.id ? -1 : 1));
    check(`props: ${z} blockers match the client exactly`,
      JSON.stringify(want) === JSON.stringify(got), { want, got });
  }

  /* And the GEOMETRY agrees, not just the table. Two identical tables read by
     two different slab tests would still disagree, and the failure mode is the
     same invisible one. Sampled across the frost blockers rather than
     re-deriving the maths, which would only assert the test's own arithmetic. */
  {
    const probes = [
      ['frost', 430, 480, 430, 660, true],    /* straight through the rock ridge */
      ['frost', 430, 480, 430, 520, false],   /* stops short of it */
      ['frost', 100, 100, 200, 200, false],   /* open ice */
      ['frost', 720, 480, 720, 660, true],    /* through the east snowbank (v2.3.2894: the ice mound is gone) */
      ['frost', 575, 480, 575, 660, false],   /* v2.3.2894: through the gap between the banks */
      ['frost', 430, 550, 430, 700, false],   /* starts INSIDE the ridge: never blocks */
      /* Clean through the mayor's house: its box is x 774..1228, y 416..622,
         so both endpoints must sit OUTSIDE it or the inside-endpoint rule
         (correctly) declines to block. */
      ['town', 1001, 300, 1001, 700, true],
      ['town', 1001, 500, 1001, 700, false],  /* starts inside it: never blocks */
    ];
    let agree = true; const disagreements = [];
    for (const [z, x0, y0, x1, y1, expect] of probes) {
      const srv = srvAttackBlocked(z, x0, y0, x1, y1);
      const cli = clientAttackBlocked(z, x0, y0, x1, y1);
      if (srv !== cli || srv !== expect) {
        agree = false; disagreements.push({ z, x0, y0, x1, y1, expect, srv, cli });
      }
    }
    check('props: client and worker resolve the same lines the same way', agree, disagreements);
  }

  /* ═══ v2.3.2699: ...AND EVERY LINE, NOT SEVEN ═══
     The snowball's visual now stops where the CLIENT's attackBlockPoint says
     the worker's release->aim line meets a prop (gameEvents.js), on the claim
     that the two sides give the same answer by construction.  That claim is
     only as good as this audit, and seven hand-picked probes are seven places
     the two could agree while differing everywhere else -- an off-by-one on a
     box edge, an inclusive/exclusive slip on the inside-endpoint rule.  If they
     ever disagree, a player takes a hit from a ball they watched burst on a
     rock (or the reverse), which is the exact bug being fixed.

     So: thousands of seeded random lines per zone, over the props' own extent
     plus a margin so lines start and end on every side of every box.  Seeded
     (mulberry32) so a failure reproduces, and the guard below makes sure the
     sample actually contains blocked lines -- a sweep that only ever drew clear
     lines would agree perfectly and prove nothing. */
  {
    let seed = 0x2699;
    const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const N = 4000;
    let blocked = 0, clear = 0; const bad = [];
    for (const z of Object.keys(SRV_ZONE_PROPS)) {
      const ps = SRV_ZONE_PROPS[z] || [];
      if (!ps.length) continue;
      const xs = ps.map((p) => p.x), ys = ps.map((p) => p.y);
      const x0 = Math.min(...xs) - 300, x1 = Math.max(...xs) + 300;
      const y0 = Math.min(...ys) - 300, y1 = Math.max(...ys) + 300;
      for (let i = 0; i < N; i++) {
        const a = [x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0)];
        const b = [x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0)];
        const srv = srvAttackBlocked(z, a[0], a[1], b[0], b[1]);
        const cli = clientAttackBlocked(z, a[0], a[1], b[0], b[1]);
        if (srv) blocked++; else clear++;
        if (srv !== cli && bad.length < 5) bad.push({ z, a, b, srv, cli });
      }
    }
    check('props: client and worker agree on every one of thousands of random lines', bad.length === 0, bad);
    check('props: ...and the sample holds both outcomes, so the agreement means something (guard)',
      blocked > 100 && clear > 100, { blocked, clear });
  }
}

// ── SMELTING: the forge's rows must promise what the worker settles ──
// v2.3.2822.  The Smelting rows draw cost and XP from the client copy; the
// worker settles from its own.  A drift here is a row that says "5 ore, +400
// XP" while the worker takes 6 and pays 300.
{
  const keys = (o) => Object.keys(o).sort().join(',');
  check('smelting: same bars on both sides', keys(SRV_SMELT.RECIPES) === keys(CLIENT_SMELT),
    { srv: keys(SRV_SMELT.RECIPES), cli: keys(CLIENT_SMELT) });
  for (const k of Object.keys(SRV_SMELT.RECIPES)) {
    const a = SRV_SMELT.RECIPES[k], b = CLIENT_SMELT[k] || {};
    check('smelting: ' + k + ' ore / cost / level / xp match',
      a.ore === b.ore && a.oreCost === b.oreCost && a.minLvl === b.minLvl && a.xp === b.xp, { srv: a, cli: b });
  }
}

// ── THE FARM: the Feed & Seed window must promise what the worker settles ──
// v2.3.3127.  The window draws a seed's price, its time (dry and watered),
// its yield (plain and fertilized), its XP and its level lock from the client
// copy; the worker plants, ripens and pays from its own.  A drift here is a
// bed that says "6m" while the worker waits 8, or a Buy button that charges
// one price and shows another.
{
  const keys = (o) => Object.keys(o).sort().join(',');
  check('farm: same crops on both sides', keys(SRV_FARM.CROPS) === keys(CLIENT_FARM.CROPS),
    { srv: keys(SRV_FARM.CROPS), cli: keys(CLIENT_FARM.CROPS) });
  check('farm: the window lists every crop once', CLIENT_FARM_ORDER.slice().sort().join(',') === keys(SRV_FARM.CROPS), CLIENT_FARM_ORDER);
  /* v2.3.3131: and in the SAME ORDER they came -- caps.farmCrops is a count
     of the worker's crops in that order, and the window counts its own. */
  check('farm: the crops come in the same order on both sides (caps.farmCrops counts them)',
    Object.keys(SRV_FARM.CROPS).join(',') === Object.keys(CLIENT_FARM.CROPS).join(','),
    { srv: Object.keys(SRV_FARM.CROPS), cli: Object.keys(CLIENT_FARM.CROPS) });
  for (const k of ['FREE_BEDS', 'MAX_BEDS', 'WATER_TIME', 'FEED_YIELD', 'COMPOST', 'COMPOST_PRICE', 'BUY_MAX']) {
    check('farm: ' + k + ' matches', SRV_FARM[k] === CLIENT_FARM[k], { srv: SRV_FARM[k], cli: CLIENT_FARM[k] });
  }
  for (const id of Object.keys(SRV_FARM.CROPS)) {
    const a = SRV_FARM.CROPS[id], b = CLIENT_FARM.CROPS[id] || {};
    const same = ['name', 'seed', 'item', 'lvl', 'price', 'mins', 'yield', 'xp', 'base'].every((f) => a[f] === b[f]);
    check('farm: ' + id + ' seed / item / level / price / time / yield / XP / value match', same, { srv: a, cli: b });
    check('farm: ' + id + ' grows as long on both sides, dry and watered',
      srvFarmGrowMs(a, false) === clientFarmGrowMs(b, false) && srvFarmGrowMs(a, true) === clientFarmGrowMs(b, true));
    /* v2.3.3131: fertilized, the worker pays its lowest or its highest (a
       potato's 4.5 is 4 or 5), and the window shows exactly that -- the one
       number when they agree, "4–5" when they do not. */
    const lo = srvFarmYield(a, true, () => 0.999), hi = srvFarmYield(a, true, () => 0);
    check('farm: ' + id + ' pays what the window says, plain and fertilized',
      srvFarmYield(a, false) === clientFarmYieldShown(b, false)
      && String(clientFarmYieldShown(b, true)) === (lo === hi ? String(lo) : lo + '\u2013' + hi),
      { plain: [srvFarmYield(a, false), clientFarmYieldShown(b, false)], fed: [lo, hi, clientFarmYieldShown(b, true)] });
  }
}

// ── v2.3.3092: THE ARMOR FORGE -- the Armor tab's rows are the worker's ──
// A recipe the client draws with a different cost, level or metal is a row
// that lies: "Forge" lit and refused, or a plate promised in copper and
// minted in iron.  Every field, both ways, and every recipe's bar a bar the
// smelter makes.
{
  const keys = (o) => Object.keys(o).sort().join(',');
  check('armor forge: the same recipes on both sides', keys(SRV_ARMOR_FORGE.RECIPES) === keys(CLIENT_ARMOR_FORGE),
    { srv: keys(SRV_ARMOR_FORGE.RECIPES), cli: keys(CLIENT_ARMOR_FORGE) });
  const F = ['bar', 'bars', 'slot', 'mat', 'tierMult', 'minLvl', 'xp', 'name'];
  const off = [];
  for (const k of Object.keys(SRV_ARMOR_FORGE.RECIPES)) {
    const a = SRV_ARMOR_FORGE.RECIPES[k], b = CLIENT_ARMOR_FORGE[k] || {};
    for (const f of F) if (a[f] !== b[f]) off.push({ k, f, srv: a[f], cli: b[f] });
  }
  check('armor forge: every field of every recipe matches', off.length === 0, off);
  check('armor forge: every recipe is forged from a bar the smelter makes',
    Object.values(SRV_ARMOR_FORGE.RECIPES).every((r) => Object.prototype.hasOwnProperty.call(SRV_SMELT.RECIPES, r.bar)),
    Object.values(SRV_ARMOR_FORGE.RECIPES).map((r) => r.bar));
  check('armor forge: a metal\'s armor opens no earlier than its bar',
    Object.values(SRV_ARMOR_FORGE.RECIPES).every((r) => r.minLvl >= SRV_SMELT.RECIPES[r.bar].minLvl));
}

// ── GATHERING HITS: one hit per swing, on the blow ──
// v2.3.2956.  The worker validates a harvest against (hits - 1) swings of
// GATHER_HITS.MS; the client plays the hits on GATHER_SWING's blow instants.
// Three things have to agree, and only the first two are tables:
//   1. the worker's swing length and the client's, per skill;
//   2. the node HP the client draws and the HP the worker rolls against;
//   3. the ART -- GATHER_SWING copies the pose loop lengths and the blow
//      frames out of the renderers, which own them.  Those are read as TEXT
//      (the renderers import Pixi, which this suite cannot load), so a retimed
//      swing fails here, naming the constant to move with it, instead of
//      quietly sliding every number off the blow it was meant to land on.
{
  const room = new GameRoom({ storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
    getWebSockets: () => [], acceptWebSocket: () => {} }, { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } });
  const keys = (o) => Object.keys(o).sort().join(',');
  check('gather hits: the worker and the client know the same hit skills', keys(SRV_GATHER_HITS.MS) === keys(CLIENT_GATHER_SWING),
    { srv: keys(SRV_GATHER_HITS.MS), cli: keys(CLIENT_GATHER_SWING) });
  for (const k of Object.keys(SRV_GATHER_HITS.MS)) {
    check('gather hits: ' + k + ' swings at the same pace on both sides',
      SRV_GATHER_HITS.MS[k] === (CLIENT_GATHER_SWING[k] || {}).ms, { srv: SRV_GATHER_HITS.MS[k], cli: CLIENT_GATHER_SWING[k] });
  }
  check('gather hits: node HP agrees at every tier the tables define',
    [1, 6, 11, 21, 51, 96].every((t) => room._gatherNodeHp(t) === clientGatherNodeHp(t)),
    [1, 6, 11, 21, 51, 96].map((t) => [t, room._gatherNodeHp(t), clientGatherNodeHp(t)]));
  const times = clientGatherHitTimes('mining', 1000000, 4);
  check('gather hits: the client schedules hits one swing apart, on the blow, after the lead',
    times.length === 4 && times.every((t, i) => i === 0 || t - times[i - 1] === 650)
      && ((times[0] % 650) + 650) % 650 === 186 && times[0] >= 1000000 + 90 && times[0] < 1000000 + 90 + 650, times);
  /* v2.3.3036: the worker's speed bounds (gathering.js HARVEST_PERFECT_PER_MIN,
     cooking.js COOK_PER_MIN, botfp's hour caps) are derived from the fastest
     an honest client can come round -- its hit lead, its settle and its
     gesture's floor of real motion.  A shorter gesture on the client with the
     worker's copy left behind would have them fire on real players. */
  check('gather hits: the worker\'s honest cycle is the client\'s (GATHER_HIT_LEAD_MS, GATHER_HIT_SETTLE_MS, gesturePose GESTURE_FLOOR_MS)',
    SRV_HONEST_CYCLE.LEAD_MS === CLIENT_GATHER_HIT_LEAD_MS && SRV_HONEST_CYCLE.SETTLE_MS === CLIENT_GATHER_HIT_SETTLE_MS
      && SRV_HONEST_CYCLE.GESTURE_FLOOR_MS === CLIENT_GESTURE_FLOOR_MS,
    { srv: SRV_HONEST_CYCLE, cli: { lead: CLIENT_GATHER_HIT_LEAD_MS, settle: CLIENT_GATHER_HIT_SETTLE_MS, floor: CLIENT_GESTURE_FLOOR_MS } });

  const sprites = readFileSync(new URL('../../src/rendering/playerSprites.js', import.meta.url), 'utf8');
  const fx = readFileSync(new URL('../../src/rendering/systems/effectsRenderer.js', import.meta.url), 'utf8');
  const ent = readFileSync(new URL('../../src/rendering/systems/entityRenderer.js', import.meta.url), 'utf8');
  const pixi = readFileSync(new URL('../../src/rendering/pixiRenderer.js', import.meta.url), 'utf8');
  check('gather hits: the pick\'s loop is still 650 ms (playerSprites MINE_DURATION_MS = GATHER_SWING.mining.ms)',
    /const MINE_DURATION_MS = 650;/.test(sprites) && CLIENT_GATHER_SWING.mining.ms === 650);
  check('gather hits: the pick still lands entering frame 4 of 14 (GATHER_SWING.mining.blowAt = 4/14 of the loop)',
    /_crossedFrame\(_mL, _mk, 4\)/.test(fx) && CLIENT_GATHER_SWING.mining.blowAt === Math.round(4 / 14 * 650));
  check('gather hits: the chop is still 12 frames of 45 ms (GATHER_SWING.woodcutting.ms)',
    /const CHOP_FRAME_MS = 45;/.test(fx) && /const CHOP_BASE = 12, CHOP_COUNT = 12;/.test(fx) && CLIENT_GATHER_SWING.woodcutting.ms === 12 * 45);
  check('gather hits: the axe still bites on frame 9 with its sound 200 ms later (GATHER_SWING.woodcutting.blowAt)',
    /const CHOP_STRIKE_K = 9;/.test(fx) && /const _chopLead = ex\.status === 'ready' \? 0 : 200;/.test(fx)
      && CLIENT_GATHER_SWING.woodcutting.blowAt === (9 * 45 + 200) % 540);
  /* v2.3.2956: a cook's hits have no blow to land on -- the pan's grease
     pops ON them instead, and keeps the beat it had on the timer. */
  check('gather hits: a cook\'s grease pops on its hits, at the pan\'s own wind-up beat (GATHER_SWING.cooking.ms)',
    /const _greaseGap = ex\.status === 'ready' \? 380 : 650;/.test(fx) && CLIENT_GATHER_SWING.cooking.ms === 650
      && /if \(_gh\.shown > \(ex\._greaseHit \|\| 0\)\) \{ ex\._greaseHit = _gh\.shown; _greaseNow = true; \}/.test(fx));
  const lsr = readFileSync(new URL('../../src/game/lifeSkillRewards.js', import.meta.url), 'utf8');
  const holdR = /export const SELF_DEATH_HOLD_MS = (\d+);/.exec(ent);
  const holdG = /var GATHER_DEATH_HOLD_MS = (\d+);/.exec(lsr);
  check('gather hits: no hits over a corpse for exactly the hold selfCorpseUp uses (GATHER_DEATH_HOLD_MS = SELF_DEATH_HOLD_MS)',
    !!holdR && !!holdG && holdR[1] === holdG[1], { renderer: holdR && holdR[1], hits: holdG && holdG[1] });
  check('gather hits: both wind-up loops still run free on the frame clock, which is Date.now()',
    /: Math\.floor\(now \/ CHOP_FRAME_MS\) % CHOP_COUNT;/.test(fx)
      && /: Math\.floor\(\(now \/ cycle\) \* fc\) % fc;/.test(ent)
      && /: Math\.floor\(\(now \/ jogCycleMs\('mine', 'south'\)\) \* _mfc\) % _mfc;/.test(fx)
      && /const now = Date\.now\(\);/.test(pixi));
}

// ── v2.3.2996: a monster's hit carries its element (server monsterstatus.js,
// client game/elemHits.js).  The worker names the status and its length on
// the wire, so only three things have to agree by hand: the chill's walk
// (the worker's copy is documentation -- the client's is the one that moves
// you), the status names the client knows how to carry out, and an icon for
// every element the worker names -- each file actually in public/.
{
  check('elem hits: the chill walks you at the same pace on both sides (CHILL.MULT = CHILL_MULT)',
    SRV_CHILL.MULT === CLIENT_CHILL_MULT, { srv: SRV_CHILL.MULT, cli: CLIENT_CHILL_MULT });
  const srvSt = Object.values(SRV_ELEM_HITS).sort().join(','), cliSt = CLIENT_ELEM_STATUSES.slice().sort().join(',');
  check('elem hits: the client carries out every status the worker sends, and only those', srvSt === cliSt, { srv: srvSt, cli: cliSt });
  check('elem hits: every element the worker names has a look on the client',
    Object.keys(SRV_ELEM_HITS).every((e) => Object.prototype.hasOwnProperty.call(CLIENT_ELEM_LOOK, e)
      && Object.prototype.hasOwnProperty.call(CLIENT_ELEM_ICON_SRC, CLIENT_ELEM_LOOK[e].icon)),
    { srv: Object.keys(SRV_ELEM_HITS), cli: Object.keys(CLIENT_ELEM_LOOK) });
  const pubDir = fileURLToPath(new URL('../../public/', import.meta.url));
  const missing = Object.values(CLIENT_ELEM_ICON_SRC).filter((u) => { try { readFileSync(join(pubDir, u.replace(/^\//, ''))); return false; } catch (e) { return true; } });
  check('elem hits: every element icon is in public/', missing.length === 0, missing);
}

// ── v2.3.3006: the sprint (server sprint.js, client game/sprint.js).  The
// worker bills the stamina and widens its bound; the client moves you and
// predicts the bar between echoes.  Off by one number and either the bound
// rubber-bands every sprint (client faster than the worker allows) or the
// bar the client draws runs out at a different moment from the worker's.
{
  check('sprint: the same speed on both sides (SPRINT.MULT = SPRINT_MULT)',
    SRV_SPRINT.MULT === CLIENT_SPRINT_MULT, { srv: SRV_SPRINT.MULT, cli: CLIENT_SPRINT_MULT });
  check('sprint: the same drain on both sides (SPRINT.DRAIN_PER_S = SPRINT_DRAIN_PER_S)',
    SRV_SPRINT.DRAIN_PER_S === CLIENT_SPRINT_DRAIN, { srv: SRV_SPRINT.DRAIN_PER_S, cli: CLIENT_SPRINT_DRAIN });
  check('sprint: the same stamina to start one (SPRINT.MIN_START = SPRINT_MIN_START)',
    SRV_SPRINT.MIN_START === CLIENT_SPRINT_MIN_START, { srv: SRV_SPRINT.MIN_START, cli: CLIENT_SPRINT_MIN_START });
  check('sprint: the regen is held off for as long on both sides (REGEN_PAUSE_MS)',
    SRV_SPRINT.REGEN_PAUSE_MS === CLIENT_SPRINT_REGEN_PAUSE, { srv: SRV_SPRINT.REGEN_PAUSE_MS, cli: CLIENT_SPRINT_REGEN_PAUSE });
}

// ── v2.3.3089: the levels on Brotown's signposts (client
// data/wheelSignposts.js WHEEL_LAND_LEVELS) are the levels the worker's
// monsters span in every land: the first stretch to the deepest one baked
// into wheelspawns.js.  A stretch that takes the lands past level 20 must move
// the plates too, or every signpost undersells the road.
{
  const homes = Object.keys(SRV_WHEEL_SPAWNS);
  const tops = homes.map((h) => Math.max(5, ...((SRV_WHEEL_SPAWNS[h].deeper || []).map((st) => Number(st.levels && st.levels[1]) || 0))));
  check('signposts: every land\'s monsters reach the same top level', homes.length === 8 && new Set(tops).size === 1, { homes, tops });
  check('signposts: the plates\' levels are the worker\'s, first stretch to deepest (WHEEL_LAND_LEVELS)',
    CLIENT_WHEEL_LAND_LEVELS[0] === 1 && CLIENT_WHEEL_LAND_LEVELS[1] === tops[0], { cli: CLIENT_WHEEL_LAND_LEVELS, srv: [1, tops[0]] });
}

// ── v2.3.3016: the Wheel's dungeons (server wheeldungeon.js, client
// data/wheelDungeons.js).  The client offers a mouth only for a land the
// worker opens -- one more on the client is a button the worker refuses, one
// fewer a dungeon nobody can reach -- and offers it nearer than the worker's
// own reach, so a tap at the button's edge is never refused for drift.
{
  check('wheel dungeons: the same lands on both sides (WHEEL_DUNGEON.LANDS = WHEEL_DUNGEON_HOMES)',
    JSON.stringify(Object.keys(SRV_WHEEL_DUNGEON.LANDS).sort()) === JSON.stringify(CLIENT_WHEEL_DUNGEON_HOMES.slice().sort()),
    { srv: Object.keys(SRV_WHEEL_DUNGEON.LANDS), cli: CLIENT_WHEEL_DUNGEON_HOMES });
  check('wheel dungeons: the button comes up nearer than the worker\'s reach (DOOR_R < WHEEL_DUNGEON.DOOR_R)',
    CLIENT_DOOR_R + 40 <= SRV_WHEEL_DUNGEON.DOOR_R, { cli: CLIENT_DOOR_R, srv: SRV_WHEEL_DUNGEON.DOOR_R });
  check('wheel dungeons: every land opened has a mouth\'s light', CLIENT_WHEEL_DUNGEON_HOMES.every((h) => !!CLIENT_WHEEL_DOOR_LOOK[h]));
  /* ...and a floor, a ground picture of its land that is in the game */
  check('wheel dungeons: every land opened has a floor, one of its own ground pictures, in the game',
    CLIENT_WHEEL_DUNGEON_HOMES.every((h) => {
      const f = CLIENT_WHEEL_DUNGEON_FLOOR[h];
      return !!f && typeof f.pic === 'string' && f.pic.indexOf(h + '-') === 0
        && existsSync(new URL('../../public/world/ground/' + f.pic + '-A.png', import.meta.url));
    }), CLIENT_WHEEL_DUNGEON_FLOOR);
  /* the arena the client lays out is the one the worker places monsters in */
  check('wheel dungeons: the arena\'s size (WHEEL_ARENA = WHEEL_DUNGEON.WIDTH x HEIGHT)',
    CLIENT_WHEEL_ARENA.W === SRV_WHEEL_DUNGEON.WIDTH && CLIENT_WHEEL_ARENA.H === SRV_WHEEL_DUNGEON.HEIGHT,
    { cli: CLIENT_WHEEL_ARENA, srv: { W: SRV_WHEEL_DUNGEON.WIDTH, H: SRV_WHEEL_DUNGEON.HEIGHT } });
}

// ── v2.3.3138: A NEW CHARACTER IS THE CLIENT'S OWN ──
// The first join no longer takes the character from the join payload: a
// character with no record starts from the worker's defaults (join.js).
// Those must BE the client's new character, or a new player's purse and
// skills jump on the first echo.  Every other field defaults to zero or
// empty on both sides; these two are not.
{
  const cliRpg = clientDefaultRpg();
  check('new character: the worker\'s starting purse is the client\'s (' + cliRpg.coins + ')',
    SRV_NEW_CHARACTER_COINS === cliRpg.coins, { srv: SRV_NEW_CHARACTER_COINS, cli: cliRpg.coins });
  check('new character: the worker\'s life skills are the client\'s createDefaultLifeSkills, field for field and in order',
    JSON.stringify(srvFreshLifeSkills()) === JSON.stringify(clientDefaultLifeSkills()),
    { srv: srvFreshLifeSkills(), cli: clientDefaultLifeSkills() });
  check('new character: ...and the client\'s new character holds no weapon, armour or shield (the worker gives none)',
    cliRpg.weapon === null && cliRpg.rangedWeapon === null && cliRpg.staffWeapon === null && cliRpg.armor === null && cliRpg.shield === null && cliRpg.level === 1 && cliRpg.xp === 0,
    { w: cliRpg.weapon, a: cliRpg.armor, s: cliRpg.shield, level: cliRpg.level });
}

// ── LIFE-SKILL LEVELS: the banner says the level the worker makes ──
// v2.3.3041.  The client predicts a harvest's level-up (awardSkillXp) and
// fires the banner from it; the worker's _addLifeSkillXp is the truth.  They
// disagreed from level 0 (463 XP to 1 here, 500 to 2 there), so the banner
// said "Level 1" for a level the worker made 2.  Same arithmetic, every start.
{
  const room = Object.create(GameRoom.prototype);
  let bad = null;
  for (const start of [0, 1, 2, 5, 19]) {
    for (const xp of [1, 100, 463, 499, 500, 540, 1000, 2254, 9999]) {
      const cli = { s: { level: start, xp: 0 } };
      clientAwardSkillXp(cli, 's', xp);
      const ps = { lifeSkills: { s: { level: start, xp: 0 } } };
      room._addLifeSkillXp(ps, 's', xp);
      if (cli.s.level !== ps.lifeSkills.s.level || cli.s.xp !== ps.lifeSkills.s.xp) { bad = { start, xp, cli: cli.s, srv: ps.lifeSkills.s }; break; }
    }
    if (bad) break;
  }
  check('life-skill levels: the client\'s predicted level-up is the worker\'s, from every start level (0 included)', bad === null, bad);
  const d = clientDefaultLifeSkills();
  check('life-skill levels: a new character\'s skills start at level 1, never 0',
    ['woodcutting', 'fishing', 'mining', 'cooking', 'blacksmithing', 'woodworking', 'gemCutting', 'enchanting', 'farming', 'trapping'].every((k) => d[k] && d[k].level === 1), d);
  const old = clientMigrateLifeSkills({ mining: { level: 0, xp: 300 }, fishing: { level: 3, xp: 10 } });
  check('life-skill levels: a stored 0 heals to 1 (XP kept), a real level is left alone', old.mining.level === 1 && old.mining.xp === 300 && old.fishing.level === 3, { mining: old.mining, fishing: old.fishing });
}

// ── v2.3.3090: LIFE SKILLS LEVEL HALF AS FAST, on both sides ──
// The owner's "Yes" to slower life skills doubled what every level costs (the
// curve's base 500 -> 1000).  The worker's _lifeSkillXpThreshold decides the
// level; the client's two copies of the curve draw the bar (skillXpRequired,
// LIFE_SKILL_XP) and predict the level-up banner.  One base, every level.
{
  const room = Object.create(GameRoom.prototype);
  check('life-skill curve: the same base on both sides (LIFE_SKILL_XP_BASE)', SRV_LIFE_SKILL_XP_BASE === CLIENT_LIFE_SKILL_XP_BASE,
    { srv: SRV_LIFE_SKILL_XP_BASE, cli: CLIENT_LIFE_SKILL_XP_BASE });
  let off = null;
  for (let L = 1; L <= 100; L++) {
    const srv = room._lifeSkillXpThreshold(L);
    if (srv !== clientSkillXpRequired(L) || srv !== CLIENT_LIFE_SKILL_XP(L)) { off = { L, srv, items: clientSkillXpRequired(L), lifeSkills: CLIENT_LIFE_SKILL_XP(L) }; break; }
  }
  check('life-skill curve: every level 1-100 costs the same on the worker and in both client copies', off === null, off);
  /* the owner's decision, pinned: a level costs twice what it did */
  check('life-skill curve: twice the old price -- 1,000 XP for level 2, 1,080 for 3',
    room._lifeSkillXpThreshold(1) === 1000 && room._lifeSkillXpThreshold(2) === 1080, [room._lifeSkillXpThreshold(1), room._lifeSkillXpThreshold(2)]);
}

// ── GATHER LEVELS: the level over a node is the level the worker asks ──
// v2.3.3038.  The client refuses ("Need Mining Lv 5") and draws the level
// from its copy; the worker refuses extraction_start and node_strike from its
// own.  A drift is a node that says Lv 5 and is refused at 5, or a refusal the
// client never warned of.
{
  const flat = (t) => JSON.stringify(Object.keys(t).sort().map((k) => [k, Object.keys(t[k]).sort().map((l) => [l, t[k][l]])]));
  check('gather levels: the same table on both sides (GATHER_REQ_LVL)', flat(SRV_GATHER_REQ_LVL) === flat(CLIENT_GATHER_REQ_LVL),
    { srv: SRV_GATHER_REQ_LVL, cli: CLIENT_GATHER_REQ_LVL });
  let bad = null;
  for (const t of ['oreVein', 'tree', 'fishSpot', 'campfire', '__proto__', 'constructor']) {
    for (const l of [0, 1, 6, 11, 16, 99, '6', null, '__proto__']) {
      if (srvGatherReqLvl(t, l) !== clientGatherReqLvl(t, l)) { bad = { t, l, srv: srvGatherReqLvl(t, l), cli: clientGatherReqLvl(t, l) }; break; }
    }
    if (bad) break;
  }
  check('gather levels: and the same answer for every type and tier, forged ones included', bad === null, bad);
  /* the owner's named cells, so a "tidy-up" of the table can't quietly move them */
  check('gather levels: black steel Mining 5, copper and iron 1, clownfish Fishing 5',
    clientGatherReqLvl('oreVein', 11) === 5 && clientGatherReqLvl('oreVein', 1) === 1 && clientGatherReqLvl('oreVein', 6) === 1
    && clientGatherReqLvl('fishSpot', 6) === 5);
}

// v2.3.3091: this block sat AFTER the process.exit below (a merge put it
// there), so its three checks never ran -- moved back above it.
// ── v2.3.3058: No man's land's rings (server nomansland.js, client
// game/noMansLand.js).  The banner, the top bar and the tap's aim are the
// game's; every hit is the worker's -- one ring apart, and a player standing
// on the line would be told they are safe while they are being hit.
{
  const keys = ['HUB', 'TIER', 'TIERS', 'LEVELS_PER_TIER', 'FIRST_TIER', 'SKULL_MS'];
  const bad = keys.filter((k) => SRV_NML[k] !== CLIENT_NML[k]);
  check('no man\'s land: the same rings and skull time on both sides', bad.length === 0, bad);
  check('no man\'s land: the same centre (WHEEL_CENTRE)', CLIENT_NML_CENTRE[0] === SRV_WHEEL_CENTRE[0] && CLIENT_NML_CENTRE[1] === SRV_WHEEL_CENTRE[1], { cli: CLIENT_NML_CENTRE, srv: SRV_WHEEL_CENTRE });
  const off = [];
  for (let r = 0; r < 20000; r += 97) {
    const x = SRV_WHEEL_CENTRE[0] + r, y = SRV_WHEEL_CENTRE[1] + r * 0.3;
    if (srvNmlLevelAt('wheel', x, y) !== clientNmlLevelAt('wheel', x, y)) off.push({ r, srv: srvNmlLevelAt('wheel', x, y), cli: clientNmlLevelAt('wheel', x, y) });
  }
  check('no man\'s land: the same level at every spot out to the gates', off.length === 0, off.slice(0, 4));
}

// ── v2.3.3120: PET TRAPPING (server trapping.js / petbook.js, client
// src/data/trapping.js).  The TRAP button shows the odds and greys itself
// out from the client's copy, the Traps tab lists the logs, the Pets page
// refuses a name before sending it; the worker decides all of it.  A drift
// is a button promising 1% while the worker rolls 0.8%, or a name the page
// sends and the worker refuses. ──
{
  const keys = (o) => Object.keys(o).sort().join(',');
  const off = Object.keys(SRV_TRAPPING).filter((k) => k !== 'ARMS_PER_MIN' && k !== 'CATCH_PER_HOUR'
    && JSON.stringify(SRV_TRAPPING[k]) !== JSON.stringify(CLIENT_TRAPPING[k]));
  check('trapping: every number the phone shows is the worker\'s (odds, mark, range, recipe, XP)', off.length === 0,
    off.map((k) => ({ k, srv: SRV_TRAPPING[k], cli: CLIENT_TRAPPING[k] })));
  const bad = [];
  for (let T = 1; T <= 60 && bad.length < 5; T++) {
    for (let M = 1; M <= 45; M++) {
      if (srvTrapChance(T, M) !== clientTrapChance(T, M)) bad.push({ T, M, srv: srvTrapChance(T, M), cli: clientTrapChance(T, M) });
      const s = Math.ceil(M / 5);
      if (srvTrapRollXp(s, T - M) !== clientTrapRollXp(s, T - M)) bad.push({ T, M, xp: true });
    }
  }
  for (let s = 1; s <= 10; s++) if (srvTrapCatchXp(s) !== clientTrapCatchXp(s)) bad.push({ s, catchXp: true });
  check('trapping: the same chance and XP at every Trapping x monster level to 60 x 45', bad.length === 0, bad);
  check('trapping: the owner\'s numbers -- 1% best, x0.8 a stretch, half on unlocking',
    clientTrapChance(21, 1) === 0.01 && clientTrapChance(1, 1) === 0.005 && clientTrapChance(5, 6) === 0);
  check('pets: the same nine kinds on both sides', keys(SRV_PET_KINDS) === keys(CLIENT_PET_KINDS),
    { srv: keys(SRV_PET_KINDS), cli: keys(CLIENT_PET_KINDS) });
  const kindOff = Object.keys(SRV_PET_KINDS).filter((k) => !CLIENT_PET_KINDS[k]
    || SRV_PET_KINDS[k].home !== CLIENT_PET_KINDS[k].home || SRV_PET_KINDS[k].look !== CLIENT_PET_KINDS[k].look);
  check('pets: each kind\'s land and look match', kindOff.length === 0, kindOff);
  const looks = [];
  for (const home of ['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant']) {
    for (const v of [null, 'fireGoblin', 'mummy', 'mireWisp', 'bogLurker', 'blueSlime', 'skeleton']) {
      for (const arch of ['fodder', 'brute', 'snowman', 'stalker']) looks.push({ home, variant: v, arch });
    }
  }
  const kOff = looks.filter((m) => srvPetKindOf({ home: m.home, spawnVariant: m.variant, arch: m.arch }) !== clientPetKindOf({ home: m.home, variant: m.variant, archetype: m.arch }));
  check('pets: the phone names the kind a monster becomes exactly as the worker does', kOff.length === 0, kOff.slice(0, 4));
  check('pets: the Big badge starts where the worker\'s does', CLIENT_PET_BIG_AT === SRV_PETBOOK.BIG_AT);
  check('pets: the name rule\'s limits match', SRV_PET_NAME.MIN === CLIENT_PET_NAME.MIN && SRV_PET_NAME.MAX === CLIENT_PET_NAME.MAX);
  const names = ['Rex', '  Mr  Fluffy ', 'x', 'ab', 'A name far too long!!', '🔥Blaze', 'Zoë', "O'Neil-2", '--', 'Zap‍', 'ポチ',
    'a'.repeat(16), 'a'.repeat(17), 'Tab\there', 'éclair', '', null, 42, '__proto__', '<b>hi</b>'];
  const nOff = names.filter((n) => srvCleanPetName(n) !== clientCleanPetName(n));
  check('pets: the same names allowed and refused, cleaned the same way', nOff.length === 0, nOff.map((n) => [n, srvCleanPetName(n), clientCleanPetName(n)]));
  /* every refusal the worker can send has words on the phone */
  const codes = ['off', 'not-now', 'not-here', 'no-monster', 'safe-ground', 'too-far', 'level', 'no-trap', 'pets-unavailable',
    'pets-full', 'catch-cap', 'too-fast', 'share', 'bad-log', 'no-logs', 'no-pet', 'bad-name', 'confirm'];
  check('trapping: every refusal the worker sends has words on the phone', codes.every((c) => typeof CLIENT_TRAP_WORDS[c] === 'string' && CLIENT_TRAP_WORDS[c].length > 0),
    codes.filter((c) => !CLIENT_TRAP_WORDS[c]));
  /* v2.3.3121: pet XP -- the bar the phone draws is the worker's rule */
  check('pets: the same XP share and curve (a tenth of the kill, 25 at Lv 1, x1.08)',
    CLIENT_PET_XP.SHARE === SRV_PETBOOK.XP_SHARE && CLIENT_PET_XP.BASE === SRV_PETBOOK.XP_BASE && CLIENT_PET_XP.GROWTH === SRV_PETBOOK.XP_GROWTH,
    { client: CLIENT_PET_XP, server: { SHARE: SRV_PETBOOK.XP_SHARE, BASE: SRV_PETBOOK.XP_BASE, GROWTH: SRV_PETBOOK.XP_GROWTH } });
  const xpOff = [];
  for (let lv = 1; lv <= 120; lv++) if (srvPetXpToNext(lv) !== clientPetXpToNext(lv)) xpOff.push(lv);
  for (const [lv, xp, gain, cap] of [[1, 0, 24, 10], [1, 0, 25, 10], [1, 20, 500, 10], [4, 3, 9999, 6], [6, 0, 50, 6], [9, 7, 3, 5], [1, 0, 0, 1], [2, 1, 1e6, 99]]) {
    if (JSON.stringify(srvPetGainXp(lv, xp, gain, cap)) !== JSON.stringify(clientPetGainXp(lv, xp, gain, cap))) xpOff.push([lv, xp, gain, cap]);
  }
  check('pets: the same XP to the next level at every level to 120, and the same levelling to the Trapping cap', xpOff.length === 0, xpOff);
  /* v2.3.3122: the trade window's pet limit the phone shows is the worker's */
  check('pets: the same pets-a-trade limit (PETBOOK.TRADE_MAX)', CLIENT_PET_TRADE_MAX === SRV_PETBOOK.TRADE_MAX, { client: CLIENT_PET_TRADE_MAX, server: SRV_PETBOOK.TRADE_MAX });
  /* ...and every refusal of a pet changing hands has words on the phone */
  const tradeCodes = ['legacy', 'active', 'too-new', 'pets-max', 'pet-gone', 'pets-full', 'no-pet', 'off', 'pets-unavailable'];
  check('pets: every trading refusal the worker sends has words on the phone', tradeCodes.every((c) => typeof CLIENT_TRAP_WORDS[c] === 'string' && CLIENT_TRAP_WORDS[c].length > 0),
    tradeCodes.filter((c) => !CLIENT_TRAP_WORDS[c]));
  /* v2.3.3123 (Phase 4): THE LAND WARD -- each kind wards its own land's
     element, every element has its pet, and the strength the Pets page shows
     is the worker's at every level */
  const elOff = Object.keys(SRV_PET_KINDS).filter((k) => !CLIENT_PET_KINDS[k] || SRV_PET_KINDS[k].el !== CLIENT_PET_KINDS[k].el || !Object.prototype.hasOwnProperty.call(SRV_ELEM_HITS, SRV_PET_KINDS[k].el));
  check('pets: each kind\'s ward element is the same on both sides and one the monsters hit with', elOff.length === 0, elOff);
  const wardEls = new Set(Object.values(SRV_PET_KINDS).map((k) => k.el));
  check('pets: all eight elements have a pet to ward them', Object.keys(SRV_ELEM_HITS).every((e) => wardEls.has(e) && typeof CLIENT_PET_WARD_WHAT[e] === 'string'),
    Object.keys(SRV_ELEM_HITS).filter((e) => !wardEls.has(e) || !CLIENT_PET_WARD_WHAT[e]));
  check('pets: the same ward numbers (15% at Lv 1, a point a level, half at most)',
    CLIENT_PET_WARD.BASE === SRV_PETBOOK.WARD_BASE && CLIENT_PET_WARD.PER_LV === SRV_PETBOOK.WARD_PER_LV && CLIENT_PET_WARD.MAX === SRV_PETBOOK.WARD_MAX,
    { client: CLIENT_PET_WARD, server: { BASE: SRV_PETBOOK.WARD_BASE, PER_LV: SRV_PETBOOK.WARD_PER_LV, MAX: SRV_PETBOOK.WARD_MAX } });
  const wOff = [];
  for (let lv = 0; lv <= 130; lv++) if (srvPetWardOf(lv) !== clientPetWardOf(lv)) wOff.push(lv);
  check('pets: the same ward at every level to 130', wOff.length === 0 && srvPetWardOf(1) === 0.15 && srvPetWardOf(36) === 0.5 && srvPetWardOf(99) === 0.5, wOff);
  /* ...MORE ROOM: the price the page shows is the price the worker charges */
  check('pets: the same Pet House numbers (30 to start, 120 at most, 10 a step, 1,000 more a step)',
    CLIENT_PET_HOUSE.CAP === SRV_PETBOOK.CAP && CLIENT_PET_HOUSE.CAP_MAX === SRV_PETBOOK.CAP_MAX
      && CLIENT_PET_HOUSE.STEP === SRV_PETBOOK.HOUSE_STEP && CLIENT_PET_HOUSE.BASE === SRV_PETBOOK.HOUSE_BASE,
    { client: CLIENT_PET_HOUSE, server: { CAP: SRV_PETBOOK.CAP, CAP_MAX: SRV_PETBOOK.CAP_MAX, STEP: SRV_PETBOOK.HOUSE_STEP, BASE: SRV_PETBOOK.HOUSE_BASE } });
  const hOff = [];
  for (let c = 0; c <= 130; c++) if (srvPetHousePrice(c) !== clientPetHousePrice(c)) hOff.push(c);
  check('pets: the same Pet House price at every size', hOff.length === 0 && srvPetHousePrice(30) === 1000 && srvPetHousePrice(110) === 9000 && srvPetHousePrice(120) === 0, hOff);
  /* ...THE OTHERS' PETS: what the worker puts on the tick, the phone reads back */
  const wireOff = [];
  for (const kind of Object.keys(SRV_PET_KINDS)) {
    for (const [stage, gold, size, lv] of [[1, false, 1.05, 1], [2, true, 1.25, 40], [1, false, 0.85, 7], [3, true, 1.18, 120]]) {
      const back = clientParsePetWire(srvPetWireOf({ kind, stage, gold, size, lv }));
      if (!back || back.kind !== kind || back.stage !== stage || back.gold !== gold || back.size !== size || back.lv !== lv) wireOff.push([kind, stage, gold, size, lv, back]);
    }
  }
  check('pets: every pet the worker puts on a player\'s tick reads back the same on the phone', wireOff.length === 0, wireOff.slice(0, 3));
  check('pets: a forged pet on the tick is no pet', ['__proto__.1.0.100.1', 'dragon.1.0.100.1', 'snowling.1.0.100', 'x'.repeat(50), null, 42, {}].every((w) => clientParsePetWire(w) === null));
  const houseCodes = ['house-full', 'stale', 'no-gold', 'confirm'];
  check('pets: every Pet House refusal the worker sends has words on the phone', houseCodes.every((c) => typeof CLIENT_TRAP_WORDS[c] === 'string' && CLIENT_TRAP_WORDS[c].length > 0),
    houseCodes.filter((c) => !CLIENT_TRAP_WORDS[c]));
}

/* ═══ v2.3.3139: WHAT HARDENING COSTS ═══
   The owner: "hardening should cost 1 bar per level ... and a doubling gold
   cost per level", and for bows and staffs "5 logs of the raw material can
   make one 'hardened (name) wood' ... Also for the number required and gold
   too" -- the Blacksmith's and the Woodworker's Harden rows show the game's
   copy (src/data/hardenCosts.js); it must be the price the worker charges,
   piece for piece, coin for coin, on both ladders, and name the same
   material for every weapon. */
{
  const names = (o) => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
  check('hardening: the game\'s ladder is the worker\'s (base, both factors, a material a level, the bars and woods by tier, their names)',
    CLIENT_HARDEN.COST_BASE === SRV_HARDEN.COST_BASE && CLIENT_HARDEN.COST_FACTOR === SRV_HARDEN.COST_FACTOR
      && CLIENT_HARDEN.OLD_COST_FACTOR === SRV_HARDEN.OLD_COST_FACTOR && CLIENT_HARDEN.MATS_PER_LEVEL === SRV_HARDEN.MATS_PER_LEVEL
      && JSON.stringify(CLIENT_HARDEN.BAR_BY_TIER) === JSON.stringify(SRV_HARDEN_BAR_BY_TIER)
      && JSON.stringify(CLIENT_HARDEN.WOOD_BY_TIER) === JSON.stringify(SRV_HARDEN_WOOD_BY_TIER)
      && names(CLIENT_HARDEN_NAMES) === names(SRV_HARDEN_NAMES),
    { client: CLIENT_HARDEN, server: { COST_BASE: SRV_HARDEN.COST_BASE, COST_FACTOR: SRV_HARDEN.COST_FACTOR, OLD_COST_FACTOR: SRV_HARDEN.OLD_COST_FACTOR,
      MATS_PER_LEVEL: SRV_HARDEN.MATS_PER_LEVEL, BAR_BY_TIER: SRV_HARDEN_BAR_BY_TIER, WOOD_BY_TIER: SRV_HARDEN_WOOD_BY_TIER } });
  const off = [];
  for (let h = 0; h < SRV_HARDEN.MAX; h++) {
    if (srvHardenGold(h, false) !== clientHardenGold(h, false)) off.push(['gold', h]);
    if (srvHardenGold(h, true) !== clientHardenGold(h, true)) off.push(['old gold', h]);
    if (srvHardenAmount(h) !== clientHardenAmount(h)) off.push(['amount', h]);
  }
  for (let t = 0; t <= 22; t++) for (const wood of [false, true]) if (srvHardenMat(t, wood) !== clientHardenMat(t, wood)) off.push(['material', t, wood]);
  check('hardening: every attempt\'s gold and amount the same on both sides (500..8,000 and 1..5; the old ladder 500..128,000), and the same material for every tier, metal or wood',
    off.length === 0 && [0, 1, 2, 3, 4].map((h) => clientHardenGold(h)).join() === '500,1000,2000,4000,8000'
      && [0, 1, 2, 3, 4].map((h) => clientHardenGold(h, true)).join() === '500,2000,8000,32000,128000'
      && [0, 1, 2, 3, 4].map((h) => clientHardenAmount(h)).join() === '1,2,3,4,5', off);
  /* the tier the game reads for the material is the tier the worker reads,
     and both call the same weapons wood */
  const tOff = [];
  const weapons = [{ gearBase: 'wood' }, { gearBase: 'copper' }, { gearBase: 'iron' }, { gearBase: 'steel' }, { gearBase: 'titanium' },
    { gearBase: 'ww_pine' }, { gearBase: 'ww_hardwood' }, { gearBase: 'ww_cedar' }, { gearBase: 'ww_maple' }, { gearBase: 'ww_ironbark' },
    { tierMult: 1.3 }, { tierMult: 1 }, {}];
  for (const w of weapons) {
    if (room._weaponTierIndex(w) !== clientHardenTier(w)) tOff.push(['tier', w, room._weaponTierIndex(w), clientHardenTier(w)]);
    for (const slot of ['weapon', 'rangedWeapon', 'staffWeapon']) if (srvHardenIsWood(w, slot) !== clientHardenIsWood(w, slot)) tOff.push(['wood', w, slot]);
  }
  check('hardening: the game picks the same tier, and calls the same weapons wood, as the worker -- so the same material', tOff.length === 0, tOff);
  /* the hardened wood itself: the Woodworker's Harden tab draws the game's copy */
  const RC = SRV_HARDENED_WOOD.RECIPES;
  const hOff = [];
  for (const k of new Set([...Object.keys(RC), ...Object.keys(CLIENT_HARDENED_WOOD)])) {
    const a = RC[k], b = CLIENT_HARDENED_WOOD[k];
    if (!a || !b) { hOff.push(['missing', k]); continue; }
    for (const f of ['log', 'logCost', 'minLvl', 'xp', 'tier', 'name']) if (a[f] !== b[f]) hOff.push([k, f, a[f], b[f]]);
  }
  check('hardened wood: the Woodworker\'s Harden tab is the worker\'s table (log, logs a piece, level, XP, wood, name) and its "All" cap',
    hOff.length === 0 && CLIENT_HW_MAX === SRV_HARDENED_WOOD.MAX_PER_REQUEST && Object.keys(RC).length === 5, hOff);
  check('hardened wood: the woods by tier read off the same table on both sides',
    JSON.stringify(CLIENT_HARDEN_WOOD_BY_TIER) === JSON.stringify(SRV_HARDEN_WOOD_BY_TIER), { client: CLIENT_HARDEN_WOOD_BY_TIER, server: SRV_HARDEN_WOOD_BY_TIER });
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
