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
| Species art (the monkey's muzzle and ears, the alien's) | `traits/speciesArt.js` `_retryMissing` | v2.3.3870 | the missing pictures; the species' builds are made again with them |

## Not yet asking again (same rule, other code)

These loaders still give up for the visit after their bounded retries. They
are listed here, not fixed, because each needs its own few lines:

- `playerSprites.js` `loadSheet`: the base body sheets. A failed facing leaves
  the old path's body undrawn in that facing.
- `playerSkins.js` `buildBodySheet` (the recoloured body; falls back to the
  base sheet) and `_buildPickupHeadSheet` (the pickup and fullset head
  overlays).
- `systems/effectsRenderer.js` `_loadPopupIcon` (popup icons; cosmetic).

## The check

`node tools/qa/mp/run.mjs speciesgc` (`tools/qa/mp/mp-speciesgc.mjs`):

1. It plays a computer page (wide, `?lookpalette=0`): a monkey in a striped,
   printed tee.
2. For the first 90 s, every picture of the monkey's south-west facing and the
   tee's south-west sheets fails to load.
3. It waits until those pictures can load again, plus one full step (65 s).
4. It faces all eight ways. In each, it holds the muzzle back for one frame,
   then the shirt; the figure must change by a piece's worth of pixels.

Pixi's texture collector is also sped up to 1.5 s, so each facing's pictures
are let go and uploaded again between visits.

P4's `mp-longhairhat` with `LH_FAIL` does the same for a hat's hair mask.

A facing can still miss its piece on its very first frames, while its picture
is uploaded again; that heals within a moment. The check looks again 1.5 s
later before it judges, so it is about losses that last.

Results (picture: `docs/shots/retry-looks-monkey.webp`; top row with
`?retrylooks=0`, bottom row with the rule on):

- **With `?retrylooks=0`:** SE and SW (SE draws the south-west pictures
  mirrored) have no muzzle and no shirt.
- **With the rule on:** every facing passes.
