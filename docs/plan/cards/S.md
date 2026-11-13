# Card S: the shapes page and the budget table (steps 8.6, 8.7)

**Starts:** day one, beside W. Words only: it writes no code.
**Read:** `CLAUDE.md`; the ten rules at the top of part 5 of
`docs/GRAND-PLAN.md`; pillars 10 and 11 and steps 1.1, 2.1, 4.1, 4.4;
`docs/ARCHITECTURE-HANDOFF.md`; `docs/specs/grand-plan-review.md`.
**Tags:** 5025, 5026.
**Browser:** none.

## PRs, in order

1. **(v2.3.5025) `docs/SHAPES.md`.** Steps 10.1 and 11.2 are sections of
   this page, not PRs of their own. One row a shape: its name, its one
   writer, its readers, where it lives in the code, its cost in rows. The
   sections:
   - **The actor**: the account, the character, the sitting, the kind (a
     person, QA, the owner, the system, a helper), where it came in, its
     grant. Where it would be set (the session object, the HTTP check).
     DESCRIBE it; no card builds it yet.
   - **Ids**: which exist today (`bp_`, gear's `gid`, a pet's id, listing
     and order ids, `opId`) and which are new (an account above
     characters, a sitting's id made by the server, a weapon's id, one
     request id).
   - **The roads' classes**: the words only (mint, burn, move, escrow, and
     a road's other side). Card E fills the rows of `GOLD_ROADS` and
     `BAG_ROADS`; you do not.
   - **The report's fields and sinks** (step 1.1): each field, its type or
     closed list, and its one sink (smoothness, or the sitting's card).
   - **The wire's columns** (step 4.1): every column, each DEFINED in one
     sentence, "envelope" and "the sender's phase" included.
   - **The device class** (step 2.1): its fields. Facts only.
   - Done when every shape pillars 1, 4, 10 and 11 name has a row, and
     each new name is free in the code (below).
2. **(v2.3.5026) `docs/BUDGETS.md`** (rule 6). One row for each shared
   thing: ms on the page's thread, lateness, MB, the loading screen's
   seconds, rows, messages, how a player looks to the server. For each:
   today's line, the file that holds it (`held-budget.mjs`,
   `memory-budget.mjs`, `cost-guard.test.mjs`), who reads, spends or
   controls it today. The loading screen has no line: leave it blank and
   say what would measure it (the Test panel's loading times,
   `src/game/loadTimes.js`).
   - Done when every controller of a shared thing in today's code is
     listed, and a second controller of the same thing is named as such.

## Readings chosen for you

- **`acct` and `sess` are taken.** `acct` already means the DEVICE in the
  daily spin (`server/src/loginspin.js`), and `sess` is a sparring bot's
  session (`spar.js`). Grep before you name anything; pick free names and
  say so on the page. "Inbox" is the game's mail: do not reuse it either.
- **"One request id"**: start from today's `opId`. Say whether one name can
  serve the socket, the HTTP routes and the phone's action door, or why not.
- **"Frozen"** means merged to `main`. Cards A, E and N wait for that.
- **The guards** rule 2 and rule 6 ask for are code, in `tools/guards/`,
  which is card B's. List each under Needs in your status file.
- **Calls 14 and 15** (one account a person; helpers may run errands) are
  not decided. Write the shapes so either answer fits: the account is an
  empty field, the helper is a kind nothing uses yet.
- **System names** come later (card B). Use the file's path for now.

## Not yours

Any code; `held-budget.mjs` (H); the rows of the roads (E).
