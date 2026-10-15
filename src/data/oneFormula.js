/* ═══ v2.3.3260: ONE FORMULA FOR EVERY FIGHT -- the page's copy ═══
 *
 * Owner: "I just want one formula that works the same across everything".
 * Mirror of server/src/oneformula.js (mirror-audit holds the two together;
 * the worker's header has the reasoning, docs/specs/one-formula.md the study):
 *   - max HP is 100 + 50 a level + 40 a Max HP point (was 100 + 6 + 8);
 *   - every monster hits harder by its matching player's new health over
 *     their old (monsterHitK), so a monster takes the share of your bar it
 *     always took;
 *   - no cap of a player's own (v2.3.3261): a blow is taken whole, whoever
 *     lands it, so a hit reads the same number on a monster and on a player
 *     (v2.3.3260's 30% cap is gone -- the owner's "Everything is 1 version");
 *   - a sword's special is 4.5x a plain hit (was 3x), the staff's big bolt
 *     worth 0.6 of its orbs.
 * The page predicts with these -- its own bar between echoes, a scene's
 * monster, its specials -- only against a worker that advertises
 * caps.oneformula (wsClient sets setOneFormulaEnabled from it), so against an
 * older worker every prediction is what that worker settles (rule 19).
 *
 * No imports, so the worker's suites can run it. */

export var ONE_FORMULA = Object.freeze({
  HEALTH: Object.freeze({ BASE: 100, PER_LEVEL: 50, PER_POINT: 40 }),
  OLD_HEALTH: Object.freeze({ BASE: 100, PER_LEVEL: 6, PER_POINT: 8 }),
  MATCH_LEVEL: 2,
  SWORD_SPECIAL: 4.5,
  OLD_SWORD_SPECIAL: 3,
  STAFF_BOLT_K: 0.6,
});

var _on = false;
export function setOneFormulaEnabled(on) { _on = !!on; }
export function isOneFormulaEnabled() { return _on; }

/* `on` omitted: the formula the worker advertised */
function onNow(on) { return on === undefined ? _on : on !== false; }

/** Max HP at a character level with `pts` Max HP points (floored, as the
 *  worker does). */
export function healthAt(charLevel, pts, on) {
  var H = onNow(on) ? ONE_FORMULA.HEALTH : ONE_FORMULA.OLD_HEALTH;
  var L = Math.max(0, Number(charLevel) || 0);
  var P = Math.max(0, Number(pts) || 0);
  return Math.floor(H.BASE + L * H.PER_LEVEL + P * H.PER_POINT);
}

/** What one Max HP point is worth. */
export function healthPerPoint(on) {
  return onNow(on) ? ONE_FORMULA.HEALTH.PER_POINT : ONE_FORMULA.OLD_HEALTH.PER_POINT;
}

/** How much harder a monster of `level` hits (1 with the formula off). */
export function monsterHitK(level, on) {
  if (!onNow(on)) return 1;
  var c = Math.max(1, Number(level) || 1) + ONE_FORMULA.MATCH_LEVEL;
  var H = ONE_FORMULA.HEALTH, O = ONE_FORMULA.OLD_HEALTH;
  return (H.BASE + c * H.PER_LEVEL) / (O.BASE + c * O.PER_LEVEL);
}

/** A special's multiplier on a plain hit: the staff's orb 2x, the bow's
 *  arrow 3x, every sword SWORD_SPECIAL. */
export function specialMultFor(type, on) {
  if (type === 'staff') return 2.0;
  if (type === 'bow') return 3.0;
  return onNow(on) ? ONE_FORMULA.SWORD_SPECIAL : ONE_FORMULA.OLD_SWORD_SPECIAL;
}

/** What the big staff bolt is worth, per orb it stands for. */
export function staffBoltK(on) {
  return onNow(on) ? ONE_FORMULA.STAFF_BOLT_K : 1;
}
