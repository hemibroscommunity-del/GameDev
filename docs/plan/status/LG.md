card: LG
branch: claude/plan-lg-3-replay (PR 3, 6122)
prs: #2170 (6120, draft), #2178 (6121, draft), PR 3 (6122) working
state: working

## Done

- PR 1 (6120) #2170: docs/specs/honest-trouble.md (every signal, its line,
  honest trouble, the detector's rule).
- PR 2 (6121) #2178: tools/league rungs 1-2, score.mjs, league.test,
  `npm run league`. Rung 1 caught; rung 2 missed by every detector.

## Next

- PR 3 (6122): rungs 3-4 (page-script.mjs, replay.mjs, traces/); the
  honest trace passes at 60/30/20/4 fps and through a deploy. Then done.

## Found

- botfp.js:541 `startless` never fades (K4's).
- botsig.js:333 `reflex` takes off the AVERAGE round trip (K4's).
- botsig.js:193-197 `aimed`: no place between the ends reads straight (K4's).
- The league: rung 2 missed by every detector; rung 1's cook missed
  (`cook`, botsig.js:418, keeps the planned hits in the gap) (K4's).
- A deploy halfway lets rung 3 through: botfp's score and replay ring live
  in memory between paced writes (botfp.js _botfpMaybePut) (K4's).
- The local box: precheck's server-tests stops at 5 minutes; the whole
  suite takes 12 here (green). server/node_modules was not installed.

## Needs

- (nothing)
