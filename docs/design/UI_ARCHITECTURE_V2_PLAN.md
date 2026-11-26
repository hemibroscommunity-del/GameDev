# The dashboard's new architecture: THE BUILD PLAN (v2.3.6405)

The order of the building of the owner's master specification (`UI_MASTER_SPEC.md`, 2026-11-25), by its part 15 and by what the four audits found (`UI_ARCHITECTURE_V2_AUDIT.md`). Read with `UI_MASTER_SPEC_NOTES.md` (where the game stands over the specification; what is flagged to the owner; the room; the kit). This file was "the phases", a proposal waiting for approval (v2.3.6401 to 6404; that text is in the repository's history at v2.3.6404, with its ten facts for the design conversation and the owner's questions as they then stood). It is rewritten because the owner AUTHORIZED the build:

> *"You are authorized to begin implementation. ... Establish a centralized UI design system before migrating individual menus. ... Implement incrementally, test against actual mobile dimensions, and document your progress. Do not wait for approval of every individual menu design. Flag significant architectural or gameplay conflicts for my review, but independently resolve ordinary visual and implementation decisions."* (the owner, 2026-11-25, about 23:50 UTC; whole in `UI_ARCHITECTURE_V2.md` part 13)

A step is a card (`docs/plan/cards/UI2-*.md`); a session with no card does not start. Steps 1 to 5 have their cards; steps 6 to 10 are laid out here and their cards are written when the step before them is in review.

## How it arrives (said plainly, and chosen)

- **Each step lands ON, for everyone.** The owner's words: *"Do not wait for approval of every individual menu design"*; *"Review real in-game screenshots rather than iterating hypothetical mockups"*; and their standing word that the game is a demo and they are its only player (CLAUDE.md §7). So no step waits behind an address for a "yes": it merges, the owner opens the game, and what they say changes the NEXT PR. This replaces the old plan's "lands off, the owner opens one address" (its question 3).
- **ONE way back for the whole new dashboard while it is built: `?ui2=0`**, remembered on that phone (`?ui2=1` returns). It gives back the dashboard as it is today: the row of CLOSE and six buttons, and today's screens. One row in the switch table. Every old screen stays reachable by it until step 10 deletes them.
- **The old tab strip goes in two moves.** It stops being drawn by default at step 2, the moment the new frame can reach everything the strip reached (the step's own test opens every page). It is DELETED, with the More page and the way back, at step 10 (*"Completely retire the old CLOSE / Gear / Bro / Quests / Codex / More persistent tab strip"*).
- **A step replaces a screen whole.** Under `ui2`, a page is either the new one or, until its step comes, today's page hung unchanged in the new frame under the new header. Never half of each on one page.
- **The older fallbacks** (`?bropages=0`, `?questpages=0`, `?rankstyle=0`: each a screen from before 2026-11-25) work only under `?ui2=0` once their screen's step has landed, and are removed with the old screens at step 10.
- **A sub-switch only where a real phone must judge**: the growing motion (`?dashgrow=0`), the kit's shine (`?ui2shine=0`). No other.

## The rules every step keeps

1. **The band's height never changes.** The one header takes the place of today's 52 px row; a page keeps today's room (390 x 191 at 390 x 844, 172 px of it content; the notes' "The room"). No primary action, fact or door is found only by scrolling.
2. **No rule of the game changes, and nothing is invented.** Where the specification and the game differ, the screen shows the game's (the notes' table 1). A choice of gameplay or architecture is FLAGGED (the notes' table 2), never settled by a card. Planned gameplay (the specification's part 10.1) gets its place and an honest "not in the game yet".
3. **Nothing is lost.** Every page and action reachable today is reachable after each step; the card lists them and its phone test opens each.
4. **Built from the kit, never restyled.** A screen takes its tokens (`src/game/ui2Tokens.js`) and its pieces (`src/ui/kit/`) from step 1. A piece the kit lacks is ADDED TO THE KIT (and to its fixture, `?uikit=1`), never styled inside a screen. All chrome is code: no picture file for a surface, a button, a rim or a texture.
5. **Rules as modules** (`finish.md` part 5, rule 5): a step's rules land under `src/game/` with a suite that tests what they do; `BottomDashboard.jsx` (2,035 lines), `HeroExpanded.jsx` (3,539), `GearTab.jsx` (1,231) and `ItemDetailPopup.jsx` (1,978) gain calls and their lines fall (the PR says the count before and after). **A suite of this build lives in `tools/guards/`** (`npm test` runs it), never in `server/test/`: a new file there deploys the worker (CLAUDE.md §4). Only step 9 touches the server.
6. **One of each piece** (the owner's question 85: consistency in interaction, creativity in presentation). The table "Where each piece is built" below: built once, in the step named; a later step calls it; a second copy is a fault.
7. **The same-change rows** of CLAUDE.md §8 for each new screen: its state in `tools/qa/ui-review/states.mjs` and its section in `docs/UI-DESIGN-NOTES.md` (with the owner's words); `data-esc` on a Close; keys in `src/game/deskKeys.js`, worn by their buttons (`data-key`); `deskWords()`; `touch-action: manipulation`; `swallowTapClick` where a control closes on `pointerup`; layout reads only by the ways of `docs/specs/layout-reads.md`; every screen plays the upright layout (`src/ui/oneBand.js`); a phone test with `world: 'wheel'`, its `lane`, and `wide: true` for its computer run.
8. **Nothing the memory check reads rises** unless the PR says how many MB and why. No filter, no backdrop-filter, no animation that runs while nothing changes; reduced motion stops every loop; nothing is measured in a tap or a frame; `mp-heldsweep` stays inside its budget where a step adds motion or a load.
9. **A claim about a phone says where it was measured** (`finish.md` part 5, rule 4): "on the test box" until the owner's phone has said. Each PR carries pictures at deviceScaleFactor 2 of the REAL game (`docs/shots/ui2-*.png`), beside the reference where there is one, in plain words, with its preview address.

## The steps

| # | Card | What the owner sees on their phone when it lands | Stacks on | PRs |
|---|---|---|---|---|
| 1 | UI2-kit (running) | Nothing in the game changes. One address, `?uikit=1`, shows the new look's pieces in a box of the dashboard's real size: the frame, the header, tiles, buttons in five colours, slots by grade, and two samples (the Bro landing, the Character page) | `main` | 1 |
| 2 | UI2-frame | The row of CLOSE and six buttons is gone. Two workspaces, **Gear** and **Menu**. Menu is eight pictures with a word each. Every page has ONE top line: Back (saying where it goes), the page's name, Menu, Close. Close the dashboard mid-page and open Menu again: you are where you were. Then a page GROWS out of the tile you tapped | step 1 | 2 |
| 3 | UI2-bro | **Bro** opens on six doors and nothing else: Character, Combat, Equipment, Life Skills, Feats, Pets. **Character** is your passport: your face large with your combat level beside it, name and title, the three weapon levels, and what the game truly has of clan, guild, achievement points and quests done | step 2 | 2 |
| 4 | UI2-combat | **Combat** shows Sword, Bow and Staff, each with its level, its XP bar and its points, and Shared Attributes under them. A weapon's page: level and XP, DPS large, the stats under it, six attributes. Tap DPS: where it comes from, one layer at a time. Tap an attribute: today's preview, unchanged | step 3 | 2 |
| 5 | UI2-gear | **Gear** is two panels, your bag and what you wear, laid out like a body. Tap a bag item: the worn side becomes its summary, with what happens to YOU if you wear it. Tap a worn item: the bag side becomes its summary. "Details" opens one item page, the same from everywhere | step 2 (its third PR: step 3) | 3 |
| 6 | UI2-quests, UI2-ranks, UI2-codex; then UI2-life, UI2-feats, UI2-pets | **Quests**: your active quests as rows; a quest shows what is done and what is NOW, never what is to come. **Ranks**: one number a row; a tap opens that player. **Codex**: illustrated cards by kind; a monster's page with its doors; loot as plain rows with the exact chance. Then Bro's other three doors get their own pages | steps 3 and 5 | 6, one a screen |
| 7 | UI2-social, UI2-map, UI2-notify, UI2-home, UI2-settings | **Social** as the network: you in the middle, Friends, Clan, Party, Nearby round you. **Map**: Geography and Connections. **Notifications**: one list; a tap goes to the real page. **Homestead**: your real farm in small. **Settings**: sound on top | step 6 | 5 |
| 8 | UI2-shop, UI2-bank, UI2-craft, UI2-trade, UI2-folk | The shop, the bank, the benches and a trade laid out like Gear; a townsperson with a face and named doors. **Starts only when the owner has said where they live** (flagged, F3) | steps 5 and 6 | 5 |
| 9 | UI2-who | Tap any player: the same Bro pages, read-only, named as theirs, with their REAL levels, gear, stats and placed points from the server. **Starts on the owner's yes** (flagged, F2): it deploys the worker | steps 3 to 5 | 2 |
| 10 | UI2-rest | Nothing new to see: the old row, the More page, the old screens and their switches are deleted; every shortcut on the world lands on the new pages; the specification's acceptance tasks (its part 16) run as phone tests | all | 2 |

**What never runs side by side** (files never meet):

- Step 2 holds `src/ui/mobile/BottomDashboard.jsx`, `dashboardPanelBus.js`, `dash/NavRail.jsx`, `dash/MorePanel.jsx`, `src/game/deskKeys.js` and the phone tests' harness: nothing else of this build runs until its first PR is up.
- Steps 3 and 4 both hold the Bro files (`sheet/BroCard.jsx`, `BroPages.jsx`, `src/game/broPages.js`): one after the other.
- Step 5 holds `dash/GearTab.jsx`, `ItemDetailPopup.jsx`, `ItemTooltip.jsx`, `dash/gearStats.js`: it MAY run beside steps 3 and 4 (no file in common), except its third PR (Bro's Equipment page), which follows step 3.
- Every step adds a row to `src/game/dashDests.js`, `states.mjs`, `docs/UI-DESIGN-NOTES.md` and (some) the switch table: two steps side by side merge `main` once before their push.
- Outside this build: card PAD holds the control panels; no step touches `src/ui/BroTown.jsx` or a renderer without asking the orchestrator which card holds it (one line of `BroTown.jsx` is needed at step 9, the tap on a player).

### Step 1, UI2-kit: the design system (running; `docs/plan/cards/UI2-kit.md` on its own branch)

- **Purpose.** Every later screen is built from ONE small kit, so the whole reads as one premium object and a change of the look is a change in one place.
- **Files.** `src/game/ui2Tokens.js`, `src/ui/kit/**`, the kit's style sheet under the one scope class `.ui2`, the fixture `?uikit=1`, `tools/guards/ui2-tokens.test.mjs`, `tools/qa/mp/mp-uikit.mjs`. **Tests:** contrast (4.5 to 1), the least touch box (44) and text (11), the sheet equal to the module; `mp-uikit` at three sizes. **Beside it:** anything (it changes no existing screen).

### Step 2, UI2-frame: Gear and Menu, the one header, the history (`docs/plan/cards/UI2-frame.md`)

- **Purpose.** A player always knows where they are, how to go back and how to get home, and the dashboard remembers where they were. Every later step hangs its pages in this frame.
- **Rules.** `src/game/dashNav.js` (ONE state, ONE transition function: each workspace's own stack; Back by the real journey; Close resets nothing; the Menu shortcut to the root; a stack entry keeps its scroll, its selection, whose page it is and where it grew from); `src/game/dashDests.js` (the destinations' table). Suite `tools/guards/dash-nav.test.mjs`.
- **Files.** `BottomDashboard.jsx` (calls in, lines out), `dashboardPanelBus.js` (a thin face over `dashNav`), new `dash/DashHeader.jsx` and `dash/MenuGrid.jsx` FROM the kit's header and tiles; `NavRail.jsx` and `MorePanel.jsx` drawn only under `?ui2=0`; `deskKeys.js`; the harness's `H.dashOpen`.
- **Tests.** `mp-ui2frame` (every page of today reachable; Back's words and target; resume with scroll; the height to the pixel at three sizes and a computer; `?ui2=0` gives the old row); the 21 phone tests that press a `[data-nav]` button moved to `H.dashOpen`. The specification's acceptance task "Interrupt a deep inspection ... resume" is this test.
- **PRs.** (a) the frame, ON; (b) the growing motion (the owner's question 47), with `?dashgrow=0`.

### Step 3, UI2-bro: the Menu's directory finished, Bro's six doors, Character (`docs/plan/cards/UI2-bro.md`)

- **Purpose.** Bro answers "who am I" first and sends you to the detail by a named door. And the pieces of a SCREEN that every later page uses are made here once.
- **Rules.** `src/game/broHub.js` (the six doors; what the passport shows and what it leaves honestly empty), `src/game/screenZones.js` (the zones of a screen; an action that is off carries its reason), `src/game/pending.js` (which requests are out and which controls they hold).
- **Files.** `sheet/BroCard.jsx`, `BroPages.jsx`, `src/game/broPages.js`; new `sheet/BroLanding.jsx`, `sheet/CharacterPage.jsx`; the kit gains `Zones`, `ActionRow`, `EmptyState`, `Confirm`.
- **Tests.** `tools/guards/bro-hub.test.mjs`, `screen-zones.test.mjs`; `mp-ui2bro` ("Find your combat level, then your Bow level"; "all six Bro destinations, no redundant banner").
- **PRs.** (a) the directory's states, the screen pieces, Bro's landing; (b) Character.

### Step 4, UI2-combat: the hub, a weapon's page, the shared page, the stat tree (`docs/plan/cards/UI2-combat.md`)

- **Purpose.** One page a weapon, DPS as its headline, and a way down from a number to its reasons; the pools told apart as the GAME holds them.
- **Rules.** `src/game/combatHub.js` (the four doors; each pool's count and words), `src/game/metricTree.js` (a headline as a tree, one layer at a time, read out of `calcDisplayDps` itself), `src/game/progression.js` (level, XP now and needed).
- **Files.** `sheet/HeroExpanded.jsx` (its Build lanes move out; its lines fall), new `sheet/CombatHub.jsx`, `WeaponPage.jsx`, `SharedPage.jsx`, `StatTree.jsx`; `InfoPopup.jsx` hosted, not rewritten; `src/data/gameSystems.js` only where `calcDisplayDps` hands back its parts.
- **Tests.** `tools/guards/combat-hub.test.mjs`, `metric-tree.test.mjs` (the tree's total IS `calcDisplayDps`'s, for every weapon); `mp-ui2combat` (the specification's second and third acceptance tasks). **No effective-health number** (flagged, F1): the Shared page leads with Max HP.
- **PRs.** (a) the hub and a weapon's page with the preview hosted; (b) the tree and the shared page.

### Step 5, UI2-gear: two panels, the quick look, the one item page, the comparison (`docs/plan/cards/UI2-gear.md`)

- **Purpose.** One place that says what an item IS, and a Gear workspace where "should I wear this" is answered by what happens to YOU.
- **Rules.** `src/game/itemInspect.js` (an item's facts and the actions its context allows), `src/game/compare.js` (the transformation form and its honest edges), `src/game/equipProject.js` (you now, you if equipped, by the same reader as the Bro pages), `src/game/workspace.js` (the two-panel workspace: the source stays, the opposite panel becomes the summary).
- **Files.** `dash/GearTab.jsx`, `ItemDetailPopup.jsx`, `ItemTooltip.jsx`, `dash/gearStats.js`; the kit gains `TwoPanel` and the one grid of item cells; Bro's Equipment page (third PR).
- **Tests.** `tools/guards/compare.test.mjs`, `item-inspect.test.mjs`, `workspace.test.mjs`; `mp-ui2gear` (the specification's fifth and eighth acceptance tasks).
- **PRs.** (a) the one item page; (b) the two panels, the quick looks, the comparison; (c) Bro's Equipment page and the other item screens moved onto the item page.

### Step 6: Quests, Ranks, Codex; then Life Skills, Feats, Pets (one card a screen; side by side where their files differ)

- **UI2-quests.** `src/game/questPages.js`: the landing rows; the journey that stops at NOW (the grey steps to come are removed). Files: `dash/QuestPages.jsx`. Test: "Identify the next objective ... without seeing future steps". Story is left out and "Show on map" is the locate button (the notes' line 17).
- **UI2-ranks.** `src/game/ranksPage.js`: the groups (Combat, Life Skills, Feats; no Equipment board: none exists), one number a row, your row pinned only when out of view, the tap and the way back to the same place. The tap opens what step 3 can show of that player; the full page is step 9's.
- **UI2-codex.** `src/game/codexView.js`, `entityInspect.js`, `lootRows.js` (out of `src/data/codexDrops.js`): the illustrated collection; the monster's showcase with its doors; loot as plain rows. Needs step 5's item page. A kind's art loads when its page opens and is freed on leaving. Whether every monster is open before a first kill is FLAGGED (F4): until then the game's rule.
- **UI2-life.** `src/game/lifeProfile.js` (the sum of the ten levels), `progression.js` reused for a skill's page with its whole roadmap. The radar and the two labels are NOT drawn (flagged, F5).
- **UI2-feats.** `src/game/feats.js`: AP large and its sources as the phone can truly split them; the four tiers as medals; Titles; Quest History; career highlights from the counters that exist. Discoveries left out until the game keeps something.
- **UI2-pets.** The companion (or today's empty state), Owned, All. No stat is added to a pet.
- **Size.** Six PRs. **Beside each other:** yes, by twos (each holds its own panel).

### Step 7: Social, the map, notifications, the farm's page, Settings

- **UI2-social.** FIRST a sketch at the real sizes in its PR's first push comment, then code. `src/game/socialNet.js`: each circle's true count, the few still faces the phone holds, its empty state. Party and Clan read from the ONE group the game has (Party: who of it plays now; Clan: the whole group). No server change.
- **UI2-map.** `src/game/worldGraph.js`, worked out from `public/tools/world/plan.js` (no coordinate in code or test). The Menu's Map tile keeps opening the full-screen map; Geography and Connections switch inside it.
- **UI2-notify.** `src/game/notify.js` over today's toast bus; `src/game/feedback.js`, one table of each event's strength. A level-up's burst waiting for a fight to end is FLAGGED (F4).
- **UI2-home.** `src/game/estateView.js`: the real beds, from the farm's record; looking only.
- **UI2-settings.** The three sound controls on top; the rest as labelled categories; Account, Feedback and About inside.
- **Size.** Five PRs.

### Step 8: the windows (shop, bank, benches, a trade, a townsperson) — waits for the owner (F3)

- **Purpose.** The places where things change hands look and work like Gear. No rule, price, recipe, limit or safeguard changes.
- **Rules.** `src/game/shopView.js`, `bankView.js`, `craftView.js` (one recipe model over the five benches), `tradeView.js`, `folkProfile.js`; all call step 5's `workspace.js` and item page, step 6's collection and showcase.
- **Tests.** One phone test a card, reached with `H.approachNpc`, each proving every action of the old window is still reachable. **Size.** Five PRs.

### Step 9, UI2-who: a peer's page from the worker — starts on the owner's yes (F2)

- **Server (one PR; it deploys the worker; read `docs/ARCHITECTURE-HANDOFF.md` first):** a request and its answer (the three levels, worn items with their stats, the worked-out stats, the placed points; never the bag, coins, stashes, quests or unspent points); its action row, its wire rows with the trust of its one field, a cap on its own line, a lower-case kill switch, a pace; `server/test/inspect.test.mjs`.
- **Client (one PR):** `src/game/playerInspect.js`; the Bro pages take a `who`; the header names whose page it is; the social actions as the bottom `ActionRow`; "compare with me" in `compare.js`. `mp-ui2who` (two phones): "Inspect another player's build ... verify no edit or allocation authority".

### Step 10, UI2-rest: the clean-up

- Deletes `dash/NavRail.jsx`'s row, `dash/MorePanel.jsx`, the old Bro, Quests and Ranks versions with their switches (`bropages`, `questpages`, `rankstyle`), the old player window, and then `ui2` itself, once the owner says the old dashboard is no longer wanted (their word, in part 13).
- Each shortcut on the world that the game can honour lands on the new pages (a level-up to its skill; a party tag to the party's page).
- `mp-ui2tasks`: the specification's part 16, every task the game can play, in one run, on the three sizes.

## Where each piece is built (once)

| The piece (the specification) | Rule and component | Built in | Used again by |
|---|---|---|---|
| Tokens, the frame, header, tile, info group, stat headline, action button, rarity slot, progress bar, badge, disabled-with-reason, pending mark, loading placeholder (MS 2.1) | `src/game/ui2Tokens.js`, `src/ui/kit/` | 1 | every step |
| The two workspaces, the history, the Menu shortcut, whose page it is (MS 1.1, 1.2.1) | `dashNav.js`, `dashDests.js`; `DashHeader`, `MenuGrid` | 2 | every page; `who` is used by 9 |
| The growing motion (MS 1.2.2) | the origin in `dashNav`'s entry; CSS only | 2 (second PR) | every page |
| The zones of a screen, the action row, the empty and locked state, the one confirmation (MS 1.2.1, 1.2.3) | `screenZones.js`; `Zones`, `ActionRow`, `EmptyState`, `Confirm` | 3 | every page |
| The reason beside a disabled action; pending, "not sure", reconnecting (MS 14) | `screenZones.js`, `pending.js` | 3, proved on the points preview's Spend | 5 (equip), 8 |
| The stat tree (MS 3.2) | `metricTree.js`; `StatTree` | 4 | the shared page, AP's sources (6) |
| Level, XP and roadmap (MS 3.3) | `progression.js` | 4 (a weapon) | 6 (a life skill) |
| The transformation comparison (MS 3.1) | `compare.js`, fed by `equipProject.js` | 5 | 9 (you and another player), 8 (a shop's goods) |
| The two-panel workspace and the one grid of item cells (MS 5, 12) | `workspace.js`; `TwoPanel` | 5 | 8 |
| The one item page (MS 5, 8) | `itemInspect.js` | 5 | 6 (loot rows), 8, 9 |
| The illustrated collection; the showcase with its doors; the loot rows (MS 8) | `Collection`; `entityInspect.js`, `Showcase`; `lootRows.js` | 6 (UI2-codex) | 8 (recipes, a townsperson), 6 (medals, pets) |
| The notifications' route; the strengths of feedback (MS 1.2.3, 14) | `notify.js`, `feedback.js` | 7 | every event |

## The readings chosen (ordinary choices, ours; a word of the owner's turns any over)

- **The Menu's eight:** Bro, Quests, Social, Ranks, Codex, Homestead, Map, Settings, four across and two down, equal weight. Party and the skill Guilds inside Social; Journey becomes Feats' lifetime records; Account, Notifications (until step 7), Feedback and About inside Settings.
- **The closed band:** its handle and two buttons, Gear and Menu.
- **Bro's landing:** six equal tiles, three across and two down, under the one header; no banner. The unspent-points glow sits on the Menu button, on Bro's tile and on Combat's tile.
- **A page grows from the PLACE of the tile tapped**, not from its measured outline (nothing is measured at a tap).
- **A weapon's roadmap:** its level, its XP and "3 points a level"; no empty milestones (a weapon's level unlocks nothing with a name).
- **Gear:** the game's slot names (Chest, Legs, Gem); the health, mana and energy bars stay on the world's own screen when the middle column goes.
- **The medals** are the game's four tiers. **The red action** is a lighter red face with the one dark lettering, judged on the kit's fixture; which actions are destructive is settled screen by screen (Drop and Discard are; Unequip is not).
- **Seeing it at once:** what only moves things you already own (equip, a point's preview) shows immediately as today; anything that spends gold or materials waits for the server's word.

## What waits for gameplay (never built by this work)

Each has its place on its page, with an honest empty state that says what is absent and, where the game has a way, how to get it.

| What the documents draw (the hand-offs' own numbering) | What the game has today | It waits for |
|---|---|---|
| Buying more farmland (14 §6.1) | six beds; the farm's own spec plans paid land | the owner's farm work |
| A farmhouse you build, its inside view and its building plan (14 §6.3) | a fixed house with a place to sleep | the owner's farm work |
| Furniture in the house (14 §6.1) | a workshop list that places nothing and that the server does not know (treated as dormant) | the owner's farm work |
| Pets that live on the farm (14 §4.4, §6.1) | pets are a list; the Pet House is a door to the Pets page | the owner's farm work |
| Visiting another player's property, and seeing it on their profile (14 §6.4) | your farm is private to you | the owner's farm work, and a server message with its cost |
| Storage at the farm | the bank, which stays | nothing: not to be built |
| A Clan circle of its own (14 §5.1) | clans are parties | nothing: Party and Clan read from the one group (the readings chosen) |
| Living, moving figures in Social (14 §5.1) | a still face, for players whose look the phone holds | a budget for memory and frames; looks from the server |
| Effective health, as a headline and in comparisons (14 §3.1) | no such number | the owner (flagged, F1) |
| A medal's progress (14 §4.3) | earned or not, and a hint for a few | counters the game does not keep; not asked for |
| Title families (14 §4.3) | one real family (combat level 10, 50, 100) | more achievements that follow one another |
| Lifetime records on ANOTHER player's page (14 §4.3) | counted by each phone; the server has kills, kills by kind, the biggest fish | the server counting the rest; not asked for |
| Discoveries (14 §4.3) | nothing the server keeps | a decision to track them |
| The two labels (14 §4.2) | nothing | the owner's thresholds |
| A board for the combined life-skill level (14 §4.1) | a board a skill; the sum only on your own card | the owner's yes, and a small server change |
| Comparing two pets, or a Codex item (14 §3.1) | a pet has a level and a ward | something to compare |
| A region's monsters, resources and townsfolk as lists (14 §7.2) | the data is in the world's bakes; no table reads it by region | a small table made from the bakes |
| Fast travel, routes, tracking on the map | none | not to be built (14 §7.1) |
| Codex entries for items, resources, townsfolk, pets and places (15 §2) | nine monsters; tables a card could be drawn from, but no entries | each kind's entries being written (content, not a screen's work) |
| Furnishings, as Codex entries and as recipes (15 §2, §3) | four recipes the server does not know; nothing can be placed | the owner's farm work |
| A monster's own stat block and list of abilities (15 §2) | a level range, curves by level, one attack and a story | not asked for; the card says "by level" |
| Shop categories; a second merchant (15 §3) | one merchant, one shelf | more merchants |
| Bulk deposit; storage at the farm (15 §3) | neither | bulk deposit: the owner's yes; farm storage: not to be built |
| A quantity for every craft (15 §3) | a count only for smelting, hardened wood and shard cracking | a server change a bench, asked first |
| A graphics quality setting (15 §4) | none: the game paces itself | the owner asking for one |
| An animated townsperson in a window (15 §4) | a still head; moving figures only in the world | a budget for memory and frames |
| "Not sure it went through" for a craft (15 §5) | only the Auction House has it; a craft carries no request stamp | a server change with a small running cost, asked first |

## What is flagged to the owner

`UI_MASTER_SPEC_NOTES.md`, part 2: effective health's formula (F1); another player's full page from the worker (F2); where the shop, the bank, the benches, a trade and a townsperson's profile live (F3); anything that would change a rule of play (F4); what the two labels and the radar measure, and what a clan or guild profile is (F5). Steps 1 to 7 and 10 do not wait for any of them.
