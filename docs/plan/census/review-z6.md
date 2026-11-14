# The gatekeeper's review, sitting 6 (card Z; v2.3.5362)

Taken 2026-11-14 on `main` at f2351ab (sitting 5's sixteen all merged).
What sittings 4 and 5 reviewed in full (`review-z4.md`, `review-z5.md`) was
not reviewed again: this sitting read the MENDS made since, and the PRs new
since, that change `server/` or `src/`. A finder and its own disproof pass a
target, each reading the code around the diff: card A's mends (#1708
133b50114, #1711 a83a7a4c0), card P's (#1718 dc1c96d64, c00581573), card H's
#1733 and card Y's #1739 (both first read this sitting), card U's nine
(first read: their tools, guard and ledgers). Card N's mend (one wire row
and its counts), card V's four (guards only) and the order of the whole
were read by the gatekeeper.

VERIFIED: the story runs, on the code path named (most reproduced with a
probe in a scratch copy). PLAUSIBLE: the code does it, what sets it off is
unproven (it says what would settle it). DISPROVED lines are kept where the
code is confusing enough to be found again. The probes are not in the
repository.

## Card A: #1708 HELD, #1711 with it (stacked)

Sitting 5's three are MENDED (probed on #1711's head and on 205d62945,
before the mend): 10 unjoined open/closes 3 s apart, 0 book puts (10
before); a joined player out, 1 put, then 30 unjoined open/closes, 0 more;
a kick then the runtime's close, 1 put; `bookNow`'s `run` checks
`b.putting` again before each put and has its own catch (roomrow 10.5).
The hand refills from the clock when read (`_roomRowHand`), no timer
(handoff rule 12); the door's paced put never waits on it; a storm of
joins and leaves writes at most HAND + 12 an hour (rule 27). Suites green
on #1711's head: roomrow, cost-guard, report, daybook, liveops, devtools,
wire-audit, session-door, caps-audit, test-mode, storage-marks.

- **#1708, VERIFIED (a probe before and after), low-medium: the mend
  loses the "saves refused" count in the case it is for.** `roomrow.js`
  `_roomRowJoin` (~229) is the only setter of `owed`, and
  `_roomRowRefused` (~210) sets none. A character a newer worker saved is
  refused AT the join (`persistence.js` ~77, before any state_sync), so
  after a rollback the owner's join is refused, the socket closes, the
  last one out finds nothing owed, and the count stays in memory until the
  room is put away or the worker is deployed again (rule 11): the book
  never holds it. Before the mend: 1 put with `room['1'].refused [0,1]`
  stored; after: 0 puts. Card A's line 5 names "saves refused" into the
  book's `room` part, and card E's PR 9 reads that one counter. The
  header's own reason ("a join is what makes anything new") is untrue for
  this one; roomrow.test §3 sums memory and the book together, so it
  passes either way, and its comment ("its counts went into the book with
  it") is now false. A wake with no join loses `restarts` the same way
  (low). Mend: `m.owed = true` in `_roomRowRefused` (the hand still paces
  it; no client can cause either refusal at will), and §3 reading the
  stored book alone.
- **#1708, VERIFIED (a probe), low, not a hold: a burst of short sittings
  loses its last tail.** The wake's first put spends a turn: four sittings
  of ~70 s, one Speed row each, wrote sittings 1 and 2 and left 3 and 4
  owed (hand 0.45, 0.68). If the room is put away before anyone comes
  back, up to ~5 minutes of counts and the last report are lost: the
  book's accepted loss at a restart, and the header names the trade.
  Option: the wake's first put not charged to the hand, or HAND 4.
- **#1708, PLAUSIBLE, negligible.** `running ? 2 : 1` counts a running
  put's turn as still to come, though the wrapper spends it at `st.put`;
  for the rest of that put a last one out with 1 to 2 turns gives up (the
  report already rides the running put). The hand is full again after each
  eviction: about 3 puts a wake, each needing a join. Settle: workerd's
  idle eviction time.
- **#1711's row, clean.** `http:/api/admin/dev/daybook` matches
  `devtools.js` ~745 under the `/api/admin` mount; with card N's guard
  merged, `wire-table` is green (438 rows), and without the row it fails
  (an orphan route). Its columns match `bookRead` (7 days by default,
  1 to 60, reads only). No new storage key, cap, flag or sent type in the
  mend; `owed` and `hand` in memory only; `daybook.js` untouched (`V` 1:
  no shape).

## Card P: #1718 listed; #1719, #1736 HELD (conflict)

Sitting 5's three are MENDED, each reproduced in a scratch copy:
(a) `finish.mjs world-interiors newhall.webp` then the guard: green (a
lossless WebP read by its colour index, 255 colours); (b) `shipped.json`
has no totals, one row a line in path order: two PRs adding files in
different places, each with `--write`, merge with no conflict and the
guard is green after; (c) a finished sprite PNG with its row and a bot's
lossless twin with none: green (195 twins read as their PNGs' rows); the
bot rewriting or dropping a twin on `main`: green. Unmatched paths
(`player/chop-east.png`, `gear/helmet/**`) are still red until their
family is added, by design. The guard on the branch: 11 ok, ~2 s.

- **#1718, VERIFIED, low-medium, not a hold: rows next to each other
  still conflict.** Two PRs adding files into the same gap of one folder
  (`interiors/newhall.webp`, `newmill.webp`), or changing neighbouring
  rows, conflict in `shipped.json`, as any one-row-a-line list does. The
  mend is mechanical (merge `main`, `--write`), but the spec's and
  `shipped.mjs`'s "two PRs that change different files merge with one
  press" holds only when their rows do not touch.
- **#1718, VERIFIED, low: the bot's twins are held by nothing.** A twin
  replaced by an unrelated lossy picture: the guard green (its header's
  own break proof says so). The game loads the `.webp` before the `.png`
  (`loadWebpOrPng`), so the 195 files players see have no gate GitHub
  runs (precheck's `sprite-webp` is local only). Cheap: each twin a VP8L
  file with its PNG's width and height, read from its header.
- **#1718, VERIFIED, low (a crafted file).** `webpColours` returns the
  first `VP8L` chunk and skips a lossy `VP8 ` chunk before it: a file of a
  lossy picture then a 256-colour VP8L chunk reads as 255 colours (PIL
  decodes 178,298). `finish.mjs` never writes one. Mend: null at the first
  `VP8 ` or `ANMF`.
- **#1718, VERIFIED, low: hold 8 can turn `main` red after two green PRs.**
  One renames a family in `families.mjs` with `--write`, another adds a
  file of that family with `--write`: each green, no conflict, `main`
  FAIL 8. Until mended: a PR that changes `families.mjs` is listed alone.
- Unchanged from sitting 5: 25 supplied families with a bar have no size
  check (hold 6 checks only a `frame` or `cells` rule).
- **#1719 and #1736** were begun from #1718 before its mend: on the
  mended #1718 both CONFLICT in `tools/assets/shipped.json` (and
  `docs/plan/status/P.md`). #1736 (`npcSprites.js`, the portraits let go
  of once loaded, `artCache` 112 -> 109.1) was read, not reviewed: next
  sitting's, once made again on #1718.

## Card H: #1733 (first read)

Nothing of weight. On today's `main`: `held-sweep` 57/57, `gear-tab`
51/51, `gear-reset`, `hold-names`, `ascii-only` green; `main` has not
touched its five files since its base. The old `cellEl` body and the new
`GearCellView` differ in two lines (the signature, `key` moved to the
element): every `data-*`, `role`, `aria-pressed`, `title`, the
`onPointerUp` with `stopPropagation` then `gearTabBus.tapCell`,
`touch-action: manipulation`, the sockets, rings and empty tiles are the
same; `cellEl` had one caller. `GearCellView` is not a `memo`, so it can
show no stale value; its five scope values are props; no hook, effect or
transition added. `barNumber` against `main`'s on 300,162 inputs
(negatives, -0, NaN, null, strings, 1e21, Infinity...): 0 differences;
'en-US' before and after; imported at page load, so the warm-up runs
before play. No line raised: `ui:*` off the list means the 12 ms general
line.

- **VERIFIED, low.** `server/test/held-sweep.test.mjs` 7c4 no longer tests
  what its label says: its one 15 ms `ui:GearTab` hold passes as noise
  (15/12 under `NOISE_K` 1.5), and `KNOWN['ui:*']`'s fallback
  (`held-budget.mjs` ~138, ~171) is dead. Relabel, or use a listed family.
- **PLAUSIBLE, low.** The sample does not show the split helped: 13.4 ->
  9.9 ms the longest, `GearTab` still 9.9 ms in one piece at `lands`; the
  drop is most likely the formatter's one-time start moved to load. A
  later full `mp-heldsweep` may fail `ui:GearTab` on two holds over 12 ms.
  Settle: the full tour (the card offers it), or the sample by component.
- Note: `apChip.js` ~40 (`toLocaleString('en-US')` when AP rises) still
  swaps the formatter's cache with the gear tab's `coins.toLocaleString()`
  (~0.2 ms, rare).

## Card Y: #1739 (first read; beyond the card's one PR, the owner's yes)

Nothing of weight. The game change is `minimapRenderer.js` (+35):
`_measureTopInset` keeps its inset until a ResizeObserver on
`.bt-zone-header` or a window `resize` marks it stale (they measure
nothing); the next frame then makes two `getBoundingClientRect` reads, as
it already did when the canvas's height changed (`mayorScreen.js` ~28 does
the same). `destroy()` disconnects both (~1163), and the renderer's
rebuild calls it; a new inset only moves `root.y` (no structural
rebuild); no loop (the bar's height is CSS, the minimap is in the
canvas). Upright, sideways, the one band, `?oneband=0`, a computer's
resize and zoom: covered. `main` has not touched the file since its base.

- **VERIFIED, low (a note).** The game fires a synthetic `resize` on every
  dashboard change (`dashboardPanelBus.js` ~45, `dashMinBus.js`,
  `dashSidePref.js`, `renderRes.js`, `BroTown.jsx` ~1752): a few to a
  dozen a minute, each a measure right after the panel's DOM changed, so a
  forced layout inside that frame (CLAUDE.md §7). Once an event, not every
  frame. If `mp-heldsweep` names it: measure inside the observer's
  callback.
- **PLAUSIBLE, low, not a regression.** The observer watches the
  header's content box, which does not change with the notch inset
  (border-box, the inset in the padding: `game.css` ~2093-2121): a notch
  inset arriving late with no window resize fires nothing.
  `mp-topaudit`'s fake inset cannot tell (it also fires a resize).
  Settle: `observe(hdr, { box: 'border-box' })`, or a real iPhone home
  screen app.

## Card U: #1721 to #1734 (first read)

(see below)

## Cards N, V (read by the gatekeeper)

- N, #1697: `report`'s row (`in.js`, 140 rows, the README's counts,
  `shapes-once`'s carriers for `devClass` and `drawLane`) is the one
  sitting 5 asked for. #1711's daybook row is #1711's (held with it):
  either order is safe, the route does not exist on `main` without #1711.
  Once #1697 is on `main`, a new router case, sent type, relay or route
  with no row fails `npm test` (card N's Found).
- V, #1731, #1735, #1737, #1740: new guards under `tools/guards/` (and
  `lib/`), "Held by" lines only in `docs/TRAPS.md`, tags 5323 to 5326,
  the card's. Green on the whole.

## The whole

Rehearsed twice from `main` f2351ab: all nineteen ready branches (tree
6f9fadb4: precheck, build, questline 187/187), then the list without card
A's two (below, in the status file).
