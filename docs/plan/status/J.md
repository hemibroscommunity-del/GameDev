card: J
branch: claude/grand-plan-J-red-on-main
prs: census (opening)
state: working

## Done

- The sample, run 2026-11-13/14 (the owner chose the sample):
  `docs/plan/census/red.md`. Four reds, each red twice alone.

## Next

- Tag 5036: `mp-soundcues` 2c, the shield on Q (the test's; green alone).
- Tag 5037: `test-world-core.mjs --check`, four stale patterns and the
  crash at its `worldTrial.js` import (the test's).

## Found

- `mp-farmmusic` step 4 (the GAME's, suspected): out through the farm's
  gate the player lands in Frost Ridge, ~3,900 px from where he stood.
  Suspect `src/game/zoneTransitions.js` (farm return, `_farmOut`) and
  `src/game/wheelTownDoors.js`. red.md row 3.
- `head-bake.mjs --check` is red only because the sheets are 8-bit and the
  check bakes at 16: `--check --bits 8` is green. `roles.json`'s code hash
  is stale (precheck `look-heads` would WARN on a PR touching the heads). red.md row 2.
- STATE-MACHINES' "Already red" list: `mp-block`, `mp-pvpshield` are gone;
  `mp-linger` is green.

## Needs

- The owner: head-bake's red is the command, and its fix is outside card
  J's files. Should card J make `--check` read each sheet's bits from
  `roles.json` (`tools/art/head-bake.mjs`, tag 5038), or leave it to the
  card that owns the art tools?
