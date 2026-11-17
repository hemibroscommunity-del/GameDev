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
- **A switch the worker throws for the page** is ONE row under its id, side
  `both`: a memory saver of `CLIENT_SAVERS` (`src/game/clientOff.js`), or any
  other `clientOff('<id>')` the page asks (`groundkeep`). `off_<id>` on the
  worker and `?<id>=0` on the page are the same switch.
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
| `on` | (a `switch` row's, v2.3.5305) the day its way went on for everyone (below); `'off'` for an opt-in not yet the default |
| `thrown` | on the worker the value that throws it; on the page its form (`present`, `=1`, `=0` and the words its read also takes, or a value) |
| `risk` | what the old way guards against: `logic`, `memory` or `chip`; `none` for a lever (and only a lever) |
| `needs` | the names it needs: it turns off with them (rule 4) |
| `fallback` | `'no'`, or the trigger that still uses its old way, as names in a file (`'onWindows, onMac in src/game/deviceProfile.js'`) |
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

- the names found with no row (`UNLISTED_LINE`, 0 since card T's PR 3:
  every live flag and every page switch has its row; the gatekeeper may make
  it strict);
- the reads in a shape the scanner does not know (`UNKNOWN_LINE`, 0);
- the rows born `unknown` (`BORN_UNKNOWN_LINE`, 2: `?debug` and `?nodebug`,
  from April commits that carry no tag in the commit, its body or its merge).

The scanner's excuses are each held used: one that no longer matches fails,
so it can never excuse a new line.

- `DYNAMIC`: the FUNCTIONS that read the flags with no name on purpose (the
  doors `_flagOn`, `_flagNum`, the cache's load, the flags route, the join's
  caps spread, a new contest's clearing, the savers' list). An excuse is a
  function, never a line's text: a new door written like `_flagOn` in another
  function is not excused, and every read through it is followed
  (v2.3.5302, the gatekeeper's review of sitting 8).
- `NOT_ADDRESS`: a page regex over another URL (an asset's).
- `NOT_A_FLAG`: a local that is not the flags. The scanner keeps the name
  (liveops.test §8f still holds it); the census leaves it out.
- keepSwitches.js's copy of the address's own entries.

## The scanner's shapes, held by fixtures

The gatekeeper's review of sitting 8 found shapes that hid a switch:
`_flagOn` at a constant (`disable_verify`, `hidden_off`) or in double quotes,
`(this._liveFlags || {}).x`, a destructured local, `f?.x`, a local read more
than eight lines below it, the flags handed on or reached through
`_liveFlagsEnsure()`, and on the page `(?:^|&)x` over `search.slice(1)`,
`.get("x")`, `searchParams`, `.includes('x=1')`, every name of a
`[?&](a|b)` group, and `clientOff('x')`. Each is now read (or counted as
unknown, where no name can be read), and each has a fixture in the guard
(`SHAPES`, check 9): a few lines of code the scanner reads as a file, with the
names it must find and the unknown reads it must count. A rule dropped from
the scanner turns its fixture red on every PR.

## A row's place (v2.3.5304, the gatekeeper's sitting 11)

The table runs in three sections by side (the switches the worker throws for
the page, then the worker, then the page), and in each the rows are sorted by
name (the `?` aside, lower case). A new row goes where its name puts it,
never at the end: two PRs that each add a row touch the same lines only when
their names are neighbours. The guard's check 10 fails a row out of its
place and names the row it belongs after. Rehearsed: two branches from one
table, one adding `?aardvark` and the other `?minnow`, merge clean in both
orders.

## Rule 4: two configurations (v2.3.5304)

The plan's rule 4: all new, or exactly one switch thrown.

- **Needs** (the guard's check 11). Every need is a row; no switch needs
  itself, however far round. A worker row with needs names its **reader**
  (`reader: '_giftClosed in server/src/trade.js'`), and the guard asks that
  the reader reads each need, directly or through the functions it calls
  (`switchScan.mjs readsOf`): a dependent turns off with what it needs only if
  its reader asks. A row that may **never** go off (`never: '<why>'`, a
  ledger) fails while a switch it needs is still a row: the switch beneath is
  removed first.
- **The thrown run** (`tools/guards/switches-thrown.test.mjs`, with the
  preload `tools/guards/lib/thrown.mjs`). For a worker row of kind `switch`,
  its system's suites (card B's map) and those of every row that needs it run
  once with that one flag thrown on every room, with no line of game code
  and no suite changed. The baseline runs through the same preload with a
  flag nothing reads, so the only difference is the one flag.
  - A check that fails thrown and is the switch's own (it asserts what the
    switch turns off) is expected: the row lists it, by the check's words
    (`thrownFails`).
  - Anything else is a second configuration that breaks: listed as known in
    the guard (`KNOWN`, a census) and written under Found in card T's status
    file. Card T fixes none.
  - **The preload changes nothing by itself** (v2.3.5307). It imports no
    game code: a module hook patches `GameRoom` as the suite itself imports
    `server/src/index.js` (`thrown-hooks.mjs`, `thrown-patch.mjs`), so a
    suite's own setup runs first. It loads nothing early and replaces no game
    function, so a room's cold start stays cold. Every server suite (400)
    passes with a flag nothing reads (`--none`, by hand); on every PR the two
    canaries do (`cold-flags.test`, `tick-pace.test`). The planning session
    found the v2.3.5304 preload breaking both (it imported `index.js` before
    the suite set `WebSocketPair`, and loaded the flags as a room was made).
  - On every PR only the rows born from tag 5301 on run, with no baseline
    (`npm test` runs the same suites plain in that job, so a check red
    unthrown is red there already): 17 s for 97 suite runs (v2.3.5305; 30 s
    with the baseline). By hand, `--baseline` (on with `--all`, `--sample`,
    `--only`) runs each suite unthrown first and sets its fails aside.
    `--sample` runs one switch of each risk in each system; `--all` every one
    (about 45 minutes here), the owner's to ask for.
- **Page rows**: no browser run. The guard finds, for each page switch, the
  server suite or phone scenario whose text holds its address (found, never
  typed). The count with none only falls (`NO_PLAY_LINE`, 76 at its first
  count).

## The end date (v2.3.5305; grand plan step 7.2)

**The rule, as the plan writes it.**
- A logic switch four weeks on for everyone, with no revert, may let its old
  way go.
- A device off-ramp (`risk` memory or chip) stays while its risk is live:
  the owner's call, never by age.
- A fallback stays while its trigger lives.

**"No revert"** means two things:
- no commit on `main` since `on` turned its default back;
- the owner's live flags not holding it thrown. The repository cannot see
  those, so the reaping card reads the Test panel first.

**`on`** is a day, from git: the day the commit of the change that made the
switch's way the default reached `main`'s first-parent line (UTC).
- For most rows that change is `born`.
- For an opt-in made the default later, `onBy` names the later change.
  How PR 5 found them: every page row whose read once took `<name>=1` in
  `src/`, and every worker row once read as `=== true`, were read by hand
  in their history. Those whose way went on later:
  - `pathall`, `movepath`, `?diet`: 3744, the message diet on for every
    phone;
  - `?hemiface`: 4049, the portrait off by default, which is the way it
    turns back;
  - `?lightfx`: 2711;
  - `?sheen`: 2887;
  - `?oneband`: 4092;
  - `?onepic`, `?platelayer`: 4990;
  - `?onebatch`: 5016;
  - `?p256`: 5249, the first twins on by default.
  - `arenasettleplan`, `econresetput`: 5095, card E's #1852 turned both
    on (they were PR 5's first two opt-ins).
- `'off'`: the way is not on for everyone yet. Two rows: `botsig_reverify`
  and `?slimesplat`.
- A row that brings an old way back (`?fishgrip=1`, `?figround=1`) has
  been on since its birth.

**`--due`** (`node tools/guards/switches.test.mjs --due [YYYY-MM-DD]`)
prints the rows the rule would let go, and why the others stay (not yet
four weeks on, a device off-ramp, a fallback, an opt-in, `never`).
- A row that others need names them: their readers ask it, so a reap
  changes them in the same PR.
- It runs in no CI and no precheck, and changes nothing.
- On 2026-11-14 it lists 101 that may go, and 252 under four weeks.
- Reaping is step 7.3's, a later card: a batch a PR, each merged by the
  owner.

**The fallback hold** (the guard's check 12). `FALLBACKS`, in the table's file
lists each fallback with its trigger (5 today). While a trigger is still in
its file, two things stay:
- the row, with the same fallback;
- its read, found by the scanner.
A fallback leaves the list, and its row's `fallback` goes to `'no'`, only
in the PR that removes its trigger. The list only shrinks: a census
(`FALLBACK_LINE`), the gatekeeper's to change.

## The page's one reader (v2.3.5306; 7.1's "one reader")

`src/game/switches.js` answers every switch by its name. It reads
`location.search` at each ask and parses it again only when it has changed.
A page does change its own address: `BroTown.jsx` drops `create`, `login`
and `noresume` with `history.replaceState`, and tests flip a switch
mid-page. So the reader always answers for the address as it is now (the
gatekeeper's medium, sitting 18; check 4 of its guard). It has no imports,
so node tests it and any file may ask it.

- **One function a form**, from the row's `thrown` on the page:
  - `sw(name)`: a row with a form (`=0`, the words its read takes like
    `=0, off, false`, `=1`, `=all`, or `present`). True when the address
    throws it, or throws a switch it needs (rule 4: a dependent turns off
    with what it needs).
  - `swHas(name)`: the name in the address at all.
  - `swValue(name)`: its value as written, or null.
  - `thrown()`: the names thrown on this page, for the report's `sw`.
- **The forms and needs are the table's**, written into the reader between
  its markers by `switches.test.mjs --write` and held equal (check 13): one
  source. A form is read from `thrown` with notes in brackets set aside;
  where two values both mean something (`=1, =0, on or off`), the form is a
  value, and `swValue` reads it.
- A need the address cannot show (a worker's flag) is not the page reader's.
  A need whose form is a value is not resolved either: `govern`, which
  card O's `?ladderpix` and `?ladderrate` need, today.
- **A move changes no address's meaning.** `tools/guards/switch-reader.test.mjs`
  keeps each moved read's old test word for word (`MOVED`) and holds it
  equal to the reader on 13 fixed addresses: the name absent, present,
  `=` empty, `=0`, `=1`, `=off`, `=false`, a value, inside a longer name
  before and after, and beside another name. Every ask names a page row,
  and `sw` only one with a form. The addresses also throw each switch the
  moved read's row needs: a move that would add a need's meaning fails.
- **The outside reads** (a census, only falls): `location.search` in the
  page's code outside the reader, 221 at its first count (228 before the
  first seven reads moved). Card T's PRs 7 on lower it as reads move in.
- The first reads moved (PR 6): `?starcue`, `?guidearrow` (two files),
  `?nmlask`, `?loginspin`, `?nomapdetail`, `?tapthrough`, chosen in files no
  running card holds, with no needs, so no answer can change.
- The reads moved (PRs 7 on), the systems with the fewest reads first, in
  files no running card holds: v2.3.5309, quests (`?questpath`), skills
  (`?treefade`), economy (`?droplines`, `?equipredraw`), townsfolk
  (`?townchat`, `?folkwalk`) and audio (`?nobeds`, `?noforge`, `?sounds`):
  the line 212. v2.3.5310: data (`?burstnumbers`), preload (`?codelazy`),
  world (`?bodyhere`, `?noobjects`, `?nolife`, `?noswim`, `?groundwait`,
  `?heaplean`, `?folkbake`) and ui (`?playvwlive`, `?dev`):
  the line 201. A read that hands its address to a rule (`q == null ?
  location.search : q`) or parses a value stays for a later PR.

## A new switch

Its own PR adds its row (the guard fails it otherwise) and runs
`node tools/guards/switches.test.mjs --write`. A `switch` row carries `on`
(v2.3.5305): the UTC day its way went on for everyone (the day its PR
merges, for a switch on by default), or `'off'` for an opt-in. CLAUDE.md's same-change table
says so.

## The scoreboard

`tools/dev/scoreboard/switch-rows.mjs` prints part 3's row "Switches with a
row": the whole rows of kind `switch`, of the switches found (those rows and
every name with no row yet).
