card: W
branch: claude/plan-w-3-tags-scoreboard (one branch a PR, each on top of the one before: -1- to -4-)
prs: #1661 (ready), #1662 (ready), PR 3 (ready)
state: working

## Done
- PR 1 (v2.3.5021, #1661): a scenario is found by its file. A scratch
  `mp-zzz.mjs` with no line ran by name; `old-map` refused it with no world.
- PR 2 (v2.3.5022, #1662): guards in `tools/guards/`, checks in
  `tools/dev/checks/`. A scratch guard and check, no other edit, ran. Its
  merge deploys the worker once. Also the tag-check fix (Found, line 3).
- PR 3 (v2.3.5023): `tag-blocks.json`, the brief shows the blocks and the
  plan's sessions by status file, `scoreboard.mjs` runs clean (1 of 17 rows
  measured; the rest say "not measured").

## Next
- PR 4 (v2.3.5024): the gatekeeper's script, the baseline, the house rules.

## Found
- `tools/qa/mp/mp-topaudit.mjs`: an old probe with no `world` and no line
  in the table. The harness refuses it; `old-map` names it and passes.
- `mp-coldload`, `mp-cuelevels`, `mp-hitsound`: scripts, not scenarios.
- The tag check refused every card's own tag (the cards on main print them
  with the prefix; card F stopped on it). PR 2 leaves `docs/plan/cards/`
  out of what main has used. PR 1 alone fails that check until PR 2 lands.
- Part 3's "about 3,600 lines" and "about 8,700": a parser gives 14,864
  (the `BroTown` component) and 9,872 (`effectsRenderer.js`). The rule
  behind the plan's figures is not written down, so both rows say "not
  measured" until card B pins it.

## Needs
- Owner: `mp-topaudit.mjs`: delete it, or move it to the world?
- Owner: should `run.mjs` with no name also run the scenario files that
  have no line in the table? Today it names them and runs the table.
- Owner: the tag-check fix (PR 2), or the cards rewritten with bare numbers?
- Owner: the later cards' blocks (N to M, twenty each from 5060, in the
  plan's order; Z's second block 5360) are my reading of "blocks of twenty".
