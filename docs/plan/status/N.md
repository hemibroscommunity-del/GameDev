card: N
branch: claude/grand-plan-n-2-wire-table (one branch a PR, each begun from the one before: merge them in order)
prs: #1684 (ready), PR 2 the table, from the branch above (ready; its number goes here with PR 3's commit)
state: ready

## Done

- #1684 (tag 5060): the door tests read `server/src/` in depth (one walker,
  `server/test/src-walk.mjs`; `vendor/` left out by name). Deploys the worker.
- PR 2 (tag 5061): the wire table, `server/src/wire/` (a file a direction,
  `columns.js` the closed lists, a README). 436 rows: 139 in, 26 relay, 164
  out, 107 routes, the census's part 8; 118 carry a note. All 370 suites
  pass with it read by every door test. Deploys the worker: merge it with
  #1684 in one sitting (TRAPS §277).

## Next

- PR 3 (tag 5062), the guard: `tools/guards/wire-table.test.mjs`.

## Found

- `join_rejected` is also sent when the owner's `device-forget` or
  `key-new` puts out a character being played (`server/src/devicelock.js:315`);
  the census's "who starts it" names only the join. The table says both.
- `docs/SHAPES.md` part 5 left these open; the table fills them (its
  README): `answer: 'http'` for a route; `wayIn: 'room'` for the five routes
  only another of the worker's objects calls; the zone states `wheel`,
  `safe`, `nml`, `dungeon`; an implicit machine's state `in` (`party` also
  `leader`); `absent` opens each clause with `default`, `older phone`,
  `refused`, `dropped` or `nothing`.
- `caps-audit` (on the card) never lists `server/src/`; eight suites beyond
  the card's nine did, and now read in depth.

## Needs

- From the owner, asked once: SHAPES' columns were written for a message a
  phone sends. For a message the WORKER sends, the table reads them turned
  round, as the census does (what the phone checks, does and answers;
  README "How each column reads"). Keep that reading, or another?
