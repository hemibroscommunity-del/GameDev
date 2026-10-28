# The Town Hall's board and the map pins (v2.3.3766)

> The owner, 2026-10-28: *"I was also thinking it would be cool if at the town
> hall it was just a big menu board of all the things to do (dungeon,
> gambling, arena, woodworking, etc) with a page that describes what each
> thing does and pin drop you can put on the map to go to the one you want
> (two pins can be active at once - red pin and blue pin). When you "enter it"
> it brings up the board."*

Client only: nothing on the server changes.

| The board | A page | The minimap, two pins | The world map |
|---|---|---|---|
| ![board](town-board/board.jpg) | ![page](town-board/page.jpg) | ![minimap](town-board/minimap-pins.jpg) | ![world map](town-board/worldmap-pin.jpg) |

## What it does

- **Entering the Town Hall opens the board**: a tile a thing to do, under
  five headings: Fight, Explore the lands, Make, Money and trade, People.
  Only what is built and reachable, and only what this worker opens (a row
  with `cap` waits for it; a dungeon for `wheelDungeonOpen`).
- **A page a tile**: 1-4 short sentences (what, what you do, what you get,
  the level or cost, from the code), where it is in words, and two buttons,
  **Red pin** and **Blue pin**.
- **The pins**: both may be up at once; a press puts one on this place,
  moving it; the same press there lifts it. Tiles wear their pins. On the
  minimap the pin's point is on the place, or a smaller pin rides the box's
  edge on the line to it; on the world map at every zoom, at the screen's
  edge when off it. Kept per character in localStorage (`bt_pins:<id>`)
  until lifted.
- **The Leaderboard and World map** stay, as two buttons at the board's foot
  (the owner's v2.3.3258 choice).

## How

| File | What |
|---|---|
| `src/data/townBoard.js` | the rows: tile, page, where, and `at` (how the place is found) |
| `src/game/mapPins.js` | the two pins: an id of a row, never a position |
| `src/game/mapPinPlaces.js` | a row's place AT RUNTIME: a door (`wheelTownDoors`), a townsperson (`S.npcs`, or his door and offset in `WHEEL_TOWNSFOLK`), a dungeon's mouth (`wheelDungeonDoors`), a land's first stretch (the world map's `lands[].ticks`); never a coordinate in code (CLAUDE.md §1) |
| `src/ui/panels/buildings/TownBoard.jsx` | the board and its pages (Lantern Slate), from `WheelHallPanel.jsx` |
| `src/rendering/systems/wheelMinimap.js`, `minimapRenderer.js` | the pins as pooled marks (a `mappin` glyph minted once), never a Graphics change a frame |
| `src/ui/WorldMapOverlay.jsx` | the pins on the world map |

## Tests

- `server/test/town-board.test.mjs`: the rows (ids, headings, pictures that
  exist, places found at runtime, pages, no "Wheel" or "tap") and the pins
  (place, move, lift, both at once, kept per character, bad ids dropped).
- `tools/qa/mp/mp-townboard.mjs`: an upright phone and a computer in the
  world's BroTown: the board, a page, red and blue on the minimap, red
  moved, blue lifted, a reload keeping red, the world map.
- UI review: `building-townhall`, `building-townhall-page`.

## Not on the board

No man's land (every land past its safe ground, not one place); the Dungeon
Workshop's paid packs (dormant). A pin is lifted from the board, not yet from
the map.
