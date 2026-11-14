card: Z
branch: claude/plan-z-sitting-1
prs: this PR, tag 5032, the last line of the list (ready)
state: ready

## Done
- Sitting 1, 2026-11-14, `main` at f27d1d8. 17 PRs ready, each `test` green.
  Rehearsed by hand (W's script is in the held #1676): the 16 below merged
  on `main`, then precheck 0 FAIL, `npm run build` green, `questline` 187
  of 187. `/repo-review` in full on #1662, #1668, #1675: nothing holds one.
  Nothing ticked: no step's PRs are merged on `main` yet (the card's word).

## The list: merge in this order, in one sitting, each "Create a merge commit"
1 #1661 W1 · 2 #1662 W2 (deploys the worker) · 3 #1663 W3 · 4 #1666 S1
5 #1669 S2 · 6 #1677 F1 · 7 #1678 F2 · 8 #1667 C · 9 #1673 D · 10 #1665 I
11 #1670 J · 12 #1672 J · 13 #1674 J · 14 #1679 J · 15 #1668 H1 (the only
game code: `bodyBake.js`) · 16 #1675 H2 (deploys the worker) · 17 this PR
- A squash of #1662, #1663, #1669, #1678 or #1675 conflicts on its status
  file (the branches are stacked): merge commits only.

## Held (expires at sitting 2)
- #1676 W4: `git merge origin/main` into it conflicts in `CLAUDE.md` §3
  (#1671's orchestrator line). W merges `main` in, keeping both lines.

## Stalled
- None: every status file says ready; no branch is three hours quiet.

## Found, no card owns it (owner: start a session, or put it on a card)
- Red on `main`, the GAME's: `mp-farmmusic` step 4, out of the farm's gate
  into Frost Ridge (`zoneTransitions.js`, `wheelTownDoors.js`; J's `red.md`).
- `server/test/old-map.test.mjs` §1 reads only `run.mjs`'s table: since #1661
  a new scenario with no world passes GitHub (precheck and the harness still
  refuse it). For card B (a guard), with: precheck runs a check
  `rails.test.mjs` refuses (an arrow export); `run.mjs`'s table names
  `landview`, `thumbbtn` hide a new file of the same name.
- Card H: a worker that hangs is restarted at each return, ~20 s of plain
  looks each time (unproven on a device); `BT_BW_PARTS` takes a typo green.
- After #1668, `state-census.mjs --check` says `state.md` is one row stale.
- The readers' faults (the Found of S, C, D, I, J, H) wait for their cards.
- Needs, the owner's: the questions in W's, S's and C's status files.
