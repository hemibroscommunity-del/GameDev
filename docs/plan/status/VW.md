card: VW
branch: claude/vw-view-079
prs: PR 1 (6580, ready)
state: ready

## Done
- PR 1 (6580): `VIEW_OUT_DEFAULT` 0.77 -> 0.79 (written in viewCap.js, which renderRes also reads: it had taken the reference 0.77 as the default; its pixel budget is now x(0.77/0.79)^2, same pixels a game px); mp-zoomout and mp-landscape-view read the default from the file; view-cap spec and UI-DESIGN-NOTES say it.

## Next
- waits for the gatekeeper.

## Found
- Measured on the test box: server suite 591 green, questline 187/187, precheck OK; screenshot docs/plan/census/vw-view-0.79.png (390x844, dsf 2, bro ~66 CSS px; view 822x1296 with the dashboard open). mp-zoomout and mp-landscape-view were mended to read the default, not run (the sweep is the gatekeeper's lane).

## Needs
- nothing.
