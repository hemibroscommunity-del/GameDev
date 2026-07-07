/* ═══ ZONE MECHANICS — per-zone game-loop systems ═══ */
/* v2.3.809: moved verbatim from the game loop in src/ui/BroTown.jsx
   (REBUILD-PLAN Phase 8, first game-loop slice; behavior-frozen). Runs
   once per frame after the zone-transition call. Contains:
   - FROZEN SHORE: snowball projectiles, snowman decoy, sled ride —
     dormant in live play: the action UI that populates S._snowballs /
     S._snowmen / S._sled is disabled (see the "FROZEN SHORE actions"
     note in BroTown's JSX);
   - TIDAL CAVES: tide oscillation + swimming + §DIVE air/drowning/
     treasure — LIVE (driven by zone + water tiles, no UI needed);
   - DEEP HOLLOWS: torch burnout timer (torch UI dormant) and the echo
     aggro flag — the flag side is LIVE (set from autoAttack, read by
     monster aggro).
   ptx/pty are the player tile computed pre-transition in BroTown (the
   tide water check historically reads those values — preserved).
   Dormant-code note on `R` below: in the pre-module build `R` was a
   global alias for the player rpg object; after modularization it became
   an undeclared identifier, so the two dormant damage formulas that read
   `R.power` (snowball hit, sled hit) would have thrown a ReferenceError
   if the disabled UI were ever re-enabled. The `var R;` declaration
   keeps them on their intended `|| 0` fallback path instead — zero
   effect on live play, and flagged in the PR for the owner's
   revive-or-remove decision on frozen-shore actions. */
import { ZONES, BT_AUDIO, SNOWBALL_DMG_BASE, SNOWBALL_STUN_MS, SNOWMAN_DURATION, SNOWMAN_AGGRO_RADIUS, SLED_DURATION, TIDE_CYCLE_MS, DIVE_MAX_AIR, DIVE_AIR_DRAIN, DIVE_AIR_REFILL, DIVE_DAMAGE_RATE, DIVE_TREASURE_CHANCE, TORCH_DURATION } from '@/data/index.js';
import { _createForOfIteratorHelper } from '@/lib/babelHelpers.js';

export function updateZoneMechanics(S, ptx, pty) {
  var P = S.player;
  var R; /* see header — dormant-code guard, intentionally undefined */
  var _ZONES$S$currentZone3; /* transpiler temp, was hoisted in BroTown */
        /* ═══ ZONE-SPECIFIC MECHANICS ═══ */
        var zoneElem2 = (_ZONES$S$currentZone3 = ZONES[S.currentZone]) === null || _ZONES$S$currentZone3 === void 0 ? void 0 : _ZONES$S$currentZone3.element;

        /* ── FROZEN SHORE: Snowball projectiles ── */
        if (S._snowballs && S._snowballs.length > 0) {
          S._snowballs = S._snowballs.filter(function (sb) {
            sb.x += sb.vx;
            sb.y += sb.vy;
            var age = Date.now() - sb.ts;
            if (age > 2000) return false; /* despawn after 2s */
            /* Hit detection against monsters */
            if (S.monsters) {
              var _iterator = _createForOfIteratorHelper(S.monsters),
                _step;
              try {
                for (_iterator.s(); !(_step = _iterator.n()).done;) {
                  var _m = _step.value;
                  if (!_m.alive) continue;
                  var d = Math.sqrt(Math.pow(sb.x - _m.x, 2) + Math.pow(sb.y - _m.y, 2));
                  if (d < 20) {
                    var _R4;
                    if (_m._invulnerable) {
                      S.dmgNumbers.push({
                        x: _m.x,
                        y: _m.y - 20,
                        text: 'IMMUNE',
                        color: '#888',
                        ts: Date.now()
                      });
                      return false;
                    }
                    var dmg = SNOWBALL_DMG_BASE + (((_R4 = R) === null || _R4 === void 0 ? void 0 : _R4.power) || 0) * 0.3;
                    _m.curHp -= dmg;
                    _m._stunUntil = Date.now() + SNOWBALL_STUN_MS;
                    S.dmgNumbers.push({
                      x: _m.x,
                      y: _m.y - 20,
                      text: String(Math.round(dmg)),
                      color: '#a0d8f0',
                      ts: Date.now()
                    });
                    S.hitParticles.push({
                      x: sb.x,
                      y: sb.y,
                      vx: 0,
                      vy: -2,
                      life: 0.5,
                      color: '#fff',
                      size: 3
                    });
                    for (var sp = 0; sp < 6; sp++) S.hitParticles.push({
                      x: sb.x,
                      y: sb.y,
                      vx: (Math.random() - .5) * 4,
                      vy: (Math.random() - .5) * 4,
                      life: 0.4,
                      color: '#cce8ff',
                      size: 1.5
                    });
                    BT_AUDIO.beep(800, 0.04, 0.06, 'sine');
                    return false;
                  }
                }
              } catch (err) {
                _iterator.e(err);
              } finally {
                _iterator.f();
              }
            }
            return true;
          });
        }

        /* ── FROZEN SHORE: Snowman decoy — draws aggro ── */
        if (S._snowmen && S._snowmen.length > 0) {
          S._snowmen = S._snowmen.filter(function (sm) {
            if (Date.now() - sm.ts > SNOWMAN_DURATION) return false;
            if (sm.hp <= 0) {
              S.dmgNumbers.push({
                x: sm.x,
                y: sm.y - 20,
                text: 'Melted!',
                color: '#a0d8f0',
                ts: Date.now()
              });
              for (var sp = 0; sp < 10; sp++) S.hitParticles.push({
                x: sm.x,
                y: sm.y,
                vx: (Math.random() - .5) * 4,
                vy: -1 - Math.random() * 3,
                life: 0.6,
                color: '#fff',
                size: 2
              });
              return false;
            }
            /* Snowman draws aggro — monsters within radius target it instead of player */
            if (S.monsters) {
              S.monsters.forEach(function (m) {
                if (!m.alive) return;
                var d = Math.sqrt(Math.pow(sm.x - m.x, 2) + Math.pow(sm.y - m.y, 2));
                if (d < SNOWMAN_AGGRO_RADIUS && d < Math.sqrt(Math.pow(P.x - m.x, 2) + Math.pow(P.y - m.y, 2))) {
                  /* Monster targets snowman instead */
                  var _dx21 = sm.x - m.x,
                    _dy20 = sm.y - m.y,
                    dist = Math.sqrt(_dx21 * _dx21 + _dy20 * _dy20) || 1;
                  m.x += _dx21 / dist * m.spd * 0.5;
                  m.y += _dy20 / dist * m.spd * 0.5;
                  if (d < 18) {
                    sm.hp -= m.dmg * 0.5;
                    m._atkCd = Date.now();
                  }
                }
              });
            }
            return true;
          });
        }

        /* ── FROZEN SHORE: Sled ride — fast movement in direction ── */
        if (S._sled && S.currentZone === 'frost') {
          var sledElapsed = Date.now() - S._sled.started;
          if (sledElapsed < SLED_DURATION) {
            P.x += Math.cos(S._sled.angle) * S._sled.speed;
            P.y += Math.sin(S._sled.angle) * S._sled.speed;
            /* Sled hits monsters for damage */
            if (S.monsters) {
              S.monsters.forEach(function (m) {
                if (!m.alive) return;
                var d = Math.sqrt(Math.pow(P.x - m.x, 2) + Math.pow(P.y - m.y, 2));
                if (d < 25 && !m._sledHit) {
                  var _R5;
                  m._sledHit = true;
                  var sledDmg = Math.ceil(20 + (((_R5 = R) === null || _R5 === void 0 ? void 0 : _R5.power) || 0) * 0.5);
                  m.curHp -= sledDmg;
                  S.dmgNumbers.push({
                    x: m.x,
                    y: m.y - 20,
                    text: 'SLED ' + sledDmg,
                    color: '#60a5fa',
                    ts: Date.now()
                  });
                  S.screenShake = 3;
                  BT_AUDIO.beep(300, 0.08, 0.1, 'triangle');
                }
              });
            }
            /* Trail particles */
            S.hitParticles.push({
              x: P.x - Math.cos(S._sled.angle) * 10,
              y: P.y - Math.sin(S._sled.angle) * 10,
              vx: (Math.random() - .5) * 2,
              vy: -1,
              life: 0.3,
              color: '#cce8ff',
              size: 2
            });
          } else {
            S._sled = null;
            S.dmgNumbers.push({
              x: P.x,
              y: P.y - 30,
              text: 'Sled stopped',
              color: '#a0d8f0',
              ts: Date.now()
            });
            /* Clear sled hit flags */
            if (S.monsters) S.monsters.forEach(function (m) {
              m._sledHit = false;
            });
          }
        }

        /* ── TIDAL CAVES: Tide level oscillation ── */
        if (S.currentZone === 'tidal') {
          var _S$map$pty4;
          var tidePhase = Date.now() % TIDE_CYCLE_MS / TIDE_CYCLE_MS; /* 0-1 */
          S._tideLevel = Math.sin(tidePhase * Math.PI * 2) * 0.5 + 0.5; /* 0=low, 1=high */
          /* At high tide, water tiles expand — check if player is in water */
          var onWater = S.map && ((_S$map$pty4 = S.map[pty]) === null || _S$map$pty4 === void 0 ? void 0 : _S$map$pty4[ptx]) === 2;
          if (onWater && !S._raft) {
            /* Swimming — slow movement */
            S._swimming = true;

            /* §DIVE — Underwater diving with air meter */
            if (S._diveAir === undefined) S._diveAir = DIVE_MAX_AIR;
            S._diveAir = Math.max(0, S._diveAir - DIVE_AIR_DRAIN);

            /* Drowning damage when out of air */
            if (S._diveAir <= 0 && S.rpg) {
              if (!S._lastDrownTick || Date.now() - S._lastDrownTick > 1000) {
                S._lastDrownTick = Date.now();
                S.rpg.hp -= DIVE_DAMAGE_RATE;
                /* v2.3.1175: floor at 1 HP when the worker owns monsters.
                   Drowning is client-local damage the server never sees, so
                   a drowning death here fired NO death flow: the BroTown
                   catch-all is gated on !S._serverMonsters and the server
                   never emits player_died (its HP view never changed) --
                   the player sat input-locked at 0 HP until a full reload.
                   The server can't own a death it can't see, so drowning
                   pins you at 1 HP instead of killing you in server zones.
                   Client-local zones keep the real death (catch-all runs). */
                if (S._serverMonsters && S.rpg.hp < 1) S.rpg.hp = 1;
                if (window.__dmgLog) try { console.log('[dmg] drowning', DIVE_DAMAGE_RATE); } catch (e) {}
                S.dmgNumbers.push({
                  x: P.x,
                  y: P.y - 20,
                  text: '-' + DIVE_DAMAGE_RATE + ' (drowning!)',
                  color: '#3498DB',
                  ts: Date.now()
                });
                if (S.rpg.hp <= 0) {
                  S.rpg.hp = 0;
                  S.dmgNumbers.push({
                    x: P.x,
                    y: P.y - 40,
                    text: 'Drowned!',
                    color: '#ff5e6c',
                    ts: Date.now()
                  });
                }
              }
            }

            /* Underwater treasure discovery */
            if (S._diveAir > 0 && Math.random() < DIVE_TREASURE_CHANCE) {
              var treasureGold = 10 + Math.floor(Math.random() * 40);
              S.rpg.coins += treasureGold;
              if (S.rpg._compStats) S.rpg._compStats.totalGoldEarned += treasureGold;
              S.dmgNumbers.push({
                x: P.x + Math.random() * 30 - 15,
                y: P.y - 30,
                text: '+' + treasureGold + 'G treasure!',
                color: '#f5c542',
                ts: Date.now()
              });
              BT_AUDIO.collect();
              if (!S.stats._diveTreasures) S.stats._diveTreasures = 0;
              S.stats._diveTreasures++;
            }

            /* Track dive stats */
            if (!S.stats._diveCount) S.stats._diveCount = 0;
            if (!S._diveStarted) {
              S._diveStarted = true;
              S.stats._diveCount++;
            }
          } else {
            S._swimming = false;
            S._diveStarted = false;
            /* Refill air at surface */
            if (S._diveAir !== undefined && S._diveAir < DIVE_MAX_AIR) {
              S._diveAir = Math.min(DIVE_MAX_AIR, S._diveAir + DIVE_AIR_REFILL);
            }
          }
        } else {
          S._tideLevel = 0;
          S._swimming = false;
          S._diveAir = DIVE_MAX_AIR;
        }

        /* ── DEEP HOLLOWS: Torch timer ── */
        if (S._torch && Date.now() - S._torch.started > TORCH_DURATION) {
          S._torch = null;
          S.dmgNumbers.push({
            x: P.x,
            y: P.y - 30,
            text: 'Torch burned out!',
            color: '#ea580c',
            ts: Date.now()
          });
          BT_AUDIO.beep(200, 0.08, 0.1, 'triangle');
        }

        /* ── DEEP HOLLOWS: Echo mechanic — combat noise increases aggro range ── */
        if (S.currentZone === 'hollows' && S.autoAttack) {
          S._echoActive = true; /* flag checked in monster aggro */
        } else {
          S._echoActive = false;
        }
}
