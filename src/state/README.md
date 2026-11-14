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
| `lifetime` | when it is reset. **`sitting`** ("the sitting, never reset") for every row until someone says otherwise | **hand** |
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
here. The phases go to step 5.3b's table (card L). Rows card D found wrong
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

## The guard

- every file here is this README or a ledger named for a system of the map;
  a ledger is plain data and every row has the columns above;
- no row is in two ledgers, or twice in one;
- every listed row is one the census finds;
- every row the census finds is listed, or counted as **unlisted**, and that
  count may only fall (the plan's rule 3: a census; the gatekeeper alone
  lowers its line, `UNLISTED_LINE`, and makes it strict).

On GitHub the guard reads the rows off the census's page
(`docs/plan/census/state.md`): the script needs the root's packages, which the
`test` job does not install. `node tools/guards/state-ledger.test.mjs --live`
runs the script instead. The page is only as true as its last
`node tools/dev/state-census.mjs --write`: a ledger PR whose rows the page
lacks rewrites it.

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
