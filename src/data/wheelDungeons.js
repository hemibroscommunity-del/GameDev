/* ═══ v2.3.3016: THE WHEEL'S DUNGEONS -- THE CLIENT'S TABLE ═══
 *
 * Which lands' landmarks are dungeons today, how near a mouth the Enter
 * button comes up, and each mouth's light.  No imports, so the server's
 * mirror-audit.test.mjs can read it; the logic is game/wheelDungeons.js, the
 * drawing rendering/wheelDoors.js, the worker's half server/src/
 * wheeldungeon.js.
 */

/* MIRROR: the keys of server/src/wheeldungeon.js WHEEL_DUNGEON.LANDS */
export const WHEEL_DUNGEON_HOMES = ['hollows', 'thunder', 'sky'];

/* How near a mouth (game px, from your middle) the Enter button comes up.
   Below the worker's own reach, WHEEL_DUNGEON.DOOR_R (260), so a tap at the
   edge of this one is never refused for a step of drift (mirror-audit). */
export const DOOR_R = 200;

/* Each mouth's light, by its land: the Great Cave's crystals, the Foundry
   Dome's blue windows, the Buried City's sun-baked terracotta (plan.js's own
   landmark colours, lifted to glow on a dark mouth). */
export const WHEEL_DOOR_LOOK = {
  hollows: { glow: 0x7fe3ff, rim: 0x2b6f86, label: '#9feaff' },
  thunder: { glow: 0x9aa8ff, rim: 0x3c4688, label: '#b8c2ff' },
  sky: { glow: 0xffb36b, rim: 0x8a4a22, label: '#ffcf9a' },
};

/* ═══ Each dungeon's floor and walls ═══
   The arena inside is floored with one of its land's own ground pictures
   (public/world/ground/<id>-A.png, the owner's swatches -- seamless, 512 game
   px each), the one that reads as the place: the Great Cave the Stone
   Hollows' deep cave stone, the Foundry Dome the Electric Foundry's iron
   floor plates, the Buried City the Wind Dunes' red sandstone.  The walls
   round it are drawn in code, in the floor's own darkest shade. */
export const WHEEL_DUNGEON_FLOOR = {
  hollows: { pic: 'hollows-4', wall: 0x14171b, edge: 0x3a4148 },
  thunder: { pic: 'thunder-2', wall: 0x141210, edge: 0x5a4a2c },
  sky: { pic: 'sky-3', wall: 0x2a140c, edge: 0x7a3c22 },
};

/* The arena (tiles of 32 game px), as the worker builds it (server/src/
   wheeldungeon.js WHEEL_DUNGEON.WIDTH/HEIGHT -- the size comes on
   dungeon_started; these are what the layout below assumes).  At least 33 x
   50 so an upright phone keeps the Wheel's own character size: a zone smaller
   than the screen is zoomed in until it fills it (worldViewport.js, the
   zone's no-void floor), and the Workshop's 28 x 22 drew the bro two and a
   half times his size.  The way out is in the last row of floor, on a bottom
   wall BOTTOM_WALL rows thick: the player's middle stops 80 px short of a
   map's bottom edge (BroTown.jsx _FOOT_MARGIN), so a door IN a one-row bottom
   wall, where the Workshop puts it, is never stepped on.  You arrive SPAWN_UP
   rows above the door. */
export const WHEEL_ARENA = { W: 36, H: 52, WALL: 1, BOTTOM_WALL: 3, SPAWN_UP: 7 };
