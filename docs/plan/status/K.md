card: K
branch: claude/plan-k-<n>-<topic> (one branch a PR, each begun from main)
prs: #1822, #1820, #1826, #1829, #1831, #1838, #1842, #1861, #1848, #1899, #1923, #1900, #1931-#1934 merged; ready: #1942 (N11, 5544), #1949 (N5, 5545, this branch)
state: ready

## Done

- PRs 1 to 6 (5181-5186) and 7.1 (5187, #1861, 203 -> 146): merged.
- Claims 5540 (#1842, merged): the archer's lane (`arrowlane`, ON).
- Claims 5541 (#1848, merged): the sprint mark, OFF (review-z16, z18 mended).
- 7.2-7.6 (#1900, #1931-#1934, sitting 21): census 146 -> 4 sends, 0
  fetches; the 4 (`nmlAsk.js`, `LoginSpinWindow.jsx`) after T's #1863.
- 5542 (#1899, merged): the chat lanes for MOD; wire-door.test §7's pin.
- N10 (5543, #1923, `relaybytes`, ON): a relay's bytes bounded three ways.

## Next

- #1942 N11 (5544, `heapforget`): the room forgets who left.
- #1949 N5 (5545, `roomceiling`, ON): the room's ceiling, 4,000 messages in a
  second; past it a socket over its share is dropped, then closed.
  Then 5194/5196/5197 (after MOD's market.js PR).
- The move's walls (movement.js); the sword's reach (index.js, after card
  R's 5281); the bow claim (bowlabel 3.91, the aimbot +12%).
- Lows: wire-table §7's cure; door.js "by type"; `rideEnds` (SK is done).

## Found

- The page sends `clan_war_kill`/`clan_war_end` for an older worker; this
  one drops both (`legacy` door rows).
- A kept quest hand-in gets a fresh request id on its rejoin send.
- One sprint step's bill is capped at 1 s (STEP_MAX_MS), on or off.
- The guard reads literal names: sendFriend's had no row, and a fetch of
  a URL in a variable went uncounted (both moved in 7.5).

## Needs

- Nothing waiting.
