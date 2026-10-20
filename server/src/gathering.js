/* ═══ v2.3.1168 (P4 decomposition): GATHERING extracted from
 * index.js ═══
 *
 * Behavior-frozen move of the gather-node + harvest stack out of the
 * GameRoom class body (same mixin pattern as market.js): node spawn /
 * respawn lifecycle, harvest naming/yield/XP math, the life-skill XP
 * curve (_addLifeSkillXp -- also called by the forge and cooking
 * paths via `this`), the extraction timing validator
 * (extraction_start / node_strike, v2.3.229 hand-off), and the
 * Slice-18 perfect-claim rate limit.  The tick-loop call sites
 * (_tickNodes, _sweepStaleExtractions) and the join/zone-change
 * _ensureZoneNodes calls stay in index.js untouched -- prototype
 * dispatch reaches everything here.
 *
 * _rollHarvestShard's monster-kill sibling (_rollShardForKill, 10%)
 * stays in the index.js combat region. */

/* ═══ v2.3.2956: GATHERING HITS — THE NODE HAS HIT POINTS ═══
 *
 * Owner: "the resource has something akin to an hp bar and the player ticks
 * away at it and the tick range is determined by their skill level in
 * harvesting that resource.  So like level 1 would do 1 tick per second (or
 * whatever interval makes the most sense) until the 10 ticks assigned to the
 * resource are exhausted.  At that point the user would have to do the
 * gesture to complete the resource extraction.  Level 2 might be a tick from
 * 1-2 ... The next tier resource would have a higher max number of ticks."
 * Then: "Just add it for every resource gathering process."  And then:
 * "Make it appear for cooking too" -- the cook's FISH has the hit points
 * (_planCookHits, below).
 *
 * So the wind-up -- which was a smooth timer (computeOpenDelay, 2-10 s by
 * skill level against node tier) -- is now a string of HITS the worker
 * rolls: each hit takes 1..level off the node's HP, and the gesture window
 * opens when the HP is gone.  The gesture itself is untouched.
 *
 * WHY THE WORKER ROLLS THEM, and why that is not TRAPS #4.  #4 forbids
 * server-rolling the COOK minigame because its outcome is the player's
 * TIMING, which a server roll would overrule.  These hits are pure dice off
 * the skill level -- there is no player input in them at all -- so they are
 * exactly the kind of number rule zero says the server owns.  The gesture,
 * which IS timing, stays client-graded as before.
 *
 * Numbers, all owner-facing:
 *   HP     5 x (tier level + 1): the first tier is the owner's 10, and every
 *          tier takes about ten hits at the level that unlocks it (rolls of
 *          1..L average (L+1)/2).  Only tier 1 spawns today (_placeGatherNode).
 *          v2.3.3251: by RESOURCE now, each tier twice the one before at the
 *          level it opens (GATHER_NODE_HP, below); a cook's fish keeps this.
 *   MS     one hit per SWING of the art, so the number pops on the blow the
 *          player watches land: the pick's 650 ms loop, the axe's 540 ms
 *          (12 frames x 45 ms), and a 650 ms nibble for the rod, which has no
 *          blow -- nor has the pan, whose 650 ms is its grease beat, and in
 *          a cook the grease pops ON each hit.  Mirrors GATHER_SWING (src/data/gameSystems.js), pinned by
 *          mirror-audit.test.mjs.  Level 1 on the first tier is 10 hits,
 *          ~6.5 s on a rock against the old 4 s wind-up.
 *   MAX_HITS  a bound no live node can reach (tier 1 is at most 10 hits): a
 *          far-under-levelled player on a future high tier would otherwise
 *          get a plan hundreds of hits long.  The last allowed hit takes
 *          whatever HP is left.  v2.3.3251: 40 -> 200, as the top tiers take
 *          ~160 hits at the level they open (GATHER_NODE_HP); a cook keeps
 *          40 (COOK_MAX_HITS).
 *   REUSE_MS  a restart on the SAME node within this window replays the same
 *          rolls instead of re-rolling, so the obvious move -- start, see a
 *          long plan, start again -- buys nothing.  Honest play never
 *          notices: the record is deleted on a successful strike, so the next
 *          harvest of the respawned node rolls fresh.  It is NOT a wall: the
 *          memory is the single extraction record, so a start on another
 *          node, a start without hitSeq or an attack in between clears it.
 *          A per-node memory would close that, and would buy nothing yet: a
 *          modified client can already strike with NO record at all, which
 *          _handleNodeStrike accepts with no timing check (the permissive
 *          legacy branch below).  Harden both together, when that branch is
 *          retired.  v2.3.3322: it is (HARVEST_PROOF: a recovery strike at
 *          most once in ten minutes), and a reconnect no longer clears the
 *          record; the per-node memory is still not built -- shopping among a
 *          few plans of one node buys a script a few hits, never the 48x the
 *          retired branch did. */
import { WHEEL_ZONE } from './wheelzone.js'; /* v2.3.3012: the Wheel's baked nodes */
import { xpDecayMult, xpAfterDecay } from './xpdecay.js'; /* v2.3.3251: XP fades 5+ levels below you */
import { parseGemKey } from './gems.js';   /* v2.3.3516: gems are kept through a death (_keptThroughDeath) */

export const GATHER_HITS = {
  MS: { mining: 650, woodcutting: 540, fishing: 650, cooking: 650 },
  HP_PER_TIER: 5,
  /* v2.3.3251: 40 -> 200.  Obsidian, maple and pike take ~160 hits at the
     level they open (GATHER_NODE_HP), 182 at the very most; 200 is the most
     the game accepts in a plan (src/data/gameSystems.js GATHER_PLAN_MAX,
     mirror-audit), so every plan it is sent is one it plays. */
  MAX_HITS: 200,
  COOK_MAX_HITS: 40,   /* v2.3.3251: a cook's own bound, the old 40: cooking has no levels to unlock, so it is as it was (_planCookHits) */
  REUSE_MS: 60000,
  SEQ_MAX: 1e9,
  LADDER: 10,   /* v2.3.3229: the hit ladder's die -- each level adds a 1-in-10 chance (below) */
};

/* ═══ v2.3.3229: THE HIT LADDER -- EACH LEVEL ADDS A 10% CHANCE OF ONE MORE ═══
 *
 * Owner, 2026-10-14: "I want a different life skill progression system where
 * after the first level you get a 10% chance of hitting 1 number higher.  The
 * next level you get a 10% chance of hitting 1 number higher than that.  So
 * lvl 2 has a 10% chance of hitting 2 otherwise 1.  Lvl 3 has a 10% chance of
 * hitting 3 otherwise 1.  Etc. the number 1 will eventually get replaced by
 * the 2 as more 10% chances get added with each level."
 *
 * So a hit is a TEN-SIDED DIE read down from your level: its top face hits
 * for your level, the face under it for one less, ... its bottom face for
 * nine less, and no face hits for less than 1:
 *   level 1    always 1
 *   level 2    2 on 10%, else 1 (90%)
 *   level 3    3 or 2 on 10% each, else 1 (80%)
 *   level 10   1..10 on 10% each -- exactly the old dice's level 10
 *   level 11   2..11 on 10% each: the 1 is gone, "replaced by the 2"
 *   level L    L-9..L on 10% each, from level 10 on
 * Its average is (L*L - L + 20) / 20 to level 10 and L - 4.5 after it, where
 * v2.3.2956's 1..level averaged (L + 1) / 2: lower until level 10, the same
 * at 10, higher after -- a slow start that pays off (docs/specs/hit-ladder.md
 * has the table, and the hits each resource takes).
 *
 * Every hit skill rolls it -- mining, woodcutting, fishing, and a cook's
 * grease pops -- because _rollGatherHits is their one die, as it was for
 * 1..level.  Nothing else moves: the HP, the swing, the strike's window (read
 * off the plan's own length), the re-roll memory, the honest cycle (a one-hit
 * plan was always there, 10% of them at level 10; from level 19 a first-tier
 * node is always one hit).  MAX_HITS is now within reach of a live node -- a
 * Mining 5 player on black steel's 60 HP averages 30.5 hits and about one
 * plan in 80 meets the 40th, which takes what is left, as it always did.
 * (v2.3.3251: no longer -- black steel is 80 HP and the bound 200, which no
 * plan at a resource's own level reaches: GATHER_NODE_HP.)
 *
 * Mirror: src/data/lifeSkills.js gatherHitOdds (the Skills panel's "Each
 * hit"), pinned to gatherHitRoll below by mirror-audit.test.mjs.
 *
 * KILL SWITCH: `hitladder: false` in liveflags (lower case, TRAPS §117) rolls
 * 1..level again for every plan after it (_hitLadderOff) and un-advertises
 * caps.hitladder, so the Skills panel shows those odds instead. */

/** v2.3.3229: one hit off the die.  `r` is a Math.random() draw, [0, 1),
 *  and a higher draw is never a lower hit (the bottom face first, the top
 *  face last), on either die; `ladder` false is v2.3.2956's even 1..level,
 *  kept for the kill switch. */
export function gatherHitRoll(level, r, ladder) {
  const top = Math.max(1, Math.floor(Number(level) || 1));
  const u = Math.min(Math.max(Number(r) || 0, 0), 0.999999);
  if (!ladder) return 1 + Math.floor(u * top);
  return Math.max(1, top - (GATHER_HITS.LADDER - 1) + Math.floor(u * GATHER_HITS.LADDER));
}

/* ═══ v2.3.3036: THE FASTEST AN HONEST HARVEST OR COOK CAN COME ROUND ═══
 *
 * Owner, 2026-10-05: "reduce resource extraction time during gesture by 75%".
 * The gesture went from 6 s to 1.5 s (src/game/gesturePose.js
 * GESTURE_TARGET_MS), its floor of real motion from 4.8 s to 1.2 s
 * (GESTURE_FLOOR_MS).  The worker never holds the gesture's length -- only
 * the wind-up's hits before it (openDelayBase, _handleNodeStrike's
 * too-early) -- but four of its bounds were sized for "several seconds a
 * minigame" and would now fire on a quick, honest hand, each one silently:
 * the perfect-claim limit below (yield halved), cooking.js COOK_PER_MIN (the
 * cook dropped) and botfp.js HARVEST_HOUR_CAP / COOK_HOUR_CAP (the grant
 * withheld) -- the owner's "Logs aren't going to the inventory", made by the
 * server.  So each is now derived from the one number an honest client
 * cannot beat:
 *
 *   the plan's round trip (>= 0) + GATHER_HIT_LEAD_MS + (hits - 1) swings
 *   (>= 0) + GATHER_HIT_SETTLE_MS + GESTURE_FLOOR_MS of real motion
 *   = 90 + 220 + 1200 = 1,510 ms at the least, harvest or cook alike
 *
 * (src/data/gameSystems.js and gesturePose.js; mirror-audit pins these to the
 * client's, and node-respawn §3c / anticheat §4 and §7 hold every bound above
 * what this allows: 39.7 a minute, 2,384 an hour).  A modified client can of
 * course skip the gesture, and these clip it only where it would go past the
 * quickest hand: on the Wheel's spread-out nodes it does not (what that costs:
 * botfp.js HARVEST_HOUR_CAP).  Whoever shortens the gesture or the settle owns
 * these. */
export const HONEST_CYCLE = { LEAD_MS: 90, SETTLE_MS: 220, GESTURE_FLOOR_MS: 1200 };
export const HONEST_CYCLE_MIN_MS = HONEST_CYCLE.LEAD_MS + HONEST_CYCLE.SETTLE_MS + HONEST_CYCLE.GESTURE_FLOOR_MS;
/* Slice 18's perfect claims a minute (_ratedHarvestAccuracy).  v2.3.3036:
   10 -> 45.  10 was "1 every 6 sec, well above the realistic minigame
   cadence" when the gesture alone took 4.8 s or more (~9.5 a minute at the
   most); a 1.5 s gesture brings a quick hand round in ~2 s, and nothing
   honest beats 60000 / HONEST_CYCLE_MIN_MS = 39.7. */
export const HARVEST_PERFECT_PER_MIN = 45;

/* ═══ v2.3.3322: A HARVEST IS PAID AGAINST ITS OWN START ═══
 *
 * The owner, on the anti-bot review's farming holes: "Yes" (to "start on the
 * bot farming holes"; docs/specs/antibot-review.md fix 6).  A strike was
 * timed only when the player's extraction record named the same node; with
 * NO record it was paid untimed (the branch kept for phones from before
 * v2.3.229, which only counted it), and with a record for ANOTHER node it was
 * paid untimed and not even counted.  Every phone has sent its start since
 * v2.3.1704, so only scripts used it -- obsidian 81 an hour honest, 3,930 by
 * script (the bot lab) -- and two honest moments:
 *   - a CONNECTION THAT DROPPED mid-harvest: the phone replays the strike
 *     after it rejoins (wsClient.js _holdForRejoin, v2.3.3034), and the close
 *     handler had deleted the record.  The record now outlives the socket
 *     (index.js webSocketClose, linger.js), swept at EXTRACTION_TIMEOUT_MS as
 *     before, so the replay is timed against it like any strike;
 *   - a ROOM RESTART (a deploy, every merge that touches server/): the record
 *     was in memory.  A strike with no start record of its own -- none, or one
 *     for another node (a replayed strike whose start went down the dead pipe)
 *     -- is paid as a RECOVERY strike, untimed, at most once a player every
 *     RECOVER_MS.  The room's restart forgets the clock, so everyone has one
 *     after a deploy; a script gets six untimed harvests an hour from it.
 * Any other is refused, 'no-start' or 'other-node', and the node is LEFT
 * STANDING and marked dirty, so the phone that predicted its fall is shown it
 * again and can harvest it properly.
 *
 * And a strike with no gesture fingerprint may not claim 'perfect' (botfp.js
 * _botfpOnStrike: it is paid 'good'): every real perfect comes off the gesture
 * (ExtractionSwipeLayer.jsx gradeGesture), which writes the fingerprint in the
 * same step, and perfect doubles the yield.
 *
 * Kill switch `harvestproof: false` in the live flags: the old permissive
 * strike and the old perfect, at once (_harvestProofOn).  The record still
 * outlives a socket: that is only ever more honest. */
export const HARVEST_PROOF = {
  RECOVER_MS: 600000,
  DIRTY_MS: 2000,   /* a refused strike's node state sent again at most this often, a player */
};

/* ═══ v2.3.3038: A RESOURCE'S SKILL LEVEL IS A REAL REQUIREMENT ═══
 *
 * Owner, 2026-10-05: "I'll change tier level requirements in levels of 5.
 * So with the exception of copper and iron where you can mine both, black
 * steel now requires a mining level of at least 5.  Fishing clownfish
 * required fishing level 5.  I haven't thought the rest out yet, game is
 * still a demo."
 *
 * Until now a node's tier (1 / 6 / 11) was only a SPEED knob: more HP to
 * chip through, a longer legacy timer -- anyone with the tool could harvest
 * anything (the client's own check had been switched off: BroTown.jsx's
 * `if (false)` gathering gate).  This table is the requirement, keyed by the
 * node's type and its tier, and it is deliberately NOT the tier: the tier
 * names the item, its art, its HP, its XP and the baked places, none of
 * which move.  The owner named three cells (copper 1, iron 1, black steel 5;
 * clownfish 5); the rest follow the same "levels of 5" rule -- minnow, pine 1,
 * softwood 5, trout and hardwood 10 -- and are the owner's to change here.
 * A tier missing from a row needs nothing (level 1).
 *
 * ENFORCED HERE, on both halves of a harvest: extraction_start (no plan for a
 * player below it) and node_strike (the paying call: refused BEFORE the node
 * is spent, recorded as 'skill-too-low' for the admin view).  The client
 * says why before it ever sends ("Need Mining Lv 5", lifeSkillRewards.js
 * startExtraction) and draws the level over the node, so honest play never
 * reaches these refusals; they are for a stale tab or a modified client.
 * Client mirror: src/data/lifeSkills.js GATHER_REQ_LVL, pinned by
 * mirror-audit.test.mjs.
 *
 * KILL SWITCH: `gatherreq: false` in liveflags (lower case, TRAPS §117)
 * un-advertises caps.gatherreq -- the client stops refusing -- and lifts the
 * worker's gate, so every resource is harvestable at level 1 again with no
 * deploy. */
/* v2.3.3094: + the second stage's two tiers, five levels a tier as the owner
   set the first ("in levels of 5"): titanium Mining 10, obsidian 15; salmon
   and cedar 15, pike and maple 20. */
export const GATHER_REQ_LVL = {
  oreVein:  { 1: 1, 6: 1, 11: 5, 16: 10, 21: 15 },
  fishSpot: { 1: 1, 6: 5, 11: 10, 16: 15, 21: 20 },
  tree:     { 1: 1, 6: 5, 11: 10, 16: 15, 21: 20 },
};

/** v2.3.3038: the skill level a node of this type and tier asks for.  Own
 *  properties only, so a forged type ('__proto__', 'constructor') reads as
 *  "nothing required" rather than walking the prototype (TRAPS #6). */
export function gatherReqLvl(nodeType, tierLvl) {
  const has = Object.prototype.hasOwnProperty;
  const row = has.call(GATHER_REQ_LVL, nodeType) ? GATHER_REQ_LVL[nodeType] : null;
  const t = Math.max(1, Math.floor(Number(tierLvl) || 1));
  const need = (row && has.call(row, t)) ? row[t] : 1;
  return Math.max(1, Math.floor(Number(need) || 1));
}

/* ═══ v2.3.3251: EACH TIER TAKES TWICE AS LONG AS THE ONE BEFORE ═══
 *
 * Owner, 2026-10-14: "I want each tiers unlocks (lvl 5 required, lvl 10
 * required, etc) to take about 2x longer on average than the previous tier's
 * lowest level extraction time.  You can figure out what "hp" to give the
 * resources during extraction ... You can change black steel etc to whatever
 * these values are."
 *
 * So each resource's HP is solved so that AT THE LEVEL IT OPENS
 * (GATHER_REQ_LVL above) it takes, on average, twice the hits the tier before
 * took at the level THAT one opens: 10, 20, 40, 80, 160 hits -- 6.5, 13, 26,
 * 52 and 104 s of swinging at a rock or a pond (0.65 s a hit), 5.4 to 87 s at
 * a tree (0.54 s).  The hits are the hit ladder's (gatherHitRoll), so a tier
 * that opens later needs more HP for the same hits: iron opens at Mining 1
 * beside copper (twenty 1s), clownfish and softwood at 5.  Solved exactly over
 * the ladder's dice and rounded to tens (gather-hits §12 solves it again and
 * holds every row within 3% of double):
 *              tier 1     6     11     16     21
 *   oreVein      10      20     80    440   1680    copper .. obsidian
 *   tree         10      40    220    840   2480    pine .. maple
 *   fishSpot     10      40    220    840   2480    minnow .. pike
 * It was 5 x (tier + 1) for all three -- 10, 35, 60, 85, 110 -- which a
 * higher level cut through faster tier by tier: obsidian at Mining 15 was 7 s.
 * A tier or type not in the table (the world grows none past tier 21), and a
 * cook's fish (cooking has no levels to unlock: _planCookHits), keep that.
 * Each plan's own length is the strike's window, as ever; a planned harvest's
 * monster shield now runs from its window's opening (_extractionShielded),
 * as 104 s of hits ate most of the old 120 s.
 *
 * Mirror: src/data/lifeSkills.js GATHER_NODE_HP / gatherNodeHp (the HP bar
 * before a plan lands, on the timer, and on a locked try), pinned by
 * mirror-audit.  KILL SWITCH: `nodehp: false` in liveflags (lower case, TRAPS
 * §117) puts every node back on 5 x (tier + 1) for each plan after it and
 * un-advertises caps.nodehp (_nodeHpOff). */
export const GATHER_NODE_HP = {
  oreVein:  { 1: 10, 6: 20, 11: 80, 16: 440, 21: 1680 },
  tree:     { 1: 10, 6: 40, 11: 220, 16: 840, 21: 2480 },
  fishSpot: { 1: 10, 6: 40, 11: 220, 16: 840, 21: 2480 },
};

/** v2.3.3251: a node's hit points -- its type's row of GATHER_NODE_HP, else
 *  (a type or tier not in it, or `table` false: the kill switch) v2.3.2956's
 *  5 x (tier + 1).  Own properties only, so a forged type reads as no row
 *  (TRAPS #6). */
export function gatherNodeHp(tierLvl, nodeType, table) {
  const t = Math.max(1, Math.floor(Number(tierLvl) || 1));
  const has = Object.prototype.hasOwnProperty;
  const row = (table !== false && typeof nodeType === 'string' && has.call(GATHER_NODE_HP, nodeType)) ? GATHER_NODE_HP[nodeType] : null;
  if (row && has.call(row, t)) return row[t];
  return GATHER_HITS.HP_PER_TIER * (t + 1);
}

/* ═══ v2.3.3251: ...AND EACH TIER PAYS TWICE THE XP OF THE ONE BEFORE ═══
 * Owner, asked whether XP should grow with the time now that each tier takes
 * twice as long: "Yes adjust the xp."  A harvest's base XP (before the
 * accuracy grade, _harvestXpMult) by its tier, doubling as the time does:
 *              tier 1    6     11     16     21
 *              163      326    652   1304   2608   (was 163, 350, 538, 725, 913)
 * so at the level each one opens every tier pays about the same XP a second
 * (~22-30 a second with the ~1.5 s gesture; it was 9 on obsidian against 20
 * on copper).  Every type alike: the hits double per tier for all three.  A
 * tier not in the table (the world grows none past 21) keeps the old
 * (tier x 1.5 + 5) x 25.  What is well below you pays less on top
 * (xpdecay.js, _harvestXpPaid).
 *
 * Mirror: src/data/lifeSkills.js GATHER_TIER_XP / harvestBaseXp, pinned by
 * mirror-audit.  KILL SWITCH: `tierxp: false` in liveflags (lower case) puts
 * every harvest back on the old XP and un-advertises caps.tierxp -- and so
 * does `nodehp: false`, as doubled XP for the old, quick HP would level a
 * player through the top tiers several times faster than before
 * (_tierXpOff). */
export const GATHER_TIER_XP = { 1: 163, 6: 326, 11: 652, 16: 1304, 21: 2608 };

/** v2.3.3251: a harvest's base XP for its tier -- the table's, else (a tier
 *  not in it, or `table` false: the kill switch) the old
 *  ceil((tier x 1.5 + 5) x 25).  Own properties only (TRAPS #6). */
export function harvestBaseXp(tierLvl, table) {
  const t = Math.max(1, Math.floor(Number(tierLvl) || 1));
  if (table !== false && Object.prototype.hasOwnProperty.call(GATHER_TIER_XP, t)) return GATHER_TIER_XP[t];
  return Math.ceil(((t * 1.5) + 5) * 25);
}

/* ═══ v2.3.3090: LIFE SKILLS LEVEL HALF AS FAST, LIKE COMBAT ═══
 * Asked "Should life-skill XP slow down like combat XP?" (combat levels came
 * half as fast in v2.3.3054), the owner said "Yes".  Every level of every life
 * skill now costs TWICE the XP it did: the curve's base 500 -> 1000, its
 * 1.08 a level unchanged.  The price, not the pay: a dozen actions pay life
 * XP on each side (harvests, cooks, smelts, forges, the amulet bench, gems,
 * traps, furniture, the farm), each with its "+n XP" popup, and doubling what
 * a level costs halves the pace of all of them at once with every number
 * players see left true.  Levels already earned are kept; the XP toward the
 * next one is kept too, and reads half as far along.  Client mirror:
 * LIFE_SKILL_XP_BASE in src/data/items.js (mirror-audit pins the pair). */
export const LIFE_SKILL_XP_BASE = 1000;

export const gatheringMethods = {
  // ═══ Gather nodes (trees / fish spots / ore veins) ═══
  //
  // The client owns the tier/name/flavor data tables (WOODCUTTING_TIERS
  // / FISHING_TIERS / MINING_TIERS in src/data/lifeSkills.js).  The
  // server only needs to know: how many of each type per zone, their
  // positions, alive/respawnAt, and a tierLvl per node so two clients
  // see the same tier (otherwise each client's createGatherNode() picks
  // a tier via Math.random() and they diverge).
  //
  // tierLvl values for the "shallow" depth: 1 or 6 — that's the set of
  // tier .lvl values <= 10 across all three tier tables.
  _getShallowNodeTierLvls() {
    return [1, 6]; // eligible tier .lvl values for depth=shallow
  },

  // Per-zone node count + type split.  Each gameplay zone gets its OWN
  // resource specialization (its "home base") PLUS fishing holes, so an
  // angler can fish anywhere (owner request 2026-07-06: "add fishing spots
  // to each zone").  Ore/trees stay pinned to their home zones; fishing is
  // universal because water can plausibly sit in any biome.
  //   - hollows: ore veins (the rock zone)   -- + fishing
  //   - frost:   trees (client renders pines) -- + fishing
  //   - all others (meadow / ember / mist / verdant / thunder / sky /
  //     tidal): fishing holes only
  _getZoneNodeConfig(zoneId) {
    // v2.3.1346 (owner): EVERY resource appears 3 times in EVERY zone —
    // one uniform config replaces the per-zone table (client
    // lifeSkills.js DEPTH node config mirrors this; keep together).
    // v2.3.1592 (owner: "one resource per zone but with quick respawn"):
    // 3 of each -> ONE of each.  Read as "every resource appears ONCE in
    // every zone", the direct inverse of the v2.3.1346 line above, rather
    // than "one node total" — that would leave two of the three gathering
    // skills unharvestable in any given zone and undo the whole point of
    // v2.3.1346 (and of the 2026-07-06 "add fishing spots to each zone"
    // request), which is that every skill is playable wherever you stand.
    // The speed comes from NODE_RESPAWN_TIME (index.js), not from count.
    void zoneId;
    return { treeCt: 1, fishCt: 1, oreCt: 1 };
  },

  // Spawn the static node layout for a zone.  Positions are randomized
  // once at first-ever zone activation; after that they're fixed for
  // the lifetime of the Durable Object (re-randomized only on DO wake).
  _spawnZoneNodes(zoneId) {
    /* v2.3.3012: the Wheel's nodes are BAKED from its plan, tiered by how far
       from town they grow (wheelzone.js _wheelSpawnNodes).  It has no zone
       config, so the random layout below would place none -- and must not: a
       random point of its 43,008 px is most likely sea. */
    if (zoneId === WHEEL_ZONE) return this._wheelSpawnNodes();
    const zone = this._getZoneConfig(zoneId);
    if (!zone) return [];
    /* v2.3.1983: the dimensions/margin/gap arithmetic moved with the
       placement itself into _placeGatherNode below. */
    const cfg = this._getZoneNodeConfig(zoneId);
    // Entry-level zones pin to tier 1 (the lowest of the shallow set).
    // _getShallowNodeTierLvls is still defined for future deeper-depth
    // tiers but the active zones (meadow / hollows / frost) all use
    // entry-tier nodes only.
    const nodes = [];
    let idx = 0;
    /* v2.3.1444 (owner): nodes used to land wherever the dice fell, and
       two resources spawning near each other stacked their prompt menus
       on top of one another.  Enforce a minimum gap via rejection
       sampling: re-roll up to 40 times until the candidate is at least
       MIN_NODE_GAP from every already-placed node, keeping the
       best-spread candidate as a fallback so tiny zones still place all
       their nodes (mirror of client spawnGatherNodes; keep together). */
    const placeOne = (type) => {
      const n = this._placeGatherNode(zoneId, type, nodes, 'sn-' + zoneId + '-' + idx);
      if (n) nodes.push(n);
      idx++;
    };
    for (let i = 0; i < cfg.treeCt; i++) placeOne('tree');
    for (let i = 0; i < cfg.fishCt; i++) placeOne('fishSpot');
    for (let i = 0; i < cfg.oreCt; i++) placeOne('oreVein');
    return nodes;
  },

  /* v2.3.1983: ONE node, placed by the v2.3.1444 minimum-gap rejection
     sampler against whatever is already standing in the zone.  Hoisted
     verbatim out of _spawnZoneNodes' `placeOne` closure (only the id and
     the push/return changed) so the population scaler (spawnscale.js) can
     add a node mid-session under the SAME spacing rule — a scaled-in vein
     that landed on top of an existing tree would stack their prompt menus,
     which is the exact bug v2.3.1444 fixed. */
  _placeGatherNode(zoneId, type, existing, id) {
    const zone = this._getZoneConfig(zoneId);
    if (!zone) return null;
    const W = zone.w * this.TILE;
    const H = zone.h * this.TILE;
    const margin = 8 * this.TILE; // matches client lifeSkills.js inset
    const MIN_NODE_GAP = 6 * this.TILE;
    let x = 0, y = 0, bestD = -1;
    for (let att = 0; att < 40; att++) {
      const cx = margin + Math.random() * (W - margin * 2);
      const cy = margin + Math.random() * (H - margin * 2);
      let dMin = Infinity;
      for (const o of existing) dMin = Math.min(dMin, Math.hypot(o.x - cx, o.y - cy));
      if (dMin > bestD) { bestD = dMin; x = cx; y = cy; }
      if (dMin >= MIN_NODE_GAP) break;
    }
    const tierLvl = 1;
    return {
      id,
      nodeType: type,
      x, y,
      tierLvl,
      alive: true,
      respawnAt: 0,
    };
  },

  _ensureZoneNodes(zoneId) {
    if (zoneId === 'town' || zoneId === 'farm_home') return [];
    if (!this.nodes[zoneId]) {
      this.nodes[zoneId] = this._spawnZoneNodes(zoneId);
      for (const n of this.nodes[zoneId]) this._markNodeDirty(zoneId, n.id);
    }
    return this.nodes[zoneId];
  },

  // Tick the node respawn loop — flip alive=true on any depleted node
  // whose respawnAt has passed.  No need to scope to "active zones"
  // like _tickMonsters; gather respawn is cheap and tiny.
  _tickNodes() {
    const now = Date.now();
    for (const zoneId of Object.keys(this.nodes)) {
      const list = this.nodes[zoneId];
      if (!list || list.length === 0) continue;
      for (const n of list) {
        if (!n.alive && n.respawnAt > 0 && now >= n.respawnAt) {
          n.alive = true;
          n.respawnAt = 0;
          this._markNodeDirty(zoneId, n.id);
        }
      }
    }
  },

  // Process a player's harvest strike against a gather node.  The
  // client's minigame already gates this on success (mining miss
  // does NOT send node_strike), so we just validate and apply.
  // Tier + resource key mappings for gather nodes.  Hardcoded on the
  // server so the client can't cheat the harvest by lying about what
  // tier was struck.  Limited to the "shallow" depth tier set today
  // (tierLvl 1 + 6); extend if/when deeper depths reach the server.
  _harvestNameForTier(nodeType, tierLvl) {
    /* v2.3.1763 (owner: "I also want the first wood tier for staffs and bows to
       be pine ... Also changing 'log' or 'oak log' to 'pine log'").  The first
       tree drops a PINE LOG (inv key wood_pine_log), which is also what the
       first woodworking tier consumes — see WOODWORKING_TIERS.pine in data.js.
       Those two were never connected before this: tier one asked for
       `wood_wood`, a key nothing in the game has ever produced, so the first
       bow could not be crafted from anything a player could gather. */
    /* v2.3.3012: and the third tier, which the Wheel's levels 11-20 grow
       (wheelzone.js): hardwood (WOODWORKING_TIERS.hardwood's wood), trout,
       and BLACK STEEL ORE -- the owner's name for the ore after iron ("let's
       plan on 'black steel' in like level 10+ areas and have its own ore to
       mine"), which BLACKSMITH_TIERS.steel consumes (data.js oreName
       'black_steel': ore_black_steel_ore).  Client mirror: src/data/
       lifeSkills.js FISHING_TIERS / WOODCUTTING_TIERS / MINING_TIERS. */
    /* v2.3.3094: and the fourth and fifth, which the Wheel's second stage
       grows (levels 21-30 and 31-40): cedar and maple (WOODWORKING_TIERS
       cedar / maple's wood), salmon and pike, and TITANIUM and OBSIDIAN ORE,
       the forge's next two metals (BLACKSMITH_TIERS titanium / obsidian:
       ore_titanium_ore, ore_obsidian_ore). */
    const TREE = { 1: 'Pine Log', 6: 'Softwood', 11: 'Hardwood', 16: 'Cedar Wood', 21: 'Maple Wood' };
    const FISH = { 1: 'Minnow',   6: 'Clownfish', 11: 'Trout', 16: 'Salmon', 21: 'Pike' };
    const ORE  = { 1: 'Copper Ore', 6: 'Iron Ore', 11: 'Black Steel Ore', 16: 'Titanium Ore', 21: 'Obsidian Ore' };
    const t = tierLvl || 1;
    if (nodeType === 'tree') return TREE[t] || TREE[1];
    if (nodeType === 'fishSpot') return FISH[t] || FISH[1];
    return ORE[t] || ORE[1];
  },

  _harvestResourceType(nodeType) {
    if (nodeType === 'tree') return 'wood';
    if (nodeType === 'fishSpot') return 'fish';
    return 'ore';
  },

  _harvestInvKey(nodeType, tierLvl) {
    const name = this._harvestNameForTier(nodeType, tierLvl);
    const resType = this._harvestResourceType(nodeType);
    return resType + '_' + name.replace(/\s+/g, '_').toLowerCase();
  },

  _harvestYieldMult(accuracy, nodeType) {
    // v2.3.851: a felled tree always yields one log — woodcutting skips the
    // perfect-accuracy 2x bonus (owner).
    // v2.3.853: fishing does the same — one fish per catch regardless of reel
    // accuracy (owner: "only get one fish when I successfully fish"). Mining
    // keeps the perfect-accuracy 2x bonus.
    if (nodeType === 'tree' || nodeType === 'fishSpot') return 1;
    if (accuracy === 'perfect') return 2;
    return 1; // 'good' / 'ok' / unknown
  },

  _harvestXpMult(accuracy) {
    if (accuracy === 'perfect') return 2.0;
    if (accuracy === 'good') return 1.5;
    return 1.0; // 'ok' / unknown
  },

  // Slice 18: rate-limit 'perfect' harvest claims.  The minigame
  // outcome is still client-trusted (server doesn't simulate the
  // minigame), so a cheater could spam accuracy:'perfect' for the
  // doubled yield + XP.  Bound it: only HARVEST_PERFECT_PER_MIN
  // "perfect" claims accepted per 60s window per player; excess
  // downgrades to 'good' (keeps the XP bonus a skilled player
  // would earn but drops the yield doubler).
  //
  // 10/min = 1 every 6 sec, well above the realistic minigame
  // cadence for legit play (each fishing / mining / wood-chop
  // minigame takes several seconds + walk-to-next-node time).
  // v2.3.3036: 45/min since the gesture is a quarter of what it was --
  // see HARVEST_PERFECT_PER_MIN.
  _ratedHarvestAccuracy(ps, claimed) {
    if (claimed !== 'perfect') return claimed || 'ok';
    /* v2.3.3430: no rate for a test-mode character (testmode.js) */
    if (typeof this._testMode === 'function' && this._testMode(ps)) return 'perfect';
    const now = Date.now();
    if (!Array.isArray(ps._perfectHistory)) ps._perfectHistory = [];
    // Prune entries older than 60 sec.
    ps._perfectHistory = ps._perfectHistory.filter((t) => (now - t) < 60000);
    if (ps._perfectHistory.length >= HARVEST_PERFECT_PER_MIN) {
      return 'good'; // cap exceeded
    }
    ps._perfectHistory.push(now);
    return 'perfect';
  },

  /* ═══ v2.3.2273: THE STRIKE GATE HAS TO HONOUR THE SHAPE THE CLIENT DRAWS ═══
   *
   * Owner: "Chopped logs were not going into my inventory."  The third report
   * of this symptom and the first one that is a geometry bug rather than a
   * missing message (v2.3.1704) or a wiped axe (v2.3.1688).
   *
   * The two sides measured "am I at the node" differently, and only for TREES:
   *   - the CLIENT measures distance to the sprite BOX plus a 56px pad
   *     (BroTown nodeReachDist / nodeWorldBox).  A tier-1 tree is 168px of art
   *     ANCHORED AT ITS FOOT and drawn in front of the character, and only the
   *     trunk blocks movement -- so standing in the canopy, which is what "I am
   *     at the tree" looks like, is a normal 120-240px from the anchor, and the
   *     button says CHOP the whole way.
   *   - the WORKER measured a flat 110px radius from the anchor and dropped
   *     everything else with a bare `return`.
   * Measured: 55% of the ground where the client offers a chop was refused here.
   * Reproduced end to end by mp-chopyield from an ordinary spot in the canopy:
   *   {"why":"out-of-range","dist":130,"max":110}
   * and the refusal is invisible -- no error, no event, and the client has
   * already played the tree falling because it predicts the deplete locally.
   *
   * MINING AND FISHING NEVER HIT IT, which is why it survived: startExtraction
   * SNAPS the player to a fixed 86px / 67px stance for those two before any
   * strike is sent (lifeSkillRewards.js).  Woodcutting has no snap branch, so
   * its strike fires from wherever the thumb happened to be.
   *
   * So the range is DERIVED from the client's own geometry rather than raised
   * to a number that felt safe: the half-diagonal of the same box the client
   * tests, plus the same 56px pad, plus 24px of lag slack (the player keeps
   * moving between the strike and the last `move` the worker applied).  Tier
   * scaling mirrors nodeWorldBox's 15%-per-step exactly.  Ore and fish keep
   * 110: their snaps land at 86 and 67, so widening them buys nothing and
   * costs anti-cheat surface for no reason.
   *
   * It IS a wider anti-cheat surface for trees -- ~268px against 110 -- and
   * that is the honest trade: it is bounded, derived from art the server can
   * check, and the alternative is a gate that refuses over half of legitimate
   * play in silence. */
  _nodeStrikeRange(nodeType, tierLvl) {
    if (nodeType !== 'tree') return this.NODE_STRIKE_RANGE;
    const step = Math.min(10, Math.max(1, Math.ceil((tierLvl || 1) / 10)));
    const h = 168 * (1 + (step - 1) * 0.15);   /* nodeWorldBox, tree */
    const w = h * 0.8;
    /* Base-anchored (ay = 1.0): the far corner of the box is (w/2, h) away. */
    return Math.sqrt((w * 0.5) * (w * 0.5) + h * h) + 56 /* NODE_REACH_PAD */ + 24 /* lag slack */;
  },

  _harvestSkillName(nodeType) {
    if (nodeType === 'tree') return 'woodcutting';
    if (nodeType === 'fishSpot') return 'fishing';
    return 'mining';
  },

  // Base XP per harvest = ceil(tierLvl * 1.5 + 5); the accuracy
  // multiplier (xpMult above) is applied on top.  Mirrors the client
  // formula in createGatherNode (lifeSkills.js).
  // v2.3.3251: the base is GATHER_TIER_XP's, doubling a tier (harvestBaseXp).
  _harvestXpForTier(tierLvl, accuracy) {
    /* v2.3.1435 (owner): life-skill XP rate x5.  Client mirror:
       createGatherNode in src/data/lifeSkills.js — keep in lockstep.
       v2.3.1765 (owner: "Lifeskills xp is far too slow.  I think you should
       increase it by about 5x"): x5 again, so the rate is 25x the original.
       The LEVEL CURVE is untouched — this multiplies what a swing pays, not
       what a level costs, which is the knob the owner asked for. */
    const baseXp = harvestBaseXp(tierLvl, !this._tierXpOff());
    return Math.ceil(baseXp * this._harvestXpMult(accuracy));
  },

  /** v2.3.3251: what a harvest of node `n` PAYS a player: the tier's XP at
   *  its grade (_harvestXpForTier), then faded when the resource's level
   *  (GATHER_REQ_LVL) is 5 or more below the player's skill (xpdecay.js) --
   *  their level BEFORE this harvest's XP lands.  The game predicts the same
   *  number for its "+N Mining XP" (gameSystems.js harvestXpFor). */
  _harvestXpPaid(ps, skill, n, accuracy) {
    const xp = this._harvestXpForTier(n.tierLvl, accuracy);
    if (typeof this._xpDecayOff !== 'function' || this._xpDecayOff()) return xp;
    const s = ps && ps.lifeSkills && Object.prototype.hasOwnProperty.call(ps.lifeSkills, skill) ? ps.lifeSkills[skill] : null;
    const lvl = (s && typeof s === 'object') ? Math.max(1, Math.floor(Number(s.level) || 1)) : 1;
    return xpAfterDecay(xp, xpDecayMult(lvl, gatherReqLvl(n.nodeType, n.tierLvl)));
  },

  /** v2.3.3251: GATHER_TIER_XP's kill switch -- `tierxp: false`, or
   *  `nodehp: false` (the doubled XP is for the doubled HP). */
  _tierXpOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'tierxp') && !f.tierxp)
      || this._nodeHpOff();
  },

  // lifeSkill level-up threshold curve.  Mirrors LIFE_SKILL_XP on the
  // client (lifeSkills.js): ceil(LIFE_SKILL_XP_BASE * 1.08^(level - 1)) --
  // 1000 since v2.3.3090 (was 500: the owner's "Yes" to slower life skills).
  _lifeSkillXpThreshold(level) {
    return Math.ceil(LIFE_SKILL_XP_BASE * Math.pow(1.08, (level || 1) - 1));
  },

  // Apply XP to a lifeSkill, returns { leveled, newLevel }.  Mirrors
  // addLifeSkillXp on the client; needs to stay byte-identical so
  // local-vs-server level outcomes don't drift.
  _addLifeSkillXp(ps, skill, xpAmt) {
    if (!ps.lifeSkills) ps.lifeSkills = {};
    /* v2.3.3127: anything but an object is a fresh skill.  `!x` caught only
       the falsy ones, and `s.xp = ...` on `1` or 'x' THREW (strict mode) --
       the farm's harvest had already paid by then and paid again on every
       message (farm.js).  The join heals such entries now
       (migrations.js healLifeSkillLevels); this is the last line. */
    const cur = ps.lifeSkills[skill];
    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) ps.lifeSkills[skill] = { level: 1, xp: 0 };
    const s = ps.lifeSkills[skill];
    s.xp = (s.xp || 0) + xpAmt;
    let leveled = false;
    while (s.xp >= this._lifeSkillXpThreshold(s.level || 1)) {
      s.xp -= this._lifeSkillXpThreshold(s.level || 1);
      s.level = (s.level || 1) + 1;
      leveled = true;
    }
    return { leveled, newLevel: s.level };
  },

  // 33% shard drop per successful harvest (matches the client's
  // rollHarvestShard rate; the monster-kill path uses 10% via
  // _rollShardForKill above).  Server-rolled so a modified client
  // can't force shard drops.
  _rollHarvestShard(zoneId) {
    if (Math.random() >= 0.33) return null;
    return 'shard_' + zoneId;
  },

  // Mirror of computeOpenDelay() in src/data/gameSystems.js, sans the
  // jitter sample -- returns the BASE delay so the validator can bound
  // the per-attempt window by base * (1 ± EXTRACT_JITTER).
  _computeOpenDelayBase(skillLevel, nodeTier) {
    const lvl = Number(skillLevel) || 0;
    const tier = Number(nodeTier) || 1;
    const gap = tier - lvl;
    let base;
    if (gap > 0) base = this.EXTRACT_OPEN_BASE + gap * 1200;
    else if (gap < 0) base = this.EXTRACT_OPEN_BASE + gap * 250;
    else base = this.EXTRACT_OPEN_BASE;
    return Math.max(this.EXTRACT_OPEN_MIN, Math.min(this.EXTRACT_OPEN_MAX, base));
  },

  // Sweep extraction entries past EXTRACTION_TIMEOUT_MS.  Walk-away
  // cancel is silent on the client -- the player just stops getting the
  // swipe cue; the server cleans up so the map doesn't grow unbounded.
  _sweepStaleExtractions(nowMs) {
    const cutoff = (nowMs || Date.now()) - this.EXTRACTION_TIMEOUT_MS;
    for (const sid of Object.keys(this.extractions)) {
      const e = this.extractions[sid];
      if (!e || e.startedAt < cutoff) delete this.extractions[sid];
    }
    /* v2.3.3322: a recovery clock that has run out holds nothing (HARVEST_PROOF) */
    if (this._harvestRecoverAt && this._harvestRecoverAt.size) {
      const spent = (nowMs || Date.now()) - HARVEST_PROOF.RECOVER_MS;
      for (const [pid, at] of this._harvestRecoverAt) if (at < spent) this._harvestRecoverAt.delete(pid);
    }
  },

  // Client sent extraction_start { nodeId, zone, skill } -- record what
  // we need to validate the eventual node_strike (the swipe-landed
  // event).  Server also captures skillLevel + nodeTier at the start so
  // a mid-attempt level-up doesn't shift the expected window.
  /* ═══ v2.3.1680: TOOLS GATE GATHERING ═══
   * Owner: "gate and hide resource extraction for woodcutting, fishing, and
   * mining behind a mayor bro quest where it only becomes visible after
   * giving you the quest and equipment."
   *
   * One tool per gathering skill, held as an ordinary inventory item so it
   * persists, shows up in the bag, and needs no new storage field.  The CLIENT
   * hides nodes it has no tool for; this is the half that makes it true — a
   * modified client that draws them anyway still cannot harvest.
   *
   * Deliberately NOT applied to farming/cooking/the crafting skills: those are
   * not node extraction and the owner named three.  Anything absent from this
   * map is ungated, so adding a fourth gathering skill later does not silently
   * lock it. */
  _GATHER_TOOL_FOR_SKILL: {
    woodcutting: 'woodcutting_axe',
    fishing: 'fishing_pole',
    mining: 'mining_pickaxe',
  },

  /** v2.3.1688: the tool keys as a Set, for the death paths.
   *
   * Owner: "Logs are not getting collected after woodcutting a tree.  Maybe
   * it's the new requirement of having a woodcutting axe interfering with it."
   * Right cause, one step further back: the gate works, and the axe was GONE.
   * v2.3.1680 chose to hold these tools as ordinary inventory items ("needs no
   * new storage field") — and DEATH WIPES ps.inventory.  So dying deleted your
   * axe, pole and pickaxe, permanently, since the quest that granted them
   * cannot be turned in twice.  After that every extraction is refused in
   * silence (both the start and the paying strike gate on the tool), which
   * from the player's side looks exactly like "chopping stopped giving logs".
   * They are equipment, not loot: they neither drop into the death pile nor
   * get wiped. */
  _GATHER_TOOL_KEYS() {
    return new Set(Object.values(this._GATHER_TOOL_FOR_SKILL));
  },

  /** v2.3.1701: does this inventory key survive a death?
   *
   * TWO carve-outs now, one predicate, read by BOTH death paths (the wipe in
   * _handlePlayerDeath / _tickPlayerRespawn and the drop in _spawnDeathPile)
   * so an item can never be kept AND dropped — that would mint a duplicate on
   * the ground, which is the bug the v2.3.1688 tool pass had to avoid too:
   *   1. the gathering TOOLS (v2.3.1688) — equipment held in the bag;
   *   2. QUEST OBJECTIVE items (v2.3.1701) — derived from the shipped quest
   *      table, see quests.js `_isQuestObjectiveItem` for the rationale;
   *   3. GEMS (v2.3.3516) — raw and elemental (gems.js `gem_raw_<e>`,
   *      `gem_<e>`).  They were a pouch beside the bag until this version,
   *      and the pouch was never lost; the owner's gem plan moved them into
   *      the bag (decision 5) saying only that they go "if another player
   *      kills you in No man's land" -- which still holds, as a death there
   *      takes the whole bag, carve-outs and all (`all`, nomansland.js).  An
   *      elemental gem is about an hour's cracking: a monster's kill on the
   *      far side of a land, the pile 60 s yours, would have cost it.
   * Everything else still drops. */
  _keptThroughDeath(key) {
    if (this._GATHER_TOOL_KEYS().has(key)) return true;
    if (parseGemKey(key)) return true;
    return this._isQuestObjectiveItem ? this._isQuestObjectiveItem(key) : false;
  },

  /** Strip everything EXCEPT the death-protected items — the death-wipe
   *  helper.  (Named for the tools it originally spared, v2.3.1688; it now
   *  spares quest objectives too — see _keptThroughDeath.) */
  _keepGatherTools(inventory) {
    const keep = Object.create(null); // rule 4: inventory keys are client-supplied
    if (!inventory) return keep;
    for (const k of Object.keys(inventory)) {
      if (!this._keptThroughDeath(k)) continue;
      const qty = Math.floor(Number(inventory[k]) || 0);
      if (qty > 0) keep[k] = qty;
    }
    return keep;
  },

  /** v2.3.1690: is this player mid-extraction, for the purpose of NOT being
   *  attacked?  Owner: "make it so monsters don't attack you while you're
   *  extracting resources (fishing, mining, etc) it's really annoying and
   *  glitchy."
   *
   *  ═══ v2.3.1704: THE SHIELD IS NO LONGER A STOPWATCH ═══
   *  Owner, a second time: "the monsters keep attacking you while harvesting
   *  resources.  I wanted monsters to ignore you during resource extraction."
   *
   *  The v2.3.1690 version had two problems and one of them made it a total
   *  no-op:
   *
   *   1. THE MESSAGE NEVER ARRIVED.  `extraction_start` is sent by the client
   *      (lifeSkillRewards.js) but had no passthrough line in `channelShim.send`
   *      (src/networking/wsClient.js), which is an ALLOWLIST, not a transport —
   *      TRAPS #18, the same trap that ate `firemaking_request` in v2.3.1702.
   *      So `this.extractions` was empty in production for EVERY player,
   *      `_extractionShielded` always returned false, and the timing anticheat
   *      below (`session._extractionMissing`) counted every strike in the game.
   *      The server suite never saw it because its fixtures send the message
   *      straight down a socket, bypassing the shim.
   *   2. THE CLOCK WAS WRONG ANYWAY.  12 s was reasoned as "the wind-up plus a
   *      normal swipe", but v2.3.1416 had already removed the harvest timeout
   *      (owner: "all resources NOT have a time out window — it'll just stay on
   *      the phase where the resource can be harvested"), so the ready phase
   *      holds for as long as the player takes.  The shield expired UNDER them,
   *      mid-harvest, which is exactly the reported symptom.
   *
   *  So the mechanism is now the player's actual state rather than a timer.
   *  Every clause is an END condition the owner named ("make sure it ends"),
   *  and each maps to a real way an extraction stops — cross-checked against
   *  the client state machine in src/ui/BroTown.jsx (search `S._extraction`):
   *
   *   • no record          — success (`_handleNodeStrike` deletes it), the
   *                          10-minute stale sweep, disconnect (webSocketClose),
   *                          or an attack (`_endExtraction`, below).
   *   • ceiling            — EXTRACT_SHIELD_MS backstop for a client that stops
   *                          telling the truth.  Bounded on purpose.
   *   • dead / dying / gone — you are not harvesting, you are respawning.
   *   • zone changed       — the client's own tick cancels on zone change
   *                          (the node vanishes from S.gatherNodes).
   *   • node died          — depleted by you or by anyone else; the client
   *                          cancels silently on `!_exNode.alive`.
   *   • walked off the node — the radius backstop.  See EXTRACT_SHIELD_RANGE.
   *   • ps.ex went null    — THE FAST ONE, and the reason no new wire message
   *                          was invented for this.  `ex` is the harvest
   *                          activity code (mine|chop|fish|cook|fire) that has
   *                          ridden on every `move` packet since v2.3.1092: the
   *                          client sends it the instant the extraction status
   *                          changes and re-sends on a 500 ms heartbeat while
   *                          it holds.  It therefore goes null within one move
   *                          throttle (~22 ms) of EVERY client-side cancel —
   *                          the joystick nudge (v2.3.1500), the walk-away
   *                          radius, node death, tapping a different node, a
   *                          missed swipe — including the ones that displace
   *                          the player by nothing at all and so are invisible
   *                          to the radius test.  It is client-supplied and
   *                          forgeable, which is why it is an ADDITIONAL
   *                          condition and never a sufficient one.
   *
   *  What a modified client can still buy by lying on all of the above: standing
   *  perfectly still next to a live node it holds the tool for, taking no monster
   *  damage, for up to two minutes, unable to attack (see `_endExtraction`).
   *  That is worth strictly less than walking away, so it is not worth more
   *  machinery.
   *
   *  v2.3.1765: COOKING AND FIREMAKING ARE NOW COVERED TOO.
   *  Owner: "snowmen were still attacking me (attacks from enemies should stop
   *  during cooking and firemaking too)."  This comment used to rule both out
   *  because neither has a server-known node to anchor on, and said the honest
   *  fix was to make the campfire a server object first.  That set the bar in
   *  the wrong place.  The node buys ONE thing — proof you are standing
   *  somewhere specific — and the worst case it is guarding against is a liar
   *  who stands perfectly still and cannot attack, which is worth less than
   *  walking away whether or not there is a tree next to him.  Making the
   *  campfire durable server state to unlock a shield that already tolerates
   *  that outcome would be a lot of storage for no security.
   *  So the cook/fire branch below keeps the bounds that do the real work — a
   *  ceiling (COOK_SHIELD_MS), an anchor on WHERE THE ACTIVITY STARTED
   *  (ps._exX/_exY, stamped server-side in movement.js from the validated
   *  position, not from anything the message claims), the live `ex` signal,
   *  the zone, death, and _endExtraction on any swing — and drops only the
   *  node lookup, which cook and fire have nothing to look up. */
  _extractionShielded(playerId, now) {
    const t = now || Date.now();
    const ps = this.playerState[playerId];
    if (!ps || ps.dead || ps.dying || ps.disconnected) return false;
    if (!ps.ex) return false;
    /* v2.3.1765: cooking and firemaking take the node-free branch.  Checked
       BEFORE the extraction record, because a player who taps a tree and then
       walks off to cook still has a stale record sitting in this.extractions
       (it is swept lazily, on the 10-minute timeout) and must be judged on
       what they are doing NOW. */
    if (ps.ex === 'cook' || ps.ex === 'fire') {
      if (!ps._exAt) return false;
      if (t - ps._exAt >= this.COOK_SHIELD_MS) return false;
      const cdx = (ps.x || 0) - (ps._exX || 0);
      const cdy = (ps.y || 0) - (ps._exY || 0);
      return cdx * cdx + cdy * cdy <= this.COOK_SHIELD_RANGE * this.COOK_SHIELD_RANGE;
    }
    const e = this.extractions[playerId];
    if (!e) return false;
    /* v2.3.3251: a PLANNED harvest's ceiling runs from its window's opening,
       not its first swing.  The tiers' new HP (GATHER_NODE_HP) put up to ~2
       minutes of hits before the gesture -- 104 s on obsidian at Mining 15 --
       and a ceiling counted from the start lapsed under a player still
       harvesting, the report v2.3.1704 fixed.  The bound is as long past the
       hits as it always was; the timer's record (no plan) is unchanged. */
    const ceil = this.EXTRACT_SHIELD_MS + (Array.isArray(e.hits) ? (Number(e.openDelayBase) || 0) : 0);
    if (t - e.startedAt >= ceil) return false;
    if (ps.z !== e.zone) return false;
    /* The node has to still be there.  Cheap linear scan: node lists are a
       handful of entries per zone and this runs once per player per tick. */
    const list = this.nodes[e.zone];
    const n = list ? list.find((x) => x.id === e.nodeId) : null;
    if (!n || !n.alive) return false;
    /* Anchored on the NODE, not on where the player stood at extraction_start:
       the client SNAPS the player onto the gather stance (startExtraction moves
       mining/fishing by up to 86 px) and that snap can land either side of the
       start message. */
    const dx = (ps.x || 0) - n.x;
    const dy = (ps.y || 0) - n.y;
    return dx * dx + dy * dy <= this.EXTRACT_SHIELD_RANGE * this.EXTRACT_SHIELD_RANGE;
  },

  /** v2.3.1704: end an extraction because the player did something that is not
   *  harvesting.  Called from the two attack handlers.
   *
   *  A real client CANNOT attack mid-extraction — src/game/playerActions.js
   *  opens both `attack` and `specialAttack` with `if (S._extraction) return;`
   *  — so this never fires in honest play.  It exists to close the one thing
   *  the state-based shield above would otherwise permit: parking on a node,
   *  holding `ex` up forever, and tanking a pack for free while still swinging.
   *  Deleting the record also correctly restores the timing anticheat, since
   *  the next strike then has no window to be validated against (v2.3.3322:
   *  and is refused, but for the recovery strike -- HARVEST_PROOF). */
  _endExtraction(playerId) {
    if (!playerId) return;
    if (this.extractions[playerId]) delete this.extractions[playerId];
    /* v2.3.1765: the cook/fire branch of _extractionShielded reads ps._exAt,
       not this.extractions, so clearing the record alone would leave a swinging
       cook still shielded — the exact hole this method exists to close, just on
       the new path.  Zeroing the stamp is enough: only a fresh null->active
       edge in movement.js re-arms it. */
    const ps = this.playerState[playerId];
    if (ps) ps._exAt = 0;
  },

  /** Does this player hold the tool for a gathering skill?  True for any skill
   *  that is not tool-gated at all. */
  _hasGatherTool(ps, skill) {
    const key = Object.prototype.hasOwnProperty.call(this._GATHER_TOOL_FOR_SKILL, skill)
      ? this._GATHER_TOOL_FOR_SKILL[skill] : null;
    if (!key) return true;
    return !!(ps && ps.inventory && (ps.inventory[key] || 0) > 0);
  },

  /** v2.3.3038: the kill switch (GATHER_REQ_LVL above) -- `gatherreq: false`
   *  in the liveflags key lifts the level requirement. */
  _gatherReqOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'gatherreq') && !f.gatherreq);
  },

  /** v2.3.3038: is this player's level in the NODE's own skill enough for it?
   *  The skill comes from the node's type, never from what the message claims,
   *  so a mining request can't be dressed up as a level-30 fishing one. */
  _gatherLevelOk(ps, n) {
    if (!n || this._gatherReqOff()) return true;
    const need = gatherReqLvl(n.nodeType, n.tierLvl);
    if (need <= 1) return true;
    const skill = this._harvestSkillName(n.nodeType);
    const ls = ps && ps.lifeSkills && Object.prototype.hasOwnProperty.call(ps.lifeSkills, skill) ? ps.lifeSkills[skill] : null;
    const lvl = (ls && Number(ls.level)) || 1;
    return lvl >= need;
  },

  _handleExtractionStart(session, payload) {
    if (!session || !session.id) return;
    const { nodeId, zone, skill, hitSeq } = payload || {};
    /* v2.3.2956: a cook asks for its hits here too, and is answered with no
       node and no record -- see _planCookHits.  An old client never sends a
       cook here at all (lifeSkillRewards skipped the handshake for cooking
       until this change), so nothing it relied on moves. */
    if (skill === 'cooking') { this._planCookHits(session, payload); return; }
    if (!nodeId || !zone || !skill) return;
    const ps = this.playerState[session.id];
    if (!ps) return;
    const list = this.nodes[zone];
    if (!list) return;
    const n = list.find((x) => x.id === nodeId);
    if (!n || !n.alive) return;
    /* v2.3.1680: no tool, no extraction.  Refused SILENTLY — the client hides
       these nodes, so a request for one is either a stale tap from before the
       tool was spent or a modified client, and neither deserves a reply that
       tells it what it is missing. */
    if (!this._hasGatherTool(ps, skill)) return;
    /* v2.3.3038: nor for a player below the node's level (GATHER_REQ_LVL) --
       also silent: the client refuses with "Need Mining Lv 5" before sending,
       so only a stale tab or a modified client arrives here. */
    if (!this._gatherLevelOk(ps, n)) return;
    const skillLevel = (ps.lifeSkills && ps.lifeSkills[skill] && ps.lifeSkills[skill].level) || 0;
    const nodeTier = n.tierLvl || 1;
    const rec = {
      nodeId, zone, skill,
      startedAt: Date.now(),
      skillLevel, nodeTier,
      openDelayBase: this._computeOpenDelayBase(skillLevel, nodeTier),
    };
    /* v2.3.2956: a client that plays the HITS says so with `hitSeq`, a
       per-attempt counter it gets echoed back, so a plan that arrives late
       for an attempt it has already abandoned is recognised and dropped.  No
       hitSeq is an old client (or one whose worker did not advertise
       caps.gatherhits): it keeps the timer above, byte-identical, and is
       sent nothing it would not understand.  The plan replaces the window
       only for the client that asked for it -- an old client still runs
       computeOpenDelay, and validating it against a plan it never played
       would refuse its harvests as too early. */
    const seq = this._hitSeqOf(hitSeq);
    if (seq) this._planGatherHits(session, ps, n, rec, seq);
    this.extractions[session.id] = rec;
  },

  /** v2.3.2956: a client's hitSeq, or 0 for none (absent, not an integer,
   *  out of range) -- which every caller reads as "the old timer". */
  _hitSeqOf(v) {
    return (typeof v === 'number' && Number.isInteger(v) && v > 0 && v <= GATHER_HITS.SEQ_MAX) ? v : 0;
  },

  /** v2.3.2956: the kill switch.  `gatherhits: false` in the liveflags key
   *  (POST /api/admin/flags -- lower case so that route accepts it, TRAPS
   *  §117) un-advertises caps.gatherhits for anyone who joins after it, AND
   *  answers a client that joined before it with `off`, so its harvest drops
   *  back to the old timer at once instead of waiting out its plan timeout. */
  _gatherHitsOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'gatherhits') && !f.gatherhits);
  },

  /** v2.3.2956: a node's hit points -- see GATHER_HITS.HP_PER_TIER.
   *  v2.3.3251: by the node's TYPE and tier (gatherNodeHp, GATHER_NODE_HP);
   *  with no type -- a cook's fish -- the old 5 x (tier + 1). */
  _gatherNodeHp(tierLvl, nodeType) {
    return gatherNodeHp(tierLvl, nodeType, !this._nodeHpOff());
  },

  /** v2.3.3251: the kill switch (GATHER_NODE_HP above) -- `nodehp: false` in
   *  the liveflags key puts every node back on 5 x (tier + 1). */
  _nodeHpOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'nodehp') && !f.nodehp);
  },

  /** v2.3.3229: the hit ladder's kill switch (gatherHitRoll above) --
   *  `hitladder: false` in the liveflags key puts the dice back to 1..level. */
  _hitLadderOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'hitladder') && !f.hitladder);
  },

  /** v2.3.2956: roll hits until the node's HP is gone.  The LAST hit is the
   *  one that crosses zero, so the plan never carries a hit after the node is
   *  already broken.  MAX_HITS bounds it (see the config).  v2.3.3229: each
   *  hit is the ladder's (gatherHitRoll), 1..level only with the kill switch
   *  thrown.  v2.3.3251: `maxHits`, a cook's own bound (COOK_MAX_HITS); a
   *  node's is MAX_HITS. */
  _rollGatherHits(level, hp, maxHits) {
    const ladder = !this._hitLadderOff();
    const cap = Math.max(1, Math.floor(Number(maxHits) || GATHER_HITS.MAX_HITS));
    const hits = [];
    let left = Math.max(1, Math.floor(Number(hp) || 1));
    while (left > 0) {
      let d = gatherHitRoll(level, Math.random(), ladder);
      if (hits.length >= cap - 1) d = Math.max(d, left);
      hits.push(d);
      left -= d;
    }
    return hits;
  },

  /** v2.3.2956: decide this attempt's hits, rewrite the record's window to
   *  match them, and tell the harvester.
   *
   *  The skill is the NODE's, never the payload's: `skill` arrives from the
   *  client, and taking it at its word would let a tree be cut at the
   *  player's mining level.  (The legacy record above still reads the
   *  payload's -- that path is unchanged on purpose, and its only use is the
   *  timer an old client runs anyway.)
   *
   *  The window: the client lands its hits on the swing's own blows, the
   *  first within one swing of the plan arriving and one swing apart after
   *  that, so the gesture cannot open before (hits - 1) swings have passed
   *  since this record was stamped.  That is the bound -- no jitter, the dice
   *  already vary it.  The gesture that follows needs GESTURE_FLOOR_MS of
   *  real motion on top (1.2 s since v2.3.3036, HONEST_CYCLE), so an honest
   *  strike is never near the edge. */
  _planGatherHits(session, ps, n, rec, seq) {
    const hitSkill = this._harvestSkillName(n.nodeType);
    if (this._gatherHitsOff() || !Object.prototype.hasOwnProperty.call(GATHER_HITS.MS, hitSkill)) {
      this._sendGatherHits(session, { seq, nodeId: rec.nodeId, zone: rec.zone, off: true });
      return;
    }
    const hp = this._gatherNodeHp(rec.nodeTier, n.nodeType);   /* v2.3.3251: by the node's type too */
    const lvl = (ps.lifeSkills && ps.lifeSkills[hitSkill] && ps.lifeSkills[hitSkill].level) || 1;
    const prev = this.extractions[session.id];
    const reuse = !!(prev && Array.isArray(prev.hits) && prev.nodeId === rec.nodeId && prev.zone === rec.zone
      && prev.hp === hp && (rec.startedAt - (prev.rolledAt || 0)) < GATHER_HITS.REUSE_MS);
    rec.hits = reuse ? prev.hits : this._rollGatherHits(lvl, hp);
    rec.hp = hp;
    rec.hitSkill = hitSkill;
    rec.hitLevel = reuse ? prev.hitLevel : lvl;
    rec.rolledAt = reuse ? prev.rolledAt : rec.startedAt;
    rec.openDelayBase = (rec.hits.length - 1) * GATHER_HITS.MS[hitSkill];
    rec.jitter = 0;
    this._sendGatherHits(session, { seq, nodeId: rec.nodeId, zone: rec.zone, hp, hits: rec.hits.slice() });
  },

  /** v2.3.2956: a COOK's hits (owner: "Make it appear for cooking too").
   *
   *  Cooking has no gather node -- the campfire is a client-local prop the
   *  worker has never seen -- so the attempt is named by its FISH, and the
   *  fish is what has the hit points: its tier (_fishTierLvl, the table the
   *  heal reads) through the same 5 x (tier + 1), so a minnow is the owner's
   *  10, and the dice are the COOKING level.  The answer is the same
   *  gather_hits a node gets, with the fishKey where a node's id would be.
   *
   *  NOTHING IS HELD TO IT, on purpose: there is no extraction record, and
   *  cook_request is unchanged -- its bounds stay the flat 1.2 s floor, 20 a
   *  minute and botfp.  Holding a cook to a plan means refusing every cook
   *  whose client and worker disagree about it, and v2.3.1432 is what that
   *  cost the last time (a cook floor read off the worker's view of the
   *  level silently ate legit cooks).  These are the numbers the player
   *  watches; the worker rolls them because dice are the worker's (rule
   *  zero).  No re-roll memory either (REUSE_MS): with nothing enforced,
   *  shopping for a short plan is a modified client's to skip anyway. */
  _planCookHits(session, payload) {
    const ps = this.playerState[session.id];
    if (!ps) return;
    const { fishKey, hitSeq } = payload || {};
    const seq = this._hitSeqOf(hitSeq);
    /* The key only names a tier (_fishTierLvl reads it as a string and
       indexes nothing with it), and it is echoed back, so it is bounded to
       what a real client sends: one raw fish_ key. */
    if (!seq || typeof fishKey !== 'string' || !fishKey.startsWith('fish_') || fishKey.length > 64) return;
    if (this._gatherHitsOff()) {
      this._sendGatherHits(session, { seq, fishKey, off: true });
      return;
    }
    const hp = this._gatherNodeHp(this._fishTierLvl(fishKey));
    const lvl = (ps.lifeSkills && ps.lifeSkills.cooking && ps.lifeSkills.cooking.level) || 1;
    const hits = this._rollGatherHits(lvl, hp, GATHER_HITS.COOK_MAX_HITS);   /* v2.3.3251: a cook keeps the old 40 */
    /* in memory only, for the operator view: _saveRpg writes a fixed field
       list and player_state echoes a fixed set, so neither carries it */
    ps._cookHits = { fishKey, level: lvl, hp, hits, rolledAt: Date.now() };
    this._sendGatherHits(session, { seq, fishKey, hp, hits: hits.slice() });
  },

  /** v2.3.2956: the plan goes to the harvester alone (PRIVILEGED_EVENTS). */
  _sendGatherHits(session, payload) {
    const ws = this._wsBySessionId(session.id);
    if (!ws) return;
    try { ws.send(JSON.stringify({ type: 'gather_hits', payload })); } catch (e) {}
  },

  /** v2.3.2956: the operator view of the plan (admin.js `hitPlan`), so a
   *  headless check can hold what the client played against what the worker
   *  rolled -- the TRAPS #18 lesson: ask the worker, not the browser. */
  _gatherHitPlanFor(playerId) {
    const e = this.extractions[playerId];
    const node = (e && Array.isArray(e.hits))
      ? { nodeId: e.nodeId, skill: e.hitSkill, level: e.hitLevel, hp: e.hp, hits: e.hits.slice(), windowMs: e.openDelayBase, at: e.startedAt }
      : null;
    /* ...or a cook's (_planCookHits), whichever was asked for last: a player
       has one attempt on the go at a time. */
    const ps = this.playerState[playerId];
    const c = ps && ps._cookHits;
    const cook = (c && Array.isArray(c.hits))
      ? { fishKey: c.fishKey, skill: 'cooking', level: c.level, hp: c.hp, hits: c.hits.slice(), windowMs: null, at: c.rolledAt }
      : null;
    if (!node || !cook) return node || cook;
    return cook.at > node.at ? cook : node;
  },

  /* ═══ v2.3.2273: WHY A STRIKE PAID NOTHING ═══
   *
   * Owner: "Chopped logs were not going into my inventory."  The THIRD report
   * of this symptom -- v2.3.1688 was the axe being wiped by death, v2.3.1704
   * was extraction_start never leaving the browser (TRAPS #18) -- and each
   * time the diagnosis cost days, for the same structural reason: every gate
   * below is a bare `return`.  Nine of them, all silent, all indistinguishable
   * from each other and from "the swipe never completed", and the client shows
   * the tree falling regardless because it predicts the deplete locally.
   *
   * So the refusal now says which gate it was.  One string on the session,
   * surfaced through the operator view beside `extracting` / `harvestShield`,
   * which exist for exactly this reason (v2.3.1704's note: the browser's copy
   * of the fact and the worker's copy disagreeing is the tell).  It is
   * diagnosis only -- no gate changed, nothing is now allowed that was not
   * allowed before -- and it costs one assignment on a path that runs at most
   * once per harvest. */
  _strikeRefused(session, why, extra) {
    if (!session || !session.id) return;
    /* Object.create(null): keyed by player id, which comes off the wire --
       CLAUDE.md rule 4, and a plain {} silently no-ops on '__proto__' (three
       incidents in one day, 2026-07-07). */
    if (!this._lastStrikeById) this._lastStrikeById = Object.create(null);
    this._lastStrikeById[session.id] = Object.assign({ why, at: Date.now() }, extra || {});
  },

  /** The operator view's read side.  Null when this player has not struck a
   *  node since the room woke, which is itself an answer: a report of "logs
   *  are not arriving" with nothing here means the strike never reached the
   *  worker at all (the TRAPS #18 shape) rather than being refused by a gate. */
  _lastStrikeFor(playerId) {
    return (this._lastStrikeById && this._lastStrikeById[playerId]) || null;
  },

  /** v2.3.3322: the kill switch (HARVEST_PROOF above) -- `harvestproof: false`
   *  in the live flags pays a strike with no start of its own as before, and
   *  lets a strike with no fingerprint keep its perfect (botfp.js). */
  _harvestProofOn() {
    const f = this._liveFlags;
    return !(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'harvestproof') && !f.harvestproof);
  },

  /** v2.3.3322: may this player's strike with no start of its own be paid as a
   *  recovery strike?  Once every HARVEST_PROOF.RECOVER_MS, the clock spent
   *  when it says yes.  In memory on purpose: a room restart (a deploy) loses
   *  every start record, and forgets this clock with them.  A Map keyed by
   *  the player id (rule 4: an id off the wire). */
  _harvestRecoverOk(playerId, now) {
    if (!this._harvestRecoverAt) this._harvestRecoverAt = new Map();
    const last = this._harvestRecoverAt.get(playerId) || 0;
    if (last && now - last < HARVEST_PROOF.RECOVER_MS) return false;
    this._harvestRecoverAt.set(playerId, now);
    return true;
  },

  _handleNodeStrike(session, payload) {
    if (!session || !session.id) return;
    const { id, zone, accuracy, swipeFp } = payload || {};
    if (!id || !zone) { this._strikeRefused(session, 'no-id-or-zone', { id: id || null, zone: zone || null }); return; }
    const list = this.nodes[zone];
    if (!list) { this._strikeRefused(session, 'zone-has-no-nodes', { zone }); return; }
    const n = list.find((x) => x.id === id);
    if (!n) { this._strikeRefused(session, 'node-not-found', { id, zone, known: list.length }); return; }
    if (!n.alive) { this._strikeRefused(session, 'node-already-dead', { id, zone, respawnAt: n.respawnAt || 0 }); return; }
    /* Position gate -- player must actually be near the node.  The
       client's minigame wouldn't open without proximity but a
       handcrafted node_strike would; check anyway. */
    const ps = this.playerState[session.id];
    if (!ps) { this._strikeRefused(session, 'no-player-state', {}); return; }
    if (ps.z !== zone || ps.dead || ps.disconnected) {
      this._strikeRefused(session, 'player-not-here', { psZone: ps.z, zone, dead: !!ps.dead, disconnected: !!ps.disconnected });
      return;
    }
    /* v2.3.1680: the tool gate again, on the PAYING path.  extraction_start
       already refuses, but that only records intent — a handcrafted
       node_strike skips it entirely, and this is the call that credits the
       harvest.  Gate both or the gate is decorative. */
    if (!this._hasGatherTool(ps, this._harvestSkillName(n.nodeType))) {
      this._strikeRefused(session, 'no-tool', { skill: this._harvestSkillName(n.nodeType) });
      return;
    }
    /* v2.3.3038: and the level gate on the paying path too, for the same
       reason as the tool's -- a handcrafted node_strike skips the start.
       Before the node is spent, so a refused strike costs the world nothing. */
    if (!this._gatherLevelOk(ps, n)) {
      const _sk = this._harvestSkillName(n.nodeType);
      this._strikeRefused(session, 'skill-too-low', { skill: _sk, need: gatherReqLvl(n.nodeType, n.tierLvl),
        have: (ps.lifeSkills && ps.lifeSkills[_sk] && ps.lifeSkills[_sk].level) || 1 });
      return;
    }
    const dx = ps.x - n.x;
    const dy = ps.y - n.y;
    /* v2.3.2273: per-node-type, mirroring the client's reach.  See
       _nodeStrikeRange -- a flat 110 here refused over half of every
       legitimate chop, silently. */
    const strikeR = this._nodeStrikeRange(n.nodeType, n.tierLvl);
    if (dx * dx + dy * dy > strikeR * strikeR) {
      this._strikeRefused(session, 'out-of-range', { dist: Math.round(Math.sqrt(dx * dx + dy * dy)), max: Math.round(strikeR), nodeType: n.nodeType });
      return;
    }

    // ═══ Timing validation against the recorded extraction_start ═══
    //
    // Per v2.3.229 hand-off: the windowed-swipe loop tells us when the
    // attempt began so we can compute the same open-delay window the
    // client did.  If the strike arrives BEFORE the earliest jitter
    // bound, it's a cheat (no human swiped that fast).  If it arrives
    // AFTER the latest bound + window, it's a miss regardless of what
    // accuracy the client claimed.
    //
    // Permissive on missing extraction state (DO restart mid-attempt,
    // legacy clients): treat as a pre-v2.3.229 strike, skip the window
    // check, fall through to existing logic.  We log a counter for
    // visibility but don't reject.
    /* v2.3.3322: ...and since then only against the strike's OWN record; a
       strike without one is a recovery strike or nothing (HARVEST_PROOF). */
    const now = Date.now();
    const ex = this.extractions[session.id];
    let coercedAccuracy = accuracy || 'good';
    let openLatencyMs = null;
    /* v2.3.3430: a test-mode character's strike is not timed or scored --
       no too-early, no start of its own needed, no bot score or hour cap
       (testmode.js).  The gates above (the tool, the level, the reach) and
       the hits' own checks still hold. */
    const _tm = this._testMode(ps);
    if (ex && ex.nodeId === id && ex.zone === zone) {
      /* v2.3.2956: a HIT plan's window is exact (the dice vary it, not a
         jitter), so its record carries jitter 0; the timer's keeps ±15%. */
      const jit = (typeof ex.jitter === 'number') ? ex.jitter : this.EXTRACT_JITTER;
      const jitterLo = 1 - jit;
      const jitterHi = 1 + jit;
      const earliestOpen = ex.startedAt + Math.floor(ex.openDelayBase * jitterLo) - this.EXTRACTION_GRACE_MS;
      const latestClose  = ex.startedAt + Math.ceil(ex.openDelayBase * jitterHi) + this.EXTRACT_WINDOW_MS + this.EXTRACTION_GRACE_MS;
      if (now < earliestOpen && !_tm) {
        // Too early -- impossibly fast swipe.  Drop the strike, leave
        // the node alive, leave extraction state so a legit follow-up
        // can still complete.
        if (!session._extractionRejects) session._extractionRejects = 0;
        session._extractionRejects++;
        this._strikeRefused(session, 'too-early', { earlyBy: earliestOpen - now, openDelayBase: ex.openDelayBase, sinceStart: now - ex.startedAt, hits: Array.isArray(ex.hits) ? ex.hits.length : 0 /* v2.3.2956 */ });
        return;
      }
      /* v2.3.1416 (owner: harvest windows no longer time out): the
         late-strike 'miss' coercion is GONE — the client's ready phase
         now holds indefinitely, so a strike minutes after the window
         opened is legitimate play, not a stale claim.  The too-early
         rejection above (no human swipes before the wind-up ends) is
         the anticheat that matters and stays.  latestClose survives
         only in telemetry. */
      void latestClose;
      // Latency telemetry: ms from earliest-possible-open to swipe.
      openLatencyMs = now - earliestOpen;
    } else {
      if (!ex) {
        if (!session._extractionMissing) session._extractionMissing = 0;
        session._extractionMissing++;
      }
      /* v2.3.3322: no start of its own -- a recovery strike, or refused with
         the node left standing (HARVEST_PROOF).  Counted either way, the
         other-node strike too (it never was). */
      if (this._harvestProofOn() && !_tm) {
        if (ex) session._extractionOtherNode = (session._extractionOtherNode || 0) + 1;
        if (!this._harvestRecoverOk(session.id, now)) {
          const last = this._harvestRecoverAt ? (this._harvestRecoverAt.get(session.id) || 0) : 0;
          const why = ex ? 'other-node' : 'no-start';
          this._strikeRefused(session, why, {
            recordFor: ex ? ex.nodeId : null, recoverInMs: Math.max(0, last + HARVEST_PROOF.RECOVER_MS - now),
          });
          /* the phone predicted its fall: show it standing -- once a node every
             DIRTY_MS a player, so a script hammering refused strikes cannot
             make the room send the node's state round on every one */
          const d = session._proofDirty;
          if (!d || d.id !== n.id || now - d.at >= HARVEST_PROOF.DIRTY_MS) {
            this._markNodeDirty(zone, n.id);
            session._proofDirty = { id: n.id, at: now };
          }
          /* and it is evidence (botfp.js): an honest phone sends one now and then */
          if (typeof this._botfpOnStartless === 'function') this._botfpOnStartless(session, why, now);
          return;
        }
        session._extractionRecovered = (session._extractionRecovered || 0) + 1;
      }
    }
    // Extraction resolved (success or timeout) -- clear the state so a
    // fresh tap doesn't reuse stale timing.
    delete this.extractions[session.id];

    // swipeFp telemetry -- ring-buffered per session for offline
    // anomaly review.  v2.3.1146: now retains the FULL fingerprint
    // (tv/vc/h/n were captured by the client since v2.3.694 but dropped
    // here); the scoring itself lives in _botfpOnStrike below.
    if (swipeFp && typeof swipeFp === 'object' && coercedAccuracy === 'good') {
      if (!session._swipeFps) session._swipeFps = [];
      const fp = {
        ts: now,
        nodeId: id,
        len: Number(swipeFp.len) || 0,
        n: Number(swipeFp.n) || 0,
        ent: Number(swipeFp.ent) || 0,
        tv: Number(swipeFp.tv) || 0,
        vc: Number(swipeFp.vc) || 0,
        h: swipeFp.h != null ? String(swipeFp.h) : null,
        dur: Number(swipeFp.dur) || 0,
        latency: openLatencyMs,
      };
      session._swipeFps.push(fp);
      if (session._swipeFps.length > this.SWIPE_FP_CAP_PER_SESSION) {
        session._swipeFps.shift();
      }
    }
    if (openLatencyMs != null && coercedAccuracy === 'good') {
      if (!session._extractionLatencies) session._extractionLatencies = [];
      session._extractionLatencies.push(openLatencyMs);
      if (session._extractionLatencies.length > this.LATENCY_CAP_PER_SESSION) {
        session._extractionLatencies.shift();
      }
    }

    // Deplete the node + broadcast respawn regardless of outcome (the
    // client already consumed it visually on miss-timeout too).  Same
    // respawn timer either way.
    n.alive = false;
    n.respawnAt = Date.now() + this.NODE_RESPAWN_TIME;
    this._markNodeDirty(zone, n.id);

    // Miss path: no inventory, no XP, no shard, no harvest_credit.
    // Client already knows it missed (it sent accuracy:'miss') so the
    // node delta broadcast is enough.
    if (coercedAccuracy === 'miss') { this._strikeRefused(session, 'miss', {}); return; }

    // v2.3.1146: behavioral anti-bot (botfp.js).  FLAG-ONLY per owner:
    // scores/flags never change gameplay; the two exceptions are the
    // forged-'perfect' entropy cap (bot.accuracy) and the §6 hourly cap
    // (grant:false -- node stays consumed, grant withheld, player_state
    // snaps the client's optimistic prediction back).  Counted on
    // GRANTED harvests only, so the cap is resources/hour as specced.
    const bot = this._botfpOnStrike(session, ps, {
      swipeFp, accuracy: coercedAccuracy,
      skill: this._harvestSkillName(n.nodeType), now,
    });
    if (!bot.grant) {
      this._strikeRefused(session, 'antibot-cap', { accuracy: bot.accuracy || null });
      const wsCap = this._wsBySessionId(session.id);
      if (wsCap) this._sendPlayerState(wsCap, session.id);
      return;
    }

    /* Apply the inventory grant server-side and persist.  Client used
       to do this in _applyFishingReward / _applyWoodReward /
       _applyMiningReward; now it just sends node_strike with the
       accuracy and waits for the player_state event we emit below.
       Slice 18: rate-limit 'perfect' claims so a cheater can't spam
       perfect-accuracy for the doubled yield + XP. */
    const ratedAccuracy = this._ratedHarvestAccuracy(ps, bot.accuracy);
    const invKey = this._harvestInvKey(n.nodeType, n.tierLvl);
    this._strikeRefused(session, 'paid', { invKey, nodeType: n.nodeType });
    const yieldQty = this._harvestYieldMult(ratedAccuracy, n.nodeType);
    if (!ps.inventory) ps.inventory = {};
    ps.inventory[invKey] = (ps.inventory[invKey] || 0) + yieldQty;

    /* lifeSkill XP -- server applies the XP gain and detects level-up.
       Client used to do this via addLifeSkillXp(R.lifeSkills, ...);
       now it predicts the popup locally but the authoritative
       lifeSkills snapshot rides on the player_state event below. */
    const skillName = this._harvestSkillName(n.nodeType);
    /* v2.3.3251: the tier's XP, faded 5+ levels below the player (read
       before the XP below lands, as the game reads it) */
    const xpAmt = this._harvestXpPaid(ps, skillName, n, ratedAccuracy);
    const { leveled, newLevel } = this._addLifeSkillXp(ps, skillName, xpAmt);

    /* Shard roll -- 33% per successful harvest.  Server-rolled so a
       modified client can't force shard drops.  Goes straight into
       inventory under shard_<zone> keyed off node.zone. */
    /* v2.3.3012: a Wheel node drops its LAND's shard -- `home`, server-
       authored by wheelzone.js -- since 'shard_wheel' is not an item; and a
       commons node, which belongs to no element, drops none.  Every other
       zone exactly as before. */
    const shardZone = zone === WHEEL_ZONE ? (n.home || null) : (n.zoneId || zone);
    const shard = shardZone ? this._rollHarvestShard(shardZone) : null;
    if (shard) {
      ps.inventory[shard] = (ps.inventory[shard] || 0) + 1;
    }

    // v2.3.1120: gather-objective quest credit (trader_2 et al).  The
    // client never counted harvests at all -- its only _questKills
    // writers were the kill sites, which wrongly advanced this quest
    // on kills.  The player_state send below carries the new counter.
    this._creditQuestObjective(session.id, 'gather', null);
    /* v2.3.3140: the daily quests count what came out of the node -- by its
       skill (mine / chop / fish) and the yield, so a perfect strike's two
       ores are two (dailyrewards.js) */
    this._drSignal(session.id, 'gather', skillName, yieldQty);

    this._saveRpg(session.id, ps);

    /* Push the new authoritative totals to the picker.  Same
       player_state event the loot path uses; client OVERWRITES
       R.coins / R.inventory / R.lifeSkills wholesale on receive. */
    const ws = this._wsBySessionId(session.id);
    if (ws) {
      this._sendPlayerState(ws, session.id);
      /* Non-deterministic feedback the client can't predict on its
         own (shard roll outcome + level-up confirmation): private
         harvest_credit event so the client can fire the appropriate
         floating popups. */
      try {
        ws.send(JSON.stringify({
          type: 'harvest_credit',
          payload: {
            nodeId: id,
            zone,
            skillName,
            xpAmt,
            leveled,
            newLevel,
            shard,
          },
        }));
      } catch (e) {}
    }
  },
};
