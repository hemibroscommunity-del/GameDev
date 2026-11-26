card: UI3-ownplate
branch: claude/plan-ui3-9-ownplate
prs: (draft, base claude/plan-ui3-2-hud; opened with this push)
state: working

## Done
- Tag 6788: your own plate goes while the HUD shows your name. The rule:
  src/game/ownPlate.js (nameDrawn, selfNameDrawn, `?ownplate=1`); the renderer
  builds or destroys it on a change (entityRenderer.js _ownPlateSync 6352,
  factory 7123, your update 14953); suite tools/guards/own-plate.test.mjs
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
  its size with no plate (mp-ownplate 4: same half and top, on and off).
- emoteFx.js:103 / jumpFx.js:139 / formShade move the whole _uiLayer: no change.
- onePic: peerImpostor.js:165 bakes otherPlayerDisplays only; yours never baked.

## Next
- Final runs on this code (a helper: mp-ownplate, mp-charhud, mp-ghostaudit
  stand x full each direction, mp-membudget, mp-alliance, mp-clanparty);
  precheck; push; the PR.

## Found
- (none yet)

## Needs
- Nothing. The merge round had not landed when checked: origin/main eb90c6fd
  already in, origin/claude/plan-ui3-2-hud still 8042b993 (this branch's base).
