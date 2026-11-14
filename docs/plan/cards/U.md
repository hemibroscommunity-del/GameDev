# Card U: the state ledger (step 5.3, step 1, as files a system, and its guard)

**Starts:** when card B's PRs 3 and 4 (the system map and the helper) are
merged, and not before. Card D's census is merged.
**Read:** `CLAUDE.md`; the ten rules at the top of part 5 of
`docs/GRAND-PLAN.md` (rules 2 and 3); steps 5.3 and 5.3b; part 2's item 4;
`docs/plan/census/state.md` (its rules, its columns, its counts; rows by
grep); `tools/dev/state-census.mjs`; `docs/SYSTEMS.md` (card B's);
`src/game/monsterCarry.js` and `src/game/rejoinSlots.js` (the pattern: a
leaf file a system, no imports, that a node test reads).
**Tags:** 5160 to 5179, one a PR, in the order below.
**Browser:** none.
**Effort:** standard.

## PRs, in order

1. **(tag 5160) The ledger's form, its guard, and the first system.**
   - Files: new `src/state/README.md`; new `src/state/<system>.js` for the
     ONE system with the fewest rows (say which and why); new
     `tools/guards/state-ledger.test.mjs`; `tools/dev/state-census.mjs`
     (a `--ledger` output only).
   - A ledger file: no imports, plain data. A row: the name; field of `S`
     or top-of-file variable (and its file); where it is born; the files
     that write it; the system; the lifetime, `sitting` ("the sitting,
     never reset") for every row until someone says otherwise; D's
     suggested reset copied as `suggested`, never as the lifetime.
   - **The rows are made by machine**: a `--ledger` output of D's script
     (`tools/dev/state-census.mjs`), never typed. The script stays the one
     reader of the code (rule 2).
   - The guard: every field and variable the script finds is a row of
     exactly one ledger file, or counted as unlisted; it fails when the
     unlisted count RISES (rule 3: a census; the gatekeeper alone makes it
     strict), a row in two files, and a row the script no longer finds.
2. **(tags 5161 on) The rest, a few systems a PR**, by B's map, the
   systems with the fewest rows first, the ones that touch
   `src/ui/BroTown.jsx` and the two renderers last. Each PR lowers the
   guard's unlisted count, and the gatekeeper lowers its line.
   - Done when the unlisted count is 0, except `unsorted` files B's map
     has not placed (listed by name).

## Readings chosen for you

- **Step 1 only: no reset is written, no field moves, no behaviour
  changes.** Resets are step 2 (card L), a system at a time, each with its
  switch. A ledger file changes no game file: nothing imports it yet.
- **Mark, do not judge**: D's marks (written from two or more files, read
  by nothing, a phase) become columns; the phases go to step 5.3b's table
  later (card L).
- **D's Found** (fields never cleared: `clearElemStatuses` with no caller,
  `S._nmlAsked`, `S._preDungeonMap`, `_npcDrawn`, `_stripStats`) stay
  Found: their rows carry D's suggestion, and card L acts on them.
- `src/state/` is free (2026-11-14). If B's map names a different home for
  ledgers, follow the map and say so.

## Not yours

Every game file under `src/` but `src/state/`; `state-census.mjs`'s
reading rules (D's: a fault in it goes under Found); the phase table (L).
