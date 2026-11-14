card: K
branch: claude/plan-k-<n>-<topic> (one branch a PR, each begun from main)
prs: #1822, #1820, #1826 merged; ready: #1829 (PR 5) c0042a9, #1831 (PR 2) cfe57ce, #1838 (PR 4) ebde374, claims 5540 this branch
state: ready

## Done

- PR 1 (5181, #1822), PR 3 (5183, #1820), PR 6 (5186, #1826): merged.
- PR 5 (5185, #1829): the action door, `src/game/actions.js` (180 rows); the
  shim reads them; guard `action-door.test` (2b: `body: 'top'`), census 203
  sends, 25 fetches. Sitting 14's two notes mended (review-z14.md).
- PR 2 (5182, #1831): columns `fight`, `placed`, `muted`, `pace`, `watch`,
  `flag`; six lists made from them. Worker +137 KB (+19 gz).
- PR 4 (5184, #1838): the wire door (`wire/door.js`, `wiredoor`); hostile
  19 -> 1; questline and the bot lab refused nothing; chatmod's `__proto__`
  mute; the stale pointers. Waits for sitting 15's list (it meets #1829 and
  #1831), then main merged into it.
- Claims (5540, the second block 5540-5559): the archer's lane
  (`arrowlane`, ON): an arrow or bolt lets one claim in early; the stepping
  archer keeps every arrow (off: 6 to 11 lost in 4 minutes); a liar at the
  lane's pace takes the same on or off; the bot lab's bow aimbot +12%.

## Next

- Claims 5541: the sword's reach (index.js after card R's 5281; combat.js);
  then the move and the sprint mark (ON if the honest bots meet no refusal).
- PR 7 (5187-5192), the action door's moves, once #1829 is merged.
- `rideEnds` (ride.js) its own small PR when card SK says done.

## Found

- The page sends `clan_war_kill`/`clan_war_end` for an older worker; this
  one drops both (`legacy` door rows).
- `sprint.js`: `sp: 1` every other move costs no stamina (the move's PR).
- The bench's bow liar sent claims 200 ms apart and lost some to the plain
  floor's step; at 211 ms it took the lane's whole rate already.

## Needs

- Nothing waiting.
