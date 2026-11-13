# Card D: the state, read (step 5.3's census, as a document)

**Starts:** day one, beside W and S. It reads; it changes no game code.
**Read:** `CLAUDE.md`; the ten rules at the top of part 5 of
`docs/GRAND-PLAN.md`; steps 5.3 and 5.3b; part 2's item 4;
`src/game/monsterCarry.js` and `src/game/rejoinSlots.js` (the pattern).
**Tags:** 5030.
**Browser:** none.

## PRs, in order

1. **(v2.3.5030) `tools/dev/state-census.mjs` and
   `docs/plan/census/state.md`**, with your status file.
   - The script makes the table, so anyone can make it again. The page is
     its output.
   - **What counts as a row** (write this rule at the top of the page):
     - a top-level field of the state object, written `S.<name>` or
       through an alias of it (`stateRef.current`, `getState()`, a
       parameter named `S`). A nested path is its top-level field's row;
     - a variable at the top of a file under `src/` that holds state: a
       `let` or `var`, or a `const` Map, Set, array or object that is
       changed after it is made.
   - **Each row**: the name; where it is born; the files that write it;
     the files that read it; a provisional system (the folder and file:
     the system map is card B's, later); and one column the machine
     cannot fill, marked "suggested, not confirmed": when it should reset
     (never, a zone change, a death, a rejoin).
   - **Mark, do not judge**: a field written from two or more files; a
     field nothing reads; a field that is a phase (a state machine's one
     field: step 5.3b).
   - Done when `node tools/dev/state-census.mjs` prints the same table
     twice, and the page ends with its counts.

## Readings chosen for you

- **The plan's numbers are a reviewer's** (about 610 fields, 146 written
  from two or more files, about 850 top-of-file variables, 89 writes from
  `src/rendering/`). Yours replace them; say how each was counted.
- **No ledger files, no guard, no resets.** Those are card U, later, after
  card B's system map. When this PR is `ready`, stop.
- **Found, not fixed**: a field that is plainly never cleared and should
  be, one line under Found.

## Not yours

Every file under `src/` and `server/`; `tools/guards/` (B).
