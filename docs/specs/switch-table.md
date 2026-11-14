# The switch table (v2.3.5301; grand plan step 7.1, card T)

The game has hundreds of switches: live flags the owner throws from the Test
panel (the worker's `liveops.js`), and `?name=` words typed into the address
of one phone. Until this table there was no list of them: each was read where
it was needed, and only the code knew what it did, when it came, and whether
its old way could ever go. The plan's pillar 7 ("let old paths leave") starts
with that list.

## The four files

- **`tools/guards/lib/switches.mjs`**, the table: one row a name. Data, no
  I/O. Written by a person who read the code at the read, never by the
  scanner.
- **`tools/guards/lib/switchScan.mjs`**, the scanner: the one reader of the
  CODE. It finds every name a switch is thrown by, and where each is read.
  Its header says exactly which shapes it reads and why.
- **`tools/guards/switches.test.mjs`**, the guard (run with every other guard
  on every PR): every name found is a row or counted, every row is still
  found, every row is whole. `--write` makes the page, `--list <system>`
  prints a system's rows (`--list unlisted` the names with no row yet),
  `--where <name>` prints where the code reads a name.
- **`docs/SWITCHES.md`**, the page, made from the table. Never edited by
  hand. It never says where a name is read (that moves with any edit of a
  file, and the page would go stale on every PR): `--where` does.

`server/test/liveops.test.mjs` §8f and §8g (every flag the worker reads, and
every kill switch a comment promises, can be set through the flags route)
read the same scanner: one copy of the rule (the plan's rule 2).

## A name

- **On the worker**: a live flag read, in any shape the scanner's header
  lists (`_flagOn('x')`, a local holding the flags read as `f.x`, a helper that
  takes the name, a table's `flag: 'x'`...), and every `` `x: false` `` a
  comment promises as a kill switch. A read of `_liveFlags` in a shape the
  scanner does not know is counted apart, so a switch cannot hide from the
  table by being written differently.
- **On the page**: every `?name=` read in `src/`, in any `.js`, `.jsx` or
  `.mjs`. The scanner follows the NAME, not the call: a read that hands the
  address to a rule in `src/game/` (`frameSmoothOn(search)`) is found in the
  rule's file, where the name is. A page row's name has its `?` (`?guest`).
- **A memory saver** (`CLIENT_SAVERS`, `src/game/clientOff.js`) is ONE row
  under its id, side `both`: `off_<id>` on the worker and `?<id>=0` on the
  page are the same switch.
- **A cap** is a row only where the worker reads it as a flag or a comment
  promises it as a kill switch. Any other cap's override is the emergency
  lever of `docs/specs/liveops.md` ("Caps override") and stays out.
- **Out of reach**, and the page says so: the QA pages (`src/*-harness.html`,
  `public/tools/`), the phone scenarios' own addresses (`tools/qa/`),
  `localStorage` toggles and the worker's `env` settings. One that acts as a
  switch is written under Found in the card's status file.

## A row

Every row has every column (the guard fails one without):

| column | what |
|---|---|
| `name` | as it is thrown (above) |
| `side` | `worker`, `page` or `both`; the guard holds it to where the scanner finds the name |
| `system` | card B's (`tools/guards/lib/systems.mjs`); a name that fits two takes the system of the file its read is in |
| `kind` | `switch` (a way of the game turned off or on), `value` (a number or a word to try: `xp_mult`) or `lever` (a test's or the owner's tool: `testmode`, `?guest=1`) |
| `born` | the tag of the change that made it, from the comment at its read or `git log -S`; `'unknown'` when neither says, counted and never guessed |
| `thrown` | on the worker the value that throws it; on the page its form (`present`, `=1`, `=0` and the words its read also takes, or a value) |
| `risk` | what the old way guards against: `logic`, `memory` or `chip`; `none` for a lever (and only a lever) |
| `needs` | the names it needs: it turns off with them (rule 4) |
| `fallback` | `'no'`, or the trigger that still uses its old way, as names in a file (`'onWindows, onMac in src/game/lookPaletteChoice.js'`) |
| `off` | one sentence: what throwing it turns off, or back on |

How the worker's rows were judged (PR 1): `born` is the first commit on `main`
that added the quoted name to the read's file and the first that added its
`` `x: false` `` promise to `server/src/` (`git log -S`, full history); where
both exist they agreed for 185 of 226 names, and the three that did not were
read by hand (`rest`: the Hotel, 3539; `season`: its put-away switch, 3400;
`takeoversave`: 4377, moved to `leave.js` in 4830). `needs` is what the
switch's reader asks besides its own flag, read in the code.

## The census (the plan's rule 3)

Each of these may only fall; the gatekeeper alone makes one strict or lowers
its line, in a PR of its own:

- the names found with no row (`UNLISTED_LINE`: the page's names, until card
  T's PRs 2 and 3 give each a row; every worker name is a row from PR 1);
- the reads in a shape the scanner does not know (`UNKNOWN_LINE`, 0);
- the rows born `unknown` (`BORN_UNKNOWN_LINE`, 0).

The scanner's excuses (a read of the whole map on purpose: `DYNAMIC`; a
regex over another URL: `NOT_ADDRESS`; a local that is not the flags:
`NOT_A_FLAG`) are each held found: an excuse that no longer matches fails,
so it can never excuse a new line.

## A new switch

Its own PR adds its row (the guard fails it otherwise) and runs
`node tools/guards/switches.test.mjs --write`. CLAUDE.md's same-change table
says so.

## The scoreboard

`tools/dev/scoreboard/switch-rows.mjs` prints part 3's row "Switches with a
row": the whole rows of kind `switch`, of the switches found (those rows and
every name with no row yet).
