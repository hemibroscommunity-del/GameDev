# The room behind each building's menu, and the keepers (v2.3.3258)

> Owner, 2026-10-06: sent seventeen pictures of the inside of BroTown's
> buildings (made in ChatGPT from the prompts in `docs/ART-WISHLIST.md`,
> "Inside the buildings") and said *"Ok wire these up."*
>
> Owner, 2026-10-15, asked whether players should walk around inside the
> buildings, see one still picture of a shopkeeper, or meet the shopkeeper
> outside: *"Yes I like your idea of interacting with the building's NPC
> instead of having the building interiors. Have it open up as backgrounds
> behind the different buildings menus instead of literally going into a
> building"*

Nobody walks into a building. Its window opens over the street, and **the
owner's picture of the room is the window's background**: the sign and the
middle of the room at the top, the room fading into the window's slate under
the menu, the menu's title and first rows written on it. Sixteen windows show
one (the Gem Works' two tabs, v2.3.3259, share the Gem Cutter's). The Hotel's
picture had no window and was shipped, waiting, until v2.3.3539 opened the
Hotel (seventeen windows since: docs/specs/hotel-rest.md); the Assay Office's
went with that building (docs/specs/gem-works.md).

**A keeper opens his building when you talk to him.** Blacksmith Bro, who
stands at the forge's steps, opens the forge; Mayor Bro opens the Town Hall
once he has no quest for you. The other buildings keep their door until each
has a keeper of its own (the prompts are in `docs/ART-WISHLIST.md`, "The
keepers"). Every door still opens too.

## Which window shows which room, and who opens it

| Building | Window (`buildingPanel`) | Picture | Opened by |
|---|---|---|---|
| Blacksmith | `forge` | `blacksmith` (its stage a slim band, below) | **Blacksmith Bro**, or the door |
| General Store | `exchange` (the market) | `store` | the door (Diego, beside it, keeps his own shop window) |
| Bank | `bank` | `bank` | the door |
| Saloon | `party`: the Saloon's own window, your party and Invite a player (below) | `saloon` | the door |
| (the arena) | `arena`: the Gladiator Arena, opened from the Sheriff's Office | none: a window of its own | the Sheriff's Office's "The arena" |
| Woodworker | `woodwork` | `woodworker` | the door (Beastmaster Bro, beside it, is the trapper) |
| Gem Works (the Gem Cutter's building, v2.3.3259), its tab "Cut gems" | `gemcut` | `gemcutter` | the door |
| Cookhouse | `cook` | `cookhouse` | the door |
| Gem Works, its tab "Set gems" (the Assay Office's window until v2.3.3259, when that building went) | `enchant` | `gemcutter`, the same room | the Gem Works' door, then the tab |
| Gambling Den | `gamble` | `gambling` | the door (Ace, beside it, keeps his coin flip) |
| Feed & Seed | `farm` | `feedseed` | the door |
| Land Office | `farmhome` (the trip to your farm) | `landoffice` | the door |
| Post Office | `post` | `post` | the door |
| Sheriff's Office | `sheriff` | `sheriff` | the door |
| Guild Hall | `guildhall` | `guildhall` | the door |
| Town Hall | `townhall` (a hall, below) | `townhall` | **Mayor Bro** (his quests first), or the door |
| Auction House | `auctionhouse` | `auction`, with its clerk | the door |
| Hotel | `hotel` (a hall since v2.3.3539) | `hotel` | the door |

The rooms are `src/data/buildingRooms.js` (`BUILDING_ROOMS`), the keepers
`src/data/wheelBuildingDoors.js` (`WHEEL_KEEPERS`). The Market itself (`store`,
reached by a button inside the Auction House and the General Store) is a
screen of its own and shows no room. The held picture (`SPARE_ROOMS`) costs
nothing until a window asks for it; the day the Hotel opens it is one line in
the table.

## How the room is drawn behind the menu

`BroTown.jsx` draws one `<BuildingRoom/>` (`src/ui/panels/buildings/
BuildingRoom.jsx`) first inside the window card, for whichever building panel is
open. **None of the panels was touched**: one set of rules in `game.css`
(".bt-room") lays every one of them on its room.

- **The room is the card's back layer.** It is placed over the whole card,
  behind everything in it (`z-index: -1` in the card's own stacking context),
  the picture 3:2 at the card's width (240 px on a phone). It is clipped to the
  card's height, so a short window never scrolls to show more picture.
- **The menu starts a stage down the room.** The stage, `--room-stage`, is 62%
  of the picture's height: the sign and the middle of the room, 149 px on a
  phone, at most 22vh on a short one. The panel's own surface is taken away, and
  so is its title strip's (every panel's first child is its title: a strip of
  its own colour in eleven, bare text in five). So the title and the first rows
  are written on the room.
- **The room fades into the slate under the menu.** A shade over the picture is
  clear down to 40 px above the stage, half dark at the stage's line, nearly
  dark 36 px below it and the window's slate (#1E2E34) 80 px below it. The
  title always reads, and the rows under it sit on the slate as before.
- **It scrolls with the menu.** A background that stayed still while the menu
  scrolled would put its words on the room's bright sign.
- **The stage is a length**, because the shade's stops need the same number.
  62% of 3:2 is 41.33% of the card's width, and the card is
  `min(360px, 100vw - 24px)` wide (its inline style in `BroTown.jsx`): the
  stage is `min(148.8px, 41.33vw - 9.92px, 22vh)`. If the card's width ever
  changes, this must too. `test-world-core` checks the two together.
- **The forge's window sits low** so the smith is seen working above it
  (v2.3.2826). Its stage is a slim band, a quarter of the width (90 px): the
  scene is pulled up 7.33% of the width, so the band shows the sign, the fire,
  the hammers and the anvil.
- **A sideways phone** (under 460 px tall, where the whole window is about
  190 px) has no room for a stage. The room steps aside, and every rule that
  lays the menu on it sits in a `min-height` query, so the panel is exactly as
  it was.
- **The close button** sits on the picture on a dark disc.
- **The picture's box is reserved** before it arrives (the dark of the panels'
  wells), so nothing jumps, and the picture fades in. A picture that cannot be
  loaded takes its box with it, and the stage goes too: the window reads exactly
  as it did before the pictures.
- **The Land Office was not a card panel, and had to become one.** Its trip to
  your farm was a small dialog drawn as a separate overlay (z-index 30) under the
  card every building opens (z 32), which was drawn EMPTY above it. With the
  room's picture in the card it covered "Travel to Farm" altogether (found by
  `mp-buildingrooms`). It is `LandOfficePanel.jsx` now, in the card like the
  others, with the dialog's words and buttons; the trip itself stays BroTown's,
  handed in as `onTravel`.
- **The ✕ of a tall window was under the minimap's button.** The world map's
  invisible "open" button (`WorldMapOverlay.jsx`) is a fixed, z-index 45 portal
  in the page body laid over the minimap's box. A tall window's close button is
  inside that box, so a finger on it opened the world map while the window
  stayed. While any `.bt-inspect` is up, the button now lets taps through
  (`game.css`, `body:has(.bt-inspect) [data-world-map-open]`; `mp-wheelmap`
  still opens the map from the minimap).

### The two looks that were tried first

1. **v2.3.3147 (#841's first version): the picture on top, the menu under it.**
   The picture was a box at the top of the window and the panel started where it
   ended. The owner then asked for backgrounds "behind" the menus.
2. **A sheet laid on the picture.** The menu was an opaque, rounded sheet
   overlapping the picture's lower part, the picture staying still while the
   menu scrolled. On a phone it still read as a picture above a menu, because
   the sheet hid everything it covered.

The fade is the one where the menu is visibly on the room.

## The keepers

`WHEEL_KEEPERS` names who keeps what: townsperson name to the plot whose window
they open. `_spawnWheelNpcs` (BroTown.jsx) gives the Wheel's copy of each one
`keeperOf`, only where that building stands with something to open. Talking to
him opens it in each of the three ways you talk to anyone:

- **a tap on him** (`tapNpcAtCss`, its result `'opens'`);
- **E beside him** (desktopControls.js `runTalk`, through `_desktopOpenKeeper`);
- **a tap on the right stick** beside him (the stick asks for the character
  first).

Each comes after his quest. The Mayor's chain is untouched, and he opens the
Town Hall only when he has nothing to offer, ask about or pay for. It goes
through the door's own path (`interactions.js` `enterWheelDoor`): the same
window and the same visit counted (mayor_1's "visit 3 buildings").

Only the keepers whose picture exists are keepers. Diego keeps his own shop and
Ace his coin flip, the windows the owner designed for them, and Beastmaster Bro
is the trapper, not the Woodworker. A new keeper is his picture, an `NPC_DATA`
record, a `WHEEL_TOWNSFOLK` row at his door and a `WHEEL_KEEPERS` row. Once a
building has its keeper, its door's Enter button can go if the owner wants.

## The Saloon, and the arena's own window

The owner, on #841's preview: *"I think the arena window is popping up in the
wrong place. Well the gladiator arena is showing 'saloon' behind it"*. The
Saloon's door (`party`, today's town's TAVERN, "Form parties") had opened the
Gladiator Arena since v2.3.881, when the arena lived in the panel named for
parties (`PartyPanel`). With the Saloon's picture behind every window, that was
plain to see.

- **The arena is its own window**, `arena`, opened from the Sheriff's Office
  ("Duels and the arena", its "The arena" row). It has no room behind it: no
  picture of the arena exists yet, and it is not the Sheriff's Office either.
- **The Saloon is the Saloon** (`SaloonPanel` in `WheelHallPanel.jsx`): your
  party as the worker last said it (you first, each member's level), or how a
  party works, and **Invite a player** (the player list, where a player's card
  has Invite to Party). Nothing new on the wire. (v2.3.3481, the 2026-10-19 UI
  review: it was "Find a party", but the worker refuses an invite to anyone
  already in a party, so the row can only invite someone into yours; with no
  party it comes first, above how a party works.)

## The Town Hall window

The owner sent its picture last and, asked what it should do, chose **a Town
Hall window** over drawing the room behind Mayor Bro's dialogue or leaving it
waiting. It is the fourth of the Wheel's halls (`WHEEL_HALL_DOORS.townhall`,
v2.3.3066's `WheelHallPanel`), and the two rows are the two things its own
picture shows:

- **Leaderboard**: the trophy case. The dashboard's own Ranks page, opened as
  the More page's tile opens it (`dashboardPanelBus.open('more')` then
  `push('leaderboard')`, so the back chip goes to More).
- **World map**: the painted map on the wall, the Wheel's labelled map;
  `WorldMapOverlay.jsx` exports `openWorldMap()` for it.

Mayor Bro opens it once his quests are done, and its door's "Enter TOWN HALL"
opens it at any time. A hall is not a building visit, so mayor_1's count is
untouched. A new character arrives 108 px south of the door's foot and the
button comes up 140 px from the BOOTS, so a new character does not start with
it showing (`mp-wheelhalls` §7). Everyone stands at this door in their first
minute, so it is the one door that does not start the other rooms' download
(`HUB_ROOMS` in `game/buildingRooms.js`).

## The Auction House's clerk

The Auction House has had a painting with a clerk behind its counter since
v2.3.2627. The new painting replaces the old, so all seventeen are one family,
and the clerk stays: he is the game's own character drawn INTO the room (the
prompts leave rooms empty of people on purpose). He and where he stands are data
(`ROOM_KEEPERS`): his strip, his painted box, and three fractions. He is centred
(0.5) behind the lectern, forearms on the red runner (base 0.665), and with the
fade he leans on the counter just above the menu's title.

## Memory, and the loading law

A picture is 1152 x 768 lossy WebP (~300 KB; 3.5 MB decoded).
`tools/ui/make-room-pictures.py` makes them from a folder of `<plot id>.png`.
The preloading law (no picture popping in after the window opens) and the
memory budget pull against each other here, so **none of the pictures is on the
loading screen**:

- **The door you stand at decodes its room** (`warmRoom`, from BroTown's
  `nearBuilding` / `nearHall`), and the clerk's strip at the Auction House. A
  cap of one: the next door, or no door, lets it go. By the time Enter is tapped
  the picture is a bitmap.
- **The first shop's or hall's door you reach starts the others' bytes
  coming**, one at a time in idle moments at low priority (`prefetchRooms`),
  into the browser's own cache: never decoded, never held (~6 MB of bytes,
  once). Not on `saveData` or a 2G link, where each room loads as it comes to
  it. So a keeper's window, opened a few steps from his door, finds its picture
  already decoded or in the cache.
- `public/_headers` caches `/world/interiors/*` for a year; the pictures are
  asked for at `?v=2.3.3143` (`ROOMS_V`), so replacing one is a new address.
- Gone with the old painting: `auctionInteriorPreload.js` and its entry in the
  loading gate, `public/sprites/props/auction-house-interior.png` (1.6 MB), and
  the `measure-auction-interior.mjs` tool.

## Not done, and why

- **Keepers for eleven buildings.** The Bank, Saloon, Woodworker, Gem Works
  (two keepers since v2.3.3259: a cutter and a setter, each opening his tab),
  Cookhouse, Feed & Seed, Land Office, Post Office, Sheriff's Office, Guild Hall
  and Auction House have nobody outside to talk to. Each needs
  a picture of the person; every townsperson's picture so far is the owner's.
  The prompts are in `docs/ART-WISHLIST.md`, "The keepers". The Auction House's
  clerk already exists as art (`storekeeper-bro.webp`, the man behind its
  counter), so he could stand outside it with no new picture. That is the
  owner's call: he was taken out of the old town once (v2.3.2091) as a second
  shopkeeper.
- **Diego's shop and Ace's coin flip have no room behind them.** They are their
  own windows, designed by the owner (Diego's grows out of the bag, Ace's is his
  dialog). The General Store's and Gambling Den's rooms are behind the windows
  their doors open.
- **The Hotel has no window.** Its rest is the farm bed's, on this device only,
  so it stays shut until the worker can pay for a rest. (Since v2.3.3539 the
  worker does, and the Hotel has its window: docs/specs/hotel-rest.md.)
- **No picture on the Market.** It is a screen of its own, not a building.

## Tests

- `tools/world/test-world-core.mjs`, "the buildings' insides" and "the keepers":
  - every door opens its own room;
  - sixteen windows, fifteen rooms (the Gem Works' two tabs share one,
    v2.3.3259);
  - all sixteen files on disk at 1152 x 768, under 450 KB;
  - the clerk's strip and cell, and the Town Hall's rows;
  - the background's rules, and the stage's numbers against the card's width;
  - each keeper stands at the building he opens, which has a window;
  - a tap, E and the stick open it after his quest, through the door's own
    path.
- `node tools/qa/mp/run.mjs buildingrooms`, a phone against a real worker:
  - it walks to each of the fifteen doors, and each door decodes its room;
  - each window opens on its room as its background: the room behind the card,
    3:2, the menu a stage down it, the panel's and title's surfaces gone, the
    title and the close button on top;
  - the clerk, the Land Office, and no room on the Market;
  - the Gem Works' two tabs (v2.3.3259): one window, its room behind both and
    not loaded again on a tab change, each tab reachable by a finger;
  - a shorter phone (the stage held to 22vh), a sideways one (the panel as it
    was), and a picture that fails;
  - a tap on Blacksmith Bro, and E beside him, open the forge; a tap on Mayor
    Bro, his quests done, opens the Town Hall;
  - walking away lets the held picture go.
  - Pictures: `tools/qa/mp/out/buildingrooms-*.png`.
