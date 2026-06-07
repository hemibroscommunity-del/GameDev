# Skill & weapon animation pipeline — Grok Imagine prompts + conventions

Companion to `docs/grok-tileset-prompts.md`. Same idea: one reusable convention so the
processing tools and the renderer stay dumb, and every new animation is a fill-in-the-
blanks job instead of a one-off.

This doc covers two new families of character animation, both authored through the same
AI pipeline (**ChatGPT first-frame reference → Grok Imagine animation → process →
import**):

1. **Life-skill actions** — mining, woodcutting, blacksmithing, fishing, farming, …
2. **Weapon attacks** — real weapon swings (today combat is a 2-frame fist punch).

---

## The core idea: animate **motion archetypes**, not skills or weapons

A mining swing, a woodcutting chop, and an overhead sword slash are nearly the *same
body motion*. So we don't author "a mining animation" or "a steel-sword animation". We
author a small set of **motion archetypes**, and assemble a concrete in-game action as:

> **action = motion archetype  +  tool silhouette  +  (optional) station prop**

- **Motion archetype** — the body/arms cycle (overhead swing, side swing, stab, bob…).
  Authored once. Shared across many skills and weapon classes.
- **Tool silhouette** — a flat single-color stand-in (sword shape, axe wedge, pole…)
  held during generation. This is the answer to *"how do I mix and match"*: you mix and
  match **silhouettes onto a shared character + a shared motion**.
- **Station prop** — the thing being acted on (anvil, ore node, water, tree), drawn in
  the world, not on the character.

~8 motion archetypes cover ~10 life skills **and** every weapon class. That is the
whole point — it keeps the matrix from exploding into thousands of clips.

### Archetype table

| Archetype  | Motion                        | Combat use      | Life-skill reuse             | Silhouette          | Station prop |
|------------|-------------------------------|-----------------|------------------------------|---------------------|--------------|
| `slash-d`  | overhead diagonal swing       | swords, axes    | **mining** (pickaxe)         | `wedge-haft`/`blade`| ore node     |
| `slash-h`  | horizontal side swing         | swords, daggers | **woodcutting** (axe)        | `blade`/`wedge-haft`| tree         |
| `smash`    | two-hand overhead down        | hammers, mauls  | **blacksmithing** (hammer)   | `block-haft`        | anvil        |
| `thrust`   | forward stab                  | spears, rapiers | farming (hoe/tilling)        | `pole`              | soil row     |
| `cast`     | raise + project               | staffs, wands   | enchanting                   | `pole` + orb        | —            |
| `shoot`    | draw + release                | bows            | trapping (set trap)          | `bow-arc`           | —            |
| `bob`      | idle cast + rhythmic bob loop | —               | **fishing**                  | `pole` + line       | water        |
| `stir`     | repetitive hand loop          | —               | cooking                      | spoon/ladle         | pot/station  |

### Why "baked per archetype" still stays cheap per tier

Weapon art is **baked into the swing per archetype** (one `slash` animation covers all
swords) — *not* re-generated per weapon tier. Because the tool is a **flat key-color
silhouette**, that exact region is trivially maskable. Bamboo → steel → mythril is a
**recolor/retexture of the masked region** on the already-baked frames via
`tools/recolor_*.py`, never a new Grok run.

---

## Silhouette library — `tools/silhouettes/`

A handful of flat **single key-color** tool shapes (key color `#FF00FF` magenta —
deliberately outside the game palette so it isolates cleanly). 256×256, hard edges, no
detail. Regenerate them any time with `python tools/silhouettes/make_silhouettes.py`.

| File               | Tool class                | Used by archetypes        |
|--------------------|---------------------------|---------------------------|
| `blade.png`        | long sword                | `slash-d`, `slash-h`      |
| `blade-short.png`  | dagger                    | `slash-h`                 |
| `wedge-haft.png`   | axe / pickaxe             | `slash-d`, `slash-h`, `mine`, `chop` |
| `block-haft.png`   | hammer / maul             | `smash`, `smith`          |
| `pole.png`         | spear / staff / fishing rod | `thrust`, `cast`, `bob` |
| `bow-arc.png`      | bow                       | `shoot`                   |

**Two jobs, one asset:**
1. **Generation aid** — feed the silhouette into the ChatGPT first frame so every
   generation of an archetype shares grip, scale, and orientation across tiers/facings.
2. **Recolor mask** — the flat `#FF00FF` isolates the tool region for per-tier recolor.

---

## Reusable prompt blocks

Compose every prompt from these blocks. Only `[CHARACTER]`, `[TOOL]`, `[FRAME]` change
per target; `[STYLE]` and `[CONSTRAINTS]` are boilerplate (kept in sync with
`creative-reference.md` §1.1.1 and the tileset doc's footer).

### A. ChatGPT — first-frame reference image

```
[STYLE]
Textured HD pixel art, single character, 256x256 canvas, full body centered in frame,
3/4 isometric top-down view, hard pixel edges, no anti-aliasing, no gradient halos,
solid clean white background (clean white, not patterned).

[CHARACTER]
<paste the canonical character reference image / short description so identity, scale,
and proportions stay stable across every generation>

[TOOL]
Holding a flat #FF00FF {blade | blade-short | wedge-haft | block-haft | pole | bow-arc}
silhouette — a plain solid-color shape with NO interior detail, NO shading — standing in
for the {archetype} tool. (Reference image: tools/silhouettes/<file>.png)

[FRAME]
This is the WIND-UP (first) frame of a {archetype} motion. Facing {south | east}.
<life skills only:> oriented toward a {anvil | ore node | water's edge | tree} just ahead.

[CONSTRAINTS]
No text, no numbers, no borders, hard pixels, no halos, solid white background.
Character and silhouette consistent with the reference; tool stays flat #FF00FF.
```

### B. Grok Imagine — animate from that first frame

```
<attach the ChatGPT first-frame image>
Animate: the character performs a {archetype} — {motion sentence}. Loop seamlessly.
Static camera. Feet planted (no translation). Keep the character and the #FF00FF
silhouette's shape, color, and scale perfectly consistent across all frames.
Solid white background. ~{N} frames over ~{ms} ms.
```

---

## Per-archetype filled prompts

Pull `[STYLE]`/`[CONSTRAINTS]` from above; only the changing blocks + the Grok motion
sentence are shown.

### `mine` (life skill · `slash-d` · `wedge-haft` · ore node) — 8–16 frames, ~900 ms
- **[TOOL]** flat `#FF00FF` `wedge-haft` silhouette (pickaxe).
- **[FRAME]** wind-up of an overhead diagonal swing, facing `south`, oriented toward an ore node just ahead.
- **[GROK]** "raises the silhouette overhead and swings it down-forward into the ore node, recoils, returns to the raised wind-up. Loop seamlessly. Static camera. Feet planted."

### `chop` (life skill · `slash-h` · `wedge-haft` · tree) — 8–16 frames, ~900 ms
- **[TOOL]** flat `#FF00FF` `wedge-haft` silhouette (axe).
- **[FRAME]** wind-up of a horizontal side swing, facing `east`, oriented toward a tree trunk ahead.
- **[GROK]** "winds the silhouette back over the shoulder and swings it horizontally into the trunk, recoils, returns to wind-up. Loop seamlessly. Static camera. Feet planted."

### `smith` (life skill · `smash` · `block-haft` · anvil) — 8–16 frames, ~700 ms
- **[TOOL]** flat `#FF00FF` `block-haft` silhouette (hammer), two-handed.
- **[FRAME]** wind-up of a two-hand overhead strike, facing `south`, oriented toward an anvil just ahead.
- **[GROK]** "raises the hammer silhouette overhead two-handed and brings it straight down onto the anvil, bounces, returns to the raised wind-up. Loop seamlessly. Static camera. Feet planted."

### `fish` (life skill · `bob` · `pole` + line · water) — 8–16 frames, ~1200 ms
- **[TOOL]** flat `#FF00FF` `pole` silhouette held out at an angle, thin line to the water.
- **[FRAME]** rod cast out over the water's edge, facing `south`, line in the water ahead.
- **[GROK]** "holds the rod silhouette steady and bobs it gently up and down in a slow rhythmic idle, the line dipping at the water. Loop seamlessly. Static camera. Feet planted."

### Weapon `slash` (combat · `slash-d`/`slash-h` · `blade`) — 4–8 frames, ~220 ms
- **[TOOL]** flat `#FF00FF` `blade` silhouette (sword), one-handed.
- **[FRAME]** wind-up of the swing, facing `{south | east | north | northeast | southwest}`.
- **[GROK]** "snaps the blade silhouette through a fast arc strike and recovers to guard. Static camera. Feet planted." (no loop — one-shot windup→strike→recover)

### Weapon `smash` (combat · `block-haft`) — 4–8 frames, ~300 ms
- **[TOOL]** flat `#FF00FF` `block-haft` silhouette (maul), two-handed.
- **[GROK]** "swings the heavy silhouette overhead and slams it down-forward, recovers. Static camera. Feet planted."

### Weapon `thrust` (combat · `pole`) — 4–8 frames, ~200 ms
- **[TOOL]** flat `#FF00FF` `pole` silhouette (spear), two-handed.
- **[GROK]** "drives the pole silhouette straight forward in a fast stab and retracts to guard. Static camera. Feet planted."

### Weapon `cast` (combat · `pole` + orb) — 4–8 frames, ~350 ms
- **[TOOL]** flat `#FF00FF` `pole` silhouette (staff), raised.
- **[GROK]** "raises the staff silhouette and thrusts it forward to project, settles back. Static camera. Feet planted."

### Weapon `shoot` (combat · `bow-arc`) — 4–8 frames, ~300 ms
- **[TOOL]** flat `#FF00FF` `bow-arc` silhouette, two-handed.
- **[GROK]** "draws the bow silhouette back, holds, releases forward, relaxes. Static camera. Feet planted."

---

## Naming, facings & frame conventions

- **Files:** `public/sprites/player/{pose}-{direction}.png` — the same horizontal-strip
  format the renderer already slices (`src/rendering/playerSprites.js`). Pose name = the
  archetype/skill name: `mine-south.png`, `smith-south.png`, `slash-east.png`.
- **Reduced facings (life skills):** ship **`south` + `east`**; `west` is the existing
  horizontal mirror of `east`. On skill start, snap the character to face the node —
  this mirrors the existing **pickup** behavior, which force-locks facing to 'down'
  during its freeze (see the south-only `pickup` handling in `playerSprites.js`). Weapon
  attacks can grow to the full 5 source dirs (`east, north, northeast, south, southwest`)
  later; missing dirs fall back via the renderer's existing logic.
- **Frame budget:** match the engine's per-pose cycle timing (`cycleMs` in
  `playerSprites.js`). Skill loops 8–16 frames; weapon swings 4–8. Use the per-archetype
  durations above as the `~{ms}` target in the Grok prompt.
- **Tiers:** do **not** regenerate per weapon tier. Recolor the masked `#FF00FF`
  silhouette region of the baked archetype frames with `tools/recolor_*.py`.

---

## Processing path (reuse existing tools)

ChatGPT first frame → Grok animate → then:

1. **Export frames** from the Grok clip.
2. **Stitch** them into one horizontal `{pose}-{dir}.png` strip — model on
   `tools/build_player_attack_sheets.py` / `tools/make_pose_sheet.py`.
   *Tool to add:* `tools/build_skill_sheet.py` — generalize those to an arbitrary pose
   name + N frames (not built yet; this pass is doc + silhouettes only).
3. **Key + de-halo** the white background: `tools/dehalo_outside.py`,
   `tools/zero_transparent_rgb.py`.
4. **Downscale** to frame size: `tools/lanczos_downscale.py`.
5. **Anchors** (FX hooks / station alignment; useful even when the tool is baked):
   `tools/derive_body_anchors.py`, `tools/add_attack_anchors.py` → merges into
   `public/sprites/player/anchors.json`.
6. **Per-tier recolor** of the silhouette region: `tools/recolor_*.py`.

---

## Engine wiring checklist (forward reference — not done in this pass)

Documented so the art stays future-proof. When you're ready to actually play these:

- Add the new pose name(s) to `POSES` in `src/rendering/playerSprites.js`.
- Add a `cycleMs` branch + frame-count handling for the new pose(s) in the same file.
- Bump `VERSION` (cache-busting) in `playerSprites.js`.
- Trigger the pose from the skill/extraction flow in `src/data/lifeSkills.js` (and the
  combat state machine for weapon swings), snapping facing toward the node.

---

## Verification — worked example is the acceptance test

Carry **mining** end-to-end; if it works with no new conventions, every other archetype
follows the same blocks:

1. Fill the blocks → concrete ChatGPT + Grok prompts for `mine-south` (see the `mine`
   section above).
2. Generate, then run processing steps 2–5.
3. Drop `public/sprites/player/mine-south.png` in place; temporarily add `mine` to
   `POSES` locally (or render a GIF with an existing `tools/preview_*.py`) and confirm
   it loops, keys clean, and sits at the right scale beside the `stand`/`jog` sprites —
   the "belongs next to the other sprites" / material-fidelity test from
   `creative-reference.md`.
