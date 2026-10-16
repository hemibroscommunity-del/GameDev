# One socket cannot stop the game (v2.3.3273)

> The owner, 2026-10-16, after the anti-bot review: *"Yes start on the urgent
> five and the account check."*

The review (docs/specs/antibot-review.md, Part 2) found five holes that let
one person, with one script, stop the game for everyone, on the free plan's
daily limits, or run up the bill. This closes the five. The account check is
its own PR.

Honest play never meets any of these limits. Each one is sized from what a
real phone sends (docs/specs/quiet-phone.md) with room to spare.

## The five, and what closes them

### 1. A row written per message

**Before:** sending `chat_mute` for someone never muted, `stats_update` with a
defence of 10, 11, 10, 11 ..., or `friend_dm` to a friend who is offline
wrote a row of storage every time, with no limit on how often. Twenty-four of
them fit in one message. At 50 messages a second, the free plan's 100,000 rows
a day were gone in about 80 seconds, and nothing saved until midnight UTC.

**Now:**
- Nothing is written when nothing changed: an un-mute of someone never muted,
  the same active slot again, a build point that moved no level or pool.
- What a player's own taps may write is **paced** (`server/src/flood.js`
  `PACE`): a burst of 30 saves of the record at once, then one every 10
  seconds. Equipping, unequipping, the active slot, a stat change and the
  cape toggle all go through `_saveRpgPaced`.
  - A save past the burst is not lost. It marks the record dirty
    (`_regenDirty`), and the regen tick's drain (`REGEN_SAVE_MS`, 10 s) or the
    close flush writes it. That is the same 10-second window the owner
    accepted for health and stamina in v2.3.1619: a server restart in those
    ten seconds gives back the change.
  - The mute list is paced the same way (10 at once, then one every 10 s).
    The list held in memory is the truth once loaded; a held change is
    written when the next token comes or when the player leaves.
  - An offer's "let me think" mark is written only while the seller's lane
    has a token; past that the mark is simply not stored (it changes nothing
    else). It is never held for later: a held copy of a listing written after
    a sale could put back a listing the sale had deleted.
- A friend message spends the sender's chat allowance (six at once, then one
  every 1.5 s, the `/a` and `/w` lanes' bucket), and one sender may leave at
  most 20 unread lines in an offline friend's box; past that a line is
  dropped, not written.

Measured by the bot lab, 1,000 messages from one player:

| Message | Rows before | Rows after |
|---|---|---|
| `chat_mute`, un-muting someone never muted | 1,000 | 0 |
| `stats_update`, defence 10, 11, 10 ... | 1,000 | 30, then one every 10 s |
| `friend_dm` to an offline friend | 1,000 | 12 (six at once, then one every 1.5 s), and at most 20 in the box |

### 2. Any room name made a room

**Before:** `/ws?room=<anything>`, and the same on every API route, made a new
game room. Each one ran its tick from its first socket and was billed while
awake. Two kept all day already passed the free plan's server time; a hundred
passed it in about 17 minutes.

**Now:** the worker makes only the rooms it is told to (`roomNameFor`):
- the main room, `brotown-1` (also when `?room=` is absent; it used to be a
  stray `brotown` nobody asked for);
- any name listed in the `ROOMS` var in `server/wrangler.toml`, comma
  separated, for a private room the owner wants;
- any name at all on a local host (`localhost`, `127.0.0.1`), so every QA
  tool's `?room=qa1` and the owner's `npx wrangler dev` work as before.

A name it does not make is answered `404 {"error":"no such room"}` on every
route, and no Durable Object is touched.

### 3. No limit on messages per socket

**Before:** nothing counted a socket's messages, and nothing closed one for
sending too many. Only the relay of unknown types and two chat lanes had their
own small budgets.

**Now:** every message counts against the socket's bucket (`FLOOD.MSG_*`), a
bundle's parts one each: 300 at once, then 120 a second. Past it a message is
dropped; a socket that keeps flooding (600 dropped within 10 s) is closed with
code `4012`.

The busiest honest phone sends about 30 frames a second fighting beside
someone, each a bundle of up to three parts (a move, a hit, a pong): about 90
a second. The budget is 4x that.

### 4. The room's door

**Before:**
- The room's 120 places counted sockets, before any join, and the AFK sweep
  spared any socket that said anything at all. 120 sockets that never joined,
  each saying one word every 90 seconds, locked every real player out.
- A second `join` on the same socket under a new name added a player each
  time and never removed the first. Every tick walked them all, and the
  roster sent them to everyone.
- One address could hold every place.

**Now:**
- A socket that has not joined is taken for nothing but its `join` (and a
  pong). Anything else is dropped and does not touch the AFK clock.
- A socket that has not joined within 15 seconds is closed by the sweep
  (`4011`).
- A second `join` on a socket closes it (`4011`). The game's client never
  sends two: a resync closes the socket and opens a new one.
- One address holds at most 16 places and may open at most 20 sockets a
  minute. Both are live flags, `ip_sockets` and `ip_joins_min`, and `0`
  switches one off, for the day a school or a mobile carrier puts more real
  players than that behind one address. The address is Cloudflare's
  `CF-Connecting-IP`; a local test has none and is not counted.
  - The refusal is the full room's: `room_full` with `reason: 'ip'`, close
    `4009`. The client shows "the world is full" and retries on its own.

### 5. A message that is just `null`

**Before:** it threw in the handler. The runtime logged the error and the
room carried on.

**Now:** a frame that is not an object, or an array of them, is dropped like
any other junk.

## What this does not bound

Said plainly, because the owner asked how to prepare for attackers who will
try harder:
- A patient attacker with many addresses and many free accounts can still
  write rows at the paced rate: about 8,600 a day per account that keeps
  changing something. The paid plan ($5 a month) turns that into a cent; the
  account check turns each account into work. Both are recommended in the
  review.
- The limits on a socket's messages are in memory and reset on a deploy.
- Reconnecting after a close is still free. The address limits bound how
  fast.

## Close codes

| Code | Meaning | What the client does |
|---|---|---|
| 4011 | no join within the window, or a second join on the socket | an ordinary reconnect on its backoff (an unknown code) |
| 4012 | too many messages | the same |

Neither is one the client reads as idle (4006), frozen (4004), full (4009),
reset (4005) or a linger (4010); flood.test.mjs §7 pins that.

## Live flags

| Flag | Default | Range | Meaning |
|---|---|---|---|
| `ip_sockets` | 16 | 0-1000 | places one address may hold; 0 = no limit |
| `ip_joins_min` | 20 | 0-10000 | sockets one address may open a minute; 0 = no limit |

Set with the admin flags route, as any flag (docs/OPERATIONS.md, "Live
switches").

## Tests

- `server/test/flood.test.mjs` (46 checks): junk frames; room names on every
  route and on a local host; the socket budget (a burst, the rate, a bundle's
  parts, the close, an honest phone's rate untouched); the door (nothing
  before the join, the join window, a hand-made session kept, a second join
  closes with no ghost, a pre-join pong still measured); addresses (the
  socket cap, the opens a minute, no address not counted, both flags at 0);
  writes (a no-op mute, paced toggles and the flush, a stat flood and the
  regen drain, the same slot, a build point that changed nothing, a DM
  spending the lane); the close codes.
- `server/test/friends.test.mjs`: the box caps, per sender and overall.
- `server/test/chatmod.test.mjs`: the list cap, through the in-memory list.
- `tools/qa/load/bot-lab.mjs --only=writes,roomfill`: the probes the review
  used, now showing the fixes.

## Files

- `server/src/flood.js` (new): the limits, the pacing, the room names, the
  address.
- `server/src/index.js`: the routes, the door, the budget, the pre-join gate,
  one join a socket, the null guard.
- `server/src/join.js`: `_roomFullRefusal(url, why)`.
- `server/src/tick.js`: the join window in the AFK sweep.
- `server/src/chatmod.js`, `friends.js`, `grids.js`, `gear.js`,
  `eventcapes.js`, `storeoffer.js`: write only on change, at a pace.
- `server/wrangler.toml`: the `ROOMS` var.
- `docs/WIRE-PROTOCOL.md`, `docs/specs/liveops.md`, `docs/OPERATIONS.md`,
  `docs/ARCHITECTURE-HANDOFF.md`, `CLAUDE.md`: the notes.
