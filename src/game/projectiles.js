/* ═══ PROJECTILES — arrow + slime projectile simulation ═══ */
/* v2.3.813: moved verbatim from the game loop in src/ui/BroTown.jsx
   (REBUILD-PLAN Phase 8, slice 5; behavior-frozen). Two adjacent
   per-frame blocks:
   - updateArrows: the `if (S.arrows...)` filter — flight integration,
     aim/homing, monster hit detection + kills (with the same drop/shard/
     xp/level path the melee loop uses), wall/range expiry.
   - updateSlimeProjectiles: the `if (S.slimeProjectiles...)` filter —
     fodder-slime projectiles flying at the player, with mid-flight
     shield/block re-evaluation and damage on contact.
   Captures (depth-aware scope scan; build can't run in this env): `P` is
   the player; `setRpgState`/`setLevelUpMsg` arrive via deps (arrows only);
   everything else is a module import below. S is stateRef.current. */
import {
  BT_AUDIO, COMBO_NEXT_DURATION_BONUS, ELEMENTS, QUEST_CHAINS, QUEST_STATUS, RARITY_TIERS,
  WEAPON_TYPES, WELL_RESTED_XP_MULT, ZONES, applyStatus, awardWeaponXp, calcWeaponDmg,
  discoverCollision, getActiveWeapon, getCollisionDeathFX, getElementDeathFX, recalcDerived,
  resolveCollision, rollPassiveDodge, spawnWeaponHitFX
} from '@/data/index.js';
import { baseArchetypeOf, isRemnantSkull, maybeTransformMonster, xpMultFor } from '@/data/monsterVariants.js';
import { getEquip } from '@/rendering/gearCatalog.js'; /* v2.3.1108: armoured-hit clang on projectile hits */
import { rollMonsterShard } from '@/data/shards.js';
import { addBuildUse, applyMeleeLifesteal, distributeKillXpToBuild, isAttackInShieldArc, trackMonsterDamage } from '@/game/combatHelpers.js';
import { earnCertification as masteryEarnCert } from '@/game/mastery.js';
import { pushHudPopup } from '@/ui/XpFlyOverlay.jsx';
import { _objectSpread, _slicedToArray } from '@/lib/babelHelpers.js';

export function updateArrows(S, deps) {
  var P = S.player;
  var setRpgState = deps.setRpgState,
    setLevelUpMsg = deps.setLevelUpMsg;
        /* ── Arrow projectile simulation + hit detection + kills ── */
        if (S.arrows && S.arrows.length > 0) {
          var curAim;
          if (S.lockedTarget && S.lockedTarget.ref) {
            var lt2 = S.lockedTarget.ref;
            curAim = Math.atan2((lt2.y || 0) - P.y, (lt2.x || 0) - P.x);
          } else if (S._aiming) {
            curAim = S._aimAngle || 0;
          } else {
            var fd2 = S._facing || 'down';
            curAim = fd2 === 'right' ? 0 : fd2 === 'up' ? -Math.PI / 2 : fd2 === 'left' ? Math.PI : Math.PI / 2;
          }
          S.arrows = S.arrows.filter(function (a) {
            var _S$rpg15;
            /* v2.3.1095: PLANTED -- the arrow reached the screen edge / max
               range, arced down, and is stuck in the ground.  Hold its frozen
               world position, take no hits, and remove ~2 s after planting. */
            if (a.planted) return (Date.now() - a.plantedAt) < 2000;
            /* v2.3.213: fall back to inert object when unarmed so
               arrow tick doesn't crash on .type/.tierMult reads. */
            var activeWpn = (S.rpg && getActiveWeapon(S.rpg)) || { element1: null, element2: null };
            var pDmg = S.rpg ? calcWeaponDmg(activeWpn.type || 'greatsword', S.rpg || {}, activeWpn.tierMult || 1) : 10;
            /* Derive element/type early so kill logic can use them */
            var projElem = a.element || (activeWpn === null || activeWpn === void 0 ? void 0 : activeWpn.element1);
            var isStaffProj = (activeWpn === null || activeWpn === void 0 ? void 0 : activeWpn.type) === 'staff' || a.isSpecial && ((_S$rpg15 = S.rpg) === null || _S$rpg15 === void 0 ? void 0 : _S$rpg15.activeSlot) === 'staff';
            /* v2.3.937: bow arrows nock at the teal grip (S._bowGrip{X,Y},
               published each frame by the bow stand-in) and don't fly until the
               quick draw reaches its release at BOW_RELEASE_MS (110 ms; mirrors
               the export in entityRenderer.js -- kept as a literal to avoid a
               game/ -> rendering/ import).  While nocked, the offset tracks the
               live grip; at release it freezes so the arrow leaves from the bow.
               Staff bolts have no fromGrip and behave exactly as before. */
            /* v2.3.1095: release is LATCHED per arrow from its own birth time.
               It used to read the GLOBAL S._bowShotAt, so firing a NEW arrow
               reset _released for every in-flight arrow -- they snapped back to
               the grip and froze for 110 ms ("arrows freeze mid-flight"). */
            if (a._bornTs == null) a._bornTs = Date.now();
            if (!a._released) a._released = !a.fromGrip || (Date.now() - a._bornTs) >= 110;
            var _released = a._released;
            if (a.fromGrip && (!_released || a._ox == null) && S._bowGripX != null) {
              a._ox = S._bowGripX - P.x;
              a._oy = S._bowGripY - P.y;
            }
            var _ox = a._ox || 0, _oy = a._oy || 0;
            /* v2.3.1095: PLANTING -- past the screen edge / max range, flight is
               over.  Arc sharply downward in ABSOLUTE world coords (decoupled
               from the player) and plant once it has dropped a little; the
               `planted` early-return above then holds it for ~2 s.  No hits while
               falling. */
            if (a.planting) {
              a._fallVy = (a._fallVy || 0) + 0.9;
              a._plantY = (a._plantY != null ? a._plantY : a._plantStartY) + a._fallVy;
              a._renderX = a._plantX;
              a._renderY = a._plantY;
              a.ang = a.ang + (Math.PI / 2 - a.ang) * 0.35;   // rotate to straight-down
              if (a._plantY - a._plantStartY >= 26) {
                a.planted = true; a.plantedAt = Date.now(); a.ang = Math.PI / 2;
              }
              return true;
            }
            if (_released) a.dist += a.isStaff ? 5 : 8;
            a.life--;
            if (S._aiming || S.lockedTarget && S.lockedTarget.ref) a.ang = curAim;
            a._renderX = P.x + _ox + Math.cos(a.ang) * a.dist;
            a._renderY = P.y + _oy + Math.sin(a.ang) * a.dist;
            if (a.life <= 0) return false;
            /* v2.3.1095: range / screen-edge limit (regular arrows, not staff
               magic).  Once a flying arrow nears the visible edge or exceeds the
               max flight distance, begin the downward plant rather than flying
               on forever. camera.x/y is the viewport top-left in world coords. */
            if (!a.isStaff && _released) {
              var _edge = false;
              if (typeof S._viewW === 'number' && typeof S._viewH === 'number' && S.camera) {
                var _em = 24;
                _edge = a._renderX < S.camera.x + _em || a._renderX > S.camera.x + S._viewW - _em
                     || a._renderY < S.camera.y + _em || a._renderY > S.camera.y + S._viewH - _em;
              }
              if (_edge || a.dist > 900) {
                a.planting = true;
                a._plantX = a._renderX;
                a._plantStartY = a._renderY;
                a._plantY = a._renderY;
                a._fallVy = 2;        // initial downward kick -> "sharply downward"
                a.life = 999;         // plantedAt governs removal now, not life
                return true;
              }
            }
            var hit = false;
            if (S.monsters) S.monsters.forEach(function (m) {
              /* Non-piercing arrows bail after the first hit (default).
                 Piercing arrows keep iterating so a single shot chains
                 through every monster in its hit radius; hitIds still
                 prevents the same monster from taking multiple ticks
                 of damage from one arrow. */
              if (!m.alive || a.hitIds.has(m.id) || (hit && !a.pierce)) return;
              /* Same y-offset fix as the melee path — fodder slimes
                 render at 96 px anchored at the feet, sprite mid-frame
                 at m.y - 40, so projectiles aim there (v2.1.72).
                 Snowman is taller (64 px sprite anchored to the feet
                 at m.y + 13), visual center ~19 px above m.y and arms
                 that extend outward — needs both the y-offset and a
                 wider radius. */
              var _archProj = m.archetype || m.type;
              var _mProjY = m.y;
              var _hitR = a.isStaff ? 30 : 18;
              if (_archProj === 'fodder') {
                _mProjY = m.y - 40;
                /* Slime body is wider than the 18 px default — bump
                   the radius so arrows that visually hit the body
                   register.  Same intuition as the melee +20 bonus. */
                _hitR = a.isStaff ? 38 : 26;
              } else if (_archProj === 'fireGoblin') {
                /* Goblin's visible body sits ~26-30 px above m.y
                   (sprite anchor at feet, body extends upward 64 px
                   tall on screen).  Without this offset, arrows aimed
                   at the body whiff and only feet-level shots
                   register -- the source of the "arrows beneath the
                   sprite" bug.  Wider hit radius too for the upright
                   torso silhouette. */
                _mProjY = m.y - 28;
                _hitR = a.isStaff ? 40 : 26;
              } else if (_archProj === 'snowman') {
                _mProjY = m.y - 19;
                _hitR = a.isStaff ? 44 : 32;
              } else if (_archProj === 'mummy' || _archProj === 'skeleton') {
                /* 96 px sprite anchored at feet -- aim at mid-body
                   ~48 px up, wide hit radius to cover the full
                   figure height plus a bit (user reported hitbox
                   was "way too small"). */
                _mProjY = m.y - 48;
                _hitR = a.isStaff ? 50 : 40;
              }
              /* v2.3.222: special arrow has 3x damage radius. */
              if (a.isSpecial) _hitR *= 3;
              if (Math.sqrt(Math.pow(m.x - a._renderX, 2) + Math.pow(_mProjY - a._renderY, 2)) < _hitR) {
                a.hitIds.add(m.id);
                var arrowElem = a.isSpecial ? activeWpn === null || activeWpn === void 0 ? void 0 : activeWpn.element2 : activeWpn === null || activeWpn === void 0 ? void 0 : activeWpn.element1;
                if (arrowElem) {
                  var _ELEMENTS$arrowElem;
                  var statusId = (_ELEMENTS$arrowElem = ELEMENTS[arrowElem]) === null || _ELEMENTS$arrowElem === void 0 ? void 0 : _ELEMENTS$arrowElem.status;
                  if (statusId) {
                    applyStatus(m, statusId, S.player, Date.now());
                    /* §12.2 cert — first elemental status applied (ranged). */
                    masteryEarnCert('first-status');
                    /* §5.9.6 Combo "Next" — extend on ranged status apply too. */
                    if (S.combo && S.combo.nextExtended && m.statuses && m.statuses[statusId]) {
                      var _extMulR = 1 + (COMBO_NEXT_DURATION_BONUS || 0.2);
                      m.statuses[statusId].remaining *= _extMulR;
                      m.statuses[statusId].maxDur = Math.max(m.statuses[statusId].maxDur || 0, m.statuses[statusId].remaining);
                      S.combo.nextExtended = false;
                      S.dmgNumbers.push({ x: m.x, y: m.y - 28, text: 'ext', color: '#f5c542', ts: Date.now() });
                    }
                  }
                }
                var arrowCollision = null;
                if (arrowElem && S.rpg) {
                  arrowCollision = resolveCollision(m, arrowElem, S.player, S.rpg, Date.now());
                }
                if (m._invulnerable) {
                  S.dmgNumbers.push({ x: m.x, y: m.y - 20, text: 'IMMUNE', color: '#888', ts: Date.now() });
                  a.hit = true;
                  return;
                }
                var _hpBefore = m.curHp;
                /* v2.3.109: variant incomingDmgScalar removed (WYSIWYG)
                   -- arrow damage lands at its displayed value. */
                var _arrowDmg = a.dmg;
                if (!S._serverMonsters) m.curHp -= _arrowDmg;
                /* Client-local zones only -- server zones use monster_hit (Fix B). */
                if (!S._serverMonsters && S.channel) S.channel.send({ type: 'broadcast', event: 'monster_dmg_at', payload: { id: S.myId, x: m.x, y: m.y, dmg: _arrowDmg, isCrit: false } });
                /* Hit-reaction (ranged variant) — mirrors the melee path.
                   arrowCollision bonus damage applied below uses the
                   same anim window, no need to re-trigger. */
                {
                  var _hitArchR = m.archetype || m.type;
                  var _hitBaseR = baseArchetypeOf(_hitArchR);
                  if ((_hitBaseR === 'fodder' || _hitArchR === 'snowman') && m.curHp > 0) {
                    m._hitAnimStart = Date.now();
                    m._hitAnimEnd = Date.now() + (_hitArchR === 'snowman' ? 600 : 400);
                  }
                  /* Retaliation — mirrors the melee path so arrow/staff
                     hits also force fireGoblin to chase the player for 5s. */
                  if (_hitBaseR === 'fodder' && m.curHp > 0) {
                    m._aggroed = true;
                    m._aggroTs = m._aggroTs || Date.now();
                    m._chaseUntil = Date.now() + 5000;
                  }
                  if (_hitArchR === 'snowman' && m.curHp > 0) {
                    try { BT_AUDIO.play('snowman-hit', { vol: 0.7 }); } catch (e) {}
                    /* v2.3.1124: stamp an ice-burst impact flash -- full size for
                       staff/magic, 50% for arrows (effectsRenderer reads these).
                       v2.3.1127: + _impactAngle (projectile travel dir) so the
                       eruption plume points along the attack direction. */
                    m._impactAt = Date.now(); m._impactScale = isStaffProj ? 1 : 0.5; m._impactAngle = a.ang;
                  }
                }
                /* Count-based weight: 1 per landed projectile.  Bow hits
                   feed Agility, staff hits feed Mind — so ranged kills
                   train Agility and magic kills train Mind via
                   distributeKillXpToBuild's share split.  Power stays
                   reserved for melee swing damage. */
                if (S.rpg) addBuildUse(S.rpg, isStaffProj ? 'mind' : 'agility', 1);
                /* T2: damage-driven weapon-skill XP — the equipped slot
                   resolves to Bow or Staff at hit time. */
                if (S.rpg) {
                  var _wlR = awardWeaponXp(S.rpg, _arrowDmg);
                  if (_wlR) {
                    S.dmgNumbers.push({ x: m.x, y: m.y - 44, text: _wlR.cat.toUpperCase() + ' Lv ' + _wlR.level + ' · +' + _wlR.points + 'pt', color: '#5b52ff', ts: Date.now() });
                    try { BT_AUDIO.levelUp(); } catch (e) {}
                  }
                }
                if (S._serverMonsters && S.channel) {
                  S.channel.send({ type: 'monster_damage', payload: {
                    monsterId: m.id, zone: S.currentZone, element: null,
                    /* Arrow path = ranged; worker uses this to deny the
                       melee-only lifesteal even if activeSlot drifted.
                       Ranged shots are never "special" (swipe is melee),
                       so special:false.  Server rolls the damage. */
                    slot: isStaffProj ? 'staff' : 'ranged', special: false
                  }});
                }
                if (arrowCollision) {
                  var _ELEMENTS$arrowCollis;
                  /* §12.2 certs — collision-driven advancements (ranged). */
                  masteryEarnCert('first-collision');
                  if (activeWpn && activeWpn.isVolatile) masteryEarnCert('first-volatile');
                  if (arrowCollision.resonating) masteryEarnCert('first-resonance-hit');
                  if (arrowCollision.collision && arrowCollision.collision.type === 'capstone') masteryEarnCert('first-capstone');
                  if (!S._serverMonsters) m.curHp -= arrowCollision.damage;
                  var coll = arrowCollision.collision;
                  var elemCol = ((_ELEMENTS$arrowCollis = ELEMENTS[arrowCollision.triggerElement]) === null || _ELEMENTS$arrowCollis === void 0 ? void 0 : _ELEMENTS$arrowCollis.color) || '#fff';
                  /* §5.7 Resonance — bright readout + ring on resonance-timed projectile collisions. */
                  var _arPrefix = arrowCollision.resonating ? '🎯💥' : '💥';
                  var _arColor = arrowCollision.resonating ? '#fffbb0' : elemCol;
                  S.dmgNumbers.push({ x: m.x + 8, y: m.y - 30, text: _arPrefix + arrowCollision.damage + ' ' + coll.name, color: _arColor, ts: Date.now() });
                  if (arrowCollision.resonating) {
                    var _arRingR = 28 + arrowCollision.resonanceDepth * 14;
                    for (var _arrp = 0; _arrp < 24; _arrp++) {
                      var _arrpA = (_arrp / 24) * Math.PI * 2;
                      S.hitParticles.push({
                        x: m.x + Math.cos(_arrpA) * _arRingR,
                        y: m.y + Math.sin(_arrpA) * _arRingR,
                        vx: Math.cos(_arrpA) * 0.6,
                        vy: Math.sin(_arrpA) * 0.6,
                        life: 0.45,
                        color: '#ffffff',
                        size: 1.5 + Math.random() * 1.5
                      });
                    }
                  }
                  if (arrowCollision.manaRestored > 0) {
                    S.dmgNumbers.push({ x: P.x, y: P.y - 45, text: '+' + arrowCollision.manaRestored + ' MP', color: '#3b82f6', ts: Date.now() });
                  }
                  BT_AUDIO.collisionSound(arrowCollision.setupElement, arrowCollision.triggerElement, arrowCollision.manaRestored);
                  for (var cp = 0; cp < 12; cp++) {
                    S.hitParticles.push({ x: m.x + (Math.random() - 0.5) * 6, y: m.y + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5 - 2, life: 0.7, color: elemCol, size: 2 + Math.random() * 2 });
                  }
                  S.screenShake = Math.max(S.screenShake, 4);
                  BT_AUDIO.beep(400, 0.1, 0.12, 'sine');
                  var isNew = discoverCollision(coll.id);
                  if (isNew) {
                    S.dmgNumbers.push({ x: P.x, y: P.y - 60, text: 'NEW: ' + coll.name + '!', color: '#f5c542', ts: Date.now() });
                    BT_AUDIO.collect();
                  }
                }
                if (a.isStaff) BT_AUDIO.magicHit({ vol: 0.3 });
                else BT_AUDIO.play('arrow-hit', { vol: 0.6 });
                /* Blood spray on bow hits — particles fly along the
                   arrow's flight direction (a.ang). Skipped for staff
                   bolts since they have the dedicated magic-orb crash. */
                if (!a.isStaff) {
                  if (!S.hitParticles) S.hitParticles = [];
                  var _bloodPaletteA = ['#8a0a0a', '#a01010', '#6e0606', '#c01818'];
                  for (var _abp = 0; _abp < 7; _abp++) {
                    var _abpAng = a.ang + (Math.random() - 0.5) * 0.6;
                    var _abpSpd = 1.5 + Math.random() * 3;
                    S.hitParticles.push({
                      x: m.x + (Math.random() - 0.5) * 4,
                      y: m.y + (Math.random() - 0.5) * 4,
                      vx: Math.cos(_abpAng) * _abpSpd,
                      vy: Math.sin(_abpAng) * _abpSpd - 0.4,
                      life: 0.4 + Math.random() * 0.3,
                      color: _bloodPaletteA[Math.floor(Math.random() * _bloodPaletteA.length)],
                      size: 0.8 + Math.random() * 1.2,
                    });
                  }
                }
                /* Magic orb crash & dissipate — element-tinted impact ring
                   plus radial particle burst when a staff bolt collides. */
                if (a.isStaff) {
                  var _orbColor = projElem && ELEMENTS[projElem] ? ELEMENTS[projElem].color : '#a78bfa';
                  if (!S._impactRings) S._impactRings = [];
                  /* Outer expanding ring — the "crash" flash. */
                  S._impactRings.push({
                    x: m.x, y: m.y, ts: Date.now(),
                    color: _orbColor, maxR: 26, duration: 320,
                  });
                  /* Inner brighter ring 40 ms later for double-pulse
                     intensity. Use a startDelay field rather than
                     setting ts in the future — future-ts caused the
                     render to compute negative ages and weird radii on
                     the first frame after spawn (same family of bug
                     as the swingTimer +300 player-flicker on cast). */
                  S._impactRings.push({
                    x: m.x, y: m.y, ts: Date.now(), startDelay: 40,
                    color: _orbColor, maxR: 14, duration: 220,
                  });
                  /* Dissipation — radial particle spray outward, with a
                     small upward bias so embers drift like sparks. */
                  if (!S.hitParticles) S.hitParticles = [];
                  for (var _op = 0; _op < 22; _op++) {
                    var _oa = (_op / 22) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
                    var _osp = 2 + Math.random() * 4;
                    S.hitParticles.push({
                      x: m.x + Math.cos(_oa) * 4,
                      y: m.y + Math.sin(_oa) * 4,
                      vx: Math.cos(_oa) * _osp,
                      vy: Math.sin(_oa) * _osp - 0.7,
                      life: 0.45 + Math.random() * 0.4,
                      color: _orbColor,
                      size: 1 + Math.random() * 2.2,
                    });
                  }
                  /* Burn marks removed per user request — the orb-crash
                     ring + dissipation particles already convey the hit
                     without a residue overlay on the body. */
                }
                var kba = Math.atan2(m.y - a._renderY, m.x - a._renderX);
                /* Special projectiles (bow heavy / staff burst) knock
                   back 3x.  Base 5 -> 8, special 15 -> 23 = +50% per
                   user (v2.3.15) so arrow hits read as forceful. */
                var _projKb = a.isSpecial ? 23 : 8;
                m.x += Math.cos(kba) * _projKb;
                m.y += Math.sin(kba) * _projKb;
                /* Knockback recovery -- see melee path; pauses
                   client-side AI so the bump is visible. */
                m._kbUntil = Date.now() + 200;
                var rangedWpnType = a.isStaff ? 'staff' : 'bow';
                var rangedHitFX = spawnWeaponHitFX(m.x, m.y, kba, rangedWpnType, false);
                rangedHitFX.forEach(function (p) { return S.hitParticles.push(p); });
                /* Staff projectiles are magic — no physical shaft to
                   leave embedded in the body.  Particle FX from
                   spawnWeaponHitFX above is the visual residue. */
                if (!a.isStaff) {
                  if (!m._stuckArrows) m._stuckArrows = [];
                  if (m._stuckArrows.length < 12) {
                    /* Place the impact on the side of the monster the
                       arrow came from. -cos/-sin of flight angle = the
                       opposite of velocity = direction to entry side.
                       Fodder slimes use the 50 px sprite anchored at
                       my+8 (top at my-42); the dome-shaped body roughly
                       fills the ellipse centered at my-17 with rx≈12,
                       ry≈10. Plant the arrow ~3 px short of the surface
                       in the entry direction so the arrowhead is buried
                       in the body rather than floating off the edge. */
                    var _saArch = m.archetype || m.type;
                    var _saIsFodder = _saArch === 'fodder';
                    /* Per-archetype stuck-arrow anchors -- arrows should
                       bury in the body silhouette, not float in space.
                       fireGoblin: taller upright creature (64 px sprite,
                       body center ~30 px above feet) needs a bigger
                       y-anchor than slime (17 px) and a slightly wider
                       hit ellipse. */
                    var _saEntryDx = -Math.cos(a.ang);
                    var _saEntryDy = -Math.sin(a.ang);
                    var _saRx, _saRy, _saYAnchor;
                    if (_saArch === 'fireGoblin') {
                      _saRx = 14; _saRy = 18; _saYAnchor = -30;
                    } else if (_saIsFodder) {
                      _saRx = 9; _saRy = 7; _saYAnchor = -17;
                    } else {
                      _saRx = 6; _saRy = 6; _saYAnchor = 0;
                    }
                    var _saOx = _saEntryDx * _saRx + (Math.random() - 0.5) * 3;
                    var _saOy = _saEntryDy * _saRy + _saYAnchor + (Math.random() - 0.5) * 3;
                    m._stuckArrows.push({ ang: a.ang, ox: _saOx, oy: _saOy, isStaff: false, color: projElem && ELEMENTS[projElem] ? ELEMENTS[projElem].color : '#8B6914' });
                  }
                }
                if (!S.dmgNumbers) S.dmgNumbers = [];
                /* Cap display at the HP that was actually removed so the kill
                   blow doesn't show an inflated overkill number. */
                var _displayDmg = Math.min(a.dmg, _hpBefore);
                S.dmgNumbers.push({ x: m.x, y: m.y - 10, text: _displayDmg + '', color: '#ff9', iconKey: a.isStaff ? 'spell' : 'arrow', special: !!a.isSpecial, ts: Date.now() });
                if (m.curHp <= 0) {
                  /* In server-mode the network monster_killed event is
                     authoritative for XP/T1 distribution — only clamp
                     local HP for display and bail.  Push a visual
                     remnant pile before bailing so kills via bow / staff
                     still leave debris on the ground (fireGoblin debris
                     bug v2.3.10). */
                  if (S._serverMonsters) {
                    m.curHp = 0;
                    hit = true;
                    if (S.groundLoot && isRemnantSkull(m.type)) {
                      var _shardG = rollMonsterShard(S.currentZone);
                      S.groundLoot.push({
                        x: m.x + (Math.random() - 0.5) * 12,
                        y: m.y + (Math.random() - 0.5) * 12,
                        coins: 0,
                        xp: 0,
                        skull: m.type,
                        skullEmoji: '🦴',
                        ts: Date.now(),
                        shard: _shardG,
                      });
                    }
                    return;
                  }
                  /* Mummy -> skeleton on overkill (v2.3.135). */
                  maybeTransformMonster(m);
                  m.alive = false;
                  m.respawnAt = Date.now() + 30000;
                  m.statuses = {};
                  try { BT_AUDIO.monsterDeath(m && m.archetype); } catch (e) {}
                  if (S.rpg) {
                    var _R9 = S.rpg;
                    if (!_R9._questKills) _R9._questKills = {};
                    Object.keys(QUEST_CHAINS).forEach(function (qid) {
                      var _R9$_quests;
                      if (((_R9$_quests = _R9._quests) === null || _R9$_quests === void 0 ? void 0 : _R9$_quests[qid]) === QUEST_STATUS.active) _R9._questKills[qid] = (_R9._questKills[qid] || 0) + 1;
                    });
                    /* XP grant; gold rides on the loot drop only (no
                       direct grant + popup pair anymore — the pickup is
                       the only gold path now). */
                    var _wrMultR = _R9._wellRestedUntil && Date.now() < _R9._wellRestedUntil ? WELL_RESTED_XP_MULT : 1;
                    var _isRareR = Math.random() < 0.002;
                    /* Same variant XP bonus as the melee path -- keeps
                       bow/staff kills on the same XP curve as melee. */
                    var _killXpR = Math.ceil((_isRareR ? m.xp * 3 : m.xp) * _wrMultR * xpMultFor(m));
                    _R9.xp = (_R9.xp || 0) + _killXpR;
                    if (_R9._compStats) {
                      _R9._compStats.monstersKilled = (_R9._compStats.monstersKilled || 0) + 1;
                    }
                    /* +XP popup anchored next to the XP bar (HudPopupOverlay). */
                    pushHudPopup(S, { target: 'xpBar', text: '+' + _killXpR + ' XP', color: '#3ddc97' });
                    distributeKillXpToBuild(_R9, _killXpR);
                    /* Lifesteal helper is melee-only; calling it on a
                       ranged/staff kill is a no-op (activeSlot gate),
                       but we still clear the per-monster damage entry. */
                    applyMeleeLifesteal(S, _R9, m);
                    /* v2.3.910: combat level is DERIVED (sum of build-skill
                       levels, set in recalcDerived inside addBuildProg above);
                       fire feedback once per newly-reached level + refill. */
                    while (_R9.level > (_R9._lastShownLevel || 1)) {
                      _R9._lastShownLevel = (_R9._lastShownLevel || 1) + 1;
                      _R9.hp = _R9.maxHp;
                      _R9.stamina = _R9.maxStamina;
                      _R9.mana = _R9.maxMana;
                      setLevelUpMsg({ kind: 'combat', level: _R9._lastShownLevel, ts: Date.now() });
                      try { BT_AUDIO.levelUp(); } catch (e) {}
                    }
                    var isCrit = a.dmg > pDmg;
                    try { BT_AUDIO.deathBoom(m && m.archetype); } catch (e) {}
                    S.screenShake = isCrit ? 6 : 3;
                    /* Bow / staff kill effects.  Wrapped in try/catch +
                       hard-capped particle counts because this path was
                       triggering a full-tab WebKit/WebGL crash on iOS
                       (no JS error captured — pure native OOM-style
                       kill).  Both hitParticles AND deathExplosion
                       rendered the same particles in two separate Pixi
                       Graphics passes, doubling the GPU load right when
                       memory was tightest.  Particles now go ONLY into
                       hitParticles; the deathExplosion entry is dropped
                       (the Pixi effects renderer doesn't read its
                       weaponType/killCollision/etc anyway). */
                    try {
                      var killAngle = a.ang;
                      var arrowDeathParts = [];
                      var _arrowKillElem = arrowElem || projElem || null;
                      var _arrowKillColl = arrowCollision ? arrowCollision.collision : null;
                      var _arrowBodySize = { fodder: 8, brute: 15, swarm: 6, sentinel: 12, volatile: 9, stalker: 10, hexer: 10 }[m.archetype || 'fodder'] || 10;
                      if (_arrowKillColl) {
                        var collFx = getCollisionDeathFX(m.x, m.y, _arrowKillColl.id, killAngle, _arrowBodySize, isCrit ? 1.5 : 1);
                        for (var _ci = 0; _ci < Math.min(collFx.length, 8); _ci++) arrowDeathParts.push(collFx[_ci]);
                      } else if (_arrowKillElem) {
                        var elemFx = getElementDeathFX(m.x, m.y, _arrowKillElem, killAngle, m.color, _arrowBodySize, isCrit ? 1.5 : 1);
                        var _ep = elemFx && elemFx.particles ? elemFx.particles : [];
                        for (var _ei = 0; _ei < Math.min(_ep.length, 8); _ei++) arrowDeathParts.push(_ep[_ei]);
                      } else {
                        for (var dp = 0; dp < 5; dp++) {
                          arrowDeathParts.push({ x: m.x, y: m.y, vx: Math.cos(killAngle + (Math.random() - 0.5) * 1.5) * (2 + Math.random() * 4), vy: Math.sin(killAngle + (Math.random() - 0.5) * 1.5) * (2 + Math.random() * 4) - 2, life: 1, color: m.color, size: 1.5 + Math.random() * 2 });
                        }
                      }
                      for (var _di = 0; _di < arrowDeathParts.length; _di++) S.hitParticles.push(arrowDeathParts[_di]);
                    } catch (_bowFxErr) {
                      console.error('[bow-kill] death FX threw', _bowFxErr && _bowFxErr.message, _bowFxErr && _bowFxErr.stack);
                    }
                    /* Gold rides on the loot — rare kills carry the 10x bonus
                       through the drop instead of via a direct grant. */
                    var _killGoldR = Math.ceil(_isRareR ? (m.gold || 2) * 10 : (m.gold || m.coins || 2));
                    var _shardH = rollMonsterShard(S.currentZone);
                    S.groundLoot.push({ x: m.x + (Math.random() - 0.5) * 15, y: m.y + (Math.random() - 0.5) * 15, coins: _killGoldR, xp: 0, skull: m.type, skullEmoji: '🦴', ts: Date.now(), shard: _shardH });
                    var dropChance = Math.min(0.15, 0.03 + (m.level || 1) * 0.001);
                    if (Math.random() < dropChance) {
                      var _zone7 = ZONES[S.currentZone];
                      var _zoneElem2 = _zone7 === null || _zone7 === void 0 ? void 0 : _zone7.element;
                      var dropRoll = Math.random();
                      var dropTier, dropE1 = null, dropE2 = null, dropName = '', dropVolatile = false;
                      if (dropRoll < 0.60) { dropTier = 'common'; }
                      else if (dropRoll < 0.85) { dropTier = 'elemental'; dropE1 = _zoneElem2 || 'flame'; }
                      else if (dropRoll < 0.97) {
                        dropTier = 'fusion'; dropE1 = _zoneElem2 || 'flame';
                        var palette = ['flame', 'frost', 'water', 'venom', 'storm', 'stone', 'wind'].filter(function (e) { return e !== dropE1; });
                        dropE2 = palette[Math.floor(Math.random() * palette.length)];
                        var volPairs = [['flame', 'water'], ['water', 'venom'], ['venom', 'wind'], ['wind', 'stone'], ['stone', 'storm'], ['storm', 'frost'], ['frost', 'flame']];
                        dropVolatile = volPairs.some(function (_ref19) { var _ref20 = _slicedToArray(_ref19, 2), a2 = _ref20[0], b = _ref20[1]; return dropE1 === a2 && dropE2 === b || dropE1 === b && dropE2 === a2; });
                      } else { dropTier = 'shift'; dropE1 = _zoneElem2 || 'flame'; dropE2 = 'adaptive'; }
                      var dropTypes = ['greatsword', 'sword', 'bow', 'staff'];
                      var dropType = dropTypes[Math.floor(Math.random() * dropTypes.length)];
                      var tierMult = RARITY_TIERS[dropTier].mult;
                      if (dropTier === 'common') dropName = WEAPON_TYPES[dropType].label; else if (dropTier === 'elemental') dropName = dropE1.charAt(0).toUpperCase() + dropE1.slice(1) + ' ' + WEAPON_TYPES[dropType].label; else if (dropTier === 'fusion') dropName = dropE1.charAt(0).toUpperCase() + dropE1.slice(1) + (dropE2.charAt(0).toUpperCase() + dropE2.slice(1)) + ' ' + WEAPON_TYPES[dropType].label; else dropName = 'Prismatic ' + WEAPON_TYPES[dropType].label;
                      S.groundLoot.push({ x: m.x + (Math.random() - 0.5) * 20, y: m.y + (Math.random() - 0.5) * 20, ts: Date.now(), isWeapon: true, weapon: { type: dropType, tier: dropTier, tierMult: tierMult, element1: dropE1, element2: dropE2, name: dropName, isVolatile: dropVolatile }, tierColor: RARITY_TIERS[dropTier].color });
                      S.dmgNumbers.push({ x: m.x, y: m.y - 40, text: dropName + '!', color: RARITY_TIERS[dropTier].color, ts: Date.now() });
                    }
                    setRpgState(_objectSpread({}, _R9));
                    try { localStorage.setItem('bt_rpg', JSON.stringify(_R9)); } catch (e) {}
                  }
                  /* Kill marker removed — the damage number (capped at
                     remaining HP) plus the death effects already convey
                     the kill without a separate glyph. */
                }
                hit = true;
              }
            });
            /* Non-piercing arrows die on the first hit.  Piercing
               arrows survive each hit and only expire when a.life
               (line 8954, decrements each frame) hits zero -- so
               the arrow flies its full range and damages everything
               along the line. */
            if (hit && !a.pierce) return false;
            /* Store render-ready element info */
            a._projElem = projElem;
            a._isStaffProj = isStaffProj;
            return true;
          });
        }
}

export function updateSlimeProjectiles(S) {
  var P = S.player;
        /* ── Slime projectile simulation + player collision + damage ──
           Spawned by fodder slimes at telegraph end (see attack code).
           Travels in a straight line at proj.speed px/tick toward where
           the player was at fire time. Player can dodge by moving. On
           contact: re-evaluate shield/block (player can raise shield
           mid-flight) and apply damage. */
        if (S.slimeProjectiles && S.slimeProjectiles.length > 0) {
          var _R6P = S.rpg || {};
          var _pInvuln = Date.now() < (S.respawnTimer || 0);
          S.slimeProjectiles = S.slimeProjectiles.filter(function (proj) {
            proj.life--;
            if (proj.life <= 0) return false;
            proj.x += Math.cos(proj.ang) * proj.speed;
            proj.y += Math.sin(proj.ang) * proj.speed;
            var pdx = P.x - proj.x, pdy = P.y - proj.y;
            if (pdx * pdx + pdy * pdy > 16 * 16) return true;
            if (_pInvuln) return false;
            /* Shield blocks slime projectiles outright — no damage,
               no hit-react, plays the metal-clang shield-block SFX,
               same as the melee block paths. (Previously the projectile
               got reduced damage and still triggered the hit-react +
               the wrong sound.)

               Pass an "incoming-attack" point computed from proj.ang
               (the projectile's travel direction) instead of its
               current x/y. At collision time the projectile can have
               overshot the player by a few px in the direction it was
               traveling, which made the arc test see the attack coming
               from in FRONT of the player even though the slime was
               clearly behind it. The virtual point sits 50 px from the
               player along (proj.ang + π) — i.e. straight back along
               the projectile's path — so the arc check resolves to the
               actual attacker direction. */
            var _atkFromX = P.x - Math.cos(proj.ang) * 50;
            var _atkFromY = P.y - Math.sin(proj.ang) * 50;
            var pShielded = Date.now() < S.shieldEnd; /* v2.3.1110: omnidirectional */
            if (pShielded) {
              try { BT_AUDIO.play('shield-block', { vol: 1.0 }); } catch (e) {}
              S.dmgNumbers.push({
                x: P.x, y: P.y - 20,
                text: 'BLOCK',
                color: '#60a5fa',
                ts: Date.now(),
              });
              S.screenShake = Math.max(S.screenShake || 0, 3);
              S._blockFlash = Date.now();
              if (!S._impactRings) S._impactRings = [];
              S._impactRings.push({
                x: P.x, y: P.y, ts: Date.now(),
                color: '#60a5fa', maxR: 25, duration: 200,
              });
              for (var _bp = 0; _bp < 8; _bp++) {
                var _bpA = Math.atan2(P.y - proj.y, P.x - proj.x) + (Math.random() - 0.5) * 1.5;
                S.hitParticles.push({
                  x: P.x + Math.cos(_bpA) * 16,
                  y: P.y + Math.sin(_bpA) * 16,
                  vx: Math.cos(_bpA) * (1 + Math.random() * 3),
                  vy: Math.sin(_bpA) * (1 + Math.random() * 3) - 1,
                  life: 0.5,
                  color: ['#60a5fa', '#93c5fd', '#fff'][Math.floor(Math.random() * 3)],
                  size: 1.5 + Math.random(),
                });
              }
              return false;
            }
            /* v2.3.234 (Phase 4): Agility passive dodge on projectiles too. */
            var _projDodge = rollPassiveDodge(_R6P.agility);
            if (_projDodge) {
              S.dmgNumbers.push({
                x: P.x, y: P.y - 18, text: 'Dodge!',
                color: '#00d4ff', ts: Date.now(),
              });
              return false;
            }
            _R6P.hp -= proj.rawDmg;
            trackMonsterDamage(S, proj.ownerId, proj.rawDmg);
            if (window.__dmgLog) try { console.log('[dmg] slime-projectile', { amt: proj.rawDmg, lifeAtHit: proj.life, ageMs: Date.now() - proj.ts, projPos: { x: Math.round(proj.x), y: Math.round(proj.y) }, pPos: { x: Math.round(P.x), y: Math.round(P.y) } }); } catch (e) {}
            try { BT_AUDIO.monsterHitHero(getEquip('chest') !== 'none' || getEquip('legs') !== 'none' || getEquip('shoulders') !== 'none', { vol: 0.7 }, 'slime-projectile-hit'); } catch (e) {}
            S.lastDamageTaken = Date.now();
            S._hitFlash = Date.now();
            if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_hurt_by_monster', payload: { id: S.myId, dmg: proj.rawDmg } });
            if (_R6P.hp > 0) addBuildUse(_R6P, 'vitality', proj.rawDmg);
            S.dmgNumbers.push({
              x: P.x, y: P.y - 20,
              text: '-' + proj.rawDmg,
              color: '#fff',
              ts: Date.now(),
            });
            S.screenShake = Math.max(S.screenShake || 0, 4);
            for (var _hp = 0; _hp < 6; _hp++) {
              var _hpA = Math.random() * Math.PI * 2;
              S.hitParticles.push({
                x: P.x, y: P.y,
                vx: Math.cos(_hpA) * (1 + Math.random() * 2),
                vy: Math.sin(_hpA) * (1 + Math.random() * 2) - 1,
                life: 0.5,
                color: '#3dd497',
                size: 1.5 + Math.random(),
              });
            }
            return false;
          });
        }
}
