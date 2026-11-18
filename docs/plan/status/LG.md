card: LG
branch: claude/plan-lg-3-replay (PR 3, 6122)
prs: #2170 (6120), #2178 (6121), #2184 (6122): all merged
state: done

## Done

- PR 1 (6120) #2170: docs/specs/honest-trouble.md (every signal, its line,
  honest trouble, the detector's rule).
- PR 2 (6121) #2178: tools/league rungs 1-2, score.mjs, league.test,
  `npm run league`. Rung 1 caught; rung 2 missed by every detector.
- PR 3 (6122) #2184: rungs 3-4 (page-script, replay, traces); the honest
  trace passes at 60/30/20/4 fps and through a deploy.

## Next

- Nothing: the card is done (all three merged at sitting 46; marked done
  by the gatekeeper, sitting 47). Rung 5 left for later (decided for the
  owner while away). The K4 rows below were mended by K4's #2176, #2177,
  #2182, #2187 (sitting 46).

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
