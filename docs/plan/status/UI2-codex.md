card: UI2-codex
branch: claude/plan-ui2-12-codex
prs: the Codex PR (tag 6693; draft, base claude/plan-ui2-11-quests)
state: ready

## Done
- tag 6693, the build's step 6: the Codex as an illustrated collection (dash/CodexPage.jsx, the kit's Ui2Collection: the kinds Monsters, Items, Resources, Townsfolk, Lands, Pets; nine cards), a monster's showcase (dash/MonsterShowcase.jsx, the kit's Ui2Showcase: its idle strip, four doors Combat, Loot, Habitat, Story with their summaries, its essentials), Loot as plain rows (one chance each, the roll's words once), a drop opening the one item page (itemPageOpen.js's Codex road: "In the Codex", no action, Drops from, Found from).
- The rules: src/game/codexView.js (the game's rule `codexMet`, read in one place), entityInspect.js, lootRows.js; the suites codex-view (V1-V8, P1-P6 red), entity-inspect (E1-E9, Q1-Q6 red), loot-rows (L1-L11, R1-R9 red), the mount guard codex-mount (C1-C6 red, the lazy import followed); a mutation run by hand: 134 mutants, 126 killed, 8 equivalent (the PR lists them). itemInspect.js: a Codex piece that rolls its grade shows none (the orchestrator's leave).
- The phone test mp-ui2codex (390 x 844, 375 x 667, 844 x 390, a computer; `?ui2=0`); pictures docs/shots/ui2-codex-*.png; states dash-encyclopedia, dash-codex-monster, dash-codex-loot, dash-codex-item; UI-DESIGN-NOTES "The Monster Codex".

- The mend of sitting 72 (HELD: "'at most one when each rolls alone' (MonsterShowcase.jsx:161) and 'the same sword, different names' (:59 `nameOf` dropped)", both green at the page): the page now makes its rows AND the roll's words by ONE call of a rule, `lootPage(kind, { ...dropOpts(S), nameOf: codexItemName })` (src/game/lootRows.js), and draws `.roll` and `.mark` from it; loot-rows.test runs lootPage over every kind and both rolls and reads the page's tree (no lootRows, lootRollWords, lootGrades or codexDropsFor called there, no roll words said, no `shared` beside the caps, the namer imported from itemPageOpen.js). Plants now red: R11-R12 in lootRows.js, R13 `lootRollWords(true)` at the page, R14 `nameOf` dropped at the page, R15 the mark typed, R16 `shared: true` beside the caps, R17 a table namer. Nothing a player sees changes. Main merged once.

## Next
- Nothing: the PR waits for the gatekeeper.  The mend's runs on its final code (main 5ab943fe merged; the test box): loot-rows 29/29 (R11-R17 red), precheck 0 FAIL; ui2codex 31/31 (by a helper; my own first run had step 6, the NEW MONSTER card, red once, a slow box's timing: the card's code and the loading gate are unchanged by main and the mend). Before the mend: ui2codex 31/31, membudget 12/12, ui2gear 33/33 (head 40829ee2).

## Found
- The item card names a shard by its key when it has no row for it ("Sky" for the Wind Shard: ItemDetailPopup.jsx's fallback); the Codex uses the drop table's name.
- CodexStage.jsx's header says "about 8 MB" for the Mummy's strips: the files' own sizes sum to 12.0 MB decoded (width x height x 4).
- The one item page from the Codex reads "Look only: it is not yours" (ItemPage.jsx's note for every read-only place).
- mp-codex (`?ui2=0`) 35/39 on the final code: four reds against data tables this PR does not change (creature types, dungeon names, "Ice Shard"); mp-townboard 28/29 (step 11 reads the frame's old-style stack root). Not confirmed on main.

## Needs
- Nothing.
