# The performance red team's findings (card PRT, tag 6700, 2026-11-26)

The owner, 2026-11-26: *"Pretend you're a red team but mission is performance
enhancements. Go"*. One session on the top model attacked the game the way a
red team attacks a login: five readers, each on one surface (the room's tick,
the wire on the page, the page outside its drawing, the load, what is already
written down), and a profiler on the real game. Every claim a reader made was
then measured before it was believed. This page is what survived, what did
not, and what is left.

**Where it was measured.** The test box (4 processors, Chromium, a software
graphics chip), the unminified build, a phone's page (390 x 844). Its
JavaScript is about a phone's; its drawing is not. **Nothing here was
measured on a phone, on Safari, or on a real graphics chip.** One thing was
measured on the live site (row 9).

**A frame's rate on this box.** At a phone's own pixels (dpr 3) the box draws
2 frames a second, so everything counted "a frame" holds half a second of
play. The numbers below are at dpr 0.5 (11 a second) or dpr 0.2 (30 a
second), named each time (`BT_PF_DPR`, new in `mp-phoneframe`).

## 1. The short of it

- **No hidden disaster.** The frame's own code is a flat profile: no function
  is over 5% of it. The work of October and November holds up under attack.
- **Two things ran on every frame for nothing, and are mended here** (rows 1
  and 2). Small each; they ran for the whole session.
- **The idle page had never been counted.** It is now (`mp-idlecensus`), with
  lines that only fall.
- **What is left is many small cuts and three decisions** (rows 3 to 12).
  The decisions are the owner's: how often the room sends (row 7), what a
  returning player's browser may keep (row 9), and nothing else.
- **Two of the readers' loudest claims were wrong**, and one of mine (part 4).

## 2. The rows, in the order of what a phone would gain

`M` measured here, `C` read in the code and not measured, `P` the project's
own earlier number.

| # | What | Evidence | State |
|---|---|---|---|
| 1 | **Standing at the town's arrival point, the page asked its ground worker "where am I" on every frame, and got an answer on every frame.** The renderer draws you a fraction of a pixel off your real place (v2.3.3469), the arrival point is exactly on a cell's corner, so two askers in one frame named two cells and each threw the other's answer away. | M: 11.4 questions and 11.5 answers a second at 11.6 frames a second, standing; a walk asks 3.7. Two cells asked in turn: 60 questions in 60 frames. After: 0 a second; 1 in 60. | **Mended here** (`game/hereCells.js`, `?herecells=0`) |
| 2 | **The Element Burst button drew itself again on every animation frame for the whole session**, and on a character with no enchanted weapon each draw was of nothing. | M: 1.0 render a frame (11.4 a second at 11.4 frames). After: 0 at rest; every frame only while its 3 s cooldown runs. | **Mended here** (`game/drawOnChange.js`, `?burstidle=0`) |
| 3 | **The band draws itself again 5 times a second whether or not anything on it changed**: 27 components each time (the nine gear cells 43.9 renders a second, the three bars 14.6). | M: 15.1 commits and about 150 component renders a second, standing still. React's own tasks: 6.9 ms a second standing, 12 to 14 fighting (p50 0.7 to 1.4 ms, the longest 11.1). 458 KB a second of garbage made under React's scheduler, standing. `BottomDashboard.jsx:768` (`startTransition(force)` every 200 ms). | Next job 2 (after the new dashboard lands: its file is held) |
| 4 | **Four combat buttons and the top bar do the same**: Ability, Shield, Special and Charge every 200 ms, the zone header every 500. | M: 5.0 renders a second each, 2.0 the header, 1.0 `ChestReveal`. | Next job 2 |
| 5 | **Every `player_state`, and every monster's blow, draws the whole root again** (a new object set every time: `wsClient.js:3383`, `gameEvents.js:3836`). | M: the root 0.67 times a second in a fight unhurt, 1.49 with the blows landing (0.4 of it the test's own refills), about 25 children with it each time. **Each costs about 1 ms** (21 tasks: p50 0.5, p90 2.1, the longest 3.6 ms), not the 5 to 15 two readers guessed. | Next job 3 (small) |
| 6 | **The frame makes 200 KB of garbage standing in town and 520 KB in a fight**; everything else makes 0.5 to 0.9 MB a second. At 60 frames a second that is about 12.5 MB a second in town and 32 in a fight. | M (`BT_PF_ALLOC=1`), KB a second at 11 frames, with callees: the townsfolk's draw 598 (`_drawFolk` 435), shadows 169, the ground's update 128, the objects' update 109, Pixi's own 310, React 458. By who allocated: `wheelGround.js:277` 128, `_updateNPCs` 101, iterators 95, `shadows.js placeDepth` 87, `lookPalette.js:722` 55, `_lookupBodyTop` 45, `formShade.js mix` 43, `folkAt` 39, `emoteFx._updateFollowers` 37. The collector on this box: 0.04 to 0.26 ms a frame. Safari's: not measurable here. | Next job 4 (a file a PR, each measured) |
| 7 | **The room sends each phone a frame on every tick it has anything for it, 45 a second.** | P: every other tick took the room from 79.5% to 61.5% of a processor at 100 players (`load-test.md:96`), never adopted. C: the page copes with fewer (it glides players and monsters between). M: walking alone you are sent your own place 15 times a second (203 bytes each) and the page drops it (`wsClient.js:1014`). | **The owner's** (how a fight feels); then a card of its own |
| 8 | **The phone keeps every monster it has met in the world, and looks each one up by a walk of that list on every tick.** | C: `wsClient.js:1291` (`.find` a monster a tick), up to 1,920 on the long Wheel. M (in node): 30 lookups over 600 held, 0.086 ms a tick. One of the few costs that grows with the session's length. | Next job 5 (a count in `mp-longplay` first) |
| 9 | **The live site keeps every sprite in the browser for 4 hours, and nobody wrote that down.** | M, on brotown.net with `curl -I`, 2026-11-26: `/sprites/trees/wood-cedar.png` answers `cache-control: public, max-age=14400, must-revalidate` (Cloudflare's own default for the domain); `public/_headers` has no rule for it. `/world/objects/manifest.json` answers `max-age=0`. So a player back within 4 hours asks again for no picture; after 4 hours, for every one of about 1,700 files (P: 1,808 requests, 32 MB a first visit). **And a changed picture at an address with no version is not seen for up to 4 hours by a browser that has the old one**, the owner's own phone after a merge included. A preview address has no such rule. | **The owner's** (what a browser may keep); a card of its own |
| 10 | **Small costs inside the frame, by name.** | M, share of the frame's code standing in town: the minimap's update 4.7% (`wheelMinimap.js:779`; in a fight it is the hottest function of the game's own, 3.5% own time); a callback the gear tab runs at the top of every frame 1.8% (`GearTab.jsx:541`); `hasGatherTool` 1.2%, asked a node a frame from two places (`BroTown.jsx:6095`, `effectsRenderer.js:11137`); `BroTown.jsx:7410` 2.1%. | Next job 6 (a PR each where the fix is plain) |
| 11 | **A figure raised over a building that stands in the front layer changes layer twice a frame.** | C only: `depthSort.js` `raiseOverProps` moves it to the front layer, the bucket pass moves it back the next frame; two draw lists rebuilt a frame while it lasts. Not seen in the scenes measured (it needs you behind a building's line and a townsperson beside its other wall). | Next job 7: seen on a page first, then mended |
| 12 | **Six animation-frame loops and thirteen repeating timers are alive standing still** (211 callbacks a second at 11 frames a second). | M: the game's loop; the burst button's look; `XpFlyOverlay.jsx:186` and `QuestCoach.jsx:1236` (each a look a frame); the pacer's; Pixi's events ticker. The 33 ms send timer never stops (`wsClient.js:5823`). | Listed so the count is known; each is small |
| 13 | The room's smaller ones: wandering monsters sent 45 times a second out to 2,400 px; `player_state` as a frame of its own; its diff strings the whole record every time (31 to 129 microseconds for 7 to 40 KB, in node); a pattern run over every frame to count its bytes. | C, with the reader's timings in node. Nothing for one player; a processor's few percent at 100. | With row 7's card |
| 14 | The loading screen's own: 786 of its requests are the head pieces (61 x 5 pictures and a list each); the world's own files start only when the pictures are nearly done; the objects' sheets have a bare address. | C and P (`load-times.md`). Not measured over a phone's network. | With row 9's card |
| 15 | The entry script is 4.4 MB (1.5 zipped): 950 files of the game's own, no one large table (drawing 38%, screens 28%, rules 15%, tables 14%). | M (the build's map). A first visit only: `/assets` is kept for a year. | Not now |

## 3. Checked, and clean

- **Draw lists rebuilt while standing**: 1.83 a frame at 2 frames a second,
  1.0 at 10, 0.25 at 31. They follow the game time a frame holds (townsfolk
  crossing each other's ground lines), about 0.13 ms a frame at 31. The mend
  of v2.3.3449 holds.
- **The socket, standing alone**: 1.5 frames a second in (a 208-byte tick, a
  ping), 0.2 out. The room is quiet when you are.
- **The renderer's start**: no antialiasing, an opaque canvas, a phone's
  1.5x, no depth buffer; nothing in the canvas's CSS slows the browser's
  compositing; no backdrop filter over the play; the looping CSS animations
  seen in play move only transform or opacity.
- **The room**: stops when empty, hibernates, reads and writes no storage
  from a tick or a move, strings the shared part of a tick once.
- **First paint**: fonts come in without blocking; the account check's
  script loads only when the server asks; `/assets` is hashed and kept.
- **The collector on this box**: 0.04 to 0.26 ms a frame.

## 4. Claims that did not survive measurement

- *"Every `player_state` blocks the page 5 to 15 ms"* (two readers' first
  finding): about 1 ms (row 5).
- *"About 1,700 files are asked for again on every repeat visit"*: only
  after 4 hours on the live site (row 9).
- *"Two layers rebuild their draw lists on every frame standing still"*
  (mine, from the first profile): this box's 2 frames a second (part 3).
- *The mends of rows 1 and 2 are a large saving*: at 11 frames a second
  the page's script total is the same within its scatter (71.7 against 70.3
  ms a second, three rounds each, taking turns). At 30 frames a second the
  work outside the frame fell from 16.3 to 14.3 ms a second (three rounds):
  about 2 ms a second, 1.7% of all the page's script. Both ride the frame
  rate, so a 60 Hz phone would save about twice that and a 120 Hz one four
  times, and a second processor is no longer woken on every frame. Honest
  size: small.

## 5. What cannot be seen from here

Safari's own engine and collector; a real graphics chip (the calls a frame
are counted, their cost is not); heat. The owner's phone slowing after 24
minutes (2026-11-10) is still not explained by anything measured on this
box, by this session or any before it.

## 6. The instruments this left behind

- `mp-phoneframe` `BT_PF_ALLOC=1`: who makes the garbage, a frame's and the
  rest apart. `BT_PF_REACT=1`: who draws again, by component. `fightreal`: a
  fight the blows land in (every other scene is played unhurt, so the worker
  never sends its health). `BT_PF_DPR`: a phone's frame rate on this box.
- `mp-idlecensus` and `idle-census.mjs`: what a page standing still does,
  held to lines, with its own break proof in every run
  (`docs/specs/idle-census.md`).
