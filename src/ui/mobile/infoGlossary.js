/* ═══ WHAT THE NUMBERS ON YOUR CHARACTER SHEET ACTUALLY MEAN (v2.3.2131) ═══
 *
 * Owner, after the demo: "more pop ups for things users want to learn more
 * about on the character equip menu (labels tapped on and such)."
 *
 * Reviewers met seven stat rows -- Damage, DPS, Crit, Crit Dmg, Defense,
 * Dodge, Armor -- with no way to ask what any of them did.  Every entry here
 * is one sentence in plain language, written for somebody who has played the
 * game for four minutes, and a second line only where the first leaves an
 * obvious question ("is that per hit or per second?").
 *
 * WHY A TABLE AND NOT STRINGS AT THE CALL SITE.  The same words have to be
 * available from the hero sheet and from anywhere else that ever shows these
 * rows; HeroExpanded already keeps its LABELS in a display table for exactly
 * this reason (see its note on labels being a display concern).  A second
 * copy of "what is Crit Dmg" is a second copy to keep true.
 *
 * Keyed by the label the player actually taps, so the call site passes what
 * it already renders and there is no third name to keep in sync.
 */

/* Object.create(null) rather than {}: this is looked up by a key taken from
   rendered UI text, and a label that happened to read '__proto__' must miss
   rather than return Object.prototype (CLAUDE.md rule 4). */
const _mk = (rows) => {
  const o = Object.create(null);
  for (const k of Object.keys(rows)) o[k] = rows[k];
  return o;
};

export const STAT_INFO = _mk({
  Damage: {
    title: 'Damage',
    body: 'How hard one hit lands, before the target’s armour takes its cut.',
    note: 'Shown as a range because every swing rolls somewhere inside it.',
  },
  DPS: {
    title: 'DPS',
    body: 'Damage per second — your damage and your swing speed together.',
    note: 'The honest way to compare a slow heavy weapon against a fast light one.',
  },
  Crit: {
    title: 'Crit chance',
    body: 'How often a hit comes out critical instead of ordinary.',
  },
  'Crit Dmg': {
    title: 'Crit damage',
    body: 'How much extra a critical hit adds on top of the normal one.',
    note: 'Only pays off when you also have crit chance — the pair works together.', /* v2.3.2199 */
  },
  /* v2.3.2199: the two new spendable stats. */
  'Elem Power': {
    title: 'Elemental power',
    body: 'Makes your weapon’s element hit harder — burns, roots, thorns and element combos all grow with it.',
    note: 'Only works with an enchanted weapon (one that carries an element).',
  },
  Defense: {
    title: 'Defense',
    body: 'Cuts the damage that gets through to you.',
    note: 'Comes from what you are wearing, not from your level.',
  },
  Dodge: {
    title: 'Dodge',
    body: 'The chance an incoming hit misses you completely.',
  },
  Armor: {
    title: 'Armour',
    body: 'The share of each hit your gear soaks up before it reaches your health.',
  },
});

/* The three combat skills.  Their cards used to print the raw XP pair across
   the bottom; v2.3.2131 moved those digits here (owner: "get rid of the xp
   numbers in the 3 combat skills and put them as some kind of pop up"), so
   this is now the only place the exact numbers are readable. */
export const SKILL_INFO = _mk({
  sword: { title: 'Melee', body: 'Swinging a sword in close. Levels up as you land melee hits.' },
  bow:   { title: 'Ranged', body: 'Shooting a bow from a distance. Levels up as your arrows connect.' },
  staff: { title: 'Magic', body: 'Casting with a staff. Levels up as your bolts connect.' },
});

/** The explainer for a stat row, or null if that label has no entry.
 *  Null rather than a placeholder on purpose: a row with nothing useful to
 *  say should not become tappable at all, so the caller can tell. */
export function statInfo(label) {
  return (label && STAT_INFO[label]) || null;
}

/** The explainer for one of the three combat skills. */
export function skillInfo(cat) {
  return (cat && SKILL_INFO[cat]) || null;
}
