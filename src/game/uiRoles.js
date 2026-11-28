/* ═══ v2.3.6840: THE NINE ROLES OF A MENU'S PIECES (card UI4 PR 1, the owner's V17) ═══
 *
 * The owner's menu redesign, V17 (docs/design/v17/MASTER-IMPLEMENTATION.md,
 * lines 37-49), names nine roles a piece of a menu can have, and asks:
 * "Clearly distinguish passive facts, inspectable facts, navigation/
 * preparation, selected controls and commitments throughout every menu"
 * (line 9), and "Use explicit semantic role props at component creation (not
 * runtime regex/classification as in the prototype)" (line 49).
 *
 * This is the ONE table of them, with the game's names, and the ONE place
 * where a kit piece made with yesterday's props (an `onClick`, a colour `c`,
 * `selected`) is given its role.  Before this a role was guessed in each
 * piece: `typeof onClick === 'function'` in Group.jsx and Facts.jsx, a colour
 * name in Ui2Action, nothing at all on the header's Close.  Now each piece
 * asks ui2Role(); tools/guards/ui4-roles.test.mjs fails a guess written again.
 *
 * The prop is `intent` (V17 part 8, line 157: "explicit intent props"), not
 * `role`: `role` is the browser's own accessibility attribute, which the kit
 * already passes through (BroStrip.jsx gives Ui2Facts role="group"; the new
 * Tab must say role="tab").
 *
 * PR 1 changes NO look: the role is written on the piece (`data-u2-role`) and
 * no style sheet reads it yet; each role's look is today's (an Action made
 * with an intent and no colour wears today's face for it, ROLE_FACE).  PR 2
 * (`?v17look`) gives the roles V17's colours.  No imports: node tests it.
 */

/* press: 'must' (a button with a live handler), 'never' (no button form: a fact to read), 'may' (either).
   `line` is the row's line in V17 (docs/design/v17/MASTER-IMPLEMENTATION.md); its name there, and what it
   means, are the comment beside it (comments, not strings: none of this is a word a player reads). */
export const UI_ROLES = Object.freeze([
  Object.freeze({ id: 'info', line: 39, press: 'never' }),      /* Passive information: a fact to read, no button form */
  Object.freeze({ id: 'inspect', line: 40, press: 'must' }),    /* Inspection: a fact that opens to say why or how */
  Object.freeze({ id: 'go', line: 41, press: 'must' }),         /* Navigation/preparation: go somewhere, or get something ready */
  Object.freeze({ id: 'selected', line: 42, press: 'may' }),    /* Selected tab/filter: the one now chosen */
  Object.freeze({ id: 'adjust', line: 43, press: 'must' }),     /* Adjust/toggle/dismiss: a setting, a number, a cancel, a close */
  Object.freeze({ id: 'commit', line: 44, press: 'must' }),     /* Commit: does the thing (equip, spend, craft, accept, list) */
  Object.freeze({ id: 'danger', line: 45, press: 'must' }),     /* Destructive/high-risk commit: cannot be undone, or costs dearly */
  Object.freeze({ id: 'disabled', line: 46, press: 'may' }),    /* Disabled: cannot be used now, and says why */
  Object.freeze({ id: 'slot', line: 47, press: 'may' }),        /* Item slot: an item's place, its rarity, empty or filled */
]);
export const UI_ROLE_IDS = Object.freeze(UI_ROLES.map((r) => r.id));
const BY_ID = Object.freeze(Object.fromEntries(UI_ROLES.map((r) => [r.id, r])));

/** the role's row, or null */
export function uiRole(id) {
  return (typeof id === 'string' && Object.prototype.hasOwnProperty.call(BY_ID, id)) ? BY_ID[id] : null;
}

/* Every piece the kit exports (src/ui/kit/index.js), and its role:
 *   asks   more than one role fits it, so a NEW call names its `intent`
 *          (the calls on main when this came are on the allow list,
 *          tools/guards/lib/rolesKnown.mjs, and mapped from their props here);
 *   roles  the roles it may be made with (the first is its default);
 *   frame  it holds other pieces and has no role of its own.
 * A piece the table does not name is red in the guard. */
export const KIT_PIECES = Object.freeze({
  Ui2Action: Object.freeze({ asks: true, roles: Object.freeze(['commit', 'danger', 'adjust', 'go', 'disabled']) }),
  Ui2Tile: Object.freeze({ asks: true, roles: Object.freeze(['go', 'selected', 'disabled']) }),
  Ui2Stat: Object.freeze({ asks: true, roles: Object.freeze(['info', 'inspect']) }),
  Ui2Fact: Object.freeze({ asks: true, roles: Object.freeze(['info', 'inspect']) }),
  /* the five V17 names that the kit lacked (v2.3.6840) */
  Ui2Tab: Object.freeze({ roles: Object.freeze(['go', 'selected']) }),   /* `selected` says which: never a guess */
  Ui2Tabs: Object.freeze({ frame: true }),
  Ui2Stepper: Object.freeze({ roles: Object.freeze(['adjust']) }),
  Ui2InspectStat: Object.freeze({ roles: Object.freeze(['inspect']) }),
  Ui2Comparison: Object.freeze({ roles: Object.freeze(['info']) }),
  Ui2Overlay: Object.freeze({ frame: true }),   /* its ✕ is adjust (a dismiss) */
  /* v2.3.6843 (card UI4 PR 4, Bro): a weapon's door with its level, bar and points (V17:49's NavigationTile and
     Progress in one); the strip that pages by whole entries (its "more" is an Action that adjusts) */
  Ui2LevelTile: Object.freeze({ roles: Object.freeze(['go']) }),
  Ui2Strip: Object.freeze({ frame: true }),
  /* one role each */
  Ui2Header: Object.freeze({ frame: true }),   /* Back and Menu go, Close adjusts (HEADER_ROLES) */
  Ui2Slot: Object.freeze({ roles: Object.freeze(['slot']) }),
  Ui2ItemCell: Object.freeze({ roles: Object.freeze(['slot']) }),
  Ui2CollectionCard: Object.freeze({ roles: Object.freeze(['go']) }),
  Ui2Disabled: Object.freeze({ roles: Object.freeze(['disabled']) }),
  Ui2Confirm: Object.freeze({ frame: true }),   /* its yes commits (or is danger), its no adjusts */
  Ui2Group: Object.freeze({ roles: Object.freeze(['info']) }),
  Ui2Value: Object.freeze({ roles: Object.freeze(['info']) }),
  Ui2Facts: Object.freeze({ roles: Object.freeze(['info']) }),
  Ui2Progress: Object.freeze({ roles: Object.freeze(['info']) }),
  Ui2Badge: Object.freeze({ roles: Object.freeze(['info']) }),
  Ui2Loading: Object.freeze({ roles: Object.freeze(['info']) }),
  Ui2Empty: Object.freeze({ roles: Object.freeze(['info']) }),
  /* frames: they hold pieces, which carry the roles */
  Ui2Frame: Object.freeze({ frame: true }),
  Ui2Zones: Object.freeze({ frame: true }),
  Ui2Actions: Object.freeze({ frame: true }),
  Ui2ActionRow: Object.freeze({ frame: true }),
  Ui2TwoPanel: Object.freeze({ frame: true }),
  Ui2ItemGrid: Object.freeze({ frame: true }),
  Ui2Collection: Object.freeze({ frame: true }),
  Ui2Showcase: Object.freeze({ frame: true }),
});
export const ASKED_PIECES = Object.freeze(Object.keys(KIT_PIECES).filter((k) => KIT_PIECES[k].asks));

/* the header's three controls (Header.jsx): Back and Menu go somewhere; Close is a dismiss (V17:43) */
export const HEADER_ROLES = Object.freeze({ back: 'go', menu: 'go', close: 'adjust' });

/* Today's five action faces (ui2Tokens.js UI2_ACTIONS) and the role each meant: gold routine and green
   accept DO the thing (commit), blue guides you somewhere (go: "Find on map"), red destroys (danger),
   silver dismisses (adjust).  An Action made with an intent and no colour wears its role's face here,
   which is today's face for it: no look changes. */
export const FACE_ROLE = Object.freeze({ gold: 'commit', green: 'commit', blue: 'go', red: 'danger', silver: 'adjust' });
export const ROLE_FACE = Object.freeze({ commit: 'gold', danger: 'red', adjust: 'silver', go: 'blue', disabled: 'gold' });
/* the faces a role may wear today; any other is a role its colour contradicts (the guard's G6) */
export const ROLE_FACES = Object.freeze({
  commit: Object.freeze(['gold', 'green']), danger: Object.freeze(['red']), adjust: Object.freeze(['silver']),
  go: Object.freeze(['blue']), disabled: Object.freeze(['gold', 'green', 'blue', 'red', 'silver']),
});

/**
 * THE ONE PLACE a kit piece's role is decided.
 *   piece  its name in KIT_PIECES ('Ui2Stat', ...)
 *   p      the props it was made with: { intent, onClick, c, selected, disabled }
 * Returns { role, press, face, named }:
 *   role   one of the nine;
 *   press  draw it as a button (a 'must' role, or a 'may' one with a live handler);
 *   face   the Action's face (its `c`, else its role's: today's look);
 *   named  true when the caller named the intent (false: mapped from yesterday's props).
 * An intent the piece may not take is not obeyed: the props decide, as before (the guard fails it).
 */
export function ui2Role(piece, p) {
  const props = p || {};
  const row = Object.prototype.hasOwnProperty.call(KIT_PIECES, piece) ? KIT_PIECES[piece] : null;
  const roles = (row && row.roles) || [];
  const live = typeof props.onClick === 'function';   /* the handler's presence: read HERE, and only here */
  let role = null;
  let named = false;
  if (typeof props.intent === 'string' && roles.indexOf(props.intent) >= 0) { role = props.intent; named = true; }
  if (piece === 'Ui2Action' && props.disabled) role = 'disabled';   /* off is off, whatever it would do */
  if (!role) {
    if (piece === 'Ui2Action') role = props.disabled ? 'disabled' : (FACE_ROLE[props.c] || 'commit');
    else if (piece === 'Ui2Stat' || piece === 'Ui2Fact') role = live ? 'inspect' : 'info';
    else if (piece === 'Ui2Tile' || piece === 'Ui2Tab') role = props.selected ? 'selected' : 'go';
    else role = roles[0] || 'info';
  }
  const r = BY_ID[role];
  const press = r.press === 'must' || (r.press === 'may' && live);
  const face = piece === 'Ui2Action' ? ((typeof props.c === 'string' && props.c) || ROLE_FACE[role] || 'gold') : null;
  return { role, press, face, named };
}
