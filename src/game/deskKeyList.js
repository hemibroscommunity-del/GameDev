/* ═══ v2.3.3687: THE COMPUTER'S CONTROLS, AS THEY ARE RIGHT NOW ═══
 *
 * The owner, 2026-10-28: "Keyboard instructions need to be dynamic since
 * "whirl" doesn't work if you don't have your sword equipped", and "find a
 * good place to keep a list of all the controls. I was thinking on the black
 * of the menu would fit nicely".
 *
 * The list KeyboardHintsPanel.jsx draws (the strip, and on a computer playing
 * wide its own column beside the page: deskWide.js).  It used to list every
 * key whatever you held ("listed unconditionally, unlocked or not",
 * v2.3.1733), so R Whirl sat there with a bow in hand, where it does nothing.
 * Now a key with a requirement is listed only while it is met, by the same
 * rules its touch button follows:
 *   - `shield`  the right mouse button held raises a shield only with one
 *               (shieldToggle.js: no shield item, no block) -- Q until
 *               v2.3.3711;
 *   - `bash`    a left click with the shield up, the shield bash: a shield,
 *               and the bash unlocked (abilityStatus's needsHeldShield, the
 *               touch button's rule) -- Q+E until v2.3.3711, and E with the
 *               guard up still bashes, unlisted;
 *   - `whirl`   R: the sword (or greatsword) in hand and the whirlwind
 *               unlocked (abilityStatus's needsMeleeActive, v2.3.2327);
 *   - `burst`   F: a weapon the Element Burst can fire from, at its level
 *               (burstRefusal, the touch button's rule: only short of mana
 *               it stays) -- G until v2.3.3711, and G still fires it,
 *               unlisted;
 *   - `trap`    T: a box trap in the bag on a worker that traps (the TRAP
 *               pop-up's own rule since v2.3.3626, without the target: the
 *               key stays listed between monsters);
 *   - `food`    V: cooked food in the bag (quickEatChoices);
 *   - `sprint`  Shift: a worker that settles a sprint (caps.sprint).
 * The rest work for everyone, every weapon.
 *
 * ═══ v2.3.3711: THE OWNER'S LAYOUT, AND ITS COMBOS ═══
 * The owner: "Do your recommended keyboard layout. I still think there are
 * better layouts if you consider more creative combos (like keyboard presses
 * while a click is held down, double clicking, etc)."  The left hand on WASD,
 * the right on the mouse (docs/specs/desktop-keys.md "v2.3.3711"):
 *   - Q the weapon's special (was F, and the right click), F the Element
 *     Burst (was G), the right mouse button HELD the shield (was Q), a left
 *     click while it is up the bash (was Q+E), the wheel the next or last
 *     weapon (Tab and 1-3 stay);
 *   - `2×WASD` a direction key tapped twice rolls that way (Space still
 *     rolls), `2×Click` a double click on a monster locks on to it (with the
 *     sword, the opening lunge) -- game/deskCombos.js;
 *   - `+Click` is listed right under `R-Click`, so the pair reads as the
 *     combo it is: the right button held, then a click.
 * A key's words fit the column (74 px of 15 px bold beside a 58 px key cap:
 * mp-deskwide checks none is cut short), so the shield's row says "Shield"
 * and the press-and-hold is the right button's own way.
 *
 * GROUPS.  The column is the panel's height, so the list is in four groups
 * with a heading each -- moving, fighting, the rest, and the menus' letters
 * (deskKeys.js NAV_KEYS and MAP_KEY: their buttons wear them too, and this is
 * the one place a player reads them all) -- spread down the column.
 *
 * No imports: the component works `have` out from the game (it imports the
 * rules), and server/test/desk-keys.test.mjs runs this table in node. */

/** The groups, in the order they are listed: [id, heading]. */
export const DESK_KEY_GROUPS = [
  ['move', 'Move'],
  ['fight', 'Fight'],
  ['other', 'Other'],
  ['menus', 'Menus'],
];

/** [key, words, requirement or null, group], in the order they are listed. */
export const DESK_KEY_ROWS = [
  ['WASD', 'Move', null, 'move'],
  ['Shift', 'Sprint', 'sprint', 'move'],
  ['Space', 'Dodge', null, 'move'],
  ['2\u00d7WASD', 'Dodge', null, 'move'],   /* v2.3.3711: a direction tapped twice */
  ['X', 'Jump', null, 'move'],
  ['Click', 'Attack', null, 'fight'],
  ['2\u00d7Click', 'Lock on', null, 'fight'],   /* v2.3.3711: a double click on a monster */
  ['Q', 'Special', null, 'fight'],   /* v2.3.3711: was F and the right click */
  ['R-Click', 'Shield', 'shield', 'fight'],   /* v2.3.3711: held; was Q */
  ['+Click', 'Bash', 'bash', 'fight'],   /* v2.3.3711: a click with it held; was Q+E */
  ['R', 'Whirl', 'whirl', 'fight'],
  ['F', 'Burst', 'burst', 'fight'],   /* v2.3.3711: was G */
  ['T', 'Trap', 'trap', 'fight'],
  ['V', 'Eat', 'food', 'fight'],
  ['Wheel', 'Swap', null, 'fight'],   /* v2.3.3711: the mouse wheel */
  ['Tab', 'Swap', null, 'fight'],
  ['1-3', 'Weapon', null, 'fight'],
  ['E', 'Interact', null, 'other'],
  ['B', 'Emotes', null, 'other'],
  ['C', 'Chat', null, 'other'],
  ['H', 'Hide this', null, 'other'],
  ['Esc', 'Close', null, 'other'],
  ['I', 'Bag', null, 'menus'],
  ['P', 'Character', null, 'menus'],
  ['J', 'Quests', null, 'menus'],
  ['L', 'Skills', null, 'menus'],
  ['K', 'Codex', null, 'menus'],
  ['O', 'More', null, 'menus'],
  ['M', 'Map', null, 'menus'],
];

/** The requirements a row may name, in the stamp's order. */
const NEEDS = ['sprint', 'shield', 'bash', 'whirl', 'burst', 'trap', 'food'];

/** The rows to list for what you have: `have` maps each requirement to true
    when it is met (an absent one is not met). */
export function deskKeyRows(have) {
  var h = have || {};
  return DESK_KEY_ROWS.filter(function (r) { return !r[2] || h[r[2]] === true; });
}

/** The rows in their groups: [{id, label, rows}], a group with nothing to
    list left out. */
export function deskKeyGroups(have) {
  var rows = deskKeyRows(have);
  return DESK_KEY_GROUPS.map(function (g) {
    return { id: g[0], label: g[1], rows: rows.filter(function (r) { return r[3] === g[0]; }) };
  }).filter(function (g) { return g.rows.length > 0; });
}

/** A string that changes exactly when the list does, to re-render on. */
export function deskKeyStamp(have) {
  var h = have || {};
  return NEEDS.map(function (k) { return h[k] === true ? '1' : '0'; }).join('');
}
