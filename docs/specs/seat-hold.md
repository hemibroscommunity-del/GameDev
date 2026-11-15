# A seat held for the player who had it (v2.3.5606, card OPS PR 7)

Red team RT-2, F1 (`docs/security/rt2-findings.md` on #1867).

## Why

The cap's gate counted sockets and knew nothing of who had just been
inside. When the world is full and people are waiting:

- **a deploy** restarts the room and drops every socket; a player's phone
  comes back after 1 s, a waiting phone on its own 4-6 s clock, and whoever
  knocks first gets the seat;
- **one phone's blip** (iPhone Safari drops the socket whenever the app goes
  to the background) is the same race for that one seat.

## What (`server/src/seathold.js`), with `seathold: true`

- A JOINED player whose socket closes or fails (a drop: never a kick, the
  AFK sweep, a flood or a reset) holds their seat for 60 s.
- The room keeps who is in as one key, `seats`, written by the tick at most
  every 15 s and only when it changed. A room that starts (a deploy) reads
  it once, at its first request, and holds those seats for 30 s.
- The socket gate lets in up to cap + held sockets; the JOIN refuses an id
  that holds no seat once the free seats are gone (joined + held >= cap),
  with the same `room_full` and close 4009 a phone already reads on an open
  socket. It refuses before the account, the device or any record is read
  or written, so a refused stranger leaves nothing.
- A held id joined again is not counted twice. Ids are public, so a stranger
  may name a held one: that join goes on to the account and device checks
  and is refused there; the hold is not used up.

## Built OFF

On only when `seathold` is `true` (the Test panel's Set a switch). On, it
writes at most one small row every 15 s while who is in changes: 5,760 a
day at the very most, about 17 cents a month at Cloudflare's $1 a million;
a quiet room writes nothing. A pace that writes more is the owner's word.

## Measured (local runtime, cap 6, 30 waiting, `seatrace.mjs`)

| | seated players still in after |
|---|---|
| a restart (the deploy's cut-over), off | 1 of 6 |
| a restart, on | **6 of 6** |
| three phones' 1 s blip, off | 3 of 6 (the three lost) |
| three phones' 1 s blip, on | **6 of 6** |

(At a write pace of a minute, the restart kept 1 of 6: the roster missed
everyone who had joined in the minute before the deploy. Hence 15 s.)

## Tests

`server/test/seat-hold.test.mjs` (off by default; the hold, its refusal
writing nothing, the held player back in, the expiry, a kick and the AFK
sweep holding none, the gate's count, the cap, the roster's pace and its
reading after a restart).
