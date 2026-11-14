card: T
branch: claude/plan-t-1-switches (one branch a PR, each begun from the one before: -1- to -7-; merge them in order)
prs: #1754 (5301, ready)
state: ready

## Done

- PR 1 (5301), on `main` at 7593b4e: the table (250 rows: 229 live
  flags, 14 memory savers, and the 7 page switches other cards added
  since: `?pixbudget`, `?npcheads`, `?coinflip`, `?treenumbers`,
  `?bakeurl`, `?equipredraw`, `?foldgentle`; card A's `report`,
  `reportspeed`, `roomrow` among the flags), the scanner, the census
  guard (5 break proofs tried), `docs/SWITCHES.md`, the spec, the
  scoreboard row, liveops.test §8f and §8g on the scanner. Its merge
  deploys the worker (it touches `server/test/`).

## Next

- PR 2 (5302), the page's game-side rows, once PR 1 is merged.

## Found

- liveops.test §8f missed flag reads in shapes it did not know (the
  scanner reads them now): `this && this._liveFlags` (`lifenoheal`,
  `lifesave`, `goldlog`, `goldonesum`), `room._liveFlags` behind a helper
  (moveclaims.js), `_liveFlags.disable_bigbags`, name-taking helpers
  (`_drFlagOff`, `_elemStrongOn`, `_moveKindOn`, `_gemWeightOff`,
  `_fightLockSwitchOff`), and `f[HEAP_BURN.FLAG]`-style reads.
- Card L's `?<system>reset=0` switches give themselves rows once PR 1 is
  on `main` (the guard fails a new name with no row).

## Needs

- The gatekeeper: PR 1 merged (it deploys the worker).
