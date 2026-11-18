card: LG
branch: claude/plan-lg-2-league (PR 2, 6121)
prs: #2170 (PR 1, 6120, draft), PR 2 (6121) working
state: working

## Done

- PR 1 (6120) #2170: docs/specs/honest-trouble.md, every signal a detector
  reads with its source line, honest trouble, and the rule a detector keeps.

## Next

- PR 2 (6121): tools/league (rungs 1-2, score.mjs), server/test/league.test,
  `npm run league`. Then PR 3 (6122): rungs 3-4, replays at 60/30/20/4 fps
  and through a deploy.

## Found

- botfp.js:541 `startless` never fades: an honest phone that drops twice in
  ten minutes mid-harvest, now and then, reaches the 20 that flags (K4's).
- botsig.js:333 `reflex` takes off the AVERAGE round trip (index.js:5050):
  on a wavering line an honest answer can read quick (K4's).
- botsig.js:193-197 `aimed`: with no place between the chord's ends
  (the move diet, a slow phone) `straight` is true by default (K4's).
- The league: rung 2 (rung 1 + a person's noise) is missed by every
  detector; rung 1's cook is missed (`cook`, botsig.js:418, does not take
  off the planned hits) (K4's).

## Needs

- The planning session: score.mjs runs the worker's GameRoom in-process
  (testroom), with `wrangler dev` left out; asked 2026-11-18, building on
  that reading until told otherwise.
