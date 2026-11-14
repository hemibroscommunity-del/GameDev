# The gatekeeper's review, sitting 8 (card Z; v2.3.5364)

Taken 2026-11-14 on `main` at 7593b4e (sitting 7's twelve merged). Each PR
new since that changes `server/` or `src/` had a finder read the code
around its diff (the seven angles of `/repo-review` that apply), and the
gatekeeper read the code for the candidates that decide a hold: card E's
#1752 (PR 5) and #1756 to #1761 (PRs 6 to 8b, one finder on the
increments), card T's #1754, card L's #1748, card P's #1749, and card P's
#1757 with card A's #1760 (one finder, a pair). Documents and tools got
step 3: #1751 (the planning session's), #1750 (card J2), #1755 (card V).

VERIFIED: the story runs, on the code path named (a finder's probe in a
throwaway copy, or the gatekeeper's reading). PLAUSIBLE: the code does it,
what sets it off is unproven (it says what would settle it). The probes
are not in the repository.

## Card E: #1752 (PR 5, the world's sum)

No stored shape changes, checked: `RPG_SCHEMA_VERSION` stays 21,
`_saveRpg`'s fixed list is unchanged, `migrations.js` is untouched (the
`_econ` shape `{v, g: {m, b}, i: {key: {m, b}}}` is #1699's), and `_econ`
never reaches the wire. No new put or message (rule 10): the counts ride
the purse's own put (rule 5), the bag's waiting counts folded in before
that same put. The finder ran world-sum (30), gold-door (201), bag-door
(263), migrations and cost-guard green, and `WORLD_SUM_PLANT=1` fails as
the PR says. Read clean: the bag's owner (a WeakMap) is learned only at
`_saveRpg`, and `rec.inventory === bag` stops a count into a replaced
bag (join, death and respawn wipes, takeover, kept body, spar clone);
`mail_gold` and `mail_item` are escrow roads, so a payout is counted once,
by its credit; `nml_loss` / `nml_lost` split on `to` (a player's kill),
and the killer's mail is paid exactly as before; the arena's `house` is
at most `topUp`, at most what landed; only `inbox.js` passes the doors'
new last argument (both door tests fail another caller); `join_stored` is
a load and books nothing. The five lines outside the card (`join.js`,
`nomansland.js`, `gladiator.js`, `inbox.js` two) are named in the PR with
the owner's "Go recommended" of 06:47 and 09:03.

- **VERIFIED, low-medium, not a hold: a merged mail entry is counted by
  its first credit's word.** `inbox.js` `_inboxAppend` ~551: at 200
  entries a gold credit is added to the FIRST gold entry, whatever its
  opId, and `gold.js` `mailMinted` classes the whole by that opId. A
  season reward (a mint) merged into a parked `store:` sale (an escrow)
  lands counted as nothing: the sum reads +300 unexplained, a false dupe;
  the reverse hides a real one of the same size; an arena prize's `house`
  is lost in a merge. Needs a 200-entry mailbox. Card E's (PR 9's storm,
  or keep a merged entry's minted part beside it).
- **VERIFIED, low: the test does not hold the join's line.** With
  `join.js` ~1046 (`_econ = econClean(stored._econ)`) deleted, world-sum
  stays 30 of 30: every seeded record's counts are 0. Seed one with
  counts.
- **VERIFIED, low-medium (latent): one number in three places.**
  `gold.js` `ECON_V`, `bag.js` `ECON_V` and `migrations.js` `ECON.V`, held
  together by nothing. Card E's own Found plans a bump (card Q's sitting
  card): bumped in migrations.js alone, `econClean` writes `v: 2` at each
  join and both doors stop counting for everyone, silently. Import one,
  or a test that pins them.
- **VERIFIED, low: no kill switch for the counting** (CLAUDE.md §5; the
  card's earlier recorders have `goldlog`, `daybook`). A throw inside the
  count would fail the gold change it rides; `econOn` is defensive.
- **Known, in SHAPES part 3:** value leaving by no road (the respawn wipe,
  `_resetCharacterData`, a death with no pile in town, pile expiry, the
  bounty sweep) is not yet counted; the PR names them for PR 10's storm.

## Card E: #1756, #1758, #1759, #1761 (PRs 6, 7, 8a, 8b): HELD

#1756 conflicts with `main` in `server/src/leave.js` (rehearsal 2): card
A's #1708, merged at sitting 7, already writes the day's book at the last
one out (`_roomRowLastOut`, at the book's pace, with the `owed` rule
sitting 6 asked for); #1756 adds a second, unpaced `bookFlush` at the same
line. Not a text conflict only: the mend keeps ONE writer at the last one
out. #1758, #1759 and #1761 are stacked on it. The stack began at b9f7218,
before #1708; the finder merged `main` into its top in a throwaway copy.

- **VERIFIED, high, the hold: an unpaced write at every last one out.**
  `daybook.js` ~372 `bookFlush` writes whenever the room empties with
  anything waiting, outside the book's pace, `owed` and the hand of turns
  (sittings 5 and 6 refused this shape for `roomrow.js`). The stack alone:
  one player joining, minting 1 gold and leaving every 10 s writes the book
  361 times an hour (the pace's line is 12 to 13). With `main` and both
  lines: `cost-guard` 15c fails (62 book writes an hour of sockets, at most
  18; a socket that never joins starts the tick) and `roomrow.test` fails
  6 checks (`roomrow: false` no longer stops the last one out; 10.4's
  hand). With `main`'s line alone `cost-guard` passes, but `roomrow.test`
  still fails 9 (a new character's start gold, an `econ` add, triggers a
  first write at once) and 10.5 (`SKEW_MS` pulls the test's day-ahead
  `now` back, both writes on one day). Mend: drop `bookFlush` from
  `leave.js` (`_roomRowLastOut` writes every part, `econ` included), then
  roomrow 9 and 10.5. Card E's, with `main` merged in.
- **Medium-low:** no lower-case flag turns the `econ` part off alone
  (`daybook: false` turns off the whole book: room, dev and speed too).
- **Low:** `bag.js` `let BOOK` (`setBagBook`) is one for the module: the
  last room to run `_syncBagCaps` takes every room's bag counts (one room
  in production; two in a suite or a local `?room=`). `bookAdd` measures
  the whole part at each add (~28 us on a full part); past 617 keys new
  keys count only in `over`, and the book and the characters' `_econ`
  part ways. `bookFlush` takes what waits before `_lingerEnd`'s awaits.
- **Read clean:** every `daybook.js` writer claims the running put with no
  await between; a put that throws gives its sums back; `bookAdd` is
  synchronous, never throws, inside the doors' run, refuses `__proto__`,
  `constructor`, NaN and Infinity, the part capped at 24 KB; sitting 6's
  two finds are mended (`arrOk` every place; `bookNow` clamps `now`);
  daybook §13 fails with the flush removed. #1758: chaos-restart gives the
  same lines before and after the move (8a's and 8b's NOTE become PASS),
  no check removed; the test room's `delete` reports committed keys only
  (the real storage counts one put in the same batch). #1759 and #1761 are
  tests and docs; both break proofs reproduced (`tradeonewrite` off: FAIL
  3; `arenastakeonewrite` off: FAIL 5, gold -300). Suites green on the
  stack's top: gold-door, bag-door, daybook 90, cost-guard, world-sum,
  testroom 30, chaos-restart.

## Card T: #1754 (PR 1, the switch table)

Nothing the old checks caught is lost: on today's code the scanner finds
everything main's liveops §8f and §8g found (191 reads become 222, 194
kill-switch promises the same), and a bad name still fails §8f. One
walker (`src-walk.mjs` `srcFiles`); sorted, deterministic; only `src/`
and `server/src/`. Every break proof of the card fails as it should. About
35 rows sampled: `thrown` agrees with the read for every worker row; the
memory savers are one `both` row each; `CLAUDE.md` gains one row. On the
whole list (rehearsal 1) it fails card P's #1749, whose `?fxmade=0` has no
row (196 unlisted, the line 195): #1749 is held for its own reasons
(below), and adds the row when it comes back.

- **VERIFIED, medium, not a hold: two real kill switches have no row and
  are not counted.** `verify.js` ~57 `this._flagOn(VERIFY.FLAG_OFF)`
  (`disable_verify`, the account check's) and `hidden.js` ~202
  `this._flagOn(HIDDEN.OFF_FLAG)` (`hidden_off`): `switchScan.mjs` ~303
  takes `_flagOn` only with a quoted name, and a constant is neither
  followed nor counted apart, so the guard prints "every worker name is a
  row (0 not)". The old scan missed them too. The card asks a read in an
  unknown shape to be counted apart "else a switch hides from the table":
  T's next PR, first.
- **VERIFIED, medium (latent): shapes that hide a switch.** Green at the
  line, one at a time: `(this._liveFlags || {}).x`, a destructured
  `const { x } = this._liveFlags || {}`, the flags handed to a helper,
  anything reached through `_liveFlagsEnsure()`, `_flagOn("x")` in double
  quotes, `f?.x`, `f.x` nine lines below its local (`switchScan.mjs` ~342:
  `/=\s*$/.test(before)` is never true, so a presence test excuses too
  much); a new `_xFlagOff(name)` door in `liveops.js` is excused by its
  text (~88), and every read through it disappears; on the page,
  `location.search.slice(1)` with `(?:^|&)`, `.get("x")`,
  `new URL(...).searchParams`, `.includes('x=1')`, and only the first name
  of `/[?&](a|b)=0/` (three such reads today, each later name found
  elsewhere). None is in today's code but F1's. T's PRs 2 and 3, before
  "0 unlisted" is claimed.
- **Low:** `NOT_A_FLAG` cannot be used (the scanner deletes the name, then
  the guard asks it was found), and the deletion also drops the name from
  liveops §8f/§8g; `isOwnEntries` is an excuse no check holds to being
  found. `?treenumbers` is born 5248 (its read's comment), not 5247.
  `lingeracc`'s `off` says the account cache; it is the accuracy counts
  (`linger.js` ~162). `off_groundkeep` (`pixiRenderer.js` ~224
  `clientOff('groundkeep')`, not in `CLIENT_SAVERS`) is a worker-thrown
  switch the scanner sees only as `?groundkeep`. `race`'s row says
  `townsfolk`; its read is in `race.js` (card B's `social`).

## Card L: #1748 (PR 2, the phase table)

No game file changes and nothing imports `phases.js` (it ships in no
bundle). The ledger guard's exclusion is one exact name (`NOT_LEDGER`).
`TODO_LINE` 31 is the count, read `<=`. All 36 rows are required by
`MUST`. The card's break proofs fail as claimed (a `ps.life` write
outside `_lifeTo` fails `life-door`, by design; a slot in `REJOIN_SLOTS`
with no row; a ledger phase off `NOT_A_MACHINE`; a wire `phase` name with
no row). Worker `todo` writers checked by grep for twelve machines.

- **VERIFIED, medium, not a hold: a second writer of `session.phase`
  passes.** `phase-table.test.mjs` `fnAt` (~110-130) finds a write's
  function by indentation; a method with its parameters on two lines
  takes the name of the one above. `_sneakJoin(ws,\n msg) { ...
  s.phase = 'joined' }` at the end of `joinMethods` stays green (counted
  as `_handleJoin`); `Object.assign(session, { phase })` is not seen at
  all, and `session-door.test` does not hold the field. `life-door.test`
  §2 fails both shapes; this scan does not. The repo has real block
  bounds (`maskCode.mjs` `blockEnd`, `codeOnly.mjs`) and the one walker
  (`src-walk.mjs`, which skips `server/src/vendor/`; this reads it).
- **VERIFIED, medium: a worker monster respawned by hand passes.** The
  row's scan is `\b(?:m|mn)\.(life|alive)`: `boss.alive = true` at
  `slimeboss.js` ~255 stays green, and the code's names are `x`, `boss`,
  `mon`. Scan `.alive = true` for any name, as the page row does.
- **VERIFIED, medium: the `todo` count can fall with no door built.** A
  `door` row is held only by its suite's TEXT naming the field's last word
  and the function: the worker `guard` row turned `door` (`ps.blocking`,
  `_hitStopped`, `shield-guard.test`, its `today` list left in) is green,
  todo 31 -> 30, with nine writers. A closed list of the suites that hold a
  door, and a `door` row refused while it carries `today`.
- **Low:** the worker monster row names `m.life` (a count of lives,
  `monsterlife.js` ~135) where the phase is `m.alive`; its death writers
  are in the note only. Check 4 compares names, not states (the wire's
  zone states are `wheel, safe, nml, dungeon`, the table's `wheel, town,
  farm_home, dungeon:<id>`). Check 6 holds a `todo` row's writers loosely,
  and the scan counts hits per scan, not per place (`_leaveRun`'s `gone`
  could go). Nothing checks `phases.js` stays data with no imports.
  "Nine writers in seven files" is nine files.

## Card P: #1749 (`fx-made`): HELD

Read clean: `FX_MADE` matches the seven real load addresses and nothing
else (`?v=`, a host, the footprints' bare address, the fire trail through
`loadCroppedStrip`); every twin is its original's size, a width of 4s, 256
entries with one clear; only fx-made is queued to pack; nothing reads the
seven's pixels on the CPU (`picsOnce` skips numbers; the Codex shows the
snowball's original as an `<img>`); where numbers are off the old path is
kept; the preloads (`fxStripsReady`, `_fxPreload`,
`preloadWorldAnimations`, `preloadZoneAssets`) hold for six of seven; the
families guards green; `artCache` 101.4 -> 98.3 is the 3.1 MB measured.

- **VERIFIED, medium, a hold: a load in play moves onto the page's
  thread.** The snowball burst loads as you walk (`wheelMonsterArt.js`
  ~128 `loadLook('snowman')` -> `ensureSnowballBurstTex`, freed by
  `freeLook`). With `fx-made` on, `p256.js` `p256LoadParser.load` ~164
  reads its twin ON THE PAGE each time a snowman comes near: an `Image`,
  `drawImage` into a canvas, `getImageData` and `stripAsNumbers` over
  1024 x 128 (`numbersOfPixels` alone 1.85 ms on this box), where it was a
  plain `<img>`. CLAUDE.md §7 (art loaded in play is read off the page:
  `stripRead.js`; `strip-door.test` lists `p256.js` among the page's
  packers because twins were off by default; TRAPS §317) and §8 (a load
  in play: `mp-heldsweep` within its budget; none was run). Mend: leave
  the snowball burst out of `FX_MADE` (it is not loaded at BroTown), or
  read its file's numbers on the worker; run `mp-heldsweep`.
- **A hold of order too:** after #1754 its `?fxmade` needs a row in the
  switch table (the guard fails it at 196 of 195).
- **Low:** `buffers` reads 22.9 to 23.1 against 23.4, and the effects'
  numbers sit unpacked until a chip has them (1.05 MB, against 0.32
  packed): on a renderer rebuild, or an iOS without `CompressionStream`
  (before 16.4), a measure taken then is over. `measured` still says
  22.6. `docs/specs/pictures-256.md` (6, 143, 180) and `p256.js`'s old
  header still say twins are off by default. `p256.js` ~24 says
  `Assets.unload` gives a palette row back; it does not (one row a twin,
  reused on reload: bounded). `WANTED` true by default runs the packing
  machinery (the `onSourceUpdate` patch, a 1 s interval, a context-lost
  listener) on every device, WebGL1 included: a pass-through unless a
  source is packed. `families.mjs` marks the originals `draw: 'none'`
  ("nothing loads it today") while they stay the live fallback: a later
  sweep of `none` families could delete them.

## Card P #1757 and card A #1760 (the pair)

#1757 adds one `noteMade('pack-page', ...)` in `gearSheets.js` `_gearPack`
(~347), a note a slice of 6 ms or more, timed by `performance.now()` at
both ends: nothing a frame, no layout read. `'pack-page'` is on
`HOLD_NAMES` (exact), and `hold-names.test` is green on the pair. #1760
fails a known hold of 12 ms or more at a station that left no note of its
name; the notes are read from `__btNotes` (no cap), matched exactly, and a
failed read counts as no notes, so it fails safe. #1760 needs #1757 (on
`main` nothing writes `pack-page`): they merge in that order. #1760's net
files are `mp-heldsweep.mjs` and A's status.

- **VERIFIED by reading, medium-low, not a hold: the combat strips' pack
  leaves no note.** `pack-page`'s pattern (`packTrimmed\w*|trimScanCell|
  numbersOf\w*|sliceCropped`) also takes `effectsRenderer.js` ~15201,
  `_gearStripFrame`'s `_img.then(... packTrimmed(img, w, H, n))`: an
  armoured player's swing and bow strips, packed in one go in an unnamed
  callback. #1760 passes at `peer` because one walking-sheet note covers
  the family there; a run with none fails it, and the field report cannot
  name the combat strips' pack. `_gearPack`'s flat path
  (`?gearpackgentle=0`) writes no note either. Card P's, its next PR.
- **Low:** `noteGaps` reads `known[h.key]` as it is, where `judgeHeld`
  first maps `other` and `ui:X`: those families (back on the list, which
  `holdNames.js` says can happen) would be skipped silently, and they can
  never leave a note: an exemption in words. `noteGaps` has no node test
  (`held-sweep.test` 7c holds `judgeHeld` only). A note covers its slice
  only (the PR's run: 11 ms noted, 24.5 ms held), so the report shows
  `pack-page` under its line.
- **Info:** `mp-heldsweep` is red on `main` already: `pack-page` 30.6 ms
  at `armour` against its 20. A's status still says PR 7 "not opened"
  (#1760). Card A's PR 7 waits on H and J `done` (both say `ready`); the
  go-ahead is the planning session's, in A's status and #1757's words.

## Step 3 only

- **#1751** (the planning session's, tag 5057): docs only,
  `docs/plan/README.md` ("Who answers a session's questions") and
  `orchestrator.md`, the owner's two standing answers in their words.
- **#1750** (card J2 PR 1, tag 5420): `mp-wheelmap.mjs` and `red.md` row
  5, the card's files. The check reads the game's own number
  (`__btNmlBadge`, `caps.nmlsteps`), as TRAPS §177 asks. Run once by the
  gatekeeper on the merged tree of rehearsal 1: 41 of 41.
- **#1755** (card V PR 8, tag 5327): one guard and V's status. Not on
  V's card: its PR 1 asked for "a line under Found to move onto N's" walker,
  and the owner's "1. Yes" (relayed) made it this PR. §1 now reads card N's
  wire table (which `wire-table.test` holds to `RELAY.TYPES`), §2 N's
  walker; its break proofs are in its header.

## The lines

- `tools/guards/lib/fourLines.mjs`: `effectsRenderer.js` 9871 -> 9870,
  the room #1745 earned (merged); the same on the whole list.
- The state ledger's unlisted line stays 22: on `main` and on the whole
  list the guard counts 22 (art 1, debug 2, preload 3, unsorted 16).
  Sitting 7's six are still in no ledger.
- Not strict yet (rule 3: their cards are open): the ledger's unlisted
  line, the phase table's `TODO_LINE`, the switch table's unlisted line.

## The whole

REHEARSALS
