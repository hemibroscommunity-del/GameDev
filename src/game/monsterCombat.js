/* ═══ MONSTER AI + COMBAT — the per-monster simulation + player melee ═══ */
/* v2.3.811: moved verbatim from the game loop in src/ui/BroTown.jsx
   (REBUILD-PLAN Phase 8, slice 3; behavior-frozen). This is the single
   largest game-loop block (~2,460 lines): the `if (S.monsters && S.rpg)`
   body — per-frame weapon/crit setup, the `S.monsters.forEach(m)` AI +
   combat loop (status ticks, archetype AI, aggro, boss abilities/phases,
   telegraphs, fodder ranged attacks, archetype attack FX, block feedback,
   melee resolution, kills, drops/shards/gems/nuggets), the player-swing
   PvP pass against `S.others`, and the periodic RPG save.

   Capture analysis (depth-aware scope scan, since the build can't be run
   in this env): every external reference is either a module import below
   or an explicit dep. The non-obvious captures:
   - `P` is the player; declared here as `S.player` (the loop's own alias).
   - `activeWpn` is the OUTER game-loop `activeWpn` (a separate variable
     from the block-internal `_activeWpn`) — captured via deps so the one
     shard-roll RPC that reads `activeWpn.element1` is byte-identical.
   - `setRpgState` / `setLevelUpMsg` are the React setters.
   `window._pixiRenderer` stays a runtime global (same as the other
   extracted loop modules). S is stateRef.current. */
import { DMG_CRIT_COLOR } from '@/rendering/systems/effectsRenderer.js'; /* v2.3.2212: one crit colour, every door */
import {
  BT_AUDIO, DEATH_GOLD_PENALTY, DEATH_SCATTER_RECOVERY,
  ECHO_AGGRO_MULT, ELEMENTS, GEM_DROP_RATES, GOLD_NUGGET_DROP, GS_FORWARD_ARC,
  GS_INNER_RADIUS, GS_OUTER_RADIUS, PVP_THREAT_DURATION,
  QUEST_CHAINS, QUEST_STATUS, RARE_DROP_CHANCE, RARE_DROP_ITEMS, RARITY_TIERS,
  RESPAWN_BASE, RESPAWN_ESCALATE, RESPAWN_ESCALATE_WINDOW, RESPAWN_MAX, SPECIAL_ATK_MULT, specialAtkMultFor,
  SWING_ARC, SWING_COOLDOWN, SWING_RANGE, MELEE_CONTACT_MS /* v2.3.2200 */, TILE, WEAPON_TYPES, WELL_RESTED_XP_MULT,
  ZONES, ZONE_RESOURCES, applyStatus, awardWeaponXp, bowPierceCount, bowRangeMult, calcBlockReduction, calcCritChance,
  calcCritMult, calcDisplayDmgRange, calcSpecialDmg, calcWeaponDmg, cleaveArcBonus, createDefaultCompStats, createDefaultLifeSkills,
  CRIT_ANCHOR_MULT,
  createMonster, discoverCollision, discoverMonster, generateZoneMap, getActiveWeapon,
  getAttunementPts, getCollisionDeathFX, getDefenseBlockBonus, getEffectiveness, getElementDeathFX,
  getShieldStats, getWeaponCritDmgStat, getWeaponCritStat, meleeSwingSfx, recalcDerived, resolveCollision,
  getEvasionPts, poiseStunFlatMs, rollPassiveDodge, getWeaponCritFlat, spawnElementStatusFX, spawnWeaponHitFX, swingCooldownMult, tickStatuses, updateZoneDimensions,
  trainDefense, applyIronSkin, applyResilience, /* v2.3.1314 */
  monsterBodyOffsetY, monsterMeleeHitRadius, monsterProceduralRadius, TOWN_SPAWN /* v2.3.1777 */
} from '@/data/index.js';
import { prog3Live, prog3CatFor, prog3CritPct, prog3CritMult, prog3CritFlat } from '@/data/prog3.js'; /* v2.3.2218 */
import { MONSTER_VARIANTS, baseArchetypeOf, hitShapeOf, hitMaterialOf /* v2.3.2200 */, isIntangible /* v2.3.2224 */, isFodderLike, isRemnantSkull, maybeTransformMonster, usesClientSideMovement, xpMultFor } from '@/data/monsterVariants.js';
import { isWearingArmor } from '@/rendering/gearCatalog.js'; /* v2.3.1104: armoured-hit SFX check */
import { rollMonsterShard } from '@/data/shards.js';
import { addBuildUse, applyMeleeLifesteal, clearSwingHitFlags, distributeKillXpToBuild, trackMonsterDamage, pushDmgPopup, monsterPopupY, isPlayerDead, hurtPlayerLocal, isAttackInShieldArc, lockAimPoint, spawnHitDebris, spawnGroundDecal /* v2.3.2200 */ } from '@/game/combatHelpers.js';
import { earnCertification as masteryEarnCert } from '@/game/mastery.js';
import { celebrateLevelUps } from '@/game/levelCelebration.js';
import { btRpc, getBtPlayerId, syncRpgToServer } from '@/networking/index.js';
import { pushHudPopup } from '@/ui/XpFlyOverlay.jsx';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';
import { saveRpgSoon } from '@/game/rpgSave.js'; /* v2.3.1356 */

export function updateMonsterCombat(S, deps) {
  var P = S.player;
  var activeWpn = deps.activeWpn,
    setRpgState = deps.setRpgState,
    setLevelUpMsg = deps.setLevelUpMsg;
        /* ═══ MONSTER AI + COMBAT ═══ */
        if (S.monsters && S.rpg) {
          var _R6$_amuletBonus, _R6$_amuletBonus2, _S$rpg9;
          var _R6 = S.rpg;
          /* v2.3.1136: tag player with the Attunement channel for status
             duration scaling (replaces the retired Influence stamp — that
             stat is pinned 0 since v2.3.910). */
          S.player._rpgAttune = getAttunementPts(_R6);
          /* §4.4 Weapon Damage — uses new stat system.
             v2.3.213: fall back to a zero-damage "Unarmed" object when
             nothing is equipped so per-frame reads of .type/.tierMult
             don't crash.  Auto-attack is gated separately and won't
             fire without a real weapon. */
          var _activeWpn = getActiveWeapon(_R6) || {
            type: 'greatsword', tier: 'common', tierMult: 0,
            element1: null, element2: null, name: 'Unarmed'
          };
          var wpnType = WEAPON_TYPES[_activeWpn.type] || WEAPON_TYPES.greatsword;
          var pDmg = calcWeaponDmg(_activeWpn.type, _R6 || {}, _activeWpn.tierMult, _activeWpn);
          /* Snapshot the un-modified base — the "block N" popup compares
             the final dmg against this so any negative modifier (curse,
             level-diff scaling, future debuffs) shows up without needing
             a per-source code path.  Matches the value shown in the
             WeaponSwapBar DMG readout. */
          var _pDmgBase = pDmg;
          /* §4 Amulet bonus — elemental damage boost */
          if (((_R6$_amuletBonus = _R6._amuletBonus) === null || _R6$_amuletBonus === void 0 ? void 0 : _R6$_amuletBonus.stat) === 'elemDmg' && _activeWpn.element1) pDmg *= 1 + _R6._amuletBonus.value / 100;
          /* §18.1 Food buff — damage multiplier */
          /* v2.3.2058: 1.20 is the COOKED-FOOD magnitude and stays the
             fallback; S._dmgBuffMul carries a stronger buff's own number
             (the Fury Tonic's x2). Bounded 1..4 to match the server's read
             in combat.js -- prediction that can outrun the authority just
             produces popups the room then contradicts. */
          if (S._dmgBuff && Date.now() < S._dmgBuff) {
            var _dbm = Number(S._dmgBuffMul);
            pDmg *= (_dbm >= 1 && _dbm <= 4) ? _dbm : 1.20;
          }
          /* Hexer curse debuff — reduces damage by 30% */
          if (S._cursedUntil && Date.now() < S._cursedUntil) pDmg *= 0.7;
          /* Swarm bleed tick — removed (mosquito damage). Application
             site at the swarm-attack branch is also disabled, so this
             never fires in any new save. Old saves with leftover
             _bleedUntil will simply have it ignored. */
          /* §2.1 Crit — T1 stat (Power) is the baseline source; the
             equipped weapon CATEGORY's crit channel is the T2 amp (replaces
             the retired generic Ferocity stat). */
          /* ═══ v2.3.2218: PREDICT THE CRIT THE SERVER ACTUALLY ROLLS ═══
             This block was prog3-BLIND.  Under prog3 the server rolls
             chance = 1% + 0.4%/pt and multiplier = 1.5 + 1%/pt, both read
             from the offense block of the weapon being swung; every line
             below computed the retired Power/Ferocity curves instead.  For
             a character with 75 crit / 100 critDmg points that is 8% at
             x1.5 predicted against 31% at x2.5 rolled — crits appearing a
             quarter as often and each one landing 40% short.

             It was invisible because the two are never shown side by side:
             gameEvents skips the server's own-hit number ("we already show
             it locally"), so on your own swing the popup is ONLY this
             prediction, and the HP bar drains by a different figure.

             The correct helpers already existed and were already right —
             calcDisplayDps and the Hero screen's Crit row have used them
             since v2.3.2210.  Only this path, the one the player actually
             watches, never called them. */
          var _p3Cat = prog3Live(_R6) ? prog3CatFor((_activeWpn && _activeWpn.type) || 'sword') : null;
          var critChance, critMult, critFlat;
          if (_p3Cat) {
            critChance = prog3CritPct(_R6, _p3Cat);
            critMult = prog3CritMult(_R6, _p3Cat);
            critFlat = prog3CritFlat(_R6, _p3Cat);
            /* No 8% floor and no staff x0.35 here: the server applies
               neither under prog3, and prog3CritPct's own 1% base is what
               replaced the floor (an unallocated character can still crit).
               Re-adding either would put the drift straight back. */
          } else {
            var _wCrit = getWeaponCritStat(_R6);
            critChance = calcCritChance(_R6.power, _wCrit);
            /* v2.3.1133: crit MULT scales on the crit-DMG channel (Executioner /
               Headshot / Arcane Focus), not the crit-CHANCE channel — the old
               call passed _wCrit here, quietly drifting from the server which
               used the retired Ferocity (0). */
            critMult = calcCritMult(_R6.power);
            /* v2.3.1345: the crit-DMG channel is a FLAT accelerating
               bonus on lucky hits now (added after the power mult). */
            critFlat = getWeaponCritFlat(_R6);
            /* Baseline floor: at zero ferocity, calcCritChance returns 0%, which
               meant a brand-new player could never grand-slam. Floor at 8% so a
               grand slam is reachable from the first swing. Applied before the
               staff multiplier so staff still scales as designed (~2.8% floor). */
            critChance = Math.max(critChance, 0.08);
            /* Staff has halved crit chance — lower DPS, higher AoE + variance */
            var isStaffEquipped = (_R6.activeSlot === 'staff');
            if (isStaffEquipped) {
              critChance *= 0.35; /* 35% of normal crit rate */
            }
          }
          /* v2.3.2218: the amulet's critDmg rides the LEGACY branch only.
             combat.js has no amulet crit term at all, so adding it under
             prog3 would re-introduce a client-only bonus — the exact class
             of drift this change removes.  Flagged to the owner rather than
             resolved here: closing it either nerfs a real amulet or is a
             server balance change, and neither is a display fix. */
          if (!_p3Cat && ((_R6$_amuletBonus2 = _R6._amuletBonus) === null || _R6$_amuletBonus2 === void 0 ? void 0 : _R6$_amuletBonus2.stat) === 'critDmg') critMult += _R6._amuletBonus.value / 100;
          var invuln = Date.now() < S.respawnTimer;
          S.monsters.forEach(function (m) {
            if (!m.alive) {
              /* Server handles respawns when _serverMonsters active */
              if (S._serverMonsters) return;
              if (Date.now() > m.respawnAt) {
                m.alive = true;
                m.curHp = m.hp;
                m.statuses = {}; /* clear statuses on respawn */
                /* Clear hit-marks accumulated in the previous life so a
                   freshly respawned monster doesn't appear with old
                   arrows / slashes / burns. */
                m._stuckArrows = [];
                m._slashMarks = [];
                m._burnMarks = [];
                /* Clear slime + snowman death-anim state so the splat
                   sprite / shatter sheet fire fresh on the NEXT death
                   (render-loop guards check _slimeDeathStart == null
                   and _snowmanDeathStart == null). */
                m._slimeDeathStart = null;
                m._snowmanDeathStart = null;
                m.x = m.spawnX + (Math.random() - 0.5) * 60;
                m.y = m.spawnY + (Math.random() - 0.5) * 60;
              }
              return;
            }

            /* §9 — Tick statuses (DoT damage, expiry).
               v2.3.1114: for server-driven monsters the WORKER ticks
               authoritative DoT (its monster_hit events carry the damage
               + popups); local tick keeps only duration/FX bookkeeping. */
            var expired = tickStatuses(m, 16.7 / 1000, Date.now(), _R6, { applyHp: !S._serverMonsters });

            /* ═══ ELEMENT STATUS OVERLAY — ambient particles on statused monsters ═══ */
            /* v2.3.1347: budget-capped. This runs per statused monster per
               FRAME; a pack of burning fire goblins fed S.hitParticles
               (and, below, S.dmgNumbers — each popup mints a Pixi Text)
               without bound, and the game visibly slowed (owner playtest).
               Past ~250 live particles the extra FX are invisible noise
               anyway, so skip spawning instead of queueing. */
            if (m.statuses && m.alive && S.hitParticles.length < 250) {
              Object.entries(m.statuses).forEach(function (_ref13) {
                var _ref14 = _slicedToArray(_ref13, 2),
                  sid = _ref14[0],
                  st = _ref14[1];
                if (!st || !st.element) return;
                var fx = spawnElementStatusFX(m.x, m.y, st.element, Math.random());
                if (fx) S.hitParticles.push(fx);
              });
            }
            if (m._lastDotDmg && Date.now() - m._lastDotDmg.ts < 100) {
              var dot = m._lastDotDmg;
              /* v2.3.1347: DoT popups yield when the popup field is already
                 crowded — every burning monster emits one each 0.5s tick,
                 and each popup is a fresh Pixi Text raster. Player-attack
                 popups are unaffected (their sites don't check this). */
              if ((S.dmgNumbers ? S.dmgNumbers.length : 0) < 30) {
                var dotElem = Object.keys(ELEMENTS).find(function (e) {
                  return ELEMENTS[e].status === dot.statusId;
                });
                var dotColor = dotElem ? ELEMENTS[dotElem].color : '#ff5e6c';
                pushDmgPopup(S, m.x + (Math.random() - 0.5) * 10, monsterPopupY(m, -22), dot.amount + '', dotColor);
              }
              m._lastDotDmg = null;
            }
            /* Check if DoT killed */
            if (m.curHp <= 0 && m.alive) {
              /* When server monsters: server handles kill via monster_kill event — don't set alive=false locally.
                 Drop a visual remnant pile so DoT kills leave debris too. */
              if (S._serverMonsters) {
                m.curHp = 0; /* clamp for HP bar display */
                if (S.groundLoot && isRemnantSkull(m.type)) {
                  var _shardC = rollMonsterShard(S.currentZone);
                  S.groundLoot.push({
                    x: m.x + (Math.random() - 0.5) * 12,
                    y: m.y + (Math.random() - 0.5) * 12,
                    coins: 0,
                    xp: 0,
                    skull: m.type,
                    skullEmoji: '🦴',
                    ts: Date.now(),
                    shard: _shardC,
                  });
                }
                return;
              }
              /* Mummy -> skeleton on overkill: fire the transform before
                 setting alive=false so the renderer picks up the skeleton
                 death sheet instead of popping a mummy with no death art. */
              maybeTransformMonster(m);
              m.alive = false;
              m.respawnAt = Date.now() + 30000;
              m.statuses = {};
              /* Quest kill tracking.  v2.3.1120: questTrack workers own
                 _questKills (objective-aware increments, echoed on the
                 same kill flush) -- this legacy loop counted EVERY
                 active quest on ANY kill and would fight the
                 authoritative echo.  Legacy workers only. */
              if (!(S._serverCaps && S._serverCaps.questTrack)) {
                if (_R6._questKills === undefined) _R6._questKills = {};
                Object.keys(QUEST_CHAINS).forEach(function (qid) {
                  var _R6$_quests;
                  if (((_R6$_quests = _R6._quests) === null || _R6$_quests === void 0 ? void 0 : _R6$_quests[qid]) === QUEST_STATUS.active) _R6._questKills[qid] = (_R6._questKills[qid] || 0) + 1;
                });
              }
              /* Death feedback */
              pushDmgPopup(S, m.x, m.y - 30, 'KO', '#ff5e6c');
              var _shardD = rollMonsterShard(S.currentZone);
              S.groundLoot.push({
                x: m.x,
                y: m.y,
                coins: m.gold || 2,
                xp: 0,
                skull: m.type,
                skullEmoji: '🦴',
                ts: Date.now(),
                shard: _shardD,
              });
              S.screenShake = 3;
              /* Death particles */
              for (var dp = 0; dp < 12; dp++) {
                S.hitParticles.push({
                  x: m.x,
                  y: m.y,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6 - 2,
                  life: 1,
                  color: m.color,
                  size: 1.5 + Math.random() * 2
                });
              }
              BT_AUDIO.deathBoom(m && m.archetype);
              setRpgState(_objectSpread({}, _R6));
            }

            /* ═══ v2.3.1736: POSITION TRACKS THE SERVER EVEN WHILE STUNNED ═══
               Owner: "make the enemy bounce back happen immediately before
               the stun (right now it stuns them and then bounces them back
               which looks awkward)."

               This block used to sit BELOW the two early returns beneath it —
               so a stunned monster returned before ever reaching the
               interpolator, and its renderX/renderY froze at the pre-shove
               position for the entire stun.  Shield Bash applies its 90px
               knockback and its stun in the same instant server-side, but on
               screen the monster stayed put, wore the star ring, and only
               slid backwards once the stun EXPIRED.  Two simultaneous events
               played as a sequence, in the wrong order.

               Moving it above those returns is the whole fix: the shove now
               lands the moment it happens (90px clears the snap threshold
               below, so it is instant), and the stun is just a stun.  The
               v2.3.1736 doubling of stunMs to 1600 would have made the old
               behaviour twice as bad — the delay was the stun's full length.

               The returns below still guard the LOCAL AI, which is what they
               were for: a stunned or knocked-back monster must not chase or
               swing.  For a server monster there is no local AI to skip, only
               a position to mirror. */
            /* When server monsters are active, skip ALL local AI — server handles movement, aggro, attacks, respawns.
               EXCEPTION: client-authoritative variants (e.g. fireGoblin
               with the clientSideMovement flag) fall through and run
               their AI locally so per-archetype spdMult takes effect
               even in MP. */
            if (S._serverMonsters && !usesClientSideMovement(m)) {
              /* Continuous exponential easing toward server position.
                 The previous "jump up to 3 px when gap > 0.5" pattern
                 made slow server-driven variants (mummy at 0.4 spd)
                 stutter visibly: server rounds m.x/m.y to integer
                 before broadcasting, so the integer x bumps by 1 only
                 every ~44 ms.  The interp caught up in one frame then
                 sat for ~3 frames -- 1-frame-of-motion / 3-frames-of-
                 standstill is what the user means by "movement
                 calculation and server tick sync" looking wrong.
                 25 % per frame at 60 fps gives smooth sub-pixel motion
                 every frame: a 1 px jump from a server bump catches
                 up over ~5 frames (~80 ms), which matches the natural
                 ~44 ms bump cadence + a small lag.  Snap on huge
                 jumps (zone change / respawn) stays. */
              if (m.renderX === undefined) { m.renderX = m.x; m.renderY = m.y; }
              var mInterpDx = m.x - m.renderX;
              var mInterpDy = m.y - m.renderY;
              var mInterpDist = Math.sqrt(mInterpDx * mInterpDx + mInterpDy * mInterpDy);
              if (mInterpDist > 80) {
                m.renderX = m.x;
                m.renderY = m.y;
              } else if (mInterpDist > 0.05) {
                /* v2.3.1771: 25% OF THE GAP PER FRAME IS A RATE, NOT A SPEED.
                   The comment above reasons entirely in frames at 60fps, and
                   that is the only screen it is true on.  On a 144Hz monitor
                   the same line closes the gap 2.4x faster and lands the
                   monster ON the server position every frame — which is
                   exactly the 1-frame-of-motion / 3-frames-of-standstill
                   stutter this smoothing was added to remove, since the
                   server only bumps the rounded integer x every ~44ms.  On a
                   phone mid-dip it converges too slowly and monsters trail.
                   pow() makes "25% per 60Hz frame" mean the same amount of
                   catch-up per SECOND on every screen. */
                var _mLerp = 1 - Math.pow(0.75, S._dtScale || 1);
                m.renderX += mInterpDx * _mLerp;
                m.renderY += mInterpDy * _mLerp;
              }
              return; /* skip all local AI below */
            }

            /* Skip if stunned */
            if (m._stunUntil && Date.now() < m._stunUntil) return;

            /* Skip during knockback recovery so the player sees the
               bump on client-side-AI variants (fireGoblin etc).
               Without this the AI snaps the monster back toward the
               player on the next frame and the m.x/y += hit at the
               damage site is invisible.  200 ms window matches the
               stamp set by the melee + arrow hit paths. */
            if (m._kbUntil && Date.now() < m._kbUntil) return;

            /* Status-based movement modifiers.
               v2.3.1771: the base is the frame's dt, not 1 — every m.x/m.y
               step below multiplies by moveMult, so this one line makes
               client-local monster AI (the zones the worker does not
               populate, where _serverMonsters is false) chase at a speed
               instead of at a frame rate.  freeze/root still assign 0
               outright, so the `moveMult > 0` gate below is unchanged. */
            var moveMult = S._dtScale || 1;
            if (m.statuses.freeze) moveMult = 0; /* frozen = can't move */
            if (m.statuses.root) moveMult = 0; /* rooted = can't move */
            if (m.statuses.slow) moveMult *= 0.4; /* slowed */
            /* Kill slowmo — everything moves at 30% speed during kill dilation */
            if (S._killSlowmo && Date.now() - S._killSlowmo < (S._killSlowmoDuration || 200)) {
              moveMult *= 0.3;
            } else if (S._killSlowmo) {
              S._killSlowmo = null; /* expired */
            }
            /* Legacy compat for old _frozen/_slowed flags */
            if (m._frozen && Date.now() < m._frozen) moveMult = 0;
            if (m._slowed && Date.now() < m._slowed) moveMult *= 0.3;

            /* ═══ ARCHETYPE AI — §Creative Vision §9: Alive, Not Artificial ═══ */
            var distToP = Math.sqrt(Math.pow(m.x - P.x, 2) + Math.pow(m.y - P.y, 2));
            var arch = m.archetype || m.type || 'fodder';

            /* Aggro range varies by archetype.  fireGoblin sits in this
               table (not in monsterVariants) because the lookup keys
               directly on m.archetype, which is the variant key after
               applyZoneVariant runs.  Bumped 100 -> 200 per user --
               fodder-default felt too close to engage in the ember zone. */
            var aggroRange = {
              fodder: 100,
              brute: 90,
              swarm: 130,
              sentinel: 80,
              volatile: 110,
              stalker: 160,
              hexer: 140,
              fireGoblin: 200
            }[arch] || 120;
            /* Deep Hollows echo — combat noise doubles aggro range */
            if (S._echoActive) aggroRange *= ECHO_AGGRO_MULT;
            /* Retaliation window -- when a fodder-base monster gets hit
               the damage path sets _chaseUntil so the AI keeps chasing
               for a few seconds even if the player runs back out of the
               normal aggro radius.  Fixes the "goblin stands there while
               you shoot it from outside its sight" complaint. */
            var _retaliating = m._chaseUntil && Date.now() < m._chaseUntil;
            /* AI dispatch uses base archetype so variants inherit
               behaviour from their parent (e.g. fireGoblin -> fodder). */
            var _baseArch = baseArchetypeOf(arch);
            var atkRange = _baseArch === 'hexer' ? 60 : _baseArch === 'stalker' ? 30 : _baseArch === 'fodder' ? 80 : 18;
            var atkCooldown = {
              fodder: 1500,
              brute: 2200,
              swarm: 800,
              sentinel: 1800,
              volatile: 1200,
              stalker: 1000,
              hexer: 2500
            }[_baseArch] || 1500;
            if ((distToP < aggroRange || _retaliating) && moveMult > 0) {
              /* ═══ AGGRO ALERT — "!" flash when enemy first notices player ═══ */
              if (!m._aggroed) {
                m._aggroed = true;
                m._aggroTs = Date.now();
              }
              var chDx = P.x - m.x,
                chDy = P.y - m.y;
              /* v2.3.1181: || 1 guards the hexer retreat divide -- every
                 other branch gates on chDist > N before dividing, but the
                 retreat band includes chDist === 0 (knockback landing the
                 player exactly on the monster), and 0/0 = NaN corrupted
                 m.x/m.y permanently (invisible, unkillable monster). Same
                 idiom as the _moveDist guard below. */
              var chDist = Math.sqrt(chDx * chDx + chDy * chDy) || 1;

              /* Archetype-specific movement behavior */
              if (arch === 'stalker') {
                /* Stalker: circle-strafe, then dash in for quick hit */
                if (!m._stalkPhase) m._stalkPhase = 'circle';
                if (m._stalkPhase === 'circle') {
                  /* Circle the player */
                  var perpAngle = Math.atan2(chDy, chDx) + Math.PI / 2;
                  if (chDist > 40) {
                    m.x += chDx / chDist * m.spd * moveMult;
                    m.y += chDy / chDist * m.spd * moveMult;
                  } else {
                    m.x += Math.cos(perpAngle) * m.spd * moveMult * 0.8;
                    m.y += Math.sin(perpAngle) * m.spd * moveMult * 0.8;
                  }
                  if (Math.random() < 0.008) m._stalkPhase = 'dash'; /* randomly dash in */
                } else {
                  /* Dash toward player */
                  if (chDist > 15) {
                    m.x += chDx / chDist * m.spd * moveMult * 2.5;
                    m.y += chDy / chDist * m.spd * moveMult * 2.5;
                  }
                  if (chDist < 20 || Math.random() < 0.02) m._stalkPhase = 'circle';
                }
              } else if (arch === 'hexer') {
                /* Hexer: keep distance, back away if player gets close */
                var idealRange = 50;
                if (chDist < idealRange * 0.7) {
                  /* Retreat */
                  m.x -= chDx / chDist * m.spd * moveMult * 1.2;
                  m.y -= chDy / chDist * m.spd * moveMult * 1.2;
                } else if (chDist > idealRange * 1.3) {
                  /* Approach */
                  m.x += chDx / chDist * m.spd * moveMult * 0.7;
                  m.y += chDy / chDist * m.spd * moveMult * 0.7;
                }
                /* Slight side-to-side wobble */
                m.x += Math.sin(Date.now() / 500 + m.spawnX) * 0.3 * (S._dtScale || 1); /* v2.3.1771: sway drifts per second, not per frame */
              } else if (arch === 'swarm') {
                /* Swarm: rush directly at player, fast, erratic zigzag */
                if (chDist > 12) {
                  var zigzag = Math.sin(Date.now() / 200 + m.spawnX * 10) * 0.6;
                  var moveAngle = Math.atan2(chDy, chDx) + zigzag;
                  m.x += Math.cos(moveAngle) * m.spd * moveMult;
                  m.y += Math.sin(moveAngle) * m.spd * moveMult;
                }
              } else if (arch === 'volatile') {
                /* Volatile: charge straight, explodes on contact if low HP */
                if (chDist > 12) {
                  var chargeSpd = m.curHp < m.hp * 0.3 ? m.spd * 2.0 : m.spd; /* faster when low HP */
                  m.x += chDx / chDist * chargeSpd * moveMult;
                  m.y += chDy / chDist * chargeSpd * moveMult;
                }
              } else if (arch === 'sentinel') {
                /* Sentinel: slow, deliberate, stops periodically to "wind up" attack */
                if (!m._sentinelPause) m._sentinelPause = 0;
                m._sentinelPause -= 16.7;
                if (m._sentinelPause <= 0) {
                  if (chDist > 20) {
                    m.x += chDx / chDist * m.spd * moveMult * 0.6;
                    m.y += chDy / chDist * m.spd * moveMult * 0.6;
                  }
                  if (chDist < 30 && Math.random() < 0.01) m._sentinelPause = 800; /* wind-up pause */
                }
              } else {
                /* Fodder + Brute: direct chase.  Stop at 55 px to give
                   the player room to face the monster and raise their
                   directional shield before the swing connects -- this
                   is the SAME perimeter the worker uses for server-
                   driven monsters (see brotown-server _tickMonsters,
                   ATTACK_RANGE = 55).  Lives here too because variants
                   with clientSideMovement:true (fireGoblin / skeleton)
                   override the server position and run THIS AI locally;
                   without the matching threshold those variants would
                   still chase right onto the player.
                   v2.3.256: fodder-base variants (slime / fireGoblin /
                   mummy / skeleton) use tall sprites anchored near the
                   feet, so m.y is well below the visible body center
                   (see _mHitY table in the swing code).  Player P.y is
                   the sprite center.  Without compensation, chDy =
                   P.y - m.y stops the monster when its HEAD is at the
                   player's center -- visually overshoots the player.
                   Reference the monster's body center for chase so the
                   55 px gate is measured center-to-center. */
                /* v2.3.1110: unified stop ring -- mirror the SERVER's tuned
                   metric exactly (server/src/index.js _tickMonsters:
                   ATTACK_RANGE 45, Y_SCALE 3 on the raw feet-anchored dy;
                   keep in sync).  The old client-only model (body-center
                   offset + 55 px circle) stopped these variants ~55 px away
                   on N/S approaches but only ~27 px on E/W -- the reported
                   "monsters stop further away north/south".  Every monster
                   now stops at the same owner-tuned ring: ~45 px E/W,
                   ~15 px N/S, regardless of which side drives its AI. */
                var _chDyN = P.y - m.y;
                var _ringDist = Math.sqrt(chDx * chDx + (_chDyN * 3) * (_chDyN * 3));
                if (_ringDist > 45) {
                  var _moveDist = Math.sqrt(chDx * chDx + _chDyN * _chDyN) || 1;
                  m.x += chDx / _moveDist * m.spd * moveMult;
                  m.y += _chDyN / _moveDist * m.spd * moveMult;
                }
              }

              /* ═══ BOSS ABILITIES — special attacks on cooldown ═══ */
              if (m._isBoss && m._bossAbilities && Date.now() > (m._nextAbility || 0)) {
                /* ═══ BOSS PHASE CYCLING ═══
                   idle → telegraph (1s warning) → attack → recovery (2s, VULNERABLE) → idle
                   Boss is invulnerable except during recovery phase */
                if (!m._attackPhase || m._attackPhase === 'idle') {
                  /* Start telegraph — warning indicator before attack */
                  m._attackPhase = 'telegraph';
                  m._phaseTimer = Date.now() + 1000; /* 1s telegraph */
                  var abilities = m._bossAbilities;
                  m._currentAttack = abilities[m._attackPattern % abilities.length];
                  m._attackPattern++;
                  pushDmgPopup(S, m.x, m.y - 40, m._currentAttack.toUpperCase() + '!', '#fbbf24');
                  BT_AUDIO.beep(400, 0.08, 0.1, 'sine');
                  /* Boss glows during telegraph */
                  m.color = '#fbbf24';
                } else if (m._attackPhase === 'telegraph' && Date.now() > m._phaseTimer) {
                  /* Execute the attack */
                  m._attackPhase = 'attack';
                  m._phaseTimer = Date.now() + 500; /* attack lasts 500ms */
                  m.color = '#ff2020';
                  var _abilities = m._bossAbilities;
                  var ability = m._currentAttack;
                  var bossAngle = Math.atan2(P.y - m.y, P.x - m.x);
                  if (ability === 'slam') {
                    var slamRange = 80;
                    S.screenShake = 10;
                    BT_AUDIO.beep(80, 0.2, 0.25, 'sawtooth');
                    pushDmgPopup(S, m.x, m.y - 30, 'SLAM!', '#f5c542');
                    if (!S._impactRings) S._impactRings = [];
                    S._impactRings.push({
                      x: m.x,
                      y: m.y,
                      ts: Date.now(),
                      color: '#f5c542',
                      maxR: slamRange,
                      duration: 400
                    });
                    for (var sp = 0; sp < 20; sp++) {
                      var sa = sp / 20 * Math.PI * 2;
                      S.hitParticles.push({
                        x: m.x,
                        y: m.y,
                        vx: Math.cos(sa) * (2 + Math.random() * 4),
                        vy: Math.sin(sa) * (2 + Math.random() * 4),
                        life: 0.8,
                        color: '#f5c542',
                        size: 2 + Math.random() * 2
                      });
                    }
                    /* Dodging or shielding avoids damage */
                    var dodged = S._dodgeRoll;
                    /* v2.3.1705: the arc is BACK (owner: "yes blocking should be directional").
                       isAttackInShieldArc has sat unused since v2.3.1110 unified on
                       the omni rule; it is the same +-BLOCK_ARC_HALF wedge the shield
                       cone is drawn at, so what you see is what you block. */
                    var blocked = Date.now() < S.shieldEnd && isAttackInShieldArc(S, m.x, m.y);
                    if (distToP < slamRange && !invuln && !dodged) {
                      var slamDmg = Math.ceil(m.dmg * 1.5);
                      var finalDmg = blocked ? 0 : slamDmg;
                      hurtPlayerLocal(S, _R6, finalDmg);
                      trackMonsterDamage(S, m.id, finalDmg);
                      if (window.__dmgLog) try { console.log('[dmg] boss-slam', { amt: finalDmg, archetype: m.archetype || m.type, blocked: blocked }); } catch (e) {}
                      pushDmgPopup(S, P.x, P.y - 20, blocked ? 'BLOCK' : '-' + finalDmg, '#f5c542');
                      if (blocked) {
                        try { BT_AUDIO.play('shield-block', { vol: 1.0 }); } catch (e) {}
                      } else {
                        try { BT_AUDIO.monsterHitHero(isWearingArmor(), { vol: 0.85 }); } catch (e) {}
                        S.lastDamageTaken = Date.now();
                        S._hitFlash = Date.now();
                        if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_hurt_by_monster', payload: { id: S.myId, dmg: finalDmg } });
                        /* v2.3.1137: Poise channel shortens the stagger */
                        S._playerStunUntil = Math.max(S._playerStunUntil || 0, Date.now() + Math.max(0, Math.round(250 - poiseStunFlatMs(S.rpg)))); /* v2.3.1345: flat ms */
                      }
                    } else if (distToP < slamRange && dodged) {
                      pushDmgPopup(S, P.x, P.y - 20, 'Dodged!', '#3dd497');
                    }
                  }
                  if (ability === 'charge') {
                    m._chargeUntil = Date.now() + 600;
                    m._chargeAngle = bossAngle;
                    m._chargeSpeed = m.spd * 6;
                    pushDmgPopup(S, m.x, m.y - 30, 'CHARGE!', '#ea580c');
                    BT_AUDIO.beep(200, 0.15, 0.2, 'sawtooth');
                  }
                  if (ability === 'sweep') {
                    /* Wide arc sweep — must dodge or shield */
                    var sweepRange = 70;
                    pushDmgPopup(S, m.x, m.y - 30, 'SWEEP!', '#a855f7');
                    BT_AUDIO.beep(150, 0.15, 0.2, 'square');
                    S.screenShake = 6;
                    if (!S._impactRings) S._impactRings = [];
                    S._impactRings.push({
                      x: m.x,
                      y: m.y,
                      ts: Date.now(),
                      color: '#a855f7',
                      maxR: sweepRange,
                      duration: 300
                    });
                    var _dodged = S._dodgeRoll;
                    var _blocked = Date.now() < S.shieldEnd && isAttackInShieldArc(S, m.x, m.y); /* v2.3.1705: directional */
                    if (distToP < sweepRange && !invuln && !_dodged) {
                      var sweepDmg = Math.ceil(m.dmg * 1.2);
                      var _finalDmg = _blocked ? 0 : sweepDmg;
                      hurtPlayerLocal(S, _R6, _finalDmg);
                      trackMonsterDamage(S, m.id, _finalDmg);
                      if (window.__dmgLog) try { console.log('[dmg] boss-sweep', { amt: _finalDmg, archetype: m.archetype || m.type, blocked: _blocked }); } catch (e) {}
                      pushDmgPopup(S, P.x, P.y - 20, _blocked ? 'BLOCK' : '-' + _finalDmg, '#a855f7');
                      if (_blocked) {
                        try { BT_AUDIO.play('shield-block', { vol: 1.0 }); } catch (e) {}
                      } else {
                        try { BT_AUDIO.monsterHitHero(isWearingArmor(), { vol: 0.85 }); } catch (e) {}
                        S.lastDamageTaken = Date.now();
                        S._hitFlash = Date.now();
                        if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_hurt_by_monster', payload: { id: S.myId, dmg: _finalDmg } });
                        /* v2.3.1137: Poise channel shortens the stagger */
                        S._playerStunUntil = Math.max(S._playerStunUntil || 0, Date.now() + Math.max(0, Math.round(250 - poiseStunFlatMs(S.rpg)))); /* v2.3.1345: flat ms */
                      }
                    }
                  }
                  if (ability === 'summon') {
                    var _S$map$, _S$map3;
                    var summonCount = 2 + Math.floor(Math.random() * 2);
                    var zone2 = ZONES[S.currentZone || S._dungeonZone];
                    var dW2 = ((_S$map$ = S.map[0]) === null || _S$map$ === void 0 ? void 0 : _S$map$.length) || 25,
                      dH2 = ((_S$map3 = S.map) === null || _S$map3 === void 0 ? void 0 : _S$map3.length) || 20;
                    for (var si = 0; si < summonCount; si++) {
                      var _mx3 = m.x + (Math.random() - 0.5) * 80;
                      var _my3 = m.y + (Math.random() - 0.5) * 60;
                      var minion = createMonster('summon-' + Date.now() + '-' + si, 'swarm', Math.max(1, m.level - 5), Math.max(TILE * 2, Math.min(_mx3, (dW2 - 2) * TILE)), Math.max(TILE * 2, Math.min(_my3, (dH2 - 2) * TILE)), zone2 === null || zone2 === void 0 ? void 0 : zone2.element);
                      minion.curHp = minion.hp;
                      minion.type = 'swarm';
                      minion.hp = Math.ceil(minion.hp * 0.3);
                      minion.curHp = minion.hp;
                      minion.maxHp = minion.hp;
                      S.monsters.push(minion);
                    }
                    pushDmgPopup(S, m.x, m.y - 30, 'Summon!', '#9333ea');
                    BT_AUDIO.beep(300, 0.1, 0.15, 'square');
                  }
                  if (ability === 'enrage' && m.curHp < m.hp * 0.3 && !m._enraged) {
                    m._enraged = true;
                    m.dmg = Math.ceil(m.dmg * 1.5);
                    m.spd *= 1.4;
                    pushDmgPopup(S, m.x, m.y - 30, 'ENRAGED!', '#ff2020');
                    S.screenShake = 6;
                    BT_AUDIO.beep(120, 0.2, 0.3, 'sawtooth');
                  }
                } else if (m._attackPhase === 'attack' && Date.now() > m._phaseTimer) {
                  /* Recovery phase — BOSS IS NOW VULNERABLE */
                  m._attackPhase = 'recovery';
                  m._phaseTimer = Date.now() + 2000; /* 2s vulnerability window */
                  m._invulnerable = false;
                  m.color = '#3dd497'; /* green = vulnerable */
                  pushDmgPopup(S, m.x, m.y - 30, 'EXPOSED!', '#3dd497');
                  BT_AUDIO.beep(600, 0.06, 0.08, 'sine');
                } else if (m._attackPhase === 'recovery' && Date.now() > m._phaseTimer) {
                  /* Back to idle — invulnerable again */
                  m._attackPhase = 'idle';
                  m._invulnerable = true;
                  m.color = '#ff5e6c';
                  m._nextAbility = Date.now() + (m._abilityInterval || 4000);
                }
              }
              /* Boss charge movement */
              if (m._chargeUntil && Date.now() < m._chargeUntil) {
                m.x += Math.cos(m._chargeAngle) * (m._chargeSpeed || 3) * moveMult;
                m.y += Math.sin(m._chargeAngle) * (m._chargeSpeed || 3) * moveMult;
                /* Charge hit detection */
                if (distToP < 20 && !invuln) {
                  var chargeDmg = Math.ceil(m.dmg * 1.5);
                  var _blocked2 = Date.now() < S.shieldEnd && isAttackInShieldArc(S, m.x, m.y); /* v2.3.1705: directional */
                  /* v2.3.232 (Phase 2): block is full negation now; the
                     old partial-block reduction via calcBlockReduction
                     was the last site reading the Fortification scale. */
                  var _finalDmg2 = _blocked2 ? 0 : chargeDmg;
                  hurtPlayerLocal(S, _R6, _finalDmg2);
                  trackMonsterDamage(S, m.id, _finalDmg2);
                  if (window.__dmgLog) try { console.log('[dmg] boss-charge', { amt: _finalDmg2, archetype: m.archetype || m.type, blocked: _blocked2 }); } catch (e) {}
                  pushDmgPopup(S, P.x, P.y - 20, _blocked2 ? 'BLOCK' : '-' + _finalDmg2, '#ea580c');
                  if (_blocked2) {
                    try { BT_AUDIO.play('shield-block', { vol: 1.0 }); } catch (e) {}
                  } else {
                    try { BT_AUDIO.monsterHitHero(isWearingArmor(), { vol: 0.85 }); } catch (e) {}
                    S.lastDamageTaken = Date.now();
                  }
                  S.screenShake = 6;
                  m._chargeUntil = 0; /* stop charging on hit */
                  /* Knockback — v2.3.1402: owner, all knockback -50% (18 -> 9) */
                  var kbA = Math.atan2(P.y - m.y, P.x - m.x);
                  P.x += Math.cos(kbA) * 9;
                  P.y += Math.sin(kbA) * 9;
                }
              }

              /* Monster attacks player if in range */
              if (distToP < atkRange && !invuln) {
                if (!m._atkCd || Date.now() - m._atkCd > atkCooldown) {
                  var _R6$_amuletBonus3;
                  /* ═══ TELEGRAPH — show warning before attack lands ═══ */
                  var telegraphDur = 400; /* ms warning */
                  if (!m._telegraphUntil) {
                    /* Start telegraph — monster winds up */
                    m._telegraphUntil = Date.now() + telegraphDur;
                    m._telegraphAngle = Math.atan2(P.y - m.y, P.x - m.x);
                    m._telegraphRange = atkRange;
                    /* Fodder-like (fodder slimes, fireGoblin variant, etc.):
                       play the shoot/lunge animation across the telegraph
                       window so the wind-up reads visually.  Cleared
                       automatically when the render loop sees now > _shootAnimEnd. */
                    if (isFodderLike(arch)) {
                      m._shootAnimStart = Date.now();
                      m._shootAnimEnd = Date.now() + telegraphDur + 80;
                    }
                    return; /* don't attack yet */
                  }
                  if (Date.now() < m._telegraphUntil) return; /* still telegraphing */
                  /* Telegraph done — execute attack */
                  m._telegraphUntil = null;
                  m._atkCd = Date.now();
                  var shielded = Date.now() < S.shieldEnd && isAttackInShieldArc(S, m.x, m.y); /* v2.3.1705: directional */
                  var rawDmg = Math.max(1, m.dmg);
                  /* §18.1 Food buff — resist reduces incoming damage */
                  if (S._resistBuff && Date.now() < S._resistBuff) rawDmg = Math.max(1, Math.floor(rawDmg * 0.85));
                  /* §4 Amulet elemental resistance */
                  if (((_R6$_amuletBonus3 = _R6._amuletBonus) === null || _R6$_amuletBonus3 === void 0 ? void 0 : _R6$_amuletBonus3.stat) === 'elemResist') rawDmg = Math.max(1, Math.floor(rawDmg * (1 - _R6._amuletBonus.value / 100)));
                  /* Shield gear — flat defense reduction */
                  if (_R6.shield) {
                    var ss = getShieldStats(_R6.shield);
                    if (ss.flatDef) rawDmg = Math.max(1, Math.floor(rawDmg - ss.flatDef));
                  }
                  var blockReduc = shielded ? calcBlockReduction(getDefenseBlockBonus(_R6), _R6.shield) : 0;
                  /* Per-variant damage multiplier (e.g. skeleton.dmgMult = 4
                     for the post-mummy-transform danger form).  This is the
                     LOCAL melee path -- runs for client-side-movement
                     variants like fireGoblin and skeleton, which bypass
                     the server's monster_attack handler.  Without this
                     scale here, the skeleton's 4x damage only applied to
                     monsters whose damage came in via the WS handler. */
                  var _localAtkVariant = MONSTER_VARIANTS[arch];
                  if (_localAtkVariant && _localAtkVariant.dmgMult) {
                    rawDmg = Math.ceil(rawDmg * _localAtkVariant.dmgMult);
                  }
                  /* Full block when shield arc catches the attack -- no
                     damage gets through (was rawDmg * (1 - blockReduc)
                     with a Math.max(1) floor, which always let at least
                     1 hp through even with 75% block).  Player request
                     is "the damage gets blocked," so 0 across the board. */
                  /* v2.3.234 (Phase 4): Agility passive dodge -- a roll
                     before the hit lands; on dodge, full negation +
                     a cyan popup so the player can see it happened. */
                  /* v2.3.1154: + Evasion channel pts, shared 30% cap. */
                  var _passiveDodge = !shielded && rollPassiveDodge(_R6.agility, getEvasionPts(_R6));
                  if (_passiveDodge) {
                    pushDmgPopup(S, P.x, P.y - 18, 'Dodge!', '#00d4ff');
                  }
                  var dmgTaken = (shielded || _passiveDodge) ? 0 : rawDmg;
                  /* v2.3.1113: Iron Skin (defense channel, -0.5%/pt, cap
                     -25%) goes live on the local-AI path; the server
                     mirrors it in _applyDamage for worker-driven damage. */
                  if (dmgTaken > 0) dmgTaken = applyResilience(_R6, applyIronSkin(_R6, dmgTaken)); /* v2.3.1314 */
                  /* v2.3.1113: defense-loop revival -- block trains at full
                     rate, taken damage at quarter rate.
                     v2.3.1140: ±5 valid-threat gate re-enabled (real monster
                     level passed) now that zone bands are unpinned -- the
                     null bypass existed only because every monster was
                     pinned to level 1 (BALANCE-PLAN §7/BF-1). */
                  var _defUpLoc = trainDefense(_R6, shielded ? rawDmg : 0, _passiveDodge ? 0 : dmgTaken, m.level || null, false);
                  if (_defUpLoc) pushDmgPopup(S, P.x, P.y - 34, '🛡️ Defense Lv ' + _defUpLoc.level, '#60a5fa', { ts: Date.now() + 2 });
                  /* ═══ FODDER SLIMES — RANGED PROJECTILE ATTACK ═══
                     Spawn a slime-orb projectile aimed at the player's
                     position right now. Damage isn't applied here — it
                     lands when the projectile hits (see slime-projectile
                     simulation block). Block/shield is recomputed at
                     impact since the player can raise shield mid-flight.
                     The early return skips all the inline melee damage
                     application + archetype effects below — fodder has
                     no archetype effects, so nothing else is needed
                     here. */
                  /* isFodderLike covers raw fodder AND any variant with
                     baseArchetype: 'fodder' (mummy, skeleton, fireGoblin
                     etc.).  Variants opt out of the slime orb spawn by
                     setting MONSTER_VARIANTS[arch].noProjectile -- e.g.
                     mummies are pure melee shamblers, no green orb.
                     Without this gate every mummy was firing slime
                     projectiles at the player. */
                  var _variantCfg = MONSTER_VARIANTS[arch];
                  if (isFodderLike(arch) && !(_variantCfg && _variantCfg.noProjectile)) {
                    var _projAng = Math.atan2(P.y - m.y, P.x - m.x);
                    if (!S.slimeProjectiles) S.slimeProjectiles = [];
                    /* life=35 ticks × speed=4 px = 140 px range, just past
                       the 80 px attack range. Previous life=90 (360 px)
                       let projectiles travel far past the slime's
                       visible range, hitting the player long after
                       they'd walked away — read as phantom "mystery
                       damage" with no visible attacker. */
                    S.slimeProjectiles.push({
                      x: m.x, y: m.y,
                      ang: _projAng,
                      speed: 4,
                      rawDmg: rawDmg,
                      ownerId: m.id,
                      /* v2.3.1140: carry the shooter's level to impact so
                         trainDefense can apply the ±5 valid-threat gate. */
                      srcLevel: m.level || null,
                      life: 35,
                      ts: Date.now(),
                    });
                    return;
                  }
                  if (shielded) {
                    if (!_R6._questFlags) _R6._questFlags = {};
                    _R6._questFlags.blocksLanded = (_R6._questFlags.blocksLanded || 0) + 1;
                    /* Count-based weight: 1 successful block = 3 hits
                       worth of endurance share.  Pairs with hit weight
                       = 1 to match the user's hits-vs-blocks ratio for
                       the Endurance share of killXp. */
                    addBuildUse(_R6, 'endurance', 3);
                    /* Shield gem: HP on block */
                    if (_R6.shield) {
                      var _ss$gemBonus;
                      var _ss = getShieldStats(_R6.shield);
                      if (((_ss$gemBonus = _ss.gemBonus) === null || _ss$gemBonus === void 0 ? void 0 : _ss$gemBonus.stat) === 'hpOnBlock') {
                        _R6.hp = Math.min(_R6.maxHp, _R6.hp + _ss.gemBonus.value);
                      }
                    }
                    /* Variant block-punish stun (e.g. skeleton: 5 s).
                       Local AI loop checks m._stunUntil and skips the
                       monster's update while it's set, so the chase
                       freezes for the configured window.  Floats a
                       "STUNNED" popup over the monster so the punish
                       reads. */
                    if (_localAtkVariant && _localAtkVariant.blockStunMs) {
                      m._stunUntil = Math.max(m._stunUntil || 0, Date.now() + _localAtkVariant.blockStunMs);
                      pushDmgPopup(S, m.x, m.y - 30, 'STUNNED!', '#fbbf24');
                    }
                  }

                  /* Volatile: AoE damage burst when low HP */
                  if (arch === 'volatile' && m.curHp < m.hp * 0.3 && !m._exploded) {
                    m._exploded = true;
                    m.curHp = 0;
                    m.alive = false;
                    m.respawnAt = Date.now() + 30000;
                    BT_AUDIO.monsterDeath(m && m.archetype);
                    var explodeDmg = Math.round(m.dmg * 2);
                    hurtPlayerLocal(S, _R6, shielded ? 0 : explodeDmg);
                    trackMonsterDamage(S, m.id, shielded ? 0 : explodeDmg);
                    if (window.__dmgLog) try { console.log('[dmg] volatile-explode', { amt: explodeDmg, archetype: m.archetype || m.type, shielded: shielded, mPos: { x: m.x, y: m.y }, pPos: { x: P.x, y: P.y } }); } catch (e) {}
                    if (!shielded) {
                      S._hitFlash = Date.now();
                      if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_hurt_by_monster', payload: { id: S.myId, dmg: explodeDmg } });
                    }
                    S.screenShake = 8;
                    pushDmgPopup(S, m.x, m.y - 20, 'BOOM -' + explodeDmg, '#ea580c');
                    for (var ep = 0; ep < 30; ep++) {
                      S.hitParticles.push({
                        x: m.x,
                        y: m.y,
                        vx: (Math.random() - 0.5) * 10,
                        vy: (Math.random() - 0.5) * 10 - 3,
                        life: 1.2,
                        color: ['#ea580c', '#f5c542', '#ff5e6c'][Math.floor(Math.random() * 3)],
                        size: 2 + Math.random() * 3
                      });
                    }
                    BT_AUDIO.deathBoom(m && m.archetype);
                    BT_AUDIO.beep(100, 0.2, 0.3, 'sawtooth');
                    var _shardE = rollMonsterShard(S.currentZone);
                    S.groundLoot.push({
                      x: m.x,
                      y: m.y,
                      coins: m.gold,
                      xp: 0,
                      skull: m.type,
                      skullEmoji: '🦴',
                      ts: Date.now(),
                      shard: _shardE,
                    });
                  } else {
                    hurtPlayerLocal(S, _R6, dmgTaken);
                    trackMonsterDamage(S, m.id, dmgTaken);
                    if (window.__dmgLog) try { console.log('[dmg] monster-melee', { amt: dmgTaken, archetype: m.archetype || m.type, shielded: shielded, mPos: { x: m.x, y: m.y }, pPos: { x: P.x, y: P.y }, dist: Math.round(Math.sqrt((m.x - P.x) ** 2 + (m.y - P.y) ** 2)) }); } catch (e) {}
                    if (shielded) {
                      try { BT_AUDIO.play('shield-block', { vol: 1.0 }); } catch (e) {}
                    } else {
                      try { BT_AUDIO.monsterHitHero(isWearingArmor(), { vol: 0.85 }); } catch (e) {}
                      S.lastDamageTaken = Date.now();
                      S._hitFlash = Date.now();
                      if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_hurt_by_monster', payload: { id: S.myId, dmg: dmgTaken } });
                    }
                    /* GDD §1.2 Vitality: taking damage AND surviving.
                       Tracked as use-frequency; resolved on next kill. */
                    if (_R6.hp > 0) addBuildUse(_R6, 'vitality', dmgTaken);

                    /* ═══ ARCHETYPE-SPECIFIC ATTACK EFFECTS ═══ */
                    if (arch === 'hexer' && !shielded) {
                      /* Hexer: applies curse debuff — reduces player damage for 4s */
                      S._cursedUntil = Date.now() + 4000;
                      pushDmgPopup(S, P.x, P.y - 20, 'Cursed!', '#8E44AD');
                      /* Purple curse particles */
                      for (var cp = 0; cp < 8; cp++) {
                        S.hitParticles.push({
                          x: P.x + (Math.random() - 0.5) * 20,
                          y: P.y + (Math.random() - 0.5) * 20,
                          vx: (Math.random() - 0.5) * 2,
                          vy: -1 - Math.random(),
                          life: 0.8,
                          color: '#8E44AD',
                          size: 2 + Math.random()
                        });
                      }
                    }
                    if (arch === 'brute' && !shielded) {
                      /* Brute: heavy hit — knockback + extra screen shake
                         v2.3.1402: owner, all knockback -50% (12 -> 6) */
                      var kbAngle = Math.atan2(P.y - m.y, P.x - m.x);
                      P.x += Math.cos(kbAngle) * 6;
                      P.y += Math.sin(kbAngle) * 6;
                      S.screenShake = Math.max(S.screenShake || 0, 6);
                      S._playerStunUntil = Date.now() + Math.max(0, Math.round(300 - poiseStunFlatMs(S.rpg))); /* brief stagger — v2.3.1345: Poise shaves flat ms */
                    }
                    /* Swarm bleed DoT removed — at higher levels the
                       1%-of-maxHp tick (every 500 ms for 3 s) read as
                       phantom "mosquito" damage long after the player
                       walked away from the swarm, with no visible
                       source to associate it with. Removed per user
                       request. */
                    if (arch === 'sentinel' && !shielded) {
                      /* Sentinel: armor-piercing — ignores 50% of block reduction */
                      var pierceDmg = Math.max(0, Math.floor(rawDmg * blockReduc * 0.5));
                      if (pierceDmg > 0) {
                        hurtPlayerLocal(S, _R6, pierceDmg);
                        trackMonsterDamage(S, m.id, pierceDmg);
                        if (window.__dmgLog) try { console.log('[dmg] sentinel-pierce', pierceDmg); } catch (e) {}
                        pushDmgPopup(S, P.x + 10, P.y - 22, 'Pierce -' + pierceDmg, '#e8e8e8');
                      }
                    }
                    if (arch === 'stalker' && !shielded) {
                      /* Stalker: crit chance on dash attacks */
                      if (m._stalkPhase === 'dash' && Math.random() < 0.4) {
                        var critDmg = Math.ceil(dmgTaken * 0.5);
                        hurtPlayerLocal(S, _R6, critDmg);
                        trackMonsterDamage(S, m.id, critDmg);
                        if (window.__dmgLog) try { console.log('[dmg] stalker-crit', critDmg); } catch (e) {}
                        pushDmgPopup(S, P.x, P.y - 40, 'CRIT -' + critDmg, '#ff5e6c');
                        S.screenShake = Math.max(S.screenShake || 0, 4);
                      }
                    }
                    if (shielded) {
                      /* No longer stuns the monster on block.  The 2s
                         stun (previously here) effectively prevented
                         monsters from attacking at all while the player
                         held shield -- block, stun, block again before
                         the stun ended, repeat, monster never recovers.
                         Block now only mitigates the incoming damage;
                         the monster continues its normal attack cadence. */
                      pushDmgPopup(S, P.x, P.y - 30, 'BLOCK', '#60a5fa');
                      /* (block-impact sound is now BT_AUDIO.play('shield-block')
                         fired up at the damage application site, so the legacy
                         square+sine beep duo here is dropped.) */
                      /* ═══ BLOCK FEEDBACK — blue flash + shield particles ═══ */
                      S.screenShake = 3;
                      S._blockFlash = Date.now();
                      if (!S._impactRings) S._impactRings = [];
                      S._impactRings.push({
                        x: P.x,
                        y: P.y,
                        ts: Date.now(),
                        color: '#60a5fa',
                        maxR: 25,
                        duration: 200
                      });
                      for (var bp = 0; bp < 10; bp++) {
                        var bpA = Math.atan2(m.y - P.y, m.x - P.x) + (Math.random() - 0.5) * 1.5;
                        S.hitParticles.push({
                          x: P.x + Math.cos(bpA) * 20,
                          y: P.y + Math.sin(bpA) * 20,
                          vx: Math.cos(bpA) * (1 + Math.random() * 3),
                          vy: Math.sin(bpA) * (1 + Math.random() * 3) - 1,
                          life: 0.5,
                          color: ['#60a5fa', '#93c5fd', '#fff'][Math.floor(Math.random() * 3)],
                          size: 1.5 + Math.random()
                        });
                      }
                    } else {
                      pushDmgPopup(S, P.x, P.y - 30, '-' + dmgTaken, '#ff5e6c', { iconKey: 'heart' });
                    }
                  }
                  if (_R6.hp <= 0) {
                    var _R6$_shieldBonus;
                    /* Shield gem: Death Save — chance to survive at 1 HP */
                    if (((_R6$_shieldBonus = _R6._shieldBonus) === null || _R6$_shieldBonus === void 0 ? void 0 : _R6$_shieldBonus.stat) === 'deathResist' && Math.random() < _R6._shieldBonus.value / 100) {
                      _R6.hp = 1;
                      pushDmgPopup(S, P.x, P.y - 50, 'DEATH SAVE!', '#5b52ff');
                      S.screenShake = 6;
                      BT_AUDIO.beep(800, 0.1, 0.12, 'sine');
                      setTimeout(function () {
                        return BT_AUDIO.beep(1000, 0.08, 0.1, 'sine');
                      }, 80);
                    }
                  }
                  if (_R6.hp <= 0 && !S._dying) {
                    /* §5.5 Player death — inventory scatter + escalating respawn.
                       Split into a synchronous "death moment" block (feedback,
                       broadcasts, scatter, popups) and a deferred 3.5 s
                       restore+teleport so the death animation plays at the
                       death position before the player is whisked off to town.
                       S._dying gates re-entry while we wait for the timeout. */
                    S._dying = true;
                    if (!_R6._compStats) _R6._compStats = createDefaultCompStats();
                    _R6._compStats.deaths++;
                    /* Start the death-animation timeline.  Renderer plays
                       the 21-frame sequence over ~3.15 s, then holds the
                       final pile-of-bones frame until the setTimeout below
                       fires the respawn and clears the dead state. */
                    S._deathStart = Date.now();
                    /* Tell the server immediately that we died.  The
                       channelShim move builder reads dead = rpg.hp <= 0,
                       so sending a move now (while hp is still 0) gives
                       the server a fresh playerState.dead = true.  Without
                       this, server-monster AI keeps targeting us. */
                    if (S.channel) S.channel.send({ type: 'broadcast', event: 'move', payload: { x: P.x, y: P.y, z: S.currentZone, vx: 0, vy: 0 } });
                    if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_died_to_monster', payload: { id: S.myId, x: P.x, y: P.y } });
                    var deathX = P.x,
                      deathY = P.y;
                    var deathZone = S.currentZone;

                    /* Death explosion — whimsical limb detach */
                    for (var _dp = 0; _dp < 35; _dp++) {
                      var dpA = _dp / 35 * Math.PI * 2;
                      S.hitParticles.push({
                        x: P.x,
                        y: P.y,
                        vx: Math.cos(dpA) * (2 + Math.random() * 5),
                        vy: Math.sin(dpA) * (2 + Math.random() * 5) - 1,
                        life: 1.2,
                        color: ['#ff5e6c', '#cc2233', '#ff8888', '#aa0020', '#fff'][Math.floor(Math.random() * 5)],
                        size: 2 + Math.random() * 3
                      });
                    }
                    /* Whimsical skull + bone emojis scatter */
                    var deathEmojis = ['💀', '🦴', '🦴', '💫', '⭐'];
                    for (var de = 0; de < 5; de++) {
                      var deA = de / 5 * Math.PI * 2 + Math.random() * 0.5;
                      S.deathExplosions.push({
                        x: deathX + Math.cos(deA) * 20,
                        y: deathY + Math.sin(deA) * 20,
                        ts: Date.now(),
                        emoji: deathEmojis[de],
                        particles: [{
                          vx: Math.cos(deA) * 3,
                          vy: Math.sin(deA) * 3 - 2,
                          life: 1.5
                        }]
                      });
                    }
                    S.screenShake = 12;
                    S._deathFlash = Date.now();
                    BT_AUDIO.playerDeath ? BT_AUDIO.playerDeath() : (BT_AUDIO.beep(80, 0.3, 0.4, 'sawtooth'), setTimeout(function () {
                      return BT_AUDIO.beep(60, 0.2, 0.3, 'sawtooth');
                    }, 150));

                    /* §5.5 Inventory scatter — carried items drop at death location */
                    /* Equipped weapon + armor are SAFE. Banked items are SAFE. */
                    var scatteredItems = [];
                    if (_R6.inventory) {
                      var invKeys = Object.keys(_R6.inventory).filter(function (k) {
                        return _R6.inventory[k] > 0 && k !== 'potions';
                      });
                      invKeys.forEach(function (k) {
                        var qty = _R6.inventory[k];
                        /* Scatter half of each stack (min 1 if have any) */
                        var scatterQty = Math.max(1, Math.floor(qty * 0.5));
                        _R6.inventory[k] -= scatterQty;
                        if (_R6.inventory[k] <= 0) delete _R6.inventory[k];
                        scatteredItems.push({
                          key: k,
                          qty: scatterQty
                        });
                      });
                    }

                    /* Gold penalty */
                    var goldLost = Math.floor(_R6.coins * DEATH_GOLD_PENALTY);
                    _R6.coins = Math.max(0, _R6.coins - goldLost);

                    /* Escalating respawn timer — §5.5 */
                    if (!_R6._deathTimestamps) _R6._deathTimestamps = [];
                    var dnow = Date.now();
                    _R6._deathTimestamps = _R6._deathTimestamps.filter(function (t) {
                      return dnow - t < RESPAWN_ESCALATE_WINDOW;
                    });
                    var recentDeaths = _R6._deathTimestamps.length;
                    _R6._deathTimestamps.push(dnow);
                    var respawnMs = Math.min(RESPAWN_MAX, RESPAWN_BASE + recentDeaths * RESPAWN_ESCALATE);

                    /* Place scattered items as recoverable ground loot at death site */
                    if (scatteredItems.length > 0) {
                      if (!S._deathDrops) S._deathDrops = [];
                      S._deathDrops.push({
                        zone: deathZone,
                        x: deathX,
                        y: deathY,
                        items: scatteredItems,
                        ts: Date.now(),
                        expiry: Date.now() + DEATH_SCATTER_RECOVERY
                      });
                    }

                    /* Death feedback popups float at the death position
                       (P.x/P.y are still the death coords here — teleport
                       is deferred to the setTimeout below). */
                    pushDmgPopup(S, P.x, P.y - 50, 'YOU DIED', '#ff5e6c');
                    pushDmgPopup(S, P.x, P.y - 35, 'Respawn: ' + (respawnMs / 1000).toFixed(0) + 's', '#f5c542');
                    if (goldLost > 0) pushDmgPopup(S, P.x, P.y - 20, '-' + goldLost + 'G', '#ff5e6c');
                    if (scatteredItems.length > 0) pushDmgPopup(S, P.x, P.y - 5, 'Items scattered! ' + Math.ceil(DEATH_SCATTER_RECOVERY / 1000) + 's to recover', '#ea580c');

                    /* Deferred restore + teleport — runs after the 3.5 s
                       death animation finishes so the player visually
                       collapses at the death position before respawning
                       in town.  hp stays 0 during the hold, which the
                       renderer's selfDead gate keeps the corpse sprite
                       on screen.  S._dying prevents re-entry into this
                       block if more damage events arrive in the
                       meantime. */
                    setTimeout(function () {
                      _R6.hp = _R6.maxHp;
                      _R6.stamina = _R6.maxStamina;
                      _R6.mana = _R6.maxMana;
                      S.currentZone = 'town';
                      updateZoneDimensions('town');
                      BT_AUDIO.startZoneAmbient('town');
                      S.map = generateZoneMap('town');
                      S.monsters = []; /* Town has no monsters */
                      S.gatherNodes = []; /* and no harvestable resources -- clear stale entries from the previous zone */
                      P.x = TOWN_SPAWN.x;   /* v2.3.1777 */
                      P.y = TOWN_SPAWN.y;
                      P.vx = 0; P.vy = 0;
                      S.respawnTimer = Date.now() + respawnMs;
                      S._dying = false;
                      /* Clear the death-animation start so the next death
                         retriggers the renderer's death timeline from
                         frame 0 rather than reading a stale _selfElapsed. */
                      S._deathStart = 0;
                      S.groundLoot = []; if (window._pixiRenderer && window._pixiRenderer.flushAllLoot) window._pixiRenderer.flushAllLoot();
                      S.hitParticles = [];
                      S.arrows = [];
                      S.slimeProjectiles = []; /* v2.3.1181: slime orbs kept flying across zone loads (absolute coords, no zone check) and could hit the player in the new zone */
                      S._ambientParticles = [];
                      /* Server learns dead=false + new zone via this move;
                         other clients clear our _isDead via the broadcast. */
                      if (S.channel) S.channel.send({ type: 'broadcast', event: 'move', payload: { x: P.x, y: P.y, z: S.currentZone, vx: 0, vy: 0 } });
                      if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_respawned', payload: { id: S.myId } });
                      setRpgState(_objectSpread({}, _R6));
                      try { localStorage.setItem('bt_rpg', JSON.stringify(_R6)); } catch (e) {}
                    }, 3500);
                  }
                  setRpgState(_objectSpread({}, _R6));
                }
              }
            } else {
              /* Wander — archetype personality */
              m._aggroed = false;
              m.moveTimer -= 16.7;
              if (m.moveTimer <= 0) {
                var wanderDist = arch === 'swarm' ? 40 : arch === 'stalker' ? 100 : 60;
                m.targetX = m.spawnX + (Math.random() - 0.5) * wanderDist * 2;
                m.targetY = m.spawnY + (Math.random() - 0.5) * wanderDist * 2;
                m.moveTimer = arch === 'swarm' ? 1000 + Math.random() * 1500 : 2000 + Math.random() * 3000;
              }
              var wDx = m.targetX - m.x,
                wDy = m.targetY - m.y;
              var wDist = Math.sqrt(wDx * wDx + wDy * wDy);
              if (wDist > 2) {
                m.x += wDx / wDist * m.spd * 0.5 * moveMult;
                m.y += wDy / wDist * m.spd * 0.5 * moveMult;
              }
            }
          });

          /* §11 Combat intensity — swell ambient when monsters are nearby */
          var nearestMonsterDist = S.monsters.reduce(function (min, m) {
            if (!m.alive) return min;
            var d = Math.sqrt(Math.pow(m.x - P.x, 2) + Math.pow(m.y - P.y, 2));
            return d < min ? d : min;
          }, 9999);
          BT_AUDIO.setCombatIntensity(nearestMonsterDist < 100);

          /* ═══ LOW HP HEARTBEAT — thumping audio pulse below 25% HP ═══ */
          if (_R6.hp < _R6.maxHp * 0.25 && _R6.hp > 0) {
            if (!S._heartbeatTimer) S._heartbeatTimer = 0;
            S._heartbeatTimer++;
            var hbRate = _R6.hp < _R6.maxHp * 0.1 ? 25 : 40; /* faster when critically low */
            if (S._heartbeatTimer % hbRate === 0) {
              BT_AUDIO.beep(45, 0.06, 0.12, 'sine');
              setTimeout(function () {
                return BT_AUDIO.beep(40, 0.04, 0.08, 'sine');
              }, 120);
            }
          } else {
            S._heartbeatTimer = 0;
          }

          /* Sword swing — check hits */
          /* Clear lock if target is dead */
          if (S.lockedTarget) {
            var lt = S.lockedTarget;
            if (lt.type === 'monster' && (!lt.ref.alive || lt.ref.curHp <= 0)) S.lockedTarget = null;else if (lt.type === 'npc' && !lt.ref.alive) S.lockedTarget = null;
          }
          /* Auto-attack: trigger swing/bow automatically */
          /* §4.5 Attack speed — base cooldown modified by amulet */
          var atkSpdAmulet = ((_S$rpg9 = S.rpg) === null || _S$rpg9 === void 0 || (_S$rpg9 = _S$rpg9._amuletBonus) === null || _S$rpg9 === void 0 ? void 0 : _S$rpg9.stat) === 'atkSpd' ? 1 + S.rpg._amuletBonus.value / 100 : 1.0;
          /* v2.3.1134: Tempo channel multiplies the cooldown AFTER the amulet
             (both sources stack; the 200ms floor still backstops).  The server's
             per-monster cadence floor assumes Tempo's -20% cap. */
          var effectiveSwingCd = Math.max(200, Math.floor(SWING_COOLDOWN * swingCooldownMult(S.rpg) / atkSpdAmulet));
          /* Staff fires slower than bow — add the 300 ms penalty to the
             cooldown gate instead of pushing swingTimer into the future,
             which made every `Date.now() - swingTimer` reader negative
             for 300 ms (caused the one-frame character flicker on
             magic cast since downstream render code assumed swingTimer
             is always in the past). */
          var _staffCdExtra = (S.rpg && S.rpg.activeSlot === 'staff') ? 300 : 0;
          /* v2.3.212: no weapon in active slot -> auto-attack disabled.
             Slot fallback to melee mirrors getActiveWeapon's default. */
          var _aSlot = (S.rpg && S.rpg.activeSlot) || 'melee';
          var _eqWpn = !S.rpg ? null
                     : _aSlot === 'ranged' ? S.rpg.rangedWeapon
                     : _aSlot === 'staff'  ? S.rpg.staffWeapon
                     :                       S.rpg.weapon;
          /* ═══ v2.3.2229: NO STICK, SO THE LOCK IS THE AIM ═══
             The right stick used to write S._aimAngle on every deflection and
             the renderer's facing ladder, the aim caret, the backpedal test
             and the shield all read it.  With the stick gone (the right
             control is a button now) nothing wrote it during a fight, so a
             player auto-attacking a slime to their left kept facing wherever
             they had last WALKED.  Written here, once per frame while the
             button is held and a target is locked, because this loop is the
             one place that already knows both facts; every reader is
             unchanged.  Unlocked, the old fallback (last aim, then facing)
             still applies, so a swing at air goes where the body points. */
          if (S.autoAttack && S.lockedTarget && S.lockedTarget.ref) {
            var _lkPt = lockAimPoint(S.lockedTarget.ref);
            if (_lkPt) {
              S._aimAngle = Math.atan2(_lkPt.y - P.y, _lkPt.x - P.x);
              S._aiming = true;
              S._facing = Math.abs(Math.cos(S._aimAngle)) > Math.abs(Math.sin(S._aimAngle))
                ? (Math.cos(S._aimAngle) > 0 ? 'right' : 'left')
                : (Math.sin(S._aimAngle) > 0 ? 'down' : 'up');
            }
          }
          if (S.autoAttack && S.rpg && _eqWpn && Date.now() - S.swingTimer >= effectiveSwingCd + _staffCdExtra) {
            /* Loot pickup freeze suppresses auto-swing — keeps the
               0.5s pickup animation clean instead of mid-swing. */
            var _lootSwingBlock = S._lootFreezeUntil && Date.now() < S._lootFreezeUntil;
            /* v2.3.1473: ...and the auto-attack loop stops on death, the
               path that actually kept firing during the skeleton anim. */
            if (!_lootSwingBlock && !isPlayerDead(S) && !(S._playerStunUntil && Date.now() < S._playerStunUntil)) {
              var _S$rpg0, _S$rpg1;
              if (((_S$rpg0 = S.rpg) === null || _S$rpg0 === void 0 ? void 0 : _S$rpg0.activeSlot) === 'ranged' || ((_S$rpg1 = S.rpg) === null || _S$rpg1 === void 0 ? void 0 : _S$rpg1.activeSlot) === 'staff') {
                var _S$rpg10;
                var isStaff = ((_S$rpg10 = S.rpg) === null || _S$rpg10 === void 0 ? void 0 : _S$rpg10.activeSlot) === 'staff';
                /* v2.3.1979: a bow arrow leaves from the GRIP, so the shot is
                   measured from the grip.  Measured from the player's feet (as
                   it was), the arrow's flight line came out PARALLEL to the
                   line that hits, passing 9-32px to the side of a 27px slime
                   -- the owner's "flew beside it without damaging it".
                   Staff bolts have no grip offset (fromGrip is false and they
                   start at dist 14 from the player), so they keep the player
                   origin. */
                var _shotX = (!isStaff && typeof S._bowGripX === 'number') ? S._bowGripX : P.x;
                var _shotY = (!isStaff && typeof S._bowGripY === 'number') ? S._bowGripY : P.y;
                var arrAngle;
                /* v2.3.1111: aim at the BODY CENTRE, not the feet -- the
                   projectile hit-test uses the body-centre Y, and a
                   feet-aimed shot rode below the hit circle for the tall
                   archetypes (fodder gap 40 > arrow radius 26; mummy/
                   skeleton 48 > 40) -- locked bow shots systematically
                   missed while wider staff bolts mostly connected.
                   v2.3.1979: ...and at the RENDERED position the hit-test
                   uses, so the shot does not lead a walking monster's hitbox. */
                var _lockPt = lockAimPoint(S.lockedTarget && S.lockedTarget.ref);
                if (_lockPt) {
                  arrAngle = Math.atan2(_lockPt.y - _shotY, _lockPt.x - _shotX);
                } else if (S._aiming && S._aimAngle != null) {
                  arrAngle = S._aimAngle;
                } else {
                  var fd = S._facing || 'down';
                  arrAngle = fd === 'right' ? 0 : fd === 'up' ? -Math.PI / 2 : fd === 'left' ? Math.PI : Math.PI / 2;
                }
                if (!S.arrows) S.arrows = [];
                S.arrows.push({
                  ang: arrAngle,
                  /* v2.3.937: bow shots nock at the teal grip and launch at the
                     (early) release -- start near the player and let projectiles.js
                     hold them at the grip until BOW_RELEASE_MS.  Staff bolts keep
                     the old immediate feet-origin (dist 14, no fromGrip). */
                  dist: isStaff ? 14 : 2,
                  fromGrip: !isStaff,
                  /* v2.3.109: bow's 0.7x flat now lives inside
                     calcWeaponDmg as the 0.6x-0.8x range, so no
                     per-projectile multiplier is needed here. */
                  dmg: Math.round(pDmg),
                  /* v2.3.1335 (owner): bow/staff range -25% — staff 90->68
                     ticks (450->340px at 5px/tick); bow 120->90 ticks (the
                     675px plant cap in projectiles.js governs the real reach). */
                  life: isStaff ? 68 : 90,
                  maxLife: isStaff ? 68 : 90,
                  hitIds: new Set(),
                  isStaff: isStaff,
                  /* v2.3.1135: Piercing/Longshot channels — finite pierce
                     budget (extra targets past the first) + speed/flight
                     multiplier.  Staff bolts have their own AoE identity
                     (Detonation) and take neither. */
                  pierceLeft: isStaff ? undefined : (bowPierceCount(S.rpg) || undefined),
                  pierce: !isStaff && bowPierceCount(S.rpg) > 0,
                  _rangeMult: isStaff ? 1 : bowRangeMult(S.rpg)
                });
                /* Broadcast projectile to other players */
                if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_projectile', payload: {
                  id: S.myId, x: Math.round(P.x), y: Math.round(P.y), ang: arrAngle, isStaff: isStaff, ts: Date.now()
                }});
                S.swingTimer = Date.now(); /* Staff cooldown penalty applied at the gate above, not here */
                if (isStaff) {
                  BT_AUDIO.play('magic-cast', { vol: 0.55 });
                } else {
                  /* v2.3.925: drive the bow-shoot stand-in (entityRenderer reads
                     these to play the load/draw/release frames for the shot). */
                  S._bowShotAt = Date.now();
                  S._bowShotAng = arrAngle;
                  BT_AUDIO.play('arrow-fly', { vol: 0.85 });
                }
              } else if (!S.isSwinging) {
                S.swingTimer = Date.now();
                S.isSwinging = true;
                S._specialAttack = false;
                clearSwingHitFlags(S); /* v2.3.1421: fresh dedup per swing */
                /* v2.3.1011: defer the player_swing broadcast until S._swingAng
                   is computed just below, so peers get the weapon + facing and
                   can render the full stand-in (not just a bare arc). */
                S._swingBcastPending = true;
                /* v2.3.1798: same rotation as the manual swing — one helper, so
                   the auto-attack and the tapped swing cannot drift apart.
                   v2.3.2202: deferred to the contact frame like the tap path
                   (see playerActions.swingAttack) — the sweep below plays it
                   when the MELEE_CONTACT_MS gate opens. */
                S._swingSfxKey = meleeSwingSfx(S.rpg);
                S._swingSfxPending = true;
              }
            }
          }
          /* v2.3.1733: a STAMINA ABILITY borrows the swing animation and
             must NOT borrow the swing's damage.  Shield Bash and Whirlwind
             are resolved entirely server-side (src/game/abilities.js sets
             _abilitySwingUntil; the worker rolls the targets, damage, stun
             and knockback).  Letting this sweep run during that window
             would send an ORDINARY monster_damage for the same button
             press — the ability would quietly deal its damage twice, once
             authoritatively and once as a normal hit, and the anticheat
             would never blink because both hits are individually legal. */
          var _abilFx = S._abilitySwingUntil && Date.now() < S._abilitySwingUntil;
          if (S.isSwinging && !_abilFx && Date.now() - S.swingTimer < 400) {
            var baseAngle;
            if (S.lockedTarget && S.lockedTarget.ref) {
              var _lt2 = S.lockedTarget.ref;
              var tx = _lt2.x || _lt2.renderX || P.x;
              var ty = _lt2.y || _lt2.renderY || P.y;
              baseAngle = Math.atan2(ty - P.y, tx - P.x);
            } else if (S._aiming && S._aimAngle != null) {
              baseAngle = S._aimAngle;
            } else {
              var swDir = S._facing || 'down';
              baseAngle = swDir === 'right' ? 0 : swDir === 'up' ? -Math.PI / 2 : swDir === 'left' ? Math.PI : Math.PI / 2;
            }
            /* v2.3.936: publish the swing angle so the renderer can pick the
               sword stand-in sheet by DOMINANT AXIS (the big sword covers a
               wide arc, so 3 sheets cover all angles): more-north -> north,
               more-south -> south, more-horizontal -> east/west. */
            S._swingAng = baseAngle;
            /* v2.3.1011: relay the swing once, with weapon type + angle, so
               other players render the full sword/greatsword stand-in facing
               the right way (Phase 1 of MP attack-animation parity). */
            if (S._swingBcastPending) {
              S._swingBcastPending = false;
              if (S.channel) {
                var _bcWpn = getActiveWeapon(S.rpg);
                try { S.channel.send({ type: 'broadcast', event: 'player_swing', payload: {
                  id: S.myId, ts: Date.now(), wpn: (_bcWpn && _bcWpn.type) || 'sword', ang: baseAngle
                } }); } catch (e) {}
              }
            }
            /* ═══ v2.3.1747: THE COMBO CHAIN IS GONE (owner: "I think I want
               you to remove the combo (the x1, x2, x3) from the game") ═══
               §5.9 built a per-target 0-3 counter off auto-attacks and hung
               four things on it: a +15% burst on specials, a status SPREAD at
               count 2, an extended status at count 3, and the x1/x2/x3 badge
               over your head.  All four are removed together — leaving the
               mechanic while hiding its readout would be worse than either
               keeping or dropping it, because the damage would still swing by
               15% for a reason the player can no longer see.
               `_swingHitTarget` stays: it is also what the collision code uses
               to mean "the monster this swipe actually landed on". */
            var _swingHitTarget = null;
            /* v2.3.222: sword special covers a full half-circle at 2x
               reach. Regular swing keeps the v2.3 SWING_RANGE / SWING_ARC. */
            var _swingRange = S._specialAttack ? SWING_RANGE * 2 : SWING_RANGE;
            var _swingArc   = S._specialAttack ? Math.PI         : SWING_ARC;
            /* v2.3.940: ALL melee swings are "wild" -- a small 360° core around
               the player (any angle) UNION a wide forward half-circle at a
               bigger reach.  Heavy/special -> full 360° spin at the outer reach.
               (v2.3.939 gated this to the 'greatsword' type, but the default /
               most-used melee weapon is type 'sword', so it never showed.  The
               swing path only runs for an equipped melee weapon anyway.) */
            var _actWpn = S.rpg && getActiveWeapon(S.rpg);
            var _wildSwing = !!(_actWpn && (_actWpn.type === 'sword' || _actWpn.type === 'greatsword'));
            var _gsInner = S._specialAttack ? GS_INNER_RADIUS * 1.25 : GS_INNER_RADIUS;
            var _gsOuter = S._specialAttack ? GS_OUTER_RADIUS * 1.5  : GS_OUTER_RADIUS;
            /* v2.3.1134: Cleave widens the normal forward arc (specials are
               already full-circle).  effectsRenderer adds the same bonus to
               the aim preview — keep them in lockstep. */
            var _gsArc   = S._specialAttack ? Math.PI * 2 : GS_FORWARD_ARC + cleaveArcBonus(S.rpg);
            var _maxRange = _wildSwing ? Math.max(_gsInner, _gsOuter) : _swingRange;
            /* ═══ v2.3.2200: CONTACT SYNC ("floaty" fix #1) ═══
               The angle/_swingAng/player_swing broadcast above still runs
               from frame 0 (peers must see the swing start immediately);
               only the HIT TEST below waits for the blade to visually
               reach the target — MELEE_CONTACT_MS into the 300ms swing.
               Dedup is untouched: _hitThisSwing clears per swing, and the
               fastest legal swing cadence (200ms) is longer than the
               contact delay, so no swing loses its window. */
            var _contactOpen = Date.now() - S.swingTimer >= MELEE_CONTACT_MS;
            /* v2.3.2202: the deferred swing whoosh plays the frame the
               contact gate opens — hit or whiff — so it stacks with the
               alternating hit thunk exactly as it did before contact
               sync, just at the moment the blade visually arrives. */
            if (_contactOpen && S._swingSfxPending) {
              S._swingSfxPending = false;
              BT_AUDIO.swordSwing(S._swingSfxKey, { vol: 0.55 });
            }
            /* Hit monsters */
            S.monsters.forEach(function (m) {
              if (!_contactOpen) return; /* v2.3.2200: blade not at target yet */
              /* v2.3.2224: the snow pile is not a target that refuses the hit
                 -- it is not a target.  Sat beside !m.alive because it means
                 the same thing to a swing, and BEFORE _hitThisSwing so the
                 swing is not consumed either: the blade carries on to whoever
                 is standing behind him. */
              if (!m.alive || isIntangible(m) || m._hitThisSwing) return;
              /* Fodder slimes render as a 96 px sprite anchored at the
                 feet (m.y is feet-level).  Sprite frame bottom = m.y+8,
                 frame top = m.y-88, visual mid-frame = m.y-40.  The
                 -17 offset (v2.1.59 era) was tuned to a 50 px sprite;
                 -30 (v2.1.70) still missed the top; -50 (v2.1.71)
                 overshot.  -40 (v2.1.72, mid-frame) is the sweet spot
                 confirmed by user. */
              /* v2.3.1535: resolve reskins to the shape they render as.  A
                 Verdant Wilds slime arrives as 'mossSlime', matched none of
                 the cases below, and got _mHitY = m.y (the FEET) with _hitR
                 = 0 -- so you had to swing at its shadow, with none of the
                 slime's generous radius (owner: "the hitbox is at their
                 shadow").  See hitShapeOf. */
              var _archHit = hitShapeOf(m.archetype || m.type);
              /* v2.3.1822: hit-test the monster where it is DRAWN, not where
                 the logic says it is.  Three separate things were making the
                 owner's swings miss a snowman that the caret was plainly
                 touching, and all three are here:

                 (a) POSITION.  A server-driven monster is painted at
                     renderX/renderY, which trails m.x/m.y by ~4 frames of
                     motion, so the hitbox LED the sprite in the direction of
                     travel.  This is exactly the v2.3.1111 fix the projectile
                     path already got; the melee path never did, which is why
                     the misses were "inconsistent" — they depended on whether
                     the thing was walking.
                 (b) BODY CENTRE.  The offsets were a hand-written chain with
                     no snowman case, so it fell through to m.y = the FEET.
                     monsterBodyOffsetY is the shared table (snowman = 19) that
                     was created for precisely this drift.
                 (c) RADIUS.  Likewise no snowman case, falling through to
                     monsterProceduralRadius, which returns 0 for anything
                     sprite-backed — a point-sized hitbox on a 64px body.
                     See monsterMeleeHitRadius.

                 Together these make the swing land whenever the caret's arc
                 covers the drawn body, which is the owner's actual ask:
                 "if the aim carat is touching the monster during midswing it
                 counts as a hit". */
              var _hitX = (typeof m.renderX === 'number') ? m.renderX : m.x;
              var _hitBaseY = (typeof m.renderY === 'number') ? m.renderY : m.y;
              var _mHitY = _hitBaseY - monsterBodyOffsetY(_archHit);
              var _hitR = monsterMeleeHitRadius(_archHit);
              var mDist = Math.sqrt(Math.pow(_hitX - P.x, 2) + Math.pow(_mHitY - P.y, 2)) - _hitR;
              if (mDist > _maxRange) return;
              var mAngle = Math.atan2(_mHitY - P.y, _hitX - P.x);
              var angleDiff = mAngle - baseAngle;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
              /* v2.3.1822: the arc test measured the angle to the monster's
                 CENTRE, so a wide body straddling the edge of the arc was a
                 miss even though half of it sat inside — the same
                 hitbox-narrower-than-the-art problem as the radius above, in
                 the other axis.  Widen the arc by the angle the body actually
                 subtends from where the player stands (asin(r/d), the exact
                 half-angle of a circle of radius r at distance d).  Clamped
                 to a quarter-turn so a monster standing ON you cannot open the
                 arc to a full circle and turn every swing into a spin. */
              var _centreDist = mDist + _hitR;   // undo the radius subtraction
              var _bodyHalfAng = (_centreDist > _hitR)
                ? Math.min(Math.PI / 4, Math.asin(_hitR / _centreDist)) : Math.PI / 4;
              /* v2.3.940: melee = 360° core OR forward half-circle.  (Heavy:
                 _gsArc = 2π, so the forward test is always true within _gsOuter
                 -> full spin.)  Non-melee fallback keeps the single cone. */
              var _inShape = _wildSwing
                ? (mDist <= _gsInner || (mDist <= _gsOuter && Math.abs(angleDiff) <= _gsArc / 2 + _bodyHalfAng))
                : (Math.abs(angleDiff) < _swingArc / 2 + _bodyHalfAng);
              if (_inShape) {
                var _ELEMENTS$collisionRe2;
                m._hitThisSwing = true;
                if (!_swingHitTarget) _swingHitTarget = m;
                var isCrit = Math.random() < critChance;
                var specialMult = S._specialAttack ? specialAtkMultFor(_activeWpn.type) : 1; /* v2.3.1397: melee special 3x (owner) */

                /* §9 — Apply element status on hit */
                var hitElement = S._specialAttack ? _activeWpn.element2 : _activeWpn.element1;
                if (hitElement) {
                  var _ELEMENTS$hitElement;
                  var statusId = (_ELEMENTS$hitElement = ELEMENTS[hitElement]) === null || _ELEMENTS$hitElement === void 0 ? void 0 : _ELEMENTS$hitElement.status;
                  if (statusId) {
                    var _m$statuses;
                    var wasNew = !((_m$statuses = m.statuses) !== null && _m$statuses !== void 0 && _m$statuses[statusId]);
                    applyStatus(m, statusId, S.player, Date.now());
                    /* §12.2 cert — first elemental status applied. */
                    masteryEarnCert('first-status');
                    var elemDef = ELEMENTS[hitElement];
                    /* §Stage 2: "Brief bright pop on first application. Then ambient." */
                    if (wasNew) {
                      /* Flash ring at point of contact */
                      for (var ep = 0; ep < 8; ep++) {
                        S.hitParticles.push({
                          x: m.x + (Math.random() - 0.5) * 4,
                          y: m.y + (Math.random() - 0.5) * 4,
                          vx: (Math.random() - 0.5) * 4,
                          vy: (Math.random() - 0.5) * 4 - 1,
                          life: 0.5,
                          color: elemDef.color,
                          size: 1.5 + Math.random() * 2
                        });
                      }
                      /* Soft characteristic sound per element */
                      var pitches = {
                        flame: 350,
                        frost: 800,
                        water: 500,
                        venom: 280,
                        storm: 900,
                        stone: 200,
                        wind: 650,
                        dark: 120,
                        light: 1000
                      };
                      BT_AUDIO.beep(pitches[hitElement] || 400, 0.04, 0.06, 'sine');
                    }
                    /* §10.2 Effectiveness indicator — green/red arrow on hit */
                    if (m.element) {
                      var eff = getEffectiveness(hitElement, m.element);
                      if (eff > 1.0) {
                        pushDmgPopup(S, m.x + 12, m.y - 10, 'UP', '#3dd497');
                        if (!_R6._questFlags) _R6._questFlags = {};
                        _R6._questFlags.usedEffectiveness = true;
                      } else if (eff < 1.0) {
                        pushDmgPopup(S, m.x + 12, m.y - 10, 'DN', '#ff5e6c');
                      }
                    }
                  }
                }

                /* §10.3 — Check for collision (two different elements on target) */
                var collisionResult = null;
                if (hitElement) {
                  collisionResult = resolveCollision(m, hitElement, S.player, _R6, Date.now());
                }
                /* v2.3.234 (Phase 4): special-attack damage scales with
                   Mind instead of the weapon stat.  Normal swings still
                   use pDmg (Power-based for melee).  Variance is rolled
                   per-hit so different monsters in a sweep can take
                   slightly different damage. */
                var _specBase = S._specialAttack ? calcSpecialDmg(_activeWpn.type, _R6, _activeWpn.tierMult, _activeWpn) : pDmg;
                /* v2.3.1747: the `* _comboBurst` term (1.15 at combo 1+) is gone
                   with the chain.  The SERVER's cap is deliberately untouched:
                   its `comboBoost = 5` (combat.js _maxDmgForAttacker) is a
                   single headroom term covering "combo + status amplifier +
                   amulet elemDmg + lunge", so shrinking it for this would
                   clamp legitimate hits from the other three. */
                /* ═══ v2.3.2213: THE ANCHOR BELONGS HERE TOO ═══
                   Owner, on the preview: "the damage was not double the top
                   of the range."  It wasn't, and this line is why: v2.3.2212
                   anchored the SERVER's roll and the DPS readout, and left
                   the number the player actually watches -- this local
                   prediction, which is what paints the popup on your own
                   swing -- multiplying the roll exactly as before.  So the
                   server was paying the anchored damage while the screen
                   showed the old figure.

                   Mirrors combat.js _critAnchor term for term: the floor is
                   2x the top of THIS weapon's displayed range, the flat rides
                   on top of it, and the special multiplier applies after --
                   the same order the server uses. */
                var _rangeTop = 0;
                if (isCrit) {
                  var _rng = calcDisplayDmgRange(_R6, _activeWpn);
                  _rangeTop = (_rng && _rng.max) || 0;
                }
                /* v2.3.2218: the SPECIAL multiplier goes in BEFORE the crit,
                   because that is the order combat.js uses — it does
                   `base *= 3` and only then anchors, so the anchor floors
                   the already-tripled number and is NOT itself tripled.
                   Applying it afterwards (as this did) multiplied the FLOOR
                   too: a special crit whose ordinary crit fell under the
                   anchor predicted 2 x rangeTop x 3 where the server paid
                   max(base x 3 x critMult, 2 x rangeTop) — around 60% high
                   on exactly the biggest, most-watched hit in the game.
                   Safe to reorder: under prog3 calcSpecialDmg and
                   calcWeaponDmg share prog3DmgTerm, so _specBase is the
                   server's pre-special base term for term. */
                var _base = _specBase * specialMult;
                var _critBase = isCrit
                  ? Math.max(_base * critMult, _rangeTop * CRIT_ANCHOR_MULT) + critFlat
                  : _base;
                var dmg = Math.round(_critBase);
                /* Boss invulnerability — can only be damaged during recovery
                   phase.  v2.3.2224: the burrow never reaches here (skipped
                   above), so this popup stays what it always was: a BOSS
                   cue, where the message is the mechanic. */
                if (m._invulnerable) {
                  pushDmgPopup(S, m.x, m.y - 20, 'IMMUNE', '#888');
                  BT_AUDIO.beep(200, 0.03, 0.04, 'square');
                  return;
                }
                /* v2.3.254: level-difference scaling removed -- monsters
                   always take full weapon damage, matching the v2.3.109
                   WYSIWYG decision for variant incomingDmgScalar.  The
                   "block N" subText below relied on _mitigated and is
                   gone too -- it was firing on every higher-level slime
                   hit and reading as a defensive block from the slime. */
                /* Server-authoritative zones: HP only flows from server
                   monster_hit ticks.  Local decrement would race the
                   server's view and cause double-credit on the kill
                   block below.  Visual hit-react, particles, and the
                   monster_dmg_at broadcast still fire so the hit
                   reads instantly. */
                if (!S._serverMonsters) m.curHp -= dmg;
                /* Peer floater: only in client-local zones.  In server zones
                   the worker's monster_hit is the single source of truth, so
                   this p2p echo would double-count (smooth-peer-damage-numbers
                   Fix B). */
                if (!S._serverMonsters && S.channel) S.channel.send({ type: 'broadcast', event: 'monster_dmg_at', payload: { id: S.myId, x: m.x, y: m.y, dmg: dmg, isCrit: isCrit } });
                /* Hit-reaction sheet plays once per non-fatal hit.  Use
                   (archetype||type) so server-synced monsters without an
                   archetype field still get the reaction.  Snowman gets a
                   600 ms window for its 12-frame recoil; fodder slime
                   stays at 400 ms for its squash. */
                {
                  var _hitArch = m.archetype || m.type;
                  var _hitBase = baseArchetypeOf(_hitArch);
                  /* v2.3.2200: EVERY archetype recoils now, not just
                     fodder/snowman — monsters with a hit sheet play it,
                     everything else gets the renderer's squash fallback.
                     A hit that moves nothing on the target reads as a
                     whiff, which is "floaty" fix #3. */
                  if (m.curHp > 0) {
                    m._hitAnimStart = Date.now();
                    m._hitAnimEnd = Date.now() + (_hitArch === 'snowman' ? 600 : 400);
                  }
                  /* v2.3.2200: flash locally too — the monster_hit echo
                     also stamps this, but town/SP zones never get one and
                     in server zones the echo trails the swing by a beat;
                     re-stamping just extends the same 120ms pulse. */
                  m._hitFlash = Date.now();
                  /* Retaliation — getting hit forces aggro and keeps the
                     monster chasing the player for 5s even if the player
                     is past the normal aggro range.  Gated on fodder-base
                     because that's the only archetype with multi-hit
                     survivors (fireGoblin); plain slimes one-shot so the
                     flag is moot.  Snowmen are stationary turrets, so
                     skip them too. */
                  if (_hitBase === 'fodder' && m.curHp > 0) {
                    m._aggroed = true;
                    m._aggroTs = m._aggroTs || Date.now();
                    m._chaseUntil = Date.now() + 5000;
                  }
                  if (_hitArch === 'snowman' && m.curHp > 0) {
                    try { BT_AUDIO.play('snowman-hit', { vol: 0.7 }); } catch (e) {}
                    /* v2.3.1124: stamp a full-size ice-burst impact flash for
                       this melee hit (effectsRenderer reads _impactAt/_impactScale).
                       v2.3.1127: + _impactAngle (swing dir) so the eruption plume
                       points along the attack direction. */
                    m._impactAt = Date.now(); m._impactScale = 1; m._impactAngle = baseAngle;
                  }
                }
                /* Count-based weight: 1 per landed hit (Power for melee).
                   Pairs with block = 3 to match the user's hits-vs-blocks
                   ratio for Endurance share of killXp. */
                addBuildUse(_R6, 'power', 1);
                /* T2: damage-driven weapon-skill XP for the equipped
                   category (Sword for melee).  A level-up grants +5 into
                   that category's build pool; surface a small toast. */
                {
                  var _wlM = awardWeaponXp(_R6, dmg);
                  if (_wlM) {
                    pushDmgPopup(S, m.x, m.y - 44, _wlM.cat.toUpperCase() + ' Lv ' + _wlM.level + ' · +' + _wlM.points + 'pt', '#5b52ff');
                    try { BT_AUDIO.levelUp(); } catch (e) {}
                  }
                }
                /* v2.3.2200: the slash-mark writer is GONE — it pushed
                   records nothing ever rendered (no reader anywhere in
                   src/rendering/, verified), and the material debris
                   below is the shipped version of the same intent.
                   v2.3.2200: the 8-circle blood spray is replaced by a
                   directional SPRITE debris burst of the monster's own
                   material (owner: "snow that flies off the monster";
                   code-drawn circles read as placeholder).  One queue,
                   rendered by effectsRenderer._updateDebrisBursts. */
                if (!S.hitParticles) S.hitParticles = [];
                spawnHitDebris(S, m, baseAngle);

                /* Report attack INTENT to server for authoritative
                   resolution.  The worker now ROLLS the damage itself
                   (server-computed combat, baseline-10) -- we no longer
                   send a damage number; the local popup is prediction
                   only.  Collision/combo damage is intentionally not sent
                   (server has no status model yet -- follow-up slice). */
                if (S._serverMonsters && S.channel) {
                  S.channel.send({ type: 'monster_damage', payload: {
                    monsterId: m.id, zone: S.currentZone, element: activeWpn.element1,
                    /* slot=melee tells the worker this hit was a real
                       melee swing, so the lifesteal gate fires even if
                       the persisted activeSlot drifted (desktop slot UI
                       skips set_active_slot).  special drives the Mind-
                       scaled 2x special roll on the server. */
                    slot: 'melee', special: !!S._specialAttack
                  }});
                }

                /* Collision damage + feedback */
                if (collisionResult) {
                  var _ELEMENTS$collisionRe;
                  /* §12.2 certs — collision-driven advancements. */
                  masteryEarnCert('first-collision');
                  if (_activeWpn && _activeWpn.isVolatile) masteryEarnCert('first-volatile');
                  if (collisionResult.resonating) masteryEarnCert('first-resonance-hit');
                  if (collisionResult.collision && collisionResult.collision.type === 'capstone') masteryEarnCert('first-capstone');
                  /* v2.3.1747: the combo burst on collision damage, the
                     count-2 status SPREAD and the count-3 "Next" extended-
                     status flag all went with the chain (owner: remove the
                     combo).  Collisions themselves are untouched — they are
                     the elemental system, which the combo only amplified. */
                  if (!S._serverMonsters) m.curHp -= collisionResult.damage;
                  /* Client-local zones only -- server zones use monster_hit (Fix B). */
                  if (!S._serverMonsters && S.channel) S.channel.send({ type: 'broadcast', event: 'monster_dmg_at', payload: { id: S.myId, x: m.x, y: m.y, dmg: collisionResult.damage, isCrit: true } });
                  var coll = collisionResult.collision;
                  var elemColor = ((_ELEMENTS$collisionRe = ELEMENTS[collisionResult.triggerElement]) === null || _ELEMENTS$collisionRe === void 0 ? void 0 : _ELEMENTS$collisionRe.color) || '#fff';
                  /* §5.7 Resonance — brighten color and prefix the burst
                     with a 🎯 marker when the consumed status was inside
                     its resonance window. Tag a +N% burst readout at peak. */
                  var _bColor = elemColor;
                  var _bPrefix = '';
                  if (collisionResult.resonating) {
                    _bPrefix = 'CRIT ';
                    _bColor = '#fffbb0'; /* near-white shimmer per §5.7.3 */
                  }
                  /* Collision burst damage number */
                  pushDmgPopup(S, m.x + 8, monsterPopupY(m, -35), _bPrefix + collisionResult.damage + ' ' + coll.name, _bColor);
                  /* §5.7.3 Resonance ring — brighter ground burst when the
                     consumed status was timed inside its resonance window. */
                  if (collisionResult.resonating) {
                    var _ringR = 28 + collisionResult.resonanceDepth * 14;
                    for (var _rp = 0; _rp < 24; _rp++) {
                      var _rpA = (_rp / 24) * Math.PI * 2;
                      S.hitParticles.push({
                        x: m.x + Math.cos(_rpA) * _ringR,
                        y: m.y + Math.sin(_rpA) * _ringR,
                        vx: Math.cos(_rpA) * 0.6,
                        vy: Math.sin(_rpA) * 0.6,
                        life: 0.45,
                        color: '#ffffff',
                        size: 1.5 + Math.random() * 1.5
                      });
                    }
                  }
                  /* Mana restore feedback */
                  if (collisionResult.manaRestored > 0) {
                    pushDmgPopup(S, P.x, P.y - 45, '+' + collisionResult.manaRestored + ' MP', '#3b82f6');
                  }
                  /* Collision burst particles — element colored */
                  for (var cp = 0; cp < 15; cp++) {
                    S.hitParticles.push({
                      x: m.x + (Math.random() - 0.5) * 6,
                      y: m.y + (Math.random() - 0.5) * 6,
                      vx: (Math.random() - 0.5) * 6,
                      vy: (Math.random() - 0.5) * 6 - 2,
                      life: 0.8,
                      color: elemColor,
                      size: 2 + Math.random() * 3
                    });
                  }
                  S.screenShake = Math.max(S.screenShake, 5);
                  /* Codex discovery */
                  var isNew = discoverCollision(coll.id);
                  if (isNew) {
                    pushDmgPopup(S, P.x, P.y - 65, 'NEW: ' + coll.name + '!', '#f5c542');
                    BT_AUDIO.collect();
                  }
                }
                /* Real WAV — replaces the old synth material thump.
                   Alternates between sword-hit2 / sword-hit3; the original
                   sword-hit sample is reserved for grand-slam hits.
                   Snowman gets its own snowball-thud snowman-hit (played
                   in the hit-reaction block above) instead — the metallic
                   sword wav is wrong for a snow body. */
                if ((m.archetype || m.type) !== 'snowman') {
                  BT_AUDIO.swordHit({ vol: 0.55 });
                }

                /* §19.1 Quest tracking — combat flags */
                if (!_R6._questFlags) _R6._questFlags = {};
                if (isCrit) _R6._questFlags.critsLanded = (_R6._questFlags.critsLanded || 0) + 1;
                if (hitElement) {
                  if (!_R6._questFlags.statusesApplied) _R6._questFlags.statusesApplied = {};
                  _R6._questFlags.statusesApplied[hitElement] = true;
                }
                if (collisionResult && _activeWpn.isVolatile) _R6._questFlags.volatileCollision = true;
                /* Three-layer collision sound if collision fired */
                if (collisionResult) {
                  BT_AUDIO.collisionSound(collisionResult.setupElement, collisionResult.triggerElement, collisionResult.manaRestored);
                }
                /* v2.3.2200: the §6 hit-stop writes are DELETED, not just
                   disabled.  BroTown.jsx nulls S._hitStop unconditionally
                   every frame (owner: "felt like lag") — that null is the
                   pin and stays; writing values into a field the next
                   frame erases was dead code masquerading as a feature. */
                /* Knockback — §Creative Vision: proportional to hit weight.
                   Special attacks knock back ~2x (per user v2.3.110:
                   "Sword hits make the monsters bounce back a
                   substantial amount.  Special attacks do double that
                   bounce back amount.").  Crit sits between normal
                   and special. */
                var kbAngle = Math.atan2(m.y - P.y, m.x - P.x);
                /* v2.3.1356: owner — "bounce back is too intense for
                   monsters, reduce by 75%": 180/45/30 -> 45/11/8 (the
                   special/crit/normal RATIO from v2.3.110 is kept).
                   v2.3.1397: owner — special bounce = exactly 2x a
                   normal hit (45 -> 16); crit unchanged between.
                   v2.3.1402: owner — reduce ALL knockback 50% (16/11/8 ->
                   8/5.5/4; the 2x-normal special ratio still holds).
                   v2.3.2200: 8/5.5/4 -> 10/7/6.  Both prior cuts reacted
                   to the OLD 180px scale; at 4px a normal hit's bounce is
                   below readability and "floaty" is partly this.  Still
                   25-60% under the last owner-approved pre-halving values
                   (called out in the PR body for a one-word veto). */
                var kbForce = S._specialAttack ? 10 : isCrit ? 7 : 6;
                /* Collision adds extra knockback (v2.3.1356: 6 -> 2; v2.3.1402: -> 1) */
                var collisionKb = collisionResult ? 1 : 0;
                m.x += Math.cos(kbAngle) * (kbForce + collisionKb);
                m.y += Math.sin(kbAngle) * (kbForce + collisionKb);
                /* Knockback recovery -- without this, client-side-AI
                   variants (fireGoblin etc) snap back to chase the
                   player on the next frame and the bump is invisible.
                   Suspends AI movement for ~200 ms so the player sees
                   the hit register. */
                m._kbUntil = Date.now() + 200;
                /* §Creative Vision — Weapon-specific hit particles */
                var wpnHitType = _activeWpn.type || 'sword';
                var weaponFX = spawnWeaponHitFX(m.x, m.y, kbAngle, wpnHitType, isCrit);
                weaponFX.forEach(function (p) {
                  return S.hitParticles.push(p);
                });
                /* v2.3.2200: the 1.5s zero-velocity "blood splatter"
                   particles were the intended ground mark all along —
                   they just expired as circles.  Now a real persistent
                   decal (owner: "snow on the ground that stays 5-10s"):
                   material-tinted, 50% per hit so a fight doesn't flush
                   the 80-mark cap, biased along the knockback direction. */
                spawnGroundDecal(S,
                  m.x + Math.cos(kbAngle) * (8 + Math.random() * 15),
                  m.y + Math.sin(kbAngle) * (8 + Math.random() * 15),
                  m.archetype || m.type,
                  { chance: 0.5, size: isCrit ? 7 : 5 });
                /* Screen shake */
                S.screenShake = isCrit ? 6 : 3;
                /* Camera punch — directional kick toward the hit */
                if (isCrit || collisionResult) {
                  var cpAngle = Math.atan2(m.y - P.y, m.x - P.x);
                  var cpForce = isCrit ? 12 : 8;
                  S._camPunch = {
                    dx: Math.cos(cpAngle) * cpForce,
                    dy: Math.sin(cpAngle) * cpForce,
                    ts: Date.now()
                  };
                }
                /* Impact ring flash — expanding ring at point of contact */
                if (!S._impactRings) S._impactRings = [];
                S._impactRings.push({
                  x: m.x,
                  y: m.y,
                  ts: Date.now(),
                  color: isCrit ? '#f5c542' : collisionResult ? ((_ELEMENTS$collisionRe2 = ELEMENTS[collisionResult.triggerElement]) === null || _ELEMENTS$collisionRe2 === void 0 ? void 0 : _ELEMENTS$collisionRe2.color) || '#fff' : '#fff',
                  maxR: isCrit ? 30 : collisionResult ? 25 : 16,
                  duration: isCrit ? 250 : 150
                });
                /* Damage number — scaled by crit/normal in the renderer. */
                var _isSpecialDmg = !!S._specialAttack;
                /* ═══ v2.3.2211: crit: true, AT LAST ═══
                   Owner: "I still can't visually distinguish critical hits."
                   The renderer has sized crits bigger since v2.3.1357 off
                   this exact flag, and no crit has ever set it -- the colour
                   swap was doing the whole job alone.  The icon goes to the
                   crit mark too: a sword on a crit says the same thing as a
                   sword on a normal hit, which is nothing. */
                /* ═══ v2.3.2220: IN A SERVER ZONE, DO NOT GUESS THE NUMBER ═══
                   Owner: "I hit a 69 with a critical hit on a special attack
                   and the snowman didn't die."  It didn't, because 69 was
                   not what landed.  The worker rolls its own variance and
                   its own crit and discards the client's, so this popup was
                   an independent second roll -- a client crit on a server
                   non-crit prints about 2.5x the damage actually dealt, and
                   the sword variance alone can differ by 1.67x on top.
                   v2.3.2218 aligned the FORMULA; nothing can align two
                   separate Math.random() calls.

                   gameEvents paints the authoritative number from
                   monster_hit instead (search v2.3.2220 there).  Everything
                   above this line -- flash, recoil, debris, decal, shake,
                   knockback, the hit spark -- stays local and instant; only
                   the number waits, on the same schedule the HP bar has
                   always used.

                   `dmg` is still computed above: the local path below needs
                   it for client-authoritative zones, and _specialAttack's
                   styling rides through S._ownSpecialRecent. */
                S._ownSpecialRecent = _isSpecialDmg;
                if (!S._serverMonsters) {
                  if (isCrit && collisionResult) {
                    pushDmgPopup(S, m.x, monsterPopupY(m, -20), 'ZAP ' + dmg, DMG_CRIT_COLOR, { iconKey: 'crit', crit: true, special: _isSpecialDmg });
                  } else if (isCrit) {
                    pushDmgPopup(S, m.x, monsterPopupY(m, -20), String(dmg), DMG_CRIT_COLOR, { iconKey: 'crit', crit: true, special: _isSpecialDmg });
                  } else {
                    pushDmgPopup(S, m.x, monsterPopupY(m, -20), '' + dmg, '#fff', { iconKey: 'sword', special: _isSpecialDmg });
                  }
                }
                /* v2.3.254: "block N" mitigation indicator removed
                   alongside the level-diff scaling above. */
                if (m.curHp <= 0) {
                  var _ELEMENTS$splatElem, _ZONES$S$currentZone6;
                  /* Mummy -> skeleton on overkill (v2.3.135). */
                  maybeTransformMonster(m);
                  m.alive = false;
                  m.respawnAt = Date.now() + 30000;
                  m.statuses = {};
                  BT_AUDIO.monsterDeath(m && m.archetype);

                  /* §19.1 Quest kill tracking (v2.3.1120: legacy workers
                     only -- see the gate comment at the melee site). */
                  if (!(S._serverCaps && S._serverCaps.questTrack)) {
                    if (_R6._questKills === undefined) _R6._questKills = {};
                    Object.keys(QUEST_CHAINS).forEach(function (qid) {
                      var _R6$_quests2;
                      if (((_R6$_quests2 = _R6._quests) === null || _R6$_quests2 === void 0 ? void 0 : _R6$_quests2[qid]) === QUEST_STATUS.active) _R6._questKills[qid] = (_R6._questKills[qid] || 0) + 1;
                    });
                  }

                  /* ═══ THE GRAND SLAM — §Creative Vision: scaled cinematic micro-event ═══ */
                  var isGrandSlam = isCrit;
                  /* §12.2 cert — first grand-slam swipe kill. */
                  if (isGrandSlam) masteryEarnCert('first-grand-slam');
                  var isBigEnemy = m.archetype === 'brute' || m.archetype === 'sentinel' || m.archetype === 'hexer';
                  var killScale = isGrandSlam ? isBigEnemy ? 3 : 2 : isBigEnemy ? 1.5 : 1;

                  /* ═══ COMPREHENSIVE STATS — monster kill ═══ */
                  if (!_R6._compStats) _R6._compStats = createDefaultCompStats();
                  _R6._compStats.monstersKilled++;
                  if (isGrandSlam) _R6._compStats.grandSlams++;
                  if (m.level > (_R6._compStats.highestMonsterKill || 0)) _R6._compStats.highestMonsterKill = m.level;
                  if (m.isBoss) _R6._compStats.bossesKilled++;
                  /* §12.2 cert — first apex (boss) defeat. Treats any boss-flagged
                     kill as the apex trigger; the dedicated Apex archetype is
                     not yet broken out from generic bosses in code. */
                  if (m.isBoss || m._isBoss) masteryEarnCert('first-apex-defeat');

                  /* §ENC — Bestiary discovery */
                  if (discoverMonster(m.archetype, S.currentZone)) {
                    pushDmgPopup(S, m.x, m.y - 90, 'New Bestiary Entry!', '#00d4b8');
                  }

                  /* ═══ RARE DROP — 0.1% chance on any kill ═══ */
                  if (Math.random() < RARE_DROP_CHANCE) {
                    var rareDrop = RARE_DROP_ITEMS[Math.floor(Math.random() * RARE_DROP_ITEMS.length)];
                    _R6.achievementPoints = (_R6.achievementPoints || 0) + rareDrop.points;
                    _R6._compStats.rareDropsFound++;
                    pushDmgPopup(S, m.x, m.y - 80, rareDrop.emoji + ' RARE: ' + rareDrop.name + ' (+' + rareDrop.points + ' AP)', '#f5c542');
                    S.screenShake = 4;
                    BT_AUDIO.beep(800, 0.1, 0.12, 'sine');
                    setTimeout(function () {
                      return BT_AUDIO.beep(1000, 0.08, 0.1, 'sine');
                    }, 80);
                    setTimeout(function () {
                      return BT_AUDIO.beep(1200, 0.1, 0.12, 'sine');
                    }, 160);
                  }

                  /* ═══ KILL SLOWMO — disabled, felt like lag ═══ */

                  /* Sound — proportional to significance */
                  if (isGrandSlam) {
                    BT_AUDIO.grandSlam();
                  } else {
                    BT_AUDIO.deathBoom(m && m.archetype);
                  }

                  /* Screen shake — proportional. Magic kills get no shake;
                     they read through orb-crash + flash ring already. */
                  if (_activeWpn.type !== 'staff') {
                    S.screenShake = Math.round(4 * killScale);
                    S.screenShake = Math.min(S.screenShake, 4);
                  }
                  var killAngle = Math.atan2(m.y - P.y, m.x - P.x);
                  var deathParts = [];
                  var _killElem = hitElement || _activeWpn.element1 || null;
                  /* Cap: only generate a few simple particles */
                  for (var _dp = 0; _dp < 8; _dp++) {
                    var _dpA = killAngle + (Math.random() - 0.5) * 1.5;
                    deathParts.push({ x: m.x, y: m.y, vx: Math.cos(_dpA) * (2 + Math.random() * 4), vy: Math.sin(_dpA) * (2 + Math.random() * 4) - 2, life: 0.6, color: m.color || '#888', size: 2 + Math.random() * 2 });
                  }
                  /* Skip heavy element/collision death FX — use simple particles above */
                  if (false) {
                  /* v2.3.811: `arch` here resolved to an enclosing-scope binding
                     in the pre-extraction game loop; this block is unreachable
                     dead code (`if (false)`), so declaring it locally with the
                     same archetype expression the live AI uses is byte-equivalent
                     at runtime (never executes) and satisfies no-undef. */
                  var arch = m.archetype || m.type || 'fodder';
                  var _killColl = collisionResult ? collisionResult.collision : null;

                  /* Try element-specific death first */
                  if (_killColl) {
                    /* Collision kill — use the showpiece collision death effect */
                    var collFx = getCollisionDeathFX(m.x, m.y, _killColl.id, killAngle, {
                      fodder: 8,
                      brute: 15,
                      swarm: 6,
                      sentinel: 12,
                      volatile: 9,
                      stalker: 10,
                      hexer: 10
                    }[arch] || 10, killScale);
                    collFx.forEach(function (p) {
                      return deathParts.push(p);
                    });
                    /* Also add element particles for visual richness */
                    if (_killElem) {
                      var elemFx = getElementDeathFX(m.x, m.y, _killElem, killAngle, m.color, {
                        fodder: 8,
                        brute: 15,
                        swarm: 6,
                        sentinel: 12,
                        volatile: 9,
                        stalker: 10,
                        hexer: 10
                      }[arch] || 10, killScale * 0.5);
                      elemFx.particles.forEach(function (p) {
                        return deathParts.push(p);
                      });
                    }
                  } else if (_killElem) {
                    var _elemFx = getElementDeathFX(m.x, m.y, _killElem, killAngle, m.color, {
                      fodder: 8,
                      brute: 15,
                      swarm: 6,
                      sentinel: 12,
                      volatile: 9,
                      stalker: 10,
                      hexer: 10
                    }[arch] || 10, killScale);
                    _elemFx.particles.forEach(function (p) {
                      return deathParts.push(p);
                    });
                  } else {
                    /* No element — generic directional spray */
                    var partCount = Math.round(20 * killScale);
                    for (var dp = 0; dp < partCount; dp++) {
                      var spread = (Math.random() - 0.5) * 1.2;
                      var spd = (2 + Math.random() * 6) * killScale;
                      deathParts.push({
                        x: m.x,
                        y: m.y,
                        vx: Math.cos(killAngle + spread) * spd,
                        vy: Math.sin(killAngle + spread) * spd - Math.random() * 3,
                        life: 1,
                        color: isGrandSlam ? '#f5c542' : m.color,
                        size: (1.5 + Math.random() * 2) * (isGrandSlam ? 1.5 : 1)
                      });
                    }
                  }
                  /* Extra debris for Grand Slam — always present */
                  if (isGrandSlam) {
                    for (var gp = 0; gp < 10; gp++) {
                      deathParts.push({
                        x: m.x,
                        y: m.y,
                        vx: Math.cos(killAngle + (Math.random() - 0.5) * 0.8) * (5 + Math.random() * 8),
                        vy: -3 - Math.random() * 6,
                        life: 1.5,
                        color: ['#f5c542', '#fff', '#fbbf24', '#fde68a'][Math.floor(Math.random() * 4)],
                        size: 2 + Math.random() * 4
                      });
                    }
                  }
                  } /* end if(false) — skip heavy death FX */
                  S.deathExplosions.push({
                    x: m.x,
                    y: m.y,
                    ts: Date.now(),
                    emoji: m.emoji,
                    particles: deathParts,
                    isGrandSlam: isGrandSlam,
                    killScale: killScale,
                    killType: _activeWpn.type === 'staff' ? 'magic' : _activeWpn.type === 'bow' ? 'ranged' : 'melee',
                    killElement: _killElem,
                    killCollision: (_killColl === null || _killColl === void 0 ? void 0 : _killColl.id) || null,
                    weaponType: _activeWpn.type || 'greatsword',
                    killAngle: killAngle,
                    bodyColor: m.color,
                    bodySize: {
                      fodder: 8,
                      brute: 15,
                      swarm: 6,
                      sentinel: 12,
                      volatile: 9,
                      stalker: 10,
                      hexer: 10
                    }[m.archetype || m.type || 'fodder'] || 10,
                    archetype: m.archetype || m.type || 'fodder',
                    stuckArrows: m._stuckArrows || []
                  });

                  /* ═══ GROUND SPLATTER — persistent kill marks ═══ */
                  if (!S.groundSplatter) S.groundSplatter = [];
                  var splatElem = m.element;
                  /* v2.3.2200: non-elemental kills mark the ground in the
                     monster's MATERIAL color (snow leaves snow, slime
                     leaves goo) instead of universal blood red. */
                  var splatCol = splatElem ? ((_ELEMENTS$splatElem = ELEMENTS[splatElem]) === null || _ELEMENTS$splatElem === void 0 ? void 0 : _ELEMENTS$splatElem.color) || '#ff5e6c' : hitMaterialOf(m.archetype || m.type).decal;
                  var splatCount = isGrandSlam ? 5 : 2 + Math.floor(Math.random() * 2);
                  for (var si = 0; si < splatCount; si++) {
                    S.groundSplatter.push({
                      x: m.x + (Math.random() - 0.5) * 24,
                      y: m.y + (Math.random() - 0.5) * 16,
                      color: splatCol,
                      size: 3 + Math.random() * 5 + (isGrandSlam ? 3 : 0),
                      ts: Date.now(),
                      element: splatElem
                    });
                  }
                  /* Cap splatter at 80 marks to prevent memory bloat */
                  if (S.groundSplatter.length > 80) S.groundSplatter.splice(0, S.groundSplatter.length - 80);

                  /* Loot cascade — XP grants on kill, gold rides on the
                     loot drop so the pickup is the only path to coins
                     (matches the bow/staff path at ~9100 and the
                     extracted gameLoop.js single-player path). */
                  var _wrMult = S.rpg._wellRestedUntil && Date.now() < S.rpg._wellRestedUntil ? WELL_RESTED_XP_MULT : 1;
                  var isRare = Math.random() < 0.002; /* 0.2% — 10x scarcer than before */
                  /* Variant XP bonus -- e.g. fireGoblin gives 2x for
                     being tougher to kill (see monsterVariants.xpMult). */
                  var killXp = Math.ceil((isRare ? m.xp * 3 : m.xp) * _wrMult * xpMultFor(m));
                  var killGold = Math.ceil(isRare ? m.gold * 10 : m.gold);
                  _R6.xp += killXp;
                  pushHudPopup(S, { target: 'xpBar', text: '+' + killXp + ' XP', color: '#60a5fa' });
                  var lootCount = isGrandSlam ? 3 : 1;
                  /* One shard roll per kill, attached to the primary pile
                     (li === 0) so grand-slam kills don't compound into
                     multiple shard chances. */
                  var _shardF = rollMonsterShard(S.currentZone);
                  for (var li = 0; li < lootCount; li++) {
                    var lootAngle = killAngle + (Math.random() - 0.5) * 1.0;
                    var lootDist = 15 + Math.random() * 25 * killScale;
                    S.groundLoot.push({
                      x: m.x + Math.cos(lootAngle) * lootDist + (Math.random() - 0.5) * 10,
                      y: m.y + Math.sin(lootAngle) * lootDist + (Math.random() - 0.5) * 10,
                      coins: li === 0 ? killGold : 0,
                      xp: 0,
                      skull: m.type,
                      skullEmoji: '🦴',
                      ts: Date.now() + li * 80,
                      rare: isRare && li === 0,
                      shard: li === 0 ? _shardF : null,
                    });
                  }
                  if (isRare) {
                    pushDmgPopup(S, m.x, m.y - 50, 'RARE DROP!', '#f5c542');
                    BT_AUDIO.collect();
                    setTimeout(function () {
                      return BT_AUDIO.collect();
                    }, 150);
                  }

                  /* §4.6 Weapon drops — extremely rare below Lv100, meaningful at Lv100 */
                  var mLvl = m.level || 1;
                  /* Drop chance itself is much lower at low levels */
                  /* Lv1: 0.05%, Lv50: 0.3%, Lv100: 3% */
                  var lvlFactor = Math.pow(mLvl / 100, 3); /* cubic — Lv50 = 0.125, Lv100 = 1.0 */
                  var dropChance = 0.0005 + lvlFactor * 0.03 + (isGrandSlam ? 0.005 : 0);
                  /* v2.3.1141: weapon drops are SERVER-minted when the
                     worker advertises caps.weaponDrops (they ride the
                     loot pile with drop-time quality).  This local mint
                     stays as the legacy-worker fallback only -- already
                     dead against server-managed zones via the
                     !S._serverMonsters kill gate; the caps check is
                     belt-and-braces per the deploy-order convention. */
                  if (!(S._serverCaps && S._serverCaps.weaponDrops) && Math.random() < dropChance) {
                    var _ZONES$S$currentZone4, _ZONES$S$currentZone5;
                    var _zoneElem = (_ZONES$S$currentZone4 = ZONES[S.currentZone]) === null || _ZONES$S$currentZone4 === void 0 ? void 0 : _ZONES$S$currentZone4.element;
                    var secondaryElem = (_ZONES$S$currentZone5 = ZONES[S.currentZone]) === null || _ZONES$S$currentZone5 === void 0 ? void 0 : _ZONES$S$currentZone5.secondary;
                    var dropTier,
                      dropE1,
                      dropE2,
                      dropName,
                      dropVolatile = false;

                    /* ═══ Level-scaled rarity table — cubic scaling ═══ */
                    /* lvlFactor: Lv1=0.000001, Lv10=0.001, Lv25=0.016, Lv50=0.125, Lv75=0.42, Lv100=1.0 */
                    /* Shift:     Lv1: ~1/5,000,000   Lv50: 1/40,000   Lv100: 1/500 */
                    /* Fusion:    Lv1: ~1/500,000      Lv50: 1/4,000    Lv100: 1/50 */
                    /* Elemental: Lv1: ~1/5,000        Lv50: 1/40       Lv100: 1/4 */
                    var shiftChance = 0.0000002 + lvlFactor * 0.002; /* Lv1: 0.00002%, Lv100: 0.2% */
                    var fusionChance = 0.000002 + lvlFactor * 0.02; /* Lv1: 0.0002%, Lv100: 2% */
                    var elemChance = 0.0002 + lvlFactor * 0.25; /* Lv1: 0.02%, Lv100: 25% */
                    var tierRoll = Math.random();
                    if (tierRoll < shiftChance && _zoneElem) {
                      dropTier = 'shift';
                      dropE1 = _zoneElem;
                      dropE2 = null;
                    } else if (tierRoll < shiftChance + fusionChance && _zoneElem) {
                      dropTier = 'fusion';
                      dropE1 = _zoneElem;
                      dropE2 = secondaryElem || ['flame', 'frost', 'water', 'venom', 'storm', 'stone', 'wind'].filter(function (e) {
                        return e !== _zoneElem;
                      })[Math.floor(Math.random() * 6)];
                      var volPairs = [['flame', 'water'], ['water', 'venom'], ['venom', 'wind'], ['wind', 'stone'], ['stone', 'storm'], ['storm', 'frost'], ['frost', 'flame']];
                      dropVolatile = volPairs.some(function (_ref15) {
                        var _ref16 = _slicedToArray(_ref15, 2),
                          a = _ref16[0],
                          b = _ref16[1];
                        return dropE1 === a && dropE2 === b || dropE1 === b && dropE2 === a;
                      });
                    } else if (tierRoll < shiftChance + fusionChance + elemChance && _zoneElem) {
                      dropTier = 'elemental';
                      dropE1 = _zoneElem;
                      dropE2 = null;
                    } else {
                      dropTier = 'common';
                      dropE1 = null;
                      dropE2 = null;
                    }

                    /* Random weapon type */
                    var dropTypes = ['greatsword', 'sword', 'bow', 'staff'];
                    var dropType = dropTypes[Math.floor(Math.random() * dropTypes.length)];
                    var wpnLabel = WEAPON_TYPES[dropType].label;
                    var tierMult = RARITY_TIERS[dropTier].mult;
                    var tierColor = RARITY_TIERS[dropTier].color;

                    /* Build name */
                    if (dropTier === 'common') dropName = wpnLabel;else if (dropTier === 'elemental') dropName = dropE1.charAt(0).toUpperCase() + dropE1.slice(1) + ' ' + wpnLabel;else if (dropTier === 'fusion') dropName = dropE1.charAt(0).toUpperCase() + dropE1.slice(1) + (dropE2.charAt(0).toUpperCase() + dropE2.slice(1)) + ' ' + wpnLabel;else dropName = 'Prismatic ' + wpnLabel;

                    /* Add to ground loot as weapon drop */
                    var weaponDrop = {
                      x: m.x + (Math.random() - 0.5) * 20,
                      y: m.y + (Math.random() - 0.5) * 20,
                      ts: Date.now(),
                      isWeapon: true,
                      weapon: {
                        type: dropType,
                        tier: dropTier,
                        tierMult: tierMult,
                        element1: dropE1,
                        element2: dropE2,
                        name: dropName,
                        isVolatile: dropVolatile
                      },
                      tierColor: tierColor
                    };
                    S.groundLoot.push(weaponDrop);

                    /* Drop announcement */
                    var tierLabel = RARITY_TIERS[dropTier].label;
                    pushDmgPopup(S, m.x, m.y - 60, tierLabel + ' ' + dropName + '!', tierColor);
                    if (dropTier !== 'common') {
                      BT_AUDIO.collect();
                      if (dropTier === 'fusion' || dropTier === 'shift') setTimeout(function () {
                        return BT_AUDIO.collect();
                      }, 120);
                    }
                  }

                  /* ═══ GEM DROP FROM MONSTER KILL — less efficient than life skills ═══ */
                  /* v2.3.1198: server-rolled under caps.gems (the worker
                     owns gem income now -- server/src/amulet.js
                     _gemRawOnKill rolls in _resolveMonsterKill and the
                     player_state lifeSkills.gems echo fires the popup in
                     wsClient.js).  The local roll stays as the
                     legacy-worker fallback only, else kills would
                     double-award (same shape as the v2.3.1192 nugget
                     gate below). */
                  var killZoneElem = (_ZONES$S$currentZone6 = ZONES[S.currentZone]) === null || _ZONES$S$currentZone6 === void 0 ? void 0 : _ZONES$S$currentZone6.element;
                  if (!(S._serverCaps && S._serverCaps.gems) && killZoneElem && Math.random() < GEM_DROP_RATES.monsterKill) {
                    var _ZONE_RESOURCES$killZ, _ZONE_RESOURCES$killZ2;
                    if (!_R6.lifeSkills) _R6.lifeSkills = createDefaultLifeSkills();
                    if (!_R6.lifeSkills.gems) _R6.lifeSkills.gems = {};
                    var gemKey = 'raw_' + killZoneElem;
                    _R6.lifeSkills.gems[gemKey] = (_R6.lifeSkills.gems[gemKey] || 0) + 1;
                    var gemName = ((_ZONE_RESOURCES$killZ = ZONE_RESOURCES[killZoneElem]) === null || _ZONE_RESOURCES$killZ === void 0 ? void 0 : _ZONE_RESOURCES$killZ.gem) || killZoneElem + ' Gem';
                    var gemCol = ((_ZONE_RESOURCES$killZ2 = ZONE_RESOURCES[killZoneElem]) === null || _ZONE_RESOURCES$killZ2 === void 0 ? void 0 : _ZONE_RESOURCES$killZ2.gemColor) || '#fff';
                    pushDmgPopup(S, m.x, m.y - 65, 'Raw ' + gemName + '!', gemCol);
                  }

                  /* ═══ GOLD NUGGET DROP — rare from monster kills ═══ */
                  /* v2.3.1192: server-rolled under caps.amuletForge (the
                     worker owns the nugget ledger now -- server/src/
                     amulet.js rolls in _resolveMonsterKill and the
                     player_state goldNuggets echo fires the popup in
                     wsClient.js).  The local roll stays as the
                     legacy-worker fallback only, else kills would
                     double-award (same shape as the weaponDrops gate
                     above). */
                  if (!(S._serverCaps && S._serverCaps.amuletForge) && Math.random() < GOLD_NUGGET_DROP.monsterKill) {
                    _R6.goldNuggets = (_R6.goldNuggets || 0) + 1;
                    pushDmgPopup(S, m.x, m.y - 75, 'Gold Nugget!', '#f5c542');
                    BT_AUDIO.beep(1000, 0.08, 0.1, 'sine');
                    setTimeout(function () {
                      return BT_AUDIO.beep(1200, 0.06, 0.08, 'sine');
                    }, 80);
                  }
                  if (isGrandSlam) {
                    pushDmgPopup(S, m.x, m.y - 40, 'Critical hit!', '#fbbf24');
                  }

                  /* Use-trained build progression (GDD §1.1, §1.2, §1.4).
                     killXp = monster XP, distributed across the five T1
                     stats by their relative use-frequency since the last
                     kill (incremented at each combat action via
                     addBuildUse).  Total stat XP per kill = monster XP. */
                  distributeKillXpToBuild(_R6, killXp);
                  /* Melee lifesteal — single-player melee kill path,
                     refund 90% of damage taken from this monster. */
                  applyMeleeLifesteal(S, _R6, m);

                  /* v2.3.910: combat level is DERIVED (set in recalcDerived
                     inside addBuildProg above), so we no longer increment it
                     here.  v2.3.1342: shared celebrateLevelUps — full burst
                     (this melee path used to be chime-only; parity with the
                     loot-pickup celebration was accidental drift). */
                  celebrateLevelUps(S, _R6, { setLevelUpMsg: setLevelUpMsg });
                  setRpgState(_objectSpread({}, _R6));
                  /* v2.3.1356: debounced — the 360° cleave can one-shot a
                     pack, running this kill block N times in one swing;
                     inline full-blob writes stalled the frame (same
                     mechanism as the bow-special freeze).  rpgSave.js. */
                  saveRpgSoon();
                  btRpc('bt_monster_kill', {
                    p_id: getBtPlayerId(),
                    p_monster_type: m.type,
                    p_damage: dmg,
                    p_is_crit: isCrit,
                    p_is_special: !!S._specialAttack
                  }).then(function (sr) {
                    if (sr && sr.rpg) {
                      _R6.level = sr.rpg.level;
                      _R6.xp = sr.rpg.xp;
                      _R6.coins = sr.rpg.coins;
                      _R6.unspentPts = sr.rpg.unspent_pts;
                      setRpgState(_objectSpread({}, _R6));
                    }
                  });
                }
              }
            });
            /* v2.3.1747: the post-swing combo bookkeeping lived here. */
            /* §18 Gathering nodes — now use action button, not swing */
            /* Hit NPCs */
            if (S.npcs) {
              S.npcs.forEach(function (npc) {
                if (!npc.alive || npc._hitThisSwing) return;
                var nDist = Math.sqrt(Math.pow(npc.x - P.x, 2) + Math.pow(npc.y - P.y, 2));
                if (nDist > SWING_RANGE) return;
                var nAngle = Math.atan2(npc.y - P.y, npc.x - P.x);
                var naDiff = nAngle - baseAngle;
                while (naDiff > Math.PI) naDiff -= Math.PI * 2;
                while (naDiff < -Math.PI) naDiff += Math.PI * 2;
                if (Math.abs(naDiff) < SWING_ARC / 2) {
                  npc._hitThisSwing = true;
                  var npcDmg = pDmg;
                  npc.hp -= npcDmg;
                  BT_AUDIO.swordHit({ vol: 0.55 });
                  var nkbA2 = Math.atan2(npc.y - P.y, npc.x - P.x);
                  npc.x += Math.cos(nkbA2) * 4;   /* v2.3.1402: knockback -50% (8 -> 4) */
                  npc.y += Math.sin(nkbA2) * 4;
                  for (var np2 = 0; np2 < 10; np2++) S.hitParticles.push({
                    x: npc.x,
                    y: npc.y,
                    vx: (Math.random() - .5) * 4 + Math.cos(nkbA2) * 2,
                    vy: (Math.random() - .5) * 4 - 1,
                    life: 1,
                    color: ['#cc2233', '#aa1122', '#dd3344'][Math.floor(Math.random() * 3)],
                    size: 1.5 + Math.random() * 2
                  });
                  S.screenShake = 2;
                  var nkbA = Math.atan2(npc.y - P.y, npc.x - P.x);
                  npc.x += Math.cos(nkbA) * 2.5;   /* v2.3.1402: knockback -50% (5 -> 2.5) */
                  npc.y += Math.sin(nkbA) * 2.5;
                  for (var np = 0; np < 8; np++) {
                    S.hitParticles.push({
                      x: npc.x,
                      y: npc.y,
                      vx: (Math.random() - .5) * 4 + Math.cos(nkbA) * 2,
                      vy: (Math.random() - .5) * 4 - 1,
                      life: 1,
                      color: '#cc2233',
                      size: 1.5 + Math.random() * 2
                    });
                  }
                  pushDmgPopup(S, npc.x, npc.y - 20, '' + npcDmg, '#fff');
                  S.screenShake = 2;
                  if (npc.hp <= 0) {
                    npc.alive = false;
                    npc.respawnAt = Date.now() + 10000;
                    BT_AUDIO.deathBoom();
                    S.screenShake = 5;
                    var ndParts = [];
                    for (var dp = 0; dp < 15; dp++) ndParts.push({
                      x: npc.x,
                      y: npc.y,
                      vx: (Math.random() - .5) * 6,
                      vy: (Math.random() - .5) * 6 - 2,
                      life: 1,
                      color: npc.color,
                      size: 2 + Math.random() * 2
                    });
                    S.deathExplosions.push({
                      x: npc.x,
                      y: npc.y,
                      ts: Date.now(),
                      emoji: '💀',
                      particles: ndParts
                    });
                    S.groundLoot.push({
                      x: npc.x,
                      y: npc.y,
                      coins: 5,
                      xp: 0,
                      skull: 'npc',
                      skullEmoji: '🦴',
                      ts: Date.now()
                    });
                    S.rpg.xp += 5;
                    pushHudPopup(S, { target: 'xpBar', text: '+5 XP', color: '#60a5fa' });
                  }
                }
              });
            }

            /* Hit other players (PvP) — §19 broadcast attack event.
               Only broadcast when the swing is INTENTIONALLY aimed at
               another player: either the player has tap-locked onto
               another player, or both are in an active duel.  Without
               this gate, every swing in a non-safe zone propagates as
               a PvP hit to nearby players — so two co-op partners
               killing the same monster in the meadow get tagged as
               PvP, take damage, and spam "Killed by …" messages. */
            if (S.channel) {
              var _ZONES$S$currentZone7;
              var specialMult2 = S._specialAttack ? specialAtkMultFor(_activeWpn.type) : 1; /* v2.3.1397 */
              /* §19 PvP only works outside town and safe zones */
              var inSafeZone = (_ZONES$S$currentZone7 = ZONES[S.currentZone]) === null || _ZONES$S$currentZone7 === void 0 ? void 0 : _ZONES$S$currentZone7.safe;
              var pvpLocked = S.lockedTarget && S.lockedTarget.type === 'player' && S.lockedTarget.ref;
              /* v2.3.1605 (owner: "dueling only works with sword ... this was a
                 duel in town").  This gate was `!inSafeZone && (...)`, and town
                 is safe:true — so during a town duel the client sent NO melee
                 attack at all.  The server has always allowed it: _pvpAllowed
                 permits a consented duel pair anywhere, and its comment says so
                 outright ("Duels still work in town via the pair").  The client
                 was the only thing refusing.
                 A DUEL is consent, so it overrides the zone rule; free-fire
                 still requires a lawless zone AND a deliberate lock-on.  The
                 server gate remains the authority and still fails closed —
                 this only decides what is worth reporting. */
              if (S._inDuel || (!inSafeZone && pvpLocked)) {
                var pvpAngle = pvpLocked ? Math.atan2((S.lockedTarget.ref.y || S.lockedTarget.ref.renderY || P.y) - P.y, (S.lockedTarget.ref.x || S.lockedTarget.ref.renderX || P.x) - P.x) : baseAngle;
                /* Track threat — attacking a player starts the threat counter */
                S._pvpThreat = Date.now() + PVP_THREAT_DURATION;
                if (S.channel) S.channel.send({
                  type: 'broadcast',
                  event: 'player_attack',
                  payload: {
                    id: S.myId,
                    x: P.x,
                    y: P.y,
                    angle: pvpAngle,
                    dmgBase: pDmg * specialMult2,
                    critChance: critChance,
                    /* v2.3.1135: Longshot stretches PvE flight, but PvP
                       reach is hard-capped at the server's 250px clamp
                       (_resolvePvPAttack) — clamp here too so the claimed
                       range matches what the worker will honor. */
                    range: Math.min(250, Math.round((wpnType.range || SWING_RANGE)
                      * (S.rpg && S.rpg.activeSlot === 'ranged' ? bowRangeMult(S.rpg) : 1))),
                    arc: wpnType.arc || SWING_ARC,
                    ts: Date.now(),
                    inDuel: !!S._inDuel,
                    /* v2.3.1302: kind tags the attack for the server's
                       per-kind range clamp.  Old servers ignore it. */
                    kind: 'melee'
                  }
                });
              }
            }
            /* ═══ v2.3.1742: ONLY PAINT A HIT WE ACTUALLY THREW ═══
               Owner: "it looked like my attacks were damaging them."

               This block had NO gate of any kind.  Every swing, in every
               zone, sprayed blood particles, played the sword-hit sound,
               shook the screen and pushed a "HIT" popup over EVERY other
               player inside the arc — teammates included, in town, with no
               duel and no lock.  The damage broadcast a few lines above is
               correctly gated (a duel, or a deliberate tap-lock on that
               player); the picture of the damage was not.  So a co-op pair
               standing shoulder to shoulder saw each other getting hit on
               every swing while nothing was being sent.

               Gated on the SAME condition as the broadcast, and additionally
               on the target actually being the one attacked: free-fire aims
               at a locked player, so painting a hit on a bystander who
               merely stood in the arc was never right either.

               The server is the authority on whether the damage lands
               (_pvpAllowed, which since v2.3.1742 refuses party members);
               this only decides what the attacker is shown. */
            /* Recomputed from S rather than reusing the broadcast block's
               `pvpLocked` / `inSafeZone`: those are `var`s declared inside an
               `if (S.channel)` above, so they are merely HOISTED here and
               read undefined whenever that block did not run.  Mirroring the
               same expression locally keeps the picture and the packet on one
               rule without depending on which branch executed. */
            var _pvpLockRef = S.lockedTarget && S.lockedTarget.type === 'player' && S.lockedTarget.ref;
            var _pvpSafe = (ZONES[S.currentZone] || {}).safe;
            var _pvpPaintOk = !!(S._inDuel || (!_pvpSafe && _pvpLockRef));
            var _pvpPaintId = _pvpLockRef ? String(S.lockedTarget.id) : null;
            Object.entries(S.others).forEach(function (_ref17) {
              var _ref18 = _slicedToArray(_ref17, 2),
                pid = _ref18[0],
                o = _ref18[1];
              if (!_pvpPaintOk) return;
              if (_pvpPaintId && String(pid) !== _pvpPaintId) return;
              if (o._hitThisSwing) return;
              var oDist = Math.sqrt(Math.pow(o.x - P.x, 2) + Math.pow(o.y - P.y, 2));
              if (oDist > SWING_RANGE) return;
              var oAngle = Math.atan2(o.y - P.y, o.x - P.x);
              var aDiff = oAngle - baseAngle;
              while (aDiff > Math.PI) aDiff -= Math.PI * 2;
              while (aDiff < -Math.PI) aDiff += Math.PI * 2;
              if (Math.abs(aDiff) < SWING_ARC / 2) {
                o._hitThisSwing = true;
                BT_AUDIO.swordHit({ vol: 0.55 });
                var pvpKbA = Math.atan2(o.y - P.y, o.x - P.x);
                for (var _pp = 0; _pp < 12; _pp++) S.hitParticles.push({
                  x: o.x + (Math.random() - .5) * 6,
                  y: o.y + (Math.random() - .5) * 6,
                  vx: Math.cos(pvpKbA + (Math.random() - .5) * 1.5) * (1 + Math.random() * 3),
                  vy: Math.sin(pvpKbA + (Math.random() - .5) * 1.5) * (1 + Math.random() * 3) - 1,
                  life: 1,
                  color: ['#cc2233', '#aa1122'][Math.floor(Math.random() * 2)],
                  size: 1.5 + Math.random() * 2
                });
                S.screenShake = 3;
                pushDmgPopup(S, o.x, o.y - 20, 'HIT', '#fff');
              }
            });
          }
          if (Date.now() - S.swingTimer > 450) {
            S.isSwinging = false;
            S.monsters.forEach(function (m) {
              m._hitThisSwing = false;
            });
            if (S.npcs) S.npcs.forEach(function (n) {
              n._hitThisSwing = false;
            });
            Object.values(S.others).forEach(function (o) {
              o._hitThisSwing = false;
            });
          }

          /* Save RPG state periodically */
          if (!S._rpgSaveTimer) S._rpgSaveTimer = 0;
          S._rpgSaveTimer++;
          if (S._rpgSaveTimer % 180 === 0) {
            try {
              localStorage.setItem('bt_rpg', JSON.stringify(_R6));
            } catch (e) {}
            syncRpgToServer(_R6);
          }
        }
}
