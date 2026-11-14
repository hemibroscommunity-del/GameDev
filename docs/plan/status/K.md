card: K
branch: claude/plan-k-1-wire-lists (one branch a PR, each begun from main)
prs: PR 1 tag 5181 (working)
state: working

## Done

- PR 1 (5181): `PRIVILEGED_EVENTS`, `RELAY.TYPES` and wire-audit's echo
  list made from the wire table (`server/src/wire/lists.js`); the column
  `privileged` (`echo` on 9 rows); the literals deleted, each type's why
  moved above its row. Bundle +88 KB (+12 KB gzipped). Deploys.

## Next

- PR 3 (5183, free) and PR 6 (5186, free) while PR 1 waits; PR 2 (5182)
  after PR 1 merges, and it takes wire-table.test §7 (today's copy) out.

## Found

- Six suites read `PRIVILEGED_EVENTS` from index.js's source, not the Set:
  accuracy, achievements-client, boards, loginspin, rejoin-resend,
  rise-chest (`server/test/`). PR 1 points each at the made Set (asked).
- `tools/guards/lib/systems.mjs`: the wire system's two doors still name
  index.js and relay.js; both still hold the names (now made in lists.js).

## Needs

- The planning session: may PR 1 change the six suites above (one check
  each, the same assertion read from the Set)? Asked 2026-11-14.
