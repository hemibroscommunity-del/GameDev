card: K
branch: claude/plan-k-<n>-<topic> (one branch a PR, each begun from main)
prs: #1822, #1820, #1826, #1829, #1831, #1838, #1842, #1861 merged; ready: #1848 (5541, mended); 7.2 (5188); 7.3 (5189); 7.4 (5190); 7.5 (5191); 7.6 (5192) this branch
state: working

## Done

- PRs 1 to 6 (5181-5186) and 7.1 (5187, #1861, 203 -> 146): merged.
- Claims 5540 (#1842, merged): the archer's lane (`arrowlane`, ON).
- Claims 5541 (#1848): the sprint mark, OFF; review-z16's MEDIUMs mended.
- PR 7.2 (5188): life skills, the economy and the social game, 41 sends
  (146 -> 105); `nmlAsk.js` (3) waits for card T's #1863.
- PR 7.3 (5189): the networking files, 17 sends (146 -> 129).
- PR 7.4 (5190): the panels, 44 sends in 25 files (146 -> 102).
- PR 7.5 (5191): the sheets' 23 sends and 24 of 25 fetches; the route
  way sends today's bytes (a GET plain, the token only where read: `auth`).
- PR 7.6 (5192): BroTown.jsx's 17 sends and its fetch, and the ride key's
  send 7.1 left. 7.2 to 7.6 each lower the line from main's, taking main
  in as each merges; all in, 4 sends left (#1863's two files), 0 fetches.

## Next

- 7.2 to 7.6's scenarios (a sample, one a kind of send), then the PRs.
- `nmlAsk.js` once #1863 merges; then the guard strict (the gatekeeper).
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
