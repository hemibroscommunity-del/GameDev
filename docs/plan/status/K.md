card: K
branch: claude/plan-k-<n>-<topic> (one branch a PR, each begun from main)
prs: PR 1 tag 5181 (built, waits on a question), #1820 (PR 3, ready)
state: ready

## Done

- PR 1 (5181, claude/plan-k-1-wire-lists): `PRIVILEGED_EVENTS`,
  `RELAY.TYPES` and wire-audit's echo list made from the wire table
  (`server/src/wire/lists.js`); the column `privileged` (`echo` on 9 rows);
  the literals deleted, each type's why moved above its row. Bundle +88 KB
  (+12 KB gzipped). Deploys.
- PR 3 (5183, #1820): `wire-hostile.test` (10,524 cases,
  ~9 s), census `docs/plan/census/hostile.md`: 19 failing, the line.
  Deploys (a new file in server/test/).

## Next

- PR 6 (5186, free, the gain bench: researching each claim) while 1 and 3 wait; PR 2 (5182) after PR 1 merges (it
  takes wire-table.test §7, today's copy, out); PR 4 after 1 and 3.

## Found

- Six suites read `PRIVILEGED_EVENTS` from index.js's source, not the Set:
  accuracy, achievements-client, boards, loginspin, rejoin-resend,
  rise-chest (`server/test/`). PR 1 points each at the made Set (asked).
- `tools/guards/lib/systems.mjs`: the wire system's two doors still name
  index.js and relay.js; both still hold the names (now made in lists.js).
- `server/src/movement.js` `_handleMove` keeps `vx`, `vy`, `d`, `f`, `eqc`,
  `eql`, `ex` as sent (an object kept, and relayed): hostile census, 16.
- `server/src/chatmod.js`: a mute of a target named `__proto__` is stored
  as an own key of `chat_mute:<pid>`.
- `server/src/worldsum.js` (card E): an honest character restart reads as
  value gone with no burn written (`character_reset`).

## Needs

- The planning session: may PR 1 change the six suites above (one check
  each, the same assertion read from the Set)? Asked 2026-11-14.
