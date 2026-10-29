# The head-frame count (v2.3.3860)

The owner, 2026-10-29: *"For disappearing traits sometimes it's a flicker"*,
and *"keep trying to patch the causes of any flicker or missing traits
first."* The head-piece watch (`entityRenderer.js` `_watchOwnHead`, v2.3.3689)
reports a piece hidden for 2.5 s. A flicker is one frame, or a few, so it
needed a count of its own.

## What it counts

On a QA page (`?headframes` in the address; nothing at all otherwise), on
the renderer's own clock (`pixiRenderer.js`, beside `app.render`):

1. **Before each frame is drawn** (`headFrameTick`). Is each head piece you
   wear (the hat, hair, beard, glasses and eye style) on screen? It counts if
   it is on the walking figure or on the stand-in that draws you while you
   swing, shoot or gather (`effectsRenderer.skillTraits`), and if:
   - every parent is shown, renderable and not see-through;
   - its picture can draw (not freed, not the empty one, not 0 x 0, its
     source not freed).

   Not counted:
   - a facing the piece does not ship (`design`; the stand-in faces its own
     way, so it now says why it hid a piece too);
   - a roll frame with no head (`flipHead.js`);
   - a frame where the whole bro is not drawn. That is tallied by facing
     instead (`goneBy`, for P1's report of the body vanishing facing
     N/NW/W/SW).
2. **The same for every other bro and townsperson on screen**
   (`othersFrameTick`). Each other player's walking figure and each
   townsperson drawn live (`lookFolk.js`) is counted on the frames it was
   placed and its body drawn.
3. **After each frame is drawn** (`headPixelsTick`), the pixels inside each
   shown piece's box are read back off the drawing buffer, and those in the
   piece's colour are counted (the test names the colours). A frame whose
   count falls under a quarter of that piece's usual count in the same pose
   and facing is a frame it did not reach the screen. Such a frame is logged
   with what else is drawn over the box, and the first few are saved as
   pictures.

The results are in `window.__btHeadFrames()`, `window.__btHeadOthers()` and
`window.__btHeadPixels()`. Pass `true` to any of them to start counting
again.

## The test: `mp-headframes`

`node tools/qa/mp/run.mjs headframes`. A phone (390 x 844, at 1x: this box
draws a 3x canvas at about 2 frames a second) wears a coloured look, which
goes through the look palette, as on the owner's iPhone: pink wavy hair, a
blue beanie, a red beard and the golden glasses. It plays these phases, each
counted on its own:

1. standing;
2. jogging the eight facings;
3. quick turns;
4. rolls and flips;
5. a peer in pieces of their own colours, jogging, turning and rolling beside
   you;
6. the graphics lost and given back (`WEBGL_lose_context`, a phone's memory
   purge), with the pieces' usual pixels learnt before the loss;
7. a fight in the Flame Fields with the greatsword and the bow.

`BT_HF_ONLY=fight|peer|ctx` runs one phase, `BT_HF_ROUNDS` sets the fight's
rounds, `BT_HF_DPR=3` runs at the phone's density, and `BT_QA_CPU_THROTTLE=4`
plays a slow phone.

## What it found on this box (main, 2026-10-29)

| Phase | Frames | Your pieces missing | Others' piece-frames, missing | Pixel drops |
| --- | --- | --- | --- | --- |
| standing | 12 | 0 | 204, 0 | 0 |
| jogging the eight facings | 43 | 0 | 771, 0 | 0 |
| quick turns | 75 | 0 | 1,317, 0 | 0 |
| rolls and flips | 68 | 0 | 1,222, 0 | 0 |
| a peer beside you | 57 | 0 | 1,181, 0 | 0 |
| graphics lost and given back | 85 | 0 | 1,457, 0 | 0 |
| the fight (5 rounds) | 226 | 0 | n/a | 18, all things in front of the head |
| the fight, CPU throttled 4x | 77 | 0 | n/a | 0 |

- **No frame anywhere had the whole bro undrawn**, in any facing.
- **The fight's pixel drops were all something in front of the head**, shown
  in the saved pictures: a Fire Goblin and its fire effect, and the floating
  "Test Great Sword" pickup label. They were not a missing piece.
- **One single frame in an early fight run** had the glasses on neither
  figure. The stand-in was facing north, where the golden glasses ship no
  picture. The stand-in now reports its `design` reason, and no later run saw
  a miss.

So the flicker the owner sees does not happen on this box: not for your own
bro, other players or the townsfolk, not when slowed, and not through a
graphics loss. What remains is phone-only: iPhone Safari's own memory
pressure and its 60 frames a second. The counter is the tool to catch it
there. On the owner's phone, `?headframes` makes `window.__btHeadFrames()`
name the piece, the reason, the pose and the facing of every frame a piece
went missing.
