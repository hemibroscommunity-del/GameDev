/* ═══ v2.3.3142: THE INSIDE OF EACH BUILDING ═══
 *
 * Owner, 2026-10-06: sent seventeen pictures of the inside of BroTown's
 * buildings (the prompts are docs/ART-WISHLIST.md "Inside the buildings"; the
 * pictures were made from them in ChatGPT) and said "Ok wire these up".
 * Each is shown at the top of its building's window when you walk in, the way
 * the Auction House's painting always was (v2.3.2627, now replaced by this
 * set so all seventeen rooms are one family).
 *
 * Which window shows which room is this table: the `buildingPanel` value a
 * door opens (src/game/interactions.js enterBuilding -> setBuildingPanel) ->
 * the plot id of the building (public/tools/world/plan.js town.lots), which
 * is also the picture's name, public/world/interiors/<plot id>.webp.  The
 * panels themselves are untouched: BroTown.jsx draws ONE <BuildingRoom/> at
 * the top of the window card for whichever panel is open
 * (src/ui/panels/buildings/BuildingRoom.jsx).
 *
 * No imports, so tools/world/test-world-core.mjs can read it: it checks every
 * door of the Wheel's Brotown (WHEEL_BUILDING_DOORS, WHEEL_HALL_DOORS) lands
 * on its own room, and that every picture is on disk at the size this says.
 */

/* Bump when a picture is replaced (tools/ui/make-room-pictures.py): the files
   are cached for a year (public/_headers) and asked for at this address. */
export const ROOMS_V = '2.3.3142';
export const ROOM_DIR = '/world/interiors/';
/* What tools/ui/make-room-pictures.py makes: 1152 x 768 (3:2).  A 360 CSS px
   window on a 3x phone is 1080 device px, so this is the size it wants, and it
   is 3.5 MB decoded -- the raw 1536 x 1024 would be 6.3 MB for one window. */
export const ROOM_W = 1152;
export const ROOM_H = 768;

/* buildingPanel value -> plot id.  Sixteen windows, fifteen rooms: the Gem Works'
   two tabs ('gemcut' and 'enchant', v2.3.3143) are one room, and the Assay Office
   that had its own is gone.  (The Feed & Seed, the Land
   Office's trip to your farm, the Saloon and the rest open today's own
   panels; the Guild Hall, Post Office and Sheriff's Office are the Wheel's
   halls, v2.3.3066, and so is the Town Hall, v2.3.3142).  'store' (the Market,
   reached by a button inside the Auction House's and the General Store's
   windows) has none: it is a screen of its own, not a building. */
export const BUILDING_ROOMS = {
  forge: 'blacksmith',
  exchange: 'store',          /* the General Store's market */
  bank: 'bank',
  party: 'saloon',            /* the Saloon's party panel (and the arena sign-up the Sheriff sends you to) */
  woodwork: 'woodworker',
  gemcut: 'gemcutter',
  cook: 'cookhouse',
  enchant: 'gemcutter',       /* v2.3.3143: the Enchanter is the Gem Works' second tab -- the same room as 'gemcut' (the Assay Office is gone) */
  gamble: 'gambling',
  farm: 'feedseed',
  farmhome: 'landoffice',     /* the trip to your own farm */
  post: 'post',
  sheriff: 'sheriff',
  guildhall: 'guildhall',
  townhall: 'townhall',       /* v2.3.3142: a hall of the Wheel's own, the leaderboard and the world map */
  auctionhouse: 'auction',
};

/* Pictures made and shipped for buildings that have no window yet: the Hotel
   is shut (its rest is the farm bed's, on this device only --
   WHEEL_SHUT_DOORS).  It costs nothing until a window asks for it;
   test-world-core checks the file is there, so the day it opens it is one line
   in BUILDING_ROOMS.  (The Town Hall's was held here until v2.3.3142 made it a
   hall.) */
export const SPARE_ROOMS = ['hotel'];

/* Windows whose card sits LOW so something above stays in view: the forge's
   (BroTown.jsx: the smith is seen working above it, game/smithing.js).  A
   full 3:2 picture would fill the whole card, so these show a slim band of
   the room instead -- its sign, the forge and the anvil. */
export const BAND_ROOMS = ['forge'];

/* ═══ THE PEOPLE THE GAME DRAWS INTO A ROOM ═══
   The pictures are empty of people on purpose (the prompts say so): the game
   puts its own characters in, so they can blink and smile.  One so far -- the
   Auction House's clerk, behind his counter, who has been there since v2.3.2627
   (the owner's "a clerk behind the counter"), re-placed on the new painting.
   Add a room's keeper here and BuildingRoom.jsx draws him; nothing else to do.

     src     the idle strip: `frames` frames side by side, each `cell` px
     art     frame 0's painted box in strip px (x0..x1, y0..y1).  The figure is
             CUT at y1 (the forearms), so he cannot go between the back wall
             and the counter -- the room is one flat painting with no layer to
             slide him into.  He is drawn ON TOP with that cut landing on the
             counter's top surface, which reads as a man leaning on it.
     w       his painted width, as a fraction of the room's width
     cx      the centre of that width, as a fraction of the room's width
     base    the row his forearms rest on, as a fraction of the room's height

   Placed by looking: on the Auction House's painting the lectern is in the
   middle of the room, between the helmet case and the gem case, and at cx 0.5
   he stands behind it with the gavel on the lectern above his head (at base
   0.645 the gavel sat in his hair), forearms on the red runner.  Left of the
   lectern or at the far end he covers a display case or the barrel. */
export const ROOM_KEEPERS = {
  auction: {
    src: '/sprites/npc/storekeeper-bro-idle.png',
    frames: 6,
    cell: { w: 362, h: 724 },
    art: { x0: 18, y0: 200, x1: 361, y1: 580 },
    w: 0.12, cx: 0.5, base: 0.665,
  },
};

const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

/** The plot id whose room a window shows, or null (no room for that panel). */
export function roomIdFor(panel) {
  return own(BUILDING_ROOMS, panel) ? BUILDING_ROOMS[panel] : null;
}

/** True for a window that shows the slim band, not the whole room. */
export function isBandRoom(panel) {
  return BAND_ROOMS.indexOf(panel) >= 0;
}

/** Where a room's picture is asked for. */
export function roomUrl(roomId) {
  return ROOM_DIR + roomId + '.webp?v=' + ROOMS_V;
}

/** The keeper drawn into a room, or null. */
export function keeperFor(roomId) {
  return own(ROOM_KEEPERS, roomId) ? ROOM_KEEPERS[roomId] : null;
}

/** Where a keeper's cell goes in the room, as percentages of the room's own
    box ({ left, top, width, height }): the painted width is `w` of the room,
    centred on `cx`, with his forearms on row `base`.  The cell is drawn whole
    (the art is inset in it), so it is bigger than the figure. */
export function keeperBox(k) {
  const cw = k.art.x1 - k.art.x0 + 1;               /* painted px across */
  const scale = (k.w * ROOM_W) / cw;                 /* strip px -> room px */
  return {
    left: ((k.cx * ROOM_W - (k.art.x0 + cw / 2) * scale) / ROOM_W) * 100,
    top: ((k.base * ROOM_H - (k.art.y1 + 1) * scale) / ROOM_H) * 100,
    width: ((k.cell.w * scale) / ROOM_W) * 100,
    height: ((k.cell.h * scale) / ROOM_H) * 100,
  };
}
