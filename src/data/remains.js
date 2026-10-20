/* ═══ v2.3.3525: "REMAINS", NOT "REMNANTS" ═══
 *
 * The owner: "please change 'remnants' to 'remains' since it's a more common
 * term that won't confuse people."  What a slain monster leaves for the
 * Mayor's errands is called its REMAINS wherever a player reads it -- the bag,
 * the quests, the codex, the trade window, the market, the mail.
 *
 * THE KEYS STAY.  'slime-remnants' and the rest are in every saved bag, in the
 * worker's quest objectives and its loot rolls, and in the art's file names; a
 * key is an identifier, this is the label (the same rule as ITEM_NAMES'
 * 'whetstone' for the Fury Tonic).  The snowman's key is just 'snowman'.
 * No imports, so anything can read it.
 */
export const REMAINS_NAMES = Object.freeze({
  'snowman': 'Snowman Remains',
  'slime-remnants': 'Slime Remains',
  'skeleton-remnants': 'Skeleton Remains',
  'fire-goblin-remnants': 'Fire Goblin Remains',
});

/** A remains key's words, or null for any other key. */
export function remainsName(key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(REMAINS_NAMES, key) ? REMAINS_NAMES[key] : null;
}
