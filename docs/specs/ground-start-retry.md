# The Wheel's ground helper: a failed start tries again (v2.3.4370)

Phone side only. Files: `src/game/wheelTrial.js` (`wheelStart`,
`wheelRetryIn`), `src/game/worldTrial.js` (`preloadWheel`),
`public/tools/world/core/ground-worker.js`, `public/tools/world/core/startFetch.js`.
Test: `server/test/ground-start.test.mjs` (11 passed and 16 failed on the code
before; 27 passed after).

## What a player met

The world's ground, buildings and doors are laid by a helper (the ground
worker, a web worker). Found by the state-machine sweep of 2026-11-03 (V11
G3-4, T1-12, T1-9):

- **A start that failed was kept.** When the helper's script or one of its
  imports did not load, or its plan build said `error` (a Wi-Fi blip as the
  world opened), its rejected start was handed to every later ask
  (`wheelStart` returned the saved `_initP`), and only a reload cleared it.
  Staying in the world never stops the helper, and a death does not either. The
  player stood on flat sea with no walls, buildings, doors or Mayor Bro, and
  the black-screen watchdog never reloads, because the sea colour counts as
  lit.
- **The helper's start lists had no time limit and no retry.** These are the
  bake (`objects.bin`, the overview, the lands), the objects list and the
  ground list. One failed fetch lost the buildings and doors (or the ground
  pictures) for the whole visit, and one that hung held the world on flat sea
  until the browser gave up. TRAPS §123's rule had been applied to the ground
  pictures only.
- Two small download faults: a queued prefetch made urgent was moved to the
  front but not started, so it waited for a prefetch to finish although a line
  was free (`want` never called `pump`). And `prefetchRound` downloaded again
  pictures already marked unreadable.

## What changed

- **`wheelStart`**: a failed start stops the helper and lets it go. For
  `START_RETRY_MS` (2 s, doubling while it keeps failing, to 30 s) the same
  failure is handed back. The ground asks every frame
  (`rendering/wheelGround.js`), and this wait stops that from starting a new
  worker each frame. After the wait the next ask starts a fresh helper. A
  `ready` or `wheelStop` resets the wait. An error after `ready` is not a
  failed start, so that helper is kept, as before. `wheelRetryIn()` says how
  long is left. The failure is recorded BEFORE the rejection reaches anyone,
  so an ask made in a `catch` already sees the wait.
- **`preloadWheel`** (the way in) waits out the failure and asks again,
  behind the loading screen it already has, for at most `START_TRIES_MS`
  (10 s, inside the screen's 15 s cap). With no saved failure to wait out
  (a browser with no workers), it gives up at once, as before. Past that, the
  ground's every-frame ask keeps trying after the overlay has gone (the same
  self-heal as a slow start today).
- **`startFetch`** (new, no imports) handles the helper's start lists. Each
  try, its body included, gets 20 s. A try that throws, is cut, or answers
  5xx is tried again (3 tries, 1 s then 2 s apart). A 404 goes to the caller.
  The lists that carry `?t=` get a fresh address each try. A list whose body
  is a site's "page not found" HTML (a `SyntaxError`) still means "no copy",
  and is not tried again.
- `want()` calls `pump()` after a promotion. `prefetchRound` skips
  `failed` pictures, as the pieces' own asks already did.

## The lesson (what the next change must not undo)

- **A load-once latch must not keep its failure.** Any cached promise of a
  start (`_initP`) must drop a rejection, or the first blip is permanent for
  the page. It must also not retry with no wait, because something asks every
  frame.
- **The time limit is for the hang, not the slow line.** `objects.bin` is
  about 0.7 MB. A slow phone that downloads it in 14 s today must never be cut
  and retried into a failure. That is why it is 20 s a try, not the pictures'
  15 s.
- The bakes read `ground-worker.js` as text (test-world-core: `CHUNK`,
  `UNDER`, `APRON`) and are untouched. This change alters nothing the bakes
  produce.

## Left as they were (no test could show them going wrong)

- `_ready` with no generation number (V11 G3-4, PLAUSIBLE). It needs a
  preload that outlives the gate's 15 s cap, plus leaving the world inside a
  window of about 0.4 s. No node test reproduced it, so nothing changed.
- `_hereAsked` waiting for its answer forever (V11, PLAUSIBLE). A live helper
  answers `where` at once, so only a broken one freezes it. A failed start now
  lets the helper go, and `_hereAsked` is only ever set once a helper was
  ready.
- A stop while a start waits leaves a promise that never settles (V11,
  "negligible"): a few closures, no pictures.
