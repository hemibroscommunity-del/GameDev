# A join is told the players around it (v2.3.3276)

> Owner, 2026-10-16: *"Yes do suggested"*: the server split plan's Phase 0e
> (`docs/SERVER-SPLIT-PLAN.md`, "The join snapshot"), with Phase 0f, the room's
> memory with real characters, measured beside it.

## What it was

When a phone joins (every login, every reconnect, all of them at once after a
deploy), the room sends it a snapshot of every player in the room
(`state_sync`, `getAllPlayerData` in `server/src/index.js`). Each player is in
it with their whole public look: what they wear, their drawings, their
inspect card.

- **About 0.9 KB** a player who has drawn nothing (a real phone's look,
  `tools/qa/load/track-sample.json`), up to **~3 KB** with all eight drawings
  (256 hex characters each).
- And every join told every other phone the joiner's whole look
  (`player_join`).

Both grow with the room. At 1,000 players a join was about 1 MB of snapshot,
plus 1,000 copies of the joiner's look. After a deploy, all 1,000 phones come
back at once.

## What a phone needs

A phone draws only the players around it. Presence v2
(`docs/specs/presence-v2.md`) already sends a phone in the Wheel no far player
while its world map is shut, and parks a far player's copy out of sight.

What a phone keeps of a far player is what its **lists** show:

- the leaderboard's online tab: name, colour, level and the inspect card's
  counters;
- the clan window's other clans: the clan tag, name and colour;
- the player list: name, colour, and the Hemi Bro picture and count.

## What changed

A phone that says it can take it (`nj: 1` in its join, beside `pres: 2`) is
now sent:

- **Whole**, the players **around it**: in its own zone and, in the Wheel,
  within 2,400 px (`NEAR_JOIN.R`, the same circle every roster covers: everyone
  its screen or minimap can show). Its party wherever they are, and its own
  sparring clones.
- Everyone else as a **list entry**: the lists' fields above and nothing of
  the look, marked `fa: 1`. A list entry is about 200 bytes, against 0.9-3 KB
  for the whole one. The phone parks a list entry out of sight at once
  (`src/game/nearJoin.js` `parkFar`).
- **A player's whole look, the moment they come around**: in the tick that
  first sends them whole to this phone, as `pl` (id -> the entry the snapshot
  would have given). The phone applies it **before** the tick's players, so
  the tick that shows them shows them in their own look. That covers:
  - they walked into your circle, or you walked into theirs;
  - they joined your party.
- **On arriving somewhere** (a zone change: every trip into the Wheel from a
  login, a death, a dungeon or the farm), the next tick brings the look and the
  place of everyone around you whose look you do not hold, the ones standing
  still too. They would otherwise wait for the next roster (about a second).
  The moment between your phone's own zone change and that tick (a round trip)
  is under the trip's loading veil.
- **`player_join`** is the same: a joiner around you comes whole, as before;
  one who is not comes as a list entry.

### Which looks a phone holds

The look relay (`lookrelay.js`) still goes to every phone, as before:

- a delta when a look changes;
- each player's whole look on their first track after a join, and at least
  once a minute after that (`LOOK_RELAY.FULL_EVERY_MS`).

So a phone holds a player's look in two ways:

- **It was sent whole to this session**: the snapshot's whole entries, a whole
  `player_join`, a `pl`. These are kept in `session._looks`.
- **Their last whole relay is newer than this session's snapshot.** Each whole
  relay stamps the player with the room's next `_lookSeq`, and the session
  keeps the `_lookSeq` its snapshot was made at (`_snapSeq`).

A delta never makes a look held, since it may land on a list entry. A list
`player_join` takes the joiner out of `_looks`, as a rejoin may bring another
look.

Once a roster (about a second), `_looks` lets go of every player whose next
whole relay has gone (held anyway) or who has left the room
(`_nearJoinPrune`). So it holds only the looks sent in the last minute or so,
plus the sparring clones and lingering bodies, which are never relayed.
Unpruned, a long session's set grew toward everyone it ever met: 19.5 MB at
1,000 players.

In practice a `pl` is sent only in the first minute or so after a join, before
every far player's next whole relay has come.

## What a player sees

- **Around them, nothing changes.** Every player they can see comes whole,
  look and all, as before.
- **In the lists**, a far player's entry has everything the lists show.
- **A far player's portrait** (the friends list, an inspect card opened from
  the player list) is the plain one until their look reaches this phone. That
  is by their next whole relay, within about a minute and a half of joining, or
  at once when they come near.

## Deploy order and the kill switch

- **An old phone** (no `nj`) gets the snapshot, `player_join` and ticks byte
  for byte as before.
- **A new phone against an old worker** gets them too (no `fa`, no `pl`), and
  needs neither. It reads `caps.nearjoin` before applying either.
- **No storage, and no new message type.** `fa` and `pl` are fields on the
  snapshot, `player_join` and the tick.
- **Kill switch:** `nearjoin: false` in the live flags. New joins get the whole
  snapshot again, and `caps.nearjoin` reads false. A phone that already got a
  near snapshot keeps getting its `pl`s, which it needs.

## The wire

| message | field | what |
|---|---|---|
| `join` (phone -> worker) | `nj: 1` | this phone can take a near snapshot (only with `pres: 2` on a v2 join) |
| `state_sync.caps` | `nearjoin: true` | the worker sends near snapshots and looks |
| `state_sync.players[id]`, `player_join.data` | `fa: 1` | a list entry: `name color avatar rpgLv clanTag clanColor1 bro`, `z`, `brn`, and `rpgData` with only `clanTag clanName clanColor1 lifeTotal ap kills dungeons goldEarned playtime` |
| `tick` | `pl: {id: entry}` | a player's whole look and place, on this phone's copy only |

## Measured

`tools/qa/load/join-bench.mjs`: the real GameRoom in Node. N players are in
the Wheel, a third about BroTown and two thirds at the monsters, each with a
real phone's look (one in three with two drawings). Every phone joins with
`pres: 2`, with `nj: 1` or without. Each mode runs in a process of its own.

**One login** (in today's town, then down to BroTown):

| | 120 players, before | after | 500, before | after | 1,000, before | after |
|---|---|---|---|---|---|---|
| its snapshot | 138 KB | 29 KB | 570 KB | 120 KB | 1,138 KB | 238 KB |
| its player_join, to everyone | 56 KB | 18 KB | 493 KB | 81 KB | 473 KB | 156 KB |
| the arrival's tick (monsters, and now the looks around) | 128 KB | 188 KB | 135 KB | 382 KB | 143 KB | 638 KB |
| **all of it** | 322 KB | 235 KB | 1,198 KB | 583 KB | 1,754 KB | 1,032 KB |

The looks of the players around BroTown now come on the arrival's tick,
instead of in the snapshot. The far players' looks are the saving: 27%, 51%
and 41% less. The room's time for a look is the same either way (about
0.03 ms each, on this box). A login pays for the players around it, not for
the room.

**The reconnect storm** (every socket drops; each phone comes back where it
stood in the Wheel, its first track goes whole to everyone, then a roster):

| | 120, before | after | 500, before | after | 1,000, before | after |
|---|---|---|---|---|---|---|
| sent, in all | 46.0 MB | 39.5 MB | 524 MB | 415 MB | 1,926 MB | 1,485 MB |
| the snapshots | 19.7 MB | 16.4 MB | 142 MB | 85 MB | 441 MB | 215 MB |
| the player_joins | 4.6 MB | 1.6 MB | 81 MB | 28 MB | 326 MB | 112 MB |
| the first tracks' whole relays (unchanged) | 15.2 MB | 15.2 MB | 267 MB | 267 MB | 1,069 MB | 1,069 MB |
| the room's time on the joins | 473 ms | 496 ms | 4.1 s | 2.4 s | 13.5 s | 7.0 s |

At 1,000 players the storm is 23% smaller, and the room spends half the time
on the joins. **What is left** is 72% of the storm: each player's whole look
relayed to every other phone (`player_update`, lookrelay.js), N x N copies.
That relay is also the room's steady N x N cost: every look goes to every
phone at least once a minute. Sending a look only to the phones around its
player ("looks by interest") is the next step for 1,000 players. It needs the
lists to ask for what they show when opened (the world map's `map_watch` is
the shape), and it is not built.

## The room's memory with real characters (the split plan's Phase 0f)

`tools/qa/load/memprobe.mjs`: the real GameRoom in Node (the same V8 as the
runtime). Every player's records are put in storage before they join, so the
room's own join code loads them: the rpg record, the gear ledger, the pets
record, the codex. Then 400 ticks with 30% walking, two full garbage
collections, and the heap less an empty room's. Each size runs in a process
of its own (TRAPS §180).

There are three kinds of character:

- **bot**: the load test's, a real phone's look and nothing on file.
- **played**: weeks of play. A bag of 40 kinds, 4 weapons and 19 pieces
  stashed, 40 quests, 60 rows in the gear ledger, 15 pets, two drawings.
- **heavy**: everything at its cap. A bag of 120 kinds, 8 weapons and 32 of
  each stashed piece, 150 quests, 256 ledger rows, 120 pets, all eight
  drawings.

| kind | 120 players | 500 | 1,000 | a player |
|---|---|---|---|---|
| bot | 8.1 MB | 18.9 MB | 34.4 MB | 35 KB |
| played | 13.5 MB | 42.7 MB | 80.0 MB | 82 KB |
| heavy | 30.9 MB | 116.8 MB | 230.5 MB | 236 KB |

The bots' 8.1 MB at 120 matches the runtime's own measurement
(`docs/specs/cap-120.md`: 8.3-9.4 MB kept after a full GC).

What one player's share is made of, at 1,000:

| | played | heavy |
|---|---|---|
| the gear ledger (`gear_prov:`, kept for every player online) | 20.3 MB | 86.2 MB |
| the pets record | 5.1 MB | 31.8 MB |
| the lag-compensation history | 6.6 MB | 6.6 MB |
| the looks (drawings) | 4.8 MB | 9.5 MB |
| everything else (the bag, the stashes, quests, the session) | 43 MB | 96 MB |

**Against Cloudflare's 128 MB** a room of 1,000 played characters fits, at
80 MB. A room of 1,000 at the caps does not: 231 MB, nearly twice the limit.
The gear ledger alone is up to 88 KB a player, 256 rows each with a full copy
of a piece, kept for every piece ever minted, worn, sold or not. So a world of
1,000 long-time players will not fit in one room's memory as it is. The
cheapest fixes are not built:

- keep in memory only the ledger rows of pieces still carried (the rest stays
  in storage);
- keep only the pet out in memory (the collection is read when the Pets page
  opens).

Not counted here: the runtime's compression buffers for each socket (about
300 KB each, outside the JavaScript heap), which the split plan's doors would
hold instead of the world.

## Tests

- **`server/test/near-join.test.mjs`, 56 checks.**
  - The snapshot: around whole (its zone, its party far off, itself),
    everyone else a list entry with only the lists' fields. The control phone
    gets everyone whole, exactly `getAllPlayerData()` as before.
  - Arriving: the next tick brings the look and place of the player standing
    there, once.
  - A far player walking in: their look in the tick that first sends them
    whole, once.
  - Held by a whole relay after the snapshot, not by a delta; the set pruned
    once a roster to the last minute's.
  - `player_join` whole or a list entry, and a rejoin in a new look (no track
    yet) that walks up gets its new look in a `pl`.
  - The kill switch; v1 and pres-less joins; the tick builders byte for byte.
  - **A random room, 3,000 ticks**: 24 players walking in and out of the
    phone's circle, changing their looks near and far (131 changes, 113 far),
    leaving and coming back (126 rejoins), and the two phones logging out and
    back in 7 times. A model of each phone's merge shows every player sent to
    the near phone whole and around it in exactly the look the control phone
    (sent everything) shows: 1,946 entries checked, never a list entry.
  - The phone's half: `parkFar` and `applyPeerLooks`, and wsClient.js
    applying `pl` before the tick's players, only against `caps.nearjoin`.
  - **Eleven bugs put in on purpose** (no `pl`, every look held, a delta
    counted as whole, no arrival, a list join leaving the look held, the
    arrival list ignored, no pruning, the circle ignored, the party not
    around, `pl` applied after the players, list entries with the look): each
    fails it.
- **`mp-nearjoin`, 8 checks**, a real phone and bare sockets on a real worker:
  - the arriver's snapshot has the Wheel's players as list entries (the
    elder's has them whole);
  - arriving in BroTown, the stander's look comes in a `pl` and they are drawn
    in it;
  - the far walker is a list entry: name, level, kills and gold, no look,
    parked;
  - walking in, their look comes in one `pl` with their first whole entry, and
    no frame drew them in another look;
  - the kill switch;
  - no page errors.
- **Existing phone checks, all passing**: `mp-presence2` (15), `mp-farpeer`
  (8), `mp-wheelhome` (18), `mp-spar` (25), `mp-peercull` (6), `mp-linger` (11).
