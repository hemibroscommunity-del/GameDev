# Five players, a long session (v2.3.3661)

The owner, 2026-10-27: "simulate about 5 players doing the main quest lines,
mining, fishing, combat, trading, partying, no mans land combat,
buying/selling, dungeon, waking around different zones, farming, to check for
memory leaks in long form play sessions. Want to make sure everything works.
Also note anything that might be worth bringing to my attention".

## The tools

- **`mp-longplay`** (`node tools/qa/mp/run.mjs longplay`): five real game
  pages against one real worker, in the world, for `BT_LONGPLAY_MS` (40
  minutes by default). Each page has a part:

  | Who | Screen | What they do |
  |-----|--------|--------------|
  | Questy | phone | the tour's quest line, giver to giver (the Mayor, Blacksmith Bro, Diego), started over at its end |
  | Gathry | computer | mining, fishing and chopping (E held), then selling to Diego |
  | Fighty | phone | fights in a land with the real attack disc, kills through the worker's kill path, loot picked up; the Goo Grotto with Tradey in his party |
  | Tradey | computer | Fighty's party, a trade with Farmy, a No man's land fight with Farmy, buying and selling at Diego's |
  | Farmy | phone | the farm (seeds bought, beds dug, planted, watered, harvested, out by the gate), and walks across the lands |

  The play goes in rounds. First everyone's solo part runs at once. Then come
  the parts that take two players: the party once, then the dungeon, the trade
  and No man's land in turn. Then every page is measured:
  - what the memory budget reads (art from files, textures on the graphics
    chip, the game's own canvases, decoded sound, the JS heap after two forced
    collections, buffers);
  - live timers, intervals, event listeners and Web Audio nodes;
  - the page's DOM nodes;
  - every array and map on the game state, and the scene graph.

  The worker is read too: the room's overview and the worker process's
  memory.

  The report (`tools/qa/mp/out/longplay.md`) gives every line's reading after
  the first round (the warm-up) against the last, and its slope per hour of
  play. It also lists every activity's tries and failures, with the reason.
- **`mp-heapdiff`** (`node tools/qa/mp/run.mjs heapdiff`) makes the memory
  check's trip (BroTown, a Flame Fields fight, home) over and over. It takes a
  full heap snapshot after two of the trips and compares the two, object type
  by object type, with what holds the new objects. `BT_HD_IDLE=<seconds>`
  makes each "trip" that long standing still in BroTown instead, to tell what
  grows with time alone from what grows with play.

## What the first 40 minutes found (2026-10-27)

Nine rounds, 41 minutes, five pages, one worker. Nothing crashed: **no page
error on any of the five pages**. Every part worked except two, and both
turned out to be the test's fault (below).

| Who | What they did |
|-----|---------------|
| Gathry | mined, fished and chopped 9 of 9 times, sold 9 of 9 |
| Fighty | fought 9 of 9, made the party, cleared the Goo Grotto 3 of 3 |
| Tradey | bought and sold 9 of 9, traded 3 of 3; the No man's land fight 0 of 3 |
| Farmy | the farm 5 of 5; walked the lands 3 of 4 (one walk past its 4-minute limit) |
| Questy | the quest line 1 of 9 |

### Memory

| Page | JS heap, round by round (MB, after a forced collection) |
|------|----------------------------------------------------------|
| Questy | 31.3 31.7 33.4 35.0 33.9 35.1 35.4 35.6 36.5 |
| Gathry | 33.9 34.9 36.4 37.6 37.4 38.3 38.8 39.0 39.6 |
| Fighty | 35.5 37.2 38.2 39.2 39.2 40.7 41.8 41.8 41.7 |
| Tradey | 35.1 36.7 39.1 39.8 40.1 42.8 41.4 41.6 43.3 |
| Farmy | 33.4 36.9 38.8 39.1 37.7 42.7 40.1 42.7 43.2 |

- **Textures on the graphics chip, the game's own canvases, art from files,
  decoded sound and buffers held steady** on every page. They go up and down
  with what is on screen (a fight, a land's monsters), and do not climb.
- **The JS heap rose 8 to 13 MB an hour** on every page, rising fastest early
  and slower by the end. Standing still in BroTown it does not rise
  (`mp-heapdiff` with `BT_HD_IDLE=120`: 30.5, 31.3, 31.4, 31.8, 31.6, 32.1 MB
  over twelve minutes). What grows in those minutes is the browser's own
  compiled code and Pixi's text-measuring cache, which keeps its last 1,000
  measurements and no more. So the rise comes from PLAYING, not from time
  passing.
- **Event listeners did not leak.** The soak first counted listeners as adds
  minus removes, and the farmer's page read +100 every farm visit. A
  listener added to something that is later freed (an image loaded once, a
  sound played) goes with it, and that count could not tell.
  `mp-listeners` records where each listener was added and drops it when the
  thing it was added to is collected: the farmer's page held 608, 608, 609
  and 609 listeners after four farm visits. The soak now counts the same way.
- **The worker process** grew from 338 to 466 MB. That is the whole local
  runtime (wrangler's `workerd`), not the room's own memory, which this soak
  does not read.

### The two failures were the test's

- **The No man's land fight** never opened its "Attack?" window. Two players
  may fight in No man's land N only when their levels are N apart or closer,
  and the fight was in the first ring. By then Tradey had cleared the Goo
  Grotto with Fighty (its XP goes into the weapon used) while Farmy had only
  farmed. The window rightly stayed shut. The soak now puts both on the same
  level first.
- **Questy's quest line** stopped at its first step: the check for the offer's
  Accept button gave up while the worker had in fact taken the quest, and
  every later step waited on it. The soak now asks the worker before it calls
  a step failed.

## The second run, with the test's faults fixed (2026-10-27)

Six rounds, 32 minutes, on a build of main that includes the text-label fix
(#1133). Again **no page error on any of the five pages**.

| Who | What they did |
|-----|---------------|
| Questy | the quest line 6 of 6 (1 of 9 in the first run) |
| Gathry | mined, fished and chopped 6 of 6 times each, sold 6 of 6 |
| Fighty | fought 6 of 6, made the party, cleared the Goo Grotto 2 of 2 |
| Tradey | bought and sold 6 of 6, traded 2 of 2; the No man's land fight 1 of 2 |
| Farmy | the farm 3 of 3; walked the lands 2 of 3 (one walk past its 4-minute limit) |

| Page | JS heap, round by round (MB, after a forced collection) | per hour after the warm-up |
|------|----------------------------------------------------------|---|
| Questy | 31.6 33.3 34.1 35.8 35.4 35.8 | +7.9 |
| Gathry | 34.4 35.8 36.3 37.5 36.8 38.4 | +7.2 |
| Fighty | 35.4 36.7 38.6 40.2 39.8 39.9 | +9.3 |
| Tradey | 34.9 36.3 38.9 38.9 38.9 41.8 | +13.2 |
| Farmy | 33.8 37.2 39.1 39.7 38.9 43.0 | +14.0 |

- **The same picture as the first run.** Textures, the game's canvases, art from
  files, decoded sound and buffers rise and fall with what is on screen and do
  not climb. Event listeners step up the first time a system is used (Farmy's
  first farm visit, +22) and then hold. The JS heap rises 7 to 14 MB an hour of
  play, fastest on the two who walked the lands.
- **Part of that rise is by design.** A phone keeps every monster it has come
  near on this visit, so its monster list grows as it walks: Farmy's 140 to
  183, Tradey's 43 to 100. That stops at the world's 1,920, and their sprites
  are pooled. The other lists on the game state that grew were small and capped
  (the last ball each monster threw: at most 48).
- **The No man's land fight's one miss was the test's.** The second time,
  Tradey's tap on Farmy opened no "Attack?" window, with both at level 6 in the
  first ring and in sight of each other. The two had fought in the first fight,
  and a tap on a player you already chose to fight attacks with no second window
  (`nmlAsk.js`). The soak now asks the game whether the two are still foes
  (`__btNmlAsk.about`) and, if so, goes straight to the swings: the test is
  whether a blow lands.
- **Audio nodes** read 7 to 23 a page and rose slowly. That count was made minus
  disconnected, and a finished sound is collected without being disconnected,
  so it could only climb. The soak and `mp-heapdiff` now count a node until the
  browser collects it.

## The audio count, and what the heap holds (`mp-heapdiff`, 2026-10-27)

One phone fought at the Flame Fields six times, home to BroTown between
fights, counting audio nodes until the browser collects them. It used a build
of main from 14:55 that day (this branch changes no game code).

| Trip | Swings | Heap at the fight (MB) | Heap home (MB) | Audio nodes alive / made |
|---|---|---|---|---|
| 1 | 28 | 30.39 | 30.46 | 9 / 117 |
| 2 | 25 | 32.21 | 31.86 | 9 / 219 |
| 3 | 21 | 32.96 | 31.90 | 9 / 325 |
| 4 | 22 | 33.50 | 32.51 | 15 / 441 |
| 5 | 27 | 33.69 | 33.20 | 9 / 553 |
| 6 | 28 | 34.32 | 33.62 | 9 / 647 |

- **No audio leak.** 647 nodes were made over six fights, and 9 to 15 are alive
  at any time: every finished sound is collected. The climb the first run
  showed was the old count's mistake.
- **The heap home again grows about 0.4 MB a fight** (1.76 MB from trip 2 to
  6). Between the snapshots after trips 2 and 5, 1.75 MB more:
  - **0.69 MB is compiled code** (`(code)`, 1,704 more). That is the engine
    compiling more of the game as more of it runs. It levels off.
  - **0.65 MB is the storage of arrays** (`(object elements)`, 837 more), with
    small numbers and plain objects beside it (8,857 numbers, 2,001 objects).
    Something keeps adding to a list. What, the snapshot does not say by type
    alone (the build's names are minified). Finding it means a snapshot of a
    build with names, followed from the arrays to what holds them: next on
    the list, not done here.
  - The browser's own performance entries (script, event and long-frame
    timings) are a few tens of KB of it.
- This is the same creep as the soak's 7 to 14 MB an hour, at the rate one
  fight a minute or so gives. It is why the memory check's heap line, set at 33
  MB, is now read on either side of it by main's own code (#1141 raises it to
  34, and says why).
