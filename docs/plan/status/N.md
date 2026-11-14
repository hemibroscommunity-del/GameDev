card: N
branch: claude/grand-plan-n-3-wire-guard (one branch a PR, each begun from the one before: merge them in order)
prs: #1684 (ready), #1695 (ready), PR 3 the guard, from the branch above (ready)
state: ready

## Done

- #1684 (tag 5060): the door tests read `server/src/` in depth (one walker,
  `server/test/src-walk.mjs`; `vendor/` left out by name). Deploys.
- #1695 (tag 5061): the wire table, `server/src/wire/`: 436 rows (139 in,
  26 relay, 164 out, 107 routes, the census's part 8), 118 with a note.
  Deploys: merge it with #1684 in one sitting (TRAPS §277).
- PR 3 (tag 5062): `tools/guards/wire-table.test.mjs`, the table held to
  the code (0.1 s); six break proofs in its header, each tried by hand.

## Next

- Nothing: the card stops when the three merge, in order. `main` merged
  into each (card E's #1691 had changed `bag-door` and `gold-door`: their
  imports, both kept); the guard is green on it, and card E added no row.

## Found

- **Once PR 3 is on `main`, a new router case, privileged type, relay or
  route with no row in `server/src/wire/` fails `npm test`.** Tell the
  other sessions; CLAUDE.md §8's table may want that row (not my file).
- `join_rejected` is also sent when the owner's `device-forget` or
  `key-new` puts out a character being played (`server/src/devicelock.js:315`);
  the census's "who starts it" names only the join.
- `docs/SHAPES.md` part 5 left open what the table fills (its README):
  `answer: 'http'`; `wayIn: 'room'` for the five internal routes; zone
  states `wheel`, `safe`, `nml`, `dungeon`; implicit states `in` (and
  `party:leader`); `absent`'s opening words.
- `caps-audit` (on the card) never lists `server/src/`; eight suites beyond
  the card's nine did, and now read in depth.

## Needs

- Nothing. The question (an out row reads the columns turned round, as the
  census does) was answered by the planning session: keep it.
