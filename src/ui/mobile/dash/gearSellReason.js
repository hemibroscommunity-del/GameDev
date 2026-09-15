/* ═══ v2.3.2551: TELL THE PLAYER WHY A PIECE CANNOT BE SOLD ═══
 *
 * #648 shipped the receipt book and promised the player would be told WHY
 * a piece cannot be listed.  The promise went unkept for two versions: the
 * mark (`prov`) reached the browser on every gear object and NOTHING read
 * it.  A Sell button that is missing — or present and then refuses with
 * "Invalid item" — cannot tell a player "take it off first" from "this
 * game is broken".  That is what this module fixes.
 *
 * TWO HALVES, AND THE SERVER OWNS THE SECOND ONE.
 *
 *   BEFORE the tap, `gearSellCheck` reads what the browser already knows —
 *   the piece's own `prov`/`gid`, and which list the card sells out of —
 *   and decides whether to show the button hopeful, or greyed with a
 *   sentence.  It is ADVISORY.  It knows the two permanent answers
 *   (`cosmetic`, `legacy`) and deliberately does not guess at the ones
 *   that depend on live server state (`worn`, `in_mail`, `not_held`): for
 *   those it says yes and lets the worker answer.
 *
 *   AFTER the tap, the worker's own `reason` is the truth and is shown
 *   verbatim through `gearSellReasonText`.  A client that predicted "yes"
 *   and got `worn` back prints the worker's sentence, not its own guess.
 *
 * WHY THE TABLE IS DUPLICATED HERE.  The canonical one is `GEAR_REFUSAL`
 * in `server/src/storegear.js`.  The browser cannot ask the worker "would
 * you refuse this?" once per card without a round trip per card, so it
 * needs its own copy — and a mirror nothing pins is a mirror that drifts,
 * so `server/test/market.test.mjs` asserts the two tables are identical,
 * key for key and string for string.  Same posture as
 * `mirror-audit.test.mjs` for `server/src/data.js`.
 *
 * PURE, WITH NO IMPORTS, on purpose — the same reason `gearSellLocal.js`
 * is.  There is no client unit suite (CLAUDE.md: lint + build only), but
 * the server suites already import pure client modules, so a pure function
 * here is reachable from `market.test.mjs` while anything inside
 * `ItemDetailPopup.jsx` is not.  Keep it pure.
 */

/* The worker's refusal reasons, in English.  MIRROR of GEAR_REFUSAL in
   server/src/storegear.js — pinned by market.test.mjs §S12m.

   A Map, not an object: these are keyed by a string that arrived over the
   wire, and '__proto__' is a legal string (TRAPS #6). */
export const GEAR_SELL_REASON = new Map([
  ['legacy', 'Earned before the game kept receipts — it still works, but it cannot be sold'],
  ['cosmetic', "Outfits aren't sellable"],
  ['worn', "You're wearing it — take it off first"],
  ['in_mail', "It's still in the post"],
  ['not_held', "That piece isn't yours right now"],
  ['wrong_slot', 'Wrong kind of slot for that piece'],
  ['no_player', 'You are not in the game right now'],
  ['bad_field', 'Invalid item'],
]);

/* One reason string → one sentence.  An unknown reason (a worker newer
   than this browser) falls back to a sentence that is still true, rather
   than to the bare code or to silence. */
export function gearSellReasonText(reason) {
  return GEAR_SELL_REASON.get(reason) || 'That piece cannot be sold';
}

/* Can this card even hope to be listed?  `field` is the server stash the
   card sells out of (gearSellLocal.js GEAR_SELL); `piece` is the card's
   own copy of the gear object.
 *
 * Returns `{ ok, reason, text }`.  `ok: true` means "nothing the browser
 * knows rules this out" — NOT "the worker will accept it".
 *
 * THE TWO ANSWERS THIS CAN GIVE ON ITS OWN, and why only these two:
 *
 *   'cosmetic' — an outfit layer.  There is no server mint path for
 *     cosmetics at ALL (the catalog is client art), so no cosmetic can
 *     ever carry a receipt.  Permanent, knowable offline, and kept as a
 *     SEPARATE answer from 'legacy' deliberately: "outfits aren't
 *     sellable" is the design, where "earned before receipts" would read
 *     as an oversight somebody should go and fix.
 *
 *   'legacy' — no `gid`, or a `prov` that is not 'minted'.  Also
 *     permanent: a piece minted before the receipt book existed has no id
 *     and never will (gear-provenance.md, "Legacy gear: usable, not
 *     sellable").  It still works in every other way.
 *
 * Everything else — worn, still in the post, already on the shelf — depends
 * on state only the worker has, and is deliberately NOT guessed here.  A
 * browser that greys a button on its own guess about live state gets it
 * wrong in the expensive direction: it hides a sale the player could
 * actually make, and the player has no way to find out why. */
export function gearSellCheck(field, piece) {
  if (field === 'gearStash') return { ok: false, reason: 'cosmetic', text: gearSellReasonText('cosmetic') };
  if (!piece || typeof piece !== 'object') return { ok: false, reason: 'legacy', text: gearSellReasonText('legacy') };
  const gid = piece.gid;
  if (typeof gid !== 'string' || !gid || piece.prov !== 'minted') {
    return { ok: false, reason: 'legacy', text: gearSellReasonText('legacy') };
  }
  return { ok: true, reason: 'ok', text: '' };
}

/* The id to put in a listing request, or null when there is none to send.
   Bounded exactly as the worker bounds it (storegear.js STORE_GEAR.MAX_GID
   / gearprov.js claimedGid), so an over-long value is dropped here rather
   than travelling to be dropped there. */
export function gearSellGid(piece) {
  const g = piece && typeof piece === 'object' ? piece.gid : null;
  return (typeof g === 'string' && g.length > 0 && g.length <= 40) ? g : null;
}
