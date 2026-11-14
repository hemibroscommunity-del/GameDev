card: J
branch: claude/grand-plan-J-red-on-main
prs: #1670 (ready, census), #1672 (ready), #1674 (ready), #1679 (ready)
state: ready

## Done

- #1670 (tag 5035): the census, `docs/plan/census/red.md`. The owner chose
  the sample. Four reds, each red twice alone.
- #1672 (tag 5036): `mp-soundcues` 2c raises the shield with Q. 24/24 alone.
- #1674 (tag 5037): `test-world-core --check`, four patterns and the crash.
  544 passed, 0 failed.
- #1679 (tag 5038): `head-bake --check` checks at the bits on disk (8).
  59/59 a fresh bake. The owner chose card J to fix it (2026-11-14).

## Next

- Nothing on the card is left but the gatekeeper's list. Tag 5039 unused.

## Found

- `mp-farmmusic` step 4 (the GAME's, suspected): out through the farm's
  gate the player lands in Frost Ridge, ~3,900 px from where he stood.
  Suspect `src/game/zoneTransitions.js` (farm return, `_farmOut`) and
  `src/game/wheelTownDoors.js`. red.md row 3. Red 3 of 3.
- `roles.json`'s code hash is behind the head recolour code (the 8-bit bake
  is pixel for pixel what is on disk): precheck `look-heads` would WARN on
  a PR touching the heads. A re-bake clears it.
- STATE-MACHINES' "Already red" list: `mp-block`, `mp-pvpshield` are gone;
  `mp-linger` is green.

## Needs

- The gatekeeper: route the farm gate fault (Found, first line).
