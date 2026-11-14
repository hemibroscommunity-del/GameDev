# The way back (grand plan step 4.7, card R)

How the game's saved data can be put back when something goes wrong. Step
4.7 has four parts; this spec grows with each:

| Part | Card R PR | Where |
|---|---|---|
| The room's way back to an earlier time | 9 (tag 5288) | `server/src/restore.js`, below |
| A player's restore made from the registry | 6 (tag 5285) | not built yet |
| The paged export | 7 (tag 5286) | not built yet |
| The storage's size in the day's book | 8 (tag 5287) | `server/src/daybook.js` (its header) |

## The room's way back (v2.3.5288)

`server/src/restore.js` (`rewindPlan`, `rewindDo`); the route
`POST /api/admin/rewind` (`admin.js`, behind the owner's key); held by
`server/test/rewind.test.mjs`; the owner's steps in `docs/OPERATIONS.md`
("Taking the whole room back to an earlier time").

### Why

A player's restore (`/api/admin/restore`) puts back one character from its
daily copy (`rpgsnap:`). When something goes wrong for the whole room (a
deploy that wrote nonsense into every save, a road that copied gold for an
hour) there was no way back but editing storage by hand. The room is a
SQLite-backed Durable Object (`new_sqlite_classes` in `server/wrangler.toml`),
and Cloudflare keeps every change of its storage for 30 days
(point-in-time recovery): it can be put back to any moment in them.

### The two steps

1. **The plan**, `{step: 'plan', minutesAgo | at | bookmark}`: what it would
   do, and nothing changes. The answer: the time (`at`), the storage's
   bookmark for it (`target`, from `getBookmarkForTime`), the bookmark of now
   (`now`, from `getCurrentBookmark`: the way back to this moment), how many
   sockets and players it would close, words saying all of it, and a one-time
   `token` good for 10 minutes (`REWIND.PLAN_TTL_MS`). `bookmark` takes an
   earlier answer's bookmark: that is how an undo is planned.
2. **The do**, `{step: 'do', token}`, once:
   - every socket is closed with code 1012 and the words "the room is being
     restored to an earlier time"; each player leaves through the leave door
     (`admin.js` `_adminPutOut`, `leave.js` `kick`), so their last state is
     saved first;
   - the storage is asked to be the target's at the room's next start
     (`onNextSessionRestoreBookmark`); its answer is the `undo`: the room as
     it was just before, the leavers' saves included;
   - the room restarts 50 ms after the answer goes (`state.abort`), and the
     next request starts it, restored.

The `undo` is written in the answer and in the worker's log line only: the
room's own storage (its `admin_log` included) goes back with the rest.

### What a player sees

Their connection drops, as at a deploy: the page reads an unknown close as an
ordinary drop (its veil, then a reconnect, `wsClient.js`), and they come back
into the room as it was. No new words on a page (that would be the page's
code, card K's, and the owner's call).

### What stays balanced

The world's sum (step 4.4: everything held equals the start plus minted less
burned) holds at ANY moment of the storage, because what the sum reads is
written with what it counts (the plan's rule 5): a purse and its `_econ` in
one put, both sides of a swap in one run of writes. `rewind.test.mjs` §5
plays a room (a trade, a gamble won and lost, a grant by the mail, a sale to
Diego) and counts every committed moment of its storage: all balance, and a
rewind through the lever to the middle of the play leaves unexplained gold 0.

### What it does not do

- Keep anything written after the target. The undo is the way back.
- Reach any other object: the Leaderboard and the Feedback board keep theirs.
- Keep what lives only in memory.
- Run on a word from a page: the owner's key only.

### Where it can be tried

- **Locally, no**: `wrangler dev --local` keeps `getCurrentBookmark` but
  answers `getBookmarkForTime` with "This Durable Object's storage back-end
  does not implement point-in-time recovery" (tried 2026-11-14); the plan
  then answers `no-pitr`. The logic is tested in node on a stand-in storage
  (`rewind.test.mjs`: every committed run of writes a moment to go back to).
- **On Cloudflare, in the lab**: the lab's own `Vault` runs these same
  functions, with the game's gold door and world's sum, on records of its
  own (`tools/lab/`, `run.mjs --restore`); `docs/specs/cloudflare-lab.md`,
  "The restore try". The owner runs it, from the Actions tab, on `main`.

### Kill switch

`roomrewind: false` in the live flags: both steps answer `off`.
