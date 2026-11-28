/* ═══ v2.3.6845: GEAR, KEPT, MEASURED AGAINST V17 (card UI4 PR 6, the owner's V17 handoff) ═══
 *
 * The owner, 2026-11-27, with V17: "Some things may be better designed as
 * already in the game like probably the bag menu and character design but
 * maybe not"; and of Gear's side-by-side, 2026-11-26: "one of your better
 * layouts".  So Gear is NOT redrawn.  This module holds what this PR changes,
 * as rules node tests (tools/guards/ui4-gear.test.mjs), behind ONE switch:
 *
 *   `?v17gear` (on by default, remembered on the phone; `=0` the game exactly
 *   as it was the day before, `=1` forgets the stored off).
 *
 * 1. THE ROLES (V17:37-49) of Gear's and the item summary's pieces, named at
 *    their creation (`intent`, src/game/uiRoles.js): an item's action by its
 *    id (equip commits, drop is the danger), Details goes to the item page,
 *    Show all adjusts the filter, the gold is a fact.  Each is the role its
 *    colour already gave it (FACE_ROLE), so naming them changes no look,
 *    save Details: V17:40 calls an explicit Details inspection, the Action
 *    has no inspect role (KIT_PIECES), so it is `go` (it opens the item
 *    page), V17's raised slate rather than the neutral one: under the switch.
 * 2. V17:57's SMALL RULES, mended where they failed: the full name in
 *    Details (the item page's name was cut at two lines); the buttons in
 *    fixed places (a disabled action's reason pushed them up; Details alone
 *    took the whole row); the place kept on return (workspace.js: it held).
 * 3. THE FIT (mp-v17fit on main): the sideways Equipped row was 12 px wider
 *    than its pane (the three groups' own padding was not counted), so the
 *    Gem cell was cut; on a 320 phone the body's three rows did not fit under
 *    the Equipped label row, nor "Inventory" beside the filter and the gold.
 * 4. A COMPUTER'S 840 (V17:31 "use extra horizontal space for additional
 *    entries, not larger art, text or gameplay view"): the bag takes as many
 *    WHOLE columns as its panel holds at the square the height gives, as it
 *    already takes whole rows (gearGeometry.js wholeRows): more of the bag in
 *    view, never a larger square.  On every phone the answer is today's 3.
 * Imports only the switch reader and the role table: node tests it.
 */
import { readerFor, swValue } from './switches.js';
import { UI_ROLES } from './uiRoles.js';

/* V17's navigation row (V17:41, "Navigation/preparation"): the role's id from the one table, not written again */
const NAV = UI_ROLES.find((r) => r.line === 41).id;

export const V17_GEAR_KEY = 'bt_v17gear';

/** Is the V17 Gear pass wanted on this device?  `search` and `store` are for the suite. */
export function v17GearWanted(search, store) {
  let v = null;
  try { v = search == null ? swValue('v17gear') : readerFor(search).swValue('v17gear'); } catch (e) { v = null; }
  let ls = store;
  if (ls === undefined) { try { ls = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { ls = null; } }
  if (v === '0' || v === '1') {
    try { if (ls) { if (v === '0') ls.setItem(V17_GEAR_KEY, '0'); else ls.removeItem(V17_GEAR_KEY); } } catch (e) { /* the address still decides this visit */ }
    return v === '1';
  }
  try { return !(ls && ls.getItem(V17_GEAR_KEY) === '0'); } catch (e) { return true; }
}

let _on = null;
/** The answer for this page load (read once: a switch never flips mid-play). */
export function v17GearOn() {
  if (_on === null) _on = v17GearWanted();
  return _on;
}

/* ── 1. the roles ── */

/** An item's action (itemInspect.js ACTION_FACE's ids) and the role it plays (V17:44-45). */
export const ITEM_ACT_INTENT = Object.freeze({
  equip: 'commit', unequip: 'commit', capeOn: 'commit', capeOff: 'commit', reveal: 'commit',
  eat: 'commit', drink: 'commit', light: 'commit', sell: 'commit', open: 'commit', openChest: 'commit',
  lock: 'adjust',   /* (inspect: its silver face is a dismiss's today; no role named, its colour says it) */
  drop: 'danger',   /* the one that loses the item (V17:45 "Drop item") */
});

/** The role of an item action by its id: null for one the table does not know (the colour then says it, as before). */
export function itemActIntent(id) {
  return Object.prototype.hasOwnProperty.call(ITEM_ACT_INTENT, id) ? ITEM_ACT_INTENT[id] : null;
}

/** Gear's own pieces and their roles. */
export const GEAR_INTENT = Object.freeze({
  details: NAV,       /* opens the one item page (V17:40 "explicit Details": the Action has no inspect role) */
  detailsWas: 'adjust', /* `?v17gear=0`: what its silver face said the day before */
  showAll: 'adjust',  /* clears the filter (V17:43) */
  coins: 'info',      /* the gold: a fact, opens nothing (V17:39) */
  door: NAV,          /* the item page's doors (the stat tree, the Codex) */
});

/* ── 3. the fit ── */

/* the sideways Equipped row (gearPanels.css .u2-gp-bodyrow / .u2-gp-group): three groups of three cells,
   2 px between a group's cells, 2 px of padding each side of a group, 12 px between groups, the pane's pad */
export const SIDE_CELL_GAP = 2;
export const SIDE_GROUP_PAD = 2;
export const SIDE_GROUP_GAP = 12;

/** The sideways Equipped row's true width for a cell of `cell`, its pane's padding `pad` included. */
export function sideRowW(cell, pad) {
  const group = 3 * cell + 2 * SIDE_CELL_GAP + 2 * SIDE_GROUP_PAD;
  return 3 * group + 2 * SIDE_GROUP_GAP + 2 * pad;
}

/** Sideways: the cell the nine-cell row and a bag of at least two squares can share `W` with (667 x 375: the row of
    56s and the bag's two squares overflowed by 25 px and cut the Gem cell).  Never under `min` (the finger's). */
export function sideCell(W, cell, pad, gap, min) {
  let c = cell;
  while (c > min && sideRowW(c, pad) + 2 * c + 2 * pad + gap > W) c--;
  return c;
}

/* "INVENTORY" in the label row (11 px bold capitals, the kit's pane title) beside the filter (its 44 px floor)
   and the gold pill, measured in the game by mp-v17fit: cut at an inner width of 142 (320 x 568), whole at 162
   (360 x 780) and above.  Under the line the word gives way and its controls keep the row (the panel keeps its
   name for a screen reader: the kit's TwoPanel `name`). */
export const INV_TITLE_MIN = 150;
/* v2.3.6845, the owner's "Remove the coins from bag": without the gold pill (54 px and its gap) the word and the
   filter need about 96 px; 116 leaves the word's letter spacing its room */
export const INV_TITLE_MIN_NO_COINS = 116;

/** Does the Inventory label row hold its title beside the filter (and the gold, `coins` not false)? */
export function invTitleFits(inner, coins) {
  return inner >= (coins === false ? INV_TITLE_MIN_NO_COINS : INV_TITLE_MIN);
}

/** Do the Equipped body's three rows of `cell` fit in `below`, the room under its label row, with at least
    `gap` between them?  (The caller passes the bag's 3 px: the body's 6 px gaps have been a hair over at 375
    and 390 since v2.3.6784, unseen; the label row gives way only where 44 px rows cannot fit at all: 320.) */
export function wornHeadFits(below, cell, gap) {
  return below >= 3 * cell + 2 * gap;
}

/** The bag's columns: as many WHOLE squares of `cell` (with `gap`) as `inner` holds, never fewer than `cols`
    (the game's 3, or 2 in a narrow panel).  The same rule as the rows' (gearGeometry.js wholeRows). */
export function wholeCols(inner, cell, gap, cols) {
  const fit = Math.floor((inner + gap) / (cell + gap));
  return Math.max(cols, fit);
}

/* ── 2/3. the quick look (the summary): what it holds in the room it has ──
   V17:57 "two-line quick-look max, fixed buttons"; V17:31 "primary actions visible without scrolling".  The
   summary's buttons (Details, the item's action, the ✕) are never dropped; what gives way, in this order, is
   the supporting: the comparison's tradeoff line, a fact row, the headline fact, the item's picture (the cell
   picked beside it, in the source panel, wears the picture and the selected mark).  Measured in the game
   (mp-v17fit): the kit's 44 px buttons; "Details" 52 px wide, "Unequip" 62, a fact box 62; 11 px words at
   1.15 a line. */
export const SUM = Object.freeze({
  ctl: 44,          /* the ✕ and the buttons' height: the finger's floor */
  gap: 3,           /* between the summary's parts upright (gearPanels.css .u2-gp-sum) */
  rowGap: 6,        /* between its parts sideways (.u2-gp-sum.is-row) */
  head: 32,         /* the headline: its number line and its words line */
  row: 14,          /* one fact or comparison row */
  line: 27,         /* a two-line sentence (the tradeoff, a reason) */
  acts: 126,        /* Details and the action, side by side, at their words' width */
  nameUp: 60,       /* upright: the name's column at least (cut at 46 on a 320 phone, whole at 62 on a 360) */
  nameSide: 80,     /* sideways: the name's column at least */
  pic: 48,          /* the picture and its gap */
  fact: 68,         /* sideways: the headline fact's box and its gap */
  fact2: 90,        /* sideways: one more fact beside it */
});

/**
 * What the quick look shows in a summary of `w` x `h` (its box inside the pane's padding).
 *   short  sideways (one row);  why  an off action's reason is shown;  cmp  a comparison is shown
 * Returns { pic, head, rows, line, words }:
 *   pic    the item's picture beside its name
 *   head   the headline fact (or the comparison's headline)
 *   rows   how many fact or comparison rows under it (0 to 2; upright only)
 *   line   the two-line sentence (the tradeoff, a "?" piece's line) under them
 *   words  the comparison headline's own words under its numbers ("25% more damage per second")
 */
export function sumLayout(w, h, short, why, cmp) {
  if (short) {
    const base = SUM.nameSide + SUM.ctl + SUM.acts + 2 * SUM.rowGap;
    const pic = w >= base + SUM.pic;
    const head = w >= base + SUM.pic + SUM.fact;
    const more = w >= base + SUM.pic + SUM.fact + SUM.fact2;
    return { pic, head, rows: more ? 1 : 0, line: false, words: false };
  }
  const pic = w - SUM.pic - SUM.ctl - 2 * 4 >= SUM.nameUp;
  /* upright the headline is always there (the item's one number, or the comparison's): the rows under it, then
     the sentence, take what is left between it and the buttons */
  const room = Math.max(0, h - 2 * SUM.ctl - 2 * SUM.gap - (why ? SUM.line + SUM.gap : 0) - SUM.head);
  const rows = Math.min(2, Math.floor(room / SUM.row));
  const line = room - rows * SUM.row >= SUM.line;
  return { pic, head: true, rows, line, words: !!cmp };
}
