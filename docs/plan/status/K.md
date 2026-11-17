card: K
branch: claude/plan-k-8-send-door (5193; one branch a PR, each begun from main)
prs: #1822, #1820, #1826, #1829, #1831, #1838, #1842, #1861, #1848, #1899, #1923, #1900, #1931-#1934, #1942, #1949, #1972, #1989, #1981 merged; ready: #1997 (5196), #1999 (5547), #2003 (5197); 5193 (this branch)
state: ready

## Done

- PRs 1 to 7.6 (5181-5192): merged; the census 203 -> 4 sends, 0 fetches;
  the 4 (`nmlAsk.js`, `LoginSpinWindow.jsx`) after T's #1863.
- Claims 5540 (#1842, `arrowlane` ON), 5541 (#1848, the sprint mark OFF).
- 5542 (#1899): chat lanes for MOD. RT-1: N10 (5543, #1923, `relaybytes`),
  N11 (5544, #1942, `heapforget`), N5 (5545, #1949, `roomceiling`).
- #1972, #1981, #1989 (5194, 5194b, 5195; `reqonce` ON, `reqstamp` OFF):
  a repeat acts once on every value request
  (reqonce.js; the wire door).

## Next

- #1997 5196 (`gidnames` ON), #1999 5547 (the door's own list): ready.
- #2003 5197: the words rule -- words.js, the mail's three
  sentences as templates (`noteT`), the page fills them; census line 3.
- 5193 (PR 8, never built; 13 waits on it): the send door, send.js
  `_send`; the ~55 helpers through it; counts ride the day's book (`send`,
  8 KB); census 150 -> 93; `sendcount` ON. Then 13 (5198, 5199).
- Then the second block: the claims tightened (14).

## Found

- A kept quest hand-in gets a fresh request id on its rejoin send.
- One sprint step's bill is capped at 1 s (STEP_MAX_MS), on or off.
- A sell order's tierKey is the seller's claim, not the escrowed weapon's.
- After a reconnect admin's lastStrike/arrowBlast read null (#1942).
- `wiredoor`'s listed wire-door.test FAIL 3 passed on main too: off its list.
- #1949: a socket at 95/s is never closed (550 drops / 10 s < 600), and
  the full room's 33/s share sits at a crowd fight's 35-40/s: the owner's.

## Needs

- The owner: `reqstamp` (a lasting stamp row a request with no record of
  its own: a store buy, a cancel, an offer; pruned at 48 h): on or off.
