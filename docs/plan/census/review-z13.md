# The gatekeeper's review, sitting 13 (card Z; tag 5370)

Taken 2026-11-14 on `main` at 82fb78da (tree 6d056530, sitting 12's
eleven merged, exactly its rehearsed tree). Tags in this file are written
bare. Each new PR that changes `server/` or `src/` had a finder read the
code around its diff (the angles of `/repo-review` that apply) and try to
disprove what it found; the gatekeeper re-read the code itself for every
mend that decides a hold, and for every finding that would. Documents and
tools got step 3.

VERIFIED: the story runs, on the code path named (a finder's probe in a
throwaway copy, or a reading). PLAUSIBLE: the code does it, what sets it
off is unproven (it says what would settle it). The probes are not in the
repository.

## Decided for the owner while away

Each with its switch, for the planning session to read to the owner:

- **#1794** (card O, listed): a cool but slow computer on a 60 screen (a
  judge's laptop) also steps to a steady 30. Its switches: `?govern=0`,
  `?ladderrate=0`; for every phone, live, the Test panel's "Speed ladder"
  row (`govern`, #1814, listed). With it, answer (a): a fast screen is
  never paced below about 40.
- **#1800** (card O, listed): answer (b), a rung takes a share of the
  pixels actually drawn, so a slow laptop's picture softens too (0.75,
  then 0.5, at its loading screens, after a steady 30). Its switches:
  `?ladderpix=0`; for every phone, the "Speed ladder" row. And answer
  (A), which departs from the card's "the next sitting starts there": a
  kept rung loads without its pixel rungs. No switch of its own:
  `?ladderpix=0` or the "Speed ladder" row turns the pixel rungs off
  altogether.
- **#1812** (card TF, listed): the cook kept at 256 colours with a limit
  of his own, 23 (every other picture 16; the owner's "I won't notice at
  all from anything at 256"). Its switch: `?folkskills=0` (the three
  townsfolk back in PR 1's poses, none of the set loaded).
- Not under the heading, the nearest: **#1814** replaces card O's cap
  `ladder` with a row on the Test panel's list (the planning session's
  technical word: no cap, no new worker behaviour). **#1819** says
  "Nothing"; K's two say nothing a player sees.
- Still waiting for the owner's own word (costs, never decided this way):
  card SK's #1782 (+8 to +10 move messages a ride; `?ridecoast=0`), not
  listed; card E's `arenasettleplan` and `econresetput` (both OFF).

## What GitHub shows, step by step (card Z's step 5b)

Every listed PR's base is `main` (`base.ref`, read at the sitting's start
and again at the list). Merged down the list in its order in a scratch
copy (each a merge commit), every head had ONE merge base with the `main`
above it (`git merge-base --all`), this branch last included. Card O's
stack (#1792, #1794, #1800, #1814) carries each PR in the next, with
`main` 82fb78d merged into #1792 and carried up: each needs nothing
after the one before it lands. With `main`: #1820's and #1822's merge
base is 201734d (`main` since then: documents only), #1819's 9fd5e58,
the rest 82fb78d.

**Why not the rest (tried in the scratch copy):** card T's two conflict
with O's stack and with TF either way round; R's #1823 and #1825 with
#1819 (each adds R's status file); L's #1824 with #1792 (the
`DOOR_SUITES` end). Each is held below with what its session does.

## Card K: #1822 (PR 1, tag 5181) and #1820 (PR 3, tag 5183): listed

**#1822, the worker's two lists made from the wire table (it DEPLOYS),
read at 1f1494f: clean (lows).** A finder computed both sides: main's
literals (82fb78d) against the made Sets, `PRIVILEGED_EVENTS` 163 and
163, `RELAY.TYPES` 26 and 26, wire-audit's echo list 9 and 9, none
missing, none extra (VERIFIED, a script). `index.js` re-exports the very
object `lists.js` makes; `RELAY.TYPES` the same frozen object; the
router's order is unchanged (privileged first, index.js ~6011, then the
relay list or `relaylist: false`). No cycle: `lists.js` reads two leaves
(`out.js`, `relays.js`), `relay.js` reads `lists.js`; the Sets are built
before either file's body runs and read only in handlers, by `.has`.
`index.js`'s one hunk is the list's definition alone (its comments
stripped: `export const PRIVILEGED_EVENTS = new Set([]);`); `relay.js`'s
is `TYPES` alone; every why moved above its row. Break proofs re-tried
in a scratch copy: a `type: 'zz_new'` send with no row fails wire-audit,
naming it; with its `out` row it is privileged with no other edit (the
card's done-when). The six suites outside the card (the planning
session's yes) each read the made Set, one check each. Bundle: +95 KB
raw, +12.4 KB gzipped by the finder's esbuild (the PR says +88 KB: the
options' noise), far under the worker's limits; start-up 3 to 6 ms.

- Low, VERIFIED: stale pointers, nothing at runtime.
  `tools/guards/lib/systems.mjs` (~59-60) still names `index.js` and
  `relay.js` as the lists' homes (K's Found); `CLAUDE.md` §5 and §8,
  ARCHITECTURE-HANDOFF rule 13, a TRAPS line and WIRE-PROTOCOL still say
  "a line in `RELAY.TYPES`"; the two files' comments point to the
  table. Card K's later PR updates CLAUDE.md.
- Low, by design: wire-table §7 holds today's lists for this PR only;
  until K's PR 2 takes it out, a PR adding an `out` or `relay` row edits
  that copy too (none in flight does).
- Suites: the full `npm test` (409 suites) green at the head; wire-audit,
  wire-table 27, the six; CI `test` green.

**#1820, the hostile-values census (a test and a page; it DEPLOYS, a new
file in `server/test/`), read at 785fd62 by the gatekeeper.** 10,524
cases on card E's test room, a seeded clock, about 9 s; `LINE = 19`, the
census page made by `--write`, the break proof (`WIRE_HOSTILE_PLANT=1`)
in the header. It changes no handler. Its count holds on the whole list
merged (precheck runs it). Low: the PR's words and K's status name seven
`move` fields (`vx`, `vy`, `d`, `f`, `eqc`, `eql`, `ex`) where the census
lists eight (with `eqs`: 16 cases, two a field). The 19 are K's Found
(`movement.js` keeps a sent object on the record and relays it on the
tick; `chatmod.js` stores a mute of `__proto__` as an own key; the honest
restart reads as value gone in E's sum): card K's PR 4 (`wiredoor`) and
each row's own fix lower the line.

## Card R: #1819 (PR 1, tag 5280): listed

**The roads between players, one table (it DEPLOYS), read at 0b18482,
then 64ad279 (documents: SHAPES part 7's approved line, R's status):
clean (lows).** A finder imported both sides: the made `XFER.ROADS`
(`trade_window`, `gift_trade`) and `XFER.KILLS` (`nml_loss`) equal
main's literals, frozen arrays in the same order, every other `XFER` key
the same; their one reader in the worker is `XFER.ROADS.indexOf(road)`
(xfer.js), unchanged on an array. The table is true to the code: all 5
`move` roads and all 24 `escrow` roads (gold, bag, `bagWhole`) are on a
row, the bank's `own`; each settlement's door calls were read (the arena's
entry and stakes, gladiator.js ~302, ~548, ~551; the duel's group road
~223; the store's buy-now ~913, ~926, bid ~972, listing ~742; the
offers, storeoffer.js ~173, ~234); each row's `at` function exists where
it says; nothing is missing (gamble.js and dice.js are against the
house; the war payouts mint; there is no mail between players).
`playerroads.js` imports nothing. Every fee, hold and pace 0: no
behaviour changes. Break proofs, each re-tried: a fee of 1 fails §1; a
planted `move` road fails §3 (and xfer.test §2); `nml_loss` off its row
fails §3; the `threat_bounty` row removed fails §4; `GOLD_ROADS`' `class`
renamed fails §2, §4, §6 loudly.

- Low, VERIFIED (a probe): a row can claim `ledger: 'xfer'` with nothing
  behind it. xfer.test's removed check ("nothing on either list but a
  `move` road") has no true successor (its new check restates
  `playerRoadsBy`): `market.ledger` set to `'xfer'` stays green in
  player-roads, xfer, cost-guard and world-sum, though no market
  settlement writes an `xfer:` row. Before this PR such a list failed.
  No effect today; mend in R's next PR that touches the table (each
  `xfer` row's road must be a `move` road, or name its writer).
- Low, VERIFIED at 0b18482, MENDED at 64ad279: the approved line of
  SHAPES part 7 (its 10.5 row, "three columns, not a table", ~854) was
  not in the PR, so part 3's new text (~482) and part 7 disagreed; R
  pushed it during the sitting (the planning session's yes), with part
  3's line to match.
- Nit: `threat_bounty`'s ledger is `none` while its own why calls it a
  kill (kept so `XFER.KILLS` stays as it was): R's PR 11 (`xferescrow`)
  should read it.
- Suites on the PR merged with `main`: player-roads 13, xfer 22,
  gold-door 201, bag-door 263, world-sum 34; precheck 0 FAIL; the full
  `npm test` green; CI `test` green at the head.

## Card O: #1792 (tag 5222), #1794 (5224), #1800 (5225), #1814 (5235): listed

Read at fd0bae6, e06b7bd, 3b5a97a and 770e227 (a stack: each carries the
one before; `main` 82fb78d merged into #1792 and carried up; each one
merge base with the `main` above it, step by step). Sitting 12's three
mediums on #1800 were re-read by the gatekeeper in the code as it now
stands (b72e715, carried into 3b5a97a and 770e227):

- **#1792, the rung on a module object (fd0bae6): VERIFIED clean.**
  `LANE._rung` in drawLanes.js, written by `setRung` and the tests'
  `_resetLanes` only; its `DOOR_SUITES` row takes #1803's `prop` form
  (`prop: '_rung'`, the reset in `besides`); frame-pacer §17 reads the
  new form (2 writes in the file). Low: `besides` matches by the text
  `LANE._rung = ROW`, so a second write of exactly that text elsewhere in
  drawLanes.js would pass the tree (§17's count of 2 still fails it).
- **#1800, sitting 12's first medium (a pixel rung held a cooled phone at
  30 until its next veil): MENDED, by reading.** The pixels are an axis
  of their own (`AXES.pixels`), and a try up picks the last axis stepped
  down that is NOT the pixels' (framePacer.js, `verdict`, the `back`
  loop), then the chip's, the work's, the pixels' last. The rate (the
  chip axis's first rung) now changes no pixel knob, so `movesPixels` is
  false and the rate comes back in play; the pixels at the next veil.
- **#1800, the second (a pixel step wanted before a hidden tab was taken
  at its return): MENDED, by reading.** Every hide counts (`_tabHid`,
  `_hides`); a pending step carries the count it was wanted at, and
  `veil()` drops it when the count moved.
- **#1800, the third (a work-bound phone reached the pixels): MENDED, by
  reading.** A bad verdict tries `['work', 'chip']` when the late frames'
  split says work, `['chip', 'pixels', 'work']` otherwise: a work-bound
  phone stops at the rate (the crowd's rungs are not live until O's
  PR 6). Low: with no split known (`axisNow` null and no `lastAxis`) the
  order falls to the chip's, pixels included; the frame meter hands its
  samples at module load (perfTracker.js, always imported), so only a
  bad verdict with no late sample in the ring meets it.
- **#1800's three axes, re-read as new code** (the planning session's
  ask): `knobAt` takes a knob's deepest `to` over every axis, so the
  rate (chip's first, work's last) and the pixels (their own axis) each
  move one knob; `ladderDepth` sums the three (9, under the worker's
  `RUNG.MAX` 31, mirror-audit); `trim` and `next` walk each axis; the
  light lane's `LIGHT_AT` (work 1, chip 2) is unchanged, the pixels
  having been the chip axis's last rungs. frame-pacer §21a is sitting
  12's probe (a 60 phone that cannot keep 30 takes the pixels at a veil;
  cooled, the rate back in play at ~545 s, before the next veil; the
  pixels at it), with its break proof in the header. Low, for later: a
  chip-bound phone whose pixel step waits for a veil takes no other step
  meanwhile (`'pending'` is truthy, so the order's loop stops there):
  harmless today (the work axis's one live rung is the rate, already
  taken); to re-read when O's PR 6 makes the crowd's rungs live.
- #1800's lows from sitting 12: `?ladderrate=0` and `?ladderpix=0` take
  their knobs off the governor's live set (drawLanes.js `liveKnobs`);
  the resize runs at the top of the next frame. The kept rung's shape is
  now `[work, chip, pixels, live set]`: one kept as two axes is not
  loaded (a phone starts at the row once: localStorage, no server
  record).
- **#1814 (the governor's switch for every phone)**: `govern` a row of
  `CLIENT_SAVERS` (live, the Test panel's list; the worker already keeps
  `off_<id>` and tells every phone at join and at once), in place of the
  card's cap `ladder` (the planning session's word). Off: the work's and
  the chip's rungs back to the row at the next verdict, the pixels' at
  the next veil (`rest()`, carried onto the three axes in the merge of
  #1800, 770e227); no step after. `server/src/report.js` `SAVERS` gains
  the word (report.test §1 holds the mirror; an older worker drops a
  name it does not list): it DEPLOYS, no write and no message added.
  `framePacer.js` imports `clientOff.js` (a leaf).
- Suites: CI `test` green at each head. On the rehearsed tree: precheck
  (every server suite and guard), build, questline (below).

## Card TF: #1812 (PR 2, tag 5462): listed (sitting 12's hold mended)

Read at 854164b (the mends), then fc3cce4 (`main` 82fb78d merged in; the
pictures of the mends; `mp-folkwork`'s after-picture taken while he still
walks). The gatekeeper re-checked each part of the hold:

- **The red on `main` (`mp-folkwalk` 4 waited for `pickup`): MENDED,
  run.** §4 waits for `cook` where the trades' figures are drawn
  (`__btFolkSkill`: on, not switched off, every sheet in), `pickup`
  otherwise (`?folkskills=0`, a computer that draws photographs). On the
  rehearsed tree: `mp-folkwalk` 12 of 12, §4 "drawn cooking (cook)".
- **The form shade: MENDED, by reading.** folkSkill.js marks the body,
  tee and tool `_vShade = SHADE.figure` (as `markStandIns` does a
  player's stand-ins); formShade.js reads a sprite's own `_vShade` first
  (~188). townsfolk-walk §6 holds the three marks and the import, with
  its break proof. The head's pieces stay unshaded, as a stand-in's.
- **The ghost sample: MENDED, run** (the planning session's ruling:
  `mp-folkwork`'s own check is the card's ghost sample for the
  townsfolk, `mp-ghostaudit` playing the player's body). Check 7, after
  EACH of the five trades, upright: nothing of it left, his walking
  body back or the next trade's figure alone, never both, a picture of
  each moment. On the rehearsed tree: RESULT_UPRIGHT.
- Lows mended: §6d reads the real hook (it was vacuous); §6e's second
  break proof is true (role-bake.mjs records any bar off the law's 16,
  `LAW_BAR`); the set loads only where somebody is drawn doing the
  trades (`lookFolkWantedAtLoad() && folkWalkWanted()`: not under
  `?lookfolk=0`, its live switch as the world loads, or `?folkwalk=0`),
  check 8: RESULT_UNSEEN.
- Low, not mended (sitting 12's): precheck's `look-roles` runs `--hashes`
  for some paths only (precheck.mjs ~935), not the set's sources: a
  re-export of the cook strip would leave Chef Blaze stale without a red
  (`role-bake --hashes` reads the set fresh today). Precheck is no file
  of card TF's: for the card that owns precheck's look checks.
- No new import cycle from folkSkill.js's new imports (`formShade.js`,
  `lookFolk.js`, `townsfolkDay.js`): the four-lines guard holds the
  cycles at 5 groups, 29 files, and passed on the merged tree; the
  module's top-level `_load` calls both askers as it loads, which the
  build and questline ran.
- Memory as at sitting 12 (+3.2 MB at the chip's peak, no line raised).
  CI `test`, `playable`, `memory-budget` green at fc3cce4.

## Card T: #1816 (tag 5303) and #1817 (5304): HELD (a conflict)

Read at 7ba13be and f03a1b3 (#1817 carries #1816; each `main` 82fb78d
merged in, one merge base). Step 3 as at sitting 12 (the switch table and
its page, card B's map, SHAPES' two lines, the spec, the thrown run's
guard and preload, T's status; no `server/` or `src/` file); since then
only `main`'s merges and the page count's first line (77, with `main`'s
`?packworker`). CI `test` green at 7ba13be, running at f03a1b3 when read.

**Held: they conflict with this list, either way round.** Tried in a
scratch copy: #1816 against card O's stack from #1792 on (the
`?govern` row, then `?ladderpix`, `?ladderrate`, `govern` in O's place
of its own at `tools/guards/lib/switches.mjs`'s end, which PR 4 sorts by
name) and against #1812 (`docs/SWITCHES.md`'s count line, with
`?folkskills`). PR 4 is the guard that closes the list, so it goes last
(card Z step 5): card T merges the new `main` after this list lands,
placing O's four rows and TF's one by name. From then a row's place is
its name and these collisions end: **the next sitting lists T first.**
For the owner, as at sitting 12: the thrown run adds about 16 s to every
PR's `test` (paid minutes); the full run (about 45 minutes) is the
owner's to ask for.

## Card LB: #1821 (tag 5503): listed

Documents only (`docs/plan/status/LB.md`, `state: done`). True: #1771,
#1783 and #1798 are on `main`. Its Found keeps the old rank trophies
(`public/icons/ui/rank-<n>.webp`) for the owner's call, nothing removed.

## Opened during the sitting: #1823 (R, tag 5283), #1824 (L, tag 5211), #1825 (R, tag 5287), #1826 (K, tag 5186): HELD (conflicts)

Opened at 18:43, 18:44 and about 18:50, against `main` 82fb78d, `test`
running when read; each changes worker code (two doors that move value,
and the day's book), so each wants a full review: the next sitting's,
once each merges the new `main`.

- **#1823 (card R PR 4, the skill points' door)**: add/add conflict with
  #1819 at `docs/plan/status/R.md` (each R branch begun from `main` adds
  the file). Card R merges the new `main` after #1819 lands. It also
  adds lines to `CLAUDE.md` (a new door's rule) and changes `join.js`:
  the next sitting reads both.
- **#1825 (card R, the storage's size in the day's book; `storesize`
  ON, the planning session's word, as `cost-guard` shows no added put)**:
  the same add/add conflict with #1819 at `docs/plan/status/R.md`, and
  with #1823 after it. R merges `main` into each in turn, one a sitting
  or one after another, as the next list orders them. It adds a switch
  row and touches `src/ui/panels/EconCard.jsx`.
- **#1826 (card K, the gain bench: tests and a census, no judge
  changed; it would deploy, new files in `server/test/`)**: add/add
  conflict with #1822 and #1820 at `docs/plan/status/K.md` (its copy
  differs from theirs, which agree); `test` running when read. K merges
  the new `main` after its two land.
- **#1824 (card L PR 5's second, the duel door)**: conflict with #1792 at
  `tools/guards/phase-table.test.mjs` (both add a `DOOR_SUITES` row at
  its end), in either order. Card L merges the new `main` after #1792
  lands. It adds a switch row (`docs/SWITCHES.md`): after card T's PR 4
  it takes its place by name.

## Not open: card J2's PR 6 and card P's fire goblin

- J2's PR 6 (tag 5425, `mp-lookarmour`): its branch
  `claude/plan-j2-6-lookarmour` (33c703f, 18:06) says `working`, no PR.
  The two finds named with it (`mp-ghostaudit`'s cook drawing 0 frames
  on `main`; the heldsweep's `R > J` redraw over its 12 ms line, one run
  in five) are written in card TF's status (Found), not yet J2's: no
  card owns them, and no PR is open for them.
- P's fire goblin (A'): no branch, no PR.

## The lines

`tools/guards/lib/fourLines.mjs`, measured on `main` 82fb78d: every file
and function at its line exactly (effectsRenderer 9870, entityRenderer
8961, BroTown 8371, `BroTown#BroTown` 7801, ...), the import cycles at
5 (29 files), the writes to `S` from rendering at 114: nothing to lower.
The switch table's unlisted line is card T's #1816 (held).

## The whole

Rehearsed with `tools/dev/gatekeeper.mjs` from `main` 82fb78d, the list
in its order (#1821, #1822, #1819, #1820, #1792, #1794, #1800, #1814,
#1812):

1. With #1812 at 854164b (tree c6d86f3f): precheck 0 FAIL (4 WARN),
   build, questline 187 of 187.
2. **The list as written, #1812 at fc3cce4, without this branch (tree
   ad355e20)**: precheck 0 FAIL (4 WARN: card T's two old closed
   branches carrying 5222; the busy-branches note; `look-roles`' "code
   changed" for `standin`, as on `main`), build, questline 187 of 187.
3. **The list with this branch last** (documents only): precheck and
   build on the whole; its tree is in the list sent to the planning
   session (the file cannot carry its own tree).

Each listed head's `test` is green on GitHub; each base is `main`; ONE
merge base each, step by step down the list.
