/* ═══ v2.3.2529: TAKE A LISTED PIECE OUT OF THE BAG YOU CAN SEE ═══
 *
 * v2.3.2528 shipped the Sell button on the four gear cards and removed
 * nothing locally, on the strength of a comment that said "the bag
 * redraws off the player_state echo".  IT DOES NOT.  The client never
 * reads `armorStash` / `legsStash` / `shieldStash` / `gearStash` off
 * `player_state` -- gear-stash.md says so itself ("it did not make the
 * client a reader of the echo; that is still open") -- and the popup's
 * success path only closes the popup.  So the piece stayed on its card,
 * still written to localStorage, after the worker had escrowed it.
 *
 * That is not cosmetic.  Tap Equip on the card that is still there and
 * the client tells the worker what it is now wearing (`stats_update`,
 * which takes the armour object the client hands it): the buyer gets the
 * escrowed plate and the seller is wearing an identical one.  One plate,
 * two owners, and somebody paid real gold for the copy.  Worse, once the
 * gear hand-over runs on EVERY login (#641), the client's surviving copy
 * is folded back into the server stash on the next reload -- list,
 * reload, it is back, list again, without limit.
 *
 * This module is the SMALLER of the two fixes and it is deliberately
 * named as such: the real fix is making the client read the echoed
 * stash, which gear-stash.md calls "M3's first problem" and which is
 * still open.  Until then, the client at least stops showing a piece it
 * no longer owns.
 *
 * It is a standalone module with NO imports for one reason: it is the
 * only half of the sell flow that can be tested.  There is no client
 * unit suite (CLAUDE.md: lint + build only), but the server suites
 * already import pure client modules (`src/data/*.js`), so a pure
 * function here is reachable from `server/test/market.test.mjs` while
 * anything inside ItemDetailPopup.jsx is not.  Keep it pure.
 */

/* Which server-side stash each gear card sells out of, and where the
   card keeps its piece.  A table rather than a branchy if-chain because
   the four cards already differ in every other respect and one more
   chain of `else if (target.kind === ...)` is how the legs piece ended
   up in the chest slot once already.  The field names are the server's
   GEAR_STASH_FIELDS (server/src/gearstash.js); `amuletStash` has no card
   here because an amulet still has no unequip flow to put one in.
   A Map, not an object: `target.kind` is a string and 'constructor' is a
   legal one (TRAPS #6). */
export const GEAR_SELL = new Map([
  ['stashArmor',  { field: 'armorStash',  prop: 'armor' }],
  ['stashLegs',   { field: 'legsStash',   prop: 'armor' }],
  ['stashShield', { field: 'shieldStash', prop: 'shield' }],
  ['stashGear',   { field: 'gearStash',   prop: 'gear' }],
]);

/* The identity of a piece, mirroring the server's `stashSig`
   (server/src/gearstash.js), which is itself wsClient's `_shSig`.  Used
   here ONLY as a fallback for finding the row again when the array was
   replaced under us -- the request itself names the piece with a
   selector and the worker matches it against its own copy. */
export function gearSig(field, g) {
  if (!g) return '';
  if (field === 'gearStash') return (g.slot || '') + '|' + (g.gearId || '');
  if (field === 'amuletStash') return (g.tier || '') + '|' + (g.gem || '') + '|' + (g.name || '');
  return [g.name || '', g.gearBase || '', g.tierMult == null ? '' : g.tierMult, g.tier || ''].join('|');
}

/* Remove the piece that was just listed from the player's own copy of
   the list.  Returns true when something was removed, so the caller
   knows whether it has to persist.
 *
 * Identity first, because the card holds the very object in the array
 * and that is the honest answer.  Then the tile's index, believed only
 * if the entry there is the same piece by signature -- the v2.3.2341
 * rule for weapons, for the same reason (something may have arrived and
 * replaced the array).  Then the first signature match.  Never a blind
 * index: removing the wrong row would hide a piece the player still
 * owns, which is the same class of bug in the other direction.
 *
 * Call it ONLY after the worker has confirmed the listing.  A refused
 * listing must leave the bag exactly as it was -- the worker took
 * nothing, so neither do we. */
export function removeGearLocal(rpg, field, piece, hintIdx) {
  if (!rpg || !field || !piece) return false;
  const list = rpg[field];
  if (!Array.isArray(list) || !list.length) return false;
  let at = list.indexOf(piece);
  if (at < 0) {
    const want = gearSig(field, piece);
    if (!want) return false;
    const h = Math.floor(Number(hintIdx));
    if (Number.isFinite(h) && h >= 0 && h < list.length && gearSig(field, list[h]) === want) at = h;
    else at = list.findIndex((e) => gearSig(field, e) === want);
  }
  if (at < 0) return false;
  list.splice(at, 1);
  return true;
}
