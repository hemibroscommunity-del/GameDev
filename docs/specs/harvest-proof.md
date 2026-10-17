# A harvest is paid against its own start (v2.3.3322)

> The owner, 2026-10-17, to "Want me to merge #948 and then start on the bot
> farming holes?": *"Yes"*.

This is fix 6 of the anti-bot review (docs/specs/antibot-review.md, "What to
do, in order"), its CRITICAL farming hole.

## What was wrong

A harvest is two messages from the phone:

1. `extraction_start` when you tap the node. The server writes down when it
   began, rolls the hits (`gather_hits`), and works out the earliest the
   gesture can finish.
2. `node_strike` when the gesture is done. The server pays the ore, log or
   fish.

The server checked the strike's timing only when its record named the same
node:

- **No record at all:** paid with no timing check. This branch was kept for
  phones from before v2.3.229. Every phone has sent the start since v2.3.1704,
  so only scripts used it.
- **A record for another node:** paid untimed, and not even counted.

In the bot lab, a script that skipped the start mined obsidian at 3,930 ore an
hour. An honest miner gets 81 (73 in this run). Only the 2,400-an-hour cap
stopped it.

## What it does now

- **A strike is paid only against its own start, after its hits.** The timing
  check is the same as before (`too-early` one beat early).
- **A strike with no start of its own** (none, or one for another node) is a
  *recovery strike*: paid, untimed, **once every 10 minutes per player**
  (`HARVEST_PROOF.RECOVER_MS`). Any other is refused: `no-start` or
  `other-node`.
- **A refused strike leaves the node standing.** The node's state is sent again
  (at most every 2 s per player, `DIRTY_MS`), so the phone that already showed
  it falling shows it standing, and you can harvest it properly.
- **A refused strike is evidence** (botfp.js `_botfpOnStartless`): counted as
  `startless` in the player's bot record, and flagged
  `strikes-without-start` at 20. An honest phone's recovery strike is paid, so
  it never counts.
- **A strike with no gesture fingerprint can't claim "perfect"**. It's paid
  "good" and counted `noFpPerfect`. Every real perfect comes off the gesture,
  which writes the fingerprint in the same step (ExtractionSwipeLayer.jsx).
  Perfect doubles a mining yield and the XP of every harvest.

### The two honest cases this keeps working

- **A connection that drops mid-harvest.** The phone replays the strike that
  went down the dead socket once it rejoins (wsClient.js `_holdForRejoin`,
  v2.3.3034). The server used to delete the record when the socket closed. It
  now keeps it, so the replayed strike is timed against it like any other.
  The 10-minute sweep still clears it (`EXTRACTION_TIMEOUT_MS`).
- **A room restart (a deploy, at every merge that touches `server/`).** The
  records live in memory and die with the room. Each player's first strike
  after it is their recovery strike. The room forgets the 10-minute clock too,
  so everyone has one.

What a script can still get untimed: six harvests an hour.

## Measured (the bot lab, one simulated hour each)

`node tools/qa/load/bot-lab.mjs 60 --only=...`, main against this branch:

| Scenario | Before | After |
|---|---|---|
| honest pine (Woodcutting 1) | 378 paid | 378 paid |
| real messages, struck the moment allowed | 1,050 | 1,050 |
| no start, the same fingerprint | 1,072 (flagged for the replays, paid) | 6, flagged |
| no start, no fingerprint | 1,072, never flagged | 6, flagged |
| no start, a fresh human-looking fingerprint | 1,066, never flagged | 6, flagged |
| honest obsidian (Mining 15) | 53 strikes, 73 ore | 53 strikes, 73 ore, no flag |
| obsidian, no start, moving by bundles | 2,400 (the cap), 3,770 ore, never flagged | 6, 12 ore, flagged |
| a start on one tree, the strike on the next | paid 2 of 2 | paid 1 of 2 (its recovery) |

"Flagged" after is `strikes-without-start`: every refused strike is counted in
the player's bot record (`startless`), and 20 of them raise the flag.

The second row (1,050) is the review's next point. It is a script sending the
real messages and skipping the 1.5 s gesture. That's 2.8 times an honest hand,
because the six commons pines are its limit, not the clock.

## Safety

- **Kill switch:** `harvestproof: false` in the live flags. The old permissive
  strike and the old perfect, at once (`_harvestProofOn`). The record still
  outlives a socket either way: that is only ever more honest.
- **Server only.** No phone change, no new message, no caps flag: an honest
  phone always sends the start, and a refused strike's node comes back by the
  tick it already reads.
- **Not built:** a per-node memory of rolled plans (the REUSE_MS note in
  gathering.js). Rolling a few plans of one node again and again buys a script
  a few hits, never the 48x the retired branch did.

## Tests

- `server/test/harvest-proof.test.mjs` (43 checks):
  - a strike against its own start, and one beat early;
  - no start: the recovery, the refusal, the node left standing and sent
    again, the clock;
  - another node's start: refused, its own record kept and still paid;
  - the record through a dropped socket and a rejoin, timed, no recovery spent;
  - a room restart;
  - perfect with and without a fingerprint;
  - the kill switch and its name;
  - the sweep;
  - a script hammering refused strikes: the node sent again once, every
    strike counted, one flag.
- Eleven deliberate bugs, each caught by the suite.
- TRAPS §202: a lenient branch for old phones is only ever used by old phones.
- All 138 server suites pass.
- `mp-recoverpay` (28 of 28, a phone against a real worker): every way a
  session comes back still pays its chop -- the renderer rebuilt, the
  recovery reload, a graphics context lost, the idle logout, and a strike
  lost in a dead pipe and replayed after the rejoin.
