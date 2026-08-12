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
    const W = zone.w * this.TILE;
    const H = zone.h * this.TILE;
    const margin = 8 * this.TILE; // matches client lifeSkills.js inset
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
    const MIN_NODE_GAP = 6 * this.TILE;
    const placeOne = (type) => {
      let x = 0, y = 0, bestD = -1;
      for (let att = 0; att < 40; att++) {
        const cx = margin + Math.random() * (W - margin * 2);
        const cy = margin + Math.random() * (H - margin * 2);
        let dMin = Infinity;
        for (const o of nodes) dMin = Math.min(dMin, Math.hypot(o.x - cx, o.y - cy));
        if (dMin > bestD) { bestD = dMin; x = cx; y = cy; }
        if (dMin >= MIN_NODE_GAP) break;
      }
      const tierLvl = 1;
      nodes.push({
        id: 'sn-' + zoneId + '-' + idx,
        nodeType: type,
        x, y,
        tierLvl,
        alive: true,
        respawnAt: 0,
      });
      idx++;
    };
    for (let i = 0; i < cfg.treeCt; i++) placeOne('tree');
    for (let i = 0; i < cfg.fishCt; i++) placeOne('fishSpot');
    for (let i = 0; i < cfg.oreCt; i++) placeOne('oreVein');
    return nodes;
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
    const TREE = { 1: 'Kindling', 6: 'Softwood' };
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
       createGatherNode in src/data/lifeSkills.js — keep in lockstep. */
    const baseXp = Math.ceil((((tierLvl || 1) * 1.5) + 5) * 5);
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

  _handleNodeStrike(session, payload) {
    if (!session || !session.id) return;
    const { id, zone, accuracy, swipeFp } = payload || {};
    if (!id || !zone) return;
    const list = this.nodes[zone];
    if (!list) return;
    const n = list.find((x) => x.id === id);
    if (!n || !n.alive) return;
    /* Position gate -- player must actually be near the node.  The
       client's minigame wouldn't open without proximity but a
       handcrafted node_strike would; check anyway. */
    const ps = this.playerState[session.id];
    if (!ps || ps.z !== zone || ps.dead || ps.disconnected) return;
    /* v2.3.1680: the tool gate again, on the PAYING path.  extraction_start
       already refuses, but that only records intent — a handcrafted
       node_strike skips it entirely, and this is the call that credits the
       harvest.  Gate both or the gate is decorative. */
    if (!this._hasGatherTool(ps, this._harvestSkillName(n.nodeType))) return;
    const dx = ps.x - n.x;
    const dy = ps.y - n.y;
    if (dx * dx + dy * dy > this.NODE_STRIKE_RANGE * this.NODE_STRIKE_RANGE) return;

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
    if (coercedAccuracy === 'miss') return;

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
