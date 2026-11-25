card: CT
branch: claude/plan-ct-14-shield (part 20: the shield that stays up; job 2, Charge in a player fight)
prs: part 20 (6554, draft on main: the shield drop + Charge for monsters), part 18 (6551 if job 2, the join, draft on main), #2344 (6550, done: in the join), #2342 (6549, done: in the join), part 15 (6548, draft on claude/plan-ct-8-freefire), #2340 (6547, draft on main), #2282 (6540, merged), #2293 (6541, merged at 60), #2308 (6542, held at 60: mended), #2327 (6543, ready), #2330 (6544, draft, main 598cfd38 in), item 6 (6545, draft), item 7 (6546, at the gate)
state: working

## Done
- PRs 1-5 (6540-6544), items 6-8 (6545-6547), parts 15-18 (6548-6551): on
  main or in their PRs (git log; their specs).
- Part 20 (6554): the owner's "shield ... stays like it's showing up even
  when the energy has been exhausted". The worker breaks the guard at 0
  stamina (3 s latch), saying so only by the stamina; the phone's own drop
  sat behind BroTown's BLOCK_COSTS_STAMINA (false on purpose). Now
  guardBreak.js poolsLand/followWorkerGuard where the pools land (wsClient
  player_state): down at once, the button's cooldown the worker's 3 s
  (owner's list §10 Q1, Q4). mp-shielddrop (red on main, both modes),
  guard-break-page.test (mutants, none left). No server file.
  Job 2: no Charge while a duel, a match or a player lock holds you
  (controlVisibility.js playerFightHoldsLock; sight.test 8).

## Next
- #2342 (6549): the helper's clean mp-twobuttons run; the owner plays the arc.

## Found
- Part 20: a blocked blow breaking the guard on the regen's own tick is
  refilled before the flush (tick.js: regen, then flush): the phone reads 7,
  not 0, and keeps that break drawn (~1 in 30). A worker change: not built.
- Part 20: mp-shielddrop's walk-in ended 270-364 px off a wandering monster
  here: no real blow in the latch (step 5 a note). mp-twobuttons on this
  branch: shield steps green; 2b, 2c, 6a (the tap, the latch) and 3h (Charge
  dashed, its distance unread) red, none in the files this PR touches.

## Needs
- Approved: the two OWNED rows (stickX, stickY; #2290 is in `main`); PR
  1's mechanical rows; PR 2's frame-steps WANT; the ledgers' machine rows.
