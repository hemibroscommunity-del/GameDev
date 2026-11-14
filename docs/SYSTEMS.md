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
- **Doors**: the one function a kind of change goes through (CLAUDE.md part 5). **Switches**: the switch
  table is card T's; until it lands, only the switches a system is known by.

| System | What |
|---|---|
| [wire](#wire) | the socket and the messages: the router, the relay, the client's connection and its event switch, what each side can do (caps) |
| [session](#session) | a sitting: the join, leaving, lingering, the rejoin and what it re-sends |
| [identity](#identity) | who a player is: ids, accounts, the device lock, login keys, the account check, the sites that may open a socket |
| [bots](#bots) | telling a person from a script: bot signals, fingerprints, claims that are bounded |
| [liveops](#liveops) | the live flags, the admin and dev levers, test mode, feedback |
| [server-core](#server-core) | the worker's spine: saving, migrations, the tick, its pace, hidden settings |
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
| [debug](#debug) | the crash ring, the perf HUD, the debug overlay |
| [shell](#shell) | the page itself: main.jsx, index.html, the QA harness pages, the public files |
| [vendor](#vendor) | code from outside, kept as it came (with its licence) |
| unsorted | no system yet: the count only falls |

## wire

The socket and the messages: the router, the relay, the client's connection and its event switch, what each side can do (caps).

- **Files**: `server/src/`: index, relay, bundle, clientoff, flood
- **Files**: everything under `src/networking/`
- **Files**: `src/game/`: clientOff, clientOffApply, blockedAsks, workerClock, t1Sync, tooFar
- **Doors**: `PRIVILEGED_EVENTS` in `server/src/index.js` (every type the server sends; anything else a client could forge); `TYPES` in `server/src/relay.js` (RELAY.TYPES: the relays a phone may send, rebuilt in its name)
- **Switches**: none
- **Words**: `wire`, `protocol`, `relay`, `caps`, `bundle`, `privileged`, `clientoff`, `flood`
- **Traps**: `wire`

## session

A sitting: the join, leaving, lingering, the rejoin and what it re-sends.

- **Files**: `server/src/`: join, leave, linger, lastplace, rejoinresend, nearjoin, presence2
- **Files**: `src/game/`: rejoinSlots, resumeListeners, quietPhone, nearJoin, presence2, stateCleanup
- **Doors**: `_playerLeaves` in `server/src/leave.js` (LEAVE_WAYS: the one way a session leaves); `REJOIN_SLOTS` in `src/game/rejoinSlots.js` (what the phone clears at state_sync, with the worker's re-send)
- **Switches**: none
- **Words**: `join`, `leave`, `linger`, `rejoin`, `reconnect`, `presence`, `session`, `quiet-phone`, `quietphone`
- **Traps**: none

## identity

Who a player is: ids, accounts, the device lock, login keys, the account check, the sites that may open a socket.

- **Files**: `server/src/`: account, devicelock, loginkeys, verify, broverify, origin, httpauth
- **Files**: `src/game/`: tabIdentity, characterRecord
- **Files**: everything under `src/ui/account/`
- **Doors**: none named yet
- **Switches**: none
- **Words**: `account`, `login`, `devicelock`, `device-lock`, `identity`, `origin`, `verify`, `turnstile`
- **Traps**: `identity`

## bots

Telling a person from a script: bot signals, fingerprints, claims that are bounded.

- **Files**: `server/src/`: botfp, botsig, botstats, charwatch, hitproof, moveclaims
- **Doors**: none named yet
- **Switches**: none
- **Words**: `bot`, `antibot`, `anticheat`, `charwatch`, `hitproof`, `moveclaim`
- **Traps**: none

## liveops

The live flags, the admin and dev levers, test mode, feedback.

- **Files**: `server/src/`: liveops, admin, devtools, testmode, feedback
- **Files**: `src/game/`: testMode
- **Doors**: `flagNameOk` in `server/src/liveops.js` (the names a live flag (a kill switch) may take); `_testMode` in `server/src/testmode.js` (the one question an honesty check asks)
- **Switches**: none
- **Words**: `liveops`, `admin`, `devtools`, `test-mode`, `testmode`, `feedback`, `flags`
- **Traps**: `liveops`

## server-core

The worker's spine: saving, migrations, the tick, its pace, hidden settings.

- **Files**: `server/src/`: persistence, migrations, tick, tickpace, cadence, data, grids, heapburn, hidden, daybook, storagemarks
- **Doors**: `HIDDEN_SPEC` in `server/src/hidden.js` (a server-only number a copier would value); `bookAdd` in `server/src/daybook.js` (the day's book (`daybook:`): every part adds through it (v2.3.5080, card E))
- **Switches**: none
- **Words**: `persistence`, `migration`, `tick`, `storage`, `save`, `hidden`, `cost-guard`, `costguard`, `daybook`
- **Traps**: `server-core`

## combat

Hitting and being hit: weapons, abilities, the bow, shields, damage, PvP.

- **Files**: `server/src/`: combat, hits, abilities, accuracy, burst, freeswing, fightlock, killroll, threat, telegraph, elemental, oneformula, statcap, arrowblast, swordconvert, shieldwear, shieldgem, weapongem, amulet, pvpbalance, pvpextras, pvplunge
- **Files**: `src/game/`: abilities, accuracy, combatHelpers, manualCombat, targeting, projectiles, bowDraw, bowFeel, bowVolley, swordFeel, staffFeel, weaponFeel, deathBlow, dodge, elemHits, elemWindup, killRoll, killXp, pvpSwing, shieldCopies, shieldGem, shieldToggle, shieldWear, arrowEdge, whirlCatch, deskShield, weaponGem, weaponSlots, amuletGem, apChip, peerShots, shotGround, shockSpark, stormSparks, waterAttack
- **Doors**: `_monsterHit` in `server/src/hits.js` (MONSTER_HITS: every monster hit on a player)
- **Switches**: `whirlWindup`
- **Words**: `combat`, `hit`, `ability`, `abilit`, `bow`, `arrow`, `sword`, `staff`, `shield`, `weapon`, `pvp`, `damage`, `whirl`, `dodge`, `elemental`, `accuracy`
- **Traps**: `combat`

## monsters

The monsters' lives, moves, status, spawns and the boss.

- **Files**: `server/src/`: monsterlife, monstermoves, monsterstatus, slimeboss, spawnscale, wheelspawns, wheelspawns1, aggrogrid
- **Files**: `src/game/`: monsterCarry, monsterCodex, monsterCombat, monsterMoves, monsterNoises, monsterStrips, slimeBlast, slimeSplatPose, crowdCap
- **Doors**: none named yet
- **Switches**: none
- **Words**: `monster`, `slime`, `spawn`, `boss`, `aggro`, `mob`
- **Traps**: `monsters`

## economy

Gold, the bag, the bank, the market and shops, trades, drops, chests and daily rewards.

- **Files**: `server/src/`: gold, bag, bank, market, marketplace, shop, store, storechat, storegear, storeoffer, trade, trade2, inbox, itemdrop, deathpile, gearstash, gear, gearprov, salvage, gamble, dice, dailychest, dailyrewards, risechest, revealbag, loginspin, eventcapes
- **Files**: `src/game/`: bank, itemDrop, groundLoot, lootAsk, dropLines, dropLook, storeAnswer, storeSellTap, tradeSlot, weaponSell, salvage, postOffice, revealBag, dice, dailyRewards, bossChest, loginSpinWheel, coinArt, spinBoard, gearWornSync, arenaStakes
- **Doors**: `_goldGive` in `server/src/gold.js` (GOLD_ROADS: every change to a player's gold (_goldGive, _goldTake, _goldSet)); `bagGive` in `server/src/bag.js` (BAG_ROADS: every change to a bag count (bagGive, bagTake, bagSet))
- **Switches**: `storeGear`, `dailyChest`
- **Words**: `gold`, `bag`, `bank`, `market`, `shop`, `store`, `trade`, `inbox`, `drop`, `loot`, `chest`, `salvage`, `gamble`, `dice`, `daily`, `auction`, `gear`, `coin`
- **Traps**: `economy`

## skills

The life skills: gathering, cooking, smithing, the farm, fishing, trapping.

- **Files**: `server/src/`: gathering, cooking, smelting, armorforge, forgeladder, farm, farmorders, fishlog, trapping, hardening, hardenedwood, drawgather, firetrail, gscopper, shardcrack, gems
- **Files**: `src/game/`: smithing, forgeTabs, farmFeedback, farmTrip, farmWalk, farmWork, fishWeigh, trapping, tierOre, tierTrees, drawGather, lifeSkillRewards, quickEat, fightFood, mastery, shardCrack, fireRefuse
- **Doors**: none named yet
- **Switches**: none
- **Words**: `gather`, `cook`, `smelt`, `smith`, `forge`, `farm`, `fish`, `trap`, `harden`, `firemaking`, `skill`, `gem`, `ore`, `tree`, `shard`
- **Traps**: `skills`

## quests

Quests, achievements, the codex, pets' book, points.

- **Files**: `server/src/`: quests, achievements, codex, petbook, pets, pointsreset, prog3
- **Files**: `src/game/`: quests, questCard, questComplete, questFly, questHandIn, questJournal, questKept, questPins, questRoute, questTrailStyle, questWays, trackedQuest, achievements, petBook, petFetch, pointsBubbles, pointsReset, pointsTips, tour, levelCelebration, xpBar, xpPop, welcomeBanner
- **Doors**: none named yet
- **Switches**: none
- **Words**: `quest`, `achievement`, `codex`, `pet`, `points`, `tour`, `xp`, `level`
- **Traps**: `quests`

## social

Parties, clans, guilds, friends, chat, emotes, duels, the arena, races, boards.

- **Files**: `server/src/`: party, clanparty, clans, guilds, alliance, friends, chatlanes, chatmod, chatguard, emotes, boards, arena, gladiator, duel, spar, race, leaderboard
- **Files**: `src/game/`: alliance, chat, chatChannel, chatColor, chatMute, emotes, emoteMoves, gesturePose, friendErrors, duelLock, duelPending, partyChip, partyEq, partyMarks, partyRows, peerDot, race, spar, sparTargets, bubbleSkins, boardBumps, dictation
- **Doors**: none named yet
- **Switches**: none
- **Words**: `party`, `clan`, `guild`, `alliance`, `friend`, `chat`, `emote`, `duel`, `arena`, `gladiator`, `spar`, `race`, `board`, `leaderboard`, `social`
- **Traps**: `social`

## world

The Wheel: zones and their doors, lands, dungeons, No Man's Land, the map, props.

- **Files**: `server/src/`: wheelzone, wheelnear, wheelfaces, wheeltables, wheeldungeon, dungeon, dungeonreward, zonejudge, nomansland, props, eventplace
- **Files**: `src/game/`: wheelBreak, wheelDungeons, wheelHome, wheelNoticeboard, wheelSize, wheelTownDoors, wheelTrial, worldTrial, worldViewport, zoneGate, zoneMechanics, zoneTransitions, dungeonArt, dungeonClear, dungeonWaves, noMansLand, nmlAsk, nmlExplainOnce, mapPinPlaces, mapPins, pinSlots, buildingRooms, placeSafety, plateSafety, bodyPlace, timeOfDay, season, expoAddress, onePic, bannerReach
- **Doors**: none named yet
- **Switches**: none
- **Words**: `wheel`, `zone`, `land`, `dungeon`, `nomansland`, `nml`, `map`, `world`, `town`, `door`, `prop`
- **Traps**: `world`

## movement

Moving: steps, sprinting, jumping, climbing, riding, swimming, resting.

- **Files**: `server/src/`: movement, movepath, steadymovers, sprint, rest, ride, staminaregen, safeheal
- **Files**: `src/game/`: sprint, jump, jumpActions, tapJump, climb, climbActions, ride, rideGround, rest, wheelSwim, moveDiet, legSync, orientationSync, avatarHold
- **Doors**: none named yet
- **Switches**: none
- **Words**: `move`, `sprint`, `jump`, `climb`, `ride`, `swim`, `rest`, `stamina`, `walk`, `step`
- **Traps**: none

## townsfolk

The townspeople: their days, walks, talk and reactions.

- **Files**: `src/game/`: townsfolkDay, townsfolkReact, townsfolkWalk, townChatter, mayorTalk, interactions
- **Doors**: none named yet
- **Switches**: none
- **Words**: `townsfolk`, `npc`, `mayor`, `folk`
- **Traps**: none

## life

A player's health and life phase: dying, the death card, respawning.

- **Files**: `server/src/`: life, xpdecay
- **Files**: `src/game/`: respawn, phoneDeath, deathCard
- **Doors**: `_hpSet` in `server/src/life.js` (HP_ROADS: every change to a player's health; the life phase only through _lifeTo)
- **Switches**: none
- **Words**: `life`, `death`, `respawn`, `die`, `hp`
- **Traps**: none

## audio

Sound and music: cues, voices, ambience, the music deck, the Sound Studio.

- **Files**: `src/game/`: ambientBeds, eventSounds, hitSounds, moveSounds, ownSounds, npcVoices, soundStudio, slimeAudio, splashAudio, rideSound, townAmbience, townMusic, waterAmbience, wheelMusic
- **Files**: `src/data/`: soundStudio, soundFold, sfxCache, eventSounds, footstepClips, monsterNoiseClips, ownerSoundClips, voiceCap, bowFeelSound, weaponFeelSound, sprintBreath, sprintGrunt
- **Files**: `src/ui/`: uiSfxDelegate
- **Doors**: none named yet
- **Switches**: none
- **Words**: `sound`, `audio`, `music`, `sfx`, `voice`, `ambience`, `ambient`, `cue`
- **Traps**: `audio`

## input

Touch and the controls on a phone.

- **Files**: `src/game/`: controlVisibility, playerActions, coachMarkSize
- **Files**: `src/ui/`: tapDismiss, swallowTapClick
- **Doors**: none named yet
- **Switches**: none
- **Words**: `touch`, `control`, `tap`, `thumb`, `swallow`
- **Traps**: `input`

## desktop

A computer: keys, clicks, the wide window and its words.

- **Files**: `src/game/`: deskCombos, deskKeyList, deskKeys, deskTeachState, deskWords, desktopControls, dashSidePref
- **Files**: `src/ui/`: deskTeach, deskWide
- **Doors**: `NAV_KEYS` in `src/game/deskKeys.js` (every key a computer player presses lives here, worn by its button (data-key))
- **Switches**: none
- **Words**: `desk`, `desktop`, `keyboard`, `computer`, `mouse`
- **Traps**: `desktop`

## device

What kind of device this is and how much it can draw: the profile, resolution, the view cap.

- **Files**: `src/game/`: deviceProfile, renderRes, viewCap, speedTest, loadTimes, lookPaletteChoice
- **Doors**: `deviceProfile` in `src/game/deviceProfile.js` (the one place that asks what the device is (devClass, when SHAPES part 8 builds it))
- **Switches**: none
- **Words**: `device`, `profile`, `viewcap`, `render-res`, `speed`
- **Traps**: none

## page-thread

The page's one thread: the frame's pace and clock, what holds the page.

- **Files**: `src/game/`: framePacer, frameClock, renderFrame, heapBurn, buildWatch
- **Files**: `src/ui/`: afterFrame
- **Doors**: `beforeDraw` in `src/game/framePacer.js` (a read that waits for the graphics chip runs at the top of a frame)
- **Switches**: none
- **Words**: `frame`, `held`, `pacer`, `thread`, `jank`, `smooth`
- **Traps**: `page-thread`

## memory

What the page holds: pictures kept on the chip or as images, colour numbers, trims and frees.

- **Files**: `src/rendering/`: gpuOnly, keepAsImage, heldNumbers, paletteTex, paletteLoad, paletteDraw, heapTrim, texturePoolTrim, bulkTexDestroy, releaseCanvasTexture, quietClear, textRelease, fishTopEvict, maskedEvict, gfxLean, batchIdsLean, picsNumbers, canvasWitness
- **Doors**: `keepOnGpuOnly` in `src/rendering/gpuOnly.js` (a picture made on a canvas that nothing reads back)
- **Switches**: none
- **Words**: `memory`, `mem`, `gpu`, `heap`, `palette`, `trim`, `leak`
- **Traps**: `memory`

## preload

What loads behind the loading screen, and what loads later on purpose.

- **Files**: `src/rendering/`: preloadAnimations, preloadReport, chestPreload, controlsPreload, gestureCuePreload, levelUpBurstPreload, loginSpinPreload, questArtPreload, statDemoPreload, xpBarPreload, zoneBannerPreload, loadSetLater, warmOnce, picsOnce
- **Files**: `src/ui/`: loadingGate, lazyPanel, lazyPanels
- **Doors**: `preloadWorldAnimations` in `src/rendering/preloadAnimations.js` (every animation and sprite loads behind the loading screen)
- **Switches**: none
- **Words**: `preload`, `loading`, `lazy`, `warm`
- **Traps**: `preload`

## art

Loading art in play: strips of 256 colours, the readers off the page's thread, bakes on workers.

- **Files**: `src/rendering/`: zoneTextures, stripRead, stripPack, png8Decode, png8Worker, p256, webpImage, artBottoms, artHolds, workerCanvas, trimPack, trimRules, fxStrips, bodyBake, bodyBakeWorker, maskedBake, maskedBakeWorker, retintPalette, sharpPixels, tiledMaps
- **Doors**: `loadTrackedStrip` in `src/rendering/zoneTextures.js` (art that loads while the world is in play)
- **Switches**: none
- **Words**: `art`, `strip`, `png`, `p256`, `bake`, `sprite`, `pic`
- **Traps**: `art`

## look

How a character looks: traits, the look palette, garments, heads, gear on the body.

- **Files**: everything under `src/rendering/traits/`
- **Files**: everything under `src/rendering/lookSets/`
- **Files**: `src/rendering/`: lookArmour, lookArmourProbe, lookBake, lookExpand, lookFolk, lookPalette, lookPaletteProbe, lookShirt, lookShirtFrame, lookShirtProbe, lookUnpack, hemiLook, hemiBust, hemiBustCore, hemiAtlasIndex, characterPortrait, traitThumbs, gearBake, gearCatalog, gearLookFrame, gearLookProbe, gearNumbers, gearSheets, gearVariants, gearVersion, gearWalkFrame, weaponLookFrame, bodyRecolor, toolRecolor, garmentConfine, hairClip, headCrowns, headFrames, flipHead, earAnchors, earSides, eyeBlankMask, eyeMask, standInGarb, standInInk, standIns, retryLooks, capeSprites, playerSkins, nftAvatars
- **Files**: `server/src/`: lookrelay, poses
- **Doors**: none named yet
- **Switches**: none
- **Words**: `look`, `trait`, `hair`, `head`, `garment`, `cape`, `armour`, `armor`, `skin`, `stand-in`, `standin`, `portrait`
- **Traps**: `look`

## render

Drawing the world: the Pixi renderer, the entity and effects renderers, light, fx.

- **Rest of**: `src/rendering/`
- **Doors**: none named yet
- **Switches**: none
- **Words**: `render`, `draw`, `fx`, `pixi`, `batch`, `light`, `camera`
- **Traps**: `render`

## ui

The screens: BroTown.jsx, the band and its panels, windows, banners.

- **Rest of**: `src/ui/`
- **Rest of**: `src/styles/`
- **Doors**: none named yet
- **Switches**: none
- **Words**: `ui`, `panel`, `window`, `band`, `banner`, `screen`, `dash`, `sheet`, `popup`
- **Traps**: `ui`

## data

The client's tables (src/data/): items, zones, abilities, the long display and systems tables.

- **Rest of**: `src/data/`
- **Doors**: none named yet
- **Switches**: none
- **Words**: `data`, `table`, `mirror`
- **Traps**: none

## state

The state ledger: every field of S and top-of-file variable, a file a system.

- **Files**: everything under `src/state/`
- **Doors**: none named yet
- **Switches**: none
- **Words**: `ledger`
- **Traps**: none

## debug

The crash ring, the perf HUD, the debug overlay.

- **Files**: everything under `src/debug/`
- **Doors**: none named yet
- **Switches**: none
- **Words**: `debug`, `crash`, `perf`
- **Traps**: none

## shell

The page itself: main.jsx, index.html, the QA harness pages, the public files.

- **Files**: the files at the top of `src/`
- **Files**: everything under `src/public/`
- **Files**: everything under `src/lib/`
- **Doors**: none named yet
- **Switches**: none
- **Words**: `shell`, `main`, `index`
- **Traps**: none

## vendor

Code from outside, kept as it came (with its licence).

- **Files**: everything under `server/src/vendor/`
- **Doors**: none named yet
- **Switches**: none
- **Words**: none
- **Traps**: none
