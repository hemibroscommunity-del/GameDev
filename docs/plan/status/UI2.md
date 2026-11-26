card: UI2
branch: claude/plan-ui2-11-quests
prs: the grip's draft #2390 (ready, the base); Quests' draft PR (step 6, tag 6691; base claude/plan-ui2-grip)
state: ready

## Done
- v2.3.6680, the build's step 1 (the kit; branch claude/plan-ui2-5-kit): the tokens, the pieces (`src/ui/kit/`), `?uikit=1`, `?ui2shine=0`, `tools/guards/ui2-tokens.test.mjs`, `mp-uikit`, `docs/shots/ui2-kit-*.png`.
- v2.3.6681, step 2 PR 1 (the frame, ON; `?ui2=0` the way back): dashNav.js, dashDests.js, DashHeader, MenuGrid, dashScroll, `dash-nav.test`, `mp-ui2frame`.
- v2.3.6682, step 2 PR 2 (the growing motion, the handle's fold, the moved buttons' words).
- v2.3.6697, card UI2-grip: the band's pull handle gone, `?bandgrip=1` the way back; `band-grip.test`, `mp-bandgrip`.
- v2.3.6691, card UI2-quests (step 6; branch claude/plan-ui2-11-quests, stacked on claude/plan-ui2-grip): the landing (your quests as rows; Daily, Completed (n), On offer (n) doors; the empty and loading states), a quest's own page (the steps behind, NOW dominant, "The adventure continues", Track, Show on map, the Rewards door; a done quest's whole history and "Next:"; an offer's talk), the frame pages questRewards, questsDaily, questsDone, questsOffers; `questDetail` out of HANDS_OVER (dash-nav 3h rewritten, its plant red); the rules `questLanding`, `journeyToNow`, `questActions`, `questOpens` (src/game/questPages.js); the drawing `dash/questViews.jsx` run in node by `tools/guards/lib/jsxText.mjs`; `tools/guards/quests-ui2.test.mjs` (R1-R12, V1-V6 planted, each red; 81 mutants, 3 equivalent survivors listed); `tools/guards/quests-mount.test.mjs` (P1-P5, D1-D4 red) on `tools/guards/lib/jsxMount.mjs` (gear-mount's follower moved there); `mp-ui2quests`; the older tests moved (mp-trackquest, mp-dailyrewards 7, mp-deskwords 4, mp-ui2frame 8; mp-questpages and mp-questjournal to `?ui2=0`); states `ui2-quest-*`; UI-DESIGN-NOTES "Quests under the new dashboard".

## Next
- Nothing: the Quests PR waits for the gatekeeper.  Phone runs on its final code (main eb90c6fd merged; the test box): ui2quests 33/33, questline 187/187, trackquest 13/13, ui2frame 34/34, questpages 22/22; membudget 11/12 until its buffers line went 25.0 -> 25.2 (main reads exactly 25.0; this PR's script is 15.9 KB).  Before the merge: dailyrewards 17/17, questjournal 29/29, deskkeys 73/73.

## Found
- mp-deskwords 4 (More's 0 tiles under the frame: the check wants 32 pages) and mp-oneband's three sideways checks: main's own reds, untouched by Quests.
- mp-pointstips step 6, mp-questguide's pins, mp-dmgsize's mark sizes, mp-oneband 3 sideways: main's own reds (the grip's status).
- (UI2-quests) the frame's PANELS pages carry no `.ui2` root: each new page wears `ui2RootClass()` itself, as Bro's and Combat's do.

## Needs
- Nothing.
