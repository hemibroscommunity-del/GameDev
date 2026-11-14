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

## Card O: #1794 (tag 5224) and #1800 (tag 5225): the next batch

Not on today's list (the planning session, 18:00: O's three and T's two
go to the next batch, after today's list lands and #1792 merges the new
`main`). Read at e3ae788, then again at the heads that moved during the
sitting (#1792 723dc0b, #1794 70dc592, #1800 6d46f97: `main` merged and
the `ladder` row on `DOOR_SUITES`; O's own files unchanged but
`switches.mjs`). Probes: the suite's own model.

- **Sitting 11's hold on #1794, VERIFIED mended across sittings.** A rung
  kept by an older build loads as the lane's row (its live set,
  `v[2] !== liveKey()`); a kept `[0,6]`, `[3,0]` or `[3,6]` is back at 60
  in one try, 21 s (§19c, green on both heads).
- **#1800, VERIFIED (probe, and read by the gatekeeper), medium: a pixel
  rung holds a cooled phone at 30 until the next veil.** On today's ladder
  the live chip rungs are the rate (1), then the pixels (5, 6); the
  pixels' try up waits for a veil, and while it waits the other axis may
  try only if it has a rung (framePacer.js ~571: `r.work` is 0, so it
  returns): the rate cannot come back first. A 60 phone that cannot keep
  30 takes the rate at ~75 s, the pixels at the 6-minute veil, is cool
  from minute 9, and stays at 30 with 0.75 of its pixels until the next
  veil, in the Wheel perhaps the rest of the sitting. Sitting 11's
  "pending stops every other" in a new shape.
- **#1800, VERIFIED (probe), medium: a pixel step wanted before the tab
  is hidden is taken on its return, however long it was away** (only a
  verdict drops a pending step, ~543/~560; none while hidden; a return is
  a veil). Mend: drop a pending step when the tab hides.
- **#1800, VERIFIED (probe), medium: a phone whose own work is the cost
  still reaches the pixel rungs** (`if (!down(first)) down(other)`: the
  crowd's rungs are not live until O's PR 6, so a work-bound phone falls
  to the chip axis after the rate). The spec and `renderRes.js`'s header
  say the owner's iPhone never goes there; today it can.
- #1800, VERIFIED (probe), low-medium: `?ladderrate=0` and `?ladderpix=0`
  leave their rungs live for the governor: with `?ladderrate=0` a slow 60
  computer is never paced but its picture softens at the next veil (the
  off-ramp of #1794's decision trades a steady 30 for a softer picture);
  with `?ladderpix=0` the governor takes a pixel rung nothing reads, and
  its try up then holds the rate (sitting 11's class).
- #1800, low: the pixels' listener dispatches `resize` in the frame
  (renderRes.js `onKnob`): BroTown's `resize()` reads `clientWidth` and
  `getComputedStyle`; at a tab's return that is one frame in play (§7).
- On screen, not under #1800's "Decided for the owner while away" (it has
  no such heading): answer (b) softens a computer too (a slow laptop:
  0.75, then 0.5 of its pixels at its loading screens); answer (A) departs
  from the card's "the next sitting starts there". `ladder: false` (tag
  5235) is not yet built: until it is, nobody can turn the governor off
  for every player without a deploy.
- Clean: both new `?name=` rows; `?pixbudget`, `?res=`, the Speed test's
  `res2` as described; the crowd's shared picture frees itself on a
  resolution change; `mp-governor` reads its slow CPU before putting it
  back. Suites: frame-pacer 113 (e3ae788, 6d46f97), 112 (70dc592);
  render-res 40; switches (359 rows), draw-lanes, phase-table green at
  6d46f97.
