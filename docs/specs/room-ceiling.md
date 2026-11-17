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
