# The gatekeeper's review, sitting 25 (card Z; tag 5663)

Taken 2026-11-17 on `main` 4751cb7 (sitting 24 merged, 18 PRs). The owner
asked for speed: the PRs in hand reviewed and listed now, one reviewer a
group of PRs that change the game (the seven angles of `/repo-review` in
one pass, each candidate tried before it is reported). Later arrivals go
to sitting 26. Tags here are written bare.

## Heads

K #1972 and MOD #1971 conflicted with `main` (refusal-door-list; SWITCHES.md
and status/MOD.md); each session merged 4751cb7 in and sent a new head.
R #1969, OPS #1975 and P #1976 merge clean as they are. One merge base at
every step down the list (`git merge-base --all`, step by step).

## R #1969 (5295): an arena share keeps its own bound

READY. Shares count against `SHARES_MAX` 128, other ids against `IDS_MAX`
32 (xfer.js `sideOf`); `xferIsShare` matches only `share:`, so no trade or
gift id can pass as one. Ledger only; arena rows still only under
`xferescrow` (OFF). xfer 45/0, econ-card 42/0, cost-guard 53/0. Lows:
- a match's stakes have no total cap (one a player, gladiator.js ~593):
  past 128 winners the row is `cut` and the shares no longer sum to the
  pool (the ledger's row only);
- `econcard.js` (outside the card, the planner's answer) filters with no
  switch: a read-only count.

## MOD #1971 (5630): the name rule's lows

READY. The refusal's words are fixed, keyed by `c.why` (nothing typed is
echoed), to that socket only, under `namerules`; mirror-audit holds the
words equal to the page's. The arena's bracket name is `_relayName` under
`namerules` (`/join` needs a live session, so the page's text is never
reached); flag off is main's. Lows:
- the rename's whole-look `player_update` (charname.js ~164) is not behind
  `namerules`, so `namerules: false` does not bring back `{name}` alone;
- arena.test checks the name with the flag on only.

## K #1972 (5194, `reqonce` ON, `reqstamp` OFF): a repeat acts once

READY. Answers keyed by player; `reqId` held to the door's `REQ_ID_RE`;
memory a `Map`, 32 a player, aged by heapforget; writes one synchronous
run; `reqonce: false` is main's; an older phone with no `reqId` as before.
req-once ALL PASS; cost-guard 55/0 (§22: `reqstamp` off 5 writes, as with
no id; on 6, the stamp row). For 5194b (the page's re-send), before it
ships:
- reqonce.js ~116 forgets a first try that threw, but the market's matched
  path (market.js ~471) throws after the sale is owed (escrow saved, settle
  note on disk): a re-send of the same id would sell again. Not reachable
  today (no page re-sends).
Lows: an order matched at once leaves no resting record (memory only over
a restart); the chest, cape and spin miss the old `opId` stamp across a
deploy; bank.js ~222 takes `reqId` as `last.opId` if a page sends both;
the store's bid, accept and offer reply and cancel have no test of their
own; the card's PR 9 line still lists the `reqid` cap, actions.js's
re-send, http.js's rows and SHAPES part 2, which moved to 5194b (K's status
and spec say so; the card line is not changed).

## R #1873 (5282): every weapon gets its own id (save shape 21 -> 22)

READY with lows; its own line, after the deploy of 1-3 is green (#1960,
the tolerant reader, deployed at 02:46 UTC, run 44003771631 on 8494bf9).
One `export const GID_RE` (gearprov.js:90). Migration 22 calls
`weaponIdsAll`: a second run gives nothing; an earlier failed migration
leaves the load unfinished. Every road a weapon reaches the bag by keeps
its id or mints one (mail claim, market unwind, trade stage, delivery
and refund, No man's land, loot, forge, quests, reveal): old mail or a
v21 escrow gets one id at the claim, never doubled. The shape number is
one constant (`newersave`, playerrestore.js:110). weapon-id 27/27,
weapon-reader 13/13, migrations, world-sum 37/37, stash-door 23/23.
Lows (the world's sum only, R's next):
- worldsum.js:103: `sale.goodsPaid` is never written, so a store
  listing's weapon counts twice between its goods stamp and the
  listing's delete (reproduced); check the `store:<id>:goods` stamp;
- worldsum.js:114: `trade2wpn:` the same after a delivery or refund
  stamp (reproduced);
- a buy order matched by a sell taker holds the weapon only in
  `settle.legs[0].weapon` (a miss); with `mktsettle: false` the
  sell-order guard double counts;
- no kill switch ("Switch: none"): a shape bump cannot switch back.

## OPS #1975, P #1976: status files

Card check only: each says `state: done`.

## Held

- O #1970 (5232): the card's "done when" (no knob's off-ramp read outside
  T's reader) is not met: `?sheen` (glint.js:515), `?lightfx`
  (lightFx.js:40), `?waves` (wheelWater.js:514) and `?stripslice`
  (zoneTextures.js:298) still read `location.search`, while drawLanes.js
  marks their readers `moved: true`. It also conflicts with `main`
  (switchScan.mjs, switch-reader.test: v2.3.5310's `READER_IMPORT`). Lows:
  `?lane=` (empty) no longer turns the governor off; `?crowd=abc` pins the
  crowd, which `crowdFromSearch` ignores.
- O #1974 (5233): BroTown.jsx ~4946 lets `_dtScale` reach 6 on the thirty
  lane; projectiles.js `_segGap`'s 200 px sweep cap (its header: 144 =
  24 x 2.0 x the clamp 3) and effectsRenderer's 260 px trail cap assume 3.
  On ~80 ms frames a range-2.0 arrow steps ~230 px: the sweep falls back
  to a point test and arrows pass through monsters. And `?dtsmooth=0` no
  longer means the old way (the clamp reads the lane's cap with the clock
  off). Players off the thirty lane: no change.
