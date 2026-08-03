/* ═══ v2.3.1174 (P4 decomposition): TICK LOOP extracted from
 * index.js ═══
 *
 * The roadmap's explicit "do this slice LAST" item -- the 45Hz
 * (TICK_RATE=22ms) heartbeat that runs the whole world: lag-comp
 * state-history snapshots, every _tick*() system call (monsters,
 * nodes, loot, extractions, respawn, duels, clan wars, arena,
 * dungeons, threats, cadence, trades), the regen and keepalive-ping
 * dividers, the pending player_state flush, and the batched tick
 * delta (dirty players + capped event buffer + protocol-versioned
 * monster/node deltas -- v1 full dirty-zone lists, v2 per-entity).
 * Hoisted verbatim as one method; the interval body stays an inline
 * closure exactly as before (test/tick.test.mjs §10 drives it live
 * via startTickLoop and pins the v2.3.1163 overflow behavior).
 * Start/stop call sites (webSocketConnect first-join, webSocketClose
 * last-leave) stay in index.js untouched. */

export const tickMethods = {
  startTickLoop() {
    let pingCounter = 0;
    let regenCounter = 0;

    this.tickInterval = setInterval(() => {
      // §16.12 — Snapshot player states to history buffer
      for (const [id, ps] of Object.entries(this.playerState)) {
        if (!this.stateHistory[id]) this.stateHistory[id] = [];
        this.stateHistory[id].push({
          x: ps.x, y: ps.y, d: ps.d, z: ps.z,
          dodging: ps.dodging || false,
          blocking: ps.blocking || false,
          dead: ps.dead || false,
          tick: this.tickSeq,
        });
        if (this.stateHistory[id].length > this.LAGCOMP_BUFFER_TICKS) {
          this.stateHistory[id].shift();
        }
      }

      /* v2.3.1562 (owner: "I just died and it didn't return me to town —
         stuck at 0 HP, could still mine next to me").

         Every subsystem below used to run as ONE unguarded sequence, and
         the order is load-bearing: _tickPlayerRespawn sits DOWNSTREAM of
         _tickMonsters.  Monster AI is also where player death is
         triggered (_handlePlayerDeath, via the monster→player damage
         path), so a throw anywhere in monster AI — including inside the
         death flow it just started — aborts the rest of THAT tick, and
         if the condition repeats it aborts every tick after it.  The
         player is left marked dying with respawnAt set and nothing ever
         reaches the code that clears it.  That is exactly the reported
         shape: dead forever, world otherwise responsive (mining runs off
         the message handler, which is a different code path entirely and
         keeps working while the tick is broken).

         `guard` isolates each system: one failing subsystem no longer
         takes the other twelve down with it, and respawn in particular
         can no longer be starved by anything upstream.  Failures are
         counted rather than logged per-tick — at 45Hz a logging loop
         would be its own outage. */
      const guard = (label, fn) => {
        try { fn(); } catch (e) {
          this._tickErrs = this._tickErrs || Object.create(null);
          this._tickErrs[label] = (this._tickErrs[label] || 0) + 1;
          if (this._tickErrs[label] === 1) {
            try { console.error('[tick] ' + label + ' threw:', e && e.message); } catch {}
          }
        }
      };

      // Monster AI tick
      guard('monsters', () => this._tickMonsters());

      // Gather-node respawn tick (cheap; iterates Object.keys(this.nodes))
      guard('nodes', () => this._tickNodes());

      // Loot pile expiry tick -- piles older than LOOT_EXPIRY_MS get
      // despawned with a broadcast event so clients drop them too.
      guard('loot', () => this._tickLoot());

      // Extraction state sweep -- walk-away cancel is silent on the
      // client so any extraction_start without a matching node_strike
      // sits in this.extractions until cleaned here.
      guard('extractions', () => this._sweepStaleExtractions(Date.now()));

      // Player respawn tick — flip dying=>alive when respawnAt elapses.
      // Cheap; iterates active player entries.
      guard('respawn', () => this._tickPlayerRespawn());

      // v2.3.1121: duel housekeeping — expire stale challenges, enforce
      // the 15s reconnect-grace forfeit.  Cheap map walks.
      guard('duels', () => this._tickDuels(Date.now()));

      // v2.3.1125: clan-war endings (30-min timer; also resolved lazily
      // on wake for wars that end in an empty room).
      guard('clanWars', () => this._tickClanWars(Date.now()));

      // v2.3.1622: expire pending clan invites + trade offers.  Both
      // maps had a TTL that was only ever used to reject a late accept;
      // nothing deleted the entries, so they grew for the life of the
      // DO.  Cheap map walks, same slot shape as trades2/party below.
      guard('clanInvites', () => this._tickClanInvites(Date.now()));
      guard('tradeOffers', () => this._tickTradeOffers(Date.now()));

      // v2.3.1126: arena housekeeping -- gather timer, deferred match
      // activation, post-completion cleanup.
      guard('arena', () => this._tickArena(Date.now()));

      // v2.3.1127: dungeon instances -- wave advancement on all-dead,
      // boss spawn, completion settlement, empty-instance sweep.
      guard('dungeons', () => this._tickDungeons(Date.now()));

      // v2.3.1129: unanswered threat countdowns expire as "ignored"
      // (consent pair granted, both sides notified).
      guard('threats', () => this._tickThreats(Date.now()));

      // v2.3.1149: global cadence settlement -- rate-limited to one
      // storage read per ~60s per DO lifetime (the _opPruneMaybe
      // pattern).  Joins and deposits also resolve lazily, so this
      // slot only matters for a room that stays occupied across a
      // week boundary.  v2.3.1150: the daily metrics snapshot rides
      // the same slot (same reasoning: covers a room occupied across
      // midnight with no joins).
      {
        const nowJp = Date.now();
        if (!this._lastJackpotCheck || nowJp - this._lastJackpotCheck > 60000) {
          this._lastJackpotCheck = nowJp;
          this._jackpotMaybeResolve(nowJp).catch(() => {});
          this._metricsMaybe(nowJp).catch(() => {});
        }
      }

      // v2.3.1132: expire idle two-sided trade sessions + invites.
      guard('trades2', () => this._tickTrades2(Date.now()));

      // v2.3.1185: party housekeeping -- expire invites, sweep members
      // past the offline grace, re-echo rosters at the vitals cadence
      // (cross-zone HP bars).  Cheap map walks; rooms rarely hold more
      // than a handful of parties.
      this._tickParties(Date.now());

      // HP regen tick — every 30 server ticks (~670 ms at TICK_RATE=22).
      // Skip when no one needs healing to avoid wasted iteration.
      regenCounter++;
      if (regenCounter >= 30) {
        regenCounter = 0;
        this._tickPlayerRegen();
      }

      // §16.8 aggregated player_state flush.  Tick-path mutations
      // (monster attacks, regen, respawn, combat XP) queue here
      // instead of emitting per-mutation, so multiple per-tick
      // updates to the same player collapse to one wire emit.
      this._flushPendingPlayerStates();

      // Periodic ping for RTT estimation + idle-session eviction (every ~3s at 30Hz)
      pingCounter++;
      if (pingCounter >= 90) {
        pingCounter = 0;
        const nowMs = Date.now();
        const pingMsg = JSON.stringify({ type: 'ping', ts: nowMs });
        for (const [ws, session] of this.sessions) {
          if (nowMs - session.lastRecv > this.IDLE_TIMEOUT_MS) {
            try { ws.close(1000, 'idle timeout'); } catch {}
            continue;
          }
          session.lastPing = nowMs;
          try { ws.send(pingMsg); } catch {}
        }
      }

      /* ═══ v2.3.1575: INTEREST MANAGEMENT ═══
       *
       * The tick used to fan EVERY dirty zone's entities out to EVERY
       * socket in the room, and the client threw almost all of it away
       * -- wsClient.js reads only `msg.monsters[myZone]`, and
       * entityRenderer.js skips any peer whose zone differs.  Measured
       * on the real GameRoom (7 zones x 25 monsters): monsters were
       * 66% of all egress with only 14% of that the receiver's own
       * zone, players another 31% room-wide, events just 1%.  ~85% of
       * every byte sent was unusable by the receiver, which is why a
       * player standing ALONE in a zone still pulled 204 KB/s
       * (~1.5 Mbit/s) -- brutal on the primary platform, iPhone Safari
       * on cellular.  CPU was never the problem (load-tick.mjs: 1 ms of
       * a 22 ms budget at 120 players), so every prior optimization
       * tuned the CONTENTS of the broadcast and none tuned its
       * AUDIENCE.  This does the latter.
       *
       * Scoped: monsters + nodes, to the receiver's own zone.  This also
       * stops dungeon instances leaking their contents to the whole room.
       * NOT scoped: `events` -- they measured at 1% of egress, and the
       * buffer mixes zone-local combat with room-wide social relays
       * (chat/emote/clan), so filtering them buys ~nothing and risks
       * silently dropping social traffic.  Left exactly as it was.
       *
       * Players: same-zone peers keep full 45Hz fidelity.  Out-of-zone
       * peers ride a 1 Hz PRESENCE ROSTER instead of the per-tick dirty
       * list -- they cannot be rendered (the renderer skips them), but
       * the client's ghost-sweep DELETES any peer silent for 10 s and
       * derives the online count from that map, so dropping them
       * outright would collapse the roster to your own zone.  1 Hz
       * gives that sweep 10x margin.  The roster is unconditional (all
       * players, not just dirty) so an idle peer can never age out.
       *
       * Deploy-order safe with NO caps flag (rule 19): an old client
       * already ignores other-zone entities and already tolerates a
       * 1 Hz peer refresh, so nothing is claimed and nothing changes
       * for it.  Serialization stays "build once, send many" -- now
       * once per (zone, protocolVersion) group rather than once per
       * protocol version. */
      const presenceTick = (this.tickSeq % this.PRESENCE_REFRESH_TICKS) === 0;

      const hasDirty = this.dirtyPlayers.size > 0;
      const hasEvents = this.eventBuffer.length > 0;
      const hasMonsters = this.dirtyMonsters.size > 0;
      const hasNodes = this.dirtyNodes.size > 0;
      if (!hasDirty && !hasEvents && !hasMonsters && !hasNodes && !presenceTick) { this.tickSeq++; return; }

      const seq = this.tickSeq++;
      const ts = Date.now();

      const playerWire = (ps) => ({
        x: ps.x, y: ps.y, d: ps.d, z: ps.z, vx: ps.vx, vy: ps.vy,
        f: ps.f, eqc: ps.eqc, eql: ps.eql, eqs: ps.eqs, ex: ps.ex,
        /* v2.3.1576: verified Hemi Bro token id, or undefined.  SERVER-OWNED
           (broverify.js is the only writer) and absent from
           TRACK_COSMETIC_KEYS, so a client cannot set it by sending it. */
        bro: ps.bro,
      });

      // Dirty players bucketed by the zone they are standing in, so a
      // group only pays for the peers its members can actually see.
      const dirtyByZone = new Map();
      for (const id of this.dirtyPlayers) {
        const ps = this.playerState[id];
        if (!ps) continue;
        let arr = dirtyByZone.get(ps.z);
        if (!arr) dirtyByZone.set(ps.z, arr = []);
        arr.push([id, ps]);
      }
      this.dirtyPlayers.clear();

      // 1 Hz presence roster -- EVERY connected player, dirty or not
      // (see the ghost-sweep note above; an idle peer is never dirty).
      let roster = null;
      if (presenceTick) {
        roster = Object.create(null);
        for (const [id, ps] of Object.entries(this.playerState)) {
          if (ps) roster[id] = playerWire(ps);
        }
      }

      /* Batched game events (capped).  v2.3.1163: overflow used to be
         dropped (slice-then-wipe threw away everything past the cap);
         splice keeps the remainder queued so a burst tick delays
         events instead of losing them (handoff item L).

         v2.3.1618: that cap counts ENTRIES, never bytes -- 500 events of
         unbounded size was a legal tick payload, and this array is
         re-stringified once per (zone, protocolVersion) group below, so
         an oversized frame is paid for repeatedly on the single DO
         thread.  A byte ceiling now runs alongside the count.  The
         v2.3.1163 property is preserved exactly: whatever does not fit
         STAYS QUEUED for the next tick rather than being discarded, so
         this delays a burst, it does not lose it.  At least one event
         always goes through, so a single oversized entry can never wedge
         the queue behind it. */
      let events = null;
      if (hasEvents) {
        const cap = Math.min(this.eventBuffer.length, this.EVENTS_PER_TICK_CAP);
        let take = 0, bytes = 0;
        while (take < cap) {
          const b = JSON.stringify(this.eventBuffer[take]).length;
          if (take > 0 && bytes + b > this.EVENT_BYTES_PER_TICK) break;
          bytes += b; take++;
        }
        events = this.eventBuffer.splice(0, take);
      }

      const monsterWire = (m) => ({
        id: m.id, x: Math.round(m.x), y: Math.round(m.y),
        hp: m.hp, alive: m.alive,
      });
      // Gather-node deltas carry only state-change fields (alive /
      // respawnAt).  The full node payload (type / x / y / tierLvl) is
      // sent once at state_sync or zone change; the client already has
      // the position.
      const nodeWire = (n) => ({ id: n.id, alive: n.alive, respawnAt: n.respawnAt });

      /* Monster + node deltas stay protocol-versioned: v1 sessions get
         every entity in the zone (legacy behavior); v2 sessions get
         only the entities marked dirty this tick (client merges by id,
         so unsent entries keep their last-known state). */
      const buildFor = (zone, pv) => {
        const d = { type: 'tick', seq, ts };
        let any = false;

        const players = Object.create(null);
        let hasPlayers = false;
        if (roster) {
          for (const id of Object.keys(roster)) { players[id] = roster[id]; hasPlayers = true; }
        }
        const dz = dirtyByZone.get(zone);
        if (dz) {
          for (const [id, ps] of dz) { players[id] = playerWire(ps); hasPlayers = true; }
        }
        if (hasPlayers) { d.players = players; any = true; }

        if (events) { d.events = events; any = true; }

        // Zone-scoped entities.  A session with no resolved zone (still
        // pre-join) simply gets none -- its state_sync carries the world.
        if (zone) {
          if (this.dirtyMonsters.has(zone)) {
            const monsters = this.monsters[zone];
            if (monsters) {
              let list = null;
              if (pv === 2) {
                const ids = this.dirtyMonsterIds[zone];
                if (ids) {
                  const changed = monsters.filter((m) => ids.has(m.id));
                  if (changed.length > 0) list = changed;
                }
              } else {
                list = monsters;
              }
              if (list) {
                const mData = Object.create(null);
                mData[zone] = list.map(monsterWire);
                d.monsters = mData;
                any = true;
              }
            }
          }
          if (this.dirtyNodes.has(zone)) {
            const nodes = this.nodes[zone];
            if (nodes) {
              let list = null;
              if (pv === 2) {
                const ids = this.dirtyNodeIds[zone];
                if (ids) {
                  const changed = nodes.filter((n) => ids.has(n.id));
                  if (changed.length > 0) list = changed;
                }
              } else {
                list = nodes;
              }
              if (list) {
                const nData = Object.create(null);
                nData[zone] = list.map(nodeWire);
                d.nodes = nData;
                any = true;
              }
            }
          }
        }

        return any ? JSON.stringify(d) : null;
      };

      // One serialization per (zone, protocolVersion) group, reused
      // across every socket in that group.
      const groupCache = new Map();
      for (const [ws, s] of this.sessions) {
        const ps = s.id ? this.playerState[s.id] : null;
        const zone = ps ? ps.z : null;
        const pv = s.protocolVersion === 2 ? 2 : 1;
        const key = pv + '|' + zone;
        let msg = groupCache.get(key);
        if (msg === undefined) { msg = buildFor(zone, pv); groupCache.set(key, msg); }
        if (msg) { try { ws.send(msg); } catch {} }
      }

      // Cleared AFTER the send loop -- buildFor reads them lazily.
      this.dirtyMonsters.clear();
      this.dirtyNodes.clear();
      this.dirtyMonsterIds = {};
      this.dirtyNodeIds = {};
    }, this.TICK_RATE);
  },
};
