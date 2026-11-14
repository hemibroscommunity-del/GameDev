# The budgets: one row for each thing the game's systems share

Rule 6 at the top of part 5 of `docs/GRAND-PLAN.md`: *one controller a
signal, and a budget for what is shared.* Step 8.7. Written by card S
(`docs/plan/cards/S.md`), tag 5026, written bare as the plan's cards write
theirs. Read at `main` 2d4138e, in the code, not in a document.

## 0. How to read this page

Seven things are shared by every system in the game. For each, this page
says what exists TODAY:

- **The line**: the number that may not be passed, and the file a test holds
  it in. Blank where there is none.
- **Reads**: what measures it.
- **Spends**: what uses some of it.
- **Controls**: what CHANGES the game because of it (a rate, a cap, a
  quality, a refusal). Rule 6 wants one controller for each signal.
- **SECOND**: a controller of a signal another controller already acts on.
  Each is named where it is found, and gathered in part 8.

Nothing on this page is a new rule yet. The guard that reads a table like
this one and fails a second controller, or a sum over its line, is code in
`tools/guards/`, card B's. Part 9 says what it would read.

A path is a file, not a system's name: system names come with card B's map.

| Shared thing | The line today | Held in | Run | Controllers today |
|---|---|---|---|---|
| 1. ms on the page's thread | 12 ms a job outside the frame; 16 ms of the game's own code in a frame; 45 ms at a window; the debt list's 13 lines of their own | `tools/qa/mp/held-budget.mjs` | the sweep on demand; its lines on every PR | **none**: 24 rationers, each its own allowance |
| 2. lateness | no number of its own; the pacer's rule, and a step of at most 50 ms | `src/game/framePacer.js`, `src/game/frameClock.js` | every PR | **one** verdict (the pacer), on fast screens only; the frame's length acts in two more places |
| 3. MB | seven lines (112, 115, 56, 22, 38.5, 22, 36 MB); a third trip within a few MB of the second | `tools/qa/mp/memory-budget.mjs`, `mp-membudget.mjs` | every PR that touches the game | **none**: about 30 caps, each its own; the owner's switches by hand |
| 4. the loading screen's seconds | **blank** | none | none | **none**: give-up caps only |
| 5. rows written | 14 groups of lines a case; no total | `server/test/cost-guard.test.mjs` | every PR | `_saveRpg` for the player's record; each other record its own clock |
| 6. messages | in: 300 at once and 120 a second a socket; out: 500 events and 64 KB a tick | `server/src/flood.js`, `server/src/index.js` | every PR | in: one socket budget, and a dozen lanes by type beside it; the phone's send: **six layers**; out: one (the tick's pacer) |
| 7. how a player looks to the server | the anti-bot's thresholds, all hidden settings | `server/src/hidden.js` `HIDDEN_SPEC` | every PR | each signal reads rhythms that two or more systems on the phone shape |

## 1. Ms on the page's thread

### The line

| Line | Number | Where |
|---|---|---|
| a job outside the game's frame, in play | 12 ms | `held-budget.mjs` `HOLD_MAX_MS` |
| the game's own code in one frame | 16 ms | `FRAME_JS_MAX_MS` |
| a tap's own redraw at a window (`windows`, `folk`, `g-boards`) | 45 ms | `WINDOW_MAX_MS`, `AT_A_WINDOW` |
| one hold past its line by less than 1.5 times | noise | `NOISE_K` |
| the debt list: 13 families over the line today, each with its own | 13 to 260 ms | `KNOWN` |
| a hold line kept OUTSIDE that file | 70 ms a hold, 520 ms in all; 22 ms a slice | `tools/qa/mp/mp-townride.mjs`, `mp-stripgentle.mjs` (**SECOND**: two more files hold lines of the same thing) |

Held by `mp-heldsweep` and `mp-crowdsweep` (a profiler on an unminified
build, on demand, about 12 minutes), the three feel tests (`FRAME_JS_MAX_MS`
divided by 4 and by 50), and `server/test/held-sweep.test.mjs` on every PR
(the lines only come down). Nothing in `src/` imports the file.

### Reads

On the page, every one a meter that changes nothing:

| What | Where | For whom |
|---|---|---|
| the frame's sample: the time between drawn frames and the game's parts of it | `src/game/renderFrame.js`, `src/debug/perfTracker.js` | every player, in memory |
| `noteMade`: anything a named job held over 4 ms | `src/debug/madeLog.js` | every player |
| a slow message handler, over 5 ms | `src/networking/wsClient.js` `_slowLog` | every player |
| the busy beat: was the page busy, or waiting | `src/debug/busyBeat.js` | `?perf=1` only |
| the strip | `src/debug/perfHud.js` | `?perf=1` only |

### Spends

Every family of the debt list; the frame; and two things with no budget at
all: the listeners `runAfterFrame` runs inside every frame
(`src/ui/afterFrame.js`), and about 100 `setInterval` timers in `src/`, 85 of
them in `src/ui/`, each redrawing on a clock of its own.

### Controls: 24 rationers, none sharing

Each takes its own allowance and none reads another's spend. In one frame
they can add up to tens of ms, and nothing sums them. The ones that slice:

| Rationer | Where | Its allowance |
|---|---|---|
| a monster strip unpacked in play | `src/rendering/zoneTextures.js` `stripTurn` | a quarter of the frame's length, 3 to 50 ms |
| a gear sheet packed in play | `src/rendering/gearSheets.js` `_gearTurn` | 6 ms |
| an object page's ground lines | `src/rendering/wheelObjects.js` `BASES_SLICE_MS` | 3 ms |
| object shadows' reads | `wheelObjects.js` `BOTTOMS_A_FRAME` | 4 a frame |
| the pictures-once sweep | `src/rendering/picsOnce.js` | 4 ms a second |
| the held-numbers sweep | `src/rendering/heldNumbers.js` | 6 ms a sweep |
| the Leaderboards' faces | `src/ui/mobile/dash/BoardRow.jsx` | 6 ms |
| far players' first paints | `src/game/onePic.js` `PAINTS_A_FRAME` | 4 a frame |
| an equip's bakes, then their uploads | `src/rendering/systems/entityRenderer.js` | 5 ms, then 2 ms a frame |
| the second worn set | `entityRenderer.js` `_idleYield` | 2 bakes in an idle moment of 90 ms or more |
| the band's beat | `src/ui/mobile/BottomDashboard.jsx` | a `startTransition` every 200 ms |
| other rooms' pictures | `src/game/buildingRooms.js` | an idle moment |
| the World map's redraw | `src/ui/WorldMapOverlay.jsx` | every 100 ms |
| ground pieces, object pages in flight | `wheelGround.js`, `wheelObjects.js` | 3, 2 |
| reads that wait for the chip | `src/game/framePacer.js` `beforeDraw` | **no limit** on how many |

**SECOND**: "a few ms, then the next frame" is written five times, each with
its own clock and number (3, 5, 6, 6 and 3-to-50 ms). Two of them share one
input (whether the world is in play, and the frame's length: `setStripPlay`,
`src/ui/BroTown.jsx`) and nothing else.

### What runs off the page

| Worker | Started by | Its watch |
|---|---|---|
| `png8Worker.js` | three owners: `stripRead.js`, `wheelObjects.js`, `paletteLoad.js` (**SECOND**: one worker file, three idle rules) | 20 s, then the strip is unpacked on the page |
| `bodyBakeWorker.js` | `bodyBake.js`: 1 or 2, by the processor's threads | 20 s by the wall clock; let go, never started again (step 3.1's first fault) |
| `maskedBakeWorker.js` | `entityRenderer.js` | 6 s, then restarted |
| the ground builder | `src/game/wheelTrial.js` | retried, 2 to 30 s apart |

**SECOND**: a worker's "stuck" watch is written four times with four numbers
and three different ends.

## 2. Lateness

"The frames are late" as a signal: a verdict a controller acts on.

### The line

None of its own. The pacer's rule is the only one: over a quarter of 80 drawn
frames late, twice running, and it draws one refresh in fewer; at most one in
twenty late for 20 s (doubling to 320 s after a failed try) and it tries one
more. Never slower than one frame in 26 ms. The step the game takes in one
frame is at most 50 ms of game: past that it plays in slow motion. Held by
`frame-pacer.test` and `frame-clock.test` on every PR.

v2.3.5222 (card O PR 2, step 2.3): **the pacer judges on every screen whose
refresh it knows** (120, 60, 30), by one rule (`framePacer.js lateOver`: more
than half a refresh past its frame), and the same verdict moves the ladder
(`docs/LANES.md`): two bad verdicts, a rung down; clean for 20 s, a try up;
a failed try doubles the wait. The screen's own rate steps first (a fast
screen's alone, as before); the ladder steps once that rate is at its floor.

### Reads

| What | Its own definition of a late or slow frame | Acts? |
|---|---|---|
| the frame pacer | more than half a refresh late (`lateOver`); v2.3.5222: **on every screen whose refresh it knows** (before, only faster than about 70 a second) | yes |
| the strip | over 1.5 times the middle frame of the last 600 | no |
| `perfTracker` | over 30 ms; a freeze over 100 ms | no |
| the loop's slow-frame log | over 20 ms | no |
| the frame counter | dips (`?dev=1`) | no |

Five definitions, one acting. The report (step 1.1) sends the pacer's alone
(`docs/SHAPES.md` part 4): v2.3.5222, by importing its rule, on every screen.

### Controls

| Controller | Reads | Changes | Where |
|---|---|---|---|
| **the frame pacer** | the animation frame's own timestamps | how many refreshes are drawn | `src/game/framePacer.js` |
| **the governor** (v2.3.5222: the pacer, grown) | the pacer's verdict; the late frames' split from the frame meter's samples (handed in by `perfTracker.js`) | the ladder's rung (`drawLanes.js setRung`): no knob reads it yet (card O's PRs 4 to 13) | `src/game/framePacer.js` `makeGovernor` |
| the steady step | `performance.now()` at the loop's start: **a second clock of the same frame** | the length of the step the game takes: the mean of 10 frames, a frame over 50 ms a break | `src/game/frameClock.js`; the cap `S._dtScale`, `src/ui/BroTown.jsx` |
| the strip slice | the steady step's length | a monster strip's slice: a quarter of the frame | `zoneTextures.js` `stripTurn` |
| about 20 effects | their own `now - last` | each clamps its own step: 50, 100 or 250 ms | the effects' files |

- v2.3.5222: the pacer gives a verdict at 120, 60 and 30 (Low Power Mode's
  30 is judged); **never on the QA box**, whose frames come 400 ms and more
  apart (every gap a break). Its own rate still steps on a fast screen
  alone; the verdict moves the ladder on every one.
- **SECOND**: the frame's time is measured twice in one loop, by two clocks.
- **SECOND**, and the wrong way for a governor: the strip slice GROWS when
  frames are long. Step 2.3 (card O) makes the pacer the one controller.
- Nothing in `src/` lowers a quality, a cap, a crowd or a send rate because
  frames are late. v2.3.5222: the governor moves the ladder's rung, and each
  knob reads it in its own PR (card O's 4 to 13); until then the rung shows
  on the strip, in the report and to QA.
- "Is the world in play" is asked four ways: the pacer's `judge`, the strip's
  `setStripPlay`, the bake's `worldReady()` (`src/ui/loadingGate.js`), and the
  black-screen watchdog's own list (all in or beside `BroTown.jsx`).

## 3. MB

### The line

| Line | MB | Measured by |
|---|---|---|
| `artCache`: art loaded from files | 112 | `window.__btTex()` |
| `gpu`: textures on the graphics chip | 115 | `window.__btGpuTex()` |
| `canvases`: pictures the game draws itself | 56 | the test's own hook |
| `sound`: decoded sound | 22 | the test's hook; the game's twin `BT_AUDIO.decodedMB()` |
| `heap`: the page's objects | 38.5 | the browser's debugger |
| `buffers`: raw data | 22 | the debugger |
| `workers`: the background workers | 36 | the debugger |
| the third trip ends within a few MB of the second | 1 to 4 each | `mp-membudget.mjs` `TRIP_GROWTH` |

In `tools/qa/mp/memory-budget.mjs`, held by `mp-membudget` on every PR whose
paths touch the game. **No line holds the sum.** The ceiling is in the docs
only: iPhone Safari kills the page at about 250 MB (`docs/MEMORY-MAP.md`).

### Reads

Off the page only. **Nothing on the page measures memory, and there is no
"memory is full" signal**: `performance.memory` is used nowhere. A page on an
iPhone can read three of the seven (art, chip, sound); the report would carry
those (`docs/SHAPES.md` part 4).

### Spends

Every slot of `docs/MEMORY-MAP.md`: pictures, characters, sound, code and
tables, the ground builder.

### Controls

**No controller of memory.** What frees memory, each by its own rule:

| Kind | Examples | Where |
|---|---|---|
| by distance and place | a zone's art when you leave; a monster's look 10 s after none is within 3,600 px; ground pieces behind the camera; object pages 4 s out of reach | `zoneTextures.js`, `wheelMonsterArt.js`, `wheelGround.js`, `wheelObjects.js` |
| a count | 900 masked body frames, 64 fishing tops, 24 other players' bakes, 10 dressed strips, 8 drawn shirts, 6 species builds, 12 a trait catalog, 256 palette rows, 24 busts, 48 portraits | `entityRenderer.js`, `effectsRenderer.js`, `gearSheets.js`, `speciesArt.js`, `paletteTex.js` and others |
| bytes | other players' gathering figures 16 MB; sounds not pinned 4 MB; zone music 56 MB | `effectsRenderer.js` `PEER_FIG_BUDGET`; `src/data/sfxCache.js`; `src/data/gameDisplay.js` |
| time unused | 3, 4, 10, 15, 30 s, each cache its own; Pixi's own collector at 60 s | `lookPalette.js`, `lookArmour.js`, `texturePoolTrim.js`, `onePic.js` and others |
| a crowd | 50 other players drawn in full; 24 slots for the rest | `src/game/crowdCap.js`, `onePic.js` |
| the owner, by hand | 14 memory savers, turned off for every phone from the Test panel | `src/game/clientOff.js` `CLIENT_SAVERS` |
| after the fact | a lost graphics context, or a black screen, rebuilds the renderer; neither frees a cache | `src/debug/crashTrap.js`, the watchdog in `BroTown.jsx` |

- No cache knows another's holdings. **SECOND**, by the rule's letter: three
  caches each count bytes against their own line (16, 4 and 56 MB) with no
  sum over them.
- Step 2.3: a full memory frees caches and the crowd, never resizes. That
  needs the count the page lacks (step 1.1's `mem`).

## 4. The loading screen's seconds

### The line

**Blank.** No line exists, and no test fails on a slow load.

**What would measure it**: `src/game/loadTimes.js`, shown in the Test panel's
"Loading times". Its steps: the game started (`app`), the loading screen came
up (`loading`), the pictures were ready (`pictures`), the world began and
finished loading (`arrival`, `arrived`), the loading screen was gone
(`world`). `loadTimes().screen` is `world` less `loading`, in seconds, with
each picture group's own time, slowest first. It is kept nowhere and sent
nowhere. On record (not a line): 27 to 44 s to playable on the QA box,
2026-11-13 (`loadTimes.js` header).

A line needs the field's numbers first: `loadTimes().screen` would ride the
report (step 1.1) as a field of its own, binned as `gaps` is. Card A's to add
to `docs/SHAPES.md` part 4.

### Reads

`loadTimes.js` only. `mp-loadtimes` checks its shape, not its length;
`tools/qa/mp/mp-coldload.mjs` measures bytes, requests and seconds, is not in
`run.mjs`'s table, and always passes.

### Spends

| What | Where |
|---|---|
| the player's own art, then the bakes and uploads in turn | `src/rendering/pixiRenderer.js` `preloadPlayerAssets` |
| 34 groups of the world's animations, then two more | `src/rendering/preloadAnimations.js` `preloadWorldAnimations` |
| a zone's own art, behind its overlay | `preloadAnimations.js` `preloadZoneAssets` |
| the Wheel's way in: the ground round the arrival, the objects, the townsfolk's bakes, the water | `src/game/worldTrial.js` |
| the pinned sounds | `BroTown.jsx` `kickSfxAtGate` |

### Controls

Give-up caps only, each its own; none is a budget:

| Cap | Where |
|---|---|
| at least 3 s of the first clip; the art taken as ready after 20 s; the server's gate never capped | `src/ui/IntroVideo.jsx` |
| the world's gate: 30 s past the server's | `src/game/wheelHome.js` `TRIP_VEIL_MS` |
| a zone's overlay: 15 s; the Wheel's way in while it moves, let go after 8 s quiet, never past 45 s | `src/game/zoneGate.js` |
| inner waits: the footsteps 5 s, the townsfolk's bakes 8 s, the object pages 9 s, the town's art 15 s, the Wheel's size 8 s | `worldTrial.js`, `wheelObjects.js`, `zoneTransitions.js`, `preloadAnimations.js` |

PRELOADING IS LAW (`CLAUDE.md` §7): moving a load off this screen is the
owner's call, so a line here is a line on what the screen waits for, never a
reason to skip a load.

## 5. Rows written

### The line

`server/test/cost-guard.test.mjs`, on every PR: a real room on a storage that
counts every put and delete by key. Its lines, in short:

| Case | Rows |
|---|---|
| standing 100 s; walking 3 minutes | 0 |
| idle logout | at most 2 |
| regenerating, or taking hits, for a minute | one each 10 s, and one more |
| near death | every hit |
| a kill | 1 of `rpg:`; at most 3 in all the first time, 2 after |
| harvesting 6 minutes | `botstat:` once each 5 minutes |
| a new character's join; coming back | at most 6; at most 4 |
| the room's own, 10 minutes | at most 5 |
| 200 taps of one paced thing | at most its burst |
| fish, a death pile, refused taps | their own lines; 0 for a refusal |

**No line holds rows a player-hour or rows a day.** That total exists only in
the printed output of `tools/qa/load/cost-audit.mjs` (a tool that exits 0) and
in documents; "100,000 rows a day" is in comments only. The room never counts
its own puts.

### Reads

The two tools above, on a mock. Nothing in the room.

### Spends

141 places put a row and 75 delete one. One row an event, by design, for
anything of value (handoff rule 10: a value a player sees is saved before its
message goes).

### Controls

| Controller | What it paces | Where |
|---|---|---|
| **`_saveRpg`'s stamp** | the player's record: every way of saving it meets here and stamps when it last went | `server/src/persistence.js` |
| ...the regen's coalescing | at most one save each 10 s for health and pools | `index.js` `REGEN_SAVE_MS`, and the same gate in `_saveRpgPools` (**SECOND**: one gate written twice) |
| ...near death | every hit, at a quarter of health or less | `persistence.js` `HP_URGENT_SAVE_FRAC` |
| ...a player's own taps | 30 at once, then one each 10 s | `server/src/flood.js` `_saveRpgPaced`, `PACE.RPG` |
| a paced lane by player | the trade window's weapon, the bank, the title, the mute, "let me think", a reveal | `flood.js` `PACE`, `_paceTake`, `_paced` |
| each record its own clock | the codex, the fish log and the pets 60 s; the daily rewards 30 s; a skull 30 s; accuracy 5 min; `botstat:` 5 min; a party's "seen" 6 h; the daily snapshot 20 h; the boards 5 and 10 min | `codex.js`, `fishlog.js`, `petbook.js`, `dailyrewards.js`, `nomansland.js`, `accuracy.js`, `botfp.js`, `party.js`, `admin.js`, `index.js` |
| jobs a page at a time | the stamps' prune, the day's economy row | `inbox.js` `_opPruneMaybe`, `liveops.js` `_metricsMaybe`, driven every 3 s by `tick.js` |

- The player's record has ONE owner of its stamp, and it says so. The other
  records each pace themselves, with no sum over them.
- **SECOND**: `botstat:` is written at the fingerprint's pace, and again by the
  signals' re-check when one passes (`server/src/botsig.js`).

## 6. Messages

### The line

| Line | Number | Where |
|---|---|---|
| sockets an address may hold; joins it may open a minute | 16; 20 | `flood.js` `FLOOD.IP_SOCKETS`, `IP_JOINS_PER_MIN` |
| one frame | 16 KB, before it is read | `index.js` `MAX_INBOUND_BYTES` |
| one bundle | 24 messages | `server/src/bundle.js` |
| **a socket's messages** | 300 at once, 120 a second; 600 dropped in 10 s closes it | `flood.js` `FLOOD.MSG_*` |
| relays to others | 8 at once, 4 a second | `index.js` `RELAY_*` |
| chat and emotes | 5 at once, then one each 2 s | `server/src/chatguard.js` `SOCIAL` |
| events out a tick | 500, and 64 KB; the rest wait | `index.js` `EVENTS_PER_TICK_CAP`, `EVENT_BYTES_PER_TICK` |
| one tick message's size | **none** | |

Held by `flood.test`, `quiet-phone.test`, `chat-guard.test` and
`tick-pace.test` on every PR.

### Reads

Nothing counts messages or bytes by type, in or out. A session keeps a few
drop counts (`oversize`, `msgDropped`, `relayDropped`) that nothing reads out.
The phone's QA probes count its own (`window.__btQuiet()`). Step 4.1b's send
door is where counting would live.

### Controls: in

The socket budget is the one controller of the whole. Beside it, a lane by
type, each its own constant in its own file: a hit on a monster (one each
210 ms), specials (3 in 1.2 s), the free swing (100 ms), a bow's or a staff's
claim, a hit on a player (250 and 300 ms), perfect harvests (45 a minute),
cooks (45 a minute), the farm (90 a minute), traps (20), pets (30), the shots
counted (8 a second), the chat lanes (6), the auction house's offers and
messages (3, 5), and the `PACE` lanes. A move is judged by distance (500 px a
second), never by rate.

### Controls: how often the phone sends a move

**Six layers in series, and no one function owns the rate** (**SECOND**, five
times over):

| Layer | Its gap | Reads | Where |
|---|---|---|---|
| the frame loop writes the waiting move | 22 ms, once a drawn frame | the frame | `src/ui/BroTown.jsx` |
| the frame pacer | which refreshes are frames at all | the screen | `src/game/framePacer.js` |
| the batch timer | 33 ms | the wall clock | `src/networking/wsClient.js` `INPUT_BATCH_WINDOW` |
| the position rate | 33 ms, or 66 alone | a player within 2,400 px | `wsClient.js` `moveGapMs`, `src/game/quietPhone.js` |
| the move diet | 66 ms | a steady walk | `wsClient.js`, `src/game/moveDiet.js` |
| the path diet | 200 ms, or at once on a turn | a straight line, within 8 ms of the frame | `moveDiet.js` |

Beside them: the move sent at once before a hit; the standing keepalive (1 s,
then 10 s); bundling into one frame; riders (`pong`, `track`,
`gather_node`); the reconnect, 1 s growing to 10 s **with no jitter**, so
every phone comes back in the same second after a deploy.

### Controls: out

| Controller | Where |
|---|---|
| **the tick's pacer**: its interval, from the measured gap between ticks, 6 to 22 ms (the one controller of the tick's rate) | `server/src/tickpace.js` |
| who is sent what, each its own rule: the near circle (2,400 px), the slim roster (4 s), presence v2 (30 s), steady walkers held (66 ms), a glider (66 ms), events by place (2,800 px), monsters by interest (2,400 px) | `tick.js`, `presence2.js`, `steadymovers.js`, `movepath.js`, `eventplace.js`, `wheelzone.js` |

- **SECOND**: how often a player's moves go out to the others is decided by
  five rules (steady, glide, near, roster, presence).
- 132 places write to a socket, through about 36 helpers of the systems' own:
  no send door (step 4.1b).

## 7. How a player looks to the server

What the honesty checks and the anti-bot signals read: the rhythm and the
counts of what a phone sends. Their thresholds, weights and hour caps are the
hidden settings (`server/src/hidden.js` `HIDDEN_SPEC`: 22 of the
fingerprint's, 2 caps, 32 of the signals'); the numbers in the code are public
placeholders. **This page names them and gives none.**

### The line

The hidden settings. Held by `botfp.test`, `botsig.test`,
`hidden-settings.test`, `hit-proof.test`, `free-swing.test` and
`anticheat.test` on every PR.

### Reads

| Signal | Reads | Acts |
|---|---|---|
| the harvest's fingerprint (`swipeFp`) | the gesture's shape the phone measures | flags; a forged perfect is paid lower |
| strike rhythm | the gaps between harvest strikes | flags (never alone) |
| hour caps | harvests and cooks an hour | withholds the grant |
| `aimed` | the places of the last 12 moves | flags |
| `gesture`, `cook` | the gaps between a start and its strike; between cooks | flags |
| `reflex` | an answer to a monster's wind-up, less `session.rtt` | flags |
| `rooted`, `marathon`, `loop`, `cloud` | hits from one spot; hours with no break; routes walked again; the network | flag |
| hit cadence, hit proof, free swing | the gaps between hit claims; the weapon; reach | drop or prorate |
| the move budget, the roll, the claims, the zone judge, the last place | a move's distance, `dodging`, `blocking`, its zone; a join's place | follow, ignore or refuse |
| the socket budget, idleness, the chat guard | every message; real input; chat | drop, close, clean |

`_testMode(ps)` skips the fingerprint's, the signals', the harvest's, the
cook's, the hits', the moves' and the last place's. It never skips the
socket budget, the zone judge, the move claims, checks between players, or
the chat guard (`server/src/testmode.js`).

### Controls: what on the phone shapes what the signals read

| What the server reads | What shapes it on the phone |
|---|---|
| the places of a player's moves (`aimed`, `rooted`, the budget) | the steady step's length (the frame), and the six send layers of part 6. **SECOND**: two kinds of controller change which places the ring of 12 holds: at a 200 ms path gap it spans about 2.4 s of walking, at 33 ms about 0.4 s |
| when a hit claim arrives (the 210 ms lane, the free swing) | the swing's cooldown on the wall clock, sampled once a frame (a 33 ms grid at 30 a second); the phone's floor 200 ms against the worker's 210 a monster |
| a reaction's time (`reflex`) | the move's send gap AND the pong rider (a pong held up to 1 s, its hold sent with it), which shapes `session.rtt`. **SECOND**: two systems feed one formula; an RTT read too high makes a reaction look quicker |
| idleness | the phone's own logout at 2 minutes and the worker's sweep at 2 minutes. **SECOND**: two timers of the same two minutes; the phone's comment names the worker's as the backstop |
| the gesture's timing (`swipeFp.tv`) | the screen's rate (an iPhone joins pointer moves to its refresh) |

Step 10.6 lists, for each signal, what changes it without cheating. Part 7 of
`docs/SHAPES.md` names that list's members, the disturbances.

## 8. Every second controller, in one list

| # | Shared thing | The controllers | Part |
|---|---|---|---|
| 1 | page ms | 24 rationers, none sharing; "a few ms, then the next frame" written five times | 1 |
| 2 | page ms | hold lines in three files (`held-budget.mjs`, `mp-townride.mjs`, `mp-stripgentle.mjs`) | 1 |
| 3 | page ms | one worker file started by three owners, three idle rules | 1 |
| 4 | page ms | a worker's stuck watch written four times | 1 |
| 5 | lateness | the frame's time measured by two clocks in one loop (the pacer's, the step's) | 2 |
| 6 | lateness | the strip slice reads the frame's length and grows with it | 2 |
| 7 | lateness | "is the world in play" asked four ways | 2 |
| 8 | MB | three byte caps, no sum; about 30 caps, each its own; nothing reads a total | 3 |
| 9 | rows | the regen's 10 s gate written twice | 5 |
| 10 | rows | `botstat:` written by two paces | 5 |
| 11 | messages | the phone's move rate: six layers | 6 |
| 12 | messages | moves out to the others: five rules | 6 |
| 13 | how a player looks | the places of moves: the frame's step and the send layers | 7 |
| 14 | how a player looks | a reaction's time: the send gap and the pong rider | 7 |
| 15 | how a player looks | idleness: two timers | 7 |
| 16 | the loading screen | give-up caps, each its own; no budget | 4 |

Also met, not a controller: `window.__btPace` is defined twice, by the
onboarding (`src/ui/onboardingPace.js`) and by the pacer (`BroTown.jsx`),
and the second overwrites the first.

## 9. What a guard would read

Rule 6's table, for card B's guard. Each system, one row, in a table of code:

| Column | Holds |
|---|---|
| `system` | its files (card B's map) |
| `reads` | the shared things it measures |
| `spends` | the shared things it uses, and how much: ms a frame, MB, rows an hour, messages a second |
| `controls` | the ONE signal it acts on, if any |

The guard fails a signal two rows control, and a sum of `spends` over its
line. Parts 1 to 7 are the rows as they are today; part 8 is what the guard
would fail on its first run. Rule 3 says how such a table lands: a census
whose count of unlisted things may only fall, made strict by the gatekeeper
alone.
