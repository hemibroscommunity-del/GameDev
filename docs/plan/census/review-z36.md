# The gatekeeper's review, sitting 36 (card Z; tag 5674)

Taken 2026-11-17 on `main` 52244a81 (sitting 35 merged: K #2024, L
#2027, RT #2026, Z #2029). Two cards still run (K and L), told this
sitting's session at its start (15:37 UTC). Tags bare.

## Heads, merge bases and trees

Every listed PR is based on `main` (`base.ref`), open and not a draft,
with one merge base at every step (`git merge-base --all`, each against
`main` with the PRs above it merged in as merge commits). The tree after
each merge:

1 K #2028 30d7681eba2b841d800cedb446a1d8ec826b7194 -> 6c43fb232b353fedf9ca333af3d4653948c66873
2 Z (this PR): its head and tree are in the list (`status/Z.md`).

#2028 was built on #2024 (its one base fe1297b0, #2024's head, now on
`main`): the base GitHub shows (01b8f33d) is only the `main` it was
opened against. Reviewed and rehearsed at ffff340b (tree f16d6174); at
15:50 K sent 30d7681e, one commit on top: `docs/plan/status/K.md` only
(card K `done`, the planner's word: item 14 closed). The new tree differs
from the rehearsed one in that file alone.

## K #2028 (5553): `cookstart`, a cook is a cook the worker started (OFF)

READY (reviewed in full: `server/`). Card K PR 14, the cook's result
(4.2); K's tag 5553 (block 5540-5559). Open, not a draft (K marked it
ready at this sitting's start); `test` green on ffff340b (15:28 UTC).
- `test` on 30d7681e: see the rehearsal.
- `server/src/cooking.js` `_cookStartOn()` (an own `true` only: OFF),
  `_cookStartTake(ps, fishKey, now, session)`: with it on, a
  `cook_request` lands only on the plan `extraction_start` rolled
  (`gathering.js` `_planCookHits`, `ps._cookHits`: its `fishKey`, `hits`,
  `rolledAt`), the same fish, once (`used`), and no sooner than
  ((hits - 1) x 650 + 1,510) x 0.7 ms after the roll (`COOK_START`, its
  two numbers mirrors of `gathering.js`, named). No plan at all (a worker
  restarted mid-cook): one result a session (`session._cookNoPlan`). A
  refusal is the rate's posture: dropped before the fish is taken, the
  state sent back. Placed after the rate and botfp checks, before the
  900 ms floor; test mode passes (`testmode.js` header, `test-mode.md`
  row: CLAUDE.md §5's three lists; `test-mode` §8 already names
  `cooking.js`).
- Lists: the switch table (`switches.mjs`, `SWITCHES.md`: `thrown:
  'true'`, `on: 'off'`, three `thrownFails`), the refusal list (`FROZEN`
  272 -> 273, its `ALLOW` line `rate`, the PR names it), K's status.
- The bench (`claims-gain` 2h, new): with it on, the honest cook takes
  what it took (1,508 an hour) and meets no refusal on any disturbance;
  the bare `cook_request` 1.59 -> 0.00; a cheat that starts each cook and
  answers at the plan's quickest 0.99 (under the bar). The census's line
  stays (the switch is off), as `bowshot`'s (#2023) did.
- Off, nothing changes: the only new code on the path is behind
  `_cookStartOn()`, false unless the live flags hold `cookstart: true`.
- Review note, not a hold: `_cookStartTake` marks the plan `used` (or a
  session's no-plan result spent) before the 900 ms floor and the bag's
  fish check, so a result those drop still spends its plan. An honest page
  starts every cook afresh (a new plan), so no honest cook is lost; for K
  when it is turned on.
- DEPLOYS the worker (`server/src/`).

## The rehearsal

