card: K
branch: claude/plan-k-14d-ontoday (5551; the second block 5540-5559)
prs: #1822 to #2006, #2003, #2013, #2014, #2018, #2021, #2023 merged; open: #2024 (5551, this branch)
state: ready

## Done

- PRs 1 to 7.6 (5181-5192); claims 5540 (`arrowlane` ON), 5541 (sprint
  mark OFF); 5542 (MOD's chat lanes); RT-1 N10, N11, N5 (5543-5545).
- 5194, 5194b, 5195 (`reqonce` ON, `reqstamp` OFF), 5196 (`gidnames` ON),
  5547: a repeat acts once; a weapon named by its id (sitting 30).
- 5193 (#2006, `sendcount` ON): the send door; 5197 (#2003): the words
  rule; 5198, 5199 (#2013, #2014): every send through it, census 0.

## Next

- 5549 `movetop`, 5550 `bowshot` (3.3 -> 1.60; OFF) merged. 5551 (this
  branch): `swordswing` and `movetop` ON (the owner, 2026-11-17: "Go
  recommended"). The bow's reach tried: no gain past the spread. Next: the
  harvest's grade (1.86), the cook's result (1.59).
- Later (the planner): walls on the worker (the Wheel's coast): a new
  system and worker memory, for when real players come.
- wsClient.js: done for good (told L). index.js, combat.js: 14 still.

## Found

- A kept quest hand-in gets a fresh request id on its rejoin send.
- One sprint step's bill is capped at 1 s (STEP_MAX_MS), on or off.
- A sell order's tierKey is the seller's claim, not the escrowed weapon's.
- #1949: a socket at 95/s is never closed (550 drops / 10 s < 600), and
  the full room's 33/s share sits at a crowd fight's 35-40/s: the owner's.

## Needs

- The owner: turn on `bowshot` (a cheat's bow 3.3 -> 1.60; honest play the
  same with it on)?
- The owner: `reqstamp` (a lasting stamp row a request with no record of
  its own: a store buy, a cancel, an offer; pruned at 48 h): on or off.
