# The whole-game sweep of what holds the page (v2.3.4470)

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
family grows past its line or an unlisted one passes the general line.

**Whose it is (v2.3.5041).** Each row also says whose it is to bring down
(`whose`): **ours** (the game's own work on the page), **the box's** (this QA
box's software graphics chip, and the quarter second of game it plays in one
frame: a phone has neither) or **the browser's** (its garbage collector: the
game can only give it less to do). The grand plan's step 3.1 is done when no
row is ours (`held-budget.mjs` `debtOf('ours')`, the count its scoreboard
reads). Today (v2.3.5049): one ours (`pack-page`, card P's to bring down: card H's part of step 3.1 is done), two the box's, one the browser's. A new family is
ours until a measurement says otherwise: `held-sweep.test` 7b3 holds the
box's and the browser's to the three below, and 7b4 holds this table to
`KNOWN`, row for row. Their break proofs (the grand plan's rule 8), each run
by hand: `whose` taken off `strip-made` turns 7b2, 7b3 and 7b4 red;
`pack-page` called the box's, in the list and this table both, turns 7b3
red; the `sweepPicsOnce` row taken out of this table turns 7b4 red.

All of them (the first five by their old rank, then the rest; a family off the list is struck through):

| family (its key in `KNOWN`) | whose | its line | why it is over | what fixes it |
|---|---|---|---|---|
| ~~`body-bake`~~ | | off the list (v2.3.5049; was 13 ms, 12 at the crowd's armour and ink stations; 220 before v2.3.4960) | a body or head sheet recoloured on the page for one look; on the body bake's worker in play since v2.3.4930 (`docs/specs/body-bake-worker.md`), h-eight's last page bakes gone with v2.3.5013 | **v2.3.5049**: none in the sample (below, "Card H") |
| ~~`gear-sheet`~~ | | off the list (v2.3.5042; was 195 ms, 12 at the crowd's d-prints) | a drawn shirt composed on the page for each pose (the crowd tour); on the body bake's worker in play since v2.3.5014 (`docs/specs/body-bake-worker.md`, "A drawn shirt") | **v2.3.5042**: what was left was the Equipment screen's figure (below, "Card H") |
| ~~`portrait`~~ | | off the list (v2.3.5042; was 40 ms) | the Leaderboards' faces are 11 ms since v2.3.4960 (g-boards, was 149); what was left, the Equipment screen's figure drawn as armour goes on, 10 to 29 ms (armour) | **v2.3.5042**: drawn a step at a time in play, the body kept (below, "Card H") |
| ~~`masked-bake`~~ | | off the list (v2.3.5043; was 24 ms) | the page cut each input out of its sheet for the bake's worker (`_frameInput`, `createImageBitmap`): 4 to 15 ms a bake | **v2.3.5043**: a frame of an image goes as its address, the worker reads the sheet (below, "Card H") |
| `pack-page` | ours | 20 ms (v2.3.4873; was 80) | a gear sheet first drawn in play, now packed a few ms at a time (`gearSheets.js` `_gearPack`; was one go, 21 to 59 ms): one cell's read and the hand-off, 9 to 15 ms | the strip door for gear strips (256-colour files, packed on the worker) |
| `gc` | the browser's | 60 ms | the browser's garbage collector | make less garbage a frame (OPTIMIZATION-ROADMAP's pools) |
| `the frame itself` | the box's | 70 ms | this box plays a quarter of a second of game in each frame | `mp-phoneframe` is the measure at a phone's rate; here the line stops it growing |
| `screen-check` | the box's | 260 ms | only with a second page on this box's one software chip; one page: 0 to 2 ms | nothing here; on a phone the frame strip names it if it is ever 4 ms |
| ~~`strip-made`~~ | | off the list (v2.3.5044; was 24 ms) | the page put a monster strip's numbers on its bundle's row of colours, a loop over every byte (`picsNumbers.js` `stripAsNumbers`) | **v2.3.5044**: numbered for its row on the reader's worker (below, "Card H") |
| ~~`ui:*`~~ | | off the list (v2.3.5047; was 16 ms) | one component drawn in one piece (the gear tab is one function of 10 ms) | **v2.3.5047**: each equipment cell a component, the number formatter readied at load (below, "Card H") |
| ~~`other: BT_AUDIO$1._fold > foldToMono`~~ | | off the list (v2.3.5045; was 20 ms) | a two-sided sound folded to one on its first play, in one piece | **v2.3.5045**: a stretch at a time, a frame between (below, "Card H") |
| ~~`other: R > J`~~ | | off the list (v2.3.5046; was 20 ms) | React re-rendering the game's root in one piece on every equip (`gearWornSync.js`) | **v2.3.5046**: only when a worn flag changes, and as a transition (below, "Card H") |
| ~~`other: wrapped > sweepPicsOnce`~~ | | off the list (v2.3.5048; was 16 ms) | `picsOnce.js`'s sweep of the cache's pictures, up to 15 ms with the crowd's pictures in it | **v2.3.5048**: a slice a turn (below, "Card H") |
| ~~`other: _flushOutbox > Wrapped.ws.send`~~ | | off the list (v2.3.4960) | 4.7 ms at most in the 2026-11-12 tours (was 18 once); `other: createObjectURL` came off too (9.3 at most) | |

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

## Card H: the debt list, ours first (the grand plan's step 3.1)

The grand plan (`docs/GRAND-PLAN.md` pillar 3, card `docs/plan/cards/H.md`)
takes the families that are ours off the list, one a PR, largest line first.
Each is proven by a sample, as the owner's rule asks (CLAUDE.md §6): the
stations that measure the family, three runs, not both whole tours.

### `gear-sheet` and `portrait` off the list (v2.3.5042)

**What the sample found first.** The crowd tour's `b-fish`, `c-armour1`,
`c-armour8`, `h-eight` and `d-prints`, four runs: no `gear-sheet` hold at all
(the drawn shirts are dressed on the body bake's worker since v2.3.5014).
The main tour's `peer` and `armour`, three runs: one `gear-sheet` hold of
24.9 ms, `portrait` 10.3 to 17.9 ms, and a `body-bake` hold of 28.8 ms (over
its 13 ms line), all at `armour`, and all ONE thing: the Equipment screen's
figure (`characterPortrait.js` `drawCharacterPortrait`, drawn by
`CharacterView`) drawn again as armour goes on and off. It drew in one piece
once its pictures were in: the body recoloured, the shirt, each armour layer,
the weapon, the hair and the hat. The sweep names a hold by the first family
whose function is on its stack, so the figure's hold read as `gear-sheet`
(`> composeShirt`), `body-bake` (`> recolorBodyToCanvas`) or `portrait`,
by which step was most of it. (Moving `portrait` up the families' order would
have read better and fixed nothing: a number met by renaming is not met.)

**What it does now** (`characterPortrait.js`; `?portraitgentle=0` is one go,
as before, for one tab):

- **In play, a frame is let in after every step** that took 1 ms or more
  (the gear pack's way: a frame, then a task; a timer of 120 ms if no frame
  comes), so a piece is one step. "In play" is the signal the gear and the
  monsters' strips are packed by (`gearSheets.js` `playFrameMs`, from
  BroTown's `setStripPlay`): not behind a loading screen, not before the
  world is up, not in a hidden tab. On the login screen and in the creator it
  draws in one go as before: the creator turns the figure on every move of a
  finger, and a draw of three frames would be replaced before it finished.
  A draw a newer one replaced meanwhile stops at its next step.
- **The recoloured body is kept** for its look and facing (four at most,
  256 x 256 each, 1 MB, none on the graphics chip): armour on or off never
  changes it. It was the largest step: without it, the body alone was a
  15 ms piece on the loaded page (three runs, the control). Each kept body is
  witnessed at one solid pixel (`canvasWitness.js`, TRAPS §250) and that
  pixel is read again before the body is used: Safari empties a parked tab's
  canvases without a word, and a body read empty is recoloured anew.

**The same picture** (`window.__btPortraitCompare(opts, a, b)`, five figures:
plain, armour at 3x, armour and a sword and shield, a hat and a drawn shirt
mirrored at 2x, north):

- drawn twice the same way, and with the kept body against one recoloured
  anew: the same, byte for byte;
- in pieces against in one go: 1 to 73 edge pixels of a figure (of 589,824 at
  3x) differ by one step of 255 (up to 6 on a nearly see-through pixel, read
  back divided by its small alpha). Chrome rasterises draws onto a canvas it
  flushed between two tasks a hair differently from draws it replays in one
  go. A frame let in at only the last step changes nothing; earlier, more
  pixels: it is the browser's, not the game's steps. Invisible;
- the kept bodies emptied as Safari empties them
  (`window.__btPortraitEmptyKept()`): the next draw notices, recolours anew,
  and is the fresh figure byte for byte. Break proof: with that pixel's
  re-read always "still there", the figure comes back with 17,621 pixels of
  its body missing.

**After**, the main tour's `peer` and `armour`, three runs: the figure's
holds the longest 7.9, 12.5 and 8.1 ms (the 12.5 with 3 ms of another job,
`prog3CharLevel`, in the same hold: one hold just past the general line is
the judge's noise); no `gear-sheet` hold, and none of `body-bake` from
the figure. On an iPhone the Equipment screen draws at 3x (nine times this
box's pixels): the pieces are smaller there than one go was, by the same
ratio.

**Not run** (offered to the owner): the whole main tour and the whole crowd
tour (about 30 minutes); Safari; Windows and Mac. Seen on the way and not this
PR's: `pack-page` at `armour` 17 to 35 ms against its 20 ms line (waits for
card P's asset door); one `masked-bake` hold of 32.7 ms at `armour` (its own
PR is next).

**The shirt and the armour, after (v2.3.5051; card H's second follow-up).**
`gear-sheet` came back once, 22.4 ms at `armour` (#1733's sample), and the
whole main tour showed `portrait` 22.6 ms in `_drawGearLayer`: the figure
shows each strip's FIRST frame only, but the shirt's whole strip was
upscaled and composed (`composeShirt`: read back, tinted, patterned and
stamped, every frame of it), and each armour piece's whole strip upscaled
into a canvas. Now the first frame alone is cut, at the same
nearest-neighbour scale (`characterPortrait.js` `_firstFrame`; the
designer's grids, `?portraitframe=0` and QA's `'whole'` take the whole strip,
as before). The same pixels: `__btPortraitCompare(opts, 'whole', 'flat')`,
six facings by a plain shirt, stripes, a check, a drawing and a drawing over
stripes, the six facings by four armour sets, and a figure under armour at
3x: 55 of 55 byte for byte, the control too. The fabric's lit mask falls
back to the whole region when too little of it is lit, which it now judges
on one frame rather than the strip: the 55 say no figure changed. The sample
of the shirt alone (`peer`, `armour` x3): `portrait` 5.3, 4.7 and 6.9 ms the
longest (`composeShirt` 1 ms of the 6.9), no `gear-sheet` hold;
`mp-geartab` 122 of 122.

### `masked-bake` off the list (v2.3.5043)

**What was left.** Since v2.3.4870 the masked bake (armour cut to the body)
runs on its worker in play; the page's part was handing it the inputs. For
each bake the page cut the body, the belt and each worn piece out of their
sheets (`entityRenderer.js` `_frameInput`: `createImageBitmap(res, x, y, w, h)`),
back to back: 4 to 15 ms a bake as another player's armour came on screen
(the crowd tour's `c-armour1` 11.7 ms, `c-armour8` 12.9, `d-prints` 12.7,
`h-eight` 10.1, four runs; the main tour's `armour` 32.7 ms once, with 15 ms
of it the cuts). Every such sheet a probe met (an armoured player walking
round you, four sets) was an image of a packed sheet at a `blob:` address
(`gearSheets.js` `keepPackedAsImage`).

**What it does now.** A frame of a sheet that is an image goes as its
address and its rectangle (`{ url, sx, sy, ... }`); the worker fetches and
decodes the sheet itself, keeps four at most (4 MB, on the worker, the least
lately used closed when no job holds it: `maskedBakeWorker.js` `sheetOf`, a
read cut after 4 s, on the picture door's list), and draws the rectangle where
it drew the cut frame. After the gatekeeper's review (sitting 2): every way out
of a job lets its sheets go and closes its bitmaps (`jobDone`; the "gear
numbers not here" return had left them pinned past the cap), the keep went
from six and 8 MB to four and 4 MB, the worker says what it holds in each
reply (`__btBakeWorker().byUrl.keptMB`, `keptMaxMB`: 0.9 MB at most over the
four sets below), and the slot is in `docs/MEMORY-MAP.md` ("Characters"):
`mp-membudget` cannot see a worker's bitmaps. Every draw of an input in the
bake has smoothing off, so the texels are the cut's. A canvas, or an address
the worker cannot read (it answers `urlFail`: the page cuts that one, once,
and never sends that address again), goes as before. `?bakeurl=0`: every
input cut on the page, as before.

After the gatekeeper's sitting 4 (`docs/plan/census/review-z4.md`): the
worker STARTS every sheet's read of a job before it waits for any (they were
read one after another, each with its own 4 s, so three sheets that would not
come could sit 12 s, past the page's 6 s stuck watch); an address the worker
was still reading when it was let go as stuck is refused (the worker says
`urlsRead` once a job's sheets are in; only what is still being read is
refused, because on this box the worker is let go as stuck about 3 times a
minute past its reads); and its kept sheets are let go 15 s after its last
job (the page frees its packed sheets and revokes their addresses with no word
to the worker). The page's side moved out of `entityRenderer.js` into
`src/rendering/bakeByAddress.js`, to keep that file under its line
(`tools/guards/four-lines`). The same probe after: 16 sent, 11 of 11 the
same, none refused, no stuck kill.

After the gatekeeper's sitting 5 (`docs/plan/census/review-z5.md`, v2.3.5050):

- a job whose worker was let go as stuck during the page's own wait (its
  inputs cut or addressed) is not posted to that dead worker: it fails and
  is asked again; and the stuck clock starts when a job is POSTED (the retry
  after `urlFail` too), so the next worker is not let go at once on an old
  clock;
- the worker says each address as it is read (`urlRead`), so a stuck kill
  refuses only what was still being read, not a whole job's;
- the 4 s covers the decode as well as the fetch (a decode that ends later
  has its bitmap closed), and a job's sheets start reading as it arrives,
  beside the wait for its sheets of numbers;
- `_runBake` asks again, as `_runLookBake` did, when a piece is not readable
  (it baked the set without it and kept that under the whole set's key);
- the refused list lets its oldest go when full (1024), and only `blob:`
  addresses go to the worker (a file's address can change under a deploy).

The probe after (copper plate and greaves, steel plate, iron plate with steel
greaves): 24 sent, 19 of 19 the same, none refused, none cut, no stuck kill.

**Why `masked-bake` grew back** (card A's full tour: 23.7 ms twice at
`peer`; asked by the planning session). Not at `peer` or `armour` alone (17
runs here, 7.1 ms the most): in the WHOLE main tour, where this box keeps
the worker busy past the 6 s stuck watch at `armour`. On `main` (two whole
tours, `__btBakeWorker().byUrl` after each station): at `armour`, 2 stuck
kills, 2 addresses refused, 1 input cut on the page, and `masked-bake` 18.6
ms (10 of it `createImageBitmap`: the page's own cut of a refused address)
and 28.3 ms (the worker's reply drawn, and 11 ms of the garbage collector).
Each stuck kill refused addresses that had READ (a whole job's word, and the
early reads' word came only after the wait for the sheet of numbers), and
from then on those frames were cut on the page. With this PR (and its early
reads saying `urlRead` as each is in): two whole tours, `masked-bake` none
and 4.6 ms; at `armour` 1 stuck kill, 1 address refused, none cut.

**The same pixels.** `window.__btBakeUrlCheck = true` before the page loads:
the page cuts each input as well, and the worker compares its own rectangle
with the page's cut, byte for byte (`__btBakeWorker().byUrl`). An armoured
player in copper plate and greaves, steel plate alone, steel greaves alone,
and iron plate with steel greaves walking round you: 33 of 33 inputs the
same, 38 sent by address, none cut on the page, none refused (after the
review's fix: 31 of 31, 34 sent).

**After**, the sample (the main tour's `peer` and `armour` x3; the crowd's
`c-armour1`, `c-armour8`, `h-eight`, `d-prints` x3): `masked-bake` 7.7 ms the
longest, 5 holds in six runs.

**Not run** (offered): the whole tours; Safari, where a worker's `fetch` of
the page's `blob:` address is expected to work but is unproven here (if it
fails, each address is cut on the page once and then always, as before).
Seen and not this PR's: the bake worker is let go as stuck 3 times in the
probe's 2-player minute, the same with `?bakeurl=0` (a job past
`_BAKE_STUCK_MS`, 6 s, on this box).

### `strip-made` off the list (v2.3.5044)

**What was left.** A monster's strip is read off the page's thread since
v2.3.4470 (`stripRead.js`: the reader's worker reads the file's own colour
numbers and packs them). The page's part was to put the strip on its
bundle's shared row of colours (`picsNumbers.js` `stripAsNumbers`): choose
the row, give it the colours it lacked, then a loop over every byte of the
strip turning its numbers into the row's, padding each line to four bytes for
WebGL. The main tour's `town`, three runs: 9.4, 17.9 and 10.0 ms the longest,
34 holds; the lands' edges up to 8.1 ms.

**What it does now** (the family's `next`: "send the bundle's row with the
ask"):

- **The rows go with the read.** The page describes the bundle's rows when
  each strip's read STARTS (reads go one at a time), including the plans
  already answered and not yet taken (`stripRowsAsk`). The first cut
  described them when the strip was ASKED: a monster's look is a dozen
  strips asked at once, and 27 of 29 came back stale on a ride.
- **The reader's worker numbers the strip** (`png8Worker.js`, with
  `stripRows.js` `planOnRows` and `remapToRow`, the page's own rule): which
  row, the colours it gains in order, and the strip on the row's numbers. A
  colour variant (the moss slime and its kin) has its palette retinted there
  first, by the same pure `retintPalette`.
- **The page checks and takes it** (`_onPlannedRow`), in the order the plans
  were answered: the bundle's rows not given back since (a count of
  releases), and the row with the number of places it was told. Otherwise
  the page numbers the strip itself, as before, from the strip's own numbers,
  which come back beside the plan.

**The same picture.** `held-sweep`'s node half: `strip-door.test` 4i holds
`stripRows.js` to a verbatim copy of the page's rule on 1000 made-up strips
and rows (325 needing a new row, 64 a later one): the row, the colours in
order, every byte, the padding. Break proof: the room rule off by one (`<`
for `<=`), 5 of 1000 differ. In play, `window.__btStripRowCheck = true` checks
every pixel's colour on the row against its colour in the strip: a ride to
every land's edge, 35 of 35 strips numbered on the worker (6 of them colour
variants), none stale, no pixel wrong.

**After**, the sample (the main tour's `town` and `lands`, three runs): 6.1,
12.4 and 4.5 ms the longest, 11 holds (was 34). The 12.4 is 9 ms of
`texSubImage2D`, the row's colours sent to this box's software chip; one hold
just past the general line is the judge's noise.

After the gatekeeper's sitting 4 (`docs/plan/census/review-z4.md`): a waiting
plan was taken when its row's COUNT of colours was as described, never its
colours, and the page's own way of numbering a strip (a read that failed:
the 20 s `READ_MS` after an app switch, the worker's `onerror`) gave a row
colours in its own order without a word. A later plan whose count came out
the same then put a monster's pixels on places holding other colours: a rock
golem's or a rotcap's pose scrambled until the land was left. Now rows the
page changes its own way (a new row, or new colours) make every waiting plan
of the bundle stale (`picsNumbers.js` `_rowsMoved`; `strip-door` 4l, its
break proof by hand). The same ride after: 35 of 35 numbered on the worker,
none stale, no pixel wrong, the rows never moved (no read failed).

**Not run** (offered): the whole tours; Safari.

### `foldToMono` off the list (v2.3.5045)

**What was left.** Six of the game's stereo sound files carry one signal on
both sides, and each is kept as one channel after its first decode
(`docs/specs/sound-fold.md`). The fold ran in one piece right after the
decode, which with the sound cache is a sound's first play: both sides read
and summed (`sidesAreOne`), then their mean copied into a new buffer. The
main tour's `lands` and `town`, three runs: 8.1, 8.9 and 13.4 ms the longest
(18.9 once in the list's last tours).

**What it does now.** The same fold walked a stretch (16,384 samples) at a
time, a frame let in once a piece has run 4 ms (`soundFold.js`
`foldToMonoSliced`, the gear pack's way of waiting: a frame, then a task, a
timer if no frame comes). Its own scratch arrays and one fold at a time, so
two sounds decoded together never share a stretch. The sound is kept, and
plays, when the fold is done, as it did after the one piece. `?foldgentle=0`:
in one go.

**The same sound.** `sound-fold.test` 4 (node): the fold in pieces against
the one-go fold on equal sides, sides 66 dB apart, 41 dB apart, a wide sound,
silence, one side silent and one channel: the same buffer, sample for sample,
and the same ones kept as they were; two at once, each its own; a turn after
every stretch at a slice of 0. Break proof: the mean as `* 0.499`, 4a and 4c
red. In a page, `mp-soundfold`: exactly the six kept as one, each the same as
its stereo file (five to the bit, fish-reel -65.8 dB), 7 of 7.

**After**, the sample (`town` and `lands`, three runs): 5.2, 4.9 and 6.9 ms
the longest, and every run within its whole budget.

After the gatekeeper's sitting 4: the game's side of the fold moved into
`soundFold.js` (`foldForGame`; `gameDisplay.js` under its `four-lines`
line), and a one-channel sound no longer waits behind a fold in the line
(`docs/specs/sound-fold.md`).

### The equip redraw (`other: R > J`) off the list (v2.3.5046)

**What it was.** The sweep could only say "React's scheduler" (`R > J > Gk`:
the production build's minified `performConcurrentWorkOnRoot`, and inside it
`performUnitOfWork` 13 ms in one go). A development build keeps React's names
(`NODE_ENV=development vite build --mode development`), and a CPU profile of
six equips on it named the work: every equip change set BroTown's own
`gearWorn` state (`src/game/gearWornSync.js`), so the game's ROOT re-rendered,
with everything under it (BroTown, the GearTab, the band's keys, the ride
button, the quest coach, the band), as a blocking update in one piece. Only
the inventory panel reads those flags, and they change only when a slot goes
from bare to worn or back. Before, twelve runs of the main tour's `peer` and
`armour`: 17.5, 17.5 and 15.9 ms at `armour`, 12.4 at `peer`.

**What it does now** (`gearWornSync.js` alone; `BroTown.jsx` unchanged):

- an equip that leaves the three flags as they were (one plate for another)
  sets nothing and redraws nothing;
- one that changes a flag is a React transition: rendered in pieces of about
  5 ms with a frame between, as the band's beat is (fix 6 above). The
  inventory panel's worn toggles follow a frame or two later.
- `?equipredraw=0`: every change set at once, as before.

On the development build, the blocking renders in six equips went from 35.0
to 21.7 ms; what is left is the GearTab redrawn from its own buses.

**After**, the sample (`peer` and `armour`, three runs): 8.6 ms the longest
at `peer`, 8.2 at `armour`.

**Seen, not this PR's.** `other: wrapped` is `debug/perfTracker.js`'s wrapper
round every timer's callback, so it names any anonymous timer job: 10 to 19.6
ms in eight of about thirty runs (a GearTab redraw, the gear pack's own
continuation, the screen check), over the general line now and then. The
sweep would name these if it looked one frame inside `wrapped`.

### `ui:*` off the list (v2.3.5047)

**What it was.** A component of the band drawn in one piece. The band's beat
is a transition (fix 6 above), so React lets a frame in between components,
but never inside one, and the gear tab did two things inside its own body:

- it built its nine equipment cells with a function of its own (`cellEl`),
  each with its work (`cellContent`: the weapon's rows, the amulet's stat
  card from `getEquipContribs`), so all nine were the gear tab's one piece;
- its gold badge said the page's FIRST number with commas
  (`toLocaleString`): about 10 ms on this box, the browser readying its
  number formatter, and about 10 us for each one after. The badge also asked
  for two locales in turn (its own `coins.toLocaleString()` and
  `barNumber`'s `'en-US'`), and the browser keeps one formatter for
  `toLocaleString`, for the last locale asked: a new one twice a redraw
  (about 20 times a call's cost, in node).

Before, six runs of the main tour's `town`, `lands`, `peer` and `armour`:
13.4 ms the longest (`ui:GearTab`), 4 to 9 ms otherwise.

**What it does now:**

- each cell is a component (`GearTab.jsx` `GearCellView`: the same body,
  its key on the element), a piece of its own;
- `barNumbers.js` says one number both ways behind the loading screen (the
  module is read with the game's code), and `barNumber` has one
  `Intl.NumberFormat('en-US')` of its own (the same text as
  `toLocaleString('en-US')`, 15,000 numbers compared).

**After**, the sample (`town` and `lands`, then `peer` and `armour`, three
runs each): 34 holds of a component over 4 ms, 9.9 ms the longest (the
band, `town`; the gear tab 9.9 at `lands`), none over the general line.

**Seen in the sample, not this PR's.** Two of the six runs failed the tour's
budget on other families: `other: wrapped` (19.4 ms twice at `lands`: the
timer wrapper of `debug/perfTracker.js`, its own time, so this box; seen
over the line in four earlier runs) and `gear-sheet` once at `armour`
(22.4 ms: the Equipment screen's figure composing the WHOLE upscaled shirt
strip, `composeShirt`, for the one frame it shows).

### `sweepPicsOnce` off the list (v2.3.5048)

**What it was.** Once a second `picsOnce.js` sweeps Pixi's cache of pictures
and lets go of the page's copy of each one on the chip
(`docs/specs/pictures-once.md`). It had a 4 ms budget, but the budget only
stopped the work on a picture: the WALK went on over the whole cache every
second, from its first entry (`Map.forEach` cannot stop), and the cache holds
a texture under each of its names, a sheet's every frame among them. The
holds named the walk's own callback, and `releasable` with `urlOf` in it:
`releasable` read every picture's address (an `<img>`'s `currentSrc`, a
string the page makes for each read) twice, before asking whether it was on
the chip at all. Before, the runs of this card's earlier samples: 23.9 ms at
`peer`, 17.6 at `armour`, 13.7 at `peer`, 11.8, 11.4 at the crowd's
`g-boards`, and 4 to 8 ms in town and the lands.

**What it does now** (`picsOnce.js` alone):

- one walker over the cache's entries is kept from turn to turn (a Map
  iterator: an entry added meanwhile is still met, one gone is not); a turn
  walks it for 3 ms and stops, the next goes on where it stopped, 100 ms
  later while the round is unfinished and a second after it ends; a round
  sees each picture once;
- `releasable` asks whether the picture is on the chip before it reads the
  address, and reads it once (the same answer: every check must hold);
- QA's `window.__btPicsOnceSweep()` is still one whole round at once.

**After**, the sample (the main tour's `town` and `lands`, `peer` and
`armour`, and the crowd's `c-armour8`, `h-eight` and `g-boards`, three runs
each, on the final code): 20 holds over 4 ms, 7.2 ms the longest but one,
12.1 at `g-boards` that the Leaderboard's faces shared (about 6 ms of it the
sweep's). A first sample with the slice alone (before the address was read
last): 11.9, 11.2 and 10.3 ms, mostly `releasable` and `urlOf`.

**The Leaderboard's faces** (the gatekeeper's sitting 4 asked for them: they
are drawn a step at a time since v2.3.5042): at the crowd's `g-boards`, with
the crowd's seven players on the boards, 19 boards and 32 faces, `portrait`
9.7 ms the longest of 16 holds in three runs; alone (no crowd: 25 faces),
none over 4 ms.

**Seen in the sample, not this PR's.** `pack-page` (card P's) over its line
at `armour` in four of six runs (26.6 to 42.5 ms; once inside a React render,
named `R > J`); `QuestCoach > loadDone` 23.3 ms once at `town`
(`getBoundingClientRect`, `get cookie`, `matchMedia`); a combat tick
(`attackTick`) 25.4 ms once; an unnamed function 20.9 ms once at `peer`.

### `body-bake` off the list (v2.3.5049)

**What was left.** Nothing measured. A body or head sheet recoloured on the
page for one look was the crowd tour's worst family (114 to 720 ms a sheet),
and every such bake has run on the body bake's worker in play since
v2.3.4930; `h-eight`'s last page bakes (a watch that let busy workers go)
went with v2.3.5013. The row was kept at 13 ms (12 at the crowd's stations)
until the stations that measured it were played again.

**The sample** (the main tour's `peer` and `armour`, and the crowd's
`a-ink`, `b-fish`, `c-armour1`, `c-armour8`, `h-eight` and `d-prints`, three
runs each, every crowd group there: 3, 2, 1, 7, 8 and 10 players): not one
`body-bake` hold, in a frame or outside one. The family comes off the list.

**And the gatekeeper's two finds on #1668** (sitting 1), in the same files:
a body bake worker never heard from is not started again at every return
(`bodyBake.js` `_back`: it cost 20 s of plain looks each return on a device
where the worker cannot run), and `mp-bodyworker`'s `BT_BW_PARTS` refuses a
name it does not know (a typo ran nothing and passed).
`docs/specs/body-bake-worker.md`, "A worker that never ran here...": part 6c,
its break proof, 101 of 101.

**Seen in the sample, not this PR's.** Three of the six runs failed the
tour's budget on other families:

- `pack-page` (card P's) over its line at `armour` (35.5 ms twice);
- `server-message` 30.1 ms once at `armour`: a message handler with the gear
  pack's `getImageData` and a socket `send` in the same gap between frames;
- the picture sweep's turn (`other: wrapped > sweepPicsOnceTurn`, v2.3.5048):
  18.3 ms once at `armour` (5 ms of it inside the browser's own `setTimeout`,
  the rest React and others), and 12.1 and 12.3 ms at the crowd's `a-ink` and
  `b-fish` in one run (the judge's two over). The profiles put 7 to 11 ms in
  `releasable`; timed call by call at those two stations with the crowd there,
  `releasable` took 1.4 ms at most (one call, a 128 px picture). The walk is
  sliced to 3 ms, so these are this box's pauses landing in the sweep's
  frequent short turns. Kept off the list; if the gatekeeper would rather it
  listed at 13 ms (which every run of both samples passes), it is one row.

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

## The crowd tour (v2.3.4499)

The owner, 2026-11-10, after the sweep: use the PATTERN to see the next ones
coming. Every freeze found so far (TRAPS 281, 283, 317, 318; the tour above)
has one shape: **art made on the page the first time it comes on screen.**
A read of the code said the shape is still open wherever ANOTHER PLAYER
brings something new on screen, and the sweep's `peer` station is one
player. So this tour measures a crowd.

### The tool: `mp-crowdsweep`

`tools/qa/mp/mp-crowdsweep.mjs`, with the sweep's own meter
(`mp-heldsweep.mjs` `makeStation` / `analyse`) and budget
(`held-budget.mjs`). One real phone watches. Scripted players (plain sockets
speaking the phone's protocol, as `tools/qa/load/` and `mp-boards` join
them: `ws: [1, 5]`, `bp_` characters) come in groups, each dressed to test
one forecast, and stand round the phone. Each turns through the eight
facings walking, stands, swings twice, is hit twice, rolls, mines and casts a
line. Then the group waits far off in the world. The phone walks into the
23 players of groups a to d standing together, and opens the Leaderboards
and every board. The species group (e) goes LAST, because it buries the page
(below). The chip's bytes are read after every station.

```
NODE_OPTIONS=--max-old-space-size=8192 npx vite build --minify false --outDir dist-prof && mv src/dist-prof dist-prof
QA_DIST=dist-prof node tools/qa/mp/run.mjs crowdsweep
BT_CS_STATIONS=a-ink,d-prints QA_DIST=dist-prof node tools/qa/mp/run.mjs crowdsweep   # some groups only
```

About 15 minutes. The report is `tools/qa/mp/out/crowdsweep.json`. It ran
seven times here. The first three lost groups d and e (see "How it was built"
below). Runs 4 to 6 played the species before the walk-in and the
Leaderboards, which then measured only a buried page. Run 7 is the order
above, and passes its budget. The numbers are the worst of the runs that
measured each station cleanly.

### What it found

"Hold" means the page's one thread held: no frame is drawn while it lasts.
A 60 Hz screen draws a frame every 16.7 ms, so a 150 ms hold is about nine
frames missed.

| | the forecast | predicted | measured | what a player meets | new? | what fixes it |
|---|---|---|---|---|---|---|
| a | a player with an eye style or a drawing: each new pose and facing baked on the page | 45 to 147 ms a sheet | **tattoos and a trouser print: 114 to 720 ms a sheet**, a dozen or more for each such player in the first 20 s. The eye style tried (`sleepy`) baked nothing: it erases no eye. A style that erases was not tried | a freeze of a tenth to three quarters of a second each time such a player does something new beside you | on the list as a "next" (`body-bake`), never measured; far worse than predicted | the drawings stamped on a worker, or the body as a row of colours with the drawing over it (STATE-MACHINES A2) |
| b | another player fishing in a shirt: the 32-frame fish sheet | about 100 ms | **92 to 198 ms, once for each look that fishes**, armour or not. A player of the plain default look bakes nothing | a freeze each time someone new casts a line near you | new | the fish sheet as a row of colours (`lookBodyRefused` already passes it; the bake is the getFishFrame path) |
| c | an armoured player's first appearance and facings | 57 to 164 ms (heads), 31 to 140 ms (cuts), one peer | **one: 36 to 102 ms (bakes), 24 to 43 ms (cuts in a frame). Eight: 186 to 267 ms (bakes), 41 to 60 ms (cuts)**; walking about after they have shown every pose, still 60 to 112 ms | a few freezes as each armoured player arrives, and a few more as they walk | on the list (`body-bake`, `masked-bake`); eight is worse than one per look | the debt list's own (head sheets keyed by skin, as numbers) |
| d | printed shirts in poses past standing and jogging; more than 8 prints | unmeasured | **a drawn shirt is composed on the page for each pose: 121 to 192 ms, 8 to 13 times for ten shirts in 25 s.** The 8-print cap was not seen to bake again in turn within the station | a freeze each time a player in a drawn shirt swings, rolls or mines for the first time | new (`gear-sheet`) | stamp the drawing on the worker, or draw it as its own layer over the plain shirt |
| e | species players, more than 6 species-and-skin pairs | rebuild churn? | **yes, and worse: a leak.** Eight pairs on screen: the oldest build let go of every frame and built again, and what is let go of is freed 30 s later. **566 pictures of 256 x 256 (187 MB) in one minute, 757 to 870 (250 to 287 MB) a few minutes later** (run 7, a faster page: 222, 73 MB, in 75 s). Collections of 20 to 100 ms, the fur recoloured inside the frame (`retintSkinPixels`): frames of 28 to 70 ms. Runs that went on after it: collections of 336 to 698 ms, up to 1076 ms | on an iPhone (about 250 MB in all), **a black screen**, not a hitch. Seven or more monkeys and aliens of different colours near you is enough | new: the worst finding; **v2.3.4871 fixed**: a build is kept while drawn and let go of 2 s after (was 30). The same station after: **123 MB on the chip (was 270), 8 builds made once each, collections 9 ms at most (was 68), one 39 ms frame as they arrive (was 25)** | a cap never under the looks on screen (or a build kept while its player is), and a let-go freed at once when nothing draws it (`speciesArt.js` `_BUILD_CAP`, `_releaseBuild`) |
| f | walking into twenty players already standing | every figure built in one frame | **did not happen**: 23 players (run 7), the longest hold 20 ms, 143 ms in all. With 13 (runs 1 to 3): 9 to 21 ms. Played after the species churn instead (runs 4 to 6): collections of 336 to 698 ms, and the screen check's old way (below) 465 to 652 ms | nothing on its own | | |
| g | a window of many unseen faces (the Leaderboards) | about 30 ms a face, back to back | **62 to 149 ms in one hold** (19 boards, boards of 48 to 56 faces) | the Leaderboards freeze as they open | new (`portrait`) | a few faces a frame, the rest plain until their turn; keep the faces a board drew |
| h | the collector with eight armoured players against one | more garbage per peer each frame | one walking about for 25 s: 0 or 1 collections over 4 ms (at most 31 ms). Eight: 3 to 7 (17 to 29 ms each, 38 to 93 ms in all). The game's own frame 5.2 to 5.9 ms against 5.9 to 6.3 | a little: a short hitch every few seconds in a crowd of armour | measured; small | the pools (OPTIMIZATION-ROADMAP) |
| i | what the chip holds after the crowd shows every pose | (a before-number) | **before: 80 MB.** After 23 players in tattoos, prints, armour and drawn shirts had shown every pose: 121 to 126 MB. Of the +45 MB: **+24 MB pictures loaded from files** (the poses' art, drawn for the first time), **+20 MB pictures made on the page** (the peers' recoloured sheets: the first group alone +10 MB, of it 64 pictures of 128 x 128; ten drawn shirts' `dressed:` sheets, 4 MB; the armour's masked bodies, `canvas 1336x48` 12 times and `184x240` 15 times, about 5 MB), **+1.8 MB** the looks' mask atlas (`bt-look-mask`). The armour strips' cache (`effectsRenderer.js` `_gearStrips`) is **bounded** by the catalogue (one art set a slot, about 72 keys): about 22 MB when every pose has been seen, shared by every player; the gear files here went 38 -> 42 MB. After the species: 200 MB (run 7) to 312 MB, and 377 to 415 MB a few minutes on | the memory law's line is about 250 MB for everything | measured | the species churn (e); the rest is within the memory budget's reach |

Two more, seen on the way:

- **The screen check's old way.** When the chip is swamped (here, after the
  species churn), the black-screen check's fenced read is not back within its
  frames, and it falls back to its OLD way: a copy of the whole canvas that
  waits for the chip (`BroTown.jsx` `oldWay` > `_wdThumbImage`), 465 to 652
  ms, a dozen times. The check meant to catch a dying page holds it longest
  just when it is dying. Skipping a check would be better than copying.
- **A tap's sound check**, `_audioHealthCheck` and `reclaimIfNeeded`
  (`gameDisplay.js`), 24 to 48 ms, only on the drowning page.

What the tour, in its order, measures over a line is on the debt list
(`held-budget.mjs` `KNOWN`) at what was measured: new families at their
own lines (`gear-sheet`, `portrait`, `other: createObjectURL`, `other:
wrapped > sweepPicsOnce`), and the listed ones at the crowd's stations by
a line of their own (`at`), so the main tour's lines stay where they were.
Each entry's `crowd` says what the crowd tour found. What only a buried page
showed (the screen check's old way, the sound checks) is here, not on the
list. None was fixed here.

### Leads the tour cannot measure

Each checked in the code, for whoever takes them:

- **Monster death pieces use a Sprite as a mask** (`monsterDeathFx.js`
  about line 496: `onBody.mask = alphaMask`, a `new Sprite(sb.texture)`).
  That is TRAPS 221's filter pass in the middle of the frame, one per cut
  piece, for the effect's 1.75 s (`DUR_MS`). A kill in a crowd is several.
- **The player's own weapon redraws its mask shapes every frame**
  (`entityRenderer.js` about lines 16028 to 16186: `handMask`, `armMask`,
  `_armShirtMask`, `_apMask`, `_armCapeMask` cleared and drawn again). A
  change to a small Graphics rebuilds its layer's draw list (TRAPS 218).
- **Nothing records a long session's drawing.** Draw calls, the number of
  display objects and the chip's bytes are never sampled over time
  (`mp-longplay` watches memory only), so a slow rise cannot be told from a
  hot phone. The owner's capture 24 minutes in: about 51 frames a second
  against about 106 cool, the game's own work 2.7 -> 6.8 ms a frame.
- **The "back to the tab" listeners pile up** (lane R2 is fixing them).

### What it could not measure

- **A phone.** As for the main tour: the JavaScript is about a phone's, the
  drawing is not. The chip numbers are the textures' sizes, the same on any
  device.
- **The players are scripted.** They send what a phone sends (the move, the
  2 s look, the swing, the hit, the roll), not every effect a real phone
  makes. A crowd of real phones can only cost more.
- **The eye styles that erase** (the one tried does not), **Windows and Mac**
  (looks are baked there anyway), and **Safari**.

### How it was built (what the first runs taught)

- A scripted player left waiting in the town's zone, or standing still, is
  closed by the worker after two minutes (4006, `tick.js`): a move that
  changes nothing does not count as "awake" (`index.js`); the phone's 2 s
  look with `aw: 0` does. The players now send it, and each group joins just
  before its turn.
- The worker turns away a 17th socket from one address (`flood.js`): the
  tour raises the room's `ip_sockets` and `ip_joins_min` live flags for its
  run and clears them after.
- Played before the walk-in and the Leaderboards, the species group buried
  the page and those two measured nothing but that: it goes last.
