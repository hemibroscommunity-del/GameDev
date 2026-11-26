card: UI2
branch: claude/plan-ui2-9-gear (step 5 PR 1, stacked on claude/plan-ui2-7-frame)
prs: the kit's draft PR #2368 (ready); the frame's #2369 (stacked on it; ready); the item page's draft PR (UI2-gear 6687, stacked on #2369; ready)
state: ready

## Done
- v2.3.6680, the build's step 1 (the kit; branch claude/plan-ui2-5-kit): the tokens, the pieces (`src/ui/kit/`), `?uikit=1`, `?ui2shine=0`, `tools/guards/ui2-tokens.test.mjs`, `mp-uikit`, `docs/shots/ui2-kit-*.png`.
- v2.3.6681, step 2 PR 1 (the frame, ON; `?ui2=0` the way back, remembered as `bt_ui2`): `src/game/dashNav.js` (one state, one transition), `src/game/dashDests.js` (the Menu's eight doors, the Social and Settings hubs, More's fifteen roads), `dashboardPanelBus.js` a thin face over it, `dash/DashHeader.jsx`, `dash/MenuGrid.jsx` (and the Homestead's place), `dash/dashScroll.js` (a page's scroll kept, read at the frame's top), `ui2Frame.js` (the switch), the kit's header given its three roots and the Menu's mark (fixture plate "headers"), `deskKeys.js` (I, O, P...), `H.dashOpen(id)` / `H.dashMenuRoot`, the tests that pressed `[data-nav]` moved to it, `tools/guards/dash-nav.test.mjs` (13 dodges planted, each red), `mp-ui2frame` (25 of 25, twice, on the test box), precheck OK (613 suites), states.mjs's `dash-frame-*`, UI-DESIGN-NOTES "The dashboard" (the owner's 2026-11-25 words; the reversed decisions under "Tried before").

- v2.3.6687, step 5 PR 1 (card UI2-gear, the one item page): `src/game/itemInspect.js` (the model: identity by the game's grades, whose and where, the facts, the one action list narrowed by context, an off action kept with its reason), `dash/ItemPage.jsx` + `itemPage.css` (the frame's page `item` on Gear's stack), `dash/itemPageOpen.js` (opener, bus, runner), `dash/gearCells.js` (Gear's cell reader moved out: GearTab 1,231 -> 1,199 lines), Gear's card head the door under the frame, `tools/guards/item-inspect.test.mjs` (10 dodges planted, each red), `mp-ui2gear`, states.mjs `dash-item-page`, UI-DESIGN-NOTES "The one item page", `docs/shots/ui2-gear-item-*.png`.

## Next
- PR 2 (6682), the growing motion: a fresh session's (the card's line). Entries already carry `from` (a tile's cell).
- UI2-gear PR 2 (6688: the two panels, the quick looks, the comparison) and PR 3 (6689): fresh sessions'.

## Found
- UI2-gear: the ChatGPT packets (tools/qa/ui-review/packets.mjs) hold none of the `dash-frame-*` screens nor `dash-item-page` (--check-notes lists them); packets are outside the card.
- The guide arrow's words for `[data-nav="hero"]` say "Tap Bro: points to spend" (src/ui/guideArrow.js:217); under the frame that hook is worn by the Menu button (Bro's tile on the Menu's root). Its words are outside this card.
- ControlsTutorial.jsx:106 aims at `.bt-navrail [data-nav="dashboard"]` (only under ?ui2=0); its first selector `[data-tut="coach-gear"]` still finds Gear's tile.
- BandGrip's handle, tapped on an open page, calls toBar() then folds: under the frame that is Gear's root then closed, so Gear's own page stack is reset by the handle (the Menu's is kept). BandGrip.jsx is not this card's.

## Needs
- Nothing.  Answered by the orchestrator (part 20, 00:38 UTC 11-26, "go"): the Social and Settings hubs, and Journey in the Settings hub for this step only ("moves under Bro at step 3").
