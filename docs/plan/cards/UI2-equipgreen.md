# Card UI2-equipgreen: the Equipped page in pale green, its icons filling their slots (the owner's request; one PR)

Model and effort: the strong model, high. Tag: 6697 (UI2's block 6680 to 6699; precheck says if it was taken: then 6698). Branch `claude/plan-ui2-17-equipgreen`, from `main` (17124fc8 or newer). ONE draft PR, base `main`; ONE message to the orchestrator (line 5 of `git show origin/claude/plan-orc:docs/plan/status/ORC.md`), then stop. No file under `server/`: the PR deploys nothing. You commit this card as `docs/plan/cards/UI2-equipgreen.md` in the PR.

## Purpose

The owner, 2026-11-27 (about 05:20 UTC), typed in the orchestrator's session, playing on an iPhone: *"Also on equipped page might the background color a pale green color and make the thumbnail icons fill each slot better like the inventory icons do"*.

Read as (the orchestrator's reading, chosen so you need not guess): on the menu's Gear page, the panel named "Equipped" (the worn items) gets a PALE GREEN background, and each worn item's picture FILLS its slot as a bag cell's picture fills its cell.

## What a lane found on main (check each before you lean on it; line numbers are near, not exact)

- The Equipped panel is the right-hand panel of Gear's two panels: `src/ui/mobile/dash/GearPanels.jsx` (`WornCell` near line 126, the body's layout 170 to 185), styles `gearPanels.css` (`.ui2.u2-gp`, line 3, sets no background: the colour comes from the kit's frame, `ui2.css` near 205 `.ui2 .u2-frame`, tokens `--ui2-page` #14232F and `--ui2-frame-top/mid/bottom`). Bro's "Equipment" showcase (`src/ui/mobile/sheet/GearShowcase.jsx`) reuses `WornCell`. `src/ui/mobile/EquippedTab.jsx` is the older tab (`?ui2look=0`).
- A worn slot's picture: `ui2.css` near 595, `.u2-slot-art {width:72%; height:72%; object-fit:contain}`; the empty slot's ghost is 78% (`gearPanels.css` near 33). A bag cell's picture: `InventoryPanel.jsx` near 1512 (BagTile), `width:'94%', height:'94%', objectFit:'contain'` ("the new item art fills the slot"). SO: 72% against 94%.
- The kit's greens (`ui2.css`): `--ui2-green-face-0` #B4E8C9 (the palest), `--ui2-green-edge` #A6E2C0, `--ui2-green-face-1` #7FCDA2. No sage or mint token exists. `docs/LANTERN-SLATE-SPEC.md` says green is the reward colour (near line 535) and once turned down a "light and airy" palette: THE OWNER'S WORDS OF TODAY WIN for this one panel; say so in the notes section you write.
- UI-review states: `dash-gear-panels`, `dash-gear-look-bag`, `dash-gear-look-worn`, `ui2-bro-equipment` (`tools/qa/ui-review/states.mjs` near 905 to 920). UI-DESIGN-NOTES: "## Gear's two panels" (near line 2421), "## Bro's Equipment, a showcase" (near 2445).

## The job (readings chosen)

1. THE GREEN. ONE new token for the panel's ground, defined in `gearPanels.css` (NOT in `ui2.css`: other sessions are in it tonight), a PALE green: start from the kit's palest, #B4E8C9, and go paler or greyer by eye until the panel reads calm beside the dark slate Bag panel next to it (a pale sage, not a neon mint). It colours the Equipped panel's BODY (behind the slots and the bro's figure if one stands there), not the kit's frame, not the Bag panel, not the whole Gear page. Everything a player READS on it (slot names, the header, counts, hints) keeps a contrast of 4.5 to 1 or better: darken those words for this panel with the kit's own dark ink tokens; a slot keeps its own well and border so an empty slot still reads as a slot. The guard `tools/guards/ui3-weights.test.mjs` (a text colour outside its list, a hex in a kit inline style) binds you: the colour is a token in CSS, never an inline hex.
2. THE ICONS. A worn item's picture is 94% of its slot, as the bag's, in the Equipped panel AND in Bro's Equipment showcase (they share `WornCell`): scope the rule to the worn cells (do not change `.u2-slot-art` for every `Ui2Slot` of the kit). Look at every kind of worn picture at 94% (a weapon's long strip, a ring, the head): none is cut by the slot's border or its rarity edge, none touches the slot's corner badge or level. The empty slot's ghost stays as it is unless it looks lost beside the filled ones: then say so, do not change it.
3. BRO'S EQUIPMENT SHOWCASE keeps its own background (the owner named the equipped page): list "should Bro's Equipment be green too?" in your ready message as the owner's to say.
4. THE SWITCH: `?equiplook=0` gives yesterday's panel (the dark ground, 72%), read once the way the page's other look switches are read; ON by default. Its row in the switch table (`tools/guards/lib/switches.mjs`; `node tools/guards/switches.test.mjs --write`). `?ui2look=0` (the older tab) is untouched and must keep working.
5. Documents: the section "Gear's two panels" of `docs/UI-DESIGN-NOTES.md` gains the owner's words, the token and the switch; `states.mjs` descriptions made true where they name the ground or the picture's size.
6. Pictures for the owner in `docs/shots/`: the Equipped panel before and after, 375 x 667 upright, and one sideways; Bro's Equipment after (the icons).

## Dodges (each must turn a check RED, or be shown in a picture)

- the icons filled in Gear but not in Bro's showcase (one rule scoped to one parent);
- a pale ground with pale words on it (a contrast check in a node suite over the panel's tokens, or a phone test that reads the computed colours);
- `?equiplook=0` changing nothing, or changing the Bag panel;
- the 94% rule leaking to every kit slot (the kit's plate `?uikit=1` unchanged).

## Done when

- A check that holds it: a phone test (its file `mp-<name>.mjs`, its `lane`, `world: 'wheel'`) or an extension of the nearest one that reads, on the Gear page, the Equipped panel's computed background (the token's colour), a worn picture's box against its slot's (0.94 within a pixel) and both again under `?equiplook=0`; grep first for tests that read `u2-slot-art` or the panel (`mp-gear*`, `mp-ui2*`) and keep them green.
- The four checks green on your exact head; precheck 0 FAIL.
- THE FAST LANE (the owner, 04:49 11-27: a change that only touches what is on screen lands as soon as its own tests are green, the checker reading it afterwards): no file under `server/`, `.github/`, `src/networking/`, gold, bag or login code; your ready message goes when `test`, `playable`, `memory-budget` and `lint-build` are green on your exact head.

## Not yours

`ui2.css` and the kit's files (`src/ui/kit/`): read, never edit (if the job truly needs a line there, ask the orchestrator first, one message, your recommendation in it). `InventoryPanel.jsx`, the Bag panel. UI2-feats (the Feats page), UI3-corner and UI3-tutor (the HUD's corner, `QuestCoach.jsx`) run tonight: stay out of their files. Sitting 72 lands about thirteen PRs on main in the next hours: merge `origin/main` ONCE, before your last push.
