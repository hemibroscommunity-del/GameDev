# What happens when an arrow lands (v2.3.2511)

**Status:** shipped, client-only. Lane C of the 2026-09-14 backlog triage
(`docs/BACKLOG-TRIAGE-2026-09-14.md` §2.5). Six contained fixes to the moment
of impact, batched because they are one subsystem and one round of testing.

## 1. One arrow sticks, not two

`projectiles.js` pushed a plain `_stuckArrows` stub for **every** non-staff
arrow with no `isSpecial` check, while the special **also** set `a.stuckIn = m`
a hundred lines below — so a charged shot left the golden flame art *and* a
plain brown shaft in the same monster. One condition, one fix: the stub is
skipped when the arrow is a special. The special's own art is the one to keep —
it is the shot that was fired, it carries the 4-second chip tick, and it is
what tells the player their heavy shot landed.

## 2. The shaft plants in the body, not at the feet

The anchor table had entries for the fire goblin and the slime and nothing
else. Everything else fell into an `else` branch with `yAnchor: 0` — and since
v2.3.1824 a monster's position **is** the base of its drawn art, so 0 is the
feet. A 96px mummy and a 120px skeleton therefore collected arrows in the
ground while the shot that put them there was aimed at their chests.

Mummy and skeleton now have their own rows, at −42 and −52. Those are not new
guesses: they are pulled back a little from the body centres
`monsterBodyOffsetY` already publishes (48 and 60 — half of `liveScalePx` ×
0.75 × the 1.5 size multiplier), which is the point the hit test, the aim
ladder and the damage popup all use. The ellipse is narrow (10 × 14 and
10 × 16) because those two are tall upright figures, not round like the goblin.

Pinned by the new `mp-stuckarrow` scenario.

## 3. A stronger keyline on the arrow, baked into the art

This line has moved three times and the history is in
`effectsRenderer.js` above `ARROW_PINE`. v2.3.1876 grew a rim **outward** and
buried the arrowhead, because dilating outward fills concavities and the notch
between the fletchings and the barbs is what says "arrow". v2.3.1877 backed
that out and instead forced the keyline to pure black and knee'd the alpha —
which helped, and was still not enough: its own measurement says that at
`ARROW_PINE.lenPx` through a ~0.67 world scale the texture lands in about
35 × 9 device pixels, so a one-pixel keyline owns about half an output pixel
however black it is.

So `tools/gear/make-pine-arrow.mjs` now grows it **inward** by one pixel. That
cannot fill a concavity — the silhouette is not touched at all — it only takes
one pixel of wood just inside the edge.

**And it stops at the steel head, which the script measures rather than
assumes.** Run across the whole sprite the inward ring kept only **66%** of the
head's steel and dragged the re-measured `headFrac` from 0.742 to **0.719** —
v2.3.1876's number exactly, arrived at by a completely different route. The
head is the thinnest part of the art (about 8px tall at 128 × 32), so a ring
top and bottom is a third of it. Stopping three columns short of the steel
boundary (the head measurement is a per-column green-vs-neutral vote, which
blackening moves) puts it back:

```
KEYLINE pixels on the shaft: 863 -> 1186  (x1.37)
STEEL HEAD pixels: 305 before the inward thicken, 305 after  (100% kept -- must be 100)
STEEL HEAD starts at 74.2% of the texture width
```

That is also the right answer on its own terms and not merely the safe one: the
keyline that cannot be seen is the one around the green shaft, a thin mid-tone
strip over grass. The steel head is the brightest thing on the sprite and reads
without help.

**No runtime filter**, deliberately — a filter over the WebGL canvas is the
documented iOS grain hazard (v2.3.948's charge pie, v2.3.1236's joystick
bases), which is why every move of this line has been made in the art.

## 4. The special arrow breathes

`ARROW_SPECIAL.scale` 0.17 → **0.20**: the drawn arrow goes 53.4 → 62.8 world
px, about 18% longer. Modest on purpose — the `PROJ_BODY.arrowSpecial` capsule
in `projectiles.js` is measured off this number (its own header says "IF THE
ART IS RECUT OR RESCALED, THESE MOVE WITH IT"), and it is updated in the same
change: back 24.6 → 28.9, front 28.8 → 33.9, half 10.9 → 12.8.

The white pulse is a **second additive sprite** over the first, pooled beside
it and reaped by the same pass. Two reasons it is not a tint: Pixi's tint
multiplies, so no tint can make golden art brighter than it is; and a filter is
the iOS hazard above. Adding light is what "flashes white" means, and an
additive draw is how you add light. It swells and fades on a 260ms sine —
deliberately out of step with the 90ms × 4-frame art loop, so the two rhythms
read as one living object rather than a strobe — and it stops the moment the
arrow is planted or stuck, because a spent arrow that keeps flashing reads as a
live shot.

## 5. Arrows and bolts sound like what they hit

Melee hits have been material-keyed since v2.3.2452 — goo, ember and flesh
thud, bone cracks, stone rings — and arrows and bolts played one flat sample at
everything, so a slime and a skeleton sounded identical to a bow and completely
different to a sword.

Routed through **the same** `hitMaterialOf(arch).kind` classifier and the same
`BT_AUDIO.swordHit` mixer the sword uses, so the two weapons cannot disagree
about what a mummy sounds like and no new samples are needed. The volume stays
the arrow's own 0.6 — handing it the melee's 0.55 would have quietly
re-levelled every ranged hit in the game.

Magic keeps its own voice: a bolt is not a physical impact, so the material
sound is layered **under** `magic-hit` at 0.22 rather than replacing it. The
player still hears magic, and still hears what the magic hit.

PvP impacts take `'flesh'`, exactly what `monsterCombat` passes for an NPC.

## 6. Hit radii: the slime, and the special's cap

**The slime, re-measured.** `tools/gear/measure-monster-body.mjs` (new — it
decodes the shipped sheets frame by frame rather than trusting arithmetic in a
comment) reports `slime-idle-v5` at 24 frames, widths min 34 / median 48 / max
54 frame-px, and the blob is 41 frame-px tall. So the shipped 27 was right
about **one** axis — the median frame's half-*width* — and the body is an
ellipse with half-axes 27 across and 23 up. A single circle at the larger axis
is 46% too generous vertically *before* the arrow's own 6.6px half-thickness is
added, which is the "passed clean over its head and counted" in the report.

**25** is the mean of the two half-axes: the fairest single circle for that
ellipse, still wider than the blob in its squashed frames, and with the capsule
an effective 31.6 — an arrow whose drawn *edge* touches the drawn blob.

**The special's ×3, capped.** A bare ×3 is not a radius, it is a compounding
one: it scales with whatever the monster's circle already is, so the biggest
targets got the biggest blasts and the smallest got the most absurd ones.
Measured: ×3 on the slime's old 27 gave 81 plus the special's 10.9
half-thickness = **92**, three and a half blob-widths for a shot the player
sees as one arrow; a skeleton's 50 gave 150, wider than the skeleton is tall.

The cap is **the projectile's own drawn body**: the special is drawn 62.8 world
px long, so its blast may reach at most half that — **31px** — beyond the
monster's own circle. "You can hit what the arrow could plausibly sweep" is a
sentence the art can be re-measured against; "×3" is not a picture of anything.
×3 still applies wherever it is the smaller of the two, so nothing small loses
its buff (the cap only bites above `_hitR` 15.5).

| monster | `_hitR` | old effective | new effective |
|---|---|---|---|
| slime | 25 (was 27) | 92 | 69 |
| fire goblin | 26 | 89 | 70 |
| snowman | 32 | 107 | 76 |
| mummy | 40 | 131 | 84 |
| skeleton | 50 | 161 | 94 |

## Harnesses

New: `mp-stuckarrow` (one stub on an ordinary arrow, none beside a special, and
the shaft in a mummy's and a skeleton's body rather than at their feet).
Kept green: `mp-hitsound`, `mp-hitmatrix`, `mp-hitreal`, `mp-arrowhead`,
`mp-arrowblast`.
