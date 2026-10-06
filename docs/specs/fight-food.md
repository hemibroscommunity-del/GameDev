# Food that counts in a fight (v2.3.3108)

The owner, on what farming is for: *"Farming needs a purpose. I think the best
purpose it can serve are temporary buffs (boss fights, PvP, dueling, etc) and
source of income."*

The farm's meals and brews (docs/specs/meals.md) were real buffs against
monsters. In a fight with another player, or in a big boss burst, they did
less than they said, or nothing. They also had one hole: in a duel, whoever
carried more food won. This change fixes all of that. It adds no new food;
the meals and brews you can make already cover the fight roles. See "Not in
this change" at the end.

## What was wrong

| What | Before | Why |
| --- | --- | --- |
| A damage brew (Fury Tonic x2, Firebloom Tea x1.2) in a duel | Only the plain swing and the plain shot got it. The bow volley and the staff special never did. | A duel hit is a number the page claims, which the worker clamps. Only some of the page's claims had the brew folded in. |
| A special *swing* in a duel | Clipped to about a third of its size | The swing never said it was a special, so the worker held it to the plain swing's ceiling. |
| Element Burst under a Fury Tonic | Clipped by up to a quarter | The burst's ceiling was worked out for the cooked food's x1.2, not a brew's x2. |
| The Root Stew (5% less damage taken) | Did nothing to any hit under 20, which is most monster hits and every duel hit | It was `ceil(hit x 0.95)`: 19 x 0.95 = 18.05 rounds back up to 19. |
| Eating in a duel | Three Garden Stews in three taps put you back at full | Nothing limited a heal you eat at once. The duel's own rule (no healing over time in a duel) meant nothing. |

## What it does now

### 1. A brew is the worker's, in a duel too

- The damage brew's multiplier is read in **one place**, `combat.js _brewMul`:
  - 1 with no brew;
  - the cooked food's 1.2 when the brew has no number of its own;
  - otherwise the brew's own number (bounded 1 to 4).

  The monster roll, the duel lane and the burst's ceiling all read it.
- Against a worker that advertises **`caps.pvpbrew`**, the page claims every
  duel hit **without** its brew and marks it **`nb: 1`**.
  - The worker clamps the claim as always, then multiplies it by the brew
    *it* holds (`_resolvePvPAttack`).
  - So every attack gets the brew: swing, shot, bow volley, staff special and
    retreat shot.
  - It counts only while the worker's own timer runs.
  - It is applied *after* the clamp, so a Fury Tonic is never clipped.
- **How the page claims it.** Every shot remembers the brew it was fired
  with, as `brew` on the projectile. `src/game/fightFood.js pvpClaim` takes
  it back out only when the worker will put it back. Against an older worker
  the page folds the brew in, as it always did.
- A special swing sends **`special: true`**, as special arrows and bolts
  always did. Every worker already reads that field.
- The page's own numbers for a special now carry the brew too, as the
  worker's roll always did. Before, a Fury Tonic doubled your swings on
  screen but not your specials.

### 2. Element Burst has room for a brew

- The burst's ceiling is now the ordinary ceiling x the brew (`burst.js`).
- This is the same reasoning as fracture: the ceiling bounds what the
  attacker *claims*, and the brew is the worker's own timer.

### 3. The Root Stew cuts small hits too

- The 5% is now a chance on the fraction.
  - Example: a 19-damage hit is 18 nineteen times in twenty and 19 once.
  - So every hit loses exactly 5% on average, at any size.
- The floor is still 1.

### 4. One bite at a time in a fight with a player

- A heal you eat at once is limited to one every 15 s (`PVP_HEAL.GAP_MS`).
  The heals are the Garden Stew, a cooked fish and the old minnow bottle.
- The limit applies while you are:
  - in a duel, or
  - within 10 s (`PVP_HEAL.WINDOW_MS`) of a hit between you and another
    player, either way.
- The 15 s count from your last such heal, wherever you ate it.
- Never limited:
  - fighting monsters;
  - the half-hour meals and brews, which are not heals.
- The worker decides (`cooking.js _pvpHealWait`):
  - It refuses an early bite with the usual resend, so the bag and HP go back
    on the phone.
  - It stamps `_pvpAt` (combat.js, on every exchange that sends a `pvp_hit`)
    and `_healAt` (each of the three heals).
  - Both stamps live in memory only (handoff rule 11). A deploy or a rejoin
    lets one extra bite through, which costs nothing.
- The page holds its own bite back and says **"Eat again in Ns"**.
  - It does this only against a worker that advertises **`caps.pvpheal`**.
  - It tracks the same clock from the same `pvp_hit` event, plus `S._inDuel`.
  - It uses the same numbers (mirror-audit).
  - Wired at every eat button: the bag, the Cookhouse, the old bag panel and
    Drink on the minnow bottle.

## Deploy order (rule 19)

| | Old worker | New worker |
| --- | --- | --- |
| **Old page** | as before | Claims carry the brew and no `nb`, so the worker never multiplies them. The worker's eating rule applies (refused bites are resent). |
| **New page** | No `caps.pvpbrew`, so claims carry the brew as before (now on the specials too). No `caps.pvpheal`, so the page never holds a bite back. | As described above |

Nothing is ever multiplied twice: `nb: 1` is sent only with a brew-free
claim. The phone test checks that each hit is exactly 2x a claim *and* that
the claims did not double.

## Kill switches

- **`pvpbrew: false`**
  - Un-advertises the cap, so a new page claims the old way.
  - Makes the worker stop multiplying `nb: 1` claims from pages that joined
    before the switch.
- **`pvpheal: false`**
  - Un-advertises the cap, so the page stops holding bites back.
  - Lifts the worker's rule.

## Tests

- **`server/test/fightfood.test.mjs`** (80 checks) covers:
  - the multiplier's every case;
  - `nb` multiplied after the clamp, and only `nb === 1`;
  - the worker's clock, not the page's;
  - the kill switch;
  - both sides stamped;
  - the stew's averages at 10, 19, 1 and 100;
  - the eating rule: stew, fish, bottle, meal, brew, the window, a duel,
    monsters, the kill switch and a real hit;
  - the caps;
  - the page's half (`fightFood.js`): its multiplier agrees with the
    worker's in every case, a claim taken apart and put back is the brewed
    hit exactly once, and the bite timer works.
- Fourteen mutations of the worker's rules, each caught.
- **`burst.test.mjs`**:
  - Its "every multiplier on" stack never had its damage buff switched on
    (`ps.buffs` instead of `ps._buffs`). It does now.
  - A Fury Tonic burst is driven through the real cast. It must land past
    the ordinary ceiling and never past the ceiling x the brew. Breaking the
    widening fails it.
- **mirror-audit**: `PVP_HEAL` on both sides.
- **`tools/qa/mp/mp-fightfood.mjs`** (19 checks) runs two players in a real
  duel:
  - every hit is exactly 1x a claim with no brew, and exactly 2x under a Fury
    Tonic, with the claims the same size;
  - a special swing says `special: true`;
  - the first stew heals, the second is held back with "Eat again in Ns", and
    the worker never eats it;
  - a page that eats anyway is refused, and its stew is put back.

  Two client mutations (the brew not taken out of the claim, and the bite not
  held back) each fail it.

## Found, not changed

- **Duel crits are about 100x too rare, and ranged duel hits never crit.**
  - The swing sends `critChance` as a fraction (0.08 means 8%). The worker
    reads it as a percent (`Math.random() * 100 < critChance`), which makes
    it 0.08%.
  - Shots send 0.
  - Fixing it changes duel balance, so it is the owner's call. The fix is
    small: send percent, or read a fraction under a new cap.
- The Pumpkin Pie's +10% is on combat XP from damage (prog3), as written.
- `_buffs.hp` is written by an old recipe path and never read.

## Not in this change

Two new fight meals were considered:

- an elemental-resist meal: shorter chills, burns and poisons in boss fights;
- a stamina meal: faster stamina for blocking and sprinting in duels.

Each needs a crop or herb, a recipe, art and the owner's numbers, so they are
offered rather than built.
