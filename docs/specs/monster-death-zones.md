# Monsters die in pieces that fit them (v2.3.3954)

The owner: *"Make actual monster death animations"*, and *"Death animation
idea label zones for each monster that can apply physics and effects for."*

## What a player sees

Every monster drawn from sprite sheets has a death of its own, built from its
own picture:

| Look | Its death |
|---|---|
| Slime (and the moss slime, blue slime and mire wisp, drawn on its sheets) | its crown tears off in two gobs of goo that fly, the rest splats flat where it sat |
| Snowman | his hat and head pop off and the head **rolls**, his twig arms fly, his body bursts into snow and falls in, the drift he stands in stays |
| Fire goblin | he lets his torch fall, crumples where he stands, and the flame of his hair gutters out |
| Skeleton | every bone goes its own way: the skull pops and rolls, the arms fly, ribs, pelvis and legs clatter down and skitter |
| Mummy (killed before it sheds) | its head pops off, its arms fall away, its middle comes down in a heap of wrappings, its legs give way |
| Fishman | he goes over like a landed fish and flops on the ground, wet |
| Bog lurker | it sinks into a spreading pool of its own mud |
| Rock monster | it crumbles: five stones come down where they were, its dust stays |
| Thorn shambler | it splinters: the same breaks, but wood and thorn, thrown, in leaves |

Every one opens on a short **beat** (~120 ms, `BEAT_MS`): the whole body
squashed about its feet and flashed white. Then the parts separate, each
throwing what it is made of (snow, goo, bone chips, stone dust, splinters and
leaves, linen ash, embers, a goblin's blood): the same crisp material bursts a
hit throws (`hitMaterialFx.js`), one per material, and a spray of drops. A
death lasts as long as the cut deaths: 1.75 s, fading from 1.3 s.

**Variety is kept.** A look with zones dies its own way half the time; the
other half it rolls today's deaths exactly as before (its strip, or sliced,
beheaded, legless, toppled) -- the owner's v2.3.2913 *"include the normal
death too for variety"*. And the cut deaths now cut where its zones say: the
snowman's neck under his head (0.40 of his height, not the guessed 0.28), a
skeleton's neck under its skull and its hip over its legs.

**Every phone sees the same death**: which death, and every speed, side and
spin in it, come from a seeded roll on the monster's id and where it died.

## How to watch them

- `?deathkind=own` on the address plays every look's own death on every kill
  (this phone only). `?deathkind=slice`, `decap`, `leg`, `topple` or `normal`
  play that one instead.
- `?deathzones=0` turns the zone deaths off for one phone: everything dies as
  it did before v2.3.3954 (the cuts back on their guessed lines too).
- QA: `window.__btDeathKind = 'own'` (wins over the address),
  `window.__btDeathSlow = 8` (slow motion), `window.__btMonsterDeath(id)` (what
  one corpse is doing: `own` names its look, view, zones and how each came
  off), `window.__btDeathZones()` (made, playing, let go).

## The table: `src/data/monsterDeathZones.js`

Per look, a `front` view (north, south and the diagonals) and, where the art
needs it, a `side` view (facing east or west: the snowman and the skeleton).
A view is at most 8 zones that **tile** its body box: every point of the box
in exactly one zone, so the pieces together are the whole picture, drawn once.

**Units.** Fractions (0..1) of the **body box**: the box round the pixels of
the frame the monster died on that are at least a quarter opaque (alpha > 60:
`monsterDeathFx.js coverage()`, read back from the GPU). It is the same box
whatever a frame's padding, so one table serves every frame of a look. x runs
left to right and y top to bottom in the picture's own space: a monster facing
left is the same picture mirrored and its pieces are drawn under the same
mirror, so the zones mirror with it for free. An edge at 0 or 1 reaches out to
the frame's own edge, so a faint pixel outside the box (a spark, a snowflake)
still goes with its zone.

A zone:

| Field | Meaning |
|---|---|
| `id` | its name, unique in its view |
| `part` | `head`, `torso`, `base`, `arms`, `legs`, `prop`, `core` |
| `rect` | `[x0, y0, x1, y1]`: drawn as a sub-frame Texture of the same picture (no mask, so it batches) |
| `poly` | `[[x, y], ...]` instead: a ragged edge (a rock's break, a slime's tear), drawn through a Graphics mask |
| `mat` | `snow`, `goo`, `flesh`, `bone`, `stone`, `wood`, `cloth`, `flame`: its burst and spray; `flame` also gutters out |
| `off` | how it comes off: `fly` (thrown out from the middle, spinning), `pop` (thrown up, as a head), `crumble` (drops where it was, tumbling), `slump` (sags flat; every slump zone of a death about one point, so they sag as one), `hinge` (tips over about its foot), `stays` |
| `mass` | 0.2 (a twig) .. 4 (a boulder): heavier is thrown slower and spins less |
| `bounce` | 0 .. 0.9: how much of its fall it bounces back (at most twice) |
| `roll` | 0 .. 1: how far it rolls once down |
| `dir` | -1 / 1: the side it goes (default: away from the body's middle) |
| `push`, `lift` | multiply its sideways / upward speed |
| `delay` | ms after the beat before it goes |
| `squash`, `lean`, `sink` | a slump's flatness, its lean (radians, over the foot it leans to), how far it sinks (body heights) |
| `flop` | a hinge's flops once down |
| `fx` | its burst where its material's is not the one (`snow goo bone stone wood leaf ash ember goblin`) |

A look may also say `blob` (the cut deaths treat it as one: no neck) and
`puddle` (a pool of its colour spreads under it). `DEATH_ZONE_ALIAS` sends the
looks drawn on another's sheets to its table (the slime family).

### How the zones were measured

Each look's frames were cropped to their body box (alpha > 60, exactly as the
game measures it), enlarged and laid under a 10% grid, and the parts read off
by eye: `slime-idle-v5` frame 0; the snowman's `snowman-s`, `-n`, `-sw`, `-e`
and the hit strip; the fire goblin's `walk-s`, `-n`, `-sw`, `-e` and `hit-s`;
the skeleton's `run-s`, `-sw` (frames 0 and 4), `-w`; the mummy's `walk-s`,
`-w`; the fishman's and the rock monster's single pose (`walk-south`, the
same picture every direction). The frames vary (a walk cycle swings its arms,
the hit strip throws them up), so a zone is drawn generously round where its
part sits across them: a piece that takes a little of its neighbour reads
fine; a zone on thin air would throw nothing.

To adjust one: crop a frame the same way (any image tool: crop to the
opaque pixels, read the fractions off a grid), change the numbers, and run
`cd server && npm test -- death-zones`. Its section 4 reads the sheets the
zones were labelled from and fails a moving zone that holds less than 1/25
of the monster's own pixels (a skeleton's limbs are thin bones across open
air: its sparsest, an arm run sideways, is 1/20).

### Adding a monster

1. Give its look an entry in `DEATH_ZONES` (its variant key, as
   `MONSTER_VARIANTS` names it), a `front` view, and a `side` view if its
   east/west art is a different shape. If it is drawn from another look's
   sheets, an alias in `DEATH_ZONE_ALIAS` is enough.
2. Make the zones tile the box (the test samples it) and keep to 8.
3. Add its frame to section 4's `FRAMES` in `server/test/death-zones.test.mjs`
   and to `LOOKS` in `tools/qa/mp/mp-deathzones.mjs`.
4. `npm test -- death-zones`, then `node tools/qa/mp/run.mjs deathzones`
   (`DZ_LOOKS=<key>` runs just that look) and look at its pictures in
   `tools/qa/mp/out/deathzones/`.

A look without an entry dies today's way.

## How it is drawn: `src/rendering/monsterDeathZonesFx.js`

Hooked into `monsterDeathFx.js drawMonsterDeath` (the death call site in
`entityRenderer.js` is unchanged): the roll (`rollDeathKind`, + `own`) picks
the death on the first dead frame, and a zone death is built from the body
sprite as it stood on its last living frame, as the cuts are.

- **Pieces.** A rectangle zone is a `Texture` of a sub-frame of the same
  source (the strip's frame, minus its trim, plus the rectangle), placed where
  that part of the picture was: it batches with everything else. Each takes a
  texel of its inside neighbours (TRAPS §114), so no hairline opens between
  them in the beat. A polygon zone is a Sprite of the whole frame masked by a
  Graphics (the stencil, never a Sprite mask: TRAPS §221). A sinking piece is
  clipped at the ground by one Graphics. Pieces wear the monster's own tint
  (`_btBaseTint`), never the killing blow's red (v2.3.3499).
- **Physics.** The cuts' own: fixed sub-steps of at most 1/60 s, gravity in
  body heights, every piece's collision outline the hull of its own body cells,
  so a piece lies on what it really has. The upward throw is capped (~0.6 s
  in the air) and a piece bounces at most twice, so everything is down and
  still before the fade.
- **The cuts' tools** (`coverage`, `bodyOf`, `setHinge`, ...) are handed in
  as a kit by monsterDeathFx, so the new file imports nothing of it.

## Memory and caps

- **No new art and no new memory**: the pieces are the look's own frame, which
  loaded with the look (in the Wheel as you walk toward it,
  `wheelMonsterArt.js`; a monster whose look is not ready is not drawn, so it
  cannot die in pieces either). Nothing reads a picture's pixels on the CPU:
  the body's coverage is rendered and read back from the GPU, as the cuts do
  (TRAPS §165/§166 do not apply).
- **At most 8 zone deaths at once (`MAX_LIVE`) and 8 pieces each
  (`MAX_PIECES`)**; past that, today's simpler death plays.
- **Everything a death makes is destroyed when it ends**: its root with every
  piece, mask and Graphics, then each sub-frame Texture (`destroy(false)`: the
  texture only, never the look's source). A death whose display went first
  (the monster left) is found and let go by the next one (`prune`).
- `mp-membudget` holds the lines; this adds nothing it reads.

## Tests

- `server/test/death-zones.test.mjs`: the table (parts, materials, ranges,
  tiling, caps), every drawn look has a death, the cut lines, the zones against
  the art (section 4), the wiring read from the source.
- `node tools/qa/mp/run.mjs deathzones` (the world, a phone): every look's own
  death, front and side; the beat; its own colour; down and still on the
  ground; gone and let go afterwards; the cap of 8; the same death every phone;
  `?deathkind=own` and `?deathzones=0`. Pictures: `tools/qa/mp/out/deathzones/`.
- `mp-deathcut` (the old map, frozen) still holds the cut deaths.
