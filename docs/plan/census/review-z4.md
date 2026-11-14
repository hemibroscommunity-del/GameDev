# The gatekeeper's review, sitting 4 (card Z; v2.3.5360)

Taken 2026-11-14 on `main` at 5eb94ec. `/repo-review` in full (seven angles,
then a skeptic a family) on the ready PRs that change `server/` or `src/`:
card N's #1684 and #1695, card H's #1700, #1709 and #1712, card G's #1701;
and, three finders and a skeptic, card A's #1706 (with its mend, 1a67e8235),
#1708 and #1711. Every PR here is HELD at sitting 4 (`docs/plan/status/Z.md`):
the hold's own reason is a failing guard; these are what to mend with it.

VERIFIED: the story runs, on the code path named. PLAUSIBLE: the code does
it, what sets it off is unproven (it says what would settle it). DISPROVED
lines are kept where the code is confusing enough to be found again.
The probes the reviewers ran are not in the repository.

## Card N

- **#1695, VERIFIED, low.** Rows that keep a judge and leave out test mode's
  skip, though the README puts "the holes in a note" (as `join` and `move`'s
  `x, y` do): `monster_damage` (`in.js` ~143: `combat.js` 1304-1340 skips
  `slot`, `special`, `orbs` and the lanes in test mode); `node_strike` (~278:
  `accuracy` is `ctx.accuracy` in test mode, `botfp.js` 357, and
  `_ratedHarvestAccuracy` says `perfect`, `gathering.js` 593); `move`'s
  `dodging: 'bounded:_rollOn'` (skipped, `movement.js` 297). DISPROVED:
  `cook_request`, `quest_accept`, `quest_turn_in` (no bounded field; a nit:
  `cook_request`'s reqId note says nothing of test mode).
- **#1684, low, not a regression.** The walker leaves out all of `vendor/`
  by name (as the card says) and reads only `.js`: nothing pins what
  `vendor/` holds, and a `.mjs` the worker imports would be read by no door.
- **#1695, latent.** Only the quoting of `'type'` keeps the out rows' 164
  names from `wire-audit`'s "emitted" set; a double-quoted note quoting
  `type: '<event>'` would pass §3 vacuously. No false pass today.
- For card K (not a fault): five rows are `mayStart: helper`, `doesWhat`
  value-out, `reqId: none` (`shop_buy`, `farm_buy`, `store_offer`,
  `/api/market/place`, `/api/store/list`): a helper's retry pays twice.

## Card H

- **#1709, VERIFIED (rare).** `picsNumbers.js` `_onPlannedRow` takes a
  waiting plan when the row's COUNT matches (`r.n === plan.n0`), never its
  colours; the page's own path (`_stripByImage` ... `stripAsNumbers`,
  `rowFor`) adds colours without bumping `_rowsEpoch`. After one failed
  read in play (the 20 s `READ_MS` after an app switch, the worker's
  `onerror`), a strip numbered the page's way between a plan's answer and
  its taking can leave a later plan's count equal and its places wrong: a
  rock golem's or a rotcap's pose drawn in scrambled colours until the land
  is left (certain there once it happens; water frog 66 pairs of 210).
  No test sets `__btStripRowCheck`. Mend: bump the epoch when the page adds
  colours to a row, or compare the row's colours with the plan's.
- **#1700, the mechanism VERIFIED, its trigger PLAUSIBLE.** The worker reads
  a job's sheets one after another (`urlInputs`: each `await` before the
  next fetch), each cut at 4 s, under the page's 6 s stuck watch, which the
  `urlFail` retry does not reset; a stuck kill answers no `urlFail`, so the
  address is never refused and a fresh worker is sent it again. Needs
  Safari to HANG (not refuse) on a worker's fetch of a `blob:` address.
  Settle it: on the iPhone, beside an armoured player for a minute, read
  `__btBakeWorker().restarts` and `.byUrl.refused`. Mend: start every read
  before the first await, and refuse an address on a stuck kill.
- **#1700, VERIFIED, bounded.** The worker's kept sheets (at most 4, 4 MB
  at rest, 0.9 MB measured) are never forgotten when the page frees a sheet
  and revokes its address (no forget message, no idle trim): "a cache has a
  cap" is met, "freed where you leave it" (CLAUDE.md §7) is not.
- **#1700, PLAUSIBLE, very unlikely.** `_frameInput` sends any image's
  `currentSrc`, not only `blob:`; a raw https gear sheet (packing declined)
  re-fetched after a deploy changed it would be cut with the old frames.
  DISPROVED as harmful: the refused set's 1024 cap.
- **#1712, VERIFIED, small.** `_slicedLine` queues mono sounds behind stereo
  folds (the channel check runs at the job's turn): a cold sound ~50 ms late
  in play. DISPROVED as live: a second decode in the window `_tagLoads` is
  deleted before the fold (the shared files' keys load together, pinned).

## Card G

- **#1701, how VERIFIED, the cost PLAUSIBLE, low.** Under the budget the
  ratio follows the canvas's CSS size exactly (no rounding), and `resize()`
  is not throttled: a window drag sets a new `renderer.resolution` about
  each frame, and every auto-resolution Text is drawn again. Only on screens
  the budget limits, only while dragging. Settle it: a trace of a 2560 x 1440
  window dragged. DISPROVED as a defect: `?zoom=1` lowers a big phone's
  ratio (the card asks the reference to follow `?zoom`).

## Card A

Sitting 3's four faults, at the head of #1711: mended where the page is
told it was hidden (`visibilitychange`), in the tab whose switch is pressed,
and for previews; the gaps are below. The mend's lines carry tag 5127 inside
PR 4 (5123): unused elsewhere, but #1706 now carries two tags.

- **#1708, VERIFIED, medium.** The room row's first flush (60 s after the
  room wakes) takes `daybook.js`'s "first add writes at once" put, so every
  report after it waits up to a pace (5 min) in memory; the last leave
  (`leave.js` 266-272) flushes nothing and there are no alarms. Each sitting
  loses its last report and the room's last counts; a sitting under ~6
  minutes loses its FIRST report, the one carrying `died` (simulated: put at
  60.0 s and 360.0 s, the report at 362.3 s lost; with `roomrow: false` it is
  stored at 61.8 s). The headers accept losing the tail to a restart or a
  deploy, not to every emptied room.
- **#1706, VERIFIED, medium-low.** The day's `dev` part holds ~10 full cells
  (the door reckons ~4 times the stored size) and a cell's build is its live
  build (SHAPES part 4): two devices over ~6 builds (18 to 31 merges a day)
  fill it, and the day's NEWEST builds go to `over` (written, and printed:
  the refusal is by design, the size is the gap). A forging program fills it
  with `devClass` alone. `gamedev-aix.pages.dev` counts as `preview`.
- **#1711, VERIFIED, low.** The Speed card has no cap and no kill switch of
  its own: an A4 or A5 worker advertises `caps.report` and drops `speed`,
  and the phone clears its card on the send (`report.js` 429) while telling
  the player it "goes to the game". CLAUDE.md §5; TRAPS §9: grow the cap
  (`report: 2`) and gate the card on it.
- **#1706, VERIFIED, low (on the iPhone).** Only `visibilitychange` marks a
  return (no `pageshow`, no late-poll check); iOS may thaw a page with no
  event (`docs/specs/return-to-game.md` §2), so the first frame after it is
  binned as a freeze (bin 9) and `seen` counts the frozen spell.
- **#1706, VERIFIED, negligible.** A second tab's `_poll` returns at
  `!reportOn()` keeping its bins, and sends the off stretch when the switch
  is back on. `died` is taken on any report (the comments say once a join).
- PLAUSIBLE: a hidden computer tab's `server-message` holds fill the worst
  five (settle: hide a `wide: true` tab five minutes, read
  `__btReport().open.holds`). DISPROVED: bounding `seen` by the socket's age
  (one open report spans reconnects by design, `SECS_MAX`).
- Clean: no free text reaches the book (closed lists, whole numbers,
  `Object.create(null)`); an unjoined socket's report is dropped; the pace is
  per socket and nothing is sent back; `GET /dev/daybook` is behind the
  admin check and writes nothing; cost-guard 15a proves the row off at 0.

## Found on the way, no card's PR

- `quests.js` 262: test mode's `_questBarred` returns before the `retired`
  check, so a test-mode character can take a retired quest; `testmode.js`'s
  header says "a quest nobody can give is still refused".
- `docs/WIRE-PROTOCOL.md`'s phone-to-worker table has no `report` row.
