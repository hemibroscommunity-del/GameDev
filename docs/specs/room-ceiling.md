# The room's ceiling on messages in (v2.3.5545)

The red team's RT-1, finding N5; card K. Each socket has its own budget
(`flood.js` `FLOOD.MSG_PER_S`, 120 a second, a burst of 300), but nothing
bounded the room: a full room of sockets each inside its budget was about
14,400 messages a second, every one taken. On Cloudflare's free plan that
spends the day's Durable Object requests in about 2.5 minutes.

## What it does

`flood.js` `_floodRoomOver`, asked first for every message in:

- The room counts every message in, by the second, and so does each socket.
- Under `FLOOD.ROOM_MSG_PER_S` (4,000 a second) nothing changes.
- Past it, a socket over its **share** (4,000 / the room's sockets: 33 in a
  full room of 120) has the rest of its second dropped. A phone under its
  share never loses a message: 120 phones fighting beside someone send
  about 30 a second each, 3,600 together.
- The drops count as the socket budget's own do, so a socket that keeps it
  up is closed with `CLOSE_FLOOD` (more than 600 dropped in 10 s). RT-1's
  100 sockets at 118 a second are each closed within 10 s.
- A second takes at most twice the ceiling: the ceiling, then each socket
  its share.

## The switch

`roomceiling: false` in the live flags: no ceiling, as before (N5 open
again).

## What holds it

`server/test/flood-ceiling.test.mjs` (its break proofs in its header).

## Not done here

- One line holding many sockets: the address limits (`flood.js` part 4,
  IPv6 counted by its /64 since RT-1's N4).

## A share never under the honest rate (v2.3.5728, card K2 PR 9)

The share was the ceiling over the room's sockets: at 120 sockets, 33 a
second, where a crowd fight's honest phone sends 35 to 40 (card K's census on
#1949). So a flood that held the room past its ceiling took messages from
honest phones too, and those drops counted toward their close. Now a
socket's share never falls under `FLOOD.HONEST_PER_S` (45 a second): the
ceiling drops only a socket past what any honest phone sends. A full room's
second is still under twice the ceiling (120 x 45 = 5,400).
`flood-ceiling.test` §6: 60 phones at 40 a second beside 60 flooders lose
nothing (on main they lost 5,040 of 28,800 in 12 s).

When a flooder is CLOSED (MSG_CLOSE_AFTER) is unchanged: card K's Found on
#1949, the owner's question.

Also (v2.3.5728): §4 of the suite runs on the test's clock. On the machine's,
the wall second could turn mid-check, the check passed by its escape, and
`roomceiling`'s listed fail did not fail on CI (card SEC's report).

`ceilfair: false` in the live flags: the plain share, as before.

