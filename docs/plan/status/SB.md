card: SB
branch: claude/plan-sb-1-ride
prs: PR 1 (6380, the ride measured): draft, CI
state: working

## Done

- PR 1 (6380): `ride` station in mp-heldsweep (+ `ridewalk`, asked for
  only); docs/plan/census/SB-ride.md; held-budget STATION_LINES.ride (12).

## Next

- PR 2 (6381, `?atlasrow=0`, row approved): paletteTex.js sends the one
  changed atlas row, not the whole 256 KB atlas (branch
  claude/plan-sb-2-atlasrow; mp-rideheld proves the chip's atlas
  byte for byte). Then PR 3: a piece's first upload ahead (`?groundsend=0`).

## Found

- The board outruns the ground on a slow machine: riding warm, 79% of
  pieces (budget-android), 37% (plain) came on screen unlaid (overview
  colours shown): wheelGround.js popIns; SB-ride.md. A thing seen: asked.
- stripRead.js lets its worker go after 4 s idle and makes it again:
  23.4 ms terminate, 16.9 ms new Worker on the ride (no card holds it).
- pack-page back over the line on the plain box (ridewalk, 18.6 ms x2):
  HB2's PR 5.

## Needs

- The planning session: the Found's first line (a later SB PR?).
