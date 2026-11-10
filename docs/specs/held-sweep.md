# The whole-game sweep of what holds the page (v2.3.4460)

The owner, 2026-11-10: *"You do a sweep of everything because I keep catching
performance issues piecemeal and I want to make sure the optimizations are
everywhere in the game."*

Four reports in a row had the same shape: the game ran fine, then something
arrived (the townsfolk's bakes, the Blacksmith's fire goblin, a page of
objects, another player) and for a moment it did not. Each was found by the
owner on their iPhone, one at a time. This is the tool that finds them all at
once, the list it found, what was fixed, what is left, and the check that
keeps the list from growing.

## What "holds the page" means

A browser gives a page ONE thread for its script, and the game's frame runs on
it. Anything else that runs there (a picture recoloured on a canvas, a window
redrawn by React, a timer's poll) runs BETWEEN two frames, and while it runs
no frame can start. A frame on a 60 Hz screen is 16.7 ms, on a 120 Hz screen
8.3 ms: a job of 30 ms is two to four frames that are not drawn. That is a
hitch. The frame meter's "outside" number is this time.

Two budgets follow from that (`tools/qa/mp/held-budget.mjs`):

- **12 ms**: the longest any one job may hold the page outside the frame
  while the world is in play;
- **16 ms**: the most of the game's own code one frame may run.

## The tool: `mp-heldsweep`

`tools/qa/mp/mp-heldsweep.mjs` plays a tour of the game on a phone-sized page
with Chrome's CPU profiler on it (the profiler names every function the page
ran, every 0.4 ms):

| station | what it plays |
|---|---|
| `stand` | ten seconds standing in the town |
| `town` | a ride on the board round the town (object pages, townsfolk, the town's monsters' looks) |
| `lands` | a glide to the edge of each of the eight lands (their monsters' looks load as you come) |
| `fight` | a scripted fight: swings, hits taken, kills, loot |
| `windows` | each of the band's windows opened and closed |
| `folk` | a townsperson's dialogue |
| `peer` | a dressed and armoured second player rides up, circles and swings |
| `armour` | the phone's own armour on, a walk, and off |

Every sample is either idle, the browser's own, inside the game's frame (the
loop is on its stack) or outside it. Outside, a run of samples is a **hold**;
inside, a frame's own code is summed. Each is given to a **family** by the
functions on its stack (a body bake, a strip unpacked, the screen check, a
window's redraw named by its component...), with the call path that led to
it, and the families are ranked by their longest hold.

```
NODE_OPTIONS=--max-old-space-size=8192 npx vite build --minify false --outDir dist-prof && mv src/dist-prof dist-prof
QA_DIST=dist-prof node tools/qa/mp/run.mjs heldsweep
BT_HS_STATIONS=peer,armour QA_DIST=dist-prof node tools/qa/mp/run.mjs heldsweep     # some stations only
```

(An unminified build, or every function reads as a letter. About 12 minutes.
The result is also `tools/qa/mp/out/heldsweep.json`.)

**The numbers are this QA box's.** It draws in software at a few frames a
second, so its drawing times mean nothing; but its JavaScript runs at about a
phone's speed (a bake that took 91 ms here took 101 ms on the owner's iPhone
14 Pro Max), and holds are JavaScript. The RANKING is what carries over.

## What the first tour found, and what became of each

Longest single hold, how many times in the tour, and the fix. "Before" is the
first tour (2026-11-10, before any fix of this version); "after" the last.

| what held the page | before | after | what was done |
|---|---|---|---|
| your own greaves going on: all eight sword and bow bodies baked at once | 597 to 608 ms, once | none | fix 4 |
| the black-screen check collecting its picture | 110 to 206 ms, 18 times (the town, the lands, a peer) | 0 to 2 ms with one page open; still 106 to 208 ms on this box while a second player's browser shares its software chip | fix 1 |
| an object page's ground lines read on the page | 29 ms, 64 times | none | fix 2 |
| a colour variant of a monster recoloured pixel by pixel | 24 ms, 4 times | none | fix 5 |
| the band (and the other timers) redrawn by React in one piece | 18 ms, 81 times | 10.7 ms, 45 times | fix 6 |
| the World map redrawn every frame you move | 15.8 ms, 77 times | 15.4 ms, 7 times, only while the map is open | fix 3 |
| "is a loading screen up?" searching the page | 7 ms, in every station | none | fix 7 |
| the Mayor's arrow measuring the page | every frame (32 ms in one) | at most twice a second (10 ms) | fix 7 |
| an armoured player's sword or bow body under greaves, baked for their look on their first swing | not caught by the tour (what it caught there was the next row) | no bake: `mp-standinlegs` counts none on the watcher's page | fix 4 |
| the HEAD an armoured player shows, baked per look | 57 to 140 ms, 4 times | 28 to 164 ms, 4 times as they circle you | debt |
| armour cut to the body on the page, inside a frame | 53 ms, 5 times | 31 to 107 ms, 10 times | debt |
| a gear strip cropped and packed on the page | 72 ms, 2 times | 45 to 59 ms, 2 times | debt |
| the garbage collector | 44 ms, 54 times | 46 ms, 49 times | debt |
| one frame's own code (this box plays a quarter second a frame) | 32 ms, 39 times | 37 ms, 33 times | debt (the box) |
| a window opening (a tap's own redraw, a portrait drawn) | 30 ms, 7 times | 25 to 35 ms | allowed 45 ms at a window |
| the gear tab drawn as one piece | 13.8 ms, 11 times | 19 ms once, 5 to 10 ms otherwise | debt |
| a sound folded to one side on its first play | 23 ms, 4 times | 14 to 21 ms, once | debt |
| a monster strip's texture made (the strip door's page side) | 8.6 ms, 11 times | 5 to 19 ms, 9 times | debt |

The last full tour, judged by `held-budget.mjs`: nothing unlisted is over a
line, and nothing listed is over its own.

## The fixes

### 1. The black-screen check collected its picture after the frame (83 to 206 ms on this box)

The watchdog photographs the canvas at 32 x 18 through the graphics chip and
collects the picture a frame or two later (`BroTown.jsx` `_wdThumbAsk`,
`_wdThumbCollect`). The collect is a call that WAITS: it returns when the chip
has worked through everything it was sent. It ran in an animation frame of
its own, which the browser runs AFTER the game's: the game had just sent its
whole frame, and the collect waited for all of it. Now the collect is a job at
the TOP of the next frame, before anything is sent (`framePacer.js`
`beforeDraw` / `runBeforeDraw`; by itself after 500 ms when no frame comes).

**What that is worth depends on the chip, and this box cannot show it.** A
phone's chip finishes a frame in a few ms, so at the top of the next frame it
has nothing left to do and the collect returns at once; where it ran before,
it waited out that frame's drawing every time. This box's chip is software
and takes most of a frame's time to draw one: here the collect still waits
(83 to 165 ms), at the top of the frame now and not after it, and the first
tours, which did not count a wait inside a frame, read that as "gone". The
tour counts such waits wherever they run now, and the screen check stays on
the debt list with this box's number. On a phone it names itself in the frame
strip ("screen check N ms") if it is ever 4 ms or more: that is the reading
that settles it.

### 2. An object page's ground lines were read on the page (29 ms, 64 times)

Where each column of a building, a fence or a sign meets the ground (its
shadow is cast from there) was read as each page of objects came in: the
page's file decoded a second time as a picture, every frame scaled onto a
canvas and read back. The reader's worker already holds the page as colour
numbers; it now works the lines out there (`artBottoms.js`,
`png8Worker.js`) and they arrive with the page. `?pagebases=0` is the old
way. `mp-pagebases`: on a ride, 45 reads and 231 ms of the page before, none
after.

One reading for every browser: the canvas's reading depended on how each
browser scales a picture, so the same building's shadow started a row or a
column apart on Chrome and Safari. The worker's rule is the same arithmetic
everywhere. Against Chromium's own canvas on the town's pages it differs by
more than a row in 0.56% of columns, all but 4 of 20,661 of them a column on
the edge of a post or wall (`artBottoms.js` has the rules that were tried).

### 3. The World map redrew every frame you moved (16 ms, 77 times)

While open, the map redrew whenever your position changed: every frame of a
walk or a ride. Your marker moves a pixel a frame at most; it now redraws ten
times a second while only you move (`WorldMapOverlay.jsx` `MAP_MOVE_MS`). A
pan, a zoom or a resize still redraws at once.

### 4. A body under greaves was baked on the page for every look (597 ms at once)

The sword's swing and the bow's shot draw "stand-in" bodies. Bare, they have
been drawn from shared colour numbers since v2.3.3757 (a look is a row of
colours, no bake). Under greaves they were the one case left out, "the legs
are cut by their shape": each look's body was recoloured and cut on the page,
eight sheets at once the moment your own greaves went on, and a sheet at a
time the first time each armoured player swung beside you, in the middle of
the fight.

But the cut is the same for every look: the greaves are one steel art for
every metal, and what goes is decided by the art's own trousers, boots and
skin. So the eight whole-body sheets are kept once more, as the game's own
bake leaves them under greaves (`src/rendering/lookSets/standinlegs.js`,
`public/sprites/look/standinlegs/`, made by `tools/art/role-bake.mjs --set
standinlegs`: the game's `recolorBodyToCanvas` with the greaves' own shape,
no pixel unexplained), and a body under greaves is a row of colours like any
other (`effectsRenderer.js` `_standInLook(..., legs)`). `?legslook=0` is the
old bake. Still baked the old way: a body with a drawing on it (stamped per
player), and a look the colour atlas has no row left for.

Costs: 457 KB more behind the loading screen and 1.98 MB more on the graphics
chip for everyone on a device that draws looks from numbers; a greaves
wearer's own eight bakes (about 5.4 MB of full-colour strips) and every
armoured peer's are no longer made. Where looks are not drawn from numbers
(Windows and Mac: look-palette.md, "Not on Windows") nothing changes, and
these bakes still run on the page there: that is on the list below.

`mp-standinlegs` is the oracle (a bro in pink trousers and blue boots under
iron greaves, every sword and bow facing, and a second player watching): 0 px
of trousers or boots below the greaves' top, as with the bake.

### 5. A monster in another colour was recoloured pixel by pixel (23 ms a sheet)

A colour variant (the moss slime, the mire wisp, the blue slime) is the same
art retinted by brightness. Each of its six sheets was unpacked onto a canvas
on the page, read back, rewritten and kept as a full-colour copy. The art is
a 256-colour file like every monster's, so the retint is now done to its
PALETTE: the sheet comes through the strip door as its own numbers, read off
the page's thread, with at most 255 colours changed (`retintPalette.js`,
`zoneTextures.js` `loadTrackedStripRetinted`), and stays one byte a pixel on
the chip instead of four. The rule is the canvas's own, and gives every pixel
of the slime exactly the colour the canvas gave it (`held-sweep.test` 8b).

### 6. The band redrew itself whole, five times a second (4 to 14 ms each)

`BottomDashboard.jsx` redraws the whole band (the gear tab and every column
under it) every 200 ms so it shows the game's live state. Each redraw was one
piece of 4 to 14 ms between two frames, always, for as long as you played.
The beat stays, but as a React **transition**: React draws it in pieces of
5 ms and lets a frame in between them. Not at all in a hidden tab.
`?bandbeat=0` is one piece, as before.

### 7. Two small constant costs

- **"Is a loading screen up?"** (`ui/loadingGate.js`) searched the whole page
  for a loading screen ten times a second, and again for every caller (the
  coach, the arrow, the star, the achievements). It now asks two live lists
  the browser keeps: the same answer, never stale, no search.
- **The Mayor's arrow** (`ui/mayorScreen.js`) measured the canvas after every
  frame, which makes the browser lay the page out in the middle of the
  script. The canvas's place is remembered and measured again on a resize, a
  turn, a change of the canvas, and every half second.

## What is left (the debt list)

`tools/qa/mp/held-budget.mjs` `KNOWN` lists every family still over a general
line, with its line, why, and what fixes it. The tour fails when a listed
family grows past its line or an unlisted one passes the general line. In
rank order:

| family (its key in `KNOWN`) | its line | why it is over | what fixes it |
|---|---|---|---|
| `body-bake` | 220 ms | the head an armoured player shows (`<pose>-<dir>-head`) is recoloured on the page for each look the first time it is drawn | key the head sheets by skin alone (they take no trouser or boot colour), then keep them as numbers like the bodies; the same for a body with an eye style or a drawing (STATE-MACHINES A2) |
| `masked-bake` | 140 ms | armour cut to the body on the page, inside a frame, when a frame is wanted before the worker has it | draw the bare look until the worker answers; prewarm the poses of what was just put on |
| `pack-page` | 80 ms | a gear strip cropped and packed on a canvas the first time its pose is drawn | the strip door for gear strips (256-colour files, packed on the worker) |
| `gc` | 60 ms | the browser's garbage collector | make less garbage a frame (OPTIMIZATION-ROADMAP's pools) |
| `the frame itself` | 70 ms | this box plays a quarter of a second of game in each frame | `mp-phoneframe` is the measure at a phone's rate; here the line stops it growing |
| `screen-check` | 260 ms | only with a second page on this box's one software chip; one page: 0 to 2 ms | nothing here; on a phone the frame strip names it if it is ever 4 ms |
| `strip-made` | 24 ms | the page's part of a strip coming in (its numbers put on its bundle's row, handed to the chip) | number the strip for its row on the worker |
| `ui:*` | 16 ms | one component drawn in one piece (the gear tab is one function of 10 ms) | split the gear tab |
| `other: BT_AUDIO$1._fold > foldToMono` | 30 ms | a two-sided sound folded to one on its first play | fold as it is decoded |
| `other: _flushOutbox > Wrapped.ws.send` | 30 ms | a message handed to the browser, 18 ms once | not understood yet: watch it |

Not on that list because the tour cannot see them:

- **The play column's size is measured live** (`playVw`, `window.innerWidth`
  in the controls' anchors): a measurement makes the browser lay the page
  out mid-script, 5 to 9 ms as a window opens. It was left alone on purpose:
  too many things move the column (a turn, the wide layout, the one-band
  switch) to remember its size safely days before the judges play.
- **Windows and Mac**, where looks are not drawn from numbers
  (look-palette.md): every look's bodies, bare or armoured, are still baked on
  the page there. The fix is the bake on a worker; nothing here measured it.
- **Timers.** Some thirty components redraw themselves on a timer of their
  own (the buttons round the stick, the weapon pill). Each is small; together
  they are the 45 holds of up to 10.7 ms in the table. One beat for all of
  them would halve it.

## The standing check

- `server/test/held-sweep.test.mjs` holds every fix above at its source and
  the pure rules (the ground lines, the palette retint, the frame's job
  queue, the loading gate), and the budget's own shape: the general lines can
  only come down, a listed family says why and what fixes it, a family under
  the general line is not listed.
- `mp-heldsweep` is the measurement. It is not on every PR (it needs its own
  unminified build and about 12 minutes): run it after a change to anything
  that bakes, loads, or redraws on a timer, and before a release. A new job
  that holds the page fails its budget by name.
- `mp-pagebases` holds the ground lines' move.

## What could not be proved here

- **A real phone's times.** The box's JavaScript is about a phone's speed,
  its drawing is not. Whether the pieces of 5 ms (the band's beat) and the
  screen check's new place read as smooth on the owner's iPhone is for the
  owner's eyes; each has its off-ramp to compare.
- **Safari's own costs.** The profiler is Chrome's. A hold that exists only
  in Safari (its canvas, its garbage collector) is not on this list.
- **Windows and Mac**, where looks are still baked per look.
