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
   * Dungeon instances are checked against the LIVE instance map, not
   * just the id shape: a well-formed 'dungeon:' string for an instance
   * that does not exist is still a forged zone, and letting one in
   * would re-open the unbounded-key growth this gate closes.
   *
   * EXISTENCE, NOT OWNERSHIP -- deliberately.  Instances carry only
   * {id, zone, ownerId, cfg, ...} with no member list, because they are
   * SHARED by design: _dungeonPullPartyMembers (v2.3.1218) just re-sends
   * dungeon_started to co-located party members and their normal entry
   * path takes it from there, and rewards + boss HP already scale to
   * everyone present (dungeon.js).  Gating on ownerId would therefore
   * strand every non-leader party member at the entrance -- a worse bug
   * than the one being fixed, and a behavior change this audit did not
   * ask for.  Tighten only alongside a real membership roster. */
  _validZone(z) {
    if (typeof z !== 'string' || z.length === 0 || z.length > 40) return false;
    if (VALID_ZONE_IDS.has(z)) return true;
    if (!DUNGEON_ZONE_RE.test(z)) return false;
    if (!this._dungeons) return false;
    return this._dungeons.has(z.slice('dungeon:'.length));
  },

  _handleMove(session, ws, msg) {
    if (!session.id || !this.playerState[session.id]) return;
    const ps = this.playerState[session.id];
    const oldZone = ps.z;
    /* v2.3.1625: an unlisted zone id is DROPPED, not adopted -- the
       player simply stays where they are (the client's next move snaps
       back off the broadcast tick, the same recovery the rejected-move
       path below relies on).  Silently keeping the old zone beats
       closing the socket: a legitimate client that somehow sends an
       unknown zone keeps playing instead of being kicked. */
    const newZone = (msg.z !== undefined && msg.z !== null && this._validZone(msg.z))
      ? msg.z
      : ps.z;

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
    if (!zoneChanged && !firstMove && typeof ps.x === 'number' && typeof ps.y === 'number') {
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
    } else if (zoneChanged && !firstMove) {
      /* v2.3.1625: close the zone-flip bypass.  The cap above is
         skipped on z-change for a real reason (a transition genuinely
         teleports you to the destination's entry point), but nothing
         re-validated on the way BACK -- so two messages, one to any
         other zone at the target coords and one straight back, wrote an
         arbitrary position into the original zone.  That defeated every
         range check downstream (loot pickup, node strike,
         _resolvePvPAttack, monster aggro) -- the exact bypasses this cap
         was written to close, and the control TRAPS #13 cites as having
         HELD while `track` was open.  It did not.
         Fix: remember where the player stood in each zone this session,
         and on RE-ENTRY within ZONE_REENTRY_MS hold them to the same
         speed budget measured from that remembered spot.  Legitimate
         travel is untouched -- edge-based transitions put you back near
         the border you left from, and at a 4 s round trip the budget is
         ~2000 px against a ~1500 px map, so it cannot fire; a sub-second
         flip gets ~180 px, which is exactly the exploit.
         Keyed by client-supplied zone id -> Map, not {} (TRAPS #6).
         Lives on the SESSION, so it is never persisted or echoed, and a
         genuine reconnect legitimately re-places the player. */
      if (!session._zonePos) session._zonePos = new Map();
      if (typeof ps.x === 'number' && typeof ps.y === 'number') {
        session._zonePos.set(oldZone, { x: ps.x, y: ps.y, at: _now });
      }
      const prior = session._zonePos.get(newZone);
      if (prior && (_now - prior.at) < this.ZONE_REENTRY_MS) {
        const dt = Math.max(0.001, (_now - prior.at) / 1000);
        const maxDist = 500 * dt + 80;
        const dx = msg.x - prior.x;
        const dy = msg.y - prior.y;
        if (dx * dx + dy * dy > maxDist * maxDist) accept = false;
      }
    }
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
