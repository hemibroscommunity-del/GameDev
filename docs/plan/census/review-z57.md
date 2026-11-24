# The gatekeeper's review, sitting 57 (card Z; tag 6269)

Taken 2026-11-24 00:55 to 02:30 UTC on `main` b2cdd55a (sitting 56's list
merged). The queue: 17 PRs from the orchestrator, then #2298 and #2299
came ready during the sitting and were taken in. Each was reviewed FRESH at
its head as it stood (several were held at 56 and re-pushed). Lanes on the
top model read each card's purpose and diff and planted faults in a scratch
worktree (step 4b); the lanes' own notes stayed in the session's
scratchpad, and what matters is here. Not for this sitting: #2297 (a
draft), #2300 (DG), #2301 (BK), all opened during it.

## What was open and ready

| card | PR | tag | head | the purpose review | list |
|---|---|---|---|---|---|
| CK | #2288 the asset guards by git's ids | 6421 | 043ef442 | pass | 1 |
| CK | #2294 two slow suites mended | 6422 | f191ced6 | pass | 2 |
| CK | #2296 the checks' bookkeeping | 6423 | 8c9a45da | pass | 3 |
| BK | #2281 the restart sweep | 6461 | 36729df8 | pass (56's hold mended), one Found | 4 |
| BK | #2289 the sum counts the pieces | 6464 | b4cbd29e | pass, one note | 5 |
| DG | #2283 the running room refuses | 6440 | b5ba8bb8 | pass (56's hold mended) | 6 |
| CT | #2282 the two buttons' rules | 6540 | 6e96ab02 | pass, Z's call (below) | 7 |
| WL | #2290 owned state | 6522 | d1ff3d9c, then 67752c2d | pass at d1ff3d9c; its new head holds #2286 and #2287 (held): to 58 | - |
| RR | #2273 the rejoin loop | 6309 | 06cd9091 | HOLD | - |
| PH | #2279 the report sees heat | 6500 | 316dab3f | HOLD | - |
| PH | #2291 the memory alarm | 6501 | 490d110f (reviewed at bce0ac59; the new head only resolves PH.md) | HOLD | - |
| CT | #2293 the left stick | 6541 | 5029ffca | HOLD | - |
| DG | #2295 the scans read the tree | 6441 | f7ef9edb | HOLD (its `test` red) | - |
| WHO | #2285 the actor, made once | 6480 | b09b9721 | HOLD | - |
| WL | #2286 four small mends | 6520 | 1751f7b9 (b407ef82 merged `main` since) | HOLD | - |
| WL | #2287 a leaf stays a leaf | 6521 | 61eae59a | HOLD | - |
| WL | #2298 the open hand | 6523 | 61c016d4 | HOLD | - |
| BK | #2299 the claims bar | 6462 | d14032fb | HOLD (red unplanted) | - |

## The holds: each the planted line that stays green in the PR's own guard

- **#2273** (`thaw-carried.test` §6 reads wsClient's text): in wsClient,
  `if (_td) _td.carried = true;` after `_thaw.due(...)` (every gap judged
  carried: the v2.3.778 stale world never rejoined); `_td && _td.carried &&`
  at the not-carried branch; `THAW.KEEP`'s shift removed (the list's cap).
  Nothing plays "pings missing -> the gap handed on -> `_forceRejoin`".
  The fix reads right; `mp-comeback` 5b is mended in the test.
- **#2279** (`report.test`): sitting 56's (a), (d) and `drawn` are mended.
  GREEN: `rideGaps` as `every(x => typeof x === 'number' && x >= 0)`
  (15.8c sends no positive fraction, `report.test.mjs:709`); the `up`
  row's late and below columns taken raw (`report.js:478`, no check like
  15.8d's).
- **#2291** (`frame-pacer.test`): `memFull` with `memOver(m)`, the switch
  never consulted: `?memalarm=0`, the off-ramp of a change decided while
  the owner was away, is dead in play and no node check runs `memFull`
  (`framePacer.js:388-399`); `memOver(m, true)` (the alarm asleep) green
  in node too.
- **#2293** (`stick-zones` §8, the input read "moved whole"): in
  `stickFrame`, `S._lastInputAt` set on `S.stickX` only (a thumb walking
  straight up is idled out, the v2.3.3034 incident); `dy` not frozen by
  loot (a stunned body walks on Y); `_playerDead` dropped at BroTown's call
  (a corpse walks); `K['a']` walking right; the loot facing removed; mode
  5's raw angle and `?turnzone` ignored; the ring in mode 4.
- **#2295**: its own Server CI `test` is red (`switches-thrown`: gold-door
  past 180 s; it is 99 s alone here, 0.7 s on PR 1: `writesOf.mjs`
  `doorHolders` walks every file per holder). Also GREEN: an item changed
  through `.find(...)` / `forEach` (stash-door; its words claim it);
  `Object.assign(ps, patch)` with `patch = { coins }`, a helper `bump(ps,
  'coins', n)` (gold-door); `S['channel'].send(m)` and `const go = fetch`
  (action-door §7).
- **#2285** (`actor.test`): `gold.js:392` booking a test-mode burn with
  play (§6 checks `g.mint` only); `actorOf` without `s.phase !== 'gone'`
  (a takeover's row could name the old sitting through `_leaveRun`'s
  awaits); `actorRow` marking `test` from `ps._testMode` alone (§5 never
  throws `testmode: false`).
- **#2286**: conflicts with `main` in `tools/guards/lib/fourLines.mjs`
  (sitting 56's lowered renderer lines: taking the branch un-lowers them;
  by the PR's own rule they are 9730 and 8008). And four-lines no longer
  holds code lines: 40 lines folded into one statement in monsterCombat.js
  are green (red on `main`'s guard), unsaid.
- **#2287** (`leaves.test`): `S.monsters.forEach((m) => { m.seen = now; })`
  in a leaf, unsaid; closure state in an IIFE, unsaid.
- **#2298** (`open-hand.test`): a new reader file through `import * as C`
  then `C.getState()`, a renamed getter (`const gs = getState`), or a named
  re-export, each green (`openHand.mjs` `kindOfImport` ~157,
  `ExportNamedDeclaration` ~325); a second reach on a counted line green.
  Its "Not caught" names only `export * from`.
- **#2299**: `node test/claims-gain.test.mjs --whole` fails at its head,
  nothing planted: reach worst 1.96 (seed b) over KNOWN 1.92. The reach
  liar's description was rewritten after measuring and the bots are
  seeded by that string; KNOWN, LINES, the census and the body are stale.

## The passes, in short

- **#2288**: the card's plants all red (a byte flipped at the same size,
  staged, committed two back; a new file; a rename; RGBA; `roles.json`);
  two own red (pictures swapped, mtime put back). Green, not held: under
  `--assume-unchanged` (local only), and in CI where HEAD's first parent is
  the plant's own commit (a rebase-merge; the rehearsal's
  `BT_ASSETS_WHOLE=1` covers it). Its status file says `working` (stale).
- **#2294**: ladder-passes 20.6 -> 0.75 s, the five break proofs and four
  own red; picture-door identical output, five plants red. The two suites
  outside the card named with the orchestrator's approval.
- **#2296**: nothing weakened: precheck's rest cap 20 -> 10 min and the
  gatekeeper's 70 -> 25 min are lowered, said in its words. A precheck
  on a box shared with lanes can end in a false timeout (it did here,
  rehearsal 2: 600 s with no suite failing; the final rehearsal ran on a
  quiet box).
- **#2281**: B1, B4 (56's hold) red; R2 red; four own red. GREEN: the
  Auction House WEAPON listing with a save between `stashTake(...,
  'store_list')` and the `store_listing:` put (`store.js:814`): the row's
  driver lists items only. Z's call: the sweep follows `VALUE_PAUSE`,
  which names only bag roads for that row, so this is a Found for card BK
  (the value table's row), not a hold. Its ITEM control is red.
- **#2289**: the equip-swap loss red; five own red. Note: `piecesHeld`
  compares a count, so a piece lost and one made in the same step passes
  (`Object.assign({}, stashItem, { gid: undefined })` green); one line to
  compare the id sets. Its new head holds #2281 (only BK.md resolved).
- **#2283**: 56's holds red (`guardRecord` gutted; the own-property
  `playerState`, with GOLD-1); the card's `||=`, destructure, receiver
  dodges red; six own red; plants1 17 red, 6 green as its words say (PR
  2's). Found: a row dropped from `GUARDED` (`dead`) green in life-door.
- **#2282**: S11 (56's hold) red, the edges red, 18 own red. GREEN: Z4,
  `stickRead` returning `cos(face)*k, sin(face)*k` (the walk snapped to
  eight ways); nothing calls `stickRead` in this PR and #2293's suite
  catches it. Z's call: pass, with Z4 named here; the exact-edge class
  stays CT's call (as at 56). `server/test/**` only.
- **#2290** (at d1ff3d9c; not listed, its new head holds two held PRs):
  the count is honest (444 one-file fields, less 3 unplaced and
  stickX/Y, plus `_inDuel` and `_race`: 441); the card's plant and 12 own
  red; one green said in its words.

## Step 5: the rehearsal

Rehearsal 1 (all 16 then queued) stopped at the merges: four branches
clash (#2289 with #2281 and #2291 with #2279 in their status files, #2290
with #2287 in WL.md, #2286 with `main`). Rehearsal 2 (the 12 that merged)
was stopped once the holds were known (its precheck timed out on a loaded
box, no suite failed). Rehearsal 3 (with #2290 at d1ff3d9c) was stopped when WL re-pushed its
chain so that #2290 holds #2286 and #2287. Rehearsal 4 is the list, its
seven in order: RESULT_LINE

## Step 5b: what GitHub will merge

Each listed base is `main` (CK retargeted #2294 and #2296 during the
sitting); one merge base each, step by step down the list.

## Found (no card's hold)

- `chaos-restart`'s `store_list` row drives items only; a weapon listing
  is never crashed (card BK: the value table's row).
- `piecesHeld` and `held()` count pieces, not ids (card BK).
- `testroom` §7 tries only coins, hp, the bag and xp; a row dropped from
  `GUARDED` is unseen (card DG).
- Any edit to a claims bot's description re-rolls its dice (card BK).
- `finish.md` part 9 tells the owner the reach is "about 1.55"; its true
  worst over six seeds is 1.96 (the orchestrator's file).
- Statement lines are blind to JSX and literals (WL's four-lines: card WL).
- `framePacer.js`'s header says "the owner's yes" for call 3, which is
  unanswered: it was decided while away (card PH).
