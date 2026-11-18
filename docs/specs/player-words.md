# Every word a player reads, in one table (v2.3.6142)

GRAND-PLAN 8.8, part 2; card WD PR 3. **A plan only: no code moves here.**
A later card moves the words, once `src/ui/BroTown.jsx` and the two
renderers are free (part 11's "never side by side").

## What exists today

- **The count**: `docs/plan/census/words.md`, made by
  `node tools/dev/words-census.mjs --write` (card WD PR 1). On main,
  2026-11-18: 7486 player-facing strings. 2164 are already in a table
  (`src/data/*`, `deskWords()`), 4941 are written in place on the page, and
  381 are written in place on the worker. 2990 of all of them are `?`
  (unclear, counted). 446 screens. (Re-measured at 06:40 UTC after the
  day's merges: 4953 and 384, the guard's lines; the screens below are the
  first count's.)
- **The guard**: `tools/guards/player-words.test.mjs` (card WD PR 2). The two
  in-place counts may only fall (`PAGE_LINE`, `SERVER_LINE`), and a new
  player-facing "Wheel" or "remnant" always fails.
- **The words rule** (`docs/specs/words-rule.md`, v2.3.5197): the game's
  sentences that hold a PLAYER's words go out as a template and its parts
  (`server/src/words.js` `WORDS`, mirrored by `src/data/words.js`
  `fillWords`). The table below is built the same way and keeps that rule:
  a part is put in as text, never read as a sentence.
- **`deskWords()`** (`src/game/deskWords.js`): "tap" is said "click" under a
  mouse, at the place the words are drawn.

## The table

### Its files

- **`src/data/say/<screen>.js`**, one leaf file a screen, no imports:

  ```js
  /* v2.3.N: the Smithy's words (docs/specs/player-words.md) */
  export const SAY = Object.freeze({
    'smithy.title': 'Blacksmith',
    'smithy.forge': 'Forge {item} for {price}',
    'smithy.noGold': { phone: 'Not enough gold. Tap Bank to fetch some.',
                       desk: 'Not enough gold. Press B for the Bank.' },
    'smithy.left': { one: '{n} more to forge', other: '{n} more to forge' },
  });
  ```

  It is ONE table: every key starts with its screen's name, and a guard
  fails a key that two files define. It is split into one file a screen
  so that a screen loaded on demand (`lazyPanels.js`) keeps its words in
  its own chunk. The words are already in the bundle today, so moving them
  adds no memory (CLAUDE.md §7: no new art, sound or canvas).
- **`src/game/say.js`**, the one reader. It has no imports apart from
  `deskWords.js`, so node can test it:
  - `say(SAY, key, parts)` returns the words. A `{name}` is filled from
    `parts`, each part put in as text (the words rule's `fillWords` form).
    A missing key returns the key itself, so a fault is seen on screen and
    never shown as an empty button.
  - A plain row goes through `deskWords()`, so its "tap" reads "click" on a
    computer. This fixes the census's 96 "tap" rows as they move, with no
    word written twice.
  - A `{ phone, desk }` row is for wording that differs by more than
    tap/click (a key to press, "swipe"). The device is read through
    `src/game/deviceProfile.js`, never written again (CLAUDE.md §7).
  - A `{ one, other }` row chooses by `parts.n`.

### Key naming

`<screen>.<what>`, both in lower camel case (`smithy.forgeButton`,
`tradeWindow.bigGoldWarn`). `<screen>` is the census's screen name in lower
camel case: `SmithyPanel` becomes `smithy`, `game: questJournal` becomes
`questJournal`. Two panels that share a name (the mobile dash's and the old
`panels/` copy) share a file. `<what>` says what the words are FOR, never
what they say, so a reworded line keeps its key and its tests.

### How a screen reads it

```js
import { SAY } from '../../data/say/smithy.js';
import { say } from '../../game/say.js';
...
<button title={say(SAY, 'smithy.forgeTitle')}>{say(SAY, 'smithy.forge', { item, price })}</button>
```

A Pixi `Text` reads it the same way (`new Text(say(SAY, 'race.go'), style)`).
A toast, a chat line or a popup reads it at the place it is made.

### The worker's words

The worker's 381 in-place words are mostly refusals (`error: 'Not enough
coins'`) and notes. They move by the words rule's road, so either side can
ship first (CLAUDE.md §5):

1. Each refusal gains a code beside its words (`{ error: 'Not enough
   coins', code: 'shop.noGold' }`). Many already carry one (`reason:`).
2. The page's table gets a row for each code (`src/data/say/refuse.js`,
   key `refuse.<system>.<code>`), and the page shows that row when it knows
   the code. Otherwise it shows the worker's own words, as an older table
   does today.
3. A mirror guard (beside `server/test/words-rule.test.mjs`) fails a code
   the worker sends that has no row in the page's table.
4. The worker keeps its English for older phones. It is never deleted
   while a phone that reads it may still play.
5. A server change deploys, so these PRs go as one batch (TRAPS §277). The
   page's use of the codes is gated on a new cap (`saywords`, in
   `CAP_GATES`), with a lower-case kill switch of the same name
   (`liveops.js`).

A sentence that holds a player's words stays on the words rule's
`{ t, p }` road, in `server/src/words.js`.

### What stays where it is

- **`src/data/*`** is already a table: the townsfolk's lines, the quests,
  item and monster names, the town board (2164 strings). These are the
  game's content, not its interface, and they stay in place. `say()` is for
  the interface's words. Their "tap" rows (21) are already swapped by
  `deskWords()` where they are drawn, or are swapped as each screen moves.
- **A look catalog's names** (`src/rendering/traits/*Catalog.js`: "Stripes",
  "Thug Life") are a table in all but folder. The census learns them as one
  (a row in its `TABLE_FILES`) instead of moving them, so the count falls
  honestly.

## How the guard tracks the move

- **The census learns the table.** A string in `src/data/say/*` is `table`,
  and a `say(` call is a speaking call. That is one line in
  `words-census.mjs` (`isTable`), in the pilot PR.
- **Each move PR says its new count.** It runs
  `node tools/dev/words-census.mjs --lines` and gives the old and new
  counts in its words. The gatekeeper lowers `PAGE_LINE` and `SERVER_LINE`
  to match at its sitting (rule 3: a census only falls, and only the
  gatekeeper makes it strict).
- **A `?` row is judged as its screen moves.** It either moves into the
  table or is listed as not shown (`NOT_SHOWN` in the census: file and
  words, a reason each). It is never renamed away: a number met by renaming
  is not met (rule 8).
- **A screen once moved is strict.** The guard gains `MOVED`, a list of the
  screens with nothing left in place. One new in-place word in a screen on
  that list always fails, whatever the totals say.
- **The finish line** is `PAGE_LINE` 0 and `SERVER_LINE` 0, with `stays`
  screens and catalogs counted as tables. The guard then fails any new
  in-place word, and the census's `place` column is removed.

## The order of moves

Each move is one screen a PR, or a few small screens together, never two
waves at once. The screen's tests that read its words by their text
(`tools/qa/mp/*`, `server/test/*`, a UI review's `states.mjs` row) are named
in the PR and kept word for word. **What a player reads does not change**,
apart from "tap" becoming "click" on a computer, which is CLAUDE.md §7's
rule. Every PR runs `node tools/dev/words-census.mjs --lines`, gives the new
count in its words, and runs `node tools/qa/ui-review/capture.mjs` on the screen
it moved (a sample).

- **W0, the pilot (one PR).** `src/game/say.js` and its node test,
  `src/data/say/clanInvite.js`, the census's `isTable` line, and the move of
  `ClanInviteCard` (5 words, `src/ui/panels/ClanInviteCard.jsx`). This proves
  the shape before anything big moves.
- **W1, the windows** (`src/ui/**/*.jsx`, BroTown.jsx aside): 144 screens,
  largest first. These are the panels a player opens. A screen moves only
  when no running card holds its file.
- **W2, the screens' helpers** (`src/ui/**/*.js` and screens split over
  `.js` and `.jsx`: the guide arrow, the info glossary, the device and
  linger screens, the sheet's models): 33 screens.
- **W3, the game's rules and the socket** (`src/game/*`, `src/networking/*`,
  `src/lib/*`): toasts, chat and system lines, refusals the page writes for
  a worker's code. 104 screens. `gameEvents.js` and `wsClient.js` move only
  when no running card holds them.
- **W4, the drawing** (`src/rendering/**`, the renderers aside): Pixi
  `Text`s and labels. The look catalogs go to the census's `TABLE_FILES` as
  above. 60 screens.
- **W5, the big files, last**: `src/ui/BroTown.jsx`, `entityRenderer.js`,
  `effectsRenderer.js`. Each waits until every card that holds it is `done`
  (card M's split moves their code: these move AFTER the split, one system
  a PR, alongside it, never side by side).
- **W6, the worker's refusals** (`server/src/*`): 62 screens in one
  batched set of server PRs (above: codes, `refuse.js`, the mirror guard,
  the `saywords` cap and switch).
- **stays**: the 40 `data:` screens are already a table. Nothing moves.

### Every screen, by wave

`in place` counts the page's and the worker's in-place words; `?` the
unclear ones among them. The counts are from 2026-11-18's census (a moving
PR reads its own from `--lines`).

#### W1 (144 screens, 2899 in place)

| # | screen | in place | ? | files it touches |
|---|---|---|---|---|
| 1 | ItemDetailPopup | 129 | 29 | `src/ui/mobile/dash/ItemDetailPopup.jsx` |
| 2 | PlayerPaint | 102 | 20 | `src/ui/panels/PlayerPaint.jsx` |
| 3 | TradeWindowPanel | 87 | 11 | `src/ui/panels/TradeWindowPanel.jsx` |
| 4 | SkillsPanel | 78 | 47 | `src/ui/mobile/dash/SkillsPanel.jsx`, `src/ui/panels/SkillsPanel.jsx` |
| 5 | HeroExpanded | 76 | 22 | `src/ui/mobile/sheet/HeroExpanded.jsx` |
| 6 | MonsterCodex | 70 | 15 | `src/ui/mobile/dash/MonsterCodex.jsx` |
| 7 | LeaderboardPanel | 68 | 23 | `src/ui/mobile/dash/LeaderboardPanel.jsx`, `src/ui/panels/LeaderboardPanel.jsx` |
| 8 | SmithyPanel | 63 | 8 | `src/ui/panels/buildings/SmithyPanel.jsx` |
| 9 | ClanPanel | 56 | 37 | `src/ui/mobile/dash/ClanPanel.jsx`, `src/ui/panels/ClanPanel.jsx` |
| 10 | PetsPanel | 56 | 0 | `src/ui/mobile/dash/PetsPanel.jsx` |
| 11 | DailySpin | 51 | 3 | `src/ui/panels/buildings/DailySpin.jsx` |
| 12 | GameApp | 51 | 48 | `src/ui/GameApp.jsx` |
| 13 | DailyRewardsWindow | 50 | 11 | `src/ui/mobile/DailyRewardsWindow.jsx` |
| 14 | InventoryPanel | 48 | 30 | `src/ui/mobile/dash/InventoryPanel.jsx`, `src/ui/panels/InventoryPanel.jsx` |
| 15 | QuestCoach | 48 | 8 | `src/ui/mobile/QuestCoach.jsx` |
| 16 | CharacterPicker | 47 | 14 | `src/ui/panels/CharacterPicker.jsx` |
| 17 | PartyPanel | 45 | 44 | `src/ui/panels/buildings/PartyPanel.jsx` |
| 18 | BroCard | 44 | 9 | `src/ui/mobile/sheet/BroCard.jsx` |
| 19 | BottomDashboard | 43 | 5 | `src/ui/mobile/BottomDashboard.jsx` |
| 20 | GearTab | 42 | 17 | `src/ui/mobile/dash/GearTab.jsx` |
| 21 | NameModal | 42 | 12 | `src/ui/panels/NameModal.jsx` |
| 22 | SocialPanel | 42 | 11 | `src/ui/mobile/dash/SocialPanel.jsx`, `src/ui/panels/SocialPanel.jsx` |
| 23 | MorePanel | 40 | 25 | `src/ui/mobile/dash/MorePanel.jsx` |
| 24 | PlayerProfilePanel | 39 | 2 | `src/ui/panels/PlayerProfilePanel.jsx` |
| 25 | AlliancePart | 36 | 1 | `src/ui/panels/buildings/AlliancePart.jsx` |
| 26 | WheelHallPanel | 35 | 18 | `src/ui/panels/buildings/WheelHallPanel.jsx` |
| 27 | WorldMapOverlay | 35 | 4 | `src/ui/WorldMapOverlay.jsx` |
| 28 | FeedSeedPanel | 34 | 3 | `src/ui/panels/buildings/FeedSeedPanel.jsx` |
| 29 | FeedbackPanel | 34 | 9 | `src/ui/mobile/dash/FeedbackPanel.jsx`, `src/ui/panels/FeedbackPanel.jsx` |
| 30 | EnchantPanel | 33 | 25 | `src/ui/panels/buildings/EnchantPanel.jsx` |
| 31 | ShardCrackPanel | 32 | 4 | `src/ui/panels/buildings/ShardCrackPanel.jsx` |
| 32 | EconCard | 31 | 2 | `src/ui/panels/EconCard.jsx` |
| 33 | SettingsPanel | 31 | 1 | `src/ui/mobile/dash/SettingsPanel.jsx` |
| 34 | StoreChatPanel | 31 | 5 | `src/ui/panels/buildings/StoreChatPanel.jsx` |
| 35 | StorePanel | 31 | 12 | `src/ui/panels/buildings/StorePanel.jsx` |
| 36 | AboutPanel | 30 | 0 | `src/ui/mobile/dash/AboutPanel.jsx` |
| 37 | DungeonCreatorPanel | 30 | 29 | `src/ui/panels/DungeonCreatorPanel.jsx` |
| 38 | ExchangePanel | 30 | 29 | `src/ui/panels/buildings/ExchangePanel.jsx` |
| 39 | InspectCard | 30 | 4 | `src/ui/mobile/InspectCard.jsx` |
| 40 | ItemTooltip | 30 | 17 | `src/ui/mobile/ItemTooltip.jsx` |
| 41 | NmlBadge | 29 | 2 | `src/ui/mobile/NmlBadge.jsx` |
| 42 | QuestJournalPage | 28 | 2 | `src/ui/mobile/dash/QuestJournalPage.jsx` |
| 43 | CodexStage | 26 | 0 | `src/ui/mobile/dash/CodexStage.jsx` |
| 44 | LoginSpinWindow | 24 | 0 | `src/ui/mobile/LoginSpinWindow.jsx` |
| 45 | AccountLoginForm | 23 | 9 | `src/ui/account/AccountLoginForm.jsx` |
| 46 | AceFlipPanel | 23 | 20 | `src/ui/panels/AceFlipPanel.jsx` |
| 47 | ControlsTutorial | 23 | 4 | `src/ui/mobile/ControlsTutorial.jsx` |
| 48 | BankPanel | 21 | 15 | `src/ui/panels/buildings/BankPanel.jsx` |
| 49 | WoodworkPanel | 21 | 1 | `src/ui/panels/buildings/WoodworkPanel.jsx` |
| 50 | GuildPanel | 20 | 15 | `src/ui/mobile/dash/GuildPanel.jsx`, `src/ui/panels/GuildPanel.jsx` |
| 51 | controlSkin | 20 | 20 | `src/ui/panels/controlSkin.jsx` |
| 52 | InspectPlayerPanel | 19 | 16 | `src/ui/panels/InspectPlayerPanel.jsx` |
| 53 | InventorySurface | 19 | 8 | `src/ui/mobile/InventorySurface.jsx` |
| 54 | ShopkeeperPanel | 19 | 0 | `src/ui/panels/ShopkeeperPanel.jsx` |
| 55 | questArt | 19 | 19 | `src/ui/panels/questArt.jsx` |
| 56 | KeyboardHintsPanel | 18 | 11 | `src/ui/panels/KeyboardHintsPanel.jsx` |
| 57 | VendorPanel | 18 | 6 | `src/ui/panels/buildings/VendorPanel.jsx` |
| 58 | NmlAskCard | 17 | 3 | `src/ui/mobile/NmlAskCard.jsx` |
| 59 | AchievementsPanel | 16 | 0 | `src/ui/mobile/dash/AchievementsPanel.jsx` |
| 60 | GamblePanel | 16 | 16 | `src/ui/panels/buildings/GamblePanel.jsx` |
| 61 | InfoPanel | 16 | 5 | `src/ui/panels/InfoPanel.jsx` |
| 62 | ZoneHeader | 16 | 3 | `src/ui/mobile/ZoneHeader.jsx` |
| 63 | StatsPanel | 15 | 0 | `src/ui/mobile/dash/StatsPanel.jsx` |
| 64 | T2Panel | 15 | 2 | `src/ui/mobile/dash/T2Panel.jsx` |
| 65 | QuestOfferPanel | 14 | 4 | `src/ui/panels/QuestOfferPanel.jsx` |
| 66 | RaceHud | 14 | 0 | `src/ui/mobile/RaceHud.jsx` |
| 67 | BodyInk | 13 | 0 | `src/ui/panels/BodyInk.jsx` |
| 68 | ChestReveal | 13 | 6 | `src/ui/mobile/ChestReveal.jsx` |
| 69 | EncyclopediaPanel | 13 | 8 | `src/ui/mobile/dash/EncyclopediaPanel.jsx`, `src/ui/panels/EncyclopediaPanel.jsx` |
| 70 | FarmPanel | 13 | 13 | `src/ui/panels/buildings/FarmPanel.jsx` |
| 71 | LoginScreen | 13 | 0 | `src/ui/panels/LoginScreen.jsx` |
| 72 | ElemStatusChips | 12 | 0 | `src/ui/ElemStatusChips.jsx` |
| 73 | SilenceButtons | 12 | 1 | `src/ui/panels/SilenceButtons.jsx` |
| 74 | TownBoardPage | 12 | 0 | `src/ui/panels/buildings/TownBoardPage.jsx` |
| 75 | TrapCatchCard | 12 | 0 | `src/ui/panels/TrapCatchCard.jsx` |
| 76 | CookPanel | 11 | 11 | `src/ui/panels/buildings/CookPanel.jsx` |
| 77 | EquippedTab | 11 | 0 | `src/ui/mobile/EquippedTab.jsx` |
| 78 | RenameRow | 11 | 1 | `src/ui/panels/RenameRow.jsx` |
| 79 | AccountKeyCard | 10 | 0 | `src/ui/account/AccountKeyCard.jsx` |
| 80 | AccountPanel | 10 | 2 | `src/ui/mobile/dash/AccountPanel.jsx` |
| 81 | FishWeighCard | 10 | 0 | `src/ui/panels/FishWeighCard.jsx` |
| 82 | InfoPopup | 10 | 1 | `src/ui/mobile/InfoPopup.jsx` |
| 83 | JourneyPanel | 10 | 5 | `src/ui/mobile/dash/JourneyPanel.jsx` |
| 84 | PinCards | 10 | 2 | `src/ui/PinCards.jsx` |
| 85 | QuestCard | 10 | 0 | `src/ui/QuestCard.jsx` |
| 86 | QuestsPanel | 10 | 0 | `src/ui/mobile/dash/QuestsPanel.jsx` |
| 87 | DesignGallery | 9 | 0 | `src/ui/panels/DesignGallery.jsx` |
| 88 | BandGrip | 8 | 4 | `src/ui/mobile/dash/BandGrip.jsx` |
| 89 | DailyRewardsCard | 8 | 7 | `src/ui/mobile/dash/DailyRewardsCard.jsx` |
| 90 | GemWorksPanel | 8 | 0 | `src/ui/panels/buildings/GemWorksPanel.jsx` |
| 91 | TrapsTab | 8 | 3 | `src/ui/panels/buildings/TrapsTab.jsx` |
| 92 | BoardRow | 7 | 2 | `src/ui/mobile/dash/BoardRow.jsx` |
| 93 | ChatBubble | 7 | 4 | `src/ui/mobile/ChatBubble.jsx` |
| 94 | GemcutPanel | 7 | 7 | `src/ui/panels/buildings/GemcutPanel.jsx` |
| 95 | InstallHint | 7 | 0 | `src/ui/mobile/InstallHint.jsx` |
| 96 | PartyHUD | 7 | 5 | `src/ui/panels/PartyHUD.jsx` |
| 97 | QuestPanel | 7 | 5 | `src/ui/panels/QuestPanel.jsx` |
| 98 | SelfPanel | 7 | 0 | `src/ui/mobile/dash/SelfPanel.jsx` |
| 99 | StatScreenPanel | 7 | 2 | `src/ui/panels/StatScreenPanel.jsx` |
| 100 | ThreatIncomingPanel | 7 | 7 | `src/ui/panels/ThreatIncomingPanel.jsx` |
| 101 | WeaponPill | 7 | 0 | `src/ui/panels/WeaponPill.jsx` |
| 102 | DuelRequestPanel | 6 | 6 | `src/ui/panels/DuelRequestPanel.jsx` |
| 103 | FishBoard | 6 | 0 | `src/ui/mobile/dash/FishBoard.jsx` |
| 104 | SpendPointConfirm | 6 | 0 | `src/ui/mobile/dash/SpendPointConfirm.jsx` |
| 105 | ChatChannelChips | 5 | 4 | `src/ui/mobile/ChatChannelChips.jsx` |
| 106 | ClanInviteCard | 5 | 0 | `src/ui/panels/ClanInviteCard.jsx` |
| 107 | DungeonClearHud | 5 | 1 | `src/ui/mobile/DungeonClearHud.jsx` |
| 108 | MayorGreeting | 5 | 0 | `src/ui/MayorGreeting.jsx` |
| 109 | NotificationsPanel | 5 | 0 | `src/ui/mobile/dash/NotificationsPanel.jsx` |
| 110 | FurniturePanel | 4 | 4 | `src/ui/panels/FurniturePanel.jsx` |
| 111 | HardenedWoodTab | 4 | 0 | `src/ui/panels/buildings/HardenedWoodTab.jsx` |
| 112 | IncomingTradePanel | 4 | 4 | `src/ui/panels/IncomingTradePanel.jsx` |
| 113 | LandOfficePanel | 4 | 4 | `src/ui/panels/buildings/LandOfficePanel.jsx` |
| 114 | NewMonsterCard | 4 | 2 | `src/ui/panels/NewMonsterCard.jsx` |
| 115 | SkillTiles | 4 | 0 | `src/ui/mobile/dash/SkillTiles.jsx` |
| 116 | TradePanel | 4 | 4 | `src/ui/panels/TradePanel.jsx` |
| 117 | WarBanner | 4 | 4 | `src/ui/panels/WarBanner.jsx` |
| 118 | EmotePanel | 3 | 3 | `src/ui/panels/EmotePanel.jsx` |
| 119 | FarmBedPrompt | 3 | 0 | `src/ui/mobile/FarmBedPrompt.jsx` |
| 120 | QuestDetailPanel | 3 | 0 | `src/ui/mobile/dash/QuestDetailPanel.jsx` |
| 121 | SprintButton | 3 | 2 | `src/ui/panels/SprintButton.jsx` |
| 122 | WeaponBar | 3 | 0 | `src/ui/mobile/dash/WeaponBar.jsx` |
| 123 | AchievementBanner | 2 | 0 | `src/ui/panels/AchievementBanner.jsx` |
| 124 | BuildBadge | 2 | 0 | `src/ui/BuildBadge.jsx` |
| 125 | LevelUpBurst | 2 | 0 | `src/ui/LevelUpBurst.jsx` |
| 126 | MapPanel | 2 | 0 | `src/ui/mobile/dash/MapPanel.jsx` |
| 127 | NpcDialogue | 2 | 0 | `src/ui/panels/NpcDialogue.jsx` |
| 128 | PetHousePanel | 2 | 2 | `src/ui/panels/PetHousePanel.jsx` |
| 129 | PlayerListPanel | 2 | 2 | `src/ui/panels/PlayerListPanel.jsx` |
| 130 | RevealOverlay | 2 | 2 | `src/ui/reveal/RevealOverlay.jsx` |
| 131 | RideButton | 2 | 2 | `src/ui/panels/RideButton.jsx` |
| 132 | UpdateBanner | 2 | 2 | `src/ui/panels/UpdateBanner.jsx` |
| 133 | WorldChatFeed | 2 | 1 | `src/ui/mobile/WorldChatFeed.jsx` |
| 134 | XpFlyOverlay | 2 | 0 | `src/ui/XpFlyOverlay.jsx` |
| 135 | CharacterView | 1 | 0 | `src/ui/mobile/sheet/CharacterView.jsx` |
| 136 | ElementBurstButton | 1 | 0 | `src/ui/mobile/ElementBurstButton.jsx` |
| 137 | IntroVideo | 1 | 0 | `src/ui/IntroVideo.jsx` |
| 138 | JumpButton | 1 | 0 | `src/ui/panels/JumpButton.jsx` |
| 139 | QuickEatButton | 1 | 0 | `src/ui/panels/QuickEatButton.jsx` |
| 140 | ShieldButton | 1 | 1 | `src/ui/panels/ShieldButton.jsx` |
| 141 | SpecialButton | 1 | 0 | `src/ui/panels/SpecialButton.jsx` |
| 142 | TownBoard | 1 | 1 | `src/ui/panels/buildings/TownBoard.jsx` |
| 143 | XpTrack | 1 | 1 | `src/ui/mobile/XpTrack.jsx` |
| 144 | ChatPanel | 0 | 0 | `src/ui/panels/ChatPanel.jsx` |

#### W2 (33 screens, 374 in place)

| # | screen | in place | ? | files it touches |
|---|---|---|---|---|
| 1 | infoGlossary | 66 | 0 | `src/ui/mobile/infoGlossary.js` |
| 2 | itemCategory | 30 | 10 | `src/ui/mobile/dash/itemCategory.js` |
| 3 | skillsModel | 30 | 20 | `src/ui/mobile/sheet/skillsModel.js` |
| 4 | heroStatPills | 27 | 20 | `src/ui/mobile/sheet/heroStatPills.js` |
| 5 | statSim | 26 | 9 | `src/ui/mobile/sheet/statSim.js` |
| 6 | equipModel | 21 | 4 | `src/ui/mobile/sheet/equipModel.js` |
| 7 | heroModel | 18 | 12 | `src/ui/mobile/sheet/heroModel.js` |
| 8 | mapGlyphs | 18 | 0 | `src/ui/mapGlyphs.js` |
| 9 | guideArrow | 16 | 16 | `src/ui/guideArrow.js` |
| 10 | RoomFullScreen | 14 | 14 | `src/ui/RoomFullScreen.js` |
| 11 | broStats | 13 | 10 | `src/ui/mobile/sheet/broStats.js` |
| 12 | gearSellReason | 13 | 9 | `src/ui/mobile/dash/gearSellReason.js` |
| 13 | DeviceScreen | 11 | 6 | `src/ui/DeviceScreen.js` |
| 14 | LingerScreen | 9 | 9 | `src/ui/LingerScreen.js` |
| 15 | deskTeach | 9 | 7 | `src/ui/deskTeach.js` |
| 16 | storeChatBus | 8 | 4 | `src/ui/mobile/storeChatBus.js` |
| 17 | playerProfile | 6 | 1 | `src/ui/panels/playerProfile.js` |
| 18 | OriginScreen | 5 | 5 | `src/ui/OriginScreen.js` |
| 19 | bagFilterBus | 4 | 0 | `src/ui/mobile/dash/bagFilterBus.js` |
| 20 | friendsModel | 4 | 4 | `src/ui/mobile/sheet/friendsModel.js` |
| 21 | lazyPanel | 4 | 4 | `src/ui/lazyPanel.js` |
| 22 | equipActions | 3 | 3 | `src/ui/mobile/dash/equipActions.js` |
| 23 | inventoryStyles | 3 | 3 | `src/ui/mobile/inventoryStyles.js` |
| 24 | starCue | 3 | 3 | `src/ui/starCue.js` |
| 25 | storeApi | 3 | 0 | `src/ui/storeApi.js` |
| 26 | gearStats | 2 | 2 | `src/ui/mobile/dash/gearStats.js` |
| 27 | itemActions | 2 | 2 | `src/ui/mobile/dash/itemActions.js` |
| 28 | farmBus | 1 | 0 | `src/ui/mobile/farmBus.js` |
| 29 | gearFlash | 1 | 1 | `src/ui/mobile/gearFlash.js` |
| 30 | questJournalModel | 1 | 0 | `src/ui/mobile/sheet/questJournalModel.js` |
| 31 | slimePins | 1 | 1 | `src/ui/mobile/sheet/slimePins.js` |
| 32 | uiSfxDelegate | 1 | 1 | `src/ui/uiSfxDelegate.js` |
| 33 | zoneTitle | 1 | 0 | `src/ui/mobile/zoneTitle.js` |

#### W3 (104 screens, 1176 in place)

| # | screen | in place | ? | files it touches |
|---|---|---|---|---|
| 1 | networking: gameEvents | 106 | 98 | `src/networking/gameEvents.js` |
| 2 | game: drawLanes | 68 | 44 | `src/game/drawLanes.js` |
| 3 | game: questJournal | 65 | 34 | `src/game/questJournal.js` |
| 4 | networking: wsClient | 64 | 48 | `src/networking/wsClient.js` |
| 5 | game: speedTest | 51 | 41 | `src/game/speedTest.js` |
| 6 | game: trapping | 38 | 4 | `src/game/trapping.js` |
| 7 | game: alliance | 35 | 35 | `src/game/alliance.js` |
| 8 | game: dailyRewards | 34 | 34 | `src/game/dailyRewards.js` |
| 9 | game: econCard | 26 | 20 | `src/game/econCard.js` |
| 10 | game: farmFeedback | 25 | 17 | `src/game/farmFeedback.js` |
| 11 | game: townsfolkReact | 22 | 18 | `src/game/townsfolkReact.js` |
| 12 | game: deathCard | 20 | 15 | `src/game/deathCard.js` |
| 13 | game: mastery | 19 | 7 | `src/game/mastery.js` |
| 14 | game: salvage | 18 | 13 | `src/game/salvage.js` |
| 15 | game: shardCrack | 18 | 10 | `src/game/shardCrack.js` |
| 16 | game: worldTrial | 18 | 17 | `src/game/worldTrial.js` |
| 17 | game: bank | 15 | 11 | `src/game/bank.js` |
| 18 | game: clientOff | 15 | 0 | `src/game/clientOff.js` |
| 19 | networking: broWallet | 15 | 7 | `src/networking/broWallet.js` |
| 20 | game: chat | 14 | 4 | `src/game/chat.js` |
| 21 | game: loadTimes | 14 | 2 | `src/game/loadTimes.js` |
| 22 | game: placeSafety | 14 | 14 | `src/game/placeSafety.js` |
| 23 | game: race | 14 | 14 | `src/game/race.js` |
| 24 | game: weaponGem | 14 | 12 | `src/game/weaponGem.js` |
| 25 | game: emoteMoves | 13 | 0 | `src/game/emoteMoves.js` |
| 26 | game: gesturePose | 13 | 13 | `src/game/gesturePose.js` |
| 27 | game: noMansLand | 13 | 13 | `src/game/noMansLand.js` |
| 28 | game: silenceOwner | 13 | 5 | `src/game/silenceOwner.js` |
| 29 | game: tour | 13 | 11 | `src/game/tour.js` |
| 30 | game: zoneTransitions | 13 | 7 | `src/game/zoneTransitions.js` |
| 31 | game: lifeSkillRewards | 12 | 8 | `src/game/lifeSkillRewards.js` |
| 32 | game: renameOwner | 12 | 9 | `src/game/renameOwner.js` |
| 33 | game: itemDrop | 11 | 11 | `src/game/itemDrop.js` |
| 34 | game: monsterCombat | 11 | 9 | `src/game/monsterCombat.js` |
| 35 | game: pointsTips | 11 | 11 | `src/game/pointsTips.js` |
| 36 | game: achievements | 10 | 8 | `src/game/achievements.js` |
| 37 | game: chatChannel | 10 | 3 | `src/game/chatChannel.js` |
| 38 | game: deskKeyList | 10 | 10 | `src/game/deskKeyList.js` |
| 39 | game: farmWork | 10 | 0 | `src/game/farmWork.js` |
| 40 | game: postOffice | 10 | 9 | `src/game/postOffice.js` |
| 41 | game: questTrailStyle | 10 | 0 | `src/game/questTrailStyle.js` |
| 42 | game: spar | 10 | 10 | `src/game/spar.js` |
| 43 | game: timeOfDay | 10 | 0 | `src/game/timeOfDay.js` |
| 44 | game: charName | 9 | 2 | `src/game/charName.js` |
| 45 | game: ride | 9 | 9 | `src/game/ride.js` |
| 46 | game: characterRecord | 8 | 8 | `src/game/characterRecord.js` |
| 47 | game: friendErrors | 8 | 8 | `src/game/friendErrors.js` |
| 48 | game: rest | 8 | 4 | `src/game/rest.js` |
| 49 | game: feedbackOwner | 7 | 7 | `src/game/feedbackOwner.js` |
| 50 | game: shieldGem | 7 | 7 | `src/game/shieldGem.js` |
| 51 | networking: serverReady | 7 | 5 | `src/networking/serverReady.js` |
| 52 | game: dropLines | 6 | 0 | `src/game/dropLines.js` |
| 53 | game: frameSteps | 6 | 0 | `src/game/frameSteps.js` |
| 54 | game: killRoll | 6 | 6 | `src/game/killRoll.js` |
| 55 | game: mayorTalk | 6 | 6 | `src/game/mayorTalk.js` |
| 56 | game: nmlAsk | 6 | 1 | `src/game/nmlAsk.js` |
| 57 | game: petFetch | 6 | 0 | `src/game/petFetch.js` |
| 58 | game: playerActions | 6 | 6 | `src/game/playerActions.js` |
| 59 | game: pointsReset | 6 | 6 | `src/game/pointsReset.js` |
| 60 | game: blockedAsks | 5 | 3 | `src/game/blockedAsks.js` |
| 61 | game: expoAddress | 5 | 5 | `src/game/expoAddress.js` |
| 62 | game: projectiles | 5 | 1 | `src/game/projectiles.js` |
| 63 | game: abilities | 4 | 4 | `src/game/abilities.js` |
| 64 | game: climb | 4 | 3 | `src/game/climb.js` |
| 65 | game: farmWalk | 4 | 4 | `src/game/farmWalk.js` |
| 66 | game: partyRows | 4 | 4 | `src/game/partyRows.js` |
| 67 | game: quests | 4 | 3 | `src/game/quests.js` |
| 68 | game: revealBag | 4 | 3 | `src/game/revealBag.js` |
| 69 | networking: index | 4 | 0 | `src/networking/index.js` |
| 70 | game: combatHelpers | 3 | 2 | `src/game/combatHelpers.js` |
| 71 | game: dashSidePref | 3 | 0 | `src/game/dashSidePref.js` |
| 72 | game: dungeonWaves | 3 | 3 | `src/game/dungeonWaves.js` |
| 73 | game: questCard | 3 | 0 | `src/game/questCard.js` |
| 74 | game: questComplete | 3 | 3 | `src/game/questComplete.js` |
| 75 | game: spinBoard | 3 | 3 | `src/game/spinBoard.js` |
| 76 | game: sprint | 3 | 0 | `src/game/sprint.js` |
| 77 | game: storeAnswer | 3 | 1 | `src/game/storeAnswer.js` |
| 78 | game: wheelNoticeboard | 3 | 0 | `src/game/wheelNoticeboard.js` |
| 79 | game: zoneMechanics | 3 | 3 | `src/game/zoneMechanics.js` |
| 80 | game: bossChest | 2 | 0 | `src/game/bossChest.js` |
| 81 | game: desktopControls | 2 | 2 | `src/game/desktopControls.js` |
| 82 | game: groundLoot | 2 | 1 | `src/game/groundLoot.js` |
| 83 | game: loginSpinWheel | 2 | 2 | `src/game/loginSpinWheel.js` |
| 84 | game: mapPinPlaces | 2 | 1 | `src/game/mapPinPlaces.js` |
| 85 | game: plateSafety | 2 | 0 | `src/game/plateSafety.js` |
| 86 | game: tooFar | 2 | 2 | `src/game/tooFar.js` |
| 87 | game: wheelBreak | 2 | 0 | `src/game/wheelBreak.js` |
| 88 | game: wheelHome | 2 | 0 | `src/game/wheelHome.js` |
| 89 | lib: babelHelpers | 2 | 2 | `src/lib/babelHelpers.js` |
| 90 | game: deskKeys | 1 | 1 | `src/game/deskKeys.js` |
| 91 | game: farmTrip | 1 | 1 | `src/game/farmTrip.js` |
| 92 | game: fightFood | 1 | 1 | `src/game/fightFood.js` |
| 93 | game: framePacer | 1 | 0 | `src/game/framePacer.js` |
| 94 | game: harvestDoor | 1 | 0 | `src/game/harvestDoor.js` |
| 95 | game: levelCelebration | 1 | 0 | `src/game/levelCelebration.js` |
| 96 | game: lookPaletteChoice | 1 | 0 | `src/game/lookPaletteChoice.js` |
| 97 | game: npcVoices | 1 | 1 | `src/game/npcVoices.js` |
| 98 | game: questRoute | 1 | 1 | `src/game/questRoute.js` |
| 99 | game: raceDoor | 1 | 0 | `src/game/raceDoor.js` |
| 100 | game: targeting | 1 | 1 | `src/game/targeting.js` |
| 101 | game: welcomeBanner | 1 | 0 | `src/game/welcomeBanner.js` |
| 102 | game: wheelDungeons | 1 | 0 | `src/game/wheelDungeons.js` |
| 103 | game: wheelTrial | 1 | 0 | `src/game/wheelTrial.js` |
| 104 | networking: rosterCookie | 1 | 1 | `src/networking/rosterCookie.js` |

#### W4 (60 screens, 324 in place)

| # | screen | in place | ? | files it touches |
|---|---|---|---|---|
| 1 | rendering: designCatalog | 44 | 0 | `src/rendering/traits/designCatalog.js` |
| 2 | rendering: headwearCatalog | 39 | 0 | `src/rendering/traits/headwearCatalog.js` |
| 3 | rendering: playerSkins | 22 | 0 | `src/rendering/playerSkins.js` |
| 4 | rendering: paletteTex | 18 | 17 | `src/rendering/paletteTex.js` |
| 5 | rendering: fpsOverlay | 10 | 10 | `src/rendering/systems/fpsOverlay.js` |
| 6 | rendering: lookPalette | 9 | 5 | `src/rendering/lookPalette.js` |
| 7 | rendering: patternCatalog | 9 | 0 | `src/rendering/traits/patternCatalog.js` |
| 8 | rendering: eyewearCatalog | 8 | 0 | `src/rendering/traits/eyewearCatalog.js` |
| 9 | rendering: hairCatalog | 8 | 0 | `src/rendering/traits/hairCatalog.js` |
| 10 | rendering: wheelWater | 8 | 8 | `src/rendering/wheelWater.js` |
| 11 | rendering: artTools | 7 | 0 | `src/rendering/traits/artTools.js` |
| 12 | rendering: pixiRenderer | 7 | 1 | `src/rendering/pixiRenderer.js` |
| 13 | rendering: sharpPixels | 7 | 4 | `src/rendering/sharpPixels.js` |
| 14 | rendering: bodyBake | 6 | 2 | `src/rendering/bodyBake.js` |
| 15 | rendering: gearCatalog | 6 | 0 | `src/rendering/gearCatalog.js` |
| 16 | rendering: gearVariants | 6 | 0 | `src/rendering/gearVariants.js` |
| 17 | rendering: headFrames | 6 | 3 | `src/rendering/headFrames.js` |
| 18 | rendering: eyeStyleCatalog | 5 | 0 | `src/rendering/traits/eyeStyleCatalog.js` |
| 19 | rendering: gearLookProbe | 5 | 0 | `src/rendering/gearLookProbe.js` |
| 20 | rendering: selfTest | 5 | 0 | `src/rendering/selfTest.js` |
| 21 | rendering: standinlegs | 5 | 2 | `src/rendering/lookSets/standinlegs.js` |
| 22 | rendering: body | 4 | 0 | `src/rendering/lookSets/body.js` |
| 23 | rendering: eyeColorCatalog | 4 | 0 | `src/rendering/traits/eyeColorCatalog.js` |
| 24 | rendering: hairColorCatalog | 4 | 0 | `src/rendering/traits/hairColorCatalog.js` |
| 25 | rendering: lookArmourProbe | 4 | 0 | `src/rendering/lookArmourProbe.js` |
| 26 | rendering: materialTints | 4 | 0 | `src/rendering/traits/materialTints.js` |
| 27 | rendering: sheenBatch | 4 | 4 | `src/rendering/lightfx/sheenBatch.js` |
| 28 | rendering: skills | 4 | 0 | `src/rendering/lookSets/skills.js` |
| 29 | rendering: standin | 4 | 1 | `src/rendering/lookSets/standin.js` |
| 30 | rendering: facialHairColorCatalog | 3 | 0 | `src/rendering/traits/facialHairColorCatalog.js` |
| 31 | rendering: hairClip | 3 | 3 | `src/rendering/hairClip.js` |
| 32 | rendering: maskedBakeWorker | 3 | 0 | `src/rendering/maskedBakeWorker.js` |
| 33 | rendering: pixiApp | 3 | 2 | `src/rendering/pixiApp.js` |
| 34 | rendering: speciesCatalog | 3 | 0 | `src/rendering/traits/speciesCatalog.js` |
| 35 | rendering: wheelLife | 3 | 3 | `src/rendering/wheelLife.js` |
| 36 | rendering: wheelMinimap | 3 | 1 | `src/rendering/systems/wheelMinimap.js` |
| 37 | rendering: buildCatalog | 2 | 0 | `src/rendering/traits/buildCatalog.js` |
| 38 | rendering: farmWorld | 2 | 1 | `src/rendering/farmWorld.js` |
| 39 | rendering: fillBatch | 2 | 2 | `src/rendering/fillBatch.js` |
| 40 | rendering: hemiLook | 2 | 0 | `src/rendering/hemiLook.js` |
| 41 | rendering: png8Worker | 2 | 0 | `src/rendering/png8Worker.js` |
| 42 | rendering: shirtColorCatalog | 2 | 0 | `src/rendering/traits/shirtColorCatalog.js` |
| 43 | rendering: tiledMaps | 2 | 2 | `src/rendering/tiledMaps.js` |
| 44 | rendering: bodyheads | 1 | 0 | `src/rendering/lookSets/bodyheads.js` |
| 45 | rendering: campfireFx | 1 | 0 | `src/rendering/campfireFx.js` |
| 46 | rendering: capeCatalog | 1 | 0 | `src/rendering/traits/capeCatalog.js` |
| 47 | rendering: facialHairCatalog | 1 | 0 | `src/rendering/traits/facialHairCatalog.js` |
| 48 | rendering: glint | 1 | 1 | `src/rendering/lightfx/glint.js` |
| 49 | rendering: hatColorCatalog | 1 | 0 | `src/rendering/traits/hatColorCatalog.js` |
| 50 | rendering: minimapRenderer | 1 | 0 | `src/rendering/systems/minimapRenderer.js` |
| 51 | rendering: monsterShotFx | 1 | 0 | `src/rendering/monsterShotFx.js` |
| 52 | rendering: nodeLabels | 1 | 1 | `src/rendering/nodeLabels.js` |
| 53 | rendering: npcSprites | 1 | 1 | `src/rendering/npcSprites.js` |
| 54 | rendering: paletteLoad | 1 | 0 | `src/rendering/paletteLoad.js` |
| 55 | rendering: preloadAnimations | 1 | 1 | `src/rendering/preloadAnimations.js` |
| 56 | rendering: raceFlags | 1 | 0 | `src/rendering/raceFlags.js` |
| 57 | rendering: shadows | 1 | 1 | `src/rendering/lightfx/shadows.js` |
| 58 | rendering: stripRead | 1 | 1 | `src/rendering/stripRead.js` |
| 59 | rendering: tileRenderer | 1 | 0 | `src/rendering/systems/tileRenderer.js` |
| 60 | rendering: wheelObjects | 1 | 0 | `src/rendering/wheelObjects.js` |

#### W5 (3 screens, 168 in place)

| # | screen | in place | ? | files it touches |
|---|---|---|---|---|
| 1 | BroTown (the game page) | 134 | 107 | `src/ui/BroTown.jsx` |
| 2 | rendering: entityRenderer | 18 | 4 | `src/rendering/systems/entityRenderer.js` |
| 3 | rendering: effectsRenderer | 16 | 13 | `src/rendering/systems/effectsRenderer.js` |

#### W6 (62 screens, 381 in place)

| # | screen | in place | ? | files it touches |
|---|---|---|---|---|
| 1 | server: store | 50 | 0 | `server/src/store.js` |
| 2 | server: restore | 32 | 0 | `server/src/restore.js` |
| 3 | server: shop | 26 | 0 | `server/src/shop.js` |
| 4 | server: gladiator | 24 | 0 | `server/src/gladiator.js` |
| 5 | server: market | 24 | 0 | `server/src/market.js` |
| 6 | server: storeoffer | 20 | 0 | `server/src/storeoffer.js` |
| 7 | server: feedback | 16 | 0 | `server/src/feedback.js` |
| 8 | server: playerroads | 14 | 0 | `server/src/playerroads.js` |
| 9 | server: spar | 13 | 0 | `server/src/spar.js` |
| 10 | server: arena | 10 | 0 | `server/src/arena.js` |
| 11 | server: marketplace | 9 | 0 | `server/src/marketplace.js` |
| 12 | server: data | 8 | 0 | `server/src/data.js` |
| 13 | server: playerrestore | 7 | 0 | `server/src/playerrestore.js` |
| 14 | server: silence | 7 | 0 | `server/src/silence.js` |
| 15 | server: armorforge | 6 | 0 | `server/src/armorforge.js` |
| 16 | server: liveops | 6 | 0 | `server/src/liveops.js` |
| 17 | server: power | 6 | 0 | `server/src/power.js` |
| 18 | server: charname | 5 | 0 | `server/src/charname.js` |
| 19 | server: duel | 5 | 0 | `server/src/duel.js` |
| 20 | server: hardenedwood | 5 | 0 | `server/src/hardenedwood.js` |
| 21 | server: hidden | 5 | 0 | `server/src/hidden.js` |
| 22 | server: trade2 | 5 | 0 | `server/src/trade2.js` |
| 23 | server: dailychest | 4 | 0 | `server/src/dailychest.js` |
| 24 | server: dailyrewards | 4 | 0 | `server/src/dailyrewards.js` |
| 25 | server: revealbag | 4 | 0 | `server/src/revealbag.js` |
| 26 | server: wheelfaces | 4 | 0 | `server/src/wheelfaces.js` |
| 27 | server: wheelspawns | 4 | 0 | `server/src/wheelspawns.js` |
| 28 | server: wheelspawns1 | 4 | 0 | `server/src/wheelspawns1.js` |
| 29 | server: achievements | 3 | 0 | `server/src/achievements.js` |
| 30 | server: charwatch | 3 | 0 | `server/src/charwatch.js` |
| 31 | server: codex | 3 | 0 | `server/src/codex.js` |
| 32 | server: fishlog | 3 | 0 | `server/src/fishlog.js` |
| 33 | server: wheeldungeon | 3 | 0 | `server/src/wheeldungeon.js` |
| 34 | server: cadence | 2 | 0 | `server/src/cadence.js` |
| 35 | server: devicelock | 2 | 0 | `server/src/devicelock.js` |
| 36 | server: eventcapes | 2 | 0 | `server/src/eventcapes.js` |
| 37 | server: farm | 2 | 0 | `server/src/farm.js` |
| 38 | server: inbox | 2 | 0 | `server/src/inbox.js` |
| 39 | server: index | 2 | 0 | `server/src/index.js` |
| 40 | server: killroll | 2 | 0 | `server/src/killroll.js` |
| 41 | server: risechest | 2 | 0 | `server/src/risechest.js` |
| 42 | server: skillpoints | 2 | 0 | `server/src/skillpoints.js` |
| 43 | server: testmode | 2 | 0 | `server/src/testmode.js` |
| 44 | server: account | 1 | 0 | `server/src/account.js` |
| 45 | server: accuracy | 1 | 0 | `server/src/accuracy.js` |
| 46 | server: alliance | 1 | 0 | `server/src/alliance.js` |
| 47 | server: amulet | 1 | 0 | `server/src/amulet.js` |
| 48 | server: botfp | 1 | 0 | `server/src/botfp.js` |
| 49 | server: chainwriter | 1 | 0 | `server/src/chainwriter.js` |
| 50 | server: chatmod | 1 | 0 | `server/src/chatmod.js` |
| 51 | server: daybook | 1 | 0 | `server/src/daybook.js` |
| 52 | server: econcard | 1 | 0 | `server/src/econcard.js` |
| 53 | server: fightlock | 1 | 0 | `server/src/fightlock.js` |
| 54 | server: leaderboard | 1 | 0 | `server/src/leaderboard.js` |
| 55 | server: loginspin | 1 | 0 | `server/src/loginspin.js` |
| 56 | server: migrations | 1 | 0 | `server/src/migrations.js` |
| 57 | server: origin | 1 | 0 | `server/src/origin.js` |
| 58 | server: publicreads | 1 | 0 | `server/src/publicreads.js` |
| 59 | server: quests | 1 | 0 | `server/src/quests.js` |
| 60 | server: reqonce | 1 | 0 | `server/src/reqonce.js` |
| 61 | server: salvage | 1 | 0 | `server/src/salvage.js` |
| 62 | server: threat | 1 | 0 | `server/src/threat.js` |

#### stays (40 screens, 0 in place)

| # | screen | in place | ? | files it touches |
|---|---|---|---|---|
| 1 | data: abilities | 0 | 4 | `src/data/abilities.js` |
| 2 | data: achievements | 0 | 52 | `src/data/achievements.js` |
| 3 | data: buildings | 0 | 0 | `src/data/buildings.js` |
| 4 | data: codexDrops | 0 | 16 | `src/data/codexDrops.js` |
| 5 | data: codexStage | 0 | 0 | `src/data/codexStage.js` |
| 6 | data: dishes | 0 | 0 | `src/data/dishes.js` |
| 7 | data: effects | 0 | 0 | `src/data/effects.js` |
| 8 | data: elemWindup | 0 | 0 | `src/data/elemWindup.js` |
| 9 | data: elements | 0 | 0 | `src/data/elements.js` |
| 10 | data: farmCrops | 0 | 0 | `src/data/farmCrops.js` |
| 11 | data: farmLayout | 0 | 0 | `src/data/farmLayout.js` |
| 12 | data: fishVariants | 0 | 5 | `src/data/fishVariants.js` |
| 13 | data: gameDisplay | 0 | 123 | `src/data/gameDisplay.js` |
| 14 | data: gameSystems | 0 | 299 | `src/data/gameSystems.js` |
| 15 | data: hardenCosts | 0 | 6 | `src/data/hardenCosts.js` |
| 16 | data: hardenedWood | 0 | 6 | `src/data/hardenedWood.js` |
| 17 | data: items | 0 | 61 | `src/data/items.js` |
| 18 | data: joinGate | 0 | 4 | `src/data/joinGate.js` |
| 19 | data: lifeSkills | 0 | 41 | `src/data/lifeSkills.js` |
| 20 | data: monsterCodex | 0 | 29 | `src/data/monsterCodex.js` |
| 21 | data: monsterDeathZones | 0 | 14 | `src/data/monsterDeathZones.js` |
| 22 | data: npcLooks | 0 | 0 | `src/data/npcLooks.js` |
| 23 | data: oreArt | 0 | 0 | `src/data/oreArt.js` |
| 24 | data: prog3 | 0 | 48 | `src/data/prog3.js` |
| 25 | data: remains | 0 | 4 | `src/data/remains.js` |
| 26 | data: salvage | 0 | 3 | `src/data/salvage.js` |
| 27 | data: shards | 0 | 0 | `src/data/shards.js` |
| 28 | data: stormSparks | 0 | 0 | `src/data/stormSparks.js` |
| 29 | data: townBoard | 0 | 109 | `src/data/townBoard.js` |
| 30 | data: trapping | 0 | 27 | `src/data/trapping.js` |
| 31 | data: treeArt | 0 | 0 | `src/data/treeArt.js` |
| 32 | data: waterAttack | 0 | 0 | `src/data/waterAttack.js` |
| 33 | data: weaponGems | 0 | 13 | `src/data/weaponGems.js` |
| 34 | data: wheelBuildingDoors | 0 | 0 | `src/data/wheelBuildingDoors.js` |
| 35 | data: wheelDungeons | 0 | 4 | `src/data/wheelDungeons.js` |
| 36 | data: wheelSignposts | 0 | 1 | `src/data/wheelSignposts.js` |
| 37 | data: wheelStageLooks | 0 | 0 | `src/data/wheelStageLooks.js` |
| 38 | data: words | 0 | 4 | `src/data/words.js` |
| 39 | data: worldProps | 0 | 0 | `src/data/worldProps.js` |
| 40 | data: zones | 0 | 0 | `src/data/zones.js` |

## What holds it

- `tools/guards/player-words.test.mjs` (card WD PR 2): the counts only fall,
  and a new "Wheel" or "remnant" always fails.
- `node tools/dev/words-census.mjs --check`: the census page is the scan's.
- This plan names every screen in the census (446). Before a move starts,
  its card re-reads the census, so a screen added since is named in its wave.
