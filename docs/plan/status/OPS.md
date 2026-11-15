card: OPS
branch: claude/plan-ops-5-rfspread (one branch a PR: claude/plan-ops-<n>-<word>)
prs: #1867 (findings, draft), #1871 (5587), #1872 (5588), #1874 (5600), #1880 (5601), PR 5 (5604): ready
state: ready

## Done

- RT-2's findings (#1867, kept as the record); its two small fixes: #1871
  (the migrations guard) and #1872 (OPERATIONS: rolling back).
- #1874 (5600): this card.
- PR 2 (5601): `/health/room` (`health.js`), `roomhealth`; the newer-save
  refusals were already counted (`roomrow.js`): now shown. Carries #1874's
  head: it lands right after it.
- PR 5 (5604): `rf_spread`: 800 waiting knock 81/s, not 159 (thread 21%,
  not 38%; local). Carries #1880's head. (First opened as #1884 under
  5602, before the panel rows took 5602 and 5603.)

## Next

- PR 3 (5602): the Test panel sets a switch (page only).

## Found

- The Test panel shows and clears live switches but cannot set one: a
  "set a switch" row would spare the owner a curl (card R's panel work).

- Card T: under `switches-thrown`'s preload, `cold-flags.test` (liveops)
  and `tick-pace.test` (server-core) fail even with a no-op flag (the
  `--baseline` sets them aside; the PR run has none), so a new switch in
  either system fails every PR. OPS's switches go in a system of their own,
  `ops` (`tools/guards/lib/systems.mjs`), which runs only OPS's suites.

## Needs

- PR 6 (`seathold`): built OFF; on, at most one small write a minute while
  the roster changes (~1,440 a day at most): the owner's word to turn it on.
- PR 7 starts after card R's PR 7 (`admin.js`, `liveops.js`) is merged.
