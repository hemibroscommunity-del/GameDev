card: EN
branch: claude/plan-en-1-leaves
prs: #2189 6200 (ready), 6201 (working, on #2189)
state: working

## Done

- #2189 (6200): 72 of 84 level-0 leaves + 17 constants moved (89/89
  byte-equal); 12 stay (guards' per-file lists). Suite 566 green,
  questline 187/187, membudget 11/11.

## Next

- 6201 (stacked on #2189): main's level 1-3 leaves (19 functions, 4
  constants) to the same leaf files, verbatim; `_mkCpuCanvas` stays (it
  reads `_mkBakeCanvas`, kept for PR 4).

## Found

- (none yet)

## Needs

- (none: the planning session answered constants, suites and systems.mjs,
  2026-11-18). Planning session is now part 6
  (session_01LccHam7XmUNAHQrA1CjiNH); heads go to gatekeeper sitting 46.
