# Five players, a long session (v2.3.3638)

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

RESULTS
