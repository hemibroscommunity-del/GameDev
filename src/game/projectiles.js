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
  BT_AUDIO, ELEMENTS, QUEST_CHAINS, QUEST_STATUS, RARITY_TIERS,
  PVP_THREAT_DURATION,
  WEAPON_TYPES, WELL_RESTED_XP_MULT, ZONES, applyStatus, awardWeaponXp, calcWeaponDmg,
  discoverCollision, getActiveWeapon, getCollisionDeathFX, getElementDeathFX, recalcDerived,
  getEvasionPts, resolveCollision, rollPassiveDodge, spawnWeaponHitFX, staffAoeMult,
  monsterBodyY, monsterBodyOffsetY, monsterProceduralRadius, trainDefense, applyIronSkin, applyResilience, /* v2.3.1314 */
} from '@/data/index.js';
import { baseArchetypeOf, hitShapeOf, isRemnantSkull, maybeTransformMonster, xpMultFor } from '@/data/monsterVariants.js';
import { isWearingArmor } from '@/rendering/gearCatalog.js'; /* v2.3.1108: armoured-hit clang on projectile hits */
import { rollMonsterShard } from '@/data/shards.js';
import { addBuildUse, applyMeleeLifesteal, distributeKillXpToBuild, trackMonsterDamage, pushDmgPopup, monsterPopupY, hurtPlayerLocal, isAttackInShieldArc } from '@/game/combatHelpers.js';
import { earnCertification as masteryEarnCert } from '@/game/mastery.js';
import { celebrateLevelUps } from '@/game/levelCelebration.js';
import { saveRpgSoon } from '@/game/rpgSave.js'; /* v2.3.1356 */
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
            /* v2.3.1111: home toward the body centre the hit-test uses. */
            curAim = Math.atan2((monsterBodyY(lt2) || 0) - P.y, (lt2.x || 0) - P.x);
          } else if (S._aiming) {
            curAim = S._aimAngle || 0;
          } else {
            var fd2 = S._facing || 'down';
            curAim = fd2 === 'right' ? 0 : fd2 === 'up' ? -Math.PI / 2 : fd2 === 'left' ? Math.PI : Math.PI / 2;
          }
          S.arrows = S.arrows.filter(function (a) {
            var _S$rpg15;
            /* v2.3.1425: STUCK-IN-MONSTER -- a special projectile that
               hit a monster embeds in its body instead of vanishing (it
               used to look like it flew past).  While stuck it rides
               the monster's rendered position and applies the chip-
               damage contract of the landed bow special (v2.3.1402):
               every 0.5s a BASE weapon hit on the stuck monster, for
               4s.  Server mode sends a normal hit and lets the worker
               roll the authoritative number.
               v2.3.1426 (owner: "I meant the ARROW special get stuck in
               the monster, not the orbs"): this state now belongs to the
               bow special -- see the stick site in the hit block. */
            if (a.stuckIn) {
              var _sm = a.stuckIn;
              var _sAge = Date.now() - a.stuckAt;
              if (_sAge >= 4000 || !_sm || !_sm.alive || _sm.curHp <= 0) return false;
              var _smx = (typeof _sm.renderX === 'number') ? _sm.renderX : _sm.x;
              var _smy = ((typeof _sm.renderY === 'number') ? _sm.renderY : _sm.y) - monsterBodyOffsetY(_sm.archetype || _sm.type);
              a._renderX = _smx + (a._stickOx || 0);
              a._renderY = _smy + (a._stickOy || 0);
              if (a._lingerNext == null) a._lingerNext = a.stuckAt + 500;
              if (Date.now() >= a._lingerNext) {
                a._lingerNext = Date.now() + 500;   /* relative reset — no burst catch-up after a background tab */
                var _cBase = a.baseDmg || 1;
                if (S._serverMonsters && S.channel) {
                  /* authoritative BASE hit (special:false -> normal lane; ticks are 500ms apart).
                     v2.3.1435 (owner): noKb — chip ticks must not shove the
                     monster around (only the arrow's FIRST hit knocks back);
                     the worker zeroes kbForce when the flag is present.  Old
                     workers ignore it (knockback until the merge deploys). */
                  S.channel.send({ type: 'monster_damage', payload: { monsterId: _sm.id, zone: S.currentZone, element: a.element || null, slot: a.isStaff ? 'staff' : 'ranged', special: false, noKb: true } });
                } else {
                  _sm.curHp -= _cBase;
                  if (_sm.curHp < 0) _sm.curHp = 0;
                }
                if (!S.dmgNumbers) S.dmgNumbers = [];
                pushDmgPopup(S, _sm.x, monsterPopupY(_sm, -10), _cBase + '', '#ffe08a', { iconKey: a.isStaff ? 'spell' : 'arrow' });
              }
              return true;
            }
            /* v2.3.1095: PLANTED -- the arrow reached the screen edge / max
               range, arced down, and is stuck in the ground.  Hold its frozen
               world position, take no hits, and remove ~2 s after planting. */
            if (a.planted) {
              var _pAge = Date.now() - a.plantedAt;
              /* v2.3.1402 (owner): a landed BOW SPECIAL becomes a lingering
                 ground hazard — every 0.5 s it deals BASE bow damage to any
                 monster within 100 px of where it stuck, until it disappears
                 (4 s).  Regular arrows just sit for 2 s as before.  Base
                 damage was captured at fire time (a.baseDmg) so a weapon swap
                 can't change it; server mode sends a normal ranged hit and
                 lets the worker roll the authoritative number. */
              var _pLife = (a.isSpecial && !a.isStaff) ? 4000 : 2000;
              if (a.isSpecial && !a.isStaff && S.monsters && _pAge < _pLife) {
                if (a._lingerNext == null) a._lingerNext = a.plantedAt + 500;
                if (Date.now() >= a._lingerNext) {
                  a._lingerNext = Date.now() + 500;   /* relative reset — no burst catch-up after a background tab */
                  var _lBase = a.baseDmg || 1;
                  var _lElem = a.element || null;
                  var _lcx = (a._plantX != null) ? a._plantX : a._renderX;
                  var _lcy = (a._plantY != null) ? a._plantY : a._renderY;
                  for (var _lmi = 0; _lmi < S.monsters.length; _lmi++) {
                    var _lm = S.monsters[_lmi];
                    if (!_lm || !_lm.alive) continue;
                    var _lmx = (typeof _lm.renderX === 'number') ? _lm.renderX : _lm.x;
                    var _lmy = ((typeof _lm.renderY === 'number') ? _lm.renderY : _lm.y) - monsterBodyOffsetY(_lm.archetype || _lm.type);
                    var _ldx = _lmx - _lcx, _ldy = _lmy - _lcy;
                    if (_ldx * _ldx + _ldy * _ldy > 100 * 100) continue;   /* outside the 100px vicinity */
                    if (S._serverMonsters && S.channel) {
                      /* authoritative BASE ranged hit (special:false -> normal lane, 1/335ms; ticks are 500ms apart) */
                      S.channel.send({ type: 'monster_damage', payload: { monsterId: _lm.id, zone: S.currentZone, element: _lElem, slot: 'ranged', special: false } });
                    } else {
                      _lm.curHp -= _lBase;
                      if (_lm.curHp < 0) _lm.curHp = 0;
                    }
                    if (!S.dmgNumbers) S.dmgNumbers = [];
                    pushDmgPopup(S, _lm.x, monsterPopupY(_lm, -10), _lBase + '', '#ffe08a', { iconKey: 'arrow' });
                  }
                }
              }
              return _pAge < _pLife;
            }
            /* v2.3.213: fall back to inert object when unarmed so
               arrow tick doesn't crash on .type/.tierMult reads. */
            var activeWpn = (S.rpg && getActiveWeapon(S.rpg)) || { element1: null, element2: null };
            var pDmg = S.rpg ? calcWeaponDmg(activeWpn.type || 'greatsword', S.rpg || {}, activeWpn.tierMult || 1, activeWpn) : 10;
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
              /* v2.3.1770: gravity is an ACCELERATION — the velocity gains
                 0.9 per 60fps-frame and the position gains that velocity, so
                 both terms take the scale or a spent arrow falls at the
                 refresh rate too. */
              var _fdt = S._dtScale || 1;
              a._fallVy = (a._fallVy || 0) + 0.9 * _fdt;
              a._plantY = (a._plantY != null ? a._plantY : a._plantStartY) + a._fallVy * _fdt;
              a._renderX = a._plantX;
              a._renderY = a._plantY;
              a.ang = a.ang + (Math.PI / 2 - a.ang) * 0.35;   // rotate to straight-down
              if (a._plantY - a._plantStartY >= 26) {
                a.planted = true; a.plantedAt = Date.now(); a.ang = Math.PI / 2;
              }
              return true;
            }
            /* v2.3.1135: Longshot — bow arrows fly faster (same multiplier
               scales the plant threshold below, so speed AND reach grow
               together and flight TIME stays constant). */
            /* ═══ v2.3.1770: AN ARROW FLIES AT A SPEED, NOT AT A FRAME RATE ═══
               The same defect v2.3.1769 fixed for the player, in the system it
               deliberately left alone.  Both terms below were per FRAME, and
               because BOTH were, total range came out fps-independent by
               accident — 8px x N frames of life is the same distance on any
               screen.  What was NOT independent is how long that takes: on a
               144Hz monitor the arrow covered its range in 40% of the time and
               vanished 2.4x sooner, so a shot that led a moving target on a
               phone missed in front of it on a desktop.
               Scaling both keeps the accidental range invariance (the two
               scale together) and makes the flight TIME the same everywhere,
               which is the half that was broken.
               `life` becomes fractional — every reader compares or divides
               (`life <= 0`, `life / 20` for the fade), none index by it. */
            var _pdt = S._dtScale || 1;
            if (_released) a.dist += (a.isStaff ? 5 : 8 * (a._rangeMult || 1)) * _pdt;
            a.life -= _pdt;
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
              /* v2.3.1335 (owner): bow range -25% (900 -> 675). */
              if (_edge || a.dist > 675 * (a._rangeMult || 1)) {
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
              /* v2.3.1426: a stuck special takes no further hits -- the
                 bow special pierces, so without this gate it would keep
                 chaining through monsters after embedding in one.
                 v2.3.1435: the staff-special volley shares volleyHitIds
                 -- one orb per monster; sister orbs pass it and fly on
                 to the rest of the pack (owner: special was 4-hitting
                 single monsters). */
              if (!m.alive || a.hitIds.has(m.id) || (hit && !a.pierce) || a.stuckIn
                  || (a.volleyHitIds && a.volleyHitIds.has(m.id))) return;
              /* Same y-offset fix as the melee path — fodder slimes
                 render at 96 px anchored at the feet, sprite mid-frame
                 at m.y - 40, so projectiles aim there (v2.1.72).
                 Snowman is taller (64 px sprite anchored to the feet
                 at m.y + 13), visual center ~19 px above m.y and arms
                 that extend outward — needs both the y-offset and a
                 wider radius. */
              /* v2.3.1111: Y offsets now come from the shared body-centre
                 table (monsterBodyOffsetY -- same values this block carried
                 inline).  Radii stay per-archetype below. */
              /* v2.3.1535: same reskin resolution as the melee path -- a
                 variant used to miss every case here and keep the bare
                 default radius while monsterBodyOffsetY put its centre at
                 the feet.  See hitShapeOf. */
              var _archProj = hitShapeOf(m.archetype || m.type);
              var _hitR = a.isStaff ? 30 : 18;
              if (_archProj === 'fodder') {
                /* Slime body is wider than the 18 px default — bump
                   the radius so arrows that visually hit the body
                   register.  Same intuition as the melee +20 bonus. */
                _hitR = a.isStaff ? 38 : 26;
              } else if (_archProj === 'fireGoblin') {
                _hitR = a.isStaff ? 40 : 26;
              } else if (_archProj === 'snowman') {
                _hitR = a.isStaff ? 44 : 32;
              } else if (_archProj === 'mummy' || _archProj === 'skeleton') {
                _hitR = a.isStaff ? 50 : 40;
              } else {
                /* v2.3.1536: sprite-less archetypes (the dungeon roster --
                   brute / swarm / sentinel / volatile / stalker / hexer)
                   render as a 48px-radius circle but had no case here, so
                   they kept the bare 18 default and a visibly-connecting
                   shot passed through (owner: "the special arrow correctly
                   hits the slime but not the procedural ones").  Match the
                   drawn body; keep the default for anything that returns 0. */
                var _procR = monsterProceduralRadius(_archProj);
                if (_procR > 0) _hitR = Math.max(_hitR, _procR);
              }
              /* v2.3.1136: Detonation channel widens staff bolt blasts
                 (+0.7%/pt, cap +69.3%) before the special multiplier. */
              if (a.isStaff && S.rpg) _hitR *= staffAoeMult(S.rpg);
              /* v2.3.222: special arrow has 3x damage radius. */
              if (a.isSpecial) _hitR *= 3;
              /* v2.3.1111: hit-test against the RENDERED position when the
                 monster is interpolating (server-driven monsters draw at
                 renderX/Y, trailing the logic m.x by ~4 frames of motion) --
                 a visually-on-target shot at a walking monster used to miss
                 in the travel direction because the hitbox led the sprite. */
              var _hitX = (typeof m.renderX === 'number') ? m.renderX : m.x;
              var _hitBaseY = (typeof m.renderY === 'number') ? m.renderY : m.y;
              var _mProjY = _hitBaseY - monsterBodyOffsetY(_archProj);
              if (Math.sqrt(Math.pow(_hitX - a._renderX, 2) + Math.pow(_mProjY - a._renderY, 2)) < _hitR) {
                a.hitIds.add(m.id);
                if (a.volleyHitIds) a.volleyHitIds.add(m.id);   /* v2.3.1435: claim for the whole cone */
                var arrowElem = a.isSpecial ? activeWpn === null || activeWpn === void 0 ? void 0 : activeWpn.element2 : activeWpn === null || activeWpn === void 0 ? void 0 : activeWpn.element1;
                if (arrowElem) {
                  var _ELEMENTS$arrowElem;
                  var statusId = (_ELEMENTS$arrowElem = ELEMENTS[arrowElem]) === null || _ELEMENTS$arrowElem === void 0 ? void 0 : _ELEMENTS$arrowElem.status;
                  if (statusId) {
                    applyStatus(m, statusId, S.player, Date.now());
                    /* §12.2 cert — first elemental status applied (ranged). */
                    masteryEarnCert('first-status');
                    /* v2.3.1747: combo "Next" status extension removed with the chain. */
                  }
                }
                var arrowCollision = null;
                if (arrowElem && S.rpg) {
                  arrowCollision = resolveCollision(m, arrowElem, S.player, S.rpg, Date.now());
                }
                if (m._invulnerable) {
                  pushDmgPopup(S, m.x, m.y - 20, 'IMMUNE', '#888');
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
                    pushDmgPopup(S, m.x, m.y - 44, _wlR.cat.toUpperCase() + ' Lv ' + _wlR.level + ' · +' + _wlR.points + 'pt', '#5b52ff');
                    try { BT_AUDIO.levelUp(); } catch (e) {}
                  }
                }
                if (S._serverMonsters && S.channel) {
                  S.channel.send({ type: 'monster_damage', payload: {
                    /* v2.3.1114: carry the projectile's element -- the
                       server now drives authoritative statuses/DoT/
                       collisions from it (melee always sent it; this was
                       null, so bow/staff builds had no server elemental). */
                    monsterId: m.id, zone: S.currentZone, element: projElem || null,
                    /* Arrow path = ranged; worker uses this to deny the
                       melee-only lifesteal even if activeSlot drifted
                       (that gate is slot-keyed, so special can't leak it).
                       Server rolls the damage.
                       v2.3.1238: ranged specials declare special:true.
                       This was hardcoded false ("ranged shots are never
                       special") -- wrong: the bow heavy and the staff
                       3-bolt cone are BOTH projectiles spawned with
                       isSpecial:true (playerActions.js).  The worker's
                       hit-cadence floor (server/src/combat.js v2.3.1134)
                       was built with a special lane (<=3 hits/1200ms per
                       monster) EXPLICITLY so the staff cone can land all
                       3 bolts on one target -- but with special:false
                       those bolts fell into the normal 335ms lane and
                       bolts 2-3 were silently dropped, and every ranged
                       special forfeited the server's Mind-scaled 2x
                       special roll (_computeAttackDamage).  Net effect:
                       authoritative ranged-special damage came in far
                       under the client's predicted popups ("kills slowed
                       down after bow/staff specials").  Trust model
                       unchanged: melee has always declared client-side
                       special (monsterCombat.js:1551) and a forged
                       special:true is bounded by the same existing lane
                       cap + _maxDmgForAttacker special headroom.  The
                       special lane shipped v2.3.1134 (on main, deployed)
                       so no caps gate is needed; old clients keep
                       sending special:false and keep the old lane. */
                    slot: isStaffProj ? 'staff' : 'ranged', special: !!a.isSpecial
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
                  pushDmgPopup(S, m.x + 8, monsterPopupY(m, -30), _arPrefix + arrowCollision.damage + ' ' + coll.name, _arColor);
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
                    pushDmgPopup(S, P.x, P.y - 45, '+' + arrowCollision.manaRestored + ' MP', '#3b82f6');
                  }
                  BT_AUDIO.collisionSound(arrowCollision.setupElement, arrowCollision.triggerElement, arrowCollision.manaRestored);
                  for (var cp = 0; cp < 12; cp++) {
                    S.hitParticles.push({ x: m.x + (Math.random() - 0.5) * 6, y: m.y + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5 - 2, life: 0.7, color: elemCol, size: 2 + Math.random() * 2 });
                  }
                  S.screenShake = Math.max(S.screenShake, 4);
                  BT_AUDIO.beep(400, 0.1, 0.12, 'sine');
                  var isNew = discoverCollision(coll.id);
                  if (isNew) {
                    pushDmgPopup(S, P.x, P.y - 60, 'NEW: ' + coll.name + '!', '#f5c542');
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
                   back 3x.  v2.3.1356: owner — monster bounce-back
                   reduced 75% (23/8 -> 6/2; ratio kept).
                   v2.3.1402: owner — all knockback -50% (6/2 -> 3/1). */
                /* v2.3.1476 (owner: "remove regular arrow attack knockback
                   by 75%"): the REGULAR arrow drops 1 -> 0.25.  Scoped to
                   arrows: the special keeps its 3 (it is the heavy shot's
                   whole read), and staff bolts keep 1 — they are not
                   arrows, and nothing was said about magic. */
                var _projKb = a.isSpecial ? 3 : (a.isStaff ? 1 : 0.25);
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
                    /* v2.3.1534: match on the SHEETS the monster renders with,
                       not on its name.  applyZoneVariant overwrites BOTH
                       m.type and m.archetype with the variant key, so a
                       Verdant Wilds slime arrives here as 'mossSlime' and
                       never matched 'fodder' -- it fell through to the generic
                       6/6/0 branch below, which has NO y-anchor, so arrows
                       planted at the slime's FEET instead of in its body
                       (owner: "the arrows don't stick in the slimes at the
                       correct hitbox").  fireGoblin only looks fine because
                       somebody added a branch for it by name; every other
                       variant had the same bug.  useSlimeSheets is the honest
                       predicate -- it is exactly "this renders as the 50px
                       slime", which is what the ellipse below was measured
                       against -- and it covers mireWisp in the Poison Forest
                       too.  Deliberately NOT baseArchetypeOf(): mummy and
                       skeleton are base-'fodder' but render as 96px upright
                       creatures, so slime anchors would be wrong for them. */
                    var _saIsFodder = hitShapeOf(_saArch) === 'fodder';
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
                pushDmgPopup(S, m.x, monsterPopupY(m, -10), _displayDmg + '', '#ff9', { iconKey: a.isStaff ? 'spell' : 'arrow', special: !!a.isSpecial });
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
                    /* v2.3.1120: questTrack workers own _questKills --
                       legacy workers only (see monsterCombat.js gate). */
                    if (!(S._serverCaps && S._serverCaps.questTrack)) {
                      if (!_R9._questKills) _R9._questKills = {};
                      Object.keys(QUEST_CHAINS).forEach(function (qid) {
                        var _R9$_quests;
                        if (((_R9$_quests = _R9._quests) === null || _R9$_quests === void 0 ? void 0 : _R9$_quests[qid]) === QUEST_STATUS.active) _R9._questKills[qid] = (_R9._questKills[qid] || 0) + 1;
                      });
                    }
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
                    /* v2.3.910: combat level is DERIVED (set in recalcDerived
                       inside addBuildProg above), so no increment here.
                       v2.3.1342: shared celebrateLevelUps (full burst). */
                    celebrateLevelUps(S, _R9, { setLevelUpMsg: setLevelUpMsg });
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
                    /* v2.3.1141: server-minted drops (caps.weaponDrops)
                       supersede this local mint -- legacy-worker fallback
                       only, same as monsterCombat.js.  NOTE this path's
                       generous linear table (3%+0.1%/lvl, 60/25/12/3
                       rarity split) was never reconciled with the §4.6
                       cubic the melee path uses; the server mint unifies
                       on the cubic. */
                    var dropChance = Math.min(0.15, 0.03 + (m.level || 1) * 0.001);
                    if (!(S._serverCaps && S._serverCaps.weaponDrops) && Math.random() < dropChance) {
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
                      pushDmgPopup(S, m.x, m.y - 40, dropName + '!', RARITY_TIERS[dropTier].color);
                    }
                    setRpgState(_objectSpread({}, _R9));
                    /* v2.3.1356: debounced — this runs once PER CORPSE
                       inside the monster forEach; an unlimited-pierce
                       special one-shotting a pack used to fire N
                       synchronous full-blob writes in one frame (the
                       frozen-screen report).  See rpgSave.js. */
                    saveRpgSoon();
                  }
                  /* Kill marker removed — the damage number (capped at
                     remaining HP) plus the death effects already convey
                     the kill without a separate glyph. */
                }
                hit = true;
                /* v2.3.1426 (owner clarification of v2.3.1425): the BOW
                   special arrow EMBEDS in the monster it just hit
                   (survivors only -- a kill lets it pierce onward as
                   before, and a miss still ends in the v2.3.1402 ground
                   plant + lingering AoE).  Entry offset mirrors the
                   stuck-arrow intuition: back along the flight direction
                   so the head buries into the body silhouette; the
                   stuckIn early-return above takes over from the next
                   tick and chips the stuck monster every 0.5s.  Staff
                   orbs are back to dying on their first hit. */
                if (!a.isStaff && a.isSpecial && !a.stuckIn && m.alive && m.curHp > 0) {
                  a.stuckIn = m;
                  a.stuckAt = Date.now();
                  a.life = 999;      /* stuckAt governs removal now, not life */
                  a._stickOx = -Math.cos(a.ang) * 8;
                  a._stickOy = -Math.sin(a.ang) * 8;
                }
                /* v2.3.1135: finite pierce budget (Piercing channel).
                   pierceLeft = extra targets past the first; once the
                   arrow has hit 1 + pierceLeft monsters, clear the pierce
                   flag so the loop gate stops further hits this frame and
                   the arrow dies below.  Special arrows have pierce:true
                   with pierceLeft undefined — unlimited, unchanged. */
                if (a.pierce && a.pierceLeft != null && a.hitIds.size >= 1 + a.pierceLeft) {
                  a.pierce = false;
                }
              }
            });
            /* ── PvP projectile hits (v2.3.1302) ──
               Duel bug (owner two-player report): only the melee swing
               ever emitted player_attack, so bow arrows and staff bolts
               sailed straight through the opponent — "only melee damage
               hurt the other player".  Mirror the melee §19 intent gate
               (monsterCombat.js): report a hit ONLY on an intentional
               target — the duel opponent or a tap-locked player — never
               a bystander, so a co-op partner can't eat (or stop) a
               stray arrow.  The server's _pvpAllowed consent gate stays
               the real authority; this is just the report.  The server
               damage popup arrives via pvp_hit (gameEvents), so no
               local damage number here — impact FX only. */
            /* v2.3.1605: same duel-in-town fix as the melee gate
               (monsterCombat.js).  The safe-zone test sat AHEAD of the duel
               test, so arrows and bolts were dropped in town exactly as swings
               were — which is why "dueling only works with sword" understated
               it: in town nothing worked, and outside town only melee had ever
               been wired before v2.3.1302.  Consent overrides the zone rule;
               free-fire still needs a lawless zone and a deliberate lock-on. */
            if (!hit && S.others
                && (S._inDuel
                    || (!((ZONES[S.currentZone] || {}).safe)
                        && S.lockedTarget && S.lockedTarget.type === 'player' && S.lockedTarget.id))) {
              var _pvpTid = S._inDuel ? S._inDuel.opponent : S.lockedTarget.id;
              var _pvpO = _pvpTid != null ? S.others[_pvpTid] : null;
              if (_pvpO && !a.hitIds.has('p_' + _pvpTid)) {
                var _pvpX = (typeof _pvpO.renderX === 'number') ? _pvpO.renderX : _pvpO.x;
                var _pvpY = (typeof _pvpO.renderY === 'number') ? _pvpO.renderY : _pvpO.y;
                /* Body centre sits above the feet anchor — same intuition
                   as monsterBodyOffsetY; player sprites are fodder-scale. */
                var _pvpHitR = a.isStaff ? 34 : 22;
                if (a.isSpecial) _pvpHitR *= 1.5;
                if (Math.sqrt(Math.pow(_pvpX - a._renderX, 2) + Math.pow(_pvpY - 24 - a._renderY, 2)) < _pvpHitR) {
                  a.hitIds.add('p_' + _pvpTid);
                  var _pvpDx = _pvpX - P.x, _pvpDy = _pvpY - P.y;
                  var _pvpDist = Math.sqrt(_pvpDx * _pvpDx + _pvpDy * _pvpDy);
                  S._pvpThreat = Date.now() + PVP_THREAT_DURATION;
                  if (S.channel) S.channel.send({
                    type: 'broadcast',
                    event: 'player_attack',
                    payload: {
                      id: S.myId,
                      x: P.x,
                      y: P.y,
                      /* Exact bearing to the target + a narrow arc: the
                         server re-checks angle from the ATTACKER, so a
                         wide arc is unnecessary and exploitable. */
                      angle: Math.atan2(_pvpDy, _pvpDx),
                      /* a.dmg already includes any crit rolled at spawn —
                         critChance 0 so the server can't double-crit it. */
                      dmgBase: Math.max(1, Math.round(a.dmg || 1)),
                      critChance: 0,
                      /* Server measures attacker→target distance and
                         rejects hits past payload.range, so claim the
                         actual distance + lag slack, capped just under
                         the server's 950 ranged/staff clamp. */
                      range: Math.min(940, Math.round(_pvpDist + 60)),
                      arc: 0.9,
                      ts: Date.now(),
                      inDuel: !!S._inDuel,
                      special: !!a.isSpecial,
                      kind: isStaffProj ? 'staff' : 'ranged',
                      /* v2.3.1306: declare the single intended target so
                         the server skips everyone else in the cone — the
                         "never a bystander" promise is now enforced
                         server-side too.  Old workers ignore the field. */
                      target: _pvpTid
                    }
                  });
                  /* Impact feedback — sound + a few particles at the
                     target; damage number waits for the server pvp_hit. */
                  if (a.isStaff) BT_AUDIO.magicHit({ vol: 0.3 });
                  else { try { BT_AUDIO.play('arrow-hit', { vol: 0.6 }); } catch (e) {} }
                  if (!S.hitParticles) S.hitParticles = [];
                  for (var _pvpP = 0; _pvpP < 6; _pvpP++) {
                    var _pvpA = a.ang + (Math.random() - 0.5) * 0.8;
                    S.hitParticles.push({
                      x: _pvpX + (Math.random() - 0.5) * 4,
                      y: _pvpY - 24 + (Math.random() - 0.5) * 4,
                      vx: Math.cos(_pvpA) * (1.5 + Math.random() * 2.5),
                      vy: Math.sin(_pvpA) * (1.5 + Math.random() * 2.5) - 0.5,
                      life: 0.4 + Math.random() * 0.2,
                      color: a.isStaff ? '#a78bfa' : '#ffd79a',
                      size: 1 + Math.random() * 1.5,
                    });
                  }
                  hit = true;
                }
              }
            }
            /* Non-piercing arrows die on the first hit.  Piercing
               arrows survive each hit and only expire when a.life
               (line 8954, decrements each frame) hits zero -- so
               the arrow flies its full range and damages everything
               along the line. */
            /* v2.3.1425: a freshly-stuck orb survives its hit -- the
               stuckIn branch at the top owns its lifetime from here. */
            if (hit && !a.pierce && !a.stuckIn) return false;
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
          var _sdt = S._dtScale || 1;
          S.slimeProjectiles = S.slimeProjectiles.filter(function (proj) {
            /* v2.3.1770: same frame-rate term as the arrow above.  A monster's
               shot that flies faster on a faster screen gives the player less
               time to dodge it, which is the incoming half of the same unfair
               difference — worth fixing even though I could not confirm this
               path still runs (monsters are server-driven since the world
               moved to the worker; this is the local fodder-slime sim, and
               CLAUDE.md's note about client-local logic being a legacy remnant
               applies).  Two lines, correct either way. */
            proj.life -= _sdt;
            if (proj.life <= 0) return false;
            proj.x += Math.cos(proj.ang) * proj.speed * _sdt;
            proj.y += Math.sin(proj.ang) * proj.speed * _sdt;
            var pdx = P.x - proj.x, pdy = P.y - proj.y;
            if (pdx * pdx + pdy * pdy > 16 * 16) return true;
            /* v2.3.1640: a server-thrown projectile (the snowman's
               snowball) is a VISUAL ONLY — the worker scheduled its
               impact when it threw and delivers the damage itself as a
               monster_attack.  Everything below this line is the legacy
               client-authoritative slime path: it rolls its own damage,
               block and hit-react, which for a server monster would
               double-hit the player and take damage authority back to the
               client (rule zero).  Despawn on contact and let the
               server's own event draw the popup, flash and particles. */
            if (proj.displayOnly) return false;
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
            /* v2.3.1705: directional again.  The virtual point below (_atkFromX/Y,
               50px back along the projectile's own travel line) already exists
               precisely because a projectile can OVERSHOOT the player by a few px
               and make a naive test read the attack as coming from in front — so
               the arc test gets that point, not proj.x/y. */
            var pShielded = Date.now() < S.shieldEnd && isAttackInShieldArc(S, _atkFromX, _atkFromY);
            if (pShielded) {
              try { BT_AUDIO.play('shield-block', { vol: 1.0 }); } catch (e) {}
              pushDmgPopup(S, P.x, P.y - 20, 'BLOCK', '#60a5fa');
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
              /* v2.3.1113: blocked projectile trains defense (full rate).
                 v2.3.1140: ±5 valid-threat gate live -- shooter level rides
                 the projectile (srcLevel, set at spawn in monsterCombat.js). */
              trainDefense(_R6P, proj.rawDmg, 0, proj.srcLevel || null, false);
              return false;
            }
            /* v2.3.234 (Phase 4): Agility passive dodge on projectiles too.
               v2.3.1154: + Evasion channel pts, shared 30% cap. */
            var _projDodge = rollPassiveDodge(_R6P.agility, getEvasionPts(_R6P));
            if (_projDodge) {
              pushDmgPopup(S, P.x, P.y - 18, 'Dodge!', '#00d4ff');
              return false;
            }
            /* v2.3.1113: Iron Skin cut + quarter-rate defense XP on the
               taken hit.  v2.3.1140: ±5 gate live via proj.srcLevel. */
            var _projDmg = applyResilience(_R6P, applyIronSkin(_R6P, proj.rawDmg)); /* v2.3.1314 */
            var _defUpPj = trainDefense(_R6P, 0, _projDmg, proj.srcLevel || null, false);
            if (_defUpPj) pushDmgPopup(S, P.x, P.y - 34, '🛡️ Defense Lv ' + _defUpPj.level, '#60a5fa', { ts: Date.now() + 2 });
            /* v2.3.1702: the local slime orb is spawned by the local AI, so in a
               server zone the worker fired its own and will bill us for it. */
            hurtPlayerLocal(S, _R6P, _projDmg);
            trackMonsterDamage(S, proj.ownerId, _projDmg);
            if (window.__dmgLog) try { console.log('[dmg] slime-projectile', { amt: _projDmg, lifeAtHit: proj.life, ageMs: Date.now() - proj.ts, projPos: { x: Math.round(proj.x), y: Math.round(proj.y) }, pPos: { x: Math.round(P.x), y: Math.round(P.y) } }); } catch (e) {}
            try { BT_AUDIO.monsterHitHero(isWearingArmor(), { vol: 0.7 }, 'slime-projectile-hit'); } catch (e) {}
            S.lastDamageTaken = Date.now();
            S._hitFlash = Date.now();
            if (S.channel) S.channel.send({ type: 'broadcast', event: 'player_hurt_by_monster', payload: { id: S.myId, dmg: _projDmg } });
            if (_R6P.hp > 0) addBuildUse(_R6P, 'vitality', _projDmg);
            pushDmgPopup(S, P.x, P.y - 20, '-' + _projDmg, '#fff');
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
