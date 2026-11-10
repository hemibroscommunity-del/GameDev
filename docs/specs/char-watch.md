# What players drew, for the owner to look at; and old leaderboard faces (v2.3.4490)

The owner, 2026-11-10: *"I think each character should have their basic info
saved somewhere on the server (like profile pic appearance - level - etc) I'm
assuming it's not because on the leaderboards there only placeholder initials
for the character profile pic. I also need profile pic and character images of
other players saved somewhere so I can monitor for anything inappropriate that
they drew in the custom character creator."*

## What was already there

- **Every character's basic info is saved.** `char:<pid>` holds its name, its
  whole look (every trait and all nine drawings) and the day it was made:
  written once, at creation, and the stored record beats whatever a phone
  says afterwards (identity.md, join.js). Its save (`rpg:<pid>`) holds the
  level and the rest.
- **The leaderboards draw a face from a look** since v2.3.4393
  (leaderboards.md), but a row gets its look when its record is SET, so a row
  set before that, by a player who had not been back, showed an initial.
- **Nothing showed the owner a drawing.**

## The drawings page (server/src/charwatch.js, src/ui/panels/DevWatch.jsx)

The Test panel (press and hold the zone name) has a "Player drawings" box,
beside Chat reports. Admin key only, like every lever (`devtools.js
_devFetch`).

- **Show player drawings** (`GET /dev/looks?before=&limit=`): every character
  that has drawn something, newest first, 24 at a time ("Show older ones").
  Each row: the face, the name, the day made, online or not, the id, and each
  inked drawing drawn from the stored record itself: a 16 x 16 picture, six
  times its size, on grey (white ink and black ink both show), named for
  where it is worn (Face, Back of head, Chest, Back, Arm, Shirt front/back,
  Trousers front/back).
- **NEW / Mark all seen** (`POST /dev/lookseen`): one mark in time
  (`artwatch_seen`). A drawing cannot change after its character is made, so
  "seen" is simply "made before the mark".
- **Remove drawings** (two taps; `POST /dev/lookwipe {playerId}`): the nine
  drawing keys leave the record, for everyone and for good. A record without
  a key is blank and `_stampRecordLook` drops the key from the join and from
  every relay, so no phone can put it back. Players who can see the character
  now are told at once (`player_update` with each key `null`, the peer
  merge's way of clearing one). Traits, name and colours stay. The record
  keeps when (`artWipedAt`); the act is in `admin_log`.
- **Freeze**: the admin surface's own (`POST /freeze`), for a player who
  should not come back in.

A read scans every `char:` record (as `/dev/apinfo` does): the owner's action,
never a player's. No cap and no kill switch: nothing here is a player's to
call.

What it does not do: the character's own phone may keep showing its own copy
of a removed drawing until its next login (which restores the record's blank
look); nobody else sees it from the moment it is removed. Names are shown but
not changed here (a bad name is a Freeze today).

## Old leaderboard rows get their face (boards.js `_boardsFaceFill`)

Once a worker's life, on its first report to the ranks, under `boards2`:

- the ranks' live rows that have no look (leaderboard.js `POST /faceless`,
  over the object binding only: the public route is read-only) are given the
  face their character's record draws (`POST /faces`). Never a row that has a
  look, and nothing else about the row: its `lastSeen` least of all;
- the biggest fish's rows the same way (`fishlog.js _fishBoardFaces`): a
  record stands until it is beaten, so an old one would have shown an initial
  for good. A deleted character's stand-in keeps what it had.

A row whose character has no record (a guest) keeps its initial. The level on
a ranks row was already worked out from its series; an old fish row has no
level to show.

## Proved

- `server/test/charwatch.test.mjs` (34 checks): the page, the door, seen,
  remove (the record, the live relay, a later `track`, a rejoin, the log),
  the face fill (ranks, fish, once, the switch).
- `mp-ownerwatch`: an artist joins with a face tattoo; the owner's phone sees
  it, the Test panel lists it cell for cell (56 inked cells of 56), Mark all
  seen clears NEW, Remove drawings asks first and then takes it off the
  record and off the artist on the owner's own screen with no rejoin.
