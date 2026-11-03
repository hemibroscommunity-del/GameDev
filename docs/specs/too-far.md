# "Too far away" over a resource tapped from afar (v2.3.3990)

The owner, 2026-11-02: "There needs to be a message that you're too far away if
you can't mine and are tapping on the ore. Too far away message should also be
with any resource."

## What it does

- A tap (or a click) on a resource you hold the tool for, but stand out of reach
  of (a tree, an ore vein, a fishing spot, the campfire), floats **"Too far
  away"** over the top of its picture, in the townsfolk's gold `#D8A94D`. A bed
  of your farm out of reach says the same.
- On a computer (`(pointer:fine)`, `onComputer()`) it reads **"Too far away:
  walk closer"**.
- At most once a second a resource (`TOO_FAR_GAP_MS`): a thumb's tap reaches the
  scan from two doors, and a player tapping a rock again and again should not
  stack words on it. The stamps (`S._tooFarAt`, a `Map`, capped at 64) are per
  resource id.
- **It takes nothing.** `_tapHarvestAtCss` and `_tapFarmBedAtCss` still return
  false for a tap out of reach, so the tap goes on to what it did before (the
  swing, letting go of a lock). That is the whole difference from the old
  "Too far away!", which v2.3.3145 removed because it ate the right stick's
  jump.
- No reach changed: the word asks the same `nodeReachDist` the harvest asks
  (the scan `_harvestNodeAtCss(x, y, far)` with the reach test turned round),
  and the worker's checks are the truth.
- A resource you hold no tool for is not drawn and says nothing (v2.3.3145).

## Where

- `src/game/tooFar.js`: the word, its clock, where it sits (no imports).
- `src/ui/BroTown.jsx`: `_harvestNodeAtCss`'s `far` flag; the word in
  `_tapHarvestAtCss` and `_tapFarmBedAtCss`. QA probe: `window.__btTooFar`.

## Tests

- `server/test/too-far.test.mjs`: the words, the clock, the cap, the place.
- `node tools/qa/mp/run.mjs toofar`: a phone's tap from 300 px off shows the
  word and starts nothing, a second tap at once no second word, walked up the
  tap mines; a computer's click reads "...: walk closer".
