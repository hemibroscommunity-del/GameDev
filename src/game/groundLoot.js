/* ═══ GROUND-LOOT PICKUP — magnetism, claim/pickup, sparkle + level-up burst ═══ */
/* v2.3.812: moved verbatim from the game loop in src/ui/BroTown.jsx
   (REBUILD-PLAN Phase 8, slice 4; behavior-frozen). Runs once per frame
   after the monster-combat pass. The whole `if (S.groundLoot)` body: the
   `S.groundLoot.filter(loot => ...)` that expires stale piles, applies
   loot magnetism, gates multiplayer recipient claims, awards coins/xp/
   items/shards on pickup, fires the pickup sparkle + level-up burst, and
   keeps piles visible through the post-pickup despawn delay.
   Captures (depth-aware scope scan; build can't run in this env): `P` is
   the player; `pixiRef`, `setRpgState`, `setLevelUpMsg` arrive via deps;
   everything else is a module import below. S is stateRef.current. */
import { BT_AUDIO, WEAPON_STASH_MAX, WEAPON_TYPES, ZONES, meetsStatReq, recalcDerived } from '@/data/index.js';
import { isRemnantSkull } from '@/data/monsterVariants.js';
import { shardByKey } from '@/data/shards.js';
import { syncRpgToServer } from '@/networking/index.js';
import { pushHudPopup } from '@/ui/XpFlyOverlay.jsx';
import { _objectSpread } from '@/lib/babelHelpers.js';

export function updateGroundLootPickup(S, deps) {
  var P = S.player;
  var pixiRef = deps.pixiRef,
    setRpgState = deps.setRpgState,
    setLevelUpMsg = deps.setLevelUpMsg;
        /* Pick up ground loot — walk over it */
        if (S.groundLoot) {
          S.groundLoot = S.groundLoot.filter(function (loot) {
            /* Expire after 60 seconds (death drops use their own expiry
               timer; fodder slime + variant remnants persist forever
               until picked up — pickup-only inventory item, players
               shouldn't lose them to a 60 s clock). */
            if (loot.isDeathDrop && loot.expiry && Date.now() > loot.expiry) return false;
            if (loot._expired) return false;
            /* v2.3.189: post-pickup despawn delay -- pile remains visible
               for 0.75 s after the pickup fires so the player's pickup
               animation has time to play before the pile pops out. */
            if (loot._collected && loot._despawnAt && Date.now() > loot._despawnAt) {
              try { if (pixiRef.current && pixiRef.current.disposeLootRef) pixiRef.current.disposeLootRef(loot); } catch (_e) {}
              return false;
            }
            if (!loot.isDeathDrop && !isRemnantSkull(loot.skull) && Date.now() - loot.ts > 60000) return false;
            /* v2.3.189: pickup origin 15 px above the player center so the
               trigger zone reads as "around the body" instead of "at the
               feet" (user said the area felt 15 px too low). */
            var _pickupOriginY = P.y - 15;
            var lDist = Math.sqrt(Math.pow(P.x - loot.x, 2) + Math.pow(_pickupOriginY - loot.y, 2));

            /* v2.3.254: skip magnetism only for the variants with the
               same-frame splat-vacuum risk (raw slime fodder + fireGoblin).
               v2.3.253 tried isFodderLike here but that also matches
               mummy / skeleton (both baseArchetype: 'fodder'), so the
               intended pull-in for mummy-area coins never actually
               restored -- user still had to walk within 20 px exactly.
               isRemnantSkull is still used for the 100 ms render-delay
               gate below so all splat/drop animations get to play. */
            var _isFodder = loot.skull === 'fodder' || loot.skull === 'fireGoblin';
            var _isRemnant = isRemnantSkull(loot.skull);
            /* MP: only magnetize loot the player can actually pick up.
               Previously every pile within 50 px got pulled toward the
               player, then sat stuck at ~20 px because the recipient
               gate below blocked pickup -- looked like own-coin pickup
               was broken (v2.3.136 bug report). */
            /* Death drops: owner-only until ownerOnlyUntil, then anyone
               in zone may claim until expiry.  Flip the recipient check
               to true once the free-for-all window opens so non-owners
               get magnetism + skip the bounce-back. */
            var _deathFFA = loot.isDeathDrop && loot.ownerOnlyUntil && Date.now() > loot.ownerOnlyUntil;
            var _amPileRecipient = _deathFFA || !loot.recipients || loot.recipients.includes(S.myId);
            /* ═══ LOOT MAGNETISM — pull toward player when close ═══ */
            var magnetRange = 50;
            if (!_isFodder && _amPileRecipient && !loot._collected && lDist < magnetRange && lDist > 20) {
              var pullStrength = (1 - lDist / magnetRange) * 3;
              var pullAngle = Math.atan2(P.y - loot.y, P.x - loot.x);
              loot.x += Math.cos(pullAngle) * pullStrength;
              loot.y += Math.sin(pullAngle) * pullStrength;
            }
            /* Pickup gate matches the render delay (0.1 s) so the
               splat is on-screen and visible before it can be picked
               up — otherwise the player walks over the spot during the
               death anim and the invisible loot vanishes silently.
               Kept on the full remnant set since mummy / skeleton drop
               animations should also play before pickup. */
            if (_isRemnant && Date.now() - (loot.ts || 0) < 100) return true;
            /* Safe zones never legitimately have loot piles -- if a
               stale pile leaked through (cross-zone server snapshot),
               drop it silently rather than beeping at the player every
               time they walk past (v2.3.136 town-loot bug report). */
            var _curZoneCfgPK = ZONES[S.currentZone];
            if (_curZoneCfgPK && _curZoneCfgPK.safe) return false;
            /* Multiplayer recipient gate: monster_kill loot piles carry a
               `recipients` list of player ids who can claim the drop.
               Non-recipients walk over without picking up; the pile stays
               on screen so the rightful owner can come grab it.  Plays a
               soft "not yours" beep once per pile per player. */
            if (lDist < 20 && !_deathFFA && loot.recipients && !loot.recipients.includes(S.myId)) {
              if (!loot._notYoursBeeped) {
                loot._notYoursBeeped = true;
                try { BT_AUDIO.beep(220, 0.04, 0.05, 'sine'); } catch (e) {}
              }
              return true;
            }
            /* Server-authoritative loot: when a recipient walks into a
               worker-owned pile, send a loot_pickup request and wait
               for the server's loot_credit reply (which both grants
               the share and despawns the pile locally via
               _applyLootCredit).  Keep the pile visible until then so
               there's no ghost-state if the request fails. */
            if (lDist < 20 && loot._serverLoot && loot.lootId) {
              /* Watchdog: if the server never replied with loot_credit
                 (network drop, bot rejection, etc.), the pile would sit
                 forever with _pickupPending=true. After 5 s clear the
                 flag so the next within-range tick can re-send. */
              if (loot._pickupPending && loot._pickupSentAt && Date.now() - loot._pickupSentAt > 5000) {
                loot._pickupPending = false;
              }
              if (!loot._pickupPending) {
                loot._pickupPending = true;
                loot._pickupSentAt = Date.now();
                if (S.channel) {
                  try { S.channel.send({ type: 'loot_pickup', payload: { lootId: loot.lootId, zone: S.currentZone } }); } catch (e) {}
                }
              }
              return true;
            }
            if (lDist < 20 && !loot._collected) {
              /* Pickup freeze — 0.5s lock + face camera, immersion + lets pet vacuum nearby loot */
              S._lootFreezeUntil = Date.now() + 500;
              P.dir = 'down';
              /* §4.6 Weapon drop pickup — equip if better, stash otherwise */
              if (loot.isWeapon && loot.weapon) {
                var _WEAPON_TYPES$drop$ty2, _WEAPON_TYPES2;
                var drop = loot.weapon;
                var wpnDef = WEAPON_TYPES[drop.type];
                var isRanged = wpnDef.type === 'ranged';
                var current = isRanged ? S.rpg.rangedWeapon : S.rpg.weapon;
                var dropPower = drop.tierMult * (((_WEAPON_TYPES$drop$ty2 = WEAPON_TYPES[drop.type]) === null || _WEAPON_TYPES$drop$ty2 === void 0 ? void 0 : _WEAPON_TYPES$drop$ty2.base) || 30);
                var curPower = ((current === null || current === void 0 ? void 0 : current.tierMult) || 1) * (((_WEAPON_TYPES2 = WEAPON_TYPES[(current === null || current === void 0 ? void 0 : current.type) || 'greatsword']) === null || _WEAPON_TYPES2 === void 0 ? void 0 : _WEAPON_TYPES2.base) || 30);
                var canEquipDrop = meetsStatReq(S.rpg, drop, drop.type);
                if (dropPower >= curPower && canEquipDrop) {
                  /* Better weapon — equip and stash the old one */
                  if (current && current.name) {
                    if (!S.rpg.weaponStash) S.rpg.weaponStash = [];
                    if (S.rpg.weaponStash.length < WEAPON_STASH_MAX) S.rpg.weaponStash.push(_objectSpread({}, current));else {
                      var _WEAPON_TYPES$sold$ty;
                      /* Stash full — auto-sell the oldest stashed weapon */
                      var sold = S.rpg.weaponStash.shift();
                      var sv = Math.ceil((sold.tierMult || 1) * (((_WEAPON_TYPES$sold$ty = WEAPON_TYPES[sold.type]) === null || _WEAPON_TYPES$sold$ty === void 0 ? void 0 : _WEAPON_TYPES$sold$ty.base) || 30) * 0.5);
                      S.rpg.coins += sv;
                    }
                  }
                  if (isRanged) S.rpg.rangedWeapon = drop;else S.rpg.weapon = drop;
                  S.dmgNumbers.push({
                    x: loot.x,
                    y: loot.y - 20,
                    text: 'EQUIPPED: ' + drop.name,
                    color: loot.tierColor || '#fff',
                    ts: Date.now()
                  });
                  BT_AUDIO.collect();
                  if (drop.tier === 'fusion' || drop.tier === 'shift') {
                    BT_AUDIO.beep(523, 0.1, 0.08, 'sine');
                    setTimeout(function () {
                      return BT_AUDIO.beep(659, 0.1, 0.08, 'sine');
                    }, 100);
                    setTimeout(function () {
                      return BT_AUDIO.beep(784, 0.15, 0.1, 'sine');
                    }, 200);
                  }
                } else {
                  /* Weaker drop — stash it for later comparison */
                  if (!S.rpg.weaponStash) S.rpg.weaponStash = [];
                  if (S.rpg.weaponStash.length < WEAPON_STASH_MAX) {
                    S.rpg.weaponStash.push(drop);
                    S.dmgNumbers.push({
                      x: loot.x,
                      y: loot.y - 20,
                      text: 'STASHED: ' + drop.name,
                      color: '#8890b8',
                      ts: Date.now()
                    });
                  } else {
                    /* Stash full — auto-sell */
                    var sellValue = Math.ceil(dropPower * 0.5);
                    S.rpg.coins += sellValue;
                    if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += sellValue;
                    S.dmgNumbers.push({
                      x: loot.x,
                      y: loot.y - 20,
                      text: '+' + sellValue + 'G (sold)',
                      color: '#f5c542',
                      ts: Date.now()
                    });
                  }
                  BT_AUDIO.beep(400, 0.05, 0.08, 'sine');
                }
                setRpgState(_objectSpread({}, S.rpg));
                try {
                  localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
                } catch (e) {}
                /* v2.3.189: mark for delayed despawn instead of
                   immediate dispose; the top-of-filter check fires
                   the dispose after 0.75 s so the pickup animation
                   has time to play. */
                loot._collected = true;
                loot._despawnAt = Date.now() + 500;
                return true;
              }

              /* §5.5 Death drop recovery — pick up scattered inventory items */
              if (loot.isDeathDrop && loot.deathItems) {
                if (!S.rpg.inventory) S.rpg.inventory = {};
                var recoveredCount = 0;
                loot.deathItems.forEach(function (item) {
                  S.rpg.inventory[item.key] = (S.rpg.inventory[item.key] || 0) + item.qty;
                  recoveredCount += item.qty;
                });
                S.dmgNumbers.push({
                  x: loot.x,
                  y: loot.y - 20,
                  text: 'RECOVERED ' + recoveredCount + ' items!',
                  color: '#3dd497',
                  ts: Date.now()
                });
                if (!S.rpg._questFlags) S.rpg._questFlags = {};
                S.rpg._questFlags.recoveredDeathDrop = true;
                BT_AUDIO.collect();
                BT_AUDIO.beep(523, 0.08, 0.08, 'sine');
                setTimeout(function () {
                  return BT_AUDIO.beep(659, 0.08, 0.08, 'sine');
                }, 80);
                setTimeout(function () {
                  return BT_AUDIO.beep(784, 0.1, 0.1, 'sine');
                }, 160);
                setRpgState(_objectSpread({}, S.rpg));
                try {
                  localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
                } catch (e) {}
                /* v2.3.189: mark for delayed despawn instead of
                   immediate dispose; the top-of-filter check fires
                   the dispose after 0.75 s so the pickup animation
                   has time to play. */
                loot._collected = true;
                loot._despawnAt = Date.now() + 500;
                return true;
              }

              /* Legacy local-pickup path -- runs for dungeons / SP /
                 any zone the worker doesn't model.  Server-authoritative
                 piles bail above via the loot_pickup request path and
                 never reach here.  No cross-client broadcast needed
                 (no other contributors share this drop without the
                 server). */
              S.rpg.coins += loot.coins || 0;
              if (loot.coins && S.rpg._compStats) S.rpg._compStats.totalGoldEarned += loot.coins;
              syncRpgToServer(S.rpg);
              if (loot.skull && S.rpg.inventory) {
                var _invKey =
                  loot.skull === 'fodder'     ? 'slime-remnants' :
                  loot.skull === 'fireGoblin' ? 'fire-goblin-remnants' :
                  loot.skull === 'skeleton'   ? 'skeleton-remnants' :
                  loot.skull === 'mummy'      ? 'skeleton-remnants' :
                  loot.skull;
                S.rpg.inventory[_invKey] = (S.rpg.inventory[_invKey] || 0) + 1;
              }
              if (loot.shard && S.rpg.inventory) {
                S.rpg.inventory[loot.shard] = (S.rpg.inventory[loot.shard] || 0) + 1;
                var _pickedShard = shardByKey(loot.shard);
                S.dmgNumbers.push({
                  x: loot.x + 12, y: loot.y - 22,
                  text: '+ ' + (_pickedShard ? _pickedShard.label : 'Shard'),
                  color: (_pickedShard && _pickedShard.color) || '#cce6ff',
                  ts: Date.now()
                });
              }
              if (loot.skull) {
                if (!S.rpg.skulls) S.rpg.skulls = {};
                S.rpg.skulls[loot.skull] = (S.rpg.skulls[loot.skull] || 0) + 1;
              }
              if (loot.coins) pushHudPopup(S, { target: 'goldIcon', text: '+' + loot.coins + ' G', color: '#f5c542' });
              BT_AUDIO.beep(500, 0.06, 0.1, 'sine');
              /* ═══ LOOT PICKUP SPARKLE — gold/blue particles burst upward ═══ */
              for (var lsp = 0; lsp < 8; lsp++) {
                var lspA = lsp / 8 * Math.PI * 2;
                S.hitParticles.push({
                  x: loot.x,
                  y: loot.y,
                  vx: Math.cos(lspA) * (1 + Math.random() * 2),
                  vy: -1.5 - Math.random() * 3,
                  life: 0.6,
                  color: lsp % 2 === 0 ? '#f5c542' : '#60a5fa',
                  size: 1.5 + Math.random()
                });
              }
              /* Check level up — §6.2 tri-phase.  T1 is use-trained
                 via addBuildProg() at combat callsites; T2 still
                 allocated via the Stats menu (5 points per level).
                 A1 gate: requires 5 build points earned since last level. */
              while ((S.rpg._buildPointsThisLvl || 0) >= 5) {
                S.rpg._buildPointsThisLvl -= 5;
                S.rpg.level++;
                S.rpg.unspentT2 = 0; /* T2 retired — weapon points now come from per-category weapon-skill levels */
                recalcDerived(S.rpg);
                S.rpg.hp = S.rpg.maxHp;
                S.rpg.stamina = S.rpg.maxStamina;
                S.rpg.mana = S.rpg.maxMana;
                setLevelUpMsg({
                  kind: 'combat',
                  level: S.rpg.level,
                  ts: Date.now()
                });
                BT_AUDIO.collect();
                /* ═══ LEVEL UP BURST — celebratory particle explosion ═══ */
                S.screenShake = 8;
                S._levelUpFlash = Date.now();
                for (var lp = 0; lp < 40; lp++) {
                  var lpAngle = lp / 40 * Math.PI * 2;
                  var lpSpd = 3 + Math.random() * 5;
                  S.hitParticles.push({
                    x: P.x,
                    y: P.y,
                    vx: Math.cos(lpAngle) * lpSpd,
                    vy: Math.sin(lpAngle) * lpSpd - 2,
                    life: 1.2,
                    color: ['#f5c542', '#fbbf24', '#60a5fa', '#3dd497', '#a78bfa', '#fff'][Math.floor(Math.random() * 6)],
                    size: 2 + Math.random() * 3
                  });
                }
                /* Rising level text */
                S.dmgNumbers.push({
                  x: P.x,
                  y: P.y - 50,
                  text: 'LEVEL ' + S.rpg.level + '!',
                  color: '#f5c542',
                  ts: Date.now()
                });
                S.dmgNumbers.push({
                  x: P.x,
                  y: P.y - 35,
                  text: 'HP/MANA RESTORED',
                  color: '#3dd497',
                  ts: Date.now()
                });
                /* Ascending chime */
                BT_AUDIO.beep(523, 0.1, 0.08, 'sine');
                setTimeout(function () {
                  return BT_AUDIO.beep(659, 0.08, 0.06, 'sine');
                }, 100);
                setTimeout(function () {
                  return BT_AUDIO.beep(784, 0.08, 0.06, 'sine');
                }, 200);
                setTimeout(function () {
                  return BT_AUDIO.beep(1047, 0.12, 0.1, 'sine');
                }, 300);
              }
              setRpgState(_objectSpread({}, S.rpg));
              try {
                localStorage.setItem('bt_rpg', JSON.stringify(S.rpg));
              } catch (e) {}
              /* v2.3.138: explicit Pixi dispose for the picked-up pile.
                 The orphan sweep would catch this next frame, but
                 intermittently the coin sprite was sticking on the
                 ground after the gold was credited (user-reported on
                 desert-winds mummy drops). Direct ref-dispose closes
                 that race regardless of whether the pile has a lootId. */
              /* v2.3.189: delayed despawn; see top-of-filter dispose. */
              loot._collected = true;
              loot._despawnAt = Date.now() + 500;
              return true; /* keep visible for 0.75 s after pickup */
            }
            return true;
          });
        }
}
