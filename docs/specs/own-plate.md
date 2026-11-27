# Your own name plate (tag 6788, card UI3 PR 9)

The owner, 2026-11-26, after trying the character HUD at the top left (card
UI3 PR 2): "I actually like the hud you built too." and "Also remove the name
plate on your bro (now that it's already on hud it's redundant)".

## What a player sees

- On **your own screen**, the plate over **your own bro** is not drawn while
  the character HUD shows your name: the name, the alliance tag
  (`[TAG] Name`), the gold level circle and the verified badge are one
  capsule, and the whole capsule goes.
- **Everyone else's plate**, and **yours on their screens**, are unchanged.
- What stays over your bro, where it was: the **HP bar** in a fight (it takes
  the plate's band, as it always did), the **threat skull** over that band,
  the two **spend bars** under the feet, **chat bubbles** (their point comes
  down to just over your head, where the plate's bottom was), **damage
  numbers** (over the band's top). The band keeps its size with no plate, so
  nothing jumps when your plate goes or a fight brings the HP bar.
- Nothing else lived on your own plate: the party marker is drawn on other
  players' plates only, and the Safe / PvP / Outlaw chip is on the minimap's
  plate (`plateSafety.js`, tag 4113).

## Switches

- `?ownplate=1` gives your plate back on this device, remembered
  (`bt_ownplate`, the HUD's own switch's way); `?ownplate=0` forgets. Off is
  the default.
- `?hud=0` (no character HUD, so no name at the top left): your plate is drawn
  as before, whatever `?ownplate` says.

## How it is built

- **The rule**: `src/game/ownPlate.js` `nameDrawn({ self, hudOn, ownPlate })`,
  true for every figure that is not yours. The HUD's "is it showing" is its
  own `charHud.js charHudOn()`, read, never restated. `selfNameDrawn()` is
  the page's answer: a string compare an ask, the rule asked only when the
  address changes (a switch flipped by `replaceState` counts).
- **The renderer** (`entityRenderer.js`) gains calls only (tag 6788's mend:
  the plan's rule 5); what they do is `src/rendering/ownPlateFx.js`'s. The
  figure's factory (`createPlayerDisplay`) decides once whether to build the
  plate (`ownPlateBuild`); `ownPlateSync` in your update builds it again or
  DESTROYS it (its Texts, backing and badges: TRAPS §192) only when the
  answer differs from the one the figure holds, and touches nothing else.
  `ownPlateBandHalf` sizes your band plate or no plate, by the plate's own
  zoom (`plateZoomFor`, which the renderer's `_fitPlateToZoom` reads too).
- **Other players' pictures** (`onePic.js`, `peerImpostor.js`) bake only
  `otherPlayerDisplays`: your own figure is never baked, so there is nothing
  to keep out of it.

## Tests

- `tools/guards/own-plate.test.mjs`: the rule, the switch, the page's answer
  and its asks; the renderer's syntax tree (where it asks, that it destroys,
  that it touches nothing else); the card's dodges planted and seen red; every
  mutant of the module.
- `tools/qa/mp/mp-ownplate.mjs`: two phones in the world; pictures
  `docs/shots/ownplate-*.png` (before is `?ownplate=1`, today's plate).
- `mp-alliance` and `mp-clanparty` read their phone's own plate's words, so
  that phone plays `?ownplate=1`.
