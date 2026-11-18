/* ═══ v2.3.5807 (card RV, S2): A PLAYER'S `avatar` AND `color` HELD TO THE GAME'S OWN FORMS ═══
 *
 * The review of money, accounts and players' safety (card RV,
 * docs/plan/census/RV-review.md), finding S2.  A player's `avatar` (512
 * characters) and `color` (64) were any text: the worker cut their length
 * and sent them to every phone, and the page drew `avatar` as a picture
 * (`<img src>`) and `color` as a CSS background.  So a player could put a
 * small picture of their choice on other screens (a `data:` image), or make
 * every phone that opened the player list, a player card or the board fetch
 * from a server of theirs (`https://...`, or `url(...)` in a colour): each
 * viewer's address and the time they looked.  The board keeps `color`, so it
 * worked while the player was away.
 *
 * The forms honest pages make, and nothing else:
 *   - `color`: a hex colour, `#rgb` to `#rrggbbaa` (the character creator's
 *     only shape; store.js `_stColor` already holds its listings to it);
 *   - `avatar`: the image proxy the page itself builds (src/networking/
 *     index.js `wsrvUrl`: `https://wsrv.nl/?url=<encoded>&...`), its query
 *     URL-encoded, no quote, bracket, space or backslash anywhere.  A phone
 *     shown such an avatar only ever talks to wsrv.nl, which the page already
 *     loads: no server of a player's choosing learns who looked.  (Which
 *     picture the proxy fetches is still the player's word: a proxied
 *     picture of their choosing stays possible.  Closing that is relaying a
 *     token number and building the address on each page, listed in the
 *     census for later.)
 *
 * A value off its form is dropped (null), as a missing one is: an honest
 * page never sends one.  A leaf (no imports): the join (join.js, card K2),
 * `track` (index.js) and the board (leaderboard.js) read it, and the page
 * holds its own copy of the two forms (src/game/lookForm.js), the two held
 * together by server/test/lookform.test.mjs.
 */

export const LOOK_FORM = Object.freeze({
  COLOR_RE: /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/,
  AVATAR_PREFIX: 'https://wsrv.nl/?url=',
  /* after the prefix: the URL-encoded query the page builds, nothing that
     can close an attribute, a CSS value or a URL early */
  AVATAR_REST_RE: /^[A-Za-z0-9%._~\-&=+!*]+$/,
  AVATAR_MAX: 512,
});

/** `v` if it is a hex colour, else null. */
export function lookColor(v) {
  return typeof v === 'string' && LOOK_FORM.COLOR_RE.test(v) ? v : null;
}

/** `v` if it is the page's own proxied avatar address, else null. */
export function lookAvatar(v) {
  if (typeof v !== 'string' || v.length > LOOK_FORM.AVATAR_MAX) return null;
  if (!v.startsWith(LOOK_FORM.AVATAR_PREFIX)) return null;
  const rest = v.slice(LOOK_FORM.AVATAR_PREFIX.length);
  return rest && LOOK_FORM.AVATAR_REST_RE.test(rest) ? v : null;
}
