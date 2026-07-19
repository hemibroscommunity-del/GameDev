/* ═══ v2.3.1172 (P4 decomposition): PERSISTENCE CORE extracted from
 * index.js ═══
 *
 * Behavior-frozen move of the rpg-blob load/save pair and the
 * player_state emit path out of the GameRoom class body (same mixin
 * pattern as market.js).  These are the most-called methods in the
 * room -- every system persists through _saveRpg and echoes through
 * _sendPlayerState via `this` -- so the move changes no call site.
 *
 * Load-bearing invariants preserved verbatim:
 *   - _saveRpg writes the blob from a FIXED field list (handoff rule
 *     1): any field not listed is silently dropped on the next save.
 *     _v = RPG_SCHEMA_VERSION is the one blessed exception.
 *   - _loadRpg runs the v2.3.1152 migration registry, re-putting a
 *     changed blob exactly once (fail-open).
 *   - _sendPlayerState is protocol-versioned: v2 sessions get a
 *     field-level delta against session.lastPlayerStateSent (skip on
 *     zero changes); v1 gets the full snapshot every time.
 * The identity pair (_phraseHash/_verifyJoinAuth) and the join
 * bootstrap stay in index.js -- they belong to the join slice. */

import { RPG_SCHEMA_VERSION, runRpgMigrations, healLifeSkills } from './migrations.js';

export const persistenceMethods = {
  async _loadRpg(playerId) {
    try {
      const stored = await this.state.storage.get('rpg:' + playerId);
      // v2.3.1152: run-once migration registry replaces the every-load
      // _healLifeSkills branch.  Migrate-and-reput: a clean current
      // blob (_v === RPG_SCHEMA_VERSION) costs zero writes; a legacy
      // or restored-snapshot blob converges in ONE re-put and never
      // migrates again.  runRpgMigrations never throws (fail-open).
      if (stored && runRpgMigrations(stored).changed) {
        try { await this.state.storage.put('rpg:' + playerId, stored); } catch (e) { /* best-effort */ }
      }
      return stored || null;
    } catch (e) {
      return null;
    }
  },

  // v2.3.769: records bootstrapped from pre-fix clients carry lifeSkills
  // with ARRAYS object-spread into plain objects (pets: {0:..}) and null
  // into {} (activePet) -- the client-side merge bug that caused the
  // multiplayer corruption storm.  v2.3.1152: body moved to the pure
  // healLifeSkills in migrations.js (it's migration v1 AND the join
  // bootstrap's boundary heal); this wrapper stays for call-site
  // compatibility.
  _healLifeSkills(stored) {
    return healLifeSkills(stored);
  },

  // Prune expired buff entries from ps._buffs.  _buffActive treats
  // past timestamps as inactive, but unpruned entries would otherwise
  // accumulate forever (each persisted to storage).  Called from
  // _saveRpg so pruning lands every time we persist.
  _pruneBuffs(ps) {
    if (!ps || !ps._buffs) return;
    const now = Date.now();
    for (const k of Object.keys(ps._buffs)) {
      if (typeof ps._buffs[k] !== 'number' || ps._buffs[k] <= now) {
        delete ps._buffs[k];
      }
    }
  },

  async _saveRpg(playerId, ps) {
    if (!playerId || !ps) return;
    this._pruneBuffs(ps);
    try {
      await this.state.storage.put('rpg:' + playerId, {
        coins: ps.coins || 0,
        inventory: ps.inventory || {},
        lifeSkills: ps.lifeSkills || {},
        // v2.3.1192 (amulet forge): the gold nugget/bar ledger -- the
        // forge ingredients, server-owned now (amulet.js).  Client-local
        // before this slice; join.js one-time-captures legacy counts.
        // Absent field on an old record deliberately reads as "not
        // captured yet" (typeof check in join.js), so no migration.
        goldNuggets: Math.max(0, Math.floor(ps.goldNuggets || 0)),
        goldBars: Math.max(0, Math.floor(ps.goldBars || 0)),
        // v2.3.1198 (gem income): one-time-capture stamp for the
        // previously client-local gems map (which itself lives inside
        // lifeSkills above).  Absent on a pre-slice record = "claim not
        // captured yet" (_gemsAdoptOnJoin, amulet.js); server-internal,
        // deliberately NOT echoed in _sendPlayerState below.
        gemsCaptured: !!ps.gemsCaptured,
        level: ps.level || 1,
        xp: ps.xp || 0,
        unspentT2: ps.unspentT2 || 0,
        buildPointsThisLvl: ps.buildPointsThisLvl || 0,
        hp: typeof ps.hp === 'number' ? ps.hp : 100,
        maxHp: typeof ps.maxHp === 'number' ? ps.maxHp : 100,
        stamina: typeof ps.stamina === 'number' ? ps.stamina : 100,
        maxStamina: typeof ps.maxStamina === 'number' ? ps.maxStamina : 100,
        mana: typeof ps.mana === 'number' ? ps.mana : 100,
        maxMana: typeof ps.maxMana === 'number' ? ps.maxMana : 100,
        // Raw stats (clamped to per-level cap by _handleStatsUpdate).
        // Persisted so reconnects don't bootstrap from a freshly-spoofed
        // join payload.  Cheater would need to re-cheat through the
        // clamp on every stats_update.
        power: ps.power || 0,
        vitality: ps.vitality || 0,
        endurance: ps.endurance || 0,
        agility: ps.agility || 0,
        mind: ps.mind || 0,
        // v2.3.1155: the five retired T2 stats are GONE from the save
        // (the strip-retired-t2 migration cleans stored blobs).  Their
        // successors live on the channel grids (BALANCE-PLAN §8).
        // Active food buff timers (endsAt timestamps).  Persisted so
        // they survive reconnect.  Expired entries get pruned lazily
        // by _buffActive checks; no need to clean on save.
        _buffs: ps._buffs || {},
        // Equipment slots.  Stored as opaque objects the client
        // provided; server doesn't compute weapon stats from these
        // yet (separate slice).  Validating ownership on sell /
        // marketplace flows is the immediate cheat closure.
        weapon: ps.weapon || null,
        rangedWeapon: ps.rangedWeapon || null,
        staffWeapon: ps.staffWeapon || null,
        activeSlot: ps.activeSlot || 'melee',
        armor: ps.armor || null,
        shield: ps.shield || null,
        amulet: ps.amulet || null,
        weaponStash: Array.isArray(ps.weaponStash) ? ps.weaponStash.slice(0, this.WEAPON_STASH_CAP) : [],
        // Quest state (slice 17).  Chain progression + flags +
        // kill counters.  Server validates accept/turn-in state
        // transitions but currently trusts the client's claim
        // that the underlying criteria are met -- see comments
        // on _handleQuestAccept / _handleQuestTurnIn.
        _quests: ps._quests || {},
        _questFlags: ps._questFlags || {},
        _questKills: ps._questKills || {},
        achievementPoints: ps.achievementPoints || 0,
        // Slice 18 rate-limit history.  Persisted so a cheater
        // can't reset the 60-second window by reconnecting (which
        // would otherwise let them claim 'perfect' indefinitely
        // by cycling the WS connection between batches).
        _perfectHistory: Array.isArray(ps._perfectHistory) ? ps._perfectHistory : [],
        // v2.3.1104: cook rate-limit history, same reconnect-cycling
        // rationale as _perfectHistory above.
        _cookHistory: Array.isArray(ps._cookHistory) ? ps._cookHistory : [],
        // v2.3.1021: weapon/defense skill track -- durable now (was localStorage-only).
        weaponSkills: ps.weaponSkills || {},
        weaponUnspent: ps.weaponUnspent || {},
        weaponSpecs: ps.weaponSpecs || {},
        defenseSkill: ps.defenseSkill || { level: 0, xp: 0 },
        defenseUnspent: ps.defenseUnspent || 0,
        defenseSpec: ps.defenseSpec || {},
        // v2.3.1154: HP/Endurance grid track.
        hpSpec: ps.hpSpec || {},
        hpUnspent: ps.hpUnspent || 0,
        enduranceSpec: ps.enduranceSpec || {},
        enduranceUnspent: ps.enduranceUnspent || 0,
        // v2.3.1152: schema stamp -- the ONE field allowed beyond the
        // gameplay list (ARCHITECTURE-HANDOFF rule 1 exception).  The
        // CONSTANT, never ps._v: a blob written by current code is
        // current-shape by construction, so _loadRpg's migration pass
        // skips it entirely.
        _v: RPG_SCHEMA_VERSION,
      });
    } catch (e) {}
  },

  /* v2.3.1347: self-service character restart (owner playtest: "players
     should be given chance to restart their character ... begin at
     lvl 1").  Wire: client sends `character_reset {confirm:true}` after
     its confirmation screen; we parachute-snapshot the current blob
     (rpgsnap:<pid>:prereset-<ts> -- same registered prefix as the admin
     restore flow, recoverable via admin /restore), DELETE rpg:<pid>,
     ack with the privileged `character_reset_done`, and close the
     session (admin-freeze pattern: sessions.delete first so no later
     handler can _saveRpg the old in-memory state back over the wipe).
     The client wipes its own bt_* caches and reloads; the rejoin finds
     no stored blob and bootstraps a fresh level-1 character from the
     (now empty) join payload.  Identity is untouched: auth:<pid> keeps
     the first-join lock, so the player keeps their Login Key, name,
     friends, and clan -- only the CHARACTER restarts. */
  async _handleCharacterReset(session, payload) {
    const pid = session && session.id;
    if (!pid) return;
    if (!payload || payload.confirm !== true) return; // accidental sends are no-ops
    try {
      const current = await this.state.storage.get('rpg:' + pid);
      if (current) await this.state.storage.put('rpgsnap:' + pid + ':prereset-' + Date.now(), current);
    } catch (e) { /* snapshot is best-effort; the reset itself proceeds */ }
    try { await this.state.storage.delete('rpg:' + pid); } catch (e) {}
    const ws = this._wsBySessionId(pid);
    if (ws) {
      try { ws.send(JSON.stringify({ type: 'character_reset_done' })); } catch (e) {}
      this.sessions.delete(ws);
      try { ws.close(4005, 'character reset'); } catch (e) {}
    }
    // Belt-and-braces: drop the in-memory state NOW (webSocketClose
    // would too, but it only fires on the TCP close completing).
    delete this.playerState[pid];
    delete this.stateHistory[pid];
    this.dirtyPlayers.delete(pid);
  },

  // Queue a player_state emit for the next tick flush.  Used by
  // tick-path mutators (regen, monster attack, respawn, combat XP)
  // to coalesce multiple per-tick mutations into one wire emit per
  // affected player.  Action handlers (eat / shop / forge / etc.)
  // still call _sendPlayerState directly for immediate response.
  _queuePlayerStateFlush(playerId) {
    if (playerId) this.pendingPlayerStateFlush.add(playerId);
  },

  _flushPendingPlayerStates() {
    if (this.pendingPlayerStateFlush.size === 0) return;
    for (const id of this.pendingPlayerStateFlush) {
      const ws = this._wsBySessionId(id);
      if (ws) this._sendPlayerState(ws, id);
    }
    this.pendingPlayerStateFlush.clear();
  },

  _sendPlayerState(ws, playerId) {
    const ps = this.playerState[playerId];
    if (!ps || !ws) return;
    try {
      const full = {
          coins: ps.coins || 0,
          inventory: ps.inventory || {},
          lifeSkills: ps.lifeSkills || {},
          // v2.3.1192 (amulet forge): nugget/bar ledger echo.  Old
          // clients ignore the unknown fields (deploy-order safe); new
          // clients adopt them present-gated in wsClient.js and use the
          // goldNuggets increase to fire the nugget-drop popup the
          // server no longer needs a private event for.
          goldNuggets: Math.max(0, Math.floor(ps.goldNuggets || 0)),
          goldBars: Math.max(0, Math.floor(ps.goldBars || 0)),
          level: ps.level || 1,
          xp: ps.xp || 0,
          unspentT2: ps.unspentT2 || 0,
          buildPointsThisLvl: ps.buildPointsThisLvl || 0,
          hp: typeof ps.hp === 'number' ? ps.hp : (ps.maxHp || 100),
          maxHp: typeof ps.maxHp === 'number' ? ps.maxHp : 100,
          stamina: typeof ps.stamina === 'number' ? ps.stamina : (ps.maxStamina || 100),
          maxStamina: typeof ps.maxStamina === 'number' ? ps.maxStamina : 100,
          mana: typeof ps.mana === 'number' ? ps.mana : (ps.maxMana || 100),
          maxMana: typeof ps.maxMana === 'number' ? ps.maxMana : 100,
          // Active food buff timers.  Client renders the buff icons +
          // computes its own multipliers; server's view is authoritative
          // for the timer (cheater can't extend by writing _dmgBuff =
          // Infinity locally, since the next player_state clobbers).
          _buffs: ps._buffs || {},
          // Equipment slots.  Worker is authoritative for ownership;
          // client renders from these on player_state arrival.
          weapon: ps.weapon || null,
          rangedWeapon: ps.rangedWeapon || null,
          staffWeapon: ps.staffWeapon || null,
          activeSlot: ps.activeSlot || 'melee',
          armor: ps.armor || null,
          shield: ps.shield || null,
          amulet: ps.amulet || null,
          weaponStash: Array.isArray(ps.weaponStash) ? ps.weaponStash.slice(0, this.WEAPON_STASH_CAP) : [],
          // Quest state mirror (slice 17).
          _quests: ps._quests || {},
          _questFlags: ps._questFlags || {},
          _questKills: ps._questKills || {},
          achievementPoints: ps.achievementPoints || 0,
          // v2.3.1021: weapon/defense skill track echoed so a reconnecting
          // client restores its trained levels / points / channels instead
          // of falling back to the localStorage copy (which a device switch
          // or cache clear loses).
          weaponSkills: ps.weaponSkills || {},
          weaponUnspent: ps.weaponUnspent || {},
          weaponSpecs: ps.weaponSpecs || {},
          defenseSkill: ps.defenseSkill || { level: 0, xp: 0 },
          defenseUnspent: ps.defenseUnspent || 0,
          defenseSpec: ps.defenseSpec || {},
          // v2.3.1154: HP/Endurance grid track echoed for the same
          // reconnect-restore reason as the weapon/defense track above.
          hpSpec: ps.hpSpec || {},
          hpUnspent: ps.hpUnspent || 0,
          enduranceSpec: ps.enduranceSpec || {},
          enduranceUnspent: ps.enduranceUnspent || 0,
      };
      const session = this.sessions.get(ws);
      let payload = full;
      if (session && session.protocolVersion === 2) {
        // Protocol v2 delta: send only fields changed since the last
        // emit on this session.  The client's player_state handler
        // already merges field-by-field (presence-gated), so a partial
        // payload lands cleanly.  Cache holds JSON-stringified field
        // values so nested objects (inventory / _buffs / equipment)
        // compare by content, not identity.  First emit after join
        // sends everything (cache starts empty); a reconnect gets a
        // fresh session object, so the bootstrap sync stays full.
        const cache = session.lastPlayerStateSent || (session.lastPlayerStateSent = {});
        payload = {};
        let changed = 0;
        for (const k of Object.keys(full)) {
          const s = JSON.stringify(full[k]);
          if (cache[k] !== s) {
            cache[k] = s;
            payload[k] = full[k];
            changed++;
          }
        }
        if (changed === 0) return; // nothing changed -- skip the emit
      }
      ws.send(JSON.stringify({ type: 'player_state', payload }));
    } catch (e) {}
  },
};
