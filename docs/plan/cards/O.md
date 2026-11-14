# Card O: lanes and the governor (steps 2.1, 2.3, 2.4, 2.5 and 1.7)

**Starts:** now, with PRs 1 and 2 (their files are free). Card A is done
(its seven PRs merged: the report, the Speed card, the room's row, the
sweep's notes) and card H's part of step 3.1 is done; H's two follow-ups
still hold `src/rendering/**` (below, "Files O waits on").
**Read:** `CLAUDE.md` (§5: either side ships first, a cap that grows gates
by its count, a lower-case kill switch; §6: the harness's rules; §7: the
preloading law, the memory law, the page's thread, drawing, desktop); the
ten rules at the top of part 5 of `docs/GRAND-PLAN.md` (1, 2, 3, 4, 6 and 8
above all); pillar 2 (2.1 to 2.5) and step 1.7; part 8 ("No quality lowered
in silence", "No timing a program's build to decide a lane"); part 9, calls
3 and 16; `docs/SHAPES.md` part 4 (the report's fields) and part 6 (the
device class, `drawLane`); `docs/BUDGETS.md` parts 2, 3, 8 and 9 with
`tools/guards/lib/budgets.mjs`; `docs/specs/frame-pacer.md`,
`pixel-budget.md` (card G's), `device-profile.md`, `speed-test.md`,
`switch-table.md` (card T's); `src/game/framePacer.js`, `frameClock.js`,
`deviceProfile.js` (`devClass`), `renderRes.js`, `crowdCap.js`,
`lookPaletteChoice.js`, `speedTest.js`; `src/debug/report.js` and
`server/src/report.js` (`DRAW_LANES`, `_reportCap`); the header of
`tools/guards/lib/switches.mjs`; `docs/plan/status/A.md` (its Found for O);
`src/state/README.md` and the header of `src/state/phases.js`.
**Tags:** 5221 to 5239, one a PR, as numbered below. 5220 is the
orchestrator's PR that commits this card: do not commit it again, and do
not edit it (a question goes in your status file). 5235 to 5239 are spare
(a second PR a review asks for). If they run out, ask the planning session
for a block: never take one yourself. A PR whose files are still held may
be passed by the next one whose files are free; each keeps its own tag (a
tag only has to be unused on `main`).
**Branches:** one a PR (`claude/plan-o-<n>-<word>`), begun from `main`, or
from the PR before it when it needs that one and it is not merged yet (say
so in its words: the gatekeeper merges them in order). Open each PR when its
line is done, ready for review (not a draft: the gatekeeper skips drafts).
**Browser:** light: `questline` before each PR that changes a game file,
and the scenarios its line names. One run at a time. PR 3 runs a sample.
**Effort:** extra (every device's drawing, the frame's rate, the big files).

## What the card builds (so the PRs read as one)

- A **lane** is a ROW of knobs (2.1). Three: `full`, `light`, `thirty`
  (the plan's "30 lane": a word, so no page ever sends the number 30 where
  a name is checked). A device's facts pick its lane; no name of a system,
  browser, chip or model ever does.
- The **ladder** is the rungs below a lane's row, on two axes: the game's
  own work (the crowd, then the rate) and waiting for the chip (the rate,
  then the passes, then the pixels). A rung lowers one knob one step. The
  order is data in the table.
- The **governor** is the pacer, grown (2.3): `framePacer.js` alone says
  "late", on every screen, and moves the ladder. One state machine, one
  table.
- An **override** pins a knob (2.4): an off-ramp (`?pixbudget=0`,
  `?onebatch=0` ...) or a fallback (a software renderer; the look palette
  on Windows and a Mac) wins over the lane and the ladder. The governor
  never moves a pinned knob.
- **The knobs** (2.1's list) and where each lives today:

| Knob | Today | Its PR |
|---|---|---|
| the pacer's target (the rate) | `framePacer.js` (`PACE_FLOOR_MS`, fast screens only) | 4 |
| the pixel budget | `renderRes.js` (card G's, `?pixbudget`) | 5 |
| the crowd cap | `crowdCap.js` `CROWD_K` (the owner's 50, `?crowd=K`) | 6 |
| one program or three | `paletteTex.js` `oneBatchChoice` | 8 |
| how a look is made | `lookPaletteChoice.js` | 8 |
| the passes: shine, shadows, water | `src/rendering/lightfx/glint.js`, `sheenBatch.js`, `lightFx.js`, `shadows.js`; `wheelWater.js` (the Speed test turns each off live) | 9 |
| the queue's ms | the strip slice, `zoneTextures.js` `stripTurn` | 10 |
| the cache caps | each cache's own (BUDGETS part 3) | 11 |
| the step's cap | `frameClock.js` `SMOOTH_MAX_MS`; `BroTown.jsx`'s `_dtScale` clamp (50 ms) | 13 |
| the prewarm ring | step 3.3's (LATER): a column with one value and no reader until 3.3 builds the ring | none |

## PRs, in order

1. **(tag 5221) The lane table and its reader** (2.1, step 1: changes
   nothing a player sees).
   - Files: new `src/game/drawLanes.js` (no imports: node tests it); new
     `tools/guards/draw-lanes.test.mjs` (the table's guard; `--write` makes
     the page); new `docs/LANES.md` (made by `--write`, never by hand);
     new `docs/specs/draw-lanes.md`; `src/game/deviceProfile.js` (only if
     `pickLane` needs a fact it does not hand out yet: nothing new is asked
     of the device); `src/debug/report.js` (`drawLane`); `server/src/report.js`
     (`DRAW_LANES`, the programs' list and `rung`'s shape, from the table's
     names; `_reportCap` 3; a lower-case kill switch `reportlanes`, thrown:
     back to 2); `server/src/liveops.js` (its header's list of kill
     switches: a line of its own, TRAPS §333; say so in the status file);
     `server/test/report.test.mjs`; `server/test/mirror-audit.test.mjs`
     (the worker's three lists held to the page's); the `CAP_GATES` row's
     count (precheck `cap-registry`; TRAPS §9); `tools/guards/lib/switches.mjs`
     and `docs/SWITCHES.md` (rows: `?lane`, `reportlanes`; `--write`);
     `tools/guards/lib/systems.mjs` and `docs/SYSTEMS.md` (the new file in
     `device`); `src/state/device.js` (a row for each new top-of-file `let`:
     `node tools/dev/state-census.mjs --ledger --write`); `docs/SHAPES.md`
     part 4 (`drawLane`'s and `self`'s closed lists, the new `rung`) and
     part 6 (`drawLane`'s row: its writer is `drawLanes.js`), nothing else
     on that page.
   - **The table** (data): every knob of the list above, its value in each
     lane and its rungs; the two axes and the order of their rungs; for
     each knob its reader (`today: <file>` until its PR moves it), its
     switch, and its system (B's map). And the closed list of the game's
     own drawing programs for the report's `self` (step 1.7), read from
     the code: the programs built in `lookPalette.js`, `hairClip.js`,
     `fillBatch.js`, `wheelWater.js`, `sharpPixels.js`, `paletteTex.js`,
     `lightfx/glint.js`, `sheenBatch.js`, `shadows.js` (a name each; Pixi's
     own programs are not the game's).
   - **The rows are today's values.** `full` is what every device draws
     today. `light` is a row no device picks by itself yet: the tests' and
     the slow profiles' lane (1.5), its values those of `full` a few rungs
     down. `thirty` is `full` until PR 13 gives it its step's cap.
     `pickLane(devClass())`: `thirty` where `hz` is 30, else `full`. A
     finer pick (`light` by facts) waits for the device table (1.3): write
     under Found how many reports from which classes would justify one.
   - **The reader**: `laneKnob(name)` is the one way a knob's value is
     read: an override if one pins it, else the lane's row at the ladder's
     rung (always the row until PR 2). A knob that must be told when it
     changes (a resolution, a pass) subscribes: `onKnob(name, fn)`.
     `?lane=<name>`, a lever: this page's lane, whatever its facts.
   - **The report**: `drawLane` is the picked lane, sent only to a worker
     whose `caps.report` is 3 or more; below 3 the page sends `full`, as
     today, which in this PR is true (every lane draws `full`'s values).
     The worker learns `light`, `thirty`, the programs' names (`self`, sent
     from PR 14) and `rung` (sent from PR 2) now, so the worker deploys
     once for the card.
   - **The guard** fails: a knob with no value in a lane; a rung that
     lowers no knob, or two; a knob whose reader is in B's `combat` or
     `preload` system (the law below, held in data); a knob marked moved
     whose file has no `laneKnob('<name>')`; a page that is not what the
     table makes. The count of knobs not yet moved is a census (rule 3):
     its line falls with each knob's PR.
   - It touches `server/`: its merge deploys the worker (say so).
   - Done when the guard is green and each break proof turns it red (rule
     8: record them in its header); mirror-audit fails a lane the worker
     lacks; `report.test` keeps `thirty` and `light` in their own cells,
     drops an unknown lane, and with `reportlanes: false` advertises 2 and
     drops a lane other than `full`; `docs/LANES.md` is made; `questline`
     and `mp-speedtest` green (the Speed card names the lane).
2. **(tag 5222) The governor: the pacer, grown** (2.3; it moves no knob
   yet).
   - Files: `src/game/framePacer.js` (it may import `./drawLanes.js`, a
     leaf, and nothing else); `src/game/drawLanes.js` (the rung, set by
     the governor alone); `src/debug/perfTracker.js` (hands the pacer the
     strip's samples by a setter: no import into the pacer);
     `src/debug/report.js` (`late` by the pacer's exported rule, never its
     own copy (rule 6); `split` follows `late` (card A's Found); `rung`);
     `src/debug/perfHud.js` (a mark on the strip at each step);
     `src/game/speedTest.js` (it holds the ladder still while it runs:
     else it is a second controller of the same knobs);
     `server/test/frame-pacer.test.mjs` (the model, below: its merge
     deploys the worker); `tools/guards/lib/budgets.mjs` and `docs/BUDGETS.md`
     part 2 (the pacer acts on every screen); `src/state/phases.js` (the
     governor's row: a new state machine, step 5.3b; card L's table, a line
     of its own); its ledger rows; `docs/specs/frame-pacer.md`;
     `docs/SHAPES.md` part 4's `late` row (present on every screen now);
     the switch row `?govern`; new `tools/qa/mp/mp-governor.mjs`.
   - **One verdict, every screen.** "Late" is a frame more than half a
     refresh past its frame, at 120, at 60 and at 30, by one exported rule.
     Today's rate steps stay as they are (fast screens only) until PR 4
     makes the rate a knob.
   - **The axis from the strip's split.** Of the late frames' time: the
     game's own work (`sim` to `app`) takes the work axis's next rung; the
     rest (where the busy beat runs, `wait`) the chip axis's. A verdict is
     made from the samples `perfTracker` already keeps: no new timing,
     nothing measured inside the frame.
   - **Down and up as the pacer does now**: two bad verdicts running, a
     step down; clean for `UP_WAIT_MS`, a try up; a failed try doubles the
     wait, to `UP_WAIT_MAX_MS`. One rung of one axis a step.
   - **Pixels move only behind a veil**: a loading screen (`judge` false),
     a tab's return (`visibilitychange`), or a window covering the world
     where the page already says so without a new line in `BroTown.jsx`
     (if none does, under Found). A pixel rung wanted in play waits for
     the next veil.
   - **A full memory** frees caches and lowers the crowd, never resizes:
     the verdict here, its knobs in PR 11.
   - **The rung is kept** for the next sitting, by lane, in `localStorage`
     (a per-viewer convenience: every read and write in try/catch, and the
     page right without it): the next sitting starts there and tries up as
     above ("the speed rung starts where the last sitting settled").
   - **Off in the test box unless a test asks**: with `?lane=` in the
     address the ladder holds still, unless `?govern=1`; `?govern=0` turns
     it off on one phone. PR 3 puts `?lane=` on every test's page.
   - **No new loop and no step of the frame**: the governor runs inside the
     loop's one `take(ts, judge)` call, which `BroTown.jsx` already makes;
     `BroTown.jsx` is not changed. Its verdict runs once in 80 frames and
     stays under a millisecond.
   - **Done when** (2.3's own words) a node model of a heating and cooling
     phone settles and comes back at 30, 60 and 120, with no see-saw: a
     frame cost that rises with heat over minutes and falls as the phone
     cools; settled is no step in the last stretch at steady heat; back is
     the lane's row after cooling; a see-saw is down, up, down inside the
     doubled wait. Break proof: the doubling taken out turns it red. Also:
     in the model a pixel rung applies only at a veil; `report.test` sees
     `late` at 60; `mp-governor` (`world: 'wheel'`, `govern=1`,
     `BT_QA_CPU_THROTTLE`) sees a step down marked on the strip and no knob
     moved; `mp-heldsweep`'s sample shows no hold of the governor's;
     `questline`, `mp-steadypace` and `mp-speedtest` green.
3. **(tag 5223) Every phone test names its lane** (2.1's last sentence;
   one mechanical PR, planned with the gatekeeper).
   - Files: `tools/qa/mp/run.mjs` (it refuses a scenario whose module
     exports no `lane`, or a lane not in the table: the names read from
     `src/game/drawLanes.js`); `tools/qa/mp/harness.mjs` (every page a
     scenario opens carries `?lane=<its lane>`; a scenario's `govern: true`
     adds `govern=1`); every `tools/qa/mp/mp-*.mjs` (one line, `export
     const lane = 'full';`); new `tools/dev/name-lanes.mjs` (writes that
     line where it is missing; run twice, it changes nothing the second
     time); the other tools that open the game's page (`tools/qa/ui-review/capture.mjs`,
     the bots of `tools/qa/load/`, any other a grep of the page's address
     finds) pass `lane=full` the same way; new
     `tools/guards/scenario-lanes.test.mjs` (fails a scenario file with no
     lane, so GitHub fails it before a run does: rule 1); `CLAUDE.md` (§6's
     harness rules and §8's phone-test row: "its `lane`", nothing else);
     `docs/DEV-TOOLS.md` (the line).
   - Every scenario names `full` (today's drawing, exactly), and
     `mp-governor` asks `govern`.
   - **With the gatekeeper**: it touches every scenario, so it meets every
     open branch that adds or changes one. Open it once PR 2 is merged, and
     say in its words that it goes LAST in its sitting and that the
     gatekeeper runs `node tools/dev/name-lanes.mjs` on the rehearsal's tip
     (a scenario another PR of the sitting adds gets its line there). A
     branch begun after it that adds a scenario writes its own line (the
     guard says so).
   - **A sample** (part 11, rule 8): `questline`, `membudget`,
     `mp-governor`, `steadypace`, and one scenario of each way the harness
     opens a page (`newPlayer`, `joinPair`, `wide: true`), each page's
     address checked for `lane=full`. The PR's words offer the owner the
     full run (CLAUDE.md §6).
   - Done when the guard and `run.mjs` each refuse a scenario with no
     lane (break proofs tried), the script changes nothing on its second
     run, and the sample is green.
4. **(tag 5224) Knob: the pacer's target** (the rate).
   - Files: `framePacer.js`, `drawLanes.js`, `frame-pacer.test`, the spec,
     `docs/LANES.md`, the switch row.
   - The rate's rungs: on a fast screen as today (every refresh down to
     about 40 a second; `PACE_FLOOR_MS` becomes the lane's); on a 60 screen
     one rung, 30 (a whole number of refreshes, so steady), the work axis's
     last rung and the chip axis's first (call 16, below); on a 30 screen
     none.
   - Switch: `?ladderrate=0`, the rate as today.
   - Done when the model shows a 60 screen stepping to 30 and back with no
     see-saw; `mp-steadypace`, `mp-steadystep` and `questline` green.
5. **(tag 5225) Knob: the pixel budget** (card G's budget becomes a knob).
   - Files: `src/game/renderRes.js` (the budget times the lane's factor at
     its rung, through `laneKnob('pixels')`, moved only at a veil by the
     way `setRenderResLive` already moves it), `drawLanes.js`,
     `server/test/render-res.test.mjs` (its merge deploys the worker),
     `docs/specs/pixel-budget.md`, the switch row.
   - `full`'s factor is 1 (G's budgets, untouched); the rungs below take a
     quarter of the pixels off, then half (chosen; data the owner reads in
     `docs/LANES.md`). `?pixbudget` keeps its meaning (PR 12 makes it an
     override). The Speed test's `res2` keeps working (it holds the
     ladder, PR 2).
   - Switch: `?ladderpix=0`.
   - Done when the four callers still agree after a rung moves (no resize
     the next frame: `render-res.test` 4a to 4c), a rung wanted in play
     applies only at the next veil, and `mp-desksmooth`, `landview` and
     `questline` are green.
6. **(tag 5226) Knob: the crowd cap.**
   - Files: `src/game/crowdCap.js` (the cap the lane's at its rung: 50,
     then 30, then 15; the owner's 50 stays `full`'s; `?crowd=K` keeps its
     meaning until PR 12), `drawLanes.js`, `server/test/crowd-cap.test.mjs`
     (its merge deploys the worker), the switch row.
   - Always drawn, at every rung: your party, your target, whoever fights
     you, your duel (crowdCap's own rule).
   - If the cap reaches the renderer only as an argument from
     `entityRenderer.js`, that one line waits for card H's `done` and card
     TF's PR 2 (both in that file): open the PR after them.
   - Switch: `?laddercrowd=0`.
   - Done when the suite holds each rung's cap and the always-drawn;
     `mp-crowdbots` (a sample) and `questline` green.
7. **(tag 5227) The device asked only in `deviceProfile.js`** (card A's
   Found for O; 2.1's "facts only").
   - Files: `src/rendering/paletteTex.js` (the renderer's name),
     `src/rendering/peerImpostor.js` (`MAX_TEXTURE_SIZE`),
     `src/rendering/bodyBake.js` (`hardwareConcurrency`),
     `src/debug/crashTrap.js` (the user agent and the chip's size): each
     asks `deviceProfile.js` instead; `deviceProfile.js` (what they need, in
     its one place); `server/test/device-profile.test.mjs` §3 (it fails a
     chip or browser question outside the profile: a limit through
     `getParameter`, `hardwareConcurrency`, `userAgent`, the unmasked
     renderer); `docs/specs/device-profile.md`.
   - Changes nothing a player sees: every answer the same (a test each).
   - Waits for card H's `done` (three of the files are in `src/rendering/`).
   - Done when §3 fails each of the four as they were (break proofs) and
     passes as moved; `mp-bodyworker`, `mp-onebatch` and `questline` green.
8. **(tag 5228) Knobs: one program or three, and how a look is made**,
   their fallbacks as overrides.
   - Files: `paletteTex.js` (`oneBatchChoice` reads `laneKnob('program')`),
     `src/game/lookPaletteChoice.js` (`laneKnob('look')`), `drawLanes.js`
     (the fallbacks: a software renderer keeps the three programs; Windows
     and a Mac keep the three and bake each look; both asked through
     `deviceProfile.js` alone, each staying while its trigger lives: T's
     `fallback` column), `server/test/look-palette-choice.test.mjs` and a
     node test of `oneBatchChoice`'s answers (none exists today: a new
     suite, `server/test/one-program.test.mjs`), the switch rows.
   - **Not rungs.** A program or a look's way changed in play rebuilds what
     is drawn: they are a lane's row and its overrides, chosen once behind
     the loading screen, never moved by the governor.
   - Changes nothing a player sees: every device gets today's answer (a
     test each: a software renderer, Windows, a Mac, an iPad asking for the
     desktop site, a phone).
   - Waits for card H's `done` (`paletteTex.js`).
   - Done when no name decides either choice outside `deviceProfile.js`
     (pillar 2's done-when, for these two); `mp-onebatch`, `mp-lookwin`
     and `questline` green.
9. **(tag 5229) Knob: the passes** (shine, shadows, water).
   - Files: `src/rendering/lightfx/glint.js`, `sheenBatch.js`, `lightFx.js`,
     `shadows.js`, `src/rendering/wheelWater.js` (each through
     `laneKnob`, by the setters the Speed test already uses),
     `drawLanes.js`, their suites, the switch row.
   - The chip axis's rungs after the rate: the metal's shine, then the
     shadows, then still water (data; `docs/LANES.md`).
   - Waits for card H's `done`.
   - Switch: `?ladderpass=0`.
   - Done when a rung changed in play is one structural change, not one a
     frame (TRAPS §218); `mp-speedtest`, `mp-phoneframe` and `questline`
     green; the PR's words show the picture at each rung (part 8: the owner
     reads what the ladder does).
10. **(tag 5230) Knob: the queue's ms** (the strip slice).
    - Files: `src/rendering/zoneTextures.js` (`stripTurn` reads the lane's
      ms at its rung, not the frame's length), `drawLanes.js`,
      `tools/guards/lib/budgets.mjs` (`KNOWN_SECOND` 6 out: the slice no
      longer grows with the frame), `docs/BUDGETS.md` parts 2 and 8, the
      suites, the switch row.
    - Waits for card H's `done` (`strip-made`'s file).
    - Done when `budgets.test` passes with 6 gone; `mp-heldsweep`'s sample
      at the stations that load strips, `mp-stripgentle` and `questline`
      green.
11. **(tag 5231) Knob: the cache caps, and the memory axis** (2.3: "a full
    memory frees caches and crowd, never resizes").
    - Files: each cache's own file for its cap through `laneKnob` and a
      trim the governor calls (`lookPalette.js` `DIR_CAP`, `gearNumbers.js`,
      `entityRenderer.js` `MASKED_CAP`, the art cache's line in
      `cacheBytes.js`; the whole list from BUDGETS part 3); `drawLanes.js`;
      `framePacer.js` (the memory verdict: the game's own count, the
      report's `mem`, over the memory check's line for it, a copy of
      `tools/qa/mp/memory-budget.mjs`'s held equal by the guard, never a
      number of its own); the suites.
    - A trim frees only what is off screen, and never what the preloading
      law loads behind the loading screen: what it freed loads again behind
      the next veil, never in play.
    - Waits for card H's `done`, card TF's PR 2 (`entityRenderer.js`), and
      card P out of `cacheBytes.js` and `gearSheets.js` (its `pack-page`).
    - `mp-membudget` runs as on every PR: no line rises; one falls only if
      the trim runs in the check (say how many MB).
    - Done when the model's full memory frees caches and lowers the crowd
      and never moves pixels; `mp-membudget`, `mp-memledger` and `questline`
      green.
12. **(tag 5232) Off-ramps become overrides of the ladder** (2.4), through
    card T's one reader.
    - Waits for card T's PR 6 (`src/game/switches.js`, the page's one
      reader) on `main`.
    - Files: `drawLanes.js` (its overrides read through `switches.js`, never
      `location.search`); each knob's off-ramp read moved there:
      `?pixbudget` and `?res` (`renderRes.js`), `?onebatch` (`paletteTex.js`),
      `?lookpalette` (`lookPaletteChoice.js`), `?pace` (`framePacer.js`),
      `?crowd` (`crowdCap.js`), the passes' switches, and every `?ladder*`
      of PRs 4 to 11; the switch table (`needs`: each `?ladder*` needs
      `?govern`, rule 4); T's outside-reads line lowered by the reads moved.
    - A move changes no address's meaning (T's rule: the old read and the
      reader give the same answer on T's fixed set of addresses).
    - **T's PR 7 leaves these reads to you** while you run (T moves reads
      only in files no running card holds: your status file names them). A
      read T has already moved, you build on.
    - Done when no knob's off-ramp is read outside T's reader, each
      override pins its knob (the model: the governor never moves a pinned
      knob), and `questline` is green.
13. **(tag 5233) The 30 lane** (2.5).
    - Files: `src/game/frameClock.js` (`SMOOTH_MAX_MS` the lane's: three of
      its frames, 50 ms at 60, 100 at 30); `src/ui/BroTown.jsx` (the
      `_dtScale` clamp's one line reads the same cap); `drawLanes.js`
      (`thirty`'s row); `server/test/frame-clock.test.mjs` (its merge
      deploys the worker); the spec.
    - Named by the pacer: `thirty` wherever the refresh reads 30 (Low Power
      Mode), from PR 1. A 60 screen that only ever makes twos reads as 30
      and takes the 30 lane, which is what its frames are: the model holds
      both.
    - **The worker's move budget is the ceiling** (`server/src/movement.js`
      `MOVE_BUDGET`): a 100 ms step fits what the worker accepts, or the cap
      is what it accepts, and the PR says which. No server change.
    - Not combat: the dash's step (`DASH_MAX_STEP_PX`), the swing's clock
      and the bow's sight do not read the cap.
    - Waits for card SK's PR in `BroTown.jsx`'s movement step on `main` and
      card H's `done`; never while card M runs.
    - "To confirm with 1.1": the PR's words say how many reports name the
      `thirty` lane (the owner's "Copy table"), or that none has yet.
    - Done when `frame-clock.test` plays a 30 screen missing one refresh
      (67 ms) and the step covers its whole ground, not slow motion;
      `mp-steadystep` at 30 a second, `mp-steadypace` and `questline` green.
14. **(tag 5234) The self-test at the door** (1.7).
    - Files: new `src/rendering/selfTest.js`; `src/rendering/preloadAnimations.js`
      (its loader, behind the loading screen: the preloading law); each
      program's file for its one fallback hook (PR 1's list);
      `src/debug/report.js` (`self`; the worker has known it since PR 1);
      new `tools/qa/mp/mp-selftest.mjs`; the switch row
      `?selftest=fail:<name>` (a lever); the spec.
    - Each program draws a known picture (16 x 16, a few colours) into a
      small texture behind the loading screen. The answer is the page's own
      recolour of the same picture (its numbers and palette worked on the
      CPU: no art picture read back). One read of the drawn texture a
      program, at the top of a frame (`beforeDraw`), a few ms; the texture
      destroyed after (the memory law). Pixels are compared, never a time.
    - **One that fails falls back alone**, to its way of today: the one
      program to the three, the look palette to the bake, the colour numbers
      to whole colours, the sheen batch to its pass, the shadow prepass to
      its old pass, water to still, the sharp pixels to plain. A program
      with no way back is named in the report and drawn as today: under
      Found.
    - The report's `self` names each failure, once a sitting.
    - **A forced-fail scenario each**: `mp-selftest` forces each program's
      failure in a fresh page (`?selftest=fail:<name>`) and checks its
      fallback drawn, the others untouched, and `self` in the report.
    - Waits for card H's `done`, and card TF's PR 2 if it holds
      `lookPalette.js`.
    - Done when every program passes on the QA box (its software renderer
      included), each forced fail falls back alone, the PR states the ms
      added behind the loading screen (`loadTimes.js`), and `mp-membudget`
      and `questline` are green.

## Readings chosen for you

- **Facts pick a lane, never a name** (SHAPES part 6). A name (Windows, a
  Mac) stays only as a fallback for a known bug with no other test, asked
  in `deviceProfile.js` alone and listed in T's `fallback` column. Done for
  pillar 2 when no name of a system or browser decides a quality choice
  outside the profile.
- **Nothing timed decides a lane.** `fill` stays `none` in this card: a
  timed fill behind the loading screen holds the page and lengthens a
  loading screen that has no line yet, and no lane reads it until the
  device table shows two devices of one class that run differently.
- **Combat's timing and loading are never on the ladder** (the owner's
  call 3: the ladder may step down by itself on a hot or full phone,
  "never combat", with a mark on the strip). No knob changes a swing's
  clock, a cooldown, a wind-up, a hit window, the dash's step, the bow's
  sight, the tick or what the worker reads from moves; no knob moves a load
  off the loading screen or skips a preload. The table holds it (PR 1's
  guard). A step may come in a fight (a hot phone needs it then): it
  changes no timing, and pixels still wait for a veil.
- **Every step shows**: a mark on the strip (the frame meter), the
  report's `rung`, and every rung a row of `docs/LANES.md` in a player's
  words (part 8: "No quality lowered in silence").
- **Call 16**, a steady lower rate before a softer picture: the rate's rung
  comes before the passes' and the pixels' on the chip axis. If the owner
  answers otherwise it is the table's order (data), not code.
- **The test box**: the governor holds still under `?lane=` (every test's
  page from PR 3) unless `?govern=1`. A test of the governor asks for it;
  `BT_QA_CPU_THROTTLE` plays a slow phone.
- **One controller a signal** (rule 6): the governor alone moves a knob;
  the Speed test holds the ladder still while it runs; `budgets.mjs` gives
  the governor its controls, and `KNOWN_SECOND` only falls (6, in PR 10).
  The frame measured by two clocks (5) and "is the world in play" asked
  four ways (7) stay: under Found, for card M.
- **Either side ships first**: the worker's lists (lanes, programs, `rung`)
  all land in PR 1, one deploy; the page sends a new value only against
  `caps.report` 3. `reportlanes: false` takes it back to 2: the page sends
  `full`, and no `rung` or `self`.
- **The report's rules** (card A): numbers and closed lists only. `rung` is
  two whole numbers, the lowest rung reached and the seconds spent below
  the lane's row in the report's seconds; the smoothness sink, beside the
  cell, never in it (SHAPES part 4's row, rule 2).
- **Switches** (card T's table, on `main`): every new `?name=` or flag is
  its row in the PR that reads it (`node tools/guards/switches.test.mjs
  --write`). A knob's switch is `?ladder<knob>=0`, "this knob as today",
  each needing `?govern` (rule 4). T's PRs add rows to the same table:
  merge `main` in before the last push, and say in the status file that a
  row was added (the gatekeeper lists such PRs one after another).
- **The state**: each new top-of-file `let` its ledger row; the governor
  its row in `src/state/phases.js` (one field, one transition function,
  and a suite that fails a second writer of the rung: `door`); its
  lifetime "kept: the device's, not the zone's" (card L's `reset` column).
- **The page's thread**: the verdict runs once in 80 frames from samples
  already kept; nothing measures the page; `mp-heldsweep`'s sample at PRs
  2 and 10.
- **Phone tests**: `world: 'wheel'`; a computer's `wide: true`; its `lane`
  (from PR 3).
- **Where the card does not say**: ask the planning session once (a file
  outside the card, a technical question: `docs/plan/README.md`, "Who
  answers a session's questions"). What a player sees beyond the ladder's
  rows, money, and the deploy settings stay the owner's.

## Files O waits on (read the status files again before each PR)

- `src/rendering/**` (PRs 7 to 11 and 14): **card H**, its two follow-ups
  (#1762, tag 5050; then 5051, the portrait's shirt). Part 11: never G or O
  with H in the same file. Start such a PR only when H's status says
  `done`.
- `src/rendering/systems/entityRenderer.js` (PRs 6 and 11, if at all):
  after H, **card TF**'s PR 2 (the townsfolk's work poses); TF may also
  hold `lookPalette.js` and `folkPose.js`.
- `src/rendering/gearSheets.js`, `cacheBytes.js`, `p256.js`, `pixiApp.js`,
  `paletteLoad.js`: **card P** (the asset backlog; `pack-page` after H).
- `src/ui/BroTown.jsx` (PR 13 only): **card SK** (`src/game/ride.js` and
  the movement step in `BroTown.jsx`) merged, and card H `done`; never while
  **card M** runs (it has not started). If card L is in `BroTown.jsx` when
  you get there, ask the planning session.
- `src/game/switches.js` (PR 12): **card T**'s PR 6 on `main`.
- `tools/guards/lib/switches.mjs`, `docs/SWITCHES.md`,
  `tools/guards/lib/systems.mjs`, `docs/SYSTEMS.md`: **card T** writes
  them too (its PRs 2, 3 and 6): your rows in a place of their own.
- `tools/qa/mp/**` (PR 3): every card that adds a scenario (TF's
  `mp-folkwork`, P's memory lines, ...): the gatekeeper's sitting.
- `src/state/phases.js`: **card L** adds rows (its PR 5): yours on a line
  of its own.
- `server/src/liveops.js`: **cards E and L** add flags: a line of its own
  (TRAPS §333), said in the status file.
- `docs/SHAPES.md`: card L edits part 8; yours are parts 4 and 6 only.
- `src/game/framePacer.js`: yours while O runs. Card M, when it starts,
  calls it as the loop does now: do not split the frame into steps (5.4 is
  M's).
- Free now: `src/game/drawLanes.js` (new), `framePacer.js`, `frameClock.js`,
  `deviceProfile.js`, `renderRes.js`, `crowdCap.js`, `lookPaletteChoice.js`,
  `speedTest.js`; `src/debug/report.js`, `perfHud.js`, `perfTracker.js`,
  `crashTrap.js` (card A is done); `server/src/report.js`;
  `tools/guards/lib/budgets.mjs`, `docs/BUDGETS.md`.

## Not yours

The device table and its reader (1.3, the owner's call 6); the slow
profiles (1.5); the look palette on computers (2.2b); one queue for work
not this frame's (3.2) and the prewarm ring (3.3); the frame's steps (card
M); the debt list's rows (`held-budget.mjs`); the sitting's card (card Q);
reaping a switch (7.3); `CLIENT_SAVERS` and the Test panel's list. A lane
picked by facts beyond `thirty`, or a quality lowered outside the ladder's
rows, is the owner's call or a later card's, from the device table.
