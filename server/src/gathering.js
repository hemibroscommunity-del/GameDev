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
    const TREE = { 1: 'Pine Log', 6: 'Softwood' };
    const FISH = { 1: 'Minnow',   6: 'Clownfish' };
    const ORE  = { 1: 'Copper Ore', 6: 'Iron Ore' };
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
  _ratedHarvestAccuracy(ps, claimed) {
    if (claimed !== 'perfect') return claimed || 'ok';
    const now = Date.now();
    if (!Array.isArray(ps._perfectHistory)) ps._perfectHistory = [];
    // Prune entries older than 60 sec.
    ps._perfectHistory = ps._perfectHistory.filter((t) => (now - t) < 60000);
    if (ps._perfectHistory.length >= 10) {
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
  _harvestXpForTier(tierLvl, accuracy) {
    /* v2.3.1435 (owner): life-skill XP rate x5.  Client mirror:
       createGatherNode in src/data/lifeSkills.js — keep in lockstep.
       v2.3.1765 (owner: "Lifeskills xp is far too slow.  I think you should
       increase it by about 5x"): x5 again, so the rate is 25x the original.
       The LEVEL CURVE is untouched — this multiplies what a swing pays, not
       what a level costs, which is the knob the owner asked for. */
    const baseXp = Math.ceil((((tierLvl || 1) * 1.5) + 5) * 25);
    return Math.ceil(baseXp * this._harvestXpMult(accuracy));
  },

  // lifeSkill level-up threshold curve.  Mirrors LIFE_SKILL_XP on the
  // client (lifeSkills.js): ceil(500 * 1.08^(level - 1)).
  _lifeSkillXpThreshold(level) {
    return Math.ceil(500 * Math.pow(1.08, (level || 1) - 1));
  },

  // Apply XP to a lifeSkill, returns { leveled, newLevel }.  Mirrors
  // addLifeSkillXp on the client; needs to stay byte-identical so
  // local-vs-server level outcomes don't drift.
  _addLifeSkillXp(ps, skill, xpAmt) {
    if (!ps.lifeSkills) ps.lifeSkills = {};
    if (!ps.lifeSkills[skill]) ps.lifeSkills[skill] = { level: 1, xp: 0 };
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
   *      table, see quests.js `_isQuestObjectiveItem` for the rationale.
   * Everything else still drops. */
  _keptThroughDeath(key) {
    if (this._GATHER_TOOL_KEYS().has(key)) return true;
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
    if (t - e.startedAt >= this.EXTRACT_SHIELD_MS) return false;
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
   *  the next strike then has no window to be validated against. */
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

  _handleExtractionStart(session, payload) {
    if (!session || !session.id) return;
    const { nodeId, zone, skill } = payload || {};
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
    const skillLevel = (ps.lifeSkills && ps.lifeSkills[skill] && ps.lifeSkills[skill].level) || 0;
    const nodeTier = n.tierLvl || 1;
    this.extractions[session.id] = {
      nodeId, zone, skill,
      startedAt: Date.now(),
      skillLevel, nodeTier,
      openDelayBase: this._computeOpenDelayBase(skillLevel, nodeTier),
    };
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
    const now = Date.now();
    const ex = this.extractions[session.id];
    let coercedAccuracy = accuracy || 'good';
    let openLatencyMs = null;
    if (ex && ex.nodeId === id && ex.zone === zone) {
      const jitterLo = 1 - this.EXTRACT_JITTER;
      const jitterHi = 1 + this.EXTRACT_JITTER;
      const earliestOpen = ex.startedAt + Math.floor(ex.openDelayBase * jitterLo) - this.EXTRACTION_GRACE_MS;
      const latestClose  = ex.startedAt + Math.ceil(ex.openDelayBase * jitterHi) + this.EXTRACT_WINDOW_MS + this.EXTRACTION_GRACE_MS;
      if (now < earliestOpen) {
        // Too early -- impossibly fast swipe.  Drop the strike, leave
        // the node alive, leave extraction state so a legit follow-up
        // can still complete.
        if (!session._extractionRejects) session._extractionRejects = 0;
        session._extractionRejects++;
        this._strikeRefused(session, 'too-early', { earlyBy: earliestOpen - now, openDelayBase: ex.openDelayBase, sinceStart: now - ex.startedAt });
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
    } else if (!ex) {
      if (!session._extractionMissing) session._extractionMissing = 0;
      session._extractionMissing++;
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
    const xpAmt = this._harvestXpForTier(n.tierLvl, ratedAccuracy);
    const { leveled, newLevel } = this._addLifeSkillXp(ps, skillName, xpAmt);

    /* Shard roll -- 33% per successful harvest.  Server-rolled so a
       modified client can't force shard drops.  Goes straight into
       inventory under shard_<zone> keyed off node.zone. */
    const shard = this._rollHarvestShard(n.zoneId || zone);
    if (shard) {
      ps.inventory[shard] = (ps.inventory[shard] || 0) + 1;
    }

    // v2.3.1120: gather-objective quest credit (trader_2 et al).  The
    // client never counted harvests at all -- its only _questKills
    // writers were the kill sites, which wrongly advanced this quest
    // on kills.  The player_state send below carries the new counter.
    this._creditQuestObjective(session.id, 'gather', null);

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
