# Snowman: the snow-pile burrow (art + design, v2.3.2215)

Owner-designed signature mechanic for the frost zone's snowman — the first
of the "one unique mechanic per monster" set. **This document ships ahead
of the code**: the art and the rules are settled here; the phase machinery
lands with the universal basic-attack wind-up PR that it depends on.

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
