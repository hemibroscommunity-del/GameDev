card: T
branch: claude/plan-t-2-page-game (one branch a PR, each begun from the one before: -1- to -7-; merge them in order)
prs: #1754 (5301, merged), PR 2 (5302, ready)
state: ready

## Done

- PR 1 (5301, #1754, merged): the table (250 rows), the scanner, the
  census guard, `docs/SWITCHES.md`, the spec, the scoreboard row,
  liveops.test §8f and §8g on the scanner.
- PR 2 (5302): the page's game-side rows (81: all but the drawing
  systems'; `?zoom` reads in `renderRes.js`, so it is PR 3's), and the
  gatekeeper's sitting-8 mend: `disable_verify`, `hidden_off` and
  `groundkeep` rowed; the scanner reads the shapes that hid a switch, each
  held by a fixture (check 9); excuses are functions, not text. 334 rows;
  unlisted 113; unknown births 2. No `server/` file: no deploy.

## Next

- PR 3 (5303), the drawing side's rows, once PR 2 is merged.

## Found

- liveops.test §8f missed flag reads in shapes it did not know (the
  scanner reads them now): `this && this._liveFlags`, `room._liveFlags`
  behind a helper, name-taking helpers, `f[HEAP_BURN.FLAG]`, and (sitting
  8) `_flagOn(VERIFY.FLAG_OFF)` and `_flagOn(HIDDEN.OFF_FLAG)`.
- `?debug`, `?nodebug` (src/debug/debugBus.js): born in April commits with
  no tag in the commit, its body or its merge: `born: 'unknown'`, counted.
- New switches add their own rows now (the table is on `main`): card L's
  `?<system>reset=0`, card SK's `?ridecoast=0`; card TF's `?folkwork=0`
  is already read (`src/rendering/folkPose.js`): PR 3 rows it.

## Needs

- The gatekeeper: PR 2 merged.
