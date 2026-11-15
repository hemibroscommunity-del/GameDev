card: K
branch: claude/plan-k-<n>-<topic> (one branch a PR, each begun from main)
prs: #1822, #1820, #1826, #1829, #1831, #1838, #1842, #1861 merged; ready: #1848 (5541, mended); 7.2 (5188); 7.3 (5189) this branch
state: working

## Done

- PRs 1 to 6 (5181-5186) and 7.1 (5187, #1861: combat and moving through
  act(), 203 -> 146): merged.
- Claims 5540 (#1842, merged): the archer's lane (`arrowlane`, ON).
- Claims 5541 (#1848): the sprint mark, OFF (the owner: off for now);
  review-z16's two MEDIUMs mended on its ON path; with it on the move's
  gain 4.35 -> 2.56, the honest sprinter unchanged.
- PR 7.2 (5188, branch claude/plan-k-7-2-life-act): life skills, the
  economy and the social game, 41 sends in 24 files (146 -> 105).
  `nmlAsk.js` (3) waits for card T's #1863, which changes it.
- PR 7.3 (5189): the networking files, 17 sends (146 -> 129); none left
  in src/networking/ but the door's transport. The second of 7.2 and 7.3
  to merge takes main in: the line is then 88.

## Next

- 7.2's and 7.3's scenarios (a sample, one a kind of send), then the PRs.
- PR 7.4 (5190, the panels), 7.5 (5191); `nmlAsk.js` once #1863 merges.
- The move's walls (movement.js); the sword's reach (index.js, after card
  R's 5281); the bow claim (bowlabel 3.91, the aimbot +12%).
- Lows: wire-table §7's cure in K's next list PR; door.js "by type".
- `rideEnds` (ride.js) its own small PR when card SK says done.

## Found

- The page sends `clan_war_kill`/`clan_war_end` for an older worker; this
  one drops both (`legacy` door rows).
- A kept quest hand-in gets a fresh request id on its rejoin send.
- One sprint step's bill is capped at 1 s (STEP_MAX_MS), on or off.

## Needs

- Nothing waiting.
