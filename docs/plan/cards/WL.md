# Card WL: walls that hold (finish line 6; rule 8)

**Purpose:** the page's fences catch what the reviewers walked through, and
the scoreboard counts what the ledgers already know, so progress is a
machine's number and not a tick.

**Acceptance (`docs/plan/census/shape-walls.md`):** each plant below stayed
green on 2026-11-23 and is red after its PR.

**Tags:** 6520 to 6539, one a PR, in order.
**Model and effort:** the strong model, high.
**Read:** `CLAUDE.md`; `docs/plan/finish.md` parts 5 and 6 (they bind you);
`shape-walls.md`; `shape-review.md` part 3, items 10 to 15 and 21;
`tools/guards/README.md`; `src/state/README.md`.
**You hold:** `tools/guards/four-lines.test.mjs` and `lib/fourLines.mjs`
(the count, not the lines: only the gatekeeper lowers a line),
`phase-table.test.mjs`, `state-ledger.test.mjs`, `switch-reader.test.mjs`,
`budgets.test.mjs`, two new guards (the leaves; the open hand),
`server/test/phone-death.test.mjs`, `tools/dev/scoreboard.mjs` and
`tools/dev/scoreboard/`, `docs/BUDGETS.md`,
`docs/plan/census/checklist.md`.
**Not yours:** any file under `src/` (card CT is in the big ones); the
door tests (card DG's).
**Browser:** none.

## PRs, in order

1. **(6520) Four small true mends**, each with its plant:
   - `phone-death` 4c ("it takes no gold") reads any write to the purse:
     `S.rpg.coins -= ...` in the death block passes it today. This one file
     is under `server/test/`: its merge deploys.
   - The phase scan counts as a write an object key or a spread that names
     a door's field outside the door's file: `Object.assign(S, { _shieldUp:
     true })` and `{ ...d, status: 'resolved' }` pass today.
   - `switch-reader` reads `searchParams.get(...)` too.
   - `four-lines` counts statements, not lines that hold a token: two
     statements on one line pass today. The count changes every number, so
     the same PR sets each line to today's value by the new count, room
     for room, and lists the old and the new: no line is loosened.
2. **(6521) A leaf stays a leaf.** A file under `src/rendering/leaves/` or
   `src/rendering/tables/` has no top-level `let` or `var`, writes nothing
   to `S`, and imports nothing from `systems/` (the plant: all three in
   `leaves/entity-social.js`).
3. **(6522) Owned state.** An `OWNED` set in `state-ledger.test`: for its
   rows the writers must be files of the row's system, and "make the ledger
   again" is no way out (today a second writer is recorded, not refused:
   the plant is `S._deathCard = null` in `groundLoot.js`). It starts with
   the fields that have one writer file and an enforced reset (42), and the
   page's phase fields. Card CT's new fields join it as they land: ask the
   orchestrator for their names.
4. **(6523) The open hand is counted.** A falling census of readers of
   `window._gameState` and `_gameFns` under `src/` (96 code lines in 53
   files today): a new reader fails. Closing it (step 5.7) is not this
   card.
5. **(6524) The scoreboard counts what exists.** It measures 6 of 17 rows.
   Add the counters whose numbers a ledger or a guard already holds: state
   fields decided and enforced (186 and 42 of 641), suites that read the
   page's source by path (237), switches thrown on a PR and at the
   rehearsal, the debt list's rows by kind, the memory lines' sum against
   the readings', the restart sweep's reach (card BK tells you its words).
   A row is measured or says "not measured": never a guess.
6. **(6525) Paper marked as paper.** `docs/BUDGETS.md`: a row with empty
   `spends` says "not measured", and its guard's sum fails only rows marked
   measured (today it sums nothing). `census/checklist.md`: each break
   proof is run by a guard, or marked "by hand, last on" its date.

## Readings chosen for you

- A guard here reads the syntax tree (as `phase-table` does), never a
  pattern of text (`finish.md` part 5, rule 2).
- A plant your guard cannot catch is said in the PR's words, with why.
- You convert no suite and move no code: counting and refusing only.
- The two renderers' lines are lowered by the gatekeeper at its next
  sitting; do not lower a line yourself.
