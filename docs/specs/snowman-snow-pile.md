# Snowman: the snow-pile burrow (art + design, v2.3.2215)

Owner-designed signature mechanic for the frost zone's snowman — the first
of the "one unique mechanic per monster" set. **Built in v2.3.2221.** The art and rules were settled here first; the phase
machinery landed with the `_monsterDamageable` foundation described below.

## The mechanic

The snowman collapses into a low mound of churned snow, grinds across the
ground toward his target, and reassembles.

| Phase | Vulnerable? | Can he hit you? | Notes |
|---|---|---|---|
| **Burrow** (~400ms) | YES | no | Starting the move has a cost — he can be hit while collapsing. |
| **Pile** (≤2.5s, or until within 60px) | **NO** | **NO** | Untouchable *and* harmless (owner: "The snowman can't attack you in this form either"). |
| **Emerge** (~400ms) | YES | no | The punish window. |
| First attack after emerging | YES | yes | Still plays its normal wind-up tell — no free hit. |

Trigger: first time HP drops to ≤50%, then a ~12s cooldown so it stays a
moment rather than his whole personality.

**Why this is fair.** He trades all of his offence for all of his defence,
so the move is repositioning, not a damage window. The player gets free
seconds to drink, reposition, or simply walk away so he surfaces out of
range; standing your ground earns a clean opening on the emerge. It cannot
be spammed into a stalemate because he deals no damage while using it.

**Why the pile reads as invulnerable.** No head, no face, no hat, no arms,
no buttons — there is visibly nothing to hit. The half-buried red scarf is
the only identity cue, which says *who* it is without implying a target.

## Implementation notes (for the phase PR)

`m.alive` is currently the ONLY damage-denial gate a monster has. A phase
gate needs one shared predicate (`_monsterDamageable(m, now)`) applied at
**every** monster-damage write site, not just the melee one. As of this
writing those are, by function:

- `_handleMonsterDamage` (combat.js) — normal hits
- the elemental-collision damage path (combat.js)
- `_applyMonsterDot` (index.js) — DoT ticks, thorn recoil, and Element
  Burst all funnel through here
- the block-thorns reflect (index.js)
- `_abilityStrikeMonster` (abilities.js) — Shield Bash / Whirlwind
- pet targeting (pets.js) — a pet should not chew on an invulnerable pile

Miss one and the phase leaks: "invulnerable" that a DoT still damages is
worse than no phase at all. `dungeon.js` records the earlier decision to
defer exactly this work ("it would touch every damage path"); doing it once,
properly, as its own change is the point.

The phase must also ride the wire for late joiners / resyncs — a
conditional field on the per-entity monster tick delta, following the `w.st`
(stun) precedent in tick.js. A client that misses it renders an attackable
snowman that shrugs off every hit.

## Art (shipped in this commit)

All sheets: horizontal strips of 128px frames, transparent, frame count
auto-detected from strip width by `snowmanSprites.js`.

| File | Frames | Kind | Notes |
|---|---|---|---|
| `snowman-attack-{s,e,sw,n,ne}.png` | 8 | one-shot | Snowball throw. 5 source facings; the renderer's mirror table covers all 8. |
| `snowman-pile.png` | 8 | **loop** | The travelling mound. Non-directional by design — a mound has no front, so one loop serves every facing (same posture as the existing hit/death sheets). |
| `snowman-burrow.png` | 8 | one-shot | Standing → mound. Non-directional. |
| `snowman-emerge.png` | 8 | one-shot | Mound → standing. Non-directional. |

The burrow's last frame hands off to the pile loop's first frame at
115x64 vs 118x63 on the same base row — a 3px width difference, which is
why the two were scaled against each other rather than each against the
idle sheet. Its first frame sits at 112px tall against the attack sheets'
110, so idle → burrow does not pop either.

Still to author: `snowman-emerge.png` (mound → standing), one-shot,
non-directional. Until it exists the end of the move pops; the phase logic
does not depend on it.

**Processing** (`tools/` + the session's build script): each generated 4×2
grid is sliced by geometry, the character's main body isolated per frame
(the release frames carry a detached snowball that otherwise straddles the
cell wall), scaled by ONE shared factor across all facings, and anchored so
every frame's base row lands on the idle sheet's ground line. Two guards
matter and are easy to lose: a fit clamp so raised-arm poses do not shear
against the cell edge, and a single shared output size across the five
facings — sizing each sheet independently made the snowman grow and shrink
by ~10% as he turned.

The attack sheets keep the small snowball leaving the claw on the release
frame; the game spawns its own `monster_projectile` snowball at that
instant, so the painted one hands off to the real one.

---

## Built (v2.3.2221)

### The foundation: one gate, six doors

`_monsterDamageable(m, now)` (combat.js) is the only damage-denial predicate,
and it is expressed as **a timestamp, not a phase name**: `m._invulnUntil`.
That choice is the safety property. If a state machine ever drops a
transition — the monster despawns mid-phase, a zone unloads, an exception
skips the cleanup — the worst case is a monster that shrugs off hits for the
remainder of a window it had already been granted, never one that is
invulnerable forever. A `_phase === 'pile'` check has no such floor.

Applied at every door, verified independently by `burrow.test.mjs`:

| Door | Where |
|---|---|
| normal hits **and** elemental collision | `_handleMonsterDamage` entry (combat.js) — one guard, both writes |
| DoT ticks, thorn recoil, Element Burst | `_applyMonsterDot` (index.js) — all three funnel here |
| block-thorns reflect | telegraph.js (the spec predicted index.js; v2.3.2215 moved it) |
| Shield Bash / Whirlwind | `_abilityStrikeMonster` + its target scan (abilities.js) |
| **pet capture** | pets.js — the one removal that is not an hp write |

The pet door was not in the original list and is the sharpest: capture needs
no damage at all, so a pile could simply have been trapped. A DoT into a
phase **drops** rather than banking — otherwise the immunity is a delay, not
an immunity.

### The move

Trigger, durations and distances live in `BURROW` (telegraph.js). Owning
archetypes live in `BURROW_ARCH`, a table so the next monster to get a
burrow is one line.

The pile's harmlessness is not a flag: `_resolveBurrow` returns true while he
is mid-move and the tick `continue`s, so the AI never reaches target
acquisition or the attack code. One mechanism, nothing to forget.

The cooldown is stamped at the **start**, like the wind-up's — stamping at
the end would make the move's own duration part of its downtime. Surfacing
grants no free hit: `atkCd` is untouched, so his first swing after emerging
still pays its ordinary wind-up.

### Wire and client

The phase rides the per-entity tick delta as a conditional `w.ph`, following
`w.st`'s precedent exactly. This is for **joiners and resyncs**: the
`monster_ability` events drive the animation for anyone present when it
starts, but a player who arrives mid-pile would otherwise see an ordinary
snowman shrugging off every hit — a mechanic that reads as a bug.

The pile sets the existing `_invulnerable` flag rather than inventing a
second "cannot be hurt" concept, so the IMMUNE popup and the suppressed hit
flash come for free and read identically to every other such state.

The renderer's phase branch is a **texture branch, not an early `continue`**:
everything after the sprite chain — the HP bar above his head most of all —
still has to run. A mound with no health bar would hide the state of the
fight at exactly the moment the player is deciding whether to chase or back
off. The phase self-clears on expiry, because the server sends no "done"
event and a tick delta cannot express a REMOVED field.

## Durations (v2.3.2225)

| phase | ms | vulnerable? |
|---|---|---|
| dig | 600 | yes |
| pile floor | **2400** | no |
| pile cap | **8000** | no |
| emerge | 600 | yes |

Owner: "double burrow time". The doubling is on the **pile** — the phase he
is actually burrowed for. Dig and emerge are left alone on purpose: at 600ms
an 8-frame strip already runs at 75ms a frame, and stretching them would both
drag the animation and hand out free hits, since those are the only two
windows he can be hurt in.

The cap only binds when he cannot reach you; the floor is what you feel in a
normal fight, because arrival ends the pile as soon as the floor has passed.


## The pile RUNS, and it outruns you (v2.3.2236)

Owner: "change snowman burrow behavior to move AWAY from the player and
change the speed so that during burrow it moves away from the player more
quickly than the default speed of the character moving towards it."

| | before | after |
|---|---|---|
| direction | toward the player | **away** from the player |
| speed | `m.spd x 3` = 54 px/s | **190 px/s** |
| ends when | he reaches you (`ARRIVE_PX` 60) | he gets clear (`ESCAPE_PX` 420) |

### The speed is measured against the player, not the monster

A default character moves `calcMoveSpeed(0,0) / 5 x SPEED` = 2.5 px/frame at
60fps = **150 px/s**. 190 is ~1.27x that, so walking straight at a fleeing
pile loses ground — which is the whole point of the move.

Stated plainly rather than glossed: **a fully specced character still catches
him.** Agility caps at +60% and swiftness adds a flat +2.0, reaching 300
px/s. Beating *that* would need ~1.3x the fastest build in the game, which is
a different and much larger balance decision than the one asked for.

The old form multiplied the monster's own walk (`m.spd x SPEED_MULT`), which
is the wrong frame of reference for "faster than the player" and was also
where v2.3.2223's bug lived — it read `m.speed`, a field that does not
exist, and ran at 2.5x its design speed behind a plausible fallback. The
speed is now px/s converted against the room's own `TICK_RATE`.

### ESCAPE_PX is required, not decorative

With the direction flipped, "he reached you" can never become true. Without
an end condition of its own the pile would run to `PILE_MAX_MS` every time —
8s at 190 px/s is 1520px across a 1024px zone, i.e. five seconds pinned
against the map edge.

`ESCAPE_PX` 420 sits just under what the floor buys (`PILE_MIN_MS` 2400ms x
190 = 456px), so in open ground he surfaces as the floor expires and
`PILE_MIN_MS` remains the duration the player feels.

**Cornered, he cannot make the distance and the cap governs** — he surfaces
next to you. That is counterplay, not a failure mode: back him into a wall
and the escape fails. He is clamped inside the zone by the same one-tile pad
the knockback clamp uses, because fleeing aims him at the edge by
construction.

### Client

None. The client follows the server's position and plays the phase sheets it
is told to; `mirror-audit` pins the phase names and the burrowing archetype
table, neither of which moved.
