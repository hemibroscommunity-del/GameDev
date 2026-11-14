card: J
branch: claude/grand-plan-J-red-on-main
prs: #1670 (ready, census), #1672 (ready, soundcues), #1674 (ready, world check)
state: ready

## Done

- #1670 (tag 5035): the census, `docs/plan/census/red.md`. The owner chose
  the sample. Four reds, each red twice alone.
- #1672 (tag 5036): `mp-soundcues` 2c raises the shield with Q. 24/24 alone.
- #1674 (tag 5037): `test-world-core --check`, four patterns and the crash.
  544 passed, 0 failed.

## Next

- Waiting on the owner's answer below (head-bake, tag 5038), and on the
  gatekeeper for the three PRs.

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
