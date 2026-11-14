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

## Opened during the sitting: #1823 (R, tag 5283) and #1824 (L, tag 5211): HELD (conflicts)

Both opened at 18:43 and 18:44, against `main` 82fb78d, `test` running
when read; both change worker code that moves value (a door), so both
want a full review: the next sitting's, once each merges the new `main`.

- **#1823 (card R PR 4, the skill points' door)**: add/add conflict with
  #1819 at `docs/plan/status/R.md` (each R branch begun from `main` adds
  the file). Card R merges the new `main` after #1819 lands. It also
  adds lines to `CLAUDE.md` (a new door's rule) and changes `join.js`:
  the next sitting reads both.
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
