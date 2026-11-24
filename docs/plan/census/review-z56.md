# The gatekeeper's review, sitting 56 (card Z; tag 6268)

Taken 2026-11-23 23:15 to 2026-11-24 00:50 UTC on `main` 0aec6482, the first
sitting after the direction of 2026-11-23 (card DIR's #2275). Its new steps:
4b (the purpose review, a lane on the top model planting faults), the log,
two sittings a day. Tags bare. The lanes' own notes were kept in the
session's scratchpad; what matters is here.

## What was open and ready

| card | PR | tag | head | the purpose review | list |
|---|---|---|---|---|---|
| DIR | #2275 the direction | 6400 | b713c936 | documents and tools: step 3 | 1 |
| CK | #2284 switches-thrown on a PR | 6420 | 2fade240 | pass | 2 |
| LF | #2276 the ground swatches' rule | 6292 | 7d2a59e7 | tools: step 3 | 3 |
| LF | #2277 mp-quietphone's mend | 6310 | 18c63fc6 | pass (a skip, below) | 4 |
| BK | #2278 the sum plays what it sums | 6460 | c10df915 | pass, one Found | 5 |
| LF | #2280 the band's keys, narrow | 6291 | 16dc41af | pass | 6 |
| BK | #2281 the restart sweep | 6461 | 8e35bb02 | HOLD | - |
| DG | #2283 the running room refuses | 6440 | f6f33ba9 | HOLD | - |
| PH | #2279 the report sees heat | 6500 | 8c4e11e7 | HOLD | - |
| CT | #2282 the two buttons' rules | 6540 | 7620b19b | HOLD | - |

#2282, #2283 and #2284 came ready during the sitting (the orchestrator's
word); each was taken in. Not for this sitting: #2273 (RR, the rejoin loop).

## Step 3: each against its card

- **#2275**: card DIR's files exactly; precheck passes in the rehearsal.
- **#2284**: card CK PR 1's files; the 120 s line for a documents branch is
  not met (215.5 s; `claims-gain` 162 s alone, card BK's file), named in
  its words as the orchestrator decided. Its status file still says
  `working`: true it on its next push.
- **#2276, #2277, #2280**: card LF's lines 4, 2, 3, their own tags; #2280's
  two assertions of `mp-deskkeys` step 1 changed to the new behaviour (the
  planning session's yes, named in its words); 8f stays red on `main`
  (card CT's verdict). Status files HB2, EN (`done`), LF are card LF's.
- **#2278**: card BK PR 1's file; done when plants 2 and 3 are red: both are.
- **#2279**: its files outside card PH (`wire/in.js`, `liveops.js`,
  `src/state/debug.js`, `switches.mjs`, `docs/SWITCHES.md`, two suites) are
  same-change rows, but its words name no approval.

## Step 4b: the purpose review (lanes on the top model)

- **#2278**: the card's plants red (`store.js` AH listing one less;
  `market.js` order one less); own plants red: a trade gift skipped,
  `nml_weapons` emptied, an offer's take through a `bind`, a stash restored
  from an alias. GREEN: `gear.js` equip swap losing the old weapon
  (`stashSet(...)` then `bag.splice`): the road ran, and `worldsum.js`
  counts no pieces. Outside the PR's claim (roads played): a Found for
  card BK, not a hold. world-sum 0.6 -> 1.1 s.
- **#2281, HOLD**: plant R2 (`cadence.js` jackpot save removed) red; own
  plants red (an offer's save, the bank's purse save, the arena entry).
  GREEN on its own row 14 `trade2_stage_weapon`: B1 `await escrowed;`
  before `mine.push(...); _saveRpg(...)` (the v2.3.3294 incident: four
  axes after a restart) and B4 the save before the `trade2wpn:` put (a
  weapon lost). §7's `seedPlayers` saves stashes with no gid and its judge
  counts no weapons. chaos-restart 2.3 -> 7.5 s.
- **#2283, HOLD**: plants1 17 red, 6 green, as its status says (the six are
  PR 2's); the card's `||=`, destructure and receiver-m dodges red once made
  live. But no check proves the guard is on a record: `guardRecord` gutted
  to `return ps;` leaves gold-door, life-door and testroom green; with
  `server/src/index.js:802` making `playerState` an own property, gold-door
  stays green with GOLD-1 planted. Notes for PR 2: a `bind` of `_goldGive`,
  `{ ...ps, coins }` put back, a stash item changed in place.
- **#2279, HOLD**: card PH's dodges (a) and (d) green: raw ramps reach the
  cell key past `rampsOf` (`reportSums`), and `_reportTake` takes the four
  fields with `reportheat: false`; also `rideGaps` not held to integers,
  `drawn` stored unchecked. The code reviewed sound; the suite does not
  hold it. Cost: `cost-guard` green; no extra running cost (GameRoom is
  SQLite-backed, billed by row: the day's book stays one put a 5-minute
  pace; 24 -> 28 KB is storage only).
- **#2282, HOLD**: 56 plants. GREEN: S11, `sight.js` `angleOff` without
  `if (d < -Math.PI) d += 2 * Math.PI;` (facing west, a monster up-left is
  never sighted: §3 plays only the positive wrap). Also green, CT's call:
  exact-equality edges (stickZones DEAD, the swipe at 30 px / 300 ms, the
  latch at 550), phases.js `states` drifting from `LATCH_PHASES`. Switch
  off is clean (TRAPS §305); its approvals all named.
- **#2284, pass**: the card's plant A (`join.js` `lookjoin`) red on the PR;
  plant B (`cleanmore`) not thrown on its PR, red by `--whole` (the card's
  stated catch, at the rehearsal); a computed flag name red. Not caught
  before or after (no loss): a cap advertised whatever its reader says.
  `MACHINERY` leaves out `systems.mjs` and `switchScan.mjs` (a later CK PR).
- **#2277, pass**: a quiet phone at 17 to 19 a second under `?diet=0`
  (`quietMoveGap` without its alone saving) red twice on the hard 16 line.
  The 80%-of-near line is a named skip on every run here (near 14.5 to
  18.7 on this box, it needs over 20): the hard line is what guards on the
  test box.
- **#2280, pass**: the band's list drawn on the narrow column
  (`bandKeysActive` without the desk-wide condition) red at step 1; so is
  the same in `game.css` (the rule without `html.bt-desk-wide`). The
  code: `deskBandActive` reads classes and `matchMedia`, no layout read.

## Step 5: the rehearsal (card CK's own gatekeeper.mjs, from its branch)

Started five times as PRs came ready and holds were found; each stopped run
was taken away whole. Rehearsal 6, `main` 0aec6482, in list order: tree
2fe89fcc. precheck 0 FAIL (160 s; it was 863-893 s), `switches-thrown
--whole` 89 switches, 2418 suite runs, 641 s, build, questline 187/187.
All green. With #2282 in (rehearsal 5), precheck was 0 FAIL in 227 s.

## Step 5b: what GitHub will merge

Each base is `main`; one merge base each, step by step down the list and
this PR (simulated merge commits: the last tree is rehearsal 6's).
