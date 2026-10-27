/* ═══ v2.3.3016: THE WHEEL'S DUNGEONS -- THE CLIENT'S TABLE ═══
 *
 * Which lands' landmarks are dungeons today, how near a mouth the Enter
 * button comes up, and each mouth's light.  No imports, so the server's
 * mirror-audit.test.mjs can read it; the logic is game/wheelDungeons.js, the
 * drawing rendering/wheelDoors.js, the worker's half server/src/
 * wheeldungeon.js.
 */

/* MIRROR: the keys of server/src/wheeldungeon.js WHEEL_DUNGEON.LANDS.
   v2.3.3540: + the Verdant Wilds' Goo Grotto, the starter dungeon (levels
   1-5), the owner's "I value SIMPLICITY and INTELLIGIBILITY": the three
   before it are levels 26-45 */
export const WHEEL_DUNGEON_HOMES = ['hollows', 'thunder', 'sky', 'verdant'];

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
  verdant: { glow: 0x8cf06a, rim: 0x2f6a2a, label: '#b9ff9c' },   /* v2.3.3540: the Goo Grotto, slime green */
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
  /* v2.3.3540: the Goo Grotto -- the Verdant Wilds' wet mossy stone and
     fern-covered earth, the waterfall cliffs' ground */
  verdant: { pic: 'verdant-3', wall: 0x111a10, edge: 0x3f5a2c },
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

/* ═══ v2.3.3573: A DUNGEON BUILT FOR A PARTY -- THE GOO GROTTO ═══
   The owner: "I want the goo grotto dungeon to be very difficult without a
   party of 2-3 people."  A land here is a dungeon of `level` whoever comes in,
   its boss sized for `size` players: the phone says so where the place's
   levels were (the world map's "Lv 16 · 2–3 players", the line at
   its mouth), against caps.partydungeon -- an older worker still plays the
   place's levels, and the phone says those (game/wheelDungeons.js
   wheelDungeonParty).  MIRROR: server/src/wheeldungeon.js WHEEL_DUNGEON.PARTY
   (mirror-audit). */
export const WHEEL_DUNGEON_PARTY = { verdant: { level: 16, size: 3 } };

/* ═══ v2.3.3608: THE LEVEL A PARTY SHOULD BE, SAID ═══
   The owner, 2026-10-26: "Change the recommended level for the slime grotto
   dungeon to lvl 10 (don't change any difficulty settings)".  The words say
   the level the Grotto is FOR -- the owner's v2.3.3573 brief: "most people
   will be around lvl 10 and have iron equipment", in a party of 2 or 3 -- as
   "Lv 10+"; its monsters and boss stay WHEEL_DUNGEON_PARTY's level 16 (the
   worker's, mirror-audited).  The phone's own words, so no mirror. */
export const WHEEL_DUNGEON_REC = Object.freeze({ verdant: 10 });

/* The words (game/wheelDungeons.js says when): the world map's line under a
   dungeon's name, and the line under the Enter button at its mouth.  `party`
   a row of WHEEL_DUNGEON_PARTY, or null for a dungeon sized by who comes in.
   The map's party line leaves "dungeon ·" out: a label is drawn only where it
   clears the ones before it, and "dungeon · Lv 16 · 2–3 players", twice the
   old line's width, lost to the stage's name at the zoom you reach it at
   (mp-googrotto); "Lv 16 · 2–3 players" is about the old one's. */
/* v2.3.3608: `rec`, the level it is for (WHEEL_DUNGEON_REC), said as "Lv 10+"
   in place of its monsters' level */
const _lvWord = (party, rec) => (rec > 0 ? rec + '+' : party.level);
export function dungeonLevelsLine(party, levels, rec) {
  if (party) return `Lv ${_lvWord(party, rec)} · ${party.size - 1}–${party.size} players`;
  return Array.isArray(levels) ? `dungeon · Lv ${levels[0]}–${levels[1]}` : 'dungeon';
}
export function dungeonDoorLine(party, rec) {
  return party ? `Lv ${_lvWord(party, rec)} · for ${party.size - 1}–${party.size} players` : null;
}
