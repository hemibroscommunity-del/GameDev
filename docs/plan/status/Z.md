card: Z
branch: claude/plan-z-sitting-65
prs: 3 lines listed (#2350 CT part 20, #2348 QP, #2351 LB part 2); 2 need a merge of main (#2346 CT parts 19+21, #2349 BRO); this PR (tag 6277), the last line
state: ready

## Done
- Five drafts on `main` 096d7000, `test` green on each, no `server/src`;
  four DEPLOY by `server/test` files. Conflicts, the mends and the runs:
  `docs/plan/census/review-z65.md`.
- Rehearsed: the merged tree 94b52d3c36ea9fd0ebdda5a0d3978c12b266c427
  green (precheck, switches thrown, claims-gain, build, questline);
  heldsweep's sample red on `main` alone too (`debts.md` PH, 65).
## The list: merge in this order, "Create a merge commit"
1 #2350 (CT part 20, 6554; draft: mark ready). DEPLOYS (tests only).
2 #2348 (QP, 6620; draft: mark ready). DEPLOYS (tests only).
3 #2351 (LB part 2, 5503; draft: mark ready). DEPLOYS (tests only).
4 Z (6277, a draft: mark it ready first).
## Needs a merge of main (after 1-3 land)
- #2346: `docs/plan/status/CT.md` (keep both parts' lines); its 2 new
  words in place into `src/data/say/contextButton.js`.
- #2349: `tools/dev/tag-blocks.json` (both rows, BRO then QP, nextBlock
  6640); `tools/guards/lib/systems.mjs` ui `windowDoor|guardBreak|broPages`;
  `docs/SYSTEMS.md` by `node tools/guards/systems.test.mjs --write`; its
  1 new word in place into `src/data/say/broPages.js`. Never raise
  `PAGE_LINE`.
## Held / To 66
- Nothing held.
## Found
- `docs/plan/debts.md` (65): PH's heldsweep sample, BRO's two main reds,
  `state-census --check` red on `main`.
