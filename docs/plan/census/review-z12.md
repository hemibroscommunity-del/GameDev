# The gatekeeper's review, sitting 12 (card Z; tag 5369)

Taken 2026-11-14 on `main` at 9fd5e580 (tree 2836f0c7, sitting 11's
sixteen merged). Tags in this file are written bare. Each PR that changes
`server/` or `src/` had a finder read the code around its diff (the angles
of `/repo-review` that apply) and try to disprove what it found; the
gatekeeper read the code itself for every candidate that decides a hold.
Documents and tools got step 3.

VERIFIED: the story runs, on the code path named (a finder's probe in a
throwaway copy, or a reading). PLAUSIBLE: the code does it, what sets it
off is unproven (it says what would settle it). The probes are not in the
repository.

DRAFT: filled in as the sitting goes.

## Card LB: #1798 (PR 3, tag 5502), read at 89092ea: clean (lows)

Overall (ranked by Power), the "Power?" hint, the Stats group (card PW's
eight boards), `power` and `statboards` each on its own `CAP_GATES` line,
their allowlist rows gone from `caps-audit.test` (it DEPLOYS: a test
only, the same worker). Deploy order, probed with the branch's own
`boardList`: caps `{}` show no Overall and no Stats; `statboards` 3 shows
three, 9 the eight it knows, 0 none (each gate by the cap's value, TRAPS
§9); a main phone reads neither cap. `caps-audit` still fails an unread
cap without the allowlist rows (a break tried). The hint's words are true
(`power.js`: 3000 + 400 x log10(odds)); the worker's stat order is the
phone's; the icons are the Bro tab's own files; the "?" is 44 px with
`touch-action: manipulation`.

- VERIFIED by reading, low: the hint stays open after the swap
  (LeaderboardPanel.jsx ~566 against ~504: the "?" shows on the Power view
  only, the line whenever `hint` is set): swap back to close it.
- Low: no test runs the board list without the caps now (mp-boardslook 1b
  wants `power >= 1`, `statboards === 8`); Overall, opened first, reads
  "Nobody has trained this yet." until a board report carries the index
  (up to the 10-minute heartbeat); stale comments (~547 "1 today", ~93).
- PLAUSIBLE, low, for later: the count gate breaks when a ninth stat is
  added before `dmg` (`statboards.js` puts the shared stats first): a new
  phone on an old worker would ask for a board the worker has not got.
  Add new stats after `dmg` on both sides, or gate by ids.
- For the owner (not a hold): on Overall a style with no weapon in that
  hand prints "0"; the Stats group's "Speed" is moving speed where the Bro
  tab's weapon "Speed" is attack speed (`prog3.js` names "Haste" as the
  fallback).
- Suites: caps-audit, statboards, wire-audit, mirror-audit, power. CI
  green at 89092ea.

## Card O: #1794 (tag 5224) and #1800 (tag 5225): the next batch

Not on today's list (the planning session, 18:00: O's three and T's two
go to the next batch, after today's list lands and #1792 merges the new
`main`). Read at e3ae788, then again at the heads that moved during the
sitting (#1792 723dc0b, #1794 70dc592, #1800 6d46f97: `main` merged and
the `ladder` row on `DOOR_SUITES`; O's own files unchanged but
`switches.mjs`). Probes: the suite's own model.

- **Sitting 11's hold on #1794, VERIFIED mended across sittings.** A rung
  kept by an older build loads as the lane's row (its live set,
  `v[2] !== liveKey()`); a kept `[0,6]`, `[3,0]` or `[3,6]` is back at 60
  in one try, 21 s (§19c, green on both heads).
- **#1800, VERIFIED (probe, and read by the gatekeeper), medium: a pixel
  rung holds a cooled phone at 30 until the next veil.** On today's ladder
  the live chip rungs are the rate (1), then the pixels (5, 6); the
  pixels' try up waits for a veil, and while it waits the other axis may
  try only if it has a rung (framePacer.js ~571: `r.work` is 0, so it
  returns): the rate cannot come back first. A 60 phone that cannot keep
  30 takes the rate at ~75 s, the pixels at the 6-minute veil, is cool
  from minute 9, and stays at 30 with 0.75 of its pixels until the next
  veil, in the Wheel perhaps the rest of the sitting. Sitting 11's
  "pending stops every other" in a new shape.
- **#1800, VERIFIED (probe), medium: a pixel step wanted before the tab
  is hidden is taken on its return, however long it was away** (only a
  verdict drops a pending step, ~543/~560; none while hidden; a return is
  a veil). Mend: drop a pending step when the tab hides.
- **#1800, VERIFIED (probe), medium: a phone whose own work is the cost
  still reaches the pixel rungs** (`if (!down(first)) down(other)`: the
  crowd's rungs are not live until O's PR 6, so a work-bound phone falls
  to the chip axis after the rate). The spec and `renderRes.js`'s header
  say the owner's iPhone never goes there; today it can.
- #1800, VERIFIED (probe), low-medium: `?ladderrate=0` and `?ladderpix=0`
  leave their rungs live for the governor: with `?ladderrate=0` a slow 60
  computer is never paced but its picture softens at the next veil (the
  off-ramp of #1794's decision trades a steady 30 for a softer picture);
  with `?ladderpix=0` the governor takes a pixel rung nothing reads, and
  its try up then holds the rate (sitting 11's class).
- #1800, low: the pixels' listener dispatches `resize` in the frame
  (renderRes.js `onKnob`): BroTown's `resize()` reads `clientWidth` and
  `getComputedStyle`; at a tab's return that is one frame in play (§7).
- On screen, not under #1800's "Decided for the owner while away" (it has
  no such heading): answer (b) softens a computer too (a slow laptop:
  0.75, then 0.5 of its pixels at its loading screens); answer (A) departs
  from the card's "the next sitting starts there". `ladder: false` (tag
  5235) is not yet built: until it is, nobody can turn the governor off
  for every player without a deploy.
- Clean: both new `?name=` rows; `?pixbudget`, `?res=`, the Speed test's
  `res2` as described; the crowd's shared picture frees itself on a
  resolution change; `mp-governor` reads its slow CPU before putting it
  back. Suites: frame-pacer 113 (e3ae788, 6d46f97), 112 (70dc592);
  render-res 40; switches (359 rows), draw-lanes, phase-table green at
  6d46f97.

## Card T: rebuilt without card O's #1792, to the next batch

#1797 (tag 5303) and #1804 (tag 5304) carried card O's #1792 (0e3f823,
merged in by mistake for sitting 11: #1797's red `test`). Card T rebuilt
both on `main` 9fd5e580 without it: `claude/plan-t-3-page-draw-rebuilt`
(a440c9b) and `claude/plan-t-4-thrown-rebuilt` (922b388, carrying the
first), new PRs replacing #1797 and #1804. Step 3: the files are the
card's (the switch table and its page, card B's map reading it, SHAPES'
two lines, the spec, the thrown run's guard and preload, T's status); no
`server/` or `src/` file; one merge base each, clean against `main`.

**Not on today's list.** After today's two rows (#1809 `tradedoor`, #1805
`?packworker`), both conflict at `tools/guards/lib/switches.mjs`'s end and
`docs/SWITCHES.md` (tried in a scratch copy). Card T merges the new `main`
after today's list lands; from PR 4 a row's place is set by its name,
which ends these collisions. PR 3 takes the unlisted line from 113 to 0,
so the gatekeeper does not lower it today (112 on `main`: a change there
would collide with T). For the owner: the thrown run adds about 16 s to
every PR's `test` (paid minutes); the full run (about 45 minutes) is the
owner's to ask for.

## Card P: #1805 (tag 5253), #1806 (5254), #1810 (5255): listed

Read at 3d0594d, 3c35e04, 1077b22 (a stack: #1810 carries #1806 carries
#1805; each one merge base with `main`, clean on it). None touches
`server/`: no deploy.

**#1805, pack-page on the body bake's worker (`?packworker=0` the page's
road).** The end form is the page road's: a PNG image freed through its
blob address when the source goes; the worker road holds no page canvas.
A re-ask, a dropped job, a dead or failing worker each fall back to the
page road; behind the loading screen it still packs on the page; the
`pack-page` row's removal agrees with `held-sweep.test` 7b4; the QA probe
`__btGearWorkerWait` is defined. No removed behaviour found.

- **For the owner, through the planning session (medium, VERIFIED by
  reading; not a hold): the planning session's condition "never drawn
  bare while it waits" is not met, and was not before.** A gear piece
  first drawn in play is not drawn while its sheet waits (`getGearFrame`
  gives nothing for a sheet still loading): 5 to 37 s on this box by the
  worker, 2 to 36 s by the page (`?packworker=0`), so the two roads'
  spreads overlap and main's way is the same. Commit 3d0594d writes it as
  a backlog row (road A) "for the owner's list"; it is on no list yet.
- Low (memory accounting VERIFIED; what stays held PLAUSIBLE): the worker
  road's `Texture.from(img)` (gearSheets.js ~738) keeps Pixi's cache
  entry, and `img.decode()` (bodyBake.js ~281) decodes on the page, where
  the page road's `keepAsImage` drops both: each sheet first drawn in play
  counts W x H x 4 in `artCache`, the form drawn shirts have had since
  5014. To settle: `mp-membudget` at the armour station, default against
  `?packworker=0`.
- PLAUSIBLE, low: gear sheets now wait in the body bake's one line
  (`_line`) behind a peer's body, head and shirt bakes (their own page
  line before); the "gear first" try measured an empty line only.
- VERIFIED by reading, low: the worker's download (`bodyBakeWorker.js`
  `loadBitmap`, ~52-63) has no time limit (TRAPS §123): a fetch that never
  answers stalls a worker, and a two-core phone has one.
- PLAUSIBLE, low: the worker answer's handler (`_buildShirtOnWorker`
  ~723-758) has no catch: a throw leaves the sheet `loading` for the visit
  (drawn shirts had this before).
- Low: the byte-for-byte claim is a one-off probe (no scenario reads
  `__btGearWorkerWait`); `?packworker=0` gives the old pixels and cells,
  not the old timing (the first slice's clock starts at `tJob`, ~364,
  ~774); `?gearpackgentle=0` now turns the worker road off too, which its
  row does not say.

**#1806, the CPU-pixel-readers guard.** Its four break proofs each fail
as claimed (tried by hand). Gaps, low: an alias (`const ts = t.source;
ts.resource`, or `const { resource } = t.source`) passes check 1
(`lookPaletteProbe.js` reads so, off the list: a probe reading no
pixel); the guard is by file, so a fourth CPU read in
`effectsRenderer.js` passes; `wantedPath`'s lines are read with their
comments, and checks 3a, 3b and `framePx` match exact shapes (a correct
refactor fails loudly).

**#1810, documents.** Every name in its text exists in the code. It
leaves one call open for the planning session: with `gear-sheet` and
`portrait` off the list, a 22 ms hold with a second page open is past the
noise line of 18 ms.

Suites on #1810's head merged with `main`: pixel-readers, state-ledger,
hold-names, switches, tests-by-system, rails; armorgrade, canvas-witness,
fish-forearm, held-sweep, iron-waist, keep-as-image, look-load, mine-hem,
mine-look, picture-door, strip-door, strip-slices, townsfolk-walk,
traps-look-tables: green. CI green at each head.
