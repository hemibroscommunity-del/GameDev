card: LOAD
branch: claude/plan-load-1-readout
prs: (none yet; PR 1 in progress, tag 6760)
state: working

## Done
- PR 1 code (tag 6760): `loadTimes.js` (markLift, the bro's six steps, the armour line, the why line),
  `IntroVideo.jsx` (a mark in maybeFinish; HARD_CAP_MS const, same 20000); the new words are in DevPanel.jsx `loadTimesLines` (player-words census counts loadTimes.js), `pixiRenderer.js` `_preStep`
  (also `markLoad('bro-<step>')`), `load-times.md`, `mp-loadtimes` (check 4), new `mp-loadlift`.
- On the test box (2026-11-26): the coverage read at the lift costs 6 ms (one call, page's thread); bare first login reads "Why it lifted: ready", all six bro steps in order,
  "none worn"; copper first login in a fresh browser reads "its 20 s limit", armour 8 of 177 at the lift,
  `masks` never reached. `loadtimes` 6/6, `loadlift` 11/11.

## Next
- precheck, merge origin/main once, push, open the draft PR, message the orchestrator.

## Found
- `loads` in the owner's phone paste is the "pictures ready" step; the loading-screen mark ("came up") is
  noted at the start of preloadPlayerAssets, NOT at IntroVideo's mount, so "up 21.3 s" is not the 20 s limit
  measured from mount alone (mount is later than the mark). `IntroVideo.jsx` / `BroTown.jsx` untouched for this.

## Needs
- Nothing yet.
