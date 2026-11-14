card: W
branch: claude/plan-w-4-gatekeeper (one branch a PR, each on top of the one before: -1- to -4-)
prs: #1661 (merged), #1662 (merged), #1663 (merged), #1676 (ready)
state: ready

## Done
- PR 1 (5021, #1661): a scenario is found by its file. A scratch
  `mp-zzz.mjs` with no line ran by name; `old-map` refused it with no world.
- PR 2 (5022, #1662): guards in `tools/guards/`, checks in
  `tools/dev/checks/`. A scratch guard and check, no other edit, ran. Its
  merge deploys the worker once.
- PR 3 (5023, #1663): `tag-blocks.json`, the brief shows the blocks and the
  plan's sessions by status file, `scoreboard.mjs` runs clean (1 of 17 rows
  measured; the rest say "not measured").

- PR 4 (5024): `gatekeeper.mjs`, `baseline.md`, CLAUDE.md's four lines.
  Two scratch branches (a scenario, a guard, a check each) merged clean in
  both orders, the same tree; precheck and `npm test` green; the full run
  (build, questline 187 of 187) green. A conflict is named and stops it.

## Next
- Nothing: the card is done once the four PRs merge (gatekeeper's list).

## Found
- `tools/qa/mp/mp-topaudit.mjs`: an old probe with no `world` and no line
  in the table. The harness refuses it; `old-map` names it and passes.
- The tag check refused every card's own tag (the cards printed them in
  full). Settled on main by v2.3.5055 (the cards write them bare); the
  check and the brief read tags as they did.
- Part 3's "about 3,600 lines" and "about 8,700": a parser gives 14,864
  (the `BroTown` component) and 9,872 (`effectsRenderer.js`). The rule
  behind the plan's figures is not written down, so both rows say "not
  measured" until card B pins it.

## Needs
- None. Answered by the planning session: `mp-topaudit.mjs` and a run of
  everything go to card B; the later blocks stand as written.
- #1676 was held at sitting 1 for a conflict in CLAUDE.md section 3 with
  #1671: main merged in, both lines kept.
