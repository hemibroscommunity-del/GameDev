# Memory in a battle (v2.3.3698)

The owner, 2026-10-28: *"The game definitely crashed because it ran out of
memory for me during intense battles (lots of weapon switching, props
destroyed, etc.) I want to try to cut the current memory draw to a quarter of
what it is now."* And: *"Memory seems to be the persistent bottleneck in terms
of performance in this game. Getting that to run as low as possible without
sacrificing performance is the goal."*

## Measuring a battle: `mp-battlemem`

`mp-membudget` (every PR) stands at the Flame Fields' fight and swings a sword.
It never swaps weapons and never breaks anything, so the owner's crash was
outside what it sees.  `mp-battlemem` plays the owner's battle on a phone
(390 x 844 at 3x):

- the sword, the bow and the staff armed through the worker, as a player is;
- at the Flame Fields' inner end, rounds of: each weapon by its key, swings or
  shots and its special (the first round also turning all the way round with
  each, `turnRound`, so every facing is drawn); then every prop round the
  fight broken by a slime's blast (`__btWheelBreak.blast`);
- after each round, the page's memory on mp-membudget's ruler (memprobe.mjs,
  after forced GCs), the scene's node count and the GPU's biggest textures;
- a ledger that counts EVERY PICTURE ONCE, the page's copy and the chip's
  (`out.truth`): every canvas from its creation (its maker's stack), every
  file, every buffer, every texture on the chip;
- the rounds must settle: after round 2, a round adds at most `ROUND_GROWTH`
  (the GPU's pictures made before round 2 and first drawn since left out,
  mp-membudget's rule).

```
node tools/qa/mp/run.mjs battlemem
BT_BATTLE_CYCLES=n    rounds (6)
BT_BATTLE_MS=ms       each weapon's fight (5000)
BT_BATTLE_CENSUS=1    the ledger, every picture once
QA_DIST=dist-prof     an unminified build, so the ledger names the makers
```

## What a battle holds (before this change)

At the end of a round, every picture counted once: **145.6 MB in the page and
95.9 MB on the chip**.  The rest of the page beside it: sound ~30 MB, the
JavaScript heap ~34, buffers ~28, the ground's worker ~30.

| what | page | chip | how many |
|---|---|---|---|
| the walking gear sheets (shirt, plate, greaves, belt) | 18.1 | 18.1 | 64 |
| the monsters' strips | 18.6 | 14.6 | 13 |
| **a broken prop's pieces** (24 props) | **8.6** | **8.6** | 24 |
| canvas text: name plates, labels, messages | 2.7 | 13.7 | 71 |
| the combat poses' gear strips (on the chip only since v2.3.3088) | 0 | 13.9 | 33 |
| the sword's and bow's bodies, torsos and jog legs | 11.5 | 1.3 | 21 |
| the walking body sheets | 8.8 | 0.9 | 25 |
| the ground's pieces (on the chip only since v2.3.3076) | 0 | 8.7 | 56 |

What does not grow: after the second round the readings hold (the hit
effects' pools trim, v2.3.3152; the text pool trims; the scene's node count
levels off).  A battle is not a leak.  It is a peak: everything a fight can
draw, at once, twice (the page's copy and the chip's).

## A broken prop's pieces on the chip only

A broken prop is cut into shards on one canvas a break (wheelShatter.js), about
1.3x its picture.  Nothing reads that canvas back: it is only drawn, and a
black screen's rebuild destroys every heap with the Wheel's objects
(pixiRenderer `destroy`).  So it goes the way of the combat gear strips and the
damage font (gpuOnly.js `keepOnGpuOnly`): uploaded the moment it is made, the
canvas emptied.  And the heaps' cap `HEAP_PX` 6e6 -> 4e6 pixels: at most 16 MB
of the chip (it was 24 on the chip and 24 more in the page), the oldest heap
fading early past it, as before.

Measured (`mp-battlemem`, 24 props broken in a round):

| | before | after |
|---|---|---|
| the pieces' canvases in the page | 8.6 MB | 0 |
| the pieces on the chip | 8.6 MB | 7.9 MB |
| every picture, page + chip | 145.6 + 95.9 | 136.8 + 94.4 |
| the page's canvases at the peak | 101 MB | 93.4 MB |

A shard drawn on its own and read back from the chip (`shardDraw`): 16,943
solid pixels, its canvas 0 x 0.  `?gpucopies` keeps the canvases.

## And the weapons' bodies, once drawn

A swing or a shot swaps your walking figure for the weapon's own body: the
sword's and the bow's body, torso and jog legs, each facing a strip baked in
your colours and drawings on the loading screen (effectsRenderer
`_bakeBodyStrip`), and another player's the first time you see them attack
(`_remoteBodyFramesFor`, `_remoteSheetFramesFor`).  21 canvases, 11.5 MB of
the page on the QA phone.  Nothing reads them back once baked (the shield's arm
is a view of the same texels, blockArm.js; the torso's cut rows are tables;
a re-bake starts from the sheet's own image), and a rebuilt renderer bakes its
own.  But unlike the props they are made long before they are drawn, and many
facings are never drawn in a visit: uploading each as it is made would put
them all on the chip at once.  So each waits until the renderer HAS drawn it
-- its copy is on the chip from then on, whatever happens -- and its canvas
goes then (gpuOnly.js `emptyOnceDrawn`, looked at every 500 ms by the effects
renderer's update).  A facing never drawn keeps its canvas, as before.  In a
battle that swaps weapons, every strip drawn was held twice until now.

Measured (`mp-battlemem`; its first round now turns all the way round with
each weapon, `turnRound`): 7 of the 21 strips drawn by the third round -- the
sword's and the bow's bodies in the facings swung and shot in -- and each let
go of its canvas, 3.7 MB; the strip row of the ledger 11.5 page + 1.3 chip ->
7.8 + 3.7, every strip drawn now held once.  The other 14 are the torsos and
jog legs a swing or a shot WHILE RUNNING draws, which the test does not do; in
a fight on the move they are drawn too, up to 11.5 MB held once rather than
twice.  `__btFxBakes()` counts them (`onChip`, `kept`, `keptMb`), and
`__btGpuOnly().onceDrawn` the MB let go of.

What the page's canvases hold at a battle's peak: 101 MB before (battlemem's
rounds, 2026-10-28) -> 90.8-92.9 MB with both.

## Each other bro on your screen: `mp-peermem`

The owner's question of 2026-10-27, whether townsfolk could walk about.  A
walking townsperson would be drawn the way another player is.  `mp-peermem`
puts a phone in BroTown and brings other players in looks of their own (skin,
trousers, boots, hair, hat) beside it one at a time, each walking round it in
every direction; the phone's memory is read after each.

Measured (three others, each in a look of its own, a keep-alive on every page
so the 2-minute idle logout never closes one):

| | GPU | canvases | art from files | heap | buffers |
|---|---|---|---|---|---|
| alone in BroTown | 71.1 | 68.0 | 121.5 | 25.4 | 21.8 |
| with 1 other | 71.9 | 69.1 | 121.6 | 27.1 | 21.8 |
| with 2 | 72.3 | 69.6 | 121.9 | 27.9 | 21.8 |
| with 3 | 72.6 | 70.0 | 122.0 | 28.5 | 22.2 |

**About 2.5 MB a bro** (GPU +0.5, canvases +0.7, art +0.2, heap +1.0, buffers
+0.1, each MB a bro on average).  An earlier run had the first one cost ~11 MB:
the first other player drawn draws pictures every player shares for the first
time, and the readings swing a few MB from run to run.  So a townsperson
walking about, drawn as a player is, would cost a phone about what a player
does; the townsfolk today are photographed pictures of their own (2.9 MB for
the eight standing; tools/qa/npc-looks.mjs), and walking ones in that style
would need their jog photographed in every direction, about 5.5 MB a walker.

## Toward a quarter

See docs/MEMORY-PLAN.md "In a battle, and toward a quarter (v2.3.3698)": what
holds the rest, and what each further cut would cost.
