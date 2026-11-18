card: HB2
branch: claude/plan-hb2-1-coach
prs: (6280, the quest coach after the paint): working
state: working

## Done

- (none merged yet)

## Next

- PR 1 (6280): the quest coach measures at the top of the game's frame
  under `?afterpaint`; loadDone read once.  budget-android peer+armour:
  `step2 > walk` 20.1 ms x8 and `step2` 20.1 x3 (afterpaint=0) -> no
  walk hold, `step2` 12.5 x1.  Running the coach's scenarios, playable,
  membudget.
- PR 2 (6281) drafted on claude/plan-hb2-2-band (stacked on PR 1).

## Found

- docs/GRAND-PLAN.md 3.1's note says `pack-page` is the last `ours` row;
  held-budget.mjs dropped it at v2.3.5253: the last is `other: R > J`.
- `other: R > J` still 23-25 ms at `peer` on budget-android after #2209.

## Needs

- The planning session: PR 5 vs step 3.1 (asked 2026-11-18).
