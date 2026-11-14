card: K
branch: claude/plan-k-<n>-<topic> (one branch a PR, each begun from main)
prs: #1822 (PR 1, ready), #1820 (PR 3, ready), #1826 (PR 6, ready)
state: ready

## Done

- PR 1 (5181, #1822): `PRIVILEGED_EVENTS`, `RELAY.TYPES`, the echo list
  made from the wire table (`wire/lists.js`); column `privileged`. Deploys.
- PR 3 (5183, #1820): `wire-hostile.test` (10,524 cases), census
  `hostile.md`: 19 failing, the line. Deploys.
- PR 6 (5186, #1826): `claims-gain.test`, `claimbots.mjs`, census `claims.md`:
  reach 2.96, bow label 3.76, guard 1.37, cook shield 0.67, move 4.35,
  harvest 1.86, cook 1.59 (quest, sale, local 1); no honest refusal.

## Next

- PR 5 (5185) if the planning session says yes while SK's #1782 is held
  (asked); PR 2 (5182) after PR 1 merges; PR 4 after 1 and 3.

## Found

- Six suites read `PRIVILEGED_EVENTS` from index.js's source; PR 1 reads
  the Set (the planning session's yes).
- `lib/systems.mjs`: the wire doors still name index.js and relay.js.
- `movement.js` `_handleMove` keeps 7 fields as sent (hostile, 16).
- `chatmod.js`: a mute of `__proto__` stored as an own key (PR 4 mends).
- `worldsum.js`: an honest restart reads as value gone with no burn.
- `combat.js` monster lane: an archer stepping in between two shots lands
  both inside 210 ms; the second is dropped (honest play).
- `sprint.js`: every other move marked `sp: 1` keeps the 1.33 bound with
  no stamina spent (the move's liar).

## Needs

- Card R: will it take the restart's burn (persistence.js)? Asked.
- PR 2 waits for PR 1's merge; PR 4 for PRs 1 and 3.
