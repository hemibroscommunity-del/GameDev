# The gatekeeper's review, sitting 51 (card Z; tag 6265)

Taken 2026-11-18 on `main` 7569a0c0 (sitting 50 fully merged; its deploy
green). The cards running came from the planning session
(session_01LccHaivkofvyigGL4fgBWZ); the heads from each card's own message
to this sitting (session_01LccHakf5J8KwtUDPncuTxD), checked against GitHub.
The list was kept open while PRs turned ready (17:53 to about 19:50 UTC).
Tags bare.

## What was open

| card | PR | tag | head | state on GitHub |
|---|---|---|---|---|
| SB | #2228 the ride measured | 6380 | 19b7fb25 | ready, every check green |
| WD3 | #2227 the words guard's mends | 6340 | 1cffc12a | ready, every check green; DEPLOYS (server/test) |
| HB2 | #2224 the quest coach after the paint | 6280 | 0d0faa25 | every check green; marked ready by the planning session (HB2 said ready at 16:49, in a long browser batch; its status file's `working` line is stale) |
| LR | #2226 the layout-reads guard | 6360 | ee639b1b | ready (a38f55b4, then 81121cd1, then ee639b1b this sitting: below) |
| WD3 | #2229 #2230 #2231 #2232 #2233 | 6341 to 6345 | ef44a135 6ceae277 74b08bf8 8b5499f2 aaaa48a9 | stacked on #2227, each base `main`; `test` green |
| WD3 | #2235 #2236 #2237 #2238 #2239 #2240 #2241 #2242 #2243 | 6346 to 6354 | a01bfe92 0943a1e5 1aaaafb6 30c7bc75 d652194f d2aa9aba e4292767 943f6141 af55a7e6 | stacked on #2233; WD3_CI |
| EN | #2234 five canvas pictures (§253) | 6203 | 57c8d0fb | ready, every check green (main merged in); its status file's `working` line is stale (EN would not push to keep the checks) |
| HB2 | #2244 (6281, the band) | | ae77a66e | draft: sitting 52 |

## Step 3: each against its card

- **SB #2228**: files the card's (mp-heldsweep's `ride` station and the
  asked-only `ridewalk`, held-budget `STATION_LINES.ride` = 12 with its
  why, `census/SB-ride.md`, card, status); no game file; done when met
  (the holds over the line on budget-android and hotel-laptop resolved to
  file:function, owners named, the walk compared). Mend sent (no hold):
  `RING_R = 2200` is a Wheel distance written into a test (CLAUDE.md §1:
  QA reads `H.wheelGeom()`); take it from the geometry.
- **WD3 #2227**: files the card's (say.js's header, say.test, desk-words
  5b, LoginScreen's comment, card, status); sitting 50's five mends each
  done with a break proof: §7 now cuts every say()/sayPieces() call into
  its arguments (a key not single-quoted or a ternary of them fails; `SAY
  as X` and several tables read), §6's dead "key in two files" gone and a
  key written twice in one table read from the source, a new §8 (each
  `{name}` a row asks for passed, no part unused), the stale U+2022
  comment, desk-words 5b reading the Pets row itself. `src/` changes are
  comments only. `server/test/desk-words` re-pointed as WD2's standing
  answer allows: **DEPLOYS**.
- **HB2 #2224**: files the card's (QuestCoach.jsx, mayorScreen.js,
  doorPrompt.js, a new afterPaint.js: the switch's one reader); tag 6280;
  under the existing `?afterpaint`, no new row.
- **WD3 #2229 to #2243**: each PR's files are its screens under
  `src/ui/**`, their `src/data/say/<screen>.js`, `player-words.test`'s
  line and the status file; no file of HB2's, EN's or RR's (HB2's later
  #2244 does clash: below). Tags 6341 to 6354 in order. Done when: the
  in-place line falls at each PR (on #2227's 4120: 3901 at #2230, 3677 at
  #2232, 3568 at #2233, 3201 at #2237, 2987 at #2240, 2800 at #2243): the
  card's 15 PRs.
- **EN #2234**: files the card's (entityRenderer.js, its leaf
  entity-look.js, the canvas census line 5 -> 0, the state ledgers' rows
  with the planning session's yes, M-tables re-made); tag 6203; done
  when: `canvas-pictures` 41 -> 36.
- **LR #2226**: files the card's (the guard, its two lib files, card,
  status); precheck needs no line (a tools/guards file runs by itself);
  about a second; break proofs in its body and replayed every run.

## Step 4: the review (`/repo-review`), #2224 (the one PR changing `src/` code)

No `server/src`, wire, storage or economy: angles A, B, C, D, E and G are
clean by inspection. F (removed behaviour) and the page's thread:

- The render's page reads (fixedBox, the computed `--sheet-h`/`--dash-h`/
  `--world-x`/`--play-w`, the keys strip, the combat band's reach, the
  card's height, the quest card's and the map button's rects) are now one
  `readCoachPage()`; each old use reads its field, the fallbacks kept
  (`|| 72`, the `err` path returning 0 as the old `catch` did). Under
  `?afterpaint=0` the render reads it in place, as before.
- The walk (`step > measure`, `live > canvasBox`) runs at the top of the
  game's next frame (`beforeDraw`, its 500 ms fallback when no frame
  comes); the gesture watchers still run every frame; a `walkAsked` flag
  keeps one walk waiting. The deferred `walk` closes over nothing of
  `step`'s (eslint `no-undef` clean on the branch's file).
- `canvasBox` hands back an old box and measures again at the frame's top;
  the very first box, or a replaced canvas, is still measured where asked.
  The window's size is kept with the box (`vw`, `vh`).
- `doneRef` no longer reads localStorage and the shared cookie on every
  render (`loadDone` never returns null, so the guard reads once).
- The re-read after every draw (`askPage`) draws again only when the
  reading changed (`samePage`, half a pixel), once a frame however many
  draws; the step right of the quest card lands a frame later, as the
  card's reading allows.
- One difference, harmless: under `?afterpaint` the coach's world lessons
  take the canvas `mayorScreen.js` finds (`canvas.brotown-canvas` first),
  where the old code took the page's first `<canvas>`.

**No finding.**

## Step 4: the review, EN #2234 (`src/rendering`)

Angles A to E and G clean by inspection (no wire, storage, economy). F and
the memory law:

- The masked frames, the worker's cropped frames and the fishing overlay
  are kept as images of themselves (keepAsImage.js, `quiet`: not sent to
  the chip again), each a canvas made fresh for it and only ever drawn
  after (no scratch canvas swapped from under a later draw), queued until
  2 s with no bake stored, then 4 every 250 ms (mp-copperwaist's stride:
  2 runs red of 4 with the PNGs in the burst, 0 after).
- A source let go of before its turn is passed over (keepAsImage refuses a
  destroyed source; the fishing overlay's is looked up in Pixi's Cache at
  its turn, gone when released). Releases still free an image-backed
  source (releaseCanvasSource: destroy, Cache entry, zero only a canvas).
- The armour probe's reference (only on a `lookprobe` page) is on the chip
  only (keepOnGpuOnly through the palette renderer); the probe reads it
  back through that renderer's `extract`, never its canvas.
- `__btMasked...` QA reader now draws an `<img>` source too.
- **Mend (EN's 6204, no hold)**: `_keepQueue` has no cap and keeps each
  closure until 2 s of quiet: under steady baking it only grows (CLAUDE.md
  §7, a cache has a cap). EN: capped, drained after a longest wait,
  destroyed sources dropped.

## Step 4: the words, WD3 #2229 to #2243 (angle F)

Six checkers, two or three PRs each, every removed string traced to its
row and the call that reads it; screens rendered with esbuild and
react-dom/server at the old and new branch, phone and computer, and
compared byte for byte where they could be (BroCard, InspectCard,
EquippedTab, AboutPanel, Settings, BandGrip, MorePanel, the inventory,
quest, records, store, bank, craft and hall screens); the rest read.

- **Clean on a phone, every screen**: identical text (non-ASCII by code
  point: dashes, middle dots, ellipses, stars, U+2212, soft hyphens, curly
  apostrophes), JSX spacing kept, plurals choosing as the old `=== 1` did
  with `n` passed, numbers formatted before they go in, no React element
  through `say()`, other players' names, login keys and quest titles only
  ever parts (never deskWorded), no handler, condition, `data-*`, refusal
  code (the account's ERROR_COPY codes unchanged) or amount sent to the
  worker changed, no "Wheel" or "remnants" new.
- Guards on each stretch's top: `say.test` (on #2243: 81 tables, 2400
  rows, 2464 calls, every key present, every `{name}` passed) and
  `player-words.test` green; `device-words` and `manual-combat` green.
- **On a computer, "tap" now reads "click"** where a row was not run
  through `deskWords()` before (the card's reading allows it):
  `dailyRewards.swapHow` (#2229); InspectCard's foot hint (#2231);
  `socialPanel.noFriends`, `inspectPlayer.friendsTitle` (#2233);
  `nmlAsk.info`, `nmlAsk.infoBack` (aria labels), `nmlBadge.pastSafe`
  (#2235); `inventoryPanel.noPets` (#2238); the controls tour's
  `attackBody`, `targetBody`, `shieldBody`, `bagBody`, `toolbarBody`
  (#2242).
- **An edge, not a regression**: where an old line joined a value that can
  be missing, a player read "undefined"; `say()` fills a missing part with
  '' (`socialPanel.online` "Online · " when the zone is unknown; three
  screen-reader labels; NmlAskCard's `ask.name`, the Guild Hall invite's
  tag and name).
- Module-load reads (`PANELS`, `TILES`, `STAT_LABEL`, the COMBAT labels)
  are words with no "tap": deskWords returns before asking the device.

## HB2's next PR meets WD3's stack

HB2's #2244 (6281, a draft, not on this list) changes `sheet/BroCard.jsx`,
`dash/InventoryPanel.jsx` and `dash/QuestJournalPage.jsx`, which WD3's
#2231, #2238 and #2239 change too. The planning session: WD3's stack
lands first; HB2 merges `main` into #2244 and resolves, and clears any
`src/ui` file outside its card first; WD3 checks the `plan-hb2-*`
branches before each new screen.

## The guard meets the coach (#2224 with #2226)

As first pushed (a38f55b4), #2226 merged with #2224 failed its own check
1: #2224 moves the coach's reads into new functions (`readCoachPage`,
`deskStepRight`, `_measureBox`: about 20 reads "new"). The planning
session decided: the guard counts a read at the top of the game's frame
(a function handed to framePacer `beforeDraw`, a function of its file one
calls by name, and what is inside them) as an approved way, and HB2 adds
no rows. LR's 81121cd1 does it: main alone 365 / 365; main + #2224 +
#2226: 337 listed, 16 at the frame's top, green; its break proof red when
`readCoachPage` is taken out of the callback. Left for LR's PR 2 (after
#2224 lands): `--write` (the 6 QuestCoach rows that fell, the line 365 ->
337), and printing each frame-top function its file also calls elsewhere
(`readCoachPage`'s first draw and `=0` path run in the render): LR chose
to report it every run rather than fail it.

## Step 5b: what GitHub will merge

Every PR's base is `main`. From `main` 7569a0c0, merging each with a merge
commit in the list's order (SB, WD3's 16, EN, HB2, LR), every branch had
ONE merge base with the `main` above it, and none conflicted (the tree
b3441060). The WD3 stack never merged `main` in; EN's merged `main`
7569a0c0 (one base still).

## Step 5: the rehearsal

REHEARSAL

## The deploys

Only #2227 changes `server/**` (`server/test/desk-words`): one deploy, of
the same worker code (the merged tree's only `server/` file).

## The old drafts

#1870, #1869, #1867, #1415 and #1211, listed at sitting 50 for the owner,
are closed on GitHub (closed 2026-11-18 about 17:00 UTC): nothing to list.
