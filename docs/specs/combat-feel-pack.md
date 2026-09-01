# Combat Feel Pack (v2.3.2200)

Owner report: combat feels **"floaty."** Diagnosis found three feedback
disconnects; this PR fixes all three client-side. No server or wire changes.
Companion PR (v2.3.2201) adds wind-ups to every basic monster attack.

## What changed

| # | Disconnect | Fix |
|---|---|---|
| 1 | Melee damage/FX fired on frame 0 of the 300ms swing — feedback while the blade was still winding up | `MELEE_CONTACT_MS = 120` (gameSystems.js): the hit-test waits for the blade's contact frame; the swing broadcast/angle still start instantly. Melee only — the bow already fires at its release frame, projectiles carry travel time. |
| 2 | Monsters didn't visibly react: `_hitFlash` written but never read; hit-recoil only from OUR local swings (peers' hits moved nothing); slash marks written, never rendered; hitstop written, then nulled every frame | Hit-flash now renders (120ms red tint pulse, all three sprite branches); recoil (`_hitAnimStart` squash/sheet) stamps for every archetype and from every `monster_hit` (peer + server-rolled ability/thorns/burst hits); dead slash-mark and hitstop writers deleted (hitstop stays disabled — owner call). |
| 3 | Impact effects were procedural circles; ground splatter kill-only, no fade, 30s | Per-material **sprite debris** (`DEBRIS_BURSTS`, `spawnHitDebris`) and pooled **sprite ground decals** spawning on hit (50%) and kill, 8s TTL with 2s fade (owner: "5-10 seconds"). Materials per archetype in `hitMaterialOf` (monsterVariants.js): snow, goo, stone, bone, ember. |

Also: screen-shake decay is dt-scaled (was decaying 2× too fast on 120Hz
iPhones); camera punch extends to received hits (kick away from attacker) and
telegraph executes (kick toward impact); knockback 4/5.5/4 → **6/7/10**
(normal/crit/special — still 25-60% under the last pre-halving owner values;
one-word veto welcome).

## Placeholders vs. owner art

Every new visual ships working today on **minted soft-sprite placeholders**
(one canvas-minted radial-gradient texture, tinted per material — never live
`Graphics` circles). Each generated sheet below **drops in silently**: same
filename, the loaded-frames check switches over, no code change.

Pipeline: generate per `docs/skill-animation-pipeline.md` (ChatGPT first
frame → Grok motion), then normalize with
`node tools/import_fx_sheet.mjs <src> <dest> 8` → 2048×256 webp, 8 cells.

### Art manifest

Style boilerplate to prepend to every prompt:
> Textured HD pixel art, 256×256 canvas per frame, 3/4 isometric top-down
> view, hard pixel edges, no anti-aliasing, solid clean white background.
> No text, no borders, no gradient halos. One-shot animation, static camera.

| File (in `public/sprites/effects/`) | Motion prompt |
|---|---|
| `debris-snow-burst-v1.webp` | A burst of powdery snow chunks and ice shards erupting from a single impact point, flying up-and-outward with a puff of frost mist, dissipating by the last frame. 8 frames, one-shot. |
| `debris-goo-burst-v1.webp` | A splash of thick green slime droplets and one stretching goo strand bursting from an impact point, drooping under gravity, settling and fading by the last frame. 8 frames, one-shot. |
| `debris-stone-burst-v1.webp` | Sharp grey rock chips and dust bursting from a struck stone surface, chips tumbling outward, dust lingering then clearing. 8 frames, one-shot. |
| `debris-bone-burst-v1.webp` | Small ivory bone fragments and dry dust snapping outward from an impact, fragments spinning, settling by the last frame. 8 frames, one-shot. |
| `debris-ember-burst-v1.webp` | A crackle of orange embers and tiny sparks bursting from an impact, sparks arcing up then winking out. 8 frames, one-shot. |
| `ground-splat-atlas-v1.webp` (optional) | Eight distinct flat top-down splatter stains, one per cell: irregular organic blob shapes with a few satellite droplets, neutral desaturated grey (runtime tints them), hard edges, no shading. |

Debris sheets are neutral-toned where possible — the renderer tints goo
variants (moss/blue/mire) from the same sheet.

Future (PR v2.3.2201+, monster attack sheets, `public/sprites/monsters/…`,
128px frames, per-zone preload): slime `attack-{south,east}` (rears back
compressing, snaps forward in a headbutt lunge, ~6 frames); snowman
`attack-{5 dirs}` (packs a snowball with stick arms, hurls with a full-body
twist, ~8 frames); rockmonster/fishman `attack-{dirs}` (both fists overhead,
slam down-forward — the `smash` archetype, ~8 frames).

## Perf posture

Debris hard-capped at 24 concurrent + 150ms per-monster dedup; decal pool
fixed at the existing 80-mark cap (sprites hide, never churn); one minted
texture each (the `_shadowTex` batching recipe); removeChild-before-destroy
everywhere (Pixi v8 zombie defence); missing art cannot stall the preload
gate (`effectsAnimationsReady` is `allSettled`).

## QA

`tools/qa/mp/mp-feel.mjs`: contact-sync timing (hit stamps ≥110ms after
swing input, with an early-sample control), universal recoil probe
(`__btMonsterHitReact`: squash + tint pulse, incl. from a foreign attacker's
`monster_hit`), decal spawn (Math.random pinned) and 8s TTL reap.
