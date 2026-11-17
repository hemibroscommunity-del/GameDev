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

## Mended (v2.3.5612), still OFF

Sitting 19b's review found these; v2.3.5612 mends them. `seathold` stays
OFF until the owner's word (it writes).

- **MEDIUM. The gate could not tell a holder from a stranger**: at a full
  room, strangers' sockets filled the held slots while their joins were in
  flight (with 2,000 waiting, about 2 in 3 blipped players still lost the
  seat). Now the phone names its seat on the socket's address,
  `&seat=<its id>` (`wsClient.js`; a worker from before ignores it). The
  gate (`_seatGate`) lets a socket that names a held seat in on the held
  slots, one socket a seat, and a stranger only while every socket in the
  room plus the held seats is under the cap. A socket let in on a seat must
  join with that id or is refused `room_full` (an id is public: a false
  claim gets nothing, and the hold is not used up).
- **MEDIUM-LOW. Two strangers at once could pass the cap**: a stranger's
  join now counts every other socket in the room, joins in flight too.
- **LOW.** The roster keeps the held seats with their ends
  (`{ v: 2, in, held }`), so a second restart within a hold keeps it; it is
  written once more as the room empties (its tick stops), so a room started
  after the holds ran out holds nobody. The refusal's count says the seats
  taken (inside and held), not the sockets ("1 / 3 inside" at a room of
  holds).
- **Not mended here:** a voluntary leave still holds 60 s (the worker cannot
  tell a closed tab from a blip); the switch is a lever, so
  `switches-thrown` never throws it, and ON, `cost-guard`'s check 8 counts
  its write (card T's).

A phone from before (no seat on its address) is let in as a stranger would
be: with the switch on, its seat is held for nobody.

## What (`server/src/seathold.js`), with `seathold: true`

- A JOINED player whose socket closes or fails (a drop: never a kick, the
  AFK sweep, a flood or a reset) holds their seat for 60 s.
- The room keeps who is in as one key, `seats`, written by the tick at most
  every 15 s and only when it changed. A room that starts (a deploy) reads
  it once, at its first request, and holds those seats for 30 s.
- The socket gate lets in a socket naming a held seat up to cap + held, a
  stranger while sockets + held < cap (v2.3.5612); the JOIN refuses an id
  that holds no seat once the free seats are gone (sockets + held >= cap),
  with the same `room_full` and close 4009 a phone already reads on an open
  socket. It refuses before the account, the device or any record is read
  or written, so a refused stranger leaves nothing.
- A held id joined again is not counted twice. Ids are public, so a stranger
  may name a held one: that join goes on to the account and device checks
  and is refused there; the hold is not used up.

## Built OFF

On only when `seathold` is `true` (the Test panel's Set a switch). On, it
writes at most one small row every 15 s while who is in changes, and one
as the room empties: 5,760 a day at the very most from the tick, about 17 cents a month at Cloudflare's $1 a million;
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

`server/test/seat-hold.test.mjs` (v2.3.5612: the gate telling a holder from
a stranger, one socket a seat, a seat's own join, joins in flight, the
refusal's count, the roster's held seats and its last write; off by default; the hold, its refusal
writing nothing, the held player back in, the expiry, a kick and the AFK
sweep holding none, the gate's count, the cap, the roster's pace and its
reading after a restart).
