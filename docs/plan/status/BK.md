card: BK
branch: claude/plan-bk-3-claimsbar (on claude/plan-bk-5-pieces, on claude/plan-bk-2-restart)
prs: #2278 6460 (merged), #2281 6461 (ready), #2289 6464 (ready), #2299 6462 (ready)
state: ready

## Done

- 6460 (PR 1): world-sum fails a road its handlers never ran. Merged.
- 6461 (PR 2): chaos-restart §7, the sweep made from VALUE_PAUSE (14 rows),
  judged by unexplained(). Plants B1, B4, R2 red. Ready (#2281).
- 6464 (sitting 56's Found on #2278): world-sum §1 counts the pieces the sum
  holds by id at every step. Plant E1 red. Ready (#2289).
- 6462 (PR 3): claims-gain's bar, honestly. A PR runs one seed's gains (about
  22 s); `--whole` (the gatekeeper's new `claims` step) runs the six seeds and
  every disturbance. 3b judges the worst gain over the seeds run against 1.5;
  over it, a KNOWN row (only falls) prints KNOWN, never PASS. KNOWN: reach
  1.92 (seed d), freeswing 1.75, staff 2.97, harvest 1.57. The reach plant
  now doubles `_swordReach` (plant C1): red on one seed (1.96 > 1.92) and six.
  New rows: the liar whose join says `fs: 1`, and the staff (honest caster and
  liar bots in claimbots.mjs). No rule of combat changed.

## Next

- PR 4 (6463): `fee`, `hold`, `pace` in playerroads.js marked "not wired".

## Found

- The sword's reach over six seeds is 1.92 (seed d), not "about 1.55":
  finish.md part 9 call 5 says 1.55 to the owner (the orchestrator's file).
- The staff's judge (hitproof.js) lets a liar take 2.97x an honest new
  caster: its rate is the quickest build's (2 a second) against a new
  character's 900 ms bolt, and its reach is counted from where it stands.
- `escrow_debit_stored` (gold.js) looks unreachable from a handler;
  `escrow_item(_stored)` run only with `ahonewrite: false`.
- A crossing or sale a restart cut is finished at the first shop request
  after the wake (a pile on the ground is lost on one, by design).

## Needs

- Call 5 (the sword's reach) and a staff's-judge card: not this card's.
