# Card EN: the skeleton's shadow during its death animation is far too low (the owner's bug; one PR)

Model and effort: the strong model, high (a renderer). Tag: 6209 (EN's block 6200 to 6219; precheck says if it was taken: then the next free one of the block). Branch `claude/plan-en-deathshadow`, from `main` (17124fc8 or newer). ONE draft PR, base `main`; ONE message to the orchestrator (line 5 of `git show origin/claude/plan-orc:docs/plan/status/ORC.md`), then stop. No file under `server/src`: the PR deploys nothing. You commit this card as `docs/plan/cards/EN-deathshadow.md` in the PR.

## Purpose

The owner, 2026-11-27 (about 05:12 UTC), typed in the orchestrator's session, playing the world on an iPhone: *"The skeletons shadow during death animation (of mummy - skeleton is second phase) is far too low"*.

A BUG IN WHAT THE PLAYER SEES: the mummy's second phase is a skeleton; while that skeleton plays its DEATH animation its ground shadow is drawn far below its feet. A MONSTER'S SHADOW SITS UNDER ITS FEET IN EVERY ANIMATION, the death included, and in every phase of a monster that changes its look.

## The job

1. FIND IT FIRST (nothing below is checked: the orchestrator had no lane for it). Where a monster's shadow is placed: `src/rendering/systems/entityRenderer.js` (grep `shadow`; read by range, never whole) and what gives it the feet's row (`artBottoms.js`, the strips' own bottoms read in a worker; `heldNumbers.js`). Likely causes to rule in or out: the death strip's frames have another height, anchor or padding than the walk's, and the shadow keeps the walk's offset or takes the death frame's box; the second phase's look (the skeleton) takes the FIRST phase's (the mummy's) bottom; the death frames fall or shrink and the shadow follows the picture's box, not the ground. Find the mummy's and the skeleton's looks and their death strips in the Wheel's monster art (`wheelMonsterArt.js`, `public/sprites`), and say which it was.
2. Prove it on the phone page: a test that brings the mummy to its second phase and kills the skeleton (the Test panel's `/dev/*` levers, or the harness's own ways to place and kill a monster in the world, `world: 'wheel'`), and at several frames of the death reads the shadow's place against the feet's ground line through a probe (`window.__bt*`, which must exist: precheck `qa-handles`). RED on main today, green on your code.
3. Mend the cause, not the one monster: then SAMPLE the other monsters with a death strip or a second phase (each look family once; the owner's rule of 2026-10-28: a sample now, the full audit named as the other choice) and list any whose shadow is off by more than a few pixels in any animation. One the same cause mends is mended; another cause is REPORTED, not mended.
4. The laws that bind: memory (nothing new kept per monster that is not freed with it), the page's one thread (no canvas read back on the page: the bottoms come from the worker or offline), drawing (no structural change every frame; the shadow's place is a number, not a rebuild).

## Dodges (each must turn a check RED)

- mended for the skeleton by a number written for it (a per-monster offset) while another monster with a shorter death strip is still wrong;
- right in the death's first frame, wrong in its last; right facing one way, wrong mirrored;
- the shadow now right in the death and moved in the walk or the stand.

## Done when

- The phone test above (its file `mp-<name>.mjs`, its `lane`), red on main and green on the final code; a node suite if the mend is a pure function.
- Pictures for the owner in `docs/shots/`: the skeleton's death before and after, 375 x 667 upright.
- THE FAST LANE (the owner, 04:49 11-27: a change that only touches what is on screen lands as soon as its own tests are green, the checker reading it afterwards): no file under `server/src`, `.github/`, the wire, gold or logins; your ready message goes when `test`, `playable`, `memory-budget` and `lint-build` are green on your exact head.

## Not yours

`entityRenderer.js` lines 3440 to 3800 are card LOAD's tonight (#2411, in sitting 72: merge `origin/main` once before your last push and keep both); the monsters' art files themselves unless the cause IS a file (then say so and ask first); the worker. A file outside this card that the job truly needs: ask the orchestrator first, one message, your recommendation in it.
