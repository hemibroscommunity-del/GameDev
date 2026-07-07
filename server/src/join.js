/* ═══ v2.3.1173 (P4 decomposition): JOIN BOOTSTRAP extracted from
 * index.js ═══
 *
 * Behavior-frozen hoist of the webSocketMessage `case 'join'` body --
 * the largest single block left in the router -- plus the v2.3.1116
 * persistent-identity pair it gates on (_phraseHash /
 * _verifyJoinAuth; auth records live in their own 'auth:<id>' key,
 * never inside the rpg blob).  Everything verbatim: the auth +
 * operator-freeze gates, the v2.3.702 same-id session eviction, the
 * stored-wins/bootstrap-caps rpg load (strict weapon sanitize on
 * client blobs), the v2.3.1152 boundary heal, inbox drain, dungeon
 * re-attach, and the state_sync/zone snapshot + caps advertisement
 * (the deploy-order safety surface -- see docs/WIRE-PROTOCOL.md).
 * The switch case now delegates: `await this._handleJoin(...)`. */

import { healLifeSkills } from './migrations.js';

export const joinMethods = {
  /* ═══ v2.3.1116: PERSISTENT IDENTITY (PR1 of the heavy-systems plan) ═══
   * The auth record lives in its OWN storage key ('auth:<id>'), NOT inside
   * the rpg blob -- _saveRpg rewrites the blob from a fixed field list and
   * would silently drop any extra field on the next save. */

  // SHA-256 hex of the passphrase, domain-separated with a version prefix
  // so the scheme can rotate ('btv2|...') without ambiguity.  The digest
  // is compared with === : a timing leak on a hash comparison doesn't help
  // recover a preimage, and the real online risk (join-spam brute force of
  // the ~6x10^8 phrase space) is handled by the lockout below.
  async _phraseHash(phrase) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('btv1|' + phrase));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  },

  async _verifyJoinAuth(id, phrase) {
    const now = Date.now();
    if (!this._authFails) this._authFails = new Map(); // in-memory: a deploy reset just clears lockouts
    const rec = this._authFails.get(id);
    if (rec && rec.until > now) return false; // lockout window active
    const auth = await this.state.storage.get('auth:' + id);
    if (!auth) {
      // Unregistered id.  Register when the client proves it owns a
      // phrase; otherwise allow as a legacy/guest throwaway.  Ids that
      // predate this slice (random per-pageload) are unknowable and
      // valueless, so grandfathering them unauthenticated is safe --
      // and every post-slice client sends a phrase, so real characters
      // get locked at their first join.
      if (phrase) {
        await this.state.storage.put('auth:' + id, { pfHash: await this._phraseHash(phrase), createdAt: now });
      }
      return true;
    }
    if (phrase && (await this._phraseHash(phrase)) === auth.pfHash) {
      this._authFails.delete(id);
      return true;
    }
    // Failed verify: count toward the brute-force lockout (5 fails ->
    // 60s).  Keyed by target id, so an attacker hammering someone's id
    // locks the ATTACK out; the owner's correct phrase clears it.
    const f = this._authFails.get(id) || { count: 0, until: 0 };
    f.count += 1;
    if (f.count >= 5) { f.until = now + 60000; f.count = 0; }
    this._authFails.set(id, f);
    return false;
  },

  async _handleJoin(session, ws, msg) {
    // v2.3.1116: identity auth gate.  Runs BEFORE the eviction loop
    // below on purpose -- player ids are broadcast to the whole room
    // (player_join / state_sync), so before this gate existed anyone
    // could read a victim's id off the wire, join with it, evict
    // their live session, AND own their stored progress.  Rules:
    //   - id with a stored auth record: the join must carry the
    //     matching passphrase or it's rejected without touching the
    //     existing session or playerState.
    //   - unregistered id: allowed through (v1 / legacy clients never
    //     send a phrase -- the deploy-order safety property), and the
    //     auth record is stamped when a phrase IS provided, locking
    //     the id from then on.
    if (msg.id) {
      const _authOk = await this._verifyJoinAuth(msg.id, typeof msg.phrase === 'string' ? msg.phrase : null);
      if (!_authOk) {
        try { ws.send(JSON.stringify({ type: 'join_rejected', reason: 'auth' })); } catch {}
        try { ws.close(4003, 'auth'); } catch {}
        this.sessions.delete(ws);
        return;
      }
      // v2.3.1148: operator freeze gate.  Storage await keeps the
      // input gate closed (rule 9).  reason:'frozen' is load-bearing
      // on the client: 'auth' mints a fresh identity, 'frozen' must
      // NOT (wsClient.js join_rejected handler) or freezing would
      // just push the player onto a new character.
      const _frozen = await this.state.storage.get('frozen:' + msg.id);
      if (_frozen) {
        try { ws.send(JSON.stringify({ type: 'join_rejected', reason: 'frozen' })); } catch {}
        try { ws.close(4004, 'frozen'); } catch {}
        this.sessions.delete(ws);
        return;
      }
    }
    // v2.3.702: EVICT any lingering session with the same player id.
    // A reconnect (worker-deploy bounce, iOS tab suspend/resume)
    // re-joins with the same stable passphrase id while the old
    // socket can sit in this.sessions until TCP close or the 2-min
    // AFK sweep.  _wsBySessionId returned the FIRST match -- the
    // corpse -- so every direct-to-player send (lifesteal_credit,
    // combat_credit, harvest_credit, and the synchronous post-heal
    // player_state push) black-holed for up to two minutes.  This
    // is the thrice-recurring "lifesteal broke client-side /
    // missing id" incident (v2.3.462, v2.3.25x, v2.3.701).
    if (msg.id) {
      for (const [oldWs, oldS] of this.sessions) {
        if (oldS.id === msg.id && oldWs !== ws) {
          this.sessions.delete(oldWs);
          try { oldWs.close(1000, 'superseded by reconnect'); } catch {}
        }
      }
    }
    session.id = msg.id;
    session.name = msg.name || 'Anon';
    session.data = msg.data || {};
    // Protocol v2 opt-in.  v2 sessions get delta player_state emits,
    // per-entity monster/node tick deltas, and the merged zone_state
    // message on zone change.  Anything else (older clients) stays
    // on v1 full payloads.
    session.protocolVersion = msg.protocolVersion === 2 ? 2 : 1;
    session.lastPlayerStateSent = {};
    // v2.3.1178: mint this session's HTTP economy-endpoint token
    // (delivered in state_sync below; validated by _httpAuthCheck --
    // see httpauth.js).  After the eviction loop above so exactly one
    // live token exists per player id.
    this._httpAuthMint(session, msg);
    this.playerState[msg.id] = {
      x: 0, y: 0, d: 'down', z: 'town', vx: 0, vy: 0,
      dodging: false, blocking: false, dead: false, disconnected: false,
      ...msg.data
    };
    this.stateHistory[msg.id] = [];
    // v2.3.1146: capture join.device (sent by clients since v2.3.694,
    // never read until now) + hydrate the durable anti-bot summary so
    // reconnect-cycling resets neither the hour caps nor the replay
    // ring.  Await is input-gate-safe (rule 9).
    await this._botfpOnJoin(session, msg);
    /* Load (or bootstrap) the player's server-authoritative
       coins + inventory.  Stored entry wins; if there's no
       record yet, fall back to the values the client sent in
       the join payload (one-time trust at first connection)
       and persist them so subsequent connects use the stored
       value. */
    {
      const stored = await this._loadRpg(msg.id);
      // v2.3.1148: lazy daily snapshot of the PRE-join blob (the
      // state the player last logged out with) -- the rollback
      // parachute that never existed.  Throttled to one per ~20h
      // inside; never blocks the join (see admin.js).
      if (stored) await this._rpgSnapshotMaybe(msg.id, stored);
      if (stored) {
        this.playerState[msg.id].coins = stored.coins || 0;
        this.playerState[msg.id].inventory = stored.inventory || {};
        this.playerState[msg.id].lifeSkills = stored.lifeSkills || {};
        this.playerState[msg.id].level = stored.level || 1;
        this.playerState[msg.id].xp = stored.xp || 0;
        this.playerState[msg.id].unspentT2 = stored.unspentT2 || 0;
        this.playerState[msg.id].buildPointsThisLvl = stored.buildPointsThisLvl || 0;
        this.playerState[msg.id].hp = typeof stored.hp === 'number' ? stored.hp : 100;
        this.playerState[msg.id].maxHp = typeof stored.maxHp === 'number' ? stored.maxHp : 100;
        this.playerState[msg.id].stamina = typeof stored.stamina === 'number' ? stored.stamina : 100;
        this.playerState[msg.id].maxStamina = typeof stored.maxStamina === 'number' ? stored.maxStamina : 100;
        this.playerState[msg.id].mana = typeof stored.mana === 'number' ? stored.mana : 100;
        this.playerState[msg.id].maxMana = typeof stored.maxMana === 'number' ? stored.maxMana : 100;
        this.playerState[msg.id]._buffs = (stored._buffs && typeof stored._buffs === 'object') ? { ...stored._buffs } : {};
        // Equipment from stored.  v2.3.1104: weapon blobs are
        // re-sanitized on load too -- records persisted before the
        // bootstrap clamp existed may carry forged tierMult values;
        // this heals them on the next reconnect.  Stash truncated
        // to cap.
        this.playerState[msg.id].weapon = this._sanitizeWeapon(stored.weapon);
        this.playerState[msg.id].rangedWeapon = this._sanitizeWeapon(stored.rangedWeapon);
        this.playerState[msg.id].staffWeapon = this._sanitizeWeapon(stored.staffWeapon);
        this.playerState[msg.id].activeSlot = stored.activeSlot || 'melee';
        // v2.3.249: Leather Armor removed from the game.
        // v2.3.1152: the every-load strip moved to migration v2
        // (migrations.js) -- `stored` arrived here through _loadRpg,
        // so it is already migrated.  The bootstrap branch below
        // KEEPS its strip (client payloads are unmigrated writers).
        this.playerState[msg.id].armor = stored.armor || null;
        this.playerState[msg.id].shield = stored.shield || null;
        // v2.3.1180: amulet gem/tier feed the authoritative damage roll
        // (_computeAttackDamage) -- whitelist even the stored blob, so a
        // pre-slice forged amulet heals on this reconnect (gear.js).
        this.playerState[msg.id].amulet = this._sanitizeAmulet(stored.amulet);
        this.playerState[msg.id].weaponStash = this._sanitizeWeaponList(stored.weaponStash);
        this.playerState[msg.id]._quests = (stored._quests && typeof stored._quests === 'object') ? { ...stored._quests } : {};
        this.playerState[msg.id]._questFlags = (stored._questFlags && typeof stored._questFlags === 'object') ? { ...stored._questFlags } : {};
        this.playerState[msg.id]._questKills = (stored._questKills && typeof stored._questKills === 'object') ? { ...stored._questKills } : {};
        this.playerState[msg.id].achievementPoints = stored.achievementPoints || 0;
        // Restore the perfect-claim history so the rate-limit
        // window survives reconnects.  Stale entries (>60s old)
        // get pruned on the next _ratedHarvestAccuracy call.
        this.playerState[msg.id]._perfectHistory = Array.isArray(stored._perfectHistory) ? stored._perfectHistory : [];
        this.playerState[msg.id]._cookHistory = Array.isArray(stored._cookHistory) ? stored._cookHistory : [];
        // v2.3.1021: weapon/defense skill track.  These were never
        // persisted before this slice, so an existing player's stored
        // record has none -- fall back to the join payload (their current
        // localStorage copy) the first time, so the migration CAPTURES
        // their trained levels instead of zeroing them.  Once stored, the
        // stored copy wins on every later reconnect.
        const _md = msg.data || {};
        this.playerState[msg.id].weaponSkills = (stored.weaponSkills && Object.keys(stored.weaponSkills).length)
          ? this._sanitizeWeaponSkills(stored.weaponSkills) : this._sanitizeWeaponSkills(_md.rpgWeaponSkills);
        this.playerState[msg.id].weaponUnspent = (stored.weaponUnspent && Object.keys(stored.weaponUnspent).length)
          ? this._sanitizeWeaponUnspent(stored.weaponUnspent) : this._sanitizeWeaponUnspent(_md.rpgWeaponUnspent);
        this.playerState[msg.id].weaponSpecs = (stored.weaponSpecs && Object.keys(stored.weaponSpecs).length)
          ? this._sanitizeWeaponSpecs(stored.weaponSpecs) : this._sanitizeWeaponSpecs(_md.rpgWeaponSpecs);
        this.playerState[msg.id].defenseSkill = (stored.defenseSkill && typeof stored.defenseSkill === 'object')
          ? this._sanitizeDefenseSkill(stored.defenseSkill) : this._sanitizeDefenseSkill(_md.rpgDefenseSkill);
        this.playerState[msg.id].defenseUnspent = (typeof stored.defenseUnspent === 'number')
          ? Math.max(0, Math.min(999, Math.floor(stored.defenseUnspent)))
          : Math.max(0, Math.min(999, Math.floor(Number(_md.rpgDefenseUnspent) || 0)));
        this.playerState[msg.id].defenseSpec = (stored.defenseSpec && Object.keys(stored.defenseSpec).length)
          ? this._sanitizeDefenseSpec(stored.defenseSpec) : this._sanitizeDefenseSpec(_md.rpgDefenseSpec);
      } else {
        // First-connect bootstrap caps.  Stored values (the
        // branch above) win on reconnect; this branch only runs
        // when a player has no DO storage entry yet.  Cheaters
        // who localStorage-tamper before their first ever connect
        // would otherwise inject huge values that then persist
        // forever.  Cap each field at "reasonable migrated SP
        // character" thresholds; legit new players are unaffected
        // (their values are tiny), legit veteran SP players see
        // some progression capped (acceptable trade — the user
        // can raise these caps if they hear complaints).
        // v2.3.910: combat level is now the sum of the build-skill levels
        // (up to 500), so the first-connect cap rises to match.  The level
        // is re-derived from the stat sum on the next stats_update anyway.
        const BOOTSTRAP_LEVEL_CAP = 500;
        const BOOTSTRAP_XP_CAP = 50000;
        const BOOTSTRAP_UT2_CAP = 75;
        const BOOTSTRAP_COINS_CAP = 2000;
        const BOOTSTRAP_INV_PER_ITEM_CAP = 50;
        const BOOTSTRAP_INV_KEY_COUNT_CAP = 100;

        const _rawInv = (msg.data && msg.data.rpgInventory && typeof msg.data.rpgInventory === 'object') ? msg.data.rpgInventory : {};
        const _cappedInv = {};
        let _kc = 0;
        for (const [k, v] of Object.entries(_rawInv)) {
          if (_kc >= BOOTSTRAP_INV_KEY_COUNT_CAP) break;
          const n = Number(v);
          if (!Number.isFinite(n) || n <= 0) continue;
          _cappedInv[k] = Math.min(BOOTSTRAP_INV_PER_ITEM_CAP, Math.floor(n));
          _kc++;
        }

        this.playerState[msg.id].coins = Math.max(0, Math.min(BOOTSTRAP_COINS_CAP,
          (msg.data && typeof msg.data.rpgCoins === 'number') ? Math.floor(msg.data.rpgCoins) : 0));
        this.playerState[msg.id].inventory = _cappedInv;
        this.playerState[msg.id].lifeSkills = (msg.data && msg.data.rpgLifeSkills && typeof msg.data.rpgLifeSkills === 'object') ? { ...msg.data.rpgLifeSkills } : {};
        // v2.3.1152: boundary heal.  Migration v1 fixes STORED
        // blobs once, but a pre-v2.3.769 client can hand us a
        // freshly re-corrupted lifeSkills payload right here --
        // without this, the corruption gets saved into a blob
        // that is already stamped past migration v1 and never
        // heals.  healLifeSkills mutates in place; cheap no-op
        // on clean payloads.
        healLifeSkills(this.playerState[msg.id]);
        this.playerState[msg.id].level = Math.max(1, Math.min(BOOTSTRAP_LEVEL_CAP,
          (msg.data && typeof msg.data.rpgLevel === 'number') ? Math.floor(msg.data.rpgLevel) : 1));
        this.playerState[msg.id].xp = Math.max(0, Math.min(BOOTSTRAP_XP_CAP,
          (msg.data && typeof msg.data.rpgXp === 'number') ? Math.floor(msg.data.rpgXp) : 0));
        this.playerState[msg.id].unspentT2 = Math.max(0, Math.min(BOOTSTRAP_UT2_CAP,
          (msg.data && typeof msg.data.rpgUnspentT2 === 'number') ? Math.floor(msg.data.rpgUnspentT2) : 0));
        // build_point_earned dispatches own up to 4 in a flurry on
        // a multi-stat-threshold crossing -- cap at 4 on bootstrap
        // so a cheater can't seed a huge BP carry-over.
        this.playerState[msg.id].buildPointsThisLvl = Math.max(0, Math.min(4,
          (msg.data && typeof msg.data.rpgBuildPointsThisLvl === 'number') ? Math.floor(msg.data.rpgBuildPointsThisLvl) : 0));
        this.playerState[msg.id].hp = (msg.data && typeof msg.data.rpgHp === 'number') ? msg.data.rpgHp : 100;
        this.playerState[msg.id].maxHp = (msg.data && typeof msg.data.rpgMaxHp === 'number') ? msg.data.rpgMaxHp : 100;
        this.playerState[msg.id].stamina = (msg.data && typeof msg.data.rpgStamina === 'number') ? msg.data.rpgStamina : 100;
        this.playerState[msg.id].maxStamina = (msg.data && typeof msg.data.rpgMaxStamina === 'number') ? msg.data.rpgMaxStamina : 100;
        this.playerState[msg.id].mana = (msg.data && typeof msg.data.rpgMana === 'number') ? msg.data.rpgMana : 100;
        this.playerState[msg.id].maxMana = (msg.data && typeof msg.data.rpgMaxMana === 'number') ? msg.data.rpgMaxMana : 100;
        this.playerState[msg.id]._buffs = {};
        // Equipment bootstrap.  v2.3.1104: weapon blobs are now
        // SANITIZED on entry (tierMult clamped to the legit forge
        // range) because server-computed damage (v2.3.912) and
        // sell value both multiply by tierMult -- the old "opaque
        // blobs are harmless" posture stopped being true.
        // Stash truncated to cap to prevent join-time inflation.
        // v2.3.1131: strict=true -- client-supplied blobs are
        // STRIPPED of quality/hardness/temper (they multiply the
        // anti-cheat damage ceiling; a forged godly would raise
        // its own cap).  Stored-blob loads keep the default clamp.
        this.playerState[msg.id].weapon = this._sanitizeWeapon(msg.data && msg.data.rpgWeapon, true);
        this.playerState[msg.id].rangedWeapon = this._sanitizeWeapon(msg.data && msg.data.rpgRangedWeapon, true);
        this.playerState[msg.id].staffWeapon = this._sanitizeWeapon(msg.data && msg.data.rpgStaffWeapon, true);
        this.playerState[msg.id].activeSlot = (msg.data && typeof msg.data.rpgActiveSlot === 'string') ? msg.data.rpgActiveSlot : 'melee';
        // v2.3.249: drop leather armor from the first-connect bootstrap too.
        {
          const _bootArmor = (msg.data && msg.data.rpgArmor && typeof msg.data.rpgArmor === 'object') ? msg.data.rpgArmor : null;
          this.playerState[msg.id].armor = (_bootArmor && _bootArmor.name === 'Leather Armor') ? null : (_bootArmor ? { ..._bootArmor } : null);
        }
        this.playerState[msg.id].shield = (msg.data && msg.data.rpgShield && typeof msg.data.rpgShield === 'object') ? { ...msg.data.rpgShield } : null;
        // v2.3.1180: whitelist the client-supplied amulet (gem/tier feed
        // the authoritative damage roll -- gear.js _sanitizeAmulet).
        this.playerState[msg.id].amulet = this._sanitizeAmulet(msg.data && msg.data.rpgAmulet);
        this.playerState[msg.id].weaponStash = this._sanitizeWeaponList(msg.data && msg.data.rpgWeaponStash, true);
        // Quest state bootstrap (slice 17).  Trust shape but not
        // size -- a cheater could pass a 10000-entry _questKills
        // map to inflate storage.  Strip non-numeric values and
        // cap key count.
        const _qK = (msg.data && msg.data.rpgQuestKills && typeof msg.data.rpgQuestKills === 'object') ? msg.data.rpgQuestKills : {};
        const _qKclean = {};
        let _qKc = 0;
        for (const [k, v] of Object.entries(_qK)) {
          if (_qKc >= 50) break;
          const n = Number(v);
          if (Number.isFinite(n) && n >= 0) {
            _qKclean[k] = Math.min(99999, Math.floor(n));
            _qKc++;
          }
        }
        // Cap _quests + _questFlags key counts so a cheater
        // can't fill storage with a 100k-entry map at first
        // connect.  100 keys is well above the known
        // QUEST_CHAINS table size (25 quests) + a generous
        // buffer for flags + future expansion.
        const _capObjKeys = (src) => {
          const out = {};
          if (!src || typeof src !== 'object') return out;
          let n = 0;
          for (const [k, v] of Object.entries(src)) {
            if (n >= 100) break;
            out[k] = v;
            n++;
          }
          return out;
        };
        this.playerState[msg.id]._quests = _capObjKeys((msg.data && msg.data.rpgQuests) || null);
        this.playerState[msg.id]._questFlags = _capObjKeys((msg.data && msg.data.rpgQuestFlags) || null);
        this.playerState[msg.id]._questKills = _qKclean;
        this.playerState[msg.id].achievementPoints = Math.max(0, Math.min(99999,
          (msg.data && typeof msg.data.rpgAchievementPoints === 'number') ? Math.floor(msg.data.rpgAchievementPoints) : 0));
        this.playerState[msg.id]._perfectHistory = [];
        this.playerState[msg.id]._cookHistory = [];
        // v2.3.1021: weapon/defense skill track -- bootstrap from the join
        // payload on first connect (sanitized), then persisted below.
        {
          const _md = msg.data || {};
          this.playerState[msg.id].weaponSkills = this._sanitizeWeaponSkills(_md.rpgWeaponSkills);
          this.playerState[msg.id].weaponUnspent = this._sanitizeWeaponUnspent(_md.rpgWeaponUnspent);
          this.playerState[msg.id].weaponSpecs = this._sanitizeWeaponSpecs(_md.rpgWeaponSpecs);
          this.playerState[msg.id].defenseSkill = this._sanitizeDefenseSkill(_md.rpgDefenseSkill);
          this.playerState[msg.id].defenseUnspent = Math.max(0, Math.min(999, Math.floor(Number(_md.rpgDefenseUnspent) || 0)));
          this.playerState[msg.id].defenseSpec = this._sanitizeDefenseSpec(_md.rpgDefenseSpec);
        }
        await this._saveRpg(msg.id, this.playerState[msg.id]);
      }
      // Session-only equipment-derived values.  Always read from join
      // — recomputed client-side on every recalcDerived.
      this.playerState[msg.id].def = (msg.data && typeof msg.data.rpgDef === 'number') ? Math.max(0, msg.data.rpgDef) : 0;
      this.playerState[msg.id].amuletHpRegen = (msg.data && typeof msg.data.rpgAmuletHpRegen === 'number') ? Math.max(0, msg.data.rpgAmuletHpRegen) : 0;
      this.playerState[msg.id].amuletStaminaRegen = (msg.data && typeof msg.data.rpgAmuletStaminaRegen === 'number') ? Math.max(0, msg.data.rpgAmuletStaminaRegen) : 0;
      this.playerState[msg.id].lastDamageAt = 0;
      this.playerState[msg.id].dying = false;
      this.playerState[msg.id].respawnAt = 0;

      // Raw stats: prefer stored (already-clamped) values; bootstrap
      // from join payload otherwise, clamped to the per-level cap.
      // Cheater spoofing rpgVitality: 99999 on join gets clamped to
      // level * 10 + 20 -- bounded forever after, even on reconnect.
      {
        const _ps = this.playerState[msg.id];
        const _lvl = _ps.level || 1;
        // v2.3.1155: T1 only.  The five retired T2 stats are gone
        // from this fallback — this line was the re-injection path
        // migrations.md warned about (a spoofed rpgFerocity in the
        // join payload used to persist forever).
        const RAW_STATS = ['power', 'vitality', 'endurance', 'agility', 'mind'];
        const _storedHasStats = stored && typeof stored.vitality === 'number';
        for (const s of RAW_STATS) {
          if (_storedHasStats && typeof stored[s] === 'number') {
            _ps[s] = stored[s];
          } else {
            const joinKey = 'rpg' + s.charAt(0).toUpperCase() + s.slice(1);
            const joinVal = (msg.data && typeof msg.data[joinKey] === 'number') ? msg.data[joinKey] : 0;
            _ps[s] = this._clampStat(joinVal, _lvl);
          }
        }
        // v2.3.1154: HP/Endurance grid track -- ingested HERE (after
        // the raw-stat loop above) because the budget clamp in
        // _sanitizeGridSpec reads the final clamped vitality/
        // endurance.  Stored wins; else the join payload seeds
        // (first connect / pre-grid stored records).  Absent unspent
        // pools BACKFILL to stat-level minus points-already-spent --
        // the boundary heal twin of the backfill-grid-points
        // migration (client payloads are unmigrated writers).
        {
          const _md2 = msg.data || {};
          _ps.hpSpec = (stored && stored.hpSpec && Object.keys(stored.hpSpec).length)
            ? this._sanitizeHpSpec(stored.hpSpec, _ps) : this._sanitizeHpSpec(_md2.rpgHpSpec, _ps);
          _ps.enduranceSpec = (stored && stored.enduranceSpec && Object.keys(stored.enduranceSpec).length)
            ? this._sanitizeEnduranceSpec(stored.enduranceSpec, _ps) : this._sanitizeEnduranceSpec(_md2.rpgEnduranceSpec, _ps);
          const _sumSpec = (o) => Object.values(o || {}).reduce((a, v) => a + (v || 0), 0);
          // v2.3.1157: backfill at the doubled earn rate (2/level,
          // 200 lifetime per skill) — mirror of the uniform-t2-pools
          // migration formula.
          _ps.hpUnspent = (stored && typeof stored.hpUnspent === 'number')
            ? Math.max(0, Math.min(999, Math.floor(stored.hpUnspent)))
            : (typeof _md2.rpgHpUnspent === 'number')
              ? Math.max(0, Math.min(999, Math.floor(_md2.rpgHpUnspent)))
              : Math.max(0, Math.min(200, 2 * (_ps.vitality || 0)) - _sumSpec(_ps.hpSpec));
          _ps.enduranceUnspent = (stored && typeof stored.enduranceUnspent === 'number')
            ? Math.max(0, Math.min(999, Math.floor(stored.enduranceUnspent)))
            : (typeof _md2.rpgEnduranceUnspent === 'number')
              ? Math.max(0, Math.min(999, Math.floor(_md2.rpgEnduranceUnspent)))
              : Math.max(0, Math.min(200, 2 * (_ps.endurance || 0)) - _sumSpec(_ps.enduranceSpec));
          // v2.3.1157: the 1000-point combat ceiling holds on the
          // join path too (a forged payload could otherwise seed
          // over-ceiling specs on first connect).
          this._clampBuildTotal(_ps);
        }
        // Server-owned max values: compute from clamped raw stats
        // (v2.3.1154: and the grid specs ingested just above --
        // vigor/stamina feed the pool formulas).
        // Persisted hp / stamina / mana already loaded above; clamp
        // them to the recomputed maxes here.
        this._recomputeMaxes(_ps);
        this._saveRpg(msg.id, _ps);
      }
    }
    // v2.3.1117: drain offline mail (market refunds, trade payouts,
    // wager returns) into the freshly loaded state BEFORE state_sync
    // below, so the first snapshot the client renders already
    // includes the credits.
    await this._drainInbox(msg.id, ws);
    // v2.3.1149: cadence hooks -- daily login reward (per-player
    // lazy settlement) + the weekly jackpot's lazy draw resolution
    // (rule 12: a week that ended in an empty room settles on the
    // next join).  Both after the drain so the reward's own
    // inbox_delivered arrives as its own line.
    await this._cadenceLoginReward(msg.id);
    await this._jackpotMaybeResolve();
    this._jackpotSend(msg.id, { playerId: msg.id });
    // v2.3.1150: sticky MOTD delivery + the lazy daily economy
    // snapshot (fire-and-forget; also runs from the tick slot so a
    // room that stays occupied across midnight still records).
    {
      const _motd = await this.state.storage.get('motd');
      if (_motd && _motd.text) {
        try { ws.send(JSON.stringify({ type: 'server_announce', payload: { text: _motd.text, motd: true, ts: _motd.ts } })); } catch (e) {}
      }
      this._metricsMaybe(Date.now()).catch(() => {});
    }
    // v2.3.1121: duel bookkeeping on (re)join -- clear a reconnect
    // grace window if this player dropped mid-duel, and kick the
    // rate-limited orphaned-wager sweep (fire-and-forget; refunds
    // land via the inbox path above on the NEXT join).
    this._duelOnRejoin(msg.id);
    this._duelEscrowSweep();
    this._arenaEntrySweep(); // v2.3.1126: refund entries orphaned by a deploy
    this._arenaStakeSweep(); // v2.3.1128: same contract for sponsorship stakes
    // v2.3.1129: load a surviving guard gear lock -- storage-backed
    // so relogging can't shed the punishment (threat.js).
    {
      const _gl = await this.state.storage.get('gearlock:' + msg.id);
      if (_gl && _gl > Date.now() && this.playerState[msg.id]) {
        this.playerState[msg.id]._gearLockUntil = _gl;
      }
    }
    // v2.3.1130: sanitize server-held pets + one-time adoption of
    // legacy client-side captures (see pets.js header).
    this._petsAdoptOnJoin(this.playerState[msg.id], msg.data);
    // v2.3.1125: authoritative clan tag -- the registry overrides
    // whatever the client stuffed in its cosmetics (msg.data is the
    // same object session.data / playerState spread / player_join
    // broadcast all read).  Also the lazy war-resolve hook, and the
    // clan snapshot echo so the client's panel has server truth.
    await this._clansEnsure();
    this._clanStampTag(msg.id, msg.data);
    this._clanStampTag(msg.id, this.playerState[msg.id]);
    this._clanSendState(msg.id);
    this.broadcastExcept(ws, { type: 'player_join', id: msg.id, name: msg.name, data: msg.data });
    // Send current state + monsters for player's zone
    const joinZone = msg.data?.z || 'town';
    const zoneMonsters = (joinZone !== 'town' && joinZone !== 'farm_home') ? this._ensureZoneMonsters(joinZone) : [];
    const zoneNodes = (joinZone !== 'town' && joinZone !== 'farm_home') ? this._ensureZoneNodes(joinZone) : [];
    const zoneLootForJoin = (joinZone !== 'town' && joinZone !== 'farm_home') ? this._zoneLootForWire(joinZone) : [];
    // v2.3.1150: warm the live-ops flag cache before anything gated
    // can run, and let operator flags OVERRIDE the baked caps
    // (spread last).  Empty flags = identity, so deploy-order
    // safety (rule 19) is untouched.  WARNING: forcing a cap to
    // false re-enables legacy client fallbacks for some systems --
    // the disable_* server switches are the normal kill lever
    // (docs/specs/liveops.md safety table).
    const _liveFlags = await this._liveFlagsEnsure();
    ws.send(JSON.stringify({
      type: 'state_sync',
      // v2.3.1119: capability advertisement.  Clients gate their
      // legacy client-side settlement paths on these flags so old
      // workers keep old behavior (deploy-order safety).  WS-flow
      // capabilities go here; HTTP flows use per-response flags
      // (marketplace settled:true, v2.3.1118).
      // v2.3.1154: hpEndGrids -- the client gates HP/Endurance grid
      // spending AND its local vigor/stamina pool multipliers on this
      // flag, so a new client against an old worker shows the grids
      // as "Soon" instead of computing pools the worker's
      // player_state echo would stomp every flush (deploy-order
      // safety, the v2.3.1119 caps pattern).
      // v2.3.1156: t2uniform -- the client gates its 100-pt caps and
      // the build meter on this flag (an old worker clamps weapon
      // specs at 99 / defense+grid specs at 50, so spending past the
      // legacy caps against it would truncate on echo).
      // v2.3.1178: httpAuth -- the client attaches httpToken (below) to
      // mutating economy POSTs (market place/cancel, arena join/leave)
      // as the x-bt-auth header.  Old clients ignore both fields and
      // ride the enforcement grace window (httpauth.js).
      caps: { trade: true, questTrack: true, gamble: true, clans: true, arena: true, dungeon: true, sponsor: true, guilds: true, pets: true, harden: true, trade2: true, weaponDrops: true, botfp: true, jackpot: true, hpEndGrids: true, t2uniform: true, httpAuth: true, ..._liveFlags },
      // v2.3.1178: this session's private economy-endpoint token.
      // state_sync goes to the joining socket ONLY -- never broadcast.
      httpToken: session.httpToken,
      players: this.getAllPlayerData(),
      playerCount: this.getPlayerCount(),
      monsters: zoneMonsters.map(m => ({
        id: m.id, arch: m.arch, level: m.level, element: m.element,
        x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp, dmg: m.dmg,
        xp: m.xp, gold: m.gold, spd: m.spd, emoji: m.emoji, color: m.color,
        alive: m.alive,
      })),
      nodes: zoneNodes.map(n => ({
        id: n.id, nodeType: n.nodeType, x: n.x, y: n.y,
        tierLvl: n.tierLvl, alive: n.alive, respawnAt: n.respawnAt,
      })),
      loot: zoneLootForJoin,
      monsterZone: joinZone,
    }));
    /* Authoritative rpg state sync -- the client overwrites its
       local R.coins / R.inventory with whatever's on the worker.
       Bootstrap-from-join (above) means this matches what the
       client just sent on the first connect, and matches the
       stored value on subsequent connects. */
    this._sendPlayerState(ws, msg.id);
    this.broadcastAll({ type: 'player_count', count: this.getPlayerCount() });
    this.reportToLeaderboard(session);
  },
};
