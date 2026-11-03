/* ═══ v2.3.3766: THE RED PIN AND THE BLUE PIN ═══
 *
 * The owner, of the Town Hall's board (data/townBoard.js): "pin drop you can
 * put on the map to go to the one you want (two pins can be active at once -
 * red pin and blue pin)".
 *
 * A board pin is the board's ID of a place (a row of BOARD), never a
 * position: the place is found where it stands each time it is drawn
 * (game/mapPinPlaces.js), so a pin follows the game's own data.
 *   - "Red pin" on a page puts the red pin THERE, moving it from wherever it
 *     was; the same for blue.  The same press where it already is lifts it.
 *   - Both can be up at once, even on one place.
 *   - They stay until lifted, per character: localStorage `bt_pins:<id>`.
 *
 * ═══ v2.3.3975: ONE STORE FOR BOTH KINDS OF PIN ═══
 * The board's pins and the pin you drop on the World map are the same two
 * slots now, blue and red (game/pinSlots.js, its header has the rules): a
 * slot holds a board row OR a place.  This module keeps the board's names and
 * signatures for the board (ui/panels/buildings/TownBoard*.jsx, and the
 * noticeboard it is moving to): they are pinSlots.js's own, re-exported.
 * pinsOf names only rows, so a board tile wears a pin only for its own row.
 *
 * No imports but the store: a node suite reads it
 * (server/test/town-board.test.mjs).  The storage is passed in, so the suite
 * hands it a Map. */
export { PIN_COLORS, PIN_CSS, PIN_KEYS, loadPins, pinsOf, pinsVersion, togglePin, pinsOn } from './pinSlots.js';
