card: UI2
branch: claude/plan-ui2-7-frame
prs: the kit's draft PR #2368 (ready); the frame's draft PR (stacked on it; ready)
state: ready

## Done
- v2.3.6680, the build's step 1 (the kit; branch claude/plan-ui2-5-kit): the tokens, the pieces (`src/ui/kit/`), `?uikit=1`, `?ui2shine=0`, `tools/guards/ui2-tokens.test.mjs`, `mp-uikit`, `docs/shots/ui2-kit-*.png`.
- v2.3.6681, step 2 PR 1 (the frame, ON; `?ui2=0` the way back, remembered as `bt_ui2`): `src/game/dashNav.js` (one state, one transition), `src/game/dashDests.js` (the Menu's eight doors, the Social and Settings hubs, More's fifteen roads), `dashboardPanelBus.js` a thin face over it, `dash/DashHeader.jsx`, `dash/MenuGrid.jsx` (and the Homestead's place), `dash/dashScroll.js` (a page's scroll kept, read at the frame's top), `ui2Frame.js` (the switch), the kit's header given its three roots and the Menu's mark (fixture plate "headers"), `deskKeys.js` (I, O, P...), `H.dashOpen(id)` / `H.dashMenuRoot`, the tests that pressed `[data-nav]` moved to it, `tools/guards/dash-nav.test.mjs` (13 dodges planted, each red), `mp-ui2frame` (25 of 25, twice, on the test box), precheck OK (613 suites), states.mjs's `dash-frame-*`, UI-DESIGN-NOTES "The dashboard" (the owner's 2026-11-25 words; the reversed decisions under "Tried before").

- v2.3.6681, the phone tests the frame moved (part 2, 22 scenarios on helpers, head 265140ff): 14 green or main's own reds (brocard 55/59, deskkeys, oneband 55/56, questguide 9/16, codex 4 of 39, crowdsweep 2 of 7 are red on main the same way); onboarding and codex's Snowman card were one-run flakes (green on rerun); gearveil step 3 and achievements 1b, 6b mended in the tests (Close keeps Gear's pick; Journey is in the Settings hub; a chip's page opens with Back to the Menu); achievements 9b a flake.

- v2.3.6681, part 3 (the two reds part 2 left): (1) THE GAME'S, mended at the rule: Esc pressed the LAST front `[data-esc]`, and the header's Close (the whole dashboard) came after the Ranks picker's ✕; now the kit header's Close is `data-esc-outer` and `deskKeys.js frontControl` presses it only when no other ✕ is in front (every page under the frame: Gear's filter and card, the item card...); `tools/guards/esc-front.test.mjs` (12 checks, 7 dodges planted, each red; the ALLOW list of wearers). (2) THE TEST'S: the page is held by this box's software drawing (about 6 s of long tasks in 6.4, the same with `?ui2=0` and with the dashboard shut; a trial click 5.2 s on either face), so Playwright's click landed about 4 s late and the second of two taps fell past the 4 s window; real touch taps reset every point. mp-pointsreset taps by the touchscreen and taps again once the page says armed. Precheck OK (614 suites). The four phone tests (ranksstyle, pointsreset, ui2frame, deskkeys) ran on helpers after the push: results in the message to the orchestrator.

## Next
- PR 2 (6682), the growing motion: a fresh session's (the card's line). Entries already carry `from` (a tile's cell).

## Found
- The guide arrow's words for `[data-nav="hero"]` say "Tap Bro: points to spend" (src/ui/guideArrow.js:217); under the frame that hook is worn by the Menu button (Bro's tile on the Menu's root). Its words are outside this card.
- ControlsTutorial.jsx:106 aims at `.bt-navrail [data-nav="dashboard"]` (only under ?ui2=0); its first selector `[data-tut="coach-gear"]` still finds Gear's tile.
- BandGrip's handle, tapped on an open page, calls toBar() then folds: under the frame that is Gear's root then closed, so Gear's own page stack is reset by the handle (the Menu's is kept). BandGrip.jsx is not this card's.

## Needs
- Nothing.  Answered by the orchestrator (part 20, 00:38 UTC 11-26, "go"): the Social and Settings hubs, and Journey in the Settings hub for this step only ("moves under Bro at step 3").
