/* THE WORDS RULE -- v2.3.5197 (grand plan step 11.4; card K PR 12;
 * docs/specs/words-rule.md).
 *
 * Text a player wrote (a name, a clan's tag) must never be read as the game's
 * own words.  A sentence the worker builds around a player's words is sent as
 * a TEMPLATE and its PARTS -- { t: 'sold_to', p: { item, buyer, price } } --
 * and the page fills it from one table of the game's sentences
 * (src/data/words.js, this table's mirror), the player's words drawn as words.
 * What a player reads stays word for word the same.
 *
 * Either side ships first: a mail entry keeps its sentence (`note`) beside
 * the template (`noteT`) for an older phone, both made HERE, in wordsNote --
 * the one function words-rule.test lets join the game's words with a
 * player's.
 */
export const WORDS = Object.freeze({
  sold_to: '{item} sold to {buyer} for {price}',
  trade_from: 'trade from {from}',
  clan_war: 'clan war vs [{tag}]{outcome}',
});

/* the sentence, its parts put in (a part is text, never a template) */
export function wordsFill(t, p) {
  const s = WORDS[t];
  if (typeof s !== 'string') return '';
  return s.replace(/\{(\w+)\}/g, (m, k) => (p && Object.prototype.hasOwnProperty.call(p, k) && p[k] != null ? String(p[k]) : ''));
}

/* a mail entry's note: the sentence for an older phone, and its template */
export function wordsNote(t, p) {
  const parts = {};
  for (const k of Object.keys(p || {})) parts[k] = p[k] == null ? '' : (typeof p[k] === 'number' ? p[k] : String(p[k]).slice(0, 64));
  return { note: wordsFill(t, parts), noteT: { t, p: parts } };
}
