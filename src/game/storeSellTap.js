/* ═══ v2.3.4369: THE GENERAL STORE'S PLACE TAP: ONE AT A TIME ═══
 *
 * The state-machine sweep (2026-11-03, V8a P1-7): the General Store's
 * "Place Buy Order" / "List for Sale" button had no 'busy' lock, and the
 * weapon you picked is remembered by its PLACE in your stash (BroTown's
 * `mktSellItem`, sent as `stashIndex`).  A double tap posted twice: the worker
 * escrowed your weapon, then whatever slid into its place, and filed BOTH
 * under the first weapon's type and tier -- sold at once if a resting buy fit.
 * A buy double tap escrowed the gold twice.  The item card has had the same
 * lock since v2.3.2507 (ItemDetailPopup.jsx sellInFlight: "one tap, one
 * listing").
 *
 * The lock lives on the game state (S), not in the panel, so closing and
 * reopening the window while the first answer is still out does not open a
 * second door.  It is released when the answer (or the fetch's own error)
 * arrives, whatever it says.  There is deliberately NO timeout here: a timeout
 * read as a refusal makes players list twice (the v2.3.2507 double listing);
 * that road needs a "not sure, check My orders" answer and is a later change.
 *
 * INTERIM (review R2, W1.4): this and the pick clearing in ExchangePanel are
 * patches on the phone until the worker names a sold weapon by its id rather
 * than its place in the stash.  No imports, so node tests it
 * (server/test/store-sell-tap.test.mjs).
 */

/* true: this tap may post (and now holds the lock); false: one is in flight */
export function claimPlace(S) {
  if (!S || S._mktPlaceBusy) return false;
  S._mktPlaceBusy = true;
  return true;
}

/* the answer came back (ok, refused, or the fetch failed): the next tap may post */
export function releasePlace(S) {
  if (S) S._mktPlaceBusy = false;
}
