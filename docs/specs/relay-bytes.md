# The relay's bytes (v2.3.5543)

The red team's RT-1, finding N10; card K. A relay is a message one phone
sends for the others to draw: a swing, a stun, an emote, a campfire, a
duel's card (the wire table's `relay` rows, `server/src/wire/relays.js`).

## What was wrong

- The worker rebuilds a relay in the sender's name (`relay.js`
  `_relayBuild`, v2.3.3304), but copies **every field** the phone put in its
  payload, up to the 16 KB frame. The wire door holds only the fields a row
  names.
- Each socket may relay 8 at once, then 4 a second (the count's bucket,
  `RELAY_BURST` / `RELAY_REFILL_PER_S`), whatever their size.
- The tick sends 64 KB of events a tick and keeps the rest **queued**, with no
  cap on the queue's bytes (tick.js: "delays a burst, it does not lose it").

So 48 guests on three addresses, each relaying a 14 KB `stunned` 4 times a
second, sent every player in the room **2.25 MB a second** (RT-1's
measurement). On main the bench here measures **2,417 KB a second** (48
guests, 10 s).

## The three bounds

`relay.js` `_relayBytesDrop`, called by the router (`index.js`) on the relay
as it will go out, just before the room's queue:

| Bound | The number | Why that number |
|---|---|---|
| one relay (`size`) | `RELAY.MAX_BYTES` 4 KB of JSON | An honest relay is under 1 KB: a projectile, a duel's card, a swing. The old one-way trade offer (a bag's counts) goes only to a worker without `trade2`. |
| a socket's relay bytes (`budget`) | `BYTES_BURST` 8 KB at once, then `BYTES_PER_S` 2 KB a second | A bucket beside the count's: a swing, a dodge and a jump every second for two minutes is never dropped (`relay-bytes.test` §2). |
| the queue (`queue`) | `QUEUE_BYTES_MAX` 256 KB of relays waiting | Past it, a NEW relay is dropped; the worker's own events never are. The tick's drain gives each sent relay's bytes back (`_relayDrained`, tick.js). |

A dropped relay is silent to its sender, as the count's drop always was,
and counted: the room's `_relayByteDrops` by why (three keys at most), the
socket's `relayBytesDropped`. The first 20 of a worker's life are logged:
`[relaybytes] dropped <type>: <why> <bytes> B`.

Nothing is added to the message the phones get: each queued relay's size is
kept in a `WeakMap`.

## What it changes

The bench (`relay-bytes.test` §5, a real tick loop, 24 guests, 4 s; and the
48-guest run of the same flood):

| | switch off (as before) | switch on |
|---|---|---|
| 48 guests, 14 KB junk each, 4 a second | 2,417 KB/s to an honest player | 4 KB/s (the room's ordinary traffic: every one dropped, `size`) |
| 48 guests, 3.9 KB junk (under the size bound) | | 117 KB/s (each socket held to 2 KB a second) |
| 48 guests, 1 KB junk | | 131 KB/s |
| after the flood stops | 346 KB/s for 5 s more (the queue draining) | nothing queued |

**An honest player loses nothing**: no honest relay is near 4 KB, and an
honest stream stays well inside 2 KB a second (§2; the census below).

## The switch

`relaybytes: false` in the live flags (`liveops.js` `_relayBytesOff`; its
row in the switch table): none of the three bounds, today's way.
`relay-bytes.test` §4 runs it thrown.

## What is not done here

- **Copying only the fields a row names.** The table's `trust` column lists
  the fields the worker reads, not every field the others' pages read: a
  `trade_accept` row names `target`, but the receiving page reads `offer`.
  Filtering on it would break relays. A row's full field list is a column
  the table does not have yet; the byte bounds stop the flood without it.
- **A room-wide ceiling on messages in** (RT-1's N5): its own PR.

## What holds it

`server/test/relay-bytes.test.mjs` (its break proofs in its header).
