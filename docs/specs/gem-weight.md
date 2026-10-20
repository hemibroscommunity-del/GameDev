# Every gem pulls its weight: "UP" made real, soak and shock (v2.3.3518)

This is **Phase 4** of `docs/GEM-PLAN.md`. On 2026-10-20 the owner said "All of
that sounds good" about the plan, which accepted every recommended answer,
including these two:

- **Decision 13.** "A soaked monster hits 20% softer. A hit on a shocked monster
  sparks to one more monster within 150 px, for a quarter of the hit."
- **Decision 14.** "Make it real: a gem that beats the monster's element hits
  25% harder. No penalty for a bad matchup, and 'DN' goes away."

Phases 1 and 2 (v2.3.3513, v2.3.3516) moved a weapon's gem onto the worker and
made gems from shards. This phase gives two gems an effect of their own and
makes the matchup worth something.

## Why

Before this phase:

- **Water and storm did nothing a player could see.** Their statuses (soak and
  shock) only set up a collision with a second element. With one gem in a
  weapon, they did nothing at all.
- **"UP" was only a word.** A hit by an element that beats the monster's showed
  "UP" over the monster, but did no more damage. Only a collision ever read
  the matchup table.
- **"DN" claimed something false.** It said a weak matchup hit softer, which no
  ordinary hit ever did.

## What a player sees

- **UP.** A hit whose gem beats the monster's element lands **25% harder**, and
  "UP" appears over the monster with the worker's own number. The elements
  form a wheel: flame beats frost, frost beats storm, storm beats stone, stone
  beats wind, wind beats venom, venom beats flora, flora beats water, and
  water beats flame. So each land's gem is strong against the next land's
  monsters.
  - A gem that loses the matchup hits exactly as hard as no gem.
  - "DN" is never shown.
- **Soak (water).** A soaked monster's blows land **20% softer**. That includes
  its swings, its throws, its slams and lunges, a blue slime's burst, a boss's
  ability and a storm monster's arcs. It does not include a burn or poison it
  already left on you, or ground it set alight.
- **Shock (storm).** Once a monster is shocked, each hit on it **sparks** to the
  nearest other monster within 150 px of where the hit landed, for a quarter
  of the hit.
  - The spark is drawn as a short bolt of lightning between the two monsters,
    with a crackle of sparks along it, and its number is in the storm's blue.
  - It is your damage. If it kills the monster, the kill is yours, and it pulls
    that monster onto you as any hit does.
- **The Gem Works says so.** In the Set gems tab and on a gem's card:
  - water reads "Soaks what it hits: its blows land 20% softer";
  - storm reads "Shocks what it hits: each hit after sparks to a monster beside
    it";
  - every gem adds what it beats, for example "25% harder on Frost monsters".

## The worker

The numbers live in `server/src/elemental.js`, and the phone's copies in
`src/data/weaponGems.js` (held equal by `mirror-audit`):

| What | Number | Where |
|---|---|---|
| UP | x1.25 when the hit's element beats the monster's, else x1 (never less) | `ELEM_UP.MULT`, `elementUpMult` |
| A soaked monster's blow | x0.8, before the one-hit rail | `SOAK_HIT.MULT`, `soakHitMult` |
| The spark | the nearest live monster within 150 px of the impact, a quarter of the hit | `SHOCK_SPARK.R`, `SHOCK_SPARK.PCT` |

### UP

- **Where it applies.** UP is applied to the gem's own hit
  (`combat.js _handleMonsterDamage`) and to the Element Burst
  (`burst.js`).
- **The element it reads.** The hit's element is the worker's own copy of the
  gem (`_hitElement`, weapongem.js), never the phone's claim. It is now worked
  out before the roll, because the damage reads it.
- **Where in the damage it goes.** It is applied in the same place as stone's
  fracture: after the attacker's ceiling (`_maxDmgForAttacker`).
  - This is for the same reason as fracture. It is the worker's own fact about
    the target, its own gem against the monster's own element, and nothing a
    claim can raise.
  - So the ceiling, which bounds what the attacker's roll may be, does not move.
    The plan said to widen it; that would only have been needed for a
    multiplier inside the roll.
  - Fracture and UP multiply together.
- **Which hits get it.** The staff splash, the bow special's blast, the lunge
  and damage-over-time ticks carry no gem element, so they get no UP. A
  collision keeps its own matchup factor (0.75 to 1.25, `resolveElementCollision`),
  as before.
- **On the event.** `monster_hit` carries `up: 1` when UP applied. The phone
  prints "UP" from that flag (`gameEvents.js`) against a worker that advertises
  `caps.elemup`. An older worker gets the phone's old guess
  (`monsterCombat.js`), without "DN".

### Soak

- **The door's table.** `hits.js` `MONSTER_HITS` has a new column, `soak`.
  - `true` for every blow the monster delivers itself: `swing`, `snowball`,
    `pile`, `kit`, `burst`, `boss`, and `shock` (a storm monster's arcs).
  - `false` for `fire`, `burn` and `poison`. These are not its blow, and their
    callers pass no monster.
- **Where in the damage it goes.** In step 6, the door multiplies the blow by
  `SOAK_HIT.MULT` first, then applies the one-hit rail
  (docs/specs/hit-door.md).
- **On the event.** The event's `dmg` is the softened blow.

### Shock

- **When it sparks.** `_wasShocked` is read before the hit's own status goes on,
  and before a collision can use the status up.
  - So the storm hit that shocks a monster sparks nothing.
  - Every hit after it sparks, whatever weapon it comes from.
- **Where it sparks from.** `combat.js _shockSpark` measures from the impact
  point, which is read before the hit's knockback, as the staff splash reads
  it.
- **Who it hits.** The nearest other monster that can take damage, within
  `SHOCK_SPARK.R`. Ties go by id.
- **How hard.** `SHOCK_SPARK.PCT` of the hit as rolled (`rawDmg`), times the
  target's fracture.
- **How it lands.** Through `_applyMonsterDot`, the shared pipeline: the
  overkill clamp, the hitter's credit, `monster_hit`, and the kill. It sets no
  status and sparks nothing further, so there is no chain.
  - It pulls the target onto the hitter.
  - It pays the weapon's trained XP, faded by the target's level.
- **On the event.** `monster_hit` carries `spark`, the id of the monster it
  leapt from. The phone draws the leap (`src/game/shockSpark.js`): a bolt
  between the two chests for 320 ms (`S._sparkArcs`, stroked by the effects
  renderer with a fresh jag every frame, a pale core over a blue glow, as the
  storm monster's own arc on a player is drawn) and a crackle of sparks along
  it (`S.hitParticles`). Both are drawn in code in the particles layer, so
  there is nothing new to load, make or free.

### Flags

- `caps.elemup`, `caps.soakhit` and `caps.shockspark` are advertised. The
  phone reads them for the words in the Gem Works, and `elemup` for where its
  "UP" comes from.
- Each name is a kill switch. Setting it to `false` in the live flags
  un-advertises the cap and puts that part back as it was
  (`combat.js _gemWeightOff`).
- There is no new event type and no new storage.
- A hit writes no row it did not write before; the spark's kill saves through
  the kill path, as any kill does.

## Tests

- **`server/test/gem-weight.test.mjs`** (46 checks) covers:
  - the flags and the numbers;
  - every pair on the element wheel;
  - UP on a hit (a win, a loss with no penalty, no element, a claim the worker
    ignores, with fracture, and the kill switch);
  - UP on the burst;
  - soak on every row of the door, before the rail, and its switch;
  - the spark: the nearest monster, a quarter of the hit, the hitter's credit
    and kill, the aggro pull, no chain, past the reach, a dead neighbour, from
    the impact point, and its switch;
  - no row written;
  - the phone's drawing of a spark: the bolt's jag, one bolt and its sparks a
    spark, nothing for a stale id, at most 16 bolts held.
- **Eight deliberate bugs, each caught:**
  - the old 0.75 penalty;
  - UP reading the claim's element;
  - soak softening a burn;
  - soak after the rail;
  - the shocking hit sparking;
  - the spark finding the farthest monster;
  - the spark's credit going to nobody;
  - the burst never reading UP.
- **`hit-door` §10b** knows the `soak` column.
- **`mirror-audit`** holds the phone's numbers and matchups to the worker's.
- **`mp-gemweight`** (7 checks) runs on a phone against a real worker at the
  Flame Fields' goblins:
  - the three caps;
  - the Set gems tab's water line and a storm gem's card;
  - a water gem's hits land "UP", from the worker's flag, and never "DN";
  - a storm gem has no matchup there;
  - a hit on a shocked goblin sparks to the goblin beside it, and the phone
    draws it;
  - no page errors.
  - `gemweight-bolt.png` pictures a bolt held between two goblins.
  - The swings go about 0.35 s apart. A test that reads the page between
    swings spread them more than 4 s apart on the QA box, past the shock's
    length, and saw no spark (the worker's own log showed the shock run out
    just before each next swing). A player swinging every half second keeps a
    monster shocked.
