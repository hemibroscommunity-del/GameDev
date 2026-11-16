# The boards: kept a minute, swept, and saying less (v2.3.5608, card OPS PR 9)

Red team RT-2 F8 and RT-3 P1 (`docs/security/rt2-findings.md` on #1867).

## Why

- **Every read listed every row ever written.** `GET /api/leaderboard/top` is
  public, and the board object's `getTop` listed every `player:` row for every
  request. A row is written for every player who ever joined and is never
  deleted: the 7 days only filtered it out as it was read. Measured in process
  with the real class: 20,000 rows ~55 ms and ~10 MB a request, 50,000
  ~115 ms and ~25 MB, against the object's 128 MB.
- **What anyone could read of everyone.** Every row carried `playtime` and a
  `lastSeen` refreshed every ten minutes: a live "who plays, and when" for
  every player.

## What

`server/src/leaderboard.js` `getTop` (the old body is `_topRead`, unchanged):

- **Kept a minute.** Each board's answer (a category and a limit) is kept
  `TOP_TTL_MS` (60 s) and served again. A new row shows within the minute. A
  character deleted for good (`markGone`) and faces filled (`fillFaces`)
  clear what is kept at once. At most 256 answers kept.
- **Swept.** The read that makes an answer deletes the `player:` rows past 7
  days it met, at most `SWEEP_MAX` (128, the storage's limit on one delete) a
  pass. They were on no board; a player who comes back writes theirs again at
  their next join. A `gone:` stand-in is never swept here.
- **`playtime` only on the playtime board**, where it is the number ranked.
- **`lastSeen` to the hour**, and the answer says so: `seen: 'hour'`. Its one
  reader that needs it, the prize draw page (`public/tools/draw.html`), reads
  the contest's window by the hour when the board says `seen: 'hour'`: a row
  counts when the hour it was seen in is between the hour the window starts in
  and the hour it ends in, both included. Rounded outward: nobody who played
  inside the window is left out. A board without the word (a worker from
  before, or `exactseen` on) is read to the millisecond, as every draw before
  was. The list says which window it read, and the lock records it
  (`seenRead`).

Measured (the real class, 20,000 rows, a third past 7 days): the first read
40 ms and 128 stale rows swept; the next reads in the minute 0 ms, no list.

## Switches

The board object keeps no flags and asks the room nothing: the room says them
on its own posts (`reportToLeaderboard`, index.js), and the board reads them
from the next post that comes (a player's join, then at most every 5 minutes
a player).

- `boardcache: false` (a kill switch, said `bc: 0`): every board read from
  storage at every request, as before. The sweep, `playtime` and the hour stay.
- `boardsweep: false` (a kill switch, said `bs: 0`; sitting 19b's
  gatekeeper: a delete is not undone, so it stops in one tap): no row is
  deleted, and the stale rows stay off every board. The rows are a derived
  cache (rebuilt whole at the player's next report), already hidden after
  7 days, so nothing shown is lost by the sweep.
- `exactseen: true` (the owner's lever, said `xs: 1`): the exact `lastSeen`
  back and no `seen` word, to run an old draw again exactly (OPERATIONS,
  "Running the cape contest"). Kept answers are kept apart by it: never one
  made the other way.

## Tests

- `server/test/board-cache.test.mjs`: the minute, each board its own, the
  switch, the sweep (128 then the rest), stand-ins untouched, `playtime`, a
  character gone, the room's post, the hour and `exactseen`.
- `server/test/boards.test.mjs` 11d and 7j clear the kept answer to read past
  the minute.
- `tools/qa/draw-page.mjs` 1d: the hour rule, outward; the level floor the
  same; the list's words; the lock's `seenRead`. Its old checks (no `seen`
  word) read to the millisecond as before.
