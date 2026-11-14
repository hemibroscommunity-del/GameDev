card: K
branch: claude/plan-k-<n>-<topic> (one branch a PR, each begun from main)
prs: #1822 (PR 1, merged), #1820 (PR 3, merged), #1826 (PR 6, ready), PR 5 tag 5185 (ready), PR 2 tag 5182 (working)
state: working

## Done

- PR 1 (5181, #1822, merged): `PRIVILEGED_EVENTS`, `RELAY.TYPES`, the echo
  list made from the wire table (`wire/lists.js`); column `privileged`.
- PR 3 (5183, #1820, merged): `wire-hostile.test` (10,524 cases), census
  `hostile.md`: 19 failing, the line.
- PR 6 (5186, #1826): `claims-gain.test`, `claimbots.mjs`, census `claims.md`:
  reach 2.96, bow label 3.76, guard 1.37, cook shield 0.67, move 4.35,
  harvest 1.86, cook 1.59 (quest, sale, local 1); no honest refusal.
- PR 5 (5185): the action door, `src/game/actions.js` (180 rows); the shim
  reads them (pass-through, PRIORITY_EVENTS, SETTLED_SENDS); guard
  `action-door.test`, census 203 sends and 25 fetches; questline 187/187.

## Next

- PR 2 (5182): fight, placed, muted, pace, watch, flag made from the table;
  then PR 4 (1 and 3 merged); the archer's lane and the sprint mark in the
  claims PRs (both ON).

## Found

- `movement.js` keeps 7 move fields as sent (hostile census, 16);
  `chatmod.js` stores a `__proto__` mute key (PR 4 mends it).
- `worldsum.js`: an honest restart reads as value gone (card R's PR 6).
- `combat.js`: an archer stepping in between shots loses one to the 210 ms
  lane; `sprint.js`: `sp: 1` every other move costs no stamina (both ON).
- The page sends `clan_war_kill`/`clan_war_end` for an older worker; this
  one drops both (`legacy` door rows). `lib/systems.mjs`: the wire doors.

## Needs

- Nothing waiting.
