# Reading the page's layout: the ways, and the guard (v2.3.6361)

Card LR (the owner, 2026-11-18): the freezes cards HB and HB2 keep fixing
mostly share one cause, and the owner wants new work to stop making them.
The guard (`tools/guards/layout-reads.test.mjs`, card LR PR 1, v2.3.6360)
refuses a new one on every PR, in about a second. CLAUDE.md §7 "THE PAGE'S
ONE THREAD" is the law; this page is how to keep it.

## What a layout read is

Code that asks the browser where or how big something on the page is, or
what its finished style is. The guard counts these kinds (its `KINDS`,
`tools/guards/lib/layoutReads.mjs`):

| kind | what it asks |
|---|---|
| `getBoundingClientRect`, `getClientRects` | a box's place and size |
| `clientWidth/Height/Top/Left`, `offsetWidth/Height/Top/Left/Parent`, `scrollWidth/Height/Top/Left` | a box's size, place or scroll (a scroll WRITTEN lays the page out too) |
| `innerWidth`, `innerHeight`, `outerWidth`, `outerHeight`, `visualViewport.width/height` | the window's size |
| `getComputedStyle`, `getPropertyValue` | a finished style |
| `elementFromPoint`, `elementsFromPoint` | what is under a point |
| `measureText` | a text's width on a canvas |
| `querySelectorAll` | the whole page searched (not a layout, but the same cost in a timer) |

Not counted (yet): `matchMedia(...)`, `innerText`, `focus()`,
`scrollIntoView()`. A read in a comment or a string is never counted.

## Why it freezes a slow phone

The browser lays the page out once a frame, after the script. A script
that changed the page (React's commit, a style written, a window put in)
and THEN reads its layout makes the browser lay the WHOLE page out there
and then, in the middle of the script, to answer. On budget-android that
was 58 to 114 ms held (`docs/plan/census/HB-holds.md`, rows 3, 4, 5, 7, 10,
11, 12, 13, 18, 21, 24, 32, 34, 36; "By cause" 1 to 6):

- **in a React render or commit** (`pillNarrow` reading `innerWidth` on
  every JumpButton render; NavRail's `measure` in a layout effect; the door
  prompt's ref);
- **in a tap**: the band's fold sends a script `resize` event, and every
  `resize` listener ran inside the tap, each measuring (row 7);
- **in a frame** (the game's loop, a mark following the world each frame);
- **in a timer** (guideArrow's `elementFromPoint` and `querySelectorAll`
  every turn; gearFlash's every 300 ms; deskTeach's route);
- **in a canvas redraw** (the World map measured every place name at every
  redraw: row 4).

`mp-heldsweep` finds these, but it is an hours-long run by hand
(`docs/specs/held-sweep.md`), so they were found later, in batches.

## The ways (where a read is allowed without a list row)

1. **A size kept, cleared only when the page truly moves.** The window's
   size: `winVw()` / `winVh()` (`src/ui/mobile/playViewport.js` `_win`,
   v2.3.6241): kept till the BROWSER resizes the window; a script's
   `resize` (`isTrusted` false: the band's) never clears it. The play
   column's: `playVw()` / `playVh()` / `playIsLandscape()` (`_dims`,
   v2.3.4875), the column's size from its ResizeObserver. Never read
   `window.innerWidth` in game UI: read `winVw()` (the browser's window)
   or `playVw()` (the play area).
2. **The canvas's place on the page**: `src/ui/mayorScreen.js` `canvasBox`
   (v2.3.4470), kept, measured again on a resize, a turn, its
   ResizeObserver, or every half second (after #2224, `_measureBox` at the
   top of the frame: the guard's helper names both).
3. **At the top of the game's frame**: a function handed to
   `beforeDraw(...)` (`src/game/framePacer.js`, CLAUDE.md §7's place), and
   a function of the same file it calls by name, with every function inside
   them. The page the browser just drew is laid out there and a read costs
   little. Ask for the reading where it is needed (a render, a tap), keep
   what it read, and use the kept reading; card HB2 moves the quest coach's
   reads there (#2224, `?afterpaint`: `QuestCoach.jsx readCoachPage`,
   `mayorScreen.js _measureBox`). Only the function's name is checked: a
   function a `beforeDraw` calls must not also be called from a render
   except for its first reading or under the switch's off-ramp. The guard
   prints every such call outside the frame's top on each run ("note: ...
   called outside it too"), so a reviewer reads it; it does not fail it.
4. **Measured after the paint**: `src/ui/doorPrompt.js` `placeOverHeadNow`
   (v2.3.6244, `?afterpaint`): the ref only asks for the placing; it runs
   at the top of the next frame (`requestAnimationFrame`), where the page
   the browser just drew is laid out. A `requestAnimationFrame` callback
   is not a way by itself: the game's loop is one, and a read inside the
   frame is what this page is about.
5. **A ResizeObserver's callback.** The browser calls it right after its
   own layout, so reading the observed box there costs nothing; better
   still, take the size from the entry (`entry.contentRect`, not counted).
   Keep the number; read the kept number in render.
6. **Text measured once and kept.** A canvas label's width keyed by its
   text and font, measured the first time it is drawn, never every redraw.
7. **No polling the page from a timer.** Remember what does not change
   between turns (an element found once, kept while `isConnected`); let an
   event (a window opened, a resize the browser sent) say when to look
   again.

`fixedBox(layer)` (`src/ui/fixedBox.js`) is NOT a kept size: it measures
the layer every call. Its reads are on the list; a caller in a render or a
frame measures the page.

## Adding a read

- **Through the ways above**: a kept size (`winVw`, `playVw`), the canvas
  box, the top of the frame (`beforeDraw`), a ResizeObserver's callback,
  or after the paint. Never a new list
  row, never a raised line: the guard's list (`tools/guards/lib/
  layoutReadsKnown.mjs`) only falls.
- **A new way** (a new kept measure, e.g. a shared `measureAfterPaint`) is a
  row of the guard's `APPROVED` (file and function) with its why, and a
  line under "The ways" here, in the same PR: it must keep what it measured
  and measure again only on a real resize, its ResizeObserver, or a
  change it is told of, or measure at the top of a frame.
- **A read that truly must stay** (a size read once at start, the
  browser's own resize handled once) goes on the list with its `why`, only
  with the planning session's yes, named in the PR's words.

## The guard

`node tools/guards/layout-reads.test.mjs` (in `cd server && npm test`, so
Server CI's `test` on every PR). It reads every `.js`/`.jsx` under `src/`,
`src/debug/` included (it runs on every player's page: the field report,
the crash trap, the long-task observer, HB-holds rows 8, 20, 22, 40). Each
read is named by its file, the innermost NAMED function it sits in (a
callback with no name is its named function's) and its kind. A way is
recognised as the measure helpers (its `APPROVED`: the kept sizes, the
canvas box, the door prompt's placing), a ResizeObserver's callback, and
the top of the frame (a `beforeDraw` callback and the functions of its file
it calls by name). It fails:

1. a read in none of the ways and over its row of the list (a new one);
2. the list's reads over `LINE` (the count only falls);
3. a helper of the ways gone from its file;
4. its own break proof, played every run on scratch files.

A fix that takes reads away runs
`node tools/guards/layout-reads.test.mjs --write` in the same PR: it lowers
the rows and `LINE` to what is found, and never adds a row.

## The count (main, 2026-11-18)

391 reads: 22 in the helpers, 4 in a ResizeObserver's callback, and
**365 listed in 72 files** (`LINE`). With HB2's #2224 merged: 337 listed,
16 at the top of the frame (six QuestCoach rows fall: `--write` takes them
down after it lands). By kind: `getBoundingClientRect` 101,
`innerHeight` 39, `innerWidth` 35, `clientHeight` 32, `getComputedStyle`
28, `clientWidth` 27, `querySelectorAll` 23, `scrollTop` 22,
`getPropertyValue` 14, `scrollHeight` 13, `offsetWidth` 8, `measureText` 7,
`offsetHeight` 6, `elementFromPoint` 4, the rest 6. 35 of them sit in a
function an HB-holds row names (their `hb`).

The files with the most, the next fixes (card HB2):

| reads | file |
|---|---|
| 40 | `src/ui/BroTown.jsx` (`resize` row 7, `clientToCanvas`/`onTouchEnd` row 14, the game loop's own) |
| 36 | `src/ui/mobile/QuestCoach.jsx` (`measure` row 32, `worldRect` rows 10, 12; 21 in its render) |
| 29 | `src/ui/WorldMapOverlay.jsx` (`draw`/`label` `measureText`, row 4) |
| 14 | `src/ui/guideArrow.js` (`onTop`, `shown`, `sweepStrays`, row 18) |
| 13 | `src/ui/panels/NameModal.jsx` |
| 12 | `src/game/questFly.js` |
| 11 | `src/ui/mobile/dash/GearTab.jsx`, `src/ui/mobile/dash/MonsterCodex.jsx` |
| 9 | `src/ui/mobile/sheet/HeroExpanded.jsx` |
| 8 | `src/ui/deskTeach.js` (row 36) |
