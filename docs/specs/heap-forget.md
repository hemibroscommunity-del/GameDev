# The room forgets who left (v2.3.5544)

The red team's RT-1, finding N11; card K. Every throwaway guest left about
27 KB on the room's memory for good. Cloudflare resets a Durable Object past
128 MB, which throws every player out at once and loses whatever was not yet
saved, so about 4,000 guests could reset the room, again and again.

## What kept them

The worst was `gathering.js _strikeRefused`. It kept the last refused strike
for the operator's view, with the phone's raw `zone` (up to the 16 KB frame),
keyed by the guest's id, and never deleted it. Six smaller maps had the same
shape: an entry made on a message and kept after the player left.

## What it does now

`server/src/heapforget.js`, `HEAP_FORGET`: the one closed list of the room's
maps keyed by a player, each with when its entry goes.

| Map | File | When it goes |
|---|---|---|
| `_lastStrikeById` | gathering.js | at the leave |
| `_arrowBlastRejects` | arrowblast.js | at the leave |
| `_fireBurnAt` | firetrail.js | at the leave |
| `_laneBuckets` | chatlanes.js | once the bucket would be full again |
| `_scBuckets` | storechat.js | once the bucket would be full again |
| `_chatReportLog` | chatmod.js | once its newest report is a day old |

- **At the leave** means the leave door's body duty (`leave.js`) and the
  end of a lingering body (`linger.js`), where the other caches go.
- **A rate limit is kept while it is spent**, so leaving and joining again
  does not hand back a full allowance. The room's sweep drops the buckets
  that have filled up and the logs that have aged out, at most once a minute,
  on a leave.
- **A refused strike keeps a string field only up to 64 characters** (a node
  id and a zone id are under 40).
- **`props.js`** caches the boxes of a zone only when the zone has props: a
  name a phone put in its zone no longer adds a key for good.

## The switch

`heapforget: false` in the live flags: nothing forgotten, and the strike's
record kept whole, as before (N11 open again).

## What holds it

`server/test/heap-forget.test.mjs`. Its §3 fails a new map on the room
that still holds a guest who left, unless it is a `HEAP_FORGET` row kept past
the leave, or one of its `BOUNDED` maps, which carry their own cap
(`_botfp`, `_lastPlaces`, `_accBook`, `chatSeen`, `_farmRate`,
`pendingPlayerStateFlush`). Its §4 measures the room: 1,000 guests, each a
7 KB strike, in and out, grow it about 1.5 KB a guest (7 KB without).

## Not done here

- A room-wide ceiling on messages in (RT-1's N5): its own PR.
