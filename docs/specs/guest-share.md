# A guest's share of the places, and a played character's seat (v2.3.5729)

Card K2 PR 10. A switch, `guestshare`, **ON**: decided for the owner while
away by the planning session, on the owner's words of 2026-11-17: *"For all
decisions waiting on me just go recommended."* `guestshare: false` turns it
off.

## Why

The room has 120 places (`MAX_PLAYERS`, `max_players` lowers it), and they
went to whoever knocked first. A guest (a join with no key and no record of
one) costs a script nothing to make. Each address may hold 16 places
(`IP_SOCKETS`), so eight addresses could hold the whole room. An IPv6 line
counted by its /56 could hold 48 in each of its /56s, and a /48 has 256 of
them. A played character then waited outside behind a room of strangers.

## What it does

- **Guests hold at most half the places** (`GUEST_SHARE.SHARE`: 60 of 120,
  at least one). A guest's join past that gets the full room's answer:
  `room_full`, then close 4009. Nothing of it is stored.
- **A played character takes an idle guest's seat.** A played character is
  an id with a record whose key is right, not a character made just now. At
  a full room, its join moves the newest guest that has sent nothing for a
  minute (`IDLE_MS`). That guest gets the full room's answer and is closed
  4009, the same way out as the AFK sweep (leave.js `afk`). Its phone then
  knocks again, as it does on any full room. For this to work, the socket
  gate lets up to `SPARE` (4) sockets past the cap while the room holds an
  idle guest. A join on one of those that is not a played character's is
  refused `room_full`.
- **The share is decided before the key, the seat after it.** Before the
  key is checked (join.js `_guestSharePre`), a guest past its share, a
  guest on a spare socket and a key with no record on a spare socket (a
  fresh character) are refused. Nothing is read or written for them but,
  for a key, its `auth:` row (a read): the key's check writes a new
  character's row, so a refusal after it left one behind and made the
  phone's next knock a played one (sitting 43's review, F2). Only a key
  with a record on file goes on, and its seat is decided once its key is
  right (`_guestShareRefused`, after `_charNameRefuse`), so a wrong key, a
  lockout or a refused device moves no guest. With `seathold` on too, a
  keyed join at a full room goes on to these whenever a guest is idle.
- **An IPv6 address is also counted by its /48** (flood.js `ip48Key`, at
  `IP48.TIMES` (4) the line) in the room's two address limits. That is 64
  places and 80 opens a minute from one /48 at the defaults, under the
  room's 120. The login door's tries (account.js, card SEC's file) still
  stop at the /56.
- **Every address refusal is counted** for the owner's overview
  (`floodTally.ip`, admin.js, card SEC's tally; `floodtally`).

Nothing is written. A guest's mark (`session.guest`) lives in memory only.
The messages and the closes are the full room's own, which every phone
already reads (wsClient.js). A seat held for a dropped player (`seathold`)
counts as taken, and a join on a held seat is that switch's to judge.

## What a player sees

Below a full room, nothing changes. In a full room, a guest that has been
idle for a minute may be shown the full room's screen to make way for a
played character. A guest past the share sees the full room's screen, as it
would at the cap.

**Only on a spare socket** (v2.3.5732, card K2 PR 13). The share's
refusals past the cap apply only while a guest is idle, which is when the
gate opens spare sockets. With no guest idle, a join past the cap (a race at
the gate, or a suite's join made by hand) is judged as it was before
`guestshare`. The first version refused it, so with `seathold` thrown off,
seat-hold.test's held player and stranger got `room_full` (card CS's
report). `flood-guestshare.test` 8 holds it.

## The load benches

Their bots join as keyless guests, so each bench turns `guestshare` off
(`tools/qa/load/`: load.mjs through the flags route, join-bench, memprobe,
roster-bench, events-bench and load-wheel in the room's flags). With it on,
a cap of 140 let in 70 of 120 bots (sitting 43's review, F1).

## Tests

`flood-guestshare.test` (16 FAIL on main, and its two F2 checks fail on the first version of this PR; named for the wire system's `flood` word, so the switch guard plays it): the reader, the share, the seat given
way, the spare socket, the wrong key, the fresh character and the guest on a
spare socket, `seathold` with it, the /48, the tally, and the switch.

## Switch

On unless `guestshare: false` in the live flags. Thrown, guests may hold
every place, a played character waits outside a full room as before, and an
IPv6 address is counted by its /56 at the widest.
