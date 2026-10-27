# The fire catches in code (v2.3.3666)

The owner, 2026-10-27:

> Also I think you should work on the fire starting animation to replace the
> log and flame in the animation with actual log art and code drawn smoke and
> flames (actual lit fire is code drawn)

> It might be better to just remove the log and flame all together. The flame
> looks much less realistic to what you can do with code. Keeping the log is
> optional, I don't know which is better

## What it was

Lighting a fire plays the owner's eight-frame strip (v2.3.1715,
`firemaking-strip.webp`, 384 x 512 a frame) for 0.7 s, and then the game's own
campfire (`campfireFx.js`, drawn in code since v2.3.2846) burns for 45 s.

- **The strip painted its own fire.** From the strike (frame 3) it showed a
  cartoon flame, sparks, a column of grey smoke and a cream glow behind it all,
  painted onto the log.
- **When the light ended, that fire was swapped for another.** The campfire
  appeared about 25 px to one side, in a different style, on two crossed logs.
- **The bro jumped sideways twice.** He stands at x 243 of his 384 px frame,
  not in its middle. So for the whole light he was drawn 14 world px to the
  side of where you stand, popping out at the start and back at the end.
- **He hopped mid-light.** The second row of the owner's sheet (frames 4-7) was
  drawn 27 art px higher than the first, log and figure together. So at frame 4
  the bro and his log hopped about 7 world px up, and dropped back when the
  light ended.

## What it is now

**The painted fire is out of the strip.** `tools/build_fire_clean.py` takes the
flame, sparks, smoke and glow out of frames 3-7; frames 0-2 had none. The
owner's frames, as supplied, are kept as
`assets/skill-anim-src/firemaking-strip-painted.webp` and the tool reads them.

**The light's fire is the campfire's own** (`campfireFx.js`, the LIGHTING state
of a `Fire`):

- nothing before the strike;
- at the strike (frame 3, 201 ms) it catches on the strip's log with a spit of
  sparks, at the campfire's own spot (`fireLightSpot`: a stride to your left at
  your boots, the spot v2.3.2846 chose);
- it grows 0 → 1 → 2 (the strip's frames 3, 5 and 7), with sparks, smoke rising
  and its glow on the ground;
- it draws no logs of its own. The strip's log is its bed.

**The campfire takes that fire over.** When the light ends, the campfire record
appears at the same spot and adopts the light's fire (`CampfireFx.update`):

- the same flame, sparks and smoke carry on, the flame not a pixel away;
- its crossed logs appear under it;
- it reaches full height 260 ms later (IGNITE), as before.

**The bro stays put.** The tool measures, and `src/data/fireStrip.js` holds:

- each frame's shift that lays its log on frame 0's: the second row 27 art px
  down and 2-5 to the side, the first row 0-2;
- the figure's middle in frame 0 (x 243).

`effectsRenderer` places each frame by them (`_fireFrameShift`): the figure's
middle on your x, each frame's log on frame 0's. Everything drawn with the
figure (shirt, armour, hair, your drawings) is placed from it, so it follows.

**The light stays where it began.** Your position can still change mid-light,
so the figure and its log are drawn where the light started. The fire is fixed
there too.

**The fire catching is heard as it catches.** The `campfire` cue plays at the
strike (`cueLater`, 201 ms in), not when the campfire appears half a second
later over a fire already burning. Since v2.3.3664 that cue is the owner's
"Light fire" recording.

**Other players see the same.** A peer's light is drawn where it began, its
frames placed the same way, and its fire catches on their log
(`effectsRenderer._peerLights` → `CampfireFx`). Their campfire, when it
arrives, takes that fire over.

## The log: kept

The owner left it open ("Keeping the log is optional, I don't know which is
better"). It stays, and it is wood: since v2.3.3660 the bake gives its magenta
key the bark's colours.

- **The figure is drawn against it.** He kneels at the log with his hands on it
  and his knees behind it, and the art has no legs drawn behind the log.
- **Taking it out cuts him off.** Without it he is cut off at the knee, and his
  hands rest on nothing. Every frame would need its legs painted in.

When the light ends, the strip's single log gives way to the campfire's two
crossed logs. The flame carries on in place, so the eye stays on the fire.

## How the fire is found (the tool)

Colour alone cannot do it: the figure's skin is the flame's orange, and the
frames are lit by the fire (the skin turns yellow, the outline on the lit side
dark red). So:

1. **What is surely fire seeds a region.** That is the flame's own yellows,
   oranges and reds (blue under 12), the glow's creams and the smoke's greys.
   The region grows through anything fire-like that touches it (the flame's
   gradients, its pink tint over the log, its soft edges) and stops at the
   figure's near-black outline.
2. **Inside the log's box only fire colours go.** The log is magenta, pink and
   outline; the fire is not.
3. **Three boxes are protected.** The flame was the figure's own outline at the
   fists on frames 4 and 5 (the bake's `FIRE_KEEP_BOXES`) and the arm on frame
   6. There only what is surely fire goes. Where that leaves a hand or arm
   without an edge, it is outlined in the dark red-brown the artist used on
   the lit side.
4. **A small spot wholly inside the figure stays.** The eyes' whites read as
   smoke-grey. The exception is the glow seen through a gap.
5. **The glow's soft rim is peeled.** Two pixels along the figure's outline.
6. **The log's top is mended.** Each row under the flame is cloned from the
   same row further along, since the log is drawn along its grain.
7. **Only the figure and the log stay.** A see-through pixel stays only beside
   what stays. Of what is left, only the figure's pieces and the log's (300 px
   or more) are kept, so sparks and the smoke's outline go.

`python3 tools/build_fire_clean.py --check` fails if the strip or
`fireStrip.js` is not what the tool makes.

## The test: `mp-firestart`

In the world, upright on a phone, and its run (17 of 17):

| | |
|---|---|
| the bro alone, standing, before the light and at its start | his head in the same column (0 world px apart; it was 14) |
| ...and standing beside his fire at the end | 1.1 world px |
| the log's bottom edge over the eight frames | within 1.1 world px (frames 4-7 were ~7 higher) |
| the log's left end over the eight frames | within 1.1 world px |
| before the strike | the light's fire is there, unlit, no glow |
| after it | it catches and grows, size 0 → 1 → 2, six sparks at the strike, smoke rising, no logs of its own |
| where | 34 px to your left at your boots, the campfire's spot |
| when the light ends | the campfire is the same fire (one serial), its flame 0.00 px from where it was, its logs on, one fire |
| a beat later | full height (size 3) |
| a watcher | sees the peer's light catch on their log, and their campfire take that fire over (one serial, one fire) |
| page errors | none |

Pictures go to `tools/qa/mp/out/firestart/`: the light as drawn in the world,
and the bro alone in each frame.

## Memory

The strip is smaller without its fire: 434,646 bytes, where it was 755,186.
A baked fire-lighter is packed trimmed (`packTrimmed`), and the painted glow
and smoke filled most of each frame's box, so the figure baked from it is
smaller too:

- **Your own fire-lighter** packs to 4.81 MB on the graphics chip, where it
  was about 6.3.
- **Another player's**, baked in their colours, is the same 4.81 MB. Those
  figures share one allowance of 16 MB (`PEER_FIG_BUDGET`), so three
  fire-lighters fit in it now, where two did. Its estimate before a bake
  (`PEER_FIG_EST.fire`, "the bake's own, rounded up") is 4.9 MB, down from 6.3.

## Two tests that read the old strip

- **`mp-firegear` found the drawn frame as `texture.x / width`.** That only
  worked while each frame's trimmed crop happened to pack at its own index.
  The probe (`fireGearProbe`) now says the frame's index (`fi`), and the test
  reads it.
- **`mp-peercolours` wrote down that two fire-lighters fill the allowance.**
  It now fills the allowance until one more has to wait, then checks the same
  four rules with however many fit: the next one waits while every figure was
  drawn this second, it takes the place of one that was not, a cook is held to
  the same allowance, and it takes a fire-lighter's place the same way.

## Not changed

- **The artist's firelight on the figure.** The skin goes warmer in frames 4-7,
  and the log's end face and the lower left trouser leg are painted lit. The
  code fire burns beside them now, so it reads as its light.
- **The fire-lighter's waist.** A thin line of the trousers shows between the
  plate and the greaves on the standing frames (`docs/specs/fire-log.md`, "Not
  changed").
