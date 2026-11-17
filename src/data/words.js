/* THE WORDS RULE, the page's side -- v2.3.5197 (grand plan step 11.4; card K
 * PR 12; docs/specs/words-rule.md).
 *
 * The game's sentences that hold a player's words, by template id: the
 * worker sends { t, p } (server/src/words.js, this table's mirror: the two
 * are held equal by words-rule.test) and the page fills it here, each part
 * put in as text, never read as a sentence of the game's.  What a player
 * reads stays word for word the same.  No imports, so node reads it.
 */
export const WORDS = Object.freeze({
  sold_to: '{item} sold to {buyer} for {price}',
  trade_from: 'trade from {from}',
  clan_war: 'clan war vs [{tag}]{outcome}',
});

/* the sentence for a { t, p }, or null when the template is not known (an
   older table: the caller keeps the worker's own sentence) */
export function fillWords(tp) {
  const s = tp && typeof tp.t === 'string' && Object.prototype.hasOwnProperty.call(WORDS, tp.t) ? WORDS[tp.t] : null;
  if (s === null) return null;
  const p = tp.p && typeof tp.p === 'object' ? tp.p : {};
  return s.replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(p, k) && p[k] != null ? String(p[k]) : ''));
}
