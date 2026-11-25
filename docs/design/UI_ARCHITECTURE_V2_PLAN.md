# The dashboard's new architecture: the phases (v2.3.6401; the addendum's pieces, v2.3.6402; the final addendum's, v2.3.6403; the look's order and the kit, v2.3.6404)

The plan for the owner's document (`UI_ARCHITECTURE_V2.md`: the baseline, parts 1 to 12; the addendum of the same day, part 14, questions 36 to 72; and the final architecture addendum, part 15, questions 73 to 85), made from the audit beside it (`UI_ARCHITECTURE_V2_AUDIT.md`, its three halves). "14 §3.1" is the addendum's own section 3.1, "15 §3" the final addendum's section 3. It is a PROPOSAL until the owner says yes: nothing here is built yet, and a line of it becomes a decision only when the owner's words go into the document's part 13.

**No phase starts yet** (v2.3.6402). The owner, 2026-11-25, with the addendum: *"Do not begin implementation or final visual redesign yet. We are still completing the architectural design process."* So this stays a plan; phase 1 does not start on the answers to three questions.

**The architecture is complete; the order of what follows is the owner's** (v2.3.6403). The final addendum (15 §7), sent with *"Here's more to the plan (this completed architecture)"*: questions 1 to 85 close the foundational architecture; NEXT is the visual language (materials, palette, type, borders and bevels, the states of a control, icons, motion, feedback); THEN pixel-true mockups of representative screens inside the real dashboard's size; and only THEN building, in phases, after the owner's approval. That turns one rule of this plan round ("Structure before looks", below). What the owner needs from this work NOW is two sections: "What to take back to the design conversation" (the facts of the game that the three documents get wrong or could not know) and "The room your mockups must fit" (the dashboard's real sizes). Each phase is a card to be; phase 1's is drafted (`docs/plan/cards/UI2-nav.md`).

**The look's direction is approved; here is the order with the look in it** (v2.3.6404). The owner's fourth document of 2026-11-25, the visual design hand-off (part 16, questions 86 to 108; *"Hers more"*), approves the foundational VISUAL direction: a polished Lantern Slate with the game's own art kept. It builds nothing (*"No implementation until the owner approves production visual direction and screen mockups"*). So the order is now:

1. **Done: the architecture** (questions 1 to 85; parts 1 to 15).
2. **Done: the visual direction** (questions 86 to 108; part 16). Still open inside it, the owner's: the exact font, the exact hues of the five action colours, and the points the audit's "The look" names where the hand-off and the game differ.
3. **Now, the owner's: real-screen mockups.** The Bro (character) landing screen first, then the Universal Menu, then representative deeper screens and workspaces (16, the next phase), at the sizes of "The room your mockups must fit", drawn with the game's REAL colours, fonts, rarity names and pictures: "The kit for your mockups" below.
4. **Then the owner's approval**, in their own words, of the production look and of the mockups. It becomes a line of the document's part 13; nothing below starts before it.
5. **Then the building, in the phases below**, each screen built TO its mockup, behind the one switch `ui2`. One proposal for that time (not decided): the look's own shared pieces (the surface classes, the five action faces with their one dark lettering, the rarity outline, the pressed-in selected state, the locked recipe, the font and its loading) are built ONCE, before or with phase 1, as "One of each piece" asks, so that no screen grows its own copy. They are tokens and classes in the style sheet, CSS only wherever the look allows (the audit's "The laws a look must keep"); new art is made only for the pictures the kit lists as genuinely missing, through `public/tools/style/process.js`.

What the owner needs from this work NOW is three sections: "What to take back to the design conversation", "The room your mockups must fit", and "The kit for your mockups".

## The rules every phase keeps

- **One way back.** The whole new dashboard sits behind ONE switch, `ui2`. `?ui2=0` gives back today's dashboard (the six-button row and today's screens), remembered on that phone. One row in the switch table (`tools/guards/lib/switches.mjs`). The way back stays until the last phase removes the old screens.
- **The band's height never changes.** The one header takes the place of today's 52 px button row; a page keeps today's room (191 px on a 390 x 844 phone; corrected, v2.3.6403: this line first said 178, an old comment's number). Sideways the band keeps today's cap.
- **No rule of the game changes.** Where the document's rule and the code differ, the screen shows the game's rule as it is and the difference is a question below.
- **Nothing is removed.** Every page and action reachable today is reachable after each phase; a phase's card lists them and its phone test opens each.
- **Rules as modules** (`finish.md` part 5, rule 5): each phase's rules land under `src/game/` with a suite that tests what they do; `BottomDashboard.jsx` (2,035 lines), `HeroExpanded.jsx` (3,539), `GearTab.jsx` (1,231) and `ItemDetailPopup.jsx` (1,978) gain calls and their lines fall.
- **The owner's looks first, then the building** (v2.3.6403; it was "Structure before looks"). The first two plans built every screen plain, on the game's existing slate (`docs/LANTERN-SLATE-SPEC.md`), and left the look for a last phase. The owner's order is now the other way (15 §7): the visual language, then mockups at the real size, then building. So no phase starts before the owner has approved the visual direction and the mockups; a phase builds its screen TO its mockup; a screen no mockup covers is built on the approved language's pieces and shown to the owner before it is turned on. The rules under `src/game/` do not depend on the look and are the same either way. No art is made final by a phase (15 §7: "Do not finalize art assets until the visual direction is explicitly approved").
- **The same-change rows** of CLAUDE.md §8 for each new screen: `states.mjs`, its section in `docs/UI-DESIGN-NOTES.md` (with the owner's words from the document), `data-esc`, keys in `deskKeys.js`, `deskWords()`, `touch-action`, layout reads by the spec's ways, a phone test with `world: 'wheel'`.
- **Planned gameplay is never built by a phase** (v2.3.6402; 14 §6.1, §8). What the addendum calls planned (more farmland, a farmhouse you build, furniture, pets living on the farm, visiting another's property), and data the game does not keep, gets its PLACE on its page and an honest line saying it is not in the game yet. No phase adds a mechanic, a counter or a stored record to fill a wireframe; the list is "What waits for gameplay" below.
- **One of each piece** (v2.3.6402; the principle of question 85, "consistency in interaction, creativity in presentation"). The addendum names pieces to be reused everywhere: the comparison, the stat tree, the skill's progression, the zones of a screen, the action row, the empty state, the growing motion, the notifications' route. The final addendum adds (v2.3.6403): the illustrated collection, the entity's showcase with its subject doors, the loot rows, the two-panel workspace (Gear's, shared with a shop, the bank, a bench and a trade), the strength of feedback, the reason beside a disabled action, and the pending and reconnecting states. Each is built ONCE, in the phase named below, as a rule under `src/game/` and one component; a later phase that needs it calls it, and a second copy is a fault.
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
| 7b | UI2-shop, UI2-bank, UI2-craft, UI2-trade, UI2-folk (new, v2.3.6403) | **A shop**: the goods on one side, your bag on the other; tap a thing and the other side shows it, its price and Buy or Sell. **The bank**: your bag and the vault side by side, with filters. **A bench**: the recipes on one side; the picked one's materials (have against need), how many, and Craft on the other. **A trade**: build the offer, then You Give against You Receive. **A townsperson**: their figure, name, role and a line, with a large door for each thing they really do (15 §3, §4). Every rule of each stays the server's, untouched. | 5 PRs, one a screen; the trade's may need a small server step, asked first |
| 8 | UI2-rest | Every shortcut on the world lands on the same pages; the old row, the More page and the old player window are deleted; the document's part 10 tasks and the addendum's (14 §9) run as phone tests, with the owner's review of every screen against its mockup. | 2 PRs |

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

**Where each of the final addendum's pieces lands** (v2.3.6403; built once, there):

| The piece (final addendum) | Rule and component | Built in | Used again by |
|---|---|---|---|
| The reason beside a disabled action (Q83) | `src/game/screenZones.js`: an action that is off carries its "why", from the same rule that would refuse it; `ActionRow` | 2 | every page with an action; equipping first (phase 4) |
| Loading, pending, "not sure", reconnecting (Q84) | `src/game/pending.js`, beside the action door: which requests are out, which controls they hold, when the outcome is unknown; `EmptyState` gains a "loading" form | 2 (the rule and the mark), proved on Spend | 4 (equip), 7b (buy, deposit, craft, trade), every list that loads |
| The two-panel workspace (part 4; Q76 to Q79) | `src/game/workspace.js` (the source panel stays; the opposite panel becomes the picked thing's summary and action; the full look one tap deeper); `TwoPanel`, and ONE grid of item cells | 4 (Gear is its first user) | 7b: the shop, the bank, a bench, a trade's offer screen |
| The illustrated collection (Q73) | `Collection` (cards in a bounded grid, sorted by kind first) | 6 (UI2-codex) | a bench's recipes (7b); the medals' gallery and the pets' "All" (6) |
| The entity's showcase and its subject doors (Q74) | `src/game/entityInspect.js` (what the showcase shows; which doors a kind has; what each says it holds); `Showcase` | 6 (UI2-codex, the monster first) | a townsperson's profile (7b); a pet; each Codex kind the game gains entries for |
| The loot rows, and from an item back to its sources (Q75) | `src/game/lootRows.js`, read out of `src/data/codexDrops.js` (the one table of chances), with the roll's true words | 6 (UI2-codex); needs phase 4's item page | the item page's "where it comes from" |
| Quick settings first (Q81) | Settings' own page: the three sound controls on top, the rest as labelled categories | 7 (with Settings) | |
| The four strengths of feedback (Q82) | `src/game/feedback.js`: one table, each event's strength and whether it waits for a safe moment, over what exists (floating words, the toast, the level-up burst, the reveal) | 7 (UI2-notify: it shares the notifications' route) | every event |
| A shop, the bank, a bench, a trade (Q76 to Q79) | `src/game/shopView.js`, `bankView.js`, `craftView.js` (one recipe model over the five benches' tables), `tradeView.js` (the offer, then the review) | 7b, one card each | |
| A townsperson's profile (Q80) | `src/game/folkProfile.js`: the doors from the same order the tap follows today | 7b (UI2-folk) | the Codex's townsfolk, when it has them (information only) |

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
- **Rules:** `src/game/hub.js` (a destination hub: primary and secondary doors, what each says) and `src/game/broHub.js` (Bro's six; what Character shows), built from `broPages.js`. The layout pieces every later phase reuses are made here and proved on this screen: `Hub`, `IdentityHead`, `Cells` (the invisible grid: quiet sunk cells for facts, raised ones for things you press), and since the addendum (Q48, 14 §2.3) `Zones` (header, identity, summary, deeper, actions; an empty zone gives its room back), `ActionRow`, `EmptyState` and the one `Confirm`, with the rule `src/game/screenZones.js`. The identity head has AP and room for the two labels (Q60); the labels themselves come with UI2-life and show nothing until the owner has set their thresholds. The Homestead link on the hub (14 §6.4) waits for its place to be decided: until then Homestead is reached from the Menu. Since the final addendum (v2.3.6403): an action that is off stays in its place with its reason beside it (Q83: `ActionRow` takes the "why" from the rule that would refuse it), and the pending rule (Q84: `src/game/pending.js`, beside the action door, with a "loading" form of `EmptyState`) is built here and proved on the points preview's Spend, so every later phase's buttons get both for nothing.
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
- **Rules:** `src/game/itemInspect.js` (one model of an item's facts and of the actions allowed by context and by whose it is, from `resolveItemCard` and `itemActions.js`), `src/game/compare.js` (since the addendum's Q49: ONE comparison for every system, in the transformation form: two labelled subjects, each row's value now, compared value and signed change, a percentage only where it means something, each row's better direction, and the honest edges: nothing worn, zero, the same, worse, cannot be compared), `src/game/equipProject.js` (your numbers now and if equipped, by the same reader as the Bro pages, handed to `compare.js`; the plain-words tradeoff line of the baseline's part 4.1 stays under the rows where there is room), `src/game/gearView.js` (management, quick look from the bag, quick look from worn, full: one state). Since the final addendum (v2.3.6403): the two panels are built as the shared workspace (`src/game/workspace.js`, `TwoPanel`, one grid of item cells), because the shop, the bank, a bench and a trade are the same workspace by the owner's decision (Q76 to Q79, Q85): Gear is its first user, and phase 7b calls it.
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
- **UI2-codex.** `src/game/codexView.js`: the root by type, the monster inspector, a drop's link to the item page. Needs phase 4's item page. A Pets section, when there is one, is the Pets page's "All" (one piece, 14 §4.4). Since the final addendum (v2.3.6403; 15 §2): the root is the illustrated collection (Q73); the monster's page is the showcase (today's animated stage) with its subject doors (Q74: Combat, Loot, Abilities, Habitat, each only as far as the game has content); Loot is plain rows, the picture, the name, the rarity and the exact chance as one number, from `codexDrops.js`, with the roll's true words (one roll a kill, at most one of these; always; only in some lands; the grade's second roll), and the roll range, the dice and the bars go (Q75; the final addendum's first question below). The first read of the card: how the stage loads a monster's strips, and what a kind costs in memory.
- **UI2-life** (new). `src/game/lifeProfile.js` (the sum of the ten levels, moved out of `BroCard.jsx`; the radar's ten values on one scale) and `src/game/identityLabel.js` (the two labels: built to the owner's thresholds, showing nothing until there are any); `skillsModel.js`'s `skillUnlocks` gives the WHOLE ladder; `dash/SkillsPanel.jsx` becomes the overview (the sum, the radar, ten equal doors each with its level and small bar) and a skill's own page (`progression.js`: level, XP, the roadmap, a milestone opening its real requirement and benefit). A skill with no ladder in the game says so. Test: the addendum's third task (14 §9).
- **UI2-deeds** (new). `src/game/deeds.js` (AP and its sources as the phone can truly split them; the four tiers with their counts; a title as its achievement's name and `clue`; the one real family; the career highlights from the counters that exist). `dash/AchievementsPanel.jsx` becomes the hub (AP large, then Achievements, Titles, Quest History, Lifetime Records), a tier's gallery, a medal's page, the Titles page; `JourneyPanel.jsx` becomes the highlights and "all records". Discoveries is left out until the game keeps something to show. Test: the addendum's fourth task.
- **UI2-pets** (new). `dash/PetsPanel.jsx` in three: the companion (or the empty state it has today), Owned, All (today's Journal). No stat is added to a pet.

### Phase 7: Social, the Map, notifications, Homestead (four cards)

- **UI2-social.** FIRST a measured sketch of the network at the real sizes (191 px upright, 82 px sideways, a computer; corrected, v2.3.6403), shown to the owner, before code. `src/game/socialNet.js`: each circle's true count, which few faces (only players whose look the phone holds: still faces, never invented ones), its empty state. Friends, Party and Nearby from what exists (`SocialPanel`, the party's list, the room's player list); Clan as question 7 decides. The skill guilds are reached from Life Skills and from a door inside Social. No server change in this card: faces for friends who are away, if wanted, are a later card with its cost said first.
- **UI2-map.** `src/game/worldGraph.js`: the regions and the real ways between them, worked out from the plan (the hub, the eight lands, the two passes between neighbours, the gates), with a suite that holds it to the plan; no coordinate in code or test. Geography is today's map; Connections is the graph; a region opens its own view with a row of categories and true counts, only for categories the game can count (the audit's 14 §7). Where it all lives is question 8.
- **UI2-notify.** `src/game/notify.js`: one model (informs, or needs an answer; the page a tap opens), fed by the events the phone already receives; today's toast bus is its toast side; the centre is its list, kept for the session. Each request keeps its own messages and its own lapse. Since the final addendum (v2.3.6403; Q82): `src/game/feedback.js`, ONE table that gives each event its strength (routine, noteworthy, milestone, exceptional) over the four things the game already has, and says which must wait for a safe moment; a full-screen burst or a reveal that arrives in a fight is held and shown after, or from the list. Which event is which strength is a list shown to the owner before it is built.
- **UI2-home.** `src/game/estateView.js`: the real beds in their real layout and state, from the farm's record and `farmLayout.js`; a bed opens its detail; "how to get there". Looking only, as question 9 decides. Every planned thing has its place and an honest "not in the game yet".
- Settings (with Account, Feedback and About inside) under the same header. Since the final addendum (v2.3.6403; Q81): its first page leads with the quick settings, which the game already has in that place (sound on or off, music volume, effects volume: they apply at once), and the rest sit under them as labelled categories. No graphics quality control is added: the game has none (the final addendum's questions below).

### Phase 7b: the workspaces at the buildings, and the townsfolk (new, v2.3.6403; five cards)

- **Purpose.** The four places where things change hands (a shop, the bank, a bench, a trade) look and work like Gear, so a player who has learned one has learned all five; and a townsperson is a person with a face and named doors, not a window that appears. No rule, price, recipe, limit or safeguard of any of them changes: every one stays the server's.
- **Where they live is asked first** (the final addendum's second question below): today all five are windows over the world, opened at a building or a person. The cards are written for the answer.
- **UI2-shop.** `src/game/shopView.js`: the goods and the bag as the workspace's two panels; the picked thing's summary with its price, the stepper and Buy or Sell; "Not enough gold" beside the button (it is there today); the comparison only for a weapon or armour piece. Categories are not built: there is one small shop (the owner's own rule, Q76). The Marketplace and the Auction House are not touched by this card.
- **UI2-bank.** `src/game/bankView.js`: the bag and the vault side by side, each scrolling; "48 kinds" said as kinds; filters from the bag's own list; Deposit and Withdraw with today's amounts. No bulk deposit (an example in the addendum, not in the game).
- **UI2-craft.** `src/game/craftView.js`: ONE model of a recipe over the five benches' tables (what goes in, what comes out, the level, the gold, have against need), the recipes as a collection, the picked recipe in the other panel, and the materials-into-product view. The stepper only where the bench's own message takes a count today; elsewhere one a press, as now. The furniture list stays dormant.
- **UI2-trade.** `src/game/tradeView.js`: the two screens by their names; gold in the comparison's form. The server's part is asked first (the final addendum's fourth question): the trade's safeguards hold today; a revision number in the confirm is a small server PR of its own if the owner wants it (wire rows with their trust, the cap, the kill switch, `trade2.test` extended; read `docs/ARCHITECTURE-HANDOFF.md` first).
- **UI2-folk.** `src/game/folkProfile.js`: the figure, the name, the role, a line, and the doors, from the same order the tap follows today. Whether a waiting quest still opens at once is the final addendum's third question.
- **Phone tests:** one a card (`mp-ui2shop` and so on, `world: 'wheel'`, reached with `H.approachNpc`), each also proving the old window's every action is still reachable. **Waits on:** phase 4 (the workspace, the item page) and phase 6's UI2-codex (the collection, the showcase).

### Phase 8, UI2-rest: the shortcuts and the clean-up

- Each shortcut the documents list that the game can honour (a level-up to its skill's page; a party tag to the party's page; a notification to its page).
- Deletes: `NavRail.jsx`'s row, `MorePanel.jsx`, the old profile window, the old `MapPanel` page, today's Bro, Quests and Ranks versions, and then the `ui2` switch itself, once the owner says the old dashboard is no longer wanted.
- `mp-ui2tasks`: all ten of part 10's tasks and the addendum's (14 §9) that the game can play, in one run; the tenth (nothing clipped, nothing overlapping, the height unchanged) on the three sizes the phone tests use. The addendum's Homestead task is not run: it begins "When Homestead features become available".
- Then the owner's review of every screen against its mockup (v2.3.6403: the visual language and the mockups now come BEFORE the phases, by 15 §7, and are the owner's own work in the design conversation; this plan does not plan them).

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
| Codex entries for items, resources, townsfolk, pets and places (15 §2) | nine monsters; tables a card could be drawn from, but no entries | each kind's entries being written (content, not a screen's work) |
| Furnishings, as Codex entries and as recipes (15 §2, §3) | four recipes the server does not know; nothing can be placed | the owner's farm work |
| A monster's own stat block and list of abilities (15 §2) | a level range, curves by level, one attack and a story | not asked for; the card says "by level" |
| Shop categories; a second merchant (15 §3) | one merchant, one shelf | more merchants |
| Bulk deposit; storage at the farm (15 §3) | neither | bulk deposit: the owner's yes; farm storage: not to be built |
| A quantity for every craft (15 §3) | a count only for smelting, hardened wood and shard cracking | a server change a bench, asked first |
| A graphics quality setting (15 §4) | none: the game paces itself | the owner asking for one |
| An animated townsperson in a window (15 §4) | a still head; moving figures only in the world | a budget for memory and frames |
| "Not sure it went through" for a craft (15 §5) | only the Auction House has it; a craft carries no request stamp | a server change with a small running cost, asked first |

## What to take back to the design conversation

Ten facts about the game as it is today, across all three documents, most important first, each written to be pasted as it stands (v2.3.6403: the list of v2.3.6402 brought up to the final addendum and kept to ten; where two of the old ten were joined, nothing true was dropped). They are where the documents say something the game does not do, or draw something the game does not keep. They are facts, not questions to us.

1. **The room my mockups must fit.** On a 390 x 844 phone the dashboard is 243 px tall and the full 390 px wide: a 52 px top row (where the header goes) and a 191 px page under it. On a 375 x 667 phone: a 48 px row and a 187 px page. On a 430 x 932 phone: 52 and 205. With the phone on its side the dashboard is a third of the height: on 844 x 390, a 48 px row and an 82 px page, 844 px wide. Nothing I tap should be smaller than 44 px, and no text smaller than 11 px. (An earlier note told me 178 px and 78 px: those were wrong; 191 and 82 are right.) The full table is "The room your mockups must fit".
2. **Points.** Shared (character) points are earned only when my BEST weapon levels up, not on every weapon's level-up: a 3 / 3 / 3 player and a 3 / 1 / 1 player have the same shared points. And a weapon's own points may also be spent on body stats, so the pools are not sealed from each other. (I agreed this on 2026-10-21 for simplicity.)
3. **Another player, and pictures of people.** I can inspect another player only while they are online and near me, and what I see (levels, item names) is what THEIR phone reports. The server does not yet send another player's real stats, item stats or placed points; an offline player has no page. Outside the world the game can draw a player only as a still face, and only for players near me or on a leaderboard; a townsperson only as a still head. The only thing drawn animated inside a window today is a monster's attack in the Codex.
4. **Clan, Party, Guild.** There is no clan apart from a party. A party is one lasting group: it is saved, holds up to 50 members online or not, lasts until I leave it, and becomes an "alliance" with a tag and a name at 20 active members. "Guilds" are the ten skill guilds every player is in automatically, ranked by that skill's level; no guild is run by players. There is no clan or guild profile.
5. **The numbers.** There is no effective health number. DPS exists as one total with no breakdown stored: it is the average hit, plus what critical hits add on average, divided by the seconds a swing takes. Element is not part of DPS. Today's item comparison shows a signed amount, never a percentage, and compares armour piece against piece ("Damage cut"), not by what happens to my character. A monster has no health or attack number of its own: both are worked out from its level.
6. **The Codex and loot.** The Codex is nine monsters and nothing else (no items, resources, townsfolk, pets or places), and each is hidden until my first kill. The game already knows and shows every exact drop chance. A kill makes ONE roll from 1 to 10,000 and gives at most one of the rolled drops, so they exclude each other; beside that, some things always drop, a shard and a raw gem drop only in some lands, and a dropped weapon or armour piece rolls a second time for its grade: rare 0.9%, elite 0.09%, godly 1 in 2,000,000. Luck does not change a drop. Today's Drops page shows each chance as its roll range with a dice heading and a bar, which I asked for earlier and my question 75 now removes. "Rarity" means two things in the game: a weapon's tier, and a piece's grade (plain, rare, elite, godly).
7. **Shops, the bank and trading.** There is ONE merchant, Diego: one shelf, no categories, a quantity stepper, prices and stock from the server, and what he pays falls as his pile grows. There are also two markets between players: the Marketplace (buy and sell orders for weapons) and the Auction House (listings with Buy now and bids). The bank already shows my bag and the vault together; it holds 48 KINDS of thing (any count of each) and gold, only stackable items (no worn gear, no weapons, no tools), only at the bank in town, with no filters and no "deposit all". Trading already has my two steps (build the offer, then a review) and the server already makes both players confirm, clears both when anything changes and makes them wait 2.5 seconds after a change; I can trade items, gold, up to 4 weapons and up to 16 pets. All of these are windows over the world at a building or a person, not dashboard pages.
8. **Crafting, townsfolk and settings.** Five benches, each its own window at its building: the Blacksmith (smelt, forge, armour, harden, amulets, salvage), the Woodworker, the Kitchen, and the Gem Cutter with the Enchanter. A recipe is a text row with have / need; most crafts make one a press (only smelting, hardened wood and shard cracking take a count). The four furniture recipes are not real: the server does not know them and nothing can be placed. There are 21 townsfolk; a tap opens their service at once (13 have exactly one, 5 have two, 3 only talk), and the talk window is a still head, a name and one line at a time. Settings has sound on or off, music volume and effects volume at the top already; there is NO graphics quality setting, and no settings for camera, language, vibration or less motion.
9. **What I have earned.** Ten life skills (woodcutting, fishing, mining, farming, cooking, blacksmithing, woodworking, gem cutting, enchanting, trapping), with no top level, and real unlocks by level for some, not all; a weapon's level unlocks nothing with a name, only its 3 points. Achievements already have four tiers (Common 10 AP, Rare 100, Arena 500, Super-rare 1,000) and are earned or not, with no "7 of 10". A title is the name of an achievement I have earned; only one family follows on (Blooded, Veteran, Centurion). Lifetime records are counted by each player's own phone (kills, deaths, gold earned and spent, time played, ores, fish), not the server, which keeps only kills, kills by kind and the biggest fish. No radar, no specialisation label, no board for the combined life-skill level, no discoveries.
10. **The farm, pets, the map, and what the game does when something happens.** The farm is a private place I walk to: six beds, sixteen crops, a fixed house, a Pet House; no buying land, building, furniture or visiting, and it cannot be managed from the dashboard. Pets exist: caught by trapping, nine kinds in two stages, one out at a time, each with a level, a name and a ward; I hold 30, or 40 with the Pet House. The map is a full-screen window with pan, zoom and my pins: a town in the middle, eight lands round it, each joined to its two neighbours by two passes; no fast travel. A level-up is a full-screen burst, even in a fight; a rare, elite or godly drop has its own reveal; routine actions are floating words over my bro. Some buttons already say why they are off, equipping tells me only after I tap; only the Auction House has a "not sure it went through" state; and there is no list of notifications, only the chat's last lines.

**Five more, about the look** (v2.3.6404; the visual hand-off, part 16; the ten above are kept as they were). Each is written to be pasted as it stands.

11. **My working colours are right.** The eight palette values in my visual hand-off (slate #26383E, panel #1E2E34, raised #293B41, recessed #111E23, deep #0B161B, brass #D8AA58, highlight #EAC675, light text #F4F0E7) are exactly the game's own colours, all eight. The game also has colours my list lacks: muted text #8D9B98 and second text #B6C1BE, a green #55B98A, a red #D8635D, a blue #599FE5, and the bars' own (health #E35D5B, mana #4F8FDE, energy #DFAE4E, experience #58B97B).
12. **Rarity names.** The game's item grades are Normal, Rare, Elite and Godly: Normal has no colour, Rare is blue (#5B99DE), Elite is orange (#E8893A), Godly is a rainbow. I chose those colours myself earlier. My hand-off says "common" and "epic": the game says "Normal" and "Elite", and has no Epic or Legendary item. Each grade also shows stars (one to four), so colour is not the only cue. The Godly ring is the one animation that runs all the time, and it stops when the phone asks for less motion.
13. **Fonts.** The game has no serif font. Almost everything is Source Sans 3 (a plain sans-serif), a few headings are Baloo 2, and the logo is a pixel font. They come from Google Fonts when the game loads, not from the game's own files, and nothing waits for them. A new serif would be one more font to load and credit, and it must have numerals that line up (for gold, timers and damage). The smallest text the game aims for is 11 px.
14. **Buttons.** The game's gold button is already what I chose: a light gold gradient with dark lettering (#172126), easily readable. Ordinary buttons are dark slate with light lettering. A destructive button is drawn as a red OUTLINE with red letters and no fill, on purpose, by an earlier rule of mine ("danger never fills"). There are no green, blue or silver buttons yet. With the game's own dark lettering, the game's green, blue and silver are all readable as button faces; its red only just is, so a red button face needs a lighter red.
15. **Pictures.** Every one of the Menu's eight doors already has a real colour picture, 256 px square, and so do Bro's doors, the ten life skills and the touch controls. Settings' picture is a nearly grey cog, and the Pets picture is a small paw (90 px). No picture exists for: Combat as one door, Combat's Shared channel, the Codex's kinds as doors (Monsters, Items, Resources, NPCs, Locations, Mechanics), Notifications, and About. Selected things today get a gold edge and a tint; nothing looks pressed in yet. Health and experience bars are already continuous; energy and mana are my five blocks.

Where each comes from in the code: the audit, its three halves and its fourth, "The look".

## The room your mockups must fit (v2.3.6403)

The dashboard's real sizes, in CSS px (the unit a mockup at "1x" is drawn in; an iPhone's screen has three device pixels to each). **Got by running the game's own layout functions for each shape** (`src/ui/mobile/sheet/sheetGeometry.js`: `barHeight` :930, `identityRowHeight` :409, `columnsRowHeight` :284, `bandFootprint` :857, `oneBandLayout` :1009), on the session's box, **not measured on a phone**: the first mockup should be checked against a screenshot from the owner's own phone. The band never grows: these are the sizes every screen of the three documents must fit.

| The screen | Dashboard, open | Its top row (the header's place) | The page under it | Folded | The world above, open |
|---|---|---|---|---|---|
| 390 x 844, upright | 390 x 243 | 52 | **390 x 191** | 52 | 390 x 601 |
| 375 x 667, upright | 375 x 235 | 48 | **375 x 187** | 48 | 375 x 432 |
| 430 x 932, upright | 430 x 257 | 52 | **430 x 205** | 52 | 430 x 675 |
| 844 x 390, sideways | 844 x 130 | 48 | **844 x 82** | 48 | 572 x 260, centred |
| 667 x 375, sideways | 667 x 125 | 48 | **667 x 77** | 48 | 551 x 250, centred |
| 932 x 430, sideways | 932 x 143 | 48 | **932 x 95** | 48 | 632 x 287, centred |

What the table does not show:

- **Inside the page.** 19 px of the page's height is its own pads, borders and hairline: content has 172 px at 390 x 844 (168 at 375 x 667, 186 at 430 x 932; sideways 63, 58 and 76). At the sides, 4 px of pad each.
- **The top row is 52 px on a tall screen and 48 px when the visible page is 720 px tall or less**: every sideways phone, a 375 x 667 phone, and an iPhone in Safari with its bars showing (about 390 x 664: the dashboard is then 239 px, and its page still 191). The game's own slate gives a header 44 px with a 44 px Back and a 44 px Close (`docs/LANTERN-SLATE-SPEC.md`:239), which fits both.
- **The rule for the height.** Upright: the top row plus a page as tall as two rows of bag squares with their header (a square is 16.4% of the screen's width: 63 px at 390, 61 at 375, 70 at 430). Sideways and on a computer: never more than 243 px, and never more than a third of the screen's height. A phone on its side RESTS FOLDED, since a third of 390 px leaves the world only 260 px (`docs/UI-DESIGN-NOTES.md`:121); a button opens its page.
- **The world sideways** is never wider than 2.2 times its height, so it sits centred with dark bars at its sides, while the dashboard keeps the screen's whole width. On a computer or a tablet the dashboard's row and page are one centred block at most 480 px wide and at most 243 px tall.
- **The home indicator.** On an iPhone the dashboard grows DOWNWARD by the safe area at the bottom (34 px upright, about 21 px sideways, when the game is installed to the home screen or full screen), and the world gives up those pixels. Nothing to tap goes in that strip: the sizes in the table are the room above it.
- **The smallest thing to tap: 44 x 44 px** (`docs/UI-BIBLE.md`:196; the band's own floor for a square, `ONE_BAND_TILE_MIN`). A bag square is 63 px at 390 wide. Sideways a square shrinks to fit the page's one row (51 px on 844 x 390, 46 on 667 x 375, 64 on 932 x 430).
- **The smallest text: 11 px**, the size the dashboard uses most for small words; 12 and 13 px for ordinary words; 10 px only for a caption or a count badge (`docs/LANTERN-SLATE-SPEC.md`:191). A handful of places in today's panels go under that (8 to 9.5 px, five places): not a size to design to.
- **What two panels side by side come to** (Gear, a shop, the bank, crafting, a trade): at 390 x 844 each panel is about 189 px wide (179 inside its pads) and 172 px tall inside: under a 26 px label row, two bag-sized 63 px squares across and two down, or three across and three down at the 44 px floor.
- **Not read:** the top bar over the world and the top safe area. They are outside the dashboard and no screen of the three documents is drawn there.

## The kit for your mockups (v2.3.6404)

The game's REAL colours, fonts, rarity names and pictures, so that no mockup is drawn with a placeholder where the real thing exists. Read from the code (the audit's fourth half, "The look", has where each comes from). Nothing here is new: it is what ships today. Paths are inside the repository's `public/` folder; on GitHub's site each can be opened and saved from a phone.

**1. Colours** (`src/styles/game.css`). The first eight are the hand-off's own eight: they are exact.

| Use it for | Colour | The game's name |
|---|---|---|
| The dashboard's slate (the top of its gradient) | `#26383E` | band-top |
| The middle and bottom of that gradient | `#20333A`, `#1A292F` | band-mid, band-bottom |
| A panel's face | `#1E2E34` | sheet |
| A raised button or card | `#293B41` (brighter: `#32454C`) | raised, raised-high |
| A recessed tray, track or socket | `#111E23` (softer: `#16262C`) | well, well-soft |
| The deepest recess | `#0B161B` | well-deep |
| An item's occupied socket | `#24363C` | card / slot |
| The darkest shelf | `#0E191E` | toolbar |
| Brass (gold) | `#D8AA58`; pressed `#C2924A` | brass |
| Brass highlight, the gold button's edge, the focus ring | `#EAC675` | brass-highlight |
| Text | `#F4F0E7` | text |
| Second text, muted labels, disabled | `#B6C1BE`, `#8D9B98`, `#667875` | text-secondary, -muted, -disabled |
| Hairlines | white-green at 11% and 20% | line, line-strong |
| The one dark lettering on gold | `#172126` | text-on-accent |
| Good, bad, guidance | `#55B98A`, `#D8635D`, `#599FE5` | positive, danger, info |
| Health, mana, energy, experience, magic | `#E35D5B`, `#4F8FDE`, `#DFAE4E`, `#58B97B`, `#9A78D0` | hp, mana, stamina, xp, magic |
| The light card (something another player wrote) | `#C8D2CF` with `#111E23` text | invert |

The gold button as it is today: a gradient from `#E2B765` (top) to `#D2A14D` (bottom), a 1 px edge `#EAC675`, corners 10 px, lettering `#172126` at 13 px bold. Corner sizes in use: 14 px for a panel, 10 for a card, 8 for a slot, 10 or 11 for a button.

**2. Fonts.** Source Sans 3 (regular, semi-bold, bold) for nearly everything; Baloo 2 for a few headings; Press Start 2P for the HEMI BROS wordmark only. All free (SIL Open Font License) and on Google Fonts, so a mockup tool has them. No serif is in the game yet: the one you choose is the open decision of question 91. Sizes the game uses: 13 to 13.5 px for ordinary words, 12 for compact, 11 for small labels (the floor to design to), 10 only for a caption or a count badge, 14 bold for a value, 18 bold for a large one, a panel's title 13 bold in capitals. Numbers that change are set in figures of equal width.

**3. Rarity** (a piece's grade, the hand-off's item border):

| The game's name | Colour | Stars | How it is drawn today |
|---|---|---|---|
| Normal | none (the plain slot) | 1 | no edge colour |
| Rare | blue `#5B99DE` | 2 | a blue edge and a faint blue glow |
| Elite | orange `#E8893A` | 3 | an orange edge and a faint orange glow |
| Godly | a rainbow: `#FF6B6B`, `#FFD166`, `#6BFF95`, `#5CB8FF`, `#C77DFF` (gold `#F0C45F` where one colour is needed) | 4 | a slowly turning rainbow ring; its name in rainbow letters |

Other things the game also colours by rarity, each with its own names: an achievement (Common, Rare, Arena, Super-rare), a weapon's element tier (Common, Elemental, Fusion, Shift), and how often a drop comes (Normal, Uncommon, Rare, Very rare). The audit's table has their colours.

**4. Pictures, by door** (all under `public/`; 256 x 256 px and full colour unless said):

| Door | The picture |
|---|---|
| **The Menu:** Bro | `icons/ui/panel-self.webp` |
| Quests | `icons/ui/panel-quests.webp` |
| Social | `icons/ui/nav-friends.webp` |
| Ranks | `icons/ui/panel-leaderboard.webp` |
| Codex | `icons/ui/panel-encyclopedia.webp` |
| Homestead | `icons/ui/bldg-farm.webp` (a wide view: `icons/ui/homestead-preview.webp`, 480 x 300) |
| Map | `icons/ui/nav-map.webp` |
| Settings | `icons/ui/panel-settings.webp` (a nearly grey cog) |
| Gear (the other workspace) | `icons/ui/nav-dashboard.png`; the bag: `icons/ui/nav-inventory.webp` |
| **Bro:** Character | `icons/ui/panel-self.webp` (or `icons/ui/hero/tab-overview.webp`, muted) |
| Combat | none of its own; Sword `icons/ui/combat-melee.webp`, Bow `icons/ui/combat-bow.webp`, Staff `icons/ui/combat-magic.webp`; Shared: none |
| Equipment | `icons/ui/panel-loadout.webp` |
| Life Skills | `icons/ui/nav-lifeskills.webp` |
| Accomplishments | `icons/achievements/achievements.webp` (150 x 150; 23 medals beside it) |
| Pets | `icons/ui/pets-paw.webp` (90 x 90); the pets themselves: `sprites/pets/pet-sheet.png` |
| **Life skills:** each of the ten | `icons/ui/skill-<name>.webp`: woodcutting, fishing, mining, farming, cooking, blacksmithing, woodworking, gemcutting, enchanting, trapping |
| **Stats** | `icons/ui/hero/`: dps, damage, crit, defense, dodge, hp, mana, stamina, move-speed, xp, and more (26) |
| **Items** | `icons/items/` (126 pictures, 128 x 128, one a thing); gold: `icons/ui/cur-gold.webp` |
| **Townsfolk** | `sprites/npc/<name>-head.webp` (22 heads, 192 x 192) |
| **Lands** | `ui/banners/land-<element>.webp` (eight, about 190 x 96) |
| **Monsters** | `sprites/monsters/<kind>/` (each kind's animation strips) |
| **The touch controls** | `ui/controls/` (35 pictures, 96 to 160 px: the abilities, the three weapons, jump, sprint, talk, each with a grey twin) |
| Clan, guild, chat, the journey, account, feedback | `icons/ui/panel-clan.webp`, `panel-guild.webp`, `panel-chat.webp`, `journey.webp`, `panel-account.webp`, `panel-feedback.webp` |

Your bro has no single picture (it is drawn from layers as it plays): take it from a screenshot.

**5. What is missing** (no picture exists; the only places new art would later be made, after your approval, by the art law):

- a door picture for each of the Codex's kinds: Monsters, Items, Resources, NPCs, Locations, Mechanics (six, if all six stay);
- Combat as one door, and Combat's Shared channel;
- Notifications and About (small line drawings today).

Not missing, but look before they go on a large tile: Settings (nearly grey, and you asked for full colour), Pets (90 px), Accomplishments (150 px), and the muted ones (the sword, three of the skills: mining, cooking, blacksmithing).

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

### The final addendum's questions (v2.3.6403)

The ten above stand as they are: the final addendum answers none of them (it settles Settings' layout, which was never one of the ten). It raises these, each a place where the owner's decision meets the game as it is; they are the owner's to settle, and nothing is built on a pick. The first two matter NOW, because they change what the owner draws next.

1. **The loot table (question 75).** Your addendum asks for each drop's exact chance, and for no dice-roll numbers and no bars. Two things to know. First, nothing is in the way of showing exact chances: the game already holds them openly and shows them. Second, today's Drops page shows each chance as its roll range under a dice heading ("1–1,000 (10%)") with a bar out of 100%, and you asked for both of those earlier. Should they go, leaving the picture, the name, the rarity and one number, with one short line that tells the truth of the roll ("one roll a kill: at most one of these")? *Pick: yes.* It is your later decision, and the short line keeps what the dice were telling.
2. **Where the shop, the bank, the benches, a trade and a townsperson's profile live.** Today each is a window over the world, taller than the dashboard. Your addendum makes them two-panel workspaces like Gear and fixes the dashboard's height, but does not say they move INTO it. Inside the dashboard on a 390 x 844 phone each of the two panels is about 189 x 172 px: two bag-sized squares across and two down. *Pick: draw the bank first, at the real size (it is the hardest: 48 kinds beside your bag). If it reads well there, all five go in the dashboard and the world stays in view; if not, they keep their windows and follow the same layout and rules.* Your mockup decides, not a guess.
3. **A townsperson's profile adds a tap.** Today a tap on Sterling opens the bank at once; 13 of the 21 townsfolk have exactly one thing they do. Under question 80 the tap opens Sterling's profile with one large Bank door, and a second tap opens the bank. And today a townsperson with a quest for you opens the quest first. Should the profile always come first, with the waiting quest as its first and largest door? *Pick: yes, the profile always first.* One rule a child can learn; if two taps to the bank annoy you on your phone, a switch gives the old one-tap back.
4. **The trade's last safeguard.** Your list asks that a confirmation name the exact offer it confirms (a revision number). The server does not do it that way: it clears both players' acceptances on any change and refuses a confirm for 2.5 seconds after one, which has the same effect. Add the number as well? *Pick: yes, as a small server step when the trade's card comes.* It costs nothing to run, and it makes "the same offer" true by construction instead of by timing. Nothing is weakened either way.
5. **The level-up burst during a fight.** It is full-screen today and nothing holds it back; question 82 says a fight is never covered. Should a level-up (and a rare drop's reveal) that happens in a fight wait until the fight ends? *Pick: yes, behind a switch,* so you can feel both on your phone.
6. **Graphics quality.** Your quick settings name it as an example; the game has no such setting (it adjusts itself). *Pick: the quick settings are sound on or off, music volume and effects volume, which are already at the top of Settings; no quality control is invented.*

Asked when their card comes, each with its pick:

- **The two markets** (phase 7b): the Marketplace (buy and sell orders) and the Auction House (bids) are not merchants and your addendum does not name them. *Pick: they keep their own shapes, under the same header and the one item page.*
- **Seeing it happen at once** (phase 2): equipping and a hit's number show immediately today and the server corrects them if it disagrees; question 82 says no success before the server confirms. *Pick: what only moves things you already own stays instant; anything that spends gold or materials waits for the server.* The list, action by action, comes with the card.
- **"Not sure it went through" for a craft** (phase 7b): the page can mark a button as waiting and stop a second press with no server change. Checking with the server before a retry needs the server to remember each craft, which is a small running cost. *Pick: the page's part first; the server's only if doubled crafts are ever seen.*
- **Hardening** (phase 7b): it can fail and has no confirmation, and its odds are the server's alone. *Pick: leave both as they are;* showing the odds would make them public, as the drop chances are.
- **Bulk deposit** (phase 7b): an example in your addendum, not in the game. *Pick: not now.*
- **The Codex's showcase for every monster** (phase 6): a moving monster in the Codex costs memory a kind. *Pick: a kind's art loads when its page opens and is freed on leaving, so the Codex costs what one monster costs.*

### The look's questions (v2.3.6404)

The visual hand-off answers one open item of the ten above in principle (an action's colour depends on what it does: question 101) and none of the numbered questions. It raises these, each a place where the look the owner chose meets the game as it is. They are the owner's to settle, by a word or simply by how the mockups are drawn; nothing is built on a pick, and nothing was renamed or recoloured here.

1. **The grade's names.** Your hand-off writes "common" and "epic"; the game says "Normal" and "Elite" (and Rare, Godly), with the colours you chose earlier: blue, orange, rainbow. Your own rule says to preserve the game's rarity definitions. *Pick: the mockups say Normal, Rare, Elite, Godly;* tell us if you want the words changed in the game instead.
2. **A red button's face.** Today a destructive button is a red outline with no fill, by your earlier rule ("danger never fills"); your hand-off gives red a light metallic face with dark letters like the other four. The game's own red is only just readable under dark letters. *Pick: draw the red face in the mockup, a lighter red, and judge it there;* the old rule goes only if you like what you see.
3. **The font.** A classic RPG serif is approved, the font is not. It needs a free licence, numerals of equal width, and to stay readable at 11 px on your phone. *Pick: choose two or three candidates in the mockups; we then check each one's licence, numerals and size before one is locked.* Whether the world's own labels (names, damage numbers) change too is a separate, larger job: *pick: the dashboard only.*
4. **Which things are destructive.** Today Unequip is drawn as the red one and Drop is not. Your rule keeps red for what truly destroys. *Pick: settle the list at the screens' review, action by action.*
5. **Settings' and Pets' pictures.** The cog is nearly grey and the paw is small. *Pick: keep both for the mockups; they join the list of new art only if they look wrong on your screens.*
6. **The Bro card's title ribbon.** It has notched ends; you chose no chamfered corners. *Pick: your Bro landing mockup decides it, since that screen is drawn first.*

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
