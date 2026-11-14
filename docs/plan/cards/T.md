# Card T: the switch table (steps 7.1, 7.2)

**Starts:** now: card B is merged (`tools/guards/lib/`, the system map).
PR 1 waits for card N's #1684 on `main` (below, "Files T waits on").
**Read:** `CLAUDE.md` (§5: the live flags, the caps, a kill switch in lower
case; §7: a memory saver's `?name=0` off-ramp); the ten rules at the top of
part 5 of `docs/GRAND-PLAN.md` (rules 2, 3, 4 and 8 above all); pillar 7
(7.1 to 7.4); `docs/SHAPES.md` part 4's line "the switches thrown", part
5's `sw` field and the `flag` column of its wire table; `docs/specs/liveops.md`
("Caps override" and its table); `server/src/liveops.js`,
`server/src/clientoff.js` and `src/game/clientOff.js` (`CLIENT_SAVERS`, the
one closed list of switches today); `server/test/liveops.test.mjs` §8f and
§8g (the worker's two scans of its flags: the start of yours);
`tools/guards/README.md`, `tools/guards/lib/systems.mjs`, `filesOf.mjs` and
`systems.test.mjs` (card B's form, to follow: a table in code, a page made
from it, a guard); `tools/dev/scoreboard.mjs`; the status files of the cards
named in "Files T waits on".
**Tags:** 5300 to 5319. 5300 is the orchestrator's PR that commits this
card; yours are 5301 onward, one a PR, in the order below.
**Browser:** light. PRs 1 to 5 none. From PR 6 (reads move on the page):
`npm run build` and one `questline` run before each PR opens; each PR's
own checks run `questline` and `membudget` on GitHub.
**Effort:** standard.

## PRs, in order

The card is committed by the orchestrator's PR (tag 5300): do not commit
it again, and do not edit it (a question goes in your status file). One
branch a PR, each begun from the one before; open each PR when its line is
done, ready for review (not a draft: the gatekeeper skips drafts).

1. **(tag 5301) The table's form, its scanner, its census guard, and the
   worker's rows** (7.1).
   - **Waits for** card N's #1684 on `main`: `server/test/src-walk.mjs`,
     the one walker of `server/src/` in depth, which also changes
     liveops.test §8f. Build on it; never a second walker.
   - Files: new `tools/guards/lib/switches.mjs` (the table: one row a
     name, data, no I/O); new `tools/guards/lib/switchScan.mjs` (the one
     reader of the CODE: every name read, and where); new
     `tools/guards/switches.test.mjs` (the guard; `--write` makes the page,
     `--list <system>` prints a system's rows); new `docs/SWITCHES.md` (made
     by `--write`, never by hand); new `docs/specs/switch-table.md` (the
     rules, grown by PRs 4 to 6); new `tools/dev/scoreboard/switch-rows.mjs`
     (part 3's row, found by its file name); `server/test/liveops.test.mjs`
     (§8f and §8g read the scanner instead of their own copy: rule 2);
     `CLAUDE.md` (one row in §8's table, "a `?name=` or a live flag | its
     row in the switch table", and nothing else); `docs/plan/status/T.md`.
   - **What the scanner finds** (a "name"):
     - on the worker: every live flag read, in §8f's three shapes
       (`_flagOn` or `_flagNum('x')`; a local `= this._liveFlags` read as
       `f.x`, `f['x']` or `hasOwnProperty.call(f, 'x')`), and every
       `<name>: false` a comment promises as a kill switch (§8g). A
       `_liveFlags` read in a shape it does not know is counted apart, and
       that count only falls: else a switch hides from the table. §8f's
       own scan sees about 190 names today, some of them noise (a local
       read that is not a flag): the scanner's rule decides, and its header
       says how;
     - each memory saver: `off_<id>` on the worker and `?<id>=0` on the
       page are ONE row (`CLIENT_SAVERS`), side `both`;
     - on the page: every `?name=` read in `src/**/*.js` and `*.jsx`. The
       plan counted 220 reads in 132 files; `location.search` appears 230
       times in 136 files today, and some reads hand the string to a rule
       in `src/game/` that reads the name there (`frameSmoothOn(search)`):
       the scanner follows the name, not the call. Out of reach, and said
       so on the page: the QA pages (`src/*-harness.html`, `public/tools/`)
       and the phone scenarios' own addresses.
   - **A row** (judged by you, reading the code at the read; never typed by
     the scanner):
     - `name`; `side` (`page`, `worker`, `both`); `system` (B's names);
     - `kind`: `switch` (a way of the game turned off or on), `value` (a
       number or a word to try: `?pixbudget=`, `xp_mult`) or `lever` (a
       test's or the owner's tool: `?guest=1`, `?room=`, `?dev=1`,
       `?perf=1`);
     - `born`: the tag of the change that made it, from the comment at its
       read or from `git log -S`. Never guessed: `unknown`, and counted;
     - `off`: what throwing it turns off or back on, one sentence;
     - `thrown`: on the worker the value that throws it (`false` for a
       lower-case kill switch, `true` for `disable_*` and `off_*`); on the
       page its form (`present`, `=1`, `=0` with the `off` and `false` its
       read also takes, or a value);
     - `risk`: `logic`, `memory` or `chip` (`none` for a lever);
     - `needs`: the names it needs (often none);
     - `fallback`: no, or the trigger that still uses it, as a name in a
       file (`SOFTWARE_GL` in `src/rendering/paletteTex.js`).
     - Where it is read is the scanner's, never typed.
   - **Caps**: a cap is a row only where the worker reads it as a flag or
     a comment promises it as a kill switch (§8f, §8g: `storeGear`,
     `dailyChest`, `whirlWindup`, `broCount` among them). Any other cap's
     override is the emergency lever of `docs/specs/liveops.md`, and stays
     out.
   - **The guard** (rule 3: a census). Every name found is a row or
     counted as unlisted. It fails: a rise in the unlisted count (its line
     a number in the guard, lowered only by the gatekeeper); a row the
     scanner no longer finds; a row with a column missing; a name in two
     rows; a `system` that is not in B's map; a page that is not what the
     table makes. Every worker name is a row in this PR (the page's are PRs
     2 and 3).
   - **The counter**: switches (kind `switch`) with a whole row, of the
     switches found ("N of M").
   - It touches `server/test/`: its merge deploys the worker once (TRAPS
     §277). Say so in the PR's words.
   - Done when `cd server && npm test` runs the guard green and liveops.test
     green on the scanner, each break proof turns the guard red, and
     `node tools/dev/scoreboard.mjs` prints the row.
2. **(tag 5302) The page's rows, the game's side**: every `?name=` read in
   the files of the systems that do not draw (all of B's systems but render,
   look, art, memory, preload, device and page-thread). The unlisted line
   falls by their count.
   - Files: the table, the page (`--write`), the guard's line.
3. **(tag 5303) The page's rows, the drawing side** (render, look, art,
   memory, preload, device, page-thread). The unlisted count is 0.
   - Files: the table, the page, the guard's line; and two more, as follows.
   - B's map takes a system's switches from the table:
     `tools/guards/lib/systems.mjs` reads them (never typed again), and
     `docs/SYSTEMS.md` is made again with its `--write`.
   - `docs/SHAPES.md`: the two lines that say no list exists (part 4's
     "the switches thrown"; part 5's `flag`) point at the table. Nothing
     else on that page.
4. **(tag 5304) Rule 4: two configurations** (part 5's rule 4).
   - Files: the table, the guard, the spec; new `tools/guards/lib/thrown.mjs`;
     new `tools/guards/switches-thrown.test.mjs`.
   - **Needs.** Every need is a row; no cycle. A worker row with needs
     names its reader (`_giftClosed` in `trade.js`), and the guard fails a
     reader that does not read each of its needs. A row marked `never` (it
     may never go off: a ledger) fails while a switch it needs is still a
     row: "the switch beneath is removed first".
   - **The thrown run** (worker rows of kind `switch`): the row's system's
     suites (B's helper finds them), and those of every row that needs it,
     run once with that one flag thrown. No line of game code and no suite
     changes for it: `thrown.mjs` is a preload (`node --import`) that holds
     the one flag thrown on every room.
     - A FAIL that is the switch's own check (one that asserts what the
       switch turns off) is expected: the row lists it, by the check's
       words.
     - Any other FAIL is a second configuration that breaks. It is listed
       as known in the guard (a census: it only falls), and written under
       Found with the card whose files it is in. You fix none.
   - On GitHub the guard runs only the rows born from tag 5301 on, and its
     share stays under about 30 s; past that, write it under Found (the
     gatekeeper's call). The whole run is `--all`, by hand, once in this
     PR. If it would take more than about 30 minutes, it runs a sample (in
     each system, one switch of each `risk`), and the PR offers the owner
     the full run (CLAUDE.md §6).
   - **Page rows: no browser run.** A row names the node suite or phone
     scenario that plays it thrown, where one exists (found by the guard,
     not typed). The count of page switches with none is printed and only
     falls.
5. **(tag 5305) The end date, written; nothing reaped** (7.2).
   - Files: the spec, the table (`on`), the guard (`--due`, and the
     fallback hold).
   - `on`: the date its way went on for everyone, from git: the commit on
     `main` that made it the default (for most rows, its `born`; for an
     opt-in made the default later, that later change).
   - **The rule, as the plan writes it:** a logic switch four weeks on for
     everyone with no revert, and its old way may go; a device off-ramp
     (`risk` memory or chip) stays while its risk is live, the owner's call
     and never by age; a fallback stays while its trigger lives. "No
     revert": no commit on `main` since `on` that turned its default back,
     and the owner's live flags not holding it thrown (the repository
     cannot see them: the reaping card reads the Test panel first).
   - `--due` prints the rows the rule would let go, and why. It runs in no
     CI and no precheck, and changes nothing. Reaping is 7.3's, a later
     card, a batch a PR, each merged by the owner.
   - **The fallback hold**: the guard fails when a fallback's read is gone
     while its trigger is still in its file. A fallback leaves the table
     only in the PR that removes its trigger; the list of fallbacks only
     shrinks (a census: the gatekeeper's).
6. **(tag 5306) The page's one reader** (7.1's "one reader").
   - Files: new `src/game/switches.js` (no imports: node tests it); its
     check (in the guard, or a new `tools/guards/switch-reader.test.mjs`);
     `tools/guards/lib/systems.mjs` (the new file in `liveops`'s files, and
     `docs/SYSTEMS.md` made again: a new file under `src/game/` is
     otherwise `unsorted`, and B's guard fails a rise); the spec; and the
     first reads moved: those in files no running card holds (below).
   - One function a form (the row's `thrown` on the page: present, `=1`,
     `=0` and the words its read takes, a value), reading the address once.
     `needs` resolved: a dependent reads off when what it needs is thrown
     (rule 4). `thrown()`: the switches thrown on this page, for the
     report's `sw` (SHAPES part 5). The needs it holds are written into it
     by the guard's `--write`, between markers, and held equal (rule 2: one
     source).
   - **A move changes no address's meaning.** Each moved read is checked:
     its old test and the reader give the same answer on a fixed set of
     addresses (the name absent; present; `=0`, `=1`, `=off`, `=false`; a
     value; the name inside a longer name).
   - The guard counts reads of `location.search` outside the reader (a
     census: it only falls).
7. **(tags 5307 onward) The reads moved into the reader, a few systems a
   PR**, the systems with the fewest reads first, the files in "Files T
   waits on" last. Each PR lowers the outside-reads line. Done when it is 0
   but for the reads the spec lists as staying (a read before any module
   loads, if there is one). Then write `state: done`.

## Readings chosen for you

- **Nothing is reaped and no default changes** in this card. A switch you
  find dead (read by nothing, or its old way already gone) keeps its row
  and goes under Found.
- **The table is the one list of names** (rule 2). The report's `sw` (card
  A's file) and the wire table's `flag` column (card K's, later) are to
  read it. Once PR 3 is merged, say so under Found for A and K; do not edit
  their files.
- **System names** are B's (`tools/guards/lib/systems.mjs`). A name that
  fits two takes the system of the file its read is in.
- **A census, not a wall** (rule 3): the unlisted count, `born: unknown`,
  the outside reads, the thrown run's known reds, the page switches with no
  thrown play, the fallbacks. The gatekeeper alone makes any of them
  strict.
- **A switch another card adds**: card A's `report` and `roomrow`
  (#1706, #1708), card G's `?pixbudget=` (#1701), and any other. If it is
  on `main` when you open a PR, it is your row. If not, its own PR adds its
  row once your PR 1 is merged (your guard fails it otherwise). Say which
  in your status file, so the gatekeeper lists those PRs in order.
- **Every guard records its break proof** in its header (rule 8), tried
  once by hand. At least: PR 1, a new `_flagOn('zzz')` in a worker file, a
  new `/[?&]zzz=0/.test(location.search)` in a page file, a row's `risk`
  blanked; PR 4, a need left unread in its reader; PR 5, a fallback's read
  deleted with its trigger kept; PR 6, a moved read that answers `=off`
  differently.
- **Guards stay quick** (under a second or two: the README), but for the
  thrown run, which is a file of its own with its own line.
- **Out of reach**: `localStorage` toggles and the worker's `env` settings
  are not rows. One that acts as a switch goes under Found.

## Files T waits on

- `server/test/src-walk.mjs` and liveops.test §8f: card N's #1684. PR 1
  waits for it on `main`.
- `server/test/liveops.test.mjs`: cards A and E add their switches' checks
  to §8. PR 1 changes §8f and §8g only; merge `main` in before the PR.
- PRs 1 to 5 change no game file. From PR 6 the reads move only in files no
  running card holds. While the card named is not `done`, T moves no read
  in:
  - `src/rendering/**` (the two renderers, `pixiRenderer.js`,
    `bodyBake.js`, `stripRead.js` and the rest of card H's families),
    `src/data/soundFold.js`, `src/data/gameDisplay.js`, the gear tab under
    `src/ui/`: card H;
  - `src/ui/BroTown.jsx`: card H, and card G's #1701 (one line); and never
    while card M runs (part 11: M beside no other change to BroTown.jsx or
    the two renderers);
  - `src/debug/**`, `src/game/speedTest.js`, `src/game/renderFrame.js`,
    `src/ui/panels/DevPanel.jsx`: card A;
  - `src/game/renderRes.js`, `src/game/deviceProfile.js`: card G (#1701);
  - `src/rendering/lookPalette.js`, `lookUnpack.js`: card P (its PR 4);
  - `tools/qa/mp/**`: no reads move there (Y holds `harness.mjs`).
  Card U's `src/state/` holds no reads.

## Not yours

Reaping anything (7.3, 7.4: later cards, each reap the owner's merge); a
default turned; the report's `sw` (card A, or Q later); the wire table's
`flag` column (K); `CLIENT_SAVERS` and the Test panel's list; any game file
but `src/game/switches.js` and the reads PRs 6 on move; `held-budget.mjs`
(H).
