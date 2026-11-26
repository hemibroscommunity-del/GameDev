# Card UI3: the menus' second pass, the owner's suggestions of 2026-11-26 (five PRs, a session each)

Written by the orchestrator (part 26, 2026-11-26). The owner's words are WHOLE in `docs/design/UI_FEEDBACK_2026-11-26.md` (on `claude/plan-orc` until PR 1 commits it): every session reads that file first, all of it. The facts a lane read on main are `docs/plan/cards/UI3-facts.md`. Each PR has its own card (`UI3-kit.md`, `UI3-hud.md`, `UI3-bro.md`, `UI3-combat.md`, `UI3-menus.md`); this file is what they share: the purpose, the readings chosen, the order.

Block UI3 [[6780, 6799]] (the next sitting's gatekeeper registers it in `tools/dev/tag-blocks.json`; a session does not edit that file). The strong model, high. Each PR: ONE draft PR, ONE message to the orchestrator, then stop. No server file, no cap, no live flag. Status: `docs/plan/status/UI3.md`.

## PURPOSE (the owner's own, 2026-11-26)

*"the biggest problem with the new BroTown menus is everything is competing for the same level of attention. Almost every piece of information has its own large beveled button, even when it isn't an actionable or particularly important piece of information."* And: *"the upper HUD tells you who you are and how you're progressing, while the bottom dashboard lets you manage your character. Those two areas shouldn't unnecessarily repeat each other's information."*

So after this card: a thing that looks pressable IS a destination or an action; an important number sits recessed and large; everything else is flat inside a shared container; who you are and how you progress is on the world's top-left, always; and the dashboard never says it a second time.

## What NEVER changes (their words)

- *"without increasing the dashboard height or sacrificing gameplay visibility"*; *"I wouldn't overhaul the new combat control panel or change the dashboard dimensions. Both are working well."* The band's height, the controller (card PAD's files) and the play column are not this card's.
- *"I'd also retain your existing illustrated game icons instead of replacing them."* No new art in any PR.
- Their standing rule: *"keep my game content over the mockup stuff"*: the mock-ups' names, numbers and tiles are examples; the game's own words, six attributes, doors and counts fill them.
- The build plan's rules for a step (`docs/design/UI_ARCHITECTURE_V2_PLAN.md` lines 18-28 and 50-51): nothing lost; built FROM the kit (a missing piece is added to the kit and to `?uikit=1`); rules as modules under `src/game/` with suites in `tools/guards/` (never `server/test/`: a file there deploys); a `states.mjs` state and a section of `docs/UI-DESIGN-NOTES.md` with the owner's words; pictures of the REAL game at deviceScaleFactor 2 in `docs/shots/`; `?ui2=0` still gives the old dashboard.
- The baseline's law: `UI_MASTER_SPEC.md` is never edited. Each PR adds ITS line to the decision log (`docs/design/UI_ARCHITECTURE_V2.md` part 13: dated 2026-11-26, the owner's words quoted, REPLACES / SHARPENS / CHANGES / NEW and which part); PR 1 adds the new part at the end that names the feedback document.

## The five PRs, and the readings chosen so no session guesses

**PR 1, UI3-kit (tag 6780): three weights and one palette, in the kit.** From main, NOW, beside the dashboard's step 6.
- The three weights become three NAMED kit forms, shown side by side on `?uikit=1`: (a) RAISED (bevel, prominent): destinations and actions ONLY; (b) the STAT: a recessed surface with a large number, no heavy bevel (today `Ui2Stat` is raised: it becomes this; a stat that opens something keeps its chevron and its tap, as the mock-up's "120.5 DPS ›"); (c) FACTS: label and value rows, flat, aligned inside ONE shared container, no border of their own (a new piece; there is no third tier today).
- The guard reads the syntax tree: a raised form on a thing that cannot be pressed is red (the dodges: `u2-raised` or a `Ui2Tile` with no handler; a `div` given the raised class "for looks"; a stat left raised; a fact row given its own border class).
- The palette: the owner's six values go in `src/game/ui2Tokens.js` (the base #14232F; navigation #223D53; recessed #0E1D29; a NEW border token #4B6275 in place of the hand-written edge colours; text #F1F0E9; gold #EAC474), the gradients rebuilt around them, the generated block rewritten by `--write`. `ui2-tokens.test` still holds 4.5 to 1: where one of their values fails it on a surface, the nearest value that passes, SAID in the PR. Gold is for progression and important numbers; any other colour only where it means something (a grade, an action's kind, an element): an allow list in the guard.
- Bevels and shadows on tiles come down (*"reduce the button bevels and shadows"*); one type scale on every navigation button.
- A switch, `?ui2look=0` (remembered), gives yesterday's tokens, so the owner can compare on their phone; on by default.
- NOT this PR's: any screen's own style sheet or layout (`combatPage.css`, `gearPanels.css`, `itemPage.css`: the later PRs'); the controller.

**PR 2, UI3-hud (tag 6781): the persistent character HUD.** AFTER card PAD's sprint part is ready, stacked on `claude/plan-pad-9-rimsprint` (it holds `src/ui/BroTown.jsx`; never beside it).
- Top-left, under the top bar, opposite the minimap: the bro's face (the portrait the dashboard already bakes, `portraitStore.js`: no new bake, no new memory), beside it the name and "Lv N" (the combat level), under them a gold XP bar labelled with its weapon; under the HUD the tracked quest as ONE line (today's `QuestCard`, made smaller; its tap still opens the quest).
- Which weapon: the one whose next level raises the combat level soonest (their words: *"whichever weapon is closest to increasing the overall combat level"*): `combatLevelProgress(R)` answers that, NOT `bestWeaponProgress`. The rule moves to a module under `src/game/` with its suite.
- A tap on the face opens the Bro page at once (after PR 3: the one character page). On a computer a click on it is not a swing.
- It shows the face, the name, the level and the XP bar ONLY. Health and energy do NOT come back (the owner took the old frame out on 2026-11-03, v2.3.4163; this is their later word for what they list, no more).
- While it shows, the top bar's passing XP slot keeps life-skill XP only: weapon XP moves in the HUD's own bar (never both).
- The party chip, the element chips and "Skip tutorial" move under the stack by the HUD's own height (one CSS variable), with no overlap at 375 x 667 and 667 x 375. Sideways it is compact: say its size and show the picture.
- The online count: there is none on the HUD today (taken out in v2.3.1227), so nothing moves; a count inside Social is step 7's. FLAGGED to the owner, not built.
- `?hud=0` (remembered) gives today's top-left. `BroTown.jsx` gains ONE mount line; everything else is its own files.

**PR 3, UI3-bro (tag 6782): Bro and Character become one page.** Stacked on PR 1's branch; LISTED AFTER PR 2 in the sitting (without the HUD, nothing would show who you are).
- The Menu's Bro door opens ONE page under the one header. Its word stays the game's, "Bro" (the mock-up says "Character": FLAGGED, one word to change). Six tiles: Combat, Equipment, Life Skills, Feats, Pets, Journey. Under them ONE flat strip (the kit's facts form): AP, Quests, Clan (or Party), Guilds; each a door where the game has a page (`PASSPORT_DOORS`).
- For YOURSELF: no portrait, no combat level banner, no three weapon buttons (the HUD has who you are; Combat has the weapons).
- `CharacterPage` is NOT deleted: it stays the page for ANOTHER player (a tap in Ranks, step 9), where no HUD says who they are.
- Titles: *"Titles could live within Feats"*. Until the Feats step is built, the strip carries a fifth entry, the equipped title, that opens Titles; card UI2-feats takes it in and removes it. Nothing is lost.
- Journey's road in More moves to the new tile. The band's height is unchanged: six tiles and the strip in the room, upright and sideways (the builder's judgment, with pictures).

**PR 4, UI3-combat (tag 6783): the Combat hub and ONE template for a weapon's page.** Stacked on PR 1's branch, beside PR 3.
- The hub: the weapon's picture dominant (32 px today), the level number large, the XP bar thin; points shown prominently ONLY when there are points to spend (none: a quiet line or nothing).
- A weapon's page, the same for Sword, Bow, Staff (and Shared in the same form): row 1 the level and "x / y XP"; row 2 ONE summary strip: DPS as the stat (it opens the tree), then Damage, Critical, Speed, Range as facts in one container; row 3 a full-width line "Attributes" with "n points available" (gold when n > 0) ABOVE the grid, the left column gone, the game's six attributes in a full-width three by two; a small gold plus on each while there are points.
- At 390 x 844 the level, the DPS and the six are in view unscrolled.

**PR 5, UI3-menus (tag 6784): the Menu's grid and Gear's headers.** Stacked on PR 1's branch, beside PRs 3 and 4; never in the files of Gear's PR 3 while it runs (`CharacterView.jsx`, `ItemTooltip.jsx`).
- The Menu: four by two kept; the pictures about 25% larger (46 px today) or the largest the band holds, SAID; the same type on every tile.
- Gear: the side-by-side kept; one slot style for the bag and the worn cells; the two headers shorter (30 px today); the gold a compact pill.

**Not new PRs: three cards of step 6 are amended** (on `claude/plan-orc`): UI2-life (the cards and pictures fill the room's height; the level inside the card, nothing sticking out of it); UI2-ranks (the medals kept, no metal gradients on the first three rows, YOUR row marked wherever it stands); UI2-feats (the Titles door).

## Never side by side

PR 2 with anything in `src/ui/BroTown.jsx` (PAD's sprint part first). PRs 3, 4, 5 with each other only in `dashDests.js`, `states.mjs`, `docs/UI-DESIGN-NOTES.md`, the decision log: each adds its own rows and touches no other. PR 3 with card UI2-feats, UI2-life or UI2-ranks in `src/game/broHub.js`: whichever starts second is stacked on the first. A sitting lists PR 1 first, PR 2 before PR 3.

## Flagged for the owner (never settled by a session)

The page's word, "Bro" or "Character"; the online count's new home; that health and energy stay off the top-left; where a value of theirs failed the contrast line; what the real size could not hold.
