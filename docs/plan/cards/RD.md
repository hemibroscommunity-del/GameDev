# Card RD: the last reds on main (step 8.1)

**Tags:** 6180 to 6199 (block registered by the next gatekeeper's PR; do NOT edit tools/dev/tag-blocks.json). One a PR, in order.
**Browser:** heavy (phone scenarios: `npm run build` then `node tools/qa/mp/run.mjs <name>`; ONE at a time; reap after: `pkill -f '[w]orkerd'; pkill -f '[c]hromium'`). Helper sessions for repeat runs are allowed (orchestrator.md "More hands at once").
**Read first:** `docs/plan/census/J3-reds.md` (card J3 traced every other red; these three are what is left).
**Rule (TRAPS §177):** a phone test red on main is a question about the TEST first. A fix never turns on something nobody has seen (TRAPS §305): if the game itself is wrong in a way a player would see, write it up and ask me; do not change what a player sees.
**Never edit:** `src/ui/BroTown.jsx`, `src/rendering/pixiRenderer.js`, `src/rendering/systems/*` (cards M/M2), `server/src/itemdrop.js` until card V3's #2128 is on main (I will tell you), `tools/guards/lib/switches.mjs`, `docs/SWITCHES.md`, `docs/TRAPS.md`, `package.json`, `.github/`.

## PRs, in order (one red a PR; skip a PR, with one line why, if its red already passes 5 runs in a row on main)
1. **(tag 6180) itemdrop 5b.** Files: `tools/qa/mp/mp-itemdrop.mjs`; if the cause is the page, `src/game/itemDrop.js` / `src/data/itemDrop.js`. Fact (J3-reds.md): after `/dev/dropage` ages a pile 121 s, the dropper's screen saw it only lit and the watcher's never listed it with an alpha in 8 s; 5c passes. The question: is the flash driven by a push of the aged state (which the watcher never gets, maybe rightly: a private pile), or by the phone's own clock (`dropAlpha` reads `flashAt`)? Find which by reading the code, then make the test check what the game really promises; if the game breaks its own promise on the dropper's screen, fix it on the page only where no new visible behaviour is turned on, else ask.
2. **(tag 6181) crowdfight "knew every bot".** Files: `tools/qa/mp/mp-crowdfight.mjs` (and a page file only if the cause is there and not a held file). Run it on main, find why the check fails, mend the test or the cause.
3. **(tag 6182) manualcombat 10a.** Files: `tools/qa/mp/mp-manualcombat.mjs`, `src/game/manualCombat.js` if the cause is there. Same method.

## Readings chosen for you
- Every check must still check something real: never skip, loosen to nothing, or delete a check to get green. A check that tests something the game no longer promises may be rewritten to the current promise, with the commit naming where the promise is.
- "Done" for each PR: 5 runs in a row green on this box, the cause in the PR body.
- Time checks by the renderer's clock, never a 60 fps window (TRAPS §200).
