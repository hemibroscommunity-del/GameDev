# A computer plays the sideways layout (v2.3.3687)

The owner, 2026-10-28:

> Yes base desktop off the landscape mode but fix the menu sizes. Also find a
> good place to keep a list of all the controls. I was thinking on the black
> of the menu would fit nicely but I don't know if there's a better place to
> pin it

> Keyboard instructions need to be dynamic since "whirl" doesn't work if you
> don't have your sword equipped

and, seeing the first cut:

> If you split the keyboard shortcuts on its own strip to the right and kept
> the inventory on the left it might look better. You need to modify the
> containers to fit that shape better.

> I meant the right side of the screen consists of the black strip with the
> shortcuts. Not just on the right side of the left black strip.

> Every menu needs to look like it fits the space.

and, of the second cut:

> It's getting better but the dashboard buttons need to be at the top of that
> black bar section, not at the bottom. It's more logical arrangement that way
> and matches with the way it's set up for mobile. also don't space out the
> controls evenly make them in chunks without spaces within chunks but space
> between chunks. Same with primary 3 combat skills. Those should all be in
> the top row beneath the graph dashboard button. Then beneath that the
> filters for the inventory/bag. The labels for the controls needs to be more
> readable too.

## What it was

Since v2.3.1768b a computer drew the upright phone blown up to the window's
height, with black bars either side (#root's aspect lock, game.css,
`@media (pointer:fine) and (min-width:1000px)`). On a 1440 x 900 window the
game was a 491 px column; the rest of the screen was black.

## What it is now

Three columns, each the window's height:

| Column | Width | What |
|---|---|---|
| The pages | 390 px (an upright phone's width) | The dashboard's pages: the bag, Character, Quests, Skills, Codex, More |
| The world | what is left | The game |
| The controls | 156 px, or 40 folded to its ⌨ | Every key, in groups |

- **The switch.** `src/ui/deskWide.js` sets `html.bt-desk-wide` before the
  page draws, and game.css takes the aspect lock off inside the same media
  query.
  - The play area is then wider than tall, so the game lays itself out as a
    phone on its side does (playViewport.js `playIsLandscape`).
  - The world stays fair by the sideways rule: 960 world px of height, the
    width the shape gives. So the shell is held to 2.2:1, and an ultra-wide
    monitor gets bars, never more world.
  - `?narrow` (or `?deskwide=0`) is the upright column as it was, for the
    tab; `?deskwide=1` brings the wide layout back.
- **The pages** are 390 px wide, the width they were drawn for (sheetGeometry
  `landscapeSheetW`, playViewport `panelVw`). A computer opens with the bag
  showing, once a page load.
  - **Down the column, as on a phone:** the dashboard's buttons are its TOP
    row (sheetGeometry `landDockFootprint`: `top`, and the page keeps that
    row clear at its own top, `reserveTop`), then the three weapons, then the
    bag's filters, then the bag (DashColumns `desk`). A phone on its side
    keeps the buttons in the bottom corner its thumb knows.
  - **Folded,** the column is a 60 px strip with the fold chip at its top
    (`DESK_FOLD_STRIP_W`, the controls' column folds to its ⌨ the same way),
    and the world starts after it. With the buttons at the top, the chip
    alone would otherwise have sat on the world's corner, over the top bar's
    door.
- **The controls** stand at the edge the pages do not take.
  - `bandFootprint` takes their width off the world as `keysW`.
  - resize() stamps `--keys-w` and `--world-r`, and `--world-x` when the
    pages are on the right.
  - They stay whether the pages are open or folded away. H or the ⌨ folds
    them; the world takes the room.
  - The old floating strip never shows on such a computer.

## The controls list

`src/game/deskKeyList.js` is the table. It has four groups with a heading each
(Move, Fight, Other, Menus).

- **In chunks.** A group's rows are packed, one height each, and the groups
  are parted by a gap (game.css `.bt-desk-keys-list`, `--kg`). The second
  cut shared the column's height out among the rows, so the list filled a
  tall window evenly; the owner wanted chunks. The rows' height is what the
  list's own height gives them (the list is a size container, `100cqh`, told
  its row and group counts as `--kn` and `--kgn`), between 21 and 28 px: on
  a tall window the groups sit under the head with the rest of the column
  empty below them, and every key still fits a 768 px laptop.
- **Readable.** The words are 15 px bold in the panel's white (they were
  12.5 px in a grey), the key caps 12.5 px, the group heads the panel's
  brass.

A key with a requirement is listed only while it works, by the rule its touch
button follows (KeyboardHintsPanel.jsx `deskKeyHave`, read once a second):

| Key | Listed only with |
|---|---|
| Shift (Sprint) | a worker that settles a sprint |
| Q (Shield) | a shield |
| Q+E (Bash) | a shield, and the bash unlocked |
| R (Whirl) | the sword in hand, and the whirlwind unlocked |
| G (Burst) | a weapon the Element Burst fires from, at its level |
| T (Trap) | a box trap in the bag |
| V (Eat) | cooked food in the bag |

The Menus group is the dashboard's letters and the map's (deskKeys.js
`NAV_KEYS`, `MAP_KEY`). Their buttons wear them too, and this is the one place
a player reads them all.

## The pages, sized for the column

| Page | Upright phone | Computer |
|---|---|---|
| Bag | the band's row | the three weapons, the filters, then five tiles across, ten rows (DashColumns `desk`) |
| Character, Equipment | the figure 146 px, one stat family open at a time, covering the figure | the figure and gear 88 px a slot, bigger pills, Damage and Defense always open under the bars, Health or Energy opening under the bars |
| Character, Points | a grid of two rows, sized from the column's width | a list: each stat a row (picture, whole name, what it gives now, points), under the three weapons and the character |
| Skills | 50 px tiles | 92 px tiles, three across, the rows spread down |
| Codex | 44 px cards, three across | cards a fifth of the window tall, the picture 72 px |
| More | six across | two across, each tile its picture at 52 px, its name and its status line |

- **The Points list.** The heading over the weapon's six is the three weapons,
  each a button showing its six (v2.3.3665's switch). The heading over the
  shared seven is the character. Neither is framed: a heading names the rows
  under it. Every row is the grid cell's own button, with the same handles and
  the same window on a click.
- **Other places.** The chat bar spans the world, never a column. The creator
  keeps its column, centred on its backdrop.

## Tests

- **`mp-deskwide`** (26 checks, a computer as players get it, and a 1366 x 768
  laptop; it saves a picture of each layout, `tools/qa/mp/out/deskwide-*.png`):
  - the three columns;
  - down the pages: the buttons the top row, then the weapons, the filters
    and the bag;
  - the four groups, every row on the screen, each group's rows packed with a
    gap between groups, every row 21-28 px, the words 15 px or more and none
    cut short;
  - no Q or R until they work, and Q once a shield is worn;
  - H folding the controls, and the world growing;
  - I and P, and folded, the world after the fold chip's strip;
  - the chat bar over the world;
  - the Points list: thirteen rows on the screen, and a click opening its
    window.
- **`desk-keys` suite** (17 checks):
  - every row in a known group;
  - a key with a requirement only while it is met;
  - the stamp the column re-renders on;
  - the menus' letters held to deskKeys.js;
  - every listed key one the game binds.
- **The phone tests' computer pages are the upright column unless they pass
  `wide: true`** (harness `newPlayer`). The default 1000 x 780 page included,
  they were written for the column, and keep testing it. The choice survives
  the game's own reloads (sessionStorage `bt_narrow`).
  - mp-deskkeys, deskreach, deskplace, deskclick, deskharvest, deskwords,
    desktopbox and viewport pass that way.
  - The UI review's computer screens are the wide layout (`wide: true` in
    capture.mjs).

## Not done

- **Building windows** are still the phone's 360 px card, low in the world
  (the forge's lowest, so the smith shows above it). They fit, but on a big
  window they are small. Growing them is a CSS zoom or a second size for
  sixteen panels, worth its own change.
