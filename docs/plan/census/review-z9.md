# The gatekeeper's review, sitting 9 (card Z; v2.3.5365)

Taken 2026-11-14 on `main` at 0a5149b (sitting 8's nine merged). Each PR
that changes `server/` or `src/` had a finder read the code around its diff
(the seven angles of `/repo-review` that apply), and the gatekeeper read
the code for the candidates that decide a hold: card E's #1756 (PR 6's
mend) and #1764 (PR 8c, with #1758, #1759, #1761 under it), card L's
#1767, card P's #1749 with card H's #1762 (one finder), card P's #1763
and #1766 (one finder), card TF's #1770. Documents, art and tools got
step 3: #1769 (card O's card), #1771 (card LB), #1768 (card T).

VERIFIED: the story runs, on the code path named (a finder's probe in a
throwaway copy, or the gatekeeper's reading). PLAUSIBLE: the code does it,
what sets it off is unproven (it says what would settle it). DISPROVED:
kept only where the code invites the question again. The probes are not
in the repository.

## What GitHub showed at the start

Card E's five (#1756, #1758, #1759, #1761, #1764) and card L's #1767 had
NO Actions run at all: GitHub marked them "has conflicts" (`dirty`)
though git here merges each cleanly (ort, recursive and `merge-tree`
agree). Each had merged the OLD `main` (7593b4e), which leaves two merge
bases. Card L merged today's `main` (f989dc7b) and its CI ran at once,
green: the mend is to merge the current `main` and push. Card E did so
for #1756 (04004bf3), green; #1758, #1759, #1761 and #1764 had not, at
this sitting's end. #1766's `test` was red (the switch
guard), and #1763's green was from before card T's #1754 (on today's
`main` it fails the same guard): both mended by card P during the sitting
(bbc2ded3, 83638df1), green.

## Card E: #1756 (PR 6, sitting 8's mend): on the list at 04004bf3

Sitting 8's hold is mended: `bookFlush` and its `leave.js` line are gone
(`leave.js` and `roomrow.js` equal `main`'s); the `econ` part rides the
book's own puts. Checked on `main` + #1756 (tree fb992bab):
`cost-guard` 40 of 40 with the same numbers as `main` (§7 5 rows, §8 4,
§15b 12, §15c 14): **the writes did not go up**; 2000 `econ` adds start
no put; `roomrow.test` 39 of 39 (9 and 10.5 included). `ECON_V` is one
constant (`gold.js`; no import cycle, `ECON.V` 1 whichever file loads
first). The kill switch `econ: false` stops both doors and the book's
part, re-read at `/flags` and the cold load. Sitting 8's break proofs
hold: without `join.js` ~1046 world-sum FAILs 4 "blank"; without
`inbox.js` ~562 FAIL 5 (unexplained gold 300); without ~572 FAIL 5
(goods). Suites green: daybook 97, world-sum 34, gold-door 201, bag-door
263, liveops, migrations, inbox.

- **VERIFIED, medium, mended during the sitting: `econ` had no row in
  the switch table.** At e57d9700, `node tools/guards/switches.test.mjs`
  on `main` + #1756: "every worker name is a row (1 not) [econ]", 196
  unlisted against 195; `server/test/run.mjs` runs the guards, so
  precheck was red on today's `main` (the branch began before #1754).
  04004bf3 merges today's `main` and adds the row (born 5085, `--write`):
  its `test` ran at once, green; rehearsal 3 holds it.
- **VERIFIED, low-medium: two switches coupled in silence.** The `econ`
  part has no writer of its own: the room's row (`_roomRowFlush`, off
  with `roomrow: false`), the phones' `dev`/`speed` reports, and card A's
  `_roomRowLastOut`. With `roomrow: false` and no phone reporting, the
  economy part is never written; `roomrow`'s row promises only "the
  room's own row". `daybook.js`'s new header ("put to sleep ... loses
  nothing") overclaims: roomrow 10.4's fourth sitting in 5 minutes writes
  nothing at its last out, and the characters' `_econ` keep what the book
  loses.
- **VERIFIED (probe), low: a merged mail entry's `minted` goes stale
  across a rollback.** `inbox.js` ~562/572 with `gold.js` `mailMinted`: a
  rolled-back worker merges another reward into the entry and leaves
  `minted` as it was; rolled forward, the claim counts the old part (a
  false +50 unexplained). Needs a 200-entry mailbox and a merge during a
  rollback. "No stored record's shape changes" is loose: a mail entry
  gains an optional field (a rolled-back worker ignores it).
- **Sitting 8's lows, still there (low):** `bag.js`'s module-level
  `BOOK`, and now `ECON_ON`: one room's `econ: false` turns off the bag's
  counting for every room in the isolate (production has one room);
  `bookAdd` measures the whole part each add (~32 us on a full part); the
  key overflow (about 524 keys of 20 characters, then `over` only).

## Card E: #1764 (PR 8c), with #1758, #1759, #1761: HELD

#1758, #1759 and #1761 differ from sitting 8's reviewed heads only by the
merge of PR 6's mend and `docs/plan/status/E.md`; their break proofs
still fail as claimed (`tradeonewrite` off: case 3; `arenastakeonewrite`
off: case 5, -300). They are held with #1756, which they carry.

8c reads clean where it matters most: the plan's puts and the losers'
stamps are one synchronous run; each leg is paid by `_creditPlayer` with
its stamp in the same batch, under the old order's opIds; the sweep
finishes a record carrying a plan before any refund check. A restart
before every batch, then the sweep, made and lost nothing in four shapes
(chaos case 6; nobody on the winner; 3 winners and 2 losers, uneven; only
the winner backed); with no restart the payouts equal the old order's.
chaos-restart ALL PASS ("KNOWN is empty"); sponsorship, arena,
opid-audit, liveops, gold-door 201, world-sum 34, cost-guard 40. The
switch off is a real break proof (case 6 "nor lost" fails).

- **VERIFIED, medium, the hold: `arenasettleplan` has no row** (and 197
  unlisted against 195 on the stack's top): the same guard, the same
  mend (born 5089).
- **VERIFIED (probe), low-medium, with the hold: the writes go up,
  undeclared.** Each settlement writes every stake record again with
  the plan: 5 puts become 7 (one winner, one loser), 10 become 15 (3 and
  2), 32 become 52 (10 and 10); batches fall (41 to 13). `cost-guard` has
  no arena line. Card E: "rows only go up where this card says ... every
  new row has its line in `cost-guard`"; a pace that writes more is the
  owner's call (README, "Who answers"). The PR does not say it. One plan
  row in the deletes' batch would be one put, and would close the next
  find too: card E's to weigh, and to say in the PR's words.
- **VERIFIED (probe), low: a rollback then a roll-forward pays some
  winners twice.** `gladiator.js` `_arenaStakeFinish` ~902 pays each win
  leg without reading that sponsor's `arenastakerefund:` stamp (rule 6's
  reverse): 8c writes the plan, a rollback's sweep refunds the unpaid
  winners and is cut short (a record under `STALE_STAKE_MS`), 8c again
  pays every win leg from any surviving record (+7, +18, +31 g in the
  probe). Two deploys close together.
- **VERIFIED (probe), low: a hand-made id loses its leg.** ~907 refuses
  a `leg.id` outside `/^[A-Za-z0-9_:.-]{1,200}$/` but deletes the record
  anyway: a sponsor id with a space, or over about 126 characters, skips
  its leg (a fighter paid 0 where the old order paid 300). `bp_` ids
  pass.
- **Low:** `docs/specs/sponsorship.md` and `_arenaSettleStakes`'s header
  (~559) still say losers are stamped first and "a crash part-way costs a
  payout"; chaos case 6 is one shape (1 and 1).

#1772 (PR 10, the storm) and #1773 (PR 11, `xfer:`), opened during the
sitting, are stacked on #1764: not reviewed here; sitting 10.

## Card L: #1767 (PR 3, `resetOn`)

Reviewed at f989dc7b, then at 015845b6 (pushed during the sitting).

- **Mended during the sitting (VERIFIED, was medium): the two new page
  switches had no row,** and card T's scanner could not see them
  (`new URLSearchParams(q).get(key)`, the name built at run time): the
  card's own words ("each new switch is its row there"). 015845b6 reads
  each by its literal name; both rows are in (born 5203); switches.test
  green (252 rows, 195 unlisted, 0 unknown); state-resets 26 of 26, its
  new §5 fails a system with a reset and no switch; a typo probe fails
  both.
- **VERIFIED, low-medium, not a hold: writes the phase guard still
  misses.** Sitting 8's holes are closed (the two-line `_sneakJoin`,
  `Object.assign(_ss, { phase })`, `boss.alive = true`, a `door` row with
  `today`, `_ss['phase'] =` all FAIL). Green still: destructuring
  (`({ phase: _ss.phase } = x)`, `[_ss.phase] = [..]`),
  `Object.assign(_ss, o)` with `o` a variable, a spread, a template key,
  `Reflect.set`, and `boss.alive = !0` or `= back` (the scan reads a
  literal `true`). No live code writes `.alive` so today.
- **VERIFIED, low-medium: the zone door is held by a regex.**
  `DOOR_SUITES` takes `zone-leftovers` §6a (`currentZone\s*=[^=]`): a
  probe writing `S['currentZone'] = ...; Object.assign(S, { currentZone })`
  in `farmTrip.js` stays green (36 of 36), and would skip `changeZone`,
  `clearZoneLocalFx` and every `resetOn('zone')`. Run the PR's own
  syntax-tree reader on the door suites' rows too: L's PR 4.
- **Read clean:** `resetOn.js` has no imports, refuses and counts, never
  throws; `changeZone` is the one writer of `S.currentZone` and runs the
  resets on a real change only; `endOwnPose` sends the same `pose`
  message the old check sent a frame later (no new message);
  `forgetShotEnds` is safe empty; the rejoin's resets run at the end of
  `rejoinClear`, before the worker re-sends (TRAPS §278); the guard fails,
  never passes, without @babel (server's `package.json` pins it); the new
  suite runs in CI's server job. Low: §5 finds a system's registration by
  single quotes only. Sitting 8's lows: four mended; check 4 still
  compares names, check 6 still per file.

## Card P: #1749 (`fx-made`, sitting 8's hold mended)

Both holds are mended. No remaining `FX_MADE` entry loads in play: the
fire trail and the portal beam at `fxStripsReady`, the anvil and the jet
stream in `_fxPreload`, the arrow blast from `preloadWorldAnimations`
alone, the footprints from `preloadZoneAssets` alone (freed on exit); the
snowball burst fails the loader's `test()` and loads as a picture.
switches.test green (194 of 195), strip-door 36 of 36, asset-door green.

- **VERIFIED, low: the snowball's original is marked never drawn.**
  `tools/assets/families.mjs` ~292 `fx-made` says `draw: 'none'`, no
  loader, and holds `snowball-burst-v1.png`, now the only picture the
  burst is drawn from: a later sweep of `none` families would delete it
  (the load fails in silence). A family of its own, `draw: 'file'`.
- **Low, stale words:** "off by default" (`pictures-256.md` 6 and 180,
  `p256.js` 8 and 37, `strip-door.test` 167); `p256.js` 24 (`Assets.unload`
  gives no row back); `buffers` "measured 22.6" (the runs read 22.9 to
  23.1); "seven" where there are six (memory-budget's header,
  `asset-door.md`, MEMORY-MAP; census `assets.md` 123). The packing
  machinery runs on every device now that `WANTED` is on (sitting 8).

## Card H: #1762 (follow-up, tag 5050)

No hang, no leak, no page job over a few ms. `sheetOf`'s race settles by
4 s; a job posted to a dying worker is answered (`onerror`, the watch); a
worker let go during the page's wait is no longer posted to; a timer
cannot fire after its result; a revoked `blob:` falls back to the page's
cut; every new bitmap is closed. picture-door 33 of 33 (only the reason's
words changed: kind and count are what `judge()` reads); four-lines green.
It changes a line in `server/test/`, so it deploys the worker.

- **DISPROVED today, low: the gatekeeper's question.** `_runBake` now
  fails a bake with an unreadable worn piece, and two failures send a
  bake inline. Not reachable: a sheet still loading never enters the worn
  list (`gearDrawFrame`, `getGearFrame` return null), a `urlFail` is cut
  from the decoded image, and the chest and legs sheets are never freed.
  If it were reached, `_maskedBodyFrameInner` (~3357) has no guard
  (`_runLookBakeInline` has): a one-line guard would finish the mend;
  `held-sweep.md`'s new bullet overstates it.
- **PLAUSIBLE, low:** "`blob:` only" sends a sheet whose pack was
  declined (a plain file, `gearSheets.js` ~708) back to the page's cut,
  5 to 15 ms; `__btBakeWorker().byUrl` in the crowd tour would settle it.

## Card P: #1763 (world icons) and #1766 (fx-sheets): HELD

Reviewed at bbc2ded3 and 83638df1 (card P's heads of 10:43 and 10:50, now
stacked on #1749 and green). The 15 icons' DOM users (the bag's ores, the
trap's `<img>`s, `controlsPreload`, the ore flying to the bag, StatDemo's
heart) still load the original files; every twin and the whirlwind's
whole read load at module read, behind the loading screen; the whirlwind
as numbers has no CPU reader, and WebGL1, `?nopalette`, `?fxsheets=0`
and `?p256=0` keep the old path. Its memory lines match what was
measured (`artCache` 98.3 -> 97.1 -> 95.1; `buffers` +0.3 and +0.5, each
said with its MB). On #1766's head: switches.test (254 rows, 194
unlisted), strip-door 36, asset-door, picture-door 33, four-lines,
cache-bytes green.

- **VERIFIED (trace and probe), medium-low, the hold: a missed trap no
  longer breaks into its picture's pieces.** #1763 puts `trap-box` in
  `WORLD_ICONS`: `_fxLoad(TRAP_ICON_URL)` gives a source of colour
  numbers, queued to pack; about 1 s later `pack()` (`p256.js` ~240-255)
  sets `src.resource` to an empty array and `_btNumbers` to null. In
  play `trapFx.js` ~296 `_missBreak` -> `wheelShatter.js` ~140
  `cutPicture` -> `drawSourceRect` -> `paletteDraw.js`
  `paletteRegionRGBA` reads the empty (truthy) resource: every pixel
  clear (a probe: 64 of 64 opaque live, 0 of 64 packed), no seeds, no
  pieces, and the drawn planks stand in for the owner's box, in silence.
  Every missed trap on a WebGL2 phone with `CompressionStream` (the
  owner's iPhone, iOS 16.4 on); `mp-trapping` never reads
  `__btTrapArt.broken`. CLAUDE.md §7 (a picture of colour numbers is not
  read back on the CPU; TRAPS §165, §166); `p256.js`'s header (~215)
  says nothing reads an effect back, true of `fx-made`, not of the trap
  box. Mend: the trap box out of `WORLD_ICONS`, or no pack for a source
  with a CPU reader, or `paletteRegionRGBA` refusing a packed source.
  #1766 is stacked on #1763 and held with it.
- **VERIFIED, low-medium: "net 1.5 MB" leaves out the chip.**
  `startP256Pack` sends every numbers source to the chip: the census has
  `fx-sheets-supplied` 2.00 MB (page) -> 1.51 MB (chip), 0.49 MB saved by
  the card's own ruler, not 1.5 (the PR's `gpu` readings rise 1.2 to
  1.6). No line broken (`gpu` 115). It matters to the backlog's order
  (it stops at the first family under 1 MB). #1763's 0.9 is near the
  census's 0.84.
- **PLAUSIBLE, low:** the heart and sword popups, and the shards among
  the coin and Remains sprites, now break the layer's batch (the number
  in the default batcher, the icon in the numbers batcher); a draw-call
  count in a fight, `?worldicons=0` against the default, would settle it.
- **Low:** `strip-door.test` cannot see the whirlwind's new page read
  (it reaches `stripAsNumbers` through `packedTwinAsNumbers`, a wrapper
  no list names: TRAPS §317's "cannot arrive unnoticed" stepped round;
  behind the loading screen, so no law broken today); `gearSheets.js` is
  on card P's "files P waits on" while card H says `ready` (the planning
  session's answer is cited); P's status says `drawSourceRect`, the code
  `readSourceRect`; the numbers held unpacked on a renderer rebuild or an
  iOS before 16.4 are now about 2.9 MB (1.05, 0.35, 1.51).

## Card TF: #1770 (PR 1): HELD, a conflict

Read clean. `server/src` never imports `townsfolkWalk.js`; no wire, tick
or npc field changes; every stop's place and pause is the same on `main`
and the branch (only the work field changes, on four rows); the work
poses baked behind the loading screen are the same (only the
Blacksmith's `mine`); nothing new loads. townsfolk-walk 50 of 50,
folk-bakes 18, npc-cast 26; both break proofs fail as claimed.

- **The hold: `tools/dev/tag-blocks.json` conflicts with card LB's
  #1771** (both add their block on the `J2` line). Merged after #1771,
  the file reads `TF [[5460, 5479]]` and LB's, with `nextBlock` 5520
  (TF's own 5480 is card PW's block: #1774, a draft, writes `PW [[5480,
  5499]]`).
- **VERIFIED, low: PR 2's tag written in full.** `docs/specs/
  townsfolk-work.md` 9 and 75 say `v2.3.5461`; merged, `main` holds the
  tag and TF's PR 2 fails precheck's tag check ("already used"). Write
  it bare (`5461`).
- `?folkwork`, `?folkwalk`, `?folkbake` have no row (among the 195
  unlisted already; no new read here).

## Step 3 only

- **#1769** (card O's card, tag 5220): one file, `docs/plan/cards/O.md`,
  in the day-one cards' form; written by the orchestrator.
- **#1771** (card LB PR 1, tag 5500): the owner's sheet and two mockups
  under `assets/ui/leaderboard/` (sources), 27 pieces in
  `public/ui/leaderboard/` (each 246 to 256 colours, read by the
  gatekeeper), `tools/ui/cut-leaderboard.mjs`, family `ui-leaderboard`
  (`draw: 'none'` until PR 2), `sources.json`, `CREDITS.md`, MEMORY-MAP,
  the spec with a picture of every piece, LB's block. Nothing draws them.
- **#1768** (card T PR 2, tag 5302): its files are the card's (the table,
  the page, the guard and its scanner); HELD for a conflict with #1749 in
  `tools/guards/lib/switches.mjs` and `docs/SWITCHES.md` (#1749 adds the
  `?fxmade`, `?p256` rows; T's guard closes the list, so it merges
  `main` after #1749 and the PRs after it that add rows).

## Card H: #1762's two commits during the sitting

5f1722d4 (pushed at 11:02) adds one change to `maskedBakeWorker.js`
(~378): a job's early reads each post `urlRead` the moment they are in,
so a stuck kill during the wait for its sheet of numbers no longer
refuses addresses that had read; and `held-sweep.md`'s account. Read by
the gatekeeper: `sheetOf` always returns an entry whose promise settles
(to null on a failure), so the new `.p.then` cannot throw in `onmessage`;
the page already takes `urlRead` (`bakeUrlsRead(d.id, d.url)`). Its
`test` is green on that head.

## The switch table's page: one row-adding PR a sitting

`docs/SWITCHES.md` is written by `switches.test.mjs --write` and opens
with a count ("252 rows: 245 switches, ..."). Every PR that adds a row
changes that line, so any two conflict, whatever rows they add: #1749,
#1767, #1756 and #1768 each conflict with the other three (and #1767's
`?townsfolkreset` sits next to the `?treenumbers` row #1749 corrects;
#1768 rewrites `switches.mjs`). One merges a sitting; the others merge
`main` and run `--write` again. #1756 is this sitting's: it carries card
E's stack, whose next three PRs (#1758, #1759, #1761) add no row and can
all merge at sitting 10. Card T's to weigh: the count kept out of the
committed page (or written by the guard on demand), so rows in different
places merge cleanly. Until then the planning session may chain the
waiting ones (each branch merging the one listed before it).

## The lines

- `tools/guards/lib/fourLines.mjs`: every line sits at its count on
  `main` (`effectsRenderer.js` 9870 of 9870; BroTown 7801; cycles 5,
  files 29, writes to `S` from rendering 114): nothing to lower.
- Not strict yet (rule 3: their cards are open): the ledger's unlisted
  line, the phase table's `TODO_LINE`, the switch table's unlisted line
  (195; card T's PR 2 rows 81 of them).

## The whole

Rehearsed three times from `main` 0a5149b with `tools/dev/gatekeeper.mjs`.

1. Every candidate, in the order docs, P, H, E's stack, L, TF, T:
   CONFLICT at #1763 (`MEMORY-MAP.md`, P's status, `asset-door.md`:
   #1763 was then beside #1749, not on it); without it, CONFLICT at
   #1770 (`tag-blocks.json`, against #1771); without it, CONFLICT at
   #1768 (`switches.mjs`, `SWITCHES.md`, against #1749); without it
   (tree e3ad2d7a): precheck FAIL, one suite, `guards/switches` ("every
   worker name is a row (2 not) [arenasettleplan, econ]", 196 unlisted
   against 195: card E's stack, not yet with `main`); build PASS.
2. #1769, #1771, #1749, #1762 (ddd734fa), #1767 (f989dc7b) (tree
   2f81a204): precheck 0 FAIL (5 WARN: stacked branches carrying the tags
   of the PRs below them), build, questline 187 of 187. The `potions`
   flake card J2 has did not show in any rehearsal.
3. The list as written and this branch at b6b697f9 (tree 72434929):
   precheck 0 FAIL (8 WARN: stacked branches carrying the tags of the
   PRs below them), build, questline 187 of 187. Since then this branch
   has gained documents only; #1777 (card H's second follow-up) opened
   after this rehearsal began: sitting 10.

Between 2 and 3: card L's 015845b6 (its rows) and card E's 04004bf3
(`main` merged, `econ`'s row) each made a row-adding pair conflict (the
page's count line, above), and card H pushed 5f1722d4.
