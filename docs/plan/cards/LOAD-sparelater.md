# Card LOAD part 3b: the spare armour sets finish after the loading screen lifts (the owner's yes; one PR)

Model and effort: the strong model, high (a renderer, the loading door). Tag: 6763 (LOAD's block 6760 to 6779; 6762 stays the card's own part 3, the pictures' queue). Branch `claude/plan-load-3b-sparelater`, from `claude/plan-load-2-bakekeep` (head f56dfa3b: #2401, part 2, in tonight's sitting 72). ONE draft PR, base `claude/plan-load-2-bakekeep`; ONE message to the orchestrator (line 5 of `git show origin/claude/plan-orc:docs/plan/status/ORC.md`), then stop. No file under `server/`: the PR deploys nothing. You commit this card as `docs/plan/cards/LOAD-sparelater.md` in the PR.

## Purpose

The owner pasted their iPhone's loading audit at about 05:27 UTC 2026-11-27 (a first login, before part 2): the loading screen was up 42.5 s and lifted on "its 20 s limit" at 45.8 s; "25.0 s The armour's body frames were baked", "54.7 s The spare armour sets were baked", "55.1 s The bro was ready", "Armour frames ready when it lifted: 177 of 177". The orchestrator asked: "may the spare armour sets finish preparing after the loading screen lifts? I recommend yes. You'd get in about 20 s sooner on a first login, and the only cost is that changing armour in your first half-minute might wait a moment." THE OWNER, 05:30: *"Yes"*.

THE PRELOADING LAW says a load leaves the loading screen only by the owner's call: THIS IS THAT CALL, for the spare armour sets alone (the sets one equip away). Everything the bro WEARS still loads and bakes behind the screen.

## What a lane found (check before you lean on it; lines are near)

- `preloadPlayerAssets` (`src/rendering/pixiRenderer.js` near 117) chains masks, alt, upload, gear, done (`_preStep` near 111); that chain is the `waitFor` of `IntroVideo.jsx` (`HARD_CAP_MS = 20000` near 128, `maybeFinish` near 130, `markLift` near 132, the timer near 153). `alt` is `prewarmAltWornSets({fast:true})` (`entityRenderer.js` near 3745, called `pixiRenderer.js` near 162); the worn frames are `prewarmMaskedBodyFrames` (`entityRenderer.js` near 3637). On your base (part 2) the spare sets wait for the page's worn pass (`_wornPass`, with no limit: part 2's status lists it under Found) and share the one worker queue; the kept store (`?bakekeep=0`) holds them after a first login.
- The readout: `src/game/loadTimes.js` (steps bro-loads, bro-masks, bro-alt, bro-upload, bro-gear, bro-done; near lines 33, 34, 101) and `src/ui/panels/DevPanel.jsx` near 24 to 34 (the words the owner pastes). Specs: `docs/specs/load-times.md` (near 64: the spare sets are a step the screen waits for), `docs/specs/worn-bake-first.md` (17 to 62: spare sets "in spare time", only into cache room: `spareSkipped`), `docs/specs/bake-keep.md` (your base).

## The job (readings chosen)

1. THE SCREEN NO LONGER WAITS FOR THE SPARE SETS. The chain the loading screen awaits is masks, upload, gear, done; the spare sets start after `done` (after the lift is best: the world is drawn first), in spare time, and their frames go to the graphics chip as they come. Nothing the bro wears at login moves.
2. IN PLAY IT COSTS NOTHING A PLAYER FEELS (the page's one thread is budgeted): the bake stays in the worker; what the page does for it (taking frames, the upload to the chip) is a few ms at a time at the top of a frame (`framePacer.js beforeDraw`), never over the 12 ms line of `tools/qa/mp/held-budget.mjs`; it yields while a fight or a zone load is on if that is cheap to know. Memory: the spare sets still go only into cache room that exists; nothing new is kept.
3. CHANGING ARMOUR BEFORE ITS SET IS BAKED: find what the game does today when a set is equipped that was skipped (`spareSkipped`) or not yet baked, and make sure it is right for a set still in the queue: the equipped set jumps the queue (the worn frames first, as worn-bake-first says) and the bro is NEVER drawn wrong, half or bare meanwhile (he keeps what he wore, or the stand-in the spec names, until the new frames are there). Say in your message what the player sees and for how long on this box.
4. THE READOUT STAYS TRUE: "The spare armour sets were baked" still prints its time, with words that say it was after the loading screen; "The bro was ready" no longer waits for it; the line "Why it lifted" must read that the screen lifted because the game was READY when nothing else held it (if the paste would still say "its 20 s limit" for another cause, name that cause in your message: do not hide it). Yours here: `loadTimes.js`, its suite and DevPanel's words.
5. THE SWITCH: `?sparelater=0` puts the spare sets back behind the screen; ON by default (the owner's standing rule for a saver). Its row in the switch table (`node tools/guards/switches.test.mjs --write`).
6. Documents: `docs/specs/load-times.md` and `worn-bake-first.md` made true, with the owner's words and the date; if a guard holds the law's list (`preload-census`), its row; ONE clause in `CLAUDE.md` section 7's preloading law naming this third, deliberate exception ("the spare armour sets bake after the screen lifts: owner, 2026-11-27, `?sparelater=0`"), no more.

## Dodges (each must turn a check RED)

- `alt` taken out of the chain but `done` (or `upload`) still awaits it: the screen waits as before (a suite or phone test where the spare bake is made slow and the screen still lifts on ready);
- the spare sets never bake after the lift (a test that they are there within a time on the renderer's clock, and that the readout prints the step);
- equipping a spare set in the first seconds draws the bro wrong, bare or half (a phone test: lift, equip at once, read what is drawn through an existing probe);
- `?sparelater=0` not restoring the old order;
- the after-lift work holding the page over the line (the held sample over the first minute after the lift, or `mp-phoneframe`'s tools: name what you ran).

## Done when

- The checks above (a node suite for the chain's order and the readout; ONE phone test, `world: 'wheel'`, its `lane`, timed by the renderer's clock, never a 60 fps window), red without the change and green with it; part 2's `bake-keep` and `mp-bakekeep` as green as on your base (its one known red, "masks within 3 s of loads" on the slow box, is named in part 2's status: say whether it still is).
- Numbers for the owner: on this box, the loading screen's time on a first login before and after (the readout's own lines).
- precheck 0 FAIL; merge `origin/claude/plan-load-2-bakekeep` and `origin/main` ONCE, before your last push (if sitting 72 has landed part 2 by then, the orchestrator re-targets your PR to main: say your head and base in your message).
- When your base is on main this is THE FAST LANE's (the owner, 04:49 11-27: a change that only touches what is on screen lands on its own green checks, the checker reading it afterwards): no file under `server/`, `.github/`, `src/networking/`, gold, bag or logins; the ready message goes when `test`, `playable`, `memory-budget` and `lint-build` are green on your exact head.

## Not yours

The bake's worker and the kept store beyond what the queue's order needs (part 2's, reviewed: a bug you find there is REPORTED); the pictures' queue (the card's part 3, tag 6762: the owner's "Slowest pictures" lines, 7.7 to 7.8 s each, wait for a second-login paste); `HARD_CAP_MS` itself. EN-deathshadow is in `entityRenderer.js` tonight (monsters' shadows: far from 3600 to 3800): keep to your lines. A file outside this card that the job truly needs: ask the orchestrator first, one message, your recommendation in it.
