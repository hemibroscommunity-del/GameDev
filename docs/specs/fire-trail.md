# The fire goblin's fire trail (v2.3.2238)

> Owner: "what kind of ability should the fire goblin have? Think of some
> candidates" → then, of the trail: "build the fire trail for the fire goblin."

## Why this ability

The fire goblin is already fire everywhere except in what it **does**. It
burns orange, it throws embers on every hit (`HIT_MATERIALS.fireGoblin`), it
drops charred remnants — and then it walks up and pokes you exactly like a
slime, because underneath it is a `fodder` archetype wearing a different
sheet. The trail turns the thing the monster is already about into the thing
it does.

It is also **the first persistent ground hazard in the game**. Everything
that has ever hurt a player here resolves at an instant — a swing, a
snowball's impact, a telegraphed slam, the slime's blast — and all of them
ask *where were you at that moment*. This asks *where have you been
standing*, which is a different question and the reason it was worth
building: it makes the floor something you read, and it gives ember a hazard
you move around rather than react to.

## What it does

While a fire goblin is **chasing someone**, he leaves a burning patch behind
him every 48px he walks. A patch flares for 300ms, then burns anyone standing
in it for 6 damage every half second, then guts out after 4 seconds.

| | value | why this number |
|---|---|---|
| `SPACING_PX` | 48 | ≈ one patch every 0.7s at his 68 px/s walk |
| `RADIUS` | 26 | under one 32px tile — the slime blast is 110 |
| `ARM_MS` | 300 | a patch dropped on your feet is not an unavoidable hit |
| `LIFE_MS` | 4000 | ≈ 5.7 patches alive at once behind a walking goblin |
| `TICK_MS` | 500 | charged **per player**, not per patch |
| `DMG` | 6 | 12/s standing still, before defence mitigation |
| `MAX_PER_MONSTER` | 8 | a chase that never ends grows no unbounded tail |
| `MAX_PER_ZONE` | 60 | N goblins cannot flood the tick or the wire |

For scale: 12 damage a second against the 60 the blue slime's blast deals in
one go. This is attrition you feel accumulating, not a spike that removes a
health bar while you read the word "fire".

## What makes it fair

`server/src/telegraph.js` carries four fairness rails for the telegraph kits.
A persistent hazard needs its own set, because "re-check the player's position
at execute" has no meaning for something already on the ground.

1. **It only burns ground he chased you across.** Patches drop only while
   `m.targetId` is set. An idle goblin wandering his spawn leash lays
   nothing — otherwise ember paves itself into a maze nobody chose to light,
   and the tick and the wire both pay for scenery.
2. **`ARM_MS`.** A patch is inert for its first 300ms, so the flare comes
   before the burn. Same "the tell comes first" promise every other ability
   keeps.
3. **The radius is small and the answer is one step.** 26px. A default
   character covers 150 px/s, so leaving a patch costs about 0.2 seconds of
   walking. Standing in it is greed for the next kill, never a tax.
4. **It ticks slowly, and per player.** Two patches 48px apart genuinely
   overlap (2 × 26 > 48), so charging per patch would double the damage
   exactly where the trail is densest. The cooldown lives on the player.

**Not blockable, deliberately.** A shield answers a direction and the ground
under your feet does not have one. Movement is the whole counterplay, which
is what rail 3 is for.

## What it deliberately does not do

- **No friendly fire.** It does not hurt monsters, including other goblins.
  A pack of goblins killing each other while you watch is a bigger design
  change than the one that was asked for. Say the word if the fire was meant
  to be indiscriminate.
- **It does not use the elemental `burn` status**, which was the
  obvious-looking reuse and is wrong twice over. `STATUS_DEFS.burn` is a
  *monster* status — `elemental.js` applies statuses to `m`, and there is no
  player-side status system to hang one on at all — and its damage-over-time
  is priced off the attacker's `elem` stat, which a monster does not have.
  Building a player-status system to deliver 6 damage would be the tail
  wagging the dog. Direct damage through `_applyDamage` is what every other
  monster damage source here already does.

## Where it lives

| file | what |
|---|---|
| `server/src/firetrail.js` | the whole system: `FIRE_TRAIL` tuning + `fireTrailMethods` |
| `server/src/index.js` | `_maybeDropFirePatch` per monster, `_tickFireTrail` per zone, `fire_trail` in `PRIVILEGED_EVENTS`, `this.fireTrails` |
| `server/src/movement.js` | `_sendFireTrailSnapshot` on zone entry |
| `src/networking/gameEvents.js` | the `fire_trail` case; the `_srvResolved` guard on the local block fallback |
| `src/rendering/systems/effectsRenderer.js` | the drawn patch, in the ground pass |

**The drop hook sits above the resolve chain and the aggro branch** in
`_tickMonsters`, so the trail accrues from wherever the body actually moved —
chase step, knockback repay, a future dash — rather than being welded to one
mover. It measures last tick's displacement, which puts the patch 22ms behind
him: where a footprint belongs.

**The zone tick sits above the `monsters.length === 0` guard**, so ground he
lit keeps burning and keeps expiring in the tick where he dies or despawns.
Gating it on a live monster list would strand a patch until someone
re-entered the zone.

## Wire and deploy order (handoff rule 19)

`fire_trail` is **display-only** and carries no damage, exactly like
`monster_ability` and `monster_projectile` before it. The damage rides the
authoritative `monster_attack`, stamped `ability: 'firetrail'`.

That stamp is **required, not decorative**. The v2.3.2235 bypass it triggers
is what stops the client's own filters eating the number: a patch is not a
monster in the client's snapshot under any id it knows, so the very first
filter in the `monster_attack` handler would drop it outright. The attacker
point on the wire is the **patch**, not the goblin, for the same family of
reason — the goblin may be across the zone by the time his fire bites, and
the client drops any hit reported from more than 160px away.

An older client that has never heard of `fire_trail` sees no flames and takes
exactly the right damage. No caps flag, following the `monster_projectile`
precedent.

### Nothing is persisted

Patches live in DO memory beside `this.monsters`. A worker restart forgetting
which ground was alight is correct, not a bug — monsters respawn across one
too. There is no storage-key registry entry.

### A player who arrives mid-chase

`_sendFireTrailSnapshot` replays the live patches to an arriving socket right
after its zone snapshot, on both protocol versions, with each patch's
**remaining** life and `arm: 0`. This is not polish: the patches burn on
arrival whether or not they were drawn, and a hazard that damages you off
invisible ground is exactly the "mystery damage with no visible attacker" the
client's range filter exists to prevent. Sent as ordinary `fire_trail` events
rather than a new `zone_state` field, so the snapshot's wire shape is
untouched.

## The client-side bug this uncovered

The `monster_attack` handler's local block fallback was gated only on
`S._shieldUp`, so it fired against **server-resolved** damage too and zeroed
the popup while `player_state` quietly dropped the HP — despite its own
comment saying the worker's `blocked` flag is the authority in a server zone.
Same class of bug as v2.3.2235's three filters, in the same handler, and the
fire trail is the case that makes it certain rather than theoretical: fire
under your feet has no direction, so a shield pointed anywhere near it
swallows every tick's number. Now gated on `!_srvResolved`.

## Rendering

Drawn with `Graphics` rather than a sprite strip, and that is a deliberate
simplification: the patch is a flickering ember disc a draw call already
makes well, and adding a strip would mean registering a loader in the preload
manifest (CLAUDE.md's animation-preloading law) for an effect that does not
need one. No new asset, no new first-use hitch.

Three stacked discs — charred brown edge (`#7c2d12`, the goblin's own decal
colour), ember body (`#ea580c`, its hit tint), white-hot core — so it reads as
burning ground and not as a coloured selection circle. The flicker is seeded
per patch off its own spawn timestamp, so neighbouring patches breathe out of
step the way real flame does.

**Drawn at the radius the server tests**, the same promise the telegraph
rings make and for a stronger reason: this one persists, so a player learns
its edge by walking it, and a lie about that edge is a lie they act on all
fight. The life curve runs the *opposite* way to a telegraph ring, because it
means the opposite thing — a wind-up ring fills toward the moment it goes
off; a patch is hottest when it lands and gutters out as it dies.

## Testing

**`server/test/firetrail.test.mjs`** (43 assertions) pins the rules
deterministically against a real `GameRoom`, each failure mode separately: it
can burn ground nobody lit, double-dip on overlap, keep burning after you walk
out, or strand itself in a zone forever. Negative-controlled — removing the
chase gate fails rail 1 only; charging per patch fails rail 4; dropping the
`ability` stamp fails the wire contract; removing `ARM_MS` fails rail 2.

**`tools/qa/mp/mp-firetrail.mjs`** (13 assertions) drives a real browser
against a real worker for the two halves the server suite cannot see: that
the fire is actually painted (counted in pixels — measured bare 2 → lit ~180
→ back to 2 once cleared), and that the burn's number reaches the health bar,
including while blocking. Deploy-order controlled: an untagged burn is still
filtered exactly as before.

Ember is quest-gated server-side (`_zoneUnlocked`) and out of the harness's
reach, so the browser scenario uses meadow and the exact payloads
`firetrail.js` builds rather than a real goblin — the same compromise
`mp-burstdmg.mjs` makes, with the controls that keep it honest.

**`server/test/mirror-audit.test.mjs`** pins the four places this system can
be perfectly correct and completely inert: no client case, no renderer
branch, the drop hook never called, the snapshot never replayed.

### A fixture lesson worth keeping

The browser scenario's zone-leave check writes `S.currentZone` directly, which
also flips `S._serverMonsters` off — town is client-rolled, and nothing
re-derives that flag until a real `zone_state` arrives. Run before the burn
assertions, it silently turned the whole file into a single-player client and
the burn numbers were dropped by the very filter the tag exists to bypass:
one failure in three runs, which is worse than a clean red. Anything that
fakes a zone belongs at the **end** of a scenario.
