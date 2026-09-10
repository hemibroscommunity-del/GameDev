# Commissioning designs for the catalogue (v2.3.2436)

The spec for producing new ready-made designs — for a person, or to hand to
another tool. It is written to be pasted whole.

It supersedes the first version of this spec, which got two things wrong. Both
corrections are marked **CORRECTION** below; if you are re-commissioning from
an older copy, those are the lines that matter.

---

## What a design is

Not a picture file. A **16×16 grid of palette indices**, one hex character per
cell, 256 characters in total. There is no blending, no anti-aliasing and no
opacity: a cell is one of sixteen values.

## The palette — these sixteen and no others

| | | | |
|---|---|---|---|
| `0` transparent | `4` `#e2803a` orange | `8` `#3f7fd0` blue | `c` `#8a5a3c` brown |
| `1` `#1b1f24` near-black | `5` `#f2c94c` yellow | `9` `#2b3a67` navy | `d` `#9aa3ab` light grey |
| `2` `#ffffff` white | `6` `#5aa84f` green | `a` `#8e5ad0` purple | `e` `#5c6670` grey |
| `3` `#c8402f` red | `7` `#2f8f7d` teal | `b` `#d76ba8` pink | `f` `#6fd6e0` aqua |

> **CORRECTION.** Index `8` is a normal, usable colour. A previous commission
> came back with `"forbidden_indices": ["8"]` and no blue anywhere in thirty
> designs — its shield came out yellow because of it. There is no forbidden
> index. The authority is `ART_PALETTE` in
> `src/rendering/traits/playerArt.js`; nothing else.

## The rule that kills most designs

In play, the whole 16×16 renders about **20 device pixels across**. That is
roughly **1.25 pixels per cell** — and it is the number that justified a 16×16
grid in the first place (see the header of `playerArt.js`).

At that size, detail inside a design does not read *small*. It does not read
*at all*. Only the silhouette survives.

The test every design must pass: **render it 20 pixels wide and look at it.**
If you cannot tell what it is, it has failed, however good it looks large.

In practice:

- One bold shape filling most of the grid. Not a scene.
- Two to four colours. Five is usually too many.
- No one-cell details — no pupils, no thin whiskers, no single-cell
  highlights. They vanish.
- An outline must be a full cell wide and must close. A broken outline reads
  as noise.
- **A design whose distinguishing feature is one cell wide cannot be saved.**
  A spider was cut for this: its legs are 1 cell, and 1 cell is invisible.

## Internal contrast, not boldness

> **CORRECTION.** The first version of this spec said near-black is the classic
> tattoo colour and reads on every skin tone. That is wrong.

Skin runs from `#f9ece2` (alabaster) to `#50382a` (ebony) — see `SKIN_CATALOG`
in `src/rendering/playerSkins.js`. So:

- an all-dark design disappears on **dark** skin;
- an all-light design disappears on **pale** skin.

What survives everywhere carries **both a light and a dark value**. That is why
most of the catalogue is a bright fill inside a near-black outline, and it is
the single strongest predictor of whether a design works.

## It is masked to the body part

The grid is fitted to a box on the chest, face, arm or leg and then clipped
per-pixel to that part's real outline (`playerDecal.js`). Cells in the corners
fall off the body and paint nothing.

- Treat the outer 2-cell border as **bleed**: fill it if the shape wants to,
  but put nothing there that the design needs in order to be recognised.
  A design should still read from its centred **12×12** core alone.
- Never rely on a full-bleed background. Transparent is the correct default —
  a design is a mark *on skin*, not a sticker with a backdrop.
- The chest, face and arm take the full region box; the **pants** are tighter
  (78% × 62%), and the **arm** is narrow and tall, so wide subjects distort
  there. Designs meant for arms should be bands or vertically stacked shapes.

## Symmetry is worth real memory

A design that is identical flipped left-to-right lets the engine skip baking a
second mirrored copy of the character sheets (`artIsSymmetric`, `playerArt.js`).

Measured from the real sheet dimensions, what an **asymmetric** design costs
depends on where it is worn:

| worn on | mirrored twin costs |
|---|---|
| chest, face or front of the pants | **~25 MB** |
| a back canvas (back tattoo, back of head, back of the pants) | **~8 MB** |
| the arms — the arm is never side-swapped, so every strip twins | **~34 MB** |

That is per session and it stays resident.

So if the subject is naturally symmetric — skull, heart, star, sun, anchor,
shield, crown — make it **exactly** symmetric: column *x* must equal column
*15−x* on every row. Check it; one stray cell costs the whole saving. If the
subject is naturally asymmetric (snake, comet, lightning), do not force it.

**A trap that has caught two designs.** If you author only a left half and
mirror it, and that half does not reach the centre column, you get **two
objects instead of one**. One rose became two roses; one clover became a
trident. Neither is visible in the data — both were obvious the moment
somebody looked at a picture.

## Avoiding duplicates

Two designs read as the same design when they share a **silhouette and a
palette**. Cell-by-cell similarity does not predict this and should not be
used as a gate: a Sword and a Dagger that had to be merged scored *lower* on
cell agreement (66%) than Heart/Broken Heart (84%) or Skull/Sugar Skull (77%),
neither of which reads as a duplicate. Look at the sheet.

## Output format

For each design, exactly this:

```
name:     short, 1-3 words
category: tribal | skull | fire | flora | blade | beast | sky | symbol
rows:     16 strings, each exactly 16 characters, from 0-9 and a-f
```

Worked example:

```
name: Heart
category: flora
rows:
  0000000000000000
  0000000000000000
  0001100000011000
  0011330000331100
  0133333003333310
  1333333333333331
  1333333333333331
  1333333333333331
  0133333333333310
  0013333333333100
  0001333333331000
  0000133333310000
  0000013333100000
  0000001331000000
  0000000110000000
  0000000000000000
```

## Self-check before delivering

1. Exactly 16 rows.
2. Every row exactly 16 characters.
3. Every character is `0`-`9` or `a`-`f`.
4. At least one non-zero cell.
5. The design is still recognisable from the centred 12×12 core alone.
   Ink **may** extend past it — nearly half the shipped catalogue does, and
   a heart or a shield that fills the grid is correct. What must not live
   out there is the detail that makes the design identifiable, because on
   a narrow surface it is clipped away.
6. Every design claimed symmetric really has column *x* == column *15−x* on
   all 16 rows.

State, per design, whether all six passed.

This catches malformed grids. It **cannot** catch a design that turns to mush
at 20px — only rendering it can. Expect that to be the larger rejection
category.

## Adding them to the game

Entries live in `src/rendering/traits/designCatalog.js` as `{ id, name, cat,
rows }`, where `rows` is the sixteen strings kept readable in source. The flat
256-character form and the per-colour pieces are derived there; nothing else
needs touching, and no server change is involved.

Two things guard the file:

- entries that are malformed are dropped rather than shipped, and
  `DESIGN_COUNT_AUTHORED` exports the count *before* that gate so a silent drop
  fails a test instead of shipping a short catalogue;
- `tools/qa/mp/run.mjs designs` asserts the gallery shows the whole catalogue
  and that applying one puts exactly that design on the character.

Render a contact sheet before accepting anything. That is the only check that
catches the failure this format is prone to.
