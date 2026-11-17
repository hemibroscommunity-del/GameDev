card: K
branch: claude/plan-k-<n>-<topic> (one branch a PR, each begun from main)
prs: #1822, #1820, #1826, #1829, #1831, #1838, #1842, #1861, #1848, #1899, #1923 merged; ready, in order: #1900, #1931-#1934 (5188-5192); N11 (5544) this branch
state: working

## Done

- PRs 1 to 6 (5181-5186) and 7.1 (5187, #1861, 203 -> 146): merged.
- Claims 5540 (#1842, merged): the archer's lane (`arrowlane`, ON).
- Claims 5541 (#1848, merged): the sprint mark, OFF (review-z16, z18 mended).
- 7.2 (#1900) 146 -> 105, on main b2d763a9; each next on the last: 7.3
  (5189, src/networking/) -> 88; 7.4 (5190, the panels) -> 44; 7.5 (5191,
  the sheets, 24 of 25 fetches) -> 22; 7.6 (5192, BroTown.jsx's 17, its
  fetch, the ride key's) -> 4 sends, 0 fetches. The 4: `nmlAsk.js` and
  `LoginSpinWindow.jsx`, after card T's #1863; then the gatekeeper's strict.
- 5542 (#1899, merged): the chat lanes for MOD; wire-door.test §7's pin.
- N10 (5543, #1923, `relaybytes`, ON): a relay's bytes bounded three ways.

## Next

- N11 (5544, `heapforget`, ON): the room forgets who left (heapforget.js,
  HEAP_FORGET: six maps; a strike's strings to 64); 7 KB -> 1.5 KB a guest.
  Then N5 (a room-wide ceiling on messages in), 5194/5196/5197.
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
- accuracy.js `_accBook`: a guest's clean entry goes only at the next write.

## Needs

- Nothing waiting.
