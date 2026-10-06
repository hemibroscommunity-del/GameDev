# The inside of each building (v2.3.3125)

> Owner, 2026-10-06: sent seventeen pictures of the inside of BroTown's
> buildings (made in ChatGPT from the prompts in `docs/ART-WISHLIST.md`,
> "Inside the buildings") and said *"Ok wire these up."*

Walk into a building and the top of its window is now the room you walked
into: the owner's picture, edge to edge, with the building's own panel (the
forge, the bank, the market…) starting right under it. Sixteen windows show
one. The seventeenth picture, the Hotel's, has no window yet and is shipped,
waiting. (The Town Hall's was held too until the owner chose "a Town Hall
window", below.)

## Which window shows which room

| Door | Window (`buildingPanel`) | Picture |
|---|---|---|
| Blacksmith | `forge` | `blacksmith` (a slim band, see below) |
| General Store | `exchange` (the market) | `store` |
| Bank | `bank` | `bank` |
| Saloon | `party` (the party panel, and the arena sign-up) | `saloon` |
| Woodworker | `woodwork` | `woodworker` |
| Gem Cutter | `gemcut` | `gemcutter` |
| Cookhouse | `cook` | `cookhouse` |
| Assay Office | `enchant` | `assay` |
| Gambling Den | `gamble` | `gambling` |
| Feed & Seed | `farm` | `feedseed` |
| Land Office | `farmhome` (the trip to your farm) | `landoffice` |
| Post Office | `post` | `post` |
| Sheriff's Office | `sheriff` | `sheriff` |
| Guild Hall | `guildhall` | `guildhall` |
| Town Hall | `townhall` (a hall, below) | `townhall` |
| Auction House | `auctionhouse` | `auction`, with its clerk |
| Hotel | none: it is shut | `hotel` (held) |

The table is `src/data/buildingRooms.js` (`BUILDING_ROOMS`). The Market itself
(`store`, reached by a button inside the Auction House and the General Store)
is a screen of its own and shows no room. The held picture (`SPARE_ROOMS`)
costs nothing until a window asks for it; the day the Hotel opens it is one
line in the table.

## The Town Hall window

The Town Hall had no window: Mayor Bro stands on its steps, and the plan calls
it `mayor (NPC)`. The owner sent its picture last and, asked what it should do,
chose **a Town Hall window** over drawing the room behind Mayor Bro's dialogue
or leaving it waiting. It is the fourth of the Wheel's halls
(`WHEEL_HALL_DOORS.townhall`, v2.3.3066's `WheelHallPanel`), and the two rows
are the two things its own picture shows:

- **Leaderboard**: the trophy case. The dashboard's own Ranks page, a ranking
  for every combat and life skill, opened as the More page's tile opens it
  (`dashboardPanelBus.open('more')` then `push('leaderboard')`, so the back chip
  goes to More).
- **World map**: the painted map on the wall. The Wheel's labelled map, opened
  from the minimap until now; `WorldMapOverlay.jsx` exports `openWorldMap()` for
  it (the overlay hands its opener to the module while it is mounted).

Standing at the door brings up "Enter TOWN HALL" like the other fifteen; a hall
is not a building visit, so mayor_1's count is untouched. Mayor Bro's dialogue
and quest offer are above the Enter button (z 44 against 35), so talking to him
is not touched. A new character arrives 108 px south of the door's foot and the
button comes up 140 px from the BOOTS (the body's middle is ~52 px above them),
so a new character does not start with it showing; it comes as they walk up to
the Mayor (`mp-wheelhalls` §7 measures both).

Everyone stands at this door in their first minute, so it is the one door that
does not start the other rooms' download (`HUB_ROOMS` in `game/buildingRooms.js`;
it still decodes its own picture): the first quest's walk to Frost Ridge has the
network to itself, and the download waits for the first shop or hall
(`mp-buildingrooms` checks the Town Hall does not start it and the next door
does).

## How it is drawn

`BroTown.jsx` draws one `<BuildingRoom/>` (`src/ui/panels/buildings/
BuildingRoom.jsx`) first inside the window card, for whichever building panel is
open. **None of the twelve panels was touched**, so this cannot collide with a
panel's own rework (the farm and cookhouse were being rebuilt in parallel).

- The card's 20 px padding is load-bearing: every panel bleeds its own surface
  into it with `margin: -20`. The room does the same on its top and sides
  (`.bt-room`, `game.css`), with a +20 px margin under it that cancels the
  panel's own -20 on top, so **the panel starts exactly where the picture
  ends**. One rule squares the panel's top corners under it.
- The picture is 3:2 at the window's width (239 px on a phone) and the close
  button sits on it, raised above it, on a dark disc.
- Its box is reserved before the picture arrives, so the window does not jump,
  and the picture fades in. A picture that cannot be loaded takes its box with
  it and the window reads exactly as it did before.
- **A shorter phone** holds the picture to 30vh and cuts the floor, never the
  sign. **A sideways phone** (under 460 px tall, where the whole window is
  ~190 px) drops the room altogether.
- **The forge's window sits low** so the smith is seen working above it
  (v2.3.2826), and a full picture would fill the whole card. It shows a slim
  4:1 band of its room instead: the sign, the forge's fire, the hammers, the
  anvil.
- **The Land Office was not a card panel, and had to become one.** Its trip to
  your farm was a small dialog BroTown drew as a separate overlay (z-index 30),
  while the card every building opens (z 32) was drawn EMPTY above it. Nobody
  noticed because the empty card was a 42 px slab across the middle of the
  dialog. With the room's picture in the card it was 239 px tall and covered
  "Travel to Farm" altogether (found by `mp-buildingrooms`: "a finger on Travel
  to Farm reaches it"). It is `LandOfficePanel.jsx` now, in the card under the
  room, in the Lantern Slate of the other twelve, with the dialog's words and
  buttons; the trip itself stays BroTown's, handed in as `onTravel`.

- **The ✕ of a tall window was under the minimap's button.** The world map's
  invisible "open" button (`WorldMapOverlay.jsx`) is a fixed, z-index 45 portal
  in the page body laid over the minimap's box, above everything inside the
  game's wrapper, the windows included. A tall window's card is held 74 px
  down, so its close button (top right) is inside that box, and a finger on it
  opened the world map while the window stayed. True of the Marketplace and the
  Gambling Den already; the pictures make most windows tall, which is how
  `mp-buildingrooms` found it (`elementFromPoint` at the close button). While
  any `.bt-inspect` (a window, a card, its scrim) is up the button now lets
  taps through (`game.css`, `body:has(.bt-inspect) [data-world-map-open]`;
  `mp-wheelmap` still opens the map from the minimap).

## The Auction House's clerk

The Auction House has had a painting with a clerk behind its counter since
v2.3.2627. The old painting is replaced by the new one, so all seventeen are one
family, and the clerk stays: he is the game's own character drawn INTO the
room (the prompts leave rooms empty of people on purpose). He and where he stands
are data (`ROOM_KEEPERS`): his strip, his painted box, and three fractions.
Placed by looking at the new painting: centred (0.5) behind the lectern,
between the helmet case and the gem case, forearms on the red runner (base
0.665). At 0.645 the gavel sat in his hair; to the left he covers a display
case. The blink-and-smile loop moved to `.bt-room-keeper`. Another room's keeper
is a row in the table and nothing else.

## Memory, and the loading law

A picture is 1152 x 768 lossy WebP (~300 KB; 3.5 MB decoded). The owner's
1536 x 1024 PNGs were 2.6 to 4.2 MB each and 6.3 MB decoded for one window.
q90 at 2x zoom is indistinguishable from the lossless resize (checked on the
Saloon's sign). `tools/ui/make-room-pictures.py` makes them from a folder of
`<plot id>.png`.

CLAUDE.md's two rules pull against each other here: the preloading law (no
picture popping in after the window opens) and the memory budget (nothing held
everywhere that is used somewhere). The Auction House's two images were held
decoded for the whole session on the loading screen (9 MB). So **none of the
pictures is on the gate**:

- **The door you stand at decodes its room** (`warmRoom`, from BroTown's
  `nearBuilding` / `nearHall`), and the clerk's strip at the Auction House. A
  cap of one: the next door, or no door, lets it go. By the time Enter is
  tapped the picture is a bitmap.
- **The first shop's or hall's door you reach starts the others' bytes
  coming**, one at a time in idle moments at low priority (`prefetchRooms`),
  into the browser's own cache: never decoded,
  never held (~6 MB of bytes, once, the clerk's strip included). Not on `saveData` or a 2G link, where each
  room loads as it comes to it.
- `public/_headers` caches `/world/interiors/*` for a year; the pictures are
  asked for at `?v=2.3.3125` (`ROOMS_V`), so replacing one is a new address.
- Gone with the old painting: `auctionInteriorPreload.js` and its entry in the
  loading gate, `public/sprites/props/auction-house-interior.png` (1.6 MB), the
  `measure-auction-interior.mjs` tool that measured it.

## Not done, and why

- **No keepers in the other rooms.** The pictures say "the game draws its own
  characters in". Only the Auction House's clerk exists as art. The rest of
  town's cast stands outside (v2.3.3067), and each room needs its own placement
  by looking (the Bank's vault, the Gem Cutter's case and the Sheriff's cell sit
  where a keeper would stand).
- **The Hotel has no window.** Its rest is the farm bed's, on this device only,
  so it stays shut until the worker can pay for a rest.
- **Mayor Bro's own windows have no room.** The owner chose a Town Hall window
  over putting the room behind his dialogue; his dialogue and quest offer are as
  they were.
- **No picture on the Market.** It is a screen of its own, not a building.

## Tests

- `tools/world/test-world-core.mjs` "the buildings' insides": every door opens
  its own room; sixteen windows, sixteen rooms; all seventeen files on disk at
  1152 x 768 under 450 KB; the clerk's strip and cell; the Town Hall's rows; the
  wiring and the CSS.
- `node tools/qa/mp/run.mjs buildingrooms`: a phone walks to each of the sixteen
  doors; the door decodes its room; the window opens with it flush, the right
  shape, the panel under it, the close button above it; the clerk; the Land
  Office; no room on the Market; a shorter and a sideways phone; a picture that
  fails; walking away lets it go. Pictures: `tools/qa/mp/out/buildingrooms-*.png`.
