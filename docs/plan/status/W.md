card: W
branch: claude/plan-w-3-tags-scoreboard (one branch a PR, each on top of the one before: -1- to -4-)
prs: #1661 (ready), #1662 (ready), #1663 (ready)
state: working

## Done
- PR 1 (5021, #1661): a scenario is found by its file. A scratch
  `mp-zzz.mjs` with no line ran by name; `old-map` refused it with no world.
- PR 2 (5022, #1662): guards in `tools/guards/`, checks in
  `tools/dev/checks/`. A scratch guard and check, no other edit, ran. Its
  merge deploys the worker once.
- PR 3 (5023, #1663): `tag-blocks.json`, the brief shows the blocks and the
  plan's sessions by status file, `scoreboard.mjs` runs clean (1 of 17 rows
  measured; the rest say "not measured").

## Next
- PR 4 (5024): the gatekeeper's script, the baseline, the house rules.

## Found
- `tools/qa/mp/mp-topaudit.mjs`: an old probe with no `world` and no line
  in the table. The harness refuses it; `old-map` names it and passes.
- `mp-coldload`, `mp-cuelevels`, `mp-hitsound`: scripts, not scenarios.
- The tag check refused every card's own tag (the cards printed them in
  full). Settled on main by v2.3.5055 (the cards write them bare); the
  check and the brief read tags as they did.
- Part 3's "about 3,600 lines" and "about 8,700": a parser gives 14,864
  (the `BroTown` component) and 9,872 (`effectsRenderer.js`). The rule
  behind the plan's figures is not written down, so both rows say "not
  measured" until card B pins it.

## Needs
- Owner: `mp-topaudit.mjs`: delete it, or move it to the world?
- Owner: should `run.mjs` with no name also run the scenario files that
  have no line in the table? Today it names them and runs the table.
- Owner: the later cards' blocks (N to M, twenty each from 5060, in the
  plan's order; Z's second block 5360) are my reading of "blocks of twenty".
