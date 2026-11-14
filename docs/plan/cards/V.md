# Card V: traps into guards (step 8.2's guards)

**Starts:** now: card B (the guards' rails, `tools/guards/lib/`) and card
I's census (`docs/plan/census/traps.md`) are merged.
**Read:** `CLAUDE.md`; the ten rules at the top of part 5 of
`docs/GRAND-PLAN.md` (rules 1, 3 and 8 above all); step 8.2;
`docs/plan/census/traps.md` (its "How to read a row", its rows, its Found
and its counts); before each trap's check, the trap's own section in
`docs/TRAPS.md`; `tools/guards/README.md` and two guards as the form
(`systems.test.mjs`, `pixi-pins.test.mjs`); `tools/guards/lib/filesOf.mjs`
(find code by system, not by a big file's path, where a system will do);
`tools/dev/scoreboard.mjs`.
**Tags:** 5320 to 5339, one a PR, in the order below. (The orchestrator's
PR that commits this card took 5300, card T's.)
**Browser:** none.
**Effort:** extra.

## What this card holds

The census's rows that nothing holds today (`prose`) and that a node test
could hold (`node`): 31 traps. They go in seven batches of related traps,
most important first: where a player's goods, saves and identity hang on
it, then the fight, then the tools that test, then the screens and the art.
Each trap gets one check, and each check its break proof.

## PRs, in order

The card is committed by the orchestrator's PR (tag 5300): do not commit
it again, and do not edit it (a question goes in your status file). One
branch a PR, each begun from the one before; open each PR when its line is
done, ready for review (not a draft: the gatekeeper skips drafts).

1. **(tag 5320) The server's word and the saved character: §2, §3, §1.
   And the form every later PR follows.**
   - §2 (a field on `ps` meant to last, not in `_saveRpg`'s fixed list): a
     scan of every file under `server/src/`, in depth (card N's walker,
     `server/test/src-walk.mjs`, if it is on `main` when you open the PR;
     else a plain walk, and a line under Found to move onto N's), for
     every field a handler writes on a player's `ps`; each is in `_saveRpg`'s list or in a list of scratch
     fields the guard keeps (memory only, on purpose). Lands as a census:
     the count in neither only falls. Card E's `_econ` (#1699) is on
     `main`; card A's #1708 touches `persistence.js`: merge `main` in
     before the PR.
   - §3 (a party's XP split by roster): the worker's behaviour, so a suite
     under `server/test/` (rule 1): extend `party.test.mjs` or
     `combat-lifecycle.test.mjs` with two party members, one dealing all
     the damage; the shares stay by damage. Its merge deploys the worker:
     say so in the PR's words.
   - §1 (the `arena_bet` relay revived): hold what is true today (card I's
     Found: partly untrue): `arena_bet` is not in `RELAY.TYPES`, no page
     file sends it, and the phone's `case 'arena_bet'` only ignores. If
     card N's wire table and its guard (#1695 and N's PR 3) are on `main`,
     read the table rather than a second copy of the relay list (rule 2).
   - **The form**:
     - a guard file a batch under `tools/guards/`, named for what it
       holds; one check a trap, its line starting with the trap's §;
     - one line a held trap in the file's header, in one form the counter
       reads: `TRAPS §N (the rule | one case): what it holds. Break:
       <file>: <the change> -> FAIL (tried <date>).`;
     - new `tools/dev/scoreboard/traps-with-break-proof.mjs` (part 3's
       row, found by its file name): the traps held by a test that records
       a break proof, counted from those lines in `tools/guards/` and
       `server/test/`;
     - `tools/guards/README.md`: one short section, that line's form;
     - `docs/TRAPS.md`: one line at the end of each trap you hold,
       `Held by: <file> (tag N).`, and nothing else in that file.
   - Done when each check is green on `main`, its break proof turns it red,
     `cd server && npm test` is green, and the scoreboard prints the row.
2. **(tag 5321) Who a player is, at the join: §216, §109.**
   - §216 (an id goes beside a new key only from the worker): a unit test
     of the key-id roster in `src/networking/index.js`, or a scan that the
     heartbeat's roster write takes `S._joinedId`, never `S.myId`.
   - §109 (a first-join surface decided before the worker's
     `player_state`): a unit test of `src/game/questRoute.js` (no road to
     the Mayor while `S._rpgFromServer` is false). The coach and the
     welcome plate need the page: say in the header which surfaces the
     check covers, and put the rest under Found.
3. **(tag 5322) The fight: §43, §79, §222, §262.**
   - §43 (the page's `WEAPON_TYPES[t].base` against the worker's
     `_weaponBase(t)`): a mirror, so it goes in
     `server/test/mirror-audit.test.mjs`, which already holds
     `WEAPON_TYPES` (CLAUDE.md §7 "Mirrors"). It deploys: say so.
   - §79 (`S._engaged` is "did I tap this one", not "am I in combat"): a
     unit test of `src/game/abilities.js` (whirl engaged on a lock from
     `auto` while `S._engaged` is false).
   - §222 (the bow's volley flies from the grip): the volley carries
     `_ox` and `_oy`, and the effects renderer predicts the grip between
     shots.
   - §262 (the dungeon's loading screen holds the player still):
     `_wheelDungeonOpening` is in the hold that stops the walk.
   - §222 and §262 read `src/rendering/systems/effectsRenderer.js` and
     `src/ui/BroTown.jsx`: scan for the rule's names, never a line number,
     and say in the header that card M (the frame as steps) will move what
     it reads.
4. **(tag 5323) The tests and the tools that run them: §29, §69, §136,
   §181, §169, §199, §230.**
   - §29: label selectors in the phone scenarios (`has-text`,
     `clickText`), a ratchet (9 uses in 5 files today): the count only
     falls.
   - §69: a `window.WebSocket` wrapper under `tools/qa/` copies the real
     one's statics (`OPEN` and the rest).
   - §136: no scenario empties `S.dmgNumbers` by hand. Stepped in today
     (`mp-rollhit.mjs`, `mp-blockcost.mjs`): known, listed.
   - §181: a spawn of `wrangler dev` under `tools/` passes
     `--local-upstream`.
   - §169: `no_web_socket_compression` is not in `server/wrangler.toml`.
     Read it; never change it (CLAUDE.md §4).
   - §199: each folder under `public/world/` the game fetches at a `?v=`
     address has its own rule in `public/_headers`. Stepped in today
     (`/world/arena/`, `src/data/arenaArt.js`): known, listed.
   - §230: no tool under `tools/audio/` folds a sound with ffmpeg's
     `-ac`. Stepped in today (`cut_monster_noises.py`): known, listed.
5. **(tag 5324) The screens: §52, §64, §77, §85, §134.**
   - From `src/styles/game.css` and the panels: a CSS mask never shares
     its `<img>`'s or a preload's file (§52); `.bt-name-modal` keeps
     `overflow: clip` under a coarse pointer (§64); no `%` or `em` inside a
     custom property another rule's `calc()` multiplies (§85); the quest
     banner is portalled to `document.body` (§134); the Test panel's
     fetches have a timeout (§77: `DevPanel.jsx` is card A's while A
     runs; you only read it).
6. **(tag 5325) The look's tables: §93, §94, §95, §106, §119.**
   - Pins of the look's tables (`EYE_STYLE_PAINTS`, `MAIN_MATERIAL`,
     `SKIN_CATALOG`: §93, §94, §95), and closed lists of the readers of a
     texture's `.frame` and of `getBounds()` that size something else in
     `src/rendering/` (§106, §119): a new reader fails until it is listed.
7. **(tag 5326) The art on disk: §27, §55, §56, §58, §255.**
   - Read off the shipped files (the tee sheets, the eyewear frames and
     `eyeMask.json`, the traits' `hi/` frames, the body sheets).
   - `tools/png.mjs` reads RGB and RGBA only; a 256-colour file is read
     with the game's own `src/rendering/png8Decode.js` (as card P's gate
     does). A guard stays under a second or two: where the whole set is
     slower, a fixed sample (each facing once), said in the header.
   - Then write `state: ready`, and stop.

## Readings chosen for you

- **A guard holds the rule, not the one case.** That is the census's
  lesson: 144 rows are held only for the case the trap found. A check reads
  every place the trap could come back (a system's files through
  `filesOf`, a folder, a table). Where only the one case can be pinned, its
  header line says `one case`, and why.
- **It lands green on `main`.** Where the trap is stepped in today (the
  census's Found: §136, §199, §230; and any you find), the guard lists those
  places as known (rule 3: the count only falls, and only the gatekeeper
  makes it strict), and each place goes under Found with the card whose
  files it is in. You fix nothing outside your files.
- **Where a check goes** (rule 1): a test of the worker's behaviour under
  `server/test/`, extending the nearest suite (it deploys: say so in the
  PR's words); a pair that is a mirror in `mirror-audit.test.mjs`;
  everything else (scans of source, unit tests of the page's rules, checks
  of files) under `tools/guards/`, which deploys nothing.
- **A scan reads names, never line numbers.** One that reads `BroTown.jsx`
  or the two renderers names card M in its header. Prefer a unit test of a
  rule's own module in `src/game/` where one exists.
- **The break proof** (rule 8): the census's break is a starting point,
  written from reading and never run. Yours is the one-line change you
  made in a scratch copy that turned the check red, then undid. Where a
  rename would dodge the check (a name read by a scan), try the rename too.
- **A trap a node test cannot hold honestly** (it needs the page, or the
  census's `node` was wrong): no guard, and one line under Found saying
  what would hold it (a browser test, or nothing). The same for a trap the
  code has made untrue: hold what is true today, or nothing, and say
  which.
- **Guards stay quick**, under a second or two each (the README). GitHub's
  `test` job has only `server/`'s packages (esbuild); the root's `@babel`
  is not there.
- **What comes after this card** (not yours): the 108 rows held for one
  case that a node test could hold for the whole rule; the 16 rows only a
  phone scenario holds that a node test could; the 18 held by precheck or a
  script run by hand alone, which GitHub never runs. Put the counts you
  leave in your status file; the next card is written from them.

## Files V waits on

- None to start. You write only new files under `tools/guards/`, the one
  new counter under `tools/dev/scoreboard/`, the README's section, the
  "Held by" lines in `docs/TRAPS.md`, and the three suites named above
  (`party.test.mjs` or `combat-lifecycle.test.mjs`, `mirror-audit.test.mjs`).
- Read, never written: `server/src/persistence.js` (card A's #1708),
  `server/src/relay.js` and `server/src/wire/` (card N), `tools/qa/mp/**`
  (card Y's `harness.mjs`), `src/ui/panels/DevPanel.jsx` (card A), the
  renderers and `BroTown.jsx` (card H; card M later). Merge `main` in
  before each PR's last push.

## Not yours

Fixing a trap stepped in today; `docs/plan/census/traps.md` (card I's
record, not edited); any trap section's text in `docs/TRAPS.md` but its
"Held by" line; `tools/dev/precheck.mjs` and its checks (moving a
precheck-only trap onto GitHub is the next card's); any game file.
