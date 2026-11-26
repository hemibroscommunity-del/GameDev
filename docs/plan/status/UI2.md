card: UI2
branch: claude/plan-ui2-8-bro
prs: the kit's draft PR #2368 (ready); the frame's #2369 (stacked on it; ready); Bro's landing (stacked on #2369; ready)
state: ready

## Done
- v2.3.6680, the build's step 1 (the kit; branch claude/plan-ui2-5-kit): the tokens, the pieces (`src/ui/kit/`), `?uikit=1`, `?ui2shine=0`, `tools/guards/ui2-tokens.test.mjs`, `mp-uikit`, `docs/shots/ui2-kit-*.png`.
- v2.3.6681, step 2 PR 1 (the frame, ON; `?ui2=0` the way back, remembered as `bt_ui2`): `src/game/dashNav.js` (one state, one transition), `src/game/dashDests.js` (the Menu's eight doors, the Social and Settings hubs, More's fifteen roads), `dashboardPanelBus.js` a thin face over it, `dash/DashHeader.jsx`, `dash/MenuGrid.jsx` (and the Homestead's place), `dash/dashScroll.js` (a page's scroll kept, read at the frame's top), `ui2Frame.js` (the switch), the kit's header given its three roots and the Menu's mark (fixture plate "headers"), `deskKeys.js` (I, O, P...), `H.dashOpen(id)` / `H.dashMenuRoot`, the tests that pressed `[data-nav]` moved to it, `tools/guards/dash-nav.test.mjs` (13 dodges planted, each red), `mp-ui2frame` (25 of 25, twice, on the test box), precheck OK (613 suites), states.mjs's `dash-frame-*`, UI-DESIGN-NOTES "The dashboard" (the owner's 2026-11-25 words; the reversed decisions under "Tried before").
- v2.3.6683, step 3 PR 1 (card UI2-bro; branch claude/plan-ui2-8-bro): Bro's landing, six equal tiles (`src/game/broHub.js`, `sheet/BroLanding.jsx`), Character and Combat as the frame's pages (`dashDests.js` FRAME_PAGES broCharacter, broCombat; today's pages under the header), Points on Combat, the eight Progress doors' roads; the screen's pieces in the kit (Zones, the row of actions, the empty state, the one confirmation; `src/game/screenZones.js`, `src/game/pending.js`; fixture plates zones, empty, confirm); `H.dashOpen` reaches Bro's doors; `tools/guards/bro-hub.test.mjs` (10 plants), `screen-zones.test.mjs` (9 plants), each seen red; `mp-ui2bro` 16 of 16 on the test box; precheck OK.

## Next
- Step 2 PR 2 (6682), the growing motion; step 3 PR 2 (6684), Character's passport: fresh sessions'.

## Found
- The guide arrow's words for `[data-nav="hero"]` say "Tap Bro: points to spend" (src/ui/guideArrow.js:217); under the frame that hook is worn by the Menu button (Bro's tile on the Menu's root). Its words are outside this card.
- ControlsTutorial.jsx:106 aims at `.bt-navrail [data-nav="dashboard"]` (only under ?ui2=0); its first selector `[data-tut="coach-gear"]` still finds Gear's tile.
- (6683) Fourteen phone scenarios read today's Bro card right after opening 'hero' (mp-achievements, -apchip, -bandshots, -brocard, -bropages, -catgrid, -deskkeys, -lazyfail, -pointheads, -pointsfly, -pointsreset, -pointsswitch, -statnocap, -tapthrough): under the landing they reach it through Character (`H.dashOpen(P, 'broCharacter')`) or run under `?ui2=0`. Not run here; the tests part's.
- BandGrip's handle, tapped on an open page, calls toBar() then folds: under the frame that is Gear's root then closed, so Gear's own page stack is reset by the handle (the Menu's is kept). BandGrip.jsx is not this card's.

## Needs
- (6683) Journey: asked the orchestrator once (01:58 UTC 11-26); built on the default (it stays in the Settings hub; PR 2's passport gets its door).
- Nothing else.  Answered by the orchestrator (part 20, 00:38 UTC 11-26, "go"): the Social and Settings hubs, and Journey in the Settings hub for this step only ("moves under Bro at step 3").
