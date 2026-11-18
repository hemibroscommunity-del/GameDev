/* ═══ v2.3.5807 (card RV, S2): ANOTHER PLAYER'S `avatar` AND `color` DRAWN ONLY IN THE GAME'S OWN FORMS ═══
 *
 * The page's half of server/src/lookform.js (its header says why: a player's
 * `avatar` was drawn as a picture and `color` as a CSS background, whatever
 * they held, so a player could put a picture of their choosing on other
 * screens or have every phone that looked fetch from a server of theirs).
 * The worker holds both to these forms where it can; this holds the page's
 * own drawing to them as well, for a value that is already on a board or
 * comes from a worker that does not yet:
 *   - a colour is a hex colour, else the caller's fallback;
 *   - an avatar is the image proxy address the page itself builds
 *     (src/networking/index.js `wsrvUrl`), else none: the caller draws the
 *     bust or the letter tile it already draws when there is no avatar.
 * An honest player's own values are always in these forms, so nothing an
 * honest player sees changes.  `?lookform=0` draws any value, as before.
 *
 * The two forms are the worker's, character for character; held equal by
 * server/test/lookform.test.mjs.  NO game imports but the page's switch
 * reader: node tests it.
 */
import { sw } from './switches.js';

export const PAGE_LOOK_FORM = Object.freeze({
  COLOR_RE: /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/,
  AVATAR_PREFIX: 'https://wsrv.nl/?url=',
  AVATAR_REST_RE: /^[A-Za-z0-9%._~\-&=+!*]+$/,
  AVATAR_MAX: 512,
});

const off = () => { try { return sw('lookform'); } catch (e) { return false; } };

/** A colour to draw: `v` if it is a hex colour, else `fallback`. */
export function drawColor(v, fallback) {
  if (off()) return v || fallback;
  return typeof v === 'string' && PAGE_LOOK_FORM.COLOR_RE.test(v) ? v : fallback;
}

/** An avatar to draw: `v` if it is the page's own proxied address, else null. */
export function drawAvatar(v) {
  if (off()) return v || null;
  if (typeof v !== 'string' || v.length > PAGE_LOOK_FORM.AVATAR_MAX) return null;
  if (!v.startsWith(PAGE_LOOK_FORM.AVATAR_PREFIX)) return null;
  const rest = v.slice(PAGE_LOOK_FORM.AVATAR_PREFIX.length);
  return rest && PAGE_LOOK_FORM.AVATAR_REST_RE.test(rest) ? v : null;
}
