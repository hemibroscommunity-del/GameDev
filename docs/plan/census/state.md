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

How the machine reads that rule (it reads all 1099 `.js` and `.jsx` files under `src/` as syntax trees, so a
name in a comment or a string is never counted):

- **The state** is `<ref>.current`, where `<ref>` is any name or property spelt `stateRef` or `_gameState`
  (`props.stateRef`, `ctx.stateRef`, `window._gameState`).
- **An alias** is: a name given that value (`var S = stateRef.current`, under any name: `S2`, `_S`, `st`); a call
  of a function that returns it (`getState()`), or of a getter handed along (`getS()`); a parameter spelt `S`,
  plain or destructured from a component's props; and a parameter or prop of any name that some call the
  machine can follow hands the state to, across files.
  A parameter spelt `S` is NOT the state when every call the machine can follow hands it something plainly
  else (2 today: `rendering/lookArmour.js:416`, `rendering/sootMarks.js:57`).
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
| `_abilityFx` | fly :713 | game/abilities.js | game/abilities.js | - | no-read | - | never |
| `_abilitySwingUntil` | fly :617 | game/abilities.js | 2: game/abilities.js, networking/wsClient.js | game/monsterCombat.js | 2+ | - | never |
| `_swingAng` | fly :715 | game/abilities.js | 2: game/abilities.js, game/monsterCombat.js | 2: game/swordFeel.js, rendering/systems/entityRenderer.js | 2+ | - | never |
| `_whirlWindup` | fly :636 | game/abilities.js | 4: game/abilities.js, game/zoneTransitions.js, networking/wsClient.js, ui/BroTown.jsx | 4: game/abilities.js, game/whirlCatch.js, rendering/systems/effectsRenderer.js, +1 | 2+ | zone | zone |
| `_acc` | fly :34 | game/accuracy.js | game/accuracy.js | game/accuracy.js | - | rejoin | rejoin |
| `_accState` | fly :84 | game/accuracy.js | game/accuracy.js | ui/mobile/dash/JourneyPanel.jsx | - | - | rejoin |
| `_achv` | fly :77 | game/achievements.js | 2: game/achievements.js, ui/panels/AchievementBanner.jsx | 5: game/achievements.js, ui/mobile/dash/AchievementsPanel.jsx, ui/panels/AchievementBanner.jsx, +2 | 2+ | - | rejoin |
| `_arenaInvolved` | fly :35 | game/arenaDoor.js | game/arenaDoor.js | 2: game/arenaDoor.js, ui/BroTown.jsx | flag | - | rejoin |
| `_arenaMatch` | fly :37 | game/arenaDoor.js | game/arenaDoor.js | 5: networking/wsClient.js, game/arenaDoor.js, game/controlVisibility.js, +2 | - | - | rejoin |
| `_arenaTournamentId` | fly :38 | game/arenaDoor.js | game/arenaDoor.js | - | no-read (tests) | - | rejoin |
| `_avatarArtHold` | never set | game/avatarHold.js | - | 2: game/avatarHold.js, ui/BroTown.jsx | no-set | - | never |
| `_bank` | fly :79 | game/bank.js | game/bank.js | 2: ui/panels/buildings/BankPanel.jsx, game/bank.js | - | - | rejoin |
| `_bankPending` | fly :66 | game/bank.js | game/bank.js | game/bank.js | - | - | rejoin |
| `_bodyPlaceDue` | fly :43 | game/bodyPlace.js | game/bodyPlace.js | game/bodyPlace.js | - | rejoin | rejoin |
| `_bodyPlacedAt` | fly :79 | game/bodyPlace.js | game/bodyPlace.js | - | no-read (tests) | - | never |
| `_bf` | fly :76 | game/bowFeel.js | 2: game/bowDraw.js~, game/bowFeel.js | 2: game/bowFeel.js, rendering/systems/bowFeelFx.js | 2+~ | - | zone |
| `_bfPose` | fly :167 | game/bowFeel.js | game/bowFeel.js | 2: rendering/systems/entityRenderer.js, game/bowFeel.js | - | - | never |
| `_bowShotAt` | fly :248 | game/bowFeel.js | 3: game/bowFeel.js, game/monsterCombat.js, ui/BroTown.jsx | 2: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js | 2+ | - | never |
| `_diceAskAt` | fly :85 | game/chat.js | game/chat.js | game/dice.js | - | - | never |
| `chatBubbles` | first :1152 | game/chat.js | 4: game/chat.js, game/interactions.js, ui/mobile/ChatBubble.jsx, game/stateCleanup.js | 3: game/stateCleanup.js, rendering/leaves/entity-social.js, rendering/systems/effectsRenderer.js | 2+ | - | never |
| `chatLog` | first :1142 | game/chat.js | 10: game/chat.js, networking/gameEvents.js, networking/wsClient.js, ui/mobile/ChatBubble.jsx, game/achievements.js, +5 | 6: game/chat.js, networking/wsClient.js, networking/gameEvents.js, +3 | 2+ | zone, death | never |
| `_serverMuteNames` | fly :213 | game/chatMute.js | game/chatMute.js | - | no-read | - | rejoin |
| `_serverMutes` | fly :212 | game/chatMute.js | game/chatMute.js | - | no-read | - | rejoin |
| `_climb` | fly :108 | game/climbActions.js | 2: game/climbActions.js, ui/BroTown.jsx | 5: game/climbActions.js, rendering/systems/entityRenderer.js, ui/BroTown.jsx, +2 | 2+ | - | zone |
| `_climbDrop` | fly :155 | game/climbActions.js | 2: game/climbActions.js, ui/BroTown.jsx | 3: game/climbActions.js, game/jump.js, ui/BroTown.jsx | 2+ | - | zone |
| `_nearChest` | fly :157 | game/climbActions.js | 2: game/climbActions.js, ui/BroTown.jsx | 3: game/climbActions.js, game/desktopControls.js, ui/BroTown.jsx | 2+ | - | zone |
| `_pushY` | fly :119 | game/climbActions.js | game/climbActions.js | game/climbActions.js | - | - | never |
| `_riseChestAsk` | fly :263 | game/climbActions.js | game/climbActions.js | game/climbActions.js | - | - | rejoin |
| `_riseChestGot` | fly :280 | game/climbActions.js | game/climbActions.js | game/climbActions.js | - | - | never |
| `_riseCross` | fly :78 | game/climbActions.js | 2: game/climbActions.js, ui/BroTown.jsx | 2: game/climbActions.js, ui/BroTown.jsx | 2+ | - | zone |
| `_arrowSnaps` | fly :1160 | game/combatHelpers.js | 2: game/combatHelpers.js, rendering/systems/effectsRenderer.js~ | 2: game/combatHelpers.js, rendering/systems/effectsRenderer.js | 2+~ | - | zone |
| `_climbNoteAt` | fly :751 | game/combatHelpers.js | game/combatHelpers.js | game/combatHelpers.js | - | - | never |
| `_dazeNoteAt` | fly :812 | game/combatHelpers.js | game/combatHelpers.js | game/combatHelpers.js | - | - | never |
| `_debrisBursts` | fly :911 | game/combatHelpers.js | 7: game/combatHelpers.js, game/wheelBreak.js, rendering/monsterDeathFx.js, rendering/systems/effectsRenderer.js~, rendering/wheelObjects.js, +2 | 5: game/combatHelpers.js, game/wheelBreak.js, rendering/hitMaterialFx.js, +2 | 2+ | zone | zone |
| `_dmgFromMonster` | fly :531 | game/combatHelpers.js | game/combatHelpers.js | game/combatHelpers.js | - | - | zone |
| `_offlineNoteAt` | fly :781 | game/combatHelpers.js | game/combatHelpers.js | game/combatHelpers.js | - | - | never |
| `_peerDmgLastRel` | fly :359 | game/combatHelpers.js | game/combatHelpers.js | game/combatHelpers.js | - | - | zone |
| `_peerDmgQueue` | fly :328 | game/combatHelpers.js | game/combatHelpers.js | game/combatHelpers.js | - | - | zone |
| `_peerDmgZone` | fly :360 | game/combatHelpers.js | game/combatHelpers.js | game/combatHelpers.js | - | - | never |
| `_propMarks` | fly :1083 | game/combatHelpers.js | 2: game/combatHelpers.js, rendering/systems/effectsRenderer.js~ | 2: game/combatHelpers.js, rendering/systems/effectsRenderer.js | 2+~ | - | zone |
| `_staffCrashes` | fly :1067 | game/combatHelpers.js | 3: game/combatHelpers.js, game/zoneTransitions.js, rendering/staffCastFx.js~ | 2: game/combatHelpers.js, rendering/staffCastFx.js | 2+ | zone | zone |
| `_staggerNoteAt` | fly :831 | game/combatHelpers.js | 2: game/combatHelpers.js, networking/gameEvents.js | game/combatHelpers.js | 2+ | - | never |
| `groundSplatter` | first :1256 | game/combatHelpers.js | 4: game/combatHelpers.js, game/monsterCombat.js, game/stateCleanup.js, rendering/systems/effectsRenderer.js~ | 4: game/combatHelpers.js, game/monsterCombat.js, game/renderFrame.js, +1 | 2+ | - | zone |
| `_realtimeStatus` | fly :39 | game/connectionDoor.js | game/connectionDoor.js | 5: networking/wsClient.js, ui/panels/InfoPanel.jsx, game/tradeSlot.js, +2 | phase | rejoin | rejoin |
| `_dailyRewards` | fly :244 | game/dailyRewards.js | game/dailyRewards.js | - | no-read | - | rejoin |
| `_deathCard` | fly :61 | game/deathCard.js | game/deathCard.js | game/deathCard.js | - | zone, death | death |
| `_dblTap` | fly :213 | game/desktopControls.js | 2: game/deskCombos.js~, game/desktopControls.js | game/desktopControls.js | 2+~ | - | never |
| `_dblTapRolls` | fly :215 | game/desktopControls.js | game/desktopControls.js | - | no-read (tests) | - | never |
| `_eTalkHints` | fly :360 | game/desktopControls.js | game/desktopControls.js | - | no-read (tests) | - | never |
| `_interactNow` | fly :181 | game/desktopControls.js | game/desktopControls.js | ui/BroTown.jsx | - | - | never |
| `_isDesktop` | fly :183 | game/desktopControls.js | game/desktopControls.js | 2: ui/BroTown.jsx, ui/mobile/FarmBedPrompt.jsx | - | - | never |
| `keys` | first :1136 | game/desktopControls.js | game/desktopControls.js | 3: game/desktopControls.js, game/jumpActions.js, ui/BroTown.jsx | - | - | never |
| `_dodgeFlash` | fly :155 | game/dodge.js | game/dodge.js | - | no-read (tests) | - | never |
| `_dodgeRoll` | first :1219 | game/dodge.js | 2: game/dodge.js, ui/BroTown.jsx | 11: ui/BroTown.jsx, rendering/systems/entityRenderer.js, game/desktopControls.js, +8 | 2+ | - | zone |
| `_hasDodged` | fly :154 | game/dodge.js | game/dodge.js | ui/BroTown.jsx | flag | - | never |
| `_lungeIFramesUntil` | fly :220 | game/dodge.js | game/dodge.js | - | no-read | - | never |
| `_stuckNoteAt` | fly :86 | game/dodge.js | game/dodge.js | game/dodge.js | - | - | never |
| `respawnTimer` | first :1277 | game/dodge.js | 4: game/dodge.js, game/monsterCombat.js, game/respawn.js, ui/BroTown.jsx | 2: game/monsterCombat.js, game/projectiles.js | 2+ | zone, death | never |
| `_dlCredits` | fly :180 | game/dropLines.js | game/dropLines.js | game/dropLines.js | - | - | zone |
| `_dropLines` | fly :181 | game/dropLines.js | 3: game/dropLines.js, rendering/dropLines.js~, game/zoneTransitions.js | 2: game/dropLines.js, rendering/dropLines.js | 2+ | zone | zone |
| `_activeDuel` | fly :54 | game/duelDoor.js | game/duelDoor.js | 5: networking/gameEvents.js, game/duelPending.js, networking/wsClient.js, +2 | - | rejoin | rejoin |
| `_inDuel` | fly :53 | game/duelDoor.js | 2: game/duelPending.js~, game/duelDoor.js | 14: game/duelPending.js, game/projectiles.js, rendering/systems/entityRenderer.js, +11 | 2+~ | rejoin | rejoin |
| `_wheelDungeonOpening` | fly :127 | game/dungeonArt.js | 2: game/dungeonArt.js, networking/gameEvents.js | 4: game/dungeonArt.js, game/wheelDungeons.js, networking/gameEvents.js, +1 | 2+ | - | zone |
| `_dungeonClear` | fly :36 | game/dungeonClear.js | game/dungeonClear.js | 2: game/dungeonClear.js, rendering/arenaWorld.js | - | - | zone |
| `_dungeonComplete` | fly :52 | game/dungeonDoor.js | game/dungeonDoor.js | 2: game/dungeonDoor.js, game/dungeonWaves.js | - | zone, death | zone+rejoin |
| `_inCustomDungeon` | fly :51 | game/dungeonDoor.js | game/dungeonDoor.js | game/dungeonWaves.js | - | zone, death | zone+rejoin |
| `_inDungeon` | fly :50 | game/dungeonDoor.js | game/dungeonDoor.js | 5: game/zoneTransitions.js, debug/report.js, game/dungeonDoor.js, +2 | - | zone, death | zone+rejoin |
| `_customDungeonConfig` | fly :90 | game/dungeonWaves.js | 6: game/dungeonWaves.js, networking/gameEvents.js, game/respawn.js, game/wheelDungeons.js, game/zoneTransitions.js, +1 | game/dungeonWaves.js | 2+ | zone, death | zone+rejoin |
| `_deathStart` | fly :40 | game/dyingDoor.js | game/dyingDoor.js | 5: rendering/systems/entityRenderer.js, ui/BroTown.jsx, game/lifeSkillRewards.js, +2 | - | zone, death | death |
| `_dying` | fly :39 | game/dyingDoor.js | game/dyingDoor.js | 24: networking/gameEvents.js, ui/BroTown.jsx, rendering/systems/entityRenderer.js, +21 | flag | zone, death | death |
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
| `_stuckUntil` | fly :200 | game/elemHits.js | game/elemHits.js | 2: game/elemHits.js, rendering/systems/effectsRenderer.js | - | - | zone |
| `_thornUntil` | fly :219 | game/elemHits.js | game/elemHits.js | rendering/systems/effectsRenderer.js | - | - | zone |
| `_wardAt` | fly :193 | game/elemHits.js | game/elemHits.js | rendering/systems/entityRenderer.js | - | - | never |
| `_wardElem` | fly :193 | game/elemHits.js | game/elemHits.js | rendering/systems/entityRenderer.js | - | - | never |
| `_wardPct` | fly :193 | game/elemHits.js | game/elemHits.js | - | no-read | - | never |
| `_wobbleFrom` | fly :207 | game/elemHits.js | game/elemHits.js | 2: game/elemHits.js, rendering/systems/effectsRenderer.js | - | - | zone |
| `_wobbleUntil` | fly :207 | game/elemHits.js | game/elemHits.js | 2: game/elemHits.js, rendering/systems/effectsRenderer.js | - | - | zone |
| `_farmLeaving` | fly :92 | game/farmTrip.js | 2: game/farmTrip.js, game/wheelTownDoors.js | game/farmTrip.js | 2+ | zone | zone |
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
| `_fishBoard` | fly :74 | game/fishWeigh.js | game/fishWeigh.js | 2: game/fishWeigh.js, ui/mobile/dash/FishBoard.jsx | - | - | rejoin |
| `_freeShots` | fly :68 | game/freeAttack.js | game/freeAttack.js | - | no-read (tests) | - | ? |
| `_shieldCdUntil` | fly :48 | game/guardBreak.js | 2: game/guardBreak.js, ui/BroTown.jsx | 4: ui/panels/ShieldButton.jsx, game/guardDoor.js, game/playerActions.js, +1 | 2+ | - | death |
| `_shieldUp` | fly :65 | game/guardDoor.js | game/guardDoor.js | 20: ui/BroTown.jsx, game/shieldToggle.js, game/abilities.js, +17 | flag | - | death |
| `_extraction` | fly :79 | game/harvestDoor.js | 6: ui/ExtractionSwipeLayer.jsx~, game/lifeSkillRewards.js, rendering/systems/effectsRenderer.js~, game/gesturePose.js~, game/harvestDoor.js, +1 | 24: ui/BroTown.jsx, game/lifeSkillRewards.js, rendering/systems/entityRenderer.js, +21 | 2+ | - | zone |
| `_heapBurnSentAt` | fly :40 | game/heapBurn.js | game/heapBurn.js | game/heapBurn.js | - | - | never |
| `_heapBurnUntil` | fly :38 | game/heapBurn.js | game/heapBurn.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_shotEnds` | fly :155 | game/hitSounds.js | game/hitSounds.js | game/hitSounds.js | - | - | zone |
| `_dead` | never set | game/interactions.js | - | 2: game/interactions.js, game/poseDoor.js | no-set | - | never |
| `_emoteAt` | fly :35 | game/interactions.js | game/interactions.js | game/interactions.js | - | - | never |
| `_emoteMove` | fly :86 | game/interactions.js | game/interactions.js | 3: rendering/emoteFx.js, game/interactions.js, game/townsfolkReact.js | - | - | never |
| `emote` | first :1209 | game/interactions.js | game/interactions.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_dropLast` | fly :94 | game/itemDrop.js | game/itemDrop.js | - | no-read | - | never |
| `_jump` | fly :277 | game/jump.js | 2: game/jumpActions.js, game/jump.js | 9: game/climbActions.js, ui/BroTown.jsx, rendering/systems/entityRenderer.js, +6 | 2+ | - | zone |
| `_jumpLandAt` | fly :293 | game/jump.js | game/jump.js | 2: game/jump.js, ui/panels/JumpButton.jsx | - | - | never |
| `_jumpOver` | fly :291 | game/jump.js | game/jump.js | 2: game/jump.js, ui/BroTown.jsx | - | - | zone |
| `_flipCount` | fly :131 | game/jumpActions.js | game/jumpActions.js | - | no-read (tests) | - | never |
| `_jumpCount` | fly :87 | game/jumpActions.js | game/jumpActions.js | ui/panels/JumpButton.jsx | - | - | never |
| `_jumpLandFx` | fly :154 | game/jumpActions.js | game/jumpActions.js | rendering/jumpFx.js | - | - | never |
| `_jumpWhy` | fly :72 | game/jumpActions.js | game/jumpActions.js | ui/panels/JumpButton.jsx | - | - | never |
| `_lastFlip` | fly :132 | game/jumpActions.js | game/jumpActions.js | - | no-read (tests) | - | never |
| `_lastJumpRun` | fly :166 | game/jumpActions.js | game/jumpActions.js | - | no-read (tests) | - | never |
| `_killXpFlewAt` | fly :88 | game/killXp.js | game/killXp.js | game/killXp.js | - | - | never |
| `_killXpKillAt` | fly :81 | game/killXp.js | game/killXp.js | - | no-read (tests) | - | never |
| `_killXpWait` | fly :87 | game/killXp.js | game/killXp.js | game/killXp.js | - | - | zone |
| `_latchAwayAt` | fly :96 | game/latch.js | game/latch.js | game/latch.js | - | - | ? |
| `_latchEnd` | fly :99 | game/latch.js | game/latch.js | - | no-read (tests) | - | ? |
| `_latchHoldAt` | fly :177 | game/latch.js | game/latch.js | game/latch.js | - | - | ? |
| `_latchId` | fly :98 | game/latch.js | game/latch.js | 3: game/latch.js, game/targeting.js, game/thumbSide.js | - | - | ? |
| `_latchPhase` | fly :97 | game/latch.js | game/latch.js | 2: game/latch.js, ui/panels/ChargeButton.jsx | phase | - | ? |
| `_levelUpFlash` | fly :79 | game/levelCelebration.js | 2: game/levelCelebration.js, game/stateCleanup.js | rendering/systems/effectsRenderer.js | 2+ | - | never |
| `_gatherHitSeq` | fly :258 | game/lifeSkillRewards.js | game/lifeSkillRewards.js | game/lifeSkillRewards.js | - | - | never |
| `_lastHarvestOkAt` | fly :553 | game/lifeSkillRewards.js | game/lifeSkillRewards.js | ui/deskTeach.js | - | - | never |
| `_strikeShown` | fly :586 | game/lifeSkillRewards.js | game/lifeSkillRewards.js | game/lifeSkillRewards.js | - | - | ? |
| `player` | first :1120 | game/lifeSkillRewards.js | 19: game/zoneTransitions.js~, ui/BroTown.jsx, game/monsterCombat.js, game/lifeSkillRewards.js, game/wheelHome.js~, +14 | 151: networking/gameEvents.js, ui/BroTown.jsx, networking/wsClient.js, +148 | 2+ | zone, death | never |
| `_mc` | fly :327 | game/manualCombat.js | game/manualCombat.js | 4: game/manualCombat.js, game/swordFeel.js, ui/BroTown.jsx, +1 | - | - | never |
| `_codex` | fly :37 | game/monsterCodex.js | 2: game/monsterCodex.js, ui/panels/NewMonsterCard.jsx~ | 4: game/monsterCodex.js, game/achievements.js, ui/mobile/dash/AchievementsPanel.jsx, +1 | 2+~ | - | rejoin |
| `_bowShotAng` | fly :2003 | game/monsterCombat.js | game/monsterCombat.js | rendering/systems/entityRenderer.js | - | - | never |
| `_bowSight` | fly :1583 | game/monsterCombat.js | game/monsterCombat.js | 4: rendering/systems/effectsRenderer.js, game/monsterCombat.js, game/playerActions.js, +1 | - | - | never |
| `_bowSpecialQueued` | fly :1824 | game/monsterCombat.js | 2: game/monsterCombat.js, game/playerActions.js | 2: game/monsterCombat.js, ui/panels/SpecialButton.jsx | 2+ | - | never |
| `_cursedUntil` | fly :1020 | game/monsterCombat.js | game/monsterCombat.js | 2: ui/BroTown.jsx, game/monsterCombat.js | - | - | death |
| `_deathDrops` | first :1262 | game/monsterCombat.js | 3: game/monsterCombat.js, game/zoneTransitions.js, ui/BroTown.jsx | 2: game/zoneTransitions.js, ui/BroTown.jsx | 2+ | zone | never |
| `_hitFlash` | fly :682 | game/monsterCombat.js | 3: game/monsterCombat.js, game/projectiles.js, networking/gameEvents.js | rendering/systems/entityRenderer.js | 2+ | - | never |
| `_killSlowmo` | fly :450 | game/monsterCombat.js | 2: game/monsterCombat.js, ui/BroTown.jsx | game/monsterCombat.js | 2+ | - | never |
| `_killSlowmoDuration` | never set | game/monsterCombat.js | - | game/monsterCombat.js | no-set | - | never |
| `_ownCollisionRecent` | fly :2565 | game/monsterCombat.js | 2: game/monsterCombat.js, game/projectiles.js | networking/gameEvents.js | 2+ | - | never |
| `_ownSpecialRecent` | fly :2733 | game/monsterCombat.js | game/monsterCombat.js | networking/gameEvents.js | - | - | never |
| `_playerStunUntil` | fly :685 | game/monsterCombat.js | game/monsterCombat.js | 6: game/abilities.js, game/jumpActions.js, game/monsterCombat.js, +3 | - | - | death |
| `_propSwingAt` | fly :2159 | game/monsterCombat.js | game/monsterCombat.js | game/monsterCombat.js | - | - | never |
| `_pvpThreat` | fly :3307 | game/monsterCombat.js | 2: game/monsterCombat.js, game/projectiles.js | - | 2+, no-read | - | never |
| `_rpgSaveTimer` | fly :3497 | game/monsterCombat.js | game/monsterCombat.js | game/monsterCombat.js | - | - | never |
| `_staffCadenceMs` | fly :1997 | game/monsterCombat.js | game/monsterCombat.js | rendering/staffCastFx.js | - | - | never |
| `_staffCastAng` | fly :1996 | game/monsterCombat.js | 2: game/monsterCombat.js, game/playerActions.js | 2: rendering/staffCastFx.js, rendering/systems/entityRenderer.js | 2+ | - | never |
| `_staffCastAt` | fly :1995 | game/monsterCombat.js | 2: game/monsterCombat.js, game/playerActions.js | 3: rendering/staffCastFx.js, rendering/systems/entityRenderer.js, game/monsterCombat.js | 2+ | - | never |
| `_staffCastBig` | fly :1998 | game/monsterCombat.js | 2: game/monsterCombat.js, game/playerActions.js | 2: rendering/systems/entityRenderer.js, rendering/staffCastFx.js | 2+ | - | never |
| `_swingBcastPending` | fly :2024 | game/monsterCombat.js | 2: game/monsterCombat.js, game/playerActions.js | game/monsterCombat.js | 2+, flag | - | never |
| `_swingSfxKey` | fly :2030 | game/monsterCombat.js | 2: game/monsterCombat.js, game/playerActions.js | game/monsterCombat.js | 2+ | - | never |
| `_swingSfxPending` | fly :2031 | game/monsterCombat.js | 4: game/monsterCombat.js, game/playerActions.js, game/shieldToggle.js, ui/BroTown.jsx | game/monsterCombat.js | 2+, flag | - | never |
| `isSwinging` | first :1249 | game/monsterCombat.js | 6: game/monsterCombat.js, game/playerActions.js, game/abilities.js, game/climbActions.js, game/shieldToggle.js, +1 | 9: rendering/systems/effectsRenderer.js, ui/BroTown.jsx, game/monsterCombat.js, +6 | 2+, flag | - | never |
| `lastDamageTaken` | first :1275 | game/monsterCombat.js | 3: game/monsterCombat.js, networking/gameEvents.js, game/projectiles.js | 8: ui/BroTown.jsx, game/shieldToggle.js, rendering/systems/entityRenderer.js, +5 | 2+ | - | never |
| `_monNoiseAt` | fly :72 | game/monsterNoises.js | game/monsterNoises.js | game/monsterNoises.js | - | - | never |
| `_nmlAskAgain` | fly :415 | game/nmlAsk.js | game/nmlAsk.js | game/nmlAsk.js | - | - | never |
| `_nmlAsked` | fly :180 | game/nmlAsk.js | game/nmlAsk.js | game/nmlAsk.js | - | - | zone |
| `_nmlAskedAt` | fly :189 | game/nmlAsk.js | game/nmlAsk.js | game/nmlAsk.js | - | - | never |
| `_nmlAskMarks` | fly :135 | game/noMansLand.js | 2: game/noMansLand.js, rendering/systems/entityRenderer.js | 2: rendering/systems/entityRenderer.js, game/noMansLand.js | 2+ | - | never |
| `_nmlConfiscatedAt` | fly :306 | game/noMansLand.js | game/noMansLand.js | networking/wsClient.js | - | - | never |
| `_nmlLevel` | fly :214 | game/noMansLand.js | game/noMansLand.js | - | no-read (tests) | - | zone |
| `_nmlLockAskAt` | fly :144 | game/noMansLand.js | game/noMansLand.js | game/noMansLand.js | - | - | never |
| `_nmlLocks` | fly :113 | game/noMansLand.js | game/noMansLand.js | game/noMansLand.js | - | - | rejoin |
| `_nmlSelf` | fly :261 | game/noMansLand.js | game/noMansLand.js | 2: game/nmlAsk.js, game/plateSafety.js | - | - | rejoin |
| `_party` | fly :35 | game/partyDoor.js | game/partyDoor.js | 12: rendering/systems/entityRenderer.js, ui/panels/buildings/WheelHallPanel.jsx, game/chat.js, +9 | - | rejoin | rejoin |
| `_mapPins` | fly :107 | game/pinSlots.js | game/pinSlots.js | game/pinSlots.js | - | - | never |
| `_burstMsgAt` | fly :751 | game/playerActions.js | game/playerActions.js | game/playerActions.js | - | - | never |
| `_hasUsedSwipe` | fly :271 | game/playerActions.js | 2: game/playerActions.js, ui/BroTown.jsx | ui/mobile/QuestCoach.jsx | 2+, flag | - | never |
| `_iceAttack` | fly :672 | game/playerActions.js | game/playerActions.js | - | no-read, flag | - | zone |
| `_lastBurstAt` | fly :759 | game/playerActions.js | game/playerActions.js | 2: ui/mobile/ElementBurstButton.jsx, game/playerActions.js | - | - | never |
| `_lastSwipe` | fly :270 | game/playerActions.js | game/playerActions.js | 4: ui/panels/SpecialButton.jsx, game/monsterCombat.js, ui/BroTown.jsx, +1 | - | - | never |
| `_shieldStamina` | never set | game/playerActions.js | - | game/playerActions.js | no-set | - | death |
| `_specialAttack` | fly :98 | game/playerActions.js | 3: game/playerActions.js, game/abilities.js, game/monsterCombat.js | 4: game/monsterCombat.js, rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js, +1 | 2+, flag | - | zone |
| `shieldActive` | first :1279 | game/playerActions.js | 2: game/playerActions.js, game/shieldToggle.js | - | 2+, no-read | - | death |
| `swingTimer` | first :1243 | game/playerActions.js | 3: game/abilities.js, game/playerActions.js, game/monsterCombat.js | 11: game/monsterCombat.js, rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js, +8 | 2+ | - | never |
| `_pointsResetAskedAt` | fly :61 | game/pointsReset.js | game/pointsReset.js | game/pointsReset.js | - | - | rejoin |
| `_pose` | fly :55 | game/poseDoor.js | 3: game/moveSounds.js~, game/poseDoor.js, game/interactions.js | 7: game/interactions.js, rendering/emoteFx.js, game/ride.js, +4 | 2+ | rejoin | zone+rejoin |
| `_mail` | fly :106 | game/postOffice.js | game/postOffice.js | game/postOffice.js | - | - | never |
| `_mapWatchSent` | fly :139 | game/presence2.js | game/presence2.js | - | no-read | - | never |
| `_onlineAt` | fly :107 | game/presence2.js | game/presence2.js | game/presence2.js | - | - | never |
| `_shotImpacts` | fly :1099 | game/projectiles.js | 2: game/projectiles.js, rendering/monsterShotFx.js~ | 2: game/projectiles.js, rendering/monsterShotFx.js | 2+~ | - | zone |
| `dmgNumbers` | first :1250 | game/projectiles.js | 4: rendering/systems/effectsRenderer.js~, ui/BroTown.jsx~, game/combatHelpers.js, game/projectiles.js | 7: ui/BroTown.jsx, game/combatHelpers.js, game/monsterCombat.js, +4 | 2+ | - | zone |
| `_pvpSwSent` | fly :65 | game/pvpSwing.js | game/pvpSwing.js | game/pvpSwing.js | - | - | never |
| `_pvpSwSentBy` | fly :55 | game/pvpSwing.js | game/pvpSwing.js | game/pvpSwing.js | - | - | never |
| `_qcNextPoll` | fly :36 | game/questComplete.js | game/questComplete.js | game/questComplete.js | - | - | never |
| `_qcSeen` | fly :45 | game/questComplete.js | game/questComplete.js | game/questComplete.js | - | - | never |
| `_raceLil` | fly :121 | game/race.js | game/race.js | game/race.js | - | - | zone+rejoin |
| `_race` | fly :68 | game/raceDoor.js | 2: game/race.js~, game/raceDoor.js | 5: game/race.js, game/raceDoor.js, rendering/systems/effectsRenderer.js, +2 | 2+~ | - | zone+rejoin |
| `__pixiErrStreak` | fly :74 | game/renderFrame.js | game/renderFrame.js | game/renderFrame.js | - | - | never |
| `_splitLog` | fly :134 | game/renderFrame.js | game/renderFrame.js | game/renderFrame.js | - | - | never |
| `campfires` | never set | game/renderFrame.js | - | 2: game/renderFrame.js, ui/BroTown.jsx | no-set | - | zone |
| `projectiles` | never set | game/renderFrame.js | - | 2: game/renderFrame.js, ui/BroTown.jsx | no-set | - | zone |
| `_restAsked` | fly :65 | game/rest.js | game/rest.js | game/rest.js | - | - | rejoin |
| `_revealLast` | fly :177 | game/revealBag.js | game/revealBag.js | - | no-read | - | never |
| `_ride` | fly :48 | game/ride.js | game/ride.js | 4: game/ride.js, rendering/systems/entityRenderer.js, rendering/rideFx.js, +1 | - | - | zone+rejoin |
| `_shieldAutoReleased` | fly :157 | game/shieldToggle.js | 2: game/shieldToggle.js, ui/BroTown.jsx | - | 2+, no-read, flag | - | death |
| `_shieldDroppedAt` | fly :178 | game/shieldToggle.js | game/shieldToggle.js | - | no-read | - | never |
| `_shieldDroppedWhy` | fly :177 | game/shieldToggle.js | game/shieldToggle.js | - | no-read (tests) | - | never |
| `_shieldThreat` | fly :51 | game/shieldToggle.js | game/shieldToggle.js | game/shieldToggle.js | - | - | never |
| `_sparkArcs` | fly :66 | game/shockSpark.js | 2: game/shockSpark.js, rendering/systems/effectsRenderer.js~ | 2: game/shockSpark.js, rendering/systems/effectsRenderer.js | 2+~ | - | zone |
| `_sightAt` | fly :206 | game/sight.js | game/sight.js | game/sight.js | - | - | ? |
| `_sightId` | fly :205 | game/sight.js | game/sight.js | 2: game/latch.js, game/sight.js | - | - | ? |
| `_sightPhase` | fly :194 | game/sight.js | game/sight.js | 2: game/sight.js, ui/panels/ChargeButton.jsx | - | - | ? |
| `_pvpSkullType` | fly :40 | game/skullDoor.js | game/skullDoor.js | 3: game/noMansLand.js, game/skullDoor.js, rendering/systems/entityRenderer.js | phase | - | rejoin |
| `_pvpSkullUntil` | fly :41 | game/skullDoor.js | game/skullDoor.js | 2: networking/gameEvents.js, rendering/systems/entityRenderer.js | - | - | rejoin |
| `_sootQueue` | fly :20 | game/slimeBlast.js | 2: game/slimeBlast.js, rendering/sootMarks.js~ | 2: game/slimeBlast.js, rendering/sootMarks.js | 2+~ | - | zone |
| `_smithing` | fly :42 | game/smithing.js | game/smithing.js | 3: game/smithing.js, rendering/worldLife.js, rendering/systems/effectsRenderer.js | - | - | zone |
| `_spar` | fly :48 | game/spar.js | game/spar.js | 3: ui/BroTown.jsx, game/spar.js, game/sparTargets.js | - | - | zone+rejoin |
| `_nmlFoes` | fly :212 | game/sparTargets.js | game/sparTargets.js | 2: game/sparTargets.js, rendering/systems/entityRenderer.js | - | - | zone |
| `_pvpBlows` | fly :152 | game/sparTargets.js | game/sparTargets.js | game/sparTargets.js | - | - | never |
| `_pvpBouts` | fly :154 | game/sparTargets.js | game/sparTargets.js | game/sparTargets.js | - | - | never |
| `_pvpHitBy` | fly :164 | game/sparTargets.js | game/sparTargets.js | game/sparTargets.js | - | - | never |
| `_spinBoard` | fly :39 | game/spinBoard.js | game/spinBoard.js | 2: ui/mobile/dash/LeaderboardPanel.jsx, game/spinBoard.js | - | - | never |
| `_sprint` | fly :49 | game/sprint.js | game/sprint.js | 4: game/sprint.js, game/stickZones.js, ui/BroTown.jsx, +1 | - | - | zone |
| `_sprintRunOuts` | fly :236 | game/sprint.js | game/sprint.js | game/sprint.js | - | - | never |
| `_tiledWalkable` | fly :50 | game/spriteSheets.js | 2: game/spriteSheets.js, game/worldTrial.js | 5: ui/BroTown.jsx, game/worldTrial.js, game/zoneTransitions.js, +2 | 2+ | - | never |
| `_stf` | fly :141 | game/staffFeel.js | game/staffFeel.js | 3: game/staffFeel.js, rendering/systems/staffFeelFx.js, rendering/staffCastFx.js | - | - | death |
| `_blockFlash` | fly :15 | game/stateCleanup.js | 3: game/monsterCombat.js, game/projectiles.js, game/stateCleanup.js | 2: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js | 2+ | - | never |
| `_deathFlash` | fly :18 | game/stateCleanup.js | 4: game/monsterCombat.js, game/stateCleanup.js, networking/wsClient.js, ui/BroTown.jsx | 2: rendering/systems/effectsRenderer.js, networking/wsClient.js | 2+ | - | never |
| `_rimSprint` | fly :192 | game/stickZones.js | game/stickZones.js | game/stickZones.js | - | - | ? |
| `_stickPhase` | fly :240 | game/stickZones.js | game/stickZones.js | game/stickZones.js | - | - | ? |
| `stickX` | first :1137 | game/stickZones.js | game/stickZones.js | 5: game/stickZones.js, debug/perfHud.js, game/jumpActions.js, +2 | - | - | never |
| `stickY` | first :1138 | game/stickZones.js | game/stickZones.js | 6: game/stickZones.js, debug/perfHud.js, game/climbActions.js, +3 | - | - | never |
| `_mktPlaceBusy` | fly :29 | game/storeSellTap.js | game/storeSellTap.js | game/storeSellTap.js | flag | - | never |
| `_sf` | fly :61 | game/swordFeel.js | 2: game/swordFeel.js, game/weaponFeel.js~ | 3: game/swordFeel.js, rendering/systems/entityRenderer.js, rendering/systems/weaponFeelFx.js | 2+~ | - | death |
| `_tapAtk` | fly :253 | game/tapJump.js | game/tapJump.js | game/tapJump.js | - | - | never |
| `_tapAtkWhy` | fly :251 | game/tapJump.js | game/tapJump.js | - | no-read (tests) | - | never |
| `_tapAttacks` | fly :258 | game/tapJump.js | game/tapJump.js | ui/panels/JumpButton.jsx | - | - | never |
| `_engaged` | fly :478 | game/targeting.js | game/targeting.js | game/monsterCombat.js | flag | - | zone |
| `_engagedGapAt` | fly :481 | game/targeting.js | game/targeting.js | game/targeting.js | - | - | zone |
| `_engagedId` | fly :476 | game/targeting.js | game/targeting.js | game/targeting.js | - | - | zone |
| `_lockDroppedAt` | fly :534 | game/targeting.js | game/targeting.js | - | no-read | - | never |
| `_lockDroppedWhy` | fly :534 | game/targeting.js | game/targeting.js | - | no-read (tests), phase | - | never |
| `_perimeterPx` | fly :566 | game/targeting.js | game/targeting.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_targetCands` | fly :575 | game/targeting.js | game/targeting.js | 2: ui/BroTown.jsx, rendering/systems/effectsRenderer.js | - | - | never |
| `_testMode` | fly :14 | game/testMode.js | game/testMode.js | game/testMode.js | - | rejoin | rejoin |
| `_thumbAt` | fly :130 | game/thumbSide.js | game/thumbSide.js | game/thumbSide.js | - | - | ? |
| `_thumbPhase` | fly :113 | game/thumbSide.js | game/thumbSide.js | 4: game/thumbSide.js, ui/panels/ChargeButton.jsx, ui/panels/ShieldButton.jsx, +1 | - | - | ? |
| `_tooFarAt` | fly :32 | game/tooFar.js | game/tooFar.js | game/tooFar.js | - | - | never |
| `_idleChatAt` | fly :62 | game/townChatter.js | game/townChatter.js | game/townChatter.js | - | - | never |
| `_idleChatSeq` | fly :63 | game/townChatter.js | game/townChatter.js | - | no-read | - | never |
| `__btNoIdleMoves` | never set | game/townsfolkReact.js | - | game/townsfolkReact.js | no-set | - | never |
| `_t2Leave` | fly :82 | game/tradeSlot.js | game/tradeSlot.js | game/tradeSlot.js | - | - | rejoin |
| `_t2Live` | fly :60 | game/tradeSlot.js | game/tradeSlot.js | 2: game/tradeSlot.js, game/rejoinSlots.js | - | rejoin | rejoin |
| `_t2QuietUntil` | fly :105 | game/tradeSlot.js | game/tradeSlot.js | game/tradeSlot.js | - | rejoin | rejoin |
| `_petBook` | fly :312 | game/trapping.js | game/trapping.js | 5: game/trapping.js, ui/mobile/dash/MorePanel.jsx, game/petBook.js, +2 | - | - | rejoin |
| `_petBookRev` | fly :321 | game/trapping.js | game/trapping.js | ui/mobile/dash/PetsPanel.jsx | - | - | never |
| `_petLevelSaid` | fly :396 | game/trapping.js | game/trapping.js | - | no-read (tests) | - | never |
| `_petLevelUps` | fly :390 | game/trapping.js | game/trapping.js | - | no-read (tests) | - | never |
| `_petXpGained` | fly :388 | game/trapping.js | game/trapping.js | - | no-read (tests) | - | never |
| `_trap` | fly :72 | game/trapping.js | 4: game/trapping.js, rendering/trapFx.js~, game/zoneTransitions.js, ui/panels/TrapCatchCard.jsx | 9: ui/panels/TrapCatchCard.jsx, rendering/systems/effectsRenderer.js, data/gameSystems.js, +6 | 2+ | zone | zone+rejoin |
| `_trapArms` | fly :168 | game/trapping.js | game/trapping.js | game/trapping.js | - | - | never |
| `_trapCatches` | fly :233 | game/trapping.js | game/trapping.js | game/trapping.js | - | - | never |
| `_trapLast` | fly :234 | game/trapping.js | game/trapping.js | game/trapping.js | - | - | never |
| `_trapReveal` | fly :271 | game/trapping.js | game/trapping.js | game/trapping.js | - | - | never |
| `_trapRolls` | fly :232 | game/trapping.js | game/trapping.js | game/trapping.js | - | - | never |
| `_trapTries` | fly :211 | game/trapping.js | game/trapping.js | - | no-read | - | zone+rejoin |
| `_trapsMade` | fly :304 | game/trapping.js | game/trapping.js | ui/panels/buildings/TrapsTab.jsx | - | - | never |
| `_wardHits` | fly :416 | game/trapping.js | game/trapping.js | - | no-read (tests) | - | never |
| `_wardSaid` | fly :424 | game/trapping.js | game/trapping.js | - | no-read (tests) | - | never |
| `_wardSaidAt` | fly :418 | game/trapping.js | game/trapping.js | game/trapping.js | - | - | never |
| `_veils` | fly :67 | game/veilDoor.js | game/veilDoor.js | game/veilDoor.js | - | zone, rejoin | ? |
| `_facingAngle` | fly :63 | game/visualSystems.js | 2: game/visualSystems.js, game/farmWalk.js | 15: rendering/systems/entityRenderer.js, rendering/systems/effectsRenderer.js, ui/BroTown.jsx, +12 | 2+ | - | never |
| `_footstepTimer` | fly :85 | game/visualSystems.js | game/visualSystems.js | game/visualSystems.js | - | - | never |
| `_peerPrintLast` | fly :176 | game/visualSystems.js | game/visualSystems.js | game/visualSystems.js | - | - | zone |
| `_printLast` | fly :121 | game/visualSystems.js | game/visualSystems.js | game/visualSystems.js | - | - | zone |
| `_targetFacingAngle` | fly :61 | game/visualSystems.js | 4: game/farmWalk.js, game/stickZones.js, game/visualSystems.js, rendering/systems/entityRenderer.js | 2: game/tapJump.js, game/visualSystems.js | 2+ | - | never |
| `footprints` | fly :128 | game/visualSystems.js | 2: game/visualSystems.js, game/stateCleanup.js | 2: game/visualSystems.js, rendering/systems/effectsRenderer.js | 2+ | - | zone |
| `peerFootprints` | fly :194 | game/visualSystems.js | 2: game/visualSystems.js, game/stateCleanup.js | 2: game/visualSystems.js, rendering/systems/effectsRenderer.js | 2+ | - | zone |
| `_feelFx` | fly :291 | game/weaponFeel.js | 2: game/weaponFeel.js, rendering/systems/weaponFeelFx.js~ | 2: game/weaponFeel.js, rendering/systems/weaponFeelFx.js | 2+~ | - | zone |
| `_dungeonBack` | fly :243 | game/wheelDungeons.js | 3: game/wheelDungeons.js, game/respawn.js, networking/gameEvents.js | 2: game/wheelDungeons.js, game/zoneTransitions.js | 2+ | zone, death | zone+rejoin |
| `_wheelDoorAskedAt` | fly :204 | game/wheelDungeons.js | game/wheelDungeons.js | game/wheelDungeons.js | - | - | never |
| `_mayorGateAt` | fly :191 | game/wheelHome.js | 2: game/wheelHome.js, game/zoneTransitions.js | 2: game/wheelHome.js, game/zoneTransitions.js | 2+ | - | never |
| `_spawnAskedAt` | fly :48 | game/wheelHome.js | game/wheelHome.js | 2: game/wheelHome.js, ui/mobile/zoneTitle.js | - | zone, death | zone |
| `_spawnSince` | fly :47 | game/wheelHome.js | game/wheelHome.js | game/wheelHome.js | - | zone, death | zone |
| `_spawnToWheel` | fly :46 | game/wheelHome.js | game/wheelHome.js | 4: game/wheelHome.js, game/bodyPlace.js, rendering/systems/wheelMinimap.js, +1 | - | zone, death | zone |
| `_wheelGateHits` | fly :192 | game/wheelHome.js | game/wheelHome.js | - | no-read (tests) | - | never |
| `_wheelSpawnInit` | fly :129 | game/wheelHome.js | game/wheelHome.js | 2: game/wheelHome.js, rendering/systems/tileRenderer.js | flag | - | never |
| `_wheelSwim` | fly :101 | game/wheelSwim.js | game/wheelSwim.js | 7: game/wheelSwim.js, ui/BroTown.jsx, game/climbActions.js, +4 | - | - | zone |
| `_windows` | fly :52 | game/windowDoor.js | game/windowDoor.js | game/windowDoor.js | - | - | ? |
| `_xpBar` | fly :185 | game/xpBar.js | 2: game/killXp.js~, game/xpBar.js | 3: game/xpBar.js, game/killXp.js, ui/mobile/ZoneHeader.jsx | 2+~ | - | never |
| `_xpCarry` | fly :165 | game/xpBar.js | 2: game/xpBar.js, game/killXp.js | 2: game/killXp.js, game/xpBar.js | 2+ | - | never |
| `_diveAir` | fly :187 | game/zoneMechanics.js | game/zoneMechanics.js | game/zoneMechanics.js | - | - | zone |
| `_diveStarted` | fly :228 | game/zoneMechanics.js | game/zoneMechanics.js | game/zoneMechanics.js | flag | - | zone |
| `_echoActive` | fly :254 | game/zoneMechanics.js | game/zoneMechanics.js | 2: ui/BroTown.jsx, game/monsterCombat.js | flag | - | zone |
| `_lastDrownTick` | fly :193 | game/zoneMechanics.js | game/zoneMechanics.js | game/zoneMechanics.js | - | - | never |
| `_swimming` | fly :184 | game/zoneMechanics.js | game/zoneMechanics.js | ui/BroTown.jsx | flag | - | zone |
| `_tideLevel` | fly :179 | game/zoneMechanics.js | game/zoneMechanics.js | ui/BroTown.jsx | - | - | zone |
| `_ambientParticles` | fly :454 | game/zoneTransitions.js | 5: game/zoneTransitions.js, rendering/systems/effectsRenderer.js~, game/farmTrip.js, game/monsterCombat.js, ui/BroTown.jsx | rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `_currentDepth` | fly :819 | game/zoneTransitions.js | 2: game/farmTrip.js, game/zoneTransitions.js | 4: game/zoneTransitions.js, rendering/lightfx/zoneLight.js, rendering/systems/effectsRenderer.js, +1 | 2+ | zone | zone |
| `_enteredFromDir` | fly :852 | game/zoneTransitions.js | game/zoneTransitions.js | - | no-read | zone | zone |
| `_enteredFromExit` | fly :853 | game/zoneTransitions.js | game/zoneTransitions.js | game/zoneTransitions.js | - | zone | zone |
| `_enteredFromHub` | fly :794 | game/zoneTransitions.js | game/zoneTransitions.js | game/zoneTransitions.js | - | zone | zone |
| `_farmBack` | fly :1165 | game/zoneTransitions.js | 2: game/wheelTownDoors.js, game/zoneTransitions.js | game/zoneTransitions.js | 2+ | zone | zone |
| `_hubExitDisarm` | fly :560 | game/zoneTransitions.js | game/zoneTransitions.js | game/zoneTransitions.js | - | zone | zone |
| `_wheelTripVeil` | never set | game/zoneTransitions.js | - | 3: game/zoneTransitions.js, game/dungeonArt.js, networking/gameEvents.js | no-set | - | zone |
| `_zoneLoading` | never set | game/zoneTransitions.js | - | 27: game/zoneTransitions.js, ui/BroTown.jsx, game/wheelHome.js, +24 | no-set | - | zone |
| `_zoneLockAt` | fly :671 | game/zoneTransitions.js | game/zoneTransitions.js | game/zoneTransitions.js | - | - | never |
| `_zoneWarnAt` | fly :707 | game/zoneTransitions.js | game/zoneTransitions.js | game/zoneTransitions.js | - | - | never |
| `_zoneWipe` | fly :1122 | game/zoneTransitions.js | 7: game/zoneTransitions.js, game/dungeonWaves.js, networking/gameEvents.js, game/farmTrip.js, game/stateCleanup.js, +2 | rendering/systems/effectsRenderer.js | 2+ | zone | never |
| `arrows` | first :1218 | game/zoneTransitions.js | 16: game/projectiles.js, rendering/systems/effectsRenderer.js~, game/bowFeel.js~, game/playerActions.js, game/zoneTransitions.js, +11 | 3: game/projectiles.js, game/bowFeel.js, rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `currentZone` | first :1140 | game/zoneTransitions.js | game/zoneTransitions.js | 97: ui/BroTown.jsx, rendering/systems/effectsRenderer.js, game/projectiles.js, +94 | phase | zone, death | zone |
| `deathExplosions` | first :1260 | game/zoneTransitions.js | 8: game/zoneTransitions.js, game/monsterCombat.js, game/dungeonWaves.js, networking/gameEvents.js, game/farmTrip.js, +3 | rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `hitParticles` | first :1254 | game/zoneTransitions.js | 16: rendering/systems/effectsRenderer.js, game/monsterCombat.js, networking/gameEvents.js, game/projectiles.js, game/zoneMechanics.js, +11 | 7: rendering/systems/effectsRenderer.js, game/renderFrame.js, game/levelCelebration.js, +4 | 2+ | zone | zone |
| `map` | first :1139 | game/zoneTransitions.js | 9: game/zoneTransitions.js, game/dungeonWaves.js, networking/gameEvents.js, game/farmTrip.js, game/monsterCombat.js, +4 | 8: game/zoneTransitions.js, game/dungeonWaves.js, ui/BroTown.jsx, +5 | 2+ | zone, death | zone |
| `monsters` | first :1238 | game/zoneTransitions.js | 26: game/monsterCombat.js, networking/gameEvents.js, rendering/systems/entityRenderer.js~, networking/wsClient.js, game/projectiles.js~, +21 | 41: networking/gameEvents.js, ui/BroTown.jsx, game/projectiles.js, +38 | 2+ | zone, death, rejoin | zone+rejoin |
| `_activeClanWar` | fly :4017 | networking/gameEvents.js | 3: networking/gameEvents.js, ui/BroTown.jsx, ui/panels/ClanPanel.jsx | 4: networking/gameEvents.js, ui/BroTown.jsx, ui/panels/ClanPanel.jsx, +1 | 2+ | - | rejoin |
| `_arenaStakeBoard` | fly :1928 | networking/gameEvents.js | networking/gameEvents.js | ui/panels/buildings/PartyPanel.jsx | - | - | rejoin |
| `_camPunch` | fly :1714 | networking/gameEvents.js | 7: networking/gameEvents.js, game/bowFeel.js, game/monsterCombat.js, game/staffFeel.js, game/swordFeel.js, +2 | 2: ui/BroTown.jsx, networking/wsClient.js | 2+ | - | never |
| `_capeStatusLine` | fly :470 | networking/gameEvents.js | networking/gameEvents.js | - | no-read | - | never |
| `_dungeonBossSpawned` | fly :983 | networking/gameEvents.js | 5: networking/gameEvents.js, game/dungeonWaves.js, game/respawn.js, game/wheelDungeons.js, ui/panels/DungeonCreatorPanel.jsx | game/dungeonWaves.js | 2+, flag | zone, death | zone |
| `_dungeonDepth` | fly :980 | networking/gameEvents.js | 2: networking/gameEvents.js, ui/panels/DungeonCreatorPanel.jsx | - | 2+, no-read | zone | zone |
| `_dungeonEnteredAt` | fly :971 | networking/gameEvents.js | networking/gameEvents.js | game/zoneTransitions.js | - | zone | zone |
| `_dungeonMaxWaves` | fly :982 | networking/gameEvents.js | 2: networking/gameEvents.js, ui/panels/DungeonCreatorPanel.jsx | 2: game/dungeonWaves.js, networking/gameEvents.js | 2+ | zone | zone |
| `_dungeonWave` | fly :981 | networking/gameEvents.js | 3: networking/gameEvents.js, game/dungeonWaves.js, ui/panels/DungeonCreatorPanel.jsx | game/dungeonWaves.js | 2+ | zone | zone |
| `_dungeonZone` | fly :965 | networking/gameEvents.js | 2: networking/gameEvents.js, ui/panels/DungeonCreatorPanel.jsx | 2: game/zoneTransitions.js, game/monsterCombat.js | 2+ | zone | zone |
| `_fireTrail` | fly :2567 | networking/gameEvents.js | 2: networking/gameEvents.js, rendering/systems/effectsRenderer.js~ | 2: networking/gameEvents.js, rendering/systems/effectsRenderer.js | 2+~ | - | zone |
| `_gambleResult` | fly :766 | networking/gameEvents.js | networking/gameEvents.js | ui/panels/buildings/GamblePanel.jsx | - | - | never |
| `_impactRings` | fly :1212 | networking/gameEvents.js | 9: networking/gameEvents.js, game/monsterCombat.js, game/abilities.js, game/combatHelpers.js, game/projectiles.js, +4 | 2: rendering/systems/effectsRenderer.js, game/playerActions.js | 2+ | - | zone |
| `_jackpotPool` | fly :852 | networking/gameEvents.js | networking/gameEvents.js | ui/panels/buildings/GamblePanel.jsx | - | - | rejoin |
| `_jackpotTickets` | fly :853 | networking/gameEvents.js | networking/gameEvents.js | ui/panels/buildings/GamblePanel.jsx | - | - | rejoin |
| `_lastArrowBoom` | fly :1248 | networking/gameEvents.js | networking/gameEvents.js | - | no-read | - | never |
| `_lastReportAck` | fly :743 | networking/gameEvents.js | networking/gameEvents.js | - | no-read | - | never |
| `_peerCampfires` | fly :592 | networking/gameEvents.js | 5: networking/gameEvents.js, game/fireRefuse.js~, game/zoneTransitions.js, rendering/campfireFx.js~, ui/BroTown.jsx~ | 6: game/ambientBeds.js, ui/BroTown.jsx, game/zoneTransitions.js, +3 | 2+ | zone | zone |
| `_peerGatherNode` | fly :566 | networking/gameEvents.js | 2: networking/gameEvents.js, game/zoneTransitions.js | 2: game/zoneTransitions.js, rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `_peerWhirlFx` | fly :2227 | networking/gameEvents.js | 3: networking/gameEvents.js, game/zoneTransitions.js, rendering/systems/effectsRenderer.js | 2: rendering/systems/effectsRenderer.js, networking/gameEvents.js | 2+ | zone | zone |
| `_peerWindups` | fly :1344 | networking/gameEvents.js | 3: networking/gameEvents.js, game/zoneTransitions.js, rendering/systems/effectsRenderer.js~ | 2: networking/gameEvents.js, rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `_preDungeonPos` | fly :904 | networking/gameEvents.js | 2: networking/gameEvents.js, ui/panels/DungeonCreatorPanel.jsx | - | 2+, no-read | zone | zone |
| `_pvpSrvHits` | fly :4220 | networking/gameEvents.js | networking/gameEvents.js | networking/gameEvents.js | - | - | never |
| `_remoteProjectiles` | fly :2293 | networking/gameEvents.js | 4: rendering/systems/effectsRenderer.js~, game/visualSystems.js, networking/gameEvents.js, game/zoneTransitions.js | 2: networking/gameEvents.js, rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `_serverDungeon` | fly :970 | networking/gameEvents.js | 4: networking/gameEvents.js, game/respawn.js, game/wheelDungeons.js, game/zoneTransitions.js | 7: networking/gameEvents.js, game/zoneTransitions.js, game/wheelDungeons.js, +4 | 2+ | zone, death | zone+rejoin |
| `_staggerUntil` | fly :1195 | networking/gameEvents.js | networking/gameEvents.js | game/elemHits.js | - | - | zone |
| `_stunEnd` | fly :4092 | networking/gameEvents.js | networking/gameEvents.js | - | no-read | - | death |
| `_t2DoneWatch` | fly :4969 | networking/gameEvents.js | 2: networking/gameEvents.js, game/tradeSlot.js | 2: networking/gameEvents.js, game/tradeSlot.js | 2+ | rejoin | rejoin |
| `_telegraphZones` | fly :1634 | networking/gameEvents.js | 4: networking/gameEvents.js, rendering/systems/telegraphShapes.js~, networking/monsterMoveEvents.js, rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | 2+ | - | zone |
| `_threatMarks` | fly :257 | networking/gameEvents.js | 2: game/noMansLand.js, networking/gameEvents.js | 3: rendering/systems/entityRenderer.js, game/noMansLand.js, networking/gameEvents.js | 2+ | - | rejoin |
| `arrowBlasts` | fly :991 | networking/gameEvents.js | 6: networking/gameEvents.js, game/projectiles.js, game/wheelDungeons.js, rendering/systems/effectsRenderer.js~, ui/BroTown.jsx, +1 | 2: networking/gameEvents.js, rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `screenShake` | first :1258 | networking/gameEvents.js | 14: networking/gameEvents.js, game/monsterCombat.js, game/dungeonWaves.js, game/projectiles.js, ui/BroTown.jsx, +9 | 3: rendering/pixiRenderer.js, game/visualSystems.js, networking/wsClient.js | 2+ | - | never |
| `slimeProjectiles` | fly :991 | networking/gameEvents.js | 11: rendering/systems/effectsRenderer.js~, game/projectiles.js, networking/gameEvents.js, game/monsterCombat.js, game/zoneTransitions.js, +6 | 5: game/renderFrame.js, game/projectiles.js, game/hitSounds.js, +2 | 2+ | zone | zone |
| `slimeShockwaves` | fly :991 | networking/gameEvents.js | 3: networking/gameEvents.js, game/wheelDungeons.js, rendering/systems/effectsRenderer.js~ | 2: networking/gameEvents.js, rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `snowballBursts` | fly :991 | networking/gameEvents.js | 6: networking/gameEvents.js, game/projectiles.js, game/wheelDungeons.js, rendering/systems/effectsRenderer.js~, ui/BroTown.jsx, +1 | 3: game/projectiles.js, networking/gameEvents.js, rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `_nodeResyncT` | fly :56 | networking/nodeSync.js | networking/nodeSync.js | networking/nodeSync.js | - | zone | zone |
| `_pendingZoneNodes` | fly :37 | networking/nodeSync.js | networking/nodeSync.js | networking/nodeSync.js | - | zone, rejoin | zone+rejoin |
| `_abilCd` | fly :3953 | networking/wsClient.js | 2: game/abilities.js, networking/wsClient.js | 2: game/abilities.js, networking/wsClient.js | 2+ | - | never |
| `_authRejects` | fly :1587 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | - | - | never |
| `_characterReset` | fly :1646 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | flag | - | never |
| `_currentRoom` | fly :570 | networking/wsClient.js | networking/wsClient.js | 2: ui/panels/buildings/ExchangePanel.jsx, ui/storeApi.js | - | - | never |
| `_evErrLogged` | fly :1229 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | - | - | never |
| `_frozenByAdmin` | fly :1574 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | flag | - | never |
| `_hardenedWoodSeen` | fly :2398 | networking/wsClient.js | networking/wsClient.js | ui/panels/buildings/HardenedWoodTab.jsx | - | - | never |
| `_hpBuff` | fly :3004 | networking/wsClient.js | 3: networking/wsClient.js, ui/BroTown.jsx, ui/panels/buildings/CookPanel.jsx | ui/BroTown.jsx | 2+ | - | rejoin |
| `_httpToken` | fly :1779 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | - | rejoin | rejoin |
| `_joinId` | fly :696 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | - | - | never |
| `_joinKey` | fly :707 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | - | - | never |
| `_joinRejectedFatal` | fly :1618 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | flag | - | never |
| `_joinedId` | fly :1691 | networking/wsClient.js | networking/wsClient.js | ui/BroTown.jsx | - | rejoin | rejoin |
| `_keyFellBack` | fly :4835 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | flag | - | never |
| `_keyIdAsked` | fly :1690 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | flag | rejoin | rejoin |
| `_keyNewAt` | fly :2481 | networking/wsClient.js | networking/wsClient.js | - | no-read | - | never |
| `_lastAbilityReject` | fly :3939 | networking/wsClient.js | networking/wsClient.js | - | no-read | - | never |
| `_lastGhostSweep` | fly :1195 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | - | - | never |
| `_levelShownBaselined` | fly :3288 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | flag | - | never |
| `_lootFreezeUntil` | fly :4310 | networking/wsClient.js | 2: networking/wsClient.js, game/groundLoot.js | 4: rendering/systems/entityRenderer.js, game/jump.js, game/monsterCombat.js, +1 | 2+ | - | never |
| `_manaBuff` | fly :3006 | networking/wsClient.js | 3: networking/wsClient.js, ui/BroTown.jsx, ui/panels/buildings/CookPanel.jsx | ui/BroTown.jsx | 2+ | - | rejoin |
| `_manaFlat` | fly :3003 | networking/wsClient.js | networking/wsClient.js | ui/BroTown.jsx | - | - | rejoin |
| `_regenBuff` | fly :2991 | networking/wsClient.js | 3: networking/wsClient.js, ui/BroTown.jsx, ui/panels/buildings/CookPanel.jsx | ui/BroTown.jsx | 2+ | - | rejoin |
| `_resetRefused` | fly :1632 | networking/wsClient.js | networking/wsClient.js | - | no-read | - | never |
| `_resistBuff` | fly :2994 | networking/wsClient.js | 3: networking/wsClient.js, ui/BroTown.jsx, ui/panels/buildings/CookPanel.jsx | 2: ui/BroTown.jsx, game/monsterCombat.js | 2+ | - | rejoin |
| `_rpgFromServer` | fly :3403 | networking/wsClient.js | 2: networking/wsClient.js, ui/BroTown.jsx | 4: ui/mobile/QuestCoach.jsx, game/phoneDeath.js, game/questRoute.js, +1 | 2+, flag | - | never |
| `_serverCaps` | fly :1667 | networking/wsClient.js | networking/wsClient.js | 99: networking/wsClient.js, ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/buildings/SmithyPanel.jsx, +96 | - | rejoin | rejoin |
| `_serverGatherNodes` | fly :1975 | networking/wsClient.js | networking/wsClient.js | 5: game/lifeSkillRewards.js, game/zoneTransitions.js, networking/nodeSync.js, +2 | flag | rejoin | rejoin |
| `_serverLoot` | fly :2006 | networking/wsClient.js | networking/wsClient.js | networking/gameEvents.js | flag | rejoin | rejoin |
| `_serverMonsters` | fly :1961 | networking/wsClient.js | 4: networking/wsClient.js, game/wheelDungeons.js, game/zoneTransitions.js, networking/gameEvents.js | 12: game/monsterCombat.js, game/projectiles.js, networking/gameEvents.js, +9 | 2+, flag | zone, rejoin | zone+rejoin |
| `_spdBuff` | fly :2996 | networking/wsClient.js | 3: networking/wsClient.js, ui/BroTown.jsx, ui/panels/buildings/CookPanel.jsx | ui/BroTown.jsx | 2+ | - | rejoin |
| `_t1Seeded` | fly :3359 | networking/wsClient.js | 2: networking/wsClient.js, ui/BroTown.jsx | game/t1Sync.js | 2+, flag | - | never |
| `_t2LocalEnd` | fly :4728 | networking/wsClient.js | networking/wsClient.js | ui/panels/TradeWindowPanel.jsx | - | - | never |
| `_tabClaim` | fly :595 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | flag | - | never |
| `_tabKey` | first :1196 | networking/wsClient.js | networking/wsClient.js | 2: networking/wsClient.js, ui/BroTown.jsx | - | - | never |
| `_tabKeyOld` | fly :1687 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | - | rejoin | never |
| `_tabMoved` | fly :555 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | flag | - | never |
| `_verifyToken` | fly :716 | networking/wsClient.js | networking/wsClient.js | networking/wsClient.js | - | - | never |
| `_xpBuff` | fly :3011 | networking/wsClient.js | networking/wsClient.js | ui/BroTown.jsx | - | - | rejoin |
| `_xpBuffMul` | fly :3012 | networking/wsClient.js | networking/wsClient.js | ui/BroTown.jsx | - | - | rejoin |
| `channel` | first :1207 | networking/wsClient.js | networking/wsClient.js | 86: ui/BroTown.jsx, networking/gameEvents.js, ui/mobile/dash/SettingsPanel.jsx, +83 | - | - | never |
| `gatherNodes` | fly :1983 | networking/wsClient.js | 15: rendering/nodeLabels.js~, rendering/systems/effectsRenderer.js~, game/lifeSkillRewards.js~, networking/wsClient.js, game/zoneTransitions.js, +10 | 16: ui/BroTown.jsx, rendering/systems/effectsRenderer.js, game/contextButton.js, +13 | 2+ | zone, death, rejoin | zone+rejoin |
| `groundLoot` | first :1252 | networking/wsClient.js | 19: rendering/systems/effectsRenderer.js~, networking/wsClient.js, game/groundLoot.js, networking/gameEvents.js, game/monsterCombat.js, +14 | 7: networking/gameEvents.js, networking/wsClient.js, game/renderFrame.js, +4 | 2+ | zone, rejoin | zone+rejoin |
| `myId` | first :1162 | networking/wsClient.js | 2: networking/wsClient.js, ui/BroTown.jsx | 59: networking/gameEvents.js, networking/wsClient.js, ui/BroTown.jsx, +56 | 2+ | - | never |
| `others` | first :1131 | networking/wsClient.js | 20: networking/wsClient.js, game/visualSystems.js~, networking/gameEvents.js, game/presence2.js, rendering/systems/entityRenderer.js~, +15 | 51: networking/gameEvents.js, ui/BroTown.jsx, networking/wsClient.js, +48 | 2+ | rejoin | rejoin |
| `_emoteHudDrop` | fly :126 | rendering/emoteFx.js | rendering/emoteFx.js | rendering/leaves/effects-social.js | - | - | never |
| `_worldScaleX` | fly :643 | rendering/pixiRenderer.js | rendering/pixiRenderer.js | 16: rendering/systems/effectsRenderer.js, ui/BroTown.jsx, rendering/leaves/effects-ui.js, +13 | - | - | never |
| `_worldScaleY` | fly :644 | rendering/pixiRenderer.js | rendering/pixiRenderer.js | 11: ui/BroTown.jsx, rendering/systems/effectsRenderer.js, game/wheelNoticeboard.js, +8 | - | - | never |
| `_stormZaps` | fly :118 | rendering/stormSparksFx.js | rendering/stormSparksFx.js | rendering/stormSparksFx.js | - | - | zone |
| `_bowArtReady` | fly :15929 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | rendering/systems/entityRenderer.js | flag | - | never |
| `_bowGripDX` | fly :15897 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | 5: game/bowFeel.js, game/combatHelpers.js, game/playerActions.js, +2 | - | - | never |
| `_bowGripDY` | fly :15898 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | 5: game/bowFeel.js, game/combatHelpers.js, game/playerActions.js, +2 | - | - | never |
| `_bowGripX` | fly :15895 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | 3: game/projectiles.js, rendering/systems/effectsRenderer.js, ui/BroTown.jsx | - | - | zone |
| `_bowGripY` | fly :15896 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | 3: rendering/systems/effectsRenderer.js, ui/BroTown.jsx, game/projectiles.js | - | - | zone |
| `_catchFlights` | never set | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js~ | rendering/systems/effectsRenderer.js | no-set | - | zone |
| `_damageFlash` | never set | rendering/systems/effectsRenderer.js | - | rendering/systems/effectsRenderer.js | no-set | - | never |
| `_dayNightCache` | never set | rendering/systems/effectsRenderer.js | - | 2: rendering/systems/effectsRenderer.js, rendering/lightfx/zoneLight.js | no-set | - | never |
| `_dazeGritAt` | fly :12710 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | - | - | death |
| `_dodgeTrail` | fly :5454 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | - | - | zone |
| `_dustPuffs` | never set | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js~ | rendering/systems/effectsRenderer.js | no-set | - | zone |
| `_farmHands` | fly :16881 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | 2: rendering/farmWorld.js, rendering/systems/effectsRenderer.js | - | - | zone |
| `_frozenChipAt` | fly :12603 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | - | - | death |
| `_fxBursts` | fly :17577 | rendering/systems/effectsRenderer.js | 2: rendering/systems/effectsRenderer.js, game/zoneTransitions.js | rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `_gustDustAt` | fly :12566 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | - | - | death |
| `_particles` | never set | rendering/systems/effectsRenderer.js | - | rendering/systems/effectsRenderer.js | no-set | - | zone |
| `_peerArmTex` | fly :15217 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | 2: rendering/systems/entityRenderer.js, rendering/systems/effectsRenderer.js | - | - | never |
| `_peerBowFacingsReady` | fly :15041 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | 2: rendering/systems/entityRenderer.js, rendering/systems/effectsRenderer.js | - | - | never |
| `_whirlCatch` | fly :12980 | rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | game/whirlCatch.js | - | - | zone |
| `_whirlFx` | fly :12185 | rendering/systems/effectsRenderer.js | 3: game/abilities.js, game/zoneTransitions.js, rendering/systems/effectsRenderer.js | rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `_bashPose` | fly :12284 | rendering/systems/entityRenderer.js | 3: game/abilities.js, game/zoneTransitions.js, rendering/systems/entityRenderer.js | 2: rendering/systems/entityRenderer.js, rendering/systems/effectsRenderer.js | 2+ | zone | zone |
| `_blockPose` | fly :12243 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 2: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js | - | - | never |
| `_blockShieldBehind` | fly :14625 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 2: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js | - | - | never |
| `_bodyAnimDir` | fly :12933 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read (tests) | - | never |
| `_bodyAnimFrame` | fly :12933 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read | - | never |
| `_bodyAnimMirror` | fly :12933 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read | - | never |
| `_bodyDrawH` | fly :12617 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 2: rendering/systems/effectsRenderer.js, rendering/wheelObjects.js | - | - | never |
| `_bodyFootY` | fly :11977 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read (tests) | - | never |
| `_bodyMoving` | fly :12933 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read (tests) | - | never |
| `_bowDir` | fly :12246 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 2: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js | - | - | never |
| `_bowHoldFrame` | fly :12162 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_bowJogLegs` | fly :13280 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 2: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js | - | - | never |
| `_bowShowing` | fly :12245 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_climbFrame` | fly :12707 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | game/climbActions.js | - | - | never |
| `_facingSrc` | fly :12437 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read (tests), phase | - | never |
| `_figureScaleY` | fly :11970 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read | - | never |
| `_jogBodyH` | fly :13275 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read | - | never |
| `_monstersArtWait` | fly :9994 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read | - | never |
| `_monstersFarHidden` | fly :9993 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read | - | never |
| `_peerBlockPose` | fly :10173 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 2: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js | - | - | never |
| `_peerShieldHeld` | fly :10175 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 2: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js | - | - | never |
| `_peerStandGeom` | fly :10167 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 2: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js | - | - | never |
| `_peersCrowdHidden` | fly :11779 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read (tests) | - | never |
| `_peersFarHidden` | fly :11778 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | - | no-read (tests) | - | never |
| `_peersNotDrawn` | fly :11782 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 4: game/projectiles.js, rendering/leaves/effects-render.js, game/nmlAsk.js, +1 | - | - | never |
| `_renderFacing` | fly :12480 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 7: rendering/systems/effectsRenderer.js, ui/BroTown.jsx, rendering/systems/entityRenderer.js, +4 | - | - | never |
| `_respawnInvuln` | never set | rendering/systems/entityRenderer.js | - | rendering/systems/entityRenderer.js | no-set | - | death |
| `_selfBandBotY` | fly :14910 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 2: rendering/systems/entityRenderer.js, rendering/nodeLabels.js | - | - | never |
| `_selfBandHalfW` | fly :14912 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 3: rendering/nodeLabels.js, rendering/systems/entityRenderer.js, ui/mobile/QuestCoach.jsx | - | - | never |
| `_selfBandTopY` | fly :14897 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 6: rendering/systems/effectsRenderer.js, game/dropLines.js, rendering/systems/entityRenderer.js, +3 | - | - | never |
| `_selfChatTipY` | fly :14914 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_staffTipAt` | fly :13759 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 3: rendering/staffCastFx.js, game/staffFeel.js, rendering/systems/staffFeelFx.js | - | - | zone |
| `_staffTipBehind` | fly :14292 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 2: rendering/staffCastFx.js, rendering/systems/staffFeelFx.js | flag | - | never |
| `_staffTipX` | fly :13757 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 3: rendering/staffCastFx.js, game/staffFeel.js, rendering/systems/staffFeelFx.js | - | - | zone |
| `_staffTipY` | fly :13758 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 3: rendering/staffCastFx.js, game/staffFeel.js, rendering/systems/staffFeelFx.js | - | - | zone |
| `_standInBody` | fly :11894 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_standInBodyH` | fly :12630 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_standInFootY` | fly :12629 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_swordBodyH` | fly :13270 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_swordFootY` | fly :13266 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_swordJogLegs` | fly :13283 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_swordSwingDir` | fly :12139 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | rendering/systems/effectsRenderer.js | - | - | never |
| `_swordSwinging` | fly :12138 | rendering/systems/entityRenderer.js | rendering/systems/entityRenderer.js | 3: rendering/systems/effectsRenderer.js, rendering/systems/weaponFeelFx.js, ui/BroTown.jsx | - | - | never |
| `_waterBlows` | fly :130 | rendering/waterAttackFx.js | rendering/waterAttackFx.js | rendering/waterAttackFx.js | - | - | zone |
| `_bloodBursts` | fly :997 | rendering/worldFx.js | rendering/worldFx.js | rendering/worldFx.js | - | - | zone |
| `__aliveAt` | fly :8886 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `__introLiftedAt` | fly :12855 | ui/BroTown.jsx | ui/BroTown.jsx | 8: ui/BroTown.jsx, game/achievements.js, game/dailyRewards.js, +5 | - | - | never |
| `__introLiftedZone` | fly :12858 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read (tests) | - | never |
| `__wdArmedAt` | fly :8878 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `__wdDark` | fly :8989 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `__wdEverLit` | fly :8989 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | flag | - | never |
| `__wdFastRebuiltAt` | fly :9003 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `__wdFirstNext` | fly :8908 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `__wdHb` | fly :8912 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `__wdNext` | fly :8910 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `__wdReloading` | fly :8831 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | flag | - | never |
| `_aimActive` | first :1221 | ui/BroTown.jsx | - | - | no-read | - | never |
| `_aimAngle` | first :1220 | ui/BroTown.jsx | 6: ui/BroTown.jsx, game/staffFeel.js, game/bowFeel.js, game/monsterCombat.js, game/tapJump.js, +1 | 11: rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js, ui/BroTown.jsx, +8 | 2+ | - | zone |
| `_aimSrc` | fly :10487 | ui/BroTown.jsx | 5: ui/BroTown.jsx, game/monsterCombat.js, game/staffFeel.js, game/tapJump.js, game/targeting.js | 2: game/staffFeel.js, game/targeting.js | 2+, phase | - | zone |
| `_aiming` | fly :5398 | ui/BroTown.jsx | 6: ui/BroTown.jsx, game/climbActions.js, game/monsterCombat.js, game/shieldToggle.js, game/staffFeel.js, +1 | 8: game/staffFeel.js, game/combatHelpers.js, game/monsterCombat.js, +5 | 2+, flag | - | zone |
| `_arenaLastBgPoll` | fly :9137 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_arenaNotified` | fly :9178 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_atkEnergy` | fly :8310 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read | - | never |
| `_atkHoldUntil` | fly :10513 | ui/BroTown.jsx | ui/BroTown.jsx | 2: game/monsterCombat.js, game/tapJump.js | - | - | never |
| `_atkPending` | fly :5395 | ui/BroTown.jsx | 4: ui/BroTown.jsx, game/climbActions.js, game/shieldToggle.js, game/tapJump.js | game/tapJump.js | 2+, flag | - | zone |
| `_atkPressAt` | fly :10322 | ui/BroTown.jsx | ui/BroTown.jsx | game/monsterCombat.js | - | - | never |
| `_backpedaling` | fly :5628 | ui/BroTown.jsx | ui/BroTown.jsx | rendering/systems/entityRenderer.js | flag | - | never |
| `_bashDash` | fly :5281 | ui/BroTown.jsx | 3: ui/BroTown.jsx, game/abilities.js, game/zoneTransitions.js | 7: ui/BroTown.jsx, rendering/systems/entityRenderer.js, game/abilities.js, +4 | 2+ | zone | zone |
| `_bleedUntil` | never set | ui/BroTown.jsx | - | ui/BroTown.jsx | no-set | - | death |
| `_btnHarvest` | fly :6195 | ui/BroTown.jsx | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/contextButton.js | flag | - | never |
| `_campfire` | fly :6778 | ui/BroTown.jsx | 3: ui/BroTown.jsx, game/fireRefuse.js, game/zoneTransitions.js | 8: ui/BroTown.jsx, game/contextButton.js, rendering/systems/effectsRenderer.js, +5 | 2+ | zone | zone |
| `_chatBySelfTap` | fly :11077 | ui/BroTown.jsx | ui/BroTown.jsx | ui/mobile/QuestCoach.jsx | - | - | never |
| `_dashStrike` | fly :5284 | ui/BroTown.jsx | 3: ui/BroTown.jsx, game/abilities.js, game/zoneTransitions.js | ui/BroTown.jsx | 2+ | zone | zone |
| `_deskPressBash` | fly :10899 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | flag | - | never |
| `_deskPressLock` | fly :10810 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | zone |
| `_discGhost` | fly :6672 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_discRect` | fly :6650 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_discRectAt` | fly :6646 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_dmgBuff` | fly :15551 | ui/BroTown.jsx | 3: networking/wsClient.js, ui/BroTown.jsx, ui/panels/buildings/CookPanel.jsx | 2: ui/BroTown.jsx, game/fightFood.js | 2+ | - | rejoin |
| `_dmgBuffMul` | fly :15551 | ui/BroTown.jsx | 3: ui/BroTown.jsx, ui/panels/buildings/CookPanel.jsx, networking/wsClient.js | 2: game/fightFood.js, ui/BroTown.jsx | 2+ | - | rejoin |
| `_dtScale` | fly :4946 | ui/BroTown.jsx | ui/BroTown.jsx | 6: ui/BroTown.jsx, game/visualSystems.js, game/monsterCombat.js, +3 | - | - | never |
| `_facing` | fly :9433 | ui/BroTown.jsx | 5: ui/BroTown.jsx, game/visualSystems.js, game/farmWalk.js, game/monsterCombat.js, game/staffFeel.js | 7: game/visualSystems.js, rendering/systems/entityRenderer.js, game/abilities.js, +4 | 2+, phase | - | never |
| `_farmArtHold` | never set | ui/BroTown.jsx | - | 7: ui/BroTown.jsx, game/dungeonArt.js, game/farmTrip.js, +4 | no-set | - | zone |
| `_firemaking` | fly :6760 | ui/BroTown.jsx | 3: ui/BroTown.jsx, game/fireRefuse.js, game/zoneTransitions.js | 7: ui/BroTown.jsx, rendering/systems/entityRenderer.js, rendering/systems/effectsRenderer.js, +4 | 2+ | zone | zone |
| `_frameCount` | fly :4903 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read (tests) | - | never |
| `_frameMs` | fly :4953 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_hasSled` | fly :14988 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | flag | - | never |
| `_hitStop` | fly :4993 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read | - | never |
| `_kaConfirmed` | fly :8102 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lJoyHeld` | fly :10204 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | flag | - | never |
| `_lJoyLiveUntil` | fly :10208 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_lJoyPreviewUntil` | fly :11270 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_lJoyShown` | fly :6728 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_lastAimAngle` | fly :9432 | ui/BroTown.jsx | 4: ui/BroTown.jsx, game/staffFeel.js, game/bowFeel.js, game/tapJump.js | 7: rendering/systems/entityRenderer.js, game/staffFeel.js, game/abilities.js, +4 | 2+ | - | never |
| `_lastBroadcastBa` | fly :8135 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lastBroadcastBlocking` | fly :8134 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lastBroadcastDead` | fly :8136 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lastBroadcastEx` | fly :8131 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lastBroadcastFacing` | fly :8089 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lastBroadcastGear` | fly :8137 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lastBroadcastX` | fly :8138 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lastBroadcastY` | fly :8138 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lastBroadcastZone` | fly :8138 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lastExBroadcast` | fly :8132 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_lastGatherNodeAt` | fly :8014 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_lastGatherNodeId` | fly :8013 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | zone |
| `_lastInputAt` | fly :8163 | ui/BroTown.jsx | 3: ui/BroTown.jsx, game/stickZones.js, networking/wsClient.js | ui/BroTown.jsx | 2+ | - | never |
| `_lastMoveBroadcast` | fly :8103 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_lastStatsUpdateSig` | fly :3636 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | rejoin |
| `_lastTrack` | fly :8171 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_mcEarly` | fly :9378 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read (tests) | - | never |
| `_mcTeachAt` | fly :9397 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_mcTeachN` | fly :9398 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read (tests) | - | never |
| `_miningOpen` | never set | ui/BroTown.jsx | - | ui/BroTown.jsx | no-set | - | never |
| `_mouseAimAngle` | fly :13224 | ui/BroTown.jsx | ui/BroTown.jsx | 4: ui/BroTown.jsx, game/bowFeel.js, game/desktopControls.js, +1 | - | - | never |
| `_mouseScreen` | fly :13225 | ui/BroTown.jsx | ui/BroTown.jsx | game/deskShield.js | - | - | never |
| `_mouseWorldX` | fly :13227 | ui/BroTown.jsx | ui/BroTown.jsx | rendering/systems/effectsRenderer.js | - | - | zone |
| `_mouseWorldY` | fly :13228 | ui/BroTown.jsx | ui/BroTown.jsx | rendering/systems/effectsRenderer.js | - | - | zone |
| `_nearHouse` | fly :6025 | ui/BroTown.jsx | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/desktopControls.js | - | - | zone |
| `_nearNode` | fly :6123 | ui/BroTown.jsx | ui/BroTown.jsx | 4: ui/BroTown.jsx, game/contextButton.js, game/desktopControls.js, +1 | - | - | zone |
| `_nearNpc` | fly :6936 | ui/BroTown.jsx | ui/BroTown.jsx | 2: game/desktopControls.js, ui/BroTown.jsx | - | - | zone |
| `_nearPetHouse` | fly :6043 | ui/BroTown.jsx | ui/BroTown.jsx | 2: game/desktopControls.js, ui/BroTown.jsx | - | - | zone |
| `_nearWheelBuilding` | fly :5990 | ui/BroTown.jsx | ui/BroTown.jsx | 3: ui/BroTown.jsx, game/desktopControls.js, game/interactions.js | - | - | zone |
| `_nearWheelDoor` | fly :6038 | ui/BroTown.jsx | ui/BroTown.jsx | 3: ui/BroTown.jsx, game/desktopControls.js, ui/panels/TrapButton.jsx | - | - | zone |
| `_nearWorkshop` | fly :6033 | ui/BroTown.jsx | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/desktopControls.js | - | - | zone |
| `_netHold` | never set | ui/BroTown.jsx | - | 8: ui/BroTown.jsx, game/achievements.js, game/dailyRewards.js, +5 | no-set | - | rejoin |
| `_npcProxLatch` | never set | ui/BroTown.jsx | - | ui/BroTown.jsx | no-set | - | zone |
| `_perf` | fly :4917 | ui/BroTown.jsx | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/renderFrame.js | - | - | never |
| `_petFetch` | fly :7194 | ui/BroTown.jsx | 3: game/petFetch.js~, networking/wsClient.js, ui/BroTown.jsx | 3: ui/BroTown.jsx, networking/wsClient.js, rendering/systems/entityRenderer.js | 2+ | - | zone |
| `_petPrevPX` | fly :7199 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_petPrevPY` | fly :7199 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_petX` | fly :7163 | ui/BroTown.jsx | 4: ui/BroTown.jsx, game/trapping.js, ui/panels/InventoryPanel.jsx, ui/panels/PetHousePanel.jsx | 4: ui/BroTown.jsx, game/trapping.js, networking/wsClient.js, +1 | 2+ | - | zone |
| `_petY` | fly :7164 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/trapping.js | 4: ui/BroTown.jsx, game/trapping.js, networking/wsClient.js, +1 | 2+ | - | zone |
| `_playerCount` | fly :2357 | ui/BroTown.jsx | ui/BroTown.jsx | ui/mobile/ChatBubble.jsx | - | - | rejoin |
| `_playtimeTick` | fly :7774 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_proxNode` | fly :6092 | ui/BroTown.jsx | ui/BroTown.jsx | 2: game/desktopControls.js, ui/BroTown.jsx | - | - | zone |
| `_pvpReputation` | never set | ui/BroTown.jsx | - | ui/BroTown.jsx | no-set | - | never |
| `_rBtnLiveUntil` | fly :6416 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_rBtnPressUntil` | fly :6432 | ui/BroTown.jsx | ui/BroTown.jsx | 2: game/tapJump.js, ui/BroTown.jsx | - | - | never |
| `_rBtnShown` | fly :6727 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_rJoyLiveUntil` | fly :10295 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_raft` | first :1273 | ui/BroTown.jsx | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/zoneMechanics.js | flag | - | never |
| `_railCss` | fly :5932 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_railCssAt` | fly :5930 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_restPending` | fly :8037 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | flag | - | never |
| `_resumeSpot` | fly :12549 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read (tests) | - | never |
| `_shieldAimMouse` | fly :8333 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_shieldAngle` | fly :8336 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/shieldToggle.js | 7: rendering/systems/entityRenderer.js, game/abilities.js, game/combatHelpers.js, +4 | 2+ | - | death |
| `_shieldKb` | fly :9997 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/shieldToggle.js | ui/BroTown.jsx | 2+, flag | - | death |
| `_shieldMouse` | fly :9990 | ui/BroTown.jsx | 3: ui/BroTown.jsx, game/desktopControls.js, game/shieldToggle.js | game/desktopControls.js | 2+, flag | - | death |
| `_sled` | first :1269 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/zoneMechanics.js | 4: game/zoneMechanics.js, ui/BroTown.jsx, game/climbActions.js, +1 | 2+ | - | zone |
| `_sleeping` | fly :5705 | ui/BroTown.jsx | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/interactions.js | - | - | zone |
| `_slideVx` | fly :5058 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | zone |
| `_slideVy` | fly :5058 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | zone |
| `_snowballCd` | fly :14622 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_snowballs` | first :1265 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/zoneMechanics.js | - | 2+, no-read | - | zone |
| `_snowmen` | first :1267 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/zoneMechanics.js | ui/BroTown.jsx | 2+ | - | zone |
| `_spdBuffMul` | fly :15554 | ui/BroTown.jsx | 3: networking/wsClient.js, ui/BroTown.jsx, ui/panels/buildings/CookPanel.jsx | ui/BroTown.jsx | 2+ | - | rejoin |
| `_staleTouches` | fly :11909 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read (tests) | - | never |
| `_statsSavedJson` | fly :9099 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_tapActs` | fly :11602 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read | - | never |
| `_tapEmptySeq` | fly :13660 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_torch` | first :1271 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/zoneMechanics.js | 2: ui/BroTown.jsx, game/zoneMechanics.js | 2+ | - | zone |
| `_touchHandledAt` | fly :13091 | ui/BroTown.jsx | 2: ui/BroTown.jsx, ui/ExtractionSwipeLayer.jsx | ui/BroTown.jsx | 2+ | - | never |
| `_tourStarted` | fly :2117 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_townArtHold` | never set | ui/BroTown.jsx | - | 6: ui/BroTown.jsx, game/dungeonArt.js, game/farmTrip.js, +3 | no-set | - | zone |
| `_trailTimer` | fly :7126 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_tutorialDoneAt` | fly :7870 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `_tutorialStep` | fly :2089 | ui/BroTown.jsx | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/playerActions.js | - | - | never |
| `_uiBusy` | never set | ui/BroTown.jsx | - | 2: ui/BroTown.jsx, game/contextButton.js | no-set | - | never |
| `_userCycledSlot` | fly :10035 | ui/BroTown.jsx | ui/BroTown.jsx | networking/wsClient.js | flag | - | never |
| `_viewH` | fly :5016 | ui/BroTown.jsx | 2: rendering/pixiRenderer.js, ui/BroTown.jsx | 16: rendering/systems/entityRenderer.js, game/targeting.js, rendering/wheelDoors.js, +13 | 2+ | - | never |
| `_viewW` | fly :5015 | ui/BroTown.jsx | 2: rendering/pixiRenderer.js, ui/BroTown.jsx | 18: rendering/systems/entityRenderer.js, rendering/systems/effectsRenderer.js, game/targeting.js, +15 | 2+ | - | never |
| `_wasMovingBcast` | fly :8038 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | flag | - | never |
| `_weaponSwapFlash` | fly :10051 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read | - | never |
| `_wellRestedUntil` | never set | ui/BroTown.jsx | - | 2: ui/BroTown.jsx, ui/panels/buildings/FarmPanel.jsx | no-set | - | death |
| `_wheelMem` | fly :13368 | ui/BroTown.jsx | 2: game/deskCombos.js~, ui/BroTown.jsx | ui/BroTown.jsx | 2+~ | - | never |
| `autoAttack` | first :1216 | ui/BroTown.jsx | 5: ui/BroTown.jsx, game/climbActions.js, game/freeAttack.js, game/shieldToggle.js, game/tapJump.js | 9: ui/BroTown.jsx, game/monsterCombat.js, rendering/systems/effectsRenderer.js, +6 | 2+ | - | zone |
| `bodyLegs` | first :1214 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/characterRecord.js | 3: ui/BroTown.jsx, networking/wsClient.js, rendering/systems/entityRenderer.js | 2+ | rejoin | never |
| `bodySize` | first :1215 | ui/BroTown.jsx | ui/BroTown.jsx | 3: networking/wsClient.js, rendering/systems/entityRenderer.js, ui/BroTown.jsx | - | - | never |
| `bodyTorso` | first :1213 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/characterRecord.js | 3: ui/BroTown.jsx, networking/wsClient.js, rendering/systems/entityRenderer.js | 2+ | rejoin | never |
| `camera` | first :1132 | ui/BroTown.jsx | 2: game/zoneTransitions.js, ui/BroTown.jsx | 27: ui/BroTown.jsx, rendering/systems/effectsRenderer.js, rendering/systems/entityRenderer.js, +24 | 2+ | zone | zone |
| `collectedIds` | first :1226 | ui/BroTown.jsx | - | - | no-read | - | never |
| `collectibles` | first :1224 | ui/BroTown.jsx | ui/BroTown.jsx | - | no-read | - | zone |
| `destroyedTrees` | first :1240 | ui/BroTown.jsx | - | - | no-read | - | zone |
| `fishTimer` | first :1242 | ui/BroTown.jsx | - | - | no-read | - | zone |
| `lastBroadcast` | first :1208 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | never |
| `lockedTarget` | first :1245 | ui/BroTown.jsx | 17: game/targeting.js, ui/BroTown.jsx, data/gameSystems.js~, game/zoneTransitions.js, game/duelLock.js, +12 | 26: game/monsterCombat.js, rendering/systems/effectsRenderer.js, ui/BroTown.jsx, +23 | 2+ | zone, death, rejoin | zone+rejoin |
| `myAvatar` | first :1204 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/characterRecord.js | 5: ui/BroTown.jsx, rendering/systems/entityRenderer.js, networking/wsClient.js, +2 | 2+ | rejoin | never |
| `myBroData` | first :1205 | ui/BroTown.jsx | ui/BroTown.jsx | 2: ui/BroTown.jsx, ui/panels/InfoPanel.jsx | - | - | never |
| `myColor` | first :1203 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/characterRecord.js | 8: ui/BroTown.jsx, game/chat.js, ui/mobile/ChatBubble.jsx, +5 | 2+ | rejoin | never |
| `myName` | first :1202 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/characterRecord.js | 18: ui/BroTown.jsx, game/chat.js, networking/wsClient.js, +15 | 2+ | rejoin | never |
| `nearBuilding` | first :1211 | ui/BroTown.jsx | ui/BroTown.jsx | 3: game/desktopControls.js, ui/BroTown.jsx, game/interactions.js | - | - | zone |
| `npcs` | first :1230 | ui/BroTown.jsx | 15: ui/BroTown.jsx, game/townsfolkDay.js~, game/monsterCombat.js~, game/race.js~, game/moveSounds.js~, +10 | 17: ui/BroTown.jsx, game/questRoute.js, game/monsterCombat.js, +14 | 2+ | zone, death | zone |
| `rpg` | first :1234 | ui/BroTown.jsx | 49: ui/BroTown.jsx, networking/wsClient.js, data/gameSystems.js~, networking/gameEvents.js, ui/mobile/dash/equipActions.js~, +44 | 139: ui/BroTown.jsx, networking/wsClient.js, game/monsterCombat.js, +136 | 2+ | zone, rejoin | never |
| `score` | first :1228 | ui/BroTown.jsx | - | - | no-read (tests) | - | never |
| `shieldEnd` | first :1281 | ui/BroTown.jsx | 2: ui/BroTown.jsx, game/shieldToggle.js | 2: game/monsterCombat.js, game/projectiles.js | 2+ | - | death |
| `stats` | first :1283 | ui/BroTown.jsx | 9: game/interactions.js, networking/gameEvents.js, ui/BroTown.jsx, game/chat.js, game/zoneMechanics.js, +4 | 10: game/interactions.js, ui/BroTown.jsx, game/chat.js, +7 | 2+ | - | never |
| `swingAngle` | first :1247 | ui/BroTown.jsx | - | - | no-read | - | never |
| `trail` | first :1222 | ui/BroTown.jsx | ui/BroTown.jsx | ui/BroTown.jsx | - | - | zone |
| `weapon` | first :1217 | ui/BroTown.jsx | - | - | no-read (tests) | - | never |
| `_harvestKeys` | fly :729 | ui/ExtractionSwipeLayer.jsx | ui/ExtractionSwipeLayer.jsx | game/desktopControls.js | - | - | never |
| `activeQuest` | never set | ui/GameApp.jsx | - | ui/GameApp.jsx | no-set | - | never |
| `journey` | never set | ui/GameApp.jsx | - | ui/GameApp.jsx | no-set | - | never |
| `rpgState` | never set | ui/GameApp.jsx | - | ui/GameApp.jsx | no-set | - | never |
| `_dropLinesAt` | fly :608 | ui/XpFlyOverlay.jsx | 2: game/killXp.js, ui/XpFlyOverlay.jsx | game/dropLines.js | 2+ | - | never |
| `_hudPopups` | fly :555 | ui/XpFlyOverlay.jsx | ui/XpFlyOverlay.jsx | 2: ui/XpFlyOverlay.jsx, ui/mobile/ZoneHeader.jsx | - | - | never |
| `_xpBarLastGainTs` | fly :211 | ui/XpFlyOverlay.jsx | ui/XpFlyOverlay.jsx | ui/XpFlyOverlay.jsx | - | - | never |
| `_teachNode` | fly :136 | ui/deskTeach.js | ui/deskTeach.js | rendering/systems/wheelMinimap.js | - | - | zone |
| `visitedZones` | never set | ui/mobile/dash/MapPanel.jsx | - | ui/mobile/dash/MapPanel.jsx | no-set | - | never |
| `playerId` | never set | ui/mobile/dash/itemActions.js | - | 2: ui/mobile/dash/itemActions.js, ui/panels/InventoryPanel.jsx | no-set | - | never |
| `_blocked` | fly :158 | ui/mobile/sheet/friendsModel.js | ui/mobile/sheet/friendsModel.js | ui/mobile/sheet/friendsModel.js | - | - | never |
| `_friends` | fly :147 | ui/mobile/sheet/friendsModel.js | ui/mobile/sheet/friendsModel.js | ui/mobile/sheet/friendsModel.js | - | - | never |
| `blocked` | fly :158 | ui/mobile/sheet/friendsModel.js | ui/mobile/sheet/friendsModel.js | ui/mobile/sheet/friendsModel.js | - | - | never |
| `friends` | fly :147 | ui/mobile/sheet/friendsModel.js | ui/mobile/sheet/friendsModel.js | ui/mobile/sheet/friendsModel.js | - | - | never |
| `zone` | never set | ui/mobile/sheet/friendsModel.js | - | ui/mobile/sheet/friendsModel.js | no-set | - | never |
| `_pendingClanInvite` | fly :28 | ui/panels/ClanInviteCard.jsx | 3: ui/panels/ClanInviteCard.jsx, networking/gameEvents.js, ui/panels/ClanPanel.jsx | 4: ui/BroTown.jsx, networking/gameEvents.js, ui/panels/ClanPanel.jsx, +1 | 2+ | - | rejoin |
| `_clanData` | fly :564 | ui/panels/ClanPanel.jsx | 3: ui/panels/ClanPanel.jsx, networking/gameEvents.js, ui/BroTown.jsx | 9: networking/gameEvents.js, ui/BroTown.jsx, ui/panels/WarBanner.jsx, +6 | 2+ | - | rejoin |
| `_clanPaintColor` | fly :491 | ui/panels/ClanPanel.jsx | ui/panels/ClanPanel.jsx | ui/panels/ClanPanel.jsx | - | - | never |
| `_clanPainting` | fly :570 | ui/panels/ClanPanel.jsx | ui/panels/ClanPanel.jsx | ui/panels/ClanPanel.jsx | flag | - | never |
| `_warTarget` | fly :866 | ui/panels/ClanPanel.jsx | ui/panels/ClanPanel.jsx | ui/panels/ClanPanel.jsx | - | - | never |
| `_warTargetData` | fly :867 | ui/panels/ClanPanel.jsx | ui/panels/ClanPanel.jsx | ui/panels/ClanPanel.jsx | - | - | never |
| `_warZone` | fly :791 | ui/panels/ClanPanel.jsx | ui/panels/ClanPanel.jsx | ui/panels/ClanPanel.jsx | - | - | never |
| `_customDungeonTerrain` | fly :938 | ui/panels/DungeonCreatorPanel.jsx | ui/panels/DungeonCreatorPanel.jsx | - | no-read | - | zone |
| `_preDungeonMap` | fly :898 | ui/panels/DungeonCreatorPanel.jsx | ui/panels/DungeonCreatorPanel.jsx | - | no-read | - | zone |
| `_preDungeonMonsters` | fly :899 | ui/panels/DungeonCreatorPanel.jsx | ui/panels/DungeonCreatorPanel.jsx | - | no-read | - | zone |
| `_preDungeonNodes` | fly :900 | ui/panels/DungeonCreatorPanel.jsx | ui/panels/DungeonCreatorPanel.jsx | - | no-read | - | zone |
| `_fbLastFilter` | fly :171 | ui/panels/FeedbackPanel.jsx | ui/panels/FeedbackPanel.jsx | ui/panels/FeedbackPanel.jsx | - | - | never |
| `_pvpThreatCdUntil` | fly :565 | ui/panels/InspectPlayerPanel.jsx | ui/panels/InspectPlayerPanel.jsx | ui/panels/InspectPlayerPanel.jsx | - | - | never |
| `_lbLastTab` | fly :168 | ui/panels/LeaderboardPanel.jsx | ui/panels/LeaderboardPanel.jsx | ui/panels/LeaderboardPanel.jsx | - | - | never |
| `_lbServerData` | fly :169 | ui/panels/LeaderboardPanel.jsx | ui/panels/LeaderboardPanel.jsx | ui/panels/LeaderboardPanel.jsx | - | - | never |
| `_mktLastRefresh` | fly :828 | ui/panels/buildings/ExchangePanel.jsx | ui/panels/buildings/ExchangePanel.jsx | ui/panels/buildings/ExchangePanel.jsx | - | - | never |
| `_gambleWager` | fly :153 | ui/panels/buildings/GamblePanel.jsx | ui/panels/buildings/GamblePanel.jsx | ui/panels/buildings/GamblePanel.jsx | - | - | never |
| `_arenaHistoryLoaded` | fly :944 | ui/panels/buildings/PartyPanel.jsx | ui/panels/buildings/PartyPanel.jsx | ui/panels/buildings/PartyPanel.jsx | flag | - | never |
| `_arenaLastPoll` | fly :199 | ui/panels/buildings/PartyPanel.jsx | ui/panels/buildings/PartyPanel.jsx | ui/panels/buildings/PartyPanel.jsx | - | - | never |
| `_smithyTab` | fly :113 | ui/panels/buildings/SmithyPanel.jsx | ui/panels/buildings/SmithyPanel.jsx | ui/panels/buildings/SmithyPanel.jsx | - | - | never |
| `_wwType` | fly :77 | ui/panels/buildings/WoodworkPanel.jsx | ui/panels/buildings/WoodworkPanel.jsx | ui/panels/buildings/WoodworkPanel.jsx | - | - | never |

## The phases (step 5.3b's starting list)

Every row marked `phase`, with the words the code sets it to or compares it with, and how many functions
set it (a phase with one door has one).

| where | name | the words seen | set in |
|---|---|---|---|
| `S` | `_realtimeStatus` | connected, frozen, idle, rejected, superseded | 1: game/connectionDoor.js connTo |
| `S` | `_latchPhase` | idle | 1: game/latch.js latchTo |
| `S` | `_pvpSkullType` | red, white | 1: game/skullDoor.js skullTo |
| `S` | `_lockDroppedWhy` | dead, far, gone, latch, weapon | 2 functions |
| `S` | `currentZone` | farm_home, frost, hollows, tidal, town, wheel | 1: game/zoneTransitions.js changeZone |
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
| data/soundFold.js | 122 | `_sa` | let null | own | own | - | - | ? |
| data/soundFold.js | 122 | `_sb` | let null | own | own | - | - | ? |
| data/soundFold.js | 122 | `_sm` | let null | own | own | - | - | ? |
| data/soundFold.js | 123 | `_slicedLine` | let call | own | own | - | - | ? |
| data/statDemoAssets.js | 44 | `_blueSheets` | let null | own | own | - | - | never |
| data/weaponFeelSound.js | 39 | `_noise` | var null | own | own | - | - | never |
| data/wheelLands.js | 22 | `LOOK` | const object | own | own | - | - | never |
| data/worldProps.js | 838 | `_blockerCache` | const object | own | own | - | - | never |
| data/worldProps.js | 848 | `_blockerHook` | let null | own | own | - | - | zone |
| data/zoneBanner.js | 50 | `ZONE_BANNER_THEME` | const object | own | 2: rendering/zoneBannerPreload.js, data/zoneBanner.js | - | - | never |
| data/zoneBanner.js | 86 | `ZONE_BANNER_STRIPS` | const object | own | 2: rendering/zoneBannerPreload.js, data/zoneBanner.js | - | - | never |
| data/zones.js | 2 | `ZONES` | const object | 4: networking/gameEvents.js, data/gameDisplay.js, game/wheelDungeons.js, game/zoneTransitions.js | 50: game/zoneTransitions.js, game/wheelDungeons.js, networking/gameEvents.js, +47 | 2+ | zone, death | never |
| debug/busyBeat.js | 23 | `_base` | let value | own | own | - | - | never |
| debug/busyBeat.js | 23 | `_last` | let number | own | own | - | - | never |
| debug/busyBeat.js | 23 | `_n` | let number | own | own | - | - | never |
| debug/busyBeat.js | 23 | `_on` | let bool | own | own | flag | - | never |
| debug/busyBeat.js | 24 | `_gaps` | const typed array | own | own | - | - | never |
| debug/busyBeat.js | 25 | `_gi` | let number | own | own | - | - | never |
| debug/busyBeat.js | 25 | `_gn` | let number | own | own | - | - | never |
| debug/busyBeat.js | 26 | `_held` | const array | own | own | - | - | never |
| debug/crashTrap.js | 50 | `_flushTimer` | let null | own | own | - | - | never |
| debug/crashTrap.js | 51 | `_flushAt` | let number | own | own | - | - | never |
| debug/crashTrap.js | 54 | `_lastSentKey` | let string | own | own | - | - | never |
| debug/crashTrap.js | 125 | `_rebuilds` | let number | own | own | - | - | never |
| debug/crashTrap.js | 173 | `_aliveAt` | let number | own | own | - | - | never |
| debug/crashTrap.js | 174 | `_aliveChan` | let null | own | own | - | - | never |
| debug/crashTrap.js | 192 | `_markWhere` | let null | own | own | - | - | ? |
| debug/crashTrap.js | 193 | `_death` | let null | own | own | - | - | ? |
| debug/crashTrap.js | 194 | `_glLost` | let number | own | own | - | - | ? |
| debug/debugBus.js | 10 | `listeners` | const Set | own | own | - | - | never |
| debug/debugBus.js | 11 | `logs` | const array | own | own | - | - | never |
| debug/debugBus.js | 12 | `wsFrames` | const array | own | own | - | - | never |
| debug/debugBus.js | 13 | `commands` | const Map | own | own | - | - | never |
| debug/debugBus.js | 14 | `commandHistory` | let array | own | own | - | - | never |
| debug/debugBus.js | 16 | `state` | const object | own | own | - | - | never |
| debug/debugBus.js | 51 | `consoleHooked` | let bool | own | own | flag | - | never |
| debug/debugBus.js | 72 | `wsHooked` | let bool | own | own | flag | - | never |
| debug/debugBus.js | 204 | `debugBus` | const object | debug/DebugOverlay.jsx | 4: debug/DebugOverlay.jsx, ui/GameApp.jsx, debug/debugBus.js, +1 | - | - | never |
| debug/perfHud.js | 44 | `_stickHi` | let number | own | own | - | - | never |
| debug/perfHud.js | 44 | `_stickLo` | let number | own | own | - | - | never |
| debug/perfHud.js | 44 | `_stickOn` | let bool | own | own | flag | - | never |
| debug/perfHud.js | 65 | `el` | let null | own | own | - | - | never |
| debug/perfHud.js | 138 | `_chip` | let null | own | own | - | - | never |
| debug/perfTracker.js | 31 | `ring` | const array | own | own | - | - | never |
| debug/perfTracker.js | 32 | `ringIdx` | let number | own | own | - | - | never |
| debug/perfTracker.js | 33 | `ringCount` | let number | own | own | - | - | never |
| debug/perfTracker.js | 35 | `longFrames` | const array | own | own | - | - | never |
| debug/perfTracker.js | 36 | `longTasks` | const array | own | own | - | - | never |
| debug/perfTracker.js | 37 | `extEvents` | const array | own | own | - | - | never |
| debug/perfTracker.js | 50 | `zoneStats` | let call | own | own | - | zone | zone |
| debug/perfTracker.js | 56 | `spikeLastT` | let number | own | own | - | - | never |
| debug/perfTracker.js | 57 | `spikeWorst` | let null | own | own | - | - | never |
| debug/perfTracker.js | 59 | `longTaskObserver` | let null | own | own | - | - | never |
| debug/perfTracker.js | 90 | `timersHooked` | let bool | own | own | flag | - | never |
| debug/report.js | 292 | `_S` | let null | own | own | - | rejoin | ? |
| debug/report.js | 293 | `_timer` | let null | own | own | - | rejoin | ? |
| debug/report.js | 294 | `_joinedAt` | let number | own | own | - | rejoin | ? |
| debug/report.js | 295 | `_dueAt` | let number | own | own | - | rejoin | ? |
| debug/report.js | 296 | `_died` | let null | own | own | - | - | ? |
| debug/report.js | 297 | `_selfSaid` | const Set | own | own | - | - | ? |
| debug/report.js | 298 | `_diedOwed` | let bool | own | own | flag | rejoin | ? |
| debug/report.js | 299 | `_lastFrameT` | let number | own | own | - | - | ? |
| debug/report.js | 299 | `_lastHoldT` | let number | own | own | - | - | ? |
| debug/report.js | 300 | `_a` | let null | own | own | - | - | ? |
| debug/report.js | 305 | `_visSince` | let null | own | own | - | rejoin | ? |
| debug/report.js | 309 | `_upBank` | let number | own | own | - | - | ? |
| debug/report.js | 313 | `_shows` | const array | own | own | - | - | ? |
| debug/report.js | 315 | `_last` | let null | own | own | - | - | ? |
| debug/report.js | 316 | `_dropped` | let number | own | own | - | - | ? |
| debug/report.js | 316 | `_sent` | let number | own | own | - | - | ? |
| debug/report.js | 317 | `_speed` | let null | own | own | - | - | ? |
| debug/report.js | 318 | `_lastSentAt` | let number | own | own | - | - | ? |
| debug/report.js | 331 | `_lastPollP` | let number | own | own | - | - | ? |
| game/accuracy.js | 58 | `listeners` | const Set | own | own | - | - | never |
| game/achievements.js | 229 | `_titlePick` | let bool | own | own | flag | - | never |
| game/actions.js | 472 | `_reqN` | let number | own | own | - | - | ? |
| game/actions.js | 482 | `_refused` | const object | own | own | - | - | ? |
| game/actions.js | 483 | `_refusedTotal` | let number | own | own | - | - | ? |
| game/actions.js | 504 | `_t` | let null | own | own | - | - | ? |
| game/alliance.js | 18 | `listeners` | const Set | own | own | - | - | never |
| game/allyDrafts.js | 22 | `_drafts` | const Map | own | own | - | - | ? |
| game/ambientBeds.js | 64 | `st` | const object | own | own | - | - | never |
| game/bank.js | 23 | `listeners` | const Set | own | own | - | - | never |
| game/bank.js | 24 | `rev` | let number | own | own | - | - | never |
| game/bank.js | 34 | `seq` | let number | own | own | - | - | never |
| game/bowFeel.js | 56 | `_wanted` | let null | own | own | - | - | never |
| game/buildingRooms.js | 43 | `_held` | let null | own | own | - | - | zone |
| game/buildingRooms.js | 44 | `_prefetchStarted` | let bool | own | own | flag | - | never |
| game/characterCreatorEffects.js | 211 | `_offCanvas` | let null | own | own | - | - | never |
| game/characterCreatorEffects.js | 214 | `_cam` | let null | own | own | - | - | never |
| game/characterCreatorEffects.js | 218 | `_figBounds` | let null | own | own | - | - | never |
| game/chat.js | 62 | `_moveSender` | var null | own | own | - | - | never |
| game/chatChannel.js | 69 | `_mode` | let call | own | own | phase | - | never |
| game/chatChannel.js | 70 | `_to` | let string | own | own | - | - | never |
| game/chatChannel.js | 71 | `listeners` | const Set | own | own | - | - | never |
| game/chatMute.js | 39 | `_subs` | var array | own | own | - | - | never |
| game/chatMute.js | 91 | `_blockSubs` | var array | own | own | - | - | never |
| game/chatMute.js | 159 | `_kept` | var Map | own | own | - | - | rejoin |
| game/clientOff.js | 74 | `_live` | let null | own | own | - | rejoin | rejoin |
| game/clientOff.js | 75 | `_atLoad` | let null | own | own | - | - | never |
| game/clientOff.js | 76 | `_subs` | const array | own | own | - | - | never |
| game/climbActions.js | 42 | `climbStats` | const object | own | own | - | - | never |
| game/climbActions.js | 160 | `_lastS` | let null | own | own | - | - | never |
| game/combatHelpers.js | 1103 | `_propSlashFlip` | var number | own | - | no-read | - | never |
| game/controlVisibility.js | 39 | `HOLDS` | const object | own | own | - | - | never |
| game/crowdCap.js | 53 | `_urlK` | let none | own | own | - | - | ? |
| game/crowdCap.js | 84 | `_near` | let value | own | own | - | - | ? |
| game/dailyRewards.js | 27 | `_state` | let null | own | own | - | - | rejoin |
| game/dailyRewards.js | 28 | `_lastSpin` | let null | own | own | - | - | never |
| game/dailyRewards.js | 29 | `_win` | let object | own | own | - | - | never |
| game/dailyRewards.js | 30 | `_listeners` | const Set | own | own | - | - | never |
| game/dailyRewards.js | 87 | `_spinSeq` | let number | own | - | no-read | - | never |
| game/dashSidePref.js | 70 | `_pref` | let call | own | own | - | - | never |
| game/deskKeys.js | 50 | `NAV_BY_CODE` | const object | own | own | - | - | never |
| game/deviceProfile.js | 59 | `_mq` | const object | own | own | - | - | never |
| game/deviceProfile.js | 193 | `_lookChoice` | let null | own | own | - | - | ? |
| game/deviceProfile.js | 368 | `_chipOf` | const WeakMap | own | own | - | - | ? |
| game/drawLanes.js | 314 | `_ask` | let null | own | own | - | - | ? |
| game/drawLanes.js | 315 | `_askNow` | let null | own | own | - | - | ? |
| game/drawLanes.js | 362 | `_classOf` | let null | own | own | - | - | ? |
| game/drawLanes.js | 363 | `_lane` | let null | own | own | - | - | ? |
| game/drawLanes.js | 364 | `_laneAskedAt` | let number | own | own | - | - | ? |
| game/drawLanes.js | 365 | `_urlLane` | let none | own | own | - | - | ? |
| game/drawLanes.js | 366 | `_subs` | const object | own | own | - | - | ? |
| game/drawLanes.js | 367 | `_told` | const object | own | own | - | - | ? |
| game/drawLanes.js | 412 | `LANE` | const object | own | own | - | - | ? |
| game/drawLanes.js | 433 | `_live` | let value | own | own | - | - | ? |
| game/drawLanes.js | 434 | `_liveNow` | let null | own | own | - | - | ? |
| game/drawLanes.js | 540 | `_seen` | const object | own | own | - | - | ? |
| game/dropLook.js | 13 | `thumb` | let null | own | own | - | - | never |
| game/dungeonArt.js | 56 | `_live` | const Set | own | own | - | - | zone |
| game/dungeonClear.js | 20 | `subs` | const Set | own | own | - | - | never |
| game/eventSounds.js | 37 | `cueStats` | const object | own | own | - | zone, death | never |
| game/eventSounds.js | 43 | `_lastAt` | const Map | own | own | - | zone, death | never |
| game/eventSounds.js | 44 | `_peerAt` | let array | own | own | - | - | never |
| game/eventSounds.js | 140 | `_stepAt` | let array | own | own | - | - | never |
| game/farmFeedback.js | 70 | `toldRipe` | let number | own | own | - | - | never |
| game/farmTrip.js | 29 | `_seq` | let number | own | - | no-read | zone | never |
| game/fishWeigh.js | 16 | `listeners` | const Set | own | own | - | - | never |
| game/fishWeigh.js | 17 | `st` | const object | own | own | - | - | rejoin |
| game/framePacer.js | 430 | `_busyIn` | let null | own | own | - | - | ? |
| game/framePacer.js | 430 | `_samples` | let null | own | own | - | - | ? |
| game/framePacer.js | 465 | `_memAt` | let number | own | own | - | - | ? |
| game/framePacer.js | 465 | `_memCount` | let null | own | own | - | - | ? |
| game/framePacer.js | 465 | `_memForce` | let number | own | own | - | - | ? |
| game/framePacer.js | 465 | `_memTotal` | let null | own | own | - | - | ? |
| game/framePacer.js | 465 | `_memWas` | let bool | own | own | - | - | ? |
| game/framePacer.js | 520 | `_held` | let bool | own | own | flag | - | ? |
| game/framePacer.js | 528 | `_hides` | let number | own | own | - | - | ? |
| game/framePacer.js | 528 | `_returned` | let bool | own | own | flag | - | ? |
| game/framePacer.js | 528 | `_wasHidden` | let bool | own | own | flag | - | ? |
| game/framePacer.js | 880 | `_drawnAt` | let null | own | own | - | - | never |
| game/framePacer.js | 910 | `_before` | const array | own | own | - | - | never |
| game/friendErrors.js | 46 | `lastAt` | const Map | own | own | - | - | never |
| game/hitSounds.js | 66 | `hitSoundStats` | const object | own | own | - | - | never |
| game/hitSounds.js | 118 | `_echoAt` | let array | own | own | - | - | never |
| game/jumpActions.js | 29 | `_jumpMs` | var none | own | own | - | - | never |
| game/latch.js | 269 | `_range` | let call | own | own | - | - | ? |
| game/latch.js | 271 | `_zoneWas` | let none | own | own | - | - | ? |
| game/latch.js | 273 | `_T` | const object | own | own | - | - | ? |
| game/latch.js | 275 | `_V` | const object | own | own | - | - | ? |
| game/latch.js | 280 | `_vh` | let number | own | own | - | - | ? |
| game/latch.js | 280 | `_vw` | let number | own | own | - | - | ? |
| game/loadTimes.js | 28 | `_marks` | const array | own | own | - | zone | never |
| game/loadTimes.js | 29 | `_seen` | const object | own | own | - | zone | never |
| game/loadTimes.js | 30 | `_groups` | const object | own | own | - | - | never |
| game/loadTimes.js | 31 | `_groupsFrom` | let null | own | own | - | - | never |
| game/loginSpinWheel.js | 65 | `listeners` | const Set | own | own | - | - | never |
| game/loginSpinWheel.js | 66 | `_st` | let object | own | own | - | - | rejoin |
| game/manualCombat.js | 247 | `_mode` | var null | own | own | - | - | never |
| game/manualCombat.js | 344 | `_bowHook` | var null | own | own | - | - | never |
| game/mastery.js | 60 | `_level` | let null | own | own | - | - | never |
| game/mastery.js | 61 | `_certs` | let null | own | own | - | - | never |
| game/mastery.js | 62 | `_timestamps` | let null | own | own | - | - | never |
| game/mastery.js | 88 | `subscribers` | const Set | own | own | - | - | never |
| game/monsterMoves.js | 31 | `_caps` | let null | own | own | - | rejoin | rejoin |
| game/nmlAsk.js | 141 | `_ask` | let null | own | own | - | - | zone |
| game/nmlAsk.js | 142 | `_subs` | const Set | own | own | - | - | never |
| game/nmlAsk.js | 161 | `_msOverride` | let number | own | own | - | - | never |
| game/nmlAsk.js | 289 | `_joins` | const array | own | own | - | - | never |
| game/nmlExplainOnce.js | 48 | `_told` | const Set | own | own | - | - | never |
| game/noMansLand.js | 195 | `_note` | const object | own | own | - | - | zone |
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
| game/questKept.js | 23 | `_kept` | const Map | own | own | - | rejoin | rejoin |
| game/questTrailStyle.js | 93 | `_style` | let call | own | own | - | - | never |
| game/questTrailStyle.js | 119 | `_lastShown` | let call | own | own | - | - | never |
| game/race.js | 47 | `_subs` | const Set | own | own | - | - | never |
| game/renderRes.js | 131 | `_url` | let null | own | own | - | - | never |
| game/renderRes.js | 132 | `_live` | let number | own | own | - | - | never |
| game/renderRes.js | 133 | `_cssW` | let number | own | own | - | - | ? |
| game/renderRes.js | 134 | `_cssH` | let number | own | own | - | - | ? |
| game/renderRes.js | 135 | `_budgetOn` | let null | own | own | - | - | ? |
| game/renderRes.js | 136 | `_urlBudget` | let null | own | own | - | - | ? |
| game/renderRes.js | 137 | `_phone` | let bool | own | own | - | - | ? |
| game/renderRes.js | 138 | `_viewOut` | let null | own | own | - | - | ? |
| game/renderRes.js | 139 | `_pixF` | let number | own | own | - | - | ? |
| game/renderRes.js | 140 | `_pixOff` | let null | own | own | - | - | ? |
| game/resetOn.js | 48 | `resetStats` | const object | own | own | - | zone, rejoin | ? |
| game/revealBag.js | 78 | `_then` | const Map | own | own | - | - | rejoin |
| game/revealBag.js | 84 | `_held` | const Map | own | own | - | - | never |
| game/revealBag.js | 89 | `_after` | const array | own | own | - | - | never |
| game/ride.js | 369 | `_feelOn` | let null | own | own | - | - | ? |
| game/rideSound.js | 54 | `st` | const object | own | own | - | - | never |
| game/rpgSave.js | 26 | `_timer` | let null | own | own | - | - | never |
| game/rpgSave.js | 27 | `_lastWrite` | let number | own | own | - | - | never |
| game/salvage.js | 20 | `_last` | let null | own | own | - | - | never |
| game/salvage.js | 21 | `_listeners` | const Set | own | own | - | - | never |
| game/season.js | 28 | `_forced` | let none | own | own | - | - | never |
| game/shardCrack.js | 34 | `_last` | let null | own | own | - | - | never |
| game/shardCrack.js | 35 | `_pending` | let null | own | own | - | - | rejoin |
| game/shardCrack.js | 36 | `_seq` | let number | own | - | no-read | - | never |
| game/shardCrack.js | 37 | `_listeners` | const Set | own | own | - | - | never |
| game/shieldGem.js | 43 | `_last` | let null | own | own | - | - | never |
| game/shieldGem.js | 44 | `_pending` | let null | own | own | - | - | rejoin |
| game/shieldGem.js | 45 | `_listeners` | const Set | own | own | - | - | never |
| game/sight.js | 111 | `_off` | let number | own | own | - | - | ? |
| game/sight.js | 128 | `_PICK` | const object | own | own | - | - | ? |
| game/sight.js | 232 | `_LINE` | const object | own | own | - | - | ? |
| game/soundStudio.js | 32 | `_ring` | const array | own | own | - | - | never |
| game/soundStudio.js | 33 | `_next` | let number | own | own | - | - | never |
| game/soundStudio.js | 34 | `_seq` | let number | own | - | no-read | - | never |
| game/soundStudio.js | 83 | `_installed` | let bool | own | own | flag | - | never |
| game/soundStudio.js | 111 | `_host` | let null | own | own | - | - | never |
| game/soundStudio.js | 112 | `_root` | let null | own | own | - | - | never |
| game/soundStudio.js | 113 | `_opening` | let null | own | own | - | - | never |
| game/sparTargets.js | 127 | `_foeRule` | let null | own | own | - | - | never |
| game/speedTest.js | 228 | `_card` | let null | own | own | - | - | never |
| game/speedTest.js | 285 | `_running` | let bool | own | own | flag | - | never |
| game/spinBoard.js | 14 | `listeners` | const Set | own | own | - | - | never |
| game/staffFeel.js | 124 | `_wanted` | let null | own | own | - | - | never |
| game/staffFeel.js | 125 | `_audio` | let null | own | own | - | - | never |
| game/stickZones.js | 257 | `_turn` | let null | own | own | - | - | ? |
| game/stickZones.js | 331 | `_IN` | const object | own | own | - | - | ? |
| game/storeAnswer.js | 87 | `sellsOut` | const Map | own | own | - | - | never |
| game/switches.js | 408 | `_page` | let null | own | own | - | - | ? |
| game/switches.js | 409 | `_search` | let null | own | own | - | - | ? |
| game/swordFeel.js | 51 | `_wanted` | let null | own | own | - | - | never |
| game/tapJump.js | 79 | `_tapMs` | var none | own | own | - | - | never |
| game/timeOfDay.js | 39 | `OUTDOOR` | const object | own | own | - | - | never |
| game/timeOfDay.js | 108 | `_alwaysDay` | let bool | own | own | flag | - | never |
| game/townAmbience.js | 30 | `st` | const object | own | own | - | - | never |
| game/townChatter.js | 36 | `_off` | var null | own | own | - | - | never |
| game/townsfolkDay.js | 34 | `_givers` | let null | own | own | - | - | never |
| game/townsfolkDay.js | 35 | `_giverSrc` | let null | own | own | - | - | never |
| game/townsfolkDay.js | 46 | `_frame` | const object | own | own | - | - | never |
| game/townsfolkDay.js | 49 | `_bumpsTotal` | let number | own | own | - | - | never |
| game/townsfolkWalk.js | 173 | `_loops` | const WeakMap | own | own | - | - | never |
| game/trackedQuest.js | 24 | `_read` | let bool | own | own | flag | - | never |
| game/trackedQuest.js | 25 | `_id` | let null | own | own | - | - | never |
| game/trackedQuest.js | 27 | `_subs` | const Set | own | own | - | - | never |
| game/trapping.js | 363 | `_petVoiceLast` | let null | own | own | - | - | never |
| game/waterAmbience.js | 53 | `st` | const object | own | own | - | - | never |
| game/weaponGem.js | 33 | `_last` | let null | own | own | - | - | never |
| game/weaponGem.js | 34 | `_pending` | let null | own | own | - | - | rejoin |
| game/weaponGem.js | 35 | `_listeners` | const Set | own | own | - | - | never |
| game/wheelBreak.js | 52 | `_dmg` | const Map | own | own | - | - | zone |
| game/wheelBreak.js | 53 | `_broken` | const Map | own | own | - | - | zone |
| game/wheelBreak.js | 54 | `_events` | const array | own | own | - | - | zone |
| game/wheelBreak.js | 55 | `_src` | let null | own | own | - | - | zone |
| game/wheelBreak.js | 56 | `_catKind` | let null | own | own | - | - | never |
| game/wheelBreak.js | 58 | `wheelBreakStats` | const object | own | own | - | - | never |
| game/wheelBreak.js | 64 | `_listeners` | const Set | own | own | - | - | never |
| game/wheelDungeons.js | 105 | `_doors` | let array | own | own | - | - | never |
| game/wheelDungeons.js | 105 | `_doorsOf` | let null | own | own | - | - | never |
| game/wheelDungeons.js | 138 | `_open` | let array | own | own | - | - | never |
| game/wheelDungeons.js | 138 | `_openN` | let number | own | own | - | - | never |
| game/wheelDungeons.js | 138 | `_openOf` | let null | own | own | - | - | never |
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
| game/wheelTrial.js | 46 | `_w` | let null | own | own | - | - | zone |
| game/wheelTrial.js | 47 | `_initP` | let null | own | own | - | - | zone |
| game/wheelTrial.js | 48 | `_info` | let null | own | own | - | - | zone |
| game/wheelTrial.js | 49 | `_grid` | let null | own | own | - | - | zone |
| game/wheelTrial.js | 53 | `_blocks` | const Map | own | own | - | - | zone |
| game/wheelTrial.js | 54 | `_rowsMade` | let null | own | own | - | - | zone |
| game/wheelTrial.js | 55 | `_overview` | let null | own | own | - | - | zone |
| game/wheelTrial.js | 56 | `_overviewLands` | let null | own | own | - | - | zone |
| game/wheelTrial.js | 57 | `_seq` | let number | own | - | no-read | - | never |
| game/wheelTrial.js | 58 | `_pending` | const Map | own | own | - | - | zone |
| game/wheelTrial.js | 59 | `_warm` | const Map | own | own | - | - | zone |
| game/wheelTrial.js | 60 | `_filling` | const Map | own | own | - | - | zone |
| game/wheelTrial.js | 61 | `_here` | let null | own | own | - | - | zone |
| game/wheelTrial.js | 62 | `_hereAsked` | let null | own | own | - | - | zone |
| game/wheelTrial.js | 63 | `_gotFns` | const Set | own | own | - | - | never |
| game/wheelTrial.js | 64 | `_under` | const Map | own | own | - | - | zone |
| game/wheelTrial.js | 66 | `wheelStats` | const object | 3: game/wheelTrial.js, rendering/wheelGround.js, game/worldTrial.js | 2: game/worldTrial.js, game/wheelTrial.js | 2+ | - | never |
| game/wheelTrial.js | 108 | `wheelObjectStats` | const object | rendering/wheelObjects.js | 3: game/worldTrial.js, rendering/wheelObjects.js, game/wheelTrial.js | - | - | never |
| game/wheelTrial.js | 137 | `_stopFns` | const Set | own | own | - | - | never |
| game/wheelTrial.js | 228 | `_waterMoves` | let bool | own | own | flag | - | never |
| game/wheelTrial.js | 235 | `_palette` | let bool | own | own | flag | - | never |
| game/wheelTrial.js | 254 | `_waitOn` | let bool | own | own | flag | - | never |
| game/wheelTrial.js | 260 | `_heapLean` | let bool | own | own | flag | - | never |
| game/wheelTrial.js | 264 | `_said` | let bool | own | own | flag | - | never |
| game/wheelTrial.js | 265 | `_sayWaiters` | let array | own | own | - | - | never |
| game/wheelTrial.js | 275 | `wheelSayStats` | const object | own | own | - | - | never |
| game/wheelTrial.js | 297 | `_failP` | let null | own | own | - | - | zone |
| game/wheelTrial.js | 297 | `_retryAt` | let number | own | own | - | - | zone |
| game/wheelTrial.js | 297 | `_retryWait` | let number | own | own | - | - | zone |
| game/wheelTrial.js | 539 | `_warmGen` | let number | own | own | - | - | never |
| game/wheelTrial.js | 540 | `_fills` | let number | own | - | no-read | - | never |
| game/wheelTrial.js | 719 | `_landsVer` | let number | own | own | - | - | never |
| game/wheelTrial.js | 720 | `_local` | let null | own | own | - | - | zone |
| game/worldTrial.js | 95 | `WHEEL` | let value | own | own | - | - | never |
| game/worldTrial.js | 100 | `_on` | let bool | own | own | flag | - | never |
| game/worldTrial.js | 101 | `_mode` | let null | own | own | - | - | never |
| game/worldTrial.js | 106 | `_spawnOff` | let bool | own | own | - | - | never |
| game/worldTrial.js | 118 | `_wayBack` | let bool | own | own | - | - | never |
| game/worldTrial.js | 121 | `_hudOn` | let bool | own | own | - | - | never |
| game/worldTrial.js | 122 | `_wheelAwayAt` | let number | own | own | - | - | never |
| game/worldTrial.js | 123 | `_ready` | let bool | own | own | flag | - | zone |
| game/worldTrial.js | 129 | `_readyGen` | let number | own | own | - | - | never |
| game/worldTrial.js | 265 | `_arriveAt` | let null | own | own | - | zone | zone |
| game/worldTrial.js | 424 | `_lastSurface` | let null | own | own | - | - | zone |
| game/worldTrial.js | 458 | `_hud` | let null | own | own | - | - | never |
| game/worldTrial.js | 459 | `_hudAt` | let number | own | own | - | - | never |
| game/xpBar.js | 139 | `_listeners` | const Set | own | own | - | - | never |
| game/zoneTransitions.js | 221 | `_zoneLoadEl` | var null | own | own | - | zone | zone |
| game/zoneTransitions.js | 288 | `_townFreeTimer` | var null | own | own | - | - | never |
| networking/broWallet.js | 36 | `state` | const object | own | own | - | - | never |
| networking/broWallet.js | 37 | `listeners` | const Set | own | own | - | - | never |
| networking/broWallet.js | 55 | `_pending` | let null | own | own | - | - | rejoin |
| networking/charRoster.js | 142 | `_lookAsked` | const Set | own | own | - | - | never |
| networking/charRoster.js | 241 | `_mirrorSeeded` | let bool | own | own | flag | - | never |
| networking/gameEvents.js | 53 | `_peerShotGame` | var null | own | own | - | - | never |
| networking/gameEvents.js | 173 | `_collisionNames` | var null | own | own | - | - | never |
| networking/rosterCookie.js | 123 | `_probedHost` | let null | own | own | - | - | never |
| networking/rosterCookie.js | 124 | `_domain` | let null | own | own | - | - | never |
| networking/serverReady.js | 62 | `_state` | let object | own | own | - | - | rejoin |
| networking/serverReady.js | 63 | `_waiters` | let array | own | own | - | rejoin | rejoin |
| networking/serverReady.js | 64 | `_subs` | let array | own | own | - | - | never |
| networking/serverReady.js | 135 | `_veil` | let null | own | own | - | - | rejoin |
| networking/serverReady.js | 136 | `_veilTimer` | let null | own | own | - | - | rejoin |
| networking/serverReady.js | 137 | `_installed` | let bool | own | own | flag | - | never |
| rendering/arenaWorld.js | 64 | `_live` | let null | own | own | - | - | zone |
| rendering/arrowPin.js | 40 | `_frameBytes` | let number | own | own | - | - | never |
| rendering/arrowPin.js | 41 | `_frames` | const Map | own | own | - | - | never |
| rendering/arrowWound.js | 57 | `_renderer` | let null | own | own | - | - | never |
| rendering/bakeByAddress.js | 37 | `_refused` | const Set | own | own | - | - | ? |
| rendering/bakeByAddress.js | 39 | `_stats` | const object | own | own | - | - | ? |
| rendering/bakeByAddress.js | 53 | `_reading` | const Map | own | own | - | - | ? |
| rendering/batchIdsLean.js | 25 | `_stats` | const object | own | own | - | - | never |
| rendering/beltHold.js | 43 | `_stats` | const object | own | own | - | - | ? |
| rendering/bindGroupFix.js | 45 | `_installed` | let bool | own | own | flag | - | never |
| rendering/bindGroupFix.js | 46 | `_swaps` | let number | own | own | - | - | never |
| rendering/blockArm.js | 143 | `_sheets` | const object | own | own | - | - | never |
| rendering/blockArm.js | 144 | `_cache` | const Map | own | own | - | - | never |
| rendering/blockArm.js | 145 | `_sleeveCache` | const Map | own | own | - | - | never |
| rendering/blockArm.js | 189 | `_peerArmCache` | const WeakMap | own | own | - | - | never |
| rendering/bodyBake.js | 47 | `_stats` | const object | own | own | - | - | never |
| rendering/bodyBake.js | 49 | `_dead` | let bool | own | own | flag | - | never |
| rendering/bodyBake.js | 49 | `_seq` | let number | own | - | no-read | - | never |
| rendering/bodyBake.js | 49 | `_started` | let number | own | own | - | - | never |
| rendering/bodyBake.js | 65 | `_pool` | const array | own | own | - | - | never |
| rendering/bodyBake.js | 67 | `_watchT` | let null | own | own | - | - | never |
| rendering/bodyBake.js | 92 | `_watchAt` | let number | own | own | - | - | ? |
| rendering/bodyBake.js | 133 | `_unheard` | let number | own | own | - | - | ? |
| rendering/bodyBake.js | 200 | `_line` | const array | own | own | - | - | never |
| rendering/bodyBakeWorker.js | 83 | `_line` | let call | own | own | - | - | never |
| rendering/bodyRecolor.js | 96 | `_eyeT` | let null | own | own | - | - | never |
| rendering/bodyRecolor.js | 609 | `_garmentLeft` | const object | own | own | - | - | never |
| rendering/bodyRecolor.js | 618 | `_pickWoodKept` | const object | own | own | - | - | never |
| rendering/bodyRecolor.js | 622 | `_toolSolid` | const object | own | own | - | - | never |
| rendering/bodyRecolor.js | 632 | `_bakeTag` | let string | own | own | phase | - | never |
| rendering/buildingFire.js | 719 | `_liveFires` | let null | own | own | - | - | zone |
| rendering/campfireFx.js | 142 | `_atlas` | let null | own | own | - | - | never |
| rendering/campfireFx.js | 168 | `_fireSerial` | let number | own | - | no-read | - | never |
| rendering/canvasWitness.js | 72 | `_w` | const array | own | own | - | - | never |
| rendering/canvasWitness.js | 73 | `_last` | let null | own | own | - | - | never |
| rendering/capeSprites.js | 43 | `_sets` | const Map | own | own | - | - | never |
| rendering/characterPortrait.js | 178 | `_imgCache` | const Map | own | own | - | - | never |
| rendering/characterPortrait.js | 179 | `_metaCache` | const Map | own | own | - | - | never |
| rendering/characterPortrait.js | 180 | `_bodyTopsPromise` | let null | own | own | - | - | never |
| rendering/characterPortrait.js | 430 | `_bodyKeep` | const Map | own | own | - | - | ? |
| rendering/characterPortrait.js | 451 | `_portraitStats` | const object | own | own | - | - | ? |
| rendering/characterPortrait.js | 452 | `_portraitForce` | let null | own | own | phase | - | ? |
| rendering/chestPreload.js | 19 | `_held` | const array | own | - | no-read | - | never |
| rendering/chestPreload.js | 35 | `_p` | let null | own | own | - | - | never |
| rendering/coinPileArt.js | 23 | `TEX` | const Map | own | own | - | - | never |
| rendering/coinPileArt.js | 41 | `_p` | let null | own | own | - | - | never |
| rendering/deathCrumble.js | 88 | `_shake` | let number | own | own | - | - | never |
| rendering/depthSort.js | 138 | `_keys` | const array | own | own | - | - | never |
| rendering/depthSort.js | 140 | `_probe` | const value | own | own | - | - | never |
| rendering/drawLists.js | 18 | `_root` | let null | own | own | - | - | never |
| rendering/dropIcons.js | 32 | `icons` | const Map | own | own | - | - | never |
| rendering/elemWindup.js | 53 | `_cells` | let null | own | own | - | - | never |
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
| rendering/fillBatch.js | 45 | `_on` | let bool | own | own | flag | - | never |
| rendering/fillBatch.js | 46 | `_urlOff` | let bool | own | own | flag | - | never |
| rendering/fillBatch.js | 47 | `_selfOff` | let bool | own | own | flag | - | ? |
| rendering/fillBatch.js | 48 | `_pinned` | let number | own | own | - | - | never |
| rendering/fillBatch.js | 49 | `_built` | let bool | own | own | flag | - | never |
| rendering/fillBatch.js | 67 | `_shader` | let null | own | own | - | - | never |
| rendering/fillBatch.js | 85 | `_maxTex` | let number | own | own | - | - | never |
| rendering/fireGoblinSprites.js | 98 | `walkSheets` | const object | own | own | - | - | zone |
| rendering/fireGoblinSprites.js | 99 | `attackSheets` | const object | own | own | - | - | zone |
| rendering/fireGoblinSprites.js | 100 | `hitSheets` | const object | own | own | - | - | zone |
| rendering/fireGoblinSprites.js | 101 | `deathFrames` | let array | own | own | - | - | zone |
| rendering/fireGoblinSprites.js | 102 | `remnantsTex` | let null | own | own | - | - | zone |
| rendering/fireGoblinSprites.js | 103 | `fireballTex` | let null | own | own | - | - | zone |
| rendering/fireGoblinSprites.js | 104 | `loadPromise` | let null | own | own | - | - | zone |
| rendering/footprintSprites.js | 33 | `FOOTPRINT_ART` | const object | own | own | - | - | never |
| rendering/footprintSprites.js | 60 | `_frames` | const object | own | own | - | - | zone |
| rendering/formShade.js | 97 | `_on` | let bool | own | own | flag | - | never |
| rendering/formShade.js | 103 | `_count` | let number | own | own | - | - | never |
| rendering/formShade.js | 149 | `_figs` | const Set | own | own | - | - | zone |
| rendering/formShade.js | 150 | `_refreshed` | let number | own | own | - | - | never |
| rendering/framePack.js | 60 | `_budget` | let value | own | own | - | - | ? |
| rendering/framePack.js | 71 | `_want` | const Set | own | own | - | - | ? |
| rendering/framePack.js | 72 | `_packed` | const Set | own | own | - | - | ? |
| rendering/framePack.js | 73 | `_cache` | const Map | own | own | - | - | ? |
| rendering/framePack.js | 74 | `_cacheBytes` | let number | own | own | - | - | ? |
| rendering/framePack.js | 75 | `_st` | const object | own | own | - | - | ? |
| rendering/framePack.js | 76 | `_spent` | let number | own | own | - | - | ? |
| rendering/framePack.js | 76 | `_spentReset` | let bool | own | own | flag | - | ? |
| rendering/framePack.js | 77 | `_warm` | const array | own | own | - | - | ? |
| rendering/framePack.js | 78 | `_warming` | let bool | own | own | flag | - | ? |
| rendering/framePack.js | 161 | `_line` | const array | own | own | - | - | ? |
| rendering/framePack.js | 162 | `_lineBusy` | let bool | own | own | flag | - | ? |
| rendering/framePack.js | 194 | `_restores` | let number | own | own | - | - | ? |
| rendering/framePack.js | 407 | `_restoring` | let bool | own | own | flag | - | ? |
| rendering/framePack.js | 407 | `_timer` | let number | own | own | - | - | ? |
| rendering/fxStrips.js | 78 | `PORTAL_BEAM` | const object | own | 2: rendering/fxStrips.js, rendering/systems/tileRenderer.js | - | - | never |
| rendering/fxStrips.js | 113 | `_pending` | const array | own | own | - | - | never |
| rendering/gearCatalog.js | 89 | `_stores` | const object | own | own | - | - | never |
| rendering/gearLookFrame.js | 33 | `_stats` | const object | own | own | - | - | never |
| rendering/gearLookFrame.js | 35 | `_waitFrom` | let number | own | own | - | - | never |
| rendering/gearNumbers.js | 28 | `_sheets` | const Map | own | own | - | - | never |
| rendering/gearNumbers.js | 29 | `_frames` | const Map | own | own | - | - | never |
| rendering/gearNumbers.js | 30 | `_stats` | const object | own | own | - | - | never |
| rendering/gearSheets.js | 97 | `_sheets` | const object | own | own | - | - | never |
| rendering/gearSheets.js | 134 | `_gearRetryOn` | let bool | own | own | flag | - | never |
| rendering/gearSheets.js | 136 | `_gaveUp` | const object | own | own | - | - | never |
| rendering/gearSheets.js | 149 | `_gearRound` | const object | own | own | - | - | never |
| rendering/gearSheets.js | 212 | `_trimStats` | const object | own | own | - | - | never |
| rendering/gearSheets.js | 323 | `_gearLine` | let call | own | own | - | - | never |
| rendering/gearSheets.js | 323 | `_gearPending` | let number | own | own | - | - | ? |
| rendering/gearSheets.js | 323 | `_gearPlay` | let null | own | own | - | - | never |
| rendering/gearSheets.js | 323 | `_gearT0` | let number | own | own | - | - | never |
| rendering/gearSheets.js | 425 | `_fxTrimStats` | const array | own | own | - | - | never |
| rendering/gearSheets.js | 426 | `_fxTrimFrames` | const Map | own | own | - | - | never |
| rendering/gearSheets.js | 591 | `_bodyTrimStats` | const object | own | own | - | - | never |
| rendering/gearSheets.js | 592 | `_bodyTrimFrames` | const array | own | own | - | - | never |
| rendering/gearSheets.js | 623 | `_sheetLoads` | const object | own | own | - | - | never |
| rendering/gearSheets.js | 710 | `_workerWait` | const object | own | own | - | - | ? |
| rendering/gearSheets.js | 729 | `_shirtOnWay` | const Map | own | own | - | - | never |
| rendering/gearSheets.js | 1008 | `_artSeen` | const Map | own | own | - | - | never |
| rendering/gearSheets.js | 1009 | `_artTick` | let number | own | - | no-read | - | never |
| rendering/gearSheets.js | 1123 | `_preloadSkip` | let null | own | own | - | - | never |
| rendering/gearSheets.js | 1123 | `_skipDecided` | let null | own | own | - | - | never |
| rendering/gearSheets.js | 1145 | `_extraSources` | const Set | own | own | - | - | never |
| rendering/gearSheets.js | 1168 | `_drawnElsewhere` | let null | own | own | - | - | never |
| rendering/gearSheets.js | 1174 | `_upStats` | const object | own | own | - | - | never |
| rendering/gearWalkFrame.js | 38 | `_stats` | const object | own | own | - | - | never |
| rendering/gearWalkFrame.js | 40 | `_waitFrom` | let number | own | own | - | - | never |
| rendering/gfxLean.js | 48 | `_stats` | const object | own | own | - | - | never |
| rendering/gpuOnly.js | 51 | `_n` | let number | own | own | - | - | never |
| rendering/gpuOnly.js | 52 | `_bytes` | let number | own | own | - | - | never |
| rendering/gpuOnly.js | 53 | `_onceN` | let number | own | own | - | - | never |
| rendering/gpuOnly.js | 54 | `_onceBytes` | let number | own | own | - | - | never |
| rendering/grottoFx.js | 115 | `_live` | const Set | own | own | - | - | zone |
| rendering/grottoFx.js | 488 | `_swayers` | const Set | own | own | - | - | zone |
| rendering/hairClip.js | 57 | `_alpha` | let bool | own | own | flag | - | never |
| rendering/hairClip.js | 59 | `_installed` | let bool | own | own | flag | - | never |
| rendering/hairClip.js | 60 | `_selfOff` | let bool | own | own | flag | - | ? |
| rendering/hairClip.js | 61 | `_maxTex` | let number | own | own | - | - | never |
| rendering/hairClip.js | 62 | `_stats` | const object | own | own | - | - | never |
| rendering/hairClip.js | 63 | `_boxes` | const Set | own | own | - | - | zone |
| rendering/hairClip.js | 82 | `_shader` | let null | own | own | - | - | never |
| rendering/hairClip.js | 126 | `_alphaShader` | let null | own | own | - | - | never |
| rendering/headFrames.js | 36 | `_hf` | const object | own | own | - | - | never |
| rendering/headFrames.js | 107 | `_oth` | const object | own | own | - | - | never |
| rendering/headFrames.js | 162 | `_box` | let null | own | own | - | - | never |
| rendering/headFrames.js | 162 | `_boxAt` | let number | own | own | - | - | never |
| rendering/headFrames.js | 205 | `_px` | const object | own | own | - | - | never |
| rendering/heapTrim.js | 26 | `_on` | let null | own | own | - | - | never |
| rendering/heldNumbers.js | 59 | `_pending` | const Set | own | own | - | - | never |
| rendering/heldNumbers.js | 60 | `_held` | let number | own | own | - | - | never |
| rendering/heldNumbers.js | 61 | `_heldBytes` | let number | own | own | - | - | never |
| rendering/heldNumbers.js | 62 | `_numberBytes` | let number | own | own | - | - | never |
| rendering/heldNumbers.js | 63 | `_many` | let number | own | own | - | - | never |
| rendering/heldNumbers.js | 64 | `_refills` | let number | own | own | - | - | never |
| rendering/heldNumbers.js | 65 | `_reads` | let number | own | own | - | - | never |
| rendering/heldNumbers.js | 66 | `_readsBy` | const object | own | own | - | - | never |
| rendering/heldNumbers.js | 67 | `_installed` | let bool | own | own | flag | - | never |
| rendering/hemiBust.js | 43 | `_layers` | let null | own | own | - | - | never |
| rendering/hemiBust.js | 44 | `_loading` | let null | own | own | - | - | never |
| rendering/hemiBust.js | 45 | `_choice` | let null | own | own | - | - | never |
| rendering/hemiBust.js | 46 | `_cache` | const Map | own | own | - | - | never |
| rendering/hemiBust.js | 47 | `_stats` | const object | own | own | - | - | never |
| rendering/hemiBust.js | 110 | `_css` | let bool | own | own | flag | - | never |
| rendering/hitMaterialFx.js | 104 | `ART` | const object | own | own | - | - | never |
| rendering/hitMaterialFx.js | 198 | `_atlas` | let null | own | own | - | - | never |
| rendering/hitMaterialFx.js | 263 | `_chipCache` | const Map | own | own | - | - | never |
| rendering/hitMaterialFx.js | 264 | `_softPuff` | let null | own | own | - | - | never |
| rendering/hitMaterialFx.js | 264 | `_softShadow` | let null | own | own | - | - | never |
| rendering/hitMaterialFx.js | 515 | `_propChips` | const Map | own | own | - | - | zone |
| rendering/hotArrowFx.js | 168 | `ART` | const object | own | own | - | - | never |
| rendering/inflateRaw.js | 63 | `FIXED_D` | let null | own | own | - | - | ? |
| rendering/inflateRaw.js | 63 | `FIXED_L` | let null | own | own | - | - | ? |
| rendering/keepAsImage.js | 43 | `_on` | let bool | own | own | flag | - | never |
| rendering/keepAsImage.js | 46 | `_stats` | const object | own | own | - | - | never |
| rendering/landAuras.js | 125 | `_tex` | let null | own | own | - | - | zone |
| rendering/landAuras.js | 126 | `_live` | const Set | own | own | - | - | never |
| rendering/layerUniforms.js | 31 | `_installed` | let bool | own | own | flag | - | never |
| rendering/layerUniforms.js | 32 | `_all` | let bool | own | own | flag | - | never |
| rendering/layerUniforms.js | 33 | `_empty` | let number | own | own | - | - | never |
| rendering/layerUniforms.js | 33 | `_pushed` | let number | own | own | - | - | never |
| rendering/layerUniforms.js | 33 | `_shared` | let number | own | own | - | - | never |
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
| rendering/lightfx/glint.js | 338 | `_warmFilters` | const array | own | own | - | - | never |
| rendering/lightfx/glint.js | 339 | `_warmStats` | const object | own | own | - | - | never |
| rendering/lightfx/glint.js | 340 | `_selfOff` | let bool | own | own | flag | - | ? |
| rendering/lightfx/glint.js | 383 | `_selfTested` | const WeakSet | own | own | - | - | ? |
| rendering/lightfx/glint.js | 514 | `_sheen` | let null | own | own | - | - | never |
| rendering/lightfx/glint.js | 548 | `_shineKnob` | let null | own | own | - | - | ? |
| rendering/lightfx/glint.js | 639 | `_chain` | const array | own | own | - | - | never |
| rendering/lightfx/lightFx.js | 32 | `_on` | let null | own | own | - | - | never |
| rendering/lightfx/lightFx.js | 72 | `_shadowKnob` | let null | own | own | - | - | ? |
| rendering/lightfx/shadows.js | 122 | `_lockOn` | let null | own | own | - | - | never |
| rendering/lightfx/shadows.js | 138 | `_prepassOn` | let bool | own | own | flag | - | never |
| rendering/lightfx/shadows.js | 158 | `_noSnapOn` | let bool | own | own | flag | - | never |
| rendering/lightfx/shadows.js | 159 | `_unsnapped` | let number | own | own | - | - | never |
| rendering/lightfx/shadows.js | 273 | `_shadeProgram` | let null | own | own | - | - | never |
| rendering/lightfx/shadows.js | 294 | `_selfOff` | let bool | own | own | flag | - | ? |
| rendering/lightfx/shadows.js | 295 | `_selfTested` | const WeakSet | own | own | - | - | ? |
| rendering/lightfx/shadows.js | 343 | `_chain` | const array | own | own | - | - | never |
| rendering/lightfx/shadows.js | 407 | `_systems` | const Set | own | own | - | - | never |
| rendering/lightfx/sheenBatch.js | 62 | `_urlOff` | let bool | own | own | flag | - | never |
| rendering/lightfx/sheenBatch.js | 64 | `_passAll` | let bool | own | own | flag | - | never |
| rendering/lightfx/sheenBatch.js | 65 | `_built` | let bool | own | own | flag | - | never |
| rendering/lightfx/sheenBatch.js | 66 | `_packed` | let number | own | own | - | - | never |
| rendering/lightfx/sheenBatch.js | 71 | `_selfOff` | let bool | own | own | flag | - | ? |
| rendering/lightfx/sheenBatch.js | 187 | `_shader` | let null | own | own | - | - | never |
| rendering/lightfx/sheenBatch.js | 294 | `_installed` | let bool | own | own | flag | - | never |
| rendering/lookArmour.js | 49 | `_stats` | const object | own | own | - | - | never |
| rendering/lookArmour.js | 67 | `_layout` | let null | own | own | - | - | never |
| rendering/lookArmour.js | 94 | `_rows` | let number | own | own | - | - | never |
| rendering/lookArmour.js | 94 | `_src` | let null | own | own | - | - | never |
| rendering/lookArmour.js | 95 | `_free` | const array | own | own | - | - | never |
| rendering/lookArmour.js | 96 | `_books` | const Set | own | own | - | - | never |
| rendering/lookArmour.js | 205 | `_mlooks` | const Map | own | own | - | - | never |
| rendering/lookArmour.js | 206 | `_baker` | let null | own | own | - | - | never |
| rendering/lookArmour.js | 254 | `_sweepAt` | let number | own | own | - | - | never |
| rendering/lookArmour.js | 254 | `_sweepTimer` | let null | own | own | - | - | never |
| rendering/lookArmour.js | 275 | `_sent` | const Set | own | own | - | - | never |
| rendering/lookArmour.js | 319 | `_fetchStats` | const object | own | own | - | - | never |
| rendering/lookArmour.js | 323 | `_qaHashes` | let null | own | own | - | - | never |
| rendering/lookFolk.js | 27 | `_stats` | const object | own | own | - | - | never |
| rendering/lookFolk.js | 29 | `_face` | let null | own | own | - | - | never |
| rendering/lookPalette.js | 134 | `_why` | let string | own | own | - | - | never |
| rendering/lookPalette.js | 163 | `_sets` | const Map | own | own | - | - | never |
| rendering/lookPalette.js | 164 | `_sheets` | const object | own | own | - | - | never |
| rendering/lookPalette.js | 165 | `_loading` | let null | own | own | - | - | never |
| rendering/lookPalette.js | 166 | `_settled` | let bool | own | own | flag | - | never |
| rendering/lookPalette.js | 179 | `_ok` | let null | own | own | - | - | never |
| rendering/lookPalette.js | 180 | `_stats` | const object | own | own | - | - | never |
| rendering/lookPalette.js | 182 | `_pages` | const array | own | own | - | - | never |
| rendering/lookPalette.js | 345 | `_dirData` | let null | own | own | - | - | never |
| rendering/lookPalette.js | 345 | `_dirN` | let number | own | own | - | - | never |
| rendering/lookPalette.js | 345 | `_dirSrc` | let null | own | own | - | - | never |
| rendering/lookPalette.js | 567 | `_maskSource` | let null | own | own | - | - | never |
| rendering/lookPalette.js | 609 | `_inPrewarm` | let bool | own | own | flag | - | never |
| rendering/lookPalette.js | 667 | `_looks` | const Map | own | own | - | - | never |
| rendering/lookPalette.js | 676 | `_sweepAt` | let number | own | own | - | - | never |
| rendering/lookPalette.js | 886 | `_kinds` | const Map | own | own | - | - | never |
| rendering/lookPalette.js | 887 | `_built` | let bool | own | own | flag | - | never |
| rendering/lookPalette.js | 1143 | `_shader` | let null | own | own | - | - | never |
| rendering/lookPalette.js | 1164 | `_sheenShader` | let null | own | own | - | - | never |
| rendering/lookPalette.js | 1165 | `_okSheen` | let null | own | own | - | - | never |
| rendering/lookPalette.js | 1306 | `_patched` | let bool | own | own | flag | - | never |
| rendering/lookPalette.js | 1440 | `_prewarmedFor` | let null | own | own | - | - | never |
| rendering/lookSets/gear.js | 52 | `SHEETS` | const object | own | own | - | - | never |
| rendering/lookSets/gearwalk.js | 50 | `SHEETS` | const object | own | own | - | - | never |
| rendering/lookSets/standin.js | 34 | `FRAME` | const object | own | own | - | - | never |
| rendering/lookSets/standinlegs.js | 36 | `GREAVES` | const object | own | own | - | - | never |
| rendering/lookSets/weapons.js | 50 | `SHEETS` | const object | own | own | - | - | never |
| rendering/lookShirtFrame.js | 33 | `_dress` | const Map | own | own | - | - | never |
| rendering/lookShirtFrame.js | 37 | `_hashes` | const Map | own | own | - | - | never |
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
| rendering/maskedBakeWorker.js | 163 | `sheetsKept` | const Map | own | own | - | - | ? |
| rendering/maskedBakeWorker.js | 244 | `sheetsIdleT` | let number | own | own | - | - | ? |
| rendering/maskedBakeWorker.js | 336 | `pending` | const Map | own | own | - | - | never |
| rendering/monsterDeathFx.js | 96 | `_renderer` | let null | own | own | - | - | never |
| rendering/monsterDeathFx.js | 177 | `_covCache` | const Map | own | own | - | - | never |
| rendering/monsterDeathZonesFx.js | 102 | `_live` | const Set | own | own | - | - | zone |
| rendering/monsterDeathZonesFx.js | 103 | `_freed` | let number | own | own | - | - | never |
| rendering/monsterDeathZonesFx.js | 103 | `_made` | let number | own | own | - | - | never |
| rendering/monsterRecolor.js | 86 | `_cache` | const Map | own | own | - | - | zone |
| rendering/monsterShotFx.js | 90 | `_atlas` | let null | own | own | - | - | never |
| rendering/monsterShotFx.js | 91 | `_atlasPromise` | let null | own | own | - | - | never |
| rendering/monsterShotFx.js | 109 | `_keeps` | const array | own | - | no-read | - | ? |
| rendering/monsterSilhouette.js | 53 | `_on` | let bool | own | own | flag | - | never |
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
| rendering/npcSprites.js | 42 | `_tex` | const object | own | own | - | - | zone |
| rendering/npcSprites.js | 45 | `_done` | let null | own | own | - | - | never |
| rendering/npcSprites.js | 131 | `_walk` | const object | own | own | - | - | zone |
| rendering/npcSprites.js | 134 | `_wheelWalk` | const object | own | own | - | - | zone |
| rendering/npcSprites.js | 167 | `_propAnim` | const object | own | own | - | - | zone |
| rendering/npcSprites.js | 266 | `_town` | let null | own | own | - | - | zone |
| rendering/npcSprites.js | 267 | `_townReady` | let bool | own | own | flag | - | zone |
| rendering/npcSprites.js | 268 | `_townUnload` | let null | own | own | - | - | zone |
| rendering/npcSprites.js | 269 | `_townKeys` | const array | own | own | - | - | zone |
| rendering/npcSprites.js | 270 | `_townCrops` | const array | own | own | - | - | zone |
| rendering/npcSprites.js | 271 | `_townAnimIds` | const array | own | - | no-read | - | zone |
| rendering/npcSprites.js | 422 | `_wheelTex` | const object | own | own | - | - | zone |
| rendering/npcSprites.js | 423 | `_wheelArt` | let null | own | own | - | - | zone |
| rendering/p256.js | 185 | `_stats` | const object | own | own | - | - | never |
| rendering/p256.js | 223 | `_decided` | let null | own | own | - | - | never |
| rendering/p256.js | 366 | `_toPack` | const Set | own | own | - | - | never |
| rendering/p256.js | 367 | `_packed` | const Set | own | own | - | - | never |
| rendering/p256.js | 368 | `_pk` | const object | own | own | - | - | never |
| rendering/p256.js | 444 | `_upInstalled` | let bool | own | own | flag | - | never |
| rendering/p256.js | 467 | `_timer` | let number | own | own | - | - | never |
| rendering/paletteDraw.js | 87 | `_thumbs` | const WeakMap | own | own | - | - | never |
| rendering/paletteLoad.js | 105 | `_idle` | let number | own | own | - | - | never |
| rendering/paletteLoad.js | 105 | `_seq` | let number | own | - | no-read | - | never |
| rendering/paletteLoad.js | 105 | `_w` | let null | own | own | - | - | never |
| rendering/paletteLoad.js | 106 | `_wait` | const Map | own | own | - | - | never |
| rendering/paletteLoad.js | 178 | `stats` | const object | own | own | - | - | never |
| rendering/paletteLoad.js | 179 | `_t0` | let number | own | own | - | - | never |
| rendering/paletteTex.js | 97 | `_renderer` | let null | own | own | - | - | never |
| rendering/paletteTex.js | 98 | `_ok` | let null | own | own | - | - | never |
| rendering/paletteTex.js | 105 | `_stats` | const object | own | own | - | - | never |
| rendering/paletteTex.js | 109 | `_live` | const Set | own | own | - | - | never |
| rendering/paletteTex.js | 119 | `_atlas` | let null | own | own | - | - | never |
| rendering/paletteTex.js | 303 | `_batchShader` | let null | own | own | - | - | never |
| rendering/paletteTex.js | 380 | `_clipShaders` | const object | own | own | - | - | ? |
| rendering/paletteTex.js | 505 | `_oneWanted` | let null | own | own | - | - | never |
| rendering/paletteTex.js | 506 | `_oneRoute` | let bool | own | own | - | - | never |
| rendering/paletteTex.js | 507 | `_oneOk` | let null | own | own | - | - | never |
| rendering/paletteTex.js | 508 | `_oneStats` | const object | own | own | - | - | never |
| rendering/paletteTex.js | 510 | `_oneR` | let null | own | own | - | - | never |
| rendering/paletteTex.js | 620 | `_oneShader` | let null | own | own | - | - | never |
| rendering/paletteTex.js | 713 | `_patched` | let bool | own | own | flag | - | never |
| rendering/paletteTex.js | 876 | `_meshShader` | let null | own | own | - | - | never |
| rendering/paletteTex.js | 1207 | `_fillBatchShader` | let null | own | own | - | - | never |
| rendering/petSprites.js | 20 | `_tex` | let null | own | own | - | - | never |
| rendering/petSprites.js | 21 | `_loading` | let null | own | own | - | - | never |
| rendering/petSprites.js | 22 | `_frames` | const object | own | own | - | - | never |
| rendering/picsNumbers.js | 53 | `_live` | const Set | own | own | - | - | zone |
| rendering/picsNumbers.js | 54 | `_stats` | const object | own | own | - | - | never |
| rendering/picsNumbers.js | 56 | `_rows` | const Map | own | own | - | - | zone |
| rendering/picsNumbers.js | 90 | `_plansWaiting` | const Map | own | own | - | - | ? |
| rendering/picsNumbers.js | 91 | `_rowsEpoch` | const Map | own | own | - | - | ? |
| rendering/picsNumbers.js | 290 | `_warm` | let object | own | own | - | - | never |
| rendering/picsOnce.js | 59 | `_stats` | const object | own | own | - | - | never |
| rendering/picsOnce.js | 60 | `_released` | const Set | own | own | - | - | never |
| rendering/picsOnce.js | 61 | `_loading` | const Map | own | own | - | - | never |
| rendering/picsOnce.js | 248 | `_restorers` | const array | own | own | - | - | never |
| rendering/picsOnce.js | 260 | `_installed` | let bool | own | own | flag | - | never |
| rendering/picsOnce.js | 299 | `_seen` | let null | own | own | - | - | ? |
| rendering/picsOnce.js | 299 | `_walk` | let null | own | own | - | - | ? |
| rendering/picsOnce.js | 299 | `_walkMap` | let null | own | own | - | - | ? |
| rendering/picsOnce.js | 317 | `_timer` | let number | own | own | - | - | never |
| rendering/picsOnce.js | 318 | `_renderer` | let null | own | own | - | - | never |
| rendering/pixiRenderer.js | 68 | `_headFrames` | let null | own | own | - | - | never |
| rendering/pixiRenderer.js | 215 | `_appRef` | let null | own | own | - | - | never |
| rendering/pixiRenderer.js | 220 | `_playerGround` | const object | own | own | - | - | never |
| rendering/pixiRenderer.js | 235 | `_groundKeep` | const object | own | own | - | - | never |
| rendering/pixiRenderer.js | 237 | `_depthProbe` | const object | own | own | - | - | never |
| rendering/pixiRenderer.js | 293 | `_camSnapOff` | let null | own | own | - | - | never |
| rendering/pixiRenderer.js | 304 | `_camProbe` | const object | own | own | - | - | never |
| rendering/playerAnchors.js | 51 | `anchors` | let null | own | own | - | - | never |
| rendering/playerAnchors.js | 52 | `weaponHandles` | let null | own | own | - | - | never |
| rendering/playerAnchors.js | 53 | `loadPromise` | let null | own | own | - | - | never |
| rendering/playerDeathSprites.js | 25 | `state` | const object | own | own | - | - | never |
| rendering/playerSkins.js | 305 | `_bodySheets` | const object | own | own | - | - | never |
| rendering/playerSkins.js | 827 | `_askOnly` | let null | own | own | - | - | never |
| rendering/playerSkins.js | 862 | `_buildSink` | let null | own | own | - | - | never |
| rendering/playerSkins.js | 941 | `_fishFollows` | let bool | own | own | flag | - | never |
| rendering/playerSkins.js | 966 | `_pickupHeadSheets` | const object | own | own | - | - | never |
| rendering/playerSkins.js | 1015 | `_headTrimStats` | const object | own | own | - | - | never |
| rendering/playerSkins.js | 1016 | `_headTrimFrames` | const object | own | own | - | - | never |
| rendering/playerSkins.js | 1558 | `_artPrewarmT` | let null | own | own | - | - | never |
| rendering/playerSprites.js | 184 | `manifest` | const object | own | own | - | - | never |
| rendering/playerSprites.js | 188 | `loadPromise` | let null | own | own | - | - | never |
| rendering/propGround.js | 64 | `_canvas` | let null | own | own | - | - | never |
| rendering/propGround.js | 65 | `_ctx` | let null | own | own | - | - | never |
| rendering/propGround.js | 66 | `_budgetFrame` | let number | own | own | - | - | never |
| rendering/quietClear.js | 28 | `_installed` | let bool | own | own | flag | - | never |
| rendering/quietClear.js | 29 | `_skipped` | let number | own | own | - | - | never |
| rendering/renderHeal.js | 37 | `_heals` | let number | own | own | - | - | never |
| rendering/rideFx.js | 54 | `_tex` | const object | own | own | - | - | never |
| rendering/rockGolemSprites.js | 48 | `walkFrames` | let array | own | own | - | - | zone |
| rendering/rockGolemSprites.js | 49 | `deathFrames` | let array | own | own | - | - | zone |
| rendering/rockGolemSprites.js | 50 | `loadPromise` | let null | own | own | - | - | zone |
| rendering/rotcapSprites.js | 47 | `walkFrames` | let array | own | own | - | - | zone |
| rendering/rotcapSprites.js | 48 | `deathFrames` | let array | own | own | - | - | zone |
| rendering/rotcapSprites.js | 49 | `loadPromise` | let null | own | own | - | - | zone |
| rendering/selfTest.js | 339 | `_forced` | let null | own | own | - | - | ? |
| rendering/selfTest.js | 356 | `_on` | let null | own | own | - | - | ? |
| rendering/selfTest.js | 367 | `_res` | const object | own | own | - | - | ? |
| rendering/selfTest.js | 368 | `_ms` | let number | own | own | - | - | ? |
| rendering/selfTest.js | 369 | `_draws` | const array | own | own | - | - | ? |
| rendering/selfTest.js | 494 | `_pending` | const array | own | own | - | - | ? |
| rendering/selfTest.js | 495 | `_queued` | let bool | own | own | flag | - | ? |
| rendering/selfTest.js | 496 | `_allDone` | let null | own | own | - | - | ? |
| rendering/selfTest.js | 496 | `_resolveAll` | let null | own | own | - | - | ? |
| rendering/sharpPixels.js | 51 | `_enabled` | let bool | own | own | flag | - | never |
| rendering/sharpPixels.js | 54 | `_maxTex` | let number | own | own | - | - | never |
| rendering/sharpPixels.js | 55 | `_routed` | let number | own | own | - | - | never |
| rendering/sharpPixels.js | 56 | `_urlOff` | let bool | own | own | flag | - | never |
| rendering/sharpPixels.js | 103 | `_figRound` | let bool | own | own | flag | - | never |
| rendering/sharpPixels.js | 172 | `_shader` | let null | own | own | - | - | never |
| rendering/sharpPixels.js | 219 | `_figureSpec` | let null | own | own | - | - | never |
| rendering/sharpPixels.js | 235 | `_sheenName` | let null | own | own | - | - | never |
| rendering/sharpPixels.js | 285 | `_selfOff` | let bool | own | own | flag | - | ? |
| rendering/shieldSprites.js | 18 | `SHEETS` | const object | own | own | - | - | never |
| rendering/shieldSprites.js | 24 | `loadPromise` | let null | own | own | - | - | never |
| rendering/shieldSprites.js | 32 | `_set` | let null | own | own | - | - | never |
| rendering/sightLineDraw.js | 21 | `_drawn` | const object | own | own | - | - | ? |
| rendering/sightLineDraw.js | 30 | `_early` | let null | own | own | - | - | ? |
| rendering/skeletonSprites.js | 36 | `runSheets` | const object | own | own | - | - | zone |
| rendering/skeletonSprites.js | 37 | `deathFrames` | let array | own | own | - | - | zone |
| rendering/skeletonSprites.js | 38 | `remnantsTex` | let null | own | own | - | - | zone |
| rendering/skeletonSprites.js | 39 | `loadPromise` | let null | own | own | - | - | zone |
| rendering/slimeSprites.js | 88 | `SHEETS` | const object | own | own | - | - | ? |
| rendering/slimeSprites.js | 102 | `loadPromise` | let null | own | own | - | - | never |
| rendering/slimeSprites.js | 151 | `singlesPromise` | let null | own | own | - | - | ? |
| rendering/slimeSprites.js | 171 | `_stillSet` | let null | own | own | - | - | ? |
| rendering/snowmanSprites.js | 42 | `SHEETS` | const object | own | own | - | - | zone |
| rendering/snowmanSprites.js | 49 | `ATTACK_SHEETS` | const object | own | own | - | - | zone |
| rendering/snowmanSprites.js | 53 | `remnantsTex` | let null | own | own | - | - | zone |
| rendering/snowmanSprites.js | 56 | `hitFrames` | let array | own | own | - | - | zone |
| rendering/snowmanSprites.js | 61 | `deathFrames` | let array | own | own | - | - | zone |
| rendering/snowmanSprites.js | 62 | `loadPromise` | let null | own | own | - | - | zone |
| rendering/snowmanSprites.js | 100 | `snowballTex` | let null | own | own | - | - | zone |
| rendering/snowmanSprites.js | 123 | `PHASE_SHEETS` | const object | own | own | - | - | zone |
| rendering/sootMarks.js | 41 | `_tex` | let null | own | own | - | - | never |
| rendering/staffCastFx.js | 113 | `_genRamps` | const Map | own | own | - | - | never |
| rendering/staffCastFx.js | 148 | `_charge` | const object | own | own | - | - | never |
| rendering/staffCastFx.js | 195 | `_gp` | const object | own | own | - | - | never |
| rendering/staffCastFx.js | 213 | `_glowTex` | let null | own | own | - | - | never |
| rendering/staffCastFx.js | 213 | `_sqTex` | let null | own | own | - | - | never |
| rendering/staffCastFx.js | 274 | `_boltOut` | const object | own | own | - | - | never |
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
| rendering/stormSparksFx.js | 49 | `_cells` | let null | own | own | - | - | never |
| rendering/stormSparksFx.js | 98 | `_wanted` | let bool | own | own | flag | - | zone |
| rendering/stripRead.js | 26 | `_dead` | let bool | own | own | flag | - | never |
| rendering/stripRead.js | 26 | `_idle` | let number | own | own | - | - | never |
| rendering/stripRead.js | 26 | `_seq` | let number | own | - | no-read | - | never |
| rendering/stripRead.js | 26 | `_w` | let null | own | own | - | - | never |
| rendering/stripRead.js | 27 | `_wait` | const Map | own | own | - | - | never |
| rendering/stripRead.js | 28 | `_stats` | const object | own | own | - | - | never |
| rendering/stripRead.js | 109 | `_line` | let call | own | own | - | - | never |
| rendering/systems/ambientFx.js | 50 | `_TEX` | let null | own | own | - | - | never |
| rendering/systems/bowFeelFx.js | 31 | `_last` | let null | own | own | - | - | never |
| rendering/systems/bowFeelFx.js | 32 | `_drawn` | let number | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 27 | `_fxPreload` | const array | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 43 | `_combatTrimStats` | const array | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 44 | `_combatTrimFrames` | const Map | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 64 | `_standInTrimStats` | const array | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 65 | `_standInTrimFrames` | const Map | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 279 | `_farmCrownMid` | const Map | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 335 | `_standInLegsUse` | let bool | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 481 | `_fireLogWood` | let number | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 721 | `_capeProbe` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 841 | `_standInTints` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 942 | `POPUP_ICONS` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1005 | `SHARD_ICONS` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1019 | `MAGIC_BOLT_FRAMES` | const array | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1024 | `_trapArt` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1189 | `ARROW_PINE` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1311 | `JET_STREAM` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1407 | `_DEBRIS_DOT_TEX` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1451 | `ARROW_BLAST` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1456 | `_arrowBlastLoad` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1472 | `SNOWBALL_BURST` | const object | own | own | - | - | zone |
| rendering/systems/effectsRenderer.js | 1479 | `_snowballBurstLoad` | let null | own | own | - | - | zone |
| rendering/systems/effectsRenderer.js | 1547 | `_PROP_SLASH_TEX` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1581 | `_SPLINTER_TEX` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1627 | `_HARD_DOT_TEX` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1644 | `_GROUND_DECAL_TEX` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1776 | `NODE_SPRITE_TEX` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1788 | `TREE_TEX` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1803 | `ORE_TEX` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1866 | `ORE_ICON_TIER_TEX` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1915 | `ORE_ICON_TEX` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 1980 | `_dmgBmpReady` | let bool | own | own | flag | - | never |
| rendering/systems/effectsRenderer.js | 2011 | `_dmgFontSig` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2058 | `_dmgPagesGone` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2167 | `_chatBubbleGrad` | let null | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2189 | `_bubbleGrads` | const object | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2236 | `_hexMemo` | const Map | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2297 | `_bakeFrame` | let number | own | own | - | - | never |
| rendering/systems/effectsRenderer.js | 2472 | `SMITH_ANVIL` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 24 | `STATUS_TO_ELEMENT` | const Map | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 289 | `SPAWN_WHITE_FILTER` | const new ColorMatrixFilter | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 374 | `_npcDrawn` | const object | own | own | - | - | zone |
| rendering/systems/entityRenderer.js | 376 | `_propsDrawn` | const array | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 382 | `_fgDrawn` | const array | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 389 | `_entityLayerRef` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 390 | `_frontLayerRef` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 409 | `_selfDisplayRef` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 541 | `_folkJobs` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 542 | `_folkSheets` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 860 | `_traitCache` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 873 | `_traitRetryOn` | let bool | own | own | flag | - | never |
| rendering/systems/entityRenderer.js | 876 | `_looksRetryOn` | let bool | own | own | flag | - | never |
| rendering/systems/entityRenderer.js | 1044 | `_headWatch` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 1115 | `_bodyAnchors` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 1116 | `_bodyTops` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 1117 | `_bodyDataPromise` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 1118 | `_bodyDataRounds` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 1253 | `_folkHatDy256` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 1254 | `_qaHatDy256` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 1288 | `_crownOverride` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 1598 | `_lastGearDisplay` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 1601 | `_lastPeerWeaponSprite` | let null | own | own | - | - | zone |
| rendering/systems/entityRenderer.js | 1601 | `_lastWeaponSprite` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 1663 | `_bodyArtMemo` | const WeakMap | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2121 | `_regionTexCache` | const WeakMap | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2150 | `_bandTexCache` | const WeakMap | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2266 | `_maskedBodyCache` | const Map | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2289 | `_spareSkipped` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2324 | `_keepQueue` | const array | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2325 | `_keepLastAsk` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2325 | `_keepTimer` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2606 | `_bakeSeq` | let number | own | - | no-read | - | never |
| rendering/systems/entityRenderer.js | 2606 | `_bakeWorker` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2606 | `_bakeWorkerDead` | let bool | own | own | flag | - | never |
| rendering/systems/entityRenderer.js | 2606 | `_rodSent` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2615 | `_bakeJobs` | const Map | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2616 | `_bakeWorkerStats` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2689 | `_bakeQueue` | const array | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2690 | `_bakeByKey` | const Map | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2691 | `_bakeBusy` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2692 | `_bakeStartedAt` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2724 | `_pumpTimer` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 2864 | `_lookSheetsHere` | const Map | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3079 | `_localBakeStats` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3085 | `_maskedFails` | const Map | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3108 | `_localMisses` | const array | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3110 | `_localEpoch` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3110 | `_localMissKey` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3160 | `_peerBakeStats` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3161 | `_peerPending` | const Set | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3162 | `_peerQueue` | const array | own | own | - | - | zone |
| rendering/systems/entityRenderer.js | 3163 | `_peerRunning` | let bool | own | own | flag | - | never |
| rendering/systems/entityRenderer.js | 3377 | `prewarmProgress` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3384 | `_localBakeDir` | let string | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3501 | `_ownedRpg` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3544 | `_ownedAt` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3544 | `_ownedSig` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3569 | `_uploadedSources` | const WeakSet | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3633 | `_prewarmRenderer` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3743 | `_altPrewarmSeq` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3889 | `_equipPrewarmTimer` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 3890 | `_equipPrewarmRunning` | let bool | own | own | flag | - | never |
| rendering/systems/entityRenderer.js | 3891 | `_equipPrewarmAgain` | let bool | own | own | flag | - | never |
| rendering/systems/entityRenderer.js | 4010 | `_fishTopCache` | const Map | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 4036 | `_FISH_GRIP_TROUSERS` | let call | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 4332 | `_hairMaskCache` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 4468 | `_lastHairDisplay` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 4646 | `_standInHairClip` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 4732 | `_monsterDisplaysRef` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 4869 | `_traitTex` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 4876 | `_mannequinTex` | const object | own | - | no-read | - | never |
| rendering/systems/entityRenderer.js | 4881 | `_traitMeta` | let null | own | - | no-read | - | never |
| rendering/systems/entityRenderer.js | 4882 | `_traitLoadStarted` | let bool | own | own | flag | - | never |
| rendering/systems/entityRenderer.js | 5995 | `_broBadgeTex` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 6009 | `_broBadgeSet` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 6035 | `_smallTexHeld` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 6036 | `_smallSet` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 6071 | `_pinTexHeld` | const object | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 6072 | `_pinSet` | let null | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 6184 | `_plateWorldScale` | let number | own | own | - | - | never |
| rendering/systems/entityRenderer.js | 6195 | `_cueZoom` | let number | own | own | - | - | never |
| rendering/systems/minimapRenderer.js | 162 | `_propMarks` | const array | own | own | - | - | never |
| rendering/systems/minimapRenderer.js | 172 | `_allMarks` | const array | own | own | - | - | never |
| rendering/systems/staffFeelFx.js | 32 | `_st` | const object | own | own | - | - | never |
| rendering/systems/tileRenderer.js | 153 | `_footTex` | let null | own | own | - | - | never |
| rendering/systems/tileRenderer.js | 216 | `_liveTileRenderers` | const Set | own | own | - | - | never |
| rendering/systems/weaponFeelFx.js | 61 | `_drawers` | const array | own | own | - | - | never |
| rendering/systems/weaponFeelFx.js | 356 | `_live` | let null | own | own | - | - | never |
| rendering/textRelease.js | 44 | `_installed` | let bool | own | own | flag | - | never |
| rendering/textRelease.js | 45 | `_stats` | const object | own | own | - | - | never |
| rendering/texturePoolTrim.js | 32 | `_installed` | let bool | own | own | flag | - | never |
| rendering/texturePoolTrim.js | 33 | `_stats` | const object | own | own | - | - | never |
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
| rendering/traits/headLook.js | 49 | `_maps` | const Map | own | own | - | - | never |
| rendering/traits/headLook.js | 50 | `_stats` | const object | own | own | - | - | never |
| rendering/traits/headLook.js | 52 | `_forceOld` | let bool | own | own | flag | - | never |
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
| rendering/traits/speciesArt.js | 40 | `_art` | const object | own | own | - | - | never |
| rendering/traits/speciesArt.js | 41 | `_artReady` | const object | own | own | - | - | never |
| rendering/traits/speciesArt.js | 42 | `_builds` | const object | own | own | - | - | never |
| rendering/traits/speciesArt.js | 43 | `_canvases` | const object | own | own | - | - | never |
| rendering/traits/speciesArt.js | 44 | `_speciesStats` | const object | own | own | - | - | never |
| rendering/traits/speciesArt.js | 65 | `_retryOn` | let bool | own | own | flag | - | never |
| rendering/traits/speciesArt.js | 194 | `_lastSweep` | let number | own | own | - | - | never |
| rendering/traits/speciesCatalog.js | 81 | `_active` | let string | own | own | - | - | never |
| rendering/traits/speciesCatalog.js | 88 | `_listeners` | const Set | own | own | - | - | never |
| rendering/traits/traitMaterials.js | 183 | `MAIN_MATERIAL` | const object | own | own | - | - | never |
| rendering/warmOnce.js | 23 | `_on` | let bool | own | own | flag | - | never |
| rendering/waterAttackFx.js | 49 | `_cells` | let null | own | own | - | - | never |
| rendering/waterAttackFx.js | 111 | `_wanted` | let bool | own | own | flag | - | zone |
| rendering/waterFrogSprites.js | 73 | `idleSheets` | const object | own | own | - | - | zone |
| rendering/waterFrogSprites.js | 74 | `hopSheets` | const object | own | own | - | - | zone |
| rendering/waterFrogSprites.js | 75 | `attackSheets` | const object | own | own | - | - | zone |
| rendering/waterFrogSprites.js | 76 | `deathFrames` | let array | own | own | - | - | zone |
| rendering/waterFrogSprites.js | 77 | `loadPromise` | let null | own | own | - | - | zone |
| rendering/weaponLookFrame.js | 36 | `_stats` | const object | own | own | - | - | never |
| rendering/weaponLookFrame.js | 38 | `_waitFrom` | let number | own | own | - | - | never |
| rendering/weaponSprites.js | 74 | `SHEETS` | const object | own | own | - | - | never |
| rendering/weaponSprites.js | 174 | `loadPromise` | let null | own | own | - | - | never |
| rendering/weaponSprites.js | 186 | `_set` | let null | own | own | - | - | never |
| rendering/weaponSprites.js | 186 | `_softened` | let bool | own | own | flag | - | never |
| rendering/wheelBuildingIcons.js | 36 | `_canvas` | const object | own | own | - | - | zone |
| rendering/wheelBuildingIcons.js | 37 | `_grey` | const object | own | own | - | - | zone |
| rendering/wheelBuildingIcons.js | 38 | `_tex` | const object | own | own | - | - | zone |
| rendering/wheelBuildingIcons.js | 39 | `_loading` | let null | own | own | - | - | zone |
| rendering/wheelBuildingIcons.js | 40 | `_live` | const Set | own | own | - | - | zone |
| rendering/wheelDoors.js | 93 | `_pics` | const Map | own | own | - | - | zone |
| rendering/wheelDoors.js | 94 | `_picVer` | let number | own | own | - | - | never |
| rendering/wheelDoors.js | 95 | `_liveDoors` | let null | own | own | - | - | never |
| rendering/wheelGround.js | 59 | `_liveGround` | let null | own | own | - | - | zone |
| rendering/wheelLife.js | 73 | `_flagCuts` | const WeakMap | own | own | - | - | zone |
| rendering/wheelLife.js | 74 | `_flags` | const Set | own | own | - | - | zone |
| rendering/wheelLife.js | 75 | `_flagStats` | const object | own | own | - | - | never |
| rendering/wheelLife.js | 130 | `_tex` | let null | own | own | - | - | zone |
| rendering/wheelMonsterArt.js | 91 | `wheelArtStats` | const object | own | 2: game/worldTrial.js, rendering/wheelMonsterArt.js | - | - | never |
| rendering/wheelMonsterArt.js | 104 | `_zone` | let null | own | own | - | - | zone |
| rendering/wheelMonsterArt.js | 105 | `_curZone` | let null | own | own | - | - | never |
| rendering/wheelMonsterArt.js | 106 | `_gen` | let number | own | own | - | - | never |
| rendering/wheelMonsterArt.js | 107 | `_lastTick` | let number | own | own | - | - | never |
| rendering/wheelMonsterArt.js | 108 | `_waitSince` | let number | own | own | - | - | zone |
| rendering/wheelMonsterArt.js | 110 | `_looks` | const Map | own | own | - | - | zone |
| rendering/wheelObjects.js | 110 | `_idx` | let null | own | own | - | - | zone |
| rendering/wheelObjects.js | 228 | `_pw` | let null | own | own | - | - | zone |
| rendering/wheelObjects.js | 228 | `_pwSeq` | let number | own | - | no-read | - | never |
| rendering/wheelObjects.js | 229 | `_pwWait` | const Map | own | own | - | - | zone |
| rendering/wheelObjects.js | 302 | `_basesStats` | const object | own | own | - | - | never |
| rendering/wheelObjects.js | 303 | `_basesWorst` | const array | own | own | - | - | never |
| rendering/wheelObjects.js | 393 | `_pages` | const Map | own | own | - | - | zone |
| rendering/wheelObjects.js | 394 | `_loading` | let number | own | own | - | - | never |
| rendering/wheelObjects.js | 437 | `_pageLog` | const array | own | own | - | - | never |
| rendering/wheelObjects.js | 462 | `_gen` | let number | own | own | - | - | never |
| rendering/wheelObjects.js | 900 | `_live` | let null | own | own | - | - | zone |
| rendering/wheelObjects.js | 942 | `_bottoms` | const WeakMap | own | own | - | - | zone |
| rendering/wheelObjects.js | 944 | `_bottomsLeft` | let number | own | own | - | - | never |
| rendering/wheelObjects.js | 944 | `_castFrame` | let number | own | - | no-read | - | never |
| rendering/wheelShatter.js | 60 | `_puff` | let null | own | own | - | - | zone |
| rendering/wheelSignposts.js | 55 | `_icons` | const object | own | own | - | - | zone |
| rendering/wheelSignposts.js | 56 | `_iconsLoading` | let null | own | own | - | - | zone |
| rendering/wheelSignposts.js | 91 | `_live` | const Set | own | own | - | - | zone |
| rendering/wheelSignposts.js | 114 | `_found` | let object | own | own | - | - | zone |
| rendering/wheelWater.js | 453 | `_webAll` | let bool | own | own | flag | - | never |
| rendering/wheelWater.js | 455 | `_allProgram` | let null | own | own | - | - | never |
| rendering/wheelWater.js | 455 | `_program` | let null | own | own | - | - | never |
| rendering/wheelWater.js | 501 | `_palAllProgram` | let null | own | own | - | - | never |
| rendering/wheelWater.js | 501 | `_palProgram` | let null | own | own | - | - | never |
| rendering/wheelWater.js | 531 | `_uni` | const new UniformGroup | own | own | - | - | never |
| rendering/wheelWater.js | 541 | `_renderer` | let null | own | own | - | - | never |
| rendering/wheelWater.js | 542 | `_ok` | let null | own | own | - | - | never |
| rendering/wheelWater.js | 543 | `_liveOff` | let bool | own | own | flag | - | never |
| rendering/wheelWater.js | 554 | `_stillKnob` | let null | own | own | - | - | ? |
| rendering/wheelWater.js | 576 | `_held` | let null | own | own | - | - | never |
| rendering/wheelWater.js | 577 | `_live` | let null | own | own | - | - | zone |
| rendering/wheelWater.js | 595 | `_cover` | let bool | own | own | flag | - | never |
| rendering/wheelWater.js | 601 | `_stats` | const object | own | own | - | - | never |
| rendering/wheelWater.js | 644 | `_uniformTex` | const Map | own | own | - | - | never |
| rendering/worldFx.js | 60 | `ZONE_AIR` | const object | own | own | - | - | never |
| rendering/worldFx.js | 116 | `PROP_LIGHTS` | const object | own | 2: rendering/worldFx.js, rendering/worldLife.js | - | - | never |
| rendering/worldFx.js | 204 | `_groundCache` | const object | own | own | - | - | never |
| rendering/worldFxTextures.js | 20 | `_tex` | const object | own | own | - | - | never |
| rendering/worldLife.js | 101 | `FX` | const object | own | own | - | - | never |
| rendering/worldLife.js | 102 | `PART` | const object | own | own | - | - | never |
| rendering/worldLife.js | 103 | `_ready` | let null | own | own | - | - | never |
| rendering/worldLife.js | 218 | `_parts` | let null | own | own | - | - | ? |
| rendering/worldLife.js | 306 | `FG_SWAY` | const object | own | own | - | - | never |
| rendering/worldLife.js | 333 | `FALLS` | const object | own | own | - | - | never |
| rendering/worldLife.js | 347 | `SMOKE` | const object | own | own | - | - | never |
| rendering/worldLife.js | 351 | `SPARKS_EXTRA` | const object | own | own | - | - | never |
| rendering/zoneBannerPreload.js | 62 | `_held` | const Map | own | own | - | - | zone |
| rendering/zoneBannerPreload.js | 63 | `_inflight` | const Map | own | own | - | - | zone |
| rendering/zoneBannerPreload.js | 85 | `_want` | const Set | own | own | - | - | zone |
| rendering/zoneBannerPreload.js | 86 | `_failAt` | const Map | own | own | - | - | never |
| rendering/zoneBannerPreload.js | 95 | `_stats` | const object | own | own | - | - | never |
| rendering/zoneBannerPreload.js | 230 | `_near` | const object | own | own | - | - | never |
| rendering/zoneBannerPreload.js | 231 | `_lastTick` | let number | own | own | - | - | never |
| rendering/zoneTextures.js | 60 | `_bundles` | const Map | own | own | - | - | zone |
| rendering/zoneTextures.js | 63 | `_crops` | const Map | own | own | - | - | zone |
| rendering/zoneTextures.js | 66 | `_gen` | const Map | own | own | - | - | never |
| rendering/zoneTextures.js | 200 | `_readStats` | const object | own | own | - | - | never |
| rendering/zoneTextures.js | 302 | `_play` | let null | own | own | - | - | never |
| rendering/zoneTextures.js | 312 | `_line` | let call | own | own | - | - | never |
| rendering/zoneTextures.js | 312 | `_sliceT0` | let number | own | own | - | - | never |
| rendering/zoneTextures.js | 312 | `_waiting` | let number | own | - | no-read | - | never |
| rendering/zoneTextures.js | 313 | `_slices` | const object | own | own | - | - | never |
| rendering/zoneTextures.js | 436 | `_stripStats` | const array | own | own | - | - | never |
| rendering/zoneTextures.js | 439 | `_verify` | const Map | own | own | - | - | never |
| ui/BroTown.jsx | 523 | `BT_AUDIO` | const value | own | own | - | - | never |
| ui/DeviceScreen.js | 20 | `el` | let null | own | own | - | - | never |
| ui/LevelUpBurst.jsx | 654 | `_lastSting` | let number | own | own | - | - | never |
| ui/LingerScreen.js | 19 | `el` | let null | own | own | - | rejoin | rejoin |
| ui/LingerScreen.js | 20 | `timer` | let null | own | own | - | rejoin | rejoin |
| ui/LingerScreen.js | 21 | `nextAt` | let number | own | own | - | - | rejoin |
| ui/OriginScreen.js | 24 | `el` | let null | own | own | - | - | never |
| ui/PlayerIcon.jsx | 38 | `PORTRAIT_CACHE` | const Map | own | own | - | - | never |
| ui/PlayerIcon.jsx | 42 | `PORTRAIT_INFLIGHT` | const Map | own | own | - | - | never |
| ui/RoomFullScreen.js | 35 | `el` | let null | own | own | - | - | rejoin |
| ui/RoomFullScreen.js | 36 | `timer` | let null | own | own | - | - | rejoin |
| ui/RoomFullScreen.js | 37 | `nextAt` | let number | own | own | - | - | rejoin |
| ui/RoomFullScreen.js | 38 | `attempts` | let number | own | own | - | - | rejoin |
| ui/WorldMapOverlay.jsx | 83 | `_pinImgs` | let null | own | own | - | - | never |
| ui/WorldMapOverlay.jsx | 137 | `_openMap` | let null | own | own | - | - | never |
| ui/WorldMapOverlay.jsx | 145 | `_toggleMap` | let null | own | own | - | - | never |
| ui/XpFlyOverlay.jsx | 613 | `_landAB` | let number | own | own | - | - | never |
| ui/XpFlyOverlay.jsx | 613 | `_landT` | let number | own | own | - | - | never |
| ui/afterFrame.js | 26 | `_fns` | const Set | own | own | - | - | never |
| ui/afterFrame.js | 27 | `_ranAt` | let number | own | own | - | - | never |
| ui/deskTeach.js | 36 | `_getS` | let null | own | own | - | - | never |
| ui/deskTeach.js | 36 | `_t` | let object | own | own | - | - | never |
| ui/deskTeach.js | 36 | `_timer` | let null | own | own | - | - | never |
| ui/deskTeach.js | 36 | `_who` | let null | own | own | - | - | never |
| ui/deskTeach.js | 37 | `_edgeEl` | let null | own | own | - | - | zone |
| ui/deskTeach.js | 37 | `_keyEl` | let null | own | own | - | - | zone |
| ui/deskTeach.js | 37 | `_labelEl` | let null | own | own | - | - | zone |
| ui/deskTeach.js | 37 | `_tipsEl` | let null | own | own | - | - | never |
| ui/deskTeach.js | 37 | `_toastEl` | let null | own | own | - | - | never |
| ui/deskTeach.js | 38 | `_rings` | let array | own | own | - | - | zone |
| ui/deskTeach.js | 39 | `_armed` | let null | own | own | - | - | zone |
| ui/deskTeach.js | 40 | `_cursorOn` | let bool | own | own | - | - | never |
| ui/deskTeach.js | 40 | `_encUntil` | let number | own | own | - | - | never |
| ui/deskTeach.js | 40 | `_lastMouse` | let null | own | - | no-read | - | never |
| ui/deskTeach.js | 40 | `_nextEnc` | let number | own | own | - | - | zone |
| ui/deskTeach.js | 40 | `_tipsUntil` | let number | own | own | - | - | never |
| ui/deskTeach.js | 40 | `_toastUntil` | let number | own | own | - | - | never |
| ui/deskTeach.js | 41 | `qa` | const object | own | own | - | - | never |
| ui/guideArrow.js | 55 | `_pace` | let object | own | own | - | - | never |
| ui/guideArrow.js | 334 | `_bob` | let null | own | own | - | - | never |
| ui/guideArrow.js | 334 | `_el` | let null | own | own | - | - | never |
| ui/guideArrow.js | 334 | `_label` | let null | own | own | - | - | never |
| ui/guideArrow.js | 334 | `_side` | let null | own | own | - | - | never |
| ui/guideArrow.js | 334 | `_timer` | let null | own | own | - | - | never |
| ui/guideArrow.js | 335 | `_seen` | const object | own | own | - | - | never |
| ui/guideArrow.js | 336 | `_swapFrom` | let null | own | own | - | - | never |
| ui/guideArrow.js | 337 | `_done` | let object | own | own | - | - | never |
| ui/guideArrow.js | 337 | `_lastTick` | let number | own | own | - | - | never |
| ui/guideArrow.js | 337 | `_who` | let null | own | own | - | - | never |
| ui/guideArrow.js | 338 | `qa` | const object | own | own | - | - | never |
| ui/guideArrow.js | 395 | `_followS` | let null | own | own | - | - | never |
| ui/guideArrow.js | 396 | `_followAt` | let object | own | own | - | - | never |
| ui/guideArrow.js | 411 | `_stopFollow` | let null | own | own | - | - | never |
| ui/lazyPanel.js | 68 | `_loaded` | const array | own | own | - | - | never |
| ui/lazyPanel.js | 69 | `_failed` | const array | own | own | - | - | never |
| ui/lazyPanel.js | 70 | `_named` | const array | own | own | - | - | never |
| ui/lazyPanel.js | 71 | `_cards` | const object | own | own | - | - | never |
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
| ui/mayorScreen.js | 22 | `_asked` | let bool | own | own | flag | - | ? |
| ui/mayorScreen.js | 22 | `_box` | let null | own | own | - | - | never |
| ui/mayorScreen.js | 22 | `_boxAt` | let number | own | own | - | - | never |
| ui/mayorScreen.js | 22 | `_cv` | let null | own | own | - | - | never |
| ui/mayorScreen.js | 22 | `_ro` | let null | own | own | - | - | never |
| ui/mayorScreen.js | 22 | `_wired` | let bool | own | own | flag | - | never |
| ui/mobile/BottomDashboard.jsx | 548 | `_deskOpened` | let bool | own | own | flag | - | never |
| ui/mobile/ChestReveal.jsx | 37 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/ChestReveal.jsx | 38 | `_state` | let object | own | own | - | - | never |
| ui/mobile/ChestReveal.jsx | 87 | `_warm` | const array | own | own | - | - | never |
| ui/mobile/DungeonClearHud.jsx | 58 | `_held` | const array | own | - | no-read | - | never |
| ui/mobile/ItemTooltip.jsx | 31 | `toastQueue` | let array | own | own | - | - | never |
| ui/mobile/ItemTooltip.jsx | 32 | `toastListeners` | let Set | own | own | - | - | never |
| ui/mobile/QuestCoach.jsx | 174 | `_oversize` | let object | own | own | - | - | never |
| ui/mobile/QuestCoach.jsx | 179 | `_cardPressAt` | let null | own | own | - | - | never |
| ui/mobile/aceFlipBus.js | 16 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/actionBus.js | 14 | `_cycleWeapon` | let null | own | own | - | - | never |
| ui/mobile/actionBus.js | 17 | `_selectSlot` | let null | own | own | - | - | never |
| ui/mobile/bandSideways.js | 76 | `_side` | let null | own | own | - | - | never |
| ui/mobile/bandSideways.js | 105 | `_started` | let bool | own | own | flag | - | never |
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
| ui/mobile/dash/InventoryPanel.jsx | 307 | `ITEM_NAMES` | const object | own | 8: ui/mobile/dash/ItemDetailPopup.jsx, ui/panels/AceFlipPanel.jsx, ui/panels/ShopkeeperPanel.jsx, +5 | - | - | never |
| ui/mobile/dash/InventoryPanel.jsx | 649 | `_lastBagTab` | let string | own | own | - | - | never |
| ui/mobile/dash/ItemDetailPopup.jsx | 97 | `SMELT_ORE_TO_BAR` | const object | own | own | - | - | never |
| ui/mobile/dash/LeaderboardPanel.jsx | 334 | `lastCat` | let null | own | own | - | - | never |
| ui/mobile/dash/LeaderboardPanel.jsx | 367 | `NAME_FIT` | const Map | own | own | - | - | ? |
| ui/mobile/dash/LeaderboardPanel.jsx | 369 | `_fitCtx` | let null | own | own | - | - | ? |
| ui/mobile/dash/QuestPages.jsx | 68 | `lastAt` | let call | own | own | - | - | ? |
| ui/mobile/dash/QuestPages.jsx | 71 | `pendingOpen` | let null | own | own | - | - | ? |
| ui/mobile/dash/QuestsPanel.jsx | 91 | `lastPick` | let null | own | own | - | - | never |
| ui/mobile/dash/T2Panel.jsx | 39 | `_pendingCat` | let null | own | own | - | - | never |
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
| ui/mobile/dashMinBus.js | 38 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/dashMinBus.js | 48 | `dashMinBus` | const object | 9: ui/mobile/dash/BandGrip.jsx, ui/mobile/bandSideways.js, ui/mobile/BottomDashboard.jsx, game/deskKeys.js, +5 | 9: ui/mobile/BottomDashboard.jsx, ui/mobile/bandSideways.js, ui/mobile/dash/BandGrip.jsx, +6 | 2+ | - | never |
| ui/mobile/dashboardPanelBus.js | 29 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/dashboardPanelBus.js | 96 | `dashboardPanelBus` | const object | 13: ui/mobile/dash/SettingsPanel.jsx, ui/mobile/BottomDashboard.jsx, game/desktopControls.js, ui/BroTown.jsx, +9 | 26: ui/mobile/BottomDashboard.jsx, ui/BroTown.jsx, ui/mobile/bandSideways.js, +23 | 2+ | - | never |
| ui/mobile/eatBus.js | 5 | `listeners` | const Set | own | own | - | - | never |
| ui/mobile/farmBus.js | 18 | `listeners` | const Set | own | own | - | - | never |
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
| ui/mobile/playViewport.js | 56 | `_ro` | let null | own | own | - | - | never |
| ui/mobile/playViewport.js | 56 | `_roEl` | let null | own | own | - | - | never |
| ui/mobile/playViewport.js | 56 | `_sh` | let number | own | own | - | - | never |
| ui/mobile/playViewport.js | 56 | `_sw` | let number | own | own | - | - | never |
| ui/mobile/playViewport.js | 56 | `_vh` | let number | own | own | - | - | never |
| ui/mobile/playViewport.js | 56 | `_vw` | let number | own | own | - | - | never |
| ui/mobile/playViewport.js | 56 | `_wired` | let bool | own | own | flag | - | never |
| ui/mobile/playViewport.js | 57 | `_sizes` | const object | own | own | - | - | never |
| ui/mobile/playViewport.js | 116 | `_wh` | let number | own | own | - | - | ? |
| ui/mobile/playViewport.js | 116 | `_winWired` | let bool | own | own | flag | - | ? |
| ui/mobile/playViewport.js | 116 | `_ww` | let number | own | own | - | - | ? |
| ui/mobile/playViewport.js | 117 | `_winSizes` | const object | own | own | - | - | ? |
| ui/mobile/sheet/BroCard.jsx | 111 | `_pick` | let null | own | own | - | - | never |
| ui/mobile/sheet/HeroExpanded.jsx | 147 | `_lastSection` | let string | own | own | - | - | never |
| ui/mobile/sheet/HeroExpanded.jsx | 148 | `_lastFam` | let null | own | own | - | - | never |
| ui/mobile/sheet/StatCaption.jsx | 36 | `_ctx` | let null | own | own | - | - | never |
| ui/mobile/sheet/StatDemo.jsx | 663 | `_kicks` | const object | own | own | - | - | never |
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
| ui/mobile/sheetStamp.js | 63 | `_insetKept` | let number | own | own | - | - | ? |
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
| ui/panels/ChargeButton.jsx | 40 | `_dashes` | let number | own | own | - | - | ? |
| ui/panels/ChargeButton.jsx | 40 | `_presses` | let number | own | own | - | - | ? |
| ui/panels/ContextButton.jsx | 98 | `_probeKey` | let null | own | own | - | - | ? |
| ui/panels/TradeWindowPanel.jsx | 232 | `_tradeSide` | let none | own | own | phase | - | never |
| ui/panels/WeaponPill.jsx | 63 | `_qaTapMs` | let none | own | own | - | - | never |
| ui/panels/WeaponPill.jsx | 132 | `qa` | const object | own | own | - | - | never |
| ui/panels/buildings/TownBoard.jsx | 75 | `THUMB_FIT` | const Map | own | own | - | - | never |
| ui/panels/controlSkin.jsx | 316 | `WEAPON_KEYS` | var object | own | own | - | - | never |
| ui/panels/paintTools.js | 37 | `_ink` | let number | own | own | - | - | never |
| ui/panels/paintTools.js | 40 | `_brush` | let number | own | own | - | - | never |
| ui/panels/paintTools.js | 42 | `_listeners` | const Set | own | own | - | - | never |
| ui/petPortrait.jsx | 14 | `_img` | let null | own | own | - | - | never |
| ui/petPortrait.jsx | 15 | `_imgReady` | let null | own | own | - | - | never |
| ui/reveal/revealBus.js | 13 | `_queue` | const array | own | own | - | - | never |
| ui/reveal/revealBus.js | 14 | `_notify` | let null | own | own | - | - | never |
| ui/reveal/revealBus.js | 16 | `revealBus` | const object | 2: game/revealBag.js, networking/wsClient.js | 2: ui/reveal/RevealOverlay.jsx, ui/reveal/revealBus.js | 2+ | - | never |
| ui/starCue.js | 29 | `lastKey` | let null | own | own | - | - | never |
| ui/starCue.js | 30 | `live` | let null | own | own | - | - | never |
| ui/starCue.js | 31 | `qa` | const object | own | own | - | - | never |
| ui/swallowTapClick.js | 62 | `_armed` | let null | own | own | - | - | never |
| ui/swallowTapClick.js | 63 | `_off` | let null | own | own | - | - | never |
| ui/swallowTapClick.js | 64 | `_bound` | let bool | own | own | flag | - | never |
| ui/swallowTapClick.js | 65 | `_qa` | const object | own | own | - | - | never |
| ui/uiSfxDelegate.js | 102 | `installed` | let bool | own | own | flag | - | never |
| ui/wheelMiniSize.js | 41 | `_at` | let number | own | own | - | - | never |
| ui/wheelMiniSize.js | 41 | `_k` | let number | own | own | - | - | never |
| ui/worldMapDetail.js | 40 | `_tiles` | const Map | own | own | - | - | never |
| ui/worldMapDetail.js | 41 | `_loading` | let number | own | own | - | - | never |
| ui/worldMapDetail.js | 42 | `_gen` | let number | own | own | - | - | never |
| ui/worldMapDetail.js | 43 | `_frame` | let number | own | own | - | - | never |
| ui/worldMapDetail.js | 44 | `_stats` | const object | own | own | - | - | never |
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
| `S._arenaInvolved` | game/arenaDoor.js | rejoin | - |
| `S._arenaMatch` | game/arenaDoor.js | rejoin | - |
| `S._arenaTournamentId` | game/arenaDoor.js | rejoin | - |
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
| `S._wheelDungeonOpening` | game/dungeonArt.js | zone | - |
| `S._dungeonClear` | game/dungeonClear.js | zone | - |
| `S._dungeonComplete` | game/dungeonDoor.js | zone+rejoin | zone, death |
| `S._inCustomDungeon` | game/dungeonDoor.js | zone+rejoin | zone, death |
| `S._inDungeon` | game/dungeonDoor.js | zone+rejoin | zone, death |
| `S._customDungeonConfig` | game/dungeonWaves.js | zone+rejoin | zone, death |
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
| `S._stuckUntil` | game/elemHits.js | zone | - |
| `S._thornUntil` | game/elemHits.js | zone | - |
| `S._wobbleFrom` | game/elemHits.js | zone | - |
| `S._wobbleUntil` | game/elemHits.js | zone | - |
| `S._nearBed` | game/farmWalk.js | zone | - |
| `S._fishBoard` | game/fishWeigh.js | rejoin | - |
| `S._shieldCdUntil` | game/guardBreak.js | death | - |
| `S._shieldUp` | game/guardDoor.js | death | - |
| `S._extraction` | game/harvestDoor.js | zone | - |
| `S._shotEnds` | game/hitSounds.js | zone | - |
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
| `S._pose` | game/poseDoor.js | zone+rejoin | rejoin |
| `S._shotImpacts` | game/projectiles.js | zone | - |
| `S.dmgNumbers` | game/projectiles.js | zone | - |
| `S._raceLil` | game/race.js | zone+rejoin | - |
| `S._race` | game/raceDoor.js | zone+rejoin | - |
| `S.campfires` | game/renderFrame.js | zone | - |
| `S.projectiles` | game/renderFrame.js | zone | - |
| `S._restAsked` | game/rest.js | rejoin | - |
| `S._ride` | game/ride.js | zone+rejoin | - |
| `S._shieldAutoReleased` | game/shieldToggle.js | death | - |
| `S._sparkArcs` | game/shockSpark.js | zone | - |
| `S._pvpSkullType` | game/skullDoor.js | rejoin | - |
| `S._pvpSkullUntil` | game/skullDoor.js | rejoin | - |
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
| `S._trap` | game/trapping.js | zone+rejoin | zone |
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
| `S._wheelTripVeil` | game/zoneTransitions.js | zone | - |
| `S._zoneLoading` | game/zoneTransitions.js | zone | - |
| `S._activeClanWar` | networking/gameEvents.js | rejoin | - |
| `S._arenaStakeBoard` | networking/gameEvents.js | rejoin | - |
| `S._fireTrail` | networking/gameEvents.js | zone | - |
| `S._impactRings` | networking/gameEvents.js | zone | - |
| `S._jackpotPool` | networking/gameEvents.js | rejoin | - |
| `S._jackpotTickets` | networking/gameEvents.js | rejoin | - |
| `S._serverDungeon` | networking/gameEvents.js | zone+rejoin | zone, death |
| `S._staggerUntil` | networking/gameEvents.js | zone | - |
| `S._stunEnd` | networking/gameEvents.js | death | - |
| `S._telegraphZones` | networking/gameEvents.js | zone | - |
| `S._threatMarks` | networking/gameEvents.js | rejoin | - |
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
| `S._atkPending` | ui/BroTown.jsx | zone | - |
| `S._bleedUntil` | ui/BroTown.jsx | death | - |
| `S._deskPressLock` | ui/BroTown.jsx | zone | - |
| `S._dmgBuff` | ui/BroTown.jsx | rejoin | - |
| `S._dmgBuffMul` | ui/BroTown.jsx | rejoin | - |
| `S._farmArtHold` | ui/BroTown.jsx | zone | - |
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
| `S._netHold` | ui/BroTown.jsx | rejoin | - |
| `S._npcProxLatch` | ui/BroTown.jsx | zone | - |
| `S._petFetch` | ui/BroTown.jsx | zone | - |
| `S._petX` | ui/BroTown.jsx | zone | - |
| `S._petY` | ui/BroTown.jsx | zone | - |
| `S._playerCount` | ui/BroTown.jsx | rejoin | - |
| `S._proxNode` | ui/BroTown.jsx | zone | - |
| `S._shieldAngle` | ui/BroTown.jsx | death | - |
| `S._shieldKb` | ui/BroTown.jsx | death | - |
| `S._shieldMouse` | ui/BroTown.jsx | death | - |
| `S._sled` | ui/BroTown.jsx | zone | - |
| `S._sleeping` | ui/BroTown.jsx | zone | - |
| `S._slideVx` | ui/BroTown.jsx | zone | - |
| `S._slideVy` | ui/BroTown.jsx | zone | - |
| `S._snowballs` | ui/BroTown.jsx | zone | - |
| `S._snowmen` | ui/BroTown.jsx | zone | - |
| `S._spdBuffMul` | ui/BroTown.jsx | rejoin | - |
| `S._torch` | ui/BroTown.jsx | zone | - |
| `S._townArtHold` | ui/BroTown.jsx | zone | - |
| `S._wellRestedUntil` | ui/BroTown.jsx | death | - |
| `S.autoAttack` | ui/BroTown.jsx | zone | - |
| `S.collectibles` | ui/BroTown.jsx | zone | - |
| `S.destroyedTrees` | ui/BroTown.jsx | zone | - |
| `S.fishTimer` | ui/BroTown.jsx | zone | - |
| `S.nearBuilding` | ui/BroTown.jsx | zone | - |
| `S.shieldEnd` | ui/BroTown.jsx | death | - |
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
| `_kept` | game/chatMute.js:159 | rejoin | - |
| `_state` | game/dailyRewards.js:27 | rejoin | - |
| `_live` | game/dungeonArt.js:56 | zone | - |
| `st` | game/fishWeigh.js:17 | rejoin | - |
| `_st` | game/loginSpinWheel.js:66 | rejoin | - |
| `_ask` | game/nmlAsk.js:141 | zone | - |
| `_note` | game/noMansLand.js:195 | zone | - |
| `_pending` | game/questHandIn.js:26 | rejoin | - |
| `_then` | game/revealBag.js:78 | rejoin | - |
| `_pending` | game/shardCrack.js:35 | rejoin | - |
| `_pending` | game/shieldGem.js:44 | rejoin | - |
| `_pending` | game/weaponGem.js:34 | rejoin | - |
| `_dmg` | game/wheelBreak.js:52 | zone | - |
| `_broken` | game/wheelBreak.js:53 | zone | - |
| `_events` | game/wheelBreak.js:54 | zone | - |
| `_src` | game/wheelBreak.js:55 | zone | - |
| `_m` | game/wheelMusic.js:75 | zone | - |
| `_built` | game/wheelSize.js:50 | zone | - |
| `_w` | game/wheelTrial.js:46 | zone | - |
| `_initP` | game/wheelTrial.js:47 | zone | - |
| `_info` | game/wheelTrial.js:48 | zone | - |
| `_grid` | game/wheelTrial.js:49 | zone | - |
| `_blocks` | game/wheelTrial.js:53 | zone | - |
| `_rowsMade` | game/wheelTrial.js:54 | zone | - |
| `_overview` | game/wheelTrial.js:55 | zone | - |
| `_overviewLands` | game/wheelTrial.js:56 | zone | - |
| `_pending` | game/wheelTrial.js:58 | zone | - |
| `_warm` | game/wheelTrial.js:59 | zone | - |
| `_filling` | game/wheelTrial.js:60 | zone | - |
| `_here` | game/wheelTrial.js:61 | zone | - |
| `_hereAsked` | game/wheelTrial.js:62 | zone | - |
| `_under` | game/wheelTrial.js:64 | zone | - |
| `_failP` | game/wheelTrial.js:297 | zone | - |
| `_retryAt` | game/wheelTrial.js:297 | zone | - |
| `_retryWait` | game/wheelTrial.js:297 | zone | - |
| `_local` | game/wheelTrial.js:720 | zone | - |
| `_ready` | game/worldTrial.js:123 | zone | - |
| `_lastSurface` | game/worldTrial.js:424 | zone | - |
| `_pending` | networking/broWallet.js:55 | rejoin | - |
| `_state` | networking/serverReady.js:62 | rejoin | - |
| `_veil` | networking/serverReady.js:135 | rejoin | - |
| `_veilTimer` | networking/serverReady.js:136 | rejoin | - |
| `_live` | rendering/arenaWorld.js:64 | zone | - |
| `_liveFires` | rendering/buildingFire.js:719 | zone | - |
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
| `_figs` | rendering/formShade.js:149 | zone | - |
| `_live` | rendering/grottoFx.js:115 | zone | - |
| `_swayers` | rendering/grottoFx.js:488 | zone | - |
| `_boxes` | rendering/hairClip.js:63 | zone | - |
| `_propChips` | rendering/hitMaterialFx.js:515 | zone | - |
| `_tex` | rendering/landAuras.js:125 | zone | - |
| `_live` | rendering/monsterDeathZonesFx.js:102 | zone | - |
| `_cache` | rendering/monsterRecolor.js:86 | zone | - |
| `_variantLoadKicked` | rendering/monsterVariantSprites.js:249 | zone | - |
| `_kicksOn` | rendering/monsterVariantSprites.js:254 | zone | - |
| `walkSheets` | rendering/mummySprites.js:51 | zone | - |
| `transformFrames` | rendering/mummySprites.js:52 | zone | - |
| `loadPromise` | rendering/mummySprites.js:53 | zone | - |
| `_tex` | rendering/npcSprites.js:42 | zone | - |
| `_walk` | rendering/npcSprites.js:131 | zone | - |
| `_wheelWalk` | rendering/npcSprites.js:134 | zone | - |
| `_propAnim` | rendering/npcSprites.js:167 | zone | - |
| `_town` | rendering/npcSprites.js:266 | zone | - |
| `_townReady` | rendering/npcSprites.js:267 | zone | - |
| `_townUnload` | rendering/npcSprites.js:268 | zone | - |
| `_townKeys` | rendering/npcSprites.js:269 | zone | - |
| `_townCrops` | rendering/npcSprites.js:270 | zone | - |
| `_townAnimIds` | rendering/npcSprites.js:271 | zone | - |
| `_wheelTex` | rendering/npcSprites.js:422 | zone | - |
| `_wheelArt` | rendering/npcSprites.js:423 | zone | - |
| `_live` | rendering/picsNumbers.js:53 | zone | - |
| `_rows` | rendering/picsNumbers.js:56 | zone | - |
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
| `_wanted` | rendering/stormSparksFx.js:98 | zone | - |
| `SNOWBALL_BURST` | rendering/systems/effectsRenderer.js:1472 | zone | - |
| `_snowballBurstLoad` | rendering/systems/effectsRenderer.js:1479 | zone | - |
| `_npcDrawn` | rendering/systems/entityRenderer.js:374 | zone | - |
| `_lastPeerWeaponSprite` | rendering/systems/entityRenderer.js:1601 | zone | - |
| `_peerQueue` | rendering/systems/entityRenderer.js:3162 | zone | - |
| `_wanted` | rendering/waterAttackFx.js:111 | zone | - |
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
| `_liveGround` | rendering/wheelGround.js:59 | zone | - |
| `_flagCuts` | rendering/wheelLife.js:73 | zone | - |
| `_flags` | rendering/wheelLife.js:74 | zone | - |
| `_tex` | rendering/wheelLife.js:130 | zone | - |
| `_zone` | rendering/wheelMonsterArt.js:104 | zone | - |
| `_waitSince` | rendering/wheelMonsterArt.js:108 | zone | - |
| `_looks` | rendering/wheelMonsterArt.js:110 | zone | - |
| `_idx` | rendering/wheelObjects.js:110 | zone | - |
| `_pw` | rendering/wheelObjects.js:228 | zone | - |
| `_pwWait` | rendering/wheelObjects.js:229 | zone | - |
| `_pages` | rendering/wheelObjects.js:393 | zone | - |
| `_live` | rendering/wheelObjects.js:900 | zone | - |
| `_bottoms` | rendering/wheelObjects.js:942 | zone | - |
| `_puff` | rendering/wheelShatter.js:60 | zone | - |
| `_icons` | rendering/wheelSignposts.js:55 | zone | - |
| `_iconsLoading` | rendering/wheelSignposts.js:56 | zone | - |
| `_live` | rendering/wheelSignposts.js:91 | zone | - |
| `_found` | rendering/wheelSignposts.js:114 | zone | - |
| `_live` | rendering/wheelWater.js:577 | zone | - |
| `_held` | rendering/zoneBannerPreload.js:62 | zone | - |
| `_inflight` | rendering/zoneBannerPreload.js:63 | zone | - |
| `_want` | rendering/zoneBannerPreload.js:85 | zone | - |
| `_bundles` | rendering/zoneTextures.js:60 | zone | - |
| `_crops` | rendering/zoneTextures.js:63 | zone | - |
| `nextAt` | ui/LingerScreen.js:21 | rejoin | - |
| `el` | ui/RoomFullScreen.js:35 | rejoin | - |
| `timer` | ui/RoomFullScreen.js:36 | rejoin | - |
| `nextAt` | ui/RoomFullScreen.js:37 | rejoin | - |
| `attempts` | ui/RoomFullScreen.js:38 | rejoin | - |
| `_edgeEl` | ui/deskTeach.js:37 | zone | - |
| `_keyEl` | ui/deskTeach.js:37 | zone | - |
| `_labelEl` | ui/deskTeach.js:37 | zone | - |
| `_rings` | ui/deskTeach.js:38 | zone | - |
| `_armed` | ui/deskTeach.js:39 | zone | - |
| `_nextEnc` | ui/deskTeach.js:40 | zone | - |
| `state` | ui/mobile/blockRingBus.js:15 | death | - |
| `blockRingBus` | ui/mobile/blockRingBus.js:30 | death | - |
| `capeStatusBus` | ui/mobile/capeStatusBus.js:26 | rejoin | - |
| `_lastLand` | ui/mobile/placeName.js:18 | zone | - |
| `doc` | ui/mobile/sheet/friendsSync.js:25 | rejoin | - |
| `_playing` | ui/zoneBannerOverlay.js:77 | zone | - |
| `_lastZone` | ui/zoneBannerOverlay.js:336 | zone | - |
| `_wl` | ui/zoneBannerOverlay.js:413 | zone | - |

## What the machine cannot follow

- **The state handed whole to something it cannot resolve** (101 places). Most are a renderer's
  `x.update(S, ...)`, and the method on the other side takes it as a parameter spelt `S`, so the name rule
  still reads it. By kind:
  - a call not followed: 90 (32: rendering/pixiRenderer.js, rendering/systems/effectsRenderer.js, debug/DebugOverlay.jsx, game/manualCombat.js, +28)
  - put in an object: 9 (3: ui/panels/buildings/SmithyPanel.jsx, ui/panels/buildings/WoodworkPanel.jsx, ui/BroTown.jsx)
  - put in an array: 1 (ui/panels/TradeWindowPanel.jsx)
  - spread: 1 (debug/blankSecrets.js)
- **`S[key]` with a key made at run time** (13 places, 3 of them a write): debug/DebugOverlay.jsx:147, debug/blankSecrets.js:68, debug/debugBus.js:163, debug/debugBus.js:174, debug/debugBus.js:175, game/veilDoor.js:65, game/windowDoor.js:50, ui/ElemStatusChips.jsx:52, ui/ElemStatusChips.jsx:53, ui/ElemStatusChips.jsx:54, ui/panels/SocialPanel.jsx:140, ui/panels/SocialPanel.jsx:249, ui/panels/SocialPanel.jsx:306.
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
| fields of `S` | about 610 | **663** | distinct top-level names touched through the state or an alias of it |
| ... born in the first object | "most created on the fly" | 59 | keys of `useRef({...})` in `ui/BroTown.jsx`; the other 604 are made on the fly or never set |
| ... written from two or more files | 146 | **154** | set or changed inside, rooted at the state; 141 counting sets alone, 169 counting writes through a name for the inside too |
| ... that nothing under `src/` reads | not counted | 83 | no read but its own writes; 35 of them are named under `tools/` or `server/test/` |
| ... that nothing sets | not counted | 33 | read, or changed inside, and never made |
| ... marked a phase | not counted | 8 | two or more words set or compared (or one, with a phase's name); 50 more are flags, only ever set to true or false |
| writes to `S` from `src/rendering/` | 89 | **113** | places: 91 sets and 22 changes inside, over 73 fields; 604 more through a name for the inside |
| top-of-file variables that hold state | about 850 | **1645** | 1062 `let`/`var` (209 of them never changed) and 583 changed `const` containers; 1436 when the never-changed are left out |
| ... written from two or more files | not counted | 9 | through an import |
| ... marked a phase | not counted | 4 | as for a field; 126 more are flags |

Variables by folder: data 77, debug 61, game 336, lib 0, networking 18, rendering 775, ui 378, the top of `src/` 0.

Should reset (suggested, not confirmed):

| suggestion | fields | variables |
|---|---|---|
| never | 365 | 1282 (209 of them by machine: never changed) |
| zone | 171 | 154 |
| death | 23 | 2 |
| rejoin | 69 | 50 |
| zone+rejoin | 19 | 0 |
| ? | 16 | 157 |

Rows not yet read (`?`): 173. Suggestions whose row is gone: 1. Suggested to reset where nothing writes it today: 377.

Edges read off the code: 11 blocks call `changeZone()`, 1 set `S._dying = true`, 1 `case 'state_sync'`. The flow settled in 16 rounds over 2 passes.

**Totals: 663 fields and 1645 top-of-file variables, 2308 rows, from 1099 files.**
