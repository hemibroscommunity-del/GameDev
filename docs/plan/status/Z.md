card: Z
branch: claude/plan-z-sitting-2
prs: this PR, tag 5033, the last line of the list (ready)
state: ready

## Done
- Sitting 2, 2026-11-14, `main` at d2e096a. 9 PRs ready, each `test` green.
  Rehearsed by hand (W's script is in #1676): the 7 below merged on `main`,
  then precheck 0 FAIL, `npm run build` green, `questline` 187 of 187 (all
  9 too). `/repo-review` in full on #1681, #1686, #1691, #1694, #1699, #1700.
  Ticked 8.6, 8.7, 9.0, 9.4, 10.1, 11.1, 11.2. No size line or census is due.

## The list: merge in this order, in one sitting, each "Create a merge commit"
1 #1676 W4 · 2 #1682 X1 · 3 #1683 X2 · 4 #1686 E1 (deploys the worker; the
live flag `daybook`, the list's only flag or cap) · 5 #1691 E2 (deploys) · 6
#1694 E3 (deploys) · 7 #1681 H3 (client only) · 8 this PR. Stacked: no squash.

## Held (expires at sitting 3)
- #1699 E4 (schema 21): nothing restores `_econ` at the join (`join.js`), so
  its own worker saves a blank over a stored one (3 probes: 500, 900 to 0):
  a rollback from PR 5 to it erases the counts. Mend: the join's restore
  line in it (E's Needs: the owner's yes) or the bump moved to PR 5; a
  join-then-save test; its PR says a rollback needs `newersave: false`.
- #1700 H4: `maskedBakeWorker.js` "gear numbers not here" returns with no
  `sheetsLetGo`/`closeInputs`: those sheets stay pinned past the 8 MB cap.
  The kept sheets (8 MB) have no `MEMORY-MAP.md` slot, and `mp-membudget`
  counts a worker's heap and buffers only, not its bitmaps (CLAUDE.md §7).

## Stalled
- Y (`claude/plan-y-farm-gate`): `stalled`, waiting on the owner's A, B or C.

## Found, no card owns it (owner: start a session, or put it on a card)
- N, B, A, G say `ready` on DRAFT PRs: a draft is not ready (card Z step 2).
  Mark each "Ready for review" for sitting 3 (G waits for your yes).
- `mp-topaudit` red, the GAME's: `pixiRenderer.js:869` passes no `topInset`
  to `wheelMinimap.js` (B's Found). `state-census.mjs --check` still stale.
- For E: `daybook.js` takes an array with gaps and any `now` (a phone's clock
  stops its puts); a dropped item's pile ends by no road; a key in `_econ`
  bumps `ECON.V`. For H: a Leaderboard's faces a step at a time (unmeasured).
- Waiting on the owner: E (2), Y (1), N (1), A (1), B (1), G (the pictures).
