card: T
branch: claude/plan-t-1-switches (one branch a PR, each begun from the one before: -1- to -7-; merge them in order)
prs: PR 1 (5301, built and green; opens when card N's #1684 is on main)
state: working

## Done

- PR 1 (5301), built on card N's walker branch (#1684), not yet opened:
  the table (240 rows: 226 live flags, 14 memory savers), the scanner,
  the census guard (5 break proofs tried), `docs/SWITCHES.md`, the spec,
  the scoreboard row (233 of 428), liveops.test §8f and §8g on the scanner.

## Next

- Open PR 1 once #1684 is on `main` (merge `main` in first, re-run the
  guard and precheck). Then PR 2 (5302), the page's game-side rows.

## Found

- liveops.test §8f missed flag reads in shapes it did not know (the
  scanner reads them now): `this && this._liveFlags` (`lifenoheal`,
  `lifesave`, `goldlog`, `goldonesum`), `room._liveFlags` behind a helper
  (moveclaims.js), `_liveFlags.disable_bigbags`, name-taking helpers
  (`_drFlagOff`, `_elemStrongOn`, `_moveKindOn`, `_gemWeightOff`,
  `_fightLockSwitchOff`), and `f[HEAP_BURN.FLAG]`-style reads.
- For the gatekeeper's order: card A's worker `report` and `roomrow`
  (#1706, #1708) and card G's `?pixbudget` (#1701) are not on `main`:
  each adds its own row once T's PR 1 is merged (the guard fails it
  otherwise). Card A's page `?report=0` is on `main`: T's PR 2 or 3 rows it.

## Needs

- Card N's #1684 on `main` (PR 1 waits for it).
