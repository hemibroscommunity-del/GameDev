/* ═══ v2.3.1171 (P4 decomposition): MOVEMENT extracted from
 * index.js ═══
 *
 * Behavior-frozen hoist of the webSocketMessage `case 'move'` body --
 * the hottest path in the router -- into a named handler (the switch
 * case now delegates like every other system).  Three parts, all
 * verbatim: the anti-teleport speed cap (500 px/s + 80 px burst,
 * v2.3.229-era), the accept-gated position/facing/equip merge
 * (v2.3.840 / v2.3.1092 / v2.3.1107 postures preserved), and the
 * zone-change streaming block -- protocol-v2 merged zone_state vs the
 * legacy zone_monsters/nodes/loot trio, with the explicit empty flush
 * on safe-zone entry and the v2.3.1147 zone-entry grace stamp.
 * `pong` / `track` stay inline in the router (session-local, two
 * lines each). */

import { VALID_ZONE_IDS, DUNGEON_ZONE_RE } from './data.js';

export const movementMethods = {
  /* v2.3.1625: the ONE zone gate.  Every path that lets a client choose
   * ps.z must run this -- `move` and `join` today.  Membership, not
   * shape: an unlisted string never reaches the zone-keyed maps
   * (this.monsters / nodes / loot), which is what turned z:'__proto__'
   * into a room-wide monster-AI outage (see data.js VALID_ZONE_IDS).
   *
   * DUNGEON ZONES ARE ACCEPTED BY SHAPE, NOT BY LIVENESS.
   * v2.3.1631 -- requiring a live instance FROZE real players.  DO
   * memory is wiped by every deploy (rule 11) and `this._dungeons` is
   * in-memory by design, so a player mid-dungeon when any server/**
   * merge lands reconnects claiming z:'dungeon:<id>' for an instance
   * that no longer exists.  The join path dropped the zone (falling
   * back to town) while their client went on believing it was in the
   * dungeon, so every subsequent `move` carried the dead id -- and the
   * v2.3.1629 "unlisted zone is a whole-message no-op" rule then made
   * each one do nothing at all.  Reproduced against the real GameRoom:
   * position never advanced. That is a hard freeze after every deploy,
   * which is far worse than the exploit the gate was closing.
   * The shape check still carries the weight that matters: the regex
   * bounds charset and length, so '__proto__' and friends cannot get
   * through and the room-wide monster-AI outage stays closed.  Cost of
   * accepting a dead id: a client could mint distinct 'dungeon:xxx'
   * keys in the zone-keyed maps.  Bounded per message, cheap
   * (_ensureZoneMonsters stores an empty array for an unknown zone),
   * and strictly preferable to freezing a paying player.
   *
   * NOT OWNERSHIP either -- instances carry only {id, zone, ownerId,
   * cfg, ...} with no member list, because they are SHARED by design:
   * _dungeonPullPartyMembers (v2.3.1218) re-sends dungeon_started to
   * co-located party members and their normal entry path takes it from
   * there, and rewards + boss HP already scale to everyone present.
   * Gating on ownerId would strand every non-leader party member at the
   * entrance.  (Review notes that instance ids are broadcast in the 1 Hz
   * roster, so a stranger can walk into someone's dungeon -- true, and
   * PRE-EXISTING: shared instances are the documented design.  Written
   * up in the audit doc rather than changed here.) */
  _validZone(z) {
    if (typeof z !== 'string' || z.length === 0 || z.length > 40) return false;
    if (VALID_ZONE_IDS.has(z)) return true;
    return DUNGEON_ZONE_RE.test(z);
  },

  _handleMove(session, ws, msg) {
    if (!session.id || !this.playerState[session.id]) return;
    const ps = this.playerState[session.id];
    const oldZone = ps.z;
    /* v2.3.1631: an unlisted zone id drops the ZONE, never the whole
       message.
       Three shapes of this were wrong before this one, each looking
       correct in isolation:
         v2.3.1625 kept ps.z and fell through, so the move was judged as
         a SAME-zone one and the cap ran between two different maps'
         coordinates -- always rejecting, and lastMoveAt refreshes on
         every processed move so dt never grew: a permanent pin.
         v2.3.1629 returned early instead: no pin, but a client that
         keeps sending a rejected zone stops moving entirely.
         The first version of THIS fix accepted msg.x/msg.y while
         keeping ps.z -- which writes another map's coordinates into the
         current zone, i.e. hands the client exactly the intra-zone
         teleport the cap exists to refuse, and can strand them far from
         anywhere they can legitimately walk back from.
       What ships: drop the zone, do NOT write the position (those
       coordinates belong to a map the server does not agree the player
       is on), and clear lastMoveAt so the next move is treated as a
       first move and skips the cap.

       BE HONEST ABOUT WHAT THIS DOES NOT SOLVE.  A client that sends a
       rejected zone ONCE resynchronises fine.  A client that sends it
       PERSISTENTLY still has its position frozen server-side, because
       every such message returns before the write -- peers see it at a
       stale coordinate and combat.js's zone gate denies its attacks.
       The realistic trigger for that (a dungeon instance wiped by a
       deploy) is closed by accepting dungeon ids on shape, so what
       remains needs a zone shipped client-side that the server does not
       know -- and zones.test.mjs §7 fails CI on exactly that drift, now
       that server-ci.yml also watches src/data/** (v2.3.1634; filtered
       on server/** alone the tripwire could not fire on the client-only
       PR that would cause it).
       The real fix is server-placed zone entry: the server already
       knows the destination and the exit edge, so having it WRITE the
       position removes both this and the C-6 bypass with no heuristic.
       Four attempts at heuristics here produced three different
       freezes; the next person should build that instead.  The v2.3.1629 early-return was itself a freeze (see
       _validZone above): any client that keeps sending a zone the server
       rejects stops moving entirely.  Instead we keep the server's zone
       and still accept the position, with the cap bypassed for this
       message -- the coordinates belong to a different map, so judging
       them against the current one is meaningless and would reject
       forever (the v2.3.1625 pin).  The player stays mobile in the zone
       the server believes they are in, which is the state their next
       legitimate transition corrects. */
    const _zoneRejected = (msg.z !== undefined && msg.z !== null && !this._validZone(msg.z));
    const newZone = (msg.z === undefined || msg.z === null || _zoneRejected) ? ps.z : msg.z;

    // ═══ Movement validation (anti-teleport) ═══
    //
    // Worker used to trust msg.x / msg.y blindly.  A cheater
    // could write into the move event and warp anywhere -- which
    // bypassed the range checks in _handleLootPickup,
    // _handleNodeStrike, _resolvePvPAttack, and the monster aggro
    // distance (all of those compare against ps.x/y after the
    // overwrite).  Now we cap the per-event position delta to a
    // speed * elapsed-time bound.
    //
    // Client max walk speed (calcMoveSpeed in gameSystems.js):
    //   baseSpd = calcMoveSpeed(agility, swiftness)/5.0 * SPEED
    //           = (1 + min(agility*0.0012, 0.60)) * (1 + swiftness
    //             cap 0.50) * 2.5 px/frame
    //   v2.3.1343 audit (Swiftness cap +10% -> +50%): worst legit
    //   stack = 240 (agility cap) × 1.5 (swiftness) × 1.15 (food
    //   buff) × 1.065 (mythic storm amulet) ≈ 441 px/sec — still
    //   under the 500 sustained bound below, burst slack untouched.
    //
    // Cap: 500 px/sec sustained + 80 px burst slack (covers
    // dodge/lunge + a bit of network jitter).  Far below the
    // egregious "teleport across the room" cheat (1024+ px),
    // generous enough for legit lag-recovery jumps.
    //
    // Zone changes legitimately move the player to a new zone's
    // spawn coords -- bypass the check on z-change.  Also bypass
    // on the FIRST move event (no prior position to delta from).
    if (typeof msg.x !== 'number' || typeof msg.y !== 'number') return;
    const _now = Date.now();
    const zoneChanged = newZone !== oldZone;
    const firstMove = typeof ps.lastMoveAt !== 'number';
    let accept = true;
    if (_zoneRejected) {
      /* No position write, and arm the next move to bypass the cap. */
      ps.lastMoveAt = undefined;
      return;
    }
    if (!zoneChanged && !firstMove
        && typeof ps.x === 'number' && typeof ps.y === 'number') {
      const dt = Math.max(0.001, (_now - ps.lastMoveAt) / 1000);
      const maxDist = 500 * dt + 80;
      const dx = msg.x - ps.x;
      const dy = msg.y - ps.y;
      if (dx * dx + dy * dy > maxDist * maxDist) {
        // Reject: do not update ps.x/y.  Still update lastMoveAt
        // so spam-bursts don't compound dt.  dropped silently --
        // client's next legit move will snap back to server view
        // via the broadcast tick.
        accept = false;
      }
    }
    /* ═══ v2.3.1629: THE ZONE-FLIP BYPASS IS *NOT* CLOSED HERE ═══
     *
     * The cap above is skipped on z-change for a real reason -- a
     * transition genuinely teleports you to the destination's entry
     * point -- and nothing re-validates on the way BACK, so two
     * messages (out to any zone at the target coords, then straight
     * back) still write an arbitrary position into the origin zone.
     * Audit C-6, docs/AUDIT-2026-08-03.md.
     *
     * v2.3.1625 tried to close it with a per-zone re-entry speed
     * budget: remember where the player stood in each zone, and hold a
     * re-entry within 5 s to the same 500 px/s bound. Adversarial review
     * of that change found it REJECTS ORDINARY PLAY, twice over:
     *   - the town <-> worldview hub bounce covers 528-720 px in
     *     0.5-1.0 s (the map deliberately places those markers apart)
     *     against a 330-580 px budget, so a player who steps into the
     *     world view and straight back is held in the previous hub;
     *   - leaving a dungeon re-enters the origin zone at a fixed exit
     *     tile that has no relation to where the player stood when they
     *     entered, so the budget fires there too -- and while ps.z is
     *     held back, the new monster_damage zone gate denies every
     *     attack for up to the window, with no feedback.
     * Freezing a real player is strictly worse than the exploit it
     * prevents, and the repo's own posture on this is explicit (a
     * flaky BLOCKING gate is worse than none -- handoff item F).
     *
     * So the budget is REMOVED rather than tuned: a bound generous
     * enough for the hub geometry is ~1200 px, which inside a 32-40
     * tile zone permits essentially the whole map and buys nothing.
     * The zone-VALIDATION half of C-6 stays (above) -- that is what
     * closes the '__proto__' room-wide outage and bounds the zone-keyed
     * maps, and it is sound.
     *
     * THE REAL FIX, when someone picks this up: make zone entry
     * server-placed. The server already knows the destination and the
     * exit edge; having it WRITE the entry position instead of
     * accepting msg.x/msg.y removes the bypass entirely and needs no
     * heuristic. That is a bigger change than an audit follow-up should
     * smuggle in, so it is written down instead of guessed at. */
    ps.lastMoveAt = _now;

    // Position + velocity + flags update only on accept -- and ps.z is
    // INSIDE this block, so a rejected move never changes zone either.
    // We drop EVERYTHING on reject so a cheater can't flip
    // blocking/dodging/dead while teleporting.
    // v2.3.1625: the old note here said zone changes "always set
    // accept=true".  That is no longer so -- a re-entry that fails the
    // budget above is rejected like any other teleport, and the player
    // stays put in the zone they were already in.
    if (accept) {
      ps.x = msg.x; ps.y = msg.y;
      /* v2.3.1107: accept any DEFINED d/f, not just truthy -- today
         both are non-empty strings so `||` worked, but a future
         numeric encoding (0 = north) would silently stop relaying.
         null/undefined still mean "no update" (client sends f: null
         when it has no facing yet). */
      if (msg.d !== undefined && msg.d !== null) ps.d = msg.d;
      ps.z = newZone;
      ps.vx = msg.vx || 0; ps.vy = msg.vy || 0;
      /* v2.3.840: persist the sender's 8-way facing + live equip so
         the tick can relay them -- peers render the correct jog
         direction and live armour on/off. */
      if (msg.f !== undefined && msg.f !== null) ps.f = msg.f;
      if (msg.eqc !== undefined) ps.eqc = msg.eqc;
      if (msg.eql !== undefined) ps.eql = msg.eql;
      if (msg.eqs !== undefined) ps.eqs = msg.eqs;
      /* v2.3.1092: harvest activity code (mine|chop|fish|cook|fire, or
         null). Pure presentation state relayed to peers so they can see
         this player gathering; not authoritative over loot/XP. */
      if (msg.ex !== undefined) ps.ex = msg.ex || null;
      if (msg.dodging !== undefined) ps.dodging = !!msg.dodging;
      if (msg.blocking !== undefined) ps.blocking = !!msg.blocking;
      if (msg.dead !== undefined) ps.dead = !!msg.dead;
      this.dirtyPlayers.add(session.id);
    }

    // Zone change handling.
    if (ps.z !== oldZone) {
      // Lifesteal damage tracking is per-zone; clear so a kill
      // in the new zone can't refund off old-zone monster IDs.
      ps.dmgFromMonster = {};
      if (ps.z !== 'town' && ps.z !== 'farm_home') {
        // Combat zone -- send the new zone's monster + gather +
        // loot state so the client can render them.
        const newMonsters = this._ensureZoneMonsters(ps.z);
        // Zone-entry damage immunity: replaces the prior
        // ENTRY_SAFE_RADIUS monster-shove (visually janky
        // teleport) with a 1500 ms grace window where incoming
        // damage to the player is zeroed.  _applyDamage reads
        // ps._zoneEntryGraceUntil and short-circuits to 0 dmg /
        // 0 dodge while it's in the future, so monsters can
        // walk/swing as normal but the player has a moment to
        // orient before hits land.
        ps._zoneEntryGraceUntil = Date.now() + this.ZONE_ENTRY_GRACE_MS;
        const zoneMonstersWire = newMonsters.map(m => ({
          id: m.id, arch: m.arch, level: m.level, element: m.element,
          x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp, dmg: m.dmg,
          xp: m.xp, gold: m.gold, spd: m.spd, emoji: m.emoji, color: m.color,
          alive: m.alive,
        }));
        const newNodes = this._ensureZoneNodes(ps.z);
        const zoneNodesWire = newNodes.map(n => ({
          id: n.id, nodeType: n.nodeType, x: n.x, y: n.y,
          tierLvl: n.tierLvl, alive: n.alive, respawnAt: n.respawnAt,
        }));
        const zoneLootWire = this._zoneLootForWire(ps.z);
        if (session.protocolVersion === 2) {
          // Protocol v2: one merged snapshot instead of three messages.
          ws.send(JSON.stringify({
            type: 'zone_state', zone: ps.z,
            monsters: zoneMonstersWire, nodes: zoneNodesWire, loot: zoneLootWire,
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'zone_monsters', zone: ps.z, monsters: zoneMonstersWire,
          }));
          ws.send(JSON.stringify({
            type: 'zone_nodes', zone: ps.z, nodes: zoneNodesWire,
          }));
          ws.send(JSON.stringify({
            type: 'zone_loot', zone: ps.z, loot: zoneLootWire,
          }));
        }
      } else {
        // Safe zone (town / farm_home) -- explicitly send empty
        // state for all three so the client clears stale entries
        // from the previous combat zone.  Without this, ember
        // monsters / nodes / loot piles persist in the client's
        // S.monsters / S.gatherNodes / S.groundLoot after the
        // player crosses to town, and render on the town map.
        if (session.protocolVersion === 2) {
          ws.send(JSON.stringify({
            type: 'zone_state', zone: ps.z, monsters: [], nodes: [], loot: [],
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'zone_monsters', zone: ps.z, monsters: [],
          }));
          ws.send(JSON.stringify({
            type: 'zone_nodes', zone: ps.z, nodes: [],
          }));
          ws.send(JSON.stringify({
            type: 'zone_loot', zone: ps.z, loot: [],
          }));
        }
      }
    }
  },
};
