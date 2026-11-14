card: K
branch: claude/plan-k-<n>-<topic> (one branch a PR, each begun from main)
prs: #1822 (PR 1, ready), #1820 (PR 3, ready), #1826 (PR 6, ready), PR 5 tag 5185 (working)
state: working

## Done

- PR 1 (5181, #1822): `PRIVILEGED_EVENTS`, `RELAY.TYPES`, the echo list
  made from the wire table (`wire/lists.js`); column `privileged`. Deploys.
- PR 3 (5183, #1820): `wire-hostile.test` (10,524 cases), census
  `hostile.md`: 19 failing, the line. Deploys.
- PR 6 (5186, #1826): `claims-gain.test`, `claimbots.mjs`, census `claims.md`:
  reach 2.96, bow label 3.76, guard 1.37, cook shield 0.67, move 4.35,
  harvest 1.86, cook 1.59 (quest, sale, local 1); no honest refusal.
- PR 5 (5185): the action door, `src/game/actions.js` (180 rows); the
  shim reads them (pass-through, PRIORITY_EVENTS, SETTLED_SENDS); guard
  `action-door.test`, census 203 sends and 25 fetches.

## Next

- PR 5's questline; then PR 2 (5182) after PR 1 merges, PR 4 after 1 and
  3; the archer's lane and the sprint mark in the claims PRs (both ON).

## Found

- `movement.js` keeps 7 move fields as sent (hostile census, 16);
  `chatmod.js` stores a `__proto__` mute key (PR 4 mends it).
- `worldsum.js`: an honest restart reads as value gone (asked card R).
- `combat.js`: an archer stepping in between shots loses one to the 210 ms
  lane; `sprint.js`: `sp: 1` every other move costs no stamina (both ON).
- The page sends `clan_war_kill`/`clan_war_end` for an older worker; this
  one drops both (`legacy` door rows). `lib/systems.mjs`: the wire doors.

## Needs

- Card R: will it take the restart's burn (persistence.js)? Asked.
- PR 2 waits for PR 1's merge; PR 4 for PRs 1 and 3.
