card: K
branch: claude/plan-k-<n>-<topic> (one branch a PR, each begun from main)
prs: #1822, #1820, #1826, #1829, #1831, #1838, #1842, #1861, #1848, #1899, #1923 merged; ready: #1900 (5188, this branch)
state: working

## Done

- PRs 1 to 6 (5181-5186) and 7.1 (5187, #1861, 203 -> 146): merged.
- Claims 5540 (#1842, merged): the archer's lane (`arrowlane`, ON).
- Claims 5541 (#1848, merged): the sprint mark, OFF (review-z16, z18 mended).
- PR 7.2 (#1900), 7.3 pushed; 7.4-7.6 committed, after N10. `nmlAsk.js`
  and `LoginSpinWindow.jsx` wait for card T's #1863.
- 5542 (#1899): the chat lanes for MOD; wire-door.test §7's pin.
- N10 (5543, `relaybytes`, ON): a relay's bytes bounded three ways (one
  4 KB, a socket 2 KB/s, the queue 256 KB): the flood 2,417 -> 4 KB/s;
  honest census (questline, taptrade, firestart): no relay dropped.
  CHAT_LANES renamed CHAT_LANE_TYPES (sitting 19's LOW).

## Next

- #1900 (7.2) restacked on main b2d763a9 (race.js: raceTo 'ask' then
  act); then 7.3-7.6 (5189-5192) in order, each on the last; then N11, N5.
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
