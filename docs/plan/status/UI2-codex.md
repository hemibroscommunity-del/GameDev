card: UI2-codex
branch: claude/plan-ui2-12-codex
prs: the Codex PR (tag 6693; draft, base claude/plan-ui2-11-quests)
state: ready

## Done
- tag 6693, the build's step 6: the Codex as an illustrated collection (dash/CodexPage.jsx, the kit's Ui2Collection: the kinds Monsters, Items, Resources, Townsfolk, Lands, Pets; nine cards), a monster's showcase (dash/MonsterShowcase.jsx, the kit's Ui2Showcase: its idle strip, four doors Combat, Loot, Habitat, Story with their summaries, its essentials), Loot as plain rows (one chance each, the roll's words once), a drop opening the one item page (itemPageOpen.js's Codex road: "In the Codex", no action, Drops from, Found from).
- The rules: src/game/codexView.js (the game's rule `codexMet`, read in one place), entityInspect.js, lootRows.js; the suites codex-view (V1-V8, P1-P6 red), entity-inspect (E1-E9, Q1-Q6 red), loot-rows (L1-L11, R1-R9 red), the mount guard codex-mount (C1-C6 red, the lazy import followed); a mutation run by hand: 134 mutants, 126 killed, 8 equivalent (the PR lists them).
- The phone test mp-ui2codex (390 x 844, 375 x 667, 844 x 390, a computer; `?ui2=0`); pictures docs/shots/ui2-codex-*.png; states dash-encyclopedia, dash-codex-monster, dash-codex-loot, dash-codex-item; UI-DESIGN-NOTES "The Monster Codex".

## Next
- Nothing: the PR waits for the gatekeeper.

## Found
- The item card names a shard by its key when it has no row for it ("Sky" for the Wind Shard: ItemDetailPopup.jsx's fallback); the Codex uses the drop table's name.
- CodexStage.jsx's header says "about 8 MB" for the Mummy's strips: the files' own sizes sum to 12.0 MB decoded (width x height x 4).
- The one item page from the Codex reads "Look only: it is not yours" (ItemPage.jsx's note for every read-only place) and "Normal ★" (itemInspect.js grades a null quality Normal): both the item page's.
- tools/guards/ui3-weights check 3 is red on src/ui/mobile/dash/questsUi2.css (6 colours) once the kit (#2395) and Quests (#2399) are on one branch: neither alone.

## Needs
- Nothing.
