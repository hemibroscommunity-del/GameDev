# Events by place: a fight is told to the phones near it (v2.3.3225)

> Owner, 2026-10-13: *"Go recommended but I want you to stress test to see
> what can be optimized."* This is Phase 0d of the server split plan
> (`docs/SERVER-SPLIT-PLAN.md`).

## What the stress test found

Every event the room puts in a tick went to every phone in the room, wherever
it happened. These events are a monster's hit, a player's swing or arrow, or
a kill.

The load test had never sent the swings and arrows a real phone relays to
the others, so it did not see this. With them on (`load.mjs --relays
--events`, both new), at 120 players with 30% of them fighting:

- **Every phone was sent about 50 events and 9 KB a second.** That is about
  6% of all it downloads. Nearly all of them came from fights far off its
  screen.
  - Other players' arrows: 18.7 a second.
  - Their swings: 13.7.
  - Hits on monsters: 6.5.
  - Monsters' attacks: 3.4.
  - Monsters' special moves: 4.1.
- **It grows with the square of the crowd.** Each fighter adds events, and
  each event goes to every phone. At 1,000 players it would be about as much
  as everything else a phone is sent.

The same check found that two things every phone in the Wheel hears or feels
come from anywhere in the Wheel. The whole Wheel is one zone, and the client
only checks the zone:

- **A monster's big hit.** `monster_ability` on a landed slam, pounce or
  lunge sets `S.screenShake` and a camera kick, with no distance. So a slam
  on any player anywhere shook every screen in the world. This change limits
  it to 2,800 px.
- **A monster's death sound.** `gameEvents.js` `monster_kill` calls
  `BT_AUDIO.monsterDeath` at a fixed volume, with no distance. Kills still go
  to everyone (below), so this is unchanged; it needs a client fix.

## What changed (the worker only)

An event that happens AT A PLACE now says where (`server/src/eventplace.js`
`placeOf`). The place comes from the event's own fields and the room's own
state, never from what a phone wrote. The tick then sends it (`tick.js`
`eventsFor`):

- **To the players it is about, wherever they are.** These are:
  - the attacker;
  - the player attacked;
  - the phone that sent a relay.

  A bow's stuck arrow keeps chipping while the archer walks away, and the
  shooter's own damage number comes only from this echo.
- **In the Wheel, to every phone within 2,800 px of it.** This is the
  distance at which a phone stops hearing about a monster
  (`WHEEL.INTEREST_OUT`), so every monster a phone still knows about has all
  its events. It is also past the players a phone draws (2,400 px), the hit
  sounds it hears (1,150 px), and its screen (about 700 x 1,300 px).
- **Anywhere else, to every phone in the same zone.** An old (v1) phone in
  the Wheel also hears the whole Wheel, because its tick is shared rather
  than built for it.

What is placed:

| | placed at |
|---|---|
| a hit on a monster, a monster's attack, special move or thrown ball, a fire patch, a parry | the monster, as the room has it now |
| a bow special's blast, an element burst | where the room says it happened |
| a shield bash's wind-up | the player |
| a player's swing, arrow, roll, jump, chop | the player, as the room has them (never the payload's numbers) |

**Still sent to everyone, as before:**

- chat and emotes;
- duels, trades, clans and the arena;
- the jackpot;
- a hit between players;
- any event type not on the list.

So the list is an allowlist: a new kind of event goes to everyone until
someone places it on purpose.

**Also still sent to everyone: the events a phone remembers.** These happen
at a place, but a phone that missed one would draw it wrong when it walked
up later. An audit of every client handler found five:

- **A monster's death.** A phone in the Wheel keeps a copy of every monster.
  The tick tells it only about the monsters near it, so `monster_kill` is its
  only news of a far one's death. A monster that comes back into reach still
  dead would otherwise look like a fresh kill (`wsClient.js`, the tick's
  alive-to-dead edge): a remnant pile that never goes away, and a death
  sound.
- **A raised shield.** `player_shield` stays up or down until the next
  toggle, and nothing else tells the phone.
- **A mummy turning into a skeleton.** `monster_transform` is on no other
  wire.
- **A lit campfire.** `campfire_lit` is sent once, and the fire burns for
  45 s.
- **Loot piles.** `loot_drop`, `loot_claimed` and `loot_despawn`: a pile
  lies there until it is taken or despawns, and a far phone that missed its
  despawn would keep drawing it.

Each of these is rare and small.

A phone with no zone yet (still joining) hears everything, as before.

## Why nobody sees a difference

- **Near a fight, the bytes are the same.** A phone near every event of a
  tick is sent exactly the `events` JSON it was sent before, byte for byte
  (`event-place.test.mjs` §4).
- **A far event did nothing on a phone.** The game already ignores an event
  about a monster or a player it does not have (`gameEvents.js`). A phone in
  the Wheel holds only the monsters within 2,400 px, and draws only the
  players near it.
- **A far monster's hits fix themselves.** A phone that misses them is sent
  the monster whole when it comes back within reach, with its HP
  (`wheelzone.js` `_wheelInterest`, "entered"). Its death is still told to
  everyone (above).
- **The fix.** A slam's shake is now felt only within 2,800 px, not from
  across the world. That is still wider than the screen. A client change
  could limit it to what is on screen, and a monster's death sound to what
  you can hear. Neither is in this PR.

## Safe to deploy in either order

- The client does not change, and no caps flag is needed. An event looks
  exactly as it did; there are only fewer of them where they did nothing.
- **Kill switch:** `eventplace: false` in the live flags sends every event to
  everyone again, from the next tick.

## Measured

**The load test** (`load.mjs --steps 120 --track --diet --relays --events
--tick-parts`): a real local worker with #895-#899 in it, before and after,
run alternately.

| at 120 players | before (3 runs) | after (final code) |
|---|---|---|
| events a phone is sent | 50-66 a second, 9-12 KB/s | 17 a second, 3.4 KB/s |
| everything a phone is sent | 139-165 KB/s | 134 KB/s |
| the room's thread | 70-76% busy | 65% busy (73% and 71% with kills placed) |
| ticks a second | 41 | 41 |

- **Each phone's download is about 4% smaller at 120.** Its events are 70-75%
  fewer.
- **The room's thread did not change beyond the noise** between runs. At 120
  the events were only about 8% of what it sends. Most of what is left is the
  other players' positions (90% of a tick).
- **What is left of the events:**
  - the phone's own land's fights;
  - kills, at about 1 a second;
  - loot piles, about 1 a second.
  The last two still go to everyone.

**The room alone, at bigger crowds** (in-process, `tools/qa/load/events-bench.mjs`: N
players in the Wheel, a third of them in town and two thirds at the monsters,
E events a tick, every message UTF-8-encoded as the runtime does):

| | before | after |
|---|---|---|
| 120 players, 2 events a tick | 2.7-3.0 ms a tick, 1.1 KB a phone | 2.2-2.4 ms, 0.4-0.6 KB |
| 500 players, 8 events a tick | 9.0-9.1 ms, 3.0 KB | 8.2-8.6 ms, 1.4-1.5 KB |
| 1,000 players, 16 events a tick | 17-21 ms, 5.6-5.9 KB | 16-20 ms, 2.4-2.8 KB |

- **Choosing each phone's events costs no more than sending it the rest.** It
  is a few comparisons a phone a tick, and the shorter messages pay for it.
- **What a phone is sent no longer grows with the whole crowd's fights**, only
  with the fights near it.
- **With deflate on every message,** as the runtime compresses them, the
  room's tick was 30-37% shorter. That overstates it: the runtime keeps one
  compressor per socket, which is cheaper than a fresh one per message.
- **With 30-100 events a tick, far above anything measured,** the room's own
  code is 0.2-3.5 ms slower a tick. Each phone's events are chosen one by one,
  though each phone is still sent 7 times fewer bytes.

## Tests

`server/test/event-place.test.mjs` (35 checks):

- **Where each kind of event is placed.**
  - At the live monster, or at the fields the room wrote.
  - A relay at its sender as the room has them, never where its payload says.
  - Who is always told.
  - The room-wide types are never placed, and neither is an event with no
    zone.
  - Junk never throws.
- **Who hears a placed event.**
  - The ones it is about, anywhere.
  - A phone with no zone yet hears everything; another zone hears nothing.
  - In the Wheel the line is exactly R: at R yes, one pixel past no.
- **A room.**
  - A fight on a spoke reaches the fighter, a phone near it, and a far
    archer whose arrow hit.
  - It does not reach a phone in Brotown's square, one in today's town, or
    one on another spoke.
  - A v1 phone in the Wheel hears the Wheel.
  - A dungeon's events stay in the dungeon.
  - Kills, chat, loot and unknown types reach everyone.
  - A socket that never joined hears everything.
  - Two phones in today's town: the one whose arrow hit a Wheel monster gets
    the hit, the other does not.
- **Byte for byte.**
  - A phone near every event gets the same events JSON as a socket that
    hears everything, tick by tick.
  - The two message builders agree over 3,000+ messages with placed events,
    chat mutes, v1 and every kind of zone.
- **The kill switch** sends everything to everyone again.
- **R is the Wheel's monster interest** (`INTEREST_OUT`).
- **Every placed type is real**: the room sends it, or a phone relays it.
  A typo in the list would place nothing and fail here.

Ten bugs put in on purpose each fail the suite:

- `who` ignored;
- the zone check dropped;
- a relay placed at its payload's numbers;
- R too small;
- the cache key without the selection, in either of its two places;
- the old builder sending every event;
- a v1 phone told by distance;
- a kill placed;
- a raised shield placed.

`load.mjs --relays` (the fighters send a phone's swing or arrow with each
blow) and `--events` (what the probes' ticks carry, by type) are new.
