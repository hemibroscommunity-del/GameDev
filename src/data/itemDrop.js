/* ═══ v2.3.3473: THE DROP'S RULES THE PHONE NEEDS (docs/specs/item-drop.md) ═══
 *
 * The worker's own copy is ITEM_DROP in server/src/itemdrop.js; mirror-audit
 * holds the two together.  No imports, so the server's suites can read it.
 */

/* Where no pile is ever kept: the safe zones (data/zones.js `safe`) --
   today's town, the old World View (closed, `?trial=off`) and the farm.  The
   ground-loot loop empties a safe zone's piles (game/groundLoot.js), so a
   drop there would be gone from the screen as it landed; the worker refuses
   one ('not-here') and the bag's card greys its Drop. */
export const NO_DROP_ZONES = Object.freeze(['town', 'worldview', 'farm_home']);

/* The drop's clocks, for the words on the card; the pile itself is timed by
   the worker's time-left fields, never by these */
export const DROP_PRIVATE_MS = 60000;
export const DROP_FLASH_MS = 120000;
export const DROP_GONE_MS = 130000;
