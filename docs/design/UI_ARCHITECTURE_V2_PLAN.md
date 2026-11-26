# The dashboard's new architecture: the phases (v2.3.6401)

The plan for the owner's document (`UI_ARCHITECTURE_V2.md`), made from the audit beside it (`UI_ARCHITECTURE_V2_AUDIT.md`). It is a PROPOSAL until the owner says yes: nothing here is built yet, and a line of it becomes a decision only when the owner's words go into the document's part 13. Each phase is a card to be; phase 1's is drafted (`docs/plan/cards/UI2-nav.md`).

## The rules every phase keeps

- **One way back.** The whole new dashboard sits behind ONE switch, `ui2`. `?ui2=0` gives back today's dashboard (the six-button row and today's screens), remembered on that phone. One row in the switch table (`tools/guards/lib/switches.mjs`). The way back stays until the last phase removes the old screens.
- **The band's height never changes.** The one header takes the place of today's 52 px button row; a page keeps today's room (178 px on a 390 x 844 phone). Sideways the band keeps today's cap.
- **No rule of the game changes.** Where the document's rule and the code differ, the screen shows the game's rule as it is and the difference is a question below.
- **Nothing is removed.** Every page and action reachable today is reachable after each phase; a phase's card lists them and its phone test opens each.
- **Rules as modules** (`finish.md` part 5, rule 5): each phase's rules land under `src/game/` with a suite that tests what they do; `BottomDashboard.jsx` (2,035 lines), `HeroExpanded.jsx` (3,539), `GearTab.jsx` (1,231) and `ItemDetailPopup.jsx` (1,978) gain calls and their lines fall.
- **Structure before looks.** Every phase uses the game's existing slate (`docs/LANTERN-SLATE-SPEC.md`) and existing pictures. No new art, bevel, shine or animation until the owner has seen every screen plain and opens the visual phase.
- **The same-change rows** of CLAUDE.md §8 for each new screen: `states.mjs`, its section in `docs/UI-DESIGN-NOTES.md` (with the owner's words from the document), `data-esc`, keys in `deskKeys.js`, `deskWords()`, `touch-action`, layout reads by the spec's ways, a phone test with `world: 'wheel'`.
- **The older fallbacks go as their screen is replaced.** `?bropages=0`, `?questpages=0` and `?rankstyle=0` each keep a screen from BEFORE 2026-11-25 alive. When a phase replaces that screen, the phase deletes that older fallback and its switch, so there are never more than two versions of a screen: today's (behind `?ui2=0`) and the new one.

## The phases

| # | Card | What the owner opens on their phone when it lands | Size |
|---|---|---|---|
| 1 | UI2-nav | Two buttons where six were: **Gear** and **Menu**. Menu is a grid of eight pictures with words. Every page has one top line: Back (saying where it goes), the page's name, Close. Close the band mid-page, open Menu again: you are where you were. | 2 PRs |
| 2 | UI2-bro | Bro opens on six doors: Character, Combat, Equipment, and under them Life Skills, Accomplishments, Pets. Character is your card (portrait, name, title, level, the three weapon levels). No page marks. | 2 PRs |
| 3 | UI2-combat | Combat shows four doors: Sword, Bow, Staff, Shared. Each weapon has its own page: level and XP, DPS big, a tap on DPS shows where it comes from, six attributes that open today's preview unchanged. | 2 PRs |
| 4 | UI2-gear | Gear is two panels: bag and worn. Tap a bag item: the worn side becomes its summary ("DPS now, DPS if equipped"). Tap a worn item: the bag side becomes its summary. "Details" opens ONE item page, the same from anywhere. | 3 PRs |
| 5 | UI2-who | Tap a player in the world: the same Bro pages, read-only, with their real levels, gear, stats and placed points, sent by the server. | 2 PRs (one deploys the worker) |
| 6 | UI2-quests, UI2-ranks, UI2-codex | Quests opens on your active quests as rows; a quest shows what is done and what is NOW, never what is to come. Ranks: one number a row, a tap opens that player, Back returns to the same spot. Codex: by type, monsters first, a drop opens the item page. | 3 PRs, one a screen |
| 7 | UI2-rest | Social, Homestead, Map and Settings under the same header; every shortcut on the world lands on the same pages; the old row, the More page and the old player window are deleted; the document's part 10 tasks run as phone tests. Then the owner's review of every screen plain, and only then the visual phase. | 2 to 3 PRs |

### Phase 1, UI2-nav: the two workspaces, the one header, the history

- **Purpose.** A player always knows where they are and how to get back, and the band remembers. This is the frame every later phase hangs its pages in, so it comes first; and it is small because every page inside it is today's page, untouched.
- **Rules:** `src/game/dashNav.js`: ONE state (which workspace is up, each workspace's own stack of pages, whether the band is hidden) with ONE transition function (open Gear, open Menu, go to a page, Back, Close, a shortcut's arrival); each stack entry keeps its page's scroll and selection. Suite `server/test/dash-nav.test.mjs`. `src/game/dashDests.js`: the table of destinations (id, word, picture, where it lives in the Menu), which later phases add rows to instead of editing the shell.
- **Files:** `src/ui/mobile/BottomDashboard.jsx` (calls in, lines out), `dashboardPanelBus.js` (a thin face over `dashNav`, so every existing caller and test keeps working), `dash/NavRail.jsx` and `dash/MorePanel.jsx` (kept for `?ui2=0`), new `dash/DashHeader.jsx` and `dash/MenuGrid.jsx`, `src/game/deskKeys.js` (the keys keep opening their pages; O opens Menu), the switch table, `states.mjs`, the notes.
- **Phone tests:** `mp-ui2nav` (Gear and Menu; each tile opens its page; Back says where it goes and goes there; Close and reopen resumes; scroll kept; the band's height equal to today's to the pixel, upright, sideways and on a computer; `?ui2=0` gives the old row). Part 10's ninth task (interrupt a deep page, play, resume; Back follows the real journey) is this test.
- **Switches:** adds `ui2`. Retires none.
- **Beside it:** nothing else may hold `BottomDashboard.jsx`, `dashboardPanelBus.js` or `NavRail.jsx`. Card PAD's PR touches none of them. It does not touch `BroTown.jsx`.
- **Size:** PR 1 the frame, reachable by `?ui2=1` (remembered) so the owner tries it on their phone with nothing else moved; PR 2 turns it on for everyone once the owner likes it and moves the 21 phone tests that press the old row's buttons to one harness helper. (Question 3 can fold these into one.)

### Phase 2, UI2-bro: the hub and the Character card

- **Purpose.** Bro answers "who am I" first and sends you to the detail by a named door, for yourself now and for any player later.
- **Rules:** `src/game/hub.js` (a destination hub: primary and secondary doors, what each says) and `src/game/broHub.js` (Bro's six; what Character shows), built from `broPages.js`. The layout pieces every later phase reuses are made here and proved on this screen: `Hub`, `IdentityHead`, `Cells` (the invisible grid: quiet sunk cells for facts, raised ones for things you press).
- **Files:** `sheet/BroCard.jsx`, `BroPages.jsx`, `src/game/broPages.js`; `SkillsPanel`, `AchievementsPanel` and `PetsPanel` only gain the header (their content is untouched).
- **Phone tests:** `mp-ui2bro`; part 10's first task (find your combat level, then your Bow level).
- **Switches:** retires `bropages` (the three-column card of before 2026-11-25 is deleted; the three pages of 2026-11-25 stay behind `?ui2=0`).
- **Beside it:** not beside phase 3 (both hold the Bro files).

### Phase 3, UI2-combat: the four channels

- **Purpose.** One page a weapon, with DPS as its headline and the way down from a number to its reasons.
- **Rules:** `src/game/metric.js` (a headline number and its breakdown: base, attributes, gear, the sum; every part from the readers the game already uses, `broStats.js` and `calcDisplayDps`, never a second sum) and `src/game/combatHub.js` (the four doors; each pool's words). The preview (`InfoPopup`, `StatDemo`, `statPreview.js`, `statSim.js`) is hosted, not rewritten.
- **Files:** `sheet/HeroExpanded.jsx` (its Build section's lanes move out to `sheet/WeaponPage.jsx` and `sheet/SharedPage.jsx`; its lines fall), `InfoPopup.jsx` (a read-only mode for phase 5).
- **Phone tests:** `mp-ui2combat`; part 10's second and third tasks (DPS and where it comes from; a tentative point, its effect, cancel, confirm; the pools do not leak).
- **Waits on:** question 4 (the points rule's words) and question 6 (effective health). Until 6 is answered the Shared page's headline is Max HP with Defense beside it: numbers the game has.

### Phase 4, UI2-gear: two panels and the one item page

- **Purpose.** One place that says what an item IS, and a Gear tab where "should I wear this" is answered by what happens to YOU.
- **Rules:** `src/game/itemInspect.js` (one model of an item's facts and of the actions allowed by context and by whose it is, from `resolveItemCard` and `itemActions.js`), `src/game/equipProject.js` (your numbers now and if equipped, by the same reader as the Bro pages; the plain-words tradeoff; the honest edges: nothing worn, zero, the same, worse, cannot be worn), `src/game/gearView.js` (management, quick look from the bag, quick look from worn, full: one state).
- **Files:** `dash/GearTab.jsx`, `ItemDetailPopup.jsx`, `ItemTooltip.jsx`, `dash/gearStats.js`; Bro's Equipment page (`sheet/CharacterView.jsx` moves there).
- **PRs:** (a) the item page, used first by Gear's "Details"; (b) the two panels and the quick looks; (c) Bro's Equipment page, and the other item screens moved onto the item page.
- **Phone tests:** `mp-ui2gear`; part 10's fifth and eighth tasks.
- **Waits on:** question 10 (the bars, the cells' words). **Beside it:** may run beside phase 3 (different files; both add to `states.mjs` and the notes: merge `main` once).

### Phase 5, UI2-who: another player's page

- **Purpose.** The same pages for any player, from the server's own facts.
- **Server (one PR, deploys the worker):** a request `inspect_request` and its answer `inspect_card` (the three levels, worn items with their stats, the worked-out stats, the placed points; never the bag, coins, stashes, quests or unspent points); its action row, its `in` and `out` wire rows with the trust of its one field, a cap on its own line, the kill switch `inspect`, a pace; suite `server/test/inspect.test.mjs`; `peer-view.test` extended. Read `docs/ARCHITECTURE-HANDOFF.md` first.
- **Client (one PR):** `src/game/playerInspect.js` (self or other: what is shown, which actions exist); the Bro pages take a `who`; the world's tap, the friends' Profile and (in phase 6) a Ranks row all arrive at it; `InspectPlayerPanel`'s dock (party, trade, duel) is kept.
- **Phone tests:** `mp-ui2who` (two phones); part 10's fourth task.
- **Waits on:** question 5. One line in `BroTown.jsx` (the tap): ask the card that holds that file first.

### Phase 6: Quests, Ranks, Codex (three cards, three PRs, side by side)

- **UI2-quests.** Rules in `src/game/questPages.js`: the landing list, the journey that stops at NOW. Retires `questpages`. Test: part 10's sixth task. Waits on question 7.
- **UI2-ranks.** Rules in `src/game/ranksPage.js`: the groups, the row's one number, when your row is pinned, the row's tap and the way back. Retires `rankstyle`. Test: part 10's seventh task. Waits on question 9; the tap needs phase 5.
- **UI2-codex.** `src/game/codexView.js`: the root by type, the monster inspector, a drop's link to the item page. Waits on question 8; needs phase 4's item page.

### Phase 7, UI2-rest: the remaining pages, the shortcuts, the clean-up

- Social's root (Friends, Party, Guilds); Homestead, Map and Settings as question 1 decides; each shortcut the document lists that the game can honour (a level-up to its weapon's page; a party tag to the party's page).
- Deletes: `NavRail.jsx`'s row, `MorePanel.jsx`, the old profile window, today's Bro, Quests and Ranks versions, and then the `ui2` switch itself, once the owner says the old dashboard is no longer wanted.
- `mp-ui2tasks`: all ten of part 10's tasks in one run, and its tenth (nothing clipped, nothing overlapping, the height unchanged) on the three sizes the phone tests use.
- Then the owner's review of every screen plain. The visual phase is not planned here: the document asks that it wait.

## The owner's questions

Ten, in order. The first three are the ones phase 1 cannot start without. After each: what I would pick, and why.

1. **The Menu's eight.** Today's More page has fifteen things. Is this sorting right: the eight tiles are **Bro, Quests, Social, Ranks, Codex, Homestead, Map, Settings**; Party and the skill Guilds go inside Social; Pets, Life Skills and Achievements go inside Bro; Journey goes inside Bro's Accomplishments; Account, Notifications, Feedback and About go inside Settings? *Pick: yes.* Nothing is lost and each has one home. Homestead would open a small page with what the game already knows away from the farm (how many plots are ready, and where the farm is); it manages nothing until you ask for that.
2. **Closing and getting home.** When the band is closed, should two buttons stay at the bottom, **Gear** and **Menu**, in the same slim row the buttons sit in today? And on a deep page should the top line be: Back, the page's name, a small **Menu** button, Close? *Pick: yes to both.* Two buttons is not the crowded bar, and it makes every place one or two taps from Gear and from the Menu's first page, with no hidden gesture.
3. **How phase 1 arrives.** Pick one: (a) it lands switched off, you open one address once on your phone (it is remembered) and say when you like it, then it becomes everyone's; or (b) it lands switched on at once, with `?ui2=0` as the way back. *Pick: (a).* It keeps the first step small and every existing phone test untouched until you have said yes.
4. **The points rule.** The document says every weapon level-up gives 3 shared points (so a 3 / 3 / 3 player has 18, a 3 / 1 / 1 player 6). The game today gives shared points only when your BEST weapon levels up (both players have the same), which you agreed on 2026-10-21 for simplicity; and a weapon's points may also be spent on body stats. Should the new screens show the game's rule as it is today? *Pick: yes.* Changing it is a balance change (it would hand out more body points to anyone who trains three weapons) and deserves its own decision, not a screen's.
5. **Another player's page.** For a player who is ONLINE the server can send their real levels, gear, stats and placed points at no cost. For a player who is OFFLINE (a name on the Ranks) it would have to read their saved record each time, which costs a little money per look. Should an offline player's page show only what the Ranks already hold (levels, placed body points, power), and the full page only for online players? *Pick: yes, for now.*
6. **Effective health.** The game has no such number. Proposed meaning: "how much damage a plain hit from a monster of your own level must deal before you fall", from Max HP, Defense and armour; with Dodge and Resist shown beside it as chances, not mixed in. Is that the meaning you want? *Pick: yes*, and until you say so the Shared page leads with Max HP.
7. **Quests.** The quest page that landed today shows the steps still to come in grey. The document says never to show them. Remove them, and show "the adventure continues" instead? And since the game has no quest Story text and no Locate, leave Story out and keep "Show on map" as the locate button? *Pick: yes to all three.*
8. **The Codex.** Today a monster's page is hidden ("Not met") until you first kill one, and more opens at later kill counts. The document says everything is open. Open every monster fully and keep the kill count only as a record? And begin the new sections with Items, since only monsters and items have content today? *Pick: yes to both.*
9. **Ranks.** Rename the four tabs to match Bro: **Combat** (today's Power and Stats), **Life Skills**, **Accomplishments** (today's Records), with no Equipment tab until a board for it exists? *Pick: yes.* (The level chip leaving other boards, and your row pinned only when out of view, are already decided by the document.)
10. **Gear's words and bars.** The cells read Chest, Legs and Gem today (your mockup of 2026-11-03); the document says Torso, Greaves and Jewel. Keep today's words? And when the middle panel goes, are the health, mana and energy bars on the world's own screen enough, with the figure moving to Bro's Equipment page? *Pick: yes to both.* The short words are the ones a child reads.

Asked when their phase comes, not now: what a clan or guild "profile" should be (clans are parties and guilds are the skill guilds today); a Homestead page that manages the farm from anywhere (a new mechanic); the Codex's other sections; the headline number for items that are neither weapons nor armour.
