# Red on `main`: the census (card J, step 8.1; tag 5035)

Taken 2026-11-13/14 on `main` at 2d4138e (v2.3.5020) in one cloud session:
4 vCPUs, the pre-installed Chromium, `npm run build` fresh. The owner chose
the SAMPLE (about an hour), not every phone test (six hours or more). Each
red was run again, ALONE, before it was written down (TRAPS §177); every red
below was red both times (`farmmusic` three times).

## The sample

| Command | Verdict |
|---|---|
| `cd server && npm test` | green: 369 suites, 47.7 s |
| `node tools/world/test-world-core.mjs --check` | RED: 4 checks, then a crash. The TEST's |
| `node tools/art/head-bake.mjs --check` | RED: 49 sheets "STALE". The COMMAND's (green with `--bits 8`) |
| `node tools/qa/mp/run.mjs questline` (every PR) | green: 187 checks |
| `node tools/qa/mp/run.mjs membudget` (every PR) | green: 11 checks |
| `node tools/qa/mp/run.mjs farmmusic` | RED: step 4. The GAME's (suspected) |
| `node tools/qa/mp/run.mjs soundcues` | RED: check 2c. The TEST's |
| `node tools/qa/mp/run.mjs linger` | green: 13 checks (STATE-MACHINES' red is gone) |

STATE-MACHINES' "Already red on `main`" also names `mp-block` and
`mp-pvpshield`: neither exists any more (deleted with the old map, v2.3.4674).

## The reds, one row a cause

### 1. `test-world-core.mjs --check`: the check reads source that moved (the TEST)

Four checks match the game's source by regular expression, and the game
changed on purpose under each; then section 6 crashes the run.

- **"the loop takes it through the held attack's own gate..."** (line ~3276):
  looks for `if (_wantAtk && (_mcOn || !_flickWait)` straight after
  `var _wantAtk = ...`. Since the staff's feel (v2.3.4803) a block sits
  between them (`_sfFire`, `src/game/monsterCombat.js` ~1660). The gate is
  the same.
- **"the quests that need a door count the Wheel's..."** (~3853): wants
  `setWheelDoorsOpen(mode === 'wheel' && wheelObjectsOn())` (the island mode
  is gone, v2.3.4676: now `setWheelDoorsOpen(wheelObjectsOn())`) and
  `rememberFarmTrip(S2)` in `BroTown.jsx` (moved to `src/game/farmTrip.js`
  `warpToFarm`, v2.3.4366).
- **"the Town Hall is a hall of the Wheel's own with a window..."** (~4056):
  wants the dashboard page titled `'Ranks'` (now `'Leaderboards'`,
  v2.3.4172) and the hall's row to open it under More (it has its own
  button since v2.3.4393: `dashboardPanelBus.open('leaderboard')`).
- **"...its stage is 62% of the room's height..."** (~4107): wants the card's
  width chosen by `deskWideActive()`; it is `deskBigActive()` now
  (`BroTown.jsx` ~13824). The CSS it reads is unchanged.
- **The crash** (line 4555): `await import('src/game/worldTrial.js')` for one
  table, `WHEELS`. worldTrial.js now reaches the renderer at load
  (wheelMonsterArt.js -> monsterVariantSprites.js -> waterFrogSprites.js ->
  waterAttackFx.js -> combatHelpers.js -> entityRenderer.js, whose
  `new ColorMatrixFilter()` needs `document`). Node stops: "ReferenceError:
  document is not defined", and the 33 checks after it never run.
  Run past it, they all pass: 540 passed, the 4 above failed.
- The old list's "the Town Hall window, the forge room's stage, two quest
  checks" are three of these four, and the crash was already there at
  582244a (the oldest commit this clone holds).
- **Fix**: the four patterns read today's lines; `WHEELS` read from the
  file's text, as the rest of the suite reads source. Tag 5037.

### 2. `head-bake.mjs --check`: checked at 16 bits, baked at 8 (the COMMAND)

- Every head sheet on disk was baked with `--bits 8` (the owner's 256-colour
  law: `roles.json` says `bits: 8` and `cut` on all 59). `--check` with no
  `--bits` bakes at 16 and compares, so the 49 sheets that a 16-bit bake
  makes differently (48 change size: 3-4 colour-table rows become 14-26)
  are all "STALE". The 10 that are exact either way pass.
- `node tools/art/head-bake.mjs --check --bits 8`: **green**, "the numbers
  on disk are a fresh bake", 59 of 59.
- The command in STATE-MACHINES, card J and precheck's `look-heads` WARN
  text all say `--check` alone. Precheck runs `--hashes` (only on a PR touching the heads), which
  answers 2 ("the code or a catalog changed since the bake": `roles.json`'s
  code hash 2a9542de, today's 580f5596), a WARN only. The 8-bit bake is
  pixel for pixel what is on disk, so only the stored hash is behind.
- **Fix**: the owner chose card J to fix it (2026-11-14): `--check` with
  no `--bits` checks at `roles.json`'s own bits. Tag 5038.

### 3. `mp-farmmusic` step 4: the farm's gate leads into the frost land (the GAME, suspected)

- Failing step: "4. ...the town's track again": back through the farm's
  gate the land music is `frost.mp3`, not `village.mp3`.
- Measured (a temporary readout, removed): the player stood at BroTown's
  square (87168, 87456) when the Feed & Seed's "Visit Your Farm" took him
  to the farm; out through the gate he stood at (84383, 84697), about
  3,900 px north-west, in Frost Ridge. The game's own words
  (`src/game/wheelTownDoors.js` `rememberFarmTrip`, `zoneTransitions.js`
  ~1127): "the gate leads back out where you stood". The button goes
  through `warpToFarm` (`src/game/farmTrip.js`), which calls
  `rememberFarmTrip`, so the test takes the game's road.
- The music follows the land correctly; it is the PLACE that is wrong.
- Suspect files: `src/game/zoneTransitions.js` (the farm return, `_farmOut`,
  `setWheelArrival` / `wantWheelSpawn`), `src/game/wheelTownDoors.js`.
- History: #1534 saw it red on 6cb46cfe and 8d6f9e44 and green on d48b5391.
  Red 3 of 3 here. Not card J's to fix: under Found.

### 4. `mp-soundcues` 2c: the shield is Q's now (the TEST)

- Failing check: "2c. the shield held up (the right mouse button) and let
  down": shield never up, no buckle (`{"up":{"on":false,"n":0}}`).
- Since v2.3.4323 (owner: "right click should be special attack instead.
  Block should be moved to something else") the right button is the special
  and Q toggles the shield (`src/game/desktopControls.js` KeyQ, `BroTown.jsx`
  `_desktopShieldToggle`). The test's own header already said Q.
- **Fix**: press Q to raise, Q to lower. Green alone: 24 of 24. Tag 5036.

## Not run (the sample's edges)

The other ~370 phone tests. The owner can ask for the full run.
