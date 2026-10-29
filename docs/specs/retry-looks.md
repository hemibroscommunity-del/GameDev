# Retry looks: a picture given up on is asked for again (v2.3.3870)

## Why

The owner, 2026-10-29, on a computer, playing a monkey in a patterned shirt:

> "west and southwest monkey face disappeared ... Oh also the shirt (along with
> the patterns) for that direction also disappeared just for those directions"

Later it was other facings, then everything came back "if the game reloaded".

The game loads its pictures one facing at a time. Several loaders tried a
picture three times (about 8 s) and then **gave up for the rest of the
visit**: that facing drew without the piece until a reload. A few bad seconds
of wifi, or a site update during play, is enough. The shirt's pattern and
print are baked from the same file as the plain shirt, so one failed fetch
took both.

## The rule

A loader that gives up on a picture asks for it again later. It does this only
while something still draws it, and it stops after a set number of rounds:

- **When:** a round of three tries 5 s after the round that gave up, then at
  10, 20 and 40 s, then every minute.
- **Cache:** each round's URL carries its own `&g=<round>` bust, so a round is
  never answered from a cached failure.
- **Limit:** at most ten rounds. A picture that truly does not ship (a pose
  that 404s on purpose) costs one request a minute while it is drawn, then
  stops.
- **Switches:** `?retrylooks=0` (parsed as `/[?&]retrylooks=0\b/`) is the
  game as it was, for every loader below. The loaders' own switches still work:
  `?gearretry=0` (gear sheets) and `?traitretry=0` (head pieces and species).
- **Reports:** a knight's or a belt's sheet that fails is written to the crash
  log on its FIRST give-up only, not on every later round.

## The loaders that ask again

| Loader | File | Since | What comes back |
|---|---|---|---|
| Head pieces (hair, hats, beards, glasses, eye styles) and their meta.json | `systems/entityRenderer.js` `_traitGaveUp` / `_ensureTraitLoaded` | v2.3.3606 | the facing's piece; `?retrylooks=0` also stops these later rounds (v2.3.3865) |
| A hat's hair mask | `systems/entityRenderer.js` (P4, #1336) | v2.3.3865 | the mask, while the hat is worn; ten rounds at most |
| Gear sheets: shirt (plain and dressed with pattern/print), armour, belts, fullset figures | `gearSheets.js` `_retryGivenUp` | v2.3.3870 | the sheet, from the next `getGearFrame` / `getShirtLookFrame` / `getGearFramePhased` after its time |
| Base body sheets | `playerSprites.js` `loadSheet` | v2.3.3882 | the body in that facing, from the next `getFrame` after its time (`?bodyretry=0` also turns it off) |
| Recoloured body sheets (skin, trousers, shoes, drawings) | `playerSkins.js` `buildBodySheet` | v2.3.3882 | the recoloured body, from the next `getBodyFrame` (meanwhile the base sheet) |
| Head overlays (the pickup crouch, a knight's head) | `playerSkins.js` `_buildPickupHeadSheet` | v2.3.3882 | the head, from the next `getPickupHeadFrame` |
| Species art (the monkey's muzzle and ears, the alien's) | `traits/speciesArt.js` `_retryMissing` | v2.3.3870 | the missing pictures; the species' builds are made again with them |

## The shared helper

`src/rendering/retryLooks.js` (v2.3.3882) holds the rule for a loader that keys
its pictures by a string: `laterRounds(switchName)` returns
`gaveUp(key, again)`, `due(key)`, `round(key)` and `forget(key)`. The body
loaders use it; a new loader should too.

## Not yet asking again (same rule, other code)

- `systems/effectsRenderer.js` `_loadPopupIcon` (popup icons; cosmetic).

## The check

`node tools/qa/mp/run.mjs speciesgc` (`tools/qa/mp/mp-speciesgc.mjs`):

1. It plays a computer page (wide, `?lookpalette=0`): a monkey in a striped,
   printed tee.
2. For the first 90 s, every picture of the monkey's south-west facing and the
   tee's south-west sheets fails to load.
3. It waits until those pictures can load again, plus one full step and its tries (80 s).
4. It faces all eight ways. In each, it holds the muzzle back for one frame,
   then the shirt; the figure must change by a piece's worth of pixels.

Pixi's texture collector is also sped up to 1.5 s, so each facing's pictures
are let go and uploaded again between visits.

P4's `mp-longhairhat` with `LH_FAIL` does the same for a hat's hair mask, and
`node tools/qa/mp/run.mjs bodyretry` (`tools/qa/mp/mp-bodyretry.mjs`, v2.3.3882)
for the body: on a computer page with the palette off, the south-west body
sheets fail for 90 s. With `?retrylooks=0`, standing SE and SW draw no body;
with the rule on, all sixteen facing and pose checks draw it.

There is no first-frame miss to allow for. An earlier version of this check
counted every `renderer.render` call as a drawn frame, but off-screen renders
(bakes, warm-ups, render textures) run inside one frame. So it sometimes
photographed the screen before the held-back piece was shown and reported a
"miss". It now counts only renders of the stage. Reading back after every
frame, M4 measured 0 misses in 499 frames with the collector sped up, first
shows included: a collected texture is uploaded again synchronously, and plain
sprites are not collected.

Results (picture: `docs/shots/retry-looks-monkey.webp`; top row with
`?retrylooks=0`, bottom row with the rule on):

- **With `?retrylooks=0`:** SE and SW (SE draws the south-west pictures
  mirrored) have no muzzle and no shirt.
- **With the rule on:** every facing passes.
