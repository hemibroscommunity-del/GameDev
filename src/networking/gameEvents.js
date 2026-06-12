/* ═══ GAME EVENTS — the server/peer event dispatcher (40+ message types) ═══ */
/* v2.3.783: _processGameEvent moved verbatim from the inline WS client in
   src/ui/BroTown.jsx (REBUILD-PLAN Phase 4, behavior-frozen). It handles
   both batched `tick.events` entries and direct sends (see
   docs/WIRE-PROTOCOL.md for the full message inventory).
   Closure captures became explicit:
   - module imports below (data tables, variant helpers, combat/chat
     helpers, babel runtime) per the extracted-module rule — never rely on
     the globalThis copies;
   - React setters + the effect-scoped _buildServerPile arrive via `deps`
     (destructured to the original names so the body is untouched).
   S is stateRef.current. */
import { BT_AUDIO, ZONES, TILE, ARENA_CHAMPION_REWARD, ARENA_WIN_REWARD, CLAN_WAR_REWARDS, createDefaultCompStats, recalcDerived, DEATH_GOLD_PENALTY, updateZoneDimensions, generateZoneMap } from '@/data/index.js';
import { MONSTER_VARIANTS, maybeTransformMonster, isRemnantSkull, xpMultFor } from '@/data/monsterVariants.js';
import { rollMonsterShard } from '@/data/shards.js';
/* BT_API_BASE: same window.BROTOWN_WS_URL-derived value BroTown computes at
   its own module scope — the barrel export is the canonical copy. */
import { BT_API_BASE } from '@/networking/index.js';
import { pushHudPopup } from '@/ui/XpFlyOverlay.jsx';
import { enqueuePeerDamage, peerDmgKey, distributeKillXpToBuild, applyMeleeLifesteal, addBuildUse, isAttackInShieldArc } from '@/game/combatHelpers.js';
import { handleChatEvent, handleEmoteEvent } from '@/game/chat.js';
import { _objectSpread, _slicedToArray, _toConsumableArray } from '@/lib/babelHelpers.js';

export function processGameEvent(type, payload, S, deps) {
  var setRpgState = deps.setRpgState,
    pixiRef = deps.pixiRef,
    setChatLog = deps.setChatLog,
    setUnreadChats = deps.setUnreadChats,
    setDuelRequest = deps.setDuelRequest,
    setThreatIncoming = deps.setThreatIncoming,
    setLevelUpMsg = deps.setLevelUpMsg,
    setIncomingTrade = deps.setIncomingTrade,
    setArenaTournament = deps.setArenaTournament,
    setArenaBets = deps.setArenaBets,
    _buildServerPile = deps._buildServerPile;
        switch (type) {
          case 'loot_drop':
            {
              /* Server-authoritative pile from a monster kill.  Push to
                 local groundLoot if not already present -- the worker
                 also includes new piles in state_sync / zone_loot for
                 joiners, so the same id may arrive twice. */
              if (!payload || !payload.pile || !S.groundLoot) break;
              var _existing = S.groundLoot.find(function (l) { return l.lootId === payload.pile.lootId; });
              if (_existing) break;
              S.groundLoot.push(_buildServerPile(payload.pile, S.myId));
              break;
            }
          case 'loot_claimed':
            {
              /* Broadcast: another player claimed against this pile.
                 If they were the first claimer, the one-of inventory
                 portion is gone -- null it on our local copy so the
                 visual reverts to a plain coin pile and a subsequent
                 pickup doesn't try to claim the inventory again. */
              if (!payload || !payload.lootId || !S.groundLoot) break;
              for (var _lcj = 0; _lcj < S.groundLoot.length; _lcj++) {
                var _loCl = S.groundLoot[_lcj];
                if (_loCl.lootId !== payload.lootId) continue;
                if (payload.inventoryClaimedNow) {
                  _loCl.inventoryClaimed = true;
                  _loCl.skull = null;
                  _loCl.shard = null;
                }
                /* If WE are the one who claimed, the loot_credit case
                   (top-level) handles the local despawn -- nothing
                   else to do here for the picker. */
                break;
              }
              break;
            }
          case 'loot_despawn':
            {
              /* Server says the pile is done -- last recipient claimed
                 or 60 s expiry hit.  Mark expired so renderer + filter
                 clear it.  v2.3.113: also immediate-dispose so a frame
                 of latency between _expired and the orphan sweep can't
                 leave a stale coin sprite (mummy / skeleton bug). */
              if (!payload || !payload.lootId || !S.groundLoot) break;
              for (var _lde = 0; _lde < S.groundLoot.length; _lde++) {
                if (S.groundLoot[_lde].lootId === payload.lootId) {
                  S.groundLoot[_lde]._expired = true;
                  break;
                }
              }
              try {
                if (pixiRef.current && pixiRef.current.disposeLootById) {
                  pixiRef.current.disposeLootById(payload.lootId);
                }
              } catch (_e) {}
              break;
            }
          case 'chat':
            {
              /* v2.3.767: body moved to src/game/chat.js (Phase 2). */
              handleChatEvent(payload, S, { setChatLog: setChatLog, setUnreadChats: setUnreadChats });
              break;
            }
          case 'emote':
            {
              /* v2.3.767: body moved to src/game/chat.js (Phase 2). */
              handleEmoteEvent(payload, S);
              break;
            }
          case 'player_swing':
            {
              if (payload.id && S.others[payload.id]) {
                S.others[payload.id]._swingTs = Date.now();
                S.others[payload.id]._swingSpecial = !!payload.special;
              }
              break;
            }
          case 'player_projectile':
            {
              /* Another player fired an arrow or staff bolt */
              if (payload.id === S.myId) break;
              if (!S._remoteProjectiles) S._remoteProjectiles = [];
              S._remoteProjectiles.push({
                x: payload.x, y: payload.y, ang: payload.ang,
                isStaff: payload.isStaff, dist: 14,
                life: payload.isStaff ? 90 : 120,
                ts: Date.now(), ownerId: payload.id
              });
              break;
            }
          case 'player_shield':
            {
              if (payload.id && S.others[payload.id]) {
                S.others[payload.id]._shieldUp = payload.up;
                S.others[payload.id]._shieldTs = Date.now();
              }
              break;
            }
          case 'monster_transform':
            {
              /* Server-driven variant transform (currently just
                 mummy -> skeleton at HP <= 50%).  Worker detects the
                 threshold + emits this event for every client in the
                 zone, so every screen plays the shred animation at
                 the same tick.  Replaces the per-client
                 maybeTransformMonster() trigger in entityRenderer.js
                 -- that local path is now gated on !S._serverMonsters
                 (dungeon / SP only). */
              if (!payload || !S.monsters) break;
              var tm = S.monsters.find(function (mm) { return mm.id === payload.id; });
              if (!tm) break;
              var fromV = MONSTER_VARIANTS[payload.fromVariant];
              tm._transformStart = Date.now();
              tm._transformHoldMs = (fromV && fromV.transformHoldMs) || 480;
              tm._transformFromArch = payload.fromVariant;
              tm.archetype = payload.toVariant;
              tm.type = payload.toVariant;
              if (tm.arch !== undefined) tm.arch = payload.toVariant;
              var toV = MONSTER_VARIANTS[payload.toVariant];
              if (toV && toV.spd != null) tm.spd = toV.spd;
              break;
            }
          case 'monster_hit':
            {
              /* A monster was hit — show damage number and hit effects for everyone */
              if (S.monsters) {
                var hitM = S.monsters.find(function(m) { return m.id === payload.monsterId; });
                if (hitM) {
                  /* Update curHp from the server's authoritative hpPct,
                     but DON'T touch hitM.hp — that's the spawn-time
                     max-HP reference the HP bar uses as its denominator.
                     Clobbering it made curHp == hp on every hit, which
                     locked the bar percentage at 100%. */
                  hitM.curHp = Math.round(payload.hpPct * hitM.maxHp);
                  hitM._hitFlash = Date.now();
                  /* Show damage number (skip our own — we already show it
                     locally).  Peer numbers go through the smoothing queue so
                     a coalesced burst drips out at a live cadence instead of
                     stacking into a column. */
                  if (payload.attackerId !== S.myId) {
                    enqueuePeerDamage(S, peerDmgKey(payload.monsterId, hitM.x || hitM.renderX, hitM.y || hitM.renderY), {
                      x: hitM.x || hitM.renderX, y: (hitM.y || hitM.renderY) - 20,
                      text: '-' + payload.dmg, color: payload.isCrit ? '#fbbf24' : '#ff8888'
                    });
                  }
                  /* Hit particles for everyone */
                  for (var hp2 = 0; hp2 < 3; hp2++) {
                    S.hitParticles.push({
                      x: hitM.x || hitM.renderX, y: hitM.y || hitM.renderY,
                      vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2,
                      life: 0.5, color: hitM.color || '#ff5e6c', size: 2
                    });
                  }
                }
              }
              break;
            }
          case 'monster_kill':
            {
              /* A monster was killed — show death effects, award XP if
                 we're a recipient.  Gold no longer auto-adds: it rides
                 on the loot pickup so the player must walk over the
                 coin (matches the SP melee/staff/bow paths). */
              var _amRecipient = payload.recipients && payload.recipients.includes(S.myId);
              var _goldList = payload.goldRecipients || payload.recipients || [];
              var _amGoldRecipient = _amRecipient && _goldList.includes(S.myId);
              var _myShare = (payload.shares && typeof payload.shares[S.myId] === 'number') ? payload.shares[S.myId] : 1;
              var _killVarMult = xpMultFor(S.monsters && S.monsters.find(function(mm) { return mm.id === payload.monsterId; }));
              var _killXpPre = _amRecipient ? Math.max(0, Math.round((payload.xp || 0) * _myShare * _killVarMult)) : 0;
              var _killGoldPre = _amGoldRecipient ? Math.max(0, Math.round((payload.gold || 0) * _myShare)) : 0;
              if (S.monsters) {
                var deadM = S.monsters.find(function(m) { return m.id === payload.monsterId; });
                if (deadM) {
                  /* In server-mode the local m.curHp -= dmg branches are
                     all gated on !S._serverMonsters, so neither melee nor
                     arrow kill code ever fires `if (m.curHp <= 0)` --
                     meaning the local loot push never happens.  Drop the
                     remnant here so fodder + variants leave debris on the
                     ground in MP.  _lootDropped is the canonical
                     "already pushed" flag (cleared on respawn in the
                     tick handler) -- v2.3.17 fix: the previous _wasAlive
                     gate fired false-negative when the tick handler
                     arrived first and set alive=false silently. */
                  /* Mummy -> skeleton on overkill (v2.3.135): MP kill events
                     can arrive before any damage tick, so curHp may still be
                     full client-side. Force curHp to 0 so the transform
                     check fires regardless of the cached HP fraction. */
                  deadM.curHp = 0;
                  maybeTransformMonster(deadM);
                  deadM.alive = false;
                  /* Loot drop: push the pile on every client so two screens
                     show the same drop at the same position.  Each client
                     stores its own per-share coin amount on the pile (coin
                     icon glow stays visible even when coins=0 because the
                     renderer also gates on l.recipients).  The recipients
                     list gates pickup so a non-contributor walking over
                     just gets a "not yours" beep instead of taking the
                     loot.  Position uses the server's kill x/y (payload.x/y)
                     so every screen agrees -- no per-client jitter. */
                  var _lootX = (typeof payload.x === 'number') ? payload.x : (deadM.x || deadM.renderX);
                  var _lootY = (typeof payload.y === 'number') ? payload.y : (deadM.y || deadM.renderY);
                  /* Local loot-pile push.  Skipped when the worker is
                     authoritative for loot (S._serverLoot): in that
                     mode the server emits loot_drop and we receive the
                     pile via the loot_drop case in _processGameEvent
                     above.  This block remains as the fallback for
                     dungeons / SP / zones the worker doesn't model.
                     Death SFX, particles, and XP attribution still run
                     either way (see below). */
                  if (!S._serverLoot) {
                    var _lootId = 'mk-' + payload.monsterId;
                    /* Killer name for the "[X]'s loot" label on non-owner
                       screens.  Fall back to 'Player' if we don't have the
                       other-player entry yet (e.g. they just joined). */
                    var _killerName = (payload.killerId === S.myId)
                      ? (S.myName || 'You')
                      : ((S.others && S.others[payload.killerId] && S.others[payload.killerId].name) || 'Player');
                    if (!deadM._lootDropped && S.groundLoot && isRemnantSkull(deadM.type)) {
                      deadM._lootDropped = true;
                      var _shardB = rollMonsterShard(S.currentZone);
                      S.groundLoot.push({
                        lootId: _lootId,
                        x: _lootX, y: _lootY,
                        coins: _killGoldPre,
                        xp: 0,
                        skull: deadM.type,
                        skullEmoji: '🦴',
                        ts: Date.now(),
                        shard: _shardB,
                        recipients: _goldList,
                        killerName: _killerName,
                      });
                    } else if (!deadM._lootDropped && S.groundLoot) {
                      deadM._lootDropped = true;
                      S.groundLoot.push({
                        lootId: _lootId,
                        x: _lootX, y: _lootY,
                        coins: _killGoldPre,
                        xp: 0,
                        ts: Date.now(),
                        recipients: _goldList,
                        killerName: _killerName,
                      });
                    }
                  }
                  /* Per-archetype death SFX (snowman-death, monster-death
                     fallback; slime fodder is muted via its own splat
                     hook in entityRenderer).  Local hit paths call this
                     too but bail in MP before reaching it -- monster_kill
                     is the only path that knows the kill happened here. */
                  if (!deadM._deathSfxPlayed) {
                    deadM._deathSfxPlayed = true;
                    try { BT_AUDIO.monsterDeath(deadM.archetype || deadM.type); } catch (e) {}
                  }
                  /* Don't clobber deadM.hp — for server monsters it's
                     the spawn-time max-HP reference used by the HP bar
                     denominator.  Zeroing it broke every slime's bar
                     on its 2nd life after respawn. */
                  /* Death particles */
                  for (var dp = 0; dp < 8; dp++) {
                    S.hitParticles.push({
                      x: deadM.x || deadM.renderX, y: deadM.y || deadM.renderY,
                      vx: (Math.random() - 0.5) * 4, vy: -1 - Math.random() * 3,
                      life: 1.0, color: deadM.color || '#ff5e6c', size: 3
                    });
                  }
                }
              }
              /* Award XP if we are a recipient.  GDD §7:
                 contribution-weighted split — each recipient gets
                 monster.xp * shares[myId].  Gold is no longer added
                 here; it spawned on the loot drop above and the player
                 must walk over it (pickup logic awards coins + shows
                 the +NG popup in gold w/ coin icon). */
              if (_amRecipient) {
                var R = S.rpg;
                if (R) {
                  var killXp = _killXpPre;
                  if (R._compStats) {
                    R._compStats.monstersKilled = (R._compStats.monstersKilled || 0) + 1;
                  }
                  /* Use-trained T1 split: divide killXp across stats by
                     their relative _buildUse share since the last kill,
                     then reset the tally.  T1 stats are still
                     client-side; T2 (xp/level/unspentT2) is server-
                     authoritative when S._serverMonsters is true. */
                  distributeKillXpToBuild(R, killXp);
                  /* Melee lifesteal — refund 90% of damage this monster
                     dealt to us, but only if we currently have melee equipped. */
                  applyMeleeLifesteal(S, R, deadM);
                  /* "+N XP" popup -- client-predicted from
                     payload.xp * shares[myId] * killVarMult for snappy
                     UX.  The actual R.xp update arrives via
                     player_state shortly after; combat_credit handles
                     the level-up popup + SFX. */
                  pushHudPopup(S, { target: 'xpBar', text: '+' + killXp + ' XP', color: '#60a5fa' });
                  /* Local R.xp += / level-up loop runs only when the
                     worker doesn't own combat XP for this kill (i.e.
                     when _serverMonsters is false -- dungeons / SP).
                     For server monsters, _addCombatXp on the worker
                     applies XP + level-up + 5 unspentT2 per level,
                     then sends combat_credit (popup/SFX) and
                     player_state (authoritative totals). */
                  if (!S._serverMonsters) {
                    R.xp = (R.xp || 0) + killXp;
                    /* A1: combat level is determined PURELY by build
                       points -- 5 BP = 1 level. killXp accumulates on
                       R.xp for the bar UI but no longer gates anything. */
                    while ((R._buildPointsThisLvl || 0) >= 5) {
                      R._buildPointsThisLvl -= 5;
                      R.level++;
                      R.unspentT2 = 0; /* T2 retired — weapon points now come from per-category weapon-skill levels */
                      recalcDerived(R);
                      R.hp = R.maxHp; R.stamina = R.maxStamina; R.mana = R.maxMana;
                      setLevelUpMsg({ kind: 'combat', level: R.level, ts: Date.now() });
                      BT_AUDIO.levelUp();
                    }
                  }
                  setRpgState(_objectSpread({}, R));
                  try { localStorage.setItem('bt_rpg', JSON.stringify(R)); } catch(e) {}
                }
              }
              break;
            }
          case 'monster_attack':
            {
              /* Server monster attacked someone */
              if (payload.targetId !== S.myId) {
                /* Remote-player hit feedback: flash their sprite + float a
                   damage number over them so other players' fights read
                   as real, not invisible.  No HP math — server is
                   authoritative on remote HP; this is purely visual.
                   Suppress entirely when the remote is dead: prevents
                   phantom hit-flashes on a corpse while the server
                   hasn't yet stopped its monster AI from targeting
                   them (idle players, slow disconnect detection). */
                var rOther = S.others && S.others[payload.targetId];
                if (rOther && !rOther._isDead) {
                  rOther._hitFlash = Date.now();
                  S.dmgNumbers.push({
                    x: rOther.x || 0,
                    y: (rOther.y || 0) - 20,
                    text: '-' + (payload.dmg || 0),
                    color: '#ff5e6c',
                    ts: Date.now()
                  });
                }
                break;
              }
              var R2 = S.rpg;
              if (!R2 || R2.hp <= 0) break;
              /* ── Out-of-range filter ──
                 The server's monster-attack ranging was firing damage
                 events for monsters the player can't see (off-screen or
                 desynced from the local snapshot), which read as
                 mystery damage with no visible attacker. Drop the event
                 client-side when the attacker isn't a known nearby
                 monster. The server is authoritative on HP, so on the
                 next state_sync any genuine HP delta gets reconciled —
                 this just suppresses the visual "ghost hit" in the
                 normal case. */
              var atkSrc = (payload.monsterId && S.monsters) ? S.monsters.find(function (mm) { return mm.id === payload.monsterId; }) : null;
              /* Drop the event when the attacker isn't in our local
                 monster snapshot — even if the server provided
                 attackerX/Y. If the client doesn't have the monster
                 registered, it can't render the source, so the user
                 sees damage with no visible attacker. The
                 wsClient.js tick handler only UPDATES existing local
                 monsters, so a server-spawned monster the client
                 missed during initial sync stays invisible until a
                 zone change re-syncs. Server doesn't track player HP,
                 so dropping is safe — no desync to reconcile. */
              if (!atkSrc) {
                if (window.__dmgLog) try { console.log('[dmg] net-monster_attack DROPPED (not in snapshot)', { monsterId: payload.monsterId, srvAttackerXY: (typeof payload.attackerX === 'number') ? { x: Math.round(payload.attackerX), y: Math.round(payload.attackerY) } : null }); } catch (e) {}
                break;
              }
              /* Prefer the server's authoritative position (payload.attackerX/Y)
                 over the local snapshot — the server's view is what decided the
                 attack should fire, and the snapshot can lag a few ticks. */
              var _atkX = (typeof payload.attackerX === 'number') ? payload.attackerX : atkSrc.x;
              var _atkY = (typeof payload.attackerY === 'number') ? payload.attackerY : atkSrc.y;
              var _atkDx = _atkX - S.player.x, _atkDy = _atkY - S.player.y;
              var _atkDist = Math.sqrt(_atkDx * _atkDx + _atkDy * _atkDy);
              if (_atkDist > 160) {
                if (window.__dmgLog) try { console.log('[dmg] net-monster_attack DROPPED (out of range)', { monsterId: payload.monsterId, dist: Math.round(_atkDist) }); } catch (e) {}
                break;
              }
              /* Server-side block resolution (v2.3.103+): worker fires
                 monster_attack with blocked:true + staminaDrain when
                 ps.blocking was set at attack time.  Show the "Blocked!"
                 popup, push the floating stamina-cost number, skip the
                 HP-damage path entirely.  Player_state will arrive
                 shortly after to mirror the authoritative stamina value. */
              if (payload.blocked) {
                S.dmgNumbers.push({
                  x: S.player.x, y: S.player.y - 20,
                  text: 'Blocked!', color: '#60a5fa', ts: Date.now()
                });
                var _staminaDrainBlock = typeof payload.staminaDrain === 'number' ? payload.staminaDrain : 15;
                if (_staminaDrainBlock > 0) {
                  S.dmgNumbers.push({
                    x: S.player.x + 18, y: S.player.y - 4,
                    text: '-' + _staminaDrainBlock,
                    color: '#facc15', /* stamina yellow */
                    ts: Date.now() + 1
                  });
                }
                addBuildUse(R2, 'endurance', 3);
                break;
              }
              var mDmg = payload.dmg || 5;
              /* Per-variant damage multiplier + range gating.  Server
                 doesn't know about variants, so we apply the local
                 attacker variant's scalars here:
                 - dmgMult: skeleton hits ~4x harder.
                 - noProjectile: server's fodder AI fires ranged
                   slime-orb attacks; the client suppresses the
                   visual via noProjectile, but the server's
                   monster_attack still applies the hit, which the
                   user reads as "invisible projectile".  Drop the
                   damage entirely when a noProjectile attacker is
                   outside melee range so mummies / skeletons can
                   only land melee swings. */
              var _atkArchKey = atkSrc.archetype || atkSrc.type;
              var _atkVariant = MONSTER_VARIANTS[_atkArchKey];
              if (_atkVariant && _atkVariant.noProjectile && _atkDist > 60) {
                if (window.__dmgLog) try { console.log('[dmg] net-monster_attack DROPPED (noProjectile out of melee)', { monsterId: payload.monsterId, dist: Math.round(_atkDist), arch: _atkArchKey }); } catch (e) {}
                break;
              }
              if (_atkVariant && _atkVariant.dmgMult) {
                mDmg = Math.ceil(mDmg * _atkVariant.dmgMult);
              }
              /* Apply player defense.  In MP the worker is the source of
                 truth for HP -- it ran the same formula and pushed the
                 resolved dmgTaken in the event payload.  Prefer that for
                 the popup; fall back to local recompute when serverMonsters
                 isn't set (SP-only mode, local AI). */
              var pDef2 = (R2.endurance || 0) * 0.5 + ((R2.armor ? R2.armor.tierMult : 1) || 1) * 3;
              var dmgTaken2 = (typeof payload.dmgTaken === 'number' && S._serverMonsters)
                ? payload.dmgTaken
                : Math.max(1, mDmg - pDef2 * 0.3);
              var inArc = isAttackInShieldArc(S, _atkX, _atkY);
              if (S._shieldUp && inArc) {
                /* Full block: no damage through.  (Was partial via
                   calcBlockReduction; user request is "the damage gets
                   blocked.")  In MP the server already skipped the
                   attack when ps.blocking was set on the move event,
                   so dmgTaken2 from payload is for non-block hits; but
                   if a stale shield-up arc-test landed here we still
                   want the local block visual. */
                dmgTaken2 = 0;
                R2.stamina = Math.max(0, (R2.stamina || 0) - 15);
                /* Count-based weight: 1 successful block = 3 hits worth
                   of endurance share.  Pairs with hit weight = 1 to
                   match the user's hits-vs-blocks ratio for the
                   Endurance share of killXp. */
                addBuildUse(R2, 'endurance', 3);
              }
              /* Check dodge */
              if (S._dodgeRoll) break; /* in i-frames */
              /* HP mutation: worker authoritative in MP.  Don't decrement
                 local R.hp here -- the player_state event that follows
                 monster_attack carries the new authoritative hp.  Keep
                 the SP-only path for client-local monsters. */
              if (!S._serverMonsters) {
                R2.hp = Math.max(0, R2.hp - Math.ceil(dmgTaken2));
              }
              if (window.__dmgLog) try {
                console.log('[dmg] net-monster_attack', {
                  amt: Math.ceil(dmgTaken2),
                  monsterId: payload.monsterId,
                  /* server-side fields — present means brotown-server is deployed past 582553b */
                  srvAttackerXY: (typeof payload.attackerX === 'number') ? { x: Math.round(payload.attackerX), y: Math.round(payload.attackerY) } : null,
                  srvDeployed: typeof payload.attackerX === 'number',
                  /* local snapshot */
                  localAttacker: atkSrc ? { x: Math.round(atkSrc.x), y: Math.round(atkSrc.y), arch: atkSrc.arch || atkSrc.archetype, alive: atkSrc.alive } : 'NOT_IN_SNAPSHOT',
                  /* what the filter saw */
                  resolvedAtk: { x: Math.round(_atkX), y: Math.round(_atkY) },
                  player: { x: Math.round(S.player.x), y: Math.round(S.player.y) },
                  dist: Math.round(_atkDist),
                  shieldUp: !!S._shieldUp,
                  inArc: inArc,
                });
              } catch (e) {}
              /* v2.3.248: player sprite hit-flash on MP server-monster
                 hits.  SP paths (lines 7585 / 7653 / 7906 / 7950 / 10919)
                 already set this on local hits; the MP monster_attack
                 handler was missing it, so the renderer's
                 isHit = S._hitFlash && (now - S._hitFlash) < 250
                 check at entityRenderer.js:1943 never tripped and the
                 sprite never flashed red.  Only flash when actual damage
                 lands (block / dodge zero dmgTaken2 → no flash). */
              if (Math.ceil(dmgTaken2) > 0) {
                S._hitFlash = Date.now();
              }
              S.dmgNumbers.push({
                x: S.player.x, y: S.player.y - 20,
                text: '-' + Math.ceil(dmgTaken2), color: '#ff5e6c',
                /* v2.3.110: heart glyph alongside "-N" popup so the
                   loss-of-HP intent reads instantly. */
                iconKey: 'heart',
                ts: Date.now()
              });
              for (var hp3 = 0; hp3 < 4; hp3++) S.hitParticles.push({
                x: S.player.x, y: S.player.y,
                vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2,
                life: 0.6, color: '#ff5e6c', size: 2
              });
              S.screenShake = 3;
              BT_AUDIO.beep(200, 0.1, 0.15, 'sawtooth');
              /* Death path: in MP the worker fires player_died (which
                 handles the death animation + popup) and player_respawned
                 (which teleports to town) -- both wired in the WS switch
                 above.  Local R2.hp can lag the server by a tick, so we
                 must NOT trigger death from a local <=0 check in MP.
                 Keep the SP path for client-local monsters. */
              if (!S._serverMonsters && R2.hp <= 0 && !S._dying) {
                /* Player death from client-local monster (SP mode) */
                S._dying = true;
                if (!R2._compStats) R2._compStats = createDefaultCompStats();
                R2._compStats.deaths++;
                /* Death-anim timeline starts now; renderer plays the
                   21-frame sequence until respawn clears it. */
                S._deathStart = Date.now();
                /* Tell the server we died now so monster AI stops
                   targeting us during the 5 s respawn window, and
                   broadcast the death so remote clients render a
                   dead pose at our last position. */
                if (S.channel) S.channel.send({ type: 'broadcast', event: 'move', payload: { x: S.player.x, y: S.player.y, z: S.currentZone, vx: 0, vy: 0 } });
                if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_died_to_monster', payload: { id: S.myId, x: S.player.x, y: S.player.y } });
                /* Gold penalty */
                var goldLost2 = Math.floor(R2.coins * DEATH_GOLD_PENALTY);
                R2.coins = Math.max(0, R2.coins - goldLost2);
                /* Death particles */
                for (var dp2 = 0; dp2 < 25; dp2++) {
                  var dpA2 = dp2 / 25 * Math.PI * 2;
                  S.hitParticles.push({
                    x: S.player.x, y: S.player.y,
                    vx: Math.cos(dpA2) * (2 + Math.random() * 4),
                    vy: Math.sin(dpA2) * (2 + Math.random() * 4) - 1,
                    life: 1.0, color: ['#ff5e6c','#cc2233','#ff8888'][Math.floor(Math.random()*3)], size: 2 + Math.random() * 3
                  });
                }
                S.screenShake = 10;
                S.dmgNumbers.push({
                  x: S.player.x, y: S.player.y - 40,
                  text: 'YOU DIED', color: '#ff5e6c', ts: Date.now()
                });
                if (goldLost2 > 0) S.dmgNumbers.push({
                  x: S.player.x, y: S.player.y - 55,
                  text: '-' + goldLost2 + 'G', color: '#fbbf24', ts: Date.now()
                });
                BT_AUDIO.deathBoom();
                /* Respawn in town after delay */
                var respawnDelay = 5000;
                setTimeout(function() {
                  R2.hp = R2.maxHp;
                  R2.stamina = R2.maxStamina;
                  R2.mana = R2.maxMana;
                  S.currentZone = 'town';
                  updateZoneDimensions('town');
                  BT_AUDIO.startZoneAmbient('town');
                  S.map = generateZoneMap('town');
                  S.monsters = []; /* Town has no monsters */
                  S.gatherNodes = []; /* and no harvestable resources -- clear stale entries from the previous zone */
                  S.player.x = 24 * TILE;
                  S.player.y = 24 * TILE;
                  S.respawnTimer = Date.now() + 3000;
                  S._deathStart = 0;
                  S._dying = false;
                  /* Server learns dead=false + new zone via this move;
                     other clients clear our _isDead via the broadcast. */
                  if (S.channel) S.channel.send({ type: 'broadcast', event: 'move', payload: { x: S.player.x, y: S.player.y, z: S.currentZone, vx: 0, vy: 0 } });
                  if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_respawned', payload: { id: S.myId } });
                  setRpgState(_objectSpread({}, R2));
                  try { localStorage.setItem('bt_rpg', JSON.stringify(R2)); } catch(e) {}
                }, respawnDelay);
              }
              setRpgState(_objectSpread({}, R2));
              break;
            }
          case 'player_hurt_by_monster':
            {
              /* Client-local monster damage report — used in zones that
                 still run client-local AI (e.g. dungeon waves).  For
                 server-authoritative zones the monster_attack handler
                 above already does this; this case covers anything
                 else.  Visual only. */
              if (payload.id === S.myId) break;
              var hurtOther = S.others && S.others[payload.id];
              if (!hurtOther) break;
              hurtOther._hitFlash = Date.now();
              S.dmgNumbers.push({
                x: hurtOther.x || 0,
                y: (hurtOther.y || 0) - 20,
                text: '-' + (payload.dmg || 0),
                color: '#ff5e6c',
                ts: Date.now()
              });
              break;
            }
          case 'monster_dmg_at':
            {
              /* Client-local monster damage broadcast — used in zones
                 that still run client-local AI.  Server-authoritative
                 zones use monster_hit instead, which the handler above
                 already covers.  Drops own echoes. */
              if (payload.id === S.myId) break;
              /* Client-local peer floater -> smoothing queue (keyed by a
                 coarse position bucket since this carries only x,y). */
              enqueuePeerDamage(S, peerDmgKey(null, payload.x || 0, payload.y || 0), {
                x: payload.x || 0,
                y: (payload.y || 0) - 20,
                text: '-' + (payload.dmg || 0),
                color: payload.isCrit ? '#fbbf24' : '#ff8888'
              });
              break;
            }
          case 'player_died_to_monster':
            {
              /* Remote player died on their client.  Spawn the same
                 red death-burst + skull popup we render locally,
                 anchored to the reported position.  Also set
                 _isDead on the remote entry so we render a death
                 pose and suppress further hit-flash events for them
                 until they broadcast player_respawned (or their next
                 tick payload shows them alive in a new zone).  PvP
                 deaths are handled by pvp_confirmed and aren't
                 double-rendered. */
              if (payload.id === S.myId) break;
              var deadOther = S.others && S.others[payload.id];
              if (deadOther) {
                deadOther._isDead = true;
                deadOther._deathTs = Date.now();
              }
              var dthX = payload.x || 0, dthY = payload.y || 0;
              for (var dpx = 0; dpx < 20; dpx++) {
                var dpAx = dpx / 20 * Math.PI * 2;
                S.hitParticles.push({
                  x: dthX, y: dthY,
                  vx: Math.cos(dpAx) * (2 + Math.random() * 4),
                  vy: Math.sin(dpAx) * (2 + Math.random() * 4) - 1,
                  life: 1.0,
                  color: ['#ff5e6c','#cc2233','#ff8888'][Math.floor(Math.random()*3)],
                  size: 2 + Math.random() * 2
                });
              }
              S.dmgNumbers.push({
                x: dthX, y: dthY - 40,
                text: 'KO',
                color: '#ff5e6c',
                ts: Date.now(),
                ttl: 2.0
              });
              break;
            }
          case 'player_respawned':
            {
              /* Remote player respawned — clear the death visual.  We
                 also tolerate the tick-arrival ordering case where the
                 remote's move msg (with the new town position) arrives
                 first; the renderer simply reads _isDead each frame, so
                 clearing it here is sufficient. */
              if (payload.id === S.myId) break;
              var resOther = S.others && S.others[payload.id];
              if (resOther) {
                resOther._isDead = false;
                resOther._deathTs = 0;
              }
              break;
            }
          /* mkt_order removed — marketplace uses server API now */
          case 'arena_bet':
            {
              /* Track remote bets for pot calculation */
              if (payload.bettorId === S.myId) break;
              if (!S._remoteBets) S._remoteBets = [];
              S._remoteBets.push(payload);
              break;
            }
          case 'clan_war_declare':
            {
              /* Another clan declared war — check if we're the target */
              var war = payload.war;
              if (!war || !S._clanData) break;
              if (war.defender.tag === S._clanData.tag) {
                var _ZONES$war$zone;
                /* We're being challenged! */
                S._activeClanWar = war;
                war.defender.members.push(S.myId);
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 40,
                  text: '[' + war.challenger.tag + '] declared WAR!',
                  color: '#ff5e6c',
                  ts: Date.now()
                });
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 25,
                  text: 'Battle zone: ' + (((_ZONES$war$zone = ZONES[war.zone]) === null || _ZONES$war$zone === void 0 ? void 0 : _ZONES$war$zone.name) || war.zone),
                  color: 'rgba(255,255,255,.5)',
                  ts: Date.now()
                });
                BT_AUDIO.beep(200, 0.2, 0.25, 'sawtooth');
                S.screenShake = 6;
              } else if (war.challenger.tag === S._clanData.tag) {
                /* We're in the challenger clan — join the war */
                if (!S._activeClanWar) S._activeClanWar = war;
                S._activeClanWar.challenger.members.push(S.myId);
              }
              break;
            }
          case 'clan_war_kill':
            {
              /* A kill happened in the war zone */
              if (!S._activeClanWar) break;
              var _war = S._activeClanWar;
              if (payload.warId !== _war.id) break;
              _war.killLog.push(payload.kill);
              if (payload.scoreSide === 'challenger') _war.challenger.score += payload.kill.points;else if (payload.scoreSide === 'defender') _war.defender.score += payload.kill.points;
              S.dmgNumbers.push({
                x: S.player.x,
                y: S.player.y - 50,
                text: payload.kill.killer + ' -> ' + payload.kill.victim,
                color: 'rgba(255,255,255,.4)',
                ts: Date.now()
              });
              break;
            }
          case 'clan_war_end':
            {
              if (!S._activeClanWar || payload.warId !== S._activeClanWar.id) break;
              S._activeClanWar.status = 'ended';
              S._activeClanWar.winner = payload.winner;
              var isWinner = S._clanData && payload.winner === S._clanData.tag;
              var reward = isWinner ? CLAN_WAR_REWARDS.winner : CLAN_WAR_REWARDS.loser;
              if (S.rpg) {
                S.rpg.coins += reward.gold;
                S.rpg.achievementPoints = (S.rpg.achievementPoints || 0) + reward.ap;
                if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += reward.gold;
              }
              S.dmgNumbers.push({
                x: S.player.x,
                y: S.player.y - 50,
                text: isWinner ? 'WAR WON!' : 'War lost...',
                color: isWinner ? '#f5c542' : '#ff5e6c',
                ts: Date.now()
              });
              S.dmgNumbers.push({
                x: S.player.x,
                y: S.player.y - 35,
                text: '+' + reward.gold + 'G +' + reward.ap + 'AP',
                color: '#f5c542',
                ts: Date.now()
              });
              if (isWinner) BT_AUDIO.levelUp();else BT_AUDIO.beep(150, 0.1, 0.15, 'triangle');
              setTimeout(function () {
                S._activeClanWar = null;
              }, 10000); /* clear after 10s */
              break;
            }
          case 'arena_bet':
            {
              /* Receive spectator bet from another player */
              if (payload.playerId === S.myId) break;
              setArenaBets(function (prev) {
                return [].concat(_toConsumableArray(prev), [payload]);
              });
              break;
            }
          case 'stunned':
            {
              if (payload.target === S.myId) S._stunEnd = Date.now() + (payload.duration || 2000);
              break;
            }
          case 'trade_offer':
            {
              if (payload.target === S.myId) setIncomingTrade({
                from: payload.from,
                fromName: payload.fromName,
                offer: payload.offer,
                ts: Date.now()
              });
              break;
            }
          case 'trade_accept':
            {
              if (payload.target === S.myId) {
                var _R = S.rpg;
                if (!_R) break;
                var offer = payload.offer;
                if (offer.coins) _R.coins = (_R.coins || 0) + offer.coins;
                if (offer.items && _R.inventory) Object.entries(offer.items).forEach(function (_ref10) {
                  var _ref11 = _slicedToArray(_ref10, 2),
                    k = _ref11[0],
                    v = _ref11[1];
                  _R.inventory[k] = (_R.inventory[k] || 0) + v;
                });
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 40,
                  text: 'Trade complete!',
                  color: '#3dd497',
                  ts: Date.now()
                });
                BT_AUDIO.collect();
                setRpgState(_objectSpread({}, _R));
              }
              break;
            }
          case 'trade_reject':
            {
              if (payload.target === S.myId) {
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 30,
                  text: 'Trade declined',
                  color: '#ff5e6c',
                  ts: Date.now()
                });
                BT_AUDIO.beep(200, 0.05, 0.08, 'square');
              }
              break;
            }
          case 'pvp_hit':
            {
              var _R2$armor, _R2$_shieldBonus;
              // §16.12 — Server-authoritative PvP hit (lag-compensated)
              // Server already decided this is a hit. Defender applies own defense calc.
              if (payload.target !== S.myId) {
                // Not targeted at us — if we're the attacker, show hit confirmation
                if (payload.attacker === S.myId) {
                  S.dmgNumbers.push({
                    x: S.player.x + 20,
                    y: S.player.y - 20,
                    text: payload.blocked ? 'Blocked!' : 'Hit!',
                    color: payload.blocked ? '#888' : '#fbbf24',
                    ts: Date.now()
                  });
                }
                break;
              }
              var _R2 = S.rpg;
              if (!_R2) break;
              var pDef = _R2.endurance * 0.5 + (((_R2$armor = _R2.armor) === null || _R2$armor === void 0 ? void 0 : _R2$armor.tierMult) || 1) * 3 + (((_R2$_shieldBonus = _R2._shieldBonus) === null || _R2$_shieldBonus === void 0 ? void 0 : _R2$_shieldBonus.blockFlat) || 0);
              var rawDmg = payload.dmgBase || 10;
              var dmgTaken = Math.max(1, rawDmg - pDef * 0.3);
              // §16.12 — Server already resolved block via historical state
              if (payload.blocked) dmgTaken = Math.ceil(dmgTaken * 0.25);
              if (payload.isCrit) dmgTaken = Math.ceil(dmgTaken * 1.5);
              /* Prefer the server's resolved dmgTaken when present
                 (worker now applies HP damage and the value rides on
                 the payload).  Falls back to local recompute if a peer
                 hasn't deployed the new worker yet. */
              if (typeof payload.dmgTaken === 'number') dmgTaken = payload.dmgTaken;
              /* Worker authoritative HP store: don't mutate R2.hp here.
                 The player_state event that follows pvp_hit carries the
                 new authoritative value.  Death is driven by the server's
                 player_died event. */
              if (window.__dmgLog) try { console.log('[dmg] net-pvp_hit', { amt: Math.ceil(dmgTaken), attacker: payload.attacker, blocked: payload.blocked }); } catch (e) {}
              S.dmgNumbers.push({
                x: S.player.x,
                y: S.player.y - 20,
                text: '-' + Math.ceil(dmgTaken),
                color: payload.blocked ? '#607D8B' : '#ff5e6c',
                ts: Date.now()
              });
              if (payload.blocked) S.dmgNumbers.push({
                x: S.player.x,
                y: S.player.y - 35,
                text: 'BLOCKED',
                color: '#607D8B',
                ts: Date.now()
              });
              for (var hp2 = 0; hp2 < 6; hp2++) S.hitParticles.push({
                x: S.player.x,
                y: S.player.y,
                vx: (Math.random() - .5) * 4,
                vy: -1 - Math.random() * 2,
                life: 0.8,
                color: '#ff5e6c',
                size: 2
              });
              S.screenShake = payload.blocked ? 2 : 4;
              BT_AUDIO.beep(200, 0.1, 0.15, 'sawtooth');
              /* Predict "Killed by X" popup from the (server-resolved
                 or locally-computed) dmgTaken vs current local hp.  HP
                 doesn't mutate locally in MP anymore, so checking
                 _R2.hp <= 0 directly would never fire.  The server-side
                 player_died event drives the death animation; this
                 attribution popup is best-effort. */
              var _wouldDiePvp = (_R2.hp - Math.ceil(dmgTaken)) <= 0;
              if (_wouldDiePvp) {
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 45,
                  text: 'Killed by ' + (payload.attackerName || '???'),
                  color: '#ff5e6c',
                  ts: Date.now()
                });
                BT_AUDIO.deathBoom();
              }
              // Send pvp_confirmed back for kill tracking, clan wars, arena
              if (S.channel) S.channel.send({
                type: 'broadcast',
                event: 'pvp_confirmed',
                payload: {
                  target: payload.attacker,
                  from: S.myId,
                  dmg: dmgTaken,
                  isCrit: payload.isCrit,
                  died: _wouldDiePvp,
                  name: S.myName,
                  blocked: payload.blocked
                }
              });
              setRpgState(_objectSpread({}, _R2));
              break;
            }
          case 'player_attack':
            {
              var _S$_activeDuel, _ZONES$S$currentZone, _ZONES$S$currentZone2, _R3$armor, _R3$_shieldBonus;
              if (payload.target !== S.myId) break;
              var _R3 = S.rpg;
              if (!_R3) break;
              var isInDuel = ((_S$_activeDuel = S._activeDuel) === null || _S$_activeDuel === void 0 ? void 0 : _S$_activeDuel.partnerId) === payload.id;
              var isLawless = (_ZONES$S$currentZone = ZONES[S.currentZone]) === null || _ZONES$S$currentZone === void 0 ? void 0 : _ZONES$S$currentZone.lawless;
              if (!isInDuel && !isLawless && (_ZONES$S$currentZone2 = ZONES[S.currentZone]) !== null && _ZONES$S$currentZone2 !== void 0 && _ZONES$S$currentZone2.safe) {
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 30,
                  text: 'Safe zone!',
                  color: '#3dd497',
                  ts: Date.now()
                });
                break;
              }
              var _pDef = _R3.endurance * 0.5 + (((_R3$armor = _R3.armor) === null || _R3$armor === void 0 ? void 0 : _R3$armor.tierMult) || 1) * 3 + (((_R3$_shieldBonus = _R3._shieldBonus) === null || _R3$_shieldBonus === void 0 ? void 0 : _R3$_shieldBonus.blockFlat) || 0);
              var _rawDmg = payload.dmg || 10;
              var _dmgTaken = Math.max(1, _rawDmg - _pDef * 0.3);
              var isCrit = payload.isCrit;
              if (isCrit) _dmgTaken = Math.ceil(_dmgTaken * 1.5);
              /* Worker authoritative HP store: don't mutate R3.hp here.
                 The player_state event that follows player_attack carries
                 the new authoritative value.  Death is driven by the
                 server's player_died event. */
              if (window.__dmgLog) try { console.log('[dmg] net-player_attack', { amt: Math.ceil(_dmgTaken), attacker: payload.id, isCrit: isCrit }); } catch (e) {}
              S.dmgNumbers.push({
                x: S.player.x,
                y: S.player.y - 20,
                text: '-' + Math.ceil(_dmgTaken),
                color: '#ff5e6c',
                ts: Date.now()
              });
              for (var _hp = 0; _hp < 6; _hp++) S.hitParticles.push({
                x: S.player.x,
                y: S.player.y,
                vx: (Math.random() - .5) * 4,
                vy: -1 - Math.random() * 2,
                life: 0.8,
                color: '#ff5e6c',
                size: 2
              });
              S.screenShake = 4;
              BT_AUDIO.beep(200, 0.1, 0.15, 'sawtooth');
              if (S.channel) S.channel.send({
                type: 'broadcast',
                event: 'stunned',
                payload: {
                  target: payload.id,
                  duration: 2000
                }
              });
              /* Predict "Killed by X" popup from predicted dmg vs current
                 local hp (worker-authoritative store means _R3.hp won't
                 reflect the hit until player_state arrives). */
              var _wouldDieAtk = (_R3.hp - Math.ceil(_dmgTaken)) <= 0;
              if (_wouldDieAtk) {
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 45,
                  text: 'Killed by ' + payload.name,
                  color: '#ff5e6c',
                  ts: Date.now()
                });
                BT_AUDIO.deathBoom();
              }
              if (S.channel) S.channel.send({
                type: 'broadcast',
                event: 'pvp_confirmed',
                payload: {
                  target: payload.id,
                  from: S.myId,
                  dmg: _dmgTaken,
                  isCrit: isCrit,
                  died: _wouldDieAtk
                }
              });
              setRpgState(_objectSpread({}, _R3));
              break;
            }
          case 'pvp_confirmed':
            {
              if (payload.target !== S.myId) break;
              S.dmgNumbers.push({
                x: S.player.x + 20,
                y: S.player.y - 20,
                text: 'Hit! -' + Math.ceil(payload.dmg),
                color: '#fbbf24',
                ts: Date.now()
              });
              if (payload.died) {
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 50,
                  text: 'KILL!',
                  color: '#3dd497',
                  ts: Date.now()
                });
                BT_AUDIO.collect();
                if (!S.rpg._compStats) S.rpg._compStats = createDefaultCompStats();
                S.rpg._compStats.pvpKills++;
                /* §CW — Score clan war kill */
                if (S._activeClanWar && S._activeClanWar.status === 'active' && S.currentZone === S._activeClanWar.zone) {
                  var _S$_clanData, _S$rpg4;
                  var _war2 = S._activeClanWar;
                  var isChallenger = ((_S$_clanData = S._clanData) === null || _S$_clanData === void 0 ? void 0 : _S$_clanData.tag) === _war2.challenger.tag;
                  var points = 1 + Math.floor((((_S$rpg4 = S.rpg) === null || _S$rpg4 === void 0 ? void 0 : _S$rpg4.level) || 1) / 20); /* higher level = more points */
                  var kill = {
                    killer: S.myName,
                    victim: payload.name || '???',
                    ts: Date.now(),
                    points: points
                  };
                  _war2.killLog.push(kill);
                  if (isChallenger) _war2.challenger.score += points;else _war2.defender.score += points;
                  if (S.channel) S.channel.send({
                    type: 'broadcast',
                    event: 'clan_war_kill',
                    payload: {
                      warId: _war2.id,
                      kill: kill,
                      scoreSide: isChallenger ? 'challenger' : 'defender'
                    }
                  });
                  S.dmgNumbers.push({
                    x: S.player.x,
                    y: S.player.y - 65,
                    text: '+' + points + ' war points!',
                    color: '#ff5e6c',
                    ts: Date.now()
                  });
                }
                /* §ARENA — Report arena match result if this was an arena fight */
                if (S._arenaMatch && (payload.from === S._arenaMatch.p1 || payload.from === S._arenaMatch.p2)) {
                  var match = S._arenaMatch;
                  var loserId = payload.from; /* the person who sent pvp_confirmed with died=true is confirming WE killed THEM */
                  /* Actually: pvp_confirmed target=us, from=attacker. If died=true, the attacker got a kill confirmation.
                     So WE are the killer (target got confirmed as the killer) */
                  fetch(BT_API_BASE + '/api/arena/result', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      tournamentId: S._arenaTournamentId,
                      matchId: match.id,
                      winnerId: S.myId,
                      loserId: match.p1 === S.myId ? match.p2 : match.p1
                    })
                  }).then(function (r) {
                    return r.json();
                  }).then(function (d) {
                    if (d.ok) {
                      var _d$champion;
                      S._arenaMatch = null;
                      if (d.tournamentComplete && ((_d$champion = d.champion) === null || _d$champion === void 0 ? void 0 : _d$champion.id) === S.myId) {
                        /* WE ARE THE CHAMPION */
                        S.rpg.coins += ARENA_CHAMPION_REWARD.gold;
                        S.rpg.achievementPoints = (S.rpg.achievementPoints || 0) + ARENA_CHAMPION_REWARD.ap;
                        if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += ARENA_CHAMPION_REWARD.gold;
                        if (!S.rpg._titles) S.rpg._titles = [];
                        if (!S.rpg._titles.includes('Gladiator')) S.rpg._titles.push('Gladiator');
                        S.dmgNumbers.push({
                          x: S.player.x,
                          y: S.player.y - 80,
                          text: 'GLADIATOR CHAMPION!',
                          color: '#f5c542',
                          ts: Date.now()
                        });
                        S.dmgNumbers.push({
                          x: S.player.x,
                          y: S.player.y - 65,
                          text: '+' + ARENA_CHAMPION_REWARD.gold + 'G +' + ARENA_CHAMPION_REWARD.ap + 'AP',
                          color: '#f5c542',
                          ts: Date.now()
                        });
                        BT_AUDIO.levelUp();
                        S.screenShake = 10;
                      } else {
                        var _d$tournament;
                        S.rpg.coins += ARENA_WIN_REWARD.gold;
                        S.rpg.achievementPoints = (S.rpg.achievementPoints || 0) + ARENA_WIN_REWARD.ap;
                        S.dmgNumbers.push({
                          x: S.player.x,
                          y: S.player.y - 80,
                          text: 'Arena win! Round ' + ((_d$tournament = d.tournament) === null || _d$tournament === void 0 ? void 0 : _d$tournament.round),
                          color: '#3dd497',
                          ts: Date.now()
                        });
                      }
                      setRpgState(_objectSpread({}, S.rpg));
                      try {
                        localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
                      } catch (_unused10) {}
                      if (d.tournament) setArenaTournament(d.tournament);
                    }
                  }).catch(function () {});
                }
              }
              break;
            }
          case 'duel_request':
            {
              if (payload.target === S.myId) setDuelRequest({
                fromId: payload.from,
                fromName: payload.fromName,
                ts: Date.now()
              });
              break;
            }
          case 'duel_accept':
            {
              if (payload.target === S.myId) {
                S._activeDuel = {
                  partnerId: payload.from,
                  startTs: Date.now()
                };
                S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 40,
                  text: 'DUEL STARTED!',
                  color: '#fbbf24',
                  ts: Date.now()
                });
              }
              break;
            }
          case 'duel_decline':
            {
              if (payload.target === S.myId) S.dmgNumbers.push({
                x: S.player.x,
                y: S.player.y - 30,
                text: 'Duel declined',
                color: '#888',
                ts: Date.now()
              });
              break;
            }
          case 'pvp_threat':
            {
              if (payload.target === S.myId) {
                setThreatIncoming({
                  fromId: payload.from,
                  fromName: payload.fromName,
                  fromLevel: payload.fromLevel,
                  ts: Date.now(),
                  countdown: payload.countdown || 120,
                  responded: false
                });
                BT_AUDIO.beep(300, 0.1, 0.15, 'square');
                setTimeout(function () {
                  return BT_AUDIO.beep(200, 0.08, 0.12, 'square');
                }, 150);
              }
              break;
            }
          case 'threat_response':
            {
              if (payload.target === S.myId) {
                if (payload.accepted) S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 40,
                  text: 'Threat accepted!',
                  color: '#fbbf24',
                  ts: Date.now()
                });else S.dmgNumbers.push({
                  x: S.player.x,
                  y: S.player.y - 40,
                  text: 'They fled!',
                  color: '#888',
                  ts: Date.now()
                });
              }
              break;
            }
          case 'duel_wager_request':
            {
              if (payload.target === S.myId) {
                setDuelRequest({
                  fromId: payload.from,
                  fromName: payload.fromName,
                  ts: Date.now(),
                  wager: payload.wager
                });
                BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
                setTimeout(function () {
                  return BT_AUDIO.beep(800, 0.04, 0.06, 'sine');
                }, 80);
              }
              break;
            }
        }
}
