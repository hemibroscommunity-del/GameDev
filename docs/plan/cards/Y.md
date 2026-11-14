# Card Y: the farm's gate leads back where you stood

**Starts:** now. Found by card J (`docs/plan/census/red.md` row 3) and
routed by the gatekeeper's first sitting (`docs/plan/status/Z.md`).
**Read:** `CLAUDE.md` (§1 the world is the Wheel; never write a Wheel
coordinate into code or a test); the ten rules at the top of part 5 of
`docs/GRAND-PLAN.md`; `docs/plan/census/red.md` row 3;
`src/game/zoneTransitions.js` (the farm's return, `_farmOut`, near line
1127), `src/game/wheelTownDoors.js` (`rememberFarmTrip`),
`src/game/farmTrip.js` (`warpToFarm`); `tools/qa/mp/mp-farmmusic.mjs`
(read only).
**Tags:** 5400 to 5419. One PR is expected.
**Browser:** light (`farmmusic`, `questline`).
**Effort:** standard.

## PRs, in order

1. **(tag 5400) Out through the farm's gate, you stand where you left.**
   - Today: the Feed & Seed's "Visit Your Farm" remembers the spot (in
     BroTown's square), and the gate back drops the player about 3,900 px
     north-west, in Frost Ridge. The game's own words, at
     `rememberFarmTrip`: "the gate leads back out where you stood".
   - Find why (the remembered spot, its scale on the long Wheel, or a
     spawn that overrides it: `setWheelArrival`, `wantWheelSpawn`), and
     mend it in the game's files: `zoneTransitions.js`,
     `wheelTownDoors.js`, `farmTrip.js`.
   - A node test of the rule if the fault is in a rule node can run (a
     suite under `server/test/` that imports the `src/game/` file: its
     merge deploys the worker; say so).
   - Done when `node tools/qa/mp/run.mjs farmmusic` is green three runs
     of three, alone (TRAPS §177), and `questline` green.

## Readings chosen for you

- **The test is right; the game is wrong** (card J's verdict, red three of
  three). `mp-farmmusic.mjs` is card J's file: you do not change it.
- **Where the fault is outside these three files**: if it is in another
  file under `src/game/`, mend it there and say so. If it is in
  `src/ui/BroTown.jsx` or a renderer, read card H's status file
  (`docs/plan/status/H.md` on its branch) first; if H is in that file,
  put it under Needs and stop.
- **The history**: #1534 saw it red on two commits and green on a third
  between them. Read that PR's words before you guess.
- A coordinate of the Wheel is never written into code or a test: QA
  reads `H.wheelGeom()`.

## Not yours

`tools/qa/mp/*` (J's while J runs); the farm itself (`server/src/farm.js`).
