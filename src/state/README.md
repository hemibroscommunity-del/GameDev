# The state ledger (v2.3.5160; grand plan step 5.3, step 1; card U)

The game keeps its state in two kinds of place: the fields of the state object
`S` (`stateRef.current`, about 650 names, most made on the fly) and the
variables at the top of files (about 1,500). Nobody can give one an owner or a
lifetime from a guess. This folder holds the **ledger**: one row for each of
them, in one file per system.

- **One file a system** of card B's map (`docs/SYSTEMS.md`): `src/state/<system>.js`.
  This folder is a system of the map itself, `state` (the planning session's
  call, 2026-11-14): a ledger file is about another system's state, and is
  not that system's code.
- **Made by machine, never typed.** Card D's script reads the code and makes
  the rows: `node tools/dev/state-census.mjs --ledger <system> --write`.
  `--ledger` alone prints every system's rows, listed and not, fewest first.
- **Plain data, no imports.** Nothing in the game imports a ledger yet: step 1
  writes no reset, moves no field and changes no behaviour.
- **Held by** `tools/guards/state-ledger.test.mjs` (every PR, in Server CI's
  `test`).

## A row

One line, one object. A field of `S`:

```js
{ field: '_deathCard', system: 'life', lifetime: 'sitting', suggested: 'death', born: 'fly src/game/deathCard.js noteDeath', twoFiles: '', noRead: false, noSet: false, phase: null, flag: false, writers: ['src/game/deathCard.js'] },
```

A top-of-file variable has `variable` and `file` where a field has `field`,
`neverChanged` where a field has `noSet`.

| column | what | made by |
|---|---|---|
| `field` | the field's name: `S.<name>` (a nested path is its top field's row) | machine |
| `variable`, `file` | the variable's name and its file | machine |
| `system` | card B's map's system of a file: a variable's own; for a field, the file that sets it most (the census's provisional system) | machine |
| `lifetime` | when it is reset. **`sitting`** ("the sitting, never reset") for every row until someone says otherwise; else the edges it is reset at, joined by `+` (`zone`, `zone+rejoin`: v2.3.5203, card L) | **hand** |
| `reset` | (v2.3.5203, card L; absent until someone decides) beside an edge, `value <v>` or `fn <name>`: what the reset registered with `resetOn` (src/game/resetOn.js) puts back; beside `sitting`, `kept: <why>`: why D's suggestion does not hold. `docs/specs/state-resets.md` | **hand** |
| `suggested` | card D's suggested reset, copied: `never`, `zone`, `death`, `rejoin`, or two joined by `+`. A suggestion, **never** the lifetime | machine (D's table) |
| `born` | a field: `first src/ui/BroTown.jsx` (the state's first object), `fly <file> <function>` (made on the fly, where it is first set), or `never` (only read, or changed inside). A variable: how it is declared and what it is made as (`let number`, `const Map`) | machine |
| `twoFiles` | D's mark: `2+` written from two or more files; `2+~` only when writes through a name for the inside count; else `''` | machine |
| `noRead` | D's mark: `true` nothing under `src/` reads it; `'tests'` the same, but a QA tool or test names it | machine |
| `noSet` | fields: D's mark, nothing ever sets it | machine |
| `neverChanged` | variables: a `let` or `var` never changed after it is made (a constant in fact; still a row by D's rule, marked so) | machine |
| `phase` | D's mark: the words it is set to or compared with, when it looks like a state machine's one field (step 5.3b, card L); else `null` | machine |
| `flag` | D's mark: only ever set to true or false | machine |
| `writers` | the files that write it, from the root; `~` after a file that writes it only through a name for the inside | machine |

Marks are **marked, not judged**: a row written from two files is not a fault
here. The phases go to step 5.3b's table (card L): `src/state/phases.js`. Rows card D found wrong
(`S._nmlAsked`, `S._preDungeonMap`, `_npcDrawn`, `_stripStats`, the statuses
`clearElemStatuses` never clears) carry D's suggestion like any other row;
card L acts on them.

Lines and counts are left out on purpose: a ledger names a place by its file
and function, so moving code does not make it stale.

## Making a ledger again

`--ledger <system> --write` keeps each row the script still finds, with its
`lifetime` (and any column a later card adds by hand) as it is, and makes the
rest afresh; it drops a row the script no longer finds (and names it), and
adds every row of the system that no ledger lists, as `sitting`. A row whose
system has moved since it was listed stays in its file (the guard names it).

## The phase table

`phases.js` (v2.3.5202, card L PR 2; grand plan step 5.3b) is the one file
here that is not a ledger: one row a state machine a side, its one field, its
states, its one transition function, what clears it, what a rejoin re-sends,
`door` or `todo`. A page row names its fields as this ledger's rows and never
copies their writers. Held by `tools/guards/phase-table.test.mjs`; the spec is
`docs/specs/phase-table.md`.

## The guard

- every file here is this README, the phase table or a ledger named for a
  system of the map;
  a ledger is plain data and every row has the columns above;
- no row is in two ledgers, or twice in one;
- every listed row is one the census finds;
- every row the census finds is listed, or counted as **unlisted**, and that
  count may only fall (the plan's rule 3: a census; the gatekeeper alone
  lowers its line, `UNLISTED_LINE`, and makes it strict);
- (v2.3.5203) a row whose `lifetime` names an edge is reset there (a
  `resetOn` whose function writes it, or the edge's door's own list), and
  every reset writes only such rows; the rows D suggests a reset for that are
  still `sitting` with no `kept:` may only fall (`SITTING_LINE`, which card
  L's reset PRs lower: 468 after its PR 3);
- (v2.3.5201) every listed row's **machine columns** are the script's, as
  `--ledger` makes them now: `system`, `suggested`, `born`, `twoFiles`,
  `noRead`, `noSet`, `neverChanged`, `phase`, `flag`, `writers`. A row typed
  or changed by hand fails, and so does one left stale by a change to the code
  (a new writer): make the ledger again. The hand's columns (`lifetime`, and
  card L's `reset`) are never compared.

**The guard reads the code** (v2.3.5201, card L; the gatekeeper's finding,
sitting 6), on GitHub too: `server/` carries the root's exact `@babel/parser`
and `@babel/traverse` as devDependencies, and the script's loader tries the
root's packages, then `server/`'s. The script (about 18 s) runs once a
`npm test`, shared with the four-lines guard (`tools/guards/lib/fourLines.mjs`,
`stateCensus()`). Only where neither place has the packages does the guard
read the census page (`docs/plan/census/state.md`), say so, and skip the
machine columns; `--live` fails there instead, `--page` reads the page
anyway. The page stays a census the script rewrites
(`node tools/dev/state-census.mjs --write`), never a gate: it carries line
numbers, so `--check` would fail every PR that moves a line under `src/`.

Rows of files the map has not placed (`unsorted`) have no ledger to go in
until the map places their file; the guard lists those files by name.

## The ledgers

- `life` (v2.3.5160), the first: the fewest rows, one (`S._deathCard`), tied
  with `liveops` (`S._testMode`); the tie went by name.
- `liveops`, `session`, `device`, `page-thread`, `input` (v2.3.5161): the
  next five by fewest rows, 39 in all. The census page made again with them
  (it lagged main by 20 variables).
- `quests`, `townsfolk`, `desktop`, `monsters`, `audio`, `social`
  (v2.3.5162): the next six, 150 rows.
- `movement`, `economy`, `preload`, `skills`, `memory` (v2.3.5163): the next
  five, 199 rows. `S.player` is in `skills`: the census gives it
  `src/game/lifeSkillRewards.js`, the file that changes inside it most.
- `debug`, `art`, `data` (v2.3.5164): the next three, 182 rows.
- `wire`, `combat`, `world` (v2.3.5165): the next three, 393 rows.
- `look` (v2.3.5166): 194 rows. Its `_bakeTag` is a phase with an empty
  word (`''` and `'jog-east'`), which the guard now takes.
- `render` (v2.3.5167): 453 rows, the two renderers' system, near last as
  the card says.
- `ui` (v2.3.5168): 522 rows, BroTown.jsx's system, last. Every row the
  census finds is now listed but the 16 of four files the map has not
  placed (`unsorted`): `src/game/characterCreatorEffects.js`, `rpgSave.js`,
  `spriteSheets.js` and `visualSystems.js`. They go in a ledger when the map
  gives their file a system.
- `state` (v2.3.5203, card L): `src/game/resetOn.js`'s row, the resets'
  own (the map gives the file to this folder's system).
- Main merged in (sitting 5, v2.3.5168): the census page made again, and
  the 20 rows main's merged work had added since put in their ledgers
  (art 2, memory 2, debug 3, render 3, audio 4, device 6).
