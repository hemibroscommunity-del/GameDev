# Card LOAD: the loading screen ends when the game is ready, not when its limit fires

**The owner's words (2026-11-26):** "How do I speed up the game in terms of having let's say something like a cache that has already been preloaded? Or is memory still the key constraint?", and then, asked for it, the Test panel's Loading times from their iPhone:

    0.3 s  The game started (downloaded and running)
    6.1 s  The loading screen came up
   18.0 s  The pictures were ready
   11.8 s  The world began loading
   19.2 s  The world was loaded
   27.4 s  The loading screen was gone
  The loading screen was up 21.3 s
  Slowest pictures (s after they began): 11.6 broBadge, 11.5 petSheet, 11.4 capes, 10.4 arrowBlast, 10.3 playerDeath, 10.1 fxStrips

**What that reading says.** The pictures were ready 11.9 s into the loading screen and the world 13.1 s into it, yet the screen stayed 21.3 s: exactly `IntroVideo.jsx`'s 20 s `hardCap` plus its 1 s fade. The screen did not lift because loading finished. It lifted because the limit fired. What it was still waiting for is the end of `preloadPlayerAssets()` (`src/rendering/pixiRenderer.js:113`): after the loads, a chain that bakes the worn armour's masked body frames (`prewarmMaskedBodyFrames`, then `prewarmAltWornSets`, the uploads). **Reproduced on the test box, 2026-11-26** (a character in the copper torso and greaves logging in again): the loads done at 25.3 s; when the screen lifted, `window.__btMaskedCoverage()` read 10 of 177 frames; 90 s later, 93 of 177; `window.__btPreloadSteps` never reached `masks`. With no armour the same chain takes 0.2 s. `docs/specs/worn-first.md` (v2.3.3742) had the pace on this box (a bake every few seconds) and said "whether a real phone sees the same slowness is not known": the owner's phone has now answered.

So, for a player in armour, today:
1. the loading screen is a fixed 21 s whatever else is fast, 7 s of it waiting for something that will not finish in time;
2. the screen's promise is not kept: the world comes up with the armour's frames mostly unbaked, and they are baked during the first minutes of play (the plain body under the plate, `worn-first.md`; and work beside the game on a phone the owner calls gritty);
3. PRELOADING IS LAW (CLAUDE.md §7) is broken here, silently, by a safety net.

**Purpose.** The armour's frames are ready when the screen lifts, and the screen lifts as soon as the pictures and the world are. The way: the masked bake is "a pure pixel function" of its inputs (`maskedBake.js`'s own header), and it is made again at every login. Make it once and KEEP it on the phone. This is a cache on the phone's disk: it holds nothing more in the page's memory (the owner's question: memory limits what is held while playing, not this).

**Tags:** 6760 to 6779. Do NOT edit `tools/dev/tag-blocks.json` (four cards started today meet on its last lines: TD 6700 to 6719, PRT 6720 to 6739, KEEP 6740 to 6759; the plan's orchestrator registers this block). One tag a PR, in order. `git fetch origin` before you claim a tag.
**You hold:** part 1: `src/game/loadTimes.js`, `src/ui/IntroVideo.jsx` (a mark only), `src/rendering/pixiRenderer.js` (`_preStep` only), the Test panel's Loading times readout, `docs/specs/load-times.md`, `tools/qa/mp/mp-loadtimes.mjs`. Part 2: `src/rendering/maskedBakeWorker.js`, `bodyBakeWorker.js`, `bodyBake.js`, a new `src/game/bakeKeep.js` (the key and the store's rules, no imports, node tests it), the two prewarm functions in `entityRenderer.js` (3637 to 3800) only as far as the keep needs, a new guard, a new phone test. NOT `.github/`, NOT `server/` (no deploy).
**Laws:** CLAUDE.md §7 PRELOADING (nothing moves off the loading screen: this card makes its wait TRUE; shortening or removing the wait is the owner's call and is NOT in this card), MEMORY (the store is the phone's disk; what is read back is held exactly as a baked frame is today: `memory-budget` must not move; a store has a cap), THE PAGE'S ONE THREAD (the worker reads its own store: IndexedDB is there in a worker; nothing of it runs on the page), the switch table (`?bakekeep=0`), TRAPS on the bake (`grep -n "masked" docs/TRAPS.md`), `docs/specs/worn-first.md`, `docs/specs/body-bake-worker.md`.
**Honesty (finish.md part 5 rule 4):** every number says where it was measured. The owner's phone is this card's only device reading; ask for one more paste after part 1 lands, never guess it.

## PRs, in order (a PR a part: each part a fresh session on its own branch)

1. **(6760) The readout says what the screen waited for, and why it lifted.** The Loading times panel and `window.__btLoadTimes()` gain: the bro's own steps after the pictures (`loads`, `masks`, `alt`, `upload`, `gear`, `done`: `_preStep` notes them through `markLoad`), the armour's frames ready of wanted at the moment the screen lifted, and one line that says WHY it lifted: "ready" or "its 20 s limit" (`IntroVideo.jsx`: a mark where `hardCap` fires before `waitFor` settled). No behaviour changes. `mp-loadtimes` checks the new lines exist and are in order; a phone test logs in in copper for the FIRST time in its browser (nothing kept: true before and after part 2) and reads "its 20 s limit", and a bare character reads "ready". Done when the readout on the test box shows both. The middle model, high. Runs beside part 2: their files do not meet.
2. **(6761) The bakes are kept.** The bake worker keeps what it makes, keyed by everything the bake reads (the body's frame and its look, each worn piece's frame, the belt, the rod, the art's versions, the bake's own version: derive the key from the job's inputs as the worker receives them, and prove it with a guard: change any input, the key changes), in IndexedDB, from the worker. A job whose key is kept is answered from the store; one that is not is baked and stored. A cap (the last few sets; say the MB) and a version that empties it. No store (private mode, a full disk, an old browser): bakes as today, silently. Then `prewarmMaskedBodyFrames` finishes fast on a second login and the screen lifts on "ready".
   - Done when, on the test box, a SECOND login in the same copper set reads: every frame of the worn set ready at the lift (`__btMaskedCoverage` want equals have), `masks` within 3 s of `loads`, the screen lifted before its limit; a kept frame is byte for byte the baked one (a guard compares them); `?bakekeep=0` is today's behaviour; `playable` and `memory-budget` green with no line moved; `mp-armourflash` and `mp-wornbake` green.
   - The first login in a set never seen is as today (the limit): say so in the PR body. Do not change the limit.
   - The strong model, high. Runs beside part 1; its own test reads `window.__btPreloadSteps`, `__btMaskedCoverage` and `__btIntro`, which exist today, never part 1's new lines.
3. **(6762) Only if part 2's numbers call for it: what the pictures' queue waits on.** The same seven groups end last on the phone and on the box (pet sheet, arrow blast, player death, effect strips, effects, capes, the bro badge), a single small icon among them taking the whole phase: they are the last of one queue of about 1,800 loads. Name the queue's limit on the box with a profile (`mp-phoneframe`'s tools; `mp-coldload`) and write it down; no mend in this PR.

## Readings chosen for you
- Nothing a player sees changes, except a shorter loading screen on a second login and armour that is whole from the first frame.
- Kept on the phone, not made on our side: the bake reads the player's own body (its colours decide what is arm and what is cloth), so one file per armour set would not be every player's.
- The store is the worker's alone. The page asks for a bake exactly as it does today and never knows whether the answer was kept.
- A frame that fails to read back is baked again and replaced; a store that throws is switched off for the session. Never a wrong picture: when in doubt, bake.
- iPhone Safari may empty a site's storage after a week unused: then the next login bakes again, as today. Not a fault.
- The owner may ask for the 7 s back before part 2 lands (lift the screen without waiting for a bake that cannot finish): that is theirs to say, under the preloading law. Do not do it unasked.
