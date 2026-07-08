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

      // Monster AI tick
      this._tickMonsters();

      // Gather-node respawn tick (cheap; iterates Object.keys(this.nodes))
      this._tickNodes();

      // Loot pile expiry tick -- piles older than LOOT_EXPIRY_MS get
      // despawned with a broadcast event so clients drop them too.
      this._tickLoot();

      // Extraction state sweep -- walk-away cancel is silent on the
      // client so any extraction_start without a matching node_strike
      // sits in this.extractions until cleaned here.
      this._sweepStaleExtractions(Date.now());

      // Player respawn tick — flip dying=>alive when respawnAt elapses.
      // Cheap; iterates active player entries.
      this._tickPlayerRespawn();

      // v2.3.1121: duel housekeeping — expire stale challenges, enforce
      // the 15s reconnect-grace forfeit.  Cheap map walks.
      this._tickDuels(Date.now());

      // v2.3.1125: clan-war endings (30-min timer; also resolved lazily
      // on wake for wars that end in an empty room).
      this._tickClanWars(Date.now());

      // v2.3.1126: arena housekeeping -- gather timer, deferred match
      // activation, post-completion cleanup.
      this._tickArena(Date.now());

      // v2.3.1127: dungeon instances -- wave advancement on all-dead,
      // boss spawn, completion settlement, empty-instance sweep.
      this._tickDungeons(Date.now());

      // v2.3.1129: unanswered threat countdowns expire as "ignored"
      // (consent pair granted, both sides notified).
      this._tickThreats(Date.now());

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
      this._tickTrades2(Date.now());

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

      const hasDirty = this.dirtyPlayers.size > 0;
      const hasEvents = this.eventBuffer.length > 0;
      const hasMonsters = this.dirtyMonsters.size > 0;
      const hasNodes = this.dirtyNodes.size > 0;
      if (!hasDirty && !hasEvents && !hasMonsters && !hasNodes) { this.tickSeq++; return; }

      // Build single room-wide tick delta
      const delta = { type: 'tick', seq: this.tickSeq++, ts: Date.now() };

      // Batched player positions (only dirty)
      if (hasDirty) {
        const players = {}; // proto-ok: player-keyed outbound payload; join gate v2.3.1202
        for (const id of this.dirtyPlayers) {
          const ps = this.playerState[id];
          if (ps) players[id] = { x: ps.x, y: ps.y, d: ps.d, z: ps.z, vx: ps.vx, vy: ps.vy, f: ps.f, eqc: ps.eqc, eql: ps.eql, eqs: ps.eqs, ex: ps.ex };
        }
        delta.players = players;
        this.dirtyPlayers.clear();
      }

      // Batched game events (capped).  v2.3.1163: overflow used to be
      // dropped (slice-then-wipe threw away everything past the cap);
      // splice keeps the remainder queued so a burst tick delays
      // events instead of losing them (handoff item L).
      if (hasEvents) {
        delta.events = this.eventBuffer.splice(0, this.EVENTS_PER_TICK_CAP);
      }

      // Monster + node deltas are protocol-versioned: v1 sessions get
      // every entity in each dirty zone (legacy behavior); v2 sessions
      // get only the entities marked dirty this tick (client merges by
      // id, so unsent entries keep their last-known state).  Build each
      // variant only when a session of that version is connected.
      let hasV1 = false, hasV2 = false;
      for (const [, s] of this.sessions) {
        if (s.protocolVersion === 2) hasV2 = true; else hasV1 = true;
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

      let msgV1 = null, msgV2 = null;
      if (hasV1) {
        const v1 = { ...delta };
        if (hasMonsters) {
          const mData = {}; // proto-ok: keyed by server zone names
          for (const zoneId of this.dirtyMonsters) {
            const monsters = this.monsters[zoneId];
            if (!monsters) continue;
            mData[zoneId] = monsters.map(monsterWire);
          }
          v1.monsters = mData;
        }
        if (hasNodes) {
          const nData = {}; // proto-ok: keyed by server zone names
          for (const zoneId of this.dirtyNodes) {
            const list = this.nodes[zoneId];
            if (!list) continue;
            nData[zoneId] = list.map(nodeWire);
          }
          v1.nodes = nData;
        }
        msgV1 = JSON.stringify(v1);
      }
      if (hasV2) {
        const v2 = { ...delta };
        if (hasMonsters) {
          const mData = {}; // proto-ok: keyed by server zone names
          for (const zoneId of this.dirtyMonsters) {
            const monsters = this.monsters[zoneId];
            const ids = this.dirtyMonsterIds[zoneId];
            if (!monsters || !ids) continue;
            const changed = monsters.filter((m) => ids.has(m.id));
            if (changed.length > 0) mData[zoneId] = changed.map(monsterWire);
          }
          if (Object.keys(mData).length > 0) v2.monsters = mData;
        }
        if (hasNodes) {
          const nData = {}; // proto-ok: keyed by server zone names
          for (const zoneId of this.dirtyNodes) {
            const list = this.nodes[zoneId];
            const ids = this.dirtyNodeIds[zoneId];
            if (!list || !ids) continue;
            const changed = list.filter((n) => ids.has(n.id));
            if (changed.length > 0) nData[zoneId] = changed.map(nodeWire);
          }
          if (Object.keys(nData).length > 0) v2.nodes = nData;
        }
        msgV2 = JSON.stringify(v2);
      }
      this.dirtyMonsters.clear();
      this.dirtyNodes.clear();
      this.dirtyMonsterIds = {};
      this.dirtyNodeIds = {};

      for (const [ws, s] of this.sessions) {
        const msg = s.protocolVersion === 2 ? msgV2 : msgV1;
        if (msg) { try { ws.send(msg); } catch {} }
      }
    }, this.TICK_RATE);
  },
};
