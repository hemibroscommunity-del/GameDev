# The send door (v2.3.5193)

Grand plan step 4.1b, step 1; card K PR 8. It changes nothing a phone reads.

## Why

There was no single send: about 150 places wrote to a player's socket
directly, through about 50 helpers of the systems' own (SHAPES part 5). Nobody
could say which messages make up the bytes going out, and a later change to
how frames are made (a binary wire, a squeeze) had 150 places to touch.

## What it does

`server/src/send.js`, mixed into the room:

| Form | Writes |
|---|---|
| `this._send(ws, msg)` | `JSON.stringify(msg)`, counted under `msg.type` |
| `this._send(ws, s, type)` | a frame already made (the tick's, a ping's), as it is, counted under `type` |
| `this._sendRoom(msg, except)` | every socket in the room but `except`, the frame made once (`broadcastAll`, `broadcastExcept`) |

- **Byte for byte.** The frame is the same object made into the same JSON,
  or the same string. `_send` throws as `ws.send` throws, so every caller's
  `try` still catches a dead socket, and a caller without one still throws.
- **The count.** In memory: a `Map` of type to `[frames, length]`. The length
  is in UTF-8 bytes as the socket writes them (v2.3.6445, `utf8Bytes`). A
  type out of form, or past 256 types, is counted under `_other`.
- **Where it is kept.** The day's book's part `send` (`daybook.js`), a
  RIDING part: `sendRide` folds the counts into today's sums only when the
  book is already writing today's, so a room that only sends never writes
  a row (`cost-guard` §15e). A restart loses what was not yet folded (at most
  a pace, five minutes). The part is held to 8 KB (`DAYBOOK.PART_BYTES_OF`:
  about 110 types a day; a type past it is counted in the day's `over`), so
  the worst full day, every part full, stays under a stored value's 128 KiB
  (`daybook.test` 10b: 124 KB).
- **Where it is read.** The Test panel's one admin route, `/dev/daybook`
  (`bookRead` adds what is counted and not yet folded, changing nothing).

## What moved in this PR

The helpers: the ~50 systems' `_xxxSend` / `_xxxTell` methods (the list is
`HELPERS` in `server/test/send-door.test.mjs`), `broadcastAll` and
`broadcastExcept` (index.js), the tick's frames and pings (tick.js), and the
near join's (nearjoin.js). The handlers that still write a socket themselves
are card K PR 13's (two batches; the second after card L's and card R's files).

## The census

`send-door.test` §8 counts a raw `.send(` in `server/src` outside `send.js`:
150 on main `78f70f4a`, 93 after this PR. Its line only falls (the plan's
rule 3). At 0 the gatekeeper makes it strict.

## The switch

`sendcount: false` in the live flags: nothing is counted (the book carries
no `send` part). The door stays and the frames are the same.

## Tests

`server/test/send-door.test.mjs` (the door, the room's form, 24 helpers'
frames byte for byte, the helpers' list, the tick, the book, the switch, the
census); `cost-guard` §15e.
