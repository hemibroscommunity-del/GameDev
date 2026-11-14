# The gatekeeper's review, sitting 7 (card Z; v2.3.5363)

Taken 2026-11-14 on `main` at b9f7218 (sitting 6's sixteen merged; #1739
was dropped from it). What sittings 4 to 6 reviewed in full
(`review-z4.md` to `review-z6.md`) was not reviewed again: this sitting
read the MENDS made since, and the PRs new since, that change `server/` or
`src/`. A finder and its own disproof pass a target, each reading the code
around the diff: card P's #1736 and #1743 (one finder, the same file) and
#1745, card H's #1741 and #1747 (#1745 and #1747 opened during the
sitting). Card A's mend (one line and its test), card Y's #1739 (its code
unchanged since sitting 6 read it: only `main` merged in and its status),
card L's #1746 (tools: step 3, its "done when" tried by hand) and the
orchestrator's #1744 (cards) were read by the gatekeeper.

VERIFIED: the story runs, on the code path named. PLAUSIBLE: the code does
it, what sets it off is unproven (it says what would settle it). DISPROVED
lines are kept where the code is confusing enough to be found again. The
probes the reviewers ran are not in the repository.

## Card A: #1708, #1711 (sitting 6's hold MENDED)

`roomrow.js` `_roomRowRefused` now sets `m.owed = true` (d3389c32), so a
save refused as `newer` AT the join, with no join counted, owes the book
at the last one out; roomrow §3 reads the STORED book alone (`refused
[2, 1]` in the last `daybook:` row, `owed` false after), and its header
names the break proof (the line dropped: FAIL 3). A refused `put` owes it
too: a put the storage refuses (the book's own included) is paced by the
same hand (three turns, one back each 5 minutes), and needs a last one out,
so a failing storage writes at most the book's pace, never a loop. The
header now says what a wake with no join loses (`restarts`, in memory
only): the trade sitting 6 named, accepted in words. #1711's own files are
unchanged since sitting 6 read them (`report.js`, `devtools.js`,
`wire/http.js`, `src/debug/report.js`, `speedTest.js`, the panels): only
`main` and the mend merged in. The suites ran green in both rehearsals
(roomrow, cost-guard, report, wire-table with #1711's row). Sitting 6's
low notes stand (a burst of short sittings loses its last tail; the
running put's turn counted twice): not holds.

## Card P: #1719 (sitting 6's hold MENDED), #1736, #1743, #1745

#1719: `main` merged in (f66370da) and `shipped.json` written again: 19
rows out, no other row moved; it, #1736 and #1743 merge with no conflict
on `main` and on each other, and the asset door's guard is green on the
whole. Card P's backlog rules met by #1736 and #1743: the slot's row in
`docs/MEMORY-MAP.md` (the UI icon's), the census written again from three
runs, `shipped.json` written again (no file changed), a `?<name>=0`
off-ramp, the `artCache` line lowered by the MB measured (112 -> 109.1 ->
107.0), no line raised, `rowsFull` 0 in the PR's words. #1743 was taken
before `tree-tiers` (higher in the census) for a reason its PR states.

Read clean: no portrait and no coin strip is a Pixi texture anywhere (21
portraits, all distinct from every figure, walk strip and prop; the five
`getNpcTexture` callers pass a figure; every other use is an `<img>` or
the coin's CSS background); `Assets.unload` (8.17.1) destroys only this
loader's texture, and nothing else loads those addresses; no QA test reads
them as textures (`mp-npclooks` 4, 4b, 4c read the DOM and pass).

- **#1736, #1743, PLAUSIBLE, low-medium, not a hold: the saving may be
  counted more than it is held.** `pixiRenderer.js` ~97 sets
  `preferCreateImageBitmap: false` (v2.3.778, the iOS purge), so Pixi
  loads every file as an `<img>`-backed source (`loadTextures.mjs`: an
  image, its `src`, no `decode()`), and a picture never drawn is never
  uploaded. A browser decodes an `<img>` when it is painted or uploaded,
  so what a portrait or coin strip held may have been its encoded bytes
  (about 0.4 KB a portrait, 42 KB a strip), not w x h x 4; `__btTex`
  counts w x h x 4 for every source in the cache. Nothing a player sees
  changes either way, and it can only free memory. It matters for the
  backlog's ORDER: the census ranks families by this count, so a family
  of pictures nothing draws ranks high for little. Settle: Safari's
  memory reading (Web Inspector, Timelines, Memory) at the fight with
  `?npcheads=0` and without, or `performance.measureUserAgentSpecificMemory`
  in Chromium. Card P's, before the next backlog PR.
- **Note: the lowered line locks in little.** `artCache` 107.0 against
  43.7 measured is 63 MB of room (it was 48.7 of 112 before): a PR putting
  the portraits back stays green. This is the card's own rule ("lowers
  each line by what it saved"), followed. Whether a line far above its
  measure should come down to it is the owner's call (the memory law: lower
  a line to lock a saving in).
- **Note, old behaviour, improved by #1743:** `/sprites/*` has no cache
  header (`public/_headers` names only the hashed and the Wheel's trees),
  so each use revalidates: the coin's strip, first asked for at its first
  flight, makes a round trip (a 304 now, a full download before #1743,
  whose window asked for the address without `?v=`). The portraits make
  the same trip, with or without the change.
- **Found, outside the diff (card P's to weigh):** the Town Hall's board
  (`src/data/townBoard.js`, `TownBoard.jsx` ~49-60, `TownBoardPage.jsx`
  ~59) shows five `-head.webp` portraits at the bare address, without
  `npcArtUrl`'s `?v=`: fetched when the board opens, and after the art's
  version moves it may show an older head than the dialogue.

### #1745 (`tree-tiers`, opened during the sitting)

Read clean: a tree's texture has one reader (`nodeSpriteTex`) and nothing
reads its pixels on the CPU; no tint (`NODE_TIER_TINT` is `{}`), filter,
mask or blend on a tree, and its see-through, sway, shadow (`shadows.js`
sends `_btPal` sources to their group) and `ONE_BATCHER` paths read
numbers; the five files are palette PNGs (42 to 65 colours, colour 0
clear). Where numbers are off (`?nopalette`, WebGL1) the renderer says so
at once and the trees load as pictures; their one promise is on
`_fxPreload`, so the loading screen still waits for them. `?treenumbers=0`
is exactly the old path. `cacheSourceBytes` gives the old count for every
source that is not numbers (only `makePaletteSource*` set `_btPal`, with a
byte array: it cannot hide a full-colour copy); the probes do nothing per
frame and read no layout; `cache-bytes` green; `effectsRenderer.js` 9870
code lines against its 9871. `buffers` rises by exactly the trees'
numbers (1,467,032 bytes), the MB and why in the PR's body: the planning
session's rule for a numbers PR. None of card H's or card P's waiting
files.

- **VERIFIED, medium, not a hold: the trees stay pictures for a new
  character and a slow login.** `effectsRenderer.js` ~2488 pushes
  `treesWhenReady()` at module load (`BroTown.jsx` imports it at page
  load), and `p256.js` `whenPaletteDecided` gives up after `DECIDE_MS`
  (20 s) from its first call. The renderer is made only when `bootPhase`
  is null, after the creator, a key login or a slow check, so a player who
  spends over 20 s there (a judge making a character) gets the trees as
  pictures for the page's life: the old way exactly, no picture wrong,
  the saving lost; `__btP256().undecided` reads 1. Nothing goes red:
  `mp-membudget` goes straight in. (The p256 twins wait the same way, but
  they are off by default: this is the wait's first default user.) Mend:
  start the clock when the renderer is made, or ask from
  `preloadWorldAnimations`. Card P's, its next PR.
- **PLAUSIBLE, medium-low: "4.2 MB less" is the measure's, more than the
  phone's.** As for #1736, every file is an `<img>` (no `decode()`), and
  the trees are not in `picsOnce`'s families: a tree never drawn held its
  file (the five PNGs: 0.31 MB), while `artCache` counted 5.6 MB. The
  numbers are a byte array held for the session (`TREE_TEX` and Pixi's
  cache; real memory, the `buffers` line). So at a fight where no tree was
  ever drawn the page may hold about 1.1 MB MORE, while the lines read 4.2
  less. The real saving is on the chip once trees are drawn (5.85 MB as
  RGBA -> 1.40 as `r8`; the PR's own `gpu` fell 2.5 to 2.9 MB, so trees
  had been drawn in its runs), the browser's decoded copies after a draw,
  and no PNG decoded on the page's thread at a tree's first upload. The
  memory law asks a 256-colour picture to be numbers, and the change is
  that. Settle with Safari's memory reading in the woods and at a fight,
  with `?treenumbers=0` and without. The body, the spec and P's status
  should say where the saving is.
- **Low:** `pixiApp.js` ~556 `__btGpuTex().cacheNotOnGpu` still counts a
  numbers source at w x h x 4, not through `cacheSourceBytes` (the
  `mp-gpuaudit` and `mp-farmwalk` prints overstate a tree four times; no
  line reads it). `docs/MEMORY-MAP.md` ~80 says numbers are "in the page
  while it is loaded from a file": the trees' stay for the session.

## Card H: #1741 (first read), #1747

#1741, `sweepPicsOnce` a slice a turn. Read clean, and run in a node
model of the sweep (a fake cache, clock and timers): entries deleted
mid-round are skipped, one added mid-round is met and let go of, two
restarts in a row leave one timer; Pixi's `Cache._cache` is one Map for
the page's life (`reset()` clears that same Map) and its iterator
survives `delete`, a re-`set` and `clear()`; a picture is checked and let
go of in one synchronous call; the chain always schedules its next turn
and ends only when `startPicsOnce` changes the renderer (which clears the
old timer first; `pixiApp.js` is the one importer); `releasable` is the
same AND of the same checks, reordered. `held-budget.mjs` matches keys
exactly (only `ui:` by prefix), so the sweep's holds are now judged
against the general 12 ms line, stricter than the 16 it had; no line
raised. `hold-names`, `held-sweep` (57) and `report` (93) green on the
rehearsed tree.

- **DISPROVED (kept: it will be found again): "the new walk lets go of
  pictures the old one never reached, and a CPU reader of one now reads a
  stand-in."** It does reach more: the old sweep began each second at the
  cache's first entry and skipped every entry after its 4 ms, so pictures
  loaded late (the HUD's bars, quest pins, a zone's footprints) were
  plausibly never examined in busy scenes on this box (which runs
  JavaScript at about an iPhone 14 Pro Max's speed). But nothing reads
  their pixels: of every CPU reader in `src/`, only `_tightPopupIcon`
  (`effectsRenderer.js` ~1627) is handed a `picsOnce` family picture
  (`/icons/ui/elem-*`), and it reads it in the load's `.then`, before
  anything can draw it; the others load their own `Image` or read other
  families. About 1 MB is at stake. To see what the old sweep missed, on
  `main`: `window.__btPicsOnceSweep()` after a minute of play.
- **VERIFIED, negligible: a rebuilt renderer goes on with the old
  round.** `startPicsOnce` does not reset `_walk`, so after a context loss
  in mid-round a restored picture already seen waits the rest of that
  round plus the 1 s rest: about 1 to 1.5 s longer, about 1 MB, right
  after a rebuild. Tidy: `_walk = null` in `startPicsOnce`.
- **Note:** `holdNames.js` ~65 and `server/src/report.js` ~115 keep the
  family's old name, as their rule says for a family off the list; the
  profiler would now name it `wrapped > sweepPicsOnceTurn`. The phone's
  report never named a timer by its function (`perfTracker.js` records
  `setTimeout(1000ms)`), so nothing is lost.

#1747 (PR 10, the card's last; `body-bake`, and sitting 1's finds on
#1668). Read, and the restart rule run in a simulation of both versions
of `bodyBake.js` (a fake clock and worker, the page hidden and shown):
workers alive plus slots spent unheard never pass `_started`, nor POOL;
two returns in a row do nothing the second time; a job queued at a return
starts a worker; a worker let go after it ran is started again each
return, as before; one whose constructor throws fails at once, as before;
no promise is left waiting (a kill answers its slot's jobs, an empty pool
answers "no worker", the watch's timer is cleared). `BT_BW_PARTS` is read
only by `mp-bodyworker.mjs` from Node's environment: no address sets it.
6c is a phone test (`world: 'wheel'`) and fails without the fix.
`held-budget.mjs`: only `body-bake` leaves (a page bake now meets the
general 12 ms line); no line raised. `held-sweep.test`'s judge is
unchanged; 7c4 now tests what it says (gc at 55 ms, past 1.5 times the
general line), sitting 6's note on it answered. Its `server/test/` change
deploys the worker with no server change: listed beside the others.

- **PLAUSIBLE, low-medium, not a hold: the mend covers less than sitting
  1's find.** `bodyBake.js` ~155 marks a slot heard on ANY message, the
  beat `_job` sends before its first step included (`bodyBakeWorker.js`
  ~90). So only a worker whose script never runs is "never heard"; one
  that loads but hangs inside every job (a `fetch` in `loadBitmap` with no
  timeout, a canvas step that never returns on some device) is still
  started again at each return, with about 20 s of plain looks each time
  (the simulation: 6 jobs held 20 s or more at each of 4 returns). No such
  device is known. Mend: heard only at a slot's first answer.
- **PLAUSIBLE, low: a worker that fails at once now spends its slot.**
  `_unheard` counts every way a slot dies (~98), `onerror` included, which
  fires at once (the worker's file missing after a deploy). Before, the
  next return tried again for free. Where the file is gone for good the
  page bakes either way; after a passing network fault, a one-slot device
  now bakes on the page (114 to 720 ms a sheet) for the sitting. Mend:
  count it unheard only when `why === 'stalled'`.
- **VERIFIED, low, in the spec's words:** with two slots and one job at a
  time, a device whose workers never run sees a second 20 s window after
  its first return (the second slot's first start): bounded, "at most one
  never-heard start a slot". 6c starts both slots at once and does not
  show it.
- **Nit:** 6c's last check, "the next sheets are the page's", tests only
  that `asked` did not move (it would pass with nothing baked); its break
  proof still holds through `restarts`. Two of H's Found lines left its
  status and are recorded nowhere else (below, in the status's Found).

## Card Y: #1739 (sitting 6 read it; its head moved after that rehearsal)

Its code is cb9e7982's, the commit sitting 6 reviewed (`_watchInset`, the
observer and the `resize` listener, both let go of in `destroy()`). Since:
`main` (f2351ab) merged in and its status. Rehearsed on its new head
(34d6f1a9), green. Sitting 6's two notes stand (a measure after each
synthetic `resize`; the observer watches the content box, not the notch's
padding): low, not holds.

## #1744: cards L and J2 (the orchestrator's; documents and a table)

Step 3 only. `docs/plan/cards/L.md` and `J2.md`, and J2's block in
`tools/dev/tag-blocks.json` (5420 to 5439, `nextBlock` 5440, appended
last). Its own tag, 5200, is the first of L's block, and L's PRs start at
5201: no collision (precheck's tag check green). The cards give owners to
sitting 6's three "no card" finds: `ps.capeOff` and the two red phone
tests (J2), the ledger guard reading the page and nothing running
`state-census --check` (L, PR 1). Card L had already begun (#1746, PR 1,
`state: working`, opened during this sitting): not on this list.

## Card L: #1746 (PR 1, the ledger's guard reads the code)

Step 3 (tools; it touches `server/`'s packages: its merge deploys the
worker, which bundles none of them). Its files are the card's:
`server/package.json` (`@babel/parser` 7.29.2 and `@babel/traverse`
7.29.0 as devDependencies, the root's exact versions) and its lock,
`state-census.mjs` (the loader, and `--json` gains `ledger` for the
columns' check), the ledger guard, `fourLines.mjs` and `four-lines.test`,
`src/state/README.md`; tag 5201, L's. Its "done when", tried by the
gatekeeper on a copy with only `server/`'s packages installed (this PR
with #1711, #1747 and the line below): the guard says "reading the code",
green at 22 of 22; a new top-of-file `let` in a `src/` file: FAIL 4 (23 of
22); a ledger row's `writers` changed by hand: FAIL 5 (the machine's
columns). The first needs the line at its count, which is this PR's.
#1748 (L's PR 2) was still opening: not on this list.

## The state ledger's line (the gatekeeper's, this PR)

`tools/guards/state-ledger.test.mjs` `UNLISTED_LINE` 2128 -> 22. On `main`
the guard counts 16, by the page and by `--live` alike (all `unsorted`,
the four files the map has not placed). On the whole list it counts 16 by
the page and 22 by the code: the list brings six top-of-file variables no
ledger lists, `src/debug/report.js` `_speed` and `_lastSentAt` (#1711,
system `debug`), `src/rendering/picsOnce.js` `_walk`, `_walkMap`, `_seen`
(#1741, `preload`) and `src/rendering/bodyBake.js` `_unheard` (#1747,
`art`). With #1746 on the list the guard reads the code on GitHub, so the
line is the code's count: at 16 the list would merge red (rehearsal 3, at
21 before #1747 joined: FAIL 4, 22 of 21). The six belong in
`src/state/debug.js`, `preload.js` and `art.js` (`state-census.mjs
--ledger <system> --write`); the next sitting lowers the line to what is
left. Not strict yet (rule 3: card L's card is open). The four lines
(`fourLines.mjs`): every file, function, cycle and the fourth number sit
at their lines on `main`; nothing to lower.

## The whole

Rehearsed four times from `main` b9f7218, each with
`tools/dev/gatekeeper.mjs`. 1: the eight ready at the start (tree
51de3178): precheck 0 FAIL, build, questline 187/187. 2: with #1745 and
this branch (258f4daa): the same, green. 3: with #1747 and #1746 (7ae42eac):
precheck FAIL, `guards/state-ledger` 22 of 21, the line set before #1747
joined; set to 22. 4: the list as written (tree 9a9d5dc9): precheck 0
FAIL with every server suite and guard, build, questline 187/187. The only
warnings were stacked branches carrying the tags of the PRs below them
(and P's and L's next branches carrying theirs): the merge order settles
them. Every listed PR's own `test` check was green on its head.

In this sitting's order: the cards first (#1744, which J2's block in the
tags file and L's PRs stand on); card P's four, stacked (#1719 the sounds,
#1736, #1743, #1745 the memory); card H's #1741 (the page); then the four
that deploy the worker, back to back: card A's #1708 and #1711 (the one
live flag, `roomrow`, and `caps.report` 2, stacked), card H's #1747 (a
test), card L's #1746 (the ledger's guard reads the code; it closes the
list's rows, so it comes after every PR that adds one); card Y's #1739;
this PR last (the line #1746 reads). No stored record's shape changes.
