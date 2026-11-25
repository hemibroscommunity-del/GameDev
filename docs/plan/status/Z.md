card: Z
branch: claude/plan-z-sitting-65
prs: 3 lines listed (#2350 CT part 20, #2348 QP, #2351 LB part 2); 2 need a merge of main (#2346 CT parts 19+21, #2349 BRO); this PR (tag 6277), the last line
state: ready

## Done
- The five heads as the orchestrator gave them, all drafts, base `main`,
  one merge base each (096d7000); no closing keyword in any body; `test`,
  playable, memory-budget, lint-build green on all five heads. None
  changes `server/src`; four add `server/test` files and DEPLOY (#2350,
  #2348, #2349, #2351; #2350's body says it does not: it does). The
  lighter review (the owner, 01:53 UTC): files and tags against the cards,
  no purpose lane (no `server/src`, wire, money, login or combat rule;
  #2350 changes only how the phone draws the worker's guard break).
- Merge conflicts, pair by pair: #2346 x #2350 (`docs/plan/status/CT.md`);
  #2349 x #2350 (`docs/SYSTEMS.md`, `tools/guards/lib/systems.mjs`);
  #2349 x #2348 (`tools/dev/tag-blocks.json`). The largest clean set with
  the owner's shield bug in it: #2350, #2348, #2351.
- Rehearsed on `main` 096d7000: the merged tree 94b52d3c
  (94b52d3c36ea9fd0ebdda5a0d3978c12b266c427): precheck (0 FAIL),
  every switch thrown (94), claims-gain --whole, build, questline green;
  heldsweep's sample red, AND red on `main` alone (main's own: `debts.md`
  PH, 65). A helper on the same tree: guard-break-page, sight, quest-pages,
  quest-journal, ranks-page green; shielddrop 26/26, questpages 22/22,
  ranksstyle 21/21, boards 37/37, questjournal 29/29.
- The two mends proved here in scratch (tree 2297ae92, never pushed):
  precheck 1 FAIL only, `player-words` 2713 against its line 2710 (main
  2708; QP +2, CT-13 +2, BRO +1: QP takes the last places). A helper with
  both added: context-button, bro-pages green; contextbuttons 27/27,
  bropages 55/55.
- BRO's two reds are main's own (a helper, main and head alike):
  brocard 55/59, deskkeys 8f (`debts.md` BRO, 65).
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
