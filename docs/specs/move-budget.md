# A script moves no faster than the fastest honest player (v2.3.3325)

> The owner, 2026-10-17, to "Want me to merge #948 and then start on the bot
> farming holes?": *"Yes"*.

This is fix 7 of the anti-bot review (docs/specs/antibot-review.md §4: "a
script moves 6.6 times faster, or anywhere at once"). Two of its three parts
are done here. The third, the reconnect, is still open (below).

## What was wrong

The phone tells the server where it is, about 15-30 times a second. The server
checked each message against a speed limit:

> 500 px a second x the time since the last message, **plus 80 px** for a roll
> and network jitter.

The 80 px was given again with **every message**. So:

- **Many quick messages:** a script sending the phone's own 30 messages a
  second went **2,909 px a second**. The fastest honest player walks about
  441, and a phone about 250.
- **Bundles:** 24 moves in one frame (the quiet phone's bundles, v2.3.3254)
  went **3,830 px a second** in the lab.
- **Anywhere at once:** three ways to skip the check entirely, each two
  messages long:
  - a move naming a zone the server refuses made the *next* move a "first
    move", judged against nothing;
  - so did the sword's lunge (the server puts you next to your target, and the
    move after it skipped the check);
  - and so did a trip out of the Wheel and straight back in: a zone change is
    never judged.

## What it does now

### The 80 px is a budget that refills

The limit is a **budget** now, in px (movement.js `MOVE_BUDGET`):

- It refills at the limit's own speed: 500 px a second, times the Swift
  Draught, the move-speed stat and a sprint the server is billing, as before.
- It holds at most **3 seconds of that, plus 80 px** (1,580 px walking).
- Each move spends what it covers.
- A gust (a mummy's shove) still pays on top, as before.

So a script gets the limit's 500 px a second, and one jump of what it saved:
1,580 px at most, after standing still for 3 seconds.

### A move past the budget is followed, never refused

The old check **refused** a move it couldn't cover. The server kept the
player where they were, and judged the next move from there too. So a gap,
once open, stayed open until the player stood still long enough for one move
to cover it. This file's own notes called that a *pin*, three times over.

With a budget that can't grow past its cap, a refused gap bigger than the cap
would **never** close. So instead:

- A move the budget can't cover is taken **as far as the budget reaches**,
  along the line to where the phone says it is.
- The rest is **followed** on the server's tick (`_tickMoveFollow`), as fast
  as the budget refills, until the server's copy is where the phone is. It
  doesn't wait for the phone's next move: a phone standing still sends one a
  second after it stops, then one every 10 seconds.
- The move's shield, facing and the rest are taken too. A refusal dropped
  them, so a pinned player's shield did nothing.

An honest phone is never pinned. A script gets the limit's speed, which it
already had.

### The three skips are closed

- **A refused zone** writes nothing, as before, and no longer frees the next
  move. That move is judged from where the server had the player.
- **A server-placed move** (the sword's dash at a monster, the lunge at a
  player: `_moveServerPlaced`) is judged from where the server put them.
- **Back into the Wheel**, a player who left it on this connection is judged
  from **where they left it** (`ps._wheelBack`). Every honest way out of the
  Wheel comes back where it left:
  - a Wheel dungeon, at its mouth (game/wheelDungeons.js);
  - the farm, at the door you left by (zoneTransitions.js).

  The one that doesn't is a death. The respawn forgets the way back
  (`_moveRespawned`), so you come back in at the Wheel's arrival.

  Today's town, the dungeons and the farm keep their free entry. They're
  small, the farming is in the Wheel, and the old lands are closed.

A zone change never refills the budget. Otherwise flipping out and back in
would buy a full one every time.

The respawn also makes the next move a first move. It puts you in town with
no place there, and judging your first town move against the Wheel spot where
you died would have the server follow you across the world.

## Why 3 seconds

A walking player's budget sits full: it refills at 500 px a second, and
nobody honest walks that fast. What spends it is the fast honest moves:

- the sword's lunge, up to ~900 px at 1,560 px a second (game/abilities.js
  `DASH_*`);
- a roll;
- a gust;
- a stalled connection's backlog arriving all at once.

3 seconds covers:
- a full lunge, with ~970 px to spare;
- a 3.6 s stall at the fastest honest speed (6.3 s at a phone's walk), with
  nothing to catch up.

A longer stall is a few seconds of the server's copy catching up.

## Measured

### The server's suite

`server/test/move-budget.test.mjs`, 62 checks. Each of the following moves was
**taken exactly**:

- a phone's walk (250 px a second, 30 moves a second, 20 s);
- the fastest legitimate stack (441 px a second);
- a sword lunge mid-run (900 px at 1,560 px a second);
- a roll;
- a sprint at the fastest stack (587 px a second);
- the Swift Draught at the fastest stack (662 px a second);
- a 3 s stall's backlog delivered at once.

A 10 s stall at a phone's walk is followed. It's caught up within 4 s walking
on, or within 2 s standing still.

The same suite also shows:
- the old rule's pin under the kill switch: a phone 300 px ahead and walking
  away is never caught;
- a claim 10,000 px away reached in 20 s with no further move from the phone.

Fourteen deliberate bugs, each caught.

### The bot lab

`node tools/qa/load/bot-lab.mjs 60 --only=...`, this branch against itself
with `--flags=movebudget:false` (the old rule):

| | Old rule | Budget |
|---|---|---|
| a phone's walk | 251 px/s | 251 px/s |
| a script, each move the most the limit takes | 2,909 px/s | 656 px/s |
| a script, 24 moves a frame | 3,830 px/s | 229 px/s (its socket closed for flooding, as before) |
| honest pine (Woodcutting 1) | 378 an hour | 378 an hour |
| real messages, struck the moment allowed, at the limit | 1,050 an hour | 887 an hour |

The bundle script now gains nothing from bundling: the budget belongs to the
player, not the message. Its 24 moves a frame, 30 frames a second, are 720
messages a second, and the one-socket limit (flood.js, v2.3.3274) closes it
in under two seconds, before it reaches a vein. Before, each frame jumped
hundreds of px, so it arrived quickly and stopped sending.

## Still open: a reconnect lands where it says

A join may claim any place (join.js `_sanitizeJoinData`). Every join is a
fresh player state on the server, with no way back and a full budget. So a
script that reconnects lands where it likes. It's limited only by the
one-socket limits: 20 new sockets a minute for each internet address
(flood.js).

The fix is to start a reconnect where the server last had the player. It
touches the join, so it gets its own change:

- remember where each player was when their socket closed, for a few minutes;
- judge a reconnect's claim from there, with the time since added to the
  budget (you can't have walked faster than the limit);
- a login lands in today's town, whose way into the Wheel then has to be the
  arrival.

The suite pins today's behaviour ("STILL OPEN: the first way into the Wheel
on a connection is taken wherever it is"), so closing it is a deliberate
change.

The server still has no map of water, walls or buildings, so a script also
walks through them (the review's note).

## The switch

`movebudget: false` in the live flags (liveops, POST `/api/admin/flags`) is
all of it as before:
- the per-message 80;
- refusals;
- the three skips;
- the respawn's move clock left alone.

`/api/admin/overview`'s `moveBudget` says how many moves it judged, how many
it had to follow, how many came back into the Wheel from where they left it,
and who is being followed now. A large share followed is worth a look: an
honest phone is followed only after a long stall or a teleport of its own.

## Files

- `server/src/movement.js`: `MOVE_BUDGET`, `_moveBudgetOn`, `_moveBudgetNow`,
  `_moveServerPlaced`, `_moveRespawned`, `_tickMoveFollow`,
  `_moveBudgetInfo`, and `_handleMove`.
- `server/src/abilities.js` (the sword's dash), `server/src/pvplunge.js`,
  `server/src/index.js` (the respawn), `server/src/tick.js` (the follow, before
  the monsters), `server/src/admin.js` (the overview).
- `server/test/move-budget.test.mjs`. Adapted to the budget, each still
  testing what it tested: `anticheat`, `blockcost`, `monsterstatus` (the
  gust), `potions`, `prog3`, `pvp-lunge`, `sprint`.
- `tools/qa/load/bot-lab.mjs`: `allow()` reads the budget; `--flags=` sets
  the room's live flags.
