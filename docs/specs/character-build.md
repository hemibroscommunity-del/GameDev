# Height and frame — character build (v2.3.1953)

Owner: *"is there a way to add 'height' to your character as an option? Just
thinking creatively here"* → *"Yes build the heights too. I liked the previews
you built. Whatever option choices you think are best. Maybe also frame
wideness (thin, medium, large)."*

Two independent cosmetic axes on the player figure. Three options each, so
nine silhouettes, from one sheet of art.

## The numbers

`src/rendering/traits/buildCatalog.js` owns both catalogs and is the only
place these live.

| Height | ×Y | | Frame | ×X |
|---|---|---|---|---|
| Short | 0.88 | | Thin | 0.87 |
| Average | 1.00 | | Medium | 1.00 |
| Tall | 1.13 | | Large | 1.17 |

Measured, not guessed: rendered as 3×3 contact sheets at several spreads,
south and southwest, bare and with hat + beard + shirt. ±10% was real but you
had to put two figures side by side to see it; ±18% was clearly legible but the
HEAD started reading as stretched rather than tall. Frame gets slightly more
room than height because horizontal stretch on this figure is mostly shoulders
and boots, which absorb it better than a face does.

## Cosmetic only — structurally, not by care

The build is a **render scale on a display object** and nothing else. It is
applied to the Pixi display container in `entityRenderer` and to the canvas
transform in `characterPortrait`. No hitbox, reach, speed or collision radius
reads it, and none can, because none of them touch a display object. If `tall`
grew the hurtbox it would be a downgrade; if it grew melee reach it would be
pay-to-be-lanky.

## In the world (`entityRenderer`)

`_applyBuildScale(display, pscale, heightId, frameId)` — one call on the local
path and one on the remote path, both where the zone scale was already being
applied.

**Why the container and not the sprites.** The figure is the body, three body
regions, four gear layers, a shirt, hair, a beard, a hat, two shield clones, a
weapon container and a block arm, every one placed from the body's transform in
256-space with per-facing anchors and dir-scales. Threading a second axis
through every placement helper would put a beard-drifts-off-the-chin bug in
every facing. One non-uniform scale on the container above all of it moves the
whole figure with its alignment intact by construction.

**The feet stay on the ground.** The container's origin is the sprite's
*centre*; the boots sit ~41.6 container units below it — derived live from
`BODY_ROWS[pose][dir].feet`, `bodyDirScale` and `LOCAL_SCALE` rather than
stated as a constant. Growth below the origin is removed from `display.y`, so
the boots stay pinned to the world position the server knows about. (The first
cut used `sheetGeometry.FEET_OFFSET = 24`, which is a *touch* anchor measuring
a different thing, and the boots came out 2.9 world px low on a tall bro;
`mp-build` measured exactly that.)

**The HUD does not stretch.** Both display factories now put the name plate,
combo badge, threat skull, floating vitals and duel bar into one
`display._uiLayer`, which carries the inverse scale. Their *positions* still
ride the build — the plate under a tall bro sits under his actual boots — but
their size and shape are identical on every build. The v2.3.1887
hide-by-EXCEPTION death sweep descends one level (`_hideExceptDeep`) so that
rule is literally unchanged for the nodes that moved.

## In the portrait (`characterPortrait`)

The same two multipliers as a canvas transform about the feet and the centre
line, applied *before* the ground shadow so it widens with a broad bro.

### PORTRAIT_FIT = 0.94

A 256 frame has no spare room: measured, a bare figure spans y 0.125 to its
feet at 0.977, an afro under a sombrero starts at 0.059, and five oversized
hats (wizard hat, both crowns, shark hat, axe head over an afro) **already**
reach y 0 and are clipped today. There is no way to show a 13%-taller figure
in a fixed box without making the reference smaller — that is what taller
means — so every full-figure portrait draws through one constant:

```
0.977 / ((0.977 - 0.059) × 1.13) = 0.942     [afro + sombrero, tall]
```

It applies to *every* build including average, or `tall` and `average` would be
measured against different references and the comparison would be a lie.
Fitting the five already-clipped hats would need 0.885 — a 12% shrink on every
portrait in the game to accommodate hats that are cropped anyway. Not taken.

The **headshot** path opts out (`portraitDataUrl` passes
`buildFit: false` plus the default build): it crops in raw pixel coordinates,
and a head-and-shoulders crop has no silhouette to read anyway — the same
stretch just looks like a long face.

Both cropping previews — the creator stage and the designer's worn pane — map
their frames through `PORTRAIT_FIT × heightMul` about the feet, because those
frames are anchored on body parts and a tall bro's chest is higher up the
canvas. `FOCUS_FULL` deliberately does **not**: it is the stage, a fixed frame
the figure is measured against, and scaling it with the build would cancel the
growth exactly.

## The wire

Two short keys, sent only when non-default, so a player who never opens the tab
costs nothing:

| Key | Meaning |
|---|---|
| `hg` | height id (`short` / `tall`) |
| `fr` | frame id (`thin` / `large`) |

Both are on `JOIN_COSMETIC_KEYS` (`server/src/join.js`) and
`TRACK_COSMETIC_KEYS` (`server/src/index.js`) — the pair of gates v2.3.1939
shipped a key into one of and not the other. They ride the flat 64-char cap;
they are not drawing keys. The receiving client maps both through its own
catalogs and answers the default for anything unknown, so a forged value can
only ever select a build the catalog already contains, and reaches nothing but
a transform.

`join` puts them in the permanent `char:<id>` look, so a build survives logging
in on a new device; the 2 s `track` relay carries them too, so a change lands on
everyone's screen without a reconnect.

## The picker

A ninth creator tab, **Build**, whose two rows sit in the options grid (the
strip is 3-wide at this column width, so heights land on row one and frames on
row two, adjacent and the same size). Nine tabs also moved `.bt-cc-tabs` to a
3×3 grid, which makes every tab ~30% wider.

The tiles draw an inline-SVG silhouette at **2.2× the option's real deviation**
from average. It is an icon, not a preview — the preview is the bro on the
stage, who moves by the real amount the instant you tap — and understating the
choice would make three tiles look identical.

`Randomize Look` rolls the build too.

## Tests

- `tools/qa/mp/mp-build.mjs` (18 assertions, real worker + two real browsers):
  the figure is 1.13× taller and 1.17× wider **in screen pixels** off the
  painted frame; the two axes are independent; the boots land the same distance
  below the player's world y on every build; the name plate is drawn at the
  same accumulated scale on a huge bro as on an average one; and a peer's build
  survives both the join gate and the relay cycles.
- `server/test/anticheat.test.mjs` — `hg`/`fr` survive the `track` allowlist.
- `server/test/identity.test.mjs` — both persist into the stored `look`.
- `pixiRenderer.buildProbe(peerName?)` is the read-only probe all of the above
  measure through.
