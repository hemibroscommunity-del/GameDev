card: K
branch: claude/plan-k-<n>-<topic> (one branch a PR, each begun from main)
prs: #1822, #1820, #1826: merged; ready: #1829 (PR 5) c0042a9, #1831 (PR 2) cfe57ce, #1838 (PR 4) this branch
state: ready

## Done

- PR 1 (5181, #1822, merged): `PRIVILEGED_EVENTS`, `RELAY.TYPES`, the echo
  list made from the wire table (`wire/lists.js`); column `privileged`.
- PR 3 (5183, #1820, merged): `wire-hostile.test` (10,524 cases), census
  `hostile.md`: 19 failing, the line.
- PR 6 (5186, #1826, merged): `claims-gain.test`, `claimbots.mjs`, census
  `claims.md`; no honest refusal.
- PR 5 (5185, #1829): the action door, `src/game/actions.js` (180 rows); the
  shim reads them; guard `action-door.test` (2b: `body: 'top'`), census 203
  sends, 25 fetches. Sitting 14's two notes mended (review-z14.md).
- PR 2 (5182, #1831): columns `fight`, `placed`, `muted`, `pace`, `watch`,
  `flag`; six lists made from them. Worker +137 KB (+19 gz).

- PR 4 (5184, #1838): the wire door (`wire/door.js`, `wiredoor`): the router and
  the room's routes (GameRoom.fetch: the planning session's yes); hostile
  19 -> 1; questline 187/187 and the bot lab refused nothing; chatmod's
  `__proto__` mute mended; the stale pointers (systems.mjs, CLAUDE.md §5/§8).

## Next

- PR 7 (5187-5192), the action door's moves, once #1829 is merged.
- `rideEnds` (ride.js) its own small PR when card SK says done; the archer's
  lane and the sprint mark in the claims PRs (both ON).

## Found

- `combat.js`: an archer stepping in between shots loses one to the 210 ms
  lane; `sprint.js`: `sp: 1` every other move costs no stamina (both ON).
- The page sends `clan_war_kill`/`clan_war_end` for an older worker; this
  one drops both (`legacy` door rows).

## Needs

- Nothing waiting.
