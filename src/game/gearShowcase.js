/* ═══ v2.3.6689: BRO'S EQUIPMENT, A SHOWCASE; AND THE ROADS INTO THE ONE ITEM PAGE (card UI2-gear PR 3) ═══
 *
 * The owner, 2026-11-25, with the master specification (part 5): "Full
 * Details opens the shared item inspector (also used from Codex, equipment,
 * loot, stat breakdowns). Context and permissions govern available actions;
 * read-only inspection for others. Do not duplicate the data model."  Part 8:
 * "The same entity should use the same canonical inspection screen across the
 * Codex and contextual entry points."  The card's reading 8: Bro's Equipment
 * door opens a SHOWCASE (the figure and the nine worn cells in the same body
 * shape as Gear's Equipped panel, no bag; each cell opens the one item page;
 * "Manage Gear" for yourself, nothing to press for another player).
 *
 * Here, with no React and no game state (node tests it:
 * tools/guards/gear-showcase.test.mjs):
 *   GEAR_BODY            the body's shape, ONE table: Gear's Equipped panel
 *                        (dash/GearPanels.jsx) and the showcase
 *                        (sheet/GearShowcase.jsx) both lay their nine cells
 *                        out by it, so the two cannot drift apart;
 *   showcaseOf(who)      whose showcase, and what it offers: Manage Gear
 *                        only for yourself;
 *   showcaseItemSource   a showcase cell's road into the one item page
 *                        (dash/itemPageOpen.js openItemPage): the SAME
 *                        source Gear's worn cell hands over (`cell`), so the
 *                        same item reads the same facts from both; another
 *                        player's carries their name (`owner`): read-only;
 *   profileItemSource    the profile's equipment row's road (the player
 *                        card's six slots, ui/panels/PlayerProfilePanel.jsx):
 *                        yours goes by Gear's own cell (the held weapon's
 *                        hand); another player's by what their card knows
 *                        (`peer`: the slot's picture and name), read-only.
 * An empty cell, a ghost slot or a cell the item page has nothing for opens
 * nothing (the page would only say "gone"). */

/** The nine cells' places: [column, row].  The three weapons down the left,
    Cape, Chest and Legs (wider: a torso) on the figure's line in the middle,
    Shield, Amulet and Gem down the right (v2.3.6688's shape, moved here). */
export const GEAR_BODY = Object.freeze({
  sword: Object.freeze([0, 0]), bow: Object.freeze([0, 1]), staff: Object.freeze([0, 2]),
  cape: Object.freeze([1, 0]), chest: Object.freeze([1, 1]), legs: Object.freeze([1, 2]),
  shield: Object.freeze([2, 0]), amulet: Object.freeze([2, 1]), gem: Object.freeze([2, 2]),
});

/** Sideways: one row, the same three groups in the same order. */
export const GEAR_BODY_ROW = Object.freeze([
  Object.freeze(['sword', 'bow', 'staff']), Object.freeze(['cape', 'chest', 'legs']), Object.freeze(['shield', 'amulet', 'gem']),
]);

/* the weapon cell of each hand (the worker's activeSlot) */
const HAND_CELL = Object.freeze({ melee: 'sword', ranged: 'bow', staff: 'staff' });
/* the profile's six slots and the Gear cell each is (the weapon: the hand's) */
const PROFILE_CELL = Object.freeze({ shield: 'shield', chest: 'chest', legs: 'legs', cape: 'cape', amulet: 'amulet' });

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, String(k));
const nameOf = (who) => {
  const n = who && typeof who === 'object' ? who.name : who;
  return String(n == null ? '' : n).trim();
};

/** Whose showcase (`who` the frame's stack entry: null is yours). */
export function showcaseOf(who) {
  const self = who == null;
  return Object.freeze({ self, manage: self, owner: self ? '' : nameOf(who) });
}

/** A showcase cell's source for openItemPage, or null (an unknown cell, no record). */
export function showcaseItemSource(R, cell, who) {
  if (!R || typeof R !== 'object' || !has(GEAR_BODY, cell)) return null;
  const s = showcaseOf(who);
  return s.self ? { from: 'showcase', R, cell: String(cell) } : { from: 'showcase', R, cell: String(cell), owner: s.owner || '?' };
}

/** The Gear cell a profile slot is, for yourself (`hand` the worker's activeSlot). */
export function profileCell(slot, hand) {
  if (slot === 'weapon') return HAND_CELL[hand] || 'sword';
  return has(PROFILE_CELL, slot) ? PROFILE_CELL[slot] : null;
}

/** The profile's equipment row: one slot's source for openItemPage, or null.
 *    profile  the card's profile (playerProfile.js): isSelf, name;
 *    s        one of its `equipment` rows: { slot, label, iconSrc, ghost, name };
 *    R        your own record (yours only: the parent's, never read here). */
export function profileItemSource(profile, s, R) {
  if (!profile || !s || s.ghost) return null;
  if (profile.isSelf) {
    if (!R || typeof R !== 'object') return null;
    const cell = profileCell(s.slot, R.activeSlot);
    return cell ? { from: 'profile', R, cell } : null;
  }
  const owner = String(profile.name == null ? '' : profile.name).trim() || '?';
  return {
    from: 'profile', owner,
    peer: Object.freeze({ slot: String(s.slot || ''), name: typeof s.name === 'string' ? s.name : '', art: s.iconSrc || null }),
  };
}

/* the showcase's room (the frame page's box, from a ResizeObserver's own entry) */
const MIN = 44;      /* no cell under the finger's floor */
const BIG = 56;      /* Gear's own largest body cell */
const BODY_G = 6;    /* between the body's cells (Gear's) */
const GAP = 8;       /* between the figure and the body */
const PAD = 4;
const BTN = 44;      /* Manage Gear: the finger's floor */
const FIG_W = 0.44;  /* the figure's cropped width, of its square (CharacterView FIGURE_W_FRAC, measured) */

/** The showcase's geometry: upright, the figure (and Manage Gear under it)
    beside the body's three columns; a page too short for three rows of 44
    (a phone on its side), the figure, the body's one row and the button in
    one line.  Every cell at least 44 px. */
export function showcaseGeometry(W, H, manage) {
  const w = Math.max(0, Math.floor(Number(W) || 0));
  const h = Math.max(0, Math.floor(Number(H) || 0));
  const short = h > 0 && h - 2 * PAD < 3 * MIN + 2 * BODY_G;
  if (short) {
    const cell = Math.max(MIN, Math.min(BIG, h - 2 * PAD));
    const bodyW = 9 * cell + 6 * 2 + 2 * 12 + 3 * 4;
    const fig = Math.max(0, h - 2 * PAD);
    return Object.freeze({ short, W: w, H: h, bodyCell: cell, torsoW: cell, bodyW, fig, figW: Math.round(fig * FIG_W), btnH: manage ? BTN : 0 });
  }
  const cell = Math.max(MIN, Math.min(BIG, Math.floor((h - 2 * PAD - 2 * BODY_G) / 3)));
  const torsoW = Math.floor(cell * 1.25);
  const bodyW = 2 * cell + torsoW + 2 * BODY_G;
  const colW = Math.max(0, w - 2 * PAD - GAP - bodyW);
  const btnH = manage ? BTN : 0;
  /* the figure's square: as tall as the column allows under the button, as wide as its crop fits */
  const fig = Math.max(0, Math.min(h - 2 * PAD - (btnH ? btnH + 4 : 0), Math.floor(colW / FIG_W)));
  return Object.freeze({ short, W: w, H: h, bodyCell: cell, torsoW, bodyW, colW, fig, figW: Math.round(fig * FIG_W), btnH });
}
