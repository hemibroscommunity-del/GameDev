# Card PH: the phone's truth -- readings and the owner's words (v2.3.6501)

Every number here says where it was measured (finish.md part 5, rule 4).

## The owner's five minutes (finish.md part 9, call 1)

Not answered yet (2026-11-23 23:25 UTC). The owner's words go here as said:
the Speed test's table, `?govern=0` against on when warm, `?groundsend=0`
on the board.

## mp-membudget, three runs on `main` 0aec6482, the test box, 2026-11-23

| line | run 1 | run 2 | run 3 | highest | scatter | line today |
|---|---|---|---|---|---|---|
| artCache | 11.2 | 11.2 | 11.2 | 11.2 | 0 | 79.3 |
| gpu | 77.8 | 73.6 | 75.6 | 77.8 | 4.2 | 109.3 |
| canvases | 13.7 | 13.7 | 12.7 | 13.7 | 1.0 | 54.3 |
| sound | 17.9 | 17.9 | 17.9 | 17.9 | 0 | 22 |
| heap | 38.2 | 39.0 | 38.5 | 39.0 | 0.8 | 40.0 |
| buffers | 24.4 | 24.5 | 24.5 | 24.5 | 0.1 | 24.8 |
| workers | 21.2 | 20.7 | 18.2 | 21.2 | 3.0 | 36 |

Highest readings sum to 206.3 MB; the lines to 365.7. All three runs PASS.
PR 3 (6502): each line = highest + scatter (a lowered line locks a saving
in); a TOTAL line added. The game's own count (art + chip + sound) at its
highest: 106.4 (run 1, trip 3 home again); at a fight 98.4.

## mp-membudget, three more runs with PR 2 (bce0ac59), the test box, 2026-11-24

Run on PR 3's provisional lines (so they FAILED where noted); the game's code is
main's plus PR 2's alarm, which no line reads.

| line | run 4 | run 5 | run 6 | six runs: highest | scatter | PR 3's line |
|---|---|---|---|---|---|---|
| artCache | 11.2 | 11.2 | 11.2 | 11.2 | 0 | 12.2 |
| gpu | 83.8 | 81.0 | 76.4 | 83.8 | 10.2 | 94.0 |
| canvases | 12.7 | 12.7 | 12.7 | 13.7 | 1.0 | 14.7 |
| sound | 18.1 | 18.1 | 18.1 | 18.1 | 0.2 | 19.9 (CI's 18.9 + 1.0) |
| heap | 39.7 | 39.8 | 39.9 | 39.9 | 1.7 | 40.0 (kept) |
| buffers | 24.8 | 24.9 | 24.9 | 24.9 | 0.5 | 24.8 (kept: over in two) |
| workers | 18.6 | 18.5 | 18.1 | 21.2 | 3.1 | 24.3 |
| total | 207.8 | 205.1 | 199.6 | 207.8 | 8.2 | 216.0 (new) |

The total is read only in runs 4 to 6 (READ.total is new). Heap and buffers sit
AT their lines on main's own code on this box: CI's own run decides.

## mp-membudget, PR 3's own CI run (ee22311e, GitHub's runner), 2026-11-24

| line | CI highest | line | room |
|---|---|---|---|
| artCache | 11.2 | 12.2 | 1.0 |
| gpu | 77.3 | 94.0 | 16.7 |
| canvases | 13.7 | 14.7 | 1.0 |
| sound | 18.9 | 19.1 -> 19.9 | 0.2 -> 1.0 |
| heap | 37.2 | 40.0 | 2.8 |
| buffers | 24.3 | 24.8 (kept) | 0.5 |
| workers | 19.4 | 24.3 | 4.9 |
| total | 198.2 | 216.0 | 17.8 |

Sound read 0.8 MB above the box's highest: its line is set from CI's read
(19.9, still under main's 22). Buffers has 0.5 MB of room on CI, but CI's read
plus 1.0 (25.3) is over main's 24.8 and no line rises: kept, the trim owed.

## mp-crowdfight, `main` 0aec6482, the test box, 2026-11-23 (the fight only)

- alone at the Flame Fields: chip 71.1, art 11.2.
- 10 bots: chip 71.6, art 11.6, sound 17.5 -> the game's own total 100.7.
- 30 bots: CANNOT BE READ on the test box. Part 2's helper ran
  `BT_NO_TRACE=1 BT_CF_PLACES=fight BT_CF_STEPS=10,30 node tools/qa/mp/run.mjs crowdfight`
  (1018 s): 10 bots read again as chip 75.7, art 11.7, sound 17.5 (total 104.9),
  heap 40.5; at 30 the page answered nothing for 15 minutes (SKIP, its thread
  waiting on the graphics process).

## The memory alarm's level (PR 2, 6501)

MEM_ALARM = { READ: 106.4, MB: 120 }, ON THE TEST BOX: READ the game's own
highest total (mp-membudget, trip 3 home again; the 10-bot fight 104.9), MB 13%
over it. Decided for the owner while away (call 3 unanswered since 22:33 UTC;
the planning session, 2026-11-23, README tag 5058), behind `?memalarm=0`. The
phone's own count waits on the field report (PR 1). If the owner answers
before it merges, their words win.

## The owner's answers for PR 4 (6503), passed on by the orchestrator, 2026-11-24 (v2.3.6505)

As said, word for word (in the orchestrator's part 5 session):

- The extras, to the advice: "What does draw at 2x mean. Might even be able to go further with that cause the art is
  not great anyway", then "And yea keep going recommended". So, on phones: metal shine off by default, its switch to
  bring it back; water and shadows stay.
- The sharpness, after `?res=1.5` and `?res=1` on the phone: "1.5 looks fine nothing below that". The phone's
  default is 1.5 (this replaces "2x"), never lower, one number in one place, with its switch to the old look. 1.5 is
  below the art's own 2 px a game px: check `[data-res-soft]` is the look at 1.5 and the one the owner saw. The Speed
  test has no 1.5 row: the frames gained are unmeasured until the owner runs it on the new default (finish.md rule 4).
- Low Power Mode during the Speed test: "Low power mode was not on during test". So lane `thirty` (a 30-a-second
  screen) was read wrong on a phone that drew 45: the pacer's or the report's reading of the screen's rate
  (`src/game/framePacer.js`, `drawLanes.js` first). If PR 4's governor leans on it, PR 4 mends it or stops trusting it.

## The owner's Speed test at 1.5, 2026-11-24 05:01 UTC (PR 4, 6503), as passed on by the orchestrator (part 6)

On the owner's iPhone (14 Pro or Pro Max), the card's head: "drawn 645 x 1106 px (lowered to 1.5x) ... lane full".
Frames a second / slowest frame (ms), word for word as the card printed them:

| row | frames/s | slowest ms |
|---|---|---|
| Everything on | 60 | 18 |
| No shadows (and no shine) | 58 | 20 |
| No metal shine | 48 | 24 |
| Metal shine the old way | 46 | 25 |
| Three drawing programs | 52 | 23 |
| Shadows the old way | 45 | 26 |
| Still water | 47 | 24 |
| Lower resolution (2x, not 3x) | 47 | 25 |
| All of those off | 51 | 24 |

The card's foot: "game's own work 3.1 ms a frame ... nothing is holding the frame rate back here."
The owner: "Low power mode was not on during test". The orchestrator's reading: 60 with everything on at 1.5, so the
metal's shine stays on by default (decided for the owner while away).

What the card cannot say (Found, PR 4; the Speed test is `src/game/speedTest.js`, not this card's file): every row that
turns something OFF reads SLOWER than "Everything on", yet the card prints savings computed from them ("saves 14
frames"); the rows are not a measure of what each thing costs (the phone warming as the rows run is the likeliest
reading, untested). It has no row at 1.5 or 1 (the sharpness the owner chose by eye), and at the 1.5 default its
"Lower resolution (2x, not 3x)" row changes nothing.

## mp-skateboard, slowed, the test box, 2026-11-24 (PR 6, 6505)

| run | throttle | test | result |
|---|---|---|---|
| part 4's helper, main b966af81 | 4 | as on main | 9 red: 4 (off null), 5, 5b, 5c, 8, 10 x2, 11 (961 s) |
| this part, the branch | 4 | as on main | 30/30 (690 s): the reds ride the box's load |
| this part, the branch | 6 | as on main | 28/30: 9 and 11 red (770 s) |
| this part, the branch | 6 | mended (the game's clock) | 30/30 (968 s) |

## PR 4 (6503): today's governor in the heat model (govsim.mjs, main's framePacer.js, node, 2026-11-24)

`node tools/dev/plants/govsim.mjs .` on this branch (framePacer.js and drawLanes.js as on main b966af81), 60 minutes,
seed 7. `chg2`: rate changes in the second half hour (10 s windows); `mis`: share of the time the pacer read the
screen's refresh wrong (over 2 ms off).

| screen | hot | tau | real rate share | chg2 | steps down / up | mis |
|---|---|---|---|---|---|---|
| 60 | 1.6 | 180 s | 30: 83%, 40: 13%, 60: 4% | 10 | 14 / 13 | 0% |
| 60 | 1.6 | 600 s | 30: 74%, 40: 11%, 60: 15% | 14 | 16 / 15 | 0% |
| 60 | 2.1 | 180 s | 30: 97%, 60: 2% | 0 | 14 / 13 | 0% |
| 60 | 2.1 | 600 s | 30: 92%, 60: 7% | 0 | 14 / 13 | 0% |
| 60 | 3.2 | 180 s | 30: 99% | 0 | 17 / 16 | 69% |
| 60 | 3.2 | 600 s | 30: 96% | 0 | 13 / 12 | 66% |
| 120 | 2.4 | 180 s | 60: 99%, 120: 1% | 0 | 0 / 0 | 90% |
| 120 | 2.4 | 600 s | 60: 96%, 120: 4% | 0 | 1 / 1 | 68% |
| 120 | 5.4 | 180 s | 40: 91%, 60: 8% | 8 | 1 / 1 | 1% |
| 120 | 5.4 | 600 s | 40: 81%, 60: 18% | 4 | 1 / 1 | 4% |
| 60 (veils) | 3.2 | 180 s | 30: 99% | 0 | 17 / 16 | 69% |

What it says, for the next part: the see-saw is the 60 screen 5% too slow when hot (1.6): 10 to 14 changes in a half
hour, and 60 held 4 to 15% of the time. And `mis`: a hot phone's missed frames are read as a SLOWER SCREEN (a 120
read as 60 for 68 to 90% of the hour at 2.4). That is the owner's lane `thirty` on a phone drawing 45 with Low Power
Mode off (above): the governor leans on the pacer's refresh reading, so it is PR 4's to mend or stop trusting
(`framePacer.js`'s refresh estimate; the lane from `drawLanes.js`).

## PR 4 (6503): the mended governor in the same model (frame-pacer.test §24, node, the test box, 2026-11-24)

The model is govsim.mjs's, now the suite's own (§24).  The mends: a try up only once the game's own work a frame has
fallen 8% (COOL_MARGIN) below the last step down's, for the ladder and a fast screen's own rate (`?govcool=0` today's);
the screen's beat held (a reading two or three times the held one is missed frames; read afresh at a tab's return;
`?beathold=0` today's).  Rate first on the chip axis (today's order).  `chg2` and `mis` as above; `free`: the share at
the higher rate drawing every refresh it can (no pacer, no governor).

| screen | hot | tau | higher rate share (free) | chg2 (today's) | mis (today's) |
|---|---|---|---|---|---|
| 60 | 1.6 | 180 s | 4% (4%) | 0 (10) | 0% (0%) |
| 60 | 1.6 | 600 s | 14% (15%) | 0 (14) | 0% (0%) |
| 60 | 2.1 | 180 s | 2% (2%) | 0 (0) | 0% (0%) |
| 60 | 2.1 | 600 s | 7% (7%) | 0 (0) | 0% (0%) |
| 60 | 3.2 | 180 s | 1% (1%) | 0 (0) | 0% (69%) |
| 60 | 3.2 | 600 s | 3% (3%) | 0 (0) | 0% (66%) |
| 120 | 2.4 | 180 s | 1% (2%) | 0 (0) | 0% (90%) |
| 120 | 2.4 | 600 s | 4% (6%) | 0 (0) | 0% (68%) |
| 120 | 5.4 | 180 s | 0% (1%) | 0 (8) | 0% (1%) |
| 120 | 5.4 | 600 s | 1% (2%) | 0 (4) | 0% (4%) |

A phone that cools (hot for 20 minutes, then cooler): back at the higher rate within seconds of cooling (60: 2.1 to
1.15, the rate given back at 1202 s; today's took 7 tries before it).  A cool 120 at its edge (1.2): 120 for 87% of the
hour (today's 94%), its drops to 60 four in a half hour (today's six), each one the phone's own heat: the margin costs
it 7 points of 120 for fewer, longer stretches.

The margin's size, swept (the census's runs plus the cooling and cool phones): 5% left the 60/1.6 see-saw (11 and 12
changes); 8% ended it everywhere; 12% and 16% held the cool 120 at 120 for only 54% and 18% of the hour.  8% chosen.

## The shine's place on the ladder: the question to ask the owner again (PR 4, 6503; the model's guess, the test box)

Asked by the orchestrator (part 6) and answered (A): rate first, shine second, as today -- the order of the chip's rungs
stays the owner's (card PH: asked again only with the phone's own numbers). The shine stays ON by default (decided for
the owner while away: their yes was to "shine off" at 28 frames a second, before their card at 1.5 drew 60 with
everything on); `?shine=0|1` holds it off or on. The model's two answers, on the 60 phone 5% too slow when hot (§24's
model; the shine's saving there, 14% of the chip's time, is the suite's GUESS, not a phone's number):

- rate first (shipped): a steady 30 most of the hour, 60 held 4% (heat settling in 3 minutes) / 14% (10 minutes),
  0 rate changes in the second half hour, the shine on throughout.
- shine first: the shine dropped at about 3 minutes; the phone then sits at the edge of 60: 60 held 38% / 50% of the
  hour, but uneven (10 s windows alternating 60 and 40) and cycling 60 to 30 every 3 to 5 / 6 to 10 minutes: 30 to 68
  changes in the second half hour. Hotter phones and 120 screens: as rate first, but the shine off all hour.

To ask the owner with the phone's own numbers: a Speed test whose "No metal shine" row is not slower than "Everything
on" (the card at 1.5 cannot say: every OFF row read slower).

## The owner's Speed test at 1.5, as written by PH part 5 (its session's push, 05:46 UTC): the card's words in full

On the owner's iPhone (14 Pro or Pro Max, brotown.net): "Screen 430 x 775 at 3x, drawn 645 x 1106 px (lowered to
1.5x), touch, iOS, looks palette on, lane full". Frames a second / slowest ms: everything on (as you play) 60 / 18;
no shadows (and no shine) 58 / 20; no metal shine 48 / 24; metal shine the old way 46 / 25; three drawing programs
52 / 23; shadows the old way 45 / 26; still water 47 / 24; lower resolution (2x, not 3x) 47 / 25; all of those off
51 / 24. The game's own work 3.1 ms a frame, 62 draws, 1.0 picture switches; "Every frame is ready in time for the
screen (60 a second...): nothing is holding the frame rate back here."

**THIS REPLACES "shine off by default" above.** Decided for the owner while away (the orchestrator, 05:02 and 05:16
UTC; the owner said "keep going throughout the night"), each behind its switch, named in PR 4 under "Decided for the
owner while away": (1) phone sharpness 1.5 by default (the owner's own "1.5 looks fine nothing below that");
(2) metal shine STAYS ON by default (as played it drew 60 with everything on); shine is the ladder's FIRST rung to
drop when a phone falls behind (then the card's next rungs), with a switch to force it either way.
Found, for the Speed test: its rows are not comparable on this card (every "off" row slower than "everything on",
"lane full" here against "lane thirty" before): the phone warming, the screen's rate changing, or a row's own switch
costing a rebuild. A card whose "off" rows are slower should say so in plain words, not print savings computed from them.

(v2.3.6503, part 6: the "FIRST rung" in the paragraph above was WITHDRAWN by the orchestrator, part 6, 05:39 UTC:
 rate first, shine second, as today; the shine stays ON by default; see "The shine's place on the ladder" below.)

## PR 4 (6503): mp-membudget's heap at 1.5, the test box, 2026-11-24 (part 7)

Helpers' runs (the real build, one each): PR 6 alone (db7d930) heap 39.2, all 12 pass; PR 4 (4ef985e) 41.5, FAIL
(line 40); PR 4 with `?govcool=0&beathold=0` 41.0, FAIL; PR 4 with `?phoneres=0` 39.3, all 12 pass. So the 1.5
(PHONE_RES) owns about 2 MB of heap on the test box, not the governor. Buffers 24.8 at their 24.8 line.

The hunt (names kept: `vite build --minify false`, `QA_MB_SNAP=5`, the third fight; one run each, here): 1.5 read
42.3, `?phoneres=0` 40.9. The snapshots differ by 1.32 MB: compiled code +1.00, arrays +0.27, objects +0.12; no
holder or constructor over 0.25 MB, nothing kept twice. In the fight's same window the 1.5 page swung 24 times, the
other 10: a quarter of the pixels draws faster on the box's software renderer, more of the game runs, and more of it
is compiled (docs/specs/heap-trim-2026-11-13.md: compiled code grows as more runs; not trimmable). No line raised.
