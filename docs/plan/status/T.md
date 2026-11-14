card: T
branch: claude/plan-t-2-page-game (one branch a PR, each begun from the one before: -1- to -7-; merge them in order)
prs: #1754 (5301, merged), PR 2 (5302, ready)
state: ready

## Done

- PR 1 (5301, #1754, merged): the table (250 rows: 229 live
  flags, 14 memory savers, and the 7 page switches other cards added
  since: `?pixbudget`, `?npcheads`, `?coinflip`, `?treenumbers`,
  `?bakeurl`, `?equipredraw`, `?foldgentle`; card A's `report`,
  `reportspeed`, `roomrow` among the flags), the scanner, the census
  guard (5 break proofs tried), `docs/SWITCHES.md`, the spec, the
  scoreboard row, liveops.test §8f and §8g on the scanner. Its merge
  deploys the worker (it touches `server/test/`).

- PR 2 (5302): the page's game-side rows (81: all but the drawing
  systems'; `?zoom` reads in `renderRes.js` and is PR 3's), and the
  gatekeeper's sitting-8 mend: `disable_verify`, `hidden_off` and
  `groundkeep` rowed; the scanner reads the shapes that hid a switch, each
  held by a fixture (check 9). Unlisted 113 (PR 3), unknown births 2.
- Next: PR 3 (5303), the drawing side's rows.

## Found

- liveops.test §8f missed flag reads in shapes it did not know (the
  scanner reads them now): `this && this._liveFlags` (`lifenoheal`,
  `lifesave`, `goldlog`, `goldonesum`), `room._liveFlags` behind a helper
  (moveclaims.js), `_liveFlags.disable_bigbags`, name-taking helpers
  (`_drFlagOff`, `_elemStrongOn`, `_moveKindOn`, `_gemWeightOff`,
  `_fightLockSwitchOff`), and `f[HEAP_BURN.FLAG]`-style reads.
- New switches add their own rows (the table is on `main`): card L's
  `?<system>reset=0`, card SK's `?ridecoast=0`, card TF's (`?folkwork=0`
  is already read, in `src/rendering/folkPose.js`: a PR 3 row).
- `?debug`, `?nodebug` (src/debug/debugBus.js): born in April commits with
  no tag anywhere; `born: 'unknown'`, counted (the line 2).

## Needs

- Nothing.
