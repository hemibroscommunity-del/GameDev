# A reconnect starts where the server last had you (v2.3.3327)

> The owner, 2026-10-17, to "Want me to merge #948 and then start on the bot
> farming holes?": *"Yes"*.

This is the third and last part of fix 7 of the anti-bot review
(docs/specs/antibot-review.md §4, "a script moves 6.6 times faster, or
anywhere at once"). The first two parts, the move budget and the Wheel's way
back, shipped in v2.3.3325 (docs/specs/move-budget.md).

## What was wrong

Every join builds a fresh copy of the player on the server from what the
phone says (join.js), including where it is. So a script could drop its
socket, open a new one and say it was anywhere. It got two free jumps each
time:

- the join itself took the place it named;
- the first move after a join was "a first move", judged from nothing.

The one-socket limit (flood.js) allows 20 new sockets a minute per internet
address, so that was a jump every 3 seconds. In the bot lab, a script doing
it moved **33,333 px a second**.

## What happens now

When a player's server copy goes, the server remembers where it had them:

- when a socket closes (index.js `webSocketClose`);
- when a body left behind mid-fight finally goes (linger.js `_lingerEnd`);
- when a second join takes over a live session (join.js, the eviction).

It keeps: the zone, the place, when it last judged a move there, what was left
of the move budget, the walk's speed limit (a speed potion, the move stat), and
the Wheel's way back.

The next join of that player is judged from it (lastplace.js
`_placeOnJoin`):

- **Same zone** (a dead connection, the app brought back, a dropped
  connection): the place the phone names is judged from the remembered one.
  The allowance is the fastest an honest phone can go while the server hears
  nothing from it: the walk's limit with a sprint (x1.33), because a sprint
  that sends no moves can't be billed. It covers all the time since, with no
  cap: a phone whose connection died walks on for up to 15 seconds before it
  notices.
  - Within the allowance, the place is taken.
  - Past it, the server puts them as far as the allowance reaches and follows
    the rest (the move budget's own rule: never refused, so nobody honest is
    ever held).
  - The move budget carries on from what was left, so a reconnect never buys a
    fresh 3 seconds of it.
- **Into the Wheel from another zone** (the phone came down the stairs while
  its connection was dead): judged as a way in is, from where they left the
  Wheel or from its arrival.
- **Out of the Wheel** (a reload: a fresh page starts in today's town): the
  place is taken, because nothing is farmed in today's town. The next way into
  the Wheel is judged from where they left it or from the arrival, whichever is
  nearer the place the phone names. A fresh page lands at the arrival; a trip
  the drop cut short comes back where it left.

And the first move after **any** join is judged from where the join put them,
even a first join's, when the join named a real place.

A death comes back in at the arrival too. The respawn puts the player in
today's town, and the phone comes back down the stairs to the Wheel's arrival
(respawn.js: never a dungeon's mouth). So the next way in is judged from the
arrival (movement.js `_moveRespawned`). In v2.3.3325 that was the one free way
in left.

The Wheel's arrival is 288 px south of its centre on both Wheels. The phone's
own table says so (src/game/worldTrial.js `WHEELS`), and the suite holds the
two together.

## What is not judged

- **A join with no remembered place**: the first ever, the first after a
  deploy or after the room emptied (the memory is in the room's memory only,
  rule 11), or more than an hour after the last leave. It is taken as before,
  and so is its first way into the Wheel. After a deploy an honest phone in a
  dungeon comes back out at its mouth, and judging that from the arrival would
  follow it across a land. Every test's new character also walks in where it
  is put.
- **A phone that draws a different Wheel from the one the room plays**
  (wheeltables.js `_wheelInStep`): its numbers are another map's, so the room
  leaves it alone here as it does everywhere else.

An hour is long enough. Within minutes the allowance covers the whole Wheel;
what an hour keeps is the Wheel's way back, so a reload's way in is judged. A
script that waits an hour for one free way in is no farming bot.

At most 480 places are kept (four times the room's cap of 120), oldest first
out. A character reset forgets its place.

## Measured

Server suite `last-place` (57 checks). I broke the code on purpose in 19
different ways and the suite caught every one.

The bot lab's new `rejoin` line (a new socket every 3 s, each naming a place
50,000 px further on, then a move 50,000 px more):

| | Before | After |
|---|---|---|
| A script reconnecting every 3 s | 33,333 px/s | **694 px/s** |
| An honest walk | 251 px/s | 251 px/s |

694 px/s is the fastest an honest phone can go while unheard (665), plus one
budget spread over the minute.

Honest reconnects taken exactly, every one:

- a dead connection, the old session still in the room, after ten seconds of
  walking on;
- a dropped connection, 5 s at the fastest honest stack (441 px/s);
- 15 s at the fastest stack, 15 s of it sprinting, and 15 s of it sprinting on
  the Swift Draught;
- standing still;
- a reload, then down the stairs to the arrival;
- a reload in a Wheel dungeon, then back at its mouth, or at the arrival;
- a dead connection on the farm, then out at the door it left by;
- a body left behind mid-fight, taken back from 250 px on;
- a second tab;
- a refused join's retry (judged from where the refused one was put).

## The switch

`lastplace: false` in the live flags is all of it as before:

- a reconnect lands where it says;
- the first move after a join is a first move;
- a death allows no arrival.

`movebudget: false` turns it off too (this rides on the budget).

`/api/admin/overview`'s `lastPlace` says how many places were kept at a leave,
how many joins were judged from one, how many of those were followed past the
allowance, how many joins had nothing to judge from, and how many places are
held now. `moveBudget` gains `arrival`: ways into the Wheel judged from its
arrival.

## Files

- `server/src/lastplace.js` (new): `LAST_PLACE`, `_lastPlaceOn`, `_placeOf`,
  `_placeRemember`, `_placeTake`, `_placeForget`, `_wheelArrival`,
  `_wheelEntryFrom`, `_placeOnJoin`, `_lastPlaceInfo`.
- `server/src/movement.js`: `_moveSpeedK` (the walk's two multipliers, shared
  with the join's judge), `_moveRespawned` allows the arrival, the way in reads
  `_wheelEntryFrom`, the overview's `arrival`.
- `server/src/join.js`: the session taken over (`_livePlace`), `_placeOnJoin`
  after the fresh state, and a refused join remembers where it was put.
- `server/src/index.js` (`webSocketClose`), `server/src/linger.js`
  (`_lingerEnd`): remember the place. `server/src/persistence.js`
  (`_resetCharacterData`): forget it. `server/src/admin.js`: the overview.
- `server/test/last-place.test.mjs` (new); `server/test/move-budget.test.mjs`
  §6 and §9 updated.
- `tools/qa/load/bot-lab.mjs`: the `rejoin` line.

Still not done (the review's note): the server has no map of water, walls or
buildings, so a script also walks through them.
