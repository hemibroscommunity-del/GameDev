card: K
branch: claude/plan-k-14a-reach (5548, the second block 5540-5559)
prs: #1822 to #1989, #1981, #1997, #1999, #2006, #2003 merged; open: #2013 (5198), #2014 (5199)
state: ready

## Done

- PRs 1 to 7.6 (5181-5192); claims 5540 (`arrowlane` ON), 5541 (sprint
  mark OFF); 5542 (MOD's chat lanes); RT-1 N10, N11, N5 (5543-5545).
- 5194, 5194b, 5195 (`reqonce` ON, `reqstamp` OFF), 5196 (`gidnames` ON),
  5547: a repeat acts once; a weapon named by its id (sitting 30).
- 5193 (#2006, `sendcount` ON): the send door, census 150 -> 93; 5197
  (#2003): the words rule (sitting 31).

## Next

- 5198 (13, batch 1): every file no card holds through the door, 93 -> 28
  (origin.js's refusal outside a room: `sendOutside`). 5199: the 28 left
  (L's and R's files, their doors merged): census 0, for the gatekeeper.
- Then the second block: the claims tightened (14).
- wsClient.js: done for good (told L). index.js, combat.js: 13 and 14.

## Found

- A kept quest hand-in gets a fresh request id on its rejoin send.
- One sprint step's bill is capped at 1 s (STEP_MAX_MS), on or off.
- A sell order's tierKey is the seller's claim, not the escrowed weapon's.
- #1949: a socket at 95/s is never closed (550 drops / 10 s < 600), and
  the full room's 33/s share sits at a crowd fight's 35-40/s: the owner's.

## Needs

- The planner (14, the sword's reach): the reach alone does not lower the
  gain (the liar's kills at reach 400/250/180/130: 46/99/83/71, the
  honest 17): its take is the cadence, a hit a monster every 210 ms (the
  lane) over a swing every 600 ms. Tighten the cadence too (a sword's
  swing a player, its targets in one swing together), or reach only?

- The owner: `reqstamp` (a lasting stamp row a request with no record of
  its own: a store buy, a cancel, an offer; pruned at 48 h): on or off.
