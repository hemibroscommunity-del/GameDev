card: UI3-ownplate
branch: claude/plan-ui3-9-ownplate
prs: draft on claude/plan-ui3-2-hud (opened with this push; its number in the PR list)
state: ready

## Done
- Tag 6788: your own plate goes while the HUD shows your name. The rule:
  src/game/ownPlate.js (nameDrawn, selfNameDrawn, `?ownplate=1`); the renderer
  builds or destroys it on a change (src/rendering/ownPlateFx.js; entityRenderer.js
  factory 7069, your update 14899); suite tools/guards/own-plate.test.mjs
  (every dodge planted red); phone test mp-ownplate.

## What your own plate carried (reading 1), and where it went
- name + `[TAG]` (alliance.js:29 plateNameWithTag), gold level circle,
  verified badge, backing: one capsule, entityRenderer.js:5852 _attachNamePill
  (Texts 5888, 5895; badges 5929-5944). GONE on your screen.
- party marker (5936): drawn on others' plates only; yours never had one.
- Safe / PvP / Outlaw chip: not on the bro, on the minimap (plateSafety.js:1-17).
- threat skull (7136): STAYS, over the band (14997 band, _selfBandHalf 6404).
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
