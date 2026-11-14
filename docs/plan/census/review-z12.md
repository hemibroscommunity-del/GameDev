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

## Decided for the owner while away

Each with its switch, for the planning session to read to the owner:

- **#1812** (card TF, held below): the cook kept at 256 colours with a
  limit of his own, 23 (every other picture 16; the owner's "I won't
  notice at all from anything at 256"). Its switch: `?folkskills=0` (the
  three townsfolk back in PR 1's poses, none of the set loaded).
- **#1794** (card O, the next batch): a cool but slow computer on a 60
  screen (a judge's laptop) also steps to a steady 30. Its switches:
  `?govern=0`, `?ladderrate=0`; for everyone, the governor's live
  off-switch, card O's #1814 (the next batch). Answer (a) with it: a fast
  screen is never paced below about 40.
- **#1800** (card O, the next batch) carries the planning session's
  answers (A) (a kept rung loads without its pixel rungs) and (b) (a rung
  takes a share of the pixels actually drawn: a computer too) without the
  heading; `?ladderpix=0` (but see its findings below).
- Not under the heading, the nearest: **#1805** (card P) is road B, the
  planning session's; its condition "never drawn bare while it waits" is
  not met, as on `main` (below), and goes to the owner's list.
  **#1798** (card LB): Overall's columns, the planning session's yes.
  **#1813** (cards K and R): nothing a player sees; every cost built OFF.
- Still waiting for the owner's own word (costs, never decided this way):
  card E's `arenasettleplan` and `econresetput` (both OFF); card SK's
  #1782 (+8 to +10 moves a ride; `?ridecoast=0`), not listed.

## What GitHub shows, step by step (card Z's step 5b)

Every listed PR's base is `main` (`base.ref`, read at the sitting's
start and again at the list). Merged down the list in its order in a
scratch copy (each a merge commit), every head had ONE merge base with
the `main` above it (`git merge-base --all`), this branch last included.
Card L's #1803, now based on `main`, was retargeted from L's own branch
before the sitting. The stacks: #1809 carries #1803's head, #1810
carries #1806's carries #1805's, each with no `main` merge of its own
past its parent's, so each needs nothing after its parent lands.

**The next batch, and why (agreed with the planning session, 18:00):**
- Card O's #1792 (723dc0b), #1794 (70dc592), #1800 (6d46f97) and #1814
  (the governor's off-switch, begun from #1800): #1792's `ladder` row
  meets #1803's new `DOOR_SUITES` form (a property read off the tree;
  `_rung` was a module `let`: tried, FAIL 2 "a stale door"); O holds it
  on a module object, merges the new `main` into #1792 after today's
  list, then #1792 into #1794 into #1800 into #1814.
- Card T's #1816 and #1817: conflict at `switches.mjs`'s end after
  today's two rows; T merges the new `main`.
- Card TF's #1812: held (below).
- Card SK's #1782: the owner's yes to its cost (below).

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
(a440c9b) and `claude/plan-t-4-thrown-rebuilt` (922b388, then e0f5317, carrying the
first): #1816 (tag 5303) and #1817 (tag 5304, after #1816), replacing
#1797 and #1804 (closed). Step 3: the files are the
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

## Card L: #1803 (tag 5209) and #1809 (tag 5210): listed

Read at cd1e239 and 59df4a9 (#1809 carries #1803; both target `main`,
one merge base each).

**#1809, the trade door (it DEPLOYS: `server/src/trade2.js`).** One
field (`s.state`), one writer `_t2To(s, to, way)`, ways in `TRADE_WAYS`
(own-property checks; `way` is always a server literal), both ends final.
"Nothing a player sees changes" holds: both call sites ignore what
`_t2To` returns; the cancel's own guard (~159, unchanged) still decides
the staged weapons' refund, once; between `_t2SessionFor` (~260, open
only) and the swap's `_t2To` (~351) there is no await and nothing reaches
a cancel, so `_t2To` always writes over `open` and never refuses. `_t2To`
is synchronous and cannot throw: the swap is still one run of writes
(handoff rules 5 and 7). `tradedoor: false` changes a write only when the
phase is not `open` (never today): byte for byte `main`'s messages and
writes either way. No new message, no cap needed (`_t2Wire` unchanged),
no storage key, no stored shape (`_trades2` is memory only).

- VERIFIED (planted writes), low: the two readers' gaps. The suite's
  regex misses `??=`, `||=`, a multi-line `Object.assign`, the shorthand
  `{ state }`; the tree misses a spread inside `Object.assign` and a
  nested function named `_t2To`; both miss a destructuring target,
  `s[k]`, `Reflect.set`, `Object.assign(s, someVar)`. Each catches what
  the other misses; what is left is unlikely code.
- Low: `prop: 'state'` over all of `server/src` is strict on a common
  name: a new Durable Object's `this.state = state` or a payload's
  `Object.assign(copy, { state })` fails both, blaming the trade door
  (fails closed; the fix is a line in `NOT_A_TRADE` and `besides`).
- Low, for later: the swap calls `_t2To` after the debits and ignores its
  answer, so "both ends final" can never stop a swap. If a later PR puts
  an await before ~351, a cancel landing there refunds the staged weapons
  while the swap still pays, and the phone reads a cancel.
- Suites: trade-window-slot, trade-door 27, pettrade, trade, trade2,
  trade-onewrite; the full `npm test` at 59df4a9 (408 suites) green.

**#1803, the phase guard reads a suite-held door off the tree too.** Its
four break proofs hold; the `besides` entries are right
(monsterlife.js `m.life`, tileRenderer.js `this.currentZone`, and with
#1809 the five Durable Objects' `this.state = state` and dungeon.js's
`inst.state`). L's second block (5520 to 5539, `nextBlock` 5540) meets no
other block and no tag on any branch. **It meets card O's `ladder` door:**
the ladder's field `_rung` was a module `let`, which a property reader
cannot see (tried: FAIL 2 "a stale door"); card O holds it on a module
object now, so the row takes #1803's `prop` form (the planning session,
18:00) in the next batch.

## Card O: #1815 (PR 7, tag 5227): listed

Read at 3b72380 by the gatekeeper (one merge base with `main`, clean;
it DEPLOYS: `server/test/device-profile.test.mjs`). It stands alone
(begun from #1787, merged): none of the governor's PRs is in it. The four
askers (`paletteTex.js` the chip's name, `peerImpostor.js` the largest
side, `bodyBake.js` the threads, `crashTrap.js` the user agent and the
largest side) ask `deviceProfile.js` now, each getting the answer it got:
`chipName` is the old `rendererName` (RENDERER, else the debug
extension's, '' on a throw), `maxTextureSize(r) || 4096` and
`(cores() || 2) - 2` keep their fallbacks. `deviceProfile.js` imports two
leaf files only (`drawLanes.js`, `lookPaletteChoice.js`), so the crash
trap's new import adds no cycle and no earlier evaluation. §3 now fails a
new asker outside the profile; four are a census that only falls
(`STILL_ASKS`, line 4: the identity's fingerprint, the `?perf=1` strip,
the debug overlay's UA cell, `lookPalette.js` for O's PR 8). No PR on
today's list adds an asker (their diffs read). CI: `test` green at
3b72380.

## Documents: #1808 (Z, tag 5368), #1811 (E), #1813 (K and R, tag 5180)

- **#1808**: card Z's step 5b (a PR's base, and its merge bases counted
  step by step): sitting 11's two lessons, as they happened.
- **#1811**: card E's status marked `done`: every PR of the card is on
  `main` (#1785, #1786, #1802 at sitting 11). Its Needs keep the owner's
  two cost words (`arenasettleplan`, `econresetput`, both OFF).
- **#1813**: cards K (the wire, moved) and R (roads and restore), from
  their orchestrator; tag 5180 (K's first, as L's orchestrator took
  5200); every tag in them bare; their shared-file order (K's two
  `index.js` PRs first; R's 5280 and 5281 before K's 5194; R's escrow
  ledger last), which the next lists follow. Every cost is built OFF and
  listed for the owner.

## Card TF: #1812 (PR 2, tag 5462): HELD to the next batch

Read at 14a8c24 (81e9b47 adds a status line only). The set: seven
sheets of colour numbers (`public/sprites/look/skills/`, 2.59 MB of
texels, 8-bit, no mips, a texture a sheet), loaded behind the loading
screen by `preloadLookSheets`, not on a Windows or Mac computer
(`lookPaletteWanted`); a texture list per look and sheet made once and
swept after 30 s idle (not per frame); one more palette row per working
townsperson's look (three). The cook's 5112 texels wide is the player's
own cook strip's width. Its CI was green at 14a8c24.

- **HELD, VERIFIED by reading (the gatekeeper), medium: red on `main`
  after its merge.** `tools/qa/mp/mp-folkwalk.mjs` ~109-111 (unchanged
  by the PR) waits 45 s for Chef Blaze's pose `pickup`; the PR's stop
  table (townsfolkWalk.js ~131) gives him `cook`, so section 4 fails on
  every run. Mend: expect `cook` (`pickup` under `?folkskills=0`).
- **VERIFIED by reading, medium: the working townsperson is drawn without
  the world's form shade.** `formShade.js` (on by default, `?shade=0`)
  shades a sprite with `_vShade`, or a parent or grandparent with
  `_vShadeKids` (~188-200); folkSkill.js's container `npc_folk_skill` and
  its sprites carry neither, nor does the townsperson's display (only
  `display._fig`). Farmer Bro's legs and boots jump up to about 28%
  brighter and lose the cool shade at each stop, beside shaded players
  doing the same work (`markStandIns`). Mend: `_vShade = SHADE.figure` on
  the body, tee and prop, as the stand-ins.
- **Medium, the card's "done when": no `mp-ghostaudit` sample of any new
  townsperson pose** (cook, chop, farmhoe, farmwater, farmkneel). The PR
  ran `BT_GHOST_ONLY=fire,cook` on the PLAYER (cook draws 0 frames there,
  on `main` too); `mp-folkwork`'s own ghost check (11 of 11) stands in.
  The PR says so; the planning session's to rule.
- VERIFIED (probe), low-medium: `townsfolk-walk.test` 6d's ordering half
  is vacuous (it looks for `this._drawFolkSkill(`, which exists nowhere:
  `indexOf` -1); moving `folk.visible = true` above the draw call (TRAPS
  §218's flip each frame) stays green (60 of 60).
- VERIFIED by reading, low: 6e's second break proof is false (a whole-set
  bake with `ROLE_BAKE_BAR=23` writes no `bar`, ~75, ~414, ~438); a
  sturdier rule: any sheet whose worst shift is over 16 needs its `bars`
  row. The cook's own row is honest (an empty why fails).
- VERIFIED by reading, low: the 2.6 MB set loads under `?lookfolk=0`, the
  Test panel's "Townsfolk drawn live" off, or `?folkwalk=0`, where nobody
  is drawn live (folkSkill.js ~59: gate on `lookFolkAtLoad`).
- Low: the cook's quantising "mean 4.3" is another measure (per pixel,
  straight RGB, 11.1 against 3.1 to 6.5 for the others).

## Card SK: #1782 (tag 5440): NOT LISTED (the owner's yes to its cost)

Re-checked at 5f08c7b (`main` merged in at 17:50: it had conflicted at
`src/state/movement.js`; one merge base now, clean). Sitting 11's
finding is mended: `rideFeel` holds the board on whatever `rideActVerb`
names (a pose struck, a harvest, a trap; ride.js ~375), so a pose struck
mid-roll stops the roll for good and is not ended by it. Its cost is
unchanged: +8 to +10 move messages a ride, all in the ~1.9 s roll-off
(sitting 11's probe). Ready the moment the owner says yes; `?ridecoast=0`
its switch.

## The lines

`tools/guards/lib/fourLines.mjs`: every file and function at its line on
`main` (effectsRenderer 9870, entityRenderer 8961, BroTown 8371, ...):
nothing to lower. The switch table's unlisted line (113, 112 found on
`main`) is left to card T's #1816, which takes it to 0.
