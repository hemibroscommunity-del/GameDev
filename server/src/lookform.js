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

import { cleanChatText } from './chatguard.js';   /* v2.3.5819: lookStamp, below */
import { nameReadsAsStaff } from './reservednames.js';   /* v2.3.5819 */

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

/* ═══ v2.3.5819 (card RV, S2's `track` half and S3): THE LOOK A `track` SETS, IN THE GAME'S OWN FORMS ═══
   S2's other half: `track` let a player set `avatar` and `color` to any text
   (the join's half is card K2's join.js).  S3: the look's `rpgData` -- the
   inspect card's blob, relayed to every phone (lookrelay.js) and read by the
   board (index.js reportToLeaderboard) -- carried the phone's own clan tag
   and clan name, never the registry's, and a pet's name past the cleaner and
   the staff-name rule (the title is already the record's: achievements.js
   _achvStamp).  Stamped here, beside the
   clan tag, the cape and the level (`track`, index.js):
     - `color` a hex colour, `avatar` the image proxy's form, else dropped;
     - `rpgData.clanTag` / `clanName` the registry's (`tag`, `name`: the
       worker's stamp), or none;
     - `rpgData.petInfo.name` cleaned (chatguard.js) and dropped if it
       reads as staff (reservednames.js).
   Honest values are already all of these, so nothing an honest player sees
   changes.  Pure: `clan` is the registry's record or null, `known` whether
   the registry is loaded (if not, the clan fields are left as they are).
   `lookform: false` in the live flags (index.js): as before. */

function wordOk(v) {
  if (typeof v !== 'string') return v === null ? null : undefined;
  const c = cleanChatText(v);
  if (!c || nameReadsAsStaff(c)) return null;
  return c;
}
export function lookStamp(clean, clan, known) {
  if (!clean || typeof clean !== 'object') return clean;
  const own = (k) => Object.prototype.hasOwnProperty.call(clean, k);
  if (own('color')) { const c = lookColor(clean.color); if (c === null) delete clean.color; else clean.color = c; }
  if (own('avatar')) { const a = lookAvatar(clean.avatar); if (a === null) delete clean.avatar; else clean.avatar = a; }
  const rd = clean.rpgData;
  if (rd && typeof rd === 'object' && !Array.isArray(rd)) {
    const out = { ...rd };
    if (known) {
      if (clan) { out.clanTag = clan.tag || null; out.clanName = typeof clan.name === 'string' ? clan.name : null; }
      else { if ('clanTag' in out) out.clanTag = null; if ('clanName' in out) out.clanName = null; }
    }
    if (out.petInfo && typeof out.petInfo === 'object' && !Array.isArray(out.petInfo) && 'name' in out.petInfo) {
      const n = wordOk(out.petInfo.name);
      out.petInfo = { ...out.petInfo };
      if (n === undefined) delete out.petInfo.name; else out.petInfo.name = n;
    }
    clean.rpgData = out;
  }
  return clean;
}
