card: K
branch: claude/plan-k-<n>-<topic> (one branch a PR, each begun from main)
prs: #1822, #1820, #1826, #1829, #1831, #1838, #1842, #1861, #1848, #1899, #1923, #1900, #1931-#1934, #1942, #1949, #1972 merged; 5194b this branch
state: working

## Done

- PRs 1 to 7.6 (5181-5192): merged; the census 203 -> 4 sends, 0 fetches;
  the 4 (`nmlAsk.js`, `LoginSpinWindow.jsx`) after T's #1863.
- Claims 5540 (#1842, `arrowlane` ON), 5541 (#1848, the sprint mark OFF).
- 5542 (#1899): chat lanes for MOD. RT-1: N10 (5543, #1923, `relaybytes`),
  N11 (5544, #1942, `heapforget`), N5 (5545, #1949, `roomceiling`).
- #1972 5194 (`reqonce` ON, `reqstamp` OFF, merged): a repeat acts once on
  the market, the store and its offers, the bank, chest, cape and spin
  (reqonce.js; req-once.test; cost-guard §22). The planning session's
  split: the held files wait for 5194b.

## Next

- 5194b (this branch): the `reqid` cap, the door's one re-send, http.js's
  rows (+ `mktwords`), SHAPES part 2; sitting 25's mends (a first that
  threw kept; both ids' stamps; the bank's opId); req-once 37.
- Card K's PR 9 entry (cards/K.md) still lists 5194b's parts: the planner's.
- Then 5196, 5197. The move's walls; the sword's reach; the bow claim.

## Found

- `clan_war_kill`/`clan_war_end` sent for an older worker (`legacy` rows).
- A kept quest hand-in gets a fresh request id on its rejoin send.
- One sprint step's bill is capped at 1 s (STEP_MAX_MS), on or off.
- A sell order's tierKey is the seller's claim, not the escrowed weapon's.
- After a reconnect admin's lastStrike/arrowBlast read null (#1942).
- #1949: a socket at 95/s is never closed (550 drops / 10 s < 600), and
  the full room's 33/s share sits at a crowd fight's 35-40/s: the owner's.

## Needs

- The owner: `reqstamp` (a lasting stamp row a request with no record of
  its own: a store buy, a cancel, an offer; pruned at 48 h): on or off.
