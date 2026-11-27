card: UI4
branch: claude/plan-ui4-kit
prs: PR 1 (UI4-kit, tag 6840): draft, base main (its number in the orchestrator's message); a gatekeeper's list, the base of a stack (PR 2 stacks on it)
state: ready

## Done
- v2.3.6840, PR 1 (UI4-kit; branch claude/plan-ui4-kit from main eb48c22c): THE NINE ROLES, one table, `src/game/uiRoles.js` (V17:37-47 with the game's names: info, inspect, go, selected, adjust, commit, danger, disabled, slot; `KIT_PIECES` names every piece the kit exports and the roles it takes; `ui2Role()` the ONE place yesterday's props, a handler, a colour `c`, `selected`, become a role, and the Action's face). The prop is `intent` (V17:157's word): `role` is the browser's accessibility attribute, which the kit passes through (BroStrip's `role="group"`, the Tab's `role="tab"`). Ui2Stat, Ui2Fact, Ui2Tile, Ui2Action, Ui2Slot ask ui2Role and write `data-u2-role`; the header's Back and Menu `go`, Close `adjust`; Confirm's yes `commit`/`danger`, no `adjust`; Ui2Actions passes an action's `intent`. No style sheet reads the role: NO screen changes its look. The five pieces V17:49 names that the kit lacked, in today's look, on `?uikit=1` (plates roles, tab, stepper, inspect, compare, overlay) and in `states.mjs` (`ui4-kit-*`), none used by a screen yet: `Ui2Tabs`/`Ui2Tab`, `Ui2Stepper` (the trade window's), `Ui2InspectStat`, `Ui2Comparison` (signed text and a word; the rules `src/game/kitRules.js`), `Ui2Overlay` (a town window's frame). The guard `tools/guards/ui4-roles.test.mjs` (syntax tree; G1 to G8, its plants in part P) and its allow list `tools/guards/lib/rolesKnown.mjs` (78 role-less calls on main, per file; the total only falls). `mp-uikit` 11 and the pictures `docs/shots/ui4-kit-pieces.png`, `-sideways.png`. Docs: `docs/design/v17/` (the owner's four files), `docs/plan/cards/UI4.md`, `UI4-facts.md`, the decision log's line (part 13) and part 18, `UI-DESIGN-NOTES.md`'s section.

## Next
- PR 2 (UI4-look, tag 6841), stacked on this branch: the roles wear V17:37-49 behind `?v17look` (default on), reading `data-u2-role`; `?v17look=0` today's.
- PRs 4 to 6 name the intents on their screens' calls; `rolesKnown.mjs` falls with them (`node tools/guards/ui4-roles.test.mjs --write`).
- From this PR on, a NEW Ui2Action, Ui2Tile, Ui2Stat or Ui2Fact anywhere names its `intent` (the guard's 2a): an open branch that adds one without merges main and adds it.
