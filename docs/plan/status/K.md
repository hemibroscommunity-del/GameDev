card: K
branch: claude/plan-k-13-sends-b (5199, on 5198 on #2006; one branch a PR)
prs: #1822 to #1989, #1981, #1997, #1999 merged; open: #2003 (5197, mended), #2006 (5193); 5198, 5199 (this branch): opened when #2006 merges
state: ready

## Done

- PRs 1 to 7.6 (5181-5192): merged; the census 203 -> 4 sends, 0 fetches;
  the 4 (`nmlAsk.js`, `LoginSpinWindow.jsx`) after T's #1863.
- Claims 5540 (#1842, `arrowlane` ON), 5541 (#1848, the sprint mark OFF).
- 5542 (#1899): chat lanes for MOD. RT-1: N10 (5543, #1923, `relaybytes`),
  N11 (5544, #1942, `heapforget`), N5 (5545, #1949, `roomceiling`).
- 5194, 5194b, 5195 (`reqonce` ON, `reqstamp` OFF), 5196 (`gidnames` ON),
  5547: a repeat acts once; a weapon named by its id (sitting 30).

## Next

- #2006 5193 (PR 8, never built; 13 waits on it): the send door, send.js
  `_send`; the ~55 helpers through it; counts ride the day's book (`send`,
  8 KB); census 150 -> 93; `sendcount` ON.
- 5198 (13, batch 1): every file no card holds through the door, 93 -> 28
  (origin.js's refusal outside a room: `sendOutside`). 5199: the 28 left
  (L's and R's files, their doors merged): census 0, for the gatekeeper.
- #2003 5197: the words rule; sitting 30's findings being mended.
- Then the second block: the claims tightened (14).
- wsClient.js: done for good (told L). index.js, combat.js: 13 and 14.

## Found

- A kept quest hand-in gets a fresh request id on its rejoin send.
- One sprint step's bill is capped at 1 s (STEP_MAX_MS), on or off.
- A sell order's tierKey is the seller's claim, not the escrowed weapon's.
- After a reconnect admin's lastStrike/arrowBlast read null (#1942).
- #1949: a socket at 95/s is never closed (550 drops / 10 s < 600), and
  the full room's 33/s share sits at a crowd fight's 35-40/s: the owner's.

## Needs

- The owner: `reqstamp` (a lasting stamp row a request with no record of
  its own: a store buy, a cancel, an offer; pruned at 48 h): on or off.
