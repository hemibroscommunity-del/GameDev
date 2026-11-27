# The systems (made by `node tools/guards/systems.test.mjs --write`; never edit by hand)

The grand plan's step 5.2 (card B, v2.3.5102). The table is `tools/guards/lib/systems.mjs`;
`tools/guards/systems.test.mjs` holds it on every PR: every file under `src/` and `server/src/` is in one
system or in `unsorted`, a file two systems claim fails, `unsorted` only falls (the gatekeeper lowers its
line), every door is in its system's files, and this page is what the table makes.

- **To give a file a system**: add it to that system's `files` in the table, then run
  `node tools/guards/systems.test.mjs --write`.
- **A system's files, suites, scenarios, specs and traps today**:
  `node tools/guards/systems.test.mjs --list <system>` (`--list unsorted` for the files with none).
- **Files** are placed by the patterns below. A folder's **rest** (render, ui, data) takes the files of that
  folder that no system's patterns claim. `src/game/` and `server/src/` have no rest: a new file there is
  `unsorted` until it is given a system.
- **Words** find a system's suites (`server/test/`), phone scenarios (`tools/qa/mp/`) and specs
  (`docs/specs/`): a file whose name holds one. A starting point, not a ruling.
- **Traps**: the rows of card I's census (`docs/plan/census/traps.md`) whose provisional system is one of
  these words.
- **Doors**: the one function a kind of change goes through (CLAUDE.md part 5). **Switches**: the rows of
  the switch table (`docs/SWITCHES.md`, card T) with the system's name: `node tools/guards/switches.test.mjs --list <system>`.

| System | What |
|---|---|
| [wire](#wire) | the socket and the messages: the router, the relay, the client's connection and its event switch, what each side can do (caps) |
| [session](#session) | a sitting: the join, leaving, lingering, the rejoin and what it re-sends |
| [identity](#identity) | who a player is: ids, accounts, the device lock, login keys, the account check, the sites that may open a socket |
| [bots](#bots) | telling a person from a script: bot signals, fingerprints, claims that are bounded |
| [liveops](#liveops) | the live flags, the admin and dev levers, test mode, feedback |
| [server-core](#server-core) | the worker's spine: saving, migrations, the tick, its pace, hidden settings, the room's own row |
| [ops](#ops) | the room under a crowd and the watch on it: its health for a monitor, the waiting crowd's pace, a seat held, the public boards' and the room's public reads, a guest's join |
| [combat](#combat) | hitting and being hit: weapons, abilities, the bow, shields, damage, PvP |
| [monsters](#monsters) | the monsters' lives, moves, status, spawns and the boss |
| [economy](#economy) | gold, the bag, the bank, the market and shops, trades, drops, chests and daily rewards |
| [skills](#skills) | the life skills: gathering, cooking, smithing, the farm, fishing, trapping |
| [quests](#quests) | quests, achievements, the codex, pets' book, points |
| [social](#social) | parties, clans, guilds, friends, chat, emotes, duels, the arena, races, boards |
| [world](#world) | the Wheel: zones and their doors, lands, dungeons, No Man's Land, the map, props |
| [movement](#movement) | moving: steps, sprinting, jumping, climbing, riding, swimming, resting |
| [townsfolk](#townsfolk) | the townspeople: their days, walks, talk and reactions |
| [life](#life) | a player's health and life phase: dying, the death card, respawning |
| [audio](#audio) | sound and music: cues, voices, ambience, the music deck, the Sound Studio |
| [input](#input) | touch and the controls on a phone |
| [desktop](#desktop) | a computer: keys, clicks, the wide window and its words |
| [device](#device) | what kind of device this is and how much it can draw: the profile, resolution, the view cap |
| [page-thread](#page-thread) | the page's one thread: the frame's pace and clock, what holds the page |
| [memory](#memory) | what the page holds: pictures kept on the chip or as images, colour numbers, trims and frees |
| [preload](#preload) | what loads behind the loading screen, and what loads later on purpose |
| [art](#art) | loading art in play: strips of 256 colours, the readers off the page's thread, bakes on workers |
| [look](#look) | how a character looks: traits, the look palette, garments, heads, gear on the body |
| [render](#render) | drawing the world: the Pixi renderer, the entity and effects renderers, light, fx |
| [ui](#ui) | the screens: BroTown.jsx, the band and its panels, windows, banners |
| [data](#data) | the client's tables (src/data/): items, zones, abilities, the long display and systems tables |
| [state](#state) | the state ledger: every field of S and top-of-file variable, a file a system |
| [debug](#debug) | the crash ring, the perf HUD, the debug overlay, the field report (its worker half: server/src/report.js, v2.3.5127) |
| [shell](#shell) | the page itself: main.jsx, index.html, the QA harness pages, the public files |
| [vendor](#vendor) | code from outside, kept as it came (with its licence) |
| unsorted | no system yet: the count only falls |

## wire

The socket and the messages: the router, the relay, the client's connection and its event switch, what each side can do (caps).

- **Files**: `server/src/`: index, relay, bundle, clientoff, flood
- **Files**: everything under `server/src/wire/`
- **Files**: everything under `src/networking/`
- **Files**: `src/game/`: clientOff, clientOffApply, blockedAsks, workerClock, t1Sync, tooFar, thawCarried
- **Files**: `src/game/`: actions, connectionDoor
- **Files**: `server/src/`: heapforget, reqonce, gidnames, send, words
- **Doors**: `PRIVILEGED_EVENTS` in `server/src/wire/lists.js` (every type the server sends (every out row of the wire table); anything else a client could forge); `RELAY_TYPES` in `server/src/wire/lists.js` (RELAY.TYPES: the relays a phone may send (every relay row), rebuilt in its name); `wireDoorJudge` in `server/src/wire/door.js` (the wire door: the table's checks on every message and the room's routes, before any handler (v2.3.5184)); `act` in `src/game/actions.js` (ACTIONS: the one way a request leaves the page, and its request id (v2.3.5185))
- **Switches**: [its rows in the switch table](SWITCHES.md#wire)
- **Words**: `wire`, `protocol`, `relay`, `caps`, `bundle`, `privileged`, `clientoff`, `flood`, `heap-forget`, `req-once`, `gid-names`, `send-door`, `words-rule`
- **Traps**: `wire`

## session

A sitting: the join, leaving, lingering, the rejoin and what it re-sends.

- **Files**: `server/src/`: join, leave, linger, lastplace, pacekeep, rejoinresend, nearjoin, presence2, actor, sitting, playtrace
- **Files**: `src/game/`: rejoinSlots, resumeListeners, quietPhone, nearJoin, presence2, stateCleanup
- **Doors**: `_playerLeaves` in `server/src/leave.js` (LEAVE_WAYS: the one way a session leaves); `REJOIN_SLOTS` in `src/game/rejoinSlots.js` (what the phone clears at state_sync, with the worker's re-send)
- **Switches**: [its rows in the switch table](SWITCHES.md#session)
- **Words**: `join`, `leave`, `linger`, `rejoin`, `reconnect`, `presence`, `session`, `quiet-phone`, `quietphone`
- **Traps**: none

## identity

Who a player is: ids, accounts, the device lock, login keys, the account check, the sites that may open a socket.

- **Files**: `server/src/`: account, devicelock, loginkeys, verify, broverify, origin, httpauth, charname
- **Files**: `src/game/`: tabIdentity, characterRecord, charName
- **Files**: everything under `src/ui/account/`
- **Doors**: none named yet
- **Switches**: [its rows in the switch table](SWITCHES.md#identity)
- **Words**: `account`, `login`, `devicelock`, `device-lock`, `identity`, `origin`, `verify`, `turnstile`
- **Traps**: `identity`

## bots

Telling a person from a script: bot signals, fingerprints, claims that are bounded.

- **Files**: `server/src/`: botfp, botsig, botstats, charwatch, hitproof, moveclaims, swordswing, bowshot, harvestgrade
- **Doors**: none named yet
- **Switches**: [its rows in the switch table](SWITCHES.md#bots)
- **Words**: `bot`, `antibot`, `anticheat`, `charwatch`, `hitproof`, `moveclaim`
- **Traps**: none

## liveops

The live flags, the admin and dev levers, test mode, feedback.

- **Files**: `server/src/`: liveops, admin, devtools, testmode, feedback, usagemeter
- **Files**: `src/game/`: testMode, switches, ownerSwitches, feedbackOwner, silenceOwner, renameOwner, adminKeyStore, usageMeter
- **Files**: `server/src/`: restore
- **Files**: `server/src/`: playerrestore
- **Doors**: `flagNameOk` in `server/src/liveops.js` (the names a live flag (a kill switch) may take); `_testMode` in `server/src/testmode.js` (the one question an honesty check asks)
- **Switches**: [its rows in the switch table](SWITCHES.md#liveops)
- **Words**: `liveops`, `admin`, `devtools`, `test-mode`, `testmode`, `feedback`, `flags`
- **Traps**: `liveops`

## server-core

The worker's spine: saving, migrations, the tick, its pace, hidden settings, the room's own row.

- **Files**: `server/src/`: persistence, migrations, tick, tickpace, cadence, data, grids, heapburn, hidden, daybook, storagemarks, roomrow
- **Doors**: `HIDDEN_SPEC` in `server/src/hidden.js` (a server-only number a copier would value); `bookAdd` in `server/src/daybook.js` (the day's book (`daybook:`): every part adds through it (v2.3.5080, card E))
- **Switches**: [its rows in the switch table](SWITCHES.md#server-core)
- **Words**: `persistence`, `migration`, `tick`, `storage`, `save`, `hidden`, `cost-guard`, `costguard`, `daybook`, `roomrow`
- **Traps**: `server-core`

## ops

The room under a crowd and the watch on it: its health for a monitor, the waiting crowd's pace, a seat held, the public boards' and the room's public reads, a guest's join.

- **Files**: `server/src/`: health, rfspread, seathold, publicreads, guestlazy
- **Doors**: none named yet
- **Switches**: [its rows in the switch table](SWITCHES.md#ops)
- **Words**: `room-health`, `rf-spread`, `seat-hold`, `board-cache`, `public-reads`, `guest-lazy`, `owner-pages`
- **Traps**: none

## combat

Hitting and being hit: weapons, abilities, the bow, shields, damage, PvP.

- **Files**: `src/rendering/tables/`: combat
- **Files**: `server/src/`: combat, hits, abilities, accuracy, burst, freeswing, fightlock, killroll, threat, telegraph, elemental, oneformula, statcap, arrowblast, swordconvert, shieldwear, shieldgem, weapongem, amulet, pvpbalance, pvpextras, pvplunge
- **Files**: `src/game/`: abilities, accuracy, combatHelpers, manualCombat, targeting, lockPick, projectiles, bowDraw, bowFeel, bowVolley, swordFeel, staffFeel, weaponFeel, deathBlow, dodge, elemHits, elemWindup, killRoll, killXp, pvpSwing, shieldCopies, shieldGem, shieldToggle, guardDoor, shieldWear, arrowEdge, whirlCatch, deskShield, weaponGem, weaponSlots, amuletGem, apChip, peerShots, shotGround, shockSpark, stormSparks, waterAttack
- **Doors**: `_monsterHit` in `server/src/hits.js` (MONSTER_HITS: every monster hit on a player)
- **Switches**: [its rows in the switch table](SWITCHES.md#combat)
- **Words**: `combat`, `hit`, `ability`, `abilit`, `bow`, `arrow`, `sword`, `staff`, `shield`, `weapon`, `pvp`, `damage`, `whirl`, `dodge`, `elemental`, `accuracy`
- **Traps**: `combat`

## monsters

The monsters' lives, moves, status, spawns and the boss.

- **Files**: `src/rendering/tables/`: monsters
- **Files**: `server/src/`: monsterlife, monstermoves, monsterstatus, slimeboss, spawnscale, wheelspawns, wheelspawns1, aggrogrid
- **Files**: `src/game/`: monsterCarry, monsterCodex, monsterCombat, monsterMoves, monsterNoises, monsterStrips, slimeBlast, slimeSplatPose, crowdCap
- **Doors**: none named yet
- **Switches**: [its rows in the switch table](SWITCHES.md#monsters)
- **Words**: `monster`, `slime`, `spawn`, `boss`, `aggro`, `mob`
- **Traps**: `monsters`

## economy

Gold, the bag, the bank, the market and shops, trades, drops, chests and daily rewards.

- **Files**: `src/rendering/tables/`: economy
- **Files**: `server/src/`: gold, bag, bank, market, marketplace, shop, store, storechat, storegear, storeoffer, trade, trade2, xfer, econcard, worldsum, valuepause, inbox, itemdrop, deathpile, gearstash, stash, gear, gearprov, salvage, gamble, dice, dailychest, dailyrewards, risechest, revealbag, loginspin, eventcapes
- **Files**: `server/src/`: playerroads
- **Files**: `src/game/`: bank, itemDrop, groundLoot, lootAsk, dropLines, dropLook, storeAnswer, storeSellTap, tradeSlot, weaponSell, salvage, postOffice, revealBag, dice, dailyRewards, bossChest, loginSpinWheel, coinArt, spinBoard, gearWornSync, arenaStakes, econCard
- **Doors**: `_goldGive` in `server/src/gold.js` (GOLD_ROADS: every change to a player's gold (_goldGive, _goldTake, _goldSet)); `bagGive` in `server/src/bag.js` (BAG_ROADS: every change to a bag count (bagGive, bagTake, bagSet))
- **Switches**: [its rows in the switch table](SWITCHES.md#economy)
- **Words**: `gold`, `bag`, `bank`, `market`, `shop`, `store`, `trade`, `inbox`, `drop`, `loot`, `chest`, `salvage`, `gamble`, `dice`, `daily`, `auction`, `gear`, `coin`
- **Traps**: `economy`

## skills

The life skills: gathering, cooking, smithing, the farm, fishing, trapping.

- **Files**: `src/rendering/tables/`: skills
- **Files**: `server/src/`: gathering, cooking, smelting, armorforge, forgeladder, farm, farmorders, fishlog, trapping, hardening, hardenedwood, drawgather, firetrail, gscopper, shardcrack, gems
- **Files**: `src/game/`: smithing, forgeTabs, farmFeedback, farmTrip, farmWalk, farmWork, fishWeigh, trapping, tierOre, tierTrees, drawGather, lifeSkillRewards, harvestDoor, quickEat, fightFood, mastery, shardCrack, fireRefuse
- **Doors**: none named yet
- **Switches**: [its rows in the switch table](SWITCHES.md#skills)
- **Words**: `gather`, `cook`, `smelt`, `smith`, `forge`, `farm`, `fish`, `trap`, `harden`, `firemaking`, `skill`, `gem`, `ore`, `tree`, `shard`
- **Traps**: `skills`

## quests

Quests, achievements, the codex, pets' book, points.

- **Files**: `server/src/`: quests, achievements, codex, petbook, pets, pointsreset, prog3
- **Files**: `server/src/`: skillpoints
- **Files**: `server/src/`: xp
- **Files**: `server/src/`: queststate
- **Files**: `src/game/`: quests, questCard, questComplete, questFly, questHandIn, questJournal, questKept, questPages, questPins, questRoute, questTrailStyle, questWays, trackedQuest, achievements, petBook, petFetch, pointsBubbles, pointsReset, pointsTips, tour, levelCelebration, xpBar, xpPop, welcomeBanner
- **Doors**: `pointsGive` in `server/src/skillpoints.js` (POINT_ROADS: every change to a player's build points (pointsGive, pointsTake, pointsSet, pointsDeal; v2.3.5283, card R)); `xpGive` in `server/src/xp.js` (XP_ROADS: every change to a character's experience and levels (xpGive, xpLevelUp, xpSet, xpMake; v2.3.5289, card R)); `questStateSet` in `server/src/queststate.js` (QUEST_ROADS: every change to a quest's state, progress, flags and kept lists (seven verbs; v2.3.5284, card R))
- **Switches**: [its rows in the switch table](SWITCHES.md#quests)
- **Words**: `quest`, `achievement`, `codex`, `pet`, `points`, `tour`, `xp`, `level`
- **Traps**: `quests`

## social

Parties, clans, guilds, friends, chat, emotes, duels, the arena, races, boards.

- **Files**: `src/rendering/tables/`: social
- **Files**: `server/src/`: party, clanparty, clans, guilds, alliance, friends, chatlanes, chatmod, chatguard, reservednames, silence, emotes, boards, arena, gladiator, duel, spar, race, leaderboard, power, statboards, lookform
- **Files**: `src/game/`: lookForm, alliance, allyDrafts, duelDoor, partyDoor, arenaDoor, skullDoor, chat, chatChannel, chatColor, chatMute, emotes, emoteMoves, gesturePose, friendErrors, duelLock, duelPending, partyChip, partyEq, partyMarks, partyRows, peerDot, race, raceDoor, spar, sparTargets, bubbleSkins, boardBumps, dictation, ranksPage
- **Doors**: none named yet
- **Switches**: [its rows in the switch table](SWITCHES.md#social)
- **Words**: `party`, `clan`, `guild`, `alliance`, `friend`, `chat`, `emote`, `duel`, `arena`, `gladiator`, `spar`, `race`, `board`, `leaderboard`, `social`
- **Traps**: `social`

## world

The Wheel: zones and their doors, lands, dungeons, No Man's Land, the map, props.

- **Files**: `server/src/`: wheelzone, wheelnear, wheelfaces, wheeltables, wheeldungeon, dungeon, dungeonreward, zonejudge, nomansland, props, eventplace
- **Files**: `src/game/`: wheelBreak, wheelDungeons, wheelHome, wheelNoticeboard, wheelSize, wheelTownDoors, wheelTrial, worldTrial, worldViewport, zoneGate, zoneMechanics, zoneTransitions, veilDoor, dungeonDoor, dungeonArt, dungeonClear, dungeonWaves, noMansLand, nmlAsk, nmlExplainOnce, mapPinPlaces, mapPins, pinSlots, buildingRooms, placeSafety, plateSafety, bodyPlace, timeOfDay, season, expoAddress, onePic, bannerReach
- **Files**: `src/game/`: hereCells
- **Doors**: none named yet
- **Switches**: [its rows in the switch table](SWITCHES.md#world)
- **Words**: `wheel`, `zone`, `land`, `dungeon`, `nomansland`, `nml`, `map`, `world`, `town`, `door`, `prop`
- **Traps**: `world`

## movement

Moving: steps, sprinting, jumping, climbing, riding, swimming, resting.

- **Files**: `server/src/`: movement, movepath, steadymovers, sprint, rest, ride, staminaregen, safeheal
- **Files**: `src/game/`: sprint, jump, jumpActions, tapJump, climb, climbActions, ride, rideGround, rest, wheelSwim, moveDiet, legSync, orientationSync, avatarHold
- **Doors**: none named yet
- **Switches**: [its rows in the switch table](SWITCHES.md#movement)
- **Words**: `move`, `sprint`, `jump`, `climb`, `ride`, `swim`, `rest`, `stamina`, `walk`, `step`
- **Traps**: none

## townsfolk

The townspeople: their days, walks, talk and reactions.

- **Files**: `src/rendering/tables/`: townsfolk
- **Files**: `src/game/`: townsfolkDay, townsfolkReact, townsfolkWalk, townChatter, mayorTalk, interactions, poseDoor
- **Doors**: none named yet
- **Switches**: [its rows in the switch table](SWITCHES.md#townsfolk)
- **Words**: `townsfolk`, `npc`, `mayor`, `folk`
- **Traps**: none

## life

A player's health and life phase: dying, the death card, respawning.

- **Files**: `server/src/`: life, xpdecay
- **Files**: `src/game/`: respawn, dyingDoor, phoneDeath, deathCard
- **Doors**: `_hpSet` in `server/src/life.js` (HP_ROADS: every change to a player's health; the life phase only through _lifeTo)
- **Switches**: [its rows in the switch table](SWITCHES.md#life)
- **Words**: `life`, `death`, `respawn`, `die`, `hp`
- **Traps**: none

## audio

Sound and music: cues, voices, ambience, the music deck, the Sound Studio.

- **Files**: `src/game/`: ambientBeds, eventSounds, hitSounds, moveSounds, ownSounds, npcVoices, soundStudio, slimeAudio, splashAudio, rideSound, townAmbience, townMusic, waterAmbience, wheelMusic
- **Files**: `src/data/`: soundStudio, soundFold, sfxCache, eventSounds, footstepClips, monsterNoiseClips, ownerSoundClips, voiceCap, bowFeelSound, weaponFeelSound, sprintBreath, sprintGrunt
- **Files**: `src/ui/`: uiSfxDelegate
- **Doors**: none named yet
- **Switches**: [its rows in the switch table](SWITCHES.md#audio)
- **Words**: `sound`, `audio`, `music`, `sfx`, `voice`, `ambience`, `ambient`, `cue`
- **Traps**: `audio`

## input

Touch and the controls on a phone.

- **Files**: `src/game/`: controlVisibility, playerActions, coachMarkSize, stickZones, sight, latch, freeAttack, thumbSide, thumbGlue, thumbArc, contextButton, lockFace, bowSpecialNow, aimMarks, padSkin
- **Files**: `src/ui/`: tapDismiss, swallowTapClick
- **Doors**: none named yet
- **Switches**: [its rows in the switch table](SWITCHES.md#input)
- **Words**: `touch`, `control`, `tap`, `thumb`, `swallow`
- **Traps**: `input`

## desktop

A computer: keys, clicks, the wide window and its words.

- **Files**: `src/game/`: deskCombos, deskKeyList, deskKeys, deskTeachState, deskWords, desktopControls, dashSidePref, say
- **Files**: `src/ui/`: deskTeach, deskWide
- **Doors**: `NAV_KEYS` in `src/game/deskKeys.js` (every key a computer player presses lives here, worn by its button (data-key))
- **Switches**: [its rows in the switch table](SWITCHES.md#desktop)
- **Words**: `desk`, `desktop`, `keyboard`, `computer`, `mouse`
- **Traps**: `desktop`

## device

What kind of device this is and how much it can draw: the profile, resolution, the view cap.

- **Files**: `src/game/`: deviceProfile, renderRes, viewCap, speedTest, loadTimes, lookPaletteChoice, drawLanes
- **Doors**: `deviceProfile` in `src/game/deviceProfile.js` (the one place that asks what the device is (devClass, when SHAPES part 8 builds it))
- **Switches**: [its rows in the switch table](SWITCHES.md#device)
- **Words**: `device`, `profile`, `viewcap`, `render-res`, `speed`
- **Traps**: none

## page-thread

The page's one thread: the frame's pace and clock, what holds the page.

- **Files**: `src/game/`: framePacer, frameClock, frameSteps, renderFrame, heapBurn, buildWatch
- **Files**: `src/ui/`: afterFrame
- **Files**: `src/game/`: drawOnChange
- **Doors**: `beforeDraw` in `src/game/framePacer.js` (a read that waits for the graphics chip runs at the top of a frame)
- **Switches**: [its rows in the switch table](SWITCHES.md#page-thread)
- **Words**: `frame`, `held`, `pacer`, `thread`, `jank`, `smooth`
- **Traps**: `page-thread`

## memory

What the page holds: pictures kept on the chip or as images, colour numbers, trims and frees.

- **Files**: `src/rendering/`: gpuOnly, keepAsImage, heldNumbers, paletteTex, paletteLoad, paletteDraw, heapTrim, texturePoolTrim, bulkTexDestroy, releaseCanvasTexture, quietClear, textRelease, fishTopEvict, maskedEvict, gfxLean, batchIdsLean, picsNumbers, canvasWitness
- **Doors**: `keepOnGpuOnly` in `src/rendering/gpuOnly.js` (a picture made on a canvas that nothing reads back)
- **Switches**: [its rows in the switch table](SWITCHES.md#memory)
- **Words**: `memory`, `mem`, `gpu`, `heap`, `palette`, `trim`, `leak`
- **Traps**: `memory`

## preload

What loads behind the loading screen, and what loads later on purpose.

- **Files**: `src/rendering/tables/`: preload
- **Files**: `src/rendering/`: preloadAnimations, preloadReport, chestPreload, controlsPreload, gestureCuePreload, levelUpBurstPreload, loginSpinPreload, questArtPreload, statDemoPreload, xpBarPreload, zoneBannerPreload, loadSetLater, warmOnce, picsOnce
- **Files**: `src/ui/`: loadingGate, lazyPanel, lazyPanels
- **Files**: `src/game/`: assetUrl, assetTable
- **Files**: `src/rendering/`: sheetPage
- **Doors**: `preloadWorldAnimations` in `src/rendering/preloadAnimations.js` (every animation and sprite loads behind the loading screen); `assetUrl` in `src/game/assetUrl.js` (an address BUILT from parts gets its file's version, so its folder can be kept a year (v2.3.6742, card KEEP))
- **Switches**: [its rows in the switch table](SWITCHES.md#preload)
- **Words**: `preload`, `loading`, `lazy`, `warm`
- **Traps**: `preload`

## art

Loading art in play: strips of 256 colours, the readers off the page's thread, bakes on workers.

- **Files**: `src/rendering/`: zoneTextures, stripRead, stripPack, png8Decode, png8Worker, p256, webpImage, artBottoms, artHolds, workerCanvas, trimPack, trimRules, fxStrips, bodyBake, bodyBakeWorker, maskedBake, maskedBakeWorker, retintPalette, sharpPixels, tiledMaps
- **Files**: `src/game/`: bakeKeep
- **Doors**: `loadTrackedStrip` in `src/rendering/zoneTextures.js` (art that loads while the world is in play)
- **Switches**: [its rows in the switch table](SWITCHES.md#art)
- **Words**: `art`, `strip`, `png`, `p256`, `bake`, `sprite`, `pic`
- **Traps**: `art`

## look

How a character looks: traits, the look palette, garments, heads, gear on the body.

- **Files**: `src/rendering/tables/`: look
- **Files**: everything under `src/rendering/traits/`
- **Files**: everything under `src/rendering/lookSets/`
- **Files**: `src/rendering/`: lookArmour, lookArmourProbe, lookBake, lookExpand, lookFolk, lookPalette, lookPaletteProbe, lookShirt, lookShirtFrame, lookShirtProbe, lookUnpack, hemiLook, hemiBust, hemiBustCore, hemiAtlasIndex, characterPortrait, traitThumbs, gearBake, gearCatalog, gearLookFrame, gearLookProbe, gearNumbers, gearSheets, gearVariants, gearVersion, gearWalkFrame, weaponLookFrame, bodyRecolor, toolRecolor, garmentConfine, hairClip, headCrowns, headFrames, flipHead, earAnchors, earSides, eyeBlankMask, eyeMask, standInGarb, standInInk, standIns, retryLooks, capeSprites, playerSkins, nftAvatars
- **Files**: `server/src/`: lookrelay, poses
- **Doors**: none named yet
- **Switches**: [its rows in the switch table](SWITCHES.md#look)
- **Words**: `look`, `trait`, `hair`, `head`, `garment`, `cape`, `armour`, `armor`, `skin`, `stand-in`, `standin`, `portrait`
- **Traps**: `look`

## render

Drawing the world: the Pixi renderer, the entity and effects renderers, light, fx.

- **Files**: `src/rendering/tables/`: render
- **Files**: `src/game/`: poseHides, cameraFollow
- **Rest of**: `src/rendering/`
- **Doors**: none named yet
- **Switches**: [its rows in the switch table](SWITCHES.md#render)
- **Words**: `render`, `draw`, `fx`, `pixi`, `batch`, `light`, `camera`
- **Traps**: `render`

## ui

The screens: BroTown.jsx, the band and its panels, windows, banners.

- **Files**: `src/rendering/tables/`: ui
- **Files**: `src/game/`: windowDoor, guardBreak, broPages, ui2Tokens, dashNav, dashDests, dashGrow, broHub, screenZones, pending, combatHub, progression, metricTree
- **Files**: `src/game/`: itemInspect
- **Files**: `src/game/`: compare, equipProject, workspace
- **Files**: `src/game/`: equipLook
- **Files**: `src/game/`: gearShowcase
- **Files**: `src/game/`: menuTile, gearGeometry
- **Files**: `src/game/`: charHud
- **Rest of**: `src/ui/`
- **Rest of**: `src/styles/`
- **Doors**: none named yet
- **Switches**: [its rows in the switch table](SWITCHES.md#ui)
- **Words**: `ui`, `panel`, `window`, `band`, `banner`, `screen`, `dash`, `sheet`, `popup`
- **Traps**: `ui`

## data

The client's tables (src/data/): items, zones, abilities, the long display and systems tables.

- **Rest of**: `src/data/`
- **Doors**: none named yet
- **Switches**: [its rows in the switch table](SWITCHES.md#data)
- **Words**: `data`, `table`, `mirror`
- **Traps**: none

## state

The state ledger: every field of S and top-of-file variable, a file a system.

- **Files**: everything under `src/state/`
- **Files**: `src/game/`: resetOn
- **Doors**: none named yet
- **Switches**: [its rows in the switch table](SWITCHES.md#state)
- **Words**: `ledger`
- **Traps**: none

## debug

The crash ring, the perf HUD, the debug overlay, the field report (its worker half: server/src/report.js, v2.3.5127).

- **Files**: everything under `src/debug/`
- **Files**: `server/src/`: report
- **Doors**: none named yet
- **Switches**: [its rows in the switch table](SWITCHES.md#debug)
- **Words**: `debug`, `crash`, `perf`, `report`
- **Traps**: none

## shell

The page itself: main.jsx, index.html, the QA harness pages, the public files.

- **Files**: the files at the top of `src/`
- **Files**: everything under `src/public/`
- **Files**: everything under `src/lib/`
- **Doors**: none named yet
- **Switches**: [its rows in the switch table](SWITCHES.md#shell)
- **Words**: `shell`, `main`, `index`
- **Traps**: none

## vendor

Code from outside, kept as it came (with its licence).

- **Files**: everything under `server/src/vendor/`
- **Doors**: none named yet
- **Switches**: [its rows in the switch table](SWITCHES.md#vendor)
- **Words**: none
- **Traps**: none
