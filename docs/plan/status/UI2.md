card: UI2
branch: claude/plan-ui2-9c-equipment
prs: UI2-gear PR 3, v2.3.6689 (draft, base main; ready once its checks are green)
state: ready

## Done
- v2.3.6680, the build's step 1 (the kit; branch claude/plan-ui2-5-kit): the tokens, the pieces (`src/ui/kit/`), `?uikit=1`, `?ui2shine=0`, `tools/guards/ui2-tokens.test.mjs`, `mp-uikit`, `docs/shots/ui2-kit-*.png`.
- v2.3.6681, step 2 PR 1 (the frame, ON; `?ui2=0` the way back, remembered as `bt_ui2`): `src/game/dashNav.js` (one state, one transition), `src/game/dashDests.js` (the Menu's eight doors, the Social and Settings hubs, More's fifteen roads), `dashboardPanelBus.js` a thin face over it, `dash/DashHeader.jsx`, `dash/MenuGrid.jsx` (and the Homestead's place), `dash/dashScroll.js` (a page's scroll kept, read at the frame's top), `ui2Frame.js` (the switch), the kit's header given its three roots and the Menu's mark (fixture plate "headers"), `deskKeys.js` (I, O, P...), `H.dashOpen(id)` / `H.dashMenuRoot`, the tests that pressed `[data-nav]` moved to it, `tools/guards/dash-nav.test.mjs` (13 dodges planted, each red), `mp-ui2frame` (25 of 25, twice, on the test box), precheck OK (613 suites), states.mjs's `dash-frame-*`, UI-DESIGN-NOTES "The dashboard" (the owner's 2026-11-25 words; the reversed decisions under "Tried before").

- v2.3.6682, step 2 PR 2 (branch claude/plan-ui2-7b-grow, base claude/plan-ui2-7-frame): the growing motion (`src/game/dashGrow.js`, `dash/DashGrowBox.jsx`, `dash/dashGrow.css`, `dash/dashGrowSwitch.js`; `?dashgrow=0` and reduced motion give none; its switch row); leftover A, the handle hides and keeps both workspaces (dashNav's `fold`, BandGrip.jsx); leftover B, the words and arrows that named a moved button (`src/data/say/dashGuide.js`: the guide arrow, the coach's reward, points and Login Key lessons, the controls tour's two rings). dash-nav.test 78 checks (P14, P15, M1 to M5 planted, each red); mp-ui2frame's steps 12a-g and 13.

- v2.3.6689, step 5 PR 3 (card UI2-gear; branch claude/plan-ui2-9c-equipment, base main): Bro's Equipment door opens a showcase (`sheet/GearShowcase.jsx`, page `broEquip`: the figure, the nine worn cells by Gear's one body table `src/game/gearShowcase.js GEAR_BODY`, no bag, Manage Gear for yourself only); each cell and the player card's equipment row open the one item page (`itemPageOpen.js`: showcase, profile and another player's read-only sources); `tools/guards/gear-showcase.test.mjs` (S1-S10 planted, each red); `mp-ui2gear` steps 8c, 9c, 11-14; `ui2-bro-equipment` in states.mjs and the notes.

## Next
- Nothing on UI2-gear: its three PRs are up.  The Codex's road into the item page is UI2-codex's: it enters `openItemPage({ from: 'codex', ... })` (dash/itemPageOpen.js), place 'codex'.

## Found
- (mended in PR 2) the guide arrow's "Tap Bro" on the Menu button; ControlsTutorial's rings; the handle that reset Gear's pages.
- The points' flight (src/game/questFly.js QUEST_FLY_TARGETS.points) lands on the Menu button under the frame (it wears [data-nav="hero"]): the road to Bro, left as it is (server/test/points-fly.test pins the list; a file there deploys the worker).

- (UI2-gear PR 3) `ItemTooltip.jsx` is not mounted (its parent `InventorySurface` left GameApp): no road to move, listed in the PR.
- (UI2-gear PR 3) mp-ui2bro's step 2c reads "Equipment opens Gear": it now opens the showcase (for the tests part).

## Needs
- Nothing.  Answered by the orchestrator (part 20, 00:38 UTC 11-26, "go"): the Social and Settings hubs, and Journey in the Settings hub for this step only ("moves under Bro at step 3").
