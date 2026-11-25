# Card WD: every word a player reads, counted (v2.3.6140)

Made by `node tools/dev/words-census.mjs --write` (GRAND-PLAN 8.8, part 2). Never
edited by hand: `--check` fails a page that is not the scan's. No word has moved
yet: this is the count a later card moves into one table (`docs/specs/player-words.md`).

## The count

| | strings |
|---|---|
| player-facing, all | 6986 |
| ...in a table (`src/data/*`, `deskWords()`) | 3891 |
| ...written in place on the page | 2710 |
| ...written in place on the worker (`server/src`) | 385 |
| ...sure (`yes`) / unclear, counted (`?`) | 2899 / 4087 |
| developer-only (Test panel, `src/debug`, mock data; NOT_SHOWN, v2.3.6355): not player-facing, total only | 3253 |
| flag: "Wheel" a player reads | 1 |
| flag: "remnant(s)" a player reads | 0 |
| flag: "tap" outside `deskWords()` | 128 |
| files read | 1308 |

## How it reads

- Its own lexer for JS and JSX (no packages): strings, templates (`${..}` shown as
  `{…}`), comments, regular expressions, brackets, JSX tags, attributes and text.
- **yes**: JSX text; an attribute a player reads (`title`, `aria-label`, `placeholder`,
  `alt`, `label` ...); words as the value of a speaking key (`text:`, `label:`,
  `message:`, `hint:`, `name:` ...) or in a speaking call (`toast(`, `addChat(`,
  `new Text(`, `deskWords(` ...).
- **?**: two or more words anywhere else (the card: unclear counts as player-facing).
- **Never**: comments; `console.*`, `Error(` and other code calls; imports; object
  keys; comparisons and `case` labels; CSS, paths, ids; a single word outside a
  speaking place.
- **Table**: a file under `src/data/`, or a string inside a `deskWords(...)` call.
  **In place**: every other. The worker's: words in a field the page shows
  (`error:`, `message:`, `text:`, `title:`, `note:` ...); one-word refusal codes
  are not words (the page writes its own, counted where it writes them).
- **Flags**: `Wheel` with a capital (the world's code name; a spin wheel is
  lowercase), `remnant(s)`, and `tap` words not inside `deskWords()` (a phone-only
  screen may say "tap": a human reads the list).
- What it cannot see: words joined at run time from pieces it does not judge
  (`a + b`), words in `.html` and `.css` (`content:`), and words in pictures.

## The screens

One row a screen (a file under `src/ui/`; the rest by its folder), largest first.

| screen | files | in place | in a table | server | ? | Wheel | remnant | tap |
|---|---|---|---|---|---|---|---|---|
| data: gameSystems | 1 | 0 | 862 | 0 | 299 | 0 | 0 | 19 |
| data: gameDisplay | 1 | 0 | 180 | 0 | 123 | 0 | 0 | 1 |
| data: townBoard | 1 | 0 | 170 | 0 | 109 | 0 | 0 | 0 |
| data: monsterCodex | 2 | 0 | 159 | 0 | 70 | 0 | 0 | 1 |
| BroTown (the game page) | 1 | 134 | 1 | 0 | 107 | 1 | 0 | 1 |
| data: lifeSkills | 1 | 0 | 106 | 0 | 41 | 0 | 0 | 0 |
| networking: gameEvents | 1 | 106 | 0 | 0 | 98 | 0 | 0 | 1 |
| data: items | 1 | 0 | 103 | 0 | 61 | 0 | 0 | 0 |
| data: achievements | 2 | 0 | 92 | 0 | 64 | 0 | 0 | 1 |
| data: prog3 | 1 | 0 | 79 | 0 | 48 | 0 | 0 | 0 |
| data: paint | 1 | 0 | 77 | 0 | 77 | 0 | 0 | 8 |
| data: itemDetail | 1 | 0 | 70 | 0 | 70 | 0 | 0 | 1 |
| data: codexDrops | 1 | 0 | 68 | 0 | 16 | 0 | 0 | 0 |
| game: drawLanes | 1 | 68 | 0 | 0 | 44 | 0 | 0 | 0 |
| data: skills | 1 | 0 | 66 | 0 | 66 | 0 | 0 | 0 |
| infoGlossary | 1 | 66 | 0 | 0 | 0 | 0 | 0 | 0 |
| data: heroExpanded | 1 | 0 | 65 | 0 | 65 | 0 | 0 | 2 |
| game: questJournal | 1 | 65 | 0 | 0 | 34 | 0 | 0 | 1 |
| networking: wsClient | 1 | 64 | 0 | 0 | 48 | 0 | 0 | 0 |
| data: tradeWindow | 1 | 0 | 55 | 0 | 55 | 0 | 0 | 3 |
| data: clan | 1 | 0 | 54 | 0 | 54 | 0 | 0 | 3 |
| game: speedTest | 1 | 51 | 0 | 0 | 41 | 0 | 0 | 0 |
| data: leaderboard | 1 | 0 | 50 | 0 | 50 | 0 | 0 | 1 |
| server: store | 1 | 0 | 0 | 50 | 0 | 0 | 0 | 0 |
| data: trapping | 1 | 0 | 46 | 0 | 27 | 0 | 0 | 1 |
| QuestCoach | 1 | 45 | 0 | 0 | 11 | 0 | 0 | 8 |
| data: partyPanel | 1 | 0 | 45 | 0 | 45 | 0 | 0 | 0 |
| rendering: designCatalog | 1 | 44 | 0 | 0 | 0 | 0 | 0 | 0 |
| GearTab | 1 | 42 | 0 | 0 | 17 | 0 | 0 | 0 |
| data: npcLooks | 1 | 0 | 42 | 0 | 0 | 0 | 0 | 0 |
| rendering: headwearCatalog | 1 | 39 | 0 | 0 | 0 | 0 | 0 | 0 |
| data: dailyRewards | 1 | 0 | 38 | 0 | 38 | 0 | 0 | 1 |
| data: dailySpin | 1 | 0 | 38 | 0 | 38 | 0 | 0 | 0 |
| game: trapping | 1 | 38 | 0 | 0 | 4 | 0 | 0 | 0 |
| data: inventoryPanel | 1 | 0 | 37 | 0 | 37 | 0 | 0 | 2 |
| data: morePanel | 1 | 0 | 37 | 0 | 37 | 0 | 0 | 0 |
| data: storePanel | 1 | 0 | 37 | 0 | 37 | 0 | 0 | 2 |
| data: characterPicker | 1 | 0 | 36 | 0 | 36 | 0 | 0 | 0 |
| data: pets | 1 | 0 | 36 | 0 | 36 | 0 | 0 | 1 |
| data: smithy | 1 | 0 | 35 | 0 | 35 | 0 | 0 | 0 |
| game: alliance | 1 | 35 | 0 | 0 | 35 | 0 | 0 | 0 |
| FeedbackPanel | 2 | 34 | 0 | 0 | 9 | 0 | 0 | 0 |
| game: dailyRewards | 1 | 34 | 0 | 0 | 34 | 0 | 0 | 0 |
| server: restore | 1 | 0 | 0 | 34 | 0 | 0 | 0 | 0 |
| data: broCard | 1 | 0 | 32 | 0 | 32 | 0 | 0 | 0 |
| data: broPages | 1 | 0 | 32 | 0 | 32 | 0 | 0 | 1 |
| EconCard | 1 | 31 | 0 | 0 | 2 | 0 | 0 | 0 |
| DungeonCreatorPanel | 1 | 30 | 0 | 0 | 29 | 0 | 0 | 0 |
| data: exchange | 1 | 0 | 30 | 0 | 30 | 0 | 0 | 0 |
| data: wheelBuildingDoors | 1 | 0 | 30 | 0 | 0 | 0 | 0 | 0 |
| itemCategory | 1 | 30 | 0 | 0 | 10 | 0 | 0 | 0 |
| skillsModel | 1 | 30 | 0 | 0 | 20 | 0 | 0 | 1 |
| data: aceFlip | 1 | 0 | 29 | 0 | 29 | 0 | 0 | 0 |
| data: aboutPanel | 1 | 0 | 28 | 0 | 28 | 0 | 0 | 0 |
| data: nameModal | 1 | 0 | 28 | 0 | 28 | 0 | 0 | 2 |
| data: hallPanel | 1 | 0 | 27 | 0 | 27 | 0 | 0 | 2 |
| data: shardCrack | 1 | 0 | 27 | 0 | 27 | 0 | 0 | 0 |
| heroStatPills | 1 | 27 | 0 | 0 | 20 | 0 | 0 | 0 |
| CodexStage | 1 | 26 | 0 | 0 | 0 | 0 | 0 | 0 |
| data: alliancePart | 1 | 0 | 26 | 0 | 26 | 0 | 0 | 0 |
| game: econCard | 1 | 26 | 0 | 0 | 20 | 0 | 0 | 0 |
| server: shop | 1 | 0 | 0 | 26 | 0 | 0 | 0 | 0 |
| statSim | 1 | 26 | 0 | 0 | 9 | 0 | 0 | 0 |
| data: enchant | 1 | 0 | 25 | 0 | 25 | 0 | 0 | 0 |
| data: feedSeed | 1 | 0 | 25 | 0 | 25 | 0 | 0 | 0 |
| data: playerProfile | 1 | 0 | 25 | 0 | 25 | 0 | 0 | 0 |
| game: farmFeedback | 1 | 25 | 0 | 0 | 17 | 0 | 0 | 0 |
| game: usageMeter | 1 | 25 | 0 | 0 | 19 | 0 | 0 | 0 |
| data: buildings | 1 | 0 | 24 | 0 | 0 | 0 | 0 | 0 |
| data: socialDash | 1 | 0 | 24 | 0 | 24 | 0 | 0 | 0 |
| data: storeChat | 1 | 0 | 24 | 0 | 24 | 0 | 0 | 0 |
| server: gladiator | 1 | 0 | 0 | 24 | 0 | 0 | 0 | 0 |
| server: market | 1 | 0 | 0 | 24 | 0 | 0 | 0 | 0 |
| data: worldMap | 1 | 0 | 22 | 0 | 22 | 0 | 0 | 0 |
| game: townsfolkReact | 1 | 22 | 0 | 0 | 18 | 0 | 0 | 0 |
| rendering: playerSkins | 1 | 22 | 0 | 0 | 0 | 0 | 0 | 0 |
| data: bank | 1 | 0 | 21 | 0 | 21 | 0 | 0 | 1 |
| data: controlsTutorial | 1 | 0 | 21 | 0 | 21 | 0 | 0 | 9 |
| data: gamble | 1 | 0 | 21 | 0 | 21 | 0 | 0 | 0 |
| data: itemTooltip | 1 | 0 | 21 | 0 | 21 | 0 | 0 | 0 |
| data: nmlBadge | 1 | 0 | 21 | 0 | 21 | 0 | 0 | 5 |
| equipModel | 1 | 21 | 0 | 0 | 4 | 0 | 0 | 0 |
| server: storeoffer | 1 | 0 | 0 | 21 | 0 | 0 | 0 | 0 |
| GuildPanel | 2 | 20 | 0 | 0 | 15 | 0 | 0 | 0 |
| controlSkin | 1 | 20 | 0 | 0 | 20 | 0 | 0 | 0 |
| game: deathCard | 1 | 20 | 0 | 0 | 15 | 0 | 0 | 0 |
| guideArrow | 1 | 16 | 4 | 0 | 16 | 0 | 0 | 8 |
| data: inspectPlayer | 1 | 0 | 19 | 0 | 19 | 0 | 0 | 1 |
| data: settingsPanel | 1 | 0 | 19 | 0 | 19 | 0 | 0 | 1 |
| data: shopkeeper | 1 | 0 | 19 | 0 | 19 | 0 | 0 | 2 |
| game: mastery | 1 | 19 | 0 | 0 | 7 | 0 | 0 | 0 |
| questArt | 1 | 19 | 0 | 0 | 19 | 0 | 0 | 0 |
| game: salvage | 1 | 18 | 0 | 0 | 13 | 0 | 0 | 0 |
| game: shardCrack | 1 | 18 | 0 | 0 | 10 | 0 | 0 | 0 |
| game: worldTrial | 1 | 18 | 0 | 0 | 17 | 0 | 0 | 0 |
| heroModel | 1 | 18 | 0 | 0 | 12 | 0 | 0 | 0 |
| mapGlyphs | 1 | 18 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: paletteTex | 1 | 18 | 0 | 0 | 17 | 0 | 0 | 0 |
| UsageMeter | 1 | 17 | 0 | 0 | 4 | 0 | 0 | 0 |
| data: accountLogin | 1 | 0 | 16 | 0 | 16 | 0 | 0 | 0 |
| data: farmCrops | 1 | 0 | 16 | 0 | 0 | 0 | 0 | 0 |
| data: infoPanel | 1 | 0 | 16 | 0 | 16 | 0 | 0 | 0 |
| game: frameSteps | 1 | 16 | 0 | 0 | 0 | 0 | 0 | 1 |
| rendering: effectsRenderer | 1 | 16 | 0 | 0 | 13 | 0 | 0 | 0 |
| server: feedback | 1 | 0 | 0 | 16 | 0 | 0 | 0 | 0 |
| data: inspectCard | 1 | 0 | 15 | 0 | 15 | 0 | 0 | 1 |
| data: loginSpin | 1 | 0 | 15 | 0 | 15 | 0 | 0 | 1 |
| game: bank | 1 | 15 | 0 | 0 | 11 | 0 | 0 | 0 |
| game: clientOff | 1 | 15 | 0 | 0 | 0 | 0 | 0 | 0 |
| networking: broWallet | 1 | 15 | 0 | 0 | 7 | 0 | 0 | 0 |
| RoomFullScreen | 1 | 14 | 0 | 0 | 14 | 0 | 0 | 0 |
| data: monsterDeathZones | 1 | 0 | 14 | 0 | 14 | 0 | 0 | 0 |
| data: zones | 1 | 0 | 14 | 0 | 0 | 0 | 0 | 0 |
| game: chat | 1 | 14 | 0 | 0 | 4 | 0 | 0 | 0 |
| game: loadTimes | 1 | 14 | 0 | 0 | 2 | 0 | 0 | 0 |
| game: placeSafety | 1 | 14 | 0 | 0 | 14 | 0 | 0 | 0 |
| game: race | 1 | 14 | 0 | 0 | 14 | 0 | 0 | 0 |
| game: weaponGem | 1 | 14 | 0 | 0 | 12 | 0 | 0 | 0 |
| rendering: entityRenderer | 1 | 14 | 0 | 0 | 0 | 0 | 0 | 0 |
| server: playerroads | 1 | 0 | 0 | 14 | 0 | 0 | 0 | 0 |
| BodyInk | 1 | 13 | 0 | 0 | 0 | 0 | 0 | 1 |
| EncyclopediaPanel | 2 | 13 | 0 | 0 | 8 | 0 | 0 | 0 |
| FarmPanel | 1 | 13 | 0 | 0 | 13 | 0 | 0 | 0 |
| broStats | 1 | 13 | 0 | 0 | 10 | 0 | 0 | 0 |
| data: fishVariants | 1 | 0 | 13 | 0 | 5 | 0 | 0 | 0 |
| data: weaponGems | 1 | 0 | 13 | 0 | 13 | 0 | 0 | 0 |
| data: wheelStageLooks | 1 | 0 | 13 | 0 | 0 | 0 | 0 | 0 |
| game: emoteMoves | 1 | 13 | 0 | 0 | 0 | 0 | 0 | 0 |
| game: gesturePose | 1 | 13 | 0 | 0 | 13 | 0 | 0 | 0 |
| game: lifeSkillRewards | 1 | 13 | 0 | 0 | 9 | 0 | 0 | 0 |
| game: noMansLand | 1 | 13 | 0 | 0 | 13 | 0 | 0 | 0 |
| game: silenceOwner | 1 | 13 | 0 | 0 | 5 | 0 | 0 | 1 |
| game: tour | 1 | 13 | 0 | 0 | 11 | 0 | 0 | 0 |
| game: zoneTransitions | 1 | 13 | 0 | 0 | 7 | 0 | 0 | 0 |
| gearSellReason | 1 | 13 | 0 | 0 | 9 | 0 | 0 | 0 |
| server: spar | 1 | 0 | 0 | 13 | 0 | 0 | 0 | 0 |
| CookPanel | 1 | 11 | 1 | 0 | 11 | 0 | 0 | 0 |
| DeviceScreen | 1 | 12 | 0 | 0 | 6 | 0 | 0 | 2 |
| ElemStatusChips | 1 | 12 | 0 | 0 | 0 | 0 | 0 | 0 |
| SilenceButtons | 1 | 12 | 0 | 0 | 1 | 0 | 0 | 1 |
| TownBoardPage | 1 | 12 | 0 | 0 | 0 | 0 | 0 | 0 |
| VendorPanel | 1 | 12 | 0 | 0 | 0 | 0 | 0 | 0 |
| data: questOffer | 1 | 0 | 12 | 0 | 12 | 0 | 0 | 0 |
| data: questPages | 1 | 0 | 12 | 0 | 12 | 0 | 0 | 2 |
| data: zoneHeader | 1 | 0 | 12 | 0 | 12 | 0 | 0 | 0 |
| game: renameOwner | 1 | 12 | 0 | 0 | 9 | 0 | 0 | 1 |
| InventoryPanel | 1 | 11 | 0 | 0 | 11 | 0 | 0 | 0 |
| ItemTooltip | 1 | 11 | 0 | 0 | 11 | 0 | 0 | 0 |
| PinCards | 1 | 10 | 1 | 0 | 2 | 0 | 0 | 0 |
| data: codexStage | 1 | 0 | 11 | 0 | 0 | 0 | 0 | 0 |
| data: gemcut | 1 | 0 | 11 | 0 | 11 | 0 | 0 | 0 |
| data: hardenedWood | 1 | 0 | 11 | 0 | 6 | 0 | 0 | 0 |
| data: journey | 1 | 0 | 11 | 0 | 11 | 0 | 0 | 1 |
| data: loginScreen | 1 | 0 | 11 | 0 | 11 | 0 | 0 | 1 |
| data: nmlAsk | 1 | 0 | 11 | 0 | 11 | 0 | 0 | 2 |
| data: questJournal | 1 | 0 | 11 | 0 | 11 | 0 | 0 | 0 |
| data: raceHud | 1 | 0 | 11 | 0 | 11 | 0 | 0 | 0 |
| data: woodwork | 1 | 0 | 11 | 0 | 11 | 0 | 0 | 0 |
| game: itemDrop | 1 | 11 | 0 | 0 | 11 | 0 | 0 | 0 |
| game: monsterCombat | 1 | 11 | 0 | 0 | 9 | 0 | 0 | 0 |
| game: pointsTips | 1 | 11 | 0 | 0 | 11 | 0 | 0 | 4 |
| MonsterCodex | 1 | 10 | 0 | 0 | 9 | 0 | 0 | 0 |
| data: chestReveal | 1 | 0 | 10 | 0 | 10 | 0 | 0 | 0 |
| data: dishes | 1 | 0 | 10 | 0 | 0 | 0 | 0 | 0 |
| data: elements | 1 | 0 | 10 | 0 | 0 | 0 | 0 | 0 |
| game: achievements | 1 | 10 | 0 | 0 | 8 | 0 | 0 | 0 |
| game: chatChannel | 1 | 10 | 0 | 0 | 3 | 0 | 0 | 0 |
| game: deskKeyList | 1 | 10 | 0 | 0 | 10 | 0 | 0 | 0 |
| game: farmWork | 1 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| game: postOffice | 1 | 10 | 0 | 0 | 9 | 0 | 0 | 0 |
| game: questTrailStyle | 1 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| game: spar | 1 | 10 | 0 | 0 | 10 | 0 | 0 | 1 |
| game: timeOfDay | 1 | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: fpsOverlay | 1 | 10 | 0 | 0 | 10 | 0 | 0 | 0 |
| server: arena | 1 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| DesignGallery | 1 | 9 | 0 | 0 | 0 | 0 | 0 | 2 |
| LingerScreen | 1 | 9 | 0 | 0 | 9 | 0 | 0 | 0 |
| data: abilities | 1 | 0 | 9 | 0 | 4 | 0 | 0 | 0 |
| data: accountPanel | 1 | 0 | 9 | 0 | 9 | 0 | 0 | 0 |
| data: dailyCard | 1 | 0 | 9 | 0 | 9 | 0 | 0 | 0 |
| data: keyboardHints | 1 | 0 | 9 | 0 | 9 | 0 | 0 | 0 |
| data: partyHud | 1 | 0 | 9 | 0 | 9 | 0 | 0 | 1 |
| data: shards | 1 | 0 | 9 | 0 | 0 | 0 | 0 | 0 |
| data: socialPanel | 1 | 0 | 9 | 0 | 9 | 0 | 0 | 1 |
| data: t2Panel | 1 | 0 | 9 | 0 | 9 | 0 | 0 | 0 |
| deskTeach | 1 | 9 | 0 | 0 | 7 | 0 | 0 | 0 |
| game: charName | 1 | 9 | 0 | 0 | 2 | 0 | 0 | 0 |
| game: friendErrors | 1 | 9 | 0 | 0 | 9 | 0 | 0 | 0 |
| game: ride | 1 | 9 | 0 | 0 | 9 | 0 | 0 | 0 |
| rendering: lookPalette | 1 | 9 | 0 | 0 | 5 | 0 | 0 | 0 |
| rendering: patternCatalog | 1 | 9 | 0 | 0 | 0 | 0 | 0 | 0 |
| server: marketplace | 1 | 0 | 0 | 9 | 0 | 0 | 0 | 0 |
| TrapsTab | 1 | 8 | 0 | 0 | 3 | 0 | 0 | 0 |
| data: elemWindup | 1 | 0 | 8 | 0 | 0 | 0 | 0 | 0 |
| data: infoPopup | 1 | 0 | 8 | 0 | 8 | 0 | 0 | 0 |
| data: trapCatch | 1 | 0 | 8 | 0 | 8 | 0 | 0 | 0 |
| game: characterRecord | 1 | 8 | 0 | 0 | 8 | 0 | 0 | 0 |
| game: rest | 1 | 8 | 0 | 0 | 4 | 0 | 0 | 0 |
| rendering: eyewearCatalog | 1 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: hairCatalog | 1 | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: wheelWater | 1 | 8 | 0 | 0 | 8 | 0 | 0 | 0 |
| server: data | 1 | 0 | 0 | 8 | 0 | 0 | 0 | 0 |
| storeChatBus | 1 | 8 | 0 | 0 | 4 | 0 | 0 | 0 |
| BoardRow | 1 | 7 | 0 | 0 | 2 | 0 | 0 | 0 |
| ChatBubble | 1 | 7 | 0 | 0 | 4 | 0 | 0 | 0 |
| InstallHint | 1 | 7 | 0 | 0 | 0 | 0 | 0 | 1 |
| QuestJournalPage | 1 | 7 | 0 | 0 | 0 | 0 | 0 | 0 |
| StatScreenPanel | 1 | 7 | 0 | 0 | 2 | 0 | 0 | 0 |
| ThreatIncomingPanel | 1 | 7 | 0 | 0 | 7 | 0 | 0 | 0 |
| WeaponPill | 1 | 7 | 0 | 0 | 0 | 0 | 0 | 0 |
| data: accountKey | 1 | 0 | 7 | 0 | 7 | 0 | 0 | 0 |
| data: bottomDashboard | 1 | 0 | 7 | 0 | 7 | 0 | 0 | 0 |
| data: duelRequest | 1 | 0 | 7 | 0 | 7 | 0 | 0 | 0 |
| data: questCard | 1 | 0 | 7 | 0 | 7 | 0 | 0 | 0 |
| data: questsPanel | 1 | 0 | 7 | 0 | 7 | 0 | 0 | 0 |
| game: feedbackOwner | 1 | 7 | 0 | 0 | 7 | 0 | 0 | 0 |
| game: shieldGem | 1 | 7 | 0 | 0 | 7 | 0 | 0 | 0 |
| networking: serverReady | 1 | 7 | 0 | 0 | 5 | 0 | 0 | 0 |
| rendering: artTools | 1 | 7 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: pixiRenderer | 1 | 7 | 0 | 0 | 1 | 0 | 0 | 0 |
| rendering: sharpPixels | 1 | 7 | 0 | 0 | 4 | 0 | 0 | 0 |
| server: playerrestore | 1 | 0 | 0 | 7 | 0 | 0 | 0 | 0 |
| server: silence | 1 | 0 | 0 | 7 | 0 | 0 | 0 | 0 |
| BottomDashboard | 1 | 6 | 0 | 0 | 3 | 0 | 0 | 0 |
| NotificationsPanel | 1 | 5 | 1 | 0 | 0 | 0 | 0 | 0 |
| SpendPointConfirm | 1 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| data: effects | 1 | 0 | 6 | 0 | 0 | 0 | 0 | 0 |
| data: fishWeigh | 1 | 0 | 6 | 0 | 6 | 0 | 0 | 0 |
| data: gemWorks | 1 | 0 | 6 | 0 | 6 | 0 | 0 | 0 |
| data: hardenCosts | 1 | 0 | 6 | 0 | 6 | 0 | 0 | 0 |
| data: inventorySurface | 1 | 0 | 6 | 0 | 6 | 0 | 0 | 0 |
| data: questPanel | 1 | 0 | 6 | 0 | 6 | 0 | 0 | 0 |
| data: salvage | 1 | 0 | 6 | 0 | 3 | 0 | 0 | 0 |
| data: vendor | 1 | 0 | 6 | 0 | 6 | 0 | 0 | 0 |
| game: dropLines | 1 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| game: killRoll | 1 | 6 | 0 | 0 | 6 | 0 | 0 | 0 |
| game: mayorTalk | 1 | 6 | 0 | 0 | 6 | 0 | 0 | 0 |
| game: nmlAsk | 1 | 6 | 0 | 0 | 1 | 0 | 0 | 3 |
| game: petFetch | 1 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| game: playerActions | 1 | 6 | 0 | 0 | 6 | 0 | 0 | 0 |
| game: pointsReset | 1 | 6 | 0 | 0 | 6 | 0 | 0 | 0 |
| playerProfile | 1 | 6 | 0 | 0 | 1 | 0 | 0 | 0 |
| rendering: bodyBake | 1 | 6 | 0 | 0 | 2 | 0 | 0 | 0 |
| rendering: gearCatalog | 1 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: gearVariants | 1 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: headFrames | 1 | 6 | 0 | 0 | 3 | 0 | 0 | 0 |
| server: armorforge | 1 | 0 | 0 | 6 | 0 | 0 | 0 | 0 |
| server: liveops | 1 | 0 | 0 | 6 | 0 | 0 | 0 | 0 |
| server: power | 1 | 0 | 0 | 6 | 0 | 0 | 0 | 0 |
| ChatChannelChips | 1 | 5 | 0 | 0 | 4 | 0 | 0 | 0 |
| DungeonClearHud | 1 | 5 | 0 | 0 | 1 | 0 | 0 | 0 |
| MayorGreeting | 1 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| NewMonsterCard | 1 | 4 | 1 | 0 | 2 | 0 | 0 | 0 |
| OriginScreen | 1 | 5 | 0 | 0 | 5 | 0 | 0 | 0 |
| data: clanInvite | 1 | 0 | 5 | 0 | 5 | 0 | 0 | 0 |
| data: equippedTab | 1 | 0 | 5 | 0 | 5 | 0 | 0 | 1 |
| data: oreArt | 1 | 0 | 5 | 0 | 0 | 0 | 0 | 0 |
| data: selfPanel | 1 | 0 | 5 | 0 | 5 | 0 | 0 | 0 |
| data: treeArt | 1 | 0 | 5 | 0 | 0 | 0 | 0 | 0 |
| game: blockedAsks | 1 | 5 | 0 | 0 | 3 | 0 | 0 | 0 |
| game: desktopControls | 1 | 2 | 3 | 0 | 2 | 0 | 0 | 0 |
| game: expoAddress | 1 | 5 | 0 | 0 | 5 | 0 | 0 | 0 |
| game: projectiles | 1 | 5 | 0 | 0 | 1 | 0 | 0 | 0 |
| rendering: eyeStyleCatalog | 1 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: gearLookProbe | 1 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: selfTest | 1 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: standinlegs | 1 | 5 | 0 | 0 | 2 | 0 | 0 | 0 |
| server: charname | 1 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| server: duel | 1 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| server: hardenedwood | 1 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| server: hidden | 1 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| server: trade2 | 1 | 0 | 0 | 5 | 0 | 0 | 0 | 0 |
| EnchantPanel | 1 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| FurniturePanel | 1 | 4 | 0 | 0 | 4 | 0 | 0 | 0 |
| HardenedWoodTab | 1 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| LandOfficePanel | 1 | 4 | 0 | 0 | 4 | 0 | 0 | 0 |
| PetHousePanel | 1 | 2 | 2 | 0 | 2 | 0 | 0 | 0 |
| SettingsPanel | 1 | 4 | 0 | 0 | 0 | 0 | 0 | 1 |
| SkillTiles | 1 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| TradePanel | 1 | 4 | 0 | 0 | 4 | 0 | 0 | 0 |
| WarBanner | 1 | 4 | 0 | 0 | 4 | 0 | 0 | 0 |
| bagFilterBus | 1 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| data: incomingTrade | 1 | 0 | 4 | 0 | 4 | 0 | 0 | 0 |
| data: joinGate | 1 | 0 | 4 | 0 | 4 | 0 | 0 | 0 |
| data: questCoach | 1 | 0 | 4 | 0 | 4 | 0 | 0 | 3 |
| data: remains | 1 | 0 | 4 | 0 | 4 | 0 | 0 | 0 |
| data: wheelDungeons | 1 | 0 | 4 | 0 | 4 | 0 | 0 | 0 |
| data: words | 1 | 0 | 4 | 0 | 4 | 0 | 0 | 0 |
| friendsModel | 1 | 4 | 0 | 0 | 4 | 0 | 0 | 0 |
| game: abilities | 1 | 4 | 0 | 0 | 4 | 0 | 0 | 0 |
| game: climb | 1 | 4 | 0 | 0 | 3 | 0 | 0 | 0 |
| game: farmWalk | 1 | 4 | 0 | 0 | 4 | 0 | 0 | 0 |
| game: partyRows | 1 | 4 | 0 | 0 | 4 | 0 | 0 | 0 |
| game: quests | 1 | 4 | 0 | 0 | 3 | 0 | 0 | 0 |
| game: revealBag | 1 | 4 | 0 | 0 | 3 | 0 | 0 | 0 |
| lazyPanel | 1 | 4 | 0 | 0 | 4 | 0 | 0 | 0 |
| networking: index | 1 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: body | 1 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: entity-look | 1 | 4 | 0 | 0 | 4 | 0 | 0 | 0 |
| rendering: eyeColorCatalog | 1 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: hairColorCatalog | 1 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: lookArmourProbe | 1 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: materialTints | 1 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: sheenBatch | 1 | 4 | 0 | 0 | 4 | 0 | 0 | 0 |
| rendering: skills | 1 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: standin | 1 | 4 | 0 | 0 | 1 | 0 | 0 | 0 |
| server: dailychest | 1 | 0 | 0 | 4 | 0 | 0 | 0 | 0 |
| server: dailyrewards | 1 | 0 | 0 | 4 | 0 | 0 | 0 | 0 |
| server: revealbag | 1 | 0 | 0 | 4 | 0 | 0 | 0 | 0 |
| server: wheelfaces | 1 | 0 | 0 | 4 | 0 | 0 | 0 | 0 |
| server: wheelspawns | 1 | 0 | 0 | 4 | 0 | 0 | 0 | 0 |
| server: wheelspawns1 | 1 | 0 | 0 | 4 | 0 | 0 | 0 | 0 |
| EmotePanel | 1 | 3 | 0 | 0 | 3 | 0 | 0 | 0 |
| FarmBedPrompt | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| InspectCard | 1 | 3 | 0 | 0 | 3 | 0 | 0 | 0 |
| PlayerPaint | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| SocialPanel | 1 | 1 | 2 | 0 | 1 | 0 | 0 | 0 |
| SprintButton | 1 | 3 | 0 | 0 | 2 | 0 | 0 | 0 |
| WeaponBar | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| WorldChatFeed | 1 | 2 | 1 | 0 | 1 | 0 | 0 | 0 |
| WorldMapOverlay | 1 | 2 | 1 | 0 | 0 | 0 | 0 | 0 |
| data: farmLayout | 1 | 0 | 3 | 0 | 0 | 0 | 0 | 0 |
| data: fishBoard | 1 | 0 | 3 | 0 | 3 | 0 | 0 | 1 |
| data: inventoryDash | 1 | 0 | 3 | 0 | 3 | 0 | 0 | 0 |
| data: questDetail | 1 | 0 | 3 | 0 | 3 | 0 | 0 | 0 |
| data: stormSparks | 1 | 0 | 3 | 0 | 0 | 0 | 0 | 0 |
| data: worldProps | 1 | 0 | 3 | 0 | 0 | 0 | 0 | 0 |
| equipActions | 1 | 3 | 0 | 0 | 3 | 0 | 0 | 0 |
| game: combatHelpers | 1 | 3 | 0 | 0 | 2 | 0 | 0 | 0 |
| game: dashSidePref | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| game: dungeonWaves | 1 | 3 | 0 | 0 | 3 | 0 | 0 | 0 |
| game: questCard | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| game: questComplete | 1 | 3 | 0 | 0 | 3 | 0 | 0 | 0 |
| game: spinBoard | 1 | 3 | 0 | 0 | 3 | 0 | 0 | 0 |
| game: sprint | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| game: storeAnswer | 1 | 3 | 0 | 0 | 1 | 0 | 0 | 1 |
| game: wheelNoticeboard | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| game: zoneMechanics | 1 | 3 | 0 | 0 | 3 | 0 | 0 | 0 |
| inventoryStyles | 1 | 3 | 0 | 0 | 3 | 0 | 0 | 0 |
| rendering: facialHairColorCatalog | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: hairClip | 1 | 3 | 0 | 0 | 3 | 0 | 0 | 0 |
| rendering: maskedBakeWorker | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: pixiApp | 1 | 3 | 0 | 0 | 2 | 0 | 0 | 0 |
| rendering: speciesCatalog | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: wheelLife | 1 | 3 | 0 | 0 | 3 | 0 | 0 | 0 |
| rendering: wheelMinimap | 1 | 3 | 0 | 0 | 1 | 0 | 0 | 0 |
| server: achievements | 1 | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| server: charwatch | 1 | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| server: codex | 1 | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| server: fishlog | 1 | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| server: wheeldungeon | 1 | 0 | 0 | 3 | 0 | 0 | 0 | 0 |
| starCue | 1 | 3 | 0 | 0 | 3 | 0 | 0 | 0 |
| storeApi | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| AchievementBanner | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| BuildBadge | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| ControlsTutorial | 1 | 2 | 0 | 0 | 2 | 0 | 0 | 2 |
| GameApp | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| LevelUpBurst | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| MapPanel | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| NpcDialogue | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| PartyPanel | 1 | 2 | 0 | 0 | 1 | 0 | 0 | 0 |
| PlayerListPanel | 1 | 2 | 0 | 0 | 2 | 0 | 0 | 0 |
| QuestPages | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| RevealOverlay | 1 | 2 | 0 | 0 | 2 | 0 | 0 | 0 |
| RideButton | 1 | 2 | 0 | 0 | 2 | 0 | 0 | 0 |
| TownBoard | 1 | 1 | 1 | 0 | 1 | 0 | 0 | 0 |
| UpdateBanner | 1 | 2 | 0 | 0 | 2 | 0 | 0 | 0 |
| XpFlyOverlay | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| data: bandGrip | 1 | 0 | 2 | 0 | 2 | 0 | 0 | 0 |
| data: waterAttack | 1 | 0 | 2 | 0 | 0 | 0 | 0 | 0 |
| game: bossChest | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| game: groundLoot | 1 | 2 | 0 | 0 | 1 | 0 | 0 | 0 |
| game: loginSpinWheel | 1 | 2 | 0 | 0 | 2 | 0 | 0 | 0 |
| game: mapPinPlaces | 1 | 2 | 0 | 0 | 1 | 0 | 0 | 0 |
| game: plateSafety | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| game: tooFar | 1 | 2 | 0 | 0 | 2 | 0 | 0 | 0 |
| game: wheelBreak | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| game: wheelHome | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| gearStats | 1 | 2 | 0 | 0 | 2 | 0 | 0 | 0 |
| itemActions | 1 | 2 | 0 | 0 | 2 | 0 | 0 | 0 |
| lib: babelHelpers | 1 | 2 | 0 | 0 | 2 | 0 | 0 | 0 |
| rendering: buildCatalog | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: farmWorld | 1 | 2 | 0 | 0 | 1 | 0 | 0 | 0 |
| rendering: fillBatch | 1 | 2 | 0 | 0 | 2 | 0 | 0 | 0 |
| rendering: hemiLook | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: png8Worker | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: shirtColorCatalog | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: tiledMaps | 1 | 2 | 0 | 0 | 2 | 0 | 0 | 0 |
| server: cadence | 1 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| server: devicelock | 1 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| server: eventcapes | 1 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| server: farm | 1 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| server: inbox | 1 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| server: index | 1 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| server: killroll | 1 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| server: loginspin | 1 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| server: risechest | 1 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| server: skillpoints | 1 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| server: testmode | 1 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| AccountLoginForm | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| ChatPanel | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| ClanPanel | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| ElementBurstButton | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| FeedSeedPanel | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| InfoPopup | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| IntroVideo | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| ItemDetailPopup | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| JumpButton | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| LeaderboardPanel | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| MorePanel | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| PartyHUD | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| QuestCard | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| QuestDetailPanel | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| QuestOfferPanel | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| QuickEatButton | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| ShieldButton | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| SmithyPanel | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| SpecialButton | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| TradeWindowPanel | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| XpTrack | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| ZoneHeader | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| data: characterView | 1 | 0 | 1 | 0 | 1 | 0 | 0 | 0 |
| data: contextButton | 1 | 0 | 1 | 0 | 1 | 0 | 0 | 0 |
| data: statsPanel | 1 | 0 | 1 | 0 | 1 | 0 | 0 | 0 |
| data: wheelSignposts | 1 | 0 | 1 | 0 | 1 | 0 | 0 | 0 |
| farmBus | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| game: deskKeys | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| game: farmTrip | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| game: fightFood | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| game: framePacer | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| game: harvestDoor | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| game: levelCelebration | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| game: lookPaletteChoice | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| game: npcVoices | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| game: questRoute | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| game: raceDoor | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| game: targeting | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| game: welcomeBanner | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| game: wheelDungeons | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| game: wheelTrial | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| gearFlash | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| networking: rosterCookie | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| questJournalModel | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| questParts | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| rendering: bodyheads | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: campfireFx | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: capeCatalog | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: facialHairCatalog | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: glint | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| rendering: hatColorCatalog | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: minimapRenderer | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: monsterShotFx | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: nodeLabels | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| rendering: npcSprites | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| rendering: paletteLoad | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: preloadAnimations | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| rendering: raceFlags | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: shadows | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| rendering: stripRead | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| rendering: tileRenderer | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| rendering: wheelObjects | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| server: account | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| server: accuracy | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| server: alliance | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| server: amulet | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| server: botfp | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| server: chainwriter | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| server: chatmod | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| server: daybook | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| server: econcard | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| server: fightlock | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| server: leaderboard | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| server: migrations | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| server: origin | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| server: publicreads | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| server: quests | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| server: reqonce | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| server: salvage | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| server: threat | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| slimePins | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| uiSfxDelegate | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| zoneTitle | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |

## Flag: "Wheel" a player reads

CLAUDE.md §1: on screen it is "BroTown", the "World map", "the world". Not fixed here (card WD moves no words).

- `src/ui/BroTown.jsx:8994` (BroTown (the game page), ?) `the Wheel's ground gone,`

## Flag: "remnant(s)" a player reads

CLAUDE.md §1: players read "Remains".

None.

## Flag: "tap" outside deskWords()

CLAUDE.md §7 Desktop: words a computer player reads say "click", through `deskWords()`. A row on a phone-only screen is not a fault, and a table's row (`src/data/*`, the townsfolk's and quests' words) may be swapped by `deskWords()` where its screen draws it: a human reads the list.

- `src/ui/panels/BodyInk.jsx:997` (BodyInk, yes) `Dragging moves the view — tap to go back to drawing`
- `src/ui/BroTown.jsx:289` (BroTown (the game page), ?) `All done? Tap me!`
- `src/ui/mobile/ControlsTutorial.jsx:61` (ControlsTutorial, ?) `Sword: swipe across it, or anywhere on the right side, for each swing. Bow: pull back, ...`
- `src/ui/mobile/ControlsTutorial.jsx:73` (ControlsTutorial, ?) `Your sword turns to the closest enemy by itself. A bow shoots opposite your pull, a sta...`
- `src/ui/panels/DesignGallery.jsx:149` (DesignGallery, yes) `Tap one to put it on your`
- `src/ui/panels/DesignGallery.jsx:149` (DesignGallery, yes) `. It replaces what is there — one tap of Undo brings it back.`
- `src/ui/DeviceScreen.js:76` (DeviceScreen, ?) `Then tap Use a Login Key and type it.`
- `src/ui/DeviceScreen.js:81` (DeviceScreen, ?) `Then tap Use a Login Key and type the new one.`
- `src/ui/mobile/InstallHint.jsx:147` (InstallHint, yes) `Tap`
- `src/ui/mobile/QuestCoach.jsx:597` (QuestCoach, yes) `Your bag, your gear and your stats live down here. Tap the handle.`
- `src/ui/mobile/QuestCoach.jsx:607` (QuestCoach, yes) `Your bag, your gear and your stats live in here. Tap the arrow.`
- `src/ui/mobile/QuestCoach.jsx:699` (QuestCoach, yes) `Tap each glowing item, then Equip.`
- `src/ui/mobile/QuestCoach.jsx:804` (QuestCoach, yes) `Mayor Bro paid you in gear. Tap the handle to find it.`
- `src/ui/mobile/QuestCoach.jsx:808` (QuestCoach, yes) `Mayor Bro paid you in gear. Tap Dashboard to find it.`
- `src/ui/mobile/QuestCoach.jsx:862` (QuestCoach, yes) `Double-tap to cycle. Use whichever you like best.`
- `src/ui/mobile/QuestCoach.jsx:959` (QuestCoach, yes) `With the bow or staff out, tap the Block button to raise your shield.`
- `src/ui/mobile/QuestCoach.jsx:1103` (QuestCoach, yes) `Everyone here is a real player. Tap yourself to say something.`
- `src/ui/mobile/dash/SettingsPanel.jsx:398` (SettingsPanel, yes) `Tap the floating`
- `src/ui/panels/SilenceButtons.jsx:42` (SilenceButtons, yes) `'s silence? Tap Lift again to do it.`
- `src/data/say/achievements.js:14` (data: achievements, ?) `No title yet: tap one you have`
- `src/data/say/bank.js:33` (data: bank, ?) `Safe from death: what is in the vault stays here when you die. Materials, food and gold...`
- `src/data/say/broPages.js:30` (data: broPages, ?) `Tap to inspect`
- `src/data/say/clan.js:30` (data: clan, ?) `To join a clan, have a clan member invite you by tapping your character.`
- `src/data/say/clan.js:69` (data: clan, ?) `Tap again to DISBAND [{tag}] — the clan and its name are gone`
- `src/data/say/clan.js:70` (data: clan, ?) `Tap again to leave the clan`
- `src/data/say/controlsTutorial.js:7` (data: controlsTutorial, ?) `The button lights up when something is in reach. Tap it to swing, hold it to keep fight...`
- `src/data/say/controlsTutorial.js:9` (data: controlsTutorial, ?) `You always aim at the closest enemy. Tap a different one to lock onto it instead, and t...`
- `src/data/say/controlsTutorial.js:13` (data: controlsTutorial, ?) `Tap to raise your shield. It stays up until you attack, tap again, or run out of stamina.`
- `src/data/say/controlsTutorial.js:15` (data: controlsTutorial, ?) `Your items and gear live here. Tap one to equip it.`
- `src/data/say/controlsTutorial.js:17` (data: controlsTutorial, ?) `Menus live down here. Tap your character to chat.`
- `src/data/say/controlsTutorial.js:24` (data: controlsTutorial, ?) `Face a monster in reach and a line points to it. Tap Attack once: you lock on and keep ...`
- `src/data/say/controlsTutorial.js:26` (data: controlsTutorial, ?) `Face a monster in reach and tap Attack: you lock on, and each tap is one attack. Hold A...`
- `src/data/say/controlsTutorial.js:27` (data: controlsTutorial, ?) `The line finds the monster you face once it is in reach (a bow or a staff reaches furth...`
- `src/data/say/controlsTutorial.js:30` (data: controlsTutorial, ?) `It comes up beside Attack while a monster is in sight. Tap to raise your shield. It sta...`
- `src/data/say/dailyRewards.js:30` (data: dailyRewards, ?) `Not your thing? Tap ↻ to swap one quest for another (once a day).`
- `src/data/say/equippedTab.js:18` (data: equippedTab, ?) `Tap a slot to set`
- `src/data/say/fishBoard.js:12` (data: fishBoard, ?) `Nobody has weighed a {name} yet. Tap a fish in your bag, then Inspect.`
- `src/data/gameDisplay.js:2127` (data: gameDisplay, ?) `first tap after`
- `src/data/gameSystems.js:7006` (data: gameSystems, yes) `Open your Bag and tap the log to light a campfire`
- `src/data/gameSystems.js:7008` (data: gameSystems, yes) `Stand by the fire and tap it to cook your fish`
- `src/data/gameSystems.js:7023` (data: gameSystems, ?) `🔥 Tap the log in your Bag to light a fire, then tap the fire to cook.`
- `src/data/gameSystems.js:7116` (data: gameSystems, yes) `Open the Feed & Seed and tap Visit Your Farm`
- `src/data/gameSystems.js:7135` (data: gameSystems, ?) `Hi, I'm Farmer Bro! I grow the food for the whole town, but a slime ruined my carrots. ...`
- `src/data/gameSystems.js:7136` (data: gameSystems, ?) `Plant and water 3 carrots on your farm. To get there, open the Feed & Seed and tap Visi...`
- `src/data/gameSystems.js:7264` (data: gameSystems, yes) `Open your Bag and tap the log to light a campfire`
- `src/data/gameSystems.js:7266` (data: gameSystems, yes) `Stand by the fire and tap it to cook your fish`
- `src/data/gameSystems.js:7289` (data: gameSystems, ?) `Hi, I'm Diego! I run the General Store, and I'm writing a cookbook, but I've never cook...`
- `src/data/gameSystems.js:7290` (data: gameSystems, ?) `I still need 2 cooked fish, amigo. Catch 2 fish at a fishing spot, tap a log in your Ba...`
- `src/data/gameSystems.js:7409` (data: gameSystems, yes) `Spring 3 traps: target a monster out in the lands, tap TRAP, then kill it.`
- `src/data/gameSystems.js:7419` (data: gameSystems, yes) `Out in the lands, target a monster and tap TRAP`
- `src/data/gameSystems.js:7435` (data: gameSystems, ?) `Time to use your traps. Out in the lands, target a monster and tap TRAP to put a box un...`
- `src/data/gameSystems.js:7436` (data: gameSystems, ?) `Spring 3 traps: target a monster, tap TRAP, then defeat it within 15 seconds. Then come...`
- `src/data/gameSystems.js:7971` (data: gameSystems, ?) `Lock on and tap the trap.`
- `src/data/gameSystems.js:8306` (data: gameSystems, ?) `Ready to race? Tap Race! Touch all 4 corner flags, then get back here before me. Sprint...`
- `src/data/gameSystems.js:8307` (data: gameSystems, ?) `I won! Want a rematch? Tap Race! and touch all 4 corner flags, then get back here befor...`
- `src/data/gameSystems.js:8308` (data: gameSystems, ?) `I won again! Tap Race! to try again. Farmer Bro's Zoom Juice makes you run faster, so d...`
- `src/data/gameSystems.js:8309` (data: gameSystems, ?) `wins for me! Don't give up. Drink Zoom Juice from your Bag and sprint the whole way. Ta...`
- `src/data/say/hallPanel.js:27` (data: hallPanel, ?) `Pick a player, then tap Duel on their card`
- `src/data/say/hallPanel.js:32` (data: hallPanel, ?) `Pick a player, then tap Invite to Party on their card`
- `src/data/say/heroExpanded.js:88` (data: heroExpanded, ?) `Tap a weapon to see its points`
- `src/data/say/heroExpanded.js:105` (data: heroExpanded, ?) `Tap again: every point comes back`
- `src/data/say/inspectCard.js:55` (data: inspectCard, ?) `long-press any name or number to learn more · tap to dismiss`
- `src/data/say/inspectPlayer.js:27` (data: inspectPlayer, ?) `Friends — tap to remove`
- `src/data/say/inventoryPanel.js:68` (data: inventoryPanel, ?) `No pets. Weaken a monster to <20% HP then tap 🪤 to capture!`
- `src/data/say/inventoryPanel.js:70` (data: inventoryPanel, ?) `Tap a pet to set active. Active pet follows you and auto-collects loot within {radius}px.`
- `src/data/say/itemDetail.js:25` (data: itemDetail, ?) `Tap Block in a fight to raise it`
- `src/data/say/journey.js:18` (data: journey, ?) `Tap to view the transaction`
- `src/data/say/leaderboard.js:87` (data: leaderboard, ?) `{board}: tap to choose a board`
- `src/data/say/loginScreen.js:9` (data: loginScreen, ?) `You have all {max} bros this device can hold. Play one, or free a slot: tap a bro's •••...`
- `src/data/say/loginSpin.js:25` (data: loginSpin, ?) `Tap SPIN: one free spin a day`
- `src/data/say/monsterCodex.js:39` (data: monsterCodex, ?) `Tap an item to see what it is and the grades it can roll.`
- `src/data/say/nameModal.js:33` (data: nameModal, ?) `Live preview — tap to zoom`
- `src/data/say/nameModal.js:36` (data: nameModal, ?) `Tap to name`
- `src/data/say/nmlAsk.js:11` (data: nmlAsk, ?) `Hitting back the player who attacked you gives you no red skull. Tap for what No man's ...`
- `src/data/say/nmlAsk.js:12` (data: nmlAsk, ?) `Attacking a player gives you a red skull. Tap for what No man's land means.`
- `src/data/say/nmlBadge.js:13` (data: nmlBadge, ?) `{label} tap a player, or swing or shoot at them, and choose {attack}. Until you do, you...`
- `src/data/say/nmlBadge.js:20` (data: nmlBadge, ?) `{label} a {skull}. To hit back, swing, shoot or tap them and choose {attack} once: hitt...`
- `src/data/say/nmlBadge.js:30` (data: nmlBadge, ?) `Out past the safe ground is No man's land, where other players can attack you. The mini...`
- `src/data/say/nmlBadge.js:32` (data: nmlBadge, ?) `Outlaw: you attacked a player first, {min} minutes left. Tap for what it means.`
- `src/data/say/nmlBadge.js:33` (data: nmlBadge, ?) `No man's land {ring}: players can attack you here. Tap for what it means.`
- `src/data/say/paint.js:40` (data: paint, ?) `Tap an area to flood it — with the eraser chosen, to clear it`
- `src/data/say/paint.js:41` (data: paint, ?) `Pick a letter, then tap to place it`
- `src/data/say/paint.js:42` (data: paint, ?) `Tap something you already drew to pick it up — recolour, resize or re-layer it`
- `src/data/say/paint.js:74` (data: paint, ?) `Tap a zone to edit`
- `src/data/say/paint.js:93` (data: paint, ?) `Keeping the proportions you drew — tap to size width and height freely`
- `src/data/say/paint.js:94` (data: paint, ?) `Width and height are free — tap to keep the proportions you drew`
- `src/data/say/paint.js:115` (data: paint, ?) `Tap something you drew to pick it up — then recolour, resize or re-layer it`
- `src/data/say/paint.js:116` (data: paint, ?) `Pick Select, then tap something you drew to change it`
- `src/data/say/partyHud.js:10` (data: partyHud, ?) `Party, {count} of {max}: tap to see who`
- `src/data/say/pets.js:20` (data: pets, ?) `No pets yet. Make box traps at the Woodworker, target a monster out in the lands, tap {...`
- `src/data/say/questCoach.js:4` (data: questCoach, ?) `Face a monster in reach, then tap once: you keep fighting until you tap again.`
- `src/data/say/questCoach.js:6` (data: questCoach, ?) `Face a monster in reach and tap Attack: one hit a tap. Hold it until the ring fills to ...`
- `src/data/say/questCoach.js:7` (data: questCoach, ?) `Your specials come up beside Attack while a monster is in sight. Tap one.`
- `src/data/say/questPages.js:16` (data: questPages, ?) `What to do now: {now}. Tap to see the quest journey`
- `src/data/say/questPages.js:17` (data: questPages, ?) `Rewards. Tap to see them and what comes next`
- `src/data/say/settingsPanel.js:24` (data: settingsPanel, ?) `Notifications — SILENCED, tap to turn them back on`
- `src/data/say/shopkeeper.js:15` (data: shopkeeper, ?) `Tap his shelf to buy · tap your bag to sell`
- `src/data/say/shopkeeper.js:16` (data: shopkeeper, ?) `Tap his shelf to buy · tap your bag below to sell`
- `src/data/say/socialPanel.js:7` (data: socialPanel, ?) `No friends yet. Tap a player and add them!`
- `src/data/say/storePanel.js:58` (data: storePanel, ?) `Be the first — open your bag, tap something and choose Sell.`
- `src/data/say/storePanel.js:61` (data: storePanel, ?) `Open your bag, tap something and choose Sell.`
- `src/data/say/tradeWindow.js:52` (data: tradeWindow, ?) `That is a large amount of gold. Check the numbers, then tap Accept twice.`
- `src/data/say/tradeWindow.js:79` (data: tradeWindow, ?) `Presets subtract gold. Tap to make them add again.`
- `src/data/say/tradeWindow.js:80` (data: tradeWindow, ?) `Presets add gold. Tap to make them subtract.`
- `src/data/trapping.js:377` (data: trapping, yes) `Tap again to confirm`
- `src/game/frameSteps.js:76` (game: frameSteps, yes) `tap`
- `src/game/nmlAsk.js:391` (game: nmlAsk, yes) `tap`
- `src/game/nmlAsk.js:400` (game: nmlAsk, yes) `tap`
- `src/game/nmlAsk.js:496` (game: nmlAsk, yes) `tap`
- `src/game/pointsTips.js:84` (game: pointsTips, ?) `for any stat there. Tap a stat to see what it does.`
- `src/game/pointsTips.js:87` (game: pointsTips, ?) `waiting. Tap Points.`
- `src/game/pointsTips.js:90` (game: pointsTips, ?) `to spend. Tap Bro.`
- `src/game/pointsTips.js:92` (game: pointsTips, ?) `to spend. Tap the handle.`
- `src/game/questJournal.js:220` (game: questJournal, yes) `Tap`
- `src/game/renameOwner.js:59` (game: renameOwner, ?) `Everyone sees the new name. Tap Rename again to do it.`
- `src/game/silenceOwner.js:43` (game: silenceOwner, ?) `? Their chat reaches nobody; they still play. Tap again to do it.`
- `src/game/spar.js:72` (game: spar, ?) `here. Attack away -- a tap picks one to aim at.`
- `src/game/storeAnswer.js:31` (game: storeAnswer, ?) `Not sure it went up. Look in the Auction House under Yours, My Listings, before you tap...`
- `src/ui/guideArrow.js:207` (guideArrow, ?) `Tap a weapon to switch`
- `src/ui/guideArrow.js:212` (guideArrow, ?) `Tap here`
- `src/ui/guideArrow.js:213` (guideArrow, ?) `Tap Forge`
- `src/ui/guideArrow.js:214` (guideArrow, ?) `Tap to open`
- `src/ui/guideArrow.js:215` (guideArrow, ?) `Tap Gear`
- `src/ui/guideArrow.js:216` (guideArrow, ?) `Tap to equip`
- `src/ui/guideArrow.js:217` (guideArrow, ?) `Tap Bro: points to spend`
- `src/ui/guideArrow.js:218` (guideArrow, ?) `Tap Points`
- `src/networking/gameEvents.js:5251` (networking: gameEvents, ?) `Target a monster and tap TRAP`
- `src/ui/mobile/sheet/skillsModel.js:70` (skillsModel, ?) `Make box traps at the Woodworker, tap TRAP on a monster, then kill it. Every try pays X...`

## Every string, by screen

`P` in place, `T` in a table, `S` the worker; `?` unclear (counted).

### AccountLoginForm (1)

- `src/ui/account/AccountLoginForm.jsx:31` P? `This character can only be played on a device it was played on before, or with its new ...`

### AchievementBanner (2)

- `src/ui/panels/AchievementBanner.jsx:117` P `achievement`
- `src/ui/panels/AchievementBanner.jsx:122` P `AP`

### BoardRow (7)

- `src/ui/mobile/dash/BoardRow.jsx:240` P `DELETED`
- `src/ui/mobile/dash/BoardRow.jsx:250` P `Level`
- `src/ui/mobile/dash/BoardRow.jsx:255` P `Lv`
- `src/ui/mobile/dash/BoardRow.jsx:267` P `Bro`
- `src/ui/mobile/dash/BoardRow.jsx:272` P? `, a deleted character`
- `src/ui/mobile/dash/BoardRow.jsx:323` P `Bro`
- `src/ui/mobile/dash/BoardRow.jsx:327` P? `, a deleted character`

### BodyInk (13)

- `src/ui/panels/BodyInk.jsx:103` P `Face`
- `src/ui/panels/BodyInk.jsx:104` P `Arms`
- `src/ui/panels/BodyInk.jsx:105` P `Chest`
- `src/ui/panels/BodyInk.jsx:119` P `Pants`
- `src/ui/panels/BodyInk.jsx:133` P `Shirt`
- `src/ui/panels/BodyInk.jsx:980` P `Your character — draw straight onto the skin`
- `src/ui/panels/BodyInk.jsx:995` P `Drag to move the view`
- `src/ui/panels/BodyInk.jsx:997` P `Dragging moves the view — tap to go back to drawing`
- `src/ui/panels/BodyInk.jsx:997` P `Drag to move the view instead of drawing`
- `src/ui/panels/BodyInk.jsx:1009` P `Zoom out`
- `src/ui/panels/BodyInk.jsx:1013` P `Zoom in`
- `src/ui/panels/BodyInk.jsx:1028` P `The whole area, at the zoom this opened on`
- `src/ui/panels/BodyInk.jsx:1029` P `Back to the whole area, at the zoom this opened on`

### BottomDashboard (6)

- `src/ui/mobile/BottomDashboard.jsx:279` P? `{…}px solid transparent`
- `src/ui/mobile/BottomDashboard.jsx:280` P? `{…}px solid transparent`
- `src/ui/mobile/BottomDashboard.jsx:281` P? `{…}px solid {…}`
- `src/ui/mobile/BottomDashboard.jsx:454` P `Achievements`
- `src/ui/mobile/BottomDashboard.jsx:486` P `Leaderboards`
- `src/ui/mobile/BottomDashboard.jsx:572` P `Bro`

### BroTown (the game page) (135)

- `src/ui/BroTown.jsx:289` P? `All done? Tap me!`
- `src/ui/BroTown.jsx:956` P? `Mayor Bro`
- `src/ui/BroTown.jsx:956` P? `Blacksmith Bro`
- `src/ui/BroTown.jsx:956` P? `Lil Bro`
- `src/ui/BroTown.jsx:2763` P `Original`
- `src/ui/BroTown.jsx:2768` P `Original color`
- `src/ui/BroTown.jsx:3154` P? `Enter a valid NFT ID (1-6666)`
- `src/ui/BroTown.jsx:3198` P? `Bro Type`
- `src/ui/BroTown.jsx:3239` P? `Could not load catalog. Check connection.`
- `src/ui/BroTown.jsx:4157` P? `WebGL refused, attempt`
- `src/ui/BroTown.jsx:4184` P? `the canvas context has no stencil buffer: masks draw unclipped`
- `src/ui/BroTown.jsx:4185` P? `-- a fresh canvas`
- `src/ui/BroTown.jsx:4185` P? `-- again, played as it is`
- `src/ui/BroTown.jsx:4195` P? `renderer re-initialized (webgl)`
- `src/ui/BroTown.jsx:4277` P? `already owed`
- `src/ui/BroTown.jsx:4327` P? `pictures read back empty (`
- `src/ui/BroTown.jsx:4329` P? `pictures emptied at a black screen --`
- `src/ui/BroTown.jsx:5069` P? `YOU DIED`
- `src/ui/BroTown.jsx:5118` P `Fists`
- `src/ui/BroTown.jsx:5708` P? `Resting... (3s)`
- `src/ui/BroTown.jsx:5719` P? `Fully Rested!`
- `src/ui/BroTown.jsx:5720` P? `+10% XP for 30 min`
- `src/ui/BroTown.jsx:6794` P `Campfire`
- `src/ui/BroTown.jsx:7348` P? `BAG FULL -> sold`
- `src/ui/BroTown.jsx:7360` P? `PET -> sold`
- `src/ui/BroTown.jsx:7365` P `G`
- `src/ui/BroTown.jsx:7509` T `I have a task for you! Tap me.`
- `src/ui/BroTown.jsx:7782` P `ended`
- `src/ui/BroTown.jsx:7803` P? `War ended in a TIE!`
- `src/ui/BroTown.jsx:7803` P? `WAR WON!`
- `src/ui/BroTown.jsx:7803` P? `War lost...`
- `src/ui/BroTown.jsx:8994` P? `the Wheel's ground gone,`
- `src/ui/BroTown.jsx:8997` P? `% lit, strike`
- `src/ui/BroTown.jsx:9018` P? `black on first join, still dark after rebuild -- reloading into game`
- `src/ui/BroTown.jsx:9022` P? `world dark 20s despite rebuild -- reloading into game`
- `src/ui/BroTown.jsx:9180` P? `ARENA MATCH! vs`
- `src/ui/BroTown.jsx:9399` P? `Pull back and let go`
- `src/ui/BroTown.jsx:9399` P? `Flick to shoot`
- `src/ui/BroTown.jsx:9399` P? `Swipe to swing`
- `src/ui/BroTown.jsx:9517` P? `Zzz... Stats restored!`
- `src/ui/BroTown.jsx:9518` P? `Well Rested +10% XP (30min)`
- `src/ui/BroTown.jsx:9591` P? `Need raw fish`
- `src/ui/BroTown.jsx:9842` P? `Lighting fire…`
- `src/ui/BroTown.jsx:9896` P? `HP full`
- `src/ui/BroTown.jsx:9945` P? `cooked fish`
- `src/ui/BroTown.jsx:10561` P? `button, a[href], input, select, textarea, label, summary,`
- `src/ui/BroTown.jsx:10562` P? `[role="button"], [role="tab"], [role="link"], [role="menuitem"], [role="option"],`
- `src/ui/BroTown.jsx:10563` P? `[role="checkbox"], [role="switch"], [role="slider"], [data-bag-key], [data-gear]`
- `src/ui/BroTown.jsx:10671` P? `Too far away!`
- `src/ui/BroTown.jsx:10682` P? `Too far away!`
- `src/ui/BroTown.jsx:10726` P? `has nothing for you right now`
- `src/ui/BroTown.jsx:11131` P `You`
- `src/ui/BroTown.jsx:11911` P? `held by a finger the page never saw lift, let go (`
- `src/ui/BroTown.jsx:12310` P `Please pinch-out to reset zoom (back to 100%) before starting.`
- `src/ui/BroTown.jsx:12313` P `Anon`
- `src/ui/BroTown.jsx:12579` P? `recovery reload`
- `src/ui/BroTown.jsx:12579` P? `fresh snapshot`
- `src/ui/BroTown.jsx:12902` P? `Dismiss tour prompt`
- `src/ui/BroTown.jsx:12934` P? `New here? Want a quick tour?`
- `src/ui/BroTown.jsx:12960` P? `Start tour`
- `src/ui/BroTown.jsx:12982` P? `No thanks`
- `src/ui/BroTown.jsx:13701` P? `Achievement Unlocked`
- `src/ui/BroTown.jsx:13864` P? `🏡 Your Farm`
- `src/ui/BroTown.jsx:13868` P? `· 🌟 Well Rested`
- `src/ui/BroTown.jsx:13922` P? `🏡 Your Farm — Safe Zone`
- `src/ui/BroTown.jsx:14033` P? `Welcome! Use the LEFT STICK to move around.`
- `src/ui/BroTown.jsx:14033` P? `Nice! Now SWIPE the screen to dodge roll!`
- `src/ui/BroTown.jsx:14033` P? `Great dodge! Hold the RIGHT STICK to attack enemies.`
- `src/ui/BroTown.jsx:14033` P? `First kill! Head to the edge of town to explore the wild.`
- `src/ui/BroTown.jsx:14033` P? `Explore! Walk to the edge of town to enter a combat zone.`
- `src/ui/BroTown.jsx:14033` P? `Out in the wild! Monsters here are tougher. Reach Level 3 to prove yourself.`
- `src/ui/BroTown.jsx:14033` P? `Tutorial complete! The world is yours — explore every zone!`
- `src/ui/BroTown.jsx:14170` P? `SKILL UP!`
- `src/ui/BroTown.jsx:14170` P? `LEVEL UP!`
- `src/ui/BroTown.jsx:14208` P? `Keep at it — better yields and faster gathers`
- `src/ui/BroTown.jsx:14211` P? `Training — keep using this style`
- `src/ui/BroTown.jsx:14212` P? `You got stronger! HP · Stamina · Mana refilled`
- `src/ui/BroTown.jsx:14309` P? `QUEST COMPLETED!`
- `src/ui/BroTown.jsx:14310` P? `QUEST REWARD`
- `src/ui/BroTown.jsx:14318` P? `QUEST ACCEPTED!`
- `src/ui/BroTown.jsx:14373` P? `Skip tutorial`
- `src/ui/BroTown.jsx:14397` P `Cursed`
- `src/ui/BroTown.jsx:14400` P `-30% dmg`
- `src/ui/BroTown.jsx:14407` P `Bleed`
- `src/ui/BroTown.jsx:14426` P `x`
- `src/ui/BroTown.jsx:14436` P `Mana`
- `src/ui/BroTown.jsx:14439` P `Surge`
- `src/ui/BroTown.jsx:14446` P `Regen`
- `src/ui/BroTown.jsx:14449` P `x2 rest`
- `src/ui/BroTown.jsx:14456` P `Resist`
- `src/ui/BroTown.jsx:14474` P `% XP`
- `src/ui/BroTown.jsx:14485` P `Rested`
- `src/ui/BroTown.jsx:14488` P `+10% combat XP`
- `src/ui/BroTown.jsx:14501` P `Speed`
- `src/ui/BroTown.jsx:14504` P `x`
- `src/ui/BroTown.jsx:14582` P? `items scattered in`
- `src/ui/BroTown.jsx:14582` P? `s to recover!`
- `src/ui/BroTown.jsx:14640` P? `Max 3 snowmen!`
- `src/ui/BroTown.jsx:14649` P? `Snowman placed!`
- `src/ui/BroTown.jsx:14766` P? `Raft built! Sail across water.`
- `src/ui/BroTown.jsx:14770` P? `🚣 Build Raft (`
- `src/ui/BroTown.jsx:14777` P? `🚣 Raft ready`
- `src/ui/BroTown.jsx:14836` P? `Torch lit! (2 min)`
- `src/ui/BroTown.jsx:14840` P? `🔥 Light Torch (`
- `src/ui/BroTown.jsx:14854` P? `🔊 Echo! 2× aggro`
- `src/ui/BroTown.jsx:14884` P `Throw Snowball`
- `src/ui/BroTown.jsx:14914` P `Build Snowman (disabled)`
- `src/ui/BroTown.jsx:14926` P? `snow (have`
- `src/ui/BroTown.jsx:14938` P? `Snowman built!`
- `src/ui/BroTown.jsx:14956` P `Ride Sled`
- `src/ui/BroTown.jsx:14956` P `Craft Sled (`
- `src/ui/BroTown.jsx:14975` P? `wood (have`
- `src/ui/BroTown.jsx:14989` P? `Sled crafted!`
- `src/ui/BroTown.jsx:15045` P? `Already have a raft!`
- `src/ui/BroTown.jsx:15074` P? `Raft built!`
- `src/ui/BroTown.jsx:15078` P? `🚣 Raft Ready`
- `src/ui/BroTown.jsx:15078` P? `🪵 Build Raft (`
- `src/ui/BroTown.jsx:15122` P? `Torch already lit!`
- `src/ui/BroTown.jsx:15154` P? `Torch lit!`
- `src/ui/BroTown.jsx:15158` P? `🪵 Light Torch (`
- `src/ui/BroTown.jsx:15166` P? `⚠️ Dark! Monsters hear you.`
- `src/ui/BroTown.jsx:15312` P? `Shut for now`
- `src/ui/BroTown.jsx:15338` P? `😴 Sleep (Restore All + Well Rested Buff)`
- `src/ui/BroTown.jsx:15364` P? `🏗️ Dungeon Workshop`
- `src/ui/BroTown.jsx:15398` P? `the dungeon`
- `src/ui/BroTown.jsx:15437` P? `🐾 Pet House`
- `src/ui/BroTown.jsx:15451` P? `🪑 Furniture Workshop`
- `src/ui/BroTown.jsx:15644` P? `Snowman placed!`
- `src/ui/BroTown.jsx:15755` P? `Raft built! You can cross water.`
- `src/ui/BroTown.jsx:15759` P? `🚣 Build Raft (`
- `src/ui/BroTown.jsx:15772` P? `🚣 Raft Ready`
- `src/ui/BroTown.jsx:15819` P? `Torch lit! (2min)`
- `src/ui/BroTown.jsx:15823` P? `🔥 Light Torch (`
- `src/ui/BroTown.jsx:15850` P? `📢 ECHO: 2× aggro`
- `src/ui/BroTown.jsx:15850` P? `📢 Echo: quiet`

### BuildBadge (2)

- `src/ui/BuildBadge.jsx:23` P `Built {…}`
- `src/ui/BuildBadge.jsx:41` P `v`

### ChatBubble (7)

- `src/ui/mobile/ChatBubble.jsx:489` P? `Say something…`
- `src/ui/mobile/ChatBubble.jsx:546` P `online`
- `src/ui/mobile/ChatBubble.jsx:554` P `Emotes`
- `src/ui/mobile/ChatBubble.jsx:558` P `Emotes (B)`
- `src/ui/mobile/ChatBubble.jsx:596` P? `Turning your speech into text`
- `src/ui/mobile/ChatBubble.jsx:597` P? `Stop dictating`
- `src/ui/mobile/ChatBubble.jsx:598` P? `Speak your message`

### ChatChannelChips (5)

- `src/ui/mobile/ChatChannelChips.jsx:70` P `who?`
- `src/ui/mobile/ChatChannelChips.jsx:104` P? `Say it to this zone…`
- `src/ui/mobile/ChatChannelChips.jsx:105` P? `Say it to your party…`
- `src/ui/mobile/ChatChannelChips.jsx:108` P? `Whisper to`
- `src/ui/mobile/ChatChannelChips.jsx:108` P? `Whisper — pick a name first…`

### ChatPanel (1)

- `src/ui/panels/ChatPanel.jsx:107` T `Tap to type…`

### ClanPanel (1)

- `src/ui/mobile/dash/ClanPanel.jsx:66` T `Make a party: pick a player and tap Invite to Party on their card.`

### CodexStage (26)

- `src/ui/mobile/dash/CodexStage.jsx:177` P `idle`
- `src/ui/mobile/dash/CodexStage.jsx:186` P `idle`
- `src/ui/mobile/dash/CodexStage.jsx:187` P `idle`
- `src/ui/mobile/dash/CodexStage.jsx:190` P `attack`
- `src/ui/mobile/dash/CodexStage.jsx:190` P `idle`
- `src/ui/mobile/dash/CodexStage.jsx:191` P `idle`
- `src/ui/mobile/dash/CodexStage.jsx:200` P `idle`
- `src/ui/mobile/dash/CodexStage.jsx:201` P `attack`
- `src/ui/mobile/dash/CodexStage.jsx:201` P `idle`
- `src/ui/mobile/dash/CodexStage.jsx:202` P `idle`
- `src/ui/mobile/dash/CodexStage.jsx:207` P `idle`
- `src/ui/mobile/dash/CodexStage.jsx:208` P `idle`
- `src/ui/mobile/dash/CodexStage.jsx:209` P `idle`
- `src/ui/mobile/dash/CodexStage.jsx:214` P `burrow`
- `src/ui/mobile/dash/CodexStage.jsx:215` P `pile`
- `src/ui/mobile/dash/CodexStage.jsx:216` P `pile`
- `src/ui/mobile/dash/CodexStage.jsx:217` P `emerge`
- `src/ui/mobile/dash/CodexStage.jsx:218` P `idle`
- `src/ui/mobile/dash/CodexStage.jsx:222` P `idle`
- `src/ui/mobile/dash/CodexStage.jsx:223` P `transform`
- `src/ui/mobile/dash/CodexStage.jsx:229` P `idle`
- `src/ui/mobile/dash/CodexStage.jsx:233` P `idle`
- `src/ui/mobile/dash/CodexStage.jsx:236` P `idle`
- `src/ui/mobile/dash/CodexStage.jsx:240` P `death`
- `src/ui/mobile/dash/CodexStage.jsx:242` P `idle`
- `src/ui/mobile/dash/CodexStage.jsx:340` P `idle`

### ControlsTutorial (2)

- `src/ui/mobile/ControlsTutorial.jsx:61` P? `Sword: swipe across it, or anywhere on the right side, for each swing. Bow: pull back, ...`
- `src/ui/mobile/ControlsTutorial.jsx:73` P? `Your sword turns to the closest enemy by itself. A bow shoots opposite your pull, a sta...`

### CookPanel (12)

- `src/ui/panels/buildings/CookPanel.jsx:133` P? `Cooking Lv`
- `src/ui/panels/buildings/CookPanel.jsx:133` P? `· Cook what your farm grows into meals and brews.`
- `src/ui/panels/buildings/CookPanel.jsx:154` T `Raw fish are cooked at a campfire, not here: tap a log in your bag, choose Light fire, ...`
- `src/ui/panels/buildings/CookPanel.jsx:167` P? `Cooked — Ready to Eat`
- `src/ui/panels/buildings/CookPanel.jsx:273` P? `Meals & Brews — Herbs`
- `src/ui/panels/buildings/CookPanel.jsx:273` P? `Buff Recipes — Herbs`
- `src/ui/panels/buildings/CookPanel.jsx:279` P? `Cook farmed herbs into meals and brews to carry. One meal and one brew can run at once.`
- `src/ui/panels/buildings/CookPanel.jsx:279` P? `Combine farmed herbs into combat buff meals. No timing needed — just ingredients.`
- `src/ui/panels/buildings/CookPanel.jsx:338` P? `% all stats`
- `src/ui/panels/buildings/CookPanel.jsx:400` P? `· you carry`
- `src/ui/panels/buildings/CookPanel.jsx:435` P? `Unlocks at Cooking Lv`
- `src/ui/panels/buildings/CookPanel.jsx:521` P? `Cooking Lv`

### DesignGallery (9)

- `src/ui/panels/DesignGallery.jsx:86` P `design`
- `src/ui/panels/DesignGallery.jsx:115` P `Ready-made designs`
- `src/ui/panels/DesignGallery.jsx:143` P `Designs`
- `src/ui/panels/DesignGallery.jsx:145` P `of`
- `src/ui/panels/DesignGallery.jsx:149` P `Tap one to put it on your`
- `src/ui/panels/DesignGallery.jsx:149` P `. It replaces what is there — one tap of Undo brings it back.`
- `src/ui/panels/DesignGallery.jsx:175` P `Put`
- `src/ui/panels/DesignGallery.jsx:175` P `on your`
- `src/ui/panels/DesignGallery.jsx:192` P `Cancel`

### DeviceScreen (12)

- `src/ui/DeviceScreen.js:72` P `This character is played on another device`
- `src/ui/DeviceScreen.js:73` P `A character can only be played on a device it was played on before, or with its new Log...`
- `src/ui/DeviceScreen.js:74` P `To play it here, use the Login Key on the Account card of a device you play it on,`
- `src/ui/DeviceScreen.js:75` P `or ask the game’s owner for one and give them this code:`
- `src/ui/DeviceScreen.js:76` P? `Then tap Use a Login Key and type it.`
- `src/ui/DeviceScreen.js:79` P `This Login Key no longer works`
- `src/ui/DeviceScreen.js:80` P `Ask the game’s owner for a new Login Key, and give them this code:`
- `src/ui/DeviceScreen.js:81` P? `Then tap Use a Login Key and type the new one.`
- `src/ui/DeviceScreen.js:107` P? `Copy the code`
- `src/ui/DeviceScreen.js:110` P? `Copy the code`
- `src/ui/DeviceScreen.js:118` P? `Try again`
- `src/ui/DeviceScreen.js:130` P? `Use a Login Key`

### DungeonClearHud (5)

- `src/ui/mobile/DungeonClearHud.jsx:53` P? `Rare Gem`
- `src/ui/mobile/DungeonClearHud.jsx:153` P `Dungeon cleared!`
- `src/ui/mobile/DungeonClearHud.jsx:155` P `Pick up your loot · out in`
- `src/ui/mobile/DungeonClearHud.jsx:155` P `s`
- `src/ui/mobile/DungeonClearHud.jsx:158` P `Leave now`

### DungeonCreatorPanel (30)

- `src/ui/panels/DungeonCreatorPanel.jsx:132` P? `Dungeon Workshop`
- `src/ui/panels/DungeonCreatorPanel.jsx:140` P? `Design custom dungeons · Max monster level:`
- `src/ui/panels/DungeonCreatorPanel.jsx:182` P? `Dungeon Name`
- `src/ui/panels/DungeonCreatorPanel.jsx:205` P `My Dungeon`
- `src/ui/panels/DungeonCreatorPanel.jsx:210` P? `Terrain Theme`
- `src/ui/panels/DungeonCreatorPanel.jsx:327` P? `Waves (max`
- `src/ui/panels/DungeonCreatorPanel.jsx:356` P? `Monster Level (max`
- `src/ui/panels/DungeonCreatorPanel.jsx:381` P? `Dungeon Element (optional)`
- `src/ui/panels/DungeonCreatorPanel.jsx:461` P? `Boss Enabled`
- `src/ui/panels/DungeonCreatorPanel.jsx:461` P? `No Boss`
- `src/ui/panels/DungeonCreatorPanel.jsx:518` P? `Configure monsters per wave. Each wave spawns these groups.`
- `src/ui/panels/DungeonCreatorPanel.jsx:602` P? `Add Monsters`
- `src/ui/panels/DungeonCreatorPanel.jsx:641` P? `Total per wave:`
- `src/ui/panels/DungeonCreatorPanel.jsx:651` P? `Not enough gold!`
- `src/ui/panels/DungeonCreatorPanel.jsx:657` P? `Pack purchased!`
- `src/ui/panels/DungeonCreatorPanel.jsx:680` P? `· Purchase content packs for your dungeons`
- `src/ui/panels/DungeonCreatorPanel.jsx:684` P? `Terrain Packs`
- `src/ui/panels/DungeonCreatorPanel.jsx:723` P? `zone boss first`
- `src/ui/panels/DungeonCreatorPanel.jsx:760` P? `Monster Packs`
- `src/ui/panels/DungeonCreatorPanel.jsx:799` P? `zone boss first`
- `src/ui/panels/DungeonCreatorPanel.jsx:838` P? `Free packs included: Stone Halls terrain, Basic Beasts, Heavy Hitters, Dark Arts, Volat...`
- `src/ui/panels/DungeonCreatorPanel.jsx:849` P? `Max 5 saved dungeons!`
- `src/ui/panels/DungeonCreatorPanel.jsx:859` P? `Dungeon saved!`
- `src/ui/panels/DungeonCreatorPanel.jsx:888` P? `Entering dungeon...`
- `src/ui/panels/DungeonCreatorPanel.jsx:1015` P? `✅ Ready to play!`
- `src/ui/panels/DungeonCreatorPanel.jsx:1022` P? `waves · Lv`
- `src/ui/panels/DungeonCreatorPanel.jsx:1044` P? `💾 Save Design`
- `src/ui/panels/DungeonCreatorPanel.jsx:1062` P? `▶️ Play Now`
- `src/ui/panels/DungeonCreatorPanel.jsx:1067` P? `Saved Dungeons (`
- `src/ui/panels/DungeonCreatorPanel.jsx:1073` P? `No saved dungeons yet`

### EconCard (31)

- `src/ui/panels/EconCard.jsx:35` P `The day's book is switched OFF (the daybook flag).`
- `src/ui/panels/EconCard.jsx:36` P `The economy:`
- `src/ui/panels/EconCard.jsx:36` P `day(s) of the book.`
- `src/ui/panels/EconCard.jsx:47` P? `an hour`
- `src/ui/panels/EconCard.jsx:53` P `The economy (the day's book)`
- `src/ui/panels/EconCard.jsx:55` P `Gold and items the game made and destroyed, a day (UTC), and the room's own counts. Mov...`
- `src/ui/panels/EconCard.jsx:58` P `Today`
- `src/ui/panels/EconCard.jsx:59` P `Last 7 days`
- `src/ui/panels/EconCard.jsx:60` P `Last 30 days`
- `src/ui/panels/EconCard.jsx:63` P `Reload the economy`
- `src/ui/panels/EconCard.jsx:63` P `Show the economy`
- `src/ui/panels/EconCard.jsx:82` P `The day's book is switched off: what is shown is what was written before.`
- `src/ui/panels/EconCard.jsx:83` P `The book has no days yet.`
- `src/ui/panels/EconCard.jsx:86` P `a newer worker's day`
- `src/ui/panels/EconCard.jsx:87` P `Gold made`
- `src/ui/panels/EconCard.jsx:88` P `Gold destroyed`
- `src/ui/panels/EconCard.jsx:89` P `Gold made, less destroyed`
- `src/ui/panels/EconCard.jsx:90` P `Play`
- `src/ui/panels/EconCard.jsx:91` P `Items made:`
- `src/ui/panels/EconCard.jsx:92` P `Items destroyed:`
- `src/ui/panels/EconCard.jsx:94` P `Joins`
- `src/ui/panels/EconCard.jsx:94` P `, restarts`
- `src/ui/panels/EconCard.jsx:94` P `, rows written`
- `src/ui/panels/EconCard.jsx:94` P `, saves refused`
- `src/ui/panels/EconCard.jsx:95` P `smoothness cell(s),`
- `src/ui/panels/EconCard.jsx:95` P `speed card(s).`
- `src/ui/panels/EconCard.jsx:97` P `Storage:`
- `src/ui/panels/EconCard.jsx:97` P `MB`
- `src/ui/panels/EconCard.jsx:97` P? `(the mean of`
- `src/ui/panels/EconCard.jsx:97` P `not read that day`
- `src/ui/panels/EconCard.jsx:98` P `A full part left numbers out:`

### ElemStatusChips (12)

- `src/ui/ElemStatusChips.jsx:25` P `Chilled`
- `src/ui/ElemStatusChips.jsx:26` P `Burning`
- `src/ui/ElemStatusChips.jsx:27` P `Stuck`
- `src/ui/ElemStatusChips.jsx:31` P `Dazed`
- `src/ui/ElemStatusChips.jsx:33` P `Frozen`
- `src/ui/ElemStatusChips.jsx:37` P `Wobbly`
- `src/ui/ElemStatusChips.jsx:38` P `Soaked`
- `src/ui/ElemStatusChips.jsx:39` P `Poisoned`
- `src/ui/ElemStatusChips.jsx:43` P `Slowed`
- `src/ui/ElemStatusChips.jsx:44` P `Fractured`
- `src/ui/ElemStatusChips.jsx:45` P `Thorned`
- `src/ui/ElemStatusChips.jsx:93` P `s`

### ElementBurstButton (1)

- `src/ui/mobile/ElementBurstButton.jsx:199` P `Element Burst`

### EmotePanel (3)

- `src/ui/panels/EmotePanel.jsx:125` P? `Close emotes`
- `src/ui/panels/EmotePanel.jsx:138` P? `Emoji & lines`
- `src/ui/panels/EmotePanel.jsx:145` P? `Sit, sleep, flop and the dances last until you move.`

### EnchantPanel (4)

- `src/ui/panels/buildings/EnchantPanel.jsx:510` P `Simple`
- `src/ui/panels/buildings/EnchantPanel.jsx:510` P `Amulet`
- `src/ui/panels/buildings/EnchantPanel.jsx:621` P `Basic`
- `src/ui/panels/buildings/EnchantPanel.jsx:621` P `Shield`

### EncyclopediaPanel (13)

- `src/ui/mobile/dash/EncyclopediaPanel.jsx:11` P `Monsters`
- `src/ui/mobile/dash/EncyclopediaPanel.jsx:12` P `Codex`
- `src/ui/mobile/dash/EncyclopediaPanel.jsx:13` P `Materials`
- `src/ui/mobile/dash/EncyclopediaPanel.jsx:14` P `Zones`
- `src/ui/mobile/dash/EncyclopediaPanel.jsx:115` P `Nothing discovered in this category yet.`
- `src/ui/panels/EncyclopediaPanel.jsx:189` P? `Kill monsters to discover entries.`
- `src/ui/panels/EncyclopediaPanel.jsx:326` P? `Effectiveness Circle`
- `src/ui/panels/EncyclopediaPanel.jsx:377` P? `Apply two different elements to trigger a collision reaction`
- `src/ui/panels/EncyclopediaPanel.jsx:464` P? `Mining Ores`
- `src/ui/panels/EncyclopediaPanel.jsx:533` P? `Blacksmith Metals`
- `src/ui/panels/EncyclopediaPanel.jsx:583` P? `Cooking Recipes`
- `src/ui/panels/EncyclopediaPanel.jsx:735` P? `enemy types`
- `src/ui/panels/EncyclopediaPanel.jsx:741` P? `Travel here to discover`

### FarmBedPrompt (3)

- `src/ui/mobile/FarmBedPrompt.jsx:47` P `Plant`
- `src/ui/mobile/FarmBedPrompt.jsx:47` P `Plant`
- `src/ui/mobile/FarmBedPrompt.jsx:82` P `E`

### FarmPanel (13)

- `src/ui/panels/buildings/FarmPanel.jsx:104` P? `Farming Lv`
- `src/ui/panels/buildings/FarmPanel.jsx:107` P? `Plant seeds from zones, harvest when grown.`
- `src/ui/panels/buildings/FarmPanel.jsx:127` P? `Your Farm`
- `src/ui/panels/buildings/FarmPanel.jsx:131` P? `Visit Your Farm`
- `src/ui/panels/buildings/FarmPanel.jsx:134` P? `Your farm has a house where you can sleep to fully restore HP, Mana, Stamina and gain a...`
- `src/ui/panels/buildings/FarmPanel.jsx:138` P? `· Well Rested active!`
- `src/ui/panels/buildings/FarmPanel.jsx:193` P? `Unlocks at Farming Lv`
- `src/ui/panels/buildings/FarmPanel.jsx:289` P? `Empty plot`
- `src/ui/panels/buildings/FarmPanel.jsx:289` P? `Empty · No seeds`
- `src/ui/panels/buildings/FarmPanel.jsx:291` P? `Plant seeds`
- `src/ui/panels/buildings/FarmPanel.jsx:324` P? `No seeds. Gather resources from zones!`
- `src/ui/panels/buildings/FarmPanel.jsx:377` P? `No empty plots!`
- `src/ui/panels/buildings/FarmPanel.jsx:412` P? `Plots unlock at Farming Lv1 (×2), Lv10 (×4), Lv25 (×6). Higher tier resources grow long...`

### FeedSeedPanel (1)

- `src/ui/panels/buildings/FeedSeedPanel.jsx:296` P `Compost`

### FeedbackPanel (34)

- `src/ui/mobile/dash/FeedbackPanel.jsx:50` P `sending`
- `src/ui/mobile/dash/FeedbackPanel.jsx:55` P `error`
- `src/ui/mobile/dash/FeedbackPanel.jsx:55` P? `Could not send. Try again.`
- `src/ui/mobile/dash/FeedbackPanel.jsx:59` P `sent`
- `src/ui/mobile/dash/FeedbackPanel.jsx:60` P `idle`
- `src/ui/mobile/dash/FeedbackPanel.jsx:62` P `error`
- `src/ui/mobile/dash/FeedbackPanel.jsx:62` P? `Could not reach the server. Try again.`
- `src/ui/mobile/dash/FeedbackPanel.jsx:77` P `Submit`
- `src/ui/mobile/dash/FeedbackPanel.jsx:78` P `Browse`
- `src/ui/mobile/dash/FeedbackPanel.jsx:92` P `idle`
- `src/ui/mobile/dash/FeedbackPanel.jsx:93` P `Tell us what's working or broken…`
- `src/ui/mobile/dash/FeedbackPanel.jsx:115` P `What kind?`
- `src/ui/mobile/dash/FeedbackPanel.jsx:122` P `About`
- `src/ui/mobile/dash/FeedbackPanel.jsx:133` P `Thanks — it’s on the board.`
- `src/ui/mobile/dash/FeedbackPanel.jsx:148` P `Sending…`
- `src/ui/mobile/dash/FeedbackPanel.jsx:148` P `Sent`
- `src/ui/mobile/dash/FeedbackPanel.jsx:148` P `Send`
- `src/ui/mobile/dash/FeedbackPanel.jsx:164` P `Found a cheat or a security hole? This board is public, so please`
- `src/ui/mobile/dash/FeedbackPanel.jsx:175` P `report it privately on GitHub`
- `src/ui/mobile/dash/FeedbackPanel.jsx:175` P `instead.`
- `src/ui/mobile/dash/FeedbackPanel.jsx:224` P `Newest`
- `src/ui/mobile/dash/FeedbackPanel.jsx:225` P `Most liked`
- `src/ui/mobile/dash/FeedbackPanel.jsx:228` P `Couldn’t load the board.`
- `src/ui/mobile/dash/FeedbackPanel.jsx:228` P `Retry`
- `src/ui/mobile/dash/FeedbackPanel.jsx:230` P `Loading…`
- `src/ui/mobile/dash/FeedbackPanel.jsx:232` P `No feedback yet — be the first.`
- `src/ui/panels/FeedbackPanel.jsx:125` P? `Community Feedback`
- `src/ui/panels/FeedbackPanel.jsx:131` P? `Report bugs, suggest features, vote on priorities`
- `src/ui/panels/FeedbackPanel.jsx:272` P? `No feedback yet. Be the first to submit!`
- `src/ui/panels/FeedbackPanel.jsx:538` P `Brief description...`
- `src/ui/panels/FeedbackPanel.jsx:565` P? `Write something first!`
- `src/ui/panels/FeedbackPanel.jsx:590` P? `Feedback submitted!`
- `src/ui/panels/FeedbackPanel.jsx:600` P? `Server error`
- `src/ui/panels/FeedbackPanel.jsx:619` P? `Submit Feedback`

### FurniturePanel (4)

- `src/ui/panels/FurniturePanel.jsx:60` P? `🪑 Furniture Workshop`
- `src/ui/panels/FurniturePanel.jsx:67` P? `Woodworking Lv`
- `src/ui/panels/FurniturePanel.jsx:67` P? `· Craft furniture for stat buffs`
- `src/ui/panels/FurniturePanel.jsx:156` P? `WC Lv`

### GameApp (2)

- `src/ui/GameApp.jsx:68` P `You`
- `src/ui/GameApp.jsx:459` P `You`

### GearTab (42)

- `src/ui/mobile/dash/GearTab.jsx:143` P? `A melee weapon: swing it up close.`
- `src/ui/mobile/dash/GearTab.jsx:144` P? `Shoots arrows from a distance.`
- `src/ui/mobile/dash/GearTab.jsx:145` P? `Casts magic orbs that fly at your target.`
- `src/ui/mobile/dash/GearTab.jsx:146` P? `Raise it to block a hit.`
- `src/ui/mobile/dash/GearTab.jsx:147` P? `Cuts the damage of every hit you take.`
- `src/ui/mobile/dash/GearTab.jsx:148` P? `Cuts the damage of every hit you take.`
- `src/ui/mobile/dash/GearTab.jsx:149` P? `A contest prize, worn on your back.`
- `src/ui/mobile/dash/GearTab.jsx:150` P? `Adds its gem’s power to your fighting.`
- `src/ui/mobile/dash/GearTab.jsx:197` P `Shield`
- `src/ui/mobile/dash/GearTab.jsx:213` P `Chest`
- `src/ui/mobile/dash/GearTab.jsx:213` P `Legs`
- `src/ui/mobile/dash/GearTab.jsx:218` P `Cape`
- `src/ui/mobile/dash/GearTab.jsx:231` P `Amulet`
- `src/ui/mobile/dash/GearTab.jsx:238` P `Gem`
- `src/ui/mobile/dash/GearTab.jsx:643` P? `All Items`
- `src/ui/mobile/dash/GearTab.jsx:668` P `Clear the filter`
- `src/ui/mobile/dash/GearTab.jsx:683` P `coins`
- `src/ui/mobile/dash/GearTab.jsx:700` P `No`
- `src/ui/mobile/dash/GearTab.jsx:700` P `items`
- `src/ui/mobile/dash/GearTab.jsx:700` P `in your bag`
- `src/ui/mobile/dash/GearTab.jsx:703` P `Show all`
- `src/ui/mobile/dash/GearTab.jsx:743` P `Show`
- `src/ui/mobile/dash/GearTab.jsx:746` P `weapons`
- `src/ui/mobile/dash/GearTab.jsx:748` P `Close the filter menu`
- `src/ui/mobile/dash/GearTab.jsx:753` P `All items`
- `src/ui/mobile/dash/GearTab.jsx:761` P `All items`
- `src/ui/mobile/dash/GearTab.jsx:792` P `Equipped`
- `src/ui/mobile/dash/GearTab.jsx:830` P `More actions`
- `src/ui/mobile/dash/GearTab.jsx:851` P `Qty`
- `src/ui/mobile/dash/GearTab.jsx:863` P? `Hardness {…} of {…}`
- `src/ui/mobile/dash/GearTab.jsx:865` P `Hardness`
- `src/ui/mobile/dash/GearTab.jsx:903` P? `No gem yet`
- `src/ui/mobile/dash/GearTab.jsx:905` P? `Set in your`
- `src/ui/mobile/dash/GearTab.jsx:905` P? `. Gems are set at the Gem Works.`
- `src/ui/mobile/dash/GearTab.jsx:905` P? `has no gem in it. Gems are set at the Gem Works.`
- `src/ui/mobile/dash/GearTab.jsx:906` P? `Nothing in your hand.`
- `src/ui/mobile/dash/GearTab.jsx:917` P? `No {…} yet. Pick one from your bag.`
- `src/ui/mobile/dash/GearTab.jsx:930` P? `Gold buys gear and food at the shops.`
- `src/ui/mobile/dash/GearTab.jsx:1062` P `Lv`
- `src/ui/mobile/dash/GearTab.jsx:1132` P `Close the details`
- `src/ui/mobile/dash/GearTab.jsx:1157` P `MORE`
- `src/ui/mobile/dash/GearTab.jsx:1158` P `Close`

### GuildPanel (20)

- `src/ui/mobile/dash/GuildPanel.jsx:61` P `Skill guilds`
- `src/ui/mobile/dash/GuildPanel.jsx:62` P `Your rank in each rises with its life skill`
- `src/ui/mobile/dash/GuildPanel.jsx:65` P `Your ranks`
- `src/ui/mobile/dash/GuildPanel.jsx:74` P `Lv`
- `src/ui/mobile/dash/GuildPanel.jsx:81` P `Titles and guild quests`
- `src/ui/panels/GuildPanel.jsx:83` P? `Life Skill Guilds`
- `src/ui/panels/GuildPanel.jsx:90` P? `Progress through guild ranks to earn titles and AP`
- `src/ui/panels/GuildPanel.jsx:223` P? `MAX RANK`
- `src/ui/panels/GuildPanel.jsx:232` P? `Guild Ranks`
- `src/ui/panels/GuildPanel.jsx:304` P? `Not open yet`
- `src/ui/panels/GuildPanel.jsx:320` P? `🏛️ Claim Reward`
- `src/ui/panels/GuildPanel.jsx:330` P? `All guild quests completed! You are a`
- `src/ui/panels/GuildPanel.jsx:330` P? `of the`
- `src/ui/panels/GuildPanel.jsx:351` P? `Welcome to the guild. Work hard and you'll rise.`
- `src/ui/panels/GuildPanel.jsx:351` P? `You're making progress. Keep at it.`
- `src/ui/panels/GuildPanel.jsx:351` P? `Impressive dedication. The guild honors your commitment.`
- `src/ui/panels/GuildPanel.jsx:351` P? `Few reach this level. You are a true craftsman.`
- `src/ui/panels/GuildPanel.jsx:351` P? `A master walks among us. The guild bows to your skill.`
- `src/ui/panels/GuildPanel.jsx:351` P? `You have transcended mortal limits. Legendary.`
- `src/ui/panels/GuildPanel.jsx:366` P? `Earned Titles`

### HardenedWoodTab (4)

- `src/ui/panels/buildings/HardenedWoodTab.jsx:93` P `· Woodworking`
- `src/ui/panels/buildings/HardenedWoodTab.jsx:94` P `XP`
- `src/ui/panels/buildings/HardenedWoodTab.jsx:98` P `Locked`
- `src/ui/panels/buildings/HardenedWoodTab.jsx:98` P `Make`

### InfoPopup (1)

- `src/ui/mobile/InfoPopup.jsx:551` P `Add points with +`

### InspectCard (3)

- `src/ui/mobile/InspectCard.jsx:44` P? `"Source Sans 3", sans-serif`
- `src/ui/mobile/InspectCard.jsx:45` P? `"Source Sans 3", sans-serif`
- `src/ui/mobile/InspectCard.jsx:46` P? `"Source Sans 3", sans-serif`

### InstallHint (7)

- `src/ui/mobile/InstallHint.jsx:144` P `PLAY FULL SCREEN`
- `src/ui/mobile/InstallHint.jsx:147` P `Tap`
- `src/ui/mobile/InstallHint.jsx:147` P `this button`
- `src/ui/mobile/InstallHint.jsx:147` P `in Safari — bottom bar upright, top-right sideways — then`
- `src/ui/mobile/InstallHint.jsx:148` P `Add to Home Screen`
- `src/ui/mobile/InstallHint.jsx:148` P `. Open Bro Town from that icon: no browser bar.`
- `src/ui/mobile/InstallHint.jsx:154` P `Dismiss`

### IntroVideo (1)

- `src/ui/IntroVideo.jsx:200` P `Loading`

### InventoryPanel (11)

- `src/ui/mobile/dash/InventoryPanel.jsx:308` P? `Fury Tonic`
- `src/ui/mobile/dash/InventoryPanel.jsx:309` P? `Swift Draught`
- `src/ui/mobile/dash/InventoryPanel.jsx:315` P? `Mana Draught`
- `src/ui/mobile/dash/InventoryPanel.jsx:316` P? `Stamina Tonic`
- `src/ui/mobile/dash/InventoryPanel.jsx:317` P? `Zoom Juice`
- `src/ui/mobile/dash/InventoryPanel.jsx:318` P? `Daily Chest`
- `src/ui/mobile/dash/InventoryPanel.jsx:319` P? `Copper Bar`
- `src/ui/mobile/dash/InventoryPanel.jsx:326` P? `Iron Bar`
- `src/ui/mobile/dash/InventoryPanel.jsx:327` P? `Black Steel Bar`
- `src/ui/mobile/dash/InventoryPanel.jsx:328` P? `Box Trap`
- `src/ui/mobile/dash/InventoryPanel.jsx:1100` P? `{…}px {…}px {…}px`

### ItemDetailPopup (1)

- `src/ui/mobile/dash/ItemDetailPopup.jsx:1252` P? `y mandatory`

### ItemTooltip (11)

- `src/ui/mobile/ItemTooltip.jsx:243` P? `Take off`
- `src/ui/mobile/ItemTooltip.jsx:243` P? `Add shortcut`
- `src/ui/mobile/ItemTooltip.jsx:246` P? `Keep safe`
- `src/ui/mobile/ItemTooltip.jsx:246` P? `Add shortcut`
- `src/ui/mobile/ItemTooltip.jsx:248` P? `Keep safe`
- `src/ui/mobile/ItemTooltip.jsx:248` P? `Add shortcut`
- `src/ui/mobile/ItemTooltip.jsx:250` P? `Keep safe`
- `src/ui/mobile/ItemTooltip.jsx:250` P? `Add shortcut`
- `src/ui/mobile/ItemTooltip.jsx:252` P? `Keep safe`
- `src/ui/mobile/ItemTooltip.jsx:253` P? `Keep safe`
- `src/ui/mobile/ItemTooltip.jsx:253` P? `Add shortcut`

### JumpButton (1)

- `src/ui/panels/JumpButton.jsx:226` P `jump`

### LandOfficePanel (4)

- `src/ui/panels/buildings/LandOfficePanel.jsx:42` P? `Land Office`
- `src/ui/panels/buildings/LandOfficePanel.jsx:43` P? `Your own farm`
- `src/ui/panels/buildings/LandOfficePanel.jsx:46` P? `Visit your personal farm to grow crops, rest in bed, and tend your homestead.`
- `src/ui/panels/buildings/LandOfficePanel.jsx:50` P? `🚶 Travel to Farm`

### LeaderboardPanel (1)

- `src/ui/mobile/dash/LeaderboardPanel.jsx:211` P `Ranks`

### LevelUpBurst (2)

- `src/ui/LevelUpBurst.jsx:588` P `{…} · Skill Level{…}`
- `src/ui/LevelUpBurst.jsx:597` P `Character Level`

### LingerScreen (9)

- `src/ui/LingerScreen.js:58` P? `Back in`
- `src/ui/LingerScreen.js:58` P? `Coming back…`
- `src/ui/LingerScreen.js:72` P? `<div class="bt-lg-card">`
- `src/ui/LingerScreen.js:73` P? `<div class="bt-lg-ring"></div>`
- `src/ui/LingerScreen.js:74` P? `<h2>Your bro is still in that fight</h2>`
- `src/ui/LingerScreen.js:75` P? `<p>You left in the middle of a fight with another player, so your bro`
- `src/ui/LingerScreen.js:76` P? `stays where you left them for a few seconds &mdash; leaving is never a`
- `src/ui/LingerScreen.js:77` P? `way out of a fight.</p>`
- `src/ui/LingerScreen.js:78` P? `<div class="bt-lg-next"></div>`

### MapPanel (2)

- `src/ui/mobile/dash/MapPanel.jsx:136` P `Discovered`
- `src/ui/mobile/dash/MapPanel.jsx:138` P `Nothing yet.`

### MayorGreeting (5)

- `src/ui/MayorGreeting.jsx:87` P `Mayor Bro welcome`
- `src/ui/MayorGreeting.jsx:101` P `Mayor Bro`
- `src/ui/MayorGreeting.jsx:103` P `“Another one washes ashore. Relax — everyone starts as driftwood.”`
- `src/ui/MayorGreeting.jsx:114` P `Skip Mayor intro`
- `src/ui/MayorGreeting.jsx:116` P `Skip`

### MonsterCodex (10)

- `src/ui/mobile/dash/MonsterCodex.jsx:119` P? `M3 3l10 10M13 3L3 13M2.5 10.5l3 3M10.5 13.5l3-3`
- `src/ui/mobile/dash/MonsterCodex.jsx:120` P? `M8 1.8l5.2 2.1v4c0 3.2-2.2 5.3-5.2 6.3-3-1-5.2-3.1-5.2-6.3v-4z`
- `src/ui/mobile/dash/MonsterCodex.jsx:121` P? `M8 2.5a5.5 5.5 0 1 0 0 11a5.5 5.5 0 1 0 0-11zM8 5.2a2.8 2.8 0 1 0 0 5.6a2.8 2.8 0 1 0 0...`
- `src/ui/mobile/dash/MonsterCodex.jsx:122` P? `M4.2 3h7.6l2.7 3.4L8 14 1.5 6.4zM1.5 6.4h13M6.3 3L5 6.4 8 14l3-7.6L9.7 3`
- `src/ui/mobile/dash/MonsterCodex.jsx:123` P? `M2.5 5L8 2l5.5 3v6L8 14l-5.5-3zM2.5 5L8 8l5.5-3M8 8v6`
- `src/ui/mobile/dash/MonsterCodex.jsx:124` P? `M9.2 1.8l5 5-2.1 2.1-5-5zM7.6 5.4L2 13.6`
- `src/ui/mobile/dash/MonsterCodex.jsx:125` P? `M8 1.5v13M8 3h4.6l1.6 1.6-1.6 1.6H8M8 8.2H3.4L1.8 9.8l1.6 1.6H8`
- `src/ui/mobile/dash/MonsterCodex.jsx:280` P? `M5.6 2.4h4.8L9.2 4.7c2.5 1.2 4 3.6 4 6.1 0 1.9-1.6 2.7-5.2 2.7s-5.2-.8-5.2-2.7c0-2.5 1....`
- `src/ui/mobile/dash/MonsterCodex.jsx:281` P `M8 1.8a6.2 6.2 0 1 0 0 12.4a6.2 6.2 0 1 0 0-12.4zM8 7.2v4.4M8 4.7v.2`
- `src/ui/mobile/dash/MonsterCodex.jsx:282` P? `M8 14.4s-4.7-4.5-4.7-8a4.7 4.7 0 0 1 9.4 0c0 3.5-4.7 8-4.7 8zM8 4.6a1.8 1.8 0 1 0 0 3.6...`

### MorePanel (1)

- `src/ui/mobile/dash/MorePanel.jsx:74` P? `brightness(1.18) contrast(1.05)`

### NewMonsterCard (5)

- `src/ui/panels/NewMonsterCard.jsx:67` P `A new monster`
- `src/ui/panels/NewMonsterCard.jsx:78` P? `New monster:`
- `src/ui/panels/NewMonsterCard.jsx:78` P? `. Open it in the Codex`
- `src/ui/panels/NewMonsterCard.jsx:98` P `New monster`
- `src/ui/panels/NewMonsterCard.jsx:100` T `Tap to see it in the Codex ›`

### NotificationsPanel (6)

- `src/ui/mobile/dash/NotificationsPanel.jsx:42` P `World chat and news from the game`
- `src/ui/mobile/dash/NotificationsPanel.jsx:42` P `, also on screen`
- `src/ui/mobile/dash/NotificationsPanel.jsx:49` P `Hide from screen`
- `src/ui/mobile/dash/NotificationsPanel.jsx:49` P `Show on screen`
- `src/ui/mobile/dash/NotificationsPanel.jsx:74` P `Nothing yet. Chat and news from the game show up here.`
- `src/ui/mobile/dash/NotificationsPanel.jsx:78` T `To silence them all, tap Settings, then Notifications.`

### NpcDialogue (2)

- `src/ui/panels/NpcDialogue.jsx:152` P `Close. Your reward stays waiting for you.`
- `src/ui/panels/NpcDialogue.jsx:232` P `Next`

### OriginScreen (5)

- `src/ui/OriginScreen.js:77` P? `This isn't the official BroTown`
- `src/ui/OriginScreen.js:88` P? `BroTown is played at`
- `src/ui/OriginScreen.js:88` P? `, and its world only opens there.`
- `src/ui/OriginScreen.js:91` P? `Play at`
- `src/ui/OriginScreen.js:94` P? `This page is at`

### PartyHUD (1)

- `src/ui/panels/PartyHUD.jsx:249` T `Tap to see your party`

### PartyPanel (2)

- `src/ui/panels/buildings/PartyPanel.jsx:308` P `queued`
- `src/ui/panels/buildings/PartyPanel.jsx:314` P? `Entered arena queue!`

### PetHousePanel (4)

- `src/ui/panels/PetHousePanel.jsx:112` P? `Pet House`
- `src/ui/panels/PetHousePanel.jsx:119` P? `pets · Trapping Lv`
- `src/ui/panels/PetHousePanel.jsx:163` T `No pets yet. Target a monster out in the lands and tap TRAP, then kill it.`
- `src/ui/panels/PetHousePanel.jsx:264` T `Tap to set active. Active pet follows and auto-loots.`

### PinCards (11)

- `src/ui/PinCards.jsx:52` P? `[data-nml-ask], [data-party-invite], [data-death-card], [data-world-map], .bt-inspect, ...`
- `src/ui/PinCards.jsx:158` P `You reached the {…} pin. Remove it?`
- `src/ui/PinCards.jsx:158` P `Remove the {…} pin?`
- `src/ui/PinCards.jsx:167` P? `Keep the pin`
- `src/ui/PinCards.jsx:171` P `Remove`
- `src/ui/PinCards.jsx:172` P `Keep`
- `src/ui/PinCards.jsx:172` P `Cancel`
- `src/ui/PinCards.jsx:185` P `Replace which pin?`
- `src/ui/PinCards.jsx:189` T `Replace which pin?`
- `src/ui/PinCards.jsx:190` P `Cancel`
- `src/ui/PinCards.jsx:199` P `Cancel`

### PlayerListPanel (2)

- `src/ui/panels/PlayerListPanel.jsx:41` P? `No other players nearby`
- `src/ui/panels/PlayerListPanel.jsx:72` P? `Hemi Bro`

### PlayerPaint (3)

- `src/ui/panels/PlayerPaint.jsx:181` P `tattoo`
- `src/ui/panels/PlayerPaint.jsx:205` P `tattoo`
- `src/ui/panels/PlayerPaint.jsx:340` P `A`

### QuestCard (1)

- `src/ui/QuestCard.jsx:103` P `Talk to`

### QuestCoach (45)

- `src/ui/mobile/QuestCoach.jsx:561` P? `Drag to move.`
- `src/ui/mobile/QuestCoach.jsx:562` P? `Hold to attack the nearest enemy.`
- `src/ui/mobile/QuestCoach.jsx:563` P? `A quick swipe on the Attack button.`
- `src/ui/mobile/QuestCoach.jsx:597` P `Your bag, your gear and your stats live down here. Tap the handle.`
- `src/ui/mobile/QuestCoach.jsx:598` P? `[data-land-fold], [data-desk-foldstrip]`
- `src/ui/mobile/QuestCoach.jsx:607` P `Your bag, your gear and your stats live in here. Tap the arrow.`
- `src/ui/mobile/QuestCoach.jsx:609` P `Your dashboard`
- `src/ui/mobile/QuestCoach.jsx:653` P `Move`
- `src/ui/mobile/QuestCoach.jsx:672` P `He has your first quest.`
- `src/ui/mobile/QuestCoach.jsx:676` P? `[data-joyzone], canvas`
- `src/ui/mobile/QuestCoach.jsx:678` P `Talk to Mayor Bro`
- `src/ui/mobile/QuestCoach.jsx:699` P `Tap each glowing item, then Equip.`
- `src/ui/mobile/QuestCoach.jsx:712` P `Open your dashboard and equip your gear.`
- `src/ui/mobile/QuestCoach.jsx:713` P? `[data-land-fold], [data-desk-foldstrip]`
- `src/ui/mobile/QuestCoach.jsx:714` P `Open your dashboard and equip your gear.`
- `src/ui/mobile/QuestCoach.jsx:716` P `Gear up`
- `src/ui/mobile/QuestCoach.jsx:740` P `Your map. The gold star is where your quest leads.`
- `src/ui/mobile/QuestCoach.jsx:755` P `Your map`
- `src/ui/mobile/QuestCoach.jsx:769` P `Your quest, and how far along you are.`
- `src/ui/mobile/QuestCoach.jsx:770` P `Your quest`
- `src/ui/mobile/QuestCoach.jsx:804` P `Mayor Bro paid you in gear. Tap the handle to find it.`
- `src/ui/mobile/QuestCoach.jsx:805` P? `[data-land-fold], [data-desk-foldstrip]`
- `src/ui/mobile/QuestCoach.jsx:806` P `Mayor Bro paid you in gear. Open the dashboard to find it.`
- `src/ui/mobile/QuestCoach.jsx:808` P `Mayor Bro paid you in gear. Tap Dashboard to find it.`
- `src/ui/mobile/QuestCoach.jsx:810` P `Your reward`
- `src/ui/mobile/QuestCoach.jsx:832` P `Equip the bow and the staff too.`
- `src/ui/mobile/QuestCoach.jsx:836` P `Open your dashboard — equip the bow and the staff.`
- `src/ui/mobile/QuestCoach.jsx:837` P? `[data-land-fold], [data-desk-foldstrip]`
- `src/ui/mobile/QuestCoach.jsx:838` P `Open your dashboard — equip the bow and the staff.`
- `src/ui/mobile/QuestCoach.jsx:840` P `Three weapons`
- `src/ui/mobile/QuestCoach.jsx:862` P `Double-tap to cycle. Use whichever you like best.`
- `src/ui/mobile/QuestCoach.jsx:863` P `Swap weapons`
- `src/ui/mobile/QuestCoach.jsx:959` P `With the bow or staff out, tap the Block button to raise your shield.`
- `src/ui/mobile/QuestCoach.jsx:960` P `Guard with the bow`
- `src/ui/mobile/QuestCoach.jsx:996` P `Attack`
- `src/ui/mobile/QuestCoach.jsx:1008` P `Special attack`
- `src/ui/mobile/QuestCoach.jsx:1063` P? `[data-prog3-band="lane"] [data-prog3-lane]`
- `src/ui/mobile/QuestCoach.jsx:1071` P? `[data-land-fold], [data-desk-foldstrip]`
- `src/ui/mobile/QuestCoach.jsx:1074` P `Level up!`
- `src/ui/mobile/QuestCoach.jsx:1103` P `Everyone here is a real player. Tap yourself to say something.`
- `src/ui/mobile/QuestCoach.jsx:1134` P `This is a live server`
- `src/ui/mobile/QuestCoach.jsx:1149` P `Your Login Key is the ONLY way back to this character. Open it and save it somewhere.`
- `src/ui/mobile/QuestCoach.jsx:1152` P `More > Account. Your Login Key is the only way back to this character — save it somewhere.`
- `src/ui/mobile/QuestCoach.jsx:1153` P `Save your Login Key`
- `src/ui/mobile/QuestCoach.jsx:2235` P? `Dismiss tip`

### QuestDetailPanel (1)

- `src/ui/mobile/dash/QuestDetailPanel.jsx:79` T `★ Tracked — tap to untrack`

### QuestJournalPage (7)

- `src/ui/mobile/dash/QuestJournalPage.jsx:169` P `now`
- `src/ui/mobile/dash/QuestJournalPage.jsx:276` P `Show on map`
- `src/ui/mobile/dash/QuestJournalPage.jsx:297` P `where`
- `src/ui/mobile/dash/QuestJournalPage.jsx:313` P `who`
- `src/ui/mobile/dash/QuestJournalPage.jsx:348` P `given`
- `src/ui/mobile/dash/QuestJournalPage.jsx:357` P `reward`
- `src/ui/mobile/dash/QuestJournalPage.jsx:379` P `next`

### QuestOfferPanel (1)

- `src/ui/panels/QuestOfferPanel.jsx:81` P? `[data-qw-gold] img`

### QuestPages (2)

- `src/ui/mobile/dash/QuestPages.jsx:115` P `XP`
- `src/ui/mobile/dash/QuestPages.jsx:337` P `Show on map`

### QuickEatButton (1)

- `src/ui/panels/QuickEatButton.jsx:119` P `food`

### RevealOverlay (2)

- `src/ui/reveal/RevealOverlay.jsx:52` P? `A rare find!`
- `src/ui/reveal/RevealOverlay.jsx:218` P? `A rare find!`

### RideButton (2)

- `src/ui/panels/RideButton.jsx:164` P? `Get off the skateboard`
- `src/ui/panels/RideButton.jsx:164` P? `Ride the skateboard`

### RoomFullScreen (14)

- `src/ui/RoomFullScreen.js:95` P? `Looking for a spot again in`
- `src/ui/RoomFullScreen.js:96` P? `Looking for a spot…`
- `src/ui/RoomFullScreen.js:99` P? `Checked once`
- `src/ui/RoomFullScreen.js:120` P? `<div class="bt-rf-card">`
- `src/ui/RoomFullScreen.js:121` P? `<div class="bt-rf-ring"></div>`
- `src/ui/RoomFullScreen.js:122` P? `<h2>BroTown is full right now</h2>`
- `src/ui/RoomFullScreen.js:123` P? `<div class="bt-rf-count"></div>`
- `src/ui/RoomFullScreen.js:124` P? `<p>Every spot in the world is taken. Keep this open — you will drop`
- `src/ui/RoomFullScreen.js:125` P? `straight in the moment someone leaves.</p>`
- `src/ui/RoomFullScreen.js:126` P? `<div class="bt-rf-next"></div>`
- `src/ui/RoomFullScreen.js:127` P? `<div class="bt-rf-tries"></div>`
- `src/ui/RoomFullScreen.js:128` P? `<button type="button">Try now</button>`
- `src/ui/RoomFullScreen.js:149` P? `bros inside`
- `src/ui/RoomFullScreen.js:150` P? `World at capacity`

### SettingsPanel (4)

- `src/ui/mobile/dash/SettingsPanel.jsx:293` P `Debug overlay (D)`
- `src/ui/mobile/dash/SettingsPanel.jsx:398` P `Tap the floating`
- `src/ui/mobile/dash/SettingsPanel.jsx:398` P `D`
- `src/ui/mobile/dash/SettingsPanel.jsx:398` P `button for the full devtools console.`

### ShieldButton (1)

- `src/ui/panels/ShieldButton.jsx:891` P? `Shield up`

### SilenceButtons (12)

- `src/ui/panels/SilenceButtons.jsx:30` P? `silence anyone`
- `src/ui/panels/SilenceButtons.jsx:35` P `chat report:`
- `src/ui/panels/SilenceButtons.jsx:35` P `other`
- `src/ui/panels/SilenceButtons.jsx:39` P `The silence did not go through`
- `src/ui/panels/SilenceButtons.jsx:42` P `Lift`
- `src/ui/panels/SilenceButtons.jsx:42` P `'s silence? Tap Lift again to do it.`
- `src/ui/panels/SilenceButtons.jsx:48` P `Lifting did not go through`
- `src/ui/panels/SilenceButtons.jsx:56` P `Silenced`
- `src/ui/panels/SilenceButtons.jsx:59` P `Sure? Lift`
- `src/ui/panels/SilenceButtons.jsx:59` P `Lift`
- `src/ui/panels/SilenceButtons.jsx:64` P `Silence:`
- `src/ui/panels/SilenceButtons.jsx:68` P `Sure?`

### SkillTiles (4)

- `src/ui/mobile/dash/SkillTiles.jsx:68` P `Lv`
- `src/ui/mobile/dash/SkillTiles.jsx:79` P `Fully levelled`
- `src/ui/mobile/dash/SkillTiles.jsx:134` P `Lv`
- `src/ui/mobile/dash/SkillTiles.jsx:142` P `Fully levelled`

### SmithyPanel (1)

- `src/ui/panels/buildings/SmithyPanel.jsx:99` P `Forge`

### SocialPanel (3)

- `src/ui/mobile/dash/SocialPanel.jsx:75` P? `bt-chisel bt-chisel--chip`
- `src/ui/mobile/dash/SocialPanel.jsx:234` T `Tap another player anywhere in BroTown to view their profile and add them as a friend.`
- `src/ui/mobile/dash/SocialPanel.jsx:349` T `Tap another player anywhere in BroTown to view their profile and add them as a friend.`

### SpecialButton (1)

- `src/ui/panels/SpecialButton.jsx:324` P `special`

### SpendPointConfirm (6)

- `src/ui/mobile/dash/SpendPointConfirm.jsx:174` P `Apply 1 point?`
- `src/ui/mobile/dash/SpendPointConfirm.jsx:186` P `Now:`
- `src/ui/mobile/dash/SpendPointConfirm.jsx:188` P `After:`
- `src/ui/mobile/dash/SpendPointConfirm.jsx:193` P `Points keep their number forever — bigger monsters, bigger points.`
- `src/ui/mobile/dash/SpendPointConfirm.jsx:205` P `Confirm`
- `src/ui/mobile/dash/SpendPointConfirm.jsx:216` P `Cancel`

### SprintButton (3)

- `src/ui/panels/SprintButton.jsx:73` P? `Not enough energy!`
- `src/ui/panels/SprintButton.jsx:273` P? `Sprint on`
- `src/ui/panels/SprintButton.jsx:305` P `boot`

### StatScreenPanel (7)

- `src/ui/panels/StatScreenPanel.jsx:288` P? `Combat Skills`
- `src/ui/panels/StatScreenPanel.jsx:310` P? `Skills grow with use. Points are assigned per skill — see Build.`
- `src/ui/panels/StatScreenPanel.jsx:397` P `Locked — XP that would train`
- `src/ui/panels/StatScreenPanel.jsx:397` P `is burned. Click to unlock.`
- `src/ui/panels/StatScreenPanel.jsx:397` P `Lock`
- `src/ui/panels/StatScreenPanel.jsx:397` P `at`
- `src/ui/panels/StatScreenPanel.jsx:397` P `to commit to a pure build. XP that would train it will be burned.`

### ThreatIncomingPanel (7)

- `src/ui/panels/ThreatIncomingPanel.jsx:65` P? `KILL THREAT`
- `src/ui/panels/ThreatIncomingPanel.jsx:75` P? `) threatens to kill you!`
- `src/ui/panels/ThreatIncomingPanel.jsx:81` P? `Anyone can attack them without penalty (red 💀 above their head).`
- `src/ui/panels/ThreatIncomingPanel.jsx:149` P? `Threat ignored. They can still be attacked.`
- `src/ui/panels/ThreatIncomingPanel.jsx:176` P? `Guards dispatched!`
- `src/ui/panels/ThreatIncomingPanel.jsx:179` P? `Call Guards`
- `src/ui/panels/ThreatIncomingPanel.jsx:185` P? `If you ignore, their skull turns white — anyone can attack them freely but you keep equ...`

### TownBoard (2)

- `src/ui/panels/buildings/TownBoard.jsx:132` P? `to take`
- `src/ui/panels/buildings/TownBoard.jsx:225` T `Everything to do in the world. Tap one to read about it and pin it on your map.`

### TownBoardPage (12)

- `src/ui/panels/buildings/TownBoardPage.jsx:30` P `Open Quests`
- `src/ui/panels/buildings/TownBoardPage.jsx:33` P `Ride now`
- `src/ui/panels/buildings/TownBoardPage.jsx:57` P `‹ All things to do`
- `src/ui/panels/buildings/TownBoardPage.jsx:71` P `Where:`
- `src/ui/panels/buildings/TownBoardPage.jsx:78` P `Red pin`
- `src/ui/panels/buildings/TownBoardPage.jsx:78` P `Blue pin`
- `src/ui/panels/buildings/TownBoardPage.jsx:84` P `Lift`
- `src/ui/panels/buildings/TownBoardPage.jsx:90` P `A pin shows on your minimap and the world map, and stays until you lift it.`
- `src/ui/panels/buildings/TownBoardPage.jsx:106` P `Leaderboard`
- `src/ui/panels/buildings/TownBoardPage.jsx:109` P `World map`
- `src/ui/panels/buildings/TownBoardPage.jsx:113` P `Codex`
- `src/ui/panels/buildings/TownBoardPage.jsx:116` P `Journey`

### TradePanel (4)

- `src/ui/panels/TradePanel.jsx:94` P? `Trade with`
- `src/ui/panels/TradePanel.jsx:100` P? `Select items to offer:`
- `src/ui/panels/TradePanel.jsx:281` P? `Trade sent!`
- `src/ui/panels/TradePanel.jsx:285` P? `Send Trade Offer`

### TradeWindowPanel (1)

- `src/ui/panels/TradeWindowPanel.jsx:991` P? `bt-t2-lane bt-t2-lane--theirs`

### TrapsTab (8)

- `src/ui/panels/buildings/TrapsTab.jsx:22` P? `Pine Log`
- `src/ui/panels/buildings/TrapsTab.jsx:22` P? `Cedar Wood`
- `src/ui/panels/buildings/TrapsTab.jsx:22` P? `Maple Wood`
- `src/ui/panels/buildings/TrapsTab.jsx:72` P `Box Trap`
- `src/ui/panels/buildings/TrapsTab.jsx:73` P `One log of any kind each. A trap is used every time it springs.`
- `src/ui/panels/buildings/TrapsTab.jsx:78` P `You have no logs. Chop any tree out in the lands, then come back.`
- `src/ui/panels/buildings/TrapsTab.jsx:94` P `XP each`
- `src/ui/panels/buildings/TrapsTab.jsx:98` P `Make`

### UpdateBanner (2)

- `src/ui/panels/UpdateBanner.jsx:67` P? `↻ New version available`
- `src/ui/panels/UpdateBanner.jsx:70` P? `This tab is running an older build. Reload to join everyone else.`

### UsageMeter (17)

- `src/ui/panels/UsageMeter.jsx:27` P `The usage meter is switched OFF (the usagemeter flag): nothing is being counted.`
- `src/ui/panels/UsageMeter.jsx:27` P `Usage: counted in the server's memory.`
- `src/ui/panels/UsageMeter.jsx:41` P `Rows written`
- `src/ui/panels/UsageMeter.jsx:42` P? `Most written`
- `src/ui/panels/UsageMeter.jsx:43` P `Rows read`
- `src/ui/panels/UsageMeter.jsx:44` P? `Most read`
- `src/ui/panels/UsageMeter.jsx:45` P `Messages sent`
- `src/ui/panels/UsageMeter.jsx:46` P? `Most sent`
- `src/ui/panels/UsageMeter.jsx:51` P `Usage (the server's rows and messages)`
- `src/ui/panels/UsageMeter.jsx:53` P `Rows the server wrote and read, and messages it sent, today (UTC) and since it last sta...`
- `src/ui/panels/UsageMeter.jsx:56` P `Reload usage`
- `src/ui/panels/UsageMeter.jsx:56` P `Show usage`
- `src/ui/panels/UsageMeter.jsx:64` P `The truth is Cloudflare's own page: Workers & Pages, brotown-server, Metrics; and Billing.`
- `src/ui/panels/UsageMeter.jsx:67` P? `Since the server started`
- `src/ui/panels/UsageMeter.jsx:68` P `The six cost switches, today`
- `src/ui/panels/UsageMeter.jsx:73` P `read`
- `src/ui/panels/UsageMeter.jsx:79` P `Any of them turns off in Live flags, Set a switch: its name, then off.`

### VendorPanel (12)

- `src/ui/panels/buildings/VendorPanel.jsx:155` P `Cooked Minnow`
- `src/ui/panels/buildings/VendorPanel.jsx:155` P `Heals 23 HP (pre-cooked)`
- `src/ui/panels/buildings/VendorPanel.jsx:156` P `Stamina Tonic`
- `src/ui/panels/buildings/VendorPanel.jsx:156` P `Restore 60 Stamina`
- `src/ui/panels/buildings/VendorPanel.jsx:157` P `Mana Draught`
- `src/ui/panels/buildings/VendorPanel.jsx:157` P `Cast specials nonstop for 3 min`
- `src/ui/panels/buildings/VendorPanel.jsx:158` P `Swift Draught`
- `src/ui/panels/buildings/VendorPanel.jsx:158` P `1.5x run speed for 3 min`
- `src/ui/panels/buildings/VendorPanel.jsx:159` P `Fury Tonic`
- `src/ui/panels/buildings/VendorPanel.jsx:159` P `Double damage for 3 min`
- `src/ui/panels/buildings/VendorPanel.jsx:161` P `Zoom Juice`
- `src/ui/panels/buildings/VendorPanel.jsx:161` P `25% faster for 5 min`

### WarBanner (4)

- `src/ui/panels/WarBanner.jsx:102` P? `Go to`
- `src/ui/panels/WarBanner.jsx:237` P? `total kills ·`
- `src/ui/panels/WarBanner.jsx:257` P? `TOP KILLERS`
- `src/ui/panels/WarBanner.jsx:276` P? `Closing in a few seconds...`

### WeaponBar (3)

- `src/ui/mobile/dash/WeaponBar.jsx:41` P `No {…}`
- `src/ui/mobile/dash/WeaponBar.jsx:51` P `{…} ({…}) — {…} Lv {…}`
- `src/ui/mobile/dash/WeaponBar.jsx:81` P `LV`

### WeaponPill (7)

- `src/ui/panels/WeaponPill.jsx:96` P `Fists`
- `src/ui/panels/WeaponPill.jsx:201` P `No`
- `src/ui/panels/WeaponPill.jsx:201` P `equipped`
- `src/ui/panels/WeaponPill.jsx:294` P `No`
- `src/ui/panels/WeaponPill.jsx:294` P `yet`
- `src/ui/panels/WeaponPill.jsx:295` P `Weapon in hand:`
- `src/ui/panels/WeaponPill.jsx:295` P `Switch to`

### WorldChatFeed (3)

- `src/ui/mobile/WorldChatFeed.jsx:174` P? `{…}/{…} golden tickets left`
- `src/ui/mobile/WorldChatFeed.jsx:545` P `World Chat`
- `src/ui/mobile/WorldChatFeed.jsx:575` T `Tap to close`

### WorldMapOverlay (3)

- `src/ui/WorldMapOverlay.jsx:554` P `N`
- `src/ui/WorldMapOverlay.jsx:581` T `Tap the map to drop a pin`
- `src/ui/WorldMapOverlay.jsx:599` P `party`

### XpFlyOverlay (2)

- `src/ui/XpFlyOverlay.jsx:410` P `Lv`
- `src/ui/XpFlyOverlay.jsx:416` P `MAX`

### XpTrack (1)

- `src/ui/mobile/XpTrack.jsx:48` P? `transform {…}ms {…} {…}ms`

### ZoneHeader (1)

- `src/ui/mobile/ZoneHeader.jsx:165` P `AP`

### bagFilterBus (4)

- `src/ui/mobile/dash/bagFilterBus.js:48` P `Weapon`
- `src/ui/mobile/dash/bagFilterBus.js:49` P `Armor`
- `src/ui/mobile/dash/bagFilterBus.js:56` P `Consumable`
- `src/ui/mobile/dash/bagFilterBus.js:57` P `Crafting`

### broStats (13)

- `src/ui/mobile/sheet/broStats.js:50` P `Sword`
- `src/ui/mobile/sheet/broStats.js:51` P `Bow`
- `src/ui/mobile/sheet/broStats.js:52` P `Staff`
- `src/ui/mobile/sheet/broStats.js:61` P? `ATTACK SPEED`
- `src/ui/mobile/sheet/broStats.js:61` P? `Atk Speed`
- `src/ui/mobile/sheet/broStats.js:63` P? `CRIT CHANCE`
- `src/ui/mobile/sheet/broStats.js:64` P? `CRIT DAMAGE`
- `src/ui/mobile/sheet/broStats.js:64` P? `Crit Dmg`
- `src/ui/mobile/sheet/broStats.js:65` P? `SPECIAL DAMAGE`
- `src/ui/mobile/sheet/broStats.js:66` P? `ELEMENT POWER`
- `src/ui/mobile/sheet/broStats.js:70` P? `Elem Resist`
- `src/ui/mobile/sheet/broStats.js:71` P? `MOVE SPEED`
- `src/ui/mobile/sheet/broStats.js:71` P? `Move Speed`

### controlSkin (20)

- `src/ui/panels/controlSkin.jsx:410` P? `M50 34 L50 43`
- `src/ui/panels/controlSkin.jsx:410` P? `M66 50 L57 50`
- `src/ui/panels/controlSkin.jsx:410` P? `M50 66 L50 57`
- `src/ui/panels/controlSkin.jsx:410` P? `M34 50 L43 50`
- `src/ui/panels/controlSkin.jsx:523` P? `M27 60 L50 36 L73 60`
- `src/ui/panels/controlSkin.jsx:523` P? `M31 78 L69 78`
- `src/ui/panels/controlSkin.jsx:525` P? `M50 72 L50 28`
- `src/ui/panels/controlSkin.jsx:525` P? `M32 45 L50 27 L68 45`
- `src/ui/panels/controlSkin.jsx:525` P? `M31 82 L69 82`
- `src/ui/panels/controlSkin.jsx:527` P? `M29 50 L50 30 L71 50`
- `src/ui/panels/controlSkin.jsx:527` P? `M29 68 L50 48 L71 68`
- `src/ui/panels/controlSkin.jsx:527` P? `M31 83 L69 83`
- `src/ui/panels/controlSkin.jsx:529` P? `M24 70 Q50 6 74 62`
- `src/ui/panels/controlSkin.jsx:529` P? `M62 60 L75 64 L79 50`
- `src/ui/panels/controlSkin.jsx:529` P? `M18 80 L82 80`
- `src/ui/panels/controlSkin.jsx:537` P? `M10 88 Q16 60 38 54`
- `src/ui/panels/controlSkin.jsx:538` P? `M58 31 L50 54`
- `src/ui/panels/controlSkin.jsx:538` P? `M42 24 L57 35 L75 36`
- `src/ui/panels/controlSkin.jsx:538` P? `M50 54 L36 58 L28 71`
- `src/ui/panels/controlSkin.jsx:538` P? `M50 54 L64 63 L60 79`

### data: abilities (9)

- `src/data/abilities.js:156` T `Bash`
- `src/data/abilities.js:156` T `Stun + knock back the closest enemy`
- `src/data/abilities.js:157` T `Whirl`
- `src/data/abilities.js:157` T `Hit everything around you`
- `src/data/abilities.js:228` T `Ability`
- `src/data/abilities.js:230` T? `unlocks at level`
- `src/data/abilities.js:232` T? `Not enough energy!`
- `src/data/abilities.js:233` T? `No shield equipped!`
- `src/data/abilities.js:234` T? `No weapon equipped!`

### data: aboutPanel (28)

- `src/data/say/aboutPanel.js:5` T? `An early demo of an online action RPG. Everything you do is saved on our server, so the...`
- `src/data/say/aboutPanel.js:7` T? `What we keep, and why`
- `src/data/say/aboutPanel.js:8` T? `Your character`
- `src/data/say/aboutPanel.js:9` T? `{what} — its name, look, level, items and gold, so you can come back to it.`
- `src/data/say/aboutPanel.js:10` T? `A scrambled copy of your Login Key`
- `src/data/say/aboutPanel.js:11` T? `{what} — so only you can open your character. We never store the key itself.`
- `src/data/say/aboutPanel.js:12` T? `A device id`
- `src/data/say/aboutPanel.js:13` T? `{what} — a random id and a rough summary of your browser and screen, to spot cheating a...`
- `src/data/say/aboutPanel.js:14` T? `Crash reports`
- `src/data/say/aboutPanel.js:15` T? `{what} — the error message and your browser type when the game breaks, so we can fix it.`
- `src/data/say/aboutPanel.js:16` T? `Feedback you send`
- `src/data/say/aboutPanel.js:17` T? `{what} — it appears on the public Feedback board with your character's name.`
- `src/data/say/aboutPanel.js:18` T? `Reported chat`
- `src/data/say/aboutPanel.js:19` T? `{what} — if someone reports a chat message, we keep that message so it can be reviewed.`
- `src/data/say/aboutPanel.js:20` T? `A wallet address`
- `src/data/say/aboutPanel.js:21` T? `{what} — only if you choose to link one to verify a Hemi Bro.`
- `src/data/say/aboutPanel.js:22` T? `No ads, no selling your data, no email or real name required. Chat is seen by other pla...`
- `src/data/say/aboutPanel.js:24` T? `Smoothness reports`
- `src/data/say/aboutPanel.js:25` T? `{what} — every few minutes while you play: how smoothly the game ran (frame times, what...`
- `src/data/say/aboutPanel.js:26` T? `On: turn off`
- `src/data/say/aboutPanel.js:27` T? `Off: turn on`
- `src/data/say/aboutPanel.js:30` T? `Be decent in chat. Harassment, hate and spam get muted or removed.`
- `src/data/say/aboutPanel.js:31` T? `No cheating, bots, or exploiting bugs. Report bugs instead.`
- `src/data/say/aboutPanel.js:32` T? `Keep your Login Key private — anyone with it can play your character.`
- `src/data/say/aboutPanel.js:33` T? `BroTown is meant for players aged 13 and over.`
- `src/data/say/aboutPanel.js:34` T? `The demo is provided as-is, and characters or items may be changed or reset while it is...`
- `src/data/say/aboutPanel.js:37` T? `A Hemi Bros game. Most art and all music were made for this game with AI tools (OpenAI ...`
- `src/data/say/aboutPanel.js:39` T? `Questions or problems? Send feedback`

### data: accountKey (7)

- `src/data/say/accountKey.js:4` T? `Guest session — this tab has no Login Key.`
- `src/data/say/accountKey.js:5` T? `Play in a normal tab to get a character that can be continued on other devices.`
- `src/data/say/accountKey.js:7` T? `Your Login Key`
- `src/data/say/accountKey.js:9` T? `Copy Login Key`
- `src/data/say/accountKey.js:12` T? `This Login Key is the {only} way to get your character back on a new phone or after cle...`
- `src/data/say/accountKey.js:14` T? `This key works on any phone or computer: type its eight words at the start screen's Log...`
- `src/data/say/accountKey.js:15` T? `On a new phone or computer, the game's owner also has to let it in: the screen there gi...`

### data: accountLogin (16)

- `src/data/say/accountLogin.js:4` T? `No character found with that key — check for typos.`
- `src/data/say/accountLogin.js:5` T? `That key doesn't match. Check for typos.`
- `src/data/say/accountLogin.js:6` T? `Too many attempts — wait a minute and try again.`
- `src/data/say/accountLogin.js:7` T? `Too many attempts — wait a minute and try again.`
- `src/data/say/accountLogin.js:8` T? `Login isn't available right now — try again later.`
- `src/data/say/accountLogin.js:9` T? `That doesn’t look like a Login Key.`
- `src/data/say/accountLogin.js:10` T? `You're already playing as this character.`
- `src/data/say/accountLogin.js:11` T? `This character has a new Login Key now. Use the new one: it’s on the Account card of a ...`
- `src/data/say/accountLogin.js:13` T? `Found it!`
- `src/data/say/accountLogin.js:14` T? `Continue as your {level} character{created}?`
- `src/data/say/accountLogin.js:15` T? `Lv {lvl}`
- `src/data/say/accountLogin.js:16` T? `(created {date})`
- `src/data/say/accountLogin.js:17` T? `The character currently on this device will be signed out. Its Login Key is {key} — sav...`
- `src/data/say/accountLogin.js:22` T? `Continue a character from another device`
- `src/data/say/accountLogin.js:23` T? `type your Login Key…`
- `src/data/say/accountLogin.js:26` T? `Log in`

### data: accountPanel (9)

- `src/data/say/accountPanel.js:4` T? `Switch bro, or log out`
- `src/data/say/accountPanel.js:5` T? `Log out to the character screen`
- `src/data/say/accountPanel.js:6` T? `Switch character`
- `src/data/say/accountPanel.js:7` T? `Log out`
- `src/data/say/accountPanel.js:9` T? `Switch bro?`
- `src/data/say/accountPanel.js:10` T? `Leave the world?`
- `src/data/say/accountPanel.js:11` T? `You’ll go to your list of bros. This one is saved.`
- `src/data/say/accountPanel.js:14` T? `Switch Bro`
- `src/data/say/accountPanel.js:15` T? `Log Out`

### data: aceFlip (29)

- `src/data/say/aceFlip.js:4` T? `YOU WON!`
- `src/data/say/aceFlip.js:5` T? `YOU LOST!`
- `src/data/say/aceFlip.js:6` T? `+{amount} gold`
- `src/data/say/aceFlip.js:7` T? `−{amount} gold`
- `src/data/say/aceFlip.js:8` T? `+{count} items`
- `src/data/say/aceFlip.js:9` T? `−{count} items`
- `src/data/say/aceFlip.js:11` T? `Ace shakes his head. "You don't have enough gold for that bet, friend. Try a smaller st...`
- `src/data/say/aceFlip.js:12` T? `Ace puts his coin away. "No coin flips right now, friend. Come back later."`
- `src/data/say/aceFlip.js:13` T? `Ace shakes his head. "Gold only today, friend. Keep your items in your Bag."`
- `src/data/say/aceFlip.js:22` T? `My record book: the biggest win and the biggest loss on my coin, one line for each player.`
- `src/data/say/aceFlip.js:23` T? `Biggest wins`
- `src/data/say/aceFlip.js:24` T? `Biggest losses`
- `src/data/say/aceFlip.js:25` T? `Nothing in the book yet. Be the first name in it. I'm not saying which column.`
- `src/data/say/aceFlip.js:28` T? `Bet items from your Bag. If you win, you get double. If you lose, I keep them. I win {a...`
- `src/data/say/aceFlip.js:29` T? `have {held}`
- `src/data/say/aceFlip.js:31` T? `Your Bag is empty. Go find some loot first, then come back.`
- `src/data/say/aceFlip.js:32` T? `Staked: {count} item`
- `src/data/say/aceFlip.js:32` T? `Staked: {count} items`
- `src/data/say/aceFlip.js:35` T? `Double or nothing · {total}`
- `src/data/say/aceFlip.js:36` T? `Stake something`
- `src/data/say/aceFlip.js:38` T? `I'm Ace, and I flip coins for gold. Pick your stake. If you win, I pay you {mult} times...`
- `src/data/say/aceFlip.js:39` T? `Your stake`
- `src/data/say/aceFlip.js:40` T? `Bag {gold}`
- `src/data/say/aceFlip.js:41` T? `Max {stake}`
- `src/data/say/aceFlip.js:42` T? `Win ({pct}%)`
- `src/data/say/aceFlip.js:43` T? `Lose ({pct}%)`
- `src/data/say/aceFlip.js:44` T? `You need {gold} in the bag to cover his smallest bet.`
- `src/data/say/aceFlip.js:45` T? `Pick a stake`
- `src/data/say/aceFlip.js:46` T? `Flip for {risk}g`

### data: achievements (92)

- `src/data/achievements.js:27` T `Common`
- `src/data/achievements.js:28` T `Rare`
- `src/data/achievements.js:29` T `Arena`
- `src/data/achievements.js:68` T `First Blood`
- `src/data/achievements.js:68` T? `Defeat your first monster`
- `src/data/achievements.js:68` T? `Defeat your first monster.`
- `src/data/achievements.js:69` T `Blooded`
- `src/data/achievements.js:69` T? `Melee, Bow or Magic to Lv 10`
- `src/data/achievements.js:69` T? `Raise Melee, Bow or Magic to level 10.`
- `src/data/achievements.js:70` T `Into the Dark`
- `src/data/achievements.js:70` T? `Clear a dungeon`
- `src/data/achievements.js:70` T? `Clear any of the four dungeons: the Goo Grotto is the nearest.`
- `src/data/achievements.js:71` T `Gotcha`
- `src/data/achievements.js:71` T? `Catch a pet in a trap`
- `src/data/achievements.js:71` T? `Catch your first pet in a trap.`
- `src/data/achievements.js:72` T `Farmhand`
- `src/data/achievements.js:72` T? `Deliver a Feed & Seed order`
- `src/data/achievements.js:72` T? `Deliver an order at the Feed & Seed.`
- `src/data/achievements.js:73` T `Duelist`
- `src/data/achievements.js:73` T? `Win a duel`
- `src/data/achievements.js:73` T? `Win a duel.`
- `src/data/achievements.js:74` T `Outlaw`
- `src/data/achievements.js:74` T? `Defeat a player in No man's land`
- `src/data/achievements.js:74` T? `Defeat a player in No man's land.`
- `src/data/achievements.js:75` T `Storyteller`
- `src/data/achievements.js:75` T? `Finish every story quest`
- `src/data/achievements.js:75` T? `Finish every story quest.`
- `src/data/achievements.js:76` T `Know Thy Enemy`
- `src/data/achievements.js:76` T? `Defeat all 9 kinds of monster`
- `src/data/achievements.js:76` T? `Defeat all nine kinds of monster.`
- `src/data/achievements.js:77` T `Elder Hunter`
- `src/data/achievements.js:77` T? `All 9 kinds past Lv 20`
- `src/data/achievements.js:77` T? `Defeat all nine kinds past level 20.`
- `src/data/achievements.js:78` T `Delver`
- `src/data/achievements.js:78` T? `Clear all 4 dungeons`
- `src/data/achievements.js:78` T? `Clear the Goo Grotto, the Great Cave, the Foundry Dome and the Buried City.`
- `src/data/achievements.js:79` T `Veteran`
- `src/data/achievements.js:79` T? `Melee, Bow or Magic to Lv 50`
- `src/data/achievements.js:79` T? `Raise Melee, Bow or Magic to level 50.`
- `src/data/achievements.js:80` T `Natural One`
- `src/data/achievements.js:80` T? `A kill roll of exactly 1`
- `src/data/achievements.js:80` T? `Land a killing blow whose kill roll is 1 (1 in 10,000).`
- `src/data/achievements.js:81` T `Iron Great Sword`
- `src/data/achievements.js:81` T? `An Iron Great Sword off a kill`
- `src/data/achievements.js:81` T? `Find an Iron Great Sword on a kill (1 in 500).`
- `src/data/achievements.js:82` T `Golden Catch`
- `src/data/achievements.js:82` T? `Catch a golden pet`
- `src/data/achievements.js:82` T? `Catch a golden pet.`
- `src/data/achievements.js:83` T `Elite`
- `src/data/achievements.js:83` T? `Find or forge Elite gear`
- `src/data/achievements.js:83` T? `Find or forge an Elite piece of gear.`
- `src/data/achievements.js:84` T `Gladiator`
- `src/data/achievements.js:84` T? `Win the Gladiator Arena`
- `src/data/achievements.js:84` T? `Win the Gladiator Arena.`
- `src/data/achievements.js:85` T `Perfectly Tempered`
- `src/data/achievements.js:85` T? `Harden a weapon to H5`
- `src/data/achievements.js:85` T? `Harden a weapon all the way to H5.`
- `src/data/achievements.js:86` T `Golden Giant`
- `src/data/achievements.js:86` T? `A golden pet that's big too`
- `src/data/achievements.js:86` T? `Catch a golden pet that is a big one too.`
- `src/data/achievements.js:87` T `Elite Iron`
- `src/data/achievements.js:87` T? `An Elite Iron Great Sword off a kill`
- `src/data/achievements.js:87` T? `Find an Elite Iron Great Sword on a kill.`
- `src/data/achievements.js:88` T `Breaking the House`
- `src/data/achievements.js:88` T? `Double the free spin to the limit`
- `src/data/achievements.js:88` T? `Double the free spin's pot all the way to the house limit.`
- `src/data/achievements.js:89` T `Centurion`
- `src/data/achievements.js:89` T? `Melee, Bow or Magic to Lv 100`
- `src/data/achievements.js:89` T? `Raise Melee, Bow or Magic to level 100.`
- `src/data/achievements.js:90` T `Godly`
- `src/data/achievements.js:90` T? `Find or forge Godly gear`
- `src/data/achievements.js:90` T? `Find or forge a Godly piece of gear.`
- `src/data/achievements.js:95` T `Albino`
- `src/data/achievements.js:95` T? `Eat an albino`
- `src/data/achievements.js:95` T? `Eat an albino`
- `src/data/achievements.js:95` T? `caught is albino).`
- `src/data/achievements.js:96` T `Large`
- `src/data/achievements.js:96` T? `Eat a large`
- `src/data/achievements.js:96` T? `Eat a large`
- `src/data/achievements.js:96` T? `(1 in 1,000 caught is large; it heals double).`
- `src/data/say/achievements.js:4` T? `{ap} AP`
- `src/data/say/achievements.js:5` T? `Not earned yet`
- `src/data/say/achievements.js:6` T? `· {count} times`
- `src/data/say/achievements.js:8` T? `Your title`
- `src/data/say/achievements.js:10` T? `Remove title`
- `src/data/say/achievements.js:12` T? `Use as title`
- `src/data/say/achievements.js:13` T? `Title: {name}`
- `src/data/say/achievements.js:14` T? `No title yet: tap one you have`
- `src/data/say/achievements.js:16` T? `Achievements aren't on yet.`
- `src/data/say/achievements.js:17` T? `This server doesn't keep them yet.`
- `src/data/say/achievements.js:18` T? `Achievements can't be read right now.`
- `src/data/say/achievements.js:19` T? `Nothing you have earned is lost: they come back when the server can read them.`

### data: alliancePart (26)

- `src/data/say/alliancePart.js:4` T? `Alliance name`
- `src/data/say/alliancePart.js:6` T? `Alliance tag`
- `src/data/say/alliancePart.js:9` T? `Name your alliance`
- `src/data/say/alliancePart.js:10` T? `You can rename it again in {wait}.`
- `src/data/say/alliancePart.js:11` T? `The name and tag are yours alone, and every member wears the tag. You can change them o...`
- `src/data/say/alliancePart.js:13` T? `War with {tag} {name}`
- `src/data/say/alliancePart.js:14` T? `{left} min left. Kills count in No man's land, under its usual rules. Everyone who figh...`
- `src/data/say/alliancePart.js:15` T? `{sign} · {killer} beat {victim}`
- `src/data/say/alliancePart.js:17` T? `No war right now. Your leader can declare one on another alliance.`
- `src/data/say/alliancePart.js:18` T? `Name your alliance to fight wars.`
- `src/data/say/alliancePart.js:19` T? `Their tag`
- `src/data/say/alliancePart.js:20` T? `Declare war`
- `src/data/say/alliancePart.js:21` T? `Your alliance rests {wait} before its next war.`
- `src/data/say/alliancePart.js:22` T? `A war lasts 30 minutes. Kills count in No man's land under its usual rules. Everyone wh...`
- `src/data/say/alliancePart.js:25` T? `No alliances yet. A party becomes one when 20 of its members are level 5 or more and pl...`
- `src/data/say/alliancePart.js:26` T? `Unnamed alliance`
- `src/data/say/alliancePart.js:27` T? `{active} active · Lv {total}`
- `src/data/say/alliancePart.js:28` T? `Yours: #{rank}, {active} active`
- `src/data/say/alliancePart.js:29` T? `Alliance board`
- `src/data/say/alliancePart.js:32` T? `{active} active`
- `src/data/say/alliancePart.js:33` T? `Members who played in the last 7 days and are level 5 or more count. It stays an allian...`
- `src/data/say/alliancePart.js:34` T? `is resting`
- `src/data/say/alliancePart.js:35` T? `Not an alliance yet`
- `src/data/say/alliancePart.js:36` T? `Your clan is this party now, and its members keep the tag.`
- `src/data/say/alliancePart.js:37` T? `When {at} members have played in the last 7 days and are level 5 or more, your party be...`
- `src/data/say/alliancePart.js:38` T? `A party becomes an alliance when {at} of its members are level 5 or more and played in ...`

### data: bandGrip (2)

- `src/data/say/bandGrip.js:4` T? `Expand dashboard`
- `src/data/say/bandGrip.js:5` T? `Minimize dashboard`

### data: bank (21)

- `src/data/say/bank.js:5` T? `Vault & equipment`
- `src/data/say/bank.js:6` T? `Your vault`
- `src/data/say/bank.js:8` T? `Your gold and what you wear. Nothing can be stored here yet.`
- `src/data/say/bank.js:9` T? `Gold on hand`
- `src/data/say/bank.js:11` T? `Kept when you die, unless a player kills you in No man's land or you die with a red skull.`
- `src/data/say/bank.js:22` T? `{name} x{count}`
- `src/data/say/bank.js:26` T? `{label} amount`
- `src/data/say/bank.js:28` T? `Put in`
- `src/data/say/bank.js:29` T? `Take out`
- `src/data/say/bank.js:31` T? `The vault could not be opened just now. Trying again… What is in it stays safe.`
- `src/data/say/bank.js:32` T? `The vault is closed for now. What is in it stays safe.`
- `src/data/say/bank.js:33` T? `Safe from death: what is in the vault stays here when you die. Materials, food and gold...`
- `src/data/say/bank.js:35` T? `On you`
- `src/data/say/bank.js:36` T? `In the vault`
- `src/data/say/bank.js:40` T? `The vault`
- `src/data/say/bank.js:41` T? `({used} of {slots})`
- `src/data/say/bank.js:42` T? `Nothing in the vault yet.`
- `src/data/say/bank.js:43` T? `Opening the vault…`
- `src/data/say/bank.js:45` T? `Your bag`
- `src/data/say/bank.js:46` T? `Your bag is empty.`
- `src/data/say/bank.js:47` T? `Tools stay in your bag.`

### data: bottomDashboard (7)

- `src/data/say/bottomDashboard.js:16` T? `Life Skills`
- `src/data/say/bottomDashboard.js:22` T? `About & privacy`
- `src/data/say/bottomDashboard.js:43` T? `Back from {title}`
- `src/data/say/bottomDashboard.js:45` T? `Open dashboard`
- `src/data/say/bottomDashboard.js:46` T? `Open dashboard (I)`
- `src/data/say/bottomDashboard.js:48` T? `Minimize dashboard`
- `src/data/say/bottomDashboard.js:49` T? `Expand dashboard`

### data: broCard (32)

- `src/data/say/broCard.js:5` T? `Lv {level}`
- `src/data/say/broCard.js:6` T? `Title: {title}. Change`
- `src/data/say/broCard.js:7` T? `No title. Choose one`
- `src/data/say/broCard.js:8` T? `No title`
- `src/data/say/broCard.js:9` T? `No party`
- `src/data/say/broCard.js:10` T? `No clan`
- `src/data/say/broCard.js:11` T? `Clan: {clan}. Open`
- `src/data/say/broCard.js:12` T? `{clan}. Open`
- `src/data/say/broCard.js:13` T? `{ap} Achievement Points. Open Achievements`
- `src/data/say/broCard.js:14` T? `{ap} AP`
- `src/data/say/broCard.js:16` T? `Achievements: {earned} of {total}. Open`
- `src/data/say/broCard.js:17` T? `Achievements. Open`
- `src/data/say/broCard.js:19` T? `Lifetime Kills`
- `src/data/say/broCard.js:21` T? `Combat skills`
- `src/data/say/broCard.js:22` T? `{skill} level {lvl}, {prog} of {thresh} XP: show {weapon} stats`
- `src/data/say/broCard.js:23` T? `{skill} level {lvl}, fully levelled: show {weapon} stats`
- `src/data/say/broCard.js:24` T? `Combat Stats`
- `src/data/say/broCard.js:25` T? `No {weapon} equipped`
- `src/data/say/broCard.js:27` T? `{earned} of {total}`
- `src/data/say/broCard.js:28` T? `Life Skills`
- `src/data/say/broCard.js:29` T? `Total level {total}`
- `src/data/say/broCard.js:31` T? `{n} to spend`
- `src/data/say/broCard.js:32` T? `All spent`
- `src/data/say/broCard.js:34` T? `{worn} of {slots} worn`
- `src/data/say/broCard.js:36` T? `{n} plot ready`
- `src/data/say/broCard.js:36` T? `{n} plots ready`
- `src/data/say/broCard.js:37` T? `Nothing ready`
- `src/data/say/broCard.js:39` T? `No pet`
- `src/data/say/broCard.js:41` T? `{n} unlocked`
- `src/data/say/broCard.js:46` T? `{n} plot ready to harvest. Your farm is reached from the Feed & Seed in BroTown: walk i...`
- `src/data/say/broCard.js:47` T? `{n} plots ready to harvest. Your farm is reached from the Feed & Seed in BroTown: walk ...`
- `src/data/say/broCard.js:49` T? `Nothing ready to harvest yet. Your farm is reached from the Feed & Seed in BroTown: wal...`

### data: broPages (32)

- `src/data/say/broPages.js:6` T? `Bro pages`
- `src/data/say/broPages.js:10` T? `Back to the Overview`
- `src/data/say/broPages.js:12` T? `LV {level}`
- `src/data/say/broPages.js:13` T? `No title equipped`
- `src/data/say/broPages.js:14` T? `{n} point`
- `src/data/say/broPages.js:14` T? `{n} points`
- `src/data/say/broPages.js:15` T? `{n} point to spend: open Points`
- `src/data/say/broPages.js:15` T? `{n} points to spend: open Points`
- `src/data/say/broPages.js:17` T? `Combat overview`
- `src/data/say/broPages.js:19` T? `Combat stats: details`
- `src/data/say/broPages.js:23` T? `Gear worn`
- `src/data/say/broPages.js:29` T? `Weapon mastery`
- `src/data/say/broPages.js:30` T? `Tap to inspect`
- `src/data/say/broPages.js:33` T? `Lv {lvl}`
- `src/data/say/broPages.js:34` T? `{weapon} mastery, level {lvl}: show its combat stats`
- `src/data/say/broPages.js:36` T? `Your progress`
- `src/data/say/broPages.js:37` T? `Your progress: achievements, lifetime kills and points. Open`
- `src/data/say/broPages.js:39` T? `Lifetime kills`
- `src/data/say/broPages.js:40` T? `Achievement pts`
- `src/data/say/broPages.js:42` T? `Combat stats`
- `src/data/say/broPages.js:49` T? `No {weapon} equipped`
- `src/data/say/broPages.js:50` T? `{prog} / {thresh} XP`
- `src/data/say/broPages.js:51` T? `Fully levelled`
- `src/data/say/broPages.js:54` T? `Attack speed`
- `src/data/say/broPages.js:56` T? `Crit chance`
- `src/data/say/broPages.js:57` T? `Crit damage`
- `src/data/say/broPages.js:58` T? `Special damage`
- `src/data/say/broPages.js:59` T? `Element power`
- `src/data/say/broPages.js:64` T? `Move speed`
- `src/data/say/broPages.js:71` T? `Crit dmg`
- `src/data/say/broPages.js:80` T? `Achievements {achv}, lifetime kills {kills}, achievement points {ap}. Open Achievements`
- `src/data/say/broPages.js:81` T? `{earned} of {total}`

### data: buildings (24)

- `src/data/buildings.js:11` T `MARKETPLACE`
- `src/data/buildings.js:11` T `Buy and sell items`
- `src/data/buildings.js:12` T `AUCTION HOUSE`
- `src/data/buildings.js:12` T `Buy and sell with players`
- `src/data/buildings.js:13` T `BANK`
- `src/data/buildings.js:13` T `Safe item storage`
- `src/data/buildings.js:14` T `ENCHANTER`
- `src/data/buildings.js:14` T `Slot gems into gear`
- `src/data/buildings.js:15` T `KITCHEN`
- `src/data/buildings.js:15` T `Cook food buffs`
- `src/data/buildings.js:16` T `FARM`
- `src/data/buildings.js:16` T `Grow ingredients`
- `src/data/buildings.js:17` T `TAVERN`
- `src/data/buildings.js:17` T `Form parties`
- `src/data/buildings.js:18` T `BLACKSMITH`
- `src/data/buildings.js:18` T `Forge gear bases`
- `src/data/buildings.js:19` T `WOODWORKER`
- `src/data/buildings.js:19` T `Craft bows & staves`
- `src/data/buildings.js:20` T `GAMBLING DEN`
- `src/data/buildings.js:20` T `Test your luck`
- `src/data/buildings.js:21` T `GEM CUTTER`
- `src/data/buildings.js:21` T `Cut raw gems`
- `src/data/buildings.js:22` T `YOUR FARM`
- `src/data/buildings.js:22` T `Visit your farm`

### data: characterPicker (36)

- `src/data/say/characterPicker.js:4` T? `New here`
- `src/data/say/characterPicker.js:5` T? `Played just now`
- `src/data/say/characterPicker.js:6` T? `Played {n}m ago`
- `src/data/say/characterPicker.js:7` T? `Played {n}h ago`
- `src/data/say/characterPicker.js:8` T? `Played {n}d ago`
- `src/data/say/characterPicker.js:9` T? `Played a while ago`
- `src/data/say/characterPicker.js:11` T? `Could not reach the server. Nothing was changed.`
- `src/data/say/characterPicker.js:12` T? `Too many attempts — wait a minute and try again. Nothing was changed.`
- `src/data/say/characterPicker.js:13` T? `This character can only be restarted on a device it was played on. Nothing was changed.`
- `src/data/say/characterPicker.js:14` T? `This character is in a fight with a player right now. Nothing was changed: try again on...`
- `src/data/say/characterPicker.js:15` T? `This character has something on the market. Nothing was changed: cancel its listings, o...`
- `src/data/say/characterPicker.js:16` T? `That did not work. Nothing was changed.`
- `src/data/say/characterPicker.js:18` T? `CHOOSE YOUR BRO`
- `src/data/say/characterPicker.js:19` T? `{n} / {max}`
- `src/data/say/characterPicker.js:20` T? `No bros on this device yet. Use Create Character on the screen behind this one, or brin...`
- `src/data/say/characterPicker.js:21` T? `Unnamed bro`
- `src/data/say/characterPicker.js:22` T? `LEVEL {level}`
- `src/data/say/characterPicker.js:24` T? `Options for {name}`
- `src/data/say/characterPicker.js:25` T? `this character`
- `src/data/say/characterPicker.js:26` T? `Playing on another device?`
- `src/data/say/characterPicker.js:27` T? `USE LOGIN KEY`
- `src/data/say/characterPicker.js:30` T? `This character`
- `src/data/say/characterPicker.js:31` T? `Level {level}`
- `src/data/say/characterPicker.js:32` T? `Level unknown`
- `src/data/say/characterPicker.js:33` T? `Restart at level 1`
- `src/data/say/characterPicker.js:34` T? `Keeps the name and the face. Everything earned is gone.`
- `src/data/say/characterPicker.js:35` T? `Remove from this device`
- `src/data/say/characterPicker.js:36` T? `Frees a slot. Their Login Key still brings them back.`
- `src/data/say/characterPicker.js:39` T? `Are you sure?`
- `src/data/say/characterPicker.js:40` T? `{name} goes back to {level}. Their levels, gear, coins and quests are gone and cannot b...`
- `src/data/say/characterPicker.js:42` T? `{name} is removed from this device and their slot is freed. You can bring them back wit...`
- `src/data/say/characterPicker.js:43` T? `Type {word} to confirm.`
- `src/data/say/characterPicker.js:45` T? `Type yes to confirm`
- `src/data/say/characterPicker.js:47` T? `Restart at level 1`
- `src/data/say/characterPicker.js:48` T? `Remove from this device`
- `src/data/say/characterPicker.js:49` T? `Keep them as they are`

### data: characterView (1)

- `src/data/say/characterView.js:4` T? `Your character`

### data: chestReveal (10)

- `src/data/say/chestReveal.js:4` T? `+{coins} coins`
- `src/data/say/chestReveal.js:5` T? `{count} Cooked Fish`
- `src/data/say/chestReveal.js:6` T? `{count} Fish to cook`
- `src/data/say/chestReveal.js:7` T? `A Rare Gem`
- `src/data/say/chestReveal.js:9` T? `A prize`
- `src/data/say/chestReveal.js:11` T? `Daily chest`
- `src/data/say/chestReveal.js:12` T? `You have {count} chests waiting.`
- `src/data/say/chestReveal.js:13` T? `Your daily chest is here.`
- `src/data/say/chestReveal.js:14` T? `The chest would not open — try again.`
- `src/data/say/chestReveal.js:20` T? `Claim next ({count})`

### data: clan (54)

- `src/data/say/clan.js:5` T? `Your clan, now a party`
- `src/data/say/clan.js:6` T? `{kind} · {n} member · {active} active`
- `src/data/say/clan.js:6` T? `{kind} · {n} members · {active} active`
- `src/data/say/clan.js:7` T? `No party yet`
- `src/data/say/clan.js:8` T? `Your party stays together when you log out.`
- `src/data/say/clan.js:9` T? `A party of {at} members who played in the last 7 days and are level 5 or more becomes a...`
- `src/data/say/clan.js:10` T? `Invite a player`
- `src/data/say/clan.js:12` T? `You aren't in a clan.`
- `src/data/say/clan.js:13` T? `Make one, or join one when a clan leader invites you. Clans meet at the Guild Hall in B...`
- `src/data/say/clan.js:14` T? `Make a clan`
- `src/data/say/clan.js:15` T? `{n} member`
- `src/data/say/clan.js:15` T? `{n} members`
- `src/data/say/clan.js:17` T? `Lv {level}`
- `src/data/say/clan.js:18` T? `Open the clan window`
- `src/data/say/clan.js:22` T? `A party stays together when you log out, and when 20 of its members have played in the ...`
- `src/data/say/clan.js:26` T? `Clans are groups of up to {max} players. Create one with a custom name, tag, and pixel ...`
- `src/data/say/clan.js:27` T? `Create Clan ({cost}g)`
- `src/data/say/clan.js:28` T? `Joining [{tag}]...`
- `src/data/say/clan.js:29` T? `Accept invite: [{tag}] {clan} (from {from})`
- `src/data/say/clan.js:30` T? `To join a clan, have a clan member invite you by tapping your character.`
- `src/data/say/clan.js:32` T? `Create Clan`
- `src/data/say/clan.js:33` T? `Clan Name`
- `src/data/say/clan.js:34` T? `My Awesome Clan`
- `src/data/say/clan.js:35` T? `Clan Tag (max {max} chars)`
- `src/data/say/clan.js:37` T? `Name too short (min 3)`
- `src/data/say/clan.js:38` T? `Need a clan tag`
- `src/data/say/clan.js:39` T? `Need {cost}g`
- `src/data/say/clan.js:40` T? `Founding [{tag}]...`
- `src/data/say/clan.js:41` T? `Clans are closed`
- `src/data/say/clan.js:42` T? `Create ({cost}g)`
- `src/data/say/clan.js:45` T? `{n}/{max} members · Lv{level}`
- `src/data/say/clan.js:46` T? `Logo Editor`
- `src/data/say/clan.js:47` T? `Clear Logo`
- `src/data/say/clan.js:48` T? `Logo saved!`
- `src/data/say/clan.js:49` T? `Save Logo`
- `src/data/say/clan.js:50` T? `Members ({n})`
- `src/data/say/clan.js:51` T? `You (Founder)`
- `src/data/say/clan.js:53` T? `Clan Wars`
- `src/data/say/clan.js:55` T? `{zone} · {left}m remaining · {kills} kills`
- `src/data/say/clan.js:56` T? `Travel to {zone} to fight! PvP kills score points.`
- `src/data/say/clan.js:57` T? `{killer} defeated {victim} (+{points}pts)`
- `src/data/say/clan.js:58` T? `Challenge another clan to a 30-minute PvP battle in a zone. Most kills wins!`
- `src/data/say/clan.js:59` T? `Battle Zone`
- `src/data/say/clan.js:60` T? `Target Clan`
- `src/data/say/clan.js:61` T? `No other clans online`
- `src/data/say/clan.js:62` T? `Select a target clan!`
- `src/data/say/clan.js:63` T? `WAR DECLARED vs [{tag}]!`
- `src/data/say/clan.js:64` T? `Battle zone: {zone}`
- `src/data/say/clan.js:65` T? `Declare War`
- `src/data/say/clan.js:67` T? `Leaving clan...`
- `src/data/say/clan.js:68` T? `Left clan`
- `src/data/say/clan.js:69` T? `Tap again to DISBAND [{tag}] — the clan and its name are gone`
- `src/data/say/clan.js:70` T? `Tap again to leave the clan`
- `src/data/say/clan.js:71` T? `Leave Clan`

### data: clanInvite (5)

- `src/data/say/clanInvite.js:6` T? `Clan invite`
- `src/data/say/clanInvite.js:7` T? `{from} invites you to join {clan}.`
- `src/data/say/clanInvite.js:8` T? `It lasts two minutes. Your clan is in the Guild Hall in BroTown.`
- `src/data/say/clanInvite.js:10` T? `Not now`
- `src/data/say/clanInvite.js:11` T? `Joining [{tag}]...`

### data: codexDrops (68)

- `src/data/codexDrops.js:169` T? `Coal, a carrot and some very cold snow: all that is left of a snowman.`
- `src/data/codexDrops.js:170` T? `A goblin's last embers, still warm, and the smell of singed hair.`
- `src/data/codexDrops.js:171` T? `Old bones and older bandages from the Buried City.`
- `src/data/codexDrops.js:172` T? `A puddle of slime that has finally given up.`
- `src/data/codexDrops.js:179` T? `Every kill`
- `src/data/codexDrops.js:219` T? `In a party, only players who did at least 5% of its damage can loot the pile, and the f...`
- `src/data/codexDrops.js:253` T `Gold`
- `src/data/codexDrops.js:256` T `The world's money: every shop, bench and auction in BroTown takes it.`
- `src/data/codexDrops.js:257` T? `gold every kill, more the higher its level`
- `src/data/codexDrops.js:258` T `Every kill drops`
- `src/data/codexDrops.js:258` T `to`
- `src/data/codexDrops.js:258` T `gold:`
- `src/data/codexDrops.js:258` T `at Lv`
- `src/data/codexDrops.js:258` T `at Lv`
- `src/data/codexDrops.js:259` T `In a party it is shared by everyone who did at least 5% of its damage, split by the dam...`
- `src/data/codexDrops.js:263` T `What is left of it.`
- `src/data/codexDrops.js:264` T? `one every kill`
- `src/data/codexDrops.js:265` T `Every kill drops one.`
- `src/data/codexDrops.js:265` T `Quests ask for them, and Diego buys them.`
- `src/data/codexDrops.js:272` T `A splinter of its land's own element. Crack it at the Gem Works: some hold a raw`
- `src/data/codexDrops.js:272` T `gem. Diego pays well for one too.`
- `src/data/codexDrops.js:273` T `A splinter of its land's own element, cold or hot or humming to the touch. Diego pays w...`
- `src/data/codexDrops.js:274` T `About`
- `src/data/codexDrops.js:274` T `kills drops one.`
- `src/data/codexDrops.js:275` T `At the Gem Works, 1 in 10 holds a raw gem (more as your Gem Cutting grows). Three raw g...`
- `src/data/codexDrops.js:281` T `Raw`
- `src/data/codexDrops.js:283` T `A rough`
- `src/data/codexDrops.js:283` T `, still in its stone. The Gem Cutter polishes it into a gem for an amulet or a shield.`
- `src/data/codexDrops.js:284` T `About`
- `src/data/codexDrops.js:284` T `kills drops one.`
- `src/data/codexDrops.js:285` T `It goes to whoever lands the killing blow, straight into the bag.`
- `src/data/codexDrops.js:287` T `Rare Gem`
- `src/data/codexDrops.js:289` T `A bright stone, rare and pretty. The Gem Works cuts it into any of the eight elemental ...`
- `src/data/codexDrops.js:290` T `A bright stone, rare and pretty. Nothing is made from it yet: Diego buys it, and the se...`
- `src/data/codexDrops.js:291` T `About`
- `src/data/codexDrops.js:291` T `kills drops one.`
- `src/data/codexDrops.js:292` T? `After it drops, a separate roll decides its grade (shown above).`
- `src/data/codexDrops.js:293` T? `The grade makes it stronger and colours its name in your bag, but does not change the`
- `src/data/codexDrops.js:293` T? `drop chance.`
- `src/data/codexDrops.js:294` T `Iron Torso`
- `src/data/codexDrops.js:296` T `Iron chest armour, the step up from copper. The Blacksmith forges the same piece from f...`
- `src/data/codexDrops.js:297` T `This drops at a`
- `src/data/codexDrops.js:297` T `chance from`
- `src/data/codexDrops.js:297` T `, about`
- `src/data/codexDrops.js:297` T `kills.`
- `src/data/codexDrops.js:299` T `Iron Greaves`
- `src/data/codexDrops.js:301` T `Iron leg armour, the step up from copper. The Blacksmith forges the same pair from four...`
- `src/data/codexDrops.js:302` T `This drops at a`
- `src/data/codexDrops.js:302` T `chance from`
- `src/data/codexDrops.js:302` T `, about`
- `src/data/codexDrops.js:302` T `kills`
- `src/data/codexDrops.js:303` T `, on its own roll: a kill can drop both iron pieces.`
- `src/data/codexDrops.js:305` T `Iron Great Sword`
- `src/data/codexDrops.js:307` T `A heavy two-handed iron blade, the same one the Blacksmith forges from four iron bars.`
- `src/data/codexDrops.js:308` T `This drops at a`
- `src/data/codexDrops.js:308` T `chance from`
- `src/data/codexDrops.js:308` T `, about`
- `src/data/codexDrops.js:308` T `kills.`
- `src/data/codexDrops.js:310` T `Gold Nugget`
- `src/data/codexDrops.js:311` T `A lump of gold the size of a thumb. Five smelt into a gold bar for the amulet forge.`
- `src/data/codexDrops.js:312` T `About`
- `src/data/codexDrops.js:312` T `kills drops one.`
- `src/data/codexDrops.js:313` T `It goes to whoever lands the killing blow, straight into the bag.`
- `src/data/codexDrops.js:326` T? `every kill`
- `src/data/codexDrops.js:327` T? `Each kill rolls once, 1 to`
- `src/data/codexDrops.js:328` T? `is its number`
- `src/data/codexDrops.js:328` T? `are its numbers`
- `src/data/codexDrops.js:328` T? `, and no other drop shares them.`

### data: codexStage (11)

- `src/data/codexStage.js:157` T `SLAM!`
- `src/data/codexStage.js:158` T `LUNGE!`
- `src/data/codexStage.js:159` T `BURROW!`
- `src/data/codexStage.js:160` T `UNWRAPPED!`
- `src/data/codexStage.js:161` T `BURST!`
- `src/data/codexStage.js:164` T `COMBO!`
- `src/data/codexStage.js:165` T `CHARGE!`
- `src/data/codexStage.js:166` T `VOLLEY!`
- `src/data/codexStage.js:167` T `TWO-STEP SLAM!`
- `src/data/codexStage.js:168` T `QUAKE!`
- `src/data/codexStage.js:169` T `ENRAGED!`

### data: contextButton (1)

- `src/data/say/contextButton.js:14` T? `Do this here`

### data: controlsTutorial (21)

- `src/data/say/controlsTutorial.js:5` T? `Drag the left joystick to move.`
- `src/data/say/controlsTutorial.js:7` T? `The button lights up when something is in reach. Tap it to swing, hold it to keep fight...`
- `src/data/say/controlsTutorial.js:8` T? `Your target`
- `src/data/say/controlsTutorial.js:9` T? `You always aim at the closest enemy. Tap a different one to lock onto it instead, and t...`
- `src/data/say/controlsTutorial.js:10` T? `You always aim at the closest enemy: hold the right stick toward it and keep fighting.`
- `src/data/say/controlsTutorial.js:11` T? `Aiming and specials`
- `src/data/say/controlsTutorial.js:13` T? `Tap to raise your shield. It stays up until you attack, tap again, or run out of stamina.`
- `src/data/say/controlsTutorial.js:15` T? `Your items and gear live here. Tap one to equip it.`
- `src/data/say/controlsTutorial.js:17` T? `Menus live down here. Tap your character to chat.`
- `src/data/say/controlsTutorial.js:18` T? `Swipe / Dodge`
- `src/data/say/controlsTutorial.js:19` T? `Swipe anywhere in the world to dodge-roll.`
- `src/data/say/controlsTutorial.js:21` T? `Push the left stick a little to turn and face that way. Push it further to walk.`
- `src/data/say/controlsTutorial.js:23` T? `Push the left stick a little to turn and face that way. Push it further to walk. Push t...`
- `src/data/say/controlsTutorial.js:24` T? `Face a monster in reach and a line points to it. Tap Attack once: you lock on and keep ...`
- `src/data/say/controlsTutorial.js:26` T? `Face a monster in reach and tap Attack: you lock on, and each tap is one attack. Hold A...`
- `src/data/say/controlsTutorial.js:27` T? `The line finds the monster you face once it is in reach (a bow or a staff reaches furth...`
- `src/data/say/controlsTutorial.js:28` T? `Your sight line`
- `src/data/say/controlsTutorial.js:29` T? `The line finds the monster you face once it is in reach (a bow or a staff reaches furth...`
- `src/data/say/controlsTutorial.js:30` T? `It comes up beside Attack while a monster is in sight. Tap to raise your shield. It sta...`
- `src/data/say/controlsTutorial.js:32` T? `Close tutorial`
- `src/data/say/controlsTutorial.js:33` T? `Step {step} of {total}`

### data: dailyCard (9)

- `src/data/say/dailyCard.js:3` T? `Daily rewards`
- `src/data/say/dailyCard.js:5` T? `Daily quests: soon`
- `src/data/say/dailyCard.js:6` T? `{done}/{all} daily quests`
- `src/data/say/dailyCard.js:8` T? `{count} to claim`
- `src/data/say/dailyCard.js:9` T? `free spin ready`
- `src/data/say/dailyCard.js:10` T? `spin going`
- `src/data/say/dailyCard.js:11` T? `{n} bonus spin`
- `src/data/say/dailyCard.js:11` T? `{n} bonus spins`
- `src/data/say/dailyCard.js:12` T? `{days}-day streak`

### data: dailyRewards (38)

- `src/data/say/dailyRewards.js:5` T? `{coins} coins · {star} 1`
- `src/data/say/dailyRewards.js:6` T? `Swap "{quest}" for another quest`
- `src/data/say/dailyRewards.js:8` T? `{days}-day streak`
- `src/data/say/dailyRewards.js:9` T? `A freeze saved your streak!`
- `src/data/say/dailyRewards.js:10` T? `Play each day to keep it. It raises the free spin's prizes.`
- `src/data/say/dailyRewards.js:11` T? `Streak freezes`
- `src/data/say/dailyRewards.js:12` T? `A freeze is used automatically if you miss a day. You earn one every {every} days of st...`
- `src/data/say/dailyRewards.js:14` T? `The free daily spin`
- `src/data/say/dailyRewards.js:15` T? `Your pot of {pot} coins is waiting`
- `src/data/say/dailyRewards.js:16` T? `Your free spin is ready`
- `src/data/say/dailyRewards.js:17` T? `{n} bonus spin to use`
- `src/data/say/dailyRewards.js:17` T? `{n} bonus spins to use`
- `src/data/say/dailyRewards.js:18` T? `Today's spin is done`
- `src/data/say/dailyRewards.js:19` T? `Opens when you hand in Mayor Bro's first quest.`
- `src/data/say/dailyRewards.js:20` T? `At the Gambling Den in BroTown: take it, or double or nothing.`
- `src/data/say/dailyRewards.js:21` T? `At the Gambling Den in BroTown. Spin for a lump sum, up to the {jackpot} jackpot.`
- `src/data/say/dailyRewards.js:22` T? `At the Gambling Den in BroTown. Spin for a lump sum.`
- `src/data/say/dailyRewards.js:23` T? `Next free spin in {until}.`
- `src/data/say/dailyRewards.js:25` T? `resets in {until}`
- `src/data/say/dailyRewards.js:26` T? `Daily quests`
- `src/data/say/dailyRewards.js:27` T? `Hand in Mayor Bro's first quest to open the daily quests.`
- `src/data/say/dailyRewards.js:28` T? `All three done! You got +{stars} ★ and a bonus spin.`
- `src/data/say/dailyRewards.js:29` T? `Finish all three: +{stars} ★ and a bonus spin`
- `src/data/say/dailyRewards.js:30` T? `Not your thing? Tap ↻ to swap one quest for another (once a day).`
- `src/data/say/dailyRewards.js:31` T? `You've used today's swap.`
- `src/data/say/dailyRewards.js:32` T? `Each quest also puts a ★ on the season.`
- `src/data/say/dailyRewards.js:35` T? `Season {season}`
- `src/data/say/dailyRewards.js:36` T? `ends in {until}`
- `src/data/say/dailyRewards.js:37` T? `Tier {tier} at {need} ★`
- `src/data/say/dailyRewards.js:38` T? `Every tier reached! A bonus spin every {every} ★ more.`
- `src/data/say/dailyRewards.js:39` T? `Earn ★ from each daily quest, from finishing all three, and from your free spin.`
- `src/data/say/dailyRewards.js:40` T? `Earn {stars} ★ a day with your free spin at the Gambling Den.`
- `src/data/say/dailyRewards.js:41` T? `Missed days never cost ★, and anything you reach but don't claim is sent to you when th...`
- `src/data/say/dailyRewards.js:42` T? `Claim all ({count})`
- `src/data/say/dailyRewards.js:43` T? `{got}/{all} claimed`
- `src/data/say/dailyRewards.js:45` T? `{glyph} Past tier {tier}: a bonus spin every {every} ★.`
- `src/data/say/dailyRewards.js:47` T? `Daily rewards`
- `src/data/say/dailyRewards.js:52` T? `Daily rewards are not open right now.`

### data: dailySpin (38)

- `src/data/say/dailySpin.js:4` T? `Rare: 1 in {bigOdds} lands {big}+, 1 in {topOdds} the {top} jackpot.`
- `src/data/say/dailySpin.js:6` T? `The wheel didn't hear back. Nothing was spent — try again.`
- `src/data/say/dailySpin.js:7` T? `No spins left today.`
- `src/data/say/dailySpin.js:8` T? `Take your pot or double it first.`
- `src/data/say/dailySpin.js:9` T? `That's the house limit — take it!`
- `src/data/say/dailySpin.js:10` T? `Hand in Mayor Bro's first quest to unlock the free spin.`
- `src/data/say/dailySpin.js:11` T? `Nothing to take.`
- `src/data/say/dailySpin.js:12` T? `Taking {pot}…`
- `src/data/say/dailySpin.js:13` T? `Double or nothing…`
- `src/data/say/dailySpin.js:15` T? `JACKPOT! {pot} coins!`
- `src/data/say/dailySpin.js:16` T? `You won {pot} coins!`
- `src/data/say/dailySpin.js:17` T? `Doubled! {pot} — the house limit, paid!`
- `src/data/say/dailySpin.js:18` T? `Doubled! {pot} coins.`
- `src/data/say/dailySpin.js:19` T? `Lost it all — {lost} coins.`
- `src/data/say/dailySpin.js:20` T? `+{paid} coins!`
- `src/data/say/dailySpin.js:21` T? `Your pot: {pot} coins.`
- `src/data/say/dailySpin.js:22` T? `Free today! Spin for a lump sum of coins.`
- `src/data/say/dailySpin.js:23` T? `You have {n} bonus spin.`
- `src/data/say/dailySpin.js:23` T? `You have {n} bonus spins.`
- `src/data/say/dailySpin.js:24` T? `Today's spin is done.`
- `src/data/say/dailySpin.js:26` T? `Take it, or double or nothing: 50% to make it {twice}, 50% to lose it.`
- `src/data/say/dailySpin.js:27` T? `The house limit is {limit}. Take it!`
- `src/data/say/dailySpin.js:28` T? `Next free spin in {until}.`
- `src/data/say/dailySpin.js:30` T? `Unlocks with the first quest`
- `src/data/say/dailySpin.js:31` T? `Spin · free`
- `src/data/say/dailySpin.js:32` T? `Use a bonus spin ({n})`
- `src/data/say/dailySpin.js:33` T? `Next free spin in {until}`
- `src/data/say/dailySpin.js:35` T? `Free daily spin`
- `src/data/say/dailySpin.js:36` T? `{days}-day streak`
- `src/data/say/dailySpin.js:39` T? `Take {pot}`
- `src/data/say/dailySpin.js:40` T? `Double or nothing`
- `src/data/say/dailySpin.js:41` T? `50% for {twice}`
- `src/data/say/dailySpin.js:42` T? `House limit`
- `src/data/say/dailySpin.js:43` T? `{n} bonus spin saved for later`
- `src/data/say/dailySpin.js:43` T? `{n} bonus spins saved for later`
- `src/data/say/dailySpin.js:45` T? `Daily quests & season`
- `src/data/say/dailySpin.js:46` T? `Daily quests`
- `src/data/say/dailySpin.js:47` T? `Season rewards`

### data: dishes (10)

- `src/data/dishes.js:28` T `Herb Bread`
- `src/data/dishes.js:28` T `2× healing out of a fight, 30 min`
- `src/data/dishes.js:33` T `Root Stew`
- `src/data/dishes.js:33` T `Take 5% less damage, 30 min`
- `src/data/dishes.js:38` T `Firebloom Tea`
- `src/data/dishes.js:38` T `+20% damage, 30 min`
- `src/data/dishes.js:45` T `Garden Stew`
- `src/data/dishes.js:45` T `Heals 150 HP at once`
- `src/data/dishes.js:50` T `Pumpkin Pie`
- `src/data/dishes.js:50` T `+10% combat XP, 30 min`

### data: duelRequest (7)

- `src/data/say/duelRequest.js:4` T? `Duel challenge expired`
- `src/data/say/duelRequest.js:6` T? `Duel Challenge`
- `src/data/say/duelRequest.js:7` T? `{name} challenges you!`
- `src/data/say/duelRequest.js:8` T? `Wager: {wager}g (winner takes all)`
- `src/data/say/duelRequest.js:9` T? `Duels are consensual. No reputation penalty. The loser pays the wager. No item loss.`
- `src/data/say/duelRequest.js:10` T? `Duels are consensual. No wager, no item loss, no reputation penalty.`
- `src/data/say/duelRequest.js:13` T? `Accept ({wager}g)`

### data: effects (6)

- `src/data/effects.js:290` T `World View ↓`
- `src/data/effects.js:369` T `Town`
- `src/data/effects.js:370` T `Flame Fields`
- `src/data/effects.js:371` T `Wind Dunes`
- `src/data/effects.js:383` T `Earth Forest`
- `src/data/effects.js:384` T `Frost Ridge`

### data: elemWindup (8)

- `src/data/elemWindup.js:30` T `snow swirling in`
- `src/data/elemWindup.js:31` T `droplets swirling in`
- `src/data/elemWindup.js:32` T `sparks rising, flames at its hands`
- `src/data/elemWindup.js:33` T `a gust circling it`
- `src/data/elemWindup.js:34` T `rock dust kicked up at its feet`
- `src/data/elemWindup.js:35` T `crackling sparks`
- `src/data/elemWindup.js:36` T `poison fumes rising`
- `src/data/elemWindup.js:37` T `goo bubbling up`

### data: elements (10)

- `src/data/elements.js:3` T `burn`
- `src/data/elements.js:4` T `freeze`
- `src/data/elements.js:5` T `soak`
- `src/data/elements.js:6` T `root`
- `src/data/elements.js:7` T `shock`
- `src/data/elements.js:8` T `fracture`
- `src/data/elements.js:9` T `slow`
- `src/data/elements.js:15` T `thorn`
- `src/data/elements.js:16` T `curse`
- `src/data/elements.js:17` T `reveal`

### data: enchant (25)

- `src/data/say/enchant.js:5` T? `Enchanting Lv{lvl}`
- `src/data/say/enchant.js:6` T? `Slot polished gems into gear with open gem slots.`
- `src/data/say/enchant.js:7` T? `Gems you made pay 400 Enchanting XP when set: {owed} still to come.`
- `src/data/say/enchant.js:8` T? `Gems you make pay 400 Enchanting XP when set. Bought, traded or taken-out gems pay none.`
- `src/data/say/enchant.js:16` T? `Gem slots: {used}/{max} used`
- `src/data/say/enchant.js:17` T? `· Craft slotted gear at the Blacksmith or Woodworker first`
- `src/data/say/enchant.js:18` T? `· Req Enchanting Lv20 for 2nd slot`
- `src/data/say/enchant.js:19` T? `Choose a polished gem for Slot 1:`
- `src/data/say/enchant.js:20` T? `Choose a polished gem for Slot 2 (Fusion):`
- `src/data/say/enchant.js:21` T? `Volatile combo requires Fusion-Compatible gear base`
- `src/data/say/enchant.js:22` T? `Needs Fusion-Compatible gear!`
- `src/data/say/enchant.js:23` T? `{elem} enchanted!`
- `src/data/say/enchant.js:24` T? `Enchanting Lv{lvl}!`
- `src/data/say/enchant.js:25` T? `No polished gems`
- `src/data/say/enchant.js:27` T? `No open gem slot`
- `src/data/say/enchant.js:28` T? `Taking out…`
- `src/data/say/enchant.js:29` T? `Take out`
- `src/data/say/enchant.js:30` T? `{cost} gold · the gem comes back`
- `src/data/say/enchant.js:33` T? `{gem} gem`
- `src/data/say/enchant.js:34` T? `Slotted: {gem}. Slot a new gem to replace (old gem lost).`
- `src/data/say/enchant.js:35` T? `Slot a polished gem to activate the amulet.`
- `src/data/say/enchant.js:36` T? `📿 Craft an amulet at the Blacksmith to slot gems here.`
- `src/data/say/enchant.js:39` T? `Slotted: {gem}. Slot new gem to replace.`
- `src/data/say/enchant.js:40` T? `Slot a polished gem for defensive power.`
- `src/data/say/enchant.js:41` T? `No shield equipped. Wear one to slot defensive gems here.`

### data: equippedTab (5)

- `src/data/say/equippedTab.js:4` T? `EQUIP {slot}`
- `src/data/say/equippedTab.js:5` T? `Nothing in inventory fits this slot.`
- `src/data/say/equippedTab.js:7` T? `SHORTCUT SLOT {slot}`
- `src/data/say/equippedTab.js:8` T? `Remove shortcut`
- `src/data/say/equippedTab.js:18` T? `Tap a slot to set`

### data: exchange (30)

- `src/data/say/exchange.js:5` T? `Auction House`
- `src/data/say/exchange.js:6` T? `Buy now or bid ›`
- `src/data/say/exchange.js:7` T? `Trade by gear type · Orders last 24h · Refunds by mail`
- `src/data/say/exchange.js:11` T? `My Orders`
- `src/data/say/exchange.js:16` T? `Any element`
- `src/data/say/exchange.js:18` T? `Material Tier`
- `src/data/say/exchange.js:19` T? `Element (optional)`
- `src/data/say/exchange.js:23` T? `Max you'll pay`
- `src/data/say/exchange.js:24` T? `Ask Price`
- `src/data/say/exchange.js:26` T? `Est. value: ~{gold}G`
- `src/data/say/exchange.js:28` T? `Select Item from Stash`
- `src/data/say/exchange.js:29` T? `No items in stash to sell`
- `src/data/say/exchange.js:31` T? `Place Buy Order ({price}G)`
- `src/data/say/exchange.js:32` T? `List for Sale ({price}G)`
- `src/data/say/exchange.js:33` T? `Not enough gold!`
- `src/data/say/exchange.js:34` T? `Select an item first!`
- `src/data/say/exchange.js:36` T? `Bought for {price}G!`
- `src/data/say/exchange.js:37` T? `Sold for {price}G!`
- `src/data/say/exchange.js:38` T? `Buy order placed!`
- `src/data/say/exchange.js:39` T? `Listed for sale!`
- `src/data/say/exchange.js:40` T? `Server error!`
- `src/data/say/exchange.js:42` T? `Order Book — {tier} {type}`
- `src/data/say/exchange.js:43` T? `SELL ORDERS (lowest first)`
- `src/data/say/exchange.js:44` T? `BUY ORDERS (highest first)`
- `src/data/say/exchange.js:46` T? `No orders yet. Be the first!`
- `src/data/say/exchange.js:48` T? `Your Active Orders ({count})`
- `src/data/say/exchange.js:49` T? `No active orders`
- `src/data/say/exchange.js:52` T? `{min}m left`
- `src/data/say/exchange.js:53` T? `Order cancelled`
- `src/data/say/exchange.js:54` T? `Cancel failed`

### data: farmCrops (16)

- `src/data/farmCrops.js:25` T `Carrot`
- `src/data/farmCrops.js:26` T `Firebloom`
- `src/data/farmCrops.js:27` T `Rock Vine`
- `src/data/farmCrops.js:28` T `Cloudpetal`
- `src/data/farmCrops.js:30` T `Potato`
- `src/data/farmCrops.js:31` T `Pumpkin`
- `src/data/farmCrops.js:36` T `Wheat`
- `src/data/farmCrops.js:37` T `Strawberry`
- `src/data/farmCrops.js:38` T `Tomato`
- `src/data/farmCrops.js:39` T `Frostberry`
- `src/data/farmCrops.js:40` T `Corn`
- `src/data/farmCrops.js:41` T `Cabbage`
- `src/data/farmCrops.js:42` T `Dewmelon`
- `src/data/farmCrops.js:43` T `Thunder Pepper`
- `src/data/farmCrops.js:44` T `Gloomcap`
- `src/data/farmCrops.js:45` T `Heartroot`

### data: farmLayout (3)

- `src/data/farmLayout.js:86` T `Sleep in the hay`
- `src/data/farmLayout.js:87` T `Dungeon Workshop`
- `src/data/farmLayout.js:88` T `Pet House`

### data: feedSeed (25)

- `src/data/say/feedSeed.js:4` T? `{n} ready to harvest`
- `src/data/say/feedSeed.js:5` T? `{n} growing`
- `src/data/say/feedSeed.js:6` T? `{n} bed to plant`
- `src/data/say/feedSeed.js:6` T? `{n} beds to plant`
- `src/data/say/feedSeed.js:8` T? `Could not`
- `src/data/say/feedSeed.js:9` T? `+{count} {item}`
- `src/data/say/feedSeed.js:10` T? `· +{xp} XP`
- `src/data/say/feedSeed.js:11` T? `Delivered · +{gold} gold · +{xp} XP`
- `src/data/say/feedSeed.js:12` T? `Your Farm`
- `src/data/say/feedSeed.js:14` T? `Feed & Seed`
- `src/data/say/feedSeed.js:15` T? `Farming {lvl}`
- `src/data/say/feedSeed.js:16` T? `Visit Your Farm`
- `src/data/say/feedSeed.js:17` T? `Your plots`
- `src/data/say/feedSeed.js:21` T? `What you can deliver for gold`
- `src/data/say/feedSeed.js:22` T? `What you can buy`
- `src/data/say/feedSeed.js:23` T? `Your beds keep growing.`
- `src/data/say/feedSeed.js:25` T? `⏱ grow · {water} watered · {harvest} harvest ·`
- `src/data/say/feedSeed.js:26` T? `with compost`
- `src/data/say/feedSeed.js:28` T? `🔒 Farming {lvl}`
- `src/data/say/feedSeed.js:30` T? `Try again`
- `src/data/say/feedSeed.js:31` T? `Opening the orders…`
- `src/data/say/feedSeed.js:32` T? `Today's orders`
- `src/data/say/feedSeed.js:34` T? `You have {count}`
- `src/data/say/feedSeed.js:37` T? `New orders are on their way…`
- `src/data/say/feedSeed.js:38` T? `New orders in {time}`

### data: fishBoard (3)

- `src/data/say/fishBoard.js:10` T? `The scales are closed for now.`
- `src/data/say/fishBoard.js:11` T? `The records can't be read right now.`
- `src/data/say/fishBoard.js:12` T? `Nobody has weighed a {name} yet. Tap a fish in your bag, then Inspect.`

### data: fishVariants (13)

- `src/data/fishVariants.js:21` T `Minnow`
- `src/data/fishVariants.js:22` T `Clownfish`
- `src/data/fishVariants.js:23` T `Trout`
- `src/data/fishVariants.js:24` T `Salmon`
- `src/data/fishVariants.js:25` T `Pike`
- `src/data/fishVariants.js:72` T `Albino`
- `src/data/fishVariants.js:72` T `Large`
- `src/data/fishVariants.js:102` T? `An albino`
- `src/data/fishVariants.js:103` T? `A LARGE`
- `src/data/fishVariants.js:110` T `fish`
- `src/data/fishVariants.js:112` T? `The scales are closed for now.`
- `src/data/fishVariants.js:113` T? `The scales can't read your log right now. Try again soon.`
- `src/data/fishVariants.js:114` T? `You've weighed all your`

### data: fishWeigh (6)

- `src/data/say/fishWeigh.js:8` T? `Weighing your {name}…`
- `src/data/say/fishWeigh.js:9` T? `Weighing your {variant} {name}…`
- `src/data/say/fishWeigh.js:10` T? `Your heaviest {name} yet!`
- `src/data/say/fishWeigh.js:11` T? `Your best: {kg}`
- `src/data/say/fishWeigh.js:12` T? `· #{rank} on the board`
- `src/data/say/fishWeigh.js:13` T? `· {left} more to weigh`

### data: gamble (21)

- `src/data/say/gamble.js:4` T? `Gambling Den`
- `src/data/say/gamble.js:5` T? `Free daily spin, a gold wager & the weekly jackpot`
- `src/data/say/gamble.js:6` T? `Your gold:`
- `src/data/say/gamble.js:8` T? `{ap} AP`
- `src/data/say/gamble.js:10` T? `Wager · Double or Nothing`
- `src/data/say/gamble.js:11` T? `A separate bet with your own gold: 40% chance to double it, 60% chance to lose it.`
- `src/data/say/gamble.js:13` T? `WON! +{amount}g`
- `src/data/say/gamble.js:14` T? `LOST! -{amount}g`
- `src/data/say/gamble.js:15` T? `The table is closed`
- `src/data/say/gamble.js:16` T? `Roll · {wager}G`
- `src/data/say/gamble.js:17` T? `Select a wager`
- `src/data/say/gamble.js:19` T? `Weekly Jackpot`
- `src/data/say/gamble.js:20` T? `Every 50G you put in is one ticket. Each week one ticket wins the whole pot. The house ...`
- `src/data/say/gamble.js:22` T? `Your tickets this week: {tickets} · Min deposit: {min}g`
- `src/data/say/gamble.js:23` T? `Deposit {amount}G`
- `src/data/say/gamble.js:24` T? `The jackpot is closed`
- `src/data/say/gamble.js:25` T? `Need {min}G`
- `src/data/say/gamble.js:27` T? `Gambling Stats`
- `src/data/say/gamble.js:28` T? `Total wagered:`
- `src/data/say/gamble.js:29` T? `Total won:`
- `src/data/say/gamble.js:30` T? `Total lost:`

### data: gameDisplay (180)

- `src/data/gameDisplay.js:43` T `Clown Mask`
- `src/data/gameDisplay.js:47` T `Honk honk.`
- `src/data/gameDisplay.js:56` T `Troll Mask`
- `src/data/gameDisplay.js:60` T `Chaos incarnate.`
- `src/data/gameDisplay.js:69` T `Anonymous Mask`
- `src/data/gameDisplay.js:73` T `We are legion.`
- `src/data/gameDisplay.js:82` T `Skull Mask`
- `src/data/gameDisplay.js:86` T `Memento mori.`
- `src/data/gameDisplay.js:95` T `Demon Mask`
- `src/data/gameDisplay.js:99` T `From the deep.`
- `src/data/gameDisplay.js:108` T `Cat Mask`
- `src/data/gameDisplay.js:112` T `Purrfect disguise.`
- `src/data/gameDisplay.js:121` T `Robot Visor`
- `src/data/gameDisplay.js:125` T `BEEP BOOP.`
- `src/data/gameDisplay.js:134` T `Ghost Sheet`
- `src/data/gameDisplay.js:138` T `BOO!`
- `src/data/gameDisplay.js:146` T `Ninja Hood`
- `src/data/gameDisplay.js:150` T `Silent but deadly.`
- `src/data/gameDisplay.js:158` T `Royal Crown`
- `src/data/gameDisplay.js:162` T `Bow before me.`
- `src/data/gameDisplay.js:171` T `Alien Head`
- `src/data/gameDisplay.js:175` T `Take me to your leader.`
- `src/data/gameDisplay.js:183` T `Pumpkin Head`
- `src/data/gameDisplay.js:187` T `Spooky season never ends.`
- `src/data/gameDisplay.js:196` T `Rage Face`
- `src/data/gameDisplay.js:200` T `PURE ANGER.`
- `src/data/gameDisplay.js:209` T `Cool Shades`
- `src/data/gameDisplay.js:213` T `Deal with it.`
- `src/data/gameDisplay.js:221` T `Distinguished`
- `src/data/gameDisplay.js:225` T `Quite.`
- `src/data/gameDisplay.js:257` T `bulkier arms`
- `src/data/gameDisplay.js:264` T `wider torso`
- `src/data/gameDisplay.js:271` T `arcane aura`
- `src/data/gameDisplay.js:278` T `sleeker frame`
- `src/data/gameDisplay.js:285` T `gentle glow`
- `src/data/gameDisplay.js:292` T `commanding presence`
- `src/data/gameDisplay.js:1246` T? `Lets go`
- `src/data/gameDisplay.js:1246` T? `gg ez`
- `src/data/gameDisplay.js:2127` T? `first tap after`
- `src/data/gameDisplay.js:2127` T? `: context was`
- `src/data/gameDisplay.js:4607` T? `BT_AUDIO cold sound`
- `src/data/gameDisplay.js:4851` T? `BT_AUDIO sound gate shut for the loading screen over`
- `src/data/gameDisplay.js:4851` T? `ms: opened anyway`
- `src/data/gameDisplay.js:5271` T? `media error`
- `src/data/gameDisplay.js:5988` T? `BT_AUDIO ctx was`
- `src/data/gameDisplay.js:6141` T `Mayor Bro`
- `src/data/gameDisplay.js:6202` T? `Welcome to BroTown! I'm Mayor Bro, and I'm glad you're here.`
- `src/data/gameDisplay.js:6203` T? `Anyone with a mark over their head has a job for you. Go and talk to them!`
- `src/data/gameDisplay.js:6204` T? `BroTown is safe. Monsters can't hurt you inside the town.`
- `src/data/gameDisplay.js:6205` T? `Talk to me any time. I always have work for a hero.`
- `src/data/gameDisplay.js:6206` T? `I love this town, and I love the people in it.`
- `src/data/gameDisplay.js:6269` T `Lil Bro`
- `src/data/gameDisplay.js:6341` T? `Bet you can't catch me!`
- `src/data/gameDisplay.js:6342` T? `Race me around the town square! I'm super fast.`
- `src/data/gameDisplay.js:6343` T? `My big bro says the blue slimes in the Earth Forest explode. So cool!`
- `src/data/gameDisplay.js:6344` T? `One day I'm gonna have a sword bigger than me!`
- `src/data/gameDisplay.js:6345` T? `Farmer Bro's Zoom Juice makes you super fast. Not as fast as me, though!`
- `src/data/gameDisplay.js:6419` T `Ace`
- `src/data/gameDisplay.js:6465` T? `I'm Ace. Want to flip a coin for gold? Talk to me.`
- `src/data/gameDisplay.js:6466` T? `Heads or tails? If you win, I pay you. If you lose, you pay me.`
- `src/data/gameDisplay.js:6467` T? `I always tell you the odds before you flip. That's only fair.`
- `src/data/gameDisplay.js:6468` T? `Only bet gold you're happy to lose, friend.`
- `src/data/gameDisplay.js:6477` T `Diego`
- `src/data/gameDisplay.js:6555` T? `I'm Diego. My General Store buys and sells almost anything.`
- `src/data/gameDisplay.js:6556` T? `Got extra loot? Sell it to me for gold, amigo.`
- `src/data/gameDisplay.js:6557` T? `If you sell me a lot of one thing, I pay a little less for each one.`
- `src/data/gameDisplay.js:6558` T? `I'm writing a cookbook. Cooked fish is my favorite page.`
- `src/data/gameDisplay.js:6559` T? `Eat cooked food from your Bag when you're hurt. It heals you.`
- `src/data/gameDisplay.js:6598` T `Blacksmith Bro`
- `src/data/gameDisplay.js:6651` T? `I'm Blacksmith Bro. Bring me ore, and I'll help you make armor.`
- `src/data/gameDisplay.js:6652` T? `Copper first. Then iron, when you're ready.`
- `src/data/gameDisplay.js:6653` T? `Use my forge to make greatswords, chest plates and greaves.`
- `src/data/gameDisplay.js:6654` T? `Good armor helps you take less damage in a fight.`
- `src/data/gameDisplay.js:6655` T? `I lift weights every morning. Then I lift hammers all day!`
- `src/data/gameDisplay.js:6656` T? `Never skip a workout, and never skip the forge!`
- `src/data/gameDisplay.js:6689` T `Beastmaster Bro`
- `src/data/gameDisplay.js:6719` T? `I'm Beastmaster Bro. I catch wild monsters with box traps.`
- `src/data/gameDisplay.js:6720` T? `Make box traps at the Woodworker's bench, on the Traps tab.`
- `src/data/gameDisplay.js:6721` T? `Most traps break. That's normal, so keep trying!`
- `src/data/gameDisplay.js:6722` T? `Every land has its own wild monsters to catch.`
- `src/data/gameDisplay.js:6754` T `Woodworker Bro`
- `src/data/gameDisplay.js:6779` T? `I'm Woodworker Bro. I make bows and staffs from wood.`
- `src/data/gameDisplay.js:6780` T? `Measure twice, cut once. Then measure again, just to be sure.`
- `src/data/gameDisplay.js:6781` T? `Hardened wood makes stronger bows and staffs.`
- `src/data/gameDisplay.js:6782` T? `Please don't touch the knobs on my bench. I set each one just right.`
- `src/data/gameDisplay.js:6783` T? `I've read every book about pine. Some of them twice!`
- `src/data/gameDisplay.js:6792` T `Farmer Bro`
- `src/data/gameDisplay.js:6816` T? `I'm Farmer Bro. I grow the food for the whole town.`
- `src/data/gameDisplay.js:6817` T? `Water your crops, or they won't grow.`
- `src/data/gameDisplay.js:6818` T? `Every bro gets a farm. You can visit yours from my shop, the Feed & Seed.`
- `src/data/gameDisplay.js:6819` T? `Cook 3 carrots into Zoom Juice at the Cookhouse. It makes you run faster!`
- `src/data/gameDisplay.js:6820` T? `I talk to my plants every day. I think it helps them grow.`
- `src/data/gameDisplay.js:6833` T `Sterling`
- `src/data/gameDisplay.js:6854` T? `I'm Sterling, the banker. Talk to me to open the Bank.`
- `src/data/gameDisplay.js:6855` T? `Items and gold in the Bank stay safe, even if you lose a fight.`
- `src/data/gameDisplay.js:6856` T? `You can put gold and items in the Bank, and take them out any time.`
- `src/data/gameDisplay.js:6857` T? `Saving a little gold every day adds up fast.`
- `src/data/gameDisplay.js:6858` T? `I count every coin in the vault twice a day. It's my favorite part of the job.`
- `src/data/gameDisplay.js:6867` T `Slim`
- `src/data/gameDisplay.js:6888` T? `I'm Slim. I run the Saloon. Talk to me to see your party.`
- `src/data/gameDisplay.js:6889` T? `Want friends to adventure with? Start a party at the Saloon.`
- `src/data/gameDisplay.js:6890` T? `You can invite another player to your party from their player card.`
- `src/data/gameDisplay.js:6891` T? `Today's special is fizzy apple juice with lots of ice.`
- `src/data/gameDisplay.js:6892` T? `Fighting with a party is more fun. Bring your friends to a dungeon!`
- `src/data/gameDisplay.js:6901` T `Chef Blaze`
- `src/data/gameDisplay.js:6922` T? `I'm Chef Blaze! Talk to me to open the Cookhouse and see the recipes.`
- `src/data/gameDisplay.js:6923` T? `Cook your crops into meals and drinks that help you in a fight.`
- `src/data/gameDisplay.js:6924` T? `To cook a fish, light a campfire with a log from your Bag.`
- `src/data/gameDisplay.js:6925` T? `I LOVE cooking! The kitchen is my happy place.`
- `src/data/gameDisplay.js:6926` T? `Three carrots make Zoom Juice. It makes you run faster for a while.`
- `src/data/gameDisplay.js:6935` T `Glint`
- `src/data/gameDisplay.js:6936` T? `Gem Cutter`
- `src/data/gameDisplay.js:6956` T? `I'm Glint. I cut gems at the Gem Works. Talk to me to open it.`
- `src/data/gameDisplay.js:6957` T? `Gems give your weapon a special element.`
- `src/data/gameDisplay.js:6958` T? `Find shards out in the lands, and I'll help you turn them into gems.`
- `src/data/gameDisplay.js:6959` T? `Every gem has its own feeling, I think. This blue one feels calm.`
- `src/data/gameDisplay.js:6960` T? `Cut a gem first, then set it into your gear.`
- `src/data/gameDisplay.js:6969` T `Postmaster Pete`
- `src/data/gameDisplay.js:6990` T? `I'm Postmaster Pete. Talk to me to open the Post Office.`
- `src/data/gameDisplay.js:6991` T? `Gold from things you sell comes to you in the mail.`
- `src/data/gameDisplay.js:6992` T? `Friends can send you messages. Read them at the Post Office.`
- `src/data/gameDisplay.js:6993` T? `I do everything slowly and carefully. Every letter gets there in the end.`
- `src/data/gameDisplay.js:6994` T? `I sort every letter by hand. It takes a while, but I never lose one.`
- `src/data/gameDisplay.js:7003` T `Deed Dave`
- `src/data/gameDisplay.js:7004` T? `Land Agent`
- `src/data/gameDisplay.js:7024` T? `I'm Deed Dave, the land agent. Talk to me to open the Land Office.`
- `src/data/gameDisplay.js:7025` T? `The Land Office can take you to your farm.`
- `src/data/gameDisplay.js:7026` T? `Every bro gets a free farm with six beds to plant in.`
- `src/data/gameDisplay.js:7027` T? `I love land! Wet land, dry land, any land at all.`
- `src/data/gameDisplay.js:7028` T? `Your farm has a barn for your pets, too.`
- `src/data/gameDisplay.js:7037` T `Benny`
- `src/data/gameDisplay.js:7058` T? `I'm Benny. Welcome to the Hotel! Talk to me to rest.`
- `src/data/gameDisplay.js:7059` T? `A rest fills up your health, stamina and mana, and it's free!`
- `src/data/gameDisplay.js:7060` T? `After a rest you're Well Rested: you earn more combat XP for 30 minutes.`
- `src/data/gameDisplay.js:7061` T? `Can I carry your bag? I'm stronger than I look!`
- `src/data/gameDisplay.js:7062` T? `Every room has a soft bed and a clean pillow.`
- `src/data/gameDisplay.js:7071` T `Guildmaster Gary`
- `src/data/gameDisplay.js:7092` T? `I'm Guildmaster Gary. Talk to me to open the Guild Hall.`
- `src/data/gameDisplay.js:7093` T? `There's a guild for each of the ten skills. Find the one you like best.`
- `src/data/gameDisplay.js:7094` T? `I practice every single day. I always try my hardest!`
- `src/data/gameDisplay.js:7095` T? `Train a skill a little every day, and you'll get better fast.`
- `src/data/gameDisplay.js:7096` T? `Teamwork wins fights. Help each other out there.`
- `src/data/gameDisplay.js:7105` T `Sheriff Buck`
- `src/data/gameDisplay.js:7126` T? `I'm Sheriff Buck. Talk to me to open the Sheriff's Office.`
- `src/data/gameDisplay.js:7127` T? `Want to test your skills? Duel another player at my office.`
- `src/data/gameDisplay.js:7128` T? `Join the arena for 100 gold. Win every match to take the prize.`
- `src/data/gameDisplay.js:7129` T? `I keep BroTown safe. Monsters can't hurt you in town.`
- `src/data/gameDisplay.js:7130` T? `I polish my badge every morning. It's my favorite thing.`
- `src/data/gameDisplay.js:7139` T `Gavel Greg`
- `src/data/gameDisplay.js:7160` T? `I'm Gavel Greg, the auctioneer. Talk to me to open the Auction House.`
- `src/data/gameDisplay.js:7161` T? `Players sell their items here. Maybe you'll find something great!`
- `src/data/gameDisplay.js:7162` T? `Sell an item from your Bag, and it goes up for sale here.`
- `src/data/gameDisplay.js:7163` T? `Going once, going twice, sold! I love saying that.`
- `src/data/gameDisplay.js:7164` T? `I talk really fast. Auctioneers do that!`
- `src/data/gameDisplay.js:7173` T `Old Man Reel`
- `src/data/gameDisplay.js:7194` T? `I'm Old Man Reel. Every fish I catch gets bigger when I tell the story.`
- `src/data/gameDisplay.js:7195` T? `Catch fish at the fishing spots out in the lands.`
- `src/data/gameDisplay.js:7196` T? `Cook your fish on a campfire, then eat it when you're hurt.`
- `src/data/gameDisplay.js:7197` T? `Fishing takes patience, kid. Don't give up.`
- `src/data/gameDisplay.js:7198` T? `The sea is that way. I'm practicing here by the river first.`
- `src/data/gameDisplay.js:7207` T `Bean`
- `src/data/gameDisplay.js:7229` T? `I'm Bean! I'm streaming right now. Say hi!`
- `src/data/gameDisplay.js:7230` T? `Today's stream is all about BroTown. It's the best town ever!`
- `src/data/gameDisplay.js:7231` T? `I have two followers so far. One of them is my mom!`
- `src/data/gameDisplay.js:7232` T? `Did you see a blue slime explode? That was so cool!`
- `src/data/gameDisplay.js:7233` T? `Try dancing near Lil Bro. He copies everything!`
- `src/data/gameDisplay.js:7242` T `Tourist Terry`
- `src/data/gameDisplay.js:7263` T? `I'm Tourist Terry! I'm visiting BroTown, and I take pictures of everything.`
- `src/data/gameDisplay.js:7264` T? `Can you take a picture of me in front of the Town Hall?`
- `src/data/gameDisplay.js:7265` T? `Open the World map to see the whole world and where everything is.`
- `src/data/gameDisplay.js:7266` T? `Is there a gift shop here? I want a BroTown souvenir!`
- `src/data/gameDisplay.js:7267` T? `I petted a slime once. Don't do that. It exploded!`
- `src/data/gameDisplay.js:7325` T? `Fire Goblin`
- `src/data/gameDisplay.js:7326` T? `Storm Eye`
- `src/data/gameDisplay.js:7327` T? `Water Frog`
- `src/data/gameDisplay.js:7328` T? `Rock Golem`
- `src/data/gameDisplay.js:7329` T? `Moss Slime`
- `src/data/gameDisplay.js:7330` T? `Blue Slime`
- `src/data/gameDisplay.js:7332` T? `Thorn Shambler`
- `src/data/gameDisplay.js:7333` T? `Great Rotcap`

### data: gameSystems (862)

- `src/data/gameSystems.js:76` T `gold bars`
- `src/data/gameSystems.js:81` T `gold`
- `src/data/gameSystems.js:96` T `Wood`
- `src/data/gameSystems.js:118` T `Deep earthy brown, rough but workable`
- `src/data/gameSystems.js:137` T `Copper`
- `src/data/gameSystems.js:147` T `Warm reddish-orange`
- `src/data/gameSystems.js:151` T `Iron`
- `src/data/gameSystems.js:161` T `Dull metallic gray`
- `src/data/gameSystems.js:171` T `Black Steel`
- `src/data/gameSystems.js:181` T `Dark blued steel`
- `src/data/gameSystems.js:185` T `Titanium`
- `src/data/gameSystems.js:194` T `Brushed metallic gray with subtle blue tint`
- `src/data/gameSystems.js:198` T `Obsidian`
- `src/data/gameSystems.js:207` T `Glossy jet black`
- `src/data/gameSystems.js:211` T `Mythril`
- `src/data/gameSystems.js:220` T `Luminous silver-blue`
- `src/data/gameSystems.js:224` T `Diamond`
- `src/data/gameSystems.js:233` T `Brilliant crystalline white`
- `src/data/gameSystems.js:237` T `Abyssal`
- `src/data/gameSystems.js:246` T `Deep midnight purple-black`
- `src/data/gameSystems.js:250` T `Dragonbone`
- `src/data/gameSystems.js:259` T `Pale ivory with faint gold veins`
- `src/data/gameSystems.js:263` T `Shadowsteel`
- `src/data/gameSystems.js:272` T `Dark smoky gunmetal`
- `src/data/gameSystems.js:276` T `Bloodstone`
- `src/data/gameSystems.js:285` T `Deep crimson with dark flecks`
- `src/data/gameSystems.js:289` T `Runestone`
- `src/data/gameSystems.js:298` T `Carved gray with glowing etched lines`
- `src/data/gameSystems.js:302` T `Sunstone`
- `src/data/gameSystems.js:311` T `Warm radiant gold-orange`
- `src/data/gameSystems.js:315` T `Demonite`
- `src/data/gameSystems.js:324` T `Sinister dark red-black`
- `src/data/gameSystems.js:328` T `Spiritforge`
- `src/data/gameSystems.js:337` T `Ghostly pale blue-white`
- `src/data/gameSystems.js:341` T `Starforged`
- `src/data/gameSystems.js:350` T `Shimmering silver with cosmic sparkle`
- `src/data/gameSystems.js:354` T `Celestial`
- `src/data/gameSystems.js:363` T `Soft glowing platinum-gold`
- `src/data/gameSystems.js:367` T `Antimatter`
- `src/data/gameSystems.js:376` T `Flecks of red, green, and blue`
- `src/data/gameSystems.js:380` T `Worldbreaker`
- `src/data/gameSystems.js:389` T `Pulsing unstable dark violet`
- `src/data/gameSystems.js:516` T `Level`
- `src/data/gameSystems.js:517` T `Magic Lv`
- `src/data/gameSystems.js:517` T `Defense`
- `src/data/gameSystems.js:650` T `Pine`
- `src/data/gameSystems.js:661` T `Pale, light and easy to work`
- `src/data/gameSystems.js:665` T `Softwood`
- `src/data/gameSystems.js:676` T `Smooth and flexible`
- `src/data/gameSystems.js:680` T `Hardwood`
- `src/data/gameSystems.js:691` T `Dense and sturdy`
- `src/data/gameSystems.js:697` T `Cedar`
- `src/data/gameSystems.js:708` T `Lightweight and springy`
- `src/data/gameSystems.js:712` T `Maple`
- `src/data/gameSystems.js:723` T `Rich golden grain`
- `src/data/gameSystems.js:727` T `Ironbark`
- `src/data/gameSystems.js:735` T `Iron-hard and unyielding`
- `src/data/gameSystems.js:739` T `Crystal Wood`
- `src/data/gameSystems.js:747` T `Channels elemental energy`
- `src/data/gameSystems.js:751` T `Elder Wood`
- `src/data/gameSystems.js:759` T `Ancient growth, deep resonance`
- `src/data/gameSystems.js:763` T `Spirit Wood`
- `src/data/gameSystems.js:771` T `Hums with latent power`
- `src/data/gameSystems.js:775` T `Dragonwood`
- `src/data/gameSystems.js:783` T `Scaled bark, fire-resistant`
- `src/data/gameSystems.js:787` T `Shadowthorn`
- `src/data/gameSystems.js:795` T `Thorns of pure shadow`
- `src/data/gameSystems.js:799` T `Bloodoak`
- `src/data/gameSystems.js:807` T `Sap runs deep crimson`
- `src/data/gameSystems.js:811` T `Runewood`
- `src/data/gameSystems.js:819` T `Runes form naturally in the grain`
- `src/data/gameSystems.js:823` T `Sunbark`
- `src/data/gameSystems.js:831` T `Warm to the touch, always`
- `src/data/gameSystems.js:835` T `Demonwood`
- `src/data/gameSystems.js:843` T `Twisted, sinister grain`
- `src/data/gameSystems.js:847` T `Ghostwood`
- `src/data/gameSystems.js:855` T `Translucent, almost weightless`
- `src/data/gameSystems.js:859` T `Starwood`
- `src/data/gameSystems.js:867` T `Glimmers with trapped starlight`
- `src/data/gameSystems.js:871` T `Worldtree`
- `src/data/gameSystems.js:879` T `From the roots of the World Tree`
- `src/data/gameSystems.js:883` T `Void Timber`
- `src/data/gameSystems.js:891` T `Warps light around it`
- `src/data/gameSystems.js:895` T `Worldbreaker`
- `src/data/gameSystems.js:903` T `Pulsing unstable dark violet`
- `src/data/gameSystems.js:918` T `Attack Speed`
- `src/data/gameSystems.js:925` T `Crit Chance`
- `src/data/gameSystems.js:932` T `Crit Damage`
- `src/data/gameSystems.js:939` T `Base Damage`
- `src/data/gameSystems.js:946` T `Move Speed`
- `src/data/gameSystems.js:953` T `Max HP`
- `src/data/gameSystems.js:960` T `Max Mana`
- `src/data/gameSystems.js:967` T `Elemental Dmg`
- `src/data/gameSystems.js:1001` T `Rough Cut`
- `src/data/gameSystems.js:1006` T `Fine Cut`
- `src/data/gameSystems.js:1011` T `Flawless Cut`
- `src/data/gameSystems.js:1016` T `Perfect Cut`
- `src/data/gameSystems.js:1025` T `Iron Ore`
- `src/data/gameSystems.js:1031` T `Steel Ore`
- `src/data/gameSystems.js:1037` T? `Elemental Heart`
- `src/data/gameSystems.js:1095` T `Herb Bread`
- `src/data/gameSystems.js:1105` T `Regen 2%/s for 60s`
- `src/data/gameSystems.js:1107` T `Root Stew`
- `src/data/gameSystems.js:1118` T `5% resist for 60s`
- `src/data/gameSystems.js:1120` T `Firebloom Tea`
- `src/data/gameSystems.js:1130` T `+20% dmg for 90s`
- `src/data/gameSystems.js:1135` T `Fury Tonic`
- `src/data/gameSystems.js:1142` T `Double damage for 3 min`
- `src/data/gameSystems.js:1144` T `Mana Draught`
- `src/data/gameSystems.js:1151` T `Specials nonstop for 3 min`
- `src/data/gameSystems.js:1153` T `Swift Draught`
- `src/data/gameSystems.js:1160` T `Run 1.5x as fast for 3 min`
- `src/data/gameSystems.js:1163` T `Garden Stew`
- `src/data/gameSystems.js:1171` T `Heals 150 HP at once`
- `src/data/gameSystems.js:1173` T `Pumpkin Pie`
- `src/data/gameSystems.js:1181` T `+10% combat XP for 30 min`
- `src/data/gameSystems.js:1185` T `Stamina Tonic`
- `src/data/gameSystems.js:1192` T `Restores 60 stamina at once`
- `src/data/gameSystems.js:1200` T `Zoom Juice`
- `src/data/gameSystems.js:1207` T `Run 25% faster for 5 min`
- `src/data/gameSystems.js:1463` T `Wooden Bed`
- `src/data/gameSystems.js:1468` T `Rest in style`
- `src/data/gameSystems.js:1474` T `Oak Table`
- `src/data/gameSystems.js:1479` T `Organized workspace`
- `src/data/gameSystems.js:1485` T `Bookshelf`
- `src/data/gameSystems.js:1490` T `Knowledge collection`
- `src/data/gameSystems.js:1496` T `Mini Forge`
- `src/data/gameSystems.js:1501` T `Forge at home`
- `src/data/gameSystems.js:1507` T `Trophy Case`
- `src/data/gameSystems.js:1512` T `Display achievements`
- `src/data/gameSystems.js:1518` T `Enchant Table`
- `src/data/gameSystems.js:1523` T `Enchant at home`
- `src/data/gameSystems.js:1529` T `Alchemy Set`
- `src/data/gameSystems.js:1534` T `Brew potions`
- `src/data/gameSystems.js:1540` T `Wardrobe`
- `src/data/gameSystems.js:1545` T `Cosmetic storage`
- `src/data/gameSystems.js:1549` T `Pet Bed`
- `src/data/gameSystems.js:1554` T `Pets recover faster`
- `src/data/gameSystems.js:1560` T `Chandelier`
- `src/data/gameSystems.js:1565` T `Brilliant illumination`
- `src/data/gameSystems.js:1571` T `Weapon Rack`
- `src/data/gameSystems.js:1576` T `Display weapons`
- `src/data/gameSystems.js:1582` T `Garden Box`
- `src/data/gameSystems.js:1587` T `Indoor growing`
- `src/data/gameSystems.js:1673` T `Gladiator`
- `src/data/gameSystems.js:1702` T `Lumberjack's Lodge`
- `src/data/gameSystems.js:1705` T? `Guildmaster Oak`
- `src/data/gameSystems.js:1709` T `Angler's Circle`
- `src/data/gameSystems.js:1712` T? `Guildmaster Marina`
- `src/data/gameSystems.js:1716` T `Stonecutter's Union`
- `src/data/gameSystems.js:1719` T? `Guildmaster Flint`
- `src/data/gameSystems.js:1723` T `Grower's Guild`
- `src/data/gameSystems.js:1726` T? `Guildmaster Sage`
- `src/data/gameSystems.js:1730` T `Chef's Academy`
- `src/data/gameSystems.js:1733` T? `Guildmaster Ember`
- `src/data/gameSystems.js:1737` T `Anvil Brotherhood`
- `src/data/gameSystems.js:1740` T? `Guildmaster Forge`
- `src/data/gameSystems.js:1744` T `Carpenter's Circle`
- `src/data/gameSystems.js:1747` T? `Guildmaster Cedar`
- `src/data/gameSystems.js:1751` T `Jeweler's Eye`
- `src/data/gameSystems.js:1754` T? `Guildmaster Prism`
- `src/data/gameSystems.js:1758` T `Arcane Order`
- `src/data/gameSystems.js:1761` T? `Guildmaster Rune`
- `src/data/gameSystems.js:1765` T `Beastmaster's Lodge`
- `src/data/gameSystems.js:1768` T? `Guildmaster Claw`
- `src/data/gameSystems.js:1774` T `Novice`
- `src/data/gameSystems.js:1780` T `Apprentice`
- `src/data/gameSystems.js:1786` T `Journeyman`
- `src/data/gameSystems.js:1792` T `Adept`
- `src/data/gameSystems.js:1798` T `Expert`
- `src/data/gameSystems.js:1804` T `Master`
- `src/data/gameSystems.js:1810` T `Grandmaster`
- `src/data/gameSystems.js:1816` T `Legendary`
- `src/data/gameSystems.js:1822` T `Transcendent`
- `src/data/gameSystems.js:1831` T `First Steps`
- `src/data/gameSystems.js:1832` T `Reach Lv5 in this skill`
- `src/data/gameSystems.js:1840` T `Finding Your Rhythm`
- `src/data/gameSystems.js:1841` T `Reach Lv15 in this skill`
- `src/data/gameSystems.js:1849` T `Dedicated Practice`
- `src/data/gameSystems.js:1850` T `Reach Lv30 in this skill`
- `src/data/gameSystems.js:1858` T `True Calling`
- `src/data/gameSystems.js:1859` T `Reach Lv50 in this skill`
- `src/data/gameSystems.js:1867` T `Master's Trial`
- `src/data/gameSystems.js:1868` T `Reach Lv70 in this skill`
- `src/data/gameSystems.js:1876` T `Beyond Mastery`
- `src/data/gameSystems.js:1877` T `Reach Lv90 in this skill`
- `src/data/gameSystems.js:1885` T `Legendary Artisan`
- `src/data/gameSystems.js:1886` T `Reach Lv100 in this skill`
- `src/data/gameSystems.js:1894` T `Transcendence`
- `src/data/gameSystems.js:1895` T `Reach Lv150 in this skill`
- `src/data/gameSystems.js:1941` T `🐛 Bug`
- `src/data/gameSystems.js:1943` T `Something broken`
- `src/data/gameSystems.js:1946` T `⚖️ Balance`
- `src/data/gameSystems.js:1948` T `Too strong/weak`
- `src/data/gameSystems.js:1951` T `🗑️ Remove`
- `src/data/gameSystems.js:1953` T `Take this out`
- `src/data/gameSystems.js:1956` T `➕ Add`
- `src/data/gameSystems.js:1958` T `New feature idea`
- `src/data/gameSystems.js:1965` T `✨ Improve`
- `src/data/gameSystems.js:1967` T `Quality of life`
- `src/data/gameSystems.js:1970` T `❤️ Praise`
- `src/data/gameSystems.js:1972` T `Something great`
- `src/data/gameSystems.js:1976` T `⚔️ Combat`
- `src/data/gameSystems.js:1977` T `Fighting, weapons, elements`
- `src/data/gameSystems.js:1980` T `🏟️ Arena`
- `src/data/gameSystems.js:1981` T `Gladiator tournament`
- `src/data/gameSystems.js:1984` T `🏛️ Guilds`
- `src/data/gameSystems.js:1985` T `Life skill guilds + ranks`
- `src/data/gameSystems.js:1988` T `🐾 Pets`
- `src/data/gameSystems.js:1989` T `Capture, evolution, enchant`
- `src/data/gameSystems.js:1992` T `🔨 Crafting`
- `src/data/gameSystems.js:1993` T `Blacksmith, woodwork, cooking`
- `src/data/gameSystems.js:1996` T `🏪 Marketplace`
- `src/data/gameSystems.js:1997` T `Trading, buy/sell orders`
- `src/data/gameSystems.js:2000` T `🐉 Dungeons`
- `src/data/gameSystems.js:2001` T `Dungeons + custom workshop`
- `src/data/gameSystems.js:2004` T `🏰 Clans`
- `src/data/gameSystems.js:2005` T `Clans + clan wars`
- `src/data/gameSystems.js:2009` T `PvP and duels`
- `src/data/gameSystems.js:2012` T `🗺️ Zones`
- `src/data/gameSystems.js:2013` T `Zones, biomes, diving`
- `src/data/gameSystems.js:2016` T `🌾 Farm`
- `src/data/gameSystems.js:2017` T `Farm, house, furniture`
- `src/data/gameSystems.js:2021` T `Interface, mobile, desktop`
- `src/data/gameSystems.js:2024` T `👥 Social`
- `src/data/gameSystems.js:2025` T `Chat, emotes, friends`
- `src/data/gameSystems.js:2028` T `📊 Progression`
- `src/data/gameSystems.js:2029` T `Leveling, XP, achievements`
- `src/data/gameSystems.js:2032` T `💭 Other`
- `src/data/gameSystems.js:2033` T `Anything else`
- `src/data/gameSystems.js:2041` T `OG Bro Cape`
- `src/data/gameSystems.js:2043` T `Black and gold cape — awarded to players present on the first anniversary.`
- `src/data/gameSystems.js:2100` T `Lava Dodge`
- `src/data/gameSystems.js:2103` T `Dodge falling lava rocks. Last one standing wins!`
- `src/data/gameSystems.js:2112` T `Ice Deflect`
- `src/data/gameSystems.js:2115` T `Block incoming ice shards with precise timing.`
- `src/data/gameSystems.js:2122` T `Lightning Strike`
- `src/data/gameSystems.js:2125` T `Hit targets when they flash. Speed and accuracy!`
- `src/data/gameSystems.js:2132` T `Poison Pulse`
- `src/data/gameSystems.js:2135` T `Match the rhythm of poison pulses. Don't miss a beat!`
- `src/data/gameSystems.js:2142` T `Rock Crusher`
- `src/data/gameSystems.js:2145` T `Smash rocks in order from smallest to largest.`
- `src/data/gameSystems.js:2152` T `Gust Catcher`
- `src/data/gameSystems.js:2155` T `Catch wind orbs as they fly across. Don't grab decoys!`
- `src/data/gameSystems.js:2162` T `Pearl Diver`
- `src/data/gameSystems.js:2165` T `Dive for pearls. Surface for air before drowning!`
- `src/data/gameSystems.js:2194` T `waiting`
- `src/data/gameSystems.js:2236` T `PERFECT!`
- `src/data/gameSystems.js:2242` T `Good!`
- `src/data/gameSystems.js:2248` T `OK`
- `src/data/gameSystems.js:2254` T `Miss!`
- `src/data/gameSystems.js:2547` T `Stone Halls`
- `src/data/gameSystems.js:2554` T `Classic dungeon corridors`
- `src/data/gameSystems.js:2557` T `Lava Pit`
- `src/data/gameSystems.js:2564` T `Molten rivers and charred stone`
- `src/data/gameSystems.js:2568` T `Ice Cavern`
- `src/data/gameSystems.js:2575` T `Frozen crystalline caves`
- `src/data/gameSystems.js:2579` T `Toxic Swamp`
- `src/data/gameSystems.js:2586` T `Bubbling poison pools`
- `src/data/gameSystems.js:2590` T `Thunder Spire`
- `src/data/gameSystems.js:2597` T `Crackling storm energy`
- `src/data/gameSystems.js:2601` T `Crystal Mine`
- `src/data/gameSystems.js:2608` T `Glittering gem deposits`
- `src/data/gameSystems.js:2612` T `Sky Temple`
- `src/data/gameSystems.js:2619` T `Floating island ruins`
- `src/data/gameSystems.js:2623` T `Coral Reef`
- `src/data/gameSystems.js:2630` T `Underwater caverns`
- `src/data/gameSystems.js:2634` T `Void Realm`
- `src/data/gameSystems.js:2641` T `Reality-warped dimension`
- `src/data/gameSystems.js:2645` T `Golden Palace`
- `src/data/gameSystems.js:2652` T `Opulent treasure vaults`
- `src/data/gameSystems.js:2656` T `Bone Crypt`
- `src/data/gameSystems.js:2663` T `Ossuary of fallen warriors`
- `src/data/gameSystems.js:2668` T `Basic Beasts`
- `src/data/gameSystems.js:2672` T `Slimes and swarms`
- `src/data/gameSystems.js:2675` T `Heavy Hitters`
- `src/data/gameSystems.js:2679` T `Brutes and sentinels`
- `src/data/gameSystems.js:2682` T `Dark Arts`
- `src/data/gameSystems.js:2686` T `Hexers and stalkers`
- `src/data/gameSystems.js:2689` T `Volatile Pack`
- `src/data/gameSystems.js:2693` T `Explosive enemies`
- `src/data/gameSystems.js:2696` T `Flame Legion`
- `src/data/gameSystems.js:2701` T `Fire-infused monsters`
- `src/data/gameSystems.js:2705` T `Frost Horde`
- `src/data/gameSystems.js:2710` T `Ice-themed creatures`
- `src/data/gameSystems.js:2714` T `Venom Brood`
- `src/data/gameSystems.js:2719` T `Poison monsters`
- `src/data/gameSystems.js:2723` T `Storm Legion`
- `src/data/gameSystems.js:2728` T `Lightning enemies`
- `src/data/gameSystems.js:2732` T `Earth Golems`
- `src/data/gameSystems.js:2737` T `Stone creatures`
- `src/data/gameSystems.js:2741` T `Wind Spirits`
- `src/data/gameSystems.js:2746` T `Air elementals`
- `src/data/gameSystems.js:2750` T `Deep Horrors`
- `src/data/gameSystems.js:2755` T `Aquatic nightmares`
- `src/data/gameSystems.js:2759` T `Boss Blueprints`
- `src/data/gameSystems.js:2763` T `Design custom bosses with abilities`
- `src/data/gameSystems.js:2807` T? `Select a terrain`
- `src/data/gameSystems.js:2807` T? `Terrain not unlocked`
- `src/data/gameSystems.js:2808` T? `Need at least 1 wave`
- `src/data/gameSystems.js:2809` T? `waves at your level`
- `src/data/gameSystems.js:2810` T? `Monster level cannot exceed your level (`
- `src/data/gameSystems.js:2822` T? `element requires`
- `src/data/gameSystems.js:2832` T `My Dungeon`
- `src/data/gameSystems.js:2924` T `Melee`
- `src/data/gameSystems.js:2924` T `Bow`
- `src/data/gameSystems.js:2924` T `Magic`
- `src/data/gameSystems.js:2924` T `Lv`
- `src/data/gameSystems.js:3005` T `Great Sword`
- `src/data/gameSystems.js:3014` T `Sword`
- `src/data/gameSystems.js:3063` T `Bow`
- `src/data/gameSystems.js:3080` T `Staff`
- `src/data/gameSystems.js:3211` T `Melee`
- `src/data/gameSystems.js:3211` T `Melee blades — fast sword + heavy greatsword.`
- `src/data/gameSystems.js:3212` T `Bow`
- `src/data/gameSystems.js:3212` T `Ranged physical — precision at distance.`
- `src/data/gameSystems.js:3213` T `Magic`
- `src/data/gameSystems.js:3213` T `Magic — AoE detonation, high variance.`
- `src/data/gameSystems.js:3578` T? `harder · next +`
- `src/data/gameSystems.js:3579` T? `first point: +`
- `src/data/gameSystems.js:3579` T? `damage — a bite of a Lv-`
- `src/data/gameSystems.js:3582` T? `harder · next +`
- `src/data/gameSystems.js:3583` T? `first point: +`
- `src/data/gameSystems.js:3587` T? `LUCKY hit every`
- `src/data/gameSystems.js:3587` T? `first point starts the counter`
- `src/data/gameSystems.js:3592` T? `LUCKY hits hit +`
- `src/data/gameSystems.js:3592` T? `harder · next +`
- `src/data/gameSystems.js:3593` T? `first point: +`
- `src/data/gameSystems.js:3593` T? `on luckies — sized to Lv-`
- `src/data/gameSystems.js:3596` T? `LUCKY hits hit +`
- `src/data/gameSystems.js:3596` T? `harder · next +`
- `src/data/gameSystems.js:3597` T? `first point: +`
- `src/data/gameSystems.js:3597` T? `on luckies`
- `src/data/gameSystems.js:3601` T `Sharpened Edge`
- `src/data/gameSystems.js:3602` T `Your sword hits harder — and every point is bigger than the last.`
- `src/data/gameSystems.js:3604` T `Precision`
- `src/data/gameSystems.js:3605` T `A guaranteed LUCKY hit every few swings — count to it!`
- `src/data/gameSystems.js:3607` T `Executioner`
- `src/data/gameSystems.js:3608` T `Your LUCKY hits hit WAY harder — every point bigger than the last.`
- `src/data/gameSystems.js:3611` T `Tempo`
- `src/data/gameSystems.js:3612` T `Swing sooner — twice as fast at max!`
- `src/data/gameSystems.js:3613` T? `ms sooner`
- `src/data/gameSystems.js:3613` T? `(MAX — 2x speed!)`
- `src/data/gameSystems.js:3615` T `Cleave`
- `src/data/gameSystems.js:3616` T `Swing wider — a full spin attack at max!`
- `src/data/gameSystems.js:3617` T? `FULL-CIRCLE SPIN (MAX)`
- `src/data/gameSystems.js:3620` T `Draw Power`
- `src/data/gameSystems.js:3621` T `Your arrows hit harder — and every point is bigger than the last.`
- `src/data/gameSystems.js:3623` T `Marksmanship`
- `src/data/gameSystems.js:3624` T `A guaranteed LUCKY hit every few shots — count to it!`
- `src/data/gameSystems.js:3626` T `Headshot`
- `src/data/gameSystems.js:3627` T `Your LUCKY hits hit WAY harder — every point bigger than the last.`
- `src/data/gameSystems.js:3630` T `Piercing`
- `src/data/gameSystems.js:3631` T `Arrows fly THROUGH bad guys (+1 every 10 pts, 10 at max).`
- `src/data/gameSystems.js:3632` T? `flies through`
- `src/data/gameSystems.js:3632` T? `bad guys`
- `src/data/gameSystems.js:3632` T? `next at 10 pts`
- `src/data/gameSystems.js:3633` T `Longshot`
- `src/data/gameSystems.js:3634` T `Arrows fly farther and faster — twice as far at max.`
- `src/data/gameSystems.js:3635` T? `(MAX — 2x range!)`
- `src/data/gameSystems.js:3638` T `Spell Power`
- `src/data/gameSystems.js:3639` T `Your spells hit harder — and every point is bigger than the last.`
- `src/data/gameSystems.js:3641` T `Overload`
- `src/data/gameSystems.js:3642` T `A guaranteed LUCKY hit every few casts — count to it!`
- `src/data/gameSystems.js:3644` T `Detonation`
- `src/data/gameSystems.js:3645` T `BIGGER BOOM — double the blast at max.`
- `src/data/gameSystems.js:3646` T? `(MAX — 2x blast!)`
- `src/data/gameSystems.js:3647` T `Attunement`
- `src/data/gameSystems.js:3648` T `Fire and ice stick to bad guys longer — twice as long at max.`
- `src/data/gameSystems.js:3649` T? `fire & ice last +`
- `src/data/gameSystems.js:3649` T? `s longer`
- `src/data/gameSystems.js:3652` T `Arcane Focus`
- `src/data/gameSystems.js:3653` T `Your LUCKY hits hit WAY harder — every point bigger than the last.`
- `src/data/gameSystems.js:3961` T `Bulwark`
- `src/data/gameSystems.js:3962` T `Blocking costs less energy — only 1 per block at max.`
- `src/data/gameSystems.js:3963` T? `blocks cost only 1 energy (MAX)`
- `src/data/gameSystems.js:3963` T? `blocks cost −`
- `src/data/gameSystems.js:3964` T `Iron Skin`
- `src/data/gameSystems.js:3965` T `Every hit on you does flat less — each point bigger than the last.`
- `src/data/gameSystems.js:3967` T? `every hit does −`
- `src/data/gameSystems.js:3967` T? `to you · next −`
- `src/data/gameSystems.js:3967` T? `first point: −`
- `src/data/gameSystems.js:3967` T? `per hit from Lv-`
- `src/data/gameSystems.js:3968` T? `every hit does −`
- `src/data/gameSystems.js:3968` T? `to you · next −`
- `src/data/gameSystems.js:3968` T? `first point: −`
- `src/data/gameSystems.js:3968` T? `per hit`
- `src/data/gameSystems.js:3969` T `Thorns`
- `src/data/gameSystems.js:3970` T `Blocked monsters hurt THEMSELVES — each point bigger than the last.`
- `src/data/gameSystems.js:3972` T? `blocked monsters take`
- `src/data/gameSystems.js:3972` T? `back · next +`
- `src/data/gameSystems.js:3972` T? `first point:`
- `src/data/gameSystems.js:3972` T? `payback — sized to Lv-`
- `src/data/gameSystems.js:3973` T? `blocked monsters take`
- `src/data/gameSystems.js:3973` T? `back · next +`
- `src/data/gameSystems.js:3973` T? `first point:`
- `src/data/gameSystems.js:3974` T `Second Wind`
- `src/data/gameSystems.js:3975` T `Survive a hit, heal a flat chunk right back (every 10s).`
- `src/data/gameSystems.js:3977` T? `survive a hit → heal +`
- `src/data/gameSystems.js:3977` T? `HP · next +`
- `src/data/gameSystems.js:3977` T? `first point: +`
- `src/data/gameSystems.js:3977` T? `HP — sized to Lv-`
- `src/data/gameSystems.js:3978` T? `survive a hit → heal +`
- `src/data/gameSystems.js:3978` T? `HP · next +`
- `src/data/gameSystems.js:3978` T? `first point: +`
- `src/data/gameSystems.js:3979` T `Poise`
- `src/data/gameSystems.js:3980` T `Shrug off stuns — never stunned at max.`
- `src/data/gameSystems.js:3981` T? `NEVER stunned (MAX)`
- `src/data/gameSystems.js:3981` T? `stuns are`
- `src/data/gameSystems.js:3981` T? `ms shorter`
- `src/data/gameSystems.js:4135` T `Vigor`
- `src/data/gameSystems.js:4136` T `More health — each point gives more HP than the last.`
- `src/data/gameSystems.js:4138` T? `HP · next +`
- `src/data/gameSystems.js:4138` T? `first point: +`
- `src/data/gameSystems.js:4138` T? `HP — sized to Lv-`
- `src/data/gameSystems.js:4139` T? `HP · next +`
- `src/data/gameSystems.js:4139` T? `first point: +`
- `src/data/gameSystems.js:4140` T `Recovery`
- `src/data/gameSystems.js:4141` T `Every heal gives a flat bonus on top — each point bigger than the last.`
- `src/data/gameSystems.js:4143` T? `every heal gives +`
- `src/data/gameSystems.js:4143` T? `extra HP · next +`
- `src/data/gameSystems.js:4143` T? `first point: +`
- `src/data/gameSystems.js:4143` T? `per heal — sized to Lv-`
- `src/data/gameSystems.js:4144` T? `every heal gives +`
- `src/data/gameSystems.js:4144` T? `extra HP · next +`
- `src/data/gameSystems.js:4144` T? `first point: +`
- `src/data/gameSystems.js:4144` T? `per heal`
- `src/data/gameSystems.js:4145` T `Lifeblood`
- `src/data/gameSystems.js:4146` T `Beat a monster, heal a flat chunk — each point bigger than the last.`
- `src/data/gameSystems.js:4148` T? `beat a monster → heal +`
- `src/data/gameSystems.js:4148` T? `HP · next +`
- `src/data/gameSystems.js:4148` T? `first point: +`
- `src/data/gameSystems.js:4148` T? `HP — sized to Lv-`
- `src/data/gameSystems.js:4149` T? `beat a monster → heal +`
- `src/data/gameSystems.js:4149` T? `HP · next +`
- `src/data/gameSystems.js:4149` T? `first point: +`
- `src/data/gameSystems.js:4150` T `Resilience`
- `src/data/gameSystems.js:4151` T `REALLY big hits do flat less — each point bigger than the last.`
- `src/data/gameSystems.js:4153` T? `big hits do −`
- `src/data/gameSystems.js:4153` T? `to you · next −`
- `src/data/gameSystems.js:4153` T? `first point: −`
- `src/data/gameSystems.js:4153` T? `off big hits from Lv-`
- `src/data/gameSystems.js:4154` T? `big hits do −`
- `src/data/gameSystems.js:4154` T? `to you · next −`
- `src/data/gameSystems.js:4154` T? `first point: −`
- `src/data/gameSystems.js:4154` T? `off big hits`
- `src/data/gameSystems.js:4157` T `Last Stand`
- `src/data/gameSystems.js:4158` T `A deadly hit leaves you at 1 HP instead — once per cooldown.`
- `src/data/gameSystems.js:4159` T? `survive at 1 HP · ready every`
- `src/data/gameSystems.js:4168` T `Deep Lungs`
- `src/data/gameSystems.js:4169` T `More energy — each point gives more than the last.`
- `src/data/gameSystems.js:4171` T? `energy · next +`
- `src/data/gameSystems.js:4171` T? `first point: +`
- `src/data/gameSystems.js:4171` T? `energy — sized to Lv-`
- `src/data/gameSystems.js:4172` T? `energy · next +`
- `src/data/gameSystems.js:4172` T? `first point: +`
- `src/data/gameSystems.js:4173` T `Conditioning`
- `src/data/gameSystems.js:4174` T `Energy refills faster — a flat chunk more every beat.`
- `src/data/gameSystems.js:4175` T? `energy refills +`
- `src/data/gameSystems.js:4175` T? `extra per beat`
- `src/data/gameSystems.js:4176` T `Swiftness`
- `src/data/gameSystems.js:4177` T `Run faster everywhere — speed 5.0 to 7.0 at max.`
- `src/data/gameSystems.js:4178` T? `(MAX — speed 7.0!)`
- `src/data/gameSystems.js:4179` T `Evasion`
- `src/data/gameSystems.js:4180` T `Monster hits MISS you on a counter — every 2nd at max!`
- `src/data/gameSystems.js:4181` T? `a hit MISSES you every`
- `src/data/gameSystems.js:4181` T? `first point starts the counter`
- `src/data/gameSystems.js:4182` T `Reflexes`
- `src/data/gameSystems.js:4183` T `Your dodge-roll shield lasts longer.`
- `src/data/gameSystems.js:4184` T? `roll shield +`
- `src/data/gameSystems.js:4184` T? `ms longer`
- `src/data/gameSystems.js:4348` T `Common`
- `src/data/gameSystems.js:4354` T `Elemental`
- `src/data/gameSystems.js:4360` T `Fusion`
- `src/data/gameSystems.js:4366` T `Shift`
- `src/data/gameSystems.js:4615` T `Wildfire`
- `src/data/gameSystems.js:4623` T `Thaw Bloom`
- `src/data/gameSystems.js:4631` T `Overgrowth`
- `src/data/gameSystems.js:4639` T `Blight Garden`
- `src/data/gameSystems.js:4647` T `Lightning Rod`
- `src/data/gameSystems.js:4655` T `Petrified Wood`
- `src/data/gameSystems.js:4663` T `Scatter Seed`
- `src/data/gameSystems.js:4671` T `Withering`
- `src/data/gameSystems.js:4679` T `Purifying Bloom`
- `src/data/gameSystems.js:4687` T `Steam`
- `src/data/gameSystems.js:4695` T `Quench`
- `src/data/gameSystems.js:4703` T `Toxic Fumes`
- `src/data/gameSystems.js:4711` T `Overcharge`
- `src/data/gameSystems.js:4719` T `Magma`
- `src/data/gameSystems.js:4727` T `Firestorm`
- `src/data/gameSystems.js:4735` T `Flash Freeze`
- `src/data/gameSystems.js:4743` T `Shatter`
- `src/data/gameSystems.js:4751` T `Hailstorm`
- `src/data/gameSystems.js:4759` T `Permafrost`
- `src/data/gameSystems.js:4767` T `Blizzard`
- `src/data/gameSystems.js:4775` T `Dilute`
- `src/data/gameSystems.js:4783` T `Conduit`
- `src/data/gameSystems.js:4791` T `Mudslide`
- `src/data/gameSystems.js:4799` T `Monsoon`
- `src/data/gameSystems.js:4807` T `Blight`
- `src/data/gameSystems.js:4815` T `Petrify`
- `src/data/gameSystems.js:4823` T `Miasma`
- `src/data/gameSystems.js:4831` T `Seismic Pulse`
- `src/data/gameSystems.js:4839` T `Tempest`
- `src/data/gameSystems.js:4847` T `Erosion`
- `src/data/gameSystems.js:4856` T `Hellfire`
- `src/data/gameSystems.js:4864` T `Dread`
- `src/data/gameSystems.js:4872` T `Drown`
- `src/data/gameSystems.js:4880` T `Wither`
- `src/data/gameSystems.js:4888` T `Hex`
- `src/data/gameSystems.js:4896` T `Shackle`
- `src/data/gameSystems.js:4904` T `Haunt`
- `src/data/gameSystems.js:4913` T `Radiant Fire`
- `src/data/gameSystems.js:4921` T `Purify`
- `src/data/gameSystems.js:4929` T `Baptism`
- `src/data/gameSystems.js:4937` T `Cleansing Bloom`
- `src/data/gameSystems.js:4945` T `Divine Strike`
- `src/data/gameSystems.js:4953` T `Consecrate`
- `src/data/gameSystems.js:4961` T `Salvation`
- `src/data/gameSystems.js:4970` T `Eclipse`
- `src/data/gameSystems.js:6488` T `Basic Trap 🪤`
- `src/data/gameSystems.js:6490` T `Capture weakened monsters`
- `src/data/gameSystems.js:6493` T `Whetstone 🪨`
- `src/data/gameSystems.js:6495` T `+15% dmg for 60s`
- `src/data/gameSystems.js:6498` T `Antidote 🍃`
- `src/data/gameSystems.js:6500` T `Clear all status effects`
- `src/data/gameSystems.js:6506` T `Weapons`
- `src/data/gameSystems.js:6514` T `Armor`
- `src/data/gameSystems.js:6519` T `Shields`
- `src/data/gameSystems.js:6524` T `Amulets`
- `src/data/gameSystems.js:6709` T? `Mayor Bro`
- `src/data/gameSystems.js:6709` T `Into the Blue`
- `src/data/gameSystems.js:6710` T `Bring 4 Slime Remains from the Earth Forest.`
- `src/data/gameSystems.js:6741` T `Copper Great Sword`
- `src/data/gameSystems.js:6742` T `Pine Shield`
- `src/data/gameSystems.js:6744` T `Pine Bow`
- `src/data/gameSystems.js:6745` T `Pine Staff`
- `src/data/gameSystems.js:6822` T? `Welcome to BroTown! I'm Mayor Bro, and I take care of this town and everyone in it. Her...`
- `src/data/gameSystems.js:6823` T? `I still need 4 Slime Remains. Defeat the blue slimes in the Earth Forest to collect the...`
- `src/data/gameSystems.js:6846` T? `You made it back! Sorry, I forgot to tell you that blue slimes explode. Here's a bow an...`
- `src/data/gameSystems.js:6857` T? `Mayor Bro`
- `src/data/gameSystems.js:6857` T `Cold Reception`
- `src/data/gameSystems.js:6858` T `Bring 4 Snowman Remains from Frost Ridge.`
- `src/data/gameSystems.js:6878` T? `Snowmen on Frost Ridge are scaring people away, and I want everyone to feel safe there....`
- `src/data/gameSystems.js:6879` T? `I still need 4 Snowman Remains from Frost Ridge. If the snow under your feet starts to ...`
- `src/data/gameSystems.js:6881` T? `Four Snowman Remains! Thank you, Frost Ridge is safe again. I have another job for you ...`
- `src/data/gameSystems.js:6887` T? `Mayor Bro`
- `src/data/gameSystems.js:6887` T `Bad Wind`
- `src/data/gameSystems.js:6888` T `Bring 5 Skeleton Remains from the Wind Dunes.`
- `src/data/gameSystems.js:6898` T? `The Wind Dunes are full of mummies. Hit a mummy hard and its wrappings fall off, and a ...`
- `src/data/gameSystems.js:6899` T? `I still need 5 Skeleton Remains from the Wind Dunes. Hit the mummies until their wrappi...`
- `src/data/gameSystems.js:6900` T? `Five Skeleton Remains, thank you! The Wind Dunes are safer now. I have one more land fo...`
- `src/data/gameSystems.js:6906` T? `Mayor Bro`
- `src/data/gameSystems.js:6906` T `Bro Ascendant`
- `src/data/gameSystems.js:6907` T `Bring 6 Fire Goblin Remains from the Flame Fields.`
- `src/data/gameSystems.js:6915` T? `Copper Greaves`
- `src/data/gameSystems.js:6917` T `Copper Greaves`
- `src/data/gameSystems.js:6929` T? `The last land on my list is the Flame Fields. The fire goblins there are fast and never...`
- `src/data/gameSystems.js:6930` T? `I still need 6 Fire Goblin Remains from the Flame Fields. Keep moving while you fight, ...`
- `src/data/gameSystems.js:6931` T? `Six Fire Goblin Remains! Great work. Here are some Copper Greaves: wear them to protect...`
- `src/data/gameSystems.js:6967` T? `Mayor Bro`
- `src/data/gameSystems.js:6967` T `Learn a Trade`
- `src/data/gameSystems.js:6975` T `Cook 2 fish and bring them to Mayor Bro.`
- `src/data/gameSystems.js:7002` T `Catch a fish at a fishing spot in any zone`
- `src/data/gameSystems.js:7004` T `Chop a tree in any zone to get a log`
- `src/data/gameSystems.js:7006` T `Open your Bag and tap the log to light a campfire`
- `src/data/gameSystems.js:7008` T `Stand by the fire and tap it to cook your fish`
- `src/data/gameSystems.js:7010` T `Cook 2 fish in total (fires burn out — light another if needed)`
- `src/data/gameSystems.js:7012` T `Bring the 2 cooked fish to Mayor Bro in town`
- `src/data/gameSystems.js:7019` T `Fishing Pole`
- `src/data/gameSystems.js:7021` T? `Take the axe and the pole — nobody's cutting or casting without them.`
- `src/data/gameSystems.js:7022` T? `🎣 Catch a fish and 🪓 chop a tree — any zone has both.`
- `src/data/gameSystems.js:7023` T? `🔥 Tap the log in your Bag to light a fire, then tap the fire to cook.`
- `src/data/gameSystems.js:7024` T? `Two cooked fish, back to me.`
- `src/data/gameSystems.js:7025` T? `Two cooked fish. Raw ones do not count — find a fire.`
- `src/data/gameSystems.js:7026` T? `That's a trade. Here — a pickaxe. The rocks are yours now.`
- `src/data/gameSystems.js:7030` T? `Mayor Bro`
- `src/data/gameSystems.js:7030` T `Rock Bottom`
- `src/data/gameSystems.js:7034` T `Bring 5 Ore to Mayor Bro.`
- `src/data/gameSystems.js:7053` T? `Copper Torso`
- `src/data/gameSystems.js:7056` T `Copper Torso`
- `src/data/gameSystems.js:7059` T? `Ore next. Five lumps, any kind — the rocks in every zone will do.`
- `src/data/gameSystems.js:7060` T? `Five ore. Swing the pickaxe.`
- `src/data/gameSystems.js:7061` T? `Copper for the chest, to go with the greaves you already earned. That's real armor — it...`
- `src/data/gameSystems.js:7107` T? `Farmer Bro`
- `src/data/gameSystems.js:7107` T `Carrot Comeback`
- `src/data/gameSystems.js:7109` T `Plant and water 3 carrots on your farm.`
- `src/data/gameSystems.js:7116` T `Open the Feed & Seed and tap Visit Your Farm`
- `src/data/gameSystems.js:7118` T `Dig a bed, plant a carrot seed, then water it`
- `src/data/gameSystems.js:7120` T `Water 3 planted carrots in all`
- `src/data/gameSystems.js:7122` T `Back to Farmer Bro at the Feed & Seed`
- `src/data/gameSystems.js:7128` T `3 Carrot Seeds`
- `src/data/gameSystems.js:7129` T `3 Compost`
- `src/data/gameSystems.js:7135` T? `Hi, I'm Farmer Bro! I grow the food for the whole town, but a slime ruined my carrots. ...`
- `src/data/gameSystems.js:7136` T? `Plant and water 3 carrots on your farm. To get there, open the Feed & Seed and tap Visi...`
- `src/data/gameSystems.js:7141` T? `Three carrots, planted and watered. Thank you, friend! They take a few minutes to grow,...`
- `src/data/gameSystems.js:7146` T? `Blacksmith Bro`
- `src/data/gameSystems.js:7146` T `Heavy Metal`
- `src/data/gameSystems.js:7149` T `Bring 2 Copper Ore to Blacksmith Bro.`
- `src/data/gameSystems.js:7153` T `Mine copper at the orange rocks outside town`
- `src/data/gameSystems.js:7155` T `Mine 2 Copper Ore in all`
- `src/data/gameSystems.js:7157` T `Back to Blacksmith Bro at the forge`
- `src/data/gameSystems.js:7160` T? `5 Copper Bars`
- `src/data/gameSystems.js:7163` T `Pickaxe`
- `src/data/gameSystems.js:7164` T `5 Copper Bars`
- `src/data/gameSystems.js:7170` T? `Hey, I'm Blacksmith Bro! I love lifting weights almost as much as I love making armor. ...`
- `src/data/gameSystems.js:7171` T? `I still need 2 Copper Ore. Mine the orange rocks outside town with your pickaxe, then b...`
- `src/data/gameSystems.js:7172` T? `Great work! Here are your 5 Copper Bars, a few extra for the forge. Now let's make some...`
- `src/data/gameSystems.js:7176` T? `Blacksmith Bro`
- `src/data/gameSystems.js:7176` T `Some Assembly Required`
- `src/data/gameSystems.js:7179` T `Forge a greatsword, a chest plate or greaves at the forge.`
- `src/data/gameSystems.js:7187` T? `Now let's get you some real gear. Use my forge to make a greatsword, a chest plate or g...`
- `src/data/gameSystems.js:7188` T? `Use my forge to make one thing: a greatsword, a chest plate or greaves. Then come back ...`
- `src/data/gameSystems.js:7189` T? `Looking strong! You made your first piece of gear. Next, go see Diego at the General St...`
- `src/data/gameSystems.js:7193` T? `Woodworker Bro`
- `src/data/gameSystems.js:7193` T `Knock on Wood`
- `src/data/gameSystems.js:7196` T `Bring 5 Pine Logs to Woodworker Bro.`
- `src/data/gameSystems.js:7200` T `Chop a pine tree outside town`
- `src/data/gameSystems.js:7202` T `Chop 5 Pine Logs in all`
- `src/data/gameSystems.js:7204` T `Back to Woodworker Bro at the Woodworker`
- `src/data/gameSystems.js:7207` T? `5 Hardened Pine`
- `src/data/gameSystems.js:7210` T `Woodcutting Axe`
- `src/data/gameSystems.js:7211` T `5 Hardened Pine`
- `src/data/gameSystems.js:7217` T? `Hi, I'm Woodworker Bro! I study wood all day, and pine is my favorite. Here's an axe. C...`
- `src/data/gameSystems.js:7218` T? `I still need 5 Pine Logs. Chop the pine trees outside town with your axe, then bring th...`
- `src/data/gameSystems.js:7219` T? `Thank you! Here are 5 Hardened Pine. Hardened wood is stronger, so it makes better weap...`
- `src/data/gameSystems.js:7223` T? `Woodworker Bro`
- `src/data/gameSystems.js:7223` T `Branching Out`
- `src/data/gameSystems.js:7226` T `Make a bow or a staff at the Woodworker, then swap him a pine one for softwood.`
- `src/data/gameSystems.js:7231` T? `A Softwood Bow or Staff`
- `src/data/gameSystems.js:7234` T `Softwood Bow`
- `src/data/gameSystems.js:7235` T `or Softwood Staff`
- `src/data/gameSystems.js:7241` T? `Use my bench to make a Pine Bow or a Pine Staff with your 5 Hardened Pine. Then bring i...`
- `src/data/gameSystems.js:7242` T? `Make a Pine Bow or a Pine Staff at my bench, then bring it to me. I'll trade you a Soft...`
- `src/data/gameSystems.js:7243` T? `Thank you! I'll study your pine weapon, and here's your new Softwood one. Next, go see ...`
- `src/data/gameSystems.js:7247` T `Something Fishy`
- `src/data/gameSystems.js:7250` T `Cook 2 fish and bring them to Diego.`
- `src/data/gameSystems.js:7257` T `Catch a fish at a fishing spot`
- `src/data/gameSystems.js:7262` T `Get a log for the fire (Diego gave you two, or chop a tree)`
- `src/data/gameSystems.js:7264` T `Open your Bag and tap the log to light a campfire`
- `src/data/gameSystems.js:7266` T `Stand by the fire and tap it to cook your fish`
- `src/data/gameSystems.js:7268` T `Cook 2 fish in all (light another fire if it burns out)`
- `src/data/gameSystems.js:7270` T `Bring the 2 cooked fish to Diego at the General Store`
- `src/data/gameSystems.js:7273` T? `10 Cooked Clownfish`
- `src/data/gameSystems.js:7276` T `Fishing Pole`
- `src/data/gameSystems.js:7277` T `2 Pine Logs`
- `src/data/gameSystems.js:7278` T `10 Cooked Clownfish`
- `src/data/gameSystems.js:7289` T? `Hi, I'm Diego! I run the General Store, and I'm writing a cookbook, but I've never cook...`
- `src/data/gameSystems.js:7290` T? `I still need 2 cooked fish, amigo. Catch 2 fish at a fishing spot, tap a log in your Ba...`
- `src/data/gameSystems.js:7293` T? `Two cooked fish, perfect! My cookbook finally has its first page. Here are 10 Cooked Cl...`
- `src/data/gameSystems.js:7297` T? `Farmer Bro`
- `src/data/gameSystems.js:7297` T `Zoom Juice`
- `src/data/gameSystems.js:7301` T `Pick 3 carrots and cook Zoom Juice at the Cookhouse.`
- `src/data/gameSystems.js:7304` T `Visit your farm and pick 3 ripe carrots`
- `src/data/gameSystems.js:7307` T `Cook Zoom Juice at the Cookhouse (3 carrots)`
- `src/data/gameSystems.js:7309` T `Back to Farmer Bro at the Feed & Seed`
- `src/data/gameSystems.js:7318` T? `Your carrots should be grown now! Visit your farm and pick all 3 carrots, then cook the...`
- `src/data/gameSystems.js:7319` T? `Pick 3 carrots on your farm, then cook them into Zoom Juice at the Cookhouse. Then come...`
- `src/data/gameSystems.js:7320` T? `You made Zoom Juice! Drink it from your Bag right before you race Lil Bro, and it will ...`
- `src/data/gameSystems.js:7324` T? `Lil Bro`
- `src/data/gameSystems.js:7324` T `Race Day`
- `src/data/gameSystems.js:7332` T `Beat Lil Bro round the town square: touch all 4 corner flags and get back first.`
- `src/data/gameSystems.js:7340` T? `Hi, I'm Lil Bro, and I'm the fastest kid in BroTown! Race me around the town square, an...`
- `src/data/gameSystems.js:7344` T? `You beat me! Okay, you really are fast. Here's your 50 gold. Next, go see Beastmaster B...`
- `src/data/gameSystems.js:7380` T? `Beastmaster Bro`
- `src/data/gameSystems.js:7380` T `Box Traps`
- `src/data/gameSystems.js:7385` T `Make 3 box traps at the Woodworker.`
- `src/data/gameSystems.js:7388` T? `2 Box Traps`
- `src/data/gameSystems.js:7391` T `3 Pine Logs`
- `src/data/gameSystems.js:7392` T `2 Box Traps`
- `src/data/gameSystems.js:7398` T? `Hi, I'm Beastmaster Bro. I catch wild monsters and keep them as pets. Take these 3 Pine...`
- `src/data/gameSystems.js:7399` T? `Make 3 Box Traps at the Woodworker's bench, on the Traps tab. Then come back to me.`
- `src/data/gameSystems.js:7400` T? `Nice traps! Here are 2 more from me. Now let's go and catch something.`
- `src/data/gameSystems.js:7404` T? `Beastmaster Bro`
- `src/data/gameSystems.js:7404` T `Set and Spring`
- `src/data/gameSystems.js:7409` T `Spring 3 traps: target a monster out in the lands, tap TRAP, then kill it.`
- `src/data/gameSystems.js:7417` T `Carry a box trap (the Woodworker makes them)`
- `src/data/gameSystems.js:7419` T `Out in the lands, target a monster and tap TRAP`
- `src/data/gameSystems.js:7421` T `Kill it within 15 seconds: the trap springs`
- `src/data/gameSystems.js:7423` T `Spring 3 traps in all`
- `src/data/gameSystems.js:7425` T `Back to Beastmaster Bro by the Woodworker`
- `src/data/gameSystems.js:7428` T? `5 Box Traps`
- `src/data/gameSystems.js:7430` T `5 Box Traps`
- `src/data/gameSystems.js:7435` T? `Time to use your traps. Out in the lands, target a monster and tap TRAP to put a box un...`
- `src/data/gameSystems.js:7436` T? `Spring 3 traps: target a monster, tap TRAP, then defeat it within 15 seconds. Then come...`
- `src/data/gameSystems.js:7437` T? `Three traps sprung, well done! Here are 5 more Box Traps. Talk to me again when you wan...`
- `src/data/gameSystems.js:7441` T? `Beastmaster Bro`
- `src/data/gameSystems.js:7441` T `A Trapper's Eye`
- `src/data/gameSystems.js:7447` T `Reach Trapping level 6.`
- `src/data/gameSystems.js:7452` T? `10 Box Traps`
- `src/data/gameSystems.js:7454` T `10 Box Traps`
- `src/data/gameSystems.js:7459` T? `A trap can't hold a monster whose level is higher than your Trapping level. Get your Tr...`
- `src/data/gameSystems.js:7460` T? `Get your Trapping to level 6. Keep springing traps on monsters, then come back to me.`
- `src/data/gameSystems.js:7461` T? `Trapping level 6, great job! Now your traps work on monsters up to level 6. Here are 10...`
- `src/data/gameSystems.js:7465` T? `Beastmaster Bro`
- `src/data/gameSystems.js:7465` T `Your Own Beast`
- `src/data/gameSystems.js:7468` T `Catch a pet.`
- `src/data/gameSystems.js:7470` T? `15 Box Traps`
- `src/data/gameSystems.js:7472` T `15 Box Traps`
- `src/data/gameSystems.js:7477` T? `Now let's catch you a pet. Only about 1 box in 100 holds a monster, so you'll need pati...`
- `src/data/gameSystems.js:7478` T? `Keep trapping monsters until a box holds one. Every box you spring still gives you Trap...`
- `src/data/gameSystems.js:7479` T? `You caught a pet! It grows stronger as your Trapping level goes up. Here is 500 gold, a...`
- `src/data/gameSystems.js:7486` T? `Mayor Bro`
- `src/data/gameSystems.js:7487` T `Welcome Home`
- `src/data/gameSystems.js:7494` T `Visit 3 buildings in town.`
- `src/data/gameSystems.js:7521` T? `Welcome! Visit three buildings to learn the town.`
- `src/data/gameSystems.js:7522` T? `Keep exploring!`
- `src/data/gameSystems.js:7523` T? `Zone exits are now open! The world awaits.`
- `src/data/gameSystems.js:7530` T? `Mayor Bro`
- `src/data/gameSystems.js:7531` T `Into the Wild`
- `src/data/gameSystems.js:7532` T `Kill 5 monsters in any zone.`
- `src/data/gameSystems.js:7548` T? `BroTown needs brave heroes, and you're one of the best. Defeat 5 monsters, any kind, in...`
- `src/data/gameSystems.js:7549` T? `Defeat 5 monsters, any kind, in any land. Then come back to me at the Town Hall.`
- `src/data/gameSystems.js:7551` T? `Five monsters defeated, great job! I have one last job for you.`
- `src/data/gameSystems.js:7556` T? `Mayor Bro`
- `src/data/gameSystems.js:7557` T `Dungeon Delver`
- `src/data/gameSystems.js:7565` T `Clear any dungeon. The nearest is the Goo Grotto, off the West Road. [Lv`
- `src/data/gameSystems.js:7611` T? `You've made this town proud, so I saved my biggest job for last: clear a dungeon. [Lv`
- `src/data/gameSystems.js:7611` T? `+ recommended] The Goo Grotto is off the West Road in the Earth Forest. Not level`
- `src/data/gameSystems.js:7611` T? `yet? Do the town's quests first, starting with Woodworker Bro at the Woodworker.`
- `src/data/gameSystems.js:7612` T? `Clear a dungeon, bro. [Lv`
- `src/data/gameSystems.js:7612` T? `+ recommended] The Goo Grotto is off the West Road in the Earth Forest. Not level`
- `src/data/gameSystems.js:7612` T? `yet? Do the town's quests first, starting with Woodworker Bro at the Woodworker.`
- `src/data/gameSystems.js:7614` T? `You cleared a dungeon! That was the last job on my list. Thank you for everything you'v...`
- `src/data/gameSystems.js:7620` T? `Trader Tix`
- `src/data/gameSystems.js:7621` T `First Purchase`
- `src/data/gameSystems.js:7622` T `Buy any item from the Vendor.`
- `src/data/gameSystems.js:7634` T? `Buy something from the Vendor!`
- `src/data/gameSystems.js:7635` T? `Visit the shop.`
- `src/data/gameSystems.js:7636` T? `Marketplace now open — trade with players!`
- `src/data/gameSystems.js:7642` T? `Trader Tix`
- `src/data/gameSystems.js:7643` T `Gather and Prosper`
- `src/data/gameSystems.js:7644` T `Harvest 3 gathering nodes.`
- `src/data/gameSystems.js:7660` T? `Gather from 3 resource nodes.`
- `src/data/gameSystems.js:7662` T? `Gather 3 times: chop a tree, mine a rock or catch a fish.`
- `src/data/gameSystems.js:7663` T? `Farm building unlocked! Grow your own ingredients.`
- `src/data/gameSystems.js:7668` T? `Trader Tix`
- `src/data/gameSystems.js:7669` T `Farm to Table`
- `src/data/gameSystems.js:7670` T `Plant and harvest a crop.`
- `src/data/gameSystems.js:7682` T? `Plant a seed and harvest it!`
- `src/data/gameSystems.js:7683` T? `Visit the Farm building.`
- `src/data/gameSystems.js:7684` T? `Herb buff recipes unlocked at the Kitchen!`
- `src/data/gameSystems.js:7692` T `First Spark`
- `src/data/gameSystems.js:7693` T `Trigger an elemental collision.`
- `src/data/gameSystems.js:7704` T? `Two elements on one enemy — make them collide!`
- `src/data/gameSystems.js:7705` T? `Auto-attack applies one element, swipe the other.`
- `src/data/gameSystems.js:7706` T? `Enchanter building now open!`
- `src/data/gameSystems.js:7713` T `Elemental Scholar`
- `src/data/gameSystems.js:7714` T `Discover 5 different collisions.`
- `src/data/gameSystems.js:7725` T? `36 collisions exist. Find 5.`
- `src/data/gameSystems.js:7726` T? `Try different element weapons.`
- `src/data/gameSystems.js:7727` T? `Gem Cutter building now open!`
- `src/data/gameSystems.js:7733` T `Master Enchanter`
- `src/data/gameSystems.js:7734` T `Enchant a weapon at the Enchanter.`
- `src/data/gameSystems.js:7746` T? `Visit the Enchanter and add elements.`
- `src/data/gameSystems.js:7747` T? `Bring gold to the Enchanter.`
- `src/data/gameSystems.js:7748` T? `Amulet and shield gem slotting unlocked!`
- `src/data/gameSystems.js:7756` T `Zone Hopper`
- `src/data/gameSystems.js:7757` T `Visit 3 different combat zones.`
- `src/data/gameSystems.js:7769` T? `Each zone is unique. Explore at least 3!`
- `src/data/gameSystems.js:7770` T? `Use exits at the edge of town.`
- `src/data/gameSystems.js:7771` T? `Zone gadgets unlocked — sled, raft, torch!`
- `src/data/gameSystems.js:7778` T `Elemental Advantage`
- `src/data/gameSystems.js:7779` T `Kill a monster using element effectiveness.`
- `src/data/gameSystems.js:7791` T? `Use the effectiveness circle — 25% bonus damage.`
- `src/data/gameSystems.js:7792` T? `Flame > Frost > Storm > Stone...`
- `src/data/gameSystems.js:7793` T? `Deep and Abyss depths now accessible!`
- `src/data/gameSystems.js:7800` T? `Blacksmith Bron`
- `src/data/gameSystems.js:7801` T `Raw Materials`
- `src/data/gameSystems.js:7802` T `Mine 5 ore from any zone.`
- `src/data/gameSystems.js:7818` T? `Mine 5 ore from combat zones.`
- `src/data/gameSystems.js:7819` T? `Look for rock veins.`
- `src/data/gameSystems.js:7820` T? `Blacksmith now open! Forge melee weapons.`
- `src/data/gameSystems.js:7825` T? `Blacksmith Bron`
- `src/data/gameSystems.js:7826` T `First Forge`
- `src/data/gameSystems.js:7827` T `Forge a weapon at the Blacksmith.`
- `src/data/gameSystems.js:7839` T? `Bring ore to my workshop.`
- `src/data/gameSystems.js:7840` T? `Visit the Blacksmith.`
- `src/data/gameSystems.js:7841` T? `Woodworker + Reforging unlocked!`
- `src/data/gameSystems.js:7846` T? `Blacksmith Bron`
- `src/data/gameSystems.js:7847` T `Woodcraft`
- `src/data/gameSystems.js:7848` T `Craft a bow or staff at the Woodworker.`
- `src/data/gameSystems.js:7860` T? `The Woodworker shapes bows and staves.`
- `src/data/gameSystems.js:7861` T? `Chop trees, then visit Woodworker.`
- `src/data/gameSystems.js:7862` T? `Hardening unlocked! Risk it for a second bonus.`
- `src/data/gameSystems.js:7867` T? `Blacksmith Bron`
- `src/data/gameSystems.js:7868` T `Gem Setter`
- `src/data/gameSystems.js:7869` T `Cut a gem and slot it into a weapon.`
- `src/data/gameSystems.js:7881` T? `Cut a gem, slot it at the Enchanter.`
- `src/data/gameSystems.js:7882` T? `Gem Cutter then Enchanter.`
- `src/data/gameSystems.js:7883` T? `Shield crafting + Salvage Station unlocked!`
- `src/data/gameSystems.js:7889` T? `Healer Luna`
- `src/data/gameSystems.js:7890` T `First Aid`
- `src/data/gameSystems.js:7891` T `Cook a fish at the Kitchen.`
- `src/data/gameSystems.js:7903` T? `Cook a fish at the Kitchen!`
- `src/data/gameSystems.js:7904` T? `Catch fish, bring to Kitchen.`
- `src/data/gameSystems.js:7905` T? `Field cooking unlocked!`
- `src/data/gameSystems.js:7911` T? `Healer Luna`
- `src/data/gameSystems.js:7912` T `Hold the Line`
- `src/data/gameSystems.js:7913` T `Block 10 enemy attacks.`
- `src/data/gameSystems.js:7925` T? `Block 10 attacks with your shield.`
- `src/data/gameSystems.js:7926` T? `Hold the shield button.`
- `src/data/gameSystems.js:7927` T? `Shield gear slot unlocked!`
- `src/data/gameSystems.js:7933` T? `Healer Luna`
- `src/data/gameSystems.js:7934` T `Death and Taxes`
- `src/data/gameSystems.js:7935` T `Die and recover scattered items.`
- `src/data/gameSystems.js:7947` T? `Die and recover your items within 30s.`
- `src/data/gameSystems.js:7948` T? `Rush back to where you fell!`
- `src/data/gameSystems.js:7949` T? `Amulet crafting unlocked at the Blacksmith!`
- `src/data/gameSystems.js:7956` T? `Beastmaster Kai`
- `src/data/gameSystems.js:7957` T `The Weakened Prey`
- `src/data/gameSystems.js:7958` T `Capture your first pet.`
- `src/data/gameSystems.js:7970` T? `Weaken a monster below 20% HP, then trap it!`
- `src/data/gameSystems.js:7971` T? `Lock on and tap the trap.`
- `src/data/gameSystems.js:7972` T? `Pet combat unlocked! Your pet auto-attacks.`
- `src/data/gameSystems.js:7978` T? `Beastmaster Kai`
- `src/data/gameSystems.js:7979` T `Growing Pack`
- `src/data/gameSystems.js:7980` T `Capture 3 different pets.`
- `src/data/gameSystems.js:7992` T? `Catch 3 different pets!`
- `src/data/gameSystems.js:7993` T? `Try different zones.`
- `src/data/gameSystems.js:7994` T? `Pet loot radius doubled!`
- `src/data/gameSystems.js:8000` T? `Beastmaster Kai`
- `src/data/gameSystems.js:8001` T `Pet Power`
- `src/data/gameSystems.js:8002` T `Pet collects 20 loot drops.`
- `src/data/gameSystems.js:8014` T? `Let your pet collect 20 drops.`
- `src/data/gameSystems.js:8015` T? `Keep pet active while fighting.`
- `src/data/gameSystems.js:8016` T? `Trapping skill cap raised to Lv50!`
- `src/data/gameSystems.js:8023` T? `Veteran Ash`
- `src/data/gameSystems.js:8024` T `Critical Moment`
- `src/data/gameSystems.js:8025` T `Land 10 critical hits.`
- `src/data/gameSystems.js:8037` T? `Land 10 critical hits.`
- `src/data/gameSystems.js:8038` T? `Invest in Ferocity.`
- `src/data/gameSystems.js:8039` T? `Expanded reforge bonus pool!`
- `src/data/gameSystems.js:8045` T? `Veteran Ash`
- `src/data/gameSystems.js:8046` T `Status Master`
- `src/data/gameSystems.js:8047` T `Apply 5 different status effects.`
- `src/data/gameSystems.js:8059` T? `Apply 5 different statuses.`
- `src/data/gameSystems.js:8060` T? `Use different element weapons.`
- `src/data/gameSystems.js:8061` T? `All life skill caps removed! Train to Lv100.`
- `src/data/gameSystems.js:8067` T? `Veteran Ash`
- `src/data/gameSystems.js:8068` T `Collision Expert`
- `src/data/gameSystems.js:8069` T `Discover 15 unique collisions.`
- `src/data/gameSystems.js:8080` T? `Find 15 of the 36 collisions.`
- `src/data/gameSystems.js:8081` T? `Experiment with every pair.`
- `src/data/gameSystems.js:8082` T? `15 collisions mastered! True elemental warrior.`
- `src/data/gameSystems.js:8088` T? `Veteran Ash`
- `src/data/gameSystems.js:8089` T `Volatile Heart`
- `src/data/gameSystems.js:8090` T `Trigger a Volatile weapon collision.`
- `src/data/gameSystems.js:8102` T? `Volatile weapons are unstable power. Use one.`
- `src/data/gameSystems.js:8103` T? `Equip a Volatile weapon and trigger a collision.`
- `src/data/gameSystems.js:8104` T? `Chaos refined into power. You've mastered combat.`
- `src/data/gameSystems.js:8306` T? `Ready to race? Tap Race! Touch all 4 corner flags, then get back here before me. Sprint...`
- `src/data/gameSystems.js:8307` T? `I won! Want a rematch? Tap Race! and touch all 4 corner flags, then get back here befor...`
- `src/data/gameSystems.js:8308` T? `I won again! Tap Race! to try again. Farmer Bro's Zoom Juice makes you run faster, so d...`
- `src/data/gameSystems.js:8309` T? `wins for me! Don't give up. Drink Zoom Juice from your Bag and sprint the whole way. Ta...`
- `src/data/gameSystems.js:8320` T? `The Goo Grotto is for level`
- `src/data/gameSystems.js:8320` T? `and up, so take`
- `src/data/gameSystems.js:8322` T? `friends. I'm out of eulogies.`
- `src/data/gameSystems.js:8508` T `Honored`
- `src/data/gameSystems.js:8513` T `Neutral`
- `src/data/gameSystems.js:8518` T `Suspect`
- `src/data/gameSystems.js:8523` T `Outlaw`

### data: gemWorks (6)

- `src/data/say/gemWorks.js:4` T? `Cut gems`
- `src/data/say/gemWorks.js:5` T? `Set gems`
- `src/data/say/gemWorks.js:7` T? `Raw to polished`
- `src/data/say/gemWorks.js:8` T? `Polished into gear`
- `src/data/say/gemWorks.js:9` T? `Shards to gems`
- `src/data/say/gemWorks.js:10` T? `Gems into gear`

### data: gemcut (11)

- `src/data/say/gemcut.js:4` T? `Gem Cutter`
- `src/data/say/gemcut.js:5` T? `Gem Cutting Lv{lvl}`
- `src/data/say/gemcut.js:6` T? `Cut raw gems into polished gems for your gear. Higher Gem Cutting raises your success c...`
- `src/data/say/gemcut.js:8` T? `Your gems`
- `src/data/say/gemcut.js:9` T? `{elem} Gem`
- `src/data/say/gemcut.js:10` T? `◇ Raw: {raw} · ◆ Polished: {polished}`
- `src/data/say/gemcut.js:11` T? `Success: {pct}%`
- `src/data/say/gemcut.js:13` T? `Polished {gem}!`
- `src/data/say/gemcut.js:14` T? `Gem shattered!`
- `src/data/say/gemcut.js:15` T? `Gem Cutting Lv{lvl}!`
- `src/data/say/gemcut.js:16` T? `No raw gems yet. Defeat monsters out in the lands to find them.`

### data: hallPanel (27)

- `src/data/say/hallPanel.js:5` T? `Make a party in the Saloon; at 20 active members it is an alliance`
- `src/data/say/hallPanel.js:6` T? `Skill guilds`
- `src/data/say/hallPanel.js:7` T? `Your rank in each life skill’s guild, and its quests`
- `src/data/say/hallPanel.js:8` T? `[{tag}] {name}`
- `src/data/say/hallPanel.js:9` T? `Your clan`
- `src/data/say/hallPanel.js:10` T? `Invite waiting: [{tag}] {name}, from {from}`
- `src/data/say/hallPanel.js:11` T? `Make a clan, or join one when a clan leader invites you`
- `src/data/say/hallPanel.js:14` T? `Your mail`
- `src/data/say/hallPanel.js:15` T? `{n}× {name}`
- `src/data/say/hallPanel.js:16` T? `Nothing yet this visit. Sales, refunds, trade payouts and rewards come here, and so doe...`
- `src/data/say/hallPanel.js:17` T? `Messages from friends`
- `src/data/say/hallPanel.js:18` T? `Write to a friend. They read it when they next come in.`
- `src/data/say/hallPanel.js:20` T? `You are Well Rested: +{pct}% combat XP for {left} more.`
- `src/data/say/hallPanel.js:21` T? `A night here fills your health, stamina and mana, and makes you Well Rested: +{pct}% co...`
- `src/data/say/hallPanel.js:23` T? `Rest again to start the {mins} minutes over`
- `src/data/say/hallPanel.js:24` T? `Full health, stamina and mana, then Well Rested`
- `src/data/say/hallPanel.js:26` T? `Duel a player`
- `src/data/say/hallPanel.js:27` T? `Pick a player, then tap Duel on their card`
- `src/data/say/hallPanel.js:28` T? `The arena`
- `src/data/say/hallPanel.js:29` T? `Sign up for the gladiator arena`
- `src/data/say/hallPanel.js:31` T? `Invite a player`
- `src/data/say/hallPanel.js:32` T? `Pick a player, then tap Invite to Party on their card`
- `src/data/say/hallPanel.js:34` T? `Team up with other bros`
- `src/data/say/hallPanel.js:35` T? `Your party`
- `src/data/say/hallPanel.js:40` T? `Lv {lv}`
- `src/data/say/hallPanel.js:41` T? `You're not in a party. Up to 50 bros can team up and stay together until they leave: yo...`
- `src/data/say/hallPanel.js:42` T? `You're not in a party. Up to four bros can team up: you see each other's health, talk o...`

### data: hardenCosts (6)

- `src/data/hardenCosts.js:38` T? `Copper Bar`
- `src/data/hardenCosts.js:38` T? `Copper Bars`
- `src/data/hardenCosts.js:38` T? `Iron Bar`
- `src/data/hardenCosts.js:38` T? `Iron Bars`
- `src/data/hardenCosts.js:38` T? `Black Steel Bar`
- `src/data/hardenCosts.js:38` T? `Black Steel Bars`

### data: hardenedWood (11)

- `src/data/hardenedWood.js:25` T `Hardened Pine Wood`
- `src/data/hardenedWood.js:25` T? `Pine Log`
- `src/data/hardenedWood.js:25` T? `Pine Logs`
- `src/data/hardenedWood.js:26` T `Hardened Softwood`
- `src/data/hardenedWood.js:27` T `Hardened Hardwood`
- `src/data/hardenedWood.js:28` T `Hardened Cedar Wood`
- `src/data/hardenedWood.js:28` T? `Cedar Wood`
- `src/data/hardenedWood.js:28` T? `Cedar Wood`
- `src/data/hardenedWood.js:29` T `Hardened Maple Wood`
- `src/data/hardenedWood.js:29` T? `Maple Wood`
- `src/data/hardenedWood.js:29` T? `Maple Wood`

### data: heroExpanded (65)

- `src/data/say/heroExpanded.js:7` T? `{n} point`
- `src/data/say/heroExpanded.js:7` T? `{n} points`
- `src/data/say/heroExpanded.js:8` T? `{pts} of {cap} points`
- `src/data/say/heroExpanded.js:9` T? `{pts} of {cap}`
- `src/data/say/heroExpanded.js:18` T? `{stat} {value} — what is this?`
- `src/data/say/heroExpanded.js:19` T? `{vital} {cur} of {max}: what it is made of`
- `src/data/say/heroExpanded.js:22` T? `{n} to spend`
- `src/data/say/heroExpanded.js:23` T? `Close {window}`
- `src/data/say/heroExpanded.js:29` T? `Nothing equipped here.`
- `src/data/say/heroExpanded.js:30` T? `No stat bonuses.`
- `src/data/say/heroExpanded.js:33` T? `This character is playing in another window.`
- `src/data/say/heroExpanded.js:34` T? `Reconnecting to the server. Try again in a moment.`
- `src/data/say/heroExpanded.js:35` T? `No {pool} points to spend.`
- `src/data/say/heroExpanded.js:38` T? `{stat} is already at its cap.`
- `src/data/say/heroExpanded.js:41` T? `{perText} per point.`
- `src/data/say/heroExpanded.js:42` T? `Crit chance`
- `src/data/say/heroExpanded.js:43` T? `Crit damage`
- `src/data/say/heroExpanded.js:45` T? `does not change damage`
- `src/data/say/heroExpanded.js:46` T? `equip a weapon to see`
- `src/data/say/heroExpanded.js:48` T? `Each point: {perText}`
- `src/data/say/heroExpanded.js:49` T? `Weaker vs. higher levels`
- `src/data/say/heroExpanded.js:51` T? `Spend point`
- `src/data/say/heroExpanded.js:52` T? `✓ {n} point spent`
- `src/data/say/heroExpanded.js:52` T? `✓ {n} points spent`
- `src/data/say/heroExpanded.js:53` T? `Unspent Points`
- `src/data/say/heroExpanded.js:56` T? `Shared — Level {level}`
- `src/data/say/heroExpanded.js:57` T? `Every level-up in any combat skill also earns shared points. They buy the stats that be...`
- `src/data/say/heroExpanded.js:58` T? `The stats that belong to your character rather than to one weapon: HP, Defense, Mana, S...`
- `src/data/say/heroExpanded.js:59` T? `You have {n} shared point to spend.`
- `src/data/say/heroExpanded.js:59` T? `You have {n} shared points to spend.`
- `src/data/say/heroExpanded.js:60` T? `Level up any combat skill to earn more.`
- `src/data/say/heroExpanded.js:61` T? `{skill} — Level {level}`
- `src/data/say/heroExpanded.js:62` T? `Its points buy only this weapon's six stats: Range, Power, Speed, Luck, Special and Ele...`
- `src/data/say/heroExpanded.js:63` T? `You have {n} {lane} point to spend.`
- `src/data/say/heroExpanded.js:63` T? `You have {n} {lane} points to spend.`
- `src/data/say/heroExpanded.js:64` T? `Fight with a {lane} weapon to earn more.`
- `src/data/say/heroExpanded.js:67` T? `{lane}, level {level}`
- `src/data/say/heroExpanded.js:69` T? `{lane} — level {level} — {n} point to spend — {spent} already applied`
- `src/data/say/heroExpanded.js:70` T? `{lane} — level {level} — {n} points to spend — {spent} already applied`
- `src/data/say/heroExpanded.js:72` T? `{n} points to spend on {lane}`
- `src/data/say/heroExpanded.js:73` T? `{n} PT`
- `src/data/say/heroExpanded.js:73` T? `{n} PTS`
- `src/data/say/heroExpanded.js:74` T? `{n} points applied to {lane}`
- `src/data/say/heroExpanded.js:75` T? `{n} SPENT`
- `src/data/say/heroExpanded.js:78` T? `{stat}{lane}, {pts}. {perText}{perPoint}.`
- `src/data/say/heroExpanded.js:79` T? `for {lane}`
- `src/data/say/heroExpanded.js:80` T? `per point`
- `src/data/say/heroExpanded.js:81` T? `{stat} — {pts} — now {now} — {perText}{perPoint}`
- `src/data/say/heroExpanded.js:82` T? `{stat}{lane}: {pts} applied`
- `src/data/say/heroExpanded.js:85` T? `{lane}, level {level}. {pools}`
- `src/data/say/heroExpanded.js:86` T? `{lane} {n} to spend`
- `src/data/say/heroExpanded.js:87` T? `Shared, level {level}. {n} to spend`
- `src/data/say/heroExpanded.js:88` T? `Tap a weapon to see its points`
- `src/data/say/heroExpanded.js:89` T? `Shared stats`
- `src/data/say/heroExpanded.js:90` T? `Show {lane}'s points`
- `src/data/say/heroExpanded.js:93` T? `Attack Speed`
- `src/data/say/heroExpanded.js:94` T? `Now {now}`
- `src/data/say/heroExpanded.js:95` T? `Character · every weapon`
- `src/data/say/heroExpanded.js:98` T? `Back to categories`
- `src/data/say/heroExpanded.js:101` T? `About {lane}`
- `src/data/say/heroExpanded.js:105` T? `Tap again: every point comes back`
- `src/data/say/heroExpanded.js:106` T? `↺ Reset points (free)`
- `src/data/say/heroExpanded.js:109` T? `BUILD POINTS`
- `src/data/say/heroExpanded.js:110` T? `{n} AVAILABLE`
- `src/data/say/heroExpanded.js:111` T? `Lv {level}`

### data: incomingTrade (4)

- `src/data/say/incomingTrade.js:4` T? `Incoming Trade`
- `src/data/say/incomingTrade.js:5` T? `{name} wants to trade. They offer:`
- `src/data/say/incomingTrade.js:7` T? `Trade accepted!`
- `src/data/say/incomingTrade.js:8` T? `Open trade`

### data: infoPanel (16)

- `src/data/say/infoPanel.js:4` T? `{count} online`
- `src/data/say/infoPanel.js:6` T? `⚠ Combat numbers may read low — {why}.`
- `src/data/say/infoPanel.js:7` T? `not connected to the server`
- `src/data/say/infoPanel.js:8` T? `server has not sent combat rules yet`
- `src/data/say/infoPanel.js:9` T? `character has no trained-skill record`
- `src/data/say/infoPanel.js:10` T? `link {link} · rules {rules} · skills {skills}`
- `src/data/say/infoPanel.js:14` T? `build {game} ({sha})`
- `src/data/say/infoPanel.js:20` T? `Check your wallet…`
- `src/data/say/infoPanel.js:21` T? `✓ {n} Hemi Bro · check again`
- `src/data/say/infoPanel.js:21` T? `✓ {n} Hemi Bros · check again`
- `src/data/say/infoPanel.js:22` T? `Verify my Hemi Bros`
- `src/data/say/infoPanel.js:23` T? `Hemi Bro holder? Open BroTown in your wallet app to verify`
- `src/data/say/infoPanel.js:24` T? `This wallet holds no Hemi Bros.`
- `src/data/say/infoPanel.js:26` T? `✓ Hemi Bro #{id} verified`
- `src/data/say/infoPanel.js:27` T? `Verify Hemi Bro #{id}`
- `src/data/say/infoPanel.js:28` T? `No wallet in this browser`

### data: infoPopup (8)

- `src/data/say/infoPopup.js:5` T? `At its cap — no more points can go here.`
- `src/data/say/infoPopup.js:7` T? `Got it`
- `src/data/say/infoPopup.js:9` T? `{label}, {n} point to spend`
- `src/data/say/infoPopup.js:9` T? `{label}, {n} points to spend`
- `src/data/say/infoPopup.js:11` T? `One fewer point`
- `src/data/say/infoPopup.js:12` T? `One more point`
- `src/data/say/infoPopup.js:14` T? `Spend {n} point`
- `src/data/say/infoPopup.js:14` T? `Spend {n} points`

### data: inspectCard (15)

- `src/data/say/inspectCard.js:11` T? `Lv {level} · {archetype} · {pole}`
- `src/data/say/inspectCard.js:15` T? `{hp} HP`
- `src/data/say/inspectCard.js:16` T? `{stam} stam`
- `src/data/say/inspectCard.js:17` T? `{pct}% eva`
- `src/data/say/inspectCard.js:18` T? `{mp} MP`
- `src/data/say/inspectCard.js:22` T? `(no vows yet)`
- `src/data/say/inspectCard.js:23` T? `vowed {days} days`
- `src/data/say/inspectCard.js:24` T? `vowed {days} days · with {partner}`
- `src/data/say/inspectCard.js:35` T? `Gem Cutting`
- `src/data/say/inspectCard.js:45` T? `(no titles yet)`
- `src/data/say/inspectCard.js:46` T? `{zones} zones · {apex} apex kills`
- `src/data/say/inspectCard.js:47` T? `All titles:`
- `src/data/say/inspectCard.js:51` T? `{count} entries`
- `src/data/say/inspectCard.js:52` T? `Day {day}`
- `src/data/say/inspectCard.js:55` T? `long-press any name or number to learn more · tap to dismiss`

### data: inspectPlayer (19)

- `src/data/say/inspectPlayer.js:4` T? `Party invite sent`
- `src/data/say/inspectPlayer.js:5` T? `Duel sent`
- `src/data/say/inspectPlayer.js:6` T? `Removed friend`
- `src/data/say/inspectPlayer.js:7` T? `Friend request sent!`
- `src/data/say/inspectPlayer.js:8` T? `Threat on cooldown`
- `src/data/say/inspectPlayer.js:9` T? `Threat issued!`
- `src/data/say/inspectPlayer.js:10` T? `Clan invite sent`
- `src/data/say/inspectPlayer.js:12` T? `Muted — their chat stops here`
- `src/data/say/inspectPlayer.js:15` T? `Can't block in lawless zone!`
- `src/data/say/inspectPlayer.js:16` T? `Blocked: no chat, emotes or requests from them`
- `src/data/say/inspectPlayer.js:19` T? `Inspect {name}`
- `src/data/say/inspectPlayer.js:21` T? `LV {lv}`
- `src/data/say/inspectPlayer.js:22` T? `In party`
- `src/data/say/inspectPlayer.js:25` T? `Invite to Party`
- `src/data/say/inspectPlayer.js:27` T? `Friends — tap to remove`
- `src/data/say/inspectPlayer.js:28` T? `Add friend`
- `src/data/say/inspectPlayer.js:30` T? `Add Friend`
- `src/data/say/inspectPlayer.js:33` T? `Invite to [{tag}]`
- `src/data/say/inspectPlayer.js:42` T? `Why are you reporting {name}?`

### data: inventoryDash (3)

- `src/data/say/inventoryDash.js:10` T? `Your bag is empty.`
- `src/data/say/inventoryDash.js:11` T? `No {what} items yet.`
- `src/data/say/inventoryDash.js:13` T? `Defeat monsters and gather materials to fill it up.`

### data: inventoryPanel (37)

- `src/data/say/inventoryPanel.js:5` T? `Active: {slot}`
- `src/data/say/inventoryPanel.js:10` T? `Melee Weapon`
- `src/data/say/inventoryPanel.js:11` T? `Ranged Weapon`
- `src/data/say/inventoryPanel.js:19` T? `E1: {element} ({status})`
- `src/data/say/inventoryPanel.js:20` T? `E2: {element} ({status})`
- `src/data/say/inventoryPanel.js:23` T? `No elements`
- `src/data/say/inventoryPanel.js:25` T? `WORN ARMOR`
- `src/data/say/inventoryPanel.js:26` T? `Steel Plate`
- `src/data/say/inventoryPanel.js:28` T? `Steel Greaves`
- `src/data/say/inventoryPanel.js:31` T? `Chest · under armor`
- `src/data/say/inventoryPanel.js:34` T? `No Armor`
- `src/data/say/inventoryPanel.js:35` T? `Attuned: {attunement}`
- `src/data/say/inventoryPanel.js:36` T? `No attunement`
- `src/data/say/inventoryPanel.js:38` T? `{tier} Amulet`
- `src/data/say/inventoryPanel.js:40` T? `{gem} gem`
- `src/data/say/inventoryPanel.js:41` T? `No gem — visit the Enchanter to slot one`
- `src/data/say/inventoryPanel.js:42` T? `No Amulet`
- `src/data/say/inventoryPanel.js:43` T? `Craft at Blacksmith from gold bars (nuggets: {nuggets}/{perBar}, bars: {bars})`
- `src/data/say/inventoryPanel.js:46` T? `No bonuses yet`
- `src/data/say/inventoryPanel.js:47` T? `No Shield`
- `src/data/say/inventoryPanel.js:48` T? `Craft at the Blacksmith from ore`
- `src/data/say/inventoryPanel.js:50` T? `Golden Ticket`
- `src/data/say/inventoryPanel.js:51` T? `Open Golden Ticket`
- `src/data/say/inventoryPanel.js:53` T? `Food ({count})`
- `src/data/say/inventoryPanel.js:54` T? `{fish} ×{qty} (+{heal}HP)`
- `src/data/say/inventoryPanel.js:55` T? `+{heal} HP`
- `src/data/say/inventoryPanel.js:57` T? `Weapon Stash ({count}/{max})`
- `src/data/say/inventoryPanel.js:58` T? `Empty. Weapon drops are auto-stashed here for comparison.`
- `src/data/say/inventoryPanel.js:59` T? `Need {label} {req} (have {have})`
- `src/data/say/inventoryPanel.js:60` T? `Not sold: no connection`
- `src/data/say/inventoryPanel.js:62` T? `Sell ({gold}g)`
- `src/data/say/inventoryPanel.js:64` T? `Codex: {count} collisions discovered`
- `src/data/say/inventoryPanel.js:66` T? `Pets: {count}/{max}`
- `src/data/say/inventoryPanel.js:67` T? `Trapping Lv{level}`
- `src/data/say/inventoryPanel.js:68` T? `No pets. Weaken a monster to <20% HP then tap 🪤 to capture!`
- `src/data/say/inventoryPanel.js:69` T? `Lv{level} {archetype}`
- `src/data/say/inventoryPanel.js:70` T? `Tap a pet to set active. Active pet follows you and auto-collects loot within {radius}px.`

### data: inventorySurface (6)

- `src/data/say/inventorySurface.js:4` T? `Newest first`
- `src/data/say/inventorySurface.js:5` T? `Oldest first`
- `src/data/say/inventorySurface.js:6` T? `Tier (high to low)`
- `src/data/say/inventorySurface.js:7` T? `Tier (low to high)`
- `src/data/say/inventorySurface.js:18` T? `No matches`
- `src/data/say/inventorySurface.js:19` T? `Nothing here yet`

### data: itemDetail (70)

- `src/data/say/itemDetail.js:7` T? `{n} make a {element} Gem at the Gem Works`
- `src/data/say/itemDetail.js:8` T? `Cut into a {element} Gem at the Gem Works`
- `src/data/say/itemDetail.js:9` T? `Set into your gear at the Gem Works`
- `src/data/say/itemDetail.js:10` T? `· on a weapon: {does}`
- `src/data/say/itemDetail.js:11` T? `Crack at the Gem Works: {chance}% hold a Raw {element} Gem`
- `src/data/say/itemDetail.js:12` T? `Cut into any elemental gem at the Gem Works`
- `src/data/say/itemDetail.js:14` T? `· Needs level {req}`
- `src/data/say/itemDetail.js:15` T? `(you are {have})`
- `src/data/say/itemDetail.js:16` T? `· Needs {req} Defense`
- `src/data/say/itemDetail.js:17` T? `(you have {have})`
- `src/data/say/itemDetail.js:19` T? `Same {unit} as equipped`
- `src/data/say/itemDetail.js:20` T? `{sign}{mag}{sep}{unit} vs equipped`
- `src/data/say/itemDetail.js:23` T? `% Damage Reduced`
- `src/data/say/itemDetail.js:25` T? `Tap Block in a fight to raise it`
- `src/data/say/itemDetail.js:25` T? `Press Q to block`
- `src/data/say/itemDetail.js:27` T? `+{hp} HP when eaten`
- `src/data/say/itemDetail.js:28` T? `Open it to claim your cape`
- `src/data/say/itemDetail.js:29` T? `Open it for a prize — usually coins, sometimes fish, a rare gem or armour`
- `src/data/say/itemDetail.js:30` T? `Worn — a contest prize`
- `src/data/say/itemDetail.js:31` T? `A contest prize, in your bag`
- `src/data/say/itemDetail.js:32` T? `{desc} · replaces your meal`
- `src/data/say/itemDetail.js:33` T? `{desc} · replaces your brew`
- `src/data/say/itemDetail.js:34` T? `Cook over a campfire`
- `src/data/say/itemDetail.js:36` T? `Light a campfire, or harden {n} into {name} at the Woodworker`
- `src/data/say/itemDetail.js:37` T? `Light a campfire to cook at`
- `src/data/say/itemDetail.js:38` T? `Hardens a {log} bow or staff at the Woodworker`
- `src/data/say/itemDetail.js:39` T? `Made from {n} {log}`
- `src/data/say/itemDetail.js:40` T? `Smelt {n} into a {name} at the Blacksmith`
- `src/data/say/itemDetail.js:41` T? `Forge into armor at the Blacksmith`
- `src/data/say/itemDetail.js:42` T? `Smelted from {n} {ore}`
- `src/data/say/itemDetail.js:43` T? `Quantity: {n}`
- `src/data/say/itemDetail.js:46` T? `Damage {dmg} · DPS {dps}`
- `src/data/say/itemDetail.js:49` T? `{tier} · Shield`
- `src/data/say/itemDetail.js:51` T? `{pct}% damage reduced`
- `src/data/say/itemDetail.js:53` T? `{tier} · Chest`
- `src/data/say/itemDetail.js:55` T? `Armor · Legs`
- `src/data/say/itemDetail.js:56` T? `Worn armor`
- `src/data/say/itemDetail.js:57` T? `In bag`
- `src/data/say/itemDetail.js:58` T? `Steel · {slot}`
- `src/data/say/itemDetail.js:61` T? `Golden Ticket`
- `src/data/say/itemDetail.js:62` T? `{colour} Cape`
- `src/data/say/itemDetail.js:66` T? `DMG {dmg} · DPS {dps}`
- `src/data/say/itemDetail.js:69` T? `{tier} Shield`
- `src/data/say/itemDetail.js:70` T? `{tier} shield · raise to block`
- `src/data/say/itemDetail.js:73` T? `Plate armor · chest · raises defense`
- `src/data/say/itemDetail.js:74` T? `Plate greaves · legs · raises defense`
- `src/data/say/itemDetail.js:76` T? `Cloth shirt · worn under armor`
- `src/data/say/itemDetail.js:80` T? `Nothing to equip here.`
- `src/data/say/itemDetail.js:81` T? `⌄ swipe · {n} items`
- `src/data/say/itemDetail.js:83` T? `Chest — Layers`
- `src/data/say/itemDetail.js:84` T? `No chest armor`
- `src/data/say/itemDetail.js:85` T? `Armor · top layer`
- `src/data/say/itemDetail.js:86` T? `Clothing · under armor`
- `src/data/say/itemDetail.js:88` T? `No greaves`
- `src/data/say/itemDetail.js:89` T? `Armor · legs`
- `src/data/say/itemDetail.js:91` T? `Put a price on it first`
- `src/data/say/itemDetail.js:92` T? `That piece moved — open it again`
- `src/data/say/itemDetail.js:93` T? `That weapon moved — open it again`
- `src/data/say/itemDetail.js:94` T? `The store could not take it`
- `src/data/say/itemDetail.js:97` T? `Unpin from the top of the bag`
- `src/data/say/itemDetail.js:98` T? `Pin to the top of the bag`
- `src/data/say/itemDetail.js:101` T? `Drop on the ground`
- `src/data/say/itemDetail.js:102` T? `How many`
- `src/data/say/itemDetail.js:104` T? `Only you can see it for a minute, then anyone can pick it up. At two minutes it starts ...`
- `src/data/say/itemDetail.js:105` T? `Drop {n}`
- `src/data/say/itemDetail.js:106` T? `Drop it`
- `src/data/say/itemDetail.js:109` T? `Sell in the Auction House`
- `src/data/say/itemDetail.js:110` T? `Price in gold`
- `src/data/say/itemDetail.js:111` T? `It leaves your bag now and comes back in a week if nobody buys it.`
- `src/data/say/itemDetail.js:113` T? `Put it up`

### data: itemTooltip (21)

- `src/data/say/itemTooltip.js:4` T? `Tier {tier}`
- `src/data/say/itemTooltip.js:5` T? `Hardness {hardness}`
- `src/data/say/itemTooltip.js:6` T? `Temper {temper}`
- `src/data/say/itemTooltip.js:8` T? `Hits harder`
- `src/data/say/itemTooltip.js:10` T? `A bit slower`
- `src/data/say/itemTooltip.js:11` T? `Lucky strike`
- `src/data/say/itemTooltip.js:15` T? `Crit chance`
- `src/data/say/itemTooltip.js:17` T? `Salvaged {name} · Undo`
- `src/data/say/itemTooltip.js:19` T? `Salvaged {count} items · Undo All`
- `src/data/say/itemTooltip.js:21` T? `VS YOUR {gear}`
- `src/data/say/itemTooltip.js:23` T? `COMPARED TO WHAT YOU'RE WEARING`
- `src/data/say/itemTooltip.js:27` T? `{filled} of {slots} slots`
- `src/data/say/itemTooltip.js:29` T? `{low}-{high}g recently`
- `src/data/say/itemTooltip.js:34` T? `Take off`
- `src/data/say/itemTooltip.js:38` T? `Keep safe`
- `src/data/say/itemTooltip.js:39` T? `Add shortcut`
- `src/data/say/itemTooltip.js:42` T? `Pick a shortcut slot to assign:`
- `src/data/say/itemTooltip.js:43` T? `SLOT {slot}`
- `src/data/say/itemTooltip.js:46` T? `forged by {crafter}`
- `src/data/say/itemTooltip.js:47` T? `forged by {crafter} · {when}`
- `src/data/say/itemTooltip.js:50` T? `{days} days ago`

### data: items (103)

- `src/data/items.js:3` T? `Ember Crystal`
- `src/data/items.js:3` T? `Magma Ore`
- `src/data/items.js:3` T? `Ash Root Seed`
- `src/data/items.js:3` T? `Fire Resist`
- `src/data/items.js:3` T? `Charred Timber`
- `src/data/items.js:3` T? `Lava Eel`
- `src/data/items.js:3` T? `Flame Gem`
- `src/data/items.js:4` T? `Frost Shard`
- `src/data/items.js:4` T? `Glacial Ore`
- `src/data/items.js:4` T? `Ice Cap Seed`
- `src/data/items.js:4` T? `Frost Resist`
- `src/data/items.js:4` T? `Ice Trout`
- `src/data/items.js:4` T? `Frost Gem`
- `src/data/items.js:5` T? `Tidal Pearl`
- `src/data/items.js:5` T? `Coral Ore`
- `src/data/items.js:5` T? `Kelp Seed`
- `src/data/items.js:5` T? `Regen Boost`
- `src/data/items.js:5` T? `Tidal Bass`
- `src/data/items.js:5` T? `Water Gem`
- `src/data/items.js:6` T? `Toxic Crystal`
- `src/data/items.js:6` T? `Blight Ore`
- `src/data/items.js:6` T? `Fungus Spore`
- `src/data/items.js:6` T? `Poison Resist`
- `src/data/items.js:6` T? `Bog Catfish`
- `src/data/items.js:6` T? `Venom Gem`
- `src/data/items.js:7` T? `Spark Crystal`
- `src/data/items.js:7` T? `Storm Iron`
- `src/data/items.js:7` T? `Static Moss Seed`
- `src/data/items.js:7` T? `Speed Boost`
- `src/data/items.js:7` T? `Lightning Oak`
- `src/data/items.js:7` T? `Spark Fin`
- `src/data/items.js:7` T? `Storm Gem`
- `src/data/items.js:8` T? `Earth Crystal`
- `src/data/items.js:8` T? `Dense Ore`
- `src/data/items.js:8` T? `Rock Vine`
- `src/data/items.js:8` T? `Cave Lichen Seed`
- `src/data/items.js:8` T? `Defense Boost`
- `src/data/items.js:8` T? `Petrified Wood`
- `src/data/items.js:8` T? `Cave Blindfish`
- `src/data/items.js:8` T? `Stone Gem`
- `src/data/items.js:9` T? `Zephyr Crystal`
- `src/data/items.js:9` T? `Sky Ore`
- `src/data/items.js:9` T? `Whisperleaf Seed`
- `src/data/items.js:9` T? `Agility Boost`
- `src/data/items.js:9` T? `Cloud Minnow`
- `src/data/items.js:9` T? `Wind Gem`
- `src/data/items.js:10` T? `Shadow Essence`
- `src/data/items.js:10` T? `Void Ore`
- `src/data/items.js:10` T? `Shade Root Seed`
- `src/data/items.js:10` T? `Curse Resist`
- `src/data/items.js:10` T? `Void Eel`
- `src/data/items.js:10` T? `Dark Gem`
- `src/data/items.js:11` T? `Radiant Shard`
- `src/data/items.js:11` T? `Celestial Ore`
- `src/data/items.js:11` T? `Lightmoss Seed`
- `src/data/items.js:11` T? `Holy Boost`
- `src/data/items.js:11` T? `Sun Koi`
- `src/data/items.js:11` T? `Light Gem`
- `src/data/items.js:35` T `Copper Bar`
- `src/data/items.js:35` T? `Copper Ore`
- `src/data/items.js:37` T `Iron Bar`
- `src/data/items.js:37` T? `Iron Ore`
- `src/data/items.js:38` T `Black Steel Bar`
- `src/data/items.js:38` T? `Black Steel Ore`
- `src/data/items.js:63` T `Copper Torso`
- `src/data/items.js:64` T `Copper Greaves`
- `src/data/items.js:65` T `Iron Torso`
- `src/data/items.js:66` T `Iron Greaves`
- `src/data/items.js:67` T `Black Steel Torso`
- `src/data/items.js:68` T `Black Steel Greaves`
- `src/data/items.js:72` T `Simple`
- `src/data/items.js:72` T `A thin gold chain`
- `src/data/items.js:73` T `Ornate`
- `src/data/items.js:73` T `Decorative filigree`
- `src/data/items.js:74` T `Regal`
- `src/data/items.js:74` T `Fit for royalty`
- `src/data/items.js:75` T `Mythic`
- `src/data/items.js:75` T `Radiates ancient power`
- `src/data/items.js:79` T `Elemental Damage`
- `src/data/items.js:80` T `Max Mana`
- `src/data/items.js:81` T `HP Regen`
- `src/data/items.js:82` T `Max HP`
- `src/data/items.js:83` T `Attack Speed`
- `src/data/items.js:84` T `Elemental Resistance`
- `src/data/items.js:85` T `Move Speed`
- `src/data/items.js:86` T `Crit Damage`
- `src/data/items.js:87` T `Stamina Regen`
- `src/data/items.js:102` T `Block Reduction`
- `src/data/items.js:103` T `Thorns Damage`
- `src/data/items.js:104` T `HP on Block`
- `src/data/items.js:105` T `Status Resist`
- `src/data/items.js:106` T `Counter Damage`
- `src/data/items.js:107` T `Flat Dmg Reduction`
- `src/data/items.js:108` T `Dodge Distance`
- `src/data/items.js:109` T `Death Save`
- `src/data/items.js:110` T `Shield Regen`
- `src/data/items.js:164` T `ore`
- `src/data/items.js:166` T `gold`
- `src/data/items.js:239` T `Shallow`
- `src/data/items.js:240` T `Mid`
- `src/data/items.js:241` T `Deep`
- `src/data/items.js:242` T `Abyss`
- `src/data/items.js:243` T `Core`

### data: joinGate (4)

- `src/data/joinGate.js:76` T? `Name your bro first`
- `src/data/joinGate.js:77` T? `Type at least 2 letters`
- `src/data/joinGate.js:82` T? `Pick another name`
- `src/data/joinGate.js:83` T? `Pinch back to 100% zoom`

### data: journey (11)

- `src/data/say/journey.js:6` T? `Lifetime Gold`
- `src/data/say/journey.js:7` T? `Lifetime XP`
- `src/data/say/journey.js:8` T? `Duels Won`
- `src/data/say/journey.js:9` T? `Deepest Zone`
- `src/data/say/journey.js:12` T? `{count} shot`
- `src/data/say/journey.js:12` T? `{count} shots`
- `src/data/say/journey.js:13` T? `no shots yet`
- `src/data/say/journey.js:14` T? `Basic attacks that hit an enemy. Specials are not counted.`
- `src/data/say/journey.js:15` T? `Your last 200: {recent}.`
- `src/data/say/journey.js:17` T? `Level {level} recorded on Hemi`
- `src/data/say/journey.js:18` T? `Tap to view the transaction`

### data: keyboardHints (9)

- `src/data/say/keyboardHints.js:5` T? `Show the keyboard controls`
- `src/data/say/keyboardHints.js:6` T? `Hide the keyboard controls`
- `src/data/say/keyboardHints.js:7` T? `Show the keyboard controls (H)`
- `src/data/say/keyboardHints.js:8` T? `Hide the keyboard controls (H)`
- `src/data/say/keyboardHints.js:10` T? `Fewer keys`
- `src/data/say/keyboardHints.js:11` T? `More keys`
- `src/data/say/keyboardHints.js:13` T? `Show keyboard controls`
- `src/data/say/keyboardHints.js:14` T? `Hide keyboard controls`
- `src/data/say/keyboardHints.js:15` T? `Hide these (H)`

### data: leaderboard (50)

- `src/data/say/leaderboard.js:5` T? `Overall power`
- `src/data/say/leaderboard.js:11` T? `{stat} points`
- `src/data/say/leaderboard.js:14` T? `Achievement points`
- `src/data/say/leaderboard.js:23` T? `Gem Cutting`
- `src/data/say/leaderboard.js:26` T? `Daily spin`
- `src/data/say/leaderboard.js:27` T? `Coin flip`
- `src/data/say/leaderboard.js:28` T? `Biggest fish`
- `src/data/say/leaderboard.js:38` T? `{v} AP`
- `src/data/say/leaderboard.js:39` T? `{v} kill`
- `src/data/say/leaderboard.js:40` T? `{v} kills`
- `src/data/say/leaderboard.js:41` T? `{v} pt`
- `src/data/say/leaderboard.js:42` T? `{v} pts`
- `src/data/say/leaderboard.js:45` T? `Rank {place}: {name}, {value}{gone}`
- `src/data/say/leaderboard.js:46` T? `level {lv}`
- `src/data/say/leaderboard.js:47` T? `, a deleted character`
- `src/data/say/leaderboard.js:49` T? `400 points ahead = 10× likelier to win`
- `src/data/say/leaderboard.js:50` T? `Power: {hint}`
- `src/data/say/leaderboard.js:51` T? `What Power means`
- `src/data/say/leaderboard.js:56` T? `Melee, Bow and Magic levels added up`
- `src/data/say/leaderboard.js:58` T? `Show the total`
- `src/data/say/leaderboard.js:59` T? `Show Melee, Bow and Magic`
- `src/data/say/leaderboard.js:62` T? `Nobody has achievement points yet.`
- `src/data/say/leaderboard.js:63` T? `Nobody has a kill yet.`
- `src/data/say/leaderboard.js:64` T? `Nobody has put points in this yet.`
- `src/data/say/leaderboard.js:65` T? `Nobody has trained this yet.`
- `src/data/say/leaderboard.js:67` T? `Biggest wins`
- `src/data/say/leaderboard.js:68` T? `Biggest losses`
- `src/data/say/leaderboard.js:69` T? `The spin's records are closed for now.`
- `src/data/say/leaderboard.js:70` T? `The records can't be read right now.`
- `src/data/say/leaderboard.js:71` T? `Nobody has taken a pot from the daily spin yet.`
- `src/data/say/leaderboard.js:72` T? `Nobody has lost a pot to double or nothing yet.`
- `src/data/say/leaderboard.js:73` T? `Won from Ace on one flip`
- `src/data/say/leaderboard.js:74` T? `Lost to Ace on one flip`
- `src/data/say/leaderboard.js:75` T? `Nobody has won a flip against Ace yet.`
- `src/data/say/leaderboard.js:76` T? `Nobody has lost a flip to Ace yet.`
- `src/data/say/leaderboard.js:86` T? `Kinds of board`
- `src/data/say/leaderboard.js:87` T? `{board}: tap to choose a board`
- `src/data/say/leaderboard.js:89` T? `Close the list of boards`
- `src/data/say/leaderboard.js:90` T? `All-time leaderboard`
- `src/data/say/leaderboard.js:93` T? `Rank {rank}`
- `src/data/say/leaderboard.js:94` T? `{name}, a deleted character`
- `src/data/say/leaderboard.js:95` T? `{name}, you`
- `src/data/say/leaderboard.js:99` T? `{count} players online`
- `src/data/say/leaderboard.js:108` T? `Skill Total`
- `src/data/say/leaderboard.js:109` T? `Achievement Pts`
- `src/data/say/leaderboard.js:110` T? `Monsters Killed`
- `src/data/say/leaderboard.js:111` T? `Dungeons Cleared`
- `src/data/say/leaderboard.js:112` T? `Gold Earned`
- `src/data/say/leaderboard.js:117` T? `Lv {lv}`
- `src/data/say/leaderboard.js:118` T? `Connect with more players to see rankings!`

### data: lifeSkills (106)

- `src/data/lifeSkills.js:14` T `Rough`
- `src/data/lifeSkills.js:15` T `Common`
- `src/data/lifeSkills.js:16` T `Refined`
- `src/data/lifeSkills.js:17` T `Quality`
- `src/data/lifeSkills.js:18` T `Fine`
- `src/data/lifeSkills.js:19` T `Superior`
- `src/data/lifeSkills.js:20` T `Rare`
- `src/data/lifeSkills.js:21` T `Exotic`
- `src/data/lifeSkills.js:22` T `Epic`
- `src/data/lifeSkills.js:23` T `Mythic`
- `src/data/lifeSkills.js:24` T `Legendary`
- `src/data/lifeSkills.js:25` T `Ancient`
- `src/data/lifeSkills.js:26` T `Primeval`
- `src/data/lifeSkills.js:27` T `Divine`
- `src/data/lifeSkills.js:28` T `Celestial`
- `src/data/lifeSkills.js:29` T `Astral`
- `src/data/lifeSkills.js:30` T `Shadow`
- `src/data/lifeSkills.js:31` T `Radiant`
- `src/data/lifeSkills.js:32` T `Eternal`
- `src/data/lifeSkills.js:33` T `Transcendent`
- `src/data/lifeSkills.js:162` T `Minnow`
- `src/data/lifeSkills.js:162` T? `Shallow Pool`
- `src/data/lifeSkills.js:163` T `Clownfish`
- `src/data/lifeSkills.js:163` T? `Coral Patch`
- `src/data/lifeSkills.js:164` T `Trout`
- `src/data/lifeSkills.js:164` T? `River Bend`
- `src/data/lifeSkills.js:168` T `Salmon`
- `src/data/lifeSkills.js:168` T? `Cold Run`
- `src/data/lifeSkills.js:169` T `Pike`
- `src/data/lifeSkills.js:169` T? `Reed Bed`
- `src/data/lifeSkills.js:177` T `Pine Log`
- `src/data/lifeSkills.js:178` T `Softwood`
- `src/data/lifeSkills.js:178` T? `Young Tree`
- `src/data/lifeSkills.js:179` T `Hardwood`
- `src/data/lifeSkills.js:181` T `Cedar Wood`
- `src/data/lifeSkills.js:182` T `Maple Wood`
- `src/data/lifeSkills.js:183` T `Dense Wood`
- `src/data/lifeSkills.js:183` T? `Ancient Oak`
- `src/data/lifeSkills.js:184` T `Crystal Wood`
- `src/data/lifeSkills.js:184` T? `Crystal Tree`
- `src/data/lifeSkills.js:185` T `Ironbark`
- `src/data/lifeSkills.js:185` T? `Iron Tree`
- `src/data/lifeSkills.js:186` T `Elder Wood`
- `src/data/lifeSkills.js:186` T? `Elder Tree`
- `src/data/lifeSkills.js:187` T `Spirit Wood`
- `src/data/lifeSkills.js:187` T? `Spirit Tree`
- `src/data/lifeSkills.js:188` T `Ancient Timber`
- `src/data/lifeSkills.js:188` T? `World Tree`
- `src/data/lifeSkills.js:189` T `Storm Wood`
- `src/data/lifeSkills.js:189` T? `Lightning Oak`
- `src/data/lifeSkills.js:190` T `Petrified Wood`
- `src/data/lifeSkills.js:190` T? `Stone Tree`
- `src/data/lifeSkills.js:191` T `Moon Wood`
- `src/data/lifeSkills.js:191` T? `Moon Tree`
- `src/data/lifeSkills.js:192` T `Void Timber`
- `src/data/lifeSkills.js:192` T? `Void Tree`
- `src/data/lifeSkills.js:193` T `Phoenix Wood`
- `src/data/lifeSkills.js:193` T? `Ember Tree`
- `src/data/lifeSkills.js:194` T `Shadowthorn`
- `src/data/lifeSkills.js:194` T? `Shadow Tree`
- `src/data/lifeSkills.js:195` T `Gleamwood`
- `src/data/lifeSkills.js:195` T? `Radiant Tree`
- `src/data/lifeSkills.js:196` T `Eternal Bark`
- `src/data/lifeSkills.js:196` T? `Eternal Tree`
- `src/data/lifeSkills.js:197` T `Origin Wood`
- `src/data/lifeSkills.js:197` T? `Origin Tree`
- `src/data/lifeSkills.js:201` T `Copper Ore`
- `src/data/lifeSkills.js:201` T? `Dirt Mound`
- `src/data/lifeSkills.js:202` T `Iron Ore`
- `src/data/lifeSkills.js:202` T? `Rock Vein`
- `src/data/lifeSkills.js:206` T `Black Steel Ore`
- `src/data/lifeSkills.js:206` T? `Black Steel Seam`
- `src/data/lifeSkills.js:212` T `Titanium Ore`
- `src/data/lifeSkills.js:212` T? `Titanium Seam`
- `src/data/lifeSkills.js:213` T `Obsidian Ore`
- `src/data/lifeSkills.js:213` T? `Obsidian Seam`
- `src/data/lifeSkills.js:214` T `Mithril Ore`
- `src/data/lifeSkills.js:214` T? `Deep Vein`
- `src/data/lifeSkills.js:215` T `Gem Cluster`
- `src/data/lifeSkills.js:215` T? `Gem Deposit`
- `src/data/lifeSkills.js:218` T `Diamond Ore`
- `src/data/lifeSkills.js:218` T? `Diamond Seam`
- `src/data/lifeSkills.js:219` T `Ancient Ore`
- `src/data/lifeSkills.js:219` T? `Ancient Deposit`
- `src/data/lifeSkills.js:220` T `Prismatic Ore`
- `src/data/lifeSkills.js:220` T? `Prismatic Vein`
- `src/data/lifeSkills.js:221` T `Abyssal Ore`
- `src/data/lifeSkills.js:221` T? `Abyssal Crack`
- `src/data/lifeSkills.js:222` T `Stormite`
- `src/data/lifeSkills.js:222` T? `Storm Deposit`
- `src/data/lifeSkills.js:223` T `Adamantine`
- `src/data/lifeSkills.js:223` T? `Deep Earth Vein`
- `src/data/lifeSkills.js:224` T `Moonstone`
- `src/data/lifeSkills.js:224` T? `Lunar Deposit`
- `src/data/lifeSkills.js:225` T `Voidstone`
- `src/data/lifeSkills.js:225` T? `Void Crack`
- `src/data/lifeSkills.js:226` T `Embite`
- `src/data/lifeSkills.js:226` T? `Magma Vent`
- `src/data/lifeSkills.js:227` T `Shadow Ore`
- `src/data/lifeSkills.js:227` T? `Shadow Deposit`
- `src/data/lifeSkills.js:228` T `Radiant Ore`
- `src/data/lifeSkills.js:228` T? `Radiant Deposit`
- `src/data/lifeSkills.js:229` T `Eternity Ore`
- `src/data/lifeSkills.js:229` T? `Eternity Vein`
- `src/data/lifeSkills.js:230` T `Origin Ore`
- `src/data/lifeSkills.js:230` T? `Origin Deposit`

### data: loginScreen (11)

- `src/data/say/loginScreen.js:4` T? `Hemi Bros — BroTown, multiplayer RPG`
- `src/data/say/loginScreen.js:6` T? `Create Character`
- `src/data/say/loginScreen.js:8` T? `This device is full`
- `src/data/say/loginScreen.js:9` T? `You have all {max} bros this device can hold. Play one, or free a slot: tap a bro's •••...`
- `src/data/say/loginScreen.js:10` T? `Choose a bro`
- `src/data/say/loginScreen.js:11` T? `Never mind`
- `src/data/say/loginScreen.js:13` T? `Checking for your character…`
- `src/data/say/loginScreen.js:14` T? `Your Login Key lets you access your character on any device.`
- `src/data/say/loginScreen.js:15` T? `Any device • Any browser • No download • Free`
- `src/data/say/loginScreen.js:16` T? `Built {time}`
- `src/data/say/loginScreen.js:17` T? `v{game} · {sha}`

### data: loginSpin (15)

- `src/data/say/loginSpin.js:5` T? `Double or nothing?`
- `src/data/say/loginSpin.js:6` T? `Nothing. Better luck tomorrow.`
- `src/data/say/loginSpin.js:7` T? `Doubled: {pot} gold!`
- `src/data/say/loginSpin.js:8` T? `Round and round...`
- `src/data/say/loginSpin.js:9` T? `{pot} gold`
- `src/data/say/loginSpin.js:10` T? `Win it for {twice}, or lose it all. 50 / 50.`
- `src/data/say/loginSpin.js:11` T? `{unsafe} (NO still collects)`
- `src/data/say/loginSpin.js:12` T? `Exactly 50/50 every spin`
- `src/data/say/loginSpin.js:14` T? `Yes, double or nothing`
- `src/data/say/loginSpin.js:16` T? `No, collect the gold`
- `src/data/say/loginSpin.js:19` T? `Free daily spin`
- `src/data/say/loginSpin.js:20` T? `{pot} gold!`
- `src/data/say/loginSpin.js:21` T? `+{pot} gold`
- `src/data/say/loginSpin.js:24` T? `The wheel did not answer. What you hold is kept.`
- `src/data/say/loginSpin.js:25` T? `Tap SPIN: one free spin a day`

### data: monsterCodex (159)

- `src/data/monsterCodex.js:55` T `Frost`
- `src/data/monsterCodex.js:55` T `Chill`
- `src/data/monsterCodex.js:56` T? `Its hits chill you: for 1 second you walk at 55% of your speed.`
- `src/data/monsterCodex.js:57` T `Flame`
- `src/data/monsterCodex.js:57` T `Burn`
- `src/data/monsterCodex.js:58` T? `Its hits set you burning: 3 more ticks, one a second, each a fifth of the hit (never mo...`
- `src/data/monsterCodex.js:59` T `Wind`
- `src/data/monsterCodex.js:59` T `Gust`
- `src/data/monsterCodex.js:60` T? `Its hits come with a gust that shoves you about a body's width away.`
- `src/data/monsterCodex.js:61` T `Stone`
- `src/data/monsterCodex.js:61` T `Daze`
- `src/data/monsterCodex.js:62` T? `Its hits daze you for half a second: no walking, swinging, rolling or blocking. It cann...`
- `src/data/monsterCodex.js:63` T `Storm`
- `src/data/monsterCodex.js:63` T `Shock`
- `src/data/monsterCodex.js:64` T? `Its hits arc from you to the nearest 4 other players within a few steps of you, for hal...`
- `src/data/monsterCodex.js:65` T `Water`
- `src/data/monsterCodex.js:65` T `Soak`
- `src/data/monsterCodex.js:66` T? `Its hits soak you: for 4 seconds your stamina refills at 40% of its pace.`
- `src/data/monsterCodex.js:67` T `Venom`
- `src/data/monsterCodex.js:67` T `Poison`
- `src/data/monsterCodex.js:68` T? `Its hits poison you: 5 more ticks, one a second, each about an eighth of the hit (never...`
- `src/data/monsterCodex.js:69` T `Flora`
- `src/data/monsterCodex.js:69` T `Hold`
- `src/data/monsterCodex.js:70` T? `Its hits hold you where you stand for 0.7 seconds: no walking and no rolling. It cannot...`
- `src/data/monsterCodex.js:104` T `Snowman`
- `src/data/monsterCodex.js:105` T? `Slow, heavy and hard to put down. It can never catch you, so it does not try: from a fe...`
- `src/data/monsterCodex.js:107` T `Snow-Pile Burrow`
- `src/data/monsterCodex.js:108` T `The first time it drops to half its health it dives into the snow. For up to 3 seconds ...`
- `src/data/monsterCodex.js:109` T `Walk away from the pile and hit it as it climbs out, or face the pile with your shield ...`
- `src/data/monsterCodex.js:112` T `Nobody built the first snowman on Frost Ridge. The old prospectors swear a blizzard cam...`
- `src/data/monsterCodex.js:113` T `Every snowman since has been built by another snowman, which is why none of them have a...`
- `src/data/monsterCodex.js:115` T `Glacier Snowman`
- `src/data/monsterCodex.js:115` T `Past the first pass the snow never thaws. The snowmen up there have frozen right throug...`
- `src/data/monsterCodex.js:118` T `Fire Goblin`
- `src/data/monsterCodex.js:119` T? `Quick on its feet and quick to fall. It rushes you, pitching fireballs from a little wa...`
- `src/data/monsterCodex.js:121` T `The Lunge`
- `src/data/monsterCodex.js:122` T `Every so often it winds up for over a second, then lunges at you, as hard as a normal s...`
- `src/data/monsterCodex.js:123` T `When it winds up, raise your shield facing it or step to one side.`
- `src/data/monsterCodex.js:126` T `The goblins of the Flame Fields were miners once, digging for a stone that burned witho...`
- `src/data/monsterCodex.js:127` T `A goblin's greatest shame is going out. They sleep in the hot ash, they bathe in the ho...`
- `src/data/monsterCodex.js:129` T `Cinder Goblin`
- `src/data/monsterCodex.js:129` T `The goblins past the first pass have burned so long they have gone grey as charcoal. Th...`
- `src/data/monsterCodex.js:132` T `Mummy`
- `src/data/monsterCodex.js:132` T? `the Buried City`
- `src/data/monsterCodex.js:133` T? `Slow, shuffling and wrapped up tight, until you hit it. The Wind Dunes' mummies come in...`
- `src/data/monsterCodex.js:135` T `Unwrapped`
- `src/data/monsterCodex.js:136` T `The first hit tears its bandages off, and a skeleton steps out of them, over four times...`
- `src/data/monsterCodex.js:137` T `Get your footing before you strike: once it is bones, it will be on you in a moment.`
- `src/data/monsterCodex.js:140` T `Before the wind came, the Wind Dunes were a city, and the city had a rule: nobody leave...`
- `src/data/monsterCodex.js:141` T `So the citizens are still at it, wrapped up for the long shift. They walk the dunes loo...`
- `src/data/monsterCodex.js:143` T `Gilded Mummy`
- `src/data/monsterCodex.js:143` T `Deeper in the dunes walk the city's nobles, still wrapped in gold leaf. Their bones, wh...`
- `src/data/monsterCodex.js:148` T `Rock Golem`
- `src/data/monsterCodex.js:148` T? `the Great Cave`
- `src/data/monsterCodex.js:149` T? `A heap of boulders with a face: slow, tougher than most, and its hits land like a rocks...`
- `src/data/monsterCodex.js:151` T `Slam`
- `src/data/monsterCodex.js:152` T `It winds up for almost a second, then slams the ground: double damage to anyone in a ri...`
- `src/data/monsterCodex.js:153` T `When it winds up, step out of the ring, or face it with your shield raised.`
- `src/data/monsterCodex.js:156` T `The rock golems are the Stone Hollows themselves: bits of cave wall that got up one day...`
- `src/data/monsterCodex.js:157` T `They are not angry, exactly. They are just very, very old, and you are standing where t...`
- `src/data/monsterCodex.js:159` T `Amethyst Golem`
- `src/data/monsterCodex.js:159` T `Past the first pass the hollows run with amethyst, and so do the monsters. Collectors w...`
- `src/data/monsterCodex.js:165` T `Storm Eye`
- `src/data/monsterCodex.js:165` T? `the Foundry Dome`
- `src/data/monsterCodex.js:166` T? `An eye the size of your head, floating on its tentacles and crackling. From a distance ...`
- `src/data/monsterCodex.js:168` T `The Lunge`
- `src/data/monsterCodex.js:169` T `Every so often it winds up for over a second, then lunges at you. Between lunges, a bal...`
- `src/data/monsterCodex.js:170` T `Watch for the wind-up: shield up, or step aside.`
- `src/data/monsterCodex.js:173` T `The Electric Foundry was built to bottle lightning. The bottles leaked. Something had t...`
- `src/data/monsterCodex.js:174` T `They hang in the air on a fistful of tentacles, watching, and they never blink, because...`
- `src/data/monsterCodex.js:176` T `Tempest Eye`
- `src/data/monsterCodex.js:176` T `Deeper in the foundry the eyes have soaked up so much charge they have gone storm-blue ...`
- `src/data/monsterCodex.js:181` T `Water Frog`
- `src/data/monsterCodex.js:182` T? `A fat toad with a sac of cave water under its chin. Slow and tough: it hops right up to...`
- `src/data/monsterCodex.js:184` T `Slam`
- `src/data/monsterCodex.js:185` T `It winds up for almost a second, then slams down: double damage to anyone in a ring aro...`
- `src/data/monsterCodex.js:186` T `When it winds up, step back out of reach, or block facing it.`
- `src/data/monsterCodex.js:189` T `The frogs of the Water Caves found out long ago that the best pools dry up, and decided...`
- `src/data/monsterCodex.js:190` T `They are in no hurry and they do not share. Come too close and one will hop over, slowl...`
- `src/data/monsterCodex.js:192` T `Coral Frog`
- `src/data/monsterCodex.js:192` T `The frogs of the deep caves have gone as dark as kelp, with bellies and eyes the orange...`
- `src/data/monsterCodex.js:197` T `Rotcap`
- `src/data/monsterCodex.js:198` T? `A toadstool with eyes, shuffling about on its roots. It spits venom from a distance and...`
- `src/data/monsterCodex.js:200` T `The Lunge`
- `src/data/monsterCodex.js:201` T `Every so often it winds up for over a second, then lunges at you. Between lunges it spi...`
- `src/data/monsterCodex.js:202` T `Keep moving sideways: a glob aims where you were.`
- `src/data/monsterCodex.js:205` T `Travellers lost in the Poison Forest used to sit down on the big purple toadstools to r...`
- `src/data/monsterCodex.js:206` T `A rotcap does not chase you far. It does not need to. Everything it spits takes root, a...`
- `src/data/monsterCodex.js:208` T `Spectral Rotcap`
- `src/data/monsterCodex.js:208` T `Deeper in the forest the rotcaps glow a pale, see-through cyan, like ghosts of themselv...`
- `src/data/monsterCodex.js:211` T `Great Rotcap`
- `src/data/monsterCodex.js:212` T? `A rotcap that was never picked: old, dark and the size of a cart. Slow and tough, and i...`
- `src/data/monsterCodex.js:214` T `Slam`
- `src/data/monsterCodex.js:215` T `It winds up for almost a second, then slams down: double damage to anyone in a ring aro...`
- `src/data/monsterCodex.js:216` T `When it winds up, step back out of reach, or block facing it.`
- `src/data/monsterCodex.js:219` T `Leave a rotcap alone in the bog for long enough and it stops spitting and starts growin...`
- `src/data/monsterCodex.js:220` T `They do not move much. They sit among the ordinary toadstools and wait for someone to s...`
- `src/data/monsterCodex.js:222` T `Shade Rotcap`
- `src/data/monsterCodex.js:222` T `The great rotcaps of the deep bog have gone violet and shadowy, hard to see even when y...`
- `src/data/monsterCodex.js:225` T `Blue Slime`
- `src/data/monsterCodex.js:225` T? `the Goo Grotto`
- `src/data/monsterCodex.js:226` T? `Fast and fragile: it goes down quickly, spitting globs as it comes. But kill it and it ...`
- `src/data/monsterCodex.js:228` T `Death Burst`
- `src/data/monsterCodex.js:229` T `When it dies it swells for a second and a half to three and a half times its size, wher...`
- `src/data/monsterCodex.js:230` T `Land the killing blow and walk away while it swells. It cannot follow you.`
- `src/data/monsterCodex.js:233` T `Every morning the Earth Forest is covered in dew, and every morning a little of it does...`
- `src/data/monsterCodex.js:234` T `Its opinion of you is low. A blue slime has nothing inside it but water and grudges, an...`
- `src/data/monsterCodex.js:235` T `The dew that never dries at all rolls downhill into the Goo Grotto, a cave off the West...`
- `src/data/monsterCodex.js:237` T `Jade Slime`
- `src/data/monsterCodex.js:237` T `Past the first pass the slimes are a deep jade green and the dew they are made of is ol...`
- `src/data/monsterCodex.js:248` T? `the Frost Trail`
- `src/data/monsterCodex.js:248` T? `the North Road`
- `src/data/monsterCodex.js:248` T? `the Dune Trail`
- `src/data/monsterCodex.js:248` T? `the East Road`
- `src/data/monsterCodex.js:249` T? `the Foundry Road`
- `src/data/monsterCodex.js:249` T? `the South Road`
- `src/data/monsterCodex.js:249` T? `the Bog Trail`
- `src/data/monsterCodex.js:249` T? `the West Road`
- `src/data/say/monsterCodex.js:6` T? `Lv {lo}`
- `src/data/say/monsterCodex.js:7` T? `Lv {lo}–{hi}`
- `src/data/say/monsterCodex.js:8` T? `Leave BroTown by its {gate} gate and follow {road} straight on.`
- `src/data/say/monsterCodex.js:9` T? `Leave BroTown by its {gate} gate on {road}, then take {fork} where it forks off.`
- `src/data/say/monsterCodex.js:14` T? `{n} defeated`
- `src/data/say/monsterCodex.js:15` T? `Not met yet`
- `src/data/say/monsterCodex.js:18` T? `{n} defeated`
- `src/data/say/monsterCodex.js:19` T? `· {n} past Lv 20`
- `src/data/say/monsterCodex.js:28` T? `All monsters`
- `src/data/say/monsterCodex.js:36` T? `Each kill rolls once, 1–{sides}. The item whose numbers it lands on drops{free}.`
- `src/data/say/monsterCodex.js:37` T? `; {range} drops nothing more`
- `src/data/say/monsterCodex.js:38` T? `Each kill rolls 1–{sides} for every item. A roll in its range drops it.`
- `src/data/say/monsterCodex.js:39` T? `Tap an item to see what it is and the grades it can roll.`
- `src/data/say/monsterCodex.js:43` T? `Found from`
- `src/data/say/monsterCodex.js:44` T? `Base drop chance`
- `src/data/say/monsterCodex.js:45` T? `(chance for this item to drop)`
- `src/data/say/monsterCodex.js:46` T? `drops on a roll of {range} out of {sides}`
- `src/data/say/monsterCodex.js:47` T? `Possible rarity`
- `src/data/say/monsterCodex.js:48` T? `(rolls after drop)`
- `src/data/say/monsterCodex.js:51` T? `What it does`
- `src/data/say/monsterCodex.js:52` T? `Element · {name}`
- `src/data/say/monsterCodex.js:53` T? `A pet from {land}, out with you, softens it.`
- `src/data/say/monsterCodex.js:54` T? `Special attack · {name}`
- `src/data/say/monsterCodex.js:56` T? `Its story`
- `src/data/say/monsterCodex.js:57` T? `Elder form · {name}`
- `src/data/say/monsterCodex.js:60` T? `Its land`
- `src/data/say/monsterCodex.js:61` T? `{land}, {levels}: the weakest at the land's near end by BroTown, stronger the further o...`
- `src/data/say/monsterCodex.js:62` T? `Before the first pass`
- `src/data/say/monsterCodex.js:63` T? `{name}, {levels}.`
- `src/data/say/monsterCodex.js:64` T? `Past the first pass`
- `src/data/say/monsterCodex.js:65` T? `{name}, its elder form, {levels}.`
- `src/data/say/monsterCodex.js:66` T? `The way there`
- `src/data/say/monsterCodex.js:68` T? `{dungeon}, in {land}: {levels}, in waves, its land's monsters with a boss at the end.`
- `src/data/say/monsterCodex.js:71` T? `‹ All monsters`
- `src/data/say/monsterCodex.js:72` T? `Defeat one to open its page.`
- `src/data/say/monsterCodex.js:73` T? `It lives in {land}.`
- `src/data/say/monsterCodex.js:76` T? `Monsters of the world`
- `src/data/say/monsterCodex.js:77` T? `{met} of {total} met`
- `src/data/say/monsterCodex.js:78` T? `The codex starts counting your kills after the next game update.`
- `src/data/say/monsterCodex.js:79` T? `Your codex can't be read right now. It will be back.`
- `src/data/say/monsterCodex.js:80` T? `Defeat one of a kind to open its whole page: everything it drops, what it does, its sto...`

### data: monsterDeathZones (14)

- `src/data/monsterDeathZones.js:400` T? `{…}: no front view`
- `src/data/monsterDeathZones.js:401` T? `{…}: flip facing {…}`
- `src/data/monsterDeathZones.js:407` T? `{…}: no zones`
- `src/data/monsterDeathZones.js:411` T? `{…}: id missing or repeated`
- `src/data/monsterDeathZones.js:423` T? `{…}: a rect or a poly, exactly one`
- `src/data/monsterDeathZones.js:425` T? `{…}: a poly of {…} points`
- `src/data/monsterDeathZones.js:426` T? `{…}: point {…} outside 0..1`
- `src/data/monsterDeathZones.js:427` T? `{…}: empty rect`
- `src/data/monsterDeathZones.js:431` T? `{…}.{…}: cut {…} is no zone of the view`
- `src/data/monsterDeathZones.js:440` T? `{…}.{…}: its hole {…} reaches out of it`
- `src/data/monsterDeathZones.js:448` T? `{…}: {…} zones, more than {…}`
- `src/data/monsterDeathZones.js:458` T? `{…}: {…} of {…} points in no zone`
- `src/data/monsterDeathZones.js:459` T? `{…}: {…} of {…} points in more than one zone`
- `src/data/monsterDeathZones.js:463` T? `alias {…}: no look {…}`

### data: morePanel (37)

- `src/data/say/morePanel.js:5` T? `Life Skills`
- `src/data/say/morePanel.js:23` T? `{label} — {status}`
- `src/data/say/morePanel.js:25` T? `{kills} · {duels}`
- `src/data/say/morePanel.js:26` T? `{kills} kill`
- `src/data/say/morePanel.js:26` T? `{kills} kills`
- `src/data/say/morePanel.js:27` T? `{duels} duel won`
- `src/data/say/morePanel.js:27` T? `{duels} duels won`
- `src/data/say/morePanel.js:28` T? `{earned} of {total} earned`
- `src/data/say/morePanel.js:29` T? `{fresh} new in the codex`
- `src/data/say/morePanel.js:30` T? `{met} of {total} monsters met`
- `src/data/say/morePanel.js:31` T? `Learn about the monsters you defeat`
- `src/data/say/morePanel.js:32` T? `{ready} ready to turn in`
- `src/data/say/morePanel.js:33` T? `Track your quests`
- `src/data/say/morePanel.js:34` T? `New level-ups to view`
- `src/data/say/morePanel.js:35` T? `Cooking · Fishing · Mining`
- `src/data/say/morePanel.js:36` T? `{count} waiting`
- `src/data/say/morePanel.js:37` T? `{count} online`
- `src/data/say/morePanel.js:38` T? `{n} friend`
- `src/data/say/morePanel.js:38` T? `{n} friends`
- `src/data/say/morePanel.js:39` T? `Add friends · direct messages`
- `src/data/say/morePanel.js:40` T? `Your party · {n} member`
- `src/data/say/morePanel.js:40` T? `Your party · {n} members`
- `src/data/say/morePanel.js:41` T? `Make a party in the Saloon`
- `src/data/say/morePanel.js:42` T? `Not joined · player clans`
- `src/data/say/morePanel.js:43` T? `{rank} · {guild}`
- `src/data/say/morePanel.js:44` T? `Novice in every skill guild`
- `src/data/say/morePanel.js:45` T? `{n} pet`
- `src/data/say/morePanel.js:45` T? `{n} pets`
- `src/data/say/morePanel.js:46` T? `Trap a monster to tame it`
- `src/data/say/morePanel.js:47` T? `Sound · Controls · Login Key · Feedback · Privacy`
- `src/data/say/morePanel.js:48` T? `The world map: the lands, the town, your quest`
- `src/data/say/morePanel.js:49` T? `{count} new`
- `src/data/say/morePanel.js:50` T? `World chat and the game’s news`
- `src/data/say/morePanel.js:51` T? `Tell the developer what you think`
- `src/data/say/morePanel.js:52` T? `About the game, privacy, rules and credits`
- `src/data/say/morePanel.js:53` T? `Log out · switch bro · save your Login Key`
- `src/data/say/morePanel.js:54` T? `Log out · guest tab, no key`

### data: nameModal (28)

- `src/data/say/nameModal.js:8` T? `Skin Tone`
- `src/data/say/nameModal.js:9` T? `Bro type`
- `src/data/say/nameModal.js:15` T? `Pattern or draw on this shirt`
- `src/data/say/nameModal.js:16` T? `Pattern or draw on these pants`
- `src/data/say/nameModal.js:17` T? `Tattoo your body or face`
- `src/data/say/nameModal.js:18` T? `Pattern these shoes`
- `src/data/say/nameModal.js:20` T? `Bro type`
- `src/data/say/nameModal.js:33` T? `Live preview — tap to zoom`
- `src/data/say/nameModal.js:35` T? `BRO NAME`
- `src/data/say/nameModal.js:36` T? `Tap to name`
- `src/data/say/nameModal.js:36` T? `Type a name`
- `src/data/say/nameModal.js:37` T? `Random name`
- `src/data/say/nameModal.js:38` T? `Generate a random name`
- `src/data/say/nameModal.js:39` T? `✓ Ready to go`
- `src/data/say/nameModal.js:40` T? `At least 2 characters`
- `src/data/say/nameModal.js:42` T? `Randomize Bro`
- `src/data/say/nameModal.js:43` T? `Back to the look you started with`
- `src/data/say/nameModal.js:45` T? `Enter BroTown`
- `src/data/say/nameModal.js:46` T? `Enter BroTown`
- `src/data/say/nameModal.js:47` T? `Back to the main menu`
- `src/data/say/nameModal.js:49` T? `Hemi Bros`
- `src/data/say/nameModal.js:52` T? `Trait Picker`
- `src/data/say/nameModal.js:53` T? `Appearance category`
- `src/data/say/nameModal.js:54` T? `{label} options`
- `src/data/say/nameModal.js:56` T? `{label} colors`
- `src/data/say/nameModal.js:58` T? `Eraser, and open the editor`
- `src/data/say/nameModal.js:59` T? `Colour {i}, and open the editor`
- `src/data/say/nameModal.js:60` T? `Brush {n} wide, and open the editor`

### data: nmlAsk (11)

- `src/data/say/nmlAsk.js:4` T? `{name} beat you`
- `src/data/say/nmlAsk.js:5` T? `{name} beat you.`
- `src/data/say/nmlAsk.js:6` T? `You can't attack them for {n} more minute.`
- `src/data/say/nmlAsk.js:6` T? `You can't attack them for {n} more minutes.`
- `src/data/say/nmlAsk.js:7` T? `Ask for a rematch`
- `src/data/say/nmlAsk.js:9` T? `Hit back {name}?`
- `src/data/say/nmlAsk.js:10` T? `Attack {name}?`
- `src/data/say/nmlAsk.js:11` T? `Hitting back the player who attacked you gives you no red skull. Tap for what No man's ...`
- `src/data/say/nmlAsk.js:12` T? `Attacking a player gives you a red skull. Tap for what No man's land means.`
- `src/data/say/nmlAsk.js:13` T? `Lv {lv}`
- `src/data/say/nmlAsk.js:19` T? `Let {name} attack you again`

### data: nmlBadge (21)

- `src/data/say/nmlBadge.js:4` T? `Lv {lo}–{hi}`
- `src/data/say/nmlBadge.js:6` T? `No man's land {ring} · Lv {lv} monsters`
- `src/data/say/nmlBadge.js:7` T? `No man's land {ring} · {levels}`
- `src/data/say/nmlBadge.js:8` T? `The rules`
- `src/data/say/nmlBadge.js:9` T? `{n} level`
- `src/data/say/nmlBadge.js:9` T? `{n} levels`
- `src/data/say/nmlBadge.js:11` T? `{label} players within {within} of yours, while they stand in No man's land too. The lo...`
- `src/data/say/nmlBadge.js:13` T? `{label} tap a player, or swing or shoot at them, and choose {attack}. Until you do, you...`
- `src/data/say/nmlBadge.js:15` T? `Attack first:`
- `src/data/say/nmlBadge.js:16` T? `{label} you become an {outlaw} (a red skull) for 20 minutes of play, starting over with...`
- `src/data/say/nmlBadge.js:19` T? `Get attacked:`
- `src/data/say/nmlBadge.js:20` T? `{label} a {skull}. To hit back, swing, shoot or tap them and choose {attack} once: hitt...`
- `src/data/say/nmlBadge.js:22` T? `Keep things safe:`
- `src/data/say/nmlBadge.js:23` T? `{label} the Bank in BroTown holds gold and things, out of reach of any death. Diego sel...`
- `src/data/say/nmlBadge.js:24` T? `Walk back toward BroTown to leave.`
- `src/data/say/nmlBadge.js:25` T? `You carry a red skull: {min} min of play left.`
- `src/data/say/nmlBadge.js:26` T? `You carry a white skull: {min} min of play left.`
- `src/data/say/nmlBadge.js:29` T? `{place} · Safe`
- `src/data/say/nmlBadge.js:30` T? `Out past the safe ground is No man's land, where other players can attack you. The mini...`
- `src/data/say/nmlBadge.js:32` T? `Outlaw: you attacked a player first, {min} minutes left. Tap for what it means.`
- `src/data/say/nmlBadge.js:33` T? `No man's land {ring}: players can attack you here. Tap for what it means.`

### data: npcLooks (42)

- `src/data/npcLooks.js:20` T `Mayor Bro`
- `src/data/npcLooks.js:20` T `small-town politician: top hat, monocle, the grey beard he always had`
- `src/data/npcLooks.js:28` T `Blacksmith Bro`
- `src/data/npcLooks.js:28` T `gym bro: shirtless, sweatband, flat-top, grey sweatpants`
- `src/data/npcLooks.js:36` T `Diego`
- `src/data/npcLooks.js:36` T `hustle guy: slicked hair, gold glasses, loud purple tee, white kicks`
- `src/data/npcLooks.js:44` T `Farmer Bro`
- `src/data/npcLooks.js:44` T `paranoid dirt hippie: bucket hat, scraggly beard, wide eyes, earth tones`
- `src/data/npcLooks.js:60` T `Woodworker Bro`
- `src/data/npcLooks.js:60` T `overthinking genius: workshop goggles, a wild grey afro, graph-paper tee`
- `src/data/npcLooks.js:68` T `Beastmaster Bro`
- `src/data/npcLooks.js:68` T `survival-show host: brown hat, beard, camo, sleepless eyes`
- `src/data/npcLooks.js:76` T `Lil Bro`
- `src/data/npcLooks.js:76` T `iPad kid: gamer headphones, bright tee, red sneakers (a child: NPC_DATA figureSize 0.8)`
- `src/data/npcLooks.js:84` T `Ace`
- `src/data/npcLooks.js:84` T `back-alley bookie: derby, slicked hair, green felt-table tee, black`
- `src/data/npcLooks.js:98` T `Sterling`
- `src/data/npcLooks.js:98` T `crypto bro running a bank: laser-eyes visor, pinstripes`
- `src/data/npcLooks.js:106` T `Slim`
- `src/data/npcLooks.js:106` T `craft mixologist: the beard, the checked shirt, the attitude`
- `src/data/npcLooks.js:114` T `Chef Blaze`
- `src/data/npcLooks.js:114` T `shouting TV chef: spiky blonde flat-top, white shades, flame tee`
- `src/data/npcLooks.js:122` T `Glint`
- `src/data/npcLooks.js:122` T `crystal-healing influencer: long hair, a halo, polka purple`
- `src/data/npcLooks.js:130` T `Postmaster Pete`
- `src/data/npcLooks.js:130` T `the slowest clerk alive: postal cap, grey beard, striped blue`
- `src/data/npcLooks.js:138` T `Deed Dave`
- `src/data/npcLooks.js:138` T `swamp-selling realtor: a little hat over a loud teal shirt`
- `src/data/npcLooks.js:146` T `Benny`
- `src/data/npcLooks.js:146` T `upselling bellhop: the fez, a red windowpane jacket`
- `src/data/npcLooks.js:154` T `Guildmaster Gary`
- `src/data/npcLooks.js:154` T `raid leader who takes it too seriously: the headband`
- `src/data/npcLooks.js:162` T `Sheriff Buck`
- `src/data/npcLooks.js:162` T `mall cop with a bought badge: black cowboy hat, aviators`
- `src/data/npcLooks.js:170` T `Gavel Greg`
- `src/data/npcLooks.js:170` T `auctioneer who never stops: a crown, a gold-striped tee`
- `src/data/npcLooks.js:178` T `Old Man Reel`
- `src/data/npcLooks.js:178` T `fisherman whose fish grow every telling: beanie, white beard, a slicker`
- `src/data/npcLooks.js:186` T `Bean`
- `src/data/npcLooks.js:186` T `kid streamer with no viewers: cat ears, pink everything (a child: NPC_DATA figureSize 0.8)`
- `src/data/npcLooks.js:194` T `Tourist Terry`
- `src/data/npcLooks.js:194` T `lost tourist: a souvenir sombrero, a monocle, orange shorts`

### data: oreArt (5)

- `src/data/oreArt.js:9` T `copper`
- `src/data/oreArt.js:10` T `iron`
- `src/data/oreArt.js:11` T `blacksteel`
- `src/data/oreArt.js:12` T `titanium`
- `src/data/oreArt.js:13` T `obsidian`

### data: paint (77)

- `src/data/say/paint.js:4` T? `Shirt design`
- `src/data/say/paint.js:6` T? `Front and back are separate — the back shows when you walk away.`
- `src/data/say/paint.js:7` T? `Pants design`
- `src/data/say/paint.js:9` T? `Sits on the upper leg. Leg armour covers it.`
- `src/data/say/paint.js:12` T? `Draw on the chest or the arms. A shirt or breastplate covers the chest; sleeves cover t...`
- `src/data/say/paint.js:13` T? `back of the pants`
- `src/data/say/paint.js:14` T? `Shows when you walk away. Separate from the front — leg armour covers it.`
- `src/data/say/paint.js:15` T? `back tattoo`
- `src/data/say/paint.js:16` T? `Shows when you walk away. Separate from your chest — a shirt or breastplate covers it.`
- `src/data/say/paint.js:17` T? `face tattoo`
- `src/data/say/paint.js:18` T? `On your face. A hat or a beard can cover part of it.`
- `src/data/say/paint.js:19` T? `arm tattoo`
- `src/data/say/paint.js:20` T? `Goes on BOTH arms. Sleeves cover the upper arm, so it shows below them.`
- `src/data/say/paint.js:21` T? `back of head`
- `src/data/say/paint.js:22` T? `Shows when you walk away. Separate from your face — hair covers part of it.`
- `src/data/say/paint.js:23` T? `Shoe pattern`
- `src/data/say/paint.js:25` T? `Boots are small, so these are the patterns that still read at that size.`
- `src/data/say/paint.js:29` T? `Back of Head`
- `src/data/say/paint.js:30` T? `Chest + Arms`
- `src/data/say/paint.js:31` T? `Back + Arms`
- `src/data/say/paint.js:36` T? `Draw freehand`
- `src/data/say/paint.js:37` T? `Drag for a straight line`
- `src/data/say/paint.js:38` T? `Drag for a box outline`
- `src/data/say/paint.js:39` T? `Drag for a circle outline`
- `src/data/say/paint.js:40` T? `Tap an area to flood it — with the eraser chosen, to clear it`
- `src/data/say/paint.js:41` T? `Pick a letter, then tap to place it`
- `src/data/say/paint.js:42` T? `Tap something you already drew to pick it up — recolour, resize or re-layer it`
- `src/data/say/paint.js:48` T? `letter {g}`
- `src/data/say/paint.js:51` T? `brush stroke`
- `src/data/say/paint.js:54` T? `To back`
- `src/data/say/paint.js:55` T? `Send it behind everything else`
- `src/data/say/paint.js:57` T? `One step further back`
- `src/data/say/paint.js:59` T? `One step further forward`
- `src/data/say/paint.js:60` T? `To front`
- `src/data/say/paint.js:61` T? `Bring it in front of everything else`
- `src/data/say/paint.js:65` T? `Preview on your character`
- `src/data/say/paint.js:68` T? `Edit {name} ({side})`
- `src/data/say/paint.js:69` T? `Turn round to the front`
- `src/data/say/paint.js:70` T? `Turn round to the back`
- `src/data/say/paint.js:73` T? `{side} • {zone}`
- `src/data/say/paint.js:74` T? `Tap a zone to edit`
- `src/data/say/paint.js:75` T? `shirt {side}`
- `src/data/say/paint.js:78` T? `Draw your {what}`
- `src/data/say/paint.js:79` T? `Pattern your {what}`
- `src/data/say/paint.js:83` T? `A pattern fills the whole garment. Anything you draw goes on top of it.`
- `src/data/say/paint.js:84` T? `Put this drawing on the back as well`
- `src/data/say/paint.js:85` T? `Put this drawing on the front as well`
- `src/data/say/paint.js:87` T? `Copy to back`
- `src/data/say/paint.js:88` T? `Copy to front`
- `src/data/say/paint.js:89` T? `Choose a ready-made design for your {what}`
- `src/data/say/paint.js:93` T? `Keeping the proportions you drew — tap to size width and height freely`
- `src/data/say/paint.js:94` T? `Width and height are free — tap to keep the proportions you drew`
- `src/data/say/paint.js:95` T? `✓ Keep shape`
- `src/data/say/paint.js:96` T? `Free size`
- `src/data/say/paint.js:97` T? `Make a copy of this one beside it, and hold the copy`
- `src/data/say/paint.js:99` T? `Finished with this one`
- `src/data/say/paint.js:102` T? `Throw this one away`
- `src/data/say/paint.js:103` T? `Put it back the way you found it`
- `src/data/say/paint.js:105` T? `Letter {ch}`
- `src/data/say/paint.js:106` T? `Brush {w} wide`
- `src/data/say/paint.js:110` T? `Mirror: paint both halves at once`
- `src/data/say/paint.js:114` T? `Layer {at} of {count} · {what}`
- `src/data/say/paint.js:115` T? `Tap something you drew to pick it up — then recolour, resize or re-layer it`
- `src/data/say/paint.js:116` T? `Pick Select, then tap something you drew to change it`
- `src/data/say/paint.js:117` T? `Take this one off the drawing`
- `src/data/say/paint.js:121` T? `Pattern colour`
- `src/data/say/paint.js:122` T? `Eraser — works with every tool`
- `src/data/say/paint.js:123` T? `Recolour what you picked up`
- `src/data/say/paint.js:126` T? `Colour {i}`
- `src/data/say/paint.js:129` T? `Undo the last thing you did`
- `src/data/say/paint.js:130` T? `Nothing to undo yet`
- `src/data/say/paint.js:132` T? `Put back what you just undid`
- `src/data/say/paint.js:133` T? `Nothing to redo`
- `src/data/say/paint.js:135` T? `Remove the pattern`
- `src/data/say/paint.js:136` T? `Erase the whole {side} of the shirt`
- `src/data/say/paint.js:137` T? `Erase the whole {what}`
- `src/data/say/paint.js:138` T? `No pattern`

### data: partyHud (9)

- `src/data/say/partyHud.js:4` T? `Party Invite`
- `src/data/say/partyHud.js:5` T? `{name} invites you`
- `src/data/say/partyHud.js:6` T? `({size} in party)`
- `src/data/say/partyHud.js:10` T? `Party, {count} of {max}: tap to see who`
- `src/data/say/partyHud.js:13` T? `Fold the party list`
- `src/data/say/partyHud.js:14` T? `Leave party`
- `src/data/say/partyHud.js:20` T? `offline · {ago}`
- `src/data/say/partyHud.js:21` T? `away — reconnecting…`
- `src/data/say/partyHud.js:23` T? `+{more} more · {online} online`

### data: partyPanel (45)

- `src/data/say/partyPanel.js:4` T? `Gladiator Arena`
- `src/data/say/partyPanel.js:5` T? `Your gold:`
- `src/data/say/partyPanel.js:6` T? `· {fee}G entry · Up to 8 fighters · Single elimination · No healing`
- `src/data/say/partyPanel.js:8` T? `Enter a single elimination tournament of up to 8 fighters. Blind matchups — any level c...`
- `src/data/say/partyPanel.js:9` T? `Only the final victor earns the Gladiator title and up to 250G for every fighter in the...`
- `src/data/say/partyPanel.js:10` T? `Only the final victor earns the Gladiator title and up to 250G for every fighter in the...`
- `src/data/say/partyPanel.js:11` T? `Only the final victor earns the Gladiator title and {ap} AP, plus up to 250G for every ...`
- `src/data/say/partyPanel.js:12` T? `Only the final victor earns the Gladiator title and up to 250G for every fighter in the...`
- `src/data/say/partyPanel.js:13` T? `Need {fee}G!`
- `src/data/say/partyPanel.js:15` T? `Server error`
- `src/data/say/partyPanel.js:16` T? `Enter Arena · {fee}G`
- `src/data/say/partyPanel.js:17` T? `Need {gold}G more`
- `src/data/say/partyPanel.js:19` T? `In Queue`
- `src/data/say/partyPanel.js:20` T? `Position: {pos}/{size} ·`
- `src/data/say/partyPanel.js:21` T? `Bracket starts in {secs}s`
- `src/data/say/partyPanel.js:22` T? `Waiting for {count} players...`
- `src/data/say/partyPanel.js:23` T? `You can close this panel — you'll be notified when matched!`
- `src/data/say/partyPanel.js:24` T? `Left arena queue (+{fee}G)`
- `src/data/say/partyPanel.js:25` T? `Leave Queue (refund {fee}G)`
- `src/data/say/partyPanel.js:27` T? `FIGHT! Round {round}`
- `src/data/say/partyPanel.js:30` T? `Find and defeat your opponent!`
- `src/data/say/partyPanel.js:31` T? `3 minutes on the clock: then the one with more health left wins.`
- `src/data/say/partyPanel.js:32` T? `Eliminated — Round {round}`
- `src/data/say/partyPanel.js:33` T? `{wins} wins · You can spectate the rest!`
- `src/data/say/partyPanel.js:35` T? `Tournament — Round {round}/{max}`
- `src/data/say/partyPanel.js:36` T? `{left}/{count} remaining`
- `src/data/say/partyPanel.js:38` T? `Current Matches`
- `src/data/say/partyPanel.js:40` T? `Winner: {name}`
- `src/data/say/partyPanel.js:43` T? `Spectator Stakes`
- `src/data/say/partyPanel.js:46` T? `{gold}G pot`
- `src/data/say/partyPanel.js:48` T? `GLADIATOR CHAMPION`
- `src/data/say/partyPanel.js:49` T? `{wins} wins · Lv{lv}`
- `src/data/say/partyPanel.js:52` T? `"Gladiator" title`
- `src/data/say/partyPanel.js:54` T? `Recent Results`
- `src/data/say/partyPanel.js:55` T? `R{round}: {mark1} {p1} vs {p2} {mark2}`
- `src/data/say/partyPanel.js:57` T? `Spectator Betting`
- `src/data/say/partyPanel.js:58` T? `Bet placed: {gold}G on {name}`
- `src/data/say/partyPanel.js:59` T? `Round {round} — waiting for results...`
- `src/data/say/partyPanel.js:60` T? `Blind bet — pick who you think will win this round. {left} players left.`
- `src/data/say/partyPanel.js:61` T? `{name} (Lv{lv})`
- `src/data/say/partyPanel.js:63` T? `G (max {max})`
- `src/data/say/partyPanel.js:64` T? `Betting is closed`
- `src/data/say/partyPanel.js:65` T? `Place Bet`
- `src/data/say/partyPanel.js:67` T? `Hall of Fame`
- `src/data/say/partyPanel.js:68` T? `{wins}W · {players}P`

### data: pets (36)

- `src/data/say/pets.js:7` T? `{count} caught`
- `src/data/say/pets.js:8` T? `Not caught`
- `src/data/say/pets.js:9` T? `Not tried`
- `src/data/say/pets.js:10` T? `{tries} tries`
- `src/data/say/pets.js:11` T? `{gold} golden`
- `src/data/say/pets.js:12` T? `Biggest {pct}%`
- `src/data/say/pets.js:14` T? `in your collection`
- `src/data/say/pets.js:15` T? `With you: {name}`
- `src/data/say/pets.js:16` T? `No pet out with you`
- `src/data/say/pets.js:17` T? `· Trapping {level}`
- `src/data/say/pets.js:19` T? `Your pets are not ready yet. Try again after you rejoin.`
- `src/data/say/pets.js:20` T? `No pets yet. Make box traps at the Woodworker, target a monster out in the lands, tap {...`
- `src/data/say/pets.js:23` T? `Your Pet House holds {max}, as many as it can.`
- `src/data/say/pets.js:24` T? `Buy room for {step} more pets for {price}?`
- `src/data/say/pets.js:25` T? `Pet House: room for {step} more pets, {price}{have}`
- `src/data/say/pets.js:26` T? `{gold} gold`
- `src/data/say/pets.js:27` T? `(you have {coins})`
- `src/data/say/pets.js:30` T? `More room`
- `src/data/say/pets.js:32` T? `{text}. It waits at the Auction House until it sells, and comes back if it does not.`
- `src/data/say/pets.js:34` T? `Lv {lv}`
- `src/data/say/pets.js:35` T? `Lv {lv} ({own})`
- `src/data/say/pets.js:36` T? `With you`
- `src/data/say/pets.js:39` T? `when out`
- `src/data/say/pets.js:41` T? `Works at Lv {lv} until your Trapping reaches {own}.`
- `src/data/say/pets.js:43` T? `Release {name} for good?`
- `src/data/say/pets.js:46` T? `Put away`
- `src/data/say/pets.js:47` T? `Take out`
- `src/data/say/pets.js:50` T? `2-16 letters, numbers, spaces, - or '`
- `src/data/say/pets.js:52` T? `Sell at the Auction House`
- `src/data/say/pets.js:53` T? `Price in gold`
- `src/data/say/pets.js:54` T? `Listed for {price} gold`
- `src/data/say/pets.js:55` T? `Not listed`
- `src/data/say/pets.js:58` T? `The pet with you picks up loot from further away{ward}. Pets are never lost, not even i...`
- `src/data/say/pets.js:59` T? `, and softens what its own land's monsters do to you`
- `src/data/say/pets.js:62` T? `{caught} of {total} caught`
- `src/data/say/pets.js:63` T? `Each land's monsters become its pet. Past level 20 they come in the land's second colours.`

### data: playerProfile (25)

- `src/data/say/playerProfile.js:9` T? `Back to the player card`
- `src/data/say/playerProfile.js:12` T? `Verified Hemi Bro`
- `src/data/say/playerProfile.js:13` T? `Verified Hemi Bro{token}{held}`
- `src/data/say/playerProfile.js:15` T? `· {count} held`
- `src/data/say/playerProfile.js:16` T? `LV {lv}`
- `src/data/say/playerProfile.js:18` T? `Achievement points`
- `src/data/say/playerProfile.js:19` T? `{ap} AP`
- `src/data/say/playerProfile.js:20` T? `Hemi Bros held by their verified wallet`
- `src/data/say/playerProfile.js:21` T? `{count} Hemi Bro`
- `src/data/say/playerProfile.js:21` T? `{count} Hemi Bros`
- `src/data/say/playerProfile.js:22` T? `{count} Quests`
- `src/data/say/playerProfile.js:25` T? `Title: an achievement`
- `src/data/say/playerProfile.js:26` T? `No Clan`
- `src/data/say/playerProfile.js:29` T? `No {slot}`
- `src/data/say/playerProfile.js:31` T? `Lifetime Kills`
- `src/data/say/playerProfile.js:32` T? `Rarest achievement: {name}`
- `src/data/say/playerProfile.js:33` T? `No achievements yet`
- `src/data/say/playerProfile.js:34` T? `{tier} achievement`
- `src/data/say/playerProfile.js:35` T? `Rarest achievement`
- `src/data/say/playerProfile.js:36` T? `None yet`
- `src/data/say/playerProfile.js:39` T? `Open the Codex`
- `src/data/say/playerProfile.js:41` T? `{count} plot ready`
- `src/data/say/playerProfile.js:41` T? `{count} plots ready`
- `src/data/say/playerProfile.js:43` T? `In party`
- `src/data/say/playerProfile.js:44` T? `Invite to Party`

### data: prog3 (79)

- `src/data/prog3.js:218` T `Range`
- `src/data/prog3.js:218` T `RANGE`
- `src/data/prog3.js:218` T? `reach farther — the first points count most`
- `src/data/prog3.js:218` T? `Hit from farther away.`
- `src/data/prog3.js:218` T? `reach, not damage`
- `src/data/prog3.js:219` T `Power`
- `src/data/prog3.js:219` T `POWER`
- `src/data/prog3.js:219` T? `+0.5 damage per hit`
- `src/data/prog3.js:219` T? `hit harder — the first points count most`
- `src/data/prog3.js:219` T? `% more damage`
- `src/data/prog3.js:219` T? `Every hit lands harder.`
- `src/data/prog3.js:222` T `Speed`
- `src/data/prog3.js:222` T `SPEED`
- `src/data/prog3.js:222` T? `−0.35% swing time`
- `src/data/prog3.js:222` T? `swing faster — the first points count most`
- `src/data/prog3.js:222` T? `Attack faster.`
- `src/data/prog3.js:223` T `Luck`
- `src/data/prog3.js:223` T `LUCK`
- `src/data/prog3.js:223` T? `+0.3% crit chance, +1% crit damage`
- `src/data/prog3.js:223` T? `more crits, and bigger — the first points count most`
- `src/data/prog3.js:223` T? `% crit chance`
- `src/data/prog3.js:223` T? `More crits, and bigger ones.`
- `src/data/prog3.js:224` T `Special`
- `src/data/prog3.js:224` T `SPECIAL`
- `src/data/prog3.js:224` T? `+1% special attack damage`
- `src/data/prog3.js:224` T? `stronger specials — the first points count most`
- `src/data/prog3.js:224` T? `% special damage`
- `src/data/prog3.js:224` T? `Your special attack hits harder.`
- `src/data/prog3.js:228` T `Element`
- `src/data/prog3.js:228` T `ELEM`
- `src/data/prog3.js:228` T? `+1 elemental power`
- `src/data/prog3.js:228` T? `stronger burns and combos — the first points count most`
- `src/data/prog3.js:228` T? `Stronger burns and combos.`
- `src/data/prog3.js:232` T `Crit`
- `src/data/prog3.js:232` T? `+0.4% crit chance`
- `src/data/prog3.js:233` T `Crit Dmg`
- `src/data/prog3.js:233` T? `+1% crit damage`
- `src/data/prog3.js:233` T? `+2 damage on crits`
- `src/data/prog3.js:329` T `Max HP`
- `src/data/prog3.js:329` T `HP`
- `src/data/prog3.js:329` T? `+8 max HP`
- `src/data/prog3.js:329` T? `Take more hits before going down.`
- `src/data/prog3.js:330` T `Defense`
- `src/data/prog3.js:330` T `DEF`
- `src/data/prog3.js:330` T? `−0.4% damage taken`
- `src/data/prog3.js:330` T? `take less damage — the first points count most`
- `src/data/prog3.js:330` T? `% less damage`
- `src/data/prog3.js:330` T? `Every hit on you hurts less.`
- `src/data/prog3.js:331` T `Max Mana`
- `src/data/prog3.js:331` T `MP`
- `src/data/prog3.js:331` T? `+2.5 max mana`
- `src/data/prog3.js:331` T? `More specials and bursts per fight.`
- `src/data/prog3.js:332` T `Stamina`
- `src/data/prog3.js:332` T `STAM`
- `src/data/prog3.js:332` T? `+3 max stamina`
- `src/data/prog3.js:332` T? `More specials and dodges before a rest.`
- `src/data/prog3.js:333` T `Dodge`
- `src/data/prog3.js:333` T `DODGE`
- `src/data/prog3.js:333` T? `dodge more hits — the first points count most`
- `src/data/prog3.js:333` T? `Some hits miss you completely.`
- `src/data/prog3.js:334` T `Speed`
- `src/data/prog3.js:334` T `MOVE`
- `src/data/prog3.js:334` T? `Move Speed`
- `src/data/prog3.js:334` T? `+0.4% move speed`
- `src/data/prog3.js:334` T? `move faster — the first points count most`
- `src/data/prog3.js:334` T? `Run faster.`
- `src/data/prog3.js:334` T? `movement, not damage`
- `src/data/prog3.js:335` T `Resist`
- `src/data/prog3.js:335` T `RESIST`
- `src/data/prog3.js:335` T? `Elem Resist`
- `src/data/prog3.js:335` T? `−0.4% elemental damage taken`
- `src/data/prog3.js:335` T? `take less elemental damage — the first points count most`
- `src/data/prog3.js:335` T? `% less elemental`
- `src/data/prog3.js:335` T? `Burns and blasts hurt less.`
- `src/data/prog3.js:340` T? `Full strength against monsters at your level or below. Weaker against stronger ones, an...`
- `src/data/prog3.js:373` T? `max HP`
- `src/data/prog3.js:382` T `Melee`
- `src/data/prog3.js:383` T `Bow`
- `src/data/prog3.js:384` T `Magic`

### data: questCard (7)

- `src/data/say/questCard.js:5` T? `Ready to hand in`
- `src/data/say/questCard.js:7` T? `Next: {quest}`
- `src/data/say/questCard.js:8` T? `+{more} more: look for a gold ! on your map`
- `src/data/say/questCard.js:10` T? `Show this quest`
- `src/data/say/questCard.js:11` T? `Fold this quest`
- `src/data/say/questCard.js:12` T? `Open this quest's page`
- `src/data/say/questCard.js:13` T? `Open quest ›`

### data: questCoach (4)

- `src/data/say/questCoach.js:3` T? `Push a little to turn, further to walk.`
- `src/data/say/questCoach.js:4` T? `Face a monster in reach, then tap once: you keep fighting until you tap again.`
- `src/data/say/questCoach.js:6` T? `Face a monster in reach and tap Attack: one hit a tap. Hold it until the ring fills to ...`
- `src/data/say/questCoach.js:7` T? `Your specials come up beside Attack while a monster is in sight. Tap one.`

### data: questDetail (3)

- `src/data/say/questDetail.js:4` T? `Quest not found.`
- `src/data/say/questDetail.js:6` T? `☆ Track this quest`
- `src/data/say/questDetail.js:7` T? `Your map's gold star follows this quest.`

### data: questJournal (11)

- `src/data/say/questJournal.js:7` T? `Given to you`
- `src/data/say/questJournal.js:9` T? `You got`
- `src/data/say/questJournal.js:12` T? `Tracked: stop tracking this quest`
- `src/data/say/questJournal.js:13` T? `Stop tracking`
- `src/data/say/questJournal.js:14` T? `Track this quest`
- `src/data/say/questJournal.js:16` T? `Your map's gold star follows this quest.`
- `src/data/say/questJournal.js:19` T? `Where: {where}. Show on map`
- `src/data/say/questJournal.js:20` T? `Where: {where}`
- `src/data/say/questJournal.js:22` T? `Show on map`
- `src/data/say/questJournal.js:24` T? `{gold} gold`
- `src/data/say/questJournal.js:25` T? `+{xp} XP`

### data: questOffer (12)

- `src/data/say/questOffer.js:4` T? `New Quest`
- `src/data/say/questOffer.js:5` T? `Quest Complete`
- `src/data/say/questOffer.js:7` T? `He hands you now`
- `src/data/say/questOffer.js:8` T? `For finishing “{title}”`
- `src/data/say/questOffer.js:9` T? `this quest`
- `src/data/say/questOffer.js:11` T? `Accept Quest`
- `src/data/say/questOffer.js:12` T? `Claim Rewards`
- `src/data/say/questOffer.js:13` T? `Not now`
- `src/data/say/questOffer.js:14` T? `Close. Your reward stays waiting for you.`
- `src/data/say/questOffer.js:16` T? `Your rewards`
- `src/data/say/questOffer.js:17` T? `+{xp} XP to {skill}`
- `src/data/say/questOffer.js:18` T? `Rewards claimed!`

### data: questPages (12)

- `src/data/say/questPages.js:6` T? `Active ({n})`
- `src/data/say/questPages.js:9` T? `Your quests`
- `src/data/say/questPages.js:13` T? `Pages of this quest`
- `src/data/say/questPages.js:16` T? `What to do now: {now}. Tap to see the quest journey`
- `src/data/say/questPages.js:17` T? `Rewards. Tap to see them and what comes next`
- `src/data/say/questPages.js:19` T? `Quest journey`
- `src/data/say/questPages.js:20` T? `Hand it in to {npc}`
- `src/data/say/questPages.js:22` T? `Completion rewards`
- `src/data/say/questPages.js:23` T? `Next quest`
- `src/data/say/questPages.js:24` T? `Available after {title}`
- `src/data/say/questPages.js:26` T? `+{ap} AP`
- `src/data/say/questPages.js:28` T? `Pick another quest`

### data: questPanel (6)

- `src/data/say/questPanel.js:4` T? `+{xp} XP`
- `src/data/say/questPanel.js:5` T? `Choose where to train it`
- `src/data/say/questPanel.js:7` T? `Pick the pine one he swaps`
- `src/data/say/questPanel.js:8` T? `Bring a Pine Bow or Pine Staff`
- `src/data/say/questPanel.js:13` T? `See the quest`
- `src/data/say/questPanel.js:14` T? `Claim reward`

### data: questsPanel (7)

- `src/data/say/questsPanel.js:4` T? `Quest path`
- `src/data/say/questsPanel.js:5` T? `{look} on the ground`
- `src/data/say/questsPanel.js:9` T? `Your quests`
- `src/data/say/questsPanel.js:15` T? `Daily rewards`
- `src/data/say/questsPanel.js:17` T? `+{ap} AP`
- `src/data/say/questsPanel.js:18` T? `Done quests`
- `src/data/say/questsPanel.js:20` T? `No quest right now. Look for a gold ! over someone's head in BroTown.`

### data: raceHud (11)

- `src/data/say/raceHud.js:5` T? `Touch all {flags} flags, then back here`
- `src/data/say/raceHud.js:7` T? `Flags {touched}/{of}`
- `src/data/say/raceHud.js:8` T? `Back to the start!`
- `src/data/say/raceHud.js:9` T? `Lil Bro {time}`
- `src/data/say/raceHud.js:11` T? `You beat Lil Bro!`
- `src/data/say/raceHud.js:12` T? `Lil Bro wins!`
- `src/data/say/raceHud.js:13` T? `No race.`
- `src/data/say/raceHud.js:14` T? `You {you} · Lil Bro {lil}`
- `src/data/say/raceHud.js:15` T? `Talk to Lil Bro for your reward.`
- `src/data/say/raceHud.js:16` T? `Sprint, and drink Zoom Juice at the start line.`
- `src/data/say/raceHud.js:17` T? `Race again`

### data: remains (4)

- `src/data/remains.js:15` T? `Snowman Remains`
- `src/data/remains.js:16` T? `Slime Remains`
- `src/data/remains.js:17` T? `Skeleton Remains`
- `src/data/remains.js:18` T? `Fire Goblin Remains`

### data: salvage (6)

- `src/data/salvage.js:17` T `Copper`
- `src/data/salvage.js:18` T `Iron`
- `src/data/salvage.js:19` T `Black Steel`
- `src/data/salvage.js:88` T? `Makes a`
- `src/data/salvage.js:88` T? `torso, greaves or sword`
- `src/data/salvage.js:88` T? `(Blacksmith, Salvage tab)`

### data: selfPanel (5)

- `src/data/say/selfPanel.js:4` T? `No profile.`
- `src/data/say/selfPanel.js:6` T? `Lv {level} · {archetype}`
- `src/data/say/selfPanel.js:16` T? `Weapon: {name}`
- `src/data/say/selfPanel.js:17` T? `Armor: {name}`
- `src/data/say/selfPanel.js:18` T? `Pet: {name}`

### data: settingsPanel (19)

- `src/data/say/settingsPanel.js:4` T? `Restart Character?`
- `src/data/say/settingsPanel.js:6` T? `Connecting to the game server…`
- `src/data/say/settingsPanel.js:7` T? `Not while you are fighting a player`
- `src/data/say/settingsPanel.js:8` T? `{why}. Nothing was changed: try again once the fight is over.`
- `src/data/say/settingsPanel.js:9` T? `Can't restart right now — no connection to the game server. Try again in a moment.`
- `src/data/say/settingsPanel.js:10` T? `Your character starts over at {level}. All items, gold, skills and quest progress are {...`
- `src/data/say/settingsPanel.js:12` T? `deleted forever`
- `src/data/say/settingsPanel.js:13` T? `Keep playing`
- `src/data/say/settingsPanel.js:15` T? `Restart at Lv 1`
- `src/data/say/settingsPanel.js:21` T? `Quest path`
- `src/data/say/settingsPanel.js:22` T? `Landscape menu side`
- `src/data/say/settingsPanel.js:24` T? `Notifications — SILENCED, tap to turn them back on`
- `src/data/say/settingsPanel.js:25` T? `Notifications — silence all of them`
- `src/data/say/settingsPanel.js:26` T? `Login Key — save it, or continue a character`
- `src/data/say/settingsPanel.js:27` T? `Controls — replay the tutorial`
- `src/data/say/settingsPanel.js:28` T? `Play full screen — hide the browser bar`
- `src/data/say/settingsPanel.js:29` T? `Feedback — message the developers`
- `src/data/say/settingsPanel.js:30` T? `About — privacy, rules and credits`
- `src/data/say/settingsPanel.js:31` T? `Restart character — start over at Level 1`

### data: shardCrack (27)

- `src/data/say/shardCrack.js:4` T? `Gem Cutter`
- `src/data/say/shardCrack.js:5` T? `Gem Cutting Lv {lvl} · {chance}% a shard`
- `src/data/say/shardCrack.js:7` T? `Raw {element} Gem`
- `src/data/say/shardCrack.js:9` T? `{n} {shard} cracked: {found}`
- `src/data/say/shardCrack.js:9` T? `{n} {shard}s cracked: {found}`
- `src/data/say/shardCrack.js:10` T? `{count} {name}s!`
- `src/data/say/shardCrack.js:11` T? `a {name}!`
- `src/data/say/shardCrack.js:12` T? `no gem this time`
- `src/data/say/shardCrack.js:14` T? `Crack a land's shards: some hold its raw gem. {per} raw gems make one elemental gem to ...`
- `src/data/say/shardCrack.js:15` T? `Each shard: {chance}%{next}.`
- `src/data/say/shardCrack.js:16` T? `({pct}% at Gem Cutting {lvl})`
- `src/data/say/shardCrack.js:19` T? `×{have} · {chance}% a Raw {element} Gem`
- `src/data/say/shardCrack.js:21` T? `All {count}`
- `src/data/say/shardCrack.js:22` T? `No shards to crack. Monsters and resources out in the lands drop their land's shard.`
- `src/data/say/shardCrack.js:24` T? `Raw gems`
- `src/data/say/shardCrack.js:25` T? `×{have} · {per} make a {element} Gem`
- `src/data/say/shardCrack.js:26` T? `×{have} · {more} more for a {element} Gem`
- `src/data/say/shardCrack.js:28` T? `Need {per}`
- `src/data/say/shardCrack.js:29` T? `Raw gems you find show here.`
- `src/data/say/shardCrack.js:31` T? `Rare Gem`
- `src/data/say/shardCrack.js:32` T? `×{count} · cut it into any elemental gem: pick one.`
- `src/data/say/shardCrack.js:33` T? `Cut into a {element} Gem`
- `src/data/say/shardCrack.js:34` T? `Pick a gem first`
- `src/data/say/shardCrack.js:36` T? `Your gems`
- `src/data/say/shardCrack.js:37` T? `{element} Gem ×{count}`
- `src/data/say/shardCrack.js:38` T? `Set them into your gear on the Set gems tab.`
- `src/data/say/shardCrack.js:39` T? `Elemental gems you make show here.`

### data: shards (9)

- `src/data/shards.js:24` T `Floral Shard`
- `src/data/shards.js:25` T `Lava Shard`
- `src/data/shards.js:26` T `Poison Shard`
- `src/data/shards.js:27` T `Ice Shard`
- `src/data/shards.js:28` T `Lightning Shard`
- `src/data/shards.js:29` T `Rock Shard`
- `src/data/shards.js:30` T `Wind Shard`
- `src/data/shards.js:31` T `Water Shard`
- `src/data/shards.js:39` T `Floral Shard`

### data: shopkeeper (19)

- `src/data/say/shopkeeper.js:9` T? `“The more I have, the less I pay.”`
- `src/data/say/shopkeeper.js:12` T? `His shelf`
- `src/data/say/shopkeeper.js:13` T? `His shelf is bare. Sell him something.`
- `src/data/say/shopkeeper.js:15` T? `Tap his shelf to buy · tap your bag to sell`
- `src/data/say/shopkeeper.js:16` T? `Tap his shelf to buy · tap your bag below to sell`
- `src/data/say/shopkeeper.js:18` T? `Always in stock`
- `src/data/say/shopkeeper.js:19` T? `You have one`
- `src/data/say/shopkeeper.js:20` T? `Mayor Bro's quest gives the first`
- `src/data/say/shopkeeper.js:21` T? `A replacement, if yours was lost`
- `src/data/say/shopkeeper.js:22` T? `Bro has {count}`
- `src/data/say/shopkeeper.js:23` T? `you have {count}`
- `src/data/say/shopkeeper.js:24` T? `One fewer`
- `src/data/say/shopkeeper.js:25` T? `One more`
- `src/data/say/shopkeeper.js:27` T? `Not enough gold`
- `src/data/say/shopkeeper.js:28` T? `He won't buy`
- `src/data/say/shopkeeper.js:29` T? `Not yet`
- `src/data/say/shopkeeper.js:30` T? `Not for sale`
- `src/data/say/shopkeeper.js:31` T? `BUY {price}`
- `src/data/say/shopkeeper.js:32` T? `SELL {price}`

### data: skills (66)

- `src/data/say/skills.js:4` T? `‹ All skills`
- `src/data/say/skills.js:5` T? `Level {lvl}`
- `src/data/say/skills.js:6` T? `{xp} / {need} XP · {left} XP to Lv {next}`
- `src/data/say/skills.js:7` T? `Each hit`
- `src/data/say/skills.js:8` T? `At Lv {lvl}`
- `src/data/say/skills.js:9` T? `Full XP`
- `src/data/say/skills.js:10` T? `Nothing at your level`
- `src/data/say/skills.js:11` T? `Less XP`
- `src/data/say/skills.js:13` T? `Next unlock`
- `src/data/say/skills.js:15` T? `{name} at Lv {lvl}`
- `src/data/say/skills.js:17` T? `Found at`
- `src/data/say/skills.js:18` T? `Higher levels improve results and unlock new content as it's added.`
- `src/data/say/skills.js:21` T? `{name}, level {lvl}`
- `src/data/say/skills.js:22` T? `Lv {lvl}`
- `src/data/say/skills.js:23` T? `{xp} / {need} XP`
- `src/data/say/skills.js:26` T? `Life Skills`
- `src/data/say/skills.js:27` T? `{xp}/{need} XP · {desc}`
- `src/data/say/skills.js:30` T? `Chop trees for wood + zone gems`
- `src/data/say/skills.js:32` T? `Catch fish for cooking + zone gems`
- `src/data/say/skills.js:34` T? `Mine ore (iron Lv1-5, steel Lv6-10) + zone gems`
- `src/data/say/skills.js:37` T? `Cook fish + ingredients for healing food`
- `src/data/say/skills.js:39` T? `Forge melee gear bases with gem slots`
- `src/data/say/skills.js:41` T? `Craft bows & staves with gem slots`
- `src/data/say/skills.js:42` T? `Gem Cutting`
- `src/data/say/skills.js:43` T? `Cut raw gems into polished slottable gems`
- `src/data/say/skills.js:45` T? `Slot gems into gear for elemental power`
- `src/data/say/skills.js:48` T? `Grow ingredients at the farm`
- `src/data/say/skills.js:50` T? `Capture weakened monsters as pets`
- `src/data/say/skills.js:54` T? `{elem} Gem`
- `src/data/say/skills.js:55` T? `No gems yet. Crack shards at the Gem Works to find them!`
- `src/data/say/skills.js:58` T? `Active Quests`
- `src/data/say/skills.js:59` T? `No active quests. Talk to NPCs with ❗ markers!`
- `src/data/say/skills.js:62` T? `Achievement Points`
- `src/data/say/skills.js:63` T? `Achievement points: {n}. Open your achievements`
- `src/data/say/skills.js:66` T? `Player Stats`
- `src/data/say/skills.js:68` T? `Monsters Killed`
- `src/data/say/skills.js:70` T? `Grand Slams`
- `src/data/say/skills.js:71` T? `Bosses Killed`
- `src/data/say/skills.js:72` T? `Highest Kill Lv`
- `src/data/say/skills.js:73` T? `Crits Landed`
- `src/data/say/skills.js:76` T? `PvP Kills`
- `src/data/say/skills.js:77` T? `PvP Deaths`
- `src/data/say/skills.js:78` T? `Duels Won`
- `src/data/say/skills.js:79` T? `Duels Lost`
- `src/data/say/skills.js:80` T? `Life Skills`
- `src/data/say/skills.js:81` T? `Fish Caught`
- `src/data/say/skills.js:82` T? `Trees Felled`
- `src/data/say/skills.js:83` T? `Ores Mined`
- `src/data/say/skills.js:84` T? `Items Crafted`
- `src/data/say/skills.js:85` T? `Items Salvaged`
- `src/data/say/skills.js:86` T? `Cook Success`
- `src/data/say/skills.js:87` T? `Cook Burns`
- `src/data/say/skills.js:89` T? `Harden OK`
- `src/data/say/skills.js:90` T? `Harden Fail`
- `src/data/say/skills.js:92` T? `Gold Earned`
- `src/data/say/skills.js:93` T? `Gold Spent`
- `src/data/say/skills.js:94` T? `Gold Lost (death)`
- `src/data/say/skills.js:95` T? `Total Gambled`
- `src/data/say/skills.js:96` T? `Gamble Won`
- `src/data/say/skills.js:97` T? `Gamble Lost`
- `src/data/say/skills.js:99` T? `Quests Done`
- `src/data/say/skills.js:100` T? `Rare Drops`
- `src/data/say/skills.js:101` T? `Zones Explored`
- `src/data/say/skills.js:102` T? `Dungeons Cleared`
- `src/data/say/skills.js:103` T? `Pets Captured`
- `src/data/say/skills.js:109` T? `No resources. Harvest nodes in combat zones!`

### data: smithy (35)

- `src/data/say/smithy.js:17` T? `Lv {lvl}`
- `src/data/say/smithy.js:23` T? `Smithing {lvl}`
- `src/data/say/smithy.js:26` T? `Could not smelt`
- `src/data/say/smithy.js:27` T? `All ({count})`
- `src/data/say/smithy.js:30` T? `Holding {name}`
- `src/data/say/smithy.js:31` T? `Weapon bag full`
- `src/data/say/smithy.js:32` T? `Forged {name}!`
- `src/data/say/smithy.js:33` T? `Could not forge`
- `src/data/say/smithy.js:36` T? `Level {def} to wear`
- `src/data/say/smithy.js:37` T? `Defense {def} to wear`
- `src/data/say/smithy.js:41` T? `{name} · max`
- `src/data/say/smithy.js:42` T? `H{h} → H{next}`
- `src/data/say/smithy.js:44` T? `Fail keeps H{h}`
- `src/data/say/smithy.js:45` T? `Fail → H0`
- `src/data/say/smithy.js:46` T? `Take gem out of {name}`
- `src/data/say/smithy.js:47` T? `Gem removed`
- `src/data/say/smithy.js:48` T? `Could not remove the gem`
- `src/data/say/smithy.js:49` T? `Take out`
- `src/data/say/smithy.js:50` T? `Hold a weapon to upgrade it.`
- `src/data/say/smithy.js:53` T? `Gold Bar`
- `src/data/say/smithy.js:54` T? `+1 Gold Bar`
- `src/data/say/smithy.js:55` T? `{tier} Amulet{worn}`
- `src/data/say/smithy.js:57` T? `Crafted {tier} Amulet!`
- `src/data/say/smithy.js:58` T? `Could not craft`
- `src/data/say/smithy.js:62` T? `{metal} Greaves`
- `src/data/say/smithy.js:63` T? `{metal} Torso`
- `src/data/say/smithy.js:64` T? `{metal} {type}{hard}`
- `src/data/say/smithy.js:68` T? `Salvaged{name}: +{bars} {what}{essence}`
- `src/data/say/smithy.js:69` T? `{metal} Bars`
- `src/data/say/smithy.js:72` T? `Now {grade}!`
- `src/data/say/smithy.js:76` T? `{back} Rare, Elite and Godly also leave their {essence}.`
- `src/data/say/smithy.js:77` T? `{bars} of {cost} bars back.`
- `src/data/say/smithy.js:79` T? `Carry a copper, iron or black steel piece to salvage it.`
- `src/data/say/smithy.js:81` T? `Too old to salvage`
- `src/data/say/smithy.js:83` T? `No {metal} piece below {grade} in your bag.`

### data: socialDash (24)

- `src/data/say/socialDash.js:6` T? `Blocked ({count})`
- `src/data/say/socialDash.js:7` T? `{count} online`
- `src/data/say/socialDash.js:8` T? `Add friend`
- `src/data/say/socialDash.js:9` T? `Add Friend`
- `src/data/say/socialDash.js:10` T? `Back to friends`
- `src/data/say/socialDash.js:11` T? `Blocked players`
- `src/data/say/socialDash.js:13` T? `Link copied!`
- `src/data/say/socialDash.js:14` T? `Share Invite Link`
- `src/data/say/socialDash.js:16` T? `Friends ({count})`
- `src/data/say/socialDash.js:17` T? `Requests ({count})`
- `src/data/say/socialDash.js:19` T? `No requests`
- `src/data/say/socialDash.js:20` T? `Requests you receive — and ones you've sent — show up here.`
- `src/data/say/socialDash.js:21` T? `wants to be Bros`
- `src/data/say/socialDash.js:27` T? `Search friends`
- `src/data/say/socialDash.js:29` T? `Friend presence returns when the connection is back.`
- `src/data/say/socialDash.js:30` T? `No friends yet`
- `src/data/say/socialDash.js:31` T? `No matches`
- `src/data/say/socialDash.js:32` T? `Try a different name.`
- `src/data/say/socialDash.js:34` T? `· Lv {lv}`
- `src/data/say/socialDash.js:38` T? `· with you`
- `src/data/say/socialDash.js:40` T? `Offline · {seen}`
- `src/data/say/socialDash.js:41` T? `Actions for {name}`
- `src/data/say/socialDash.js:48` T? `Say hi — messages reach {name} even while they're offline.`
- `src/data/say/socialDash.js:52` T? `Nobody blocked.`

### data: socialPanel (9)

- `src/data/say/socialPanel.js:6` T? `Friends ({count})`
- `src/data/say/socialPanel.js:7` T? `No friends yet. Tap a player and add them!`
- `src/data/say/socialPanel.js:8` T? `Online · {zone}`
- `src/data/say/socialPanel.js:11` T? `Blocked ({count})`
- `src/data/say/socialPanel.js:12` T? `Blocked players can't chat, attack, trade, or duel you.`
- `src/data/say/socialPanel.js:13` T? `Nobody blocked.`
- `src/data/say/socialPanel.js:16` T? `Muted ({count})`
- `src/data/say/socialPanel.js:17` T? `Muted players' messages don't reach you. Saved to your account, so it follows you betwe...`
- `src/data/say/socialPanel.js:18` T? `Nobody muted.`

### data: statsPanel (1)

- `src/data/say/statsPanel.js:21` T? `Gold earned`

### data: storeChat (24)

- `src/data/say/storeChat.js:4` T? `Still available?`
- `src/data/say/storeChat.js:5` T? `Would you take less?`
- `src/data/say/storeChat.js:6` T? `I have a question`
- `src/data/say/storeChat.js:7` T? `What's your offer?`
- `src/data/say/storeChat.js:9` T? `Accept {gold}g`
- `src/data/say/storeChat.js:10` T? `I'll think about it`
- `src/data/say/storeChat.js:14` T? `in {mins}m`
- `src/data/say/storeChat.js:15` T? `in {hours}h`
- `src/data/say/storeChat.js:16` T? `in {days}d`
- `src/data/say/storeChat.js:18` T? `Your listing`
- `src/data/say/storeChat.js:19` T? `Chat with {name}`
- `src/data/say/storeChat.js:20` T? `the seller`
- `src/data/say/storeChat.js:21` T? `Discuss this item directly`
- `src/data/say/storeChat.js:24` T? `🕑 Listing expires {when}`
- `src/data/say/storeChat.js:28` T? `Nobody has asked about this listing yet.`
- `src/data/say/storeChat.js:29` T? `Say hello — the seller sees this next time they are online.`
- `src/data/say/storeChat.js:32` T? `Your offer of {gold} is being held{thinking}`
- `src/data/say/storeChat.js:34` T? `— the seller is thinking about it`
- `src/data/say/storeChat.js:35` T? `Take it back`
- `src/data/say/storeChat.js:36` T? `Offer gold`
- `src/data/say/storeChat.js:38` T? `Your gold is held while the seller decides, and comes straight back if they say no, if ...`
- `src/data/say/storeChat.js:40` T? `Offers on this listing`
- `src/data/say/storeChat.js:41` T? `{name} offers {gold}`
- `src/data/say/storeChat.js:43` T? `Type a message...`

### data: storePanel (37)

- `src/data/say/storePanel.js:4` T? `Auction House`
- `src/data/say/storePanel.js:5` T? `What everyone is selling`
- `src/data/say/storePanel.js:8` T? `{mins}m left`
- `src/data/say/storePanel.js:9` T? `{hours}h left`
- `src/data/say/storePanel.js:10` T? `{days}d {hours}h left`
- `src/data/say/storePanel.js:14` T? `Lv {lv}`
- `src/data/say/storePanel.js:17` T? `{owners} owners`
- `src/data/say/storePanel.js:21` T? `{qty} of them · {cat}`
- `src/data/say/storePanel.js:22` T? `One · {cat}`
- `src/data/say/storePanel.js:25` T? `+ List an Item`
- `src/data/say/storePanel.js:27` T? `The store said no`
- `src/data/say/storePanel.js:29` T? `The store is not open on this world yet. It arrives with the next server update — every...`
- `src/data/say/storePanel.js:32` T? `Seller: {name}`
- `src/data/say/storePanel.js:34` T? `Messages about your listing`
- `src/data/say/storePanel.js:35` T? `Message the seller`
- `src/data/say/storePanel.js:36` T? `Top bid: {amount}g`
- `src/data/say/storePanel.js:37` T? `No bids`
- `src/data/say/storePanel.js:39` T? `Take {amount}g`
- `src/data/say/storePanel.js:40` T? `Sold for {amount} gold`
- `src/data/say/storePanel.js:41` T? `Take down`
- `src/data/say/storePanel.js:42` T? `Back in your bag`
- `src/data/say/storePanel.js:43` T? `Buy {price}g`
- `src/data/say/storePanel.js:44` T? `Bought for {price} gold`
- `src/data/say/storePanel.js:47` T? `Bid placed`
- `src/data/say/storePanel.js:49` T? `Back to the shelf`
- `src/data/say/storePanel.js:53` T? `My Listings`
- `src/data/say/storePanel.js:54` T? `My Bids`
- `src/data/say/storePanel.js:56` T? `Nothing is for sale right now.`
- `src/data/say/storePanel.js:57` T? `Nothing in this category right now.`
- `src/data/say/storePanel.js:58` T? `Be the first — open your bag, tap something and choose Sell.`
- `src/data/say/storePanel.js:59` T? `Try another category, or put one up yourself.`
- `src/data/say/storePanel.js:60` T? `You're not selling anything yet.`
- `src/data/say/storePanel.js:61` T? `Open your bag, tap something and choose Sell.`
- `src/data/say/storePanel.js:62` T? `{used} of {max} slots used`
- `src/data/say/storePanel.js:63` T? `You have no bids standing.`
- `src/data/say/storePanel.js:64` T? `Your gold is only held while your bid is the top one.`
- `src/data/say/storePanel.js:66` T? `Listings last one week. If nobody buys, it comes back to you — and any bid goes back to...`

### data: stormSparks (3)

- `src/data/stormSparks.js:33` T `arcs jumping over its body`
- `src/data/stormSparks.js:34` T `lightning thrown off it every way`
- `src/data/stormSparks.js:35` T `arcs round its shot`

### data: t2Panel (9)

- `src/data/say/t2Panel.js:8` T? `No character loaded.`
- `src/data/say/t2Panel.js:10` T? `{skill} skill · Lv {level}`
- `src/data/say/t2Panel.js:12` T? `· {pct}% to next`
- `src/data/say/t2Panel.js:13` T? `{pts} pts`
- `src/data/say/t2Panel.js:15` T? `Unlocks with next server update — points safe.`
- `src/data/say/t2Panel.js:16` T? `Combat trains Vitality · +1 pt per level`
- `src/data/say/t2Panel.js:17` T? `Sprint, block & roll to train · +1 pt per level`
- `src/data/say/t2Panel.js:18` T? `Block & mitigate to train · +1 pt per level`
- `src/data/say/t2Panel.js:19` T? `Deal damage to train · +1 pt per level`

### data: townBoard (170)

- `src/data/townBoard.js:57` T `Quests`
- `src/data/townBoard.js:58` T `Explore the Lands`
- `src/data/townBoard.js:59` T `Dungeons`
- `src/data/townBoard.js:60` T `Fight`
- `src/data/townBoard.js:61` T `Craft & Grow`
- `src/data/townBoard.js:62` T `Trade & Bank`
- `src/data/townBoard.js:63` T `Gambling`
- `src/data/townBoard.js:64` T `Town Life`
- `src/data/townBoard.js:73` T `Mayor’s Story`
- `src/data/townBoard.js:73` T `Main story quests`
- `src/data/townBoard.js:74` T? `The Mayor’s quests, six in a row: slimes in the land of {verdant}, snowmen in {frost}, ...`
- `src/data/townBoard.js:75` T? `About 1,175 gold in all, with XP and gear on the way. His first quest opens everyone el...`
- `src/data/townBoard.js:76` T? `Mayor Bro, on the Town Hall’s steps, in BroTown.`
- `src/data/townBoard.js:76` T? `Mayor Bro`
- `src/data/townBoard.js:78` T `Town Quests`
- `src/data/townBoard.js:78` T `Help the townsfolk`
- `src/data/townBoard.js:79` T? `Twelve quests from six people: Blacksmith Bro, Woodworker Bro, Farmer Bro, Beastmaster ...`
- `src/data/townBoard.js:80` T? `They open after the Mayor’s first quest. Look for the gold “!” over a head, in the stre...`
- `src/data/townBoard.js:81` T? `Around BroTown’s square.`
- `src/data/townBoard.js:83` T `Goo Grotto`
- `src/data/townBoard.js:84` T? `A dungeon of the land of {verdant}: three waves of its slimes, then a giant slime that ...`
- `src/data/townBoard.js:85` T? `Built for a party of 2 or 3 at about level 10. Clear it for gold, the boss’s chest and ...`
- `src/data/townBoard.js:86` T? `Die inside and you wake in BroTown with your bag kept.`
- `src/data/townBoard.js:87` T? `In the land of {verdant}, west of BroTown, in its first stretch.`
- `src/data/townBoard.js:88` T `Great Cave`
- `src/data/townBoard.js:89` T? `A dungeon of the rock monsters of {hollows}: three waves, then an Amethyst Golem.`
- `src/data/townBoard.js:90` T? `Levels 26 to 30, never above your own level. A clear pays gold and opens the boss’s chest.`
- `src/data/townBoard.js:91` T? `Deep in the land of {hollows}, east of BroTown, at the end of the mine railway.`
- `src/data/townBoard.js:92` T `Foundry Dome`
- `src/data/townBoard.js:93` T? `A dungeon of the slimes of {thunder}: three waves, then a giant Storm Slime that splits...`
- `src/data/townBoard.js:94` T? `Levels 26 to 30, never above your own level. A clear pays gold and opens the boss’s chest.`
- `src/data/townBoard.js:95` T? `Deep in the land of {thunder}, south-east of BroTown.`
- `src/data/townBoard.js:96` T `Buried City`
- `src/data/townBoard.js:97` T? `A dungeon of the mummies of {sky}: three waves, then a Gilded Mummy.`
- `src/data/townBoard.js:98` T? `Levels 41 to 45, never above your own level. A clear pays gold and opens the boss’s chest.`
- `src/data/townBoard.js:99` T? `Far out in the land of {sky}, north-east of BroTown.`
- `src/data/townBoard.js:101` T `The Arena`
- `src/data/townBoard.js:101` T `Entry: 100 gold`
- `src/data/townBoard.js:102` T? `A tournament between players: 100 gold to enter, up to 8 fighters, one knockout bracket.`
- `src/data/townBoard.js:103` T? `Each match is a 3-minute duel with no healing. The champion wins 250 gold for every fig...`
- `src/data/townBoard.js:104` T? `Not fighting? Back a fighter with gold and share the losing side’s stakes.`
- `src/data/townBoard.js:105` T? `Sign up at the Sheriff’s Office, in BroTown.`
- `src/data/townBoard.js:109` T `No man’s land`
- `src/data/townBoard.js:109` T `PvP · Loot at risk`
- `src/data/townBoard.js:110` T? `Outside BroTown’s safe ground, players may fight each other. The further out you go, th...`
- `src/data/townBoard.js:111` T? `Attacking is a choice you are asked first. The attacker wears a red skull, the one atta...`
- `src/data/townBoard.js:112` T? `Killed by a player there, you lose everything you carry; what you wear you keep, unless...`
- `src/data/townBoard.js:113` T? `Everywhere outside BroTown’s safe ground.`
- `src/data/townBoard.js:114` T `Duels`
- `src/data/townBoard.js:114` T `Friendly · No loss`
- `src/data/townBoard.js:115` T? `Challenge another player to a friendly fight. Nobody loses anything: no items, no gold.`
- `src/data/townBoard.js:116` T? `Pick a player from the list at the Sheriff’s Office, or from their card.`
- `src/data/townBoard.js:117` T? `The Sheriff’s Office, in BroTown.`
- `src/data/townBoard.js:121` T? `The flora land, where slimes live. The Mayor’s first quest sends you here.`
- `src/data/townBoard.js:122` T? `Monsters from level 1 near town to 40 further out. Mine, chop and fish as you go.`
- `src/data/townBoard.js:123` T? `West of BroTown.`
- `src/data/townBoard.js:125` T? `The flame land of Fire Goblins.`
- `src/data/townBoard.js:125` T? `Monsters from level 1 near town to 40 further out. Mine, chop and fish as you go.`
- `src/data/townBoard.js:126` T? `North of BroTown.`
- `src/data/townBoard.js:128` T? `The frost land of Snowmen.`
- `src/data/townBoard.js:128` T? `Monsters from level 1 near town to 40 further out. Mine, chop and fish as you go.`
- `src/data/townBoard.js:129` T? `North-west of BroTown.`
- `src/data/townBoard.js:131` T? `The wind land of Mummies and Skeletons, with the Buried City far out.`
- `src/data/townBoard.js:131` T? `Monsters from level 1 near town to 40 further out. Mine, chop and fish as you go.`
- `src/data/townBoard.js:132` T? `North-east of BroTown.`
- `src/data/townBoard.js:134` T? `The stone land of Rock Monsters, with the Great Cave at the end of the railway.`
- `src/data/townBoard.js:134` T? `Monsters from level 1 near town to 40 further out. Mine, chop and fish as you go.`
- `src/data/townBoard.js:135` T? `East of BroTown.`
- `src/data/townBoard.js:137` T? `The storm land of Slimes, with the Foundry Dome far out.`
- `src/data/townBoard.js:137` T? `Monsters from level 1 near town to 40 further out. Mine, chop and fish as you go.`
- `src/data/townBoard.js:138` T? `South-east of BroTown.`
- `src/data/townBoard.js:140` T? `The water land of Fishmen.`
- `src/data/townBoard.js:140` T? `Monsters from level 1 near town to 40 further out. Mine, chop and fish as you go.`
- `src/data/townBoard.js:141` T? `South of BroTown.`
- `src/data/townBoard.js:143` T? `The venom land of Mire Wisps and Bog Lurkers.`
- `src/data/townBoard.js:143` T? `Monsters from level 1 near town to 40 further out. Mine, chop and fish as you go.`
- `src/data/townBoard.js:144` T? `South-west of BroTown.`
- `src/data/townBoard.js:147` T `Blacksmith`
- `src/data/townBoard.js:147` T `Forge & upgrade`
- `src/data/townBoard.js:148` T? `Smelt ore into bars, then forge great swords and armour from them.`
- `src/data/townBoard.js:149` T? `Upgrade (harden) your gear, make an amulet, or salvage old pieces for bars.`
- `src/data/townBoard.js:150` T? `Blacksmith Bro, by its steps, has the smithing quests.`
- `src/data/townBoard.js:151` T? `In BroTown, north of the square.`
- `src/data/townBoard.js:152` T `Woodworker`
- `src/data/townBoard.js:152` T `Bows, staffs & traps`
- `src/data/townBoard.js:153` T? `Turn logs into hardened wood, then make bows and staffs from it.`
- `src/data/townBoard.js:154` T? `Box traps for catching pets are made here too, one log each.`
- `src/data/townBoard.js:155` T? `In BroTown, north of the square.`
- `src/data/townBoard.js:156` T `Gem Works`
- `src/data/townBoard.js:156` T `Cut & socket gems`
- `src/data/townBoard.js:157` T? `Crack the shards monsters and harvests drop to find raw gems; three raw gems make an el...`
- `src/data/townBoard.js:158` T? `Set a gem in a weapon, an amulet or a shield: every hit then carries its element.`
- `src/data/townBoard.js:159` T? `In BroTown, east of the square.`
- `src/data/townBoard.js:160` T `Cookhouse`
- `src/data/townBoard.js:160` T `Food & buffs`
- `src/data/townBoard.js:161` T? `Cook your crops and herbs into dishes that heal, refill stamina or speed you up for a w...`
- `src/data/townBoard.js:162` T? `Raw fish cook at a campfire you light from a log, anywhere in the world.`
- `src/data/townBoard.js:163` T? `In BroTown, west of the square.`
- `src/data/townBoard.js:164` T `Feed & Seed`
- `src/data/townBoard.js:164` T `Seeds & orders`
- `src/data/townBoard.js:165` T? `Buy seeds and fill orders, and go to your farm.`
- `src/data/townBoard.js:166` T? `On the farm you dig, plant, water and harvest sixteen kinds of crop. Crops grow while y...`
- `src/data/townBoard.js:167` T? `In BroTown, west of the square.`
- `src/data/townBoard.js:168` T `Your Farm`
- `src/data/townBoard.js:168` T `Grow 16 crops`
- `src/data/townBoard.js:169` T? `Your own beds to grow crops in, free. The barn is the Pet House; the haystack gives a n...`
- `src/data/townBoard.js:170` T? `The Land Office takes you there; the farm’s gate brings you back to the same door.`
- `src/data/townBoard.js:171` T? `The Land Office, in BroTown, west of the square.`
- `src/data/townBoard.js:172` T `Pets`
- `src/data/townBoard.js:172` T `Catch & collect loot`
- `src/data/townBoard.js:173` T? `Arm a box trap on a monster, then defeat it, and you may catch it as a pet. Catching is...`
- `src/data/townBoard.js:174` T? `A pet follows you, picks up loot and wards off its element. Beastmaster Bro teaches you.`
- `src/data/townBoard.js:175` T? `Beastmaster Bro, by the Woodworker, in BroTown.`
- `src/data/townBoard.js:175` T? `Beastmaster Bro`
- `src/data/townBoard.js:178` T `General Store`
- `src/data/townBoard.js:178` T `Player weapon exchange`
- `src/data/townBoard.js:179` T? `The Exchange: buy and sell weapons with other players by placing orders. No fee.`
- `src/data/townBoard.js:180` T? `In BroTown, west of the square.`
- `src/data/townBoard.js:181` T `Diego’s Shop`
- `src/data/townBoard.js:181` T `Sell goods & tools`
- `src/data/townBoard.js:182` T? `Diego buys what you gather and make: ore, bars, logs, crops and gems.`
- `src/data/townBoard.js:183` T? `He also sells back the pickaxe, hatchet and rod, 100 gold each, if you lose one.`
- `src/data/townBoard.js:184` T? `Beside the General Store, in BroTown.`
- `src/data/townBoard.js:185` T `Auction House`
- `src/data/townBoard.js:185` T `Buy, bid & sell`
- `src/data/townBoard.js:186` T? `List items, weapons, gear or pets at your own price for 7 days, or buy, bid and make of...`
- `src/data/townBoard.js:187` T? `Sales are paid by mail if you are away. No fee.`
- `src/data/townBoard.js:188` T? `In BroTown, east of the square.`
- `src/data/townBoard.js:189` T `Gambling Den`
- `src/data/townBoard.js:189` T `Free spins & wagers`
- `src/data/townBoard.js:190` T? `A free daily spin you can double or nothing, a wager of 10 to 10,000 gold, and a weekly...`
- `src/data/townBoard.js:191` T? `In BroTown, south of the square.`
- `src/data/townBoard.js:192` T `Ace’s Coin Flip`
- `src/data/townBoard.js:192` T `45% chance to win`
- `src/data/townBoard.js:193` T? `Ace flips a coin: stake at least 10 gold, and win three times your stake or lose three ...`
- `src/data/townBoard.js:194` T? `The odds are against you: you win 45 times in 100.`
- `src/data/townBoard.js:195` T? `Beside the Gambling Den, in BroTown.`
- `src/data/townBoard.js:196` T `Bank`
- `src/data/townBoard.js:196` T `Gold & gear overview`
- `src/data/townBoard.js:197` T? `A look at your gold and your gear. Nothing can be stored here yet.`
- `src/data/townBoard.js:198` T? `In BroTown, east of the square.`
- `src/data/townBoard.js:201` T `Store gold & items`
- `src/data/townBoard.js:202` T? `Your vault: put gold and items in to keep them safe, and take them out when you need them.`
- `src/data/townBoard.js:205` T `Saloon`
- `src/data/townBoard.js:205` T `Parties & shared health`
- `src/data/townBoard.js:206` T? `Team up: invite players to your party. A party sees each other’s health, has its own ch...`
- `src/data/townBoard.js:207` T? `In BroTown, south of the square.`
- `src/data/townBoard.js:208` T `Guild Hall`
- `src/data/townBoard.js:208` T `10 skill guilds`
- `src/data/townBoard.js:209` T? `Your rank in each life skill’s guild, and its quests: a ladder of eight rewards for rea...`
- `src/data/townBoard.js:210` T? `Each pays gold, from 30 at the first to 2,000 at the last.`
- `src/data/townBoard.js:211` T? `In BroTown, north of the square.`
- `src/data/townBoard.js:212` T `Post Office`
- `src/data/townBoard.js:212` T `Mail & payouts`
- `src/data/townBoard.js:213` T? `Your mail: sales, refunds, trade payouts and rewards, and anything that came while you ...`
- `src/data/townBoard.js:214` T? `In BroTown, north of the square.`
- `src/data/townBoard.js:215` T `Hotel`
- `src/data/townBoard.js:215` T `Free rest · XP boost`
- `src/data/townBoard.js:216` T? `A free night’s rest: full health, stamina and mana, and Well Rested, more XP from fight...`
- `src/data/townBoard.js:217` T? `In BroTown, south of the square.`
- `src/data/townBoard.js:218` T `Lil Bro’s Race`
- `src/data/townBoard.js:218` T `Race around town`
- `src/data/townBoard.js:219` T? `Race Lil Bro once round the Town Hall’s square. He runs a little faster than you walk, ...`
- `src/data/townBoard.js:220` T? `Lil Bro, on the square west of the Town Hall.`
- `src/data/townBoard.js:220` T? `Lil Bro`
- `src/data/townBoard.js:224` T `Skateboard`
- `src/data/townBoard.js:224` T `Ride around town`
- `src/data/townBoard.js:225` T? `Ride a skateboard, twice as fast as walking, on BroTown’s safe ground only.`
- `src/data/townBoard.js:226` T? `Press the board button (Z on a computer) to get on or off. You step off at the edge of ...`
- `src/data/townBoard.js:227` T? `Anywhere on BroTown’s safe ground.`

### data: tradeWindow (55)

- `src/data/say/tradeWindow.js:7` T? `One fewer {name}`
- `src/data/say/tradeWindow.js:8` T? `One more {name}`
- `src/data/say/tradeWindow.js:9` T? `Remove {name}`
- `src/data/say/tradeWindow.js:12` T? `A pet no longer offered`
- `src/data/say/tradeWindow.js:13` T? `Lv {lv}`
- `src/data/say/tradeWindow.js:20` T? `{name} gave you`
- `src/data/say/tradeWindow.js:21` T? `Trade complete ✓`
- `src/data/say/tradeWindow.js:22` T? `You received`
- `src/data/say/tradeWindow.js:26` T? `You sent`
- `src/data/say/tradeWindow.js:31` T? `Trade failed — nothing was exchanged`
- `src/data/say/tradeWindow.js:32` T? `A pet in it could no longer be traded.`
- `src/data/say/tradeWindow.js:33` T? `There was no room in a collection for the pets.`
- `src/data/say/tradeWindow.js:36` T? `{name} wants to trade`
- `src/data/say/tradeWindow.js:37` T? `Open trade`
- `src/data/say/tradeWindow.js:39` T? `Trade request sent — waiting…`
- `src/data/say/tradeWindow.js:43` T? `{name} x{qty}`
- `src/data/say/tradeWindow.js:44` T? `{name} ({kind}, Lv {lv}{golden})`
- `src/data/say/tradeWindow.js:45` T? `{kind}, Lv {lv}{golden}`
- `src/data/say/tradeWindow.js:47` T? `{n} gold`
- `src/data/say/tradeWindow.js:48` T? `{n} item`
- `src/data/say/tradeWindow.js:48` T? `{n} items`
- `src/data/say/tradeWindow.js:49` T? `Confirm with {name}`
- `src/data/say/tradeWindow.js:50` T? `YOU GIVE`
- `src/data/say/tradeWindow.js:51` T? `YOU RECEIVE`
- `src/data/say/tradeWindow.js:52` T? `That is a large amount of gold. Check the numbers, then tap Accept twice.`
- `src/data/say/tradeWindow.js:53` T? `{name} has accepted — waiting on you.`
- `src/data/say/tradeWindow.js:54` T? `Leave this trade?`
- `src/data/say/tradeWindow.js:55` T? `Keep Trading`
- `src/data/say/tradeWindow.js:56` T? `Leave Trade`
- `src/data/say/tradeWindow.js:57` T? `Accepted ✓ — waiting`
- `src/data/say/tradeWindow.js:58` T? `Wait {s}s…`
- `src/data/say/tradeWindow.js:59` T? `Accept (large trade)`
- `src/data/say/tradeWindow.js:62` T? `Not while one of you is fighting a player. Try again in a few seconds.`
- `src/data/say/tradeWindow.js:63` T? `Saving is paused for a moment, try again.`
- `src/data/say/tradeWindow.js:66` T? `Trading with {name}`
- `src/data/say/tradeWindow.js:67` T? `You offer`
- `src/data/say/tradeWindow.js:69` T? `Your bag is empty`
- `src/data/say/tradeWindow.js:70` T? `Nothing staged yet`
- `src/data/say/tradeWindow.js:71` T? `Your weapons`
- `src/data/say/tradeWindow.js:72` T? `· max {n}`
- `src/data/say/tradeWindow.js:73` T? `Your pets`
- `src/data/say/tradeWindow.js:74` T? `{name} · Lv {lv}`
- `src/data/say/tradeWindow.js:78` T? `of {n}`
- `src/data/say/tradeWindow.js:79` T? `Presets subtract gold. Tap to make them add again.`
- `src/data/say/tradeWindow.js:80` T? `Presets add gold. Tap to make them subtract.`
- `src/data/say/tradeWindow.js:81` T? `Offer no gold`
- `src/data/say/tradeWindow.js:83` T? `Take back {n} gold from your offer`
- `src/data/say/tradeWindow.js:84` T? `Offer {n} more gold`
- `src/data/say/tradeWindow.js:87` T? `{name} offers`
- `src/data/say/tradeWindow.js:92` T? `Offer changed — review and confirm again`
- `src/data/say/tradeWindow.js:93` T? `Add an item or gold`
- `src/data/say/tradeWindow.js:94` T? `Ready ✓ — waiting`
- `src/data/say/tradeWindow.js:95` T? `Ready to trade`
- `src/data/say/tradeWindow.js:96` T? `Confirm trade`
- `src/data/say/tradeWindow.js:97` T? `Waiting for {name}…`

### data: trapCatch (8)

- `src/data/say/trapCatch.js:4` T? `A big golden one!`
- `src/data/say/trapCatch.js:5` T? `A golden one!`
- `src/data/say/trapCatch.js:6` T? `A big one!`
- `src/data/say/trapCatch.js:9` T? `Lv {lv}`
- `src/data/say/trapCatch.js:13` T? `Name your {kind}`
- `src/data/say/trapCatch.js:14` T? `Names are 2-16 letters, numbers or spaces`
- `src/data/say/trapCatch.js:15` T? `You can name it later on the Pets page`
- `src/data/say/trapCatch.js:17` T? `Name it`

### data: trapping (46)

- `src/data/trapping.js:96` T `Snowling`
- `src/data/trapping.js:97` T `Gobling`
- `src/data/trapping.js:98` T `Mumling`
- `src/data/trapping.js:99` T `Pebbling`
- `src/data/trapping.js:100` T `Sparklet`
- `src/data/trapping.js:103` T `Froglet`
- `src/data/trapping.js:106` T `Sporeling`
- `src/data/trapping.js:107` T `Capling`
- `src/data/trapping.js:108` T `Dewdrop`
- `src/data/trapping.js:251` T `Works at your Trapping level`
- `src/data/trapping.js:251` T `At your Trapping level`
- `src/data/trapping.js:254` T `XP`
- `src/data/trapping.js:283` T? `its land`
- `src/data/trapping.js:284` T `Softens`
- `src/data/trapping.js:330` T `legacy`
- `src/data/trapping.js:330` T `An old pet: it stays with you`
- `src/data/trapping.js:331` T `Put it away to trade or sell it`
- `src/data/trapping.js:333` T `Tradeable in`
- `src/data/trapping.js:334` T `Can be traded or sold`
- `src/data/trapping.js:338` T? `a pet`
- `src/data/trapping.js:360` T? `Trapping is resting for now`
- `src/data/trapping.js:361` T? `Not right now`
- `src/data/trapping.js:362` T? `Traps work out in the lands`
- `src/data/trapping.js:363` T? `Nothing to trap there`
- `src/data/trapping.js:364` T? `No trapping on safe ground`
- `src/data/trapping.js:365` T? `Get closer to set a trap`
- `src/data/trapping.js:366` T? `Your Trapping level is too low`
- `src/data/trapping.js:367` T? `You need a box trap (Woodworker)`
- `src/data/trapping.js:368` T? `Your pets are not ready yet`
- `src/data/trapping.js:369` T? `Your collection is full`
- `src/data/trapping.js:370` T? `Your traps need a rest`
- `src/data/trapping.js:371` T? `Slow down a little`
- `src/data/trapping.js:372` T? `You had to help kill it`
- `src/data/trapping.js:373` T? `That is not a log`
- `src/data/trapping.js:374` T? `You need a log for each trap`
- `src/data/trapping.js:375` T? `That pet is not yours`
- `src/data/trapping.js:376` T? `Names are 2-16 letters, numbers or spaces`
- `src/data/trapping.js:377` T `Tap again to confirm`
- `src/data/trapping.js:379` T? `An old pet stays with you`
- `src/data/trapping.js:380` T? `Put it away first`
- `src/data/trapping.js:381` T? `A new pet can be traded a day after its catch`
- `src/data/trapping.js:382` T? `At most 4 pets in one trade`
- `src/data/trapping.js:383` T? `That pet can no longer be traded`
- `src/data/trapping.js:385` T? `Your Pet House is as big as it gets`
- `src/data/trapping.js:386` T? `The price changed: look again`
- `src/data/trapping.js:387` T? `Not enough gold`

### data: treeArt (5)

- `src/data/treeArt.js:13` T `pine`
- `src/data/treeArt.js:15` T `softwood`
- `src/data/treeArt.js:17` T `hardwood`
- `src/data/treeArt.js:19` T `cedar`
- `src/data/treeArt.js:21` T `maple`

### data: vendor (6)

- `src/data/say/vendor.js:4` T? `Auction House`
- `src/data/say/vendor.js:5` T? `Individual item listings and bids`
- `src/data/say/vendor.js:7` T? `Your gold`
- `src/data/say/vendor.js:10` T? `Buy, sell, and bid with players`
- `src/data/say/vendor.js:11` T? `The market is not open on this world yet. It arrives with the next server update.`
- `src/data/say/vendor.js:13` T? `Meals and drinks are cooked at the Cookhouse, from what the farm grows.`

### data: waterAttack (2)

- `src/data/waterAttack.js:36` T `a torrent out of its mouth, and the splash thrown up where it lands`
- `src/data/waterAttack.js:39` T `a wave thrown out from under it, spray leaping off it`

### data: weaponGems (13)

- `src/data/weaponGems.js:76` T? `Burns what it hits`
- `src/data/weaponGems.js:77` T? `Freezes what it hits for 1.5 s, then chills it`
- `src/data/weaponGems.js:77` T? `Freezes what it hits`
- `src/data/weaponGems.js:79` T? `Soaks what it hits: its blows land`
- `src/data/weaponGems.js:80` T? `Soaks what it hits, to set up a combo`
- `src/data/weaponGems.js:81` T? `Roots what it hits for 1.5 s and poisons it`
- `src/data/weaponGems.js:81` T? `Roots and poisons what it hits`
- `src/data/weaponGems.js:83` T? `Shocks what it hits: each hit after sparks to a monster beside it`
- `src/data/weaponGems.js:84` T? `Shocks what it hits, to set up a combo`
- `src/data/weaponGems.js:85` T? `Cracks what it hits: +6% damage a hit, up to +30%`
- `src/data/weaponGems.js:86` T? `Slows what it hits`
- `src/data/weaponGems.js:87` T? `Thorns hurt what it hits whenever it attacks`
- `src/data/weaponGems.js:104` T? `% harder on`

### data: wheelBuildingDoors (30)

- `src/data/wheelBuildingDoors.js:100` T `Guild Hall`
- `src/data/wheelBuildingDoors.js:100` T `Clans and guilds`
- `src/data/wheelBuildingDoors.js:101` T `Post Office`
- `src/data/wheelBuildingDoors.js:101` T `Your mail and messages`
- `src/data/wheelBuildingDoors.js:102` T `Sheriff's Office`
- `src/data/wheelBuildingDoors.js:102` T `Duels and the arena`
- `src/data/wheelBuildingDoors.js:119` T `Town Board`
- `src/data/wheelBuildingDoors.js:119` T `Everything to do, and where`
- `src/data/wheelBuildingDoors.js:123` T `Hotel`
- `src/data/wheelBuildingDoors.js:123` T `A bed for the night`
- `src/data/wheelBuildingDoors.js:148` T `Diego`
- `src/data/wheelBuildingDoors.js:171` T `Ace`
- `src/data/wheelBuildingDoors.js:172` T `Blacksmith Bro`
- `src/data/wheelBuildingDoors.js:173` T `Lil Bro`
- `src/data/wheelBuildingDoors.js:187` T `Beastmaster Bro`
- `src/data/wheelBuildingDoors.js:197` T `Woodworker Bro`
- `src/data/wheelBuildingDoors.js:198` T `Farmer Bro`
- `src/data/wheelBuildingDoors.js:214` T `Sterling`
- `src/data/wheelBuildingDoors.js:215` T `Slim`
- `src/data/wheelBuildingDoors.js:216` T `Chef Blaze`
- `src/data/wheelBuildingDoors.js:217` T `Glint`
- `src/data/wheelBuildingDoors.js:218` T `Postmaster Pete`
- `src/data/wheelBuildingDoors.js:219` T `Deed Dave`
- `src/data/wheelBuildingDoors.js:220` T `Benny`
- `src/data/wheelBuildingDoors.js:221` T `Guildmaster Gary`
- `src/data/wheelBuildingDoors.js:222` T `Sheriff Buck`
- `src/data/wheelBuildingDoors.js:223` T `Gavel Greg`
- `src/data/wheelBuildingDoors.js:224` T `Bean`
- `src/data/wheelBuildingDoors.js:225` T `Old Man Reel`
- `src/data/wheelBuildingDoors.js:226` T `Tourist Terry`

### data: wheelDungeons (4)

- `src/data/wheelDungeons.js:91` T? `Lv {…} · {…}–{…} players`
- `src/data/wheelDungeons.js:92` T? `dungeon · Lv {…}–{…}`
- `src/data/wheelDungeons.js:95` T? `Lv {…} · for {…}–{…} players`
- `src/data/wheelDungeons.js:103` T? `Lv {…}+ · party of {…}–{…}`

### data: wheelSignposts (1)

- `src/data/wheelSignposts.js:40` T? `Lv {…}u2013{…}`

### data: wheelStageLooks (13)

- `src/data/wheelStageLooks.js:36` T `Glacier Snowman`
- `src/data/wheelStageLooks.js:37` T `Cinder Goblin`
- `src/data/wheelStageLooks.js:38` T `Gilded Mummy`
- `src/data/wheelStageLooks.js:39` T `Gilded Skeleton`
- `src/data/wheelStageLooks.js:40` T `Amethyst Golem`
- `src/data/wheelStageLooks.js:41` T `Storm Slime`
- `src/data/wheelStageLooks.js:42` T `Tempest Eye`
- `src/data/wheelStageLooks.js:43` T `Coral Frog`
- `src/data/wheelStageLooks.js:44` T `Spectral Rotcap`
- `src/data/wheelStageLooks.js:45` T `Shade Rotcap`
- `src/data/wheelStageLooks.js:46` T `Jade Slime`
- `src/data/wheelStageLooks.js:47` T `Bramble Shambler`
- `src/data/wheelStageLooks.js:48` T `Pollen Slime`

### data: woodwork (11)

- `src/data/say/woodwork.js:8` T? `Lv {lvl}`
- `src/data/say/woodwork.js:15` T? `Holding {name}`
- `src/data/say/woodwork.js:16` T? `Weapon bag full`
- `src/data/say/woodwork.js:17` T? `Made {name}!`
- `src/data/say/woodwork.js:18` T? `Could not make it`
- `src/data/say/woodwork.js:21` T? `Woodworking {lvl}`
- `src/data/say/woodwork.js:24` T? `{name} · max`
- `src/data/say/woodwork.js:25` T? `{name} · H{h} → H{next}`
- `src/data/say/woodwork.js:27` T? `Fail keeps H{h}`
- `src/data/say/woodwork.js:28` T? `Fail → H0`
- `src/data/say/woodwork.js:29` T? `Hold a bow or a staff to upgrade it.`

### data: words (4)

- `src/data/words.js:11` T? `{item} sold to {buyer} for {price}`
- `src/data/words.js:12` T? `trade from {from}`
- `src/data/words.js:13` T? `trade with {from}`
- `src/data/words.js:14` T? `clan war vs [{tag}]{outcome}`

### data: worldMap (22)

- `src/data/say/worldMap.js:4` T? `Open the world map`
- `src/data/say/worldMap.js:5` T? `World map (M)`
- `src/data/say/worldMap.js:8` T? `You are in {where}`
- `src/data/say/worldMap.js:9` T? `Finding you…`
- `src/data/say/worldMap.js:10` T? `Close the map`
- `src/data/say/worldMap.js:12` T? `North is up`
- `src/data/say/worldMap.js:13` T? `Zoom in`
- `src/data/say/worldMap.js:14` T? `Zoom out`
- `src/data/say/worldMap.js:15` T? `Back to you`
- `src/data/say/worldMap.js:17` T? `Remove {pin}`
- `src/data/say/worldMap.js:18` T? `Remove pin`
- `src/data/say/worldMap.js:28` T? `has a quest`
- `src/data/say/worldMap.js:29` T? `your pin`
- `src/data/say/worldMap.js:29` T? `your pins`
- `src/data/say/worldMap.js:35` T? `Zoom in for more`
- `src/data/say/worldMap.js:39` T? `Lv {lo}–{hi}`
- `src/data/say/worldMap.js:40` T? `{element} · Lv {lo}–{hi}`
- `src/data/say/worldMap.js:41` T? `to {to} · Lv 80–100`
- `src/data/say/worldMap.js:42` T? `safe, no monsters`
- `src/data/say/worldMap.js:43` T? `{land} · Lv {lo}–{hi}`
- `src/data/say/worldMap.js:44` T? `camp · Lv {lv}`
- `src/data/say/worldMap.js:45` T? `pass · Lv {lv}`

### data: worldProps (3)

- `src/data/worldProps.js:218` T `BLACKSMITH`
- `src/data/worldProps.js:285` T `AUCTION HOUSE`
- `src/data/worldProps.js:439` T `BANK`

### data: zoneHeader (12)

- `src/data/say/zoneHeader.js:4` T? `+{gold} gold`
- `src/data/say/zoneHeader.js:6` T? `Current zone`
- `src/data/say/zoneHeader.js:7` T? `Log out`
- `src/data/say/zoneHeader.js:11` T? `Test mode: the anti-cheat is off for this character`
- `src/data/say/zoneHeader.js:12` T? `TEST MODE`
- `src/data/say/zoneHeader.js:14` T? `{skill} level {level}, {next} XP to the next`
- `src/data/say/zoneHeader.js:16` T? `Lv {level}`
- `src/data/say/zoneHeader.js:18` T? `Free daily spin`
- `src/data/say/zoneHeader.js:19` T? `Free daily spin, already spun today`
- `src/data/say/zoneHeader.js:21` T? `Leave the world?`
- `src/data/say/zoneHeader.js:22` T? `You’ll log out to the title screen. Your bro is saved.`
- `src/data/say/zoneHeader.js:24` T? `Log Out`

### data: zones (14)

- `src/data/zones.js:60` T `Town`
- `src/data/zones.js:115` T `World View`
- `src/data/zones.js:146` T `Starting Meadow`
- `src/data/zones.js:152` T `Flame Fields`
- `src/data/zones.js:187` T `Poison Forest`
- `src/data/zones.js:201` T `Earth Forest`
- `src/data/zones.js:245` T `Frost Ridge`
- `src/data/zones.js:254` T `Electric Foundry`
- `src/data/zones.js:265` T `Stone Hollows`
- `src/data/zones.js:276` T `Wind Dunes`
- `src/data/zones.js:294` T `Water Caves`
- `src/data/zones.js:305` T `Dark Sanctum`
- `src/data/zones.js:314` T `Light Summit`
- `src/data/zones.js:331` T `Your Farm`

### deskTeach (9)

- `src/ui/deskTeach.js:102` P `Almost! Press E (or drag) when the bar empties to collect.`
- `src/ui/deskTeach.js:111` P? `<div data-desk-teach-key="">`
- `src/ui/deskTeach.js:163` P? `<svg viewBox="0 0 56 56" width="44" height="44" aria-hidden="true"><path d="M3 18 V38 H...`
- `src/ui/deskTeach.js:163` P? `" stroke-width="3" stroke-linejoin="round"/></svg>`
- `src/ui/deskTeach.js:203` P? `Click the monster to attack`
- `src/ui/deskTeach.js:208` P `Click the monster to attack`
- `src/ui/deskTeach.js:221` P? `Special: then attack</span>`
- `src/ui/deskTeach.js:221` P? `Special attack</span>`
- `src/ui/deskTeach.js:222` P? `Shield up / down</span></div>`

### equipActions (3)

- `src/ui/mobile/dash/equipActions.js:101` P? `WEAPON BAG FULL`
- `src/ui/mobile/dash/equipActions.js:263` P? `NEEDS LEVEL`
- `src/ui/mobile/dash/equipActions.js:399` P? `WEAPON BAG FULL`

### equipModel (21)

- `src/ui/mobile/sheet/equipModel.js:131` P `Weapon`
- `src/ui/mobile/sheet/equipModel.js:169` P `Weapon`
- `src/ui/mobile/sheet/equipModel.js:171` P `Shield`
- `src/ui/mobile/sheet/equipModel.js:174` P `Chest`
- `src/ui/mobile/sheet/equipModel.js:180` P `Legs`
- `src/ui/mobile/sheet/equipModel.js:215` P `Cape`
- `src/ui/mobile/sheet/equipModel.js:216` P `Cape`
- `src/ui/mobile/sheet/equipModel.js:233` P `Amulet`
- `src/ui/mobile/sheet/equipModel.js:282` P `Weapon`
- `src/ui/mobile/sheet/equipModel.js:284` P `Shield`
- `src/ui/mobile/sheet/equipModel.js:286` P `Chest`
- `src/ui/mobile/sheet/equipModel.js:288` P `Legs`
- `src/ui/mobile/sheet/equipModel.js:289` P `Cape`
- `src/ui/mobile/sheet/equipModel.js:291` P `Amulet`
- `src/ui/mobile/sheet/equipModel.js:437` P `CHEST`
- `src/ui/mobile/sheet/equipModel.js:437` P? `DMG RED`
- `src/ui/mobile/sheet/equipModel.js:438` P? `DMG RED`
- `src/ui/mobile/sheet/equipModel.js:444` P `LEGS`
- `src/ui/mobile/sheet/equipModel.js:444` P? `DMG RED`
- `src/ui/mobile/sheet/equipModel.js:445` P? `DMG RED`
- `src/ui/mobile/sheet/equipModel.js:447` P `AMULET`

### farmBus (1)

- `src/ui/mobile/farmBus.js:125` P `timeout`

### friendsModel (4)

- `src/ui/mobile/sheet/friendsModel.js:57` P? `Last seen just now`
- `src/ui/mobile/sheet/friendsModel.js:58` P? `Last seen {…}m ago`
- `src/ui/mobile/sheet/friendsModel.js:59` P? `Last seen {…}h ago`
- `src/ui/mobile/sheet/friendsModel.js:61` P? `Last seen {…}d ago`

### game: abilities (4)

- `src/game/abilities.js:407` P? `No shield equipped!`
- `src/game/abilities.js:407` P? `No weapon equipped!`
- `src/game/abilities.js:414` P? `Not enough energy!`
- `src/game/abilities.js:440` P? `Not in combat!`

### game: achievements (10)

- `src/game/achievements.js:142` P? `An achievement for what you'd already done:`
- `src/game/achievements.js:142` P? `Achievements for what you'd already done:`
- `src/game/achievements.js:157` P? `An achievement`
- `src/game/achievements.js:163` P? `an achievement`
- `src/game/achievements.js:293` P `Common`
- `src/game/achievements.js:294` P `Rare`
- `src/game/achievements.js:327` P? `Your best: Lv`
- `src/game/achievements.js:351` P? `best Lv`
- `src/game/achievements.js:372` P? `from achievements,`
- `src/game/achievements.js:372` P? `from quests, guilds and more.`

### game: alliance (35)

- `src/game/alliance.js:66` P? `Alliances are switched off right now`
- `src/game/alliance.js:67` P? `You're not in a party`
- `src/game/alliance.js:68` P? `Only the party leader can do that`
- `src/game/alliance.js:69` P? `Your party needs`
- `src/game/alliance.js:69` P? `active members to be an alliance`
- `src/game/alliance.js:70` P? `A name is 3 to 16 characters`
- `src/game/alliance.js:71` P? `A tag is 1 to 4 letters or numbers`
- `src/game/alliance.js:72` P? `You can rename it again in`
- `src/game/alliance.js:73` P? `Try again in a moment`
- `src/game/alliance.js:74` P? `The tag [`
- `src/game/alliance.js:74` P? `] is taken`
- `src/game/alliance.js:75` P? `That name`
- `src/game/alliance.js:75` P? `is taken`
- `src/game/alliance.js:76` P? `Name your alliance first`
- `src/game/alliance.js:77` P? `That's your own alliance`
- `src/game/alliance.js:78` P? `No alliance has the tag [`
- `src/game/alliance.js:79` P? `] isn't an alliance right now`
- `src/game/alliance.js:80` P? `Your alliance is already at war`
- `src/game/alliance.js:81` P? `] is already at war`
- `src/game/alliance.js:82` P? `Your alliance fought a war less than an hour ago (`
- `src/game/alliance.js:82` P? `to go)`
- `src/game/alliance.js:83` P? `] fought a war less than an hour ago (`
- `src/game/alliance.js:83` P? `to go)`
- `src/game/alliance.js:89` P? `That did not work`
- `src/game/alliance.js:97` P? `Victory over`
- `src/game/alliance.js:97` P? `Defeat by`
- `src/game/alliance.js:97` P? `Draw with`
- `src/game/alliance.js:107` P? `Your clan`
- `src/game/alliance.js:107` P? `is a party now:`
- `src/game/alliance.js:107` P? `active members make it an alliance`
- `src/game/alliance.js:108` P? `Your party is an ALLIANCE now!`
- `src/game/alliance.js:109` P? `Your alliance is a party again (under`
- `src/game/alliance.js:110` P? `Your alliance is [`
- `src/game/alliance.js:112` P? `WAR with [`
- `src/game/alliance.js:112` P? `] for 30 minutes, in No man's land`

### game: bank (15)

- `src/game/bank.js:104` P? `Stand at the Bank to use the vault`
- `src/game/bank.js:105` P? `You don't have that many`
- `src/game/bank.js:106` P? `The vault is full`
- `src/game/bank.js:107` P? `Your bag can't hold that many`
- `src/game/bank.js:108` P? `That is not there any more`
- `src/game/bank.js:109` P? `Tools stay in your bag`
- `src/game/bank.js:110` P? `One moment, the bank is busy`
- `src/game/bank.js:111` P? `The vault is closed for now`
- `src/game/bank.js:112` P? `The vault is closed for now`
- `src/game/bank.js:113` P? `Saving is paused for a moment, try again.`
- `src/game/bank.js:114` P? `That didn't go through`
- `src/game/bank.js:125` P `Put`
- `src/game/bank.js:125` P `in the vault`
- `src/game/bank.js:125` P `Took`
- `src/game/bank.js:125` P `out`

### game: blockedAsks (5)

- `src/game/blockedAsks.js:31` P `id`
- `src/game/blockedAsks.js:36` P `from`
- `src/game/blockedAsks.js:61` P? `many senders in one event: its rows are filtered instead (BLOCKED_ROWS)`
- `src/game/blockedAsks.js:62` P? `an answer to a request you sent yourself`
- `src/game/blockedAsks.js:63` P? `a warning that an attack is coming: hiding it would not stop the attack`

### game: bossChest (2)

- `src/game/bossChest.js:26` P `gold`
- `src/game/bossChest.js:39` P `XP`

### game: charName (9)

- `src/game/charName.js:102` P `chars`
- `src/game/charName.js:104` P `short`
- `src/game/charName.js:105` P `long`
- `src/game/charName.js:107` P `chars`
- `src/game/charName.js:108` P `staff`
- `src/game/charName.js:115` P `Type at least 2 letters`
- `src/game/charName.js:116` P `20 letters at most`
- `src/game/charName.js:117` P? `No emoji or symbols`
- `src/game/charName.js:118` P? `Pick a name of your own`

### game: characterRecord (8)

- `src/game/characterRecord.js:193` P? `derived from the held weapon (rpg blob restores it)`
- `src/game/characterRecord.js:194` P? `derived from worn armour (rpg blob restores it)`
- `src/game/characterRecord.js:195` P? `derived from worn armour (rpg blob restores it)`
- `src/game/characterRecord.js:196` P? `catalog has only none`
- `src/game/characterRecord.js:197` P? `follows st, which is restored`
- `src/game/characterRecord.js:198` P? `rides the 2s relay from the owner's store (its toggle went with the hidden MenuBar, v2....`
- `src/game/characterRecord.js:199` P? `retired axis, renders identically for everyone`
- `src/game/characterRecord.js:200` P? `retired axis, renders identically for everyone`

### game: chat (14)

- `src/game/chat.js:80` P `Roll again in`
- `src/game/chat.js:80` P `s`
- `src/game/chat.js:112` P `✉ Whisper`
- `src/game/chat.js:129` P `🛡 Party`
- `src/game/chat.js:139` P? `Party chat needs a server update — not sent.`
- `src/game/chat.js:144` P? `You're not in a party.`
- `src/game/chat.js:183` P? `Area chat needs a server update — not sent.`
- `src/game/chat.js:204` P? `Whispers need a server update — not sent.`
- `src/game/chat.js:214` P `✉ to`
- `src/game/chat.js:394` P `More than one player is called`
- `src/game/chat.js:394` P `— nothing sent.`
- `src/game/chat.js:396` P `Slow down a moment — that whisper was not sent.`
- `src/game/chat.js:397` P `Nobody here is called`
- `src/game/chat.js:399` P `✉ Whisper`

### game: chatChannel (10)

- `src/game/chatChannel.js:43` P `Everyone in the world`
- `src/game/chatChannel.js:44` P `Area`
- `src/game/chatChannel.js:44` P `Everyone in this zone`
- `src/game/chatChannel.js:45` P `Whisper`
- `src/game/chatChannel.js:45` P `One player, by name`
- `src/game/chatChannel.js:50` P `Party`
- `src/game/chatChannel.js:50` P `Only your party`
- `src/game/chatChannel.js:121` P? `You are no longer in a party — not sent. Switched to All.`
- `src/game/chatChannel.js:128` P? `Pick who to whisper to first — not sent.`
- `src/game/chatChannel.js:129` P? `A whisper goes to one name, with no spaces — not sent.`

### game: clientOff (15)

- `src/game/clientOff.js:26` P `Sound held only while needed`
- `src/game/clientOff.js:27` P `A crowd of one sound plays as a few`
- `src/game/clientOff.js:28` P `Pictures held once`
- `src/game/clientOff.js:29` P `Monster strips as colour numbers`
- `src/game/clientOff.js:30` P `Windows load when opened`
- `src/game/clientOff.js:31` P `Lean ground builder`
- `src/game/clientOff.js:32` P `Map leftover let go`
- `src/game/clientOff.js:33` P `Characters coloured on the chip`
- `src/game/clientOff.js:35` P `Printed shirts coloured on the chip`
- `src/game/clientOff.js:38` P `Sound waits for the world`
- `src/game/clientOff.js:40` P `Bodies under armour coloured on the chip`
- `src/game/clientOff.js:43` P `Townsfolk drawn live`
- `src/game/clientOff.js:48` P `Big drawings kept once`
- `src/game/clientOff.js:53` P `Same view for every screen`
- `src/game/clientOff.js:60` P `Speed ladder: a steady 30 when a screen cannot keep up`

### game: climb (4)

- `src/game/climb.js:78` P? `Empty for now: the reward comes next`
- `src/game/climb.js:80` P? `Already opened`
- `src/game/climb.js:80` P? `Step up to the chest`
- `src/game/climb.js:195` P `back`

### game: combatHelpers (3)

- `src/game/combatHelpers.js:426` P? `+0.17 base damage`
- `src/game/combatHelpers.js:773` P? `Playing in another window`
- `src/game/combatHelpers.js:777` P `reconnecting`

### game: dailyRewards (34)

- `src/game/dailyRewards.js:104` P? `Frost Ridge`
- `src/game/dailyRewards.js:104` P? `Flame Fields`
- `src/game/dailyRewards.js:104` P? `Wind Dunes`
- `src/game/dailyRewards.js:104` P? `Stone Hollows`
- `src/game/dailyRewards.js:105` P? `Electric Foundry`
- `src/game/dailyRewards.js:105` P? `Water Caves`
- `src/game/dailyRewards.js:105` P? `Poison Forest`
- `src/game/dailyRewards.js:105` P? `Earth Forest`
- `src/game/dailyRewards.js:127` P? `Daily quest`
- `src/game/dailyRewards.js:150` P? `Rare Gem`
- `src/game/dailyRewards.js:150` P? `Rare Gems`
- `src/game/dailyRewards.js:151` P? `Cooked Minnow`
- `src/game/dailyRewards.js:151` P? `Cooked Minnows`
- `src/game/dailyRewards.js:152` P? `Iron Bar`
- `src/game/dailyRewards.js:152` P? `Iron Bars`
- `src/game/dailyRewards.js:159` P? `a bonus spin`
- `src/game/dailyRewards.js:159` P? `bonus spins`
- `src/game/dailyRewards.js:160` P? `a streak freeze`
- `src/game/dailyRewards.js:160` P? `streak freezes`
- `src/game/dailyRewards.js:190` P? `under a minute`
- `src/game/dailyRewards.js:250` P? `Your daily spin's pot was kept for you: +`
- `src/game/dailyRewards.js:255` P? `Daily quest done:`
- `src/game/dailyRewards.js:258` P? `All three done! +`
- `src/game/dailyRewards.js:258` P? `a bonus spin`
- `src/game/dailyRewards.js:258` P? `bonus spins`
- `src/game/dailyRewards.js:258` P? `at the Gambling Den`
- `src/game/dailyRewards.js:264` P? `The season has ended early: the`
- `src/game/dailyRewards.js:264` P? `you'd reached and not claimed came to you.`
- `src/game/dailyRewards.js:267` P? `is over`
- `src/game/dailyRewards.js:267` P? `you hadn't claimed came to you`
- `src/game/dailyRewards.js:267` P? `. A new season starts now.`
- `src/game/dailyRewards.js:278` P? `Daily quests are open! Find them in Quests.`
- `src/game/dailyRewards.js:280` P? `A new day: three new daily quests, and your free spin is waiting at the Gambling Den.`
- `src/game/dailyRewards.js:284` P? `A new day: your free spin is waiting at the Gambling Den.`

### game: dashSidePref (3)

- `src/game/dashSidePref.js:61` P `Keeps the menus clear of the camera notch as you rotate`
- `src/game/dashSidePref.js:62` P `Menus always on the left, whichever way you hold it`
- `src/game/dashSidePref.js:63` P `Menus always on the right, whichever way you hold it`

### game: deathCard (20)

- `src/game/deathCard.js:34` P `a burning heap`
- `src/game/deathCard.js:38` P `a monster`
- `src/game/deathCard.js:40` P `Boss`
- `src/game/deathCard.js:45` P? `a player`
- `src/game/deathCard.js:77` P? `You lost what you carried and wore`
- `src/game/deathCard.js:77` P? `They took what you carried`
- `src/game/deathCard.js:88` P `You died`
- `src/game/deathCard.js:89` P? `killed you in No man's land`
- `src/game/deathCard.js:89` P? `killed you`
- `src/game/deathCard.js:89` P? `Killed by`
- `src/game/deathCard.js:90` P `Your bag is safe`
- `src/game/deathCard.js:91` P? `Back in BroTown in`
- `src/game/deathCard.js:114` P? `killed by`
- `src/game/deathCard.js:120` P? `You died`
- `src/game/deathCard.js:142` P? `You died, and came back in BroTown.`
- `src/game/deathCard.js:143` P? `killed you in No man's land.`
- `src/game/deathCard.js:143` P? `killed you.`
- `src/game/deathCard.js:143` P? `You came back in BroTown.`
- `src/game/deathCard.js:144` P? `You were killed by`
- `src/game/deathCard.js:144` P? `, and came back in BroTown.`

### game: deskKeyList (10)

- `src/game/deskKeyList.js:79` P? `Lock on`
- `src/game/deskKeyList.js:107` P? `Hide this`
- `src/game/deskKeyList.js:127` P? `WASD Move`
- `src/game/deskKeyList.js:127` P? `Shift Sprint`
- `src/game/deskKeyList.js:127` P? `Space Jump`
- `src/game/deskKeyList.js:127` P? `Click Attack`
- `src/game/deskKeyList.js:127` P? `E Use`
- `src/game/deskKeyList.js:127` P? `M Map`
- `src/game/deskKeyList.js:127` P? `Esc Close`
- `src/game/deskKeyList.js:127` P? `H Hide this`

### game: deskKeys (1)

- `src/game/deskKeys.js:139` P? `[data-esc], .bt-inspect-close`

### game: desktopControls (5)

- `src/game/desktopControls.js:361` T `Tap`
- `src/game/desktopControls.js:361` T `them`
- `src/game/desktopControls.js:361` T `to talk`
- `src/game/desktopControls.js:376` P? `Too far from`
- `src/game/desktopControls.js:594` P? `input, textarea, select, [contenteditable="true"], a[href]`

### game: drawLanes (68)

- `src/game/drawLanes.js:82` P? `the frame rate: the slowest frame, in ms, the pacer may hold a steady rate at, on a scr...`
- `src/game/drawLanes.js:84` P? `Every frame the screen offers (a faster screen: steady down to about 40 a second)`
- `src/game/drawLanes.js:84` P? `A steady 30 frames a second on a 60 screen (a faster screen: as before)`
- `src/game/drawLanes.js:90` P? `Every pixel of the budget`
- `src/game/drawLanes.js:90` P? `A quarter fewer pixels (a little softer)`
- `src/game/drawLanes.js:90` P? `Half the pixels (softer)`
- `src/game/drawLanes.js:94` P? `the most other players drawn in full (your party, your target, whoever fights you and y...`
- `src/game/drawLanes.js:96` P? `The 50 nearest other players drawn`
- `src/game/drawLanes.js:96` P? `The 30 nearest other players drawn`
- `src/game/drawLanes.js:96` P? `The 15 nearest other players drawn`
- `src/game/drawLanes.js:100` P? `one drawing program for the world's sprites, or three (chosen behind the loading screen...`
- `src/game/drawLanes.js:102` P? `One drawing program for the world's sprites`
- `src/game/drawLanes.js:102` P? `Three drawing programs, as the game drew until 2026-10-18 (a software renderer; a Windo...`
- `src/game/drawLanes.js:106` P? `how a character's look is made: coloured on the chip, or each baked (chosen behind the ...`
- `src/game/drawLanes.js:108` P? `Looks coloured on the graphics chip`
- `src/game/drawLanes.js:108` P? `Each look baked on first sight, as before the look palette (a Windows or Mac computer)`
- `src/game/drawLanes.js:112` P? `the metal's shine on gear`
- `src/game/drawLanes.js:114` P? `Metal shines`
- `src/game/drawLanes.js:114` P? `No shine on metal`
- `src/game/drawLanes.js:118` P? `the light and the shadows`
- `src/game/drawLanes.js:120` P? `Shadows drawn`
- `src/game/drawLanes.js:120` P? `No shadows`
- `src/game/drawLanes.js:124` P? `the sea's waves`
- `src/game/drawLanes.js:126` P? `The sea moves`
- `src/game/drawLanes.js:126` P? `The sea is still`
- `src/game/drawLanes.js:130` P? `the ms a frame the strip queue may take loading monsters' art in play (v2.3.5230: the l...`
- `src/game/drawLanes.js:132` P? `Monsters' art loads 4 ms a frame at most (a 60 screen's quarter)`
- `src/game/drawLanes.js:132` P? `Monsters' art loads 8 ms a frame at most (a 30 screen's quarter)`
- `src/game/drawLanes.js:138` P? `Every cache holds what its own cap allows`
- `src/game/drawLanes.js:138` P? `A full memory: each cache holds half its own cap, its oldest let go`
- `src/game/drawLanes.js:150` P? `A frame moves the world at most 50 ms (three frames at 60)`
- `src/game/drawLanes.js:150` P? `A frame moves the world at most 100 ms (three frames at 30): a missed refresh is still ...`
- `src/game/drawLanes.js:156` P? `the prewarm ring (step 3.3, LATER): one value and no reader until 3.3 builds the ring`
- `src/game/drawLanes.js:158` P? `No prewarm ring (not built)`
- `src/game/drawLanes.js:167` P `What every device draws today`
- `src/game/drawLanes.js:171` P `A lighter picture, for tests and slow devices: picked only by '?lane=light'`
- `src/game/drawLanes.js:175` P `A screen of 30 a second (an iPhone in Low Power Mode): the full lane's row (v2.3.5230: ...`
- `src/game/drawLanes.js:227` P `one`
- `src/game/drawLanes.js:227` P? `the three programs`
- `src/game/drawLanes.js:228` P `palette`
- `src/game/drawLanes.js:228` P? `whole colours`
- `src/game/drawLanes.js:229` P `look`
- `src/game/drawLanes.js:229` P? `each look baked`
- `src/game/drawLanes.js:230` P `sharp`
- `src/game/drawLanes.js:230` P? `plain pixels`
- `src/game/drawLanes.js:231` P `clip`
- `src/game/drawLanes.js:231` P? `pictures to the alpha mask (colour numbers stay on the stencil)`
- `src/game/drawLanes.js:232` P `fill`
- `src/game/drawLanes.js:232` P? `no one-colour glow`
- `src/game/drawLanes.js:233` P `water`
- `src/game/drawLanes.js:233` P? `still water`
- `src/game/drawLanes.js:234` P `glint`
- `src/game/drawLanes.js:234` P? `the filtered pieces plain`
- `src/game/drawLanes.js:235` P `sheen`
- `src/game/drawLanes.js:235` P? `its pass`
- `src/game/drawLanes.js:236` P `shadow`
- `src/game/drawLanes.js:236` P? `the old pass`
- `src/game/drawLanes.js:248` P `a software renderer runs every branch of the one program for every pixel (TRAPS §225: 4...`
- `src/game/drawLanes.js:249` P `a Windows or Mac computer builds programs through ANGLE, whose compilers took minutes o...`
- `src/game/drawLanes.js:250` P `Windows: ANGLE's FXC inlines the look palette's program, the loading screen stood at 75...`
- `src/game/drawLanes.js:251` P `a Mac: ANGLE's Metal inlines as FXC does, and a computer has the memory the palette sav...`
- `src/game/drawLanes.js:262` P `the three programs, as before the one program`
- `src/game/drawLanes.js:263` P `the one program asked for (QA: a software renderer would keep the three)`
- `src/game/drawLanes.js:264` P `every look baked`
- `src/game/drawLanes.js:265` P `the look palette asked for (QA: even on Windows)`
- `src/game/drawLanes.js:266` P `the sea still`
- `src/game/drawLanes.js:271` P `the pacer off ('?pace=0'): the rate is read by nothing`
- `src/game/drawLanes.js:272` P `a crowd cap of its own ('?crowd=K'): the knob is read by nothing`

### game: dropLines (6)

- `src/game/dropLines.js:81` P `Uncommon`
- `src/game/dropLines.js:82` P `Rare`
- `src/game/dropLines.js:83` P `Very rare`
- `src/game/dropLines.js:97` P `Rare`
- `src/game/dropLines.js:162` P `Shard`
- `src/game/dropLines.js:175` P `Raw Gem`

### game: dungeonWaves (3)

- `src/game/dungeonWaves.js:72` P? `BOSS FIGHT!`
- `src/game/dungeonWaves.js:78` P? `DUNGEON CLEARED!`
- `src/game/dungeonWaves.js:126` P? `DUNGEON CLEARED!`

### game: econCard (26)

- `src/game/econCard.js:79` P `Unexplained gold`
- `src/game/econCard.js:79` P? `Between the last two daily counts, gold in the world that no road explains (0 is right;...`
- `src/game/econCard.js:79` P? `the world's sum, counted live`
- `src/game/econCard.js:80` P `Gold made a player-hour`
- `src/game/econCard.js:80` P? `Gold made in an hour of play, today against the last week`
- `src/game/econCard.js:80` P? `a count of player-hours`
- `src/game/econCard.js:81` P `Moved one way for nothing`
- `src/game/econCard.js:81` P? `Of the gold moved between players today, the share that went one way with nothing back`
- `src/game/econCard.js:81` P? `the transfer ledger's read`
- `src/game/econCard.js:82` P `New gold to the richest`
- `src/game/econCard.js:82` P? `Of the gold made between the last two daily counts, the share the ten richest made`
- `src/game/econCard.js:82` P? `each character's gold made over the day`
- `src/game/econCard.js:83` P `Cases waiting`
- `src/game/econCard.js:83` P? `Cases for the owner to look at`
- `src/game/econCard.js:83` P? `card Q's cases`
- `src/game/econCard.js:144` P? `the counting is switched off (the econ flag)`
- `src/game/econCard.js:153` P `a restart before the book's loaded days is not added back`
- `src/game/econCard.js:158` P? `no gold made between the last two counts`
- `src/game/econCard.js:160` P? `one daily count so far: it needs two`
- `src/game/econCard.js:160` P? `no daily count yet`
- `src/game/econCard.js:161` P? `one daily count so far: it needs two`
- `src/game/econCard.js:161` P? `no daily count yet`
- `src/game/econCard.js:175` P? `no play counted today yet`
- `src/game/econCard.js:178` P? `no gold moved between players today`
- `src/game/econCard.js:178` P? `the transfer ledger not read`
- `src/game/econCard.js:179` P? `card Q's cases`

### game: emoteMoves (13)

- `src/game/emoteMoves.js:45` P `Wave`
- `src/game/emoteMoves.js:46` P `Laugh`
- `src/game/emoteMoves.js:48` P `Shrug`
- `src/game/emoteMoves.js:49` P `Facepalm`
- `src/game/emoteMoves.js:50` P `Cheer`
- `src/game/emoteMoves.js:51` P `Sit`
- `src/game/emoteMoves.js:52` P `Sleep`
- `src/game/emoteMoves.js:53` P `Flop`
- `src/game/emoteMoves.js:54` P `Bro Bounce`
- `src/game/emoteMoves.js:55` P `Robot`
- `src/game/emoteMoves.js:56` P `Sprinkler`
- `src/game/emoteMoves.js:62` P `Zombie Shuffle`
- `src/game/emoteMoves.js:62` P `Zombie`

### game: expoAddress (5)

- `src/game/expoAddress.js:19` P? `not loaded yet (click "Show live flags" below to see)`
- `src/game/expoAddress.js:21` P? `EXPO MODE: no limit on places or connections from one address`
- `src/game/expoAddress.js:22` P? `normal (16 places and 20 connections a minute from one address)`
- `src/game/expoAddress.js:23` P? `no limit`
- `src/game/expoAddress.js:24` P? `connections a minute`

### game: farmFeedback (25)

- `src/game/farmFeedback.js:31` P? `Out of seeds`
- `src/game/farmFeedback.js:32` P? `Out of compost`
- `src/game/farmFeedback.js:33` P? `Farming level too low`
- `src/game/farmFeedback.js:34` P? `Not enough gold`
- `src/game/farmFeedback.js:35` P? `The farm is closed for now`
- `src/game/farmFeedback.js:36` P? `The farm is closed for now`
- `src/game/farmFeedback.js:37` P? `Nothing to do there`
- `src/game/farmFeedback.js:38` P? `No answer, try again`
- `src/game/farmFeedback.js:39` P? `No answer yet. Check your bag`
- `src/game/farmFeedback.js:41` P? `Not enough yet`
- `src/game/farmFeedback.js:42` P? `Already delivered`
- `src/game/farmFeedback.js:43` P? `New orders are up`
- `src/game/farmFeedback.js:44` P? `That order is gone`
- `src/game/farmFeedback.js:45` P? `Not while fighting`
- `src/game/farmFeedback.js:46` P? `Not while fighting a player`
- `src/game/farmFeedback.js:47` P? `No answer yet. Checking the board`
- `src/game/farmFeedback.js:48` P? `The order board is closed for now`
- `src/game/farmFeedback.js:107` P `bed is`
- `src/game/farmFeedback.js:107` P `beds are`
- `src/game/farmFeedback.js:107` P `ready on your farm`
- `src/game/farmFeedback.js:145` P `Farming XP`
- `src/game/farmFeedback.js:164` P `Order delivered`
- `src/game/farmFeedback.js:165` P `gold`
- `src/game/farmFeedback.js:166` P `Farming XP`
- `src/game/farmFeedback.js:176` P `Could not`

### game: farmTrip (1)

- `src/game/farmTrip.js:100` P? `Your Farm`

### game: farmWalk (4)

- `src/game/farmWalk.js:159` P? `The farm is closed for now`
- `src/game/farmWalk.js:172` P? `No seeds: the Feed & Seed sells them`
- `src/game/farmWalk.js:176` P? `No compost: the Feed & Seed sells it`
- `src/game/farmWalk.js:209` P? `Try again`

### game: farmWork (10)

- `src/game/farmWork.js:188` P `dig`
- `src/game/farmWork.js:188` P `Needs Digging`
- `src/game/farmWork.js:190` P `plant`
- `src/game/farmWork.js:190` P `Needs Planting`
- `src/game/farmWork.js:192` P `harvest`
- `src/game/farmWork.js:192` P `Ready to Harvest!`
- `src/game/farmWork.js:197` P `water`
- `src/game/farmWork.js:197` P `Needs Watering`
- `src/game/farmWork.js:198` P `feed`
- `src/game/farmWork.js:198` P `Needs Fertilizer`

### game: feedbackOwner (7)

- `src/game/feedbackOwner.js:39` P? `oversized posts removed`
- `src/game/feedbackOwner.js:39` P? `old pace rows removed`
- `src/game/feedbackOwner.js:39` P? `posts left on the board`
- `src/game/feedbackOwner.js:53` P? `Swept the feedback board`
- `src/game/feedbackOwner.js:59` P? `This server can't`
- `src/game/feedbackOwner.js:59` P? `yet: it needs the update that adds it.`
- `src/game/feedbackOwner.js:60` P? `Your admin key does not work on this server (or none is set on it).`

### game: fightFood (1)

- `src/game/fightFood.js:155` P? `Eat again in`

### game: framePacer (1)

- `src/game/framePacer.js:657` P `pending`

### game: frameSteps (16)

- `src/game/frameSteps.js:73` P `legacy`
- `src/game/frameSteps.js:76` P `tap`
- `src/game/frameSteps.js:79` P `input`
- `src/game/frameSteps.js:80` P `sound`
- `src/game/frameSteps.js:81` P `ride`
- `src/game/frameSteps.js:82` P `zone`
- `src/game/frameSteps.js:83` P `farm`
- `src/game/frameSteps.js:84` P `townsfolk`
- `src/game/frameSteps.js:85` P `monsters`
- `src/game/frameSteps.js:87` P `loot`
- `src/game/frameSteps.js:88` P `peers`
- `src/game/frameSteps.js:90` P `visual`
- `src/game/frameSteps.js:91` P `arrows`
- `src/game/frameSteps.js:92` P `slime`
- `src/game/frameSteps.js:93` P `cleanup`
- `src/game/frameSteps.js:94` P `render`

### game: friendErrors (9)

- `src/game/friendErrors.js:19` P? `You and`
- `src/game/friendErrors.js:19` P? `are already friends.`
- `src/game/friendErrors.js:20` P? `Too many of your friend requests are still waiting for an answer. You can send more onc...`
- `src/game/friendErrors.js:21` P? `'s friends list is full, so the request was not sent.`
- `src/game/friendErrors.js:22` P? `is not on your friends list any more, so your message was not sent.`
- `src/game/friendErrors.js:23` P? `That player could not be found, so the friend request was not sent.`
- `src/game/friendErrors.js:25` P? `Your friends list is full. Remove a friend to accept this request.`
- `src/game/friendErrors.js:28` P? `Your friend request did not go through.`
- `src/game/friendErrors.js:38` P? `That player`

### game: gesturePose (13)

- `src/game/gesturePose.js:160` P? `Drag ↕ or hold E`
- `src/game/gesturePose.js:161` P? `Drag ↔ or hold E`
- `src/game/gesturePose.js:162` P? `Circle ↻ or hold E`
- `src/game/gesturePose.js:163` P? `Flick ↕ or hold E`
- `src/game/gesturePose.js:174` P? `Now pump up and down!`
- `src/game/gesturePose.js:175` P? `Now swipe side to side!`
- `src/game/gesturePose.js:176` P? `Now circle your thumb!`
- `src/game/gesturePose.js:177` P? `Now flick up and down!`
- `src/game/gesturePose.js:329` P? `M {…} {…} L {…} {…}`
- `src/game/gesturePose.js:330` P? `M {…} {…} L {…} {…}`
- `src/game/gesturePose.js:331` P? `M {…} {…} L {…} {…}`
- `src/game/gesturePose.js:332` P? `M {…} {…} A {…} {…} 0 1 1 {…} {…} A {…} {…} 0 1 1 {…} {…}`
- `src/game/gesturePose.js:340` P? `M {…} L {…} L {…}`

### game: groundLoot (2)

- `src/game/groundLoot.js:337` P? `G (sold)`
- `src/game/groundLoot.js:407` P `G`

### game: harvestDoor (1)

- `src/game/harvestDoor.js:86` P `ready`

### game: itemDrop (11)

- `src/game/itemDrop.js:56` P? `Nothing can be dropped on your farm`
- `src/game/itemDrop.js:56` P? `Nothing can be dropped here`
- `src/game/itemDrop.js:72` P? `Dropping is switched off right now`
- `src/game/itemDrop.js:73` P? `You can't drop things right now`
- `src/game/itemDrop.js:74` P? `Nothing can be dropped here`
- `src/game/itemDrop.js:75` P? `Not in a fight with a player`
- `src/game/itemDrop.js:76` P? `You don't have that`
- `src/game/itemDrop.js:77` P? `You don't have that`
- `src/game/itemDrop.js:79` P? `Too many of your things on the ground -- pick some up first`
- `src/game/itemDrop.js:80` P? `Saving is paused for a moment, try again.`
- `src/game/itemDrop.js:84` P? `You can't drop that right now`

### game: killRoll (6)

- `src/game/killRoll.js:30` P? `Gold Nugget`
- `src/game/killRoll.js:30` P? `Iron Great Sword`
- `src/game/killRoll.js:30` P? `Iron Greaves`
- `src/game/killRoll.js:30` P? `Iron Torso`
- `src/game/killRoll.js:31` P? `Rare Gem`
- `src/game/killRoll.js:31` P? `Raw Gem`

### game: levelCelebration (1)

- `src/game/levelCelebration.js:141` P `HP · Stamina · Mana refilled`

### game: lifeSkillRewards (13)

- `src/game/lifeSkillRewards.js:254` P `waiting`
- `src/game/lifeSkillRewards.js:340` P `waiting`
- `src/game/lifeSkillRewards.js:358` P `Requires`
- `src/game/lifeSkillRewards.js:358` P `Lv`
- `src/game/lifeSkillRewards.js:636` P? `Fishing XP`
- `src/game/lifeSkillRewards.js:641` P? `Fishing Level`
- `src/game/lifeSkillRewards.js:746` P? `Woodcutting XP`
- `src/game/lifeSkillRewards.js:750` P? `Woodcutting Level`
- `src/game/lifeSkillRewards.js:807` P? `Copper Ore`
- `src/game/lifeSkillRewards.js:840` P? `Mining XP`
- `src/game/lifeSkillRewards.js:844` P? `Mining Level`
- `src/game/lifeSkillRewards.js:869` P? `Paid as`
- `src/game/lifeSkillRewards.js:888` P? `Cooking XP`

### game: loadTimes (14)

- `src/game/loadTimes.js:57` P `app`
- `src/game/loadTimes.js:57` P `The game started (downloaded and running)`
- `src/game/loadTimes.js:58` P `loading`
- `src/game/loadTimes.js:58` P `The loading screen came up`
- `src/game/loadTimes.js:59` P `pictures`
- `src/game/loadTimes.js:59` P `The pictures were ready`
- `src/game/loadTimes.js:60` P `arrival`
- `src/game/loadTimes.js:60` P `The world began loading`
- `src/game/loadTimes.js:61` P `arrived`
- `src/game/loadTimes.js:61` P `The world was loaded`
- `src/game/loadTimes.js:62` P `world`
- `src/game/loadTimes.js:62` P `The loading screen was gone`
- `src/game/loadTimes.js:83` P? `The loading screen was up`
- `src/game/loadTimes.js:85` P? `Slowest pictures (s after they began):`

### game: loginSpinWheel (2)

- `src/game/loginSpinWheel.js:128` P? `Spin in a safe area`
- `src/game/loginSpinWheel.js:136` P? `Next free spin in`

### game: lookPaletteChoice (1)

- `src/game/lookPaletteChoice.js:59` P `address`

### game: mapPinPlaces (2)

- `src/game/mapPinPlaces.js:89` P? `Mayor Bro`
- `src/game/mapPinPlaces.js:98` P `Spin ready`

### game: mastery (19)

- `src/game/mastery.js:23` P? `You applied your first elemental status. Try a different element next to set up a colli...`
- `src/game/mastery.js:24` P? `You triggered your first collision. The Codex will start tracking pairs as you discover...`
- `src/game/mastery.js:25` P? `Same input, different combat verbs. Locked enemies open lunge/retreat options.`
- `src/game/mastery.js:26` P? `Volatile collisions land a +30% bonus.`
- `src/game/mastery.js:27` P? `Trigger a collision in a status's final 25% — the resonance window — for bonus damage.`
- `src/game/mastery.js:28` P? `Matching armor attunement just shaved damage off an incoming hit.`
- `src/game/mastery.js:29` P? `Endgame capstone reached.`
- `src/game/mastery.js:46` P `First Grand Slam`
- `src/game/mastery.js:47` P `First Status Applied`
- `src/game/mastery.js:48` P `First Collision`
- `src/game/mastery.js:49` P `First Lunge`
- `src/game/mastery.js:50` P `First Retreat Shot`
- `src/game/mastery.js:51` P `First Perfect Block`
- `src/game/mastery.js:52` P `First Volatile Collision`
- `src/game/mastery.js:53` P `First Resonance-Timed Hit`
- `src/game/mastery.js:54` P `First Attuned Defense`
- `src/game/mastery.js:55` P `First Apex Defeat`
- `src/game/mastery.js:56` P `First Endgame Capstone`
- `src/game/mastery.js:115` P `Mastery`

### game: mayorTalk (6)

- `src/game/mayorTalk.js:26` P? `Mayor Bro`
- `src/game/mayorTalk.js:34` P? `Good work! Next, see`
- `src/game/mayorTalk.js:34` P? `. Follow the gold road.`
- `src/game/mayorTalk.js:45` P? `Keep at it:`
- `src/game/mayorTalk.js:45` P? `. Follow the gold road.`
- `src/game/mayorTalk.js:47` P? `BroTown is lucky to have you! The town board by the lamps has more to do.`

### game: monsterCombat (11)

- `src/game/monsterCombat.js:115` P `Unarmed`
- `src/game/monsterCombat.js:882` P? `Defense Lv`
- `src/game/monsterCombat.js:1123` P? `DEATH SAVE!`
- `src/game/monsterCombat.js:1242` P? `YOU DIED`
- `src/game/monsterCombat.js:1245` P? `Items scattered!`
- `src/game/monsterCombat.js:1245` P? `s to recover`
- `src/game/monsterCombat.js:2784` P? `New Bestiary Entry!`
- `src/game/monsterCombat.js:2961` P `XP`
- `src/game/monsterCombat.js:2983` P? `RARE DROP!`
- `src/game/monsterCombat.js:3121` P? `Gold Nugget!`
- `src/game/monsterCombat.js:3128` P? `Critical hit!`

### game: nmlAsk (6)

- `src/game/nmlAsk.js:341` P? `Party invite sent`
- `src/game/nmlAsk.js:391` P `tap`
- `src/game/nmlAsk.js:400` P `Player`
- `src/game/nmlAsk.js:400` P `tap`
- `src/game/nmlAsk.js:496` P `Rival Bro`
- `src/game/nmlAsk.js:496` P `tap`

### game: noMansLand (13)

- `src/game/noMansLand.js:268` P? `☠ You attacked a player: a red skull for 20 minutes of play. Killed by a player with it...`
- `src/game/noMansLand.js:324` P? `your death`
- `src/game/noMansLand.js:329` P? `☠ You died with a red skull: you lost everything you carried{…}. What you wear is still...`
- `src/game/noMansLand.js:330` P? `killed you while you carried a red skull`
- `src/game/noMansLand.js:330` P? `You died with a red skull`
- `src/game/noMansLand.js:330` P? `☠ {…}: you lost everything you carried and wore{…}.`
- `src/game/noMansLand.js:331` P? `☠ {…} took everything you carried in No man's land: your bag{…}, and your spare weapons...`
- `src/game/noMansLand.js:341` P? `a player`
- `src/game/noMansLand.js:347` P? `1 piece of gear`
- `src/game/noMansLand.js:347` P? `pieces of gear`
- `src/game/noMansLand.js:348` P? `{…} thing{…} lie where they fell, yours for a minute`
- `src/game/noMansLand.js:350` P? `they carried nothing`
- `src/game/noMansLand.js:350` P? `☠ You took {…}'s things: {…}.`

### game: npcVoices (1)

- `src/game/npcVoices.js:62` P? `Lil Bro`

### game: partyRows (4)

- `src/game/partyRows.js:55` P? `just now`
- `src/game/partyRows.js:57` P? `m ago`
- `src/game/partyRows.js:59` P? `h ago`
- `src/game/partyRows.js:60` P? `d ago`

### game: petFetch (6)

- `src/game/petFetch.js:120` P `water`
- `src/game/petFetch.js:132` P `gone`
- `src/game/petFetch.js:132` P `leash`
- `src/game/petFetch.js:132` P `time`
- `src/game/petFetch.js:166` P `near`
- `src/game/petFetch.js:167` P `wall`

### game: placeSafety (14)

- `src/game/placeSafety.js:58` P? `PvP {…} Lv {…}`
- `src/game/placeSafety.js:83` P? `the 1 thing in your bag`
- `src/game/placeSafety.js:83` P? `the {…} things in your bag`
- `src/game/placeSafety.js:84` P? `your {…} gold and {…}`
- `src/game/placeSafety.js:85` P? `your {…} gold`
- `src/game/placeSafety.js:87` P? `anything you carry`
- `src/game/placeSafety.js:96` P? `1 more minute`
- `src/game/placeSafety.js:96` P? `{…} more minutes`
- `src/game/placeSafety.js:98` P? `You attacked a player first, so you're an outlaw for {…}.`
- `src/game/placeSafety.js:100` P? `If a player beats you now, you drop everything, even what you’re wearing.`
- `src/game/placeSafety.js:101` P? `{…} is safe, but if a player beats you in No man’s land before then, you drop everythin...`
- `src/game/placeSafety.js:106` P? `Players Lv {…} can attack you here.`
- `src/game/placeSafety.js:107` P? `If a player beats you, you keep what you’re wearing, but you drop {…}. Put things in th...`
- `src/game/placeSafety.js:110` P? `{…} is safe. No one can attack you here.`

### game: plateSafety (2)

- `src/game/plateSafety.js:58` P `Outlaw {…} {…} min`
- `src/game/plateSafety.js:59` P `No man's land {…}`

### game: playerActions (6)

- `src/game/playerActions.js:236` P? `No weapon equipped!`
- `src/game/playerActions.js:249` P? `No mana!`
- `src/game/playerActions.js:744` P? `Element Burst unlocks at level`
- `src/game/playerActions.js:745` P? `No weapon equipped!`
- `src/game/playerActions.js:746` P? `Element Burst needs an enchanted weapon`
- `src/game/playerActions.js:747` P? `Not enough mana!`

### game: pointsReset (6)

- `src/game/pointsReset.js:68` P? `Can't reset in a fight`
- `src/game/pointsReset.js:69` P? `You just reset your points`
- `src/game/pointsReset.js:70` P? `No points to give back`
- `src/game/pointsReset.js:71` P? `Can't reset right now`
- `src/game/pointsReset.js:82` P? `Points reset!`
- `src/game/pointsReset.js:82` P? `{…} point{…} to spend`

### game: pointsTips (11)

- `src/game/pointsTips.js:83` P? `shared point`
- `src/game/pointsTips.js:84` P? `for your weapon's stats. Bottom row:`
- `src/game/pointsTips.js:84` P? `for any stat there. Tap a stat to see what it does.`
- `src/game/pointsTips.js:87` P? `waiting. Tap Points.`
- `src/game/pointsTips.js:90` P? `You have`
- `src/game/pointsTips.js:90` P? `to spend. Tap Bro.`
- `src/game/pointsTips.js:91` P? `You have`
- `src/game/pointsTips.js:91` P? `to spend. Open your dashboard.`
- `src/game/pointsTips.js:92` P? `You have`
- `src/game/pointsTips.js:92` P? `to spend. Tap the handle.`
- `src/game/pointsTips.js:102` P? `Not sure? Reset points (free), under the grid, gives them all back.`

### game: postOffice (10)

- `src/game/postOffice.js:54` P? `A pet`
- `src/game/postOffice.js:83` P? `and {…} AP`
- `src/game/postOffice.js:84` P? `A daily chest`
- `src/game/postOffice.js:85` P? `A weapon`
- `src/game/postOffice.js:86` P? `A piece of gear`
- `src/game/postOffice.js:91` P? `A delivery`
- `src/game/postOffice.js:97` P `Daily reward`
- `src/game/postOffice.js:121` P? `just now`
- `src/game/postOffice.js:123` P? `{…} min ago`
- `src/game/postOffice.js:124` P? `{…} h ago`

### game: projectiles (5)

- `src/game/projectiles.js:1105` P `land`
- `src/game/projectiles.js:1110` P `prop`
- `src/game/projectiles.js:1110` P `land`
- `src/game/projectiles.js:2370` P `XP`
- `src/game/projectiles.js:2954` P? `Defense Lv`

### game: questCard (3)

- `src/game/questCard.js:48` P `Done! Go back to`
- `src/game/questCard.js:48` P `the quest giver`
- `src/game/questCard.js:51` P `Next:`

### game: questComplete (3)

- `src/game/questComplete.js:90` P? `Quest Complete!`
- `src/game/questComplete.js:95` P? `Return to`
- `src/game/questComplete.js:95` P? `the quest giver`

### game: questJournal (65)

- `src/game/questJournal.js:45` P? `In progress`
- `src/game/questJournal.js:45` P? `Ready to hand in`
- `src/game/questJournal.js:45` P? `Not open yet`
- `src/game/questJournal.js:51` P? `the forge`
- `src/game/questJournal.js:52` P? `the Woodworker`
- `src/game/questJournal.js:53` P? `the Feed & Seed`
- `src/game/questJournal.js:54` P? `the Cookhouse`
- `src/game/questJournal.js:55` P? `the General Store`
- `src/game/questJournal.js:56` P? `the Town Hall`
- `src/game/questJournal.js:57` P? `the Land Office`
- `src/game/questJournal.js:58` P? `the Bank`
- `src/game/questJournal.js:59` P? `the Saloon`
- `src/game/questJournal.js:60` P? `the Post Office`
- `src/game/questJournal.js:61` P? `the Guild Hall`
- `src/game/questJournal.js:62` P? `the Hotel`
- `src/game/questJournal.js:67` P? `Ore rocks, just outside`
- `src/game/questJournal.js:68` P? `Trees, just outside`
- `src/game/questJournal.js:69` P? `A fishing spot, just outside`
- `src/game/questJournal.js:80` P `east`
- `src/game/questJournal.js:80` P `southeast`
- `src/game/questJournal.js:80` P `south`
- `src/game/questJournal.js:80` P `southwest`
- `src/game/questJournal.js:80` P `west`
- `src/game/questJournal.js:80` P `northwest`
- `src/game/questJournal.js:80` P `north`
- `src/game/questJournal.js:80` P `northeast`
- `src/game/questJournal.js:157` P `the lands`
- `src/game/questJournal.js:167` P? `Out in the lands, past`
- `src/game/questJournal.js:167` P? `'s safe ground`
- `src/game/questJournal.js:168` P? `Any building in`
- `src/game/questJournal.js:172` P? `a building`
- `src/game/questJournal.js:177` P? `A dungeon in the`
- `src/game/questJournal.js:204` P `Wherever you are`
- `src/game/questJournal.js:216` P `Done: handed in to`
- `src/game/questJournal.js:216` P `its giver`
- `src/game/questJournal.js:220` P `You have it all: hand it in to`
- `src/game/questJournal.js:220` P `its giver`
- `src/game/questJournal.js:220` P `Tap`
- `src/game/questJournal.js:220` P `the giver`
- `src/game/questJournal.js:220` P `to talk. The reward is paid there.`
- `src/game/questJournal.js:224` P `Talk to`
- `src/game/questJournal.js:224` P `its giver`
- `src/game/questJournal.js:224` P `to take this quest.`
- `src/game/questJournal.js:227` P `Not open yet: finish the quests before it first.`
- `src/game/questJournal.js:239` P? `Talk to`
- `src/game/questJournal.js:240` P? `gives this one later`
- `src/game/questJournal.js:241` P? `Talked to`
- `src/game/questJournal.js:243` P? `Handed in to`
- `src/game/questJournal.js:244` P? `Hand it in to`
- `src/game/questJournal.js:257` P? `The giver`
- `src/game/questJournal.js:259` P `hands you these when you say yes.`
- `src/game/questJournal.js:260` P `gave you these when you said yes.`
- `src/game/questJournal.js:274` P? `its giver`
- `src/game/questJournal.js:279` P? `Achievement Points`
- `src/game/questJournal.js:280` P `You got these from`
- `src/game/questJournal.js:280` P `Paid by`
- `src/game/questJournal.js:280` P `when you hand this quest in.`
- `src/game/questJournal.js:294` P `carry on with “`
- `src/game/questJournal.js:299` P `talk to`
- `src/game/questJournal.js:299` P `for “`
- `src/game/questJournal.js:303` P `Next: no new quests right now. Check back after an update.`
- `src/game/questJournal.js:303` P `Then: that is the last quest for now.`
- `src/game/questJournal.js:310` P? `1 more person has a quest: look for a gold ! on your map.`
- `src/game/questJournal.js:311` P? `more people have quests: look for a gold ! on your map.`
- `src/game/questJournal.js:357` P? `Achievement Points from quests:`

### game: questRoute (1)

- `src/game/questRoute.js:256` P? `Mayor Bro`

### game: questTrailStyle (10)

- `src/game/questTrailStyle.js:60` P `Footprints`
- `src/game/questTrailStyle.js:60` P `Glowing footsteps walking the way you should go`
- `src/game/questTrailStyle.js:61` P `Arrows`
- `src/game/questTrailStyle.js:61` P `Chevrons pointing the way you should go`
- `src/game/questTrailStyle.js:62` P `Ribbon`
- `src/game/questTrailStyle.js:62` P `One flowing line, like a lit road`
- `src/game/questTrailStyle.js:63` P `Beads`
- `src/game/questTrailStyle.js:63` P `The original row of gold dots`
- `src/game/questTrailStyle.js:64` P `Off`
- `src/game/questTrailStyle.js:64` P `No guide on the ground at all`

### game: quests (4)

- `src/game/quests.js:76` P? `Quest Accepted:`
- `src/game/quests.js:116` P? `[data-qw-gold] img`
- `src/game/quests.js:205` P? `Quest Complete! +`
- `src/game/quests.js:220` P `XP`

### game: race (14)

- `src/game/race.js:36` P? `Lil Bro`
- `src/game/race.js:122` P? `On your marks! Get set!`
- `src/game/race.js:157` P? `Whoa, you won! Good race!`
- `src/game/race.js:158` P? `False start! Wait for GO.`
- `src/game/race.js:159` P? `I won! Want to race again?`
- `src/game/race.js:204` P? `Later, slowpoke!`
- `src/game/race.js:266` P? `Stand next to Lil Bro to start.`
- `src/game/race.js:267` P? `Talk to Lil Bro first.`
- `src/game/race.js:268` P? `The race is in BroTown.`
- `src/game/race.js:269` P? `No races right now.`
- `src/game/race.js:270` P? `Hang on a second...`
- `src/game/race.js:271` P? `False start! Wait for GO.`
- `src/game/race.js:272` P? `You left the race.`
- `src/game/race.js:273` P? `Too slow. Lil Bro went home.`

### game: raceDoor (1)

- `src/game/raceDoor.js:36` P `asked`

### game: renameOwner (12)

- `src/game/renameOwner.js:21` P `The name is empty.`
- `src/game/renameOwner.js:22` P `A name is`
- `src/game/renameOwner.js:22` P `letters at most.`
- `src/game/renameOwner.js:23` P? `Letters, digits, spaces, - ' and _ only: no emoji or symbols.`
- `src/game/renameOwner.js:24` P? `That name reads as the game or its staff. Only your own character may take it (Staff wo...`
- `src/game/renameOwner.js:40` P? `No character id to rename.`
- `src/game/renameOwner.js:43` P? `No saved character has that id (a guest has none to rename).`
- `src/game/renameOwner.js:58` P? `A staff word is allowed (your own character only).`
- `src/game/renameOwner.js:59` P? `Everyone sees the new name. Tap Rename again to do it.`
- `src/game/renameOwner.js:67` P? `They see it now.`
- `src/game/renameOwner.js:67` P? `They see it the next time they play.`
- `src/game/renameOwner.js:68` P? `The boards show it at their next update.`

### game: rest (8)

- `src/game/rest.js:72` P? `Can't rest in a fight`
- `src/game/rest.js:73` P? `You just rested`
- `src/game/rest.js:74` P? `Rest at the Hotel or on your farm`
- `src/game/rest.js:75` P? `Can't rest right now`
- `src/game/rest.js:82` P `Fully Rested!`
- `src/game/rest.js:83` P `% combat XP for`
- `src/game/rest.js:83` P `min`
- `src/game/rest.js:86` P `off`

### game: revealBag (4)

- `src/game/revealBag.js:146` P? `That piece is not in your bag any more`
- `src/game/revealBag.js:147` P? `Your bag changed -- open the piece again`
- `src/game/revealBag.js:151` P? `That piece cannot be revealed right now`
- `src/game/revealBag.js:215` P `Rare or better`

### game: ride (9)

- `src/game/ride.js:220` P? `strike a pose`
- `src/game/ride.js:222` P? `set a trap`
- `src/game/ride.js:231` P? `Off the board: boards stay in BroTown.`
- `src/game/ride.js:233` P? `Knocked off the board!`
- `src/game/ride.js:234` P? `Off the board to`
- `src/game/ride.js:235` P? `Off the board for the duel.`
- `src/game/ride.js:237` P? `Boards are put away for now.`
- `src/game/ride.js:238` P? `Boards are for BroTown only.`
- `src/game/ride.js:239` P? `Not now: finish what you are doing first.`

### game: salvage (18)

- `src/game/salvage.js:32` P? `Take it off first`
- `src/game/salvage.js:33` P? `It is still in your mail`
- `src/game/salvage.js:34` P? `Too old to salvage: made before the forge kept records`
- `src/game/salvage.js:35` P? `That piece is not in your bag`
- `src/game/salvage.js:36` P? `That piece is not in your bag`
- `src/game/salvage.js:37` P? `That piece is not in your bag`
- `src/game/salvage.js:38` P? `Your bag changed. Try again`
- `src/game/salvage.js:39` P? `Only copper, iron and black steel salvage`
- `src/game/salvage.js:40` P? `You have no essence left`
- `src/game/salvage.js:41` P? `That essence is for another metal`
- `src/game/salvage.js:42` P? `Already that grade or better`
- `src/game/salvage.js:45` P? `Could not use the essence`
- `src/game/salvage.js:45` P? `Could not salvage`
- `src/game/salvage.js:71` P `bars`
- `src/game/salvage.js:71` P `essence`
- `src/game/salvage.js:72` P `gem back`
- `src/game/salvage.js:72` P `gems back`
- `src/game/salvage.js:94` P `Better`

### game: shardCrack (18)

- `src/game/shardCrack.js:54` P? `The Gem Works is closed for now`
- `src/game/shardCrack.js:55` P? `Not while you are down`
- `src/game/shardCrack.js:56` P? `That shard holds no gem`
- `src/game/shardCrack.js:57` P `Not enough to do that`
- `src/game/shardCrack.js:58` P? `That is not a gem`
- `src/game/shardCrack.js:59` P? `No Rare Gem left`
- `src/game/shardCrack.js:60` P? `Could not do that`
- `src/game/shardCrack.js:64` P? `You need`
- `src/game/shardCrack.js:64` P? `raw gems`
- `src/game/shardCrack.js:64` P? `(you have`
- `src/game/shardCrack.js:66` P? `No shards of that land left`
- `src/game/shardCrack.js:114` P `Raw`
- `src/game/shardCrack.js:114` P `Gem`
- `src/game/shardCrack.js:115` P `s`
- `src/game/shardCrack.js:116` P `No gem in`
- `src/game/shardCrack.js:116` P `shards`
- `src/game/shardCrack.js:116` P `No gem this time`
- `src/game/shardCrack.js:130` P `Gem made!`

### game: shieldGem (7)

- `src/game/shieldGem.js:61` P? `Shield gems are closed for now`
- `src/game/shieldGem.js:62` P? `Not while you are down`
- `src/game/shieldGem.js:63` P? `That gem does not fit a shield`
- `src/game/shieldGem.js:64` P? `Your gear is locked for now`
- `src/game/shieldGem.js:65` P? `The server has no record of this shield`
- `src/game/shieldGem.js:66` P? `No polished gem of that kind left`
- `src/game/shieldGem.js:67` P? `Could not slot the gem`

### game: silenceOwner (13)

- `src/game/silenceOwner.js:19` P `1 min`
- `src/game/silenceOwner.js:19` P `for a minute`
- `src/game/silenceOwner.js:20` P `1 h`
- `src/game/silenceOwner.js:20` P `for an hour`
- `src/game/silenceOwner.js:21` P `1 day`
- `src/game/silenceOwner.js:21` P `for a day`
- `src/game/silenceOwner.js:22` P `Until lifted`
- `src/game/silenceOwner.js:22` P `until you lift it`
- `src/game/silenceOwner.js:31` P? `until you lift it`
- `src/game/silenceOwner.js:43` P? `? Their chat reaches nobody; they still play. Tap again to do it.`
- `src/game/silenceOwner.js:48` P? `They are online and are told once a minute.`
- `src/game/silenceOwner.js:54` P? `was not silenced.`
- `src/game/silenceOwner.js:54` P? `'s silence: they can chat again.`

### game: spar (10)

- `src/game/spar.js:57` P? `a clone`
- `src/game/spar.js:60` P? `Knocked out! Healed`
- `src/game/spar.js:62` P? `knocked you out -- you are healed, no loss (`
- `src/game/spar.js:64` P? `Sparring: you knocked out the`
- `src/game/spar.js:64` P? `). It is back in 3 s.`
- `src/game/spar.js:67` P? `Sparring: your clones went home (you left the world).`
- `src/game/spar.js:69` P? `Sparring is switched off on the server.`
- `src/game/spar.js:72` P? `clone is`
- `src/game/spar.js:72` P? `clones are`
- `src/game/spar.js:72` P? `here. Attack away -- a tap picks one to aim at.`

### game: speedTest (51)

- `src/game/speedTest.js:81` P `Everything on (as you play)`
- `src/game/speedTest.js:82` P `No shadows (and no shine)`
- `src/game/speedTest.js:83` P `No metal shine`
- `src/game/speedTest.js:88` P `Metal shine the old way (a pass each)`
- `src/game/speedTest.js:92` P `Three drawing programs (the old way)`
- `src/game/speedTest.js:96` P `Shadows the old way (a pass mid-frame)`
- `src/game/speedTest.js:97` P `Still water`
- `src/game/speedTest.js:98` P `Lower resolution (`
- `src/game/speedTest.js:98` P `x, not`
- `src/game/speedTest.js:99` P `All of those off`
- `src/game/speedTest.js:250` P? `<div style="color:`
- `src/game/speedTest.js:255` P? `<tr data-speed-row="`
- `src/game/speedTest.js:261` P? `<b style="color:`
- `src/game/speedTest.js:261` P? `">Speed test</b>`
- `src/game/speedTest.js:265` P? `<tr style="color:`
- `src/game/speedTest.js:267` P? `<div style="color:`
- `src/game/speedTest.js:268` P? `<div style="color:`
- `src/game/speedTest.js:270` P? `">This is:`
- `src/game/speedTest.js:273` P? `<option value="`
- `src/game/speedTest.js:275` P? `<div data-speed-sent style="color:`
- `src/game/speedTest.js:276` P? `This card goes to the game with the next smoothness report (no name on it, kept 60 days).`
- `src/game/speedTest.js:277` P? `Not sent: the game's server does not take Speed cards right now.`
- `src/game/speedTest.js:278` P? `Not sent: smoothness reports are off (About).`
- `src/game/speedTest.js:298` P? `Every frame is ready in time for the screen (`
- `src/game/speedTest.js:298` P? `a second, the game's code`
- `src/game/speedTest.js:299` P? `ms of each): nothing is holding the frame rate back here.`
- `src/game/speedTest.js:302` P? `Most of each frame (`
- `src/game/speedTest.js:302` P? `ms) is the graphics chip's, not the game's code: drawing less helps most.`
- `src/game/speedTest.js:303` P? `The game's own code takes most of each frame (`
- `src/game/speedTest.js:303` P? `ms): the code is what to speed up.`
- `src/game/speedTest.js:342` P? `The biggest gain:`
- `src/game/speedTest.js:342` P? `frames a second).`
- `src/game/speedTest.js:344` P? `The metal shine drawn the new way saves`
- `src/game/speedTest.js:344` P? `frames a second here (the old way:`
- `src/game/speedTest.js:345` P? `picture switches a frame, now`
- `src/game/speedTest.js:348` P? `Drawing the shadows before the frame saves`
- `src/game/speedTest.js:348` P? `frames a second here (the old way set the screen aside`
- `src/game/speedTest.js:349` P? `times a frame, now`
- `src/game/speedTest.js:352` P? `Drawing with one program instead of three saves`
- `src/game/speedTest.js:352` P? `frames a second here (`
- `src/game/speedTest.js:353` P? `draws a frame, the old way`
- `src/game/speedTest.js:355` P? `The old way (three programs) was`
- `src/game/speedTest.js:355` P? `frames a second faster here: please send this card.`
- `src/game/speedTest.js:358` P? `Every setting ran at about 30: Low Power Mode, or a hot phone, may be holding the frame...`
- `src/game/speedTest.js:361` P? `The game's own work:`
- `src/game/speedTest.js:361` P? `ms a frame`
- `src/game/speedTest.js:362` P? `; the graphics chip switched pictures`
- `src/game/speedTest.js:362` P? `times a frame (set the screen aside`
- `src/game/speedTest.js:370` P? `(lowered to`
- `src/game/speedTest.js:372` P? `, computer window`
- `src/game/speedTest.js:372` P? `, looks palette`

### game: spinBoard (3)

- `src/game/spinBoard.js:60` P? `No doubles`
- `src/game/spinBoard.js:62` P? `On a double`
- `src/game/spinBoard.js:62` P? `On the`

### game: sprint (3)

- `src/game/sprint.js:95` P `unsupported`
- `src/game/sprint.js:96` P `tired`
- `src/game/sprint.js:115` P `stop`

### game: storeAnswer (3)

- `src/game/storeAnswer.js:31` P? `Not sure it went up. Look in the Auction House under Yours, My Listings, before you tap...`
- `src/game/storeAnswer.js:42` P `No answer from the store`
- `src/game/storeAnswer.js:52` P `No answer from the store`

### game: targeting (1)

- `src/game/targeting.js:545` P? `Duel did not start`

### game: timeOfDay (10)

- `src/game/timeOfDay.js:63` P `dawn`
- `src/game/timeOfDay.js:64` P `dawn`
- `src/game/timeOfDay.js:65` P `day`
- `src/game/timeOfDay.js:66` P `day`
- `src/game/timeOfDay.js:67` P `day`
- `src/game/timeOfDay.js:68` P `golden`
- `src/game/timeOfDay.js:69` P `dusk`
- `src/game/timeOfDay.js:70` P `night`
- `src/game/timeOfDay.js:71` P `night`
- `src/game/timeOfDay.js:72` P `dawn`

### game: tooFar (2)

- `src/game/tooFar.js:21` P? `Too far away`
- `src/game/tooFar.js:22` P? `Too far away: walk closer`

### game: tour (13)

- `src/game/tour.js:21` P? `Open the forge`
- `src/game/tour.js:22` P? `Open the bench`
- `src/game/tour.js:23` P? `Open the Feed & Seed`
- `src/game/tour.js:24` P? `Open the Cookhouse`
- `src/game/tour.js:30` P? `at the Town Hall`
- `src/game/tour.js:31` P? `at the Feed & Seed`
- `src/game/tour.js:32` P? `at the forge`
- `src/game/tour.js:33` P? `at the Woodworker`
- `src/game/tour.js:34` P? `at the General Store`
- `src/game/tour.js:35` P? `on the town square`
- `src/game/tour.js:36` P? `by the Woodworker`
- `src/game/tour.js:53` P `Race!`
- `src/game/tour.js:73` P `Open the shop`

### game: townsfolkReact (22)

- `src/game/townsfolkReact.js:46` P? `Look, I'm doing it too!`
- `src/game/townsfolkReact.js:46` P? `I can do it too! Watch me!`
- `src/game/townsfolkReact.js:46` P? `Wait, like this?!`
- `src/game/townsfolkReact.js:47` P? `Nice muscles! Keep it up.`
- `src/game/townsfolkReact.js:47` P? `Look at these! I lift every day.`
- `src/game/townsfolkReact.js:47` P? `Strong arms, strong hammer!`
- `src/game/townsfolkReact.js:48` P? `Hey! This is a business!`
- `src/game/townsfolkReact.js:48` P? `Please dance outside, amigo.`
- `src/game/townsfolkReact.js:48` P? `Please don't dance in front of my door!`
- `src/game/townsfolkReact.js:50` P? `No zombies in the shop!`
- `src/game/townsfolkReact.js:50` P? `Out you go, zombie! Unless you want to buy something.`
- `src/game/townsfolkReact.js:51` P? `will win`
- `src/game/townsfolkReact.js:51` P? `has the best moves`
- `src/game/townsfolkReact.js:51` P? `is in the lead`
- `src/game/townsfolkReact.js:51` P? `is looking good`
- `src/game/townsfolkReact.js:52` P? `What a party! Somebody take a picture of me with everyone!`
- `src/game/townsfolkReact.js:52` P? `A street party! I love it!`
- `src/game/townsfolkReact.js:52` P? `Look at this town. Everyone is happy and dancing!`
- `src/game/townsfolkReact.js:68` P `You`
- `src/game/townsfolkReact.js:78` P `Bro`
- `src/game/townsfolkReact.js:155` P `Dance-off! I think`
- `src/game/townsfolkReact.js:155` P `! Who wants to join?`

### game: trapping (38)

- `src/game/trapping.js:125` P `ARMED`
- `src/game/trapping.js:125` P `s`
- `src/game/trapping.js:128` P `TRAP`
- `src/game/trapping.js:128` P `Setting…`
- `src/game/trapping.js:137` P `level`
- `src/game/trapping.js:137` P `TRAP`
- `src/game/trapping.js:137` P `Requires Trapping`
- `src/game/trapping.js:138` P `TRAP`
- `src/game/trapping.js:138` P `Not on safe ground`
- `src/game/trapping.js:139` P `TRAP`
- `src/game/trapping.js:139` P `No box traps`
- `src/game/trapping.js:142` P `TRAP`
- `src/game/trapping.js:142` P `Collection full`
- `src/game/trapping.js:146` P `TRAP`
- `src/game/trapping.js:146` P `Get closer`
- `src/game/trapping.js:148` P `TRAP`
- `src/game/trapping.js:161` P `Requires Trapping`
- `src/game/trapping.js:181` P `Requires Trapping`
- `src/game/trapping.js:181` P `No trap set`
- `src/game/trapping.js:215` P `Trap kept: you had to help kill it`
- `src/game/trapping.js:215` P `Trap kept`
- `src/game/trapping.js:267` P? `Big one!`
- `src/game/trapping.js:268` P? `Big one!`
- `src/game/trapping.js:286` P? `So close!`
- `src/game/trapping.js:288` P? `Trapping XP`
- `src/game/trapping.js:297` P `No traps made`
- `src/game/trapping.js:299` P `Box Trap`
- `src/game/trapping.js:299` P `s`
- `src/game/trapping.js:300` P `Woodworking XP`
- `src/game/trapping.js:323` P `Not done`
- `src/game/trapping.js:325` P `Released back to the wild`
- `src/game/trapping.js:329` P `Named`
- `src/game/trapping.js:332` P `is with you`
- `src/game/trapping.js:332` P `Pet put away`
- `src/game/trapping.js:338` P `Your Pet House holds`
- `src/game/trapping.js:338` P `now`
- `src/game/trapping.js:395` P `is Lv`
- `src/game/trapping.js:423` P `Ward`

### game: usageMeter (25)

- `src/game/usageMeter.js:30` P `reqstamp`
- `src/game/usageMeter.js:30` P? `a stamp a shop or market request, so a repeat is answered once`
- `src/game/usageMeter.js:31` P `xferescrow`
- `src/game/usageMeter.js:31` P? `a ledger row a duel pot, losing stake, market or Auction House sale`
- `src/game/usageMeter.js:32` P `resetbook`
- `src/game/usageMeter.js:32` P? `a row a character restart, for the world's sum`
- `src/game/usageMeter.js:33` P `seathold`
- `src/game/usageMeter.js:33` P? `who is in, at most every 15 seconds while it changes`
- `src/game/usageMeter.js:34` P `fullsnap`
- `src/game/usageMeter.js:34` P? `reads only: the vault and pets in each daily copy`
- `src/game/usageMeter.js:35` P `freezedevice`
- `src/game/usageMeter.js:35` P? `reads only: a new character's phone checked while someone is frozen`
- `src/game/usageMeter.js:69` P? `No usage counted yet.`
- `src/game/usageMeter.js:71` P? `rows written today, counted since`
- `src/game/usageMeter.js:71` P? `the day began (00:00 UTC)`
- `src/game/usageMeter.js:71` P? `(the server started then)`
- `src/game/usageMeter.js:72` P? `Too early to estimate the whole day: try again in a few minutes.`
- `src/game/usageMeter.js:74` P? `At this pace, about`
- `src/game/usageMeter.js:74` P? `rows a day.`
- `src/game/usageMeter.js:75` P? `Free plan:`
- `src/game/usageMeter.js:75` P? `of its about`
- `src/game/usageMeter.js:75` P? `rows written a day.`
- `src/game/usageMeter.js:76` P? `Paid plan:`
- `src/game/usageMeter.js:76` P? `of its`
- `src/game/usageMeter.js:76` P? `rows written a month.`

### game: weaponGem (14)

- `src/game/weaponGem.js:57` P? `Weapon gems are closed for now`
- `src/game/weaponGem.js:58` P? `Not while you are down`
- `src/game/weaponGem.js:59` P? `Could not set the gem`
- `src/game/weaponGem.js:60` P? `That gem does not fit a weapon`
- `src/game/weaponGem.js:61` P? `Your gear is locked for now`
- `src/game/weaponGem.js:62` P? `No weapon in that slot`
- `src/game/weaponGem.js:63` P? `Take the gem out first`
- `src/game/weaponGem.js:64` P? `A second gem needs Enchanting 20`
- `src/game/weaponGem.js:65` P? `The second gem must be another element`
- `src/game/weaponGem.js:66` P? `That pair needs Fusion-ready gear`
- `src/game/weaponGem.js:67` P? `No polished gem of that kind left`
- `src/game/weaponGem.js:68` P? `Could not set the gem`
- `src/game/weaponGem.js:122` P `Gem`
- `src/game/weaponGem.js:122` P `set!`

### game: welcomeBanner (1)

- `src/game/welcomeBanner.js:122` P `Your adventure starts here.`

### game: wheelBreak (2)

- `src/game/wheelBreak.js:176` P `break`
- `src/game/wheelBreak.js:253` P `repair`

### game: wheelDungeons (1)

- `src/game/wheelDungeons.js:115` P `the dungeon`

### game: wheelHome (2)

- `src/game/wheelHome.js:197` P `Speak to Mayor Bro first`
- `src/game/wheelHome.js:198` P `He's beside the Town Hall — he'll arm you`

### game: wheelNoticeboard (3)

- `src/game/wheelNoticeboard.js:67` P `Town Board`
- `src/game/wheelNoticeboard.js:67` P `THE TOWN BOARD`
- `src/game/wheelNoticeboard.js:67` P `Read`

### game: wheelTrial (1)

- `src/game/wheelTrial.js:333` P `the ground worker failed to start`

### game: worldTrial (18)

- `src/game/worldTrial.js:244` P `Town`
- `src/game/worldTrial.js:524` P? `water still (switched off)`
- `src/game/worldTrial.js:525` P? `water still (no WebGL2 here)`
- `src/game/worldTrial.js:526` P? `water still (did not build here)`
- `src/game/worldTrial.js:527` P? `water moving ·`
- `src/game/worldTrial.js:533` P? `WHEEL TRIAL cannot lay ground:`
- `src/game/worldTrial.js:541` P? `WHEEL TRIAL`
- `src/game/worldTrial.js:542` P? `way in`
- `src/game/worldTrial.js:544` P? `ms · worst`
- `src/game/worldTrial.js:549` P? `filling in`
- `src/game/worldTrial.js:552` P? `in game`
- `src/game/worldTrial.js:552` P? `swatches none in this browser`
- `src/game/worldTrial.js:557` P? `with edge pieces`
- `src/game/worldTrial.js:561` P? `buildings x`
- `src/game/worldTrial.js:563` P? `· town x`
- `src/game/worldTrial.js:570` P? `with life`
- `src/game/worldTrial.js:575` P? `let go`
- `src/game/worldTrial.js:579` P? `(not made)`

### game: zoneMechanics (3)

- `src/game/zoneMechanics.js:167` P? `Sled stopped`
- `src/game/zoneMechanics.js:219` P? `G treasure!`
- `src/game/zoneMechanics.js:248` P? `Torch burned out!`

### game: zoneTransitions (13)

- `src/game/zoneTransitions.js:628` P `Speak to Mayor Bro first`
- `src/game/zoneTransitions.js:629` P `He's outside the Mayor's House — he'll arm you`
- `src/game/zoneTransitions.js:633` P? `Speak to Mayor Bro first`
- `src/game/zoneTransitions.js:676` P `is not on your map yet`
- `src/game/zoneTransitions.js:677` P `Mayor Bro will send you when it is time`
- `src/game/zoneTransitions.js:681` P? `Not yet`
- `src/game/zoneTransitions.js:721` P `is Lv`
- `src/game/zoneTransitions.js:722` P `Walk in again to enter`
- `src/game/zoneTransitions.js:726` P? `is Lv`
- `src/game/zoneTransitions.js:726` P? `! Walk in again to enter`
- `src/game/zoneTransitions.js:1221` P? `World View`
- `src/game/zoneTransitions.js:1282` P? `Exited dungeon`
- `src/game/zoneTransitions.js:1353` P? `Exited dungeon`

### gearFlash (1)

- `src/ui/mobile/gearFlash.js:96` P? `[data-dash-fold="min"], [data-land-fold="min"]`

### gearSellReason (13)

- `src/ui/mobile/dash/gearSellReason.js:45` P? `Earned before the game kept receipts — it still works, but it cannot be sold`
- `src/ui/mobile/dash/gearSellReason.js:46` P? `Looks aren't sellable — only armour with stats is`
- `src/ui/mobile/dash/gearSellReason.js:47` P? `You're wearing it — take it off first`
- `src/ui/mobile/dash/gearSellReason.js:48` P? `It's still in the post`
- `src/ui/mobile/dash/gearSellReason.js:49` P? `That piece isn't yours right now`
- `src/ui/mobile/dash/gearSellReason.js:50` P? `Wrong kind of slot for that piece`
- `src/ui/mobile/dash/gearSellReason.js:51` P? `You are not in the game right now`
- `src/ui/mobile/dash/gearSellReason.js:52` P? `Invalid item`
- `src/ui/mobile/dash/gearSellReason.js:59` P? `That piece cannot be sold`
- `src/ui/mobile/dash/gearSellReason.js:98` P `cosmetic`
- `src/ui/mobile/dash/gearSellReason.js:99` P `legacy`
- `src/ui/mobile/dash/gearSellReason.js:102` P `legacy`
- `src/ui/mobile/dash/gearSellReason.js:104` P `ok`

### gearStats (2)

- `src/ui/mobile/dash/gearStats.js:85` P? `Damage cut`
- `src/ui/mobile/dash/gearStats.js:156` P? `Damage cut`

### guideArrow (20)

- `src/ui/guideArrow.js:70` P? `<svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">`
- `src/ui/guideArrow.js:71` P? `<path d="M18 3 H38 V26 H51 L28 53 L5 26 H18 Z" fill="`
- `src/ui/guideArrow.js:71` P? `" stroke-width="3" stroke-linejoin="round"/>`
- `src/ui/guideArrow.js:134` P? `[data-coach], [data-guide-arrow]`
- `src/ui/guideArrow.js:136` P? `canvas, [data-joyzone]`
- `src/ui/guideArrow.js:207` P? `Click a weapon or press 1 2 3`
- `src/ui/guideArrow.js:207` P? `Tap a weapon to switch`
- `src/ui/guideArrow.js:209` T `Tap CLOSE to see more of the world`
- `src/ui/guideArrow.js:210` P? `Press E to collect, or drag here`
- `src/ui/guideArrow.js:211` T `Tap to raise your shield`
- `src/ui/guideArrow.js:211` T `Tap, then attack: your special`
- `src/ui/guideArrow.js:211` T `Tap for a special attack`
- `src/ui/guideArrow.js:212` P? `Tap here`
- `src/ui/guideArrow.js:213` P? `Tap Forge`
- `src/ui/guideArrow.js:214` P? `Tap to open`
- `src/ui/guideArrow.js:215` P? `Tap Gear`
- `src/ui/guideArrow.js:216` P? `Tap to equip`
- `src/ui/guideArrow.js:217` P? `Tap Bro: points to spend`
- `src/ui/guideArrow.js:218` P? `Tap Points`
- `src/ui/guideArrow.js:438` P? `left .2s ease-out, top .2s ease-out`

### heroModel (18)

- `src/ui/mobile/sheet/heroModel.js:49` P `Melee`
- `src/ui/mobile/sheet/heroModel.js:50` P `Bow`
- `src/ui/mobile/sheet/heroModel.js:51` P `Magic`
- `src/ui/mobile/sheet/heroModel.js:54` P `Vitality`
- `src/ui/mobile/sheet/heroModel.js:55` P `Defense`
- `src/ui/mobile/sheet/heroModel.js:56` P `Stamina`
- `src/ui/mobile/sheet/heroModel.js:246` P? `{…} with melee`
- `src/ui/mobile/sheet/heroModel.js:247` P? `{…} with bows`
- `src/ui/mobile/sheet/heroModel.js:248` P? `{…} with staves`
- `src/ui/mobile/sheet/heroModel.js:249` P? `+{…} max HP`
- `src/ui/mobile/sheet/heroModel.js:250` P? `+{…} max stamina`
- `src/ui/mobile/sheet/heroModel.js:253` P? `{…}% blocked with shield`
- `src/ui/mobile/sheet/heroModel.js:264` P? `5 melee skills`
- `src/ui/mobile/sheet/heroModel.js:265` P? `5 bow skills`
- `src/ui/mobile/sheet/heroModel.js:266` P? `5 magic skills`
- `src/ui/mobile/sheet/heroModel.js:267` P? `5 HP skills`
- `src/ui/mobile/sheet/heroModel.js:268` P? `5 defense skills`
- `src/ui/mobile/sheet/heroModel.js:269` P? `5 energy skills`

### heroStatPills (27)

- `src/ui/mobile/sheet/heroStatPills.js:88` P? `Attack Speed`
- `src/ui/mobile/sheet/heroStatPills.js:88` P? `Atk Speed`
- `src/ui/mobile/sheet/heroStatPills.js:92` P? `Crit Chance`
- `src/ui/mobile/sheet/heroStatPills.js:95` P? `Crit Dmg`
- `src/ui/mobile/sheet/heroStatPills.js:95` P? `Crit Dmg`
- `src/ui/mobile/sheet/heroStatPills.js:98` P? `Special Dmg`
- `src/ui/mobile/sheet/heroStatPills.js:99` P? `Elem Power`
- `src/ui/mobile/sheet/heroStatPills.js:108` P? `Move Speed`
- `src/ui/mobile/sheet/heroStatPills.js:109` P? `Elem Resist`
- `src/ui/mobile/sheet/heroStatPills.js:182` P? `Max HP points (`
- `src/ui/mobile/sheet/heroStatPills.js:187` P? `Max HP`
- `src/ui/mobile/sheet/heroStatPills.js:195` P? `Stamina base`
- `src/ui/mobile/sheet/heroStatPills.js:196` P? `Stamina points (`
- `src/ui/mobile/sheet/heroStatPills.js:198` P? `Stamina, other`
- `src/ui/mobile/sheet/heroStatPills.js:202` P? `Mana base`
- `src/ui/mobile/sheet/heroStatPills.js:203` P? `Magic level`
- `src/ui/mobile/sheet/heroStatPills.js:204` P? `Mana points (`
- `src/ui/mobile/sheet/heroStatPills.js:208` P? `Max stamina`
- `src/ui/mobile/sheet/heroStatPills.js:209` P? `Max mana`
- `src/ui/mobile/sheet/heroStatPills.js:214` P `Damage`
- `src/ui/mobile/sheet/heroStatPills.js:217` P `Health`
- `src/ui/mobile/sheet/heroStatPills.js:218` P `Energy`
- `src/ui/mobile/sheet/heroStatPills.js:236` P? `Defense points`
- `src/ui/mobile/sheet/heroStatPills.js:241` P `Your Defense points block`
- `src/ui/mobile/sheet/heroStatPills.js:241` P `% of a hit, then your armour blocks`
- `src/ui/mobile/sheet/heroStatPills.js:242` P `% of what’s left.`
- `src/ui/mobile/sheet/heroStatPills.js:243` P `Defense`

### infoGlossary (66)

- `src/ui/mobile/infoGlossary.js:33` P `Damage`
- `src/ui/mobile/infoGlossary.js:34` P `How hard one hit lands, before the target’s armour takes its cut.`
- `src/ui/mobile/infoGlossary.js:35` P `Shown as a range because every swing rolls somewhere inside it.`
- `src/ui/mobile/infoGlossary.js:38` P `DPS`
- `src/ui/mobile/infoGlossary.js:39` P `Damage per second — your damage and your swing speed together.`
- `src/ui/mobile/infoGlossary.js:40` P `The honest way to compare a slow heavy weapon against a fast light one.`
- `src/ui/mobile/infoGlossary.js:43` P `Crit chance`
- `src/ui/mobile/infoGlossary.js:44` P `How often a hit comes out critical instead of ordinary.`
- `src/ui/mobile/infoGlossary.js:47` P `Crit damage`
- `src/ui/mobile/infoGlossary.js:48` P `How much extra a critical hit adds on top of the normal one.`
- `src/ui/mobile/infoGlossary.js:49` P `Only pays off when you also have crit chance — the pair works together.`
- `src/ui/mobile/infoGlossary.js:56` P `Attack speed`
- `src/ui/mobile/infoGlossary.js:57` P `How quickly you swing, shoot or cast. Faster means more hits in the same time.`
- `src/ui/mobile/infoGlossary.js:58` P `Multiplies with your damage — a fast weapon with a small hit can out-damage a slow heav...`
- `src/ui/mobile/infoGlossary.js:61` P `Max HP`
- `src/ui/mobile/infoGlossary.js:62` P `How much damage you can take before you go down.`
- `src/ui/mobile/infoGlossary.js:63` P `More health also means more room for a potion or a retreat to matter.`
- `src/ui/mobile/infoGlossary.js:66` P `Stamina`
- `src/ui/mobile/infoGlossary.js:67` P `The energy your special moves and dodges draw from.`
- `src/ui/mobile/infoGlossary.js:68` P `A bigger pool means more specials before you have to wait for it to refill.`
- `src/ui/mobile/infoGlossary.js:77` P `Elemental power`
- `src/ui/mobile/infoGlossary.js:78` P `Makes your weapon’s element hit harder — burns, roots, thorns and element combos all gr...`
- `src/ui/mobile/infoGlossary.js:79` P `Only works with an enchanted weapon (one that carries an element).`
- `src/ui/mobile/infoGlossary.js:82` P `Elemental power`
- `src/ui/mobile/infoGlossary.js:83` P `Makes this weapon’s element hit harder — burns, roots, thorns and element combos all gr...`
- `src/ui/mobile/infoGlossary.js:84` P `Bought per weapon: points you put into Melee’s elemental power do nothing for your bow....`
- `src/ui/mobile/infoGlossary.js:88` P `Max mana`
- `src/ui/mobile/infoGlossary.js:89` P `The pool your special attacks and elemental bursts are cast from.`
- `src/ui/mobile/infoGlossary.js:90` P `A bigger pool also earns you more casts, not just a longer bar — the bar gains a segmen...`
- `src/ui/mobile/infoGlossary.js:93` P `Elemental resistance`
- `src/ui/mobile/infoGlossary.js:94` P `Cuts the damage you take from elemental sources — burning ground and the blue slime’s b...`
- `src/ui/mobile/infoGlossary.js:96` P `The only thing that stops elemental damage — Dodge and Defense guard against ordinary h...`
- `src/ui/mobile/infoGlossary.js:106` P `Range`
- `src/ui/mobile/infoGlossary.js:107` P `How far away your attacks still land — arrows fly farther, orbs travel farther, swings ...`
- `src/ui/mobile/infoGlossary.js:108` P `Bought per weapon: reach you buy for the bow does nothing for your sword. Reach, not da...`
- `src/ui/mobile/infoGlossary.js:111` P `Power`
- `src/ui/mobile/infoGlossary.js:113` P `Makes every hit with this weapon type bigger — a percentage on top of your weapon and y...`
- `src/ui/mobile/infoGlossary.js:114` P `The strong, simple buy early on. Shown as a range because every swing rolls somewhere i...`
- `src/ui/mobile/infoGlossary.js:117` P `Attack speed`
- `src/ui/mobile/infoGlossary.js:118` P `How quickly you swing, shoot or cast with this weapon type. Faster means more hits in t...`
- `src/ui/mobile/infoGlossary.js:119` P `Multiplies with your damage — a fast weapon with a small hit can out-damage a slow heav...`
- `src/ui/mobile/infoGlossary.js:122` P `Luck`
- `src/ui/mobile/infoGlossary.js:123` P `Both halves of a critical hit at once: how often a hit comes out critical, and how much...`
- `src/ui/mobile/infoGlossary.js:124` P `Starts at 1% for every weapon. Every point buys a little of each, so a lucky build neve...`
- `src/ui/mobile/infoGlossary.js:127` P `Special attack damage`
- `src/ui/mobile/infoGlossary.js:128` P `How much harder your special attack hits with this weapon type.`
- `src/ui/mobile/infoGlossary.js:129` P `A special costs a block of mana, so this pays off with a bigger mana pool. Ordinary hit...`
- `src/ui/mobile/infoGlossary.js:132` P `Elemental power`
- `src/ui/mobile/infoGlossary.js:133` P `Makes this weapon’s element hit harder — burns, roots, thorns and element combos all gr...`
- `src/ui/mobile/infoGlossary.js:134` P `Bought per weapon. Only works with an enchanted weapon (one that carries an element).`
- `src/ui/mobile/infoGlossary.js:137` P `Move speed`
- `src/ui/mobile/infoGlossary.js:138` P `How fast you walk and run.`
- `src/ui/mobile/infoGlossary.js:139` P `Movement, not damage — but getting to the fight, and out of it, faster is its own kind ...`
- `src/ui/mobile/infoGlossary.js:145` P `Defense`
- `src/ui/mobile/infoGlossary.js:146` P `How much less damage an ordinary hit does to you. Your Defense points cut it first, the...`
- `src/ui/mobile/infoGlossary.js:147` P `Defense points fade against monsters above your level (gone at five levels up); armour ...`
- `src/ui/mobile/infoGlossary.js:150` P `Dodge`
- `src/ui/mobile/infoGlossary.js:151` P `The chance an incoming hit misses you completely.`
- `src/ui/mobile/infoGlossary.js:154` P `Armour`
- `src/ui/mobile/infoGlossary.js:155` P `The share of each hit your gear soaks up before it reaches your health.`
- `src/ui/mobile/infoGlossary.js:164` P `Melee`
- `src/ui/mobile/infoGlossary.js:164` P `Swinging a sword in close. Levels up as you land melee hits.`
- `src/ui/mobile/infoGlossary.js:165` P `Ranged`
- `src/ui/mobile/infoGlossary.js:165` P `Shooting a bow from a distance. Levels up as your arrows connect.`
- `src/ui/mobile/infoGlossary.js:166` P `Magic`
- `src/ui/mobile/infoGlossary.js:166` P `Casting with a staff. Levels up as your bolts connect.`

### inventoryStyles (3)

- `src/ui/mobile/inventoryStyles.js:47` P? `"Source Sans 3", sans-serif`
- `src/ui/mobile/inventoryStyles.js:48` P? `"Source Sans 3", sans-serif`
- `src/ui/mobile/inventoryStyles.js:49` P? `"Source Sans 3", sans-serif`

### itemActions (2)

- `src/ui/mobile/dash/itemActions.js:60` P? `Light fire`
- `src/ui/mobile/dash/itemActions.js:62` P? `Open Golden Ticket`

### itemCategory (30)

- `src/ui/mobile/dash/itemCategory.js:32` P `Weapons`
- `src/ui/mobile/dash/itemCategory.js:34` P `Armour`
- `src/ui/mobile/dash/itemCategory.js:35` P `Gems & shards`
- `src/ui/mobile/dash/itemCategory.js:36` P `Ore & bars`
- `src/ui/mobile/dash/itemCategory.js:37` P `Wood`
- `src/ui/mobile/dash/itemCategory.js:38` P `Crops & seeds`
- `src/ui/mobile/dash/itemCategory.js:39` P `Fish`
- `src/ui/mobile/dash/itemCategory.js:40` P `Food & drinks`
- `src/ui/mobile/dash/itemCategory.js:41` P `Potions`
- `src/ui/mobile/dash/itemCategory.js:42` P `Quest items`
- `src/ui/mobile/dash/itemCategory.js:43` P `Other`
- `src/ui/mobile/dash/itemCategory.js:51` P? `chest armour`
- `src/ui/mobile/dash/itemCategory.js:52` P? `leg armour`
- `src/ui/mobile/dash/itemCategory.js:55` P? `gems or shards`
- `src/ui/mobile/dash/itemCategory.js:56` P? `Ore & bars`
- `src/ui/mobile/dash/itemCategory.js:56` P? `ore or bars`
- `src/ui/mobile/dash/itemCategory.js:58` P? `crops or seeds`
- `src/ui/mobile/dash/itemCategory.js:60` P? `food or drinks`
- `src/ui/mobile/dash/itemCategory.js:62` P? `Quest items`
- `src/ui/mobile/dash/itemCategory.js:62` P? `quest items`
- `src/ui/mobile/dash/itemCategory.js:63` P? `other items`
- `src/ui/mobile/dash/itemCategory.js:127` P `Sword`
- `src/ui/mobile/dash/itemCategory.js:128` P `Bow`
- `src/ui/mobile/dash/itemCategory.js:129` P `Staff`
- `src/ui/mobile/dash/itemCategory.js:130` P `Chest`
- `src/ui/mobile/dash/itemCategory.js:131` P `Legs`
- `src/ui/mobile/dash/itemCategory.js:132` P `Cape`
- `src/ui/mobile/dash/itemCategory.js:133` P `Shield`
- `src/ui/mobile/dash/itemCategory.js:134` P `Amulet`
- `src/ui/mobile/dash/itemCategory.js:135` P `Gem`

### lazyPanel (4)

- `src/ui/lazyPanel.js:171` P? `This window hit a problem`
- `src/ui/lazyPanel.js:171` P? `Couldn't open this`
- `src/ui/lazyPanel.js:173` P? `Close it and open it again, or reload the game.`
- `src/ui/lazyPanel.js:173` P? `Reload the game to get the newest version.`

### lib: babelHelpers (2)

- `src/lib/babelHelpers.js:4` P? `@babel/helpers - typeof`
- `src/lib/babelHelpers.js:5` P? `[object Generator]`

### mapGlyphs (18)

- `src/ui/mapGlyphs.js:33` P `M1.5 8.2 L8 2 L14.5 8.2 L13 8.2 L13 14.5 L3 14.5 L3 8.2 Z`
- `src/ui/mapGlyphs.js:34` P `M6.6 14.5 L6.6 10.4 L9.4 10.4 L9.4 14.5 Z`
- `src/ui/mapGlyphs.js:39` P `M8 1.5 L15 14.5 L1 14.5 Z`
- `src/ui/mapGlyphs.js:40` P `M8 7.5 L10.4 14.5 L5.6 14.5 Z`
- `src/ui/mapGlyphs.js:45` P `M0.8 14.5 L4.8 3.5 L7.3 9.5 L8.7 9.5 L11.2 3.5 L15.2 14.5 Z`
- `src/ui/mapGlyphs.js:46` P `M3.6 6.8 L4.8 3.5 L6 6.8 L4.8 6.1 Z M10 6.8 L11.2 3.5 L12.4 6.8 L11.2 6.1 Z`
- `src/ui/mapGlyphs.js:52` P `M1.5 14.5 L1.5 7.5 A6.5 6.5 0 0 1 14.5 7.5 L14.5 14.5 Z`
- `src/ui/mapGlyphs.js:53` P `M4.6 14.5 L4.6 8.2 A3.4 3.4 0 0 1 11.4 8.2 L11.4 14.5 Z`
- `src/ui/mapGlyphs.js:58` P `M2.6 1.2 L4.6 1.2 L4.6 2 L13.8 4.8 L4.6 8.4 L4.6 14.8 L2.6 14.8 Z`
- `src/ui/mapGlyphs.js:63` P `M1.2 1.2 L5.2 4.4 A6 6 0 0 1 10.8 4.4 L14.8 1.2 L13.4 7 A5.6 5.6 0 0 1 13.6 9.2 C13.6 1...`
- `src/ui/mapGlyphs.js:64` P `M4.4 8 L7.2 9.2 L6.8 10.8 L4.6 10.1 Z M11.6 8 L8.8 9.2 L9.2 10.8 L11.4 10.1 Z M5.8 12.2...`
- `src/ui/mapGlyphs.js:69` P `M0.8 8 C3 3.8 8.4 3.6 11.4 7 L15.2 3.8 L14.2 8 L15.2 12.2 L11.4 9 C8.4 12.4 3 12.2 0.8 8 Z`
- `src/ui/mapGlyphs.js:70` P `M3.4 7.2 A1.1 1.1 0 1 0 5.6 7.2 A1.1 1.1 0 1 0 3.4 7.2 Z`
- `src/ui/mapGlyphs.js:75` P `M8 0.8 C11.6 0.8 14 3.4 14 6.6 C14 9.6 11.8 11.4 9.2 11.6 L9.2 15.2 L6.8 15.2 L6.8 11.6...`
- `src/ui/mapGlyphs.js:76` P `M6.8 11.6 L9.2 11.6 L9.2 15.2 L6.8 15.2 Z`
- `src/ui/mapGlyphs.js:82` P `M1.5 12.8 L3 6 L6.8 2.6 L12 3.6 L14.8 8.6 L13.4 14 L3.6 14.6 Z`
- `src/ui/mapGlyphs.js:83` P `M4.6 6.4 L9.4 4.8 L11 8.6 L6.6 10.4 Z M9.6 10.4 L12.8 9.4 L13.2 12.4 L10 12.9 Z`
- `src/ui/mapGlyphs.js:89` P `M8 1 A3 3 0 1 1 7.99 1 Z M2.6 15.2 C2.6 10.6 4.8 8.2 8 8.2 C11.2 8.2 13.4 10.6 13.4 15.2 Z`

### networking: broWallet (15)

- `src/networking/broWallet.js:70` P? `That Hemi Bro belongs to a different wallet.`
- `src/networking/broWallet.js:71` P? `That Hemi Bro does not exist yet.`
- `src/networking/broWallet.js:72` P? `Could not read that signature — try again.`
- `src/networking/broWallet.js:73` P? `Enter a Hemi Bro id between 1 and 6666.`
- `src/networking/broWallet.js:74` P? `The request timed out — try again.`
- `src/networking/broWallet.js:75` P? `Could not reach Hemi right now — try again shortly.`
- `src/networking/broWallet.js:76` P? `One moment — try again in a few seconds.`
- `src/networking/broWallet.js:95` P `A verification is already running.`
- `src/networking/broWallet.js:98` P `No wallet found in this browser.`
- `src/networking/broWallet.js:102` P `Not connected.`
- `src/networking/broWallet.js:127` P `No account selected in the wallet.`
- `src/networking/broWallet.js:141` P `Signature cancelled.`
- `src/networking/broWallet.js:141` P `Wallet refused the signature.`
- `src/networking/broWallet.js:153` P `Timed out waiting for the wallet or the chain.`
- `src/networking/broWallet.js:157` P `Not connected.`

### networking: gameEvents (106)

- `src/networking/gameEvents.js:442` P? `Golden ticket event: not running.`
- `src/networking/gameEvents.js:444` P? `Golden ticket event: running (counting tickets…)`
- `src/networking/gameEvents.js:446` P? `Golden ticket event: {…} of {…} left, ~{…}% per kill.`
- `src/networking/gameEvents.js:447` P? `Golden ticket event: all tickets have been found.`
- `src/networking/gameEvents.js:482` P `Sold {…} for {…} coins.`
- `src/networking/gameEvents.js:517` P `Bought {…} for {…} coins.`
- `src/networking/gameEvents.js:525` P `He shakes his head.`
- `src/networking/gameEvents.js:730` P? `Mute list is full`
- `src/networking/gameEvents.js:744` P? `Report sent to the moderators`
- `src/networking/gameEvents.js:745` P? `Already reported just now`
- `src/networking/gameEvents.js:746` P? `Too many reports — try later`
- `src/networking/gameEvents.js:747` P? `Report failed`
- `src/networking/gameEvents.js:857` P? `Saving is paused for a moment, try again.`
- `src/networking/gameEvents.js:857` P? `g to jackpot (`
- `src/networking/gameEvents.js:868` P? `won the`
- `src/networking/gameEvents.js:868` P? `g jackpot!`
- `src/networking/gameEvents.js:940` P `Dungeon`
- `src/networking/gameEvents.js:1071` P? `BOSS FIGHT!`
- `src/networking/gameEvents.js:1092` P? `DUNGEON CLEARED!`
- `src/networking/gameEvents.js:1168` P? `Dungeon unavailable`
- `src/networking/gameEvents.js:1881` P? `G on`
- `src/networking/gameEvents.js:1881` P? `a gladiator`
- `src/networking/gameEvents.js:1899` P? `SPONSORSHIP PAID! +`
- `src/networking/gameEvents.js:1902` P? `Stake lost (-`
- `src/networking/gameEvents.js:1910` P? `Stake rejected`
- `src/networking/gameEvents.js:1961` P? `quest complete!`
- `src/networking/gameEvents.js:1972` P? `Turn-in rejected`
- `src/networking/gameEvents.js:2038` P? `Daily reward`
- `src/networking/gameEvents.js:2105` P? `a weapon`
- `src/networking/gameEvents.js:2106` P? `a piece of gear`
- `src/networking/gameEvents.js:2112` P? `a delivery`
- `src/networking/gameEvents.js:2120` P `📫 You received`
- `src/networking/gameEvents.js:2137` P? `You received`
- `src/networking/gameEvents.js:2149` P `more deliveries waiting (weapon stash is full)`
- `src/networking/gameEvents.js:3218` P `XP`
- `src/networking/gameEvents.js:3542` P? `Defense Lv`
- `src/networking/gameEvents.js:3650` P? `Defense Lv`
- `src/networking/gameEvents.js:3729` P? `LAST STAND!`
- `src/networking/gameEvents.js:3732` P? `Second Wind`
- `src/networking/gameEvents.js:3815` P? `YOU DIED`
- `src/networking/gameEvents.js:3968` P? `] clan invite!`
- `src/networking/gameEvents.js:4019` P? `] declared WAR!`
- `src/networking/gameEvents.js:4020` P? `Battle zone:`
- `src/networking/gameEvents.js:4044` P `ended`
- `src/networking/gameEvents.js:4053` P? `WAR WON!`
- `src/networking/gameEvents.js:4053` P? `War lost...`
- `src/networking/gameEvents.js:4061` P? `No pay: only those who fought are paid`
- `src/networking/gameEvents.js:4121` P? `Trade complete!`
- `src/networking/gameEvents.js:4130` P? `Saving is paused for a moment, try again.`
- `src/networking/gameEvents.js:4130` P? `Trade declined`
- `src/networking/gameEvents.js:4421` P? `LAST STAND!`
- `src/networking/gameEvents.js:4424` P? `Second Wind`
- `src/networking/gameEvents.js:4473` P? `Killed by`
- `src/networking/gameEvents.js:4509` P? `Safe zone!`
- `src/networking/gameEvents.js:4543` P? `Killed by`
- `src/networking/gameEvents.js:4630` P? `war points!`
- `src/networking/gameEvents.js:4645` P? `⚔️ ARENA R`
- `src/networking/gameEvents.js:4683` P? `Arena win! (`
- `src/networking/gameEvents.js:4686` P? `Eliminated from the arena`
- `src/networking/gameEvents.js:4704` P? `GLADIATOR CHAMPION!`
- `src/networking/gameEvents.js:4709` P? `is the Gladiator champion!`
- `src/networking/gameEvents.js:4765` P? `DUEL STARTED!`
- `src/networking/gameEvents.js:4802` P? `DUEL WON!`
- `src/networking/gameEvents.js:4802` P? `Duel forfeited`
- `src/networking/gameEvents.js:4802` P? `Duel lost`
- `src/networking/gameEvents.js:4816` P? `Saving is paused for a moment, try again.`
- `src/networking/gameEvents.js:4816` P? `Duel declined`
- `src/networking/gameEvents.js:4869` P? `They called the guards!`
- `src/networking/gameEvents.js:4869` P? `Threat ignored — they can fight back!`
- `src/networking/gameEvents.js:4899` P? `G guard fine!`
- `src/networking/gameEvents.js:4900` P? `Gear locked 30m by the guards!`
- `src/networking/gameEvents.js:4914` P? `Threat expired — fight is on!`
- `src/networking/gameEvents.js:4945` P? `wants to trade!`
- `src/networking/gameEvents.js:5067` P? `Trade declined`
- `src/networking/gameEvents.js:5067` P? `They disconnected`
- `src/networking/gameEvents.js:5068` P? `Trade expired`
- `src/networking/gameEvents.js:5068` P? `They are already trading`
- `src/networking/gameEvents.js:5069` P? `Player unavailable`
- `src/networking/gameEvents.js:5069` P? `Player unavailable`
- `src/networking/gameEvents.js:5072` P? `The trade was cancelled`
- `src/networking/gameEvents.js:5073` P? `Trade cancelled`
- `src/networking/gameEvents.js:5111` P? `invites you to a party!`
- `src/networking/gameEvents.js:5174` P? `You left the party`
- `src/networking/gameEvents.js:5174` P? `Kicked from the party`
- `src/networking/gameEvents.js:5175` P? `Party disbanded`
- `src/networking/gameEvents.js:5175` P? `Removed from party (offline)`
- `src/networking/gameEvents.js:5176` P? `Party ended`
- `src/networking/gameEvents.js:5187` P? `declined the party`
- `src/networking/gameEvents.js:5188` P? `is already in a party`
- `src/networking/gameEvents.js:5189` P? `Player unavailable`
- `src/networking/gameEvents.js:5190` P? `You are already in a party`
- `src/networking/gameEvents.js:5191` P? `Party is full`
- `src/networking/gameEvents.js:5192` P? `Party invite expired`
- `src/networking/gameEvents.js:5195` P? `Your party didn't load. Rejoin to try again`
- `src/networking/gameEvents.js:5196` P? `Party action failed`
- `src/networking/gameEvents.js:5208` P? `Cannot harden`
- `src/networking/gameEvents.js:5213` P? `⚒️ HARDENED! Now H`
- `src/networking/gameEvents.js:5228` P? `Hardening failed! (-`
- `src/networking/gameEvents.js:5229` P? `You keep H`
- `src/networking/gameEvents.js:5231` P? `Hardening failed! (-`
- `src/networking/gameEvents.js:5232` P? `(pity softens future resets)`
- `src/networking/gameEvents.js:5251` P? `Target a monster and tap TRAP`
- `src/networking/gameEvents.js:5253` P? `a pet`
- `src/networking/gameEvents.js:5256` P? `Capture failed`
- `src/networking/gameEvents.js:5266` P? `Gear locked by guards! (`
- `src/networking/gameEvents.js:5266` P? `m left)`

### networking: index (4)

- `src/networking/index.js:175` P `unavailable`
- `src/networking/index.js:178` P `unavailable`
- `src/networking/index.js:211` P `unavailable`
- `src/networking/index.js:214` P `unavailable`

### networking: rosterCookie (1)

- `src/networking/rosterCookie.js:96` P? `; Path=/; Max-Age=`

### networking: serverReady (7)

- `src/networking/serverReady.js:62` P `waiting`
- `src/networking/serverReady.js:116` P? `Reconnecting to BroTown…`
- `src/networking/serverReady.js:118` P? `The game server isn’t fully up yet — retrying…`
- `src/networking/serverReady.js:122` P? `Connecting to BroTown…`
- `src/networking/serverReady.js:123` P? `Still connecting — the game server isn’t answering yet. Hang on, we keep trying.`
- `src/networking/serverReady.js:140` P `Connecting to BroTown…`
- `src/networking/serverReady.js:156` P? `BroTown is online only — the world comes back the moment the server does.`

### networking: wsClient (64)

- `src/networking/wsClient.js:300` P `Anon`
- `src/networking/wsClient.js:553` P? `tab moved`
- `src/networking/wsClient.js:558` P? `This account connected from another window.`
- `src/networking/wsClient.js:558` P? `Play here instead`
- `src/networking/wsClient.js:950` P `joined BroTown!`
- `src/networking/wsClient.js:1046` P `Anon`
- `src/networking/wsClient.js:1183` P `Anon`
- `src/networking/wsClient.js:1575` P? `🧊 Account frozen — contact the game owner`
- `src/networking/wsClient.js:1631` P? `Not while you are fighting a player`
- `src/networking/wsClient.js:1632` P `fight`
- `src/networking/wsClient.js:2191` P? `Smithing XP`
- `src/networking/wsClient.js:2406` P? `Requires Woodworking`
- `src/networking/wsClient.js:2407` P? `Cannot harden wood right now`
- `src/networking/wsClient.js:2410` P? `Hardened Wood`
- `src/networking/wsClient.js:2412` P? `Woodworking XP`
- `src/networking/wsClient.js:2431` P? `Smithing XP`
- `src/networking/wsClient.js:2794` P? `a cape`
- `src/networking/wsClient.js:2796` P `You claimed the`
- `src/networking/wsClient.js:2821` P? `Gold Nugget!`
- `src/networking/wsClient.js:3186` P? `Not handed in`
- `src/networking/wsClient.js:3473` P? `BURNED TO DEATH`
- `src/networking/wsClient.js:3473` P? `YOU DIED`
- `src/networking/wsClient.js:3477` P? `Your bag is safe`
- `src/networking/wsClient.js:3557` P? `No log to light`
- `src/networking/wsClient.js:3583` P? `Gem shattered!`
- `src/networking/wsClient.js:3593` P? `Gem Cutting Lv`
- `src/networking/wsClient.js:3818` P? `Quest Armor`
- `src/networking/wsClient.js:3880` P `In your bag — equip it on your legs`
- `src/networking/wsClient.js:3881` P `In your bag — your chest slot was already full`
- `src/networking/wsClient.js:3907` P? `ON-CHAIN ✓ Lv`
- `src/networking/wsClient.js:4025` P `Anon`
- `src/networking/wsClient.js:4077` P `Anon`
- `src/networking/wsClient.js:4327` P `G`
- `src/networking/wsClient.js:4376` P? `+ RARE GEM`
- `src/networking/wsClient.js:4482` P? `G (sold, stash full)`
- `src/networking/wsClient.js:4729` P `gone`
- `src/networking/wsClient.js:4884` P? `Too many wrong Login Keys tried for this character. Trying again in`
- `src/networking/wsClient.js:4916` P? `joined BroTown!`
- `src/networking/wsClient.js:4957` P? `You were away, so your character logged out.`
- `src/networking/wsClient.js:4957` P? `I'm back`
- `src/networking/wsClient.js:4963` P? `This account connected from another window.`
- `src/networking/wsClient.js:4963` P? `Play here instead`
- `src/networking/wsClient.js:5043` P? `One quick check`
- `src/networking/wsClient.js:5048` P? `That didn't go through. One more try:`
- `src/networking/wsClient.js:5049` P? `Before your character is made, BroTown checks that a person is here.`
- `src/networking/wsClient.js:5055` P? `Try again`
- `src/networking/wsClient.js:5068` P? `The check couldn't load. Check your connection and try again.`
- `src/networking/wsClient.js:5083` P? `The check didn't go through. Try again.`
- `src/networking/wsClient.js:5086` P? `The check couldn't start. Try again.`
- `src/networking/wsClient.js:5097` P? `The check couldn't load. Check your connection and try again.`
- `src/networking/wsClient.js:5208` P? `still connecting after`
- `src/networking/wsClient.js:5213` P `silent`
- `src/networking/wsClient.js:5213` P `s`
- `src/networking/wsClient.js:5215` P `no answer`
- `src/networking/wsClient.js:5215` P `s after a settled action`
- `src/networking/wsClient.js:5226` P? `, forcing rejoin`
- `src/networking/wsClient.js:5246` P? `dead pipe`
- `src/networking/wsClient.js:5246` P? `resume resync`
- `src/networking/wsClient.js:5356` P? `pictures read back empty (`
- `src/networking/wsClient.js:5358` P? `pictures emptied while away --`
- `src/networking/wsClient.js:5432` P? `: context LOST on resume, waiting for restore`
- `src/networking/wsClient.js:6124` P? `idle timeout`
- `src/networking/wsClient.js:6127` P? `You were away, so your character logged out.`
- `src/networking/wsClient.js:6127` P? `I'm back`

### playerProfile (6)

- `src/ui/panels/playerProfile.js:56` P `Rare`
- `src/ui/panels/playerProfile.js:57` P `Elite`
- `src/ui/panels/playerProfile.js:58` P `Godly`
- `src/ui/panels/playerProfile.js:64` P? `Frost Fox`
- `src/ui/panels/playerProfile.js:238` P `Player`
- `src/ui/panels/playerProfile.js:283` P `You`

### questArt (19)

- `src/ui/panels/questArt.jsx:79` P? `bt-qw-f bt-qw-f-mc`
- `src/ui/panels/questArt.jsx:80` P? `bt-qw-f bt-qw-f-ml`
- `src/ui/panels/questArt.jsx:81` P? `bt-qw-f bt-qw-f-mr`
- `src/ui/panels/questArt.jsx:82` P? `bt-qw-f bt-qw-f-tfl`
- `src/ui/panels/questArt.jsx:83` P? `bt-qw-f bt-qw-f-tfr`
- `src/ui/panels/questArt.jsx:84` P? `bt-qw-f bt-qw-f-bf`
- `src/ui/panels/questArt.jsx:85` P? `bt-qw-f bt-qw-f-tl`
- `src/ui/panels/questArt.jsx:86` P? `bt-qw-f bt-qw-f-tr`
- `src/ui/panels/questArt.jsx:87` P? `bt-qw-f bt-qw-f-bl`
- `src/ui/panels/questArt.jsx:88` P? `bt-qw-f bt-qw-f-br`
- `src/ui/panels/questArt.jsx:89` P? `bt-qw-f bt-qw-f-tc`
- `src/ui/panels/questArt.jsx:217` P? `Rewards claimed!`
- `src/ui/panels/questArt.jsx:218` P? `bt-qw-spark bt-qw-spark--a`
- `src/ui/panels/questArt.jsx:219` P? `bt-qw-spark bt-qw-spark--b`
- `src/ui/panels/questArt.jsx:234` P? `Quest Accepted!`
- `src/ui/panels/questArt.jsx:234` P? `Quest Reward`
- `src/ui/panels/questArt.jsx:234` P? `Quest Complete!`
- `src/ui/panels/questArt.jsx:242` P? `bt-qw-spark bt-qw-spark--l`
- `src/ui/panels/questArt.jsx:243` P? `bt-qw-spark bt-qw-spark--r`

### questJournalModel (1)

- `src/ui/mobile/sheet/questJournalModel.js:169` P `Ready: hand it in to`

### questParts (1)

- `src/ui/mobile/dash/questParts.jsx:168` T `Your free spin and the day's rewards. Tap to open them.`

### rendering: artTools (7)

- `src/rendering/traits/artTools.js:356` P `Pen`
- `src/rendering/traits/artTools.js:357` P `Line`
- `src/rendering/traits/artTools.js:358` P `Box`
- `src/rendering/traits/artTools.js:359` P `Circle`
- `src/rendering/traits/artTools.js:360` P `Fill`
- `src/rendering/traits/artTools.js:361` P `Letters`
- `src/rendering/traits/artTools.js:370` P `Select`

### rendering: body (4)

- `src/rendering/lookSets/body.js:57` P `skin`
- `src/rendering/lookSets/body.js:58` P `pants`
- `src/rendering/lookSets/body.js:59` P `boots`
- `src/rendering/lookSets/body.js:60` P `iris`

### rendering: bodyBake (6)

- `src/rendering/bodyBake.js:169` P? `worker died`
- `src/rendering/bodyBake.js:207` P `no worker`
- `src/rendering/bodyBake.js:213` P `dropped`
- `src/rendering/bodyBake.js:217` P `post`
- `src/rendering/bodyBake.js:252` P `no worker`
- `src/rendering/bodyBake.js:273` P? `no answer`

### rendering: bodyheads (1)

- `src/rendering/lookSets/bodyheads.js:49` P `skin`

### rendering: buildCatalog (2)

- `src/rendering/traits/buildCatalog.js:73` P `Average`
- `src/rendering/traits/buildCatalog.js:104` P `Medium`

### rendering: campfireFx (1)

- `src/rendering/campfireFx.js:197` P `campfire`

### rendering: capeCatalog (1)

- `src/rendering/traits/capeCatalog.js:19` P `Crimson Cape`

### rendering: designCatalog (44)

- `src/rendering/traits/designCatalog.js:46` P `Skulls`
- `src/rendering/traits/designCatalog.js:47` P `Blades`
- `src/rendering/traits/designCatalog.js:48` P `Beasts`
- `src/rendering/traits/designCatalog.js:49` P `Fire`
- `src/rendering/traits/designCatalog.js:50` P `Hearts & Flowers`
- `src/rendering/traits/designCatalog.js:51` P `Sky`
- `src/rendering/traits/designCatalog.js:52` P `Symbols`
- `src/rendering/traits/designCatalog.js:53` P `Tribal`
- `src/rendering/traits/designCatalog.js:59` P `Ribcage`
- `src/rendering/traits/designCatalog.js:80` P `Skull`
- `src/rendering/traits/designCatalog.js:101` P `Skull & Crossbones`
- `src/rendering/traits/designCatalog.js:122` P `Sugar Skull`
- `src/rendering/traits/designCatalog.js:143` P `Anchor`
- `src/rendering/traits/designCatalog.js:164` P `Crossed Swords`
- `src/rendering/traits/designCatalog.js:185` P `Crown`
- `src/rendering/traits/designCatalog.js:206` P `Gem`
- `src/rendering/traits/designCatalog.js:227` P `Shield`
- `src/rendering/traits/designCatalog.js:248` P `Sword`
- `src/rendering/traits/designCatalog.js:269` P `Bat`
- `src/rendering/traits/designCatalog.js:290` P `Paw Print`
- `src/rendering/traits/designCatalog.js:311` P `Scorpion`
- `src/rendering/traits/designCatalog.js:332` P `Snake`
- `src/rendering/traits/designCatalog.js:353` P `Flame`
- `src/rendering/traits/designCatalog.js:374` P `Lightning Bolt`
- `src/rendering/traits/designCatalog.js:395` P `Storm Bolt`
- `src/rendering/traits/designCatalog.js:416` P `Broken Heart`
- `src/rendering/traits/designCatalog.js:437` P `Four-Leaf Clover`
- `src/rendering/traits/designCatalog.js:458` P `Heart`
- `src/rendering/traits/designCatalog.js:479` P `Rose`
- `src/rendering/traits/designCatalog.js:500` P `Comet`
- `src/rendering/traits/designCatalog.js:521` P `Crescent Moon`
- `src/rendering/traits/designCatalog.js:542` P `Star`
- `src/rendering/traits/designCatalog.js:563` P `Sun`
- `src/rendering/traits/designCatalog.js:584` P `Arrow`
- `src/rendering/traits/designCatalog.js:605` P `Cross`
- `src/rendering/traits/designCatalog.js:626` P `Diamond`
- `src/rendering/traits/designCatalog.js:647` P `Dice`
- `src/rendering/traits/designCatalog.js:668` P `Eye`
- `src/rendering/traits/designCatalog.js:689` P `Music Note`
- `src/rendering/traits/designCatalog.js:710` P `Yin Yang`
- `src/rendering/traits/designCatalog.js:731` P `Barbed Wire`
- `src/rendering/traits/designCatalog.js:752` P `Chevron Band`
- `src/rendering/traits/designCatalog.js:773` P `Tribal Band`
- `src/rendering/traits/designCatalog.js:794` P `Tribal Wings`

### rendering: effectsRenderer (16)

- `src/rendering/systems/effectsRenderer.js:2032` P? `Source Sans 3, sans-serif`
- `src/rendering/systems/effectsRenderer.js:2070` P? `let go`
- `src/rendering/systems/effectsRenderer.js:2139` P? `-0 BLOCK Dodge!`
- `src/rendering/systems/effectsRenderer.js:2140` P? `🛡️🔥 Defense Lv 0`
- `src/rendering/systems/effectsRenderer.js:4241` P? `a tree in reach`
- `src/rendering/systems/effectsRenderer.js:4242` P? `a campfire in reach`
- `src/rendering/systems/effectsRenderer.js:4247` P? `a campfire lit`
- `src/rendering/systems/effectsRenderer.js:4253` P? `the farm`
- `src/rendering/systems/effectsRenderer.js:4259` P? `lighting a fire`
- `src/rendering/systems/effectsRenderer.js:4262` P? `a log in the bag`
- `src/rendering/systems/effectsRenderer.js:4271` P? `another player`
- `src/rendering/systems/effectsRenderer.js:9467` P? `'s loot`
- `src/rendering/systems/effectsRenderer.js:9627` P `RARE DROP!`
- `src/rendering/systems/effectsRenderer.js:10019` P? `Rare Gem`
- `src/rendering/systems/effectsRenderer.js:14283` P `dressed:`
- `src/rendering/systems/effectsRenderer.js:17015` P `dressed:`

### rendering: entity-look (4)

- `src/rendering/leaves/entity-look.js:45` P? `asked {…}s`
- `src/rendering/leaves/entity-look.js:46` P? `retry in {…}s`
- `src/rendering/leaves/entity-look.js:47` P? `meta gave up`
- `src/rendering/leaves/entity-look.js:47` P? `no meta`

### rendering: entityRenderer (14)

- `src/rendering/systems/entityRenderer.js:1088` P `asked again`
- `src/rendering/systems/entityRenderer.js:1088` P `{…} {…} {…}s [{…}]{…}`
- `src/rendering/systems/entityRenderer.js:2640` P `worker error`
- `src/rendering/systems/entityRenderer.js:2834` P `no worker`
- `src/rendering/systems/entityRenderer.js:2847` P `worker let go`
- `src/rendering/systems/entityRenderer.js:2848` P `gear numbers not sent`
- `src/rendering/systems/entityRenderer.js:2876` P `no sheet`
- `src/rendering/systems/entityRenderer.js:3104` P `worker stuck`
- `src/rendering/systems/entityRenderer.js:6257` P `LV`
- `src/rendering/systems/entityRenderer.js:14575` P `stand-in has its own arm`
- `src/rendering/systems/entityRenderer.js:14706` P `shield down`
- `src/rendering/systems/entityRenderer.js:15214` P `pet`
- `src/rendering/systems/entityRenderer.js:16215` P `1 quest available`
- `src/rendering/systems/entityRenderer.js:16424` P `round`

### rendering: eyeColorCatalog (4)

- `src/rendering/traits/eyeColorCatalog.js:27` P `Brown`
- `src/rendering/traits/eyeColorCatalog.js:28` P `Amber`
- `src/rendering/traits/eyeColorCatalog.js:31` P `Ice`
- `src/rendering/traits/eyeColorCatalog.js:32` P `Violet`

### rendering: eyeStyleCatalog (5)

- `src/rendering/traits/eyeStyleCatalog.js:106` P `Sleepy Eyes`
- `src/rendering/traits/eyeStyleCatalog.js:114` P `One Eye`
- `src/rendering/traits/eyeStyleCatalog.js:129` P `Demon Eyes`
- `src/rendering/traits/eyeStyleCatalog.js:145` P `WTF Eyes`
- `src/rendering/traits/eyeStyleCatalog.js:158` P `Alien Eyes`

### rendering: eyewearCatalog (8)

- `src/rendering/traits/eyewearCatalog.js:74` P `3D Glasses`
- `src/rendering/traits/eyewearCatalog.js:82` P `Goggles`
- `src/rendering/traits/eyewearCatalog.js:88` P `Laser Glasses`
- `src/rendering/traits/eyewearCatalog.js:106` P `Thug Life`
- `src/rendering/traits/eyewearCatalog.js:116` P `White Glass`
- `src/rendering/traits/eyewearCatalog.js:137` P `Golden Monocle`
- `src/rendering/traits/eyewearCatalog.js:159` P `Golden Glasses`
- `src/rendering/traits/eyewearCatalog.js:183` P `Eye Patch`

### rendering: facialHairCatalog (1)

- `src/rendering/traits/facialHairCatalog.js:22` P `Beard`

### rendering: facialHairColorCatalog (3)

- `src/rendering/traits/facialHairColorCatalog.js:21` P `Brown`
- `src/rendering/traits/facialHairColorCatalog.js:22` P `Auburn`
- `src/rendering/traits/facialHairColorCatalog.js:23` P `Blonde`

### rendering: farmWorld (2)

- `src/rendering/farmWorld.js:182` P? `Source Sans 3, sans-serif`
- `src/rendering/farmWorld.js:309` P `wait`

### rendering: fillBatch (2)

- `src/rendering/fillBatch.js:152` P? `switched off (?fill=0)`
- `src/rendering/fillBatch.js:178` P? `no self-test on this page (?selftest=0)`

### rendering: fpsOverlay (10)

- `src/rendering/systems/fpsOverlay.js:63` P? `fps buffer cleared`
- `src/rendering/systems/fpsOverlay.js:103` P? `FPS {…} min {…} ({…}ms)`
- `src/rendering/systems/fpsOverlay.js:139` P? `NET -- last {…}ms`
- `src/rendering/systems/fpsOverlay.js:144` P? `NET {…}ms p95 {…}ms last {…}ms stalls {…}`
- `src/rendering/systems/fpsOverlay.js:153` P? `[bt_fps] no samples yet`
- `src/rendering/systems/fpsOverlay.js:160` P? `[bt_fps] need >=2 samples in last {…}s, have {…}`
- `src/rendering/systems/fpsOverlay.js:178` P? `[bt_fps] window={…}s samples={…} avg={…} p50={…} p95={…} min={…} worst={…}ms dips<50={…...`
- `src/rendering/systems/fpsOverlay.js:186` P? `[bt_net] need >=2 ticks, have {…}`
- `src/rendering/systems/fpsOverlay.js:194` P? `[bt_net] need >=2 ticks in last {…}s, have {…}`
- `src/rendering/systems/fpsOverlay.js:210` P? `[bt_net] window={…}s ticks={…} mean-gap={…}ms p50={…} p95={…} worst={…}ms stalls>200={…...`

### rendering: gearCatalog (6)

- `src/rendering/gearCatalog.js:42` P `Copper Greaves`
- `src/rendering/gearCatalog.js:43` P `Copper Plate`
- `src/rendering/gearCatalog.js:213` P `Copper Torso`
- `src/rendering/gearCatalog.js:214` P `Copper Greaves`
- `src/rendering/gearCatalog.js:242` P `Steel Plate`
- `src/rendering/gearCatalog.js:243` P `Steel Greaves`

### rendering: gearLookProbe (5)

- `src/rendering/gearLookProbe.js:105` P `no numbers`
- `src/rendering/gearLookProbe.js:108` P `no RGBA sheet`
- `src/rendering/gearLookProbe.js:119` P `no numbers`
- `src/rendering/gearLookProbe.js:163` P `no numbers`
- `src/rendering/gearLookProbe.js:166` P `frames: {…} RGBA, {…} numbers`

### rendering: gearVariants (6)

- `src/rendering/gearVariants.js:20` P `Copper Plate`
- `src/rendering/gearVariants.js:21` P `Copper Greaves`
- `src/rendering/gearVariants.js:28` P `Iron Plate`
- `src/rendering/gearVariants.js:29` P `Iron Greaves`
- `src/rendering/gearVariants.js:36` P `Black Steel Plate`
- `src/rendering/gearVariants.js:37` P `Black Steel Greaves`

### rendering: glint (1)

- `src/rendering/lightfx/glint.js:385` P? `no self-test on this page (?selftest=0)`

### rendering: hairCatalog (8)

- `src/rendering/traits/hairCatalog.js:16` P `Wavy`
- `src/rendering/traits/hairCatalog.js:17` P `Long`
- `src/rendering/traits/hairCatalog.js:24` P `Split Hair`
- `src/rendering/traits/hairCatalog.js:25` P `Dirty Blonde`
- `src/rendering/traits/hairCatalog.js:26` P `Slick Back Hair`
- `src/rendering/traits/hairCatalog.js:27` P `Afro`
- `src/rendering/traits/hairCatalog.js:28` P `Blonde Hair`
- `src/rendering/traits/hairCatalog.js:29` P `Flat Top`

### rendering: hairClip (3)

- `src/rendering/hairClip.js:189` P? `switched off (?alphaclip)`
- `src/rendering/hairClip.js:194` P? `not installed here (no WebGL2: the alpha mask)`
- `src/rendering/hairClip.js:225` P? `no self-test on this page (?selftest=0)`

### rendering: hairColorCatalog (4)

- `src/rendering/traits/hairColorCatalog.js:24` P `Brown`
- `src/rendering/traits/hairColorCatalog.js:25` P `Auburn`
- `src/rendering/traits/hairColorCatalog.js:26` P `Blonde`
- `src/rendering/traits/hairColorCatalog.js:56` P `Teal`

### rendering: hatColorCatalog (1)

- `src/rendering/traits/hatColorCatalog.js:27` P `Teal`

### rendering: headFrames (6)

- `src/rendering/headFrames.js:180` P? `{…}, not on screen ({…}/{…} px), {…}, {…}`
- `src/rendering/headFrames.js:182` P `head pieces: {…} frames`
- `src/rendering/headFrames.js:183` P `, no bro {…}`
- `src/rendering/headFrames.js:183` P `missing: yours {…}, others {…}, off screen {…}{…}`
- `src/rendering/headFrames.js:253` P? `its box`
- `src/rendering/headFrames.js:253` P? `the silhouette`

### rendering: headwearCatalog (39)

- `src/rendering/traits/headwearCatalog.js:19` P `Old School Helmet`
- `src/rendering/traits/headwearCatalog.js:20` P `Top Hat`
- `src/rendering/traits/headwearCatalog.js:21` P `Purple Hat`
- `src/rendering/traits/headwearCatalog.js:22` P `Beanie`
- `src/rendering/traits/headwearCatalog.js:23` P `Red Cap`
- `src/rendering/traits/headwearCatalog.js:24` P `Shark Hat`
- `src/rendering/traits/headwearCatalog.js:25` P `Bandana`
- `src/rendering/traits/headwearCatalog.js:26` P `Sombrero`
- `src/rendering/traits/headwearCatalog.js:27` P `Bucket Hat`
- `src/rendering/traits/headwearCatalog.js:30` P `Derby`
- `src/rendering/traits/headwearCatalog.js:37` P `Crown`
- `src/rendering/traits/headwearCatalog.js:43` P `Wizard Hat`
- `src/rendering/traits/headwearCatalog.js:44` P `Mickey Ears`
- `src/rendering/traits/headwearCatalog.js:45` P `Evil Crown`
- `src/rendering/traits/headwearCatalog.js:56` P `Barbarian Helmet`
- `src/rendering/traits/headwearCatalog.js:57` P `Army Helmet`
- `src/rendering/traits/headwearCatalog.js:58` P `Axe On Head`
- `src/rendering/traits/headwearCatalog.js:59` P `Golden Bucket`
- `src/rendering/traits/headwearCatalog.js:68` P `Arabian Robe`
- `src/rendering/traits/headwearCatalog.js:74` P `Headphones`
- `src/rendering/traits/headwearCatalog.js:75` P `Devil Horns`
- `src/rendering/traits/headwearCatalog.js:76` P `Cat Ears`
- `src/rendering/traits/headwearCatalog.js:77` P `New Idea`
- `src/rendering/traits/headwearCatalog.js:86` P `Dark Bucket Hat`
- `src/rendering/traits/headwearCatalog.js:87` P `Red Bandana`
- `src/rendering/traits/headwearCatalog.js:88` P `Asian Hat`
- `src/rendering/traits/headwearCatalog.js:89` P `Fez Hat`
- `src/rendering/traits/headwearCatalog.js:90` P `Russian Hat`
- `src/rendering/traits/headwearCatalog.js:91` P `Brown Cowboy Hat`
- `src/rendering/traits/headwearCatalog.js:92` P `Folded Brim`
- `src/rendering/traits/headwearCatalog.js:93` P `Gray Hat`
- `src/rendering/traits/headwearCatalog.js:94` P `Safety Helmet`
- `src/rendering/traits/headwearCatalog.js:95` P `Naruto Headband`
- `src/rendering/traits/headwearCatalog.js:99` P `Sheriff Hat`
- `src/rendering/traits/headwearCatalog.js:100` P `Chinese Hat`
- `src/rendering/traits/headwearCatalog.js:101` P `Spartan Helmet`
- `src/rendering/traits/headwearCatalog.js:102` P `Blue Bandana`
- `src/rendering/traits/headwearCatalog.js:103` P `Kermit Hat`
- `src/rendering/traits/headwearCatalog.js:106` P `Halo`

### rendering: hemiLook (2)

- `src/rendering/hemiLook.js:237` P `address`
- `src/rendering/hemiLook.js:238` P `address`

### rendering: lookArmourProbe (4)

- `src/rendering/lookArmourProbe.js:146` P `m`
- `src/rendering/lookArmourProbe.js:169` P `m`
- `src/rendering/lookArmourProbe.js:212` P `m`
- `src/rendering/lookArmourProbe.js:340` P `no gearFrame`

### rendering: lookPalette (9)

- `src/rendering/lookPalette.js:188` P `skin`
- `src/rendering/lookPalette.js:189` P `pants`
- `src/rendering/lookPalette.js:190` P `boots`
- `src/rendering/lookPalette.js:191` P `iris`
- `src/rendering/lookPalette.js:919` P? `texelFetch(uTextures[{…}], p, 0)`
- `src/rendering/lookPalette.js:1462` P? `the look program did not build on this device`
- `src/rendering/lookPalette.js:1488` P? `not built on this device`
- `src/rendering/lookPalette.js:1503` P? `no self-test on this page (?selftest=0)`
- `src/rendering/lookPalette.js:1544` P? `the look program drew the wrong picture (the self-test): each look baked`

### rendering: maskedBakeWorker (3)

- `src/rendering/maskedBakeWorker.js:223` P `url`
- `src/rendering/maskedBakeWorker.js:399` P `url read`
- `src/rendering/maskedBakeWorker.js:407` P `gear numbers not here`

### rendering: materialTints (4)

- `src/rendering/traits/materialTints.js:84` P `Steel`
- `src/rendering/traits/materialTints.js:106` P `Copper`
- `src/rendering/traits/materialTints.js:111` P `Iron`
- `src/rendering/traits/materialTints.js:123` P `Black Steel`

### rendering: minimapRenderer (1)

- `src/rendering/systems/minimapRenderer.js:275` P `minimap`

### rendering: monsterShotFx (1)

- `src/rendering/monsterShotFx.js:637` P `land`

### rendering: nodeLabels (1)

- `src/rendering/nodeLabels.js:148` P? `Source Sans 3, sans-serif`

### rendering: npcSprites (1)

- `src/rendering/npcSprites.js:426` P? `Mayor Bro`

### rendering: paletteLoad (1)

- `src/rendering/paletteLoad.js:126` P `stopped`

### rendering: paletteTex (18)

- `src/rendering/paletteTex.js:262` P? `if (vTextureId < {…}.5)`
- `src/rendering/paletteTex.js:495` P `address`
- `src/rendering/paletteTex.js:577` P? `if (vTextureId < {…}.5)`
- `src/rendering/paletteTex.js:604` P? `{ outColor = texture(uTextures[{…}], vUV); }`
- `src/rendering/paletteTex.js:606` P? `{ outColor = sharpSample(uTextures[{…}], vUV, uvDx, uvDy); }`
- `src/rendering/paletteTex.js:929` P? `switched off`
- `src/rendering/paletteTex.js:929` P? `no WebGL 2`
- `src/rendering/paletteTex.js:972` P? `the palette programs did not build on this device`
- `src/rendering/paletteTex.js:981` P? `no self-test on this page (?selftest=0)`
- `src/rendering/paletteTex.js:985` P? `the palette program drew the wrong picture (the self-test): whole colours`
- `src/rendering/paletteTex.js:988` P? `not built on this device`
- `src/rendering/paletteTex.js:1022` P? `the three programs chosen (`
- `src/rendering/paletteTex.js:1022` P? `no WebGL 2`
- `src/rendering/paletteTex.js:1076` P? `the one program did not build on this device`
- `src/rendering/paletteTex.js:1085` P? `no self-test on this page (?selftest=0)`
- `src/rendering/paletteTex.js:1092` P? `the one program drew the wrong picture (the self-test): the three programs`
- `src/rendering/paletteTex.js:1102` P? `the sharp read is the one program's here: in its test`
- `src/rendering/paletteTex.js:1103` P? `not built on this device`

### rendering: patternCatalog (9)

- `src/rendering/traits/patternCatalog.js:37` P `Stripes`
- `src/rendering/traits/patternCatalog.js:38` P `Bands`
- `src/rendering/traits/patternCatalog.js:40` P `Checks`
- `src/rendering/traits/patternCatalog.js:47` P `Polka`
- `src/rendering/traits/patternCatalog.js:56` P `Diagonal`
- `src/rendering/traits/patternCatalog.js:63` P `Windowpane`
- `src/rendering/traits/patternCatalog.js:70` P `Chevron`
- `src/rendering/traits/patternCatalog.js:81` P `Camo`
- `src/rendering/traits/patternCatalog.js:92` P `Diamonds`

### rendering: pixiApp (3)

- `src/rendering/pixiApp.js:230` P `world`
- `src/rendering/pixiApp.js:710` P? `canvas context lost`
- `src/rendering/pixiApp.js:713` P? `canvas context restored`

### rendering: pixiRenderer (7)

- `src/rendering/pixiRenderer.js:909` P? `(walk failed)`
- `src/rendering/pixiRenderer.js:1125` P `no renderer`
- `src/rendering/pixiRenderer.js:1275` P `texture source is not readable`
- `src/rendering/pixiRenderer.js:1297` P `texture is tainted or unreadable:`
- `src/rendering/pixiRenderer.js:1418` P `texture source is not readable`
- `src/rendering/pixiRenderer.js:1450` P `texture is tainted or unreadable:`
- `src/rendering/pixiRenderer.js:1578` P `texture unreadable`

### rendering: playerSkins (22)

- `src/rendering/playerSkins.js:84` P `Alabaster`
- `src/rendering/playerSkins.js:85` P `Porcelain`
- `src/rendering/playerSkins.js:86` P `Ivory`
- `src/rendering/playerSkins.js:115` P `Alien Cyan`
- `src/rendering/playerSkins.js:116` P `Rosy`
- `src/rendering/playerSkins.js:117` P `Pale`
- `src/rendering/playerSkins.js:118` P `Fair`
- `src/rendering/playerSkins.js:119` P `Sand`
- `src/rendering/playerSkins.js:120` P `Honey`
- `src/rendering/playerSkins.js:121` P `Tan`
- `src/rendering/playerSkins.js:122` P `Olive`
- `src/rendering/playerSkins.js:123` P `Brown`
- `src/rendering/playerSkins.js:124` P `Deep`
- `src/rendering/playerSkins.js:125` P `Ebony`
- `src/rendering/playerSkins.js:137` P `Monkey Brown`
- `src/rendering/playerSkins.js:156` P `Charcoal`
- `src/rendering/playerSkins.js:157` P `Snow`
- `src/rendering/playerSkins.js:176` P `Brown`
- `src/rendering/playerSkins.js:181` P `Teal`
- `src/rendering/playerSkins.js:183` P `Navy`
- `src/rendering/playerSkins.js:191` P `Brown`
- `src/rendering/playerSkins.js:192` P `Tan`

### rendering: png8Worker (2)

- `src/rendering/png8Worker.js:81` P `piece`
- `src/rendering/png8Worker.js:81` P `does not come back`

### rendering: preloadAnimations (1)

- `src/rendering/preloadAnimations.js:220` P? `the farm`

### rendering: raceFlags (1)

- `src/rendering/raceFlags.js:62` P `FINISH`

### rendering: selfTest (5)

- `src/rendering/selfTest.js:394` P `nothing read back: the program kept as today`
- `src/rendering/selfTest.js:399` P `the address (?selftest=fail)`
- `src/rendering/selfTest.js:399` P `of`
- `src/rendering/selfTest.js:399` P `pixels wrong`
- `src/rendering/selfTest.js:399` P `nothing read back`

### rendering: shadows (1)

- `src/rendering/lightfx/shadows.js:303` P? `no self-test on this page (?selftest=0)`

### rendering: sharpPixels (7)

- `src/rendering/sharpPixels.js:158` P `in float vTextureId; uniform sampler2D uTextures[{…}]; {…}`
- `src/rendering/sharpPixels.js:203` P `sharp`
- `src/rendering/sharpPixels.js:207` P `sharp`
- `src/rendering/sharpPixels.js:309` P? `switched off (?sharp=0)`
- `src/rendering/sharpPixels.js:309` P? `not installed (WebGL 2 only)`
- `src/rendering/sharpPixels.js:310` P? `no self-test on this page (?selftest=0)`
- `src/rendering/sharpPixels.js:313` P? `switched off live`

### rendering: sheenBatch (4)

- `src/rendering/lightfx/sheenBatch.js:313` P? `every shine in a pass of its own (?sheenpass)`
- `src/rendering/lightfx/sheenBatch.js:313` P? `the sharp read fell back (its self-test): every shine in a pass of its own`
- `src/rendering/lightfx/sheenBatch.js:313` P? `every shine in a pass of its own here`
- `src/rendering/lightfx/sheenBatch.js:345` P? `no self-test on this page (?selftest=0)`

### rendering: shirtColorCatalog (2)

- `src/rendering/traits/shirtColorCatalog.js:23` P `Teal`
- `src/rendering/traits/shirtColorCatalog.js:25` P `Navy`

### rendering: skills (4)

- `src/rendering/lookSets/skills.js:75` P `skin`
- `src/rendering/lookSets/skills.js:76` P `pants`
- `src/rendering/lookSets/skills.js:77` P `boots`
- `src/rendering/lookSets/skills.js:137` P `the cook's strip has 72,439 colours (the pan, the food, his shading): cut to 256 its wo...`

### rendering: speciesCatalog (3)

- `src/rendering/traits/speciesCatalog.js:39` P `Human`
- `src/rendering/traits/speciesCatalog.js:40` P `Monkey`
- `src/rendering/traits/speciesCatalog.js:59` P `Alien`

### rendering: standin (4)

- `src/rendering/lookSets/standin.js:37` P? `jog-{…}-legs`
- `src/rendering/lookSets/standin.js:48` P `skin`
- `src/rendering/lookSets/standin.js:49` P `pants`
- `src/rendering/lookSets/standin.js:50` P `boots`

### rendering: standinlegs (5)

- `src/rendering/lookSets/standinlegs.js:37` P? `sword-{…}-body`
- `src/rendering/lookSets/standinlegs.js:38` P? `bow-{…}-body`
- `src/rendering/lookSets/standinlegs.js:50` P `skin`
- `src/rendering/lookSets/standinlegs.js:51` P `pants`
- `src/rendering/lookSets/standinlegs.js:52` P `boots`

### rendering: stripRead (1)

- `src/rendering/stripRead.js:123` P? `no answer`

### rendering: tileRenderer (1)

- `src/rendering/systems/tileRenderer.js:579` P `Way Out`

### rendering: tiledMaps (2)

- `src/rendering/tiledMaps.js:389` P? `map > tileset`
- `src/rendering/tiledMaps.js:401` P? `map > layer`

### rendering: wheelLife (3)

- `src/rendering/wheelLife.js:91` P? `no see-through colour`
- `src/rendering/wheelLife.js:109` P? `px, not`
- `src/rendering/wheelLife.js:111` P? `palette full`

### rendering: wheelMinimap (3)

- `src/rendering/systems/wheelMinimap.js:370` P `N`
- `src/rendering/systems/wheelMinimap.js:1132` P? `{…}x{…}x{…}x{…}x{…}`
- `src/rendering/systems/wheelMinimap.js:1181` P `N`

### rendering: wheelObjects (1)

- `src/rendering/wheelObjects.js:248` P `stopped`

### rendering: wheelWater (8)

- `src/rendering/wheelWater.js:448` P? `if (brk > 0.0) {`
- `src/rendering/wheelWater.js:497` P? `texture(uPiece, vUV + off * uUvPerPx)`
- `src/rendering/wheelWater.js:702` P? `switched off (?nowaves)`
- `src/rendering/wheelWater.js:702` P? `no WebGL 2`
- `src/rendering/wheelWater.js:723` P? `the water program did not build on this device`
- `src/rendering/wheelWater.js:729` P? `not built on this device`
- `src/rendering/wheelWater.js:745` P? `no self-test on this page (?selftest=0)`
- `src/rendering/wheelWater.js:784` P? `the water program drew the wrong picture (the self-test): still water`

### server: account (1)

- `server/src/account.js:84` S `Not found`

### server: accuracy (1)

- `server/src/accuracy.js:382` S `could not read the days`

### server: achievements (3)

- `server/src/achievements.js:600` S `achievements record locked`
- `server/src/achievements.js:609` S `id (one of`
- `server/src/achievements.js:609` S `) or all or clear`

### server: alliance (1)

- `server/src/alliance.js:539` S `alliance war vs [`

### server: amulet (1)

- `server/src/amulet.js:162` S `Gold Amulet`

### server: arena (10)

- `server/src/arena.js:54` S `Not found`
- `server/src/arena.js:62` S `Missing fields`
- `server/src/arena.js:66` S `Already in queue`
- `server/src/arena.js:71` S `Already in tournament`
- `server/src/arena.js:115` S `Missing playerId`
- `server/src/arena.js:124` S `Missing playerId`
- `server/src/arena.js:156` S `Missing fields`
- `server/src/arena.js:159` S `Tournament not found`
- `server/src/arena.js:163` S `Match not found`
- `server/src/arena.js:166` S `Already resolved`

### server: armorforge (6)

- `server/src/armorforge.js:61` S `Copper Torso`
- `server/src/armorforge.js:62` S `Copper Greaves`
- `server/src/armorforge.js:63` S `Iron Torso`
- `server/src/armorforge.js:64` S `Iron Greaves`
- `server/src/armorforge.js:65` S `Black Steel Torso`
- `server/src/armorforge.js:66` S `Black Steel Greaves`

### server: botfp (1)

- `server/src/botfp.js:845` S `planted from the Test panel, not evidence`

### server: cadence (2)

- `server/src/cadence.js:249` S `Weekly jackpot —`
- `server/src/cadence.js:249` S `ticket(s) of`

### server: chainwriter (1)

- `server/src/chainwriter.js:401` S `send failed`

### server: charname (5)

- `server/src/charname.js:127` S `Name refused:`
- `server/src/charname.js:127` S `pick another name`
- `server/src/charname.js:150` S `playerId required`
- `server/src/charname.js:154` S `name refused:`
- `server/src/charname.js:156` S `no such character`

### server: charwatch (3)

- `server/src/charwatch.js:118` S `could not read the characters`
- `server/src/charwatch.js:133` S `playerId required`
- `server/src/charwatch.js:136` S `no such character`

### server: chatmod (1)

- `server/src/chatmod.js:540` S `id required`

### server: codex (3)

- `server/src/codex.js:210` S `codex record locked`
- `server/src/codex.js:213` S `kind (one of`
- `server/src/codex.js:213` S `) or all`

### server: dailychest (4)

- `server/src/dailychest.js:58` S `Copper Torso`
- `server/src/dailychest.js:59` S `Copper Greaves`
- `server/src/dailychest.js:60` S `Iron Torso`
- `server/src/dailychest.js:61` S `Iron Greaves`

### server: dailyrewards (4)

- `server/src/dailyrewards.js:620` S `Daily spin`
- `server/src/dailyrewards.js:891` S `Daily quest`
- `server/src/dailyrewards.js:899` S `Daily quest`
- `server/src/dailyrewards.js:1097` S `no record`

### server: data (8)

- `server/src/data.js:853` S `Copper Great Sword`
- `server/src/data.js:861` S `Pine Shield`
- `server/src/data.js:876` S `Pine Bow`
- `server/src/data.js:877` S `Pine Staff`
- `server/src/data.js:910` S `Copper Greaves`
- `server/src/data.js:1034` S `Copper Torso`
- `server/src/data.js:1533` S `Iron Torso`
- `server/src/data.js:1534` S `Iron Greaves`

### server: daybook (1)

- `server/src/daybook.js:581` S `could not read the book`

### server: devicelock (2)

- `server/src/devicelock.js:395` S `playerId required`
- `server/src/devicelock.js:416` S `No character has that code. Check it for typos.`

### server: duel (5)

- `server/src/duel.js:377` S `duel won`
- `server/src/duel.js:380` S `duel won`
- `server/src/duel.js:383` S `duel won`
- `server/src/duel.js:581` S `duel voided (server restart)`
- `server/src/duel.js:582` S `duel voided (server restart)`

### server: econcard (1)

- `server/src/econcard.js:138` S `read failed`

### server: eventcapes (2)

- `server/src/eventcapes.js:579` S `name a real cape: ?cape=`
- `server/src/eventcapes.js:582` S `this voids tickets people may have won — add &confirm=yes`

### server: farm (2)

- `server/src/farm.js:136` S `Rock Vine`
- `server/src/farm.js:171` S `Thunder Pepper`

### server: feedback (16)

- `server/src/feedback.js:235` S `Not found`
- `server/src/feedback.js:243` S `Not found`
- `server/src/feedback.js:249` S `Not found`
- `server/src/feedback.js:253` S `Not found`
- `server/src/feedback.js:266` S `Missing fields`
- `server/src/feedback.js:268` S `Rate limited`
- `server/src/feedback.js:303` S `Missing fields`
- `server/src/feedback.js:305` S `Invalid player`
- `server/src/feedback.js:318` S `Missing fields`
- `server/src/feedback.js:321` S `Invalid category`
- `server/src/feedback.js:356` S `Invalid vote`
- `server/src/feedback.js:359` S `Invalid vote`
- `server/src/feedback.js:364` S `Ticket not found`
- `server/src/feedback.js:383` S `Ticket not found`
- `server/src/feedback.js:524` S `No such ticket`
- `server/src/feedback.js:526` S `No such ticket`

### server: fightlock (1)

- `server/src/fightlock.js:110` S `Cannot harden right now`

### server: fishlog (3)

- `server/src/fishlog.js:479` S `next: 'albino', 'large', 'normal' or null`
- `server/src/fishlog.js:483` S `give: a fish key (fish_<species>[_albino\|_large], or cooked_)`
- `server/src/fishlog.js:499` S `next ('albino'\|'large'\|'normal'\|null) or give (a fish key) and n`

### server: gladiator (24)

- `server/src/gladiator.js:212` S `Not authorized`
- `server/src/gladiator.js:218` S `Not while you are fighting a player`
- `server/src/gladiator.js:229` S `Not authorized`
- `server/src/gladiator.js:237` S `Results are server-observed now`
- `server/src/gladiator.js:248` S `Not found`
- `server/src/gladiator.js:335` S `Missing playerId`
- `server/src/gladiator.js:340` S `Not in game`
- `server/src/gladiator.js:351` S `Tournament in progress`
- `server/src/gladiator.js:351` S `Tournament just ended`
- `server/src/gladiator.js:358` S `No open queue`
- `server/src/gladiator.js:359` S `Already queued`
- `server/src/gladiator.js:403` S `No open queue`
- `server/src/gladiator.js:405` S `Not queued`
- `server/src/gladiator.js:720` S `your cut of a sponsorship pool`
- `server/src/gladiator.js:721` S `sponsorship paid off`
- `server/src/gladiator.js:723` S `claimed a failed sponsorship`
- `server/src/gladiator.js:767` S `your cut of a sponsorship pool`
- `server/src/gladiator.js:770` S `sponsorship paid off`
- `server/src/gladiator.js:774` S `claimed a failed sponsorship`
- `server/src/gladiator.js:973` S `Gladiator Arena champion`
- `server/src/gladiator.js:975` S `Gladiator Arena champion`
- `server/src/gladiator.js:979` S `Gladiator Arena champion`
- `server/src/gladiator.js:1020` S `arena voided (server restart)`
- `server/src/gladiator.js:1120` S `sponsorship voided (server restart)`

### server: hardenedwood (5)

- `server/src/hardenedwood.js:63` S `Hardened Pine Wood`
- `server/src/hardenedwood.js:64` S `Hardened Softwood`
- `server/src/hardenedwood.js:65` S `Hardened Hardwood`
- `server/src/hardenedwood.js:66` S `Hardened Cedar Wood`
- `server/src/hardenedwood.js:67` S `Hardened Maple Wood`

### server: hidden (5)

- `server/src/hidden.js:237` S `the settings could not be read; try again`
- `server/src/hidden.js:240` S `stored by a newer worker; not written over`
- `server/src/hidden.js:250` S `unknown setting`
- `server/src/hidden.js:264` S `unknown setting`
- `server/src/hidden.js:272` S `GET, POST or DELETE`

### server: inbox (2)

- `server/src/inbox.js:617` S `merged payouts`
- `server/src/inbox.js:627` S `merged payouts`

### server: index (2)

- `server/src/index.js:355` S `no such room`
- `server/src/index.js:5305` S `Shop unavailable`

### server: killroll (2)

- `server/src/killroll.js:165` S `next: a roll of 1 to`
- `server/src/killroll.js:172` S `no such live monster in your zone`

### server: leaderboard (1)

- `server/src/leaderboard.js:147` S `Not found`

### server: liveops (6)

- `server/src/liveops.js:478` S `cursor: the 'next' an earlier page of /economy gave.`
- `server/src/liveops.js:624` S `flag name must match`
- `server/src/liveops.js:624` S `or be one of`
- `server/src/liveops.js:627` S `value must be a boolean or finite number`
- `server/src/liveops.js:634` S `flag budget exhausted (`
- `server/src/liveops.js:673` S `text required`

### server: loginspin (2)

- `server/src/loginspin.js:142` S `Free daily spin`
- `server/src/loginspin.js:149` S `Free daily spin`

### server: market (24)

- `server/src/market.js:332` S `Not authorized`
- `server/src/market.js:346` S `Not authorized`
- `server/src/market.js:353` S `Not found`
- `server/src/market.js:387` S `Missing fields`
- `server/src/market.js:397` S `Invalid price`
- `server/src/market.js:398` S `Invalid type`
- `server/src/market.js:412` S `Missing fields`
- `server/src/market.js:416` S `Invalid element`
- `server/src/market.js:420` S `Not in game`
- `server/src/market.js:424` S `Not while you are fighting a player`
- `server/src/market.js:427` S `Max 10 orders`
- `server/src/market.js:435` S `Item not in stash`
- `server/src/market.js:438` S `Item not in stash`
- `server/src/market.js:465` S `Not enough gold`
- `server/src/market.js:577` S `price improvement`
- `server/src/market.js:625` S `listing failed`
- `server/src/market.js:637` S `listing failed`
- `server/src/market.js:643` S `Missing params`
- `server/src/market.js:645` S `Not found`
- `server/src/market.js:646` S `Not yours`
- `server/src/market.js:653` S `Not found`
- `server/src/market.js:811` S `price improvement`
- `server/src/market.js:817` S `order returned`
- `server/src/market.js:818` S `order returned`

### server: marketplace (9)

- `server/src/marketplace.js:126` S `Not found`
- `server/src/marketplace.js:152` S `Missing fields`
- `server/src/marketplace.js:153` S `Invalid price`
- `server/src/marketplace.js:154` S `Invalid type`
- `server/src/marketplace.js:155` S `Sell needs item`
- `server/src/marketplace.js:159` S `Max 10 orders`
- `server/src/marketplace.js:199` S `Missing params`
- `server/src/marketplace.js:201` S `Not found`
- `server/src/marketplace.js:203` S `Not yours`

### server: migrations (1)

- `server/src/migrations.js:627` S `Pine Shield`

### server: origin (1)

- `server/src/origin.js:115` S `not the official site`

### server: playerrestore (7)

- `server/src/playerrestore.js:335` S `dry is true or false`
- `server/src/playerrestore.js:337` S `playerId + a matching snapKey required`
- `server/src/playerrestore.js:340` S `player online -- kick first`
- `server/src/playerrestore.js:343` S `player still in the world (a body left in a fight stays up to 20 seconds) -- wait 20 se...`
- `server/src/playerrestore.js:360` S `A newer worker wrote`
- `server/src/playerrestore.js:371` S `The vault would change with no character to book it on: restore a copy that holds the c...`
- `server/src/playerrestore.js:378` S `Nothing written: this is what the restore would do.`

### server: playerroads (14)

- `server/src/playerroads.js:103` S `the trade window: both sides staged, both confirmed, swapped in one write (weapons stag...`
- `server/src/playerroads.js:109` S `the old one-way gift: the sender stages, the other accepts, nothing comes back`
- `server/src/playerroads.js:115` S `No man's land: a player killed under its rule loses the purse and the spare weapons (a ...`
- `server/src/playerroads.js:125` S `the General Store's order book: a buy order's gold and a sell order's weapon rest in 'm...`
- `server/src/playerroads.js:134` S `the Auction House, bought now: the seller's goods held in 'store_listing:', the buyer's...`
- `server/src/playerroads.js:143` S `the Auction House, a bid won: the bid's gold held on the listing until it wins (or is r...`
- `server/src/playerroads.js:152` S `the Auction House, an offer taken: the offer's gold held on the listing until the selle...`
- `server/src/playerroads.js:160` S `a duel's wagers: both held in 'duelEscrow:' in one write, the pot paid to the winner ('...`
- `server/src/playerroads.js:167` S `the Gladiator Arena's entry fees: held in 'arena_entry:', paid to the champion with the...`
- `server/src/playerroads.js:176` S `the arena's sponsorship stakes: held in 'arena_stake:', paid as the fighter's cut, the ...`
- `server/src/playerroads.js:183` S `the threat's levy: a threatener the guards were called on is fined 10%, held on their h...`
- `server/src/playerroads.js:190` S `the weekly jackpot: every ticket's gold pooled in 'jackpot:draw', the pool paid to one ...`
- `server/src/playerroads.js:197` S `a pile on the ground: a death's bag ('death_pile:') or a dropped stack, taken by whoeve...`
- `server/src/playerroads.js:204` S `Diego's pile ('shop_stock', the room's): what one player sells him, the next buys from him`

### server: power (6)

- `server/src/power.js:117` S `Black Steel Great Sword`
- `server/src/power.js:118` S `Hardwood Bow`
- `server/src/power.js:119` S `Hardwood Staff`
- `server/src/power.js:120` S `Black Steel Torso`
- `server/src/power.js:121` S `Black Steel Greaves`
- `server/src/power.js:122` S `Pine Shield`

### server: publicreads (1)

- `server/src/publicreads.js:84` S `Too many requests`

### server: quests (1)

- `server/src/quests.js:624` S `quest reward (weapon stash was full)`

### server: reqonce (1)

- `server/src/reqonce.js:172` S `Interrupted -- check your orders`

### server: restore (34)

- `server/src/restore.js:94` S `The room's way back is off: set 'roomrewind: true' in the live flags to use it (and bac...`
- `server/src/restore.js:116` S `The whole room as it was at`
- `server/src/restore.js:116` S `: every character, vault, mail, listing, order and pile on the ground.`
- `server/src/restore.js:119` S `Everything written after`
- `server/src/restore.js:119` S `: every save, trade, purchase and reward since, for everyone.`
- `server/src/restore.js:120` S `player(s) in the room now are disconnected and come back to that time:`
- `server/src/restore.js:120` S `Nobody is in the room now.`
- `server/src/restore.js:173` S `These go back too, being in the same storage: the live flags, the freezes, the login ke...`
- `server/src/restore.js:174` S `The flags now:`
- `server/src/restore.js:174` S `. Frozen now:`
- `server/src/restore.js:176` S `a login key handed out or a device admitted since is refused (give that character a new...`
- `server/src/restore.js:178` S `What you did to logins since that time comes undone too (do it again after):`
- `server/src/restore.js:179` S `You did nothing to logins since that time (no key taken back, device forgotten or silen...`
- `server/src/restore.js:189` S `bookmark: the one an earlier answer gave`
- `server/src/restore.js:193` S `say when: minutesAgo, at (ms), or bookmark`
- `server/src/restore.js:194` S `when: a number`
- `server/src/restore.js:195` S `when: a time before now`
- `server/src/restore.js:196` S `when: within the last 30 days`
- `server/src/restore.js:222` S `This storage keeps no earlier times.`
- `server/src/restore.js:229` S `The storage could not give an earlier time:`
- `server/src/restore.js:231` S `The storage gave no bookmark.`
- `server/src/restore.js:243` S `A dry run: nothing has changed. It would RESTORE`
- `server/src/restore.js:243` S `It would LOSE`
- `server/src/restore.js:245` S `It would close`
- `server/src/restore.js:245` S `connection(s) and restart the room. Keep 'now': the plan run again with {bookmark: now}...`
- `server/src/restore.js:246` S `To go ahead, send {step: "do", token, confirm: "`
- `server/src/restore.js:257` S `No plan with that token: make the plan first.`
- `server/src/restore.js:260` S `Nothing done. Type the time back exactly as the plan wrote it: confirm: "`
- `server/src/restore.js:262` S `That plan is too old: make it again.`
- `server/src/restore.js:287` S `The storage refused the restore:`
- `server/src/restore.js:287` S `. Nothing was put back; the players reconnect into the room as it is.`
- `server/src/restore.js:290` S `Done. RESTORED:`
- `server/src/restore.js:290` S `The room restarts now.`
- `server/src/restore.js:291` S `KEEP 'undo': the plan run again with {bookmark: undo} puts back everything up to this m...`

### server: revealbag (4)

- `server/src/revealbag.js:389` S `grade: rare, elite or godly`
- `server/src/revealbag.js:398` S `no blade`
- `server/src/revealbag.js:401` S `weapon bag full`
- `server/src/revealbag.js:407` S `give: armor, legsArmor or weapon`

### server: risechest (2)

- `server/src/risechest.js:136` S `The chest on`
- `server/src/risechest.js:136` S `the ledge`

### server: salvage (1)

- `server/src/salvage.js:89` S `Black Steel`

### server: shop (26)

- `server/src/shop.js:573` S `Bad request`
- `server/src/shop.js:575` S `Bad quantity`
- `server/src/shop.js:625` S `Bad request`
- `server/src/shop.js:631` S `Not now`
- `server/src/shop.js:637` S `He only sells those`
- `server/src/shop.js:642` S `He doesn't buy food or drink`
- `server/src/shop.js:644` S `Not while you are fighting a player`
- `server/src/shop.js:646` S `Bad quantity`
- `server/src/shop.js:649` S `You don't have that many`
- `server/src/shop.js:651` S `He doesn't deal in those`
- `server/src/shop.js:666` S `He's full of those`
- `server/src/shop.js:676` S `You don't have that many`
- `server/src/shop.js:705` S `Bad request`
- `server/src/shop.js:706` S `Not now`
- `server/src/shop.js:708` S `Bad quantity`
- `server/src/shop.js:714` S `You already have one`
- `server/src/shop.js:715` S `Mayor Bro's quest gives you your first one`
- `server/src/shop.js:716` S `He hasn't got any`
- `server/src/shop.js:719` S `Not enough coins`
- `server/src/shop.js:756` S `He hasn't got any`
- `server/src/shop.js:760` S `Not enough coins`
- `server/src/shop.js:776` S `He doesn't sell tonics any more`
- `server/src/shop.js:777` S `He hasn't got any`
- `server/src/shop.js:779` S `He doesn't deal in those`
- `server/src/shop.js:782` S `He hasn't got any`
- `server/src/shop.js:787` S `Not enough coins`

### server: silence (7)

- `server/src/silence.js:166` S `You can't`
- `server/src/silence.js:166` S `give names others read`
- `server/src/silence.js:166` S `right now: the owner has silenced this character`
- `server/src/silence.js:329` S `playerId required`
- `server/src/silence.js:334` S `minutes: a whole number from 1 to`
- `server/src/silence.js:334` S `, or left out for until lifted`
- `server/src/silence.js:348` S `id required`

### server: skillpoints (2)

- `server/src/skillpoints.js:154` S `the join adopts the stored block, sanitized (the record IS the character while away), o...`
- `server/src/skillpoints.js:155` S `a stored record with no block gets one from its legacy tracks, once`

### server: spar (13)

- `server/src/spar.js:209` S `Sword Clone`
- `server/src/spar.js:210` S `Bow Clone`
- `server/src/spar.js:211` S `Staff Clone`
- `server/src/spar.js:285` S `sparring is switched off (live flag spar: false)`
- `server/src/spar.js:294` S `unknown skill:`
- `server/src/spar.js:301` S `unknown weapon:`
- `server/src/spar.js:302` S `stand in the world first (not a dungeon or the farm)`
- `server/src/spar.js:303` S `you are down -- try again once you are back up`
- `server/src/spar.js:311` S `at most`
- `server/src/spar.js:311` S `clones at once -- clear them first`
- `server/src/spar.js:445` S `Copper Great Sword`
- `server/src/spar.js:445` S `Pine Bow`
- `server/src/spar.js:445` S `Pine Staff`

### server: store (50)

- `server/src/store.js:609` S `Not authorized`
- `server/src/store.js:655` S `Not while you are fighting a player`
- `server/src/store.js:660` S `Not found`
- `server/src/store.js:671` S `Not found`
- `server/src/store.js:722` S `Not while you are fighting a player`
- `server/src/store.js:731` S `Missing fields`
- `server/src/store.js:737` S `Invalid price`
- `server/src/store.js:746` S `Invalid kind`
- `server/src/store.js:748` S `Gear cannot be listed right now`
- `server/src/store.js:752` S `Not in game`
- `server/src/store.js:754` S `Not while you are fighting a player`
- `server/src/store.js:758` S `Store is full`
- `server/src/store.js:773` S `Invalid item`
- `server/src/store.js:776` S `Invalid quantity`
- `server/src/store.js:790` S `You do not have that`
- `server/src/store.js:796` S `You do not have that`
- `server/src/store.js:809` S `Item not in stash`
- `server/src/store.js:813` S `Item not in stash`
- `server/src/store.js:858` S `That pet cannot be sold (`
- `server/src/store.js:860` S `That pet cannot be sold (no-pet)`
- `server/src/store.js:926` S `listing failed`
- `server/src/store.js:944` S `That listing is gone`
- `server/src/store.js:945` S `Someone is buying that right now`
- `server/src/store.js:946` S `That listing is being taken down`
- `server/src/store.js:947` S `That is your own listing`
- `server/src/store.js:949` S `Not in game`
- `server/src/store.js:950` S `Not enough gold`
- `server/src/store.js:975` S `Not enough gold`
- `server/src/store.js:987` S `Not enough gold`
- `server/src/store.js:1012` S `That listing is gone`
- `server/src/store.js:1013` S `Someone is buying that right now`
- `server/src/store.js:1014` S `That listing is being taken down`
- `server/src/store.js:1015` S `That is your own listing`
- `server/src/store.js:1017` S `Invalid bid`
- `server/src/store.js:1020` S `Bid at least`
- `server/src/store.js:1022` S `Not in game`
- `server/src/store.js:1023` S `Not enough gold`
- `server/src/store.js:1033` S `Not enough gold`
- `server/src/store.js:1047` S `outbid on`
- `server/src/store.js:1064` S `That listing is gone`
- `server/src/store.js:1065` S `Not yours`
- `server/src/store.js:1066` S `Someone is buying that right now`
- `server/src/store.js:1067` S `That listing is being taken down`
- `server/src/store.js:1068` S `No bids yet`
- `server/src/store.js:1108` S `bid returned on`
- `server/src/store.js:1165` S `bid returned on`
- `server/src/store.js:1189` S `Missing params`
- `server/src/store.js:1191` S `That listing is gone`
- `server/src/store.js:1192` S `Not yours`
- `server/src/store.js:1193` S `Someone is buying that right now`

### server: storeoffer (21)

- `server/src/storeoffer.js:142` S `That listing has ended`
- `server/src/storeoffer.js:143` S `That is your own listing`
- `server/src/storeoffer.js:144` S `That listing is being sold`
- `server/src/storeoffer.js:146` S `Offer a whole number of gold`
- `server/src/storeoffer.js:147` S `Slow down a moment`
- `server/src/storeoffer.js:152` S `This listing already has as many offers as it can hold`
- `server/src/storeoffer.js:163` S `offer replaced on`
- `server/src/storeoffer.js:179` S `Not enough gold`
- `server/src/storeoffer.js:220` S `Not in game`
- `server/src/storeoffer.js:226` S `Not enough gold`
- `server/src/storeoffer.js:243` S `offer replaced on`
- `server/src/storeoffer.js:291` S `That listing has ended`
- `server/src/storeoffer.js:293` S `You have no offer on that`
- `server/src/storeoffer.js:310` S `That listing has ended`
- `server/src/storeoffer.js:311` S `That is not your listing`
- `server/src/storeoffer.js:312` S `Unknown reply`
- `server/src/storeoffer.js:313` S `That listing is being sold`
- `server/src/storeoffer.js:323` S `Someone is buying that right now`
- `server/src/storeoffer.js:328` S `No offer to answer`
- `server/src/storeoffer.js:355` S `No offer to answer`
- `server/src/storeoffer.js:447` S `Not while you are down`

### server: testmode (2)

- `server/src/testmode.js:200` S `playerId required`
- `server/src/testmode.js:255` S `could not read the list`

### server: threat (1)

- `server/src/threat.js:220` S `bounty claimed`

### server: trade2 (5)

- `server/src/trade2.js:766` S `unstaged from trade`
- `server/src/trade2.js:795` S `trade cancelled`
- `server/src/trade2.js:801` S `trade cancelled`
- `server/src/trade2.js:863` S `trade voided (server restart)`
- `server/src/trade2.js:869` S `trade voided (server restart)`

### server: wheeldungeon (3)

- `server/src/wheeldungeon.js:153` S `This way is closed for now`
- `server/src/wheeldungeon.js:156` S `There is no way in here`
- `server/src/wheeldungeon.js:159` S `Walk up to its mouth first`

### server: wheelfaces (4)

- `server/src/wheelfaces.js:10` S `the Lagoon Terrace`
- `server/src/wheelfaces.js:11` S `the Lagoon Ledge`
- `server/src/wheelfaces.js:12` S `the Town Bluff`
- `server/src/wheelfaces.js:13` S `the Bluff's Ledge`

### server: wheelspawns (4)

- `server/src/wheelspawns.js:195` S `the Buried City`
- `server/src/wheelspawns.js:196` S `the Great Cave`
- `server/src/wheelspawns.js:197` S `the Foundry Dome`
- `server/src/wheelspawns.js:198` S `the Goo Grotto`

### server: wheelspawns1 (4)

- `server/src/wheelspawns1.js:195` S `the Buried City`
- `server/src/wheelspawns1.js:196` S `the Great Cave`
- `server/src/wheelspawns1.js:197` S `the Foundry Dome`
- `server/src/wheelspawns1.js:198` S `the Goo Grotto`

### skillsModel (30)

- `src/ui/mobile/sheet/skillsModel.js:66` P `Woodcutting`
- `src/ui/mobile/sheet/skillsModel.js:66` P? `Frost Ridge`
- `src/ui/mobile/sheet/skillsModel.js:66` P? `Node extraction opens 0.25s sooner per level above its tier`
- `src/ui/mobile/sheet/skillsModel.js:66` P? `Chop trees in the wild — higher-level trees give more XP.`
- `src/ui/mobile/sheet/skillsModel.js:67` P `Fishing`
- `src/ui/mobile/sheet/skillsModel.js:67` P? `Starting Meadow`
- `src/ui/mobile/sheet/skillsModel.js:67` P? `Node extraction opens 0.25s sooner per level above its tier`
- `src/ui/mobile/sheet/skillsModel.js:67` P? `Cast at fishing spots and win the reel minigame.`
- `src/ui/mobile/sheet/skillsModel.js:68` P `Mining`
- `src/ui/mobile/sheet/skillsModel.js:68` P? `Stone Hollows`
- `src/ui/mobile/sheet/skillsModel.js:68` P? `Node extraction opens 0.25s sooner per level above its tier`
- `src/ui/mobile/sheet/skillsModel.js:68` P? `Break ore veins — deeper zones hold richer ore.`
- `src/ui/mobile/sheet/skillsModel.js:69` P `Farming`
- `src/ui/mobile/sheet/skillsModel.js:69` P? `Your farm plots`
- `src/ui/mobile/sheet/skillsModel.js:69` P? `Plant, tend and harvest crops on your plot.`
- `src/ui/mobile/sheet/skillsModel.js:70` P `Trapping`
- `src/ui/mobile/sheet/skillsModel.js:70` P? `Out in the lands`
- `src/ui/mobile/sheet/skillsModel.js:70` P? `Make box traps at the Woodworker, tap TRAP on a monster, then kill it. Every try pays X...`
- `src/ui/mobile/sheet/skillsModel.js:71` P `Cooking`
- `src/ui/mobile/sheet/skillsModel.js:71` P? `Cook raw food at a campfire — perfect timing pays.`
- `src/ui/mobile/sheet/skillsModel.js:71` P? `Cook timing window +{…}%`
- `src/ui/mobile/sheet/skillsModel.js:72` P `Smithing`
- `src/ui/mobile/sheet/skillsModel.js:72` P? `Smelt ore and forge gear at the blacksmith.`
- `src/ui/mobile/sheet/skillsModel.js:73` P `Woodworking`
- `src/ui/mobile/sheet/skillsModel.js:73` P? `Turn lumber into planks, handles and furniture.`
- `src/ui/mobile/sheet/skillsModel.js:78` P `Gem Cutting`
- `src/ui/mobile/sheet/skillsModel.js:78` P? `% a shard`
- `src/ui/mobile/sheet/skillsModel.js:78` P? `Crack shards for raw gems at the Gem Works, and combine three into a gem.`
- `src/ui/mobile/sheet/skillsModel.js:79` P `Enchanting`
- `src/ui/mobile/sheet/skillsModel.js:79` P? `Set gems into your gear at the Gem Works. A gem you made pays 400 XP.`

### slimePins (1)

- `src/ui/mobile/sheet/slimePins.js:156` P? `sdpin-{…}-{…}-{…} {…} step-end {…}`

### starCue (3)

- `src/ui/starCue.js:42` P? `<svg viewBox="-12 -12 24 24" width="100%" height="100%" aria-hidden="true">`
- `src/ui/starCue.js:43` P? `<path d="M0 -11 L3.2 -3.6 L11 -3.4 L4.9 1.6 L7 9.4 L0 5 L-7 9.4 L-4.9 1.6 L-11 -3.4 L-3...`
- `src/ui/starCue.js:90` P? `transform, opacity`

### statSim (26)

- `src/ui/mobile/sheet/statSim.js:420` P `Dodged!`
- `src/ui/mobile/sheet/statSim.js:674` P `Out of mana`
- `src/ui/mobile/sheet/statSim.js:698` P `Short!`
- `src/ui/mobile/sheet/statSim.js:718` P `Dodged!`
- `src/ui/mobile/sheet/statSim.js:797` P `Blocked!`
- `src/ui/mobile/sheet/statSim.js:799` P `Blocked!`
- `src/ui/mobile/sheet/statSim.js:884` P? `a melee weapon`
- `src/ui/mobile/sheet/statSim.js:884` P? `a bow`
- `src/ui/mobile/sheet/statSim.js:884` P? `a staff`
- `src/ui/mobile/sheet/statSim.js:925` P? `a weapon`
- `src/ui/mobile/sheet/statSim.js:925` P? `to see`
- `src/ui/mobile/sheet/statSim.js:928` P? `this fight`
- `src/ui/mobile/sheet/statSim.js:935` P `This weapon has no element, so Element has nothing to power yet.`
- `src/ui/mobile/sheet/statSim.js:936` P `does no damage over time. Element only powers combos with it.`
- `src/ui/mobile/sheet/statSim.js:948` P `Slime down in`
- `src/ui/mobile/sheet/statSim.js:954` P? `its special`
- `src/ui/mobile/sheet/statSim.js:959` P `Special hits for (avg)`
- `src/ui/mobile/sheet/statSim.js:965` P? `its reach`
- `src/ui/mobile/sheet/statSim.js:985` P `Slime hits to drop you`
- `src/ui/mobile/sheet/statSim.js:996` P `Guard holds vs. a slime`
- `src/ui/mobile/sheet/statSim.js:997` P `Dodge rolls on a full bar`
- `src/ui/mobile/sheet/statSim.js:1009` P? `its specials`
- `src/ui/mobile/sheet/statSim.js:1010` P `Max MP`
- `src/ui/mobile/sheet/statSim.js:1011` P `Specials on a full bar`
- `src/ui/mobile/sheet/statSim.js:1018` P `Blue slime burst`
- `src/ui/mobile/sheet/statSim.js:1025` P `Cross the meadow`

### storeApi (3)

- `src/ui/storeApi.js:147` P `No answer from the store`
- `src/ui/storeApi.js:155` P `No answer from the store`
- `src/ui/storeApi.js:195` P `No answer from the store`

### storeChatBus (8)

- `src/ui/mobile/storeChatBus.js:60` P `That listing has ended.`
- `src/ui/mobile/storeChatBus.js:98` P `Sold.`
- `src/ui/mobile/storeChatBus.js:104` P `The store could not take that offer.`
- `src/ui/mobile/storeChatBus.js:111` P? `Slow down a moment.`
- `src/ui/mobile/storeChatBus.js:112` P? `That listing has ended.`
- `src/ui/mobile/storeChatBus.js:113` P? `No conversation to reply to yet.`
- `src/ui/mobile/storeChatBus.js:114` P? `This listing already has as many conversations as it can hold.`
- `src/ui/mobile/storeChatBus.js:116` P `The store could not send that.`

### uiSfxDelegate (1)

- `src/ui/uiSfxDelegate.js:93` P? `button, [role="button"]`

### zoneTitle (1)

- `src/ui/mobile/zoneTitle.js:43` P `Town`

