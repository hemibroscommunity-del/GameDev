# Monster stop distance + the pounce retirement

**v2.3.2482.** Owner asks from the 2026-09-14 backlog triage (D14 and the
"delete the pounce" line). Server-side only: no wire change, no new event,
no storage key, no caps flag. Pinned by `server/test/tick.test.mjs`
("stop ring") and `server/test/combat-lifecycle.test.mjs` ("pounce").

---

## 1. Monsters stop a sword's length away

### The ask

Monsters walked all the way into the player's body. You cannot face a
threat you are standing inside: the directional shield has nothing to
point at, the swing arc has nothing to resolve against, and the monster's
own art is hidden behind the player's. The owner's phrasing was "the full
length of the sword".

### The number

`MONSTER_ATTACK_RANGE` moves **45 → 72 px**. 72 is `GS_OUTER_RADIUS`, the
player's own melee reach (`src/game/monsterCombat.js`), so the ring a
monster halts at is now exactly the ring the player can hit from.

### The half that is not optional

**The same constant gates the monster's swing reach.** Widening the stop
ring alone parks every monster outside its own reach and they never land
another hit — the same failure mode the v2.3.1639 knockback note describes,
and it would read as "monsters are broken", not as "monsters back off".

Three sites carry it and they move together:

| Site | What it gates |
|---|---|
| `this.MONSTER_ATTACK_RANGE` (`server/src/index.js`, constructor) | the value `_basicAtkGeom` reads |
| `const ATTACK_RANGE` (`server/src/index.js`, `_tickMonsters`) | stop advancing / start the swing wind-up. A literal by design, so re-tuning takes effect without a DO restart — see the comment there |
| `_basicAtkGeom` (`server/src/telegraph.js`) | the ring the wind-up **re-measures** against at impact |

`BASIC_WINDUP.WHIFF_GRACE` stays at **1.3**. It is a ratio, not a distance:
the grace ring simply moves 58.5 → 93.6 px with the contact ring, and the
trade it encodes (deliberate kiting escapes, jitter does not) holds at
either scale.

### Knock-on: the telegraphed kits

A kit's `radius` is the execute-time hit radius and is deliberately **wider
than the stop ring** — a signature cast you could dodge by standing still
would teach nothing. At the old 45 px ring the kits were authored at
brute 55 (1.22×) and fodder 50 (1.11×). Left alone against a 72 px ring
they would both sit *inside* it, i.e. whiff by construction on every cast.
They move at the same ratios: **brute 55 → 88, fodder 50 → 80.**

### Knock-on: the snowman and the ranged band

- The snowman's relaxed ring (70 px with a 1.5 Y-scale, v2.3.1409) was a
  *widening* of 45. Against 72 it would be a narrowing, so both sites take
  `Math.max(70, MONSTER_ATTACK_RANGE)`. His Y-scale still does its own job
  — the tall collision body that started that fix is unchanged.
- Ranged archetypes keep their standoff. A throw fires in the band
  `attackDist > max(stopRing, minRange)`, so the snowman (minRange 100)
  is untouched and the fodder slime's band moves 70 → 72, which is inside
  the noise of one tick of movement.

### Client

Nothing. The client does not predict monster movement in server zones
("server position is the source of truth"), and its own body-collision
push-out radii (8–32 px) sit far inside 72, so nothing fights the new ring.

---

## 2. The stalker's pounce is retired

`TELEGRAPH.KITS.stalker` — `{ kind: 'pounce', windupMs: 700,
cooldownMs: 6000, dmgMult: 1.5, radius: 46, leap: 140 }` (v2.3.1730) — is
deleted, and with it the now-unreachable `kit.kind === 'pounce'` leap branch
in `_resolveMonsterTelegraph`.

Why it reads badly in play: stalkers spawn in exactly one zone (sky /
Desert Winds) and every archetype there is re-skinned as a **mummy**
(`ZONE_VARIANT_MAP.sky`), so the move looked like a mummy teleporting 140 px
onto the player with no animation to explain it.

What survives: the archetype keeps the **universal basic wind-up swing**
(`BASIC_WINDUP.MS.stalker`, 400 ms), so a stalker still telegraphs; it just
has no signature cast.

The client's `pounce` label, colour and shake entries in
`src/networking/gameEvents.js` are **left in place**. `mirror-audit` requires
every *server* kit to have a client label, not the reverse, so keeping them
costs nothing and means re-adding the kit later needs no client deploy.

Nothing persists across the change: a worker deploy restarts the Durable
Object and respawns every monster (handoff rule 11), so no stalker can come
back mid-cast holding a kit that no longer exists.
