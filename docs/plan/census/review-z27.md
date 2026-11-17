# The gatekeeper's review, sitting 27 (card Z; tag 5665)

Taken 2026-11-17 on `main` ee235aaa (sitting 26 merged: O #1970, #1974,
#1977; Z #1982). The owner asked for speed: one reviewer a PR group, the
angles of `/repo-review` in one pass, each candidate tried before it is
reported. J2's three change only phone tests (step 3, the card check).
Late arrivals go to sitting 28. Tags written bare.

## Heads, merge bases and trees

Every listed PR is based on `main`, with one merge base at every step
(`git merge-base --all`, each against `main` with the PRs above it merged
in). The tree after each merge (`git merge-tree`, step by step):
1 #1984 a57275c5 · 2 #1986 36bcc5ed · 3 #1987 51e5f022 · 4 #1980 ce8ca16a ·
5 #1989 78afb48a · 6 #1978 729ccb21 · 7 #1985 257153ff · 8 #1991 9c9796ce ·
9 #1988 0670f9eb.

Rehearsed (`tools/dev/gatekeeper.mjs` on ee235aaa): J2 x3, R, K #1989,
T, O #1985, P (tree 74e3dd50): precheck PASS (0 FAIL, 305 s), build
PASS, questline 187/187 (468 s). O #1991 added after #1985, the whole
list (tree 0670f9eb): precheck PASS (0 FAIL, 2 WARN), build PASS. A
first try (with K #1981, the box loaded by four reviewers) failed only
precheck's `server-tests` 5-minute limit (sitting 25's Found, again).

## J2 #1984 (5645), #1986 (5646), #1987 (5647): the tests'

Card check: each changes one `tools/qa/mp/*.mjs` and `status/J2.md`;
tags in J2's second block. Stacked (each merges the one before; #1984
merges main). #1984: the daily card under the journal's "Daily" pill.
#1986: the finger waits for a button to hold still; the Orders tab asked
up to 3 times (its three Try-again checks stay red: the test's counter,
the page does re-send, farmBus.js:123; settled). #1987: the great one's
death watched until gone (8 s at most); stands beside an ordinary rotcap,
90 s for its spit.

## R #1980 (5296): the world's sum reads each leg's stamp

READY with lows. The four lows of review-z25 are mended, each against the
code that writes the stamp: a listing's goods gone once
`store:<id>:goods|refund` is on file (store.js:1062, :1141); a trade
window's `trade2:<sid>:wpndeliver|wpnrefund:<pid>:<seq>` (trade2.js);
`settle:<id>:item` read for a buy order too (market.js:649); the spec says
why there is no switch. worldsum.js only reads: no stored shape, no flag,
no cap. Live callers (liveops.js:445-468) pass gold only: the deploy
changes no live count. weapon-id 34/34, world-sum 37/37, storm 53/53,
rewind 40/40, restore 41/41; deleting the `wpnrefund` check or the buy
branch fails §8. Lows:
- worldsum.js:120-125: the stamp also hides item, gear and pet goods, but
  §8 tries only a weapon (a gate narrowed to weapons still passes);
- worldsum.js:108: a buy order's `settle:<id>:back` leg (market.js:726)
  is not read: a false `dup = 1` between the leg and the delete (test-only);
- worldsum.js:128: a store listing's gold, `sale.paid && !sale.goldPaid`:
  nothing writes `goldPaid`, so it is counted twice between the
  `store:<id>:gold` credit and the delete (the gold twin of low 1; add it
  to R's Found beside the buy order's escrow gold).

## T #1978 (5311): `pageAddress()`

READY with lows. 0ab177bf merges main; its one conflict (#1970's
`OUTSIDE_LINE`) resolved to 172 (201 - O's 12 - T's 17), the count the
guard makes on the merged tree. A fresh pass: the address raw, not
decoded, `''` with no page; every site caches where it did; no worker
imports a moved file; 26 suites importing the moved modules green. Lows
(T's next PR): switch-table.md "seventeen reads in fifteen files" (it is
sixteen); wheelTrial.js:342 `let search = ''` then reassigned.

## O #1985 (5231): the memory's axis and the caches' knob

READY with lows (47e87551 merges main; only `status/O.md` conflicted).
Eviction is safe: a halved cache drops through the deferred
`_maskedDrop` (destroy 30 s later); `_peerMaskedFrame` checks
`source.destroyed`; your own worn set (177) stays under 450; an evicted
gear canvas has no reader that keeps it. The chip count is read only
without fine input (report.js:101). #1974's lows mended: a peer's arrow
copy steps by `combatDt` (visualSystems.js:307); §9g calls `combatDt`;
the step is `_stepCapMs() * 3 / 50`. report 115/0, frame-clock 28/0,
frame-pacer 133/0, off-ramps 10/0, worn-bake green. New: `MEM_LINES`
(art 79.3, gpu 115, sound 22 MB, held equal to memory-budget.mjs by
§23a), `MEM_READ_MS` 5000, `AXES.mem` (caches 0.5, crowd 1, crowd 2), the
`caches` knob live (only `?govern=0` stops it); a kept rung saved before
resets to its row once. Lows (O hands them to the planning session):
- framePacer.js:201 evaluates `memFull(ts)` even with the governor off,
  so a phone calls the "probe only" `__btGpuTex()` (pixiApp.js:471: every
  chip texture and the asset cache walked, sorted twice) every 5 s;
- sound over its line (`memOver`, framePacer.js:351) takes the axis to
  crowd 2, and no rung lowers sound: players hidden while it stays over.
  A design question (sound out of the verdict, or a rung of its own);
- a halved frame counts until its 30 s destroy, so a full memory steps
  caches, crowd 1, crowd 2 in about 16 s (§15: 3 steps in 12 verdicts).

## O #1991 (5681): #1985's three lows, mended

READY. Stacked on #1985 (58f81332 merges 47e87551). The memory's count is
read only while the governor judges (`gov.judging()`, framePacer.js:201);
sound is out of the verdict (`MEM_LINES` art and gpu only; the planning
session's word: no rung lowers sound, a sound rung is later work); a
memory rung waits `MEM_SETTLE_MS` 35 s, past the 30 s deferred destroy.
frame-pacer 135/0, report 115/0; O: questline + memory-budget 198/198.

## P #1988 (5571): the hair probes read your own hair

READY (late arrival, 1 line). `_lastHairDisplay` is set where the local
player's hair is placed, not in `_orderHairOverHat` for every figure: the
probes `__btHairOrder` and `__btCapeHair` read only it. QA only. Low:
`status/P.md` on the branch still says 5570, `done`.

## K #1989 (5195): every other value request at the wire door

#1983 as reviewed (fc457d8c) with main ee235aaa merged, free of #1981;
it differs from that merge only in `status/K.md`. READY with the low
below. #1983 is closed as replaced.

## K #1981 (5546) HELD (K's mend 2b1eda83 came late: sitting 28)

#1981, MEDIUM: the page's new re-send (actions.js:554, once after 1.5 s on
a failed fetch or a 5xx) can sell a second weapon after a Durable Object
restart. A sell that matches at once leaves no resting order: its repeat
is known only in memory. Tried: A holds 3 axes, B two buy orders;
`market/place` stashIndex 0, `rq-rs-1`, matches (stash 3 -> 2); restart;
the same body and id answers `{ok:true, matched:true}`, stash 2 -> 1.
req-once.md:73 ("nothing is sold twice") is false when the stash holds
another weapon at that index. Mend: the matched sale's record keeps the
`reqId`, checked in `_mktPlaceOrder` (market.js:275); or `market/place`
off the re-send. Low: `arena/join` is re-sent (actions.js:447) but the
worker's column is `reqId:'state'`: a lost answer's re-send reads
"Already queued" (gladiator.js:357) as an error while the player is
queued (no second fee).
#1983/#1989 READY with a low on its own (fc457d8c, clean on main).
Low: door entries share
the 32-slot `_reqSeen` list with the market's and store's answers and are
kept even when refused (reqonce.js:76, KEEP :35): 32 door messages push a
route's answer out (tried: a second weapon sold after 32 bad
`fish_inspect`). With #1981's re-send this widens the medium.
New with #1981: the cap `reqid` (join.js:1973; off with `reqonce:false`).
