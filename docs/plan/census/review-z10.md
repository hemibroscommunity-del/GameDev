# The gatekeeper's review, sitting 10 (card Z; v2.3.5366)

Taken 2026-11-14 on `main` at 6f9e740 (sitting 9's five merged at 11:18
UTC). Each PR that changes `server/` or `src/` had a finder read the code
around its diff (the angles of `/repo-review` that apply) and try to
disprove what it found. The gatekeeper read the code itself for every
candidate that decides a hold: #1777's first frame, #1785's restart,
#1782's harvest, #1764's default. Documents and tools got step 3: #1768,
#1784, #1770's delta, card E's #1758, #1759, #1761 (tests only).

VERIFIED: the story runs, on the code path named (a finder's probe in a
throwaway copy, or the gatekeeper's reading). PLAUSIBLE: the code does it,
what sets it off is unproven (it says what would settle it). DISPROVED:
kept only where the code invites the question again. The probes are not
in the repository.

## Decided for the owner while away

No PR carries the words yet (#1784, which makes them, is on this list).
The nearest: **#1781** (card PW): "the planning session decided the
boards, which the owner left to it" (the owner: *"You can add more stats
to leaderboard if you think it's worth it"*): eight boards, a shared stat
each and damage. Its switch: the live flag `statboards: false`.

## What GitHub showed at the start, and the mends during the sitting

`main` had moved at 11:18. Against it and against #1768 (card T's PR 2,
which drops the switch page's count line), every row-adding branch
conflicted: #1749, #1767 (and #1775, #1779 on it), #1763, #1766, #1776,
#1781, #1777, #1764 and above, #1782. Card PW's three and card SK's
#1782 also conflicted with `main` on `tools/dev/tag-blocks.json` (LB's
block), and #1781 had no CI run at all; card TF's #1770 and PW's #1774
then conflicted with each other there, whichever went second.

The gatekeeper sent these to the planning session, which had each branch
merge `claude/plan-t-2-page-game` (sitting 9's chain) and write the
blocks as TF's branch does (SK, TF, PW between J2 and LB). By 12:00 the
fourteen on the list chained clean in its order, each `test` green on
its head; card E's #1764 joined at 12:06 (948dc8d, its `test` green).
#1772 (a88bc9e) and #1773 (a245beb) joined at 12:13, each `test` green.
Not mended at the list's writing: card L's three; #1785's mend
(fed858f) came at 12:20, too late to review.

Found on the way: two branches that each change the page's count line the
SAME way merge clean and leave it stale (PW's first heads with `main`'s
`econ`: "251 rows", the guard's check 8 red on the merge). #1768 ends it.

## Card T: #1768 (PR 2, tag 5302): step 3

Its files are the card's (the table, the page, the scanner and its
guard, the spec, T's status). The count line is gone ("How many there
are: `node tools/guards/switches.test.mjs` prints the count"); after it,
row-adding branches in different places merged clean in every order
tried (H, P, PW, SK). Unlisted 113 (was 195). No `server/` file.

## Card PW: #1774, #1778, #1776, #1781 (tags 5480, 5483, 5481, 5484)

Reviewed at 90e1de0, 03da2d8, c784532, f5ae834; the heads listed
(f9836b3, 877b308) add only #1768's merge and PW-1's block lines.
Nothing high or medium. The rows are the server's own (the public
`/api/leaderboard` answers GET only, index.js ~371); a phone's claimed
`ap`, `powerIndex` or `statPoints` never reaches a board (3c, §11c);
`powerOf` builds a fresh copy and puts `Math.random` back in a `finally`;
no await between the throttle and the commit; `statPoints` in the change
signature adds no rows (playtime already changes it each minute);
`caps.power` and `caps.statboards` each on a line of their own;
`power`, `statboards` rowed. A rolled-back worker ignores the new fields
(a board row has no shape number). Suites: power 64, boards 63,
statboards 20, cost-guard 40, caps-audit 6, liveops 110, mirror-audit
396; the full `npm test` on the four together 399 of 399. #1778's "red
before" is true (11b, 11d, 11f fail on `main`'s code).

- **PLAUSIBLE, low (L1): the stat boards' order is pinned by an
  expression.** `statboards.js` ~41 is `Object.keys(PROG3.BODY)` plus
  `dmg`; `caps.statboards` is a count (TRAPS §9), so a stat added in the
  middle shows a new phone on an old worker a board it does not know,
  and `getTop` sends it to the level board under the new label. Pin the
  order in statboards.test 1a as a list that only grows at the end.
- **VERIFIED by reading, low (L2):** a `POWER.V` bump empties the Power
  board of characters offline until they join (the Leaderboard object
  cannot recompute; `power.js` says "not yet ranked").
- **Low:** `docs/specs/power-index.md` still puts `caps.power` in
  `CAP_GATES` (card LB has that row) and the stat boards "waiting".
- **Low (L4, said in the PR):** four to eight levels apart the index
  calls 88.9% of fights, the plain level 99.7%.
- **Info:** every `/top` row carries `statPoints` and `powerIndex`: a
  public GET shows each top player's allocation (the owner's request).

## Card E: #1758, #1759, #1761 (PRs 7, 8a, 8b): step 3

Merged today's `main` (11:28); their own diff is tests and documents
(`testroom.mjs`, `testroom.test`, `chaos-restart.test`, SHAPES, E's
status): sitting 8's review stands; each `test` green. They deploy.

## Card E: #1764 (PR 8c, tag 5089), #1772, #1773: on the list

#1772 (PR 10) at a88bc9e and #1773 (PR 11) at a245beb merged #1768 and
#1764's head; #1772's own change since the review is its status file;
#1773's is the empty window's row (`xfer.js` `sideEmpty`: a settlement
that moved nothing either way writes no row; xfer.test checks it) and the
cost lines' words (a row and its delete 90 days on: two rows a trade over
its life). `xfer` is ON by default: one row a trade, plan step 10.3's own
line (`cost-guard` §16).

**Mended during the sitting (e86c17c, 948dc8d), read by the gatekeeper:**
`arenasettleplan` is OFF unless the live flags say `true` (`gladiator.js`
~114: the plan's two rows a match wait for the owner's yes); the stamp
prune waits for an open plan (`_arenaSettleWait`, asked in `tick.js`
~436 beside the store's and the Auction House's; the tick is the prune's
one caller); a plan with a leg the worker cannot read pays NOTHING
(`arenaPlanReadable` before any leg); a plan is finished once at a time
(`_arenaPlansBusy`); #1768 merged in. The finder's probe, turned on and
asking `_arenaSettleWait` first as the tick does: 0 g in every shape (1 h
and 49 h, cut after 1, 2, 3 batches); the prune called straight, as
before: +50, +620 (so the guard lives at the caller, as the market's
does). With the plan off, the new code's one live act is a list of
`arena_settle:` once a worker's life (a read, no write). arena-settle,
chaos-restart (ALL PASS), cost-guard, sponsorship, arena, opid-audit,
liveops green at 948dc8d; switches.test green (336 rows). With the plan
off the old order runs, its hole included: `KNOWN` is empty only once
the owner says yes. #1772 and #1773 have not merged #1768 or this head:
held with that one conflict.

The review at c6d8751 and effd31f, before the mend. Sitting 9's holds: (a) `arenasettleplan` rowed (5cdd0bf); (b) the plan
is ONE record (fdf2226): puts 1v1 5 -> 6, 3v2 10 -> 11, 10v10 32 -> 33,
deletes 2 -> 3, 5 -> 6, 20 -> 21, said in the PR, `cost-guard` §17 holds
the 1v1 line; (c) a rollback's double pay within 48 h, a hand-made id's
leg (any id to 400 characters, arena-settle §4), the stale words: mended.
Suites at effd31f: arena-settle 12, sponsorship 44, arena 88,
chaos-restart 21, cost-guard 43, world-sum 34, storm 53, xfer 20, trade
57, trade2 50, trade-onewrite 23, liveops 110, gold-door 201; the full
`npm test` 400 of 400.

- **The hold at c6d8751 (mended above).** The planning session wrote
  that #1764 ships with `arenasettleplan` OFF until the owner answers the
  cost (a match's two rows: the plan's put and its delete); at c6d8751
  `gladiator.js` ~114 returned true unless the flag was present and
  false: ON. Nor had it merged #1768.
- **VERIFIED (probe), low-medium, mended at e86c17c: a plan
  left by a deploy pays its legs again after 48 h with nobody joining.**
  The next visit's first housekeeping slot runs `_opPruneMaybe`, which
  deletes the legs' stamps; it waits for the store's and the Auction
  House's settlements (`_mktSettleWait`, `_stSettleWait`), not for arena
  plans; then the join's sweep (`join.js` ~1705) finishes the plan and
  pays every leg again: +50 g, +620 g at 49 h idle, 0 at 1 h (TRAPS
  §146, §322). The same root brings back (c1) for a rollback over 48 h.
- **VERIFIED (probe), low, mended at e86c17c:** a plan kept "for the
  owner" (a leg this worker cannot read) re-paid its good legs at every
  join's sweep after 48 h (S1 1000 -> 1500 -> 2000).
- #1772 (the storm): the deploy half is real (`STORM_PLANT=1` fails §3,
  +300); `worldsum.mjs` is the old code word for word. PLAUSIBLE, low:
  "no honest player flagged" can hardly fail on the bot-flag side (no
  harvests, cooks or rings of 48 in the afternoon; no break proof).
  storm is the full run's tail (+10 s; `SLOW_FIRST` would hide it).
- #1773 (`xfer:`): the row's put rides `_creditLiveTogether`'s `also()`,
  one run with the swap; moved after the await, its break proof fails
  (FAIL 3). Lazy expiry, a 32-key page at a write; rowed, registered,
  `Object.create(null)`. VERIFIED, low: an empty trade window writes a
  row; each row also costs its delete in 90 days.

## Card E: #1785 (PR 12, tag 5093): HELD

The mend came at fed858f (about 12:20): `persistence.js`
`_resetCharacterData` now books what a restart takes (`econcard.js`
`econResetBook`: the record's and the vault's held less made, into the
book's `econ` part) and the card adds the restarts back; `/dev/econcard`
returns the open sittings' seconds (M3). Not reviewed this sitting: it is
new code on the restart's road and a new import (`persistence.js` ->
`econcard.js` -> `worldsum.js`, `daybook.js`). For sitting 11 to check:
the finder's M1 also named gold the restarted character left in mail and
listings, which the booking does not read. Card E's #1786 (PR 9, the
pause) opened at 12:20: not reviewed.

Read at f56d755. The route is behind `_adminAuth` and reads at most
(n+1) metrics rows and n x 500 `xfer` rows; no new key, put or flag (the
`econ` switch covers the walk, the leave line and the route); the leave
line awaits nothing; an old worker answers 404 and the card says "not
read"; `worldsum.js` and `liveops.js` import each other only inside
functions. Suites green: econ-card 31, world-sum 34, storm 53, liveops
110, cost-guard 43, session-door 46, devtools 46, daybook 97.

- **VERIFIED (probe), medium, the hold (M1): a character restart turns
  "unexplained gold" red.** `persistence.js` `_resetCharacterData`
  deletes `rpg:<pid>` and its `_econ` with it, outside the gold door. A
  mints 1000 and trades 100 to B; B restarted: held 900 against net
  1000, -100 in red; A restarted instead: +100, read as a copy. The
  owner restarts characters from the picker. Mend: at a reset, book the
  record's held less net into a world count the card subtracts, or list
  the restarts between two counts.
- **VERIFIED by reading, medium (M3): today's gold a player-hour is
  overstated.** The top (`bookRead`, daybook.js ~411-418) counts the
  open sittings' adds; the bottom only seconds booked at a leave
  (`leave.js` ~156); the owner reads it from inside a sitting (2 hours
  and 20,000 g after a 10-minute sitting: ~120,000 an hour, not ~9,000).
- **VERIFIED (probe), lower (M2):** the daily walk spans several 3 s
  slots once a stage needs a full page (200 records): a road between
  slots reads as unexplained (+500, +300). Not reached by one player.
- Low: the walk keeps every gear and pet id in `_metricsJob`; the last
  slot runs ten short lists in one hold (TRAPS §76); with `xfer: false`
  the card says "no gold moved"; `daybook:`'s registry row does not name
  `econ.p.s`; `dev-econ-card` is in no review packet.

## Card H: #1777 (follow-up 2, tag 5051): on the list at 3c7598d

Reviewed at 702615d. **VERIFIED, medium-low, mended during the sitting:
the first-frame cut saved nothing.** Every sheet the figure loads
(`characterPortrait.js` ~592-598, `stand-<dir>.png`) is one 128x128
frame (the PNG headers): `_firstFrame` built the canvas the upscale
built, and the account ("the whole strip ... every frame of it") was not
true. 3c7598d drops the cut and `?portraitframe` (characterPortrait.js
and look.js equal `main`'s), says in `held-sweep.md` the 22 ms is open
(two candidates, unmeasured), and keeps the guard.

- The guard (`_maskedBodyFrameInner` ~3359): every piece readable, the
  call is as before; one not, the body plain and asked again; on a cache
  miss only. `tools/qa/belt-unreadable.mjs` runs it in the belt harness
  (PASS, FAIL without the guard), by hand: not in CI.
- **VERIFIED, low:** `worn-bake.test` §5 reads the source: the guard
  short-circuited with its text kept stays green.
- Counts at 702615d: worn-bake 19, picture-door 33, strip-door 36.
  It touches `server/test/`: it deploys.

## Card P: #1749, #1763, #1766 (tags 5249, 5250, 5252): on the list

**Sitting 9's hold is mended (374dda4):** the trap's box is out of
`WORLD_ICONS` (p256.js ~67) and `P256_FILES` (so `?p256=1` finds no
twin either), its twin deleted, `reduce256` no longer makes it; the
other loader (`paletteLoad`) never matches `/icons/`. A missed trap cuts
its pieces from a picture again. No other world icon is read on the CPU
after the pack: the ores, shards and the sword are Sprites; the heart's
cut (`readSourceRect`) runs in `_fxLoad`'s `.then`, before the 1 s pack
and its deflate; the screen's users load their own images. #1766 carries
the mend. #1749 read clean at sitting 9; its new head adds `main` and
#1768.

- Low: `artCache` 97.1 is 0.06 MB tighter than the saving (measured
  33.8 against it: no risk); `buffers`' header still says thirteen, 0.30
  MB (twelve, 0.28); P's status says 15 icons (14).

## Card SK: #1782 (PR 1, tag 5440): HELD

Read at 9e9773d. **VERIFIED by reading, medium, the hold: a harvest
pressed while the board rolls is cancelled, and the owner's old wrong
line comes back.** `startExtraction` sets `S._extraction`; next frame
`rideFeel` (BroTown.jsx 5608-5609) writes the roll's way into `dx`/`dy`;
nothing resets them before ~6928, where `Math.abs(dx) > 0.2` sets
`S._extraction = null`. The worker ends the ride on `extraction_start`;
`rideActVerb` finds no `_extraction`: "Off the board to fight.", the
line v2.3.3875 fixed. Every chop inside the ~2 s roll; about half the
fishing and mining (their seat snap). ride.test §6b sets `_extraction`
by hand. Mend: `S._extraction` in `rideFeel`'s hold.

- **VERIFIED (simulation), medium-low:** a phone's stick 57-90 degrees
  into a wall crawls instead of sliding (`ride.js` ~362, `BLOCK_K` 0.3
  zeroes the held speed): 10.5 px/s at 60 degrees against 150 with
  `?ridecoast=0`. Keys at 45 degrees still slide.
- **VERIFIED (simulation), low:** a changing speed defeats the move diet
  (`pathMayWait`): a start, 4 s and a stop send ~80 moves against 21.
- Low: `tapOn`'s three tries hide the button's dropped long tap; check
  12 sets `S.stickX` by hand. `boardwheels` 7 of 8, `townride` red
  (main's too, the PR says; not checked).
- Read clean: the worker's budget (1000 px/s) never refuses the roll;
  `?ridecoast=0` restores the old ride; no new sound; the break proofs
  fail (8 and 3); BroTown 8371 -> 8370 code lines.

## Card LB: #1783 (PR 2, tag 5501): HELD

Read at 83c1578. Three VERIFIED faults in what the owner sees, in the
code and the PR's own `docs/shots/leaderboards-look-upright.webp`:

- **The top names cut to a few letters upright.** Row 1 "Bee...", the
  ribbons "Chunk...", "Beefy Le...": a 264 px board less 188 px of fixed
  columns leaves ~31 px (~16 on a 375 px iPhone). Mockup 2 shows whole
  names. (`LeaderboardPanel.jsx` ~237-245, 315; `BoardRow.jsx` ~330.)
- **The podium shows the name-plate level on every board** (`r.lv`,
  ~303, 318-321): on Melee, Kills, AP or a skill, #1 "Lv 20" beside #2
  "Lv 30".
- **A skill board's row shows two "Lv"** ("Lv 12 ... Lv 3"); v2.3.4393's
  rule went from UI-DESIGN-NOTES, and `BoardRow.jsx` ~29-31 still says it.
- Low: `ui-leaderboard` still `draw: 'none'` (`dom` now; the old
  `rank-1..5.webp` used by nothing); `DevWatch.jsx` imports `BoardRow.jsx`,
  so the Test panel fetches the 20 pieces too; your own row in 1-3 has no
  mark; `mp-boards` 4g passes with nothing checked when Ghost ranks below
  3rd; the spec and status put `power` in `CAP_GATES` (it is not).
- Read clean: no `caps.power` read; an old worker's rows render; the art
  loads on open (the card allows it, the old trophies did) and goes on
  close; ASCII; the state ledger's `lastCat` row; guards green.

## Not reviewed

- Card L's #1767 (read clean at sitting 9), #1775, #1779: not merged with
  #1768 (the page's count line) at the list's writing; #1775 and #1779
  wait with #1767. L's last commit 11:00 (not stalled).
- Card J2: no PR open (PRs 2 to 4 on their branches, `ready`).

## The lines

`tools/guards/lib/fourLines.mjs`: every file sits at its line on `main`
(effectsRenderer 9870, entityRenderer 8961, BroTown 8371): nothing to
lower. The switch table's unlisted line falls with #1768 (195 -> 113):
card T's to lower (its PR 3).

## The whole

Rehearsed with `tools/dev/gatekeeper.mjs` from `main` 6f9e740:

1. #1768, #1770, #1777 (9fedd41), #1758, #1759, #1761, #1784 (tree
   8e202686), `--until=build`: precheck 0 FAIL (6 WARN), build.
2. #1768, #1784, #1770, #1774, #1778, #1776, #1781, #1758, #1759, #1761,
   #1749, #1763, #1766 (tree 5c4c41c1): precheck 0 FAIL (8 WARN), build,
   questline 187 of 187.
3. The fourteen of the list without #1764, this branch last (d8a1f28's
   parent; tree c64f9120): precheck 0 FAIL (9 WARN), build, questline 187
   of 187.
4. The list as written, #1764 (948dc8d) after #1761, this branch last
   (d8a1f28): see `status/Z.md`.
