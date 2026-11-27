card: UI3-ownplate
branch: claude/plan-ui3-9-ownplate
prs: #2411 (draft)
state: ready

## Done
- Tag 6788: your own plate goes while the HUD shows your name. Rule
  src/game/ownPlate.js (`?ownplate=1`); the renderer calls
  src/rendering/ownPlateFx.js (entityRenderer.js factory 7071, update 14903);
  suite tools/guards/own-plate.test.mjs; phone test mp-ownplate.
- Reading 1: name, `[TAG]`, level circle, badge, backing GO on your screen;
  the skull, HP bar (the band keeps its size), spend bars, chat bubble and
  damage numbers STAY; onePic bakes only other players.

## The mend (sitting 72's hold: four-lines 1 and 1b red)
- Merged origin/main 5ab943fe once: systems.mjs (main's list, ownPlate at
  its end; SYSTEMS.md by --write), ui.js ledger (both sides; census
  --write), QuestCoach.jsx (this PR's only change was UI3-hud's
  charHudSpan, which main rewrote as cornerSpan: main's whole file).
- The big file gains calls only (rule 5): ownPlateBuild (the factory's
  decision), plateZoomFor (the zoom and its clamp, read by _fitPlateToZoom
  too), ownPlateBandHalf, ownPlateProbeArm (now also __btSelfPlate) moved to
  ownPlateFx.js; one import line. Behaviour unchanged. Ledgers made again
  (render.js, census/M-tables.md).
- four-lines, merged tree: entityRenderer.js 7992 statements (main 7992,
  line 8008), 7959 code lines (main 7961, line 7984). No line raised.
- own-plate suite: all 11 card dodges planted and red.

## Next
- Nothing: waits for the gatekeeper. On the final code: mp-ownplate 16/16,
  mp-alliance 16/16, precheck 0 FAIL. Before the mend (main e4f08ed6):
  mp-charhud 26/26, mp-ghostaudit sample 9/9, mp-membudget 12/12,
  mp-clanparty 21/21.

## Found
- main's src/state/render.js lacks a `_camFollow` row (cameraFollow.js):
  one of the 22 unlisted allowed; not added here.

## Needs
- Nothing.
