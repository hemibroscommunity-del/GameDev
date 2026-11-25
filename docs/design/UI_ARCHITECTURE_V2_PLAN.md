# The dashboard's new architecture: the phases (v2.3.6401; the addendum's pieces, v2.3.6402)

The plan for the owner's document (`UI_ARCHITECTURE_V2.md`: the baseline, parts 1 to 12, and the addendum of the same day, part 14, questions 36 to 72), made from the audit beside it (`UI_ARCHITECTURE_V2_AUDIT.md`, both halves). "14 §3.1" is the addendum's own section 3.1. It is a PROPOSAL until the owner says yes: nothing here is built yet, and a line of it becomes a decision only when the owner's words go into the document's part 13.

**No phase starts yet** (v2.3.6402). The owner, 2026-11-25, with the addendum: *"Do not begin implementation or final visual redesign yet. We are still completing the architectural design process."* More addenda will come (question 73 on). So this stays a plan until the owner says the design is complete; phase 1 does not start on the answers to three questions. What the owner needs from this work NOW is the section "What to take back to the design conversation": the facts of the game that the two documents get wrong or could not know. Each phase is a card to be; phase 1's is drafted (`docs/plan/cards/UI2-nav.md`).

## The rules every phase keeps

- **One way back.** The whole new dashboard sits behind ONE switch, `ui2`. `?ui2=0` gives back today's dashboard (the six-button row and today's screens), remembered on that phone. One row in the switch table (`tools/guards/lib/switches.mjs`). The way back stays until the last phase removes the old screens.
- **The band's height never changes.** The one header takes the place of today's 52 px button row; a page keeps today's room (178 px on a 390 x 844 phone). Sideways the band keeps today's cap.
- **No rule of the game changes.** Where the document's rule and the code differ, the screen shows the game's rule as it is and the difference is a question below.
- **Nothing is removed.** Every page and action reachable today is reachable after each phase; a phase's card lists them and its phone test opens each.
- **Rules as modules** (`finish.md` part 5, rule 5): each phase's rules land under `src/game/` with a suite that tests what they do; `BottomDashboard.jsx` (2,035 lines), `HeroExpanded.jsx` (3,539), `GearTab.jsx` (1,231) and `ItemDetailPopup.jsx` (1,978) gain calls and their lines fall.
- **Structure before looks.** Every phase uses the game's existing slate (`docs/LANTERN-SLATE-SPEC.md`) and existing pictures. No new art, bevel, shine or animation until the owner has seen every screen plain and opens the visual phase.
- **The same-change rows** of CLAUDE.md §8 for each new screen: `states.mjs`, its section in `docs/UI-DESIGN-NOTES.md` (with the owner's words from the document), `data-esc`, keys in `deskKeys.js`, `deskWords()`, `touch-action`, layout reads by the spec's ways, a phone test with `world: 'wheel'`.
- **Planned gameplay is never built by a phase** (v2.3.6402; 14 §6.1, §8). What the addendum calls planned (more farmland, a farmhouse you build, furniture, pets living on the farm, visiting another's property), and data the game does not keep, gets its PLACE on its page and an honest line saying it is not in the game yet. No phase adds a mechanic, a counter or a stored record to fill a wireframe; the list is "What waits for gameplay" below.
- **One of each piece** (v2.3.6402). The addendum names pieces to be reused everywhere: the comparison, the stat tree, the skill's progression, the zones of a screen, the action row, the empty state, the growing motion, the notifications' route. Each is built ONCE, in the phase named below, as a rule under `src/game/` and one component; a later phase that needs it calls it, and a second copy is a fault.
- **The motion measures nothing** (v2.3.6402; the audit's 14 §2). A page grows out of where it came from by CSS alone (transform and opacity on the page's container), from an origin the code already knows: the tile's cell, else the point of the tap, else the centre. No box is measured in a tap or a frame; reduced motion switches it off; `mp-heldsweep` stays within its budget.
- **The older fallbacks go as their screen is replaced.** `?bropages=0`, `?questpages=0` and `?rankstyle=0` each keep a screen from BEFORE 2026-11-25 alive. When a phase replaces that screen, the phase deletes that older fallback and its switch, so there are never more than two versions of a screen: today's (behind `?ui2=0`) and the new one.

## The phases

| # | Card | What the owner opens on their phone when it lands | Size |
|---|---|---|---|
| 1 | UI2-nav | Two buttons where six were: **Gear** and **Menu**. Menu is a grid of eight pictures with words. Every page has one top line: Back (saying where it goes), the page's name, a small **Menu** button on deep pages (the owner's decision, 14 §2.1), Close. Close the band mid-page, open Menu again: you are where you were. | 2 PRs |
| 1b | UI2-motion | A page GROWS out of the tile you tapped and shrinks back into it on Back (14 §2.2), never a slide. | 1 small PR, between phase 1's two |
| 2 | UI2-bro | Bro opens on six doors: Character, Combat, Equipment, and under them Life Skills, Accomplishments, Pets. Character is your card (portrait, name, title, level, AP, the three weapon levels). No page marks. Built here once, for every later screen: the zones of a screen, the bottom row of actions, the empty state. | 2 PRs |
| 3 | UI2-combat | Combat shows four doors: Sword, Bow, Staff, Shared. Each weapon has its own page: level and XP, DPS big; a tap on DPS opens its TREE one layer at a time (14 §3.2), down to the real sum; six attributes that open today's preview unchanged. | 2 PRs |
| 4 | UI2-gear | Gear is two panels: bag and worn. Tap a bag item: the worn side becomes its summary in the TRANSFORMATION form (14 §3.1): now, if equipped, the change. Tap a worn item: the bag side becomes its summary. "Details" opens ONE item page, the same from anywhere. | 3 PRs |
| 5 | UI2-who | Tap a player in the world: the same Bro pages, read-only, named as theirs on every page (14 §2.1), with their real levels, gear, stats and placed points, sent by the server; the social actions in a fixed row at the bottom (14 §5.3); "compare with me" in the same comparison form. | 2 PRs (one deploys the worker) |
| 6 | UI2-quests, UI2-ranks, UI2-codex, UI2-life, UI2-deeds, UI2-pets | Quests opens on your active quests as rows; a quest shows what is done and what is NOW, never what is to come. Ranks: one number a row, a tap opens that player. Codex: by type, monsters first. **Life Skills**: the sum of your levels big, ten doors each with its level and bar; a skill's page with its whole roadmap of unlocks (14 §3.3, §4.1). **Accomplishments**: AP big and where it came from; achievements by tier, then a gallery of medals; Titles; career highlights (14 §4.3). **Pets**: your companion first, then Owned and All (14 §4.4). | 6 PRs, one a screen |
| 7 | UI2-social, UI2-map, UI2-notify, UI2-home | **Social** as the network: you in the middle, Friends, Clan, Party, Nearby round you (14 §5). **Map**: Geography and Connections, a region, its own map with what it holds (14 §7). **Notifications**: one list, a tap goes to the real page (14 §2.3). **Homestead**: a small picture of your REAL farm; the planned things marked "not in the game yet" (14 §6). Settings under the same header. | 4 to 5 PRs |
| 8 | UI2-rest | Every shortcut on the world lands on the same pages; the old row, the More page and the old player window are deleted; the document's part 10 tasks and the addendum's (14 §9) run as phone tests. Then the owner's review of every screen plain, and only then the visual phase. | 2 PRs |

**Where each of the addendum's pieces lands** (built once, there):

| The piece (addendum) | Rule and component | Built in | Used again by |
|---|---|---|---|
| The Menu shortcut on deep pages (14 §2.1) | `dashNav.js` (a "to the Menu's root" move), `DashHeader` | 1 | every page |
| Whose page it is (Q46) | `DashHeader` takes a `who` | 1 (the prop), 5 (its use) | 6, 7 |
| The growing and shrinking motion (Q47) | each stack entry of `dashNav.js` keeps its origin (phase 1, rules only); the CSS and its switch | 1b | every page |
| The zones of a screen, the action row, the empty and locked state, the one confirmation (Q48, 14 §2.3) | `src/game/screenZones.js`; `Zones`, `ActionRow`, `EmptyState`, `Confirm` | 2 | every page |
| The branching stat tree (Q50) | `src/game/metricTree.js` (replaces the first plan's `metric.js`), read out of `calcDisplayDps` itself | 3 | Shared (Max HP now, effective health when decided), movement, critical chance, AP's sources (6) |
| The level, XP and roadmap piece (Q51, Q52) | `src/game/progression.js` | 3 (a weapon's level and XP) | 6 (a life skill's whole roadmap) |
| The transformation comparison (Q49) | `src/game/compare.js` (the first plan's `equipProject.js` feeds it) | 4 | 5 (you and another player); pets and Codex items when there is something to compare |
| The Life Skills overview, its sum and radar (Q58) | `src/game/lifeProfile.js` | 6 (UI2-life) | 5 (another player, from the worker's levels) |
| The two labels (Q59, Q60) | `src/game/identityLabel.js` | 6 (UI2-life), shown on Bro's Character | 5 |
| The notifications' one route (14 §2.3) | `src/game/notify.js` over today's toast bus | 7 (UI2-notify) | every event that wants a toast |
| The Social network's home (Q62 to Q65) | `src/game/socialNet.js` | 7 (UI2-social) | |
| The estate's miniature (Q66 to Q68) | `src/game/estateView.js`, from the farm's record and `farmLayout.js` | 7 (UI2-home), the look only | later, when the owner's gameplay exists |
| The map's two views and a region's page (Q71, Q72) | `src/game/worldGraph.js`, from the plan | 7 (UI2-map) | the Codex's Locations |

### Phase 1, UI2-nav: the two workspaces, the one header, the history

- **Purpose.** A player always knows where they are and how to get back, and the band remembers. This is the frame every later phase hangs its pages in, so it comes first; and it is small because every page inside it is today's page, untouched.
- **Rules:** `src/game/dashNav.js`: ONE state (which workspace is up, each workspace's own stack of pages, whether the band is hidden) with ONE transition function (open Gear, open Menu, go to a page, Back, Close, a shortcut's arrival, and since 14 §2.1 the Menu shortcut: to the Menu's ROOT, where the ordinary way in resumes); each stack entry keeps its page's scroll and selection, and since the addendum whose page it is (`who`) and where it grew from (its origin: a tile's cell, a tap's point or none), so phases 1b and 5 add no state. Suite `server/test/dash-nav.test.mjs`. `src/game/dashDests.js`: the table of destinations (id, word, picture, where it lives in the Menu), which later phases add rows to instead of editing the shell.
- **Files:** `src/ui/mobile/BottomDashboard.jsx` (calls in, lines out), `dashboardPanelBus.js` (a thin face over `dashNav`, so every existing caller and test keeps working), `dash/NavRail.jsx` and `dash/MorePanel.jsx` (kept for `?ui2=0`), new `dash/DashHeader.jsx` and `dash/MenuGrid.jsx`, `src/game/deskKeys.js` (the keys keep opening their pages; O opens Menu), the switch table, `states.mjs`, the notes.
- **Phone tests:** `mp-ui2nav` (Gear and Menu; each tile opens its page; Back says where it goes and goes there; Close and reopen resumes; scroll kept; the band's height equal to today's to the pixel, upright, sideways and on a computer; `?ui2=0` gives the old row). Part 10's ninth task (interrupt a deep page, play, resume; Back follows the real journey) is this test.
- **Switches:** adds `ui2`. Retires none.
- **Beside it:** nothing else may hold `BottomDashboard.jsx`, `dashboardPanelBus.js` or `NavRail.jsx`. Card PAD's PR touches none of them. It does not touch `BroTown.jsx`.
- **Size (when the owner has said the design is complete):** PR 1 the frame, reachable by `?ui2=1` (remembered) so the owner tries it on their phone with nothing else moved; PR 2 turns it on for everyone once the owner likes it and moves the 21 phone tests that press the old row's buttons to one harness helper. (Question 3 can fold these into one.)

### Phase 1b, UI2-motion: the page grows out of what you tapped (new, v2.3.6402)

- **Purpose.** The motion itself tells a player that this page is INSIDE that one (14 §2.2, the owner's Q47).
- **Why its own PR, and why here.** It is small and has one risk the frame does not have (a stutter on a real phone), so it should not hold the frame up; and it should come before phase 1 is turned on for everyone, so the owner tries frame and motion together. It lands on (under `ui2`), with its own way off, `?dashgrow=0`, remembered.
- **How.** The origin is already in `dashNav`'s stack entry. `dash/DashPage.css` (or the band's existing stylesheet): the page's container scales and fades from that origin in about 220 ms (the band's own timing, `sheet/motion.js`), back again on Back; a change of workspace or a jump to the Menu's root does not grow from anything (14 §2.2's own exception); a shortcut from the world grows from the centre. `prefersReducedMotion()` switches it off. Nothing is measured (the rule above).
- **Phone test:** `mp-ui2nav` gains: the motion's class is on and comes off (read as a state, never timed); taps during it are not lost; `?dashgrow=0` and reduced motion give none. `mp-heldsweep`'s dashboard station within its budget, said in the PR body with where it was measured (`finish.md` part 5, rule 4).

### Phase 2, UI2-bro: the hub and the Character card

- **Purpose.** Bro answers "who am I" first and sends you to the detail by a named door, for yourself now and for any player later.
- **Rules:** `src/game/hub.js` (a destination hub: primary and secondary doors, what each says) and `src/game/broHub.js` (Bro's six; what Character shows), built from `broPages.js`. The layout pieces every later phase reuses are made here and proved on this screen: `Hub`, `IdentityHead`, `Cells` (the invisible grid: quiet sunk cells for facts, raised ones for things you press), and since the addendum (Q48, 14 §2.3) `Zones` (header, identity, summary, deeper, actions; an empty zone gives its room back), `ActionRow`, `EmptyState` and the one `Confirm`, with the rule `src/game/screenZones.js`. The identity head has AP and room for the two labels (Q60); the labels themselves come with UI2-life and show nothing until the owner has set their thresholds. The Homestead link on the hub (14 §6.4) waits for its place to be decided: until then Homestead is reached from the Menu.
- **Files:** `sheet/BroCard.jsx`, `BroPages.jsx`, `src/game/broPages.js`; `SkillsPanel`, `AchievementsPanel` and `PetsPanel` only gain the header (their content is untouched until phase 6's UI2-life, UI2-deeds and UI2-pets).
- **Phone tests:** `mp-ui2bro`; part 10's first task (find your combat level, then your Bow level).
- **Switches:** retires `bropages` (the three-column card of before 2026-11-25 is deleted; the three pages of 2026-11-25 stay behind `?ui2=0`).
- **Beside it:** not beside phase 3 (both hold the Bro files).

### Phase 3, UI2-combat: the four channels

- **Purpose.** One page a weapon, with DPS as its headline and the way down from a number to its reasons.
- **Rules:** `src/game/metricTree.js` (since the addendum's Q50, in place of the first plan's `metric.js`: a headline number as a TREE shown one layer at a time: a node's value, its branches, the operator that joins them, a leaf's source, an item or a placed point or a base value). DPS's real tree (the audit's 14 §3): the average hit, what critical hits add, the seconds a swing takes, and the display's scale; `calcDisplayDps` is changed to hand back its parts with its total, from the same lines, so there is never a second sum and the mirror tests keep holding. `src/game/progression.js` (level, XP now and needed, and a roadmap; a weapon's roadmap is its points, since a weapon's level unlocks nothing with a name). `src/game/combatHub.js` (the four doors; each pool's words). The preview (`InfoPopup`, `StatDemo`, `statPreview.js`, `statSim.js`) is hosted, not rewritten.
- **Files:** `sheet/HeroExpanded.jsx` (its Build section's lanes move out to `sheet/WeaponPage.jsx` and `sheet/SharedPage.jsx`; its lines fall), `InfoPopup.jsx` (a read-only mode for phase 5).
- **Phone tests:** `mp-ui2combat`; part 10's second and third tasks (DPS and where it comes from; a tentative point, its effect, cancel, confirm; the pools do not leak).
- **Waits on:** question 4 (the points rule's words) and question 5 (effective health). Until 5 is answered the Shared page's headline is Max HP with Defense beside it: numbers the game has.

### Phase 4, UI2-gear: two panels and the one item page

- **Purpose.** One place that says what an item IS, and a Gear tab where "should I wear this" is answered by what happens to YOU.
- **Rules:** `src/game/itemInspect.js` (one model of an item's facts and of the actions allowed by context and by whose it is, from `resolveItemCard` and `itemActions.js`), `src/game/compare.js` (since the addendum's Q49: ONE comparison for every system, in the transformation form: two labelled subjects, each row's value now, compared value and signed change, a percentage only where it means something, each row's better direction, and the honest edges: nothing worn, zero, the same, worse, cannot be compared), `src/game/equipProject.js` (your numbers now and if equipped, by the same reader as the Bro pages, handed to `compare.js`; the plain-words tradeoff line of the baseline's part 4.1 stays under the rows where there is room), `src/game/gearView.js` (management, quick look from the bag, quick look from worn, full: one state).
- **Files:** `dash/GearTab.jsx`, `ItemDetailPopup.jsx`, `ItemTooltip.jsx`, `dash/gearStats.js`; Bro's Equipment page (`sheet/CharacterView.jsx` moves there).
- **PRs:** (a) the item page, used first by Gear's "Details"; (b) the two panels and the quick looks; (c) Bro's Equipment page, and the other item screens moved onto the item page.
- **Phone tests:** `mp-ui2gear`; part 10's fifth and eighth tasks.
- **Waits on:** Gear's words and bars (asked when this phase comes: the list under the ten). **Beside it:** may run beside phase 3 (different files; both add to `states.mjs` and the notes: merge `main` once).

### Phase 5, UI2-who: another player's page

- **Purpose.** The same pages for any player, from the server's own facts.
- **Server (one PR, deploys the worker):** a request `inspect_request` and its answer `inspect_card` (the three levels, worn items with their stats, the worked-out stats, the placed points; never the bag, coins, stashes, quests or unspent points); its action row, its `in` and `out` wire rows with the trust of its one field, a cap on its own line, the kill switch `inspect`, a pace; suite `server/test/inspect.test.mjs`; `peer-view.test` extended. Read `docs/ARCHITECTURE-HANDOFF.md` first.
- **Client (one PR):** `src/game/playerInspect.js` (self or other: what is shown, which actions exist); the Bro pages take a `who`, and the header names whose page it is on every page (Q46); the world's tap, the friends' Profile and (in phase 6) a Ranks row all arrive at it; `InspectPlayerPanel`'s dock becomes the bottom `ActionRow` (14 §5.3: Party, Trade, Friend, Duel in fixed places, each by today's own conditions; Message there for a mutual friend, as the game's rule is; Mute, Block and Report behind one "more"); "compare with me" opens `compare.js` with the two players as its subjects.
- **Phone tests:** `mp-ui2who` (two phones); part 10's fourth task.
- **Waits on:** question 6. One line in `BroTown.jsx` (the tap): ask the card that holds that file first.

### Phase 6: the screens, one card each (side by side where their files differ)

- **UI2-quests.** Rules in `src/game/questPages.js`: the landing list, the journey that stops at NOW (the grey steps to come are removed: decided twice now, part 5 and 14 §3.3). Retires `questpages`. Test: part 10's sixth task.
- **UI2-ranks.** Rules in `src/game/ranksPage.js`: the groups, the row's one number, when your row is pinned, the row's tap and the way back. Retires `rankstyle`. Test: part 10's seventh task. The tap needs phase 5. A board for the combined life-skill level is NOT in it: the addendum did not confirm it, and it needs the worker to sum its own levels (asked below).
- **UI2-codex.** `src/game/codexView.js`: the root by type, the monster inspector, a drop's link to the item page. Needs phase 4's item page. A Pets section, when there is one, is the Pets page's "All" (one piece, 14 §4.4).
- **UI2-life** (new). `src/game/lifeProfile.js` (the sum of the ten levels, moved out of `BroCard.jsx`; the radar's ten values on one scale) and `src/game/identityLabel.js` (the two labels: built to the owner's thresholds, showing nothing until there are any); `skillsModel.js`'s `skillUnlocks` gives the WHOLE ladder; `dash/SkillsPanel.jsx` becomes the overview (the sum, the radar, ten equal doors each with its level and small bar) and a skill's own page (`progression.js`: level, XP, the roadmap, a milestone opening its real requirement and benefit). A skill with no ladder in the game says so. Test: the addendum's third task (14 §9).
- **UI2-deeds** (new). `src/game/deeds.js` (AP and its sources as the phone can truly split them; the four tiers with their counts; a title as its achievement's name and `clue`; the one real family; the career highlights from the counters that exist). `dash/AchievementsPanel.jsx` becomes the hub (AP large, then Achievements, Titles, Quest History, Lifetime Records), a tier's gallery, a medal's page, the Titles page; `JourneyPanel.jsx` becomes the highlights and "all records". Discoveries is left out until the game keeps something to show. Test: the addendum's fourth task.
- **UI2-pets** (new). `dash/PetsPanel.jsx` in three: the companion (or the empty state it has today), Owned, All (today's Journal). No stat is added to a pet.

### Phase 7: Social, the Map, notifications, Homestead (four cards)

- **UI2-social.** FIRST a measured sketch of the network at the real sizes (178 px upright, 78 px sideways, a computer), shown to the owner, before code. `src/game/socialNet.js`: each circle's true count, which few faces (only players whose look the phone holds: still faces, never invented ones), its empty state. Friends, Party and Nearby from what exists (`SocialPanel`, the party's list, the room's player list); Clan as question 7 decides. The skill guilds are reached from Life Skills and from a door inside Social. No server change in this card: faces for friends who are away, if wanted, are a later card with its cost said first.
- **UI2-map.** `src/game/worldGraph.js`: the regions and the real ways between them, worked out from the plan (the hub, the eight lands, the two passes between neighbours, the gates), with a suite that holds it to the plan; no coordinate in code or test. Geography is today's map; Connections is the graph; a region opens its own view with a row of categories and true counts, only for categories the game can count (the audit's 14 §7). Where it all lives is question 8.
- **UI2-notify.** `src/game/notify.js`: one model (informs, or needs an answer; the page a tap opens), fed by the events the phone already receives; today's toast bus is its toast side; the centre is its list, kept for the session. Each request keeps its own messages and its own lapse.
- **UI2-home.** `src/game/estateView.js`: the real beds in their real layout and state, from the farm's record and `farmLayout.js`; a bed opens its detail; "how to get there". Looking only, as question 9 decides. Every planned thing has its place and an honest "not in the game yet".
- Settings (with Account, Feedback and About inside) under the same header.

### Phase 8, UI2-rest: the shortcuts and the clean-up

- Each shortcut the documents list that the game can honour (a level-up to its skill's page; a party tag to the party's page; a notification to its page).
- Deletes: `NavRail.jsx`'s row, `MorePanel.jsx`, the old profile window, the old `MapPanel` page, today's Bro, Quests and Ranks versions, and then the `ui2` switch itself, once the owner says the old dashboard is no longer wanted.
- `mp-ui2tasks`: all ten of part 10's tasks and the addendum's (14 §9) that the game can play, in one run; the tenth (nothing clipped, nothing overlapping, the height unchanged) on the three sizes the phone tests use. The addendum's Homestead task is not run: it begins "When Homestead features become available".
- Then the owner's review of every screen plain. The visual phase is not planned here: the document asks that it wait.

## What waits for gameplay (moved LATER by the addendum's own words, or by the audit)

Nothing in this list is built by the dashboard's work. Each has its place on its page, with an honest empty state that says what is absent and, where the game has a way, how to get it.

| What the addendum draws | What the game has today | It waits for |
|---|---|---|
| Buying more farmland (14 §6.1) | six beds; the farm's own spec plans paid land | the owner's farm work |
| A farmhouse you build, its inside view and its building plan (14 §6.3) | a fixed house with a place to sleep | the owner's farm work |
| Furniture in the house (14 §6.1) | a workshop list that places nothing and that the server does not know (treated as dormant) | the owner's farm work |
| Pets that live on the farm (14 §4.4, §6.1) | pets are a list; the Pet House is a door to the Pets page | the owner's farm work |
| Visiting another player's property, and seeing it on their profile (14 §6.4) | your farm is private to you | the owner's farm work, and a server message with its cost |
| Storage at the farm | the bank, which stays | nothing: not to be built |
| A Clan circle of its own (14 §5.1) | clans are parties | question 7 |
| Living, moving figures in Social (14 §5.1) | a still face, for players whose look the phone holds | a budget for memory and frames; looks from the server |
| Effective health, as a headline and in comparisons (14 §3.1) | no such number | question 5 |
| A medal's progress (14 §4.3) | earned or not, and a hint for a few | counters the game does not keep; not asked for |
| Title families (14 §4.3) | one real family (combat level 10, 50, 100) | more achievements that follow one another |
| Lifetime records on ANOTHER player's page (14 §4.3) | counted by each phone; the server has kills, kills by kind, the biggest fish | the server counting the rest; not asked for |
| Discoveries (14 §4.3) | nothing the server keeps | a decision to track them |
| The two labels (14 §4.2) | nothing | the owner's thresholds |
| A board for the combined life-skill level (14 §4.1) | a board a skill; the sum only on your own card | the owner's yes, and a small server change |
| Comparing two pets, or a Codex item (14 §3.1) | a pet has a level and a ward | something to compare |
| A region's monsters, resources and townsfolk as lists (14 §7.2) | the data is in the world's bakes; no table reads it by region | a small table made from the bakes |
| Fast travel, routes, tracking on the map | none | not to be built (14 §7.1) |

## What to take back to the design conversation

Ten facts about the game as it is today, most important first, each written to be pasted as it stands. They are where the two documents say something the game does not do, or draw something the game does not keep. They are facts, not questions to us.

1. **Points.** Shared (character) points are earned only when my BEST weapon levels up, not on every weapon's level-up: a 3 / 3 / 3 player and a 3 / 1 / 1 player have the same shared points. And a weapon's own points may also be spent on body stats, so the pools are not sealed from each other. (I agreed this on 2026-10-21 for simplicity.)
2. **Clan, Party, Guild.** There is no clan apart from a party. A party is one lasting group: it is saved, holds up to 50 members online or not, lasts until I leave it, and becomes an "alliance" with a tag and a name at 20 active members. "Guilds" are the ten skill guilds every player is in automatically, ranked by that skill's level; no guild is run by players. There is no clan or guild profile.
3. **Another player.** I can inspect another player only while they are online and near me, and what I see (levels, item names) is what THEIR phone reports. The server does not yet send another player's real stats, item stats or placed points; an offline player has no page. Outside the world the game can draw a player only as a still face, not a moving sprite, and only for players near me or on a leaderboard: an offline friend has no picture.
4. **The numbers.** There is no effective health number. DPS exists as one total with no breakdown stored: it is the average hit, plus what critical hits add on average, divided by the seconds a swing takes. Element is not part of DPS. Today's item comparison shows a signed amount, never a percentage, and compares armour piece against piece ("Damage cut"), not by what happens to my character.
5. **Records.** Lifetime records are counted by each player's own phone, not the server: monsters killed, bosses, deaths, gold earned, gold spent, time played, quests completed, duels won, ores mined, fish caught. Not counted at all: a total of resources gathered, distance, items crafted. The server itself keeps kills, kills by kind of monster and the biggest fish. Discoveries are not tracked.
6. **Achievements and titles.** Achievements already have four tiers: Common (10 AP), Rare (100), Arena (500), Super-rare (1,000). An achievement is earned or not: there is no "7 of 10" progress. There is no separate list of titles: a title is the name of an achievement I have earned. Only one family of titles follows on (Blooded, Veteran, Centurion, at combat level 10, 50, 100). AP also comes from quests (5 each), guild quests and the arena.
7. **Skills.** Ten life skills: woodcutting, fishing, mining, farming, cooking, blacksmithing, woodworking, gem cutting, enchanting, trapping. They have no top level. Real unlocks by level exist for some (fish, trees, ore, smithing, cooking, crops), not all. A weapon's level unlocks nothing with a name, only its 3 points. A skill's page already shows its level, XP bar and next unlock. There is no board for the combined life-skill level, no radar and no specialisation label.
8. **The farm and pets.** The farm is a private place I walk to from town: six beds, sixteen crops, a fixed house to sleep in and a Pet House (a door to the pets page). There is no buying land, building, placing furniture or visiting, and the farm cannot be managed from the dashboard. Storage is the bank in town. Pets exist: caught by trapping, nine kinds in two stages, one out at a time, each with a level, XP, a name I give it and a ward against one element; I hold 30, or 40 with the Pet House. The Codex has no pets section.
9. **The map.** The map is a full-screen window over the world, not a dashboard page. It already pans and zooms and marks me, my party, players near me, my quest's target and pins I place; a tap drops a pin; nothing selects a region. The world is a town in the middle with eight lands round it (Frost, Ember, Sky, Hollows, Thunder, Tidal, Mist, Verdant) and two realms beyond their tips. Every land touches the town, and each is joined to its two neighbours by two passes across the sea (about levels 20 and 60). There is no fast travel.
10. **The room, and three small things.** The dashboard's page is about 178 px tall on a 390 x 844 phone, under a 52 px row, and about 78 px tall with the phone sideways: every wireframe has to fit that. A page change has no motion today. The page called Notifications is the chat's last lines, and each request (friend, party, duel) has its own pop-up: there is no list of notifications. The Codex is monsters only and hidden until the first kill; quests have no story text.

Where each comes from in the code: the audit, both halves.

## The owner's questions

### What the addendum did to the first ten (v2.3.6402)

The first plan asked ten. The addendum, written before the owner had seen them, answers none of them whole and two of them in half; it also raises new ones: four are in the ten below (7 to 10) and five more are under it. So:

- **Old 1, the Menu's eight: stands** (14 §8 still lists the directory's labels and order as open). One piece of it is settled: Guilds are not at the front of Social (14 §5.1).
- **Old 2, closing and getting home: half answered.** The small Menu button on a deep page is now the owner's decision (14 §2.1) and is no longer asked. The closed band's two buttons still are.
- **Old 3, how phase 1 arrives: stands**, and now carries the growing motion.
- **Old 4, the points rule: stands.** (The addendum repeats that combat level is the best weapon's, which is what the game does.)
- **Old 5, another player's page: stands** (now question 6).
- **Old 6, effective health: stands** (now question 5; the addendum says again that its formula is unresolved).
- **Old 7, Quests: half answered.** The steps still to come are removed: the addendum says a second time that a quest's future stays hidden (14 §3.3). Story and Locate are asked when the Quests card comes.
- **Old 8 (the Codex), 9 (Ranks) and 10 (Gear's words and bars): stand, unchanged**, and move under the ten: each holds up only its own later phase, and the addendum's new questions matter sooner, because the owner is still designing on top of them.

### The ten, as they stand

In order, kept for when the owner says the design is complete: no phase starts on them before that. The first three are the ones phase 1 will need then. After each: what I would pick, and why.

1. **The Menu's eight.** Today's More page has fifteen things. Is this sorting right: the eight tiles are **Bro, Quests, Social, Ranks, Codex, Homestead, Map, Settings**; Party is inside Social; the skill Guilds are reached from Life Skills and from a door inside Social; Pets, Life Skills and Achievements are inside Bro; Journey becomes Bro's lifetime records; Account, Feedback and About are inside Settings; Notifications stays reachable from Settings until its own list is built? *Pick: yes.* Nothing is lost and each has one home. Homestead opens a small page with what the game already knows away from the farm (how many plots are ready, and where the farm is).
2. **The closed band.** When the band is closed, should two buttons stay at the bottom, **Gear** and **Menu**, in the same slim row the buttons sit in today? *Pick: yes.* Two buttons is not the crowded bar, and with the Menu button you have already decided for deep pages it makes every place one or two taps from Gear and from the Menu's first page, with no hidden gesture.
3. **How phase 1 arrives, and the growing motion.** Pick one: (a) the new frame lands switched off, you open one address once on your phone (it is remembered) and say when you like it; the growing motion follows as its own small step, also for you to try; then both become everyone's; or (b) it all lands switched on at once, with `?ui2=0` as the way back. *Pick: (a).* It keeps each step small, and the motion is the one part that can only be judged on a real phone. One thing to know: a page will grow from the PLACE of the tile you tapped, not morph from its exact outline, because the game's speed rules forbid measuring the screen at a tap; at 220 ms the eye reads it the same.
4. **The points rule.** The document says every weapon level-up gives 3 shared points (so a 3 / 3 / 3 player has 18, a 3 / 1 / 1 player 6). The game today gives shared points only when your BEST weapon levels up (both players have the same), which you agreed on 2026-10-21 for simplicity; and a weapon's points may also be spent on body stats. Should the new screens show the game's rule as it is today? *Pick: yes.* Changing it is a balance change and deserves its own decision, not a screen's.
5. **Effective health.** The game has no such number, and the addendum's comparison needs it for armour. Proposed meaning: "how much damage a plain hit from a monster of your own level must deal before you fall", from Max HP, Defense and armour; with Dodge, Block and Resist shown beside it as chances, not mixed in. Is that the meaning you want? *Pick: yes*, and until you say so the Shared page leads with Max HP and armour is compared by "Damage cut", the number the game has.
6. **Another player's page.** For a player who is ONLINE the server can send their real levels, gear, stats and placed points at no cost. For a player who is OFFLINE (a name on the Ranks) it would have to read their saved record each time, which costs a little money per look. Should an offline player's page show only what the Ranks already hold, and the full page only for online players? And since lifetime records (gold earned, time played) are counted by each player's own phone, should another player's page show only the records the server itself keeps (kills, the biggest fish)? *Pick: yes to both, for now.*
7. **Clan and Party.** Your Social picture has four circles: Friends, Clan, Party, Nearby. In the game today a clan IS a party: one group that lasts until you leave it, holds up to 50, and becomes an "alliance" with a tag at 20 active members; the server will not make a separate clan. So two circles would show the same people. Pick one: (a) **Party** is the people of your group who are playing right now, and **Clan** is the whole group, online or not (and reads "Alliance" once it is one); (b) keep the Clan circle in its place with an honest "no clans yet" until clans come back as their own thing; (c) three circles. *Pick: (a).* Four circles as you drew them, every one true, and no new mechanic.
8. **Where the Map lives.** Today the map is a full-screen window over the world, with pan, zoom and your pins. Your addendum draws the map inside the dashboard, whose page is about a fifth of the screen tall: real terrain there would be a postage stamp. Should the Menu's Map tile keep opening the full-screen map, with the Geography / Connections switch and the regions inside THAT, and the band underneath showing the chosen region's summary (Monsters, Resources, and so on)? *Pick: yes.* It keeps what works and gives the terrain the room it needs.
9. **Homestead: look or manage.** The Homestead page can show a small picture of your real farm (each bed and what is growing) from anywhere. Should it only SHOW, with "go to your farm" to plant and harvest as today; or should you be able to plant and harvest from the page, anywhere in the world? *Pick: show only.* Managing from anywhere changes how the farm is played, which is a game decision of its own. Everything you listed as planned (more land, your own house, furniture, pets on the farm, visiting) gets its place on the page marked "not in the game yet", and none of it is built by this work; storage stays at the bank.
10. **The medals.** You asked for achievements in medal tiers and gave gold, silver and bronze as examples. The game already grades every achievement in four tiers that you named and coloured: **Common, Rare, Arena, Super-rare**. Use those four as the medal tiers, with no achievement or point value changed? *Pick: yes.* Two things to know: an achievement is earned or not (the game keeps no "7 of 10" for one), and only one family of titles truly follows on (Blooded, Veteran, Centurion); the rest are single rows, as you asked.

### Asked when their phase comes, each with its pick

- **Quests** (phase 6): the game has no quest Story text and no Locate; leave Story out and keep "Show on map" as the locate button. *Pick: yes.*
- **The Codex** (phase 6): open every monster fully and keep the kill count only as a record; begin the new sections with Items. *Pick: yes to both.*
- **Ranks** (phase 6): rename the four tabs to match Bro (Combat, Life Skills, Accomplishments), no Equipment tab until a board exists. *Pick: yes.* And the addendum's suggestion, a board for the combined life-skill level: *pick: yes, later, as its own small server step*, because the server must add up its own levels (the total it holds today is what each phone reported).
- **Gear's words and bars** (phase 4): keep Chest, Legs and Gem; the health, mana and energy bars on the world's own screen are enough when the middle panel goes. *Pick: yes to both.*
- **The two labels** (phase 6): the rule that names you. Proposed: "(weapon) Specialist" when one weapon is at least 10 levels above your next; "Jack of All Trades" when all three are within 5 of each other and at least level 10; no label below level 10; the same for life skills over the ten. These numbers are mine, to be changed: *nothing is shown until you have set them.*
- **The radar's top** (phase 6): life skills have no top level in the game, so every player's radar needs one fixed top to be comparable. *Pick: the level of the highest real unlock among the ten.*
- **Notifications** (phase 7): the list is kept while you play and starts empty when you open the game again; keeping it across days needs the server to store it (a small running cost). *Pick: while you play, for now.*
- **Faces in Social** (phase 7): the game can draw a still face only for players near you or on a board. Faces for friends who are away need the server to send their look (a small cost). *Pick: begin without; decide after you have seen the network.*
- **A weapon's roadmap** (phase 3): a weapon's level unlocks nothing with a name, only points. *Pick: show the level, the XP and "3 points a level", and no empty milestones.*
- Still open from the first plan: what a clan or guild "profile" should be; the Codex's other sections; the headline number for items that are neither weapons nor armour.
