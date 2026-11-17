# The gatekeeper's review, sitting 24 (card Z; tag 5662)

Taken 2026-11-17 on `main` cfcd70b (sitting 23 merged). The owner asked
for speed: the PRs in hand reviewed and listed now, one reviewer a group
of PRs that change the game (the seven angles of `/repo-review` in one
pass, each candidate tried before it is reported). Later arrivals go to
sitting 25. Tags here are written bare.

## Heads

Every head in hand was behind `main` at the start; each session merged
cfcd70b in and sent a new head. Four collisions were found by merging
the heads in order, and mended by stacking (each base stays `main`; each
lower head already holds cfcd70b, so one merge base at every step):

- J2 #1964 on #1953 (`status/J2.md`);
- L #1956 on P #1963 (the switch table keeps its rows in name order, so
  `?uploadicons` and `?veildoor` are neighbours in `switches.js` FORMS and
  `tools/guards/lib/switches.mjs`);
- OPS #1951 > #1957 > #1966 > #1968 (`status/OPS.md`).

MOD's three and R #1960 merge clean in any order.

REHEARSAL

## J2 #1953 (5642) > #1964 (5643): the tests'

`mp-blockface` 2 photographs the picture's own box; `mp-petsmatter` 5
reads the chill from the worker's `FREEZE.CHILL_MS`. Card check only.

## T #1958 (5310): eleven reads into the page's one reader

READY. Each moved read compared with its old regular expression on 23
addresses a name (absent, `?x`, `=`, `=0`, `=1`, `=off`, `=false`, look-alike
names): identical. They differ only on addresses nobody types (a repeated
name, `=%30`, `?dev=1.5`). No read changes when it is made. The outside
line 212 -> 201.

## P #1955 (5566, `?hudbars`) > #1959 (5567, `?deathstrip`) > #1963 (5569, `?uploadicons`)

READY, each a memory saver ON with its `=0`. No CPU read of colour
numbers; the bars' crop is a Texture over the same source; frame widths
as before (death 2688/21, block 273); tints white; twins' alpha identical,
padding transparent; flag off is Pixi's own loader. `artCache` only
down: 83.0 -> 81.9 -> 80.5 -> 79.3. Lows:
- `buffers` reads 24.1-24.2 against its line 24.2: no headroom, the next
  PR's mp-membudget may go red on noise. For the owner.
- #1955/#1959's rows say `on: 2026-11-15`; #1963 sets all four to 11-17
  (right if the three merge together).
- P's status file names #1943 twice, "5569 ready" without #1963.
- hud-bars and icons-from-uploads-world load in entityRenderer.js (card
  H's file, not touched): the census marks them "after H".

## L #1956 (5525, `?veildoor` ON): the loading door

READY. `veilTo` writes each old field first with the old value, then reads
the switch; its 12 callers name their reasons literally; nothing else
writes the five fields or `_veils`; the overlay's show and hide are
untouched. Flag off: main's fields exactly (`S._veils` is only kept, no
reader). No load moved. Low: allyDrafts' `_drafts` still unlisted (census
21 against 22), from #1946.

## O #1952 (5239): a failed fill, glint or clip falls back alone

READY (last sitting's hold answered). With the fix (40f0b1b6), a failed
clip self-test sets `_selfOff` and `reclipAll()`; `clipRoute` sends a
picture mask to the alpha mask and a colour-number mask to the STENCIL,
drawn by `bt-palette-hairclip` (the palette's program, not the one that
failed). So the hats' and hoods' colour-number hair masks never reach the
alpha mask, and do not go back onto the failed program. The verdict
lands behind the loading screen (`selfTestReady`); a clip passed is
main's. Note for the owner: `bt-palette-hairclip` and the stencil have no
self-test of their own (same discard line); on the default page a failed
clip moves no hair at all ("drawn as today"). Lows: hairClip's `_selfOff`
belongs in `src/state/look.js` (it takes 1 of 2 rows under the line 22);
self-test.md part 15, mp-selftest page 13's header and LANES.md /
drawLanes.js `back: 'the alpha mask'` describe the old fallback.

## RT-1 #1940 (5584, `ip56`, `offdevs` ON)

READY with lows. The /56 key is right (first three groups and the fourth's
top byte); `::ffff:a.b.c.d` is IPv4, no /56. The login door's 20 tries
hold; a try refused at the /64 counts in neither. The old-key recipe came
out of comments and specs only: every saved key works. Lows:
- With `devicelock` thrown off and `offdevs` ON, a refused join still
  writes: a frozen character's right key from a new device records the
  device (one `auth:` put), then the join is refused `frozen` (also before
  `_sigReverifyOk`, `_charNameRefuse`). With `freezedevice` on, that id
  joins the frozen devices: a key holder could freeze ids of their choice
  (ids are not broadcast, so no honest phone is reachable today).
- For the owner (reproduced): with the lock off, a key holder joining 12
  times with made-up ids pushes the player's phone off the 12 list; the
  lock back on refuses the player `device`. `offdevs: false` keeps the
  list. Old keys are not secret (RT-1 N1). Cost: one `auth:` put per
  character and unlisted device, only while `devicelock` is off.
- A /56 shared by many customers (a carrier's pool, a VPN exit) now shares
  48 sockets a room, 60 opens and 60 login tries a minute; `ip56: false`.
- No card or status file for RT-1: the PR body is the reference.

## R #1960 (5294): the tolerant weapon reader

READY; safe to deploy alone. #1873's `GID_RE` is byte for byte #1960's;
weapons never carry `prov`, gear always does. With #1960 alone, a weapon
#1873 wrote survives the join's bag and hands (v21, and v22 let in by
`newersave: false`), the mail claim (every escrow payout: market, store,
trade2, No man's land), going into escrow, and the market's unwind; none
is doubled. Today's saves unchanged (no weapon carries a `gid`; gear in
the weapon bag still carries `prov` and is still dropped). The suites
named pass. For #1873's later sitting: both add `export const GID_RE`
(keep one), and `worldsum.js:90`'s double count is open.

## MOD #1962 (5628) > #1967 (5629), and #1954 (5627)

READY with lows. #1962: `to`/`tos` never stored (picks cut to `{text, ts,
zone, lane}`); the ring bounded (50 hearers a line, 20 lines, 240
speakers); a repeat friend request answered (it can follow only the
target's decline). #1967: `heard` needs the target in `chatSeen`, which
only the server's stamp writes: a reporter cannot plant an id; one
`chat_report:` put a report under the old gates. #1954: `ownerdev:` is in
the registry and STORAGE_MARKS, written only by a test-mode join that
passed its key. Lows:
- The Test panel shows only a report's last 3 lines and never `said`
  (`DevPanel.jsx:1638`; since #1909): the whispers are kept but not shown.
- Ten harmless whispers after two abusive ones still push the abuse out.
- For the owner: `ownerdev:` has no way to lift a mark: a phone the owner
  tested on once is spared every freeze for good. Cost: one get per
  test-mode join per device per room life, one put per device ever,
  written even with `freezedevice` OFF.
- The name fold now refuses "Moci" as a new name (the `together` reorder).
- MOD's status names #1909/#1914 as waiting (merged); `reportring`'s off
  text does not mention `said` or the record-less guest.

## OPS #1951 (5607) > #1957 (5613) > #1966 (5612) > #1968 (5614)

READY with lows. #1951: no new route, every page behind the admin key; a
cursor is at most 200 characters and moves forward only; every list 200 or
fewer. #1957: `_prDrop` after the store's offer, cancel and reply and the
arena's sponsor; nothing kept with `publicreads` off. #1966: every new
path returns first when `seathold` is off; an old worker reads the new
`seats` as nothing. #1968: docs and the `guestlazy` row's day. Lows:
- #1951, the deploy window: a cached old Test panel on the new worker
  reads page 1 only ("Nobody has drawn anything yet."); reload mends it.
  The AP lookup reads up to 250 pages (50,000 rows; was 20,000), on a tap.
- #1966, before `seathold` is ever ON: the seat claim is unproven (the
  first socket naming a dropped player's public id takes the seat); a
  socket let in on seat X whose join names another id is refused
  `room_full` with seats free. A seat ticket handed out at the join would
  mend both. One more write as the room empties, when ON.

## Arrived after the review closed (sitting 25)

O #1970 (5232), MOD #1971 (5630), K #1972 (5194), R #1969 (5295). Each
merges the new `main` first. R #1873 (save shape 21 -> 22) after #1960 is
deployed.
