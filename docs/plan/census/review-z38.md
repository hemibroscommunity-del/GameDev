# The gatekeeper's review, sitting 38 (card Z; tag 5676)

Taken 2026-11-17 on `main` 357eae05 (sitting 37 merged: SEC #2032, #2034,
#2037, #2038, #2040; K2 #2035, #2041; L #2039; Z #2044). SEC, K2 and L
were told this sitting's session at its start (18:00 UTC). Gathered 18:00
to about 19:05 UTC. Tags bare.

## Heads, merge bases and trees

Every listed PR is based on `main` (`base.ref`), open, with one merge base
at every step (`git merge-base --all`, each against `main` with the PRs
above it merged in as merge commits). The tree after each merge:

1 SEC #2042 4bad24e4c6c5ae3e481ff417aaeae24851febd9a -> fee7b5fe0c1fb2bdbd4d68899852c97bde014e3c
2 SEC #2043 883aa2174ddf512d5bee0cba47055dd924e2c437 -> 8c1ad6dbae5d12bb30ce2ec3d441886def3d1290
3 SEC #2045 753d7a5bcb3685f463b57de96e7e3ea910674eb5 -> 65b573267c2adf1f3ff405753cf1ae0aeaf5337b
4 SEC #2047 e4e1615e0a72d0835793fb065f8672c676cc19f0 -> 93de454647f8b6ef8e792e59cdb24289977e5efd
5 SEC #2049 4d0be77c5cf148adcc75785848df8f22677b769a -> fc51c7348f823ab6561a67b8ac0530a501dd6f2f
6 K2 #2048 5d33b4672d2824f33aef3a63e0c308f840c1dad2 -> 5747f5401c53eb1f3927e8595e457f9773650e0c
7 L #2046 1efd9cd64f958f5dbc48738715f4d49be6baedc0 -> c3c82cdb0734ee4248f21ea56a7bee94c827d339
8 Z #2050 (this PR): its head and tree are in the list (`status/Z.md`).

The bases, step by step: #2042 357eae05 (SEC merged `main` 357eae05 up
its stack at 18:01); #2043 4bad24e4 (#2042's head; each SEC PR holds the
one before); #2045 883aa217; #2047 753d7a5b; #2049 e4e1615e; #2048
357eae05 (K2 merged `main` in, its switch-table conflict resolved
`joinidform` then `joinplace`, each row its own line); #2046 357eae05 (L
merged `main` in after #2039); this PR 357eae05. One line each.

## SEC #2042 (5706): the feedback board keeps its hour for honest posts

READY (reviewed in full: `server/`), after a HOLD this sitting. Card SEC
PR 7.
- At fb16ff4f, held on two findings: one address could spend a kind's
  whole share (votes: share 30, one address 60; crash: 30 and 30), so one
  IP shut votes or crash reports for the hour, where `main` let no one
  address do it; and the switch `feedbackshare` was read only after the
  share had let a write by, so it could not release a full share.
- SEC's fix, 4bad24e4: shares posts 30, votes 45, crash 60 (still the 300
  rows of `ROWS_HOUR`); one address held to `SHARE_ADDR` (5, 15, 15) in
  the hour's row; `_boardOpen` read before the share. The plain sweep does
  what its words say; the trim past the newest 500 and the crash feed's
  clear are `DELETE /sweep?trim=1` (OPERATIONS). Re-reviewed: a crowd of
  1,200 addresses stops at 300 rows; one address reaches 5, 15, 15.
- For the owner: the whole game's posts an hour 60 -> 30 (the board has
  held a few hundred in its life); a post's text goes through the name's
  cleaner (a run past 6 cut). `feedbackshare: false` is the old way.
- No new row, no new write. DEPLOYS.

## SEC #2043 (5707): the public reads' pace has no side door

READY (reviewed in full). Card SEC PR 8; holds #2042. A header no longer
skips the kept answer and the pace on the market, store and arena (only
`/_room_health` passes); the four per-player reads paced by address,
never kept. Read against the three: none answers by the header; arena
`/status` keys on its `playerId` (kept so before). An honest phone reads
a few a second at most. Rides `publicreads`. DEPLOYS.

## SEC #2045 (5708): a guest that has done nothing writes nothing

READY (reviewed in full), after a HOLD this sitting. Card SEC PR 9.
- At 55dbe7ad, held on two findings: the quiet check sat before
  `_botfpMaybePut`'s `force`, so a quiet guest's flags and cap clamps (bot
  evidence) were never written, and a bot whose strikes are all refused
  stays quiet for good; and an id evicted from the quiet set (5000) or
  dropped by a join kept its session's `_lbAt` at Infinity, never
  reported after it earned.
- SEC's fix: a record holding evidence (`botfpEvidence`) is written quiet
  or not; an id leaves the set only through `_guestQuietEnd`; the leave
  drops it (`_guestQuietGone`) with its `_botfp` record unless evidence
  (the re-review's catch: the cache's eviction put the idle guest's row
  after all); the sweep keeps evidence rows; a second close guarded
  (753d7a5b, CI's fresh-start and roomrow). `guestquiet: false`. DEPLOYS.

## SEC #2047 (5709): a restart is one write; requests received a ceiling

READY (reviewed in full). Card SEC PR 10. `_resetCharacterData` read
line by line against the old: the same keys deleted (`farmorders:`
kept), the same seven caches forgotten, every delete issued with the
book's put and nothing awaited between (handoff rule 5); each a one-key
delete (no 128-key limit). `REQ_IN_MAX` 50, `target-full`, `reqincap:
false`. Note for SEC (its Found): received requests never expire, so 50
throwaways can fill an inbox. DEPLOYS.

## SEC #2049 (5710): a player's restore says what it would copy

READY (reviewed in full). Card SEC PR 11. At its first head, three
findings (a row where the player is `to` paying `price` left out; the
`ids` dropped; rows counted from the copy's day, not its time), fixed:
`givenSide`, `givenSince` (`exact` says when the time is the day's start).
Reads only (one `get` of `rpgsnap_at:`, at most 5 lists of 200, on the
owner's `/restore` only). No switch: nothing written. DEPLOYS.

## K2 #2048 (5722): a join that names no place stands where it was had

READY (reviewed in full). Card K2 PR 3. `_placeUnnamed`: a join with no
x/y stood at the remembered place (same zone), else the Wheel's way back
or arrival, its move clock set. Read against `src/`: the page's only join
(`wsClient.js` 759) and every tool's send x/y; a null, NaN or Infinity is
"no place"; a real 0,0 is claimed and untouched; a kept body and test mode
unchanged. Nothing a player sees. `joinplace: false`. DEPLOYS.

## L #2046 (5534): the life's page door

READY (reviewed in full: `src/`). Card L PR 5's page half, the life.
`dyingTo` (`die`, `seed`, `respawn`), the one writer of `S._dying` and
its note `S._deathStart`, in place of fourteen writes in six files; each
read for a reader between the old pair (none). The phase row `life`
`todo` -> `door` (5 -> 4 `todo`). Nit: the guard header's break proof is
numbered 49, above 47. Nothing a player sees. Only `server/test/` under
`server/`: DEPLOYS with the others.

## The rehearsal

REHEARSAL

## Z (this PR, 5676)

The phase table's line 6 -> 5 (`TODO_LINE`), the count on `main` 357eae05
after L's #2039 (`node tools/guards/phase-table.test.mjs`: 5 at the line
5). The plan noted for #2039 (5.3b). After #2046, sitting 39 lowers it to
4. Documents and the guard's one number: no deploy of its own.
