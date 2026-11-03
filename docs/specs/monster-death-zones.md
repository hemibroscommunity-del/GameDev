# Monsters die in pieces that fit them (v2.3.3954)

The owner: *"Make actual monster death animations"*, and *"Death animation
idea label zones for each monster that can apply physics and effects for."*
Then, refining it: *"what if you had premade sections of each monster so you
could apply creative death explosions (still appropriate for the monster
material - like snowman is snow) but having premade sections like head, eyes,
arms, torso, legs, etc. that can separate and simulate physics based on the
direction they're hit in. Death animations are just fun part of the game
loop"*. So every death below has two sizes (an ordinary kill and a big
finishing blow), its pieces go the way the killing blow went, and a look's
eyes are pieces of their own.

## What a player sees

Every monster drawn from sprite sheets has a death of its own, built from its
own picture:

| Look | An ordinary kill (the gentler collapse) | A big finishing blow (the explosion) |
|---|---|---|
| Slime (and the moss slime, blue slime and mire wisp, drawn on its sheets) | its crown tears off in two gobs of goo that slop off its sides, the rest splats flat where it sat | the two gobs are flung, the splat goes flat in a blast of goo in its own colour |
| Snowman | his hat and head pop off and the head **rolls**, his coal eyes pop out and bounce, his twig arms drop off, his body sags into a heap of snow, the drift he stands in stays | hat, head and eyes thrown high, the twig arms fly, the body bursts and tumbles away in a burst of snow |
| Fire goblin | he lets his torch fall, crumples where he stands, his yellow eyes pop, and the flame of his hair gutters out | the torch flung in embers, the flame leaps off his head guttering, he topples over the way he was hit, in smoke |
| Skeleton | its bones come down in a heap: the skull pops and rolls, arms, ribs, pelvis and legs clatter down where it stood | every bone goes its own way in a spray of bone chips |
| Mummy (killed before it sheds) | its head pops off, its red eyes pop out of the wrappings, its arms fall away, its middle comes down in a heap of wrappings, its legs give way | arms and middle thrown in linen ash, the legs topple over |
| Fishman | he goes over like a landed fish and flops on the ground, wet; his eye pops out | knocked over the way he was hit, in a splash of water |
| Bog lurker | it sinks into a spreading pool of its own mud, its eye popping free | the same, in a splash of mud |
| Rock monster | it crumbles: five stones come down where they were, its two glowing eyes pop out, its dust stays | the stones are thrown in dust and pebbles |
| Thorn shambler | it splinters: the same breaks, but wood and thorn, coming down | thrown, in leaves and splinters |

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
The blow's push (below) adds to those numbers without drawing any of its own.

### Which way the pieces go: the killing blow

`src/game/deathBlow.js` writes the blow down on the monster (`m._deathBlow`)
from what the phone already knows (nothing new on the wire, no server change):

- **Every hit the server reports** (`monster_hit`, on every phone; one line in
  `gameEvents.js`): the direction is from the attacker toward the monster --
  you (`S.player`) for your own hits, or another player where this phone can
  see them (`S.others`). The last hit is the killing one (the worker sends the
  hit, then the kill, in the same flush).
- **Your own swing or shot at its contact** (`combatHelpers.spawnHitDebris`
  with `mine`, set at the melee and the projectile hit sites): the swing's
  direction, or the arrow's / bolt's own travel, which wins over your position.

The death reads it once, when it starts. Every thrown piece is pushed along
it on top of its seeded throw -- a light piece (an eye, a hat, an arm, a chip)
the farther, a heavy stone barely -- across the screen and along the ground
(a piece thrown up the screen lands on its own, higher ground line); a piece
the seeded throw sends back toward the killer goes only a little that way; a
crumpling body leans, and a toppling one falls, the way it was hit; the
material bursts go that way too.

**Where phones can differ:** only the push. A phone that does not know who
struck -- the killer off its screen, or a source that is not a player (a burn
tick from nobody it can see) -- plays the same death with the seeded direction
only. A blow older than 4 s (`BLOW_FRESH_MS`) is no blow.

### Ordinary or big

A big finishing blow is what the hit marks: a **crit** (`isCrit`), an
**ability** (Shield Bash, Whirlwind, the lunge: `ability`), an **Element
Burst** (`burst`) or an **elemental collision** (`collision`) -- the server's
own marks, the same on every phone -- or, on **your own phone only**, your
**special** (the sword's, the bow's volley, the staff's big bolt), which the
server's event does not mark: another phone sees your special as big only
when it was also a crit.

On a big blow a look with zones always dies its own death (the explosion);
an ordinary kill rolls as before (its own death half the time, the cuts and
the normal death the other half). In the explosion every zone that can move
goes its `big` way (`bigOff`: what crumbles is thrown, a light sagging piece
is thrown and a heavy one topples; a zone may name its own), thrown harder,
with twice the spray, a harder beat, and a blast of what the look is made of
along the blow (`bigFx`: a snowman's snow, a goblin's smoke, a rock's dust and
pebbles, a skeleton's bone, a fishman's water, a bog lurker's mud, a
shambler's leaves and splinters, a slime's goo), on top of the bursts each
material throws.

### The eyes

A look whose picture shows its eyes has them as small zones of their own
(`part: 'eyes'`) that pop out and bounce, cut from the frame like every other
piece: the snowman (both coal eyes facing you, one side on, none from behind),
the fire goblin and the mummy (facing you), the fishman and the bog lurker
(one), the rock monster and the thorn shambler (two). The slime has none on
its sheets and a skeleton's sockets are its skull's. An eye is a hole cut in
the zone round it (`cut`), so that zone becomes a masked piece with holes; where
the face is not shown (`faces`), the eye is not a zone and its pixels stay
with the head.

## How to watch them

- `?deathkind=own` on the address plays every look's own death on every kill
  (this phone only). `?deathkind=slice`, `decap`, `leg`, `topple` or `normal`
  play that one instead.
- `?deathzones=0` turns the zone deaths off for one phone: everything dies as
  it did before v2.3.3954 (the cuts back on their guessed lines too).
- `?deathbig=1` makes every kill's own death the **big** one (the explosion),
  `?deathbig=0` the **ordinary** one, whatever the blow was: so
  `?deathkind=own&deathbig=1` watches every look explode and
  `?deathkind=own&deathbig=0` watches every look collapse. The direction is
  still the real blow's: kill with the monster on your right and the pieces
  go right.
- QA: `window.__btDeathKind = 'own'` (wins over the address),
  `window.__btDeathBig = true / false` (wins over `?deathbig`),
  `window.__btDeathSlow = 8` (slow motion), `window.__btMonsterDeath(id)` (what
  one corpse is doing: `own` names its look, view, zones and how each came
  off, `big`, the `blow` it knew, how many pieces were `thrown`, its `eyes`,
  and the pieces' `drift` from where they started), `window.__btDeathZones()`
  (made, playing, let go).

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
| `part` | `head`, `eyes`, `torso`, `base`, `arms`, `legs`, `prop`, `core` |
| `rect` | `[x0, y0, x1, y1]`: drawn as a sub-frame Texture of the same picture (no mask, so it batches) |
| `poly` | `[[x, y], ...]` instead: a ragged edge (a rock's break, a slime's tear), drawn through a Graphics mask |
| `mat` | `snow`, `goo`, `flesh`, `bone`, `stone`, `wood`, `cloth`, `flame`: its burst and spray; `flame` also gutters out |
| `off` | how it comes off in an ORDINARY death: `fly` (thrown out from the middle, spinning), `pop` (thrown up, as a head), `crumble` (drops where it was, tumbling), `slump` (sags flat; every slump zone of a death about one point, so they sag as one), `hinge` (tips over about its foot), `stays` |
| `big` | how it comes off in a BIG one, where `bigOff`'s default (crumble: fly; slump: fly if light, hinge if mass >= 2; the rest as `off`) is not it |
| `cut` | the ids of zones that are holes in this one (its eyes): each wholly inside it, clear of its edge (the check fails one across it: a Graphics hole across an edge triangulates into garbage) |
| `faces` | the facings it exists in (an eye where the face shows); elsewhere it is not a zone and the zone it was cut from keeps its pixels |
| `mass` | 0.2 (a twig) .. 4 (a boulder): heavier is thrown slower and spins less |
| `bounce` | 0 .. 0.9: how much of its fall it bounces back (at most twice) |
| `roll` | 0 .. 1: how far it rolls once down |
| `dir` | -1 / 1: the side it goes (default: away from the body's middle) |
| `push`, `lift` | multiply its sideways / upward speed |
| `delay` | ms after the beat before it goes |
| `squash`, `lean`, `sink` | a slump's flatness, its lean (radians, over the foot it leans to), how far it sinks (body heights) |
| `flop` | a hinge's flops once down |
| `fx` | its burst where its material's is not the one (`snow goo bone stone wood leaf ash ember goblin`) |

A look may also say `blob` (the cut deaths treat it as one: no neck),
`puddle` (a pool of its colour spreads under it), `bigFx` (the bursts of its
material a big death throws) and `flip` (the facings drawn from a file that is
its front picture mirrored -- the fishman's and the rock monster's
`walk-west.png`, for west and the western diagonals -- where every zone is
mirrored; a facing the renderer mirrors itself needs nothing).
`deathZonesFor(key, facing)` resolves a view for one facing (its eyes, its
holes, its mirror), once a look and facing. `DEATH_ZONE_ALIAS` sends the
looks drawn on another's sheets to its table (the slime family).

### How the zones were measured

Each look's frames were cropped to their body box (alpha > 60, exactly as the
game measures it), enlarged and laid under a 10% grid, and the parts read off
by eye: `slime-idle-v5` frame 0; the snowman's `snowman-s`, `-n`, `-sw`, `-e`
and the hit strip; the fire goblin's `walk-s`, `-n`, `-sw`, `-e` and `hit-s`;
the skeleton's `run-s`, `-sw` (frames 0 and 4), `-w`; the mummy's `walk-s`,
`-w`; the fishman's and the rock monster's single pose (`walk-south`,
the same picture every direction). v2.3.3954's eyes were measured the same
way under a 5% grid, and each look's eye pixels found by their colour on every
frame of its strip (the snowman's and the mummy's red, the goblin's yellow,
the fishman's red iris, the rock monster's red glow); the rock monster's
breaks were moved so each glowing eye sits wholly inside one stone. The
measuring scripts were throwaway (a crop to alpha > 60 under a grid, and a
flood fill of the eye colour); any image tool does the same. The frames vary (a walk cycle swings its arms,
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
   sheets, an alias in `DEATH_ZONE_ALIAS` is enough. Give each zone its
   ordinary `off`, and a `big` where the default is not right; give the look
   its `bigFx`.
2. Make the zones tile the box (the test samples it, every facing) and keep
   to 8 a facing, eyes included. Eyes: the `eye()` helper, a `cut` in the zone
   round them, `faces` where the face shows, `flip` if its west file is the
   front mirrored.
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
  still before the fade. A piece thrown along the ground (the blow's depth)
  carries its own ground line (`gz`, at most 1.2 body heights off the body's).
- **A zone with holes** (the eyes in a head) is the frame under a Graphics
  mask: its outline filled, its holes one path cut once (`Graphics.cut()`).
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
  tiling every facing, holes inside their zones, caps), every drawn look has a
  death, the cut lines, the zones against the art (section 4: the eyes too),
  the wiring read from the source; the eyes where the face shows and mirrored
  with a mirrored file (6); a big blow throws more than an ordinary kill, every
  look and facing (7); the blow's direction and size from you, a seen player or
  nobody, the contact winning, a stale blow none, and the push drawing nothing
  from the seeded roll (8).
- `node tools/qa/mp/run.mjs deathzones` (the world, a phone): every look's own
  death, front and side; the beat; its own colour; down and still on the
  ground; gone and let go afterwards; the cap of 8; the same death every phone;
  `?deathkind=own` and `?deathzones=0`; and (10) on a sample of looks (slime,
  snowman, fire goblin, skeleton, rock monster, fishman), each killed by a real
  `monster_hit` from you through the game's own handler: a plain hit the
  ordinary death and a crit the big one, the big throwing more, the eyes as
  pieces, the pieces' mean moving away from you (right with the monster on your
  right, left for two of them on your left), all let go; (11) `?deathbig=1`.
  `DZ_LOOKS=` and `DZ_BLOW=` run some looks only. Pictures:
  `tools/qa/mp/out/deathzones/` (`blow-<look>-<ordinary|big>[-left]-1..3.png`
  for the blow sample).
- `mp-deathcut` (the old map, frozen) still holds the cut deaths.
