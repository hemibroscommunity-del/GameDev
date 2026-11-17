# The room's public reads, kept and paced (v2.3.5609, card OPS PR 10)

Red team RT-1 N8; plan step 11.5.

## Why

Three reads anyone may make, with no key and no session, woke the room's one
thread and walked a whole book every time:

- the market's orders, `GET /api/market/orders` (market.js `_mktQueryOrders`
  over every bucket, after its sweep);
- the store's browse, `GET /api/store/browse` (store.js `_stBrowse`, after
  its sweep);
- the arena's status, `GET /api/arena/status` (gladiator.js).

A script asking 400 times a second took 400 walks a second off the 120
playing. (`/api/lobby` answers from the outer worker and never wakes the
room.)

## What

`server/src/publicreads.js`, in front of the three surfaces (index.js):

- **Kept.** Each answer, keyed by its whole path and query, is kept 3 s
  (`KEEP_MS`) and served again without walking; at most 256 kept, the oldest
  out. Only a 200 is kept.
- **Fresh where it matters.** Any request to the same surface that is not a
  read (a place, a buy, a cancel, a list, a bid, a join, a leave) drops every
  answer kept for it, before and after it runs: the player who acted reads
  their own act at once. A read begun before a write is not kept after it
  (a count of writes per surface). The socket's writes on a surface drop
  it too (v2.3.5613, sitting 19b's LOW: a store offer, its cancel and its
  reply; an arena sponsorship; they were up to 3 s stale). A change the
  room makes by itself (an order expiring, an arena round moving on) shows
  within 3 s.
- **Paced.** A read that would wake the room (not kept) counts against its
  address (flood.js `requestIp`: Cloudflare's stamp; absent locally, and
  loopback never counted). Past 10 in one second (`PER_S`): 429 with
  `Retry-After: 1`. A kept answer is never refused: a phone polling the same
  read is served the kept one, however often it asks. The game's own phones
  add no query of their own to these reads, so they are kept for each other.
- (Sitting 19b's gatekeeper) **`/health/room`'s public up-or-down** (the
  room's `/_room_health`, `health.js`) is kept and paced the same; a request
  with the owner's key (the numbers) passes through, never kept or paced
  here (the key has its own lockout). The outer route passes the room the
  caller's address, so the pace sees it.
- Only the three reads (and the health) are kept. `/api/market/my`, `/history`, the store's
  `/mine` and the arena's `/tournament` are unchanged.

Reads only: nothing a player owns changes because of it; every answer's shape
is the room's own; nothing is written; no cap (no new path a phone takes).

## Switch

`publicreads: false` in the live flags: every read walks its book, as
before; nothing kept, nothing counted.

## Measured (local runtime, a copy of server/ counting the market's walks)

| | switch on | `publicreads: false` |
|---|---|---|
| 400 reads of one answer, at once | 1 walk, 400 answered | 400 walks |
| 400 reads each with its own query, one address | 10 walks, 390 refused 429 | 400 walks |

## Tests

- `server/test/public-reads.test.mjs` (21): the kept answer, its expiry, each
  query its own; a write drops it (and a read begun before it); only the
  three reads, only a 200; the pace (429, Retry-After, a kept answer never
  refused, another address, the next second, no address); RT-1's flood; the
  switch; the cap; the room's routing.
- The market, store and arena suites, unchanged, pass with it on.
