# The gatekeeper's review, sitting 33 (card Z; tag 5671)

Taken 2026-11-17 on `main` 35aa7f7b (sitting 32 merged: K #2013, #2014;
R #2015; L #2012; Z #2016). The window closed 12:27 UTC; later arrivals go
to sitting 34. Tags bare.

## Heads, merge bases and trees

Every listed PR is based on `main` (`base.ref`), open and not a draft,
with one merge base at every step (`git merge-base --all`, each against
`main` with the PRs above it merged in as merge commits). The tree after
each merge:

1 R #2017  afa0269a4dbcf819279936d662b427d39a87d00c -> 6d25f98ce9ff8cb35297e5f363935738ea273166
2 J2 #2019 2569ccb0bbdfc9bfa86c7b604e28ccafc971f78c -> d5673498708e8cd89f9fcd5df58410c804e001ee
3 K #2018  f3ac3b81f49bcfc566fa1c7b2b990a8742db7fe8 -> 1dc20792ef2269ab5550e472de689245aa4dd9dc
4 Z (this PR): its head and tree are in the list (`status/Z.md`).

Rehearsed (`tools/dev/gatekeeper.mjs` on 35aa7f7b) with the three above
and this branch's census and phase-line commit (b589da3b): tree a7893f03
(the same as the step-by-step merges); build PASS; precheck 0 FAIL but
the server suites' 5-minute limit under load (the settled one), so
`cd server && npm test` was run alone in the merged tree: 476 suites, all green (323 s);
questline 187/187. Earlier, R #2017 with this branch alone: tree
bf0365dd, build PASS, questline green. No two listed PRs share a file.
`test` green on every listed head.

## R #2017 (5297): card R is done

READY (documents: step 3). `docs/plan/status/R.md` only: #2015 merged,
`state: done`. Its Needs keep the owner's cost calls (`fullsnap`,
`resetbook`, `xferescrow`, all OFF).

## J2 #2019 (5652): `mp-itemdrop`, the test's waits

READY (a test: step 3). `tools/qa/mp/mp-itemdrop.mjs` and J2's status
only. The Drop button and the sheet waited for as `attached` (the sheet
slides in; Playwright's `visible` missed it on this box), the flash read
on every frame. 17/18 in six runs (before 12 to 16, a different step each
time). **5b stays red**: a pile aged by `dropage` never lists an alpha on
the second screen. J2 names it the game's (does the aged state reach the
phone, or does it flash on its own clock?): no card owns the drop pile:
Found. No deploy.

## K #2018 (5548): the sword's reach and swing (`swordswing`, OFF)

READY (reviewed in full: `server/`). Card K item 14's first judge, behind
a new lower-case live flag, OFF (the card's reading: it changes what an
honest player could meet, so the owner turns it on). New
`server/src/swordswing.js` (in `bots`), mixed into `GameRoom`; with
`swordswing: true`:
- the reach: `_handleMonsterDamage`'s melee range is `_swordReach()`, 150
  px (an honest swing lands at 81 px at most on every disturbance), else
  `PVE_MELEE_RANGE` (400) as today;
- the swing: a melee, non-special claim from a player not in test mode
  and not on the free-swing trial takes from a token bucket of 2 at one a
  cycle (`_fsCycleMs`); a swing's other targets within 150 ms count as
  that swing, each once, 24 at most; a claim past it is dropped quietly
  (`swing` in the hit proof's tally; its line in the quiet-drop list,
  FROZEN 270 -> 271, named);
- the shove: a sword's `noKb` is not believed (only bows send it).
- `_tm` and `session` are in scope (`_handleMonsterDamage`, 1312); `_ss` is
  in memory only (its word in the scratch list). Off: every path as today
  (`_swordSwingOn()` reads an own `true`).
- Its switch row lists the suites that fail with it thrown (8 checks:
  cadence and elemental suites that swing faster than a cycle, and
  hit-proof 4b, a ring through a pack of 30, which lands 24 with it on).
- The bench (`claims-gain` 2d): the honest sword 360 kills an hour off
  and on, no refusal on any disturbance; the sword's own claim 2.87 ->
  1.38, the whole liar 2.96 -> 1.42 (the bar 1.5). DEPLOYS the worker.

## Z (this PR, 5671)

The send door's census made strict (card K item 13: the gatekeeper's,
after #2014): `send-door.test` 8 fails any raw `.send(` outside `send.js`
(tried: a probe file with one -> FAIL 8). The phase table's `TODO_LINE`
12 -> 11 (11 `todo` on 35aa7f7b, #2012; tried: 10 -> FAIL 7). The plan
noted for sitting 32's merges (4.1b, 10.5, 5.3b). Its `server/test/` file
DEPLOYS the worker (no behaviour change).

## Not in (sitting 34)

- L's next doors: nothing pushed in the window.
- K 14's next judges (the move and its walls; the bow claim).
