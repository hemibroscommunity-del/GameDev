card: W
branch: claude/plan-w-1-scenario-by-file (one branch a PR, each on top of the one before: -2-, -3-, -4-)
prs: PR 1 (ready)
state: working

## Done
- PR 1 (v2.3.5021): a scenario is found by its file. A scratch `mp-zzz.mjs`
  with no line ran by name; precheck's `old-map` check refused it until it
  named its world.

## Next
- PR 2 (v2.3.5022): guards and checks in files of their own.

## Found
- `tools/qa/mp/mp-topaudit.mjs`: a "temporary audit probe" with no line in
  the table and no `world`. The harness refuses to run it. The `old-map`
  check now reads the files, so it names this one in its PASS line (a list
  of one that only shrinks) and does not fail on it.
- `tools/qa/mp/mp-coldload.mjs`, `mp-cuelevels.mjs`, `mp-hitsound.mjs`:
  scripts of their own (no `run` export). `run.mjs` says so when asked for
  one by name, and never imports them.

## Needs
- Owner: `mp-topaudit.mjs`: delete it, or move it to the world? (Not W's
  file.)
- Owner: with no name given, `run.mjs` still runs the table only, and names
  the scenario files with no line. Should a run of everything also run
  those? The card says only "a name that is not in SCENARIOS is looked up".
