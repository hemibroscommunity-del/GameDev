# The sword and bow bodies: the legs under greaves, and no grey fill (v2.3.3640)

The owner, 2026-10-27: "check all the animations for ghost remnants of either a
body beneath or areas for cleanup".

`mp-ghostaudit` photographed every frame of every animation of a bro in
colours nothing else wears (green skin, a yellow tee, pink trousers, blue
boots) under iron armour, alone on the canvas. Every frame of the sword's
swing came back with pink and blue: up to 688 px of trousers and boots in one
frame. Two separate faults were behind it.

## 1. The legs under greaves

The swing and the bow's shot (and a raised shield, which borrows the bow's
pose) are **stand-ins**: separate pictures drawn in layers. First comes a bare
body (`sword-<dir>-body.png`, `bow-<dir>-body.png`), recoloured to your skin,
trousers and boots. Then the greaves' own swing or shot strip goes on top, then
the plate, the shirt and the weapon. The two legs are not drawn in the same
place. The body's back boot sits behind the greaves' heel, its trousers show
between the thighs, and a calf shows past the plate. So the body's trousers
and boots showed beside the steel in every frame.

The walking figure solved this in v2.3.3010 (`maskedBake.js` `_legsOnlyClamp`,
"greaves alone hide the plain legs"). The stand-ins never had it. That makes
TRAPS §73's fourth case: a second figure has to be taught what the first
learned.

**The fix** (`playerSkins.js` `_clampLegsUnder`, called by
`recolorBodyToCanvas` when it is handed `legsUnder`):

- **The greaves' shape.** It is read once off each greaves swing and bowshot
  strip as it loads (`effectsRenderer._noteGreavesShape`). Those strips are
  warmed behind the loading screen and then kept only on the graphics chip, so
  this is the one moment their pixels are in hand. The shape is kept at a bit
  a pixel, about 0.47 MB for all eight sheets. Every metal's greaves are the
  one steel art, so the shape is keyed by pose and facing alone.
- **The clamp.** Under greaves, the sword and bow body sheets are baked with
  the shape. In each frame, from the greaves' top down (the row above which 3%
  of their pixels lie, so a speck does not move it), any trouser or boot pixel
  of the original art that the greaves do not cover:
  - goes (see-through) when the space it is in opens to the frame's edge
    without crossing the greaves;
  - turns the full set's under-armour shadow (44, 47, 54) when the greaves
    close it in.
  The dark outline those legs leave goes too, two passes, but never beside
  skin, so a hand passing a thigh keeps its outline. Skin is never touched.
- **When it is baked.** The sword and bow bodies are baked again when greaves
  go on or come off (`onEquipChange('legs')`) and when a shape comes in after a
  body was baked. A peer in greaves is baked the same way once the shape is in:
  the peer cache key carries `|L`.
- **What it leaves.** Above the greaves' top, the trousers' waistband still
  shows with greaves alone, as it does on the walking figure.

`?standinlegs=0` is the game as it was. `window.__btStandInLegs()` reports the
shapes that are in and what each bake took off. Its `.set(on)` flips the
clamp on a running page, and `.pieces(id)` returns the stand-in drawn now.

## 2. The grey fill in the sword's sheets

The sword's body and torso sheets were made from the original art
(`sword-<dir>.png`, which draws the sword in key colours). At some point, the
gaps that the original leaves EMPTY were filled with flat mid-grey: the space
between the legs and the space round the blade. v2.3.2988
(`tools/art/clean-sword-ghosts.py`) scrubbed what the erased sword left inside
its own footprint. This fill lay outside it.

The recolour reads a flat grey from 45 to 139 as a **boot**, so the fill was
painted the player's boot colour. Every swing showed a white, red or blue
triangle between the legs and a wedge behind the arms, or a dark grey one in
the default boots. That is TRAPS §255.

`tools/art/clean-sword-fill.py` removes every body or torso pixel that the
original leaves empty and that lies outside the figure. A pixel is outside the
figure if it can be reached from the frame's edge through the original's empty
or key-coloured pixels. An empty pixel enclosed by the figure is a pinhole that
v2.3.2144 filled on purpose, and it stays. A pixel is either kept exactly or
made fully transparent.

| sheet | px of fill taken out | enclosed (kept) |
|---|---|---|
| sword-south-body | 1,094 | 64 |
| sword-south-torso | 239 | 50 |
| sword-east-body | 914 | 1 |
| sword-east-torso | 263 | 0 |
| sword-north-body | 2,666 | 0 |
| sword-north-torso | 1,162 | 0 |

The bow's sheets were checked the same way and match their originals: nothing
to take. `SWORD_ART_VERSION` is 1103. The game prefers the `.webp` twins, and
only the PNGs are committed: CI's optimize-assets mints the twins from them on
the push and checks each pixel for pixel. The PR merges once that commit is on
the branch. (Minted locally with the same sharp 0.33.5, each new twin decoded
to its PNG pixel for pixel.)

## The test: `mp-standinlegs`

A bro in those colours stands on the commons. Only the stand-in is drawn: the
other layers are hidden for each render and put straight back. The page's
clock is held mid-pose and pinned again before every shot. A hidden loading
veil keeps the black-screen watchdog from rebuilding the renderer under the
test.

- **In iron greaves.** The test covers every sword facing (south, east, north
  and the mirrored west) at two moments of the swing, and every bow facing
  (east, southwest, south, northwest, north) at the draw and the loose. Each
  moment shows at most 14 px of trousers or boots below the greaves' top, and
  0 in every run so far. The same frames with the clamp off show 20 to 182 px.
  The bow cannot loose at empty ground, so its shot is written the way
  monsterCombat writes one.
- **No greaves.** The stand-in keeps its trousers and boots: 829 and 674 px
  facing south, 1,617 and 909 facing east.
- **Another player.** A second player watches the first swing east in greaves:
  3 px against 124 with the clamp off. Only one facing is checked here. The
  peer bake is the same for every facing, and a held clock makes a quiet peer
  look gone to the ghost sweep once it is let go.

## Still to do

- **Specks on the outline.** The anti-aliased outline round the head, arms and
  torso still takes the boot and trouser colours in many poses, a few pixels
  at a time. The recolour reads any flat grey as a boot wherever it is. This
  is the next change.
- **The jog's waist.** In the back views of the jog under the full set, a strip
  of trousers shows between the plate and the greaves (mp-ghostaudit, 24 to
  56 px).
