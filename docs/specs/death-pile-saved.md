# A dead player's pile survives a restart (v2.3.4384)

Server only. Code: `server/src/deathpile.js` (with calls in `index.js`
`_handlePlayerDeath`, `_handleLootPickup`, `_tickLoot`; `join.js`; `dungeon.js`
`_dungeonCleanup`). Suite: `server/test/death-pile-saved.test.mjs`; the rows it
costs: `cost-guard.test.mjs` §13.

## What a player lost

A death outside town lays the bag on the ground as a pile: the dead player's
alone for a minute (in No man's land the killer's), anyone's for the next
minute, then gone (`DEATH_PILE_OWNER_MS`, `DEATH_PILE_TOTAL_MS`). The death's
save has already taken the items out of the bag, and the pile lived only in
the room's memory. A worker deploy or a restart inside those two minutes
therefore destroyed the whole bag, and every merge that touches `server/` is a
deploy. The state-machine sweep (2026-11-03, V22 S1-9) found it; handoff rule
11 says memory is fine only where a wipe loses nothing of value. The owner,
2026-11-10: "save it", at one storage write per death.

## What it does now

One storage row a death pile, `death_pile:<lootId>`, shape `v: 1`
(`DEATHPILE.V`):

| field | what |
|---|---|
| `v` | the shape number; a row with a bigger one is a newer worker's, left whole |
| `id` | the pile's `lootId` (`dd-<playerId>-<ms>`) |
| `owner` | the dead player |
| `zone`, `x`, `y` | where it lies |
| `name` | the name the pile wears (`killerName`) |
| `recipients` | who may take it in its minute: the dead player, the killer in No man's land, or nobody (a red skull's) |
| `ts`, `open`, `end` | when it was laid, when its minute ends (`ownerOnlyUntil`), when it goes (`expiry`): server clock times |
| `items` | `[{key, qty}]`, the bag it holds |

- **Written by the death**, in the same synchronous run as the death's
  `_saveRpg` that leaves the items out of the bag (no await between): one
  write. A restart finds the bag in the record or on the ground, never both,
  never neither.
- **Deleted by the pickup**, in the same synchronous run as the taker's
  `_saveRpg` that puts the items in their bag. A death pile is taken whole (the
  first picker takes everything), so the row never shrinks; its delete is the
  credit's stamp (handoff rules 5 and 6), and the restore reads it before it
  puts anything back.
- **Deleted when the pile runs out** (`_tickLoot`) or when the dungeon run it
  lies in closes (`_dungeonCleanup`).
- **Read once a worker's life**, one page of `DEATHPILE.READ_MAX` (256), at the
  first join, before that join's zone list is built. A pile inside its time
  comes back with its own times (absolute, so the clock kept running while the
  room was down: a pile with 90 s left at a 30 s deploy has 60 s) and the same
  rights. A row past its time, a junk row, or one for a zone that is no zone is
  deleted. Never a read on a tick or on a later join (handoff rule 9).

The wire is unchanged: a restored pile is in `this.loot` like any other, so a
join's `state_sync` (protocol 1 and 2) and every zone list carry it. No cap is
needed: nothing new goes to a phone.

Only a death's pile is saved. A dropped item (`itemdrop.js`, which uses the
death pile's shape) and a monster's pile stay memory-only.

## Kill switch

`deathpilesave: false` in the live flags (lower case): a death writes no row,
the pile lives in memory only, as before. Rows already written are still
restored, deleted on a pickup and swept: the switch stops writes, never the
clean-up of what it left.

## Cost

One row put a death outside town (only when the bag held something to drop),
and one row delete when the pile is taken or runs out: two rows a death in
all. Nothing while the pile lies there. One `list` a worker's life.

## Crash points (suite §7)

The death is one batch (the row and the record); the pickup is one batch (the
record and the row's delete). The suite restarts the room before each batch
and counts every item across the record and the ground: exactly once each
time. With the writes split apart (a timer between them), the same checks
fail: the bag lost at the death, doubled at the pickup.

## Left for later

- Monster piles: never saved (a row a kill).
- How long any pile lasts.
- The phone.
- A row left by a worker rolled back to one that does not know them stays
  until the next start of a worker that does (then swept as past its time).
