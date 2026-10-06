# North on the Wheel's maps (v2.3.3065)

> Owner, 2026-10-06, on the recommendations for finding your way round the
> Wheel: *"Continue building recommended."* A north mark on the minimap was
> one of them.

Neither the Wheel's minimap nor its world map ever turns: up is always north.
Nothing said so, and the lands are named by where they lie (Frost Ridge in the
north-west, the Water Caves in the south, the Flame Fields due north). Now both
maps show which way north is.

## The minimap

- A small **slate bead with a brass N** sits in the middle of the frame's top
  band, where a compass bezel puts it.
  - Its middle is on the band (`NORTH_Y` = half the frame).
  - It stands 3 px above the box and reaches 3 px past the band into the map.
  - It is fixed to the box and does not move with the map.
- It is drawn over the frame in the frame's own colours: the slate, the brass
  and the dark keyline.
- The quest's star and the way-home badge ride the box's edge `QUEST_EDGE` in.
  When either sits at the very top middle, the bead covers only its tip.
- Code: `src/rendering/systems/wheelMinimap.js` (the NORTH block).
  - The N is a Pixi `Text` at the phone's pixel ratio.
  - The probe's `window.__btMinimap.north` gives its place and size.

## The world map

- A **compass** sits in the top-left corner of the map, 44 px across, on the
  same dark disc and brass rim as the map's buttons.
  - The **N** sits above the needle.
  - The needle's north half is brass and its south half is grey.
- It takes no taps (`pointer-events: none`): a drag that starts on it still
  moves the map.
- It is clear of the zoom buttons (bottom right) and the key (bottom left).
- Code: `src/ui/WorldMapOverlay.jsx`, `[data-world-map-north]`.

## Tests

`mp-north`, on a phone (390 x 844, 3x) in the Wheel:
- the bead's place in the frame;
- the bead drawn: brass N strokes on slate inside its rim, and the frame either
  side of it unchanged;
- the world map's compass in its corner, saying N, clear of the buttons, taking
  no taps, with its brass north half drawn.

Pictures: `north-minimap.png`, `north-worldmap.png`.
