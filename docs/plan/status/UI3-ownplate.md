card: UI3-ownplate
branch: claude/plan-ui3-9-ownplate
prs: #2411 (draft)
state: ready

## Done
- Tag 6788: your own plate goes while the HUD shows your name. The rule:
  src/game/ownPlate.js (nameDrawn, selfNameDrawn, `?ownplate=1`); the renderer
  builds or destroys it on a change (src/rendering/ownPlateFx.js; entityRenderer.js
  factory 7071, your update 14903); suite tools/guards/own-plate.test.mjs
  (every dodge planted red); phone test mp-ownplate.

## The mend (held by sitting 72: four-lines 1 and 1b red)
- Merged origin/main 5ab943fe once (conflicts: systems.mjs, main's list and
  ownPlate at its end, SYSTEMS.md rewritten by systems.test --write; ui.js's
  ledger, both sides, then state-census --ledger ui --write; QuestCoach.jsx:
  this PR's only change there was UI3-hud's charHudSpan, which main rewrote
  as hudCorner's cornerSpan: main's whole file taken).
- The big file gains calls only (finish.md part 5, rule 5): the factory's
  decision (ownPlateBuild), the plate's zoom arithmetic and its clamp
  (plateZoomFor, read by _fitPlateToZoom too), your band's half
  (ownPlateBandHalf) and the two QA probes (ownPlateProbeArm, now also
  __btSelfPlate) moved into src/rendering/ownPlateFx.js; _buildOwnPlate,
  _selfBandHalf and _plateZoomFor are gone; one import line (ownPlateFx.js
  passes selfNameDrawn on). Behaviour unchanged.
- four-lines on the merged tree: entityRenderer.js 7992 statements (main
  7992, its line 8008), 7959 code lines (main 7961, its line 7984): the
  PR's net there is 0 statements, -2 code lines. No line raised.
- own-plate suite: all 11 card dodges planted and red.

## What your own plate carried (reading 1), and where it went
- name + `[TAG]` (alliance.js:29 plateNameWithTag), gold level circle,
  verified badge, backing: one capsule, entityRenderer.js:5852 _attachNamePill
  (Texts 5888, 5895; badges 5929-5944). GONE on your screen.
- party marker (5936): drawn on others' plates only; yours never had one.
- Safe / PvP / Outlaw chip: not on the bro, on the minimap (plateSafety.js:1-17).
- threat skull (7136): STAYS, over the band (14946 band, ownPlateFx.js ownPlateBandHalf).
- HP bar (16791) takes the band in a fight: STAYS; the spend bars under the
  feet (7639): STAY. Chat bubble point (15014) and damage numbers
  (combatHelpers.js:702 heroPopupY) read the band: unchanged, the band keeps
  its size with no plate (mp-ownplate 4: same half, top within 1 px).
- emoteFx.js:103 / jumpFx.js:139 / formShade move the whole _uiLayer: no change.
- onePic: peerImpostor.js:165 bakes otherPlayerDisplays only; yours never baked.

## Next
- Nothing: the PR waits for the gatekeeper. Runs on the final code (after
  merging main e4f08ed6): mp-ownplate 16/16, mp-charhud 26/26, mp-ghostaudit
  stand x full every direction 9/9, mp-membudget 12/12, mp-alliance 16/16,
  mp-clanparty 21/21 (the last two now play ?ownplate=1: they read their own
  plate's [TAG]); own-plate suite green; precheck 0 FAIL.

## Found
- Merging main gave a conflict in src/ui/mobile/QuestCoach.jsx (UI3-hud's
  charHudSpan import beside main's bandGripOn): both kept; UI3-hud meets it too.

## Needs
- Nothing. Merged origin/main e4f08ed6 once; origin/claude/plan-ui3-2-hud was
  still 8042b993 (this branch's base), nothing to merge.
