# The idle census: what the page does when nothing happens (v2.3.6720, card PRT)

The owner, 2026-11-26: *"Pretend you're a red team but mission is performance
enhancements."*

## Why

The game had two kinds of check on its speed. The held sweep
(`docs/specs/held-sweep.md`) names a job that holds the page 12 ms or more.
The memory budget names what is kept. Neither can see work that is small and
never stops: a question to a worker on every frame, a control that draws
itself again 60 times a second, a timer that wakes the page to do nothing.
None of it is ever 12 ms. All of it is paid for the whole session, on the
page's one thread and in a phone's heat.

The census counts that work, on a page that stands still and touches
nothing, and holds it to lines.

## What it counts

`tools/qa/mp/idle-census.mjs` puts three counters on the page before the
game's script runs (each is one branch while a count is off):

- every message to a worker and every answer, by its type;
- every timer and animation-frame callback, by where it was set;
- React's commits, and in each the components that ran. It reads React's own
  DevTools hook, which a production build calls too; a component that ran
  carries React's `PerformedWork` mark, a subtree nobody touched is never
  walked.

The scenario also reads the socket's frames in and out (as the page reads
them, unzipped).

## The scenario

`node tools/qa/mp/run.mjs idlecensus` (the plain build; about two minutes).
One phone page in the world's BroTown, at the arrival point, for 8 s
(`BT_IC_MS`). `QA_DIST=dist-prof` names the components; `BT_IC_TIMERS=1`
prints every timer and frame loop with where it was set.

It draws at dpr 0.5: at a phone's own pixels this box draws 2 frames a
second, and every count "a frame" would hold half a second of play.

### Its lines (`IDLE_LINES`)

| Line | Is | Reads today | Read before |
|---|---|---|---|
| questions to the ground worker, a frame | 0.1 | 0 | 1.0 (one every frame) |
| two cells asked in turn for 60 frames: questions | 4 | 1 | 60 |
| renders of the Element Burst button, a frame | 0.05 | 0 | 1.0 |
| React commits a second, all | 20 | 15.1 to 16.1 | 21.1 to 21.9 |

Lowered as idle work is cut. Never raised without the count and the reason
in the pull request's body (the memory budget's way).

### Its break proof, in every run

A second page plays the game as it was (`?herecells=0&burstidle=0`). The
same counters must see both faults there: the worker asked at nearly every
look at two cells, and the button drawn about once a frame. A census that
cannot see the fault it was written for is blind, and its green means
nothing.

### The button's whole job

On the page as it is, the scenario also takes the dev kit's greatsword,
sets a flame gem the way a player does (through the worker), and holds the
Element Burst button to its whole life under the new way of drawing it:
it comes up (the phone's state changed, no React state: the look saw it),
it is not drawn at rest, a tap casts and stamps the cooldown, it is drawn
every frame while the arc closes, the flash is seen and ends, and it is at
rest again.

## The two mends that came with it

### The last four cells' answers (`src/game/hereCells.js`, `?herecells=0`)

`wheelHere(x, y)` asks the ground worker what is under a place, and kept one
answer: the last cell asked. Since v2.3.3469 the renderer draws your figure
a fraction of a pixel off your real place for the world's passes and puts it
back before the minimap (the camera sits on whole device pixels). So in one
frame the dust and the light ask about one place and the minimap about
another. A cell is 24 game px, and the town's arrival point (87168, 87456)
is exactly a cell's corner: the two places were in two cells, each question
threw the other's answer away, and the page asked the worker again on every
frame, for as long as you stood where every player arrives.

Now the last four answers are kept, by cell. The ground under a cell never
changes while its worker lives, and `wheelStop` clears them with it. A walk
still asks at every new cell, so the worker's own idea of where you are
(its far prefetch) is as fresh as before.

Counted, standing: 11.4 questions and 11.5 answers a second at 11.6 frames a
second, to none.

### Drawn again only on a change (`src/game/drawOnChange.js`, `?burstidle=0`)

A control that shows the game's state has to look at it on a clock and tell
React to draw it again. The Element Burst button looked on every animation
frame and drew on every one. Now each frame it reads what it would draw (a
few reads) into a key, and draws only when the key is new, or while its
cooldown's arc is closing. The flash at the arc's end is in the key.
`drawNow` is one rule for every such control; the band and the four combat
buttons are its next users (card PRT, job 2).

Counted, standing: one render a frame, to none.

### What the two are worth

On the test box, the page's script outside the frame at 30 frames a second
(dpr 0.2), three rounds each, taking turns: 16.3 ms a second before, 14.3
after. About 2 ms a second, 1.7% of all the page's script. At 11 frames a
second the totals are the same within their scatter. Both ride the frame
rate, so a faster screen saves more; and a second processor is no longer
woken on every frame. Not measured on a phone.

## Also in `mp-phoneframe`

- `BT_PF_ALLOC=1`: who makes the garbage. The browser's allocation sampler
  in a window of its own, the frame's garbage by the frame (it grows with
  the rate) and everything else by the second.
- `BT_PF_REACT=1`: who draws again, by component, in a window of its own.
- `BT_PF_SCENES=fightreal`: a fight the blows land in. Every other scene is
  played unhurt, so the worker never sends its health there.
- `BT_PF_DPR=0.5` or `0.2`: a phone's frame rate on this box.

## Tests

`tools/guards/here-cells.test.mjs` (the store; the loop played with one
answer and with four; a walk; an answer only for its own cell) and
`tools/guards/draw-on-change.test.mjs` (the rule; an hour of looks at a
hidden button; a cast played through its cooldown and flash). Each lists the
plants tried against it.
