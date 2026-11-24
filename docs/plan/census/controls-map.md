# The controls today, mapped for the two-button trial (card CT; tag 6400)

Read-only map of `main` 0aec6482, taken 2026-11-23 by a reviewer on the top
model for the owner's request of that day (card CT has the request's words).
"BT" is `src/ui/BroTown.jsx`. Line numbers move: find the name, not the line.

## The bottom line

- **No new message, field or cap is needed for 8 facings.** A turn while
  standing already rides `move` (`f`, 8-way; `_facingChanged` is in the send
  gate, BT:8006, 8119). The work is on the page and in the tests.
- **The owner has changed this three times.** 2026-09-03 (v2.3.2242): the
  right stick became "a slightly larger contextual button"; then v2.3.2258:
  "I want both joysticks back"; 2026-11-09: tap-to-target removed ("easily
  botted and abused"), the sword's invisible nearest-monster lock kept;
  2026-11-13 (v2.3.5018): "I like combat better the old way. You just move
  the right joystick towards the enemy and it attacks as long as it is held
  down." Live combat is that: mode 4 of `src/game/manualCombat.js`.
- **The phone tests do not play the live mode.** About 120 scenarios drive
  the held attack and the lock in mode 0 (`tools/qa/mp/harness.mjs:627`);
  there is no aim or attack helper in the harness, each dispatches its own
  touches.
- **The stick's geometry.** Its travel is 17.5 px upright and 25 px sideways
  (BT:10252), its dead zone 12 px (10269): 30% of today's travel is inside
  the dead zone. The same thumb already means a tap (10 px, 200 ms), a
  double tap (the weapon) and the dodge swipe.
- **Four jobs live on the surface the request removes**: a staff's bolt
  steered by the finger, the flick special, the harvest gesture on the
  disc, and the tap that opens a door or talks. Card CT gives each a home.
- **Input has no step of its own** (card M): stick to velocity (BT:5370-5399),
  speed and backpedal (5620-5668), the disc's resolver (6157-6771) and the
  move's send (8002-8163) are all in `legacy`.
- **Files a redesign touches** (lines naming the input fields): BT 225;
  `monsterCombat.js` 66; `game.css` 50; `effectsRenderer.js` 50;
  `entityRenderer.js` 44; `tapJump.js` 28; `targeting.js` 23;
  `TouchControls.jsx` 22; `QuestCoach.jsx` 22; `abilities.js` 18;
  `src/state/ui.js` 16; about twenty more under 12 each. Server: none.

## The reviewer's notes, as taken

HEAD 0aec6482 (2026-11-23). Files sized: BroTown.jsx 15943 lines, harness.mjs 2657, combat.js 2810, hits.js 397.
Candidate files (grep stick/joystick): src/ui/panels/TouchControls.jsx (33), BroTown.jsx (174), src/game/manualCombat.js, tapJump.js, desktopControls.js, targeting.js, jump.js, sprint.js, dodge.js, staffFeel.js, controlVisibility.js, panels/JumpButton, ShieldButton, SprintButton, SpecialButton, AbilityButtons, WeaponPill, controlSkin.jsx

## A. Controls today (verified by reading)
- TouchControls.jsx:130-625 render-only. L zone `[data-joyzone=L]` left 50% full height (158), R zone right 50% (163), both z6 touchAction none. L disc `.bt-joystick-zone` (168-300) pointerEvents none, base 75/90 px, knob 42/48. R disc `.bt-rjoy-zone` > `.bt-rjoy-base` (rJoyRef, 340-399) = the touch target, RBTN.w 96/108 (later 84/94?), AimReticle picture (489). SprintButton, RideButton, QuickEatButton, JumpButton rendered at 167.
- BroTown.jsx handleJoystickMove 10221-10285: origin = touch-down point (docked stick, relative drag, v2.3.949); maxR = base.width/2 - 20 (= 17.5 px upright 75 base; 25 px landscape 90 base); DEADZONE 12 px (10269); strength=(dist-12)/(maxR-12) clamp 1 -> S.stickX/Y analog. handleJoystickEnd 10286-10307 zeroes S.stickX/Y.
- handleRBtnPress 10327-10440: stamps S._atkPressAt, promotes auto lock to tap lock only if tapLockOn() (manual=0), S._atkPending or S.autoAttack=true, then maybeSwordDash(S) (lunge) unless manualOn().
- rKnobFollow 10451-10487 (maxR = width/2-18), rJoyAim 10488-10529: dead 8 px (10493); writes S._facing (4-way quantised 10498-10505), S._aimAngle, S._lastAimAngle, S._aiming=true, S._aimSrc='stick', S.autoAttack=true.
- handleRBtnRelease 10530-10567: clears _atkPressAt/_atkHoldUntil/_atkPending, autoAttack=false, _aiming=false.
- manualCombat.js: modes (229-265): DEFAULT = 4 "held combat" (v2.3.5018, owner 2026-11-13 "I like combat better the old way. You just move the right joystick towards the enemy and it attacks as long as it is held down. A swipe on the right joystick activates the special attack."), 0 = old combat + tap lock (the phone tests' own: harness adds manual=0), 1 swipes, 2 slingshot bow, 3 free-swing trial. tapLockOn() only mode 0. MANUAL consts 143-194 (SWIPE_PX 24, SWIPE_MS 280, CENTRE_PX 8, QUICK_MS 350, ASSIST_DEG 12).
- Touch handlers (BroTown.jsx, one useEffect, bound 11978-12046): lS 11194 / lM 11229 / lE 11241 (left zone: walk; tap<200ms & <10px = forward click to canvas + weapon-swap preview; double tap within 220 ms/50 px = cycle weapon 11301-11309; self tap = chat; non-tap release -> handleCanvasSwipe = dodge roll flick 11372).
  Tap consts 11178-11183: DOUBLE_TAP_WINDOW_MS 220, TAP_MAX_DURATION_MS 200, SELF_TAP_MAX_MS 400, TAP_MAX_MOVE_SQ_PX 100 (10 px), DOUBLE_TAP_MAX_DIST 50 px, PREVIEW_HOLD_MS 350.
- rS 11410 / rM 11455 / rE 11498 (right ZONE = the joystick, whole right half): press = handleRBtnPress (attack held); drag >10 px -> rJoyAim (aim + facing + autoAttack); release: flick test 11557-11558 (last leg >0.15 px/ms & >8 px & <400 ms OR total >0.2 px/ms & >15 px & <500 ms) => doSpecialAttack (11561); short tap -> resource / NPC / NML player / self chat / forwarded canvas click (lock in mode 0) / door-or-interact (_tapActIcon -> S._interactNow) / else ONE attack (requestTapAttack 11650; v2.3.3712: tap never jumps).
- bS 11662 / bM 11751 / bE 11869 (the DISC = contextual button): harvest start if S._btnHarvest && S._nearNode (11701); else handleRBtnPress (lunge) then doSwing (11749); bM: slide onto [data-shield] raises shield (11795-11813), knob follows, DISC DOES NOT STEER (11853-11866: aiming from disc broke special flick, mp-rbutton); bE: same flick test (11896) -> special with flick dir seeding aim if no lock (11917-11926).
- releaseAllTouches 11958 (page away / stale touch v2.3.3496).

## B. Facing (verified)
- TWO facings on the client: S._facing = 4-way string up/down/left/right (writers: visualSystems.js:57-58 from velocity with 0.7/1.3 hysteresis; BroTown rJoyAim 10498-10505; monsterCombat.js:1445 from lock aim; staffFeel.js:229; BroTown 9466, 11767, 11922, 13274; farmWalk 197). S._facingAngle = continuous radians slewed toward S._targetFacingAngle (visualSystems.js:60-75: 18%/frame moving, 8% standing, dt-scaled).
- RENDER facing = 8-way compass: entityRenderer.js:12396-12480 ladder: loot/mining/fishing south > dodge/dash/flip (travel angle) > climb north > bashPose > shield (S._shieldAngle) > AIM (aimAttackActive = _aimAngle!=null && (engagedStance || _backpedaling || (!isMoving && autoAttack)), 12330) > STICK (stickActive: stickX/Y != 0, 12453-12456) > moving (vx/vy) > S._facingAngle > S._facing. S._facingSrc names the branch; S._renderFacing published (12480), sent to peers as `f`.
- Art: 5 authored facings + 3 mirrored = 8; no sideways strafe strip: forward jog or REVERSED jog picked by dot product (12320-12322, isMovingBackward 12344-12348).
- Facing CAN differ from movement today: with a lock/engagedStance or aiming, body faces aim and legs jog backwards (12308-12348). v2.3.1837: "a turn is a facing" -- facedAng stamps S._targetFacingAngle so idle keeps last faced (12468).
- TURN IN PLACE today? The 'stick' branch faces the stick whenever stickX/Y != 0 -- but stickX/Y are 0 inside the 12 px dead zone, so there is NO turn-without-walk zone on the left stick. Right stick drag turns in place (aim) but also sets autoAttack=true (10528).

## D (part). Targeting
- targeting.js: autoAcquires 405 (melee only auto-locks; bow/staff never), TARGET_PERIMETER_PX 220, MELEE_PERIMETER_K 2 -> 440 px ring for sword (420-423), hysteresis x TARGET_HYST (550), LOCK_FAR_PX 1700 (370), updateTargeting 513 = single writer of the auto lock (nearest), S._targetCands only for melee (551), engagedStance 762, isTapLock 740. tapLockOn() false in default mode 4 => chosen locks dropped each frame (533-535).

## C. Wire (verified so far)
- Client move payload built in wsClient.js:5906-5961 (the batcher's _pendingMove): type move, x, y, d (4-way dir), f (8-way render facing), eqc/eql/eqs (look), ex (harvest), z, vx, vy, dodging, blocking, ba (shield angle, else _facingAngle; null when not blocking), dead, sp (sprint), pd (path). NO aim angle on the move. act('move', ...) call sites: BroTown.jsx 5061, 5235, 5295, 8144 (main per-frame one, to read) + others.
- actions.js rows: move A('move') :57; monster_damage A('claim') :62; ability A('aftermove') :279; ability_use :273; player_attack A('attack',{req:1}) :389; player_dodge :424, player_jump :426, player_projectile :427, player_swing :430 (batch relays).
- server/src/wire/in.js:39-49 `move` row -> movement.js _handleMove: trust x,y bounded:MOVE_BUDGET; z request; sp, pd request; vx, vy CLAIM; blocking bounded:_guardBrokenUntil; ba CLAIM; dodging bounded:_rollOn; d CLAIM; f CLAIM; "no d or f keeps the facing; no ba guards the front arc of f or d".
- in.js:170-181 `player_attack` (PvP) -> combat.js _resolvePvPAttack: kind, range bounded PVP_TUNING.RANGE_CAP, arc, angle bounded, target request, special, sw, orbs, part, sn, nb.
- in.js:182-193 `monster_damage` (PvE) -> combat.js _handleMonsterDamage: trust monsterId request, zone request, slot bounded:_hitWeaponOk, special/orbs bounded:_pveSpecialTake, part, sw bounded:_fsSwing, noKb claim, sn. NOTE (in.js:191): "the message itself: claim ('my hit landed': the worker tests NO swing, facing, arc or line of sight)". => PvE hit test/arc/sight is CLIENT side; server bounds reach + cadence only.
- relays.js: player_dodge :159, player_jump :175, player_projectile :183, player_swing :228.

## Movement step + direction ladders (verified)
- BroTown.jsx:5370-5399 movement input: dx,dy = S.stickX/Y (zero when stunned/dead/loot-frozen); keyboard WASD/arrows only if stick is 0 (5382-5393, normalised diagonal); P.dir 4-way from input (5397-5398). Sprint decided 5470-5480 (key Shift; `attacking: autoAttack||isSwinging||_bashDash` ends a sprint). Jump tickJump 5416.
- MELEE swing direction (monsterCombat.js:2047-2060): locked target (auto nearest for a sword) > S._aiming && S._aimAngle (right stick) > tapSwingAim (the way the body faces) > S._facing 4-way. Client hit test: SWING_RANGE 50 x meleeRangeMult, SWING_ARC 0.85pi (gameSystems.js:6350-6351), greatsword GS_INNER 38 / GS_OUTER 72 (6405-6406), contact at MELEE_CONTACT_MS 120 (6379); test at monsterCombat.js:2098-2242.
- RANGED aim ladder combatHelpers.js:176-192 rangedAimAngle: lock (torso) > S._aiming+_aimAngle > S._lastAimAngle > S._facingAngle > S._facing.
- Lock writes aim each frame: monsterCombat.js:1429-1448 (if lock && (autoAttack || engagedStance)) -> S._aimAngle, _aimSrc='lock', S._facing.
- BOW SIGHT GATE (client): monsterCombat.js:1546-1608 S._bowSight = {ang, d (dist to first hit or null), id, ox, oy, lp, reach} from firstSightHit(grip, angle, len = min(BOW_RANGE_PX 675 x bowRangeMult, view edge + arrowSureReachPast)); "the bow looses only at something" (1596); playerActions.js:170 refuses a shot when !_bowSight.d. Drawn by effectsRenderer.js:8309+ (BOW_SIGHT_BEAM_ENABLED), bowFeelFx.js:64.
- SERVER reach: combat.js:1316-1345: melee claim within _swordReach() = SWORD_SWING.REACH_PX 150 if `swordswing: true` else PVE_MELEE_RANGE 400 (index.js:919; swordswing.js:41,56); bow/staff within hitproof.js:206 _hitReach = ARROW_PX 675 x rangeMult + slack (150 bow / 250 staff) + run; Wheel RANGED_MAX 3600 (wheelzone.js:133). PvP RANGE_CAP melee 250 / ranged 950 / staff 950 (combat.js:2331). Cadence floor 210 ms per (player, monster) (combat.js:1386-1405).
- Client range tables: gameSystems.js STAFF_RANGE_PX 675 (3137), BOW_RANGE_PX 675 (3191), TARGET_PERIMETER_PX 220 (6361), TARGET_HYST 1.25 (6366). Suites naming them: bow-path, bow-reach, arrowblast, peer-shots, spar (server/test).

## Desktop (verified)
- desktopControls.js keydown: Space jump (229-233; 2nd press in air = flip), X dodge roll in WASD dir else mouse aim else facing (237-258), Z skateboard (262), T (275), V quick eat (288), R whirlwind (300), E interact / shield bash while blocking (307), Q shield toggle (392), Tab cycle weapon (402), 1/2/3 weapon slot (412-422), F/G element burst (433), C chat (440), B emotes (455), H (468), M map (490), Enter (503), Esc (513). Shift = sprint (BroTown.jsx:5474). WASD/arrows walk (BroTown 5382-5393). deskKeys.js = letters table (NAV_KEYS I P J L K O U, MAP_KEY M, RIDE_KEY Z, WEAPON_KEYS 1 2 3); double-tap direction key = roll (deskCombos.js DBL_TAP_MS 250).
- Mouse: onMouseMove BroTown.jsx:13267-13274 S._mouseAimAngle always; S._aimAngle only while autoAttack||_aiming (aimSrc 'mouse'); S._facing from mouse. onMouseDown 13276-13355: right button = special / (shield) via _deskRightPress; left = _deskPressTarget (10879: click on something you use is not a swing) else aim at cursor + autoAttack + _aiming, then _deskLungePress (10820: lock monster under cursor/promote lock + maybeSwordDash) else doSwing. onMouseUp 13357: autoAttack off.
- Jump on phone: JumpButton only (tapJump.js:186-205 jumpButtonWanted default on; v2.3.3712 tap never jumps); triggerJump jumpActions.js:61 (2nd press in air = flip), direction = held stick (heldDirection 41-54). Dodge: fast swipe in LEFT zone -> handleCanvasSwipe BroTown.jsx:9242-9255 (speed >= 0.8 px/ms, dist >= 30 px, duration <= 300 ms) -> triggerContextualDodge (dodge.js: dodge / lunge / retreat-shot). Sprint: SprintButton toggle (north of attack disc since v2.3.3106), stamina. Skateboard: RideButton (in Shield Bash's place when no fight near), safe ground only.
- Geometry ShieldButton.jsx: RBTN {right 50, bottom 80, w 84, wLand 94, rightUp 36, bottomUp 72} (58); LBTN {left 12, leftLand 16, bottom 70, w 83, wLand 98} (84). JOY_FADE_MS 2000 (BroTown.jsx:99). TAP_FREE_MAX_MS 320 (tapJump.js:69), TAP_ATTACK_WAIT_MS 600 (231), ATTACK_FACE_MS 1200 (154).

## C (more, verified)
- Per-frame move send BroTown.jsx:8006-8160: gate (8119) = >22 ms since last AND (isMoving || _facingChanged || _exChanged || _exHeartbeat || _justStopped || _blockChanged || _baChanged || _deadChanged || _gearChanged || _posChanged) OR idle keepalive (1 s; quiet phone: once then every KEEP_QUIET_MS ~10 s). _facingChanged = S._renderFacing !== S._lastBroadcastFacing (8006). So a TURN WHILE STANDING ALREADY SENDS A `move` (f: 8-way) -- one message per 45-degree sector crossed, 22 ms throttle. No new field/message/cap needed for 8-way turning in place; a finer angle WOULD need a field.
- Server movement.js:913-926: ps.d (4-way) and ps.f (8-way) stored as claims, held to form by _mfFacing (MOVE_FIELDS, `movefields` switch); relayed in tick.js:551-552 (f, d to peers). Server uses of facing: only the shield arc default (hits.js:253 _blockArcCovers; `ba` else f/d). PvE hit = claim; no server facing/arc/sight check (wire/in.js:191). PvP player_attack carries angle/arc/range bounded (combat.js:2331-2403+).
- CAP_GATES lives in src/ui/panels/DevPanel.jsx:231 (guards: tools/guards/lib/capGates.mjs).

## E. Phone scenarios touching sticks / aim / lock / lunge / bow path / facing (auto-listed: file | tags | header line)
- mp-arena.mjs | disc lock |  THE ARENA IN THE WORLD: A WHOLE TOURNAMENT ON PHONES (v2.3.3713) 
- mp-armorgrade.mjs | stickXY facing |  WORN ARMOUR SHOWS ITS GRADE (v2.3.3142; v2.3.3953: a soft glow outside it, on every facing) 
- mp-battlemem.mjs | aim sight |  WHAT AN INTENSE BATTLE HOLDS, ROUND AFTER ROUND (v2.3.3698) 
- mp-beltstandin.mjs | manual |  v2.3.5560: THE CHAIN BELT'S STAND-IN (beltHold.js) 
- mp-bodyfacing.mjs | stickXY facing |  v2.3.3864: THE BODY IN EVERY FACING, ON A PHONE 
- mp-bodyretry.mjs | stickXY facing |  v2.3.3882: THE BODY COMES BACK AFTER ITS SHEET FAILED TO LOAD FOR A WHILE 
- mp-bowfeel.mjs | Lzone/Rzone aim lock mouse manual | mp-bowfeel (v2.3.4802): THE BOW'S FEEL on a phone in the Wheel.
- mp-bowprops.mjs | aim lock sight |  THE BOW SHOOTS PROPS, BUILDINGS INCLUDED (v2.3.3206) 
- mp-buildingfire.mjs | aim lock |  A BUILDING YOU KEEP HITTING CATCHES FIRE (v2.3.3230) 
- mp-burnfire.mjs | stickXY |  A FIRE GOBLIN'S BURN IS THE BUILDING'S FIRE (v2.3.3878) 
- mp-comeback.mjs | Lzone/Rzone disc stickXY |  v2.3.3496: BACK INTO THE GAME AFTER LEAVING IT, ON A PHONE 
- mp-crowdfight.mjs | aim |  v2.3.3754: WHAT A CROWDED FIGHT COSTS A PHONE'S MEMORY 
- mp-crowdsweep.mjs | manual |  THE CROWD TOUR: WHAT A CROWD OF DIFFERENTLY-DRESSED PLAYERS HOLDS THE PAGE FOR (v2.3.4499) 
- mp-deskclick.mjs | disc mouse |  A CLICK ON SOMETHING YOU USE IS NOT A SWING, AND THE PRIZE FLIES TO THE BAG (v2.3.3470) 
- mp-deskharvest.mjs | disc lock mouse |  A COMPUTER CAN FINISH A HARVEST; A SIDEWAYS PHONE STILL DOES (v2.3.3407) 
- mp-deskkeys.mjs | aim lock lunge mouse roll |  A COMPUTER'S KEYS, ON THE BUTTONS THEY PRESS (v2.3.3407) 
- mp-desklunge.mjs | lock lunge mouse |  A COMPUTER'S SWORD CLICK LUNGES, AS A PHONE'S PRESS DOES (v2.3.3694) 
- mp-deskteach.mjs | disc |  THE FIRST-TIME TEACHING A NEW COMPUTER PLAYER MISSED (v2.3.4343) 
- mp-doublejump.mjs | Lzone/Rzone jump |  THE DOUBLE JUMP: A FLIP, TIMED FOR DISTANCE (v2.3.3682) 
- mp-dungeonfix.mjs | lock |  THE DUNGEON FIXES, ON A PHONE, IN THE WORLD (v2.3.3556, docs/specs/dungeon-fixes.md) 
- mp-edgeguard.mjs | stickXY |  THE BUTTONS AT THE SCREEN'S LEFT EDGE ANSWER A TAP (v2.3.3407) 
- mp-elemhits.mjs | stickXY roll |  A MONSTER'S HIT CARRIES ITS ELEMENT (v2.3.2996) 
- mp-farmwalk.mjs | Lzone/Rzone disc |  THE FARM YOU WALK, ON A PHONE (v2.3.3136) 
- mp-firefight.mjs | Lzone/Rzone jump |  A FIGHT WITH THE FIRE GOBLINS, THE SCREEN WATCHED (v2.3.3017) 
- mp-folkpass.mjs | Lzone/Rzone |  v2.3.4098: TOWNSFOLK NEVER BLOCK YOU -- on a phone and a computer 
- mp-framepack.mjs | aim sight |  A MONSTER STRIP'S NUMBERS KEPT DEFLATED A FRAME AT A TIME (v2.3.5257) 
- mp-freeswing.mjs | disc lock manual | mp-freeswing (v2.3.4520): THE FREE-SWING TRIAL on a phone in the Wheel.
- mp-garmentspecks.mjs | lock lunge mouse roll |  THE TROUSERS AND BOOTS ARE PAINTED WHERE THEY ARE (v2.3.3658) 
- mp-ghostaudit.mjs | facing mouse roll jump |  v2.3.3668: THE GHOST AUDIT -- EVERY ANIMATION, NOTHING OF THE BODY UNDER IT 
- mp-greatswordcopper.mjs | aim lock |  OLD WOODEN GREATSWORDS BECOME COPPER, AND COPPER LOOKS LIKE COPPER (v2.3.3980) 
- mp-headframes.mjs | aim |  v2.3.3860: A HEAD PIECE IS NEVER A FRAME LATE 
- mp-heapdiff.mjs | Lzone/Rzone |  WHAT THE HEAP GAINS ON EACH TRIP (v2.3.3661) 
- mp-heldcombat.mjs | Lzone/Rzone lock manual |  v2.3.5018: THE HELD COMBAT IS THE GAME'S AGAIN 
- mp-heldsweep.mjs | Lzone/Rzone mouse manual |  THE WHOLE-GAME SWEEP: EVERYTHING THAT HOLDS THE PAGE, BY NAME (v2.3.4470) 
- mp-jump.mjs | Lzone/Rzone stickXY roll jump |  JUMPING (v2.3.3017) 
- mp-jumpbtn.mjs | Lzone/Rzone disc lock jump |  THE JUMP BUTTON, BACK FOR EVERYONE (v2.3.3681) 
- mp-killxp.mjs | Lzone/Rzone mouse |  A KILL'S XP, THE MOMENT IT DIES, JUMPING INTO THE BAR (v2.3.3893) 
- mp-lagoonclimb.mjs | facing jump |  THE LAGOON ISLET: SWIM TO IT, CLIMB IT, FLIP UP TO ITS LEDGE (v2.3.3994) 
- mp-lockreticle.mjs | lock mouse |  THE LOCK YOU CHOSE WEARS A RETICLE (v2.3.3876) 
- mp-longplay.mjs | Lzone/Rzone mouse |  FIVE PLAYERS, A LONG SESSION: DOES ANYTHING GROW? (v2.3.3661) 
- mp-manualcombat.mjs | Lzone/Rzone disc aim lock sight mouse manual |  MANUAL COMBAT ON A PHONE AND A COMPUTER (v2.3.4395, docs/specs/manual-combat.md) 
- mp-membudget.mjs | Lzone/Rzone |  THE MEMORY BUDGET, CHECKED ON EVERY PR (v2.3.3101) 
- mp-monsternumbers.mjs | aim sight |  A MONSTER'S PICTURE HELD ONCE, ITS COLOURS AS NUMBERS (v2.3.3699) 
- mp-nmlask.mjs | aim lock mouse |  "ATTACK <NAME>?" ON TWO SCREENS (v2.3.3253) 
- mp-nmlfoe.mjs | aim lock sight |  A PLAYER YOU CHOSE TO ATTACK, AND THE SHIELD, ON THREE SCREENS (v2.3.3268) 
- mp-nmllock.mjs | aim lock mouse |  BEATEN BY THEM, NOT AGAIN FOR HALF AN HOUR, ON TWO SCREENS (v2.3.3770) 
- mp-npchit.mjs | aim lock | v2.3.3534: A TOWNSPERSON IS NEVER KILLED -- on a phone in the Wheel's
- mp-oneband.mjs | disc jump |  ONE DASHBOARD ON EVERY SCREEN (v2.3.4072; v2.3.4152: THE DEFAULT) 
- mp-onepic.mjs | stickXY |  v2.3.4885: ONE PICTURE PER STANDING PLAYER (?onepic=1) 
- mp-ownerwatch.mjs | manual |  WHAT PLAYERS DREW, AND HOW WELL THEY AIM: THE OWNER'S TWO NEW VIEWS (v2.3.4545) 
- mp-partychip.mjs | Lzone/Rzone disc mouse |  THE PARTY STRIP FOLDS TO A CHIP (v2.3.3768) 
- mp-phoneframe.mjs | Lzone/Rzone |  v2.3.3449: WHERE A PHONE'S FRAME GOES 
- mp-picsonce.mjs | Lzone/Rzone |  EVERY PICTURE FROM A FILE, HELD ONCE (v2.3.3715) 
- mp-questprox.mjs | Lzone/Rzone disc | A TOWNSPERSON TALKS WHEN YOU TAP HIM, NEVER BY WALKING UP (v2.3.3583).
- mp-quickeat.mjs | disc |  QUICK EAT, ON A PHONE (v2.3.3260, docs/specs/pvp-fights.md "Quick eat") 
- mp-recoverpay.mjs | stickXY |  NOTHING THE WORKER SETTLES IS LOST TO A DEAD CONNECTION (v2.3.3034) 
- mp-rollhit.mjs | lunge roll |  A HIT THAT LANDS MID-ROLL SHOWS ITS NUMBER (v2.3.3300) 
- mp-shieldtoggle.mjs | mouse |  ON A COMPUTER, THE RIGHT BUTTON TOGGLES THE SHIELD (v2.3.3847) 
- mp-skateboard.mjs | disc stickXY jump |  THE SKATEBOARD (v2.3.3776) 
- mp-smelt.mjs | mouse | SMELTING AT THE BLACKSMITH (v2.3.2822)
- mp-spacejump.mjs | roll jump |  ON A COMPUTER, SPACE JUMPS AND X ROLLS (v2.3.3844) 
- mp-sparfight.mjs | aim lock lunge roll |  SPARRING AS THE OWNER PLAYED IT: NOTHING TAPPED (v2.3.3267) 
- mp-speciesgc.mjs | stickXY facing |  v2.3.3870: THE MONKEY'S FACE AND SHIRT AFTER A FACING'S PICTURES WERE LET GO 
- mp-sprint.mjs | Lzone/Rzone disc stickXY roll |  THE SPRINT (v2.3.3006) 
- mp-stafffeel.mjs | Lzone/Rzone aim lock mouse manual | mp-stafffeel (v2.3.4803): THE STAFF'S FEEL on a phone in the Wheel.
- mp-swordfeel.mjs | disc lock manual | mp-swordfeel (v2.3.4800): THE SWORD'S FEEL on a phone in the Wheel.
- mp-tabidentity.mjs | manual |  v2.3.4606: WHICH CHARACTER A TAB PLAYS -- TWO TABS, ONE BROWSER 
- mp-talkenter.mjs | Lzone/Rzone disc |  TALKING AND ENTERING ARE ALWAYS TWO DIFFERENT THINGS (v2.3.4105) 
- mp-tapact.mjs | Lzone/Rzone disc lock |  THE RIGHT STICK SHOWS WHAT A TAP DOES, AND THE TAP DOES IT (v2.3.3105) 
- mp-tapattack.mjs | Lzone/Rzone lock jump |  A TAP ON THE RIGHT STICK ATTACKS ONCE, LAST -- AND NEVER JUMPS (v2.3.3712) 
- mp-tapprop.mjs | Lzone/Rzone disc lock |  BESIDE A PROP, A TAP SWINGS ONCE AND A HOLD ATTACKS (v2.3.3105; v2.3.3712) 
- mp-tapstance.mjs | Lzone/Rzone aim lock facing jump |  A TAP SHOWS NOTHING OF THE HELD ATTACK (v2.3.3145; v2.3.3712) 
- mp-textrelease.mjs | Lzone/Rzone | v2.3.3633: a destroyed Text lets go of its style (src/rendering/textRelease.js).
- mp-traitsoak.mjs | aim |  THE HEAD PIECES STAY ON THROUGH A LONG SESSION (v2.3.3700) 
- mp-trapping.mjs | Lzone/Rzone lock |  PET TRAPPING ON A PHONE (v2.3.3120) 
- mp-unseenwall.mjs | Lzone/Rzone lock |  WHAT YOU CANNOT SEE DOES NOT STOP YOU (v2.3.3145) 
- mp-weaponswap.mjs | Lzone/Rzone lock mouse |  mp-weaponswap (v2.3.4130): THE WEAPON PILL AT THE FOOT OF THE WORLD 
- mp-wheelbreak.mjs | aim lock |  THE WHEEL'S OBJECTS TAKE HITS, BREAK, AND ARE MENDED (v2.3.2995) 
- mp-wheelswim.mjs | roll |  SWIMMING IN THE WHEEL (v2.3.3003) 
- mp-xpbar.mjs | Lzone/Rzone mouse |  THE XP BAR, ON A PHONE, FROM REAL HITS (v2.3.3695) 

## E (counts, verified by grep over tools/qa/mp/mp-*.mjs; 393 scenario files)
- Harness helpers (tools/qa/mp/harness.mjs): nudge(P,key,ms) :899 (keyboard walk) 5 files/10 calls; hopGap :1739 1/1; hopTo :1794 181 files/468 calls; glideTo :1842 36/84; approachNpc :2335 17/24; equipWeapon :1464 44/76; armWorker :1521 18/21; warpToZone :1591 0. NO H.aim / H.attack / H.stick helper: scenarios drive touches themselves.
- Direct-drive pattern counts (files): joyzone 31; bt-rjoy/data-rbutton 19; dispatchTouchEvent/touchscreen/TouchEvent 113; autoAttack 41; _aimAngle family 20; lockedTarget 48; stickX/Y 13; _facingSrc/_renderFacing 7; _bowSight 6; lunge/dash 8; keyboard.* 171; mouse.* 62; __btDeskPress 4; _dodgeRoll 10; jump 13; manual= 11; dblclick 3.
- harness adds manual=0 to phone tests by default (manualCombat.js:53-55): tests play the OLD combat with tap lock, not the default (4).
- Server/guard suites on input rules: manual-combat, bow-feel, bow-path, bow-reach, draw-gather, staff-feel, weapon-feel, free-swing, perfect-strike, hit-proof, pvp-lunge, pvp-balance, pvp-extras, desk-keys, weapon-pick, swing-shown, phone-slips, shield-guard, guard-page-door, blockcost, move-budget, move-diet, move-path, sprint, ride, ride-page-door, spar, peer-shots, duel-lock, anticheat, combat-lifecycle, test-mode, leg-sync, mirror-audit; guards: frame-steps, phase-table, traps-combat-rules, traps-fight, traps-frame, traps-wire, switch-reader, screens-listed.

## F. State & structure (verified)
- Ledger = src/state/*.js (one file a system; rows {field, system, lifetime, suggested, phase, flag, writers}). Input fields mostly system `ui`: stickX/stickY (ui, never reset), autoAttack (ui, zone, flag), _aiming (ui, zone, flag), _aimAngle (ui, zone), _lastAimAngle (ui), lockedTarget (ui, zone+rejoin), _atkPressAt/_atkHoldUntil (ui), _atkPending (ui, zone, flag), _lJoyHeld/_lJoyLiveUntil/_rJoyLiveUntil (ui), _mouseAimAngle (ui), _backpedaling (ui flag), _deskPressLock, _bashDash (ui, zone), _shieldAngle (ui, death). combat: _engaged/_engagedId (zone), _targetCands, _dodgeRoll (zone), _shieldUp (death), _mc, _swingAng. movement: _jump (zone), _sprint, _ride. monsters: _bowSight, isSwinging. input: swingTimer, _specialAttack. render: _renderFacing, _facingSrc. NOT in ledger by name: _facingAngle, _targetFacingAngle, _tapAttack (check exact field names). phases.js:501-503 lists _aimSrc, _facing, _lockDroppedWhy as "not a phase".
- Phase table src/state/phases.js: doors for session, life, monster, zone, fight, duel, trade, party, ride, harvest, cook, guard (worker 225-235 `ps.blocking` down/parry/raised/broken via _guardTo moveclaims.js; page 403-410 GUARD_PAGE_WAYS), pose, race, arena, fishing, dungeon, connection, loading, window. NO phase row for attack / aim / dodge roll / jump / sprint: they are records and booleans (S._dodgeRoll, S._jump, S.autoAttack, S._atkPending, isSwinging). CLAUDE.md §5: "A phase lives in one field with one transition function: a new state is never a second boolean beside the first" -> a redesign's turn-vs-walk and attack-press states should be one field.
- Frame steps src/game/frameSteps.js:70-90 (card M, v2.3.5340-5341): legacy, tap (settleTapPress, BroTown.jsx:5022), sound, ride, zone, farm, townsfolk, monsters (updateMonsterCombat, 7636), weaponFeel, loot, peers, visual (updateVisualSystems = facing), arrows, slime, cleanup, render, afterFrame. NO `input` or `movement` step: stick->velocity (BroTown.jsx:5370-5399), sprint (5443-5490), speed/backpedal (5620-5667), move send (8002-8160), disc resolver (6157-6771) are all still inside `legacy`.
- BroTown.jsx readers: movement input 5370-5399; sprint 5470-5480; walk speed + backpedal + lock-relative 5620-5667 (autoAttack halves speed 5663); resolver of disc visibility/label/icon 6157-6771 (_rOn 6509, _lOn 6529, data-rstate 6736); move broadcast 8002-8160; handleCanvasSwipe 9242; doSwing 9260; doSpecialAttack 9371; handlers 10221-10571; touch effect 11172-12079; _deskLungePress 10820; _deskPressTarget 10879; mouse 13267-13370.

## C (server bow rules, verified by reading server/src/bowshot.js:1-64)
- bowshot (ON since v2.3.5727; kill switch `bowshot: false`): a bow claim lands only on an arrow whose `player_projectile` relay the worker counted, at the bow's own rate. bowreach (ON, v2.3.5901): monster within the arrow's flight of where the archer stood at the relay (hitproof.js _hitArrowReach: 675 x Range + 150 + 250). bowpath (ON since v2.3.5906; `bowpath: false`): monster near the relay's line (x, y, ang) and no sooner than the arrow could fly there. So the arrow's angle is on the wire in the relay (wire/relays.js:183-196: x, y, ang are `look`), not on `move`.
- swordswing.js:8-30: sword claim within REACH_PX 150 and one counted swing a cycle; described as opt-in `swordswing: true` at combat.js:1370 -- flag state NOT CHECKED.
- Sight beam drawn: effectsRenderer.js:8203-8312: shouldDraw = !isStaff && (bowFiring || (isMelee && (aimState || meleeSwinging))); aimState = _aiming || locked || autoAttack (8205); bowFiring starts `isBow && hasBow && (!!S.autoAttack ...` (8268, rest not read). Sword candidate rings effectsRenderer.js:7468-7506.

## G. Open plan work (docs/plan/status, census)
- deskkeys 8f: open red; "a sword double click's lock can land on another snowman after the first press's lunge moved the camera: to trace with desklunge" (status/RR.md:11-12, 21, 31-32). #2264 (6304) draft holds the rest of deskkeys.
- desklunge: flaky, a different step each run (census/RR-reds.md:46, 109-112); J3's #2160 (5846) timed it by wall clock (J3-reds.md:26, 104; status/J3.md:3, 12, 18).
- manualcombat 10a: red on main (status/M.md:21, M2.md:27, V7.md:12); RD #2204 (6182) "the TEST's" (status/RD.md:8; GRAND-PLAN.md:969-971). Current state not confirmed.
- headframes 25/28: to trace, test or game (RR-reds.md:44, 100-104). quietphone 4: turning with nobody near sends 20.5 a second against "at most 15" (RR-reds.md:105-108).
- bow path: K4 #2151 (5904) merged, #2168 (5906) ON (status/K4.md:9, 15, 27). jumpbtn green since #2205 (RR-reds.md:40; status/HB.md:28-29; RD.md:10, 23).
- GRAND-PLAN.md:775 step 5.4 the frame as named steps: done [x]; card M (1627).

## H. History (quotes, with where)
- docs/specs/control-redesign.md:16-53 (owner directive 2026-09-03, v2.3.2242): "The right thumbstick no longer acts as independent rotation angle. It becomes a slightly larger contextual button. Combat will rely on the auto targeting system..." Spec is 1574 lines; section 4 (256-310) is that redesign's by-file change list; sections 7-12 are the reversals.
- BroTown.jsx:11387-11389 (v2.3.2258): "I want both joysticks back and restore the previous behavior right joystick for auto attack and rotation. BUT I also want the right joystick to keep its contextual button properties that exist now."
- manualCombat.js:3-12 (2026-11-09), 27-33 (2026-11-10), 197-200 (2026-11-13, v2.3.5018: "I like combat better the old way. You just move the right joystick towards the enemy and it attacks as long as it is held down. A swipe on the right joystick activates the special attack.").
- BroTown.jsx:5638-5641 (v2.3.2246) movement revolves around the target; entityRenderer.js:12398-12400 (v2.3.1837) "direction last faced"; targeting.js:411-412 (v2.3.3595) sword ring twice as large; BroTown.jsx:10382 (v2.3.2542) weapon swap on LEFT joystick only; tapJump.js:190-192 dedicated jump button; tapJump.js:212-213 "the bow only looses when the line is on something"; BroTown.jsx:11775-11778 slide from attack to shield; TouchControls.jsx:173-174, 309-310 hide the discs unless in use.
- docs/UI-DESIGN-NOTES.md "The world screen (HUD) and the controls" (298 on) and its "Tried before, and changed" list.
- TRAPS 175 (docs/TRAPS.md:6373-6394), 229 (7883-7903), 247 (8437-8462). iOS in code: no filter over canvas (TouchControls.jsx:230-234), stale touches (BroTown.jsx:11667-11683, 11930-11966), left-edge swipe absorber (BroTown.jsx:10573).

## Synthesis
- 30% of the left stick's travel today = about 5 px upright (travel 17.5 px), inside the 12 px dead zone; tap is 10 px; dodge swipe 30 px in 300 ms; double tap swaps weapon. Geometry must change.
- No wire change for 8-way turn in place (f on move; BroTown.jsx:8006, 8119). Cost: more move sends while standing.
- Jobs on the right side with no home in a two-button layout: staff bolt steering (projectiles.js reads _aiming/_aimAngle), flick special, harvest start + gesture on the disc, tap to open a door (_interactNow), slide to shield.
- Places per file (grep count of lines naming the input fields): BroTown.jsx 225, monsterCombat.js 66, game.css 50, effectsRenderer.js 50, entityRenderer.js 44, tapJump.js 28, targeting.js 23, TouchControls.jsx 22, QuestCoach.jsx 22, abilities.js 18, state/ui.js 16, staffFeel/projectiles/playerActions 12 each, shieldToggle 11, SpecialButton 10, dodge 8, visualSystems 7, combatHelpers 5.
