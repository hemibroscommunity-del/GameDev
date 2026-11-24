# The gatekeeper's review, sitting 62 (card Z; tag 6274)

A fourth sitting on 2026-11-24, by the owner's leave (19:0x UTC: "I'd
prefer to get all the stuff done ASAP so don't wait until tomorrow for
anything"). The rule of `docs/plan/finish.md` part 8 (card Z step 4b):
only a red rehearsal or `test`, a bug in behaviour, a card's own dodge
still green, or an earlier review's plant still green on the head listed
as its mend holds a PR. A reviewer's NEW hole is a line of
`docs/plan/debts.md`, and the PR lands.

The queue, given by the orchestrator (part 14): three lines on `main`
9a20b7cf (sitting 61's list, all merged). Every head checked against
`origin`: all as given. Each line has ONE merge base with `main`
(9a20b7cf), and again step by step down the list.

## The verdicts

| Line | PR | Head | Verdict |
|---|---|---|---|
| BK | #2326 (ready, 778c5e8e) under TOP #2335 (draft, base `claude/plan-bk-debts59`) | 8b552cc6 | LAND: 61's hold mended (`road-levers` places an import that leaves `server/src` and scans what it reaches, fail-closed); the purpose lane (top model, high) PASS |
| CT | #2336 (draft, base main, fe018ce4) under TOP #2338 (draft, base `claude/plan-ct-6-sprint`) | 67ba711e | LAND: the review lane PASS (no bug in behaviour; modes 1-4 unchanged; both switches have their rows); `test`, playable, memory-budget, lint-build green on 67ba711e; `mp-twobuttons` 78 of 78 on 67ba711e (the orchestrator's helper) |
| VW | #2337 (draft, base main) | b50af714 | LAND: tests and the harness only (step 3); every check green; landscape-view 71 of 71, zoomout 11 of 11 (a helper) |

## BK #2335: the purpose lane

The guard on the head: ALL PASS, 11 checks, 1.8 s (it reaches one outside
script, `src/game/switches.js`). Plants, each alone in a scratch tree:

- RED: an outside file reading a row (a1-a3); a re-export chain two and
  three deep, a namespace passed on (b, b2); an outside file missing, one
  importing a missing file, a `.cjs`, a folder's `index.js`, a path out
  of the repository and back, one that does not parse (c1-c3, j2-j4);
  `import()` of a joined, template or `new URL` path (lost), a const
  concatenation (followed); a row handed to an outside function, a table
  registered by a setter (lost); alias + `Object.assign` + joined key +
  `bind`; `../` normalisation with a query and hash; a namespace with
  computed names; the table moved to `src/game` and re-exported; a
  spread copy; a cycle with a leak (2.2 s; the same cycle without one
  green, the control); a symlink to a file outside the repository.
- GREEN, sitting 61's own (debts.md, "(held #2326)"): `require` /
  `createRequire` / `eval` (d4-d7, i2, i3). #2335 is not listed as their
  mend (61 filed them as debts, not holds): NOT a hold; the debt stands.
- GREEN, NEW (debts, BK's next job): a symlink inside the repository to
  the table or to `server/src` (f1, f2, f4; #2326's guard was red on f2:
  a regression of the new "reached" place, no symlink is tracked today);
  a mirror copy of the table in `src/game` (i1); the page's `@/` alias in
  a reached file (k1; node and wrangler cannot load it).
- Mutants of the new lines: 13 of 15 die; dropping the `'..'` test and
  dropping `scanTree`'s `seen` set live.
- No hang (a file is scanned once); no bug in behaviour (a guard and a
  status file). A nit: check 3's label still says "no file of
  server/src" when it names an outside file.

## CT #2336 + #2338: the review lane

- Item 6 (`stickZones.js` `rimSprint`): on at 1.25, off below 1.05,
  started and stopped through `sprint.js` with how `'rim'` (a Shift
  sprint is never stopped by it); a lifted thumb ends it; refused with
  the shield up, dead, swimming, attacking; only under `twoButtonsLive()`;
  `?rimsprint=0` brings the button back. `RimGlow` redraws through
  `startTransition`, only on a change.
- Item 7: (a) `latch.js` `latchLine` draws to the locked monster only
  while the latch is active, nothing while idle; `?sightline=1` the old;
  (b) the sword is the preloaded `WPN_PILL_ICONS.melee.on`, under
  `[data-latch]` only; (d) no code change.
- Same-change rules: both switches in `tools/guards/lib/switches.mjs`,
  `docs/SWITCHES.md`, `FORMS`; the UI-DESIGN-NOTES section; the ledger
  rows. Suites: `sight` 93, `stick-zones` 150, `latch`, `state-ledger`,
  `switches` (633 rows): all green.
- `mp-twobuttons`: the 4 FAILs of CT's last run were one setup step
  upright ("3. upright: a shield in hand (guard)" got no shield, so 3b-3d
  saw no Block). On the head, rerun: 78 passed, 0 failed, that step
  PASS. A flake of the test's own setup, once in three runs: a debt, not
  a hold.

## Step 5: the rehearsal

`node tools/dev/gatekeeper.mjs claude/plan-vw-2-tests
claude/plan-ct-7-mends claude/plan-bk-mend61` on `main` 9a20b7cf: tree
89d96e07161b6796afaad9dbe4fa45bac37a61e4 (27 files differ from main).
precheck PASS (0 FAIL; one WARN, as at 61), switches thrown `--whole`
PASS (94 switches, 2518 runs), `claims-gain --whole` PASS, build PASS,
questline 187 of 187, the unminified build PASS, heldsweep's stand, town
and ride 6 of 6. The orchestrator's order (BK, CT, VW) makes the same
tree (`git merge-tree`, step by step; each line one base, 9a20b7cf).

## Step 5b: what GitHub will merge

- #2335's base is `claude/plan-bk-debts59` and #2338's is
  `claude/plan-ct-6-sprint`: each is retargeted to `main` before its
  merge. The PR beneath each (#2326, #2336) lands with it.
- #2337's base is `main`.
- PRs still shown OPEN whose heads are in `main` (each checked:
  `merge-base --is-ancestor`): #2320 (8245fb8a), #2317 (281e7aae),
  #2325 (89eecb3a), #2323 (c2c3ff1c), #2327 (ec0de9cb). Close them;
  never merge them (their bases are branches of their stacks).

## Deploys

CT (`server/test/sight.test.mjs`, `stick-zones.test.mjs`) and VW
(`server/test/render-res.test.mjs`) touch `server/**`: each merge
deploys the worker (TRAPS §277; no `server/src` changes). BK does not.

## Found

- `docs/plan/status/VW.md` on #2337 names its branch
  `claude/vw-view-079` (it is `claude/plan-vw-2-tests`): a status line,
  not a hold.
