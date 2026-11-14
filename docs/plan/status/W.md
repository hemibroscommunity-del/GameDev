card: W
branch: claude/plan-w-2-guards-and-checks (one branch a PR, each on top of the one before: -1- to -4-)
prs: #1661 (ready), PR 2 (ready)
state: working

## Done
- PR 1 (v2.3.5021): a scenario is found by its file. A scratch `mp-zzz.mjs`
  with no line ran by name; precheck's `old-map` check refused it until it
  named its world.

- PR 2 (v2.3.5022): guards in `tools/guards/` (run by `npm test`), checks in
  `tools/dev/checks/` (loaded by precheck). A scratch guard and a scratch
  check, each added with no other edit, ran. Its merge deploys the worker
  once (it touches `server/test/run.mjs`). It sits on top of PR 1.

## Next
- PR 3 (v2.3.5023): tags, status, the scoreboard.

## Found
- `tools/qa/mp/mp-topaudit.mjs`: a "temporary audit probe" with no line in
  the table and no `world`. The harness refuses to run it. The `old-map`
  check now reads the files, so it names this one in its PASS line (a list
  of one that only shrinks) and does not fail on it.
- `tools/qa/mp/mp-coldload.mjs`, `mp-cuelevels.mjs`, `mp-hitsound.mjs`:
  scripts of their own (no `run` export). `run.mjs` says so when asked for
  one by name, and never imports them.

- The tag check refused every card's own tag: the cards on main print them
  with the prefix, so it read them as used (card F stopped on it). PR 2
  leaves `docs/plan/cards/` out of what main has used (precheck.mjs, one
  line). PR 1 alone still fails that one check until PR 2 is merged with it.

## Needs
- Owner: is that tag-check fix the one you want (the other is to rewrite the
  cards with bare numbers)? It is in PR 2.
- Owner: `mp-topaudit.mjs`: delete it, or move it to the world? (Not W's
  file.)
- Owner: with no name given, `run.mjs` still runs the table only, and names
  the scenario files with no line. Should a run of everything also run
  those? The card says only "a name that is not in SCENARIOS is looked up".
