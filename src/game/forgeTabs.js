/* ═══ v2.3.3535: THE FORGE'S AMULET TAB, ONLY TO SOMEONE HOLDING GOLD FOR IT ═══
 *
 * The owner, 2026-10-21, a week before reviewers play the game for 20-30
 * minutes each: "I value SIMPLICITY and INTELLIGIBILITY it's far more
 * important for me that the player understands the game than to have precise
 * finely tuned details."
 *
 * The Blacksmith's Amulet tab smelts gold nuggets into bars and bars into
 * amulets.  A nugget drops 1 kill in 10,000 (server/src/data.js
 * GOLD_NUGGET_MONSTER_DROP) and a bar takes five (NUGGETS_PER_BAR), so for
 * nearly every player, and every reviewer the tour sends to the forge
 * (smith_1, smith_2), the tab was a recipe they could never start: "Gold Bar
 * x0", every row locked.  It shows once you hold anything it works on: a
 * nugget, a bar, or an amulet, worn or spare.  Nothing about amulets
 * changed; the worker settles them as before (amulet.js).
 *
 * No imports: the server suite reads it (amulet.test.mjs).  The rule's
 * premise is pinned there too -- if nuggets ever stop being rare, show the
 * tab to everyone again.
 */

/* a count the worker sent, read as a whole number of at least zero */
function count(v) {
  const n = Math.floor(Number(v));
  return n > 0 ? n : 0;
}

export function amuletTabShown(R) {
  if (!R || typeof R !== 'object') return false;
  if (count(R.goldNuggets) > 0 || count(R.goldBars) > 0) return true;
  if (R.amulet && typeof R.amulet === 'object') return true;
  return Array.isArray(R.amuletStash) && R.amuletStash.some((a) => a && typeof a === 'object');
}
