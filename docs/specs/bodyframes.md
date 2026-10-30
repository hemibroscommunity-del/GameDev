# Body frames: your body, its weapon and its state, on the phone (v2.3.3891)

## Why

The owner, 2026-10-29, on their iPhone:

> "North, northwest, west, and southwest has pants flickering ... Like maybe
> only one frame is drawn and the rest is transparent."

> "It's triggered after getting off the skateboard."

> "The bow still shows as equipped in my player equipment slot. I see the
> icon. But there is nothing equipped and I cannot attack."

It happens only with the bow or the staff, never with no weapon or the
greatsword, and only on a phone. Earlier the same day the whole body vanished
facing the same four ways.

The test machine shows none of it, even with these conditions forced:

- the phone's one-program path (`?onebatch=1`) and 16 texture units;
- the board, with real touch;
- the bow, a stale lane on the worker, an empty melee lane, and the attack
  held.

So the phone tells us itself.

## What it does

`?bodyframes` in the address turns it on. Without it, `bodyFrames.js` is
never fetched (`pixiRenderer.js`).

**Before each frame** it notes your bro's state:

- **the walking body:** shown, hidden, an empty or freed picture, its sheet
  and frame, the look palette's row, and whether it is mirrored;
- **a stand-in drawing you:** the bow's shot, or another pose;
- **the weapon:** the lane in hand and what is in it, and whether the weapon
  is over or under the body, or hidden;
- **the attack:** held, aiming or pending;
- **the board:** on, or why you got off;
- **the facing's source:** the stick, the aim (and its angle), moving, and so
  on;
- **the stand-ins:** the sword's or the bow's shown, and the bow body's cached
  strip for this facing's sheet (its frame count).

It counts, by facing, the frames where the walking body is not drawn (hidden,
or an empty or freed picture) while no stand-in is drawing you.

A reading of the legs' pixels off the drawing buffer was tried and left out.
On the test machine it counted the legs as missing on frames whose photograph
shows them drawn, and a counter that cries wolf is worse than none. The state
is what a screenshot needs.

## On the screen

A box in the top-left corner, updated at most twice a second:

- the frames counted, and the frames the body was not drawn, by facing;
- **now:** the state this frame;
- the last three frames the body was not drawn, each with its state.

The box is a plain element outside the game's root, `pointer-events: none`,
`data-bodyframes`, and it goes when you leave the page.

To use it, play until the problem happens and take a screenshot.

`window.__btBodyFrames()` returns the same data for a test;
`window.__btBodyFrames(true)` starts the counts again.

## The checks

- `node tools/qa/mp/run.mjs rideoff` (`tools/qa/mp/mp-rideoff.mjs`): a phone
  rides the board and gets off. After the ride, every facing's legs must still
  draw on every frame photographed, as they did before it. Settings:
  - `BT_RO_WEAPON`: bow, staff or greatsword;
  - `BT_RO_TOUCH=1`: real touch on the attack zone through the step-off;
  - `BT_RO_UNITS=16`: an iPhone's 16 texture units;
  - `BT_RO_QUERY`: extra address options (`onebatch=1`, `bodyframes`).
- `node tools/qa/mp/run.mjs pantsflicker`
  (`tools/qa/mp/mp-pantsflicker.mjs`): on every frame, whether the body's
  picture flips while it faces one way.
