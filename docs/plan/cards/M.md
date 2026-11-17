# Card M: the frame as steps (steps 5.4, then 5.5)

**Starts:** after B and L (L's status `done`: part 11 never lets "the
state's resets and the frame's steps" be half-done together); H and P
stopped. **Never side by side** with any other change to
`src/ui/BroTown.jsx` (15,946 lines) or the two renderers,
`src/rendering/systems/entityRenderer.js` (18,994) and
`effectsRenderer.js` (19,110). Before each PR, read the status files of
every running card that names them (K, K2, L, O, G, SK, TF, V today): none
may hold a commit in them that is not on `main`.
**Read:** `CLAUDE.md` (§3, §6, §7: preloading, memory, the page's one
thread, drawing; §8's rows below); the ten rules at the top of part 5 of
`docs/GRAND-PLAN.md` (2, 3, 4 and 8 most); steps 5.1, 5.2b, 5.4 and 5.5;
part 11's "never side by side"; `docs/SYSTEMS.md` (page-thread, render,
look, debug); `tools/guards/lib/filesOf.mjs` and `bigFileSuites.mjs` (the
header); `tools/guards/lib/fourLines.mjs` (`LINES`);
`docs/plan/census/T-reads-left.md` part 2; `src/game/switches.js` (`sw`,
`swHas`, `pageAddress`); `src/debug/crashTrap.js` (`recordCrash`, `_QUIET`);
`tools/qa/mp/mp-rendergroups.mjs` (the same frame drawn twice).
**Tags:** 5340 to 5359 (card M's block, already in
`tools/dev/tag-blocks.json` and never used: no commit on `main` carries
one). One a PR, in the order below. Do not change the blocks file. When
the tags run out, ask the planning session for a second block.
**Effort:** high (the big files; every frame on the page).
**Browser:** heavy: the phone tests on the world, after `npm run build`,
one at a time; reap after (`pkill -f '[w]orkerd'; pkill -f '[c]hromium'`).
A run over about 30 minutes is a sample, and the PR offers the full run.
**Your questions, and "ready":** by message to the planning session,
`session_01LccHamDdNzEDtNWFCYhLn9` (not `@parent`), and in the status file
for the current gatekeeper (card Z). Anything decided for the owner while
away goes in the PR's words under **"Decided for the owner while away"**,
with its switch (`docs/plan/README.md`).

## What the card builds, so the PRs read as one

- **5.4, the frame as named steps.** The loop (`gameLoop`, BroTown.jsx
  from line 4897) becomes a list of named steps, each counting its throws
  and its time. Nothing moves in PR 1; the monsters' step is the first move.
- **The page's address, read once.** The 38 reads card T left for M
  (BroTown.jsx 16, effectsRenderer.js 13, entityRenderer.js 9) go through
  `src/game/switches.js`, before the split moves the code around them.
- **5.5, tables first.** The hand-tuned tables in the two renderers
  (`BODY_DIR_SCALE`, `BODY_ROWS`, `REST_ANG`, `NECK_ROWS`, ...) leave as
  leaf files with no imports, a system's tables a PR. Then the code, a
  system a PR, verbatim. The code-lines lines fall (5.1).

## The laws that apply (CLAUDE.md)

- **Preloading** (§7): a moved table or function is a static import in the
  same chunk; no `import()` is added, nothing loads on first use, and
  `preloadWorldAnimations` and the prewarm lists (`PREWARM_POSES`) keep
  their order. A table a bake reads keeps its exact values (TRAPS §251).
- **Memory** (§7): no art, sound or canvas is made, so no 256-colour work
  arises; if one would, stop and ask. The step sums are fixed typed arrays
  made once: a frame makes no garbage. `mp-membudget`'s lines are never
  raised.
- **The page's one thread** (§7): the marks cost two clock reads a step;
  `mp-heldsweep` (a sample) stays within `held-budget.mjs`.
- **Drawing** (§7): no structural change, no new mask, the camera and the
  player's place untouched; four-lines' count of writes to `S` from
  `src/rendering/` only falls.
- **The phone tests on the world** (§6): every new scenario passes
  `world: 'wheel'` and names its `lane`; a computer run passes `wide: true`.
- **Same-change rows** (§8): "a `?name=` or a live flag" (PR 1's switch:
  its row in `tools/guards/lib/switches.mjs`, then
  `node tools/guards/switches.test.mjs --write`; a new row needs `on`);
  "a phone test" (`mp-framesteps`: its file, `world: 'wheel'`, its `lane`);
  a probe a test reads exists (precheck `qa-handles`).
- **Tests find code by system** (5.2b): a suite that reads a moved table
  or function in a big file's text is converted to `filesOf` in the same
  PR, never after. A converted suite under `server/test/` deploys the
  worker on merge (TRAPS §277): say so in the PR's first line.

## PRs, in order

Each branch starts from `main`; never from an unmerged branch. Merge `main`
in before the last push. `node tools/dev/precheck.mjs` passes before every
push; `questline` and `membudget` run on every PR.

1. **(tag 5340) The frame as a list. Moves nothing.**
   - New `src/game/frameSteps.js` (imports nothing; node tests it): the
     step names in order, `visual`, `arrows`, `slime`, `cleanup`, `render`,
     `afterFrame` (the six calls at the loop's end: `updateVisualSystems`,
     `updateArrows`, `updateSlimeProjectiles`, `updateStateCleanup`,
     `renderFrame`, `runAfterFrame`) and one `legacy` before them (all the
     rest of the loop's body). `begin(i)` and `end(i)` by index, no closure
     made per frame; time summed over 600 frames, then kept as the last
     window's sums (Safari's clock ticks in whole ms).
   - `BroTown.jsx`: the marks around the six calls and the legacy body,
     nothing else. The loop's one `try`/`catch` asks `frameSteps` which step
     was open, counts it, and ends the frame as today (a throw still stops
     the steps after it: nothing a player sees changes).
   - A step's FIRST throw a page load goes to the crash ring
     (`recordCrash('frame-step', name + ': ' + message)`); later ones are
     counted only. `'frame-step'` joins `_QUIET` in `crashTrap.js`: it
     rides along with the next real upload and sends nothing alone (no new
     write; see the question below).
   - `?framesteps=0`: no marks, no ring entry, the loop exactly as it was.
   - The probe `window.__btSteps()` on QA pages: names, sums, throws.
   - New `tools/guards/frame-steps.test.mjs`: the runner's order, a throw
     counted once to the ring, the sums; and a census (rule 3) of the code
     lines inside `legacy`, which only falls (its break proof: one line
     added inside legacy turns it red).
   - Files: new `src/game/frameSteps.js`, `src/ui/BroTown.jsx` (the loop
     only), `src/debug/crashTrap.js` (`_QUIET` only),
     `tools/guards/lib/switches.mjs` and what `--write` makes,
     `tools/guards/lib/systems.mjs` and `docs/SYSTEMS.md` (frameSteps in
     page-thread), new `tools/guards/frame-steps.test.mjs`, new
     `tools/qa/mp/mp-framesteps.mjs`, this card, `docs/plan/status/M.md`.
   - First run `four-lines`: if BroTown.jsx (8,370) or `gameLoop` (1,583)
     has no room for the marks, ask before writing; never raise a line.
   - Done when the guard is green; `mp-framesteps` (phone, upright and
     sideways: seven steps in order, each with time, no throws; with
     `?framesteps=0` the probe says off) green; `steadystep`,
     `phoneframe`, `desksmooth` and a `heldsweep` sample green, their
     numbers in the PR beside `main`'s.
2. **(tag 5341) The monsters' step.** After 1 is merged.
   - `updateMonsterCombat` (line ~7640) gets its own marks, `monsters`,
     in its place in the order: `legacy` is open before it and again after
     it (one step, its time summed), so nothing runs earlier or later.
   - Files: `src/ui/BroTown.jsx` (the loop), `src/game/frameSteps.js`,
     the guard, `mp-framesteps.mjs`.
   - Done when legacy's census fell by the lines it lost; `mp-framesteps`
     shows eight steps; `manualcombat`, `heldcombat`, `crowdfight`,
     `monstermoves` green. Further steps out of legacy are not on this card.
3. **(tag 5342) The address, read once: BroTown.jsx (16 reads).**
   - Card T's way (its PRs 5309 to 5317): `sw()` / `swHas()` for a
     single-name switch whose row has no need its old test lacks, else
     `pageAddress()`; each old test kept word for word in `MOVED`.
   - Files: `src/ui/BroTown.jsx` (the reads only),
     `tools/guards/switch-reader.test.mjs` (`MOVED` only; the gatekeeper
     lowers `OUTSIDE_LINE`), `docs/plan/census/T-reads-left.md` (part 2).
   - Done when `switch-reader` check 1 holds every moved read, check 3
     counts 16 fewer, and `switches-thrown` is green.
4. **(tag 5343) The address, read once: the two renderers (22 reads).**
   As 3, in `effectsRenderer.js` and `entityRenderer.js`; part 2 of the
   census is then empty. Done as 3, and `lookgear`, `magicburst` green.
5. **(tag 5344) The renderers' tables, counted.** Moves nothing.
   - New `docs/plan/census/M-tables.md`: every table in the two files (a
     top-level object or array literal of numbers, strings, booleans and
     other literals: no call, no name but another table's), a row each:
     name, file, line, system (from the map), and the suites that read it
     by its text. A lone number is not a table. A table the code writes
     into is not a table: it stays, and is listed apart.
   - New `tools/guards/render-tables.test.mjs`: the count in the two files
     only falls (rule 3; the gatekeeper alone makes it strict).
   - Done when the guard is green and the census's systems and their
     order (largest first) are written; the next PRs follow it.
6. **(tags 5345 to 5352) The tables leave, a system's a PR.** In the
   census's order; about six to eight PRs (`look`, `combat`, `monsters`,
   `render` and `ui` likeliest).
   - New `src/rendering/tables/<system>.js`, no imports, each table moved
     exactly as written (not frozen, not reformatted), imported back by
     the same name. The file goes in its system's row in `systems.mjs` and
     `docs/SYSTEMS.md` (under `src/rendering/` it is `render`'s otherwise).
   - Files: that file, the renderer(s) it leaves, the suites the census
     names for its tables, `systems.mjs`, `docs/SYSTEMS.md`, the census.
   - Done when a scratch check (in the PR's words, with its output) finds
     each table deep-equal, key order included, to its literal at the
     base commit (`git show origin/main:<file>`); the table count and the
     file's code lines fell; `build` green; and the system's tests below.
7. **(tag 5353) The renderers' code, counted.** Moves nothing. A second
   section in `M-tables.md`: each function and method, its system, its
   code lines, the suites that read it. The order of the moves, by system.
8. **(tags 5354 to 5359) The code leaves, a system a PR.** Verbatim into
   `src/rendering/systems/<system>/`; the renderer keeps a call where the
   function was. A move PR changes no logic.
   - Done when `git diff --color-moved=zebra` shows every changed line as
     moved but the imports, exports and call sites; four-lines' file and
     function lines fell (say the numbers; the gatekeeper lowers them);
     the system's tests below, `phoneframe` and a `heldsweep` sample green.
   - A step that cannot be verbatim (a method reading `this`, a closure's
     variable) is not forced: it goes behind a switch, and its PR proves
     the same frame with the switch on and off, 0 pixels apart, the way
     `mp-rendergroups` does (hold the frames, draw twice, compare).

**The phone tests by system** (with `questline`, `membudget` every time):
look: `lookgear`, `lookarmour`, a `ghostaudit` sample; combat:
`manualcombat`, `heldcombat`, `bowfeel`; monsters: `monstermoves`,
`crowdfight`; effects: `magicburst`, `lootbeam`, `itemdrop`; screen marks
and bars: `bandshots`; a computer: `deskwide`.

## Readings chosen for you

- "Nothing a player sees changes" is pixel for pixel: tables by value,
  code by moved lines, anything else behind a switch with the same-frame
  check. No PR changes a number, an order or a timing.
- No new writes: no file under `server/src/` is touched; the crash ring
  sends nothing new; the step sums stay on the page (the probe), never in
  the field report (card A's, and a `docs/SHAPES.md` row).
- The 38 reads are M's (PRs 3 and 4), not a fresh T's after M: M holds
  the three files for all of 5.5, which has no fixed end, so a T after M
  would wait on it; done first, the code M moves carries clean reads, and
  T's recipe is written down.
- A red phone test on `main` is a question about the test first (TRAPS
  §177): run it on `main` before calling a PR's red its own.

## Not yours

`docs/GRAND-PLAN.md` (Z ticks 5.4 and 5.5); any line in four-lines, the
switch reader or the census guards (the gatekeeper lowers them); the field
report (A); the state ledger and the phase table (L); any server code.

## Decided by the planning session (2026-11-17)

1. **Start:** read and build now. Open PR 1, and send its head, only once
   card L's last four PRs (#2052, #2058, #2065, #2067) are on `main` (L is
   then `done`). Before PR 1, check that no open PR on any running card
   touches `src/ui/BroTown.jsx` or the two renderers; if one does, name it
   under Needs and wait.
2. **Crash ring:** no new upload. The kind `'frame-step'` goes in `_QUIET`
   and rides with the next real upload (a new POST is a cost: the owner's).
3. **T's 38 reads:** M does them (PRs 3 and 4). This overrides T's earlier
   "a T session moves them as K, L and M end".
4. **The six steps:** the six calls at the loop's end, as PR 1 names them;
   everything else is `legacy`.
5. **Step times:** in the probe only. No field-report change.
6. **Line limits:** run `four-lines` first. If `BroTown.jsx` or `gameLoop`
   has no room for the marks, ask; never raise a line yourself.
7. **Files outside the three:** `tools/guards/lib/systems.mjs`,
   `docs/SYSTEMS.md`, `crashTrap.js` (`_QUIET` only),
   `switch-reader.test.mjs` (`MOVED` only), and the suites that read a
   moved table are M's. A suite under `server/` deploys the worker on
   merge: say so in that PR.
8. **Tags:** when 5340-5359 run out, ask for a second block.

## Amended by the owner's review (2026-11-17, the owner's "Go")

The session "Grand plan M split review" measured the three files and the
owner said go to six changes. They overrule the lines above where they
differ.

1. **M ends at line 7** (the code counted). Line 8 ("the code leaves")
   leaves this card; tags 5354 to 5359 stay unused. Line 7's count records
   for each function and method: its code lines, whether it reads `this`,
   the module state it reaches, the in-file names it reads, the suites
   that read it. A new card, with a new letter and a fresh session, is
   written from that count. Measured: only about a tenth of the renderers'
   code can leave verbatim as leaves (168 top-level functions with no
   module state, 1,687 lines). The classes are 12,978 lines, and four-lines'
   IMPORT_CYCLE_FILES has no room, so code can only leave leaf-first.
2. **Two chains, by file, two sessions.**
   - **Chain A, session M:** lines 1, 2, 3 (BroTown.jsx), tags 5340, 5341,
     5342.
   - **Chain B, session M2** (status `docs/plan/status/M2.md`): lines 4, 5,
     6, 7 (the renderers; 5 and 7 change no game file), tags 5343 to 5347
     as below.
   A chain-B PR may be open while a chain-A PR waits at the gatekeeper.
   "Never side by side" narrows to the file a PR is in. Shared lines each
   chain writes in a place of its own: `MOVED` in switch-reader.test.mjs
   (A's block above B's) and part 2 of T-reads-left.md (A writes the
   BroTown.jsx rows, B the renderers' rows); systems.mjs and SYSTEMS.md
   (A: frameSteps in page-thread; B: tables in render or their system).
   The second PR to touch a shared file merges `main` in after the first
   lands.
3. **The tables in two PRs, one a renderer** (tags 5345 entity, 5346
   effects), not six to eight. Line 5's count (tag 5344) also lists the
   ~250 lone top-level constants, each marked tuned (a scale, offset or
   anchor of the art) or not. The tuned ones leave with the tables, by
   that count. The 7 suites that name a table go with these two PRs.
4. **Tests converted in one batch.** The 58 suites that read the three
   files by text are the new card's first PR, not part of each move.
5. **More steps named (line 2, tag 5341):** every existing single call in
   the loop becomes a step, grouped: sound (tickWaterAmbience to
   tickDanceMusic), zone (handleZoneTransitions, updateZoneMechanics,
   updateDungeonWaves), farm (tickFarmWalk), race and townsfolk (raceTick,
   townsfolkFrame), monsters (updateMonsterCombat), weapon feel (sword,
   staff, bow), loot (updateGroundLootPickup), peers (releasePeerDamage),
   plus settleTapPress and rideStepped. `legacy` is reopened between them
   and nothing moves. It's the same one PR and the same tests. 5.4's box is
   not M's to finish; the loop's measured facts go in the census for a later card.
6. **Small gaps.** `mp-lookarmour` and `mp-itemdrop` are red on `main`: a
   PR passes with "the same failures as `main`, by name", shown in its
   words. KNOWN_SECOND 5 (the frame measured by two clocks) and 7 ("is the
   world in play" asked four ways), and BUDGETS part 3's caches, are not
   M's: they're held for the later card, named in M's status under Found.

Tags after this: A 5340 to 5342; B 5343 (T's 22 renderer reads), 5344
(tables and lone constants counted), 5345 (entity tables), 5346 (effects
tables), 5347 (code counted). 5348 to 5359 are unused.
