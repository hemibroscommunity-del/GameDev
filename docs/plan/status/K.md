card: K
branch: claude/plan-k-<n>-<topic> (one branch a PR, each begun from main)
prs: #1822, #1820, #1826, #1829, #1831, #1838, #1842 merged; ready: #1848 (5541, mended) this branch, #1861 (7.1, 5187)
state: ready

## Done

- PR 1 (5181, #1822), PR 3 (5183, #1820), PR 6 (5186, #1826), PR 5 (5185,
  #1829: the action door), PR 2 (5182, #1831: six lists made from the
  table): merged.
- PR 4 (5184, #1838, merged): the wire door (`wiredoor`); hostile 19 -> 1.
- Claims 5540 (#1842, merged): the archer's lane (`arrowlane`, ON); the stepping
  archer keeps every arrow. The bow cheats' rise (bowlabel 3.91, the bot
  lab's aimbot +12%) is for the bow claim's PR to bound, without costing
  the stepping archer an arrow (the planning session).
- Claims 5541 (#1848): the sprint mark, OFF (the owner: off for now).
  review-z16's two MEDIUMs mended on its ON path: a carried move billed as
  it moves if it needed the sprint; the sprint's bound only for what is
  billed; sprint.test §9. With it on, the move 4.35 -> 2.56.
- PR 7.1 (5187, #1861): combat and moving through act(), 57 of 58 sends (census
  203 -> 146); precheck reads an event through the door as a broadcast.
  Scenarios: jump, shieldgem, deathzones fail on main too (not this PR).

## Next

- PR 7.2 to 7.5 (5188-5191): the rest of the page's sends, a family a PR.
- The move's walls (movement.js); the sword's reach (index.js, after card
  R's 5281); the bow claim (bowlabel 3.91, the aimbot +12%).
- Lows: wire-table §7's cure in K's next list PR; door.js "by type".
- `rideEnds` (ride.js) its own small PR when card SK says done.

## Found

- The page sends `clan_war_kill`/`clan_war_end` for an older worker; this
  one drops both (`legacy` door rows).

## Needs

- Nothing waiting.
