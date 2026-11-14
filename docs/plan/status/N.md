card: N
branch: claude/grand-plan-n-3-wire-guard (one branch a PR, each begun from the one before: merge them in order)
prs: #1684 (merged), #1695 (merged), #1697 (ready)
state: ready

## Done

- #1684 (tag 5060): the door tests read `server/src/` in depth (one walker,
  `server/test/src-walk.mjs`, `.js` and `.mjs`; `vendor/` left out by name,
  what it holds pinned). Deploys.
- #1695 (tag 5061): the wire table, `server/src/wire/`: 436 rows (the
  census's part 8), 118 with a note. Registered with card B's guards (the
  `wire` system; `shapes-once`'s Where for `wayIn`, `mayStart`,
  `doesWhat`: `columns.js`). Deploys: merge it with #1684 (TRAPS §277).
- #1697 (tag 5062): `tools/guards/wire-table.test.mjs`, the table held to
  the code, reading its switches by system (`lib/filesOf.mjs`); seven break
  proofs in its header, each tried by hand.

## Next

- Nothing: the card stops when #1697 merges. It adds card A's `report`
  row (#1706), so it deploys. A's held #1711 adds `/api/admin/dev/daybook`:
  merged after #1697, it brings its row; merged first, I add it here.

## Found

- **Once #1697 is on `main`, a new router case, privileged type, relay or
  route with no row in `server/src/wire/` fails `npm test`.** Tell the
  other sessions; CLAUDE.md §8's table may want that row (not my file).
- `join_rejected` is also sent when the owner's `device-forget` or
  `key-new` puts out a character being played (`server/src/devicelock.js:315`);
  the census's "who starts it" names only the join.
- `docs/SHAPES.md` part 5 still says `server/src/wire/` "does not exist
  yet". When the actor's `wayIn` is built, `shapes-once` needs its Where.

## Needs

- Nothing. The question (an out row reads the columns turned round, as the
  census does) was answered by the planning session: keep it.
