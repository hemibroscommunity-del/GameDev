# The lock's pick: the nearest, and the stick between close ones (v2.3.6820, card LOCK)

The owner (the only player, an iPhone, the usual touch controls), 2026-11-26:
*"I'm often running into an issue where it will lock on the wrong target. I
think it should go towards the nearest enemy or at least let you switch to
nearest enemy."*

## What it does

With the sword out in mode 4 (no `?manual=`), the automatic lock is the
only lock. `src/game/targeting.js` `updateTargeting` finds the candidates
(the ring: 440 px; a held lock kept to 550), and `src/game/lockPick.js`
`lockPick` picks the one that has the lock, in this order:

1. **The stick chooses between close ones.** When the two nearest are
   within 25% of each other (`TIE` 1.25, of the NEAREST one's distance) and
   the stick is pushed past `PUSH_MIN` (0.2 of its travel past the 12 px
   dead zone), the near-tie nearest the push's direction takes the lock at
   once. It never picks one outside the ring, one more than 25% farther than
   the nearest, or one behind the push (`PUSH_FRONT`: the bearing within
   90 degrees). The choice lasts while the stick is pushed.
2. **Near means near.** Inside the sword's reach, the nearest always has the
   lock. A rival takes it once it has been the nearest for `DWELL_MS`
   (120 ms, on the clock) without a break. A held lock outside reach gives
   way to one inside reach at once.
3. **Outside reach**, the old step: a rival takes the lock when it is 12%
   nearer (`FAR_STEP` 0.88).

With no lock held, the nearest is taken at once. The stick at rest changes
nothing: the pick never reads the facing.

**The reach** (`reachHas`) is the swing's own sum, the one the hit test, the
reach ring and the reticle use: `GS_OUTER_RADIUS` (72) x `meleeRangeMult`,
plus the monster's hit radius x a boss's size, measured to its BODY CENTRE.
To that it adds the lunge's dash (48 = `LUNGE_DASH_FRAMES` 8 x
`LUNGE_DASH_PX_PER_FRAME` 6), because the lock feeds the lunge. A clone or a
foe counts as a player's body (23 px up, 24 round). "Nearest" is still
measured to the feet (`monPos`: renderX/renderY), as before.

`?locknear=0` is the old rule whole: the 12% step at every distance, with no
dwell and no push.

## Why these numbers (the census)

`node tools/qa/lock-census.mjs` (3,000 made-up fights of two to eight
monsters, 20 s each at 60 fps; seed 7) counts how often the lock is off the
monster nearest the feet:

| rule | off the nearest | of it, not the stick's choice | nearest inside reach | spells: median / 90th |
|---|---|---|---|---|
| old (`?locknear=0`) | 10.8% | 10.8% | 9.4% | 100 / 467 ms |
| new | 8.3% | 6.4% | 6.9% | 133 / 183 ms |

- The old rule's misses were almost all (99.9%) the 12% step. The 440 to
  550 hold caused 0.1%.
- The census showed two parts of the first reading harmful, so they changed.
  - **The push only chooses among ties in front of it.** In mode 4 the walk
    IS the push, so walking away from a chasing pack turned the lock by the
    walk among monsters all behind you: 85% of the stick's choices.
  - **The push's choice is not kept after the thumb lifts.** A keep held
    every walk's accidental choice: 14.3% off the nearest with it, 8.3%
    without.
- **The measuring point**, reported and not mended: in 22.8% of fight
  frames the monster nearest by its feet is not the one whose drawn body is
  nearest (a tall mummy or skeleton, a wide snowman, a boss). The lock still
  orders by the feet. A change would be its own card.

## Not this rule's

- Tapping a monster to lock it: off since v2.3.4396, the owner's own.
- The bow and the staff: no automatic lock in mode 4.
- Mode 5's sight (`sight.js`, `latch.js`).
- The server's `targetId` checks.
- How the lock is drawn.

## Its tests

- `tools/guards/lock-pick.test.mjs`: the scenes. The card's six dodges and
  seventeen more mutants are planted in a copy of the module, and each one
  is seen red on every run.
- `tools/qa/mp/mp-locknear.mjs`: the phone, with two stand-ins.
