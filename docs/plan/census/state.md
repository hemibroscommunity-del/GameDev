# The state, read: every field of `S` and every top-of-file variable

v2.3.5030, card D of `docs/GRAND-PLAN.md` (step 5.3's census, as a document).

**This page is made by a machine.** `node tools/dev/state-census.mjs --write` makes it again from the code;
`--check` says whether it is still true; `--json` gives every row with its full lists of files and lines.
Do not edit it by hand: the one hand-made column lives in the script's `SUGGESTED` table.
It is a census, not a guard and not a ledger: card U makes the ledger files, a system at a time, from these rows.

## What counts as a row

1. **A top-level field of the state object**, written `S.<name>` or through an alias of `S`. A nested path
   (`S.player.x`, `S.rpg.inventory.push(...)`) is its top-level field's row.
2. **A variable at the top of a file under `src/` that holds state**: a `let` or `var`, or a `const` Map, Set,
   array or object that is changed after it is made.

How the machine reads that rule (it reads all 886 `.js` and `.jsx` files under `src/` as syntax trees, so a
name in a comment or a string is never counted):

- **The state** is `<ref>.current`, where `<ref>` is any name or property spelt `stateRef` or `_gameState`
  (`props.stateRef`, `ctx.stateRef`, `window._gameState`).
- **An alias** is: a name given that value (`var S = stateRef.current`, under any name: `S2`, `_S`, `st`); a call
  of a function that returns it (`getState()`), or of a getter handed along (`getS()`); a parameter spelt `S`,
  plain or destructured from a component's props; and a parameter or prop of any name that some call the
  machine can follow hands the state to, across files.
  A parameter spelt `S` is NOT the state when every call the machine can follow hands it something plainly
  else (2 today: `rendering/lookArmour.js:415`, `rendering/sootMarks.js:56`).
- **A write** to a field is one of three kinds, counted apart:
  - *set*: `S.x = v`, `S.x += 1`, `S.x++`, `delete S.x`, `Object.assign(S, { x })`;
  - *inside*: `S.x.y = v`, `S.x[k] = v`, `S.x.push(v)` and the other changing calls (`pop shift unshift splice
    sort reverse fill copyWithin set add delete clear`), `S.x.length = 0`, `Object.assign(S.x, ...)`;
  - *through a name for the inside* (a file marked `~`): `var p = S.player; p.x = 1`; a loop's or a callback's
    element (`for (const m of S.monsters) m.hp = 0`); a parameter that a followed call hands an inside to.
    This kind is a "may write": the machine does not follow the order of statements.
- **A read** is any other `S.<name>`. A read that only feeds a write of the same field (`S.x = S.x || []`,
  `if (!S.x) S.x = []`) is not a reader.
- **A top-of-file variable** is a `let`, `var` or `const` declared at the top level of a module. A `const` is
  a row only when the code changes what it holds (a property written, a changing call, `delete`,
  `Object.assign`), in its own file or in a file that imports it. Every `let` and `var` is a row; the 209
  that are never changed after they are made (constants written with `var`) are listed apart, by name.

## The columns

- **born**: `first` is the state's first object (`ui/BroTown.jsx`, `useRef({...})`), with its line; `fly` is a
  field made on the fly, with the first line that sets it in its system's file; `never set` is a field the
  code only reads or only changes inside.
- **system (provisional)**: the folder and file. For a field, the file that sets it most (then changes it
  inside most, then reads it most). The system map is card B's; this column is a placeholder for it.
- **written by / read by**: the number of files when more than one, then the files (paths under `src/`),
  most touches first; `+n` is the rest (`--json` has them all).
- **marks** (marked, not judged):
  - `2+` written (set or changed inside) from two or more files; `2+~` only when writes through a name for
    the inside are counted;
  - `no-read` nothing under `src/` reads it; `no-read (tests)` the same, but a file under `tools/` or
    `server/test/` names it (the QA probes read `window._gameState`);
  - `no-set` nothing sets it: it is read, or changed inside, and never made;
  - `phase` it looks like a state machine's one field (step 5.3b): it is set to, or compared with, two or
    more different words, or its name ends in Phase, State, Mode, Stage or Status and it has one. The
    phases have a table of their own below;
  - `flag` it is only ever set to true or false: the smallest phase there is, if it is one.
- **written at (today)**: where the code writes it now, read off the code: `zone` (in the block around a
  call of `changeZone()`, or a function that block calls), `death` (around `S._dying = true`, in
  `applyLocalRespawn`, or a function they call), `rejoin` (in `wsClient.js`'s `case 'state_sync'`, in
  `rejoinClear`, or a function they call). It says the code runs there, not that the value is cleared.
- **should reset (suggested, not confirmed)**: the one column the machine cannot fill. One of `never` (it
  lives for the sitting), `zone` (it belongs to the place: a death's respawn and a dungeon's door change
  the zone too), `death` (it belongs to one life), `rejoin` (it is the phone's copy of what the worker
  holds, cleared at `state_sync` and said again); two joined by `+` mean both. `?` is a row nobody has
  read yet. These are a reader's suggestions for card U's ledger, where each is confirmed or changed.

## The state's fields

| field | born | system (provisional) | written by | read by | marks | written at (today) | should reset (suggested, not confirmed) |
|---|---|---|---|---|---|---|---|
| `_rendererKind` | never set | debug/DebugOverlay.jsx | - | debug/DebugOverlay.jsx | no-set | - | never |
| `_tickCount` | never set | debug/DebugOverlay.jsx | - | debug/DebugOverlay.jsx | no-set | - | never |
| `tickCount` | never set | debug/DebugOverlay.jsx | - | debug/DebugOverlay.jsx | no-set | - | never |
| `_abilityFx` | fly :712 | game/abilities.js | game/abilities.js | - | no-read | - | never |
| `_abilitySwingUntil` | fly :615 | game/abilities.js | 2: game/abilities.js, networking/wsClient.js | game/monsterCombat.js | 2+ | - | never |
| `_swingAng` | fly :714 | game/abilities.js | 2: game/abilities.js, game/monsterCombat.js | 2: game/swordFeel.js, rendering/systems/entityRenderer.js | 2+ | - | never |
| `_whirlWindup` | fly :634 | game/abilities.js | 4: game/abilities.js, game/zoneTransitions.js, networking/wsClient.js, ui/BroTown.jsx | 4: game/abilities.js, game/whirlCatch.js, rendering/systems/effectsRenderer.js, +1 | 2+ | zone | zone |
| `_acc` | fly :32 | game/accuracy.js | game/accuracy.js | game/accuracy.js | - | rejoin | rejoin |
| `_accState` | fly :82 | game/accuracy.js | game/accuracy.js | ui/mobile/dash/JourneyPanel.jsx | - | - | rejoin |
| `_achv` | fly :76 | game/achievements.js | 2: game/achievements.js, ui/panels/AchievementBanner.jsx | 5: game/achievements.js, ui/mobile/dash/AchievementsPanel.jsx, ui/panels/AchievementBanner.jsx, +2 | 2+ | - | rejoin |
| `_avatarArtHold` | fly :59 | game/avatarHold.js | game/avatarHold.js | 2: game/avatarHold.js, ui/BroTown.jsx | - | - | never |
| `_bank` | fly :77 | game/bank.js | game/bank.js | 2: ui/panels/buildings/BankPanel.jsx, game/bank.js | - | - | rejoin |
| `_bankPending` | fly :64 | game/bank.js | game/bank.js | game/bank.js | - | - | rejoin |
| `_bodyPlaceDue` | fly :42 | game/bodyPlace.js | game/bodyPlace.js | game/bodyPlace.js | - | rejoin | rejoin |
| `_bodyPlacedAt` | fly :78 | game/bodyPlace.js | game/bodyPlace.js | - | no-read (tests) | - | never |
| `_bf` | fly :76 | game/bowFeel.js | 2: game/bowDraw.js~, game/bowFeel.js | 2: game/bowFeel.js, rendering/systems/bowFeelFx.js | 2+~ | - | zone |
| `_bfPose` | fly :167 | game/bowFeel.js | game/bowFeel.js | 2: rendering/systems/entityRenderer.js, game/bowFeel.js | - | - | never |
| `_bowShotAt` | fly :248 | game/bowFeel.js | 3: game/bowFeel.js, game/monsterCombat.js, ui/BroTown.jsx | 2: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js | 2+ | - | never |
| `_diceAskAt` | fly :84 | game/chat.js | game/chat.js | game/dice.js | - | - | never |
| `chatBubbles` | first :1175 | game/chat.js | 4: game/chat.js, game/interactions.js, ui/mobile/ChatBubble.jsx, game/stateCleanup.js | 3: game/stateCleanup.js, rendering/systems/entityRenderer.js, rendering/systems/effectsRenderer.js | 2+ | - | never |
| `chatLog` | first :1165 | game/chat.js | 10: game/chat.js, networking/gameEvents.js, networking/wsClient.js, ui/mobile/ChatBubble.jsx, game/achievements.js, +5 | 6: game/chat.js, networking/wsClient.js, networking/gameEvents.js, +3 | 2+ | zone, death | never |
| `_serverMuteNames` | fly :217 | game/chatMute.js | game/chatMute.js | - | no-read | - | rejoin |
| `_serverMutes` | fly :216 | game/chatMute.js | game/chatMute.js | - | no-read | - | rejoin |
| `_climb` | fly :106 | game/climbActions.js | 2: game/climbActions.js, ui/BroTown.jsx | 4: game/climbActions.js, rendering/systems/entityRenderer.js, ui/BroTown.jsx, +1 | 2+ | - | zone |
| `_climbDrop` | fly :152 | game/climbActions.js | 2: game/climbActions.js, ui/BroTown.jsx | 3: game/climbActions.js, game/jump.js, ui/BroTown.jsx | 2+ | - | zone |
| `_nearChest` | fly :152 | game/climbActions.js | 2: game/climbActions.js, ui/BroTown.jsx | 3: game/climbActions.js, game/desktopControls.js, ui/BroTown.jsx | 2+ | - | zone |
| `_pushY` | fly :117 | game/climbActions.js | game/climbActions.js | game/climbActions.js | - | - | never |
| `_riseChestAsk` | fly :249 | game/climbActions.js | game/climbActions.js | game/climbActions.js | - | - | rejoin |
| `_riseChestGot` | fly :266 | game/climbActions.js | game/climbActions.js | game/climbActions.js | - | - | never |
| `_riseCross` | fly :76 | game/climbActions.js | 2: game/climbActions.js, ui/BroTown.jsx | 2: game/climbActions.js, ui/BroTown.jsx | 2+ | - | zone |
| `_arrowSnaps` | fly :1161 | game/combatHelpers.js | 2: game/combatHelpers.js, rendering/systems/effectsRenderer.js~ | 2: game/combatHelpers.js, rendering/systems/effectsRenderer.js | 2+~ | - | zone |
| `_climbNoteAt` | fly :752 | game/combatHelpers.js | game/combatHelpers.js | game/combatHelpers.js | - | - | never |
| `_dazeNoteAt` | fly :813 | game/combatHelpers.js | game/combatHelpers.js | game/combatHelpers.js | - | - | never |
| `_debrisBursts` | fly :912 | game/combatHelpers.js | 7: game/combatHelpers.js, game/wheelBreak.js, rendering/monsterDeathFx.js, rendering/systems/effectsRenderer.js~, rendering/wheelObjects.js, +2 | 5: game/combatHelpers.js, game/wheelBreak.js, rendering/hitMaterialFx.js, +2 | 2+ | zone | zone |
| `_dmgFromMonster` | fly :532 | game/combatHelpers.js | game/combatHelpers.js | game/combatHelpers.js | - | - | zone |
| `_offlineNoteAt` | fly :782 | game/combatHelpers.js | game/combatHelpers.js | game/combatHelpers.js | - | - | never |
| `_peerDmgLastRel` | fly :357 | game/combatHelpers.js | game/combatHelpers.js | game/combatHelpers.js | - | - | zone |
| `_peerDmgQueue` | fly :326 | game/combatHelpers.js | game/combatHelpers.js | game/combatHelpers.js | - | - | zone |
| `_peerDmgZone` | fly :358 | game/combatHelpers.js | game/combatHelpers.js | game/combatHelpers.js | - | - | never |
| `_propMarks` | fly :1084 | game/combatHelpers.js | 2: game/combatHelpers.js, rendering/systems/effectsRenderer.js~ | 2: game/combatHelpers.js, rendering/systems/effectsRenderer.js | 2+~ | - | zone |
| `_staffCrashes` | fly :1068 | game/combatHelpers.js | 3: game/combatHelpers.js, game/zoneTransitions.js, rendering/staffCastFx.js~ | 2: game/combatHelpers.js, rendering/staffCastFx.js | 2+ | zone | zone |
| `_staggerNoteAt` | fly :832 | game/combatHelpers.js | 2: game/combatHelpers.js, networking/gameEvents.js | game/combatHelpers.js | 2+ | - | never |
| `groundSplatter` | first :1279 | game/combatHelpers.js | 4: game/combatHelpers.js, game/monsterCombat.js, game/stateCleanup.js, rendering/systems/effectsRenderer.js~ | 4: game/combatHelpers.js, game/monsterCombat.js, game/renderFrame.js, +1 | 2+ | - | zone |
| `_dailyRewards` | fly :243 | game/dailyRewards.js | game/dailyRewards.js | - | no-read | - | rejoin |
| `_deathCard` | fly :61 | game/deathCard.js | game/deathCard.js | game/deathCard.js | - | zone, death | death |
| `_dblTap` | fly :211 | game/desktopControls.js | 2: game/deskCombos.js~, game/desktopControls.js | game/desktopControls.js | 2+~ | - | never |
| `_dblTapRolls` | fly :213 | game/desktopControls.js | game/desktopControls.js | - | no-read (tests) | - | never |
| `_eTalkHints` | fly :358 | game/desktopControls.js | game/desktopControls.js | - | no-read (tests) | - | never |
| `_interactNow` | fly :179 | game/desktopControls.js | game/desktopControls.js | ui/BroTown.jsx | - | - | never |
| `_isDesktop` | fly :181 | game/desktopControls.js | game/desktopControls.js | 2: ui/BroTown.jsx, ui/mobile/FarmBedPrompt.jsx | - | - | never |
| `keys` | first :1159 | game/desktopControls.js | game/desktopControls.js | 3: game/desktopControls.js, game/jumpActions.js, ui/BroTown.jsx | - | - | never |
| `_dodgeFlash` | fly :145 | game/dodge.js | game/dodge.js | - | no-read | - | never |
| `_dodgeRoll` | first :1242 | game/dodge.js | 2: game/dodge.js, ui/BroTown.jsx | 10: ui/BroTown.jsx, rendering/systems/entityRenderer.js, game/desktopControls.js, +7 | 2+ | - | zone |
| `_hasDodged` | fly :144 | game/dodge.js | game/dodge.js | ui/BroTown.jsx | flag | - | never |
| `_lungeIFramesUntil` | fly :212 | game/dodge.js | game/dodge.js | - | no-read | - | never |
| `_stuckNoteAt` | fly :72 | game/dodge.js | game/dodge.js | game/dodge.js | - | - | never |
| `respawnTimer` | first :1300 | game/dodge.js | 4: game/dodge.js, game/monsterCombat.js, game/respawn.js, ui/BroTown.jsx | 2: game/monsterCombat.js, game/projectiles.js | 2+ | zone, death | never |
| `_dlCredits` | fly :180 | game/dropLines.js | game/dropLines.js | game/dropLines.js | - | - | zone |
| `_dropLines` | fly :181 | game/dropLines.js | 2: game/dropLines.js, rendering/dropLines.js~ | 2: game/dropLines.js, rendering/dropLines.js | 2+~ | - | zone |
| `_dungeonClear` | fly :36 | game/dungeonClear.js | game/dungeonClear.js | 2: game/dungeonClear.js, rendering/arenaWorld.js | - | - | zone |
| `_customDungeonConfig` | fly :90 | game/dungeonWaves.js | 6: game/dungeonWaves.js, networking/gameEvents.js, game/respawn.js, game/wheelDungeons.js, game/zoneTransitions.js, +1 | game/dungeonWaves.js | 2+ | zone, death | zone+rejoin |
| `_dungeonComplete` | fly :76 | game/dungeonWaves.js | 6: game/dungeonWaves.js, networking/gameEvents.js, game/respawn.js, game/wheelDungeons.js, game/zoneTransitions.js, +1 | game/dungeonWaves.js | 2+, flag | zone, death | zone+rejoin |
| `_inCustomDungeon` | fly :89 | game/dungeonWaves.js | 6: game/dungeonWaves.js, networking/gameEvents.js, game/respawn.js, game/wheelDungeons.js, game/zoneTransitions.js, +1 | game/dungeonWaves.js | 2+, flag | zone, death | zone+rejoin |
| `_inDungeon` | fly :88 | game/dungeonWaves.js | 6: game/dungeonWaves.js, networking/gameEvents.js, game/respawn.js, game/wheelDungeons.js, game/zoneTransitions.js, +1 | 4: game/zoneTransitions.js, debug/report.js, game/dungeonWaves.js, +1 | 2+, flag | zone, death | zone+rejoin |
| `_burnUntil` | fly :201 | game/elemHits.js | game/elemHits.js | rendering/systems/effectsRenderer.js | - | - | zone |
| `_chillUntil` | fly :195 | game/elemHits.js | game/elemHits.js | 2: game/elemHits.js, rendering/systems/effectsRenderer.js | - | - | zone |
| `_dazeUntil` | fly :204 | game/elemHits.js | game/elemHits.js | 2: game/elemHits.js, rendering/systems/effectsRenderer.js | - | - | zone |
| `_fractureStacks` | fly :218 | game/elemHits.js | game/elemHits.js | rendering/systems/effectsRenderer.js | - | - | zone |
| `_fractureUntil` | fly :217 | game/elemHits.js | game/elemHits.js | rendering/systems/effectsRenderer.js | - | - | zone |
| `_frozenAt` | fly :198 | game/elemHits.js | game/elemHits.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_frozenUntil` | fly :198 | game/elemHits.js | game/elemHits.js | 2: game/elemHits.js, rendering/systems/effectsRenderer.js | - | - | zone |
| `_gust` | fly :238 | game/elemHits.js | 2: game/elemHits.js, ui/BroTown.jsx | 2: ui/BroTown.jsx, game/elemHits.js | 2+ | - | zone |
| `_gustAng` | fly :236 | game/elemHits.js | 2: game/elemHits.js, networking/gameEvents.js | rendering/systems/effectsRenderer.js | 2+ | - | never |
| `_gustAt` | fly :235 | game/elemHits.js | 2: game/elemHits.js, networking/gameEvents.js | rendering/systems/effectsRenderer.js | 2+ | - | never |
| `_poisonUntil` | fly :210 | game/elemHits.js | game/elemHits.js | rendering/systems/effectsRenderer.js | - | - | zone |
| `_shockAt` | fly :222 | game/elemHits.js | game/elemHits.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_shockFrom` | fly :226 | game/elemHits.js | game/elemHits.js | rendering/systems/effectsRenderer.js | - | - | zone |
| `_shockUntil` | fly :221 | game/elemHits.js | game/elemHits.js | rendering/systems/effectsRenderer.js | - | - | zone |
| `_slowMult` | fly :214 | game/elemHits.js | game/elemHits.js | game/elemHits.js | - | - | never |
| `_slowUntil` | fly :215 | game/elemHits.js | game/elemHits.js | 2: game/elemHits.js, rendering/systems/effectsRenderer.js | - | - | zone |
| `_soakUntil` | fly :209 | game/elemHits.js | game/elemHits.js | rendering/systems/effectsRenderer.js | - | - | zone |
| `_staggerUntil` | fly :338 | game/elemHits.js | 2: game/elemHits.js, networking/gameEvents.js | game/elemHits.js | 2+ | - | zone |
| `_stuckUntil` | fly :200 | game/elemHits.js | game/elemHits.js | 2: game/elemHits.js, rendering/systems/effectsRenderer.js | - | - | zone |
| `_thornUntil` | fly :219 | game/elemHits.js | game/elemHits.js | rendering/systems/effectsRenderer.js | - | - | zone |
| `_wardAt` | fly :193 | game/elemHits.js | game/elemHits.js | rendering/systems/entityRenderer.js | - | - | never |
| `_wardElem` | fly :193 | game/elemHits.js | game/elemHits.js | rendering/systems/entityRenderer.js | - | - | never |
| `_wardPct` | fly :193 | game/elemHits.js | game/elemHits.js | - | no-read | - | never |
| `_wobbleFrom` | fly :207 | game/elemHits.js | game/elemHits.js | 2: game/elemHits.js, rendering/systems/effectsRenderer.js | - | - | zone |
| `_wobbleUntil` | fly :207 | game/elemHits.js | game/elemHits.js | 2: game/elemHits.js, rendering/systems/effectsRenderer.js | - | - | zone |
| `_farmArtHold` | fly :98 | game/farmTrip.js | game/farmTrip.js | 6: ui/BroTown.jsx, game/farmTrip.js, game/farmWalk.js, +3 | - | zone | zone |
| `_farmLeaving` | fly :91 | game/farmTrip.js | 2: game/farmTrip.js, game/wheelTownDoors.js | game/farmTrip.js | 2+ | zone | zone |
| `_farmAskedAt` | fly :135 | game/farmWalk.js | game/farmWalk.js | game/farmWalk.js | - | - | never |
| `_farmLastSeed` | fly :210 | game/farmWalk.js | game/farmWalk.js | game/farmWalk.js | - | - | never |
| `_farmLastStep` | fly :212 | game/farmWalk.js | game/farmWalk.js | game/farmFeedback.js | - | - | never |
| `_farmSeedPick` | fly :78 | game/farmWalk.js | game/farmWalk.js | game/farmWalk.js | - | - | never |
| `_farmSteps` | fly :202 | game/farmWalk.js | game/farmWalk.js | game/farmWalk.js | - | - | never |
| `_farmWork` | fly :108 | game/farmWalk.js | 3: game/farmWalk.js, rendering/farmWorld.js~, game/zoneTransitions.js | 7: ui/BroTown.jsx, rendering/systems/entityRenderer.js, game/farmWalk.js, +4 | 2+ | zone | zone |
| `_nearBed` | fly :107 | game/farmWalk.js | game/farmWalk.js | 4: game/desktopControls.js, game/farmWalk.js, ui/mobile/FarmBedPrompt.jsx, +1 | - | - | zone |
| `_dealtAt` | fly :136 | game/fightFood.js | game/fightFood.js | 4: game/fightFood.js, game/pinSlots.js, game/pointsTips.js, +1 | - | - | never |
| `_instantHealAt` | fly :90 | game/fightFood.js | game/fightFood.js | game/fightFood.js | - | - | never |
| `_pvpAt` | fly :75 | game/fightFood.js | game/fightFood.js | 3: game/fightFood.js, game/pinSlots.js, ui/BroTown.jsx | - | - | never |
| `_fishBoard` | fly :73 | game/fishWeigh.js | game/fishWeigh.js | 2: game/fishWeigh.js, ui/mobile/dash/FishBoard.jsx | - | - | rejoin |
| `_heapBurnSentAt` | fly :40 | game/heapBurn.js | game/heapBurn.js | game/heapBurn.js | - | - | never |
| `_heapBurnUntil` | fly :38 | game/heapBurn.js | game/heapBurn.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_shotEnds` | fly :154 | game/hitSounds.js | game/hitSounds.js | game/hitSounds.js | - | - | zone |
| `_dead` | never set | game/interactions.js | - | game/interactions.js | no-set | - | never |
| `_emoteAt` | fly :32 | game/interactions.js | game/interactions.js | game/interactions.js | - | - | never |
| `_emoteMove` | fly :86 | game/interactions.js | game/interactions.js | 3: rendering/emoteFx.js, game/interactions.js, game/townsfolkReact.js | - | - | never |
| `_pose` | fly :93 | game/interactions.js | 3: game/interactions.js, game/moveSounds.js~, game/rejoinSlots.js | 6: game/interactions.js, rendering/emoteFx.js, game/ride.js, +3 | 2+ | rejoin | zone+rejoin |
| `emote` | first :1232 | game/interactions.js | game/interactions.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_dropLast` | fly :92 | game/itemDrop.js | game/itemDrop.js | - | no-read | - | never |
| `_jump` | fly :277 | game/jump.js | 2: game/jumpActions.js, game/jump.js | 9: game/climbActions.js, ui/BroTown.jsx, rendering/systems/entityRenderer.js, +6 | 2+ | - | zone |
| `_jumpLandAt` | fly :293 | game/jump.js | game/jump.js | 2: game/jump.js, ui/panels/JumpButton.jsx | - | - | never |
| `_jumpOver` | fly :291 | game/jump.js | game/jump.js | 2: game/jump.js, ui/BroTown.jsx | - | - | zone |
| `_flipCount` | fly :132 | game/jumpActions.js | game/jumpActions.js | - | no-read (tests) | - | never |
| `_jumpCount` | fly :85 | game/jumpActions.js | game/jumpActions.js | ui/panels/JumpButton.jsx | - | - | never |
| `_jumpLandFx` | fly :157 | game/jumpActions.js | game/jumpActions.js | rendering/jumpFx.js | - | - | never |
| `_jumpWhy` | fly :70 | game/jumpActions.js | game/jumpActions.js | ui/panels/JumpButton.jsx | - | - | never |
| `_lastFlip` | fly :133 | game/jumpActions.js | game/jumpActions.js | - | no-read (tests) | - | never |
| `_lastJumpRun` | fly :169 | game/jumpActions.js | game/jumpActions.js | - | no-read (tests) | - | never |
| `_killXpFlewAt` | fly :85 | game/killXp.js | game/killXp.js | game/killXp.js | - | - | never |
| `_killXpKillAt` | fly :78 | game/killXp.js | game/killXp.js | - | no-read (tests) | - | never |
| `_killXpWait` | fly :84 | game/killXp.js | game/killXp.js | game/killXp.js | - | - | zone |
| `_levelUpFlash` | fly :79 | game/levelCelebration.js | 2: game/levelCelebration.js, game/stateCleanup.js | rendering/systems/effectsRenderer.js | 2+ | - | never |
| `_extraction` | fly :218 | game/lifeSkillRewards.js | 6: ui/ExtractionSwipeLayer.jsx~, game/lifeSkillRewards.js, rendering/systems/effectsRenderer.js~, ui/BroTown.jsx, game/gesturePose.js~, +1 | 19: ui/BroTown.jsx, game/lifeSkillRewards.js, rendering/systems/entityRenderer.js, +16 | 2+ | zone | zone |
| `_gatherHitSeq` | fly :253 | game/lifeSkillRewards.js | game/lifeSkillRewards.js | game/lifeSkillRewards.js | - | - | never |
| `_lastHarvestOkAt` | fly :546 | game/lifeSkillRewards.js | game/lifeSkillRewards.js | ui/deskTeach.js | - | - | never |
| `player` | first :1143 | game/lifeSkillRewards.js | 18: game/zoneTransitions.js~, ui/BroTown.jsx, game/monsterCombat.js, game/lifeSkillRewards.js, game/wheelHome.js~, +13 | 143: networking/gameEvents.js, ui/BroTown.jsx, networking/wsClient.js, +140 | 2+ | zone, death | never |
| `_mc` | fly :294 | game/manualCombat.js | game/manualCombat.js | 4: game/manualCombat.js, game/swordFeel.js, ui/BroTown.jsx, +1 | - | - | never |
| `_codex` | fly :37 | game/monsterCodex.js | 2: game/monsterCodex.js, ui/panels/NewMonsterCard.jsx~ | 4: game/monsterCodex.js, game/achievements.js, ui/mobile/dash/AchievementsPanel.jsx, +1 | 2+~ | - | rejoin |
| `_bowShotAng` | fly :1994 | game/monsterCombat.js | game/monsterCombat.js | rendering/systems/entityRenderer.js | - | - | never |
| `_bowSight` | fly :1580 | game/monsterCombat.js | game/monsterCombat.js | 4: rendering/systems/effectsRenderer.js, game/monsterCombat.js, game/playerActions.js, +1 | - | - | never |
| `_bowSpecialQueued` | fly :1816 | game/monsterCombat.js | 2: game/monsterCombat.js, game/playerActions.js | 2: game/monsterCombat.js, ui/panels/SpecialButton.jsx | 2+ | - | never |
| `_cursedUntil` | fly :1017 | game/monsterCombat.js | game/monsterCombat.js | 2: ui/BroTown.jsx, game/monsterCombat.js | - | - | death |
| `_deathDrops` | first :1285 | game/monsterCombat.js | 3: game/monsterCombat.js, game/zoneTransitions.js, ui/BroTown.jsx | 2: game/zoneTransitions.js, ui/BroTown.jsx | 2+ | zone, death | never |
| `_hitFlash` | fly :679 | game/monsterCombat.js | 3: game/monsterCombat.js, game/projectiles.js, networking/gameEvents.js | rendering/systems/entityRenderer.js | 2+ | - | never |
| `_killSlowmo` | fly :447 | game/monsterCombat.js | 2: game/monsterCombat.js, ui/BroTown.jsx | game/monsterCombat.js | 2+ | - | never |
| `_killSlowmoDuration` | never set | game/monsterCombat.js | - | game/monsterCombat.js | no-set | - | never |
| `_ownCollisionRecent` | fly :2554 | game/monsterCombat.js | 2: game/monsterCombat.js, game/projectiles.js | networking/gameEvents.js | 2+ | - | never |
| `_ownSpecialRecent` | fly :2722 | game/monsterCombat.js | game/monsterCombat.js | networking/gameEvents.js | - | - | never |
| `_playerStunUntil` | fly :682 | game/monsterCombat.js | game/monsterCombat.js | 6: game/abilities.js, game/jumpActions.js, game/monsterCombat.js, +3 | - | - | death |
| `_propSwingAt` | fly :2149 | game/monsterCombat.js | game/monsterCombat.js | game/monsterCombat.js | - | - | never |
| `_pvpThreat` | fly :3296 | game/monsterCombat.js | 2: game/monsterCombat.js, game/projectiles.js | - | 2+, no-read | - | never |
| `_rpgSaveTimer` | fly :3493 | game/monsterCombat.js | game/monsterCombat.js | game/monsterCombat.js | - | - | never |
| `_staffCadenceMs` | fly :1988 | game/monsterCombat.js | game/monsterCombat.js | rendering/staffCastFx.js | - | - | never |
| `_staffCastAng` | fly :1987 | game/monsterCombat.js | 2: game/monsterCombat.js, game/playerActions.js | 2: rendering/staffCastFx.js, rendering/systems/entityRenderer.js | 2+ | - | never |
| `_staffCastAt` | fly :1986 | game/monsterCombat.js | 2: game/monsterCombat.js, game/playerActions.js | 3: rendering/staffCastFx.js, rendering/systems/entityRenderer.js, game/monsterCombat.js | 2+ | - | never |
| `_staffCastBig` | fly :1989 | game/monsterCombat.js | 2: game/monsterCombat.js, game/playerActions.js | 2: rendering/systems/entityRenderer.js, rendering/staffCastFx.js | 2+ | - | never |
| `_swingBcastPending` | fly :2015 | game/monsterCombat.js | 2: game/monsterCombat.js, game/playerActions.js | game/monsterCombat.js | 2+, flag | - | never |
| `_swingSfxKey` | fly :2021 | game/monsterCombat.js | 2: game/monsterCombat.js, game/playerActions.js | game/monsterCombat.js | 2+ | - | never |
| `_swingSfxPending` | fly :2022 | game/monsterCombat.js | 4: game/monsterCombat.js, game/playerActions.js, game/shieldToggle.js, ui/BroTown.jsx | game/monsterCombat.js | 2+, flag | - | never |
| `isSwinging` | first :1272 | game/monsterCombat.js | 6: game/monsterCombat.js, game/playerActions.js, game/abilities.js, game/climbActions.js, game/shieldToggle.js, +1 | 7: ui/BroTown.jsx, rendering/systems/effectsRenderer.js, game/monsterCombat.js, +4 | 2+, flag | - | never |
| `lastDamageTaken` | first :1298 | game/monsterCombat.js | 3: game/monsterCombat.js, networking/gameEvents.js, game/projectiles.js | 7: ui/BroTown.jsx, game/shieldToggle.js, rendering/systems/entityRenderer.js, +4 | 2+ | - | never |
| `_monNoiseAt` | fly :72 | game/monsterNoises.js | game/monsterNoises.js | game/monsterNoises.js | - | - | never |
| `_nmlAskAgain` | fly :413 | game/nmlAsk.js | game/nmlAsk.js | game/nmlAsk.js | - | - | never |
| `_nmlAsked` | fly :178 | game/nmlAsk.js | game/nmlAsk.js | game/nmlAsk.js | - | - | zone |
| `_nmlAskedAt` | fly :187 | game/nmlAsk.js | game/nmlAsk.js | game/nmlAsk.js | - | - | never |
| `_nmlAskMarks` | fly :133 | game/noMansLand.js | 2: game/noMansLand.js, rendering/systems/entityRenderer.js | 2: rendering/systems/entityRenderer.js, game/noMansLand.js | 2+ | - | never |
| `_nmlConfiscatedAt` | fly :303 | game/noMansLand.js | game/noMansLand.js | networking/wsClient.js | - | - | never |
| `_nmlLevel` | fly :212 | game/noMansLand.js | game/noMansLand.js | - | no-read (tests) | - | zone |
| `_nmlLockAskAt` | fly :142 | game/noMansLand.js | game/noMansLand.js | game/noMansLand.js | - | - | never |
| `_nmlLocks` | fly :111 | game/noMansLand.js | game/noMansLand.js | game/noMansLand.js | - | - | rejoin |
| `_nmlSelf` | fly :259 | game/noMansLand.js | game/noMansLand.js | 2: game/nmlAsk.js, game/plateSafety.js | - | - | rejoin |
| `_mapPins` | fly :107 | game/pinSlots.js | game/pinSlots.js | game/pinSlots.js | - | - | never |
| `_burstMsgAt` | fly :753 | game/playerActions.js | game/playerActions.js | game/playerActions.js | - | - | never |
| `_hasUsedSwipe` | fly :271 | game/playerActions.js | 2: game/playerActions.js, ui/BroTown.jsx | ui/mobile/QuestCoach.jsx | 2+, flag | - | never |
| `_iceAttack` | fly :674 | game/playerActions.js | game/playerActions.js | - | no-read, flag | - | zone |
| `_lastBurstAt` | fly :761 | game/playerActions.js | game/playerActions.js | 2: ui/mobile/ElementBurstButton.jsx, game/playerActions.js | - | - | never |
| `_lastSwipe` | fly :270 | game/playerActions.js | game/playerActions.js | 4: ui/panels/SpecialButton.jsx, game/monsterCombat.js, ui/BroTown.jsx, +1 | - | - | never |
| `_shieldStamina` | never set | game/playerActions.js | - | game/playerActions.js | no-set | - | death |
| `_specialAttack` | fly :96 | game/playerActions.js | 3: game/playerActions.js, game/abilities.js, game/monsterCombat.js | 4: game/monsterCombat.js, rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js, +1 | 2+, flag | - | zone |
| `shieldActive` | first :1302 | game/playerActions.js | 2: game/playerActions.js, game/shieldToggle.js | - | 2+, no-read | - | death |
| `swingTimer` | first :1266 | game/playerActions.js | 3: game/abilities.js, game/playerActions.js, game/monsterCombat.js | 11: game/monsterCombat.js, rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js, +8 | 2+ | - | never |
| `_pointsResetAskedAt` | fly :59 | game/pointsReset.js | game/pointsReset.js | game/pointsReset.js | - | - | rejoin |
| `_mail` | fly :101 | game/postOffice.js | game/postOffice.js | game/postOffice.js | - | - | never |
| `_mapWatchSent` | fly :137 | game/presence2.js | game/presence2.js | - | no-read | - | never |
| `_onlineAt` | fly :105 | game/presence2.js | game/presence2.js | game/presence2.js | - | - | never |
| `_shotImpacts` | fly :1060 | game/projectiles.js | 2: game/projectiles.js, rendering/monsterShotFx.js~ | 2: game/projectiles.js, rendering/monsterShotFx.js | 2+~ | - | zone |
| `dmgNumbers` | first :1273 | game/projectiles.js | 4: rendering/systems/effectsRenderer.js~, ui/BroTown.jsx~, game/combatHelpers.js, game/projectiles.js | 7: ui/BroTown.jsx, game/combatHelpers.js, game/monsterCombat.js, +4 | 2+ | - | zone |
| `_pvpSwSent` | fly :65 | game/pvpSwing.js | game/pvpSwing.js | game/pvpSwing.js | - | - | never |
| `_pvpSwSentBy` | fly :55 | game/pvpSwing.js | game/pvpSwing.js | game/pvpSwing.js | - | - | never |
| `_qcNextPoll` | fly :36 | game/questComplete.js | game/questComplete.js | game/questComplete.js | - | - | never |
| `_qcSeen` | fly :45 | game/questComplete.js | game/questComplete.js | game/questComplete.js | - | - | never |
| `_race` | fly :75 | game/race.js | game/race.js | 4: game/race.js, rendering/systems/effectsRenderer.js, game/wheelMusic.js, +1 | - | - | zone+rejoin |
| `_raceLil` | fly :117 | game/race.js | game/race.js | game/race.js | - | - | zone+rejoin |
| `__pixiErrStreak` | fly :60 | game/renderFrame.js | game/renderFrame.js | game/renderFrame.js | - | - | never |
| `_splitLog` | fly :120 | game/renderFrame.js | game/renderFrame.js | game/renderFrame.js | - | - | never |
| `campfires` | never set | game/renderFrame.js | - | 2: game/renderFrame.js, ui/BroTown.jsx | no-set | - | zone |
| `projectiles` | never set | game/renderFrame.js | - | 2: game/renderFrame.js, ui/BroTown.jsx | no-set | - | zone |
| `_restAsked` | fly :63 | game/rest.js | game/rest.js | game/rest.js | - | - | rejoin |
| `_revealLast` | fly :176 | game/revealBag.js | game/revealBag.js | - | no-read | - | never |
| `_ride` | fly :32 | game/ride.js | 2: game/ride.js, ui/BroTown.jsx | 5: game/ride.js, ui/BroTown.jsx, rendering/rideFx.js, +2 | 2+ | rejoin | zone+rejoin |
| `_shieldAutoReleased` | fly :155 | game/shieldToggle.js | 2: game/shieldToggle.js, ui/BroTown.jsx | - | 2+, no-read, flag | - | death |
| `_shieldDroppedAt` | fly :178 | game/shieldToggle.js | game/shieldToggle.js | - | no-read | death | never |
| `_shieldDroppedWhy` | fly :177 | game/shieldToggle.js | game/shieldToggle.js | - | no-read (tests) | death | never |
| `_shieldThreat` | fly :49 | game/shieldToggle.js | game/shieldToggle.js | game/shieldToggle.js | - | - | never |
| `_shieldUp` | fly :152 | game/shieldToggle.js | 2: game/shieldToggle.js, game/playerActions.js | 16: ui/BroTown.jsx, game/shieldToggle.js, game/abilities.js, +13 | 2+, flag | death | death |
| `_sparkArcs` | fly :66 | game/shockSpark.js | 2: game/shockSpark.js, rendering/systems/effectsRenderer.js~ | 2: game/shockSpark.js, rendering/systems/effectsRenderer.js | 2+~ | - | zone |
| `_sootQueue` | fly :20 | game/slimeBlast.js | 2: game/slimeBlast.js, rendering/sootMarks.js~ | 2: game/slimeBlast.js, rendering/sootMarks.js | 2+~ | - | zone |
| `_smithing` | fly :42 | game/smithing.js | game/smithing.js | 3: game/smithing.js, rendering/worldLife.js, rendering/systems/effectsRenderer.js | - | - | zone |
| `_spar` | fly :48 | game/spar.js | game/spar.js | 3: ui/BroTown.jsx, game/spar.js, game/sparTargets.js | - | - | zone+rejoin |
| `_nmlFoes` | fly :212 | game/sparTargets.js | game/sparTargets.js | 2: game/sparTargets.js, rendering/systems/entityRenderer.js | - | - | zone |
| `_pvpBlows` | fly :152 | game/sparTargets.js | game/sparTargets.js | game/sparTargets.js | - | - | never |
| `_pvpBouts` | fly :154 | game/sparTargets.js | game/sparTargets.js | game/sparTargets.js | - | - | never |
| `_pvpHitBy` | fly :164 | game/sparTargets.js | game/sparTargets.js | game/sparTargets.js | - | - | never |
| `_spinBoard` | fly :37 | game/spinBoard.js | game/spinBoard.js | 2: game/spinBoard.js, ui/mobile/dash/LeaderboardPanel.jsx | - | - | never |
| `_sprint` | fly :49 | game/sprint.js | game/sprint.js | 3: game/sprint.js, ui/BroTown.jsx, ui/panels/SprintButton.jsx | - | - | zone |
| `_sprintRunOuts` | fly :236 | game/sprint.js | game/sprint.js | game/sprint.js | - | - | never |
| `_tiledWalkable` | fly :50 | game/spriteSheets.js | 2: game/spriteSheets.js, game/worldTrial.js | 5: ui/BroTown.jsx, game/worldTrial.js, game/zoneTransitions.js, +2 | 2+ | - | never |
| `_stf` | fly :141 | game/staffFeel.js | game/staffFeel.js | 3: game/staffFeel.js, rendering/systems/staffFeelFx.js, rendering/staffCastFx.js | - | - | death |
| `_blockFlash` | fly :15 | game/stateCleanup.js | 3: game/monsterCombat.js, game/projectiles.js, game/stateCleanup.js | 2: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js | 2+ | - | never |
| `_deathFlash` | fly :18 | game/stateCleanup.js | 4: game/monsterCombat.js, game/stateCleanup.js, networking/wsClient.js, ui/BroTown.jsx | 2: rendering/systems/effectsRenderer.js, networking/wsClient.js | 2+ | death | never |
| `_mktPlaceBusy` | fly :29 | game/storeSellTap.js | game/storeSellTap.js | game/storeSellTap.js | flag | - | never |
| `_sf` | fly :61 | game/swordFeel.js | 2: game/swordFeel.js, game/weaponFeel.js~ | 3: game/swordFeel.js, rendering/systems/entityRenderer.js, rendering/systems/weaponFeelFx.js | 2+~ | - | death |
| `_tapAtk` | fly :251 | game/tapJump.js | game/tapJump.js | game/tapJump.js | - | - | never |
| `_tapAtkWhy` | fly :249 | game/tapJump.js | game/tapJump.js | - | no-read (tests) | - | never |
| `_tapAttacks` | fly :256 | game/tapJump.js | game/tapJump.js | ui/panels/JumpButton.jsx | - | - | never |
| `_engaged` | fly :476 | game/targeting.js | game/targeting.js | game/monsterCombat.js | flag | - | zone |
| `_engagedGapAt` | fly :479 | game/targeting.js | game/targeting.js | game/targeting.js | - | - | zone |
| `_engagedId` | fly :474 | game/targeting.js | game/targeting.js | game/targeting.js | - | - | zone |
| `_lockDroppedAt` | fly :561 | game/targeting.js | game/targeting.js | - | no-read | - | never |
| `_lockDroppedWhy` | fly :562 | game/targeting.js | game/targeting.js | - | no-read (tests), phase | - | never |
| `_perimeterPx` | fly :528 | game/targeting.js | game/targeting.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_targetCands` | fly :537 | game/targeting.js | game/targeting.js | 2: ui/BroTown.jsx, rendering/systems/effectsRenderer.js | - | - | never |
| `_testMode` | fly :14 | game/testMode.js | game/testMode.js | game/testMode.js | - | rejoin | rejoin |
| `_tooFarAt` | fly :32 | game/tooFar.js | game/tooFar.js | game/tooFar.js | - | - | never |
| `_idleChatAt` | fly :60 | game/townChatter.js | game/townChatter.js | game/townChatter.js | - | - | never |
| `_idleChatSeq` | fly :61 | game/townChatter.js | game/townChatter.js | - | no-read | - | never |
| `__btNoIdleMoves` | never set | game/townsfolkReact.js | - | game/townsfolkReact.js | no-set | - | never |
| `_t2Leave` | fly :50 | game/tradeSlot.js | game/tradeSlot.js | game/tradeSlot.js | - | - | rejoin |
| `_t2QuietUntil` | fly :73 | game/tradeSlot.js | game/tradeSlot.js | game/tradeSlot.js | - | rejoin | rejoin |
| `_petBook` | fly :311 | game/trapping.js | game/trapping.js | 5: game/trapping.js, ui/mobile/dash/MorePanel.jsx, game/petBook.js, +2 | - | - | rejoin |
| `_petBookRev` | fly :320 | game/trapping.js | game/trapping.js | ui/mobile/dash/PetsPanel.jsx | - | - | never |
| `_petLevelSaid` | fly :395 | game/trapping.js | game/trapping.js | - | no-read (tests) | - | never |
| `_petLevelUps` | fly :389 | game/trapping.js | game/trapping.js | - | no-read (tests) | - | never |
| `_petXpGained` | fly :387 | game/trapping.js | game/trapping.js | - | no-read (tests) | - | never |
| `_trap` | fly :71 | game/trapping.js | 3: game/trapping.js, rendering/trapFx.js~, ui/panels/TrapCatchCard.jsx | 8: ui/panels/TrapCatchCard.jsx, rendering/systems/effectsRenderer.js, data/gameSystems.js, +5 | 2+ | - | zone+rejoin |
| `_trapArms` | fly :167 | game/trapping.js | game/trapping.js | game/trapping.js | - | - | never |
| `_trapCatches` | fly :232 | game/trapping.js | game/trapping.js | game/trapping.js | - | - | never |
| `_trapLast` | fly :233 | game/trapping.js | game/trapping.js | game/trapping.js | - | - | never |
| `_trapReveal` | fly :270 | game/trapping.js | game/trapping.js | game/trapping.js | - | - | never |
| `_trapRolls` | fly :231 | game/trapping.js | game/trapping.js | game/trapping.js | - | - | never |
| `_trapTries` | fly :210 | game/trapping.js | game/trapping.js | - | no-read | - | zone+rejoin |
| `_trapsMade` | fly :303 | game/trapping.js | game/trapping.js | ui/panels/buildings/TrapsTab.jsx | - | - | never |
| `_wardHits` | fly :415 | game/trapping.js | game/trapping.js | - | no-read (tests) | - | never |
| `_wardSaid` | fly :423 | game/trapping.js | game/trapping.js | - | no-read (tests) | - | never |
| `_wardSaidAt` | fly :417 | game/trapping.js | game/trapping.js | game/trapping.js | - | - | never |
| `_facingAngle` | fly :62 | game/visualSystems.js | 2: game/visualSystems.js, game/farmWalk.js | 14: rendering/systems/entityRenderer.js, rendering/systems/effectsRenderer.js, ui/BroTown.jsx, +11 | 2+ | - | never |
| `_footstepTimer` | fly :84 | game/visualSystems.js | game/visualSystems.js | game/visualSystems.js | - | - | never |
| `_peerPrintLast` | fly :175 | game/visualSystems.js | game/visualSystems.js | game/visualSystems.js | - | - | zone |
| `_printLast` | fly :120 | game/visualSystems.js | game/visualSystems.js | game/visualSystems.js | - | - | zone |
| `_targetFacingAngle` | fly :60 | game/visualSystems.js | 3: game/farmWalk.js, game/visualSystems.js, rendering/systems/entityRenderer.js | 2: game/tapJump.js, game/visualSystems.js | 2+ | - | never |
| `footprints` | fly :127 | game/visualSystems.js | 2: game/visualSystems.js, game/stateCleanup.js | 2: game/visualSystems.js, rendering/systems/effectsRenderer.js | 2+ | - | zone |
| `peerFootprints` | fly :193 | game/visualSystems.js | 2: game/visualSystems.js, game/stateCleanup.js | 2: game/visualSystems.js, rendering/systems/effectsRenderer.js | 2+ | - | zone |
| `_feelFx` | fly :291 | game/weaponFeel.js | 2: game/weaponFeel.js, rendering/systems/weaponFeelFx.js~ | 2: game/weaponFeel.js, rendering/systems/weaponFeelFx.js | 2+~ | - | zone |
| `_dungeonBack` | fly :241 | game/wheelDungeons.js | 3: game/wheelDungeons.js, game/respawn.js, networking/gameEvents.js | 2: game/wheelDungeons.js, game/zoneTransitions.js | 2+ | zone, death | zone+rejoin |
| `_wheelDoorAskedAt` | fly :202 | game/wheelDungeons.js | game/wheelDungeons.js | game/wheelDungeons.js | - | - | never |
| `_mayorGateAt` | fly :191 | game/wheelHome.js | 2: game/wheelHome.js, game/zoneTransitions.js | 2: game/wheelHome.js, game/zoneTransitions.js | 2+ | - | never |
| `_spawnAskedAt` | fly :48 | game/wheelHome.js | game/wheelHome.js | 2: game/wheelHome.js, ui/mobile/zoneTitle.js | - | zone, death | zone |
| `_spawnSince` | fly :47 | game/wheelHome.js | game/wheelHome.js | game/wheelHome.js | - | zone, death | zone |
| `_spawnToWheel` | fly :46 | game/wheelHome.js | game/wheelHome.js | 4: game/wheelHome.js, game/bodyPlace.js, rendering/systems/wheelMinimap.js, +1 | - | zone, death | zone |
| `_wheelGateHits` | fly :192 | game/wheelHome.js | game/wheelHome.js | - | no-read (tests) | - | never |
| `_wheelSpawnInit` | fly :129 | game/wheelHome.js | game/wheelHome.js | 2: game/wheelHome.js, rendering/systems/tileRenderer.js | flag | - | never |
| `_wheelSwim` | fly :98 | game/wheelSwim.js | game/wheelSwim.js | 5: game/wheelSwim.js, ui/BroTown.jsx, game/climbActions.js, +2 | - | - | zone |
| `_xpBar` | fly :185 | game/xpBar.js | 2: game/killXp.js~, game/xpBar.js | 3: game/xpBar.js, game/killXp.js, ui/mobile/ZoneHeader.jsx | 2+~ | - | never |
| `_xpCarry` | fly :165 | game/xpBar.js | 2: game/xpBar.js, game/killXp.js | 2: game/killXp.js, game/xpBar.js | 2+ | - | never |
| `_diveAir` | fly :187 | game/zoneMechanics.js | game/zoneMechanics.js | game/zoneMechanics.js | - | - | zone |
| `_diveStarted` | fly :228 | game/zoneMechanics.js | game/zoneMechanics.js | game/zoneMechanics.js | flag | - | zone |
| `_echoActive` | fly :254 | game/zoneMechanics.js | game/zoneMechanics.js | 2: ui/BroTown.jsx, game/monsterCombat.js | flag | - | zone |
| `_lastDrownTick` | fly :193 | game/zoneMechanics.js | game/zoneMechanics.js | game/zoneMechanics.js | - | - | never |
| `_swimming` | fly :184 | game/zoneMechanics.js | game/zoneMechanics.js | ui/BroTown.jsx | flag | - | zone |
| `_tideLevel` | fly :179 | game/zoneMechanics.js | game/zoneMechanics.js | ui/BroTown.jsx | - | - | zone |
| `_ambientParticles` | fly :1086 | game/zoneTransitions.js | 5: rendering/systems/effectsRenderer.js~, game/zoneTransitions.js, game/farmTrip.js, game/monsterCombat.js, ui/BroTown.jsx | rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `_currentDepth` | fly :782 | game/zoneTransitions.js | 2: game/farmTrip.js, game/zoneTransitions.js | 4: game/zoneTransitions.js, rendering/lightfx/zoneLight.js, rendering/systems/effectsRenderer.js, +1 | 2+ | zone | zone |
| `_enteredFromDir` | fly :815 | game/zoneTransitions.js | game/zoneTransitions.js | - | no-read | zone | zone |
| `_enteredFromExit` | fly :816 | game/zoneTransitions.js | game/zoneTransitions.js | game/zoneTransitions.js | - | zone | zone |
| `_enteredFromHub` | fly :757 | game/zoneTransitions.js | game/zoneTransitions.js | game/zoneTransitions.js | - | zone | zone |
| `_farmBack` | fly :1128 | game/zoneTransitions.js | 2: game/wheelTownDoors.js, game/zoneTransitions.js | game/zoneTransitions.js | 2+ | zone | zone |
| `_hubExitDisarm` | fly :523 | game/zoneTransitions.js | game/zoneTransitions.js | game/zoneTransitions.js | - | zone | zone |
| `_townArtHold` | fly :302 | game/zoneTransitions.js | game/zoneTransitions.js | 5: ui/BroTown.jsx, game/farmTrip.js, game/jump.js, +2 | - | - | zone |
| `_wheelTripVeil` | fly :298 | game/zoneTransitions.js | game/zoneTransitions.js | 2: game/zoneTransitions.js, networking/gameEvents.js | flag | zone, death | zone |
| `_zoneLoading` | fly :480 | game/zoneTransitions.js | game/zoneTransitions.js | 24: game/zoneTransitions.js, ui/BroTown.jsx, game/wheelHome.js, +21 | - | zone | zone |
| `_zoneLockAt` | fly :634 | game/zoneTransitions.js | game/zoneTransitions.js | game/zoneTransitions.js | - | - | never |
| `_zoneWarnAt` | fly :670 | game/zoneTransitions.js | game/zoneTransitions.js | game/zoneTransitions.js | - | - | never |
| `_zoneWipe` | fly :1085 | game/zoneTransitions.js | 7: game/zoneTransitions.js, game/dungeonWaves.js, networking/gameEvents.js, game/farmTrip.js, game/stateCleanup.js, +2 | rendering/systems/effectsRenderer.js | 2+ | zone | never |
| `arrows` | first :1241 | game/zoneTransitions.js | 16: game/projectiles.js, rendering/systems/effectsRenderer.js~, game/bowFeel.js~, game/playerActions.js, game/bowVolley.js~, +11 | 3: game/bowFeel.js, game/projectiles.js, rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `currentZone` | first :1163 | game/zoneTransitions.js | game/zoneTransitions.js | 95: ui/BroTown.jsx, rendering/systems/effectsRenderer.js, game/projectiles.js, +92 | phase | zone, death | zone |
| `deathExplosions` | first :1283 | game/zoneTransitions.js | 8: game/monsterCombat.js, game/zoneTransitions.js, game/dungeonWaves.js, networking/gameEvents.js, game/farmTrip.js, +3 | rendering/systems/effectsRenderer.js | 2+ | zone, death | zone |
| `hitParticles` | first :1277 | game/zoneTransitions.js | 16: rendering/systems/effectsRenderer.js, game/monsterCombat.js, networking/gameEvents.js, game/projectiles.js, game/zoneMechanics.js, +11 | 7: rendering/systems/effectsRenderer.js, game/renderFrame.js, game/levelCelebration.js, +4 | 2+ | zone, death | zone |
| `map` | first :1162 | game/zoneTransitions.js | 9: game/zoneTransitions.js, game/dungeonWaves.js, networking/gameEvents.js, game/farmTrip.js, game/monsterCombat.js, +4 | 8: game/zoneTransitions.js, game/dungeonWaves.js, ui/BroTown.jsx, +5 | 2+ | zone, death | zone |
| `monsters` | first :1261 | game/zoneTransitions.js | 26: game/monsterCombat.js, networking/gameEvents.js, rendering/systems/entityRenderer.js~, networking/wsClient.js, game/projectiles.js~, +21 | 38: networking/gameEvents.js, ui/BroTown.jsx, game/projectiles.js, +35 | 2+ | zone, death, rejoin | zone+rejoin |
| `_activeClanWar` | fly :3998 | networking/gameEvents.js | 3: networking/gameEvents.js, ui/BroTown.jsx, ui/panels/ClanPanel.jsx | 4: networking/gameEvents.js, ui/BroTown.jsx, ui/panels/ClanPanel.jsx, +1 | 2+ | - | rejoin |
| `_activeDuel` | fly :4664 | networking/gameEvents.js | 3: networking/gameEvents.js, game/rejoinSlots.js, game/duelPending.js | 4: networking/gameEvents.js, networking/wsClient.js, game/rejoinSlots.js, +1 | 2+ | rejoin | rejoin |
| `_arenaStakeBoard` | fly :1921 | networking/gameEvents.js | networking/gameEvents.js | ui/panels/buildings/PartyPanel.jsx | - | - | rejoin |
| `_camPunch` | fly :1707 | networking/gameEvents.js | 7: networking/gameEvents.js, game/bowFeel.js, game/monsterCombat.js, game/staffFeel.js, game/swordFeel.js, +2 | 2: ui/BroTown.jsx, networking/wsClient.js | 2+ | death | never |
| `_capeStatusLine` | fly :462 | networking/gameEvents.js | networking/gameEvents.js | - | no-read | - | never |
| `_dungeonBossSpawned` | fly :974 | networking/gameEvents.js | 5: networking/gameEvents.js, game/dungeonWaves.js, game/respawn.js, game/wheelDungeons.js, ui/panels/DungeonCreatorPanel.jsx | game/dungeonWaves.js | 2+, flag | zone, death | zone |
| `_dungeonDepth` | fly :971 | networking/gameEvents.js | 2: networking/gameEvents.js, ui/panels/DungeonCreatorPanel.jsx | - | 2+, no-read | zone | zone |
| `_dungeonEnteredAt` | fly :961 | networking/gameEvents.js | networking/gameEvents.js | game/zoneTransitions.js | - | zone | zone |
| `_dungeonMaxWaves` | fly :973 | networking/gameEvents.js | 2: networking/gameEvents.js, ui/panels/DungeonCreatorPanel.jsx | 2: game/dungeonWaves.js, networking/gameEvents.js | 2+ | zone | zone |
| `_dungeonWave` | fly :972 | networking/gameEvents.js | 3: networking/gameEvents.js, game/dungeonWaves.js, ui/panels/DungeonCreatorPanel.jsx | game/dungeonWaves.js | 2+ | zone | zone |
| `_dungeonZone` | fly :955 | networking/gameEvents.js | 2: networking/gameEvents.js, ui/panels/DungeonCreatorPanel.jsx | 2: game/zoneTransitions.js, game/monsterCombat.js | 2+ | zone | zone |
| `_fireTrail` | fly :2556 | networking/gameEvents.js | 2: networking/gameEvents.js, rendering/systems/effectsRenderer.js~ | 2: networking/gameEvents.js, rendering/systems/effectsRenderer.js | 2+~ | - | zone |
| `_gambleResult` | fly :758 | networking/gameEvents.js | networking/gameEvents.js | ui/panels/buildings/GamblePanel.jsx | - | - | never |
| `_impactRings` | fly :1205 | networking/gameEvents.js | 8: networking/gameEvents.js, game/monsterCombat.js, game/abilities.js, game/combatHelpers.js, game/projectiles.js, +3 | 2: rendering/systems/effectsRenderer.js, game/playerActions.js | 2+ | - | zone |
| `_inDuel` | fly :4665 | networking/gameEvents.js | 3: game/duelPending.js, networking/gameEvents.js, game/rejoinSlots.js | 12: game/duelPending.js, game/projectiles.js, rendering/systems/entityRenderer.js, +9 | 2+ | rejoin | rejoin |
| `_jackpotPool` | fly :844 | networking/gameEvents.js | networking/gameEvents.js | ui/panels/buildings/GamblePanel.jsx | - | - | rejoin |
| `_jackpotTickets` | fly :845 | networking/gameEvents.js | networking/gameEvents.js | ui/panels/buildings/GamblePanel.jsx | - | - | rejoin |
| `_lastArrowBoom` | fly :1241 | networking/gameEvents.js | networking/gameEvents.js | - | no-read | - | never |
| `_lastReportAck` | fly :735 | networking/gameEvents.js | networking/gameEvents.js | - | no-read | - | never |
| `_party` | fly :5162 | networking/gameEvents.js | 2: networking/gameEvents.js, networking/wsClient.js | 11: rendering/systems/entityRenderer.js, ui/panels/buildings/WheelHallPanel.jsx, game/chat.js, +8 | 2+ | rejoin | rejoin |
| `_peerCampfires` | fly :584 | networking/gameEvents.js | 5: networking/gameEvents.js, game/fireRefuse.js~, game/zoneTransitions.js, rendering/campfireFx.js~, ui/BroTown.jsx~ | 6: game/ambientBeds.js, ui/BroTown.jsx, game/zoneTransitions.js, +3 | 2+ | zone | zone |
| `_peerGatherNode` | fly :558 | networking/gameEvents.js | 2: networking/gameEvents.js, game/zoneTransitions.js | 2: game/zoneTransitions.js, rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `_peerWhirlFx` | fly :2216 | networking/gameEvents.js | 3: networking/gameEvents.js, game/zoneTransitions.js, rendering/systems/effectsRenderer.js | 2: rendering/systems/effectsRenderer.js, networking/gameEvents.js | 2+ | zone | zone |
| `_peerWindups` | fly :1337 | networking/gameEvents.js | 3: networking/gameEvents.js, game/zoneTransitions.js, rendering/systems/effectsRenderer.js~ | 2: networking/gameEvents.js, rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `_preDungeonPos` | fly :894 | networking/gameEvents.js | 2: networking/gameEvents.js, ui/panels/DungeonCreatorPanel.jsx | - | 2+, no-read | zone | zone |
| `_pvpSkullType` | fly :4856 | networking/gameEvents.js | 3: networking/gameEvents.js, game/noMansLand.js, ui/panels/InspectPlayerPanel.jsx | 2: game/noMansLand.js, rendering/systems/entityRenderer.js | 2+, phase | - | rejoin |
| `_pvpSkullUntil` | fly :4857 | networking/gameEvents.js | 3: networking/gameEvents.js, game/noMansLand.js, ui/panels/InspectPlayerPanel.jsx | 2: networking/gameEvents.js, rendering/systems/entityRenderer.js | 2+ | - | rejoin |
| `_pvpSrvHits` | fly :4201 | networking/gameEvents.js | networking/gameEvents.js | networking/gameEvents.js | - | - | never |
| `_remoteProjectiles` | fly :2282 | networking/gameEvents.js | 4: rendering/systems/effectsRenderer.js~, game/visualSystems.js, networking/gameEvents.js, game/zoneTransitions.js | 2: networking/gameEvents.js, rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `_serverDungeon` | fly :960 | networking/gameEvents.js | 4: networking/gameEvents.js, game/respawn.js, game/wheelDungeons.js, game/zoneTransitions.js | 7: networking/gameEvents.js, game/zoneTransitions.js, game/wheelDungeons.js, +4 | 2+ | zone, death | zone+rejoin |
| `_stunEnd` | fly :4073 | networking/gameEvents.js | networking/gameEvents.js | - | no-read | - | death |
| `_t2DoneWatch` | fly :4977 | networking/gameEvents.js | 2: networking/gameEvents.js, game/tradeSlot.js | 2: networking/gameEvents.js, game/tradeSlot.js | 2+ | rejoin | rejoin |
| `_t2Live` | fly :4950 | networking/gameEvents.js | 2: networking/gameEvents.js, game/rejoinSlots.js | 2: game/tradeSlot.js, game/rejoinSlots.js | 2+ | rejoin | rejoin |
| `_telegraphZones` | fly :1627 | networking/gameEvents.js | 3: networking/gameEvents.js, rendering/systems/telegraphShapes.js~, rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | 2+ | - | zone |
| `_threatMarks` | fly :249 | networking/gameEvents.js | 2: game/noMansLand.js, networking/gameEvents.js | 3: rendering/systems/entityRenderer.js, game/noMansLand.js, networking/gameEvents.js | 2+ | - | rejoin |
| `_wheelDungeonOpening` | fly :999 | networking/gameEvents.js | networking/gameEvents.js | 3: game/wheelDungeons.js, networking/gameEvents.js, ui/BroTown.jsx | - | - | zone |
| `arrowBlasts` | fly :983 | networking/gameEvents.js | 6: networking/gameEvents.js, game/projectiles.js, game/wheelDungeons.js, rendering/systems/effectsRenderer.js~, ui/BroTown.jsx, +1 | 2: networking/gameEvents.js, rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `screenShake` | first :1281 | networking/gameEvents.js | 14: networking/gameEvents.js, game/monsterCombat.js, game/dungeonWaves.js, game/projectiles.js, ui/BroTown.jsx, +9 | 3: rendering/pixiRenderer.js, game/visualSystems.js, networking/wsClient.js | 2+ | death | never |
| `slimeProjectiles` | fly :983 | networking/gameEvents.js | 11: rendering/systems/effectsRenderer.js~, game/projectiles.js, networking/gameEvents.js, game/monsterCombat.js, game/zoneTransitions.js, +6 | 5: game/renderFrame.js, game/projectiles.js, game/hitSounds.js, +2 | 2+ | zone | zone |
| `slimeShockwaves` | fly :983 | networking/gameEvents.js | 3: networking/gameEvents.js, game/wheelDungeons.js, rendering/systems/effectsRenderer.js~ | 2: networking/gameEvents.js, rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `snowballBursts` | fly :983 | networking/gameEvents.js | 6: networking/gameEvents.js, game/projectiles.js, game/wheelDungeons.js, rendering/systems/effectsRenderer.js~, ui/BroTown.jsx, +1 | 3: game/projectiles.js, networking/gameEvents.js, rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `_nodeResyncT` | fly :55 | networking/nodeSync.js | networking/nodeSync.js | networking/nodeSync.js | - | zone | zone |
| `_pendingZoneNodes` | fly :36 | networking/nodeSync.js | networking/nodeSync.js | networking/nodeSync.js | - | zone, rejoin | zone+rejoin |
| `_abilCd` | fly :3946 | networking/wsClient.js | 2: game/abilities.js, networking/wsClient.js | 2: game/abilities.js, networking/wsClient.js | 2+ | - | never |
| `_authRejects` | fly :1577 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | - | - | never |
| `_characterReset` | fly :1636 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | flag | - | never |
| `_currentRoom` | fly :563 | networking/wsClient.js | networking/wsClient.js | 2: ui/panels/buildings/ExchangePanel.jsx, ui/storeApi.js | - | - | never |
| `_evErrLogged` | fly :1219 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | - | - | never |
| `_frozenByAdmin` | fly :1564 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | flag | - | never |
| `_hardenedWoodSeen` | fly :2391 | networking/wsClient.js | networking/wsClient.js | ui/panels/buildings/HardenedWoodTab.jsx | - | - | never |
| `_hpBuff` | fly :2997 | networking/wsClient.js | 3: networking/wsClient.js, ui/BroTown.jsx, ui/panels/buildings/CookPanel.jsx | ui/BroTown.jsx | 2+ | - | rejoin |
| `_httpToken` | fly :1772 | networking/wsClient.js | networking/wsClient.js | 3: ui/panels/buildings/ExchangePanel.jsx, ui/panels/buildings/PartyPanel.jsx, ui/storeApi.js | - | rejoin | rejoin |
| `_joinId` | fly :686 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | - | - | never |
| `_joinKey` | fly :697 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | - | - | never |
| `_joinRejectedFatal` | fly :1608 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | flag | - | never |
| `_joinedId` | fly :1681 | networking/wsClient.js | networking/wsClient.js | ui/BroTown.jsx | - | rejoin | rejoin |
| `_keyFellBack` | fly :4827 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | flag | - | never |
| `_keyIdAsked` | fly :1680 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | flag | rejoin | rejoin |
| `_keyNewAt` | fly :2474 | networking/wsClient.js | networking/wsClient.js | - | no-read | - | never |
| `_lastAbilityReject` | fly :3932 | networking/wsClient.js | networking/wsClient.js | - | no-read | - | never |
| `_lastGhostSweep` | fly :1185 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | - | - | never |
| `_levelShownBaselined` | fly :3281 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | flag | - | never |
| `_lootFreezeUntil` | fly :4302 | networking/wsClient.js | 2: networking/wsClient.js, game/groundLoot.js | 4: rendering/systems/entityRenderer.js, game/jump.js, game/monsterCombat.js, +1 | 2+ | - | never |
| `_manaBuff` | fly :2999 | networking/wsClient.js | 3: networking/wsClient.js, ui/BroTown.jsx, ui/panels/buildings/CookPanel.jsx | ui/BroTown.jsx | 2+ | - | rejoin |
| `_manaFlat` | fly :2996 | networking/wsClient.js | networking/wsClient.js | ui/BroTown.jsx | - | - | rejoin |
| `_netHold` | fly :1692 | networking/wsClient.js | 2: networking/wsClient.js, networking/serverReady.js | 8: ui/BroTown.jsx, game/achievements.js, game/dailyRewards.js, +5 | 2+, flag | rejoin | rejoin |
| `_realtimeStatus` | fly :549 | networking/wsClient.js | networking/wsClient.js | 5: networking/wsClient.js, ui/panels/InfoPanel.jsx, game/tradeSlot.js, +2 | phase | rejoin | rejoin |
| `_regenBuff` | fly :2984 | networking/wsClient.js | 3: networking/wsClient.js, ui/BroTown.jsx, ui/panels/buildings/CookPanel.jsx | ui/BroTown.jsx | 2+ | - | rejoin |
| `_resetRefused` | fly :1622 | networking/wsClient.js | networking/wsClient.js | - | no-read | - | never |
| `_resistBuff` | fly :2987 | networking/wsClient.js | 3: networking/wsClient.js, ui/BroTown.jsx, ui/panels/buildings/CookPanel.jsx | 2: ui/BroTown.jsx, game/monsterCombat.js | 2+ | - | rejoin |
| `_rpgFromServer` | fly :3392 | networking/wsClient.js | 2: networking/wsClient.js, ui/BroTown.jsx | 4: ui/mobile/QuestCoach.jsx, game/phoneDeath.js, game/questRoute.js, +1 | 2+, flag | - | never |
| `_serverCaps` | fly :1657 | networking/wsClient.js | networking/wsClient.js | 98: networking/wsClient.js, ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/buildings/SmithyPanel.jsx, +95 | - | rejoin | rejoin |
| `_serverGatherNodes` | fly :1968 | networking/wsClient.js | networking/wsClient.js | 5: game/lifeSkillRewards.js, game/zoneTransitions.js, networking/nodeSync.js, +2 | flag | rejoin | rejoin |
| `_serverLoot` | fly :1999 | networking/wsClient.js | networking/wsClient.js | networking/gameEvents.js | flag | rejoin | rejoin |
| `_serverMonsters` | fly :1954 | networking/wsClient.js | 4: networking/wsClient.js, game/wheelDungeons.js, game/zoneTransitions.js, networking/gameEvents.js | 12: game/monsterCombat.js, game/projectiles.js, networking/gameEvents.js, +9 | 2+, flag | zone, rejoin | zone+rejoin |
| `_spdBuff` | fly :2989 | networking/wsClient.js | 3: networking/wsClient.js, ui/BroTown.jsx, ui/panels/buildings/CookPanel.jsx | ui/BroTown.jsx | 2+ | - | rejoin |
| `_t1Seeded` | fly :3352 | networking/wsClient.js | 2: networking/wsClient.js, ui/BroTown.jsx | game/t1Sync.js | 2+, flag | - | never |
| `_t2LocalEnd` | fly :4720 | networking/wsClient.js | networking/wsClient.js | ui/panels/TradeWindowPanel.jsx | - | - | never |
| `_tabClaim` | fly :588 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | flag | - | never |
| `_tabKey` | first :1219 | networking/wsClient.js | networking/wsClient.js | 2: networking/wsClient.js, ui/BroTown.jsx | - | - | never |
| `_tabKeyOld` | fly :1677 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | - | rejoin | never |
| `_tabMoved` | fly :548 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | flag | - | never |
| `_verifyToken` | fly :706 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | - | - | never |
| `_xpBuff` | fly :3004 | networking/wsClient.js | networking/wsClient.js | ui/BroTown.jsx | - | - | rejoin |
| `_xpBuffMul` | fly :3005 | networking/wsClient.js | networking/wsClient.js | ui/BroTown.jsx | - | - | rejoin |
| `channel` | first :1230 | networking/wsClient.js | networking/wsClient.js | 91: ui/BroTown.jsx, game/monsterCombat.js, networking/gameEvents.js, +88 | - | - | never |
| `gatherNodes` | fly :1976 | networking/wsClient.js | 15: rendering/nodeLabels.js~, rendering/systems/effectsRenderer.js~, game/lifeSkillRewards.js~, networking/wsClient.js, game/zoneTransitions.js, +10 | 15: ui/BroTown.jsx, rendering/systems/effectsRenderer.js, game/lifeSkillRewards.js, +12 | 2+ | zone, death, rejoin | zone+rejoin |
| `groundLoot` | first :1275 | networking/wsClient.js | 18: rendering/systems/effectsRenderer.js~, networking/wsClient.js, game/groundLoot.js, networking/gameEvents.js, game/monsterCombat.js, +13 | 7: networking/gameEvents.js, networking/wsClient.js, game/renderFrame.js, +4 | 2+ | zone, rejoin | zone+rejoin |
| `myId` | first :1185 | networking/wsClient.js | 2: networking/wsClient.js, ui/BroTown.jsx | 59: networking/gameEvents.js, networking/wsClient.js, ui/BroTown.jsx, +56 | 2+ | - | never |
| `others` | first :1154 | networking/wsClient.js | 20: networking/wsClient.js, game/visualSystems.js~, networking/gameEvents.js, game/presence2.js, rendering/systems/entityRenderer.js~, +15 | 51: networking/gameEvents.js, ui/BroTown.jsx, networking/wsClient.js, +48 | 2+ | rejoin | rejoin |
| `_emoteHudDrop` | fly :126 | rendering/emoteFx.js | rendering/emoteFx.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_viewH` | fly :647 | rendering/pixiRenderer.js | 2: rendering/pixiRenderer.js, ui/BroTown.jsx | 15: rendering/systems/entityRenderer.js, game/targeting.js, rendering/wheelDoors.js, +12 | 2+ | - | never |
| `_viewW` | fly :646 | rendering/pixiRenderer.js | 2: rendering/pixiRenderer.js, ui/BroTown.jsx | 16: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js, game/targeting.js, +13 | 2+ | - | never |
| `_worldScaleX` | fly :641 | rendering/pixiRenderer.js | rendering/pixiRenderer.js | 14: rendering/systems/effectsRenderer.js, ui/BroTown.jsx, game/wheelNoticeboard.js, +11 | - | - | never |
| `_worldScaleY` | fly :642 | rendering/pixiRenderer.js | rendering/pixiRenderer.js | 10: ui/BroTown.jsx, rendering/systems/effectsRenderer.js, game/wheelNoticeboard.js, +7 | - | - | never |
| `_stormZaps` | fly :117 | rendering/stormSparksFx.js | rendering/stormSparksFx.js | rendering/stormSparksFx.js | - | - | zone |
| `_bowArtReady` | fly :16986 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | rendering/systems/entityRenderer.js | flag | - | never |
| `_bowGripDX` | fly :16954 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | 5: game/bowFeel.js, game/combatHelpers.js, game/playerActions.js, +2 | - | - | never |
| `_bowGripDY` | fly :16955 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | 5: game/bowFeel.js, game/combatHelpers.js, game/playerActions.js, +2 | - | - | never |
| `_bowGripX` | fly :16952 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | 3: game/projectiles.js, rendering/systems/effectsRenderer.js, ui/BroTown.jsx | - | - | zone |
| `_bowGripY` | fly :16953 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | 3: rendering/systems/effectsRenderer.js, ui/BroTown.jsx, game/projectiles.js | - | - | zone |
| `_catchFlights` | never set | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js~ | rendering/systems/effectsRenderer.js | no-set | - | zone |
| `_damageFlash` | never set | rendering/systems/effectsRenderer.js | - | rendering/systems/effectsRenderer.js | no-set | - | never |
| `_dayNightCache` | never set | rendering/systems/effectsRenderer.js | - | 2: rendering/systems/effectsRenderer.js, rendering/lightfx/zoneLight.js | no-set | - | never |
| `_dazeGritAt` | fly :13767 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | - | - | death |
| `_dodgeTrail` | fly :6468 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | - | - | zone |
| `_dustPuffs` | never set | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js~ | rendering/systems/effectsRenderer.js | no-set | - | zone |
| `_farmHands` | fly :17938 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | 2: rendering/farmWorld.js, rendering/systems/effectsRenderer.js | - | - | zone |
| `_frozenChipAt` | fly :13660 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | - | - | death |
| `_fxBursts` | fly :18634 | rendering/systems/effectsRenderer.js | 2: rendering/systems/effectsRenderer.js, game/zoneTransitions.js | rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `_gustDustAt` | fly :13623 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | - | - | death |
| `_particles` | never set | rendering/systems/effectsRenderer.js | - | rendering/systems/effectsRenderer.js | no-set | - | zone |
| `_peerArmTex` | fly :16274 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | 2: rendering/systems/entityRenderer.js, rendering/systems/effectsRenderer.js | - | - | never |
| `_peerBowFacingsReady` | fly :16098 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | 2: rendering/systems/entityRenderer.js, rendering/systems/effectsRenderer.js | - | - | never |
| `_whirlCatch` | fly :14037 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | game/whirlCatch.js | - | - | zone |
| `_whirlFx` | fly :13242 | rendering/systems/effectsRenderer.js | 3: game/abilities.js, game/zoneTransitions.js, rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `_bashPose` | fly :14507 | rendering/systems/entityRenderer.js | 3: game/abilities.js, game/zoneTransitions.js, rendering/systems/entityRenderer.js | 2: rendering/systems/entityRenderer.js, rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `_blockPose` | fly :14466 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 2: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js | - | - | never |
| `_blockShieldBehind` | fly :16846 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 2: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js | - | - | never |
| `_bodyAnimDir` | fly :15154 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read | - | never |
| `_bodyAnimFrame` | fly :15154 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read | - | never |
| `_bodyAnimMirror` | fly :15154 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read | - | never |
| `_bodyDrawH` | fly :14838 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 2: rendering/systems/effectsRenderer.js, rendering/wheelObjects.js | - | - | never |
| `_bodyFootY` | fly :14200 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read (tests) | - | never |
| `_bodyMoving` | fly :15154 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read | - | never |
| `_bowDir` | fly :14469 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 2: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js | - | - | never |
| `_bowHoldFrame` | fly :14385 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_bowJogLegs` | fly :15501 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 2: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js | - | - | never |
| `_bowShowing` | fly :14468 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_climbFrame` | fly :14928 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | game/climbActions.js | - | - | never |
| `_facingSrc` | fly :14660 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read (tests), phase | - | never |
| `_figureScaleY` | fly :14193 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read | - | never |
| `_jogBodyH` | fly :15496 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read | - | never |
| `_monstersArtWait` | fly :12219 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read | - | never |
| `_monstersFarHidden` | fly :12218 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read | - | never |
| `_peerBlockPose` | fly :12398 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 2: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js | - | - | never |
| `_peerShieldHeld` | fly :12400 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 2: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js | - | - | never |
| `_peerStandGeom` | fly :12392 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 2: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js | - | - | never |
| `_peersCrowdHidden` | fly :14002 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read (tests) | - | never |
| `_peersFarHidden` | fly :14001 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read (tests) | - | never |
| `_peersNotDrawn` | fly :14005 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 4: game/projectiles.js, rendering/systems/effectsRenderer.js, game/nmlAsk.js, +1 | - | - | never |
| `_renderFacing` | fly :14703 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 6: rendering/systems/effectsRenderer.js, ui/BroTown.jsx, rendering/systems/entityRenderer.js, +3 | - | - | never |
| `_respawnInvuln` | never set | rendering/systems/entityRenderer.js | - | rendering/systems/entityRenderer.js | no-set | - | death |
| `_selfBandBotY` | fly :17131 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 2: rendering/systems/entityRenderer.js, rendering/nodeLabels.js | - | - | never |
| `_selfBandHalfW` | fly :17133 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 3: rendering/nodeLabels.js, rendering/systems/entityRenderer.js, ui/mobile/QuestCoach.jsx | - | - | never |
| `_selfBandTopY` | fly :17118 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 6: rendering/systems/effectsRenderer.js, game/dropLines.js, rendering/systems/entityRenderer.js, +3 | - | - | never |
| `_selfChatTipY` | fly :17135 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_staffTipAt` | fly :15980 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 3: rendering/staffCastFx.js, game/staffFeel.js, rendering/systems/staffFeelFx.js | - | - | zone |
| `_staffTipBehind` | fly :16513 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 2: rendering/staffCastFx.js, rendering/systems/staffFeelFx.js | flag | - | never |
| `_staffTipX` | fly :15978 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 3: rendering/staffCastFx.js, game/staffFeel.js, rendering/systems/staffFeelFx.js | - | - | zone |
| `_staffTipY` | fly :15979 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 3: rendering/staffCastFx.js, game/staffFeel.js, rendering/systems/staffFeelFx.js | - | - | zone |
| `_standInBody` | fly :14117 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_standInBodyH` | fly :14851 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_standInFootY` | fly :14850 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_swordBodyH` | fly :15491 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_swordFootY` | fly :15487 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_swordJogLegs` | fly :15504 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_swordSwingDir` | fly :14362 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_swordSwinging` | fly :14361 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 3: rendering/systems/effectsRenderer.js, rendering/systems/weaponFeelFx.js, ui/BroTown.jsx | - | - | never |
| `_waterBlows` | fly :129 | rendering/waterAttackFx.js | rendering/waterAttackFx.js | rendering/waterAttackFx.js | - | - | zone |
| `_bloodBursts` | fly :997 | rendering/worldFx.js | rendering/worldFx.js | rendering/worldFx.js | - | - | zone |
| `__aliveAt` | fly :8911 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `__introLiftedAt` | fly :12895 | ui/BroTown.jsx | ui/BroTown.jsx | 8: ui/BroTown.jsx, game/achievements.js, game/dailyRewards.js, +5 | - | - | never |
| `__introLiftedZone` | fly :12898 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read (tests) | - | never |
| `__wdArmedAt` | fly :8903 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `__wdDark` | fly :9014 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `__wdEverLit` | fly :9014 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | flag | - | never |
| `__wdFastRebuiltAt` | fly :9028 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `__wdFirstNext` | fly :8933 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `__wdHb` | fly :8937 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `__wdNext` | fly :8935 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `__wdReloading` | fly :8856 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | flag | - | never |
| `_aimActive` | first :1244 | ui/BroTown.jsx | - | - | no-read | - | never |
| `_aimAngle` | first :1243 | ui/BroTown.jsx | 6: ui/BroTown.jsx, game/staffFeel.js, game/bowFeel.js, game/monsterCombat.js, game/tapJump.js, +1 | 11: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js, ui/BroTown.jsx, +8 | 2+ | - | zone |
| `_aimSrc` | fly :10523 | ui/BroTown.jsx | 5: ui/BroTown.jsx, game/monsterCombat.js, game/staffFeel.js, game/tapJump.js, game/targeting.js | 2: game/staffFeel.js, game/targeting.js | 2+, phase | - | zone |
| `_aiming` | fly :5432 | ui/BroTown.jsx | 6: ui/BroTown.jsx, game/climbActions.js, game/monsterCombat.js, game/shieldToggle.js, game/staffFeel.js, +1 | 8: game/staffFeel.js, game/combatHelpers.js, game/monsterCombat.js, +5 | 2+, flag | - | zone |
| `_arenaInvolved` | fly :9197 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | flag | - | rejoin |
| `_arenaLastBgPoll` | fly :9162 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_arenaMatch` | fly :9201 | ui/BroTown.jsx | ui/BroTown.jsx | 3: networking/wsClient.js, game/quietPhone.js, ui/BroTown.jsx | - | - | rejoin |
| `_arenaNotified` | fly :9205 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_arenaTournamentId` | fly :9202 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read | - | rejoin |
| `_atkEnergy` | fly :8337 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read | - | never |
| `_atkHoldUntil` | fly :10549 | ui/BroTown.jsx | ui/BroTown.jsx | 2: game/monsterCombat.js, game/tapJump.js | - | - | never |
| `_atkPending` | fly :5429 | ui/BroTown.jsx | 4: ui/BroTown.jsx, game/climbActions.js, game/shieldToggle.js, game/tapJump.js | game/tapJump.js | 2+, flag | - | zone |
| `_atkPressAt` | fly :10358 | ui/BroTown.jsx | ui/BroTown.jsx | game/monsterCombat.js | - | - | never |
| `_backpedaling` | fly :5649 | ui/BroTown.jsx | ui/BroTown.jsx | rendering/systems/entityRenderer.js | flag | - | never |
| `_bashDash` | fly :5279 | ui/BroTown.jsx | 3: ui/BroTown.jsx, game/abilities.js, game/zoneTransitions.js | 5: ui/BroTown.jsx, rendering/systems/entityRenderer.js, game/abilities.js, +2 | 2+ | zone | zone |
| `_bleedUntil` | never set | ui/BroTown.jsx | - | ui/BroTown.jsx | no-set | - | death |
| `_btnHarvest` | fly :6216 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_campfire` | fly :6797 | ui/BroTown.jsx | 3: ui/BroTown.jsx, game/fireRefuse.js, game/zoneTransitions.js | 7: ui/BroTown.jsx, rendering/systems/effectsRenderer.js, data/gameSystems.js, +4 | 2+ | zone | zone |
| `_chatBySelfTap` | fly :11111 | ui/BroTown.jsx | ui/BroTown.jsx | ui/mobile/QuestCoach.jsx | - | - | never |
| `_dashStrike` | fly :5282 | ui/BroTown.jsx | 3: ui/BroTown.jsx, game/abilities.js, game/zoneTransitions.js | ui/BroTown.jsx | 2+ | zone | zone |
| `_deathStart` | fly :5051 | ui/BroTown.jsx | 6: game/monsterCombat.js, ui/BroTown.jsx, game/respawn.js, networking/gameEvents.js, networking/wsClient.js, +1 | 4: rendering/systems/entityRenderer.js, game/lifeSkillRewards.js, ui/BroTown.jsx, +1 | 2+ | zone, death | death |
| `_deskPressBash` | fly :10933 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | flag | - | never |
| `_deskPressLock` | fly :10844 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | zone |
| `_discGhost` | fly :6691 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_discRect` | fly :6669 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_discRectAt` | fly :6665 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_dmgBuff` | fly :15591 | ui/BroTown.jsx | 3: networking/wsClient.js, ui/BroTown.jsx, ui/panels/buildings/CookPanel.jsx | 2: ui/BroTown.jsx, game/fightFood.js | 2+ | - | rejoin |
| `_dmgBuffMul` | fly :15591 | ui/BroTown.jsx | 3: ui/BroTown.jsx, ui/panels/buildings/CookPanel.jsx, networking/wsClient.js | 2: game/fightFood.js, ui/BroTown.jsx | 2+ | - | rejoin |
| `_dtScale` | fly :4942 | ui/BroTown.jsx | ui/BroTown.jsx | 6: ui/BroTown.jsx, game/projectiles.js, game/visualSystems.js, +3 | - | - | never |
| `_dying` | fly :5048 | ui/BroTown.jsx | 5: game/monsterCombat.js, ui/BroTown.jsx, game/respawn.js, networking/gameEvents.js, networking/wsClient.js | 21: networking/gameEvents.js, ui/BroTown.jsx, rendering/systems/entityRenderer.js, +18 | 2+, flag | zone, death | death |
| `_facing` | fly :9462 | ui/BroTown.jsx | 5: ui/BroTown.jsx, game/visualSystems.js, game/farmWalk.js, game/monsterCombat.js, game/staffFeel.js | 7: game/visualSystems.js, rendering/systems/entityRenderer.js, game/abilities.js, +4 | 2+, phase | - | never |
| `_firemaking` | fly :6779 | ui/BroTown.jsx | 3: ui/BroTown.jsx, game/fireRefuse.js, game/zoneTransitions.js | 7: ui/BroTown.jsx, rendering/systems/entityRenderer.js, rendering/systems/effectsRenderer.js, +4 | 2+ | zone | zone |
| `_frameCount` | fly :4899 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read (tests) | - | never |
| `_frameMs` | fly :4949 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_hasSled` | fly :15028 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | flag | - | never |
| `_hitStop` | fly :4989 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read | - | never |
| `_kaConfirmed` | fly :8125 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lJoyHeld` | fly :10232 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | flag | - | never |
| `_lJoyLiveUntil` | fly :10236 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_lJoyPreviewUntil` | fly :11304 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_lJoyShown` | fly :6747 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_lastAimAngle` | fly :9461 | ui/BroTown.jsx | 4: ui/BroTown.jsx, game/staffFeel.js, game/bowFeel.js, game/tapJump.js | 7: rendering/systems/entityRenderer.js, game/staffFeel.js, game/abilities.js, +4 | 2+ | - | never |
| `_lastBroadcastBa` | fly :8162 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lastBroadcastBlocking` | fly :8161 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lastBroadcastDead` | fly :8163 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lastBroadcastEx` | fly :8158 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lastBroadcastFacing` | fly :8112 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lastBroadcastGear` | fly :8164 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lastBroadcastX` | fly :8165 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lastBroadcastY` | fly :8165 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lastBroadcastZone` | fly :8165 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lastExBroadcast` | fly :8159 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_lastGatherNodeAt` | fly :8037 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_lastGatherNodeId` | fly :8036 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | zone |
| `_lastInputAt` | fly :5379 | ui/BroTown.jsx | 2: ui/BroTown.jsx, networking/wsClient.js | ui/BroTown.jsx | 2+ | - | never |
| `_lastMoveBroadcast` | fly :8126 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_lastStatsUpdateSig` | fly :3662 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lastTrack` | fly :8198 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_mcEarly` | fly :9407 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read (tests) | - | never |
| `_mcTeachAt` | fly :9426 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_mcTeachN` | fly :9427 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read (tests) | - | never |
| `_miningOpen` | never set | ui/BroTown.jsx | - | ui/BroTown.jsx | no-set | - | never |
| `_mouseAimAngle` | fly :13264 | ui/BroTown.jsx | ui/BroTown.jsx | 4: ui/BroTown.jsx, game/bowFeel.js, game/desktopControls.js, +1 | - | - | never |
| `_mouseScreen` | fly :13265 | ui/BroTown.jsx | ui/BroTown.jsx | game/deskShield.js | - | - | never |
| `_mouseWorldX` | fly :13267 | ui/BroTown.jsx | ui/BroTown.jsx | rendering/systems/effectsRenderer.js | - | - | zone |
| `_mouseWorldY` | fly :13268 | ui/BroTown.jsx | ui/BroTown.jsx | rendering/systems/effectsRenderer.js | - | - | zone |
| `_nearHouse` | fly :6045 | ui/BroTown.jsx | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/desktopControls.js | - | - | zone |
| `_nearNode` | fly :6143 | ui/BroTown.jsx | ui/BroTown.jsx | 3: ui/BroTown.jsx, game/desktopControls.js, rendering/systems/effectsRenderer.js | - | - | zone |
| `_nearNpc` | fly :6955 | ui/BroTown.jsx | ui/BroTown.jsx | 2: game/desktopControls.js, ui/BroTown.jsx | - | - | zone |
| `_nearPetHouse` | fly :6063 | ui/BroTown.jsx | ui/BroTown.jsx | 2: game/desktopControls.js, ui/BroTown.jsx | - | - | zone |
| `_nearWheelBuilding` | fly :6010 | ui/BroTown.jsx | ui/BroTown.jsx | 3: ui/BroTown.jsx, game/desktopControls.js, game/interactions.js | - | - | zone |
| `_nearWheelDoor` | fly :6058 | ui/BroTown.jsx | ui/BroTown.jsx | 3: ui/BroTown.jsx, game/desktopControls.js, ui/panels/TrapButton.jsx | - | - | zone |
| `_nearWorkshop` | fly :6053 | ui/BroTown.jsx | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/desktopControls.js | - | - | zone |
| `_npcProxLatch` | fly :7096 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | zone |
| `_perf` | fly :4913 | ui/BroTown.jsx | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/renderFrame.js | - | - | never |
| `_petFetch` | fly :7213 | ui/BroTown.jsx | 3: game/petFetch.js~, networking/wsClient.js, ui/BroTown.jsx | 3: ui/BroTown.jsx, networking/wsClient.js, rendering/systems/entityRenderer.js | 2+ | - | zone |
| `_petPrevPX` | fly :7218 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_petPrevPY` | fly :7218 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_petX` | fly :7182 | ui/BroTown.jsx | 4: ui/BroTown.jsx, game/trapping.js, ui/panels/InventoryPanel.jsx, ui/panels/PetHousePanel.jsx | 4: ui/BroTown.jsx, game/trapping.js, networking/wsClient.js, +1 | 2+ | - | zone |
| `_petY` | fly :7183 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/trapping.js | 4: ui/BroTown.jsx, game/trapping.js, networking/wsClient.js, +1 | 2+ | - | zone |
| `_playerCount` | fly :2380 | ui/BroTown.jsx | ui/BroTown.jsx | ui/mobile/ChatBubble.jsx | - | - | rejoin |
| `_playtimeTick` | fly :7793 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_proxNode` | fly :6112 | ui/BroTown.jsx | ui/BroTown.jsx | 2: game/desktopControls.js, ui/BroTown.jsx | - | - | zone |
| `_pvpReputation` | never set | ui/BroTown.jsx | - | ui/BroTown.jsx | no-set | - | never |
| `_rBtnLiveUntil` | fly :6435 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_rBtnPressUntil` | fly :6451 | ui/BroTown.jsx | ui/BroTown.jsx | 2: game/tapJump.js, ui/BroTown.jsx | - | - | never |
| `_rBtnShown` | fly :6746 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_rJoyLiveUntil` | fly :10331 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_raft` | first :1296 | ui/BroTown.jsx | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/zoneMechanics.js | flag | - | never |
| `_railCss` | fly :5952 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_railCssAt` | fly :5950 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_restPending` | fly :8060 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | flag | - | never |
| `_resumeSpot` | fly :12589 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read (tests) | - | never |
| `_shieldAimMouse` | fly :8360 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_shieldAngle` | fly :8363 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/shieldToggle.js | 7: rendering/systems/entityRenderer.js, game/abilities.js, game/combatHelpers.js, +4 | 2+ | - | death |
| `_shieldCdUntil` | fly :8411 | ui/BroTown.jsx | ui/BroTown.jsx | 3: ui/panels/ShieldButton.jsx, game/playerActions.js, game/shieldToggle.js | - | - | death |
| `_shieldKb` | fly :10026 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/shieldToggle.js | ui/BroTown.jsx | 2+, flag | death | death |
| `_shieldMouse` | fly :10019 | ui/BroTown.jsx | 3: ui/BroTown.jsx, game/desktopControls.js, game/shieldToggle.js | game/desktopControls.js | 2+, flag | death | death |
| `_sled` | first :1292 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/zoneMechanics.js | 4: game/zoneMechanics.js, ui/BroTown.jsx, game/climbActions.js, +1 | 2+ | - | zone |
| `_sleeping` | fly :5725 | ui/BroTown.jsx | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/interactions.js | - | - | zone |
| `_slideVx` | fly :5055 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | death | zone |
| `_slideVy` | fly :5055 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | death | zone |
| `_snowballCd` | fly :14662 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_snowballs` | first :1288 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/zoneMechanics.js | - | 2+, no-read | - | zone |
| `_snowmen` | first :1290 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/zoneMechanics.js | ui/BroTown.jsx | 2+ | - | zone |
| `_spdBuffMul` | fly :15594 | ui/BroTown.jsx | 3: networking/wsClient.js, ui/BroTown.jsx, ui/panels/buildings/CookPanel.jsx | ui/BroTown.jsx | 2+ | - | rejoin |
| `_staleTouches` | fly :11948 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read (tests) | - | never |
| `_statsSavedJson` | fly :9124 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_tapActs` | fly :11636 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read | - | never |
| `_tapEmptySeq` | fly :13700 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_torch` | first :1294 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/zoneMechanics.js | 2: ui/BroTown.jsx, game/zoneMechanics.js | 2+ | - | zone |
| `_touchHandledAt` | fly :13131 | ui/BroTown.jsx | 2: ui/BroTown.jsx, ui/ExtractionSwipeLayer.jsx | ui/BroTown.jsx | 2+ | - | never |
| `_tourStarted` | fly :2140 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_trailTimer` | fly :7145 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_tutorialDoneAt` | fly :7893 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_tutorialStep` | fly :2112 | ui/BroTown.jsx | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/playerActions.js | - | - | never |
| `_uiBusy` | fly :3476 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_userCycledSlot` | fly :10064 | ui/BroTown.jsx | ui/BroTown.jsx | networking/wsClient.js | flag | - | never |
| `_wasMovingBcast` | fly :8061 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | flag | - | never |
| `_weaponSwapFlash` | fly :10080 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read | - | never |
| `_wellRestedUntil` | never set | ui/BroTown.jsx | - | 2: ui/BroTown.jsx, ui/panels/buildings/FarmPanel.jsx | no-set | - | death |
| `_wheelMem` | fly :13408 | ui/BroTown.jsx | 2: game/deskCombos.js~, ui/BroTown.jsx | ui/BroTown.jsx | 2+~ | - | never |
| `autoAttack` | first :1239 | ui/BroTown.jsx | 4: ui/BroTown.jsx, game/climbActions.js, game/shieldToggle.js, game/tapJump.js | 7: ui/BroTown.jsx, game/monsterCombat.js, rendering/systems/effectsRenderer.js, +4 | 2+, flag | - | zone |
| `bodyLegs` | first :1237 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/characterRecord.js | 3: ui/BroTown.jsx, networking/wsClient.js, rendering/systems/entityRenderer.js | 2+ | rejoin | never |
| `bodySize` | first :1238 | ui/BroTown.jsx | ui/BroTown.jsx | 3: networking/wsClient.js, rendering/systems/entityRenderer.js, ui/BroTown.jsx | - | - | never |
| `bodyTorso` | first :1236 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/characterRecord.js | 3: ui/BroTown.jsx, networking/wsClient.js, rendering/systems/entityRenderer.js | 2+ | rejoin | never |
| `camera` | first :1155 | ui/BroTown.jsx | 2: game/zoneTransitions.js, ui/BroTown.jsx | 25: ui/BroTown.jsx, rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js, +22 | 2+ | zone | zone |
| `collectedIds` | first :1249 | ui/BroTown.jsx | - | - | no-read | - | never |
| `collectibles` | first :1247 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read | - | zone |
| `destroyedTrees` | first :1263 | ui/BroTown.jsx | - | - | no-read | - | zone |
| `fishTimer` | first :1265 | ui/BroTown.jsx | - | - | no-read | - | zone |
| `lastBroadcast` | first :1231 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `lockedTarget` | first :1268 | ui/BroTown.jsx | 17: game/targeting.js, ui/BroTown.jsx, data/gameSystems.js~, game/zoneTransitions.js, game/duelLock.js, +12 | 25: game/monsterCombat.js, rendering/systems/effectsRenderer.js, ui/BroTown.jsx, +22 | 2+ | zone, death, rejoin | zone+rejoin |
| `myAvatar` | first :1227 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/characterRecord.js | 5: ui/BroTown.jsx, rendering/systems/entityRenderer.js, networking/wsClient.js, +2 | 2+ | rejoin | never |
| `myBroData` | first :1228 | ui/BroTown.jsx | ui/BroTown.jsx | 2: ui/BroTown.jsx, ui/panels/InfoPanel.jsx | - | - | never |
| `myColor` | first :1226 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/characterRecord.js | 8: ui/BroTown.jsx, game/chat.js, ui/mobile/ChatBubble.jsx, +5 | 2+ | rejoin | never |
| `myName` | first :1225 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/characterRecord.js | 17: ui/BroTown.jsx, game/chat.js, networking/wsClient.js, +14 | 2+ | rejoin | never |
| `nearBuilding` | first :1234 | ui/BroTown.jsx | ui/BroTown.jsx | 3: game/desktopControls.js, ui/BroTown.jsx, game/interactions.js | - | - | zone |
| `npcs` | first :1253 | ui/BroTown.jsx | 15: ui/BroTown.jsx, game/townsfolkDay.js~, game/monsterCombat.js~, game/race.js~, game/moveSounds.js~, +10 | 16: ui/BroTown.jsx, game/questRoute.js, game/monsterCombat.js, +13 | 2+ | zone, death | zone |
| `rpg` | first :1257 | ui/BroTown.jsx | 48: ui/BroTown.jsx, networking/wsClient.js, data/gameSystems.js~, networking/gameEvents.js, ui/mobile/dash/equipActions.js~, +43 | 132: ui/BroTown.jsx, networking/wsClient.js, game/monsterCombat.js, +129 | 2+ | zone, death, rejoin | never |
| `score` | first :1251 | ui/BroTown.jsx | - | - | no-read (tests) | - | never |
| `shieldEnd` | first :1304 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/shieldToggle.js | 2: game/monsterCombat.js, game/projectiles.js | 2+ | death | death |
| `stats` | first :1306 | ui/BroTown.jsx | 9: game/interactions.js, networking/gameEvents.js, ui/BroTown.jsx, game/chat.js, game/zoneMechanics.js, +4 | 10: game/interactions.js, ui/BroTown.jsx, game/chat.js, +7 | 2+ | - | never |
| `stickX` | first :1160 | ui/BroTown.jsx | ui/BroTown.jsx | 4: ui/BroTown.jsx, debug/perfHud.js, game/jumpActions.js, +1 | - | - | never |
| `stickY` | first :1161 | ui/BroTown.jsx | ui/BroTown.jsx | 5: ui/BroTown.jsx, debug/perfHud.js, game/climbActions.js, +2 | - | - | never |
| `swingAngle` | first :1270 | ui/BroTown.jsx | - | - | no-read | - | never |
| `trail` | first :1245 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | zone |
| `weapon` | first :1240 | ui/BroTown.jsx | - | - | no-read (tests) | - | never |
| `_harvestKeys` | fly :726 | ui/ExtractionSwipeLayer.jsx | ui/ExtractionSwipeLayer.jsx | game/desktopControls.js | - | - | never |
| `activeQuest` | never set | ui/GameApp.jsx | - | ui/GameApp.jsx | no-set | - | never |
| `journey` | never set | ui/GameApp.jsx | - | ui/GameApp.jsx | no-set | - | never |
| `rpgState` | never set | ui/GameApp.jsx | - | ui/GameApp.jsx | no-set | - | never |
| `_dropLinesAt` | fly :607 | ui/XpFlyOverlay.jsx | 2: game/killXp.js, ui/XpFlyOverlay.jsx | game/dropLines.js | 2+ | - | never |
| `_hudPopups` | fly :554 | ui/XpFlyOverlay.jsx | ui/XpFlyOverlay.jsx | 2: ui/XpFlyOverlay.jsx, ui/mobile/ZoneHeader.jsx | - | - | never |
| `_xpBarLastGainTs` | fly :210 | ui/XpFlyOverlay.jsx | ui/XpFlyOverlay.jsx | ui/XpFlyOverlay.jsx | - | - | never |
| `_teachNode` | fly :135 | ui/deskTeach.js | ui/deskTeach.js | rendering/systems/wheelMinimap.js | - | - | zone |
| `visitedZones` | never set | ui/mobile/dash/MapPanel.jsx | - | ui/mobile/dash/MapPanel.jsx | no-set | - | never |
| `playerId` | never set | ui/mobile/dash/itemActions.js | - | 2: ui/mobile/dash/itemActions.js, ui/panels/InventoryPanel.jsx | no-set | - | never |
| `_blocked` | fly :158 | ui/mobile/sheet/friendsModel.js | ui/mobile/sheet/friendsModel.js | ui/mobile/sheet/friendsModel.js | - | - | never |
| `_friends` | fly :147 | ui/mobile/sheet/friendsModel.js | ui/mobile/sheet/friendsModel.js | ui/mobile/sheet/friendsModel.js | - | - | never |
| `blocked` | fly :158 | ui/mobile/sheet/friendsModel.js | ui/mobile/sheet/friendsModel.js | ui/mobile/sheet/friendsModel.js | - | - | never |
| `friends` | fly :147 | ui/mobile/sheet/friendsModel.js | ui/mobile/sheet/friendsModel.js | ui/mobile/sheet/friendsModel.js | - | - | never |
| `zone` | never set | ui/mobile/sheet/friendsModel.js | - | ui/mobile/sheet/friendsModel.js | no-set | - | never |
| `_pendingClanInvite` | fly :25 | ui/panels/ClanInviteCard.jsx | 3: ui/panels/ClanInviteCard.jsx, networking/gameEvents.js, ui/panels/ClanPanel.jsx | 4: ui/BroTown.jsx, networking/gameEvents.js, ui/panels/ClanPanel.jsx, +1 | 2+ | - | rejoin |
| `_clanData` | fly :569 | ui/panels/ClanPanel.jsx | 3: ui/panels/ClanPanel.jsx, networking/gameEvents.js, ui/BroTown.jsx | 9: networking/gameEvents.js, ui/BroTown.jsx, ui/panels/WarBanner.jsx, +6 | 2+ | - | rejoin |
| `_clanPaintColor` | fly :496 | ui/panels/ClanPanel.jsx | ui/panels/ClanPanel.jsx | ui/panels/ClanPanel.jsx | - | - | never |
| `_clanPainting` | fly :575 | ui/panels/ClanPanel.jsx | ui/panels/ClanPanel.jsx | ui/panels/ClanPanel.jsx | flag | - | never |
| `_warTarget` | fly :871 | ui/panels/ClanPanel.jsx | ui/panels/ClanPanel.jsx | ui/panels/ClanPanel.jsx | - | - | never |
| `_warTargetData` | fly :872 | ui/panels/ClanPanel.jsx | ui/panels/ClanPanel.jsx | ui/panels/ClanPanel.jsx | - | - | never |
| `_warZone` | fly :796 | ui/panels/ClanPanel.jsx | ui/panels/ClanPanel.jsx | ui/panels/ClanPanel.jsx | - | - | never |
| `_customDungeonTerrain` | fly :937 | ui/panels/DungeonCreatorPanel.jsx | ui/panels/DungeonCreatorPanel.jsx | - | no-read | - | zone |
| `_preDungeonMap` | fly :896 | ui/panels/DungeonCreatorPanel.jsx | ui/panels/DungeonCreatorPanel.jsx | - | no-read | - | zone |
| `_preDungeonMonsters` | fly :897 | ui/panels/DungeonCreatorPanel.jsx | ui/panels/DungeonCreatorPanel.jsx | - | no-read | - | zone |
| `_preDungeonNodes` | fly :898 | ui/panels/DungeonCreatorPanel.jsx | ui/panels/DungeonCreatorPanel.jsx | - | no-read | - | zone |
| `_fbLastFilter` | fly :171 | ui/panels/FeedbackPanel.jsx | ui/panels/FeedbackPanel.jsx | ui/panels/FeedbackPanel.jsx | - | - | never |
| `_pvpThreatCdUntil` | fly :573 | ui/panels/InspectPlayerPanel.jsx | ui/panels/InspectPlayerPanel.jsx | ui/panels/InspectPlayerPanel.jsx | - | - | never |
| `_lbLastTab` | fly :165 | ui/panels/LeaderboardPanel.jsx | ui/panels/LeaderboardPanel.jsx | ui/panels/LeaderboardPanel.jsx | - | - | never |
| `_lbServerData` | fly :166 | ui/panels/LeaderboardPanel.jsx | ui/panels/LeaderboardPanel.jsx | ui/panels/LeaderboardPanel.jsx | - | - | never |
| `_mktLastRefresh` | fly :838 | ui/panels/buildings/ExchangePanel.jsx | ui/panels/buildings/ExchangePanel.jsx | ui/panels/buildings/ExchangePanel.jsx | - | - | never |
| `_gambleWager` | fly :150 | ui/panels/buildings/GamblePanel.jsx | ui/panels/buildings/GamblePanel.jsx | ui/panels/buildings/GamblePanel.jsx | - | - | never |
| `_arenaHistoryLoaded` | fly :963 | ui/panels/buildings/PartyPanel.jsx | ui/panels/buildings/PartyPanel.jsx | ui/panels/buildings/PartyPanel.jsx | flag | - | never |
| `_arenaLastPoll` | fly :197 | ui/panels/buildings/PartyPanel.jsx | ui/panels/buildings/PartyPanel.jsx | ui/panels/buildings/PartyPanel.jsx | - | - | never |
| `_smithyTab` | fly :110 | ui/panels/buildings/SmithyPanel.jsx | ui/panels/buildings/SmithyPanel.jsx | ui/panels/buildings/SmithyPanel.jsx | - | - | never |
| `_wwType` | fly :74 | ui/panels/buildings/WoodworkPanel.jsx | ui/panels/buildings/WoodworkPanel.jsx | ui/panels/buildings/WoodworkPanel.jsx | - | - | never |

## The phases (step 5.3b's starting list)

Every row marked `phase`, with the words the code sets it to or compares it with, and how many functions
set it (a phase with one door has one).

| where | name | the words seen | set in |
|---|---|---|---|
| `S` | `_lockDroppedWhy` | dead, far, gone, weapon | 1: game/targeting.js updateTargeting |
| `S` | `currentZone` | farm_home, frost, hollows, tidal, town, wheel | 1: game/zoneTransitions.js changeZone |
| `S` | `_pvpSkullType` | red, white | 6 functions |
| `S` | `_realtimeStatus` | connected, connecting, device, disconnected, frozen, full, idle, key, linger, locked, origin, rejected, +2 | 11 functions |
| `S` | `_facingSrc` | aim, climb, facingAngle, fallback, moving, shield, stick | 1: rendering/systems/entityRenderer.js _updatePlayer |
| `S` | `_aimSrc` | lock, mouse, stick, tap | 7 functions |
| `S` | `_facing` | down, up | 8 functions |
| game/chatChannel.js | `_mode` | area, party, whisper | 1: game/chatChannel.js setMode |
| rendering/bodyRecolor.js | `_bakeTag` | , jog-east | 1: rendering/bodyRecolor.js setBakeTag |
| rendering/characterPortrait.js | `_portraitForce` | every, fresh | 1: rendering/characterPortrait.js __btPortraitCompare |
| ui/panels/TradeWindowPanel.jsx | `_tradeSide` | 0, 1 | 1: ui/panels/TradeWindowPanel.jsx tradeLanesCls |

### The plan's machines, and what carries each today (suggested, not confirmed)

Step 5.3b names the state machines to make explicit. Most are not one field today: they are spread over
flags, clocks and objects that no word-rule finds. A reader marked the rows that plainly carry each
(the script's `MACHINES` table). A starting list for card L, not a finding.

| machine | fields of `S` | top-of-file variables |
|---|---|---|
| life | `_deathCard` `_deathStart` `_dying` | - |
| zone | `_spawnToWheel` `currentZone` | `COLS` (data/gameSystems.js), `ROWS` (data/gameSystems.js), `TOWN_H` (data/gameSystems.js), `TOWN_W` (data/gameSystems.js), `_lastZone` (ui/zoneBannerOverlay.js) |
| duel | `_activeDuel` `_inDuel` | - |
| trade | `_t2DoneWatch` `_t2Leave` `_t2Live` `_t2QuietUntil` | - |
| party | `_party` | - |
| harvest | `_extraction` `_nearNode` `_proxNode` | - |
| guard | `_blockPose` `_shieldAngle` `_shieldAutoReleased` `_shieldCdUntil` `_shieldKb` `_shieldMouse` `_shieldStamina` `_shieldUp` `shieldActive` `shieldEnd` | `blockRingBus` (ui/mobile/blockRingBus.js), `state` (ui/mobile/blockRingBus.js) |
| dungeon | `_customDungeonConfig` `_customDungeonTerrain` `_dungeonBack` `_dungeonBossSpawned` `_dungeonClear` `_dungeonComplete` `_dungeonDepth` `_dungeonEnteredAt` `_dungeonMaxWaves` `_dungeonWave` `_dungeonZone` `_inCustomDungeon` `_inDungeon` `_preDungeonMap` `_preDungeonMonsters` `_preDungeonNodes` `_preDungeonPos` `_serverDungeon` `_wheelDungeonOpening` | - |
| arena | `_arenaInvolved` `_arenaMatch` `_arenaStakeBoard` `_arenaTournamentId` | - |
| fishing | `fishTimer` | - |
| connection | `_authRejects` `_frozenByAdmin` `_httpToken` `_joinId` `_joinKey` `_joinRejectedFatal` `_joinedId` `_keyFellBack` `_keyIdAsked` `_netHold` `_realtimeStatus` `_tabClaim` `_tabMoved` `_verifyToken` `channel` | `_state` (networking/serverReady.js), `_veil` (networking/serverReady.js), `_veilTimer` (networking/serverReady.js), `_waiters` (networking/serverReady.js), `el` (ui/DeviceScreen.js), `el` (ui/LingerScreen.js), `nextAt` (ui/LingerScreen.js), `timer` (ui/LingerScreen.js), `el` (ui/OriginScreen.js), `attempts` (ui/RoomFullScreen.js), `el` (ui/RoomFullScreen.js), `nextAt` (ui/RoomFullScreen.js), `timer` (ui/RoomFullScreen.js) |
| loading | `__introLiftedAt` `__introLiftedZone` `_avatarArtHold` `_bodyPlaceDue` `_farmArtHold` `_townArtHold` `_wheelTripVeil` `_zoneLoading` | `_ready` (game/worldTrial.js), `_zoneLoadEl` (game/zoneTransitions.js), `_fxPreload` (rendering/systems/effectsRenderer.js), `prewarmProgress` (rendering/systems/entityRenderer.js), `_residentZoneMaps` (rendering/tiledMaps.js), `_readyAt` (ui/loadingGate.js), `_up` (ui/loadingGate.js), `_waiting` (ui/loadingGate.js), `_worldIn` (ui/loadingGate.js) |
| window | `_miningOpen` `_npcProxLatch` `_uiBusy` | `_win` (game/dailyRewards.js), `_st` (game/loginSpinWheel.js), `_state` (ui/mobile/ChestReveal.jsx), `_open` (ui/mobile/controlsTutorialBus.js), `state` (ui/mobile/dash/itemDetailBus.js), `state` (ui/mobile/dash/spendConfirmBus.js), `dashboardPanelBus` (ui/mobile/dashboardPanelBus.js), `_open` (ui/mobile/infoPopupBus.js), `state` (ui/mobile/inspectCardBus.js), `inventoryBus` (ui/mobile/inventoryBus.js), `state` (ui/mobile/inventoryBus.js), `_depth` (ui/mobile/modalGuardBus.js), `openThread` (ui/mobile/sheet/friendsSync.js), `_pending` (ui/mobile/sheet/heroSectionBus.js), `heroSectionBus` (ui/mobile/sheet/heroSectionBus.js), `uiBusyBus` (ui/mobile/uiBusyBus.js), `state` (ui/mobile/wheelBus.js) |

## The variables at the top of files

The system (provisional) is the row's own file. **what** is how it is declared and what it is made as.
**written by** leaves the row's own file out when it is the only writer (`own`).

| file | line | name | what | written by | read by | marks | written at (today) | should reset (suggested, not confirmed) |
|---|---|---|---|---|---|---|---|---|
| data/abilities.js | 204 | `_blockScale` | var bool | own | own | flag | rejoin | rejoin |
| data/abilities.js | 208 | `_enabled` | var bool | own | own | flag | rejoin | rejoin |
| data/achievements.js | 99 | `BY_ID` | const object | own | own | - | - | never |
| data/bowFeelSound.js | 29 | `_noise` | var null | own | own | - | - | never |
| data/effects.js | 366 | `WORLDVIEW_ARRIVAL` | const object | game/worldTrial.js | 3: game/zoneTransitions.js, data/effects.js, game/worldTrial.js | - | - | never |
| data/effects.js | 368 | `WORLDVIEW_EXITS` | const array | game/worldTrial.js | 5: game/zoneTransitions.js, rendering/systems/tileRenderer.js, data/effects.js, +2 | - | - | never |
| data/fishVariants.js | 27 | `NAME` | const object | own | own | - | - | never |
| data/footstepClips.js | 9 | `FOOTSTEP_CLIPS` | const object | own | 3: data/gameDisplay.js, ui/panels/SoundStudio.jsx, data/footstepClips.js | - | - | never |
| data/gameDisplay.js | 1249 | `BT_AUDIO` | const call | 9: data/gameDisplay.js, game/eventSounds.js, game/clientOffApply.js, game/ambientBeds.js, +5 | 74: game/monsterCombat.js, networking/gameEvents.js, ui/GameApp.jsx, +71 | 2+ | zone, death | never |
| data/gameSystems.js | 1254 | `_fishHealLadder` | var bool | own | own | flag | rejoin | rejoin |
| data/gameSystems.js | 2535 | `WEAPON_STASH_MAX` | let number | own | 7: game/groundLoot.js, ui/mobile/dash/equipActions.js, data/gameSystems.js, +4 | - | rejoin | rejoin |
| data/gameSystems.js | 2861 | `TOWN_W` | let value | own | 2: ui/BroTown.jsx, data/gameSystems.js | - | zone, death | zone |
| data/gameSystems.js | 2862 | `TOWN_H` | let value | own | 2: ui/BroTown.jsx, data/gameSystems.js | - | zone, death | zone |
| data/gameSystems.js | 2863 | `COLS` | let value | own | own | - | zone, death | zone |
| data/gameSystems.js | 2864 | `ROWS` | let value | own | own | - | zone, death | zone |
| data/gameSystems.js | 3496 | `_t2BenchEnabled` | var bool | own | own | flag | rejoin | rejoin |
| data/gameSystems.js | 4286 | `_gridCapsEnabled` | var bool | own | own | flag | rejoin | rejoin |
| data/gameSystems.js | 4297 | `_t2SimpleEnabled` | var bool | own | own | flag | rejoin | rejoin |
| data/gameSystems.js | 5100 | `discoveredCollisions` | const Set | own | 3: data/gameSystems.js, ui/panels/EncyclopediaPanel.jsx, ui/panels/InventoryPanel.jsx | - | - | never |
| data/gameSystems.js | 5117 | `discoveredMonsters` | const Set | own | 2: ui/panels/EncyclopediaPanel.jsx, data/gameSystems.js | - | - | never |
| data/gameSystems.js | 5133 | `discoveredMaterials` | const Set | own | 2: ui/panels/EncyclopediaPanel.jsx, data/gameSystems.js | - | - | never |
| data/gameSystems.js | 5149 | `visitedZones` | const Set | own | 2: data/gameSystems.js, ui/panels/EncyclopediaPanel.jsx | - | zone | never |
| data/gameSystems.js | 5514 | `_gearQ` | var bool | own | own | flag | rejoin | rejoin |
| data/gameSystems.js | 8128 | `_npcHasQuestCache` | var null | own | own | - | - | never |
| data/gameSystems.js | 8249 | `_doorCache` | var null | own | own | - | - | never |
| data/gameSystems.js | 8250 | `_doorCount` | var number | own | own | - | - | never |
| data/gameSystems.js | 8267 | `_closedDoorZones` | var null | own | own | - | - | never |
| data/gameSystems.js | 8285 | `_grottoParty` | var null | own | own | - | rejoin | rejoin |
| data/gameSystems.js | 8332 | `_wheelDoorActions` | var null | own | own | - | - | never |
| data/gameSystems.js | 8443 | `_questsByNpc` | let null | own | own | - | - | never |
| data/gameSystems.js | 8444 | `_questEntries` | let null | own | own | - | - | never |
| data/monsterDeathZones.js | 292 | `_resolved` | const Map | own | own | - | - | never |
| data/oneFormula.js | 33 | `_on` | var bool | own | own | flag | rejoin | rejoin |
| data/oneFormula.js | 42 | `_oneLevel` | var bool | own | own | flag | rejoin | rejoin |
| data/oneFormula.js | 51 | `_gearOnLevel` | var bool | own | own | flag | rejoin | rejoin |
| data/ownerIcons.js | 48 | `SCENES` | const object | own | own | - | - | never |
| data/prog3.js | 394 | `_enabled` | var bool | own | own | flag | rejoin | rejoin |
| data/prog3.js | 405 | `_prog3x` | var bool | own | own | flag | rejoin | rejoin |
| data/prog3.js | 418 | `_prog3elem` | var bool | own | own | flag | rejoin | rejoin |
| data/prog3.js | 432 | `_prog3shared` | var bool | own | own | flag | rejoin | rejoin |
| data/prog3.js | 442 | `_prog3rel` | var bool | own | own | flag | rejoin | rejoin |
| data/prog3.js | 453 | `_statFree` | var bool | own | own | flag | rejoin | rejoin |
| data/prog3.js | 554 | `_burstCaps` | var bool | own | own | flag | rejoin | rejoin |
| data/prog3.js | 567 | `_milestonesRetired` | var bool | own | own | flag | rejoin | rejoin |
| data/raceTally.js | 14 | `lost` | let number | own | own | - | - | never |
| data/soundFold.js | 37 | `_a` | let null | own | own | - | - | never |
| data/soundFold.js | 37 | `_b` | let null | own | own | - | - | never |
| data/soundFold.js | 37 | `_m` | let null | own | own | - | - | never |
| data/statDemoAssets.js | 44 | `_blueSheets` | let null | own | own | - | - | never |
| data/weaponFeelSound.js | 39 | `_noise` | var null | own | own | - | - | never |
| data/wheelLands.js | 22 | `LOOK` | const object | own | own | - | - | never |
| data/worldProps.js | 838 | `_blockerCache` | const object | own | own | - | - | never |
| data/worldProps.js | 848 | `_blockerHook` | let null | own | own | - | - | zone |
| data/zoneBanner.js | 50 | `ZONE_BANNER_THEME` | const object | own | 2: rendering/zoneBannerPreload.js, data/zoneBanner.js | - | - | never |
| data/zoneBanner.js | 86 | `ZONE_BANNER_STRIPS` | const object | own | 2: rendering/zoneBannerPreload.js, data/zoneBanner.js | - | - | never |
| data/zones.js | 2 | `ZONES` | const object | 4: networking/gameEvents.js, data/gameDisplay.js, game/wheelDungeons.js, game/zoneTransitions.js | 49: game/zoneTransitions.js, game/wheelDungeons.js, networking/gameEvents.js, +46 | 2+ | zone, death | never |
| debug/busyBeat.js | 23 | `_base` | let value | own | own | - | - | never |
| debug/busyBeat.js | 23 | `_last` | let number | own | own | - | - | never |
| debug/busyBeat.js | 23 | `_n` | let number | own | own | - | - | never |
| debug/busyBeat.js | 23 | `_on` | let bool | own | own | flag | - | never |
| debug/busyBeat.js | 24 | `_gaps` | const typed array | own | own | - | - | never |
| debug/busyBeat.js | 25 | `_gi` | let number | own | own | - | - | never |
| debug/busyBeat.js | 25 | `_gn` | let number | own | own | - | - | never |
| debug/busyBeat.js | 26 | `_held` | const array | own | own | - | - | never |
| debug/crashTrap.js | 45 | `_flushTimer` | let null | own | own | - | - | never |
| debug/crashTrap.js | 46 | `_flushAt` | let number | own | own | - | - | never |
| debug/crashTrap.js | 49 | `_lastSentKey` | let string | own | own | - | - | never |
| debug/crashTrap.js | 120 | `_rebuilds` | let number | own | own | - | - | never |
| debug/crashTrap.js | 168 | `_aliveAt` | let number | own | own | - | - | never |
| debug/crashTrap.js | 169 | `_aliveChan` | let null | own | own | - | - | never |
| debug/crashTrap.js | 187 | `_markWhere` | let null | own | own | - | - | ? |
| debug/crashTrap.js | 188 | `_death` | let null | own | own | - | - | ? |
| debug/crashTrap.js | 189 | `_glLost` | let number | own | own | - | - | ? |
| debug/debugBus.js | 8 | `listeners` | const Set | own | own | - | - | never |
| debug/debugBus.js | 9 | `logs` | const array | own | own | - | - | never |
| debug/debugBus.js | 10 | `wsFrames` | const array | own | own | - | - | never |
| debug/debugBus.js | 11 | `commands` | const Map | own | own | - | - | never |
| debug/debugBus.js | 12 | `commandHistory` | let array | own | own | - | - | never |
| debug/debugBus.js | 14 | `state` | const object | own | own | - | - | never |
| debug/debugBus.js | 49 | `consoleHooked` | let bool | own | own | flag | - | never |
| debug/debugBus.js | 70 | `wsHooked` | let bool | own | own | flag | - | never |
| debug/debugBus.js | 202 | `debugBus` | const object | debug/DebugOverlay.jsx | 4: debug/DebugOverlay.jsx, ui/GameApp.jsx, debug/debugBus.js, +1 | - | - | never |
| debug/perfHud.js | 42 | `_stickHi` | let number | own | own | - | - | never |
| debug/perfHud.js | 42 | `_stickLo` | let number | own | own | - | - | never |
| debug/perfHud.js | 42 | `_stickOn` | let bool | own | own | flag | - | never |
| debug/perfHud.js | 63 | `el` | let null | own | own | - | - | never |
| debug/perfHud.js | 136 | `_chip` | let null | own | own | - | - | never |
| debug/perfTracker.js | 28 | `ring` | const array | own | own | - | - | never |
| debug/perfTracker.js | 29 | `ringIdx` | let number | own | own | - | - | never |
| debug/perfTracker.js | 30 | `ringCount` | let number | own | own | - | - | never |
| debug/perfTracker.js | 32 | `longFrames` | const array | own | own | - | - | never |
| debug/perfTracker.js | 33 | `longTasks` | const array | own | own | - | - | never |
| debug/perfTracker.js | 34 | `extEvents` | const array | own | own | - | - | never |
| debug/perfTracker.js | 47 | `zoneStats` | let call | own | own | - | zone | zone |
| debug/perfTracker.js | 53 | `spikeLastT` | let number | own | own | - | - | never |
| debug/perfTracker.js | 54 | `spikeWorst` | let null | own | own | - | - | never |
| debug/perfTracker.js | 56 | `longTaskObserver` | let null | own | own | - | - | never |
| debug/perfTracker.js | 87 | `timersHooked` | let bool | own | own | flag | - | never |
| debug/report.js | 122 | `_S` | let null | own | own | - | rejoin | ? |
| debug/report.js | 123 | `_timer` | let null | own | own | - | rejoin | ? |
| debug/report.js | 124 | `_joinedAt` | let number | own | own | - | rejoin | ? |
| debug/report.js | 125 | `_dueAt` | let number | own | own | - | rejoin | ? |
| debug/report.js | 126 | `_died` | let null | own | own | - | - | ? |
| debug/report.js | 127 | `_diedOwed` | let bool | own | own | flag | rejoin | ? |
| debug/report.js | 128 | `_lastFrameT` | let number | own | own | - | rejoin | ? |
| debug/report.js | 128 | `_lastHoldT` | let number | own | own | - | rejoin | ? |
| debug/report.js | 129 | `_a` | let null | own | own | - | - | ? |
| debug/report.js | 130 | `_last` | let null | own | own | - | - | ? |
| debug/report.js | 131 | `_dropped` | let number | own | own | - | - | ? |
| debug/report.js | 131 | `_sent` | let number | own | own | - | - | ? |
| game/accuracy.js | 56 | `listeners` | const Set | own | own | - | - | never |
| game/achievements.js | 228 | `_titlePick` | let bool | own | own | flag | - | never |
| game/alliance.js | 15 | `listeners` | const Set | own | own | - | - | never |
| game/ambientBeds.js | 63 | `st` | const object | own | own | - | - | never |
| game/bank.js | 21 | `listeners` | const Set | own | own | - | - | never |
| game/bank.js | 22 | `rev` | let number | own | own | - | - | never |
| game/bank.js | 32 | `seq` | let number | own | own | - | - | never |
| game/bowFeel.js | 56 | `_wanted` | let null | own | own | - | - | never |
| game/buildingRooms.js | 43 | `_held` | let null | own | own | - | - | zone |
| game/buildingRooms.js | 44 | `_prefetchStarted` | let bool | own | own | flag | - | never |
| game/characterCreatorEffects.js | 211 | `_offCanvas` | let null | own | own | - | - | never |
| game/characterCreatorEffects.js | 214 | `_cam` | let null | own | own | - | - | never |
| game/characterCreatorEffects.js | 218 | `_figBounds` | let null | own | own | - | - | never |
| game/chat.js | 61 | `_moveSender` | var null | own | own | - | - | never |
| game/chatChannel.js | 69 | `_mode` | let call | own | own | phase | - | never |
| game/chatChannel.js | 70 | `_to` | let string | own | own | - | - | never |
| game/chatChannel.js | 71 | `listeners` | const Set | own | own | - | - | never |
| game/chatMute.js | 37 | `_subs` | var array | own | own | - | - | never |
| game/chatMute.js | 89 | `_blockSubs` | var array | own | own | - | - | never |
| game/chatMute.js | 157 | `_kept` | var Map | own | own | - | - | rejoin |
| game/clientOff.js | 67 | `_live` | let null | own | own | - | rejoin | rejoin |
| game/clientOff.js | 68 | `_atLoad` | let null | own | own | - | - | never |
| game/clientOff.js | 69 | `_subs` | const array | own | own | - | - | never |
| game/climbActions.js | 40 | `climbStats` | const object | own | own | - | - | never |
| game/climbActions.js | 146 | `_lastS` | let null | own | own | - | - | never |
| game/combatHelpers.js | 1104 | `_propSlashFlip` | var number | own | - | no-read | - | never |
| game/controlVisibility.js | 35 | `HOLDS` | const object | own | own | - | - | never |
| game/dailyRewards.js | 26 | `_state` | let null | own | own | - | - | rejoin |
| game/dailyRewards.js | 27 | `_lastSpin` | let null | own | own | - | - | never |
| game/dailyRewards.js | 28 | `_win` | let object | own | own | - | - | never |
| game/dailyRewards.js | 29 | `_listeners` | const Set | own | own | - | - | never |
| game/dailyRewards.js | 86 | `_spinSeq` | let number | own | - | no-read | - | never |
| game/dashSidePref.js | 70 | `_pref` | let call | own | own | - | - | never |
| game/deskKeys.js | 50 | `NAV_BY_CODE` | const object | own | own | - | - | never |
| game/deviceProfile.js | 47 | `_mq` | const object | own | own | - | - | never |
| game/deviceProfile.js | 212 | `_chipOf` | const WeakMap | own | own | - | - | ? |
| game/dropLook.js | 13 | `thumb` | let null | own | own | - | - | never |
| game/dungeonArt.js | 54 | `_live` | const Set | own | own | - | - | zone |
| game/dungeonClear.js | 20 | `subs` | const Set | own | own | - | - | never |
| game/eventSounds.js | 37 | `cueStats` | const object | own | own | - | zone, death | never |
| game/eventSounds.js | 43 | `_lastAt` | const Map | own | own | - | zone, death | never |
| game/eventSounds.js | 44 | `_peerAt` | let array | own | own | - | - | never |
| game/eventSounds.js | 140 | `_stepAt` | let array | own | own | - | - | never |
| game/farmFeedback.js | 70 | `toldRipe` | let number | own | own | - | - | never |
| game/farmTrip.js | 28 | `_seq` | let number | own | - | no-read | zone | never |
| game/fishWeigh.js | 15 | `listeners` | const Set | own | own | - | - | never |
| game/fishWeigh.js | 16 | `st` | const object | own | own | - | - | rejoin |
| game/framePacer.js | 202 | `_drawnAt` | let null | own | own | - | - | never |
| game/framePacer.js | 232 | `_before` | const array | own | own | - | - | never |
| game/friendErrors.js | 44 | `lastAt` | const Map | own | own | - | - | never |
| game/hitSounds.js | 65 | `hitSoundStats` | const object | own | own | - | - | never |
| game/hitSounds.js | 117 | `_echoAt` | let array | own | own | - | - | never |
| game/jumpActions.js | 27 | `_jumpMs` | var none | own | own | - | - | never |
| game/loadTimes.js | 28 | `_marks` | const array | own | own | - | zone | never |
| game/loadTimes.js | 29 | `_seen` | const object | own | own | - | zone | never |
| game/loadTimes.js | 30 | `_groups` | const object | own | own | - | - | never |
| game/loadTimes.js | 31 | `_groupsFrom` | let null | own | own | - | - | never |
| game/loginSpinWheel.js | 65 | `listeners` | const Set | own | own | - | - | never |
| game/loginSpinWheel.js | 66 | `_st` | let object | own | own | - | - | rejoin |
| game/manualCombat.js | 247 | `_mode` | var null | own | own | - | - | never |
| game/manualCombat.js | 311 | `_bowHook` | var null | own | own | - | - | never |
| game/mastery.js | 60 | `_level` | let null | own | own | - | - | never |
| game/mastery.js | 61 | `_certs` | let null | own | own | - | - | never |
| game/mastery.js | 62 | `_timestamps` | let null | own | own | - | - | never |
| game/mastery.js | 88 | `subscribers` | const Set | own | own | - | - | never |
| game/monsterMoves.js | 31 | `_caps` | let null | own | own | - | rejoin | rejoin |
| game/nmlAsk.js | 139 | `_ask` | let null | own | own | - | - | zone |
| game/nmlAsk.js | 140 | `_subs` | const Set | own | own | - | - | never |
| game/nmlAsk.js | 159 | `_msOverride` | let number | own | own | - | - | never |
| game/nmlAsk.js | 287 | `_joins` | const array | own | own | - | - | never |
| game/nmlExplainOnce.js | 48 | `_told` | const Set | own | own | - | - | never |
| game/noMansLand.js | 193 | `_note` | const object | own | own | - | - | zone |
| game/npcVoices.js | 66 | `st` | const object | own | own | - | - | never |
| game/ownSounds.js | 37 | `st` | const object | own | own | - | - | never |
| game/pinSlots.js | 335 | `_ask` | let null | own | own | - | - | never |
| game/pinSlots.js | 336 | `_subs` | const Set | own | own | - | - | never |
| game/projectiles.js | 44 | `_segHitX` | var number | own | own | - | - | never |
| game/projectiles.js | 44 | `_segHitY` | var number | own | own | - | - | never |
| game/projectiles.js | 109 | `PROJ_BODY` | var object | own | own | - | - | never |
| game/projectiles.js | 276 | `_capAx` | var number | own | own | - | - | never |
| game/projectiles.js | 276 | `_capAy` | var number | own | own | - | - | never |
| game/projectiles.js | 276 | `_capBx` | var number | own | own | - | - | never |
| game/projectiles.js | 276 | `_capBy` | var number | own | own | - | - | never |
| game/questHandIn.js | 26 | `_pending` | const Map | own | own | - | - | rejoin |
| game/questKept.js | 21 | `_kept` | const Map | own | own | - | rejoin | rejoin |
| game/questTrailStyle.js | 92 | `_style` | let call | own | own | - | - | never |
| game/questTrailStyle.js | 118 | `_lastShown` | let call | own | own | - | - | never |
| game/race.js | 43 | `_subs` | const Set | own | own | - | - | never |
| game/renderRes.js | 28 | `_url` | let null | own | own | - | - | never |
| game/renderRes.js | 29 | `_live` | let number | own | own | - | - | never |
| game/revealBag.js | 77 | `_then` | const Map | own | own | - | - | rejoin |
| game/revealBag.js | 83 | `_held` | const Map | own | own | - | - | never |
| game/revealBag.js | 88 | `_after` | const array | own | own | - | - | never |
| game/rideSound.js | 48 | `st` | const object | own | own | - | - | never |
| game/rpgSave.js | 26 | `_timer` | let null | own | own | - | - | never |
| game/rpgSave.js | 27 | `_lastWrite` | let number | own | own | - | - | never |
| game/salvage.js | 20 | `_last` | let null | own | own | - | - | never |
| game/salvage.js | 21 | `_listeners` | const Set | own | own | - | - | never |
| game/season.js | 27 | `_forced` | let none | own | own | - | - | never |
| game/shardCrack.js | 33 | `_last` | let null | own | own | - | - | never |
| game/shardCrack.js | 34 | `_pending` | let null | own | own | - | - | rejoin |
| game/shardCrack.js | 35 | `_seq` | let number | own | - | no-read | - | never |
| game/shardCrack.js | 36 | `_listeners` | const Set | own | own | - | - | never |
| game/shieldGem.js | 42 | `_last` | let null | own | own | - | - | never |
| game/shieldGem.js | 43 | `_pending` | let null | own | own | - | - | rejoin |
| game/shieldGem.js | 44 | `_listeners` | const Set | own | own | - | - | never |
| game/soundStudio.js | 31 | `_ring` | const array | own | own | - | - | never |
| game/soundStudio.js | 32 | `_next` | let number | own | own | - | - | never |
| game/soundStudio.js | 33 | `_seq` | let number | own | - | no-read | - | never |
| game/soundStudio.js | 82 | `_installed` | let bool | own | own | flag | - | never |
| game/soundStudio.js | 110 | `_host` | let null | own | own | - | - | never |
| game/soundStudio.js | 111 | `_root` | let null | own | own | - | - | never |
| game/soundStudio.js | 112 | `_opening` | let null | own | own | - | - | never |
| game/sparTargets.js | 127 | `_foeRule` | let null | own | own | - | - | never |
| game/speedTest.js | 213 | `_card` | let null | own | own | - | - | never |
| game/speedTest.js | 258 | `_running` | let bool | own | own | flag | - | never |
| game/spinBoard.js | 12 | `listeners` | const Set | own | own | - | - | never |
| game/staffFeel.js | 124 | `_wanted` | let null | own | own | - | - | never |
| game/staffFeel.js | 125 | `_audio` | let null | own | own | - | - | never |
| game/storeAnswer.js | 87 | `sellsOut` | const Map | own | own | - | - | never |
| game/swordFeel.js | 51 | `_wanted` | let null | own | own | - | - | never |
| game/tapJump.js | 77 | `_tapMs` | var none | own | own | - | - | never |
| game/timeOfDay.js | 38 | `OUTDOOR` | const object | own | own | - | - | never |
| game/timeOfDay.js | 107 | `_alwaysDay` | let bool | own | own | flag | - | never |
| game/townAmbience.js | 29 | `st` | const object | own | own | - | - | never |
| game/townChatter.js | 34 | `_off` | var null | own | own | - | - | never |
| game/townsfolkDay.js | 33 | `_givers` | let null | own | own | - | - | never |
| game/townsfolkDay.js | 34 | `_giverSrc` | let null | own | own | - | - | never |
| game/townsfolkDay.js | 45 | `_frame` | const object | own | own | - | - | never |
| game/townsfolkDay.js | 48 | `_bumpsTotal` | let number | own | own | - | - | never |
| game/townsfolkWalk.js | 142 | `_loops` | const WeakMap | own | own | - | - | never |
| game/trackedQuest.js | 24 | `_read` | let bool | own | own | flag | - | never |
| game/trackedQuest.js | 25 | `_id` | let null | own | own | - | - | never |
| game/trackedQuest.js | 27 | `_subs` | const Set | own | own | - | - | never |
| game/trapping.js | 362 | `_petVoiceLast` | let null | own | own | - | - | never |
| game/waterAmbience.js | 53 | `st` | const object | own | own | - | - | never |
| game/weaponGem.js | 32 | `_last` | let null | own | own | - | - | never |
| game/weaponGem.js | 33 | `_pending` | let null | own | own | - | - | rejoin |
| game/weaponGem.js | 34 | `_listeners` | const Set | own | own | - | - | never |
| game/wheelBreak.js | 51 | `_dmg` | const Map | own | own | - | - | zone |
| game/wheelBreak.js | 52 | `_broken` | const Map | own | own | - | - | zone |
| game/wheelBreak.js | 53 | `_events` | const array | own | own | - | - | zone |
| game/wheelBreak.js | 54 | `_src` | let null | own | own | - | - | zone |
| game/wheelBreak.js | 55 | `_catKind` | let null | own | own | - | - | never |
| game/wheelBreak.js | 57 | `wheelBreakStats` | const object | own | own | - | - | never |
| game/wheelBreak.js | 63 | `_listeners` | const Set | own | own | - | - | never |
| game/wheelDungeons.js | 103 | `_doors` | let array | own | own | - | - | never |
| game/wheelDungeons.js | 103 | `_doorsOf` | let null | own | own | - | - | never |
| game/wheelDungeons.js | 136 | `_open` | let array | own | own | - | - | never |
| game/wheelDungeons.js | 136 | `_openN` | let number | own | own | - | - | never |
| game/wheelDungeons.js | 136 | `_openOf` | let null | own | own | - | - | never |
| game/wheelMusic.js | 75 | `_m` | const object | own | own | - | - | zone |
| game/wheelNoticeboard.js | 46 | `_board` | let null | own | own | - | - | never |
| game/wheelNoticeboard.js | 46 | `_doors` | let null | own | own | - | - | never |
| game/wheelNoticeboard.js | 46 | `_src` | let null | own | own | - | - | never |
| game/wheelSize.js | 49 | `_long` | let number | own | own | - | rejoin | rejoin |
| game/wheelSize.js | 50 | `_built` | let number | own | own | - | - | zone |
| game/wheelSize.js | 51 | `_told` | let bool | own | own | flag | rejoin | rejoin |
| game/wheelSize.js | 52 | `_listeners` | const array | own | own | - | - | never |
| game/wheelSize.js | 53 | `_waiters` | const array | own | own | - | rejoin | rejoin |
| game/wheelTownDoors.js | 28 | `_doors` | let array | own | own | - | - | never |
| game/wheelTownDoors.js | 28 | `_src` | let null | own | own | - | rejoin | never |
| game/wheelTownDoors.js | 37 | `_hallCapsOn` | let object | own | own | - | rejoin | rejoin |
| game/wheelTrial.js | 45 | `_w` | let null | own | own | - | - | zone |
| game/wheelTrial.js | 46 | `_initP` | let null | own | own | - | - | zone |
| game/wheelTrial.js | 47 | `_info` | let null | own | own | - | - | zone |
| game/wheelTrial.js | 48 | `_grid` | let null | own | own | - | - | zone |
| game/wheelTrial.js | 52 | `_blocks` | const Map | own | own | - | - | zone |
| game/wheelTrial.js | 53 | `_rowsMade` | let null | own | own | - | - | zone |
| game/wheelTrial.js | 54 | `_overview` | let null | own | own | - | - | zone |
| game/wheelTrial.js | 55 | `_overviewLands` | let null | own | own | - | - | zone |
| game/wheelTrial.js | 56 | `_seq` | let number | own | - | no-read | - | never |
| game/wheelTrial.js | 57 | `_pending` | const Map | own | own | - | - | zone |
| game/wheelTrial.js | 58 | `_warm` | const Map | own | own | - | - | zone |
| game/wheelTrial.js | 59 | `_filling` | const Map | own | own | - | - | zone |
| game/wheelTrial.js | 60 | `_here` | let null | own | own | - | - | zone |
| game/wheelTrial.js | 61 | `_hereAsked` | let null | own | own | - | - | zone |
| game/wheelTrial.js | 62 | `_gotFns` | const Set | own | own | - | - | never |
| game/wheelTrial.js | 63 | `_under` | const Map | own | own | - | - | zone |
| game/wheelTrial.js | 65 | `wheelStats` | const object | 3: game/wheelTrial.js, rendering/wheelGround.js, game/worldTrial.js | 2: game/worldTrial.js, game/wheelTrial.js | 2+ | - | never |
| game/wheelTrial.js | 107 | `wheelObjectStats` | const object | rendering/wheelObjects.js | 3: game/worldTrial.js, rendering/wheelObjects.js, game/wheelTrial.js | - | - | never |
| game/wheelTrial.js | 136 | `_stopFns` | const Set | own | own | - | - | never |
| game/wheelTrial.js | 227 | `_waterMoves` | let bool | own | own | flag | - | never |
| game/wheelTrial.js | 234 | `_palette` | let bool | own | own | flag | - | never |
| game/wheelTrial.js | 253 | `_waitOn` | let bool | own | own | flag | - | never |
| game/wheelTrial.js | 259 | `_heapLean` | let bool | own | own | flag | - | never |
| game/wheelTrial.js | 263 | `_said` | let bool | own | own | flag | - | never |
| game/wheelTrial.js | 264 | `_sayWaiters` | let array | own | own | - | - | never |
| game/wheelTrial.js | 274 | `wheelSayStats` | const object | own | own | - | - | never |
| game/wheelTrial.js | 296 | `_failP` | let null | own | own | - | - | zone |
| game/wheelTrial.js | 296 | `_retryAt` | let number | own | own | - | - | zone |
| game/wheelTrial.js | 296 | `_retryWait` | let number | own | own | - | - | zone |
| game/wheelTrial.js | 539 | `_warmGen` | let number | own | own | - | - | never |
| game/wheelTrial.js | 540 | `_fills` | let number | own | - | no-read | - | never |
| game/wheelTrial.js | 719 | `_landsVer` | let number | own | own | - | - | never |
| game/wheelTrial.js | 720 | `_local` | let null | own | own | - | - | zone |
| game/worldTrial.js | 94 | `WHEEL` | let value | own | own | - | - | never |
| game/worldTrial.js | 99 | `_on` | let bool | own | own | flag | - | never |
| game/worldTrial.js | 100 | `_mode` | let null | own | own | - | - | never |
| game/worldTrial.js | 105 | `_spawnOff` | let bool | own | own | - | - | never |
| game/worldTrial.js | 117 | `_wayBack` | let bool | own | own | - | - | never |
| game/worldTrial.js | 120 | `_hudOn` | let bool | own | own | - | - | never |
| game/worldTrial.js | 121 | `_wheelAwayAt` | let number | own | own | - | - | never |
| game/worldTrial.js | 122 | `_ready` | let bool | own | own | flag | - | zone |
| game/worldTrial.js | 128 | `_readyGen` | let number | own | own | - | - | never |
| game/worldTrial.js | 264 | `_arriveAt` | let null | own | own | - | zone | zone |
| game/worldTrial.js | 423 | `_lastSurface` | let null | own | own | - | - | zone |
| game/worldTrial.js | 457 | `_hud` | let null | own | own | - | - | never |
| game/worldTrial.js | 458 | `_hudAt` | let number | own | own | - | - | never |
| game/xpBar.js | 139 | `_listeners` | const Set | own | own | - | - | never |
| game/zoneTransitions.js | 215 | `_zoneLoadEl` | var null | own | own | - | zone | zone |
| game/zoneTransitions.js | 282 | `_townFreeTimer` | var null | own | own | - | - | never |
| networking/broWallet.js | 34 | `state` | const object | own | own | - | - | never |
| networking/broWallet.js | 35 | `listeners` | const Set | own | own | - | - | never |
| networking/broWallet.js | 53 | `_pending` | let null | own | own | - | - | rejoin |
| networking/charRoster.js | 142 | `_lookAsked` | const Set | own | own | - | - | never |
| networking/charRoster.js | 241 | `_mirrorSeeded` | let bool | own | own | flag | - | never |
| networking/gameEvents.js | 52 | `_peerShotGame` | var null | own | own | - | - | never |
| networking/gameEvents.js | 172 | `_collisionNames` | var null | own | own | - | - | never |
| networking/rosterCookie.js | 107 | `_probedHost` | let null | own | own | - | - | never |
| networking/rosterCookie.js | 108 | `_domain` | let null | own | own | - | - | never |
| networking/serverReady.js | 61 | `_state` | let object | own | own | - | - | rejoin |
| networking/serverReady.js | 62 | `_waiters` | let array | own | own | - | rejoin | rejoin |
| networking/serverReady.js | 63 | `_subs` | let array | own | own | - | - | never |
| networking/serverReady.js | 134 | `_veil` | let null | own | own | - | - | rejoin |
| networking/serverReady.js | 135 | `_veilTimer` | let null | own | own | - | - | rejoin |
| networking/serverReady.js | 136 | `_installed` | let bool | own | own | flag | - | never |
| rendering/arenaWorld.js | 64 | `_live` | let null | own | own | - | - | zone |
| rendering/arrowPin.js | 40 | `_frameBytes` | let number | own | own | - | - | never |
| rendering/arrowPin.js | 41 | `_frames` | const Map | own | own | - | - | never |
| rendering/arrowWound.js | 57 | `_renderer` | let null | own | own | - | - | never |
| rendering/batchIdsLean.js | 25 | `_stats` | const object | own | own | - | - | never |
| rendering/bindGroupFix.js | 44 | `_installed` | let bool | own | own | flag | - | never |
| rendering/bindGroupFix.js | 45 | `_swaps` | let number | own | own | - | - | never |
| rendering/blockArm.js | 143 | `_sheets` | const object | own | own | - | - | never |
| rendering/blockArm.js | 144 | `_cache` | const Map | own | own | - | - | never |
| rendering/blockArm.js | 145 | `_sleeveCache` | const Map | own | own | - | - | never |
| rendering/blockArm.js | 189 | `_peerArmCache` | const WeakMap | own | own | - | - | never |
| rendering/bodyBake.js | 45 | `_stats` | const object | own | own | - | - | never |
| rendering/bodyBake.js | 47 | `_dead` | let bool | own | own | flag | - | never |
| rendering/bodyBake.js | 47 | `_seq` | let number | own | - | no-read | - | never |
| rendering/bodyBake.js | 47 | `_started` | let number | own | own | - | - | never |
| rendering/bodyBake.js | 63 | `_pool` | const array | own | own | - | - | never |
| rendering/bodyBake.js | 65 | `_watchT` | let null | own | own | - | - | never |
| rendering/bodyBake.js | 90 | `_watchAt` | let number | own | own | - | - | ? |
| rendering/bodyBake.js | 183 | `_line` | const array | own | own | - | - | never |
| rendering/bodyBakeWorker.js | 83 | `_line` | let call | own | own | - | - | never |
| rendering/bodyRecolor.js | 95 | `_eyeT` | let null | own | own | - | - | never |
| rendering/bodyRecolor.js | 608 | `_garmentLeft` | const object | own | own | - | - | never |
| rendering/bodyRecolor.js | 617 | `_pickWoodKept` | const object | own | own | - | - | never |
| rendering/bodyRecolor.js | 621 | `_toolSolid` | const object | own | own | - | - | never |
| rendering/bodyRecolor.js | 631 | `_bakeTag` | let string | own | own | phase | - | never |
| rendering/buildingFire.js | 718 | `_liveFires` | let null | own | own | - | - | zone |
| rendering/campfireFx.js | 142 | `_atlas` | let null | own | own | - | - | never |
| rendering/campfireFx.js | 168 | `_fireSerial` | let number | own | - | no-read | - | never |
| rendering/canvasWitness.js | 71 | `_w` | const array | own | own | - | - | never |
| rendering/canvasWitness.js | 72 | `_last` | let null | own | own | - | - | never |
| rendering/capeSprites.js | 43 | `_sets` | const Map | own | own | - | - | never |
| rendering/characterPortrait.js | 177 | `_imgCache` | const Map | own | own | - | - | never |
| rendering/characterPortrait.js | 178 | `_metaCache` | const Map | own | own | - | - | never |
| rendering/characterPortrait.js | 179 | `_bodyTopsPromise` | let null | own | own | - | - | never |
| rendering/characterPortrait.js | 429 | `_bodyKeep` | const Map | own | own | - | - | ? |
| rendering/characterPortrait.js | 450 | `_portraitStats` | const object | own | own | - | - | ? |
| rendering/characterPortrait.js | 451 | `_portraitForce` | let null | own | own | phase | - | ? |
| rendering/chestPreload.js | 19 | `_held` | const array | own | - | no-read | - | never |
| rendering/chestPreload.js | 35 | `_p` | let null | own | own | - | - | never |
| rendering/coinPileArt.js | 23 | `TEX` | const Map | own | own | - | - | never |
| rendering/coinPileArt.js | 41 | `_p` | let null | own | own | - | - | never |
| rendering/deathCrumble.js | 88 | `_shake` | let number | own | own | - | - | never |
| rendering/depthSort.js | 137 | `_keys` | const array | own | own | - | - | never |
| rendering/depthSort.js | 139 | `_probe` | const value | own | own | - | - | never |
| rendering/drawLists.js | 18 | `_root` | let null | own | own | - | - | never |
| rendering/dropIcons.js | 32 | `icons` | const Map | own | own | - | - | never |
| rendering/elemWindup.js | 52 | `_cells` | let null | own | own | - | - | never |
| rendering/farmWorld.js | 68 | `_tex` | const Map | own | own | - | - | zone |
| rendering/farmWorld.js | 69 | `_sheets` | const Map | own | own | - | - | zone |
| rendering/farmWorld.js | 70 | `_loadP` | let null | own | own | - | - | zone |
| rendering/farmWorld.js | 71 | `_ready` | let bool | own | own | flag | - | zone |
| rendering/farmWorld.js | 72 | `_gen` | let number | own | own | - | - | never |
| rendering/farmWorld.js | 75 | `farmArtStats` | const object | own | own | - | - | never |
| rendering/farmWorld.js | 201 | `_live` | let null | own | own | - | - | zone |
| rendering/fieldLean.js | 27 | `_stats` | const object | own | own | - | - | never |
| rendering/fieldLean.js | 39 | `_done` | let bool | own | own | flag | - | never |
| rendering/fighterCapture.js | 25 | `_effects` | let null | own | own | - | - | never |
| rendering/fighterCapture.js | 26 | `_entities` | let null | own | own | - | - | never |
| rendering/fighterCapture.js | 213 | `_films` | const Map | own | own | - | - | never |
| rendering/fillBatch.js | 43 | `_on` | let bool | own | own | flag | - | never |
| rendering/fillBatch.js | 44 | `_urlOff` | let bool | own | own | flag | - | never |
| rendering/fillBatch.js | 45 | `_pinned` | let number | own | own | - | - | never |
| rendering/fillBatch.js | 46 | `_built` | let bool | own | own | flag | - | never |
| rendering/fillBatch.js | 64 | `_shader` | let null | own | own | - | - | never |
| rendering/fillBatch.js | 82 | `_maxTex` | let number | own | own | - | - | never |
| rendering/fireGoblinSprites.js | 98 | `walkSheets` | const object | own | own | - | - | zone |
| rendering/fireGoblinSprites.js | 99 | `attackSheets` | const object | own | own | - | - | zone |
| rendering/fireGoblinSprites.js | 100 | `hitSheets` | const object | own | own | - | - | zone |
| rendering/fireGoblinSprites.js | 101 | `deathFrames` | let array | own | own | - | - | zone |
| rendering/fireGoblinSprites.js | 102 | `remnantsTex` | let null | own | own | - | - | zone |
| rendering/fireGoblinSprites.js | 103 | `fireballTex` | let null | own | own | - | - | zone |
| rendering/fireGoblinSprites.js | 104 | `loadPromise` | let null | own | own | - | - | zone |
| rendering/footprintSprites.js | 33 | `FOOTPRINT_ART` | const object | own | own | - | - | never |
| rendering/footprintSprites.js | 60 | `_frames` | const object | own | own | - | - | zone |
| rendering/formShade.js | 96 | `_on` | let bool | own | own | flag | - | never |
| rendering/formShade.js | 102 | `_count` | let number | own | own | - | - | never |
| rendering/formShade.js | 148 | `_figs` | const Set | own | own | - | - | zone |
| rendering/formShade.js | 149 | `_refreshed` | let number | own | own | - | - | never |
| rendering/fxStrips.js | 78 | `PORTAL_BEAM` | const object | own | 2: rendering/fxStrips.js, rendering/systems/tileRenderer.js | - | - | never |
| rendering/fxStrips.js | 113 | `_pending` | const array | own | own | - | - | never |
| rendering/gearCatalog.js | 89 | `_stores` | const object | own | own | - | - | never |
| rendering/gearLookFrame.js | 32 | `_stats` | const object | own | own | - | - | never |
| rendering/gearLookFrame.js | 34 | `_waitFrom` | let number | own | own | - | - | never |
| rendering/gearNumbers.js | 27 | `_sheets` | const Map | own | own | - | - | never |
| rendering/gearNumbers.js | 28 | `_frames` | const Map | own | own | - | - | never |
| rendering/gearNumbers.js | 29 | `_stats` | const object | own | own | - | - | never |
| rendering/gearSheets.js | 95 | `_sheets` | const object | own | own | - | - | never |
| rendering/gearSheets.js | 132 | `_gearRetryOn` | let bool | own | own | flag | - | never |
| rendering/gearSheets.js | 134 | `_gaveUp` | const object | own | own | - | - | never |
| rendering/gearSheets.js | 147 | `_gearRound` | const object | own | own | - | - | never |
| rendering/gearSheets.js | 210 | `_trimStats` | const object | own | own | - | - | never |
| rendering/gearSheets.js | 315 | `_gearLine` | let call | own | own | - | - | never |
| rendering/gearSheets.js | 315 | `_gearPlay` | let null | own | own | - | - | never |
| rendering/gearSheets.js | 315 | `_gearT0` | let number | own | own | - | - | never |
| rendering/gearSheets.js | 406 | `_fxTrimStats` | const array | own | own | - | - | never |
| rendering/gearSheets.js | 407 | `_fxTrimFrames` | const Map | own | own | - | - | never |
| rendering/gearSheets.js | 559 | `_bodyTrimStats` | const object | own | own | - | - | never |
| rendering/gearSheets.js | 560 | `_bodyTrimFrames` | const array | own | own | - | - | never |
| rendering/gearSheets.js | 591 | `_sheetLoads` | const object | own | own | - | - | never |
| rendering/gearSheets.js | 649 | `_shirtOnWay` | const Map | own | own | - | - | never |
| rendering/gearSheets.js | 907 | `_artSeen` | const Map | own | own | - | - | never |
| rendering/gearSheets.js | 908 | `_artTick` | let number | own | - | no-read | - | never |
| rendering/gearSheets.js | 1022 | `_preloadSkip` | let null | own | own | - | - | never |
| rendering/gearSheets.js | 1022 | `_skipDecided` | let null | own | own | - | - | never |
| rendering/gearSheets.js | 1044 | `_extraSources` | const Set | own | own | - | - | never |
| rendering/gearSheets.js | 1063 | `_drawnElsewhere` | let null | own | own | - | - | never |
| rendering/gearSheets.js | 1065 | `_upStats` | const object | own | own | - | - | never |
| rendering/gearWalkFrame.js | 37 | `_stats` | const object | own | own | - | - | never |
| rendering/gearWalkFrame.js | 39 | `_waitFrom` | let number | own | own | - | - | never |
| rendering/gfxLean.js | 47 | `_stats` | const object | own | own | - | - | never |
| rendering/gpuOnly.js | 50 | `_n` | let number | own | own | - | - | never |
| rendering/gpuOnly.js | 51 | `_bytes` | let number | own | own | - | - | never |
| rendering/gpuOnly.js | 52 | `_onceN` | let number | own | own | - | - | never |
| rendering/gpuOnly.js | 53 | `_onceBytes` | let number | own | own | - | - | never |
| rendering/grottoFx.js | 115 | `_live` | const Set | own | own | - | - | zone |
| rendering/grottoFx.js | 488 | `_swayers` | const Set | own | own | - | - | zone |
| rendering/hairClip.js | 53 | `_alpha` | let bool | own | own | flag | - | never |
| rendering/hairClip.js | 55 | `_installed` | let bool | own | own | flag | - | never |
| rendering/hairClip.js | 56 | `_maxTex` | let number | own | own | - | - | never |
| rendering/hairClip.js | 57 | `_stats` | const object | own | own | - | - | never |
| rendering/hairClip.js | 58 | `_boxes` | const Set | own | own | - | - | zone |
| rendering/hairClip.js | 75 | `_shader` | let null | own | own | - | - | never |
| rendering/hairClip.js | 119 | `_alphaShader` | let null | own | own | - | - | never |
| rendering/headFrames.js | 35 | `_hf` | const object | own | own | - | - | never |
| rendering/headFrames.js | 106 | `_oth` | const object | own | own | - | - | never |
| rendering/headFrames.js | 161 | `_box` | let null | own | own | - | - | never |
| rendering/headFrames.js | 161 | `_boxAt` | let number | own | own | - | - | never |
| rendering/headFrames.js | 204 | `_px` | const object | own | own | - | - | never |
| rendering/heapTrim.js | 25 | `_on` | let null | own | own | - | - | never |
| rendering/heldNumbers.js | 58 | `_pending` | const Set | own | own | - | - | never |
| rendering/heldNumbers.js | 59 | `_held` | let number | own | own | - | - | never |
| rendering/heldNumbers.js | 60 | `_heldBytes` | let number | own | own | - | - | never |
| rendering/heldNumbers.js | 61 | `_numberBytes` | let number | own | own | - | - | never |
| rendering/heldNumbers.js | 62 | `_many` | let number | own | own | - | - | never |
| rendering/heldNumbers.js | 63 | `_refills` | let number | own | own | - | - | never |
| rendering/heldNumbers.js | 64 | `_reads` | let number | own | own | - | - | never |
| rendering/heldNumbers.js | 65 | `_readsBy` | const object | own | own | - | - | never |
| rendering/heldNumbers.js | 66 | `_installed` | let bool | own | own | flag | - | never |
| rendering/hemiBust.js | 42 | `_layers` | let null | own | own | - | - | never |
| rendering/hemiBust.js | 43 | `_loading` | let null | own | own | - | - | never |
| rendering/hemiBust.js | 44 | `_choice` | let null | own | own | - | - | never |
| rendering/hemiBust.js | 45 | `_cache` | const Map | own | own | - | - | never |
| rendering/hemiBust.js | 46 | `_stats` | const object | own | own | - | - | never |
| rendering/hemiBust.js | 110 | `_css` | let bool | own | own | flag | - | never |
| rendering/hitMaterialFx.js | 104 | `ART` | const object | own | own | - | - | never |
| rendering/hitMaterialFx.js | 198 | `_atlas` | let null | own | own | - | - | never |
| rendering/hitMaterialFx.js | 263 | `_chipCache` | const Map | own | own | - | - | never |
| rendering/hitMaterialFx.js | 264 | `_softPuff` | let null | own | own | - | - | never |
| rendering/hitMaterialFx.js | 264 | `_softShadow` | let null | own | own | - | - | never |
| rendering/hitMaterialFx.js | 515 | `_propChips` | const Map | own | own | - | - | zone |
| rendering/hotArrowFx.js | 168 | `ART` | const object | own | own | - | - | never |
| rendering/keepAsImage.js | 43 | `_on` | let bool | own | own | flag | - | never |
| rendering/keepAsImage.js | 46 | `_stats` | const object | own | own | - | - | never |
| rendering/landAuras.js | 124 | `_tex` | let null | own | own | - | - | zone |
| rendering/landAuras.js | 125 | `_live` | const Set | own | own | - | - | never |
| rendering/layerUniforms.js | 30 | `_installed` | let bool | own | own | flag | - | never |
| rendering/layerUniforms.js | 31 | `_all` | let bool | own | own | flag | - | never |
| rendering/layerUniforms.js | 32 | `_empty` | let number | own | own | - | - | never |
| rendering/layerUniforms.js | 32 | `_pushed` | let number | own | own | - | - | never |
| rendering/layerUniforms.js | 32 | `_shared` | let number | own | own | - | - | never |
| rendering/levelUpBurstNumbers.js | 48 | `_frames` | const object | own | own | - | - | never |
| rendering/levelUpBurstNumbers.js | 49 | `_opening` | const object | own | own | - | - | never |
| rendering/levelUpBurstNumbers.js | 50 | `_listeners` | const Set | own | own | - | - | never |
| rendering/levelUpBurstNumbers.js | 51 | `_set` | let null | own | own | - | - | never |
| rendering/levelUpBurstNumbers.js | 52 | `_first` | let null | own | own | - | - | never |
| rendering/levelUpBurstNumbers.js | 53 | `_stats` | const object | own | own | - | - | never |
| rendering/levelUpBurstNumbers.js | 141 | `_scratch` | let null | own | own | - | - | never |
| rendering/levelUpBurstNumbers.js | 142 | `_users` | let number | own | own | - | - | never |
| rendering/levelUpBurstPreload.js | 77 | `_stopPortraitWatch` | let null | own | own | - | - | never |
| rendering/levelUpBurstPreload.js | 78 | `_portraitHeld` | let null | own | own | - | - | never |
| rendering/lightfx/casters.js | 121 | `_worldCasts` | let bool | own | own | flag | - | never |
| rendering/lightfx/glint.js | 335 | `_warmFilters` | const array | own | own | - | - | never |
| rendering/lightfx/glint.js | 336 | `_warmStats` | const object | own | own | - | - | never |
| rendering/lightfx/glint.js | 471 | `_sheen` | let null | own | own | - | - | never |
| rendering/lightfx/glint.js | 571 | `_chain` | const array | own | own | - | - | never |
| rendering/lightfx/lightFx.js | 30 | `_on` | let null | own | own | - | - | never |
| rendering/lightfx/shadows.js | 120 | `_lockOn` | let null | own | own | - | - | never |
| rendering/lightfx/shadows.js | 136 | `_prepassOn` | let bool | own | own | flag | - | never |
| rendering/lightfx/shadows.js | 156 | `_noSnapOn` | let bool | own | own | flag | - | never |
| rendering/lightfx/shadows.js | 157 | `_unsnapped` | let number | own | own | - | - | never |
| rendering/lightfx/shadows.js | 271 | `_shadeProgram` | let null | own | own | - | - | never |
| rendering/lightfx/shadows.js | 292 | `_chain` | const array | own | own | - | - | never |
| rendering/lightfx/shadows.js | 356 | `_systems` | const Set | own | own | - | - | never |
| rendering/lightfx/sheenBatch.js | 60 | `_urlOff` | let bool | own | own | flag | - | never |
| rendering/lightfx/sheenBatch.js | 62 | `_passAll` | let bool | own | own | flag | - | never |
| rendering/lightfx/sheenBatch.js | 63 | `_built` | let bool | own | own | flag | - | never |
| rendering/lightfx/sheenBatch.js | 64 | `_packed` | let number | own | own | - | - | never |
| rendering/lightfx/sheenBatch.js | 181 | `_shader` | let null | own | own | - | - | never |
| rendering/lightfx/sheenBatch.js | 288 | `_installed` | let bool | own | own | flag | - | never |
| rendering/lookArmour.js | 48 | `_stats` | const object | own | own | - | - | never |
| rendering/lookArmour.js | 66 | `_layout` | let null | own | own | - | - | never |
| rendering/lookArmour.js | 93 | `_rows` | let number | own | own | - | - | never |
| rendering/lookArmour.js | 93 | `_src` | let null | own | own | - | - | never |
| rendering/lookArmour.js | 94 | `_free` | const array | own | own | - | - | never |
| rendering/lookArmour.js | 95 | `_books` | const Set | own | own | - | - | never |
| rendering/lookArmour.js | 204 | `_mlooks` | const Map | own | own | - | - | never |
| rendering/lookArmour.js | 205 | `_baker` | let null | own | own | - | - | never |
| rendering/lookArmour.js | 253 | `_sweepAt` | let number | own | own | - | - | never |
| rendering/lookArmour.js | 253 | `_sweepTimer` | let null | own | own | - | - | never |
| rendering/lookArmour.js | 274 | `_sent` | const Set | own | own | - | - | never |
| rendering/lookArmour.js | 318 | `_fetchStats` | const object | own | own | - | - | never |
| rendering/lookArmour.js | 322 | `_qaHashes` | let null | own | own | - | - | never |
| rendering/lookFolk.js | 26 | `_stats` | const object | own | own | - | - | never |
| rendering/lookFolk.js | 28 | `_face` | let null | own | own | - | - | never |
| rendering/lookPalette.js | 132 | `_why` | let string | own | own | - | - | never |
| rendering/lookPalette.js | 159 | `_sets` | const Map | own | own | - | - | never |
| rendering/lookPalette.js | 160 | `_sheets` | const object | own | own | - | - | never |
| rendering/lookPalette.js | 161 | `_loading` | let null | own | own | - | - | never |
| rendering/lookPalette.js | 162 | `_settled` | let bool | own | own | flag | - | never |
| rendering/lookPalette.js | 175 | `_ok` | let null | own | own | - | - | never |
| rendering/lookPalette.js | 176 | `_stats` | const object | own | own | - | - | never |
| rendering/lookPalette.js | 178 | `_pages` | const array | own | own | - | - | never |
| rendering/lookPalette.js | 362 | `_dirData` | let null | own | own | - | - | never |
| rendering/lookPalette.js | 362 | `_dirN` | let number | own | own | - | - | never |
| rendering/lookPalette.js | 362 | `_dirSrc` | let null | own | own | - | - | never |
| rendering/lookPalette.js | 584 | `_maskSource` | let null | own | own | - | - | never |
| rendering/lookPalette.js | 626 | `_inPrewarm` | let bool | own | own | flag | - | never |
| rendering/lookPalette.js | 684 | `_looks` | const Map | own | own | - | - | never |
| rendering/lookPalette.js | 693 | `_sweepAt` | let number | own | own | - | - | never |
| rendering/lookPalette.js | 903 | `_kinds` | const Map | own | own | - | - | never |
| rendering/lookPalette.js | 904 | `_built` | let bool | own | own | flag | - | never |
| rendering/lookPalette.js | 1160 | `_shader` | let null | own | own | - | - | never |
| rendering/lookPalette.js | 1181 | `_sheenShader` | let null | own | own | - | - | never |
| rendering/lookPalette.js | 1182 | `_okSheen` | let null | own | own | - | - | never |
| rendering/lookPalette.js | 1318 | `_patched` | let bool | own | own | flag | - | never |
| rendering/lookPalette.js | 1452 | `_prewarmedFor` | let null | own | own | - | - | never |
| rendering/lookSets/gear.js | 52 | `SHEETS` | const object | own | own | - | - | never |
| rendering/lookSets/gearwalk.js | 50 | `SHEETS` | const object | own | own | - | - | never |
| rendering/lookSets/standin.js | 34 | `FRAME` | const object | own | own | - | - | never |
| rendering/lookSets/standinlegs.js | 36 | `GREAVES` | const object | own | own | - | - | never |
| rendering/lookSets/weapons.js | 50 | `SHEETS` | const object | own | own | - | - | never |
| rendering/lookShirtFrame.js | 32 | `_dress` | const Map | own | own | - | - | never |
| rendering/lookShirtFrame.js | 36 | `_hashes` | const Map | own | own | - | - | never |
| rendering/lootIcons.js | 37 | `LOOT_ICONS` | const object | own | 2: rendering/systems/effectsRenderer.js, rendering/lootIcons.js | - | - | never |
| rendering/lootIcons.js | 65 | `_p` | let null | own | own | - | - | never |
| rendering/lootIcons.js | 88 | `_beam` | let null | own | own | - | - | never |
| rendering/maskedBake.js | 31 | `_medB` | const typed array | own | own | - | - | never |
| rendering/maskedBake.js | 31 | `_medG` | const typed array | own | own | - | - | never |
| rendering/maskedBake.js | 31 | `_medR` | const typed array | own | own | - | - | never |
| rendering/maskedBakeWorker.js | 54 | `lookSheets` | const Map | own | own | - | - | never |
| rendering/maskedBakeWorker.js | 69 | `rod` | let null | own | own | - | - | never |
| rendering/maskedBakeWorker.js | 90 | `_tables` | const Map | own | own | - | - | never |
| rendering/maskedBakeWorker.js | 106 | `_bms` | const Map | own | own | - | - | never |
| rendering/maskedBakeWorker.js | 201 | `pending` | const Map | own | own | - | - | never |
| rendering/monsterDeathFx.js | 95 | `_renderer` | let null | own | own | - | - | never |
| rendering/monsterDeathFx.js | 176 | `_covCache` | const Map | own | own | - | - | never |
| rendering/monsterDeathZonesFx.js | 101 | `_live` | const Set | own | own | - | - | zone |
| rendering/monsterDeathZonesFx.js | 102 | `_freed` | let number | own | own | - | - | never |
| rendering/monsterDeathZonesFx.js | 102 | `_made` | let number | own | own | - | - | never |
| rendering/monsterRecolor.js | 86 | `_cache` | const Map | own | own | - | - | zone |
| rendering/monsterShotFx.js | 88 | `_atlas` | let null | own | own | - | - | never |
| rendering/monsterShotFx.js | 89 | `_atlasPromise` | let null | own | own | - | - | never |
| rendering/monsterSilhouette.js | 52 | `_on` | let bool | own | own | flag | - | never |
| rendering/monsterVariantSprites.js | 249 | `_variantLoadKicked` | const Set | own | own | - | - | zone |
| rendering/monsterVariantSprites.js | 254 | `_kicksOn` | let bool | own | own | flag | - | zone |
| rendering/mummySprites.js | 51 | `walkSheets` | const object | own | own | - | - | zone |
| rendering/mummySprites.js | 52 | `transformFrames` | let array | own | own | - | - | zone |
| rendering/mummySprites.js | 53 | `loadPromise` | let null | own | own | - | - | zone |
| rendering/nftAvatars.js | 26 | `cache` | const Map | own | own | - | - | never |
| rendering/nftAvatars.js | 28 | `loading` | const Map | own | own | - | - | never |
| rendering/nodeLabels.js | 78 | `NODE_LABEL_ICONS` | const object | own | own | - | - | never |
| rendering/nodeLabels.js | 80 | `NODE_LABEL_ICONS_GRAY` | const object | own | own | - | - | never |
| rendering/nodeLabels.js | 136 | `_p` | let null | own | own | - | - | never |
| rendering/npcSprites.js | 41 | `_tex` | const object | own | own | - | - | zone |
| rendering/npcSprites.js | 44 | `_done` | let null | own | own | - | - | never |
| rendering/npcSprites.js | 130 | `_walk` | const object | own | own | - | - | zone |
| rendering/npcSprites.js | 133 | `_wheelWalk` | const object | own | own | - | - | zone |
| rendering/npcSprites.js | 166 | `_propAnim` | const object | own | own | - | - | zone |
| rendering/npcSprites.js | 238 | `_town` | let null | own | own | - | - | zone |
| rendering/npcSprites.js | 239 | `_townReady` | let bool | own | own | flag | - | zone |
| rendering/npcSprites.js | 240 | `_townUnload` | let null | own | own | - | - | zone |
| rendering/npcSprites.js | 241 | `_townKeys` | const array | own | own | - | - | zone |
| rendering/npcSprites.js | 242 | `_townCrops` | const array | own | own | - | - | zone |
| rendering/npcSprites.js | 243 | `_townAnimIds` | const array | own | - | no-read | - | zone |
| rendering/npcSprites.js | 394 | `_wheelTex` | const object | own | own | - | - | zone |
| rendering/npcSprites.js | 395 | `_wheelArt` | let null | own | own | - | - | zone |
| rendering/p256.js | 46 | `_stats` | const object | own | own | - | - | never |
| rendering/p256.js | 75 | `_decided` | let null | own | own | - | - | never |
| rendering/p256.js | 194 | `_toPack` | const Set | own | own | - | - | never |
| rendering/p256.js | 195 | `_packed` | const Set | own | own | - | - | never |
| rendering/p256.js | 196 | `_pk` | const object | own | own | - | - | never |
| rendering/p256.js | 248 | `_upInstalled` | let bool | own | own | flag | - | never |
| rendering/p256.js | 271 | `_timer` | let number | own | own | - | - | never |
| rendering/paletteDraw.js | 83 | `_thumbs` | const WeakMap | own | own | - | - | never |
| rendering/paletteLoad.js | 78 | `_idle` | let number | own | own | - | - | never |
| rendering/paletteLoad.js | 78 | `_seq` | let number | own | - | no-read | - | never |
| rendering/paletteLoad.js | 78 | `_w` | let null | own | own | - | - | never |
| rendering/paletteLoad.js | 79 | `_wait` | const Map | own | own | - | - | never |
| rendering/paletteLoad.js | 151 | `stats` | const object | own | own | - | - | never |
| rendering/paletteLoad.js | 152 | `_t0` | let number | own | own | - | - | never |
| rendering/paletteTex.js | 93 | `_renderer` | let null | own | own | - | - | never |
| rendering/paletteTex.js | 94 | `_ok` | let null | own | own | - | - | never |
| rendering/paletteTex.js | 101 | `_stats` | const object | own | own | - | - | never |
| rendering/paletteTex.js | 105 | `_live` | const Set | own | own | - | - | never |
| rendering/paletteTex.js | 115 | `_atlas` | let null | own | own | - | - | never |
| rendering/paletteTex.js | 299 | `_batchShader` | let null | own | own | - | - | never |
| rendering/paletteTex.js | 369 | `_clipBatchShader` | let null | own | own | - | - | never |
| rendering/paletteTex.js | 489 | `_oneWanted` | let null | own | own | - | - | never |
| rendering/paletteTex.js | 490 | `_oneRoute` | let bool | own | own | - | - | never |
| rendering/paletteTex.js | 491 | `_oneOk` | let null | own | own | - | - | never |
| rendering/paletteTex.js | 492 | `_oneStats` | const object | own | own | - | - | never |
| rendering/paletteTex.js | 494 | `_oneR` | let null | own | own | - | - | never |
| rendering/paletteTex.js | 604 | `_oneShader` | let null | own | own | - | - | never |
| rendering/paletteTex.js | 697 | `_patched` | let bool | own | own | flag | - | never |
| rendering/paletteTex.js | 856 | `_meshShader` | let null | own | own | - | - | never |
| rendering/paletteTex.js | 1089 | `_fillBatchShader` | let null | own | own | - | - | never |
| rendering/petSprites.js | 20 | `_tex` | let null | own | own | - | - | never |
| rendering/petSprites.js | 21 | `_loading` | let null | own | own | - | - | never |
| rendering/petSprites.js | 22 | `_frames` | const object | own | own | - | - | never |
| rendering/picsNumbers.js | 52 | `_live` | const Set | own | own | - | - | zone |
| rendering/picsNumbers.js | 53 | `_stats` | const object | own | own | - | - | never |
| rendering/picsNumbers.js | 55 | `_rows` | const Map | own | own | - | - | zone |
| rendering/picsNumbers.js | 156 | `_warm` | let object | own | own | - | - | never |
| rendering/picsOnce.js | 56 | `_stats` | const object | own | own | - | - | never |
| rendering/picsOnce.js | 57 | `_released` | const Set | own | own | - | - | never |
| rendering/picsOnce.js | 58 | `_loading` | const Map | own | own | - | - | never |
| rendering/picsOnce.js | 239 | `_restorers` | const array | own | own | - | - | never |
| rendering/picsOnce.js | 251 | `_installed` | let bool | own | own | flag | - | never |
| rendering/picsOnce.js | 288 | `_timer` | let number | own | own | - | - | never |
| rendering/picsOnce.js | 289 | `_renderer` | let null | own | own | - | - | never |
| rendering/pixiRenderer.js | 68 | `_headFrames` | let null | own | own | - | - | never |
| rendering/pixiRenderer.js | 214 | `_appRef` | let null | own | own | - | - | never |
| rendering/pixiRenderer.js | 219 | `_playerGround` | const object | own | own | - | - | never |
| rendering/pixiRenderer.js | 234 | `_groundKeep` | const object | own | own | - | - | never |
| rendering/pixiRenderer.js | 236 | `_depthProbe` | const object | own | own | - | - | never |
| rendering/pixiRenderer.js | 292 | `_camSnapOff` | let null | own | own | - | - | never |
| rendering/pixiRenderer.js | 303 | `_camProbe` | const object | own | own | - | - | never |
| rendering/playerAnchors.js | 51 | `anchors` | let null | own | own | - | - | never |
| rendering/playerAnchors.js | 52 | `weaponHandles` | let null | own | own | - | - | never |
| rendering/playerAnchors.js | 53 | `loadPromise` | let null | own | own | - | - | never |
| rendering/playerDeathSprites.js | 25 | `state` | const object | own | own | - | - | never |
| rendering/playerSkins.js | 304 | `_bodySheets` | const object | own | own | - | - | never |
| rendering/playerSkins.js | 822 | `_buildSink` | let null | own | own | - | - | never |
| rendering/playerSkins.js | 901 | `_fishFollows` | let bool | own | own | flag | - | never |
| rendering/playerSkins.js | 926 | `_pickupHeadSheets` | const object | own | own | - | - | never |
| rendering/playerSkins.js | 975 | `_headTrimStats` | const object | own | own | - | - | never |
| rendering/playerSkins.js | 976 | `_headTrimFrames` | const object | own | own | - | - | never |
| rendering/playerSkins.js | 1518 | `_artPrewarmT` | let null | own | own | - | - | never |
| rendering/playerSprites.js | 183 | `manifest` | const object | own | own | - | - | never |
| rendering/playerSprites.js | 187 | `loadPromise` | let null | own | own | - | - | never |
| rendering/propGround.js | 64 | `_canvas` | let null | own | own | - | - | never |
| rendering/propGround.js | 65 | `_ctx` | let null | own | own | - | - | never |
| rendering/propGround.js | 66 | `_budgetFrame` | let number | own | own | - | - | never |
| rendering/quietClear.js | 27 | `_installed` | let bool | own | own | flag | - | never |
| rendering/quietClear.js | 28 | `_skipped` | let number | own | own | - | - | never |
| rendering/renderHeal.js | 36 | `_heals` | let number | own | own | - | - | never |
| rendering/rideFx.js | 53 | `_tex` | const object | own | own | - | - | never |
| rendering/rockGolemSprites.js | 48 | `walkFrames` | let array | own | own | - | - | zone |
| rendering/rockGolemSprites.js | 49 | `deathFrames` | let array | own | own | - | - | zone |
| rendering/rockGolemSprites.js | 50 | `loadPromise` | let null | own | own | - | - | zone |
| rendering/rotcapSprites.js | 47 | `walkFrames` | let array | own | own | - | - | zone |
| rendering/rotcapSprites.js | 48 | `deathFrames` | let array | own | own | - | - | zone |
| rendering/rotcapSprites.js | 49 | `loadPromise` | let null | own | own | - | - | zone |
| rendering/sharpPixels.js | 48 | `_enabled` | let bool | own | own | flag | - | never |
| rendering/sharpPixels.js | 51 | `_maxTex` | let number | own | own | - | - | never |
| rendering/sharpPixels.js | 52 | `_routed` | let number | own | own | - | - | never |
| rendering/sharpPixels.js | 53 | `_urlOff` | let bool | own | own | flag | - | never |
| rendering/sharpPixels.js | 100 | `_figRound` | let bool | own | own | flag | - | never |
| rendering/sharpPixels.js | 169 | `_shader` | let null | own | own | - | - | never |
| rendering/sharpPixels.js | 216 | `_figureSpec` | let null | own | own | - | - | never |
| rendering/sharpPixels.js | 232 | `_sheenName` | let null | own | own | - | - | never |
| rendering/shieldSprites.js | 18 | `SHEETS` | const object | own | own | - | - | never |
| rendering/shieldSprites.js | 24 | `loadPromise` | let null | own | own | - | - | never |
| rendering/shieldSprites.js | 32 | `_set` | let null | own | own | - | - | never |
| rendering/skeletonSprites.js | 36 | `runSheets` | const object | own | own | - | - | zone |
| rendering/skeletonSprites.js | 37 | `deathFrames` | let array | own | own | - | - | zone |
| rendering/skeletonSprites.js | 38 | `remnantsTex` | let null | own | own | - | - | zone |
| rendering/skeletonSprites.js | 39 | `loadPromise` | let null | own | own | - | - | zone |
| rendering/slimeSprites.js | 76 | `loadPromise` | let null | own | own | - | - | never |
| rendering/snowmanSprites.js | 42 | `SHEETS` | const object | own | own | - | - | zone |
| rendering/snowmanSprites.js | 49 | `ATTACK_SHEETS` | const object | own | own | - | - | zone |
| rendering/snowmanSprites.js | 53 | `remnantsTex` | let null | own | own | - | - | zone |
| rendering/snowmanSprites.js | 56 | `hitFrames` | let array | own | own | - | - | zone |
| rendering/snowmanSprites.js | 61 | `deathFrames` | let array | own | own | - | - | zone |
| rendering/snowmanSprites.js | 62 | `loadPromise` | let null | own | own | - | - | zone |
| rendering/snowmanSprites.js | 100 | `snowballTex` | let null | own | own | - | - | zone |
| rendering/snowmanSprites.js | 123 | `PHASE_SHEETS` | const object | own | own | - | - | zone |
| rendering/sootMarks.js | 40 | `_tex` | let null | own | own | - | - | never |
| rendering/staffCastFx.js | 112 | `_genRamps` | const Map | own | own | - | - | never |
| rendering/staffCastFx.js | 147 | `_charge` | const object | own | own | - | - | never |
| rendering/staffCastFx.js | 194 | `_gp` | const object | own | own | - | - | never |
| rendering/staffCastFx.js | 212 | `_glowTex` | let null | own | own | - | - | never |
| rendering/staffCastFx.js | 212 | `_sqTex` | let null | own | own | - | - | never |
| rendering/staffCastFx.js | 273 | `_boltOut` | const object | own | own | - | - | never |
| rendering/standInGarb.js | 57 | `_mine` | let null | own | own | - | - | never |
| rendering/standInGarb.js | 57 | `_mineRaw` | let null | own | own | - | - | never |
| rendering/standIns.js | 37 | `_gen` | let number | own | own | - | - | never |
| rendering/standIns.js | 38 | `_make` | let null | own | own | - | - | never |
| rendering/standIns.js | 39 | `_st` | const object | own | own | - | - | never |
| rendering/standIns.js | 109 | `_peerCheck` | let null | own | own | - | - | never |
| rendering/statDemoPreload.js | 44 | `_held` | const array | own | own | - | - | never |
| rendering/statDemoPreload.js | 64 | `_blueBaked` | let null | own | own | - | - | never |
| rendering/statDemoPreload.js | 64 | `_blueBaking` | let null | own | own | - | - | never |
| rendering/statDemoPreload.js | 65 | `_warm` | const Map | own | own | - | - | never |
| rendering/stormEyeSprites.js | 44 | `viewFrames` | let array | own | own | - | - | zone |
| rendering/stormEyeSprites.js | 45 | `deathFrames` | let array | own | own | - | - | zone |
| rendering/stormEyeSprites.js | 46 | `loadPromise` | let null | own | own | - | - | zone |
| rendering/stormSparksFx.js | 48 | `_cells` | let null | own | own | - | - | never |
| rendering/stormSparksFx.js | 97 | `_wanted` | let bool | own | own | flag | - | zone |
| rendering/stripRead.js | 25 | `_dead` | let bool | own | own | flag | - | never |
| rendering/stripRead.js | 25 | `_idle` | let number | own | own | - | - | never |
| rendering/stripRead.js | 25 | `_seq` | let number | own | - | no-read | - | never |
| rendering/stripRead.js | 25 | `_w` | let null | own | own | - | - | never |
| rendering/stripRead.js | 26 | `_wait` | const Map | own | own | - | - | never |
| rendering/stripRead.js | 27 | `_stats` | const object | own | own | - | - | never |
| rendering/stripRead.js | 86 | `_line` | let call | own | own | - | - | never |
| rendering/systems/ambientFx.js | 50 | `_TEX` | let null | own | own | - | - | never |
| rendering/systems/bowFeelFx.js | 31 | `_last` | let null | own | own | - | - | never |
| rendering/systems/bowFeelFx.js | 32 | `_drawn` | let number | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 25 | `_fxPreload` | const array | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 73 | `_combatTrimStats` | const array | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 74 | `_combatTrimFrames` | const Map | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 94 | `_standInTrimStats` | const array | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 95 | `_standInTrimFrames` | const Map | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 568 | `_farmCrownMid` | const Map | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 690 | `_standInLegsUse` | let bool | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 915 | `_fireLogWood` | let number | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1217 | `_capeProbe` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1337 | `_standInTints` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1583 | `POPUP_ICONS` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1671 | `SHARD_ICONS` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1685 | `MAGIC_BOLT_FRAMES` | const array | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1691 | `_trapArt` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1857 | `ARROW_PINE` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1979 | `JET_STREAM` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2096 | `_DEBRIS_DOT_TEX` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2139 | `ARROW_BLAST` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2144 | `_arrowBlastLoad` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2160 | `SNOWBALL_BURST` | const object | own | own | - | - | zone |
| rendering/systems/effectsRenderer.js | 2168 | `_snowballBurstLoad` | let null | own | own | - | - | zone |
| rendering/systems/effectsRenderer.js | 2247 | `_PROP_SLASH_TEX` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2280 | `_SPLINTER_TEX` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2326 | `_HARD_DOT_TEX` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2343 | `_GROUND_DECAL_TEX` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2474 | `NODE_SPRITE_TEX` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2480 | `TREE_TEX` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2492 | `ORE_TEX` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2593 | `ORE_ICON_TIER_TEX` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2642 | `ORE_ICON_TEX` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2720 | `_dmgBmpReady` | let bool | own | own | flag | - | never |
| rendering/systems/effectsRenderer.js | 2805 | `_dmgFontSig` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2862 | `_dmgPagesGone` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2979 | `_chatBubbleGrad` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 3008 | `_bubbleGrads` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 3055 | `_hexMemo` | const Map | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 3116 | `_bakeFrame` | let number | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 3465 | `SMITH_ANVIL` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 23 | `STATUS_TO_ELEMENT` | const Map | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 366 | `SPAWN_WHITE_FILTER` | const new ColorMatrixFilter | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 496 | `_npcDrawn` | const object | own | own | - | - | zone |
| rendering/systems/entityRenderer.js | 498 | `_propsDrawn` | const array | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 504 | `_fgDrawn` | const array | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 511 | `_entityLayerRef` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 512 | `_frontLayerRef` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 533 | `_selfDisplayRef` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 1048 | `_traitCache` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 1062 | `_traitRetryOn` | let bool | own | own | flag | - | never |
| rendering/systems/entityRenderer.js | 1065 | `_looksRetryOn` | let bool | own | own | flag | - | never |
| rendering/systems/entityRenderer.js | 1251 | `_headWatch` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 1330 | `_bodyAnchors` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 1331 | `_bodyTops` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 1332 | `_bodyDataPromise` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 1333 | `_bodyDataRounds` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 1780 | `_folkHatDy256` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 1781 | `_qaHatDy256` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 1868 | `_crownOverride` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2285 | `_lastGearDisplay` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2288 | `_lastPeerWeaponSprite` | let null | own | own | - | - | zone |
| rendering/systems/entityRenderer.js | 2288 | `_lastWeaponSprite` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2374 | `_bodyArtMemo` | const WeakMap | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2984 | `_regionTexCache` | const WeakMap | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3016 | `_bandTexCache` | const WeakMap | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3132 | `_maskedBodyCache` | const Map | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3138 | `_spareSkipped` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3416 | `_bakeSeq` | let number | own | - | no-read | - | never |
| rendering/systems/entityRenderer.js | 3416 | `_bakeWorker` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3416 | `_bakeWorkerDead` | let bool | own | own | flag | - | never |
| rendering/systems/entityRenderer.js | 3416 | `_rodSent` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3425 | `_bakeJobs` | const Map | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3426 | `_bakeWorkerStats` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3521 | `_bakeQueue` | const array | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3522 | `_bakeByKey` | const Map | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3523 | `_bakeBusy` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3524 | `_bakeStartedAt` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3675 | `_lookSheetsHere` | const Map | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3903 | `_localBakeStats` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3909 | `_maskedFails` | const Map | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3931 | `_localMisses` | const array | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3933 | `_localEpoch` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3933 | `_localMissKey` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3983 | `_peerBakeStats` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3984 | `_peerPending` | const Set | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3985 | `_peerQueue` | const array | own | own | - | - | zone |
| rendering/systems/entityRenderer.js | 3986 | `_peerRunning` | let bool | own | own | flag | - | never |
| rendering/systems/entityRenderer.js | 4223 | `prewarmProgress` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 4257 | `_localBakeDir` | let string | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 4375 | `_ownedRpg` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 4418 | `_ownedAt` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 4418 | `_ownedSig` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 4443 | `_uploadedSources` | const WeakSet | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 4507 | `_prewarmRenderer` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 4617 | `_altPrewarmSeq` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 4784 | `_equipPrewarmTimer` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 4785 | `_equipPrewarmRunning` | let bool | own | own | flag | - | never |
| rendering/systems/entityRenderer.js | 4786 | `_equipPrewarmAgain` | let bool | own | own | flag | - | never |
| rendering/systems/entityRenderer.js | 4909 | `_fishTopCache` | const Map | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 4955 | `_FISH_GRIP_TROUSERS` | let call | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 5244 | `_hairMaskCache` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 5402 | `_lastHairDisplay` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 5671 | `_standInHairClip` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 5757 | `_monsterDisplaysRef` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 6044 | `_traitTex` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 6051 | `_mannequinTex` | const object | own | - | no-read | - | never |
| rendering/systems/entityRenderer.js | 6056 | `_traitMeta` | let null | own | - | no-read | - | never |
| rendering/systems/entityRenderer.js | 6057 | `_traitLoadStarted` | let bool | own | own | flag | - | never |
| rendering/systems/entityRenderer.js | 7595 | `_broBadgeTex` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 7609 | `_broBadgeSet` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 7635 | `_smallTexHeld` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 7636 | `_smallSet` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 7671 | `_pinTexHeld` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 7672 | `_pinSet` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 7784 | `_plateWorldScale` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 7795 | `_cueZoom` | let number | own | own | - | - | never |
| rendering/systems/minimapRenderer.js | 162 | `_propMarks` | const array | own | own | - | - | never |
| rendering/systems/minimapRenderer.js | 172 | `_allMarks` | const array | own | own | - | - | never |
| rendering/systems/staffFeelFx.js | 32 | `_st` | const object | own | own | - | - | never |
| rendering/systems/tileRenderer.js | 152 | `_footTex` | let null | own | own | - | - | never |
| rendering/systems/tileRenderer.js | 215 | `_liveTileRenderers` | const Set | own | own | - | - | never |
| rendering/systems/weaponFeelFx.js | 61 | `_drawers` | const array | own | own | - | - | never |
| rendering/systems/weaponFeelFx.js | 356 | `_live` | let null | own | own | - | - | never |
| rendering/textRelease.js | 43 | `_installed` | let bool | own | own | flag | - | never |
| rendering/textRelease.js | 44 | `_stats` | const object | own | own | - | - | never |
| rendering/texturePoolTrim.js | 31 | `_installed` | let bool | own | own | flag | - | never |
| rendering/texturePoolTrim.js | 32 | `_stats` | const object | own | own | - | - | never |
| rendering/tiledMaps.js | 191 | `_residentZoneMaps` | const Set | own | own | - | zone | zone |
| rendering/tiledMaps.js | 299 | `_walkPromise` | let null | own | own | - | - | never |
| rendering/tiledMaps.js | 332 | `_maps` | const object | own | own | - | - | never |
| rendering/tiledMaps.js | 334 | `_images` | const object | own | own | - | - | never |
| rendering/tiledMaps.js | 336 | `_tilesetPromises` | const object | own | own | - | - | never |
| rendering/tiledMaps.js | 338 | `_mapPromises` | const object | own | own | - | - | never |
| rendering/toolRecolor.js | 238 | `_rod` | let null | own | own | - | - | never |
| rendering/traitThumbs.js | 28 | `_warmed` | let bool | own | own | flag | - | never |
| rendering/traitThumbs.js | 29 | `_imgs` | const array | own | - | no-read | - | never |
| rendering/traits/artOps.js | 504 | `_docs` | const object | own | own | - | - | never |
| rendering/traits/buildCatalog.js | 165 | `_height` | let value | own | own | - | - | never |
| rendering/traits/buildCatalog.js | 166 | `_frame` | let value | own | own | - | - | never |
| rendering/traits/buildCatalog.js | 174 | `_listeners` | const Set | own | own | - | - | never |
| rendering/traits/capeCatalog.js | 22 | `_listeners` | const array | own | own | - | - | never |
| rendering/traits/capeCatalog.js | 23 | `_active` | let string | own | own | - | - | never |
| rendering/traits/designCatalog.js | 849 | `_seenId` | const Set | own | own | - | - | never |
| rendering/traits/designCatalog.js | 850 | `_seenName` | const Set | own | own | - | - | never |
| rendering/traits/eyeColorCatalog.js | 56 | `_active` | let string | own | own | - | - | never |
| rendering/traits/eyeColorCatalog.js | 62 | `_listeners` | const Set | own | own | - | - | never |
| rendering/traits/eyeStyleCatalog.js | 175 | `_active` | let string | own | own | - | - | never |
| rendering/traits/eyeStyleCatalog.js | 184 | `_listeners` | const Set | own | own | - | - | never |
| rendering/traits/eyeStyleColorCatalog.js | 99 | `EYE_STYLE_PAINTS` | const object | own | own | - | - | never |
| rendering/traits/eyeStyleColorCatalog.js | 148 | `_cache` | const object | own | own | - | - | never |
| rendering/traits/eyeStyleColorCatalog.js | 208 | `_refCache` | const object | own | own | - | - | never |
| rendering/traits/eyeStyleColorCatalog.js | 238 | `_building` | const object | own | own | - | - | never |
| rendering/traits/eyeStyleColorCatalog.js | 308 | `_probeBakes` | const object | own | own | - | - | never |
| rendering/traits/eyewearCatalog.js | 195 | `_active` | let string | own | own | - | - | never |
| rendering/traits/eyewearCatalog.js | 204 | `_listeners` | const Set | own | own | - | - | never |
| rendering/traits/eyewearColorCatalog.js | 71 | `EYEWEAR_PAINTS` | const object | own | own | - | - | never |
| rendering/traits/eyewearColorCatalog.js | 93 | `EYEWEAR_COLOR_EXCLUDE` | const object | own | own | - | - | never |
| rendering/traits/eyewearColorCatalog.js | 118 | `_active` | let string | own | own | - | - | never |
| rendering/traits/eyewearColorCatalog.js | 124 | `_listeners` | const Set | own | own | - | - | never |
| rendering/traits/eyewearColorCatalog.js | 146 | `OMITS` | const object | own | own | - | - | never |
| rendering/traits/eyewearColorCatalog.js | 153 | `_cache` | const object | own | own | - | - | never |
| rendering/traits/eyewearColorCatalog.js | 184 | `_refCache` | const object | own | own | - | - | never |
| rendering/traits/eyewearColorCatalog.js | 214 | `_building` | const object | own | own | - | - | never |
| rendering/traits/facialHairCatalog.js | 26 | `_active` | let string | own | own | - | - | never |
| rendering/traits/facialHairCatalog.js | 32 | `_listeners` | const Set | own | own | - | - | never |
| rendering/traits/facialHairColorCatalog.js | 37 | `_active` | let string | own | own | - | - | never |
| rendering/traits/facialHairColorCatalog.js | 43 | `_listeners` | const Set | own | own | - | - | never |
| rendering/traits/facialHairColorCatalog.js | 82 | `_cache` | const object | own | own | - | - | never |
| rendering/traits/facialHairColorCatalog.js | 107 | `_building` | const object | own | own | - | - | never |
| rendering/traits/hairCatalog.js | 40 | `_active` | let string | own | own | - | - | never |
| rendering/traits/hairCatalog.js | 50 | `_listeners` | const Set | own | own | - | - | never |
| rendering/traits/hairColorCatalog.js | 72 | `_active` | let string | own | own | - | - | never |
| rendering/traits/hairColorCatalog.js | 78 | `_listeners` | const Set | own | own | - | - | never |
| rendering/traits/hairColorCatalog.js | 118 | `_cache` | const object | own | own | - | - | never |
| rendering/traits/hairColorCatalog.js | 149 | `_building` | const object | own | own | - | - | never |
| rendering/traits/hatColorCatalog.js | 49 | `HAT_COLOR_EXCLUDE` | const object | own | own | - | - | never |
| rendering/traits/hatColorCatalog.js | 75 | `_active` | let string | own | own | - | - | never |
| rendering/traits/hatColorCatalog.js | 81 | `_listeners` | const Set | own | own | - | - | never |
| rendering/traits/hatColorCatalog.js | 127 | `_cache` | const object | own | own | - | - | never |
| rendering/traits/hatColorCatalog.js | 170 | `_refCache` | const object | own | own | - | - | never |
| rendering/traits/hatColorCatalog.js | 199 | `_building` | const object | own | own | - | - | never |
| rendering/traits/headLook.js | 48 | `_maps` | const Map | own | own | - | - | never |
| rendering/traits/headLook.js | 49 | `_stats` | const object | own | own | - | - | never |
| rendering/traits/headLook.js | 51 | `_forceOld` | let bool | own | own | flag | - | never |
| rendering/traits/headwearCatalog.js | 134 | `_active` | let string | own | own | - | - | never |
| rendering/traits/headwearCatalog.js | 144 | `_listeners` | const Set | own | own | - | - | never |
| rendering/traits/patternCatalog.js | 130 | `_BY_ID` | const object | own | own | - | - | never |
| rendering/traits/patternCatalog.js | 179 | `_active` | const object | own | own | - | - | never |
| rendering/traits/patternCatalog.js | 188 | `_listeners` | const Set | own | own | - | - | never |
| rendering/traits/playerArt.js | 209 | `_active` | const object | own | own | - | - | never |
| rendering/traits/playerArt.js | 218 | `_listeners` | const Set | own | own | - | - | never |
| rendering/traits/playerArt.js | 243 | `_slots` | const object | own | own | - | - | never |
| rendering/traits/shirtCatalog.js | 18 | `_active` | let string | own | own | - | - | never |
| rendering/traits/shirtCatalog.js | 24 | `_listeners` | const Set | own | own | - | - | never |
| rendering/traits/shirtColorCatalog.js | 52 | `_active` | let string | own | own | - | - | never |
| rendering/traits/shirtColorCatalog.js | 58 | `_listeners` | const Set | own | own | - | - | never |
| rendering/traits/shirtColorCatalog.js | 97 | `_cache` | const object | own | own | - | - | never |
| rendering/traits/speciesArt.js | 39 | `_art` | const object | own | own | - | - | never |
| rendering/traits/speciesArt.js | 40 | `_artReady` | const object | own | own | - | - | never |
| rendering/traits/speciesArt.js | 41 | `_builds` | const object | own | own | - | - | never |
| rendering/traits/speciesArt.js | 42 | `_canvases` | const object | own | own | - | - | never |
| rendering/traits/speciesArt.js | 43 | `_speciesStats` | const object | own | own | - | - | never |
| rendering/traits/speciesArt.js | 64 | `_retryOn` | let bool | own | own | flag | - | never |
| rendering/traits/speciesArt.js | 193 | `_lastSweep` | let number | own | own | - | - | never |
| rendering/traits/speciesCatalog.js | 81 | `_active` | let string | own | own | - | - | never |
| rendering/traits/speciesCatalog.js | 88 | `_listeners` | const Set | own | own | - | - | never |
| rendering/traits/traitMaterials.js | 183 | `MAIN_MATERIAL` | const object | own | own | - | - | never |
| rendering/warmOnce.js | 22 | `_on` | let bool | own | own | flag | - | never |
| rendering/waterAttackFx.js | 48 | `_cells` | let null | own | own | - | - | never |
| rendering/waterAttackFx.js | 110 | `_wanted` | let bool | own | own | flag | - | zone |
| rendering/waterFrogSprites.js | 73 | `idleSheets` | const object | own | own | - | - | zone |
| rendering/waterFrogSprites.js | 74 | `hopSheets` | const object | own | own | - | - | zone |
| rendering/waterFrogSprites.js | 75 | `attackSheets` | const object | own | own | - | - | zone |
| rendering/waterFrogSprites.js | 76 | `deathFrames` | let array | own | own | - | - | zone |
| rendering/waterFrogSprites.js | 77 | `loadPromise` | let null | own | own | - | - | zone |
| rendering/weaponLookFrame.js | 35 | `_stats` | const object | own | own | - | - | never |
| rendering/weaponLookFrame.js | 37 | `_waitFrom` | let number | own | own | - | - | never |
| rendering/weaponSprites.js | 73 | `SHEETS` | const object | own | own | - | - | never |
| rendering/weaponSprites.js | 173 | `loadPromise` | let null | own | own | - | - | never |
| rendering/weaponSprites.js | 185 | `_set` | let null | own | own | - | - | never |
| rendering/weaponSprites.js | 185 | `_softened` | let bool | own | own | flag | - | never |
| rendering/wheelBuildingIcons.js | 36 | `_canvas` | const object | own | own | - | - | zone |
| rendering/wheelBuildingIcons.js | 37 | `_grey` | const object | own | own | - | - | zone |
| rendering/wheelBuildingIcons.js | 38 | `_tex` | const object | own | own | - | - | zone |
| rendering/wheelBuildingIcons.js | 39 | `_loading` | let null | own | own | - | - | zone |
| rendering/wheelBuildingIcons.js | 40 | `_live` | const Set | own | own | - | - | zone |
| rendering/wheelDoors.js | 93 | `_pics` | const Map | own | own | - | - | zone |
| rendering/wheelDoors.js | 94 | `_picVer` | let number | own | own | - | - | never |
| rendering/wheelDoors.js | 95 | `_liveDoors` | let null | own | own | - | - | never |
| rendering/wheelGround.js | 58 | `_liveGround` | let null | own | own | - | - | zone |
| rendering/wheelLife.js | 73 | `_flagCuts` | const WeakMap | own | own | - | - | zone |
| rendering/wheelLife.js | 74 | `_flags` | const Set | own | own | - | - | zone |
| rendering/wheelLife.js | 75 | `_flagStats` | const object | own | own | - | - | never |
| rendering/wheelLife.js | 130 | `_tex` | let null | own | own | - | - | zone |
| rendering/wheelMonsterArt.js | 85 | `wheelArtStats` | const object | own | 2: game/worldTrial.js, rendering/wheelMonsterArt.js | - | - | never |
| rendering/wheelMonsterArt.js | 98 | `_zone` | let null | own | own | - | - | zone |
| rendering/wheelMonsterArt.js | 99 | `_curZone` | let null | own | own | - | - | never |
| rendering/wheelMonsterArt.js | 100 | `_gen` | let number | own | own | - | - | never |
| rendering/wheelMonsterArt.js | 101 | `_lastTick` | let number | own | own | - | - | never |
| rendering/wheelMonsterArt.js | 102 | `_waitSince` | let number | own | own | - | - | zone |
| rendering/wheelMonsterArt.js | 104 | `_looks` | const Map | own | own | - | - | zone |
| rendering/wheelObjects.js | 109 | `_idx` | let null | own | own | - | - | zone |
| rendering/wheelObjects.js | 227 | `_pw` | let null | own | own | - | - | zone |
| rendering/wheelObjects.js | 227 | `_pwSeq` | let number | own | - | no-read | - | never |
| rendering/wheelObjects.js | 228 | `_pwWait` | const Map | own | own | - | - | zone |
| rendering/wheelObjects.js | 301 | `_basesStats` | const object | own | own | - | - | never |
| rendering/wheelObjects.js | 302 | `_basesWorst` | const array | own | own | - | - | never |
| rendering/wheelObjects.js | 392 | `_pages` | const Map | own | own | - | - | zone |
| rendering/wheelObjects.js | 393 | `_loading` | let number | own | own | - | - | never |
| rendering/wheelObjects.js | 436 | `_pageLog` | const array | own | own | - | - | never |
| rendering/wheelObjects.js | 461 | `_gen` | let number | own | own | - | - | never |
| rendering/wheelObjects.js | 899 | `_live` | let null | own | own | - | - | zone |
| rendering/wheelObjects.js | 941 | `_bottoms` | const WeakMap | own | own | - | - | zone |
| rendering/wheelObjects.js | 943 | `_bottomsLeft` | let number | own | own | - | - | never |
| rendering/wheelObjects.js | 943 | `_castFrame` | let number | own | - | no-read | - | never |
| rendering/wheelShatter.js | 60 | `_puff` | let null | own | own | - | - | zone |
| rendering/wheelSignposts.js | 55 | `_icons` | const object | own | own | - | - | zone |
| rendering/wheelSignposts.js | 56 | `_iconsLoading` | let null | own | own | - | - | zone |
| rendering/wheelSignposts.js | 91 | `_live` | const Set | own | own | - | - | zone |
| rendering/wheelSignposts.js | 114 | `_found` | let object | own | own | - | - | zone |
| rendering/wheelWater.js | 450 | `_webAll` | let bool | own | own | flag | - | never |
| rendering/wheelWater.js | 452 | `_allProgram` | let null | own | own | - | - | never |
| rendering/wheelWater.js | 452 | `_program` | let null | own | own | - | - | never |
| rendering/wheelWater.js | 498 | `_palAllProgram` | let null | own | own | - | - | never |
| rendering/wheelWater.js | 498 | `_palProgram` | let null | own | own | - | - | never |
| rendering/wheelWater.js | 528 | `_uni` | const new UniformGroup | own | own | - | - | never |
| rendering/wheelWater.js | 538 | `_renderer` | let null | own | own | - | - | never |
| rendering/wheelWater.js | 539 | `_ok` | let null | own | own | - | - | never |
| rendering/wheelWater.js | 540 | `_liveOff` | let bool | own | own | flag | - | never |
| rendering/wheelWater.js | 541 | `_held` | let null | own | own | - | - | never |
| rendering/wheelWater.js | 542 | `_live` | let null | own | own | - | - | zone |
| rendering/wheelWater.js | 560 | `_cover` | let bool | own | own | flag | - | never |
| rendering/wheelWater.js | 566 | `_stats` | const object | own | own | - | - | never |
| rendering/wheelWater.js | 609 | `_uniformTex` | const Map | own | own | - | - | never |
| rendering/worldFx.js | 60 | `ZONE_AIR` | const object | own | own | - | - | never |
| rendering/worldFx.js | 116 | `PROP_LIGHTS` | const object | own | 2: rendering/worldFx.js, rendering/worldLife.js | - | - | never |
| rendering/worldFx.js | 204 | `_groundCache` | const object | own | own | - | - | never |
| rendering/worldFxTextures.js | 20 | `_tex` | const object | own | own | - | - | never |
| rendering/worldLife.js | 100 | `FX` | const object | own | own | - | - | never |
| rendering/worldLife.js | 101 | `PART` | const object | own | own | - | - | never |
| rendering/worldLife.js | 102 | `_ready` | let null | own | own | - | - | never |
| rendering/worldLife.js | 279 | `FG_SWAY` | const object | own | own | - | - | never |
| rendering/worldLife.js | 306 | `FALLS` | const object | own | own | - | - | never |
| rendering/worldLife.js | 320 | `SMOKE` | const object | own | own | - | - | never |
| rendering/worldLife.js | 324 | `SPARKS_EXTRA` | const object | own | own | - | - | never |
| rendering/zoneBannerPreload.js | 61 | `_held` | const Map | own | own | - | - | zone |
| rendering/zoneBannerPreload.js | 62 | `_inflight` | const Map | own | own | - | - | zone |
| rendering/zoneBannerPreload.js | 84 | `_want` | const Set | own | own | - | - | zone |
| rendering/zoneBannerPreload.js | 85 | `_failAt` | const Map | own | own | - | - | never |
| rendering/zoneBannerPreload.js | 94 | `_stats` | const object | own | own | - | - | never |
| rendering/zoneBannerPreload.js | 229 | `_near` | const object | own | own | - | - | never |
| rendering/zoneBannerPreload.js | 230 | `_lastTick` | let number | own | own | - | - | never |
| rendering/zoneTextures.js | 57 | `_bundles` | const Map | own | own | - | - | zone |
| rendering/zoneTextures.js | 60 | `_crops` | const Map | own | own | - | - | zone |
| rendering/zoneTextures.js | 63 | `_gen` | const Map | own | own | - | - | never |
| rendering/zoneTextures.js | 178 | `_readStats` | const object | own | own | - | - | never |
| rendering/zoneTextures.js | 261 | `_play` | let null | own | own | - | - | never |
| rendering/zoneTextures.js | 271 | `_line` | let call | own | own | - | - | never |
| rendering/zoneTextures.js | 271 | `_sliceT0` | let number | own | own | - | - | never |
| rendering/zoneTextures.js | 271 | `_waiting` | let number | own | - | no-read | - | never |
| rendering/zoneTextures.js | 272 | `_slices` | const object | own | own | - | - | never |
| rendering/zoneTextures.js | 395 | `_stripStats` | const array | own | own | - | - | never |
| rendering/zoneTextures.js | 398 | `_verify` | const Map | own | own | - | - | never |
| ui/BroTown.jsx | 547 | `BT_AUDIO` | const value | own | own | - | - | never |
| ui/DeviceScreen.js | 20 | `el` | let null | own | own | - | - | never |
| ui/LevelUpBurst.jsx | 654 | `_lastSting` | let number | own | own | - | - | never |
| ui/LingerScreen.js | 19 | `el` | let null | own | own | - | rejoin | rejoin |
| ui/LingerScreen.js | 20 | `timer` | let null | own | own | - | rejoin | rejoin |
| ui/LingerScreen.js | 21 | `nextAt` | let number | own | own | - | - | rejoin |
| ui/OriginScreen.js | 24 | `el` | let null | own | own | - | - | never |
| ui/PlayerIcon.jsx | 37 | `PORTRAIT_CACHE` | const Map | own | own | - | - | never |
| ui/PlayerIcon.jsx | 41 | `PORTRAIT_INFLIGHT` | const Map | own | own | - | - | never |
| ui/RoomFullScreen.js | 35 | `el` | let null | own | own | - | - | rejoin |
| ui/RoomFullScreen.js | 36 | `timer` | let null | own | own | - | - | rejoin |
| ui/RoomFullScreen.js | 37 | `nextAt` | let number | own | own | - | - | rejoin |
| ui/RoomFullScreen.js | 38 | `attempts` | let number | own | own | - | - | rejoin |
| ui/WorldMapOverlay.jsx | 80 | `_pinImgs` | let null | own | own | - | - | never |
| ui/WorldMapOverlay.jsx | 134 | `_openMap` | let null | own | own | - | - | never |
| ui/WorldMapOverlay.jsx | 142 | `_toggleMap` | let null | own | own | - | - | never |
| ui/XpFlyOverlay.jsx | 612 | `_landAB` | let number | own | own | - | - | never |
| ui/XpFlyOverlay.jsx | 612 | `_landT` | let number | own | own | - | - | never |
| ui/afterFrame.js | 26 | `_fns` | const Set | own | own | - | - | never |
| ui/afterFrame.js | 27 | `_ranAt` | let number | own | own | - | - | never |
| ui/deskTeach.js | 35 | `_getS` | let null | own | own | - | - | never |
| ui/deskTeach.js | 35 | `_t` | let object | own | own | - | - | never |
| ui/deskTeach.js | 35 | `_timer` | let null | own | own | - | - | never |
| ui/deskTeach.js | 35 | `_who` | let null | own | own | - | - | never |
| ui/deskTeach.js | 36 | `_edgeEl` | let null | own | own | - | - | zone |
| ui/deskTeach.js | 36 | `_keyEl` | let null | own | own | - | - | zone |
| ui/deskTeach.js | 36 | `_labelEl` | let null | own | own | - | - | zone |
| ui/deskTeach.js | 36 | `_tipsEl` | let null | own | own | - | - | never |
| ui/deskTeach.js | 36 | `_toastEl` | let null | own | own | - | - | never |
| ui/deskTeach.js | 37 | `_rings` | let array | own | own | - | - | zone |
| ui/deskTeach.js | 38 | `_armed` | let null | own | own | - | - | zone |
| ui/deskTeach.js | 39 | `_cursorOn` | let bool | own | own | - | - | never |
| ui/deskTeach.js | 39 | `_encUntil` | let number | own | own | - | - | never |
| ui/deskTeach.js | 39 | `_lastMouse` | let null | own | - | no-read | - | never |
| ui/deskTeach.js | 39 | `_nextEnc` | let number | own | own | - | - | zone |
| ui/deskTeach.js | 39 | `_tipsUntil` | let number | own | own | - | - | never |
| ui/deskTeach.js | 39 | `_toastUntil` | let number | own | own | - | - | never |
| ui/deskTeach.js | 40 | `qa` | const object | own | own | - | - | never |
| ui/guideArrow.js | 52 | `_pace` | let object | own | own | - | - | never |
| ui/guideArrow.js | 327 | `_bob` | let null | own | own | - | - | never |
| ui/guideArrow.js | 327 | `_el` | let null | own | own | - | - | never |
| ui/guideArrow.js | 327 | `_label` | let null | own | own | - | - | never |
| ui/guideArrow.js | 327 | `_side` | let null | own | own | - | - | never |
| ui/guideArrow.js | 327 | `_timer` | let null | own | own | - | - | never |
| ui/guideArrow.js | 328 | `_seen` | const object | own | own | - | - | never |
| ui/guideArrow.js | 329 | `_swapFrom` | let null | own | own | - | - | never |
| ui/guideArrow.js | 330 | `_done` | let object | own | own | - | - | never |
| ui/guideArrow.js | 330 | `_lastTick` | let number | own | own | - | - | never |
| ui/guideArrow.js | 330 | `_who` | let null | own | own | - | - | never |
| ui/guideArrow.js | 331 | `qa` | const object | own | own | - | - | never |
| ui/guideArrow.js | 388 | `_followS` | let null | own | own | - | - | never |
| ui/guideArrow.js | 389 | `_followAt` | let object | own | own | - | - | never |
| ui/guideArrow.js | 404 | `_stopFollow` | let null | own | own | - | - | never |
| ui/lazyPanel.js | 54 | `_loaded` | const array | own | own | - | - | never |
| ui/lazyPanel.js | 55 | `_failed` | const array | own | own | - | - | never |
| ui/lazyPanel.js | 56 | `_named` | const array | own | own | - | - | never |
| ui/lazyPanel.js | 57 | `_cards` | const object | own | own | - | - | never |
| ui/levelUpBursts.js | 55 | `slots` | let array | own | own | - | - | never |
| ui/levelUpBursts.js | 56 | `seq` | let number | own | - | no-read | - | never |
| ui/levelUpBursts.js | 57 | `listeners` | const Set | own | own | - | - | never |
| ui/levelUpBursts.js | 58 | `seen` | const Set | own | own | - | - | never |
| ui/levelUpIcons.js | 15 | `SKILL_ICON` | const object | own | own | - | - | never |
| ui/levelUpIcons.js | 16 | `SKILL_LABEL` | const object | own | own | - | - | never |
| ui/loadingGate.js | 39 | `_worldIn` | let bool | own | own | flag | - | never |
| ui/loadingGate.js | 40 | `_up` | let bool | own | own | - | - | never |
| ui/loadingGate.js | 41 | `_readyAt` | let number | own | own | - | - | never |
| ui/loadingGate.js | 42 | `_timer` | let null | own | own | - | - | never |
| ui/loadingGate.js | 43 | `_waiting` | const array | own | own | - | - | never |
| ui/loadingGate.js | 44 | `qa` | const object | own | own | - | - | never |
| ui/loadingGate.js | 55 | `_introList` | let null | own | own | - | - | never |
| ui/loadingGate.js | 55 | `_veilList` | let null | own | own | - | - | never |
| ui/mapGlyphs.js | 101 | `_paths` | const object | own | own | - | - | never |
| ui/mayorScreen.js | 19 | `_box` | let null | own | own | - | - | never |
| ui/mayorScreen.js | 19 | `_boxAt` | let number | own | own | - | - | never |
| ui/mayorScreen.js | 19 | `_cv` | let null | own | own | - | - | never |
| ui/mayorScreen.js | 19 | `_ro` | let null | own | own | - | - | never |
| ui/mayorScreen.js | 19 | `_wired` | let bool | own | own | flag | - | never |
| ui/mobile/BottomDashboard.jsx | 546 | `_deskOpened` | let bool | own | own | flag | - | never |
| ui/mobile/ChestReveal.jsx | 34 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/ChestReveal.jsx | 35 | `_state` | let object | own | own | - | - | never |
| ui/mobile/ChestReveal.jsx | 84 | `_warm` | const array | own | own | - | - | never |
| ui/mobile/DungeonClearHud.jsx | 58 | `_held` | const array | own | - | no-read | - | never |
| ui/mobile/ItemTooltip.jsx | 28 | `toastQueue` | let array | own | own | - | - | never |
| ui/mobile/ItemTooltip.jsx | 29 | `toastListeners` | let Set | own | own | - | - | never |
| ui/mobile/QuestCoach.jsx | 169 | `_oversize` | let object | own | own | - | - | never |
| ui/mobile/QuestCoach.jsx | 174 | `_cardPressAt` | let null | own | own | - | - | never |
| ui/mobile/aceFlipBus.js | 16 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/actionBus.js | 14 | `_cycleWeapon` | let null | own | own | - | - | never |
| ui/mobile/actionBus.js | 17 | `_selectSlot` | let null | own | own | - | - | never |
| ui/mobile/bandSideways.js | 74 | `_side` | let null | own | own | - | - | never |
| ui/mobile/bandSideways.js | 103 | `_started` | let bool | own | own | flag | - | never |
| ui/mobile/blockRingBus.js | 8 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/blockRingBus.js | 15 | `state` | const object | own | own | - | - | death |
| ui/mobile/blockRingBus.js | 30 | `blockRingBus` | const object | ui/GameApp.jsx | 4: ui/GameApp.jsx, game/shieldToggle.js, ui/mobile/blockRingBus.js, +1 | - | - | death |
| ui/mobile/capeStatusBus.js | 24 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/capeStatusBus.js | 26 | `capeStatusBus` | const object | 2: networking/gameEvents.js, ui/mobile/capeStatusBus.js | 2: ui/mobile/capeStatusBus.js, ui/mobile/WorldChatFeed.jsx | 2+ | - | rejoin |
| ui/mobile/chatBubbleBus.js | 5 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/chatLogBus.js | 24 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/controlsTutorialBus.js | 4 | `_open` | let bool | own | own | flag | - | never |
| ui/mobile/controlsTutorialBus.js | 5 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/dash/BoardRow.jsx | 41 | `FACES` | const Map | own | own | - | - | never |
| ui/mobile/dash/BoardRow.jsx | 53 | `_faceLine` | let call | own | own | - | - | never |
| ui/mobile/dash/BoardRow.jsx | 61 | `_faceT0` | let number | own | own | - | - | never |
| ui/mobile/dash/InventoryPanel.jsx | 304 | `ITEM_NAMES` | const object | own | 8: ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/AceFlipPanel.jsx, ui/panels/ShopkeeperPanel.jsx, +5 | - | - | never |
| ui/mobile/dash/InventoryPanel.jsx | 646 | `_lastBagTab` | let string | own | own | - | - | never |
| ui/mobile/dash/ItemDetailPopup.jsx | 94 | `SMELT_ORE_TO_BAR` | const object | own | own | - | - | never |
| ui/mobile/dash/LeaderboardPanel.jsx | 168 | `lastCat` | let string | own | own | - | - | never |
| ui/mobile/dash/QuestsPanel.jsx | 156 | `lastPick` | let null | own | own | - | - | never |
| ui/mobile/dash/T2Panel.jsx | 37 | `_pendingCat` | let null | own | own | - | - | never |
| ui/mobile/dash/bagFilterBus.js | 23 | `_filter` | let string | own | own | - | - | never |
| ui/mobile/dash/bagFilterBus.js | 24 | `subs` | const Set | own | own | - | - | never |
| ui/mobile/dash/bagFilterBus.js | 26 | `bagFilterBus` | const object | ui/mobile/dash/BagFilterChips.jsx | 3: ui/mobile/dash/BagFilterChips.jsx, ui/mobile/dash/InventoryPanel.jsx, ui/mobile/dash/bagFilterBus.js | - | - | never |
| ui/mobile/dash/bagLife.js | 120 | `stats` | const object | own | own | - | - | never |
| ui/mobile/dash/bagLife.js | 147 | `_timer` | let null | own | own | - | - | never |
| ui/mobile/dash/bagLife.js | 148 | `_users` | let number | own | own | - | - | never |
| ui/mobile/dash/bagModel.js | 33 | `clk` | let number | own | - | no-read | - | never |
| ui/mobile/dash/bagModel.js | 39 | `itemStamp` | const Map | own | own | - | - | never |
| ui/mobile/dash/bagModel.js | 40 | `prevCount` | const Map | own | own | - | - | never |
| ui/mobile/dash/bagModel.js | 41 | `stashStamp` | const WeakMap | own | own | - | - | never |
| ui/mobile/dash/gearTabBus.js | 31 | `state` | const object | own | own | - | - | never |
| ui/mobile/dash/gearTabBus.js | 35 | `subs` | const Set | own | own | - | - | never |
| ui/mobile/dash/inventoryLocks.js | 15 | `locks` | const Map | own | own | - | - | never |
| ui/mobile/dash/inventoryLocks.js | 16 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/dash/itemDetailBus.js | 12 | `state` | const object | own | own | - | - | never |
| ui/mobile/dash/itemDetailBus.js | 13 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/dash/spendConfirmBus.js | 9 | `state` | const object | own | own | - | - | never |
| ui/mobile/dash/spendConfirmBus.js | 10 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/dashMinBus.js | 36 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/dashMinBus.js | 46 | `dashMinBus` | const object | 9: ui/mobile/dash/BandGrip.jsx, ui/mobile/bandSideways.js, ui/mobile/BottomDashboard.jsx, game/deskKeys.js, +5 | 9: ui/mobile/BottomDashboard.jsx, ui/mobile/bandSideways.js, ui/mobile/dash/BandGrip.jsx, +6 | 2+ | - | never |
| ui/mobile/dashboardPanelBus.js | 29 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/dashboardPanelBus.js | 95 | `dashboardPanelBus` | const object | 13: ui/mobile/dash/SettingsPanel.jsx, ui/mobile/BottomDashboard.jsx, game/desktopControls.js, ui/BroTown.jsx, +9 | 25: ui/mobile/BottomDashboard.jsx, ui/BroTown.jsx, ui/mobile/bandSideways.js, +22 | 2+ | - | never |
| ui/mobile/eatBus.js | 5 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/farmBus.js | 15 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/firemakingBus.js | 6 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/gearFlash.js | 75 | `_timer` | let null | own | own | - | - | never |
| ui/mobile/gearFlash.js | 76 | `_lit` | let array | own | own | - | - | never |
| ui/mobile/infoPopupBus.js | 15 | `_open` | let null | own | own | - | - | never |
| ui/mobile/infoPopupBus.js | 16 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/inspectCardBus.js | 5 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/inspectCardBus.js | 8 | `state` | const object | own | own | - | - | never |
| ui/mobile/installHintBus.js | 13 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/inventoryBus.js | 5 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/inventoryBus.js | 22 | `state` | const object | own | own | - | - | never |
| ui/mobile/inventoryBus.js | 52 | `inventoryBus` | const object | own | 6: ui/mobile/ItemTooltip.jsx, ui/mobile/InventorySurface.jsx, ui/GameApp.jsx, +3 | - | - | never |
| ui/mobile/mockItems.js | 17 | `seq` | let number | own | - | no-read | - | never |
| ui/mobile/modalGuardBus.js | 28 | `_depth` | let number | own | own | - | - | never |
| ui/mobile/modalGuardBus.js | 29 | `_listeners` | const array | own | own | - | - | never |
| ui/mobile/modalGuardBus.js | 35 | `_muted` | let bool | own | own | - | - | never |
| ui/mobile/notifBus.js | 30 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/notifBus.js | 33 | `notifBus` | const object | own | 3: ui/mobile/WorldChatFeed.jsx, ui/mobile/notifBus.js, ui/mobile/dash/NotificationsPanel.jsx | - | - | never |
| ui/mobile/placeName.js | 18 | `_lastLand` | let null | own | own | - | - | zone |
| ui/mobile/playViewport.js | 55 | `_ro` | let null | own | own | - | - | never |
| ui/mobile/playViewport.js | 55 | `_roEl` | let null | own | own | - | - | never |
| ui/mobile/playViewport.js | 55 | `_sh` | let number | own | own | - | - | never |
| ui/mobile/playViewport.js | 55 | `_sw` | let number | own | own | - | - | never |
| ui/mobile/playViewport.js | 55 | `_vh` | let number | own | own | - | - | never |
| ui/mobile/playViewport.js | 55 | `_vw` | let number | own | own | - | - | never |
| ui/mobile/playViewport.js | 55 | `_wired` | let bool | own | own | flag | - | never |
| ui/mobile/playViewport.js | 56 | `_sizes` | const object | own | own | - | - | never |
| ui/mobile/sheet/BroCard.jsx | 97 | `_pick` | let null | own | own | - | - | never |
| ui/mobile/sheet/HeroExpanded.jsx | 144 | `_lastSection` | let string | own | own | - | - | never |
| ui/mobile/sheet/HeroExpanded.jsx | 145 | `_lastFam` | let null | own | own | - | - | never |
| ui/mobile/sheet/StatCaption.jsx | 36 | `_ctx` | let null | own | own | - | - | never |
| ui/mobile/sheet/StatDemo.jsx | 662 | `_kicks` | const object | own | own | - | - | never |
| ui/mobile/sheet/bagUnseenModel.js | 14 | `UNSEEN` | const Set | own | own | - | - | never |
| ui/mobile/sheet/bagUnseenModel.js | 15 | `epoch` | let number | own | own | - | - | never |
| ui/mobile/sheet/bagUnseenModel.js | 16 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/sheet/bagUnseenModel.js | 19 | `bagUnseen` | const object | ui/mobile/BottomDashboard.jsx | 2: ui/mobile/BottomDashboard.jsx, ui/mobile/sheet/bagUnseenModel.js | - | - | never |
| ui/mobile/sheet/friendPortraits.js | 14 | `cache` | const object | own | own | - | - | never |
| ui/mobile/sheet/friendsModel.js | 44 | `liveAt` | const object | own | own | - | - | never |
| ui/mobile/sheet/friendsSync.js | 14 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/sheet/friendsSync.js | 25 | `doc` | let null | own | own | - | - | rejoin |
| ui/mobile/sheet/friendsSync.js | 26 | `openThread` | let null | own | own | - | - | never |
| ui/mobile/sheet/friendsSync.js | 27 | `lastError` | let null | own | own | - | - | never |
| ui/mobile/sheet/heroSectionBus.js | 18 | `_pending` | let null | own | own | - | - | never |
| ui/mobile/sheet/heroSectionBus.js | 19 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/sheet/heroSectionBus.js | 21 | `heroSectionBus` | const object | ui/mobile/sheet/HeroExpanded.jsx | 2: ui/mobile/sheet/heroSectionBus.js, ui/mobile/sheet/HeroExpanded.jsx | - | - | never |
| ui/mobile/sheet/motion.js | 9 | `_mq` | let null | own | own | - | - | never |
| ui/mobile/sheet/portraitStore.js | 8 | `url` | let string | own | own | - | - | never |
| ui/mobile/sheet/portraitStore.js | 9 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/sheet/portraitStore.js | 11 | `portraitStore` | const object | ui/mobile/BottomDashboard.jsx | 5: ui/panels/TradeWindowPanel.jsx, rendering/levelUpBurstPreload.js, ui/mobile/sheet/portraitStore.js, +2 | - | - | never |
| ui/mobile/sheet/questDetailBus.js | 5 | `id` | let null | own | own | - | - | never |
| ui/mobile/sheet/skillDetailBus.js | 14 | `key` | let null | own | own | - | - | never |
| ui/mobile/sheet/skillDetailBus.js | 17 | `openEpoch` | let number | own | own | - | - | never |
| ui/mobile/sheet/skillDetailBus.js | 18 | `consumedEpoch` | let number | own | own | - | - | never |
| ui/mobile/sheet/skillDetailBus.js | 19 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/sheet/slimePins.js | 40 | `_fd` | let null | own | own | - | - | never |
| ui/mobile/sheet/slimePins.js | 41 | `_loading` | let null | own | own | - | - | never |
| ui/mobile/sheet/slimePins.js | 42 | `_sets` | const Map | own | own | - | - | never |
| ui/mobile/shopBus.js | 16 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/storeChatBus.js | 17 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/storeToastBus.js | 23 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/storeToastBus.js | 24 | `items` | let array | own | own | - | - | never |
| ui/mobile/storeToastBus.js | 25 | `seq` | let number | own | own | - | - | never |
| ui/mobile/storeToastBus.js | 29 | `storeToastBus` | const object | 4: networking/gameEvents.js, game/dailyRewards.js, ui/mobile/QuestStepNudge.jsx, ui/mobile/storeToastBus.js | 2: ui/mobile/StoreToast.jsx, ui/mobile/storeToastBus.js | 2+ | - | never |
| ui/mobile/tradeBagBus.js | 25 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/uiBusyBus.js | 35 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/uiBusyBus.js | 37 | `uiBusyBus` | const object | 2: ui/BroTown.jsx, ui/mobile/uiBusyBus.js | 3: ui/mobile/ElementBurstButton.jsx, ui/mobile/WorldChatFeed.jsx, ui/mobile/uiBusyBus.js | 2+ | - | never |
| ui/mobile/wheelBus.js | 4 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/wheelBus.js | 6 | `state` | const object | own | own | - | - | never |
| ui/onboardingPace.js | 52 | `_skipped` | let null | own | own | - | - | never |
| ui/onboardingPace.js | 86 | `_worldInAt` | let number | own | own | - | - | never |
| ui/onboardingPace.js | 87 | `_coachUp` | let bool | own | own | flag | - | never |
| ui/onboardingPace.js | 88 | `_coachEndAt` | let number | own | own | - | - | never |
| ui/onboardingPace.js | 89 | `_welcomeEndAt` | let number | own | own | - | - | never |
| ui/onboardingPace.js | 103 | `_welcomePending` | let bool | own | own | flag | - | never |
| ui/onboardingPace.js | 152 | `_firstStepsOpen` | let bool | own | own | flag | - | never |
| ui/onboardingPace.js | 163 | `_inTutorial` | let null | own | own | - | - | never |
| ui/panels/AchievementBanner.jsx | 45 | `_icons` | const Map | own | own | - | - | never |
| ui/panels/TradeWindowPanel.jsx | 228 | `_tradeSide` | let none | own | own | phase | - | never |
| ui/panels/WeaponPill.jsx | 62 | `_qaTapMs` | let none | own | own | - | - | never |
| ui/panels/WeaponPill.jsx | 131 | `qa` | const object | own | own | - | - | never |
| ui/panels/buildings/TownBoard.jsx | 75 | `THUMB_FIT` | const Map | own | own | - | - | never |
| ui/panels/controlSkin.jsx | 306 | `WEAPON_KEYS` | var object | own | own | - | - | never |
| ui/panels/paintTools.js | 37 | `_ink` | let number | own | own | - | - | never |
| ui/panels/paintTools.js | 40 | `_brush` | let number | own | own | - | - | never |
| ui/panels/paintTools.js | 42 | `_listeners` | const Set | own | own | - | - | never |
| ui/petPortrait.jsx | 13 | `_img` | let null | own | own | - | - | never |
| ui/petPortrait.jsx | 14 | `_imgReady` | let null | own | own | - | - | never |
| ui/reveal/revealBus.js | 13 | `_queue` | const array | own | own | - | - | never |
| ui/reveal/revealBus.js | 14 | `_notify` | let null | own | own | - | - | never |
| ui/reveal/revealBus.js | 16 | `revealBus` | const object | 2: game/revealBag.js, networking/wsClient.js | 2: ui/reveal/RevealOverlay.jsx, ui/reveal/revealBus.js | 2+ | - | never |
| ui/starCue.js | 28 | `lastKey` | let null | own | own | - | - | never |
| ui/starCue.js | 29 | `live` | let null | own | own | - | - | never |
| ui/starCue.js | 30 | `qa` | const object | own | own | - | - | never |
| ui/swallowTapClick.js | 61 | `_armed` | let null | own | own | - | - | never |
| ui/swallowTapClick.js | 62 | `_off` | let null | own | own | - | - | never |
| ui/swallowTapClick.js | 63 | `_bound` | let bool | own | own | flag | - | never |
| ui/swallowTapClick.js | 64 | `_qa` | const object | own | own | - | - | never |
| ui/uiSfxDelegate.js | 102 | `installed` | let bool | own | own | flag | - | never |
| ui/wheelMiniSize.js | 41 | `_at` | let number | own | own | - | - | never |
| ui/wheelMiniSize.js | 41 | `_k` | let number | own | own | - | - | never |
| ui/worldMapDetail.js | 39 | `_tiles` | const Map | own | own | - | - | never |
| ui/worldMapDetail.js | 40 | `_loading` | let number | own | own | - | - | never |
| ui/worldMapDetail.js | 41 | `_gen` | let number | own | own | - | - | never |
| ui/worldMapDetail.js | 42 | `_frame` | let number | own | own | - | - | never |
| ui/worldMapDetail.js | 43 | `_stats` | const object | own | own | - | - | never |
| ui/xpLanding.js | 58 | `_state` | const object | own | own | - | - | never |
| ui/xpLanding.js | 64 | `_cards` | const object | own | own | - | - | never |
| ui/zoneBannerOverlay.js | 75 | `_el` | let null | own | own | - | - | never |
| ui/zoneBannerOverlay.js | 76 | `_timers` | let array | own | own | - | - | never |
| ui/zoneBannerOverlay.js | 77 | `_playing` | let null | own | own | - | - | zone |
| ui/zoneBannerOverlay.js | 78 | `_lastShown` | const Map | own | own | - | - | never |
| ui/zoneBannerOverlay.js | 90 | `_beatLog` | const array | own | own | - | - | never |
| ui/zoneBannerOverlay.js | 336 | `_lastZone` | let none | own | own | - | - | zone |
| ui/zoneBannerOverlay.js | 413 | `_wl` | const object | own | own | - | - | zone |

### `let` and `var` never changed after they are made

Rows by the rule, constants in fact (209): nothing reassigns them and nothing changes what they hold.
should reset: `never`, by machine.

- data/abilities.js: `BLOCKS`
- data/gameSystems.js: `ARMOR_FREE_TIERS` `ARMOR_DEF_REQ_PER_TIER` `GATHER_PLAN_MAX` `DAMAGE_CHANNEL_FLAT` `DAMAGE_CHANNEL_PCT` `T2_UNITS` `T2_BENCH` `T2_BENCH_CANONICAL` `_T2_WPN_FLAT_KEYS` `_dmgDerive` `_critDerive` `_critDmgDerive` `QUALITY_MULTS` `QUALITY_MULTS_LEGACY` `WEAPON_TIER_EXP`
- data/oneFormula.js: `ONE_FORMULA`
- game/arrowEdge.js: `ARROW_EDGE_PX`
- game/blockedAsks.js: `BLOCKED_SOCIAL` `BLOCKED_ROWS` `NOT_BLOCKED`
- game/bowDraw.js: `BOW_FEEL`
- game/bowFeel.js: `BOW_FEEL_KEY`
- game/chat.js: `CHAT_TEXT_MAX` `CHAT_NAME_MAX`
- game/chatMute.js: `MUTE_KEY` `MIGRATED_KEY` `MIGRATE_MAX`
- game/combatHelpers.js: `PROP_HIT_SHARE` `BOW_SPECIAL_QUEUE_MS` `BUILD_LABELS` `BUILD_ICONS` `PEER_DMG_MIN_SPACING_MS` `PEER_DMG_MAX_HOLD_MS` `PEER_DMG_QUEUE_CAP` `MAX_LIVE_POPUPS` `POPUP_NO_STAMP_Y` `HERO_POPUP_CLEAR` `HERO_POPUP_NO_BAND` `OFFLINE_NOTE` `ELSEWHERE_NOTE` `DAZE_NOTE` `FROZEN_NOTE` `STAGGER_NOTE` `PROP_BLADE_H`
- game/dodge.js: `triggerContextualDodge` `resolveDodgeContext` `doStandardDodge` `doLunge` `doRetreatShot`
- game/interactions.js: `POSE_SHIFT_PX`
- game/lifeSkillRewards.js: `LOCKED_TRIES` `LOCKED_END_MS` `LOCKED_TRY` `GATHER_DEATH_HOLD_MS` `COOK_XP`
- game/manualCombat.js: `MANUAL`
- game/pointsBubbles.js: `POINTS_FLY_SKILLS`
- game/projectiles.js: `ARROW_SPEED_PX` `SPECIAL_HIT_R_MULT` `SPECIAL_HIT_R_CAP_PX` `PVP_BODY_R` `LAND_CORE` `LAND_TURN_BOLT` `LAND_TURN_ARROW` `LAND_MAX_MS`
- game/pvpSwing.js: `PVP_SWING`
- game/questFly.js: `FLY_Z` `QUEST_FLY_TARGETS`
- game/tooFar.js: `TOO_FAR_WORD` `TOO_FAR_WORD_DESK` `TOO_FAR_COLOR` `TOO_FAR_GAP_MS` `MAX_KEYS`
- game/townChatter.js: `IDLE_REACH` `IDLE_GAP_MS` `IDLE_TIMER_MIN_MS` `IDLE_TIMER_MAX_MS` `OLD_TIMER_MIN_MS` `OLD_TIMER_SPAN_MS`
- game/visualSystems.js: `PRINT_GAP` `PRINT_MAX` `PEER_PRINT_MAX`
- game/weaponFeel.js: `SWORD_FEEL_KEY`
- game/zoneTransitions.js: `PORTAL_EDGE_INSET` `HUB_EXIT_DEAF_MS` `PLAYER_HS`
- networking/gameEvents.js: `PARTY_INVITE_TTL_MS` `PVP_SRV_HIT_MS` `_FACING8`
- ui/BroTown.jsx: `QUEST_MSG_MS` `QUEST_MSG_LONG_MS` `QUEST_MSG_WELCOME_MS` `MANA_SURGE_TICK_MS` `MANA_SURGE_FPS` `BT_API_BASE` `BLOCK_COSTS_STAMINA` `NODE_REACH_PAD` `IDLE_LOGOUT_MS` `NODE_ART` `NPC_PROX_CLEAR` `NPC_PROX_OPEN` `NPC_TAP_REACH` `NPC_PROX_OPENS` `BroTown`
- ui/panels/AceFlipPanel.jsx: `LS` `FRAMES` `FRAME_H` `FRAME_W` `STEP_MS` `COIN_SCALE` `COIN_W` `COIN_H` `TOSS_SFX` `TOSS_OPTS`
- ui/panels/ClanPanel.jsx: `LS_CARD` `LS_HEADER` `LS_DIVIDER` `LS_PRIMARY` `LS_SECONDARY` `LS_INPUT` `lsChip` `LS_CHIPHIT` `lsIcon` `lsTitleRow`
- ui/panels/DungeonCreatorPanel.jsx: `LS_CARD` `LS_HEADER` `LS_WELL` `LS_ROW` `LS_CHIP` `lsIcon`
- ui/panels/EncyclopediaPanel.jsx: `LS_CARD` `LS_HEADER` `LS_WELL` `LS_DIVIDER` `lsChip` `lsIcon`
- ui/panels/FeedbackPanel.jsx: `LS_CARD` `LS_HEADER` `LS_WELL` `LS_DIVIDER` `lsChip` `lsIcon`
- ui/panels/InspectPlayerPanel.jsx: `PVP_OPEN`
- ui/panels/NameModal.jsx: `_INK_SOURCES` `_CARD_FOCUS`
- ui/panels/PartyHUD.jsx: `LEAVE_ARM_MS` `_btnBase`
- ui/panels/PetHousePanel.jsx: `LS_CARD` `LS_HEADER` `LS_WELL` `LS_DIVIDER` `lsIcon`
- ui/panels/QuestPanel.jsx: `QUEST_CLAIMED_MS`
- ui/panels/SkillsPanel.jsx: `LS_CARD` `LS_HEADER` `LS_WELL` `LS_DIVIDER` `LS_SECTION` `lsIcon` `lsXpBar` `lsSkillRow` `lsEmpty`
- ui/panels/buildings/AlliancePart.jsx: `LS` `LS_MOD` `WELL` `INPUT` `BTN` `SMALL`
- ui/panels/buildings/BankPanel.jsx: `LS` `LS_WRAP` `LS_BODY` `LS_MOD`
- ui/panels/buildings/EnchantPanel.jsx: `LS` `LS_WRAP` `LS_BODY` `LS_DISBTN` `LS_MOD`
- ui/panels/buildings/FarmPanel.jsx: `LS` `LS_WRAP` `LS_BODY` `LS_MOD`
- ui/panels/buildings/GamblePanel.jsx: `LS` `LS_WRAP` `LS_BODY` `LS_MOD` `LS_DIV`
- ui/panels/buildings/GemWorksPanel.jsx: `LS` `LS_WRAP` `TABS_BAR` `TABS` `TABS_CRACK`
- ui/panels/buildings/GemcutPanel.jsx: `LS` `LS_WRAP` `LS_BODY` `LS_MOD`
- ui/panels/buildings/LandOfficePanel.jsx: `LS` `LS_WRAP` `BTN`
- ui/panels/buildings/VendorPanel.jsx: `LS` `LS_WRAP` `LS_BODY` `LS_MOD`
- ui/panels/buildings/WheelHallPanel.jsx: `LS` `LS_WRAP` `LS_BODY` `LS_MOD`
- ui/panels/controlSkin.jsx: `WEAPON_ART`
- ui/panels/questArt.jsx: `h`

## Suggested to reset where nothing writes it today

Rows whose suggestion names an edge at which the code does not write them today (a `death` suggestion is
met by a write at a zone change, since a respawn changes the zone). A list to look at, not a list of
faults: a timestamp that runs out by itself needs no reset, and some are cleared by a road the machine
does not call an edge (a dungeon's end, a window closing).

| name | system or file | suggested | written at (today) |
|---|---|---|---|
| `S._accState` | game/accuracy.js | rejoin | - |
| `S._achv` | game/achievements.js | rejoin | - |
| `S._bank` | game/bank.js | rejoin | - |
| `S._bankPending` | game/bank.js | rejoin | - |
| `S._bf` | game/bowFeel.js | zone | - |
| `S._serverMuteNames` | game/chatMute.js | rejoin | - |
| `S._serverMutes` | game/chatMute.js | rejoin | - |
| `S._climb` | game/climbActions.js | zone | - |
| `S._climbDrop` | game/climbActions.js | zone | - |
| `S._nearChest` | game/climbActions.js | zone | - |
| `S._riseChestAsk` | game/climbActions.js | rejoin | - |
| `S._riseCross` | game/climbActions.js | zone | - |
| `S._arrowSnaps` | game/combatHelpers.js | zone | - |
| `S._dmgFromMonster` | game/combatHelpers.js | zone | - |
| `S._peerDmgLastRel` | game/combatHelpers.js | zone | - |
| `S._peerDmgQueue` | game/combatHelpers.js | zone | - |
| `S._propMarks` | game/combatHelpers.js | zone | - |
| `S.groundSplatter` | game/combatHelpers.js | zone | - |
| `S._dailyRewards` | game/dailyRewards.js | rejoin | - |
| `S._dodgeRoll` | game/dodge.js | zone | - |
| `S._dlCredits` | game/dropLines.js | zone | - |
| `S._dropLines` | game/dropLines.js | zone | - |
| `S._dungeonClear` | game/dungeonClear.js | zone | - |
| `S._customDungeonConfig` | game/dungeonWaves.js | zone+rejoin | zone, death |
| `S._dungeonComplete` | game/dungeonWaves.js | zone+rejoin | zone, death |
| `S._inCustomDungeon` | game/dungeonWaves.js | zone+rejoin | zone, death |
| `S._inDungeon` | game/dungeonWaves.js | zone+rejoin | zone, death |
| `S._burnUntil` | game/elemHits.js | zone | - |
| `S._chillUntil` | game/elemHits.js | zone | - |
| `S._dazeUntil` | game/elemHits.js | zone | - |
| `S._fractureStacks` | game/elemHits.js | zone | - |
| `S._fractureUntil` | game/elemHits.js | zone | - |
| `S._frozenUntil` | game/elemHits.js | zone | - |
| `S._gust` | game/elemHits.js | zone | - |
| `S._poisonUntil` | game/elemHits.js | zone | - |
| `S._shockFrom` | game/elemHits.js | zone | - |
| `S._shockUntil` | game/elemHits.js | zone | - |
| `S._slowUntil` | game/elemHits.js | zone | - |
| `S._soakUntil` | game/elemHits.js | zone | - |
| `S._staggerUntil` | game/elemHits.js | zone | - |
| `S._stuckUntil` | game/elemHits.js | zone | - |
| `S._thornUntil` | game/elemHits.js | zone | - |
| `S._wobbleFrom` | game/elemHits.js | zone | - |
| `S._wobbleUntil` | game/elemHits.js | zone | - |
| `S._nearBed` | game/farmWalk.js | zone | - |
| `S._fishBoard` | game/fishWeigh.js | rejoin | - |
| `S._shotEnds` | game/hitSounds.js | zone | - |
| `S._pose` | game/interactions.js | zone+rejoin | rejoin |
| `S._jump` | game/jump.js | zone | - |
| `S._jumpOver` | game/jump.js | zone | - |
| `S._killXpWait` | game/killXp.js | zone | - |
| `S._codex` | game/monsterCodex.js | rejoin | - |
| `S._cursedUntil` | game/monsterCombat.js | death | - |
| `S._playerStunUntil` | game/monsterCombat.js | death | - |
| `S._nmlAsked` | game/nmlAsk.js | zone | - |
| `S._nmlLevel` | game/noMansLand.js | zone | - |
| `S._nmlLocks` | game/noMansLand.js | rejoin | - |
| `S._nmlSelf` | game/noMansLand.js | rejoin | - |
| `S._iceAttack` | game/playerActions.js | zone | - |
| `S._shieldStamina` | game/playerActions.js | death | - |
| `S._specialAttack` | game/playerActions.js | zone | - |
| `S.shieldActive` | game/playerActions.js | death | - |
| `S._pointsResetAskedAt` | game/pointsReset.js | rejoin | - |
| `S._shotImpacts` | game/projectiles.js | zone | - |
| `S.dmgNumbers` | game/projectiles.js | zone | - |
| `S._race` | game/race.js | zone+rejoin | - |
| `S._raceLil` | game/race.js | zone+rejoin | - |
| `S.campfires` | game/renderFrame.js | zone | - |
| `S.projectiles` | game/renderFrame.js | zone | - |
| `S._restAsked` | game/rest.js | rejoin | - |
| `S._ride` | game/ride.js | zone+rejoin | rejoin |
| `S._shieldAutoReleased` | game/shieldToggle.js | death | - |
| `S._sparkArcs` | game/shockSpark.js | zone | - |
| `S._sootQueue` | game/slimeBlast.js | zone | - |
| `S._smithing` | game/smithing.js | zone | - |
| `S._spar` | game/spar.js | zone+rejoin | - |
| `S._nmlFoes` | game/sparTargets.js | zone | - |
| `S._sprint` | game/sprint.js | zone | - |
| `S._stf` | game/staffFeel.js | death | - |
| `S._sf` | game/swordFeel.js | death | - |
| `S._engaged` | game/targeting.js | zone | - |
| `S._engagedGapAt` | game/targeting.js | zone | - |
| `S._engagedId` | game/targeting.js | zone | - |
| `S._t2Leave` | game/tradeSlot.js | rejoin | - |
| `S._petBook` | game/trapping.js | rejoin | - |
| `S._trap` | game/trapping.js | zone+rejoin | - |
| `S._trapTries` | game/trapping.js | zone+rejoin | - |
| `S._peerPrintLast` | game/visualSystems.js | zone | - |
| `S._printLast` | game/visualSystems.js | zone | - |
| `S.footprints` | game/visualSystems.js | zone | - |
| `S.peerFootprints` | game/visualSystems.js | zone | - |
| `S._feelFx` | game/weaponFeel.js | zone | - |
| `S._dungeonBack` | game/wheelDungeons.js | zone+rejoin | zone, death |
| `S._wheelSwim` | game/wheelSwim.js | zone | - |
| `S._diveAir` | game/zoneMechanics.js | zone | - |
| `S._diveStarted` | game/zoneMechanics.js | zone | - |
| `S._echoActive` | game/zoneMechanics.js | zone | - |
| `S._swimming` | game/zoneMechanics.js | zone | - |
| `S._tideLevel` | game/zoneMechanics.js | zone | - |
| `S._townArtHold` | game/zoneTransitions.js | zone | - |
| `S._activeClanWar` | networking/gameEvents.js | rejoin | - |
| `S._arenaStakeBoard` | networking/gameEvents.js | rejoin | - |
| `S._fireTrail` | networking/gameEvents.js | zone | - |
| `S._impactRings` | networking/gameEvents.js | zone | - |
| `S._jackpotPool` | networking/gameEvents.js | rejoin | - |
| `S._jackpotTickets` | networking/gameEvents.js | rejoin | - |
| `S._pvpSkullType` | networking/gameEvents.js | rejoin | - |
| `S._pvpSkullUntil` | networking/gameEvents.js | rejoin | - |
| `S._serverDungeon` | networking/gameEvents.js | zone+rejoin | zone, death |
| `S._stunEnd` | networking/gameEvents.js | death | - |
| `S._telegraphZones` | networking/gameEvents.js | zone | - |
| `S._threatMarks` | networking/gameEvents.js | rejoin | - |
| `S._wheelDungeonOpening` | networking/gameEvents.js | zone | - |
| `S._hpBuff` | networking/wsClient.js | rejoin | - |
| `S._manaBuff` | networking/wsClient.js | rejoin | - |
| `S._manaFlat` | networking/wsClient.js | rejoin | - |
| `S._regenBuff` | networking/wsClient.js | rejoin | - |
| `S._resistBuff` | networking/wsClient.js | rejoin | - |
| `S._spdBuff` | networking/wsClient.js | rejoin | - |
| `S._xpBuff` | networking/wsClient.js | rejoin | - |
| `S._xpBuffMul` | networking/wsClient.js | rejoin | - |
| `S._stormZaps` | rendering/stormSparksFx.js | zone | - |
| `S._bowGripX` | rendering/systems/effectsRenderer.js | zone | - |
| `S._bowGripY` | rendering/systems/effectsRenderer.js | zone | - |
| `S._catchFlights` | rendering/systems/effectsRenderer.js | zone | - |
| `S._dazeGritAt` | rendering/systems/effectsRenderer.js | death | - |
| `S._dodgeTrail` | rendering/systems/effectsRenderer.js | zone | - |
| `S._dustPuffs` | rendering/systems/effectsRenderer.js | zone | - |
| `S._farmHands` | rendering/systems/effectsRenderer.js | zone | - |
| `S._frozenChipAt` | rendering/systems/effectsRenderer.js | death | - |
| `S._gustDustAt` | rendering/systems/effectsRenderer.js | death | - |
| `S._particles` | rendering/systems/effectsRenderer.js | zone | - |
| `S._whirlCatch` | rendering/systems/effectsRenderer.js | zone | - |
| `S._respawnInvuln` | rendering/systems/entityRenderer.js | death | - |
| `S._staffTipAt` | rendering/systems/entityRenderer.js | zone | - |
| `S._staffTipX` | rendering/systems/entityRenderer.js | zone | - |
| `S._staffTipY` | rendering/systems/entityRenderer.js | zone | - |
| `S._waterBlows` | rendering/waterAttackFx.js | zone | - |
| `S._bloodBursts` | rendering/worldFx.js | zone | - |
| `S._aimAngle` | ui/BroTown.jsx | zone | - |
| `S._aimSrc` | ui/BroTown.jsx | zone | - |
| `S._aiming` | ui/BroTown.jsx | zone | - |
| `S._arenaInvolved` | ui/BroTown.jsx | rejoin | - |
| `S._arenaMatch` | ui/BroTown.jsx | rejoin | - |
| `S._arenaTournamentId` | ui/BroTown.jsx | rejoin | - |
| `S._atkPending` | ui/BroTown.jsx | zone | - |
| `S._bleedUntil` | ui/BroTown.jsx | death | - |
| `S._deskPressLock` | ui/BroTown.jsx | zone | - |
| `S._dmgBuff` | ui/BroTown.jsx | rejoin | - |
| `S._dmgBuffMul` | ui/BroTown.jsx | rejoin | - |
| `S._kaConfirmed` | ui/BroTown.jsx | rejoin | - |
| `S._lastBroadcastBa` | ui/BroTown.jsx | rejoin | - |
| `S._lastBroadcastBlocking` | ui/BroTown.jsx | rejoin | - |
| `S._lastBroadcastDead` | ui/BroTown.jsx | rejoin | - |
| `S._lastBroadcastEx` | ui/BroTown.jsx | rejoin | - |
| `S._lastBroadcastFacing` | ui/BroTown.jsx | rejoin | - |
| `S._lastBroadcastGear` | ui/BroTown.jsx | rejoin | - |
| `S._lastBroadcastX` | ui/BroTown.jsx | rejoin | - |
| `S._lastBroadcastY` | ui/BroTown.jsx | rejoin | - |
| `S._lastBroadcastZone` | ui/BroTown.jsx | rejoin | - |
| `S._lastGatherNodeId` | ui/BroTown.jsx | zone | - |
| `S._lastStatsUpdateSig` | ui/BroTown.jsx | rejoin | - |
| `S._mouseWorldX` | ui/BroTown.jsx | zone | - |
| `S._mouseWorldY` | ui/BroTown.jsx | zone | - |
| `S._nearHouse` | ui/BroTown.jsx | zone | - |
| `S._nearNode` | ui/BroTown.jsx | zone | - |
| `S._nearNpc` | ui/BroTown.jsx | zone | - |
| `S._nearPetHouse` | ui/BroTown.jsx | zone | - |
| `S._nearWheelBuilding` | ui/BroTown.jsx | zone | - |
| `S._nearWheelDoor` | ui/BroTown.jsx | zone | - |
| `S._nearWorkshop` | ui/BroTown.jsx | zone | - |
| `S._npcProxLatch` | ui/BroTown.jsx | zone | - |
| `S._petFetch` | ui/BroTown.jsx | zone | - |
| `S._petX` | ui/BroTown.jsx | zone | - |
| `S._petY` | ui/BroTown.jsx | zone | - |
| `S._playerCount` | ui/BroTown.jsx | rejoin | - |
| `S._proxNode` | ui/BroTown.jsx | zone | - |
| `S._shieldAngle` | ui/BroTown.jsx | death | - |
| `S._shieldCdUntil` | ui/BroTown.jsx | death | - |
| `S._sled` | ui/BroTown.jsx | zone | - |
| `S._sleeping` | ui/BroTown.jsx | zone | - |
| `S._slideVx` | ui/BroTown.jsx | zone | death |
| `S._slideVy` | ui/BroTown.jsx | zone | death |
| `S._snowballs` | ui/BroTown.jsx | zone | - |
| `S._snowmen` | ui/BroTown.jsx | zone | - |
| `S._spdBuffMul` | ui/BroTown.jsx | rejoin | - |
| `S._torch` | ui/BroTown.jsx | zone | - |
| `S._wellRestedUntil` | ui/BroTown.jsx | death | - |
| `S.autoAttack` | ui/BroTown.jsx | zone | - |
| `S.collectibles` | ui/BroTown.jsx | zone | - |
| `S.destroyedTrees` | ui/BroTown.jsx | zone | - |
| `S.fishTimer` | ui/BroTown.jsx | zone | - |
| `S.nearBuilding` | ui/BroTown.jsx | zone | - |
| `S.trail` | ui/BroTown.jsx | zone | - |
| `S._teachNode` | ui/deskTeach.js | zone | - |
| `S._pendingClanInvite` | ui/panels/ClanInviteCard.jsx | rejoin | - |
| `S._clanData` | ui/panels/ClanPanel.jsx | rejoin | - |
| `S._customDungeonTerrain` | ui/panels/DungeonCreatorPanel.jsx | zone | - |
| `S._preDungeonMap` | ui/panels/DungeonCreatorPanel.jsx | zone | - |
| `S._preDungeonMonsters` | ui/panels/DungeonCreatorPanel.jsx | zone | - |
| `S._preDungeonNodes` | ui/panels/DungeonCreatorPanel.jsx | zone | - |
| `_blockerHook` | data/worldProps.js:848 | zone | - |
| `_held` | game/buildingRooms.js:43 | zone | - |
| `_kept` | game/chatMute.js:157 | rejoin | - |
| `_state` | game/dailyRewards.js:26 | rejoin | - |
| `_live` | game/dungeonArt.js:54 | zone | - |
| `st` | game/fishWeigh.js:16 | rejoin | - |
| `_st` | game/loginSpinWheel.js:66 | rejoin | - |
| `_ask` | game/nmlAsk.js:139 | zone | - |
| `_note` | game/noMansLand.js:193 | zone | - |
| `_pending` | game/questHandIn.js:26 | rejoin | - |
| `_then` | game/revealBag.js:77 | rejoin | - |
| `_pending` | game/shardCrack.js:34 | rejoin | - |
| `_pending` | game/shieldGem.js:43 | rejoin | - |
| `_pending` | game/weaponGem.js:33 | rejoin | - |
| `_dmg` | game/wheelBreak.js:51 | zone | - |
| `_broken` | game/wheelBreak.js:52 | zone | - |
| `_events` | game/wheelBreak.js:53 | zone | - |
| `_src` | game/wheelBreak.js:54 | zone | - |
| `_m` | game/wheelMusic.js:75 | zone | - |
| `_built` | game/wheelSize.js:50 | zone | - |
| `_w` | game/wheelTrial.js:45 | zone | - |
| `_initP` | game/wheelTrial.js:46 | zone | - |
| `_info` | game/wheelTrial.js:47 | zone | - |
| `_grid` | game/wheelTrial.js:48 | zone | - |
| `_blocks` | game/wheelTrial.js:52 | zone | - |
| `_rowsMade` | game/wheelTrial.js:53 | zone | - |
| `_overview` | game/wheelTrial.js:54 | zone | - |
| `_overviewLands` | game/wheelTrial.js:55 | zone | - |
| `_pending` | game/wheelTrial.js:57 | zone | - |
| `_warm` | game/wheelTrial.js:58 | zone | - |
| `_filling` | game/wheelTrial.js:59 | zone | - |
| `_here` | game/wheelTrial.js:60 | zone | - |
| `_hereAsked` | game/wheelTrial.js:61 | zone | - |
| `_under` | game/wheelTrial.js:63 | zone | - |
| `_failP` | game/wheelTrial.js:296 | zone | - |
| `_retryAt` | game/wheelTrial.js:296 | zone | - |
| `_retryWait` | game/wheelTrial.js:296 | zone | - |
| `_local` | game/wheelTrial.js:720 | zone | - |
| `_ready` | game/worldTrial.js:122 | zone | - |
| `_lastSurface` | game/worldTrial.js:423 | zone | - |
| `_pending` | networking/broWallet.js:53 | rejoin | - |
| `_state` | networking/serverReady.js:61 | rejoin | - |
| `_veil` | networking/serverReady.js:134 | rejoin | - |
| `_veilTimer` | networking/serverReady.js:135 | rejoin | - |
| `_live` | rendering/arenaWorld.js:64 | zone | - |
| `_liveFires` | rendering/buildingFire.js:718 | zone | - |
| `_tex` | rendering/farmWorld.js:68 | zone | - |
| `_sheets` | rendering/farmWorld.js:69 | zone | - |
| `_loadP` | rendering/farmWorld.js:70 | zone | - |
| `_ready` | rendering/farmWorld.js:71 | zone | - |
| `_live` | rendering/farmWorld.js:201 | zone | - |
| `walkSheets` | rendering/fireGoblinSprites.js:98 | zone | - |
| `attackSheets` | rendering/fireGoblinSprites.js:99 | zone | - |
| `hitSheets` | rendering/fireGoblinSprites.js:100 | zone | - |
| `deathFrames` | rendering/fireGoblinSprites.js:101 | zone | - |
| `remnantsTex` | rendering/fireGoblinSprites.js:102 | zone | - |
| `fireballTex` | rendering/fireGoblinSprites.js:103 | zone | - |
| `loadPromise` | rendering/fireGoblinSprites.js:104 | zone | - |
| `_frames` | rendering/footprintSprites.js:60 | zone | - |
| `_figs` | rendering/formShade.js:148 | zone | - |
| `_live` | rendering/grottoFx.js:115 | zone | - |
| `_swayers` | rendering/grottoFx.js:488 | zone | - |
| `_boxes` | rendering/hairClip.js:58 | zone | - |
| `_propChips` | rendering/hitMaterialFx.js:515 | zone | - |
| `_tex` | rendering/landAuras.js:124 | zone | - |
| `_live` | rendering/monsterDeathZonesFx.js:101 | zone | - |
| `_cache` | rendering/monsterRecolor.js:86 | zone | - |
| `_variantLoadKicked` | rendering/monsterVariantSprites.js:249 | zone | - |
| `_kicksOn` | rendering/monsterVariantSprites.js:254 | zone | - |
| `walkSheets` | rendering/mummySprites.js:51 | zone | - |
| `transformFrames` | rendering/mummySprites.js:52 | zone | - |
| `loadPromise` | rendering/mummySprites.js:53 | zone | - |
| `_tex` | rendering/npcSprites.js:41 | zone | - |
| `_walk` | rendering/npcSprites.js:130 | zone | - |
| `_wheelWalk` | rendering/npcSprites.js:133 | zone | - |
| `_propAnim` | rendering/npcSprites.js:166 | zone | - |
| `_town` | rendering/npcSprites.js:238 | zone | - |
| `_townReady` | rendering/npcSprites.js:239 | zone | - |
| `_townUnload` | rendering/npcSprites.js:240 | zone | - |
| `_townKeys` | rendering/npcSprites.js:241 | zone | - |
| `_townCrops` | rendering/npcSprites.js:242 | zone | - |
| `_townAnimIds` | rendering/npcSprites.js:243 | zone | - |
| `_wheelTex` | rendering/npcSprites.js:394 | zone | - |
| `_wheelArt` | rendering/npcSprites.js:395 | zone | - |
| `_live` | rendering/picsNumbers.js:52 | zone | - |
| `_rows` | rendering/picsNumbers.js:55 | zone | - |
| `walkFrames` | rendering/rockGolemSprites.js:48 | zone | - |
| `deathFrames` | rendering/rockGolemSprites.js:49 | zone | - |
| `loadPromise` | rendering/rockGolemSprites.js:50 | zone | - |
| `walkFrames` | rendering/rotcapSprites.js:47 | zone | - |
| `deathFrames` | rendering/rotcapSprites.js:48 | zone | - |
| `loadPromise` | rendering/rotcapSprites.js:49 | zone | - |
| `runSheets` | rendering/skeletonSprites.js:36 | zone | - |
| `deathFrames` | rendering/skeletonSprites.js:37 | zone | - |
| `remnantsTex` | rendering/skeletonSprites.js:38 | zone | - |
| `loadPromise` | rendering/skeletonSprites.js:39 | zone | - |
| `SHEETS` | rendering/snowmanSprites.js:42 | zone | - |
| `ATTACK_SHEETS` | rendering/snowmanSprites.js:49 | zone | - |
| `remnantsTex` | rendering/snowmanSprites.js:53 | zone | - |
| `hitFrames` | rendering/snowmanSprites.js:56 | zone | - |
| `deathFrames` | rendering/snowmanSprites.js:61 | zone | - |
| `loadPromise` | rendering/snowmanSprites.js:62 | zone | - |
| `snowballTex` | rendering/snowmanSprites.js:100 | zone | - |
| `PHASE_SHEETS` | rendering/snowmanSprites.js:123 | zone | - |
| `viewFrames` | rendering/stormEyeSprites.js:44 | zone | - |
| `deathFrames` | rendering/stormEyeSprites.js:45 | zone | - |
| `loadPromise` | rendering/stormEyeSprites.js:46 | zone | - |
| `_wanted` | rendering/stormSparksFx.js:97 | zone | - |
| `SNOWBALL_BURST` | rendering/systems/effectsRenderer.js:2160 | zone | - |
| `_snowballBurstLoad` | rendering/systems/effectsRenderer.js:2168 | zone | - |
| `_npcDrawn` | rendering/systems/entityRenderer.js:496 | zone | - |
| `_lastPeerWeaponSprite` | rendering/systems/entityRenderer.js:2288 | zone | - |
| `_peerQueue` | rendering/systems/entityRenderer.js:3985 | zone | - |
| `_wanted` | rendering/waterAttackFx.js:110 | zone | - |
| `idleSheets` | rendering/waterFrogSprites.js:73 | zone | - |
| `hopSheets` | rendering/waterFrogSprites.js:74 | zone | - |
| `attackSheets` | rendering/waterFrogSprites.js:75 | zone | - |
| `deathFrames` | rendering/waterFrogSprites.js:76 | zone | - |
| `loadPromise` | rendering/waterFrogSprites.js:77 | zone | - |
| `_canvas` | rendering/wheelBuildingIcons.js:36 | zone | - |
| `_grey` | rendering/wheelBuildingIcons.js:37 | zone | - |
| `_tex` | rendering/wheelBuildingIcons.js:38 | zone | - |
| `_loading` | rendering/wheelBuildingIcons.js:39 | zone | - |
| `_live` | rendering/wheelBuildingIcons.js:40 | zone | - |
| `_pics` | rendering/wheelDoors.js:93 | zone | - |
| `_liveGround` | rendering/wheelGround.js:58 | zone | - |
| `_flagCuts` | rendering/wheelLife.js:73 | zone | - |
| `_flags` | rendering/wheelLife.js:74 | zone | - |
| `_tex` | rendering/wheelLife.js:130 | zone | - |
| `_zone` | rendering/wheelMonsterArt.js:98 | zone | - |
| `_waitSince` | rendering/wheelMonsterArt.js:102 | zone | - |
| `_looks` | rendering/wheelMonsterArt.js:104 | zone | - |
| `_idx` | rendering/wheelObjects.js:109 | zone | - |
| `_pw` | rendering/wheelObjects.js:227 | zone | - |
| `_pwWait` | rendering/wheelObjects.js:228 | zone | - |
| `_pages` | rendering/wheelObjects.js:392 | zone | - |
| `_live` | rendering/wheelObjects.js:899 | zone | - |
| `_bottoms` | rendering/wheelObjects.js:941 | zone | - |
| `_puff` | rendering/wheelShatter.js:60 | zone | - |
| `_icons` | rendering/wheelSignposts.js:55 | zone | - |
| `_iconsLoading` | rendering/wheelSignposts.js:56 | zone | - |
| `_live` | rendering/wheelSignposts.js:91 | zone | - |
| `_found` | rendering/wheelSignposts.js:114 | zone | - |
| `_live` | rendering/wheelWater.js:542 | zone | - |
| `_held` | rendering/zoneBannerPreload.js:61 | zone | - |
| `_inflight` | rendering/zoneBannerPreload.js:62 | zone | - |
| `_want` | rendering/zoneBannerPreload.js:84 | zone | - |
| `_bundles` | rendering/zoneTextures.js:57 | zone | - |
| `_crops` | rendering/zoneTextures.js:60 | zone | - |
| `nextAt` | ui/LingerScreen.js:21 | rejoin | - |
| `el` | ui/RoomFullScreen.js:35 | rejoin | - |
| `timer` | ui/RoomFullScreen.js:36 | rejoin | - |
| `nextAt` | ui/RoomFullScreen.js:37 | rejoin | - |
| `attempts` | ui/RoomFullScreen.js:38 | rejoin | - |
| `_edgeEl` | ui/deskTeach.js:36 | zone | - |
| `_keyEl` | ui/deskTeach.js:36 | zone | - |
| `_labelEl` | ui/deskTeach.js:36 | zone | - |
| `_rings` | ui/deskTeach.js:37 | zone | - |
| `_armed` | ui/deskTeach.js:38 | zone | - |
| `_nextEnc` | ui/deskTeach.js:39 | zone | - |
| `state` | ui/mobile/blockRingBus.js:15 | death | - |
| `blockRingBus` | ui/mobile/blockRingBus.js:30 | death | - |
| `capeStatusBus` | ui/mobile/capeStatusBus.js:26 | rejoin | - |
| `_lastLand` | ui/mobile/placeName.js:18 | zone | - |
| `doc` | ui/mobile/sheet/friendsSync.js:25 | rejoin | - |
| `_playing` | ui/zoneBannerOverlay.js:77 | zone | - |
| `_lastZone` | ui/zoneBannerOverlay.js:336 | zone | - |
| `_wl` | ui/zoneBannerOverlay.js:413 | zone | - |

## What the machine cannot follow

- **The state handed whole to something it cannot resolve** (92 places). Most are a renderer's
  `x.update(S, ...)`, and the method on the other side takes it as a parameter spelt `S`, so the name rule
  still reads it. By kind:
  - a call not followed: 82 (26: rendering/pixiRenderer.js, rendering/systems/effectsRenderer.js, debug/DebugOverlay.jsx, game/manualCombat.js, +22)
  - put in an object: 9 (3: ui/panels/buildings/SmithyPanel.jsx, ui/panels/buildings/WoodworkPanel.jsx, ui/BroTown.jsx)
  - put in an array: 1 (ui/panels/TradeWindowPanel.jsx)
- **`S[key]` with a key made at run time** (10 places, 1 of them a write): debug/DebugOverlay.jsx:146, debug/debugBus.js:161, debug/debugBus.js:172, debug/debugBus.js:173, ui/ElemStatusChips.jsx:52, ui/ElemStatusChips.jsx:53, ui/ElemStatusChips.jsx:54, ui/panels/SocialPanel.jsx:137, ui/panels/SocialPanel.jsx:246, ui/panels/SocialPanel.jsx:303.
- **A write inside a field after its object went somewhere unfollowed**: an object put in a list, kept on
  another object, or handed to a method of a class the machine cannot name (`this._fx.update(m)`).
- **Anything outside `src/`**: the QA harness reads and writes `window._gameState` from `tools/qa/`; a field
  marked `no-read (tests)` is one it names.
- **State that is not a row by the rule**: values kept on `window.*`, in React `useState`/`useRef`, on class
  instances and on the things inside a field (a monster's own `_spawnFxAt`: `game/monsterCarry.js` keeps
  that list).

## The counts

The plan's part 2 quoted a reviewer's numbers. These replace them; each says how it was counted.

| what | the plan said | counted | how |
|---|---|---|---|
| fields of `S` | about 610 | **647** | distinct top-level names touched through the state or an alias of it |
| ... born in the first object | "most created on the fly" | 59 | keys of `useRef({...})` in `ui/BroTown.jsx`; the other 588 are made on the fly or never set |
| ... written from two or more files | 146 | **166** | set or changed inside, rooted at the state; 153 counting sets alone, 180 counting writes through a name for the inside too |
| ... that nothing under `src/` reads | not counted | 81 | no read but its own writes; 29 of them are named under `tools/` or `server/test/` |
| ... that nothing sets | not counted | 25 | read, or changed inside, and never made |
| ... marked a phase | not counted | 7 | two or more words set or compared (or one, with a phase's name); 55 more are flags, only ever set to true or false |
| writes to `S` from `src/rendering/` | 89 | **114** | places: 92 sets and 22 changes inside, over 74 fields; 604 more through a name for the inside |
| top-of-file variables that hold state | about 850 | **1502** | 960 `let`/`var` (209 of them never changed) and 542 changed `const` containers; 1293 when the never-changed are left out |
| ... written from two or more files | not counted | 9 | through an import |
| ... marked a phase | not counted | 4 | as for a field; 110 more are flags |

Variables by folder: data 73, debug 54, game 282, lib 0, networking 18, rendering 710, ui 365, the top of `src/` 0.

Should reset (suggested, not confirmed):

| suggestion | fields | variables |
|---|---|---|
| never | 365 | 1276 (209 of them by machine: never changed) |
| zone | 171 | 154 |
| death | 23 | 2 |
| rejoin | 69 | 50 |
| zone+rejoin | 19 | 0 |
| ? | 0 | 20 |

Rows not yet read (`?`): 20. Suggestions whose row is gone: 0. Suggested to reset where nothing writes it today: 369.

Edges read off the code: 11 blocks call `changeZone()`, 4 set `S._dying = true`, 1 `case 'state_sync'`. The flow settled in 16 rounds over 2 passes.

**Totals: 647 fields and 1502 top-of-file variables, 2149 rows, from 886 files.**
