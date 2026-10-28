# The farmer's iron is the walking iron (v2.3.3636)

The owner's list of 2026-10-26 (docs/OWNER-LIST-2026-10-26.md, item 12):

> The armor while performing farming gestures is noticeably different color
> (iron). Try to make it match more exactly.

![Before and after: each pair is the bro standing by the bed, then farming it](../shots/farmiron-before-after.webp)

(Left pair: the game before this version. Right pair: after. In each pair the
bro stands beside the bed, then works it with the hoe, in a full iron set.)

## What was different

While you dig, plant, water or fertilize a bed, your bro is swapped for the
farmer: separate sprites drawn from the farm's own animation strips, dressed in
your armour (v2.3.3439). v2.3.3472 had already given them the walking armour's
metal tint, its shine and its greys. Two things were still different:

1. **The light.** The walking figure is *form-shaded* (src/rendering/formShade.js,
   v2.3.2767): one gradient over the whole figure, as painted at the head and a
   cool shade at the boots (red x0.72, green x0.75, blue x0.90 at the bottom of
   its frame). The farmer's sprites live in the gesture layer, belong to no
   figure, and were not shaded at all. So his iron was brighter and warmer from
   the knees down than the same iron a moment before.
2. **The greys.** The farm strips' steel was graded to the walking JOG sheets.
   A bro standing beside a bed wears the STANDING sheets, and the standing
   greaves are drawn brighter than the jogging ones (middle grey 0.557 against
   0.513).

Measured as a player sees it (`mp-farmiron`, a phone on the farm in a full iron
set, the figure alone on the canvas's own colour). Each band's median colour,
farmer over walker, red/green/blue:

| Band | Before | After |
|------|--------|-------|
| boots | 1.15 / 1.13 / 1.00 | 1.00 / 1.00 / 0.99 |
| the chest | 1.09 / 1.06 / 0.97 | 0.96 / 0.95 / 0.93 |
| head and shoulders | 0.99 / 1.04 / 0.97 | 0.89 / 0.92 / 0.89 |

The head and shoulders read about 10% darker on the farmer because of his pose.
His steel forearms cross his chest holding the hoe, where the standing figure
shows bright shoulder plates. The art's own top third is 11% darker whatever it
is graded to (measured on the sheets alone). That is the drawing, not the colour.

## The fix

- **Lit as the walking figure is.** Each of the farmer's sprites (body, greaves,
  shirt, plate, tool) is shaded across its own quad with the walking figure's
  gradient at those heights:
  - `standShadeSpan` (entityRenderer) gives where the standing figure's shade
    runs when its boots are where yours are, using the rows and scales the
    body is drawn with;
  - `spanSpec` (formShade) lays that gradient on the farmer's quad.

  It uses a shade object of its own, never `SHADE.figure` itself:
  sharpPixels takes that object to mean a pixel-art figure and would resample
  him. Other players' farmers get the same shade, at their build.
- **Graded to the standing sheets.** `tools/make_farm_anims.py` `STEEL_REF` is
  now `stand-south` for the plate and the greaves. Re-running the tool rewrote
  only the six armour strips. An unchanged re-run is byte-identical, which was
  checked first. Their stale `.webp` copies are deleted (the asset workflow makes
  new ones), and `GEARLAYER_VER` is 1038 so phones fetch them again.

## Tests

- `mp-farmiron` (new): the walking figure standing by bed 0 and the farmer at
  the same spot, the hoe's rest frame held, each pictured alone on the canvas's
  colour. Boots and chest are each within 8% of the walker, channel by channel
  (the code before this version: 15% and 9% over); head and shoulders within
  14%. The farmer carries the walking figure's own
  shade at his boots and crown, read from his sprites (to 0.01).
  `BT_FARMIRON_SHADE=0` runs it with the form shade off everywhere;
  `BT_FARMIRON_QUERY=sheen=0` with the metal's shine off.
- `mp-farmanim` §5: the six strips' middle grey within 0.03 of the standing
  sheets' (it read the jog's).
- `mp-farmpeer`: another player's farmer, still drawn and dressed.

## v2.3.3697: every move, iron and copper, fitted to the farmer

The owner, 2026-10-28:

> As part of the farming animations I think either the watering, planting, or
> fertilizing the armor styles didn't match (different shades of gray for iron
> armor) possibly wrong shades for copper armor too

v2.3.3636 measured one picture: the hoe's rest frame, in iron. This version
measures every move (the hoe digs, the can waters, the kneel plants, composts
and harvests), four frames of each, in a full iron set and a full copper set,
and pictures each armour piece alone: the plate, then the greaves, the rest of
the figure and the world not drawn. The metal's passing sweep is held off for
the pictures (it would catch one figure and not the other); the steady shine
stays.

### What was different

- **Kneeling, the plate took the thighs' shade.** The walking figure's shade
  is laid at the world's heights. A kneeling farmer's plate is where a standing
  figure's thighs are, so it took their cooler, darker shade: the kneel's plate
  was bluer than the walking plate (its saturation 0.15-0.18 against 0.13) and
  its highlights dimmer (the brightest tenth 116-123 against 133). That is the
  planting, composting and harvesting the owner saw; the hoe and the can stand
  at your height and were within a few per cent.
- **The shine was laid across the wrong box.** The metal's shine lights the
  sun side of a figure's frame (glint.js `uFig`). With your walking body hidden,
  the farmer's pieces fell back to their own frames, two to three times the
  figure.

### The fix

- `fittedShadeSpan` (entityRenderer): the walking figure's shade frame,
  stretched so that the farmer's own crown and boots land where the standing
  figure's do in it. For the hoe and the can, which stand at your height, it is
  what it was. Kneeling, each piece gets the shade it has on the walking figure.
  The crown is the move's middle one (`farmCrownMed`), so the shade does not
  pulse as his head bobs.
- `farmFigProxy` (effectsRenderer): a sprite that is never drawn, standing where
  a walking body's frame would be, fitted the same way. The shine lays its
  light across it (glint.js), for your farmer and for another player's.

### Measured

`mp-farmiron`, the four frames of each move. The plate's brightest tenth (its
metal's light), and its saturation (a grey's blue cast), against the walking
plate's:

| Plate | Walker | Hoe | Can | Kneel, before | Kneel, now |
|---|---|---|---|---|---|
| Iron, brightest tenth | 133-134 | 136-153 | 144-146 | 116-123 | 122-134 |
| Iron, saturation | 0.126 | 0.10-0.13 | 0.11 | 0.15-0.18 | 0.13-0.17 |
| Copper, brightest tenth | 125 | 127-142 | 133-134 | 108-115 | 114-125 |

The hoe and the can raise his arms into the light, so their plates may be
brighter than the walker's. Each piece's median colour, farmer over walker,
red/green/blue, the four frames' range, now:

| Iron | Plate | Greaves |
|---|---|---|
| Hoe | 0.97-1.04 / 0.99-1.04 / 0.96-1.02 | 0.93-0.97 / 0.91-0.96 / 0.94-0.99 |
| Can | 1.03-1.05 / 1.03-1.05 / 1.01-1.02 | 0.93-0.97 / 0.93-0.97 / 0.97-0.99 |
| Kneel | 0.97-0.99 / 0.97-0.99 / 0.98-1.02 | 0.80-1.00 / 0.79-0.99 / 0.79-1.01 |

| Copper | Plate | Greaves |
|---|---|---|
| Hoe | 0.98-1.04 / 0.98-1.05 / 1.00-1.06 | 0.92-0.95 / 0.93-0.97 / 0.97-1.00 |
| Can | 1.03-1.05 / 1.02-1.05 / 1.03-1.03 | 0.94-0.96 / 0.95-0.97 / 0.97-1.00 |
| Kneel | 0.97-0.98 / 0.97-1.00 / 1.00-1.06 | 0.79-0.98 / 0.78-1.00 / 0.82-1.02 |

The kneel's 0.8 greaves are frame 2, where only the knee tips show (about 240
px, in the shade the art draws under him); its other three frames are within
4%. What is left of the difference is in the drawings: kneeling, his chest is
drawn turned down and a little darker than the walking chest's bright ridge.

The checks: every piece within 10% (a piece under 300 px within 25%), the
plate's brightest tenth at least 0.90 of the walker's in every move, and the
farmer's shade at his own crown and boots the walking figure's at its own. On
main's build (v2.3.3681) the kneel's brightest tenth is 0.86-0.92 of the
walker's in both metals and that check fails; here it is 0.905-0.996.

A sprite's shade is two colours, at its quad's top and bottom, and a colour
cannot go over 1. Where the farmer's frame reaches above the walking frame's
top (the hoe raised, a kneel's shorter span), the red channel stops at 1 there,
and his crown is up to 2% darker than the walker's. His boots match to 0.001.
