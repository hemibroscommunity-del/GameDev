# The gatekeeper's review, sitting 12 (card Z; tag 5369)

Taken 2026-11-14 on `main` at 9fd5e580 (tree 2836f0c7, sitting 11's
sixteen merged). Tags in this file are written bare. Each PR that changes
`server/` or `src/` had a finder read the code around its diff (the angles
of `/repo-review` that apply) and try to disprove what it found; the
gatekeeper read the code itself for every candidate that decides a hold.
Documents and tools got step 3.

VERIFIED: the story runs, on the code path named (a finder's probe in a
throwaway copy, or a reading). PLAUSIBLE: the code does it, what sets it
off is unproven (it says what would settle it). The probes are not in the
repository.

DRAFT: filled in as the sitting goes.

## Card LB: #1798 (PR 3, tag 5502), read at 89092ea: clean (lows)

Overall (ranked by Power), the "Power?" hint, the Stats group (card PW's
eight boards), `power` and `statboards` each on its own `CAP_GATES` line,
their allowlist rows gone from `caps-audit.test` (it DEPLOYS: a test
only, the same worker). Deploy order, probed with the branch's own
`boardList`: caps `{}` show no Overall and no Stats; `statboards` 3 shows
three, 9 the eight it knows, 0 none (each gate by the cap's value, TRAPS
§9); a main phone reads neither cap. `caps-audit` still fails an unread
cap without the allowlist rows (a break tried). The hint's words are true
(`power.js`: 3000 + 400 x log10(odds)); the worker's stat order is the
phone's; the icons are the Bro tab's own files; the "?" is 44 px with
`touch-action: manipulation`.

- VERIFIED by reading, low: the hint stays open after the swap
  (LeaderboardPanel.jsx ~566 against ~504: the "?" shows on the Power view
  only, the line whenever `hint` is set): swap back to close it.
- Low: no test runs the board list without the caps now (mp-boardslook 1b
  wants `power >= 1`, `statboards === 8`); Overall, opened first, reads
  "Nobody has trained this yet." until a board report carries the index
  (up to the 10-minute heartbeat); stale comments (~547 "1 today", ~93).
- PLAUSIBLE, low, for later: the count gate breaks when a ninth stat is
  added before `dmg` (`statboards.js` puts the shared stats first): a new
  phone on an old worker would ask for a board the worker has not got.
  Add new stats after `dmg` on both sides, or gate by ids.
- For the owner (not a hold): on Overall a style with no weapon in that
  hand prints "0"; the Stats group's "Speed" is moving speed where the Bro
  tab's weapon "Speed" is attack speed (`prog3.js` names "Haste" as the
  fallback).
- Suites: caps-audit, statboards, wire-audit, mirror-audit, power. CI
  green at 89092ea.
