card: VW
branch: claude/vw-view-079
prs: PR 1 (6580, merged #2331), part 2 (6581, ready)
state: ready

## Done
- PR 1 (6580): `VIEW_OUT_DEFAULT` 0.77 -> 0.79 (written in viewCap.js, which renderRes also reads: it had taken the reference 0.77 as the default; its pixel budget is now x(0.77/0.79)^2, same pixels a game px); mp-zoomout and mp-landscape-view read the default from the file; view-cap spec and UI-DESIGN-NOTES say it.

- Part 2 (6581): the five red lines were the TESTS, not the game. mp-zoomout 1b compared a dashboard-FOLDED number (the owner's 64) with a dashboard-OPEN bro (a fresh player arrives open: 48.9 px at 0.77, red before 6580 too); mp-landscape-view still said 1330 (1024 / 0.77), the upright height is 1024 / the view (1296 at 0.79). Both now pin the owner's 0.79 as one literal, fold the band (new `H.foldBand`) and read the owner's phone (430x775 canvas: bro 63.3 CSS px at 0.79, 61.7 at ?zoom=0.77, drawn 645x1163); render-res 1g pins the budget (4.296M phone, 1.970M computer). Plants: default 0.77 and the budget factor dropped, both red in node. Phone runs: zoomout 11/11, landscape-view 69/71 (the 2 were my own new buffer line, wrongly 3x: a phone draws 1.5, corrected, not re-run).

## Next
- waits for the gatekeeper.

## Found
- Measured on the test box: server suite 591 green, questline 187/187, precheck OK; screenshot docs/plan/census/vw-view-0.79.png (390x844, dsf 2, bro ~66 CSS px; view 822x1296 with the dashboard open). mp-zoomout and mp-landscape-view were mended to read the default, not run (the sweep is the gatekeeper's lane).

## Needs
- nothing.
