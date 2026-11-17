# The sword's swing and reach (v2.3.5548)

Grand plan step 4.2, the sword's reach; card K PR 14. The switch
`swordswing` landed OFF (v2.3.5548) and is **ON** since v2.3.5551: the
owner, 2026-11-17, *"Go recommended"*. `swordswing: false` in the live flags
is its kill switch.

## Why

The claims bench (`claims-gain.test`, the row `reach`) measured a cheating
sword at 2.96 times an honest sword's kills an hour. The worker believed:

- a sword hit on a monster up to 400 px away (`PVE_MELEE_RANGE`);
- a hit on EACH monster every 210 ms (the per-monster lane), where an
  honest sword swings once a cycle (600 ms, less the Speed stat);
- a sword claim that says "don't shove the monster" (`noKb`), which no
  page's sword ever sends.

The reach alone was not the take. A cheat held to 250 px killed more, not
less, because it stopped spreading its hits over far monsters.

## What it does, with `swordswing: true`

`server/src/swordswing.js`, called from `combat.js` `_handleMonsterDamage`:

1. **The reach.** A sword claim on a monster lands from at most 150 px of
   the worker's own copy of the player. An honest swing lands at 81 px at
   most on every disturbance of the bench. 150 allows the blade's ring
   (72 px), a monster's body, and the network's lag.
2. **The swing.** A player's counted swings come at the sword's own rate:
   one a cycle (`freeswing.js` `_fsCycleMs`: 600 ms less the Speed cut,
   never under half). They are drawn from an allowance of two, so two claims
   the network brought closer together than they were swung both land. A
   swing's other targets come within 150 ms of its first claim, each once,
   24 at most. A claim sooner is dropped quietly and counted as `swing` in
   the hit proof's tally.
3. **The shove.** A sword claim's `noKb` is ignored: the monster is shoved,
   as for every page's sword.

Left as they are: a paid special swing, the lunge, a phone on the free-swing
trial (its swings are already prorated by time), a test-mode character, and
every bow and staff claim. Nothing is stored: `_ss` lives on the player's
state in memory.

## The numbers (claims-gain.test 2d)

| | Off (today) | On |
|---|---|---|
| The honest sword, kills an hour | 360 | 360 (no refusal on any disturbance) |
| The sword's own claim (its cheat at an honest walk) | 2.87 | **1.38** |
| The whole cheat (it walks at the move's bound, 480 px a second) | 2.96 | **1.42** |

The bar is 1.5. What the whole cheat keeps over the sword's own claim is
the move's claim, the next judge.

## Switch

ON by default (v2.3.5551). `swordswing: false` in the live flags puts the
sword back as it was (400 px, the 210 ms lane, `noKb` believed).
